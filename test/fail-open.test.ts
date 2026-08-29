// The fail-open invariant, as ONE test rather than a list of five (now six)
// separately-patched bugs: anywhere a missing, empty, malformed, or
// truncated signal could be read as success, it must instead read as
// failure. Every parser/verifier that has ever had this defect is exercised
// here against the same three input shapes -- empty, malformed, truncated
// -- so a REGRESSION on any of them fails this file, without anyone having
// to remember the history above to notice.
//
// When you add a new function that consumes LLM output, sandbox output, or
// a human-decision record, add a matching case here for its empty/malformed
// (/truncated, if applicable) inputs. That's the actual defense against a
// seventh instance -- there is no way to statically detect "a new fail-open
// bug" in code that doesn't exist yet, so this file is the place a reviewer
// (human or model) checks a new consumer against, the same way V1_VOCAB is
// checked against a new vocabulary entry.
import { test } from "node:test";
import assert from "node:assert/strict";

import { reviewFollowedFormat, resolveReview } from "../src/openai.ts";
import { createWithTruncationGuard } from "../src/claude.ts";
import { checkDecision, checkAnswer, decideStillFailing, assertConvergedForReview } from "../src/changePipeline.ts";
import { TruncatedResponseError } from "../src/controlLayer.ts";
import type { TestResult } from "../src/types.ts";

// ---------------------------------------------------------------------
// 1. reviewFollowedFormat -- the reviewer's findings parser (openai.ts).
// The single worst instance: a malformed review parses to zero findings
// exactly like a genuinely clean one, unless this gate exists and is
// checked before findings are ever trusted.
// ---------------------------------------------------------------------

test("reviewFollowedFormat: empty text fails", () => {
  assert.equal(reviewFollowedFormat(""), false);
});

test("reviewFollowedFormat: malformed text (free prose, no required headers) fails", () => {
  assert.equal(reviewFollowedFormat("Looks great, ship it! No notes."), false);
});

test("reviewFollowedFormat: truncated text (3 of 4 required phrases, cut off mid-word) fails", () => {
  const truncated = "Kitchen Sink: no. Wrong Abstraction: no. Optimistic Path: no issues. Runaway Ref";
  assert.equal(reviewFollowedFormat(truncated), false);
});

test("reviewFollowedFormat: control case -- all 4 phrases present passes", () => {
  const valid = "Kitchen Sink: no. Wrong Abstraction: no. Optimistic Path: no issues found. Runaway Refactor: no.\nNo other findings.";
  assert.equal(reviewFollowedFormat(valid), true);
});

// ---------------------------------------------------------------------
// 2. resolveReview -- reviewArtifact's full validation chain (openai.ts),
// tested against a fake `attempt` so no real OpenAI call is made. Covers
// the truncation guard AND the format guard in the one function that
// exists to catch review failures.
// ---------------------------------------------------------------------

// SHIP.md item 2: reviewArtifact moved from the Chat Completions API to
// the Responses API after a real review call against the real OpenAI API
// returned a real 404 -- gpt-5.3-codex isn't served on
// v1/chat/completions at all. This mock shape follows that move:
// output_text/incomplete_details/usage.input_tokens+output_tokens, not
// choices[0].message.content/finish_reason/usage.prompt_tokens.
function fakeResponse(opts: { incomplete?: boolean; content?: string | null }): any {
  return {
    status: opts.incomplete ? "incomplete" : "completed",
    incomplete_details: opts.incomplete ? { reason: "max_output_tokens" } : null,
    output_text: opts.content ?? "",
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

test("resolveReview: truncated twice in a row fails (never returns partial content)", async () => {
  const attempt = async () => fakeResponse({ incomplete: true, content: "partial review tex" });
  await assert.rejects(() => resolveReview(attempt, 100, "content"), TruncatedResponseError);
});

test("resolveReview: empty content fails, even with a normal finish_reason", async () => {
  const attempt = async () => fakeResponse({ content: "" });
  await assert.rejects(() => resolveReview(attempt, 100, "content"), /empty content/);
});

test("resolveReview: malformed format (missing the 4 named modes) twice in a row fails", async () => {
  const attempt = async () => fakeResponse({ content: "Looks fine, ship it." });
  await assert.rejects(() => resolveReview(attempt, 100, "content"), /required structure/);
});

test("resolveReview: control case -- a well-formed review on the first try succeeds", async () => {
  const validText = "Kitchen Sink: no. Wrong Abstraction: no. Optimistic Path: no. Runaway Refactor: no.\nNo other findings.";
  const attempt = async () => fakeResponse({ content: validText });
  const { text } = await resolveReview(attempt, 100, "content");
  assert.equal(text, validText);
});

test("resolveReview: control case -- recovers on the second attempt after a format correction", async () => {
  let calls = 0;
  const validText = "Kitchen Sink: no. Wrong Abstraction: no. Optimistic Path: no. Runaway Refactor: no.\nNo other findings.";
  const attempt = async () => {
    calls++;
    return calls === 1 ? fakeResponse({ content: "Looks fine." }) : fakeResponse({ content: validText });
  };
  const { text } = await resolveReview(attempt, 100, "content");
  assert.equal(text, validText);
  assert.equal(calls, 2);
});

// ---------------------------------------------------------------------
// 3. createWithTruncationGuard -- the Anthropic-side truncation guard
// (claude.ts), shared by every stage that calls Claude for structured
// output (plan/implement/fix/brief). Tested against a fake client.
// ---------------------------------------------------------------------

function fakeAnthropicClient(responses: any[]): any {
  let i = 0;
  return { messages: { create: async () => responses[Math.min(i++, responses.length - 1)] } };
}

test("createWithTruncationGuard: hits max_tokens twice in a row fails", async () => {
  const client = fakeAnthropicClient([{ stop_reason: "max_tokens" }, { stop_reason: "max_tokens" }]);
  await assert.rejects(
    () => createWithTruncationGuard(client, "test-stage", { model: "m", max_tokens: 100, messages: [] } as any),
    TruncatedResponseError,
  );
});

test("createWithTruncationGuard: control case -- a complete response on the first try succeeds", async () => {
  const client = fakeAnthropicClient([{ stop_reason: "end_turn", content: [] }]);
  const response = await createWithTruncationGuard(client, "test-stage", { model: "m", max_tokens: 100, messages: [] } as any);
  assert.equal(response.stop_reason, "end_turn");
});

test("createWithTruncationGuard: control case -- recovers on retry with a bumped budget", async () => {
  const client = fakeAnthropicClient([{ stop_reason: "max_tokens" }, { stop_reason: "end_turn", content: [] }]);
  const response = await createWithTruncationGuard(client, "test-stage", { model: "m", max_tokens: 100, messages: [] } as any);
  assert.equal(response.stop_reason, "end_turn");
});

// ---------------------------------------------------------------------
// 4. checkDecision / checkAnswer -- the human-gate signal readers
// (changePipeline.ts). This is where the ORIGINAL fail-open bug lived
// (a gate timing out into proceeding), now redesigned to check once and
// halt on anything but a real decision. Writing this test found a SIXTH,
// previously-unreported instance: checkAnswer treated a present-but-
// contentless answer record as a real answer (`undefined !== null`).
// ---------------------------------------------------------------------

function fakeKv(store: Record<string, string>): any {
  return {
    get: async (key: string) => (key in store ? store[key] : null),
    delete: async (key: string) => {
      delete store[key];
    },
  };
}

test("checkDecision: missing key returns null (halts, never defaults to approve)", async () => {
  assert.equal(await checkDecision(fakeKv({}), "k"), null);
});

test("checkDecision: malformed JSON returns null, not a thrown exception treated as a crash-through", async () => {
  assert.equal(await checkDecision(fakeKv({ k: "{not json" }), "k"), null);
});

test("checkDecision: a record with no approve field reads as reject, never approve", async () => {
  assert.equal(await checkDecision(fakeKv({ k: "{}" }), "k"), "reject");
});

test("checkDecision: control case -- a real approval reads as approve", async () => {
  assert.equal(await checkDecision(fakeKv({ k: '{"approve":true}' }), "k"), "approve");
});

test("checkAnswer: missing key returns null", async () => {
  assert.equal(await checkAnswer(fakeKv({}), "k"), null);
});

test("checkAnswer: malformed JSON returns null", async () => {
  assert.equal(await checkAnswer(fakeKv({ k: "{not json" }), "k"), null);
});

test("checkAnswer: a record present but missing the answer field returns null, not the string \"undefined\" treated as a real answer", async () => {
  assert.equal(await checkAnswer(fakeKv({ k: "{}" }), "k"), null);
});

test("checkAnswer: control case -- a real answer is returned", async () => {
  assert.equal(await checkAnswer(fakeKv({ k: '{"answer":"weekends off"}' }), "k"), "weekends off");
});

// ---------------------------------------------------------------------
// 5. decideStillFailing -- the verify/reverify pass-fail decision
// (changePipeline.ts). This is where the "0 of 0 checks failed" bug lived:
// a sandbox that never ran the code produced an empty regression array,
// which read as nothing having failed.
// ---------------------------------------------------------------------

const pass: TestResult = { name: "p", pass: true };
const fail: TestResult = { name: "f", pass: false };

test("decideStillFailing: a fatal error fails regardless of empty result arrays", () => {
  assert.equal(decideStillFailing("sandbox never loaded the module", [], []), true);
});

test("decideStillFailing: an empty regression array fails even with no fatal error and passing criteria", () => {
  assert.equal(decideStillFailing(undefined, [], [pass]), true);
});

test("decideStillFailing: a failing criterion fails even when all regression passes", () => {
  assert.equal(decideStillFailing(undefined, [pass], [fail]), true);
});

test("decideStillFailing: control case -- all regression passing with zero proposed criteria ships (empty criteria is a legitimate outcome, unlike empty regression)", () => {
  assert.equal(decideStillFailing(undefined, [pass, pass], []), false);
});

test("decideStillFailing: control case -- everything passing ships", () => {
  assert.equal(decideStillFailing(undefined, [pass], [pass]), false);
});

// ---------------------------------------------------------------------
// 6. assertConvergedForReview -- FINAL.md item 1's explicit gate. Real,
// stored evidence (run 823decc7) showed review reached with 8/9 regression
// and 2/8 criteria failing; the only prior gate was a fatal-sandbox-error
// check. This is the literal code now standing at the entry point to
// "reviewing" -- these cases plant deliberately failing verification and
// prove review is never reachable past this call, not just that the flag
// reads correctly.
// ---------------------------------------------------------------------

test("assertConvergedForReview: throws on a fatal sandbox error", () => {
  assert.throws(() => assertConvergedForReview("sandbox never loaded the module", [], []));
});

test("assertConvergedForReview: throws on an empty regression suite even with passing criteria", () => {
  assert.throws(() => assertConvergedForReview(undefined, [], [pass]));
});

test("assertConvergedForReview: throws when any regression case is still failing", () => {
  assert.throws(() => assertConvergedForReview(undefined, [pass, fail], [pass]));
});

test("assertConvergedForReview: throws when any criterion is still failing -- the exact shape of run 823decc7 (2 of 8 criteria failing, review entered anyway)", () => {
  assert.throws(() => assertConvergedForReview(undefined, [pass, pass], [pass, fail]));
});

test("assertConvergedForReview: control case -- does not throw once everything has converged", () => {
  assert.doesNotThrow(() => assertConvergedForReview(undefined, [pass, pass], [pass, pass]));
});

test("assertConvergedForReview: control case -- does not throw with zero proposed criteria and full regression pass (empty criteria is legitimate, unlike empty regression)", () => {
  assert.doesNotThrow(() => assertConvergedForReview(undefined, [pass, pass], []));
});

// The gate is only worth having if it actually stops the reviewer from
// being called -- not just that it throws in isolation. This plants the
// exact real-world failure shape (823decc7: verification still failing)
// against a fake "call the reviewer" step gated the same way the real
// pipeline gates it (assert immediately before the call), and proves the
// reviewer spy's call count stays zero when the assertion throws.
test("guardrail: a reviewer call gated by assertConvergedForReview is never invoked when verification is still failing", () => {
  let reviewerCallCount = 0;
  const fakeCallReviewer = () => {
    reviewerCallCount++;
    return { text: "reviewed" };
  };
  function maybeEnterReview(fatalError: string | undefined, regression: TestResult[], criteria: TestResult[]) {
    assertConvergedForReview(fatalError, regression, criteria); // same call site shape as changePipeline.ts, right before onEvent({ type: "reviewing" })
    return fakeCallReviewer();
  }

  assert.throws(() => maybeEnterReview(undefined, [pass], [fail]));
  assert.equal(reviewerCallCount, 0, "the reviewer must not be called when a criterion is still failing");

  assert.throws(() => maybeEnterReview("sandbox never loaded the module", [], []));
  assert.equal(reviewerCallCount, 0, "the reviewer must not be called after a fatal sandbox error");

  // Control: once verification genuinely converges, the same gated call site DOES reach the reviewer.
  const result = maybeEnterReview(undefined, [pass, pass], [pass]);
  assert.equal(reviewerCallCount, 1);
  assert.equal(result.text, "reviewed");
});
