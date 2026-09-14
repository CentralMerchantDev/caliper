// =============================================================================
// THE IMPOSTOR OVERVIEW SCENE'S OWN STATIC WIRING — RC3's gate, restated:
// "a shot at a distance where impostors are active, and the triangle
// count measurably below the same view with them off. RED is no
// measurable difference -- that means they are not actually being used."
//
// No GPU in this suite. The actual measurement (real triangle counts,
// off vs on) is scripts/measure-impostor-triangles.mjs, run directly, not
// from this suite -- these are static checks that the wiring calls the
// REAL octahedral-mapping.js function I1's own bake used, not a second,
// hand-rolled angle table that could silently disagree with what the
// atlas actually contains.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stripSourceComments, stripHtmlComments } from "./stripSourceComments.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
function findPublic(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "public");
    try { readFileSync(join(c, "world-scale.js"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
const PUBLIC = findPublic();
const SCENE_SRC = stripHtmlComments(stripSourceComments(readFileSync(join(PUBLIC, "impostor-overview-scene.html"), "utf8")));

test("GATE (RC3): the real octahedral-mapping.js function is imported, not a second hand-typed angle table -- I1's own bake and this file's own cell selection must never be able to disagree about which direction cell (gx,gy) is", () => {
  assert.match(SCENE_SRC, /import \{ hemiOctahedralDirection \} from "\.\/octahedral-mapping\.js"/, "the real hemiOctahedralDirection is not imported");
  assert.match(SCENE_SRC, /const \[dx, dy, dz\] = hemiOctahedralDirection\(u, v\)/, "nearestCell does not actually call the real function to build its candidate directions");
});

test("GATE (RC3): GRID_SIZE and the target piece match the real bake exactly -- a mismatched grid size would silently misindex every atlas cell", () => {
  assert.match(SCENE_SRC, /const GRID_SIZE = 8;/, "GRID_SIZE does not match impostor-bake-scene.html's own real GRID_SIZE (8)");
  assert.match(SCENE_SRC, /const PIECE_GLB = "vendor\/kits\/kenney-modular-buildings\/building-sample-house-b\.glb"/, "PIECE_GLB does not match the real glb the atlas was actually baked from");
});

test("GATE (RC3): the served atlas texture is a real copy of the real, already-committed bake output, not a placeholder", () => {
  const atlasPath = join(PUBLIC, "vendor", "impostor-atlas", "colour-atlas.png");
  assert.ok(existsSync(atlasPath), "public/vendor/impostor-atlas/colour-atlas.png is missing -- the impostor material would have nothing real to sample");
  const committedPath = join(PUBLIC, "..", "docs", "look-proof-shots", "impostor-bake", "colour-atlas.png");
  const servedBytes = readFileSync(atlasPath);
  const committedBytes = readFileSync(committedPath);
  assert.ok(servedBytes.equals(committedBytes), "the served atlas copy has drifted from the real, committed bake output -- this would mean the two are no longer the same atlas");
});

test("GATE (RC3): the texture load is awaited before the scene renders -- a real regression this item hit: TextureLoader.load() returns immediately while the image decodes in the background, so render() ran against a 1x1 placeholder and every instance came out solid black, zero console errors", () => {
  assert.match(SCENE_SRC, /await new THREE\.TextureLoader\(\)\.loadAsync\("vendor\/impostor-atlas\/colour-atlas\.png"\)/, "the atlas texture is not awaited via loadAsync -- render() could run before the real image data is available");
  assert.doesNotMatch(SCENE_SRC, /new THREE\.TextureLoader\(\)\.load\("vendor\/impostor-atlas/, "a non-awaited TextureLoader.load() call is still present -- this is the exact regression the fix above exists to prevent");
});

test("RC3: impostors-on and impostors-off render the SAME instance positions -- one shared INSTANCES list, built before the branch, used by both -- only the representation (billboard vs full geometry) differs, or the triangle comparison would not be measuring what the gate claims", () => {
  const instancesDeclIndex = SCENE_SRC.indexOf("const INSTANCES = [];");
  const branchIndex = SCENE_SRC.indexOf("if (IMPOSTORS_ON)");
  assert.ok(instancesDeclIndex >= 0, "INSTANCES is not declared");
  assert.ok(branchIndex > instancesDeclIndex, "INSTANCES is not built before the impostors-on/off branch -- it may be rebuilt differently per branch");
  assert.match(SCENE_SRC, /const quads = INSTANCES\.map\(/, "the impostor branch does not map over the shared INSTANCES list");
  assert.match(SCENE_SRC, /const instanceGeoms = INSTANCES\.map\(/, "the full-detail branch does not map over the shared INSTANCES list");
});

test("RC3: the real per-render stats (triangles, instance count) are exposed on window for a measuring script to read back -- never trusted from a log line alone", () => {
  assert.match(SCENE_SRC, /window\.__impostorRenderStats = \{/, "render stats are not exposed on window");
  assert.match(SCENE_SRC, /triangles: renderer\.info\.render\.triangles,/, "the real renderer.info triangle count is not what gets reported");
});

test("(synthetic) the vulnerability: a comment mentioning hemiOctahedralDirection must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const [dx, dy, dz] = hemiOctahedralDirection(u, v) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const \[dx, dy, dz\] = hemiOctahedralDirection\(u, v\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});
