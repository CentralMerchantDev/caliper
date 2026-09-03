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
function civic(o, s, x, z, w, d, h, g) {
  const wall = pickLocal(WALLS.CIVIC, s + "w", x, z), roof = pickLocal(ROOFS.CIVIC, s + "r", x, z, 1400);
  const rTyp = rnd(s + "typ");

  const typ = rTyp < 0.22 ? "cathedral"
            : rTyp < 0.42 ? "station"
            : rTyp < 0.62 ? "capitol"
            : rTyp < 0.78 ? "library"
            : rTyp < 0.90 ? "opera" : "courthouse";

  // Stepped monumental stylobate approach
  o.add("wall", x, g + 1.2, z, w * 1.08, 2.4, d * 1.08, 0xdcd4c2);

  if (typ === "cathedral") {
    // Cruciform basilica: Latin cross nave running length/depth, transepts, twin towers
    const naveW = w * 0.44, naveD = d * 0.88;
    const bodyH = pos(h * 0.75, 14);
    // Main nave
    o.add("wall", x, g + 2.4 + bodyH / 2, z, naveW, bodyH, naveD, wall);
    o.add("barrel", x, g + 2.4 + bodyH, z, naveW * 1.02, bodyH * 0.4, naveD * 1.01, roof);
    // Transept wings
    const transW = w * 0.92, transD = d * 0.32;
    o.add("wall", x, g + 2.4 + bodyH * 0.42, z, transW, bodyH * 0.84, transD, wall);
    o.add("pitch", x, g + 2.4 + bodyH * 0.84, z, transW * 1.02, bodyH * 0.32, transD * 1.02, roof);
    // Crossing flèche / lantern
    o.add("pyr", x, g + 2.4 + bodyH * 1.25 + 7, z, 4.2, 14, 4.2, roof);
    // Twin western towers at the entrance (z + d * 0.38)
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
    // Monumental front headhouse
    o.add("wall", x, g + 2.4 + headH / 2, z + d / 2 - headD / 2, w * 0.96, headH, headD, wall);
    o.add("roof", x, g + 2.4 + headH + 0.8, z + d / 2 - headD / 2, w * 0.98, 1.6, headD * 1.04, roof);
    // Portico arches / colonnade across entrance
    const cols = Math.max(4, Math.min(10, Math.round(w / 12)));
    for (let i = 0; i < cols; i++) {
      const cx = x + (-0.5 + (i + 0.5) / cols) * w * 0.88;
      o.add("cyl", cx, g + 2.4 + (headH * 0.6) / 2, z + d / 2 + 1.2, 2.2, headH * 0.6, 2.2, 0xf6f1e4);
    }
    // Colossal arched barrel train shed concourse at rear
    const shedD = d * 0.62;
    const shedH = pos(h * 0.72, 14);
    o.add("wall", x, g + 2.4 + shedH * 0.25, z - d / 2 + shedD / 2, w * 0.86, shedH * 0.5, shedD, 0xb8c2c8);
    o.add("barrel", x, g + 2.4 + shedH * 0.5, z - d / 2 + shedD / 2, w * 0.90, shedH * 0.75, shedD * 1.01, roof);
    // Campanile clock tower at front corner
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
    // Symmetrical wings
    const wingW = w * 0.36, wingD = d * 0.82;
    for (const side of [-1, 1]) {
      const wx = x + side * (w / 2 - wingW / 2);
      o.add("wall", wx, g + 2.4 + bodyH / 2, z, wingW, bodyH, wingD, wall);
      o.add("hip", wx, g + 2.4 + bodyH, z, wingW * 1.06, wingW * 0.24, wingD * 1.06, roof);
    }
    // Central core block
    const coreW = w * 0.38, coreD = d * 0.88;
    o.add("wall", x, g + 2.4 + (bodyH + 3) / 2, z, coreW, bodyH + 3, coreD, wall);
    // Grand front portico with pediment
    o.add("pitch", x, g + 2.4 + bodyH + 3.2, z + coreD / 2 - 2, coreW * 0.92, 5.5, 4.5, roof);
    for (const px of [-coreW * 0.32, -coreW * 0.11, coreW * 0.11, coreW * 0.32]) {
      o.add("cyl", x + px, g + 2.4 + (bodyH + 2) / 2, z + coreD / 2, 1.8, bodyH + 2, 1.8, 0xf6f1e4);
    }
    // Monumental drum + dome + lantern
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
    // Monumental peristyle colonnade across front
    const cols = Math.max(6, Math.min(14, Math.round(w / 8)));
    for (let i = 0; i < cols; i++) {
      const cx = x + (-0.5 + (i + 0.5) / cols) * w * 0.86;
      o.add("cyl", cx, g + 2.4 + (bodyH * 0.72) / 2, z + d * 0.44, 1.8, bodyH * 0.72, 1.8, 0xf6f1e4);
    }
    o.add("roof", x, g + 2.4 + bodyH * 0.72 + 1.2, z + d * 0.44, w * 0.90, 1.4, 4.0, roof);
    // Central rotunda dome
    const rotR = Math.min(w, d) * 0.28;
    o.add("dome", x, g + 2.4 + bodyH + 1.6, z, rotR * 2, rotR * 0.8, rotR * 2, roof);
    // Projecting corner pavilions
    for (const sx of [-1, 1]) {
      const px = x + sx * (w * 0.44);
      o.add("wall", px, g + 2.4 + (bodyH + 4) / 2, z, w * 0.16, bodyH + 4, d * 0.88, wall);
      o.add("hip", px, g + 2.4 + bodyH + 4, z, w * 0.18, 3.2, d * 0.92, roof);
    }
  } else if (typ === "opera") {
    // Grand Opera / Concert Hall: tiered sculpted massing with auditorium shell & fly tower
    const bodyH = pos(h * 0.64, 12);
    // Cantilevered glass foyer podium
    o.add(glassBucket(h), x, g + 2.4 + 4, z + d * 0.25, w * 0.92, 8, d * 0.46, wall);
    o.add("roof", x, g + 2.4 + 8.4, z + d * 0.25, w * 0.96, 1.2, d * 0.50, roof);
    // Main auditorium hall
    const hallW = w * 0.72, hallD = d * 0.60;
    o.add("wall", x, g + 2.4 + bodyH / 2, z - d * 0.05, hallW, bodyH, hallD, wall);
    o.add("barrel", x, g + 2.4 + bodyH, z - d * 0.05, hallW * 1.02, bodyH * 0.4, hallD * 1.01, roof);
    // Soaring stage fly tower at rear
    const flyW = hallW * 0.75, flyD = d * 0.28;
    const flyH = bodyH + 14;
    o.add("wall", x, g + 2.4 + flyH / 2, z - d * 0.34, flyW, flyH, flyD, wall);
    o.add("roof", x, g + 2.4 + flyH + 0.8, z - d * 0.34, flyW * 1.04, 1.6, flyD * 1.04, roof);
  } else {
    // Courthouse / Palace of Justice: rusticated base, monumental portico, pediment, symmetric wings
    const bodyH = pos(h * 0.66, 12);
    o.add("wall", x, g + 2.4 + bodyH / 2, z, w * 0.92, bodyH, d * 0.84, wall);
    o.add("roof", x, g + 2.4 + bodyH + 0.8, z, w * 0.94, 1.6, d * 0.86, roof);
    // Colonnaded hexastyle portico with triangular pediment
    const portW = w * 0.48, portD = d * 0.20;
    o.add("pitch", x, g + 2.4 + bodyH + 1.6, z + d * 0.38, portW * 1.04, 5.0, portD * 1.1, roof);
    for (const px of [-portW * 0.38, -portW * 0.22, -portW * 0.07, portW * 0.07, portW * 0.22, portW * 0.38]) {
      o.add("cyl", x + px, g + 2.4 + (bodyH * 0.78) / 2, z + d * 0.42, 1.6, bodyH * 0.78, 1.6, 0xf6f1e4);
    }
    // Symmetrical flanking pavilions with mansards
    for (const sx of [-1, 1]) {
      const px = x + sx * (w * 0.38);
      o.add("wall", px, g + 2.4 + (bodyH + 2) / 2, z, w * 0.22, bodyH + 2, d * 0.86, wall);
      o.add("hip", px, g + 2.4 + bodyH + 2, z, w * 0.24, 3.5, d * 0.90, roof);
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
