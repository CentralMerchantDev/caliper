// =============================================================================
// THE CITY SCORE — SCORING-MODEL-2026-09-14.md §4B. A SECOND DIMENSION, not
// an adjacency value: §S1's value() is strictly local at Chebyshev R = 3;
// this is global. It exists because of Mark's stadium ruling ("a stadium
// raises the overall city value and is neutral to the area it is built in")
// -- there was nowhere in the local model for "raises the city" to go.
//
// The checklist's own gate: "adding a second, trivial term requires no
// change to the registry or to the first term. Prove it by adding a
// throwaway term in the test, not by asserting the design is extensible."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard } from "../public/area-board.js";
import { valueAt, perUnitWorth } from "../public/scoring.js";
import { median, medianWealth, MEDIAN_WEALTH_TERM, createCityScoreRegistry, defaultCityScoreRegistry } from "../public/city-score.js";

const CATALOGUE = {
  "house-a": { category: "residential", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: -2, commercial: 2 }, unitQuality: 1 },
  "condo-a": { category: "residential", footprint: [2, 2], terrainMask: ["land"], adjacency: { residential: -2, commercial: 2 }, unitQuality: 0.7071067811865475 },
  "shop-a": { category: "commercial", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: 5 }, unitQuality: 1 },
  "factory-a": { category: "industrial", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: -5 }, unitQuality: 1 },
};

function board(opts = {}) {
  return createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE, ...opts });
}

// ---------------------------------------------------------------- median()

test("median() of an odd-length array is the true middle element", () => {
  assert.equal(median([5, 1, 3]), 3);
});

test("median() of an even-length array is the average of the two middle elements", () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("median() handles negative values correctly -- dilutive residential adjacency makes negatives a real case, not a hypothetical", () => {
  assert.equal(median([-5, -1, 3]), -1);
  assert.equal(median([-10, -2, -1, 4]), -1.5);
});

test("median() of an empty array is null, not 0 or NaN -- 'no data' must not silently read as a real (and possibly winning) score", () => {
  assert.equal(median([]), null);
});

// ---------------------------------------------------------------- medianWealth()

test("medianWealth on a single 1x1 residential cell equals that cell's own perUnitWorth exactly", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  const expected = perUnitWorth(valueAt(b, CATALOGUE, 5, 5), CATALOGUE["house-a"].unitQuality);
  assert.equal(medianWealth(b, CATALOGUE), expected);
});

test("medianWealth on a board with NO residential pieces is null, not 0 or a crash", () => {
  const b = board();
  b.place("shop-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("factory-a", { x: 10, y: 10 }, 0, { id: 2 });
  assert.equal(medianWealth(b, CATALOGUE), null);
});

test("medianWealth EXCLUDES non-residential cells from the pool -- commercial and industrial cells never enter the median", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 15, y: 15 }, 0, { id: 2 }); // far away, no interaction
  b.place("factory-a", { x: 2, y: 2 }, 0, { id: 3 }); // far away, no interaction
  // Only one residential cell exists, so the median must be exactly its own value --
  // if shop-a/factory-a's own (very different) perUnitWorth leaked into the pool,
  // this would not equal a single cell's value.
  const expected = perUnitWorth(valueAt(b, CATALOGUE, 5, 5), CATALOGUE["house-a"].unitQuality);
  assert.equal(medianWealth(b, CATALOGUE), expected);
});

test("GATE (C1): medianWealth counts EVERY cell of a multi-cell residential piece separately, not once per piece -- footprint size is an implicit weight", () => {
  const b = board();
  b.place("condo-a", { x: 5, y: 5 }, 0, { id: 1 }); // 2x2: cells (5,5) (6,5) (5,6) (6,6)
  b.place("shop-a", { x: 7, y: 5 }, 0, { id: 2 }); // adjacent to the (6,5) side, farther from (5,5)/(5,6)/(6,6)

  const cells = [[5, 5], [6, 5], [5, 6], [6, 6]];
  const perCellValues = cells
    .map(([x, y]) => perUnitWorth(valueAt(b, CATALOGUE, x, y), CATALOGUE["condo-a"].unitQuality))
    .sort((a, b) => a - b);
  const expectedMedian = (perCellValues[1] + perCellValues[2]) / 2;

  // Prove the premise: the four cells of this ONE piece do not all read the
  // same value (else this test could not distinguish per-cell from per-piece
  // sampling at all).
  assert.notEqual(perCellValues[0], perCellValues[3], "the four cells must differ, or this test proves nothing");
  assert.equal(medianWealth(b, CATALOGUE), expectedMedian);
});

test("GATE (C1): median wealth reads as the MEDIAN, not the mean -- one rich outlier does not carry a slum of poor cells", () => {
  const b = board();
  // Four residential cells with no amenity nearby (value = 0, terrain-only) --
  // the typical resident.
  b.place("house-a", { x: 1, y: 1 }, 0, { id: 1 });
  b.place("house-a", { x: 1, y: 10 }, 0, { id: 2 });
  b.place("house-a", { x: 10, y: 1 }, 0, { id: 3 });
  b.place("house-a", { x: 18, y: 1 }, 0, { id: 4 });
  // One residential cell right next to a strong commercial amenity -- a real,
  // meaningfully positive outlier.
  b.place("house-a", { x: 15, y: 15 }, 0, { id: 5 });
  b.place("shop-a", { x: 16, y: 15 }, 0, { id: 6 });

  const outlierValue = perUnitWorth(valueAt(b, CATALOGUE, 15, 15), CATALOGUE["house-a"].unitQuality);
  assert.ok(outlierValue > 0, `sanity check: the outlier must be meaningfully positive, got ${outlierValue}`);

  const mean = outlierValue / 5; // the other four are exactly 0
  assert.notEqual(mean, 0, "sanity check: the mean must differ from the median for this test to discriminate anything");

  // The median of [0, 0, 0, 0, outlierValue] is 0 -- the typical resident's
  // value, unmoved by the one rich cell. The mean would be outlierValue/5,
  // a real, nonzero number the median must NOT equal.
  assert.equal(medianWealth(b, CATALOGUE), 0);
});

// ---------------------------------------------------------------- the registry

test("defaultCityScoreRegistry ships with median wealth registered, and only that", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  const registry = defaultCityScoreRegistry();
  const result = registry.computeScore(b, CATALOGUE);
  assert.equal(result.terms.length, 1);
  assert.equal(result.terms[0].label, "median wealth");
  assert.equal(result.score, medianWealth(b, CATALOGUE));
});

test("computeScore on an empty city (no residential cells at all) reports score: null, not 0 -- distinguishable from a real, badly-planned city", () => {
  const empty = board();
  const emptyResult = defaultCityScoreRegistry().computeScore(empty, CATALOGUE);
  assert.equal(emptyResult.score, null);
  assert.equal(emptyResult.terms[0].value, null);

  // A real, populated-but-badly-planned city (residential crammed together,
  // no amenities) scores a real, negative number -- and that real number
  // must never be silently outranked by "null" reading as if it were 0.
  const bad = board();
  bad.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  bad.place("house-a", { x: 6, y: 5 }, 0, { id: 2 }); // residential-on-residential: dilutive
  const badResult = defaultCityScoreRegistry().computeScore(bad, CATALOGUE);
  assert.equal(typeof badResult.score, "number");
  assert.ok(badResult.score < 0, `sanity check: a crammed, amenity-less city should score negative, got ${badResult.score}`);
});

test("GATE (C1): adding a second, trivial term requires no change to the registry or the first term", () => {
  const b = board();
  b.place("house-a", { x: 5, y: 5 }, 0, { id: 1 });
  b.place("shop-a", { x: 6, y: 5 }, 0, { id: 2 });

  const before = createCityScoreRegistry();
  before.registerTerm(MEDIAN_WEALTH_TERM);
  const beforeResult = before.computeScore(b, CATALOGUE);

  const after = createCityScoreRegistry();
  after.registerTerm(MEDIAN_WEALTH_TERM); // the exact same term object, unmodified
  after.registerTerm({ label: "throwaway constant", compute: () => 42 });
  const afterResult = after.computeScore(b, CATALOGUE);

  assert.equal(afterResult.terms.length, 2);
  assert.equal(afterResult.terms[0].label, "median wealth");
  assert.equal(afterResult.terms[0].value, beforeResult.terms[0].value, "the first term's own value must be completely unaffected by the second term existing");
  assert.equal(afterResult.terms[1].label, "throwaway constant");
  assert.equal(afterResult.terms[1].value, 42);
  assert.equal(afterResult.score, beforeResult.score + 42, "the registry combines terms by SUMMING them");
});

test("createCityScoreRegistry returns a FRESH registry each call -- registering a term on one instance does not leak into another", () => {
  const registryA = createCityScoreRegistry();
  registryA.registerTerm({ label: "only on A", compute: () => 1 });
  const registryB = createCityScoreRegistry();
  const result = registryB.computeScore(board(), CATALOGUE);
  assert.equal(result.terms.length, 0);
  assert.equal(result.score, null);
});
