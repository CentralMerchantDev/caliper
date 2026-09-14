// =============================================================================
// S6 (CLI) — REBUILD-PLAN.md S5 and V3: "developed value sits on top,
// unchanged in mechanism." The checklist's own instruction is a
// CONFIRMATION, not a build: "read S5 and V3 and confirm the mechanism is
// genuinely unchanged rather than assumed so."
//
// V3, Mark's own framing: "it may be farmland for now, but you build a
// house on it, and then you can subdivide that land and build a
// community... you're really becoming a developer." REBUILD-PLAN.md S5:
// "Improving a cell changes what is placed there, which changes its
// neighbours' contributions, which is already how the function works."
//
// This file introduces NO NEW PRODUCTION CODE. Every assertion below calls
// only the existing public/area-board.js (place/remove), public/scoring.js
// (valueAt/perUnitWorth/totalWorth) and public/city-score.js (medianWealth)
// functions, already proven by test/scoring.test.ts, test/cityScore.test.ts
// and their own gates. If "developing" a plot needed a SEPARATE code path
// to make neighbours re-score or the city median move, that gap would show
// up here as a real failure, not an assumption papered over.
//
// OUT OF SCOPE, NAMED RATHER THAN SILENTLY DROPPED: V3's second clause --
// "certain unlockable buildings... cannot be placed on nothing; they
// require the infrastructure to be built first" -- is a PLACEMENT
// prerequisite (evaluatePlacement's own job), not a scoring-mechanism
// concern. REBUILD-PLAN.md's own S5 heading is "unchanged in MECHANISM",
// matching the checklist's C1-adjacent scoring focus; placement
// prerequisites are a different item's business.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard } from "../public/area-board.js";
import { valueAt, perUnitWorth, totalWorth } from "../public/scoring.js";
import { medianWealth } from "../public/city-score.js";
import { baseValueFor, unitQualityFor } from "../scripts/migrate-catalogue-s2-fields.mjs";

function residentialEntry(footprint, massingLength, adjacency) {
  const base = { category: "residential", footprint, massing: Array(massingLength).fill("tier"), terrainMask: ["land"], adjacency };
  return { ...base, baseValue: baseValueFor(base), unitQuality: unitQualityFor(base) };
}

const CATALOGUE = {
  "farmhouse-a": residentialEntry([1, 1], 1, { residential: -2, commercial: 2 }), // small, one-tier -- the starting plot
  "subdivision-a": residentialEntry([2, 2], 3, { residential: -2, commercial: 2 }), // bigger footprint, more tiers -- "developed"
  "shop-a": { category: "commercial", footprint: [1, 1], terrainMask: ["land"], adjacency: { residential: 5 }, unitQuality: 1, baseValue: 1 },
};

function board(opts = {}) {
  return createAreaBoard({ width: 20, height: 20, catalogue: CATALOGUE, ...opts });
}

test("GATE (S6): developing a plot (remove the small piece, place a bigger one on the same footprint) changes a NEIGHBOUR's own valueAt -- through value() alone, no development-specific code", () => {
  const b = board();
  b.place("shop-a", { x: 10, y: 5 }, 0, { id: 1 }); // an unrelated amenity, far from the development site
  b.place("farmhouse-a", { x: 5, y: 5 }, 0, { id: 2 });
  b.place("farmhouse-a", { x: 5, y: 8 }, 0, { id: 3 }); // the NEIGHBOUR being watched -- close enough to be within R of id 2's footprint, far from id 1

  const neighbourBefore = valueAt(b, CATALOGUE, 5, 8);

  b.remove(2);
  const placed = b.place("subdivision-a", { x: 5, y: 5 }, 0, { id: 4 }); // 2x2, same anchor, "subdivided"
  assert.ok(placed.ok, `the subdivision must actually fit on the vacated plot: ${JSON.stringify(placed)}`);

  const neighbourAfter = valueAt(b, CATALOGUE, 5, 8);

  // subdivision-a's footprint is now closer to (5,8) (its (5,6) cell is
  // distance 2, versus farmhouse-a's single cell at distance 3) AND is a
  // different, bigger piece -- the neighbour's own reading must move,
  // proving the change propagated through the ordinary neighbour-scan in
  // value(), not through anything specific to "development".
  assert.notEqual(neighbourBefore, neighbourAfter, "a neighbour's valueAt must respond to the development, exactly as it would to any other placement change");
});

test("GATE (S6): the developed plot's OWN worth reflects the new piece's real baseValue/unitQuality, via perUnitWorth/totalWorth alone", () => {
  const b = board();
  // (7,5) -- close enough to matter (distance 2 from (5,5)) but OUTSIDE
  // subdivision-a's own eventual 2x2 footprint at (5,5)-(6,6), so the
  // amenity is never displaced by the development itself.
  b.place("shop-a", { x: 7, y: 5 }, 0, { id: 1 });
  b.place("farmhouse-a", { x: 5, y: 5 }, 0, { id: 2 });

  const farmhouseWorth = totalWorth(
    perUnitWorth(valueAt(b, CATALOGUE, 5, 5), CATALOGUE["farmhouse-a"].unitQuality),
    CATALOGUE["farmhouse-a"].baseValue,
  );

  b.remove(2);
  const placed = b.place("subdivision-a", { x: 5, y: 5 }, 0, { id: 3 });
  assert.ok(placed.ok, `the subdivision must actually fit on the vacated plot: ${JSON.stringify(placed)}`);

  const subdivisionWorth = totalWorth(
    perUnitWorth(valueAt(b, CATALOGUE, 5, 5), CATALOGUE["subdivision-a"].unitQuality),
    CATALOGUE["subdivision-a"].baseValue,
  );

  // subdivision-a has a much larger baseValue (units) than farmhouse-a
  // (2x2x3 = 12 vs 1x1x1 = 1) -- "you're really becoming a developer" must
  // show up as a real increase in total worth, computed by the SAME
  // functions S4 already proved, called again after the swap.
  assert.ok(subdivisionWorth > farmhouseWorth, `developing must raise total worth: farmhouse ${farmhouseWorth}, subdivision ${subdivisionWorth}`);
});

test("GATE (S6): the city's median wealth responds to development -- medianWealth() called again after the swap, no separate 'redevelop' hook", () => {
  const b = board();
  // Same non-overlapping placement as the worth test above.
  b.place("shop-a", { x: 7, y: 5 }, 0, { id: 1 });
  b.place("farmhouse-a", { x: 5, y: 5 }, 0, { id: 2 });
  // Two more residential cells far away, unaffected by the development, so
  // the median has more than one data point to move against.
  b.place("farmhouse-a", { x: 15, y: 1 }, 0, { id: 3 });
  b.place("farmhouse-a", { x: 1, y: 15 }, 0, { id: 4 });

  const medianBefore = medianWealth(b, CATALOGUE);

  b.remove(2);
  const placed = b.place("subdivision-a", { x: 5, y: 5 }, 0, { id: 5 });
  assert.ok(placed.ok, `the subdivision must actually fit on the vacated plot: ${JSON.stringify(placed)}`);

  const medianAfter = medianWealth(b, CATALOGUE);

  assert.notEqual(medianBefore, medianAfter, "the city score must move when a plot develops, through medianWealth's own ordinary board scan");
});

test("GATE (S6): developing via remove-then-place is PATH-INDEPENDENT -- it scores IDENTICALLY to a board built with the final state from the start, extending S1's own gate to the exact narrative V3 describes", () => {
  const developed = board();
  developed.place("shop-a", { x: 10, y: 5 }, 0, { id: 1 });
  developed.place("farmhouse-a", { x: 5, y: 5 }, 0, { id: 2 }); // farmland becomes a house...
  developed.remove(2);
  developed.place("subdivision-a", { x: 5, y: 5 }, 0, { id: 3 }); // ...becomes a subdivision.

  const neverFarmed = board();
  neverFarmed.place("shop-a", { x: 10, y: 5 }, 0, { id: 1 });
  neverFarmed.place("subdivision-a", { x: 5, y: 5 }, 0, { id: 99 }); // the same final state, reached directly

  // Query several cells, not just the developed plot itself, since the
  // claim is about the WHOLE board's readout, not one cell.
  for (const [x, y] of [[5, 5], [6, 5], [5, 8], [10, 5], [0, 0]]) {
    assert.equal(valueAt(developed, CATALOGUE, x, y), valueAt(neverFarmed, CATALOGUE, x, y), `cell (${x},${y}) must read identically regardless of development history`);
  }
  assert.equal(medianWealth(developed, CATALOGUE), medianWealth(neverFarmed, CATALOGUE));
});
