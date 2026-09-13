// =============================================================================
// EXPECTED-RED TESTS -- a named, documented allowlist, not a broken tree
//
// docs/briefs/RUN2-CLI-2026-09-09.md, "the mutation-harness deadlock": a
// second instance of Candidate pattern F (docs/AUDIT-PROTOCOL.md §7,
// 2026-09-08 -- "two correct controls disable each other"). scripts/
// mutate.mjs and scripts/_mutcheck.mjs both, correctly, refuse to score
// mutations against a red baseline (BUILD-LOOP.md Step 6: "a red suite
// must name the EXPECTED test", the same rule this file exists to keep
// true). docs/specs/BOARD-REBUILD-PLAN.md's B2.5 gate is, separately and
// also correctly, a test that is RED ON PURPOSE and stays that way until
// real infrastructure changes (Cloudflare's own 30 s CPU-time ceiling).
// Composed, the two refuse each other forever: nothing in board-
// generator.js or board.js can ever be mutation-tested while B2.5's gate
// exists, because the baseline it sits in can never be green.
//
// THE FIX, decided provisionally by this run per docs/DECISIONS-FOR-MARK.md
// #2's own recommendation ("take the allowlist... preserves the honest red
// AND unblocks the controls, where converting the gate to `{todo}` would
// hide a real measurement"): a named, documented list of test titles that
// are expected to stay red, checked here, in ONE place, so both scripts
// read the same list rather than each growing their own copy that could
// drift (this project's own recurring "two sources of truth" failure
// pattern, avoided here on purpose).
//
// REVERSIBLE IN ONE COMMIT: delete an entry (or this whole file) and both
// scripts go back to their original, stricter behaviour with no other
// code to touch.
// =============================================================================

/**
 * Every entry names WHY it is expected to stay red and WHERE that is
 * documented -- an allowlist with no reason attached is indistinguishable
 * from a suite someone gave up on, which is the exact failure this file
 * must not become.
 */
export const EXPECTED_RED = new Map([
  [
    "B2.5 gate: generation time, against Cloudflare's own default Worker CPU-time ceiling (30,000 ms, wrangler.jsonc has no override)",
    "docs/specs/BOARD-REBUILD-PLAN.md's B2.5 section: asserted honestly, "
      + "and it is red on purpose until generation moves fully off the live "
      + "request path (B2.6 already did this for src/, but the offline "
      + "build step itself -- what this test measures -- is still slower "
      + "than the ceiling it is compared against).",
  ],
]);

/** True if EVERY failing test title is on the allowlist -- a baseline with
 *  even one UNEXPECTED failure is still genuinely red, not exempted. */
export function isBaselineAcceptable(failingTitles) {
  return failingTitles.every((t) => EXPECTED_RED.has(t));
}

/** The subset of a failing-test list that is NOT expected -- what a caller
 *  should actually treat as "the suite is red", after the allowlist is
 *  applied. */
export function unexpectedFailures(failingTitles) {
  return failingTitles.filter((t) => !EXPECTED_RED.has(t));
}
