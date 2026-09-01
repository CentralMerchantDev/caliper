// FINISH.md section 5: re-derived caps (daily $2/weekly $7/monthly $20,
// per-run ceiling ~$0.15, 2 live runs/IP/day) -- verified by forcing each
// one, not by reading the numbers. Rate-limit tests use a minimal in-memory
// KV; spend-cap tests use a mock DurableObjectNamespace whose stub.fetch()
// delegates to a REAL SpendCounterDO instance (in-process, own storage),
// so the actual reserve/reconcile logic runs, not a re-implementation of it.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROL_LIMITS, assertUnderPipelineSpendCap, reconcilePipelineSpend, assertUnderPipelineRateLimit, recordPipelineRateLimitHit, PipelineLimitError, classifyErrorPermanence } from "../src/controlLayer.ts";
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
  assert.equal(CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP, 4);
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
const WORST_CASE_STAGES = {
  ground: 0.0025,
  plan: 0.04,
  implement: 0.03,
  implementEdit: 0.0075,
  fix: 0.04,
  fixEdit: 0.015,
  review: 0.035,
  assess: 0.0135,
  qa: 0.0098,          // the final functional pass, one review-priced call
  retrospective: 0.0015,
};

test("the source-edit ceiling covers every call the run is ALLOWED to make", () => {
  const worst =
    WORST_CASE_STAGES.ground +
    WORST_CASE_STAGES.plan +
    WORST_CASE_STAGES.implement +
    WORST_CASE_STAGES.fix * CONTROL_LIMITS.MAX_FIX_ATTEMPTS +
    (WORST_CASE_STAGES.review + WORST_CASE_STAGES.assess + WORST_CASE_STAGES.fix) * CONTROL_LIMITS.MAX_REVIEW_ROUNDS +
    WORST_CASE_STAGES.qa +
    WORST_CASE_STAGES.retrospective;
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
