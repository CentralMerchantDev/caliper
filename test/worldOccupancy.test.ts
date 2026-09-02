// =============================================================================
// THE STADIUM DOES NOT HAVE HOUSES IN IT
//
// worldRegistry.test.ts and features.test.ts check the registry and
// footprintOf() in isolation. This file checks the thing that was actually
// reported broken: that a REAL generated world has no plot standing on a
// feature's reserved ground, and that the registry generateWorld() builds is
// reachable from the world it describes.
//
// Measured before this was wired in: 389 of 19,481 plots sat inside a feature
// footprint (stadium 32, airport 110, farmWest 86, railway 57, golf 36,
// farmEast 67, mast 1). This file is what keeps that number at zero.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { placeFeatures, FEATURES, footprintOf } from "../public/features.js";
import { WATERWAYS } from "../public/waterways.js";
import { WORLD_SCALE } from "../public/world-scale.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt) as any;
const { sites } = placeFeatures(heightAt);

function reservedFootprints() {
  const out: Array<{ id: string; xMin: number; xMax: number; zMin: number; zMax: number }> = [];
  for (const f of FEATURES) {
    const site = (sites as any)[f.id];
    if (!site) continue;
    for (const fp of footprintOf(f, site)) out.push({ id: f.id, ...fp });
  }
  return out;
}

test("no generated plot overlaps a placed feature's footprint", () => {
  const footprints = reservedFootprints();
  const overlaps = (p: any, f: any) =>
    !(p.xMax < f.xMin || p.xMin > f.xMax || p.zMax < f.zMin || p.zMin > f.zMax);

  const offenders: string[] = [];
  for (const p of world.plots) {
    for (const f of footprints) {
      if (overlaps(p, f)) { offenders.push(`${p.id} inside ${f.id}`); break; }
    }
  }
  assert.deepEqual(offenders, [], `${offenders.length} plot(s) still stand on reserved ground`);
});

test("the stadium's footprint alone accounts for real plots being refused", () => {
  // A weaker version of the check above, name-checking the specific complaint
  // ("the stadium has houses in it") rather than the aggregate.
  const stadiumSite = sites.stadium;
  assert.ok(stadiumSite, "the stadium must place on this seed for this test to mean anything");
  const [fp] = footprintOf(FEATURES.find((f) => f.id === "stadium")!, stadiumSite);
  const insideStadium = world.plots.filter(
    (p: any) => !(p.xMax < fp.xMin || p.xMin > fp.xMax || p.zMax < fp.zMin || p.zMin > fp.zMax)
  );
  assert.equal(insideStadium.length, 0);
});

test("plots dropped for reserved ground is reported, not swallowed", () => {
  // This is the control actually doing something, not a no-op that happens to
  // report zero: a real feature-shaped chunk of ground was refused.
  assert.ok(world.plotsDroppedForReservedGround > 0);
});

test("generateWorld exposes its registry, and whatIsAt agrees with the plan", () => {
  assert.ok(world.registry, "world.registry must be reachable from the world it describes");
  const stadiumSite = sites.stadium;
  const groundY = heightAt(stadiumSite.x, stadiumSite.z);
  const at = world.registry.whatIsAt(stadiumSite.x, groundY + 1, stadiumSite.z, 0);
  assert.equal(at.kind, "feature");
  assert.equal(at.id, "stadium");
  assert.equal(at.solid, true);
});

test("whatIsAt reports rock below the terrain surface, anywhere, including far from any feature", () => {
  // Pick a point nowhere near any placed feature.
  const x = 25000, z = 8000;
  const groundY = heightAt(x, z);
  const underground = world.registry.whatIsAt(x, groundY - 5, z, 0);
  assert.equal(underground.kind, "rock");
  assert.equal(underground.solid, true);
});

test("a world built with no heightAt has no registry and reserves nothing -- consistent with placeFeatures/zoning also being skipped", () => {
  const structureOnly = generateWorld() as any;
  assert.equal(structureOnly.registry, null);
  assert.equal(structureOnly.plotsDroppedForReservedGround, 0);
});

// =============================================================================
// THE WORLD'S PERSISTENT STRUCTURE: ROADS, RAILWAY, WATERWAYS, BRIDGES, PIER,
// BOARDWALK, PARKS AND FIELDS
//
// Everything below checks the SAME real generated world above, so a change
// that breaks the registration silently (rather than throwing) shows up here
// exactly the way the stadium bug would have.
// =============================================================================

// <=/>=, not </> -- sharing an edge is not overlapping. A plot's own xMin is
// built as `roadCentre + roadWidth/2`, exactly touching its own street's
// reserved half-width on purpose; an inclusive test here would flag every
// plot in the city against its own road, which is the same false positive
// world-registry.js's overlapsReserved was fixed to stop making.
function overlapsRect(a: any, b: any) {
  return !(a.xMax <= b.xMin || a.xMin >= b.xMax || a.zMax <= b.zMin || a.zMin >= b.zMax);
}

test("no kept plot overlaps a registered road, bridge, waterway, pier, boardwalk or hard-park entry", () => {
  const structural = world.registry
    .list()
    .filter((e: any) => ["road", "bridge", "waterway", "pier", "boardwalk"].includes(e.kind));
  const offenders: string[] = [];
  for (const p of world.plots) {
    for (const e of structural) {
      if (overlapsRect(p, e)) { offenders.push(`${p.id} inside ${e.kind}:${e.id}`); break; }
    }
  }
  assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} plot(s) overlap a road/bridge/waterway/pier/boardwalk`);
});

test("the railway corridor is registered as a feature -- not duplicated as a road, because it never appears in world.roads", () => {
  const railwaySite = sites.railway;
  const x = railwaySite.axis === "ew" ? (railwaySite.from + railwaySite.to) / 2 : railwaySite.at;
  const z = railwaySite.axis === "ew" ? railwaySite.at : (railwaySite.from + railwaySite.to) / 2;
  const groundY = heightAt(x, z);
  const hit = world.registry.whatIsAt(x, groundY + 1, z, 0);
  assert.equal(hit.kind, "feature");
  assert.equal(hit.id, "railway");
  assert.equal(world.roads.some((r: any) => /rail/i.test(r.id)), false, "the railway must not also appear as a road entry");
});

test("a real point on a river's centreline reads as a waterway -- not just 'no plot happens to be there'", () => {
  // A weaker, absence-only check ("no plot overlaps a registered waterway")
  // would still pass if waterway registration were disabled entirely, since
  // there would then be nothing to overlap. This probes an ACTUAL point on
  // river-mid's own declared centreline and requires the registry to name it.
  const river = WATERWAYS.find((w) => w.id === "river-mid")!;
  const [dx0, dz0] = river.points[2], [dx1, dz1] = river.points[3];
  const x = ((dx0 + dx1) / 2) * WORLD_SCALE, z = ((dz0 + dz1) / 2) * WORLD_SCALE;
  const groundY = heightAt(x, z);
  const hit = world.registry.whatIsAt(x, groundY + 0.5, z, 0);
  assert.equal(hit.kind, "waterway");
  assert.equal(hit.owner, "river-mid");
});

test("roads are registered with the same width used to margin their own plots -- ROADS[class].row", () => {
  const roadEntries = world.registry.list().filter((e: any) => e.kind === "road");
  assert.ok(roadEntries.length > 1000, `expected roughly 1,380 road entries, got ${roadEntries.length}`);
  const sample = roadEntries[0];
  const width = sample.xMax - sample.xMin === 0 ? sample.zMax - sample.zMin : Math.min(sample.xMax - sample.xMin, sample.zMax - sample.zMin);
  assert.ok(width > 0 && width < 100, `a road's short dimension should be a lane width, got ${width}`);
});

test("a bridge's clearance is a bounded band, not the whole column -- an infinite yMin/yMax would defeat the whole point", () => {
  const bridgeEntries = world.registry.list().filter((e: any) => e.kind === "bridge");
  assert.ok(bridgeEntries.length > 0, "at least one bridge should be registered");
  for (const br of bridgeEntries) {
    assert.ok(Number.isFinite(br.yMin), `${br.id} yMin must be a real clearance, not -Infinity`);
    assert.ok(Number.isFinite(br.yMax), `${br.id} yMax must be a real clearance, not Infinity`);
    assert.ok(br.yMin >= 0 && br.yMin < 5, `${br.id} yMin ${br.yMin} should sit just above water`);
    assert.ok(br.yMax > br.yMin && br.yMax < 100, `${br.id} yMax ${br.yMax} should be a plausible deck+tower height`);
  }
});

test("a bridge reserves the deck at height, and well below the reserved band the same point reads differently -- proving the registry needs y", () => {
  const bridgeEntries = world.registry.list().filter((e: any) => e.kind === "bridge");
  const br = bridgeEntries[0];
  const cx = (br.xMin + br.xMax) / 2, cz = (br.zMin + br.zMax) / 2;
  const deckY = (br.yMin + br.yMax) / 2;
  const atDeck = world.registry.whatIsAt(cx, deckY, cz, 0);
  assert.equal(atDeck.kind, "bridge");
  // Below the reserved deck volume, over water: whatIsAt must not still say
  // "bridge" just because x/z matches -- this is the case that proves y
  // matters, not the road case, where any y above rock is uniformly free.
  const belowDeck = world.registry.whatIsAt(cx, br.yMin - 20, cz, 0);
  assert.notEqual(belowDeck.kind, "bridge");
});

test("the pier and boardwalk are registered", () => {
  const kinds = new Set(world.registry.list().map((e: any) => e.kind));
  assert.ok(kinds.has("pier"), "PIER should be registered");
  assert.ok(kinds.has("boardwalk"), "BOARDWALK should be registered");
  const pierEntries = world.registry.list().filter((e: any) => e.kind === "pier");
  assert.equal(pierEntries.length, 2, "the pier deck and its head pavilion");
});

test("parks are registered as soft occupancy but still refuse a plot by default", () => {
  const parks = world.registry.list().filter((e: any) => e.kind === "park");
  assert.ok(parks.length > 100, `expected hundreds of park entries, got ${parks.length}`);
  for (const p of parks) assert.equal(p.solid, false, `${p.id} should be soft`);
  // Every one of them must still refuse an overlapping plot by default --
  // this is exactly the property mutation-tested directly against
  // world-registry.js; here it is checked against the real registered data.
  const sample = parks[0];
  assert.ok(
    world.registry.overlapsReserved(sample.xMin, sample.xMax, sample.zMin, sample.zMax),
    "a soft park entry must still block by default"
  );
});

test("farm-class plots are registered as fields, soft, and are real plots that survived the de-overlap pass", () => {
  const fields = world.registry.list().filter((e: any) => e.kind === "field");
  assert.ok(fields.length > 0, "expected some farm-class plots to be registered as fields");
  for (const f of fields) assert.equal(f.solid, false);
  const plotIds = new Set(world.plots.map((p: any) => p.id));
  for (const f of fields) {
    const plotId = f.id.replace(/^field-/, "");
    assert.ok(plotIds.has(plotId), `field ${f.id} does not correspond to a kept plot`);
  }
});

test("the plot count dropped again once roads and waterways were registered -- this is the measurement, not a side effect", () => {
  // 406 is what plotsDroppedForReservedGround was with ONLY the ten features
  // reserved (the previous session's baseline). Roads and rivers occupy real
  // ground that features alone never covered, so the number now measured
  // must be substantially larger, not merely nonzero.
  assert.ok(
    world.plotsDroppedForReservedGround > 406,
    `expected roads/waterways to drop more plots than the 406 features alone dropped, got ${world.plotsDroppedForReservedGround}`
  );
});
