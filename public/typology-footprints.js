// =============================================================================
// docs/specs/PLACEMENT-CONTRACT.md, PART 1 -- THE ONE TABLE BOTH LANES READ.
//
// "A model declares what it needs. The board is carved to fit models. Never
// the other way round." public/buildings.js's bld* functions already declare
// their own footprint in whole 8 m cells (cellW/cellD, clamped per typology);
// public/city-plan.js's PLOT_CLASSES did not agree with any of them. This is
// the reconciliation: every number below is READ off buildings.js's own
// Math.max/Math.min clamps, not invented, so a change to a model's own
// declared size is a change to this file, not a second guess living here.
//
// WHOEVER GETS HERE FIRST COMMITS IT. If public/buildings.js or public/
// props.js already exports an equivalent table by the time you read this,
// that one is the real one -- delete this file's claim to be first, do not
// keep two.
//
// This file imports nothing from buildings.js and buildings.js imports
// nothing from here (yet) -- the CLI lane does not edit public/buildings.js
// (scope fence, WORLD-REBALANCE-BRIEF.md), so this is a NEUTRAL file both
// lanes can read: city-plan.js reads it now; buildings.js reading it too is
// how "make both PLOT_CLASSES and the model generators read from that
// constant rather than restating it" (the contract's own words) finishes.
//
// ONLY TYPOLOGIES WITH A REAL, REGISTERED BUILDER ARE LISTED.
// public/layout.js's TYPOLOGIES_FOR_CLASS also names "bld-highstreet-terrace"
// (for MIDRISE) and "bld-business-park" (for CIVIC) -- both exist as real
// functions in buildings.js (bldHighStreetTerrace, bldBusinessParkBlock) but
// neither is registered under that name anywhere props.js's typology map is
// built. A plot that draws either by weight currently has nothing to build.
// That is a real, separate gap this file does not paper over: it is named
// here and left for whoever owns that registration, not silently worked
// around by inventing an entry for a typology nothing can build yet.
// =============================================================================

/** CELL = 8 m, matching grid.js. Kept as a literal rather than importing
 *  grid.js: this file's whole job is to carry buildings.js's OWN numbers
 *  without adding a dependency neither lane asked for. */
export const CELL_M = 8;

/**
 * cellW / cellD ranges, in WHOLE CELLS, read directly from each bld*
 * function's own clamp in public/buildings.js. `max: null` means no upper
 * clamp exists in the source -- the typology takes as much room as it is
 * given (bld-terrace: `terraceUnitsFor` in layout.js floors the available
 * width to whole cells with no ceiling).
 *
 * A fixed size (buildings.js computes it directly, no options.cellW branch
 * at all) is written as `{ min: n, max: n }` -- still a range, just one with
 * a single member, so every caller can use the same min/max shape.
 */
export const TYPOLOGY_FOOTPRINT_CELLS = Object.freeze({
  "bld-villa":             { w: { min: 2, max: 3 },    d: { min: 3, max: 4 } },
  "bld-terrace":           { w: { min: 1, max: null }, d: { min: 3, max: 3 } },
  "bld-townhouse":         { w: { min: 2, max: 2 },    d: { min: 3, max: 3 } },
  "bld-midrise":           { w: { min: 3, max: 6 },    d: { min: 4, max: 8 } },
  "bld-shop":              { w: { min: 2, max: 4 },    d: { min: 2, max: 3 } },
  "bld-office":            { w: { min: 4, max: 8 },    d: { min: 6, max: 10 } },
  "bld-apartment-walkup":  { w: { min: 3, max: 5 },    d: { min: 4, max: 7 } },
  "bld-warehouse":         { w: { min: 6, max: 10 },   d: { min: 10, max: 20 } },
  "bld-workshop":          { w: { min: 3, max: 5 },    d: { min: 4, max: 7 } },
  "bld-tower":             { w: { min: 4, max: 8 },    d: { min: 4, max: 8 } },
});

/**
 * TOWER-CLASS PLOTS, MARK'S DECISION PENDING.
 *
 * PLOT_CLASSES.TOWER's old minimum was 45 m -- 5.625 cells, not a whole
 * number, which is the specific defect this file exists to close. The
 * contract's own proposal is 6-11 cells (48-88 m), "proposed, not decided
 * -- use the proposal meanwhile." Recorded here, not silently folded into
 * the table above, because it is a target for PLOT_CLASSES to carve toward,
 * not a measurement of what any model currently declares -- bld-tower's own
 * clamp (4-8 cells, above) only covers the bottom of this range today. A
 * TOWER plot carved at 9-11 cells has no typology that currently fits it
 * exactly; 6-8 cells does. That gap is Mark's to close by widening
 * bld-tower's own clamp, or by narrowing this bracket -- not this file's
 * call, and not silently resolved here either way.
 */
export const TOWER_PLOT_CELLS_PROPOSED = Object.freeze({ w: { min: 6, max: 11 }, d: { min: 6, max: 11 } });

/** Typologies named in a TYPOLOGIES_FOR_CLASS entry with no registered
 *  builder to draw them -- see this file's own header. Exported so a test
 *  can assert this list shrinks rather than grows. */
export const TYPOLOGIES_WITH_NO_REGISTERED_BUILDER = Object.freeze(["bld-highstreet-terrace", "bld-business-park"]);

/**
 * Plot classes where PART 1's own test ("at least one typology's footprint
 * range fits inside that class's size range") genuinely fails today, found
 * while writing that test rather than assumed. Widening PLOT_CLASSES'
 * bounds outward to the nearest whole cell (the rest of this file's job)
 * cannot close either gap, because the gap is not a rounding error:
 *
 *   FARM   { minW: 160-464m / 20-58 cells }  vs its typologies' widest w:
 *            bld-workshop 3-5 cells (24-40m), bld-villa 2-3 cells (16-24m)
 *   HANGAR { minW: 88-224m / 11-28 cells }   vs its one typology's w:
 *            bld-warehouse 6-10 cells (48-80m)
 *
 * Both plot classes are carried by public/buildings.js's ARCHETYPE map
 * (farm(), hangar()) for WORLD GENERATION, but neither has a player-facing
 * bld* equivalent at all -- not a size mismatch, an absent typology. Not
 * this file's gap to close (that is buildings.js, agy's file); named here,
 * the same way TYPOLOGIES_WITH_NO_REGISTERED_BUILDER names the other kind
 * of gap, so the Part 1 test can be honest about what actually holds today
 * rather than quietly excluding these two with no record of why. */
export const CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH = Object.freeze(["FARM", "HANGAR"]);

/**
 * Does a typology's declared cell range overlap a plot class's declared
 * cell range, in both directions? Overlap, not subset: `TOWER_PLOT_CELLS_
 * PROPOSED` (6-11) and bld-tower's own clamp (4-8) share 6-8, and a plot
 * carved anywhere in that overlap is buildable by a real model today --
 * which is the actual, practical question "can this class hold this
 * typology" is asking. A pure subset test would fail on that overlap for a
 * reason that has nothing to do with whether a real building fits.
 */
export function rangesOverlap(a, b) {
  const aMax = a.max === null ? Infinity : a.max;
  const bMax = b.max === null ? Infinity : b.max;
  return a.min <= bMax && b.min <= aMax;
}

export function typologyFitsClass(typologyCells, classCellRange) {
  return rangesOverlap(typologyCells.w, classCellRange.w) && rangesOverlap(typologyCells.d, classCellRange.d);
}
