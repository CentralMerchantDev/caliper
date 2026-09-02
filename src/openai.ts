import OpenAI from "openai";
import { TruncatedResponseError } from "./controlLayer";
import { STAGE_CALL_TIMEOUT_MS } from "./claude";

// Cross-model review (REBUILD.md / REBUILD-CONTROLS.md): a production
// build's real process is "one model authors, a different model reviews".
// Originally defaulted to gpt-5.5 for fidelity to the real pipeline's own
// named reviewer model. FINISH.md/BUILD-WORLD.md's world-build changed that
// call on purpose: this app is demonstrating the BUILD SYSTEM, not which
// model reviews better, so every stage -- including this one -- routes to
// the cheapest model that does the job, and gpt-5.3-codex (coding-
// specialized, ~1/3 the price of gpt-5.5 on input, ~less than half on
// output) is that model for review. gpt-5.5 stays defined and priced below
// as the road not taken, still shown in the routing panel with the real
// cost delta, per REBUILD-CONTROLS.md -- see docs/REBUILD-PROPOSAL.md §4.
export const REVIEW_MODEL = "gpt-5.3-codex";
// gpt-5.5 is the pricier alternative reviewer. Kept as a named constant so the
// routing decision is visible in code rather than folded into a literal.
//
// Its previous comment claimed the model was "still shown in the routing panel
// with the real cost delta". There is no such panel: grep for gpt-5.5 in
// public/ returns nothing. A comment describing a feature that does not exist
// is the same defect as a number that has gone stale.
export const REVIEW_MODEL_ALTERNATIVE = "gpt-5.5";

// Published per-1M-token USD pricing, verified against OpenAI's own pricing
// page rather than trained-in knowledge (this model postdates training data
// for most models that would write this file).
export const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5.5": { input: 5.0, output: 30.0 },
  "gpt-5.3-codex": { input: 1.75, output: 14.0 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model];
  if (!price) throw new Error(`No pricing entry for model "${model}" -- add one before using it`);
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

export interface ReviewResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wallTimeMs: number;
}

const REVIEW_SYSTEM_PROMPT = `You are an independent reviewer -- a different model from the one that wrote this code, seeing it for the first time. Review the artifact below against its brief's machine-verifiable acceptance criteria and against 4 failure modes, mirroring a production build's real cross-model review step:

1. Kitchen Sink -- scope creep beyond what the brief asked for.
2. Wrong Abstraction -- the same logic duplicated where it should be one function.
3. Optimistic Path -- unhandled edge cases (e.g. silence, an unresumed audio context, empty or out-of-range input).
4. Runaway Refactor -- unjustified complexity for what the brief asked.

For each of the 4 modes, answer explicitly yes or no with a one-line reason -- "looks clean" or silence does not count as an answer. Then list any other concrete defects, each on its own line starting with exactly "[MATERIAL]" or "[NIT]" (material = a real bug, a correctness issue, or something that would need to change before shipping; nit = style or preference, never blocks). If you genuinely find nothing wrong, say so explicitly in one line and do not invent findings to look thorough -- a clean review is a real, valid outcome, not a failure to find something.`;

/**
 * All of reviewArtifact's response validation, isolated from the real
 * OpenAI client behind the `attempt` callback so it's directly testable
 * against a fake one -- truncation retry-then-throw, empty-content-is-a-
 * failure, and required-format retry-then-throw. Same three defect shapes
 * this session found and fixed across the codebase (a timed-out/truncated/
 * empty signal read as a pass), all living in the one call site that
 * exists specifically to catch defects -- which is why this one was "the
 * worst of the five": a broken reviewer reporting a clean review is
 * indistinguishable from a working reviewer that found nothing, unless
 * every one of these is checked and none of them defaults to trusting the
 * content.
 */
export async function resolveReview(
  attempt: (attemptTokens: number, content: string) => Promise<OpenAI.Responses.Response>,
  maxTokens: number,
  userContent: string,
): Promise<{ response: OpenAI.Responses.Response; text: string }> {
  let response = await attempt(maxTokens, userContent);
  // validate-before-consume (a production control-layer practice):
  // incomplete_details.reason === "max_output_tokens" means the response
  // was cut off -- a real defect (an earlier version here only checked for
  // *empty* content, which missed a genuinely truncated-but-nonempty
  // review reading as if it were complete). SHIP.md item 2: found by
  // actually driving one real review call -- gpt-5.3-codex is only served
  // through the Responses API, not Chat Completions (a 404 from the real
  // API, not a guess), so this whole function moved off `choices[0]` onto
  // the Responses API's own shape (output_text, incomplete_details, a
  // differently-named usage field).
  // A DISCARDED ATTEMPT WAS STILL BILLED.
  //
  // Both retries below reassign `response`, so the abandoned attempt's usage
  // vanished and the caller recorded half the real spend. claude.ts's
  // createWithTruncationGuard already carries tokens forward and says why -- "a
  // cap that does not count retries is the same claim" -- and that fix was
  // applied in exactly one of six places with this shape. An audit forced the
  // grounding parse retry and measured 2 HTTP calls against exactly half the
  // spend recorded.
  let carriedIn = 0, carriedOut = 0;
  const carry = (r: typeof response) => {
    carriedIn += (r as any)?.usage?.input_tokens ?? 0;
    carriedOut += (r as any)?.usage?.output_tokens ?? 0;
  };

  if (response.incomplete_details?.reason === "max_output_tokens") {
    const retryTokens = Math.min(maxTokens * 2, 8000);
    carry(response);
    response = await attempt(retryTokens, userContent);
    if (response.incomplete_details?.reason === "max_output_tokens") throw new TruncatedResponseError("reviewArtifact", retryTokens);
  }

  let text = response.output_text ?? "";
  if (!text) {
    // Known, disclosed gap: OpenAI still bills the reasoning tokens burned
    // on this call even though there's no content to return, but throwing
    // here (rather than a normal return) means callOpenAI's caller never
    // records that real cost against the pipeline's spend cap -- the same
    // pre-existing tradeoff src/spendCap.ts already makes for the plain
    // task set (a failed call's actual cost isn't tracked, only bounded by
    // the pre-flight worst-case check). Bounded in practice by the circuit
    // breaker opening after CONTROL_LIMITS.CIRCUIT_FAILURE_THRESHOLD
    // consecutive failures, not eliminated.
    throw new Error(`OpenAI review returned empty content (status: ${response.status}, incomplete_details: ${JSON.stringify(response.incomplete_details)})`);
  }

  // validate-before-consume: zero [MATERIAL]/[NIT] lines is read downstream
  // as "reviewed, nothing found" -- valid only if the reviewer actually
  // followed the required structure. A response that dropped the 4
  // failure-mode headers would ALSO parse to zero findings and be
  // indistinguishable from a genuinely clean review with nothing else
  // checking for it. One retry with an explicit correction, then fail --
  // never silently trusted either way.
  if (!reviewFollowedFormat(text)) {
    const retryContent = `${userContent}\n\nYour previous response did not follow the required structure -- it must explicitly address all 4 named failure modes (Kitchen Sink, Wrong Abstraction, Optimistic Path, Runaway Refactor) by name, each with an explicit yes/no. Redo the review in the required format.`;
    carry(response);
    response = await attempt(maxTokens, retryContent);
    const retryText = response.output_text ?? "";
    if (!reviewFollowedFormat(retryText)) {
      throw new Error("Review response did not follow the required structure (missing the 4 named failure modes) twice in a row -- treated as a failure, not a clean review.");
    }
    text = retryText;
  }

  // Fold the abandoned attempts into what the caller sees, so the cost recorded
  // is the cost incurred rather than the cost of the last try.
  if ((carriedIn || carriedOut) && (response as any).usage) {
    (response as any).usage.input_tokens = ((response as any).usage.input_tokens ?? 0) + carriedIn;
    (response as any).usage.output_tokens = ((response as any).usage.output_tokens ?? 0) + carriedOut;
  }

  return { response, text };
}

/**
 * A RE-REVIEW IS NOT A FRESH REVIEW.
 *
 * Modelled on the loop this project's author has actually built two products
 * with (see cross-model-review, docs/workflow/REVIEW-LOOP.md): from iteration
 * two onward the question changes. It is no longer "what is wrong with this" but
 * "is each prior finding GENUINELY closed -- not merely claimed closed -- and
 * did the fixes introduce anything new".
 *
 * `acceptedByDesign` is the same file that loop calls `--wontfix`, and it is
 * passed into EVERY subsequent review for the same reason: an unsupervised loop
 * will otherwise dutifully "fix" a deliberate decision, and then re-flag it, and
 * then fix it again, forever. Here those entries come from the author model's
 * own assessment of the findings -- a disagreement it had to justify in writing
 * -- which turns an argument between two models into a recorded position.
 */
export interface ReReviewContext {
  priorFindings: string[];
  acceptedByDesign: string[];
  round: number;
}

/**
 * The re-review preamble, extracted so it can be TESTED.
 *
 * It was inline, and the only test of it installed a fake fetch it never
 * actually wired up, then early-returned when nothing was captured -- so five
 * assertions never ran and the ReReviewContext argument could have been deleted
 * with the suite still green. In a project arguing against green-when-not-true,
 * that was the most quotable line in the repo.
 *
 * A pure function of its input is testable without a network at all.
 */
export function buildReReviewBlock(reReview: ReReviewContext | null): string {
  if (!reReview) return "";
  return (
    `THIS IS REVIEW ROUND ${reReview.round}. The author has since changed the code in response to your findings.\n\n` +
    `Findings you raised last round:\n${reReview.priorFindings.map((f) => `- ${f}`).join("\n") || "- (none)"}\n\n` +
    `For EACH of those, state whether it is genuinely closed by the current code -- not whether the author says it is. ` +
    `A finding that is still open is still [MATERIAL]. Then look for anything the fixes have newly introduced.\n\n` +
    (reReview.acceptedByDesign.length
      ? `ACCEPTED BY DESIGN -- do not raise these again. The author considered each and gave a reason:\n${reReview.acceptedByDesign.map((f) => `- ${f}`).join("\n")}\n\n`
      : "")
  );
}

export async function reviewArtifact(
  apiKey: string,
  model: string,
  briefMarkdown: string,
  authorPrompt: string,
  artifactHtml: string,
  maxTokens: number,
  priorLessons: string = "",
  reReview: ReReviewContext | null = null,
): Promise<ReviewResult> {
  const client = new OpenAI({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const reReviewBlock = buildReReviewBlock(reReview);
  const userContent =
    (priorLessons ? `Lessons recorded from previous runs -- apply any that are relevant here:\n${priorLessons}\n\n` : "") +
    reReviewBlock +
    `Brief shown to the visitor (not the author model):\n${briefMarkdown}\n\n` +
    `Spec given to the author model:\n${authorPrompt}\n\n` +
    `Artifact:\n${artifactHtml}`;

  // gpt-5.5 is a reasoning model that spends part of max_output_tokens
  // on hidden reasoning before any visible output -- found by actually
  // running this call: an unset (default/high) effort with a 1200-token
  // cap consumed the whole budget on reasoning and returned empty content
  // truncated at max_output_tokens. A review is not deep architecture
  // work; "low" leaves the budget for the actual critique.
  async function attempt(attemptTokens: number, content: string): Promise<OpenAI.Responses.Response> {
    return client.responses.create({
      model,
      max_output_tokens: attemptTokens,
      reasoning: { effort: "low" },
      instructions: REVIEW_SYSTEM_PROMPT,
      input: content,
    });
  }
  const { response, text } = await resolveReview(attempt, maxTokens, userContent);

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  return { text, model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), wallTimeMs: Date.now() - start };
}

export interface ReviewFinding {
  severity: "MATERIAL" | "NIT";
  text: string;
}

/** Parses the [MATERIAL]/[NIT]-tagged lines out of a review response.
 * Anything the reviewer didn't tag isn't a finding for triage purposes --
 * this is what makes the triage rule ("MATERIAL always gates, NIT never
 * does") a real, checkable rule rather than a vibe. */
export function parseFindings(reviewText: string): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const line of reviewText.split("\n")) {
    const m = line.match(/\[(MATERIAL|NIT)\]\s*(.*)/);
    if (m) findings.push({ severity: m[1] as "MATERIAL" | "NIT", text: m[2].trim() });
  }
  return findings;
}

/** validate-before-consume: zero parsed findings is read downstream as
 * "reviewed, nothing found" -- a real, valid outcome. But that's only true
 * if the reviewer actually followed the required structure; a response
 * that ignored the format (dropped the 4 failure-mode headers, wrote free
 * prose) would ALSO parse to zero findings, and nothing previously told
 * those two cases apart. Same class as the other three fixes in this
 * session: an absence (no [MATERIAL]/[NIT] lines) was one signal doing
 * double duty for both "genuinely clean" and "didn't follow the format",
 * and only the first of those should ever read as a pass.
 */
export function reviewFollowedFormat(reviewText: string): boolean {
  const required = ["kitchen sink", "wrong abstraction", "optimistic path", "runaway refactor"];
  const lower = reviewText.toLowerCase();
  if (!required.every((phrase) => lower.includes(phrase))) return false;

  // THE HEADERS ALONE ARE NOT ENOUGH.
  //
  // A reviewer that wrote "Optimistic Path: YES -- the lamp is placed inside
  // the tavern wall" in prose, without tagging the line, parsed to ZERO
  // findings. Zero findings means the review gate never opens, so the run
  // shipped a defect the reviewer had actually spotted and reported. The
  // verdict was there; only the tag was missing, and the tag was the only
  // thing being read.
  //
  // So: if the reviewer answers YES to any of its four failure modes but
  // tagged nothing, the response has not followed the format and must not be
  // read as a clean pass. This is deliberately narrow -- it does not demand
  // any particular phrasing for a clean review, only that a stated failure
  // cannot be silently dropped.
  // The heading may be bold, may use a dash, may put the verdict in brackets.
  // The previous pattern demanded punctuation BEFORE the bold marker, so the
  // most common markdown form -- "**Optimistic Path**: Yes" -- slipped through
  // and the run shipped a defect the reviewer had named. Allow markers and
  // separators in any order.
  const claimsAFailure =
    /(?:\*\*|__)?\s*(kitchen sink|wrong abstraction|optimistic path|runaway refactor)\s*(?:\*\*|__)?\s*[:\-\u2013\u2014(]{0,2}\s*(?:\*\*|__)?\s*yes\b/i
      .test(reviewText);
  // A single unrelated [NIT] used to set a `tagged` flag and let a stated MATERIAL
  // verdict through. If the reviewer says one of its four failure modes is YES,
  // it has to have tagged something MATERIAL.
  const taggedMaterial = /\[MATERIAL\]/.test(reviewText);
  if (claimsAFailure && !taggedMaterial) return false;
  return true;
}

// ---------------------------------------------------------------------
// THE PRE-MERGE QA PASS
//
// The last stage of the loop this is ported from (docs/workflow/
// CROSS-MODEL-REVIEW.md in the sqft repo): after the iterative cycle reaches
// clean and the gates are green, one final independent pass over the whole
// change.
//
// It is deliberately a DIFFERENT question from the review. The review asks "is
// this code sound". This asks "is this the thing that was asked for" -- does
// the implementation match the plan's intent, are the stated criteria actually
// met, is the account of what happened accurate. A change can survive every
// code review and still not be what the visitor asked for, and nothing before
// this stage was looking for that.
//
// The source doc is explicit about one trap, learned the hard way: keep the
// criteria FUNCTIONAL, not mechanical. Counting files or lines false-fails on
// legitimate fix commits from the review rounds, because the loop adds work the
// plan never estimated.
// ---------------------------------------------------------------------

const QA_SYSTEM_PROMPT = `You are performing a final pre-ship QA pass on a change that has already passed code review and automated verification. You are NOT reviewing the code again -- that has been done.

Answer one question: IS THIS THE THING THAT WAS ASKED FOR?

Check, in order:
1. Does the implementation do what the plan said it would build?
2. Is each of the plan's acceptance criteria genuinely met by this change -- not merely claimed?
3. Did the change stay inside what the plan said it would not touch?
4. Is anything the plan promised simply missing?

Judge FUNCTION, not mechanics. Do not count files, lines, or functions and do not fail a change for differing from an estimate -- the review rounds legitimately add work that no plan predicted. A change that achieves the intent by a different route than the plan described is a PASS; say so and note the difference.

Reply with exactly one line starting "VERDICT: PASS" or "VERDICT: FAIL". If FAIL, follow it with one line per gap, each starting "[GAP] ", naming the specific promise that is not met. Do not invent gaps to look thorough -- a pass is a real and common outcome.`;

export interface QaResult {
  passed: boolean;
  gaps: string[];
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wallTimeMs: number;
}

export async function qaAgainstBrief(
  apiKey: string,
  model: string,
  planSummary: string,
  changeRequest: string,
  finalCode: string,
  verificationSummary: string,
  maxTokens: number,
): Promise<QaResult> {
  const client = new OpenAI({ apiKey, timeout: STAGE_CALL_TIMEOUT_MS });
  const start = Date.now();
  const response = await client.responses.create({
    model,
    max_output_tokens: maxTokens,
    reasoning: { effort: "low" },
    instructions: QA_SYSTEM_PROMPT,
    input:
      `What the visitor asked for:\n${changeRequest}\n\n` +
      `The plan:\n${planSummary}\n\n` +
      `Verification results:\n${verificationSummary}\n\n` +
      `The change as it stands:\n${finalCode}`,
  });
  const wallTimeMs = Date.now() - start;
  const text = (response.output_text ?? "").trim();

  // FAIL CLOSED ON AN UNREADABLE VERDICT.
  //
  // The original loop exits 5 on output it cannot parse rather than assuming
  // the best, and for the same reason: "we could not tell" must never be
  // recorded as "it passed". A missing VERDICT line is a failed QA pass.
  const passed = /^VERDICT:\s*PASS\b/im.test(text);
  const failed = /^VERDICT:\s*FAIL\b/im.test(text);
  const gaps = text.split("\n").filter((l) => /^\s*\[GAP\]/i.test(l)).map((l) => l.replace(/^\s*\[GAP\]\s*/i, "").trim());
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  return {
    passed: passed && !failed,
    gaps: passed && !failed ? [] : (gaps.length ? gaps : [text ? "the QA pass did not return a readable VERDICT line" : "the QA pass returned nothing"]),
    text,
    model,
    inputTokens,
    outputTokens,
    costUsd: costUsd(model, inputTokens, outputTokens),
    wallTimeMs,
  };
}
