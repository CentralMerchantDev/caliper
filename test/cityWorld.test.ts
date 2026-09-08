// =============================================================================
// THE CITY WORLD — terrain, plan and building geometry
//
// Every check here is a defect that was actually SHIPPED in this world and cost
// real time to find, written as the test that would have caught it in a second.
// None of them is hypothetical:
//
//  1. emitBuilding() was called with the ground height in the `z` slot, so
//     77,760 of 94,629 building parts got negative scales -- down to -8,783 m.
//     Inverted, screen-filling geometry hung the renderer completely, and NOTHING
//     in the scene graph looked wrong while I hunted for it.
//  2. The ridge band and the named summits were SUMMED, producing a 4,040 m
//     coastal wall -- higher than anything in the Rockies.
//  3. The sea bed was composed as min(shelf, deep), which put -10 m immediately
//     against the sand: a submarine cliff one metre off the beach.
//  4. Nine thousand suburban houses drew from five roof colours, three of them
//     red, and the suburbs read as one red carpet from ten kilometres away.
//  5. Splining the mainland's 20 km closing corners overshot so far that the
//     harbour measured -0.17 km, i.e. the mainland lay ON TOP of the island.
//
// Pure geometry only: no THREE, no DOM, no GPU. It runs in Node in a second.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  generateWorld, generateCityPlan, landmassPolygons, PLOT_CLASSES, SETTLEMENTS,
  offsetPolygon, COAST, splinePolygon, BRIDGES, signedArea2, LANDMASSES, distanceToCoast, distanceToCoastExact, coastlinePolygon, classForSettlementBlock } from "../public/city-plan.js";
import { WORLD_SCALE } from "../public/world-scale.js";
import { findSite, findFlattestSite, ROAD_SLOPE_MAX, roadAllowedAt, findQuay, MIN_CORRIDOR_ON_LAND } from "../public/land-use.js";
import { placeFeatures, FEATURES } from "../public/features.js";
import { assessFootprint } from "../public/footprint.js";
import { gradeGroundBands } from "../public/city-render.js";
import { buildSpatialIndex } from "../public/spatial-index.js";
import { DENSITY_BANDS, makeZoning } from "../public/zoning.js";
import { fitSettlements } from "../public/settlement-fit.js";
import { gradeRun, ROAD_GRADE } from "../public/grade.js";

// PROBE COORDINATES SCALE. JUDGEMENTS DO NOT.
//
// These tests were written against the 48 km world, so a probe at z = 7000 is
// "the barrier island's ocean shore" only in design metres. Scaling the probe
// keeps it pointing at the same PLACE. Scaling a depth or a length keeps it
// measuring the same PHYSICAL fact about a world that is uniformly smaller --
// a shelf 30 m down at 1.6 km out is the same shelf at 19.5 m and 1.04 km.
//
// What is deliberately NOT scaled anywhere below: the budgets and ratios that
// encode a judgement rather than a measurement -- the 0.06 dry-land ratio, the
// zero-tolerance overlap assertions, MAX_UNSERVED, the connectivity budgets.
// If one of those goes red the world is wrong, and the fix is the world.
const S = (v: number) => v * WORLD_SCALE;
/** Areas scale with the square of a uniform scale. */
const S2 = (v: number) => v * WORLD_SCALE * WORLD_SCALE;

import { bucketKeyInRange } from "../public/terrain.js";
import { LandField, makeHeightAt, reliefAt, edgeFalloff, EDGE, BASINS, cliffiness, SNOW_LINE, TREE_LINE, waterwayAt } from "../public/terrain.js";
import { createCollector, emitBuilding, HEIGHT, ROOFS, WALLS, rnd } from "../public/buildings.js";

const field = new LandField(16);
const heightAt = makeHeightAt(field);

// -----------------------------------------------------------------------------
// TERRAIN
// -----------------------------------------------------------------------------

test("the range is a coastal range, not a Himalaya", () => {
  let max = -Infinity, at: [number, number] = [0, 0];
  for (let x = -23000; x <= 23000; x += 250)
    for (let z = -22000; z <= 4000; z += 250) {
      const h = heightAt(x, z);
      if (h > max) { max = h; at = [x, z]; }
    }
  // Vancouver's North Shore tops out near 1,450 m; the Coast Mountains behind
  // it near 2,500 m. A summed ridge once gave 4,040 m here.
  assert.ok(max > 1600, `range too low: ${max.toFixed(0)} m at ${at}`);
  assert.ok(max < 2900, `range too high: ${max.toFixed(0)} m at ${at} -- are the ridge and the peaks being summed again?`);
  assert.ok(max > SNOW_LINE, "nothing reaches the snow line, so no summit is capped");
  assert.ok(TREE_LINE < SNOW_LINE, "the tree line must sit below the snow line");
});

test("the sea bed shelves away from the shore instead of dropping off a cliff", () => {
  // Walk south from the barrier island's OCEAN shore into open water. This used
  // to run south from the downtown island, but that transect now crosses the
  // lagoon and shoals again as it approaches the barrier crescent -- correct
  // behaviour that the old test read as a defect.
  const x = 0;
  let shore: number | null = null;
  // Range widened again with the traced layout: the barrier now reaches z 8105.
  // Each time this number moves it is because the ISLAND grew, not because the
  // sea bed changed -- the test's assumption about where the shore is goes
  // stale, and the shelf property it actually guards still holds.
  for (let z = S(7000); z < S(9600); z += S(5)) if (heightAt(x, z) <= 0) { shore = z; break; }
  assert.ok(shore !== null, "could not find the barrier island's ocean shore");

  const depths: number[] = [];
  for (let z = (shore as number) + S(25); z <= (shore as number) + S(1600); z += S(25)) depths.push(heightAt(x, z));
  assert.ok(depths.every((d) => d < 0), "this transect should be entirely offshore");
  for (let i = 1; i < depths.length; i++) {
    assert.ok(depths[i] <= depths[i - 1] + S(4), `sea bed rises going out to sea at sample ${i}`);
  }
  const first = Math.abs(depths[0]);
  assert.ok(first < S(9), `sea bed is ${first.toFixed(1)} m deep right at the beach -- that is a cliff, not a shelf`);
  assert.ok(Math.abs(depths[depths.length - 1]) > S(30), "the ocean never gets deep");
});

test("the lagoon is enclosed water, shallower than the open ocean", () => {
  // The crescent's whole point: a sheltered lagoon between the barrier island
  // and the downtown island, not open sea on both sides of a strip.
  // Both probes move with the traced layout: the sheltered water now sits
  // around z 2000 (between downtown and the barrier's north shore) and the open
  // ocean starts past z 9500. The PROPERTY -- sheltered water inshore, deep
  // ocean outside -- is what this guards, and it still holds.
  const lagoon = heightAt(-2000, 2050);  // between the chain and the barrier
  const ocean = heightAt(0, 10500);      // beyond the barrier
  assert.ok(lagoon < 0, "the lagoon is not water");
  assert.ok(ocean < lagoon, `the open ocean (${ocean.toFixed(0)} m) is not deeper than the lagoon (${lagoon.toFixed(0)} m)`);
});

test("land meets water at y = 0, with no step at the coastline", () => {
  // The waterline must be the zero contour of the SAME height function the
  // renderer draws, or the beach and the sea disagree by whatever the raster
  // quantisation happens to be.
  // ...except inside a DREDGED BASIN, where a quay wall is a deliberate step:
  // the marina is cut to 6.5 m against a hard edge, and that is the point of it.
  const coast = splinePolygon(COAST, 8);
  let worst = 0, worstAt: number[] = [];
  for (const [x, z] of coast) {
    if (BASINS.some((b: any) => Math.hypot(x - b.x, z - b.z) < b.r + 30)) continue;
    const h = Math.abs(heightAt(x, z));
    if (h > worst) { worst = h; worstAt = [Math.round(x), Math.round(z)]; }
  }
  assert.ok(worst < 1.4, `coastline is up to ${worst.toFixed(2)} m from sea level at ${worstAt}`);
});

/** Even-odd point-in-polygon, used by the invariants below. */
function inside(poly: number[][], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

test("every land mass rises above the water across its MODELLED interior", () => {
  // "Modelled" is load-bearing. The mainland polygon deliberately runs out past
  // the edge fade so the world closes with ocean instead of a table edge, so a
  // large part of its declared interior is meant to be sea bed. What must hold
  // is that everything inside the fade is dry.
  for (const lm of landmassPolygons(16)) {
    let above = 0, total = 0;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of lm.polygon) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const step = Math.max(30, Math.min(400, (x1 - x0) / 40));
    for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
      if (!inside(lm.polygon, x, z)) continue;
      if (edgeFalloff(x, z) < 0.999) continue;      // deliberately drowned
      total++;
      if (heightAt(x, z) > 0.5) above++;
    }
    assert.ok(total > 8, `${lm.id}: only ${total} interior samples`);
    const frac = above / total;
    assert.ok(frac > 0.9, `${lm.id}: only ${(frac * 100).toFixed(0)}% of its interior is above water`);
  }
  // the harbour between the island and the mainland is open water
  // The bay still has open water in it. This probe used to sit at (7000,-1000),
  // which the archipelago rebuild turned into dry land -- Redcliff now reaches
  // there. Moving the probe is right, deleting the check would not be: the
  // point is that the islands have not merged into one continuous landmass.
  // (2500,-700) is the channel between Bayview and Fairlight, and 603 points in
  // the bay are deeper than 6 m, so there is real water on all sides.
  assert.ok(heightAt(S(-2800), S(0)) < S(-3), "the channel between the islands is not water");
  // (11000,100) became dry when the outer island grew east. (12000,400) is the
  // eastern approach channel between the barrier's tip and the mainland arm,
  // 35 m deep -- and 752 points in the bay are still deeper than 6 m.
  assert.ok(heightAt(S(4600), S(-600)) < S(-3), "the eastern approach is not water");
  assert.ok(heightAt(S(0), S(10500)) < S(-3), "the open ocean is not water");   // past the outer island
});

test("the harbour is one city wide, not two unrelated places", () => {
  // Walk north from inside the island, on the axis of the causeways: off the
  // island's north shore, across open water, onto the mainland. Catmull-Rom
  // once overshot the mainland's closing corners so far that this came out
  // NEGATIVE -- the mainland lying on top of the island.
  // The harbour now has ISLANDS in it, so "the first land you meet going north"
  // is a key, not the mainland. What matters is the whole crossing: from the
  // island's north shore to the mainland's south shore.
  const x = -450;
  let leftIsland: number | null = null, mainlandShore: number | null = null;
  for (let z = -300; z >= -3600; z -= 5) {
    const wet = heightAt(x, z) <= 0;
    if (leftIsland === null && wet) leftIsland = z;
  }
  // the mainland is the last stretch of land that keeps going north
  for (let z = -3600; z <= -300; z += 5) {
    if (heightAt(x, z) > 0 && heightAt(x, z - 400) > 0) mainlandShore = z;
    else if (mainlandShore !== null) break;
  }
  assert.ok(leftIsland !== null && mainlandShore !== null, "could not find both shores");
  const width = Math.abs((mainlandShore as number) - (leftIsland as number));
  // Victoria Harbour is ~1.5 km at its narrowest and Hong Kong reads as ONE city.
  assert.ok(width > 700, `harbour only ${(width / 1000).toFixed(2)} km wide`);
  assert.ok(width < 2600, `harbour ${(width / 1000).toFixed(2)} km wide -- too wide to read as one city`);
});

// -----------------------------------------------------------------------------
// BUILDING GEOMETRY
// -----------------------------------------------------------------------------

/** Build the whole world's parts exactly the way the renderer does. */
function collectParts() {
  const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
  const world = generateWorld();
  const SETT = [
    { id: "downtown", cx: 0, cz: 40, r: 1500 },
    ...SETTLEMENTS.map((s: any) => ({
      id: s.id,
      cx: (s.bounds.xMin + s.bounds.xMax) / 2,
      cz: (s.bounds.zMin + s.bounds.zMax) / 2,
      r: Math.max(s.bounds.xMax - s.bounds.xMin, s.bounds.zMax - s.bounds.zMin) / 2,
    })),
  ];
  const coll = createCollector();
  let placed = 0;
  for (const p of world.plots as any[]) {
    const cls = p.className;
    if (!HEIGHT[cls] || cls === "PARK") continue;
    const bw = Math.max(3, p.buildable.xMax - p.buildable.xMin);
    const bd = Math.max(3, p.buildable.zMax - p.buildable.zMin);
    const cx = (p.buildable.xMin + p.buildable.xMax) / 2;
    const cz = (p.buildable.zMin + p.buildable.zMax) / 2;
    const g = heightAt(cx, cz);
    if (g < 0.6) continue;
    const hs = [heightAt(p.xMin, p.zMin), heightAt(p.xMax, p.zMin), heightAt(p.xMin, p.zMax), heightAt(p.xMax, p.zMax)];
    const gRange = Math.max(...hs) - Math.min(...hs);
    const s = SETT.find((q) => q.id === (p.settlement || "downtown"));
    let central = 1;
    if (s) {
      const dd = Math.hypot(cx - s.cx, cz - s.cz) / (s.r || 1);
      central = 0.42 + 0.58 * Math.pow(clamp(1 - dd, 0, 1), 0.75);
    }
    let h = HEIGHT[cls](rnd(p.id)) * (cls === "FARM" || cls === "HANGAR" ? 1 : central);
    const cap = PLOT_CLASSES[cls] && PLOT_CLASSES[cls].maxHeight;
    if (cap) h = Math.min(h, cap);
    if (h < 4) h = 4;
    if (emitBuilding(coll, cls, p.id, cx, cz, bw, bd, h, g, gRange)) placed++;
  }
  return { coll, placed, world };
}

const built = collectParts();

test("every building part has a finite, positive, sane size", () => {
  // THE argument-order bug. emitBuilding(o, cls, id, x, z, w, d, h, g, gRange)
  // was called with an extra `g` after `x`, shifting every parameter by one and
  // putting a ground height where a z coordinate belongs. 82% of parts came out
  // with negative scales and the renderer stopped returning frames.
  let checked = 0;
  const problems: string[] = [];
  for (const key of Object.keys(built.coll.buckets)) {
    const a = built.coll.buckets[key];
    for (let i = 0; i < a.length / 8; i++) {
      const o = i * 8;
      const [x, y, z, sx, sy, sz, ry, c] = a.slice(o, o + 8);
      checked++;
      for (const [n, v] of [["x", x], ["y", y], ["z", z], ["sx", sx], ["sy", sy], ["sz", sz], ["ry", ry], ["c", c]] as const) {
        if (!Number.isFinite(v)) problems.push(`${key}[${i}] ${n} is ${v}`);
      }
      if (sx <= 0 || sy <= 0 || sz <= 0) problems.push(`${key}[${i}] non-positive scale ${sx},${sy},${sz}`);
      if (sx > 500 || sy > 500 || sz > 500) problems.push(`${key}[${i}] absurd scale ${sx},${sy},${sz}`);
      if (problems.length > 6) break;
    }
    if (problems.length > 6) break;
  }
  assert.ok(checked > 40000, `only ${checked} parts emitted -- the world did not build`);
  assert.deepEqual(problems, [], problems.slice(0, 6).join("; "));
});

test("no building floats above the ground or sinks out of sight", () => {
  const a = built.coll.buckets.wall;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < a.length / 8; i++) { const y = a[i * 8 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  // the lowest part is a slope plinth, which is allowed to reach below grade
  assert.ok(minY > -60, `something sits ${minY.toFixed(0)} m below sea level`);
  assert.ok(maxY < 700, `something sits ${maxY.toFixed(0)} m up -- buildings on the mountains?`);
});

test("buildings stand on dry land", () => {
  let wet = 0;
  for (const p of built.world.plots as any[]) {
    if (!HEIGHT[p.className] || p.className === "PARK") continue;
    const cx = (p.buildable.xMin + p.buildable.xMax) / 2;
    const cz = (p.buildable.zMin + p.buildable.zMax) / 2;
    if (heightAt(cx, cz) > 0.6) continue;
    wet++;                                   // these are correctly SKIPPED by the renderer
  }
  // The plan may propose plots the terrain rejects; the renderer must drop them.
  // What must not happen is the plan proposing so many that whole settlements
  // sit in the sea.
  const ratio = wet / built.world.plots.length;
  assert.ok(ratio < 0.06, `${(ratio * 100).toFixed(1)}% of plots fall in the water`);
});

test("no plot class is a monoculture of one roof colour", () => {
  // Nine thousand houses, five roof colours, three of them red: one red carpet.
  for (const cls of Object.keys(ROOFS)) {
    if (cls === "PARK") continue;
    const n = ROOFS[cls].length;
    assert.ok(n >= 2, `${cls} has ${n} roof colour(s)`);
    assert.ok(WALLS[cls] && WALLS[cls].length >= 2, `${cls} has too few wall colours`);
  }
  // the two classes that cover the most ground need real spread
  for (const cls of ["TOWNHOUSE", "VILLA"]) {
    assert.ok(ROOFS[cls].length >= 8,
      `${cls} covers thousands of plots and has only ${ROOFS[cls].length} roof colours -- that reads as a carpet`);
  }
});

test("the world closes with ocean, not a cliff", () => {
  // Fading the land to EXACTLY sea level was not enough: it left a
  // continent-sized plane at y = 0 that read from altitude as a flat green table
  // with a vertical drop at its edge. The far edge has to become sea bed.
  // Just past the fade the ground must already be UNDER the water...
  for (const [x, z] of [[0, EDGE.zFar - S(2000)],
                        [EDGE.xHalf + S(3000), S(-10000)], [-EDGE.xHalf - S(3000), S(-10000)]]) {
    const h = heightAt(x, z);
    assert.ok(h < 0, `world edge at (${x}, ${z}) is ${h.toFixed(0)} m -- it must be under water`);
  }
  // ...and well past it, properly deep, so nothing shoals back up at the rim.
  for (const [x, z] of [[0, EDGE.zFar - S(9000)],
                        [EDGE.xHalf + S(9000), S(-10000)], [-EDGE.xHalf - S(9000), S(-10000)]]) {
    const h = heightAt(x, z);
    assert.ok(h < S(-40), `${(x)},${(z)} is only ${h.toFixed(0)} m deep at the rim of the world`);
  }
  // ...and it must get there gradually, not in one step
  let prev = heightAt(0, EDGE.zFar + EDGE.fade + S(3000));
  assert.ok(prev > S(50), "the land should still be well above water before the fade");
  for (let z = EDGE.zFar + EDGE.fade; z >= EDGE.zFar - S(500); z -= S(500)) {
    const h = heightAt(0, z);
    assert.ok(h - prev < S(40), `terrain jumps ${(h - prev).toFixed(0)} m at z=${z}`);
    prev = h;
  }
});

// -----------------------------------------------------------------------------
// BRIDGES AND CONNECTIVITY
// -----------------------------------------------------------------------------

test("every bridge lands on dry ground at BOTH ends, with water between", () => {
  // The three bay islands used to be villages you could see and never reach,
  // and the causeways that did exist were decks that met no road at either end.
  // A crossing is only a crossing if it starts on land, ends on land, and has
  // something in the middle worth spanning.
  for (const br of BRIDGES) {
    const ew = (br as any).axis === "ew";
    const ha = ew ? heightAt(br.a, br.x) : heightAt(br.x, br.a);
    const hb = ew ? heightAt(br.b, br.x) : heightAt(br.x, br.b);
    assert.ok(ha > 1, `${br.id}: south anchor is at ${ha.toFixed(1)} m -- not on land`);
    assert.ok(hb > 1, `${br.id}: north anchor is at ${hb.toFixed(1)} m -- not on land`);
    const z0 = Math.min(br.a, br.b), z1 = Math.max(br.a, br.b);
    let wet = 0;
    for (let z = z0; z <= z1; z += 10) if ((ew ? heightAt(z, br.x) : heightAt(br.x, z)) <= 0.5) wet++;
    assert.ok(wet > 3, `${br.id}: crosses no water`);
    assert.ok(z1 - z0 < 4000, `${br.id}: ${(z1 - z0)} m span is longer than any real bridge here`);
  }
});

test("every land mass is reachable -- no island is stranded", () => {
  // Build the connectivity graph from the bridges and check it is one component.
  const masses = landmassPolygons(16);
  const idx = new Map(masses.map((m, i) => [m.id, i]));
  const massAtPoint = (x: number, z: number) => {
    for (const m of masses) if (inside(m.polygon, x, z)) return m.id;
    return null;
  };
  const parent = masses.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  for (const br of BRIDGES) {
    const ew = (br as any).axis === "ew";
    const ma = ew ? massAtPoint(br.a, br.x) : massAtPoint(br.x, br.a);
    const mb = ew ? massAtPoint(br.b, br.x) : massAtPoint(br.x, br.b);
    assert.ok(ma, `${br.id}: south anchor is not inside any land mass`);
    assert.ok(mb, `${br.id}: north anchor is not inside any land mass`);
    // A crossing MAY have both ends on the same land mass, provided it actually
    // crosses water -- that is what a causeway over an inlet or a bay is, and
    // real coasts are full of them. What must never happen is a "bridge" that
    // spans no water at all, which is the thing this line was written to catch.
    if (ma === mb) {
      let wet = 0, tot = 0;
      for (let t = 1; t < 12; t++) {
        const s2 = br.a + ((br.b - br.a) * t) / 12;
        tot++;
        if (heightAt(ew ? s2 : br.x, ew ? br.x : s2) < 0) wet++;
      }
      assert.ok(wet / tot > 0.3,
        `${br.id}: both ends are on ${ma} and it crosses no water -- it bridges nothing`);
    }
    union(idx.get(ma as string) as number, idx.get(mb as string) as number);
  }
  const roots = new Set(masses.map((_, i) => find(i)));
  assert.equal(roots.size, 1,
    `the world is in ${roots.size} disconnected pieces: ` +
    masses.map((m, i) => `${m.id}->${masses[find(i)].id}`).join(", "));
});

test("bridges are in the road network, not floating beside it", () => {
  // A bridge that is not a road gets no carriageway, no footway, no markings,
  // no lamps and no traffic, and joins nothing at either end.
  const world = generateWorld();
  for (const br of BRIDGES) {
    const r = world.roads.find((q: any) => q.bridge === br.id);
    assert.ok(r, `${br.id} is not in the road network`);
    assert.equal(r.at, br.x);
    assert.equal(r.axis, (br as any).axis || "ns");
    assert.ok(r.class in { BOULEVARD: 1, AVENUE: 1, STREET: 1 } || ["BOULEVARD", "AVENUE", "STREET"].includes(r.class),
      `${br.id} has an odd road class ${r.class}`);
  }
});

test("the outer island is the largest thing in the world, and it bows", () => {
  // This used to assert a CRESCENT whose tips reached back to z < -1000 to meet
  // the mainland. The traced layout changed that shape deliberately: the outer
  // island is now a large southern landmass spanning the whole seaward edge,
  // bridged to the chain rather than curling around it. Rewriting the assertion
  // to match a deliberate change is right; leaving it asserting the old shape
  // would have made a correct world fail, and quietly deleting it would have
  // left the island unguarded. So it now guards what is actually true and worth
  // keeping: it is the biggest mass in the bay, it is long, and it bows seaward.
  const masses = landmassPolygons(16);
  const barrier = masses.find((m) => m.id === "barrier");
  assert.ok(barrier, "no outer island");

  const areaOf = (poly: number[][]) => {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      a += ax * bz - bx * az;
    }
    return Math.abs(a / 2) / 1e6;
  };
  const barrierKm2 = areaOf((barrier as any).polygon);
  for (const m of masses) {
    if (m.id === "barrier" || m.kind === "mainland") continue;
    assert.ok(barrierKm2 > areaOf(m.polygon),
      `${m.id} (${areaOf(m.polygon).toFixed(1)} km²) is bigger than the outer island (${barrierKm2.toFixed(1)} km²)`);
  }
  assert.ok(barrierKm2 > S2(60), `the outer island is only ${barrierKm2.toFixed(1)} km²`);

  let x0 = Infinity, x1 = -Infinity;
  for (const [x] of (barrier as any).polygon) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  assert.ok(x1 - x0 > S(25000), `outer island is only ${((x1 - x0) / 1000).toFixed(1)} km long`);

  // It spans the seaward edge for its whole length. The drawn shape does NOT
  // bow -- its ends run as far south as its middle -- so asserting a bow would
  // be asserting a shape the layout does not have.
  for (const probe of [S(-12000), S(-6000), 0, S(6000), S(12000)]) {
    const here = (barrier as any).polygon.filter(([x]: number[]) => Math.abs(x - probe) < S(2500));
    assert.ok(here.length > 0, `the outer island has no coast near x=${probe}`);
  }
});

test("every land mass is wound the same way", () => {
  // offsetPolygon derives its outward normal from the winding. The masses were
  // authored at different times and wound both ways, so on half the world the
  // surf ribbon was being offset inward, across the beach.
  for (const lm of landmassPolygons(16)) {
    assert.ok(signedArea2(lm.polygon) < 0, `${lm.id} is wound the wrong way`);
  }
});

test("no two land masses occupy the same ground", () => {
  // Moving the mainland in to narrow the harbour once put Harbour Isle INSIDE
  // it: two masses on the same coordinates, and the island's own centre came
  // out below sea level while every individual polygon looked fine.
  const masses = landmassPolygons(16);
  for (let a = 0; a < masses.length; a++) for (let b = a + 1; b < masses.length; b++) {
    for (const [x, z] of masses[a].polygon) {
      assert.ok(!inside(masses[b].polygon, x, z),
        `${masses[a].id} has a vertex (${Math.round(x)}, ${Math.round(z)}) inside ${masses[b].id}`);
    }
  }
});

test("the world is the size it claims to be", () => {
  const w = built.world;
  assert.ok(w.plots.length > 15000, `only ${w.plots.length} plots`);
  assert.ok(w.masses.length >= 9, `only ${w.masses.length} land masses`);
  assert.ok(w.settlements.length >= 15, `${w.settlements.length} settlements`);
  assert.ok(built.placed > 15000, `only ${built.placed} buildings placed`);
});

test("plot classes obey their own legal size range", () => {
  const bad: string[] = [];
  for (const p of built.world.plots as any[]) {
    const cls = PLOT_CLASSES[p.className];
    if (!cls) { bad.push(`${p.id}: unknown class ${p.className}`); continue; }
    if (p.width < cls.minW - 1e-6 || p.width > cls.maxW + 1e-6) bad.push(`${p.id}: width ${p.width.toFixed(1)} outside ${cls.minW}..${cls.maxW}`);
    if (p.depth < cls.minD - 1e-6 || p.depth > cls.maxD + 1e-6) bad.push(`${p.id}: depth ${p.depth.toFixed(1)} outside ${cls.minD}..${cls.maxD}`);
    if (bad.length > 5) break;
  }
  assert.deepEqual(bad, [], bad.slice(0, 5).join("; "));
});

test("relief is deterministic", () => {
  // The renderer, the plot generator and the AI pipeline all have to agree on
  // where the ground is; that only holds if the height function is pure.
  for (const [x, z] of [[0, 0], [-5400, -13000], [3000, 2800], [-14000, -6000]]) {
    assert.equal(reliefAt(x, z, "mainland"), reliefAt(x, z, "mainland"));
    assert.equal(heightAt(x, z), heightAt(x, z));
  }
  const a = new LandField(16), b = new LandField(16);
  const ha = makeHeightAt(a), hb = makeHeightAt(b);
  for (const [x, z] of [[100, -200], [-2000, 900], [8000, -5000]]) {
    assert.equal(ha(x, z), hb(x, z), `two LandFields disagree at ${x},${z}`);
  }
});

// =============================================================================
// ONE PIECE OF GROUND, ONE PLOT
//
// Settlements are laid out independently and their BOUNDS may overlap -- an
// island's core sits inside its shore ring by design. Their PLOTS may not: two
// plots on the same ground means two buildings intersecting.
//
// `port` was laid over `coastal-4` and `cormorant-isle-shore` over `coastal-0`.
// Nothing caught it: the existing tests check that land masses do not overlap
// and that placements do not overlap, and nothing checked plot against plot.
//
// It surfaced the moment "which plot is at this point" became answerable --
// 35 plot centres answered with a different plot's id, which is only possible
// if they share ground.
//
// A NOTE ON THE EPSILON, because getting this wrong cost an hour: adjacent
// plots share an edge, and `xMin + i*w + w` is not bit-identical to
// `xMin + (i+1)*w`. An exact comparison reports 4,024 overlapping pairs whose
// largest intersection is 3.6 picometres, and I reported that as "26% of the
// city overlaps" before checking the magnitude. A centimetre is far below
// anything that matters and far above anything a double invents.
// =============================================================================
const overlapWorld = generateWorld(makeHeightAt(new LandField(16)));

test("no plot sits on ground another settlement has already claimed", () => {
  const EPS = 0.01;
  const CELL = 400;
  const grid = new Map<string, any[]>();
  for (const p of overlapWorld.plots as any[]) {
    for (let cx = Math.floor(p.xMin / CELL); cx <= Math.floor(p.xMax / CELL); cx++) {
      for (let cz = Math.floor(p.zMin / CELL); cz <= Math.floor(p.zMax / CELL); cz++) {
        const k = `${cx},${cz}`;
        let b = grid.get(k);
        if (!b) grid.set(k, (b = []));
        b.push(p);
      }
    }
  }
  const clashes: string[] = [];
  for (const [, bucket] of grid) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i], b = bucket[j];
        if (a.settlement === b.settlement) continue;
        if (a.xMax - b.xMin <= EPS || b.xMax - a.xMin <= EPS) continue;
        if (a.zMax - b.zMin <= EPS || b.zMax - a.zMin <= EPS) continue;
        clashes.push(`${a.id} (${a.settlement}) over ${b.id} (${b.settlement})`);
      }
    }
  }
  assert.deepEqual(clashes.slice(0, 5), [],
    `${clashes.length} plot(s) share ground across settlements -- buildings on them intersect`);
});

test("plots within a settlement do not meaningfully overlap either", () => {
  // Reported by generateWorld rather than recomputed, so the number the world
  // publishes about itself is the number under test.
  assert.equal((overlapWorld as any).plotsOverlappingWithinSettlement, 0,
    "plots inside one settlement are overlapping by more than a centimetre -- a subdivision defect");
});

// =============================================================================
// THE EMBEDDED CITY SUMMARY MUST DESCRIBE THIS CITY
//
// grounding and planning read structureSummary() verbatim, and it now leads
// with a description of the city. That description is generated at build time,
// because generateWorld takes ~4.8 s and pulls in the whole terrain stack --
// far too slow to run per request.
//
// The cost of precomputing is that it can go stale, and a confident description
// of a world that is not there is the precise failure structureSummary's own
// no-silent-fallback rule exists to prevent. So it is checked against the plan
// that actually generates, here, where a world already exists.
//
// NAMED, EXPECTED RED as of docs/pending-commits/fix-756fd95-snap-regression
// and reconcile-narrow-bounds-exception (772fd77, a8a0d28): PLOT_CLASSES going
// whole-cell moved the real plot count from 19,874 to 20,059, a legitimate
// change this test correctly caught. NOT fixed here because
// WORLD-REBALANCE-BRIEF.md's step 3 rebalance will move the count again
// before this is done -- regenerating now (node scripts/gen-city-summary.mjs)
// would mean doing it twice. CLOSES at the end of step 3, regenerated once
// against the final rebalanced world, with a comment here naming the commit
// that did it. If this comment is still here and step 3 has landed, that is
// a dropped step, not a tolerated one.
// =============================================================================
test("the embedded city summary is not stale", async () => {
  const { CITY_SUMMARY } = await import("../src/citySummary.generated.ts");
  const m = CITY_SUMMARY.match(/([\d,]+) building plots in (\d+) settlements/);
  assert.ok(m, "the summary must state its plot and settlement counts");

  const statedPlots = Number(m[1].replace(/,/g, ""));
  const statedSettlements = Number(m[2]);
  const realPlots = overlapWorld.plots.length;
  const realSettlements = new Set((overlapWorld.plots as any[]).map((p) => p.settlement)).size;

  assert.equal(statedPlots, realPlots,
    `the summary tells the model there are ${statedPlots} plots; there are ${realPlots}. Run: node scripts/gen-city-summary.mjs`);
  assert.equal(statedSettlements, realSettlements,
    `the summary tells the model there are ${statedSettlements} settlements; there are ${realSettlements}. Run: node scripts/gen-city-summary.mjs`);
});

// =============================================================================
// EVERY OBJECT HAS ITS OWN ADDRESS
//
// The editable layer resolves objects BY ID: _reconcilePlacements adds and
// removes meshes by id, the spatial index maps a point to a plot id, and the
// change pipeline names what it is editing. All of that quietly assumes ids are
// unique, and nothing checked.
//
// They were not. Scaling the world moved coordinates off whole metres, and ids
// built from coordinates started carrying float noise -- `block--83.79999999999995`.
// Worse, two separate code paths emitted bridge landings under one id template,
// so two different roads shared a single address, and a `link-${n}-${i}` ordinal
// repeated across the convergence passes of connectStranded.
//
// A duplicate id is not cosmetic here. It means an edit aimed at one object can
// silently land on another, which is precisely the class of failure this whole
// project exists to argue against.
// =============================================================================
test("every plot, block and road has a unique id", () => {
  for (const [name, arr] of [
    ["plots", overlapWorld.plots],
    ["blocks", overlapWorld.blocks],
    ["roads", overlapWorld.roads],
  ] as [string, any[]][]) {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const o of arr) {
      if (seen.has(o.id)) dupes.add(o.id);
      seen.add(o.id);
    }
    assert.equal(dupes.size, 0,
      `${dupes.size} duplicate ${name} ids, e.g. ${[...dupes].slice(0, 3).join(", ")}`);
  }
});

test("ids are stable names, not float noise", () => {
  // An id a person or a model has to refer to cannot contain
  // `-83.79999999999995`. Coordinates in ids are rounded to the metre, which
  // cannot collide at block spacing and survives any change in float arithmetic.
  const offenders = overlapWorld.plots
    .filter((p: any) => /\.\d{3,}/.test(p.id))
    .slice(0, 5)
    .map((p: any) => p.id);
  assert.equal(offenders.length, 0,
    `ids carry unrounded coordinates: ${offenders.join(", ")}`);
});

// =============================================================================
// LANDMARKS STAND ON GROUND
//
// The stadium, the central station and the cathedral were placed at literal
// coordinates. A literal cannot look wrong -- it is just a number, equally
// plausible over a hill or over the harbour. So for the whole life of the build
// the stadium stood at -7.0 m and the cathedral at -4.1 m: both in the water,
// both shipped, neither noticed.
//
// It survived the world being rescaled, too, because a wrong coordinate scales
// to a proportionally wrong coordinate. Nothing about scaling exposes it. Only
// asking the ground does.
//
// findSite() now requests a site instead of asserting one, and this test holds
// the property that made the request necessary.
// =============================================================================
test("every landmark stands on ground that can carry it", () => {
  const WANTED: [string, number, number, number, number][] = [
    ["stadium", 1700, 250, 320, 250],
    ["central station", -420, 60, 240, 120],
    ["cathedral", -100, -40, 120, 60],
  ];
  for (const [name, dx, dz, w, d] of WANTED) {
    const site = findSite(heightAt, { x: dx * WORLD_SCALE, z: dz * WORLD_SCALE }, { w, d });
    assert.ok(site, `${name}: no legal site found -- the renderer builds nothing, which is correct, but the world has nowhere for it`);
    // The whole footprint, not just the centre: a stadium with two stands on the
    // beach passes a centre test.
    const hw = w / 2, hd = d / 2;
    for (const [x, z] of [
      [site!.x, site!.z],
      [site!.x - hw, site!.z - hd], [site!.x + hw, site!.z - hd],
      [site!.x - hw, site!.z + hd], [site!.x + hw, site!.z + hd],
    ]) {
      assert.ok(heightAt(x, z) > 0.6,
        `${name} footprint corner (${x.toFixed(0)}, ${z.toFixed(0)}) is at ${heightAt(x, z).toFixed(1)} m -- in the water`);
    }
  }
});

// =============================================================================
// THE BIG FEATURES STAND ON GROUND THAT EXISTS
//
// These are the things placed by `buildProps` at coordinates rather than by the
// plan: the airport, the golf course, the railway, the container port. They are
// the last holdouts of "assert a position" in the world, and they are the ones
// most likely to be quietly wrong, because each is far too large for a single
// height sample to describe and each had exactly one.
//
// The airport is the extreme case. It is a 3,400 m runway drawn as a FLAT PLANE
// at one sampled height, over ground that varies by 42.3 m along that line -- a
// twelve-storey discrepancy. Relocation cannot fix it: the flattest dry 3.4 km
// run anywhere in this world varies by 11.3 m. Real airports answer this with
// earthworks, and so does this one now. What is tested is therefore not "is it
// flat" -- it is not, and cannot be -- but "is the platform an honest earthwork
// on real ground".
// =============================================================================
test("the airport platform is a real earthwork on dry land, graded in bands not one mean", () => {
  // Mirrors what buildProps does: one origin chosen by asking the land.
  // READ THE MANIFEST, DO NOT RE-TYPE IT.
  //
  // This used to re-declare the airport's want and need as literals. Editing
  // features.js would leave the test green against its own private copy -- the
  // drift the brief warns about, sitting in the test suite.
  const spec = (FEATURES as any[]).find((f) => f.id === "airport");
  assert.ok(spec, "no airport in the manifest");
  const site = findFlattestSite(heightAt, spec.want(), spec.need);
  assert.ok(site, "no site for the airport at all");
  const { w: AW, d: AD } = spec.need;

  // P3.7.2 -- USED TO ASSERT cut/fill balance and total relief around ONE
  // level for the whole platform (`Math.max(6, site.mean)`, then `cut =
  // site.max - level <= range * 0.75`, `fill <= range * 0.75`, `range <
  // 60`). That was already a redefinition down from "is the platform flat"
  // (it is not, and cannot be) to "is one global mean roughly centred" --
  // honest, but weaker than what the renderer now actually builds: a
  // BANDED platform (public/city-render.js's gradeGroundBands), not one
  // level, the same mechanism the container yard and golf course use
  // (P3.7.1). Tightened to check that real gate: every band's own resolved
  // level is close to a DENSE, independent sample of the real ground
  // inside that same cell -- proving the grid is locally accurate, not
  // just globally centred around a mean that could still be a poor fit to
  // any one part of the platform.
  const bands = gradeGroundBands(
    heightAt,
    { x0: site!.x - AW / 2, x1: site!.x + AW / 2, z0: site!.z - AD / 2, z1: site!.z + AD / 2 },
    { cellX: 200, cellZ: 200 },
  );

  let worstCellDeviation = 0, checked = 0;
  for (let ri = 0; ri < bands.rows; ri++) {
    for (let ci = 0; ci < bands.cols; ci++) {
      const level = bands.cellY[ri * bands.cols + ci];
      if (level === null) continue;
      const cx0 = bands.x0 + ((bands.x1 - bands.x0) * ci) / bands.cols;
      const cx1 = bands.x0 + ((bands.x1 - bands.x0) * (ci + 1)) / bands.cols;
      const cz0 = bands.z0 + ((bands.z1 - bands.z0) * ri) / bands.rows;
      const cz1 = bands.z0 + ((bands.z1 - bands.z0) * (ri + 1)) / bands.rows;
      // A 5x5 sample INDEPENDENT of gradeGroundBands' own 3x3 -- checking
      // the mechanism against a finer measurement, not against itself.
      let sum = 0, n = 0;
      for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) {
        sum += heightAt(cx0 + ((cx1 - cx0) * a) / 4, cz0 + ((cz1 - cz0) * b) / 4);
        n++;
      }
      const deviation = Math.abs(level - sum / n);
      if (deviation > worstCellDeviation) worstCellDeviation = deviation;
      checked++;
    }
  }
  assert.ok(checked > 10, `only ${checked} band cells graded over the airport footprint -- expected a real grid`);
  assert.ok(worstCellDeviation < 10,
    `worst band cell deviates ${worstCellDeviation.toFixed(1)}m from a dense independent sample of its own ground -- the grid is not actually local, it is one mean again under a different name`);

  // SAMPLE THE PLATFORM PROPERLY, kept from the original test: this used to
  // catch findFlattestSite's own coarse grid (18x6 = 108 points) missing a
  // creek a 181x61 sample found (min -0.21m, 8 water + 92 beach samples).
  // Now checked per BAND CELL (bands.refused, from groundOrRefuse) rather
  // than one global minimum against one hand-rolled threshold -- the same
  // check every band-based feature in the renderer now gets.
  assert.equal(bands.refused, 0,
    `${bands.refused} of ${bands.cols * bands.rows} band cells refused (underwater) inside the airport platform`);
});

test("the golf course has continuous ground to sit on", () => {
  const site = findSite(heightAt, { x: -7600 * WORLD_SCALE, z: -5600 * WORLD_SCALE },
                        { w: 1520, d: 1520, radius: 3000, step: 120 });
  assert.ok(site, "no site for the golf course -- the renderer correctly builds none, but the world has nowhere for it");
});

test("the railway runs on land, not across the bay", () => {
  // The line is a single z with trains drawn along it. It skips h < 2 per point,
  // so it cannot draw over water -- but if most of the line is skipped there is
  // no railway, only the illusion of one in the stats.
  // PROBE THE LINE THE RAILWAY IS ACTUALLY ON.
  //
  // This hardcoded -3900 * WORLD_SCALE = -2535. The corridor search resolves the
  // line to -2695, having moved it 160 m to find a route that can hold 2.5%. So
  // the test was measuring ground the railway does not touch, and would have
  // passed byte-identically if findCorridor and the whole railway feature had
  // been deleted.
  const rail = placeFeatures(heightAt).sites.railway;
  assert.ok(rail, "no railway corridor resolved");
  const RAIL_Z = rail.at;
  let on = 0, total = 0;
  for (let x = rail.from; x <= rail.to; x += 60) {
    total++;
    const h = heightAt(x, RAIL_Z);
    if (h >= 2 && h <= 240) on++;
  }
  // One threshold, not two. features.js requires 0.85 to accept the corridor at
  // all; a laxer number here would let a route the manifest rejected pass.
  const REQUIRED = (FEATURES as any[]).find((f) => f.id === "railway").limit.onLand;
  assert.ok(on / total >= REQUIRED,
    `only ${((100 * on) / total).toFixed(0)}% of the railway line is on buildable ground, manifest requires ${100 * REQUIRED}%`);
});

// =============================================================================
// WALKABLE BLOCKS OBEY A SOURCED CEILING
//
// ITE/CNU give a desirable block length of 61-122 m, an acceptable CEILING of
// 183 m, and a maximum average intersection spacing of 201 m
// (docs/CITY-PLANNING-SPEC.md §1.3).
//
// The downtown grid used to run at a 230 m avenue pitch, over both limits, with
// a comment claiming "Melbourne Hoddle Grid calibration". The claim was half
// right: Melbourne's blocks ARE 201 m, but Melbourne subdivides every one with a
// ~10 m little street -- Little Collins, Little Bourke -- cutting it to about
// 96 m deep. That subdivision is where its grain comes from and it was the part
// that never got copied. A 201 m block without little streets is a superblock.
//
// The ceiling applies to WALKABLE fabric only. A farm field, a container yard
// and a hangar apron are legitimately larger, and real cities are full of them --
// so this test asserts the distinction rather than a blanket rule, which is what
// makes it a planning rule instead of a lint.
// =============================================================================
// A SETTLEMENT MAY BE TOO SPARSE TO BE "WALKABLE FABRIC" AT ALL.
//
// The ITE ceiling below is a pedestrian-scale rule: FARM/WAREHOUSE/HANGAR
// are exempt because a field or a container yard is legitimately coarse,
// not because of their name. docs/pending-commits/roads-follow-density.txt
// made that same coarseness a property a SETTLEMENT can declare directly --
// `scale`, settlementDensity's flat density multiplier -- for a landmass
// that is meant to read as low and sparse rather than as urban fabric that
// happens to be thinly built (WORLD-REBALANCE-BRIEF.md §3's barrier
// island, scale 0.12-0.19). A settlement at that density is a country lane
// network, not a city block grid that failed to fill in, and holding it to
// a walkable-block ceiling built for TERRACE row housing is the same
// category error the old COARSE-by-class list existed to prevent for FARM.
// 0.3 clears the barrier island's own values with a wide margin and sits
// far below 1 (every settlement that never declares `scale`, unaffected).
const SPARSE_SCALE_THRESHOLD = 0.3;

test("no walkable block exceeds the ITE block-length ceiling", () => {
  const CEILING = 183;
  const COARSE = new Set(["FARM", "WAREHOUSE", "HANGAR"]);

  // READ THE DERIVED CHARACTER, NOT THE DECLARED ONE.
  //
  // This test used to look the exemption up in the static SETTLEMENTS table --
  // `SETTLEMENTS.find(s => s.id === b.settlement).cls`. A later commit made the
  // character DERIVED, and generateWorld overwrites it for 48 of 55 settlements.
  // So the test was reading a field its own codebase had superseded: coastal-0
  // is declared FARM (exempt) but derived VILLA, and 23 walkable 392 m blocks --
  // more than twice the ceiling -- were being silently excused while the test
  // reported zero offenders.
  //
  // world.settlements carries the derived cls. That is the one to ask.
  const character: Record<string, string> = {};
  const scaleOf: Record<string, number> = {};
  for (const s of overlapWorld.settlements as any[]) {
    if (s.cls) character[s.id] = s.cls;
    scaleOf[s.id] = s.scale === undefined ? 1 : s.scale;
  }

  const offenders: string[] = [];
  for (const b of overlapWorld.blocks as any[]) {
    const c = character[b.settlement];
    if (!c || COARSE.has(c) || scaleOf[b.settlement] < SPARSE_SCALE_THRESHOLD) continue;
    const longest = Math.max(b.xMax - b.xMin, b.zMax - b.zMin);
    if (longest > CEILING) {
      offenders.push(`${b.id} (${c}) ${longest.toFixed(0)} m`);
    }
  }
  assert.equal(offenders.length, 0,
    `${offenders.length} walkable blocks over ${CEILING} m: ${offenders.slice(0, 5).join(", ")}`);
});

test("street spacing is derived with the character, not left behind by it", () => {
  // The defect the test above was hiding: deriving the character without
  // deriving the SPACING left re-zoned settlements on their old block grid --
  // villas laid out on 420 m farm parcels. The two must come from one place.
  const walkable = (overlapWorld.settlements as any[])
    .filter((s) => s.cls && !["FARM", "WAREHOUSE", "HANGAR"].includes(s.cls)
                && (s.scale === undefined ? 1 : s.scale) >= SPARSE_SCALE_THRESHOLD);
  assert.ok(walkable.length > 10, `only ${walkable.length} walkable settlements`);
  for (const s of walkable) {
    const blocks = (overlapWorld.blocks as any[]).filter((b) => b.settlement === s.id);
    for (const b of blocks) {
      const longest = Math.max(b.xMax - b.xMin, b.zMax - b.zMin);
      assert.ok(longest <= 183,
        `${s.id} is zoned ${s.cls} but carries a ${longest.toFixed(0)} m block -- its spacing did not follow its character`);
    }
  }
});

test("the downtown grid actually has its little streets", () => {
  // Guard the mechanism, not just the outcome: if someone raises AVENUE_SPACING
  // without the subdivision, the block test above would fail -- but if someone
  // removes the little streets and lowers the pitch instead, it would pass while
  // quietly losing the grain the ceiling exists to protect.
  const little = (overlapWorld.roads as any[]).filter((r) => r.id.startsWith("little-"));
  assert.ok(little.length > 0, "the avenue pitch exceeds the ceiling but no little streets were generated");
  for (const r of little) {
    assert.equal(r.class, "LANE", `little street ${r.id} should be LANE class (10 m, ~Melbourne's 10.06 m)`);
  }
});

// =============================================================================
// THE RAILWAY CAN ACTUALLY BE BUILT
//
// Rail is the least forgiving surface in the world. A road can climb 8%; an
// adhesion railway is finished at about 2.5%, and even the EU TSI's most
// permissive case -- new passenger-dedicated high-speed line -- caps at 3.5%
// with a 10 km moving average of 2.5% (docs/CITY-PLANNING-SPEC.md §4.1).
//
// The line used to be drawn on raw terrain, the same drape defect the roads had,
// except that on rail it is not a cosmetic problem: a formation pinned to fbm
// noise reached 15.2%, which is a funicular, not a railway.
//
// Grading alone did not fix it either, and that is the interesting part. The
// corridor search was scoring routes on how much of the line was DRY, so it
// approved the drawn route at 100% on land -- whose graded profile still reached
// 11.2%. A corridor can be entirely on land and still be unbuildable, because
// rail is limited by gradient, not by wetness. Measured across this world, a few
// hundred metres of lateral shift takes the achievable gradient from 11.2% to
// 2.5% at the same earthworks budget.
// =============================================================================
test("the railway holds a gradient a train could actually climb", () => {
  const { sites } = placeFeatures(heightAt);
  const rail = sites.railway;
  assert.ok(rail, "no railway corridor was found at all");

  assert.ok(rail.buildable,
    `the chosen corridor cannot hold the gradient: worst ${(100 * rail.worstGrade).toFixed(1)}%`);
  assert.ok(rail.worstGrade <= 0.026,
    `railway reaches ${(100 * rail.worstGrade).toFixed(1)}% -- the adhesion limit is about 2.5%`);

  // And the earthworks that buys must stay in railway territory. Real lines are
  // built on serious embankment and in deep cutting, but past roughly 40 m the
  // honest answer is a viaduct or a tunnel, which this does not model.
  assert.ok(rail.maxFill <= 40 && rail.maxCut <= 40,
    `railway needs ${rail.maxFill.toFixed(0)} m of fill and ${rail.maxCut.toFixed(0)} m of cutting`);
});

// =============================================================================
// THE FAST COAST DISTANCE IS THE SAME ANSWER, NOT A CLOSE ONE
//
// distanceToCoast walked every edge of the coastline on every call, and
// rectIsBuildable calls it once per corner for every candidate block -- roughly
// 1,840 edge tests per rectangle on a 460-vertex polygon. It is now bucketed on
// the same 400 m grid the rest of the file already used, and searches outward by
// ring, stopping once no further ring could hold anything closer.
//
// An optimisation that quietly returns slightly different answers is worse than
// a slow one: block placement, shore margins and the buildable test all depend
// on this, and a sub-metre drift would move buildings without anything failing.
// So the original linear scan is kept as distanceToCoastExact and this asserts
// the two are identical, not merely close.
// =============================================================================
test("the bucketed coast distance agrees exactly with the linear scan", () => {
  const poly = coastlinePolygon(12);
  let worst = 0;
  let checked = 0;
  for (let x = -3000; x <= 3000; x += 97) {
    for (let z = -2000; z <= 3000; z += 89) {
      const fast = distanceToCoast(x, z, poly);
      const exact = distanceToCoastExact(x, z, poly);
      const d = Math.abs(fast - exact);
      if (d > worst) worst = d;
      checked++;
      // sign matters too: inland is positive, offshore negative
      assert.equal(Math.sign(fast), Math.sign(exact),
        `sign differs at (${x}, ${z}): ${fast} vs ${exact}`);
    }
  }
  assert.ok(checked > 3000, `only ${checked} points checked`);
  assert.equal(worst, 0, `bucketed and exact disagree by up to ${worst} m`);
});

// =============================================================================
// LAND USE IS A CONSEQUENCE OF POSITION, NOT A DECLARATION
//
// Every settlement used to declare its own character in a table with no
// connection to the ground: `cls: "WAREHOUSE"` for the port, `cls: "FARM"` for
// the outer coast. Nothing tied the port being industrial to there BEING a port
// there -- the two facts agreed only because someone typed them to agree. This
// build moved the port 542 m, and the warehouses would have stayed behind.
//
// zoning.js derives the character instead, from the port, the freight line, the
// core, the water and the slope. What is tested here is not the aesthetic
// outcome but the RELATIONSHIPS -- that industry is where industry has to be,
// which is the thing a table could not guarantee and a rule can.
//
// Worth recording that the first version of these rules was WORSE than the
// hand-typed values: guessed thresholds turned towns into farms and an island
// tower district into a resort. They were re-derived from the measured demand
// distribution afterwards. A rule is only better than a guess once it has been
// calibrated against something real.
// =============================================================================
test("industry clusters at a transport node, not at random", () => {
  const { sites } = placeFeatures(heightAt);
  const port = sites.containerPort;
  const airport = sites.airport;
  const rail = sites.railway;
  assert.ok(port && airport, "no port or airport, so this cannot be tested");

  // THE OLD FLOOR (20) WAS CALIBRATED AGAINST A BUG, NOT AGAINST THE WORLD.
  //
  // docs/pending-commits/roads-follow-density.txt disabled generateWorld()'s
  // zoneCharacter override, because it was silently re-deciding settlements'
  // declared class regardless of what this rebalance asked for. Checked
  // world.zoningChanges (still recorded, no longer applied) to find out what
  // that override used to contribute here: it reclassified coastal-9
  // (declared VILLA) and coastal-10 (declared FARM) to HANGAR, purely from
  // airport proximity, which through SETTLEMENT_MIX.HANGAR's own mix
  // legitimately placed WAREHOUSE plots on land this rebalance explicitly
  // wants as a villa town and farmland, not industrial. So >20 was never a
  // fact about a working port and airport -- it was a fact about a
  // proximity heuristic overriding two settlements' declared intent, the
  // same failure pattern WORLD-DENSITY-FINDINGS.md §3 named for TOWER.
  // Measured with the override correctly OFF: 15, all of it genuinely at
  // port or airport (the strays check below, which was already true and
  // stays exactly as strict). 10 clears that with a small margin for seed
  // variation, without smuggling the old bug's inflated count back in.
  const industrial = (overlapWorld.plots as any[]).filter((p) => p.className === "WAREHOUSE");
  assert.ok(industrial.length > 10, `only ${industrial.length} industrial plots`);

  // The first version of this test asserted every warehouse was within 4 km of
  // the PORT, and it failed -- correctly. The distant ones are at the airport,
  // where SETTLEMENT_MIX.HANGAR legitimately places warehousing, because an
  // airport has freight sheds and cargo terminals. The world was right and the
  // test's premise was wrong.
  //
  // The real planning relationship is broader and worth stating properly:
  // industry clusters at a TRANSPORT NODE, because what it needs is not the sea
  // specifically but the ability to move volume. Port, airport, or the freight
  // line that serves them.
  const strays = industrial.filter((p) => {
    const cx = (p.xMin + p.xMax) / 2, cz = (p.zMin + p.zMax) / 2;
    const nearPort = Math.hypot(cx - port.x, cz - port.z) < 4000;
    const nearAir = Math.hypot(cx - airport.x, cz - airport.z) < 4000;
    const nearRail = rail ? Math.abs(cz - rail.at) < 1200 : false;
    return !nearPort && !nearAir && !nearRail;
  });
  assert.equal(strays.length, 0,
    `${strays.length} of ${industrial.length} warehouses are not near any transport node`);
});

test("hangars exist only at the airport", () => {
  const { sites } = placeFeatures(heightAt);
  const ap = sites.airport;
  assert.ok(ap, "no airport");
  const hangars = (overlapWorld.plots as any[]).filter((p) => p.className === "HANGAR");
  for (const p of hangars) {
    const cx = (p.xMin + p.xMax) / 2, cz = (p.zMin + p.zMax) / 2;
    assert.ok(Math.hypot(cx - ap.x, cz - ap.z) < 4000,
      `a hangar at (${cx.toFixed(0)}, ${cz.toFixed(0)}) is nowhere near the airport`);
  }
});

test("the density mix is a city's shape, not a monoculture", () => {
  const mix: Record<string, number> = {};
  for (const p of overlapWorld.plots as any[]) mix[p.className] = (mix[p.className] || 0) + 1;
  const total = (overlapWorld.plots as any[]).length;
  const share = (k: string) => (mix[k] || 0) / total;

  // A real city is mostly low-rise with a small dense core. Neither extreme is
  // a city: all towers is a fantasy, all villas is a suburb.
  assert.ok(share("TOWER") < 0.05, `${(100 * share("TOWER")).toFixed(1)}% towers is not a city`);
  assert.ok(share("TOWER") > 0, "a city with no towers at all has lost its core");
  const lowRise = share("VILLA") + share("TOWNHOUSE") + share("TERRACE");
  assert.ok(lowRise > 0.5 && lowRise < 0.95,
    `low-rise fabric is ${(100 * lowRise).toFixed(0)}% -- expected the majority but not the whole city`);
  assert.ok(Object.keys(mix).length >= 6,
    `only ${Object.keys(mix).length} plot classes in the whole world`);
});

// =============================================================================
// ZONING IS A LAYOUT HINT AND MUST NEVER BECOME A GATE
//
// The city exists to be edited by an AI coding agent. If zoning became a rule an
// edit had to satisfy, "put a tower on the beach" would come back refused for a
// policy reason rather than a physical one — which makes the thing boring and
// turns every interesting request into a constraint to work around.
//
// Refusals here are about physical reality: underwater, cliff, no dry corner.
// Those produce a building standing in the sea and are worth refusing over.
// "The zoning says residential" is not in that category.
//
// This test guards the boundary structurally rather than by intention, because
// intention is what erodes.
// =============================================================================
test("zoning is confined to world generation and never reaches the edit path", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  // The suite is bundled to ESM, where __dirname does not exist. cwd is the repo
  // root when run through test/run.mjs.
  const root = process.cwd();

  const offenders: string[] = [];
  const scan = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".built" || entry.name === ".git") continue;
        scan(full);
        continue;
      }
      if (!/\.(ts|js|mjs)$/.test(entry.name)) continue;
      const rel = path.relative(root, full);
      // Generation and tests may import it. Nothing else may.
      if (rel.includes("city-plan") || rel.startsWith("test") || rel.includes("zoning")) continue;
      const src = fs.readFileSync(full, "utf8");
      if (/from\s+["'][^"']*zoning\.js["']/.test(src)) offenders.push(rel);
    }
  };
  scan(path.join(root, "src"));
  scan(path.join(root, "public"));

  assert.deepEqual(offenders, [],
    `zoning.js is imported outside world generation: ${offenders.join(", ")}. It is a layout hint, not a planning code — it must not gate an edit.`);
});

// =============================================================================
// FOOTPRINTS: THE MODULE THAT HAD NO TEST
//
// An independent audit deleted both refusal branches in footprint.js — the
// verdict its own header calls "the point of the whole module" — and the suite
// stayed at 371 passing. Nothing imported it. So the module that decides whether
// a building may stand somewhere was, by the standard this project applies to
// everything else, unverified.
//
// These cover the three defects the module was written to fix, each stated as a
// property rather than a snapshot.
// =============================================================================
test("a footprint with any part in water is refused, not averaged", () => {
  // The old code asked whether the CENTRE was dry. A building with its centre on
  // the beach and its seaward half in the sea passed that test.
  const flatDry = () => 10;
  const halfWet = (x: number) => (x < 0 ? -5 : 10);

  const dry = assessFootprint(flatDry, { xMin: -20, xMax: 20, zMin: -20, zMax: 20 });
  assert.notEqual(dry.verdict, "refuse", "level dry ground should not be refused");

  const wet = assessFootprint(halfWet, { xMin: -20, xMax: 20, zMin: -20, zMax: 20 });
  assert.equal(wet.verdict, "refuse", "half the footprint is in the sea");
  assert.match(wet.reason!, /water/);
  // and the centre of that footprint is dry, which is exactly how it used to pass
  assert.ok(halfWet(0) > 0.6, "guard: the centre really is dry, so a centre-only test would pass this");
});

test("a ridge between the corners is seen", () => {
  // Four corner samples cannot see anything between them. This footprint has
  // four level corners and a wall up the middle.
  const ridge = (x: number) => (Math.abs(x) < 5 ? 40 : 10);
  const f = assessFootprint(ridge, { xMin: -20, xMax: 20, zMin: -20, zMax: 20 });
  assert.ok(f.range > 20, `range came back ${f.range.toFixed(1)} m — the ridge was missed`);
  assert.notEqual(f.verdict, "slab", "a 30 m step across the footprint is not level ground");
});

// THIS TEST USED TO PASS WITHOUT EVER REACHING THE CLIFF BRANCH.
//
// The fixture was `10 + (x / 40) * drop` over x in [-20, 20], so at drop = 40 the
// ground ran from -10 m to +30 m. -10 is below sea level, so the WATER branch
// returned first with reason "partly in water" -- and because both refusals
// carry the same verdict string, asserting `verdict === "refuse"` could not tell
// them apart. The cliff branch could have been deleted and this still passed.
//
// Two changes: the fixture is lifted clear of the sea so the cliff branch is the
// one that fires, and every case asserts the REASON, which is the only thing
// that distinguishes one refusal from another.
test("the four verdicts follow the ground, and a cliff is refused as a cliff", () => {
  // Base 100 m, so nothing in this fixture is anywhere near water.
  const at = (drop: number) => (x: number) => 100 + (x / 40) * drop;
  const f = (drop: number) => assessFootprint(at(drop), { xMin: -20, xMax: 20, zMin: -20, zMax: 20 });

  assert.equal(f(0).verdict, "slab", "level ground should be a slab");
  assert.equal(f(3).verdict, "plinth", "a 3 m fall across the footprint wants a plinth");
  assert.equal(f(10).verdict, "terrace", "a 10 m fall wants terracing");

  const cliff = f(40);
  assert.equal(cliff.verdict, "refuse", "a 40 m fall is a cliff and nothing should be built");
  assert.equal(
    cliff.reason, "cliff",
    `refused for "${cliff.reason}", not "cliff" — the fixture is reaching a different ` +
    `branch than the one this test is named for, which is how it passed while the ` +
    `cliff check did nothing`
  );
  assert.equal(cliff.wet, 0, "the cliff fixture must be entirely dry, or it is testing the water branch");

  // And the WATER refusal is a genuinely different answer, not the same one by
  // another name — the distinction the old assertion could not see.
  const inSea = assessFootprint((x: number) => -5 + (x / 40) * 2, { xMin: -20, xMax: 20, zMin: -20, zMax: 20 });
  assert.equal(inSea.verdict, "refuse");
  assert.match(inSea.reason, /water/, `sea-level ground refused for "${inSea.reason}"`);
});

test("a plinth carries the base down to the lowest corner, so nothing overhangs", () => {
  // The whole point of the plinth: the downhill side must meet its own
  // foundation rather than hanging in the air.
  const slope = (x: number) => 10 + (x / 40) * 4;
  const f = assessFootprint(slope, { xMin: -20, xMax: 20, zMin: -20, zMax: 20 });
  assert.equal(f.verdict, "plinth");
  assert.ok(Math.abs(f.base - f.min) < 1e-9,
    `base is ${f.base.toFixed(2)} but the lowest ground is ${f.min.toFixed(2)} — the downhill side would hang`);
  assert.ok(f.cut > 0, "a plinth on a slope has to cut into the uphill side");
});

// =============================================================================
// ROADS HOLD THE GRADIENT THEY CLAIM
//
// gradeRun advertises a bounded gradient per class. It did not deliver one: the
// loop alternated a gradient clamp and an earthworks clamp and RETURNED AFTER
// THE EARTHWORKS PASS whenever the two had not settled, which reintroduces the
// steep step the gradient clamp had just removed. Measured across every
// non-bridge road: 222 of 1,615 over their own class limit, including a freeway
// at 13.55% against a 4% design gradient and a 6% legal ceiling.
//
// Nothing caught it, because road grading had no test at all. An audit replaced
// the entire smoothing-and-clamping stage with a raw drape and the suite stayed
// green.
//
// This asserts the property against every real road in the world rather than a
// synthetic one, because the failure only appears where the two constraints
// genuinely conflict — which is the terrain the generator produces and not
// something a hand-made fixture would reproduce.
// =============================================================================
test("every road holds the gradient its class specifies", () => {
  const offenders: string[] = [];
  let checked = 0;

  for (const r of overlapWorld.roads as any[]) {
    if (r.bridge) continue;
    const spec = (ROAD_GRADE as any)[r.class];
    if (!spec) continue;
    if (Math.abs(r.to - r.from) < 200) continue;
    checked++;
    const g = gradeRun(heightAt, r, { step: 20, ...spec });

    // MEASURE, DO NOT ASK. This used to read `if (!g.holdsGrade)` — the verdict
    // that gradeRun computed about its own output. A mutation that pinned
    // holdsGrade to true would have satisfied this test completely while every
    // road in the world exceeded its limit, which is the exact failure mode the
    // test exists to catch. Compare the measured gradient against the spec, and
    // check the flag separately against the same measurement.
    if (g.worstGrade > spec.maxGrade * 1.001) {
      offenders.push(`${r.id} (${r.class}) reaches ${(100 * g.worstGrade).toFixed(2)}% against a ${(100 * spec.maxGrade).toFixed(0)}% limit`);
    }
    assert.equal(
      g.holdsGrade, g.worstGrade <= spec.maxGrade * 1.001,
      `${r.id}: holdsGrade says ${g.holdsGrade} but the measured gradient is ` +
      `${(100 * g.worstGrade).toFixed(2)}% against a ${(100 * spec.maxGrade).toFixed(2)}% limit ` +
      `— the flag and the number disagree`
    );
  }

  assert.ok(checked > 500, `only ${checked} roads checked`);
  assert.equal(offenders.length, 0,
    `${offenders.length} of ${checked} roads exceed their class gradient: ${offenders.slice(0, 3).join("; ")}`);
});

test("a road's legal ceiling and its design gradient do not contradict each other", () => {
  // ROAD_SLOPE_MAX is what land-use.js will allow a road of this class to be
  // PLACED on. ROAD_GRADE.maxGrade is what the surveyed alignment then holds.
  // Different questions — but a design gradient steeper than the legal ceiling
  // would entitle the alignment to build something placement would have refused.
  for (const cls of Object.keys(ROAD_GRADE as any)) {
    const design = (ROAD_GRADE as any)[cls].maxGrade;
    const ceiling = (ROAD_SLOPE_MAX as any)[cls];
    if (ceiling === undefined) continue;
    assert.ok(design <= ceiling,
      `${cls}: design gradient ${(100 * design).toFixed(0)}% exceeds its legal ceiling ${(100 * ceiling).toFixed(0)}%`);
  }
});

// =============================================================================
// LOSING AN ANCHOR LOSES A LAND USE — LOUDLY
//
// Industry is anchored to infrastructure on purpose: warehousing exists behind
// the quay and along the freight line because that is where it exists in a real
// city. So a world with no port genuinely has no industrial land, and that is
// correct.
//
// What was wrong is that it happened in silence. distToPort returns Infinity
// with no port, the WAREHOUSE branches never fire, and the build reports
// success. Verified at WORLD_SCALE = 0.4, where the port is unplaceable: every
// warehouse zone vanished and nothing said so.
// =============================================================================
test("the world states which zoning anchors it is missing", () => {
  const anchors = (overlapWorld as any).zoningAnchors;
  assert.ok(anchors, "the world does not report its zoning anchors at all");
  assert.ok(Array.isArray(anchors.missing), "missing anchors should be a list");

  // At the shipped scale everything places, so the list is empty and industry
  // exists. If that ever stops being true, this says which anchor went.
  assert.deepEqual(anchors.missing, [],
    `zoning anchors missing: ${anchors.missing.join(", ")} — the land uses they carry will be absent`);
  assert.equal(anchors.hasIndustry, true);

  // And the consequence is real: industry only exists because the port does.
  const industrial = (overlapWorld.plots as any[]).filter((p) => p.className === "WAREHOUSE");
  assert.ok(industrial.length > 0, "no industrial land in a world that reports having a port");
});

// =============================================================================
// THE SHORE DISTANCE IS EXACT, NOT NEARLY
//
// LandField.distance() searches outward by ring and stopped when
// `best < (ring + 1) * cell`, commented "provably the nearest". It is not: a
// query point sits somewhere inside its own cell, so an edge in ring r can be
// anywhere from (r-1) to (r+1) cells away, and that bound stops while a nearer
// edge can still exist further out.
//
// It matters because everything downstream is built on this number. The shore
// ramp uses it to lift land out of the water, and signed() uses a 60 m threshold
// to decide whether to fall back to an exact point-in-polygon test "so the sand
// meets the sea exactly where the plan says it does". An audit measured height
// errors up to 37.4 m and seven points landing on the WRONG SIDE of the
// coastline.
//
// This brute-forces against every coastline edge. Slow by design — correctness
// of the height field is worth a few seconds.
// =============================================================================
test("LandField.distance agrees exactly with a brute-force search", () => {
  const f = new LandField(16);
  let worst = 0;
  let wrong = 0;
  let checked = 0;

  for (let x = -20000; x <= 20000; x += 1100) {
    for (let z = -20000; z <= 12000; z += 1100) {
      const got = f.distance(x, z);
      let exact = Infinity;
      for (const e of (f as any).edges) {
        const [x0, z0, x1, z1] = e;
        const dx = x1 - x0, dz = z1 - z0;
        const l2 = dx * dx + dz * dz || 1;
        let t = ((x - x0) * dx + (z - z0) * dz) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(x - (x0 + t * dx), z - (z0 + t * dz));
        if (d < exact) exact = d;
      }
      exact = Math.min(exact, (f as any).MAX_D);
      checked++;
      const err = Math.abs(got - exact);
      if (err > 1e-6) { wrong++; if (err > worst) worst = err; }
    }
  }

  assert.ok(checked > 800, `only ${checked} points checked`);
  assert.equal(wrong, 0,
    `${wrong} of ${checked} shore distances are wrong, worst by ${worst.toFixed(1)} m — the ring bound is unsound again`);
});

// =============================================================================
// THE SPATIAL INDEX — THE MODULE WITH NO TESTS AT ALL
//
// buildSpatialIndex produces the address a visitor sees when they click a
// building, and the address string fed to grounding. Nothing imported it from a
// test. An audit ran three mutations and the suite stayed at 386 passing:
//
//   * plotAt returning null unconditionally
//   * plots registered in their CENTRE CELL ONLY — the exact defect the file's
//     own comment says it avoids ("queries near a plot's edge silently find
//     nothing")
//   * the cell size reduced tenfold
//
// These cover the properties the module exists to provide.
// =============================================================================
test("every plot can be found from a point inside it", () => {
  const ix = buildSpatialIndex(overlapWorld);
  let hit = 0, n = 0;
  for (const p of (overlapWorld.plots as any[]).slice(0, 3000)) {
    const found = ix.plotAt((p.xMin + p.xMax) / 2, (p.zMin + p.zMax) / 2);
    n++;
    if (found && found.id === p.id) hit++;
  }
  assert.ok(n > 2000, `only ${n} plots probed`);
  assert.equal(hit, n, `${n - hit} of ${n} plots could not be found from their own centre`);
});

test("a point near a plot's EDGE still finds it", () => {
  // The centre-cell-only bug passes a centre test and fails this one. A plot
  // that straddles a cell boundary must be registered in every cell it touches.
  const ix = buildSpatialIndex(overlapWorld);
  let hit = 0, n = 0;
  for (const p of (overlapWorld.plots as any[]).slice(0, 3000)) {
    // just inside each corner
    for (const [x, z] of [
      [p.xMin + 0.05, p.zMin + 0.05],
      [p.xMax - 0.05, p.zMax - 0.05],
    ]) {
      const found = ix.plotAt(x, z);
      n++;
      if (found && found.id === p.id) hit++;
    }
  }
  assert.ok(n > 4000, `only ${n} edge probes`);
  assert.equal(hit, n, `${n - hit} of ${n} edge probes missed their own plot`);
});

test("a point on no plot gets an honest answer, not a wrong one", () => {
  const ix = buildSpatialIndex(overlapWorld);
  // Far out to sea: no plot, and the index should say so rather than guessing.
  const a = ix.addressAt(0, 24000 * WORLD_SCALE);
  assert.equal(a.onPlot, false);
  assert.equal(a.plotId, null);
  // describeAt must still return something a person can read
  assert.equal(typeof ix.describeAt(0, 24000 * WORLD_SCALE), "string");
});

test("the index describes the world it was built from", () => {
  const ix = buildSpatialIndex(overlapWorld);
  assert.equal(ix.stats.plots, (overlapWorld.plots as any[]).length,
    "the index and the world disagree about how many plots exist");
  assert.ok(ix.stats.cells > 0, "no cells were built");
});

// =============================================================================
// A RIVER IS WATER EVEN 400 M UP A HILLSIDE
//
// Three comments claimed the rivers were water: "boats float on them", "the plot
// generator will not build in them", "roads are clipped at their banks". None of
// it was true. The cut is depth + 2.2 m — about 11 m — against ground 27 to
// 105 m above sea level, so the trough never reaches y = 0, and classifyAt tests
// height against SEA LEVEL. Sampled along each centreline: 0 of 164, 0 of 196,
// 0 of 182 and 0 of 166 points below sea level. Deleting waterwayCut entirely
// changed the plot count by zero.
//
// The mistake was expecting an elevation test to answer a question about
// waterways. No amount of deepening the cut fixes it without carving a gorge to
// the seabed. So the question is asked directly instead.
// =============================================================================
test("no building stands in a river or a canal", () => {
  let inWater = 0;
  const offenders: string[] = [];
  for (const p of overlapWorld.plots as any[]) {
    if (p.className === "PARK") continue;
    const f = assessFootprint(heightAt, p.buildable, waterwayAt);
    if (f.verdict !== "refuse") {
      // it will be built — so no part of it may be in a waterway
      const e = p.buildable;
      for (const [x, z] of [
        [(e.xMin + e.xMax) / 2, (e.zMin + e.zMax) / 2],
        [e.xMin, e.zMin], [e.xMax, e.zMax],
      ]) {
        if (waterwayAt(x, z)) {
          inWater++;
          if (offenders.length < 3) offenders.push(p.id);
          break;
        }
      }
    }
  }
  assert.equal(inWater, 0,
    `${inWater} buildings would stand in a waterway: ${offenders.join(", ")}`);
});

test("the waterways are actually somewhere — the check is not vacuous", () => {
  // A predicate that always returns false would pass the test above trivially.
  let found = 0;
  for (let x = -12000; x <= 12000; x += 120) {
    for (let z = -9000; z <= 3000; z += 120) {
      if (waterwayAt(x, z)) found++;
    }
  }
  assert.ok(found > 50, `waterwayAt found only ${found} points — it is not detecting the rivers`);
});

// ---------------------------------------------------------------------------
// 3.6 -- ONE DEMAND FIELD, ONE TABLE OF THRESHOLDS
//
// `DEMAND_FOR` in city-plan.js and `DENSITY_BANDS` in zoning.js read the SAME
// demand field and disagreed. DENSITY_BANDS was fitted to that field's real
// distribution; DEMAND_FOR was typed by hand and sat far above it. The rung that
// mattered was the bottom one: VILLA at 0.16 against a calibrated 0.004 put
// 43.2% of blocks (7,144 of 16,541) BELOW the lowest rung the ladder could
// reach, so for nearly half the city the demand model never ran -- those blocks
// fell through to the patchy fallback, or became FARM.
//
// Deriving one table from the other took the plot count from 16,541 to 19,481.
// This test is what stops them drifting apart again, and it drives the SHIPPED
// function rather than comparing two constants: tables that agree only on paper
// are worth nothing.
// ---------------------------------------------------------------------------
test("the block density ladder uses the calibrated bands, not a second opinion", () => {
  // A settlement whose mix admits the whole ladder, so nothing is filtered out
  // for reasons unrelated to demand.
  const s = { id: "probe", cls: "TOWER" } as any;
  const at = (d: number) => {
    // Blocks far apart, so the PARK jitter and the density jitter cannot make
    // two probes at the same demand disagree for hash reasons.
    const blk = { xMin: 0, xMax: 100, zMin: 0, zMax: 100 };
    return classForSettlementBlock(s, blk, [], [], () => d);
  };

  // 1. THE BOTTOM RUNG. This is the whole defect: above roughly 0.01 the model
  //    goes silent for the outer coast and the islands, which is most of the
  //    world's low-demand ground.
  const lowest = Math.min(...DENSITY_BANDS.map((b) => b.above));
  assert.ok(
    lowest < 0.01,
    `lowest density rung is ${lowest}; above ~0.01 it silences the demand model for ` +
    `the outer coast and islands, which is the defect this test exists for`
  );

  // 2. RUNG FOR RUNG, above the open-space threshold. Below 0.13 the shipped
  //    model may legitimately return PARK -- low demand on good ground is a
  //    park, not the smallest possible house -- so those rungs are checked
  //    differently in step 3 rather than being asserted away here.
  const OPEN_SPACE_BELOW = 0.13;
  const admitted = new Set(["TOWER", "MIDRISE", "TOWNHOUSE"]);
  let checked = 0;
  for (const b of DENSITY_BANDS) {
    if (!admitted.has(b.cls)) continue;
    if (b.above + 0.02 < OPEN_SPACE_BELOW) continue;
    const got = at(b.above + 0.02);
    assert.equal(
      got, b.cls,
      `demand just above the ${b.cls} band (${b.above}) yielded ${got} -- ` +
      `the two threshold tables have drifted apart again`
    );
    checked++;
  }
  assert.ok(checked >= 2, `only ${checked} bands were exercised; this test has stopped testing`);

  // 3. THE LOW RUNGS MUST NOT OVER-BUILD. Below the open-space threshold the
  //    answer may be PARK or the band's own class, but it must never be DENSER
  //    than the band allows -- over-building the quiet edges is exactly what a
  //    drifted, too-high table produces.
  const rank = ["TOWER", "MIDRISE", "TERRACE", "TOWNHOUSE", "VILLA", "FARM"];
  for (const b of DENSITY_BANDS) {
    if (b.above >= OPEN_SPACE_BELOW) continue;
    const got = at(b.above + 0.002);
    if (got === "PARK") continue;
    const gi = rank.indexOf(got), bi = rank.indexOf(b.cls);
    assert.ok(
      gi < 0 || gi >= bi,
      `demand ${(b.above + 0.002).toFixed(3)} sits in the ${b.cls} band but yielded the ` +
      `denser ${got} -- the ladder is over-building low-demand ground`
    );
  }

  // 3. AND THE LADDER MUST ACTUALLY BITE. Top demand is the densest admitted
  //    class, not a fallback pick.
  assert.equal(at(0.99), "TOWER", "peak demand should reach the top of the ladder");
});

// =============================================================================
// 3.8 -- FIVE BEHAVIOURS WITH NO TEST AT ALL
//
// The audit tried to break each of these and the suite stayed green at 386/386,
// because there was nothing to break: they had no coverage, which is a harder
// failure than a weak assertion and looks identical from the outside.
//
// Each test below was written by mutating the real code first and checking the
// test caught it, rather than by reading the code and describing it back.
// =============================================================================

test("roadAllowedAt applies the per-class slope ceiling, not one number for every road", () => {
  // A constant gradient, so `slope` is known and the only variable is the class.
  const at = (g: number) => (x: number) => 100 + x * g;

  // 10% ground: legal for a STREET (0.15), illegal for a FREEWAY (0.06).
  const ground = at(0.10);
  const street = roadAllowedAt(ground, 0, 0, null, "STREET");
  const freeway = roadAllowedAt(ground, 0, 0, null, "FREEWAY");

  assert.equal(street.ok, true,
    `10% ground refused for a STREET, whose ceiling is ${ROAD_SLOPE_MAX.STREET}`);
  assert.equal(freeway.ok, false,
    `10% ground accepted for a FREEWAY, whose ceiling is ${ROAD_SLOPE_MAX.FREEWAY} — ` +
    `the class ceiling is being ignored`);
  assert.equal(freeway.reason, "too steep");

  // And the ceiling must actually differ by class, or the test above passes for
  // the wrong reason.
  assert.ok(ROAD_SLOPE_MAX.FREEWAY < ROAD_SLOPE_MAX.STREET,
    "a freeway must not be allowed on steeper ground than a residential street");
});

test("a quay is found on a north-south shore, not only an east-west one", () => {
  // THE DEAD BRANCH. findQuay took `along` and defaulted it to "ew"; no caller
  // ever passed it, so every north-south branch was unreachable and half the
  // coast could not carry a port. It tries both orientations now — and nothing
  // tested that, so the fix was as untested as the bug.
  //
  // A shore running north-south: water to the west of x = 0, land to the east.
  const nsShore = (x: number, _z: number) => (x < 0 ? -20 : (x - 0) * 0.02 + 1);
  const quay = findQuay(nsShore, { x: 0, z: 0 }, { length: 400, minDepth: 8, radius: 2000, step: 60 });

  assert.ok(quay, "no berth found on a north-south shoreline — the second orientation is dead again");
  assert.equal(quay.along, "ns",
    `the berth came back on the ${quay.along} axis for a north-south shore`);

  // And the east-west branch still works, so "tries both" is not "tries ns".
  const ewShore = (_x: number, z: number) => (z < 0 ? -20 : z * 0.02 + 1);
  const ewQuay = findQuay(ewShore, { x: 0, z: 0 }, { length: 400, minDepth: 8, radius: 2000, step: 60 });
  assert.ok(ewQuay, "no berth found on an east-west shoreline");
  assert.equal(ewQuay.along, "ew", `east-west shore produced a ${ewQuay.along} berth`);
});

test("makeZoning reports a missing anchor instead of silently dropping the zone", () => {
  // Losing industry when the port is gone is correct. Losing it silently is the
  // defect, and the reporter that exists to prevent it had no test.
  const flat = () => 40;
  const withNothing = makeZoning({ heightAt: flat, demandAt: () => 0.5, sites: {} });

  assert.ok(Array.isArray(withNothing.missingAnchors), "missingAnchors is not being reported at all");
  for (const anchor of ["containerPort", "airport", "railway"]) {
    assert.ok(
      withNothing.missingAnchors.includes(anchor),
      `${anchor} is absent but not reported — it would vanish from the world silently`
    );
  }
  assert.equal(withNothing.hasIndustry, false, "no port, so there is no industry to claim");

  // And it must not cry wolf: an anchor that IS present is not reported missing.
  const withPort = makeZoning({
    heightAt: flat, demandAt: () => 0.5,
    sites: { containerPort: { x: 0, z: 0 } },
  });
  assert.ok(!withPort.missingAnchors.includes("containerPort"),
    "a port that exists is being reported as missing");
  assert.equal(withPort.hasIndustry, true);
});

test("fitSettlements keeps its two stated guarantees: no overlap, and no growth into bad ground", () => {
  // BOTH GUARANTEES WERE UNTESTED. The module's header calls them "by
  // construction", which is a claim about the code and not evidence about the
  // output — and "by construction" is exactly the kind of assurance that stops
  // being true the first time someone edits the loop.
  //
  // An island: dry inside a radius, sea outside. Two settlements placed close
  // enough that unchecked growth would run them into each other and into water.
  const island = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    return r < 3000 ? 40 : -15;
  };
  const list = [
    { id: "a", cls: "TOWNHOUSE", edge: 0.06, bounds: { xMin: -1400, xMax: -600, zMin: -400, zMax: 400 } },
    { id: "b", cls: "TOWNHOUSE", edge: 0.06, bounds: { xMin: 600, xMax: 1400, zMin: -400, zMax: 400 } },
  ];
  // maxGrowth IS RAISED DELIBERATELY, AND THE FIRST VERSION OF THIS TEST WAS
  // WORTHLESS WITHOUT IT. At the default 4.0 the area cap halted growth at 4.2x
  // with rejectedLand = 0 and rejectedNeighbour = 0 — neither guard ever ran,
  // so the test passed by describing a loop that had stopped for an unrelated
  // reason. Both mutations below survived it. Lifting the cap makes the land and
  // the neighbour the binding constraints, which is what is under test.
  const { settlements, stats } = fitSettlements(list as any, island, { step: 60, sample: 45, maxGrowth: 100 });

  assert.ok(stats.growth > 1.05, `settlements barely grew (x${stats.growth.toFixed(2)}); this is not exercising the loop`);

  // AND THE GUARDS MUST HAVE ACTUALLY FIRED. Asserting only on the outcome lets
  // a deleted check pass whenever the fixture never needed it — which is exactly
  // how this test failed to notice both mutations the first time.
  assert.ok(stats.rejectedNeighbour > 0,
    `the neighbour check never rejected a strip (${stats.rejectedNeighbour}); ` +
    `this fixture is not exercising it, so guarantee 1 below proves nothing`);
  assert.ok(stats.rejectedLand > 0,
    `the buildable check never rejected a strip (${stats.rejectedLand}); ` +
    `this fixture is not exercising it, so guarantee 2 below proves nothing`);

  // GUARANTEE 1: no two settlement rectangles overlap.
  for (let i = 0; i < settlements.length; i++) {
    for (let j = i + 1; j < settlements.length; j++) {
      const a = settlements[i].bounds, b = settlements[j].bounds;
      const over = a.xMin < b.xMax && a.xMax > b.xMin && a.zMin < b.zMax && a.zMax > b.zMin;
      assert.ok(!over,
        `${settlements[i].id} and ${settlements[j].id} overlap — the neighbour check is not holding`);
    }
  }

  // GUARANTEE 2: no settlement grew substantially into water. Sampled on a grid,
  // because corner-sampling is how a settlement ends up straddling a coast.
  for (const s of settlements) {
    const b = s.bounds;
    let wet = 0, total = 0;
    for (let x = b.xMin; x <= b.xMax; x += 60) {
      for (let z = b.zMin; z <= b.zMax; z += 60) {
        total++;
        if (island(x, z) <= 0) wet++;
      }
    }
    const wetShare = wet / total;
    assert.ok(wetShare < 0.28,
      `${s.id} is ${(100 * wetShare).toFixed(0)}% water — it grew into the sea ` +
      `(minBuildable is 0.72, so 28% is the documented ceiling)`);
  }
});

// ---------------------------------------------------------------------------
// 1.1 -- THE NUMERIC BUCKET KEY MUST NOT COLLIDE OVER THE REAL COASTLINE
//
// distance() is the single hottest function in world generation. Its spatial
// buckets were keyed by the string `bx + "," + bz`, which built and hashed a
// string on every lookup. Replacing that with an integer pairing took the world
// build from 5.32 s to 2.34 s -- but a pairing is only injective inside its
// range, and outside it two distant stretches of coast silently share a bucket.
// The symptom of that would not appear here; it would appear as a building in
// the sea somewhere across the map.
//
// So the range is asserted against the coastline the world actually has, not
// against the range I assumed it had. This is the same mistake the shoreline
// ring bound made when its comment said "provably".
// ---------------------------------------------------------------------------
test("every coastline bucket falls inside the numeric key's injective range", () => {
  const field = new LandField(16);
  const cell = field.cell;

  let checked = 0, worstX = 0, worstZ = 0;
  for (const e of (field as any).edges) {
    for (const [ex, ez] of [[e[0], e[1]], [e[2], e[3]]]) {
      const bx = Math.floor(ex / cell), bz = Math.floor(ez / cell);
      if (Math.abs(bx) > Math.abs(worstX)) worstX = bx;
      if (Math.abs(bz) > Math.abs(worstZ)) worstZ = bz;
      assert.ok(
        bucketKeyInRange(bx, bz),
        `coastline bucket (${bx}, ${bz}) is outside the key's injective range — ` +
        `two different cells would share a key and merge two stretches of coast`
      );
      checked++;
    }
  }
  assert.ok(checked > 1000, `only ${checked} coastline endpoints checked — this is not exercising the real coast`);

  // The margin, so a future world that grows fails here rather than silently.
  // distance() also probes 3 rings out, so the reachable extent is wider than
  // the coastline's own.
  const margin = 2048 - Math.max(Math.abs(worstX), Math.abs(worstZ)) - 4;
  assert.ok(margin > 100,
    `only ${margin} cells of headroom left in the bucket key (worst bucket ${worstX}, ${worstZ}) — ` +
    `raise BUCKET_SPAN/BUCKET_HALF before the world grows further`);
});
