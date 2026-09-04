// SEEDING THE WORLD WITHOUT MOVING THE ONE THAT EXISTS.
//
// There was one world because there was one noise field -- not a missing
// feature, a missing PARAMETER. Adding it is what makes a player's own world, a
// clone of someone else's, and a world inside a world possible at all.
//
// The dangerous part is not adding the seed. It is that seed 0 must reproduce
// the EXISTING world byte for byte. Every measured number in this repository
// describes that specific terrain -- 20,624 plots, 480 variants, 1.45 M
// triangles, the zoning percentiles, the airport's 11,041 dry sample points --
// and most of the suite asserts PROPERTIES rather than values, so a terrain
// that shifted by a metre would go on passing while quietly invalidating every
// figure in the docs.
//
// So the identity is pinned here, against the original expression written out
// longhand, rather than trusted to the arithmetic looking right.

import { test } from "node:test";
import assert from "node:assert/strict";

import { hash2, valueNoise, fbm, createNoise, seedToInt, DEFAULT_SEED } from "../public/noise.js";

/** The pre-seed implementation, copied verbatim as the reference. */
function originalHash2(i: number, j: number) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

test("the default seed reproduces the original noise field exactly", () => {
  // Not "close" and not "statistically similar" -- identical, at every sample.
  // The seed is mixed in by MULTIPLICATION so that seed 0 contributes exactly
  // zero and the expression reduces, term for term, to the original.
  let checked = 0;
  for (let i = -500; i < 500; i += 7) {
    for (let j = -500; j < 500; j += 11) {
      assert.equal(hash2(i, j), originalHash2(i, j), `hash2(${i}, ${j}) moved`);
      checked++;
    }
  }
  assert.ok(checked > 5000, `only ${checked} samples -- too few to call this pinned`);
  assert.equal(DEFAULT_SEED, 0, "the default seed is no longer the one the world was built from");
});

test("an explicit seed of 0 is the same as no seed at all", () => {
  const zero = createNoise(0);
  for (let i = 0; i < 200; i++) {
    const x = i * 13.7, z = i * 7.3;
    assert.equal(zero.fbm(x, z, 400), fbm(x, z, 400), `the seeded field diverged at ${x}, ${z}`);
    assert.equal(zero.valueNoise(x, z), valueNoise(x, z));
  }
});

test("a different seed is a different world, everywhere and not just somewhere", () => {
  // A seed that changed a handful of samples would be a seed in name only --
  // the landmasses, the coastline and the mountains would all still be in the
  // same place, and "your own world" would be a lie told with a parameter.
  const other = createNoise("harbour-of-saint-elms");
  let differed = 0;
  for (let i = 0; i < 200; i++) {
    const x = i * 13.7, z = i * 7.3;
    if (other.fbm(x, z, 400) !== fbm(x, z, 400)) differed++;
  }
  assert.equal(differed, 200, `only ${differed} of 200 samples changed with a new seed`);
});

test("two fields with the same seed agree, so a world can be shared by name", () => {
  const a = createNoise("harbour-of-saint-elms");
  const b = createNoise("harbour-of-saint-elms");
  assert.equal(a.seed, b.seed);
  for (let i = 0; i < 100; i++) {
    const x = i * 9.1, z = i * 4.7;
    assert.equal(a.fbm(x, z, 400), b.fbm(x, z, 400), "the same seed produced two different worlds");
  }
});

test("a seed can be a name, a number, or nothing", () => {
  // A string so a world can be shared by reference -- a place name, a player
  // id, a share code -- rather than by copying twenty thousand plots.
  assert.equal(seedToInt("abc"), seedToInt("abc"), "seedToInt is not stable");
  assert.notEqual(seedToInt("abc"), seedToInt("abd"), "two names collapsed to one world");
  assert.equal(seedToInt(7), 7, "a number seed should pass through");
  assert.equal(seedToInt(null), seedToInt(""), "an absent seed should be one specific world, not undefined");
  assert.equal(Number.isInteger(seedToInt("anything")), true);
});

test("the seed goes last in every signature, so no existing call site changed", () => {
  // A plan whose first step edits dozens of call sites is a plan that breaks
  // the world in order to make it seedable. Every function here still works
  // when called exactly as it was before.
  assert.equal(typeof hash2(1, 2), "number");
  assert.equal(typeof valueNoise(1.5, 2.5), "number");
  assert.equal(typeof fbm(10, 20, 400), "number");
  assert.equal(typeof fbm(10, 20, 400, 4, 0.5, 2.03), "number");
});

test("noise stays in 0..1 whatever the seed", () => {
  // Everything downstream -- heights, land value, zoning bands -- assumes this
  // range. A seed that pushed it outside would produce a world that is wrong in
  // ways no single test would name.
  for (const seed of [0, 1, -1, "a", "harbour", 999999]) {
    const n = createNoise(seed);
    for (let i = 0; i < 100; i++) {
      const v = n.fbm(i * 31.7, i * 17.3, 400);
      assert.ok(v >= 0 && v <= 1, `fbm out of range for seed ${seed}: ${v}`);
      const h = n.hash2(i, i * 2);
      assert.ok(h >= 0 && h <= 1, `hash2 out of range for seed ${seed}: ${h}`);
    }
  }
});
