// =============================================================================
// THE BOARD, LOADED -- NOT GENERATED. THE PAGE LOADS; A BUILD STEP GENERATES.
//
// B2.6 (Mark, 2026-09-08): "The page LOADS the board. Generation is a build
// step, not a runtime path." scripts/gen-board.mjs is the build step
// (~40 s, run offline -- see its own header); this module is the load
// path, and it does not re-answer the ground question generation already
// answered. Every piece in `public/board.generated.json` was already
// placed once, successfully, by public/board-generator.js's own
// generateBoard() -- replaying them here with `groundVerified: true`
// (public/board.js's own opt-in, added for exactly this) skips the
// exhaustive ground check a second time and pays only the SPACE
// (occupancy) check, measured at well under a second for the whole board
// (docs/specs/BOARD-REBUILD-PLAN.md's B2.5 section: spaceCheckMs
// 461-651 ms for 35,365 pieces during generation itself, and loading
// pays the identical cost, not more).
//
// WHY groundVerified IS SAFE HERE, SPECIFICALLY: it is an opt-in that
// trusts the CALLER's own proof. generateBoard() is that proof --
// sampledGroundOk() was itself proven equivalent to the exhaustive check
// on every real candidate before ever being trusted (B2.5's own
// verifySampling run, 100% agreement, 50,656 candidates). A persisted
// piece already passed that chain once; loading it does not need to
// re-derive ground validity, only re-establish occupancy, which is what
// this module actually does.
// =============================================================================
import { createBoard } from "./board.js";
import { atomOf } from "./grid.js";

/**
 * Reconstruct a real board.js instance from a previously-generated,
 * persisted payload (public/board.generated.json's own shape:
 * `{ seed, pieceCount, pieces, boundaries }`).
 *
 * @param {object} payload parsed JSON, `scripts/gen-board.mjs`'s own output
 * @param {(x:number,z:number)=>number} heightAt real WORLD-space terrain --
 *        still needed for board.js's own k-level stacking math
 *        (verticalExtent/groundYFor), which is real geometry, not a ground
 *        VALIDITY question -- see this file's own header for why the
 *        validity question itself is not re-asked here.
 * @returns {{ board, pieces, boundaries, seed }} same shape as
 *          generateBoard()'s own return value, so a caller does not need
 *          to know whether a board was generated or loaded.
 */
export function loadBoard(payload, heightAt) {
  if (!payload || !Array.isArray(payload.pieces)) {
    throw new Error("board-load: payload is not a gen-board.mjs output -- missing .pieces");
  }
  const board = createBoard({ heightAt });
  const pieces = [];
  const rejected = [];
  for (const piece of payload.pieces) {
    const r = board.place(piece, { groundVerified: true });
    if (r.ok) {
      pieces.push(piece);
    } else {
      // SPACE can still refuse here -- two persisted pieces overlapping
      // would be a real defect in the generator that produced this file,
      // not something to silently drop. Collected, not thrown: one bad
      // piece should not make the whole board unloadable, but it must be
      // visible, not swallowed.
      rejected.push({ id: piece.id, reason: r.reason });
    }
  }
  if (rejected.length > 0) {
    console.error(`board-load: ${rejected.length} persisted piece(s) failed to place on load (space conflict) -- sample:`, rejected.slice(0, 5));
  }
  return { board, pieces, boundaries: payload.boundaries || [], seed: payload.seed };
}

/**
 * Fetch and load the committed board -- the real client-side entry point.
 * `url` defaults to the static asset path (served by Cloudflare's own
 * ASSETS binding, public/ -- no Worker request handler involved at all,
 * per B2.6's own transport decision).
 */
export async function fetchBoard(heightAt, url = "/board.generated.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`board-load: fetch(${url}) failed: ${res.status}`);
  const payload = await res.json();
  return loadBoard(payload, heightAt);
}

/**
 * What real board piece, if any, occupies the atom under a given
 * world-space point -- P4.1's own "the real board record for a clicked
 * plot", generalised to ANY loaded board, not just buildings a caller has
 * pre-indexed by plot id. One ground-level query via board.js's own
 * inCells(), the same spatial-index method every other real occupancy or
 * neighbour question in this codebase already answers through -- no
 * second, parallel notion of "what is here".
 *
 * Ground-level only by default: a piece placed ONLY above k=0 (a rooftop
 * item, an upper deck) is not found by the default call -- named rather
 * than silently assumed away; nothing in this codebase currently needs an
 * elevated pick, and a caller that later does can pass k explicitly.
 *
 * @param {ReturnType<typeof createBoard>} board a real board.js instance
 * @param {number} x world-space x, metres
 * @param {number} z world-space z, metres
 * @param {number} [k] vertical level to query, default 0 (ground)
 * @returns {object|null} the real piece record, or null if nothing is there
 */
export function pieceAtPoint(board, x, z, k = 0) {
  const { i, j } = atomOf(x, z);
  const hits = board.inCells(i, j, 1, 1, k);
  return hits[0] || null;
}
