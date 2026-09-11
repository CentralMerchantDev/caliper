// =============================================================================
// P4.6 -- ONE GATE, NOT THREE THAT EACH CATCH A THIRD OF IT
//
// publicClaims.test.ts, claudeMdIsCurrent.test.ts and the city-summary check
// inside publicClaims.test.ts already assert, separately, that one published
// number matches one generated artefact. Each is real and each stays --
// deleting hard-won, incident-specific assertions and their messages would
// lose exactly the specificity that caught real defects (publicClaims.test.ts's
// own header names three). What did not exist until now: ONE property, "no
// published number is stale", checked in one place, that names EVERY stale
// claim in a single failure rather than a reader having to run three test
// files and correlate three separate red lines themselves.
//
// So this file does not re-derive the comparisons -- it walks a manifest
// built entirely from src/generatedClaimChecks.ts's own pure functions,
// which publicClaims.test.ts and claudeMdIsCurrent.test.ts now ALSO call,
// so there is exactly one comparison per claim, not one per file that
// happens to check it. (Those functions do not live in test/ -- test/run.mjs
// bundles and imports every .test.ts file independently, so a helper
// defined in one test file and imported by another gets its whole file,
// registrations included, bundled and run a SECOND time. Found directly:
// importing settlementsClaimMismatch from publicClaims.test.ts made "the
// test counts on the page are the test counts" run twice in a suite that
// included both files, before this was moved out of test/.)
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { CITY_STATS } from "../src/citySummary.generated.ts";
import {
  settlementsClaimMismatch, buildingsClaimMismatch,
  nodeTestsClaimMismatch, workerTestsClaimMismatch, claudeMdClaimMismatch,
  mutationClaimMismatch,
} from "../src/generatedClaimChecks.ts";
import { stripHtmlComments, stripSourceComments } from "./stripSourceComments.ts";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

function spanText(html: string, id: string): string | null {
  const m = html.match(new RegExp(`<span[^>]*id="${id}"[^>]*>([^<]*)</span>`));
  return m ? m[1].trim() : null;
}

/**
 * Every generated claim this project publishes, checked against the real,
 * current files. Exported (not just used below) so scripts/gen-claims.mjs
 * -- or a future caller -- can walk the SAME list rather than a second,
 * hand-kept one.
 */
export function checkAllGeneratedClaims(): Array<{ name: string; stale: string | null }> {
  const INDEX = stripHtmlComments(readFileSync(join(ROOT, "public", "index.html"), "utf8"));
  const CLAUDE_MD = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  const README = readFileSync(join(ROOT, "README.md"), "utf8");
  const testCount = JSON.parse(readFileSync(join(ROOT, "test", "testCount.generated.json"), "utf8")) as {
    nodeTests: number; workerTests: number;
  };
  const citySummary = readFileSync(join(ROOT, "src", "citySummary.generated.ts"), "utf8");
  const mutationSummary = JSON.parse(readFileSync(join(ROOT, "test", "mutationSummary.generated.json"), "utf8")) as {
    manifestCount: number; caught: number; neverRun: string[];
  };

  const claimedBuildings = Number(spanText(INDEX, "city-stat-buildings")?.replace(/,/g, ""));
  const claimedSettlements = Number(spanText(INDEX, "city-stat-settlements")?.replace(/,/g, ""));
  const claimedNode = Number(spanText(INDEX, "claim-node-tests")?.replace(/,/g, ""));
  const claimedWorker = Number(spanText(INDEX, "claim-worker-tests")?.replace(/,/g, ""));

  return [
    { name: "public/index.html #city-stat-buildings vs src/citySummary.generated.ts CITY_STATS.buildingsPlaced", stale: buildingsClaimMismatch(claimedBuildings, CITY_STATS.buildingsPlaced) },
    { name: "public/index.html #city-stat-settlements vs src/citySummary.generated.ts's settlement count", stale: Number.isFinite(claimedSettlements) ? settlementsClaimMismatch(claimedSettlements, citySummary) : "the settlements placeholder is missing or unparseable" },
    { name: "public/index.html #claim-node-tests vs test/testCount.generated.json nodeTests", stale: nodeTestsClaimMismatch(claimedNode, testCount.nodeTests) },
    { name: "public/index.html #claim-worker-tests vs test/testCount.generated.json workerTests", stale: workerTestsClaimMismatch(claimedWorker, testCount.workerTests) },
    { name: "CLAUDE.md's \"How to verify\" line vs test/testCount.generated.json", stale: claudeMdClaimMismatch(CLAUDE_MD, testCount.nodeTests, testCount.workerTests) },
    { name: "README.md's mutation-evidence sentence vs test/mutationSummary.generated.json", stale: mutationClaimMismatch(README, mutationSummary.manifestCount, mutationSummary.caught, mutationSummary.neverRun.length) },
  ];
}

test("P4.6: no published generated claim is stale -- one gate, naming every stale one at once, not just the first", () => {
  const results = checkAllGeneratedClaims();
  const stale = results.filter((r) => r.stale !== null);
  assert.equal(
    stale.length, 0,
    `${stale.length} of ${results.length} generated claim(s) are stale:\n` +
    stale.map((r) => `  - ${r.name}: ${r.stale}`).join("\n"),
  );
});

// --- watched red, per Mark's own instruction, before this gate is trusted --

test("P4.6 (synthetic): a deliberately staled building count is named, by claim, not silently absorbed", () => {
  assert.equal(buildingsClaimMismatch(17108, 17108), null);
  const wrong = buildingsClaimMismatch(17105, 17108);
  assert.match(wrong!, /page says 17,105, generated summary says 17,108/);
});

test("P4.6 (synthetic): a deliberately staled node-test count is named, by claim, not silently absorbed", () => {
  assert.equal(nodeTestsClaimMismatch(1087, 1087), null);
  const wrong = nodeTestsClaimMismatch(948, 1087);
  assert.match(wrong!, /page says 948, generated record says 1087/);
});

test("P4.6 (synthetic): a deliberately staled worker-test count is named, by claim, not silently absorbed", () => {
  assert.equal(workerTestsClaimMismatch(12, 12), null);
  const wrong = workerTestsClaimMismatch(9, 12);
  assert.match(wrong!, /page says 9, generated record says 12/);
});

test("P4.6 (synthetic): a deliberately staled CLAUDE.md line is named, and an unreadable one fails loudly rather than passing by accident", () => {
  assert.equal(claudeMdClaimMismatch("npm test            # 1087 node tests + 12 worker tests", 1087, 12), null);
  const wrongNode = claudeMdClaimMismatch("npm test            # 1061 node tests + 12 worker tests", 1087, 12);
  assert.match(wrongNode!, /CLAUDE\.md claims 1061 node tests, generated record says 1087/);
  const wrongWorker = claudeMdClaimMismatch("npm test            # 1087 node tests + 9 worker tests", 1087, 12);
  assert.match(wrongWorker!, /CLAUDE\.md claims 9 worker tests, generated record says 12/);
  const unreadable = claudeMdClaimMismatch("this document no longer has that line at all", 1087, 12);
  assert.match(unreadable!, /no longer has/);
});

test("P4.6 (synthetic): a deliberately staled mutation-evidence sentence is named, by claim, not silently absorbed -- RUN2-CLI-2026-09-09's own finding, closed", () => {
  const sentence = "116 deliberate defects injected into the guardrails, 116 caught and re-verified, 0 named and not yet run, 0 survived or inconclusive";
  assert.equal(mutationClaimMismatch(sentence, 116, 116, 0), null);
  const wrongTotal = mutationClaimMismatch(sentence, 126, 116, 10);
  assert.match(wrongTotal!, /README\.md claims 116 defects injected, generated summary says 126/);
  const wrongCaught = mutationClaimMismatch(sentence, 116, 109, 7);
  assert.match(wrongCaught!, /README\.md claims 116 caught, generated summary says 109/);
  const wrongNeverRun = mutationClaimMismatch(sentence, 116, 116, 10);
  assert.match(wrongNeverRun!, /README\.md claims 0 never run, generated summary says 10/);
  const unreadable = mutationClaimMismatch("this document no longer has that sentence at all", 116, 116, 0);
  assert.match(unreadable!, /no longer has/);
});

test("P4.6 (synthetic): a SURVIVED or INCONCLUSIVE mutation result (neither caught nor never-run) cannot silently vanish from the claim's own arithmetic -- the '1,141 tests' gap, generalised and closed here too", () => {
  const sentence = "128 deliberate defects injected into the guardrails, 118 caught and re-verified, 9 named and not yet run, 1 survived or inconclusive";
  assert.equal(mutationClaimMismatch(sentence, 128, 118, 9), null);
  const wrongOtherSentence = "128 deliberate defects injected into the guardrails, 118 caught and re-verified, 9 named and not yet run, 5 survived or inconclusive";
  const wrongOther = mutationClaimMismatch(wrongOtherSentence, 128, 118, 9);
  assert.match(wrongOther!, /README\.md claims 5 survived or inconclusive, generated summary implies 1/);
});

test("P4.6 (synthetic): checkAllGeneratedClaims itself would report exactly one named claim if only one were stale -- not every claim, and not silently none", () => {
  // Exercises the manifest's OWN aggregation logic (not the individual pure
  // functions above) by re-deriving the manifest shape with one entry's
  // input deliberately wrong -- confirms the gate names the RIGHT one, not
  // just that some check somewhere can fail.
  const real = checkAllGeneratedClaims();
  assert.ok(real.every((r) => r.stale === null), "the real repo has a stale generated claim right now -- fix it before trusting this synthetic check's premise that only the injected one should fail");
  const staledManifest = real.map((r) =>
    r.name.startsWith("public/index.html #claim-node-tests")
      ? { name: r.name, stale: nodeTestsClaimMismatch(1, 1087) }
      : r,
  );
  const stale = staledManifest.filter((r) => r.stale !== null);
  assert.equal(stale.length, 1, `expected exactly the injected node-test claim to be stale, got: ${JSON.stringify(stale)}`);
  assert.match(stale[0].name, /#claim-node-tests/);
});

// --- rawSourceScan's own gap, closed: spanText() matched raw HTML, so a
// claim span sitting inside <!-- --> read identically to a live one. See
// test/rawSourceScan.test.ts's own history (2026-09-11) -- this was named
// there as a real, not-yet-fixed instance of the same defect shape as
// claimSpansAreChecked.test.ts and propManifest.test.ts.

test("P4.6 (synthetic): the vulnerability, demonstrated -- spanText() on RAW html reads a commented-out span as if it were live", () => {
  const commentedOut = `<div>before</div><!-- <span id="city-stat-buildings">17108</span> --><div>after</div>`;
  // This is spanText's actual behaviour on unstripped input -- the reason
  // checkAllGeneratedClaims() must never call it on raw INDEX text.
  assert.equal(spanText(commentedOut, "city-stat-buildings"), "17108");
});

test("P4.6 (synthetic): the fix -- stripHtmlComments() first makes the same commented-out span invisible to spanText()", () => {
  const commentedOut = `<div>before</div><!-- <span id="city-stat-buildings">17108</span> --><div>after</div>`;
  assert.equal(spanText(stripHtmlComments(commentedOut), "city-stat-buildings"), null);
});

test("P4.6 (synthetic, GATE static): checkAllGeneratedClaims's own INDEX read is actually wired through stripHtmlComments, not just tested in isolation", () => {
  // The two tests above prove stripHtmlComments works; they do not prove
  // checkAllGeneratedClaims() actually calls it on the real index.html read.
  // A helper proven correct and never wired into the real path is exactly
  // this project's own recorded failure pattern E (MODULE-MAP.md) --
  // checked here directly against this file's own source, comments
  // stripped first so this check cannot itself be satisfied by a comment.
  // Not fileURLToPath(import.meta.url) -- test/run.mjs bundles this file
  // before running it, so that would resolve to the BUILT .mjs output
  // (test/.built/...), not this source file's real text. Read the source
  // directly by its repo-relative path instead.
  const thisFileSrc = stripSourceComments(readFileSync(join(ROOT, "test", "generatedClaimsAreCurrent.test.ts"), "utf8"));
  assert.match(
    thisFileSrc,
    /const INDEX = stripHtmlComments\(readFileSync\(join\(ROOT, "public", "index\.html"\), "utf8"\)\);/,
    "checkAllGeneratedClaims's INDEX read no longer visibly passes through stripHtmlComments -- the fix may have been reverted or bypassed",
  );
});
