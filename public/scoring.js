// =============================================================================
// THE VALUE FUNCTION — REBUILD-PLAN.md §S1, under
// docs/specs/SCORING-MODEL-2026-09-14.md. Composes public/area-board.js;
// does not reimplement it.
//
// value(cell) = terrainContribution(cell) + Σ contribution(piece, cell) for
// every placed piece within Chebyshev radius R = 3. STATELESS: every call
// reads the board fresh, nothing is cached or accumulated between calls, so
// the same arrangement scores identically however it was reached -- placing
// A then B, B then A, or loading a save all produce the same occupancy grid,
// and this function has no memory of which one happened. NON-RECURSIVE
// (SCORING-MODEL §5): contribution comes only from WHAT PIECES ARE within
// R, read directly off the board -- this module never calls value() (or
// anything derived from it) on a neighbouring cell while computing a cell's
// own value. A recursive definition either iterates to a fixed point or
// becomes order-dependent, and order-dependent fails this file's own gate
// outright.
//
// `baseValue` DOES NOT APPEAR HERE, on purpose (SCORING-MODEL §3.1): it
// never entered §S1's formula, and letting a piece's own worth into the
// location-only readout is what §S4 warns would make the ghost number stop
// moving as the cursor moves.
//
// WHAT "CONTRIBUTION" MEANS, PER public/catalogue-validator.js's OWN HEADER:
// a piece P's `adjacency[categoryAtCell]` (if present) is P's contribution
// to `cell`'s value -- keyed by the CATEGORY CURRENTLY OCCUPYING `cell`, not
// by P's own category. A vacant cell has no category to key on, so it gets
// NO adjacency contribution at all (terrain only) -- this is not a gap, it
// is §S4's own two-number design: `valueAt()` on empty ground is meant to
// read differently from `valueIfPlaced()`, which supplies the missing
// category itself. Neither `valueAt` nor `valueIfPlaced` is built in this
// item (§S4, separate); this module exports the one piece they will both
// call.
//
// A PIECE DOES NOT CONTRIBUTE TO ITS OWN CELL. "Raises desirability nearby"
// is about neighbours; a piece occupying `cell` is excluded from `cell`'s
// own sum (it would otherwise apply its adjacency to itself every time,
// which nothing in S1/S2/S4 asks for and would make every residential cell
// automatically dilute itself regardless of what is actually nearby).
//
// FALLOFF — §S2, REBUILD-PLAN.md T9 (Barr & Cohen 2014, Clark's negative
// exponential): D(r) = D0 * e^(-gamma * r) -- steep immediately outside a
// piece, then flattening, never linear. `falloff(distance)` returns the
// MULTIPLIER only (D0 is the caller's own adjacency bonus); `value()`
// multiplies each contribution by it before summing. Preserves sign, so a
// dilutive (negative) bonus decays toward zero the same way a positive one
// does -- T9 is phrased in terms of positive "density" but nothing in it or
// in SCORING-MODEL suggests residential-on-residential dilution should
// behave differently from any other adjacency effect.
//
// GAMMA IS DERIVED, NOT HAND-PICKED, FROM ONE NAMED CHOICE:
// docs/DECISIONS-FOR-MARK.md #13 has the full account. `EDGE_FRACTION = 0.1`
// -- at the edge of R (distance = R), a piece's influence has dropped to
// 10% of its nominal value: clearly present, meaningfully diminished,
// avoiding both "R feels arbitrary because the edge is still nearly full
// strength" and "R and the falloff say the same thing because the edge is
// already ~0". GAMMA = -ln(EDGE_FRACTION) / R follows algebraically so that
// `falloff(R) === EDGE_FRACTION` exactly. T9's own citation gives the
// curve's SHAPE, not a number for a hard R=3 cutoff (Clark's model is
// continuous, city-scale, kilometres) -- EDGE_FRACTION is a disclosed
// judgement call, not sourced from the paper, same rigor as A1's adjacency
// magnitudes. ONE CONSEQUENCE WORTH KNOWING, not just the edge dampening:
// because self-exclusion guarantees a contributing piece is never closer
// than distance 1 (occupancy makes two pieces sharing a cell impossible),
// NOTHING in the live game ever contributes above `falloff(1) ≈ 0.464` of
// its nominal adjacency value -- the practical range in play is roughly
// [0.1, 0.46], not "mostly full strength, dampened only at the edge."
// =============================================================================

import { cellsOf, SURFACE } from "./area-board.js";

export const R = 3;
const EDGE_FRACTION = 0.1;
const GAMMA = -Math.log(EDGE_FRACTION) / R;

/** The falloff MULTIPLIER at a given Chebyshev distance, range (0, 1].
 * `falloff(0) === 1` by construction, though no included piece is ever
 * actually at distance 0 from the cell it influences -- occupancy makes
 * that geometrically impossible (see the header). */
export function falloff(distance) {
  return Math.exp(-GAMMA * distance);
}

function chebyshevDistance(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** Every DISTINCT piece id occupying a cell within Chebyshev R of (x,y),
 * excluding the piece (if any) that occupies (x,y) itself -- scanned once
 * per call, nothing cached. A piece spanning several cells within R is
 * still counted once. */
export function pieceIdsWithinR(board, x, y, radius = R) {
  const selfId = board.pieceIdAt(x, y);
  const ids = new Set();
  const xMin = Math.max(0, x - radius);
  const xMax = Math.min(board.width - 1, x + radius);
  const yMin = Math.max(0, y - radius);
  const yMax = Math.min(board.height - 1, y + radius);
  for (let cy = yMin; cy <= yMax; cy++) {
    for (let cx = xMin; cx <= xMax; cx++) {
      if (chebyshevDistance(x, y, cx, cy) > radius) continue;
      const id = board.pieceIdAt(cx, cy);
      if (id !== -1 && id !== selfId) ids.add(id);
    }
  }
  return [...ids];
}

/** Chebyshev distance from (x,y) to the NEAREST cell of a rect (inclusive
 * of being inside it, distance 0). `rect.xMax`/`yMax` are EXCLUSIVE upper
 * bounds -- occupiedRect()'s and cellsOf()'s own convention throughout
 * area-board.js -- so the last occupied index is `xMax - 1`/`yMax - 1`;
 * without that -1 a cell immediately adjacent to the rect would wrongly
 * compute distance 0. "How far is the shop from my house" means distance
 * to its nearest point, not to an anchor corner that might be on the far
 * side of a large piece. */
function nearestChebyshevDistance(x, y, rect) {
  const dx = Math.max(rect.xMin - x, 0, x - (rect.xMax - 1));
  const dy = Math.max(rect.yMin - y, 0, y - (rect.yMax - 1));
  return Math.max(dx, dy);
}

/** TER-5 (PLAN.md §4): terrainContribution reads the board's own REAL
 * elevation/surfaceType fields (populated by public/terrain-populate.js
 * from public/terrain-field.js -- TER-1/TER-2/TER-3), not a stub. Same
 * signature and callers as before; only the body changed, per this
 * function's own prior header.
 *
 * Two disclosed terms, no formula sourced for either (SCORING-MODEL §7.1's
 * own precedent: every §S2 magnitude started this way, same rigor as
 * DECISIONS-FOR-MARK.md #12's adjacency placeholders):
 *
 *   WATER ADJACENCY -- waterfront land is real-world more valuable
 *   (RESEARCH.md L4's port-city framing; a well-established fact about
 *   land value this project does not need a paper to state). A bonus
 *   applies when water exists within TERRAIN_WATER_ADJACENCY_R cells,
 *   same falloff-by-distance shape S2 already uses for piece adjacency
 *   (not reused directly -- terrain's own radius and magnitude are their
 *   own disclosed choice, not S2's R=3/EDGE_FRACTION=0.1).
 *
 *   SLOPE PENALTY -- steep ground costs more to build on. Measured as the
 *   largest elevation difference to an in-bounds orthogonal neighbour (a
 *   local relief proxy, read from the board's own stored elevation, never
 *   from public/terrain-field.js directly -- scoring reads the BOARD,
 *   not the generator, so a cell's score never depends on how it was
 *   populated).
 *
 * A water cell itself scores 0 -- nothing is built ON water in this
 * catalogue (no entry both permits water and would be scored by this
 * term), so its own terrain term is inert rather than double-counting the
 * adjacency bonus a LAND neighbour already receives from being near it.
 */
const TERRAIN_WATER_ADJACENCY_R = 2;
const TERRAIN_WATER_BONUS = 3; // §S2's own MODERATE magnitude (migrate-catalogue-s2-fields.mjs) -- not sourced, disclosed
const TERRAIN_SLOPE_PENALTY_PER_M = -2; // per metre of local relief to the steepest in-bounds neighbour

export function terrainContribution(board, x, y) {
  if (board.surfaceAt(x, y) === SURFACE.WATER) return 0;

  let nearWater = false;
  for (let dy = -TERRAIN_WATER_ADJACENCY_R; dy <= TERRAIN_WATER_ADJACENCY_R && !nearWater; dy++) {
    for (let dx = -TERRAIN_WATER_ADJACENCY_R; dx <= TERRAIN_WATER_ADJACENCY_R; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
      if (chebyshevDistance(x, y, nx, ny) > TERRAIN_WATER_ADJACENCY_R) continue;
      if (board.surfaceAt(nx, ny) === SURFACE.WATER) { nearWater = true; break; }
    }
  }

  const here = board.elevationAt(x, y);
  let maxRelief = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
    const diff = Math.abs(here - board.elevationAt(nx, ny));
    if (diff > maxRelief) maxRelief = diff;
  }

  return (nearWater ? TERRAIN_WATER_BONUS : 0) + maxRelief * TERRAIN_SLOPE_PENALTY_PER_M;
}

/**
 * @param {object} board  from createAreaBoard()
 * @param {object|Map} catalogue  typeId -> { category, adjacency, ... }
 * @param {number} x
 * @param {number} y
 * @param {string} [categoryOverride]  §S4: when supplied, used as the
 *   occupant category INSTEAD OF reading `board.pieceIdAt(x,y)`'s own
 *   category -- this is the one seam `valueIfPlaced` needs (a hypothetical
 *   candidate's category, never actually placed on the board) and it is
 *   parameterized here rather than given a second, hand-copied
 *   implementation in a sibling function. Composing one function two ways
 *   carries zero drift risk; two functions with the same loop body,
 *   maintained separately, do not stay identical forever. Optional and
 *   last, so every existing 4-argument call site (valueAt, recomputeDirtySet,
 *   every S1-S3 test) is unaffected.
 */
export function value(board, catalogue, x, y, categoryOverride) {
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];

  let occupantCategory;
  if (categoryOverride !== undefined) {
    occupantCategory = categoryOverride;
  } else {
    const occupantId = board.pieceIdAt(x, y);
    occupantCategory = occupantId === -1 ? null : catalogueOf(board.getPiece(occupantId).typeId).category;
  }

  let total = terrainContribution(board, x, y);

  // A vacant cell has no category to key adjacency against -- terrain only.
  if (occupantCategory === null) return total;

  for (const pieceId of pieceIdsWithinR(board, x, y)) {
    const piece = board.getPiece(pieceId);
    const entry = catalogueOf(piece.typeId);
    const bonus = entry.adjacency[occupantCategory];
    if (typeof bonus === "number") {
      const distance = nearestChebyshevDistance(x, y, board.rectFor(pieceId));
      total += bonus * falloff(distance);
    }
  }

  return total;
}

// =============================================================================
// THE DIRTY SET — §S3. "On placement or removal, recompute only the cells
// inside the affected radius. Never the whole board, never per frame."
//
// A placement or removal at `rect` can only change `value()` for a cell
// within Chebyshev R of SOME cell `rect` occupies -- everything else reads
// the identical set of nearby pieces it did before, so its own value()
// cannot have moved. `dirtyCellsForRect` names exactly that set.
//
// THE MATH: an L∞ (Chebyshev) ball around every point of an axis-aligned
// rectangle is ITSELF exactly another axis-aligned rectangle -- dilation by
// a Chebyshev ball is separable per axis, so no per-cell distance filter is
// needed (unlike `pieceIdsWithinR`'s point-based scan, which keeps one for
// its own -- unrelated -- reasons, out of this item's scope to touch).
// GOT WRONG ONCE, CAUGHT BY BLIND REVIEW BEFORE ANY CODE LANDED: the first
// version of this comment described the exclusive-upper-bound conversion as
// `rect.xMax - 1 + radius` -- correct as the INCLUSIVE rightmost dirty
// column, but silently one column short once handed to `cellsOf()`'s own
// EXCLUSIVE convention (it loops `x < rect.xMax`). The real formula needs a
// compensating +1: `rect.xMax + radius` is the correct EXCLUSIVE bound. Not
// hypothetical -- reproduced by hand: for a piece occupying columns 5-6 at
// radius 3, the true dirty set includes column 9 (Chebyshev distance exactly
// 3, `falloff(3) = EDGE_FRACTION`, nonzero); the wrong formula silently
// dropped it. Both the positive case (a cell AT the true edge IS in the
// dirty set) and the negative case (one cell further is NOT) are pinned by
// separate tests below -- a test that only checks the negative case would
// not have caught this, and did not, until this was found.
//
// ACCEPTED COST, NAMED RATHER THAN SILENT: `recomputeDirtySet` calls
// `value()` once per dirty cell, and each call independently re-scans its
// own (2R+1)^2 neighbourhood via `pieceIdsWithinR` -- heavily overlapping
// adjacent cells' own scans. For a large piece the dirty set can be
// hundreds of cells. This is bounded per EVENT (a placement or a removal),
// never per frame and never the whole board, which is what this item's own
// gate asks for -- but it is real, repeated work, not free, and a future
// performance pass could share scans across the dirty set if it matters in
// practice.
// =============================================================================

/** Every `{x,y}` cell within Chebyshev `radius` of ANY cell inside `rect`,
 * clipped to the board. Pure geometry -- composes `cellsOf()` from
 * area-board.js rather than reimplementing cell iteration. */
export function dirtyCellsForRect(board, rect, radius = R) {
  const clipped = {
    xMin: Math.max(0, rect.xMin - radius),
    xMax: Math.min(board.width, rect.xMax + radius),
    yMin: Math.max(0, rect.yMin - radius),
    yMax: Math.min(board.height, rect.yMax + radius),
  };
  return [...cellsOf(clipped)];
}

/**
 * Recompute `value()` for exactly the dirty set a placement or removal at
 * `rect` affects -- never the whole board. Returns a `Map` from `"x,y"` to
 * the freshly computed value; the Map's own keys are the record of which
 * cells were actually touched, which is what this item's own gate needs
 * ("the test asserts WHICH cells recomputed. An assertion on the result
 * alone cannot see this" -- a far cell's value() would still be CORRECT if
 * computed anyway, so only checking values can't tell "touched 20 cells"
 * from "touched all 400 and 380 happened not to change").
 */
export function recomputeDirtySet(board, catalogue, rect, radius = R) {
  const results = new Map();
  for (const { x, y } of dirtyCellsForRect(board, rect, radius)) {
    results.set(`${x},${y}`, value(board, catalogue, x, y));
  }
  return results;
}

// =============================================================================
// valueAt, valueIfPlaced, AND THE TWO WORTHS — §S4, "the point of the whole
// model" per SCORING-MODEL §3.2/§3.3.
//
// `valueAt` is `value()` itself, named per §S4's own vocabulary -- "the
// target cell's CURRENT value... pure location, the ghost readout."
//
// `valueIfPlaced` asks "what would value(x,y) be if `typeId` occupied
// (x,y)?" WITHOUT ever calling `board.place()`/`board.remove()` -- it
// supplies `typeId`'s own category as `value()`'s `categoryOverride`
// (above), which is structurally, not just behaviourally, incapable of
// mutating the board: there is no code path here that could touch
// occupancy even by accident. A place-then-restore approach was considered
// and rejected: `evaluatePlacement` refuses outright when the candidate's
// OWN full footprint doesn't fit (occupied, terrain-mismatched, out of
// bounds) -- exactly where a hover-preview is most useful -- so that route
// would return NO NUMBER AT ALL for the common case of previewing over
// ground the candidate cannot actually occupy. This readout is about the
// desirability of a spot, decoupled from whether a piece can physically fit
// there right now; that is C2.3's `evaluatePlacement`'s own, separate job.
//
// `rotation` is accepted in the signature (matching C2.2/`evaluatePlacement`'s
// own convention, and the checklist's own stated signature) but DOES NOT
// change the computed number under this design -- `value()` is inherently
// single-point, examining only NEIGHBOURING pieces' rects via
// `nearestChebyshevDistance`, never the candidate's own footprint cells. A
// disclosed choice, not a silent gap: a future caller must not assume
// hovering a different rotation changes this particular readout.
//
// OCCUPIED-CELL ("REPLACE") BEHAVIOUR, VERIFIED, NOT JUST ASSUMED:
// `pieceIdsWithinR`'s own self-exclusion keys on `board.pieceIdAt(x,y)` --
// the REAL current occupant's id -- independent of `categoryOverride`. So
// calling `valueIfPlaced` on an already-occupied cell correctly excludes
// the real occupant from its own neighbour sum (as `value()` always does)
// while using the CANDIDATE's category for the lookup -- exactly "replace"
// semantics, covered by its own test below, not left as an undemonstrated
// side effect of the design.
// =============================================================================

export function valueAt(board, catalogue, x, y) {
  return value(board, catalogue, x, y);
}

export function valueIfPlaced(board, catalogue, typeId, x, y, rotation) {
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];
  const category = catalogueOf(typeId).category;
  return value(board, catalogue, x, y, category);
}

/** SCORING-MODEL §3.2: perUnitWorth(type, cell) = value(cell) x unitQuality(type). */
export function perUnitWorth(valueNumber, unitQuality) {
  return valueNumber * unitQuality;
}

/** SCORING-MODEL §3.3: totalWorth(type, cell) = perUnitWorth(type, cell) x
 * units(type). Callers pass `catalogue[typeId].baseValue` as `units` --
 * `baseValue` was redefined in A1 to mean the unit count (footprint area x
 * storeys, FIX-2/PLAN.md §3.2 -- massing.length before it), not a worth
 * number; this does not recompute that formula a second time. */
export function totalWorth(perUnitWorthNumber, units) {
  return perUnitWorthNumber * units;
}
