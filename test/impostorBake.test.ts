// =============================================================================
// I1 -- OCTAHEDRAL IMPOSTORS. STATIC CHECKS, SAME REASON AS
// test/lookProofScene.test.ts's OWN HEADER: this suite has no GPU.
//
// One real, GPU-only defect hit while building this: createLookProofMaterial
// defaults uCastShadows to true, sampling a uShadowMap uniform this page
// never fills in (no shadow pass here -- out of scope for I1). Left on, a
// null sampler2D read produced a blank atlas, zero console errors -- the
// third time this exact "green but wrong" shape has appeared in this repo
// (test/lookProofScene.test.ts's own header names the first two).
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const SRC = stripHtmlComments(readFileSync(join(PUBLIC, "impostor-bake-scene.html"), "utf8"));

test("impostor-bake-scene.html disables uCastShadows on the colour pass -- required since this page has no shadow pass, and a real regression once", () => {
  assert.match(SRC, /colorMaterial\.uniforms\.uCastShadows\.value = false/, "uCastShadows is not disabled -- sampling the never-filled uShadowMap uniform produced a blank atlas with zero console errors before this fix");
});

test("(synthetic) the vulnerability: an HTML comment mentioning uCastShadows=false must not satisfy the check above", () => {
  const commentOnly = stripHtmlComments("<!-- colorMaterial.uniforms.uCastShadows.value = false used to be here --><script>const x = 1;</script>");
  assert.doesNotMatch(commentOnly, /colorMaterial\.uniforms\.uCastShadows\.value = false/, "a comment-only mention should not match the real-code pattern once HTML comments are stripped");
});

test("impostor-bake-scene.html resizes the renderer per frame rather than reusing one viewport corner across all 192 renders", () => {
  assert.match(SRC, /renderer\.setSize\(CELL_SIZE, CELL_SIZE\)/, "no per-frame renderer.setSize -- the original scissor/viewport corner-reuse approach left 3/4 of the canvas uncleared across all 192 renders, producing a smeared accumulation of every prior frame instead of 64 distinct angles");
});

test("impostor-bake-scene.html uses the hemi-octahedral parametrization, not a full-sphere one -- this piece is never viewed from below", () => {
  assert.match(SRC, /function hemiOctahedralDirection/, "no hemi-octahedral direction function found");
  assert.match(SRC, /1\.0 - Math\.abs\(u\) - Math\.abs\(v\)/, "the hemi-octahedral inverse map's own y = 1 - |u| - |v| formula is not present -- the Godot-Octahedral-Impostors baker's own documented formula for the upper-hemisphere case");
});

test("impostor-bake-scene.html captures all three of colour, normal and depth, per the brief's own instruction", () => {
  for (const name of ["colour", "normal", "depth"]) {
    assert.match(SRC, new RegExp(`name:\\s*"${name}"`), `no "${name}" pass declared`);
  }
});

test("bake-octahedral-impostor.mjs reports both the theoretical uncompressed byte count and the real, measured PNG file size on disk -- neither alone is 'measured, not estimated'", () => {
  const scriptSrc = stripSourceComments(readFileSync(join(PUBLIC, "..", "scripts", "bake-octahedral-impostor.mjs"), "utf8"));
  assert.match(scriptSrc, /realPngBytesPerAtlas/, "no real, on-disk PNG byte measurement -- the uncompressed RGBA figure alone is computed from the grid/cell size, not read from a real artefact");
  assert.match(scriptSrc, /fs\.statSync\(p\)\.size/, "real file sizes are not read via fs.statSync");
});
