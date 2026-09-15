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
import { AMENITY_CIVIC_TYPE_IDS, unitQualityFor, baseValueFor, storeysFor } from "../scripts/migrate-catalogue-s2-fields.mjs";
import { MESH_BINDINGS, UNMATCHED_MESHES, PROP_MESH_IDS } from "../scripts/link-catalogue-meshes.mjs";
import { PIECES } from "../public/look-proof-pieces.js";
import { createAreaBoard } from "../public/area-board.js";

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
    storeys: 5, // FIX-2: storeysFor({footprint:[2,3], massing:2 tiers, proportion:1.2}) = round(1.2*2*2)
    baseValue: 12,
    adjacency: { residential: 3, commercial: 3, industrial: 3, civic: 3, landmark: 3, road: 3 },
    unitQuality: 1,
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
    storeys: 1, // FIX-2: storeysFor's own flat 1 for road
    baseValue: 1,
    adjacency: { residential: 3, commercial: 3, industrial: 3, civic: 3, landmark: 3, road: 3 },
    unitQuality: 1,
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

// ---------------------------------------------------------------- BO7A: the join
//
// "BO7A is a JOIN, not a creation" (Mark, directly, 2026-09-15, scoping the
// item after its own brief text was found ambiguous). data/catalogue.json's
// 50 abstract entries and public/look-proof-pieces.js's 20 real L12 meshes
// are linked by scripts/link-catalogue-meshes.mjs, not by new entries and
// not by invented category/adjacency values. These tests check the REAL
// catalogue agrees with that script's own disclosed tables -- a mesh bound
// to the wrong entry, or a binding silently dropped, would be exactly the
// "ticked with none of what it claimed" drift this project's gate ledger
// exists to catch.

test("GATE (BO7A): the real catalogue's own glb fields exactly match link-catalogue-meshes.mjs's disclosed MESH_BINDINGS table -- no drift, nothing silently dropped or added", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const glbByMeshId = new Map(PIECES.map((p: any) => [p.id, p.glb]));
  for (const [meshId, catalogueId] of Object.entries(MESH_BINDINGS)) {
    const entry = catalogue.find((e: any) => e.id === catalogueId);
    assert.ok(entry, `MESH_BINDINGS names catalogue id "${catalogueId}" (for mesh "${meshId}"), which does not exist in the real catalogue`);
    assert.equal(entry.glb, glbByMeshId.get(meshId), `${catalogueId}.glb does not match the real path for mesh "${meshId}"`);
  }
  const boundIds = new Set(Object.values(MESH_BINDINGS));
  for (const entry of catalogue) {
    if (!boundIds.has(entry.id)) {
      assert.equal(entry.glb, null, `${entry.id}.glb is set but is not named in MESH_BINDINGS -- either the table is stale or this was hand-edited outside the script`);
    }
  }
});

test("GATE (BO7A): every real L12 mesh is accounted for exactly once -- bound, a disclosed finding, or a disclosed prop, never silently unclassified", () => {
  const bound = new Set(Object.keys(MESH_BINDINGS));
  const unmatched = new Set(UNMATCHED_MESHES);
  const props = new Set(PROP_MESH_IDS);
  for (const piece of PIECES as any[]) {
    const memberships = [bound.has(piece.id), unmatched.has(piece.id), props.has(piece.id)].filter(Boolean).length;
    assert.equal(memberships, 1, `"${piece.id}" is in ${memberships} of {MESH_BINDINGS, UNMATCHED_MESHES, PROP_MESH_IDS} -- must be in exactly one`);
  }
  assert.equal(bound.size + unmatched.size + props.size, (PIECES as any[]).length, "the three tables' combined size does not match PIECES's own length -- something is double-counted or missing");
});

test("GATE (BO7A), named directly per Mark's own scoping: a prop's own typeId (dumpster-1x1, an L12 mesh id) cannot be placed as a catalogue piece -- refused via the ordinary unknown-type path, not a special case", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  const catalogueById = Object.fromEntries(catalogue.map((e: any) => [e.id, e]));
  const board = createAreaBoard({ width: 8, height: 8, catalogue: catalogueById });
  for (const propId of PROP_MESH_IDS) {
    assert.ok(!(propId in catalogueById), `"${propId}" must not be a real catalogue entry -- props are deliberately excluded`);
    const verdict = board.evaluatePlacement(propId, { x: 0, y: 0 }, 0);
    assert.equal(verdict.ok, false, `placing prop "${propId}" as a piece must be refused`);
    assert.equal(verdict.reason, "unknown-type", `"${propId}" must refuse for reason "unknown-type", got "${verdict.reason}"`);
  }
});

test("BO7A: scripts/link-catalogue-meshes.mjs is idempotent -- running it again against the real, already-linked catalogue produces byte-identical output", () => {
  const before = readFileSync(join(ROOT, "data", "catalogue.json"), "utf8");
  const catalogue = JSON.parse(before);
  const glbByMeshId = new Map(PIECES.map((p: any) => [p.id, p.glb]));
  const glbByCatalogueId = new Map<string, string>();
  for (const [meshId, catalogueId] of Object.entries(MESH_BINDINGS)) {
    glbByCatalogueId.set(catalogueId, glbByMeshId.get(meshId) as string);
  }
  const relinked = catalogue.map((entry: any) => ({ ...entry, glb: glbByCatalogueId.get(entry.id) || null }));
  const after = JSON.stringify(relinked, null, 2) + "\n";
  assert.equal(after, before, "re-running the same linking logic against the real catalogue produced a different result -- the file on disk has drifted from the script");
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

// ---------------------------------------------------------------- rule 9 (S4)
test("RULE 9 (has unitQuality): a missing unitQuality is caught", () => {
  const entry = goodBuilding();
  delete (entry as any).unitQuality;
  const errors = validateEntry(entry);
  assert.ok(errors.some((e) => e.rule === "has-unit-quality"), JSON.stringify(errors));
});

test("RULE 9: a non-finite unitQuality is caught -- NaN", () => {
  const errors = validateEntry(goodBuilding({ unitQuality: NaN }));
  assert.ok(errors.some((e) => e.rule === "has-unit-quality"), JSON.stringify(errors));
});

test("RULE 9: a non-finite unitQuality is caught -- Infinity", () => {
  const errors = validateEntry(goodBuilding({ unitQuality: Infinity }));
  assert.ok(errors.some((e) => e.rule === "has-unit-quality"), JSON.stringify(errors));
});

test("RULE 9: a zero or negative unitQuality is caught -- the formula's own range never reaches or crosses zero", () => {
  for (const v of [0, -1, -0.5]) {
    const errors = validateEntry(goodBuilding({ unitQuality: v }));
    assert.ok(errors.some((e) => e.rule === "has-unit-quality"), `${v}: ${JSON.stringify(errors)}`);
  }
});

test("RULE 9: a unitQuality above 1 is caught -- the real formula, 1/sqrt(tiers), never exceeds 1 for tiers >= 1", () => {
  const errors = validateEntry(goodBuilding({ unitQuality: 50 }));
  assert.ok(errors.some((e) => e.rule === "has-unit-quality"), JSON.stringify(errors));
});

test("RULE 9: a real unitQuality in (0, 1], including exactly 1, is NOT flagged", () => {
  for (const v of [1, 0.7071067811865475, 0.0001]) {
    const errors = validateEntry(goodBuilding({ unitQuality: v }));
    assert.ok(!errors.some((e) => e.rule === "has-unit-quality"), `${v}: ${JSON.stringify(errors)}`);
  }
});

test("every real catalogue entry's unitQuality matches unitQualityFor() recomputed from its own fields -- the migration's own idempotence, not just the validator's range check", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  for (const entry of catalogue) {
    const expected = unitQualityFor(entry);
    assert.equal(entry.unitQuality, expected, `${entry.id}: stored ${entry.unitQuality}, recomputed ${expected}`);
  }
});

test("unitQualityFor is exactly 1/sqrt(storeysFor(entry)) -- DECISIONS-FOR-MARK.md #14's disclosed curve, checked against LITERAL numbers so a mutated formula (e.g. 1/tiers, or storeysFor ignoring proportion) cannot pass by calling the function under test to build its own expectation", () => {
  // proportion 1 (default, absent), footprint width 1, 1 tier -- storeys = 1.
  assert.equal(unitQualityFor({ category: "residential", footprint: [1, 1], massing: ["a"] }), 1);
  // proportion 1, width 2, 2 tiers -- storeys = round(1*2*2) = 4.
  assert.equal(unitQualityFor({ category: "residential", footprint: [2, 2], massing: ["a", "b"] }), 0.5);
  // proportion 1.8, width 4, 3 tiers -- storeys = round(1.8*4*3) = 22 (apartment-block-a's real shape).
  assert.equal(unitQualityFor({ category: "residential", footprint: [4, 4], massing: ["a", "b", "c"], proportion: 1.8 }), 1 / Math.sqrt(22));
  assert.equal(unitQualityFor({ category: "road", footprint: [4, 4], massing: ["a", "b", "c"] }), 1);
});

test("storeysFor is a real-proportions-derived scale, not massing.length -- FIX-2, PLAN.md §3.2. Checked against LITERAL numbers, including the exact case the checklist names: two to four massing entries is not a storey count", () => {
  // A 3-tier massing entry does NOT mean 3 storeys once a real proportion is present.
  assert.equal(storeysFor({ category: "residential", footprint: [4, 4], massing: ["a", "b", "c"], proportion: 1.8 }), 22);
  // Absent proportion (an authored piece, or an entry the shipped catalogue marks null) defaults to a square massing (1), not a crash.
  assert.equal(storeysFor({ category: "industrial", footprint: [8, 8], massing: ["a"], proportion: null }), 8);
  // Two entries can share every field except proportion and land far apart -- this is the defect FIX-2 exists to fix: massing.length alone (3, for both) could not tell them apart.
  const sharedShapeSmall = storeysFor({ category: "landmark", footprint: [6, 6], massing: ["a", "b", "c"], proportion: 1.3 });
  const sharedShapeTower = storeysFor({ category: "landmark", footprint: [8, 8], massing: ["a", "b", "c"], proportion: 3.5 });
  assert.equal(sharedShapeSmall, 23);
  assert.equal(sharedShapeTower, 84);
  assert.ok(sharedShapeTower / sharedShapeSmall > 3, `real proportions must produce a real scale gap, got ${sharedShapeTower} vs ${sharedShapeSmall}`);
  // road is a flat 1, same convention baseValue/unitQuality already use.
  assert.equal(storeysFor({ category: "road", footprint: [4, 4], massing: [] }), 1);
  // Never zero, even for a degenerate near-zero product -- baseValue/unitQuality both divide or multiply by this.
  assert.equal(storeysFor({ category: "residential", footprint: [1, 1], massing: ["a"], proportion: 0.1 }), 1);
});

test("baseValueFor is footprint area x storeysFor(entry), not footprint area x massing.length", () => {
  // apartment-block-a's real shape: footprint 4x4=16, proportion 1.8, 3 tiers -- storeys=22, baseValue=16*22=352.
  assert.equal(baseValueFor({ category: "residential", footprint: [4, 4], massing: ["a", "b", "c"], proportion: 1.8 }), 352);
  assert.equal(baseValueFor({ category: "road", footprint: [4, 4], massing: [] }), 1);
});

// ---------------------------------------------------------------- rule 12 (FIX-2)
test("RULE 12 (has storeys): a missing storeys is caught", () => {
  const entry = goodBuilding();
  delete (entry as any).storeys;
  const errors = validateEntry(entry);
  assert.ok(errors.some((e) => e.rule === "has-storeys"), JSON.stringify(errors));
});

test("RULE 12: a non-integer storeys is caught", () => {
  const errors = validateEntry(goodBuilding({ storeys: 4.5 }));
  assert.ok(errors.some((e) => e.rule === "has-storeys"), JSON.stringify(errors));
});

test("RULE 12: a zero or negative storeys is caught -- storeysFor's own floor is 1, never 0 or below", () => {
  for (const v of [0, -1, -5]) {
    const errors = validateEntry(goodBuilding({ storeys: v }));
    assert.ok(errors.some((e) => e.rule === "has-storeys"), `${v}: ${JSON.stringify(errors)}`);
  }
});

test("RULE 12: a real positive integer storeys, including exactly 1, is NOT flagged", () => {
  for (const v of [1, 5, 100]) {
    const errors = validateEntry(goodBuilding({ storeys: v }));
    assert.ok(!errors.some((e) => e.rule === "has-storeys"), `${v}: ${JSON.stringify(errors)}`);
  }
});

test("RULE 12 applies to road entries too -- no exemption, same as rule 7's baseValue", () => {
  const entry = goodRoad();
  delete (entry as any).storeys;
  const errors = validateEntry(entry);
  assert.ok(errors.some((e) => e.rule === "has-storeys"), JSON.stringify(errors));
});

test("every real catalogue entry's storeys matches storeysFor() recomputed from its own fields, and every real catalogue entry's baseValue matches baseValueFor()", () => {
  const catalogue = JSON.parse(readFileSync(join(ROOT, "data", "catalogue.json"), "utf8"));
  for (const entry of catalogue) {
    assert.equal(entry.storeys, storeysFor(entry), `${entry.id}: stored storeys ${entry.storeys}`);
    assert.equal(entry.baseValue, baseValueFor(entry), `${entry.id}: stored baseValue ${entry.baseValue}`);
  }
});

// ---------------------------------------------------------------- rule 10 (U4)
test("RULE 10 (provenance all-or-nothing): zero provenance fields is NOT flagged -- every shipped entry has zero, and that must stay legal", () => {
  const errors = validateEntry(goodBuilding());
  assert.ok(!errors.some((e) => e.rule === "provenance-all-or-nothing"), JSON.stringify(errors));
});

test("RULE 10: all four provenance fields present is NOT flagged", () => {
  const errors = validateEntry(goodBuilding({ author: "p", verifiedBy: "v", createdAt: "c", sourceRef: "s" }));
  assert.ok(!errors.some((e) => e.rule === "provenance-all-or-nothing"), JSON.stringify(errors));
});

test("RULE 10: exactly one provenance field present is caught, naming what is missing", () => {
  const errors = validateEntry(goodBuilding({ author: "p" }));
  const err = errors.find((e) => e.rule === "provenance-all-or-nothing");
  assert.ok(err, JSON.stringify(errors));
  assert.match(err!.message, /verifiedBy/);
  assert.match(err!.message, /createdAt/);
  assert.match(err!.message, /sourceRef/);
});

test("RULE 10: three of four provenance fields present is caught, naming the one missing", () => {
  const errors = validateEntry(goodBuilding({ author: "p", verifiedBy: "v", createdAt: "c" }));
  const err = errors.find((e) => e.rule === "provenance-all-or-nothing");
  assert.ok(err, JSON.stringify(errors));
  assert.match(err!.message, /sourceRef/);
  assert.doesNotMatch(err!.message, /author\/verifiedBy\/createdAt\/sourceRef/);
});

// ------------------------------------------------------------ rule 11 (BO7A)
test("RULE 11 (glb): absent entirely is NOT flagged -- most of the 50 entries have no matching L12 mesh yet, and that is expected", () => {
  const entry = goodBuilding();
  delete (entry as any).glb;
  const errors = validateEntry(entry);
  assert.ok(!errors.some((e) => e.rule === "glb-is-string-or-null"), JSON.stringify(errors));
});

test("RULE 11: null is NOT flagged -- the explicit 'no mesh yet' value scripts/link-catalogue-meshes.mjs writes", () => {
  const errors = validateEntry(goodBuilding({ glb: null }));
  assert.ok(!errors.some((e) => e.rule === "glb-is-string-or-null"), JSON.stringify(errors));
});

test("RULE 11: an empty string is caught", () => {
  const errors = validateEntry(goodBuilding({ glb: "" }));
  assert.ok(errors.some((e) => e.rule === "glb-is-string-or-null"), JSON.stringify(errors));
});

test("RULE 11: a non-string, non-null value is caught", () => {
  const errors = validateEntry(goodBuilding({ glb: 42 }));
  assert.ok(errors.some((e) => e.rule === "glb-is-string-or-null"), JSON.stringify(errors));
});

test("RULE 11: a real path string is NOT flagged", () => {
  const errors = validateEntry(goodBuilding({ glb: "vendor/kits/kenney-modular-buildings/building-sample-house-b.glb" }));
  assert.ok(!errors.some((e) => e.rule === "glb-is-string-or-null"), JSON.stringify(errors));
});
