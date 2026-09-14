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

import { cellsOf } from "./area-board.js";

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

/** No terrain system exists yet (REBUILD-PLAN.md T1-T3, a later build-order
 * step, not built). Flat, always zero -- the same "defaulted to zero while
 * flat" contract C2.2 already established for the board's own elevation
 * and surfaceType fields. A real terrain phase replaces this function's
 * body, not its signature or its callers. */
export function terrainContribution(board, x, y) {
  return 0;
}

/**
 * @param {object} board  from createAreaBoard()
 * @param {object|Map} catalogue  typeId -> { category, adjacency, ... }
 * @param {number} x
 * @param {number} y
 */
export function value(board, catalogue, x, y) {
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];

  const occupantId = board.pieceIdAt(x, y);
  const occupantCategory = occupantId === -1 ? null : catalogueOf(board.getPiece(occupantId).typeId).category;

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
