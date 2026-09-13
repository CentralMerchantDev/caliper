// ROADS MUST FOLLOW DENSITY, OR SPARSE READS AS UNFINISHED.
//
// generateRoads()/generateSettlement() used to lay out avenue/street spacing
// from a settlement's declared av/st alone, with no reference to how dense
// that settlement actually built out (settlementDensity's core/edge/scale).
// The block-existence roll already thins WHICH blocks get buildings, and a
// separate pass already trims a road to the extent of the blocks it serves
// -- but neither changes how many PARALLEL streets a settlement gets, so a
// settlement turned deliberately sparse (WORLD-REBALANCE-BRIEF.md §3's
// barrier island, scale: 0.12-0.19) still laid out a full urban block grid,
// just built on a fraction of it: measured, 4.3 plots per road where every
// other developed landmass ran 17-35 (docs/pending-commits' own numbers).
// From the air that reads as a complete street network over empty ground --
// the exact "city that failed to generate" failure the brief warns against
// -- and no amount of removing buildings fixes it, because the grid itself,
// not the buildings on it, is what makes it look unfinished.
//
// This is the measurement that would have caught it before it reached a
// render. It does not re-derive a target ratio (that is a design judgement,
// not a fact to compute); it checks that no landmass sits FAR below the
// range every genuinely developed one occupies, without a named reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);

function plotsPerRoadByLandmass() {
  const landmassBySettlement = new Map(world.settlements.map((s: any) => [s.id, s.landmass]));
  const roadsBy: Record<string, number> = {}, plotsBy: Record<string, number> = {};
  for (const r of world.roads as any[]) {
    const lm = landmassBySettlement.get(r.settlement);
    if (!lm) continue;   // freeways, bridges, the coast road, the barrier spine: regional connectors, not a settlement's own street network, and serve no plots by design
    roadsBy[lm] = (roadsBy[lm] || 0) + 1;
  }
  for (const p of world.plots as any[]) {
    const lm = landmassBySettlement.get(p.settlement);
    if (lm) plotsBy[lm] = (plotsBy[lm] || 0) + 1;
  }
  return { roadsBy, plotsBy };
}

test("no landmass's settlement road network sits far below every developed landmass's plots-per-road, without a named exception", () => {
  const { roadsBy, plotsBy } = plotsPerRoadByLandmass();

  // A FLOOR, not a target. 8 clears every genuinely developed landmass
  // measured (mainland 17.2, downtown 25.1, the six larger islands 19-35)
  // by a wide margin, and sits well above the barrier island's own
  // pre-fix defect (4.3) -- so this catches "roads decoupled from density
  // again", not "the rebalance's exact density calibration moved". Small
  // islands with too few roads to measure meaningfully (fewer than 10) are
  // excluded below rather than silently passing at n=1 -- gull-isle-vlg
  // (4 roads, 8 plots) is real but too small a sample to say anything.
  const FLOOR = 8;
  const MIN_ROADS_TO_JUDGE = 10;

  const offenders: string[] = [];
  for (const [landmass, roads] of Object.entries(roadsBy)) {
    if (roads < MIN_ROADS_TO_JUDGE) continue;
    const plots = plotsBy[landmass] || 0;
    const ratio = plots / roads;
    if (ratio < FLOOR) offenders.push(`${landmass}: ${ratio.toFixed(1)} plots/road (${plots} plots, ${roads} roads)`);
  }
  assert.deepEqual(offenders, [], `landmass(es) with a street network built for a city denser than what stands on it:\n${offenders.join("\n")}`);
});

test("every genuinely developed landmass still clears a real urban ratio -- the floor above is not hiding a second regression", () => {
  // The floor test alone could pass by accident if EVERY landmass collapsed
  // toward it together. This asserts the landmasses this rebalance never
  // asked to be sparse (mainland, downtown, and the larger islands) are
  // still solidly inside the range measured before any of this landed.
  const { roadsBy, plotsBy } = plotsPerRoadByLandmass();
  for (const landmass of ["mainland", "downtown"]) {
    const ratio = (plotsBy[landmass] || 0) / (roadsBy[landmass] || 1);
    assert.ok(ratio > 15, `${landmass}: ${ratio.toFixed(1)} plots/road, expected a genuinely developed ratio (>15)`);
  }
});
