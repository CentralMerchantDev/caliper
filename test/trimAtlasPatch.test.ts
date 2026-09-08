import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { building, TRIM_PATCH_U0, TRIM_PATCH_USPAN, TRIM_PATCH_V0, TRIM_PATCH_VSPAN } from "../public/buildings.js";

// K7.1: the atlas's old flat "Reserved Plain / Roof Patch" had trim boxes
// (cornices, string courses, parapets) sample one single hardcoded UV point,
// (0.97, 0.97) -- every vertex of every trim box the same texel, which is
// why real texture painted there could never be visible no matter how much
// grain the atlas carried. Trim now samples its own reserved patch, at
// TRIM_PATCH_U0/V0, with real per-vertex variation (BoxGeometry's own
// generated UV, remapped into the patch) instead of a collapsed point.
//
// bld-office's LOD0 is a genuine mixed case: it has both K7's trim (tag
// "trim", from mergeWithMassingDepth) AND its own ordinary roof-tagged
// canopy/screen/chiller geometry (tag "roof", untouched by this change) in
// the SAME merged buffer, which lets one test confirm the new patch is used
// AND that it did not disturb the old one.
test("K7.1: trim UVs land inside the reserved trim patch, with real per-vertex variation, and the flat roof patch is untouched", () => {
  const s = building("bld-office", "trim-uv-test", {}, THREE);
  const geo = s.lod[0].createGeometry(THREE);
  const uv = geo.attributes.uv;
  assert.ok(uv, "LOD0 geometry must carry a uv attribute");

  const u0 = TRIM_PATCH_U0, u1 = TRIM_PATCH_U0 + TRIM_PATCH_USPAN;
  const v0 = TRIM_PATCH_V0, v1 = TRIM_PATCH_V0 + TRIM_PATCH_VSPAN;

  const inTrimPatch = new Set();
  let flatPatchCount = 0;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (u >= u0 && u <= u1 && v >= v0 && v <= v1) {
      inTrimPatch.add(`${u.toFixed(5)},${v.toFixed(5)}`);
    }
    if (Math.abs(u - 0.97) < 1e-6 && Math.abs(v - 0.97) < 1e-6) {
      flatPatchCount++;
    }
  }

  assert.ok(
    inTrimPatch.size > 0,
    `expected some UVs inside the reserved trim patch [${u0.toFixed(4)}, ${u1.toFixed(4)}] x ` +
    `[${v0.toFixed(4)}, ${v1.toFixed(4)}], found none -- trim geometry is not sampling its own patch`,
  );
  assert.ok(
    inTrimPatch.size > 1,
    `trim UVs inside the patch must vary across more than one distinct point ` +
    `(found ${inTrimPatch.size}) -- a single collapsed point means no real texture ` +
    `will ever be visible, however much grain the atlas carries`,
  );
  assert.ok(
    flatPatchCount > 0,
    "bld-office's own roof-tagged canopy/screen/chiller geometry must still land on the " +
    "original flat patch at exactly (0.97, 0.97) -- the trim patch must not have moved or " +
    "replaced it for genuinely non-trim roof geometry",
  );
});
