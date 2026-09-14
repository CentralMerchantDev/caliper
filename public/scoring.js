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
// FALLOFF IS NOT YET APPLIED HERE -- every piece within R contributes its
// full flat adjacency value regardless of exact distance. That is §S2's own
// item, layered on top of this function, not a property S1 itself claims.
// =============================================================================

export const R = 3;

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
    if (typeof bonus === "number") total += bonus;
  }

  return total;
}
