// =============================================================================
// EXTRACT TEST TITLES -- one regex, shared, not three independent copies.
//
// docs/DECISIONS-FOR-MARK.md #10: scripts/mutate.mjs and scripts/
// gen-test-count.mjs each carried their OWN copy of a title-extraction regex
// that stopped at the FIRST " (<digit>" it found in a line, rather than the
// TRAILING duration node's own test runner appends (`(NNN.NNms)` or
// `(NNNs)`). Any real test whose own title contains an early parenthetical
// with a digit in it -- "B2.5 gate: ... ceiling (30,000 ms, wrangler.jsonc
// has no override)" is the one that surfaced this -- got silently truncated
// before the runner's own trailing duration, corrupting: mutate.mjs's
// EXPECTED_RED baseline filter, its per-mutation CAUGHT/SURVIVED scoring
// (both read the SAME truncated list), its stale-`expect`-reference check,
// and gen-test-count.mjs's own diagnostic failure listing. Three
// independent, silently-drifted copies of the same regex is this project's
// own named, recurring failure pattern -- fixed here by having exactly one.
//
// scripts/_mutcheck.mjs already had a CORRECT version of this (anchored on
// the trailing duration, not the first digit) -- this generalises that one,
// rather than inventing a fourth pattern, and _mutcheck.mjs now imports it
// too instead of keeping its own copy.
// =============================================================================

/**
 * Extract test titles from a `node test/run.mjs` (or plain `node --test`)
 * console transcript.
 *
 * `failingOnly: true` matches only `✖ `/`not ok N - ` lines (this project's
 * own summary-line prefix and the TAP-style prefix node:test can also
 * print). `failingOnly: false` (default) also matches `✔ `/`ok N - ` lines,
 * for building the full "every test this run reported" list.
 *
 * The trailing `(NNN[.NN]ms)`/`(NNNs)` duration is OPTIONAL in the match
 * (the "✖ failing tests:" summary header carries no duration and is
 * filtered out by name below, same as before) but when present is matched
 * greedily-from-the-right via node's own lazy-quantifier-plus-anchor
 * behaviour: `.+?` expands only as far as it must for the REST of the line
 * to satisfy the optional duration group followed by end-of-line, so a
 * title containing its OWN incidental "(N ms)"-shaped text is captured
 * whole, not cut at that point -- this is the exact defect the three
 * duplicated regexes had.
 */
export function extractTestTitles(output, { failingOnly = false } = {}) {
  const prefixes = failingOnly
    ? "not ok \\d+ - |✖ "
    : "ok \\d+ - |not ok \\d+ - |✔ |✖ ";
  const re = new RegExp(`^(?:${prefixes})(.+?)(?: \\([\\d.]+m?s\\))?$`, "gm");
  return [...output.matchAll(re)]
    .map((m) => m[1].trim())
    .filter((n) => n !== "failing tests:");
}
