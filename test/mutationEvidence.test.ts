// PART 7b/E2 -- THE EVIDENCE FOR THIS PROJECT'S CENTRAL CLAIM LIVES IN THE REPO.
//
// "Every control in test/mutations.json has actually been shown to catch
// something" is the one claim this project's whole mutation discipline rests
// on. Until this file, that claim's ONLY evidence was test/.mutate-results.json
// -- gitignored on purpose, because it is a progress file rewritten after
// every single mutation (a kill mid-run must cost one result, not the whole
// file). The consequence nobody had named: a fresh clone gets 0 rows of
// evidence for the one thing worth showing.
//
// scripts/gen-mutation-summary.mjs is the fix, same shape as
// scripts/gen-test-count.mjs / scripts/gen-city-summary.mjs: run the real
// thing, commit a small checkable SUMMARY of what it proved. This is the
// check that the summary and the manifest still agree -- so an id added to
// test/mutations.json without ever being run is caught here, not assumed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "test", "mutations.json"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + HERE);
}
const ROOT = repoRoot();
const manifest = JSON.parse(readFileSync(join(ROOT, "test", "mutations.json"), "utf8")).mutations as { id: string }[];
const summary = JSON.parse(readFileSync(join(ROOT, "test", "mutationSummary.generated.json"), "utf8"));

test("every mutation in the manifest has a committed, checkable CAUGHT result", () => {
  const byId = new Map<string, { status: string }>(summary.mutations.map((m: { id: string; status: string }) => [m.id, m]));

  const neverRun = manifest.filter((m) => !byId.has(m.id)).map((m) => m.id);
  assert.deepEqual(
    neverRun, [],
    `these controls exist in test/mutations.json but have no result in test/mutationSummary.generated.json ` +
    `-- run them (scripts/_mutcheck.mjs or scripts/mutate.mjs --resume) and regenerate: ${neverRun.join(", ")}`,
  );

  const notCaught = manifest.filter((m) => byId.get(m.id)?.status !== "CAUGHT").map((m) => `${m.id} (${byId.get(m.id)?.status})`);
  assert.deepEqual(
    notCaught, [],
    `these controls have a recorded result that is NOT CAUGHT -- a control that survives its own ` +
    `mutation, or whose mutation could not be applied, is not a control: ${notCaught.join(", ")}`,
  );
});

test("the summary is not stale against the manifest it claims to cover", () => {
  // Counting rather than diffing ids both ways: an id present in the summary
  // but removed from the manifest is not a lie (a deleted control's old
  // proof going stale is harmless), but the summary's OWN counters
  // disagreeing with its own array would be the artefact contradicting
  // itself -- the exact defect this whole file exists to catch elsewhere.
  assert.equal(summary.manifestCount, manifest.length,
    `test/mutationSummary.generated.json says the manifest had ${summary.manifestCount} entries when it ` +
    `was generated; it has ${manifest.length} now. Regenerate: node scripts/gen-mutation-summary.mjs`);
  assert.equal(summary.mutations.length, summary.manifestCount,
    "the summary's own mutation list length disagrees with its own manifestCount field");
  assert.equal(summary.caught, summary.mutations.filter((m: { status: string }) => m.status === "CAUGHT").length,
    "the summary's own \"caught\" counter disagrees with counting its own array");
});
