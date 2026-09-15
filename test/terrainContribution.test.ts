// TER-5 (PLAN.md §4) -- terrainContribution() stops being a stub. Gate
// (CHECKLIST.md, verbatim): "two cells with genuinely different terrain
// score differently, and the difference is attributable to terrain rather
// than to adjacency."
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard, SURFACE } from "../public/area-board.js";
import { createTerrainField } from "../public/terrain-field.js";
import { populateTerrain, CELL_SIZE_M } from "../public/terrain-populate.js";
import { terrainContribution, value } from "../public/scoring.js";

const CATALOGUE = {
  "house-a": { footprint: [1, 1], terrainMask: [SURFACE.LAND], adjacency: { residential: -2, commercial: 2 } },
};

test("terrainContribution on a water cell is 0 -- inert, not double-counting a land neighbour's own water bonus", () => {
  const field = createTerrainField({ seed: "water-zero" });
  const board = createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE });
  populateTerrain(board, field, { originX: -1600, originZ: -1600 });
  let waterCell = null;
  for (let y = 0; y < 20 && !waterCell; y++) for (let x = 0; x < 20; x++) if (board.surfaceAt(x, y) === SURFACE.WATER) { waterCell = { x, y }; break; }
  assert.ok(waterCell, "sanity check: this board must contain a real water cell");
  assert.equal(terrainContribution(board, waterCell.x, waterCell.y), 0);
});

test("GATE (TER-5): two cells with genuinely different real terrain score differently, attributable to terrain and not adjacency -- an empty board isolates the term", () => {
  const field = createTerrainField({ seed: "gate-ter5" });
  // A real coastline exists near (-200, -2600) for this seed (found by
  // scanning field.isWater directly) -- the board is centred there so it
  // genuinely contains both a real shoreline and real flat interior land,
  // not a region picked to make the assertion trivially pass.
  const board = createAreaBoard({ width: 100, height: 100, catalogue: CATALOGUE });
  const originX = -400, originZ = -2800;
  populateTerrain(board, field, { originX, originZ });
  // Nothing is placed -- pieceIdsWithinR is empty everywhere, so value()
  // reduces to exactly terrainContribution() and nothing else could be
  // producing a difference.

  // Erosion means almost nothing on a real generated board is EXACTLY
  // flat, so this looks for the real highest- and lowest-scoring land
  // cells rather than requiring an exact 0 -- the gate is that two
  // genuinely different cells score differently, not that one hits a
  // round number.
  let highest = null, lowest = null;
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (board.surfaceAt(x, y) === SURFACE.WATER) continue;
      const c = terrainContribution(board, x, y);
      if (!highest || c > highest.c) highest = { x, y, c };
      if (!lowest || c < lowest.c) lowest = { x, y, c };
    }
  }
  assert.ok(highest && lowest, "sanity check: the real board must contain land cells to compare");
  assert.notEqual(highest.c, lowest.c, "the highest- and lowest-scoring land cells on a real generated board scored identically -- terrain is not varying at all");

  const vHigh = value(board, CATALOGUE, highest.x, highest.y);
  const vLow = value(board, CATALOGUE, lowest.x, lowest.y);
  assert.notEqual(vHigh, vLow, "two genuinely different terrain cells scored identically through value()");
  // Attributable to terrain, not adjacency: with zero pieces placed on the
  // whole board, value() IS terrainContribution() exactly, at both cells.
  assert.equal(vHigh, terrainContribution(board, highest.x, highest.y));
  assert.equal(vLow, terrainContribution(board, lowest.x, lowest.y));
  assert.ok(vHigh > vLow);
});

test("slope penalty responds to real local relief -- a steep real cell scores lower than a flat real cell at the same water-adjacency state", () => {
  const field = createTerrainField({ seed: "slope-penalty" });
  const board = createAreaBoard({ width: 220, height: 220, catalogue: CATALOGUE });
  const originX = -440, originZ = -440; // centred on the dome's steep edge, same region TER-4's slope-refusal test used
  populateTerrain(board, field, { originX, originZ });

  let steepNoWater = null, flatNoWater = null;
  for (let y = 1; y < board.height - 1; y++) {
    for (let x = 1; x < board.width - 1; x++) {
      if (board.surfaceAt(x, y) === SURFACE.WATER) continue;
      let nearWater = false;
      for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
        if (board.surfaceAt(x + dx, y + dy) === SURFACE.WATER) { nearWater = true; break; }
      }
      if (nearWater) continue;
      const here = board.elevationAt(x, y);
      let maxRelief = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) maxRelief = Math.max(maxRelief, Math.abs(here - board.elevationAt(x + dx, y + dy)));
      if (!steepNoWater && maxRelief > 1) steepNoWater = { x, y, maxRelief };
      if (!flatNoWater && maxRelief < 0.05) flatNoWater = { x, y, maxRelief };
    }
  }
  assert.ok(steepNoWater, "sanity check: this board must contain a real, non-water-adjacent cell with real relief");
  assert.ok(flatNoWater, "sanity check: this board must contain a real, non-water-adjacent, genuinely flat cell");

  const steepScore = terrainContribution(board, steepNoWater.x, steepNoWater.y);
  const flatScore = terrainContribution(board, flatNoWater.x, flatNoWater.y);
  assert.ok(steepScore < flatScore, `steep cell (relief ${steepNoWater.maxRelief.toFixed(2)}m) scored ${steepScore}, flat cell scored ${flatScore} -- slope must penalise, not ignore, real relief`);
});

test("GATE (TER-5): water adjacency alone raises a score -- isolated from slope with two DIRECTLY-CONTROLLED, perfectly flat cells (real terrainContribution(), board state authored to remove every other variable)", () => {
  // TER-4's own real setSurfaceType/setElevation, called directly rather
  // than through populateTerrain -- the real board API, controlled
  // precisely so relief cannot confound the comparison the way it can on a
  // real generated board (see this test's own history in test/mutations.json's
  // "ter5-water-adjacency-must-contribute" entry: an earlier version of
  // this test searched a real board for the flattest near/far-from-water
  // cells it could find and still let a sub-metre relief difference between
  // them explain the result instead of the water bonus).
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) board.setElevation(x, y, 5); // perfectly flat everywhere
  board.setSurfaceType(5, 5, SURFACE.WATER); // the only water cell on the board

  const nearScore = terrainContribution(board, 4, 5); // one cell from the water
  const farScore = terrainContribution(board, 0, 0); // far corner, no water within range
  assert.ok(nearScore > farScore, `perfectly flat, water-adjacent cell must score higher than a perfectly flat, water-distant cell: near ${nearScore}, far ${farScore}`);
});
