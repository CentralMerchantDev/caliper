import Anthropic from "@anthropic-ai/sdk";
import type { Task, GenerationResult, TestResult } from "./types";
import { assertUnderCap, recordSpend } from "./spendCap";
import { CRITERION_SCHEMA, validateProposedCriteria, describeCriterion, type ProposedCriterion } from "./criteria";
export type { ProposedCriterion } from "./criteria";
import { TruncatedResponseError } from "./controlLayer";
import { structureSummary } from "./worldStructure";
import { WORLD_EDIT_SCHEMA, parseRawWorldEdit, runValidatedWorldEdit, type WorldEdit } from "./worldEdit";

/**
 * validate-before-consume (a production control-layer practice): a response that hit its
 * token cap is a failure, never content, even if it happens to parse.
 * Retries once with a larger budget before hard-failing. Found missing
 * here the hard way -- twice, in two different call sites -- before this
 * existed as one shared guard instead of ad hoc per-callsite handling.
 */
export async function createWithTruncationGuard(
  client: Anthropic,
  stage: string,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const originalMaxTokens = params.max_tokens;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const maxTokens = attempt === 1 ? originalMaxTokens : Math.min(originalMaxTokens * 2, 16000);
    const response = await client.messages.create({ ...params, max_tokens: maxTokens });
    if (response.stop_reason !== "max_tokens") return response;
    if (attempt === 2) throw new TruncatedResponseError(stage, maxTokens);
  }
  throw new Error("unreachable");
}

export const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;

// REFRAME.md item 1 set this to 45s, "bounded well above any real call's
// observed wall time" -- unmeasured, as it turned out. FOUNDATION-2 item 3
// measured every stage's real prompt, at its real token cap, against the
// real world source, several times, on a live Claude subscription (not
// this Worker's own key -- see FOUNDATION-2.md's own report for the full
// method and numbers): ground ~15-17s, plan ~40-51s (already over 45s on
// one of three reps), implement ~82-84s, fix ~114s, retrospective ~21s.
// 45s was never enough for implement or fix -- both routinely exceed it,
// which independently explains runs that looked lost after Gate 1: the
// SDK-level timeout fired mid-call with no server-side trace saved (see
// FOUNDATION-2 item 4's fix for that half of the problem).
//
// 85s is chosen, not a rounder or larger number, because Cloudflare
// Workers appears to hard-cap a single outbound subrequest around 90-100s
// regardless of what timeout this SDK is given (community-reported, not
// authoritatively documented -- see FOUNDATION-2.md's report) -- raising
// this past that ceiling would be pricing headroom the platform won't
// honor. It comfortably covers ground/plan/retrospective and most
// implement calls. It does NOT reliably cover fix, whose single measured
// rep (114s) exceeds even the platform ceiling this constant is already
// pressed against -- no SDK timeout value fixes that; the real backstop
// for fix specifically is the checkpoint-and-resume behavior in
// changePipeline.ts (a stage that still fails here parks resumably
// instead of losing the run), not this number.
export const STAGE_CALL_TIMEOUT_MS = 85_000;

// Three models spanning a real capability/price range: the cheapest credible
// option, a mid-tier default, and a frontier model. See docs/BUILD.md for why
// these three.
export const MODELS = ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8"];

// Per-MTok USD pricing. Claude Sonnet 5 is running introductory pricing
// through 2026-08-31 ($2/$10 instead of the standard $3/$15) -- update that
// row once the window closes. Everything else in this file is price-agnostic.
export const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-opus-4-8": { input: 5.0, output: 25.0 },
};

const CODE_SCHEMA = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description:
        "The JavaScript statements that go inside the function body. Do not include the function signature, wrapping braces, comments explaining the task, or markdown fences -- just the statements.",
    },
  },
  required: ["code"],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  "You write a single JavaScript function body for a well-specified task. " +
  "Return only the function body statements via the code field -- no signature, no fences, no prose.";

function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model];
  if (!price) throw new Error(`No pricing entry for model "${model}" -- add one before using it`);
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

function promptFor(task: Task): string {
  return `${task.prompt}\n\nThe function signature is: ${task.functionName}(${task.paramNames.join(", ")})`;
}

async function callForCode(
  client: Anthropic,
  kv: KVNamespace,
  capUsd: number,
  model: string,
  messages: Anthropic.MessageParam[],
): Promise<GenerationResult> {
  // Worst-case cost estimate for the cap check: measured input tokens plus
  // the full max_tokens output budget priced at the output rate. Deliberately
  // pessimistic -- the actual call almost always costs less, which is fine,
  // the cap check just needs to never let a call through that could blow it.
  const counted = await client.messages.countTokens({ model, system: SYSTEM_PROMPT, messages });
  const worstCaseCost = costUsd(model, counted.input_tokens, MAX_TOKENS);
  await assertUnderCap(kv, capUsd, worstCaseCost);

  const start = Date.now();
  const response = await createWithTruncationGuard(client, "generateFunctionBody/repairFunctionBody", {
    model,
    max_tokens: MAX_TOKENS,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    messages,
    output_config: {
      format: { type: "json_schema", schema: CODE_SCHEMA },
    },
  });
  const wallTimeMs = Date.now() - start;

  if (response.stop_reason === "refusal") {
    throw new Error("Generation request was refused by Claude's safety classifiers");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text content in response (stop_reason: ${response.stop_reason})`);
  }

  let code: string;
  try {
    code = JSON.parse(textBlock.text).code;
  } catch (e) {
    throw new Error(`Failed to parse structured output as JSON: ${String(e)}`);
  }
  if (typeof code !== "string" || code.length === 0) {
    throw new Error("Model returned empty or non-string code field");
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const actualCost = costUsd(model, inputTokens, outputTokens);
  await recordSpend(kv, actualCost);

  return { code, model, inputTokens, outputTokens, costUsd: actualCost, wallTimeMs };
}

export async function generateFunctionBody(
  apiKey: string,
  kv: KVNamespace,
  capUsd: number,
  task: Task,
  model: string = DEFAULT_MODEL,
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  return callForCode(client, kv, capUsd, model, [{ role: "user", content: promptFor(task) }]);
}

/**
 * One repair attempt: shows the model its own previous code plus the exact
 * hidden-test failures (name, args, expected vs actual/error -- no other
 * hidden tests are revealed) and asks for a corrected function body.
 */
export async function repairFunctionBody(
  apiKey: string,
  kv: KVNamespace,
  capUsd: number,
  task: Task,
  previousCode: string,
  failures: TestResult[],
  model: string = DEFAULT_MODEL,
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });

  const failureText = failures
    .map((f) => {
      if (f.error) return `- "${f.name}": threw an error: ${f.error}`;
      return `- "${f.name}": expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`;
    })
    .join("\n");

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: promptFor(task) },
    { role: "assistant", content: JSON.stringify({ code: previousCode }) },
    {
      role: "user",
      content:
        `That implementation fails ${failures.length} test(s):\n${failureText}\n\n` +
        `Return a corrected function body via the code field. Same rules as before -- statements only, no signature, no fences.`,
    },
  ];

  return callForCode(client, kv, capUsd, model, messages);
}

// ---------------------------------------------------------------------
// CALIPER pipeline (REBUILD.md): presets need a full self-contained HTML
// artifact back, not a bare function body, and a much larger token budget
// (docs/REBUILD-PROPOSAL.md's measurement hit the old 3000-token cap mid-
// artifact). These are deliberately separate from callForCode above rather
// than a parameterized version of it -- different schema, different system
// prompt, and no call into spendCap.ts: the pipeline has its own, separate
// daily/monthly budget (src/controlLayer.ts) rather than drawing on the
// original experiment's lifetime cap, and the orchestrator (src/pipeline.ts)
// is the single place that enforces it, alongside the circuit breaker.
// ---------------------------------------------------------------------

const ARTIFACT_SCHEMA = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "The complete contents of a single self-contained HTML file, starting with <!doctype html>.",
    },
  },
  required: ["code"],
  additionalProperties: false,
};

const ARTIFACT_SYSTEM_PROMPT =
  "You write a single self-contained interactive HTML/JS artifact for a well-specified task. " +
  "Return only the complete HTML file via the code field -- no markdown fences, no prose.";

async function callForArtifact(
  client: Anthropic,
  model: string,
  maxTokens: number,
  messages: Anthropic.MessageParam[],
  system: string = ARTIFACT_SYSTEM_PROMPT,
  schema: Record<string, unknown> = ARTIFACT_SCHEMA,
): Promise<GenerationResult> {
  const start = Date.now();
  const response = await createWithTruncationGuard(client, "generateArtifact/implementChange/fixChange", {
    model,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system,
    messages,
    output_config: {
      format: { type: "json_schema", schema },
    },
  });
  const wallTimeMs = Date.now() - start;

  if (response.stop_reason === "refusal") {
    throw new Error("Generation request was refused by Claude's safety classifiers");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text content in response (stop_reason: ${response.stop_reason})`);
  }

  let code: string;
  try {
    code = JSON.parse(textBlock.text).code;
  } catch (e) {
    throw new Error(`Failed to parse structured output as JSON: ${String(e)}`);
  }
  if (typeof code !== "string" || code.length === 0) {
    throw new Error("Model returned empty or non-string code field");
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { code, model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), wallTimeMs };
}

export async function generateArtifact(
  apiKey: string,
  task: Task,
  model: string,
  maxTokens: number,
  correctionHint?: string,
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const content = correctionHint ? `${promptFor(task)}\n\n${correctionHint}` : promptFor(task);
  return callForArtifact(client, model, maxTokens, [{ role: "user", content }]);
}

/** One fix round: shows the model its own artifact plus the reviewer's
 * [MATERIAL]-tagged findings (nits are not sent -- fixing them isn't
 * required and burns budget on findings that never gate anything) and asks
 * for a corrected, complete artifact. */
export async function repairArtifact(
  apiKey: string,
  task: Task,
  previousArtifact: string,
  materialFindings: string[],
  model: string,
  maxTokens: number,
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const findingsText = materialFindings.map((f) => `- ${f}`).join("\n");
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: promptFor(task) },
    { role: "assistant", content: JSON.stringify({ code: previousArtifact }) },
    {
      role: "user",
      content:
        `An independent reviewer found ${materialFindings.length} material issue(s) with that artifact:\n${findingsText}\n\n` +
        `Return a corrected, complete HTML file via the code field that addresses every one of them. Same rules as before -- no fences, no prose.`,
    },
  ];
  return callForArtifact(client, model, maxTokens, messages);
}

export interface TextGenerationResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wallTimeMs: number;
}

const BRIEF_SYSTEM_PROMPT =
  "You write a short Why / What / Must-NOT brief stating your own understanding of the " +
  "machine-verifiable-in-spirit acceptance criteria for the interactive artifact described below, " +
  "before writing any code. Be concise -- a few bullet points per section. This is your own " +
  "self-assessment of what you're about to build, not independently verified ground truth.";

/** Free-form path only: no pre-authored ground truth exists for a custom
 * prompt, so the "brief" here is the model's own stated understanding --
 * shown to the visitor as such, a weaker guarantee than a preset's hidden,
 * hand-authored criteria (see docs/REBUILD-PROPOSAL.md §1). */
// ---------------------------------------------------------------------
// CALIPER v2 (BUILD-V2.md): plan mode + modifying existing code, replacing
// the preset-generation design above (kept in place for now; superseded,
// not yet deleted). Plan mode's acceptance criteria are real, structured,
// machine-checkable test cases the model proposes -- not prose -- so
// "judged before any code exists" is literal: they run against the
// implementation the moment they're approved, same mechanism as the
// hand-authored regression suite.
//
// CALIPER world-build (BUILD-WORLD.md, chunk 6): ProposedCriterion moved to
// src/criteria.ts and its shape changed on purpose -- there is no longer
// any field that can carry a model-computed value. Root cause, established
// with evidence across this project's own history: the old shape let a
// criterion assert "applyAction(...) === {money: 95, hunger: 55}", a
// number produced by the model doing multi-step arithmetic in its head,
// with nothing to check its own work. Eleven of sixteen historical
// refusals traced to exactly that -- a criterion's asserted value
// contradicting the plan's own stated mechanism. See src/criteria.ts for
// the four kinds that replaced it.
// ---------------------------------------------------------------------

export interface ChangePlan {
  understoodIntent: string;
  willBuild: string;
  criteria: ProposedCriterion[];
  willNotTouch: string;
  question: string | null;
  // FOUNDATION-2 ("emit the change, not the file"): which path implement
  // will take -- decided HERE, at plan time, visible to the visitor at
  // Gate 1 before anything is built, not a choice implement makes silently
  // on its own. "data-edit" means the change is fully expressible as a
  // WorldEdit (src/worldEdit.ts) -- a placement, a new type plus a
  // placement, a colour override, a surface field -- applied deterministically
  // to the real current world, never a regenerated file. "source-edit" is
  // the fallback for a request that genuinely needs new simulation logic
  // (a new action, a new entity kind, a new subsystem) -- the only case a
  // full-file rewrite is actually necessary.
  implementationPath: "data-edit" | "source-edit";
}

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    understoodIntent: { type: "string", description: "What you understood the visitor wants, in your own words." },
    willBuild: { type: "string", description: "What you will concretely build or change." },
    criteria: {
      type: "array",
      description:
        "Real, checkable claims about the NEW behavior -- but never a specific computed value you work out by hand. " +
        "Each criterion must be existence (a function/field exists and is callable), structural (a field has the " +
        "right type or count), non-regression (a call's result is compared against the BASELINE's own output for " +
        "the same call -- the baseline is actually run to get that value, you never supply it), or render (a " +
        "station/entity type draws without throwing). There is no field anywhere in this schema for you to write " +
        'a specific expected number or object into -- if you find yourself thinking "the answer should be 55", ' +
        "that is exactly the kind of claim this format cannot express, on purpose: multi-step arithmetic worked " +
        "out by hand and asserted as ground truth is how every one of this project's past failures happened.",
      items: CRITERION_SCHEMA,
    },
    willNotTouch: { type: "string", description: "What stays exactly as it is." },
    question: {
      type: ["string", "null"],
      description:
        "A specific question to ask the visitor, only if the request is genuinely ambiguous in a way that changes what you'd build, or asks for something you can't independently verify. Null if none -- most requests don't need one.",
    },
    implementationPath: {
      type: "string",
      enum: ["data-edit", "source-edit"],
      description:
        '"data-edit" if this change is fully expressible as adding a placement, adding a new object type plus a placement, overriding a placement\'s colour, or changing a surface\'s material/colour -- the structure summary\'s cheap-operations list. "source-edit" ONLY if the change genuinely needs new simulation logic (a new sim action, a new entity kind, a new subsystem) that touches chooseAction/applyAction/tick or adds real code -- never choose source-edit just because the request "sounds like" a bigger ask; judge it against what the change actually requires, the same tiers used to size willBuild.',
    },
  },
  required: ["understoodIntent", "willBuild", "criteria", "willNotTouch", "question", "implementationPath"],
  additionalProperties: false,
};

const PLAN_SYSTEM_PROMPT =
  "You are planning a change to an existing, working small simulated world, before writing any code -- " +
  "mirroring the real practice of a plan written and approved before implementation starts. Read the " +
  "current source, the structure summary, and the change request. Produce a plan: what you understood, " +
  "what you will concretely build, and a list of checkable criteria for the new behavior. " +
  // FOUNDATION.md item 2: the structure summary below states, plainly,
  // which operations are cheap -- placing another instance of an existing
  // type, overriding a colour, adding a new type plus a placement -- versus
  // the genuinely expensive case of a new sim action, entity kind, or
  // subsystem. Judge scope against that list, not against how much code
  // the request happens to touch: a one-line placements append is cheap
  // even though it's a change to the same file a whole new subsystem
  // would also touch. Treating every change as equally uncertain is how a
  // request as ordinary as adding another lamp post ends up refused.
  "Judge how big a change is against the structure summary's stated cheap-versus-expensive tiers, not " +
  "against how much of the file the request happens to touch. " +
  // FOUNDATION-2 ("emit the change, not the file"): implementationPath is
  // a real, structural decision, not a formality -- data-edit means
  // implement never regenerates the file at all, applying a small
  // deterministic edit instead, at a fraction of the cost and time.
  // Defaulting to source-edit when data-edit would actually work is the
  // same mistake as an unnecessary refusal: treating a cheap operation as
  // an expensive one.
  "Set implementationPath to \"data-edit\" whenever the change is a placement, a new type plus a placement, " +
  "a colour override, or a surface change -- the structure summary's cheap-operations list, almost always. " +
  "Reserve \"source-edit\" for a change that genuinely needs new simulation logic. " +
  "Every criterion must be existence, structural, non-regression, or render (see the criteria field's own " +
  "description for what each means) -- never a criterion that names a specific value you computed by hand. " +
  "That restriction is enforced by the schema itself, not just this instruction: there is no field to put " +
  "a computed value into. State what you will deliberately leave untouched. Describe willBuild in terms " +
  "of what it adds, what it touches, and what it might break -- not in economic terms just because the " +
  "world happens to track money as one of its fields. Only frame something economically if the request " +
  "itself is actually about money or wages. If, and only if, the request " +
  "is genuinely ambiguous in a way that would change what you build, or asks for something you cannot " +
  "independently verify, ask ONE specific question about that specific thing -- state the sensible " +
  "default you chose instead of asking, wherever you can reasonably choose one yourself.";

type RawPlanCriterion = { kind: unknown; description: unknown; fn: unknown; argsJson: unknown; field: unknown; check: unknown; expectedType: unknown; minCount: unknown; repeat: unknown; stationOrEntityKey: unknown };
type RawPlan = { understoodIntent: string; willBuild: string; criteria: RawPlanCriterion[]; willNotTouch: string; question: string | null; implementationPath?: unknown };

export async function generatePlan(
  apiKey: string,
  currentSource: string,
  regressionSummary: string,
  changeRequest: string,
  clarification: string | null,
  maxTokens: number,
  priorLessons: string = "",
  groundingNote: string | null = null,
): Promise<{ plan: ChangePlan; model: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number }> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const userContent =
    (priorLessons ? `Lessons recorded from previous runs -- apply any that are relevant here:\n${priorLessons}\n\n` : "") +
    `Current source:\n${currentSource}\n\n` +
    // FOUNDATION.md item 2: the same code-derived structure summary
    // grounding reads, including its cheap-operations tiering -- sent here
    // too, not just relied on secondhand through grounding's note, so the
    // plan stage judges scope against the real tiers directly.
    `Structure summary (generated directly from the code):\n${structureSummary()}\n\n` +
    `Existing regression checks that must keep passing unless the request specifically asks to change ` +
    `that behavior:\n${regressionSummary}\n\n` +
    // Grounding (FINISH.md chunk 7) ran before this call and already
    // checked the request's premises against the real, code-derived
    // structure -- these are facts, not a suggestion, and the plan must
    // not contradict them (e.g. propose adding a second location if
    // grounding just said none exists).
    (groundingNote ? `Grounding already checked this request against the real current structure:\n${groundingNote}\n\n` : "") +
    `Change request: ${changeRequest}` +
    (clarification ? `\n\nThe visitor added, in their own words -- treat this as redirecting or clarifying the request above, not a separate one: ${clarification}` : "");

  async function attempt(content: string): Promise<{ response: Anthropic.Message; raw: RawPlan }> {
    const response = await createWithTruncationGuard(client, "generatePlan", {
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      system: PLAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
    });
    if (response.stop_reason === "refusal") throw new Error("Plan request was refused by Claude's safety classifiers");
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error(`No text content in plan response (stop_reason: ${response.stop_reason})`);
    let raw: RawPlan;
    try {
      raw = JSON.parse(textBlock.text);
    } catch (e) {
      throw new Error(`Failed to parse plan JSON: ${String(e)}`);
    }
    return { response, raw };
  }

  let { response, raw } = await attempt(userContent);
  let { accepted, rejected } = validateProposedCriteria(raw.criteria);
  // Schema-level rejection with a clear reason (BUILD-WORLD.md chunk 6):
  // a criterion smuggling a computed value, malformed argsJson, or an
  // otherwise invalid shape is never silently dropped or silently trusted
  // -- it's named back to the model once, asking it to re-emit only the
  // rejected ones. If any are still invalid after that, they're dropped
  // and the plan proceeds with whatever's left -- an empty criteria list
  // is already a legitimate, supported outcome (decideStillFailing), so a
  // plan is never hard-failed over criteria quality the way a truncated or
  // unparseable response is.
  if (rejected.length > 0) {
    const correction =
      `${userContent}\n\nYour previous response proposed ${rejected.length} criterion/criteria that were rejected:\n` +
      rejected.map((r) => `- ${JSON.stringify(r.raw)}: ${r.reason}`).join("\n") +
      `\n\nRe-emit the full criteria list, replacing only the rejected ones with valid existence/structural/` +
      `non-regression/render criteria (or omit them if the underlying claim can't be expressed that way). Keep every criterion that wasn't listed as rejected.`;
    ({ response, raw } = await attempt(correction));
    const retryResult = validateProposedCriteria(raw.criteria);
    accepted = retryResult.accepted;
    rejected = retryResult.rejected;
  }
  // validate-before-consume: the schema forces implementationPath to one of
  // two enum values at the API layer, but this function doesn't assume
  // that layer held (same discipline as parseGroundingResponse) -- an
  // unrecognized value defaults to the safe, always-correct fallback
  // rather than crashing the plan or silently taking the cheap path on
  // bad data.
  const implementationPath: "data-edit" | "source-edit" = raw.implementationPath === "data-edit" ? "data-edit" : "source-edit";
  const plan: ChangePlan = { understoodIntent: raw.understoodIntent, willBuild: raw.willBuild, criteria: accepted, willNotTouch: raw.willNotTouch, question: raw.question, implementationPath };

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { plan, model: DEFAULT_MODEL, inputTokens, outputTokens, costUsd: costUsd(DEFAULT_MODEL, inputTokens, outputTokens), wallTimeMs: Date.now() - start };
}

const CHANGE_SCHEMA = {
  type: "object",
  properties: {
    code: { type: "string", description: "The complete modified source file, replacing the current one in full." },
  },
  required: ["code"],
  additionalProperties: false,
};

const CHANGE_SYSTEM_PROMPT =
  "You modify an existing, working plain-JavaScript source file implementing a small life-simulation, " +
  "per an approved plan. The current source is pure logic -- no HTML, no DOM, no <script> tags, no UI " +
  "of any kind -- and your output must be in that exact same shape: plain JavaScript statements only, " +
  "nothing else. Do NOT wrap it in an HTML document, a <script> tag, or markdown fences, even though " +
  "the change request describes a visible feature -- a visual interface is a separate, later concern " +
  "that this step does not touch. Preserve all existing behavior not covered by the plan exactly -- a " +
  "regression suite will check this by loading your output as a plain JavaScript module. Implement " +
  "every criterion in the plan exactly. Return the complete modified source via the code field.";

/** validate-before-consume: the sandbox loads this as a plain JS module, so
 * an HTML-wrapped response isn't a smaller problem than a truncated one --
 * it's the same class of defect (content that looks plausible but isn't
 * what the consumer needs), found the same way, by actually running it: a
 * real implement call ignored the "plain JavaScript only" instruction the
 * first time this ran and wrapped the change in a full HTML/UI document,
 * which failed to load as a module and silently verified as "0 of 0 checks
 * failed" until this existed to catch it. */
function looksLikeHtmlWrapped(code: string): boolean {
  return /<!doctype|<html[\s>]|<script[\s>]/i.test(code);
}

export async function implementChange(
  apiKey: string,
  currentSource: string,
  plan: ChangePlan,
  changeRequest: string,
  model: string,
  maxTokens: number,
  priorLessons: string = "",
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const criteriaText = plan.criteria.map((c) => `- ${describeCriterion(c)}`).join("\n");
  const baseContent =
    (priorLessons ? `Lessons recorded from previous runs -- apply any that are relevant here:\n${priorLessons}\n\n` : "") +
    `Current source:\n${currentSource}\n\n` +
    `Change request: ${changeRequest}\n\n` +
    `Approved plan:\nWill build: ${plan.willBuild}\nWill not touch: ${plan.willNotTouch}\n\n` +
    `It must satisfy these exact test cases:\n${criteriaText}`;

  let result = await callForArtifact(client, model, maxTokens, [{ role: "user", content: baseContent }], CHANGE_SYSTEM_PROMPT, CHANGE_SCHEMA);
  if (looksLikeHtmlWrapped(result.code)) {
    const correction =
      `${baseContent}\n\nYour previous response wrapped the code in an HTML document. Return ONLY plain ` +
      `JavaScript statements, in the exact same shape as "Current source" above -- no <!doctype>, no ` +
      `<html>, no <script> tags, no markdown fences.`;
    result = await callForArtifact(client, model, maxTokens, [{ role: "user", content: correction }], CHANGE_SYSTEM_PROMPT, CHANGE_SCHEMA);
    if (looksLikeHtmlWrapped(result.code)) {
      throw new Error("implementChange returned an HTML-wrapped response twice in a row -- treated as a failure, not content.");
    }
  }
  return result;
}

/** One fix round for the modify pipeline: same shape as repairArtifact, but
 * the model is reminded of the plan and criteria too, since a change-request
 * fix needs that context, not just the previous failures. */
export async function fixChange(
  apiKey: string,
  currentSource: string,
  plan: ChangePlan,
  previousCode: string,
  materialFindings: string[],
  model: string,
  maxTokens: number,
  verificationFailures: string[] = [],
  stillPassing: string[] = [],
  priorLessons: string = "",
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const findingsText = materialFindings.map((f) => `- ${f}`).join("\n");
  // validate-before-consume, applied to the fix stage itself: the reviewer's
  // MATERIAL findings and the regression/criteria failures are two
  // different signals, and only sending the first one to the fix call
  // means a real, more severe defect the suite caught (but the reviewer
  // phrased more narrowly, or didn't mention at all) never reaches the
  // model asked to fix it. Found by actually running this: 6 of 9
  // regression checks crashed on a bug the reviewer also flagged, but only
  // in passing as part of one of its four required yes/no answers -- not
  // as a [MATERIAL] line -- so without this, the fix would have addressed
  // only the narrower finding and left the crash in place.
  const verificationText = verificationFailures.length
    ? `\n\nVerification also failed these checks:\n${verificationFailures.map((f) => `- ${f}`).join("\n")}`
    : "";
  // A second, independently-found instance of the same mistake: this fix
  // stage was only ever told what was broken, never what already worked --
  // and a real fix attempt repaired a crash while breaking six previously-
  // passing checks in the same edit, because nothing told it those checks
  // existed. Passing evidence is not optional context; it's half of what
  // "don't break this" requires the model to know.
  const passingText = stillPassing.length
    ? `\n\nThese checks currently pass -- your fix must keep returning exactly these results for them, unchanged:\n${stillPassing.map((f) => `- ${f}`).join("\n")}`
    : "";
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        (priorLessons ? `Lessons recorded from previous runs -- apply any that are relevant here:\n${priorLessons}\n\n` : "") +
        `Original source before this change:\n${currentSource}\n\nChange being made: ${plan.willBuild}`,
    },
    { role: "assistant", content: JSON.stringify({ code: previousCode }) },
    {
      role: "user",
      content:
        `An independent reviewer found ${materialFindings.length} material issue(s):\n${findingsText}${verificationText}${passingText}\n\n` +
        `Return a corrected, complete source file via the code field that addresses every failing check above without breaking any of the passing ones. ` +
        `Plain JavaScript only -- no HTML, no <script> tags, no markdown fences.`,
    },
  ];
  let result = await callForArtifact(client, model, maxTokens, messages, CHANGE_SYSTEM_PROMPT, CHANGE_SCHEMA);
  if (looksLikeHtmlWrapped(result.code)) {
    messages.push(
      { role: "assistant", content: JSON.stringify({ code: result.code }) },
      { role: "user", content: "That response wrapped the code in an HTML document. Return ONLY plain JavaScript statements -- no <!doctype>, no <html>, no <script> tags, no markdown fences." },
    );
    result = await callForArtifact(client, model, maxTokens, messages, CHANGE_SYSTEM_PROMPT, CHANGE_SCHEMA);
    if (looksLikeHtmlWrapped(result.code)) {
      throw new Error("fixChange returned an HTML-wrapped response twice in a row -- treated as a failure, not content.");
    }
  }
  return result;
}

// ---------------------------------------------------------------------
// FOUNDATION-2 ("emit the change, not the file"): implementChange/fixChange
// above ask a model to reproduce the ENTIRE ~16KB source for every change,
// even a one-line placements append -- measured at 79-143s for implement,
// never completing within 300s for fix (see FOUNDATION-2.md's own
// report). When plan.implementationPath === "data-edit", these two
// functions are used instead: the model returns a handful of WorldEdit
// ops (src/worldEdit.ts) -- add a type, add a placement, override a
// colour, change a surface -- and the server applies them deterministically.
// No file regeneration, no text-diff context matching, and the output
// contract stays identical (GenerationResult.code, the resulting source)
// so changePipeline.ts's verify/fix/review/ship logic needs no changes at
// all -- it can't tell which path produced the code it's checking.
// ---------------------------------------------------------------------

const WORLD_EDIT_SYSTEM_PROMPT =
  "You produce a small, structured edit to a simulated world's DATA -- never source code, never prose, " +
  "never a regenerated file. The world is a type registry (objectTypes) and a placement list; describe " +
  "exactly what changes as one or more operations: addObjectType (a genuinely new type plus its geometry " +
  "recipe, built from primitive shapes -- box, cylinder, sphere, icosahedron), addPlacement (an instance of " +
  "an existing type, or one you are adding in this same edit), overridePlacement (a colour override on one " +
  "existing placement, by its real id), or setSurfaceField (a surface's material or colour, by its real " +
  "key). Return ONLY the ops array via the schema. Every type key, placement id, and surface key you " +
  "reference must be a REAL one from the current world shown to you, or one you are adding in this same " +
  "edit -- never invent or guess a name.";

async function callForWorldEdit(client: Anthropic, model: string, maxTokens: number, messages: Anthropic.MessageParam[]): Promise<{ edit: WorldEdit; response: Anthropic.Message }> {
  const response = await createWithTruncationGuard(client, "implementChangeAsEdit/fixChangeAsEdit", {
    model,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system: WORLD_EDIT_SYSTEM_PROMPT,
    messages,
    output_config: { format: { type: "json_schema", schema: WORLD_EDIT_SCHEMA } },
  });
  if (response.stop_reason === "refusal") throw new Error("World-edit request was refused by Claude's safety classifiers");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error(`No text content in world-edit response (stop_reason: ${response.stop_reason})`);
  let raw: { ops: unknown[] };
  try {
    raw = JSON.parse(textBlock.text);
  } catch (e) {
    throw new Error(`Failed to parse world-edit JSON: ${String(e)}`);
  }
  const edit = parseRawWorldEdit(raw);
  return { edit, response };
}

/** The data-edit counterpart to implementChange -- same call signature and
 * same GenerationResult return shape (code = the resulting source), so
 * changePipeline.ts branches only on which of these two it calls, nothing
 * downstream. worldSource is the world the edit applies against (the
 * CURRENT one, evaluated fresh at validation time -- never trusted from
 * the model's own claim about it). Retries once, with the specific
 * rejection reason, on an edit that fails validateWorldEdit; two
 * rejections in a row is a real failure, not silently accepted or
 * silently downgraded to a source-edit -- the visitor approved a
 * data-edit plan, not a promise to fall back quietly. */
export async function implementChangeAsEdit(
  apiKey: string,
  worldSource: string,
  plan: ChangePlan,
  changeRequest: string,
  model: string,
  maxTokens: number,
  priorLessons: string = "",
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const criteriaText = plan.criteria.map((c) => `- ${describeCriterion(c)}`).join("\n");
  const baseContent =
    (priorLessons ? `Lessons recorded from previous runs -- apply any that are relevant here:\n${priorLessons}\n\n` : "") +
    `Current world source (evaluate this to see the real objectTypes/placements/surfaces before naming anything):\n${worldSource}\n\n` +
    `Change request: ${changeRequest}\n\n` +
    `Approved plan:\nWill build: ${plan.willBuild}\nWill not touch: ${plan.willNotTouch}\n\n` +
    `It must satisfy these exact test cases:\n${criteriaText}`;

  async function attempt(content: string) {
    const { edit, response } = await callForWorldEdit(client, model, maxTokens, [{ role: "user", content }]);
    return { edit, response, result: runValidatedWorldEdit(worldSource, edit) };
  }

  let { response, result } = await attempt(baseContent);
  if (!result.ok) {
    const correction =
      `${baseContent}\n\nYour previous edit was invalid: ${result.reason}\n\n` +
      `Re-emit a corrected ops array, referencing only real type keys, placement ids, and surface keys from the current world shown above.`;
    ({ response, result } = await attempt(correction));
    if (!result.ok) throw new Error(`implementChangeAsEdit: world edit invalid twice in a row -- treated as a failure, not content: ${result.reason}`);
  }
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { code: result.source, model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), wallTimeMs: Date.now() - start };
}

/** The data-edit counterpart to fixChange. previousWorldSource is the
 * LATEST attempt (already carrying whatever the prior edit applied) -- a
 * fix edit is applied on top of it, describing what changes NEXT, the
 * same "keep building on the real current state" shape addPlacement/
 * overridePlacement already have. */
export async function fixChangeAsEdit(
  apiKey: string,
  plan: ChangePlan,
  previousWorldSource: string,
  materialFindings: string[],
  model: string,
  maxTokens: number,
  verificationFailures: string[] = [],
  stillPassing: string[] = [],
  priorLessons: string = "",
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const findingsText = materialFindings.map((f) => `- ${f}`).join("\n");
  const verificationText = verificationFailures.length ? `\n\nVerification also failed these checks:\n${verificationFailures.map((f) => `- ${f}`).join("\n")}` : "";
  const passingText = stillPassing.length ? `\n\nThese checks currently pass -- your edit must not break them:\n${stillPassing.map((f) => `- ${f}`).join("\n")}` : "";
  const baseContent =
    (priorLessons ? `Lessons recorded from previous runs -- apply any that are relevant here:\n${priorLessons}\n\n` : "") +
    `Current world source, including the previous edit already applied (evaluate this to see the real current state):\n${previousWorldSource}\n\n` +
    `Change being made: ${plan.willBuild}\n\n` +
    (materialFindings.length ? `An independent reviewer found ${materialFindings.length} material issue(s):\n${findingsText}` : "") +
    verificationText + passingText +
    `\n\nReturn a corrective ops array via the schema that addresses every failing check above without breaking any of the passing ones.`;

  async function attempt(content: string) {
    const { edit, response } = await callForWorldEdit(client, model, maxTokens, [{ role: "user", content }]);
    return { edit, response, result: runValidatedWorldEdit(previousWorldSource, edit) };
  }

  let { response, result } = await attempt(baseContent);
  if (!result.ok) {
    const correction = `${baseContent}\n\nYour previous edit was invalid: ${result.reason}\n\nRe-emit a corrected ops array, referencing only real names from the current world shown above.`;
    ({ response, result } = await attempt(correction));
    if (!result.ok) throw new Error(`fixChangeAsEdit: world edit invalid twice in a row -- treated as a failure, not content: ${result.reason}`);
  }
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { code: result.source, model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), wallTimeMs: Date.now() - start };
}

export async function generateBrief(apiKey: string, freeformPrompt: string, maxTokens: number): Promise<TextGenerationResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const response = await createWithTruncationGuard(client, "generateBrief", {
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system: BRIEF_SYSTEM_PROMPT,
    messages: [{ role: "user", content: freeformPrompt }],
  });
  const wallTimeMs = Date.now() - start;
  if (response.stop_reason === "refusal") {
    throw new Error("Brief request was refused by Claude's safety classifiers");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  if (!text) throw new Error("Model returned an empty brief");
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { text, model: DEFAULT_MODEL, inputTokens, outputTokens, costUsd: costUsd(DEFAULT_MODEL, inputTokens, outputTokens), wallTimeMs };
}

// ---------------------------------------------------------------------
// CALIPER v2, BUILD-V2.md step 4: "a retrospective stage runs after each
// completed run... extracts what was learned, and updates a persistent
// instructions file". Runs once per TERMINAL outcome (shipped or refused --
// never for a halted run, which isn't finished), and is deliberately
// allowed to say there is nothing to learn: a lesson invented to look
// thorough is worse than an empty one, same principle as the reviewer's
// "a clean review is a real, valid outcome" instruction.
// ---------------------------------------------------------------------

const RETROSPECTIVE_SCHEMA = {
  type: "object",
  properties: {
    lesson: {
      type: ["string", "null"],
      description:
        "One short, concrete, actionable instruction for future runs -- something a future plan, " +
        "implementation, or review should do differently -- or null if nothing about this run " +
        "generalizes beyond it.",
    },
  },
  required: ["lesson"],
  additionalProperties: false,
};

const RETROSPECTIVE_SYSTEM_PROMPT =
  "You review the record of one completed change-pipeline run and extract at most one lesson for " +
  "future runs. A lesson must be a short, general, actionable instruction (e.g. \"when a fix " +
  "touches a field other parts of the world may not have, only attach it where it was already " +
  "present\") -- not a summary of what happened, not praise, not a restatement of the change " +
  "request. If nothing here generalizes to a different change request, return null for the lesson " +
  "-- that is a valid, common outcome, not a failure to find something.";

export interface RetrospectiveResult {
  lesson: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wallTimeMs: number;
}

export async function runRetrospective(apiKey: string, runSummary: string, maxTokens = 300, model: string = DEFAULT_MODEL): Promise<RetrospectiveResult> {
  const client = new Anthropic({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const response = await createWithTruncationGuard(client, "runRetrospective", {
    model,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system: RETROSPECTIVE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: runSummary }],
    output_config: { format: { type: "json_schema", schema: RETROSPECTIVE_SCHEMA } },
  });
  const wallTimeMs = Date.now() - start;
  if (response.stop_reason === "refusal") throw new Error("Retrospective request was refused by Claude's safety classifiers");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error(`No text content in retrospective response (stop_reason: ${response.stop_reason})`);

  let lesson: string | null;
  try {
    lesson = JSON.parse(textBlock.text).lesson;
  } catch (e) {
    throw new Error(`Failed to parse retrospective JSON: ${String(e)}`);
  }
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { lesson, model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), wallTimeMs };
}
