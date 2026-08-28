import type { SimTestCase, TestResult } from "./types";
import { generatePlan, implementChange, fixChange, runRetrospective, type ChangePlan, PRICING as ANTHROPIC_PRICING } from "./claude";
import { reviewArtifact, parseFindings, REVIEW_MODEL, PRICING as OPENAI_PRICING, type ReviewFinding } from "./openai";
import { runSimTests } from "./simSandbox";
import { SIM_REGRESSION_SUITE } from "./simRegression";
import { SIM_BASELINE_SOURCE } from "./simBaseline";
import type { ProposedCriterion } from "./criteria";
import { evaluateCriteria, type ProbeRunner } from "./criteriaExecution";
import {
  CONTROL_LIMITS,
  assertUnderRunCeiling,
  assertUnderPipelineSpendCap,
  recordPipelineSpend,
  assertCircuitClosed,
  recordProviderSuccess,
  recordProviderFailure,
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

const IMPLEMENT_MODEL = "claude-sonnet-5";
const SIM_VERIFY_CPU_MS = 2000;
const STATE_TTL_SEC = 60 * 60 * 24 * 7; // a halted run can be resumed for a week

function regressionSummaryText(): string {
  return SIM_REGRESSION_SUITE.map((t) => `- ${t.name}`).join("\n");
}

export type ChangeEvent =
  | { type: "retrospective"; lesson: string | null; recurrenceCount: number | null; costUsd: number }
  | { type: "planning" }
  | { type: "planned"; plan: ChangePlan; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number }
  | { type: "question"; runId: string; question: string }
  | { type: "answered"; answer: string }
  | { type: "plan-gate"; runId: string; plan: ChangePlan }
  | { type: "plan-gate-decided"; decision: "approve" | "reject" }
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
  | { type: "halted"; runId: string; waitingOn: "answer" | "plan-decision" | "review-decision" }
  | { type: "ledger"; ledger: ChangeLedger };

export interface ChangeLedger {
  outcome: "shipped" | "refused-plan" | "refused-verification" | "halted-awaiting-answer" | "halted-awaiting-plan-decision" | "halted-awaiting-review-decision";
  totalCostUsd: number;
  stageCosts: { stage: string; costUsd: number }[];
  reviewFoundMaterial: number;
  reviewFoundNits: number;
  fixApplied: boolean;
  fixHeld: boolean | null;
  planGateDecision: "approve" | "reject" | "pending";
  reviewGateDecision: "approve" | "reject" | "pending" | "not-needed";
  questionAsked: boolean;
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
}

interface ChangeState {
  runId: string;
  changeRequest: string;
  currentSourceAtStart: string;
  budgetSpent: number;
  stageCosts: { stage: string; costUsd: number }[];
  questionAsked: boolean;
  runStartedAt: number;
  stage: "awaiting-answer" | "awaiting-plan-decision" | "awaiting-review-decision";
  plan: ChangePlan;
  implCode?: string;
  verifyRegression?: TestResult[];
  verifyCriteria?: TestResult[];
  findings?: ReviewFinding[];
}

interface CallBudget {
  spent: number;
}

async function callAnthropic<T>(kv: KVNamespace, budget: CallBudget, estimateUsd: number, fn: () => Promise<T & { costUsd: number }>): Promise<T & { costUsd: number }> {
  await assertCircuitClosed(kv, "anthropic" as Provider);
  assertUnderRunCeiling(budget.spent, estimateUsd);
  await assertUnderPipelineSpendCap(kv, estimateUsd);
  try {
    const result = await fn();
    await recordProviderSuccess(kv, "anthropic");
    await recordPipelineSpend(kv, result.costUsd);
    budget.spent += result.costUsd;
    return result;
  } catch (e) {
    await recordProviderFailure(kv, "anthropic");
    throw e;
  }
}

async function callOpenAI<T>(kv: KVNamespace, budget: CallBudget, estimateUsd: number, fn: () => Promise<T & { costUsd: number }>): Promise<T & { costUsd: number }> {
  await assertCircuitClosed(kv, "openai" as Provider);
  assertUnderRunCeiling(budget.spent, estimateUsd);
  await assertUnderPipelineSpendCap(kv, estimateUsd);
  try {
    const result = await fn();
    await recordProviderSuccess(kv, "openai");
    await recordPipelineSpend(kv, result.costUsd);
    budget.spent += result.costUsd;
    return result;
  } catch (e) {
    await recordProviderFailure(kv, "openai");
    throw e;
  }
}

// 2000 truncated mid-JSON on the first real run (structured plans with
// several criteria, each carrying argsJson/expectedJson, run longer than
// a plain brief) -- found the same way the v1 implement-stage cap was
// found too small: by actually running it.
const PLAN_MAX_TOKENS = 4000;

const RETROSPECTIVE_MAX_TOKENS = 300;

const WORST_CASE = {
  plan: (PLAN_MAX_TOKENS / 1_000_000) * ANTHROPIC_PRICING["claude-opus-4-8"].output,
  implement: (CONTROL_LIMITS.TOKEN_CAPS.implement / 1_000_000) * ANTHROPIC_PRICING["claude-opus-4-8"].output,
  review: (CONTROL_LIMITS.TOKEN_CAPS.review / 1_000_000) * OPENAI_PRICING[REVIEW_MODEL].output,
  fix: (CONTROL_LIMITS.TOKEN_CAPS.fix / 1_000_000) * ANTHROPIC_PRICING["claude-opus-4-8"].output,
  retrospective: (RETROSPECTIVE_MAX_TOKENS / 1_000_000) * ANTHROPIC_PRICING["claude-opus-4-8"].output,
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

export interface ChangeEnv {
  LOADER: import("./sandbox").LoaderBinding;
  SPEND_KV: KVNamespace;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
}

function haltLedger(state: Pick<ChangeState, "stageCosts" | "budgetSpent" | "questionAsked" | "runStartedAt">, waitingOn: "answer" | "plan-decision" | "review-decision"): ChangeLedger {
  return {
    outcome: waitingOn === "answer" ? "halted-awaiting-answer" : waitingOn === "plan-decision" ? "halted-awaiting-plan-decision" : "halted-awaiting-review-decision",
    totalCostUsd: state.budgetSpent,
    stageCosts: state.stageCosts,
    reviewFoundMaterial: 0,
    reviewFoundNits: 0,
    fixApplied: false,
    fixHeld: null,
    planGateDecision: waitingOn === "answer" || waitingOn === "plan-decision" ? "pending" : "approve",
    reviewGateDecision: waitingOn === "review-decision" ? "pending" : "not-needed",
    questionAsked: state.questionAsked,
    totalWallTimeMs: Date.now() - state.runStartedAt,
    // A halted run isn't finished -- there's nothing to retrospect on yet.
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
  stageCosts: { stage: string; costUsd: number }[],
  runSummary: string,
): Promise<{ lesson: string | null; recurrenceCount: number | null }> {
  const retro = await callAnthropic(env.SPEND_KV, budget, WORST_CASE.retrospective, () => runRetrospective(env.ANTHROPIC_API_KEY, runSummary));
  stageCosts.push({ stage: "retrospective", costUsd: retro.costUsd });
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
export async function runChangePipeline(env: ChangeEnv, runId: string, changeRequest: string, onEvent: (e: ChangeEvent) => void): Promise<ChangeRecord> {
  const existing = await loadState(env.SPEND_KV, runId);
  const budget: CallBudget = { spent: existing?.budgetSpent ?? 0 };
  const stageCosts = existing?.stageCosts ?? [];
  const runStartedAt = existing?.runStartedAt ?? Date.now();
  const currentSourceAtStart = existing?.currentSourceAtStart ?? (await env.SPEND_KV.get("sim/current-source")) ?? SIM_BASELINE_SOURCE;
  let questionAsked = existing?.questionAsked ?? false;
  const priorLessons = (await loadInstructions(env.SPEND_KV)).map((l) => `- ${l}`).join("\n");

  let plan: ChangePlan;

  if (!existing) {
    // ---- Stage 1: Plan, fresh ----
    onEvent({ type: "planning" });
    const planResult = await callAnthropic(env.SPEND_KV, budget, WORST_CASE.plan, () =>
      generatePlan(env.ANTHROPIC_API_KEY, currentSourceAtStart, regressionSummaryText(), changeRequest, null, PLAN_MAX_TOKENS, priorLessons),
    );
    stageCosts.push({ stage: "plan", costUsd: planResult.costUsd });
    onEvent({ type: "planned", plan: planResult.plan, model: planResult.model, inputTokens: planResult.inputTokens, outputTokens: planResult.outputTokens, costUsd: planResult.costUsd, wallTimeMs: planResult.wallTimeMs });
    plan = planResult.plan;

    if (plan.question) {
      questionAsked = true;
      onEvent({ type: "question", runId, question: plan.question });
      const state: ChangeState = { runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, runStartedAt, stage: "awaiting-answer", plan };
      await saveState(env.SPEND_KV, state);
      onEvent({ type: "halted", runId, waitingOn: "answer" });
      const ledger = haltLedger(state, "answer");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan, finalCode: null, findings: [], ledger };
    }
  } else if (existing.stage === "awaiting-answer") {
    const answer = await checkAnswer(env.SPEND_KV, `change/answer/${runId}`);
    if (answer === null) {
      onEvent({ type: "halted", runId, waitingOn: "answer" });
      const ledger = haltLedger(existing, "answer");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan: existing.plan, finalCode: null, findings: [], ledger };
    }
    onEvent({ type: "answered", answer });
    onEvent({ type: "planning" });
    const planResult = await callAnthropic(env.SPEND_KV, budget, WORST_CASE.plan, () =>
      generatePlan(env.ANTHROPIC_API_KEY, currentSourceAtStart, regressionSummaryText(), changeRequest, answer, PLAN_MAX_TOKENS, priorLessons),
    );
    stageCosts.push({ stage: "plan (re-plan after question)", costUsd: planResult.costUsd });
    onEvent({ type: "planned", plan: planResult.plan, model: planResult.model, inputTokens: planResult.inputTokens, outputTokens: planResult.outputTokens, costUsd: planResult.costUsd, wallTimeMs: planResult.wallTimeMs });
    plan = planResult.plan;
  } else {
    plan = existing.plan;
  }

  // ---- Stage 1.5: Plan gate -- check once, halt if no decision yet ----
  // Bug found by actually running a resume from "awaiting-review-decision":
  // this block used to only check the plan-decision key when the resume
  // state's stage was "awaiting-plan-decision" or "awaiting-answer" (or on
  // a fresh run) -- any OTHER stage (i.e. already past the plan gate,
  // waiting on the review gate instead) fell through neither branch,
  // leaving planDecision null and re-triggering a brand-new plan-gate halt,
  // silently discarding that the plan had already been approved. The
  // correct check is the inverse: skip this gate entirely once we know
  // we're past it, rather than enumerating every stage that hasn't reached
  // it yet.
  const pastPlanGate = existing?.stage === "awaiting-review-decision";
  let planDecision: "approve" | "reject" | null = pastPlanGate ? "approve" : await checkDecision(env.SPEND_KV, `change/plan-decision/${runId}`);
  if (planDecision === null) {
    onEvent({ type: "plan-gate", runId, plan });
    const state: ChangeState = { runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, runStartedAt, stage: "awaiting-plan-decision", plan };
    await saveState(env.SPEND_KV, state);
    onEvent({ type: "halted", runId, waitingOn: "plan-decision" });
    const ledger = haltLedger(state, "plan-decision");
    onEvent({ type: "ledger", ledger });
    return { runId, changeRequest, plan, finalCode: null, findings: [], ledger };
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
      totalWallTimeMs: Date.now() - runStartedAt,
      retrospectiveLesson: lesson,
      lessonRecurrenceCount: recurrenceCount,
    };
    onEvent({ type: "ledger", ledger });
    return { runId, changeRequest, plan, finalCode: null, findings: [], ledger };
  }

  // ---- Stages 2-4: implement, verify, review -- or resume straight to the review gate ----
  let implCode: string;
  let verifyRegression: TestResult[];
  let verifyCriteria: TestResult[];
  let verifyFatalError: string | undefined;
  let findings: ReviewFinding[];

  if (existing?.stage === "awaiting-review-decision" && existing.implCode && existing.verifyRegression && existing.verifyCriteria && existing.findings) {
    implCode = existing.implCode;
    verifyRegression = existing.verifyRegression;
    verifyCriteria = existing.verifyCriteria;
    findings = existing.findings;
  } else {
    onEvent({ type: "implementing" });
    const impl = await callAnthropic(env.SPEND_KV, budget, WORST_CASE.implement, () =>
      implementChange(env.ANTHROPIC_API_KEY, currentSourceAtStart, plan, changeRequest, IMPLEMENT_MODEL, CONTROL_LIMITS.TOKEN_CAPS.implement, priorLessons),
    );
    stageCosts.push({ stage: "implement", costUsd: impl.costUsd });
    onEvent({ type: "implemented", model: impl.model, inputTokens: impl.inputTokens, outputTokens: impl.outputTokens, costUsd: impl.costUsd, wallTimeMs: impl.wallTimeMs, code: impl.code });
    implCode = impl.code;

    onEvent({ type: "verifying" });
    const verify1 = await runVerification(env, implCode, plan.criteria, currentSourceAtStart, `change-${runId}-1`);
    verifyRegression = verify1.regression.results;
    verifyCriteria = verify1.criteria.results;
    // validate-before-consume: a sandbox that failed to even load the code
    // (a fatalError) is not "0 failures" -- it's "verification didn't run".
    // Found the hard way: an HTML-wrapped implementation failed to load as
    // a module, and with no check here that silently read as a clean pass.
    const fatal = verify1.regression.fatalError ?? verify1.criteria.fatalError;
    verifyFatalError = fatal;
    onEvent({
      type: "verified",
      regression: verifyRegression,
      criteria: verifyCriteria,
      regressionPassed: verifyRegression.filter((r) => r.pass).length,
      regressionTotal: verifyRegression.length,
      criteriaPassed: verifyCriteria.filter((r) => r.pass).length,
      criteriaTotal: verifyCriteria.length,
      fatalError: fatal,
    });
    if (fatal) {
      // Refuse immediately -- reviewing code that never actually ran would
      // spend real money critiquing something already known to be broken.
      await clearState(env.SPEND_KV, runId);
      const { lesson, recurrenceCount } = await runRetrospectiveAndRecord(
        env, budget, stageCosts,
        `Change request: ${changeRequest}\nPlan: ${plan.willBuild}\nOutcome: the implementation could not even be verified -- the sandbox failed to run it (${fatal}).`,
      );
      onEvent({ type: "retrospective", lesson, recurrenceCount, costUsd: stageCosts[stageCosts.length - 1].costUsd });
      const ledger: ChangeLedger = {
        outcome: "refused-verification",
        totalCostUsd: budget.spent,
        stageCosts,
        reviewFoundMaterial: 0,
        reviewFoundNits: 0,
        fixApplied: false,
        fixHeld: null,
        planGateDecision: "approve",
        reviewGateDecision: "not-needed",
        questionAsked,
        totalWallTimeMs: Date.now() - runStartedAt,
        retrospectiveLesson: lesson,
        lessonRecurrenceCount: recurrenceCount,
      };
      onEvent({ type: "refused", reason: `verification could not run: ${fatal}` });
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan, finalCode: null, findings: [], ledger };
    }

    onEvent({ type: "reviewing" });
    const review = await callOpenAI(env.SPEND_KV, budget, WORST_CASE.review, () =>
      reviewArtifact(
        env.OPENAI_API_KEY,
        REVIEW_MODEL,
        `Plan:\nWill build: ${plan.willBuild}\nWill not touch: ${plan.willNotTouch}\nCriteria:\n${plan.criteria.map((c) => `- ${c.description}`).join("\n")}`,
        `Change request: ${changeRequest}\n\nOriginal source:\n${currentSourceAtStart}`,
        implCode,
        CONTROL_LIMITS.TOKEN_CAPS.review,
        priorLessons,
      ),
    );
    stageCosts.push({ stage: "review", costUsd: review.costUsd });
    findings = parseFindings(review.text);
    onEvent({ type: "reviewed", model: review.model, inputTokens: review.inputTokens, outputTokens: review.outputTokens, costUsd: review.costUsd, wallTimeMs: review.wallTimeMs, reviewText: review.text, findings });
  }

  const material = findings.filter((f) => f.severity === "MATERIAL").map((f) => f.text);
  const nits = findings.filter((f) => f.severity === "NIT").map((f) => f.text);

  let finalCode = implCode;
  let fixApplied = false;
  let fixHeld: boolean | null = null;
  let reviewGateDecision: "approve" | "reject" | "not-needed" = "not-needed";

  if (material.length > 0) {
    const decision = await checkDecision(env.SPEND_KV, `change/review-decision/${runId}`);
    if (decision === null) {
      onEvent({ type: "review-gate", runId, materialFindings: material, nitFindings: nits });
      const state: ChangeState = {
        runId, changeRequest, currentSourceAtStart, budgetSpent: budget.spent, stageCosts, questionAsked, runStartedAt,
        stage: "awaiting-review-decision", plan, implCode, verifyRegression, verifyCriteria, findings,
      };
      await saveState(env.SPEND_KV, state);
      onEvent({ type: "halted", runId, waitingOn: "review-decision" });
      const ledger = haltLedger(state, "review-decision");
      onEvent({ type: "ledger", ledger });
      return { runId, changeRequest, plan, finalCode: null, findings, ledger };
    }
    reviewGateDecision = decision;
    onEvent({ type: "review-gate-decided", decision });

    if (decision === "approve") {
      onEvent({ type: "fixing" });
      const verificationFailures = [
        ...verifyRegression.filter((r) => !r.pass).map((r) => describeFailure("regression", r)),
        ...verifyCriteria.filter((r) => !r.pass).map((r) => describeFailure("criterion", r)),
      ];
      const stillPassing = [
        ...verifyRegression.filter((r) => r.pass).map((r) => describePassing("regression", r)),
        ...verifyCriteria.filter((r) => r.pass).map((r) => describePassing("criterion", r)),
      ];
      const fix = await callAnthropic(env.SPEND_KV, budget, WORST_CASE.fix, () =>
        fixChange(env.ANTHROPIC_API_KEY, currentSourceAtStart, plan, finalCode, material, IMPLEMENT_MODEL, CONTROL_LIMITS.TOKEN_CAPS.fix, verificationFailures, stillPassing, priorLessons),
      );
      stageCosts.push({ stage: "fix", costUsd: fix.costUsd });
      finalCode = fix.code;
      fixApplied = true;
      onEvent({ type: "fixed", model: fix.model, inputTokens: fix.inputTokens, outputTokens: fix.outputTokens, costUsd: fix.costUsd, wallTimeMs: fix.wallTimeMs, code: finalCode });

      onEvent({ type: "verifying" });
      const verify2 = await runVerification(env, finalCode, plan.criteria, currentSourceAtStart, `change-${runId}-2`);
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

  const stillFailing = decideStillFailing(verifyFatalError, verifyRegression, verifyCriteria);

  // ---- Stage 5: Ship, or refuse to close (BUILD-V2.md) ----
  let outcome: ChangeLedger["outcome"];
  let refusalReason = "";
  if (stillFailing) {
    outcome = "refused-verification";
    refusalReason = verifyFatalError
      ? `verification could not run: ${verifyFatalError}`
      : fixApplied
        ? "the fix did not make regression and criteria checks fully pass"
        : "regression or criteria checks did not fully pass, and no fix was approved";
    onEvent({ type: "refused", reason: refusalReason });
  } else {
    outcome = "shipped";
    await env.SPEND_KV.put("sim/current-source", finalCode);
    onEvent({ type: "shipped" });
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
    totalWallTimeMs: Date.now() - runStartedAt,
    retrospectiveLesson: lesson,
    lessonRecurrenceCount: recurrenceCount,
  };
  onEvent({ type: "ledger", ledger });

  const record: ChangeRecord = { runId, changeRequest, plan, finalCode: outcome === "shipped" ? finalCode : null, findings, ledger };
  await env.SPEND_KV.put(`changelog/${runId}`, JSON.stringify(record));
  return record;
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
): Promise<{ regression: Awaited<ReturnType<typeof runSimTests>>; criteria: { results: TestResult[]; wallTimeMs: number; fatalError?: string } }> {
  const start = Date.now();
  const regression = await runSimTests(env.LOADER, code, SIM_REGRESSION_SUITE, `${isolateIdPrefix}-regression`, SIM_VERIFY_CPU_MS);
  if (criteria.length === 0) return { regression, criteria: { results: [], wallTimeMs: 0 } };
  try {
    const probeCandidate = makeProbeRunner(env, code, `${isolateIdPrefix}-criteria-candidate`);
    const probeBaseline = makeProbeRunner(env, baselineSource, `${isolateIdPrefix}-criteria-baseline`);
    const results = await evaluateCriteria(criteria, probeCandidate, probeBaseline);
    return { regression, criteria: { results, wallTimeMs: Date.now() - start } };
  } catch (e) {
    // Same discipline as a sandbox fatalError: a criteria pass that never
    // actually ran is "verification didn't happen", never "0 failures".
    return { regression, criteria: { results: [], wallTimeMs: Date.now() - start, fatalError: String((e as Error)?.message ?? e) } };
  }
}
