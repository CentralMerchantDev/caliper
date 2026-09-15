// SHIP.md item 3: "lay the site out... buildings on a grid... the outdoor
// space composed too." The layout itself is reviewed by eye (screenshots),
// but the one thing eyeballing can silently get wrong is an outdoor prop
// placed ON TOP of a building -- exactly the mistake a first hand-done pass
// at this made (lamp-2 landed inside dwelling-2's own footprint, only
// caught by writing this same check as a one-off script and then keeping
// it as a real test). Computes the same world-space rects
// world-render-3d.js does, from the SAME exported constants (no duplicated
// geometry to drift), and checks every outdoor placement in the real,
// current world data against every real building footprint.
import { test } from "node:test";
import assert from "node:assert/strict";

import { SIM_BASELINE_SOURCE } from "../src/simBaseline.ts";
import { BUILDING_W, BUILDING_D, BUILDING_TYPE_SCALE, GRID_UNIT_X, GRID_UNIT_Z } from "../public/world-render-3d.js";
import { stripSourceComments } from "./stripSourceComments.ts";

function loadWorld(source: string) {
  return new Function(`${source}\nreturn { initialWorld };`)().initialWorld();
}

type Rect = { x: [number, number]; z: [number, number] };

function plotToWorld(plot: { x: number; y: number }, cx: number, cz: number) {
  return { x: (plot.x - cx) * GRID_UNIT_X, z: (plot.y - cz) * GRID_UNIT_Z };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x[0] < b.x[1] && a.x[1] > b.x[0] && a.z[0] < b.z[1] && a.z[1] > b.z[0];
}

/** Real geometry, not a fixture: reads the actual current world (buildings,
 * placements, objectTypes) the same way the 3D renderer does, and returns
 * every building rect plus every outdoor prop rect in world space. */
function computeLayout(world: any) {
  const buildings = world.buildings as { id: string; type: string; plot: { x: number; y: number } }[];
  const xs = buildings.map((b) => b.plot.x), ys = buildings.map((b) => b.plot.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...ys) + Math.max(...ys)) / 2;

  const buildingRects: Rect[] = buildings.map((b) => {
    const scale = (BUILDING_TYPE_SCALE as Record<string, { w: number; d: number }>)[b.type] ?? BUILDING_TYPE_SCALE.dwelling;
    const w = scale.w * BUILDING_W, d = scale.d * BUILDING_D;
    const p = plotToWorld(b.plot, cx, cz);
    return { x: [p.x - w / 2, p.x + w / 2], z: [p.z - d / 2, p.z + d / 2] };
  });

  const outdoorPlacements = (world.placements as any[]).filter((p) => p.location === "outdoors");
  const propRects = outdoorPlacements.map((p) => {
    const typeDef = world.objectTypes[p.type];
    const fp = typeDef.footprint;
    const pos = plotToWorld(p.plot, cx, cz);
    return { id: p.id, rect: { x: [pos.x - fp.w / 2, pos.x + fp.w / 2], z: [pos.z - fp.d / 2, pos.z + fp.d / 2] } as Rect };
  });

  return { buildings, buildingRects, propRects };
}

test("SHIP.md item 3: no outdoor placement in the real current world sits inside a real building's footprint", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const { buildings, buildingRects, propRects } = computeLayout(world);

  const collisions: string[] = [];
  for (const prop of propRects) {
    for (let i = 0; i < buildingRects.length; i++) {
      if (overlaps(prop.rect, buildingRects[i])) collisions.push(`${prop.id} overlaps building "${buildings[i].id}"`);
    }
  }
  assert.deepEqual(collisions, []);
});

test("SHIP.md item 3: no two outdoor placements in the real current world overlap each other", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const { propRects } = computeLayout(world);

  const collisions: string[] = [];
  for (let i = 0; i < propRects.length; i++) {
    for (let j = i + 1; j < propRects.length; j++) {
      if (overlaps(propRects[i].rect, propRects[j].rect)) collisions.push(`${propRects[i].id} overlaps ${propRects[j].id}`);
    }
  }
  assert.deepEqual(collisions, []);
});

test("guardrail: the overlap check actually fires on a planted collision, not just passing by construction", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  // Plant an outdoor placement directly on top of dwelling-1's own plot.
  world.placements.push({ id: "planted-collision", type: "lampPost", location: "outdoors", plot: { x: 0, y: 0 } });
  const { buildings, buildingRects, propRects } = computeLayout(world);
  const planted = propRects.find((p) => p.id === "planted-collision")!;
  const hitsDwelling1 = buildingRects.some((r, i) => buildings[i].id === "dwelling-1" && overlaps(planted.rect, r));
  assert.ok(hitsDwelling1, "the check must actually detect a placement planted inside a building's own footprint");
});

test("SHIP.md item 3: the four buildings sit on a consistent grid module, not scattered plot values", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const plots = (world.buildings as { plot: { x: number; y: number } }[]).map((b) => b.plot);
  const xs = [...new Set(plots.map((p) => p.x))].sort((a, b) => a - b);
  const ys = [...new Set(plots.map((p) => p.y))].sort((a, b) => a - b);
  // A consistent module means exactly 2 distinct x values and 2 distinct y
  // values (a rectangular grid), evenly spaced -- not 4 arbitrary points.
  assert.equal(xs.length, 2, `expected buildings on 2 distinct x-columns, found ${xs.length}: ${xs}`);
  assert.equal(ys.length, 2, `expected buildings on 2 distinct y-rows, found ${ys.length}: ${ys}`);
});

// Loads the masterplan zoning and the terrain height function out of the real
// renderer source and evaluates them, so these assertions test the actual
// geometry rather than the spelling of a line.
//
// The previous version of this test matched `coping.position.set(0, 0.70, 22.0)`
// as a string and called it "seawall must begin at z = 22.0". It did not: a
// 1.6m-deep wall centred on 22.0 begins at 21.2. The test passed while the
// invariant it advertised was false, and it would have failed on a pure
// reformat. A test that checks a string is not checking the property.
async function loadMasterplan() {
  const fs = await import("node:fs");
  // Stripped -- see test/stripSourceComments.ts and docs/LESSONS.md's "a
  // regex over source matches your comments too" entry. This src is both
  // eval'd (ZONE/terrainHeightAt, extracted below) and presence-checked
  // (the tramTrackGroup assertion further down); stripping protects both.
  const src = stripSourceComments(fs.readFileSync("public/world-render-3d.js", "utf-8"));
  const zone = src.match(/export const ZONE = \{[\s\S]*?\n\};/);
  const fn = src.match(/function terrainHeightAt\(x, z\) \{[\s\S]*?\n\}/);
  assert.ok(zone, "ZONE block must exist in the renderer -- it is the single source of masterplan truth");
  assert.ok(fn, "terrainHeightAt must exist in the renderer");
  const factory = new Function(
    `${zone![0].replace("export ", "")}\n${fn![0]}\nreturn { ZONE, terrainHeightAt };`
  );
  return { ...factory(), src } as {
    ZONE: Record<string, number>;
    terrainHeightAt: (x: number, z: number) => number;
    src: string;
  };
}

test("masterplan zones are contiguous: no gaps and no overlaps between downtown, boulevard, seawall and beach", async () => {
  const { ZONE } = await loadMasterplan();
  const bounds = [
    ["downtown core", ZONE.ISLAND_Z_MIN, ZONE.DOWNTOWN_Z_MAX],
    ["boulevard + tram", ZONE.DOWNTOWN_Z_MAX, ZONE.SEAWALL_Z_MIN],
    ["seawall", ZONE.SEAWALL_Z_MIN, ZONE.SEAWALL_Z_MAX],
    ["beach", ZONE.SEAWALL_Z_MAX, ZONE.BEACH_Z_MAX],
  ] as [string, number, number][];
  for (const [name, zMin, zMax] of bounds) {
    assert.ok(zMax > zMin, `${name} must have positive depth, got ${zMin} -> ${zMax}`);
  }
  for (let i = 0; i < bounds.length - 1; i++) {
    const [aName, , aMax] = bounds[i];
    const [bName, bMin] = bounds[i + 1];
    assert.equal(aMax, bMin, `${aName} must meet ${bName} exactly -- ${aMax} vs ${bMin} is a gap or an overlap`);
  }
});

test("the whole island -- downtown, boulevard AND beach -- is genuinely flat, not a ramp into the sea", async () => {
  const { ZONE, terrainHeightAt } = await loadMasterplan();
  // Only the deliberate planetary-curvature roll is allowed. Anything larger
  // means the seabed slope is interpolating back into the land, which is what
  // sank the promenade to -0.29m and put the beach under the waterline.
  const CURVATURE_TOLERANCE = 0.02;
  let worst = 0;
  let worstAt = "";
  for (let z = ZONE.ISLAND_Z_MIN; z <= ZONE.BEACH_Z_MAX; z += 0.5) {
    for (const x of [0, -40, 40, -ZONE.ISLAND_X_HALF + 1, ZONE.ISLAND_X_HALF - 1]) {
      const y = Math.abs(terrainHeightAt(x, z));
      if (y > worst) { worst = y; worstAt = `(${x}, ${z})`; }
    }
  }
  assert.ok(
    worst <= CURVATURE_TOLERANCE,
    `island must be flat within ${CURVATURE_TOLERANCE}m; worst deviation ${worst.toFixed(3)}m at ${worstAt}`
  );
});

test("guardrail: the flatness check actually fails when the seabed slope reaches into the land", async () => {
  // Plant the exact defect: a slope that starts at the shoreline instead of out
  // at sea. If this does not throw, the test above proves nothing.
  const broken = (x: number, z: number) => (z > 22 ? -3.4 * Math.min(1, (z - 22) / 24) : 0);
  let sawViolation = false;
  for (let z = -15; z <= 30; z += 0.5) {
    if (Math.abs(broken(0, z)) > 0.02) sawViolation = true;
  }
  assert.ok(sawViolation, "planted seabed-into-land defect must be detected by this bound");
});

test("open water never reaches north of the beach edge, and the seabed only drops out at sea", async () => {
  const { ZONE, terrainHeightAt } = await loadMasterplan();
  assert.ok(
    ZONE.OCEAN_FLOOR_START > ZONE.BEACH_Z_MAX,
    `the seabed slope must begin south of the beach edge, else vertex interpolation drags the shoreline under: ` +
      `OCEAN_FLOOR_START ${ZONE.OCEAN_FLOOR_START} vs BEACH_Z_MAX ${ZONE.BEACH_Z_MAX}`
  );
  // Dry at the beach edge, genuinely deep further out.
  assert.ok(terrainHeightAt(0, ZONE.BEACH_Z_MAX) > -0.02, "the beach edge must be at or above the waterline");
  assert.ok(terrainHeightAt(0, 60) < -1.5, "open sea must be genuinely deep, not a shallow shelf");
});

test("the road carriageway and the tram corridor both sit on land, inside the boulevard zone", async () => {
  const { ZONE, terrainHeightAt, src } = await loadMasterplan();
  const road = src.match(/roadMesh\.position\.set\(0,\s*[\d.]+,\s*([\d.]+)\)/);
  assert.ok(road, "the carriageway must be placed via roadMesh.position.set");
  const roadZ = Number(road![1]);
  assert.ok(
    roadZ > ZONE.DOWNTOWN_Z_MAX && roadZ < ZONE.SEAWALL_Z_MIN,
    `carriageway centreline ${roadZ} must lie inside the boulevard zone ${ZONE.DOWNTOWN_Z_MAX} -> ${ZONE.SEAWALL_Z_MIN}`
  );
  // Same flat ground as downtown, allowing only the deliberate curvature roll --
  // an exact-equality assert here fails on a 0.2mm difference that is by design.
  const drop = Math.abs(terrainHeightAt(0, roadZ) - terrainHeightAt(0, 0));
  assert.ok(drop < 0.02, `the carriageway must be on the same flat ground as downtown; differs by ${drop.toFixed(4)}m`);

  // The tram is a SEPARATE corridor in the masterplan, not a rail laid down the
  // middle of the traffic lanes. It must be derived from ZONE (so it cannot
  // drift), and its physical body must clear the carriageway and the seawall.
  assert.match(
    src,
    /tramTrackGroup\.position\.set\(0,\s*0,\s*TRAM_CENTRE_Z\)/,
    "the tram must be positioned from the zoning, not a hardcoded z"
  );
  const tramZ = (ZONE.TRAM_Z_MIN + ZONE.PROMENADE_Z_MIN) / 2;
  const TRAM_BODY_DEPTH = 1.7;
  const tramNear = tramZ - TRAM_BODY_DEPTH / 2;
  const tramFar = tramZ + TRAM_BODY_DEPTH / 2;
  assert.ok(
    tramNear > ZONE.MEDIAN_Z_MIN,
    `the tram body must not reach into the carriageway: body starts ${tramNear}, carriageway ends ${ZONE.MEDIAN_Z_MIN}`
  );
  assert.ok(
    tramFar < ZONE.SEAWALL_Z_MIN,
    `the tram body must not reach into the seawall: body ends ${tramFar}, seawall starts ${ZONE.SEAWALL_Z_MIN}`
  );
});

test("guardrail: the tram-clearance check actually fails when the tram is put back in the traffic lanes", async () => {
  const { ZONE } = await loadMasterplan();
  // The exact shipped defect: tram centred at z = 10.1, inside the carriageway.
  const brokenTramZ = 10.1;
  const near = brokenTramZ - 1.7 / 2;
  assert.ok(
    !(near > ZONE.MEDIAN_Z_MIN),
    "a tram at z=10.1 must be caught as overlapping the carriageway -- if this passes, the check above proves nothing"
  );
});

test("the tuned render values are what they are meant to be", async () => {
  // THIS USED TO MATCH THIS FILE'S OWN SOURCE TEXT.
  //
  // Eleven regexes against world-render-3d.js as a string, including one that
  // matched a COMMENT ("Triangulated Warren / Pratt timber truss assemblies").
  // Those fail on a reformat and pass on any behavioural change that keeps the
  // spelling — the opposite of what a test is for, and contradicted by this
  // file's own argument a hundred lines above that a test checking a string is
  // not checking the property.
  //
  // The three numeric ones are now named constants, so this reads the value.
  const { RENDER_TUNING } = await import("../public/world-render-3d.js");
  assert.equal(RENDER_TUNING.SUN_INTENSITY, 2.15, "sun base intensity");
  assert.equal(RENDER_TUNING.SHADOW_BIAS, -0.00018, "shadow bias must stay tight for PCFSoft");
  // BLOOM IS NO LONGER A LITERAL HERE, AND THE OLD REASON WAS WRONG.
  //
  // This asserted { 0.02, 0.12, 0.99 } "or fog blows out". There was no fog: the
  // haze everyone was looking at turned out to be the VIGNETTE mixing toward
  // grey 0.55, which is fixed. So the stated reason was a rationalisation of
  // three numbers nobody had tuned, and it was keeping bloom effectively off --
  // a threshold of 0.99 means almost nothing in the scene qualifies at all.
  //
  // What is worth asserting is not the values but the PROPERTY: that the two
  // pages bloom the same world the same way. So the renderer must use the shared
  // constant, not a copy of it.
  const { BLOOM } = await import("../public/colour-grade.js");
  assert.equal(RENDER_TUNING.BLOOM, BLOOM,
    "the renderer must use the shared BLOOM, not its own copy -- two pages that " +
    "bloom differently is the defect the shared colour grade already fixed once");
  assert.ok(BLOOM.threshold > 1.0,
    `bloom threshold is in LINEAR HDR before tone mapping; at ${BLOOM.threshold} ` +
    "almost every lit surface in daylight would qualify and the city goes to milk");

  // The rest of the old assertions checked that named helpers and geometry
  // exist. That is a real property, but a source-text match is not how to check
  // it, and there is no headless WebGL here to check it behaviourally. Rather
  // than keep a test that cannot fail for the right reason, it is recorded as a
  // gap in docs/AUDIT-LEDGER.md (finding 1.14) and dropped.
});
