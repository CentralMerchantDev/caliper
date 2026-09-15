// =============================================================================
// FIX-1 (docs/briefs/BLD-2026-09-16.md, PLAN.md §3.1) -- public/look-proof-
// pieces.js's own fitToFootprint, unit-tested directly for the first time.
// No GPU needed: THREE's geometry/matrix math runs headlessly.
//
// The 6x height cap ("added during L12 to stop odd scaling against smaller
// pieces... now the defect") is the DEFAULT behaviour when no storeys is
// passed -- kept EXACTLY as before, on purpose: HERO_MODE's own already-
// judged render (public/look-proof-scene.html's ?hero=1 composition, and
// the plain ALL_PIECES mode) calls fitToFootprint with no storeys argument
// and must not change pixel-for-pixel. The fix is additive: pass a real
// storeys count (BOARD_MODE and the catalogue contact sheet, both catalogue-
// driven) and height is driven by it instead, uncapped -- "a piece whose
// rendered height does not follow from its own data" no longer applies.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { fitToFootprint } from "../public/look-proof-pieces.js";

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d).translate(w / 2, h / 2, d / 2); // min corner at origin, matching a real loaded piece's own convention
}
function heightOf(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox!.max.y - geometry.boundingBox!.min.y;
}

test("fitToFootprint, no storeys argument (the default): height is UNCHANGED, still (sx+sz)/2 capped at 6 -- HERO_MODE's own already-judged render calls it this way and must not move", () => {
  // native 2x2x2, footprint 24x24 (6 modules, tower-base-6x6's own real
  // shape) -- sx=sz=12, uncapped average would be 12, capped stays 6.
  const g = fitToFootprint(box(2, 2, 2), [24, 24], [0, 0]);
  assert.equal(heightOf(g), 12, "2 (native height) * 6 (the cap) = 12 -- the cap must still apply with no storeys passed");
});

test("fitToFootprint, no storeys argument: a footprint stretch UNDER 6x is untouched -- only the cap's own ceiling changes anything", () => {
  const g = fitToFootprint(box(2, 2, 2), [8, 8], [0, 0]); // sx=sz=4, under the cap
  assert.equal(heightOf(g), 8, "2 (native) * 4 (uncapped average, under the cap) = 8");
});

test("GATE (FIX-1): fitToFootprint WITH a real storeys argument scales height by storeys directly, uncapped -- never the footprint-average path", () => {
  const g = fitToFootprint(box(2, 2, 2), [24, 24], [0, 0], 84); // mega-tower-a's own real storeys
  assert.equal(heightOf(g), 168, "2 (native height) * 84 (storeys) = 168 -- the footprint-average cap must not apply once storeys is real data");
});

test("GATE (FIX-1): a big, real, uncapped jump -- the same footprint that renders 12m capped renders far taller once storeys is real (tower-base-6x6-a's own real numbers: native 3.763m tall, storeys 63)", () => {
  const capped = fitToFootprint(box(1.1, 3.763, 1.1), [24, 24], [0, 0]);
  const uncapped = fitToFootprint(box(1.1, 3.763, 1.1), [24, 24], [0, 0], 63);
  assert.ok(uncapped.boundingBox!.max.y > capped.boundingBox!.max.y * 5, `expected a real, order-of-magnitude jump once storeys drives height, got capped=${capped.boundingBox!.max.y} uncapped=${uncapped.boundingBox!.max.y}`);
});

test("fitToFootprint: X/Z footprint fit is IDENTICAL whether or not storeys is passed -- the fix touches height only, never the footprint a placement's own plot limits are defined by", () => {
  const a = fitToFootprint(box(2, 2, 2), [16, 24], [3, 5]);
  const b = fitToFootprint(box(2, 2, 2), [16, 24], [3, 5], 40);
  a.computeBoundingBox(); b.computeBoundingBox();
  assert.deepEqual([a.boundingBox!.min.x, a.boundingBox!.max.x, a.boundingBox!.min.z, a.boundingBox!.max.z], [b.boundingBox!.min.x, b.boundingBox!.max.x, b.boundingBox!.min.z, b.boundingBox!.max.z], "X/Z extent must not depend on storeys");
});

test("fitToFootprint: storeys=0 or a non-finite value falls back to the default (footprint-average, capped) path -- never a zero-height or NaN piece", () => {
  for (const bad of [0, NaN, undefined, null, -5]) {
    const g = fitToFootprint(box(2, 2, 2), [24, 24], [0, 0], bad as any);
    assert.equal(heightOf(g), 12, `storeys=${bad} must fall back to the capped default, got height ${heightOf(g)}`);
  }
});
