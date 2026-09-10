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
import { buildBoardScene, meshForPiece, scatterTrees, scatterStreetLamps, scatterStreetFurniture } from "../public/board-render.js";
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

test("B3 gate: buildBoardScene produces exactly one mesh per real piece in the committed board.generated.json", () => {
  const heightAt = makeHeightAt(new LandField(16));
  const payload = JSON.parse(readFileSync(join(ROOT, "public", "board.generated.json"), "utf8"));
  const { pieces } = loadBoard(payload, heightAt);
  assert.ok(pieces.length > 30000, `expected tens of thousands of real pieces, got ${pieces.length} -- reading the wrong file, or the committed board regenerated smaller than expected`);
  const group = buildBoardScene(THREE, pieces);
  assert.equal(group.children.length, pieces.length, `expected one mesh per piece (${pieces.length}), got ${group.children.length}`);
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
// B4 — kits wire by construction: a real tree, from a real building piece
// -----------------------------------------------------------------------------

function makeBuildingPiece(id: string, i: number, j: number): any {
  return {
    id, pieceType: "building", cell: { i, j, k: 0 }, rotation: 0,
    foot: { w: 20, d: 20 }, levels: 3, clear: { w: 3, d: 3 }, standsOn: ["buildable"], surface: "roof",
  };
}

test("B4 gate: scatterTrees calls the REAL propModel('tree', ...) -- a real kit call, not a placeholder box", () => {
  const pieces = Array.from({ length: 30 }, (_, n) => makeBuildingPiece(`b-${n}`, n * 30, 0));
  const group = scatterTrees(THREE, pieces, { everyNth: 5, maxTrees: 400 });
  assert.equal(group.children.length, 6, "expected one tree per 5th building (30/5), got a different count");
  for (const treeGroup of group.children) {
    assert.ok(treeGroup.userData.propId.startsWith("tree-"), `expected a real prop-models.js tree id, got "${treeGroup.userData.propId}"`);
    assert.ok(treeGroup.children.length > 0, "a tree's own group must contain real geometry parts, not be empty");
    for (const mesh of treeGroup.children) {
      assert.ok(mesh.geometry.attributes.position.count > 0, "a tree part must carry real geometry, not an empty buffer");
    }
  }
});

test("B4 gate: scatterTrees respects maxTrees -- it does not scatter thousands of meshes unbounded", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeBuildingPiece(`b-${n}`, n * 30, 0));
  const group = scatterTrees(THREE, pieces, { everyNth: 1, maxTrees: 10 });
  assert.equal(group.children.length, 10, "expected the scatter to stop at maxTrees");
});

test("B4 gate: scatterTrees ignores non-building pieces -- roads and bridges do not grow trees", () => {
  const pieces = [
    { id: "road-1", pieceType: "road", cell: { i: 0, j: 0, k: 0 }, foot: { w: 9, d: 40 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterTrees(THREE, pieces, { everyNth: 1, maxTrees: 400 });
  assert.equal(group.children.length, 0, "expected zero trees when no building pieces are present");
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

test("B4 gate: scatterStreetLamps calls the REAL propModel('lampPost', ...) -- a real, non-VARIED manifest id, not a placeholder box", () => {
  const pieces = Array.from({ length: 80 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetLamps(THREE, pieces, { everyNth: 10, maxLamps: 400 });
  assert.equal(group.children.length, 8, "expected one lamp per 10th road piece (80/10), got a different count");
  for (const lampGroup of group.children) {
    assert.ok(lampGroup.userData.propId.startsWith("lamp-"), `expected a real prop-models.js lamp id, got "${lampGroup.userData.propId}"`);
    assert.ok(lampGroup.children.length > 0, "a lamp's own group must contain real geometry parts, not be empty");
    for (const mesh of lampGroup.children) {
      assert.ok(mesh.geometry.attributes.position.count > 0, "a lamp part must carry real geometry, not an empty buffer");
    }
  }
});

test("B4 gate: scatterStreetLamps positions the lamp beside the road's own narrow (width) edge, at the span's own midpoint along its length -- not off the end of a long span", () => {
  // A 320 m-long span (foot.w=320, foot.d=9, the north/south span shape
  // board-generator.js itself builds): the lamp must sit just past the
  // road's own 9 m width, at the piece's own midpoint along its 320 m
  // length -- not hundreds of metres away along that length, which is
  // exactly the defect a naive "offset by the LONG dimension" mistake
  // (copying scatterTrees's own single-axis offset unchanged) would
  // produce for a piece this shape.
  const piece = makeRoadSpanPiece("r-long", 0, 0, 320);
  const group = scatterStreetLamps(THREE, [piece], { everyNth: 1, maxLamps: 10 });
  assert.equal(group.children.length, 1);
  const lamp = group.children[0];
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(lamp.position.x - (origin.x + 160)) < 1, "expected the lamp near the span's own midpoint along its length, not its origin corner");
  const zOffset = lamp.position.z - origin.z;
  assert.ok(zOffset >= 9 && zOffset <= 12, `expected the lamp just past the road's own 9 m width (roughly 9-12 m from origin.z), got z offset ${zOffset}`);
});

test("B4 gate: scatterStreetLamps respects maxLamps -- it does not scatter thousands of meshes unbounded", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetLamps(THREE, pieces, { everyNth: 1, maxLamps: 10 });
  assert.equal(group.children.length, 10, "expected the scatter to stop at maxLamps");
});

test("B4 gate: scatterStreetLamps ignores non-road pieces -- buildings and bridges do not grow lamp posts", () => {
  const pieces = [
    { id: "bldg-1", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterStreetLamps(THREE, pieces, { everyNth: 1, maxLamps: 400 });
  assert.equal(group.children.length, 0, "expected zero lamps when no road pieces are present");
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

test("B4 gate: scatterStreetFurniture alternates between the REAL propModel('bench', ...) and propModel('bin', ...) -- not one id repeated", () => {
  const pieces = Array.from({ length: 80 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 10, maxItems: 400 });
  assert.equal(group.children.length, 8, "expected one item per 10th road piece (80/10), got a different count");
  const ids = group.children.map((g: any) => g.userData.propId as string);
  assert.ok(ids.some((id) => id.startsWith("bench")), `expected at least one real bench id among ${JSON.stringify(ids)}`);
  assert.ok(ids.some((id) => id.startsWith("bin")), `expected at least one real bin id among ${JSON.stringify(ids)}`);
  for (const itemGroup of group.children) {
    assert.ok(itemGroup.children.length > 0, "a street-furniture item's own group must contain real geometry parts, not be empty");
    for (const mesh of itemGroup.children) {
      assert.ok(mesh.geometry.attributes.position.count > 0, "a street-furniture part must carry real geometry, not an empty buffer");
    }
  }
});

test("B4 gate: scatterStreetFurniture positions and orients an item correctly on a north/south (long-along-w) road span", () => {
  const piece = makeRoadSpanPiece("r-long-ns", 0, 0, 320);
  const group = scatterStreetFurniture(THREE, [piece], { everyNth: 1, maxItems: 10 });
  assert.equal(group.children.length, 1);
  const item = group.children[0];
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(item.position.x - (origin.x + 160)) < 1, "expected the item near the span's own midpoint along its length");
  const zOffset = item.position.z - origin.z;
  assert.ok(zOffset >= 9 && zOffset <= 12, `expected the item just past the road's own 9 m width, got z offset ${zOffset}`);
  assert.equal(item.rotation.y, 0, "on a road whose long axis runs along world X, the furniture's own length axis should already align with it -- no rotation needed");
});

test("B4 gate: scatterStreetFurniture positions and ROTATES an item correctly on an east/west (long-along-d) road span -- the orientation scatterStreetLamps's own technique never had to handle", () => {
  const piece = makeRoadSpanPieceEW("r-long-ew", 0, 0, 320);
  const group = scatterStreetFurniture(THREE, [piece], { everyNth: 1, maxItems: 10 });
  assert.equal(group.children.length, 1);
  const item = group.children[0];
  const origin = atomOrigin(0, 0);
  assert.ok(Math.abs(item.position.z - (origin.z + 160)) < 1, "expected the item near the span's own midpoint along its length (now running along z)");
  const xOffset = item.position.x - origin.x;
  assert.ok(xOffset >= 9 && xOffset <= 12, `expected the item just past the road's own 9 m width (now along x), got x offset ${xOffset}`);
  assert.ok(Math.abs(item.rotation.y - Math.PI / 2) < 1e-9, "on a road whose long axis runs along world Z, the furniture's own length axis must be rotated 90 degrees to still run parallel to the road -- a bench left unrotated here would sit sideways across the road");
});

test("B4 gate: scatterStreetFurniture uses the SECOND placed item's own real footprint (bin, not bench) for its offset math -- not the first item's shape reused for every item", () => {
  const pieces = [makeRoadSpanPiece("r-a", 0, 0, 40), makeRoadSpanPiece("r-b", 100, 0, 40)];
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 10 });
  assert.equal(group.children.length, 2);
  assert.ok(group.children[0].userData.propId.startsWith("bench"), "expected the first placed item to be a bench");
  assert.ok(group.children[1].userData.propId.startsWith("bin"), "expected the second placed item to be a bin");
  // The EXPECTED offset is derived from the real bin model's own footprint
  // (not a hand-computed magic number) -- so this fails if the offset math
  // ever hard-codes or reuses the FIRST item's (bench's) own, much wider
  // footprint instead of the bin's own real, narrower one.
  const binModel = propModel("bin", 100 * 31 + 0); // same seed formula the implementation itself uses
  const expectedZOffset = 9 + binModel.footprint.d / 2 + 0.3;
  const origin = atomOrigin(100, 0);
  const zOffset = group.children[1].position.z - origin.z;
  assert.ok(Math.abs(zOffset - expectedZOffset) < 0.01, `expected the bin's own real footprint (d=${binModel.footprint.d}) to produce a z offset of ~${expectedZOffset}, got ${zOffset} -- the bench's own footprint may have been reused instead`);
});

test("B4 gate: scatterStreetFurniture respects maxItems -- it does not scatter thousands of meshes unbounded", () => {
  const pieces = Array.from({ length: 500 }, (_, n) => makeRoadSpanPiece(`r-${n}`, n * 40, 0));
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 10 });
  assert.equal(group.children.length, 10, "expected the scatter to stop at maxItems");
});

test("B4 gate: scatterStreetFurniture ignores non-road pieces -- buildings and bridges do not grow benches or bins", () => {
  const pieces = [
    { id: "bldg-1", pieceType: "building", cell: { i: 0, j: 0, k: 0 }, foot: { w: 20, d: 20 } },
    { id: "bridge-1", pieceType: "bridge", cell: { i: 10, j: 0, k: 0 }, foot: { w: 9, d: 100 } },
  ];
  const group = scatterStreetFurniture(THREE, pieces, { everyNth: 1, maxItems: 400 });
  assert.equal(group.children.length, 0, "expected zero street furniture when no road pieces are present");
});

test("B4 gate: scatterStreetFurniture is a real render-path call, not merely test-only -- board-render.js itself calls propModel('bench', ...) AND propModel('bin', ...) as literal calls, not a single id-parameterised one", () => {
  const src = readFileSync(join(ROOT, "public", "board-render.js"), "utf8");
  assert.match(src, /propModel\(\s*["']bench["']/, "board-render.js does not call propModel(\"bench\", ...) -- scatterStreetFurniture is not wired to the real manifest id");
  assert.match(src, /propModel\(\s*["']bin["']/, "board-render.js does not call propModel(\"bin\", ...) -- scatterStreetFurniture is not wired to the real manifest id");
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
