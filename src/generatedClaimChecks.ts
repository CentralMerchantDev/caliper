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

export function claudeMdClaimMismatch(claudeMdText: string, generatedNodeTests: number, generatedWorkerTests: number): string | null {
  const m = claudeMdText.match(/npm test\s+# (\d+) node tests \+ (\d+) worker tests/);
  if (!m) return "CLAUDE.md's \"How to verify\" section no longer has an `npm test # N node tests + M worker tests` line";
  const [, claimedNode, claimedWorker] = m;
  if (Number(claimedNode) !== generatedNodeTests) return `CLAUDE.md claims ${claimedNode} node tests, generated record says ${generatedNodeTests}`;
  if (Number(claimedWorker) !== generatedWorkerTests) return `CLAUDE.md claims ${claimedWorker} worker tests, generated record says ${generatedWorkerTests}`;
  return null;
}
