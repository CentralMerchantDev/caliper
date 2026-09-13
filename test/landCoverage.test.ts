// =============================================================================
// B1 GATE -- water fraction, dry-land area, island count and size
// distribution, settled-mainland-fraction, all asserted against the real
// height field, none of it printed.
//
// docs/specs/BOARD-REBUILD-PLAN.md: today's world is 42% water / 391.9 km²
// dry land, 96% of that land carrying nothing, because one mainland
// consumed the whole budget. Target: ~65% water, a real archipelago, a
// mainland that stays countryside.
//
// WATCHED RED FIRST, against the git history rather than memory: `git
// stash` on public/terrain.js alone (leaving this test file and
// scripts/measure-land.mjs in place), then two separate checks, popped back
// immediately after each:
//
//   1. This test FILE, run as-is against the committed B1-step-A data
//      (copied verbatim from city-plan.js, not yet redesigned): refused to
//      even build -- "No matching export... for import MAINLAND_ZONES",
//      since that export does not exist until this same commit. A build
//      failure is itself a real, valid red (test/run.mjs's own standing
//      rule: "refusing to report a result for a suite that did not run"),
//      but it does not by itself prove the NUMERIC bands below are real.
//   2. scripts/measure-land.mjs run standalone (no MAINLAND_ZONES import,
//      so it builds against the old data) against that same B1-step-A
//      world measured 41.8% water / 393.2 km² dry land / 10 islands,
//      largest 46.1 km² -- outside every numeric band below by a wide
//      margin on every axis, not just one. That is the proof the bands
//      themselves are real and not simply wide enough to pass anything.
//
// TOLERANCES ARE BANDS, NOT EXACT EQUALITY, ON PURPOSE: Mark's own
// instruction is that LAND_SCALE is "~65% to start... Mark will move it by
// eye" -- a precise equality assertion would fight the knob's own stated
// purpose. The bands are centred on what this session's authored shapes
// actually measure (68.2% water, 215.2 km2 dry, 32 islands), wide enough
// to survive a reasonable LAND_SCALE nudge, narrow enough that today's old
// world (41.8%/393.2/10) fails every one of them by a wide margin, not by
// one axis alone.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { measureLand } from "../scripts/measure-land.mjs";
import { MAINLAND_ZONES } from "../public/terrain.js";

const R = measureLand();

test("B1 gate: water fraction is a real archipelago, not today's 42% -- ~65% to start, tunable, banded not exact", () => {
  assert.ok(
    R.waterFraction >= 0.55 && R.waterFraction <= 0.78,
    `water fraction measured at ${(R.waterFraction * 100).toFixed(1)}% -- outside the [55%, 78%] band around the ~65% target. ` +
    `Today's world (before this pass) measured 41.8%, well outside this band on the low side -- this assertion would have failed against it.`,
  );
});

test("B1 gate: dry land is 20-40 km2 SETTLED worth of ground, not 391.9 km2 of mostly nothing", () => {
  assert.ok(
    R.dryAreaKm2 >= 150 && R.dryAreaKm2 <= 300,
    `dry land measured at ${R.dryAreaKm2} km2 -- outside the [150, 300] km2 band. ` +
    `Today's world measured 393.2 km2, well outside this band on the high side.`,
  );
});

test("B1 gate: island count and variety -- an archipelago reads by count, not by area alone (Mark's own correction: area alone would pass with one big island and nine specks)", () => {
  assert.ok(
    R.islandCount >= 20,
    `${R.islandCount} islands (excluding mainland) -- fewer than the 20 this gate requires. Today's world had 10.`,
  );
});

test("B1 gate: the largest island can carry a downtown", () => {
  const largest = R.islands[0];
  assert.ok(largest.worldAreaKm2 >= 15, `largest island (${largest.id}) is ${largest.worldAreaKm2} km2 -- too small to read as a dense downtown skyline`);
  assert.equal(largest.id, "downtown", `the largest island is "${largest.id}", not downtown -- downtown is meant to be the largest, per Mark's own brief`);
});

test("B1 gate: the smallest NAMED (non-skerry) island carries one house, not a whole neighbourhood", () => {
  const named = R.islands.filter((i) => !["skerry", "sandbar", "rock"].includes(i.kind));
  const smallestNamed = named[named.length - 1];
  assert.ok(
    smallestNamed.worldAreaKm2 <= 1,
    `smallest named island (${smallestNamed.id}) is ${smallestNamed.worldAreaKm2} km2 -- larger than a one-house cottage island should be`,
  );
});

test("B1 gate: real size variety between the largest and smallest -- not one big island and a scatter of identical specks", () => {
  const sizes = R.islands.map((i) => i.worldAreaKm2);
  const distinctBuckets = new Set(sizes.map((s) => (s >= 10 ? "large" : s >= 3 ? "medium" : s >= 0.4 ? "small" : "tiny")));
  assert.ok(distinctBuckets.size >= 4, `only ${distinctBuckets.size} distinct size bucket(s) present (${[...distinctBuckets].join(", ")}) -- expected large/medium/small/tiny all represented, per Mark's own "meaningful sizes between" instruction`);
});

test("B1 gate: something carries genuinely nothing -- a skerry or rock, smaller than any inhabited island", () => {
  const uninhabited = R.islands.filter((i) => ["skerry", "sandbar", "rock"].includes(i.kind));
  assert.ok(uninhabited.length > 0, "no skerry/sandbar/rock landmass exists at all");
  const smallestUninhabited = uninhabited[uninhabited.length - 1];
  assert.ok(smallestUninhabited.worldAreaKm2 < 0.5, `smallest uninhabited feature (${smallestUninhabited.id}) is ${smallestUninhabited.worldAreaKm2} km2 -- too large to read as "carrying nothing"`);
});

test("B1 gate: the mainland's own settleable fraction is a stated, small number, not left to be inferred -- and it stays small", () => {
  // Mark's correction 2: "State explicitly in the shape data how much of
  // the mainland is settleable, and gate it: settled mainland stays under
  // a stated fraction." MAINLAND_ZONES is that statement; this is the gate.
  const sum = MAINLAND_ZONES.reduce((s, z) => s + z.fraction, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `MAINLAND_ZONES fractions sum to ${sum}, not 1 -- the bands do not account for the whole mainland`);

  const settleable = MAINLAND_ZONES.filter((z) => z.settleable).reduce((s, z) => s + z.fraction, 0);
  assert.ok(
    settleable > 0 && settleable <= 0.2,
    `settleable fraction is ${settleable} -- either zero (no coast at all) or above the 0.2 cap Mark's own correction asks for ("only IF that 110 km2 is genuinely countryside")`,
  );

  // Every zone has a stated identity -- Mark's correction 3: "every large
  // empty area gets an identity... empty land with a name reads as
  // countryside; without one it reads as unfinished."
  for (const zone of MAINLAND_ZONES) {
    assert.ok(typeof zone.identity === "string" && zone.identity.length > 10, `MAINLAND_ZONES entry "${zone.id}" has no real stated identity`);
  }
});

test("B1 gate: the mainland's real, in-world-bounds area is close to its own stated 110 km2 target, not merely a polygon that happens to include far-off backdrop", () => {
  // R.dryAreaKm2 minus every named island's own measured area is the
  // mainland's real contribution to the sampled world -- not
  // mainlandFullPolygonWorldAreaKm2, which deliberately includes the
  // closing corners well past WORLD.SIZE (see scripts/measure-land.mjs's
  // own comment for why those two numbers are reported separately).
  const islandsTotal = R.islands.reduce((s, i) => s + i.worldAreaKm2, 0);
  const mainlandRealKm2 = R.dryAreaKm2 - islandsTotal;
  assert.ok(
    mainlandRealKm2 >= 90 && mainlandRealKm2 <= 130,
    `mainland's real in-bounds contribution measured at ${mainlandRealKm2.toFixed(1)} km2 -- outside the [90, 130] band around its own stated 110 km2 target`,
  );
});
