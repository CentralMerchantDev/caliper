// Private helper for scripts/shoot-arterial-network.mjs. Builds the
// arterial network (own child process -- generateWorld()'s terrain field
// is heavy, and this project has already measured what happens when a
// full world lives too long in the shared test process, see
// docs/audits/P1-BOARD.md's P1.5 section) and writes a small JSON summary
// for the render page to draw, plus landmass outlines for context.
import { writeFileSync } from "node:fs";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { LANDMASSES, ISLAND } from "../public/city-plan.js";
import { buildArterialNetwork } from "../public/road-network.js";

const heightAt = makeHeightAt(new LandField(16));
const { landmasses } = buildArterialNetwork({ heightAt });

const outlines = LANDMASSES.filter((l) => l.points).map((l) => ({ id: l.id, points: l.points }));
outlines.push({ id: "downtown", points: [
  [ISLAND.xMin, ISLAND.zMin], [ISLAND.xMax, ISLAND.zMin],
  [ISLAND.xMax, ISLAND.zMax], [ISLAND.xMin, ISLAND.zMax],
] });

const edges = [];
const junctions = [];
const nodesOut = [];
let totalGradeFindings = 0;
for (const lm of landmasses) {
  for (const n of lm.nodes) nodesOut.push({ x: n.x, z: n.z, landmass: lm.landmass });
  for (const e of lm.edges) {
    const bad = lm.gradeFindings.some((g) => g.from === e.from && g.to === e.to);
    if (bad) totalGradeFindings++;
    edges.push({ ax: lm.nodes[e.from].x, az: lm.nodes[e.from].z, bx: lm.nodes[e.to].x, bz: lm.nodes[e.to].z, overGrade: bad });
  }
  if (lm.regionalTie) {
    const anchor = lm.nodes[0];
    // regionalTie doesn't carry the target point directly in the summary;
    // recompute is unnecessary for the render -- draw a short marker at
    // the anchor instead, which is enough to show "this ties to the region".
    edges.push({ ax: anchor.x, az: anchor.z, bx: anchor.x, bz: anchor.z, regionalTieMarker: true });
  }
  for (const j of lm.junctions) junctions.push({ x: j.x, z: j.z, legCount: j.legCount });
}

writeFileSync(new URL("../public/.arterial-network-data.json", import.meta.url), JSON.stringify({
  outlines, edges, junctions, nodes: nodesOut,
  totalEdges: edges.filter((e) => !e.regionalTieMarker).length,
  totalGradeFindings,
}));
console.log(`wrote public/.arterial-network-data.json -- ${nodesOut.length} nodes, ${edges.length} edges, ${junctions.length} junctions, ${totalGradeFindings} over grade`);
