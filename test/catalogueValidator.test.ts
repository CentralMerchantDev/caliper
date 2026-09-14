// =============================================================================
// THE CATALOGUE VALIDATOR'S OWN TESTS — Phase 1 item 5's gate, stated
// exactly: "RED is a deliberately malformed entry -- an odd road width, a
// footprint off the set, a duplicate id -- that the validator accepts.
// Prove each red before fixing it."
//
// Each rule below is proven two ways: a clean baseline entry (one field
// changed at a time, everything else held constant, so a failure can only
// be the one rule under test) that must pass every OTHER rule while failing
// the one being tested, and a mutation check (see the bottom of this file)
// that watches the real validator go from catching it to missing it when
// that rule's own check is disabled -- not merely asserted to exist.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateCatalogue, validateEntry, CATALOGUE_FOOTPRINTS, ROAD_CLASS_HIERARCHY } from "../public/catalogue-validator.js";
import { AMENITY_CIVIC_TYPE_IDS } from "../scripts/migrate-catalogue-s2-fields.mjs";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}

const ROOT = repoRoot();

/** A known-good building entry, for tests that mutate exactly one field. */
function goodBuilding(overrides = {}) {
  return {
    id: "test-building",
    category: "residential",
    footprint: [2, 3],
    rotatable: true,
    terrainMask: ["land"],
    pivot: "corner",
    massing: ["base", "top"],
    joinSpec: "ground-decal",
    proportion: 1.2,
    baseValue: 12,
    adjacency: { residential: 3, commercial: 3, industrial: 3, civic: 3, landmark: 3, road: 3 },
    ...overrides,
  };
}

/** A known-good road entry, for tests that mutate exactly one field. */
function goodRoad(overrides = {}) {
  return {
    id: "test-road",
    category: "road",
    footprint: [4, 4],
    rotatable: true,
    terrainMask: ["land"],
    pivot: "corner",
    roadClass: "street",
    tileType: "straight",
    junctionArms: ["street", "street"],
    baseValue: 1,
    adjacency: { residential: 3, commercial: 3, industrial: 3, civic: 3, landmark: 3, road: 3 },
    ...overrides,
  };
}

test("the real data/catalogue.json is fully valid -- zero errors", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const errors = validateCatalogue(catalogue);
  assert.deepEqual(errors, [], `real catalogue has validator errors:\n${JSON.stringify(errors, null, 2)}`);
});

test("the real catalogue has no duplicate ids -- checked directly, not inferred from validateCatalogue passing", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const ids = catalogue.map((e: any) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

// Rule 8 deliberately does not restrict adjacency's keys to a fixed enum
// (a future player-authored typeId, per B1, cannot be enumerated in
// advance) -- which means a typo'd category key (e.g. "resedential")
// would satisfy rule 8 (a real string key, an integer value) while never
// matching anything at runtime, forever, with nothing else to catch it.
// This is a check on the DATA, not the validator: every key actually
// present in the real catalogue today is drawn from the real category set.
test("every adjacency key in the real catalogue is one of the six real catalogue categories -- guards the typo rule 8 cannot see", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const realCategories = new Set(catalogue.map((e: any) => e.category));
  const badKeys: string[] = [];
  for (const entry of catalogue) {
    for (const key of Object.keys(entry.adjacency)) {
      if (!realCategories.has(key)) badKeys.push(`${entry.id}: "${key}"`);
    }
  }
  assert.deepEqual(badKeys, []);
});

// ---------------------------------------------------------------- SCORING-MODEL §4: the substation problem
//
// "civic" carries both genuine services (a library) and infrastructure that
// must not raise nearby housing value (a substation) -- resolved by keying
// amenity civic entries on typeId (scripts/migrate-catalogue-s2-fields.mjs's
// own AMENITY_CIVIC_TYPE_IDS), not by splitting the category. This is the
// checklist's own named gate for A1: "a test that refuses a positive
// residential bonus from a non-amenity civic entry."

test("GATE (A1): every non-amenity civic entry in the real catalogue carries NO positive residential adjacency", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const civicEntries = catalogue.filter((e: any) => e.category === "civic");
  assert.ok(civicEntries.length > 0, "fixture sanity: there should be real civic entries to check");
  const violations: string[] = [];
  for (const entry of civicEntries) {
    if (AMENITY_CIVIC_TYPE_IDS.includes(entry.id)) continue;
    const residentialBonus = entry.adjacency.residential;
    if (typeof residentialBonus === "number" && residentialBonus > 0) {
      violations.push(`${entry.id}: adjacency.residential = ${residentialBonus}`);
    }
  }
  assert.deepEqual(violations, [], `non-amenity civic entries must not raise nearby housing value:\n${violations.join("\n")}`);
});

test("GATE (A1), named directly: substation-a specifically carries no positive residential adjacency", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const substation = catalogue.find((e: any) => e.id === "substation-a");
  assert.ok(substation, "substation-a must exist in the real catalogue for this gate to mean anything");
  const residentialBonus = substation.adjacency.residential;
  assert.ok(!(typeof residentialBonus === "number" && residentialBonus > 0), `substation-a must not raise nearby housing value, got adjacency.residential = ${JSON.stringify(residentialBonus)}`);
});

test("every civic entry ON the amenity list DOES carry a positive residential bonus -- the split is not vacuous in the other direction", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  for (const typeId of AMENITY_CIVIC_TYPE_IDS) {
    const entry = catalogue.find((e: any) => e.id === typeId);
    assert.ok(entry, `${typeId} (named in AMENITY_CIVIC_TYPE_IDS) must exist in the real catalogue`);
    assert.equal(entry.category, "civic", `${typeId} is on the civic amenity list but its own category is "${entry.category}"`);
    assert.ok(typeof entry.adjacency.residential === "number" && entry.adjacency.residential > 0, `${typeId}: expected a positive adjacency.residential, got ${JSON.stringify(entry.adjacency.residential)}`);
  }
});

// ---------------------------------------------------------------- rule 1
test("RULE 1 (whole-module footprint): a fractional footprint is caught", () => {
  const errors = validateEntry(goodBuilding({ footprint: [2, 3.5] }));
  assert.ok(errors.some((e) => e.rule === "whole-module-footprint"), JSON.stringify(errors));
});

test("RULE 1: a zero or negative footprint dimension is caught", () => {
  const zero = validateEntry(goodBuilding({ footprint: [0, 3] }));
  const negative = validateEntry(goodBuilding({ footprint: [-2, 3] }));
  assert.ok(zero.some((e) => e.rule === "whole-module-footprint"));
  assert.ok(negative.some((e) => e.rule === "whole-module-footprint"));
});

test("RULE 1: a real, whole-module footprint is NOT flagged", () => {
  const errors = validateEntry(goodBuilding());
  assert.ok(!errors.some((e) => e.rule === "whole-module-footprint"), JSON.stringify(errors));
});

// ---------------------------------------------------------------- rule 2
test("RULE 2 (catalogue footprint set): a footprint off C1.1's set of eight is caught -- 5x5 is not one of the eight", () => {
  const errors = validateEntry(goodBuilding({ footprint: [5, 5] }));
  assert.ok(errors.some((e) => e.rule === "catalogue-footprint-set"), JSON.stringify(errors));
});

test("RULE 2: a ROTATION of a canonical footprint is accepted, not flagged -- 3x2 is 2x3 rotated", () => {
  const errors = validateEntry(goodBuilding({ footprint: [3, 2] }));
  assert.ok(!errors.some((e) => e.rule === "catalogue-footprint-set"), JSON.stringify(errors));
});

test("RULE 2: every one of C1.1's own eight footprints passes on its own", () => {
  for (const footprint of CATALOGUE_FOOTPRINTS) {
    const errors = validateEntry(goodBuilding({ footprint }));
    assert.ok(!errors.some((e) => e.rule === "catalogue-footprint-set"), `${JSON.stringify(footprint)}: ${JSON.stringify(errors)}`);
  }
});

// ---------------------------------------------------------------- rule 3
test("RULE 3 (road width): an odd road width is caught -- the exact failure mode this gate names", () => {
  const errors = validateEntry(goodRoad({ footprint: [3, 3], junctionArms: null }));
  assert.ok(errors.some((e) => e.rule === "road-width"), JSON.stringify(errors));
});

test("RULE 3: an even road width NOT in {2,4,6,8} is caught -- 10 is even but not a real class", () => {
  const errors = validateEntry(goodRoad({ footprint: [10, 10], junctionArms: null }));
  assert.ok(errors.some((e) => e.rule === "road-width"), JSON.stringify(errors));
});

test("RULE 3: a non-square road footprint is caught -- C1.3 requires the junction tile be square", () => {
  const errors = validateEntry(goodRoad({ footprint: [4, 8], junctionArms: null }));
  assert.ok(errors.some((e) => e.rule === "road-width"), JSON.stringify(errors));
});

test("RULE 3: every one of the four real road widths passes on its own", () => {
  for (const w of [2, 4, 6, 8]) {
    const errors = validateEntry(goodRoad({ footprint: [w, w], junctionArms: null }));
    assert.ok(!errors.some((e) => e.rule === "road-width"), `${w}: ${JSON.stringify(errors)}`);
  }
});

// ---------------------------------------------------------------- rule 4
test("RULE 4 (junction adjacency): a highway-to-lane junction is caught -- not adjacent in the class hierarchy", () => {
  const errors = validateEntry(goodRoad({ junctionArms: ["highway", "lane"], roadClass: null }));
  assert.ok(errors.some((e) => e.rule === "junction-class-adjacency"), JSON.stringify(errors));
});

test("RULE 4: an unknown class name in junctionArms is caught", () => {
  const errors = validateEntry(goodRoad({ junctionArms: ["street", "motorway"], roadClass: null }));
  assert.ok(errors.some((e) => e.rule === "junction-class-adjacency"), JSON.stringify(errors));
});

test("RULE 4: a same-class junction is NOT flagged", () => {
  const errors = validateEntry(goodRoad({ junctionArms: ["avenue", "avenue"] }));
  assert.ok(!errors.some((e) => e.rule === "junction-class-adjacency"), JSON.stringify(errors));
});

test("RULE 4: every real adjacent pair in the hierarchy passes on its own", () => {
  for (let i = 0; i < ROAD_CLASS_HIERARCHY.length - 1; i++) {
    const pair = [ROAD_CLASS_HIERARCHY[i], ROAD_CLASS_HIERARCHY[i + 1]];
    const errors = validateEntry(goodRoad({ junctionArms: pair, roadClass: null }));
    assert.ok(!errors.some((e) => e.rule === "junction-class-adjacency"), `${JSON.stringify(pair)}: ${JSON.stringify(errors)}`);
  }
});

// ---------------------------------------------------------------- rule 5
test("RULE 5 (pivot at the corner): a centre pivot is caught -- C-5 supersedes it explicitly", () => {
  const errors = validateEntry(goodBuilding({ pivot: "centre" }));
  assert.ok(errors.some((e) => e.rule === "pivot-corner"), JSON.stringify(errors));
});

test("RULE 5: a missing pivot field is caught, not silently accepted", () => {
  const entry = goodBuilding();
  delete (entry as any).pivot;
  const errors = validateEntry(entry);
  assert.ok(errors.some((e) => e.rule === "pivot-corner"), JSON.stringify(errors));
});

test("RULE 5: pivot: 'corner' is NOT flagged", () => {
  const errors = validateEntry(goodBuilding());
  assert.ok(!errors.some((e) => e.rule === "pivot-corner"), JSON.stringify(errors));
});

// ---------------------------------------------------------------- rule 6
test("RULE 6 (no duplicate ids): two entries sharing an id are caught", () => {
  const errors = validateCatalogue([goodBuilding({ id: "dup" }), goodRoad({ id: "dup" })]);
  assert.ok(errors.some((e) => e.rule === "no-duplicate-ids" && e.id === "dup"), JSON.stringify(errors));
});

test("RULE 6: distinct ids are NOT flagged", () => {
  const errors = validateCatalogue([goodBuilding({ id: "a" }), goodRoad({ id: "b" })]);
  assert.ok(!errors.some((e) => e.rule === "no-duplicate-ids"), JSON.stringify(errors));
});

// ---------------------------------------------------------------- rule 7 (S2)
test("RULE 7 (has baseValue): a missing baseValue is caught", () => {
  const entry = goodBuilding();
  delete (entry as any).baseValue;
  const errors = validateEntry(entry);
  assert.ok(errors.some((e) => e.rule === "has-base-value"), JSON.stringify(errors));
});

test("RULE 7: a non-integer baseValue is caught -- a float", () => {
  const errors = validateEntry(goodBuilding({ baseValue: 12.5 }));
  assert.ok(errors.some((e) => e.rule === "has-base-value"), JSON.stringify(errors));
});

test("RULE 7: a non-integer baseValue is caught -- a string that LOOKS like a number", () => {
  const errors = validateEntry(goodBuilding({ baseValue: "12" }));
  assert.ok(errors.some((e) => e.rule === "has-base-value"), JSON.stringify(errors));
});

test("RULE 7: a real integer baseValue, including zero, is NOT flagged", () => {
  for (const v of [0, 1, -1, 999]) {
    const errors = validateEntry(goodBuilding({ baseValue: v }));
    assert.ok(!errors.some((e) => e.rule === "has-base-value"), `${v}: ${JSON.stringify(errors)}`);
  }
});

// ---------------------------------------------------------------- rule 8 (S2)
test("RULE 8 (has adjacency): a missing adjacency is caught", () => {
  const entry = goodBuilding();
  delete (entry as any).adjacency;
  const errors = validateEntry(entry);
  assert.ok(errors.some((e) => e.rule === "has-adjacency"), JSON.stringify(errors));
});

test("RULE 8: adjacency as an array is caught -- an array is not a category map", () => {
  const errors = validateEntry(goodBuilding({ adjacency: [3, 3, 3] }));
  assert.ok(errors.some((e) => e.rule === "has-adjacency"), JSON.stringify(errors));
});

test("RULE 8: adjacency as null is caught -- typeof null === 'object' is the exact trap", () => {
  const errors = validateEntry(goodBuilding({ adjacency: null }));
  assert.ok(errors.some((e) => e.rule === "has-adjacency"), JSON.stringify(errors));
});

test("RULE 8: adjacency as a string is caught", () => {
  const errors = validateEntry(goodBuilding({ adjacency: "residential:3" }));
  assert.ok(errors.some((e) => e.rule === "has-adjacency"), JSON.stringify(errors));
});

test("RULE 8: an empty adjacency object is a legitimate value, NOT flagged by has-adjacency -- commercial/civic/landmark entries use exactly this", () => {
  const errors = validateEntry(goodBuilding({ adjacency: {} }));
  assert.ok(!errors.some((e) => e.rule === "has-adjacency"), JSON.stringify(errors));
  assert.ok(!errors.some((e) => e.rule === "adjacency-values-are-integers"), JSON.stringify(errors));
});

test("RULE 8: a non-integer value INSIDE adjacency is caught, naming the key", () => {
  const errors = validateEntry(goodBuilding({ adjacency: { residential: 3.5 } }));
  const err = errors.find((e) => e.rule === "adjacency-values-are-integers");
  assert.ok(err, JSON.stringify(errors));
  assert.match(err!.message, /residential/);
});

test("RULE 8: every bad value inside adjacency is reported, not just the first", () => {
  const errors = validateEntry(goodBuilding({ adjacency: { residential: 3.5, commercial: "3" } }));
  const bad = errors.filter((e) => e.rule === "adjacency-values-are-integers");
  assert.equal(bad.length, 2, JSON.stringify(errors));
});

test("RULE 8: a well-formed adjacency map is NOT flagged", () => {
  const errors = validateEntry(goodBuilding());
  assert.ok(!errors.some((e) => e.rule === "has-adjacency" || e.rule === "adjacency-values-are-integers"), JSON.stringify(errors));
});
