// =============================================================================
// P4.4 MOVE -- drag a piece to a new grid address.
//
// board.js's canPlace ALREADY refuses with a real, structured
// { ok:false, reason, blockedBy } -- P4-GROUNDING.md's own instruction is to
// wire that existing refusal to a cursor, not write a new one. This file is
// that wiring's pure half (no Three.js, no UI): given a plotId and a
// destination cell, ask a real local board.js whether the move fits, and if
// it does, build the exact world-model.js `move` layer edit that makes it
// real. tryMove() never mutates anything -- the caller (world-render-3d.js's
// _moveSelected) decides what to do with an ok/refused result.
//
// SAME LOCAL-BOARD PATTERN AS P4.3's neighboursOf (public/board-region.js):
// a real board.js query, scoped to a small region around the destination,
// not the whole 18,000+-piece world -- board.js's own canPlace validation
// cost is real and not worth paying at world scale for one drag.
// =============================================================================
import { orientedWD } from "./board.js";
import { localBoard } from "./board-region.js";

/** Same margin unit as P4.3's NEIGHBOUR_MARGIN_M (grid.js's own named
 *  16 m indexing/display grouping) -- generous enough that the destination's
 *  own foot+clear rectangle, and whatever already stands around it, are
 *  fully covered by the local board's population. */
export const MOVE_QUERY_MARGIN_M = 16;

/**
 * Would moving `plotId` to `destCell` (its own foot/clear/levels/standsOn
 * unchanged, only cell/rotation moving) fit? A pure query -- does not touch
 * the board, the world model, or the scene.
 *
 * @param {string} plotId
 * @param {{i:number, j:number, k?:number, rotation?:number}} destCell
 * @param {Map<string,object>} boardPieces `bld-${plotId}` -> piece record
 * @param {object} [opts]
 * @param {(x:number,z:number)=>number} [opts.heightAt]
 * @param {(i:number,j:number)=>boolean} [opts.inWorld]
 * @returns {{ok:true, plotId, selected, destCell, destWorld:{x,z}} |
 *           {ok:false, reason:string, blockedBy?:object, plotId, selected}}
 */
export function tryMove(plotId, destCell, boardPieces, { heightAt = null, inWorld = null } = {}) {
  const selected = boardPieces.get(`bld-${plotId}`) || null;
  if (!selected) return { ok: false, reason: "not-found", plotId, selected: null };

  const rotation = destCell.rotation ?? selected.rotation;
  const k = destCell.k ?? selected.cell.k;
  const { w, d } = orientedWD(selected.foot, rotation);
  const box = {
    xMin: destCell.i - MOVE_QUERY_MARGIN_M, xMax: destCell.i + w + MOVE_QUERY_MARGIN_M,
    zMin: destCell.j - MOVE_QUERY_MARGIN_M, zMax: destCell.j + d + MOVE_QUERY_MARGIN_M,
  };
  // The selected piece's own CURRENT reservation is placed into this local
  // board too (boardPieces is unfiltered) -- canPlace's own ignoreId is what
  // keeps a piece from refusing its own move by colliding with itself,
  // matching board.js's own move()/replace() reasoning exactly rather than
  // pre-filtering it out here as a second answer to the same need.
  const { board } = localBoard(box, boardPieces, { heightAt, inWorld });

  const fit = board.canPlace(
    { cell: { i: destCell.i, j: destCell.j, k }, rotation, foot: selected.foot, clear: selected.clear, levels: selected.levels, standsOn: selected.standsOn },
    { ignoreId: selected.id },
  );
  if (!fit.ok) return { ok: false, reason: fit.reason, blockedBy: fit.blockedBy, plotId, selected };

  // The render anchor for a moved building is its footprint's CENTRE, the
  // same convention layout.js's own placement.x/z already use (`(b.xMin +
  // b.xMax) / 2`) -- not re-derived, matched, so an overridden piece's
  // render position means the same thing a normal one's does.
  const destWorld = { x: destCell.i + w / 2, z: destCell.j + d / 2 };
  return { ok: true, plotId, selected, destCell: { i: destCell.i, j: destCell.j, k, rotation }, destWorld };
}

/**
 * The world-model.js layer edit for a successful tryMove() result --
 * `{ address: plotId, op: "move", payload: { x, z } }`, world-model.js's own
 * validated shape (LAYER_OPS/`op === "move"` needs payload.x/payload.z,
 * finite). Callers still run this through layerFrom()/world.layers.add()
 * themselves (public/apply-and-persist.js's own reference pattern) -- this
 * only builds the one edit, not a whole layer, since a layer also carries an
 * id/author this file has no opinion about.
 */
export function moveEditFor(moveResult) {
  if (!moveResult.ok) throw new Error("moveEditFor: cannot build an edit from a refused move");
  return { address: moveResult.plotId, op: "move", payload: { x: moveResult.destWorld.x, z: moveResult.destWorld.z } };
}
