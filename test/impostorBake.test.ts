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
import { hemiOctahedralDirection } from "../public/octahedral-mapping.js";

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
// Both comment forms stripped -- FOUND BY A BLIND AUDIT: stripHtmlComments
// alone only blanks <!-- -->, leaving a JS `//` comment inside a real
// <script> block able to satisfy every check below unchanged.
const SRC = stripHtmlComments(stripSourceComments(readFileSync(join(PUBLIC, "impostor-bake-scene.html"), "utf8")));

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

test("impostor-bake-scene.html imports the REAL hemi-octahedral direction from octahedral-mapping.js, not a second copy", () => {
  assert.match(SRC, /import \{ hemiOctahedralDirection as hemiOctDirRaw \} from "\.\/octahedral-mapping\.js"/, "impostor-bake-scene.html does not import the shared function -- a second copy is exactly how this file's own bug (the unfolded formula) could silently reappear");
});

test("octahedral-mapping.js's hemi-octahedral direction lands on the upper hemisphere (y >= 0) for every one of the 64 real grid cells this bake actually uses, not just the diamond |u|+|v|<=1", () => {
  // The REAL function, imported directly -- not a second copy of the
  // formula re-typed into this test. A duplicated copy is exactly how
  // the bug this test exists to catch (y = 1 - |u| - |v| going negative
  // at the square's own corners, confirmed by evaluating it directly
  // rather than trusting the comment describing it) could drift out of
  // sync with whatever the test believed it was checking.
  const GRID_SIZE = 8; // matches impostor-bake-scene.html's own GRID_SIZE
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const u = (gx / (GRID_SIZE - 1)) * 2 - 1;
      const v = (gy / (GRID_SIZE - 1)) * 2 - 1;
      const [, y] = hemiOctahedralDirection(u, v);
      assert.ok(y >= -1e-9, `hemiOctahedralDirection(${u}, ${v}) produced y=${y} -- below the horizon, contradicting this bake's own "hemisphere, never below" intent`);
    }
  }
});

test("(synthetic) the vulnerability: the UNFOLDED formula fails the check above at a real corner", () => {
  // Proves the check above is actually sensitive, not vacuously true --
  // the exact formula this file replaced, evaluated at the exact corner
  // (u=v=1) the audit named, must fail it.
  const unfolded = (u, v) => {
    const y = 1.0 - Math.abs(u) - Math.abs(v);
    const len = Math.sqrt(u * u + y * y + v * v);
    return [u / len, y / len, v / len];
  };
  const [, y] = unfolded(1, 1);
  assert.ok(y < 0, "the unfolded formula's own known-bad corner (1,1) should produce a negative y -- if it does not, this synthetic check itself is wrong");
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

test("the committed atlas PNGs actually exist, are non-trivially sized, and their on-disk bytes match stats.json's own recorded figures", () => {
  // FOUND BY A BLIND AUDIT: every check above reads the SCRIPT's source
  // for the code that measures artefacts -- none of them opened the
  // artefacts themselves. A script that claims to write real files could
  // fail to write them, write them empty, or fall out of sync with its
  // own stats.json, and every check above would still pass.
  const bakeDir = join(PUBLIC, "..", "docs", "look-proof-shots", "impostor-bake");
  const stats = JSON.parse(readFileSync(join(bakeDir, "stats.json"), "utf8"));
  for (const name of ["colour", "normal", "depth"]) {
    const filePath = join(bakeDir, `${name}-atlas.png`);
    const bytes = readFileSync(filePath);
    assert.ok(bytes.length > 1000, `${name}-atlas.png is only ${bytes.length} bytes -- too small to be a real 1024x1024 atlas, likely blank or truncated`);
    // A minimal real-PNG check: the signature, and that IHDR reports the
    // atlas resolution stats.json itself claims -- catches a truncated or
    // substituted file a byte-count threshold alone could miss.
    assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${name}-atlas.png does not start with the real PNG signature`);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    assert.equal(width, stats.atlasResolution, `${name}-atlas.png's own IHDR width (${width}) does not match stats.json's atlasResolution (${stats.atlasResolution})`);
    assert.equal(height, stats.atlasResolution, `${name}-atlas.png's own IHDR height (${height}) does not match stats.json's atlasResolution (${stats.atlasResolution})`);
    assert.equal(bytes.length, stats.realPngBytesPerAtlas[name], `${name}-atlas.png's real on-disk size (${bytes.length}) does not match stats.json's own recorded realPngBytesPerAtlas.${name} (${stats.realPngBytesPerAtlas[name]}) -- the two have drifted apart`);
  }
});
