// =============================================================================
// THE VALUE FUNCTION — REBUILD-PLAN.md §S1. The checklist's own gate: "the
// same arrangement scores identically however it was reached: A then B, B
// then A, or loaded from a save. RED is any path dependence."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard, occupiedRect } from "../public/area-board.js";
import { value, pieceIdsWithinR, terrainContribution, falloff, dirtyCellsForRect, recomputeDirtySet, valueAt, valueIfPlaced, perUnitWorth, totalWorth, R } from "../public/scoring.js";
import { baseValueFor, unitQualityFor } from "../scripts/migrate-catalogue-s2-fields.mjs";

const CATALOGUE = {
  "house-a": { category: "residential", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: -2, commercial: 2 } },
  "shop-a": { category: "commercial", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: 5 } },
  "factory-a": { category: "industrial", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: -5 } },
  "civic-a": { category: "civic", footprint: [1, 1], terrainMask: ["land"], adjacency: {} }, // non-amenity, e.g. a substation
};

function board(opts = {}) {
  return createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE, ...opts });
}

// ---------------------------------------------------------------- the gate

test("GATE (S1): the same arrangement scores identically regardless of placement order -- A then B", () => {
  const b1 = board();
  b1.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b1.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  const orderAB = value(b1, CATALOGUE, 5, 5);

  const b2 = board();
  b2.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  b2.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  const orderBA = value(b2, CATALOGUE, 5, 5);

  assert.equal(orderAB, orderBA);
});

test("GATE (S1): a board reconstructed by remove-then-replace (as a save/load round trip would) scores the same as the original", () => {
  const original = board();
  original.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  original.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  const before = value(original, CATALOGUE, 5, 5);

  // Simulate a reload: a fresh board, pieces re-applied one at a time in a
  // DIFFERENT order and with DIFFERENT ids than the original session used.
  const reloaded = board();
  reloaded.place("shop-a", { x: 6, y: 5 }, 0, { id: 99 });
  reloaded.place("house-a", { x: 5, y: 5 }, 0, { id: 42 });
  const after = value(reloaded, CATALOGUE, 5, 5);

  assert.equal(before, after);
});

test("value() is called twice on the identical board and returns the identical number both times -- no internal state accumulates", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  assert.equal(value(b, CATALOGUE, 5, 5), value(b, CATALOGUE, 5, 5));
});

// Blind review finding: the two GATE tests above both query coordinate
// (5,5) against boards holding the SAME final arrangement, so a bug that
// caches by (x,y) ALONE -- ignoring which board object was actually passed
// -- returns a stale-but-numerically-identical number and neither GATE
// test can tell. Proven by hand: a module-level `Map` keyed on `${x},${y}`
// added to value() left both GATE tests green while five unrelated tests
// failed instead, for the wrong reason. This test queries the SAME
// coordinate against boards with GENUINELY DIFFERENT arrangements in
// immediate succession -- the one shape that exposes a coordinate-only
// cache, since a real per-board computation must differ and a
// coordinate-keyed cache cannot.
test("GATE (S1): the SAME coordinate scores DIFFERENTLY against boards with different arrangements, queried back to back -- rules out a cache keyed on (x,y) alone", () => {
  const factoryNearby = board();
  factoryNearby.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  factoryNearby.place("factory-a", { x: 6, y: 5 }, 0, { id: 2 });
  const withFactory = value(factoryNearby, CATALOGUE, 5, 5);

  const shopNearby = board();
  shopNearby.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  shopNearby.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  const withShop = value(shopNearby, CATALOGUE, 5, 5);

  assert.notEqual(withFactory, withShop, "a factory and a shop at the identical coordinate must score differently -- a (x,y)-only cache would wrongly return the same number for both");
});

// ---------------------------------------------------------------- the formula

test("a vacant cell far from everything is terrain-only", () => {
  const b = board();
  assert.equal(value(b, CATALOGUE, 10, 10), terrainContribution(b, 10, 10));
});

test("a residential cell with a commercial neighbour within R gains the shop's adjacency bonus, scaled by falloff at that distance", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 7, y: 5 }, 0, { id: 2 }); // Chebyshev distance 2, within R=3
  const withShop = value(b, CATALOGUE, 5, 5);

  const bAlone = board();
  bAlone.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  const withoutShop = value(bAlone, CATALOGUE, 5, 5);

  assert.equal(withShop - withoutShop, 5 * falloff(2), "the shop's own adjacency.residential value, scaled by falloff(2)");
});

test("a neighbour at exactly Chebyshev distance R contributes something real; one step further does not", () => {
  const atR = board();
  atR.place("house-a", { x: 10, y: 10 }, 0, { id: 1 });
  atR.place("shop-a", { x: 13, y: 10 }, 0, { id: 2 }); // distance exactly 3
  const valueAtR = value(atR, CATALOGUE, 10, 10);

  const pastR = board();
  pastR.place("house-a", { x: 10, y: 10 }, 0, { id: 1 });
  pastR.place("shop-a", { x: 14, y: 10 }, 0, { id: 2 }); // distance 4
  const valuePastR = value(pastR, CATALOGUE, 10, 10);

  assert.notEqual(valueAtR, valuePastR, "the boundary at R must actually matter");
  assert.equal(valuePastR, terrainContribution(pastR, 10, 10) + 0, "past R, the shop contributes nothing");
  assert.equal(valueAtR, terrainContribution(atR, 10, 10) + 5 * falloff(3), "at exactly R, the shop contributes a real, non-vanishing amount -- not silently zero");
  assert.ok(valueAtR - terrainContribution(atR, 10, 10) > 0.01, "sanity: the contribution at R must be clearly distinguishable from zero, not lost to floating-point noise");
});

test("GATE: a piece does not contribute to its OWN cell's value", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  // house-a's own adjacency.residential is -2 -- if self-contribution were
  // included, this cell's value would be terrain + (-2). It must not be.
  assert.equal(value(b, CATALOGUE, 5, 5), terrainContribution(b, 5, 5));
});

// Blind review finding: shop-a (+5) and factory-a (-5) net to zero, so the
// original version of this test (asserting v === terrain + 5 - 5, i.e.
// v === terrain) could not distinguish "summed correctly" from "every sign
// flipped" or "adjacency disabled entirely" -- proven by hand, both those
// mutations left the old assertion green. Two shops (same sign, non-zero
// net) plus an individual-contribution check closes both gaps.
test("multiple distinct neighbours within R all contribute, summed -- not a coincidental cancellation", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 }); // distance 1
  b.place("shop-a", { x: 4, y: 5 }, 0, { id: 3 }); // distance 1
  const v = value(b, CATALOGUE, 5, 5);
  assert.equal(v, terrainContribution(b, 5, 5) + 10 * falloff(1), "two +5 shops at distance 1 must sum to +10*falloff(1), not net to zero or flip sign");

  // And confirm each shop's OWN contribution individually, not just the
  // combined total -- rules out "disabled entirely" landing on the right
  // total by a different coincidence (e.g. a single constant).
  const oneShop = board();
  oneShop.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  oneShop.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  assert.equal(value(oneShop, CATALOGUE, 5, 5), terrainContribution(oneShop, 5, 5) + 5 * falloff(1));
});

test("a piece spanning multiple cells within R is counted exactly ONCE, not once per cell it occupies -- and its distance is to its NEAREST cell, approached from EITHER side", () => {
  const wideCatalogue = { ...CATALOGUE, "mall-a": { category: "commercial", footprint: [2, 1], terrainMask: ["land"], adjacency: { residential: 5 } } };

  // Querying from the LEFT/near side of the mall (mall occupies x=6,7).
  const left = createAreaBoard({ width: 20, height: 20, catalogue: wideCatalogue });
  left.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  left.place("mall-a", { x: 6, y: 5 }, 0, { id: 2 }); // nearest cell to (5,5) is (6,5), distance 1
  const vLeft = value(left, wideCatalogue, 5, 5);
  assert.equal(vLeft - terrainContribution(left, 5, 5), 5 * falloff(1), "approached from the left, the mall's nearest cell is 1 away");

  // Querying from the RIGHT/far side -- this is the direction rect.xMax's
  // EXCLUSIVE-upper-bound convention actually matters: an off-by-one here
  // (using xMax instead of xMax-1) is invisible from the left side (the
  // wrong term stays negative and loses the max() either way) and only
  // shows up querying from the right, which is exactly why this second
  // case exists rather than relying on the left-side case alone.
  const right = createAreaBoard({ width: 20, height: 20, catalogue: wideCatalogue });
  right.place("house-a", { x: 9, y: 5 }, 0, { id: 1 });
  right.place("mall-a", { x: 6, y: 5 }, 0, { id: 2 }); // occupies x=6,7 -- nearest cell to (9,5) is (7,5), distance 2
  const vRight = value(right, wideCatalogue, 9, 5);
  assert.equal(vRight - terrainContribution(right, 9, 5), 5 * falloff(2), "approached from the right, the mall's nearest cell (x=7, the LAST occupied column) is 2 away, not 1");
});

test("an entry with no adjacency key for the occupant's category contributes zero, not undefined-coerced-to-NaN", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("civic-a", { x: 6, y: 5 }, 0, { id: 2 }); // adjacency: {} -- no "residential" key
  const v = value(b, CATALOGUE, 5, 5);
  assert.equal(v, terrainContribution(b, 5, 5));
  assert.ok(Number.isFinite(v));
});

// ---------------------------------------------------------------- falloff -- §S2, T9

// Independently computed expected values (a literal Math.exp(...), not
// sourced from the module) -- the falloff-aware tests above prove value()
// WIRES to falloff() correctly, but since they compute their own
// expectation by calling the real falloff(), they cannot catch a bug
// INSIDE falloff() itself (wrong GAMMA, a sign error, a wrong formula
// shape moves both sides of those assertions identically and stays green).
// These pin the curve's own real numbers.
test("falloff(0) is exactly 1 -- full strength at zero distance", () => {
  assert.equal(falloff(0), 1);
});

test("falloff(R) is exactly EDGE_FRACTION (0.1) by construction -- GAMMA is derived so this holds exactly, not approximately", () => {
  assert.ok(Math.abs(falloff(R) - 0.1) < 1e-9, `falloff(R)=${falloff(R)}`);
});

test("falloff at an interior point matches an independently-computed exponential, not just the module's own internal consistency", () => {
  const GAMMA = -Math.log(0.1) / 3; // re-derived here, not imported
  const expected = Math.exp(-GAMMA * 2);
  assert.ok(Math.abs(falloff(2) - expected) < 1e-9);
});

test("falloff is monotonically decreasing across the whole R window", () => {
  for (let r = 0; r < R; r++) {
    assert.ok(falloff(r) > falloff(r + 1), `falloff(${r})=${falloff(r)} should exceed falloff(${r + 1})=${falloff(r + 1)}`);
  }
});

// The checklist's own named gate, verbatim: "a test that FAILS on a linear
// ramp and passes on the exponential."
test("GATE (S2): the curve's consecutive per-step drops SHRINK as distance increases -- true for exponential decay, false for every linear ramp", () => {
  // The real falloff() must show shrinking drops.
  const drop01 = falloff(0) - falloff(1);
  const drop12 = falloff(1) - falloff(2);
  const drop23 = falloff(2) - falloff(3);
  assert.ok(drop01 > drop12, `drop 0->1 (${drop01}) should exceed drop 1->2 (${drop12})`);
  assert.ok(drop12 > drop23, `drop 1->2 (${drop12}) should exceed drop 2->3 (${drop23})`);

  // A hand-written LINEAR ramp, same endpoints (1 at r=0, 0.1 at r=R), to
  // prove this assertion actually discriminates rather than being true of
  // any monotonic decreasing curve. A line's consecutive drops are all
  // equal by definition -- it must FAIL the strict inequality above.
  function linearRamp(distance) {
    return 1 - ((1 - 0.1) / R) * distance;
  }
  const linDrop01 = linearRamp(0) - linearRamp(1);
  const linDrop12 = linearRamp(1) - linearRamp(2);
  // Mathematically exact equality, but IEEE-754 float subtraction of
  // repeating-binary fractions (0.3, here) can differ in the last bit --
  // confirmed directly: linDrop01/linDrop12 differ by ~1.1e-16. An epsilon
  // is the honest comparison, not a hand-picked one to dodge a real gap.
  assert.ok(!(linDrop01 > linDrop12 + 1e-9), "a linear ramp's drops are equal, not shrinking -- this must NOT satisfy the same assertion the real curve does");
  assert.ok(Math.abs(linDrop01 - linDrop12) < 1e-9, "a straight line's per-step drops are equal (within float precision)");
});

// ---------------------------------------------------------------- pieceIdsWithinR

test("pieceIdsWithinR excludes the cell's own occupant and returns each distinct neighbour once", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  b.place("factory-a", { x: 4, y: 4 }, 0, { id: 3 });
  const ids = pieceIdsWithinR(b, 5, 5);
  assert.deepEqual([...ids].sort(), [2, 3]);
});

test("R is exactly 3, matching REBUILD-PLAN.md §S1", () => {
  assert.equal(R, 3);
});

// ---------------------------------------------------------------- dirtyCellsForRect / recomputeDirtySet -- §S3

// Independent oracle: brute-force, per-cell, scanning the WHOLE board --
// deliberately NOT the closed-form rectangle-expansion shortcut the real
// implementation uses, and NOT importing nearestChebyshevDistance from the
// module, so a shared off-by-one in both couldn't pass silently. Blind
// review named this explicitly: a test whose oracle reuses the same
// rectangle arithmetic as the implementation cannot catch a bug shared by
// both.
function bruteForceDirtyCells(board, rect, radius) {
  const cells = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const dx = Math.max(rect.xMin - x, 0, x - (rect.xMax - 1));
      const dy = Math.max(rect.yMin - y, 0, y - (rect.yMax - 1));
      if (Math.max(dx, dy) <= radius) cells.push(`${x},${y}`);
    }
  }
  return new Set(cells);
}

test("GATE (S3): dirtyCellsForRect matches an independent brute-force oracle exactly, in the open middle of the board", () => {
  const b = board();
  const rect = occupiedRect({ x: 8, y: 8 }, 0, [2, 3]); // a real 2x3 piece's derived rect
  const cells = dirtyCellsForRect(b, rect, R);
  const got = new Set(cells.map((c) => `${c.x},${c.y}`));
  const expected = bruteForceDirtyCells(b, rect, R);
  assert.equal(got.size, expected.size, `sizes differ: got ${got.size}, expected ${expected.size}`);
  assert.deepEqual(got, expected);
});

// Blind review's own finding, reproduced directly: the first version of
// dirtyCellsForRect used `rect.xMax - 1 + radius` (the INCLUSIVE rightmost
// dirty column) as an EXCLUSIVE upper bound, silently dropping the
// genuinely-dirty column at exactly distance R. A test checking only "the
// cell one step further is excluded" would NOT have caught this -- it
// needs the POSITIVE case too: a cell exactly AT distance R must be
// INCLUDED.
test("GATE (S3): a cell at EXACTLY Chebyshev distance R from the rect IS in the dirty set -- this is the exact bug blind review caught before any code was committed", () => {
  const b = board();
  const rect = occupiedRect({ x: 5, y: 5 }, 0, [2, 3]); // occupies x=5,6 / y=5,6,7
  const cells = dirtyCellsForRect(b, rect, R);
  const keys = new Set(cells.map((c) => `${c.x},${c.y}`));
  // Rightmost occupied column is 6 (xMax-1); at distance exactly R=3, x=9.
  assert.ok(keys.has("9,5"), "a cell at exactly distance R from the rect's own edge must be included");
});

test("a cell at distance R+1 from the rect is NOT in the dirty set", () => {
  const b = board();
  const rect = occupiedRect({ x: 5, y: 5 }, 0, [2, 3]);
  const cells = dirtyCellsForRect(b, rect, R);
  const keys = new Set(cells.map((c) => `${c.x},${c.y}`));
  assert.ok(!keys.has("10,5"), "one cell further than the true edge must be excluded");
});

test("dirtyCellsForRect clips to the board's LOW edge -- a piece anchored near (0,0) has a smaller dirty set than one in the open middle", () => {
  const b = board();
  const nearEdge = occupiedRect({ x: 0, y: 0 }, 0, [1, 1]);
  const middle = occupiedRect({ x: 10, y: 10 }, 0, [1, 1]);
  const edgeCells = dirtyCellsForRect(b, nearEdge, R);
  const middleCells = dirtyCellsForRect(b, middle, R);
  assert.ok(edgeCells.length < middleCells.length, `edge=${edgeCells.length} should be smaller than middle=${middleCells.length}`);
  assert.ok(edgeCells.every((c) => c.x >= 0 && c.y >= 0), "no dirty cell may have a negative coordinate");
});

test("dirtyCellsForRect clips to the board's HIGH edge -- a piece anchored near (width,height) is also smaller, exercising the OTHER clamp", () => {
  const b = board(); // 20x20
  const nearHighEdge = occupiedRect({ x: 19, y: 19 }, 0, [1, 1]);
  const middle = occupiedRect({ x: 10, y: 10 }, 0, [1, 1]);
  const edgeCells = dirtyCellsForRect(b, nearHighEdge, R);
  const middleCells = dirtyCellsForRect(b, middle, R);
  assert.ok(edgeCells.length < middleCells.length, `edge=${edgeCells.length} should be smaller than middle=${middleCells.length}`);
  assert.ok(edgeCells.every((c) => c.x < b.width && c.y < b.height), "no dirty cell may reach or exceed the board's own width/height");
});

test("GATE (S3, the checklist's own named gate): recomputeDirtySet's returned Map contains ONLY the dirty cells -- a far cell is not a key at all, even though its value would be correct if computed", () => {
  const b = board();
  b.place("house-a", { x: 10, y: 10 }, 0, { id: 1 });
  const rect = occupiedRect({ x: 10, y: 10 }, 0, [1, 1]);
  const results = recomputeDirtySet(b, CATALOGUE, rect, R);

  const expectedKeys = bruteForceDirtyCells(b, rect, R);
  assert.equal(results.size, expectedKeys.size);
  for (const key of expectedKeys) assert.ok(results.has(key), `missing expected dirty cell ${key}`);

  // A genuinely far cell: even though value() would return a perfectly
  // correct (unaffected, terrain-only) number for it if called, it must
  // simply not be a key in the result at all.
  assert.ok(!results.has("0,0"));
});

test("recomputeDirtySet's values match calling value() directly for the same cells -- composes value(), does not reimplement its math", () => {
  const b = board();
  b.place("house-a", { x: 10, y: 10 }, 0, { id: 1 });
  b.place("shop-a", { x: 11, y: 10 }, 0, { id: 2 });
  const rect = occupiedRect({ x: 10, y: 10 }, 0, [1, 1]);
  const results = recomputeDirtySet(b, CATALOGUE, rect, R);
  assert.equal(results.get("10,10"), value(b, CATALOGUE, 10, 10));
  assert.equal(results.get("12,10"), value(b, CATALOGUE, 12, 10));
});

// ---------------------------------------------------------------- valueAt, valueIfPlaced, the two worths -- §S4

// A dedicated fixture built from the REAL migration functions (baseValueFor/
// unitQualityFor), not hand-typed literals -- shapes match the real
// catalogue's small-house-a ([2,2], 2 tiers) and apartment-block-a
// ([4,4], 3 tiers), verified against the real data by blind review before
// this was written (perUnitWorth ratio ~1.22x house-favouring,
// totalWorth ratio ~4.9x condo-favouring -- a comfortable margin, not a
// knife-edge case).
function residentialEntry(footprint, massingLength) {
  const base = { category: "residential", footprint, massing: Array(massingLength).fill("tier"), terrainMask: ["land"], adjacency: { residential: -2, commercial: 2 } };
  return { ...base, baseValue: baseValueFor(base), unitQuality: unitQualityFor(base) };
}

const S4_CATALOGUE = {
  ...CATALOGUE,
  "house-s4": residentialEntry([2, 2], 2), // small-house-a's real shape
  "condo-s4": residentialEntry([4, 4], 3), // apartment-block-a's real shape
};

function s4Board() {
  return createAreaBoard({ width: 20, height: 20, catalogue: S4_CATALOGUE });
}

test("valueAt is exactly value() -- the spec's own vocabulary for the same readout", () => {
  const b = s4Board();
  b.place("house-s4", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  assert.equal(valueAt(b, S4_CATALOGUE, 5, 5), value(b, S4_CATALOGUE, 5, 5));
});

test("valueIfPlaced on a VACANT cell equals value() with the candidate's own category substituted", () => {
  const b = s4Board();
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 1 }); // an amenity nearby
  const viaValueIfPlaced = valueIfPlaced(b, S4_CATALOGUE, "house-s4", 5, 5, 0);
  const viaValueOverride = value(b, S4_CATALOGUE, 5, 5, "residential");
  assert.equal(viaValueIfPlaced, viaValueOverride);
});

test("GATE (S4): valueIfPlaced leaves the board byte-identical -- a snapshot before and after must match exactly", () => {
  const b = s4Board();
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 1 });
  b.place("house-s4", { x: 10, y: 10 }, 0, { id: 2 });
  const before = JSON.stringify(b.pieces());
  // Four cells, each a DIFFERENT reason a real board.place() of the
  // candidate could behave differently -- (5,5) is blocked by shop-a's own
  // footprint, (10,10) is already occupied by house-s4 (the "replace"
  // case), (19,19) is out of bounds for a 4x4 footprint, and (0,0) is
  // GENUINELY PLACEABLE -- vacant, in bounds, nothing in the way. Without
  // that last one this test cannot tell "valueIfPlaced never places
  // anything" from "valueIfPlaced happens to only be asked about spots
  // where placement would fail anyway" -- caught for real: an earlier
  // version of this test (only the first three cells) let a mutation that
  // added a genuine board.place() call SURVIVE, because all three of ITS
  // OWN cells happened to be unplaceable and the call silently no-opped.
  valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 5, 5, 90);
  valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 10, 10, 0);
  valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 19, 19, 0);
  valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 0, 0, 0);
  const after = JSON.stringify(b.pieces());
  assert.equal(before, after, "no speculative call may mutate the board's own pieces");
  assert.equal(b.pieceIdAt(5, 5), -1, "the target cell must still be vacant -- nothing was actually placed");
  assert.equal(b.pieceIdAt(0, 0), -1, "the GENUINELY PLACEABLE cell must also still be vacant -- this is the case a real board.place() call would have succeeded on");
});

test("GATE (S4): valueIfPlaced on an OCCUPIED cell correctly excludes the REAL current occupant from the neighbour sum, while using the CANDIDATE's category for the lookup -- 'replace' semantics", () => {
  // 1x1 pieces here deliberately -- house-s4/condo-s4 are 2x2/4x4 (matching
  // the real catalogue shapes this file's other tests need), which cannot
  // be placed on adjacent single cells without colliding. Footprint size is
  // irrelevant to what THIS test checks (self-exclusion + category
  // override), so the base fixture's own 1x1 house-a/shop-a are used.
  const b = board();
  // house-a dilutes itself: adjacency.residential = -2, adjacency.commercial = 2.
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("house-a", { x: 6, y: 5 }, 0, { id: 2 }); // the "current occupant" being hypothetically replaced
  b.place("shop-a", { x: 7, y: 5 }, 0, { id: 3 });

  // What would (6,5) be worth if replaced by a shop instead of a house?
  const asShop = valueIfPlaced(b, CATALOGUE, "shop-a", 6, 5, 0);
  // Manually: terrain(0) + house-a-at-(5,5)'s adjacency.commercial (the
  // candidate's own category) at distance 1, PLUS shop-a-at-(7,5)
  // contributing nothing to itself (its own adjacency has no "commercial"
  // key, so it contributes 0 regardless of exclusion).
  const expected = terrainContribution(b, 6, 5) + 2 * falloff(1);
  assert.equal(asShop, expected);

  // And the REAL occupant at (6,5) (house-a, id 2) must be excluded from
  // its own neighbour sum regardless of which candidate category is asked
  // about -- proven by checking pieceIdsWithinR itself never includes id 2
  // when queried AT (6,5).
  assert.ok(!pieceIdsWithinR(b, 6, 5).includes(2));
});

test("rotation is accepted by valueIfPlaced but does not change the result -- disclosed, not silently ignored", () => {
  const b = s4Board();
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 1 });
  const r0 = valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 5, 5, 0);
  const r90 = valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 5, 5, 90);
  const r180 = valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 5, 5, 180);
  assert.equal(r0, r90);
  assert.equal(r0, r180);
});

test("perUnitWorth and totalWorth are pure multiplication, composing S4's own inputs", () => {
  assert.equal(perUnitWorth(10, 0.5), 5);
  assert.equal(totalWorth(5, 8), 40);
});

// The checklist's own named gate, verbatim: "a test asserting the house/
// condo inversion holds in both directions on the same cell." Blind review
// caught a real gap in the original plan: without a real amenity placed
// within R, value(cell) is 0 (a fresh/vacant board) and BOTH inversion
// assertions read `0 > 0`, which is false either way -- the test would not
// be testing anything. A real shop is placed here specifically so
// value(cell) is meaningfully positive before the inversion is checked.
test("GATE (S4): the house/condo inversion holds BOTH ways on the SAME cell -- house wins per unit, condo wins in total", () => {
  const b = s4Board();
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 1 }); // makes the residential-category readout meaningfully positive

  const houseValue = valueIfPlaced(b, S4_CATALOGUE, "house-s4", 5, 5, 0);
  const condoValue = valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 5, 5, 0);
  // Sanity check: the test's own premise. valueAt() on this still-VACANT
  // cell would read 0 (terrain-only, by design -- a vacant cell has no
  // occupant category to key adjacency against, DECISIONS #12 point 4),
  // so checking THAT would compare 0 > 0 and prove nothing. valueIfPlaced
  // supplies the hypothetical residential category, which is what makes
  // this cell's readout meaningfully positive.
  assert.ok(houseValue > 0, `sanity check: valueIfPlaced must be meaningfully positive here, got ${houseValue}`);
  // Same category (residential), same cell -> valueIfPlaced returns the
  // identical number for both -- the inversion is driven purely by
  // unitQuality/baseValue below, nothing incidental to which typeId asked.
  assert.equal(houseValue, condoValue);

  const housePerUnit = perUnitWorth(houseValue, S4_CATALOGUE["house-s4"].unitQuality);
  const condoPerUnit = perUnitWorth(condoValue, S4_CATALOGUE["condo-s4"].unitQuality);
  assert.ok(housePerUnit > condoPerUnit, `house should beat condo PER UNIT: ${housePerUnit} vs ${condoPerUnit}`);

  const houseTotal = totalWorth(housePerUnit, S4_CATALOGUE["house-s4"].baseValue);
  const condoTotal = totalWorth(condoPerUnit, S4_CATALOGUE["condo-s4"].baseValue);
  assert.ok(condoTotal > houseTotal, `condo should beat house IN TOTAL: ${condoTotal} vs ${houseTotal}`);
});

test("the house/condo inversion is disclosed as sign-dependent -- it can reverse in a net-undesirable location, named rather than hidden", () => {
  const b = s4Board();
  b.place("factory-a", { x: 6, y: 5 }, 0, { id: 1 }); // makes the residential-category readout meaningfully NEGATIVE

  const houseValue = valueIfPlaced(b, S4_CATALOGUE, "house-s4", 5, 5, 0);
  const condoValue = valueIfPlaced(b, S4_CATALOGUE, "condo-s4", 5, 5, 0);
  assert.ok(houseValue < 0, `sanity check: this scenario needs a genuinely undesirable readout, got ${houseValue}`);
  const housePerUnit = perUnitWorth(houseValue, S4_CATALOGUE["house-s4"].unitQuality);
  const condoPerUnit = perUnitWorth(condoValue, S4_CATALOGUE["condo-s4"].unitQuality);
  // Being LESS negative is "worth more" here -- the ordering flips relative
  // to the desirable-location case above. Documented, not silently assumed
  // to hold everywhere; SCORING-MODEL does not state whether the ordering
  // should be location-independent.
  assert.ok(condoPerUnit > housePerUnit, `in a net-undesirable spot the ordering flips: condo ${condoPerUnit} vs house ${housePerUnit}`);
});
