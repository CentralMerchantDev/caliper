// =============================================================================
// CALIPER — TERRAIN
//
// The world had no ground. Every land mass was a flat extruded plate at a fixed
// height with cones stood on top of it, which is why it read as a diagram: real
// coasts are a continuous surface that happens to cross sea level. Here there is
// ONE height function over the whole 40 km, and the shoreline is simply where it
// crosses y = 0. Beaches, shallows, headlands, hills and the range all fall out
// of that instead of being drawn separately and lined up by hand.
//
// Everything in this file is pure and deterministic: same x, z in, same height
// out, no THREE, no DOM, no randomness. It is testable in Node, which matters
// because the renderer, the plot generator and the AI pipeline all have to agree
// on where the ground is.
// =============================================================================

import { landmassPolygonsDesign, WORLD } from "./city-plan.js";

// -----------------------------------------------------------------------------
// Deterministic noise. Integer hash -> value noise -> fbm. No dependencies, no
// seeding ceremony, and identical in Node and the browser.
// -----------------------------------------------------------------------------




/** Fractal noise in world metres. `scale` is the size of the largest feature. */



// =============================================================================
// RELIEF DATA
//
// Three tiers, because that is what a real coastal city has behind it and it is
// exactly what was missing: 70 identical cones five kilometres from downtown
// read as a hedge, not as country.
//
//   1. COASTAL HILLS  1-4 km inland, 90-340 m. The suburb ridges you actually
//      see over the rooftops. Vancouver's Little Mountain, Wellington's suburbs.
//   2. FOOTHILLS      a broad swell from about 6 km inland, up to ~380 m.
//   3. THE RANGE      a spine 12-18 km out, 1.3-2.6 km, snow above ~2050 m.
//      Vancouver's North Shore mountains are ~15 km from downtown; that distance
//      is the whole reason they read as scenery rather than as a wall.
// =============================================================================

// =============================================================================
// DESIGN SPACE vs WORLD SPACE
//
// Everything below this line works in DESIGN metres -- the 48 km world these
// numbers were calibrated in. Nothing in here knows the world got smaller, and
// that is the point.
//
// The world is a uniform scale model of the design:
//
//     heightAt_world(x, z)  =  heightAt_design(x / k, z / k) * k
//
// which gives two guarantees that hand-scaling the constants could not:
//
//   1. The coastline is the y = 0 contour, so it comes out as EXACTLY the drawn
//      outline multiplied by k. Mark's traced pen strokes survive intact; they
//      are not re-derived, re-noised or approximated.
//   2. Slope is dH/dx = (dH/dX)(1/k)(k) = dH/dX -- IDENTICAL. Every threshold in
//      land-use.js (ROAD_MAX 0.13, BUILD_MAX 0.32, CLIFF 0.62) stays valid
//      without being touched or re-argued.
//
// A first attempt scaled the ~28 landform constants by hand instead. It had a
// real bug in it within the hour: rampFactor is a DIMENSIONLESS multiplier
// derived from island dimensions, so measuring it off already-scaled polygons
// shrank every beach by k^2 and quietly put island interiors under water. That
// is the failure mode of hand-scaling -- twenty-eight chances to miss one, and
// the ones you miss do not announce themselves. Here there is no constant to
// miss, because no constant moves.
//
// The boundary is at the bottom of this file: a short block that converts each
// public symbol into world space. Symbols nothing imports stay module-local
// rather than being exported in an ambiguous space.
// =============================================================================
import { WORLD_SCALE, sm, toDesign, sFields } from "./world-scale.js";
// THE DUPLICATE IS GONE.
//
// This file carried its own byte-identical copies of hash2, valueNoise and fbm.
// The comment in noise.js explains why they were separated -- city-plan.js needs
// the same noise, and city-plan importing terrain.js would have been a cycle --
// but the conclusion drawn here was to keep a COPY, which is the one option that
// guarantees the two can drift apart.
//
// noise.js imports nothing at all, so terrain.js importing it is not a cycle and
// never was. Two implementations of one primitive is worse than either, and it
// matters more now than it did: the design/world scale boundary assumes the
// terrain and the plan agree exactly about what noise a coordinate produces.
// clamp/smooth/smoother were byte-identical re-declarations of noise.js's, in a
// file that already imports from it -- the same duplication the header above
// says was removed. Imported now.
import { hash2, valueNoise, fbm, clamp, smooth, smoother } from "./noise.js";

/** The alpine spine: a polyline, so the range is a range and not a scatter. */
const RANGE_SPINE = [
  [-21000, -16400], [-15000, -14300], [-9000, -13100], [-2500, -13500],
  [ 3500, -14600], [ 10000, -15900], [ 17000, -17400], [ 22000, -18600],
];
const RANGE = { width: 5000, height: 1620 };

/**
 * Named summits on or just off the spine, so the skyline has peaks rather than
 * one long ridge. Heights are calibrated: the North Shore mountains behind
 * Vancouver top out around 1,450 m and the Coast Mountains behind them around
 * 2,500 m. An earlier pass SUMMED the ridge band and the summits and produced a
 * 4,040 m wall -- higher than anything in the Rockies -- so they blend by max.
 */
const PEAKS = [
  { x: -16800, z: -14700, h: 1980, r: 3000 },
  { x: -11200, z: -13500, h: 1740, r: 2600 },
  { x:  -5400, z: -13000, h: 2320, r: 3600 },   // the big one, on axis with downtown
  { x:    900, z: -13700, h: 1830, r: 2800 },
  { x:   7200, z: -15000, h: 2080, r: 3100 },
  { x:  13600, z: -16400, h: 1620, r: 2500 },
  { x: -20400, z: -16000, h: 1520, r: 2400 },
];

/**
 * Ridges INSIDE the built-up coastal belt -- the hills a city is actually laid
 * over. Vancouver has Little Mountain, Wellington is built up its slopes, and
 * that is what stops a coastal plain reading as a table. Deliberately modest:
 * 55-130 m over 1-2 km, enough to bend streets and give some blocks a view
 * without turning the grid into a staircase.
 */
const COAST_RIDGES = [
  { x: -12800, z: -3400, h: 96,  r: 1700 },
  { x:  -9200, z: -2900, h: 78,  r: 1400 },
  { x:  -5600, z: -3600, h: 124, r: 2000 },
  { x:  -2400, z: -3100, h: 88,  r: 1500 },
  { x:    900, z: -3500, h: 112, r: 1800 },
  { x:   4600, z: -2950, h: 70,  r: 1300 },
  { x:   8200, z: -3400, h: 105, r: 1700 },
  { x:  12400, z: -3100, h: 82,  r: 1500 },
  { x:  16000, z: -3600, h: 118, r: 1900 },
];

/** Close hills: the middle ground between the harbour and the mountains. */
const HILLS = [
  { x: -1400, z: -6300, h: 215, r: 2600 },   // Hillside suburb sits on this
  { x:  1900, z: -6900, h: 190, r: 2200 },
  { x: -4600, z: -5600, h: 145, r: 1900 },
  { x:  5200, z: -6100, h: 165, r: 2300 },
  { x: -8600, z: -5200, h: 120, r: 2100 },
  { x:  9400, z: -6400, h: 135, r: 2200 },
  { x: -12600, z: -6600, h: 175, r: 2600 },
  { x:  13800, z: -7200, h: 155, r: 2400 },
];

/**
 * The land is faded down through sea level over the last few kilometres of the
 * modelled area. Without it the mainland simply STOPS: a 300 m plateau ending in
 * a vertical drop, which is the single most artificial thing in a wide shot. Now
 * the coast just curves away and the ocean closes over it.
 */
const EDGE = { xHalf: 26500, zFar: -28000, fade: 7000, depth: 110, wobble: 1800 };

function edgeFalloff(x, z) {
  // Taking min(dx, dz) fades the land inside a RECTANGLE, and from altitude that
  // is exactly what you see: a green rectangle with square corners and dead
  // straight sides, sitting in the ocean. A cubic superellipse rounds the
  // corners, and a low-frequency wobble on both thresholds gives the far coast
  // bays and headlands instead of a ruled line.
  const wx = (fbm(z * 0.9, 4000, 9000, 2) - 0.5) * 2 * EDGE.wobble;
  const wz = (fbm(x * 0.9, -7000, 11000, 2) - 0.5) * 2 * EDGE.wobble;
  const u = Math.max(0, (Math.abs(x) - (EDGE.xHalf + wx - EDGE.fade)) / EDGE.fade);
  const v = Math.max(0, ((EDGE.zFar + wz + EDGE.fade) - z) / EDGE.fade);
  const q = Math.cbrt(u * u * u + v * v * v);
  return smoother(clamp(1 - q, 0, 1));
}

const SNOW_LINE = 1480;
const TREE_LINE = 980;

// =============================================================================
// SHORE PROFILE — cliffs and beaches
//
// One ramp length for every coast in the world gives every coast the same
// character. Real shorelines alternate: exposed headlands are cut back into rock
// cliffs that come out of the water in tens of metres, sheltered bays fill with
// sand and shelve over hundreds. The difference is the single most legible thing
// about a coast from the air, and it is the whole reason a peninsula reads as a
// peninsula rather than as a green tongue.
//
// CLIFFS are declared where they belong -- the two ocean-facing headlands and
// the island's own north point -- and the rest of the coast varies smoothly
// between sand and low rock on a long-wavelength noise, so no two kilometres of
// shore are alike.
// =============================================================================
// A cliff has to be RESOLVABLE by the terrain mesh. At 26 m it was narrower than
// a single grid cell, so the headlands came out as flat plateaux with a hard
// edge and no cliff face at all. 90 m of ramp carrying a 75 m lift is a slope of
// about 40 degrees, which the mesh renders as a real face and which trips the
// rock threshold in the ground-colour ramp.
const BEACH_RAMP = 190;      // metres of gentle sand
const CLIFF_RAMP = 90;       // metres of steep rock
const CLIFF_ZONES = [
  { x: -16600, z:  5100, r: 4200 },   // Westhead
  { x:  17400, z:  3500, r: 3400 },   // Eastpoint
  { x: -21000, z:   400, r: 3600 },   // the exposed west shore
  { x:  20000, z:  1200, r: 3000 },   // the exposed east shore
  { x:  -1360, z:  -560, r:  900 },   // the island's north point
];

/**
 * DREDGED BASINS. A marina cut into a shore whose beach ramps over 190 m does
 * not fill with water -- it fills with sand, and the basin came out at 2.5 cm
 * of depth. Real basins are dredged and walled: flat bottom, hard edge. Any
 * water inside one of these is cut to its declared depth.
 */
const BASINS = [
  { x: 2020, z: 200, r: 250, depth: 6.5 },      // the marina, in the east inlet
  { x: 820, z: -430, r: 600, depth: 12.0 },     // THE HARBOUR, dredged for ships
  // MOVED ONTO WATER, WHERE A BASIN CAN EXIST.
  //
  // This was declared at (-5300, -2650), which is 40 m up a HILLSIDE. Dredging
  // only cuts water -- makeHeightAt consults BASINS in the `m < 0` branch -- so a
  // basin on land does nothing at all, and the container port has been standing
  // on a hill with an inert basin under it and no water to berth in.
  //
  // Nothing caught it because the port's own code never asked. It marched north
  // from a hard-coded z until the ground came up and called that the quay; the
  // comment there concedes the previous hard-coded z "stood in open water" and
  // fixes it by searching, which is the same question asked privately and worse.
  //
  // Found by searching for water with buildable land behind it: 542 m south, the
  // shore of the same inlet, 100% buildable ground behind for the stacks.
  { x: -5077, z: -1846, r: 620, depth: 13.0 },  // the container port berths
];

/** 0 = sand, 1 = cliff. */
function cliffiness(x, z) {
  let c = 0;
  for (const q of CLIFF_ZONES) {
    const d = Math.hypot(x - q.x, z - q.z);
    if (d >= q.r) continue;
    const v = smoother(1 - d / q.r);
    if (v > c) c = v;
  }
  // everywhere else: a slow drift between sand and low rock along the coast
  const drift = clamp((fbm(x, z, 3400, 3) - 0.42) * 2.6, 0, 1);
  return Math.max(c, drift * 0.72);
}

/** Metres over which the land climbs out of the water at this point. */
function shoreRampAt(x, z) {
  const c = cliffiness(x, z);
  return BEACH_RAMP + (CLIFF_RAMP - BEACH_RAMP) * c;
}

const SHORE_RAMP = 105;      // the old single value, kept for reference

// =============================================================================
// LAND FIELD
//
// Answering "how far is this point from the nearest shore, and is it inland?"
// naively costs 1,100 edge tests per query, and the terrain mesh alone asks
// about 180,000 times. So the coast is indexed once: edges in a spatial hash for
// distance, and a scanline-filled raster for inside/outside. Both are built in a
// few milliseconds and then every query is O(1).
// =============================================================================
export class LandField {
  constructor(samplesPerSegment = 16, cell = 420, maskCell = 40) {
    this.cell = cell;
    this.maskCell = maskCell;
    this.masses = landmassPolygonsDesign(samplesPerSegment);

    // --- world bounds, padded ---
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const m of this.masses) for (const [x, z] of m.polygon) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    this.x0 = x0 - 600; this.x1 = x1 + 600;
    this.z0 = z0 - 600; this.z1 = z1 + 600;

    // --- edge spatial hash ---
    this.edges = [];
    this.buckets = new Map();
    this.masses.forEach((m, mi) => {
      const p = m.polygon;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const e = [p[j][0], p[j][1], p[i][0], p[i][1], mi];
        const idx = this.edges.push(e) - 1;
        const bx0 = Math.floor(Math.min(e[0], e[2]) / cell), bx1 = Math.floor(Math.max(e[0], e[2]) / cell);
        const bz0 = Math.floor(Math.min(e[1], e[3]) / cell), bz1 = Math.floor(Math.max(e[1], e[3]) / cell);
        for (let bx = bx0; bx <= bx1; bx++) for (let bz = bz0; bz <= bz1; bz++) {
          const k = bx + "," + bz;
          let arr = this.buckets.get(k);
          if (!arr) this.buckets.set(k, (arr = []));
          arr.push(idx);
        }
      }
    });

    // --- inside mask, scanline filled, one byte per cell (mass index + 1) ---
    this.mw = Math.ceil((this.x1 - this.x0) / maskCell) + 1;
    this.mh = Math.ceil((this.z1 - this.z0) / maskCell) + 1;
    this.mask = new Int8Array(this.mw * this.mh);
    const xs = [];
    for (let r = 0; r < this.mh; r++) {
      const z = this.z0 + r * maskCell;
      for (let mi = 0; mi < this.masses.length; mi++) {
        const p = this.masses[mi].polygon;
        xs.length = 0;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          const zi = p[i][1], zj = p[j][1];
          if ((zi > z) !== (zj > z)) xs.push(p[i][0] + ((z - zi) / (zj - zi)) * (p[j][0] - p[i][0]));
        }
        if (xs.length < 2) continue;
        xs.sort((a, b) => a - b);
        for (let s = 0; s + 1 < xs.length; s += 2) {
          const c0 = Math.max(0, Math.ceil((xs[s] - this.x0) / maskCell));
          const c1 = Math.min(this.mw - 1, Math.floor((xs[s + 1] - this.x0) / maskCell));
          for (let c = c0; c <= c1; c++) this.mask[r * this.mw + c] = mi + 1;
        }
      }
    }
    // A BEACH CANNOT BE WIDER THAN ITS ISLAND.
    //
    // One ramp factor for every non-mainland mass (0.6) is right for a 4 km key
    // and absurd for a 400 m one, where a 114 m beach drowns most of the
    // interior -- an island came out 13% under water for no reason but its own
    // beach. The factor now scales with the square root of the mass's area.
    this.rampFactor = this.masses.map((m) => {
      if (m.kind === "mainland") return 1;
      let a = 0;
      const p2 = m.polygon;
      for (let i = 0, j = p2.length - 1; i < p2.length; j = i++) {
        a += p2[j][0] * p2[i][1] - p2[i][0] * p2[j][1];
      }
      // A beach cannot be wider than the island it is on -- and the constraint
      // is the island's NARROW dimension, not its area. sqrt(area) treats a
      // long thin island as though it were a square of the same size, so
      // Bayview (2.7 km2, but only ~900 m across a strait it cannot grow out
      // of) was given a beach wide enough to drown 11% of its own interior.
      // Two islands can have identical areas and completely different room for
      // a shore.
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const [px, pz] of p2) {
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (pz < z0) z0 = pz; if (pz > z1) z1 = pz;
      }
      const narrowKm = Math.min(x1 - x0, z1 - z0) / 1000;
      const areaKm = Math.sqrt(Math.abs(a / 2)) / 1000;    // ~ side length in km
      const km = Math.min(areaKm, narrowKm * 0.85);
      return Math.max(0.16, Math.min(0.8, km * 0.42));
    });

    this.MAX_D = cell * 3;
  }

  /** Which land mass covers (x, z)? -1 for water. */
  massAt(x, z) {
    const c = Math.round((x - this.x0) / this.maskCell);
    const r = Math.round((z - this.z0) / this.maskCell);
    if (c < 0 || r < 0 || c >= this.mw || r >= this.mh) return -1;
    return this.mask[r * this.mw + c] - 1;
  }

  /** Unsigned distance to the nearest shoreline, saturating at MAX_D. */
  distance(x, z) {
    const bx = Math.floor(x / this.cell), bz = Math.floor(z / this.cell);
    let best = Infinity;
    for (let ring = 0; ring <= 3; ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dz = -ring; dz <= ring; dz++) {
        if (ring > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const arr = this.buckets.get((bx + dx) + "," + (bz + dz));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const e = this.edges[arr[k]];
          const ex = e[2] - e[0], ez = e[3] - e[1];
          const l2 = ex * ex + ez * ez || 1;
          let t = ((x - e[0]) * ex + (z - e[1]) * ez) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = e[0] + t * ex, pz = e[1] + t * ez;
          const d = Math.hypot(x - px, z - pz);
          if (d < best) best = d;
        }
      }
      // THE BOUND WAS OFF BY ONE RING, AND THE COMMENT SAID "PROVABLY".
      //
      // A query point sits somewhere inside its own cell, so an edge in ring r
      // can be as close as (r - 1) cells and as far as (r + 1). Stopping when
      // `best < (ring + 1) * cell` therefore stops while a NEARER edge can still
      // exist in the next ring out. Brute-forced against every coastline edge:
      // 61 of 2,091 sampled points overestimated, worst +194.7 m. A wider audit
      // sweep found 9.9% wrong inside the 190 m shore-ramp band, 411 points that
      // should have used the exact point-in-polygon fallback skipping it, height
      // errors up to 37.4 m, and seven points on the WRONG SIDE of the coast.
      //
      // The safe bound is `best <= ring * cell`: stop only once the best found
      // is inside the region already fully searched.
      if (best <= ring * this.cell) break;
    }
    return best === Infinity ? this.MAX_D : Math.min(best, this.MAX_D);
  }

  /** Exact even-odd test against ONE polygon. Used only near the shore. */
  insidePolygon(mi, x, z) {
    const p = this.masses[mi].polygon;
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const xi = p[i][0], zi = p[i][1], xj = p[j][0], zj = p[j][1];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  /** Which mass owns the nearest shoreline edge to (x, z)? */
  nearestMass(x, z) {
    const bx = Math.floor(x / this.cell), bz = Math.floor(z / this.cell);
    let best = Infinity, mi = -1;
    for (let ring = 0; ring <= 3; ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dz = -ring; dz <= ring; dz++) {
        if (ring > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const arr = this.buckets.get((bx + dx) + "," + (bz + dz));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const e = this.edges[arr[k]];
          const ex = e[2] - e[0], ez = e[3] - e[1], l2 = ex * ex + ez * ez || 1;
          let t = ((x - e[0]) * ex + (z - e[1]) * ez) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const d = Math.hypot(x - (e[0] + t * ex), z - (e[1] + t * ez));
          if (d < best) { best = d; mi = e[4]; }
        }
      }
      // Same off-by-one-ring bound as in distance(); see the note there.
      if (best <= ring * this.cell) break;
    }
    return mi;
  }

  /**
   * Positive inland, negative offshore.
   *
   * The raster answers instantly but quantises the coast to one mask cell, which
   * put the waterline up to half a cell away from the coastline the renderer
   * draws. Within 60 m of the shore -- under 1% of the terrain grid -- this
   * falls back to an exact point-in-polygon test against the single nearest
   * mass, so the sand meets the sea exactly where the plan says it does.
   */
  signed(x, z) {
    const d = this.distance(x, z);
    let m;
    if (d < 60) {
      const cand = this.nearestMass(x, z);
      m = cand >= 0 && this.insidePolygon(cand, x, z) ? cand : -1;
    } else {
      m = this.massAt(x, z);
    }
    return { d: m >= 0 ? d : -d, mass: m };
  }
}

// =============================================================================
// HEIGHT
// =============================================================================

/** Distance from a point to the range spine polyline. */
function distToSpine(x, z) {
  let best = Infinity;
  for (let i = 1; i < RANGE_SPINE.length; i++) {
    const [ax, az] = RANGE_SPINE[i - 1], [bx, bz] = RANGE_SPINE[i];
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
    let t = ((x - ax) * ex + (z - az) * ez) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - (ax + t * ex), z - (az + t * ez));
    if (d < best) best = d;
  }
  return best;
}

/** Bumps blend by MAX, not by sum: summing turns distinct hills into one dome. */
function bumps(x, z, list) {
  let best = 0;
  for (const b of list) {
    const d = Math.hypot(x - b.x, z - b.z);
    if (d >= b.r) continue;
    const v = b.h * smoother(1 - d / b.r);
    if (v > best) best = v;
  }
  return best;
}

/** Everything above sea level, before the shoreline ramp is applied. */
function reliefAt(x, z, massKind) {
  // 1. the mass's own plateau
  let h = massKind === "mainland" ? 15 : massKind === "city" ? 16 : 7;

  if (massKind === "mainland") {
    // the coastal plain tilts up away from the harbour
    const inland = clamp((-z - 2100) / 4200, 0, 1);
    h += smooth(inland) * 44;
    // ROLLING GROUND, ALL THE WAY TO THE COAST.
    //
    // This term existed but was gated behind smooth((-z - 2200) / 1800), so it
    // only reached full strength about 4 km inland -- which is past every
    // settlement on the mainland. The belt where the city actually sits was a
    // putting green, and from the air the whole coastal plain read as a table
    // with towns printed on it.
    //
    // No gate now. The shore ramp in makeHeightAt already scales relief to zero
    // at the waterline, so the coast still meets the sea cleanly; the ground
    // behind it is allowed to have shape. Two scales: long ridges, and a finer
    // undulation across them.
    h += (fbm(x, z, 2600, 3) - 0.44) * 78;
    h += (fbm(x + 5100, z - 3300, 1100, 3) - 0.5) * 34;

    // Coastal ridges: a few real hills IN the built belt, so streets climb and
    // there are places with a view. Without named highs the noise alone gives
    // texture but no landmarks.
    h = Math.max(h, bumps(x, z, COAST_RIDGES));

    // 2/3/4. hills, the foothill swell and the range BLEND BY MAX. Summing them
    // gave a 4,040 m coastal wall; taking the max lets each tier dominate where
    // it belongs and hands over smoothly in between.
    const hill = bumps(x, z, HILLS);

    // A 300 m swell across the whole hinterland flattened the range into bumps
    // on a plateau. The foothills are the middle ground, not the main event.
    const foot = clamp((-z - 6200) / 5400, 0, 1);
    const swell = smoother(foot) * 165 * (0.5 + 0.5 * fbm(x, z, 5200, 3));

    const ds = distToSpine(x, z);
    let alpine = 0;
    if (ds < RANGE.width) {
      const band = smoother(1 - ds / RANGE.width);
      alpine = RANGE.height * Math.pow(band, 1.35) * (0.52 + 0.48 * fbm(x, z, 3400, 4));
    }
    alpine = Math.max(alpine, bumps(x, z, PEAKS) * (0.74 + 0.26 * fbm(x, z, 1500, 3)));

    // MOUNTAINS DO NOT SHRINK WITH THE WORLD.
    //
    // Everything else here is design-space relief that the boundary wrapper
    // multiplies by WORLD_SCALE, so the land comes out as an exact smaller copy
    // of itself. The range is the deliberate exception: dividing by WORLD_SCALE
    // here cancels that multiply, so the peaks stand at their full drawn height
    // (1,620 m ridge, 2,320 m on the big summit) above a world that is otherwise
    // 0.65 the size.
    //
    // The cost is real and is stated rather than hidden: the range now rises the
    // same height over a footprint 0.65 as wide, so its slopes are 1/WORLD_SCALE
    // steeper than drawn. That is acceptable ONLY because the spine sits 6-10 km
    // inland of every settlement -- it is scenery, not ground anything is built
    // on. The hills and coastal ridges in the BUILT belt are left scaling
    // normally, because slope there has to stay honest for roadAllowedAt and
    // buildAllowedAt to mean anything.
    h += Math.max(hill, swell, alpine / WORLD_SCALE);
    // alpine roughness, only where it is already high
    if (h > 420) h += (fbm(x, z, 700, 5) - 0.5) * Math.min(340, h * 0.30);
  }

  // gentle micro-relief so no ground is dead flat -- but a city island that
  // undulates by 9 m makes every street look drunk, so it is small there.
  h += (fbm(x, z, 1400, 3) - 0.5) * (massKind === "mainland" ? 20 : 3.2);
  return h;
}

/**
 * The one height function. Returns metres relative to sea level; negative is
 * sea bed. The coastline is exactly the y = 0 contour, so beaches and shallows
 * are geometry rather than decals lined up by hand.
 */
// =============================================================================
// RIVERS AND CANALS
//
// Carved out of the height field rather than drawn on top of it, so they are
// really water: boats float on them, the shore treatment finds their banks, and
// anything asking "is this land?" gets the right answer. A river painted as a
// blue ribbon over solid ground would be a lie the rest of the system could not
// see.
//
// Each is a polyline with a half-width and a depth. The carve is a smooth
// trough so the banks slope instead of dropping vertically, and rivers WIDEN
// toward their mouth the way real ones do.
// =============================================================================
const WATERWAYS = [
  // --- mainland rivers, running down out of the range to the coast ---
  { id: "river-west",  kind: "river", halfWidth: 95, depth: 7,
    points: [[-11700, -9200], [-11500, -7400], [-11350, -5600], [-11250, -4200], [-11200, -3050]] },
  { id: "river-mid",   kind: "river", halfWidth: 120, depth: 9,
    points: [[-5400, -10400], [-5500, -8200], [-5700, -6200], [-5800, -4400], [-5900, -3000]] },
  { id: "river-east",  kind: "river", halfWidth: 85, depth: 6,
    points: [[900, -9800], [800, -7600], [700, -5600], [640, -4000], [600, -2980]] },
  { id: "river-far-e", kind: "river", halfWidth: 70, depth: 5,
    points: [[11800, -8600], [11600, -6600], [11500, -4800], [11400, -3400], [11400, -2380]] },

  // --- island canals: narrow, straight-ish, cut for boats ------------------
  { id: "canal-kingsley", kind: "canal", halfWidth: 34, depth: 4,
    points: [[-6900, -900], [-6100, -600], [-5200, -420], [-4300, -350]] },
  { id: "canal-fairlight", kind: "canal", halfWidth: 30, depth: 4,
    points: [[3500, -600], [4400, -420], [5300, -380], [6200, -500]] },
  { id: "canal-cormorant", kind: "canal", halfWidth: 28, depth: 3.5,
    points: [[-14600, -900], [-13800, -700], [-13000, -620]] },
];

/** Distance from (x,z) to a polyline, and how far along it we are (0..1). */
function alongWaterway(x, z, pts) {
  let best = Infinity, bestT = 0, acc = 0, total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const px = ax + t * dx, pz = az + t * dz;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best) { best = dist; bestT = (acc + t * Math.sqrt(L2)) / (total || 1); }
    acc += Math.sqrt(L2);
  }
  return { dist: best, t: bestT };
}

/** How much to subtract from the land height at (x,z) for rivers and canals. */
/**
 * IS THIS POINT IN A RIVER OR CANAL?
 *
 * The rivers were never water and three comments said they were: "boats float on
 * them", "the plot generator will not build in them", "roads are clipped at
 * their banks". None of it was true. The cut is depth + 2.2 m -- about 11 m --
 * against ground 27 to 105 m above sea level, so the trough never reaches y = 0.
 * classifyAt tests height against SEA LEVEL, so it calls every river point
 * buildable. Sampled at 25 m along each centreline: 0 of 164, 0 of 196, 0 of 182
 * and 0 of 166 points below sea level. Deleting waterwayCut entirely changed the
 * plot count by ZERO. Only the three canals, which run at the coast, are water.
 *
 * The mistake was expecting an elevation test to answer a question about
 * waterways. A river 400 m up a hillside is still a river; it is just not below
 * sea level, and no amount of deepening the cut will make it so without carving
 * a gorge to the seabed.
 *
 * So this asks the question directly. It is geometry, not elevation: a point is
 * in a waterway if it is within the trough, which is exactly what waterwayCut
 * already computes and then throws away.
 */
export function waterwayAt(x, z) {
  const dx = toDesign(x), dz = toDesign(z);
  for (const w of WATERWAYS) {
    const { dist, t } = alongWaterway(dx, dz, w.points);
    const hw = w.kind === "river" ? w.halfWidth * (0.45 + 0.55 * t) : w.halfWidth;
    if (dist <= hw) return true;      // in the water itself, not the banks
  }
  return false;
}

function waterwayCut(x, z) {
  let cut = 0;
  for (const w of WATERWAYS) {
    const { dist, t } = alongWaterway(x, z, w.points);
    // A river is narrow in the hills and broad at its mouth; a canal is cut to
    // one width the whole way, because that is what a canal is.
    const hw = w.kind === "river" ? w.halfWidth * (0.45 + 0.55 * t) : w.halfWidth;
    const reach = hw * 2.6;              // trough plus sloping banks
    if (dist > reach) continue;
    const k = 1 - smooth(clamp((dist - hw) / (reach - hw), 0, 1));
    cut = Math.max(cut, (w.depth + 2.2) * k);
  }
  return cut;
}

/**
 * The water SURFACE of a waterway, as a chain of points with a height.
 *
 * A river 120 m up a hillside is still water, but the sea-level water plane
 * cannot show it -- carving the trough alone just makes a dry valley. So each
 * waterway carries its own surface, sitting a little below its banks and
 * falling monotonically to sea level at the mouth. Rivers run downhill; that is
 * the one property a river surface must not get wrong, and sampling terrain
 * without enforcing it produces water flowing uphill wherever the noise dips.
 */
function waterwaySurface(w, heightAt, step = 90) {
  const pts = [];
  for (let i = 0; i < w.points.length - 1; i++) {
    const [ax, az] = w.points[i], [bx, bz] = w.points[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.round(L / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  pts.push(w.points[w.points.length - 1].slice());

  // bank height beside each sample, then force it to descend
  const hw = w.halfWidth;
  const out = pts.map(([x, z]) => {
    const bank = Math.max(heightAt(x + hw * 2.4, z), heightAt(x - hw * 2.4, z));
    return { x, z, y: bank - w.depth * 0.45 };
  });
  for (let i = 1; i < out.length; i++) if (out[i].y > out[i - 1].y) out[i].y = out[i - 1].y;
  // and meet the sea at the mouth
  const mouth = 0.35;
  if (out.length) {
    const last = out[out.length - 1].y;
    if (last > mouth) {
      const drop = last - mouth;
      for (let i = 0; i < out.length; i++) {
        const t = i / (out.length - 1);
        out[i].y -= drop * smoother(t);
      }
    }
  }
  return out;
}

function makeHeightAt(field) {
  return function heightAt(x, z) {
    const s = field.signed(x, z);
    const m = s.mass, d = s.d < 0 ? -s.d : s.d;

    if (m < 0) {
      for (const b of BASINS) {
        if (Math.hypot(x - b.x, z - b.z) < b.r) {
          // flat dredged bottom, with a short lip so the quay wall is sharp
          const t2 = clamp((b.r - Math.hypot(x - b.x, z - b.z)) / 55, 0, 1);
          return -b.depth * smooth(t2) - 0.6;
        }
      }
      // --- sea bed ---
      // ONE continuous curve from the waterline out. Composing a "shelf" and a
      // "deep" term and taking the minimum put -10 m immediately against the
      // sand, i.e. a submarine cliff one metre off the beach, which killed the
      // shallows the whole water treatment depends on.
      const near = smooth(clamp(d / 260, 0, 1)) * 6.5;        // 0 -> -6.5 m of surf shelf
      const far = smoother(clamp(d / 2700, 0, 1)) * 116;      // then out to -122 m
      const t = clamp(d / 2400, 0, 1);
      return -(near + far) + (fbm(x, z, 2600, 2) - 0.5) * 7 * t;
    }

    const kind = field.masses[m].kind;
    // A cliff also stands HIGHER than a beach does: the ramp gets you out of the
    // water fast, and the extra lift is what you then fall off.
    // Islands get SHORTER beaches than the mainland. A 190 m ramp is right for
    // an open mainland shore and wrong for a 2 km island, where it drowns most
    // of the rim: a tenth of Harbour Isle's interior came out below the
    // waterline purely because its beach was as wide as a continental one.
    const cf = cliffiness(x, z);
    const rampLen = shoreRampAt(x, z) * field.rampFactor[m];
    const ramp = smoother(clamp(d / rampLen, 0, 1));
    const cliffLift = cf * 75 * ramp;
    // The shore ramp lifts land out of the water; the edge falloff takes the far
    // edge of the modelled world back UNDER it. Fading to exactly zero is not
    // enough -- that leaves a continent-sized plane at precisely sea level, which
    // from altitude is a flat green table with a cliff at its edge, which is
    // exactly what it looked like. It has to become sea bed.
    const f = edgeFalloff(x, z);
    const landH = (reliefAt(x, z, kind) * ramp + cliffLift) * f - (1 - f) * EDGE.depth;

    // Rivers and canals are cut OUT of the land here, not painted over it -- but
    // the cut alone does NOT make them water to anything downstream, and an
    // earlier version of this comment claimed it did. The trough is about 11 m
    // against ground tens of metres above sea level, and classifyAt tests height
    // against sea level, so every river point read as buildable. Use
    // waterwayAt() for "is this water"; the cut is only the shape of the valley. A waterway drawn as a blue
    // ribbon on top of solid ground is a lie the rest of the system cannot see.
    const cut = waterwayCut(x, z);
    return cut > 0 ? landH - cut : landH;
  };
}

/**
 * Ground colour by height and slope. Beach, grass, scrub, rock, snow -- the
 * transitions are what make relief legible; a single green makes a mountain
 * look like a green tent.
 */
const GROUND_BANDS = [
  { upTo: -30,    color: 0x1d4763 },  // deep bed -- shows through the water as blue
  { upTo: -11,    color: 0x2f6f8c },  // shelf
  { upTo:  -3.5,  color: 0x63a8a8 },  // the turquoise band every warm coast has
  { upTo:  -0.6,  color: 0xc9c295 },  // the wet strip the tide works
  { upTo:   1.6,  color: 0xeadaa8 },  // dry sand
  { upTo:   3.2,  color: 0xdcd0a4 },  // dune grass
  { upTo:  18,    color: 0x9db56d },  // coastal grass
  { upTo: 120,    color: 0x87a75f },  // pasture
  { upTo: 360,    color: 0x749a56 },  // hill green
  { upTo: 700,    color: 0x64854c },  // upland
  { upTo: 980,    color: 0x717a52 },  // treeline scrub
  { upTo:1180,    color: 0x7d7460 },  // scree
  { upTo:1330,    color: 0x8a8378 },  // rock
  { upTo:1480,    color: 0x9c968c },  // bare rock
  { upTo:9999,    color: 0xf4f8fc },  // snow
];

/**
 * Ground colour, INTERPOLATED between the band anchors rather than snapped to
 * them.
 *
 * Hard bands put a hard colour edge at each threshold, and that edge is then
 * drawn wherever the mesh happens to cross it. Where the 40 m core grid meets
 * the 200 m outer grid the two disagree about the sea bed by a couple of metres,
 * which is nothing -- except that it flipped whole 200 m triangles from one side
 * of the -11 m band to the other, and the seam showed up as a jagged dark band
 * lying across the bay in plain view. Depth in water is a gradient anyway.
 */
function bandColor(h) {
  const B = GROUND_BANDS;
  if (h <= B[0].upTo) return B[0].color;
  for (let i = 1; i < B.length; i++) {
    if (h > B[i].upTo) continue;
    const lo = B[i - 1], hi = B[i];
    // blend across the lower half of each band, so each colour still reads
    const span = hi.upTo - lo.upTo;
    const t = clamp((h - lo.upTo) / (span * 0.75), 0, 1);
    const e = t * t * (3 - 2 * t);
    const r0 = (lo.color >> 16) & 255, g0 = (lo.color >> 8) & 255, b0 = lo.color & 255;
    const r1 = (hi.color >> 16) & 255, g1 = (hi.color >> 8) & 255, b1 = hi.color & 255;
    return (Math.round(r0 + (r1 - r0) * e) << 16) |
           (Math.round(g0 + (g1 - g0) * e) << 8) |
            Math.round(b0 + (b1 - b0) * e);
  }
  return B[B.length - 1].color;
}

function groundColor(h, slope) {
  let c = bandColor(h);
  // steep ground sheds soil: show rock on anything sharper than about 32 degrees
  if (slope > 0.62 && h > 60) {
    const t = clamp((slope - 0.62) / 0.5, 0, 1);
    const r0 = (c >> 16) & 255, g0 = (c >> 8) & 255, b0 = c & 255;
    const r1 = 0x86, g1 = 0x80, b1 = 0x76;
    c = (Math.round(r0 + (r1 - r0) * t) << 16) | (Math.round(g0 + (g1 - g0) * t) << 8) | Math.round(b0 + (b1 - b0) * t);
  }
  return c;
}

export const TERRAIN = { SHORE_RAMP, WORLD };


// =============================================================================
// THE BOUNDARY: design space in, world space out
//
// Everything above works in design metres. Everything that imports this file
// works in world metres. This block is the only place the two meet, so there is
// exactly one thing to get right rather than a constant-by-constant audit.
//
// LandField is deliberately NOT wrapped: it is built from the design-space
// polygons and is only ever consumed through makeHeightAt, so its internal grid
// constants (cell 420, maskCell 40, the 60 m exact-test band, MAX_D) stay
// calibrated to the space they were chosen in.
// =============================================================================

/** The one height function. World metres in, world metres out. */
function makeHeightAtWorld(field) {
  const design = makeHeightAt(field);
  if (WORLD_SCALE === 1) return design;   // exact no-op, so k=1 is provably identity
  return function heightAt(x, z) {
    return design(x / WORLD_SCALE, z / WORLD_SCALE) * WORLD_SCALE;
  };
}

const cliffinessWorld = (x, z) => cliffiness(toDesign(x), toDesign(z));
const edgeFalloffWorld = (x, z) => edgeFalloff(toDesign(x), toDesign(z));
const reliefAtWorld = (x, z, massKind) => reliefAt(toDesign(x), toDesign(z), massKind) * WORLD_SCALE;

const EDGE_WORLD = sFields(EDGE, ["xHalf", "zFar", "fade", "depth", "wobble"]);
const BASINS_WORLD = BASINS.map((b) => sFields(b, ["x", "z", "r", "depth"]));
const WATERWAYS_WORLD = WATERWAYS.map((w) => ({
  ...w,
  halfWidth: sm(w.halfWidth),
  depth: sm(w.depth),
  points: w.points.map(([x, z]) => [sm(x), sm(z)]),
}));
// Ground colour is keyed to height, and heights are now world heights, so the
// band anchors move with them. Without this the snow line in the COLOUR ramp
// would sit at a different altitude from SNOW_LINE itself.
const GROUND_BANDS_WORLD = GROUND_BANDS.map((b) => ({ ...b, upTo: sm(b.upTo) }));
function groundColorWorld(h, slope) {
  return groundColor(toDesign(h), slope);   // slope is dimensionless and scale-invariant
}

/** Waterway surface geometry, in world metres. */
function waterwaySurfaceWorld(w, heightAt, step = sm(90)) {
  return waterwaySurface(w, heightAt, step);
}

export {
  // Re-exported so existing consumers (city-render imports fbm from here) keep
  // working. Same functions, one implementation, from noise.js.
  hash2, valueNoise, fbm,
  makeHeightAtWorld as makeHeightAt,
  cliffinessWorld as cliffiness,
  edgeFalloffWorld as edgeFalloff,
  reliefAtWorld as reliefAt,
  groundColorWorld as groundColor,
  waterwaySurfaceWorld as waterwaySurface,
  EDGE_WORLD as EDGE,
  BASINS_WORLD as BASINS,
  WATERWAYS_WORLD as WATERWAYS,
  GROUND_BANDS_WORLD as GROUND_BANDS,
  SNOW_LINE_WORLD as SNOW_LINE,
  TREE_LINE_WORLD as TREE_LINE,
};
const SNOW_LINE_WORLD = sm(SNOW_LINE);
const TREE_LINE_WORLD = sm(TREE_LINE);
