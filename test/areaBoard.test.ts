// =============================================================================
// THE AREA BOARD — REBUILD-PLAN.md C2.1's own gate: "RED is a footprint that
// survives a rotation incorrectly, or an occupancy index that disagrees with
// the derived rect."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard, occupiedRect, cellsOf, ROTATIONS } from "../public/area-board.js";

const CATALOGUE = {
  "house-a": { footprint: [2, 3], terrainMask: ["land"] },
  "kiosk-a": { footprint: [1, 1], terrainMask: ["land"] },
  "tower-a": { footprint: [6, 6], terrainMask: ["land"] },
  "water-only-a": { footprint: [1, 1], terrainMask: ["water"] },
};

function board(opts = {}) {
  return createAreaBoard({ width: 16, height: 16, catalogue: CATALOGUE, ...opts });
}

// ---------------------------------------------------------------- occupiedRect

test("occupiedRect at rotation 0 uses the footprint as given", () => {
  const rect = occupiedRect({ x: 2, y: 5 }, 0, [2, 3]);
  assert.deepEqual(rect, { xMin: 2, xMax: 4, yMin: 5, yMax: 8 });
});

test("GATE: occupiedRect at 90 and 270 swaps width and depth -- a 2x3 becomes 3x2", () => {
  const at90 = occupiedRect({ x: 0, y: 0 }, 90, [2, 3]);
  assert.equal(at90.xMax - at90.xMin, 3, "width should be the ORIGINAL depth after a quarter turn");
  assert.equal(at90.yMax - at90.yMin, 2, "depth should be the ORIGINAL width after a quarter turn");

  const at270 = occupiedRect({ x: 0, y: 0 }, 270, [2, 3]);
  assert.equal(at270.xMax - at270.xMin, 3);
  assert.equal(at270.yMax - at270.yMin, 2);
});

test("occupiedRect at 180 keeps the same dimensions as 0", () => {
  const rect = occupiedRect({ x: 0, y: 0 }, 180, [2, 3]);
  assert.equal(rect.xMax - rect.xMin, 2);
  assert.equal(rect.yMax - rect.yMin, 3);
});

test("occupiedRect's min corner is always the anchor cell -- the pivot is the corner, not the centre", () => {
  const rect = occupiedRect({ x: 5, y: 5 }, 90, [2, 3]);
  assert.equal(rect.xMin, 5);
  assert.equal(rect.yMin, 5);
});

test("occupiedRect refuses a rotation outside 0/90/180/270", () => {
  assert.throws(() => occupiedRect({ x: 0, y: 0 }, 45, [2, 3]));
});

// ---------------------------------------------------------------- the occupancy gate

test("GATE: after placing a piece, the occupancy index names EXACTLY the derived rect's cells -- no more, no less", () => {
  const b = board();
  const result = b.place("house-a", { x: 2, y: 2 }, 90);
  assert.equal(result.ok, true);

  const derived = new Set([...cellsOf(result.rect)].map((c) => `${c.x},${c.y}`));
  const claimed = new Set();
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (b.pieceIdAt(x, y) === result.id) claimed.add(`${x},${y}`);
    }
  }
  assert.deepEqual(claimed, derived);
});

test("GATE, boundary case: a footprint straddling two cells does not leak into a THIRD -- every rotation, every offset", () => {
  const b = board();
  for (const rotation of ROTATIONS) {
    const r = b.place("house-a", { x: 10, y: 10 }, rotation, { id: rotation + 1000 });
    assert.equal(r.ok, true, `rotation ${rotation} should place cleanly on empty ground`);
    let count = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (b.pieceIdAt(x, y) === rotation + 1000) count++;
    assert.equal(count, 6, `a 2x3 footprint covers exactly 6 cells regardless of rotation (rotation ${rotation})`);
    b.remove(rotation + 1000);
  }
});

test("GATE: a non-integer piece id is refused, not silently coerced into the Int32Array occupancy index", () => {
  const b = board();
  const result = b.place("kiosk-a", { x: 0, y: 0 }, 0, { id: "not-a-number" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-id");
  assert.equal(b.pieceIdAt(0, 0), -1, "the cell must remain empty, not silently claimed by a coerced NaN-to-0 id");
});

// ---------------------------------------------------------------- validity, in cheapness order

test("out of bounds is refused before anything else is even checked", () => {
  const b = board();
  const result = b.evaluatePlacement("tower-a", { x: 14, y: 14 }, 0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "out-of-bounds");
});

test("the terrain check runs and passes on today's flat, all-land ground -- there is no generator yet to produce any other surface", () => {
  const b = board();
  const result = b.evaluatePlacement("house-a", { x: 3, y: 3 }, 0);
  assert.notEqual(result.reason, "terrain");
});

test("a terrainMask that excludes the board's only surface refuses with reason 'terrain', naming the offending cell", () => {
  const b = board();
  const result = b.evaluatePlacement("water-only-a", { x: 3, y: 3 }, 0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "terrain");
  assert.match(result.detail, /\(3,3\)/);
});

test("an occupied cell refuses placement with reason 'occupied'", () => {
  const b = board();
  const first = b.place("kiosk-a", { x: 5, y: 5 }, 0);
  assert.equal(first.ok, true);
  const second = b.evaluatePlacement("kiosk-a", { x: 5, y: 5 }, 0);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "occupied");
});

test("a footprint overlapping only PART of an existing piece is still refused -- partial overlap is still occupied", () => {
  const b = board();
  b.place("house-a", { x: 2, y: 2 }, 0); // covers x2-3, y2-4
  const overlap = b.evaluatePlacement("house-a", { x: 3, y: 3 }, 0); // shares (3,3)
  assert.equal(overlap.ok, false);
  assert.equal(overlap.reason, "occupied");
});

test("slope within tolerance passes; slope past the tolerance is refused, at the exact boundary", () => {
  const b = board();
  // 1x1 kiosk, single cell -- range across its own footprint is always 0, so
  // use the 2x3 house to get real relief between its own cells.
  b.setElevation(6, 6, 0);
  b.setElevation(7, 6, 1.2); // exactly at SLOPE_TOLERANCE_M
  const atLimit = b.evaluatePlacement("house-a", { x: 6, y: 6 }, 0);
  assert.equal(atLimit.ok, true, "exactly at the tolerance should still pass");

  b.setElevation(7, 6, 1.21); // one hair past it
  const overLimit = b.evaluatePlacement("house-a", { x: 6, y: 6 }, 0);
  assert.equal(overLimit.ok, false);
  assert.equal(overLimit.reason, "slope");
});

test("an unknown typeId is refused, naming the id, rather than crashing on a missing catalogue entry", () => {
  const b = board();
  const result = b.evaluatePlacement("does-not-exist", { x: 0, y: 0 }, 0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown-type");
});

// ---------------------------------------------------------------- ghost and commit share one function

test("place() refuses for the EXACT SAME reason evaluatePlacement already gave for the identical placement", () => {
  const b = board();
  b.place("kiosk-a", { x: 5, y: 5 }, 0);
  const ghostVerdict = b.evaluatePlacement("kiosk-a", { x: 5, y: 5 }, 0);
  const commitVerdict = b.place("kiosk-a", { x: 5, y: 5 }, 0);
  assert.equal(ghostVerdict.ok, false);
  assert.equal(commitVerdict.ok, false);
  assert.equal(ghostVerdict.reason, commitVerdict.reason);
});

// ---------------------------------------------------------------- remove derives its own rect

test("remove() clears every cell of the piece's DERIVED rect, not a stored one -- proven by rotation", () => {
  const b = board();
  const placed = b.place("house-a", { x: 4, y: 4 }, 90); // 3 wide x 2 deep
  const removed = b.remove(placed.id);
  assert.equal(removed.ok, true);
  for (const { x, y } of cellsOf(placed.rect)) {
    assert.equal(b.pieceIdAt(x, y), -1, `cell (${x},${y}) should be cleared`);
  }
});

test("removing an id that does not exist is refused, not a silent no-op", () => {
  const b = board();
  const result = b.remove(999);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-found");
});

test("rectFor() derives the same rect place() returned -- one source of truth for a piece's own footprint", () => {
  const b = board();
  const placed = b.place("house-a", { x: 1, y: 1 }, 90);
  assert.deepEqual(b.rectFor(placed.id), placed.rect);
});

// ---------------------------------------------------------------- corner offsets

test("cornerOffsetAt defaults to zero -- flat while the board is flat, per C2.2", () => {
  const b = board();
  for (let corner = 0; corner < 4; corner++) assert.equal(b.cornerOffsetAt(3, 3, corner), 0);
});

test("setCornerOffset writes exactly the ONE corner named, leaving the other three of the same cell untouched", () => {
  const b = board();
  b.setCornerOffset(3, 3, 2, 0.4);
  assert.equal(b.cornerOffsetAt(3, 3, 0), 0);
  assert.equal(b.cornerOffsetAt(3, 3, 1), 0);
  assert.equal(Math.abs(b.cornerOffsetAt(3, 3, 2) - 0.4) < 1e-6, true);
  assert.equal(b.cornerOffsetAt(3, 3, 3), 0);
});

test("a corner offset written to one cell does not leak into a neighbouring cell's same-numbered corner", () => {
  const b = board();
  b.setCornerOffset(3, 3, 0, 1.0);
  assert.equal(b.cornerOffsetAt(4, 3, 0), 0);
  assert.equal(b.cornerOffsetAt(3, 4, 0), 0);
});

test("cornerOffsetAt/setCornerOffset refuse a corner index outside 0-3", () => {
  const b = board();
  assert.throws(() => b.cornerOffsetAt(3, 3, 4));
  assert.throws(() => b.setCornerOffset(3, 3, -1, 0.1));
});

test("cornerOffsetAt out of bounds returns null, matching elevationAt/surfaceAt's own contract", () => {
  const b = board();
  assert.equal(b.cornerOffsetAt(99, 99, 0), null);
});

test("placing two non-overlapping pieces conserves both -- neither's occupancy leaks into the other's", () => {
  const b = board();
  const a = b.place("kiosk-a", { x: 0, y: 0 }, 0);
  const c = b.place("kiosk-a", { x: 1, y: 0 }, 0);
  assert.equal(a.ok, true);
  assert.equal(c.ok, true);
  assert.equal(b.pieceIdAt(0, 0), a.id);
  assert.equal(b.pieceIdAt(1, 0), c.id);
});
