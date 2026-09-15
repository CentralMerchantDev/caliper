// =============================================================================
// THE MUTATION-HARNESS ALLOWLIST -- a named, documented exception, not a hole
//
// docs/briefs/RUN2-CLI-2026-09-09.md's "the mutation-harness deadlock":
// scripts/mutate.mjs and scripts/_mutcheck.mjs correctly refuse to score
// mutations against a red baseline; docs/specs/BOARD-REBUILD-PLAN.md's
// B2.5 gate was correctly red on purpose. scripts/expected-red.mjs is the
// fix -- this gates that the fix itself cannot be gamed into hiding a
// REAL, unexpected failure.
//
// EXPECTED_RED is EMPTY (FIX-5, PLAN.md §3.5) -- the one entry it ever held
// named test/boardGenerator.test.ts, quarantined in the b1-board takedown
// along with the files that entry existed to unblock mutation-testing of.
// See scripts/expected-red.mjs's own header for the full reasoning. These
// tests exercise the general MECHANISM (isBaselineAcceptable/
// unexpectedFailures) against a synthetic entry rather than a real one, so
// they stay meaningful whether or not EXPECTED_RED currently holds anything.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_RED, isBaselineAcceptable, unexpectedFailures } from "../scripts/expected-red.mjs";

const SYNTHETIC_TITLE = "synthetic expected-red entry, for exercising the mechanism only";

test("EXPECTED_RED is currently empty -- both scripts' baseline check is fully strict until a real entry is added again", () => {
  assert.equal(EXPECTED_RED.size, 0, "an entry exists here that this test does not know about -- read scripts/expected-red.mjs's own header before assuming this should be non-empty");
});

test("expected-red: a baseline with ONLY a documented entry is acceptable (mechanism check, using a synthetic entry -- EXPECTED_RED is empty by default)", () => {
  const allowlist = new Map([[SYNTHETIC_TITLE, "synthetic, for this test only"]]);
  assert.equal(isBaselineAcceptable([SYNTHETIC_TITLE], allowlist), true);
  assert.equal(isBaselineAcceptable([], allowlist), true);
});

test("expected-red: a baseline with even one UNEXPECTED failure alongside a documented one is NOT acceptable", () => {
  const allowlist = new Map([[SYNTHETIC_TITLE, "synthetic, for this test only"]]);
  assert.equal(isBaselineAcceptable([SYNTHETIC_TITLE, "some other test that broke"], allowlist), false);
  assert.equal(isBaselineAcceptable(["some other test that broke"], allowlist), false);
});

test("expected-red: unexpectedFailures strips only the documented entries, naming everything else", () => {
  const allowlist = new Map([[SYNTHETIC_TITLE, "synthetic, for this test only"]]);
  const result = unexpectedFailures([SYNTHETIC_TITLE, "a real new failure", "another real failure"], allowlist);
  assert.deepEqual(result, ["a real new failure", "another real failure"]);
});

test("expected-red: with the real, current (empty) EXPECTED_RED, every failing title is unexpected -- there is no free pass today", () => {
  assert.deepEqual(unexpectedFailures(["anything", "goes"]), ["anything", "goes"]);
  assert.equal(isBaselineAcceptable(["anything"]), false);
  assert.equal(isBaselineAcceptable([]), true);
});

test("expected-red: every entry names a reason, not a bare title -- an allowlist with no reason is a hole with no evidence it was ever reviewed", () => {
  for (const [title, reason] of EXPECTED_RED) {
    assert.ok(typeof title === "string" && title.length > 10, "an allowlist title must be a real, specific test name");
    assert.ok(typeof reason === "string" && reason.length > 20, `the entry for "${title}" has no real reason attached`);
  }
});
