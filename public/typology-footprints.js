// =============================================================================
// docs/specs/PLACEMENT-CONTRACT.md, PART 1 -- A BUILDING'S OWN DECLARED SPACE.
//
// CORRECTED 2026-09-06 (Mark): a plot is not a slot for a kind of building.
// It is space. This file used to frame itself as "the reconciliation" between
// buildings.js's own cell clamps and city-plan.js's PLOT_CLASSES -- as if a
// typology's footprint had to be checked against a plot's declared CLASS
// before it could stand there. That framing is retired. There is no class to
// reconcile against any more: PLOT_CLASSES survives only as a record of what
// world generation chose to seed on a plot (see its own comment in
// city-plan.js), never a constraint on what a player may later build there.
//
// What this file actually is, now: each typology's own statement of the
// ground it needs -- `foot`, in whole 8 m cells, read directly off
// buildings.js's own Math.max/Math.min clamps, not invented. The board's only
// question is whether a free rectangle of that size (plus `clear`, the space
// required AROUND it -- not yet declared anywhere, see the note at the bottom
// of this file) exists where a player wants to build. No class check, no use
// check. A villa may go downtown; a tower may go in a field with the room
// for it.
//
// WHOEVER GETS HERE FIRST COMMITS IT (docs/specs/PLACEMENT-CONTRACT.md's own
// rule) is done: this file won that race (landed as de2573b) over a second,
// independently-written table (public/footprint-contract.js) whose bld-tower
// entry used a plot-class proposal number instead of bld-tower's own real
// clamp -- exactly the invented-number mistake this file exists to avoid.
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
 * VOID, kept for the historical record rather than deleted (nothing is
 * deleted in this repo). This existed to answer "what plot-class bracket
 * should TOWER declare so a bld-tower typology is guaranteed to fit it" --
 * a question that only made sense when a plot's class bound what could be
 * built on it. Mark's 2026-09-06 correction removed that binding entirely:
 * a plot's only property is how many free cells it has, so bld-tower's own
 * clamp (4-8 cells, above) is already the complete, sufficient statement of
 * what a tower needs. Nothing reads this constant any more.
 */
export const TOWER_PLOT_CELLS_PROPOSED = Object.freeze({ w: { min: 6, max: 11 }, d: { min: 6, max: 11 } });

/** Typologies named in a TYPOLOGIES_FOR_CLASS entry with no registered
 *  builder to draw them -- see this file's own header. Exported so a test
 *  can assert this list shrinks rather than grows. */
export const TYPOLOGIES_WITH_NO_REGISTERED_BUILDER = Object.freeze(["bld-highstreet-terrace", "bld-business-park"]);

/**
 * A SEEDING gap, not a placement rule -- there is no test enforcing this any
 * more (see the note at this file's top: a plot's class no longer binds what
 * can be built there). What is still real: when world generation seeds a
 * FARM or HANGAR plot with an initial building (Step 3's "downtown seeds
 * towers, the shore seeds villas" per-district decision), neither class's own
 * typologies are remotely close to the ground FARM/HANGAR plots actually
 * carve:
 *
 *   FARM   { minW: 160-464m / 20-58 cells }  vs its typologies' widest w:
 *            bld-workshop 3-5 cells (24-40m), bld-villa 2-3 cells (16-24m)
 *   HANGAR { minW: 88-224m / 11-28 cells }   vs its one typology's w:
 *            bld-warehouse 6-10 cells (48-80m)
 *
 * Both plot classes are carried by public/buildings.js's ARCHETYPE map
 * (farm(), hangar()) for WORLD GENERATION, but neither has a player-facing
 * bld* equivalent at all -- not a size mismatch, an absent typology. Not
 * this file's gap to close (that is buildings.js, agy's file); named here
 * so Step 3's seeding work knows before it starts rather than discovering it
 * mid-pass. */
export const CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH = Object.freeze(["FARM", "HANGAR"]);

/**
 * General-purpose cell-range overlap, kept for whatever placement code needs
 * it next (checking a proposed foot+clear rectangle against free ground, for
 * instance) -- not deleted even though its original purpose (checking a
 * typology's footprint against a plot class's declared range) is retired
 * along with plot classes binding what can be built on them. Overlap, not
 * subset: two ranges that share only part of their span still describe a
 * real size something could be built at.
 */
export function rangesOverlap(a, b) {
  const aMax = a.max === null ? Infinity : a.max;
  const bMax = b.max === null ? Infinity : b.max;
  return a.min <= bMax && b.min <= aMax;
}

export function typologyFitsClass(typologyCells, classCellRange) {
  return rangesOverlap(typologyCells.w, classCellRange.w) && rangesOverlap(typologyCells.d, classCellRange.d);
}
