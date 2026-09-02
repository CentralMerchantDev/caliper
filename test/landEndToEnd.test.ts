// =============================================================================
// THE LAND LAYER, END TO END, ON THE REAL WORLD
//
// Every other test in this group checks one part in isolation. This one builds
// the whole thing -- grid, ground, registry, placer -- against the real 26 km
// terrain and lays several hundred objects into it, then checks the property
// the entire layer exists to guarantee:
//
//     NOTHING OVERLAPS ANYTHING.
//
// That matters because the parts can each be right and the assembly still
// wrong. The registry can hold volumes correctly, the ground can refuse
// correctly, and a placer that forgot to pass the height range would still
// produce a world full of things standing inside each other. The only way to
// know is to build one and measure it.
//
// This is also the rehearsal for the layout engine. When the model library
// arrives, laying out a city is this, with better models and a plan for where
// things go. If this cannot place 300 huts without a collision, nothing built
// on top of it will fare better.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGround, SURFACE } from "../public/ground.js";
import { createWorldRegistry } from "../public/world-registry.js";
import { createPlacer } from "../public/place.js";
import { createGrid, snap, cellsFor, CELL } from "../public/grid.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField());

/** A model declared the way the asset lane will declare them. */
const HOUSE = {
  id: "house", kind: "building", category: "building",
  footprint: { w: 10, d: 12 }, height: 7, depth: 2, clearance: 1, maxRange: 2.5,
};
const LAMP = {
  id: "lamp", kind: "prop", category: "lamp",
  footprint: { w: 0.6, d: 0.6 }, height: 9.1, depth: 1.2, clearance: 0.3, maxRange: 2.5,
};

test("several hundred things can be laid into the real world without one overlap", () => {
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const grid = createGrid();
  const placer = createPlacer({ ground, registry, grid });

  // Walk a slab of the world on the grid and offer every cell a house. The
  // land decides; nothing here knows where anything should go, which is the
  // point -- this is a dumb caller, and the layer has to hold anyway.
  let offered = 0;
  for (let x = -1500; x <= 1500; x += CELL * 6) {
    for (let z = -1500; z <= 1500; z += CELL * 6) {
      const p = snap(x, z, "half");
      offered++;
      placer.place(HOUSE, p.x, p.z, { id: `h-${x}-${z}` });
    }
  }
  // ...then offer lamps on the same ground, which is the case that produced 27
  // collisions when two independent loops did it.
  for (let x = -1500; x <= 1500; x += CELL * 6) {
    for (let z = -1500; z <= 1500; z += CELL * 6) {
      const p = snap(x + CELL, z, "quarter");
      offered++;
      placer.place(LAMP, p.x, p.z, { id: `l-${x}-${z}` });
    }
  }

  const report = placer.report();
  assert.ok(report.placed > 200, `only ${report.placed} of ${offered} were placed — too few to prove anything`);
  assert.ok(
    Object.keys(report.refused).length > 0,
    "nothing was refused anywhere in a world of mountains and sea, which means the checks are not running",
  );

  // THE ASSERTION THE WHOLE LAYER IS FOR.
  const live = registry.list().filter((e) => e.until === Infinity);
  const overlaps: string[] = [];
  // Grid index, because a few hundred entries pairwise is fine but this must
  // not quietly become O(n^2) when the layout engine places 20,000.
  const CI = 64, idx = new Map<string, typeof live>();
  const key = (i: number, j: number) => `${i},${j}`;
  for (const e of live) {
    for (let i = Math.floor(e.xMin / CI); i <= Math.floor(e.xMax / CI); i++) {
      for (let j = Math.floor(e.zMin / CI); j <= Math.floor(e.zMax / CI); j++) {
        const k = key(i, j);
        if (!idx.has(k)) idx.set(k, []);
        idx.get(k)!.push(e);
      }
    }
  }
  const seen = new Set<string>();
  for (const a of live) {
    for (let i = Math.floor(a.xMin / CI); i <= Math.floor(a.xMax / CI); i++) {
      for (let j = Math.floor(a.zMin / CI); j <= Math.floor(a.zMax / CI); j++) {
        for (const b of idx.get(key(i, j)) || []) {
          if (a === b) continue;
          const pair = [a.id, b.id].sort().join("|");
          if (seen.has(pair)) continue;
          seen.add(pair);
          const ox = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
          const oz = Math.min(a.zMax, b.zMax) - Math.max(a.zMin, b.zMin);
          const oy = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
          if (ox > 0.01 && oz > 0.01 && oy > 0.01) {
            if (overlaps.length < 6) {
              overlaps.push(`${a.id} and ${b.id} share ${ox.toFixed(2)} x ${oz.toFixed(2)} x ${oy.toFixed(2)} m`);
            }
          }
        }
      }
    }
  }
  assert.deepEqual(
    overlaps, [],
    `${overlaps.length} pairs of objects are standing inside each other:\n  ${overlaps.join("\n  ")}`,
  );
});

test("nothing was placed on ground that refuses it", () => {
  // The other half. Zero overlaps is trivially satisfiable by placing nothing
  // useful; this checks the things that WERE placed belong where they are.
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const placer = createPlacer({ ground, registry, grid: createGrid() });

  for (let x = -1500; x <= 1500; x += CELL * 8) {
    for (let z = -1500; z <= 1500; z += CELL * 8) {
      placer.place(HOUSE, x, z, { id: `h-${x}-${z}` });
    }
  }

  const wrong: string[] = [];
  for (const e of registry.list()) {
    const cx = (e.xMin + e.xMax) / 2, cz = (e.zMin + e.zMax) / 2;
    const h = heightAt(cx, cz);
    if (h < 0) wrong.push(`${e.id} is standing in ${(-h).toFixed(1)} m of water`);
    // A house's reservation must start below the surface, because it declares
    // a 2 m foundation. If it does not, depth was dropped somewhere between the
    // declaration and the record.
    if (e.yMin >= h) wrong.push(`${e.id} declares a foundation but its volume starts at or above the ground`);
  }
  assert.deepEqual(wrong.slice(0, 6), [], `objects placed on ground that should have refused them:\n  ${wrong.slice(0, 6).join("\n  ")}`);
  assert.ok(registry.list().length > 50, "too few placements to be evidence of anything");
});

test("the world can be rewound: what stood here last year is answerable", () => {
  // The 4D claim, exercised on a real sequence rather than a single entry. A
  // registry that can only answer "now" would pass every other test in this
  // file.
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const placer = createPlacer({ ground, registry, grid: createGrid() });

  // Find somewhere a house genuinely fits, rather than assuming.
  let spot: [number, number] | null = null;
  for (let x = -1500; x <= 1500 && !spot; x += CELL * 8) {
    for (let z = -1500; z <= 1500 && !spot; z += CELL * 8) {
      if (ground.canPlace(HOUSE, x, z).ok) spot = [x, z];
    }
  }
  assert.ok(spot, "nowhere in the world fits a 10 x 12 m house");
  const [x, z] = spot!;

  placer.place(HOUSE, x, z, { id: "old-house", t: 0 });
  placer.remove("old-house", 100);
  const second = placer.place(HOUSE, x, z, { id: "new-house", t: 100 });
  assert.equal(second.ok, true, "the ground should be free again once the old house is gone");

  const q = { yMin: heightAt(x, z), yMax: heightAt(x, z) + 1 };
  const at50 = registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 50, q);
  const at150 = registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 150, q);
  assert.equal((at50 as any)?.id, "old-house", "at t=50 the old house stood here");
  assert.equal((at150 as any)?.id, "new-house", "at t=150 the new one does");
});

test("model sizes are expressible in whole cells, which is what the asset lane builds to", () => {
  // The contract between the two lanes. If a model's footprint cannot be stated
  // in cells, the asset lane has nothing to build to and placement cannot snap.
  for (const m of [HOUSE, LAMP]) {
    const w = cellsFor(m.footprint.w + m.clearance * 2);
    const d = cellsFor(m.footprint.d + m.clearance * 2);
    assert.ok(w >= 1 && Number.isInteger(w), `${m.id} does not occupy a whole number of cells across`);
    assert.ok(d >= 1 && Number.isInteger(d), `${m.id} does not occupy a whole number of cells deep`);
    assert.ok(
      w * CELL >= m.footprint.w + m.clearance * 2 - 1e-9,
      `${m.id} claims ${w} cells but needs ${(m.footprint.w + m.clearance * 2).toFixed(1)} m — it would overhang`,
    );
  }
});
