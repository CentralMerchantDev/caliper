// =============================================================================
// THE VALUE FUNCTION — REBUILD-PLAN.md §S1. The checklist's own gate: "the
// same arrangement scores identically however it was reached: A then B, B
// then A, or loaded from a save. RED is any path dependence."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard } from "../public/area-board.js";
import { value, pieceIdsWithinR, terrainContribution, R } from "../public/scoring.js";

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

test("a residential cell with a commercial neighbour within R gains the shop's adjacency bonus", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 7, y: 5 }, 0, { id: 2 }); // Chebyshev distance 2, within R=3
  const withShop = value(b, CATALOGUE, 5, 5);

  const bAlone = board();
  bAlone.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  const withoutShop = value(bAlone, CATALOGUE, 5, 5);

  assert.equal(withShop - withoutShop, 5, "the shop's own adjacency.residential value");
});

test("a neighbour at exactly Chebyshev distance R contributes; one step further does not", () => {
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
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  b.place("shop-a", { x: 4, y: 5 }, 0, { id: 3 });
  const v = value(b, CATALOGUE, 5, 5);
  assert.equal(v, terrainContribution(b, 5, 5) + 10, "two +5 shops must sum to +10, not net to zero or flip sign");

  // And confirm each shop's OWN contribution individually, not just the
  // combined total -- rules out "disabled entirely" landing on the right
  // total by a different coincidence (e.g. a single +10 constant).
  const oneShop = board();
  oneShop.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  oneShop.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });
  assert.equal(value(oneShop, CATALOGUE, 5, 5), terrainContribution(oneShop, 5, 5) + 5);
});

test("a piece spanning multiple cells within R is counted exactly ONCE, not once per cell it occupies", () => {
  const wideCatalogue = { ...CATALOGUE, "mall-a": { category: "commercial", footprint: [2, 1], terrainMask: ["land"], adjacency: { residential: 5 } } };
  const b = createAreaBoard({ width: 20, height: 20, catalogue: wideCatalogue });
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("mall-a", { x: 6, y: 5 }, 0, { id: 2 }); // occupies (6,5) and (7,5), both within R of (5,5)
  const v = value(b, wideCatalogue, 5, 5);
  assert.equal(v - terrainContribution(b, 5, 5), 5, "the mall's bonus must not be double-counted for its second cell");
});

test("an entry with no adjacency key for the occupant's category contributes zero, not undefined-coerced-to-NaN", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("civic-a", { x: 6, y: 5 }, 0, { id: 2 }); // adjacency: {} -- no "residential" key
  const v = value(b, CATALOGUE, 5, 5);
  assert.equal(v, terrainContribution(b, 5, 5));
  assert.ok(Number.isFinite(v));
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
