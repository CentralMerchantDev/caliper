// THE SPEC IS FROZEN; THE WORLD IS ITS OWN COPY.
//
// DISTRICTS, SETTLEMENTS, BRIDGES and GRID were module constants: one array,
// shared by every call to generateWorld() in the process. Two problems follow
// from that, and this closes both.
//
// 1. Nothing stopped a caller writing through the spec itself -- district.bias
//    reassigned, a district pushed, a settlement's bounds edited in place --
//    which would move EVERY world built afterwards, not just the one the
//    caller thought they were touching.
// 2. generateWorld's own returned copy was shallow: `districts:
//    DISTRICTS.map((d) => ({ ...d }))` copies the top-level fields but each
//    copy's `bounds` property is still the SAME nested object DISTRICTS[i]
//    itself points to. Mutating world A's `districts[0].bounds.xMin` silently
//    mutated the spec AND every other world's copy of that same district --
//    the exact defect ledger 3.4 already fixed once for generateWorld's
//    return, one level higher up, still open in the source tables underneath.

import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld, DISTRICTS, SETTLEMENTS, BRIDGES, GRID } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));

test("DISTRICTS cannot be written through", () => {
  assert.throws(() => { (DISTRICTS[0] as any).bias = 999; }, "a top-level field was writable");
  assert.throws(() => { (DISTRICTS[0].bounds as any).xMin = 999; }, "a nested bounds field was writable");
  assert.throws(() => { (DISTRICTS as any).push({ id: "smuggled" }); }, "a new district could be pushed onto the spec");
});

test("SETTLEMENTS cannot be written through", () => {
  assert.throws(() => { (SETTLEMENTS[0] as any).cls = "TOWER"; }, "a top-level field was writable");
  assert.throws(() => { (SETTLEMENTS[0].bounds as any).xMin = 999; }, "a nested bounds field was writable");
  const withExclude = SETTLEMENTS.find((s: any) => s.exclude);
  assert.ok(withExclude, "no fixture settlement has an exclude rectangle to test");
  assert.throws(() => { (withExclude!.exclude as any).xMin = 999; }, "a nested exclude field was writable");
});

test("BRIDGES cannot be written through", () => {
  assert.throws(() => { (BRIDGES[0] as any).type = "cable"; }, "a top-level field was writable");
  assert.throws(() => { (BRIDGES as any).push({ id: "smuggled" }); }, "a new bridge could be pushed onto the spec");
});

test("GRID cannot be written through", () => {
  assert.throws(() => { (GRID as any).AVENUE_SPACING = 1; }, "AVENUE_SPACING was writable");
  assert.throws(() => { (GRID as any).BLOCK_MAX = 1; }, "BLOCK_MAX was writable");
  // the pure parts still work after freezing -- freezing must not have broken
  // the getters or the method, only made them impossible to overwrite
  assert.equal(typeof GRID.ORIGIN_X, "number");
  assert.ok(Array.isArray(GRID.edges(0, 500, 230, 1, 1)));
});

test("mutating one world's district bounds does not reach another world's, or the spec", () => {
  const specXMin = DISTRICTS[0].bounds.xMin;
  const worldA = generateWorld(heightAt);
  const worldB = generateWorld(heightAt);
  assert.notEqual(
    worldA.districts,
    worldB.districts,
    "two worlds share the very same districts array, not two copies of it",
  );
  (worldA.districts[0].bounds as any).xMin = specXMin + 5000;
  assert.equal(
    worldB.districts[0].bounds.xMin,
    specXMin,
    "mutating world A's district bounds moved world B's district too",
  );
  assert.equal(
    DISTRICTS[0].bounds.xMin,
    specXMin,
    "mutating a world's district bounds reached back into the frozen spec",
  );
});
