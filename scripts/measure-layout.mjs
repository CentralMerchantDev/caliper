// MEASURE THE LAYOUT AGAINST THE REAL WORLD.
//
// The unit tests prove the layout engine's decisions are the decisions it claims
// to make. They do not prove it produces a CITY, because they run on eight
// fixture plots. This runs it over the real 26 km world -- every block, every
// plot, the real terrain -- and prints what came out.
//
// The numbers that matter, and why each one is here:
//
//   - REFUSALS BY REASON. A layout that refuses most of the world would still
//     pass every unit test. This is the check that it did not.
//   - TYPOLOGY MIX. If one typology takes nearly everything, the city is clones
//     wearing different names.
//   - CHARACTER SPREAD, and specifically HOW MANY BLOCKS ARE INTERNALLY MIXED.
//     That number must be zero: it is the anti-clone decision, measured on the
//     real world rather than on a fixture.
//   - ROW POSITIONS. Middles should outnumber ends heavily in a terraced city;
//     if ends dominate, rows are being read as one-plot rows somewhere.
//
// Run: node scripts/measure-layout.mjs

import { generateWorld } from "../public/city-plan.js";
import { assessFootprint } from "../public/footprint.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { planCity } from "../public/layout.js";

// THE REAL TERRAIN, OR NOTHING.
//
// The first version of this script called `generateWorld()` with no arguments
// and then asked `world.heightAt` for the ground. generateWorld does not return
// a height function, so that was undefined, and a fallback quietly answered
// "slab" for all 20,120 plots. The script then printed "FOUNDATIONS (from the
// real terrain): 100% slab" and "REFUSED 0" -- a flat world reported as a
// measurement of a mountainous one, under a heading asserting the opposite.
//
// That is finding 2.12(c) in the audit ledger happening again, in the tool
// written to check the fix. So there is no fallback now: the height function is
// built here, passed to generateWorld so the plan and the layout see the SAME
// ground, and its absence would be a crash rather than a comforting number.
const heightAt = makeHeightAt(new LandField(16));

const t0 = Date.now();
const world = generateWorld(heightAt);
const tPlan = Date.now() - t0;

const blocks = world.blocks || [];
const plots = world.plots || [];
console.log(`world: ${blocks.length} blocks, ${plots.length} plots, built in ${tPlan} ms\n`);

// The layout meets the ground through exactly the same `assessFootprint` the
// placement path uses. Not a reimplementation of it, and not an approximation:
// the same function, so a disagreement here would be a real disagreement.
let verdictCalls = 0;
function verdictFor(plot) {
  verdictCalls++;
  const b = plot.buildable || plot;
  const r = assessFootprint(heightAt, {
    xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax,
  });
  return r.verdict;
}

const t1 = Date.now();
const { placements, stats } = planCity(blocks, plots, verdictFor);
const tLayout = Date.now() - t1;

console.log(`layout: ${tLayout} ms for ${plots.length} plots (${verdictCalls} terrain queries)\n`);

console.log(`PLACED   ${stats.placed} of ${stats.plots}  (${(100 * stats.placed / Math.max(1, stats.plots)).toFixed(1)}%)`);
console.log(`REFUSED  ${stats.refused}`);
for (const [why, n] of Object.entries(stats.refusedWhy).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${why}`);
}

console.log("\nTYPOLOGY MIX");
const totalPlaced = Math.max(1, stats.placed);
for (const [t, n] of Object.entries(stats.byTypology).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlaced).toFixed(1).padStart(5)}%  ${t}`);
}

console.log("\nCHARACTER SPREAD");
for (const [c, n] of Object.entries(stats.byCharacter).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlaced).toFixed(1).padStart(5)}%  ${c}`);
}

// THE ANTI-CLONE MEASUREMENT.
//
// Every building on a block must share one era. This counts blocks that carry
// more than one, on the real world. It is not a sample: it is all of them.
const charByBlock = new Map();
for (const p of placements) {
  if (!charByBlock.has(p.blockId)) charByBlock.set(p.blockId, new Set());
  charByBlock.get(p.blockId).add(p.situation.character);
}
const mixed = [...charByBlock.entries()].filter(([, s]) => s.size > 1);
console.log(`\nBLOCKS WITH MIXED CHARACTER: ${mixed.length} of ${charByBlock.size}   (must be 0)`);
if (mixed.length) {
  for (const [id, s] of mixed.slice(0, 5)) console.log(`   ${id}: ${[...s].join(", ")}`);
}

// And the other half of the claim: the city as a whole is NOT one era.
console.log(`DISTINCT CHARACTERS ACROSS BLOCKS: ${new Set([...charByBlock.values()].flatMap((s) => [...s])).size} of 4`);

console.log("\nROW POSITIONS");
const byPos = {};
for (const p of placements) byPos[p.situation.position] = (byPos[p.situation.position] || 0) + 1;
for (const [k, n] of Object.entries(byPos).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlaced).toFixed(1).padStart(5)}%  ${k}`);
}

console.log("\nFOUNDATIONS (from the real terrain)");
const byFound = {};
for (const p of placements) byFound[p.options.foundation] = (byFound[p.options.foundation] || 0) + 1;
for (const [k, n] of Object.entries(byFound).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlaced).toFixed(1).padStart(5)}%  ${k}`);
}

console.log("\nCORNERS");
const corners = placements.filter((p) => p.situation.corner !== "none").length;
console.log(`   ${corners} of ${stats.placed} placements turn a corner (${(100 * corners / totalPlaced).toFixed(1)}%)`);
