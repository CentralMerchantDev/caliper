// =============================================================================
// generateWorld() -> placed pieces, and determinism of that conversion
//
// BOARD-CONVERSION-PLAN.md P1.1 (the record, and the gate: every field
// present and integral, cell values round-trip through atomOf/atomOrigin --
// PLACEMENT-CONTRACT.md Part 0's 1 m ATOM, not the old 8 m CELL)
// and P1.5 (same seed -> same piece list, same order, same ids).
//
// EVERY CHECK HERE RUNS IN A SEPARATE, ISOLATED CHILD PROCESS
// (scripts/_board-adapter-probe.mjs), NOT IN THIS TEST FILE.
//
// Building even ONE full 26 km world at module scope in test/run.mjs's
// shared process (~110 other bundled test files' own world-builds already
// resident by the time this file's tests run) reliably crashed the whole
// suite with a V8 OOM ("Committing semi space failed") -- watched three
// times, with different exit codes, including after the second build
// (P1.5's) was already isolated on its own. The first build had to move
// out of the shared process too. Measured directly: the probe script alone,
// in its own process, completes in a few seconds with no memory pressure.
// The cost was never the logic; it was one process holding a 26 km world's
// state for the rest of a 110-file run.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// esbuild bundles this file into test/.built/, so import.meta.url there is
// one level deeper than this file's real location -- walk up to the repo
// root rather than assume a fixed offset (same trap, same fix, as
// test/claudeMdIsCurrent.test.ts's own repoRoot()).
function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const PROBE = join(ROOT, "scripts", "_board-adapter-probe.mjs");

function runProbe() {
  const stdout = execFileSync(process.execPath, [PROBE], { encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(stdout);
}

// One build, shared by every P1.1 test below -- P1.5 spawns its own second,
// independent build (see that test).
const A = runProbe();

test("P1.1: every field is present and integral on a piece list built from a real generated world", () => {
  assert.ok(A.pieceCount > 100, `expected a real, non-trivial world -- got ${A.pieceCount} pieces`);
  assert.equal(A.fieldViolationCount, 0, `${A.fieldViolationCount} pieces have a missing/non-integral field: ${JSON.stringify(A.fieldViolations)}`);
});

test("P1.1: every piece id is globally unique", () => {
  assert.equal(A.duplicateIdCount, 0, `duplicate piece ids: ${JSON.stringify(A.duplicateIds)}`);
});

test("P1.1: plot cell round-trip through atomOf/atomOrigin -- MEASURED, and the number is not what PLACEMENT-CONTRACT.md claims", () => {
  // PLACEMENT-CONTRACT.md Part 1: "Plots carved on whole cells... This part
  // of the original Part 1 was right and survives unchanged". Under the
  // OLD 8 m CELL check, 16,204 of 16,209 plots (99.97%) did not round-trip.
  // Under Part 0's 1 m ATOM (the real unit, added 2026-09-07), it is
  // cheaper but still real: most plot origins carry a genuine sub-metre
  // fraction (e.g. "block--1349-760-p0" has xMin -1343.8, zMin 768.9) --
  // not the 8 m-scale defect the old check reported, but not the "already
  // whole-metre" claim either. This is exactly the claim-vs-code gap this
  // whole plan's first rule exists to catch (verifySocketMating's header
  // was the P0 example; this is the P1 one). NOT asserted to be zero here
  // -- fixing city-plan.js's plot-carving math is out of P1's scope
  // ("nothing renders differently yet", representation not generation).
  // Reported plainly, loudly, for Mark.
  console.log(
    `PLOT ATOM ALIGNMENT: ${A.plotCount - A.plotMismatchCount}/${A.plotCount} round-trip cleanly ` +
    `(${A.plotMismatchCount} do not -- PLACEMENT-CONTRACT.md's "carved on whole cells" claim does not hold today, ` +
    `even at the cheaper 1 m atom). Sample mismatches: ${JSON.stringify(A.plotMismatches)}`,
  );
  assert.ok(A.plotCount > 0, "sanity: the world has plots at all");
});

test("P1.1: road span along-axis anchors round-trip through atomOf/atomOrigin -- measured, not asserted", () => {
  // Roads carry no such claim in the first place (unlike plots), so this
  // stays a plain measurement.
  console.log(`road span alignment: ${A.roadAligned}/${A.roadTotal} along-axis anchors are atom-aligned`);
});

// ---------------------------------------------------------------------------
// P1.5 — determinism
// ---------------------------------------------------------------------------

test("P1.5: the same seed produces the same piece list, same order, same ids", () => {
  const B = runProbe();
  assert.equal(B.pieceCount, A.pieceCount);
  assert.deepEqual(B.ids, A.ids, "piece order/ids must be identical across two builds of the same seed");
  assert.equal(B.digest, A.digest, "the full piece list must be byte-identical across two builds of the same seed");
});
