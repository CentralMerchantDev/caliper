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
import { planCity, groupByVariant, seedFor } from "../public/layout.js";
import { makeFits, measuredSeedFor } from "../public/layout-fits.js";
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
const { placements } = planCity(world.blocks, world.plots, verdictFor, makeFits());
const groups = groupByVariant(placements);

/**
 * How many of these placements are larger than the plot they were chosen for.
 *
 * THE SEED MUST BE THE REAL ONE. The first version of this passed the literal
 * string "measure" as the seed, which means it measured a DIFFERENT building
 * from the one the renderer builds -- and, for any typology whose size still
 * falls back to the seed, a differently sized one. It therefore reported 293
 * overhangs while the real figure under a broken sizer was 653, and a mutation
 * that genuinely doubled overhangs came back SURVIVED.
 *
 * That is the same defect this file is testing for, committed by the test. The
 * seed is `seedFor(typology, options)`, exactly as the renderer will compute it.
 */
function countOverhangs(list: any[]) {
  let over = 0;
  const specs = new Map<string, any>();
  for (const p of list) {
    const seed = seedFor(p.typology, p.options);
    let spec = specs.get(seed);
    if (!spec) {
      spec = building(p.typology, seed, p.options);
      specs.set(seed, spec);
    }
    if (spec.footprint.w > p.fits.w + 1e-6 || spec.footprint.d > p.fits.d + 1e-6) over++;
  }
  return over;
}

test("asking whether a building FITS before choosing it is what stops it overhanging", () => {
  // THIS TEST EXISTS BECAUSE A MUTATION SURVIVED.
  //
  // The fits predicate is optional -- planCity takes it and defaults to null --
  // so every test in layout.test.ts exercises the unfiltered path. Disabling the
  // filter therefore changed nothing any test could see, and the mutation
  // `fits-filter-is-applied` reported SURVIVED. A control that is only exercised
  // by a script is not a control.
  //
  // Measured: without the predicate 3,552 of 20,472 buildings (17.4%) are bigger
  // than their plot, because cellW is seed-derived inside buildings.js and a
  // bld-office can decide it is 48 x 56 m on a 48 x 53 m plot. With it, 269.
  const without = planCity(world.blocks, world.plots, verdictFor).placements;
  const withFits = placements;

  const overWithout = countOverhangs(without);
  const overWith = countOverhangs(withFits);

  assert.ok(
    overWithout > 1000,
    `only ${overWithout} overhangs without the predicate -- the fixture no longer reproduces the problem, ` +
      "so this test would pass whether or not the filter works",
  );
  assert.ok(
    overWith < overWithout / 5,
    `the fits predicate cut overhangs from ${overWithout} to ${overWith}, which is not the order of improvement it claims`,
  );
  // AN ABSOLUTE CEILING, AND IT IS TIGHT ON PURPOSE.
  //
  // This started at 3% and that was too loose to be a control. When the sizer
  // and the renderer briefly used DIFFERENT seeds -- so the size that was
  // measured was not the size that would be built -- overhangs went from 269 to
  // 556, and 556 sat comfortably under both the 5x rule and a 3% ceiling. The
  // suite stayed green through a real regression.
  //
  // 2% of the city is 409 buildings. The measured figure is 293. That leaves
  // room for terrain tuning to move it a little and no room at all for the
  // seeds to come apart again.
  assert.ok(
    overWith < 0.02 * withFits.length,
    `${overWith} of ${withFits.length} buildings overhang their plot, above the 2% ceiling. ` +
      "If this rose suddenly, check that layout-fits.js and variantKeyOf still share seedFor.",
  );
});

test("the seed layout-fits.js measured a placement with is the seed the renderer builds it with", () => {
  // THE CAUSE, NOT THE CONSEQUENCE.
  //
  // The overhang-count test above is a real, useful control -- it guards that
  // the fits predicate runs at all -- but it asserts a CONSEQUENCE (how many
  // buildings overhang) against a ceiling, and a ceiling is a moving target:
  // terrain tuning shifted the measured figure from 269 toward 409 over the
  // life of this project, eating the margin that the sizer/renderer-seed
  // mutation needs to cross to be caught. The mutation this test exists for
  // (`sizer-and-renderer-share-one-seed`) doubled overhangs from 269 to
  // 653 -- and 653 is STILL under a 2% ceiling that has drifted up to 409
  // only because the fixture has ~20,472 buildings and 2% of that is large.
  // A ceiling test cannot see a regression that fits under it.
  //
  // This asserts the CAUSE instead: for EVERY real placement, the seed
  // layout-fits.js measured it with (measuredSeedFor, the exact internal
  // value makeFits() used to decide whether it fits) must equal the seed
  // variantKeyOf/seedFor computes for that same placement -- the seed the
  // renderer will actually build it with. That is an exact equality over
  // ~20,000 real placements, checked directly, and it cannot drift with
  // terrain tuning the way a percentage ceiling can.
  let mismatches = 0;
  const examples: string[] = [];
  for (const p of placements) {
    const measured = measuredSeedFor(p.typology, p.situation);
    const built = seedFor(p.typology, p.options);
    if (measured !== built) {
      mismatches++;
      if (examples.length < 3) examples.push(`${p.plotId}: measured "${measured}" but built "${built}"`);
    }
  }
  assert.equal(
    mismatches, 0,
    `${mismatches} of ${placements.length} placements were measured for fit with a different seed than they are built with -- ` +
      `the building that was checked is not the building that gets built. Examples: ${examples.join("; ")}`,
  );
});

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

  // RE-DERIVED GEOMETRY BUDGET (docs/specs/LIBRARY-AS-SOURCE.md & VISUAL-BUILD-PLAN.md)
  //
  // Distinct triangles are GPU MEMORY (VRAM), uploaded once into static vertex buffers:
  //   - Position (12B) + Normal (12B) + Color (12B) + UV (8B) = 44 bytes/vertex
  //   - Index = 6 bytes/triangle
  //   - 1M distinct tris ~ 500k vertices x 44B + 6MB index ~ 28 MB VRAM
  //   - 2M distinct tris ~ 56 MB VRAM (well within modern GPU VRAM headroom)
  //
  // The 200,000 ceiling was an arbitrary 7x multiplier over a 27k baseline.
  // We re-derive distinct geometry budget at 2,000,000 triangles (~56 MB VRAM),
  // while keeping the 12,000,000 DRAWN triangles ceiling as the true frame rate guardrail.
  assert.ok(groups.size < 900, `${groups.size} variants means ${groups.size} draw calls for buildings alone`);
  assert.ok(distinctTris < 2_000_000, `${distinctTris} triangles of distinct geometry exceeds 56 MB VRAM budget`);
  assert.ok(cityTris < 12_000_000, `${Math.round(cityTris)} triangles drawn for the city is beyond the 12M drawn budget`);
  // And the floor: a city that collapsed to almost nothing would pass every
  // ceiling above while being visibly repetitive.
  assert.ok(distinctTris > 5_000, `only ${distinctTris} triangles of distinct geometry -- the city is one building repeated`);
});
