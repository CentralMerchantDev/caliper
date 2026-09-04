// H1's HARNESS: A KILL MUST COST ONE MUTATION, NEVER THE WHOLE RUN.
//
// This environment reaps long-running commands. scripts/mutate.mjs held every
// result in memory and wrote nothing until the final summary, so each kill
// discarded the entire run -- 18 mutations proved, then a kill, then 29, then
// 3, never accumulating. That is not a finding about any control; it is the
// harness being unable to survive the two-plus hours 52 mutations at ~100s
// each actually costs in this environment.
//
// This tests the PURE decision logic a results-file/--resume mechanism needs:
// which mutations remain pending given what is already recorded, and whether
// a previously-measured baseline can be trusted without re-running the whole
// suite. scripts/mutate.mjs itself (the orchestration -- reading args, running
// the suite, writing files at the real path) is deliberately not re-tested
// here; that would mean re-running the very thing this harness fix exists to
// make cheap to interrupt.

import { test } from "node:test";
import assert from "node:assert/strict";

import { filterPending, baselineIsFresh } from "../scripts/mutate-resume.mjs";

test("a results file with three ids recorded causes those three to be skipped, and a fourth to run", () => {
  const mutations = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const done = ["a", "b", "c"];
  const pending = filterPending(mutations, done);
  assert.deepEqual(pending.map((m: any) => m.id), ["d"]);
});

test("an empty done list leaves every mutation pending", () => {
  const mutations = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(filterPending(mutations, []).map((m: any) => m.id), ["a", "b"]);
});

test("every id already done leaves nothing pending", () => {
  const mutations = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(filterPending(mutations, ["a", "b"]), []);
});

test("a baseline is trusted only when the git status string AND the test files' fingerprint both still match", () => {
  const recorded = { gitStatus: "", fingerprint: "abc123" };
  assert.equal(baselineIsFresh(recorded, "", "abc123"), true);
  assert.equal(baselineIsFresh(recorded, " M public/foo.js\n", "abc123"), false, "a changed tree was trusted as unchanged");
  assert.equal(baselineIsFresh(recorded, "", "def456"), false, "a changed fingerprint was trusted as unchanged");
  assert.equal(baselineIsFresh(null, "", "abc123"), false, "no recorded baseline at all was trusted");
});
