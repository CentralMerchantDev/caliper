// BUILD EVERY VARIANT THE LAYOUT ASKS FOR, AND MEASURE IT.
//
// The layout engine emits a spec -- a typology, a seed and an options object --
// and the renderer is supposed to hand that to `building()`. Nothing has ever
// checked that the asset lane can actually BUILD what the layout asks for, or
// that what comes back fits the plot it was chosen for.
//
// This is the pre-flight for wiring the two together, and it runs in plain node:
// `building()` returns a BufferGeometry, and geometry is arithmetic. No WebGL,
// no browser, no screenshot. What it cannot check is what the city LOOKS like;
// that needs `node scripts/shoot-app.mjs` and a real browser.
//
// The questions, in the order they would bite:
//
//   1. Does every variant build at all, without throwing?
//   2. Does the geometry match the footprint the model DECLARES? A model that
//      lies about its size defeats every placement check downstream, because
//      those checks read the declaration, not the mesh.
//   3. Does the building fit the plot the layout chose it for? This is the one
//      that is genuinely unknown: cellW is seed-derived, so a typology can size
//      itself larger than the plot it was picked for.
//   4. What does the whole city cost in triangles?
//
// Run: node scripts/check-layout-geometry.mjs

import { generateWorld } from "../public/city-plan.js";
import { assessFootprint } from "../public/footprint.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { planCity, groupByVariant, terraceUnitsFor } from "../public/layout.js";
import { building } from "../public/buildings.js";

// DOES THIS TYPOLOGY FIT THIS PLOT?
//
// The layout cannot answer this itself: a typology's cellW is derived from its
// seed inside buildings.js, so only buildings.js knows how big the thing will
// be. Rather than keep a copy of those sizes in layout.js -- a second table
// that would have to agree with the first -- the layout takes this predicate
// and asks.
//
// The spec is built with the SAME seed and options the renderer will use, so
// this is the real size, not a sample or an estimate. Only `footprint` is read,
// and `building()` computes that without touching geometry, so it is cheap.
const fitCache = new Map();
export function makeFits() {
  return function fits(typology, situation) {
    const options = {
      corner: situation.corner,
      position: situation.position,
      foundation: situation.foundation,
      character: situation.character,
    };
    // Row typologies take a unit count, and it changes their width, so the
    // question has to be asked about the building that would actually be built.
    if (typology === "bld-terrace") options.units = terraceUnitsFor(situation.fits.w);
    const key = [typology, options.position, options.corner, options.foundation, options.character, `u${options.units || 0}`].join("|");

    let fp = fitCache.get(key);
    if (!fp) {
      try {
        fp = building(typology, key, options).footprint;
      } catch {
        // A typology that cannot even be described is not a typology that fits.
        fp = { w: Infinity, d: Infinity };
      }
      fitCache.set(key, fp);
    }
    return fp.w <= situation.fits.w + 1e-6 && fp.d <= situation.fits.d + 1e-6;
  };
}

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const verdictFor = (plot) => {
  const b = plot.buildable || plot;
  return assessFootprint(heightAt, { xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax }).verdict;
};

const { placements, stats } = planCity(world.blocks, world.plots, verdictFor, makeFits());
const groups = groupByVariant(placements);
console.log(`${placements.length} placements -> ${groups.size} variants to build\n`);

let built = 0;
const failed = [];
const misdeclared = [];
let triangles = 0;
let cityTriangles = 0;

const t0 = Date.now();
for (const g of groups.values()) {
  let spec;
  try {
    spec = building(g.typology, g.seed, g.options);
  } catch (e) {
    failed.push({ key: g.key, why: `building() threw: ${e.message}` });
    continue;
  }

  const lod0 = spec.lod && spec.lod[0];
  if (!lod0 || typeof lod0.createGeometry !== "function") {
    failed.push({ key: g.key, why: "no LOD0 createGeometry" });
    continue;
  }

  let geo;
  try {
    geo = lod0.createGeometry();
  } catch (e) {
    failed.push({ key: g.key, why: `createGeometry threw: ${e.message}` });
    continue;
  }
  if (!geo || !geo.attributes || !geo.attributes.position) {
    failed.push({ key: g.key, why: "createGeometry returned no positions" });
    continue;
  }

  built++;
  const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  triangles += tris;
  cityTriangles += tris * g.placements.length;

  // WHAT IT DRAWS VS WHAT IT CLAIMS.
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const gw = bb.max.x - bb.min.x;
  const gd = bb.max.z - bb.min.z;
  const dw = spec.footprint.w;
  const dd = spec.footprint.d;
  // A 0.6 m tolerance: chimneys, stoops and door canopies legitimately project
  // a little past the body, and the declared footprint is the BODY.
  const TOL = 0.6;
  if (gw > dw + TOL || gd > dd + TOL) {
    misdeclared.push({ key: g.key, declared: `${dw}x${dd}`, drawn: `${gw.toFixed(1)}x${gd.toFixed(1)}` });
  }

  g._spec = spec;
  g._tris = tris;
  geo.dispose && geo.dispose();
}
const tBuild = Date.now() - t0;

console.log(`BUILT      ${built} of ${groups.size} variants in ${tBuild} ms`);
console.log(`FAILED     ${failed.length}`);
for (const f of failed.slice(0, 10)) console.log(`   ${f.key}\n      ${f.why}`);

console.log(`\nDECLARED FOOTPRINT vs DRAWN GEOMETRY: ${misdeclared.length} disagree`);
for (const m of misdeclared.slice(0, 10)) console.log(`   ${m.key}\n      declares ${m.declared}, draws ${m.drawn}`);

// THE ONE THAT IS GENUINELY UNKNOWN.
//
// cellW and cellD are derived from the seed inside buildings.js and cannot be
// driven from options, so a typology can size itself larger than the plot the
// layout picked it for. Every such case is a building overhanging its own plot,
// which place.js would refuse -- after the work of building it.
let overhang = 0, fits = 0;
const worst = [];
for (const g of groups.values()) {
  if (!g._spec) continue;
  for (const p of g.placements) {
    const need = g._spec.footprint;
    if (need.w <= p.fits.w + 1e-6 && need.d <= p.fits.d + 1e-6) { fits++; continue; }
    overhang++;
    if (worst.length < 6) {
      worst.push(`${g.typology} needs ${need.w}x${need.d} on a ${p.fits.w.toFixed(1)}x${p.fits.d.toFixed(1)} plot (${p.plotId})`);
    }
  }
}
console.log(`\nDOES THE BUILDING FIT ITS PLOT?`);
console.log(`   fits      ${fits}`);
console.log(`   overhangs ${overhang}   (${(100 * overhang / Math.max(1, fits + overhang)).toFixed(1)}%)`);
for (const w of worst) console.log(`      ${w}`);

console.log(`\nCOST`);
console.log(`   ${triangles.toLocaleString()} triangles across ${built} distinct geometries`);
console.log(`   ${Math.round(cityTriangles).toLocaleString()} triangles drawn for the whole city`);
console.log(`   ${groups.size} InstancedMeshes (one per variant)`);
console.log(`\n(plots ${stats.plots}, placed ${stats.placed}, refused ${stats.refused})`);

if (failed.length) process.exitCode = 1;
