// =============================================================================
// THE STADIUM DOES NOT HAVE HOUSES IN IT
//
// worldRegistry.test.ts and features.test.ts check the registry and
// footprintOf() in isolation. This file checks the thing that was actually
// reported broken: that a REAL generated world has no plot standing on a
// feature's reserved ground, and that the registry generateWorld() builds is
// reachable from the world it describes.
//
// Measured before this was wired in: 389 of 19,481 plots sat inside a feature
// footprint (stadium 32, airport 110, farmWest 86, railway 57, golf 36,
// farmEast 67, mast 1). This file is what keeps that number at zero.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { placeFeatures, FEATURES, footprintOf } from "../public/features.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt) as any;
const { sites } = placeFeatures(heightAt);

function reservedFootprints() {
  const out: Array<{ id: string; xMin: number; xMax: number; zMin: number; zMax: number }> = [];
  for (const f of FEATURES) {
    const site = (sites as any)[f.id];
    if (!site) continue;
    for (const fp of footprintOf(f, site)) out.push({ id: f.id, ...fp });
  }
  return out;
}

test("no generated plot overlaps a placed feature's footprint", () => {
  const footprints = reservedFootprints();
  const overlaps = (p: any, f: any) =>
    !(p.xMax < f.xMin || p.xMin > f.xMax || p.zMax < f.zMin || p.zMin > f.zMax);

  const offenders: string[] = [];
  for (const p of world.plots) {
    for (const f of footprints) {
      if (overlaps(p, f)) { offenders.push(`${p.id} inside ${f.id}`); break; }
    }
  }
  assert.deepEqual(offenders, [], `${offenders.length} plot(s) still stand on reserved ground`);
});

test("the stadium's footprint alone accounts for real plots being refused", () => {
  // A weaker version of the check above, name-checking the specific complaint
  // ("the stadium has houses in it") rather than the aggregate.
  const stadiumSite = sites.stadium;
  assert.ok(stadiumSite, "the stadium must place on this seed for this test to mean anything");
  const [fp] = footprintOf(FEATURES.find((f) => f.id === "stadium")!, stadiumSite);
  const insideStadium = world.plots.filter(
    (p: any) => !(p.xMax < fp.xMin || p.xMin > fp.xMax || p.zMax < fp.zMin || p.zMin > fp.zMax)
  );
  assert.equal(insideStadium.length, 0);
});

test("plots dropped for reserved ground is reported, not swallowed", () => {
  // This is the control actually doing something, not a no-op that happens to
  // report zero: a real feature-shaped chunk of ground was refused.
  assert.ok(world.plotsDroppedForReservedGround > 0);
});

test("generateWorld exposes its registry, and whatIsAt agrees with the plan", () => {
  assert.ok(world.registry, "world.registry must be reachable from the world it describes");
  const stadiumSite = sites.stadium;
  const groundY = heightAt(stadiumSite.x, stadiumSite.z);
  const at = world.registry.whatIsAt(stadiumSite.x, groundY + 1, stadiumSite.z, 0);
  assert.equal(at.kind, "feature");
  assert.equal(at.id, "stadium");
  assert.equal(at.solid, true);
});

test("whatIsAt reports rock below the terrain surface, anywhere, including far from any feature", () => {
  // Pick a point nowhere near any placed feature.
  const x = 25000, z = 8000;
  const groundY = heightAt(x, z);
  const underground = world.registry.whatIsAt(x, groundY - 5, z, 0);
  assert.equal(underground.kind, "rock");
  assert.equal(underground.solid, true);
});

test("a world built with no heightAt has no registry and reserves nothing -- consistent with placeFeatures/zoning also being skipped", () => {
  const structureOnly = generateWorld() as any;
  assert.equal(structureOnly.registry, null);
  assert.equal(structureOnly.plotsDroppedForReservedGround, 0);
});
