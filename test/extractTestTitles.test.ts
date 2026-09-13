// =============================================================================
// scripts/extract-test-titles.mjs's own gate -- decision #10
// (docs/DECISIONS-FOR-MARK.md): three independent copies of a title-
// extraction regex all truncated a test's own title at the FIRST
// " (<digit>" found, not the TRAILING duration node's test runner appends,
// silently corrupting any test whose real name contains an early
// parenthetical with a digit in it. This is the shared replacement, tested
// directly, not through a live suite run (slow, non-deterministic, and this
// file's whole point is to be checkable without one).
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractTestTitles } from "../scripts/extract-test-titles.mjs";

test("decision #10: a real test title with an EARLY parenthetical-digit is captured whole, not truncated before the trailing duration", () => {
  // The exact shape that broke this, verbatim from test/boardGenerator.test.ts's
  // own B2.5 title, plus the trailing duration node:test actually appends.
  const line = "✖ B2.5 gate: generation time, against Cloudflare's own default Worker CPU-time ceiling (30,000 ms, wrangler.jsonc has no override) (131965.6883ms)";
  const titles = extractTestTitles(line, { failingOnly: true });
  assert.deepEqual(
    titles,
    ["B2.5 gate: generation time, against Cloudflare's own default Worker CPU-time ceiling (30,000 ms, wrangler.jsonc has no override)"],
    "the mid-string parenthetical must survive; only the trailing runner-appended duration is stripped",
  );
});

test("decision #10: a title with NO trailing duration and no parenthetical at all is captured unchanged", () => {
  const line = "✖ a foreshore refuses a thing that will not say what it is";
  assert.deepEqual(extractTestTitles(line, { failingOnly: true }), ["a foreshore refuses a thing that will not say what it is"]);
});

test("decision #10: the 'failing tests:' summary header is never reported as a test title", () => {
  const block = "✖ failing tests:\n✖ a real failing test (2.1ms)";
  assert.deepEqual(extractTestTitles(block, { failingOnly: true }), ["a real failing test"]);
});

test("decision #10: TAP-style 'not ok N - ' and 'ok N - ' prefixes are handled the same way as the spec-style ones", () => {
  const block = "not ok 3 - a TAP-style failure (30,000 things, still counted) (4.5ms)\nok 4 - a TAP-style pass (12.0ms)";
  assert.deepEqual(extractTestTitles(block, { failingOnly: true }), ["a TAP-style failure (30,000 things, still counted)"]);
  assert.deepEqual(extractTestTitles(block, { failingOnly: false }), [
    "a TAP-style failure (30,000 things, still counted)",
    "a TAP-style pass",
  ]);
});

test("decision #10: failingOnly:false also captures passing (✔) lines, for the 'does this expect refer to a real test' check", () => {
  const block = "✔ a passing test with (2 of 3 checks) inline (5.0ms)\n✖ a failing one (6.0ms)";
  assert.deepEqual(extractTestTitles(block, { failingOnly: false }), [
    "a passing test with (2 of 3 checks) inline",
    "a failing one",
  ]);
});

test("decision #10: a REAL, captured node --test run's own output is parsed correctly -- not a hand-written fixture standing in for one", () => {
  // Not hand-imagined text -- this project's own AUDIT-PROTOCOL.md §7 has
  // burned on exactly that shortcut before ("found by running the regex
  // against the runner's real output instead of assuming its shape").
  // Spawns a REAL, disposable node:test file with a title shaped like
  // B2.5's own (an early parenthetical with a digit, then node's own
  // appended duration) and parses node's OWN real console bytes.
  const dir = mkdtempSync(join(tmpdir(), "extract-test-titles-"));
  const specimen = join(dir, "specimen.test.mjs");
  writeFileSync(
    specimen,
    'import { test } from "node:test";\n' +
    'import assert from "node:assert/strict";\n' +
    'test("a real failure with an early parenthetical (30,000 ms, not the duration)", () => { assert.equal(1, 2); });\n' +
    'test("a real pass with an early parenthetical (2 of 3 checks) too", () => { assert.equal(1, 1); });\n',
  );
  let raw = "";
  try {
    execFileSync(process.execPath, ["--test", specimen], { encoding: "utf8" });
  } catch (e: any) {
    raw = String(e.stdout || "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.ok(raw.length > 0, "the specimen run produced no captured output to test against");
  // node:test prints a failing title twice (the summary line, then the
  // "✖ failing tests:" detail section) -- extractTestTitles does not
  // dedupe (callers do: mutate.mjs via `new Set`, _mutcheck.mjs via
  // `.some()`), so both real occurrences are expected here, both intact.
  const failing = extractTestTitles(raw, { failingOnly: true });
  assert.deepEqual(
    [...new Set(failing)],
    ["a real failure with an early parenthetical (30,000 ms, not the duration)"],
    `expected the real failing title captured whole from a REAL node --test run, got ${JSON.stringify(failing)}`,
  );
  const all = extractTestTitles(raw, { failingOnly: false });
  assert.ok(
    all.includes("a real pass with an early parenthetical (2 of 3 checks) too"),
    `expected the real passing title captured whole too, got ${JSON.stringify(all)}`,
  );
});
