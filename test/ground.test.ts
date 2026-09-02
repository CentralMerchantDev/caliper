// =============================================================================
// THE LAND ANSWERS, AND THE ANSWERS ARE TRUE
//
// public/ground.js is the ground that models get laid onto. These check the
// properties that make it worth having -- not that its functions return
// something, but that they REFUSE the things they exist to refuse, and refuse
// them for the right stated reason.
//
// The distinction matters here more than usual. A canPlace that always returns
// ok:true passes any test that only asks "did it run". A canPlace that always
// returns ok:false passes any test that only checks refusals. Both are useless
// and both look fine on a green suite, so every refusal test below is paired
// with a case that must SUCCEED.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGround, SURFACE, STRATA, AIR_BANDS, BEDROCK_Y, strataAt, bandAt } from "../public/ground.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField());
const land = createGround({ heightAt });

/** A point that is reliably dry and reliably flat-ish, found rather than assumed. */
function findGround(pred: (x: number, z: number) => boolean, label: string): [number, number] {
  for (let x = -8000; x <= 8000; x += 40) {
    for (let z = -8000; z <= 8000; z += 40) {
      if (pred(x, z)) return [x, z];
    }
  }
  throw new Error(`no ${label} found anywhere in the search window — the world has changed shape`);
}

test("the land refuses to exist without a height function", () => {
  // @ts-expect-error deliberately wrong
  assert.throws(() => createGround({}), /heightAt/);
});

test("bare terrain reports water, beach and open ground, and they are different places", () => {
  const seen = new Set<string>();
  for (let x = -12000; x <= 12000; x += 200) {
    for (let z = -12000; z <= 12000; z += 200) seen.add(land.surfaceAt(x, z));
  }
  // If this collapses to one value the classifier has stopped classifying, and
  // every canPlace surface check below would pass or fail for the wrong reason.
  assert.ok(seen.has(SURFACE.WATER), "no water anywhere — the world is 26 km of islands");
  assert.ok(seen.has(SURFACE.OPEN), "no open ground anywhere");
  assert.ok(seen.size >= 3, `only ${[...seen].join(", ")} — the surface classifier has collapsed`);
});

test("a column describes the solid below and knows where the rock stops", () => {
  const [x, z] = findGround((x, z) => heightAt(x, z) > 30, "dry ground above 30 m");
  const col = land.columnAt(x, z);

  assert.equal(col.bedrock, BEDROCK_Y);
  assert.ok(col.ground > 30, "found ground should be the ground we asked for");
  assert.equal(col.underwater, false);
  assert.ok(col.strata.length > 0, "solid ground with no strata is not solid");

  // Thicknesses, not boundaries: a caller digging a basement wants "how much
  // subsoil", and the sum must reach bedrock or the column has a hole in it.
  const total = col.strata.reduce((a, s) => a + s.thickness, 0);
  assert.ok(
    Math.abs(total - (col.ground - BEDROCK_Y)) < 1e-6,
    `strata total ${total.toFixed(2)} m does not reach bedrock ${(col.ground - BEDROCK_Y).toFixed(2)} m below the surface`,
  );
  assert.equal(col.strata[0].name, "topsoil", "the first thing under the grass should be topsoil");
});

test("underwater ground reports its depth rather than a negative height", () => {
  const [x, z] = findGround((x, z) => heightAt(x, z) < -5, "sea bed below -5 m");
  const col = land.columnAt(x, z);
  assert.equal(col.underwater, true);
  assert.ok(col.waterDepth > 5, `depth ${col.waterDepth} should be positive metres of water`);
  assert.equal(col.surface, SURFACE.WATER);
});

test("strata and bands are ordered, and every depth and height lands in one", () => {
  for (const d of [0, 1, 2, 7.9, 8, 24, 70, 1000]) {
    assert.ok(strataAt(d), `depth ${d} m falls in no stratum`);
  }
  for (const h of [0, 1.9, 12, 59, 199, 5000]) {
    assert.ok(bandAt(h), `height ${h} m falls in no band`);
  }
  // Ordering is load-bearing: strataAt returns the FIRST match, so an unsorted
  // table silently returns bedrock for topsoil.
  for (let i = 1; i < STRATA.length; i++) {
    assert.ok(STRATA[i].to > STRATA[i - 1].to, `STRATA is not in increasing depth order at index ${i}`);
  }
  for (let i = 1; i < AIR_BANDS.length; i++) {
    assert.ok(AIR_BANDS[i].to > AIR_BANDS[i - 1].to, `AIR_BANDS is not in increasing height order at index ${i}`);
  }
  assert.equal(strataAt(1).name, "topsoil");
  assert.equal(strataAt(1000).name, "bedrock");
  assert.equal(bandAt(1).name, "pedestrian");
  assert.equal(bandAt(100000).name, "sky");
});

// ---------------------------------------------------------------------------
// canPlace — every refusal paired with a success, so neither direction can be
// satisfied by a function that always answers the same way.
// ---------------------------------------------------------------------------

const BENCH = { footprint: { w: 1.8, d: 0.55 }, height: 0.9, clearance: 0.4, standsOn: [SURFACE.OPEN] };

test("a bench may stand on open ground", () => {
  const [x, z] = findGround(
    (x, z) => heightAt(x, z) > 5 && land.surfaceAt(x, z) === SURFACE.OPEN && land.canPlace(BENCH, x, z).ok,
    "open ground a bench fits on",
  );
  const r = land.canPlace(BENCH, x, z);
  assert.equal(r.ok, true, `expected a bench to fit somewhere: ${r.reason} — ${r.detail}`);
  assert.equal(r.reason, null);
  assert.ok(r.samples > 1, "a footprint checked at a single point is not checked");
});

test("a bench may not stand in the sea, and is told that it is the sea", () => {
  const [x, z] = findGround((x, z) => heightAt(x, z) < -20, "deep water");
  const r = land.canPlace(BENCH, x, z);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "surface");
  assert.match(r.detail!, /water/, `refusal should name the surface, got: ${r.detail}`);
});

test("a wide flat thing is refused on ground that moves under it, with the number", () => {
  // A 60 m slab. Somewhere on a 26 km world of mountains there is ground that
  // moves more than 2 m across 60 m, and this must find it rather than assume.
  const SLAB = { footprint: { w: 60, d: 60 }, height: 4, clearance: 0, standsOn: [SURFACE.OPEN] };
  let refusal: any = null;
  for (let x = -8000; x <= 8000 && !refusal; x += 120) {
    for (let z = -8000; z <= 8000 && !refusal; z += 120) {
      if (land.surfaceAt(x, z) !== SURFACE.OPEN) continue;
      const r = land.canPlace(SLAB, x, z);
      if (!r.ok && r.reason === "slope") refusal = r;
    }
  }
  assert.ok(refusal, "no ground anywhere was too steep for a 60 m slab — the fit check is not firing");
  assert.match(refusal.detail, /ground moves [\d.]+ m/, `refusal should quote the movement, got: ${refusal.detail}`);
  assert.ok(refusal.range > 0, "a slope refusal with zero range is not a slope refusal");
});

test("the footprint is checked across its whole area, not at its centre", () => {
  // THE BUG THIS EXISTS FOR: a centre-only check puts a building's corner over
  // a cliff and reports success. Find a point whose CENTRE is fine but whose
  // footprint is not, and confirm the answer is no.
  const BIG = { footprint: { w: 120, d: 120 }, height: 10, clearance: 0, standsOn: [SURFACE.OPEN], maxRange: 1 };
  const TINY = { footprint: { w: 1, d: 1 }, height: 1, clearance: 0, standsOn: [SURFACE.OPEN], maxRange: 1 };
  let found = false;
  for (let x = -8000; x <= 8000 && !found; x += 120) {
    for (let z = -8000; z <= 8000 && !found; z += 120) {
      if (land.surfaceAt(x, z) !== SURFACE.OPEN) continue;
      if (TINY.footprint && land.canPlace(TINY, x, z).ok && !land.canPlace(BIG, x, z).ok) found = true;
    }
  }
  assert.ok(
    found,
    "nowhere in the world is a 1 m footprint acceptable while a 120 m one is not — " +
    "which would mean the footprint is not being sampled across its area",
  );
});

test("clearance is real ground, not decoration", () => {
  // Same object, same spot, only the clearance changes. If clearance were
  // ignored the two answers would be identical everywhere.
  const NARROW = { footprint: { w: 2, d: 2 }, height: 2, clearance: 0, standsOn: [SURFACE.OPEN], maxRange: 0.5 };
  const PADDED = { ...NARROW, clearance: 30 };
  let differed = false;
  for (let x = -8000; x <= 8000 && !differed; x += 160) {
    for (let z = -8000; z <= 8000 && !differed; z += 160) {
      if (land.surfaceAt(x, z) !== SURFACE.OPEN) continue;
      if (land.canPlace(NARROW, x, z).ok && !land.canPlace(PADDED, x, z).ok) differed = true;
    }
  }
  assert.ok(differed, "clearance never changed an answer anywhere — it is not being applied");
});

test("a footprint with no size is refused outright rather than silently accepted", () => {
  assert.throws(() => land.canPlace({ footprint: { w: 0, d: 5 } } as any, 0, 0), /footprint/);
  assert.throws(() => land.canPlace({} as any, 0, 0), /footprint/);
});

test("rotation swaps the footprint's axes", () => {
  const LONG = { footprint: { w: 80, d: 4 }, height: 2, clearance: 0, standsOn: [SURFACE.OPEN], maxRange: 0.6 };
  let differed = false;
  for (let x = -8000; x <= 8000 && !differed; x += 160) {
    for (let z = -8000; z <= 8000 && !differed; z += 160) {
      if (land.surfaceAt(x, z) !== SURFACE.OPEN) continue;
      const a = land.canPlace(LONG, x, z, { rotated: false });
      const b = land.canPlace(LONG, x, z, { rotated: true });
      if (a.ok !== b.ok) differed = true;
    }
  }
  assert.ok(
    differed,
    "an 80 x 4 m footprint gave the same answer in both orientations everywhere — rotation is being ignored",
  );
});
