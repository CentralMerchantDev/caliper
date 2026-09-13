// =============================================================================
// THE MUTATION-HARNESS ALLOWLIST -- a named, documented exception, not a hole
//
// docs/briefs/RUN2-CLI-2026-09-09.md's "the mutation-harness deadlock":
// scripts/mutate.mjs and scripts/_mutcheck.mjs correctly refuse to score
// mutations against a red baseline; docs/specs/BOARD-REBUILD-PLAN.md's
// B2.5 gate is correctly red on purpose. scripts/expected-red.mjs is the
// fix -- this gates that the fix itself cannot be gamed into hiding a
// REAL, unexpected failure.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_RED, isBaselineAcceptable, unexpectedFailures } from "../scripts/expected-red.mjs";

const B25_TITLE = "B2.5 gate: generation time, against Cloudflare's own default Worker CPU-time ceiling (30,000 ms, wrangler.jsonc has no override)";

test("expected-red: a baseline with ONLY the documented B2.5 failure is acceptable", () => {
  assert.equal(isBaselineAcceptable([B25_TITLE]), true);
  assert.equal(isBaselineAcceptable([]), true);
});

test("expected-red: a baseline with even one UNEXPECTED failure alongside the documented one is NOT acceptable", () => {
  assert.equal(isBaselineAcceptable([B25_TITLE, "some other test that broke"]), false);
  assert.equal(isBaselineAcceptable(["some other test that broke"]), false);
});

test("expected-red: unexpectedFailures strips only the documented entries, naming everything else", () => {
  const result = unexpectedFailures([B25_TITLE, "a real new failure", "another real failure"]);
  assert.deepEqual(result, ["a real new failure", "another real failure"]);
});

test("expected-red: every entry names a reason, not a bare title -- an allowlist with no reason is a hole with no evidence it was ever reviewed", () => {
  for (const [title, reason] of EXPECTED_RED) {
    assert.ok(typeof title === "string" && title.length > 10, "an allowlist title must be a real, specific test name");
    assert.ok(typeof reason === "string" && reason.length > 20, `the entry for "${title}" has no real reason attached`);
  }
});

test("expected-red (guardrail): the B2.5 title in this allowlist matches the REAL test title in test/boardGenerator.test.ts, not a paraphrase", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { join, dirname } = await import("node:path");
  let dir = dirname(fileURLToPath(import.meta.url));
  let src = "";
  for (let up = 0; up < 6; up++) {
    try { src = readFileSync(join(dir, "test", "boardGenerator.test.ts"), "utf8"); break; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  assert.ok(src.includes(B25_TITLE), "the allowlist's B2.5 title is not a real substring of test/boardGenerator.test.ts -- it will never actually match a real failure, the exact 'expect string paraphrased, not copied' lesson this run already hit twice tonight");
});
