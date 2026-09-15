// =============================================================================
// THE GRID IS ARITHMETIC, AND THE ARITHMETIC HAS TO BE EXACT
//
// Models are built to whole cells and placement snaps to them, so every error
// here becomes a gap or an overlap in the finished world -- and the errors are
// the quiet kind. Truncating instead of rounding biases everything half a step
// south-west. Flooring instead of ceiling makes a 9 m thing "fit" in an 8 m
// cell. Neither throws, neither looks wrong, and both are only visible as two
// things that should have touched and did not.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CELL, LEVEL, DIVISION, CELLS_ACROSS,
  step, cellOf, cellOrigin, cellCentre, cellRect, snap,
  cellsFor, levelsFor, heightOf, inWorld, createGrid,
} from "../public/grid.js";
import { TERRAIN } from "../public/terrain.js";

test("the grid is derived from the world, not typed alongside it", () => {
  assert.equal(CELLS_ACROSS, Math.round(TERRAIN.WORLD.SIZE / CELL));
  assert.ok(CELLS_ACROSS > 1000, `${CELLS_ACROSS} cells across a ${TERRAIN.WORLD.SIZE} m world looks wrong`);
});

test("every division is an exact binary fraction of the cell", () => {
  // Exactness is the point. A third of 8 is not representable, and a grid whose
  // steps do not land on the same numbers twice cannot be snapped to.
  for (const [name, n] of Object.entries(DIVISION)) {
    const s = step(name);
    assert.equal(s * n, CELL, `${name} does not divide the cell exactly`);
    // Binary fractions round-trip through float arithmetic without drift.
    assert.equal(s * 3 / 3, s, `${name} step ${s} does not survive arithmetic`);
  }
  assert.equal(step("full"), 8);
  assert.equal(step("sixteenth"), 0.5);
  assert.throws(() => step("third"), /unknown grid division/);
});

test("a cell address round-trips", () => {
  for (const [x, z] of [[0, 0], [7.9, 7.9], [8, 8], [-1, -1], [-8, -8], [1234.5, -987.25]]) {
    const { i, j } = cellOf(x, z);
    const o = cellOrigin(i, j);
    assert.ok(x >= o.x && x < o.x + CELL, `${x} is not inside the cell ${i} it was said to be in`);
    assert.ok(z >= o.z && z < o.z + CELL, `${z} is not inside the cell ${j} it was said to be in`);
  }
});

test("negative coordinates floor, they do not truncate toward zero", () => {
  // Math.trunc would put -1 and +1 in the same cell, and the world extends in
  // both directions from the origin. This is the classic off-by-one that shows
  // up only west and north of centre.
  assert.deepEqual(cellOf(-1, -1), { i: -1, j: -1 });
  assert.deepEqual(cellOf(1, 1), { i: 0, j: 0 });
  assert.notDeepEqual(cellOf(-1, -1), cellOf(1, 1));
  assert.deepEqual(cellOf(-8, -8), { i: -1, j: -1 });
  assert.deepEqual(cellOf(-8.1, -8.1), { i: -2, j: -2 });
});

test("a cell's centre is its centre, and a run of cells covers exactly its cells", () => {
  const c = cellCentre(3, 5);
  assert.deepEqual(c, { x: 3 * CELL + CELL / 2, z: 5 * CELL + CELL / 2 });
  const r = cellRect(3, 5, 2, 4);
  assert.equal(r.xMax - r.xMin, 2 * CELL);
  assert.equal(r.zMax - r.zMin, 4 * CELL);
  assert.equal(r.xMin, cellOrigin(3, 5).x);
});

test("snapping rounds to the nearest step rather than truncating", () => {
  // Truncating biases every placement in the world half a step south and west.
  // On 26 km that is a systematic drift nobody notices until two things that
  // were built to touch do not.
  assert.deepEqual(snap(5, 5, "full"), { x: 8, z: 8 }, "5 is nearer 8 than 0");
  assert.deepEqual(snap(3, 3, "full"), { x: 0, z: 0 }, "3 is nearer 0 than 8");
  assert.deepEqual(snap(-5, -5, "full"), { x: -8, z: -8 }, "and it must round the same way below zero");
  assert.deepEqual(snap(1.1, 1.1, "sixteenth"), { x: 1, z: 1 });
  // Snapping something already on the grid must not move it.
  assert.deepEqual(snap(16, -24, "full"), { x: 16, z: -24 });
});

test("sizing rounds UP, because a 9 m thing does not fit in an 8 m cell", () => {
  // Flooring here is the airport apron bug in one function: a thing declared to
  // fit the ground that was checked, and then overhanging it.
  assert.equal(cellsFor(1), 1);
  assert.equal(cellsFor(8), 1, "exactly one cell is one cell, not two");
  assert.equal(cellsFor(8.1), 2);
  assert.equal(cellsFor(9), 2);
  assert.equal(cellsFor(16), 2);
  assert.equal(cellsFor(0.1), 1, "nothing occupies less than one cell of grid");

  assert.equal(levelsFor(4), 1, "exactly one storey is one storey");
  assert.equal(levelsFor(4.1), 2);
  assert.equal(levelsFor(35), 9);
  assert.equal(heightOf(levelsFor(35)), 36, "nine storeys of 4 m is 36 m");
  assert.equal(heightOf(10), 10 * LEVEL);
});

test("the world is finite, and off the map is not the same as empty", () => {
  const edge = Math.round(TERRAIN.WORLD.SIZE / 2 / CELL);
  assert.equal(inWorld(0, 0), true);
  assert.equal(inWorld(edge + 10, 0), false);
  assert.equal(inWorld(0, -edge - 10), false);
});

// ---------------------------------------------------------------------------
// REGIONS
// ---------------------------------------------------------------------------

test("by default the whole world is open", () => {
  const g = createGrid();
  assert.equal(g.check(0, 0).ok, true);
  assert.equal(g.check(10000, -10000).ok, true);
  assert.equal(g.regions().length, 1);
});

test("off the map is refused, and says so rather than reporting empty ground", () => {
  const g = createGrid();
  const far = TERRAIN.WORLD.SIZE;
  const r = g.check(far, far);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "off-map");
});

test("a locked region has coordinates and refuses with a reason", () => {
  // Locked is not absent. Unopened land that did not exist would make the map
  // end at the edge of the town, and opening more later would move everything
  // already placed.
  const g = createGrid({ openRegions: [] });
  assert.equal(g.check(0, 0).ok, false, "with nothing opened, nothing is placeable");
  assert.equal(g.check(0, 0).reason, "locked");

  g.openRegion({ xMin: -500, xMax: 500, zMin: -500, zMax: 500, name: "starting town" });
  const inside = g.check(0, 0);
  assert.equal(inside.ok, true);
  assert.equal(inside.region!.name, "starting town");

  const outside = g.check(2000, 0);
  assert.equal(outside.ok, false);
  assert.equal(outside.reason, "locked", "beyond the opened region is locked, not off-map");
});

test("an empty open list and no list at all mean different things", () => {
  // Easy to produce by accident, and the two are opposites: one is "everywhere
  // is open", the other is "nowhere is". Collapsing them would silently unlock
  // the world.
  assert.equal(createGrid().check(0, 0).ok, true);
  assert.equal(createGrid({ openRegions: [] }).check(0, 0).ok, false);
  assert.throws(() => createGrid().openRegion({ xMin: 0, xMax: 1, zMin: 0, zMax: 1 }), /already open/);
});

test("an inverted region is refused rather than quietly never matching", () => {
  const g = createGrid({ openRegions: [] });
  assert.throws(() => g.openRegion({ xMin: 100, xMax: 0, zMin: 0, zMax: 100 }), /inverted or empty/);
  assert.throws(() => g.openRegion({ xMin: 0, xMax: 0, zMin: 0, zMax: 100 }), /inverted or empty/);
});

test("the region list handed out cannot be used to edit the world", () => {
  const g = createGrid({ openRegions: [] });
  g.openRegion({ xMin: -10, xMax: 10, zMin: -10, zMax: 10, name: "a" });
  const copy = g.regions();
  copy[0].xMax = 99999;
  assert.equal(g.check(5000, 0).ok, false, "editing the returned list must not open the world");
});
