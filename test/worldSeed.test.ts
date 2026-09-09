// THE WORLD IS SEEDED, AND THE ONE THAT ALREADY EXISTS DID NOT MOVE.
//
// There was exactly one world because `LandField` and the shaping functions
// behind it took no seed. That is what made a player's own world, a clone of
// someone else's, and a world inside a world impossible -- not a missing
// feature, a missing parameter.
//
// The delicate half is not adding it. It is that the DEFAULT must reproduce the
// existing terrain exactly, because every measured figure in this repository
// describes that specific ground: 20,624 plots, 480 variants, 1.45 M triangles,
// the zoning percentiles, the airport's 11,041 dry sample points. Most of the
// suite asserts properties rather than values, so terrain that shifted by a
// metre would keep passing while quietly invalidating all of it.
//
// So the identity is pinned by fingerprint here, over tens of thousands of
// samples, rather than trusted to the arithmetic looking right.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { LandField, makeHeightAt } from "../public/terrain.js";
import { DEFAULT_SEED } from "../public/noise.js";

/** A sha256 over a wide grid of heights -- the whole shape of the land in one value. */
function fingerprint(field: any, step = 311): string {
  const h = makeHeightAt(field);
  let s = "";
  for (let x = -20000; x <= 20000; x += 137) {
    for (let z = -20000; z <= 20000; z += step) s += h(x, z).toFixed(4) + ",";
  }
  return createHash("sha256").update(s).digest("hex");
}

test("the default world is byte-identical to the one before seeding existed", () => {
  // Captured from the pre-seed implementation and pinned here. If this fails
  // for a reason OTHER than a deliberate, planned terrain redesign, seeding
  // moved the ground and every measured number in docs/ is now wrong.
  //
  // RE-PINNED 2026-09-08, B1 STEP B: the previous pin
  // (418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96) was
  // the OLD world -- 42% water, one mainland consuming the whole land
  // budget, 391.9 km2 dry land, 96% of it carrying nothing
  // (docs/specs/BOARD-REBUILD-PLAN.md). This value is the NEW archipelago:
  // ~68.2% water, ~215.2 km2 dry land, 32 islands. This is the correct
  // outcome of a deliberate, planned redesign (see test/landCoverage.test.ts
  // for the real coverage/size-distribution gate), not a guard violation --
  // the guard exists to catch ACCIDENTAL drift from unrelated changes.
  // docs/BUILD-LOOP.md's own Step 8 no longer quotes this hash directly, for
  // the same reason: a process document should not carry a data value a
  // legitimate future phase is expected to change.
  const PRE_SEED = "eba1936a865a9a90a262bf3c22ae7073bdf73b880f65cf786f2a131578257730";
  assert.equal(
    fingerprint(new LandField(16)),
    PRE_SEED,
    "the default terrain moved -- if this was not a deliberate terrain redesign, every figure measured against this world is now wrong",
  );
  assert.equal(DEFAULT_SEED, 0);
});

test("an explicit default seed is the same world as no seed at all", () => {
  assert.equal(fingerprint(new LandField(16, 420, 40, DEFAULT_SEED)), fingerprint(new LandField(16)));
});

test("a named seed is a genuinely different landmass", () => {
  // Not "slightly different". If a seed only perturbed the noise a little, the
  // coastline and the mountains would still be in the same places and "your own
  // world" would be a promise made with a parameter.
  const base = fingerprint(new LandField(16));
  const named = fingerprint(new LandField(16, 420, 40, "harbour-of-saint-elms"));
  assert.notEqual(named, base, "the seed was ignored -- there is still only one world");
});

test("the same seed builds the same world every time, so it can be shared by name", () => {
  // The precondition for a layer: an edit says "plot block-146-1100-p0". If the
  // base rebuilt differently, that address would point at different ground and
  // every stored edit would rot.
  const a = fingerprint(new LandField(16, 420, 40, "harbour-of-saint-elms"));
  const b = fingerprint(new LandField(16, 420, 40, "harbour-of-saint-elms"));
  assert.equal(a, b, "the same seed produced two different worlds");
});

test("two different names are two different worlds", () => {
  const a = fingerprint(new LandField(16, 420, 40, "alpha"));
  const b = fingerprint(new LandField(16, 420, 40, "beta"));
  assert.notEqual(a, b, "two names collapsed onto one world");
});

test("a seeded world is still a world -- land, sea and real relief", () => {
  // A seed that produced an all-water or all-flat world would pass every test
  // above and be useless. The point of seeding is more worlds, not more noise.
  const h = makeHeightAt(new LandField(16, 420, 40, "harbour-of-saint-elms"));
  let land = 0, sea = 0, highest = -Infinity;
  for (let x = -18000; x <= 18000; x += 400) {
    for (let z = -18000; z <= 18000; z += 400) {
      const y = h(x, z);
      if (y > 0.5) land++; else if (y < -0.5) sea++;
      if (y > highest) highest = y;
    }
  }
  assert.ok(land > 200, `only ${land} land samples -- the seeded world is drowned`);
  assert.ok(sea > 200, `only ${sea} sea samples -- the seeded world has no coast`);
  assert.ok(highest > 200, `highest ground is ${highest.toFixed(0)} m -- the seeded world is flat`);
});
