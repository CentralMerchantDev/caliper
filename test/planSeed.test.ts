// THE PLAN IS SEEDED TOO, AND THE ONE THAT ALREADY EXISTS DID NOT MOVE.
//
// A2 seeded the ground. That alone does not make a player's own world: the
// STREET GRID, the block classification and the zoning mix came from four
// `fbm` calls in this file that were still hard-wired to DEFAULT_SEED, so two
// players naming two different worlds would stand on different hills but walk
// the identical streets. This closes that gap the same way A2 closed its own:
// seed threaded last through every call site, default preserves today exactly.
//
// The delicate half is not adding the parameter. It is that `generateCityPlan`
// was memoised in a single module-level singleton with no key at all, and
// `cityDemand` was memoised in a WeakMap keyed only on `heightAt` -- neither
// cache had any notion of "which seed". A second seed would have silently
// returned the first seed's cached plan. That is worse than not seeding the
// plan, because it fails silently and would have made "a named seed is a
// genuinely different city" true by luck on the FIRST call of a session and
// false on every call after it -- which is exactly the shape of defect that
// does not show up in a suite that only ever calls each function once.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { generateWorld, generateCityPlan, generateBlocks, classForBlock } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { DEFAULT_SEED } from "../public/noise.js";

/** A sha256 over every plot, block and road the plan produced -- the whole
 *  shape of the city in one value, sorted so object insertion order cannot
 *  hide a real difference or manufacture a fake one. */
function fingerprint(world: any): string {
  const rows: string[] = [];
  for (const p of world.plots) rows.push(["p", p.id, p.xMin, p.xMax, p.zMin, p.zMax, p.className, p.settlement].join(","));
  for (const b of world.blocks) rows.push(["b", b.id, b.xMin, b.xMax, b.zMin, b.zMax].join(","));
  for (const r of world.roads) rows.push(["r", r.id, r.axis, r.class, r.at, r.from, r.to].join(","));
  rows.sort();
  return createHash("sha256").update(rows.join("|")).digest("hex");
}

// The same ground for every world built in this file, so any difference
// measured below comes from the PLAN's own seed, never from the terrain's.
const heightAt = makeHeightAt(new LandField(16));

test("the default plan is byte-identical to the one before the plan was seeded", () => {
  // Captured from the pre-seed implementation and pinned here, the same
  // discipline test/worldSeed.test.ts used for the ground:
  //   node -e 'generateWorld(makeHeightAt(new LandField(16))) -> fingerprint'
  //
  // P3.7.3 -- RE-PINNED. This was left red on purpose since commit cdc2640
  // ("Name the two red tests, at the point where they fail"), which moved
  // the plot count 19,874 -> 20,059 for PLOT_CLASSES going whole-cell
  // (772fd77, a8a0d28) and said explicitly: re-pin ONCE, at the end of the
  // rebalance, not now, or the second pin becomes the only one anyone ever
  // checks. Commit 3419331, "World rebalance, step 3, part 1"
  // (2026-09-06 23:00:32, WORLD-REBALANCE-BRIEF.md §3), cut the barrier
  // island's plot share 56.0% -> 8.0% and demoted several TOWER/MIDRISE
  // settlements -- intended work, not a regression, and it moved the count
  // again, to 17,583. Traced and reported in docs/audits/P3.5-FLOATING.md's
  // P3.6 section without being fixed there, per Mark's own instruction not
  // to chase it that pass; re-pinned here in P3.7.3 because the count is
  // now confirmed as the intended result of intended work, not a mystery.
  //
  // The pin below is 17,586, not 17,583: P3.6.1/P3.7.1's own container-port
  // site-relocation fix (public/land-use.js's findQuay, apron-aware
  // fallback scoring) moved SITE.containerPort itself by a further ~80m
  // once the apron check was added, which shifted 3 plots' WAREHOUSE
  // eligibility (port/airport-proximity zoning) -- measured directly
  // (`node -e '...generateWorld... -> world.plots.length'`), not assumed.
  // A different world lane's future change WILL move this again; when it
  // does, re-measure and re-pin with the same discipline, do not guess.
  const PRE_SEED = "a0ec85bb9cfdc63933fde1e949ca71e1e7c769f768204aac813c1eabfdb1c3ad";
  const world = generateWorld(heightAt);
  assert.equal(world.plots.length, 17586, "plot count moved -- the pin below is no longer describing this city");
  assert.equal(
    fingerprint(world),
    PRE_SEED,
    "the default plan moved -- every measured figure in docs/ that describes this city is now wrong",
  );
});

test("a named seed lays out a genuinely different street grid, not just different ground", () => {
  const base = fingerprint(generateWorld(heightAt, DEFAULT_SEED));
  const named = fingerprint(generateWorld(heightAt, "harbour-of-saint-elms"));
  assert.notEqual(named, base, "the plan ignored the seed -- every world still has the same streets");
});

test("the same seed plans the same city every time, so it can be shared by name", () => {
  const a = fingerprint(generateWorld(heightAt, "prospect-quarter"));
  const b = fingerprint(generateWorld(heightAt, "prospect-quarter"));
  assert.equal(a, b, "the same seed produced two different plans");
});

test("two different names are two different plans", () => {
  const a = fingerprint(generateWorld(heightAt, "prospect-quarter"));
  const b = fingerprint(generateWorld(heightAt, "east-gate"));
  assert.notEqual(a, b);
});

test("generateCityPlan does not hand a second seed the first seed's cached plan", () => {
  // The memo bug this test exists to catch: a module-level singleton (or a
  // cache keyed only on something other than the seed) means the SECOND call
  // in a process, whatever seed it asks for, silently gets the FIRST call's
  // answer. Calling the two seeds in each order rules out "it just happens to
  // be right because of which one ran first".
  // roads/blocks come from generateRoads()/generateBlocks(), which take no
  // seed and are the same topology for every seed by construction -- only
  // which CLASS each block becomes depends on the seed. A different class for
  // even one block can cascade into a different plot COUNT (a PARK block
  // produces no plots; a subdivided one produces a variable number), so
  // comparing the built plots array position-by-position conflates "the seed
  // worked" with "the plan happened to keep the same shape". classForBlock
  // directly, over every real downtown block, has neither problem.
  const blocks = generateBlocks();
  const classesFor = (plan: any, seed: any) => blocks.map((b: any) => {
    const d = plan.districts.find((x: any) => x.id === b.districtId);
    return classForBlock(b, d, seed);
  });
  const a1 = classesFor(generateCityPlan(DEFAULT_SEED), DEFAULT_SEED);
  const b1 = classesFor(generateCityPlan("prospect-quarter"), "prospect-quarter");
  const disagreements = a1.filter((c: string, i: number) => c !== b1[i]).length;
  // Measured, not assumed: the grain a seed perturbs is small relative to
  // classForValue's thresholds, so a working seed moves a modest handful of
  // blocks across a boundary, not most of them -- `node test/run.mjs` with
  // this exact pair measured 7 of 269 (2.6%). What a MEMO bug produces is not
  // "fewer than expected", it is EXACTLY ZERO, because the second seed never
  // ran at all. So the bar that actually separates "the cache is broken" from
  // "the seed works" is nonzero, not an arbitrary share.
  assert.ok(
    disagreements > 0,
    `0 of ${blocks.length} blocks changed class between two seeds -- ` +
      "a second seed returned the first seed's cached city plan",
  );
  // reverse order -- the cache must not be "whoever asks second loses" either
  const b2 = classesFor(generateCityPlan("prospect-quarter"), "prospect-quarter");
  const a2 = classesFor(generateCityPlan(DEFAULT_SEED), DEFAULT_SEED);
  assert.deepEqual(b2, b1, "the same seed, asked again, did not return its own cached plan");
  assert.deepEqual(a2, a1, "the default seed, asked again after another seed ran, did not return its own cached plan");
});
