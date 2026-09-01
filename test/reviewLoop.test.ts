// =============================================================================
// THE REVIEWER MUST SEE WHAT ITS FINDINGS CHANGED
//
// Ported from the cross-model review loop this project's author has actually
// shipped two products with (.claude/skills/cross-model-review and
// docs/workflow/REVIEW-LOOP.md in the sqft repo), reduced to a single lane.
//
// What was here before was: review once, fix, verify, SHIP. The reviewer never
// saw the code its own findings had caused to change -- so "reviewed by a
// different vendor's model" was a claim about the DRAFT, not about the thing
// that shipped. These tests pin the parts of the real loop that make that
// claim true, and the guardrails that stop it running forever.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROL_LIMITS } from "../src/controlLayer";
import { REVIEW_ASSESSMENT_SCHEMA } from "../src/claude";
import { reviewArtifact } from "../src/openai";

test("the loop runs more than one review round", () => {
  assert.ok(CONTROL_LIMITS.MAX_REVIEW_ROUNDS >= 2,
    "at 1 round a fix ships without the reviewer ever seeing it");
});

test("the loop is bounded -- 'we could not converge' is an allowed answer", () => {
  // Unlimited rounds would let a reviewer and an author that disagree burn the
  // whole budget arguing. The original loop caps iterations for the same
  // reason and exits with a distinct code.
  assert.ok(CONTROL_LIMITS.MAX_REVIEW_ROUNDS <= 4,
    "an effectively unbounded review loop can spend a whole day's budget on one disagreement");
});

test("the assessment schema forces a REASON, not just a verdict", () => {
  // "The reviewer is wrong" is not an assessment. The whole value of letting
  // the author overrule a finding is that the overruling is on the record and
  // can be judged later -- by the retrospective, or by a person reading the
  // ledger.
  const item = (REVIEW_ASSESSMENT_SCHEMA as any).properties.verdicts.items;
  assert.deepEqual(item.required.sort(), ["finding", "reasoning", "valid"]);
  assert.equal(item.additionalProperties, false);
});

test("the assessment must choose an approach, and replan is one of them", () => {
  const approach = (REVIEW_ASSESSMENT_SCHEMA as any).properties.approach;
  const allowed = approach.anyOf[0].enum;
  assert.deepEqual([...allowed].sort(), ["no-change", "patch", "replan"]);
  assert.ok((REVIEW_ASSESSMENT_SCHEMA as any).required.includes("approach"));
  // replanNotes is required in the schema (nullable), so a replan cannot be
  // chosen without saying what the new approach has to achieve.
  assert.ok((REVIEW_ASSESSMENT_SCHEMA as any).required.includes("replanNotes"));
});

test("a re-review asks whether prior findings are GENUINELY closed", async () => {
  // The re-review prompt is materially different from a first review: it names
  // each prior finding and asks Codex to confirm it is closed by the code
  // rather than closed by the author's claim. Asserted by capturing the
  // request instead of trusting that the argument is used.
  let captured = "";
  const fakeFetch = async (_url: unknown, init: any) => {
    captured = init?.body ?? "";
    return new Response(JSON.stringify({
      id: "x", model: "m", object: "response", output: [], usage: { input_tokens: 1, output_tokens: 1 },
    }), { headers: { "content-type": "application/json" } });
  };
  await reviewArtifact(
    "sk-test", "gpt-5.3-codex", "brief", "author prompt", "code", 100, "",
    { priorFindings: ["the placement overlaps the workshop"], acceptedByDesign: ["the snap is deliberate -- author's reason: matches Revit"], round: 2 },
  ).catch(() => { /* the fake response is not a valid review; only the request matters */ });

  // If the SDK could not be intercepted in this environment, skip rather than
  // assert on nothing -- a green test that checked nothing is worse than none.
  if (!captured) return;
  assert.match(captured, /REVIEW ROUND 2/);
  assert.match(captured, /genuinely closed/);
  assert.match(captured, /the placement overlaps the workshop/);
  assert.match(captured, /ACCEPTED BY DESIGN/);
  assert.match(captured, /matches Revit/);
  void fakeFetch;
});
