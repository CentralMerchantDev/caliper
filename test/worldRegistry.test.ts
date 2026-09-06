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

test("open water is its own kind, solid, wherever the column is underwater", () => {
  const heightAt = (x: number, z: number) => (x < 0 ? -20 : 50);   // sea to the west, land to the east
  const reg = createWorldRegistry(heightAt);
  const inTheSea = reg.whatIsAt(-100, -5, 0, 0);       // above the seabed (-20), below sea level (0)
  assert.equal(inTheSea.kind, "water");
  assert.equal(inTheSea.solid, true);
  const onTheSeabed = reg.whatIsAt(-100, -25, 0, 0);   // below the seabed -- rock, not water
  assert.equal(onTheSeabed.kind, "rock");
  const aboveTheSea = reg.whatIsAt(-100, 5, 0, 0);     // above sea level -- open air over water
  assert.equal(aboveTheSea.kind, "free");
  const onDryLand = reg.whatIsAt(100, 60, 0, 0);       // dry column (surface 50): open air above it, never water
  assert.equal(onDryLand.kind, "free");
});

test("a bridge (or anything else) can reserve a volume above open water -- water does not shadow a reservation", () => {
  const heightAt = (x: number, z: number) => -20;   // open sea everywhere
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "bridge", id: "span", xMin: -20, xMax: 20, zMin: -500, zMax: 500, yMin: 5, yMax: 15 });
  assert.equal(reg.whatIsAt(0, -5, 0, 0).kind, "water", "under the deck is still open water");
  assert.equal(reg.whatIsAt(0, 10, 0, 0).kind, "bridge", "at deck height, the bridge answers instead");
});

test("soft occupancy still blocks overlapsReserved and findFree by default -- solid is informational, not a bypass", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "field", id: "west-farm", xMin: -160, xMax: 160, zMin: -125, zMax: 125, solid: false });
  const at = reg.whatIsAt(0, 0, 0, 0);
  assert.equal(at.kind, "field");
  assert.equal(at.solid, false, "the field is recorded as soft...");
  assert.ok(
    reg.overlapsReserved(-10, 10, -10, 10, 0),
    "...but a caller that has not released it still gets refused, the same as hard ground"
  );
  assert.equal(reg.findFree(50, 50, { x: 0, z: 0 }, { radius: 100, step: 20 }), null);
});

test("the only way onto soft ground is to release() it first, exactly like hard ground", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "field", id: "west-farm", xMin: -160, xMax: 160, zMin: -125, zMax: 125, solid: false });
  assert.ok(reg.overlapsReserved(0, 10, 0, 10, 0));
  reg.release("west-farm");
  assert.equal(reg.overlapsReserved(0, 10, 0, 10, 0), null);
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

// 2026-09-06 design correction: a thing being transformed is not an obstacle
// to its own replacement. Without ignoreIds, "does a bigger version of X fit
// where X already stands" finds X's own reservation and refuses -- a self-
// collision indistinguishable from the ground genuinely being full.
test("overlapsReserved: ignoreIds exempts a named reservation from being its own obstacle", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "old-villa", xMin: -9, xMax: 9, zMin: -12, zMax: 12 });
  // Without ignoreIds, the villa blocks its own footprint.
  const blocked = reg.overlapsReserved(-9, 9, -12, 12, 0);
  assert.ok(blocked, "test setup is wrong -- the villa should block an unexempted query");
  assert.equal(blocked.id, "old-villa");
  // With ignoreIds naming it, the same query is free.
  const exempt = reg.overlapsReserved(-9, 9, -12, 12, 0, { ignoreIds: ["old-villa"] });
  assert.equal(exempt, null, "ignoreIds did not exempt the named reservation");
});

test("overlapsReserved: ignoreIds does not exempt a DIFFERENT reservation -- it is narrow, not a blanket pass", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "old-villa", xMin: -9, xMax: 9, zMin: -12, zMax: 12 });
  reg.reserve({ kind: "feature", id: "neighbour-shed", xMin: 20, xMax: 26, zMin: 20, zMax: 26 });
  const hit = reg.overlapsReserved(20, 26, 20, 26, 0, { ignoreIds: ["old-villa"] });
  assert.ok(hit, "ignoring one id wrongly exempted a completely different reservation");
  assert.equal(hit.id, "neighbour-shed");
});

test("allOverlapping: ignoreIds excludes the named reservation from the full obstruction list too", () => {
  const reg = createWorldRegistry();
  reg.reserve({ kind: "feature", id: "old-villa", xMin: -9, xMax: 9, zMin: -12, zMax: 12 });
  reg.reserve({ kind: "feature", id: "neighbour-shed", xMin: 5, xMax: 15, zMin: 5, zMax: 15 });
  const all = reg.allOverlapping(-9, 15, -12, 15, 0, { ignoreIds: ["old-villa"] });
  assert.deepEqual(all.map((e) => e.id), ["neighbour-shed"]);
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
