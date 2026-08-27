// The CALIPER pipeline's control layer (REBUILD-CONTROLS.md), modeled on a
// production build's control-layer practice: input guard, per-run and
// global spend ceilings, a concurrency limit, and a per-provider circuit
// breaker. All state is KV-backed (Workers are stateless/distributed --
// that practice's own guidance is to back this with shared state, not
// an in-memory counter). Entirely separate KV key namespace (`pipeline/*`)
// from the original experiment's spendCap.ts/rateLimit.ts, which keep
// governing the plain 32-task routes unchanged.

export const CONTROL_LIMITS = {
  /** Abort the rest of a run if its running total would exceed this.
   * Re-derived for CALIPER v2 (BUILD-V2.md step 4/5), not inherited from
   * v1's REBUILD-CONTROLS.md numbers below -- v2 has stages v1 didn't
   * (plan, an optional re-plan after a clarifying question, an optional
   * fix round, a retrospective). Real measured v2 runs, this session:
   * a plan-only run with no question/no fix ~$0.06; a full run with a
   * question, one fix round, and a retrospective ~$0.16 (the highest
   * single real run recorded: $0.163). $0.35 leaves >2x headroom above
   * that worst case, still well short of the daily cap below. */
  PER_RUN_CEILING_USD: 0.35,
  /** max_tokens per stage, sized from docs/REBUILD-PROPOSAL.md's measured
   * numbers -- the implement stage's first measurement hit a 3000-token cap
   * mid-artifact; this is deliberately larger. */
  TOKEN_CAPS: { brief: 800, implement: 6000, review: 2500, fix: 4000 },
  /** 3 runs x the real ~$0.163 worst-case measured v2 cost =~ $0.49/IP/day --
   * re-derived from the numbers above, not the v1 comment this replaces
   * (which cited v1's ~$0.12 worst case). Still small next to the global
   * daily cap below. */
  DAILY_LIVE_RUNS_PER_IP: 3,
  /** Global ceiling across BOTH vendors combined -- Anthropic and OpenAI
   * spend are separate budgets that both count toward this one number. */
  PIPELINE_DAILY_CAP_USD: 5.0,
  /** Backstop so a single bad day can't take the month: 6x the daily cap,
   * so even maxing the daily cap for a week trips this before a full month
   * could be exhausted at that rate. */
  PIPELINE_MONTHLY_CAP_USD: 30.0,
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

// ---------- 4 & 5. Global daily + monthly spend cap, across both vendors ----------

export async function assertUnderPipelineSpendCap(kv: KVNamespace, worstCaseCostUsd: number): Promise<void> {
  const dailyRaw = await kv.get(`pipeline/spend/daily/${dayKey()}`);
  const daily = dailyRaw ? parseFloat(dailyRaw) : 0;
  if (daily + worstCaseCostUsd > CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD) {
    throw new PipelineLimitError(
      "daily-cap",
      `Today's pipeline budget ($${CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD.toFixed(2)}, across both model providers) is ` +
        `used up ($${daily.toFixed(4)} spent so far). It resets at midnight UTC -- recorded runs below are free and unlimited.`,
    );
  }
  const monthlyRaw = await kv.get(`pipeline/spend/monthly/${monthKey()}`);
  const monthly = monthlyRaw ? parseFloat(monthlyRaw) : 0;
  if (monthly + worstCaseCostUsd > CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD) {
    throw new PipelineLimitError(
      "monthly-cap",
      `This month's pipeline budget ($${CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD.toFixed(2)}) is used up. ` +
        `Recorded runs below are free and unlimited.`,
    );
  }
}

export async function recordPipelineSpend(kv: KVNamespace, actualCostUsd: number): Promise<void> {
  const dKey = `pipeline/spend/daily/${dayKey()}`;
  const dRaw = await kv.get(dKey);
  const daily = (dRaw ? parseFloat(dRaw) : 0) + actualCostUsd;
  await kv.put(dKey, daily.toString(), { expirationTtl: 60 * 60 * 24 * 2 });

  const mKey = `pipeline/spend/monthly/${monthKey()}`;
  const mRaw = await kv.get(mKey);
  const monthly = (mRaw ? parseFloat(mRaw) : 0) + actualCostUsd;
  await kv.put(mKey, monthly.toString(), { expirationTtl: 60 * 60 * 24 * 45 });
}

export interface PipelineBudgetStatus {
  dailySpentUsd: number;
  dailyCapUsd: number;
  dailyRemainingUsd: number;
  monthlySpentUsd: number;
  monthlyCapUsd: number;
  monthlyRemainingUsd: number;
  perRunCeilingUsd: number;
  dailyLiveRunsPerIp: number;
  maxConcurrentRuns: number;
}

/** Shown on the page always, not only when a limit is hit -- REBUILD-CONTROLS.md is explicit that the controls must be visible, not just enforced. */
export async function getPipelineBudgetStatus(kv: KVNamespace): Promise<PipelineBudgetStatus> {
  const dailyRaw = await kv.get(`pipeline/spend/daily/${dayKey()}`);
  const daily = dailyRaw ? parseFloat(dailyRaw) : 0;
  const monthlyRaw = await kv.get(`pipeline/spend/monthly/${monthKey()}`);
  const monthly = monthlyRaw ? parseFloat(monthlyRaw) : 0;
  return {
    dailySpentUsd: daily,
    dailyCapUsd: CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD,
    dailyRemainingUsd: Math.max(0, CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD - daily),
    monthlySpentUsd: monthly,
    monthlyCapUsd: CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD,
    monthlyRemainingUsd: Math.max(0, CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD - monthly),
    perRunCeilingUsd: CONTROL_LIMITS.PER_RUN_CEILING_USD,
    dailyLiveRunsPerIp: CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP,
    maxConcurrentRuns: CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS,
  };
}

// ---------- 1. Per-run ceiling ----------

export function assertUnderRunCeiling(spentSoFarUsd: number, nextEstimateUsd: number): void {
  if (spentSoFarUsd + nextEstimateUsd > CONTROL_LIMITS.PER_RUN_CEILING_USD) {
    throw new PipelineLimitError(
      "per-run-ceiling",
      `This run's cost ($${spentSoFarUsd.toFixed(4)} so far) would exceed the per-run ceiling ` +
        `($${CONTROL_LIMITS.PER_RUN_CEILING_USD.toFixed(2)}) -- stopping here rather than continuing to spend.`,
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
