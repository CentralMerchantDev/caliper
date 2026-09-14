// =============================================================================
// THE LOOK-PROOF SCENE'S TWO SILENT FAILURE MODES, BOTH HIT WHILE BUILDING IT
//
// Neither is testable by running the scene -- this suite has no GPU, the same
// gap test/rendererStatic.test.ts's own header names. Both are statically
// decidable and both were real, not hypothetical: the first render of this
// scene was a blank white canvas, ZERO console errors, "draw calls: 1,
// triangles: 1270" -- looking green on every measure this harness could take
// without a GPU, while drawing nothing.
//
//   1. sampler2DArray / texture(sampler2DArray, ...) do not exist in GLSL ES
//      1.00 -- DataArrayTexture sampling silently needs `glslVersion:
//      THREE.GLSL3` on the ShaderMaterial. Without it the shader fails to
//      compile; nothing in this project's console-error capture surfaced it.
//   2. Reading the canvas via toDataURL() in a SEPARATE page.evaluate() call
//      after render() can race the browser's own buffer clear when
//      `preserveDrawingBuffer` is left at its WebGLRenderer default (false).
//      Every other headless-shoot pipeline in this repo
//      (scripts/shoot-kitbash-contact-sheet.mjs,
//      scripts/shoot-buildings-self-shadow.mjs, public/kitbash-*.html) sets
//      it explicitly; this file needed the same fix.
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
const MATERIAL_SRC = stripSourceComments(readFileSync(join(PUBLIC, "look-proof-material.js"), "utf8"));
const SCENE_SRC = stripHtmlComments(readFileSync(join(PUBLIC, "look-proof-scene.html"), "utf8"));

test("look-proof-material.js sets glslVersion: THREE.GLSL3 -- required for sampler2DArray, and a real regression once", () => {
  assert.match(
    MATERIAL_SRC,
    /glslVersion:\s*THREE\.GLSL3/,
    "createLookProofMaterial's ShaderMaterial does not set glslVersion: THREE.GLSL3 -- sampler2DArray sampling will silently fail to compile (blank canvas, zero console errors, non-zero draw-call count)",
  );
});

test("(synthetic) the vulnerability: a comment mentioning glslVersion must not satisfy the check above", () => {
  const commentOnly = stripSourceComments("// this material used to set glslVersion: THREE.GLSL3 before a regression removed it\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /glslVersion:\s*THREE\.GLSL3/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

test("look-proof-material.js's fragment shader actually samples a sampler2DArray, not a plain sampler2D", () => {
  assert.match(MATERIAL_SRC, /uniform\s+sampler2DArray\s+uArrayTex/, "the array-texture uniform is not declared as sampler2DArray");
  assert.match(MATERIAL_SRC, /texture\(uArrayTex,\s*vec3\(/, "the fragment shader does not sample uArrayTex with a vec3(uv, layer) lookup");
});

test("look-proof-material.js declares every one of the four R1 mechanisms plus the fifth, as named toggle uniforms", () => {
  for (const name of ["uHalfLambertSquared", "uWarmCoolTerminator", "uRimSeparation", "uContactDarkening", "uValueSplit"]) {
    assert.match(MATERIAL_SRC, new RegExp(name + "\\s*:\\s*\\{\\s*value:"), `${name} is not declared as a uniform -- the brief's own mechanism list names this one`);
  }
});

test("look-proof-scene.html sets preserveDrawingBuffer: true on its WebGLRenderer -- required for the shoot script's toDataURL() read, and a real regression once", () => {
  assert.match(
    SCENE_SRC,
    /new\s+THREE\.WebGLRenderer\(\{[^}]*preserveDrawingBuffer:\s*true/,
    "the scene's WebGLRenderer does not set preserveDrawingBuffer: true -- scripts/shoot-look-proof.mjs reads the canvas via toDataURL() in a separate page.evaluate() call, which can race the browser's own buffer clear and capture blank white",
  );
});

test("(synthetic) the vulnerability: a comment mentioning preserveDrawingBuffer must not satisfy the check above", () => {
  const commentOnly = stripHtmlComments("<!-- new THREE.WebGLRenderer({ preserveDrawingBuffer: true }) used to be here -->\n<script>const r = new THREE.WebGLRenderer({ antialias: true });</script>");
  assert.doesNotMatch(commentOnly, /new\s+THREE\.WebGLRenderer\(\{[^}]*preserveDrawingBuffer:\s*true/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

test("look-proof-scene.html merges every piece into ONE geometry before adding a single mesh -- the one-draw-call claim, structurally", () => {
  assert.match(SCENE_SRC, /mergeGeometries\(\[groundGeom,\s*\.\.\.preparedPieces\]/, "the scene does not merge ground and every piece into one geometry -- 4.1's gate (\"two pieces from different packs render in a single draw call\") is not wired the way this file claims");
  const meshConstructions = (SCENE_SRC.match(/new THREE\.Mesh\(/g) || []).length;
  assert.equal(meshConstructions, 1, `expected exactly one THREE.Mesh construction (one draw call), found ${meshConstructions}`);
});

test("look-proof-scene.html offers a way back to index.html -- reachability.test.ts's own gate", () => {
  assert.match(SCENE_SRC, /href="\.\/index\.html"/, "no anchor back to index.html found");
});
