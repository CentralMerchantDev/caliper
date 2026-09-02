// The CALIPER pipeline's control layer (REBUILD-CONTROLS.md), modeled on a
// production build's control-layer practice: input guard, per-run and
// global spend ceilings, a concurrency limit, and a per-provider circuit
// breaker. All state is KV-backed (Workers are stateless/distributed --
// that practice's own guidance is to back this with shared state, not
// an in-memory counter). Entirely separate KV key namespace (`pipeline/*`)
// from the original experiment's spendCap.ts/rateLimit.ts, which keep
// governing the plain 32-task routes unchanged.

// LAST.md item 1: a live run hit a 400 from a malformed schema and was
// retried four times, identically, because nothing distinguished "this
// might succeed if tried again" from "this is guaranteed to fail exactly
// the same way every time, because the REQUEST ITSELF was rejected, not
// something transient about this one attempt." Both the Anthropic and
// OpenAI SDKs expose the same shape on their APIError classes (a `.status`
// number) -- checked structurally here rather than importing either SDK's
// error class, since both providers' errors need the same classification
// and neither import should know about the other's existence. A 429 is
// deliberately NOT permanent -- a rate limit is about right now, not about
// the request being malformed, and IS worth retrying later.
export type ErrorPermanence = "permanent" | "transient";
export function classifyErrorPermanence(e: unknown): ErrorPermanence {
  const status = (e as { status?: unknown } | null | undefined)?.status;
  if (typeof status !== "number") return "transient"; // network error, timeout, anything without a status -- assume worth retrying
  if (status === 429) return "transient"; // rate limit -- about right now, not about the request being wrong
  if (status >= 400 && status < 500) return "permanent"; // the API rejected the shape of the request itself; retrying it unchanged fails identically
  return "transient"; // 5xx and anything else -- server-side, may resolve on retry
}

export const CONTROL_LIMITS = {
  /** Abort the rest of a run if its running total would exceed this --
   * now TWO ceilings, not one, because FOUNDATION-2's data-edit path
   * (src/worldEdit.ts) changed implement/fix's worst case but NOT
   * source-edit's (implementChange/fixChange are untouched, still a
   * full-file rewrite for a request that genuinely needs new simulation
   * logic). A single shared ceiling can only ever be as low as the WORSE
   * of the two paths' worst cases -- lowering it to the cheap path's
   * figure would silently truncate every legitimate source-edit run
   * partway through. Which one applies is decided the moment plan.
   * implementationPath is known (the ceiling is chosen inline where
   * plan.implementationPath becomes known in changePipeline.ts); before that (ground, plan), the SOURCE_EDIT
   * ceiling applies, since the path isn't known yet and ground+plan cost
   * the same either way.
   *
   * THE OLD ARITHMETIC WAS SHORT, AND IT WAS SHORT BY A REAL FIX.
   *
   * It read "fix*2 (pre-review, MAX_FIX_ATTEMPTS)" while MAX_FIX_ATTEMPTS was
   * already 3. So a run that legitimately used its third convergence fix could
   * hit the ceiling and truncate -- which a visitor reads as a bug, not as a
   * limit. The comment was the spec and the constant had moved out from under
   * it, which is exactly the failure mode the pricing test now exists to stop.
   *
   * SOURCE_EDIT worst case, recounted against the constants below:
   *   ground        $0.0025
   *   plan          $0.04
   *   implement     $0.03
   *   fix x4        $0.16    (MAX_FIX_ATTEMPTS, pre-review convergence)
   *   per review round, x MAX_REVIEW_ROUNDS (2):
   *     review      $0.035
   *     assess      $0.0135  (the author judging the review before acting)
   *     fix         $0.04
   *                 $0.177   for both rounds
   *   qa            $0.0098  (the final functional pass -- is this what was asked for)
   *   retrospective $0.0015
   *                 -------
   *                 $0.421   -> $0.44
   *
   * DATA_EDIT worst case, same shape with the cheaper edit path:
   *   0.0025 + 0.04 + 0.0075 + (0.015 x 4) + ((0.035 + 0.0135 + 0.015) x 2)
   *   + 0.0098 + 0.0015 = $0.2483 -> $0.26
   *
   * I got this wrong by $0.05 writing it out by hand -- I forgot the assess
   * call -- and test/controlLayer.test.ts caught it by doing the sum instead of
   * restating the answer. That is why the test derives rather than asserts a
   * literal: a ceiling below the permitted worst case truncates real runs.
   *
   * NOTE: these are CEILINGS, not estimates. A real run costs about $0.06 --
   * the recorded one on the page cost $0.0587 -- so raising the ceiling does
   * not raise typical spend. It only stops an expensive-but-legitimate run
   * dying halfway. The daily cap is the budget; this is the seatbelt.
   */
  // RE-DERIVED ONCE INPUT TOKENS WERE PRICED.
  //
  // Every stage estimate used to price OUTPUT tokens only, while costUsd()
  // charges both halves. The ceiling was therefore covering about two thirds of
  // the transaction, and its own comment argued that a short ceiling "is exactly
  // the failure mode the pricing test now exists to stop" -- while the test kept
  // a private copy of the same output-only numbers and so could not see it.
  //
  // With input priced, the worst case the limits PERMIT is $0.7073 for a
  // source edit and $0.4838 for a data edit. These cover them.
  //
  // Worth stating plainly, because it is a product consequence and not just a
  // number: at a $0.72 worst case the $2 daily cap permits about two
  // worst-case runs. A typical run is far cheaper -- the worst case assumes every
  // stage hits its token cap and every fix attempt is used -- but the ceiling has
  // to cover what is ALLOWED, not what is likely, or it truncates a legitimate
  // run mid-flight and that looks like a bug rather than a limit.
  //
  // RE-DERIVED AGAIN, AFTER MAX_PLAN_REPLIES WAS ADDED AND THIS WAS NOT.
  //
  // Capping the Gate 1 reply loop at 4 was the right fix for an unbounded loop.
  // What it also did -- and what I did not do the arithmetic for at the time --
  // is raise the worst case this ceiling has to cover, because every reply
  // re-grounds AND re-plans: 4 x (ground + plan) = $0.2660 on top of $0.7073.
  //
  // So the ceiling sat at $0.72 against a permitted $0.9733, and a run that used
  // the replies the system explicitly offers it would have been truncated
  // mid-flight. That is the exact failure the comment above names, introduced by
  // the commit that fixed a different one.
  //
  // The test derived `worst` honestly and still missed it, because the
  // derivation was written before the reply loop existed and nobody added the
  // term. A test that derives instead of asserting a literal is much better than
  // one that does not -- it is not the same as one that derives EVERYTHING.
  //
  // TIGHT ON PURPOSE, AND WORTH SAYING: at $0.99 the invariant that one visitor
  // cannot exhaust the daily cap (DAILY_LIVE_RUNS_PER_IP x ceiling < $2.00)
  // holds at $1.98. There is 1% of headroom. Anything that adds another paid
  // stage, or raises MAX_PLAN_REPLIES again, breaks it -- and the test will say
  // so rather than letting the two limits quietly contradict each other.
  PER_RUN_CEILING_USD_SOURCE_EDIT: 0.99,
  PER_RUN_CEILING_USD_DATA_EDIT: 0.76,
  /** Cross-model review must never see code that's still failing its own
   * checks (FINAL.md item 1: "the reviewer reads a diff that has already
   * passed CI"). This bounds the implement -> verify -> fix loop that runs
   * BEFORE review, on verification failures, not reviewer findings -- a
   * distinct, later loop still exists after review, gated by a human at
   * Gate 2, for fixing what the reviewer finds. Small and deliberate, same
   * reasoning as MAX_CONCURRENT_PIPELINE_RUNS below: real convergence
   * usually takes 0 or 1 rounds; a demo doesn't need to try indefinitely,
   * and every extra round is itself a real, billed model call. */
  MAX_FIX_ATTEMPTS: 4,
  /** How many times the cross-vendor reviewer may see the work.
   *
   * There was no second review at all: after the post-review fix the run
   * re-verified and SHIPPED, so the reviewer never saw the code it caused to
   * change. "A different vendor's model reviewed it" was true of the draft and
   * not of the thing that shipped.
   *
   * Two rounds, then a refusal. Not unlimited: a reviewer and a fixer that
   * disagree forever would burn the budget arguing, and "we could not converge"
   * is a legitimate answer that this system is supposed to be willing to give. */
  MAX_REVIEW_ROUNDS: 2,
  /** max_tokens per stage, sized from docs/REBUILD-PROPOSAL.md's measured
   * numbers -- the implement stage's first measurement hit a 3000-token cap
   * mid-artifact; this is deliberately larger. `ground` added for the new
   * grounding stage (FINISH.md chunk 7) -- small, since it returns a short
   * structured verdict, not code. `implementEdit`/`fixEdit` (FOUNDATION-2,
   * "emit the change, not the file"): a WorldEdit is a handful of ops, not
   * a file -- even addObjectType's full geometry recipe fits comfortably
   * under 1500 tokens; sized with real headroom over that, not copied from
   * the full-file caps it replaces for the data-edit path. */
  TOKEN_CAPS: { brief: 800, ground: 500, implement: 6000, review: 2500, fix: 4000, implementEdit: 1500, fixEdit: 1500, assess: 900, qa: 700 },
  /** UPGRADE.md section 0: 3 live runs/IP/day (up from 2, permanent, not a
   * temporary carve-out) -- 3 x the $0.23 (source-edit) worst case =~
   * $0.69/IP/day, still small next to the global daily cap below. This
   * comment anticipated raising the limit once a typical run fell under
   * $0.05 -- checked directly against FOUNDATION-2's re-derived data-edit
   * ceiling (CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT's own comment):
   * NOT MET, and not close. plan ($0.04 worst case) and review ($0.035)
   * alone already total $0.075 before implement/fix are even counted --
   * the data-edit optimization made implement/fix cheap, but neither of
   * those two stages was ever what made a run expensive. Left at 3,
   * unchanged; re-check this if plan or review's routing/token caps
   * change, since those are what would actually move the number. */
  /** FOUR, and the number is derived, not chosen.
   *
   * It wants to be 5 -- enough to see a success, a refusal and a retry. But the
   * per-IP limit and the daily cap are not independent: at the worst-case
   * ceiling one address can cost DAILY_LIVE_RUNS_PER_IP x PER_RUN_CEILING, and
   * at 5 that is over the $2.00 daily cap. One visitor could close the site for
   * everyone else, which is the exact failure this limit exists to prevent. At
   * 4 it is $1.76 and cannot.
   *
   * Raise the daily cap and this can go up. test/controlLayer.test.ts asserts
   * the relationship so the two cannot drift apart silently. */
  // LOWERED, BECAUSE THE ARITHMETIC IT RESTS ON WAS WRONG.
  //
  // This was 4, justified against a "$0.23 source-edit worst case" that priced
  // output tokens only. With input priced the worst case is $0.7073, so four
  // runs is $2.88 against a $2.00 daily cap -- one visitor could drain the day
  // and then some. The suite says so now rather than the comment asserting it.
  //
  // Two runs is $1.44, which still leaves one visitor taking most of the day.
  // The honest options are fewer runs or a bigger cap, and the cap is Mark's
  // call once real per-run costs are observed rather than bounded. Two for now,
  // because a limit that is wrong in the permissive direction is the one that
  // costs money.
  DAILY_LIVE_RUNS_PER_IP: 2,
  /** Global ceiling across BOTH vendors combined -- Anthropic and OpenAI
   * spend are separate budgets that both count toward this one number.
   * FINISH.md section 5: $2.00 daily / $7.00 weekly / $20.00 monthly --
   * three checkpoints, not one, so a burst that clears the daily cap on
   * day one still can't run away across a week or a month. */
  PIPELINE_DAILY_CAP_USD: 2.0,
  PIPELINE_WEEKLY_CAP_USD: 7.0,
  PIPELINE_MONTHLY_CAP_USD: 20.0,
  /** Small and deliberate -- bounds worst-case simultaneous spend burst; a
   * demo doesn't need real concurrency. */
  MAX_CONCURRENT_PIPELINE_RUNS: 5,
  /** Consecutive failures from one provider before that provider's circuit
   * opens and calls stop hitting it. */
  CIRCUIT_FAILURE_THRESHOLD: 3,
  /** How long a circuit stays OPEN before allowing one HALF_OPEN trial call. */
  CIRCUIT_RECOVERY_MS: 60_000,
  /** Free-form prompts only -- this is the one path where a visitor
   * controls the input, so it's the one that will be attacked. */
  FREE_FORM_MAX_LENGTH: 500,
  /** Concurrency lease TTL -- must exceed the longest a run can legitimately
   * stay open, which is the human-gate wait (5 min), not just a no-gate
   * run's ~90s. Found by actually running the pipeline: an earlier 180s
   * value could expire mid-gate-wait, freeing the concurrency slot while
   * the run was still genuinely in flight. Padded past the 5-minute gate
   * timeout so a crashed run still self-frees instead of leaking forever. */
  ACTIVE_RUN_LEASE_TTL_SEC: 330,
} as const;

export class PipelineLimitError extends Error {
  constructor(
    public readonly kind:
      | "concurrency"
      | "per-ip-daily"
      | "daily-cap"
      | "weekly-cap"
      | "monthly-cap"
      | "per-run-ceiling"
      | "input-guard",
    message: string,
  ) {
    super(message);
  }
}

export type Provider = "anthropic" | "openai";

export class CircuitOpenError extends Error {
  constructor(public readonly provider: Provider) {
    super(`${provider} is temporarily unavailable (too many consecutive failures) -- cooling down before retrying.`);
  }
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- 7. Input guard (free-form only) ----------

const FORCE_OUTPUT_PATTERNS: RegExp[] = [
  /as (much|long) as (possible|you can)/i,
  /repeat.{0,25}(forever|infinite(ly)?|\d{3,}\s*times)/i,
  /write .{0,30}(a|an) (book|novel|essay|thesis|dissertation)/i,
  /\b\d{4,}\s*(words|lines|times|paragraphs|tokens)\b/i,
  /ignore (all|the) (previous|prior|above) instructions/i,
];

export function checkInputGuard(prompt: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return { ok: false, reason: "prompt is empty" };
  if (trimmed.length > CONTROL_LIMITS.FREE_FORM_MAX_LENGTH) {
    return { ok: false, reason: `prompt is longer than the ${CONTROL_LIMITS.FREE_FORM_MAX_LENGTH}-character limit` };
  }
  for (const pattern of FORCE_OUTPUT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: "prompt matches a pattern commonly used to force excessive output" };
    }
  }
  return { ok: true };
}

// ---------- 3. Per-IP daily limit on LIVE runs ----------

/**
 * Claim one of today's runs for this IP, atomically, through the Durable Object.
 *
 * The KV version of this was read -> compare -> (later) write, which is the
 * same race the spend cap was moved into a DO to close. It is kept below as
 * the fallback for when SPEND_COUNTER is not bound (local dev), and is clearly
 * labelled as raceable so nobody mistakes it for the real check.
 */
/**
 * WHY can this visitor not start a run?
 *
 * A read-only sibling of claimPipelineRun that consumes nothing. It exists
 * because EventSource cannot read an HTTP error body: when /change-run answers
 * 429 or 503 the browser gets a bare `error` event with no status and no
 * reason, and the page used to report that as "connection interrupted" -- which
 * is not merely unhelpful, it is FALSE. The two real causes (this visitor has
 * used their three runs, or the day's spend cap is exhausted) are both
 * deliberate behaviour, and both are more interesting than the demo they block.
 * So the client asks this endpoint what actually happened and says so.
 */
export async function pipelineAvailability(
  env: { SPEND_COUNTER?: DurableObjectNamespace; SPEND_KV: KVNamespace },
  ip: string,
): Promise<{ ok: boolean; reason: string | null; detail: string | null; runsUsed: number; runsLimit: number; dailyRemainingUsd: number; countersRead: boolean }> {
  const runsLimit = CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP;
  let runsUsed = 0;
  // FAILING OPEN IS RIGHT HERE. REPORTING A NUMBER WE DID NOT READ IS NOT.
  //
  // This function is advisory: it exists to tell a visitor WHY a run cannot
  // start, and the actual enforcement is claimPipelineRun, an atomic claim on
  // the run path that throws PipelineLimitError independently of anything
  // decided here. So a counter outage must never block -- that part is correct
  // and deliberate.
  //
  // But both catches below leave runsUsed at 0 and dailyRemainingUsd at the
  // full cap, and those values then render as "3 of 3 runs left today". That is
  // a specific factual claim about the visitor's remaining quota, made from a
  // read that failed. Harmless to the cap, which still bites when they click
  // -- and exactly the class of statement this project is about not making.
  //
  // countersRead says whether these numbers came from a counter or from a
  // fallback, so a caller can decline to quote them.
  let countersRead = true;
  // READ THE COUNTER THAT IS ACTUALLY ENFORCED.
  //
  // This read KV at `pipeline/ratelimit/...`. claimPipelineRun, when the
  // Durable Object is bound -- which it always is in production -- returns
  // before ever touching KV and increments `ratelimit/...` in DO STORAGE
  // instead. Different store, different key. So runsUsed was permanently 0,
  // the per-IP branch below could never fire, and a visitor who had used all
  // three runs got told "The run could not be started" -- the exact generic
  // non-answer this function was written to replace.
  //
  // Mirror what the enforcer does: DO when it is there, KV only when it isn't.
  try {
    if (env.SPEND_COUNTER) {
      const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));
      const res = await stub.fetch("https://do/runs-used", {
        method: "POST",
        body: JSON.stringify({ ip, day: dayKey() }),
      });
      if (res.ok) runsUsed = ((await res.json()) as { used: number }).used ?? 0;
    } else {
      const raw = await env.SPEND_KV.get(`pipeline/ratelimit/${ip}/${dayKey()}`);
      runsUsed = raw ? parseInt(raw, 10) || 0 : 0;
    }
  } catch { countersRead = false; /* unavailable -- never a block, but no longer reported as a fact */ }

  let dailyRemainingUsd: number = CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD;
  if (env.SPEND_COUNTER) {
    try {
      const s = await getPipelineSpendStatus(env.SPEND_COUNTER);
      dailyRemainingUsd = Math.max(0, CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD - s.dailySpentUsd);
    } catch { countersRead = false; /* same: unknown is not a block, and not a number either */ }
  }

  if (runsUsed >= runsLimit) {
    return {
      ok: false, reason: "per-ip-daily", runsUsed, runsLimit, dailyRemainingUsd, countersRead,
      detail: `You have used all ${runsLimit} live runs for today from this address. That cap is enforced in code, not by good intentions -- it is the same mechanism the write-up describes. The recorded run below shows the whole pipeline, free and unlimited.`,
    };
  }
  // Blocking as soon as the remaining budget is under a whole run's CEILING
  // refused the last 7% of every day for runs the server would happily have
  // started -- spend is enforced per model call, not per run, and the first
  // call costs about $0.0025. A false "no" is still a wrong answer, so this
  // blocks only when there is not enough left for the pipeline's first stage
  // to be reserved at all.
  if (dailyRemainingUsd < 0.01) {
    return {
      ok: false, reason: "daily-cap", runsUsed, runsLimit, dailyRemainingUsd, countersRead,
      detail: `Today's spend cap is exhausted ($${CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD.toFixed(2)}/day, held in a Durable Object). The pipeline fails closed rather than overspending -- that is the intended behaviour, not an outage. The recorded run below shows the whole pipeline, free and unlimited.`,
    };
  }
  return { ok: true, reason: null, detail: null, runsUsed, runsLimit, dailyRemainingUsd, countersRead };
}

/** Give back a claimed run that never actually started. See refundRun. */
export async function refundPipelineRun(
  env: { SPEND_COUNTER?: DurableObjectNamespace; SPEND_KV: KVNamespace },
  ip: string,
): Promise<void> {
  if (!env.SPEND_COUNTER) return;
  try {
    const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));
    await stub.fetch("https://do/refund-run", { method: "POST", body: JSON.stringify({ ip, day: dayKey() }) });
  } catch { /* a failed refund must never turn into a failed request */ }
}

export async function claimPipelineRun(env: { SPEND_COUNTER?: DurableObjectNamespace; SPEND_KV: KVNamespace }, ip: string): Promise<void> {
  const limit = CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP;
  if (env.SPEND_COUNTER) {
    const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));
    const res = await stub.fetch("https://do/claim-run", {
      method: "POST",
      body: JSON.stringify({ ip, day: dayKey(), limit }),
    });
    const out = (await res.json()) as { ok: boolean; used: number; limit: number };
    if (!out.ok) {
      throw new PipelineLimitError(
        "per-ip-daily",
        `You've hit the limit of ${limit} live pipeline runs per day for this demo. ` +
          `Come back tomorrow, or watch a recorded run below -- recordings are free and unlimited.`,
      );
    }
    return;
  }
  // fallback only: raceable, and only reachable without the DO binding
  await assertUnderPipelineRateLimit(env.SPEND_KV, ip);
  await recordPipelineRateLimitHit(env.SPEND_KV, ip);
}

/** RACEABLE. Kept for the no-Durable-Object fallback path only. */
export async function assertUnderPipelineRateLimit(kv: KVNamespace, ip: string): Promise<void> {
  const key = `pipeline/ratelimit/${ip}/${dayKey()}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP) {
    throw new PipelineLimitError(
      "per-ip-daily",
      `You've hit the limit of ${CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP} live pipeline runs per day for this demo. ` +
        `Come back tomorrow, or watch a recorded run below -- recordings are free and unlimited.`,
    );
  }
}

export async function recordPipelineRateLimitHit(kv: KVNamespace, ip: string): Promise<void> {
  const key = `pipeline/ratelimit/${ip}/${dayKey()}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  await kv.put(key, String(count + 1), { expirationTtl: 60 * 60 * 24 * 2 });
}

// ---------- 4 & 5. Global daily + weekly + monthly spend cap, across both vendors ----------
//
// Backed by the SpendCounterDO (src/spendCounterDO.ts), not KV. KV's
// eventual consistency meant the old check-then-later-record shape had a
// real race: two concurrent calls could both read the same "under the cap"
// total and both proceed, landing the real total over the cap. A cap that
// can be raced is not a cap (FINISH.md section 5). One global DO instance
// serializes every reserve() against every other, closing the race
// structurally instead of adding more checking around it.

function spendCaps(): { dailyCapUsd: number; weeklyCapUsd: number; monthlyCapUsd: number } {
  return { dailyCapUsd: CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD, weeklyCapUsd: CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD, monthlyCapUsd: CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD };
}

function spendCounterStub(ns: DurableObjectNamespace): DurableObjectStub {
  return ns.get(ns.idFromName("global"));
}

/** Atomically checks AND commits the worst-case estimate against all three
 * caps in one call to the DO -- the estimate is provisionally "spent" the
 * moment this returns ok, before the real model call even starts, so a
 * second concurrent call sees the reservation and can't also squeeze
 * through. Call reconcilePipelineSpend after the real cost is known to
 * true the reservation down (almost always) to the actual cost. */
export async function assertUnderPipelineSpendCap(ns: DurableObjectNamespace, worstCaseCostUsd: number): Promise<void> {
  const stub = spendCounterStub(ns);
  const res = await stub.fetch("https://spend-counter/reserve", {
    method: "POST",
    body: JSON.stringify({ estimateUsd: worstCaseCostUsd, caps: spendCaps() }),
  });
  const result = (await res.json()) as { ok: true } | { ok: false; kind: "daily-cap" | "weekly-cap" | "monthly-cap"; message: string };
  if (!result.ok) {
    throw new PipelineLimitError(result.kind, `${result.message} Recorded runs below are free and unlimited.`);
  }
}

/** Reconciles a prior reservation down (or up) to the real cost. Must be
 * called with the SAME estimate that was passed to assertUnderPipelineSpendCap
 * for this call, so the adjustment is exactly (actual - reserved), never a
 * guess at what was previously committed. */
export async function reconcilePipelineSpend(ns: DurableObjectNamespace, reservedUsd: number, actualCostUsd: number): Promise<void> {
  const stub = spendCounterStub(ns);
  await stub.fetch("https://spend-counter/reconcile", {
    method: "POST",
    body: JSON.stringify({ reservedUsd, actualUsd: actualCostUsd }),
  });
}

export async function getPipelineSpendStatus(ns: DurableObjectNamespace): Promise<{ dailySpentUsd: number; weeklySpentUsd: number; monthlySpentUsd: number }> {
  const stub = spendCounterStub(ns);
  const res = await stub.fetch("https://spend-counter/status");
  return (await res.json()) as { dailySpentUsd: number; weeklySpentUsd: number; monthlySpentUsd: number };
}

export interface PipelineBudgetStatus {
  dailySpentUsd: number;
  dailyCapUsd: number;
  dailyRemainingUsd: number;
  weeklySpentUsd: number;
  weeklyCapUsd: number;
  weeklyRemainingUsd: number;
  monthlySpentUsd: number;
  monthlyCapUsd: number;
  monthlyRemainingUsd: number;
  /** FOUNDATION-2: two ceilings, not one -- see CONTROL_LIMITS'
   * PER_RUN_CEILING_USD_DATA_EDIT/_SOURCE_EDIT for the worst-case
   * arithmetic behind each. Which one actually applies to a given run is
   * decided once its plan declares implementationPath. */
  perRunCeilingUsdDataEdit: number;
  perRunCeilingUsdSourceEdit: number;
  dailyLiveRunsPerIp: number;
  maxConcurrentRuns: number;
}

/** Shown on the page always, not only when a limit is hit -- REBUILD-CONTROLS.md is explicit that the controls must be visible, not just enforced. */
export async function getPipelineBudgetStatus(ns: DurableObjectNamespace): Promise<PipelineBudgetStatus> {
  const { dailySpentUsd: daily, weeklySpentUsd: weekly, monthlySpentUsd: monthly } = await getPipelineSpendStatus(ns);
  return {
    dailySpentUsd: daily,
    dailyCapUsd: CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD,
    dailyRemainingUsd: Math.max(0, CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD - daily),
    weeklySpentUsd: weekly,
    weeklyCapUsd: CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD,
    weeklyRemainingUsd: Math.max(0, CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD - weekly),
    monthlySpentUsd: monthly,
    monthlyCapUsd: CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD,
    monthlyRemainingUsd: Math.max(0, CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD - monthly),
    perRunCeilingUsdDataEdit: CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT,
    perRunCeilingUsdSourceEdit: CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT,
    dailyLiveRunsPerIp: CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP,
    maxConcurrentRuns: CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS,
  };
}

// ---------- 1. Per-run ceiling ----------

// FOUNDATION-2: ceilingUsd is now a parameter, not a single module
// constant read internally -- the caller (changePipeline.ts's
// currentCeiling()) picks PER_RUN_CEILING_USD_DATA_EDIT or _SOURCE_EDIT
// based on plan.implementationPath, since the two paths have genuinely
// different worst cases and a run must be checked against the one that
// actually bounds it.
export function assertUnderRunCeiling(spentSoFarUsd: number, nextEstimateUsd: number, ceilingUsd: number): void {
  if (spentSoFarUsd + nextEstimateUsd > ceilingUsd) {
    throw new PipelineLimitError(
      "per-run-ceiling",
      `This run's cost ($${spentSoFarUsd.toFixed(4)} so far) would exceed the per-run ceiling ` +
        `($${ceilingUsd.toFixed(2)}) -- stopping here rather than continuing to spend.`,
    );
  }
}

// ---------- 6. Concurrency limit ----------

const ACTIVE_PREFIX = "pipeline/active/";

export async function tryLeaseActiveRun(kv: KVNamespace, runId: string, spendCounterDO?: DurableObjectNamespace): Promise<string | null> {
  if (spendCounterDO) {
    try {
      const id = spendCounterDO.idFromName("global");
      const stub = spendCounterDO.get(id);
      const res = await stub.fetch("https://spend-counter.internal/lease-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, maxConcurrent: CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; leaseToken?: string; reason?: string };
        if (!data.ok) {
          throw new PipelineLimitError("concurrency", data.reason || "Concurrent pipeline run limit reached");
        }
        if (data.leaseToken) {
          await kv.put(`change/lease-token/${runId}`, data.leaseToken, { expirationTtl: CONTROL_LIMITS.ACTIVE_RUN_LEASE_TTL_SEC });
        }
        // Mirror to KV for observability
        await kv.put(`${ACTIVE_PREFIX}${runId}`, "1", { expirationTtl: CONTROL_LIMITS.ACTIVE_RUN_LEASE_TTL_SEC });
        return data.leaseToken ?? null;
      }
      throw new PipelineLimitError("concurrency", `Lease coordinator returned HTTP ${res.status}. Concurrency slot could not be secured.`);
    } catch (e) {
      if (e instanceof PipelineLimitError) throw e;
      throw new PipelineLimitError("concurrency", `Lease coordinator unavailable: ${(e as Error).message || "connection error"}`);
    }
  }

  // Fallback to KV prefix check ONLY when Durable Object binding is completely absent in test harness
  const list = await kv.list({ prefix: ACTIVE_PREFIX });
  if (list.keys.some(k => k.name === `${ACTIVE_PREFIX}${runId}`)) {
    throw new PipelineLimitError("concurrency", `Pipeline run "${runId}" is already actively executing.`);
  }
  if (list.keys.length >= CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS) {
    throw new PipelineLimitError(
      "concurrency",
      `${list.keys.length} pipeline runs are already in flight (max ${CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS}) -- try again in a moment.`,
    );
  }
  await kv.put(`${ACTIVE_PREFIX}${runId}`, "1", { expirationTtl: CONTROL_LIMITS.ACTIVE_RUN_LEASE_TTL_SEC });
  return null;
}

export async function releaseActiveRun(kv: KVNamespace, runId: string, spendCounterDO?: DurableObjectNamespace, leaseToken?: string): Promise<void> {
  if (spendCounterDO && leaseToken) {
    try {
      const id = spendCounterDO.idFromName("global");
      const stub = spendCounterDO.get(id);
      const res = await stub.fetch("https://spend-counter.internal/release-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, leaseToken }),
      });
      if (!res.ok) {
        console.warn(`[lease] release-run returned HTTP ${res.status} for runId ${runId}`);
      }
    } catch (err) {
      console.warn(`[lease] release-run coordinator error for runId ${runId}:`, err);
    }
  }
  await kv.delete(`${ACTIVE_PREFIX}${runId}`).catch(() => {});
}

// ---------- 8. Circuit breaker (per provider) ----------

interface CircuitState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  consecutiveFailures: number;
  openedAt: number;
}

async function getCircuit(kv: KVNamespace, provider: Provider): Promise<CircuitState> {
  const raw = await kv.get(`pipeline/circuit/${provider}`);
  return raw ? JSON.parse(raw) : { state: "CLOSED", consecutiveFailures: 0, openedAt: 0 };
}

async function putCircuit(kv: KVNamespace, provider: Provider, s: CircuitState): Promise<void> {
  await kv.put(`pipeline/circuit/${provider}`, JSON.stringify(s));
}

/** Call before every request to a provider. Throws immediately (no call, no
 * hung thread) if that provider's circuit is open. */
export async function assertCircuitClosed(kv: KVNamespace, provider: Provider): Promise<void> {
  const c = await getCircuit(kv, provider);
  if (c.state === "OPEN") {
    if (Date.now() - c.openedAt > CONTROL_LIMITS.CIRCUIT_RECOVERY_MS) {
      await putCircuit(kv, provider, { ...c, state: "HALF_OPEN" });
      return; // let exactly one trial call through
    }
    throw new CircuitOpenError(provider);
  }
}

export async function recordProviderSuccess(kv: KVNamespace, provider: Provider): Promise<void> {
  await putCircuit(kv, provider, { state: "CLOSED", consecutiveFailures: 0, openedAt: 0 });
}

export async function recordProviderFailure(kv: KVNamespace, provider: Provider): Promise<void> {
  const c = await getCircuit(kv, provider);
  if (c.state === "HALF_OPEN") {
    // The recovery trial itself failed -- reopen immediately, don't wait for the full threshold again.
    await putCircuit(kv, provider, { state: "OPEN", consecutiveFailures: c.consecutiveFailures + 1, openedAt: Date.now() });
    return;
  }
  const failures = c.consecutiveFailures + 1;
  if (failures >= CONTROL_LIMITS.CIRCUIT_FAILURE_THRESHOLD) {
    await putCircuit(kv, provider, { state: "OPEN", consecutiveFailures: failures, openedAt: Date.now() });
  } else {
    await putCircuit(kv, provider, { state: "CLOSED", consecutiveFailures: failures, openedAt: 0 });
  }
}

// ---------- validate-before-consume: truncated output is a failure ----------

/**
 * A response that hit its token cap mid-generation -- not valid content,
 * regardless of whether it happens to parse. Found the hard way, twice:
 * once as a hard JSON.parse crash (a structured-output plan cut off mid-
 * object), once as content that would have silently passed through as a
 * "complete" implementation had nothing caught it (a truncated artifact is
 * syntactically plausible up to the cut point). Every call site that talks
 * to a model retries once with a larger budget on this specific failure,
 * then hard-fails -- never returns a truncated result as if it were whole.
 */
export class TruncatedResponseError extends Error {
  constructor(stage: string, maxTokens: number) {
    super(`${stage} response hit the ${maxTokens}-token cap and was cut off mid-generation -- treated as a failure, not partial content.`);
  }
}

// ---------- validate-before-consume + retry-with-correction ----------

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Calls `call()`, validates the result, and -- on failure -- retries exactly
 * once with a correction hint specific to what was wrong (not the identical
 * prompt; that practice is explicit that re-sending the same prompt
 * usually fails identically). Still-invalid after the retry surfaces as an
 * error rather than being silently accepted, the same discipline already
 * used for the plain task set's repair loop.
 */
export async function callWithValidationRetry<T>(
  call: (correctionHint?: string) => Promise<T>,
  validate: (result: T) => ValidationResult,
): Promise<T> {
  const first = await call();
  const v1 = validate(first);
  if (v1.ok) return first;

  const retried = await call(
    `Your previous response was invalid: ${v1.reason}. Fix this specific problem and return a corrected, ` +
      `complete response in the same format as requested -- no commentary about the correction.`,
  );
  const v2 = validate(retried);
  if (!v2.ok) {
    throw new Error(`Response still invalid after one correction attempt: ${v2.reason}`);
  }
  return retried;
}
