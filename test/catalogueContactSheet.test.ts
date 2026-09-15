// =============================================================================
// THE CATALOGUE CONTACT SHEET'S OWN STATIC WIRING — CP2's gate: "the
// sheet, judged by Mark. No numeric gate." No GPU in this suite -- these
// are static checks that the page reads the REAL data/catalogue.json and
// renders every real glb-bound entry, never a hand-typed subset.
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
const SCENE_SRC = stripHtmlComments(stripSourceComments(readFileSync(join(PUBLIC, "catalogue-contact-sheet.html"), "utf8")));

test("GATE (CP2): every glb-bound entry is read from the real data/catalogue.json, never a hand-typed subset", () => {
  assert.match(SCENE_SRC, /const catalogueArr = await fetch\("data\/catalogue\.json"\)\.then\(\(r\) => r\.json\(\)\);/, "the real catalogue is not fetched");
  assert.match(SCENE_SRC, /const boundEntries = catalogueArr\.filter\(\(e\) => e\.glb\);/, "bound entries are not filtered from the real catalogue's own glb field");
});

test("GATE (CP2): every rendered piece gets a real DOM label carrying its own catalogue id, positioned by projecting through the SAME camera the render used", () => {
  assert.match(SCENE_SRC, /div\.textContent = l\.entry\.id;/, "labels do not carry the piece's own real catalogue id");
  assert.match(SCENE_SRC, /const v = new THREE\.Vector3\(cx, 0, cz\)\.project\(camera\);/, "labels are not positioned via the real camera's own projection -- they could drift from where the piece actually renders");
});

test("RC4-pattern: fog is overridden for this camera's own real distance via a caller-side uniform write, never an edit to look-proof-material.js's own defaults -- found necessary by looking at the first render, not assumed", () => {
  assert.match(SCENE_SRC, /material\.uniforms\.uFogFar\.value = dist \* 4;/, "fog is not overridden for this scene's own camera distance -- pieces would render fogged into the ground's own tone, exactly the first real render's own defect");
});

test("GATE (CAT-4): the camera looks along ONE axis (front-on), not a 45-degree diagonal isometric offset -- CAT-2's own diagonal camera read as 'a diagonal strip in a field of black' (Mark, docs/briefs/BLD-2026-09-16.md), because an equal X/Z offset onto a rectangular grid photographs as a rotated diamond, not a grid", () => {
  assert.doesNotMatch(SCENE_SRC, /camera\.position\.set\(centerX - dist,[^)]*centerZ - dist\)/, "the camera is still offset on BOTH x and z -- the rejected 45-degree diagonal isometric angle");
  assert.match(SCENE_SRC, /camera\.position\.set\(centerX,/, "the camera's own x is not fixed at centerX -- rows would still read diagonally, not as horizontal bands");
});

test("(synthetic) the vulnerability: a comment mentioning boundEntries must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const boundEntries = catalogueArr.filter((e) => e.glb) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const boundEntries = catalogueArr\.filter\(\(e\) => e\.glb\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});
