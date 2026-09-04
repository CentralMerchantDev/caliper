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
import { createWorldRegistry } from "../public/world-registry.js";

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

/**
 * Ground that is open and flat for `r` metres around, so a test about SIZE is
 * not accidentally answered by a cliff at the edge of the footprint. The first
 * version of the sizing tests picked the first dry point in the search and got
 * a mountainside, where a 30 m tower is refused for the terrain under its
 * corner rather than for being too big for its plot -- a pass for the wrong
 * reason, which is worse than a failure.
 */
function findClearGround(r: number): [number, number] {
  for (let x = -8000; x <= 8000; x += 80) {
    for (let z = -8000; z <= 8000; z += 80) {
      if (heightAt(x, z) < 5) continue;
      let clear = true;
      for (let dx = -r; dx <= r && clear; dx += r / 2) {
        for (let dz = -r; dz <= r && clear; dz += r / 2) {
          if (land.surfaceAt(x + dx, z + dz) !== SURFACE.OPEN) clear = false;
          if (Math.abs(heightAt(x + dx, z + dz) - heightAt(x, z)) > 3) clear = false;
        }
      }
      if (clear) return [x, z];
    }
  }
  throw new Error(`no open ground clear for ${r} m anywhere — the world has changed shape`);
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

test("a bench may not stand in the sea, and the LAND is what refuses it", () => {
  // Refused at the terrain step, not by a surface permission. This is the
  // distinction the model turns on: the land does not assign what may be here,
  // it rules out the few things it genuinely knows are impossible. Open water
  // carries nothing that stands on the ground.
  const [x, z] = findGround((x, z) => heightAt(x, z) < -20, "deep water");
  const r = land.canPlace(BENCH, x, z);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "terrain", `the land should refuse this, not a surface rule: ${r.detail}`);
  assert.match(r.detail!, /water/, `refusal should name the water, got: ${r.detail}`);
});

test("but a bridge crosses the same water, because it carries itself", () => {
  // The pair. If the water rule were absolute the world could have no bridges,
  // no piers and no boats; if it were absent a bench would float. `support`
  // is what separates them, and it has to be checked rather than assumed.
  const [x, z] = findGround((x, z) => heightAt(x, z) < -20, "deep water");
  // `category` IS DECLARED HERE ON PURPOSE, AND ITS ABSENCE WAS THE BUG.
  //
  // This case used to omit it, and omitting it is the one shape that dodged the
  // acceptance table: canPlace only consults ACCEPTS when a spec HAS a category.
  // So this passed while a bridge that described itself -- which every real
  // caller does -- was refused "water carries vessel, not a structure". The test
  // written to defend bridges was passing for the reason bridges were broken.
  const SPAN = { footprint: { w: 12, d: 40 }, height: 6, clearance: 0, support: "span", category: "structure", maxRange: 1e9 };
  const r = land.canPlace(SPAN, x, z);
  assert.equal(r.ok, true, `a spanning structure must be able to cross water: ${r.reason} — ${r.detail}`);

  // And the same over a cliff, which TERRAIN_REFUSES also grants and ACCEPTS
  // also revoked -- ACCEPTS[rock] is [], so it refused with "rock carries
  // nothing" for any category at all.
  const [cx, cz] = findGround((x2, z2) => land.surfaceAt(x2, z2) === "rock", "a cliff face");
  const OVER_CLIFF = { footprint: { w: 10, d: 30 }, height: 6, clearance: 0, support: "span", category: "structure", maxRange: 1e9 };
  assert.equal(land.canPlace(OVER_CLIFF, cx, cz).ok, true,
    `a bridge must cross a gorge as well as a bay: ${JSON.stringify(land.canPlace(OVER_CLIFF, cx, cz))}`);

  // PAIRED: the exception is for spans, not a hole in the rule. Something that
  // stands on the ground and calls itself a structure is still refused.
  const SHED = { footprint: { w: 4, d: 4 }, height: 3, clearance: 0, category: "structure", maxRange: 1e9 };
  assert.equal(land.canPlace(SHED, x, z).ok, false, "a shed does not float");

  const HULL = { footprint: { w: 4, d: 12 }, height: 3, clearance: 0, category: "vessel", maxRange: 1e9 };
  assert.equal(land.canPlace(HULL, x, z).ok, true, "a boat belongs on water");
});

test("unbuilt land accepts anything, because the land does not assign what may be there", () => {
  // The entry that makes the world buildable. If OPEN carried a permission list
  // instead of null, every new kind of object would need the land amended
  // before it could be placed anywhere at all.
  const [x, z] = findGround(
    (x, z) => heightAt(x, z) > 5 && land.surfaceAt(x, z) === SURFACE.OPEN,
    "open ground",
  );
  for (const category of ["building", "vehicle", "furniture", "vegetation", "structure", "pedestrian"]) {
    const r = land.canPlace({ footprint: { w: 2, d: 2 }, height: 2, clearance: 0, category, maxRange: 1e9 }, x, z);
    assert.equal(r.ok, true, `open land refused a ${category}: ${r.reason} — ${r.detail}`);
  }
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

// ---------------------------------------------------------------------------
// canPlace against a REGISTRY. Everything above builds the land with no
// registry, so the occupancy branch never runs -- which left the most important
// integration in this file untested, and a mutation removing the kind filter
// passed a green suite. That is the defect these exist for.
// ---------------------------------------------------------------------------

test("a thing may stand on the ground a road defines, without the road itself refusing it", () => {
  // THE BUG: roads are reserved across their FULL right of way, so anything on
  // a carriageway or a pavement is inside a road's rectangle by construction.
  // If canPlace asks the unfiltered occupancy question, every vehicle and every
  // piece of street furniture in the world is refused -- and it looks like
  // placement broke rather than like the wrong question was asked.
  const reg = createWorldRegistry(heightAt);
  const [x, z] = findGround((x, z) => heightAt(x, z) > 5, "dry ground");

  reg.reserve({ kind: "road", id: "test-st", owner: "STREET", xMin: x - 9, xMax: x + 9, zMin: z - 200, zMax: z + 200 });
  const withRoad = createGround({ heightAt, registry: reg });

  // Surface check must agree this is now carriageway.
  assert.equal(withRoad.surfaceAt(x, z), SURFACE.CARRIAGEWAY, "a registered road should define its ground");

  const CAR = { footprint: { w: 4.4, d: 1.9 }, height: 1.5, clearance: 0, standsOn: [SURFACE.CARRIAGEWAY], maxRange: 5 };
  const r = withRoad.canPlace(CAR, x, z);
  assert.equal(r.ok, true, `a car must be placeable on a carriageway: ${r.reason} — ${r.detail}`);
});

test("but something already standing there does refuse it", () => {
  // The pair to the test above. If canPlace ignored everything, both would pass
  // and neither would mean anything.
  const reg = createWorldRegistry(heightAt);
  const [x, z] = findGround((x, z) => heightAt(x, z) > 5, "dry ground");

  reg.reserve({ kind: "road", id: "test-st", owner: "STREET", xMin: x - 9, xMax: x + 9, zMin: z - 200, zMax: z + 200 });
  reg.reserve({ kind: "prop", id: "parked-car", owner: "car", xMin: x - 3, xMax: x + 3, zMin: z - 2, zMax: z + 2 });
  const withRoad = createGround({ heightAt, registry: reg });

  const CAR = { footprint: { w: 4.4, d: 1.9 }, height: 1.5, clearance: 0, standsOn: [SURFACE.CARRIAGEWAY], maxRange: 5 };
  const r = withRoad.canPlace(CAR, x, z);
  assert.equal(r.ok, false, "a car must not be placed inside another car");
  assert.equal(r.reason, "occupied");
  assert.match(r.detail!, /parked-car/, `the refusal should name what is in the way, got: ${r.detail}`);
});

test("a lamp is refused on a carriageway because a carriageway is not what it stands on", () => {
  // The rule Mark asked for, end to end: not "moved out of the road afterwards"
  // but never allowed there, and refused at the SURFACE step rather than by
  // colliding with something.
  const reg = createWorldRegistry(heightAt);
  const [x, z] = findGround((x, z) => heightAt(x, z) > 5, "dry ground");
  reg.reserve({ kind: "road", id: "test-st", owner: "STREET", xMin: x - 9, xMax: x + 9, zMin: z - 200, zMax: z + 200 });
  const withRoad = createGround({ heightAt, registry: reg });

  const LAMP = { footprint: { w: 0.6, d: 0.6 }, height: 9.1, clearance: 0.3, standsOn: [SURFACE.SIDEWALK, SURFACE.VERGE], maxRange: 5 };
  const r = withRoad.canPlace(LAMP, x, z);
  assert.equal(r.ok, false, "a lamp post must not stand in a carriageway");
  assert.equal(r.reason, "surface", `it should be refused for the ground it is on, not by a collision: ${r.detail}`);
  assert.match(r.detail!, /carriageway/);
});

test("a sidewalk carries people and lamps but not cars, and the same ground as carriageway does the opposite", () => {
  // THE RULE TRAVELS WITH THE OBJECT, NOT WITH THE EARTH. Same square metre,
  // two different things built on it, opposite answers. If this passed with
  // only one of the two surfaces the model would be back to the land assigning
  // permissions, which is what it is not supposed to do.
  const [x, z] = findGround((x, z) => heightAt(x, z) > 5, "dry ground");
  const LAMP = { footprint: { w: 0.6, d: 0.6 }, height: 9.1, clearance: 0, category: "lamp", maxRange: 1e9 };
  const CAR = { footprint: { w: 4.4, d: 1.9 }, height: 1.5, clearance: 0, category: "vehicle", maxRange: 1e9 };

  const walk = createWorldRegistry(heightAt);
  walk.reserve({ kind: "road", id: "w", surface: SURFACE.SIDEWALK, xMin: x - 50, xMax: x + 50, zMin: z - 50, zMax: z + 50 });
  const onWalk = createGround({ heightAt, registry: walk });
  assert.equal(onWalk.canPlace(LAMP, x, z).ok, true, "a sidewalk carries a lamp");
  const carOnWalk = onWalk.canPlace(CAR, x, z);
  assert.equal(carOnWalk.ok, false, "a sidewalk does not carry a car");
  assert.equal(carOnWalk.reason, "not-accepted");

  const road = createWorldRegistry(heightAt);
  road.reserve({ kind: "road", id: "c", surface: SURFACE.CARRIAGEWAY, xMin: x - 50, xMax: x + 50, zMin: z - 50, zMax: z + 50 });
  const onRoad = createGround({ heightAt, registry: road });
  assert.equal(onRoad.canPlace(CAR, x, z).ok, true, "a carriageway carries a car");
  const lampOnRoad = onRoad.canPlace(LAMP, x, z);
  assert.equal(lampOnRoad.ok, false, "a carriageway does not carry a lamp");
  assert.equal(lampOnRoad.reason, "not-accepted");
});

test("a house-sized plot will not take a tower", () => {
  // Size is not a detail of placement, it is most of it. This is the check that
  // was missing everywhere in this project's history: the stadium in the water,
  // the airport apron overhanging its own platform by 110 m, the block set back
  // for a narrower road than the one built. All one question nobody asked.
  const [x, z] = findClearGround(40);
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "plot", id: "small-lot", xMin: x - 6, xMax: x + 6, zMin: z - 9, zMax: z + 9 });
  const withPlot = createGround({ heightAt, registry: reg });

  const HOUSE = { footprint: { w: 8, d: 12 }, height: 7, clearance: 0, category: "building", maxRange: 1e9 };
  const TOWER = { footprint: { w: 30, d: 30 }, height: 90, clearance: 0, category: "building", maxRange: 1e9 };

  assert.equal(withPlot.canPlace(HOUSE, x, z).ok, true, "a 12 x 18 m lot takes an 8 x 12 m house");
  const big = withPlot.canPlace(TOWER, x, z);
  assert.equal(big.ok, false, "a 12 x 18 m lot must not take a 30 x 30 m tower");
  assert.equal(big.reason, "too-big");
  assert.match(big.detail!, /needs 30\.0 x 30\.0 m/, `the refusal should quote both sizes, got: ${big.detail}`);
});

test("something that fits is still refused where it would hang over the edge", () => {
  // Fitting and being positioned are different questions, and answering only
  // the first is how an apron ends up 110 m beyond the ground that was vetted.
  const [x, z] = findClearGround(40);
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "plot", id: "lot", xMin: x - 10, xMax: x + 10, zMin: z - 10, zMax: z + 10 });
  const withPlot = createGround({ heightAt, registry: reg });
  const SHED = { footprint: { w: 16, d: 16 }, height: 3, clearance: 0, category: "building", maxRange: 1e9 };

  assert.equal(withPlot.canPlace(SHED, x, z).ok, true, "centred, a 16 m shed fits a 20 m lot");
  const shoved = withPlot.canPlace(SHED, x + 6, z);
  assert.equal(shoved.ok, false, "pushed 6 m off centre it hangs over the edge");
  assert.equal(shoved.reason, "overhangs");
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

// A LARGE FOOTPRINT MUST NOT STEP OVER A NARROW FEATURE.
//
// `sampleGrid` budgets a fixed number of probes per axis, so the wider the
// footprint the coarser the grid. Its comment claimed "never coarser than
// TARGET_SPACING"; measured, that was true below about 100 m and false above it
// -- 8 m at 200 m wide, 24 m at 600 m, and 140 m at the airport's own 3,500 m
// runway. At 140 m the runway footprint could not see a 120 m river lying across
// it. The grid simply stepped over the water.
//
// MAX_SPACING caps the step at 56 m, the full width of the narrowest water in
// waterways.js (canal-cormorant, halfWidth 28). A uniform grid of step s always
// lands a sample inside any band at least s wide, so that is the guarantee.
//
// This fixture puts the trench where the OLD grid provably could not see it. At
// 3,500 m wide the old step was 140 m with samples at -1750 + 140k, so the two
// nearest x = 0 are -70 and +70 and a 60 m trench centred on 0 fell cleanly
// between them. At 56 m the nearest samples are about -27.8 and +27.8, both
// inside it.
test("a 3.5 km footprint sees a 60 m trench that used to fall between its samples", () => {
  const FLAT = 10;
  const trench = (x: number) => (Math.abs(x) <= 30 ? -20 : FLAT);
  const ground = createGround({ heightAt: (x: number) => trench(x) });

  const spec = { footprint: { w: 3500, d: 200 }, clearance: 0 };
  const verdict = ground.canPlace(spec, 0, 0);

  // The trench is 30 m of fall across the footprint. Whatever the ground decides
  // to DO about that, it must not report flat ground it never looked at.
  assert.ok(
    !verdict.ok,
    "a 3.5 km footprint lying across a 30 m deep trench was accepted -- the sample grid stepped over the water",
  );
  // Refused for the GROUND, not for its size or for something standing there.
  assert.equal(
    verdict.reason,
    "terrain",
    `refused, but not for the ground moving under it: ${verdict.reason}`,
  );
});

test("guardrail: the same footprint on genuinely flat ground is still accepted", () => {
  // Without this, the test above would pass if canPlace simply refused every
  // large footprint, which is not the same thing as seeing the trench.
  const ground = createGround({ heightAt: () => 10 });
  const verdict = ground.canPlace({ footprint: { w: 3500, d: 200 }, clearance: 0 }, 0, 0);
  assert.ok(verdict.ok, `a 3.5 km footprint on perfectly flat ground was refused: ${verdict.reason}`);
});
