// MEASURE THE WORLD'S DENSITY, SO A CLAIM ABOUT IT IS A MEASUREMENT.
//
// docs/audits/WORLD-DENSITY-FINDINGS.md was written against throwaway scripts
// -- real, run, but never committed, so nobody after that session could
// re-take the same numbers without re-inventing the same scripts. This is
// that tool, committed, so "the world is inverted" is something anyone can
// re-check with one command rather than something that has to be believed.
//
// docs/specs/WORLD-REBALANCE-BRIEF.md, step 1: this script's output on
// today's world must reproduce sections 1-4 of the findings doc. If it does
// not, that is reported below rather than silently accepted -- a disagreement
// here means the audit needs re-grounding before anything is built on it.
//
// Run: node scripts/measure-density.mjs

import { generateWorld, PLOT_CLASSES } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const plots = world.plots || [];
const settlements = world.settlements || [];

console.log(`world: ${plots.length} plots across ${settlements.length} settlements\n`);

// -----------------------------------------------------------------------
// 1. PLOTS BY LANDMASS
//
// A plot carries `settlement` (the id of whatever generated it); a
// settlement carries `landmass`. Joining the two is the only way to ask
// "how much of the city is on which piece of land" -- nothing in the plan
// tags a plot with its landmass directly, on purpose: the landmass is a
// fact about the settlement that placed it, not a second copy stored on
// every plot that could drift from the first.
// -----------------------------------------------------------------------
const landmassBySettlement = new Map(settlements.map((s) => [s.id, s.landmass]));
const plotsByLandmass = new Map();
for (const p of plots) {
  const lm = landmassBySettlement.get(p.settlement) || `(unknown settlement: ${p.settlement})`;
  plotsByLandmass.set(lm, (plotsByLandmass.get(lm) || 0) + 1);
}
console.log("1. PLOTS BY LANDMASS");
const totalPlots = plots.length;
for (const [lm, n] of [...plotsByLandmass.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlots).toFixed(1).padStart(5)}%  ${lm}`);
}

// -----------------------------------------------------------------------
// 2. PLOTS PER SETTLEMENT, WITH AREA AND PER-KM^2 DENSITY
//
// Area is the bounding box of the settlement's OWN placed plots, not the
// declared or fitted growth envelope -- that number lives inside
// fitSettlements()'s local `boxes` array and generateWorld() does not
// return it, so re-deriving it here would mean re-running the fit pass a
// second time and hoping it agrees with the one already baked into the
// plots. The bounding box of what was actually built is unambiguous, needs
// no re-derivation, and is arguably the more honest "how dense is this
// place" number: it cannot overstate area by including margin nothing was
// ever placed in.
// -----------------------------------------------------------------------
const bySettlement = new Map();
for (const p of plots) {
  let e = bySettlement.get(p.settlement);
  if (!e) { e = { count: 0, xMin: Infinity, xMax: -Infinity, zMin: Infinity, zMax: -Infinity }; bySettlement.set(p.settlement, e); }
  e.count++;
  e.xMin = Math.min(e.xMin, p.xMin); e.xMax = Math.max(e.xMax, p.xMax);
  e.zMin = Math.min(e.zMin, p.zMin); e.zMax = Math.max(e.zMax, p.zMax);
}
console.log("\n2. PLOTS PER SETTLEMENT (area = bounding box of its own placed plots)");
const settlementRows = [...bySettlement.entries()].map(([id, e]) => {
  const s = settlements.find((x) => x.id === id);
  const areaKm2 = Math.max(1e-9, (e.xMax - e.xMin) * (e.zMax - e.zMin) / 1e6);
  return { id, name: s ? s.name : id, cls: s ? s.cls : "?", count: e.count, areaKm2, perKm2: e.count / areaKm2 };
}).sort((a, b) => b.count - a.count);
for (const r of settlementRows) {
  console.log(`   ${r.id.padEnd(22)} ${(r.name || "").padEnd(16)} ${String(r.cls).padEnd(10)} ${String(r.count).padStart(5)} plots  ${r.areaKm2.toFixed(2).padStart(6)} km2  ${r.perKm2.toFixed(1).padStart(6)} /km2`);
}

// -----------------------------------------------------------------------
// 3. PLOT className MIX -- the PLOT_CLASSES key each plot was carved as,
// not the typology the layout engine later chose to build on it.
// -----------------------------------------------------------------------
const byClassName = new Map();
for (const p of plots) byClassName.set(p.className, (byClassName.get(p.className) || 0) + 1);
console.log("\n3. PLOT className MIX (as carved, not as built)");
for (const [cls, n] of [...byClassName.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlots).toFixed(1).padStart(5)}%  ${cls}`);
}

// Downtown specifically -- the findings doc's section 2 table.
const downtownByClass = new Map();
for (const p of plots) {
  if (p.settlement !== "downtown") continue;
  downtownByClass.set(p.className, (downtownByClass.get(p.className) || 0) + 1);
}
console.log("\n   DOWNTOWN ONLY");
for (const [cls, n] of [...downtownByClass.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`      ${String(n).padStart(6)}  ${cls}`);
}
const towerTotal = byClassName.get("TOWER") || 0;
const towerDowntown = downtownByClass.get("TOWER") || 0;
console.log(`\n   TOWER-class plots in the whole world: ${towerTotal}, of which ${towerDowntown} are downtown`);

// -----------------------------------------------------------------------
// 4. COUNT OF PLOTS MEETING EACH PLOT_CLASSES MINIMUM, IN BOTH DIRECTIONS
//
// "Meets the minimum" means the CARVED plot is at least minW x minD in
// both directions -- not that it was carved AS that class. This is the
// root-cause measurement: it asks whether the subdivision could EVER
// produce a plot of a given class, independent of what any settlement
// declared.
// -----------------------------------------------------------------------
console.log("\n4. PLOTS MEETING EACH PLOT_CLASSES MINIMUM (both directions)");
for (const [cls, spec] of Object.entries(PLOT_CLASSES)) {
  const n = plots.filter((p) => p.width >= spec.minW && p.depth >= spec.minD).length;
  console.log(`   ${String(n).padStart(6)}  ${(100 * n / totalPlots).toFixed(2).padStart(6)}%  ${cls.padEnd(10)} (>= ${spec.minW} x ${spec.minD} m)`);
}
