import { SPEND_WORST_CASE, MAX_PLAN_REPLIES } from "../src/changePipeline.js";
// FINISH.md section 5: re-derived caps (daily $2/weekly $7/monthly $20,
// per-run ceiling ~$0.15, 2 live runs/IP/day) -- verified by forcing each
// one, not by reading the numbers. Rate-limit tests use a minimal in-memory
// KV; spend-cap tests use a mock DurableObjectNamespace whose stub.fetch()
// delegates to a REAL SpendCounterDO instance (in-process, own storage),
// so the actual reserve/reconcile logic runs, not a re-implementation of it.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROL_LIMITS, assertUnderPipelineSpendCap, reconcilePipelineSpend, assertUnderPipelineRateLimit, recordPipelineRateLimitHit, PipelineLimitError, classifyErrorPermanence, assertUnderRunCeiling, claimPipelineRun, pipelineAvailability } from "../src/controlLayer.ts";
import { SpendCounterLogic, handleSpendCounterRequest, type StorageLike } from "../src/spendCounterDO.ts";

function mockKv(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })), list_complete: true, cursor: undefined }) as any,
  } as unknown as KVNamespace;
}

function mockStorage(initial: Record<string, number> = {}): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) as any,
    put: async (key: string, value: unknown) => {
      store.set(key, value as number);
    },
  };
}

/** One real SpendCounterLogic instance behind a mock DurableObjectNamespace
 * -- every idFromName("global") call returns a stub pointed at the SAME
 * instance, matching the real one-global-instance design, and routed
 * through handleSpendCounterRequest exactly as the real DO's fetch() does. */
function mockSpendCounterNamespace(initial: Record<string, number> = {}): DurableObjectNamespace {
  const logic = new SpendCounterLogic(mockStorage(initial));
  const stub = { fetch: (url: string, init?: RequestInit) => handleSpendCounterRequest(logic, new Request(url, init)) };
  return { idFromName: () => "global", get: () => stub } as unknown as DurableObjectNamespace;
}

test("the published caps are the caps", () => {
  // These numbers appear on the public page. If one moves here and not there,
  // the site is stating a control it does not have -- so they are pinned, and
  // moving one is a deliberate act with a test to update.
  assert.equal(CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD, 2.0);
  assert.equal(CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD, 7.0);
  assert.equal(CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD, 20.0);
  // Lowered from 4 when input tokens were finally priced: 4 x $0.7073 is $2.88
  // against a $2.00 daily cap, so one visitor could have drained the day. The
  // test below is what caught it.
  assert.equal(CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP, 2);
});

test("one visitor cannot drain the day on their own", () => {
  // The per-IP limit and the daily cap are not independent: at the worst-case
  // ceiling, DAILY_LIVE_RUNS_PER_IP x PER_RUN_CEILING is what a single address
  // can cost. If that reaches the daily cap then one person can close the site
  // for everyone else, which is the failure the per-IP limit exists to prevent.
  const worstPerVisitor = CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP * CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT;
  assert.ok(
    worstPerVisitor < CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD,
    `one visitor could spend $${worstPerVisitor.toFixed(2)} of the $${CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD.toFixed(2)} daily cap -- ` +
      "lower DAILY_LIVE_RUNS_PER_IP or raise the cap",
  );
});

// FOUNDATION-2 ("emit the change, not the file"): two ceilings now, not
// one -- source-edit's worst case is unchanged (implementChange/fixChange
// are untouched), data-edit's is genuinely lower (implementChangeAsEdit/
// fixChangeAsEdit's much smaller token caps). The invariant both guard is
// still "tracks the real worst case, not the old $0.35 Opus-priced
// ceiling" -- catches a regression back toward that, not a false positive
// on either current, deliberate value.
// THE CEILINGS ARE RE-DERIVED HERE, NOT RESTATED.
//
// These used to assert `<= 0.3` and `<= 0.15` against values of 0.23 and 0.14 --
// enough slack that the ceiling could drift a long way and stay green. It did
// drift: the arithmetic in the comment said "fix*2 (MAX_FIX_ATTEMPTS)" while
// MAX_FIX_ATTEMPTS was 3, so a run using its third fix could hit the ceiling and
// truncate, which a visitor reads as a bug rather than a limit.
//
// So the test now does the sum. Change a stage's token cap or a limit and this
// fails with the number it should have been, instead of quietly tolerating it.
// THE TEST USED TO KEEP ITS OWN COPY OF THE NUMBERS IT WAS CHECKING.
//
// This was a private table:
//
//     const WORST_CASE_STAGES = { ground: 0.0025, plan: 0.04, ... };
//
// containing the same output-only figures as the real WORST_CASE in
// changePipeline.ts. So when an audit found that every one of those figures
// omitted INPUT tokens -- which costUsd() charges -- this test could not notice.
// It was verifying its own arithmetic against itself, and deleting the ceiling
// check entirely left the suite green.
//
// It reads the real table now. If the pricing, the token caps or the input
// estimates change, this moves with them.
const WORST_CASE_STAGES = SPEND_WORST_CASE;
test("the source-edit ceiling covers every call the run is ALLOWED to make", () => {
  const worst =
    WORST_CASE_STAGES.ground +
    WORST_CASE_STAGES.plan +
    WORST_CASE_STAGES.implement +
    WORST_CASE_STAGES.fix * CONTROL_LIMITS.MAX_FIX_ATTEMPTS +
    (WORST_CASE_STAGES.review + WORST_CASE_STAGES.assess + WORST_CASE_STAGES.fix) * CONTROL_LIMITS.MAX_REVIEW_ROUNDS +
    WORST_CASE_STAGES.qa +
    WORST_CASE_STAGES.retrospective +
    // THE TERM THAT WAS MISSING. Each Gate 1 reply re-grounds and re-plans, and
    // MAX_PLAN_REPLIES permits four of them. This derivation predated the reply
    // cap and nobody added the term, so it kept deriving a worst case the limits
    // no longer described -- and passed against a ceiling that was $0.25 short.
    (WORST_CASE_STAGES.ground + WORST_CASE_STAGES.plan) * MAX_PLAN_REPLIES;
  assert.ok(
    CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT >= worst,
    `ceiling ${CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT} is BELOW the worst case the limits permit (${worst.toFixed(4)}) -- ` +
      "a legitimate run can be truncated mid-flight, which looks like a bug",
  );
  // and not wildly above it either: a ceiling with no relationship to the
  // arithmetic is not a control, it is a number.
  assert.ok(CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT <= worst * 1.5,
    `ceiling ${CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT} is more than 50% above the worst case (${worst.toFixed(4)})`);
});

test("the data-edit ceiling is derived the same way, and is genuinely lower", () => {
  const worst =
    WORST_CASE_STAGES.ground +
    WORST_CASE_STAGES.plan +
    WORST_CASE_STAGES.implementEdit +
    WORST_CASE_STAGES.fixEdit * CONTROL_LIMITS.MAX_FIX_ATTEMPTS +
    (WORST_CASE_STAGES.review + WORST_CASE_STAGES.assess + WORST_CASE_STAGES.fixEdit) * CONTROL_LIMITS.MAX_REVIEW_ROUNDS +
    WORST_CASE_STAGES.qa +
    WORST_CASE_STAGES.retrospective;
  assert.ok(CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT >= worst,
    `ceiling ${CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT} is below the permitted worst case (${worst.toFixed(4)})`);
  assert.ok(CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT < CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT,
    "the cheap path must actually be cheaper, not just relabelled");
});

test("the reviewer sees the work more than once", () => {
  // The loop's whole point. At 1 the reviewer never sees the code its own
  // findings caused to change, and "reviewed by a different vendor's model"
  // becomes a claim about the draft rather than about what shipped.
  assert.ok(CONTROL_LIMITS.MAX_REVIEW_ROUNDS >= 2,
    "MAX_REVIEW_ROUNDS < 2 means a fix can ship unreviewed");
});

// ---------------------------------------------------------------------
// LAST.md item 1: "stop retrying permanent errors." A live run hit a 400
// (a malformed schema, itself fixed separately) and was retried four
// times, identically, because nothing distinguished "worth trying again"
// from "guaranteed to fail the same way." classifyErrorPermanence is the
// distinction -- exercised here against the SAME error shape both the
// Anthropic and OpenAI SDKs actually throw (an object with a numeric
// `.status`), not a hand-waved mock of "an error happened".
// ---------------------------------------------------------------------
test("classifyErrorPermanence: a 400 (the exact defect that killed a live run) is permanent", () => {
  assert.equal(classifyErrorPermanence({ status: 400 }), "permanent");
});
test("classifyErrorPermanence: 401/403/404/422 are all permanent -- the request itself was rejected", () => {
  for (const status of [401, 403, 404, 422]) assert.equal(classifyErrorPermanence({ status }), "permanent");
});
test("classifyErrorPermanence: 429 is NOT permanent -- a rate limit is about right now, not about the request being malformed", () => {
  assert.equal(classifyErrorPermanence({ status: 429 }), "transient");
});
test("classifyErrorPermanence: 5xx is transient -- server-side, may resolve on retry", () => {
  assert.equal(classifyErrorPermanence({ status: 500 }), "transient");
  assert.equal(classifyErrorPermanence({ status: 503 }), "transient");
});
test("classifyErrorPermanence: an error with no status (network failure, timeout) defaults to transient", () => {
  assert.equal(classifyErrorPermanence(new Error("ECONNRESET")), "transient");
  assert.equal(classifyErrorPermanence(null), "transient");
  assert.equal(classifyErrorPermanence(undefined), "transient");
});

// ---------------------------------------------------------------------
// Guardrail: the weekly cap is a NEW checkpoint added tonight -- it must
// actually fire, not just exist as an unused constant.
// ---------------------------------------------------------------------
test("guardrail: weekly cap refuses a request that would cross it, even though daily/monthly both have room", async () => {
  const weekKey = `weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 0.01, [weekKey]: 6.99 });
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.05), (e: unknown) => e instanceof PipelineLimitError && e.kind === "weekly-cap");
});

test("control: the same weekly-spend scenario does NOT refuse when the estimate fits under the weekly cap", async () => {
  const weekKey = `weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 0.01, [weekKey]: 6.5 });
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(ns, 0.05));
});

test("guardrail: daily cap still refuses independently of the weekly cap having room", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.99 });
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.05), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap");
});

// ---------------------------------------------------------------------
// The atomicity fix itself: reserve commits the ESTIMATE immediately, so a
// second call sees the reservation even before the first call's real cost
// is known -- this is what a KV check-then-later-record shape couldn't do.
// ---------------------------------------------------------------------
test("reserve commits the estimate immediately -- a second reserve sees it, not the stale pre-call total", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.9 });
  await assertUnderPipelineSpendCap(ns, 0.05); // reserves up to 1.95, still under 2.00
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.06), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap"); // 1.95 + 0.06 = 2.01, over 2.00
});

test("guardrail: two reservations that would each individually fit are still caught in sum -- this is the exact race the DO closes", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.97 });
  await assertUnderPipelineSpendCap(ns, 0.02); // 1.97 -> 1.99, fits
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.02), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap"); // 1.99 + 0.02 = 2.01, over
});

test("reconcile trues a reservation down to the real (lower) cost, freeing room for the next call", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.9 });
  await assertUnderPipelineSpendCap(ns, 0.08); // reserves to 1.98
  await reconcilePipelineSpend(ns, 0.08, 0.02); // real cost was only 0.02 -> daily should true down to 1.92
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(ns, 0.05)); // 1.92 + 0.05 = 1.97, fits -- would NOT fit if reconcile hadn't freed the difference
});

test("reconcile releasing a failed call's reservation (actual=0) never lets the bucket go negative", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 0.01 });
  await assertUnderPipelineSpendCap(ns, 0.05); // -> 0.06
  await reconcilePipelineSpend(ns, 0.05, 0); // failed call, release the whole reservation -> back to 0.01
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(ns, 1.9)); // 0.01 + 1.9 = 1.91, fits -- would fail if the release left it at 0.06 or higher by mistake
});

// ---------------------------------------------------------------------
// Guardrail: the per-IP daily limit, re-derived to 3 (UPGRADE.md, up from 2).
// ---------------------------------------------------------------------
test("one run past the daily per-IP limit is refused, whatever the limit is set to", async () => {
  // Derived from the constant rather than hard-coded, because the last time
  // this was written as "a 4th run" the limit moved and the test name became a
  // lie while the assertion still passed.
  const kv = mockKv();
  for (let i = 0; i < CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP; i++) {
    await recordPipelineRateLimitHit(kv, "1.2.3.4");
  }
  await assert.rejects(() => assertUnderPipelineRateLimit(kv, "1.2.3.4"), (e: unknown) => e instanceof PipelineLimitError && e.kind === "per-ip-daily");
});

test("control: the last run INSIDE the limit is still allowed", async () => {
  const kv = mockKv();
  for (let i = 0; i < CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP - 1; i++) {
    await recordPipelineRateLimitHit(kv, "5.6.7.8");
  }
  await assert.doesNotReject(() => assertUnderPipelineRateLimit(kv, "5.6.7.8"));
});

test("control: a different IP is unaffected by another IP's hits", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "1.1.1.1");
  await recordPipelineRateLimitHit(kv, "1.1.1.1");
  await assert.doesNotReject(() => assertUnderPipelineRateLimit(kv, "2.2.2.2"));
});

// =============================================================================
// THE COMPARE-AND-SWAP'S EMPTY BRANCH IGNORED WHAT IT WAS COMPARING
//
// publishSource's comment states the rule plainly: "an absent stored source is
// only acceptable when the caller also expected the baseline -- i.e. genuinely
// the first publish." The branch then published unconditionally, without ever
// reading expectedSource. An audit called it with a source that had never been
// the baseline, against empty storage, and got { ok: true }.
//
// That is the same defect the surrounding comment describes fixing, one layer
// down. A check that cannot fail is not a check.
// =============================================================================
test("publishing against empty storage requires having started from the baseline", async () => {
  const { SpendCounterLogic } = await import("../src/spendCounterDO.js");
  const { SIM_BASELINE_SOURCE } = await import("../src/simBaseline.js");

  const store = new Map<string, unknown>();
  const storage = {
    get: async (k: string) => store.get(k),
    put: async (k: string, v: unknown) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
    list: async () => new Map(),
  };
  const mk = () => new (SpendCounterLogic as any)(storage);

  // A lease has to exist for publishSource to get as far as the CAS.
  const lease = await mk().leaseRun("run-1", 5, 600);
  assert.ok(lease.ok, "could not take a lease");

  const bogus = await mk().publishSource(
    "A WORLD THAT WAS NEVER THE BASELINE", "whatever the run produced", "run-1", lease.leaseToken);
  assert.equal(bogus.ok, false,
    "empty storage plus a non-baseline expectation must not publish -- that overwrites an unknown state");
  assert.equal(bogus.conflict, true);

  // The genuine first publish still works.
  const first = await mk().publishSource(
    SIM_BASELINE_SOURCE, "the first shipped world", "run-1", lease.leaseToken);
  assert.equal(first.ok, true, "a real first publish, from the baseline, must still be allowed");
});

// =============================================================================
// THE GATES THAT COULD BE DELETED WITH THE SUITE STILL GREEN
//
// An audit removed nine of fourteen guardrails one at a time — the per-run
// ceiling, the per-IP daily limit, the concurrency limit, the circuit breaker
// among them — and all 380 tests kept passing. A guardrail nothing checks is a
// comment with a keyword in front of it.
//
// These cover the ones that are directly callable. The rest live inline in the
// pipeline loop and need the same treatment assessReviewRound got — extracted so
// they can be called — which is recorded in the ledger rather than done here,
// because extracting a decision is a change to the decision's shape and wants
// its own pass.
// =============================================================================

test("the per-run ceiling actually stops a run", () => {
  const ceiling = 0.50;
  // Under it: allowed.
  assert.doesNotThrow(() => assertUnderRunCeiling(0.10, 0.20, ceiling));
  // The step that would cross it: refused, BEFORE the money is spent.
  assert.throws(() => assertUnderRunCeiling(0.45, 0.20, ceiling), /ceiling|budget|exceed/i,
    "a stage whose estimate crosses the ceiling must be refused before it runs");
  // Exactly at the line is not over it.
  assert.doesNotThrow(() => assertUnderRunCeiling(0.30, 0.20, ceiling));
});

test("the per-IP daily limit actually refuses the run after it", async () => {
  const store = new Map<string, string>();
  const kv = {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
    list: async () => ({ keys: [] }),
  } as unknown as KVNamespace;

  const limit = CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP;
  assert.ok(limit >= 1, "a limit of zero would make this test meaningless");

  // Exactly the allowance goes through.
  for (let i = 0; i < limit; i++) {
    await assert.doesNotReject(claimPipelineRun({ SPEND_KV: kv }, "1.2.3.4"),
      `run ${i + 1} of ${limit} should be allowed`);
  }
  // The next one does not.
  await assert.rejects(claimPipelineRun({ SPEND_KV: kv }, "1.2.3.4"), /limit|daily|runs/i,
    `run ${limit + 1} must be refused — this is the limit that stops one visitor draining the day`);

  // And it is PER IP, not global.
  await assert.doesNotReject(claimPipelineRun({ SPEND_KV: kv }, "5.6.7.8"),
    "a different address must not be blocked by someone else's usage");
});

test("the concurrency limit refuses the run past the cap, and releases", async () => {
  const { SpendCounterLogic } = await import("../src/spendCounterDO.js");
  const store = new Map<string, unknown>();
  const storage = {
    get: async (k: string) => store.get(k),
    put: async (k: string, v: unknown) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
    list: async () => new Map(),
  };
  const max = 3;
  const tokens: string[] = [];
  for (let i = 0; i < max; i++) {
    const r = await new (SpendCounterLogic as any)(storage).leaseRun(`run-${i}`, max, 600);
    assert.equal(r.ok, true, `lease ${i + 1} of ${max} should be granted`);
    tokens.push(r.leaseToken);
  }
  const over = await new (SpendCounterLogic as any)(storage).leaseRun("run-over", max, 600);
  assert.equal(over.ok, false, "the lease past the concurrency cap must be refused");

  // Releasing one frees exactly one slot.
  await new (SpendCounterLogic as any)(storage).releaseRun("run-0", tokens[0]);
  const after = await new (SpendCounterLogic as any)(storage).leaseRun("run-new", max, 600);
  assert.equal(after.ok, true, "a released slot must become available again");
});

// =============================================================================
// A DROPPED REQUEST MUST NOT LOCK A CONCURRENCY SLOT FOR TEN MINUTES
//
// `leaseLost` was one flag set for two unrelated reasons: the coordinator saying
// a SUCCESSOR now owns the slot, and simply failing to reach the coordinator.
// The finally block skipped releaseActiveRun whenever it was set — correct for
// the first case, and for the second it leaked the slot for the full lease TTL.
// At MAX_CONCURRENT_PIPELINE_RUNS that is a self-inflicted lockout caused by one
// network blip.
//
// This covers the DO side of it: a released lease frees exactly one slot, and a
// lease that was superseded is not something the loser can release out from
// under the winner.
// =============================================================================
test("releasing a lease frees exactly one slot, and only the holder may", async () => {
  const { SpendCounterLogic } = await import("../src/spendCounterDO.js");
  const store = new Map<string, unknown>();
  const storage = {
    get: async (k: string) => store.get(k),
    put: async (k: string, v: unknown) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
    list: async () => new Map(),
  };
  const mk = () => new (SpendCounterLogic as any)(storage);
  const MAX = 2;

  const a = await mk().leaseRun("run-a", MAX, 330);
  const b = await mk().leaseRun("run-b", MAX, 330);
  assert.ok(a.ok && b.ok, "both leases within the cap should be granted");
  assert.equal((await mk().leaseRun("run-c", MAX, 330)).ok, false, "past the cap must refuse");

  // A wrong token must not release someone else's slot.
  await mk().releaseRun("run-a", "not-the-right-token");
  assert.equal((await mk().leaseRun("run-c", MAX, 330)).ok, false,
    "a mismatched token must not free a slot");

  // The real holder can.
  await mk().releaseRun("run-a", a.leaseToken);
  assert.equal((await mk().leaseRun("run-c", MAX, 330)).ok, true,
    "the holder releasing must free exactly one slot");
});

// ---------------------------------------------------------------------------
// 2.12 -- "COULD NOT READ THE COUNTER" IS NOT "YOU HAVE RUNS LEFT"
//
// pipelineAvailability is advisory. It tells a visitor WHY a run cannot start;
// the enforcement is claimPipelineRun on the run path, which throws
// independently of anything decided here. So failing open is correct and
// deliberate, and this test does not change it.
//
// What it does check is that a fallback is not reported as a measurement. Both
// catches left runsUsed at 0 and dailyRemainingUsd at the full cap, and those
// render as "3 of 3 runs left today" -- a specific factual claim about the
// visitor's quota, made from a read that failed.
// ---------------------------------------------------------------------------
function counterThatFails() {
  return {
    idFromName: () => ({}) as unknown,
    get: () => ({ fetch: async () => { throw new Error("durable object unreachable"); } }),
  } as unknown as DurableObjectNamespace;
}
function kvThatFails() {
  return { get: async () => { throw new Error("kv unreachable"); } } as unknown as KVNamespace;
}

test("pipelineAvailability fails OPEN when its counters are unreadable", async () => {
  const avail = await pipelineAvailability(
    { SPEND_COUNTER: counterThatFails(), SPEND_KV: kvThatFails() },
    "1.2.3.4",
  );
  // Failing open is the point: a counter outage must never block a visitor,
  // because the real cap is claimed atomically on the run path anyway.
  assert.equal(avail.ok, true, "an unreadable counter must not block a run — enforcement is elsewhere");
  assert.equal(avail.reason, null);
});

test("pipelineAvailability says when its numbers are fallbacks rather than measurements", async () => {
  const broken = await pipelineAvailability(
    { SPEND_COUNTER: counterThatFails(), SPEND_KV: kvThatFails() },
    "1.2.3.4",
  );
  assert.equal(
    broken.countersRead, false,
    "both counter reads threw, but the result claims the numbers were read — " +
    "runsUsed 0 then renders as a full quota the visitor may not have"
  );

  // And it must not cry wolf: a working counter reports its numbers as real.
  const workingCounter = {
    idFromName: () => ({}) as unknown,
    get: () => ({
      fetch: async (url: string) =>
        new Response(JSON.stringify(String(url).includes("runs-used") ? { used: 1 } : { dailySpentUsd: 0, weeklySpentUsd: 0, monthlySpentUsd: 0 })),
    }),
  } as unknown as DurableObjectNamespace;
  const fine = await pipelineAvailability(
    { SPEND_COUNTER: workingCounter, SPEND_KV: { get: async () => null } as unknown as KVNamespace },
    "1.2.3.4",
  );
  assert.equal(fine.countersRead, true, "a healthy read is being reported as a fallback");
  assert.equal(fine.runsUsed, 1, "the real count is not being carried through");
});
