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
import { TYPOLOGY_FOOTPRINT_CELLS } from "./typology-footprints.js";

export { TYPOLOGY_FOOTPRINT_CELLS };

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

function mergeGeometries(parts, palette = {}, T = THREE) {
  const clean = [];
  for (const p of parts) {
    if (!p) continue;
    if (p.isBufferGeometry || p.attributes) {
      clean.push({ geo: p, tag: p.userData?.tag || "wall", color: p.userData?.color || null });
    } else if (p.geo || p.geometry) {
      const g = p.geo || p.geometry;
      clean.push({ geo: g, tag: p.tag || g.userData?.tag || "wall", color: p.color || g.userData?.color || null });
    }
  }

  if (clean.length === 0) {
    const empty = new T.BufferGeometry();
    empty.setAttribute("position", new T.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute("normal", new T.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute("color", new T.BufferAttribute(new Float32Array(0), 3));
    return empty;
  }

  let totalPositions = 0;
  let totalIndices = 0;

  for (const item of clean) {
    const g = item.geo;
    totalPositions += g.attributes.position.count;
    if (g.index) totalIndices += g.index.count;
    else totalIndices += g.attributes.position.count;
  }

  const posArray = new Float32Array(totalPositions * 3);
  const normArray = new Float32Array(totalPositions * 3);
  const colArray = new Float32Array(totalPositions * 3);
  const uvArray = new Float32Array(totalPositions * 2);
  const indexArray = new Uint32Array(totalIndices);

  const defaultWall = palette.wall !== undefined ? palette.wall : 0xcccccc;
  const defaultRoof = palette.roof !== undefined ? palette.roof : 0x666666;

  let posOffset = 0;
  let indexOffset = 0;
  let vertOffset = 0;

  for (const item of clean) {
    const g = item.geo;
    const p = g.attributes.position;
    posArray.set(p.array, posOffset * 3);

    if (g.attributes.normal) {
      normArray.set(g.attributes.normal.array, posOffset * 3);
    }

    const isWall = item.tag === "wall";
    const isGlass = item.tag === "glass";
    if (isWall) {
      if (g.attributes.uv) {
        uvArray.set(g.attributes.uv.array, posOffset * 2);
      }
    } else if (isGlass) {
      // Dedicated curtain wall / structural glass patch (0.03, 0.97)
      for (let i = 0; i < p.count; i++) {
        uvArray[(posOffset + i) * 2 + 0] = 0.03;
        uvArray[(posOffset + i) * 2 + 1] = 0.97;
      }
    } else {
      // Non-wall parts (roof, coping, eaves, chimCap, dormerRoof, pergolas, etc.):
      // Remap UVs into the reserved plain patch (0.97, 0.97) so facade windows are not mapped onto roofs.
      for (let i = 0; i < p.count; i++) {
        uvArray[(posOffset + i) * 2 + 0] = 0.97;
        uvArray[(posOffset + i) * 2 + 1] = 0.97;
      }
    }

    let colVal = item.color;
    if (colVal === null || colVal === undefined) {
      if (item.tag === "roof") colVal = defaultRoof;
      else if (item.tag === "glass") colVal = palette.glass !== undefined ? palette.glass : 0x1d3a52;
      else colVal = defaultWall;
    }

    const c = new T.Color(colVal);
    for (let i = 0; i < p.count; i++) {
      colArray[(posOffset + i) * 3 + 0] = c.r;
      colArray[(posOffset + i) * 3 + 1] = c.g;
      colArray[(posOffset + i) * 3 + 2] = c.b;
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
  merged.setAttribute("color", new T.BufferAttribute(colArray, 3));
  merged.setAttribute("uv", new T.BufferAttribute(uvArray, 2));
  merged.setIndex(new T.BufferAttribute(indexArray, 1));
  return merged;
}


// cspell:words lerp tris midrise
// Architectural trim follows the largest wall mass, including its offset and
// foundation elevation. Plot dimensions are only a clamp: using them as facade
// dimensions suspends trim in the setbacks of villas and tower shafts.
function mergeWithMassingDepth(parts, palette, T, footW, footD, detailed) {
  const candidates = parts.filter(({ geo, tag }) => {
    const p = geo.parameters;
    return tag === "wall" && geo.type === "BoxGeometry" &&
      p.width > 4 && p.depth > 4 && p.height >= 4;
  });
  candidates.sort((a, b) => {
    const volume = ({ geo: { parameters: p } }) => p.width * p.height * p.depth;
    return volume(b) - volume(a);
  });
  if (!candidates.length) throw new Error("Building has no wall mass for architectural trim");
  const wall = candidates[0].geo;
  wall.computeBoundingBox();
  const b = wall.boundingBox.clone();
  const joinedWalls = [wall];
  // Terrace rows are adjacent equal-height wall boxes. Join only touching
  // boxes, never the separated shafts of a slab tower or detached outbuildings.
  for (const { geo } of candidates.slice(1)) {
    geo.computeBoundingBox();
    const next = geo.boundingBox;
    if (Math.abs(next.min.y - b.min.y) < 0.01 && Math.abs(next.max.y - b.max.y) < 0.01 &&
        Math.abs(next.min.z - b.min.z) < 0.01 && Math.abs(next.max.z - b.max.z) < 0.01 &&
        next.min.x <= b.max.x + 0.01 && next.max.x >= b.min.x - 0.01) {
      b.union(next);
      joinedWalls.push(geo);
    }
  }
  const cx = (b.min.x + b.max.x) / 2;
  // Party-wall rows already fill the plot width, so outward trim is clamped.
  // Recess the wall plane inside that envelope to retain real end-wall reveals.
  const inset = 0.6;
  const scaleX = (b.max.x - b.min.x - inset * 2) / (b.max.x - b.min.x);
  for (const geo of joinedWalls) {
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setX(i, cx + (positions.getX(i) - cx) * scaleX);
    }
    positions.needsUpdate = true;
    geo.computeBoundingBox();
  }
  const H = b.max.y - b.min.y;
  // Broad industrial halls need deep eaves; ordinary fabric needs a cornice,
  // not a canopy projecting across the street-level camera.
  const broadHall = H <= 12 && Math.min(footW, footD) >= 48;
  const projection = broadHall ? Math.min(2.4, Math.min(footW, footD) * 0.05) : 0.45;
  const left = Math.max(-footW / 2, b.min.x - projection);
  const right = Math.min(footW / 2, b.max.x + projection);
  const back = Math.max(-footD / 2, b.min.z - projection);
  const front = Math.min(footD / 2, b.max.z + projection);
  const W = right - left, D = front - back;
  const x = (left + right) / 2, z = (back + front) / 2;
  // Trim samples the atlas's reserved plain patch (facade-textures.js's
  // "Reserved Plain / Roof Patch"), which is a deliberately flat, matte,
  // texture-free #ffffff swatch that exists so vertex color alone carries a
  // rooftop's tone when seen from a distance or an oblique angle. It was not
  // designed to sit close-range on a vertical wall plane next to fully
  // detailed, much darker window glass. The atlas has no separate UV region
  // that is both textured AND free of window/mullion pixels: `stoneTrim`
  // (facade-textures.js) is only ever painted as thin bands inside the
  // ordinary windowed wall texture, not as its own patch, and mapping trim
  // to the "wall" tag directly would paste fragments of window grid across
  // the cornice. That is a real gap in the atlas, not routed around here.
  //
  // Given the flat patch is what's available, the trim's tone is derived
  // from the wall (not lightened toward roof, as the old
  // wall.lerp(roof, 0.35) did) and darkened. The darkening factor was
  // measured, not guessed: the plain patch gets full PBR sun/ambient
  // lighting, so scaling the raw albedo does not translate 1:1 into
  // rendered brightness -- multiplyScalar(0.55) only pulled the rendered
  // street-level band from ~68% to ~61% average pixel brightness (sampled
  // with `sharp` from .shots/k6-after/street-level.png), still triple the
  // ~20% of the window glass beside it. 0.28 was chosen by calibrating
  // against a genuine, already-accepted reference in the same frame: an
  // adjacent building's own unmodified roof mass, going through this exact
  // plain-patch pipeline under the same lighting, renders at ~27% average
  // brightness. multiplyScalar(0.28) lands the trim at ~37% -- close to
  // that reference and no longer the single brightest surface in the shot,
  // without crushing it to black (which would make it unreadable as a
  // distinct stone course rather than absent).
  const trim = new T.Color(palette.wall).multiplyScalar(0.28).getHex();
  const add = (w, h, d, px, py, pz) => {
    const geo = new T.BoxGeometry(w, h, d);
    geo.translate(px, py, pz);
    // Plain atlas patch: no window rows painted across a cornice or sill.
    parts.push({ geo, tag: "roof", color: trim });
  };
  // A broad base and ground-floor entablature leave the shaft recessed.
  const ground = Math.min(4, H * 0.3);
  add(W, 0.65, D, x, b.min.y + 0.325, z);
  add(W, 0.38, D, x, b.min.y + ground, z);
  if (detailed) {
    for (const fraction of [0.5, 0.75]) {
      add(W, 0.24, D, x, b.min.y + H * fraction, z);
    }
  }
  add(W, 0.45, D, x, b.max.y - 0.225, z);

  // Pitched roofs keep their silhouette. Quoins deepen their wall corners;
  // flat roofs get a hollow, four-sided parapet instead of another roof box.
  const pitched = parts.some(({ geo, tag }) => {
    if (tag !== "roof" || geo.type === "BoxGeometry") return false;
    geo.computeBoundingBox();
    return geo.boundingBox.max.y > b.max.y;
  });
  const t = 0.35;
  if (pitched) {
    const q = projection + t;
    for (const px of [left + q / 2, right - q / 2]) {
      for (const pz of [back + q / 2, front - q / 2]) {
        add(q, H, q, px, b.min.y + H / 2, pz);
      }
    }
  } else {
    const y = b.max.y + 0.4;
    add(W, 0.8, t, x, y, front - t / 2);
    add(W, 0.8, t, x, y, back + t / 2);
    add(t, 0.8, D - 2 * t, left + t / 2, y, z);
    add(t, 0.8, D - 2 * t, right - t / 2, y, z);
  }
  if (detailed) {
    // A tower's largest wall can be its upper shaft. Its entrance still
    // belongs to the lowest substantial wall (the podium), not that shaft.
    const entry = candidates.reduce((lowest, { geo }) =>
      geo.boundingBox.min.y < lowest.min.y ? geo.boundingBox : lowest, wall.boundingBox);
    const entryX = (entry.min.x + entry.max.x) / 2;
    const portalW = Math.min(3.6, (entry.max.x - entry.min.x) * 0.35);
    const portalH = Math.min(3.5, (entry.max.y - entry.min.y) * 0.3);
    const portalFront = Math.min(footD / 2, entry.max.z + 0.45);
    const portalZ = (entry.max.z + portalFront) / 2;
    const portalD = portalFront - entry.max.z + 0.1;
    for (const px of [entryX - portalW / 2, entryX + portalW / 2]) {
      add(0.3, portalH, portalD, px, entry.min.y + portalH / 2, portalZ);
    }
    add(portalW + 0.3, 0.3, portalD, entryX, entry.min.y + portalH, portalZ);
  }
  return mergeGeometries(parts, palette, T);
}

export const CHARACTER_SETS = ["heritage", "interwar", "postwar", "contemporary"];

function applyFoundation(parts, footW, footD, foundation = "slab", T = THREE) {
  if (foundation === "plinth") {
    const plinth = new T.BoxGeometry(footW * 0.96, 1.2, footD * 0.94);
    plinth.translate(0, 0.6, 0);
    const stepW = Math.min(4.0, footW * 0.4);
    const stepD = Math.min(1.0, footD * 0.04);
    const steps = new T.BoxGeometry(stepW, 0.6, stepD);
    steps.translate(0, 0.3, footD * 0.47 - stepD / 2);
    parts.push({ geo: plinth, tag: "wall" }, { geo: steps, tag: "wall" });
    return 1.2;
  } else if (foundation === "stepped") {
    const stepBase = new T.BoxGeometry(footW * 0.48, 1.4, footD * 0.94);
    stepBase.translate(-footW * 0.24, 0.7, 0);
    parts.push({ geo: stepBase, tag: "wall" });
    return 0.7;
  }
  return 0.0;
}

// =============================================================================
// 1. BLD-VILLA
// =============================================================================
export function bldVilla(seed = "villa-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const corner = options.corner || (r1 < 0.25 ? "left" : r1 < 0.5 ? "right" : "none");
  const foundation = options.foundation || (r2 < 0.3 ? "plinth" : r2 < 0.55 ? "stepped" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r3 * CHARACTER_SETS.length)];

  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (2 + Math.floor(r1 * 2));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (3 + Math.floor(r2 * 2));
  const cellW = Math.max(2, Math.min(3, Math.round(rawCellW)));
  const cellD = Math.max(3, Math.min(4, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = r3 < 0.45 ? 2 : 3;
  const bodyH = storeys * 4;
  const roofStyle = options.roofStyle || (r4 < 0.3 ? "gable" : r4 < 0.6 ? "hip" : r4 < 0.85 ? "mansard" : "parapet");
  const roofH = roofStyle === "gable" ? 4.5 : roofStyle === "hip" ? 3.8 : roofStyle === "mansard" ? 3.2 : 1.2;

  const hasPorch = r5 > 0.25;
  const garageType = r6 < 0.4 ? "attached" : r6 < 0.7 ? "detached" : "none";
  const hasBay = r1 > 0.3;
  const hasDormers = (roofStyle === "gable" || roofStyle === "mansard") && r2 > 0.4;
  const hasChimney = r3 > 0.3;

  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + roofH + 1.8).toFixed(2);
  const wallCol = WALLS.VILLA[Math.floor(r1 * WALLS.VILLA.length)];
  const roofCol = ROOFS.VILLA[Math.floor(r2 * ROOFS.VILLA.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.76;
    const bD = footD * 0.72;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const gW = Math.min(5.6, footW * 0.30), gD = Math.min(6.0, bD * 0.75), gH = 3.5;
    const mainBW = garageType === "attached" ? Math.min(bW, footW * 0.58) : bW;
    const mainOffset = garageType === "attached" ? -gW / 2 : 0;

    const body = new geomT.BoxGeometry(mainBW, bodyH, bD);
    body.translate(mainOffset, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    if (corner === "left") {
      const sideBay = new geomT.BoxGeometry(0.5, bodyH * 0.75, bD * 0.4);
      sideBay.translate(mainOffset - mainBW / 2 - 0.25, baseOffset + (bodyH * 0.75) / 2, 0);
      parts.push({ geo: sideBay, tag: "wall" });
    } else if (corner === "right") {
      const sideBay = new geomT.BoxGeometry(0.5, bodyH * 0.75, bD * 0.4);
      sideBay.translate(mainOffset + mainBW / 2 + 0.25, baseOffset + (bodyH * 0.75) / 2, 0);
      parts.push({ geo: sideBay, tag: "wall" });
    }

    const minDim = Math.min(mainBW, bD);
    if (roofStyle === "gable") {
      const roof = new geomT.ConeGeometry(minDim * 0.55, roofH, 4);
      roof.rotateY(Math.PI / 4);
      roof.scale(mainBW / minDim, 1, bD / minDim);
      roof.translate(mainOffset, baseOffset + bodyH + roofH / 2, 0);
      const eaves = new geomT.BoxGeometry(mainBW * 1.04, 0.3, bD * 1.04);
      eaves.translate(mainOffset, baseOffset + bodyH + 0.15, 0);
      parts.push({ geo: roof, tag: "roof" }, { geo: eaves, tag: "roof" });
    } else if (roofStyle === "hip") {
      const roof = new geomT.ConeGeometry(minDim * 0.52, roofH, 4);
      roof.rotateY(Math.PI / 4);
      roof.scale(mainBW / minDim, 1, bD / minDim);
      roof.translate(mainOffset, baseOffset + bodyH + roofH / 2, 0);
      const eaves = new geomT.BoxGeometry(mainBW * 1.04, 0.3, bD * 1.04);
      eaves.translate(mainOffset, baseOffset + bodyH + 0.15, 0);
      parts.push({ geo: roof, tag: "roof" }, { geo: eaves, tag: "roof" });
    } else if (roofStyle === "mansard") {
      const lower = new geomT.BoxGeometry(mainBW * 1.02, roofH * 0.65, bD * 1.02);
      lower.translate(mainOffset, baseOffset + bodyH + roofH * 0.325, 0);
      const upper = new geomT.BoxGeometry(mainBW * 0.82, roofH * 0.35, bD * 0.82);
      upper.translate(mainOffset, baseOffset + bodyH + roofH * 0.825, 0);
      parts.push({ geo: lower, tag: "roof" }, { geo: upper, tag: "roof" });
    } else {
      const parapet = new geomT.BoxGeometry(mainBW * 1.02, 0.8, bD * 1.02);
      parapet.translate(mainOffset, baseOffset + bodyH + 0.4, 0);
      const coping = new geomT.BoxGeometry(mainBW * 1.04, 0.2, bD * 1.04);
      coping.translate(mainOffset, baseOffset + bodyH + 0.9, 0);
      parts.push({ geo: parapet, tag: "wall" }, { geo: coping, tag: "roof" });
    }

    const pW = Math.min(3.8, mainBW * 0.5), pD = Math.min(1.8, (footD - bD) / 2 * 0.85), pH = 3.2;
    const porchFloor = new geomT.BoxGeometry(pW, 0.3, pD);
    porchFloor.translate(mainOffset, baseOffset + 0.15, bD / 2 + pD / 2);
    const porchRoof = new geomT.BoxGeometry(pW * 1.02, 0.3, pD * 1.02);
    porchRoof.translate(mainOffset, baseOffset + pH, bD / 2 + pD / 2);
    const col1 = new geomT.BoxGeometry(0.25, pH, 0.25);
    col1.translate(mainOffset - pW * 0.42, baseOffset + pH / 2, bD / 2 + pD - 0.15);
    const col2 = new geomT.BoxGeometry(0.25, pH, 0.25);
    col2.translate(mainOffset + pW * 0.42, baseOffset + pH / 2, bD / 2 + pD - 0.15);
    const door = new geomT.BoxGeometry(1.6, 2.6, 0.2);
    door.translate(mainOffset, baseOffset + 1.3, bD / 2 + 0.05);
    const doorTrim = new geomT.BoxGeometry(2.0, 3.0, 0.15);
    doorTrim.translate(mainOffset, baseOffset + 1.5, bD / 2 + 0.04);
    parts.push(
      { geo: porchFloor, tag: "wall" },
      { geo: porchRoof, tag: "roof" },
      { geo: col1, tag: "wall" },
      { geo: col2, tag: "wall" },
      { geo: door, tag: "wall" },
      { geo: doorTrim, tag: "wall" }
    );

    if (garageType === "attached") {
      const garage = new geomT.BoxGeometry(gW, gH, gD);
      garage.translate(mainOffset + mainBW / 2 + gW / 2 - 0.2, baseOffset + gH / 2, 0);
      const gDoor = new geomT.BoxGeometry(gW * 0.75, gH * 0.75, 0.2);
      gDoor.translate(mainOffset + mainBW / 2 + gW / 2 - 0.2, baseOffset + (gH * 0.75) / 2, gD / 2 + 0.05);
      const gLintel = new geomT.BoxGeometry(gW * 0.85, 0.3, 0.3);
      gLintel.translate(mainOffset + mainBW / 2 + gW / 2 - 0.2, baseOffset + gH * 0.8, gD / 2 + 0.08);
      parts.push({ geo: garage, tag: "wall" }, { geo: gDoor, tag: "wall" }, { geo: gLintel, tag: "wall" });
    }

    const bayD = Math.min(1.0, (footD - bD) / 2 * 0.85);
    const bayW = Math.min(3.2, mainBW * 0.45);
    const bay = new geomT.BoxGeometry(bayW, bodyH * 0.82, bayD);
    bay.translate(mainOffset - mainBW * 0.25, baseOffset + (bodyH * 0.82) / 2, bD / 2 + bayD / 2);
    const bayRoof = new geomT.BoxGeometry(bayW * 1.05, 0.3, bayD * 1.05);
    bayRoof.translate(mainOffset - mainBW * 0.25, baseOffset + bodyH * 0.82 + 0.15, bD / 2 + bayD / 2);
    const baySill = new geomT.BoxGeometry(bayW * 1.02, 0.18, bayD * 0.3);
    baySill.translate(mainOffset - mainBW * 0.25, baseOffset + 1.0, bD / 2 + bayD + 0.05);
    parts.push({ geo: bay, tag: "wall" }, { geo: bayRoof, tag: "roof" }, { geo: baySill, tag: "wall" });

    const winWidths = [-mainBW * 0.28, mainBW * 0.28];
    for (let s = 0; s < storeys; s++) {
      const wy = baseOffset + s * 4 + 2.2;
      for (const wx of winWidths) {
        const sill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        sill.translate(mainOffset + wx, wy - 0.9, bD / 2 + 0.1);
        const lintel = new geomT.BoxGeometry(1.6, 0.22, 0.3);
        lintel.translate(mainOffset + wx, wy + 0.9, bD / 2 + 0.08);
        const winGlass = new geomT.BoxGeometry(1.3, 1.5, 0.15);
        winGlass.translate(mainOffset + wx, wy, bD / 2 + 0.05);

        const rSill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        rSill.translate(mainOffset + wx, wy - 0.9, -bD / 2 - 0.1);
        const rWin = new geomT.BoxGeometry(1.3, 1.5, 0.15);
        rWin.translate(mainOffset + wx, wy, -bD / 2 - 0.05);

        parts.push(
          { geo: sill, tag: "wall" },
          { geo: lintel, tag: "wall" },
          { geo: winGlass, tag: "wall" },
          { geo: rSill, tag: "wall" },
          { geo: rWin, tag: "wall" }
        );
      }
    }

    for (const dx of [-mainBW * 0.22, mainBW * 0.22]) {
      const dormer = new geomT.BoxGeometry(1.4, 1.4, 1.5);
      dormer.translate(mainOffset + dx, baseOffset + bodyH + 1.0, bD * 0.30);
      const dormerRoof = new geomT.BoxGeometry(1.5, 0.25, 1.6);
      dormerRoof.translate(mainOffset + dx, baseOffset + bodyH + 1.8, bD * 0.30);
      const dormerSill = new geomT.BoxGeometry(1.2, 0.15, 0.25);
      dormerSill.translate(mainOffset + dx, baseOffset + bodyH + 0.5, bD * 0.30 + 0.8);
      parts.push({ geo: dormer, tag: "wall" }, { geo: dormerRoof, tag: "roof" }, { geo: dormerSill, tag: "wall" });
    }

    const chim = new geomT.BoxGeometry(1.2, bodyH + roofH + 0.8, 1.2);
    chim.translate(mainOffset + mainBW * 0.32, (baseOffset + bodyH + roofH + 0.8) / 2, -bD * 0.2);
    const chimCap = new geomT.BoxGeometry(1.4, 0.25, 1.4);
    chimCap.translate(mainOffset + mainBW * 0.32, baseOffset + bodyH + roofH + 0.85, -bD * 0.2);
    const chimPot1 = new geomT.BoxGeometry(0.35, 0.6, 0.35);
    chimPot1.translate(mainOffset + mainBW * 0.32 - 0.3, baseOffset + bodyH + roofH + 1.2, -bD * 0.2);
    const chimPot2 = new geomT.BoxGeometry(0.35, 0.6, 0.35);
    chimPot2.translate(mainOffset + mainBW * 0.32 + 0.3, baseOffset + bodyH + roofH + 1.2, -bD * 0.2);
    parts.push({ geo: chim, tag: "wall" }, { geo: chimCap, tag: "roof" }, { geo: chimPot1, tag: "roof" }, { geo: chimPot2, tag: "roof" });

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const bW = footW * 0.76;
    const bD = footD * 0.72;
    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, bodyH / 2, 0);
    const roof = new geomT.BoxGeometry(bW * 1.02, roofH, bD * 1.02);
    roof.translate(0, bodyH + roofH / 2, 0);
    const porchMass = new geomT.BoxGeometry(Math.min(4.0, bW * 0.5), 3.2, Math.min(1.8, (footD - bD) / 2 * 0.85));
    porchMass.translate(0, 1.6, bD / 2 + Math.min(1.8, (footD - bD) / 2 * 0.85) / 2);
    const chimMass = new geomT.BoxGeometry(1.2, bodyH + roofH + 0.8, 1.2);
    chimMass.translate(bW * 0.32, (bodyH + roofH + 0.8) / 2, -bD * 0.2);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: roof, tag: "roof" },
      { geo: porchMass, tag: "wall" },
      { geo: chimMass, tag: "wall" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.85, totalH, footD * 0.82);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-villa-${seed}`,
    typology: "bld-villa",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { cellW, cellD, storeys, roofStyle, corner, foundation, character, hasPorch, garageType, hasBay, hasDormers, hasChimney },
    lod: [
      { level: 0, tris: 844, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 134, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 2. BLD-TERRACE
// =============================================================================
export function bldTerrace(seed = "terrace-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const corner = options.corner || (r1 < 0.2 ? "left" : r1 < 0.4 ? "right" : "none");
  const position = options.position || (corner === "left" ? "end-left" : corner === "right" ? "end-right" : "middle");
  const foundation = options.foundation || (r3 < 0.25 ? "plinth" : r3 < 0.45 ? "stepped" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r4 * CHARACTER_SETS.length)];

  const units = options.units || (position === "middle" ? 1 : 2 + Math.floor(r1 * 4));
  const footW = units * 8;
  const footD = 24;

  const storeys = r2 < 0.45 ? 2 : 3;
  const bodyH = storeys * 4;
  const roofStyle = options.roofStyle || (r3 < 0.40 ? "parapet" : r3 < 0.75 ? "pitched" : "mansard");
  const roofH = roofStyle === "parapet" ? 1.0 : roofStyle === "mansard" ? 3.0 : 3.6;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + roofH + 1.8).toFixed(2);

  const hasBasement = r4 > 0.35;
  const hasStringCourse = r5 > 0.25;
  const hasDormers = roofStyle !== "parapet" && r6 > 0.4;

  const wallCol = WALLS.TERRACE[Math.floor(r1 * WALLS.TERRACE.length)];
  const roofCol = ROOFS.TERRACE[Math.floor(r2 * ROOFS.TERRACE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const uW = 8.0;
    const uD = 20.0;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    for (let i = 0; i < units; i++) {
      const ux = -footW / 2 + 4 + i * 8;
      const isLeftEnd = (i === 0 && (position === "end-left" || corner === "left"));
      const isRightEnd = (i === units - 1 && (position === "end-right" || corner === "right"));

      const unitBody = new geomT.BoxGeometry(uW, bodyH, uD);
      unitBody.translate(ux, baseOffset + bodyH / 2, 0);
      parts.push({ geo: unitBody, tag: "wall" });

      const chim = new geomT.BoxGeometry(0.6, bodyH + roofH + 0.8, 1.0);
      chim.translate(ux + (isRightEnd ? -3.4 : 3.6), (baseOffset + bodyH + roofH + 0.8) / 2, 0);
      const chimCap = new geomT.BoxGeometry(0.8, 0.25, 1.2);
      chimCap.translate(ux + (isRightEnd ? -3.4 : 3.6), baseOffset + bodyH + roofH + 0.85, 0);
      parts.push({ geo: chim, tag: "wall" }, { geo: chimCap, tag: "roof" });

      const doorSide = (i + Math.floor(r4 * 2)) % 2 === 0 ? -2.2 : 2.2;
      const stoop = new geomT.BoxGeometry(1.6, 0.6, 1.4);
      stoop.translate(ux + doorSide, baseOffset + 0.3, uD / 2 + 0.7);
      const doorSurround = new geomT.BoxGeometry(1.8, 2.8, 0.2);
      doorSurround.translate(ux + doorSide, baseOffset + 1.4, uD / 2 + 0.05);
      parts.push({ geo: stoop, tag: "wall" }, { geo: doorSurround, tag: "wall" });

      const well = new geomT.BoxGeometry(2.8, 0.4, 1.0);
      well.translate(ux - doorSide, baseOffset + 0.2, uD / 2 + 0.5);
      const wellRail = new geomT.BoxGeometry(2.8, 0.6, 0.1);
      wellRail.translate(ux - doorSide, baseOffset + 0.7, uD / 2 + 0.95);
      parts.push({ geo: well, tag: "wall" }, { geo: wellRail, tag: "wall" });

      const stringCourse = new geomT.BoxGeometry(uW, 0.22, uD * 1.01);
      stringCourse.translate(ux, baseOffset + 4.0, 0);
      parts.push({ geo: stringCourse, tag: "wall" });

      for (let s = 0; s < storeys; s++) {
        const wy = baseOffset + s * 4 + 2.2;
        const sill = new geomT.BoxGeometry(1.8, 0.18, 0.35);
        sill.translate(ux - doorSide, wy - 0.9, uD / 2 + 0.1);
        const win = new geomT.BoxGeometry(1.5, 1.5, 0.15);
        win.translate(ux - doorSide, wy, uD / 2 + 0.05);

        const rSill = new geomT.BoxGeometry(1.8, 0.18, 0.35);
        rSill.translate(ux, wy - 0.9, -uD / 2 - 0.1);
        const rWin = new geomT.BoxGeometry(1.5, 1.5, 0.15);
        rWin.translate(ux, wy, -uD / 2 - 0.05);

        parts.push(
          { geo: sill, tag: "wall" },
          { geo: win, tag: "wall" },
          { geo: rSill, tag: "wall" },
          { geo: rWin, tag: "wall" }
        );
      }

      const dorm = new geomT.BoxGeometry(1.3, 1.3, 1.5);
      dorm.translate(ux, baseOffset + bodyH + 0.9, uD * 0.32);
      const dormRoof = new geomT.BoxGeometry(1.4, 0.25, 1.6);
      dormRoof.translate(ux, baseOffset + bodyH + 1.6, uD * 0.32);
      parts.push({ geo: dorm, tag: "wall" }, { geo: dormRoof, tag: "roof" });

      if (isLeftEnd) {
        const returnTrim = new geomT.BoxGeometry(0.2, bodyH * 0.8, 2.4);
        returnTrim.translate(ux - uW / 2 + 0.1, baseOffset + bodyH * 0.45, 0);
        parts.push({ geo: returnTrim, tag: "wall" });
      }
      if (isRightEnd) {
        const returnTrim = new geomT.BoxGeometry(0.2, bodyH * 0.8, 2.4);
        returnTrim.translate(ux + uW / 2 - 0.1, baseOffset + bodyH * 0.45, 0);
        parts.push({ geo: returnTrim, tag: "wall" });
      }
    }

    if (roofStyle === "parapet") {
      const par = new geomT.BoxGeometry(footW, 0.9, uD * 1.01);
      par.translate(0, baseOffset + bodyH + 0.45, 0);
      const coping = new geomT.BoxGeometry(footW, 0.2, uD * 1.03);
      coping.translate(0, baseOffset + bodyH + 0.95, 0);
      parts.push({ geo: par, tag: "wall" }, { geo: coping, tag: "roof" });
    } else if (roofStyle === "mansard") {
      const lower = new geomT.BoxGeometry(footW, roofH * 0.65, uD * 1.01);
      lower.translate(0, baseOffset + bodyH + roofH * 0.325, 0);
      const upper = new geomT.BoxGeometry(footW * 0.88, roofH * 0.35, uD * 0.88);
      upper.translate(0, baseOffset + bodyH + roofH * 0.825, 0);
      parts.push({ geo: lower, tag: "roof" }, { geo: upper, tag: "roof" });
    } else {
      const pitched = new geomT.BoxGeometry(footW, roofH, uD * 0.92);
      pitched.translate(0, baseOffset + bodyH + roofH / 2, 0);
      const ridge = new geomT.BoxGeometry(footW, 0.25, 0.4);
      ridge.translate(0, baseOffset + bodyH + roofH + 0.1, 0);
      parts.push({ geo: pitched, tag: "roof" }, { geo: ridge, tag: "roof" });
    }
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW, bodyH, 20);
    body.translate(0, bodyH / 2, 0);
    const roof = new geomT.BoxGeometry(footW, roofH, 20);
    roof.translate(0, bodyH + roofH / 2, 0);
    const chimLine = new geomT.BoxGeometry(footW * 0.9, 1.2, 0.8);
    chimLine.translate(0, bodyH + roofH + 0.6, 0);
    const stoopLine = new geomT.BoxGeometry(footW * 0.8, 0.6, 1.4);
    stoopLine.translate(0, 0.3, 10 + 0.7);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: roof, tag: "roof" },
      { geo: chimLine, tag: "wall" },
      { geo: stoopLine, tag: "wall" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW, totalH, 20);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-terrace-${seed}`,
    typology: "bld-terrace",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { units, storeys, roofStyle, corner, position, foundation, character, hasBasement, hasStringCourse, hasDormers },
    lod: [
      { level: 0, tris: 624, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 134, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 3. BLD-TOWNHOUSE
// =============================================================================
export function bldTownhouse(seed = "townhouse-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const corner = options.corner || (r1 < 0.25 ? "left" : r1 < 0.5 ? "right" : "none");
  const position = options.position || (corner === "left" ? "end-left" : corner === "right" ? "end-right" : "middle");
  const foundation = options.foundation || (r3 < 0.3 ? "plinth" : r3 < 0.5 ? "stepped" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r4 * CHARACTER_SETS.length)];

  const footW = 16;
  const footD = 24;

  const storeys = r1 < 0.45 ? 3 : 4;
  const bodyH = storeys * 4;

  const stoopHeightTier = r2 < 0.35 ? 1.0 : r2 < 0.70 ? 1.8 : 2.6;
  const bayStyle = r3 < 0.30 ? "none" : r3 < 0.65 ? "full" : "cantilever";
  const hasRoofDeck = r4 > 0.4;
  const hasRearExtension = r5 > 0.35;
  const corniceTier = r6 < 0.5 ? "classic" : "dentil";

  const roofH = hasRoofDeck ? 2.4 : 2.6;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + roofH + 2.0).toFixed(2);

  const wallCol = WALLS.TOWNHOUSE[Math.floor(r1 * WALLS.TOWNHOUSE.length)];
  const roofCol = ROOFS.TOWNHOUSE[Math.floor(r2 * ROOFS.TOWNHOUSE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = 14.8;
    const bD = 16.0;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    const stoop = new geomT.BoxGeometry(3.2, stoopHeightTier, 2.0);
    stoop.translate(3.5, baseOffset + stoopHeightTier / 2, bD / 2 + 1.0);
    const stoopRailL = new geomT.BoxGeometry(0.15, stoopHeightTier + 0.9, 2.0);
    stoopRailL.translate(1.95, baseOffset + (stoopHeightTier + 0.9) / 2, bD / 2 + 1.0);
    const stoopRailR = new geomT.BoxGeometry(0.15, stoopHeightTier + 0.9, 2.0);
    stoopRailR.translate(5.05, baseOffset + (stoopHeightTier + 0.9) / 2, bD / 2 + 1.0);
    const door = new geomT.BoxGeometry(1.8, 2.8, 0.2);
    door.translate(3.5, baseOffset + stoopHeightTier + 1.4, bD / 2 + 0.05);
    const doorPediment = new geomT.BoxGeometry(2.2, 0.4, 0.4);
    doorPediment.translate(3.5, baseOffset + stoopHeightTier + 2.9, bD / 2 + 0.15);
    parts.push(
      { geo: stoop, tag: "wall" },
      { geo: stoopRailL, tag: "wall" },
      { geo: stoopRailR, tag: "wall" },
      { geo: door, tag: "wall" },
      { geo: doorPediment, tag: "wall" }
    );

    const bay = new geomT.BoxGeometry(4.4, bodyH * 0.8, 1.1);
    bay.translate(-3.5, baseOffset + bodyH * 0.45, bD / 2 + 0.55);
    const bayRoof = new geomT.BoxGeometry(4.6, 0.3, 1.2);
    bayRoof.translate(-3.5, baseOffset + bodyH * 0.85 + 0.15, bD / 2 + 0.55);
    const bayCornice = new geomT.BoxGeometry(4.6, 0.25, 1.2);
    bayCornice.translate(-3.5, baseOffset + 4.0, bD / 2 + 0.55);
    parts.push({ geo: bay, tag: "wall" }, { geo: bayRoof, tag: "roof" }, { geo: bayCornice, tag: "wall" });

    for (let s = 1; s < storeys; s++) {
      const wy = baseOffset + s * 4 + 2.2;
      const sill1 = new geomT.BoxGeometry(1.8, 0.18, 0.35);
      sill1.translate(3.5, wy - 0.9, bD / 2 + 0.1);
      const win1 = new geomT.BoxGeometry(1.5, 1.5, 0.15);
      win1.translate(3.5, wy, bD / 2 + 0.05);

      const rSill1 = new geomT.BoxGeometry(1.8, 0.18, 0.35);
      rSill1.translate(-3.5, wy - 0.9, -bD / 2 - 0.1);
      const rWin1 = new geomT.BoxGeometry(1.5, 1.5, 0.15);
      rWin1.translate(-3.5, wy, -bD / 2 - 0.05);

      parts.push(
        { geo: sill1, tag: "wall" },
        { geo: win1, tag: "wall" },
        { geo: rSill1, tag: "wall" },
        { geo: rWin1, tag: "wall" }
      );
    }

    if (corner === "left" || position === "end-left") {
      const flank = new geomT.BoxGeometry(0.5, bodyH * 0.75, 4.2);
      flank.translate(-bW / 2 - 0.25, baseOffset + (bodyH * 0.75) / 2, 0);
      parts.push({ geo: flank, tag: "wall" });
    } else if (corner === "right" || position === "end-right") {
      const flank = new geomT.BoxGeometry(0.5, bodyH * 0.75, 4.2);
      flank.translate(bW / 2 + 0.25, baseOffset + (bodyH * 0.75) / 2, 0);
      parts.push({ geo: flank, tag: "wall" });
    }

    const extW = 5.4, extH = (storeys - 1) * 4, extD = 3.6;
    const ext = new geomT.BoxGeometry(extW, extH, extD);
    ext.translate(3.0, baseOffset + extH / 2, -bD / 2 - extD / 2);
    const extRoof = new geomT.BoxGeometry(extW * 1.02, 0.3, extD * 1.02);
    extRoof.translate(3.0, baseOffset + extH + 0.15, -bD / 2 - extD / 2);
    parts.push({ geo: ext, tag: "wall" }, { geo: extRoof, tag: "roof" });

    const cornice = new geomT.BoxGeometry(bW * 1.02, corniceTier === "dentil" ? 0.7 : 0.5, bD * 1.02);
    cornice.translate(0, baseOffset + bodyH + 0.35, 0);
    const parapet = new geomT.BoxGeometry(bW * 1.01, 0.8, bD * 1.01);
    parapet.translate(0, baseOffset + bodyH + 0.9, 0);
    parts.push({ geo: cornice, tag: "roof" }, { geo: parapet, tag: "wall" });

    const pergola = new geomT.BoxGeometry(6.0, 2.2, 6.0);
    pergola.translate(0, baseOffset + bodyH + 1.1, 0);
    const pergBeams = new geomT.BoxGeometry(6.2, 0.2, 6.2);
    pergBeams.translate(0, baseOffset + bodyH + 2.2, 0);
    parts.push({ geo: pergola, tag: "roof" }, { geo: pergBeams, tag: "roof" });

    const chim = new geomT.BoxGeometry(1.2, 2.4, 1.2);
    chim.translate(-bW * 0.32, baseOffset + bodyH + 1.2, -bD * 0.2);
    const chimCap = new geomT.BoxGeometry(1.4, 0.25, 1.4);
    chimCap.translate(-bW * 0.32, baseOffset + bodyH + 2.45, -bD * 0.2);
    parts.push({ geo: chim, tag: "wall" }, { geo: chimCap, tag: "roof" });

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(14.8, bodyH, 16.0);
    body.translate(0, bodyH / 2, 0);
    const bayMass = new geomT.BoxGeometry(4.4, bodyH * 0.8, 1.1);
    bayMass.translate(-3.5, (bodyH * 0.8) / 2, 8.0 + 0.55);
    const stoopMass = new geomT.BoxGeometry(3.2, stoopHeightTier, 2.0);
    stoopMass.translate(3.5, stoopHeightTier / 2, 8.0 + 1.0);
    const roofPar = new geomT.BoxGeometry(15.0, roofH, 16.2);
    roofPar.translate(0, bodyH + roofH / 2, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: bayMass, tag: "wall" },
      { geo: stoopMass, tag: "wall" },
      { geo: roofPar, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(15, totalH, 20);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-townhouse-${seed}`,
    typology: "bld-townhouse",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { storeys, stoopHeightTier, bayStyle, hasRoofDeck, hasRearExtension, corniceTier, corner, position, foundation, character },
    lod: [
      { level: 0, tris: 464, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 134, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 4. BLD-MIDRISE
// =============================================================================
export function bldMidrise(seed = "midrise-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const corner = options.corner || (r1 < 0.3 ? "left" : r1 < 0.6 ? "right" : "none");
  const foundation = options.foundation || (r2 < 0.25 ? "plinth" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r3 * CHARACTER_SETS.length)];

  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (3 + Math.floor(r1 * 4));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (4 + Math.floor(r2 * 5));
  const cellW = Math.max(3, Math.min(6, Math.round(rawCellW)));
  const cellD = Math.max(4, Math.min(8, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 4 + Math.floor(r3 * 5);
  const bodyH = storeys * 4;

  const podiumType = r4 < 0.35 ? "retail" : r4 < 0.70 ? "arcade" : "flush";
  const hasSetback = storeys >= 6 && r5 > 0.30;
  const cornerTreatment = r6 < 0.35 ? "chamfer" : r6 < 0.70 ? "curved" : "square";
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + 3.8).toFixed(2);

  const wallCol = WALLS.MIDRISE[Math.floor(r1 * WALLS.MIDRISE.length)];
  const roofCol = ROOFS.MIDRISE[Math.floor(r2 * ROOFS.MIDRISE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.88;
    const bD = footD * 0.86;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    if (hasSetback) {
      const lowH = 16;
      const lowBody = new geomT.BoxGeometry(bW, lowH, bD);
      lowBody.translate(0, baseOffset + lowH / 2, 0);
      const highH = bodyH - lowH;
      const highBody = new geomT.BoxGeometry(bW * 0.76, highH, bD * 0.76);
      highBody.translate(0, baseOffset + lowH + highH / 2, 0);
      const setbackRoof = new geomT.BoxGeometry(bW * 0.98, 0.4, bD * 0.98);
      setbackRoof.translate(0, baseOffset + lowH + 0.2, 0);
      parts.push({ geo: lowBody, tag: "wall" }, { geo: highBody, tag: "wall" }, { geo: setbackRoof, tag: "roof" });
    } else {
      const body = new geomT.BoxGeometry(bW, bodyH, bD);
      body.translate(0, baseOffset + bodyH / 2, 0);
      parts.push({ geo: body, tag: "wall" });
    }

    if (corner === "left") {
      const chamfer = new geomT.BoxGeometry(2.0, bodyH * 0.9, 2.0);
      chamfer.rotateY(Math.PI / 4);
      chamfer.translate(-bW / 2 + 0.8, baseOffset + bodyH * 0.45, bD / 2 - 0.8);
      parts.push({ geo: chamfer, tag: "wall" });
    } else if (corner === "right") {
      const chamfer = new geomT.BoxGeometry(2.0, bodyH * 0.9, 2.0);
      chamfer.rotateY(Math.PI / 4);
      chamfer.translate(bW / 2 - 0.8, baseOffset + bodyH * 0.45, bD / 2 - 0.8);
      parts.push({ geo: chamfer, tag: "wall" });
    }

    const podH = 4.8;
    const pod = new geomT.BoxGeometry(bW * 1.01, podH, bD * 1.01);
    pod.translate(0, baseOffset + podH / 2, 0);
    const podCornice = new geomT.BoxGeometry(bW * 1.03, 0.4, bD * 1.03);
    podCornice.translate(0, baseOffset + podH + 0.2, 0);
    parts.push({ geo: pod, tag: "wall" }, { geo: podCornice, tag: "wall" });

    for (let s = 1; s < storeys; s++) {
      const by = baseOffset + s * 4;
      const spandrel = new geomT.BoxGeometry(bW * 1.01, 0.6, bD * 1.01);
      spandrel.translate(0, by, 0);
      parts.push({ geo: spandrel, tag: "wall" });

      const balcD = Math.min(1.2, (footD - bD) / 2 * 0.9);
      const balc = new geomT.BoxGeometry(bW * 0.58, 0.3, balcD);
      balc.translate(0, by + 0.15, bD / 2 + balcD / 2);
      const balcRail = new geomT.BoxGeometry(bW * 0.58, 0.8, 0.1);
      balcRail.translate(0, by + 0.6, bD / 2 + balcD - 0.05);
      parts.push({ geo: balc, tag: "wall" }, { geo: balcRail, tag: "wall" });
    }

    const parapet = new geomT.BoxGeometry(bW * 0.85, 1.2, bD * 0.85);
    parapet.translate(0, baseOffset + bodyH + 0.6, 0);
    const lift = new geomT.BoxGeometry(5.5, 3.0, 5.5);
    lift.translate(-bW * 0.2, baseOffset + bodyH + 1.5, 0);
    const hvac = new geomT.BoxGeometry(4.0, 1.8, 3.5);
    hvac.translate(bW * 0.2, baseOffset + bodyH + 0.9, 0);
    const roofDeck = new geomT.BoxGeometry(bW * 0.83, 0.3, bD * 0.83);
    roofDeck.translate(0, baseOffset + bodyH + 0.15, 0);

    parts.push(
      { geo: parapet, tag: "wall" },
      { geo: lift, tag: "wall" },
      { geo: hvac, tag: "roof" },
      { geo: roofDeck, tag: "roof" }
    );

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.88, bodyH, footD * 0.86);
    body.translate(0, bodyH / 2, 0);
    const pod = new geomT.BoxGeometry(footW * 0.90, 4.8, footD * 0.88);
    pod.translate(0, 2.4, 0);
    const lift = new geomT.BoxGeometry(5.5, 3.0, 5.5);
    lift.translate(-footW * 0.15, bodyH + 1.5, 0);
    const roof = new geomT.BoxGeometry(footW * 0.85, 1.2, footD * 0.83);
    roof.translate(0, bodyH + 0.6, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: pod, tag: "wall" },
      { geo: lift, tag: "wall" },
      { geo: roof, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.9, totalH, footD * 0.9);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-midrise-${seed}`,
    typology: "bld-midrise",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { cellW, cellD, storeys, podiumType, hasSetback, cornerTreatment, corner, foundation, character },
    lod: [
      { level: 0, tris: 464, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 134, createGeometry: (geomT) => buildLOD1(geomT || T) }, // midrise-lod1
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 5. BLD-SHOP
// =============================================================================
export function bldShop(seed = "shop-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5");

  const corner = options.corner || (r1 < 0.35 ? "left" : r1 < 0.7 ? "right" : "none");
  const foundation = options.foundation || (r2 < 0.2 ? "plinth" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r3 * CHARACTER_SETS.length)];

  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (2 + Math.floor(r1 * 3));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (2 + Math.floor(r2 * 2));
  const cellW = Math.max(2, Math.min(4, Math.round(rawCellW)));
  const cellD = Math.max(2, Math.min(3, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 1 + Math.floor(r3 * 3);
  const bodyH = storeys * 4;
  const hasAwning = r4 > 0.25;
  const isCornerUnit = corner !== "none";
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + 2.0).toFixed(2);

  const wallCol = WALLS.TERRACE[Math.floor(r1 * WALLS.TERRACE.length)];
  const roofCol = ROOFS.TERRACE[Math.floor(r2 * ROOFS.TERRACE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.82;
    const bD = footD * 0.74;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    const signBand = new geomT.BoxGeometry(bW * 1.01, 0.9, bD * 1.01);
    signBand.translate(0, baseOffset + 3.8, 0);
    const signCornice = new geomT.BoxGeometry(bW * 1.03, 0.25, bD * 1.03);
    signCornice.translate(0, baseOffset + 4.3, 0);
    parts.push({ geo: signBand, tag: "wall" }, { geo: signCornice, tag: "roof" });

    const shopGlass = new geomT.BoxGeometry(bW * 0.88, 2.6, 0.3);
    shopGlass.translate(0, baseOffset + 2.0, bD / 2 + 0.15);
    const stallRiser = new geomT.BoxGeometry(bW * 0.90, 0.6, 0.35);
    stallRiser.translate(0, baseOffset + 0.3, bD / 2 + 0.18);
    parts.push({ geo: shopGlass, tag: "wall" }, { geo: stallRiser, tag: "wall" });

    if (hasAwning) {
      const awnD = Math.min(1.5, (footD - bD) / 2 * 0.9);
      const awn = new geomT.BoxGeometry(bW * 0.90, 0.15, awnD);
      awn.rotateX(-0.2);
      awn.translate(0, baseOffset + 3.2, bD / 2 + awnD / 2);
      parts.push({ geo: awn, tag: "roof" });
    }

    if (isCornerUnit) {
      const cornerSplay = new geomT.BoxGeometry(1.8, 3.8, 1.8);
      cornerSplay.rotateY(Math.PI / 4);
      const cx = corner === "left" ? -bW / 2 + 0.8 : bW / 2 - 0.8;
      cornerSplay.translate(cx, baseOffset + 1.9, bD / 2 - 0.8);
      parts.push({ geo: cornerSplay, tag: "wall" });
    }

    for (let s = 1; s < storeys; s++) {
      const wy = baseOffset + s * 4 + 2.0;
      for (const wx of [-bW * 0.28, bW * 0.28]) {
        const sill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        sill.translate(wx, wy - 0.9, bD / 2 + 0.1);
        const win = new geomT.BoxGeometry(1.4, 1.5, 0.15);
        win.translate(wx, wy, bD / 2 + 0.05);
        parts.push({ geo: sill, tag: "wall" }, { geo: win, tag: "wall" });
      }
    }

    const par = new geomT.BoxGeometry(bW, 0.9, bD * 1.01);
    par.translate(0, baseOffset + bodyH + 0.45, 0);
    const parCap = new geomT.BoxGeometry(bW * 1.02, 0.2, bD * 1.03);
    parCap.translate(0, baseOffset + bodyH + 0.95, 0);
    const vent = new geomT.BoxGeometry(1.5, 1.2, 1.5);
    vent.translate(-bW * 0.25, baseOffset + bodyH + 0.6, -bD * 0.2);
    parts.push({ geo: par, tag: "wall" }, { geo: parCap, tag: "roof" }, { geo: vent, tag: "roof" });

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.88, bodyH, footD * 0.85);
    body.translate(0, bodyH / 2, 0);
    const sign = new geomT.BoxGeometry(footW * 0.90, 1.0, footD * 0.87);
    sign.translate(0, 3.8, 0);
    const par = new geomT.BoxGeometry(footW * 0.88, 1.0, footD * 0.85);
    par.translate(0, bodyH + 0.5, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: sign, tag: "wall" },
      { geo: par, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.88, totalH, footD * 0.85);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-shop-${seed}`,
    typology: "bld-shop",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { cellW, cellD, storeys, hasAwning, isCornerUnit, corner, foundation, character },
    lod: [
      { level: 0, tris: 324, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 6. BLD-OFFICE
// =============================================================================
export function bldOffice(seed = "office-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const corner = options.corner || (r1 < 0.3 ? "left" : r1 < 0.6 ? "right" : "none");
  const foundation = options.foundation || (r2 < 0.2 ? "plinth" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r3 * CHARACTER_SETS.length)];

  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (4 + Math.floor(r1 * 5));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (6 + Math.floor(r2 * 5));
  const cellW = Math.max(4, Math.min(8, Math.round(rawCellW)));
  const cellD = Math.max(6, Math.min(10, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 3 + Math.floor(r3 * 8);
  const bodyH = storeys * 4;
  const hasCoreBulge = r4 > 0.35;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + 3.8).toFixed(2);

  const wallCol = WALLS.MIDRISE[Math.floor(r1 * WALLS.MIDRISE.length)];
  const roofCol = ROOFS.MIDRISE[Math.floor(r2 * ROOFS.MIDRISE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.76;
    const bD = footD * 0.78;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    for (let s = 1; s < storeys; s++) {
      const spandrel = new geomT.BoxGeometry(bW * 1.01, 0.5, bD * 1.01);
      spandrel.translate(0, baseOffset + s * 4, 0);
      parts.push({ geo: spandrel, tag: "wall" });
    }

    const canopyD = Math.min(2.5, (footD - bD) / 2 * 0.9);
    const canopyW = Math.min(7.5, bW * 0.5);
    const canopy = new geomT.BoxGeometry(canopyW, 0.4, canopyD);
    canopy.translate(0, baseOffset + 4.2, bD / 2 + canopyD / 2);
    const colL = new geomT.BoxGeometry(0.35, 4.2, 0.35);
    colL.translate(-canopyW * 0.42, baseOffset + 2.1, bD / 2 + canopyD - 0.2);
    const colR = new geomT.BoxGeometry(0.35, 4.2, 0.35);
    colR.translate(canopyW * 0.42, baseOffset + 2.1, bD / 2 + canopyD - 0.2);
    parts.push({ geo: canopy, tag: "roof" }, { geo: colL, tag: "wall" }, { geo: colR, tag: "wall" });

    if (corner === "left") {
      const flank = new geomT.BoxGeometry(0.5, bodyH * 0.85, bD * 0.45);
      flank.translate(-bW / 2 - 0.25, baseOffset + (bodyH * 0.85) / 2, 0);
      parts.push({ geo: flank, tag: "wall" });
    } else if (corner === "right") {
      const flank = new geomT.BoxGeometry(0.5, bodyH * 0.85, bD * 0.45);
      flank.translate(bW / 2 + 0.25, baseOffset + (bodyH * 0.85) / 2, 0);
      parts.push({ geo: flank, tag: "wall" });
    }

    if (hasCoreBulge) {
      const core = new geomT.BoxGeometry(2.0, bodyH + 3.0, 5.5);
      core.translate(-bW / 2 - 1.0, (baseOffset + bodyH + 3.0) / 2, 0);
      parts.push({ geo: core, tag: "wall" });
    }

    const screen = new geomT.BoxGeometry(bW * 0.68, 2.4, bD * 0.68);
    screen.translate(0, baseOffset + bodyH + 1.2, 0);
    const chiller1 = new geomT.BoxGeometry(4.0, 1.8, 3.0);
    chiller1.translate(-bW * 0.15, baseOffset + bodyH + 0.9, 0);
    const chiller2 = new geomT.BoxGeometry(4.0, 1.8, 3.0);
    chiller2.translate(bW * 0.15, baseOffset + bodyH + 0.9, 0);
    parts.push({ geo: screen, tag: "roof" }, { geo: chiller1, tag: "roof" }, { geo: chiller2, tag: "roof" });

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.88, bodyH, footD * 0.86);
    body.translate(0, bodyH / 2, 0);
    const canopy = new geomT.BoxGeometry(Math.min(7.5, footW * 0.4), 0.4, Math.min(2.5, footD * 0.1));
    canopy.translate(0, 4.2, (footD * 0.86) / 2 + Math.min(2.5, footD * 0.1) / 2);
    const screen = new geomT.BoxGeometry(footW * 0.60, 2.4, footD * 0.60);
    screen.translate(0, bodyH + 1.2, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: canopy, tag: "wall" },
      { geo: screen, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.88, totalH, footD * 0.86);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-office-${seed}`,
    typology: "bld-office",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { cellW, cellD, storeys, hasCoreBulge, corner, foundation, character },
    lod: [
      { level: 0, tris: 344, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 7. BLD-APARTMENT-WALKUP
// =============================================================================
export function bldApartmentWalkup(seed = "walkup-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const r5 = rnd(seed + "5"), r6 = rnd(seed + "6");

  const corner = options.corner || (r1 < 0.25 ? "left" : r1 < 0.5 ? "right" : "none");
  const position = options.position || (corner === "left" ? "end-left" : corner === "right" ? "end-right" : "middle");
  const foundation = options.foundation || (r3 < 0.25 ? "plinth" : r3 < 0.5 ? "stepped" : "slab");
  const character = options.character || CHARACTER_SETS[Math.floor(r4 * CHARACTER_SETS.length)];

  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (3 + Math.floor(r1 * 3));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (4 + Math.floor(r2 * 4));
  const cellW = Math.max(3, Math.min(5, Math.round(rawCellW)));
  const cellD = Math.max(4, Math.min(7, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 3 + Math.floor(r3 * 2);
  const bodyH = storeys * 4;
  const stairPosition = r4 < 0.4 ? "center" : r4 < 0.7 ? "dual" : "gallery";
  const roofStyle = options.roofStyle || (r5 < 0.4 ? "pitched" : r5 < 0.75 ? "mansard" : "parapet");
  const hasGarden = r6 > 0.3;

  const roofH = roofStyle === "pitched" ? 3.5 : roofStyle === "mansard" ? 2.8 : 1.2;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + Math.max(roofH, 2.0) + 1.8).toFixed(2);

  const wallCol = WALLS.MIDRISE[Math.floor(r1 * WALLS.MIDRISE.length)];
  const roofCol = ROOFS.MIDRISE[Math.floor(r2 * ROOFS.MIDRISE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  const frontageEdges = corner === "left" ? ["front", "left"] : corner === "right" ? ["front", "right"] : ["front"];

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.76;
    const bD = footD * 0.74;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    if (stairPosition === "center") {
      const stairD = Math.min(2.0, (footD - bD) / 2 * 0.9);
      const stair = new geomT.BoxGeometry(4.0, bodyH + 1.8, stairD);
      stair.translate(0, (baseOffset + bodyH + 1.8) / 2, bD / 2 + stairD / 2);
      const stairRoof = new geomT.BoxGeometry(4.2, 0.3, stairD * 1.05);
      stairRoof.translate(0, baseOffset + bodyH + 1.8 + 0.15, bD / 2 + stairD / 2);
      parts.push({ geo: stair, tag: "wall" }, { geo: stairRoof, tag: "roof" });
    } else if (stairPosition === "dual") {
      const stairD = Math.min(1.8, (footD - bD) / 2 * 0.9);
      for (const sx of [-bW * 0.35, bW * 0.35]) {
        const stair = new geomT.BoxGeometry(3.0, bodyH + 1.8, stairD);
        stair.translate(sx, (baseOffset + bodyH + 1.8) / 2, bD / 2 + stairD / 2);
        const stairRoof = new geomT.BoxGeometry(3.2, 0.3, stairD * 1.05);
        stairRoof.translate(sx, baseOffset + bodyH + 1.8 + 0.15, bD / 2 + stairD / 2);
        parts.push({ geo: stair, tag: "wall" }, { geo: stairRoof, tag: "roof" });
      }
    }

    for (let s = 1; s < storeys; s++) {
      const by = baseOffset + s * 4 + 0.15;
      const hasLeftBalc = (position === "end-left" || position === "detached" || corner === "left");
      const hasRightBalc = (position === "end-right" || position === "detached" || corner === "right");
      if (hasLeftBalc) {
        const balc = new geomT.BoxGeometry(1.4, 0.3, bD * 0.32);
        balc.translate(-bW / 2 - 0.7, by, 0);
        const balcRail = new geomT.BoxGeometry(0.1, 0.8, bD * 0.32);
        balcRail.translate(-bW / 2 - 1.35, by + 0.45, 0);
        parts.push({ geo: balc, tag: "wall" }, { geo: balcRail, tag: "wall" });
      }
      if (hasRightBalc) {
        const balc = new geomT.BoxGeometry(1.4, 0.3, bD * 0.32);
        balc.translate(bW / 2 + 0.7, by, 0);
        const balcRail = new geomT.BoxGeometry(0.1, 0.8, bD * 0.32);
        balcRail.translate(bW / 2 + 1.35, by + 0.45, 0);
        parts.push({ geo: balc, tag: "wall" }, { geo: balcRail, tag: "wall" });
      }
    }

    for (let s = 0; s < storeys; s++) {
      const wy = baseOffset + s * 4 + 2.0;
      for (const wx of [-bW * 0.28, bW * 0.28]) {
        const sill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        sill.translate(wx, wy - 0.9, bD / 2 + 0.1);
        const win = new geomT.BoxGeometry(1.3, 1.5, 0.15);
        win.translate(wx, wy, bD / 2 + 0.05);

        const rSill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        rSill.translate(wx, wy - 0.9, -bD / 2 - 0.1);
        const rWin = new geomT.BoxGeometry(1.3, 1.5, 0.15);
        rWin.translate(wx, wy, -bD / 2 - 0.05);

        parts.push(
          { geo: sill, tag: "wall" },
          { geo: win, tag: "wall" },
          { geo: rSill, tag: "wall" },
          { geo: rWin, tag: "wall" }
        );
      }
    }

    if (roofStyle === "pitched") {
      const roof = new geomT.BoxGeometry(bW * 1.01, roofH, bD * 0.88);
      roof.translate(0, baseOffset + bodyH + roofH / 2, 0);
      const eaves = new geomT.BoxGeometry(bW * 1.04, 0.3, bD * 1.04);
      eaves.translate(0, baseOffset + bodyH + 0.15, 0);
      parts.push({ geo: roof, tag: "roof" }, { geo: eaves, tag: "roof" });
    } else if (roofStyle === "mansard") {
      const lower = new geomT.BoxGeometry(bW * 1.02, roofH * 0.65, bD * 1.02);
      lower.translate(0, baseOffset + bodyH + roofH * 0.325, 0);
      const upper = new geomT.BoxGeometry(bW * 0.86, roofH * 0.35, bD * 0.86);
      upper.translate(0, baseOffset + bodyH + roofH * 0.825, 0);
      parts.push({ geo: lower, tag: "roof" }, { geo: upper, tag: "roof" });
    } else {
      const par = new geomT.BoxGeometry(bW * 1.01, 1.1, bD * 1.01);
      par.translate(0, baseOffset + bodyH + 0.55, 0);
      const coping = new geomT.BoxGeometry(bW * 1.03, 0.2, bD * 1.03);
      coping.translate(0, baseOffset + bodyH + 1.15, 0);
      parts.push({ geo: par, tag: "wall" }, { geo: coping, tag: "roof" });
    }
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.86, bodyH, footD * 0.85);
    body.translate(0, bodyH / 2, 0);
    const stair = new geomT.BoxGeometry(4.0, bodyH + 1.8, Math.min(2.0, footD * 0.08));
    stair.translate(0, (bodyH + 1.8) / 2, (footD * 0.85) / 2 + Math.min(2.0, footD * 0.08) / 2);
    const roof = new geomT.BoxGeometry(footW * 0.88, roofH, footD * 0.87);
    roof.translate(0, bodyH + roofH / 2, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: stair, tag: "wall" },
      { geo: roof, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.86, totalH, footD * 0.85);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-apartment-walkup-${seed}`,
    typology: "bld-apartment-walkup",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    frontageEdges,
    material: mat,
    params: { cellW, cellD, storeys, stairPosition, roofStyle, hasGarden, corner, position, foundation, character },
    lod: [
      { level: 0, tris: 644, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 8. BLD-WAREHOUSE
// =============================================================================
export function bldWarehouse(seed = "warehouse-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const foundation = options.foundation || "slab";
  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (6 + Math.floor(r1 * 5));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (10 + Math.floor(r2 * 11));
  const cellW = Math.max(6, Math.min(10, Math.round(rawCellW)));
  const cellD = Math.max(10, Math.min(20, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const roofStyle = options.roofStyle || (r3 < 0.4 ? "sawtooth" : r3 < 0.7 ? "barrel" : "curved");
  const roofH = 3.5;
  const bodyH = 12.0;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + roofH + 1.0).toFixed(2);

  const wallCol = WALLS.WAREHOUSE[Math.floor(r1 * WALLS.WAREHOUSE.length)];
  const roofCol = ROOFS.WAREHOUSE[Math.floor(r2 * ROOFS.WAREHOUSE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.90;
    const bD = footD * 0.92;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    // Office annex block
    const annexW = Math.min(16.0, bW * 0.4);
    const annexD = Math.min(3.0, (footD - bD) / 2 * 0.85);
    const annex = new geomT.BoxGeometry(annexW, 6.0, annexD);
    annex.translate(-bW / 2 + annexW / 2 + 2, baseOffset + 3.0, bD / 2 + annexD / 2);
    const annexCanopy = new geomT.BoxGeometry(annexW * 1.05, 0.3, annexD * 1.05);
    annexCanopy.translate(-bW / 2 + annexW / 2 + 2, baseOffset + 6.15, bD / 2 + annexD / 2);
    parts.push({ geo: annex, tag: "wall" }, { geo: annexCanopy, tag: "roof" });

    // Multiple loading dock bays
    const numDocks = Math.max(2, Math.floor(cellW * 0.7));
    for (let i = 0; i < numDocks; i++) {
      const dx = -bW / 2 + 8 + i * 8;
      const bay = new geomT.BoxGeometry(5.0, 4.5, 0.3);
      bay.translate(dx, baseOffset + 2.25, bD / 2 + 0.15);
      const bumperL = new geomT.BoxGeometry(0.3, 1.0, 0.2);
      bumperL.translate(dx - 2.2, baseOffset + 0.5, bD / 2 + 0.35);
      const bumperR = new geomT.BoxGeometry(0.3, 1.0, 0.2);
      bumperR.translate(dx + 2.2, baseOffset + 0.5, bD / 2 + 0.35);
      parts.push({ geo: bay, tag: "wall" }, { geo: bumperL, tag: "wall" }, { geo: bumperR, tag: "wall" });
    }

    if (roofStyle === "sawtooth") {
      const bays = Math.max(3, Math.floor(cellD * 0.6));
      const bayD = bD / bays;
      for (let i = 0; i < bays; i++) {
        const bz = -bD / 2 + bayD * i + bayD / 2;
        const tooth = new geomT.BoxGeometry(bW * 0.98, roofH, bayD * 0.85);
        tooth.translate(0, baseOffset + bodyH + roofH / 2, bz);
        const glass = new geomT.BoxGeometry(bW * 0.94, roofH * 0.7, 0.1);
        glass.translate(0, baseOffset + bodyH + roofH * 0.45, bz + bayD * 0.38);
        parts.push({ geo: tooth, tag: "roof" }, { geo: glass, tag: "wall" });
      }
    } else {
      const roof = new geomT.BoxGeometry(bW * 0.98, roofH, bD * 0.98);
      roof.translate(0, baseOffset + bodyH + roofH / 2, 0);
      parts.push({ geo: roof, tag: "roof" });
    }

    for (let i = 0; i < 3; i++) {
      const vent = new geomT.BoxGeometry(2.0, 1.0, 2.0);
      vent.translate(-bW * 0.25 + i * (bW * 0.25), baseOffset + bodyH + roofH + 0.5, 0);
      parts.push({ geo: vent, tag: "roof" });
    }

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.92, bodyH, footD * 0.92);
    body.translate(0, bodyH / 2, 0);
    const roof = new geomT.BoxGeometry(footW * 0.94, roofH, footD * 0.94);
    roof.translate(0, bodyH + roofH / 2, 0);
    const annex = new geomT.BoxGeometry(footW * 0.35, 6.0, Math.min(3.0, footD * 0.03));
    annex.translate(-footW * 0.25, 3.0, (footD * 0.92) / 2 + Math.min(3.0, footD * 0.03) / 2);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: roof, tag: "roof" },
      { geo: annex, tag: "wall" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.92, totalH, footD * 0.92);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-warehouse-${seed}`,
    typology: "bld-warehouse",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 2.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: mat,
    params: { cellW, cellD, roofStyle },
    lod: [
      { level: 0, tris: 384, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 9. BLD-WORKSHOP
// =============================================================================
export function bldWorkshop(seed = "workshop-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const foundation = options.foundation || "slab";
  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (3 + Math.floor(r1 * 3));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (4 + Math.floor(r2 * 4));
  const cellW = Math.max(3, Math.min(5, Math.round(rawCellW)));
  const cellD = Math.max(4, Math.min(7, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const roofStyle = options.roofStyle || (r3 < 0.5 ? "monopitch" : "gabled");
  const bodyH = 8.0;
  const roofH = 4.0;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + roofH + 1.8).toFixed(2);

  const wallCol = WALLS.WAREHOUSE[Math.floor(r1 * WALLS.WAREHOUSE.length)];
  const roofCol = ROOFS.WAREHOUSE[Math.floor(r2 * ROOFS.WAREHOUSE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.85;
    const bD = footD * 0.85;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, baseOffset + bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    const roller = new geomT.BoxGeometry(5.0, 4.5, 0.4);
    roller.translate(-bW * 0.2, baseOffset + 2.25, bD / 2 + 0.2);
    const hood = new geomT.BoxGeometry(5.4, 0.6, 0.6);
    hood.translate(-bW * 0.2, baseOffset + 4.8, bD / 2 + 0.3);
    parts.push({ geo: roller, tag: "wall" }, { geo: hood, tag: "wall" });

    const pDoor = new geomT.BoxGeometry(1.6, 2.6, 0.2);
    pDoor.translate(bW * 0.3, baseOffset + 1.3, bD / 2 + 0.1);
    const pCanopy = new geomT.BoxGeometry(2.0, 0.2, 0.8);
    pCanopy.translate(bW * 0.3, baseOffset + 2.8, bD / 2 + 0.4);
    parts.push({ geo: pDoor, tag: "wall" }, { geo: pCanopy, tag: "roof" });

    for (const sx of [-bD * 0.25, bD * 0.25]) {
      const winL = new geomT.BoxGeometry(0.2, 1.8, 3.0);
      winL.translate(-bW / 2 - 0.05, baseOffset + 4.5, sx);
      const winR = new geomT.BoxGeometry(0.2, 1.8, 3.0);
      winR.translate(bW / 2 + 0.05, baseOffset + 4.5, sx);
      parts.push({ geo: winL, tag: "wall" }, { geo: winR, tag: "wall" });
    }

    const roof = new geomT.BoxGeometry(bW * 0.98, roofH, bD * 0.98);
    roof.translate(0, baseOffset + bodyH + roofH / 2, 0);
    const skylight = new geomT.BoxGeometry(bW * 0.5, 0.8, bD * 0.4);
    skylight.translate(0, baseOffset + bodyH + roofH + 0.4, 0);
    parts.push({ geo: roof, tag: "roof" }, { geo: skylight, tag: "roof" });

    const flue = new geomT.BoxGeometry(0.8, bodyH + roofH + 1.0, 0.8);
    flue.translate(bW * 0.35, (baseOffset + bodyH + roofH + 1.0) / 2, -bD * 0.35);
    const cowl = new geomT.BoxGeometry(1.2, 0.4, 1.2);
    cowl.translate(bW * 0.35, baseOffset + bodyH + roofH + 1.2, -bD * 0.35);
    parts.push({ geo: flue, tag: "wall" }, { geo: cowl, tag: "roof" });

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.88, bodyH, footD * 0.88);
    body.translate(0, bodyH / 2, 0);
    const roof = new geomT.BoxGeometry(footW * 0.90, roofH, footD * 0.90);
    roof.translate(0, bodyH + roofH / 2, 0);
    const roller = new geomT.BoxGeometry(5.0, 4.5, 0.4);
    roller.translate(-footW * 0.15, 2.25, (footD * 0.88) / 2 + 0.2);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: roof, tag: "roof" },
      { geo: roller, tag: "wall" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.88, totalH, footD * 0.88);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-workshop-${seed}`,
    typology: "bld-workshop",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: mat,
    params: { cellW, cellD, roofStyle },
    lod: [
      { level: 0, tris: 314, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 10. BLD-TOWER
// =============================================================================
export function bldTower(seed = "tower-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3"), r4 = rnd(seed + "4");
  const foundation = options.foundation || "slab";
  const rawCellW = Number.isFinite(options.cellW) ? options.cellW : (4 + Math.floor(r1 * 5));
  const rawCellD = Number.isFinite(options.cellD) ? options.cellD : (4 + Math.floor(r2 * 5));
  const cellW = Math.max(4, Math.min(8, Math.round(rawCellW)));
  const cellD = Math.max(4, Math.min(8, Math.round(rawCellD)));
  const footW = cellW * 8;
  const footD = cellD * 8;

  const storeys = 12 + Math.floor(Math.pow(r3, 1.5) * 29);
  const bodyH = storeys * 4;
  const profile = options.profile || (r4 < 0.25 ? "stepped" : r4 < 0.50 ? "tapered" : r4 < 0.70 ? "slab" : r4 < 0.85 ? "crown" : "straight");
  const crownH = profile === "crown" ? 14.0 : 4.0;
  const baseOffsetMax = foundation === "plinth" ? 1.2 : foundation === "stepped" ? 0.7 : 0;
  const totalH = +(baseOffsetMax + bodyH + crownH + 6.5).toFixed(2);

  const wallCol = WALLS.TOWER[Math.floor(r1 * WALLS.TOWER.length)];
  const roofCol = ROOFS.TOWER[Math.floor(r2 * ROOFS.TOWER.length)];
  const mat = { wall: wallCol, roof: roofCol };

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.88;
    const bD = footD * 0.88;
    const baseOffset = applyFoundation(parts, footW, footD, foundation, geomT);

    const podH = 12;
    const pod = new geomT.BoxGeometry(bW * 1.02, podH, bD * 1.02);
    pod.translate(0, baseOffset + podH / 2, 0);
    const podCornice = new geomT.BoxGeometry(bW * 1.04, 0.6, bD * 1.04);
    podCornice.translate(0, baseOffset + podH + 0.3, 0);

    const canopyD = Math.min(2.5, (footD - bD) / 2 * 0.85);
    const entryCanopy = new geomT.BoxGeometry(bW * 0.45, 0.5, canopyD);
    entryCanopy.translate(0, baseOffset + 5.0, (bD * 1.02) / 2 + canopyD / 2);
    parts.push({ geo: pod, tag: "wall" }, { geo: podCornice, tag: "wall" }, { geo: entryCanopy, tag: "roof" });

    const shaftH = bodyH - podH;
    if (profile === "stepped") {
      const tiers = 3;
      const tH = shaftH / tiers;
      for (let i = 0; i < tiers; i++) {
        const k = 1.0 - i * 0.18;
        const tier = new geomT.BoxGeometry(bW * k, tH, bD * k);
        tier.translate(0, baseOffset + podH + tH * i + tH / 2, 0);
        const band = new geomT.BoxGeometry(bW * k * 1.01, 0.5, bD * k * 1.01);
        band.translate(0, baseOffset + podH + tH * (i + 1), 0);
        parts.push({ geo: tier, tag: "wall" }, { geo: band, tag: "roof" });
      }
    } else if (profile === "tapered") {
      const tiers = 4;
      const tH = shaftH / tiers;
      for (let i = 0; i < tiers; i++) {
        const k = 1.0 - i * 0.12;
        const tier = new geomT.BoxGeometry(bW * k, tH, bD * k);
        tier.translate(0, baseOffset + podH + tH * i + tH / 2, 0);
        const band = new geomT.BoxGeometry(bW * k * 1.01, 0.4, bD * k * 1.01);
        band.translate(0, baseOffset + podH + tH * (i + 1), 0);
        parts.push({ geo: tier, tag: "wall" }, { geo: band, tag: "roof" });
      }
    } else if (profile === "slab") {
      const halfW = bW * 0.44;
      for (const side of [-bW * 0.26, bW * 0.26]) {
        const slabPart = new geomT.BoxGeometry(halfW, shaftH, bD * 0.7);
        slabPart.translate(side, baseOffset + podH + shaftH / 2, 0);
        parts.push({ geo: slabPart, tag: "wall" });
      }
      const core = new geomT.BoxGeometry(bW * 0.16, shaftH + 4.0, bD * 0.5);
      core.translate(0, baseOffset + podH + (shaftH + 4.0) / 2, 0);
      parts.push({ geo: core, tag: "wall" });
    } else {
      const shaft = new geomT.BoxGeometry(bW, shaftH, bD);
      shaft.translate(0, baseOffset + podH + shaftH / 2, 0);
      parts.push({ geo: shaft, tag: "wall" });
    }

    for (const mx of [-bW * 0.35, 0, bW * 0.35]) {
      const finF = new geomT.BoxGeometry(0.3, shaftH, 0.3);
      finF.translate(mx, baseOffset + podH + shaftH / 2, bD / 2 + 0.1);
      const finB = new geomT.BoxGeometry(0.3, shaftH, 0.3);
      finB.translate(mx, baseOffset + podH + shaftH / 2, -bD / 2 - 0.1);
      parts.push({ geo: finF, tag: "wall" }, { geo: finB, tag: "wall" });
    }

    const minDim = Math.min(bW, bD);
    if (profile === "crown") {
      const pyr = new geomT.ConeGeometry(minDim * 0.5, crownH, 4);
      pyr.rotateY(Math.PI / 4);
      pyr.translate(0, baseOffset + bodyH + crownH / 2, 0);
      const spire = new geomT.BoxGeometry(0.8, 6.0, 0.8);
      spire.translate(0, baseOffset + bodyH + crownH + 3.0, 0);
      parts.push({ geo: pyr, tag: "roof" }, { geo: spire, tag: "roof" });
    } else {
      const plant = new geomT.BoxGeometry(bW * 0.6, 4.0, bD * 0.6);
      plant.translate(0, baseOffset + bodyH + 2.0, 0);
      const antenna = new geomT.BoxGeometry(0.4, 5.0, 0.4);
      antenna.translate(0, baseOffset + bodyH + 6.5, 0);
      parts.push({ geo: plant, tag: "roof" }, { geo: antenna, tag: "roof" });
    }

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.85, bodyH, footD * 0.85);
    body.translate(0, bodyH / 2, 0);
    const pod = new geomT.BoxGeometry(footW * 0.88, 12, footD * 0.88);
    pod.translate(0, 6, 0);
    const minDim = Math.min(footW * 0.85, footD * 0.85);
    const crown = new geomT.BoxGeometry(minDim * 0.6, crownH, minDim * 0.6);
    crown.translate(0, bodyH + crownH / 2, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: pod, tag: "wall" },
      { geo: crown, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.85, totalH, footD * 0.85);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-tower-${seed}`,
    typology: "bld-tower",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 2.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: mat,
    params: { cellW, cellD, storeys, profile },
    lod: [
      { level: 0, tris: 304, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 11. BLD-HIGHSTREET-TERRACE
// =============================================================================
export function bldHighStreetTerrace(seed = "highstreet-0", options = {}, T = THREE) {
  const r1 = rnd(seed + "1"), r2 = rnd(seed + "2"), r3 = rnd(seed + "3");
  const footW = 16;
  const footD = 24;
  const bodyH = 16.0;
  const roofH = 3.0;
  const totalH = +(bodyH + roofH + 1.8).toFixed(2);

  const wallCol = WALLS.TERRACE[Math.floor(r1 * WALLS.TERRACE.length)];
  const roofCol = ROOFS.TERRACE[Math.floor(r2 * ROOFS.TERRACE.length)];
  const mat = { wall: wallCol, roof: roofCol };

  function buildLOD0(geomT = T) {
    const parts = [];
    const uW = footW * 0.92;
    const uD = 20.0;

    const body = new geomT.BoxGeometry(uW, bodyH, uD);
    body.translate(0, bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    const shopfront = new geomT.BoxGeometry(uW * 1.01, 3.8, uD * 1.01);
    shopfront.translate(0, 1.9, 0);
    const fascia = new geomT.BoxGeometry(uW * 1.02, 0.9, uD * 1.02);
    fascia.translate(0, 4.0, 0);
    const fasciaCornice = new geomT.BoxGeometry(uW * 1.04, 0.25, uD * 1.04);
    fasciaCornice.translate(0, 4.5, 0);
    parts.push({ geo: shopfront, tag: "wall" }, { geo: fascia, tag: "wall" }, { geo: fasciaCornice, tag: "roof" });

    for (let s = 1; s < 4; s++) {
      const wy = s * 4 + 2.0;
      for (const wx of [-uW * 0.28, uW * 0.28]) {
        const sill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        sill.translate(wx, wy - 0.9, uD / 2 + 0.1);
        const win = new geomT.BoxGeometry(1.3, 1.5, 0.15);
        win.translate(wx, wy, uD / 2 + 0.05);

        const rSill = new geomT.BoxGeometry(1.6, 0.18, 0.35);
        rSill.translate(wx, wy - 0.9, -uD / 2 - 0.1);
        const rWin = new geomT.BoxGeometry(1.3, 1.5, 0.15);
        rWin.translate(wx, wy, -uD / 2 - 0.05);

        parts.push(
          { geo: sill, tag: "wall" },
          { geo: win, tag: "wall" },
          { geo: rSill, tag: "wall" },
          { geo: rWin, tag: "wall" }
        );
      }
    }

    const lower = new geomT.BoxGeometry(uW * 1.01, roofH * 0.65, uD * 1.01);
    lower.translate(0, bodyH + roofH * 0.325, 0);
    const upper = new geomT.BoxGeometry(uW * 0.85, roofH * 0.35, uD * 0.85);
    upper.translate(0, bodyH + roofH * 0.825, 0);
    parts.push({ geo: lower, tag: "roof" }, { geo: upper, tag: "roof" });

    for (const dx of [-uW * 0.25, uW * 0.25]) {
      const dorm = new geomT.BoxGeometry(1.4, 1.4, 1.5);
      dorm.translate(dx, bodyH + 0.9, uD * 0.32);
      const dormRoof = new geomT.BoxGeometry(1.5, 0.25, 1.6);
      dormRoof.translate(dx, bodyH + 1.65, uD * 0.32);
      parts.push({ geo: dorm, tag: "wall" }, { geo: dormRoof, tag: "roof" });
    }

    const chim = new geomT.BoxGeometry(1.0, 2.8, 1.0);
    chim.translate(uW * 0.35, bodyH + 1.4, -uD * 0.2);
    const chimCap = new geomT.BoxGeometry(1.2, 0.25, 1.2);
    chimCap.translate(uW * 0.35, bodyH + 2.9, -uD * 0.2);
    parts.push({ geo: chim, tag: "wall" }, { geo: chimCap, tag: "roof" });

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.92, bodyH, 20);
    body.translate(0, bodyH / 2, 0);
    const shop = new geomT.BoxGeometry(footW * 0.94, 4.0, 20.4);
    shop.translate(0, 2.0, 0);
    const roof = new geomT.BoxGeometry(footW * 0.92, roofH, 20);
    roof.translate(0, bodyH + roofH / 2, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: shop, tag: "wall" },
      { geo: roof, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW, totalH, 20);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-highstreet-terrace-${seed}`,
    typology: "bld-highstreet-terrace",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: mat,
    lod: [
      { level: 0, tris: 594, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

// =============================================================================
// 12. BLD-BUSINESS-PARK
// =============================================================================
export function bldBusinessParkBlock(seed = "buspark-0", options = {}, T = THREE) {
  const footW = 32;
  const footD = 48;
  const bodyH = 12.0;
  const totalH = 16.0;

  const wallCol = WALLS.MIDRISE[1];
  const roofCol = ROOFS.MIDRISE[0];
  const mat = { wall: wallCol, roof: roofCol };

  function buildLOD0(geomT = T) {
    const parts = [];
    const bW = footW * 0.82;
    const bD = footD * 0.82;
    const body = new geomT.BoxGeometry(bW, bodyH, bD);
    body.translate(0, bodyH / 2, 0);
    parts.push({ geo: body, tag: "wall" });

    const atriumD = Math.min(3.5, (footD - bD) / 2 * 0.85);
    const atrium = new geomT.BoxGeometry(10.0, bodyH + 1.0, atriumD);
    atrium.translate(0, (bodyH + 1.0) / 2, bD / 2 + atriumD / 2);
    const canopy = new geomT.BoxGeometry(11.0, 0.4, atriumD * 0.8);
    canopy.translate(0, 4.2, bD / 2 + atriumD / 2);
    parts.push({ geo: atrium, tag: "wall" }, { geo: canopy, tag: "roof" });

    for (let s = 1; s < 3; s++) {
      const louver = new geomT.BoxGeometry(bW * 0.98, 0.2, 1.2);
      louver.translate(0, s * 4 + 3.2, bD / 2 + 0.6);
      parts.push({ geo: louver, tag: "roof" });
    }

    for (let s = 0; s < 3; s++) {
      const spandrel = new geomT.BoxGeometry(bW * 1.01, 0.6, bD * 1.01);
      spandrel.translate(0, s * 4 + 2.0, 0);
      parts.push({ geo: spandrel, tag: "wall" });
    }

    const roofScreen = new geomT.BoxGeometry(bW * 0.7, 2.5, bD * 0.7);
    roofScreen.translate(0, bodyH + 1.25, 0);
    const solarArray = new geomT.BoxGeometry(12.0, 0.3, 16.0);
    solarArray.translate(0, bodyH + 2.6, 0);
    const hvac1 = new geomT.BoxGeometry(3.5, 1.6, 3.5);
    hvac1.translate(-6.0, bodyH + 1.0, -8.0);
    const hvac2 = new geomT.BoxGeometry(3.5, 1.6, 3.5);
    hvac2.translate(6.0, bodyH + 1.0, -8.0);

    parts.push(
      { geo: roofScreen, tag: "roof" },
      { geo: solarArray, tag: "roof" },
      { geo: hvac1, tag: "roof" },
      { geo: hvac2, tag: "roof" }
    );

    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, true);
  }

  function buildLOD1(geomT = T) {
    const parts = [];
    const body = new geomT.BoxGeometry(footW * 0.82, bodyH, footD * 0.82);
    body.translate(0, bodyH / 2, 0);
    const atriumD = Math.min(3.5, (footD - footD * 0.82) / 2 * 0.85);
    const atrium = new geomT.BoxGeometry(10.0, bodyH + 1.0, atriumD);
    atrium.translate(0, (bodyH + 1.0) / 2, (footD * 0.82) / 2 + atriumD / 2);
    const roofScreen = new geomT.BoxGeometry(footW * 0.60, 2.5, footD * 0.60);
    roofScreen.translate(0, bodyH + 1.25, 0);
    parts.push(
      { geo: body, tag: "wall" },
      { geo: atrium, tag: "wall" },
      { geo: roofScreen, tag: "roof" }
    );
    return mergeWithMassingDepth(parts, mat, geomT, footW, footD, false);
  }

  function buildLOD2(geomT = T) {
    const b = new geomT.BoxGeometry(footW * 0.85, totalH, footD * 0.85);
    b.translate(0, totalH / 2, 0);
    return mergeGeometries([{ geo: b, tag: "wall" }], mat, geomT);
  }

  return {
    id: `bld-business-park-${seed}`,
    typology: "bld-business-park",
    kind: "hard",
    footprint: { w: footW, d: footD },
    height: totalH,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    material: mat,
    lod: [
      { level: 0, tris: 294, createGeometry: (geomT) => buildLOD0(geomT || T) },
      { level: 1, tris: 124, createGeometry: (geomT) => buildLOD1(geomT || T) },
      { level: 2, tris: 12, createGeometry: (geomT) => buildLOD2(geomT || T) }
    ]
  };
}

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
    "bld-highstreet-terrace": bldHighStreetTerrace,
    "bld-business-park": bldBusinessParkBlock,
  };
  const gen = map[typology] || bldVilla;
  return gen(seed, options);
}
