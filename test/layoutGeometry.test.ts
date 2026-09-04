// THE LAYOUT MEETS THE ASSET LANE.
//
// `test/layout.test.ts` proves the layout makes the right DECISIONS. It never
// builds anything, on purpose -- those tests are arithmetic over plain objects.
//
// This file is the join: it takes the variants the layout actually asks for on
// the real world and hands each one to `building()`, which is the same call the
// renderer will make. Geometry is arithmetic too, so this runs in plain node
// with no WebGL and no browser.
//
// What it CANNOT tell you is what the city looks like. That needs
// `node scripts/shoot-app.mjs` and a real browser. What it can tell you is
// whether the library can build what the layout asks for at all, which is the
// question that would otherwise be answered by a blank screen.

import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld } from "../public/city-plan.js";
import { assessFootprint } from "../public/footprint.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { planCity, groupByVariant } from "../public/layout.js";
import { building } from "../public/buildings.js";

// ONE WORLD, SHARED. Building it costs about 4 seconds, and every test here
// asks about the same city, so building it per test would be 4 seconds of the
// suite spent proving determinism that cityWorld.test.ts already proves.
const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const verdictFor = (plot: any) => {
  const b = plot.buildable || plot;
  return assessFootprint(heightAt, { xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax }).verdict;
};
const { placements } = planCity(world.blocks, world.plots, verdictFor);
const groups = groupByVariant(placements);

test("every variant the layout asks for can actually be built", () => {
  assert.ok(groups.size > 100, `only ${groups.size} variants -- the fixture is too small to mean anything`);

  const failed: string[] = [];
  for (const g of groups.values()) {
    try {
      const spec = building(g.typology, g.seed, g.options);
      const lod0 = spec.lod && spec.lod[0];
      if (!lod0 || typeof lod0.createGeometry !== "function") {
        failed.push(`${g.key}: no LOD0 createGeometry`);
        continue;
      }
      const geo = lod0.createGeometry();
      if (!geo || !geo.attributes || !geo.attributes.position || geo.attributes.position.count === 0) {
        failed.push(`${g.key}: built no vertices`);
        continue;
      }
      geo.dispose?.();
    } catch (e: any) {
      failed.push(`${g.key}: threw ${e.message}`);
    }
  }

  assert.deepEqual(failed, [], `${failed.length} of ${groups.size} variants could not be built:\n  ` + failed.slice(0, 8).join("\n  "));
});

test("the options the layout emits are the options the asset lane honours", () => {
  // A silently ignored option is the worst outcome here: the layout believes it
  // asked for an end unit with a party wall, the library builds a middle one,
  // and nothing anywhere disagrees. Check that what came back reports what was
  // asked for.
  const checked: string[] = [];
  for (const g of groups.values()) {
    const spec: any = building(g.typology, g.seed, g.options);
    if (!spec.params) continue;
    for (const k of ["corner", "position", "foundation", "character"] as const) {
      if (g.options[k] === undefined || spec.params[k] === undefined) continue;
      assert.equal(
        spec.params[k],
        g.options[k],
        `${g.typology} was asked for ${k}="${g.options[k]}" and reported "${spec.params[k]}"`,
      );
      checked.push(k);
    }
  }
  assert.ok(checked.length > 200, `only ${checked.length} options were actually round-tripped -- the check is near-vacuous`);
});

test("the city is drawable: a few hundred meshes, not twenty thousand", () => {
  // Measured: 20,472 buildings collapse to 298 variants, 27,608 triangles of
  // distinct geometry, 1.46 M triangles drawn. Seeding per plot instead of per
  // situation would make this 20,472 draw calls, which is a different renderer.
  let distinctTris = 0;
  let cityTris = 0;
  for (const g of groups.values()) {
    const spec: any = building(g.typology, g.seed, g.options);
    const geo = spec.lod[0].createGeometry();
    const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    distinctTris += tris;
    cityTris += tris * g.placements.length;
    geo.dispose?.();
  }

  assert.ok(groups.size < 900, `${groups.size} variants means ${groups.size} draw calls for buildings alone`);
  assert.ok(distinctTris < 200_000, `${distinctTris} triangles of distinct geometry is more than the GPU should hold for one city`);
  assert.ok(cityTris < 12_000_000, `${Math.round(cityTris)} triangles drawn for the city is beyond the budget`);
  // And the floor: a city that collapsed to almost nothing would pass every
  // ceiling above while being visibly repetitive.
  assert.ok(distinctTris > 5_000, `only ${distinctTris} triangles of distinct geometry -- the city is one building repeated`);
});
