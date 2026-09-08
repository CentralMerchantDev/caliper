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

import { groundOrRefuse, gradeGroundBands, bandLevelAt } from "../public/city-render.js";
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

// P3.6.2 -- gradeGroundBands' own fallback (`cnt ? sum/cnt : ri>0 ?
// cellY[idx-cols] : 2`) was absence read as success again, in the SAME
// commit that removed seven other instances of it: a cell with no dry
// sample point fell back to a hardcoded 2m, or a borrowed neighbour's
// value -- both a constant substituting for a real measurement. RED-FIRST:
// reverting gradeGroundBands' cell resolution to that exact ternary turns
// "every cell wet" from all-null into a grid of the constant 2 (and the
// row nearest z0 specifically resolves to literal 2, not null). Watched
// red before this test was trusted; see the P3.6 commit message for the
// paste. gradeGroundBands is shared by the container yard and the golf
// course (P3.6.3) -- one mechanism, tested once, not twice.
const bounds = { x0: -900, x1: 900, z0: 0, z1: 490 };

test("P3.6.2: a fully underwater footprint refuses every cell -- none resolve to a constant", () => {
  const wetHeightAt = () => 0.1; // underwater everywhere
  const bands = gradeGroundBands(wetHeightAt, bounds);
  assert.ok(bands.cellY.length > 0, "setup: expected a real grid of cells");
  assert.ok(bands.cellY.every((v) => v === null), "every cell of a fully wet footprint must be null (refused), not a fabricated ground level");
  assert.equal(bands.refused, bands.cols * bands.rows, "every cell must be counted as refused");
});

test("P3.6.2: no constant ground level (in particular, not the old hardcoded 2) appears anywhere", () => {
  // The row nearest z0 is where the old code's `ri > 0 ? cellY[idx-cols] : 2`
  // fallback had NO neighbour to borrow from and fell through to the
  // literal 2. Forced to exactly one row (cellZ spans the whole footprint)
  // so there is no cell-boundary ambiguity about which samples land where.
  const wetHeightAt = () => 0.1; // underwater everywhere
  const bands = gradeGroundBands(wetHeightAt, bounds, { cellZ: 490 });
  assert.equal(bands.rows, 1, "setup: expected exactly one row");
  assert.ok(bands.cellY.every((v) => v === null), "the row nearest z0, wet, must refuse -- not resolve to the old hardcoded 2m fallback");
  assert.ok(!bands.cellY.some((v) => v === 2), "no cell anywhere may resolve to the old hardcoded constant 2, dry or wet");
});

test("P3.6.2: a dry cell grades to its own real local mean, not a neighbour's", () => {
  // Distinct dry heights per row, all well above DRY_ENOUGH -- if a cell
  // ever borrowed a neighbour's value instead of computing its own, this
  // would catch it (adjacent rows would report identical levels).
  const stripedHeightAt = (_x: number, z: number) => 5 + Math.floor(z / 35);
  const bands = gradeGroundBands(stripedHeightAt, bounds, { cellZ: 35 });
  assert.equal(bands.refused, 0, "setup: this footprint is entirely dry, nothing should refuse");
  const col0 = [];
  for (let ri = 0; ri < bands.rows; ri++) col0.push(bands.cellY[ri * bands.cols]);
  const distinct = new Set(col0.map((v) => Math.round((v as number) * 100)));
  assert.ok(distinct.size > 1, "adjacent rows on a real slope must grade to different levels, not all inherit one row's value");
});

test("P3.6.2: bandLevelAt returns null for a refused cell and a real number for a dry one", () => {
  const halfWetHeightAt = (x: number) => (x < 0 ? 0.1 : 12);
  const bands = gradeGroundBands(halfWetHeightAt, bounds);
  assert.equal(bandLevelAt(bands, bands.x0 + 1, bands.z0 + 1), null, "a point in the wet half must refuse");
  assert.equal(bandLevelAt(bands, bands.x1 - 1, bands.z0 + 1), 12, "a point in the dry half must return its real graded level");
});

test("P3.6.3: gradeGroundBands works on a square footprint too, not just the port's rectangle -- the golf course is CX +/- 760 in both axes", () => {
  const bandedHeightAt = (x: number, z: number) => 20 + x / 100 + z / 100;
  const golfBounds = { x0: -760, x1: 760, z0: -760, z1: 760 };
  const bands = gradeGroundBands(bandedHeightAt, golfBounds, { cellX: 150, cellZ: 150 });
  assert.equal(bands.refused, 0, "setup: this footprint is entirely dry");
  assert.equal(bandLevelAt(bands, -700, -700), bands.cellY[0], "a corner point must resolve to its own corner cell");
  assert.notEqual(bands.cellY[0], bands.cellY[bands.cellY.length - 1], "opposite corners on a real slope must grade differently");
});
