// =============================================================================
// B1 -- measure water fraction, dry-land area and island size distribution
// against the real height field, the same way any other "how big is this
// world" figure in this project is measured: sample the real artefact, not
// a declared field. Used by test/landCoverage.test.ts and runnable
// standalone for a quick check while shaping.
//
//   node scripts/measure-land.mjs
// =============================================================================
import { LandField, makeHeightAt, landmassPolygonsDesign } from "../public/terrain.js";
import { WORLD } from "../public/city-plan.js";

function shoelaceAreaM2(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

/**
 * @param {number} [step] sample grid spacing, world metres. 100 m over a
 *        26 km world is 260x260 = 67,600 samples -- fine enough that a
 *        step-sized error is a rounding error, not a real one, and cheap
 *        enough to run inside a test (no world/render build needed at all,
 *        LandField is pure and fast).
 */
export function measureLand(step = 100) {
  const field = new LandField(16);
  const heightAt = makeHeightAt(field);

  // Sample over the REAL world bounds (WORLD.SIZE), not the polygon data,
  // which includes far-out backdrop corners well beyond the modelled/
  // playable world (the mainland's own closing corners sit tens of
  // kilometres past WORLD.SIZE, closing the terrain mesh against the
  // horizon -- real, but not "land" in the sense a coverage figure means).
  const half = WORLD.SIZE / 2;
  let dryCount = 0, totalCount = 0;
  for (let x = -half; x < half; x += step) {
    for (let z = -half; z < half; z += step) {
      totalCount++;
      if (heightAt(x, z) > 0) dryCount++;
    }
  }
  const cellAreaKm2 = (step * step) / 1e6;
  const dryAreaKm2 = dryCount * cellAreaKm2;
  const totalAreaKm2 = totalCount * cellAreaKm2;
  const waterFraction = 1 - dryCount / totalCount;

  // Per-mass polygon area, in WORLD km2 (design area * WORLD_SCALE^2) --
  // meaningful for every mass except mainland, whose own polygon
  // deliberately extends past WORLD.SIZE to close the terrain mesh, so it
  // is reported separately, not folded into the island size distribution.
  const WORLD_SCALE = WORLD.SIZE / 40000; // re-derived, not imported, so this script trusts no logic but its own arithmetic and the real WORLD.SIZE
  const masses = landmassPolygonsDesign(10);
  const perMass = masses.map((m) => ({
    id: m.id, kind: m.kind,
    worldAreaKm2: (shoelaceAreaM2(m.polygon) * WORLD_SCALE * WORLD_SCALE) / 1e6,
  }));
  const namedIslands = perMass.filter((m) => m.kind !== "mainland").sort((a, b) => b.worldAreaKm2 - a.worldAreaKm2);
  const mainland = perMass.find((m) => m.kind === "mainland");

  return {
    waterFraction,
    dryAreaKm2: Math.round(dryAreaKm2 * 10) / 10,
    totalAreaKm2: Math.round(totalAreaKm2 * 10) / 10,
    islandCount: namedIslands.length,
    largestIslandKm2: namedIslands[0] ? Math.round(namedIslands[0].worldAreaKm2 * 10) / 10 : 0,
    smallestIslandKm2: namedIslands.length ? Math.round(namedIslands[namedIslands.length - 1].worldAreaKm2 * 100) / 100 : 0,
    mainlandFullPolygonWorldAreaKm2: mainland ? Math.round(mainland.worldAreaKm2 * 10) / 10 : null,
    islands: namedIslands.map((m) => ({ id: m.id, kind: m.kind, worldAreaKm2: Math.round(m.worldAreaKm2 * 100) / 100 })),
  };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("measure-land.mjs")) {
  const r = measureLand();
  console.log(`water fraction: ${(r.waterFraction * 100).toFixed(1)}%`);
  console.log(`dry land: ${r.dryAreaKm2} km2 of ${r.totalAreaKm2} km2`);
  console.log(`islands (excl. mainland): ${r.islandCount}, largest ${r.largestIslandKm2} km2, smallest ${r.smallestIslandKm2} km2`);
  console.log(`mainland's own full polygon (incl. backdrop past WORLD.SIZE): ${r.mainlandFullPolygonWorldAreaKm2} km2`);
  console.log(JSON.stringify(r.islands, null, 1));
}
