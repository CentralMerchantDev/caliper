// =============================================================================
// B3 GATE — the render path draws board pieces, and reads nothing else
//
// docs/briefs/RUN2-CLI-2026-09-09.md's own gate: "fails if the render path
// reads anything but the board." Two halves: a STATIC check that
// public/board-render.js's own source never imports the old plot/road
// generator (public/city-plan.js, public/layout.js, public/city-render.js),
// the same static-scan technique test/boardGenerator.test.ts's own B2.6
// case already uses for src/ and generateBoard; and a REAL functional
// check against the committed public/board.generated.json, not a synthetic
// fixture.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { buildBoardScene, meshForPiece, scatterTrees, scatterStreetLamps, scatterStreetFurniture, scatterBusShelters } from "../public/board-render.js";
import { loadBoard } from "../public/board-load.js";
import { atomOrigin, heightOf } from "../public/grid.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { propModel } from "../public/prop-models.js";

function repoRoot(): string {
  let dir = fileURLToPath(import.meta.url);
  for (let up = 0; up < 6; up++) {
    dir = join(dir, "..");
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

/** Only real `import ... from "path"` statements count -- a header comment
 *  that merely NAMES a forbidden file (to explain what this module does
 *  NOT read) must not trip the gate, the same distinction B2.6's own
 *  src/ scan already draws for generateBoard. */
function importedModules(src: string): string[] {
  return [...src.matchAll(/^\s*import\b[^;]*\bfrom\s*["']([^"']+)["']/gm)].map((m) => m[1]);
}

test("B3 gate: public/board-render.js reads nothing but the board -- no import of the old plot/road generator", () => {
  const src = readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  const forbidden = ["city-plan.js", "layout.js", "city-render.js", "layout-fits.js"];
  const imports = importedModules(src);
  const hits = forbidden.filter((name) => imports.some((i) => i.endsWith(name)));
  assert.equal(hits.length, 0, `board-render.js imports from the old generator: ${hits.join(", ")}`);
});

test("B3 gate (guardrail): the check above actually fails on a real import of the forbidden path, not just passing by construction", () => {
  const poisoned = `import { planCity } from "./layout.js";\n` + readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  const forbidden = ["city-plan.js", "layout.js", "city-render.js", "layout-fits.js"];
  const imports = importedModules(poisoned);
  const hits = forbidden.filter((name) => imports.some((i) => i.endsWith(name)));
  assert.ok(hits.length > 0, "the forbidden-import scan did not catch an actual forbidden import -- it would pass on a file that violates the gate");
});

test("B3 gate (guardrail): a header comment that merely NAMES a forbidden file does not trip the gate -- only a real import does", () => {
  const commentOnly = `// this module does not read city-plan.js, layout.js, or city-render.js\nexport const x = 1;\n`;
  const imports = importedModules(commentOnly);
  assert.equal(imports.length, 0, "a comment line was mistaken for an import statement");
});

test("B4 gate (2b): buildBoardScene draws every real piece in the committed board.generated.json exactly once, grouped into a SMALL number of InstancedMesh objects, not one mesh per piece", () => {
  const heightAt = makeHeightAt(new LandField(16));
  const payload = JSON.parse(readFileSync(join(ROOT, "public", "board.generated.json"), "utf8"));
  const { pieces } = loadBoard(payload, heightAt);
  // 30,000 was calibrated against the pre-Decision-5 board (fixed 9 m
  // roads, small 57-80 atom blocks). docs/specs/PIECE-CATALOGUE-ROADS.md
  // §9's own retirement widened every road to 18 m and roughly doubled
  // blockAtoms per tier to compensate -- fewer, larger blocks, measured
  // directly at 21,007 real pieces after the real regeneration
  // (node scripts/gen-board.mjs, 2026-09-11). 15,000 keeps this a real
  // sanity check ("read a genuine, non-trivial board", not "read the
  // wrong file or an empty one") with real margin below the measured
  // count, not a number nudged just past today's figure.
  assert.ok(pieces.length > 15000, `expected tens of thousands of real pieces, got ${pieces.length} -- reading the wrong file, or the committed board regenerated smaller than expected`);
  const group = buildBoardScene(THREE, pieces);
  // 2b measured 16 groups by (pieceType, foot.w, foot.d, levels-if-
  // building) alone. Item 2 (spatial chunking) added boundaryId as a
  // fifth key component -- measured directly against this exact committed
  // board, that collapses 21,007 pieces into 50 groups, not 16. <= 120 is
  // a real margin above that measured 50 (catches a regrouping/chunking
  // bug that fragmented into hundreds/thousands of one-off groups)
  // without being brittle to the catalogue growing a few more sizes or
  // boundaries.
  assert.ok(group.children.length <= 120, `expected a small number of InstancedMesh groups (measured 50 today, chunked by boundary), got ${group.children.length} -- grouping is not collapsing pieces the way it should`);
  assert.ok(group.children.length >= 2, "expected more than one group -- a single group for every piece would hide a bug that merged incompatible geometries");
  const totalInstances = group.children.reduce((sum: number, m: any) => sum + m.count, 0);
  assert.equal(totalInstances, pieces.length, `expected every piece drawn exactly once across all groups (${pieces.length}), got ${totalInstances} total instances -- a piece was dropped or double-drawn`);
  for (const mesh of group.children) {
    assert.ok(mesh.isInstancedMesh, "expected every child of the board group to be an InstancedMesh, not a plain Mesh");
  }
});

// -----------------------------------------------------------------------------
// Item 2 (docs/briefs/CLI-2026-09-11-autonomous-3.md) -- spatial chunking.
// An InstancedMesh scattered across the WHOLE board has a bounding volume
// spanning the whole board, so it is effectively always in frustum and
// never culls -- real, measured wasted GPU work (see
// docs/specs/CULLING-RATIO-GATE-ANALYSIS-2026-09-11.md). Chunking by each
// piece's own real boundaryId gives each InstancedMesh a tight bounding
// volume that CAN be culled.
// -----------------------------------------------------------------------------

function makeChunkPiece(id: string, boundaryId: string | undefined, i: number, j = 0, overrides: any = {}): any {
  const piece: any = { id, pieceType: "building", cell: { i, j, k: 0 }, foot: { w: 20, d: 20 }, levels: 3, ...overrides };
  if (boundaryId !== undefined) piece.boundaryId = boundaryId;
  return piece;
}

test("item 2 gate: two pieces in DIFFERENT boundaries, same (pieceType, foot, levels), land in DIFFERENT InstancedMesh groups, each with a bounding sphere tight enough to plausibly represent ONE boundary, not the distance between two", () => {
  // Real-scale separation (kilometres apart), matching how far apart two
  // real settled boundaries actually sit on this board.
  const near = makeChunkPiece("near-a", "mainland", 0, 0);
  const near2 = makeChunkPiece("near-b", "mainland", 5, 0);
  const far = makeChunkPiece("far-a", "resort-isle", 500000, 500000);
  const group = buildBoardScene(THREE, [near, near2, far]);
  assert.equal(group.children.length, 2, "expected two groups -- one per boundary -- not one group spanning both");
  const mainlandMesh = group.children.find((m: any) => m.userData.boundaryId === "mainland");
  const resortMesh = group.children.find((m: any) => m.userData.boundaryId === "resort-isle");
  assert.ok(mainlandMesh && resortMesh, "expected to find one group per real boundaryId");
  assert.ok(mainlandMesh.boundingSphere, "expected computeBoundingSphere() to have been called -- boundingSphere must not be null");
  assert.ok(resortMesh.boundingSphere, "expected computeBoundingSphere() to have been called -- boundingSphere must not be null");
  // The mainland group's own two pieces are ~5 atoms apart -- its bounding
  // sphere radius must be small (tens of metres, not hundreds of
  // kilometres). If chunking failed and both pieces shared one group with
  // the far piece, the radius would be on the order of the ~700,000-unit
  // separation instead.
  assert.ok(mainlandMesh.boundingSphere.radius < 1000, `expected the mainland group's own bounding sphere to be tight (real pieces a few atoms apart), got radius ${mainlandMesh.boundingSphere.radius} -- it may still span the whole board`);
});

test("item 2 gate: a piece resolves to the group matching its OWN real boundaryId, not another piece's", () => {
  const a = makeChunkPiece("piece-a", "mainland", 0, 0);
  const b = makeChunkPiece("piece-b", "downtown", 1000, 1000);
  const group = buildBoardScene(THREE, [a, b]);
  const meshA = group.children.find((m: any) => (m.userData.pieceIds as string[]).includes("piece-a"));
  const meshB = group.children.find((m: any) => (m.userData.pieceIds as string[]).includes("piece-b"));
  assert.equal(meshA.userData.boundaryId, "mainland", "piece-a's own group must carry piece-a's own real boundaryId");
  assert.equal(meshB.userData.boundaryId, "downtown", "piece-b's own group must carry piece-b's own real boundaryId, not piece-a's");
  assert.notEqual(meshA, meshB, "two pieces in different boundaries must not land in the same group");
});

test("item 2 gate: a piece with no top-level boundaryId but a real anchor.boundaryId (a dock connecting two boundaries) resolves into that named boundary's own chunk", () => {
  const dock: any = {
    id: "dock-a", pieceType: "dock", cell: { i: 0, j: 0, k: 0 }, foot: { w: 4, d: 4 }, levels: 1,
    anchor: { x: 0, z: 0, boundaryId: "fishing-isle" },
  };
  const group = buildBoardScene(THREE, [dock]);
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0].userData.boundaryId, "fishing-isle", "expected the dock to resolve into its own anchor.boundaryId, not a fallback bucket");
});

test("item 2 gate: a piece with neither boundaryId nor anchor.boundaryId resolves into an explicit 'unassigned' chunk, not silently dropped or thrown", () => {
  const orphan: any = { id: "orphan-a", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 }, levels: 3 };
  const group = buildBoardScene(THREE, [orphan]);
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0].userData.boundaryId, "unassigned");
});

test("B3 gate: a mesh's own position and size come from its piece's real cell/foot/levels, not a second, independently-computed geometry", () => {
  const roadPiece = {
    id: "test-road-1", pieceType: "road", cell: { i: 100, j: 200, k: 0 }, rotation: 0,
    foot: { w: 9, d: 40 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"], surface: "road",
  };
  const mesh = meshForPiece(THREE, roadPiece);
  const origin = atomOrigin(100, 200);
  assert.equal(mesh.geometry.parameters.width, 9);
  assert.equal(mesh.geometry.parameters.depth, 40);
  assert.ok(Math.abs(mesh.position.x - (origin.x + 4.5)) < 1e-6, "mesh x position does not match atomOrigin + half the foot width");
  assert.ok(Math.abs(mesh.position.z - (origin.z + 20)) < 1e-6, "mesh z position does not match atomOrigin + half the foot depth");

  const buildingPiece = {
    id: "test-bldg-1", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, rotation: 0,
    foot: { w: 20, d: 20 }, levels: 5, clear: { w: 3, d: 3 }, standsOn: ["buildable"], surface: "roof",
  };
  const bMesh = meshForPiece(THREE, buildingPiece);
  assert.equal(bMesh.geometry.parameters.height, heightOf(5), "a building's own mesh height must come from grid.js's heightOf(levels), not a second, hardcoded storey height");
});

test("B3 gate: an unrecognised pieceType still gets a mesh (a visible gap), not a silent skip", () => {
  const mystery = { id: "mystery-1", pieceType: "something-new", cell: { i: 0, j: 0, k: 0 }, foot: { w: 5, d: 5 }, levels: 1 };
  const scene = buildBoardScene(THREE, [mystery]);
  assert.equal(scene.children.length, 1, "an unrecognised pieceType must still produce a mesh, not vanish from the scene");
});

test("B3 gate: a piece with no pieceType is skipped, not thrown", () => {
  const scene = buildBoardScene(THREE, [{ id: "broken" }, null]);
  assert.equal(scene.children.length, 0);
});

// -----------------------------------------------------------------------------
// B4 (2a) -- buildBoardScene shares ONE material per pieceType (by resolved
// colour), not one per piece. Distinct material instances prevent batching
// entirely regardless of geometry sharing, so this is the change that
// unblocks everything after it (docs/briefs/CLI-2026-09-11-autonomous-2.md
// item 2a).
// -----------------------------------------------------------------------------

function makePiece(id: string, pieceType: string, i: number, j = 0, overrides: any = {}): any {
  return { id, pieceType, cell: { i, j, k: 0 }, foot: { w: 9, d: 9 }, levels: 1, ...overrides };
}

test("B4 gate (2a/2b): buildBoardScene shares one material instance PER COLOUR across every group of that colour, not one per group and not one per piece", () => {
  const pieces = [
    // Two DIFFERENT building groups (different levels -> different geometry,
    // grouped separately) that must still share ONE building-coloured material.
    ...Array.from({ length: 3 }, (_, n) => makePiece(`bldgA-${n}`, "building", n, 0, { levels: 1 })),
    ...Array.from({ length: 3 }, (_, n) => makePiece(`bldgB-${n}`, "building", n, 1, { levels: 5 })),
    // Two DIFFERENT road groups (different foot widths), same story.
    ...Array.from({ length: 3 }, (_, n) => makePiece(`roadA-${n}`, "road", n, 2, { foot: { w: 9, d: 9 } })),
    ...Array.from({ length: 3 }, (_, n) => makePiece(`roadB-${n}`, "road", n, 3, { foot: { w: 40, d: 9 } })),
    ...Array.from({ length: 2 }, (_, n) => makePiece(`bridge-${n}`, "bridge", n, 4)),
    ...Array.from({ length: 2 }, (_, n) => makePiece(`dock-${n}`, "dock", n, 5)),
    ...Array.from({ length: 2 }, (_, n) => makePiece(`mystery-${n}`, "something-new", n, 6)),
  ];
  const group = buildBoardScene(THREE, pieces);
  // 2 building groups + 2 road groups + 1 bridge + 1 dock + 1 fallback = 7.
  assert.equal(group.children.length, 7, `expected 7 distinct (pieceType, foot, levels) groups, got ${group.children.length}`);

  const byType = (t: string) => group.children.filter((m: any) => m.userData.pieceType === t);
  const buildingGroups = byType("building");
  const roadGroups = byType("road");
  assert.equal(buildingGroups.length, 2, "expected two SEPARATE building groups (different levels means different geometry)");
  assert.equal(roadGroups.length, 2, "expected two SEPARATE road groups (different foot widths means different geometry)");
  assert.equal(buildingGroups[0].material, buildingGroups[1].material, "two different building GROUPS must still share the SAME material instance -- colour is the cache key, not the full group key");
  assert.equal(roadGroups[0].material, roadGroups[1].material, "two different road GROUPS must still share the SAME material instance");
  assert.notEqual(buildingGroups[0].geometry, buildingGroups[1].geometry, "two different building groups must NOT share geometry -- they are different sizes");

  const bridgeMat = byType("bridge")[0].material;
  const dockMat = byType("dock")[0].material;
  assert.notEqual(buildingGroups[0].material, roadGroups[0].material, "building and road must not share a material -- they have different colours");
  assert.notEqual(bridgeMat, dockMat, "bridge and dock must not share a material -- they have different colours");

  const distinctMaterials = new Set(group.children.map((m: any) => m.material));
  assert.equal(distinctMaterials.size, 5, `expected 5 distinct materials (building/road/bridge/dock/fallback colours), got ${distinctMaterials.size}`);
});

test("B4 gate (2a): meshForPiece called directly (no cache) still gets a fresh material each time -- existing direct-call behavior is unchanged", () => {
  const piece = makePiece("solo", "building", 0);
  const m1 = meshForPiece(THREE, piece);
  const m2 = meshForPiece(THREE, piece);
  assert.notEqual(m1.material, m2.material, "two direct meshForPiece calls with no shared cache must not silently start sharing a material");
});

// -----------------------------------------------------------------------------
// B4 (2b) -- per-instance transforms inside a shared InstancedMesh group must
// match what meshForPiece would have produced for that SAME piece, piece by
// piece -- the real defence against a transposed index or an off-by-one in
// the per-instance loop. A bridge's own baseYFor() varies PER PIECE even
// within one group (each piece carries its own `.height`), which is the one
// value that could be silently baked from the group's first piece instead of
// read per instance -- covered explicitly, since no real committed data
// exercises bridges yet (0 in board.generated.json today).
// -----------------------------------------------------------------------------

function decodePosition(THREE: any, mesh: any, index: number) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return position;
}

test("B4 gate (2b): every instance's decoded transform matches meshForPiece's own position for that same piece", () => {
  const pieces = [
    makePiece("b1", "building", 0, 0, { levels: 3 }),
    makePiece("b2", "building", 5, 0, { levels: 3 }),
    makePiece("b3", "building", 10, 3, { levels: 3 }),
    makePiece("r1", "road", 0, 20, { foot: { w: 40, d: 9 } }),
    makePiece("r2", "road", 50, 20, { foot: { w: 40, d: 9 } }),
  ];
  const group = buildBoardScene(THREE, pieces);
  const byIds = (mesh: any) => mesh.userData.pieceIds as string[];
  for (const piece of pieces) {
    const mesh = group.children.find((m: any) => byIds(m).includes(piece.id));
    assert.ok(mesh, `expected to find an InstancedMesh containing piece ${piece.id}`);
    const idx = byIds(mesh).indexOf(piece.id);
    const decoded = decodePosition(THREE, mesh, idx);
    const expected = meshForPiece(THREE, piece).position;
    assert.ok(Math.abs(decoded.x - expected.x) < 1e-6, `piece ${piece.id}: x mismatch, got ${decoded.x}, expected ${expected.x}`);
    assert.ok(Math.abs(decoded.y - expected.y) < 1e-6, `piece ${piece.id}: y mismatch, got ${decoded.y}, expected ${expected.y}`);
    assert.ok(Math.abs(decoded.z - expected.z) < 1e-6, `piece ${piece.id}: z mismatch, got ${decoded.z}, expected ${expected.z}`);
  }
});

test("B4 gate (2b): two bridge pieces sharing ONE instance group but with DIFFERENT own heights get DIFFERENT per-instance Y -- baseYFor is read per instance, not baked once from the group's first piece", () => {
  const low = { id: "bridge-low", pieceType: "bridge", cell: { i: 0, j: 0, k: 0 }, foot: { w: 9, d: 40 }, levels: 1, height: 8 };
  const high = { id: "bridge-high", pieceType: "bridge", cell: { i: 20, j: 0, k: 0 }, foot: { w: 9, d: 40 }, levels: 1, height: 30 };
  const group = buildBoardScene(THREE, [low, high]);
  assert.equal(group.children.length, 1, "both bridges share one foot/levels combo -- expected exactly one instance group");
  const mesh = group.children[0];
  assert.equal(mesh.count, 2);
  const ids: string[] = mesh.userData.pieceIds;
  const lowIdx = ids.indexOf("bridge-low");
  const highIdx = ids.indexOf("bridge-high");
  const lowY = decodePosition(THREE, mesh, lowIdx).y;
  const highY = decodePosition(THREE, mesh, highIdx).y;
  assert.notEqual(lowY, highY, "two bridge pieces at different declared heights must land at different Y -- baseYFor must be evaluated per instance");
  assert.ok(Math.abs(lowY - meshForPiece(THREE, low).position.y) < 1e-6, "the low bridge's own instance Y must match meshForPiece's own computation for that exact piece");
  assert.ok(Math.abs(highY - meshForPiece(THREE, high).position.y) < 1e-6, "the high bridge's own instance Y must match meshForPiece's own computation for that exact piece");
});

// -----------------------------------------------------------------------------
// B4 — kits wire by construction: a real tree, from a real building piece
// -----------------------------------------------------------------------------

function makeBuildingPiece(id: string, i: number, j: number): any {
  return {
    id, pieceType: "building", cell: { i, j, k: 0 }, rotation: 0,
    foot: { w: 20, d: 20 }, levels: 3, clear: { w: 3, d: 3 }, standsOn: ["buildable"], surface: "roof",
  };
}

/** A prop-scatter InstancedMesh's own decoded position/rotationY for a
 *  given piece id, looked up via userData.pieceIds -- 2c's own analogue of
 *  decodePosition() above, since one prop group's own children are now
 *  InstancedMesh objects covering many placed items, not one Group per
 *  item. */
function findPropInstance(THREE: any, group: any, pieceId: string) {
  for (const mesh of group.children) {
    const idx = (mesh.userData.pieceIds as string[]).indexOf(pieceId);
    if (idx === -1) continue;
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(idx, matrix);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return { mesh, position, rotationY: euler.y };
  }
  return null;
}

test("B4 gate (2c): scatterTrees calls the REAL propModel('tree', ...) -- a real kit call, not a placeholder box, now instanced", () => {
  const pieces = Array.from({ length: 30 }, (_, n) => makeBuildingPiece(`b-${n}`, n * 30, 0));
  const group = scatterTrees(THREE, pieces, { everyNth: 5, maxTrees: 400 });
  assert.equal(group.userData.itemCount, 6, "expected one tree per 5th building (30/5), got a different count");
  assert.ok(group.children.length >= 1 && group.children.length <= 6, "expected a small number of InstancedMesh groups (bucketed by tree variant), not one per tree");
  const totalInstances = group.children.reduce((sum: number, m: any) => sum + m.count, 0);
  assert.equal(totalInstances, 6, "expected every placed tree drawn exactly once across all variant groups");
  for (const mesh of group.children) {
    assert.ok(mesh.isInstancedMesh, "expected every child to be an InstancedMesh");
    assert.ok(mesh.userData.propId.startsWith("tree-"), `expected a real prop-models.js tree id, got "${mesh.userData.propId}"`);
    assert.ok(mesh.geometry.attributes.position.count > 0, "a tree part must carry real geometry, not an empty buffer");
  }
});

test("B4 gate (2c): scatterTrees respects maxTrees -- it does not scatter unbounded, and reports the real count via userData.itemCount", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeBuildingPiece(`b-${n}`, n * 30, 0));
  const group = scatterTrees(THREE, pieces, { everyNth: 1, maxTrees: 10 });
  assert.equal(group.userData.itemCount, 10, "expected the scatter to stop at maxTrees -- if the cap check reads group.children.length (always 0 mid-loop after instancing), this becomes unbounded");
  const totalInstances = group.children.reduce((sum: number, m: any) => sum + m.count, 0);
  assert.equal(totalInstances, 10);
});

test("B4 gate (2c): scatterTrees ignores non-building pieces -- roads and bridges do not grow trees", () => {
  const pieces = [
    { id: "road-1", pieceType: "road", cell: { i: 0, j: 0, k: 0 }, foot: { w: 9, d: 40 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterTrees(THREE, pieces, { everyNth: 1, maxTrees: 400 });
  assert.equal(group.userData.itemCount, 0, "expected zero trees when no building pieces are present");
  assert.equal(group.children.length, 0);
});

test("B4 gate (2c): placing enough trees to repeat variants collapses them into FEWER InstancedMesh groups than trees placed, with distinct geometry per distinct variant", () => {
  // 60 trees, 12 possible variants -- by pigeonhole, several variants must
  // repeat, so real sharing is exercised, not merely possible in theory.
  const pieces = Array.from({ length: 60 }, (_, n) => makeBuildingPiece(`b-${n}`, n, 0));
  const group = scatterTrees(THREE, pieces, { everyNth: 1, maxTrees: 60 });
  assert.equal(group.userData.itemCount, 60);
  assert.ok(group.children.length <= 12, `expected at most 12 InstancedMesh groups (12 tree variants exist), got ${group.children.length}`);
  assert.ok(group.children.length < 60, "expected fewer InstancedMesh groups than placed trees -- otherwise no sharing occurred");
  const geometriesByVariant = new Map<string, any>();
  for (const mesh of group.children) {
    const variant = mesh.userData.propId as string;
    assert.ok(!geometriesByVariant.has(variant), `expected each variant to produce exactly ONE InstancedMesh, found a second one for "${variant}"`);
    geometriesByVariant.set(variant, mesh.geometry);
  }
  assert.ok(geometriesByVariant.size >= 2, "expected the fixture to actually produce more than one distinct tree variant");
});

test("item 2 gate: two trees of the SAME variant in DIFFERENT boundaries land in DIFFERENT InstancedMesh groups -- props chunk exactly like board pieces do", () => {
  const sameSeed = 0; // seed 0 -> the same tree variant for both pieces
  const a = { id: `b-${sameSeed}`, pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 }, levels: 3, boundaryId: "mainland" };
  const b = { id: `b-far`, pieceType: "building", cell: { i: 0, j: sameSeed, k: 0 }, foot: { w: 20, d: 20 }, levels: 3, boundaryId: "resort-isle" };
  const group = scatterTrees(THREE, [a, b], { everyNth: 1, maxTrees: 10 });
  assert.equal(group.userData.itemCount, 2);
  assert.equal(group.children.length, 2, "expected two groups -- same tree variant, but two different boundaries -- not one merged group");
  const boundaries = group.children.map((m: any) => m.userData.boundaryId).sort();
  assert.deepEqual(boundaries, ["mainland", "resort-isle"]);
});

test("item 2 gate: against the real committed board, all four prop scatter functions produce a small, bounded number of chunked groups -- real headroom against the draw-call ceiling, not fragmentation into hundreds", () => {
  const heightAt = makeHeightAt(new LandField(16));
  const payload = JSON.parse(readFileSync(join(ROOT, "public", "board.generated.json"), "utf8"));
  const { pieces } = loadBoard(payload, heightAt);
  const trees = scatterTrees(THREE, pieces);
  const lamps = scatterStreetLamps(THREE, pieces);
  const furniture = scatterStreetFurniture(THREE, pieces);
  const shelters = scatterBusShelters(THREE, pieces);
  // Measured directly against the committed board with chunking: 16 tree
  // groups, 9 lamp groups, 14 furniture groups, 7 shelter groups (46
  // total) -- real margins below, not numbers nudged just past today's
  // measurement.
  assert.ok(trees.children.length <= 40, `expected a small number of chunked tree groups, got ${trees.children.length}`);
  assert.ok(lamps.children.length <= 30, `expected a small number of chunked lamp groups, got ${lamps.children.length}`);
  assert.ok(furniture.children.length <= 30, `expected a small number of chunked furniture groups, got ${furniture.children.length}`);
  assert.ok(shelters.children.length <= 20, `expected a small number of chunked shelter groups, got ${shelters.children.length}`);
});

test("B4 gate: propModel is genuinely reachable from a real render path, not merely test-only", () => {
  // The B4 gate's own literal wording (RUN2-CLI-2026-09-09.md): "it must
  // list propModel today" (before B4) -- confirmed already in
  // test/deadExports.allowlist.json. This asserts the OTHER half: that
  // scatterTrees (a real, exported render-path function, not a test
  // fixture) is the thing calling it, by reading this file's own source --
  // the same static-scan technique the B3 gate above uses for its own
  // forbidden-import check, aimed at confirming a REQUIRED call exists
  // rather than confirming a forbidden one does not.
  const src = readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  assert.match(src, /import\s*\{[^}]*\bpropModel\b[^}]*\}\s*from\s*["']\.\/prop-models\.js["']/, "board-render.js no longer imports propModel -- the B4 gate's own claim would be false");
  assert.match(src, /propModel\(/, "board-render.js imports propModel but never calls it");
});

// -----------------------------------------------------------------------------
// RUN3 item 2 (B4) -- a second real prop, from the manifest's OWN "lampPost"
// id, along real road pieces. propModel("tree", ...) alone did not exercise
// the manifest's non-VARIED path (P.MODELS resolved by name, not a seeded
// generator family) -- lampPost does, the same alias public/props.js's own
// foot already declares ("MODELS['lampPost'] = MODELS['lamp-street']").
// -----------------------------------------------------------------------------

/** A road SPAN piece, long along i/x (foot.w) and ROAD_WIDTH-narrow along
 *  j/z (foot.d) -- board-generator.js's own north/south span shape. */
function makeRoadSpanPiece(id: string, i: number, j: number, lengthAtoms = 40): any {
  return {
    id, pieceType: "road", cell: { i, j, k: 0 }, rotation: 0,
    foot: { w: lengthAtoms, d: 9 }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"], surface: "road",
  };
}

test("B4 gate (2c): scatterStreetLamps calls the REAL propModel('lampPost', ...) -- a real, non-VARIED manifest id, not a placeholder box, now instanced", () => {
  const pieces = Array.from({ length: 80 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetLamps(THREE, pieces, { everyNth: 10, maxLamps: 400 });
  assert.equal(group.userData.itemCount, 8, "expected one lamp per 10th road piece (80/10), got a different count");
  // Non-VARIED: exactly one lamp model exists, so exactly one InstancedMesh group.
  assert.equal(group.children.length, 1, "expected exactly one InstancedMesh group -- lampPost is non-VARIED, one fixed model");
  const mesh = group.children[0];
  assert.equal(mesh.count, 8);
  assert.ok(mesh.userData.propId.startsWith("lamp-"), `expected a real prop-models.js lamp id, got "${mesh.userData.propId}"`);
  assert.ok(mesh.geometry.attributes.position.count > 0, "a lamp part must carry real geometry, not an empty buffer");
});

test("B4 gate (2c): scatterStreetLamps positions the lamp beside the road's own narrow (width) edge, at the span's own midpoint along its length -- not off the end of a long span", () => {
  // A 320 m-long span (foot.w=320, foot.d=9, the north/south span shape
  // board-generator.js itself builds): the lamp must sit just past the
  // road's own 9 m width, at the piece's own midpoint along its 320 m
  // length -- not hundreds of metres away along that length, which is
  // exactly the defect a naive "offset by the LONG dimension" mistake
  // (copying scatterTrees's own single-axis offset unchanged) would
  // produce for a piece this shape.
  const piece = makeRoadSpanPiece("r-long", 0, 0, 320);
  const group = scatterStreetLamps(THREE, [piece], { everyNth: 1, maxLamps: 10 });
  assert.equal(group.userData.itemCount, 1);
  const found = findPropInstance(THREE, group, "r-long");
  assert.ok(found, "expected to find the placed lamp's own instance");
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(found!.position.x - (origin.x + 160)) < 1, "expected the lamp near the span's own midpoint along its length, not its origin corner");
  const zOffset = found!.position.z - origin.z;
  assert.ok(zOffset >= 9 && zOffset <= 12, `expected the lamp just past the road's own 9 m width (roughly 9-12 m from origin.z), got z offset ${zOffset}`);
});

test("B4 gate (2c): TWO lamps sharing ONE InstancedMesh group resolve to their OWN distinct, correct positions -- not both landing on the same (e.g. the group's first) instance's position", () => {
  // lampPost is non-VARIED (one fixed model), so any 2+ lamps land in the
  // SAME InstancedMesh -- this is the one shape the single-item tests
  // above cannot catch: a bug that bakes every instance in a group from
  // the group's own first item would pass every single-item test here
  // while still being wrong for a real board with more than one lamp per
  // variant (every lamp is the same variant). Watched red against exactly
  // this mutation before being added.
  const pieceA = makeRoadSpanPiece("r-lamp-a", 0, 0, 40);
  const pieceB = makeRoadSpanPiece("r-lamp-b", 200, 0, 40);
  const group = scatterStreetLamps(THREE, [pieceA, pieceB], { everyNth: 1, maxLamps: 10 });
  assert.equal(group.userData.itemCount, 2);
  assert.equal(group.children.length, 1, "expected both lamps in ONE group -- lampPost is non-VARIED");
  const foundA = findPropInstance(THREE, group, "r-lamp-a");
  const foundB = findPropInstance(THREE, group, "r-lamp-b");
  assert.ok(foundA && foundB);
  assert.notEqual(foundA!.position.x, foundB!.position.x, "two lamps at different cells must land at different X -- got the same X for both, meaning one instance's transform was reused for the other");
  const originA = atomOrigin(0, 0), originB = atomOrigin(200, 0);
  assert.ok(Math.abs(foundA!.position.x - (originA.x + 20)) < 1, `lamp A's own position must match its own cell, got x=${foundA!.position.x}`);
  assert.ok(Math.abs(foundB!.position.x - (originB.x + 20)) < 1, `lamp B's own position must match its own cell, got x=${foundB!.position.x}`);
});

test("B4 gate (2c): scatterStreetLamps respects maxLamps -- it does not scatter unbounded, and reports the real count via userData.itemCount", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetLamps(THREE, pieces, { everyNth: 1, maxLamps: 10 });
  assert.equal(group.userData.itemCount, 10, "expected the scatter to stop at maxLamps");
  assert.equal(group.children[0].count, 10);
});

test("B4 gate (2c): scatterStreetLamps ignores non-road pieces -- buildings and bridges do not grow lamp posts", () => {
  const pieces = [
    { id: "bldg-1", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterStreetLamps(THREE, pieces, { everyNth: 1, maxLamps: 400 });
  assert.equal(group.userData.itemCount, 0, "expected zero lamps when no road pieces are present");
  assert.equal(group.children.length, 0);
});

test("B4 gate: scatterStreetLamps is a real render-path call, not merely test-only -- board-render.js itself imports and calls propModel('lampPost', ...)", () => {
  const src = readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  assert.match(src, /propModel\(\s*["']lampPost["']/, "board-render.js does not call propModel(\"lampPost\", ...) -- scatterStreetLamps is not wired to the real manifest id");
});

// -----------------------------------------------------------------------------
// scatterStreetFurniture -- B4's next real manifest ids, "bench" and "bin",
// public/props.js's own plain aliases (MODELS["bench"]=MODELS["bench-slat"],
// MODELS["bin"]=MODELS["bin-round"]), the same non-VARIED resolution path
// lampPost already uses. UNLIKE a lamp post, a bench's own real footprint
// (public/prop-manifest.js's PROPS.bench: w:1.8, d:0.55) is strongly
// asymmetric -- scatterStreetLamps's own positioning technique only ever
// sets .position, never .rotation (fine for a roughly-symmetric lamp), so
// this function also rotates the placed group to keep the furniture's own
// length axis parallel to the road on BOTH road-span orientations. Found by
// a blind review of this step's own plan, before implementation, not after.
// -----------------------------------------------------------------------------

/** A road SPAN piece, long along j/z (foot.d) and ROAD_WIDTH-narrow along
 *  i/x (foot.w) -- the east/west span shape, the OTHER real orientation
 *  board-generator.js's own roads take (makeRoadSpanPiece above only ever
 *  covers the north/south case, which is why scatterStreetLamps's own
 *  rotation-free technique never had to handle this one). */
function makeRoadSpanPieceEW(id: string, i: number, j: number, lengthAtoms = 40): any {
  return {
    id, pieceType: "road", cell: { i, j, k: 0 }, rotation: 0,
    foot: { w: 9, d: lengthAtoms }, levels: 1, clear: { w: 0, d: 0 }, standsOn: ["buildable"], surface: "road",
  };
}

test("B4 gate (2c): scatterStreetFurniture alternates between the REAL propModel('bench', ...) and propModel('bin', ...) -- not one id repeated, now instanced (one group per variant)", () => {
  const pieces = Array.from({ length: 80 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 10, maxItems: 400 });
  assert.equal(group.userData.itemCount, 8, "expected one item per 10th road piece (80/10), got a different count");
  assert.equal(group.children.length, 2, "expected exactly two InstancedMesh groups -- bench and bin, alternating, each non-VARIED");
  const ids = group.children.map((m: any) => m.userData.propId as string);
  assert.ok(ids.some((id) => id.startsWith("bench")), `expected a real bench group among ${JSON.stringify(ids)}`);
  assert.ok(ids.some((id) => id.startsWith("bin")), `expected a real bin group among ${JSON.stringify(ids)}`);
  const totalInstances = group.children.reduce((sum: number, m: any) => sum + m.count, 0);
  assert.equal(totalInstances, 8, "expected 4 benches + 4 bins alternating, 8 total instances");
  for (const mesh of group.children) {
    assert.ok(mesh.geometry.attributes.position.count > 0, "a street-furniture part must carry real geometry, not an empty buffer");
  }
});

test("B4 gate (2c): scatterStreetFurniture positions and orients an item correctly on a north/south (long-along-w) road span", () => {
  const piece = makeRoadSpanPiece("r-long-ns", 0, 0, 320);
  const group = scatterStreetFurniture(THREE, [piece], { everyNth: 1, maxItems: 10 });
  assert.equal(group.userData.itemCount, 1);
  const found = findPropInstance(THREE, group, "r-long-ns");
  assert.ok(found);
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(found!.position.x - (origin.x + 160)) < 1, "expected the item near the span's own midpoint along its length");
  const zOffset = found!.position.z - origin.z;
  assert.ok(zOffset >= 9 && zOffset <= 12, `expected the item just past the road's own 9 m width, got z offset ${zOffset}`);
  assert.ok(Math.abs(found!.rotationY) < 1e-9, "on a road whose long axis runs along world X, the furniture's own length axis should already align with it -- no rotation needed");
});

test("B4 gate (2c): scatterStreetFurniture positions and ROTATES an item correctly on an east/west (long-along-d) road span -- the orientation scatterStreetLamps's own technique never had to handle", () => {
  const piece = makeRoadSpanPieceEW("r-long-ew", 0, 0, 320);
  const group = scatterStreetFurniture(THREE, [piece], { everyNth: 1, maxItems: 10 });
  assert.equal(group.userData.itemCount, 1);
  const found = findPropInstance(THREE, group, "r-long-ew");
  assert.ok(found);
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(found!.position.z - (origin.z + 160)) < 1, "expected the item near the span's own midpoint along its length (now running along z)");
  const xOffset = found!.position.x - origin.x;
  assert.ok(xOffset >= 9 && xOffset <= 12, `expected the item just past the road's own 9 m width (now along x), got x offset ${xOffset}`);
  assert.ok(Math.abs(Math.abs(found!.rotationY) - Math.PI / 2) < 1e-6, "on a road whose long axis runs along world Z, the furniture's own length axis must be rotated 90 degrees to still run parallel to the road -- a bench left unrotated here would sit sideways across the road");
});

test("B4 gate (2c): scatterStreetFurniture uses the SECOND placed item's own real footprint (bin, not bench) for its offset math -- not the first item's shape reused for every item", () => {
  const pieces = [makeRoadSpanPiece("r-a", 0, 0, 40), makeRoadSpanPiece("r-b", 100, 0, 40)];
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 10 });
  assert.equal(group.userData.itemCount, 2);
  const benchMesh = group.children.find((m: any) => m.userData.propId.startsWith("bench"));
  const binMesh = group.children.find((m: any) => m.userData.propId.startsWith("bin"));
  assert.ok(benchMesh, "expected the first placed item to be a bench");
  assert.ok(binMesh, "expected the second placed item to be a bin");
  assert.ok((benchMesh as any).userData.pieceIds.includes("r-a"));
  assert.ok((binMesh as any).userData.pieceIds.includes("r-b"));
  // The EXPECTED offset is derived from the real bin model's own footprint
  // (not a hand-computed magic number) -- so this fails if the offset math
  // ever hard-codes or reuses the FIRST item's (bench's) own, much wider
  // footprint instead of the bin's own real, narrower one.
  const binModel = propModel("bin", 100 * 31 + 0); // same seed formula the implementation itself uses
  const expectedZOffset = 9 + binModel.footprint.d / 2 + 0.3;
  const origin = atomOrigin(100, 0);
  const found = findPropInstance(THREE, group, "r-b");
  const zOffset = found!.position.z - origin.z;
  assert.ok(Math.abs(zOffset - expectedZOffset) < 0.01, `expected the bin's own real footprint (d=${binModel.footprint.d}) to produce a z offset of ~${expectedZOffset}, got ${zOffset} -- the bench's own footprint may have been reused instead`);
});

test("B4 gate (2c): scatterStreetFurniture respects maxItems -- it does not scatter unbounded, and reports the real count via userData.itemCount", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 10 });
  assert.equal(group.userData.itemCount, 10, "expected the scatter to stop at maxItems -- if the cap check reads group.children.length (always 0 mid-loop), this becomes unbounded");
  const totalInstances = group.children.reduce((sum: number, m: any) => sum + m.count, 0);
  assert.equal(totalInstances, 10);
});

test("B4 gate (2c): scatterStreetFurniture actually alternates bench/bin -- if the alternation check reads group.children.length instead of the real placed-item count, every item becomes a bench and zero bins are ever placed", () => {
  const pieces = Array.from({ length: 10 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 10 });
  assert.equal(group.userData.itemCount, 10);
  const binMesh = group.children.find((m: any) => m.userData.propId.startsWith("bin"));
  assert.ok(binMesh, "expected at least one bin among 10 alternating items -- got zero, meaning alternation is broken");
  assert.equal(binMesh.count, 5, "expected exactly 5 bins (indices 1,3,5,7,9) among 10 alternating items");
});

test("B4 gate (2c): scatterStreetFurniture ignores non-road pieces -- buildings and bridges do not grow benches or bins", () => {
  const pieces = [
    { id: "bldg-1", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 400 });
  assert.equal(group.userData.itemCount, 0, "expected zero street furniture when no road pieces are present");
  assert.equal(group.children.length, 0);
});

test("B4 gate: scatterStreetFurniture is a real render-path call, not merely test-only -- board-render.js itself calls propModel('bench', ...) AND propModel('bin', ...) as literal calls, not a single id-parameterised one", () => {
  const src = readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  assert.match(src, /propModel\(\s*["']bench["']/, "board-render.js does not call propModel(\"bench\", ...) -- scatterStreetFurniture is not wired to the real manifest id");
  assert.match(src, /propModel\(\s*["']bin["']/, "board-render.js does not call propModel(\"bin\", ...) -- scatterStreetFurniture is not wired to the real manifest id");
});

// -----------------------------------------------------------------------------
// scatterBusShelters -- the manifest's fourth plain alias
// (MODELS["busShelter"]=MODELS["bus-shelter"], public/props.js; "tree" is a
// VARIED generator, not a plain alias, so lampPost/bench/bin were the first
// three -- railTie remains the last, unwired). Mirrors scatterStreetFurniture
// exactly (commit 9525be6): one manifest id, no alternation, but the SAME
// rotation fix carried forward -- a bus shelter's own real footprint
// (public/prop-manifest.js's PROPS.busShelter, w:3.6 d:1.4) is even MORE
// asymmetric than the bench's 1.8x0.55, so an unrotated shelter on an
// east/west road span would face directly across the road, a worse version
// of the exact defect the prior step's own blind review found.
// -----------------------------------------------------------------------------

test("B4 gate (2c): scatterBusShelters calls the REAL propModel('busShelter', ...) -- a real, non-VARIED manifest id, not a placeholder box, now instanced", () => {
  const pieces = Array.from({ length: 80 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterBusShelters(THREE, pieces, { everyNth: 10, maxShelters: 400 });
  assert.equal(group.userData.itemCount, 8, "expected one shelter per 10th road piece (80/10), got a different count");
  assert.equal(group.children.length, 1, "expected exactly one InstancedMesh group -- busShelter is non-VARIED, one fixed model");
  const mesh = group.children[0];
  assert.equal(mesh.count, 8);
  assert.ok(mesh.userData.propId.startsWith("bus-shelter"), `expected a real prop-models.js bus-shelter id, got "${mesh.userData.propId}"`);
  assert.ok(mesh.geometry.attributes.position.count > 0, "a shelter part must carry real geometry, not an empty buffer");
});

test("B4 gate (2c): scatterBusShelters positions and orients a shelter correctly on a north/south (long-along-w) road span", () => {
  const piece = makeRoadSpanPiece("r-long-ns", 0, 0, 320);
  const group = scatterBusShelters(THREE, [piece], { everyNth: 1, maxShelters: 10 });
  assert.equal(group.userData.itemCount, 1);
  const found = findPropInstance(THREE, group, "r-long-ns");
  assert.ok(found);
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(found!.position.x - (origin.x + 160)) < 1, "expected the shelter near the span's own midpoint along its length");
  const zOffset = found!.position.z - origin.z;
  assert.ok(zOffset >= 9 && zOffset <= 12, `expected the shelter just past the road's own 9 m width, got z offset ${zOffset}`);
  assert.ok(Math.abs(found!.rotationY) < 1e-9, "on a road whose long axis runs along world X, the shelter's own length axis should already align with it -- no rotation needed");
});

test("B4 gate (2c): scatterBusShelters positions and ROTATES a shelter correctly on an east/west (long-along-d) road span -- a position-only assertion cannot see a shelter facing the wrong way", () => {
  const piece = makeRoadSpanPieceEW("r-long-ew", 0, 0, 320);
  const group = scatterBusShelters(THREE, [piece], { everyNth: 1, maxShelters: 10 });
  assert.equal(group.userData.itemCount, 1);
  const found = findPropInstance(THREE, group, "r-long-ew");
  assert.ok(found);
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(found!.position.z - (origin.z + 160)) < 1, "expected the shelter near the span's own midpoint along its length (now running along z)");
  const xOffset = found!.position.x - origin.x;
  assert.ok(xOffset >= 9 && xOffset <= 12, `expected the shelter just past the road's own 9 m width (now along x), got x offset ${xOffset}`);
  assert.ok(Math.abs(Math.abs(found!.rotationY) - Math.PI / 2) < 1e-6, "on a road whose long axis runs along world Z, the shelter's own length axis must be rotated 90 degrees to still run parallel to the road -- an unrotated shelter here would face directly across the road");
});

test("B4 gate (2c): scatterBusShelters respects maxShelters -- it does not scatter unbounded, and reports the real count via userData.itemCount", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterBusShelters(THREE, pieces, { everyNth: 1, maxShelters: 10 });
  assert.equal(group.userData.itemCount, 10, "expected the scatter to stop at maxShelters");
  assert.equal(group.children[0].count, 10);
});

test("B4 gate (2c): scatterBusShelters ignores non-road pieces -- buildings and bridges do not grow bus shelters", () => {
  const pieces = [
    { id: "bldg-1", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterBusShelters(THREE, pieces, { everyNth: 1, maxShelters: 400 });
  assert.equal(group.userData.itemCount, 0, "expected zero bus shelters when no road pieces are present");
  assert.equal(group.children.length, 0);
});

test("B4 gate: scatterBusShelters is a real render-path call, not merely test-only -- board-render.js itself calls propModel('busShelter', ...) as a literal call, not a variable-fed one", () => {
  const src = readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  assert.match(src, /propModel\(\s*["']busShelter["']/, "board-render.js does not call propModel(\"busShelter\", ...) -- scatterBusShelters is not wired to the real manifest id");
});

// -----------------------------------------------------------------------------
// RUN3-CLI-2026-09-09 -- board-drawing is gated behind ?board=1, off by
// default, in BOTH real bootstraps that wire it (public/city.html and
// public/world-render-3d.js). Watched red directly this session:
// un-instanced board pieces broke test/cullingRatio.test.ts (65.8% vs a
// 40% ceiling) and test/regressionGate.test.ts (7,851 draw calls vs a
// 900 ceiling). A silent removal of either gate would reintroduce that
// regression into ordinary browsing with nothing to catch it -- these are
// static checks for exactly that, the same technique the forbidden-import
// check above already uses, aimed at a required condition instead.
// -----------------------------------------------------------------------------

test("GATE (static): public/city.html only draws board pieces when ?board=1 is explicitly requested", () => {
  const src = readFileSync(join(ROOT, "public", "city.html"), "utf8");
  assert.match(
    src,
    /if\s*\(\s*Q\.get\(["']board["']\)\s*===\s*["']1["']\s*\)\s*try\s*\{[\s\S]{0,200}fetchBoard/,
    "public/city.html no longer gates its board-drawing behind ?board=1 -- the un-instanced regression this gate exists to prevent would ship to every ordinary page load",
  );
});

test("GATE (static): public/world-render-3d.js only draws board pieces when ?board=1 is explicitly requested, and the gate does not short-circuit the rest of _buildCityBase", () => {
  const src = readFileSync(join(ROOT, "public", "world-render-3d.js"), "utf8");
  assert.match(
    src,
    /if\s*\(\s*boardRequested\s*\)\s*try\s*\{[\s\S]{0,200}fetchBoard/,
    "public/world-render-3d.js no longer gates its board-drawing behind ?board=1",
  );
  // The specific bug this catches: an early `return` inside the gate would
  // skip P4.1's board-record wiring, the spatial index, and selection --
  // everything _buildCityBase does AFTER this block -- for every city-mode
  // load, not just when the gate is off. `if (boardRequested) return;`
  // is exactly that mistake; `if (boardRequested) try { ... }` is not.
  assert.doesNotMatch(
    src,
    /if\s*\(\s*!boardRequested\s*\)\s*return;/,
    "world-render-3d.js's board gate uses an early return, which would skip picking/spatial-index/selection setup for every city-mode load",
  );
});
