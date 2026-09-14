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

test("4.2 mechanism 1 (Half Lambert squared) is ON by default -- this commit's own checklist item", () => {
  assert.match(MATERIAL_SRC, /uHalfLambertSquared:\s*\{\s*value:\s*true\s*\}/, "uHalfLambertSquared's default is not true -- 02-half-lambert-squared.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /half_\s*\*\s*half_/, "the fragment shader does not square the half-lambert term -- R1's own correction: (0.5*(N.L)+0.5)^2, not un-squared");
});

test("4.2 mechanism 2 (warm-cool terminator) is ON by default, and never darkens toward pure black", () => {
  assert.match(MATERIAL_SRC, /uWarmCoolTerminator:\s*\{\s*value:\s*true\s*\}/, "uWarmCoolTerminator's default is not true -- 03-warm-cool-terminator.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /vec3 cool = vec3\(/, "no cool shadow colour is defined -- the brief's own wording: shadows shift toward cool, NEVER to black");
});

test("4.2 mechanism 3 (rim separation) is ON by default, adds light rather than a dark outline, and is masked by N.up", () => {
  assert.match(MATERIAL_SRC, /uRimSeparation:\s*\{\s*value:\s*true\s*\}/, "uRimSeparation's default is not true -- 04-rim-separation.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /lit \+= rimColor/, "rim separation must ADD light (a highlight), not subtract it -- the brief's own wording: rim highlights, not dark outlines");
  assert.match(MATERIAL_SRC, /upMask = clamp\(1\.0 - abs\(N\.y\)/, "the rim term is not modulated by N.up -- per the brief, it should read strongest on vertical faces, not roofs already lit from above");
});

test("4.2 mechanism 4 (contact darkening) is ON by default and darkens toward the ground, not away from it", () => {
  assert.match(MATERIAL_SRC, /uContactDarkening:\s*\{\s*value:\s*true\s*\}/, "uContactDarkening's default is not true -- 05-contact-darkening.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /heightFalloff = clamp\(vWorldPos\.y/, "contact darkening must read world-space HEIGHT, not something orientation-independent");
  assert.match(MATERIAL_SRC, /groundDarken = mix\(0\.45,\s*1\.0,\s*heightFalloff\)/, "the mix direction is wrong -- low height (near 0) must map toward the DARKER end (0.45), high height toward 1.0 (undarkened)");
});

test("the fifth mechanism (horizontal/vertical value split) is ON by default and lifts horizontal surfaces, not vertical ones", () => {
  assert.match(MATERIAL_SRC, /uValueSplit:\s*\{\s*value:\s*true\s*\}/, "uValueSplit's default is not true -- 06-value-split.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /horizontalness = clamp\(N\.y,\s*0\.0,\s*1\.0\)/, "horizontalness must be derived from N.y -- a wall (N.y near 0) and a floor/roof (N.y near 1) must read differently");
});

test("4.3 the join decal is ON by default and darkens the ground toward each footprint's own edge, not away from it", () => {
  assert.match(MATERIAL_SRC, /uJoinDecal:\s*\{\s*value:\s*true\s*\}/, "uJoinDecal's default is not true -- 07-join-decal.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /lit \*= mix\(1\.0,\s*0\.5,\s*vGroundDecal\)/, "the join decal must darken (mix toward < 1.0) as vGroundDecal rises toward 1 (at the wall), not brighten");
});

test("look-proof-scene.html bakes the join decal from real footprint geometry, not a placeholder constant", () => {
  assert.match(SCENE_SRC, /function distanceOutsideFootprint/, "no real distance-to-footprint function -- a constant decal value would satisfy the shader-side check above without doing what the brief asked (sized to the footprint)");
  assert.match(SCENE_SRC, /addGroundDecalAttribute\(groundGeomRaw,\s*PIECES\)/, "the ground's own decal attribute is not built from the real PIECES list");
});

test("L11 cast shadows: ON by default, samples a real depth texture, and reduces direct light only (never ambient, never to black)", () => {
  assert.match(MATERIAL_SRC, /uCastShadows:\s*\{\s*value:\s*true\s*\}/, "uCastShadows's default is not true -- 08-cast-shadows.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /uniform sampler2D uShadowMap/, "no sampler2D uShadowMap uniform -- shadow sampling needs a real depth texture, not sampler2DArray (that is the albedo array, a different texture)");
  assert.match(MATERIAL_SRC, /lightColor \* lambert \* shadowFactor/, "shadowFactor must multiply the DIRECT light term (lightColor * lambert), not the whole `lit` expression -- multiplying everything would also darken the ambient term, fading shadows to black and breaking the warm-cool terminator's own 'never to black' rule");
});

test("look-proof-scene.html builds the shadow camera from the scene's own real bounding box, not a hardcoded guess, and shares LIGHT_DIR with the material rather than a second copy of the light direction", () => {
  assert.match(SCENE_SRC, /import \{ createLookProofMaterial, LIGHT_DIR \} from "\.\/look-proof-material\.js"/, "look-proof-scene.html does not import LIGHT_DIR from the material -- a second, hand-copied light direction would silently drift from the one the shading actually uses");
  assert.match(SCENE_SRC, /mesh\.geometry\.computeBoundingBox\(\)/, "the shadow camera's frustum is not sized from the mesh's own real bounding box");
  assert.match(SCENE_SRC, /shadowCamera\.position\.copy\(center\)\.addScaledVector\(LIGHT_DIR/, "the shadow camera is not positioned along the shared LIGHT_DIR");
});

test("(synthetic) the vulnerability: a comment mentioning uCastShadows must not satisfy the check above", () => {
  const commentOnly = stripSourceComments("// uCastShadows: { value: true } used to be here before a regression removed it\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /uCastShadows:\s*\{\s*value:\s*true\s*\}/, "a comment-only mention should not match the real-code pattern once comments are stripped");
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

test("L12: 20 pieces, not 200 -- R2/C1.5's own 'start far lower than instinct says', and the number is checkable", () => {
  const pieceIds = [...SCENE_SRC.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(pieceIds.length, 20, `expected 20 pieces (Firewatch's own 23 trees, Caravan SandWitch's own 39 total props -- same order of magnitude, not the 200-piece catalogue this run is not building), found ${pieceIds.length}`);
  assert.equal(new Set(pieceIds).size, pieceIds.length, "duplicate piece ids -- two pieces would silently overwrite one anchor slot in layoutPieces");
});

test("L12: pieces span three real packs (three distinct layer indices among the pieces, a fourth for ground), not two packs merged repeatedly", () => {
  const layers = [...SCENE_SRC.matchAll(/footprint:\s*\[[^\]]+\],\s*layer:\s*(\d+)\s*\}/g)].map((m) => Number(m[1]));
  const distinctLayers = new Set(layers);
  assert.ok(distinctLayers.has(0) && distinctLayers.has(1) && distinctLayers.has(2), `expected pieces on layers 0 (buildings), 1 (roads) and 2 (commercial) -- found layers ${[...distinctLayers].sort().join(",")}`);
  assert.match(SCENE_SRC, /layer:\s*3\s*,?\s*\}/, "GROUND is not on its own 4th layer");
});

test("L12: anchors are computed by layoutPieces, not hand-typed -- PIECES literals declare footprint/layer only", () => {
  const piecesBlockMatch = SCENE_SRC.match(/const PIECES = \[([\s\S]*?)\n\];/);
  assert.ok(piecesBlockMatch, "could not find the PIECES array literal");
  assert.doesNotMatch(piecesBlockMatch[1], /anchor:/, "a PIECES entry hand-declares its own anchor -- 20 hand-placed anchors is exactly the transcription-error risk layoutPieces exists to remove");
});

test("L12: the mega-tower's height is capped, not scaled linearly with its own footprint", () => {
  assert.match(SCENE_SRC, /Math\.min\(\(sx \+ sz\) \/ 2,\s*6\)/, "sy is not capped -- an 8x8 (32 m) footprint scaled from a 2 m native mesh needs a real 16x horizontal scale; applying that same factor to height produced an ~87 m tower against this scene's own ~24 m tower-base pieces, confirmed by rendering it uncapped before this fix");
});

test("scripts/normalise-kit-textures.mjs's SOURCES has 4 entries for L12's third pack", () => {
  const scriptSrc = stripSourceComments(readFileSync(join(PUBLIC, "..", "scripts", "normalise-kit-textures.mjs"), "utf8"));
  const sourceNameCount = (scriptSrc.match(/name:\s*"kenney-|name:\s*"ground-grass"/g) || []).length;
  assert.equal(sourceNameCount, 4, `expected 4 SOURCES entries (2 original packs + kenney-city-kit-commercial + ground-grass), found ${sourceNameCount}`);
});
