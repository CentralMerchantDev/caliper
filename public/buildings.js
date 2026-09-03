// =============================================================================
// CALIPER — BUILDING LIBRARY
//
// Every building in the world used to be a box with a slightly larger box on
// top. At any distance that reads as a bar chart: a tower, a terrace house, a
// barn and an aircraft hangar all had the same silhouette, so no district could
// be told from another and nothing had scale.
//
// Here each plot class has an ARCHETYPE that emits real parts -- podiums,
// setbacks, crowns, pitched and hipped roofs, chimneys, colonnades, sawtooth
// shed roofs, silos, rooftop plant. Silhouette is what makes a stylised city
// legible, and it is nearly free: everything is emitted into a handful of
// buckets and drawn as InstancedMesh, so 88,062 parts cost 14 draw calls. (The
// "60,000" here was stale; the "about a dozen" was right, and is the half of
// this claim that actually matters.)
//
// This module is pure data-in, parts-out. It never touches the scene graph, so
// it can be tested in Node without a GPU.
// =============================================================================

import * as THREE from "./vendor/three/three.module.min.js";
import { fbm, clamp } from "./noise.js";
// city-plan.js does not import this module, so there is no cycle. The class
// height ceilings live there because they are a property of the PLAN, and this
// module has to honour them rather than keep a second copy that can drift.
import { PLOT_CLASSES } from "./city-plan.js";

/** Deterministic 0..1 from any string. Same hash the plan generator uses. */
export function rnd(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const pick = (arr, s) => arr[Math.floor(rnd(s) * arr.length) % arr.length];

/**
 * Pick a colour that NEIGHBOURS SHARE.
 *
 * A per-building hash spreads a fourteen-colour palette evenly over every
 * street, which is salt and pepper: statistically varied, and nothing like a
 * city. Real streets are built in runs -- a terrace of one era in one render, a
 * block of post-war brick, a strip of glass from one boom -- so the palette
 * index comes from smooth noise over POSITION, with only a little per-building
 * jitter on top. The result is neighbourhoods with a colour, not confetti.
 */
function pickLocal(arr, s, x, z, scale = 900) {
  const band = fbm(x + 1700, z - 900, scale, 2);
  const t = clamp(band + (rnd(s) - 0.5) * 0.30, 0, 0.999);
  return arr[Math.floor(t * arr.length)];
}

// -----------------------------------------------------------------------------
// PALETTE
//
// Saturated and curated rather than sampled from photographs. Grey massing reads
// as a study model; colour with CONTRASTING roofs is most of what makes a
// stylised city look like a city rather than a scale model of one.
// -----------------------------------------------------------------------------
export const WALLS = {
  // Terraces are painted render, brick and stucco -- and a street of them is
  // never one colour. Seven warm tones made a whole island read as a single
  // rust-red carpet; these are the muted creams, greys and greens that sit
  // between the reds in any real terraced town.
  TERRACE:   [0xd98b5f, 0xc4694c, 0xe0a878, 0xb5533f, 0xd9a066, 0xa8604a, 0xcf7f57,
              0xe8dfcd, 0xd3d6cf, 0xc2cbc6, 0xbfae95, 0xa9b3ba, 0xdedac8, 0x9fae9c],
  TOWNHOUSE: [0xf0e2cb, 0xe6d3b3, 0xdcc9a8, 0xf5ead8, 0xd8c7a0, 0xe9d9bd, 0xd6d8cf, 0xe0cfc0, 0xcdd3d0, 0xefe3d2],
  // Warm tones matter as much as the cool ones. A core of nothing but pale
  // blue-grey glass reads as one building repeated four thousand times; real
  // downtowns mix curtain wall with brick, sandstone and painted render.
  MIDRISE:   [0xe8e4dc, 0xd6dde2, 0xf2efe6, 0xcdd6dd, 0xe4dcd0, 0xdde5e8, 0xd9cfc0, 0xc8d2cd,
              0xc9a184, 0xb8836a, 0xd8b48e, 0xa8907c, 0xe0c9a8],
  TOWER:     [0x9fc4dd, 0x7fa8cc, 0xbcd6e8, 0x6f97be, 0xa8cfe0, 0x8fb5d4, 0xcfd6d2, 0xb9c2b6, 0xd8cfc0, 0x8fa0a8],
  CIVIC:     [0xf5efe0, 0xece4d2, 0xfaf5ea, 0xf0e8d6],
  RESORT:    [0xf7f2e6, 0xfdfbf5, 0xf2e4d0, 0xe8f0f4, 0xfdf6ea, 0xf0e2cc, 0xe8ddd0],
  VILLA:     [0xf5ead6, 0xeadcc2, 0xfdf4e4, 0xe2d6bd, 0xf7efe0, 0xefe0c8, 0xdfe4de, 0xe4d4c4, 0xd8dee2, 0xf2e8d2],
  WAREHOUSE: [0xb9c0c6, 0xa8b2ba, 0xc8ced2, 0x9fa9b1],
  FARM:      [0xd9cbaa, 0xe4d8bb, 0xcdbd98],
  HANGAR:    [0xd2d8dc, 0xc2cad0, 0xe0e5e8],
  PARK:      [0x7fa860],
};
export const ROOFS = {
  TERRACE:   [0x8a4436, 0x9c5340, 0x7a3b30, 0x93503c, 0x5e6870, 0x6f6152],
  // Nine roof colours, not five, and only three of them red. Five colours with a
  // red majority turned nine thousand suburban houses into one red carpet you
  // could see from ten kilometres away. Real suburbs are mixed: tile, slate,
  // metal, weathered grey.
  TOWNHOUSE: [0xb04a3c, 0x8f5a44, 0x6d7f8c, 0x9d4b3a, 0x5f6b74, 0x7d8a6a, 0x8a7f6c, 0x4f5a63, 0xa8714a],
  MIDRISE:   [0x5b6670, 0x6b7580, 0x4f5a63, 0x7a7266, 0x54636e, 0x6a7a72],
  TOWER:     [0x46525e, 0x3c4650, 0x505d6a, 0x5d5a52, 0x6a6f6a],
  CIVIC:     [0x4f7a6a, 0x3f6a5c, 0x8a6a4a],
  // Three shades of teal on a beachfront of hotels turned the whole strip blue.
  // Real resorts are white render, terracotta and pale metal with the odd
  // blue-tiled roof, not a row of swimming pools stood on end.
  RESORT:    [0xd8d2c4, 0xe6dfd0, 0xb8846a, 0x9aa4a8, 0x4d8fa6, 0xc9b79a, 0xd0c2b0],
  VILLA:     [0xb85a44, 0xa04a3a, 0xc76b52, 0x8a6a52, 0x6f8090, 0x9aa2a0, 0x7a6f5c, 0xd08a5c],
  // Dark grey sheet roofs went to near-black once shaded; port sheds read as
  // holes in the ground. Lightened, with the usual variety.
  WAREHOUSE: [0x9aa3ab, 0x8a939b, 0xa8b0b6, 0x7f8890, 0x99a0a0],
  FARM:      [0x9c3f30, 0x8a3a2c, 0xa84a38],
  HANGAR:    [0x7f878c, 0x6f777c],
  PARK:      [0x5c8f43],
};

/**
 * Storey heights. TOWER is super-linear so a handful of buildings genuinely
 * dominate: a skyline where every tower is the same height is a comb.
 */
export const HEIGHT = {
  TERRACE:   (r) => 12 + r * 9,
  TOWNHOUSE: (r) => 8.5 + r * 7,
  MIDRISE:   (r) => 24 + r * 42,
  TOWER:     (r) => 62 + Math.pow(r, 1.9) * 205,
  CIVIC:     (r) => 20 + r * 30,
  PARK:      () => 0,
  RESORT:    (r) => 16 + Math.pow(r, 1.5) * 52,
  VILLA:     (r) => 6.5 + r * 6,
  WAREHOUSE: (r) => 11 + r * 10,
  FARM:      (r) => 6 + r * 5,
  HANGAR:    (r) => 13 + r * 12,
};

// =============================================================================
// PART COLLECTOR
//
// Buckets are keyed by (geometry, material) pair. Everything an archetype emits
// lands in one of these, and the renderer turns each bucket into exactly one
// InstancedMesh.
// =============================================================================
export function createCollector() {
  const b = {};
  const out = {
    buckets: b,
    /** x,y,z = centre; sx,sy,sz = size; ry = yaw; c = 0xRRGGBB */
    add(bucket, x, y, z, sx, sy, sz, c, ry = 0) {
      let a = b[bucket];
      if (!a) a = b[bucket] = [];
      a.push(x, y, z, sx, sy, sz, ry, c);
    },
    count() { let n = 0; for (const k in b) n += b[k].length / 8; return n; },
  };
  return out;
}

// =============================================================================
// ARCHETYPES
//
// Each takes the plot footprint and ground height and emits parts. `s` is a
// per-building seed string so the same plot always produces the same building --
// the pipeline has to be able to describe a building it has already shown.
// =============================================================================

/**
 * The shortest a building of each class may be. Every archetype subtracts a
 * podium, plinth or shopfront band from the total height, so a height below
 * these leaves a NEGATIVE body -- which is exactly what the per-building height
 * jitter started producing: a wall scaled to -0.30 m.
 */
export const MIN_HEIGHT = {
  TERRACE: 9, TOWNHOUSE: 6, MIDRISE: 15, TOWER: 42, CIVIC: 13,
  RESORT: 15, VILLA: 5, WAREHOUSE: 8, FARM: 5, HANGAR: 9, PARK: 0,
};

/** Never let an archetype emit a zero or negative dimension. */
const pos = (v, min = 0.4) => (v > min ? v : min);

/** Glass bucket by height, so storey banding stays about 3.5 m at every scale. */
function glassBucket(h) { return h > 110 ? "glassT" : h > 52 ? "glassM" : "glassL"; }

/**
 * TOWERS — five forms, not one.
 *
 * A downtown of nothing but setback boxes is a bar chart with a haircut. These
 * are the shapes that actually make a modern skyline legible from across a bay:
 *
 *   setback   the classic stepped shaft
 *   taper     a stack that narrows all the way up (Art Deco through to Burj)
 *   twist     segments rotating a few degrees each (Turning Torso, Shanghai)
 *   slab      a wide thin plate, sometimes split by a full-height slot
 *   crown     a straight shaft finished with a pyramid or a sloped cap
 *
 * The variant is chosen by hash, so the same plot always grows the same tower --
 * the pipeline has to be able to talk about a building it has already shown.
 */
function tower(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.TOWER, s + "w", x, z), roof = pickLocal(ROOFS.TOWER, s + "r", x, z, 1400);
  const r1 = rnd(s + "1"), r2 = rnd(s + "2"), r3 = rnd(s + "3"), r4 = rnd(s + "4");
  const glass = glassBucket(h);
  const podH = 8 + r1 * 9;
  o.add("wall", x, g + podH / 2, z, w * 1.10, podH, d * 1.10, 0xe6e0d4);          // podium
  o.add("roof", x, g + podH + 0.5, z, w * 1.14, 1.0, d * 1.14, roof);             // podium cap

  const base = g + podH;
  const shaftH = pos(h - podH, 6);
  // A whole district of pyramids reads as a mausoleum quarter. "crown" is the
  // rarest form, and only half of those get a pyramid rather than a chamfer.
  const form = r2 < 0.30 ? "setback" : r2 < 0.52 ? "taper" : r2 < 0.70 ? "twist"
             : r2 < 0.90 ? "slab" : "crown";
  let topW = w, topD = d;

  if (form === "setback") {
    const lowH = shaftH * (0.52 + r3 * 0.16), upH = shaftH - lowH;
    o.add(glass, x, base + lowH / 2, z, w, lowH, d, wall);
    o.add("roof", x, base + lowH + 0.6, z, w * 1.02, 1.2, d * 1.02, roof);
    o.add(glass, x, base + lowH + upH / 2, z, w * 0.74, upH, d * 0.74, wall);
    topW = w * 0.74; topD = d * 0.74;
    o.add("roof", x, g + h + 1.1, z, topW * 1.06, 2.2, topD * 1.06, roof);
  } else if (form === "taper") {
    const n = 4 + Math.floor(r3 * 3);
    const seg = shaftH / n;
    for (let i = 0; i < n; i++) {
      const k = 1 - (i / n) * (0.34 + r4 * 0.22);
      o.add(glass, x, base + seg * i + seg / 2, z, w * k, seg, d * k, wall);
      if (i) o.add("roof", x, base + seg * i + 0.5, z, w * k * 1.07, 1.0, d * k * 1.07, roof);
      topW = w * (1 - ((n - 1) / n) * (0.34 + r4 * 0.22));
    }
    topD = topW * (d / w);
    o.add("roof", x, g + h + 1.0, z, topW * 1.08, 2.0, topD * 1.08, roof);
  } else if (form === "twist") {
    const n = 8 + Math.floor(r3 * 6);
    const seg = shaftH / n;
    const step = (0.035 + r4 * 0.045) * (r1 > 0.5 ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const k = 1 - (i / n) * 0.14;
      o.add(glass, x, base + seg * i + seg / 2, z, w * k, seg * 1.03, d * k, wall, step * i);
    }
    topW = w * 0.86; topD = d * 0.86;
    o.add("roof", x, g + h + 1.2, z, topW * 1.05, 2.4, topD * 1.05, roof, step * n);
  } else if (form === "slab") {
    // wide and thin, across the plot -- and often split by a full-height slot
    const sw = w * 1.0, sd = d * (0.44 + r3 * 0.16);
    if (r4 > 0.45) {
      const halfW = sw * 0.46;
      for (const side of [-1, 1]) {
        o.add(glass, x + side * (sw / 2 - halfW / 2), base + shaftH / 2, z, halfW, shaftH, sd, wall);
      }
      o.add("metal", x, base + shaftH * 0.72, z, sw * 0.08, shaftH * 0.5, sd * 0.5, 0xb4bcc2);
    } else {
      o.add(glass, x, base + shaftH / 2, z, sw, shaftH, sd, wall);
    }
    topW = sw; topD = sd;
    o.add("roof", x, g + h + 1.1, z, sw * 1.03, 2.2, sd * 1.12, roof);
  } else {
    o.add(glass, x, base + shaftH / 2, z, w, shaftH, d, wall);
    o.add("roof", x, g + h + 0.9, z, w * 1.05, 1.8, d * 1.05, roof);
    // a pyramid or a chamfered cap -- the silhouette a flat top never gives you
    const capH = 9 + r3 * 20;
    if (r4 > 0.55) {
      o.add("pyr", x, g + h + 1.8 + capH / 2, z, w * 0.98, capH, d * 0.98, roof);
    } else {
      // a chamfered cap: two stacked setbacks rather than a spike
      o.add("wall", x, g + h + 2 + capH * 0.3, z, w * 0.82, capH * 0.6, d * 0.82, roof);
      o.add("roof", x, g + h + 2 + capH * 0.7, z, w * 0.60, capH * 0.35, d * 0.60, roof);
    }
    topW = w * 0.5; topD = d * 0.5;
  }

  // --- balconies: a residential tower reads completely differently from an
  // office one, and this is the cheapest way to say which is which ---
  if (r1 > 0.62 && form !== "twist") {
    const bands = Math.max(2, Math.min(9, Math.floor(shaftH / 22)));
    for (let i = 1; i <= bands; i++) {
      const by = base + (shaftH * i) / (bands + 1);
      o.add("roof", x, by, z, topW * 1.08, 0.7, topD * 1.08, roof);
    }
  }

  // --- crown, mast, plant and helipad ---
  o.add("wall", x, g + h + 5.2, z, topW * 0.56, 6.6, topD * 0.56, roof);
  if (r3 > 0.45) o.add("cyl", x, g + h + 9 + (6 + r1 * 26) / 2, z, 2.0, 6 + r1 * 26, 2.0, 0xcfd6dc);
  o.add("metal", x - topW * 0.22, g + h + 4, z + topD * 0.2, topW * 0.24, 4, topD * 0.2, 0x9aa2a8);
  if (h > 150 && r4 > 0.6) o.add("deck", x, g + h + 9.0, z, topW * 0.42, 0.6, topD * 0.42, 0x60686e);
}

function midrise(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.MIDRISE, s + "w", x, z), roof = pickLocal(ROOFS.MIDRISE, s + "r", x, z, 1400);
  const r1 = rnd(s + "1"), r2 = rnd(s + "2");
  const plinth = 5 + r1 * 2.5;
  o.add("wall", x, g + plinth / 2, z, w * 1.04, plinth, d * 1.04, 0xcfc7b8);       // shopfronts
  const bodyH = pos(h - plinth, 4);
  if (r2 > 0.6) {                                                                  // stepped top floor
    const lo = bodyH * 0.78;
    o.add(glassBucket(h), x, g + plinth + lo / 2, z, w, lo, d, wall);
    o.add(glassBucket(h), x, g + plinth + lo + (bodyH - lo) / 2, z, w * 0.82, bodyH - lo, d * 0.82, wall);
  } else {
    o.add(glassBucket(h), x, g + plinth + bodyH / 2, z, w, bodyH, d, wall);
  }
  o.add("roof", x, g + h + 0.9, z, w * 1.06, 1.8, d * 1.06, roof);                 // cornice
  if (r1 > 0.35) o.add("metal", x + (r2 - 0.5) * w * 0.4, g + h + 3.4, z, w * 0.26, 3.2, d * 0.26, 0x9aa2a8);
}

/**
 * A perimeter block around a courtyard. On a wide plot a single solid slab reads
 * as a warehouse; four wings around a void is what most European and modern
 * mid-rise housing actually is, and the shadow it throws into its own courtyard
 * is unmistakable from above.
 */
function midriseCourtyard(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.MIDRISE, s + "w", x, z), roof = pickLocal(ROOFS.MIDRISE, s + "r", x, z, 1400);
  const t = Math.min(w, d) * 0.26;                      // wing depth
  const plinth = 5;
  o.add("wall", x, g + plinth / 2, z, w, plinth, d, 0xcfc7b8);
  const body = pos(h - plinth, 5), yc = g + plinth + body / 2;
  const gl = glassBucket(h);
  o.add(gl, x, yc, z - d / 2 + t / 2, w, body, t, wall);          // north wing
  o.add(gl, x, yc, z + d / 2 - t / 2, w, body, t, wall);          // south wing
  o.add(gl, x - w / 2 + t / 2, yc, z, t, body, d - 2 * t, wall);  // west wing
  o.add(gl, x + w / 2 - t / 2, yc, z, t, body, d - 2 * t, wall);  // east wing
  for (const [ox, oz, sw, sd] of [[0, -d / 2 + t / 2, w, t], [0, d / 2 - t / 2, w, t],
                                  [-w / 2 + t / 2, 0, t, d - 2 * t], [w / 2 - t / 2, 0, t, d - 2 * t]]) {
    o.add("roof", x + ox, g + h + 0.8, z + oz, sw * 1.03, 1.6, sd * 1.06, roof);
  }
  o.add("deck", x, g + 0.4, z, (w - 2 * t) * 0.9, 0.3, (d - 2 * t) * 0.9, 0x7fa860);   // the garden
}

/**
 * TERRACE — an actual street of houses, not a stamped brick.
 *
 * There are 5,665 terrace houses in this world. Emitting one monolithic box
 * per plot made a 25-metre-wide plot look like a factory shed with a shopfront.
 * Real terraces are built in narrow vertical bays (4.5 to 6.5 m wide), with
 * rhythmic stepping, subtle palette shifts, party-wall chimneys, projecting
 * bay windows, varied ground floors (some residential stoops, some shopfronts),
 * and mixed gables, parapets, and mansard dormers.
 */
function terrace(o, s, x, z, w, d, h, g) {
  // If the plot is wide enough for multiple terrace houses, divide it into bays
  const nUnits = w >= 7.5 ? Math.max(1, Math.min(5, Math.round(w / 5.2))) : 1;
  const bayW = w / nUnits;

  for (let i = 0; i < nUnits; i++) {
    const hx = x + (-0.5 + (i + 0.5) / nUnits) * w;
    const hs = s + "u" + i;
    const houseWall = pickLocal(WALLS.TERRACE, hs + "w", hx, z, 1100);
    const houseRoof = pickLocal(ROOFS.TERRACE, hs + "r", hx, z, 1400);
    const r1 = rnd(hs + "1"), r2 = rnd(hs + "2"), r3 = rnd(hs + "3");

    // Subtle height stepping along the street
    const stepH = pos(h + (rnd(hs + "j") - 0.5) * 0.9, 7);

    // Ground floor: 55% commercial shopfronts, 45% residential stoops
    const isShop = r1 < 0.55;
    if (isShop) {
      o.add("wall", hx, g + 2.1, z, bayW * 0.98, 4.2, d, 0xd8cdba); // shopfront fascia
      const bodyH = pos(stepH - 4.2, 2);
      o.add("wall", hx, g + 4.2 + bodyH / 2, z, bayW * 0.98, bodyH, d, houseWall);
      if (r3 > 0.45) o.add("roof", hx, g + 4.35, z + d * 0.52, bayW * 0.88, 0.4, 1.8, houseRoof); // awning
    } else {
      // Residential ground floor with entrance stoop
      o.add("deck", hx - bayW * 0.25, g + 0.3, z + d * 0.52, bayW * 0.32, 0.6, 0.8, 0xdcd4c2); // stoop steps
      o.add("wall", hx, g + stepH / 2, z, bayW * 0.98, stepH, d, houseWall);
      if (r3 > 0.4) o.add("roof", hx - bayW * 0.25, g + 2.8, z + d * 0.52, bayW * 0.34, 0.3, 0.7, houseRoof); // portico hood
    }

    // 40% of houses have a projecting 1 or 2 storey bay window
    if (r3 > 0.60) {
      const bH = isShop ? 3.8 : 6.0;
      const bY = isShop ? 4.2 : 0;
      o.add("wall", hx + bayW * 0.18, g + bY + bH / 2, z + d * 0.51, bayW * 0.36, bH, 0.75, houseWall);
      o.add("roof", hx + bayW * 0.18, g + bY + bH + 0.15, z + d * 0.51, bayW * 0.40, 0.3, 0.8, houseRoof);
    }

    // Roof form
    if (r2 < 0.38) {
      // Gable to the street
      o.add("pitch", hx, g + stepH, z, bayW * 1.01, bayW * 0.36, d * 1.02, houseRoof);
    } else if (r2 < 0.72) {
      // Parapet with cornice
      o.add("roof", hx, g + stepH + 0.5, z, bayW * 1.03, 1.0, d * 1.04, houseRoof);
    } else {
      // Mansard attic with dormer
      o.add("pitch", hx, g + stepH, z, bayW * 1.01, bayW * 0.22, d * 1.01, houseRoof);
      o.add("wall", hx, g + stepH + bayW * 0.22 + 0.8, z, bayW * 0.74, 1.6, d * 0.88, houseWall);
      o.add("pitch", hx, g + stepH + bayW * 0.22 + 1.6, z + d * 0.2, bayW * 0.36, 0.7, 1.3, houseRoof);
    }

    // Chimneys on party walls
    if (i > 0) {
      o.add("wall", x - w / 2 + i * bayW, g + stepH + 1.6, z - d * 0.18, 0.9, 2.4, 0.9, 0x8c7a68);
    } else if (r2 < 0.38) {
      o.add("wall", hx - bayW * 0.38, g + stepH + 1.4, z - d * 0.18, 0.9, 2.2, 0.9, 0x8c7a68);
    }
  }
}

/**
 * FIVE HOUSES, not one.
 *
 * Every townhouse in the world was the same box with the same hipped roof and
 * the same chimney on the same side. From the air a suburb of that reads as
 * printed wallpaper, and no amount of colour variation fixes a silhouette that
 * never changes. These are the shapes an actual street has: a plain hipped
 * house, a gable-end, an L with a wing, a flat-roofed modern one, and a
 * semi-detached pair sharing a party wall.
 */
function townhouse(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.TOWNHOUSE, s + "w", x, z), roof = pickLocal(ROOFS.TOWNHOUSE, s + "r", x, z, 1400);
  const r1 = rnd(s + "1"), r2 = rnd(s + "2"), r3 = rnd(s + "3");
  const form = r2 < 0.26 ? "hip" : r2 < 0.46 ? "gable" : r2 < 0.66 ? "ell"
             : r2 < 0.84 ? "flat" : "semi";

  if (form === "semi") {
    // a pair under one roof, with a party wall down the middle
    const hw = w * 0.47;
    for (const side of [-1, 1]) {
      o.add("wall", x + side * w * 0.25, g + h / 2, z, hw, h, d, wall);
      if (r1 > 0.4) o.add("roof", x + side * w * 0.25, g + 2.5, z + d * 0.52, hw * 0.4, 0.35, 1.2, roof); // porches
    }
    o.add("hip", x, g + h, z, w * 1.08, w * 0.26, d * 1.10, roof);
    o.add("wall", x, g + h + w * 0.26 + 1.0, z, 1.2, 2.8, 1.2, 0x8c7a68);
    return;
  }

  if (form === "ell") {
    const mw = w * 0.66, ww = w * 0.40;
    o.add("wall", x - w * 0.16, g + h / 2, z, mw, h, d, wall);
    o.add("hip", x - w * 0.16, g + h, z, mw * 1.12, mw * 0.30, d * 1.10, roof);
    const wh = h * 0.86;
    o.add("wall", x + w * 0.34, g + wh / 2, z + d * 0.18, ww, wh, d * 0.62, wall);
    o.add("pitch", x + w * 0.34, g + wh, z + d * 0.18, ww * 1.12, ww * 0.32, d * 0.66, roof);
    o.add("wall", x - w * 0.36, g + h + mw * 0.30 + 1.0, z, 1.2, 2.8, 1.2, 0x8c7a68);
    if (r1 > 0.4) o.add("wall", x + w * 0.34, g + 1.4, z + d * 0.54, ww * 0.85, 2.8, 1.2, wall); // garage
    return;
  }

  o.add("wall", x, g + h / 2, z, w, h, d, wall);
  if (form === "flat") {
    o.add("roof", x, g + h + 0.5, z, w * 1.06, 1.0, d * 1.06, roof);       // parapet
    if (r3 > 0.5) o.add("metal", x + w * 0.22, g + h + 2.0, z - d * 0.2, w * 0.3, 2.0, d * 0.3, 0x9aa2a8);
  } else if (form === "gable") {
    o.add("pitch", x, g + h, z, w * 1.06, w * 0.36, d * 1.04, roof);       // gable to the street
    // Front dormer
    if (r3 > 0.6) o.add("pitch", x, g + h + w * 0.2, z + d * 0.2, w * 0.32, 1.4, 2.0, roof);
  } else {
    o.add("hip", x, g + h, z, w * 1.10, w * 0.30, d * 1.10, roof);
  }
  if (form !== "flat") {
    o.add("wall", x - w * 0.28, g + h + w * 0.30 + 1.1, z, 1.3, 3.0, 1.3, 0x8c7a68);
  }
  // Canted/projecting front bay window
  if (r2 > 0.5 && form !== "flat") {
    o.add("wall", x + w * 0.2, g + 2.8, z + d * 0.52, w * 0.36, 4.6, 0.7, wall);
    o.add("roof", x + w * 0.2, g + 5.2, z + d * 0.52, w * 0.40, 0.3, 0.8, roof);
  }
  if (r1 > 0.5) o.add("roof", x - w * 0.2, g + 2.6, z + d * 0.5, w * 0.38, 0.4, 2.0, roof);  // porch canopy
  if (r3 > 0.72) o.add("wall", x + w * 0.36, g + 1.4, z + d * 0.34, w * 0.28, 2.8, d * 0.3, wall);  // garage
}

function villa(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.VILLA, s + "w", x, z), roof = pickLocal(ROOFS.VILLA, s + "r", x, z, 1400);
  const r1 = rnd(s + "1"), r2 = rnd(s + "2"), r3 = rnd(s + "3");
  // Some are flat-roofed moderns, some are courtyard houses, most are hipped.
  // One roof shape for every villa on the coast is what made the beach suburbs
  // read as a single repeated asset.
  if (r3 < 0.22) {
    o.add("wall", x, g + h / 2, z, w, h, d, wall);
    o.add("roof", x, g + h + 0.4, z, w * 1.08, 0.8, d * 1.08, roof);               // flat, deep overhang
    o.add("deck", x, g + 0.3, z + d * 0.42, w * 0.8, 0.25, d * 0.22, 0xd9cdb4);    // terrace
    if (r2 > 0.5) o.add("deck", x - w * 0.1, g + 0.35, z + d * 0.46, w * 0.5, 0.3, d * 0.26, 0x3fb5cc);
    // Pergola shading over terrace
    if (r1 > 0.4) o.add("roof", x + w * 0.2, g + 3.2, z + d * 0.44, w * 0.4, 0.2, d * 0.2, roof);
    return;
  }
  o.add("wall", x, g + h / 2, z, w, h, d, wall);
  o.add("hip", x, g + h, z, w * 1.16, w * 0.26, d * 1.16, roof);                   // deep eaves
  if (r1 > 0.45) {                                                                 // side wing
    const ww = w * 0.42, wh = h * 0.82;
    o.add("wall", x + w * 0.44, g + wh / 2, z - d * 0.2, ww, wh, d * 0.55, wall);
    o.add("hip", x + w * 0.44, g + wh, z - d * 0.2, ww * 1.18, ww * 0.26, d * 0.62, roof);
  }
  if (r2 > 0.68) o.add("deck", x - w * 0.1, g + 0.35, z + d * 0.46, w * 0.5, 0.3, d * 0.26, 0x3fb5cc);  // pool
  // Chimney stack
  if (r2 > 0.4) o.add("wall", x - w * 0.35, g + h + w * 0.26 + 0.8, z - d * 0.15, 1.1, 2.2, 1.1, 0x8c7a68);
}

function resort(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.RESORT, s + "w", x, z), roof = pickLocal(ROOFS.RESORT, s + "r", x, z, 1400);
  const r1 = rnd(s + "1"), r2 = rnd(s + "2");
  o.add("wall", x, g + 3.2, z, w * 1.14, 6.4, d * 1.14, 0xf2ece0);                 // lobby podium
  const bodyH = pos(h - 6.4, 4);
  if (r1 > 0.4) {                                                                  // ziggurat
    const t = bodyH / 3;
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.17;
      o.add(glassBucket(h), x, g + 6.4 + t * i + t / 2, z, w * k, t, d * k, wall);
      o.add("roof", x, g + 6.4 + t * (i + 1) + 0.4, z, w * k * 1.04, 0.8, d * k * 1.04, roof);
    }
  } else {
    o.add(glassBucket(h), x, g + 6.4 + bodyH / 2, z, w, bodyH, d, wall);
    o.add("roof", x, g + h + 0.7, z, w * 1.06, 1.4, d * 1.06, roof);
  }
  if (r2 > 0.55) o.add("deck", x, g + h + 1.6, z, w * 0.26, 0.4, d * 0.26, 0x4fa8bc);   // roof pool
  o.add("deck", x, g + 0.3, z + d * 0.74, w * 0.40, 0.25, d * 0.22, 0x59b0c4);          // ground pool
}

/**
 * CIVIC — 15 landmark institutions across the world.
 *
 * Rather than stamping 15 identical colonnaded boxes with either a dome or a
 * clock, each civic plot deterministically forms one of six monumental typologies:
 *   - cathedral: cruciform basilica with nave, transepts, twin towers and spires
 *   - station: grand rail terminus with colossal arched barrel shed and campanile
 *   - capitol: city hall / parliament with portico, drum, dome and lantern
 *   - library: national museum / library with peristyle colonnade and rotunda
 *   - opera: tiered performing arts hall with curved shell and soaring fly tower
 *   - courthouse: palace of justice with monumental rusticated base and pediment
 */
/**
 * The 12 CIVIC Landmark Typologies:
 *   1. capitol: city hall / parliament with portico, drum, dome and lantern
 *   2. cathedral: cruciform basilica, nave, transepts, crossing lantern, twin western towers
 *   3. station: grand rail terminus with colossal arched barrel shed and campanile clock tower
 *   4. library: national museum / library with peristyle colonnade, rotunda and corner pavilions
 *   5. opera: performing arts hall with tiered curved shell and soaring fly tower
 *   6. courthouse: palace of justice with monumental rusticated base, hexastyle portico and pediment
 *   7. hospital: municipal medical center with emergency ramp, ward blocks, rooftop helipad
 *   8. university: collegiate hall with quadrangle cloisters and crenellated clock tower
 *   9. theatre: civic playhouse with marquee entrance, auditorium block, stage fly tower
 *  10. art-gallery: modern sculpture pavilion with cantilevered galleries and sawtooth skylights
 *  11. market-hall: historic covered market with triple arcades and raised glazed clerestory
 *  12. stadium: municipal arena with tiered oval bowl and cantilevered canopy roof
 */
export const CIVIC_TYPOLOGIES = [
  "capitol", "cathedral", "station", "library", "opera", "courthouse",
  "hospital", "university", "theatre", "art-gallery", "market-hall", "stadium"
];

function civic(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.CIVIC, s + "w", x, z), roof = pickLocal(ROOFS.CIVIC, s + "r", x, z, 1400);
  const rTyp = rnd(s + "typ");
  const typIdx = Math.floor(rTyp * CIVIC_TYPOLOGIES.length) % CIVIC_TYPOLOGIES.length;
  const typ = CIVIC_TYPOLOGIES[typIdx];

  // Stepped monumental stylobate approach
  o.add("wall", x, g + 1.2, z, w * 1.08, 2.4, d * 1.08, 0xdcd4c2);

  if (typ === "cathedral") {
    // Cruciform basilica: Latin cross nave running length/depth, transepts, twin towers
    const naveW = w * 0.44, naveD = d * 0.88;
    const bodyH = pos(h * 0.75, 14);
    o.add("wall", x, g + 2.4 + bodyH / 2, z, naveW, bodyH, naveD, wall);
    o.add("barrel", x, g + 2.4 + bodyH, z, naveW * 1.02, bodyH * 0.4, naveD * 1.01, roof);
    const transW = w * 0.92, transD = d * 0.32;
    o.add("wall", x, g + 2.4 + bodyH * 0.42, z, transW, bodyH * 0.84, transD, wall);
    o.add("pitch", x, g + 2.4 + bodyH * 0.84, z, transW * 1.02, bodyH * 0.32, transD * 1.02, roof);
    o.add("pyr", x, g + 2.4 + bodyH * 1.25 + 7, z, 4.2, 14, 4.2, roof);
    const tW = w * 0.22, tD = d * 0.22;
    const towerH = bodyH * 1.35;
    for (const side of [-1, 1]) {
      const tx = x + side * (naveW / 2 - tW / 2);
      const tz = z + naveD / 2 - tD / 2;
      o.add("wall", tx, g + 2.4 + towerH / 2, tz, tW, towerH, tD, wall);
      o.add("roof", tx, g + 2.4 + towerH + 0.6, tz, tW * 1.06, 1.2, tD * 1.06, roof);
      o.add("pyr", tx, g + 2.4 + towerH + 1.2 + 8, tz, tW * 0.9, 16, tD * 0.9, roof);
    }
  } else if (typ === "station") {
    // Grand rail terminus: arched barrel concourse shed + headhouse + clock tower
    const headD = d * 0.32;
    const headH = pos(h * 0.68, 12);
    o.add("wall", x, g + 2.4 + headH / 2, z + d / 2 - headD / 2, w * 0.96, headH, headD, wall);
    o.add("roof", x, g + 2.4 + headH + 0.8, z + d / 2 - headD / 2, w * 0.98, 1.6, headD * 1.04, roof);
    const cols = Math.max(4, Math.min(10, Math.round(w / 12)));
    for (let i = 0; i < cols; i++) {
      const cx = x + (-0.5 + (i + 0.5) / cols) * w * 0.88;
      o.add("cyl", cx, g + 2.4 + (headH * 0.6) / 2, z + d / 2 + 1.2, 2.2, headH * 0.6, 2.2, 0xf6f1e4);
    }
    const shedD = d * 0.62;
    const shedH = pos(h * 0.72, 14);
    o.add("wall", x, g + 2.4 + shedH * 0.25, z - d / 2 + shedD / 2, w * 0.86, shedH * 0.5, shedD, 0xb8c2c8);
    o.add("barrel", x, g + 2.4 + shedH * 0.5, z - d / 2 + shedD / 2, w * 0.90, shedH * 0.75, shedD * 1.01, roof);
    const cW = Math.min(12, w * 0.16);
    const cH = headH + 20;
    const cX = x - w * 0.42;
    const cZ = z + d / 2 - headD / 2;
    o.add("wall", cX, g + 2.4 + cH / 2, cZ, cW, cH, cW, wall);
    o.add("roof", cX, g + 2.4 + cH + 0.6, cZ, cW * 1.08, 1.2, cW * 1.08, roof);
    o.add("pyr", cX, g + 2.4 + cH + 1.2 + 5, cZ, cW * 0.95, 10, cW * 0.95, roof);
  } else if (typ === "capitol") {
    // City Hall / Capitol: central rotunda with monumental dome, portico, side pavilion wings
    const bodyH = pos(h * 0.65, 12);
    const wingW = w * 0.36, wingD = d * 0.82;
    for (const side of [-1, 1]) {
      const wx = x + side * (w / 2 - wingW / 2);
      o.add("wall", wx, g + 2.4 + bodyH / 2, z, wingW, bodyH, wingD, wall);
      o.add("hip", wx, g + 2.4 + bodyH, z, wingW * 1.06, wingW * 0.24, wingD * 1.06, roof);
    }
    const coreW = w * 0.38, coreD = d * 0.88;
    o.add("wall", x, g + 2.4 + (bodyH + 3) / 2, z, coreW, bodyH + 3, coreD, wall);
    o.add("pitch", x, g + 2.4 + bodyH + 3.2, z + coreD / 2 - 2, coreW * 0.92, 5.5, 4.5, roof);
    for (const px of [-coreW * 0.32, -coreW * 0.11, coreW * 0.11, coreW * 0.32]) {
      o.add("cyl", x + px, g + 2.4 + (bodyH + 2) / 2, z + coreD / 2, 1.8, bodyH + 2, 1.8, 0xf6f1e4);
    }
    const drumR = coreW * 0.32;
    const drumH = 6;
    o.add("cyl", x, g + 2.4 + bodyH + 3 + drumH / 2, z, drumR * 2, drumH, drumR * 2, wall);
    const domeH = coreW * 0.26;
    o.add("dome", x, g + 2.4 + bodyH + 3 + drumH, z, drumR * 1.95, domeH, drumR * 1.95, roof);
    o.add("cyl", x, g + 2.4 + bodyH + 3 + drumH + domeH + 2, z, 2.0, 4.0, 2.0, 0xe4c96a);
  } else if (typ === "library") {
    // Grand Museum / National Library: peristyle colonnade, rotunda atrium, corner pavilions
    const bodyH = pos(h * 0.62, 11);
    o.add("wall", x, g + 2.4 + bodyH / 2, z, w * 0.96, bodyH, d * 0.86, wall);
    o.add("roof", x, g + 2.4 + bodyH + 0.8, z, w * 0.98, 1.6, d * 0.88, roof);
    const cols = Math.max(6, Math.min(14, Math.round(w / 8)));
    for (let i = 0; i < cols; i++) {
      const cx = x + (-0.5 + (i + 0.5) / cols) * w * 0.86;
      o.add("cyl", cx, g + 2.4 + (bodyH * 0.72) / 2, z + d * 0.44, 1.8, bodyH * 0.72, 1.8, 0xf6f1e4);
    }
    o.add("roof", x, g + 2.4 + bodyH * 0.72 + 1.2, z + d * 0.44, w * 0.90, 1.4, 4.0, roof);
    const rotR = Math.min(w, d) * 0.28;
    o.add("dome", x, g + 2.4 + bodyH + 1.6, z, rotR * 2, rotR * 0.8, rotR * 2, roof);
    for (const sx of [-1, 1]) {
      const px = x + sx * (w * 0.44);
      o.add("wall", px, g + 2.4 + (bodyH + 4) / 2, z, w * 0.16, bodyH + 4, d * 0.88, wall);
      o.add("hip", px, g + 2.4 + bodyH + 4, z, w * 0.18, 3.2, d * 0.92, roof);
    }
  } else if (typ === "opera") {
    // Grand Opera / Concert Hall: tiered sculpted massing with auditorium shell & fly tower
    const bodyH = pos(h * 0.64, 12);
    o.add(glassBucket(h), x, g + 2.4 + 4, z + d * 0.25, w * 0.92, 8, d * 0.46, wall);
    o.add("roof", x, g + 2.4 + 8.4, z + d * 0.25, w * 0.96, 1.2, d * 0.50, roof);
    const hallW = w * 0.72, hallD = d * 0.60;
    o.add("wall", x, g + 2.4 + bodyH / 2, z - d * 0.05, hallW, bodyH, hallD, wall);
    o.add("barrel", x, g + 2.4 + bodyH, z - d * 0.05, hallW * 1.02, bodyH * 0.4, hallD * 1.01, roof);
    const flyW = hallW * 0.75, flyD = d * 0.28;
    const flyH = bodyH + 14;
    o.add("wall", x, g + 2.4 + flyH / 2, z - d * 0.34, flyW, flyH, flyD, wall);
    o.add("roof", x, g + 2.4 + flyH + 0.8, z - d * 0.34, flyW * 1.04, 1.6, flyD * 1.04, roof);
  } else if (typ === "courthouse") {
    // Courthouse / Palace of Justice: rusticated base, monumental portico, pediment, symmetric wings
    const bodyH = pos(h * 0.66, 12);
    o.add("wall", x, g + 2.4 + bodyH / 2, z, w * 0.92, bodyH, d * 0.84, wall);
    o.add("roof", x, g + 2.4 + bodyH + 0.8, z, w * 0.94, 1.6, d * 0.86, roof);
    const portW = w * 0.48, portD = d * 0.20;
    o.add("pitch", x, g + 2.4 + bodyH + 1.6, z + d * 0.38, portW * 1.04, 5.0, portD * 1.1, roof);
    for (const px of [-portW * 0.38, -portW * 0.22, -portW * 0.07, portW * 0.07, portW * 0.22, portW * 0.38]) {
      o.add("cyl", x + px, g + 2.4 + (bodyH * 0.78) / 2, z + d * 0.42, 1.6, bodyH * 0.78, 1.6, 0xf6f1e4);
    }
    for (const sx of [-1, 1]) {
      const px = x + sx * (w * 0.38);
      o.add("wall", px, g + 2.4 + (bodyH + 2) / 2, z, w * 0.22, bodyH + 2, d * 0.86, wall);
      o.add("hip", px, g + 2.4 + bodyH + 2, z, w * 0.24, 3.5, d * 0.90, roof);
    }
  } else if (typ === "hospital") {
    // General Hospital: podium, emergency ambulance ramp, paired ward towers, rooftop helipad
    const podH = 6.0;
    o.add("wall", x, g + 2.4 + podH / 2, z, w * 0.96, podH, d * 0.90, wall);
    o.add("roof", x, g + 2.4 + podH + 0.4, z, w * 0.98, 0.8, d * 0.92, roof);
    // Paired ward blocks
    const wardW = w * 0.38, wardD = d * 0.75, wardH = pos(h * 0.78, 16);
    for (const side of [-1, 1]) {
      const wx = x + side * (w * 0.26);
      o.add("wall", wx, g + 2.4 + podH + wardH / 2, z, wardW, wardH, wardD, wall);
      o.add("roof", wx, g + 2.4 + podH + wardH + 0.6, z, wardW * 1.02, 1.2, wardD * 1.02, roof);
    }
    // Rooftop Helipad on east tower
    const hx = x + w * 0.26, hy = g + 2.4 + podH + wardH + 1.2;
    o.add("cyl", hx, hy + 0.4, z, 14, 0.8, 14, 0x4a5568);
    o.add("cyl", hx, hy + 0.85, z, 12, 0.1, 12, 0xe2e8f0);
  } else if (typ === "university") {
    // University Main Hall: quadrangle cloisters, central gothic clock tower, gabled hall wings
    const bodyH = pos(h * 0.60, 12);
    // Quadrangle wings around central courtyard
    const wingW = w * 0.22, wingD = d * 0.88;
    for (const side of [-1, 1]) {
      const wx = x + side * (w / 2 - wingW / 2);
      o.add("wall", wx, g + 2.4 + bodyH / 2, z, wingW, bodyH, wingD, wall);
      o.add("pitch", wx, g + 2.4 + bodyH, z, wingW * 1.04, wingW * 0.45, wingD * 1.01, roof);
    }
    // Front and rear cloisters
    o.add("wall", x, g + 2.4 + bodyH * 0.45, z + d * 0.38, w * 0.6, bodyH * 0.9, d * 0.18, wall);
    o.add("pitch", x, g + 2.4 + bodyH * 0.9, z + d * 0.38, w * 0.62, 4.0, d * 0.2, roof);
    // Central Collegiate Gothic Tower
    const towW = Math.min(16, w * 0.28), towH = bodyH + 22;
    o.add("wall", x, g + 2.4 + towH / 2, z + d * 0.38, towW, towH, towW, wall);
    o.add("roof", x, g + 2.4 + towH + 0.8, z + d * 0.38, towW * 1.08, 1.6, towW * 1.08, roof);
    // Crenellations
    for (const cx of [-towW * 0.4, towW * 0.4]) {
      for (const cz of [-towW * 0.4, towW * 0.4]) {
        o.add("pyr", x + cx, g + 2.4 + towH + 1.6 + 3, z + d * 0.38 + cz, 2.4, 6, 2.4, roof);
      }
    }
  } else if (typ === "theatre") {
    // Civic Playhouse / Theatre: decorative marquee canopy, auditorium block, stage house
    const bodyH = pos(h * 0.62, 12);
    o.add("wall", x, g + 2.4 + bodyH / 2, z, w * 0.88, bodyH, d * 0.84, wall);
    o.add("hip", x, g + 2.4 + bodyH, z, w * 0.92, 4.0, d * 0.88, roof);
    // Cantilevered illuminated entrance marquee
    o.add("roof", x, g + 2.4 + 4.5, z + d * 0.46, w * 0.65, 0.8, 6.0, 0xd97706);
    // Tall rear stage fly tower
    const flyW = w * 0.58, flyD = d * 0.32, flyH = bodyH + 12;
    o.add("wall", x, g + 2.4 + flyH / 2, z - d * 0.28, flyW, flyH, flyD, wall);
    o.add("roof", x, g + 2.4 + flyH + 0.6, z - d * 0.28, flyW * 1.04, 1.2, flyD * 1.04, roof);
  } else if (typ === "art-gallery") {
    // Modern Art Gallery: stepped cantilevered modernist blocks, north-light sawtooth skylights
    const bodyH = pos(h * 0.55, 10);
    o.add("wall", x, g + 2.4 + bodyH / 2, z, w * 0.92, bodyH, d * 0.88, 0xf1f5f9);
    // Upper cantilevered gallery block rotated/shifted
    const upW = w * 0.78, upD = d * 0.72, upH = bodyH * 0.65;
    o.add("wall", x + w * 0.08, g + 2.4 + bodyH + upH / 2, z - d * 0.06, upW, upH, upD, 0xe2e8f0);
    // Sawtooth skylight roofs
    const bays = 4;
    const bd = upD / bays;
    for (let i = 0; i < bays; i++) {
      o.add("pitch", x + w * 0.08, g + 2.4 + bodyH + upH, z - d * 0.06 + (-0.5 + (i + 0.5) / bays) * upD, upW * 0.96, bd * 0.6, bd * 0.9, roof);
    }
  } else if (typ === "market-hall") {
    // Historic Covered Market: triple longitudinal brick/iron arcades with raised clerestory
    const bodyH = pos(h * 0.58, 10);
    // Main hall
    o.add("wall", x, g + 2.4 + bodyH / 2, z, w * 0.94, bodyH, d * 0.92, wall);
    o.add("pitch", x, g + 2.4 + bodyH, z, w * 0.96, w * 0.25, d * 0.94, roof);
    // Raised central clerestory lantern ridge
    const clerW = w * 0.38, clerH = 4.0;
    o.add(glassBucket(h), x, g + 2.4 + bodyH + w * 0.25 + clerH / 2, z, clerW, clerH, d * 0.88, wall);
    o.add("pitch", x, g + 2.4 + bodyH + w * 0.25 + clerH, z, clerW * 1.05, 2.5, d * 0.90, roof);
  } else {
    // Stadium / Municipal Arena: monumental oval bowl with cantilevered roof canopy
    const bowlH = pos(h * 0.70, 14);
    o.add("cyl", x, g + 2.4 + bowlH / 2, z, w * 0.95, bowlH, d * 0.95, 0x94a3b8);
    // Cantilevered oval canopy roof with open pitch center
    o.add("cyl", x, g + 2.4 + bowlH + 2.0, z, w * 1.02, 3.0, d * 1.02, roof);
    // Four corner pylon floodlight masts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = x + sx * (w * 0.46);
        const pz = z + sz * (d * 0.46);
        o.add("cyl", px, g + 2.4 + (bowlH + 20) / 2, pz, 2.4, bowlH + 20, 2.4, 0x64748b);
        o.add("roof", px, g + 2.4 + bowlH + 20 + 1, pz, 6.0, 1.5, 6.0, 0xf8fafc);
      }
    }
  }
}

function warehouse(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.WAREHOUSE, s + "w", x, z), roof = pickLocal(ROOFS.WAREHOUSE, s + "r", x, z, 1400);
  o.add("wall", x, g + h / 2, z, w, h, d, wall);
  // sawtooth north-light roof: the shape that says "shed" from any distance
  const bays = Math.max(3, Math.min(7, Math.round(d / 16)));
  const bd = d / bays;
  for (let i = 0; i < bays; i++) {
    o.add("pitch", x, g + h, z + (-0.5 + (i + 0.5) / bays) * d, w * 1.02, bd * 0.55, bd * 0.96, roof);
  }
  o.add("roof", x, g + 4.2, z + d * 0.54, w * 0.86, 0.5, 3.0, roof);               // loading canopy
}

function farm(o, s, x, z, w, d, h, g) {
  const roof = pickLocal(ROOFS.FARM, s + "r", x, z, 2200), wall = pickLocal(WALLS.FARM, s + "w", x, z, 2200);
  // A FARM plot is a field, not a building: one steading in a corner of it.
  const bx = x - w * 0.30, bz = z - d * 0.28;
  const bw = Math.min(34, w * 0.20), bd = Math.min(20, d * 0.20);
  o.add("wall", bx, g + h / 2, bz, bw, h, bd, 0xa8483a);                            // barn
  o.add("pitch", bx, g + h, bz, bw * 1.06, bw * 0.44, bd * 1.04, roof);
  o.add("wall", bx + bw * 1.3, g + h * 0.42, bz + bd * 0.6, bw * 0.6, h * 0.84, bd * 0.7, wall);   // farmhouse
  o.add("hip", bx + bw * 1.3, g + h * 0.84, bz + bd * 0.6, bw * 0.68, bw * 0.24, bd * 0.78, roof);
  for (let i = 0; i < 2; i++) {                                                     // silos
    const sx = bx - bw * (0.75 + i * 0.34);
    o.add("cyl", sx, g + 7.5, bz, 6.4, 15, 6.4, 0xd8d2c4);
    o.add("cone", sx, g + 15 + 2.1, bz, 6.8, 4.2, 6.8, 0x8f9aa2);
  }
}

function hangar(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.HANGAR, s + "w", x, z), roof = pickLocal(ROOFS.HANGAR, s + "r", x, z, 1400);
  o.add("wall", x, g + h * 0.4, z, w, h * 0.8, d, wall);
  o.add("barrel", x, g + h * 0.8, z, w * 1.02, h * 0.55, d * 1.0, roof);            // curved roof
}

/** Wide, deep mid-rise plots become perimeter blocks; the rest stay slabs. */
function midriseAny(o, s, x, z, w, d, h, g) {
  if (w > 30 && d > 30 && rnd(s + "cy") > 0.45) return midriseCourtyard(o, s, x, z, w, d, h, g);
  return midrise(o, s, x, z, w, d, h, g);
}

const ARCHETYPE = {
  TOWER: tower, MIDRISE: midriseAny, TERRACE: terrace, TOWNHOUSE: townhouse,
  VILLA: villa, RESORT: resort, CIVIC: civic, WAREHOUSE: warehouse,
  FARM: farm, HANGAR: hangar,
};

/**
 * Emit one building. `g` is the ground height under it, `gRange` how much the
 * ground varies across the footprint -- on a slope the building gets a plinth
 * so it sits IN the hill rather than hovering over the downhill corner.
 */
export function emitBuilding(o, cls, id, x, z, w, d, h, g, gRange = 0, foot = null) {
  const fn = ARCHETYPE[cls];
  if (!fn || h <= 0) return false;
  // Per-building spread ON TOP of the district's centrality curve. Centrality
  // alone made every block a plateau of near-identical heights -- a slab, not a
  // neighbourhood. Real streets step up and down by a storey or three.
  //
  // Clamped to the class minimum AFTER the jitter, not before: applying the
  // floor first and then multiplying by as little as 0.74 is what let a terrace
  // come out 2.96 m tall, and a terrace subtracts a 4.4 m shopfront band from
  // its own height.
  h = Math.max(MIN_HEIGHT[cls] || 4, h * (0.74 + rnd(id + "jit") * 0.62));
  // AND CLAMPED TO THE CLASS CEILING AFTER THE JITTER TOO.
  //
  // city-render.js applies PLOT_CLASSES[cls].maxHeight and then hands the result
  // here, where this line multiplies it by up to 1.36. So the cap was enforced,
  // then broken, in that order. Measured over the world: 1,362 of 19,105 placed
  // buildings finished above their own class limit, worst 1.358x -- a terrace at
  // 24.4 m against an 18 m cap.
  //
  // That matters beyond the look of it. The cap is published in the city summary
  // the pipeline is grounded on ("terrace up to 18 m, ... tower up to 220 m"),
  // so a plan reasoning about what will fit was reading a constraint the
  // renderer did not keep. The floor is applied first and the ceiling last,
  // because a minimum that a ceiling can undo is not a minimum.
  const ceil = PLOT_CLASSES[cls] && PLOT_CLASSES[cls].maxHeight;
  if (ceil) h = Math.min(h, ceil);
  // FOUNDATIONS THAT MATCH THE GROUND.
  //
  // This was one branch: over 0.9 m of range, wrap the base in a grey box. That
  // is a wall, not a foundation, and it treated a gentle rise and a two-storey
  // drop identically. footprint.js now classifies the ground and this builds
  // what it asked for.
  if (foot && foot.verdict === "terrace") {
    // THE TERRACE USED TO BURY THE BUILDING IT WAS HOLDING UP.
    //
    // The steps were all centred on the same x, z at roughly full plot width,
    // so they were not steps down a slope -- they were concentric boxes stacked
    // vertically, each one 2-4% WIDER than the building. The stack's top landed
    // at base + rise*(steps-1) + 1.2 while the building body was placed at
    // `g`, which is foot.base: the LOWEST sample.
    //
    // Measured over the real world: 367 plots get this verdict, and on 54 of
    // them the grey retaining stack stood taller than the whole building, worst
    // ratio 1.80x. On the rest it rose above the ground floor. From outside, a
    // terraced house on a slope read as a concrete block with a roof on it.
    //
    // Two changes. The steps now DESCEND from the building's own base rather
    // than climbing past it, which is what a retaining structure does -- it
    // holds the ground below the pad, not the air above it. And each step is
    // inset rather than proportionally wider, so the building sits on the stack
    // instead of inside it. The body is raised to the pad in city-render.js,
    // where `g` is chosen.
    const rise = foot.range / foot.steps;
    const pad = foot.base + foot.range;          // the finished floor level
    for (let i = 0; i < foot.steps; i++) {
      const frac = i / Math.max(1, foot.steps - 1);   // 0 at the pad, 1 at the toe
      const top = pad - rise * i;
      o.add("wall", x, top - rise / 2 - 0.2, z,
            w * (0.98 - 0.04 * frac), rise + 0.8, d * (0.98 - 0.04 * frac), 0x9d9384);
    }
  } else if (foot && foot.verdict === "plinth") {
    // Base carried down to the footprint's lowest point and cut into the uphill
    // side, so nothing overhangs and the building sits IN the slope.
    const cut = foot.cut + 2;
    o.add("wall", x, g - cut / 2 + 0.4, z, w * 1.02, cut + 3, d * 1.02, 0x9d9384);
  } else if (!foot && gRange > 0.9) {
    const cut = gRange + 2;                       // legacy callers without an assessment
    o.add("wall", x, g - cut / 2 + 0.4, z, w * 1.02, cut + 3, d * 1.02, 0x9d9384);
  }
  fn(o, id, x, z, w, d, h, g);
  return true;
}

export { pick };


// =============================================================================
// PARAMETERISED BUILDING GENERATORS (Standing Charter Section 2)
// =============================================================================

function mergeGeometries(geoms, T = THREE) {
  const clean = geoms.filter(Boolean);
  if (clean.length === 0) return new T.BufferGeometry();
  if (clean.length === 1) return clean[0];

  let totalPositions = 0;
  let totalIndices = 0;

  for (const g of clean) {
    totalPositions += g.attributes.position.count;
    if (g.index) totalIndices += g.index.count;
    else totalIndices += g.attributes.position.count;
  }

  const posArray = new Float32Array(totalPositions * 3);
  const normArray = new Float32Array(totalPositions * 3);
  const indexArray = new Uint32Array(totalIndices);

  let posOffset = 0;
  let indexOffset = 0;
  let vertOffset = 0;

  for (const g of clean) {
    const p = g.attributes.position;
    posArray.set(p.array, posOffset * 3);

    if (g.attributes.normal) {
      normArray.set(g.attributes.normal.array, posOffset * 3);
    }

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indexArray[indexOffset + i] = g.index.array[i] + vertOffset;
      }
      indexOffset += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) {
        indexArray[indexOffset + i] = i + vertOffset;
      }
      indexOffset += p.count;
    }

    vertOffset += p.count;
    posOffset += p.count;
  }

  const merged = new T.BufferGeometry();
  merged.setAttribute("position", new T.BufferAttribute(posArray, 3));
  merged.setAttribute("normal", new T.BufferAttribute(normArray, 3));
  merged.setIndex(new T.BufferAttribute(indexArray, 1));
  return merged;
}

/**
 * 1. BLD-VILLA (2x2 to 4x4 cells = 16x16m to 32x32m, 1-2 storeys = 4-8m)
 * Axes: roof (gable, hip, mansard, flat), porch, garage (attached/detached/none),
 * bay window, dormers, chimney, wall material.
 */
export function bldVilla(seed = "villa-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6"), r7 = rnd(seed + "7"), r8 = rnd(seed + "8");

  const cellW = 2 + Math.floor(r1 * 3); // 2, 3, 4 cells (16, 24, 32m)
  const cellD = 2 + Math.floor(r2 * 3); // 2, 3, 4 cells (16, 24, 32m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = r3 < 0.4 ? 1 : 2;
  const bodyH = storeys * 4;

  const roofStyle = r4 < 0.30 ? "gable" : r4 < 0.55 ? "hip" : r4 < 0.80 ? "mansard" : "flat";
  const hasPorch = r5 > 0.25;
  const garageType = r6 < 0.30 ? "none" : r6 < 0.65 ? "attached" : "detached";
  const hasBay = r7 > 0.35;
  const hasDormers = storeys === 2 && r8 > 0.4;
  const hasChimney = r1 > 0.20;

  const roofH = roofStyle === "flat" ? 0.8 : roofStyle === "mansard" ? 3.2 : 4.2;
  const totalH = +(bodyH + roofH + (hasChimney ? 1.2 : 0)).toFixed(2);

  const wallCol = WALLS.VILLA[Math.floor(r1 * WALLS.VILLA.length)];
  const roofCol = ROOFS.VILLA[Math.floor(r2 * ROOFS.VILLA.length)];

  return {
    id: `bld-villa-${seed}`,
    typology: "bld-villa",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys, roofStyle, hasPorch, garageType, hasBay, hasDormers, hasChimney },
    lod: [
      {
        level: 0,
        tris: 360,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.82;
          const bD = footD * 0.78;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(0, bodyH / 2, 0);
          parts.push(body);

          if (roofStyle === "gable") {
            const roof = new T.ConeGeometry(bW * 0.65, roofH, 4);
            roof.rotateY(Math.PI / 4);
            roof.translate(0, bodyH + roofH / 2, 0);
            parts.push(roof);
          } else if (roofStyle === "hip") {
            const roof = new T.ConeGeometry(bW * 0.62, roofH, 4);
            roof.rotateY(Math.PI / 4);
            roof.scale(1, 1, bD / bW);
            roof.translate(0, bodyH + roofH / 2, 0);
            parts.push(roof);
          } else if (roofStyle === "mansard") {
            const lower = new T.BoxGeometry(bW * 1.04, roofH * 0.65, bD * 1.04);
            lower.translate(0, bodyH + roofH * 0.325, 0);
            const upper = new T.BoxGeometry(bW * 0.85, roofH * 0.35, bD * 0.85);
            upper.translate(0, bodyH + roofH * 0.825, 0);
            parts.push(lower, upper);
          } else {
            const parapet = new T.BoxGeometry(bW * 1.02, 0.8, bD * 1.02);
            parapet.translate(0, bodyH + 0.4, 0);
            parts.push(parapet);
          }

          if (hasPorch) {
            const pW = 4.0, pD = 2.4, pH = 3.2;
            const porchFloor = new T.BoxGeometry(pW, 0.3, pD);
            porchFloor.translate(0, 0.15, bD / 2 + pD / 2);
            const porchRoof = new T.BoxGeometry(pW * 1.1, 0.3, pD * 1.1);
            porchRoof.translate(0, pH, bD / 2 + pD / 2);
            parts.push(porchFloor, porchRoof);
          }

          if (garageType === "attached") {
            const gW = 6.0, gD = 6.5, gH = 3.5;
            const garage = new T.BoxGeometry(gW, gH, gD);
            garage.translate(bW / 2 + gW / 2 - 0.5, gH / 2, 0);
            parts.push(garage);
          } else if (garageType === "detached") {
            const gW = 5.5, gD = 6.0, gH = 3.2;
            const garage = new T.BoxGeometry(gW, gH, gD);
            garage.translate(-footW / 2 + gW / 2 + 0.5, gH / 2, -footD / 2 + gD / 2 + 0.5);
            parts.push(garage);
          }

          if (hasBay) {
            const bay = new T.BoxGeometry(3.2, bodyH * 0.85, 1.2);
            bay.translate(-bW * 0.25, bodyH * 0.45, bD / 2 + 0.6);
            parts.push(bay);
          }

          if (hasDormers) {
            for (const dx of [-bW * 0.25, bW * 0.25]) {
              const dormer = new T.BoxGeometry(1.6, 1.6, 1.8);
              dormer.translate(dx, bodyH + 1.2, bD * 0.35);
              parts.push(dormer);
            }
          }

          if (hasChimney) {
            const chim = new T.BoxGeometry(1.2, bodyH + roofH + 1.2, 1.2);
            chim.translate(bW * 0.35, (bodyH + roofH + 1.2) / 2, -bD * 0.2);
            parts.push(chim);
          }

          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 48,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.85, bodyH, footD * 0.8);
          body.translate(0, bodyH / 2, 0);
          const roof = new T.BoxGeometry(footW * 0.9, roofH, footD * 0.85);
          roof.translate(0, bodyH + roofH / 2, 0);
          return mergeGeometries([body, roof], T);
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.9, totalH, footD * 0.85);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 2. BLD-TERRACE (1x3 cells repeating unit = 8x24m per unit x N units, 2-3 storeys = 8-12m)
 * Axes: party-wall unit repeated N times (2..6); door position, window rhythm,
 * parapet vs pitched, basement area lightwell, string course, dormers.
 */
export function bldTerrace(seed = "terrace-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const units = 2 + Math.floor(r1 * 5); // 2, 3, 4, 5, 6 units (16, 24, 32, 40, 48m)
  const footW = units * 8;
  const footD = 24;

  const storeys = r2 < 0.45 ? 2 : 3;
  const bodyH = storeys * 4; // 8m or 12m
  const roofType = r3 < 0.40 ? "parapet" : r3 < 0.75 ? "pitched" : "mansard";
  const roofH = roofType === "parapet" ? 1.0 : roofType === "mansard" ? 3.0 : 3.6;
  const totalH = +(bodyH + roofH + 1.2).toFixed(2);

  const hasBasement = r4 > 0.35;
  const hasStringCourse = r5 > 0.25;
  const hasDormers = roofType !== "parapet" && r6 > 0.4;

  const wallCol = WALLS.TERRACE[Math.floor(r1 * WALLS.TERRACE.length)];
  const roofCol = ROOFS.TERRACE[Math.floor(r2 * ROOFS.TERRACE.length)];

  return {
    id: `bld-terrace-${seed}`,
    typology: "bld-terrace",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { units, storeys, roofType, hasBasement, hasStringCourse, hasDormers },
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: () => {
          const parts = [];
          const uW = 7.6;
          const uD = 20.0;
          for (let i = 0; i < units; i++) {
            const ux = -footW / 2 + 4 + i * 8;
            const unitBody = new T.BoxGeometry(uW, bodyH, uD);
            unitBody.translate(ux, bodyH / 2, 0);
            parts.push(unitBody);

            // Party wall chimney stack
            const chim = new T.BoxGeometry(0.6, bodyH + roofH + 1.2, 1.2);
            chim.translate(ux + 3.4, (bodyH + roofH + 1.2) / 2, 0);
            parts.push(chim);

            // Front door entrance stoop steps
            const doorSide = (i + Math.floor(r4 * 2)) % 2 === 0 ? -2.2 : 2.2;
            const stoop = new T.BoxGeometry(1.8, 0.6, 1.5);
            stoop.translate(ux + doorSide, 0.3, uD / 2 + 0.75);
            parts.push(stoop);

            // Basement area lightwell well
            if (hasBasement) {
              const well = new T.BoxGeometry(3.0, 0.4, 1.2);
              well.translate(ux - doorSide, 0.2, uD / 2 + 0.6);
              parts.push(well);
            }

            // String course architectural horizontal banding
            if (hasStringCourse) {
              const stringCourse = new T.BoxGeometry(uW, 0.25, uD * 1.02);
              stringCourse.translate(ux, 4.0, 0);
              parts.push(stringCourse);
            }

            // Unit dormers
            if (hasDormers) {
              const dorm = new T.BoxGeometry(1.4, 1.4, 1.6);
              dorm.translate(ux, bodyH + 1.0, uD * 0.35);
              parts.push(dorm);
            }
          }

          if (roofType === "parapet") {
            const par = new T.BoxGeometry(footW * 0.98, 1.0, uD * 1.02);
            par.translate(0, bodyH + 0.5, 0);
            parts.push(par);
          } else if (roofType === "mansard") {
            const lower = new T.BoxGeometry(footW * 1.02, roofH * 0.65, uD * 1.02);
            lower.translate(0, bodyH + roofH * 0.325, 0);
            const upper = new T.BoxGeometry(footW * 0.88, roofH * 0.35, uD * 0.88);
            upper.translate(0, bodyH + roofH * 0.825, 0);
            parts.push(lower, upper);
          } else {
            const pitched = new T.BoxGeometry(footW, roofH, uD * 0.9);
            pitched.translate(0, bodyH + roofH / 2, 0);
            parts.push(pitched);
          }
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 64,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW, bodyH, 20);
          body.translate(0, bodyH / 2, 0);
          const roof = new T.BoxGeometry(footW, roofH, 20);
          roof.translate(0, bodyH + roofH / 2, 0);
          return mergeGeometries([body, roof], T);
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW, totalH, 20);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 3. BLD-TOWNHOUSE (2x3 cells = 16x24m, 3-4 storeys = 12-16m)
 * Axes: stoop height, cornice, bay projection, roof deck, brick vs render, rear extension.
 */
export function bldTownhouse(seed = "townhouse-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const footW = 16;
  const footD = 24;

  const storeys = r1 < 0.45 ? 3 : 4;
  const bodyH = storeys * 4;

  const stoopHeightTier = r2 < 0.35 ? 1.0 : r2 < 0.70 ? 1.8 : 2.6; // low, mid, grand stoop
  const bayStyle = r3 < 0.30 ? "none" : r3 < 0.65 ? "full" : "cantilever";
  const hasRoofDeck = r4 > 0.4;
  const hasRearExtension = r5 > 0.35;
  const corniceTier = r6 < 0.5 ? "classic" : "dentil";

  const roofH = hasRoofDeck ? 2.4 : 2.6;
  const totalH = +(bodyH + roofH).toFixed(2);

  const wallCol = WALLS.TOWNHOUSE[Math.floor(r1 * WALLS.TOWNHOUSE.length)];
  const roofCol = ROOFS.TOWNHOUSE[Math.floor(r2 * ROOFS.TOWNHOUSE.length)];

  return {
    id: `bld-townhouse-${seed}`,
    typology: "bld-townhouse",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { storeys, stoopHeightTier, bayStyle, hasRoofDeck, hasRearExtension, corniceTier },
    lod: [
      {
        level: 0,
        tris: 420,
        createGeometry: () => {
          const parts = [];
          const bW = 14.8;
          const bD = 16.0;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(0, bodyH / 2, 0);
          parts.push(body);

          // Grand entrance stoop
          const stoop = new T.BoxGeometry(3.4, stoopHeightTier, 2.2);
          stoop.translate(3.5, stoopHeightTier / 2, bD / 2 + 1.1);
          parts.push(stoop);

          // Projecting bay window
          if (bayStyle === "full") {
            const bay = new T.BoxGeometry(4.6, bodyH * 0.8, 1.2);
            bay.translate(-3.5, bodyH * 0.45, bD / 2 + 0.6);
            parts.push(bay);
          } else if (bayStyle === "cantilever") {
            const bay = new T.BoxGeometry(4.4, 4.0, 1.4);
            bay.translate(-3.5, 6.0, bD / 2 + 0.7);
            parts.push(bay);
          }

          // Rear extension wing (classic townhouse back outrigger)
          if (hasRearExtension) {
            const extW = 5.6, extH = (storeys - 1) * 4, extD = 4.5;
            const ext = new T.BoxGeometry(extW, extH, extD);
            ext.translate(3.0, extH / 2, -bD / 2 - extD / 2);
            parts.push(ext);
          }

          // Cornice overhang
          const cornice = new T.BoxGeometry(bW * 1.02, corniceTier === "dentil" ? 0.8 : 0.5, bD * 1.04);
          cornice.translate(0, bodyH + 0.35, 0);
          parts.push(cornice);

          if (hasRoofDeck) {
            const pergola = new T.BoxGeometry(6.5, 2.4, 6.5);
            pergola.translate(0, bodyH + 1.2, 0);
            parts.push(pergola);
          }
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 54,
        createGeometry: () => {
          const body = new T.BoxGeometry(15, bodyH, 20);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(15, totalH, 20);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 4. BLD-MIDRISE (3x4 to 6x8 cells = 24x32m to 48x64m, 4-8 storeys = 16-32m)
 * Axes: podium (retail/blank/recessed), facade grid rhythm, balcony pattern,
 * corner treatment, crown/parapet, setback above N storeys.
 */
export function bldMidrise(seed = "midrise-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const cellW = 3 + Math.floor(r1 * 4); // 3, 4, 5, 6 cells (24, 32, 40, 48m)
  const cellD = 4 + Math.floor(r2 * 5); // 4, 5, 6, 7, 8 cells (32, 40, 48, 56, 64m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 4 + Math.floor(r3 * 5); // 4, 5, 6, 7, 8 storeys (16 to 32m)
  const bodyH = storeys * 4;

  const podiumType = r4 < 0.35 ? "retail" : r4 < 0.70 ? "arcade" : "flush";
  const hasSetback = storeys >= 6 && r5 > 0.30;
  const cornerTreatment = r6 < 0.35 ? "chamfer" : r6 < 0.70 ? "curved" : "square";
  const totalH = +(bodyH + 3.2).toFixed(2);

  const wallCol = WALLS.MIDRISE[Math.floor(r1 * WALLS.MIDRISE.length)];
  const roofCol = ROOFS.MIDRISE[Math.floor(r2 * ROOFS.MIDRISE.length)];

  return {
    id: `bld-midrise-${seed}`,
    typology: "bld-midrise",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys, podiumType, hasSetback, cornerTreatment },
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.92;
          const bD = footD * 0.90;

          if (hasSetback) {
            const lowStoreys = 4;
            const lowH = lowStoreys * 4;
            const lowBody = new T.BoxGeometry(bW, lowH, bD);
            lowBody.translate(0, lowH / 2, 0);
            const highH = bodyH - lowH;
            const highBody = new T.BoxGeometry(bW * 0.78, highH, bD * 0.78);
            highBody.translate(0, lowH + highH / 2, 0);
            parts.push(lowBody, highBody);
          } else {
            const body = new T.BoxGeometry(bW, bodyH, bD);
            body.translate(0, bodyH / 2, 0);
            parts.push(body);
          }

          if (podiumType === "retail") {
            const podH = 4.8;
            const pod = new T.BoxGeometry(bW * 1.04, podH, bD * 1.04);
            pod.translate(0, podH / 2, 0);
            parts.push(pod);
          } else if (podiumType === "arcade") {
            const arcH = 4.5;
            const arcade = new T.BoxGeometry(bW * 1.06, 0.6, bD * 1.06);
            arcade.translate(0, arcH, 0);
            parts.push(arcade);
          }

          // Balconies stack
          for (let s = 1; s < storeys; s++) {
            const by = s * 4 + 0.15;
            const balc = new T.BoxGeometry(bW * 0.6, 0.3, 1.8);
            balc.translate(0, by, bD / 2 + 0.9);
            parts.push(balc);
          }

          // Parapet crown and lift motor overrun
          const parapet = new T.BoxGeometry(bW * 0.85, 1.2, bD * 0.85);
          parapet.translate(0, bodyH + 0.6, 0);
          const lift = new T.BoxGeometry(6.0, 3.2, 6.0);
          lift.translate(0, bodyH + 1.6, 0);
          parts.push(parapet, lift);

          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 64,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.9, bodyH, footD * 0.9);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.9, totalH, footD * 0.9);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 5. BLD-TOWER (4x4 to 8x8 cells = 32x32m to 64x64m, 12-40 storeys = 48-160m)
 * Axes: podium, shaft profile (straight, stepped, tapered, crown, slab), curtain wall vs punched window, crown, setbacks.
 */
export function bldTower(seed = "tower-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const cellW = 4 + Math.floor(r1 * 5); // 4, 5, 6, 7, 8 cells (32 to 64m)
  const cellD = 4 + Math.floor(r2 * 5); // 4, 5, 6, 7, 8 cells (32 to 64m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 12 + Math.floor(Math.pow(r3, 1.5) * 29); // 12 to 40 storeys (48 to 160m)
  const bodyH = storeys * 4;
  const profile = r4 < 0.25 ? "stepped" : r4 < 0.50 ? "tapered" : r4 < 0.70 ? "slab" : r4 < 0.85 ? "crown" : "straight";
  const crownH = profile === "crown" ? 14.0 : 4.0;
  const totalH = +(bodyH + crownH).toFixed(2);

  const wallCol = WALLS.TOWER[Math.floor(r1 * WALLS.TOWER.length)];
  const roofCol = ROOFS.TOWER[Math.floor(r2 * ROOFS.TOWER.length)];

  return {
    id: `bld-tower-${seed}`,
    typology: "bld-tower",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 2.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys, profile },
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.88;
          const bD = footD * 0.88;

          // Podium base
          const podH = 12;
          const pod = new T.BoxGeometry(footW * 0.98, podH, footD * 0.98);
          pod.translate(0, podH / 2, 0);
          parts.push(pod);

          const shaftH = bodyH - podH;
          if (profile === "stepped") {
            const tiers = 3;
            const tH = shaftH / tiers;
            for (let i = 0; i < tiers; i++) {
              const k = 1.0 - i * 0.18;
              const tier = new T.BoxGeometry(bW * k, tH, bD * k);
              tier.translate(0, podH + tH * i + tH / 2, 0);
              parts.push(tier);
            }
          } else if (profile === "tapered") {
            const tiers = 4;
            const tH = shaftH / tiers;
            for (let i = 0; i < tiers; i++) {
              const k = 1.0 - i * 0.12;
              const tier = new T.BoxGeometry(bW * k, tH, bD * k);
              tier.translate(0, podH + tH * i + tH / 2, 0);
              parts.push(tier);
            }
          } else if (profile === "slab") {
            const halfW = bW * 0.44;
            for (const side of [-bW * 0.26, bW * 0.26]) {
              const slabPart = new T.BoxGeometry(halfW, shaftH, bD * 0.7);
              slabPart.translate(side, podH + shaftH / 2, 0);
              parts.push(slabPart);
            }
            const core = new T.BoxGeometry(bW * 0.16, shaftH + 4.0, bD * 0.5);
            core.translate(0, podH + (shaftH + 4.0) / 2, 0);
            parts.push(core);
          } else {
            const shaft = new T.BoxGeometry(bW, shaftH, bD);
            shaft.translate(0, podH + shaftH / 2, 0);
            parts.push(shaft);
          }

          if (profile === "crown") {
            const pyr = new T.ConeGeometry(bW * 0.55, crownH, 4);
            pyr.rotateY(Math.PI / 4);
            pyr.translate(0, bodyH + crownH / 2, 0);
            parts.push(pyr);
          } else {
            const plant = new T.BoxGeometry(bW * 0.6, 4.0, bD * 0.6);
            plant.translate(0, bodyH + 2.0, 0);
            parts.push(plant);
          }
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 80,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.85, bodyH, footD * 0.85);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.85, totalH, footD * 0.85);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 6. BLD-SHOP (2x2 to 4x3 cells = 16x16m to 32x24m, 1-3 storeys = 4-12m)
 * Axes: shopfront width, awning, signage band, upper-floor residential, corner unit.
 */
export function bldShop(seed = "shop-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5");

  const cellW = 2 + Math.floor(r1 * 3); // 2, 3, 4 cells (16, 24, 32m)
  const cellD = 2 + Math.floor(r2 * 2); // 2, 3 cells (16, 24m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 1 + Math.floor(r3 * 3); // 1, 2, 3 storeys (4, 8, 12m)
  const bodyH = storeys * 4;
  const hasAwning = r4 > 0.25;
  const isCornerUnit = r5 > 0.5;
  const totalH = +(bodyH + 1.2).toFixed(2);

  const wallCol = WALLS.TERRACE[Math.floor(r1 * WALLS.TERRACE.length)];
  const roofCol = ROOFS.TERRACE[Math.floor(r2 * ROOFS.TERRACE.length)];

  return {
    id: `bld-shop-${seed}`,
    typology: "bld-shop",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys, hasAwning, isCornerUnit },
    lod: [
      {
        level: 0,
        tris: 360,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.85;
          const bD = footD * 0.75;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(0, bodyH / 2, 0);
          parts.push(body);

          // Signage band above shopfront
          const signBand = new T.BoxGeometry(bW, 1.0, bD * 1.02);
          signBand.translate(0, 3.8, 0);
          parts.push(signBand);

          // Fabric awning / canopy
          if (hasAwning) {
            const awn = new T.BoxGeometry(bW * 0.92, 0.15, 2.0);
            awn.rotateX(-0.2);
            awn.translate(0, 3.2, bD / 2 + 1.0);
            parts.push(awn);
          }

          // Corner splay entrance
          if (isCornerUnit) {
            const cornerSplay = new T.BoxGeometry(3.0, 4.0, 3.0);
            cornerSplay.rotateY(Math.PI / 4);
            cornerSplay.translate(bW / 2 - 1.0, 2.0, bD / 2 - 1.0);
            parts.push(cornerSplay);
          }

          // Parapet
          const par = new T.BoxGeometry(bW, 1.0, bD * 1.02);
          par.translate(0, bodyH + 0.5, 0);
          parts.push(par);
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 48,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.9, bodyH, footD * 0.88);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.9, totalH, footD * 0.88);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 7. BLD-OFFICE (4x6 to 8x10 cells = 32x48m to 64x80m, 3-10 storeys = 12-40m)
 * Axes: entrance canopy, glazing ratio, floor banding, service core bulge, plant screen.
 */
export function bldOffice(seed = "office-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const cellW = 4 + Math.floor(r1 * 5); // 4, 5, 6, 7, 8 cells (32 to 64m)
  const cellD = 6 + Math.floor(r2 * 5); // 6, 7, 8, 9, 10 cells (48 to 80m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 3 + Math.floor(r3 * 8); // 3 to 10 storeys (12 to 40m)
  const bodyH = storeys * 4;
  const hasCoreBulge = r4 > 0.35;
  const totalH = +(bodyH + 3.0).toFixed(2);

  const wallCol = WALLS.MIDRISE[Math.floor(r1 * WALLS.MIDRISE.length)];
  const roofCol = ROOFS.MIDRISE[Math.floor(r2 * ROOFS.MIDRISE.length)];

  return {
    id: `bld-office-${seed}`,
    typology: "bld-office",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys, hasCoreBulge },
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.78;
          const bD = footD * 0.80;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(0, bodyH / 2, 0);
          parts.push(body);

          // Floor spandrel banding
          for (let s = 1; s < storeys; s++) {
            const spandrel = new T.BoxGeometry(bW * 1.02, 0.4, bD * 1.02);
            spandrel.translate(0, s * 4, 0);
            parts.push(spandrel);
          }

          // Entrance canopy
          const canopy = new T.BoxGeometry(8.0, 0.4, 3.5);
          canopy.translate(0, 4.2, bD / 2 + 1.75);
          parts.push(canopy);

          // Service elevator core bulge
          if (hasCoreBulge) {
            const core = new T.BoxGeometry(3.0, bodyH + 3.0, 6.0);
            core.translate(-bW / 2 - 1.2, (bodyH + 3.0) / 2, 0);
            parts.push(core);
          }

          // Rooftop plant screen
          const screen = new T.BoxGeometry(bW * 0.7, 2.5, bD * 0.7);
          screen.translate(0, bodyH + 1.25, 0);
          parts.push(screen);
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 60,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.9, bodyH, footD * 0.88);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.9, totalH, footD * 0.88);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 8. BLD-WAREHOUSE (6x10 to 12x20 cells = 48x80m to 96x160m, 1 storey = 8-12m)
 * Axes: roof (sawtooth, barrel, flat), loading bays 1-6, roller doors, clerestory, gantry.
 */
export function bldWarehouse(seed = "warehouse-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const cellW = 6 + Math.floor(r1 * 7); // 6 to 12 cells (48 to 96m)
  const cellD = 10 + Math.floor(r2 * 11); // 10 to 20 cells (80 to 160m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const bodyH = 8 + Math.floor(r3 * 2) * 4; // 8 or 12m
  const roofStyle = r4 < 0.40 ? "sawtooth" : r4 < 0.75 ? "barrel" : "flat";
  const loadingBays = 2 + Math.floor(r1 * 5); // 2 to 6 loading bays
  const roofH = roofStyle === "barrel" ? 3.5 : 2.0;
  const totalH = +(bodyH + roofH).toFixed(2);

  const wallCol = WALLS.WAREHOUSE[Math.floor(r1 * WALLS.WAREHOUSE.length)];
  const roofCol = ROOFS.WAREHOUSE[Math.floor(r2 * ROOFS.WAREHOUSE.length)];

  return {
    id: `bld-warehouse-${seed}`,
    typology: "bld-warehouse",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 3.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, bodyH, roofStyle, loadingBays },
    lod: [
      {
        level: 0,
        tris: 380,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.94;
          const bD = footD * 0.92;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(0, bodyH / 2, 0);
          parts.push(body);

          const dockW = loadingBays * 6.0;
          const dockPlatform = new T.BoxGeometry(dockW, 1.2, 3.5);
          dockPlatform.translate(0, 0.6, bD / 2 + 1.75);
          parts.push(dockPlatform);

          for (let i = 0; i < loadingBays; i++) {
            const bx = -dockW / 2 + 3.0 + i * 6.0;
            const bayDoor = new T.BoxGeometry(4.0, 4.2, 0.2);
            bayDoor.translate(bx, 2.1 + 1.2, bD / 2 + 0.1);
            parts.push(bayDoor);
          }

          if (roofStyle === "sawtooth") {
            const ridges = 4;
            const rD = bD / ridges;
            for (let i = 0; i < ridges; i++) {
              const rz = -bD / 2 + rD / 2 + i * rD;
              const ridge = new T.BoxGeometry(bW, 2.0, rD * 0.95);
              ridge.translate(0, bodyH + 1.0, rz);
              parts.push(ridge);
            }
          } else if (roofStyle === "barrel") {
            const vault = new T.CylinderGeometry(bW * 0.5, bW * 0.5, bD, 8, 1, false, 0, Math.PI);
            vault.rotateX(Math.PI / 2);
            vault.scale(1, roofH / (bW * 0.5), 1);
            vault.translate(0, bodyH, 0);
            parts.push(vault);
          }
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 60,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.94, bodyH, footD * 0.92);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.94, totalH, footD * 0.92);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 9. BLD-WORKSHOP (3x4 to 5x6 cells = 24x32m to 40x48m, 1-2 storeys = 4-8m)
 * Axes: yard wall, chimney/flue, mezzanine windows, roller door.
 */
export function bldWorkshop(seed = "workshop-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const cellW = 3 + Math.floor(r1 * 3); // 3, 4, 5 cells (24, 32, 40m)
  const cellD = 4 + Math.floor(r2 * 3); // 4, 5, 6 cells (32, 40, 48m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = r3 < 0.5 ? 1 : 2;
  const bodyH = storeys * 4;
  const totalH = +(bodyH + 4.0).toFixed(2);

  const wallCol = WALLS.WAREHOUSE[Math.floor(r1 * WALLS.WAREHOUSE.length)];
  const roofCol = ROOFS.WAREHOUSE[Math.floor(r2 * ROOFS.WAREHOUSE.length)];

  return {
    id: `bld-workshop-${seed}`,
    typology: "bld-workshop",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys },
    lod: [
      {
        level: 0,
        tris: 340,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.70;
          const bD = footD * 0.75;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(-footW * 0.1, bodyH / 2, 0);
          parts.push(body);

          // Yard wall
          const yardWall = new T.BoxGeometry(footW * 0.92, 2.2, footD * 0.92);
          yardWall.translate(0, 1.1, 0);
          parts.push(yardWall);

          // Chimney / Flue
          const flue = new T.CylinderGeometry(0.5, 0.6, bodyH + 3.8, 6);
          flue.translate(footW * 0.22, (bodyH + 3.8) / 2, -bD * 0.3);
          parts.push(flue);

          // Roller door
          const door = new T.BoxGeometry(5.0, 3.5, 0.3);
          door.translate(-footW * 0.1, 1.75, bD / 2 + 0.15);
          parts.push(door);
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 50,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.8, bodyH, footD * 0.8);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.8, totalH, footD * 0.8);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * 10. BLD-APARTMENT-WALKUP (3x4 to 4x6 cells = 24x32m to 32x48m, 3-4 storeys = 12-16m)
 * Axes: stair core position, gallery access vs internal, balcony rhythm, ground-floor garden, roof style.
 */
export function bldApartmentWalkup(seed = "walkup-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const cellW = 3 + Math.floor(r1 * 2); // 3, 4 cells (24, 32m)
  const cellD = 4 + Math.floor(r2 * 3); // 4, 5, 6 cells (32, 40, 48m)
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = r3 < 0.5 ? 3 : 4;
  const bodyH = storeys * 4; // 12 or 16m
  const stairPosition = r4 < 0.4 ? "center" : r4 < 0.7 ? "dual" : "gallery";
  const roofStyle = r5 < 0.4 ? "pitched" : r5 < 0.75 ? "mansard" : "parapet";
  const hasGarden = r6 > 0.3;

  const roofH = roofStyle === "pitched" ? 3.5 : roofStyle === "mansard" ? 2.8 : 1.2;
  const totalH = +(bodyH + Math.max(roofH, 2.0)).toFixed(2);

  const wallCol = WALLS.MIDRISE[Math.floor(r1 * WALLS.MIDRISE.length)];
  const roofCol = ROOFS.MIDRISE[Math.floor(r2 * ROOFS.MIDRISE.length)];

  return {
    id: `bld-apartment-walkup-${seed}`,
    typology: "bld-apartment-walkup",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: { wall: wallCol, roof: roofCol },
    params: { cellW, cellD, storeys, stairPosition, roofStyle, hasGarden },
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: () => {
          const parts = [];
          const bW = footW * 0.78;
          const bD = footD * 0.75;
          const body = new T.BoxGeometry(bW, bodyH, bD);
          body.translate(0, bodyH / 2, 0);
          parts.push(body);

          // Stair core(s)
          if (stairPosition === "center") {
            const stair = new T.BoxGeometry(4.2, bodyH + 2.0, 2.8);
            stair.translate(0, (bodyH + 2.0) / 2, bD / 2 + 1.4);
            parts.push(stair);
          } else if (stairPosition === "dual") {
            for (const sx of [-bW * 0.35, bW * 0.35]) {
              const stair = new T.BoxGeometry(3.2, bodyH + 2.0, 2.6);
              stair.translate(sx, (bodyH + 2.0) / 2, bD / 2 + 1.3);
              parts.push(stair);
            }
          } else {
            // Open gallery walkway on rear
            for (let s = 1; s < storeys; s++) {
              const gal = new T.BoxGeometry(bW * 0.9, 0.3, 1.8);
              gal.translate(0, s * 4 + 0.15, -bD / 2 - 0.9);
              parts.push(gal);
            }
          }

          // Balconies
          for (let s = 1; s < storeys; s++) {
            const by = s * 4 + 0.15;
            for (const side of [-bW / 2 - 0.8, bW / 2 + 0.8]) {
              const balc = new T.BoxGeometry(1.6, 0.3, bD * 0.35);
              balc.translate(side, by, 0);
              parts.push(balc);
            }
          }

          // Roof style
          if (roofStyle === "pitched") {
            const roof = new T.BoxGeometry(bW * 1.02, roofH, bD * 0.9);
            roof.translate(0, bodyH + roofH / 2, 0);
            parts.push(roof);
          } else if (roofStyle === "mansard") {
            const lower = new T.BoxGeometry(bW * 1.04, roofH * 0.65, bD * 1.04);
            lower.translate(0, bodyH + roofH * 0.325, 0);
            const upper = new T.BoxGeometry(bW * 0.88, roofH * 0.35, bD * 0.88);
            upper.translate(0, bodyH + roofH * 0.825, 0);
            parts.push(lower, upper);
          } else {
            const par = new T.BoxGeometry(bW * 1.02, 1.2, bD * 1.02);
            par.translate(0, bodyH + 0.6, 0);
            parts.push(par);
          }

          // Garden terrace walls
          if (hasGarden) {
            const gw = new T.BoxGeometry(bW * 0.96, 1.2, bD * 1.15);
            gw.translate(0, 0.6, 0);
            parts.push(gw);
          }
          return mergeGeometries(parts, T);
        }
      },
      {
        level: 1,
        tris: 60,
        createGeometry: () => {
          const body = new T.BoxGeometry(footW * 0.88, bodyH, footD * 0.86);
          body.translate(0, bodyH / 2, 0);
          return body;
        }
      },
      {
        level: 2,
        tris: 12,
        createGeometry: () => {
          const b = new T.BoxGeometry(footW * 0.88, totalH, footD * 0.86);
          b.translate(0, totalH / 2, 0);
          return b;
        }
      }
    ]
  };
}

/**
 * Master building generator dispatcher
 */
export function building(typology = "bld-villa", seed = "seed-0", options = {}) {
  const map = {
    "bld-villa": bldVilla,
    "bld-terrace": bldTerrace,
    "bld-townhouse": bldTownhouse,
    "bld-midrise": bldMidrise,
    "bld-tower": bldTower,
    "bld-shop": bldShop,
    "bld-office": bldOffice,
    "bld-warehouse": bldWarehouse,
    "bld-workshop": bldWorkshop,
    "bld-apartment-walkup": bldApartmentWalkup,
  };
  const gen = map[typology] || bldVilla;
  return gen(seed, options);
}
