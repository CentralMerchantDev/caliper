// =============================================================================
// A DESCRIPTION OF THE CITY THE MODEL CAN READ
//
// grounding and planning read structureSummary() to know what the world
// contains. It described a four-house village -- accurate for the editable
// registry, and useless once the visitor is looking at a 40 km city. A request
// like "add a bench near the tower" was checked against a world with no tower
// and refused as a false premise, correctly and unhelpfully.
//
// The city cannot be generated inside the Worker: generateWorld takes ~4.8 s and
// pulls in the whole terrain stack. But it is DETERMINISTIC, so it can be
// summarised once, here, and checked in. Regenerate with:
//
//     node scripts/gen-city-summary.mjs
//
// This is a summary, not an inventory. 31,308 plots will not fit in a prompt
// and would not help if they did: what a model needs is the shape of the place
// -- what districts exist, what is in them, how big things are, and the names
// of the landmarks a person would actually refer to.
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = path.join(ROOT, "public");
// pathToFileURL, not a raw path: a bare Windows path ("C:\...") is not a
// scheme dynamic import() accepts, so this script could not run on Windows.
const plan = await import(pathToFileURL(path.join(P, "city-plan.js")).href);
const terrain = await import(pathToFileURL(path.join(P, "terrain.js")).href);
const footprint = await import(pathToFileURL(path.join(P, "footprint.js")).href);
const layoutMod = await import(pathToFileURL(path.join(P, "layout.js")).href);

const heightAt = terrain.makeHeightAt(new terrain.LandField(16));
const world = plan.generateWorld(heightAt);

// HOW MANY OF THOSE PLOTS ACTUALLY GET A BUILDING, MEASURED THE SAME WAY
// scripts/measure-layout.mjs MEASURES IT -- same heightAt, same planCity,
// same assessFootprint call, so a disagreement between the two would be a
// real one rather than two approximations quietly drifting apart. Before
// this, "buildings placed" was not a generated fact anywhere: world.plots
// counts every plot, placed or refused, and nothing else in this file's
// output distinguished them.
function verdictFor(plot) {
  const b = plot.buildable || plot;
  const r = footprint.assessFootprint(heightAt, {
    xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax,
  });
  return r.verdict;
}
const { stats: layoutStats } = layoutMod.planCity(world.blocks, world.plots, verdictFor);

const bySettlement = new Map();
for (const p of world.plots) {
  let s = bySettlement.get(p.settlement);
  if (!s) bySettlement.set(p.settlement, (s = { plots: 0, classes: new Map(), xMin: Infinity, xMax: -Infinity, zMin: Infinity, zMax: -Infinity }));
  s.plots++;
  s.classes.set(p.className, (s.classes.get(p.className) || 0) + 1);
  s.xMin = Math.min(s.xMin, p.xMin); s.xMax = Math.max(s.xMax, p.xMax);
  s.zMin = Math.min(s.zMin, p.zMin); s.zMax = Math.max(s.zMax, p.zMax);
}

const named = (plan.SETTLEMENTS || []).reduce((m, s) => (m[s.id] = s.name || s.id, m), {});
const lines = [];
lines.push(`The world is a ${Math.round(plan.WORLD?.SIZE ? plan.WORLD.SIZE / 1000 : 40)} km coastal region: a bay with a downtown on the near shore, a barrier island, several smaller islands, mainland hills behind, and ${world.bridges?.length ?? 0} bridges and causeways joining them.`);
lines.push(`It contains ${world.plots.length.toLocaleString("en")} building plots in ${bySettlement.size} settlements, ${world.roads.length.toLocaleString("en")} roads, and open water, beaches and parkland between them.`);
lines.push("");
lines.push("Settlements, with what is in each and roughly where it sits (metres, x east, z north):");

for (const [id, s] of [...bySettlement.entries()].sort((a, b) => b[1].plots - a[1].plots)) {
  const classes = [...s.classes.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${n} ${c.toLowerCase()}`).join(", ");
  const cx = Math.round((s.xMin + s.xMax) / 2), cz = Math.round((s.zMin + s.zMax) / 2);
  lines.push(`- ${named[id] || id} (id: ${id}) -- ${s.plots} plots: ${classes}. Centred near (${cx}, ${cz}).`);
}

lines.push("");
lines.push("Building classes and their height limits: " +
  Object.entries(plan.PLOT_CLASSES || {}).map(([k, v]) => `${k.toLowerCase()} up to ${v.maxHeight} m`).join(", ") + ".");
lines.push("");
// THE MODEL IS TOLD WHAT IS TRUE NOW, NOT WHAT WAS TRUE.
// This said "roads may not exceed a 0.13 slope", a single global limit that was
// replaced by per-class ceilings. The grounding text is read verbatim by the
// model that plans changes, so a stale rule here is a wrong premise for every
// plan built on it.
lines.push(
  "Ground rules the world enforces on itself: road gradient is limited BY CLASS -- " +
  "freeway 6%, boulevard 9%, avenue 11%, local street 15% -- and buildings 0.32. " +
  "Nothing is built on beach, cliff or water, and a building whose footprint has " +
  "any part in water or on a cliff is refused outright. A point's plot, block, " +
  "district and settlement can be looked up from its coordinates."
);

const cityStats = {
  plots: world.plots.length,
  buildingsPlaced: layoutStats.placed,
  buildingsRefused: layoutStats.refused,
};

const body = lines.join("\n");
const out = `// GENERATED by scripts/gen-city-summary.mjs -- do not edit by hand.
//
// A summary of the city the change pipeline builds on, embedded so grounding and
// planning know what the visitor is actually looking at. The city is generated
// deterministically but takes ~4.8 s and the whole terrain stack, so it is
// summarised at build time rather than computed per request.
//
// Regenerate after any change to the city plan:  node scripts/gen-city-summary.mjs
export const CITY_SUMMARY = ${JSON.stringify(body)};

// The numbers, structured rather than left for a reader to regex out of the
// prose above. test/publicClaims.test.ts pins public/index.html's
// #city-stat-buildings span against buildingsPlaced by equality -- this is
// the one and only computation of "how many buildings does this world
// place", shared with scripts/measure-layout.mjs's own report (same
// heightAt, same planCity, same assessFootprint call).
export const CITY_STATS = ${JSON.stringify(cityStats, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, "src", "citySummary.generated.ts"), out);
console.error(`wrote src/citySummary.generated.ts (${body.length} chars, ~${Math.round(body.length / 4)} tokens); ` +
  `${cityStats.buildingsPlaced.toLocaleString()} of ${cityStats.plots.toLocaleString()} plots placed, ${cityStats.buildingsRefused.toLocaleString()} refused`);
