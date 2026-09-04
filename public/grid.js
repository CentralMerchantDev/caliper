// =============================================================================
// THE WORLD IS A GRID OF STANDARD CELLS
//
// WHAT THIS IS
//
// The addressing scheme everything is built from. Models are made to whole
// numbers of cells; a road piece is N cells long, a house sits on a 2x3, a
// bollard on a sixteenth. Placement snaps to it. That is what makes the world
// assemble like building blocks instead of like a pile of coordinates, and it
// is what lets a user swap one model for another and have it still fit.
//
// WHY A GRID AT ALL
//
// Everything in this project that went wrong went wrong in continuous metres. A
// bench at 1.8 m and a lamp at 0.6 m placed by two loops with different step
// sizes will eventually land 5 cm apart, and nothing about that is detectable
// without measuring every pair. On a grid they either occupy the same cell or
// they do not, and that is a question with an exact answer.
//
// It also gives the asset lane something buildable to: "make a straight road
// piece" is vague, "make a straight road piece one cell long" is a spec.
//
// THE GRID IS ARITHMETIC, NOT AN ARRAY
//
// The world is 26 km. At an 8 m cell that is 3,250 x 3,250 = 10.6 MILLION cells,
// and a further 16x that if subdivisions were materialised. Nothing here stores
// a cell. Every function below is integer arithmetic on a coordinate, so the
// whole world is addressable at no cost and only the cells something actually
// occupies are ever recorded -- in the registry, which already holds them.
//
// THE WHOLE WORLD, WITH PARTS LOCKED
//
// The grid covers the entire 26 km, not the built area. Regions that are not
// open yet are LOCKED, which is a different thing from absent: a locked region
// has coordinates, terrain and a place in the world, and refuses placement with
// a reason. Making unopened land simply not exist would mean the map ends at
// the edge of the town, and opening more later would move everything.
// =============================================================================

import { TERRAIN } from "./terrain.js";

/**
 * The standard cell, in metres.
 *
 * 8 m, and the number is doing several jobs at once. It is a sensible module for
 * a road piece -- long enough that a kilometre of street is 125 pieces rather
 * than a thousand, short enough to follow a coastline without visible faceting.
 * It divides evenly all the way down to 0.5 m, which is the smallest thing worth
 * placing (a bollard, a hydrant). And it divides the block figures in
 * docs/WORLD-RULES.md, so a 120 m block is exactly 15 cells.
 */
export const CELL = 8;

/**
 * How finely a thing may be positioned within the grid.
 *
 * A tower occupies whole cells. A bollard does not need one, and forcing it to
 * take a whole 8 m of ground would make street furniture impossible. So the same
 * grid is readable at five resolutions, all exact binary divisions of the cell
 * -- which matters, because halves and quarters of 8 are representable exactly
 * in floating point and thirds would not be.
 */
export const DIVISION = {
  full: 1,
  half: 2,
  quarter: 4,
  eighth: 8,
  sixteenth: 16,
};

/** The size in metres of one step at a given division. */
export function step(division = "full") {
  const n = DIVISION[division];
  if (!n) throw new Error(`unknown grid division "${division}" — one of ${Object.keys(DIVISION).join(", ")}`);
  return CELL / n;
}

/**
 * The vertical unit, in metres.
 *
 * A storey. 4 m is a generous floor-to-floor for a real building and exactly
 * half a cell, so a cube of world is two levels. It is the unit a user changes
 * when they say "make this tower twenty storeys instead of ten" -- that is a
 * change of one integer, not a re-model.
 */
export const LEVEL = 4;

/** Cells across the world, one axis. Derived, so the grid cannot drift from the world. */
export const CELLS_ACROSS = Math.round(TERRAIN.WORLD.SIZE / CELL);

/** The world's own extent in metres, centred on the origin. */
const HALF = TERRAIN.WORLD.SIZE / 2;

// -----------------------------------------------------------------------------
// ADDRESSING
// -----------------------------------------------------------------------------

/** The cell containing a world position. Integers, and negative to the west and north. */
export function cellOf(x, z) {
  return { i: Math.floor(x / CELL), j: Math.floor(z / CELL) };
}

/** The south-west corner of a cell, in world metres. The canonical anchor. */
export function cellOrigin(i, j) {
  return { x: i * CELL, z: j * CELL };
}

/** The centre of a cell. What a model's own origin sits on when it occupies one cell. */
export function cellCentre(i, j) {
  return { x: i * CELL + CELL / 2, z: j * CELL + CELL / 2 };
}

/** The world rectangle covered by a run of cells starting at (i, j). */
export function cellRect(i, j, w = 1, d = 1) {
  return { xMin: i * CELL, xMax: (i + w) * CELL, zMin: j * CELL, zMax: (j + d) * CELL };
}

/**
 * Snap a position to the grid at a given division.
 *
 * ROUNDS, rather than truncating. Truncating biases everything south and west by
 * up to half a step, which on a 26 km world is a systematic drift nobody would
 * notice until two things that should have touched did not.
 */
export function snap(x, z, division = "full") {
  const s = step(division);
  return { x: Math.round(x / s) * s, z: Math.round(z / s) * s };
}

/**
 * How many whole cells a measurement needs.
 *
 * CEILING, always. A 9 m thing does not fit in one 8 m cell, and rounding it
 * down is how something ends up overhanging the ground that was checked for it
 * -- which is the airport apron bug, in one function.
 */
export function cellsFor(metres) {
  return Math.max(1, Math.ceil(metres / CELL - 1e-9));
}

/** How many storeys a height is, rounded up for the same reason. */
export function levelsFor(metres) {
  return Math.max(1, Math.ceil(metres / LEVEL - 1e-9));
}

/** The height in metres of a number of storeys. The inverse of levelsFor. */
export function heightOf(levels) {
  return levels * LEVEL;
}

/**
 * Is this cell inside the world at all?
 *
 * The world is finite and the grid is not. A position outside it is not "empty
 * ground the caller may use", it is off the map, and saying so is different from
 * saying nothing is there.
 */
export function inWorld(i, j) {
  const { x, z } = cellOrigin(i, j);
  return x >= -HALF && x < HALF && z >= -HALF && z < HALF;
}

// -----------------------------------------------------------------------------
// REGIONS, AND WHAT IS OPEN
// -----------------------------------------------------------------------------

/**
 * The world's cells, with parts of it locked.
 *
 * A locked region is present, has terrain, and refuses placement with a reason.
 * That is deliberately not the same as absent: unopened land that does not exist
 * would make the map end at the edge of the town, and opening more of it later
 * would move everything already placed.
 *
 * Regions are stored as rectangles, not as a set of cells, for the reason at the
 * top of this file: there are 10.6 million cells and a handful of regions.
 */
export function createGrid({ openRegions = null } = {}) {
  // null means the whole world is open. An empty array means NOTHING is open,
  // which is a very different thing and easy to produce by accident, so the two
  // are kept distinct rather than both meaning "no restriction".
  //
  // COPIED, because the guard was on the way out and not on the way in. regions()
  // has always copied its output so a caller could not open the world by editing
  // the list it was handed -- and the constructor then kept a LIVE handle on the
  // array it was given, so the caller could open the world by pushing to its own
  // array afterwards. A door bolted on one side.
  const open = openRegions === null ? null : openRegions.map((r) => ({ ...r }));

  /** Open a rectangle of the world, in world metres. */
  function openRegion({ xMin, xMax, zMin, zMax, name = null }) {
    if (!(xMax > xMin) || !(zMax > zMin)) {
      throw new Error(`grid: openRegion(${name}) has an inverted or empty extent`);
    }
    if (open === null) {
      throw new Error(
        "grid: the whole world is already open — build the grid with openRegions: [] " +
        "to start locked, or do not call openRegion at all",
      );
    }
    open.push({ xMin, xMax, zMin, zMax, name });
  }

  /** Close a previously opened region by name -- load and UNLOAD, not just
   *  load. Refused, not a silent no-op, if the name is not currently open:
   *  a caller that thinks it closed something and did not needs to know. */
  function closeRegion(name) {
    if (open === null) {
      return { ok: false, reason: `grid: cannot close "${name}" -- the whole world is open, not region-tracked` };
    }
    const i = open.findIndex((r) => r.name === name);
    if (i === -1) return { ok: false, reason: `grid: no open region named "${name}"` };
    open.splice(i, 1);
    return { ok: true };
  }

  /** Which region a position is in, or null if it is locked or off the map. */
  function regionAt(x, z) {
    if (open === null) return { name: "world", xMin: -HALF, xMax: HALF, zMin: -HALF, zMax: HALF };
    for (const r of open) {
      if (x >= r.xMin && x < r.xMax && z >= r.zMin && z < r.zMax) return r;
    }
    return null;
  }

  /**
   * May something be placed here, as far as the GRID is concerned?
   *
   * Only two answers: off the map, or locked. The grid has nothing to say about
   * terrain, surfaces or occupancy -- those are ground.js's, and a grid that
   * also had opinions about slope would be a second place for the same rule to
   * live and drift.
   */
  function check(x, z) {
    const { i, j } = cellOf(x, z);
    if (!inWorld(i, j)) {
      return { ok: false, reason: "off-map", detail: `(${x.toFixed(0)}, ${z.toFixed(0)}) is outside the ${TERRAIN.WORLD.SIZE / 1000} km world` };
    }
    const region = regionAt(x, z);
    if (!region) {
      return { ok: false, reason: "locked", detail: `(${x.toFixed(0)}, ${z.toFixed(0)}) is in a part of the world that is not open yet` };
    }
    return { ok: true, region };
  }

  /** Every open region, copied so a caller cannot edit the world by editing the list. */
  function regions() {
    return open === null ? [{ name: "world", xMin: -HALF, xMax: HALF, zMin: -HALF, zMax: HALF }] : open.map((r) => ({ ...r }));
  }

  return { openRegion, closeRegion, regionAt, check, regions, CELL, LEVEL, CELLS_ACROSS };
}
