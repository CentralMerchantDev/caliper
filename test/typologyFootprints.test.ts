// docs/specs/PLACEMENT-CONTRACT.md Part 1: "the two tables must agree, and a
// test must prove it." This is that test, for public/typology-footprints.js
// (the cell-range table read straight off buildings.js's own bld* clamps)
// against public/city-plan.js's PLOT_CLASSES.
//
// NOTE ON A SECOND FILE: public/footprint-contract.js and
// test/placementContract.test.ts exist too -- a second, independently
// written answer to the same Part 1 requirement, landed in this tree at the
// same time as this one. That file's bld-tower entry (6-11 cells) is Mark's
// PLOT-class proposal number, not bld-tower's own clamp (verified against
// buildings.js:2373-2374: `Math.max(4, Math.min(8, ...))`, 4-8 cells) --
// exactly the invented-number mistake this contract exists to prevent -- and
// it never made PLOT_CLASSES itself cell-aligned, so rule 2 ("minW/maxW/
// minD/maxD are whole multiples of CELL") is unmet there. Per the contract's
// own "whoever gets here first commits it" rule, this file is the one
// that reads correctly against source; that file is left in place rather
// than deleted (nothing is deleted in this repo) for whoever reconciles it.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL_M,
  TYPOLOGY_FOOTPRINT_CELLS,
  TOWER_PLOT_CELLS_PROPOSED,
  TYPOLOGIES_WITH_NO_REGISTERED_BUILDER,
  CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH,
  typologyFitsClass,
} from "../public/typology-footprints.js";
import { PLOT_CLASSES } from "../public/city-plan.js";
import { TYPOLOGIES_FOR_CLASS } from "../public/layout.js";

test("every TYPOLOGY_FOOTPRINT_CELLS entry declares whole cells", () => {
  for (const [typology, foot] of Object.entries(TYPOLOGY_FOOTPRINT_CELLS)) {
    assert.ok(Number.isInteger(foot.w.min) && foot.w.min >= 1, `${typology}.w.min must be a positive integer`);
    if (foot.w.max !== null) {
      assert.ok(Number.isInteger(foot.w.max) && foot.w.max >= foot.w.min, `${typology}.w.max must be a positive integer >= min`);
    }
    assert.ok(Number.isInteger(foot.d.min) && foot.d.min >= 1, `${typology}.d.min must be a positive integer`);
    if (foot.d.max !== null) {
      assert.ok(Number.isInteger(foot.d.max) && foot.d.max >= foot.d.min, `${typology}.d.max must be a positive integer >= min`);
    }
  }
});

test("PLOT_CLASSES bounds were only ever widened from the pre-contract numbers, never narrowed", () => {
  // The metric bounds this repo shipped with before PLACEMENT-CONTRACT.md --
  // frozen here as a record, not re-exported, so this test still means
  // something after PLOT_CLASSES itself changes again.
  const PRE_CONTRACT = {
    TERRACE:   { minW: 8,   maxW: 16,  minD: 22,  maxD: 34 },
    TOWNHOUSE: { minW: 14,  maxW: 26,  minD: 26,  maxD: 40 },
    MIDRISE:   { minW: 26,  maxW: 52,  minD: 32,  maxD: 60 },
    // TOWER excluded: its bound is Mark's chosen proposal, not a mechanical
    // widening of the old number, so "widened, never narrowed" does not
    // apply to it the same way -- see PLACEMENT-CONTRACT.md Part 1.
    CIVIC:     { minW: 60,  maxW: 180, minD: 50,  maxD: 110 },
    PARK:      { minW: 40,  maxW: 200, minD: 40,  maxD: 130 },
    RESORT:    { minW: 34,  maxW: 78,  minD: 34,  maxD: 70 },
    VILLA:     { minW: 18,  maxW: 34,  minD: 22,  maxD: 40 },
    WAREHOUSE: { minW: 55,  maxW: 150, minD: 40,  maxD: 95 },
    FARM:      { minW: 160, maxW: 460, minD: 120, maxD: 340 },
    HANGAR:    { minW: 90,  maxW: 220, minD: 70,  maxD: 150 },
  };
  for (const [name, old] of Object.entries(PRE_CONTRACT) as [string, any][]) {
    const cls = (PLOT_CLASSES as any)[name];
    assert.ok(cls.minW <= old.minW, `${name}.minW grew from ${old.minW} to ${cls.minW} -- a plot that used to qualify no longer does`);
    assert.ok(cls.maxW >= old.maxW, `${name}.maxW shrank from ${old.maxW} to ${cls.maxW} -- a plot that used to qualify no longer does`);
    assert.ok(cls.minD <= old.minD, `${name}.minD grew from ${old.minD} to ${cls.minD} -- a plot that used to qualify no longer does`);
    assert.ok(cls.maxD >= old.maxD, `${name}.maxD shrank from ${old.maxD} to ${cls.maxD} -- a plot that used to qualify no longer does`);
  }
});

test("every plot class can hold at least one registered typology, except PARK (no typology by design) and the documented FARM/HANGAR gap", () => {
  const exempt = new Set(["PARK", ...CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH]);
  for (const [className, cls] of Object.entries(PLOT_CLASSES) as [string, any][]) {
    if (exempt.has(className)) continue;
    const classCells = {
      w: { min: cls.minW / CELL_M, max: cls.maxW / CELL_M },
      d: { min: cls.minD / CELL_M, max: cls.maxD / CELL_M },
    };
    const allowed = (TYPOLOGIES_FOR_CLASS[className] || []).map((e) => (typeof e === "string" ? e : e.typology));
    assert.ok(allowed.length > 0, `No typologies mapped in TYPOLOGIES_FOR_CLASS for ${className}`);
    const candidates = allowed.filter((t: string | null) => t && !TYPOLOGIES_WITH_NO_REGISTERED_BUILDER.includes(t));
    assert.ok(candidates.length > 0, `${className}: no registered typology named in TYPOLOGIES_FOR_CLASS`);

    const fits = candidates.some((t: string) => typologyFitsClass(TYPOLOGY_FOOTPRINT_CELLS[t], classCells));
    assert.ok(fits, `${className} (${cls.minW}-${cls.maxW}m x ${cls.minD}-${cls.maxD}m / ${classCells.w.min}-${classCells.w.max} x ${classCells.d.min}-${classCells.d.max} cells) has no registered typology whose footprint overlaps it: ${candidates.join(", ")}`);
  }
});

test("TOWER's proposed bracket is 6-11 cells, and bld-tower's real clamp overlaps it", () => {
  assert.strictEqual(TOWER_PLOT_CELLS_PROPOSED.w.min, 6);
  assert.strictEqual(TOWER_PLOT_CELLS_PROPOSED.w.max, 11);
  assert.strictEqual(TOWER_PLOT_CELLS_PROPOSED.d.min, 6);
  assert.strictEqual(TOWER_PLOT_CELLS_PROPOSED.d.max, 11);
  assert.ok(
    typologyFitsClass(TYPOLOGY_FOOTPRINT_CELLS["bld-tower"], TOWER_PLOT_CELLS_PROPOSED),
    "bld-tower's real clamp (4-8 cells) must overlap Mark's proposed TOWER bracket (6-11 cells) for a TOWER plot to be buildable at all"
  );
});

test("FARM and HANGAR are named, not silently excluded -- the gap this test cannot close", () => {
  // If either of these ever gets a real registered typology large enough,
  // this test should start failing loudly (candidates.length or the fit
  // check above would then need updating) rather than this list quietly
  // staying accurate by accident.
  assert.deepStrictEqual([...CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH].sort(), ["FARM", "HANGAR"]);
});
