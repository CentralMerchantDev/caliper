// =============================================================================
// PURE DECISION LOGIC FOR mutate.mjs's --resume
//
// A kill must cost one mutation, never the whole run. This is the part of
// that fix worth testing on its own: which mutations are still pending given
// what a results file already recorded, and whether a previously-measured
// baseline can be trusted without paying for the full suite again. The file
// I/O and orchestration (reading real args, running the real suite, writing
// to the real results path) stay in scripts/mutate.mjs -- re-testing those
// here would mean re-running the very thing this exists to make cheap to
// interrupt.
// =============================================================================

/** Mutations whose id is not already in `doneIds`, in their original order. */
export function filterPending(mutations, doneIds) {
  const done = new Set(doneIds);
  return mutations.filter((m) => !done.has(m.id));
}

/**
 * May a recorded baseline be trusted without re-running the suite?
 *
 * Only when NOTHING that would change its answer has moved: the tree's git
 * status is byte-identical to what it was when the baseline was measured
 * (catches an edit landing between resumes), and the test files' content
 * fingerprint is the same (catches a test file being added, removed, or
 * edited, which the baseline's "0 failing" says nothing about for a test
 * that did not read this way when it was measured).
 */
export function baselineIsFresh(recorded, currentGitStatus, currentFingerprint) {
  if (!recorded) return false;
  if (currentGitStatus !== recorded.gitStatus) return false;
  if (currentFingerprint !== recorded.fingerprint) return false;
  return true;
}
