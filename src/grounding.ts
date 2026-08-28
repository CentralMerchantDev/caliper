// CALIPER world-build (BUILD-WORLD.md, chunk 5): the grounding stage
// PROCESS-ALIGNMENT.md named and was never built. Runs before planning ever
// starts: reads the real, code-derived structure (src/worldStructure.ts --
// no assumption, no memory of a past run), checks whether the request's
// premises actually hold against it, and -- if not -- halts with the
// specific false premise and a concrete alternative, instead of letting a
// plan get written against something that isn't true.
//
// Split from claude.ts on purpose: everything below the model call is a
// pure function (prompt text in, or a raw parsed response in; a decision
// out), so this whole stage's LOGIC is testable with fixtures and never
// needs a live call to verify -- only groundRequest() itself, the one
// function that actually talks to Anthropic, needs a real API key, and it's
// a thin, untested-tonight wrapper around the pure functions here. That's
// the split BUILD-WORLD.md asked for: "one model call to run -- that
// happens in chunk 9, not tonight."
import Anthropic from "@anthropic-ai/sdk";
import { createWithTruncationGuard, PRICING } from "./claude";
import type { TextGenerationResult } from "./claude";
import { structureSummary } from "./worldStructure";

export interface GroundingResult {
  /** True iff every premise the request depends on is actually true of the
   * current code. False premises block planning entirely -- this is not a
   * severity/confidence score, it's a boolean gate. */
  premisesHold: boolean;
  /** Empty when premisesHold is true. Each entry names ONE specific false
   * assumption, in terms a visitor can verify against the code themselves
   * (never "this seems unsupported" -- always "X doesn't exist; here's
   * what does"). */
  falsePremises: string[];
  /** One or two sentences: what was checked and what was found. Always
   * present, even when premisesHold is true -- "reviewed, nothing false"
   * is a real, reportable outcome, not a silent pass-through. */
  reasoning: string;
  /** Concrete alternatives the visitor could ask for instead, grounded in
   * what the structure actually supports. Empty when premisesHold is true. */
  alternatives: string[];
}

function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model];
  if (!price) throw new Error(`No pricing entry for model "${model}" -- add one before using it`);
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

export const GROUNDING_SCHEMA = {
  type: "object",
  properties: {
    premisesHold: { type: "boolean", description: "True only if every premise the request depends on is actually true of the current structure below." },
    falsePremises: {
      type: "array",
      items: { type: "string" },
      description: "Specific false assumptions, each verifiable against the structure summary -- empty if premisesHold is true.",
    },
    reasoning: { type: "string", description: "What was checked and what was found, in one or two sentences." },
    alternatives: {
      type: "array",
      items: { type: "string" },
      description: "Concrete alternatives the visitor could ask for instead, grounded in what the structure actually supports -- empty if premisesHold is true.",
    },
  },
  required: ["premisesHold", "falsePremises", "reasoning", "alternatives"],
  additionalProperties: false,
};

export const GROUNDING_SYSTEM_PROMPT =
  "You are grounding a change request against the ACTUAL current structure of a small simulated world, " +
  "before any plan is written. Read the structure summary below -- it is generated directly from the code, " +
  "not a description someone wrote. Check every premise the request depends on against it. " +
  'A path or field existing is not the same as a feature existing -- "there is a room" does not mean ' +
  '"there is a second room". If a premise is false, name exactly which one and cite what the structure ' +
  "summary actually says, then propose a concrete alternative the current structure can support. " +
  "Do not guess about what the code might do -- only use what the structure summary states.";

/** The exact text sent to the model, built once so it's identical between
 * groundRequest() and any test asserting on it -- no duplicated string. */
export function groundingContextBlock(changeRequest: string): string {
  return `Current world structure (generated directly from the code):\n${structureSummary()}\n\nChange request: "${changeRequest}"`;
}

type RawGroundingResponse = {
  premisesHold?: unknown;
  falsePremises?: unknown;
  reasoning?: unknown;
  alternatives?: unknown;
};

/** validate-before-consume, same discipline as parseCriteria in claude.ts:
 * the schema only constrains shape at the API level, not content. A
 * response that technically matches JSON Schema can still have the wrong
 * primitive types slip through certain client paths, or (more likely in
 * practice) claim premisesHold=true while still listing falsePremises --
 * an internally inconsistent response this function refuses to pass
 * through silently. Throws on either kind of malformed input; the caller
 * decides whether to retry. */
export function parseGroundingResponse(raw: RawGroundingResponse): GroundingResult {
  if (typeof raw.premisesHold !== "boolean") throw new Error("grounding response: premisesHold is not a boolean");
  if (!Array.isArray(raw.falsePremises) || !raw.falsePremises.every((p) => typeof p === "string")) {
    throw new Error("grounding response: falsePremises is not a string array");
  }
  if (typeof raw.reasoning !== "string" || raw.reasoning.length === 0) throw new Error("grounding response: reasoning is missing or empty");
  if (!Array.isArray(raw.alternatives) || !raw.alternatives.every((a) => typeof a === "string")) {
    throw new Error("grounding response: alternatives is not a string array");
  }
  // Internal consistency, not just shape: a response claiming premises hold
  // while still listing false ones (or the reverse) is malformed, the same
  // way a criterion asserting a value inconsistent with its own stated
  // mechanism was malformed -- caught here, not passed downstream to be
  // someone else's confusing bug later.
  if (raw.premisesHold && raw.falsePremises.length > 0) {
    throw new Error("grounding response: premisesHold is true but falsePremises is non-empty -- internally inconsistent");
  }
  if (!raw.premisesHold && raw.falsePremises.length === 0) {
    throw new Error("grounding response: premisesHold is false but falsePremises is empty -- no specific premise named");
  }
  return {
    premisesHold: raw.premisesHold,
    falsePremises: raw.falsePremises as string[],
    reasoning: raw.reasoning,
    alternatives: raw.alternatives as string[],
  };
}

export type GroundingOutcome = { outcome: "proceed" } | { outcome: "halt"; report: string };

/** Pure decision function: given a validated GroundingResult, does the
 * pipeline proceed to planning or halt and report? No model call, no I/O --
 * fully deterministic, fully testable. */
export function decideGroundingOutcome(result: GroundingResult): GroundingOutcome {
  if (result.premisesHold) return { outcome: "proceed" };
  return { outcome: "halt", report: formatGroundingHalt(result) };
}

/** The report a visitor reads at a grounding halt -- citing the specific
 * false premise(s) and offering a concrete alternative, per BUILD-WORLD.md
 * chunk 5 ("halt and report, citing specific code, with concrete
 * alternatives") and chunk 7 ("what it cannot do, and why -- citing the
 * actual constraint, with alternatives"). */
export function formatGroundingHalt(result: GroundingResult): string {
  const premisesBlock = result.falsePremises.map((p) => `- ${p}`).join("\n");
  const altBlock = result.alternatives.length ? `\n\nWhat the current structure can support instead:\n${result.alternatives.map((a) => `- ${a}`).join("\n")}` : "";
  return `This request assumes something the current world doesn't have:\n${premisesBlock}\n\n${result.reasoning}${altBlock}`;
}

/** FINISH.md chunk 7: grounding no longer hard-stops the run on its own --
 * its findings feed INTO planning (so the plan stage can honestly scope
 * around a false premise instead of silently trying anyway) and are shown
 * to the visitor alongside the plan at one unified Gate 1, where a human
 * decides what to do about it. This is the text injected into the plan
 * prompt -- present whether premises held or not, since "grounding
 * checked and found nothing false" is itself useful context for the plan
 * stage, not just a pass-through. */
export function formatGroundingForPlan(result: GroundingResult): string {
  if (result.premisesHold) return `Every premise checked out true: ${result.reasoning}`;
  return formatGroundingHalt(result);
}

/**
 * The one function in this file that costs money -- not called by anything
 * tonight (BUILD-WORLD.md: "it needs one model call to run -- that happens
 * in chunk 9, not tonight"). Kept as a thin, directly-readable wrapper
 * around the pure functions above so reviewing this function is reviewing
 * only "does it call the API correctly and parse the result", not "is the
 * grounding logic right" -- that part is already covered without spending
 * anything.
 */
export async function groundRequest(apiKey: string, changeRequest: string, model: string, maxTokens: number): Promise<TextGenerationResult & { result: GroundingResult }> {
  const client = new Anthropic({ apiKey });
  const start = Date.now();
  const response = await createWithTruncationGuard(client, "groundRequest", {
    model,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    system: GROUNDING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: groundingContextBlock(changeRequest) }],
    output_config: { format: { type: "json_schema", schema: GROUNDING_SCHEMA } },
  });
  const wallTimeMs = Date.now() - start;

  if (response.stop_reason === "refusal") throw new Error("Grounding request was refused by Claude's safety classifiers");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error(`No text content in grounding response (stop_reason: ${response.stop_reason})`);

  const result = parseGroundingResponse(JSON.parse(textBlock.text));
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return { result, text: textBlock.text, model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), wallTimeMs };
}
