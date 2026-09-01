import type { SimTestCase, TestResult } from "./types";
import { generatePlan, implementChange, fixChange, implementChangeAsEdit, fixChangeAsEdit, runRetrospective, DEFAULT_MODEL, type ChangePlan, PRICING as ANTHROPIC_PRICING } from "./claude";
import { reviewArtifact, parseFindings, REVIEW_MODEL, PRICING as OPENAI_PRICING, type ReviewFinding } from "./openai";
import { runSimTests } from "./simSandbox";
import { SIM_REGRESSION_SUITE } from "./simRegression";
import { SIM_BASELINE_SOURCE } from "./simBaseline";
import type { ProposedCriterion } from "./criteria";
import { evaluateCriteria, type ProbeRunner } from "./criteriaExecution";
import { worldIntegrityChecks } from "./worldEdit";
import { groundRequest, formatGroundingForPlan, type GroundingResult } from "./grounding";
import {
  CONTROL_LIMITS,
  PipelineLimitError,
  assertUnderRunCeiling,
  assertUnderPipelineSpendCap,
  reconcilePipelineSpend,
  assertCircuitClosed,
  recordProviderSuccess,
  recordProviderFailure,
  classifyErrorPermanence,
  type ErrorPermanence,
  type Provider,
} from "./controlLayer";

// CALIPER v2 (BUILD-V2.md): the pipeline now modifies a working system
// (src/simBaseline.ts) instead of generating a standalone artifact from
// nothing (src/pipeline.ts, superseded but not yet deleted). Control layer,
// sandbox, cross-vendor reviewer, and cost experiment all carry over
// unchanged; what's new is plan mode as a front gate, structured
// (real, executable) acceptance criteria proposed in the plan, regression
// verification against the existing baseline, and "refuse to close" if a
// fix doesn't hold -- the baseline only ever advances on a real pass.
//
// A GATE NEVER ADVANCES ON ITS OWN. This was wrong once: the first version
// polled for a decision with a 5-minute timeout and proceeded anyway if
// none arrived -- a pause dressed up as a gate. Caught in review, not by
// this code. The fix: no waiting inside a single call at all. Every call
// checks ONCE for a real decision/answer; if there isn't one, it persists
// exactly where it stopped and returns a "halted" outcome, full stop. A
// later call with the same runId -- made any time after a human actually
// decides -- picks up from that exact point. Nothing here ever fabricates
// a decision from silence.

// Routing table (FINISH.md section 5, applied live): Haiku grounds, Sonnet
// plans (generatePlan's own DEFAULT_MODEL, unchanged), Haiku implements,
// Sonnet fixes, Haiku retrospects. Implement moved off Sonnet on purpose --
// additive, schema-constrained criteria (chunk 6) shrank both the
// judgement this stage needs to exercise and the output it produces, so
// the cheap tier fits; Fix stays on Sonnet because repairing against a
// reviewer's findings is a harder, less-tested shape (see the original
// v1 routing rationale this carries forward). No Opus anywhere.
const GROUND_MODEL = "claude-haiku-4-5";
const IMPLEMENT_MODEL = "claude-haiku-4-5";
const FIX_MODEL = "claude-sonnet-5";
const RETROSPECTIVE_MODEL = "claude-haiku-4-5";
const SIM_VERIFY_CPU_MS = 2000;
const STATE_TTL_SEC = 60 * 60 * 24 * 7; // a halted run can be resumed for a week

function regressionSummaryText(): string {
  return SIM_REGRESSION_SUITE.map((t) => `- ${t.name}`).join("\n");
}

export type ChangeEvent =
  | { type: "retrospective"; lesson: string | null; recurrenceCount: number | null; costUsd: number }
  | { type: "grounding" }
  | { type: "grounded"; result: GroundingResult; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number }
  | { type: "planning" }
  | { type: "planned"; plan: ChangePlan; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number }
  | { type: "question"; runId: string; question: string }
  | { type: "answered"; answer: string }
  | { type: "plan-gate"; runId: string; plan: ChangePlan; grounding: GroundingResult; costEstimateUsd: number; budgetRemainingUsd: number }
  | { type: "plan-gate-decided"; decision: "approve" | "reject" }
  | { type: "plan-gate-replied"; reply: string }
  | { type: "implementing" }
  | { type: "implemented"; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number; code: string }
  | { type: "verifying" }
  | { type: "verified"; regression: TestResult[]; criteria: TestResult[]; regressionPassed: number; regressionTotal: number; criteriaPassed: number; criteriaTotal: number; fatalError?: string }
  | { type: "reviewing" }
  | { type: "reviewed"; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number; reviewText: string; findings: ReviewFinding[] }
  | { type: "review-gate"; runId: string; materialFindings: string[]; nitFindings: string[] }
  | { type: "review-gate-decided"; decision: "approve" | "reject" }
  | { type: "fixing" }
  | { type: "fixed"; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number; code: string }
  | { type: "reverified"; regression: TestResult[]; criteria: TestResult[]; regressionPassed: number; regressionTotal: number; criteriaPassed: number; criteriaTotal: number; fatalError?: string }
  | { type: "shipped" }
  | { type: "refused"; reason: string }
  | { type: "stopped" }
  | { type: "halted"; runId: string; waitingOn: "answer" | "plan-decision" | "review-decision" | "error-decision" }
  | {
      // FOUNDATION-2 item 4: "a timeout must never lose a run... say
      // plainly what happened and what the visitor can do." This is that
      // plain statement -- sent the moment a stage throws, whether or not
      // anyone is still listening on this connection, since it's also
      // persisted to KV (see ChangeState.stage "errored") for whenever the
      // visitor next reconnects.
      type: "stage-error";
      runId: string;
      erroredAtStage: string;
      errorMessage: string;
      costSoFarUsd: number;
      // LAST.md item 1: "stop retrying permanent errors." A permanent
      // (4xx, not 429) error will fail identically on retry without a
      // code change -- the client uses this to not even offer Retry as an
      // option, rather than relying on a visitor to guess that clicking
      // it four times in a row is pointless.
      errorKind: ErrorPermanence;
    }
  | { type: "ledger"; ledger: ChangeLedger }
  // Shipped, but something adjacent went wrong that the visitor should know
  // about -- currently only a stale read mirror. Deliberately NOT a refusal:
  // the change really did commit, and saying otherwise would be its own lie.
  | { type: "warning"; message: string };

export interface ChangeLedger {
  outcome:
    | "shipped"
    | "refused-plan"
    | "refused-review"
    | "refused-verification"
    | "stopped"
    | "halted-awaiting-answer"
    | "halted-awaiting-plan-decision"
    | "halted-awaiting-review-decision"
    | "halted-awaiting-error-decision"
    | "abandoned-after-error";
  totalCostUsd: number;
  stageCosts: { stage: string; costUsd: number; wallTimeMs: number }[];
  reviewFoundMaterial: number;
  reviewFoundNits: number;
  fixApplied: boolean;
  fixHeld: boolean | null;
  /** "not-reached" is a real answer and a necessary one: a run stopped at the
   * question gate, or abandoned after an error before any plan existed, has no
   * plan-gate decision to report. Both used to record "approve" -- so the
   * changelog said a human approved a plan gate that never happened, in the
   * one artefact this project asks to be believed. */
  planGateDecision: "approve" | "reject" | "pending" | "not-reached";
  reviewGateDecision: "approve" | "reject" | "pending" | "not-needed";
  questionAsked: boolean;
  /** How many times the visitor replied in free text at Gate 1 instead of
   * approving/rejecting outright -- each one re-grounds and re-plans
   * (FINISH.md chunk 7). 0 is the common case. */
  planGateReplyCount: number;
  totalWallTimeMs: number;
  retrospectiveLesson: string | null;
  lessonRecurrenceCount: number | null;
}

export interface ChangeRecord {
  runId: string;
  changeRequest: string;
  plan: ChangePlan | null;
  finalCode: string | null;
  findings: ReviewFinding[];
  ledger: ChangeLedger;
  // POLISH.md item 1: a run history tab, real runs only. Every terminal
  // outcome (not just shipped/refused-verification, the only one this
  // used to cover) writes one of these to changelog/${runId} now, so the
  // history endpoint has something to read for every real ending, not
  // just the two that happened to already be logged.
  completedAt: number;
  reason: string;
}

/** One line, system-authored, never the raw visitor request -- the
 * "reason" column in the history tab. Pure and exported so it's directly
 * testable, and so the same logic backfills older changelog/ records
 * that predate these two fields (read-time fallback, not a migration
 * step -- see handleChangeHistory in index.ts). Deliberately vague on
 * method: outcomes, not stage internals. */
export function deriveHistoryReason(ledger: Pick<ChangeLedger, "outcome" | "fixApplied" | "fixHeld" | "reviewFoundMaterial">): string {
  switch (ledger.outcome) {
    case "shipped":
      if (ledger.reviewFoundMaterial > 0 && ledger.fixApplied && ledger.fixHeld) return "It passed verification. A fix addressed what review found.";
      if (ledger.reviewFoundMaterial > 0 && !ledger.fixApplied) return "It passed verification. The review's findings were accepted as is.";
      return "It passed every check.";
    case "refused-plan":
      return "The plan was not approved.";
    case "refused-verification":
      return ledger.fixApplied ? "A fix was attempted. It still did not pass its checks." : "It did not pass its checks.";
    case "stopped":
      return "Stopped partway through, by request.";
    case "abandoned-after-error":
      return "It failed partway through and was not retried.";
    default:
      return "Still in progress.";
  }
}

/** Writes the changelog entry every terminal branch below now calls
 * before returning -- previously only the final shipped/refused-
 * verification path did this, so "stopped", "refused at the plan gate",
 * and "abandoned after an error" never showed up anywhere. A write
 * failure here is swallowed (matches checkStopped's own delete a few
 * lines up) -- a KV hiccup logging history must never turn an otherwise-
 * successful run into a failed response. */
async function recordTerminalRun(kv: KVNamespace, record: Omit<ChangeRecord, "completedAt" | "reason">): Promise<ChangeRecord> {
  const full: ChangeRecord = { ...record, completedAt: Date.now(), reason: deriveHistoryReason(record.ledger) };
  // The pipeline needs the visitor's raw request while a run is active and
  // returns it to that visitor, but the public changelog must never retain it.
  // History uses plan.understoodIntent, which is the system-authored summary.
  const { changeRequest: _rawVisitorRequest, ...changelogRecord } = full;
  await kv.put(`changelog/${record.runId}`, JSON.stringify(changelogRecord)).catch(() => {});
  return full;
}

interface ChangeState {
  runId: string;
  changeRequest: string;
  currentSourceAtStart: string;
  budgetSpent: number;
  stageCosts: { stage: string; costUsd: number; wallTimeMs: number }[];
  questionAsked: boolean;
  planGateReplyCount: number;
  runStartedAt: number;
  // "errored" (this brief's fix): a stage threw -- a timeout, a network
  // error, anything -- partway through a call that was never reached by
  // one of the other halts below. Distinct from those: it isn't waiting on
  // a human DECISION, it's reporting a FAILURE, with whatever partial
  // progress (plan/implCode/etc, whichever of those had already been paid
  // for and completed) survives it, so a retry never re-pays for work
  // already done.
  stage: "awaiting-answer" | "awaiting-plan-decision" | "awaiting-review-decision" | "errored";
  // Optional, not required: an "errored" state reached before grounding
  // and planning ever completed has neither yet.
  plan?: ChangePlan;
  grounding?: GroundingResult;
  implCode?: string;
  verifyRegression?: TestResult[];
  verifyCriteria?: TestResult[];
  findings?: ReviewFinding[];
  /** Only set when stage === "errored". The exception's own message --
   * shown to the visitor plainly, not paraphrased. */
  errorMessage?: string;
  /** Only set when stage === "errored". Which named stage was in flight --
   * shown alongside errorMessage so the report reads "X failed: Y", not
   * just "something failed". */
  erroredAtStage?: string;
  /** Only set when stage === "errored". LAST.md item 1: "permanent" (a
   * 4xx, not 429) means retrying without a code change fails identically
   * -- a retry decision on a run in this state is refused server-side,
   * not just hidden client-side. */
  errorKind?: ErrorPermanence;
  /** Only set when stage === "errored". True once Gate 1 has been approved
   * for this run -- distinguishes "retry means re-ground-and-plan" from
   * "retry means resume implement/verify/fix/review", since both can leave
   * an errored state with a plan already attached. */
  erroredPastGate1?: boolean;
  /** Only set when stage === "errored" and no plan was produced yet. The
   * clarification text (a question answer, or a Gate 1 free-text reply)
   * that was in flight when groundAndPlan threw -- reused on retry instead
   * of silently dropping it and re-grounding against the bare original
   * request. */
  erroredClarification?: string | null;
}

interface CallBudget {
  spent: number;
  // FOUNDATION-2: which ceiling currently bounds this run -- starts at the
  // safe SOURCE_EDIT ceiling (ground/plan cost the same under either path,
  // and the path isn't known yet), flips to DATA_EDIT once plan.
  // implementationPath says so. A field on the shared budget object, not a
  // parameter threaded through every one of callAnthropic/callOpenAI's
  // call sites, since budget is already passed to all of them.
  ceilingUsd: number;
}

// reserve-before, reconcile-after (src/spendCounterDO.ts): the worst-case
// estimate is atomically committed to the DO-backed counter before fn()
// ever runs, closing the KV race a check-then-later-record shape had. On
// success the reservation is trued down to the real cost; on failure it's
// released back to 0 -- a failed call spent nothing, so nothing should
// stay reserved against it.
async function callAnthropic<T>(env: ChangeEnv, budget: CallBudget, estimateUsd: number, fn: () => Promise<T & { costUsd: number }>): Promise<T & { costUsd: number }> {
  await assertCircuitClosed(env.SPEND_KV, "anthropic" as Provider);
  assertUnderRunCeiling(budget.spent, estimateUsd, budget.ceilingUsd);
  await assertUnderPipelineSpendCap(env.SPEND_COUNTER, estimateUsd);
  try {
    const result = await fn();
    await recordProviderSuccess(env.SPEND_KV, "anthropic");
    await reconcilePipelineSpend(env.SPEND_COUNTER, estimateUsd, result.costUsd);
    budget.spent += result.costUsd;
    return result;
  } catch (e) {
    await recordProviderFailure(env.SPEND_KV, "anthropic");
    await reconcilePipelineSpend(env.SPEND_COUNTER, estimateUsd, 0);
    throw e;
  }
}

async function callOpenAI<T>(env: ChangeEnv, budget: CallBudget, estimateUsd: number, fn: () => Promise<T & { costUsd: number }>): Promise<T & { costUsd: number }> {
  await assertCircuitClosed(env.SPEND_KV, "openai" as Provider);
  assertUnderRunCeiling(budget.spent, estimateUsd, budget.ceilingUsd);
  await assertUnderPipelineSpendCap(env.SPEND_COUNTER, estimateUsd);
  try {
    const result = await fn();
    await recordProviderSuccess(env.SPEND_KV, "openai");
    await reconcilePipelineSpend(env.SPEND_COUNTER, estimateUsd, result.costUsd);
    budget.spent += result.costUsd;
    return result;
  } catch (e) {
    await recordProviderFailure(env.SPEND_KV, "openai");
    await reconcilePipelineSpend(env.SPEND_COUNTER, estimateUsd, 0);
    throw e;
  }
}

// 2000 truncated mid-JSON on the first real run (structured plans with
// several criteria, each carrying argsJson/expectedJson, run longer than
// a plain brief) -- found the same way the v1 implement-stage cap was
// found too small: by actually running it.
const PLAN_MAX_TOKENS = 4000;

const RETROSPECTIVE_MAX_TOKENS = 300;

// Priced against each stage's OWN routed model, not a blanket Opus
// worst-case -- FINISH.md section 5: "remove it from the worst-case
// estimates." This is what actually re-derives the two per-run ceilings
// (see CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT/_SOURCE_EDIT's own
// comment for the arithmetic); pricing every stage at Opus rates is why
// it used to have to be $0.35.
const WORST_CASE = {
  ground: (CONTROL_LIMITS.TOKEN_CAPS.ground / 1_000_000) * ANTHROPIC_PRICING[GROUND_MODEL].output,
  plan: (PLAN_MAX_TOKENS / 1_000_000) * ANTHROPIC_PRICING[DEFAULT_MODEL].output,
  implement: (CONTROL_LIMITS.TOKEN_CAPS.implement / 1_000_000) * ANTHROPIC_PRICING[IMPLEMENT_MODEL].output,
  review: (CONTROL_LIMITS.TOKEN_CAPS.review / 1_000_000) * OPENAI_PRICING[REVIEW_MODEL].output,
  fix: (CONTROL_LIMITS.TOKEN_CAPS.fix / 1_000_000) * ANTHROPIC_PRICING[FIX_MODEL].output,
  retrospective: (RETROSPECTIVE_MAX_TOKENS / 1_000_000) * ANTHROPIC_PRICING[RETROSPECTIVE_MODEL].output,
  // FOUNDATION-2 ("emit the change, not the file"): the data-edit path's
  // own, much smaller worst case -- same models as implement/fix, a
  // fraction of the token cap, since a WorldEdit is never a file.
  implementEdit: (CONTROL_LIMITS.TOKEN_CAPS.implementEdit / 1_000_000) * ANTHROPIC_PRICING[IMPLEMENT_MODEL].output,
  fixEdit: (CONTROL_LIMITS.TOKEN_CAPS.fixEdit / 1_000_000) * ANTHROPIC_PRICING[FIX_MODEL].output,
};

function stateKey(runId: string): string {
  return `change/state/${runId}`;
}
async function loadState(kv: KVNamespace, runId: string): Promise<ChangeState | null> {
  const raw = await kv.get(stateKey(runId));
  return raw ? (JSON.parse(raw) as ChangeState) : null;
}
async function saveState(kv: KVNamespace, state: ChangeState): Promise<void> {
  await kv.put(stateKey(state.runId), JSON.stringify(state), { expirationTtl: STATE_TTL_SEC });
}
async function clearState(kv: KVNamespace, runId: string): Promise<void> {
  await kv.delete(stateKey(runId)).catch(() => {});
}

/** Checks ONCE for a decision already recorded at `key` (via a decision
 * endpoint called separately, any time before this call). Never waits,
 * never loops, never times out into a default -- returns null if nothing
 * is there yet, and the caller halts.
 *
 * A sixth fail-open instance was found writing the systemic test for this
 * class of bug: a malformed record here used to throw an uncaught
 * JSON.parse exception straight out of the pipeline instead of being
 * treated the same as "no decision yet". Malformed and absent are the same
 * case -- both mean "no real decision exists" -- so both now return null
 * and leave the run halted rather than crashing the request. */
/**
 * Record a plan-gate decision, and the acknowledgement that goes with it.
 *
 * Lives here, next to the checkDecision that READS these keys, rather than
 * inline in the route, for two reasons. The writer and the reader now sit eight
 * lines apart, which is how the original defect -- a key the pipeline required
 * and nothing ever wrote -- stops being possible to introduce without noticing.
 * And src/index.ts imports `cloudflare:workers`, so a test that drives the
 * route cannot run under Node at all; the first version of that test worked
 * around this by re-typing the route's `if` inside the test body, which meant
 * deleting the route would not have failed it.
 *
 * The acknowledgement is a SEPARATE argument on purpose. Overruling grounding
 * has to be deliberate: a stale tab or a replayed decision carries `approve`,
 * not this.
 */
export async function recordPlanDecision(
  kv: KVNamespace,
  runId: string,
  approve: boolean,
  acknowledgeFalsePremise: boolean,
): Promise<void> {
  await kv.put(`change/plan-decision/${runId}`, JSON.stringify({ approve }), { expirationTtl: 600 });
  if (approve && acknowledgeFalsePremise) {
    await kv.put(`change/plan-decision-ack/${runId}`, JSON.stringify({ approve: true }), { expirationTtl: 600 });
  }
}

export async function checkDecision(kv: KVNamespace, key: string): Promise<"approve" | "reject" | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  await kv.delete(key).catch(() => {});
  try {
    const parsed = JSON.parse(raw) as { approve?: unknown };
    return parsed?.approve ? "approve" : "reject";
  } catch {
    return null;
  }
}
/** Same fail-closed contract as checkDecision, and the same defect was
 * found here too, in a more dangerous shape: a record present but missing
 * (or non-string) "answer" used to return `undefined`, which is not
 * `=== null` -- the caller's null-check would miss it and treat `undefined`
 * as a real answer, re-planning around the literal text "undefined" rather
 * than staying halted. Now any record that isn't a genuine non-empty
 * string answer reads as null, same as no record at all. */
export async function checkAnswer(kv: KVNamespace, key: string): Promise<string | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  await kv.delete(key).catch(() => {});
  try {
    const parsed = JSON.parse(raw) as { answer?: unknown };
    return typeof parsed?.answer === "string" && parsed.answer.length > 0 ? parsed.answer : null;
  } catch {
    return null;
  }
}

/**
 * FINAL.md item 2: "a stop action that actually halts the run" -- not a
 * client-side UI change while the server keeps spending. Reads and
 * immediately deletes the same kind of one-shot signal a gate decision
 * uses (change/stop/${runId}), so a stray leftover signal can never fire
 * twice. A single model call can't be aborted mid-flight from outside it
 * (bounded instead by STAGE_CALL_TIMEOUT_MS), so this is checked at every
 * stage boundary in runChangePipeline below, not inside one -- a stop
 * click halts the run before its NEXT paid call, never mid-call.
 */
export async function checkStopped(kv: KVNamespace, runId: string): Promise<boolean> {
  const raw = await kv.get(`change/stop/${runId}`);
  if (!raw) return false;
  await kv.delete(`change/stop/${runId}`).catch(() => {});
  return true;
}

function buildStoppedLedger(
  stageCosts: { stage: string; costUsd: number; wallTimeMs: number }[],
  budget: CallBudget,
  questionAsked: boolean,
  planGateReplyCount: number,
  runStartedAt: number,
  planGateDecision: ChangeLedger["planGateDecision"] = "not-reached",
): ChangeLedger {
  return {
    outcome: "stopped",
    totalCostUsd: budget.spent,
    stageCosts,
    reviewFoundMaterial: 0,
    reviewFoundNits: 0,
    fixApplied: false,
    fixHeld: null,
    planGateDecision,
    reviewGateDecision: "not-needed",
    questionAsked,
    planGateReplyCount,
    totalWallTimeMs: Date.now() - runStartedAt,
    // No retrospective call for a stop -- the visitor just asked spending
    // to stop; running one more model call to reflect on that would
    // contradict the request in the same motion as honoring it.
    retrospectiveLesson: null,
    lessonRecurrenceCount: null,
  };
}

export interface ChangeEnv {
  LOADER: import("./sandbox").LoaderBinding;
  SPEND_KV: KVNamespace;
  SPEND_COUNTER: DurableObjectNamespace;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
}

function haltLedger(
  state: Pick<ChangeState, "stageCosts" | "budgetSpent" | "questionAsked" | "planGateReplyCount" | "runStartedAt">,
  waitingOn: "answer" | "plan-decision" | "review-decision" | "error-decision",
): ChangeLedger {
  const outcome =
    waitingOn === "answer" ? "halted-awaiting-answer"
    : waitingOn === "plan-decision" ? "halted-awaiting-plan-decision"
    : waitingOn === "review-decision" ? "halted-awaiting-review-decision"
    : "halted-awaiting-error-decision";
  return {
    outcome,
    totalCostUsd: state.budgetSpent,
    stageCosts: state.stageCosts,
    reviewFoundMaterial: 0,
    reviewFoundNits: 0,
    fixApplied: false,
    fixHeld: null,
    planGateReplyCount: state.planGateReplyCount,
    planGateDecision: waitingOn === "answer" || waitingOn === "plan-decision" ? "pending" : "approve",
    reviewGateDecision: waitingOn === "review-decision" ? "pending" : "not-needed",
    questionAsked: state.questionAsked,
    totalWallTimeMs: Date.now() - state.runStartedAt,
    // A halted run isn't finished -- there's nothing to retrospect on yet.
    retrospectiveLesson: null,
    lessonRecurrenceCount: null,
  };
}

/** Same shape as buildStoppedLedger, for the "abandon" branch of an
 * error-decision -- a visitor choosing not to retry after a stage failed
 * is the same terminal shape as a visitor choosing to stop, just reached
 * from a different halt. */
function buildAbandonedAfterErrorLedger(
  stageCosts: { stage: string; costUsd: number; wallTimeMs: number }[],
  budget: CallBudget,
  questionAsked: boolean,
  planGateReplyCount: number,
  runStartedAt: number,
  planGateDecision: ChangeLedger["planGateDecision"] = "not-reached",
): ChangeLedger {
  return {
    outcome: "abandoned-after-error",
    totalCostUsd: budget.spent,
    stageCosts,
    reviewFoundMaterial: 0,
    reviewFoundNits: 0,
    fixApplied: false,
    fixHeld: null,
    // Passed in, not assumed. Hardcoding "not-reached" fixed the old wrong
    // answer ("approve" for a gate nobody reached) by introducing the opposite
    // wrong answer: a run that errored AFTER a human approved the plan, and was
    // then abandoned, said the plan gate was never reached. The caller knows
    // which it was.
    planGateDecision,
    reviewGateDecision: "not-needed",
    questionAsked,
    planGateReplyCount,
    totalWallTimeMs: Date.now() - runStartedAt,
    retrospectiveLesson: null,
    lessonRecurrenceCount: null,
  };
}

const INSTRUCTIONS_KEY = "change/instructions";
const INSTRUCTIONS_MAX = 20;

/** The persistent instructions file BUILD-V2.md asks for: a short, capped
 * list of lessons extracted from past runs, given back to the plan,
 * implement, review, and fix stages on every subsequent run. */
export async function loadInstructions(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get(INSTRUCTIONS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function appendInstruction(kv: KVNamespace, lesson: string): Promise<void> {
  const existing = await loadInstructions(kv);
  if (existing.includes(lesson)) return;
  const updated = [...existing, lesson].slice(-INSTRUCTIONS_MAX);
  await kv.put(INSTRUCTIONS_KEY, JSON.stringify(updated));
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Recurrence is tracked by exact lesson text, not fuzzy similarity -- an
 * honest, checkable measure rather than a semantic-match guess. BUILD-V2.md:
 * "report the number when there is data behind it" -- most counts will be 1
 * (first occurrence) until the same lesson is independently re-derived on a
 * later run, which is itself the signal worth surfacing. */
async function recordLessonOccurrence(kv: KVNamespace, lesson: string): Promise<number> {
  const key = `change/lesson-count/${await sha256Hex(lesson)}`;
  const raw = await kv.get(key);
  const count = (raw ? parseInt(raw, 10) : 0) + 1;
  await kv.put(key, String(count));
  return count;
}

/**
 * Runs once per TERMINAL outcome (never for a halted run -- it isn't
 * finished). Extracts at most one lesson, appends it to the persistent
 * instructions file, and records its recurrence count. A null lesson is a
 * valid, common outcome and is neither stored nor counted.
 */
async function runRetrospectiveAndRecord(
  env: ChangeEnv,
  budget: CallBudget,
  stageCosts: { stage: string; costUsd: number; wallTimeMs: number }[],
  runSummary: string,
): Promise<{ lesson: string | null; recurrenceCount: number | null }> {
  const retro = await callAnthropic(env, budget, WORST_CASE.retrospective, () => runRetrospective(env.ANTHROPIC_API_KEY, runSummary, RETROSPECTIVE_MAX_TOKENS, RETROSPECTIVE_MODEL));
  stageCosts.push({ stage: "retrospective", costUsd: retro.costUsd, wallTimeMs: retro.wallTimeMs });
  let recurrenceCount: number | null = null;
  if (retro.lesson) {
    await appendInstruction(env.SPEND_KV, retro.lesson);
    recurrenceCount = await recordLessonOccurrence(env.SPEND_KV, retro.lesson);
  }
  return { lesson: retro.lesson, recurrenceCount };
}

/**
 * Runs (or resumes) one change-request pipeline. Idempotent to call again
 * with the same runId: if a prior call halted waiting on a human, this
 * checks once for that decision and either continues from exactly there or
 * halts again, unchanged. Never polls, never times out into proceeding.
 */
export async function runChangePipeline(env: ChangeEnv, runId: string, changeRequest: string, onEvent: (e: ChangeEvent) => void, leaseToken?: string | null): Promise<ChangeRecord> {
  const existing = await loadState(env.SPEND_KV, runId);
  const budget: CallBudget = {
    spent: existing?.budgetSpent ?? 0,
    // Safe default until plan.implementationPath is known -- ground and
    // plan cost the same either way, so checking them against the wider
    // ceiling is correct here, not just a placeholder.
    ceilingUsd: existing?.plan?.implementationPath === "data-edit" ? CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT : CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT,
  };
  const stageCosts = existing?.stageCosts ?? [];
  const runStartedAt = existing?.runStartedAt ?? Date.now();
  let authoritativeSource: string | null = null;
  if (!existing?.currentSourceAtStart) {
    if (env.SPEND_COUNTER) {
      try {
        const id = env.SPEND_COUNTER.idFromName("global");
        const stub = env.SPEND_COUNTER.get(id);
        const res = await stub.fetch("https://spend-counter.internal/get-source");
        if (res.ok) {
          const data = (await res.json()) as { source: string | null };
          // A null source is not a failure: it is the coordinator saying, on
          // the record, "nothing has been published yet" -- in which case the
          // baseline IS the live world and grounding against it is true. That
          // is a different thing from not being able to reach the coordinator
          // (thrown above) or from an empty answer of unknown meaning (refused
          // below), and collapsing the three was the original defect.
          authoritativeSource = data.source ?? SIM_BASELINE_SOURCE;
        } else {
          throw new PipelineLimitError("concurrency", "Source coordinator unavailable to provide canonical baseline.");
        }
      } catch (err) {
        if (err instanceof PipelineLimitError) throw err;
        throw new PipelineLimitError("concurrency", `Source coordinator connection failure: ${(err as Error).message || "network error"}`);
      }
    } else {
      authoritativeSource = (await env.SPEND_KV.get("sim/current-source")) ?? SIM_BASELINE_SOURCE;
    }
  }
  // NO THIRD FALLBACK.
  //
  // This ended `?? SIM_BASELINE_SOURCE`. Every branch above already either sets
  // authoritativeSource or throws, so the fallback is unreachable in the
  // deployed Worker -- but "unreachable" is a property of today's control flow,
  // not a guarantee, and what it would do if it ever were reached is ground a
  // run against the ORIGINAL world while telling the visitor it is grounding
  // against the current one. Silently substituting a different world is the
  // precise failure this pipeline exists to refuse, so it now refuses.
  // `||`, not `??`, and deliberately: the branch above tests
  // `!existing?.currentSourceAtStart`, which treats an EMPTY saved source as
  // unset and goes and fetches the real one. Using `??` here would then hand
  // that empty string back and discard what was just fetched -- the two checks
  // have to agree about what "no source" means or the fetch is wasted.
  const resolvedSource = existing?.currentSourceAtStart || authoritativeSource;
  if (typeof resolvedSource !== "string" || resolvedSource.length === 0) {
    throw new PipelineLimitError(
      "concurrency",
      "Could not establish which version of the world this run starts from. Refusing rather than grounding against a world that may not be the live one.",
    );
  }
  const currentSourceAtStart: string = resolvedSource;
  let questionAsked = existing?.questionAsked ?? false;
  let planGateReplyCount = existing?.planGateReplyCount ?? 0;
  const priorLessons = (await loadInstructions(env.SPEND_KV)).map((l) => `- ${l}`).join("\n");
  // FOUNDATION-2 item 4: which named stage is currently in flight, kept up
  // to date at every stage boundary below so a thrown error (a timeout,
  // anything) can be reported and checkpointed against the right label
  // rather than a generic "something failed".
  let inFlightStage = "ground+plan";
  // Declared here, ABOVE the try block below, on purpose: TypeScript block-
  // scopes `let`, and the catch block that reports/checkpoints a thrown
  // error needs to read whatever value each of these last held, however
  // far the run got before failing. If these were declared inside the try
  // (where they're actually assigned), the catch block simply couldn't see
  // them.
  let plan: ChangePlan | undefined;
  let grounding: GroundingResult | undefined;
  let lastClarification: string | null = null;
  let implCode: string | undefined;
  let verifyRegression: TestResult[] | undefined;
  let verifyCriteria: TestResult[] | undefined;
  let verifyFatalError: string | undefined;
  let convergenceFixAttempts = 0;
  let convergenceRejectionReason: string | undefined;
  let findings: ReviewFinding[] | undefined;
  // Also hoisted above the try for the same reason: read by the catch
  // block. pastPlanGate itself only depends on `existing` (safe to compute
  // this early); pastGate1Approved starts mirroring it and flips true for
  // real once this attempt passes Gate 1 (see "Plan approved" below).
  const pastPlanGate = existing?.stage === "awaiting-review-decision" || (existing?.stage === "errored" && existing.erroredPastGate1 === true);
  let pastGate1Approved = pastPlanGate;

  // A run that errored out mid-stage halts here exactly like every other
  // gate below: it does NOT retry on its own just because this function
  // got called again (a stray reconnect must never silently re-spend) --
  // it waits for an explicit decision, checked once, same contract as
  // checkAnswer/checkDecision everywhere else in this file. "retry" falls
  // through to the normal flow below, which -- via pastPlanGate and the
  // no-plan-yet check just below -- resumes from whatever was already
  // paid for and completed, never from scratch. "abandon" ends the run,
  // same terminal shape as a stop.
  if (existing?.stage === "errored") {
    const decision = await checkDecision(env.SPEND_KV, `change/error-decision/${runId}`);
    if (decision === "reject") {
      await clearState(env.SPEND_KV, runId);
      const ledger = buildAbandonedAfterErrorLedger(
        stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt,
        pastGate1Approved ? "approve" : "not-reached",
      );
      onEvent({ type: "stopped" });
      onEvent({ type: "ledger", ledger });
      return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan: existing.plan ?? null, finalCode: null, findings: existing.findings ?? [], ledger });
    }
    // LAST.md item 1: "stop retrying permanent errors... do not burn the
    // clock re-sending a request the API has already rejected." A
    // permanent error is refused here server-side, not just left unoffered
    // by the client -- even an "approve" decision (retry) does not
    // re-attempt the doomed call. Same halt, same message, zero new spend,
    // instead of a fifth identical 400.
    if (decision === "approve" && existing.errorKind === "permanent") {
      const message = `${existing.errorMessage ?? "unknown error"} (this is a permanent request error -- retrying without a code change will fail identically; abandon this run instead)`;
      onEvent({ type: "stage-error", runId, erroredAtStage: existing.erroredAtStage ?? "unknown", errorMessage: message, costSoFarUsd: budget.spent, errorKind: "permanent" });
      onEvent({ type: "halted", runId, waitingOn: "error-decision" });
      const ledger = haltLedger(existing, "error-decision");
      onEvent({ type: "ledger", ledger });
      // Not terminal -- still parked, waiting on a real decision -- so this
      // never gets logged to history. completedAt/reason are placeholders,
      // never read (nothing downstream of a halt return serializes it).
      return { runId, changeRequest, plan: existing.plan ?? null, finalCode: null, findings: existing.findings ?? [], ledger, completedAt: 0, reason: "" };
    }
    if (decision === null) {
      onEvent({ type: "stage-error", runId, erroredAtStage: existing.erroredAtStage ?? "unknown", errorMessage: existing.errorMessage ?? "unknown error", costSoFarUsd: budget.spent, errorKind: existing.errorKind ?? "transient" });
      onEvent({ type: "halted", runId, waitingOn: "error-decision" });
      const ledger = haltLedger(existing, "error-decision");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan: existing.plan ?? null, finalCode: null, findings: existing.findings ?? [], ledger, completedAt: 0, reason: "" };
    }
    // decision === "approve" && errorKind !== "permanent" -- fall through into the normal flow.
  }

  try {

  // ---- Stage 0+1: Ground, then plan (FINISH.md chunk 7) ----
  // Grounding no longer hard-stops the run by itself -- it feeds directly
  // into the plan prompt (so the plan can honestly scope around a false
  // premise instead of silently trying anyway) and is shown to the visitor
  // alongside the plan at ONE Gate 1, where a human decides. `label` names
  // the stage-cost entries so repeated ground+plan rounds (after a
  // question, or after a Gate 1 reply) are distinguishable in the ledger.
  async function groundAndPlan(clarification: string | null, label: string): Promise<{ grounding: GroundingResult; plan: ChangePlan }> {
    inFlightStage = "ground+plan";
    lastClarification = clarification;
    onEvent({ type: "grounding" });
    const groundResult = await callAnthropic(env, budget, WORST_CASE.ground, () => groundRequest(env.ANTHROPIC_API_KEY, changeRequest, GROUND_MODEL, CONTROL_LIMITS.TOKEN_CAPS.ground, currentSourceAtStart));
    stageCosts.push({ stage: `ground${label}`, costUsd: groundResult.costUsd, wallTimeMs: groundResult.wallTimeMs });
    onEvent({ type: "grounded", result: groundResult.result, model: groundResult.model, inputTokens: groundResult.inputTokens, outputTokens: groundResult.outputTokens, costUsd: groundResult.costUsd, wallTimeMs: groundResult.wallTimeMs });

    onEvent({ type: "planning" });
    const planResult = await callAnthropic(env, budget, WORST_CASE.plan, () =>
      generatePlan(env.ANTHROPIC_API_KEY, currentSourceAtStart, regressionSummaryText(), changeRequest, clarification, PLAN_MAX_TOKENS, priorLessons, formatGroundingForPlan(groundResult.result)),
    );
    stageCosts.push({ stage: `plan${label}`, costUsd: planResult.costUsd, wallTimeMs: planResult.wallTimeMs });
    onEvent({ type: "planned", plan: planResult.plan, model: planResult.model, inputTokens: planResult.inputTokens, outputTokens: planResult.outputTokens, costUsd: planResult.costUsd, wallTimeMs: planResult.wallTimeMs });
    return { grounding: groundResult.result, plan: planResult.plan };
  }

  if (!existing || (existing.stage === "errored" && !existing.plan)) {
    ({ grounding, plan } = await groundAndPlan(existing?.erroredClarification ?? null, ""));

    if (plan.question) {
      questionAsked = true;
      onEvent({ type: "question", runId, question: plan.question });
      const state: ChangeState = { runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, planGateReplyCount, runStartedAt, stage: "awaiting-answer", plan, grounding };
      await saveState(env.SPEND_KV, state);
      onEvent({ type: "halted", runId, waitingOn: "answer" });
      const ledger = haltLedger(state, "answer");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan, finalCode: null, findings: [], ledger, completedAt: 0, reason: "" };
    }
  } else if (existing.stage === "awaiting-answer") {
    const answer = await checkAnswer(env.SPEND_KV, `change/answer/${runId}`);
    if (answer === null) {
      // Only reached here when no real answer was found -- a real answer
      // always wins over a stray stop signal, never the other way round.
      if (await checkStopped(env.SPEND_KV, runId)) {
        await clearState(env.SPEND_KV, runId);
        const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt);
        onEvent({ type: "stopped" });
        onEvent({ type: "ledger", ledger });
        return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan: existing.plan ?? null, finalCode: null, findings: [], ledger });
      }
      onEvent({ type: "halted", runId, waitingOn: "answer" });
      const ledger = haltLedger(existing, "answer");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan: existing.plan ?? null, finalCode: null, findings: [], ledger, completedAt: 0, reason: "" };
    }
    onEvent({ type: "answered", answer });
    ({ grounding, plan } = await groundAndPlan(answer, " (re-ground + re-plan after question)"));
  } else {
    plan = existing.plan;
    grounding = existing.grounding;
  }
  // Every branch above either assigns plan/grounding, or returns out of
  // this function entirely (the question-halt return above) -- this is a
  // real runtime safety net, not just a type-narrowing trick, since it's
  // the one place that would catch a future branch added here that forgets
  // to do either.
  if (!plan || !grounding) throw new Error("internal error: plan/grounding not established before Gate 1");
  // The path is known now -- switch to the ceiling that actually bounds
  // it for every remaining call in this run (implement/fix/review/
  // retrospective). Re-derived on every call into this function (not
  // cached across resumes) so a retried run always checks against the
  // right ceiling even if it's resuming mid-pipeline.
  budget.ceilingUsd = plan.implementationPath === "data-edit" ? CONTROL_LIMITS.PER_RUN_CEILING_USD_DATA_EDIT : CONTROL_LIMITS.PER_RUN_CEILING_USD_SOURCE_EDIT;

  // ---- Stage 1.5: Gate 1 -- grounding + plan + criteria + cost, shown
  // together as one conversational moment (FINISH.md chunk 7). Three
  // outcomes checked each call: a decision (approve/reject), a free-text
  // reply (re-grounds + re-plans, then re-halts at this SAME gate with the
  // new plan -- looped, not recursive, so any number of replies works),
  // or neither (halt). Bug found by actually running a resume from
  // "awaiting-review-decision": this block used to only check the
  // plan-decision key when the resume state's stage was
  // "awaiting-plan-decision" or "awaiting-answer" (or on a fresh run) --
  // any OTHER stage fell through neither branch, silently discarding that
  // the plan had already been approved. The correct check is the inverse:
  // skip this gate entirely once we know we're past it.
  let planDecision: "approve" | "reject" | null = pastPlanGate ? "approve" : null;
  if (!pastPlanGate) {
    while (true) {
      planDecision = await checkDecision(env.SPEND_KV, `change/plan-decision/${runId}`);
      if (planDecision !== null) break;
      const reply = await checkAnswer(env.SPEND_KV, `change/plan-reply/${runId}`);
      if (reply === null) break; // neither a decision nor a reply -- halt below
      planGateReplyCount++;
      onEvent({ type: "plan-gate-replied", reply });
      ({ grounding, plan } = await groundAndPlan(reply, ` (re-ground + re-plan after Gate 1 reply #${planGateReplyCount})`));
      // loop back around: check for a decision on THIS new plan, or another reply
    }
  }

  if (planDecision === null) {
    // Only reached with no real decision or reply found -- same priority
    // rule as the question gate above: a real decision always wins.
    if (await checkStopped(env.SPEND_KV, runId)) {
      await clearState(env.SPEND_KV, runId);
      const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt);
      onEvent({ type: "stopped" });
      onEvent({ type: "ledger", ledger });
      return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
    }
    onEvent({ type: "plan-gate", runId, plan, grounding, costEstimateUsd: budget.spent, budgetRemainingUsd: Math.max(0, budget.ceilingUsd - budget.spent) });
    const state: ChangeState = { runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, planGateReplyCount, runStartedAt, stage: "awaiting-plan-decision", plan, grounding };
    await saveState(env.SPEND_KV, state);
    onEvent({ type: "halted", runId, waitingOn: "plan-decision" });
    const ledger = haltLedger(state, "plan-decision");
    onEvent({ type: "ledger", ledger });
    return { runId, changeRequest, plan, finalCode: null, findings: [], ledger, completedAt: 0, reason: "" };
  }
  // A FALSE PREMISE CANNOT BE WAVED THROUGH SILENTLY.
  //
  // The browser withholds auto-approve when grounding says a premise fails --
  // but that was the ONLY place it was enforced, and it is client-side. Any
  // other client, a stale tab, a script, or a replayed decision could post
  // `approve` and a plan resting on something untrue would run end to end and
  // ship. The check that carried the whole "we tell you when your request is
  // built on something false" claim lived in a checkbox.
  //
  // A human may still overrule grounding -- that is what the gate is for --
  // but it now has to be deliberate: the decision must carry an explicit
  // acknowledgement, and an unacknowledged approval on a false premise is
  // refused rather than obeyed.
  if (planDecision === "approve" && grounding && grounding.premisesHold === false && !pastPlanGate) {
    const acknowledged = await checkDecision(env.SPEND_KV, `change/plan-decision-ack/${runId}`);
    if (acknowledged !== "approve") {
      await clearState(env.SPEND_KV, runId);
      const reason = grounding.falsePremises.length
        ? `this rests on something that isn't true: ${grounding.falsePremises[0]}`
        : "grounding found the request rests on a false premise";
      const ledger: ChangeLedger = {
        outcome: "refused-plan", totalCostUsd: budget.spent, stageCosts,
        reviewFoundMaterial: 0, reviewFoundNits: 0, fixApplied: false, fixHeld: null,
        planGateDecision: "reject", reviewGateDecision: "not-needed", questionAsked,
        planGateReplyCount, totalWallTimeMs: Date.now() - runStartedAt,
        retrospectiveLesson: null, lessonRecurrenceCount: 0,
      };
      onEvent({ type: "refused", reason });
      onEvent({ type: "ledger", ledger });
      return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
    }
  }

  if (!pastPlanGate) onEvent({ type: "plan-gate-decided", decision: planDecision });

  if (planDecision === "reject") {
    await clearState(env.SPEND_KV, runId);
    const { lesson, recurrenceCount } = await runRetrospectiveAndRecord(
      env, budget, stageCosts,
      `Change request: ${changeRequest}\nPlan proposed: ${plan.willBuild}\nOutcome: the visitor rejected the plan before any code was written.`,
    );
    onEvent({ type: "retrospective", lesson, recurrenceCount, costUsd: stageCosts[stageCosts.length - 1].costUsd });
    const ledger: ChangeLedger = {
      outcome: "refused-plan",
      totalCostUsd: budget.spent,
      stageCosts,
      reviewFoundMaterial: 0,
      reviewFoundNits: 0,
      fixApplied: false,
      fixHeld: null,
      planGateDecision: "reject",
      reviewGateDecision: "not-needed",
      questionAsked,
      planGateReplyCount,
      totalWallTimeMs: Date.now() - runStartedAt,
      retrospectiveLesson: lesson,
      lessonRecurrenceCount: recurrenceCount,
    };
    onEvent({ type: "ledger", ledger });
    return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
  }
  pastGate1Approved = true;

  // Plan approved -- about to spend on implement/verify/fix/review, all in
  // this one call. Checked here so a stop clicked right after approving
  // Gate 1 (before any of that starts) is honored instead of ignored.
  if (await checkStopped(env.SPEND_KV, runId)) {
    await clearState(env.SPEND_KV, runId);
    const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt, "approve");
    onEvent({ type: "stopped" });
    onEvent({ type: "ledger", ledger });
    return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
  }

  // ---- Stages 2-3: implement, then verify -> fix loop TO CONVERGENCE --
  // or resume straight to the review gate ----
  //
  // FINAL.md item 1: the real process this models runs implement-and-verify
  // to convergence first, and calls the reviewer once, at the end, on a
  // diff that already passes its own checks. The previous shape called the
  // reviewer right after the FIRST verify, gated only on whether the
  // sandbox loaded at all -- not on whether anything actually passed. Found
  // independently on run 823decc7: 8/9 regression and 2/8 criteria failing,
  // reviewed anyway. This loop fixes that: it retries verification failures
  // (not reviewer findings -- reviewer findings still get their own,
  // separate, human-gated fix round after review, unchanged below) up to
  // MAX_FIX_ATTEMPTS times, and NEVER calls the reviewer unless every
  // regression case and every proposed criterion passes with no fatal
  // sandbox error. If it can't get there, it refuses and reports exactly
  // what's still failing -- without spending a cent on a review of code
  // already known to be broken.

  // (existing.stage === "awaiting-review-decision") is the pre-existing
  // success-path halt; (existing.stage === "errored" && ...findings) is
  // this brief's addition -- a retry after a failure that happened AFTER
  // review already completed (e.g. during the post-review fix). Both mean
  // the same thing: everything through review is already paid for and
  // done, reuse all of it.
  if (
    (existing?.stage === "awaiting-review-decision" || existing?.stage === "errored") &&
    existing.implCode && existing.verifyRegression && existing.verifyCriteria && existing.findings
  ) {
    implCode = existing.implCode;
    verifyRegression = existing.verifyRegression;
    verifyCriteria = existing.verifyCriteria;
    findings = existing.findings;
  } else {
    // A retry after a failure during verify/fix-loop/review: implement
    // already succeeded and was checkpointed, so reuse its (expensive,
    // measured at 80s+) output instead of paying for it again.
    if (existing?.stage === "errored" && existing.implCode) {
      implCode = existing.implCode;
    } else {
      inFlightStage = "implement";
      onEvent({ type: "implementing" });
      // FOUNDATION-2 ("emit the change, not the file"): the plan already
      // decided, at Gate 1, which path this run takes -- implement doesn't
      // choose again here, it just executes the decision the visitor saw
      // and approved.
      const impl = plan!.implementationPath === "data-edit"
        ? await callAnthropic(env, budget, WORST_CASE.implementEdit, () =>
            implementChangeAsEdit(env.ANTHROPIC_API_KEY, currentSourceAtStart, plan!, changeRequest, IMPLEMENT_MODEL, CONTROL_LIMITS.TOKEN_CAPS.implementEdit, priorLessons),
          )
        : await callAnthropic(env, budget, WORST_CASE.implement, () =>
            implementChange(env.ANTHROPIC_API_KEY, currentSourceAtStart, plan!, changeRequest, IMPLEMENT_MODEL, CONTROL_LIMITS.TOKEN_CAPS.implement, priorLessons),
          );
      stageCosts.push({ stage: `implement (${plan!.implementationPath})`, costUsd: impl.costUsd, wallTimeMs: impl.wallTimeMs });
      onEvent({ type: "implemented", model: impl.model, inputTokens: impl.inputTokens, outputTokens: impl.outputTokens, costUsd: impl.costUsd, wallTimeMs: impl.wallTimeMs, code: impl.code });
      implCode = impl.code;
    }

    inFlightStage = "verify";
    onEvent({ type: "verifying" });
    const verify1 = await runVerification(env, implCode, plan.criteria, currentSourceAtStart, `change-${runId}-1`, plan!.implementationPath === "data-edit");
    verifyRegression = verify1.regression.results;
    verifyCriteria = verify1.criteria.results;
    // validate-before-consume: a sandbox that failed to even load the code
    // (a fatalError) is not "0 failures" -- it's "verification didn't run".
    // Found the hard way: an HTML-wrapped implementation failed to load as
    // a module, and with no check here that silently read as a clean pass.
    verifyFatalError = verify1.regression.fatalError ?? verify1.criteria.fatalError;
    onEvent({
      type: "verified",
      regression: verifyRegression,
      criteria: verifyCriteria,
      regressionPassed: verifyRegression.filter((r) => r.pass).length,
      regressionTotal: verifyRegression.length,
      criteriaPassed: verifyCriteria.filter((r) => r.pass).length,
      criteriaTotal: verifyCriteria.length,
      fatalError: verifyFatalError,
    });

    // A fatal sandbox error can never be fixed by asking the same model to
    // patch its own output blind -- there's no code to point the fix at
    // yet, only a load failure -- so it skips the convergence loop and
    // refuses immediately, same as before.
    while (
      !verifyFatalError &&
      decideStillFailing(verifyFatalError, verifyRegression, verifyCriteria) &&
      convergenceFixAttempts < CONTROL_LIMITS.MAX_FIX_ATTEMPTS
    ) {
      if (await checkStopped(env.SPEND_KV, runId)) {
        await clearState(env.SPEND_KV, runId);
        const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt, "approve");
        onEvent({ type: "stopped" });
        onEvent({ type: "ledger", ledger });
        return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
      }
      convergenceFixAttempts++;
      inFlightStage = `fix (convergence attempt ${convergenceFixAttempts})`;
      onEvent({ type: "fixing" });
      const verificationFailures = [
        ...verifyRegression.filter((r) => !r.pass).map((r) => describeFailure("regression", r)),
        ...verifyCriteria.filter((r) => !r.pass).map((r) => describeFailure("criterion", r)),
      ];
      const stillPassing = [
        ...verifyRegression.filter((r) => r.pass).map((r) => describePassing("regression", r)),
        ...verifyCriteria.filter((r) => r.pass).map((r) => describePassing("criterion", r)),
      ];
      // No reviewer findings exist yet at this point in the run -- this
      // fix round is repairing verification failures only, so the
      // materialFindings argument is empty on purpose.
      const fix = plan!.implementationPath === "data-edit"
        ? await callAnthropic(env, budget, WORST_CASE.fixEdit, () =>
            fixChangeAsEdit(env.ANTHROPIC_API_KEY, plan!, implCode!, [], FIX_MODEL, CONTROL_LIMITS.TOKEN_CAPS.fixEdit, verificationFailures, stillPassing, priorLessons),
          )
        : await callAnthropic(env, budget, WORST_CASE.fix, () =>
            fixChange(env.ANTHROPIC_API_KEY, currentSourceAtStart, plan!, implCode!, [], FIX_MODEL, CONTROL_LIMITS.TOKEN_CAPS.fix, verificationFailures, stillPassing, priorLessons),
          );
      stageCosts.push({ stage: `fix (${plan!.implementationPath}, convergence attempt ${convergenceFixAttempts})`, costUsd: fix.costUsd, wallTimeMs: fix.wallTimeMs });
      if (fix.rejectionReason) {
        convergenceRejectionReason = fix.rejectionReason;
        break;
      }
      implCode = fix.code;
      onEvent({ type: "fixed", model: fix.model, inputTokens: fix.inputTokens, outputTokens: fix.outputTokens, costUsd: fix.costUsd, wallTimeMs: fix.wallTimeMs, code: implCode });

      onEvent({ type: "verifying" });
      const reverify = await runVerification(env, implCode, plan.criteria, currentSourceAtStart, `change-${runId}-conv${convergenceFixAttempts}`, plan!.implementationPath === "data-edit");
      verifyRegression = reverify.regression.results;
      verifyCriteria = reverify.criteria.results;
      verifyFatalError = reverify.regression.fatalError ?? reverify.criteria.fatalError;
      onEvent({
        type: "verified",
        regression: verifyRegression,
        criteria: verifyCriteria,
        regressionPassed: verifyRegression.filter((r) => r.pass).length,
        regressionTotal: verifyRegression.length,
        criteriaPassed: verifyCriteria.filter((r) => r.pass).length,
        criteriaTotal: verifyCriteria.length,
        fatalError: verifyFatalError,
      });
    }

    if (decideStillFailing(verifyFatalError, verifyRegression, verifyCriteria)) {
      // Refuse without ever calling the reviewer -- reviewing code that's
      // still failing its own checks would spend real money on an opinion
      // about work that was never ready, and demonstrate the opposite of
      // what this page claims.
      await clearState(env.SPEND_KV, runId);
      const stillFailingList = [
        ...verifyRegression.filter((r) => !r.pass).map((r) => describeFailure("regression", r)),
        ...verifyCriteria.filter((r) => !r.pass).map((r) => describeFailure("criterion", r)),
      ];
      const convergenceReason = convergenceRejectionReason ?? (verifyFatalError
        ? `verification could not run: ${verifyFatalError}`
        : `could not make every regression and criteria check pass within ${convergenceFixAttempts} fix attempt(s) (limit ${CONTROL_LIMITS.MAX_FIX_ATTEMPTS}) -- still failing: ${stillFailingList.join("; ") || "none listed"}`);
      const { lesson, recurrenceCount } = await runRetrospectiveAndRecord(
        env, budget, stageCosts,
        `Change request: ${changeRequest}\nPlan: ${plan.willBuild}\nOutcome: the implementation never converged before review -- ${convergenceReason}.`,
      );
      onEvent({ type: "retrospective", lesson, recurrenceCount, costUsd: stageCosts[stageCosts.length - 1].costUsd });
      const ledger: ChangeLedger = {
        outcome: "refused-verification",
        totalCostUsd: budget.spent,
        stageCosts,
        reviewFoundMaterial: 0,
        reviewFoundNits: 0,
        fixApplied: convergenceFixAttempts > 0,
        fixHeld: false,
        planGateDecision: "approve",
        reviewGateDecision: "not-needed",
        questionAsked,
        planGateReplyCount,
        totalWallTimeMs: Date.now() - runStartedAt,
        retrospectiveLesson: lesson,
        lessonRecurrenceCount: recurrenceCount,
      };
      onEvent({ type: "refused", reason: convergenceReason });
      onEvent({ type: "ledger", ledger });
      return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
    }

    // Explicit gate, asserted in code, not just implied by the loop above:
    // review is never entered except on verification that has actually
    // converged. Throwing here (rather than trusting the loop's exit
    // condition) means a future edit to the loop that breaks its own exit
    // logic fails loud instead of quietly sending broken code to review.
    assertConvergedForReview(verifyFatalError, verifyRegression, verifyCriteria);

    // SHIP.md item 1: the only checkStopped() gap that mattered in
    // practice. Every OTHER real paid call is preceded by a check (ground,
    // plan, implement, each fix-loop iteration) -- but a run whose
    // implement+verify converged on the FIRST try never enters the
    // fix-loop's while body at all, so its checkStopped() (above) never
    // runs either. That let a stop clicked during "Implementing" or
    // "Verifying" sail straight through, unhonored, into a real paid
    // review call. Reproduced by tracing every checkStopped() call site
    // against every stage the "running" bar offers a Stop button for --
    // this was the one stretch with no checkpoint at all.
    if (await checkStopped(env.SPEND_KV, runId)) {
      await clearState(env.SPEND_KV, runId);
      const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt, "approve");
      onEvent({ type: "stopped" });
      onEvent({ type: "ledger", ledger });
      return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings: [], ledger });
    }

    inFlightStage = "review";
    onEvent({ type: "reviewing" });
    const review = await callOpenAI(env, budget, WORST_CASE.review, () =>
      reviewArtifact(
        env.OPENAI_API_KEY,
        REVIEW_MODEL,
        `Plan:\nWill build: ${plan!.willBuild}\nWill not touch: ${plan!.willNotTouch}\nCriteria:\n${plan!.criteria.map((c) => `- ${c.description}`).join("\n")}`,
        `Change request: ${changeRequest}\n\nOriginal source:\n${currentSourceAtStart}`,
        implCode!,
        CONTROL_LIMITS.TOKEN_CAPS.review,
        priorLessons,
      ),
    );
    stageCosts.push({ stage: "review", costUsd: review.costUsd, wallTimeMs: review.wallTimeMs });
    findings = parseFindings(review.text);
    onEvent({ type: "reviewed", model: review.model, inputTokens: review.inputTokens, outputTokens: review.outputTokens, costUsd: review.costUsd, wallTimeMs: review.wallTimeMs, reviewText: review.text, findings });
  }
  // Same real safety net as the plan/grounding guard above: every branch
  // through implement/verify/fix/review either assigns all four or returns
  // out of this function.
  if (!implCode || !verifyRegression || !verifyCriteria || !findings) throw new Error("internal error: implCode/verify results/findings not established before the review gate");

  const material = findings.filter((f) => f.severity === "MATERIAL").map((f) => f.text);
  const nits = findings.filter((f) => f.severity === "NIT").map((f) => f.text);

  let finalCode = implCode;
  let fixApplied = false;
  let fixHeld: boolean | null = null;
  let reviewGateDecision: "approve" | "reject" | "not-needed" = "not-needed";
  let reviewRejected = false;

  if (material.length > 0) {
    const decision = await checkDecision(env.SPEND_KV, `change/review-decision/${runId}`);
    if (decision === null) {
      // Same priority rule as the two gates above: only reached with no
      // real decision found, so a real decision always wins over a stray
      // stop signal.
      if (await checkStopped(env.SPEND_KV, runId)) {
        await clearState(env.SPEND_KV, runId);
        const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt, "approve");
        onEvent({ type: "stopped" });
        onEvent({ type: "ledger", ledger });
        return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings, ledger });
      }
      onEvent({ type: "review-gate", runId, materialFindings: material, nitFindings: nits });
      const state: ChangeState = {
        runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, planGateReplyCount, runStartedAt,
        stage: "awaiting-review-decision", plan, grounding, implCode, verifyRegression, verifyCriteria, findings,
      };
      await saveState(env.SPEND_KV, state);
      onEvent({ type: "halted", runId, waitingOn: "review-decision" });
      const ledger = haltLedger(state, "review-decision");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan, finalCode: null, findings, ledger, completedAt: 0, reason: "" };
    }
    reviewGateDecision = decision;
    onEvent({ type: "review-gate-decided", decision });

    if (decision === "approve" && (await checkStopped(env.SPEND_KV, runId))) {
      await clearState(env.SPEND_KV, runId);
      const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt, "approve");
      onEvent({ type: "stopped" });
      onEvent({ type: "ledger", ledger });
      return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings, ledger });
    }

    // REJECT IS A REFUSAL.
    //
    // This branch did not exist. `approve` ran a fix and ANYTHING ELSE fell
    // through to the ship block -- so the button labelled "Reject", sitting
    // next to one labelled "Ship Changes", SHIPPED THE CHANGE. The reviewer
    // had found a material defect, a human had looked at it and said no, and
    // the run published anyway and recorded the reason as "The review's
    // findings were accepted as is."
    //
    // For a system whose whole claim is that it only says yes when yes is
    // true, this was the worst bug available: the single place a human can
    // say NO was wired to yes. Nothing caught it because ChangeLedger's
    // outcome type could not even express a review refusal -- the shape of
    // the data had no room for the thing the button promised.
    if (decision === "reject") {
      reviewRejected = true;
    }

    if (decision === "approve") {
      inFlightStage = "fix (post-review)";
      onEvent({ type: "fixing" });
      const verificationFailures = [
        ...verifyRegression.filter((r) => !r.pass).map((r) => describeFailure("regression", r)),
        ...verifyCriteria.filter((r) => !r.pass).map((r) => describeFailure("criterion", r)),
      ];
      const stillPassing = [
        ...verifyRegression.filter((r) => r.pass).map((r) => describePassing("regression", r)),
        ...verifyCriteria.filter((r) => r.pass).map((r) => describePassing("criterion", r)),
      ];
      const fix = plan!.implementationPath === "data-edit"
        ? await callAnthropic(env, budget, WORST_CASE.fixEdit, () =>
            fixChangeAsEdit(env.ANTHROPIC_API_KEY, plan!, finalCode, material, FIX_MODEL, CONTROL_LIMITS.TOKEN_CAPS.fixEdit, verificationFailures, stillPassing, priorLessons),
          )
        : await callAnthropic(env, budget, WORST_CASE.fix, () =>
            fixChange(env.ANTHROPIC_API_KEY, currentSourceAtStart, plan!, finalCode, material, FIX_MODEL, CONTROL_LIMITS.TOKEN_CAPS.fix, verificationFailures, stillPassing, priorLessons),
          );
      stageCosts.push({ stage: `fix (${plan!.implementationPath})`, costUsd: fix.costUsd, wallTimeMs: fix.wallTimeMs });
      if (fix.rejectionReason) {
        verifyFatalError = fix.rejectionReason;
        fixHeld = false;
      } else {
        finalCode = fix.code;
        fixApplied = true;
        onEvent({ type: "fixed", model: fix.model, inputTokens: fix.inputTokens, outputTokens: fix.outputTokens, costUsd: fix.costUsd, wallTimeMs: fix.wallTimeMs, code: finalCode });

        onEvent({ type: "verifying" });
        const verify2 = await runVerification(env, finalCode, plan.criteria, currentSourceAtStart, `change-${runId}-2`, plan!.implementationPath === "data-edit");
        verifyRegression = verify2.regression.results;
        verifyCriteria = verify2.criteria.results;
        verifyFatalError = verify2.regression.fatalError ?? verify2.criteria.fatalError;
        fixHeld = !verifyFatalError && verifyRegression.length > 0 && verifyRegression.every((r) => r.pass) && verifyCriteria.every((r) => r.pass);
        onEvent({
          type: "reverified",
          regression: verifyRegression,
          criteria: verifyCriteria,
          regressionPassed: verifyRegression.filter((r) => r.pass).length,
          regressionTotal: verifyRegression.length,
          criteriaPassed: verifyCriteria.filter((r) => r.pass).length,
          criteriaTotal: verifyCriteria.length,
          fatalError: verifyFatalError,
        });
      }
    }
  }

  // SHIP.md item 1: the other side of the same gap -- a stop clicked during
  // "Reviewing" or the post-review "Fixing" round has nowhere left to be
  // honored before the free (but real, visible-to-every-visitor) ship
  // write below. Shipping costs nothing further, but completing it anyway
  // after a stop was asked for is the same broken promise as spending
  // anyway would be -- the button said it would stop the run, not "stop
  // the run unless it's nearly done."
  if (await checkStopped(env.SPEND_KV, runId)) {
    await clearState(env.SPEND_KV, runId);
    const ledger = buildStoppedLedger(stageCosts, budget, questionAsked, planGateReplyCount, runStartedAt, "approve");
    onEvent({ type: "stopped" });
    onEvent({ type: "ledger", ledger });
    return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: null, findings, ledger });
  }

  const stillFailing = decideStillFailing(verifyFatalError, verifyRegression, verifyCriteria);

  // ---- Stage 5: Ship, or refuse to close (BUILD-V2.md) ----
  let outcome: ChangeLedger["outcome"];
  let refusalReason = "";
  if (reviewRejected) {
    // A human looked at a material finding and said no. That is a refusal
    // even though verification passed -- verification and judgement are
    // different questions, and this gate exists for the second one.
    outcome = "refused-review";
    reviewGateDecision = "reject";
    refusalReason = material.length === 1
      ? `the review found a material problem and it was rejected: ${material[0]}`
      : `the review found ${material.length} material problems and they were rejected`;
    onEvent({ type: "refused", reason: refusalReason });
  } else if (stillFailing) {
    outcome = "refused-verification";
    refusalReason = verifyFatalError
      ? `verification could not run: ${verifyFatalError}`
      : fixApplied
        ? "the fix did not make regression and criteria checks fully pass"
        : "regression or criteria checks did not fully pass, and no fix was approved";
    onEvent({ type: "refused", reason: refusalReason });
  } else {
    // Atomic Compare-and-Swap publication: serialized through Durable Object if available, fallback to KV only on infrastructure absence
    let published = false;
    let casConflict = false;
    let publishError: string | null = null;
    let mirrorStale: string | null = null;
    let conflictReason: string | null = null;
    if (env.SPEND_COUNTER) {
      try {
        const id = env.SPEND_COUNTER.idFromName("global");
        const stub = env.SPEND_COUNTER.get(id);
        const res = await stub.fetch("https://spend-counter.internal/publish-source", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedSource: currentSourceAtStart,
            newSource: finalCode,
            runId,
            leaseToken: leaseToken ?? undefined,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; conflict?: boolean; reason?: string };
          if (data.ok) {
            // ORDER MATTERS. `published = true` used to be set BEFORE the mirror
            // write, inside a catch that swallowed everything -- so if the KV
            // put threw, the run still reported "shipped" while the mirror the
            // browser reads from still held the old world. The visitor is told
            // yes, reloads, and sees no change: the precise failure this system
            // exists to refuse, produced by the system itself.
            // The CAS has already committed by this point -- the coordinator's
            // copy IS the new world. So the mirror write must not be able to
            // turn a successful publish into a reported failure: it used to sit
            // inside this try, and a KV error made the run tell the visitor
            // "Changes were not committed" about a world that had in fact been
            // committed, leaving the DO and the mirror permanently divergent.
            // Mark it published first, then mirror, and report a mirror failure
            // as what it is -- a stale mirror, not a failed ship.
            published = true;
            try {
              await env.SPEND_KV.put("sim/current-source", finalCode);
            } catch (mirrorError) {
              mirrorStale = String((mirrorError as Error)?.message ?? mirrorError);
            }
          } else if (data.conflict) {
            casConflict = true;
            conflictReason = data.reason || null;
          }
        }
      } catch (e) {
        publishError = String((e as Error)?.message ?? e);
      }
    }

    if (casConflict) {
      outcome = "refused-verification";
      refusalReason = conflictReason || "conflict: another concurrent pipeline run shipped changes while this run was in progress. Please re-run your change request against the updated world.";
      onEvent({ type: "refused", reason: refusalReason });
    } else if (!published && !env.SPEND_COUNTER) {
      // KV fallback only when Durable Object binding is completely absent in environment
      const currentOnDisk = (await env.SPEND_KV.get("sim/current-source")) ?? currentSourceAtStart;
      if (currentOnDisk !== currentSourceAtStart) {
        outcome = "refused-verification";
        refusalReason = "conflict: another concurrent pipeline run shipped changes while this run was in progress. Please re-run your change request against the updated world.";
        onEvent({ type: "refused", reason: refusalReason });
      } else {
        outcome = "shipped";
        await env.SPEND_KV.put("sim/current-source", finalCode);
        onEvent({ type: "shipped" });
      }
    } else if (published) {
      outcome = "shipped";
      if (mirrorStale) {
        // Shipped, truthfully -- but say plainly that the copy the page reads
        // from did not update, rather than let the visitor reload and wonder.
        onEvent({ type: "shipped" });
        onEvent({ type: "warning", message: `The change shipped, but the read mirror did not update (${mirrorStale}). The page may show the previous world until the mirror catches up.` });
      } else {
        onEvent({ type: "shipped" });
      }
    } else {
      // DO was present but errored or unreachable: fail-closed
      outcome = "refused-verification";
      refusalReason = publishError
        ? `publication failed: ${publishError}. Changes were not committed.`
        : "publication failed: coordinator unavailable. Changes were not committed.";
      onEvent({ type: "refused", reason: refusalReason });
    }
  }
  await clearState(env.SPEND_KV, runId);

  const { lesson, recurrenceCount } = await runRetrospectiveAndRecord(
    env, budget, stageCosts,
    `Change request: ${changeRequest}\nPlan: ${plan.willBuild}\n` +
      `Reviewer found ${material.length} material issue(s): ${material.join("; ") || "none"}\n` +
      `Fix applied: ${fixApplied}. Fix held: ${fixHeld}.\n` +
      `Outcome: ${outcome}${refusalReason ? ` (${refusalReason})` : ""}.`,
  );
  onEvent({ type: "retrospective", lesson, recurrenceCount, costUsd: stageCosts[stageCosts.length - 1].costUsd });

  const ledger: ChangeLedger = {
    outcome,
    totalCostUsd: budget.spent,
    stageCosts,
    reviewFoundMaterial: material.length,
    reviewFoundNits: nits.length,
    fixApplied,
    fixHeld,
    planGateDecision: "approve",
    reviewGateDecision,
    questionAsked,
    planGateReplyCount,
    totalWallTimeMs: Date.now() - runStartedAt,
    retrospectiveLesson: lesson,
    lessonRecurrenceCount: recurrenceCount,
  };
  onEvent({ type: "ledger", ledger });

  return await recordTerminalRun(env.SPEND_KV, { runId, changeRequest, plan, finalCode: outcome === "shipped" ? finalCode : null, findings, ledger });

  } catch (e) {
    // FOUNDATION-2 item 4: "a timeout must never lose a run." Everything
    // above this point ran inside one try -- any throw (a stage call
    // exceeding STAGE_CALL_TIMEOUT_MS, a network error, anything) lands
    // here instead of propagating uncaught out of this function. Whatever
    // was already paid for and completed -- plan/grounding from the closure
    // above, implCode/verifyRegression/verifyCriteria/findings if that far
    // along -- is still sitting in those `let`s at whatever value they last
    // held, so the checkpoint below never loses it. This is a real halt,
    // the same shape as every other gate in this function: it waits for an
    // explicit decision (retry or abandon) rather than looping on its own,
    // checked at the top of this function via change/error-decision/${runId}.
    const errorMessage = String((e as Error)?.message ?? e);
    const errorKind = classifyErrorPermanence(e);
    // SHIP.md item 1: the actual defect behind "aborted, then retried, and
    // retry did nothing." A stop clicked during a stretch with no
    // checkStopped() checkpoint (the gap fixed above) left change/stop/
    // ${runId} sitting in KV, unconsumed, for up to its full 10-minute TTL
    // -- and if THIS run then happened to hit a genuine, unrelated error
    // and got checkpointed here, a later Retry would resume past Gate 1,
    // hit the very first checkStopped() check on the way back through, find
    // that STALE flag from the original abort attempt, and immediately
    // re-halt as "stopped" instead of ever re-attempting the failed stage
    // -- indistinguishable, from the visitor's seat, from Retry doing
    // nothing. The real error reported below is still the honest thing to
    // show (it really happened, and hiding it behind "stopped" would be
    // its own dishonesty) -- but any stray stop signal is consumed here,
    // now, so it can never survive to poison a retry of THIS checkpoint.
    await checkStopped(env.SPEND_KV, runId).catch(() => false);
    const state: ChangeState = {
      runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, planGateReplyCount, runStartedAt,
      stage: "errored", errorMessage, erroredAtStage: inFlightStage, erroredPastGate1: pastGate1Approved, errorKind,
      erroredClarification: plan === undefined ? lastClarification : undefined,
      plan, grounding, implCode, verifyRegression, verifyCriteria, findings,
    };
    await saveState(env.SPEND_KV, state);
    onEvent({ type: "stage-error", runId, erroredAtStage: inFlightStage, errorMessage, costSoFarUsd: budget.spent, errorKind });
    onEvent({ type: "halted", runId, waitingOn: "error-decision" });
    const ledger = haltLedger(state, "error-decision");
    onEvent({ type: "ledger", ledger });
    return { runId, changeRequest, plan: state.plan ?? null, finalCode: state.implCode ?? null, findings: state.findings ?? [], ledger, completedAt: 0, reason: "" };
  }
}

/**
 * Describes one failing TestResult for the fix stage's prompt -- the actual
 * call that produced it, not just the bare error string. Found missing by
 * inspecting what the fix stage received on two real, failed attempts to
 * repair the exact same crash: every regression failure showed up as
 * "Cannot read properties of undefined (reading 'length')" with no
 * indication of which function ran or what input triggered it, even though
 * the function name and the input world were sitting right there in
 * SIM_REGRESSION_SUITE the whole time -- they were just never forwarded.
 * Asking a model to fix a crash without the input that causes it is asking
 * it to guess; two guesses, two misses. This is a distinct defect from the
 * fail-open class this project already tracks (nothing here read an
 * absence as a pass -- the pipeline correctly refused both times) -- it's
 * evidence that existed and was silently dropped before it could be acted
 * on, which needed fixing before a third attempt could be a fair test of
 * repair rather than a fair test of guessing.
 */
function callSignature(r: TestResult): string | null {
  return r.fn ? `${r.fn}(${(r.args ?? []).map((a) => JSON.stringify(a)).join(", ")})${r.repeat ? ` repeated ${r.repeat}x` : ""}` : null;
}

/** The first couple of real stack frames, skipping the "Error: message"
 * line itself -- enough to name the throwing function and its line inside
 * the generated sandbox module, without dumping the whole trace into the
 * prompt. */
function stackExcerpt(stack: string | undefined, count = 2): string {
  if (!stack) return "";
  const frames = stack
    .split("\n")
    .slice(1, 1 + count)
    .map((l) => l.trim())
    .filter(Boolean);
  return frames.length ? ` -- threw at: ${frames.join(" <- ")}` : "";
}

export function describeFailure(prefix: string, r: TestResult): string {
  const call = callSignature(r);
  if (r.error) {
    return `${prefix} "${r.name}"${call ? ` -- calling ${call}` : ""} threw: ${r.error}${stackExcerpt(r.stack)}`;
  }
  return `${prefix} "${r.name}"${call ? ` -- calling ${call}` : ""}: expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}`;
}

/** The mirror of describeFailure for checks that currently PASS -- the fix
 * stage was only ever shown what was broken, never what was already
 * working, which is exactly how the attempt-3 fix repaired the crash and
 * broke six previously-passing checks in the same motion (re-attaching
 * pets/log fields onto worlds that never had them). Telling the model what
 * must keep returning what it already returns is the other half of "here
 * is the evidence", not an optional extra. */
export function describePassing(prefix: string, r: TestResult): string {
  const call = callSignature(r);
  return `${prefix} "${r.name}"${call ? ` -- calling ${call}` : ""} returns ${JSON.stringify(r.actual)}`;
}

/**
 * A fatal error (sandbox couldn't even run the code) or an empty regression
 * suite (verification silently not happening) are both failures, same as
 * any failed check -- neither is "0 failures found". Deliberately does NOT
 * apply the empty-is-failing rule to `criteria`: a plan proposing zero new
 * criteria is a legitimate outcome (nothing new to check), unlike an empty
 * *regression* result, which only ever means the suite didn't run. Pulled
 * out as its own function so this exact invariant is directly testable
 * without a live sandbox.
 */
export function decideStillFailing(fatalError: string | undefined, regression: TestResult[], criteria: TestResult[]): boolean {
  return !!fatalError || regression.length === 0 || regression.some((r) => !r.pass) || criteria.some((r) => !r.pass);
}

/**
 * FINAL.md item 1's explicit gate: throws if verification has not
 * converged, in the exact same terms decideStillFailing already uses --
 * this function IS "entry to reviewing requires every criterion passing,
 * the full regression suite passing, and no fatal error", written as code
 * that fails loud rather than a comment describing an intention. Called
 * once, immediately before the reviewer is invoked, so review is
 * structurally unreachable on failing verification even if some future
 * edit to the fix loop above breaks its own exit condition.
 */
export function assertConvergedForReview(fatalError: string | undefined, regression: TestResult[], criteria: TestResult[]): void {
  if (decideStillFailing(fatalError, regression, criteria)) {
    throw new Error(
      "Refusing to enter cross-model review: verification has not converged " +
        "(a fatal sandbox error, an empty regression suite, or a failing regression/criteria check). " +
        "This should be unreachable -- entry to review requires convergence, checked just before this call.",
    );
  }
}

/** One probe = one single-check sandbox run against a given source,
 * reporting back only what evaluateCriterion needs (the raw actual/error),
 * never a pass/fail judgement -- that judgement is criteriaExecution.ts's
 * job, kept out of the sandbox entirely so it stays plain, unit-testable
 * TypeScript (see test/criteriaExecution.test.ts, which covers this logic
 * with zero sandbox calls). Each criterion gets its own isolate id so a
 * probe for one criterion can never be confused with another's. */
function makeProbeRunner(env: ChangeEnv, code: string, isolateIdPrefix: string): ProbeRunner {
  let counter = 0;
  return async (fn, args, repeat) => {
    counter++;
    const probe: SimTestCase = { name: "probe", fn, args, repeat: repeat ?? undefined };
    const result = await runSimTests(env.LOADER, code, [probe], `${isolateIdPrefix}-probe${counter}`, SIM_VERIFY_CPU_MS);
    if (result.fatalError) return { error: result.fatalError };
    const r = result.results[0];
    if (!r) return { error: "sandbox returned no result for this probe" };
    if (r.error) return { error: r.error, stack: r.stack };
    return { actual: r.actual };
  };
}

async function runVerification(
  env: ChangeEnv,
  code: string,
  criteria: ProposedCriterion[],
  baselineSource: string,
  isolateIdPrefix: string,
  dataEditExpected = false,
): Promise<{ regression: Awaited<ReturnType<typeof runSimTests>>; criteria: { results: TestResult[]; wallTimeMs: number; fatalError?: string } }> {
  const start = Date.now();
  const regression = await runSimTests(env.LOADER, code, SIM_REGRESSION_SUITE, `${isolateIdPrefix}-regression`, SIM_VERIFY_CPU_MS);

  // WORLD INTEGRITY. The nine sandbox cases exercise tick/chooseAction/
  // applyAction and never read the world's data, so on their own they cannot
  // tell a data edit that worked from one that did nothing. These checks look
  // at the data, and they join the REGRESSION results deliberately:
  // decideStillFailing fails on any failing regression entry, so a change that
  // did not actually change anything, or that broke a reference, now cannot
  // reach the reviewer or ship.
  // Whether the SANDBOX actually ran has to be decided before the integrity
  // rows are mixed in. decideStillFailing treats an empty regression array as
  // "verification silently did not happen" -- but once these rows are appended
  // the array can never be empty again, so that guard had quietly died and a
  // run whose nine cases did not execute could report "7/7, it passed every
  // check". Recording it here keeps the guard alive after the merge.
  if (regression.results.length === 0 && !regression.fatalError) {
    regression.fatalError = "the regression suite returned no results at all -- verification did not run";
  }
  regression.results = [...regression.results, ...worldIntegrityChecks(baselineSource, code, dataEditExpected)];
  if (criteria.length === 0) return { regression, criteria: { results: [], wallTimeMs: 0 } };
  try {
    const probeCandidate = makeProbeRunner(env, code, `${isolateIdPrefix}-criteria-candidate`);
    const probeBaseline = makeProbeRunner(env, baselineSource, `${isolateIdPrefix}-criteria-baseline`);
    const results = await evaluateCriteria(criteria, probeCandidate, probeBaseline, code);
    return { regression, criteria: { results, wallTimeMs: Date.now() - start } };
  } catch (e) {
    // Same discipline as a sandbox fatalError: a criteria pass that never
    // actually ran is "verification didn't happen", never "0 failures".
    return { regression, criteria: { results: [], wallTimeMs: Date.now() - start, fatalError: String((e as Error)?.message ?? e) } };
  }
}
