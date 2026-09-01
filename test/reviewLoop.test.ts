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
import { buildReReviewBlock } from "../src/openai";

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

test("a re-review asks whether prior findings are GENUINELY closed", () => {
  // THIS TEST USED TO ASSERT NOTHING.
  //
  // It defined a fake fetch, never installed it, and then early-returned when
  // nothing was captured -- with a comment congratulating itself for not
  // asserting on nothing. Five assert.match calls never executed, the
  // ReReviewContext argument could have been deleted with the suite still
  // green, and it fired a real request at api.openai.com on every `npm test`.
  //
  // The prompt builder is a pure function now, so this needs no network and
  // cannot silently pass.
  const block = buildReReviewBlock({
    priorFindings: ["the placement overlaps the workshop"],
    acceptedByDesign: ["the snap is deliberate -- author's reason: matches Revit"],
    round: 2,
  });

  assert.match(block, /REVIEW ROUND 2/);
  assert.match(block, /genuinely closed by the current code/);
  assert.match(block, /not whether the author says it is/);
  assert.match(block, /the placement overlaps the workshop/);
  assert.match(block, /ACCEPTED BY DESIGN -- do not raise these again/);
  assert.match(block, /matches Revit/);
  assert.match(block, /anything the fixes have newly introduced/);
});

test("a FIRST review carries none of the re-review framing", () => {
  // Round one must not be told about prior findings it has not made, or it
  // starts answering a question nobody asked.
  assert.equal(buildReReviewBlock(null), "");
});

test("a re-review with no accepted-by-design findings omits that section entirely", () => {
  // An empty "ACCEPTED BY DESIGN:" heading invites the reviewer to treat the
  // absence as meaningful.
  const block = buildReReviewBlock({ priorFindings: ["x"], acceptedByDesign: [], round: 2 });
  assert.doesNotMatch(block, /ACCEPTED BY DESIGN/);
  assert.match(block, /REVIEW ROUND 2/);
});
