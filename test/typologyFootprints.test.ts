// docs/specs/PLACEMENT-CONTRACT.md Part 1.
//
// CORRECTED 2026-09-06 (Mark): a plot is not a slot for a kind of building,
// so there is no longer a "does this class agree with that typology" question
// to test -- see the header of public/typology-footprints.js for the full
// correction. Two tests that used to live here are gone as a result, not
// weakened to pass: "every plot class can hold at least one registered
// typology" and "TOWER's proposed bracket is 6-11 cells" both tested a
// class-to-typology binding that no longer exists. Retired rather than kept
// green on a relationship nothing enforces any more.
//
// What is left is what PLACEMENT-CONTRACT.md Part 1 still asks for: every
// typology's own footprint is declared in whole cells, and PLOT_CLASSES
// (which survives only as a record of what world generation seeds, per its
// own comment in city-plan.js) is cell-aligned too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TYPOLOGY_FOOTPRINT_CELLS, CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH } from "../public/typology-footprints.js";
import { PLOT_CLASSES } from "../public/city-plan.js";

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
    TOWER:     { minW: 45,  maxW: 90,  minD: 45,  maxD: 90 },
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

test("FARM and HANGAR are named as a seeding gap, not silently forgotten", () => {
  // Not a placement rule (see this file's header) -- world generation still
  // has to seed SOMETHING on a FARM or HANGAR plot (Step 3's per-district
  // decision), and neither class's own typologies are close to the ground
  // these plots actually carve. If either ever gets a real typology large
  // enough, this should start failing loudly rather than this list quietly
  // staying accurate by accident.
  assert.deepStrictEqual([...CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH].sort(), ["FARM", "HANGAR"]);
});
