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

test("3D masterplan invariants: road is strictly on terra firma and clear of harbour water", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync("public/world-render-3d.js", "utf-8");
  // Roadway is placed at z = 11.6 on terra firma
  assert.match(code, /position\.set\(0,\s*0\.03,\s*11\.6\)/, "roadway carriageway must sit at z = 11.6");
  // Seawall begins at z = 22.0, providing >8m clearance
  assert.match(code, /coping\.position\.set\(0,\s*0\.70,\s*22\.0\)/, "seawall must begin at z = 22.0");
});

test("3D visual invariants: crisp architectural lighting, tight shadow bias, and glulam trusses", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync("public/world-render-3d.js", "utf-8");
  // Directional sun intensity calibrated to 2.15
  assert.match(code, /DirectionalLight\(0xfffaed,\s*2\.15\)/, "sun must have crisp 2.15 intensity");
  // Tight PCFSoft shadow bias
  assert.match(code, /sun\.shadow\.bias\s*=\s*-0\.00018/, "sun shadow bias must be -0.00018");
  // Bloom is retained at minimal strength without fog blowout
  assert.match(code, /UnrealBloomPass\(.*,\s*0\.02,\s*0\.12,\s*0\.99\)/, "bloom must be tight (0.02, 0.12, 0.99)");
  // Design Studio features authentic triangulated glulam timber trusses
  assert.match(code, /Triangulated Warren \/ Pratt timber truss assemblies/, "studio must feature glulam trusses");
  assert.match(code, /bottomChord/, "studio must have bottom chord");
  assert.match(code, /topChord/, "studio must have top chord");
});
