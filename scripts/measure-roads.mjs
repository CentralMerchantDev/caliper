// MEASURE ROAD CONNECTIVITY, SO "IS THIS CONNECTED" IS AN ANSWER RATHER THAN
// A GUESS.
//
// WORLD-DENSITY-FINDINGS.md §5: "there is no junction list, no adjacency, no
// connected-component check anywhere in the plan... a road that reaches
// nothing looks exactly like one that does." Mark's own words: "random roads
// that are not connected, have no interconnectivity."
//
// This builds the junction set and adjacency the plan itself never states,
// from the axis-aligned spans generateWorld() already returns, and runs
// connected components over the result. WORLD-REBALANCE-BRIEF.md §4 is
// explicit: measure and report, do not re-plan the network in this pass.
// Nothing here changes a single road.
//
// Run: node scripts/measure-roads.mjs

import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const roads = world.roads || [];

console.log(`world: ${roads.length} roads\n`);

// -----------------------------------------------------------------------
// 1. THE JUNCTION SET
//
// A road is an axis-aligned span: `at` is its fixed coordinate (x for a
// north-south road, z for an east-west one), `from`/`to` its extent along
// the other axis. Two roads of DIFFERENT axes meet if each one's fixed
// coordinate falls inside the other's span -- that is the only geometric
// fact a junction is, and it is exactly what "no junction list" means
// nothing in the plan currently states.
// -----------------------------------------------------------------------
function crosses(a, b) {
  // a and b must be different axes to cross at all; two parallel roads at
  // different `at` never meet, and two at the same `at` are the same road
  // or an exact duplicate, neither of which is a junction either.
  if (a.axis === b.axis) return false;
  const ns = a.axis === "ns" ? a : b;
  const ew = a.axis === "ns" ? b : a;
  return ns.at >= ew.from - 1e-6 && ns.at <= ew.to + 1e-6
      && ew.at >= ns.from - 1e-6 && ew.at <= ns.to + 1e-6;
}

// -----------------------------------------------------------------------
// 2. ADJACENCY AND CONNECTED COMPONENTS
//
// Each ROAD is a node (not each junction point) -- what the question "is
// the network connected" actually needs is "can you drive from any road to
// any other", and a road that crosses another is directly reachable from
// it. O(n^2) pairwise crossing checks, acceptable at this road count
// (measured below); a spatial index would only matter at a much larger n.
// -----------------------------------------------------------------------
const n = roads.length;
const parent = Array.from({ length: n }, (_, i) => i);
function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
function union(i, j) { const ri = find(i), rj = find(j); if (ri !== rj) parent[ri] = rj; }

let junctionCount = 0;
for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) {
    if (crosses(roads[i], roads[j])) { junctionCount++; union(i, j); }
  }
}

const componentOf = new Map();
for (let i = 0; i < n; i++) {
  const r = find(i);
  if (!componentOf.has(r)) componentOf.set(r, []);
  componentOf.get(r).push(i);
}
const components = [...componentOf.values()].sort((a, b) => b.length - a.length);

console.log(`1. JUNCTIONS: ${junctionCount} crossing pairs found among ${n} roads\n`);

console.log(`2. CONNECTED COMPONENTS: ${components.length}`);
const bySize = new Map();
for (const c of components) bySize.set(c.length, (bySize.get(c.length) || 0) + 1);
const sizes = [...bySize.keys()].sort((a, b) => b - a);
for (const size of sizes.slice(0, 15)) {
  console.log(`   ${String(bySize.get(size)).padStart(5)} component(s) of size ${size}`);
}
if (sizes.length > 15) console.log(`   ... and ${sizes.length - 15} more distinct sizes`);

const largest = components[0];
console.log(`\n   Largest component: ${largest.length} roads (${(100 * largest.length / n).toFixed(1)}% of the network)`);

// -----------------------------------------------------------------------
// 3. STRANDED ROADS -- size-1 components: a road that crosses nothing at
// all. This is the literal shape of Mark's complaint: a road exists, and
// nothing connects to it.
// -----------------------------------------------------------------------
const stranded = components.filter((c) => c.length === 1).map((c) => roads[c[0]]);
console.log(`\n3. STRANDED ROADS (cross nothing): ${stranded.length} of ${n} (${(100 * stranded.length / n).toFixed(1)}%)`);
const strandedByClass = new Map();
for (const r of stranded) strandedByClass.set(r.class, (strandedByClass.get(r.class) || 0) + 1);
for (const [cls, count] of [...strandedByClass.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(count).padStart(5)}  ${cls}`);
}
if (stranded.length) {
  console.log(`   e.g. ${stranded.slice(0, 5).map((r) => r.id).join(", ")}`);
}

// -----------------------------------------------------------------------
// 4. COMPONENTS BY SETTLEMENT -- does "connected" mean "one component per
// settlement", or does a settlement's own network fragment internally?
// -----------------------------------------------------------------------
const settlementsInComponent = components.map((c) => {
  const s = new Set(c.map((i) => roads[i].settlement).filter(Boolean));
  return s;
});
const multiSettlementComponents = components.filter((c, i) => settlementsInComponent[i].size > 1).length;
const fragmentedSettlements = new Map();
for (const r of roads) {
  if (!r.settlement) continue;
  if (!fragmentedSettlements.has(r.settlement)) fragmentedSettlements.set(r.settlement, new Set());
}
for (let ci = 0; ci < components.length; ci++) {
  for (const i of components[ci]) {
    const r = roads[i];
    if (r.settlement) fragmentedSettlements.get(r.settlement).add(ci);
  }
}
const splitSettlements = [...fragmentedSettlements.entries()].filter(([, comps]) => comps.size > 1);
console.log(`\n4. NETWORK SHAPE`);
console.log(`   ${components.length - components.filter((c) => c.length === 1).length - multiSettlementComponents} component(s) contain exactly one settlement's roads and no others`);
console.log(`   ${multiSettlementComponents} component(s) span more than one settlement (bridges/highways typically join settlements into one component)`);
console.log(`   ${splitSettlements.length} settlement(s) have their OWN roads split across more than one component:`);
for (const [id, comps] of splitSettlements.sort((a, b) => b[1].size - a[1].size).slice(0, 15)) {
  console.log(`      ${id}: split across ${comps.size} components`);
}
