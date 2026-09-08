// =============================================================================
// P4.3 ISOLATE
//
// Every check here runs against scripts/_isolate-probe.mjs's real, isolated-
// child-process build of the real 26 km world -- the same pattern
// test/boardAdapter.test.ts uses and for the identical, measured reason
// (building even one such world at module scope in the shared 130-file test
// process has crashed this suite with a V8 OOM before; the probe alone
// completes in a few seconds).
//
// TWO CLAIMS, TWO HALVES:
//
//   "immediate neighbours" is a real, geometric, board.js-backed decision
//   (neighboursOf, public/isolate.js) -- checked below against a real
//   plotId's real neighbours, not invented ones.
//
//   restore is byte-identical (applyIsolate/restoreIsolate). WHAT THIS
//   CATCHES: a hidden InstancedMesh batch's `.visible` left false, an
//   instance matrix mutated by the isolate path and not restored, a
//   standalone isolate mesh left in (or wrongly removed from) the scene, a
//   material accidentally shared/double-disposed. WHAT IT DOES NOT CATCH: a
//   defect specific to the real renderer's own LOD/geometry/typology-batch
//   structure -- the probe's InstancedMesh batches are a real-Three.js,
//   real-plotId, real-position ANALOG of city-render.js's own batching (see
//   the probe's own header for why: building the real batches needs a real
//   renderer, which needs a GPU, which test/rendererStatic.test.ts's own
//   header already documents as out of this suite's reach). A fingerprint
//   that only counted objects could not fail on "restored with the wrong
//   visibility, material, or matrix" -- Mark's own naming of the failure
//   mode this test exists to catch -- so the fingerprint below hashes every
//   batch's visibility flag, material uuid, AND full instance-matrix array,
//   not a count.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function findPublic() {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "public");
    try { readFileSync(join(c, "world-scale.js"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
const RENDER_3D = readFileSync(join(findPublic(), "world-render-3d.js"), "utf8");

// A regex match against raw source is satisfied by a call sitting inside a
// `//` comment just as happily as by real code -- caught directly, while
// writing this file's own mutation check: commenting out the real
// `this._restoreIsolateState();` call left the string "this._restoreIsolateState()"
// still present two words later in the explanatory comment above it, and the
// wiring test below passed anyway. Strip line comments before matching so a
// wiring test here can only pass on code that actually executes.
function stripLineComments(src) {
  return src.split("\n").map((line) => {
    const i = line.indexOf("//");
    return i === -1 ? line : line.slice(0, i);
  }).join("\n");
}
const RENDER_3D_CODE_ONLY = stripLineComments(RENDER_3D);

function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const PROBE = join(ROOT, "scripts", "_isolate-probe.mjs");

const R = JSON.parse(execFileSync(process.execPath, [PROBE], { encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 }));

test("P4.3: neighboursOf finds a real, non-trivial neighbour set for a real plotId", () => {
  assert.ok(R.neighbourGeometryChecks.plotId, "the probe should have found a sample building at all");
  assert.ok(R.neighbourGeometryChecks.neighbourCount > 0, `expected a real building with at least one real neighbour within ${R.neighbourGeometryChecks.marginM} m -- got 0 across the probe's sample`);
});

test("P4.3: every reported neighbour genuinely falls within NEIGHBOUR_MARGIN_M of the selection's own footprint", () => {
  assert.equal(R.neighbourGeometryChecks.allWithinMargin, true, "a reported neighbour's own foot rectangle is farther than the margin from the selection -- the query is returning something that is not actually a neighbour");
});

test("P4.3: the selected piece is never reported as its own neighbour", () => {
  assert.equal(R.neighbourGeometryChecks.selectionExcludedFromItsOwnNeighbours, true);
});

test("P4.3: every reported neighbour is a building -- roads and bridges from the same local query are excluded, matching the pass's own stated buildings-only scope", () => {
  // A blind audit (docs/AUDIT-PROTOCOL.md) found roads leaking into
  // `neighbours` before this filter existed: boardPieces carries every
  // piece kind, and inCells() answers by rectangle, not by kind. This test
  // would not be meaningful if the local query never found a non-building
  // piece to filter in the first place -- nonBuildingHitsExisted confirms
  // it did (real roads/bridges genuinely stand near the sampled building).
  assert.equal(R.neighbourGeometryChecks.nonBuildingHitsExisted, true, "the probe's own local query found no non-building piece near the sample -- this test cannot prove the filter does anything; pick a denser sample");
  assert.equal(R.neighbourGeometryChecks.allNeighboursAreBuildings, true, `a non-building piece (road/bridge) was reported as a neighbour -- ${R.neighbourGeometryChecks.rawHitCount} raw hits vs ${R.neighbourGeometryChecks.neighbourCount} building neighbours`);
});

test("P4.3: a building thousands of metres away is correctly excluded -- guards against a margin/rectangle bug that returns everything", () => {
  assert.equal(R.farIsExcluded, true);
});

test("P4.3: the local board population is a genuine best-effort placement of real adapted data, not silently all-or-nothing", () => {
  // Not asserted to equal localCount -- board-adapter.js's own footprint-proxy
  // approximation (its header) is not guaranteed to satisfy board.js's
  // stricter canPlace on every real piece. Bounded instead: almost every
  // locally-prefiltered piece should place, or the neighbour query is
  // silently blind to most of its own local candidates.
  assert.ok(R.neighbourGeometryChecks.placedCount > 0, "no locally-prefiltered piece placed at all -- the neighbour query would be blind");
  assert.ok(
    R.neighbourGeometryChecks.placedCount >= R.neighbourGeometryChecks.localCount - 3,
    `only ${R.neighbourGeometryChecks.placedCount} of ${R.neighbourGeometryChecks.localCount} locally-prefiltered real pieces placed -- more than a small, expected residual failed board.js's canPlace`,
  );
});

test("P4.3: isolate actually changes the scene -- a fingerprint that never changes could not catch a restore bug either", () => {
  assert.equal(R.fingerprint.isolateActuallyChangedSomething, true);
  assert.equal(R.fingerprint.duringVisibleCount, 0, "every real InstancedMesh batch in the sample should be hidden while isolated");
  assert.ok(R.fingerprint.duringSceneChildCount > R.fingerprint.beforeSceneChildCount, "the kept set's standalone meshes should have been added to the scene");
});

test("P4.3: restore is byte-identical -- every batch's visibility, material identity, and FULL instance-matrix array match exactly, not just a count", () => {
  assert.equal(R.fingerprint.restoreIsByteIdentical, true, `before/after scene fingerprint mismatch (before ${R.fingerprint.beforeDigest.slice(0, 12)}, after ${R.fingerprint.afterDigest.slice(0, 12)}) -- restore did not put visibility, material, or a matrix back exactly as it was`);
  assert.equal(R.fingerprint.afterSceneChildCount, R.fingerprint.beforeSceneChildCount, "a standalone isolate mesh was left in the scene (or an original was removed) after restore");
});

// -----------------------------------------------------------------------------
// WIRING -- constructing a real Renderer3D needs a GPU this suite does not
// have (test/rendererStatic.test.ts's own documented limitation, and
// test/pickSelection.test.ts's identical workaround for P4.1): read the
// source, confirm _isolate/_restoreIsolateState call the real public/
// isolate.js functions and are actually reachable from a new pick.
// -----------------------------------------------------------------------------

test("P4.3 (wiring): _isolate() calls the real neighboursOf/applyIsolate exports, not a reimplementation", () => {
  assert.match(RENDER_3D_CODE_ONLY, /import\s*\{\s*neighboursOf,\s*applyIsolate,\s*restoreIsolate\s*\}\s*from\s*"\.\/isolate\.js"/, "world-render-3d.js no longer imports P4.3's real functions from public/isolate.js");
  const start = RENDER_3D_CODE_ONLY.indexOf("_isolate()");
  assert.ok(start > -1, "could not find the _isolate() method");
  const body = RENDER_3D_CODE_ONLY.slice(start, start + 1200);
  assert.match(body, /neighboursOf\(plotId,\s*this\._boardPieces/, "_isolate() does not call the real neighboursOf against the real board pieces index");
  assert.match(body, /applyIsolate\(\{/, "_isolate() does not call the real applyIsolate to mutate the scene");
});

test("P4.3 (wiring): a new pick restores any active isolate -- an isolate does not silently survive picking something else", () => {
  const pickHandlerStart = RENDER_3D_CODE_ONLY.indexOf("this._selectedPiece = piece;");
  assert.ok(pickHandlerStart > -1, "could not find the city-mode pick handler's selection assignment -- it may have moved or been renamed");
  const cityModeBlock = RENDER_3D_CODE_ONLY.slice(pickHandlerStart, pickHandlerStart + 1000);
  assert.match(cityModeBlock, /this\._restoreIsolateState\(\)/, "the city-mode pick handler no longer restores isolate state on a new pick");
});

test("P4.3 (wiring): WorldRenderer exposes isolate()/restoreIsolate() that delegate to the real implementation, not a stub", () => {
  assert.match(RENDER_3D, /isolate\(\)\s*\{\s*return\s+this\._impl\._isolate\s*\?\s*this\._impl\._isolate\(\)\s*:\s*null;/, "WorldRenderer.isolate() no longer delegates to the real _impl._isolate()");
  assert.match(RENDER_3D, /restoreIsolate\(\)\s*\{\s*if\s*\(this\._impl\._restoreIsolateState\)\s*this\._impl\._restoreIsolateState\(\);/, "WorldRenderer.restoreIsolate() no longer delegates to the real _impl._restoreIsolateState()");
});

test("P4.3 (wiring): a P4.4-moved piece not in the kept set is hidden by isolate, and restored -- a blind audit found applyIsolate cannot see it at all (it lives in a standalone Mesh, not buildingInstanceIndex)", () => {
  // Cannot be tested by constructing a real Renderer3D (needs a GPU, per
  // test/rendererStatic.test.ts's own documented limitation) or by calling
  // applyIsolate directly (the fix is deliberately NOT inside it -- see
  // _isolate()'s own comment for why: keeping the pure isolate.js module
  // ignorant of P4.4's move-specific state). Read from source instead.
  const isolateStart = RENDER_3D_CODE_ONLY.indexOf("_isolate() {");
  const isolateBody = RENDER_3D_CODE_ONLY.slice(isolateStart, isolateStart + 2200);
  assert.match(isolateBody, /this\._movedPieces/, "_isolate() no longer accounts for pieces moved earlier via P4.4");
  assert.match(isolateBody, /keepIds\.has\(`bld-\$\{movedPlotId\}`\)/, "_isolate() no longer checks a moved piece against the real keepIds before hiding it");
  assert.match(isolateBody, /entry\.standalone\.visible\s*=\s*false/, "_isolate() no longer hides a moved piece's standalone mesh");

  const restoreStart = RENDER_3D_CODE_ONLY.indexOf("_restoreIsolateState() {");
  const restoreBody = RENDER_3D_CODE_ONLY.slice(restoreStart, restoreStart + 600);
  assert.match(restoreBody, /standalone\.visible\s*=\s*true/, "_restoreIsolateState() no longer restores a hidden moved piece's visibility");
});
