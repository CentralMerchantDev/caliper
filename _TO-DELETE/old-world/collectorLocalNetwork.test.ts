// =============================================================================
// COLLECTORS AND LOCALS — BOARD-CONVERSION-PLAN.md P2 finish, item 2
// (P2.3 proper).
//
// The arterial layer (test/roadNetwork.test.ts) is a NEW network, hand-built
// over settlement centres. This is the EXISTING ~1,357-road generated
// network's AVENUE (collector) and STREET/LANE/ALLEY (local) spans,
// converted to socket-verified piece chains -- the majority of the network,
// not a second small layer next to it.
//
// SCOPE, NAMED HONESTLY: not every junction verifies. A real, sourced
// constraint (CITY-PLANNING-SPEC.md §1.6's corner radii) does not always
// fit inside this generator's existing block lengths -- every failure is
// checked here against that explanation, not assumed to be one.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCollectorLocalNetwork } from "../public/road-network.js";
import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);

test("P2.3: converts the majority of the existing network, not a token slice", () => {
  const { stats } = buildCollectorLocalNetwork(world.roads);
  assert.ok(stats.roadsConverted > stats.roadsConsidered / 2, `only ${stats.roadsConverted} of ${stats.roadsConsidered} roads converted -- expected the majority (AVENUE/STREET/LANE/ALLEY)`);
  assert.ok(stats.junctionNodes > 1000, `expected a real, non-trivial junction count, got ${stats.junctionNodes}`);
});

test("P2.3: most junctions verify through the shared P0 verifier", () => {
  const { junctions } = buildCollectorLocalNetwork(world.roads);
  const ok = junctions.filter((j) => j.allOk).length;
  assert.ok(ok / junctions.length > 0.7, `only ${ok} of ${junctions.length} junctions verified -- expected most local blocks to hold their own sourced corner radius`);
});

test("P2.3: local x local junctions verify almost completely -- CITY-PLANNING-SPEC.md's urban corner radius (3.0-4.6m) fits local block lengths", () => {
  const { junctions } = buildCollectorLocalNetwork(world.roads);
  const localXLocal = junctions.filter((j) => j.tierPair === "localxlocal");
  const ok = localXLocal.filter((j) => j.allOk).length;
  assert.ok(localXLocal.length > 50, "expected a real number of local x local junctions");
  assert.ok(ok / localXLocal.length > 0.9, `only ${ok} of ${localXLocal.length} local x local junctions verified, expected the sourced 3.0-4.6m urban corner radius to fit almost every local block`);
});

test("P2.3: every junction verification failure is explained by a leg whose own sourced corner radius exceeds its adjacent block's length -- none are unexplained", () => {
  const { edges, junctions } = buildCollectorLocalNetwork(world.roads);
  function legRadiusForTest(cls) {
    if (cls === "STREET" || cls === "LANE" || cls === "ALLEY") return 3.8;
    if (cls === "AVENUE") return 20;
    return 25.6; // BOULEVARD, not expected to appear as a converted leg class here
  }
  let unexplained = 0;
  for (const j of junctions) {
    if (j.allOk) continue;
    const nearEdges = edges.filter((e) => Math.hypot(e.ax - j.x, e.az - j.z) < 0.01 || Math.hypot(e.bx - j.x, e.bz - j.z) < 0.01);
    const lens = nearEdges.map((e) => Math.hypot(e.bx - e.ax, e.bz - e.az));
    const minLen = lens.length ? Math.min(...lens) : Infinity;
    const maxLegRadius = Math.max(...j.legClasses.map(legRadiusForTest));
    if (!(minLen < 2 * maxLegRadius + 1)) unexplained++;
  }
  assert.equal(unexplained, 0, `${unexplained} junction(s) failed verification with no adjacent-short-block explanation -- a real, unnamed defect, not a known geometric limit`);
});

test("P2.3: collectors touching an unconverted arterial-tier road are counted, not silently dropped or fabricated as verified", () => {
  const { stats } = buildCollectorLocalNetwork(world.roads);
  assert.ok(stats.collectorFeedsArterialContacts > 0, "expected at least one AVENUE collector to physically touch a BOULEVARD/FREEWAY/RAMP road somewhere in the generated network");
});

test("P2.3: junction class is determined by what meets what -- the tier-pair classification matches the actual leg classes present, not a fixed lookup", () => {
  const { junctions } = buildCollectorLocalNetwork(world.roads);
  for (const j of junctions.slice(0, 200)) {
    const hasCollector = j.legClasses.includes("AVENUE");
    const hasLocal = j.legClasses.some((c) => c === "STREET" || c === "LANE" || c === "ALLEY");
    if (hasCollector && hasLocal) assert.equal(j.tierPair, "collectorxlocal", `${j.key}: legs ${j.legClasses} classified as ${j.tierPair}`);
    else if (hasCollector) assert.equal(j.tierPair, "collectorxcollector", `${j.key}: legs ${j.legClasses} classified as ${j.tierPair}`);
    else assert.equal(j.tierPair, "localxlocal", `${j.key}: legs ${j.legClasses} classified as ${j.tierPair}`);
  }
});
