// =============================================================================
// U4 (CLI) -- REBUILD-PLAN.md B1-B4, "the mechanic that makes CALIPER itself
// rather than a city builder." Data and logic only, per the brief -- no
// interface, no real generation pipeline (that is A11's own, already-documented
// loop), no persistence backend, no sharing/marketplace/moderation (B4).
//
// B1: "A player-authored piece is a catalogue entry. Full stop... The board
// cannot tell the difference between a shipped piece and an authored one,
// and must not be able to."
// B2: "The catalogue is a registry with a persisted overlay, not a static
// asset."
// B3: "a piece whose typeId is player-authored contributes a uniqueness
// multiplier to baseValue."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard } from "../public/area-board.js";
import { valueAt, perUnitWorth, totalWorth } from "../public/scoring.js";
import { createCatalogueRegistry, UNIQUENESS_MULTIPLIER } from "../public/catalogue-registry.js";

const BASE_CATALOGUE = {
  "house-a": { id: "house-a", category: "residential", footprint: [1, 1], rotatable: true, terrainMask: ["land"], pivot: "corner", massing: ["base"], baseValue: 1, adjacency: { residential: -2, commercial: 2 }, unitQuality: 1 },
  "shop-a": { id: "shop-a", category: "commercial", footprint: [1, 1], rotatable: true, terrainMask: ["land"], pivot: "corner", massing: ["base"], baseValue: 1, adjacency: { residential: 5 }, unitQuality: 1 },
};

function goodAuthoredFields(overrides = {}) {
  return {
    id: "authored-house-a",
    footprint: [1, 1],
    category: "residential",
    rotatable: true,
    terrainMask: ["land"],
    massing: ["base"],
    author: "player-42",
    verifiedBy: "build-pipeline-v1",
    createdAt: "2026-09-15T00:00:00Z",
    sourceRef: "req-abc123",
    ...overrides,
  };
}

// ---------------------------------------------------------------- get / all

test(".get and .all compose the base catalogue with an empty overlay -- a fresh registry changes nothing observable", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  assert.deepEqual(registry.get("house-a"), BASE_CATALOGUE["house-a"]);
  assert.equal(registry.get("no-such-id"), undefined);
  assert.deepEqual(registry.all(), BASE_CATALOGUE);
});

test("createCatalogueRegistry returns a FRESH registry each call -- authoring on one instance does not leak into another", () => {
  const a = createCatalogueRegistry(BASE_CATALOGUE);
  a.addAuthoredEntry(goodAuthoredFields());
  const b = createCatalogueRegistry(BASE_CATALOGUE);
  assert.equal(b.get("authored-house-a"), undefined);
  assert.equal(Object.keys(b.all()).length, Object.keys(BASE_CATALOGUE).length);
});

// ---------------------------------------------------------------- addAuthoredEntry: success path

test("GATE (U4/B3): a successfully authored entry's baseValue carries the uniqueness multiplier; unitQuality does NOT", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  // Real formula (FIX-2, PLAN.md §3.2): footprint area (1) x storeysFor(entry).
  // No proportion is collected for an authored piece, so storeysFor defaults
  // to a square massing (proportion 1); with 1 tier and width 1 that is
  // storeys=1, giving baseValue = 1 x 1 = 1, x the multiplier.
  assert.equal(result.entry.baseValue, 1 * UNIQUENESS_MULTIPLIER);
  // unitQuality for a 1-tier residential entry is 1/sqrt(1) = 1, UNCHANGED
  // by the multiplier -- B3 says baseValue only.
  assert.equal(result.entry.unitQuality, 1);
});

test("GATE (U4/B1): an authored entry is retrievable via .get and appears in .all, alongside its own provenance fields", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  registry.addAuthoredEntry(goodAuthoredFields());
  const entry = registry.get("authored-house-a");
  assert.ok(entry);
  assert.equal(entry.author, "player-42");
  assert.equal(entry.verifiedBy, "build-pipeline-v1");
  assert.equal(entry.sourceRef, "req-abc123");
  assert.equal(registry.all()["authored-house-a"], entry);
});

// ---------------------------------------------------------------- refusals

test("GATE (U4/B1): a collision against the SHIPPED catalogue is refused -- a player cannot override an existing piece", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields({ id: "house-a" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "no-collision"));
  assert.equal(registry.get("house-a"), BASE_CATALOGUE["house-a"], "the shipped entry must be completely unchanged");
});

test("GATE (U4/B1): a collision against ANOTHER already-authored entry is also refused", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const first = registry.addAuthoredEntry(goodAuthoredFields());
  assert.equal(first.ok, true);
  const second = registry.addAuthoredEntry(goodAuthoredFields({ author: "player-99" }));
  assert.equal(second.ok, false);
  assert.ok(second.errors.some((e) => e.rule === "no-collision"));
});

test("GATE (U4): a category the validator does not recognise is refused cleanly, not thrown -- adjacencyFor() throws by design on an unknown category, so this must be checked BEFORE composing it", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  assert.doesNotThrow(() => {
    const result = registry.addAuthoredEntry(goodAuthoredFields({ category: "park" }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.rule === "known-category"), JSON.stringify(result.errors));
  });
});

test("GATE (U4/B1): a schema-invalid entry (bad footprint) is refused, reusing the shared validator rather than reimplementing its checks", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields({ footprint: [5, 5] })); // not one of C1.1's eight
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "catalogue-footprint-set"), JSON.stringify(result.errors));
  assert.equal(registry.get("authored-house-a"), undefined, "a refused entry must not be partially added");
});

test("GATE (U4/B1): an entry with ZERO provenance fields is refused -- rule 10 alone (all-or-nothing) legally accepts this, since every SHIPPED entry has zero; addAuthoredEntry has its own, stricter check that an authored entry must actually BE authored", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields({ author: undefined, verifiedBy: undefined, createdAt: undefined, sourceRef: undefined }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "authored-entry-requires-provenance"), JSON.stringify(result.errors));
});

test("GATE (U4/B1): an entry with PARTIAL provenance (some fields present, some missing) is refused, naming which field", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields({ sourceRef: undefined }));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.rule === "authored-entry-requires-provenance");
  assert.ok(err, JSON.stringify(result.errors));
  assert.match(err.message, /sourceRef/);
});

test("an empty-string provenance field is refused, not treated as present", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields({ author: "   " }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "authored-entry-requires-provenance"));
});

// ---------------------------------------------------------------- "the board cannot tell the difference"

test("GATE (U4/B1): a board built BEFORE authoring does not see the new piece -- .all() is a snapshot, not a live view; a caller must re-fetch it, and this is a real, disclosed requirement, not silently assumed away", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const staleBoard = createAreaBoard({ width: 10, height: 10, catalogue: registry.all() });
  registry.addAuthoredEntry(goodAuthoredFields());
  const placed = staleBoard.place("authored-house-a", { x: 0, y: 0 }, 0, { id: 1 });
  assert.equal(placed.ok, false);
  assert.equal(placed.reason, "unknown-type");
});

test("GATE (U4/B1): a board built AFTER authoring (a fresh .all() snapshot) places and scores the authored piece through the EXACT SAME functions as a shipped piece -- no special-casing anywhere", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  registry.addAuthoredEntry(goodAuthoredFields());
  const catalogue = registry.all();
  const board = createAreaBoard({ width: 10, height: 10, catalogue });

  board.place("shop-a", { x: 1, y: 0 }, 0, { id: 1 }); // an amenity, so value() reads something nonzero
  const placed = board.place("authored-house-a", { x: 0, y: 0 }, 0, { id: 2 });
  assert.equal(placed.ok, true, JSON.stringify(placed));

  // Same functions, same call shape as every shipped piece this whole
  // session's own tests use -- valueAt/perUnitWorth/totalWorth never
  // branch on where a typeId came from.
  const v = valueAt(board, catalogue, 0, 0);
  const entry = catalogue["authored-house-a"];
  const worth = totalWorth(perUnitWorth(v, entry.unitQuality), entry.baseValue);
  assert.ok(Number.isFinite(worth));
  assert.equal(entry.baseValue, 1 * UNIQUENESS_MULTIPLIER);
});

test("GATE (U4/B3): an authored piece's totalWorth is measurably higher than an otherwise-identical shipped piece, purely from the uniqueness multiplier on baseValue -- the multiplier is real, not decorative", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  registry.addAuthoredEntry(goodAuthoredFields());
  const catalogue = registry.all();
  const board = createAreaBoard({ width: 10, height: 10, catalogue });
  board.place("shop-a", { x: 5, y: 0 }, 0, { id: 1 });
  board.place("house-a", { x: 0, y: 0 }, 0, { id: 2 }); // shipped, same shape as the authored one
  board.place("authored-house-a", { x: 9, y: 9 }, 0, { id: 3 }); // far away, same distance to the shop by construction below

  // Use valueIfPlaced-equivalent reasoning via direct valueAt at IDENTICAL
  // distance from the shop, so the only difference between the two
  // pieces' totalWorth is baseValue itself, not location.
  const shopAdjacent = createAreaBoard({ width: 10, height: 10, catalogue });
  shopAdjacent.place("shop-a", { x: 1, y: 0 }, 0, { id: 1 });
  shopAdjacent.place("house-a", { x: 0, y: 0 }, 0, { id: 2 });
  const shippedWorth = totalWorth(perUnitWorth(valueAt(shopAdjacent, catalogue, 0, 0), catalogue["house-a"].unitQuality), catalogue["house-a"].baseValue);

  const shopAdjacent2 = createAreaBoard({ width: 10, height: 10, catalogue });
  shopAdjacent2.place("shop-a", { x: 1, y: 0 }, 0, { id: 1 });
  shopAdjacent2.place("authored-house-a", { x: 0, y: 0 }, 0, { id: 2 });
  const authoredWorth = totalWorth(perUnitWorth(valueAt(shopAdjacent2, catalogue, 0, 0), catalogue["authored-house-a"].unitQuality), catalogue["authored-house-a"].baseValue);

  assert.equal(authoredWorth, shippedWorth * UNIQUENESS_MULTIPLIER);
});

test("the multiplier applied is recorded on the entry itself -- a disclosed trail, since baking the multiplier into a stored baseValue (unlike the shipped catalogue's own re-derivable baseValueFor) has no re-tuning path today", () => {
  const registry = createCatalogueRegistry(BASE_CATALOGUE);
  const result = registry.addAuthoredEntry(goodAuthoredFields());
  assert.equal(result.entry.uniquenessMultiplierApplied, UNIQUENESS_MULTIPLIER);
});
