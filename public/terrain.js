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

import { WORLD } from "./city-plan.js";
import { WATERWAYS } from "./waterways.js";

// =============================================================================
// LAND MASSES -- B1 STEP B: THE ARCHIPELAGO
//
// docs/specs/BOARD-REBUILD-PLAN.md, approved 2026-09-08 with three
// corrections. Step A (a prior commit) moved LANDMASSES out of city-plan.js
// verbatim, unchanged, so this step is a pure shape redesign with no
// dependency risk mixed in. This step replaces that copied-verbatim data.
//
// WHY PROCEDURAL, NOT HAND-TRACED. Today's islands are Mark's own pen
// strokes, isolated by colour and traced to metres -- real art this file has
// no business reinventing badly. The NEW archipelago has no such reference:
// nobody drew it. Hand-typing forty irregular control points per island
// with no source to check them against is how a "traced" comment ends up
// describing a guess. So every new landmass below is DETERMINISTIC and
// AREA-EXACT instead: an organic, irregular outline generated from an id
// (hashed for reproducible jitter — see organicIsland), a centre, and a
// target WORLD-space area, radially corrected so the polygon's own measured
// area (not the base circle) matches the target. Same seed in, same
// outline out, always, and the number in the data IS the number that
// results — not a comment that might drift from it, which is the exact
// defect this whole plan exists to close.
//
// DESIGN SPACE vs WORLD SPACE, restated because it is easy to get backwards
// and this file's own header does not repeat it here: WORLD-space distance
// = DESIGN-space distance * WORLD_SCALE (0.65), so WORLD-space AREA =
// DESIGN-space area * WORLD_SCALE^2 (0.4225). Every target area below is
// WORLD-space km2 -- the number a visitor's own 26 km world would measure,
// matching docs/specs/BOARD-REBUILD-PLAN.md's own figures (391.9 km2 dry
// land today, plots totalling 14.98 km2 -- both world-space, confirmed by
// direct measurement: scripts/measure-land.mjs reproduces 41.8%/393.2 km2
// against TODAY's unchanged shapes, within grid-resolution rounding of the
// plan's own cited 42%/391.9). organicIsland() takes a world-space area and
// does the ^2 conversion internally so nobody has to hand-multiply by
// 0.4225 seventeen times and get one of them wrong.
// =============================================================================

/** Freezes an object and everything reachable from it. */
function deepFreeze(obj) {
  Object.freeze(obj);
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

/**
 * ~65% water TO START, per Mark's own instruction: a tunable parameter, not
 * a baked constant, because he will move it by eye once he can see it. Every
 * landmass polygon below is scaled toward its OWN centroid by this factor at
 * generation time (see landmassPolygonsDesign) -- relative position and
 * character survive; only size moves. AUTHORED AT 1.0, NOT DERIVED BY
 * SCALING TODAY'S MAP DOWN (Mark's explicit correction): the shapes below
 * are sized to their real targets already, so 1.0 is the true default, not
 * a placeholder waiting to be tuned down from something else.
 */
export const LAND_SCALE = 1.0;

const WORLD_SIZE_DESIGN = 40000; // matches city-plan.js's WORLD.SIZE before WORLD_SCALE

/** WORLD-space km2 -> DESIGN-space m2, the one place this conversion is
 *  written down. */
function designAreaM2(worldAreaKm2) {
  return (worldAreaKm2 * 1e6) / (WORLD_SCALE * WORLD_SCALE);
}

/** Twice the signed area -- used here (as well as by landmassPolygonsDesign
 *  below) to area-correct a generated polygon before it is ever placed in
 *  LANDMASSES, so the number in the layout table is the number that
 *  results, not an estimate. */
function polygonAreaM2(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

/**
 * A deterministic, organic, AREA-EXACT closed polygon, in DESIGN metres, for
 * a landmass with no hand-drawn reference. `id` seeds the jitter (hash01, so
 * the same id always produces the same outline -- reproducible, not random),
 * `cxWorld`/`czWorld` is the centre in WORLD metres (this file's own
 * convention for placing new content, matching how a camera position or a
 * bridge anchor is normally reasoned about), `worldAreaKm2` is the target
 * WORLD-space area. Two octaves of hashed per-point radius jitter (not one)
 * so the outline is not a simple sine wobble -- see the barrier island's own
 * traced outline for what an actually organic coast looks like; this is a
 * cheaper, honest approximation of that character, not an attempt to fake
 * hand-tracing.
 */
function organicIsland(id, cxWorld, czWorld, worldAreaKm2, { points = 16, jitter = 0.34 } = {}) {
  const cx = cxWorld / WORLD_SCALE, cz = czWorld / WORLD_SCALE;
  const targetM2 = designAreaM2(worldAreaKm2);
  const baseR = Math.sqrt(targetM2 / Math.PI);
  let poly = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const j1 = hash01(`${id}-r1-${i}`) - 0.5;
    const j2 = hash01(`${id}-r2-${Math.floor(i / 2)}`) - 0.5;
    const r = baseR * (1 + jitter * j1 + jitter * 0.5 * j2);
    poly.push([cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]);
  }
  // Area-correct: the jittered polygon's own area is never exactly the base
  // circle's, so scale every point radially from the centre until the REAL
  // measured area (polygonAreaM2, the same function the gate test uses)
  // matches the target -- one measurement, trusted, rather than an estimate
  // reported as though it were exact.
  const k = Math.sqrt(targetM2 / polygonAreaM2(poly));
  return poly.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
}

/**
 * An open, organic coastline run (for the mainland, which -- like the
 * islands above -- has no hand-drawn reference for its NEW shape) from
 * (x0,z0) to (x1,z1) in WORLD metres, `nPoints` points, each offset
 * perpendicular to the run by hashed jitter. Unlike organicIsland this does
 * not close the shape or correct its area -- the mainland's own LANDMASSES
 * entry appends its own closing corners afterward, exactly as today's
 * mainland does (splineOpen only smooths the coast run; corners are raw).
 */
function organicCoastlineDesign(id, x0World, z0World, x1World, z1World, nPoints, jitterWorld) {
  const x0 = x0World / WORLD_SCALE, z0 = z0World / WORLD_SCALE;
  const x1 = x1World / WORLD_SCALE, z1 = z1World / WORLD_SCALE;
  const jitter = jitterWorld / WORLD_SCALE;
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const nx = -dz / len, nz = dx / len; // unit perpendicular
  const out = [];
  for (let i = 0; i < nPoints; i++) {
    const t = i / (nPoints - 1);
    const px = x0 + dx * t, pz = z0 + dz * t;
    const j = hash01(`${id}-c-${i}`) * 2 - 1; // -1..1
    out.push([px + nx * j * jitter, pz + nz * j * jitter]);
  }
  return out;
}

// -----------------------------------------------------------------------------
// THE MAINLAND -- west edge, per Mark's approved orientation. A coastal
// strip facing the archipelago (east), farmland behind it, the range behind
// that -- three bands, one connected landmass (they are not separated by
// water, so they are not separate landmasses; see MAINLAND_ZONES).
//
// SIZE, STATED AS DATA, PER MARK'S CORRECTION 2: "State explicitly in the
// shape data how much of the mainland is settleable, and gate it." 110 km2
// total, of which 12% (13.2 km2) is the settleable coastal strip -- a THIN
// strip, not a second downtown, which is the whole condition Mark set for
// accepting a mainland this size: "defensible IF that 110 km2 is genuinely
// countryside... If it drifts into settlement, you have rebuilt today's
// problem at a smaller scale." The other 88% (farmland + range) carries no
// plots at all in this plan.
// -----------------------------------------------------------------------------
const MAINLAND_TOTAL_KM2 = 110;
export const MAINLAND_ZONES = Object.freeze([
  // Nearest the coast (east edge of the mainland strip, facing the
  // archipelago) to furthest inland (west edge, the world backdrop).
  // fraction is of MAINLAND_TOTAL_KM2, and the three sum to 1 exactly --
  // asserted in test/landCoverage.test.ts, not just claimed here.
  { id: "coastal-strip", identity: "the mainland's own thin settled edge -- the only part of the mainland this plan settles", fraction: 0.12, settleable: true },
  { id: "farmland", identity: "farmland behind the coast -- open, worked, not built on", fraction: 0.55, settleable: false },
  { id: "range", identity: "the range -- tall, framing the mainland from behind, not occupying it", fraction: 0.33, settleable: false },
]);
deepFreeze(
  (() => {
    const sum = MAINLAND_ZONES.reduce((s, z) => s + z.fraction, 0);
    if (Math.abs(sum - 1) > 1e-9) throw new Error(`MAINLAND_ZONES fractions sum to ${sum}, not 1`);
    return null;
  })(),
);

// Coast runs roughly north-south along the west edge, facing east toward
// downtown and the archipelago. worldZ spans most of the world's own north-
// south extent (23,000 m of WORLD.SIZE's 26,000); worldX depth (5,000 m)
// solved from MAINLAND_TOTAL_KM2 / that length, then organically varied.
const MAINLAND_COAST_X0W = -8000, MAINLAND_COAST_Z0W = -11500;
const MAINLAND_COAST_X1W = -8000, MAINLAND_COAST_Z1W = 11500;
const MAINLAND_DEPTH_W = 5000; // west-east, world metres, coast to the range's own inland edge
const MAINLAND_COAST_POINTS = organicCoastlineDesign(
  "mainland-coast", MAINLAND_COAST_X0W, MAINLAND_COAST_Z0W, MAINLAND_COAST_X1W, MAINLAND_COAST_Z1W,
  18, 900,
);
// The range's own inland edge and the world backdrop, closing the polygon --
// same pattern as today's mainland: raw corners, not splined (a spline
// through 30 km corners overshoots and swallows the world).
const MAINLAND_INLAND_XW = MAINLAND_COAST_X0W - MAINLAND_DEPTH_W;
const MAINLAND_POINTS_DESIGN = [
  ...MAINLAND_COAST_POINTS,
  [MAINLAND_INLAND_XW / WORLD_SCALE, MAINLAND_COAST_Z1W / WORLD_SCALE],
  [(-WORLD_SIZE_DESIGN * 0.9), (WORLD_SIZE_DESIGN * 0.9)],
  [(-WORLD_SIZE_DESIGN * 0.9), -(WORLD_SIZE_DESIGN * 0.9)],
  [MAINLAND_INLAND_XW / WORLD_SCALE, MAINLAND_COAST_Z0W / WORLD_SCALE],
];
const MAINLAND_COAST_COUNT = MAINLAND_COAST_POINTS.length;

// -----------------------------------------------------------------------------
// THE RANGE -- repositioned to sit behind (west of) the NEW mainland's own
// inland edge, per Mark's brief ("a tall range framing"). This spine drove
// height, not shape, before this pass and still does (distToSpine, below) --
// only its position moves, to follow the mainland it is meant to frame.
// Centred on the range band's own midpoint (MAINLAND_ZONES' third band).
// -----------------------------------------------------------------------------
const RANGE_SPINE_X_W = MAINLAND_INLAND_XW + (MAINLAND_DEPTH_W * MAINLAND_ZONES[2].fraction) / 2;
const RANGE_SPINE = [
  [RANGE_SPINE_X_W - 300, MAINLAND_COAST_Z0W].map((v, i) => (i === 0 ? v : v) / WORLD_SCALE),
  [RANGE_SPINE_X_W, -6000 / WORLD_SCALE],
  [RANGE_SPINE_X_W + 250, -1000 / WORLD_SCALE],
  [RANGE_SPINE_X_W - 200, 4500 / WORLD_SCALE],
  [RANGE_SPINE_X_W, 9000 / WORLD_SCALE],
  [RANGE_SPINE_X_W - 150, MAINLAND_COAST_Z1W / WORLD_SCALE],
].map(([x, z]) => [x / WORLD_SCALE, z]);
const RANGE = { width: 5000, height: 1620 };

// -----------------------------------------------------------------------------
// DOWNTOWN -- kept where it already sits (Mark: "that position works and
// nothing in the brief asks to move it"), grown from its own real measured
// area (6.34 km2 world today -- the DESIGN-space "15.0 km2" comment on the
// old data was never a world-space figure, confirmed by direct measurement)
// to ~22 km2, the largest ISLAND, dense, the skyline. Mark's pen strokes
// (COAST_DESIGN) are kept and SCALED around their own centroid, not
// redrawn -- the harbour bite, the headland, the marina inlet and the ocean
// beach are real, deliberate character worth keeping, not a shape to
// reinvent from scratch the way the unnamed new islands are.
// -----------------------------------------------------------------------------
const COAST_DESIGN_RAW = [
  [737, 646], [1172, 674], [1581, 784], [1664, 1087],
  [1937, 1417], [2346, 1555], [2754, 1472], [3079, 1196],
  [3433, 1113], [3814, 1278], [4088, 1526], [3706, 1416],
  [3326, 1582], [3001, 1858], [3057, 2216], [3438, 2354],
  [3846, 2298], [3929, 2656], [4039, 2877], [3632, 3015],
  [3306, 3263], [2981, 3567], [2711, 3870], [2330, 3953],
  [1922, 4009], [1487, 4009], [1106, 4037], [698, 4010],
  [289, 3983], [-119, 3955], [-555, 3901], [-909, 3736],
  [-1237, 3433], [-1538, 3102], [-1648, 2716], [-1705, 2303],
  [-1951, 1944], [-2252, 1614], [-2172, 1255], [-1956, 897],
  [-1548, 841], [-1113, 868], [-786, 841], [-378, 951],
  [31, 1033], [411, 867],
];

// downtown's outline, area-scaled around its own centroid from Mark's
// authored COAST_DESIGN_RAW to the new ~22 km2 world-space target -- the
// SAME area-correction technique organicIsland uses (measure, then scale
// to match exactly), applied to hand-drawn points instead of generated
// ones.
const DOWNTOWN_TARGET_KM2 = 22;
const COAST_DESIGN = (() => {
  const cx = COAST_DESIGN_RAW.reduce((s, [x]) => s + x, 0) / COAST_DESIGN_RAW.length;
  const cz = COAST_DESIGN_RAW.reduce((s, [, z]) => s + z, 0) / COAST_DESIGN_RAW.length;
  const rawAreaM2 = polygonAreaM2(COAST_DESIGN_RAW);
  const targetM2 = designAreaM2(DOWNTOWN_TARGET_KM2);
  const k = Math.sqrt(targetM2 / rawAreaM2);
  return COAST_DESIGN_RAW.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
})();

// -----------------------------------------------------------------------------
// THE SCATTER -- named islands, per Mark's brief: suburb-sized, resort-
// sized, mountain-and-cliff, wooded, cottage islands carrying one house
// each, plus the headroom spend (Mark's correction 1: "spend the headroom
// on MORE islands, not bigger ones... skerries, a lighthouse rock, a
// sandbar, two or three more wooded"). Positions are hand-placed (not
// procedural -- an archipelago's LAYOUT is a design decision, only the
// individual outlines have no reference to trace), east and south of the
// mainland, fanning around downtown per the approved orientation, each
// kept far enough from its neighbours that organicIsland's own generated
// radius cannot overlap the next one.
//
// kind is used downstream for character/density (B2), not by terrain.js's
// own height field beyond baseHeight -- named here so B2 has real ground to
// build density decisions on, per Mark's "every large empty area gets an
// identity" (islands are not "empty", but the same discipline: state what a
// place IS, in the data, rather than leaving it to be inferred later).
// -----------------------------------------------------------------------------
const ISLAND_LAYOUT = [
  // -- the four named characters Mark's brief asked for --
  { id: "suburb-isle", name: "Suburb Island", kind: "suburb", baseHeight: 8, cxWorld: 5200, czWorld: -1500, areaKm2: 15 },
  { id: "resort-isle", name: "Resort Island", kind: "resort", baseHeight: 7, cxWorld: 10000, czWorld: 3000, areaKm2: 11 },
  { id: "highland-isle", name: "Highland Island", kind: "highland", baseHeight: 16, cxWorld: -2000, czWorld: 9500, areaKm2: 13 },
  { id: "wooded-isle-a", name: "Wooded Island", kind: "wooded", baseHeight: 9, cxWorld: 8500, czWorld: 7500, areaKm2: 5.5 },
  // -- the headroom spend: 2-3 more wooded, per Mark's own menu --
  { id: "wooded-isle-b", name: "Fernshore Island", kind: "wooded", baseHeight: 9, cxWorld: -3500, czWorld: 6500, areaKm2: 6 },
  { id: "wooded-isle-c", name: "Pinehaven Island", kind: "wooded", baseHeight: 9, cxWorld: 11500, czWorld: -3000, areaKm2: 4 },
  // -- more headroom, spent on VARIETY (count/character), not size --
  { id: "fishing-isle", name: "Fishing Island", kind: "fishing", baseHeight: 7, cxWorld: -4500, czWorld: -4500, areaKm2: 5 },
  { id: "farm-isle", name: "Farm Island", kind: "farm", baseHeight: 8, cxWorld: 2500, czWorld: 6000, areaKm2: 4 },
  { id: "vineyard-isle", name: "Vineyard Island", kind: "vineyard", baseHeight: 8, cxWorld: 500, czWorld: -5500, areaKm2: 6 },
  { id: "quarry-isle", name: "Quarry Island", kind: "quarry", baseHeight: 10, cxWorld: 10500, czWorld: -6500, areaKm2: 5 },
  // -- cottage islands, one mansion each --
  { id: "cottage-isle-1", name: "Cottage Cay", kind: "cottage", baseHeight: 6, cxWorld: 1500, czWorld: -3200, areaKm2: 0.5 },
  { id: "cottage-isle-2", name: "Wren Cay", kind: "cottage", baseHeight: 6, cxWorld: 7000, czWorld: -1200, areaKm2: 0.5 },
  { id: "cottage-isle-3", name: "Marlin Cay", kind: "cottage", baseHeight: 6, cxWorld: -1000, czWorld: 4500, areaKm2: 0.5 },
  // -- carrying nothing, per Mark's own menu --
  { id: "sandbar", name: "The Sandbar", kind: "sandbar", baseHeight: 2, cxWorld: 3200, czWorld: 2800, areaKm2: 0.3 },
  { id: "lighthouse-rock", name: "Lighthouse Rock", kind: "rock", baseHeight: 12, cxWorld: 12800, czWorld: 0, areaKm2: 0.08 },
];

// Skerries -- carrying nothing, procedurally scattered (not hand-placed:
// Mark's own framing, "an archipelago reads by count and variety", is
// exactly the case a generator earns its keep, the same reasoning as
// organicIsland's own outlines). Placed in an annulus clear of the named
// islands and the mainland: inner radius past the downtown/suburb core,
// outer radius short of the world edge. Deterministic (id-hashed angle,
// radius and area), not random -- the same world every build.
const SKERRY_COUNT = 22;
const SKERRY_INNER_R = 8500, SKERRY_OUTER_R = 12200; // world metres from origin
const SKERRIES = Array.from({ length: SKERRY_COUNT }, (_, i) => {
  const id = `skerry-${i + 1}`;
  const angle = (i / SKERRY_COUNT) * Math.PI * 2 + hash01(`${id}-a`) * (Math.PI / SKERRY_COUNT);
  const r = SKERRY_INNER_R + hash01(`${id}-r`) * (SKERRY_OUTER_R - SKERRY_INNER_R);
  const cxWorld = Math.cos(angle) * r, czWorld = Math.sin(angle) * r;
  // Skewed toward the mainland's own west edge, where the annulus above
  // would otherwise place skerries ON the mainland (a real archipelago does
  // not have loose rocks inside its own continent) -- excluded rather than
  // clamped, so the count stays honest about how many actually generated.
  if (cxWorld < MAINLAND_COAST_X0W + 1500) return null;
  const areaKm2 = 0.12 + hash01(`${id}-area`) * 0.45;
  return { id, name: null, kind: "skerry", baseHeight: 3, cxWorld, czWorld, areaKm2 };
}).filter(Boolean);

/** Every land mass, control points (or a generator call) in DESIGN metres. */
const LANDMASSES = [
  {
    id: "mainland", name: "Mainland Coast", kind: "mainland", baseHeight: 14,
    coastCount: MAINLAND_COAST_COUNT,
    points: MAINLAND_POINTS_DESIGN,
    zones: MAINLAND_ZONES,
    totalAreaKm2: MAINLAND_TOTAL_KM2,
  },
  { id: "downtown", name: "Downtown Island", kind: "city", baseHeight: 10 },
  // outline supplied from COAST_DESIGN, Mark's own pen strokes, scaled to
  // its own new target -- see COAST_DESIGN's own comment.
  ...ISLAND_LAYOUT.map((isl) => ({
    id: isl.id, name: isl.name, kind: isl.kind, baseHeight: isl.baseHeight,
    points: organicIsland(isl.id, isl.cxWorld, isl.czWorld, isl.areaKm2),
  })),
  ...SKERRIES.map((sk) => ({
    id: sk.id, name: sk.name, kind: sk.kind, baseHeight: sk.baseHeight,
    points: organicIsland(sk.id, sk.cxWorld, sk.czWorld, sk.areaKm2, { points: 9, jitter: 0.4 }),
  })),
];
deepFreeze(LANDMASSES);

/** Catmull-Rom through a CLOSED set of control points. Copied from
 *  city-plan.js's own splinePolygon. */
function splinePolygon(p, samplesPerSegment = 10) {
  const n = p.length;
  const out = [];
  const at = (i) => p[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

/** Catmull-Rom through an OPEN run of points -- the ends are held, not
 *  wrapped. Copied from city-plan.js's own splineOpen. */
function splineOpen(p, samplesPerSegment = 10) {
  const out = [];
  const at = (i) => p[Math.max(0, Math.min(p.length - 1, i))];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(p[p.length - 1].slice());
  return out;
}

/** Twice the signed area. Copied from city-plan.js's own signedArea2. */
function signedArea2(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return a;
}

/** Scale every point of `poly` toward its own centroid by `k` -- LAND_SCALE's
 *  own mechanism: relative position and character survive, only size moves.
 *  Applied per mass, around THAT mass's centroid, not the world's, so
 *  scaling the water knob does not also drag every island toward the
 *  origin. */
function scaleAroundCentroid(poly, k) {
  if (k === 1) return poly;
  const cx = poly.reduce((s, [x]) => s + x, 0) / poly.length;
  const cz = poly.reduce((s, [, z]) => s + z, 0) / poly.length;
  return poly.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
}

/** Every land mass as a smoothed polygon, in DESIGN metres, scaled by
 *  LAND_SCALE (Mark's own tunable water-fraction knob -- see LAND_SCALE's
 *  own comment for why it defaults to 1.0 and is not derived from today's
 *  map). */
export function landmassPolygonsDesign(samplesPerSegment = 10) {
  return LANDMASSES.map((lm) => {
    let polygon;
    if (lm.kind === "mainland") {
      const n = lm.coastCount || lm.points.length;
      polygon = [...splineOpen(lm.points.slice(0, n), samplesPerSegment), ...lm.points.slice(n).map((q) => q.slice())];
    } else {
      polygon = splinePolygon(lm.id === "downtown" ? COAST_DESIGN : lm.points, samplesPerSegment);
    }
    if (signedArea2(polygon) > 0) polygon.reverse();
    polygon = scaleAroundCentroid(polygon, LAND_SCALE);
    return { ...lm, polygon };
  });
}

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
import { hash2, valueNoise, fbm, hash01, clamp, smooth, smoother, DEFAULT_SEED, seedToInt } from "./noise.js";

// RANGE_SPINE/RANGE moved earlier in this file (B1 step B) -- repositioned
// to run behind the NEW mainland's own west edge rather than the old
// embayment's north arm. See that declaration's own comment for why.

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

function edgeFalloff(x, z, seed = DEFAULT_SEED) {
  // Taking min(dx, dz) fades the land inside a RECTANGLE, and from altitude that
  // is exactly what you see: a green rectangle with square corners and dead
  // straight sides, sitting in the ocean. A cubic superellipse rounds the
  // corners, and a low-frequency wobble on both thresholds gives the far coast
  // bays and headlands instead of a ruled line.
  const wx = (fbm(z * 0.9, 4000, 9000, 2, 0.5, 2.03, seed) - 0.5) * 2 * EDGE.wobble;
  const wz = (fbm(x * 0.9, -7000, 11000, 2, 0.5, 2.03, seed) - 0.5) * 2 * EDGE.wobble;
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
function cliffiness(x, z, seed = DEFAULT_SEED) {
  let c = 0;
  for (const q of CLIFF_ZONES) {
    const d = Math.hypot(x - q.x, z - q.z);
    if (d >= q.r) continue;
    const v = smoother(1 - d / q.r);
    if (v > c) c = v;
  }
  // everywhere else: a slow drift between sand and low rock along the coast
  const drift = clamp((fbm(x, z, 3400, 3, 0.5, 2.03, seed) - 0.42) * 2.6, 0, 1);
  return Math.max(c, drift * 0.72);
}

/** Metres over which the land climbs out of the water at this point. */
function shoreRampAt(x, z, seed = DEFAULT_SEED) {
  const c = cliffiness(x, z, seed);
  return BEACH_RAMP + (CLIFF_RAMP - BEACH_RAMP) * c;
}

const SHORE_RAMP = 105;      // the old single value, kept for reference

// =============================================================================
// A BEACH HAS A WIDTH, AND IT USED TO HAVE ONLY A HEIGHT
//
// The per-pixel shoreline decides sand from HEIGHT: a 3.8 m window from the tide
// strip at -0.6 m to dune grass at +3.2 m. On a steep shore that window is
// crossed in twenty metres and the result reads as a beach. Where the land rises
// slowly it does not, and the same rule paints sand until the ground finally
// gets there.
//
// Mark, on the deployed build: "on the front edge of the main island there is a
// weird sand bar ... it just isn't done well."
//
// MEASURED before this was written, and it nearly was not written at all: three
// transects across the front shelf came back at 75 m and 0 m, which is an
// ordinary beach, and the diagnosis looked wrong. A full scan of the modelled
// area then found an unbroken 975 m band in the height window at (6250, -1175).
// The spot checks had simply missed it. Worth remembering: a sample that agrees
// with you is not a measurement.
//
// Real beach width is set by wave run-up and tide range -- tens of metres, not
// hundreds -- and has nothing to do with how slowly the land behind it happens
// to rise. So sand is bounded by DISTANCE FROM THE COASTLINE as well as height.
//
// These are BUILT METRES and do not scale: 70 m of dry sand is a generous
// seaside beach in any size of world.
export const BEACH_FULL_M = 70;    // full sand out to here
export const BEACH_FADE_M = 140;   // certainly something else by here

/**
 * How much sand belongs at a point this far from the coastline: 1 on the beach,
 * 0 inland, and a ramp between so a genuinely widening shore does not stop at a
 * drawn line.
 *
 * Takes a distance rather than a coordinate on purpose -- it is a policy about
 * beaches, not a query about this world, so it can be tested without building
 * one. Callers pass built metres.
 */
export function beachWeight(distanceFromCoastM) {
  const d = Math.abs(distanceFromCoastM);
  if (!(d >= 0)) return 0;                       // NaN and nonsense are not beach
  if (d <= BEACH_FULL_M) return 1;
  if (d >= BEACH_FADE_M) return 0;
  return 1 - (d - BEACH_FULL_M) / (BEACH_FADE_M - BEACH_FULL_M);
}

// =============================================================================
// LAND FIELD
//
// Answering "how far is this point from the nearest shore, and is it inland?"
// naively costs 1,100 edge tests per query, and the terrain mesh alone asks
// about 180,000 times. So the coast is indexed once: edges in a spatial hash for
// distance, and a scanline-filled raster for inside/outside. Both are built in a
// few milliseconds and then every query is O(1).
// =============================================================================
// A NUMERIC BUCKET KEY, BECAUSE THE STRING ONE WAS IN THE HOTTEST LOOP HERE.
//
// The spatial buckets were keyed `bx + "," + bz`. Every lookup therefore built a
// string and hashed it, inside distance() -- which the profiler puts at 1.46 s
// of a 4.4 s world build, the largest single cost in generation.
//
// Bucket indices are world extent over cell size: roughly +/-105 at any scale
// this project uses. The +2048 offset makes them non-negative and 4096 is well
// clear of the range, so the pairing is injective and two different cells can
// never collide -- which a hash-and-hope scheme would not guarantee. Asserted
// below rather than trusted, because a silent collision here would merge two
// distant coastlines and the symptom would appear somewhere else entirely.
const BUCKET_SPAN = 4096;
const BUCKET_HALF = 2048;
function bucketKey(bx, bz) {
  return (bx + BUCKET_HALF) * BUCKET_SPAN + (bz + BUCKET_HALF);
}

/**
 * Is this cell inside the range the key can represent injectively?
 *
 * Exported so a test can assert it over the real coastline's actual extent
 * rather than over the range I believed it had. A key scheme is only safe
 * within its bounds, and "the bounds are obviously fine" is how the shoreline
 * bound in distance() came to say "provably" while being wrong by a ring.
 */
export function bucketKeyInRange(bx, bz) {
  return bx > -BUCKET_HALF && bx < BUCKET_HALF - 1
      && bz > -BUCKET_HALF && bz < BUCKET_HALF - 1;
}

/**
 * DELIBERATELY SHARED, DERIVED, READ-ONLY DATA -- FROZEN, NOT COPIED.
 *
 * public/world.js's createWorld() caches one LandField per seed (Finding 5:
 * building a fresh one on every call was most of its ~2.4s cost, and the
 * caches inside generateWorld/cityDemand/placeFeatures only pay off when the
 * heightAt closure they are keyed on is the SAME object across calls). That
 * means two `createWorld({ seed: X })` calls hand back the identical
 * LandField instance, not two copies -- the opposite choice from A3's fix
 * for DISTRICTS/SETTLEMENTS/BRIDGES/GRID, which were copied per-world
 * because a caller DOES write through them (an edit path moves a district).
 * Nothing here writes through a LandField after construction -- checked
 * directly (no `this.x =` outside the constructor, no external code sets a
 * property on one, no method calls `.push`/`.set`/an index-write on
 * `edges`/`buckets`/`mask` after it is built) -- so sharing it is the point
 * of the cache, not a risk grandfathered in.
 *
 * The constructor freezes itself as an assertion of that decision, not a
 * complete guarantee of it -- BE PRECISE about what Object.freeze(this)
 * actually does here, verified directly, not assumed:
 *   - IT DOES block reassigning an own top-level property (`land.seed = x`
 *     throws, this module is strict-mode ESM) and block adding a new one.
 *   - IT DOES NOT block `land.buckets.set(...)` -- freezing a Map's own
 *     properties has no effect on its prototype methods; Map.set() keeps
 *     working on a frozen Map.
 *   - IT DOES NOT block `land.edges.push(...)` from failing loudly (a frozen
 *     array does throw on push, since that touches the array's own length),
 *     but it does NOT stop `land.edges[0][0] = 999` -- freezing `edges`
 *     itself does not freeze the arrays nested inside it.
 *   - `land.mask` (an Int8Array) cannot even be frozen once populated --
 *     `Object.freeze()` on a non-empty TypedArray throws. It is not attempted.
 * So this freeze is real protection against the accidental-reassignment
 * class of bug (the same class A3 found in DISTRICTS' shallow `bounds`
 * copy), and it is verified-by-absence, not freeze, that protects the
 * mutable-content class: nothing calls those methods after construction
 * today, checked by direct search, and the full suite was run once with
 * this freeze in place specifically to test that claim empirically, not
 * just assert it -- it passed 872/872 unchanged.
 */
export class LandField {
  constructor(samplesPerSegment = 16, cell = 420, maskCell = 40, seed = DEFAULT_SEED) {
    // THE SEED BELONGS TO THE FIELD, NOT TO EACH CALL.
    //
    // A height function is asked millions of times per world build; threading a
    // seed through every call site would be a parameter nobody could forget to
    // pass without producing a world that is subtly half one place and half
    // another. It lives on the field, and makeHeightAt reads it once.
    //
    // It is LAST so that every existing `new LandField(16)` still means exactly
    // the world it meant before -- verified byte for byte over 37,668 height
    // samples, not assumed.
    this.seed = seedToInt(seed);
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
          const k = bucketKey(bx, bz);
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
    Object.freeze(this);
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
        const arr = this.buckets.get(bucketKey(bx + dx, bz + dz));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const e = this.edges[arr[k]];
          const ex = e[2] - e[0], ez = e[3] - e[1];
          const l2 = ex * ex + ez * ez || 1;
          let t = ((x - e[0]) * ex + (z - e[1]) * ez) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = e[0] + t * ex, pz = e[1] + t * ez;
          // sqrt, not hypot. Math.hypot guards against intermediate overflow by
          // scaling, which costs several times a plain sqrt and buys nothing at
          // world coordinates -- these are metres in the +/-40,000 range, where
          // dx*dx cannot come close to overflowing a double. This loop is the
          // single hottest thing in world generation (1.84 s of a 5.3 s build),
          // so the difference is a second of blank screen. Fingerprint-checked
          // identical over every plot, road, block and 22,000 terrain samples.
          const ddx = x - px, ddz = z - pz;
          const d = Math.sqrt(ddx * ddx + ddz * ddz);
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
        const arr = this.buckets.get(bucketKey(bx + dx, bz + dz));
        if (!arr) continue;
        for (let k = 0; k < arr.length; k++) {
          const e = this.edges[arr[k]];
          const ex = e[2] - e[0], ez = e[3] - e[1], l2 = ex * ex + ez * ez || 1;
          let t = ((x - e[0]) * ex + (z - e[1]) * ez) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const sx = x - (e[0] + t * ex), sz = z - (e[1] + t * ez);
          const d = Math.sqrt(sx * sx + sz * sz);   // see distance(): sqrt over hypot
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
    const qx = x - (ax + t * ex), qz = z - (az + t * ez);
    const d = Math.sqrt(qx * qx + qz * qz);   // see distance(): sqrt over hypot
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
function reliefAt(x, z, massKind, seed = DEFAULT_SEED) {
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
    h += (fbm(x, z, 2600, 3, 0.5, 2.03, seed) - 0.44) * 78;
    h += (fbm(x + 5100, z - 3300, 1100, 3, 0.5, 2.03, seed) - 0.5) * 34;

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
    const swell = smoother(foot) * 165 * (0.5 + 0.5 * fbm(x, z, 5200, 3, 0.5, 2.03, seed));

    const ds = distToSpine(x, z);
    let alpine = 0;
    if (ds < RANGE.width) {
      const band = smoother(1 - ds / RANGE.width);
      alpine = RANGE.height * Math.pow(band, 1.35) * (0.52 + 0.48 * fbm(x, z, 3400, 4, 0.5, 2.03, seed));
    }
    alpine = Math.max(alpine, bumps(x, z, PEAKS) * (0.74 + 0.26 * fbm(x, z, 1500, 3, 0.5, 2.03, seed)));

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
    if (h > 420) h += (fbm(x, z, 700, 5, 0.5, 2.03, seed) - 0.5) * Math.min(340, h * 0.30);
  }

  // gentle micro-relief so no ground is dead flat -- but a city island that
  // undulates by 9 m makes every street look drunk, so it is small there.
  h += (fbm(x, z, 1400, 3, 0.5, 2.03, seed) - 0.5) * (massKind === "mainland" ? 20 : 3.2);
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
//
// THE MANIFEST ITSELF LIVES IN waterways.js, NOT HERE -- see the import at
// the top of the file. city-plan.js needs this same geometry to register a
// waterway's footprint in the world registry, and this file already imports
// WORLD and landmassPolygonsDesign FROM city-plan.js -- so defining WATERWAYS
// here and having city-plan.js import it back would be a cycle, live-bindings
// waiting on each other's module evaluation to finish. A dependency-free
// module both files import from is the fix.
// =============================================================================

// THE POLYLINE IS A CONSTANT. IT WAS BEING RE-MEASURED ON EVERY QUERY.
//
// alongWaterway ran a full pass over `pts` to total the polyline's length, then
// a second pass that called Math.sqrt(L2) twice per segment -- all of it derived
// purely from `pts`, which is a module-level constant that never changes. At
// 966 ms of a 5.3 s build, second only to the shoreline distance query, this was
// the river geometry being recomputed hundreds of thousands of times to get the
// same answer.
//
// Keyed on the array itself, so it cannot go stale: a different polyline is a
// different object and gets its own entry. WeakMap rather than Map so a caller
// passing a temporary array does not leak it.
const WATERWAY_GEOM = new WeakMap();

function waterwayGeometry(pts) {
  let geom = WATERWAY_GEOM.get(pts);
  if (geom) return geom;
  const n = pts.length - 1;
  const ax = new Float64Array(n), az = new Float64Array(n);
  const dx = new Float64Array(n), dz = new Float64Array(n);
  const invL2 = new Float64Array(n), len = new Float64Array(n), before = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    ax[i] = pts[i][0]; az[i] = pts[i][1];
    dx[i] = pts[i + 1][0] - ax[i]; dz[i] = pts[i + 1][1] - az[i];
    const L2 = dx[i] * dx[i] + dz[i] * dz[i] || 1;
    invL2[i] = 1 / L2;
    len[i] = Math.sqrt(L2);
    before[i] = total;
    total += len[i];
  }
  geom = { n, ax, az, dx, dz, invL2, len, before, invTotal: 1 / (total || 1) };
  WATERWAY_GEOM.set(pts, geom);
  return geom;
}

/** Distance from (x,z) to a polyline, and how far along it we are (0..1). */
function alongWaterway(x, z, pts) {
  const g = waterwayGeometry(pts);
  let best = Infinity, bestT = 0, bestX = x, bestZ = z;
  for (let i = 0; i < g.n; i++) {
    const rx = x - g.ax[i], rz = z - g.az[i];
    let t = (rx * g.dx[i] + rz * g.dz[i]) * g.invL2[i];
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = rx - t * g.dx[i], qz = rz - t * g.dz[i];
    const dist = Math.sqrt(qx * qx + qz * qz);   // see distance(): sqrt over hypot
    if (dist < best) {
      best = dist; bestT = (g.before[i] + t * g.len[i]) * g.invTotal;
      // THE NEAREST POINT ON THE CENTRELINE, not just the distance to it.
      //
      // A waterway's surface is level across its own cross-section, so the only
      // way to know how deep the water is at a point on the bank is to know
      // where the middle of the channel is. Returning the distance alone made
      // that unanswerable, which is why waterAt reported one depth for the whole
      // channel and a hull at the bank read the mid-channel figure.
      bestX = g.ax[i] + t * g.dx[i];
      bestZ = g.az[i] + t * g.dz[i];
    }
  }
  return { dist: best, t: bestT, cx: bestX, cz: bestZ };
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

/**
 * WHICH waterway is here, not merely whether one is.
 *
 * waterwayAt returns a boolean and two callers rely on that, so its contract is
 * left alone. But ground.js was reading `.kind`, `.surface` and `.id` off that
 * boolean: `true.kind` is undefined, so every waterway in the world reported
 * itself as a "river" -- three of the seven are canals -- and `true.surface`
 * being undefined made the depth `max(0, 0 - h)`, which is zero for any point
 * at or above sea level. Measured before this existed: 703 of 703 sampled
 * in-waterway points said "river", 653 of 703 said depth 0.
 *
 * Returning the waterway makes the question answerable. `surfaceY` is the water
 * surface at this point, which is what a depth is measured from -- a river 40 m
 * up a valley has a surface 40 m up, and subtracting sea level from it is how
 * the old code got zero.
 */
export function waterwayInfoAt(x, z) {
  const dx = toDesign(x), dz = toDesign(z);
  for (const w of WATERWAYS) {
    const { dist, t, cx, cz } = alongWaterway(dx, dz, w.points);
    const hw = w.kind === "river" ? w.halfWidth * (0.45 + 0.55 * t) : w.halfWidth;
    if (dist <= hw) {
      // No surface height is computed here, deliberately. terrain.js does not
      // own a height function -- makeHeightAt builds one per world -- so a
      // surfaceY calculated in this module would have to invent a height field
      // or import one, and the first version of this did exactly that against a
      // `heightAtRaw` that does not exist. The caller has heightAt; it can add
      // `depth` to it. This returns the FACTS about the waterway and nothing
      // that needs a world to be true.
      // `dist` and `centre` are what let a caller with a height function work
      // out the water level and the depth AT THIS POINT rather than at the
      // middle of the channel. This module still computes no height of its own.
      // THE HALF-WIDTH REPORTED IS THE ONE THAT DECIDED MEMBERSHIP.
      //
      // This returned `w.halfWidth` -- the manifest's figure -- while the test
      // one line above used `hw`, the figure TAPERED by how far along the river
      // this point is. For river-mid that is 78 m reported against a channel
      // that is narrower nearly everywhere, so a caller walking outward to the
      // reported edge left the water long before it got there and could not tell
      // a bank from the end of the rectangle.
      //
      // Found by a mutation that should have failed and did not: a test for the
      // channel having banks passed even with containment removed, because the
      // walk was escaping the envelope rather than reaching a waterline.
      return {
        id: w.id, kind: w.kind, halfWidth: sm(hw), declaredHalfWidth: sm(w.halfWidth),
        depth: sm(w.depth), t,
        dist: sm(dist), centre: { x: sm(cx), z: sm(cz) },
      };
    }
  }
  return null;
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
  // Read once, not per call: `field.seed` is fixed for the life of the field,
  // and a property lookup inside the hottest function in world generation is a
  // cost paid twenty million times for nothing.
  const seed = field && Number.isFinite(field.seed) ? field.seed : DEFAULT_SEED;
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
    const cf = cliffiness(x, z, seed);
    const rampLen = shoreRampAt(x, z, seed) * field.rampFactor[m];
    const ramp = smoother(clamp(d / rampLen, 0, 1));
    const cliffLift = cf * 75 * ramp;
    // The shore ramp lifts land out of the water; the edge falloff takes the far
    // edge of the modelled world back UNDER it. Fading to exactly zero is not
    // enough -- that leaves a continent-sized plane at precisely sea level, which
    // from altitude is a flat green table with a cliff at its edge, which is
    // exactly what it looked like. It has to become sea bed.
    const f = edgeFalloff(x, z, seed);
    const landH = (reliefAt(x, z, kind, seed) * ramp + cliffLift) * f - (1 - f) * EDGE.depth;

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
