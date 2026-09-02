// =============================================================================
// A SITE IS A POINT. A FOOTPRINT IS THE GROUND IT COSTS.
//
// placeFeatures() resolves WHERE a feature goes; footprintOf() turns that into
// the rectangle(s) the world registry reserves. This file tests footprintOf()
// against synthetic sites for each `need.kind` land-use.js can hand back, so
// the geometry is checked without paying for a full world generation.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { footprintOf, RAIL_CORRIDOR_HALF_WIDTH, FEATURES, placeFeatures } from "../public/features.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

test("a 'site' feature's footprint is centred on the site, sized from need.w/need.d", () => {
  const feature = { need: { kind: "site", w: 320, d: 250 } };
  const site = { x: 1000, z: -500 };
  const [fp] = footprintOf(feature as any, site as any);
  assert.equal(fp.xMin, 1000 - 160);
  assert.equal(fp.xMax, 1000 + 160);
  assert.equal(fp.zMin, -500 - 125);
  assert.equal(fp.zMax, -500 + 125);
});

test("a 'flattest' feature's footprint reads the same way as 'site'", () => {
  const feature = { need: { kind: "flattest", w: 3500, d: 1200 } };
  const site = { x: 0, z: 0 };
  const [fp] = footprintOf(feature as any, site as any);
  assert.equal(fp.xMax - fp.xMin, 3500);
  assert.equal(fp.zMax - fp.zMin, 1200);
});

test("a 'quay' feature reserves land-side ground, not the water it berths against", () => {
  const feature = { need: { kind: "quay", length: 500, reach: 180 } };
  // landSide +1, ew: land is on the +z side of the quay line.
  const site = { x: 0, z: 0, along: "ew", landSide: 1, length: 500 };
  const [fp] = footprintOf(feature as any, site as any);
  assert.equal(fp.xMin, -250);
  assert.equal(fp.xMax, 250);
  assert.equal(fp.zMin, 0, "must not reserve into the water side");
  assert.equal(fp.zMax, 180);
});

test("a 'quay' feature on the opposite landSide reserves the other direction", () => {
  const feature = { need: { kind: "quay", length: 500, reach: 180 } };
  const site = { x: 0, z: 0, along: "ew", landSide: -1, length: 500 };
  const [fp] = footprintOf(feature as any, site as any);
  assert.equal(fp.zMin, -180);
  assert.equal(fp.zMax, 0);
});

test("a 'corridor' feature reserves a strip of fixed half-width along its declared run", () => {
  const feature = { need: { kind: "corridor" } };
  const site = { axis: "ew", at: -2665, from: -11050, to: 11050 };
  const [fp] = footprintOf(feature as any, site as any);
  assert.equal(fp.xMin, -11050);
  assert.equal(fp.xMax, 11050);
  assert.equal(fp.zMin, -2665 - RAIL_CORRIDOR_HALF_WIDTH);
  assert.equal(fp.zMax, -2665 + RAIL_CORRIDOR_HALF_WIDTH);
});

test("an unrecognised need.kind returns no footprint rather than a zero-sized one", () => {
  const feature = { need: { kind: "mystery" } };
  const site = { x: 0, z: 0 };
  assert.deepEqual(footprintOf(feature as any, site as any), []);
});

test("every FEATURES manifest entry produces a real, non-empty footprint once placed", () => {
  const heightAt = makeHeightAt(new LandField(16));
  const { sites } = placeFeatures(heightAt);
  for (const f of FEATURES) {
    const site = (sites as any)[f.id];
    if (!site) continue;   // a feature that failed to place has nothing to reserve
    const fps = footprintOf(f, site);
    assert.ok(fps.length > 0, `${f.id} placed but produced no footprint`);
    for (const fp of fps) {
      assert.ok(fp.xMax > fp.xMin, `${f.id} footprint has zero or negative width`);
      assert.ok(fp.zMax > fp.zMin, `${f.id} footprint has zero or negative depth`);
    }
  }
});
