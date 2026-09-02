import { assessReviewRound } from "../src/changePipeline.js";
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

// =============================================================================
// THE REVIEW LOOP'S VERDICT — THE DECISION THAT HAD NO TEST
//
// An independent audit deleted the oscillation guard, the round cap, the
// fix-attempt cap, the per-run ceiling, the QA pass and the
// unresolved-blocks-ship check, one at a time, and all 380 tests stayed green.
// This file is named for this loop and asserted only on CONTROL_LIMITS values
// and a string builder. The decision itself lived inline in a 180-line loop and
// could not be called, so it could not be checked.
//
// And it had a hole, which is the most serious defect found in this project.
//
// Every finding the AUTHOR declared invalid was filtered out of the reviewer's
// later output — before the clean check and before the oscillation guard. The
// reviewer became structurally incapable of re-raising it. Driving the real
// pipeline: the reviewer raised the same MATERIAL finding in rounds 1 and 2, the
// author returned valid:false, and the run SHIPPED with unresolved: 0 and no fix
// ever applied.
//
// That falsifies the claim the whole project rests on. A clean verdict could be
// manufactured by the model being reviewed.
// =============================================================================

const M = (text: string) => ({ severity: "MATERIAL", text });
const N = (text: string) => ({ severity: "NIT", text });

test("no material findings is clean", () => {
  const v = assessReviewRound([N("spacing is a bit tight")], [], null);
  assert.equal(v.kind, "clean");
  assert.deepEqual(v.unresolved, []);
});

test("an overrule the reviewer ACCEPTS is clean — the author may win", () => {
  // The reviewer is shown the justification and does not raise it again.
  const v = assessReviewRound([], ["the lamp is inside the tavern wall — intentional, it is a sconce"], null);
  assert.equal(v.kind, "clean");
  assert.deepEqual(v.unresolved, []);
});

test("an overrule the reviewer REJECTS does not ship", () => {
  // THE CRITICAL CASE. The author declared this invalid; the reviewer was shown
  // that justification and raised it anyway. Under the old filter this returned
  // clean with unresolved: 0 and the run shipped.
  const finding = "the lamp is placed inside the tavern wall";
  const v = assessReviewRound([M(finding)], [finding + " — intentional, it is a sconce"], null);

  assert.notEqual(v.kind, "clean", "a finding the reviewer re-raised must never read as clean");
  assert.equal(v.kind, "overrule-rejected");
  assert.deepEqual(v.unresolved, [finding],
    "the contested finding has to reach the human gate, not be deleted");
  assert.deepEqual(v.contested, [finding]);
});

test("a contested finding is not lost when there are other findings too", () => {
  const overruled = "the lamp is inside the wall";
  const fresh = "the door opens into the stairwell";
  const v = assessReviewRound([M(overruled), M(fresh)], [overruled + " — deliberate"], null);
  // Work remains, so the loop continues — but the contested one is still tracked
  // rather than silently dropped.
  assert.equal(v.kind, "continue");
  assert.deepEqual(v.contested, [overruled]);
  assert.deepEqual(v.nextMaterial, [fresh]);
});

test("oscillation is still caught, and counts contested findings in the key", () => {
  const a = "the roof clips the chimney";
  const first = assessReviewRound([M(a)], [], null);
  assert.equal(first.kind, "continue");
  const second = assessReviewRound([M(a)], [], first.key);
  assert.equal(second.kind, "oscillating", "the same material set twice is an argument, not convergence");
  assert.deepEqual(second.unresolved, [a]);
});

test("an argument purely about an overrule is detectable as oscillation", () => {
  // The key includes contested findings, so a loop that consists only of the
  // author overruling and the reviewer re-raising cannot spin unseen.
  const t = "the beam passes through the window";
  const v1 = assessReviewRound([M(t)], [], null);
  const v2 = assessReviewRound([M(t)], [t + " — accepted by design"], v1.key);
  assert.equal(v2.kind, "overrule-rejected");
  assert.equal(v2.key, v1.key, "the key must not change just because the author overruled");
});
