// =============================================================================
// POINTER INTERACTION — RC1, docs/specs/REBUILD-CHECKLIST.md "MAKE IT
// PLAYABLE". Tier 1 (REBUILD-PLAN.md C2.2) ONLY: hover, commit, cancel,
// remove. No undo (R7 says the minimum is small and undo is not part of
// it), no multi-select, no drag-to-place -- not built here, not started
// here.
//
// PURE, NO THREE.JS, NO DOM -- everything here is a real `createAreaBoard()`
// and a real `createPlacementSession()` (public/placement.js), called
// exactly as a player's own click would call them, so this module's own
// tests assert against the REAL board's own piece count, not a renderer's
// claim about it (this run's own brief §3, restated a third time: "assert
// against the real thing"). The one browser-only step -- screen pixel to a
// world (x,z) via a THREE.Raycaster against the ground plane -- stays in
// look-proof-scene.html, which calls straight into this module's own
// cellFromWorldXZ the moment it has a world point, so the actual DECISION
// logic (which cell, hover vs. commit vs. remove vs. cancel) is identical
// whether it is driven by a real mouse or a test.
// =============================================================================

import { MODULE_SIZE_M } from "./board-renderer.js";

/** The inverse of board-renderer.js's own anchorForCell: a world (x,z), in
 * metres, to the board cell it falls inside. Floor, not round -- a cell
 * (x,y) occupies world [x*4, (x+1)*4) x [y*4, (y+1)*4), the same
 * half-open convention occupiedRect's own cellsOf already uses. */
export function cellFromWorldXZ(x, z, moduleSize = MODULE_SIZE_M) {
  return { x: Math.floor(x / moduleSize), y: Math.floor(z / moduleSize) };
}

/** Hover. Re-previews the ghost at this cell every call -- C2.3's own
 * "revalidated only when called, not every frame" contract already lives
 * in session.setGhost itself; this is a named pass-through so
 * look-proof-scene.html's own pointermove handler reads as "hover moves
 * the ghost" rather than a bare session call. */
export function handleHover(session, typeId, cell, rotation) {
  return session.setGhost(typeId, cell, rotation);
}

/**
 * Click. THE ROUTING RULE this item adds -- neither area-board.js nor
 * placement.js decides what a click MEANS; Tier 1 names commit and remove
 * as separate verbs, and this is where they meet one input.
 *
 * A real piece already at the clicked cell wins over any ghost that
 * happens to be showing there: checked against the board's own
 * `pieceIdAt` (never the ghost's own state, which reflects the LAST
 * hovered cell and could be stale or for a different cell than the one
 * actually clicked), so a click always resolves the way a person looking
 * at the board would read it -- is there already a building here?
 *
 * If not, the click commits whatever the current ghost previews.
 * `session.commit()` is already inert on an invalid or absent ghost
 * (placement.js's own C2.2 contract) -- this function does not re-decide
 * that, it only routes to it.
 */
export function handleClick(board, session, cell) {
  const existingId = board.pieceIdAt(cell.x, cell.y);
  if (existingId !== -1) {
    return { action: "remove", result: session.remove(existingId) };
  }
  return { action: "commit", result: session.commit() };
}

/** Escape, or right-click: drop the ghost. The board is never touched --
 * session.cancel() already guarantees that (placement.js's own comment on
 * cancel: "the board is never touched by a cancel"). */
export function handleCancel(session) {
  session.cancel();
  return { action: "cancel" };
}
