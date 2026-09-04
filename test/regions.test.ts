// A WORLD IS BIGGER THAN THE PART YOU ARE IN, AND REGIONS LOAD AND UNLOAD.
//
// grid.js already models open/LOCKED regions and refuses with a reason
// rather than reporting emptiness -- an absence nobody can see and a real
// refusal must never look alike. This wires that grid to a world instance
// (F1) and adds the missing half: a region can be closed again, not just
// opened (F2) -- "load and unload", not just "load".

import { test } from "node:test";
import assert from "node:assert/strict";

import { createWorld } from "../public/world.js";
import { createGrid } from "../public/grid.js";

test("F1: a world's grid defaults to whole-world-open, exactly like createGrid()'s own default", () => {
  const world = createWorld({ seed: "x" });
  const bare = createGrid();
  assert.deepEqual(world.grid.check(1000, 1000), bare.check(1000, 1000));
  assert.deepEqual(world.grid.regions(), bare.regions());
});

test("F1: a world built with explicit regions is genuinely locked outside them", () => {
  const world = createWorld({ seed: "x", regions: [{ xMin: 0, xMax: 1000, zMin: 0, zMax: 1000, name: "downtown" }] });
  assert.equal(world.grid.check(500, 500).ok, true);
  const outside = world.grid.check(5000, 5000);
  assert.equal(outside.ok, false);
  assert.equal(outside.reason, "locked");
});

test("F2: a region that was never opened refuses placement, with a reason -- not a bare failure", () => {
  const grid = createGrid({ openRegions: [] });
  const result = grid.check(500, 500);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "locked");
  assert.ok(result.detail, "a locked region refused with no detail to act on");
});

test("F2: the same region, loaded, no longer refuses", () => {
  const grid = createGrid({ openRegions: [] });
  assert.equal(grid.check(500, 500).ok, false);
  grid.openRegion({ xMin: 0, xMax: 1000, zMin: 0, zMax: 1000, name: "downtown" });
  const result = grid.check(500, 500);
  assert.equal(result.ok, true);
  assert.equal(result.region.name, "downtown");
});

test("F2: the same region, loaded then unloaded, refuses again -- close genuinely reverses open", () => {
  const grid = createGrid({ openRegions: [] });
  grid.openRegion({ xMin: 0, xMax: 1000, zMin: 0, zMax: 1000, name: "downtown" });
  assert.equal(grid.check(500, 500).ok, true, "setup: the region did not open");
  grid.closeRegion("downtown");
  const result = grid.check(500, 500);
  assert.equal(result.ok, false, "an unloaded region still allows placement");
  assert.equal(result.reason, "locked");
});

test("F2: closing an unknown region name is refused, not a silent no-op", () => {
  const grid = createGrid({ openRegions: [{ xMin: 0, xMax: 1000, zMin: 0, zMax: 1000, name: "downtown" }] });
  const result = grid.closeRegion("no-such-region");
  assert.equal(result.ok, false);
  assert.equal(grid.regions().length, 1, "closing an unknown region changed the region list anyway");
});
