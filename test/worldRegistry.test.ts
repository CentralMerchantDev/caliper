// =============================================================================
// WHAT IS AT ANY POINT, AT ANY TIME
//
// world-registry.js is the single source of truth city-plan.js and features.js
// are supposed to share instead of each keeping a private belief about where
// things are -- the defect that put houses inside the stadium. These tests
// check the registry in isolation, with no terrain and no plan, because the
// claim it makes ("one occupant per point, at any time") has to hold on its
// own before anything is allowed to depend on it.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createWorldRegistry } from "../public/world-registry.js";

test("an unclaimed point is free", () => {
  const reg = createWorldRegistry();
  const a = reg.whatIsAt(0, 0, 0, 0);
  assert.equal(a.kind, "free");
  assert.equal(a.solid, false);
});

test("a reserved footprint is returned for a point inside it, at ground level", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "stadium", xMin: -160, xMax: 160, zMin: -125, zMax: 125 });
  const inside = reg.whatIsAt(0, 0, 0, 0);
  assert.equal(inside.kind, "feature");
  assert.equal(inside.id, "stadium");
  assert.equal(inside.solid, true);
});

test("a point outside the footprint is free even though something else is reserved", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "stadium", xMin: -160, xMax: 160, zMin: -125, zMax: 125 });
  const outside = reg.whatIsAt(1000, 0, 1000, 0);
  assert.equal(outside.kind, "free");
});

test("the footprint edges are inclusive -- a point ON the boundary is inside", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "stadium", xMin: -160, xMax: 160, zMin: -125, zMax: 125 });
  assert.equal(reg.whatIsAt(160, 0, 125, 0).kind, "feature");
  assert.equal(reg.whatIsAt(160.1, 0, 125, 0).kind, "free");
});

test("below the terrain surface is rock, and rock is solid", () => {
  const heightAt = (x: number, z: number) => 50; // a flat 50 m plateau everywhere
  const reg = createWorldRegistry(heightAt);
  const underground = reg.whatIsAt(0, 10, 0, 0);   // y = 10, ground at y = 50
  assert.equal(underground.kind, "rock");
  assert.equal(underground.solid, true);
  const aboveGround = reg.whatIsAt(0, 60, 0, 0);   // y = 60, above the 50 m surface
  assert.equal(aboveGround.kind, "free");
});

test("rock and a reservation are the same kind of refusal for anything trying to build", () => {
  // This is the point of the file: "cannot build inside a hill" and "cannot
  // build inside a stadium" must be the SAME check, not two special cases.
  // Query the stadium point well above the terrain, so only the reservation
  // is in play there, and a separate unreserved point below the terrain, so
  // only rock is in play there -- both must refuse with solid === true.
  const heightAt = (x: number, z: number) => 50;
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "feature", id: "stadium", xMin: -160, xMax: 160, zMin: -125, zMax: 125 });
  const inHill = reg.whatIsAt(5000, 10, 5000, 0);      // no reservation here, below the 50 m surface
  const inStadium = reg.whatIsAt(0, 100, 0, 0);        // above the surface, inside the footprint
  assert.equal(inHill.solid, true);
  assert.equal(inStadium.solid, true);
  assert.equal(inHill.kind, "rock");
  assert.equal(inStadium.kind, "feature");
});

test("a reservation only exists within its since/until window", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "temp", xMin: -10, xMax: 10, zMin: -10, zMax: 10, since: 5, until: 10 });
  assert.equal(reg.whatIsAt(0, 0, 0, 0).kind, "free", "not yet built at t=0");
  assert.equal(reg.whatIsAt(0, 0, 0, 5).kind, "feature", "exists at t=since");
  assert.equal(reg.whatIsAt(0, 0, 0, 9).kind, "feature", "still exists just before until");
  assert.equal(reg.whatIsAt(0, 0, 0, 10).kind, "free", "gone at t=until (exclusive)");
});

test("overlapsReserved refuses a rectangle that touches a reservation, even without full containment", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "stadium", xMin: -160, xMax: 160, zMin: -125, zMax: 125 });
  const hit = reg.overlapsReserved(100, 300, 100, 300, 0);   // corner overlap only
  assert.ok(hit, "a block whose corner clips the footprint must still be refused");
  assert.equal(hit.id, "stadium");
  assert.equal(reg.overlapsReserved(1000, 1100, 1000, 1100, 0), null);
});

test("findFree returns the requested point when it is already clear", () => {
  const reg = createWorldRegistry();
  const site = reg.findFree(50, 50, { x: 0, z: 0 });
  assert.deepEqual(site, { x: 0, z: 0, moved: 0 });
});

test("findFree steps outward and around a reservation to find real free ground", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "stadium", xMin: -160, xMax: 160, zMin: -125, zMax: 125 });
  const site = reg.findFree(50, 50, { x: 0, z: 0 }, { radius: 500, step: 20 });
  assert.ok(site, "there is free ground within radius");
  assert.ok(reg.overlapsReserved(site.x - 25, site.x + 25, site.z - 25, site.z + 25, 0) === null,
    "the returned site must not actually overlap the reservation");
});

test("findFree returns null when nothing fits within the search radius", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "everything", xMin: -100000, xMax: 100000, zMin: -100000, zMax: 100000 });
  assert.equal(reg.findFree(10, 10, { x: 0, z: 0 }, { radius: 200, step: 40 }), null);
});

test("reserve() rejects an inverted footprint rather than silently storing a zero-area claim", () => {
  const reg = createWorldRegistry();
  assert.throws(() => reg.reserve({ kind: "feature", id: "bad", xMin: 100, xMax: -100, zMin: 0, zMax: 0 }));
});

test("release() removes a reservation by id", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "temp", xMin: -10, xMax: 10, zMin: -10, zMax: 10 });
  assert.equal(reg.whatIsAt(0, 0, 0, 0).kind, "feature");
  reg.release("temp");
  assert.equal(reg.whatIsAt(0, 0, 0, 0).kind, "free");
});

test("list() returns a copy -- mutating it cannot corrupt the registry", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "temp", xMin: -10, xMax: 10, zMin: -10, zMax: 10 });
  const snapshot = reg.list();
  snapshot.length = 0;
  snapshot.push({ kind: "sabotage" } as any);
  assert.equal(reg.list().length, 1);
  assert.equal(reg.whatIsAt(0, 0, 0, 0).kind, "feature");
});
