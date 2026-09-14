// =============================================================================
// THE BOARD RENDERER'S OWN TESTS — RB1's gate, restated for this module's own
// slice of it: a piece the board actually holds must resolve to exactly the
// mesh data the render will use, or be named as skipped -- never silently
// dropped and never a guessed substitute.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  MODULE_SIZE_M,
  glbBasename,
  layerForGlb,
  footprintForRotation,
  anchorForCell,
  resolveBoardPieces,
  resolveGhost,
  resolveReadout,
  rotateGeometryY,
} from "../public/board-renderer.js";
import { createAreaBoard } from "../public/area-board.js";
import { createPlacementSession } from "../public/placement.js";
import * as REAL_SCORING from "../public/scoring.js";

const MANIFEST = {
  layers: [
    { index: 0, usedBy: ["building-sample-house-b.glb", "building-sample-tower-d.glb"] },
    { index: 1, usedBy: ["road-straight.glb"] },
    { index: 2, usedBy: ["building-skyscraper-b.glb"] },
  ],
};

const CATALOGUE = {
  "house-a": { footprint: [2, 3], terrainMask: ["land"], glb: "vendor/kits/kenney-modular-buildings/building-sample-house-b.glb" },
  "tower-base-6x6-a": { footprint: [6, 6], terrainMask: ["land"], glb: "vendor/kits/kenney-modular-buildings/building-sample-tower-d.glb" },
  "street-straight": { footprint: [4, 4], terrainMask: ["land"], glb: "vendor/kits/kenney-city-kit-roads/road-straight.glb" },
  "mega-tower-a": { footprint: [8, 8], terrainMask: ["land"], glb: "vendor/kits/kenney-city-kit-commercial/building-skyscraper-b.glb" },
  "no-mesh-a": { footprint: [1, 1], terrainMask: ["land"], glb: null }, // most of the 50, per BO7A
  "unknown-layer-a": { footprint: [1, 1], terrainMask: ["land"], glb: "vendor/kits/some-other-kit/thing.glb" },
};

test("glbBasename strips the directory, keeps just the filename", () => {
  assert.equal(glbBasename("vendor/kits/kenney-modular-buildings/building-sample-house-b.glb"), "building-sample-house-b.glb");
  assert.equal(glbBasename("no-directory.glb"), "no-directory.glb");
});

test("layerForGlb finds the real layer via the manifest's own usedBy list", () => {
  assert.equal(layerForGlb("vendor/kits/kenney-modular-buildings/building-sample-house-b.glb", MANIFEST), 0);
  assert.equal(layerForGlb("vendor/kits/kenney-city-kit-roads/road-straight.glb", MANIFEST), 1);
  assert.equal(layerForGlb("vendor/kits/kenney-city-kit-commercial/building-skyscraper-b.glb", MANIFEST), 2);
});

test("layerForGlb returns null, not a guess, for a file the manifest does not name", () => {
  assert.equal(layerForGlb("vendor/kits/unknown/thing.glb", MANIFEST), null);
});

test("footprintForRotation: 0 and 180 keep the footprint as-is", () => {
  assert.deepEqual(footprintForRotation([2, 3], 0), [2, 3]);
  assert.deepEqual(footprintForRotation([2, 3], 180), [2, 3]);
});

test("footprintForRotation: 90 and 270 swap w/d -- the SAME rule occupiedRect uses, so the render and the board's own occupancy agree", () => {
  assert.deepEqual(footprintForRotation([2, 3], 90), [3, 2]);
  assert.deepEqual(footprintForRotation([2, 3], 270), [3, 2]);
});

test("anchorForCell converts board cells to render metres via MODULE_SIZE_M, x/y -> x/z", () => {
  assert.deepEqual(anchorForCell({ x: 3, y: 5 }), [3 * MODULE_SIZE_M, 5 * MODULE_SIZE_M]);
});

test("resolveBoardPieces: a real placed piece resolves to a real glb, layer, footprint (metres) and anchor (metres)", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const placed = board.place("house-a", { x: 2, y: 2 }, 0);
  assert.ok(placed.ok, JSON.stringify(placed));

  const { resolved, skipped } = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(skipped.length, 0);
  assert.equal(resolved.length, 1);
  assert.deepEqual(resolved[0], {
    id: placed.id,
    typeId: "house-a",
    glb: CATALOGUE["house-a"].glb,
    layer: 0,
    footprint: [2 * MODULE_SIZE_M, 3 * MODULE_SIZE_M],
    anchor: [2 * MODULE_SIZE_M, 2 * MODULE_SIZE_M],
    rotation: 0,
  });
});

test("GATE (RB1): resolveBoardPieces reflects a remove() -- a removed piece's id is NOT in the resolved list, the render and the board agree", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const a = board.place("house-a", { x: 2, y: 2 }, 0);
  const b = board.place("tower-base-6x6-a", { x: 8, y: 2 }, 0);
  assert.ok(a.ok && b.ok);

  const before = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(before.resolved.length, 2);

  const removed = board.remove(a.id);
  assert.ok(removed.ok);

  const after = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(after.resolved.length, 1);
  assert.equal(after.resolved[0].id, b.id);
  assert.ok(!after.resolved.some((p) => p.id === a.id), "the removed piece must not still resolve");
});

test("resolveBoardPieces: a rotated piece's own footprint is the SWAPPED one, matching what the board's own occupancy actually holds", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const placed = board.place("house-a", { x: 2, y: 2 }, 90);
  assert.ok(placed.ok, JSON.stringify(placed));
  const { resolved } = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.deepEqual(resolved[0].footprint, [3 * MODULE_SIZE_M, 2 * MODULE_SIZE_M]); // [2,3] swapped at 90
  assert.equal(resolved[0].rotation, 90);
});

test("a piece with no matching mesh (glb: null, most of the 50 per BO7A) is SKIPPED, not silently dropped or substituted", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const placed = board.place("no-mesh-a", { x: 0, y: 0 }, 0);
  assert.ok(placed.ok, JSON.stringify(placed));
  const { resolved, skipped } = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(resolved.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, "no-glb");
  assert.equal(skipped[0].id, placed.id);
});

test("a piece whose glb the manifest does not name is SKIPPED with reason unknown-layer, not silently dropped", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const placed = board.place("unknown-layer-a", { x: 0, y: 0 }, 0);
  assert.ok(placed.ok, JSON.stringify(placed));
  const { resolved, skipped } = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(resolved.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, "unknown-layer");
});

test("multiple real pieces, mixed resolvable and not, resolve independently -- one skip does not drop the others", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  board.place("house-a", { x: 0, y: 0 }, 0);
  board.place("no-mesh-a", { x: 5, y: 0 }, 0);
  board.place("mega-tower-a", { x: 10, y: 0 }, 0);
  const { resolved, skipped } = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(resolved.length, 2);
  assert.equal(skipped.length, 1);
  assert.deepEqual(resolved.map((p) => p.typeId).sort(), ["house-a", "mega-tower-a"]);
});

test("(synthetic) the vulnerability: resolveBoardPieces must call board.pieces(), not a hardcoded list -- an empty board resolves to nothing", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const { resolved, skipped } = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  assert.equal(resolved.length, 0);
  assert.equal(skipped.length, 0);
});

// ------------------------------------------------------------------ resolveGhost
test("resolveGhost: null in, null out -- no ghost is being previewed", () => {
  assert.equal(resolveGhost(null, CATALOGUE), null);
});

test("GATE (RB2): a VALID ghost (an empty, in-bounds cell) resolves valid: true, sized to its own real footprint", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });
  const ghost = session.setGhost("house-a", { x: 2, y: 6 }, 0);
  assert.equal(ghost.valid, true, JSON.stringify(ghost));
  const resolved = resolveGhost(ghost, CATALOGUE);
  assert.deepEqual(resolved, {
    valid: true,
    reason: null,
    footprint: [2 * MODULE_SIZE_M, 3 * MODULE_SIZE_M],
    anchor: [2 * MODULE_SIZE_M, 6 * MODULE_SIZE_M],
  });
});

test("GATE (RB2): an INVALID ghost (over an already-occupied cell) resolves valid: false, with the REAL refusal reason -- visibly distinct from a valid one is only meaningful if this flag is actually correct", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const placed = board.place("house-a", { x: 2, y: 2 }, 0);
  assert.ok(placed.ok);
  const session = createPlacementSession({ board });
  const ghost = session.setGhost("tower-base-6x6-a", { x: 2, y: 2 }, 0); // same cell, already occupied
  assert.equal(ghost.valid, false, JSON.stringify(ghost));
  assert.equal(ghost.reason, "occupied");
  const resolved = resolveGhost(ghost, CATALOGUE);
  assert.equal(resolved!.valid, false);
  assert.equal(resolved!.reason, "occupied");
});

test("GATE (RB2): committing an invalid ghost changes NOTHING -- the board's own resolved pieces are byte-identical before and after, and commit() itself reports 'inert'", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const placed = board.place("house-a", { x: 2, y: 2 }, 0);
  assert.ok(placed.ok);
  const session = createPlacementSession({ board });
  session.setGhost("tower-base-6x6-a", { x: 2, y: 2 }, 0); // occupied -- invalid

  const before = resolveBoardPieces(board, CATALOGUE, MANIFEST);
  const commitResult = session.commit();
  const after = resolveBoardPieces(board, CATALOGUE, MANIFEST);

  assert.equal(commitResult.ok, false);
  assert.equal(commitResult.reason, "inert");
  assert.deepEqual(after, before, "committing an invalid ghost must not change the board's own resolved pieces at all");
});

test("resolveGhost: an unknown typeId resolves to null, not a guessed footprint -- there is nothing real to size an overlay from", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });
  const ghost = session.setGhost("does-not-exist", { x: 0, y: 0 }, 0);
  assert.equal(ghost.valid, false);
  assert.equal(resolveGhost(ghost, CATALOGUE), null);
});

// ----------------------------------------------------------------- resolveReadout
test("GATE (RB3): the REAL public/scoring.js, as of this run, does NOT export valueAt/valueIfPlaced -- resolveReadout must report unavailable against it, not silently compute something else. This test itself is expected to start failing the moment CLI's S4 lands, which is the point: it is a live check against the real module, not a mock standing in for a claim.", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const result = resolveReadout(REAL_SCORING, board, CATALOGUE, { x: 0, y: 0 }, "house-a", 0);
  assert.equal(result.available, false, "S4 appears to have landed -- update board-renderer.js's own resolveReadout call and RB3's own render to use the real functions, this fallback path is no longer the honest state");
  assert.match(result.reason, /S4 not landed/);
});

test("resolveReadout: reports unavailable, by name, when valueAt/valueIfPlaced are missing -- never silently computes a substitute", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const mockScoring = {}; // no valueAt, no valueIfPlaced -- today's real state
  const result = resolveReadout(mockScoring, board, CATALOGUE, { x: 0, y: 0 }, "house-a", 0);
  assert.deepEqual(result, { available: false, reason: "S4 not landed: valueAt/valueIfPlaced are not yet exported from public/scoring.js" });
});

test("resolveReadout: once available, calls valueAt/valueIfPlaced with the guessed (board, catalogue, x, y[, typeId, rotation]) signature and returns both real numbers", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const calls: any[] = [];
  const mockScoring = {
    valueAt: (b: any, c: any, x: number, y: number) => { calls.push(["valueAt", b === board, c === CATALOGUE, x, y]); return 7; },
    valueIfPlaced: (b: any, c: any, typeId: string, x: number, y: number, rotation: number) => { calls.push(["valueIfPlaced", b === board, c === CATALOGUE, typeId, x, y, rotation]); return 12; },
  };
  const result = resolveReadout(mockScoring, board, CATALOGUE, { x: 3, y: 5 }, "house-a", 90);
  assert.deepEqual(result, { available: true, current: 7, ifPlaced: 12 });
  assert.deepEqual(calls, [
    ["valueAt", true, true, 3, 5],
    ["valueIfPlaced", true, true, "house-a", 3, 5, 90],
  ]);
});

test("resolveReadout: a call that THROWS against the guessed signature (e.g. S4 lands with a different arg order) is reported as unavailable with the real error, never crashes the caller", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const mockScoring = {
    valueAt: () => { throw new TypeError("cannot read property 'x' of undefined"); },
    valueIfPlaced: () => 0,
  };
  const result = resolveReadout(mockScoring, board, CATALOGUE, { x: 0, y: 0 }, "house-a", 0);
  assert.equal(result.available, false);
  assert.match(result.reason, /S4 call failed/);
  assert.match(result.reason, /cannot read property 'x' of undefined/);
});

test("resolveReadout: two different cells against the SAME mock scoring module produce different numbers -- the mechanism itself is cursor-position-sensitive, independent of whether the real S4 has landed", () => {
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  const mockScoring = {
    valueAt: (b: any, c: any, x: number, y: number) => x + y * 10, // varies with position, deliberately
    valueIfPlaced: (b: any, c: any, typeId: string, x: number, y: number) => x + y * 10 + 1,
  };
  const near = resolveReadout(mockScoring, board, CATALOGUE, { x: 1, y: 1 }, "house-a", 0);
  const far = resolveReadout(mockScoring, board, CATALOGUE, { x: 8, y: 8 }, "house-a", 0);
  assert.notEqual(near.current, far.current, "GATE (RB3): a readout that does not move as the queried cell changes is exactly the red this item's own gate names");
});

// --------------------------------------------------------------- rotateGeometryY
test("rotateGeometryY: 0 degrees returns the geometry untouched (same object, no matrix applied)", () => {
  const geom = new THREE.BoxGeometry(2, 1, 4);
  const before = geom.getAttribute("position").array.slice();
  const after = rotateGeometryY(geom, 0, THREE);
  assert.equal(after, geom);
  assert.deepEqual(Array.from(geom.getAttribute("position").array), Array.from(before));
});

test("rotateGeometryY: 90 degrees swaps the geometry's own X/Z extent -- a 2x4 (x by z) box reads as 4x2 after rotating", () => {
  const geom = new THREE.BoxGeometry(2, 1, 4); // x=2, y=1, z=4
  rotateGeometryY(geom, 90, THREE);
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const x = bb.max.x - bb.min.x;
  const z = bb.max.z - bb.min.z;
  assert.ok(Math.abs(x - 4) < 1e-6, `expected x extent ~4 after a 90-degree rotation, got ${x}`);
  assert.ok(Math.abs(z - 2) < 1e-6, `expected z extent ~2 after a 90-degree rotation, got ${z}`);
});

test("rotateGeometryY: 180 degrees preserves extent (a square-ish swap back) but is a real transform, not a no-op", () => {
  const geom = new THREE.BoxGeometry(2, 1, 4);
  const before = geom.getAttribute("position").array.slice();
  rotateGeometryY(geom, 180, THREE);
  const after = geom.getAttribute("position").array;
  assert.notDeepEqual(Array.from(after), Array.from(before), "180 degrees must actually transform the geometry, not silently no-op");
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  assert.ok(Math.abs((bb.max.x - bb.min.x) - 2) < 1e-6);
  assert.ok(Math.abs((bb.max.z - bb.min.z) - 4) < 1e-6);
});
