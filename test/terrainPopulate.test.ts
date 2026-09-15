// TER-4 (PLAN.md §4) -- real elevation, water and slope on the area board,
// replacing the zeroed defaults. Gate (CHECKLIST.md, verbatim): "placement's
// existing slope refusal fires on real generated terrain, not on a
// hand-built fixture."
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard, SURFACE } from "../public/area-board.js";
import { createTerrainField } from "../public/terrain-field.js";
import { populateTerrain, CELL_SIZE_M } from "../public/terrain-populate.js";

const CATALOGUE = {
  "house-a": { footprint: [1, 1], terrainMask: [SURFACE.LAND] },
  "big-house-a": { footprint: [4, 4], terrainMask: [SURFACE.LAND] },
  "boat-a": { footprint: [1, 1], terrainMask: [SURFACE.WATER] },
};

test("populateTerrain writes elevation/surfaceType from the real field, not a placeholder -- spot-checked against field.heightAt/isWater directly", () => {
  const field = createTerrainField({ seed: "populate-spot-check" });
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const originX = 500, originZ = -300;
  populateTerrain(board, field, { originX, originZ });

  for (const [x, y] of [[0, 0], [3, 7], [9, 9]]) {
    const centreX = originX + x * CELL_SIZE_M + CELL_SIZE_M / 2;
    const centreZ = originZ + y * CELL_SIZE_M + CELL_SIZE_M / 2;
    // elevation is stored as Float32Array by design (area-board.js's own
    // memory-at-scale choice) -- compare with a tolerance that accounts for
    // float64 -> float32 rounding, not bit-for-bit equality.
    assert.ok(Math.abs(board.elevationAt(x, y) - field.heightAt(centreX, centreZ)) < 1e-2, `elevationAt(${x},${y}) does not match the real field`);
    const expectedSurface = field.isWater(centreX, centreZ) ? SURFACE.WATER : SURFACE.LAND;
    assert.equal(board.surfaceAt(x, y), expectedSurface);
  }
});

test("populateTerrain is idempotent -- calling it twice with the same field and origin writes identical values both times", () => {
  const field = createTerrainField({ seed: "idempotent" });
  const board = createAreaBoard({ width: 8, height: 8, catalogue: CATALOGUE });
  populateTerrain(board, field, { originX: 100, originZ: 100 });
  const before = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) before.push(board.elevationAt(x, y));
  populateTerrain(board, field, { originX: 100, originZ: 100 });
  const after = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) after.push(board.elevationAt(x, y));
  assert.deepEqual(after, before);
});

test("corner offsets are relative to the cell's own elevation, not a second absolute height", () => {
  const field = createTerrainField({ seed: "corner-check" });
  const board = createAreaBoard({ width: 5, height: 5, catalogue: CATALOGUE });
  const originX = 0, originZ = 0;
  populateTerrain(board, field, { originX, originZ });
  const h = board.elevationAt(2, 2);
  const nwOffset = board.cornerOffsetAt(2, 2, 0);
  const nwWorldHeight = field.heightAt(2 * CELL_SIZE_M, 2 * CELL_SIZE_M);
  // Both h and nwOffset are Float32Array-backed (area-board.js's own choice)
  // -- compare with a tolerance for float64 -> float32 rounding on both.
  assert.ok(Math.abs((h + nwOffset) - nwWorldHeight) < 1e-2, "corner offset + cell elevation must reconstruct the real corner height");
});

test("GATE (TER-4): a catalogue entry whose terrainMask excludes water is refused on a real generated water cell -- found by searching the real field, not asserted against a hand-set fixture", () => {
  const field = createTerrainField({ seed: "water-refusal-search" });
  // Search real world space for a genuine water cell near a genuine land
  // cell, so the refusal is exercised against the real coastline the field
  // produces, not a cell manufactured to be water.
  let found = null;
  for (let ring = 0; ring < 4000 && !found; ring += CELL_SIZE_M * 4) {
    for (const [dx, dz] of [[ring, 0], [-ring, 0], [0, ring], [0, -ring], [ring, ring], [-ring, -ring]]) {
      if (field.isWater(dx, dz)) { found = { x: dx, z: dz }; break; }
    }
  }
  assert.ok(found, "sanity check: the real field must contain at least one water point within the searched radius");

  const board = createAreaBoard({ width: 4, height: 4, catalogue: CATALOGUE });
  const originX = found.x - CELL_SIZE_M * 2, originZ = found.z - CELL_SIZE_M * 2;
  populateTerrain(board, field, { originX, originZ });

  // Find the actual board cell that landed on water (population may not
  // put the search point exactly on a cell centre).
  let waterCell = null;
  for (let y = 0; y < 4 && !waterCell; y++) {
    for (let x = 0; x < 4; x++) {
      if (board.surfaceAt(x, y) === SURFACE.WATER) { waterCell = { x, y }; break; }
    }
  }
  assert.ok(waterCell, "sanity check: the populated board must actually contain the water cell the search found");

  const verdict = board.evaluatePlacement("house-a", waterCell, 0);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, "terrain");

  const boatVerdict = board.evaluatePlacement("boat-a", waterCell, 0);
  assert.equal(boatVerdict.ok, true, "a water-only piece must still be placeable on the same real water cell");
});

test("GATE (TER-4): placement's existing slope refusal fires on real generated terrain -- found by searching the real field for a footprint with too much relief, not a hand-built fixture", () => {
  const field = createTerrainField({ seed: "slope-refusal-search" });
  const board = createAreaBoard({ width: 200, height: 200, catalogue: CATALOGUE });
  // Centred on the world origin so the board spans the steepest part of the
  // generated dome (its own edge, where relief per metre is highest) --
  // a real search over a real board, not a synthetic elevation array.
  const originX = -400, originZ = -400;
  populateTerrain(board, field, { originX, originZ });

  let refusedBySlope = null;
  for (let y = 0; y < board.height - 4 && !refusedBySlope; y++) {
    for (let x = 0; x < board.width - 4; x++) {
      const verdict = board.evaluatePlacement("big-house-a", { x, y }, 0);
      if (!verdict.ok && verdict.reason === "slope") { refusedBySlope = { x, y, verdict }; break; }
    }
  }
  assert.ok(refusedBySlope, "no 4x4 footprint anywhere on a 200x200 board centred on the dome's own edge was refused for slope -- either the field is too flat here or the refusal path is not wired to real elevation");
});
