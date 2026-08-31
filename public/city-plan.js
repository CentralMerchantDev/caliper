// =============================================================================
// CALIPER — CITY PLAN
//
// The world as DATA. Nothing here draws anything.
//
// Why this file exists
// --------------------
// The world used to be six thousand lines of hand-placed geometry: every road,
// kerb, seawall and building carried its own hardcoded coordinate. Nothing could
// reason about it, so every change was a hand edit, the numbers drifted apart by
// metres, and a visitor asking to "make that lot bigger" was impossible to serve.
//
// Here the city is a plan: terrain bands, a road network, blocks, and plots with
// real minimum and maximum sizes. The renderer draws whatever the plan says. The
// AI pipeline edits the plan, not the renderer. That is what makes "remove part
// of this road so the lot can take a tower" or "bridge across to a new suburb"
// tractable -- they are edits to a few numbers, verifiable before anything is
// drawn.
//
// Units are metres throughout. +z is south (seaward), -z is north (inland),
// +x is east. Ground datum y = 0.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. WORLD EXTENTS
//
// The old world was 2400 x 2400 with a built area of roughly 150 x 45m -- a
// tabletop model with an ocean painted around it. The downtown island alone is
// now larger than that entire previous world.
// -----------------------------------------------------------------------------
export const WORLD = {
  SIZE: 40000,         // 40 km square. The previous 9.6 km world was smaller
  HORIZON: 52000,      // than Biscayne Bay is WIDE (13 km) -- a square of a
};                     // world, not a world.

// =============================================================================
// LAND MASSES
//
// A coastal city is never one shape in an empty sea. Every reference we worked
// from is an INTERLOCK of land and water: Miami is a barrier island, a lagoon, a
// bay and a mainland; Vancouver is a peninsula, an inlet and a mountain wall;
// Hong Kong is an island, a harbour and a mainland; Malé is a single island
// built edge to edge. The world is now made of several land masses with real
// water between them.
//
// Real distances used to size the gaps:
//   Miami Beach barrier island   15 km long x 1-2 km wide
//   Biscayne Bay                 56 km long, up to 13 km wide
//   Venetian Causeway crossing   4.5 km
//   Victoria Harbour (Hong Kong) ~1.5 km across at its narrowest
//   Downtown Vancouver           3.7 km2
//
// Each mass is a set of control points, smoothed by the same Catmull-Rom used
// for the downtown island. Coordinates are metres; +z is south (seaward).
// =============================================================================
export const LANDMASSES = [
  {
    id: "downtown", name: "Downtown Island", kind: "city", baseHeight: 10,
    // control points supplied below from COAST, the calibrated 3.14 km2 island
  },
  {
    id: "barrier", name: "Ocean Barrier Island", kind: "beach-strip", baseHeight: 6,
    // 16 km of ocean frontage, 900-1600 m deep. Miami Beach proportions.
    points: [
      [-8200, 2050], [-6400, 1960], [-4300, 1900], [-2000, 1870], [ 400, 1880],
      [ 2900, 1930], [ 5200, 2010], [ 7300, 2130], [ 8400, 2260],
      [ 8500, 3050], [ 7200, 3250], [ 5000, 3340], [ 2600, 3380], [ 200, 3360],
      [-2300, 3300], [-4700, 3220], [-6700, 3120], [-8300, 2950],
    ],
  },
  {
    id: "mainland", name: "Mainland Coast", kind: "mainland", baseHeight: 14,
    // A real coast: two bays, a river mouth, headlands. Not a straight edge.
    points: [
      [-19000, -3400], [-15000, -3550], [-12200, -3300], [-10400, -4200],
      [ -8600, -3450], [ -6200, -3250], [ -4800, -4300], [ -3300, -3600],
      [ -1200, -3350], [   900, -3550], [  2600, -4400], [  4200, -3500],
      [  6600, -3300], [  9000, -3600], [ 12000, -3350], [ 15500, -3500],
      [ 19000, -3300],
      [ 19000, -19000], [-19000, -19000],
    ],
  },
  {
    id: "north-key", name: "North Key", kind: "island", baseHeight: 8,
    points: [[3900,-1750],[4900,-1600],[5500,-1150],[5250,-700],[4400,-560],[3600,-800],[3350,-1300]],
  },
  {
    id: "west-key", name: "West Key", kind: "island", baseHeight: 8,
    points: [[-6100,-1500],[-5000,-1600],[-4300,-1200],[-4500,-650],[-5400,-450],[-6300,-750],[-6500,-1150]],
  },
  {
    id: "harbour-isle", name: "Harbour Isle", kind: "island", baseHeight: 7,
    points: [[-2600,-2350],[-1750,-2450],[-1250,-2100],[-1450,-1700],[-2250,-1600],[-2800,-1900]],
  },
];

// Causeways. Real crossings, sized off the Venetian Causeway's 4.5 km.
export const CAUSEWAYS = [
  { id: "north-causeway", x:  -450, from: "downtown", to: "mainland" },
  { id: "east-causeway",  x:  1150, from: "downtown", to: "mainland" },
  { id: "beach-causeway", x:  -100, from: "downtown", to: "barrier"  },
  { id: "east-beach-link",x:  2400, from: "downtown", to: "barrier"  },
];

// -----------------------------------------------------------------------------
// 2. TERRAIN BANDS — south (seaward) to north (inland)
//
// One source of truth for where land, water and city are. Every piece of
// geometry derives its position from these; nothing carries its own z.
// -----------------------------------------------------------------------------
export const BANDS = {
  OPEN_OCEAN_Z:      2600,   // deep water to the horizon
  OUTER_BAY_Z:        900,   // outer bay, shipping, sailing
  BEACH_Z_MAX:        600,   // surf line
  BEACH_Z_MIN:        525,   // sand
  SEAWALL_Z_MAX:      525,   // seawall + coping
  SEAWALL_Z_MIN:      520,
  ISLAND_Z_MAX:       575,   // island south shore (the waterfront boulevard)
  ISLAND_Z_MIN:     -720,    // island north shore (coastline bounding box)
  HARBOUR_Z_MIN:   -1500,    // mainland shore / harbour north edge
  MAINLAND_Z:      -1500,    // mainland shore, suburbs, then mountains
  MOUNTAIN_Z:      -3000,    // alpine range
  ISLAND_X_HALF:    1470,    // coastline bounding box, x -1470 .. +1400
  MAINLAND_X_HALF:  4800,    // mainland/coast width before open water
};

// Derived, so nothing recomputes them by hand.
export const ISLAND = {
  width:  BANDS.ISLAND_X_HALF * 2,
  depth:  BANDS.ISLAND_Z_MAX - BANDS.ISLAND_Z_MIN,
  xMin:  -BANDS.ISLAND_X_HALF,
  xMax:   BANDS.ISLAND_X_HALF,
  zMin:   BANDS.ISLAND_Z_MIN,
  zMax:   BANDS.ISLAND_Z_MAX,
};

// =============================================================================
// COASTLINE
//
// The island was a rectangle, which is the single thing that made the whole
// masterplan read as a diagram rather than a place. Real waterfront cities are
// shaped by their water, so the coast is designed here as explicit control
// points and smoothed with a Catmull-Rom spline: designable point by point,
// still pure data, still testable.
//
// Proportions checked against real places rather than invented:
//   Melbourne Hoddle Grid  1.61 x 0.80 km, 201m blocks, 30m streets
//   Downtown Vancouver     3.7 km2 peninsula, water both sides, mountains behind
//   Key Biscayne           8 km long x 1.6-3.2 km wide barrier island
//   Biscayne Bay           56 km long, up to 13 km wide -- the WATER dominates
//
// The old island was 1.6 x 1.0 km (1.59 km2), roughly Melbourne's CBD but only
// 43% of downtown Vancouver, and it sat in an ocean that did nothing. It is now
// 2.8 x 1.6 km with a real harbour bite, a headland, a marina inlet and a long
// ocean beach -- and the bay around it is scaled like Biscayne Bay.
//
// Points run clockwise starting at the south-west. +z is seaward (south).
// =============================================================================
export const COAST = [
  // --- south / ocean frontage: one long shallow crescent, Miami Beach style ---
  [-1400,  360], [-1150,  455], [-820,  520], [-450,  560], [-60,  575],
  [  380,  560], [  760,  520], [ 1080,  450], [ 1310,  330],
  // --- east headland and marina inlet ---
  [ 1400,  150], [ 1355,  -30], [ 1180,  -70], [ 1120, -230],   // inlet cut inland
  [ 1290, -300], [ 1400, -450],
  // --- north / harbour frontage, with a deep sheltered bite ---
  [ 1180, -620], [  840, -700], [  520, -690],
  [  360, -520], [  120, -470], [ -110, -530], [ -260, -690],   // Coal-Harbour-like bite
  [ -600, -720], [ -940, -690], [-1230, -600],
  // --- west headland, back round to the ocean beach ---
  [-1420, -430], [-1470, -180], [-1430,   80], [-1400,  360],
];

/** Catmull-Rom through ANY closed set of control points. */
export function splinePolygon(p, samplesPerSegment = 10) {
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

/** Every land mass as a smoothed polygon, ready to draw or to test against. */
export function landmassPolygons(samplesPerSegment = 10) {
  return LANDMASSES.map((lm) => ({
    ...lm,
    polygon: splinePolygon(lm.id === "downtown" ? COAST : lm.points,
                           lm.kind === "mainland" ? 4 : samplesPerSegment),
  }));
}

/** Catmull-Rom through the control points -- a smooth, closed, natural coast. */
export function coastlinePolygon(samplesPerSegment = 10) {
  const p = COAST;
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

const _coastCache = coastlinePolygon(12);

/** Is (x, z) on land? Standard ray-crossing test against the smoothed coast. */
export function isOnLand(x, z, poly = _coastCache) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Shortest distance from (x, z) to the coast. Negative offshore. */
export function distanceToCoast(x, z, poly = _coastCache) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const dx = xj - xi, dz = zj - zi;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - xi) * dx + (z - zi) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = xi + t * dx, pz = zi + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return isOnLand(x, z, poly) ? best : -best;
}

/** Every corner of a rectangle must be inland of the shoreline margin. */
export function rectIsBuildable(xMin, xMax, zMin, zMax, margin = 0) {
  return (
    distanceToCoast(xMin, zMin) > margin &&
    distanceToCoast(xMax, zMin) > margin &&
    distanceToCoast(xMin, zMax) > margin &&
    distanceToCoast(xMax, zMax) > margin
  );
}

// -----------------------------------------------------------------------------
// 3. ROAD HIERARCHY
//
// Right-of-way widths are the full corridor: carriageway + parking + kerbs +
// footways. Blocks are what is left between them, so changing a width here
// re-sizes every block and plot that touches it -- which is exactly the edit
// "narrow this street to grow the lot" needs to be.
// -----------------------------------------------------------------------------
export const ROADS = {
  BOULEVARD: { row: 44, lanes: 4, tram: true,  parking: true,  footway: 6.0 },
  AVENUE:    { row: 28, lanes: 2, tram: false, parking: true,  footway: 4.0 },
  STREET:    { row: 18, lanes: 2, tram: false, parking: false, footway: 3.0 },
  LANE:      { row: 10, lanes: 1, tram: false, parking: false, footway: 1.5 },
  ALLEY:     {  row: 6, lanes: 1, tram: false, parking: false, footway: 0   },
};

// -----------------------------------------------------------------------------
// 4. BLOCK GRID
//
// Spacing is centre-to-centre of the rights-of-way. A block's buildable
// interior is the spacing minus half a ROW on each side.
// -----------------------------------------------------------------------------
export const SHORE_MARGIN = 26;   // metres of foreshore kept clear of buildings

export const GRID = {
  AVENUE_SPACING: 230,   // 200m block + 30m street, Melbourne Hoddle Grid calibration
  STREET_SPACING: 170,   // east-west roads
  ORIGIN_X: -1470,
  ORIGIN_Z: -720,
};

// -----------------------------------------------------------------------------
// 5. PLOT SIZE CLASSES
//
// Real minimums and maximums, so a block can carry a heritage terrace of narrow
// lots or a single tower podium, and the pipeline has a legal range to work
// inside when a visitor asks to merge or split.
// -----------------------------------------------------------------------------
export const PLOT_CLASSES = {
  TERRACE:   { minW: 8,   maxW: 16,  minD: 22, maxD: 34,  maxHeight:  18 },
  TOWNHOUSE: { minW: 14,  maxW: 26,  minD: 26, maxD: 40,  maxHeight:  24 },
  MIDRISE:   { minW: 26,  maxW: 52,  minD: 32, maxD: 60,  maxHeight:  55 },
  TOWER:     { minW: 45,  maxW: 90,  minD: 45, maxD: 90,  maxHeight: 220 },
  CIVIC:     { minW: 60,  maxW: 180, minD: 50, maxD: 110, maxHeight:  70 },
  PARK:      { minW: 40,  maxW: 200, minD: 40, maxD: 130, maxHeight:   0 },
};

export const PLOT_RULES = {
  MIN_ANY_W: 8,      // nothing narrower than a heritage shopfront
  MIN_ANY_D: 22,
  SETBACK_FRONT: 3,  // from the right-of-way
  SETBACK_SIDE: 0,   // party walls allowed -- this is a city, not a subdivision
  SETBACK_REAR: 4,   // service / light well
  MAX_MERGE: 6,      // most adjacent plots that may be merged into one lot
};

// -----------------------------------------------------------------------------
// 6. DISTRICTS
//
// Each names a rectangle of the island and the plot classes allowed inside it.
// A district is the unit a visitor talks about: "put a park in the civic
// quarter", "add towers along the waterfront".
// -----------------------------------------------------------------------------
// `primary` is the class a block in this district is subdivided into by default.
// It is declared, never inferred -- inferring "the largest allowed class" gave a
// Heritage Quarter made of mid-rise blocks and an island where the narrowest lot
// was 43m, i.e. no fine grain anywhere.
export const DISTRICTS = [
  {
    id: "waterfront",
    name: "Waterfront & Promenade",
    bounds: { xMin: -1470, xMax: 1400, zMin: 330, zMax: 575 },
    primary: "MIDRISE",
    allow: ["MIDRISE", "TOWER", "PARK", "CIVIC"],
    character: "hotels, dining pavilions, waterfront condos, public realm",
  },
  {
    id: "downtown",
    name: "Downtown Core",
    bounds: { xMin: -700, xMax: 700, zMin: -60, zMax: 330 },
    primary: "TOWER",
    allow: ["TOWER", "MIDRISE", "CIVIC"],
    character: "2020s curtain-wall towers, podium retail, sky gardens",
  },
  {
    id: "heritage",
    name: "Heritage Quarter",
    // Extends south to the port edge. It previously stopped at z = -40, which
    // left a 500 x 260m hole on the west side belonging to no district -- so no
    // blocks generated there and the island had a bite out of it.
    bounds: { xMin: -1470, xMax: -700, zMin: -60, zMax: 330 },
    primary: "TERRACE",
    allow: ["TERRACE", "TOWNHOUSE", "MIDRISE"],
    character: "1880s-1920s brick and sandstone, arcaded shopfronts",
  },
  {
    // The east mirror of the Heritage Quarter. Without it, x 520..800 between
    // the civic edge and the waterfront belonged to no district and generated
    // no blocks -- the island had a second bite out of it.
    id: "eastside",
    name: "Eastside Mixed Quarter",
    bounds: { xMin: 700, xMax: 1400, zMin: -60, zMax: 330 },
    primary: "MIDRISE",
    allow: ["MIDRISE", "TOWNHOUSE", "TERRACE", "PARK"],
    character: "mixed-use mid-rise, courtyard housing over ground-floor retail",
  },
  {
    id: "civic",
    name: "Civic Quarter",
    // Widened west to x = -520 to close the same gap; it now meets the Heritage
    // Quarter's east edge exactly.
    bounds: { xMin: -1470, xMax: 500, zMin: -400, zMax: -60 },
    primary: "CIVIC",
    allow: ["CIVIC", "PARK", "MIDRISE"],
    character: "city hall, hospital, fire station, civic square",
  },
  {
    id: "residential",
    name: "Residential Borough",
    bounds: { xMin: 500, xMax: 1400, zMin: -720, zMax: -60 },
    primary: "TOWNHOUSE",
    allow: ["TOWNHOUSE", "TERRACE", "MIDRISE", "PARK"],
    character: "terraced housing, courtyard blocks, neighbourhood parks",
  },
  {
    id: "port",
    name: "Harbour & Port",
    bounds: { xMin: -1470, xMax: 500, zMin: -720, zMax: -400 },
    primary: "MIDRISE",
    allow: ["MIDRISE", "CIVIC", "PARK"],
    character: "ferry terminal, boatyards, working harbour edge",
  },
];

// Suburbs sit on the mainland across the inner harbour, reachable by bridge.
// They exist so the world continues past the island and so "bridge across to a
// new suburb" is a real, buildable request.
export const SUBURBS = [
  { id: "north-shore", name: "North Shore",  bounds: { xMin: -900, xMax: -200, zMin: -1500, zMax: -900 }, density: "low"  },
  { id: "hillside",    name: "Hillside Terraces", bounds: { xMin: -200, xMax: 600, zMin: -1700, zMax: -1000 }, density: "low" },
  { id: "east-point",  name: "East Point",   bounds: { xMin:  900, xMax: 1700, zMin: -1200, zMax: -500 }, density: "mid"  },
];

export const BRIDGES = [
  { id: "harbour-crossing", from: "island",     to: "north-shore", x: -450, type: "suspension" },
  { id: "east-viaduct",     from: "island",     to: "east-point",  x:  760, type: "viaduct"    },
];

// =============================================================================
// GENERATOR — turns the plan above into concrete roads, blocks and plots.
//
// Pure: same input, same output, no randomness, no THREE, no DOM. That makes it
// testable in Node and verifiable before a single triangle is drawn.
// =============================================================================

function districtAt(x, z) {
  for (const d of DISTRICTS) {
    const b = d.bounds;
    if (x >= b.xMin && x < b.xMax && z >= b.zMin && z < b.zMax) return d;
  }
  return null;
}

/** Road centrelines across the island, with their class. */
export function generateRoads() {
  const roads = [];
  // The waterfront boulevard runs along the island's south edge.
  roads.push({
    id: "boulevard-waterfront", axis: "ew", class: "BOULEVARD",
    at: ISLAND.zMax - ROADS.BOULEVARD.row / 2,
    from: ISLAND.xMin, to: ISLAND.xMax,
  });
  // North-south avenues.
  for (let x = GRID.ORIGIN_X; x <= ISLAND.xMax; x += GRID.AVENUE_SPACING) {
    roads.push({ id: `avenue-x${x}`, axis: "ns", class: "AVENUE", at: x, from: ISLAND.zMin, to: ISLAND.zMax });
  }
  // East-west streets, stopping short of the boulevard.
  const lastStreetZ = ISLAND.zMax - ROADS.BOULEVARD.row;
  for (let z = GRID.ORIGIN_Z; z < lastStreetZ; z += GRID.STREET_SPACING) {
    roads.push({ id: `street-z${z}`, axis: "ew", class: "STREET", at: z, from: ISLAND.xMin, to: ISLAND.xMax });
  }
  return roads;
}

/** Buildable blocks: the land between the rights-of-way. */
export function generateBlocks() {
  const blocks = [];
  const avHalf = ROADS.AVENUE.row / 2;
  const stHalf = ROADS.STREET.row / 2;
  const lastStreetZ = ISLAND.zMax - ROADS.BOULEVARD.row;

  for (let x = GRID.ORIGIN_X; x < ISLAND.xMax; x += GRID.AVENUE_SPACING) {
    for (let z = GRID.ORIGIN_Z; z < lastStreetZ; z += GRID.STREET_SPACING) {
      const xMin = x + avHalf;
      const xMax = x + GRID.AVENUE_SPACING - avHalf;
      const zMin = z + stHalf;
      // The last row runs up to the boulevard rather than to another street.
      const nextZ = z + GRID.STREET_SPACING;
      const zMax = (nextZ >= lastStreetZ ? lastStreetZ : nextZ) - stHalf;
      if (xMax - xMin < PLOT_RULES.MIN_ANY_W || zMax - zMin < PLOT_RULES.MIN_ANY_D) continue;
      // The island is a coastline, not a rectangle: a block only exists if the
      // whole of it is inland of the shore, with a margin for the sea wall and
      // the foreshore walk.
      if (!rectIsBuildable(xMin, xMax, zMin, zMax, SHORE_MARGIN)) continue;

      const cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2;
      const d = districtAt(cx, cz);
      if (!d) continue;
      blocks.push({
        id: `block-${x}-${z}`, districtId: d.id,
        xMin, xMax, zMin, zMax,
        width: xMax - xMin, depth: zMax - zMin,
      });
    }
  }
  return blocks;
}

/**
 * Subdivide a block into plots of a given class, front-to-street.
 * Widths are distributed evenly within the class's legal range.
 */
export function subdivideBlock(block, className) {
  const cls = PLOT_CLASSES[className];
  if (!cls) throw new Error(`unknown plot class: ${className}`);
  const usableD = Math.min(block.depth, cls.maxD);
  if (usableD < cls.minD) return [];

  // Choose a count that keeps every plot inside [minW, maxW].
  const maxCount = Math.floor(block.width / cls.minW);
  const minCount = Math.ceil(block.width / cls.maxW);
  if (maxCount < 1 || minCount > maxCount) return [];
  const count = Math.max(1, Math.min(maxCount, Math.max(minCount, Math.round(block.width / ((cls.minW + cls.maxW) / 2)))));
  const w = block.width / count;
  if (w < cls.minW - 1e-9 || w > cls.maxW + 1e-9) return [];

  const plots = [];
  for (let i = 0; i < count; i++) {
    const xMin = block.xMin + i * w;
    plots.push({
      id: `${block.id}-p${i}`, blockId: block.id, districtId: block.districtId,
      className,
      xMin, xMax: xMin + w,
      zMin: block.zMin, zMax: block.zMin + usableD,
      width: w, depth: usableD,
      maxHeight: cls.maxHeight,
      buildable: {
        xMin: xMin + PLOT_RULES.SETBACK_SIDE,
        xMax: xMin + w - PLOT_RULES.SETBACK_SIDE,
        zMin: block.zMin + PLOT_RULES.SETBACK_FRONT,
        zMax: block.zMin + usableD - PLOT_RULES.SETBACK_REAR,
      },
      occupant: null,   // set when a building is placed
    });
  }
  return plots;
}

/** The class a district declares for itself. */
function defaultClassFor(districtId) {
  const d = DISTRICTS.find((x) => x.id === districtId);
  return (d && d.primary) || "MIDRISE";
}

/** The whole plan: roads, blocks and plots, ready to draw or to edit. */
export function generateCityPlan() {
  const roads = generateRoads();
  const blocks = generateBlocks();
  const plots = [];
  for (const b of blocks) {
    // Try the district's declared class; if the block cannot legally carry it,
    // fall back through the classes that district actually allows -- never to a
    // class the district forbids.
    const d = DISTRICTS.find((x) => x.id === b.districtId);
    const candidates = [defaultClassFor(b.districtId), ...((d && d.allow) || [])].filter(
      (c, i, a) => c !== "PARK" && a.indexOf(c) === i
    );
    let out = [];
    for (const cls of candidates) {
      out = subdivideBlock(b, cls);
      if (out.length) break;
    }
    plots.push(...out);
  }
  return { world: WORLD, bands: BANDS, island: ISLAND, roads, blocks, plots, districts: DISTRICTS, suburbs: SUBURBS, bridges: BRIDGES };
}
