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
// Both comment forms stripped, in the order this project's other double
// checks already use (test/reachability.test.ts, test/rendererStatic.test.ts)
// -- FOUND BY A BLIND AUDIT: stripHtmlComments alone only blanks <!-- -->;
// a JS `//` comment inside a real <script> block would still satisfy
// every "the real fix line is present" check below, since it survives
// HTML-comment stripping untouched.
const SCENE_SRC = stripHtmlComments(stripSourceComments(readFileSync(join(PUBLIC, "look-proof-scene.html"), "utf8")));
// I2 extracted PIECES/layoutPieces/fitToFootprint into their own module so
// the overview's massing bake reads the SAME 20 pieces rather than a
// second, hand-typed list -- the L12 checks below moved with them.
const PIECES_SRC = stripSourceComments(readFileSync(join(PUBLIC, "look-proof-pieces.js"), "utf8"));

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
  assert.match(SCENE_SRC, /addGroundDecalAttribute\(groundGeomRaw,\s*\[\.\.\.PIECES,\s*\.\.\.boardFootprintsForDecal\]\)/, "the ground's own decal attribute is not built from the real PIECES list plus RB1's own resolved board pieces");
});

test("L11 cast shadows: ON by default, samples a real depth texture, and reduces direct light only (never ambient, never to black)", () => {
  assert.match(MATERIAL_SRC, /uCastShadows:\s*\{\s*value:\s*true\s*\}/, "uCastShadows's default is not true -- 08-cast-shadows.png's own before/after pair has nothing to show if this mechanism is not actually on");
  assert.match(MATERIAL_SRC, /uniform sampler2D uShadowMap/, "no sampler2D uShadowMap uniform -- shadow sampling needs a real depth texture, not sampler2DArray (that is the albedo array, a different texture)");
  assert.match(MATERIAL_SRC, /lightColor \* lambert \* shadowFactor/, "shadowFactor must multiply the DIRECT light term (lightColor * lambert), not the whole `lit` expression -- multiplying everything would also darken the ambient term, fading shadows to black and breaking the warm-cool terminator's own 'never to black' rule");
});

test("look-proof-scene.html builds the shadow camera from the scene's own real bounding box, not a hardcoded guess, and shares LIGHT_DIR with the material rather than a second copy of the light direction", () => {
  assert.match(SCENE_SRC, /import \{ createLookProofMaterial, LIGHT_DIR \} from "\.\/look-proof-material\.js"/, "look-proof-scene.html does not import LIGHT_DIR from the material -- a second, hand-copied light direction would silently drift from the one the shading actually uses");
  assert.match(SCENE_SRC, /groundGeom\.computeBoundingBox\(\)/, "the shadow camera's frustum is not sized from the near ground's own real bounding box");
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
  assert.match(SCENE_SRC, /mergeGeometries\(\[groundGeom,\s*farGroundGeom,\s*\.\.\.preparedPieces,\s*\.\.\.streetDetailGeoms,\s*\.\.\.preparedBoardPieces\]/, "the scene does not merge ground, far ground, every piece, street-level detail, and board pieces into one geometry -- 4.1's gate (\"two pieces from different packs render in a single draw call\") is not wired the way this file claims");
  // RB2's own ghost overlay and RB3's own readout marker are each a
  // SEPARATE, deliberate mesh (their own simple materials, UI previews,
  // never "pieces") -- the one-draw-call claim is about pieces sharing
  // one merged geometry, which the assertion above already checks
  // structurally; this count only guards against a FOURTH, accidental
  // mesh construction creeping in.
  const meshConstructions = (SCENE_SRC.match(/new THREE\.Mesh\(/g) || []).length;
  assert.equal(meshConstructions, 3, `expected exactly three THREE.Mesh constructions (the merged pieces mesh, RB2's own ghost overlay, RB3's own readout marker), found ${meshConstructions}`);
});

test("look-proof-scene.html offers a way back to index.html -- reachability.test.ts's own gate", () => {
  assert.match(SCENE_SRC, /href="\.\/index\.html"/, "no anchor back to index.html found");
});

// L12's own original 20 -- the demo/overview scene's own piece set, unchanged
// by CAT-2. Named directly (not just counted) so a future edit that swaps one
// L12 id for another of the same total count still fails loudly here.
const L12_ORIGINAL_20 = [
  "house-2x3", "house-2x2", "house-2x3-alt", "midrise-4x4", "midrise-4x4-alt",
  "tower-base-6x6", "tower-base-6x6-alt", "street-tile-4wide", "street-bend",
  "street-crossing", "street-lamp-1x1", "utility-pole-1x1", "dumpster-1x1",
  "commercial-2x2", "commercial-2x2-alt", "commercial-3x3", "commercial-4x4",
  "mega-tower-8x8", "awning-1x1", "parasol-1x1",
];

test("L12: the original 20 pieces (R2/C1.5's own 'start far lower than instinct says') are still exactly present, unshrunk and unrenamed by later work", () => {
  const pieceIds = [...PIECES_SRC.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const id of L12_ORIGINAL_20) {
    assert.ok(pieceIds.includes(id), `L12's own original id "${id}" is missing from PIECES`);
  }
  assert.equal(new Set(pieceIds).size, pieceIds.length, "duplicate piece ids -- two pieces would silently overwrite one anchor slot in layoutPieces");
});

test("CAT-2 (docs/briefs/BLD-2026-09-16.md): PIECES is 46, not still 20 and not creeping toward 200 -- L12's original 20 plus 26 dedicated, per-tier catalogue road bindings, a real and checkable total", () => {
  const pieceIds = [...PIECES_SRC.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(pieceIds.length, 46, `expected 46 (L12's original 20 + CAT-2's 26 catalogue-only road bindings), found ${pieceIds.length} -- if this grew again, name why in this test, do not just bump the number`);
});

test("L12: pieces span three real packs (three distinct layer indices among the pieces, a fourth for ground), not two packs merged repeatedly", () => {
  const layers = [...PIECES_SRC.matchAll(/footprint:\s*\[[^\]]+\],\s*layer:\s*(\d+)\s*\}/g)].map((m) => Number(m[1]));
  const distinctLayers = new Set(layers);
  assert.ok(distinctLayers.has(0) && distinctLayers.has(1) && distinctLayers.has(2), `expected pieces on layers 0 (buildings), 1 (roads) and 2 (commercial) -- found layers ${[...distinctLayers].sort().join(",")}`);
  assert.match(PIECES_SRC, /layer:\s*3\s*,?\s*\}/, "GROUND is not on its own 4th layer");
});

test("L12: anchors are computed by layoutPieces, not hand-typed -- PIECES literals declare footprint/layer only", () => {
  const piecesBlockMatch = PIECES_SRC.match(/export const PIECES = \[([\s\S]*?)\n\];/);
  assert.ok(piecesBlockMatch, "could not find the PIECES array literal");
  assert.doesNotMatch(piecesBlockMatch[1], /anchor:/, "a PIECES entry hand-declares its own anchor -- 20 hand-placed anchors is exactly the transcription-error risk layoutPieces exists to remove");
});

test("L12: the mega-tower's height is capped, not scaled linearly with its own footprint", () => {
  assert.match(PIECES_SRC, /Math\.min\(\(sx \+ sz\) \/ 2,\s*6\)/, "sy is not capped -- an 8x8 (32 m) footprint scaled from a 2 m native mesh needs a real 16x horizontal scale; applying that same factor to height produced an ~87 m tower against this scene's own ~24 m tower-base pieces, confirmed by rendering it uncapped before this fix");
});

test("look-proof-scene.html imports PIECES/fitToFootprint from look-proof-pieces.js, not a second copy", () => {
  assert.match(SCENE_SRC, /from "\.\/look-proof-pieces\.js"/, "look-proof-scene.html does not import from the shared module -- a second, hand-typed PIECES list would drift from I2's own massing bake");
});

test("I2: overview-massing-scene.html imports the SAME shared PIECES list, and measures each piece's real height rather than guessing from footprint class", () => {
  const massingSrc = stripHtmlComments(stripSourceComments(readFileSync(join(PUBLIC, "overview-massing-scene.html"), "utf8")));
  assert.match(massingSrc, /from "\.\/look-proof-pieces\.js"/, "the massing bake does not import the shared PIECES list -- a second, independently-typed piece set would not be a real comparison against L12's own detailed scene");
  assert.match(massingSrc, /geom\.boundingBox\.max\.y - geom\.boundingBox\.min\.y/, "piece height is not read from the real loaded geometry's own bounding box -- W4's own wording is 'height and footprint follow what is actually built there', not an assumed value per footprint class");
  assert.match(massingSrc, /new THREE\.BoxGeometry\(p\.footprint\[0\], realHeight, p\.footprint\[1\]\)/, "the massing box is not sized from the real measured height");
});

test("scripts/normalise-kit-textures.mjs's SOURCES has 4 entries for L12's third pack", () => {
  const scriptSrc = stripSourceComments(readFileSync(join(PUBLIC, "..", "scripts", "normalise-kit-textures.mjs"), "utf8"));
  const sourceNameCount = (scriptSrc.match(/name:\s*"kenney-|name:\s*"ground-grass"/g) || []).length;
  assert.equal(sourceNameCount, 4, `expected 4 SOURCES entries (2 original packs + kenney-city-kit-commercial + ground-grass), found ${sourceNameCount}`);
});

test("look-proof-scene.html supports ?hero=1 -- the EXACT camera and piece composition 08-cast-shadows.png used, for N1's own before/after continuity", () => {
  assert.match(SCENE_SRC, /HERO_IDS = \["house-2x3", "street-tile-4wide", "midrise-4x4", "tower-base-6x6"\]/, "hero mode does not select the exact four pieces, in the exact order, 08-cast-shadows.png used");
  assert.match(SCENE_SRC, /camera\.position\.set\(-6, 34, 70\)/, "hero mode does not use 08's own exact camera position");
  assert.match(SCENE_SRC, /camera\.lookAt\(6, 6, 4\)/, "hero mode does not use 08's own exact lookAt target");
});

test("N1a: scene.background is set to a real gradient texture, not a flat colour -- the black void 08-cast-shadows.png still has", () => {
  assert.match(SCENE_SRC, /scene\.background = buildSkyTexture\(\)/, "scene.background is not set to the sky texture -- 09's own flat THREE.Color(0x0b1016) is exactly the black void N1a exists to remove");
  assert.match(SCENE_SRC, /createLinearGradient/, "buildSkyTexture does not build a real gradient -- 'even a gradient' is the brief's own floor, not a single flat colour with a different name");
});

test("N1b: a far-ground plane is merged into the SAME mesh as the near ground and pieces -- not a second draw call, not a second scene object", () => {
  assert.match(SCENE_SRC, /const FAR_GROUND_SIZE = 400/, "far-ground plane's own size constant is missing or changed unexpectedly");
  assert.match(SCENE_SRC, /new THREE\.PlaneGeometry\(FAR_GROUND_SIZE, FAR_GROUND_SIZE, 8, 8\)/, "far-ground geometry is missing -- the ground still ends at GROUND.footprint's own edge");
  assert.match(SCENE_SRC, /mergeGeometries\(\[groundGeom, farGroundGeom, \.\.\.preparedPieces, \.\.\.streetDetailGeoms, \.\.\.preparedBoardPieces\]/, "far-ground geometry is not merged into the scene's one mesh -- either dropped, or added as a second draw call instead");
});

test("N1b: the shadow camera's frustum is fit to the pieces and near ground ONLY, not the far ground -- the far ground would coarsen every shadow texel the buildings need", () => {
  assert.match(SCENE_SRC, /function buildShadowPass\(renderer, scene, bb\)/, "buildShadowPass no longer takes an explicit bounding box -- if it derives bb from the full merged mesh again, the far ground's ~400m extent will spread the same shadow-map resolution across a much larger area");
  assert.match(SCENE_SRC, /const shadowBB = new THREE\.Box3\(\);[\s\S]{0,200}shadowBB\.union\(groundGeom\.boundingBox\);/, "shadow bounding box is not built from the near ground plus pieces");
  assert.doesNotMatch(SCENE_SRC, /shadowBB\.union\(farGroundGeom/, "far-ground geometry has leaked into the shadow camera's own bounding box");
});

test("N1b: the array texture enables mipmapping -- the far-ground plane stretches one UV tile across 400m at a grazing angle, and without mipmaps that aliases into a visible checkerboard moire (found by rendering, not assumed)", () => {
  assert.match(SCENE_SRC, /tex\.generateMipmaps = true/, "mipmaps are not enabled on the array texture");
  assert.match(SCENE_SRC, /tex\.minFilter = THREE\.LinearMipmapLinearFilter/, "minFilter does not use mipmaps");
});

test("N1b: fog range starts beyond HERO_MODE's own buildings and ends within the enlarged far ground, not at the old ground's edge -- (20,65) fogged the buildings themselves out, measured not guessed", () => {
  assert.match(MATERIAL_SRC, /uFogNear: \{ value: 90 \}/, "uFogNear regressed toward a value that overlaps HERO_MODE's own building distances (~40-90 units)");
  assert.match(MATERIAL_SRC, /uFogFar: \{ value: 230 \}/, "uFogFar regressed toward a value inside the old (pre-N1b) ground's own edge distance");
});

test("(synthetic) the vulnerability: a comment mentioning FAR_GROUND_SIZE must not satisfy the far-ground check above", () => {
  const withOnlyAComment = SCENE_SRC.replace(
    /const FAR_GROUND_SIZE = 400;\n  const farGroundGeomRaw = new THREE\.PlaneGeometry\(FAR_GROUND_SIZE, FAR_GROUND_SIZE, 8, 8\)/,
    "// FAR_GROUND_SIZE used to be 400 here\n  const farGroundGeomRaw = new THREE.PlaneGeometry(1, 1, 8, 8)",
  );
  assert.notEqual(withOnlyAComment, SCENE_SRC, "the mutation did not apply -- this check is inconclusive, not a pass");
  assert.doesNotMatch(withOnlyAComment, /new THREE\.PlaneGeometry\(FAR_GROUND_SIZE, FAR_GROUND_SIZE, 8, 8\)/, "a commented-out reference wrongly satisfies the real far-ground geometry check");
});

test("N1c: street-level detail (kerbs + a path) is built and merged into the SAME mesh as everything else, HERO_MODE only", () => {
  assert.match(SCENE_SRC, /function buildStreetLevelDetail\(roadPiece, housePiece, groundLayer\)/, "buildStreetLevelDetail is missing -- N1c's own kerb/path builder");
  assert.match(SCENE_SRC, /const kerbs = \[/, "kerb geometry is not built");
  assert.match(SCENE_SRC, /const path = addLayerAttribute\(addConstantDecalAttribute\(pathGeom, 1\), groundLayer\)/, "the path plane is not built with a constant, fully-darkened groundDecal -- the mechanism that makes it read as distinct from the surrounding ground");
  assert.match(SCENE_SRC, /const streetDetailGeoms = HERO_MODE\s*\n\s*\? buildStreetLevelDetail\(/, "street-level detail is not gated to HERO_MODE -- the full 20-piece scene has no single street for this to describe");
  assert.match(SCENE_SRC, /mergeGeometries\(\[groundGeom, farGroundGeom, \.\.\.preparedPieces, \.\.\.streetDetailGeoms, \.\.\.preparedBoardPieces\]/, "street-level detail geometry is not merged into the scene's one mesh");
});

test("N1c: kerbs and the path reuse GROUND's own layer texture, not the road pack's -- attempt 1 used the road layer and rendered visible rainbow banding (BoxGeometry stretches a whole sprite-sheet atlas across each thin face), found by rendering and reverted", () => {
  assert.match(SCENE_SRC, /addLayerAttribute\(addConstantDecalAttribute\(g, 1\), groundLayer\)/, "kerb boxes are not tagged with the ground's own layer -- regression toward the road pack's own layer would reintroduce the banding attempt 1 found");
  assert.doesNotMatch(SCENE_SRC, /kerbBox[\s\S]{0,10}roadPiece\.layer/, "a kerb box is reading roadPiece's own layer directly -- the exact regression this test exists to catch");
});

test("N1c: exactly one street prop (dumpster-1x1), loaded through the same PIECES pipeline as every other piece -- attempt 1's second prop (street-lamp-1x1) rendered as an unlabelled white shape and was dropped, not fixed blind", () => {
  assert.match(SCENE_SRC, /const HERO_PROP_IDS = \["dumpster-1x1"\]/, "HERO_PROP_IDS does not match the single, verified-visible prop this commit settled on");
  assert.doesNotMatch(SCENE_SRC, /street-lamp-1x1/, "street-lamp-1x1 is still referenced -- attempt 1's own unclear prop was meant to be fully removed, not left half-wired");
});

test("(synthetic) the vulnerability: a comment mentioning buildStreetLevelDetail must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// function buildStreetLevelDetail(roadPiece, housePiece, groundLayer) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /function buildStreetLevelDetail\(roadPiece, housePiece, groundLayer\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// ------------------------------------------------------------- RB1: the board
test("GATE (RB1): ?board=1 places demo pieces into a REAL createAreaBoard, never a hardcoded PIECES-style array -- PIECES is empty in this mode", () => {
  assert.match(SCENE_SRC, /import \{ createAreaBoard \} from "\.\/area-board\.js"/, "look-proof-scene.html does not import the real area board");
  assert.match(SCENE_SRC, /import \{ resolveBoardPieces, resolveGhost, resolveReadout, anchorForCell, rotateGeometryY, MODULE_SIZE_M \} from "\.\/board-renderer\.js"/, "look-proof-scene.html does not import the real board-renderer module");
  assert.match(SCENE_SRC, /board = createAreaBoard\(\{ width: BOARD_WIDTH_CELLS, height: BOARD_HEIGHT_CELLS, catalogue: catalogueById \}\)/, "BOARD_MODE does not construct a real area board");
  assert.match(SCENE_SRC, /board\.place\(p\.typeId, p\.anchorCell, p\.rotation\)/, "BOARD_MODE does not call the real board.place()");
  assert.match(SCENE_SRC, /BOARD_MODE\s*\n\s*\? \[\]/, "PIECES is not empty in BOARD_MODE -- a hardcoded piece list would still be feeding the render alongside (or instead of) the real board");
});

test("GATE (RB1): the real catalogue is fetched, not a hand-typed copy -- data/catalogue.json, served by shoot-look-proof.mjs's own /data/ mapping", () => {
  assert.match(SCENE_SRC, /fetch\("data\/catalogue\.json"\)/, "look-proof-scene.html does not fetch the real catalogue");
  const serverSrc = stripSourceComments(readFileSync(join(PUBLIC, "..", "scripts", "shoot-look-proof.mjs"), "utf8"));
  assert.match(serverSrc, /url\.startsWith\("\/data\/"\)/, "shoot-look-proof.mjs's own static server does not map /data/ requests to the repo's real data/ directory -- the fetch above would 404");
});

test("GATE (RB1): a board piece is resolved through resolveBoardPieces (reading the board's own CURRENT state) and merged into the SAME one mesh as everything else -- draw calls stay at 1", () => {
  assert.match(SCENE_SRC, /const \{ resolved, skipped \} = resolveBoardPieces\(board, catalogueById, manifest\)/, "board pieces are not resolved via the real board-renderer.js function");
  assert.match(SCENE_SRC, /mergeGeometries\(\[groundGeom, farGroundGeom, \.\.\.preparedPieces, \.\.\.streetDetailGeoms, \.\.\.preparedBoardPieces\]/, "resolved board pieces are not merged into the scene's one mesh -- either dropped, or rendered as a separate draw call");
});

test("GATE (RB1): ?removeId=<id> calls the real board.remove() before resolving -- the 'place, render, remove, render' gate is one real board's own state transition, not two independently-scripted renders", () => {
  assert.match(SCENE_SRC, /if \(BOARD_REMOVE_ID !== null\) \{\s*\n\s*const removed = board\.remove\(BOARD_REMOVE_ID\)/, "?removeId is not wired to a real board.remove() call");
});

test("RB1: a piece with no matching catalogue mesh is named in the skipped list (console), not silently dropped or substituted -- board-renderer.js's own disclosed behaviour, not re-decided here", () => {
  assert.match(SCENE_SRC, /BOARD-SKIPPED \$\{skipped\.map/, "skipped board pieces are not surfaced -- a real board built against catalogue entries with no glb would silently render fewer pieces than it placed");
});

test("(synthetic) the vulnerability: a comment mentioning createAreaBoard must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const board = createAreaBoard({ width: BOARD_WIDTH_CELLS, height: BOARD_HEIGHT_CELLS, catalogue: catalogueById }) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const board = createAreaBoard\(\{ width: BOARD_WIDTH_CELLS, height: BOARD_HEIGHT_CELLS, catalogue: catalogueById \}\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// ------------------------------------------------------------- RB2: the ghost
test("GATE (RB2): a real placement session previews the ghost -- session.setGhost() against the SAME real board, never a staged/hardcoded valid or invalid flag", () => {
  assert.match(SCENE_SRC, /import \{ createPlacementSession, loadBoard \} from "\.\/placement\.js"/, "look-proof-scene.html does not import the real placement session");
  assert.match(SCENE_SRC, /import \{ resolveBoardPieces, resolveGhost, resolveReadout, anchorForCell, rotateGeometryY, MODULE_SIZE_M \} from "\.\/board-renderer\.js"/, "look-proof-scene.html does not import the real resolveGhost");
  assert.match(SCENE_SRC, /const session = createPlacementSession\(\{ board \}\)/, "GHOST_MODE does not construct a real placement session against the real board");
  assert.match(SCENE_SRC, /const ghost = session\.setGhost\(demo\.typeId, demo\.anchorCell, demo\.rotation\)/, "GHOST_MODE does not call the real session.setGhost()");
});

test("GATE (RB2): the invalid-ghost demo previews the SAME cell a real placement already occupies -- a real 'occupied' refusal from the real board, not staged", () => {
  assert.match(SCENE_SRC, /invalid: \{ typeId: "tower-base-6x6-a", anchorCell: \{ x: 2, y: 2 \}, rotation: 0 \}/, "the invalid ghost demo does not target house-a's own real anchor cell (2,2) from BOARD_DEMO_PLACEMENTS");
  assert.match(SCENE_SRC, /\{ typeId: "house-a", anchorCell: \{ x: 2, y: 2 \}, rotation: 0 \}/, "BOARD_DEMO_PLACEMENTS no longer places house-a at (2,2) -- the invalid-ghost demo's own premise (that cell is occupied) would be false");
});

test("GATE (RB2): a valid and an invalid ghost render with VISIBLY DISTINCT colours -- green vs red, not a subtle tint one screenshot could blur", () => {
  assert.match(SCENE_SRC, /const GHOST_COLOR = \{ valid: 0x4caf50, invalid: 0xe53935 \}/, "GHOST_COLOR is missing or no longer a real green/red pair");
  assert.match(SCENE_SRC, /color: resolved\.valid \? GHOST_COLOR\.valid : GHOST_COLOR\.invalid/, "the ghost overlay's own colour is not driven by resolved.valid -- it could render the same colour whether the placement is valid or not");
});

test("GATE (RB2): committing an invalid ghost is proven inert on the REAL board -- resolved before/after compared, not merely asserted in a comment", () => {
  assert.match(SCENE_SRC, /const beforeCommit = resolveBoardPieces\(board, catalogueById, manifest\)\.resolved\.length/, "the invalid-ghost path does not measure the board's own resolved pieces before commit()");
  assert.match(SCENE_SRC, /const commitResult = session\.commit\(\)/, "the invalid-ghost path does not call the real session.commit()");
  assert.match(SCENE_SRC, /const afterCommit = resolveBoardPieces\(board, catalogueById, manifest\)\.resolved\.length/, "the invalid-ghost path does not re-measure the board's own resolved pieces after commit()");
  assert.match(SCENE_SRC, /unchanged=\$\{beforeCommit === afterCommit\}/, "the before/after piece counts are not actually compared");
});

test("RB2/RC1: the ghost overlay is a SEPARATE mesh from the shared-material mesh, built by ONE shared function -- RB1's own brief said plainly not to rewrite the proven material, and the shared material has no tint/alpha uniform to drive from resolved.valid. RC1's live pointer-driven ghost reuses this SAME function rather than a second, near-identical construction site that could drift from it.", () => {
  assert.match(SCENE_SRC, /function buildGhostOverlayMesh\(resolved\) \{/, "buildGhostOverlayMesh is missing -- the ghost overlay's own single construction site");
  assert.match(SCENE_SRC, /const material = new THREE\.MeshBasicMaterial\(\{/, "the ghost overlay is not built with its own separate material");
  assert.match(SCENE_SRC, /return new THREE\.Mesh\(geom, material\);/, "buildGhostOverlayMesh does not return its own separate mesh");
  assert.match(SCENE_SRC, /const ghostMesh = buildGhostOverlayMesh\(ghostResolved\);/, "the static ?ghost= demo does not call the shared buildGhostOverlayMesh");
});

test("(synthetic) the vulnerability: a comment mentioning session.setGhost must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const ghost = session.setGhost(demo.typeId, demo.anchorCell, demo.rotation) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const ghost = session\.setGhost\(demo\.typeId, demo\.anchorCell, demo\.rotation\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// ------------------------------------------------------- RB3: the value readout
test("GATE (RB3): the readout is a NAMESPACE import of scoring.js, never a named import of valueAt/valueIfPlaced -- a named import of a non-existent export throws at parse time and would crash every mode this file ships, not just RB3's own", () => {
  assert.match(SCENE_SRC, /import \* as ScoringModule from "\.\/scoring\.js"/, "look-proof-scene.html does not import scoring.js as a namespace -- a named import of valueAt/valueIfPlaced would crash the whole page while S4 is unlanded");
  assert.doesNotMatch(SCENE_SRC, /import \{[^}]*valueAt[^}]*\} from "\.\/scoring\.js"/, "a named import of valueAt from scoring.js would throw at parse time until CLI's S4 lands -- this must stay a namespace import");
});

test("GATE (RB3): the readout calls the real resolveReadout against the real board/catalogue, never a hardcoded or invented value", () => {
  assert.match(SCENE_SRC, /import \{ resolveBoardPieces, resolveGhost, resolveReadout, anchorForCell, rotateGeometryY, MODULE_SIZE_M \} from "\.\/board-renderer\.js"/, "look-proof-scene.html does not import the real resolveReadout");
  assert.match(SCENE_SRC, /readoutResolved = resolveReadout\(ScoringModule, board, catalogueById, READOUT_CELL, READOUT_CANDIDATE_TYPE_ID, 0\)/, "READOUT_MODE does not call the real resolveReadout against the real board and catalogue");
});

test("RB3: the readout's own marker colour is driven by readoutResolved.available -- it must not render as though a real number exists when S4 has not landed", () => {
  assert.match(SCENE_SRC, /const READOUT_COLOR = \{ available: 0x2196f3, unavailable: 0x9e9e9e \}/, "READOUT_COLOR is missing or no longer distinguishes available from unavailable");
  assert.match(SCENE_SRC, /color: readoutResolved\.available \? READOUT_COLOR\.available : READOUT_COLOR\.unavailable/, "the readout marker's own colour is not driven by readoutResolved.available");
});

test("RB3: the readout's own console evidence reports the REAL available flag and, when unavailable, the REAL reason string -- not a silently swallowed state", () => {
  assert.match(SCENE_SRC, /READOUT-STATE cell=\$\{READOUT_CELL\.x\},\$\{READOUT_CELL\.y\} available=\$\{readoutResolved\.available\}/, "the readout's own state is not logged for evidence");
});

test("(synthetic) the vulnerability: a comment mentioning resolveReadout must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// readoutResolved = resolveReadout(ScoringModule, board, catalogueById, READOUT_CELL, READOUT_CANDIDATE_TYPE_ID, 0) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /readoutResolved = resolveReadout\(ScoringModule, board, catalogueById, READOUT_CELL, READOUT_CANDIDATE_TYPE_ID, 0\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// -------------------------------------------------------- RDO-1: the readout draws real numbers ON SCREEN
test("GATE (RDO-1): a real text texture is drawn from readoutResolved's own current/ifPlaced numbers -- §S4's own phase-gate clause ('the ghost shows the target cell's current value and the value the piece would have there... that number, changing as the cursor moves, IS the reason one cell beats another') is not met by a console line alone", () => {
  assert.match(SCENE_SRC, /function buildReadoutLabelTexture\(current, ifPlaced\)/, "no function draws the real current/ifPlaced numbers into a texture");
  assert.match(SCENE_SRC, /ctx\.fillText\([^)]*current[^)]*\)/, "the current value is not drawn via fillText");
  assert.match(SCENE_SRC, /ctx\.fillText\([^)]*ifPlaced[^)]*\)/, "the ifPlaced value is not drawn via fillText");
});

test("GATE (RDO-1): the label is a Sprite (always faces the camera, legible from any angle), added to the scene ONLY when readoutResolved is real and available -- never drawn for a guessed or unavailable value", () => {
  assert.match(SCENE_SRC, /if \(readoutResolved\.available\)[\s\S]{0,400}new THREE\.Sprite\(/, "no Sprite is created when readoutResolved.available is true");
  assert.match(SCENE_SRC, /buildReadoutLabelTexture\(readoutResolved\.current, readoutResolved\.ifPlaced\)/, "the label's own texture is not built from the REAL readoutResolved.current/ifPlaced -- a hardcoded or re-derived number here would silently disagree with resolveReadout's own real result");
});

test("GATE (RDO-1): the label texture is captured by canvas.toDataURL() the same way every other piece of evidence in this file already is -- a THREE object (Sprite/CanvasTexture), never a DOM element scripts/shoot-look-proof.mjs's own canvas-only capture would miss", () => {
  assert.doesNotMatch(SCENE_SRC, /readoutLabel[\s\S]{0,200}document\.createElement\("div"\)/, "the readout label must not be a DOM element -- scripts/shoot-look-proof.mjs captures canvas.toDataURL() only, exactly the gap FIX-4 already found for the marker-only design");
});

test("(synthetic) the vulnerability: a comment mentioning buildReadoutLabelTexture must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// function buildReadoutLabelTexture(current, ifPlaced) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /function buildReadoutLabelTexture\(current, ifPlaced\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// -------------------------------------------------------- RB4: still there on reload
test("GATE (RB4): ?board=1&reload=1 serializes the REAL session and rebuilds via the REAL loadBoard() -- the render downstream runs against the reloaded board, not the original", () => {
  assert.match(SCENE_SRC, /import \{ createPlacementSession, loadBoard \} from "\.\/placement\.js"/, "look-proof-scene.html does not import the real loadBoard");
  assert.match(SCENE_SRC, /const save = saveSession\.serialize\(\{ seed: "rb4-demo", generatorParams: null \}\)/, "RELOAD_MODE does not call the real session.serialize()");
  assert.match(SCENE_SRC, /const \{ board: reloadedBoard, failures \} = loadBoard\(/, "RELOAD_MODE does not call the real loadBoard()");
  assert.match(SCENE_SRC, /board = reloadedBoard/, "the reloaded board does not replace the original -- downstream resolution would still be reading the pre-reload board, proving nothing about the round trip");
});

test("GATE (RB4): loadBoard()'s own failures are logged, not swallowed -- C2.5's own contract, named directly", () => {
  assert.match(SCENE_SRC, /RELOAD-FAILURES \$\{failures\.length === 0 \? "none" : failures\.map/, "loadBoard()'s own failures are not surfaced to console -- C2.5 exists specifically to prevent them being swallowed");
});

test("GATE (RB4): ?reloadShrink=1 reloads into a DELIBERATELY narrower board so a real placement (mega-tower-a) genuinely fails to re-apply -- the failure-surfacing half of the gate is exercised for real, not left at an untested 'failures: []' happy path", () => {
  assert.match(SCENE_SRC, /const reloadWidth = RELOAD_SHRINK \? BOARD_WIDTH_CELLS - 4 : BOARD_WIDTH_CELLS/, "RELOAD_SHRINK does not actually narrow the reload target's own width");
});

test("(synthetic) the vulnerability: a comment mentioning loadBoard must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const { board: reloadedBoard, failures } = loadBoard( used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const \{ board: reloadedBoard, failures \} = loadBoard\(/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// -------------------------------------------------- RB5: the ground material
test("GATE (RB5): the ground's own layerIndex is computed PER VERTEX (paved near a footprint, earth otherwise), not a single uniform value for the whole plane", () => {
  assert.match(SCENE_SRC, /function addGroundLayerAttribute\(geometry, footprints, pavedLayer, earthLayer, radius = PAVING_RADIUS\)/, "addGroundLayerAttribute is missing -- the ground would still be one uniform layer");
  assert.match(SCENE_SRC, /data\[i\] = nearest <= radius \? pavedLayer : earthLayer/, "the per-vertex paved/earth split is not actually wired to the real nearest-footprint distance");
  assert.match(SCENE_SRC, /const groundGeom = addGroundLayerAttribute\(groundGeomRaw, \[\.\.\.PIECES, \.\.\.boardFootprintsForDecal\], pavedLayerIndex, GROUND\.layer, BOARD_MODE \? BOARD_PAVING_RADIUS : PAVING_RADIUS\)/, "the real ground geometry does not use the new per-vertex layer function");
});

test("GATE (FIX-3): the board camera's paving radius is retuned to 10, not RC4's rejected 20 -- 20 merged every demo piece into one slab covering nearly the whole frame (confirmed by rendering it), which is what actually produced the wash Mark rejected on 25-board-scene-pass.png; RB5's own HERO_MODE PAVING_RADIUS is untouched", () => {
  assert.match(SCENE_SRC, /const BOARD_PAVING_RADIUS = 10;/, "BOARD_PAVING_RADIUS must be the retuned 10 -- either RC4's rejected 20 (the wash) or an unreviewed different value would both be undocumented regressions");
  assert.doesNotMatch(SCENE_SRC, /const BOARD_PAVING_RADIUS = 20;/, "RC4's rejected paving radius (20) is still present");
  assert.match(SCENE_SRC, /const PAVING_RADIUS = 6;/, "HERO_MODE's own PAVING_RADIUS was changed -- it must stay exactly what RB5's own already-judged render used");
});

test("GATE (FIX-3): the board camera's fog is 14-board.png's real settings -- RC4's narrower per-camera override (100/220) is reverted; BOARD_MODE reads the SAME shared uFogNear/uFogFar (90/230) as every other mode, no caller-side uniform write", () => {
  assert.doesNotMatch(SCENE_SRC, /material\.uniforms\.uFogNear\.value\s*=\s*100/, "RC4's board-camera fog override (uFogNear=100) is still present -- 25-board-scene-pass.png's rejected wash, judged by Mark as hazier than 14-board.png");
  assert.doesNotMatch(SCENE_SRC, /material\.uniforms\.uFogFar\.value\s*=\s*220/, "RC4's board-camera fog override (uFogFar=220) is still present -- 25-board-scene-pass.png's rejected wash, judged by Mark as hazier than 14-board.png");
  assert.doesNotMatch(SCENE_SRC, /if\s*\(\s*BOARD_MODE\s*\)\s*\{\s*material\.uniforms/, "BOARD_MODE still writes to material.uniforms after construction -- 14-board.png used the shared construction-time defaults with no per-camera override at all");
});

test("GATE (CAM-1): the board camera is no longer positioned before the real board is resolved -- BOARD_MODE's own camera.position.set must not appear in the early, pre-board camera block", () => {
  const earlyBlock = SCENE_SRC.slice(SCENE_SRC.indexOf("const camera = new THREE.PerspectiveCamera"), SCENE_SRC.indexOf("const [{ tex: arrayTex, manifest }, ...pieceGeoms]"));
  assert.doesNotMatch(earlyBlock, /BOARD_MODE[\s\S]{0,800}camera\.position\.set/, "the board camera is still positioned in the early block, before boardResolved/shadowBB exist -- 35-board-fix1-real-height.png's own defect (a camera framed for the OLD capped heights, now showing a wall) would still apply");
});

test("GATE (CAM-1): the board camera is repositioned AFTER shadowBB exists, using its own real max height -- never a hardcoded distance/elevation guessed independent of what is actually on the board", () => {
  const afterShadowBB = SCENE_SRC.slice(SCENE_SRC.indexOf("shadowBB.union(groundGeom.boundingBox)"));
  assert.match(afterShadowBB, /BOARD_MODE/, "no BOARD_MODE-specific block found after shadowBB is computed");
  // Precise, not just "shadowBB.max.y appears somewhere in this block" --
  // that regex SURVIVED a mutation that hardcoded `dist` to a fixed 100,
  // because targetY's own line still mentioned shadowBB.max.y even though
  // the actual camera distance no longer depended on it. Anchored on the
  // targetY declaration itself, the one value that actually reaches both
  // the distance calc and camera.position.set/lookAt below it.
  assert.match(afterShadowBB, /const targetY = Math\.max\(shadowBB\.max\.y \/ 2, 1\);/, "targetY is not computed from shadowBB's own real max height");
  assert.match(afterShadowBB, /const dist = \(targetY \* 1\.15\) \/ Math\.tan\(halfFovRad\);/, "the board camera's own distance is not derived from targetY (and so, transitively, from shadowBB's real max height) -- a hardcoded distance would leave this line unchanged while shadowBB.max.y still appears elsewhere in the block, unused");
  assert.match(afterShadowBB, /camera\.position\.set\(boardCenterX, targetY, boardCenterZ - dist\);/, "camera.position.set does not use the real targetY/dist this block just computed");
});

test("GATE (CAM-1): the camera's own far clipping plane is wide enough for FIX-1's real range -- 500 (the old value, sized for a ~27m capped tower) would clip a real ~376m mega-tower before the far plane even lets it render", () => {
  assert.doesNotMatch(SCENE_SRC, /new THREE\.PerspectiveCamera\(45, window\.innerWidth \/ window\.innerHeight, 0\.5, 500\)/, "the camera's own far plane is still the old 500 -- too short for FIX-1's real height range");
});

test("GATE (RB5): the paved layer's own index is read from the REAL array-texture manifest, never hardcoded -- board-renderer.js's own layerForGlb discipline, applied here too", () => {
  assert.match(SCENE_SRC, /const pavedLayerIndex = manifest\.layers\.find\(\(l\) => l\.file\.includes\("ground-paved"\)\)\.index/, "the paved layer's own index is not resolved from the real manifest");
});

test("RB5: a real, already CC0-licensed, already-vendored gravel texture is the new paving layer -- not a newly-sourced asset, and not the road pack's own sprite-sheet layer (which N1c already found bands under a large stretch)", () => {
  const normaliseSrc = stripSourceComments(readFileSync(join(PUBLIC, "..", "scripts", "normalise-kit-textures.mjs"), "utf8"));
  assert.match(normaliseSrc, /name: "ground-paved"/, "scripts/normalise-kit-textures.mjs does not define a ground-paved layer");
  assert.match(normaliseSrc, /path: "public\/vendor\/textures\/gravel\/diffuse\.webp"/, "the paved layer is not sourced from the already-vendored, already CC0-licensed gravel texture");
});

test("RB5: the fog colour and the sky's own horizon stop are matched EXACTLY -- N1b's own seamless-fade design, which a fog-only or sky-only retune would silently break", () => {
  assert.match(MATERIAL_SRC, /uFogColor: \{ value: new THREE\.Color\(0xe6dccb\) \}/, "uFogColor was not retuned, or no longer matches the value this test expects");
  assert.match(SCENE_SRC, /gradient\.addColorStop\(1, "#e6dccb"\)/, "the sky's own horizon stop does not match uFogColor's real hex value -- N1b's seamless ground-into-sky fade would show a visible seam");
});

test("(synthetic) the vulnerability: a comment mentioning addGroundLayerAttribute must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// function addGroundLayerAttribute(geometry, footprints, pavedLayer, earthLayer) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /function addGroundLayerAttribute\(geometry, footprints, pavedLayer, earthLayer\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// ---------------------------------------------------- RC1: pointer interaction
test("GATE (RC1): interactive mode imports the real, separately-tested pointer-interaction module -- not a copy of its logic inlined here", () => {
  assert.match(SCENE_SRC, /import \{ cellFromWorldXZ, handleHover, handleClick, handleCancel \} from "\.\/pointer-interaction\.js"/, "look-proof-scene.html does not import the real pointer-interaction module");
});

test("GATE (RC1): a real session is created for interactive mode, and real pointer events call into the real hover/click/cancel handlers -- not a second, hand-rolled decision path", () => {
  assert.match(SCENE_SRC, /if \(BOARD_MODE && INTERACTIVE_MODE\) \{/, "interactive wiring is not gated to board=1&interactive=1");
  assert.match(SCENE_SRC, /const session = createPlacementSession\(\{ board \}\)/, "interactive mode does not construct a real placement session against the real board");
  assert.match(SCENE_SRC, /renderer\.domElement\.addEventListener\("pointermove"/, "hover is not wired to a real pointermove listener");
  assert.match(SCENE_SRC, /handleHover\(session, INTERACTIVE_TYPE_ID, cell, 0\)/, "pointermove does not call the real, tested handleHover");
  assert.match(SCENE_SRC, /renderer\.domElement\.addEventListener\("pointerdown"/, "click is not wired to a real pointerdown listener");
  assert.match(SCENE_SRC, /const outcome = handleClick\(board, session, cell\)/, "pointerdown does not call the real, tested handleClick against the real board");
});

test("GATE (RC1): Escape and right-click both call the real handleCancel -- Tier 1's own two cancel gestures, neither hand-rolled separately", () => {
  assert.match(SCENE_SRC, /renderer\.domElement\.addEventListener\("contextmenu", \(e\) => \{\s*\n\s*e\.preventDefault\(\);\s*\n\s*handleCancel\(session\)/, "right-click does not call the real handleCancel");
  assert.match(SCENE_SRC, /if \(e\.key !== "Escape"\) return;\s*\n\s*handleCancel\(session\)/, "Escape does not call the real handleCancel");
});

test("RC1: a click rebuilds the board mesh through the REAL resolveBoardPieces against the CURRENT board -- a commit or remove that changed board.pieces() but left the render stale would be exactly the 'renderer and the rule disagree' failure this run's own brief names", () => {
  assert.match(SCENE_SRC, /async function rebuildBoardMesh\(\) \{/, "rebuildBoardMesh is missing -- a commit/remove would leave the merged geometry unchanged");
  assert.match(SCENE_SRC, /const \{ resolved, skipped \} = resolveBoardPieces\(board, catalogueById, manifest\);/, "rebuildBoardMesh does not re-resolve the real, current board state");
  assert.match(SCENE_SRC, /await queueRebuild\(\);/, "pointerdown does not actually trigger a rebuild after a commit/remove");
});

test("RC1: newly-needed piece geometry is loaded once and cached by the board's own piece id -- a rebuild after every click must not re-fetch a glb for a piece already on the board", () => {
  assert.match(SCENE_SRC, /const pieceGeometryCache = new Map\(\);/, "pieceGeometryCache is missing");
  assert.match(SCENE_SRC, /if \(pieceGeometryCache\.has\(p\.id\)\) continue;/, "rebuildBoardMesh does not skip already-cached pieces -- every click would re-fetch every glb on the board");
  assert.match(SCENE_SRC, /pieceGeometryCache\.set\(p\.id, addLayerAttribute\(stripped, p\.layer\)\);/, "a newly loaded piece is not added to the cache");
});

test("RC1: real board/session state is exposed on window for a driving script to read back -- the gate's own instruction, 'assert against the real thing', requires the real thing be reachable, not just the renderer's own claims about it", () => {
  assert.match(SCENE_SRC, /window\.__session = session;/, "the real session is not exposed for a driving script");
  assert.match(SCENE_SRC, /window\.__board = board;/, "the real board is not exposed for a driving script -- board.pieces().length would be unreachable from outside the page");
  assert.match(SCENE_SRC, /window\.__cellCenterToScreen = cellCenterToScreen;/, "no screen-coordinate helper is exposed -- a driving script would have no way to know which pixel to click for a given cell");
});

test("(synthetic) the vulnerability: a comment mentioning handleClick must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const outcome = handleClick(board, session, cell) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const outcome = handleClick\(board, session, cell\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

test("RC1: rapid clicks queue their own rebuilds rather than racing -- a second click's async rebuild (a new piece's glb fetch) can still be in flight when a third click starts; without serializing, whichever rebuild finishes LAST wins even from an older board snapshot, leaving the mesh disagreeing with board.pieces() (found by actually running scripts/interact-look-proof.mjs, not assumed)", () => {
  assert.match(SCENE_SRC, /let rebuildChain = Promise\.resolve\(\);/, "rebuildChain queue is missing -- overlapping pointerdown handlers can race on mesh.geometry");
  assert.match(SCENE_SRC, /rebuildChain = rebuildChain\.then\(\(\) => rebuildBoardMesh\(\)\);/, "queueRebuild does not actually chain onto the running promise -- concurrent rebuilds could still race");
  assert.match(SCENE_SRC, /await queueRebuild\(\);/, "pointerdown calls rebuildBoardMesh directly rather than through the serializing queue");
});
