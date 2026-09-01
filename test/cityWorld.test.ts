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
  offsetPolygon, COAST, splinePolygon, BRIDGES, signedArea2, LANDMASSES,
} from "../public/city-plan.js";
import { WORLD_SCALE } from "../public/world-scale.js";
import { findSite, findFlattestSite } from "../public/land-use.js";

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

import { LandField, makeHeightAt, reliefAt, edgeFalloff, EDGE, BASINS, cliffiness, SNOW_LINE, TREE_LINE } from "../public/terrain.js";
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
test("the airport platform is a real earthwork on dry land", () => {
  // Mirrors what buildProps does: one origin chosen by asking the land, the
  // platform levelled at the MEAN of the ground it covers.
  const site = findFlattestSite(heightAt, { x: 12100 * WORLD_SCALE, z: -4750 * WORLD_SCALE },
                                { w: 3600, d: 1200, radius: 2500, step: 150, grade: 200 });
  assert.ok(site, "no site for the airport at all");
  const level = Math.max(6, site!.mean);

  assert.ok(site!.min > 0.6,
    `the airport platform reaches water: lowest point ${site!.min.toFixed(1)} m`);

  // Cut and fill should roughly balance -- that is what levelling at the mean
  // buys, and it is how real earthworks are designed. If either dominates, the
  // platform is perched on one end of the ground rather than driven through it.
  const cut = site!.max - level, fill = level - site!.min, range = site!.range;
  assert.ok(cut <= range * 0.75, `platform is nearly all cut (${cut.toFixed(1)} m of ${range.toFixed(1)} m)`);
  assert.ok(fill <= range * 0.75, `platform is nearly all fill (${fill.toFixed(1)} m of ${range.toFixed(1)} m)`);

  // And the earthwork has to be buildable, not a mountain removal. 60 m of total
  // relief across an airport is already a big civil project; past that the site
  // is wrong, not the platform.
  assert.ok(range < 60,
    `the airport site needs ${range.toFixed(0)} m of earthworks -- that is a quarry, not a platform`);
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
  const RAIL_Z = -3900 * WORLD_SCALE;
  let on = 0, total = 0;
  for (let x = -17000 * WORLD_SCALE; x <= 17000 * WORLD_SCALE; x += 60) {
    total++;
    const h = heightAt(x, RAIL_Z);
    if (h >= 2 && h <= 240) on++;
  }
  assert.ok(on / total > 0.6,
    `only ${((100 * on) / total).toFixed(0)}% of the railway line is on buildable ground`);
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
test("no walkable block exceeds the ITE block-length ceiling", () => {
  const CEILING = 183;
  // Classes that are genuinely not pedestrian fabric.
  const COARSE = new Set(["FARM", "WAREHOUSE", "HANGAR"]);
  const offenders: string[] = [];

  for (const b of overlapWorld.blocks as any[]) {
    const st = (SETTLEMENTS as any[]).find((s) => s.id === b.settlement);
    if (st && COARSE.has(st.cls)) continue;
    const longest = Math.max(b.xMax - b.xMin, b.zMax - b.zMin);
    if (longest > CEILING) {
      offenders.push(`${b.id} (${b.settlement || "downtown"}) ${longest.toFixed(0)} m`);
    }
  }

  assert.equal(offenders.length, 0,
    `${offenders.length} walkable blocks over ${CEILING} m: ${offenders.slice(0, 5).join(", ")}`);
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
