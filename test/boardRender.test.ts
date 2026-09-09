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
import { buildBoardScene, meshForPiece } from "../public/board-render.js";
import { loadBoard } from "../public/board-load.js";
import { atomOrigin, heightOf } from "../public/grid.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

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
