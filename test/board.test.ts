// =============================================================================
// THE BOARD — occupancy, placement and reversibility over placed pieces
//
// BOARD-CONVERSION-PLAN.md P1.2-P1.4. P1.4 is, in Mark's own words, "the one
// gate in the whole plan I would not accept on a description": place then
// remove must leave the board byte-identical, because that property is what
// makes an editor possible later.
//
// GROUND, IN THESE TESTS: canPlace's "GROUND" condition (P1.3) checks a
// piece's standsOn against land-use.js's classifyAt() at k=0, which needs a
// real heightAt function -- a board with none can never authorise a ground
// placement (there is nothing to classify). Every test below that expects
// success supplies FLAT_LAND (h=10, zero slope: BUILDABLE). CLIFF is a
// SLOPE property, not an elevation one -- a constant height, however large,
// has zero slope and classifies as BUILDABLE; STEEP_SLOPE below is a real
// ramp, verified against land-use.js's own SLOPE.CLIFF threshold.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../public/board.js";
import { atomOf, atomOrigin } from "../public/grid.js";

const FLAT_LAND = () => 10; // h=10 (dry, > BEACH_ABOVE), zero slope -> USE.BUILDABLE
const OPEN_WATER = () => -5; // h<0 -> USE.WATER
const STEEP_SLOPE = (x) => x * 10; // slope ~10, far above SLOPE.CLIFF (0.62) -> USE.CLIFF

function piece(overrides = {}) {
  return {
    id: "p1", pieceType: "test-block", cell: { i: 10, j: 10, k: 0 }, rotation: 0,
    foot: { w: 2, d: 2 }, levels: 1, clear: { w: 0, d: 0 },
    standsOn: ["buildable"], surface: "plaza",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// P1.2 — occupancy index: place, query, remove, query again
// ---------------------------------------------------------------------------

test("P1.2: a placed piece is found by cell query and by id, and vanishes from both after removal", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  const p = piece();
  const placed = board.place(p);
  assert.equal(placed.ok, true, JSON.stringify(placed));

  assert.deepEqual(board.whereIs("p1"), p);

  const hits = board.inCells(10, 10, 2, 2);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "p1");

  // A cell it does not occupy: empty.
  assert.deepEqual(board.inCells(100, 100, 1, 1), []);

  board.remove("p1");
  assert.equal(board.whereIs("p1"), null);
  assert.deepEqual(board.inCells(10, 10, 2, 2), []);
});

// ---------------------------------------------------------------------------
// P1.3 — canPlace: watch the refusal before trusting the acceptance
// ---------------------------------------------------------------------------

test("P1.3: an overlapping placement is refused -- watched before trusting acceptance", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  const first = board.place(piece({ id: "a", cell: { i: 20, j: 20, k: 0 }, foot: { w: 4, d: 4 } }));
  assert.equal(first.ok, true, "the first, non-overlapping placement must itself succeed for this test to mean anything");

  // Fully overlapping.
  const overlapFull = board.canPlace({ cell: { i: 20, j: 20, k: 0 }, rotation: 0, foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(overlapFull.ok, false);
  assert.equal(overlapFull.reason, "occupied");

  // Partially overlapping by one cell.
  const overlapEdge = board.canPlace({ cell: { i: 23, j: 20, k: 0 }, rotation: 0, foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(overlapEdge.ok, false);

  const stillOnlyOne = board.list();
  assert.equal(stillOnlyOne.length, 1, "a refused canPlace() must not have reserved anything");
});

test("P1.3: acceptance -- a non-overlapping placement, adjacent (touching an edge is not overlapping)", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  board.place(piece({ id: "a", cell: { i: 0, j: 0, k: 0 }, foot: { w: 4, d: 4 } }));
  const adjacent = board.canPlace({ cell: { i: 4, j: 0, k: 0 }, rotation: 0, foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(adjacent.ok, true, JSON.stringify(adjacent));
  const farAway = board.canPlace({ cell: { i: 500, j: 500, k: 0 }, rotation: 0, foot: { w: 2, d: 2 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(farAway.ok, true, JSON.stringify(farAway));
});

test("P1.3: a piece over open water, that cannot stand on water, is refused", () => {
  const board = createBoard({ heightAt: OPEN_WATER });
  const onWater = board.canPlace({ cell: { i: 0, j: 0, k: 0 }, rotation: 0, foot: { w: 2, d: 2 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(onWater.ok, false);
  assert.equal(onWater.reason, "ground");
  assert.equal(onWater.blockedBy.kind, "water");
});

test("P1.3: a piece that CAN stand on water (a bridge/pier) is accepted over open water", () => {
  const board = createBoard({ heightAt: OPEN_WATER });
  const pier = board.canPlace({ cell: { i: 0, j: 0, k: 0 }, rotation: 0, foot: { w: 2, d: 2 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["water"] });
  assert.equal(pier.ok, true, JSON.stringify(pier));
});

test("P1.3: a piece on a slope too steep to stand on is refused", () => {
  const board = createBoard({ heightAt: STEEP_SLOPE });
  const onCliff = board.canPlace({ cell: { i: 0, j: 0, k: 0 }, rotation: 0, foot: { w: 2, d: 2 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(onCliff.ok, false);
  assert.equal(onCliff.reason, "ground");
  assert.equal(onCliff.blockedBy.kind, "cliff");
});

test("P1.3: a piece off the edge of the world is refused", () => {
  const board = createBoard({ heightAt: FLAT_LAND, inWorld: (i, j) => i >= 0 && j >= 0 && i < 10 && j < 10 });
  const offEdge = board.canPlace({ cell: { i: 8, j: 8, k: 0 }, rotation: 0, foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(offEdge.ok, false);
  assert.equal(offEdge.reason, "off-map");
  const onEdge = board.canPlace({ cell: { i: 6, j: 6, k: 0 }, rotation: 0, foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(onEdge.ok, true, JSON.stringify(onEdge));
});

test("P1.3: clear adds required margin beyond the foot, split around it", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  // A neighbour placed 2 cells east of a 2x2 foot at (0,0) -- i.e. touching
  // the foot's own edge with zero gap.
  board.place(piece({ id: "neighbour", cell: { i: 2, j: 0, k: 0 }, foot: { w: 2, d: 2 } }));
  // Foot-only (clear 0) fits snugly against it.
  assert.equal(board.canPlace({ cell: { i: 0, j: 0, k: 0 }, rotation: 0, foot: { w: 2, d: 2 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] }).ok, true);
  // The same foot with 2 cells of clear needs room the neighbour is now sitting in.
  assert.equal(board.canPlace({ cell: { i: 0, j: 0, k: 0 }, rotation: 0, foot: { w: 2, d: 2 }, levels: 1, clear: { w: 2, d: 0 }, standsOn: ["buildable"] }).ok, false);
});

test("P1.3: PIECES STACK -- a rooftop piece stands on the surface of the piece below it, not on the terrain", () => {
  // Mark's park-bench example: a rooftop bench stands on the roof below it,
  // not on the ground under the building.
  const board = createBoard({ heightAt: FLAT_LAND });
  board.place(piece({ id: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 4, d: 4 }, levels: 2, surface: "roof" }));

  // A rooftop bench, standsOn ["roof"], placed at k=2 (the level right above
  // the 2-level building's own top) over the SAME footprint: accepted.
  const onRoof = board.canPlace({ cell: { i: 1, j: 1, k: 2 }, rotation: 0, foot: { w: 1, d: 1 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["roof"] });
  assert.equal(onRoof.ok, true, JSON.stringify(onRoof));

  // The same bench floating at k=5 -- nothing beneath it at that level -- is refused.
  const floating = board.canPlace({ cell: { i: 1, j: 1, k: 5 }, rotation: 0, foot: { w: 1, d: 1 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["roof"] });
  assert.equal(floating.ok, false);
  assert.equal(floating.reason, "ground");

  // A GROUND bench (standsOn ["buildable"], not "roof") at k=2 above the
  // building is refused -- it cannot stand on a roof, only the building
  // itself could declare that surface acceptable.
  const wrongKind = board.canPlace({ cell: { i: 1, j: 1, k: 2 }, rotation: 0, foot: { w: 1, d: 1 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"] });
  assert.equal(wrongKind.ok, false);
});

// ---------------------------------------------------------------------------
// P1.4 — place/remove/replace/move, each reversible
// ---------------------------------------------------------------------------

test("P1.4: place then remove leaves the board byte-identical to before", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  board.place(piece({ id: "keep", cell: { i: 50, j: 50, k: 0 } }));
  const before = JSON.stringify(board.list());

  board.place(piece({ id: "temp", cell: { i: 60, j: 60, k: 0 } }));
  board.remove("temp");
  const after = JSON.stringify(board.list());

  assert.equal(after, before);
});

test("P1.4: place then replace then remove leaves the board byte-identical to before", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  board.place(piece({ id: "keep", cell: { i: 50, j: 50, k: 0 } }));
  const before = JSON.stringify(board.list());

  const original = piece({ id: "swap", cell: { i: 70, j: 70, k: 0 }, foot: { w: 2, d: 2 } });
  board.place(original);
  const replaced = board.replace("swap", piece({ id: "swap", cell: { i: 70, j: 70, k: 0 }, foot: { w: 6, d: 6 } }));
  assert.equal(replaced.ok, true, JSON.stringify(replaced));
  board.remove("swap");

  const after = JSON.stringify(board.list());
  assert.equal(after, before);
});

test("P1.4: move relocates a piece, and a refused move leaves it exactly where it was", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  board.place(piece({ id: "mover", cell: { i: 0, j: 0, k: 0 }, foot: { w: 2, d: 2 } }));
  board.place(piece({ id: "blocker", cell: { i: 10, j: 10, k: 0 }, foot: { w: 2, d: 2 } }));

  const moved = board.move("mover", { cell: { i: 20, j: 20, k: 0 } });
  assert.equal(moved.ok, true, JSON.stringify(moved));
  assert.deepEqual(board.whereIs("mover").cell, { i: 20, j: 20, k: 0 });
  assert.deepEqual(board.inCells(0, 0, 2, 2), []);

  const before = JSON.stringify(board.list());
  const refused = board.move("mover", { cell: { i: 10, j: 10, k: 0 } }); // onto the blocker
  assert.equal(refused.ok, false);
  const after = JSON.stringify(board.list());
  assert.equal(after, before, "a refused move must not have changed anything");
});

test("P1.4: replace refuses (and does not apply) a shape that would not fit", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  board.place(piece({ id: "a", cell: { i: 0, j: 0, k: 0 }, foot: { w: 2, d: 2 } }));
  board.place(piece({ id: "b", cell: { i: 4, j: 0, k: 0 }, foot: { w: 2, d: 2 } }));
  const before = JSON.stringify(board.list());

  // Growing "a" to 6x6 would now overlap "b".
  const refused = board.replace("a", piece({ id: "a", cell: { i: 0, j: 0, k: 0 }, foot: { w: 6, d: 6 } }));
  assert.equal(refused.ok, false);

  const after = JSON.stringify(board.list());
  assert.equal(after, before, "a refused replace must not have changed anything, including the old piece");
});

// ---------------------------------------------------------------------------
// cell round-trip -- grid.js's own contract, exercised through the board.
// A piece's `cell` is an ATOM address (PLACEMENT-CONTRACT.md Part 0), so
// this round-trips through atomOf/atomOrigin, not the old cellOf/cellOrigin
// (still correct, at 8 m, for anything actually working in cells).
// ---------------------------------------------------------------------------

test("a placed piece's cell round-trips through atomOf/atomOrigin unchanged", () => {
  const board = createBoard({ heightAt: FLAT_LAND });
  const p = piece({ id: "rt", cell: { i: 123, j: -45, k: 0 } });
  board.place(p);
  const origin = atomOrigin(p.cell.i, p.cell.j);
  const back = atomOf(origin.x, origin.z);
  assert.deepEqual(back, { i: p.cell.i, j: p.cell.j });
});
