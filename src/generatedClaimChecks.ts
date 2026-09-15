// =============================================================================
// P4.6 -- the pure comparison behind every generated claim this project
// publishes, in one place.
//
// Deliberately NOT in test/ -- test/run.mjs bundles and imports every
// `.test.ts` file independently, so a shared helper defined inside one test
// file and imported by another gets bundled (and its own test() calls
// re-registered and re-run) a second time. Found directly, before it
// shipped: importing settlementsClaimMismatch from publicClaims.test.ts
// made "the test counts on the page are the test counts" run twice in a
// suite that included both files.
//
// publicClaims.test.ts, claudeMdIsCurrent.test.ts and
// test/generatedClaimsAreCurrent.test.ts (P4.6's own consolidated gate) all
// call these SAME functions -- one comparison per claim, not a second
// answer to the same need reimplemented per file.
// =============================================================================

/**
 * PART 7b/E8: a regex that stops matching (the summary's prose is
 * reworded, a typo lands in gen-city-summary.mjs) must fail loudly, not
 * silently skip the comparison -- the exact fail-open shape J4's own
 * tolerance-band defect had.
 */
export function settlementsClaimMismatch(claimedSettlements: number, summaryText: string): string | null {
  const settMatch = summaryText.match(/(\d+)\s+settlements/i);
  if (!settMatch) return "could not read a settlement count out of citySummary.generated.ts -- has its wording changed?";
  const real = Number(settMatch[1]);
  if (claimedSettlements !== real) return `the page says ${claimedSettlements} settlements; the generated summary says ${real}`;
  return null;
}

export function buildingsClaimMismatch(claimedBuildings: number, buildingsPlaced: number): string | null {
  if (!Number.isFinite(claimedBuildings)) return "the buildings placeholder is missing or unparseable";
  if (claimedBuildings !== buildingsPlaced) {
    return `page says ${claimedBuildings.toLocaleString()}, generated summary says ${buildingsPlaced.toLocaleString()} -- run node scripts/gen-city-summary.mjs`;
  }
  return null;
}

export function nodeTestsClaimMismatch(claimedNode: number, generatedNodeTests: number): string | null {
  if (!Number.isFinite(claimedNode)) return "#claim-node-tests is missing from the page";
  if (claimedNode !== generatedNodeTests) {
    return `page says ${claimedNode}, generated record says ${generatedNodeTests} -- run node scripts/gen-test-count.mjs`;
  }
  return null;
}

export function workerTestsClaimMismatch(claimedWorker: number, generatedWorkerTests: number): string | null {
  if (!Number.isFinite(claimedWorker)) return "#claim-worker-tests is missing from the page";
  if (claimedWorker !== generatedWorkerTests) {
    return `page says ${claimedWorker}, generated record says ${generatedWorkerTests} -- run node scripts/gen-test-count.mjs`;
  }
  return null;
}

/**
 * RUN2-CLI-2026-09-09: README.md said "98 deliberate defects injected...,
 * all 98 caught" with nothing checking it against the real manifest --
 * the exact "declared value in a second place, nothing binding them"
 * pattern this project's own docs (AUDIT-PROTOCOL.md's Failure pattern B)
 * name elsewhere. Confirmed directly before writing this: no test file
 * read README.md at all. This closes that hole the same way every other
 * generated claim on this page already is -- read the real manifest, not
 * a hand-typed number with no expiry.
 */
export function mutationClaimMismatch(readmeText: string, generatedTotal: number, generatedCaught: number, generatedNeverRun: number): string | null {
  // caught + neverRun does NOT have to equal the total -- a SURVIVED or
  // INCONCLUSIVE result is neither, and a sentence naming only two of three
  // real states can look internally consistent while silently omitting the
  // third. The exact "individually-correct numbers that do not sum to the
  // stated total" gap this run's own ground-check found in
  // docs/briefs/OVERNIGHT-CLI-2026-09-09.md's "1,141 tests" line -- fixed
  // here by requiring the sentence to name the remainder explicitly
  // (0 when there is none), rather than letting the sentence go quiet
  // about a state it has no clause for.
  const otherCount = generatedTotal - generatedCaught - generatedNeverRun;
  const m = readmeText.match(/(\d+)\s+deliberate defects injected into the guardrails,\s+(\d+)\s+caught and re-verified,\s+(\d+)\s+named and not yet run,\s+(\d+)\s+survived or inconclusive/i);
  if (!m) return "README.md no longer has a \"N deliberate defects injected... caught and re-verified... named and not yet run... survived or inconclusive\" sentence";
  const [, claimedTotal, claimedCaught, claimedNeverRun, claimedOther] = m;
  if (Number(claimedTotal) !== generatedTotal) return `README.md claims ${claimedTotal} defects injected, generated summary says ${generatedTotal} -- run node scripts/gen-mutation-summary.mjs`;
  if (Number(claimedCaught) !== generatedCaught) return `README.md claims ${claimedCaught} caught, generated summary says ${generatedCaught} -- run node scripts/gen-mutation-summary.mjs`;
  if (Number(claimedNeverRun) !== generatedNeverRun) return `README.md claims ${claimedNeverRun} never run, generated summary says ${generatedNeverRun} -- run node scripts/gen-mutation-summary.mjs`;
  if (Number(claimedOther) !== otherCount) return `README.md claims ${claimedOther} survived or inconclusive, generated summary implies ${otherCount} (total ${generatedTotal} - caught ${generatedCaught} - never-run ${generatedNeverRun}) -- run node scripts/gen-mutation-summary.mjs`;
  return null;
}

/**
 * SHIP-5 (docs/briefs/BLD-2026-09-17.md §5): "a deploy manifest -- version,
 * commit, build time, on the page." These three are the SAME "page claim
 * vs. generated record" shape every other function in this file already
 * checks -- has the page been regenerated since the record last changed.
 * The DEEPER claim SHIP-5 also asks for ("matches what built it") is not a
 * pure function of two strings -- it needs the real, live git history (is
 * the declared commit HEAD or a real ancestor of it) -- and lives in
 * test/deployManifest.test.ts itself instead, the one place in this
 * project's claim-checking that legitimately shells out to git rather than
 * comparing two already-generated artefacts.
 */
export function deployVersionClaimMismatch(claimedVersion: string, generatedVersion: string): string | null {
  if (!claimedVersion) return "#deploy-version is missing from the page";
  if (claimedVersion !== generatedVersion) {
    return `page says v${claimedVersion}, generated manifest says v${generatedVersion} -- run node scripts/gen-deploy-manifest.mjs`;
  }
  return null;
}

export function deployCommitClaimMismatch(claimedCommit: string, generatedShortCommit: string): string | null {
  if (!claimedCommit) return "#deploy-commit is missing from the page";
  if (claimedCommit !== generatedShortCommit) {
    return `page says ${claimedCommit}, generated manifest says ${generatedShortCommit} -- run node scripts/gen-deploy-manifest.mjs`;
  }
  return null;
}

export function deployBuildTimeClaimMismatch(claimedBuildTime: string, generatedBuildTime: string): string | null {
  if (!claimedBuildTime) return "#deploy-build-time is missing from the page";
  if (claimedBuildTime !== generatedBuildTime) {
    return `page says "${claimedBuildTime}", generated manifest says "${generatedBuildTime}" -- run node scripts/gen-deploy-manifest.mjs`;
  }
  return null;
}

export function claudeMdClaimMismatch(claudeMdText: string, generatedNodeTests: number, generatedWorkerTests: number): string | null {
  const m = claudeMdText.match(/npm test\s+# (\d+) node tests \+ (\d+) worker tests/);
  if (!m) return "CLAUDE.md's \"How to verify\" section no longer has an `npm test # N node tests + M worker tests` line";
  const [, claimedNode, claimedWorker] = m;
  if (Number(claimedNode) !== generatedNodeTests) return `CLAUDE.md claims ${claimedNode} node tests, generated record says ${generatedNodeTests}`;
  if (Number(claimedWorker) !== generatedWorkerTests) return `CLAUDE.md claims ${claimedWorker} worker tests, generated record says ${generatedWorkerTests}`;
  return null;
}
