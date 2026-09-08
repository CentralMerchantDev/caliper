// P3.5.2 item 3 -- SEVEN fail-open floors of the form
// Math.max(<const>, heightAt(...)) in public/city-render.js (the container
// port's cranes, the marina's clubhouse and hauled-out boats, the
// boardwalk, the stadium, and the cathedral -- station is fixed separately
// via assessFootprint, P3.5.2 item 2). Each one read "no ground here" as
// "+<const> m of ground" and floated the set piece anyway.
//
// public/city-render.js's own scene-building functions need a GPU
// (test/rendererStatic.test.ts) and cannot run in this suite, so the
// decision itself -- ground.js's groundOrRefuse(heightAt, x, z) -- is
// extracted and tested here in isolation, pure and THREE-free. The real
// renderer's end-to-end behaviour (a wet set piece actually vanishes from
// the built scene, not just "the function would have returned null") is
// covered separately by scripts/measure-floating.mjs against the real
// running world (docs/audits/P3.5-FLOATING.md).
//
// RED-FIRST: reverting groundOrRefuse to `Math.max(DRY_ENOUGH, heightAt(x, z))`
// -- the exact pattern this fix replaced -- turns the first assertion below
// from `null` to `0.3`, i.e. from "refused" to "floated at 0.3 m". Watched
// red before this test was trusted; see the commit message for the
// mutation-proof paste.

import { test } from "node:test";
import assert from "node:assert/strict";

import { groundOrRefuse } from "../public/city-render.js";
import { DRY_ENOUGH } from "../public/footprint.js";

test("P3.5.2: a site below DRY_ENOUGH is refused, not floated", () => {
  const wetHeightAt = () => 0.3; // underwater -- below DRY_ENOUGH (0.6)
  assert.equal(groundOrRefuse(wetHeightAt, 100, 200), null, "a site at 0.3m (wet) must refuse, not return a floored height");
});

test("P3.5.2: a site exactly at DRY_ENOUGH is dry (strict <, matching footprint.js's own wet check)", () => {
  const boundaryHeightAt = () => DRY_ENOUGH;
  assert.equal(groundOrRefuse(boundaryHeightAt, 0, 0), DRY_ENOUGH, "DRY_ENOUGH itself is the boundary of dry, not of wet -- footprint.js's assessFootprint uses `h < DRY_ENOUGH` for wet, the same strict comparison");
});

test("P3.5.2: a real, dry site returns its actual ground height, unmodified", () => {
  const dryHeightAt = () => 12.4;
  assert.equal(groundOrRefuse(dryHeightAt, 500, -300), 12.4, "a dry site's real height must pass through unchanged -- no flooring, no clamping");
});

test("P3.5.2: groundOrRefuse queries heightAt at the exact coordinates given, not some other point", () => {
  const seen: Array<[number, number]> = [];
  const spy = (x: number, z: number) => { seen.push([x, z]); return 5; };
  groundOrRefuse(spy, -1234, 5678);
  assert.deepEqual(seen, [[-1234, 5678]], "groundOrRefuse must sample the site it was asked about");
});
