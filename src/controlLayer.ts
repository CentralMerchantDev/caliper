// The CALIPER pipeline's control layer (REBUILD-CONTROLS.md), modeled on a
// production build's control-layer practice: input guard, per-run and
// global spend ceilings, a concurrency limit, and a per-provider circuit
// breaker. All state is KV-backed (Workers are stateless/distributed --
// that practice's own guidance is to back this with shared state, not
// an in-memory counter). Entirely separate KV key namespace (`pipeline/*`)
// from the original experiment's spendCap.ts/rateLimit.ts, which keep
// governing the plain 32-task routes unchanged.

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
   * implementationPath is known (see currentCeiling() in
   * changePipeline.ts); before that (ground, plan), the SOURCE_EDIT
   * ceiling applies, since the path isn't known yet and ground+plan cost
   * the same either way.
   *
   * SOURCE_EDIT worst case, unchanged from before this brief: ground
   * $0.0025 + plan $0.04 + implement $0.03 + fix*2 (pre-review,
   * MAX_FIX_ATTEMPTS) $0.08 + review $0.035 + fix $0.04 (post-review) +
   * retrospective $0.0015 = $0.229. $0.23 tracks that closely on purpose.
   *
   * DATA_EDIT worst case (FOUNDATION-2 report, measured against a live
   * Claude subscription, not this Worker's key): ground $0.0025 + plan
   * $0.04 + implementEdit $0.0075 + fixEdit*2 (pre-review) $0.03 +
   * review $0.035 + fixEdit $0.015 (post-review) + retrospective
   * $0.0015 = $0.1315. $0.14 tracks that closely, same philosophy: tight
   * against the theoretical ceiling, not against typical spend. Note
   * plan + review alone already total $0.075 -- unaffected by this
   * brief's optimization, since implement/fix's cost was never what made
   * either of those two expensive. Re-derive again if MAX_FIX_ATTEMPTS,
   * either path's token caps, or the routed models change. */
  PER_RUN_CEILING_USD_SOURCE_EDIT: 0.23,
  PER_RUN_CEILING_USD_DATA_EDIT: 0.14,
  /** Cross-model review must never see code that's still failing its own
   * checks (FINAL.md item 1: "the reviewer reads a diff that has already
   * passed CI"). This bounds the implement -> verify -> fix loop that runs
   * BEFORE review, on verification failures, not reviewer findings -- a
   * distinct, later loop still exists after review, gated by a human at
   * Gate 2, for fixing what the reviewer finds. Small and deliberate, same
   * reasoning as MAX_CONCURRENT_PIPELINE_RUNS below: real convergence
   * usually takes 0 or 1 rounds; a demo doesn't need to try indefinitely,
   * and every extra round is itself a real, billed model call. */
  MAX_FIX_ATTEMPTS: 2,
  /** max_tokens per stage, sized from docs/REBUILD-PROPOSAL.md's measured
   * numbers -- the implement stage's first measurement hit a 3000-token cap
   * mid-artifact; this is deliberately larger. `ground` added for the new
   * grounding stage (FINISH.md chunk 7) -- small, since it returns a short
   * structured verdict, not code. `implementEdit`/`fixEdit` (FOUNDATION-2,
   * "emit the change, not the file"): a WorldEdit is a handful of ops, not
   * a file -- even addObjectType's full geometry recipe fits comfortably
   * under 1500 tokens; sized with real headroom over that, not copied from
   * the full-file caps it replaces for the data-edit path. */
  TOKEN_CAPS: { brief: 800, ground: 500, implement: 6000, review: 2500, fix: 4000, implementEdit: 1500, fixEdit: 1500 },
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
  DAILY_LIVE_RUNS_PER_IP: 3,
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
  MAX_CONCURRENT_PIPELINE_RUNS: 3,
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
function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
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

export async function tryLeaseActiveRun(kv: KVNamespace, runId: string): Promise<void> {
  const list = await kv.list({ prefix: ACTIVE_PREFIX });
  if (list.keys.length >= CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS) {
    throw new PipelineLimitError(
      "concurrency",
      `${list.keys.length} pipeline runs are already in flight (max ${CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS}) -- try again in a moment.`,
    );
  }
  await kv.put(`${ACTIVE_PREFIX}${runId}`, "1", { expirationTtl: CONTROL_LIMITS.ACTIVE_RUN_LEASE_TTL_SEC });
}

export async function releaseActiveRun(kv: KVNamespace, runId: string): Promise<void> {
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
