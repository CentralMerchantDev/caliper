// CLAUDE.md TELLS A READER HOW TO VERIFY THE PROJECT. IT HAS TO BE TRUE ITSELF.
//
// The public page's test-count claim has gone stale three times and is now
// mechanically pinned by publicClaims.test.ts. CLAUDE.md makes the identical
// claim -- "npm test # N node tests + M worker tests" -- with nothing pinning
// it. A blind audit (docs/audits/UMAA-phases-B-H.md) found it stale by 297
// tests: 571 written down, 868 actually running. The project's own thesis is
// "a system that only says yes when yes is true"; the file telling a reader
// how to check that was itself unverified against the thing it names.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Walked up rather than a fixed `..`: esbuild bundles this file into
// test/.built/, so import.meta.url there is two levels deeper than the repo
// root, not one -- the exact trap noted in this repo's own build scripts for
// any test that locates its root from import.meta.url.
function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try {
      readFileSync(join(dir, "CLAUDE.md"), "utf8");
      return dir;
    } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

test("CLAUDE.md's verification line names the real test counts", () => {
  const claudeMd = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  const generated = JSON.parse(readFileSync(join(ROOT, "test", "testCount.generated.json"), "utf8")) as {
    nodeTests: number; workerTests: number;
  };

  const m = claudeMd.match(/npm test\s+# (\d+) node tests \+ (\d+) worker tests/);
  assert.ok(m, "CLAUDE.md's \"How to verify\" section no longer has an `npm test # N node tests + M worker tests` line for this test to check");

  const [, claimedNode, claimedWorker] = m;
  assert.equal(
    Number(claimedNode), generated.nodeTests,
    `CLAUDE.md claims ${claimedNode} node tests; the last recorded run measured ${generated.nodeTests}. ` +
      "Update CLAUDE.md, or run `node scripts/gen-test-count.mjs` if the suite has changed.",
  );
  assert.equal(
    Number(claimedWorker), generated.workerTests,
    `CLAUDE.md claims ${claimedWorker} worker tests; the last recorded run measured ${generated.workerTests}.`,
  );
});
