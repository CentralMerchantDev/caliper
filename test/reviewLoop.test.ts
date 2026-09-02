import { assessReviewRound, checkReplyBudget, resolvePlanGate, shouldKeepFixing, reviewRoundsExhausted, MAX_PLAN_REPLIES } from "../src/changePipeline.js";
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

// ---------------------------------------------------------------------------
// 2.8 -- GATE 1's REPLY LOOP WAS OUTSIDE THE CEILING ARITHMETIC
//
// Gate 1 offers approve, reject, and reply. A reply re-grounds and re-plans; the
// per-run ceiling books ONE ground and ONE plan. So twelve replies meant
// thirteen of each against a reservation for one, and the endpoint stored the
// reply, minted a resume ticket, and counted nothing.
//
// It is authenticated, so this was never an open door. But SPEND_WORST_CASE is
// published on /pipeline-budget as what a run can cost, and an unbounded loop
// inside it makes that number a guess rather than a bound.
// ---------------------------------------------------------------------------
test("the Gate 1 reply loop is bounded, and an unreadable counter does not grant replies", () => {
  // A fresh run may reply.
  const first = checkReplyBudget(null);
  assert.equal(first.allowed, true, "a run's first clarification reply must be allowed");
  assert.equal(first.used, 0);
  assert.equal(first.remaining, MAX_PLAN_REPLIES);

  // It may keep replying up to the cap...
  for (let used = 0; used < MAX_PLAN_REPLIES; used++) {
    const b = checkReplyBudget(String(used));
    assert.equal(b.allowed, true, `reply ${used + 1} of ${MAX_PLAN_REPLIES} was refused`);
    assert.equal(b.remaining, MAX_PLAN_REPLIES - used);
  }

  // ...and not past it. This is the whole finding.
  const spent = checkReplyBudget(String(MAX_PLAN_REPLIES));
  assert.equal(spent.allowed, false,
    `a run was allowed a ${MAX_PLAN_REPLIES + 1}th reply — each one costs a ground ` +
    `and a plan that the per-run ceiling never booked`);
  assert.equal(spent.remaining, 0);

  // A counter that has somehow run past the cap stays refused rather than
  // wrapping, and reports the cap rather than the impossible number.
  const overrun = checkReplyBudget("999");
  assert.equal(overrun.allowed, false, "an over-run counter must not wrap around into permission");
  assert.equal(overrun.used, MAX_PLAN_REPLIES);

  // GARBAGE IS NOT PERMISSION, AND IT IS NOT A LOCKOUT EITHER. Anything
  // unparseable counts as zero used: a counter that cannot be read is not
  // evidence that nothing was spent, but it is also not a reason to strand a
  // legitimate first reply.
  for (const junk of ["", "abc", "-3", "NaN", "1e9999"]) {
    const b = checkReplyBudget(junk);
    assert.equal(b.allowed, true, `"${junk}" stranded the run`);
    assert.ok(b.used >= 0 && b.used <= MAX_PLAN_REPLIES,
      `"${junk}" produced a nonsense used count of ${b.used}`);
  }

  // And the cap must be a real bound, not Infinity wearing a constant's name.
  assert.ok(Number.isInteger(MAX_PLAN_REPLIES) && MAX_PLAN_REPLIES > 0 && MAX_PLAN_REPLIES < 20,
    `MAX_PLAN_REPLIES is ${MAX_PLAN_REPLIES}, which is not a usable bound`);
});

// THE HELPER WAS TESTED. THE LOOP WAS NOT.
//
// The test above proves checkReplyBudget returns the right verdicts. It does
// NOT prove the pipeline asks it — and when the enforcement was first written
// inline in the plan gate, deleting it failed nothing. A correct helper beside
// an unguarded loop is precisely finding 3.8, so it got the same treatment:
// the loop is the unit under test, driven with a reply permanently available,
// which is the exact condition that made it unbounded.
test("the plan gate stops re-planning once the reply budget is spent", async () => {
  const replanned: number[] = [];

  // A HARD STOP, SO A BROKEN CAP FAILS INSTEAD OF HANGING. Removing the cap
  // makes this loop genuinely infinite under these stubs — a decision never
  // arrives and a reply always does — and a test suite that hangs reports
  // nothing at all. Throwing well past the cap turns that into a named failure.
  const RUNAWAY = MAX_PLAN_REPLIES * 4;
  const gate = await resolvePlanGate({
    readDecision: async () => null,           // the operator never decides...
    readReply: async () => "please clarify",  // ...and a reply is always waiting
    onReply: async (_reply, n) => {
      replanned.push(n);
      if (replanned.length > RUNAWAY) {
        throw new Error(
          `the plan gate re-planned ${replanned.length} times with no cap in sight — ` +
          `the reply loop is unbounded, and each pass is a ground and a plan`
        );
      }
    },
  });

  assert.equal(
    replanned.length, MAX_PLAN_REPLIES,
    `the gate re-planned ${replanned.length} times against a cap of ${MAX_PLAN_REPLIES} — ` +
    `each pass is a ground AND a plan that the per-run ceiling never booked`
  );
  assert.equal(gate.decision, null, "no decision was ever given, so none may be reported");
  assert.equal(gate.budgetSpent, true, "the caller must be told the budget ran out, not just handed a null");
  assert.deepEqual(replanned, [1, 2, 3, 4].slice(0, MAX_PLAN_REPLIES), "reply numbering is off");
});

test("the plan gate still does the things it is for", async () => {
  // A real decision wins immediately and costs no replan.
  const approved = await resolvePlanGate({
    readDecision: async () => "approve",
    readReply: async () => "should never be read",
    onReply: async () => { assert.fail("a decision was available; nothing should have been re-planned"); },
  });
  assert.equal(approved.decision, "approve");
  assert.equal(approved.repliesUsed, 0);
  assert.equal(approved.budgetSpent, false);

  // Neither a decision nor a reply is a halt, not a budget failure — the caller
  // treats those differently and must not be told the wrong one.
  const quiet = await resolvePlanGate({
    readDecision: async () => null,
    readReply: async () => null,
    onReply: async () => { assert.fail("there was no reply to act on"); },
  });
  assert.equal(quiet.decision, null);
  assert.equal(quiet.budgetSpent, false, "silence is not a spent budget");

  // A reply, then a decision: one replan, then it proceeds.
  let decision: "approve" | null = null;
  let replans = 0;
  const converged = await resolvePlanGate({
    readDecision: async () => decision,
    readReply: async () => (replans === 0 ? "one clarification" : null),
    onReply: async () => { replans++; decision = "approve"; },
  });
  assert.equal(converged.decision, "approve");
  assert.equal(converged.repliesUsed, 1, "one reply was made, so one must be recorded");
  assert.equal(replans, 1);

  // A run resuming with its budget already spent does not get a fresh allowance.
  const resumed = await resolvePlanGate({
    readDecision: async () => null,
    readReply: async () => "another go",
    onReply: async () => { assert.fail("this run had already used its replies"); },
    repliesUsed: MAX_PLAN_REPLIES,
  });
  assert.equal(resumed.budgetSpent, true, "the count must survive a resume, or the cap resets on every reconnect");
});

// ---------------------------------------------------------------------------
// THE CAPS THEMSELVES, DRIVEN — NOT THE CONSTANTS THEY READ
//
// A test-suite audit deleted both caps and the whole suite stayed green:
//
//     src/changePipeline.ts  `convergenceFixAttempts < MAX_FIX_ATTEMPTS` → `< 1e9`
//     src/changePipeline.ts  `round >= MAX_REVIEW_ROUNDS`                → `false`
//
// 432/432 either way. The tests that claimed to cover them asserted on the
// CONSTANTS — "MAX_REVIEW_ROUNDS is between 2 and 4" — which stays true whether
// or not anything reads them. A constant is not a control; the comparison is,
// and a comparison can only be tested by driving it.
//
// This is the third time this file has had to learn the same thing, which is
// why the caps are now extracted rather than inline.
// ---------------------------------------------------------------------------
const FAILING = [{ name: "x", pass: false }] as any[];
const PASSING = [{ name: "x", pass: true }] as any[];

test("the fix loop stops at MAX_FIX_ATTEMPTS, however long the failure persists", () => {
  const base = { fatalError: undefined, regression: FAILING, criteria: PASSING };

  // It must keep going while there are attempts left...
  let ran = 0;
  for (let used = 0; used < 50; used++) {
    if (!shouldKeepFixing({ ...base, attemptsUsed: used })) break;
    ran++;
  }
  assert.equal(
    ran, CONTROL_LIMITS.MAX_FIX_ATTEMPTS,
    `the loop ran ${ran} times against a cap of ${CONTROL_LIMITS.MAX_FIX_ATTEMPTS}. ` +
    `Each pass is a paid fix call, and an unbounded one is what the audit produced ` +
    `by changing one comparison.`
  );

  // ...and stop at the cap exactly, not one past it.
  assert.equal(shouldKeepFixing({ ...base, attemptsUsed: CONTROL_LIMITS.MAX_FIX_ATTEMPTS }), false);
  assert.equal(shouldKeepFixing({ ...base, attemptsUsed: CONTROL_LIMITS.MAX_FIX_ATTEMPTS - 1 }), true);
});

test("the fix loop does not run at all when there is nothing failing, or when nothing ran", () => {
  // Controls. A cap test that only proves "it stops" would pass on a loop that
  // never starts, which is a different bug wearing the same result.
  assert.equal(
    shouldKeepFixing({ fatalError: undefined, regression: PASSING, criteria: PASSING, attemptsUsed: 0 }),
    false, "a passing verification started a fix loop"
  );
  assert.equal(
    shouldKeepFixing({ fatalError: "the sandbox did not load the module", regression: [], criteria: [], attemptsUsed: 0 }),
    false,
    "a FATAL verification error started a fix loop. There is no failure to fix — " +
    "verification did not run, which is an unknown, and fixing an unknown is guessing."
  );
});

test("the review loop's round cap is a comparison, not a comment", () => {
  assert.equal(reviewRoundsExhausted(0), false, "the review loop refused to run its first round");
  assert.equal(reviewRoundsExhausted(CONTROL_LIMITS.MAX_REVIEW_ROUNDS - 1), false,
    "the loop stopped one round early");
  assert.equal(reviewRoundsExhausted(CONTROL_LIMITS.MAX_REVIEW_ROUNDS), true,
    `round ${CONTROL_LIMITS.MAX_REVIEW_ROUNDS} was allowed past the cap — every extra round ` +
    `is a review, an assess and a fix, all paid for`);
  assert.equal(reviewRoundsExhausted(CONTROL_LIMITS.MAX_REVIEW_ROUNDS + 7), true);

  // And it must genuinely permit more than one round, or the "loop" is a single
  // pass and the page's claim about convergence is decoration.
  assert.ok(CONTROL_LIMITS.MAX_REVIEW_ROUNDS >= 2,
    "the reviewer must see the work more than once for this to be a loop at all");
});
