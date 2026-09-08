// Private helper for test/isolate.test.ts (P4.3). Builds ONE full 26 km
// world, in its own process, for the same reason scripts/_board-adapter-
// probe.mjs's own header gives: building it at module scope in test/run.mjs's
// shared process (~130 other bundled test files' own state already resident)
// has reliably crashed the suite with a V8 OOM in this project before.
//
// TWO THINGS ARE CHECKED HERE, BOTH AGAINST REAL DATA, NEITHER AGAINST A
// FIXTURE:
//
//   1. neighboursOf() -- the real neighbour-selection decision, against a
//      real plotId, real board pieces, real board.js queries.
//
//   2. applyIsolate()/restoreIsolate() -- the render-mechanism fingerprint.
//      This does NOT run inside a real renderer/GPU (public/city-render.js's
//      own buildWorld() needs one, which test/rendererStatic.test.ts's own
//      header documents as deliberately out of the node suite's reach). What
//      it DOES do: build REAL Three.js InstancedMesh/Mesh/Matrix4 objects
//      (three.js's scene-graph classes need no GPU to construct or mutate --
//      only drawing one does, confirmed directly before writing this file),
//      positioned at the REAL cell coordinates of a REAL sample of this
//      world's own board pieces, batched by pieceType the way city-render.js
//      batches by typology -- a real-plotId, real-position, real-Three.js
//      ANALOG of the renderer's own batching, not a literal reproduction of
//      it (this probe does not build real building geometry or LODs).
//
//      WHAT THIS CATCHES: applyIsolate/restoreIsolate leaving a batch's
//      `.visible` flag wrong, an instance matrix mutated and not restored, a
//      standalone isolate mesh left in (or wrongly removed from) the scene,
//      or a material double-disposed.
//      WHAT IT DOES NOT CATCH: a defect specific to the real renderer's own
//      LOD/geometry/typology-batching structure, which this analog does not
//      reproduce -- named, not silently assumed covered.
import { createHash } from "node:crypto";
import { generateWorld } from "../public/city-plan.js";
import { piecesFromWorld, boardPiecesById } from "../public/board-adapter.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { planCity } from "../public/layout.js";
import { assessFootprint } from "../public/footprint.js";
import { inWorld } from "../public/grid.js";
import { neighboursOf, planIsolate, applyIsolate, restoreIsolate, NEIGHBOUR_MARGIN_M } from "../public/isolate.js";
import * as THREE from "../public/vendor/three/three.module.min.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const verdictFor = (plot) => {
  const b = plot.buildable || plot;
  return assessFootprint(heightAt, { xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax }).verdict;
};
const { placements } = planCity(world.blocks, world.plots, verdictFor);
const pieces = piecesFromWorld(world, placements);
const boardPieces = boardPiecesById(world, placements);

const buildings = pieces.filter((p) => p.id.startsWith("bld-"));

// --- 1. neighboursOf(), against real data ----------------------------------
// Pick the building with the MOST same-typology-agnostic close company we can
// find in a small sample, so the test exercises a real, non-trivial
// neighbour set rather than happening on an isolated farmhouse with zero
// neighbours every run. Sampled, not exhaustive -- exhaustive would mean
// running the query against all 17k+ buildings just to pick a demo case.
const SAMPLE = 400;
let bestPlotId = null, bestNeighbourCount = -1, bestResult = null;
for (let i = 0; i < Math.min(SAMPLE, buildings.length); i++) {
  const piece = buildings[i];
  const plotId = piece.id.slice("bld-".length);
  const result = neighboursOf(plotId, boardPieces, { heightAt, inWorld });
  if (result.neighbours.length > bestNeighbourCount) {
    bestNeighbourCount = result.neighbours.length;
    bestPlotId = plotId;
    bestResult = result;
  }
}

const neighbourGeometryChecks = {
  plotId: bestPlotId,
  neighbourCount: bestResult.neighbours.length,
  localCount: bestResult.localCount,
  placedCount: bestResult.placedCount,
  marginM: NEIGHBOUR_MARGIN_M,
  // Every reported neighbour's FOOT must genuinely fall within one margin of
  // the selection's own foot -- the actual geometric claim, checked directly
  // against the real result rather than trusted.
  allWithinMargin: bestResult.neighbours.every((n) => {
    const dx = Math.max(bestResult.selected.cell.i - (n.cell.i + n.foot.w), n.cell.i - (bestResult.selected.cell.i + bestResult.selected.foot.w), 0);
    const dz = Math.max(bestResult.selected.cell.j - (n.cell.j + n.foot.d), n.cell.j - (bestResult.selected.cell.j + bestResult.selected.foot.d), 0);
    return dx <= NEIGHBOUR_MARGIN_M && dz <= NEIGHBOUR_MARGIN_M;
  }),
  selectionExcludedFromItsOwnNeighbours: !bestResult.neighbours.some((n) => n.id === bestResult.selected.id),
};

// A far-away control: a building nowhere near bestPlotId must NOT appear as
// its neighbour -- guards against a margin/rectangle bug that returns
// everything.
const far = buildings.find((p) => {
  const sel = bestResult.selected;
  return Math.abs(p.cell.i - sel.cell.i) > 5000 || Math.abs(p.cell.j - sel.cell.j) > 5000;
});
const farIsExcluded = far ? !bestResult.neighbours.some((n) => n.id === far.id) : null;

// --- 2. applyIsolate()/restoreIsolate() fingerprint, real Three.js objects,
// real plotIds/positions, synthetic batching (see file header) ------------
const SAMPLE_FOR_MESH = 60; // small: this is a mechanism test, not a scale test
const byType = new Map();
const sampleForMesh = buildings.slice(0, SAMPLE_FOR_MESH);
for (const p of sampleForMesh) {
  const key = p.pieceType;
  if (!byType.has(key)) byType.set(key, []);
  byType.get(key).push(p);
}
const buildingInstanceIndex = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);
const createdMeshes = [];
for (const [, group] of byType) {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 });
  const mesh = new THREE.InstancedMesh(geometry, material, group.length);
  createdMeshes.push(mesh);
  group.forEach((p, idx) => {
    const m = new THREE.Matrix4().makeTranslation(p.cell.i, 0, p.cell.j);
    mesh.setMatrixAt(idx, m);
    buildingInstanceIndex.set(p.id.slice("bld-".length), { mesh, index: idx, geometry });
  });
}
const scene = new THREE.Scene();
for (const mesh of createdMeshes) scene.add(mesh);

function fingerprint() {
  const seen = new Set();
  const meshes = [];
  for (const entry of buildingInstanceIndex.values()) {
    if (seen.has(entry.mesh)) continue;
    seen.add(entry.mesh);
    const mat = new THREE.Matrix4();
    const matrices = [];
    for (let i = 0; i < entry.mesh.count; i++) {
      entry.mesh.getMatrixAt(i, mat);
      matrices.push([...mat.elements]);
    }
    meshes.push({ uuid: entry.mesh.uuid, visible: entry.mesh.visible, materialUuid: entry.mesh.material.uuid, matrices });
  }
  meshes.sort((a, b) => (a.uuid < b.uuid ? -1 : 1));
  return {
    meshes,
    sceneChildNames: scene.children.map((c) => c.name || c.type).sort(),
    sceneChildCount: scene.children.length,
  };
}

// Pick keepIds = the selected piece from part 1 (if it's in this mesh
// sample) plus a couple of its real siblings from the SAME typology group,
// so at least one standalone mesh is genuinely promoted.
const anyGroup = [...byType.values()][0];
const keepIds = new Set(anyGroup.slice(0, Math.min(3, anyGroup.length)).map((p) => p.id));

const before = fingerprint();
const isolateState = applyIsolate({ THREE, scene, buildingInstanceIndex, keepIds });
const during = fingerprint();
restoreIsolate(scene, isolateState);
const after = fingerprint();

const beforeJson = JSON.stringify(before);
const duringJson = JSON.stringify(during);
const afterJson = JSON.stringify(after);

process.stdout.write(JSON.stringify({
  neighbourGeometryChecks,
  farIsExcluded,
  fingerprint: {
    beforeDigest: createHash("sha256").update(beforeJson).digest("hex"),
    afterDigest: createHash("sha256").update(afterJson).digest("hex"),
    duringDigest: createHash("sha256").update(duringJson).digest("hex"),
    restoreIsByteIdentical: beforeJson === afterJson,
    isolateActuallyChangedSomething: beforeJson !== duringJson,
    // A little of the real content, for a failing assertion's message.
    keptCount: isolateState.addedMeshes.length,
    hiddenCount: isolateState.hiddenMeshes.length,
    duringVisibleCount: during.meshes.filter((m) => m.visible).length,
    duringSceneChildCount: during.sceneChildCount,
    beforeSceneChildCount: before.sceneChildCount,
    afterSceneChildCount: after.sceneChildCount,
  },
}));
