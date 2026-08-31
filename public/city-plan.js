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
  SIZE: 9600,          // full terrain square, -4800 .. +4800 on both axes
  HORIZON: 12000,      // camera far plane / skybox radius
};

// -----------------------------------------------------------------------------
// 2. TERRAIN BANDS — south (seaward) to north (inland)
//
// One source of truth for where land, water and city are. Every piece of
// geometry derives its position from these; nothing carries its own z.
// -----------------------------------------------------------------------------
export const BANDS = {
  OPEN_OCEAN_Z:      1400,   // z >  1400  deep water to the horizon
  OUTER_BAY_Z:        620,   // 620 .. 1400  outer bay, shipping, sailing
  BEACH_Z_MAX:        560,   // 560 ..  620  surf line
  BEACH_Z_MIN:        500,   // 500 ..  560  sand
  SEAWALL_Z_MAX:      500,   // 496 ..  500  seawall + coping
  SEAWALL_Z_MIN:      496,
  ISLAND_Z_MAX:       496,   // island south shore (the waterfront boulevard)
  ISLAND_Z_MIN:     -500,    // island north shore
  HARBOUR_Z_MIN:    -900,    // -900 .. -500  sheltered inner harbour
  MAINLAND_Z:       -900,    // z < -900  mainland shore, suburbs, then mountains
  MOUNTAIN_Z:      -1800,    // z < -1800  alpine range
  ISLAND_X_HALF:     800,    // island spans x -800 .. +800
  MAINLAND_X_HALF:  3200,    // mainland/coast width before open water
};

// Derived, so nothing recomputes them by hand.
export const ISLAND = {
  width:  BANDS.ISLAND_X_HALF * 2,                       // 1600 m east-west
  depth:  BANDS.ISLAND_Z_MAX - BANDS.ISLAND_Z_MIN,       //  996 m north-south
  xMin:  -BANDS.ISLAND_X_HALF,
  xMax:   BANDS.ISLAND_X_HALF,
  zMin:   BANDS.ISLAND_Z_MIN,
  zMax:   BANDS.ISLAND_Z_MAX,
};

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
export const GRID = {
  AVENUE_SPACING: 200,   // north-south roads, every 200 m across the island
  STREET_SPACING: 140,   // east-west roads, every 140 m
  ORIGIN_X: -800,
  ORIGIN_Z: -500,
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
    bounds: { xMin: -800, xMax: 800, zMin: 340, zMax: 496 },
    primary: "MIDRISE",
    allow: ["MIDRISE", "TOWER", "PARK", "CIVIC"],
    character: "hotels, dining pavilions, waterfront condos, public realm",
  },
  {
    id: "downtown",
    name: "Downtown Core",
    bounds: { xMin: -520, xMax: 520, zMin: -40, zMax: 340 },
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
    bounds: { xMin: -800, xMax: -520, zMin: -300, zMax: 340 },
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
    bounds: { xMin: 520, xMax: 800, zMin: -40, zMax: 340 },
    primary: "MIDRISE",
    allow: ["MIDRISE", "TOWNHOUSE", "TERRACE", "PARK"],
    character: "mixed-use mid-rise, courtyard housing over ground-floor retail",
  },
  {
    id: "civic",
    name: "Civic Quarter",
    // Widened west to x = -520 to close the same gap; it now meets the Heritage
    // Quarter's east edge exactly.
    bounds: { xMin: -520, xMax: 300, zMin: -300, zMax: -40 },
    primary: "CIVIC",
    allow: ["CIVIC", "PARK", "MIDRISE"],
    character: "city hall, hospital, fire station, civic square",
  },
  {
    id: "residential",
    name: "Residential Borough",
    bounds: { xMin: 300, xMax: 800, zMin: -500, zMax: -40 },
    primary: "TOWNHOUSE",
    allow: ["TOWNHOUSE", "TERRACE", "MIDRISE", "PARK"],
    character: "terraced housing, courtyard blocks, neighbourhood parks",
  },
  {
    id: "port",
    name: "Harbour & Port",
    bounds: { xMin: -800, xMax: 300, zMin: -500, zMax: -300 },
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
