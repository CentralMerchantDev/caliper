// =============================================================================
// THE WORLD LAYER — REBUILD-PLAN.md W5 (load/unload) and W6 (addressing,
// camera-relative origin). Composes public/area.js's state machine; does not
// reimplement it.
//
// W6: "A cell is `{ areaId, x, y }`, local to its area... there is no global
// cell grid and no global index arithmetic." That is not a rule this module
// enforces by checking — it is a rule the DESIGN makes true by construction:
// each area's board (public/area-board.js) is its own separate object, with
// its own typed arrays. There is no shared array a coordinate could collide
// in across areas, the same way two Map instances cannot collide on a key
// no matter what either one holds.
//
// W5: what is resident, what loads on entry, what is discarded on leaving.
// "Placements are never discarded; only their rendered form is." This module
// has no renderer to discard anything FROM — what it owns is the smaller,
// honest slice of that: an area's BOARD OBJECT is materialised on entry (via
// a caller-supplied loader — this module does not know where placements are
// persisted, C2.5's job) and released on leaving. The loader is the thing
// responsible for continuity; releasing the in-memory board and calling the
// loader again on re-entry must reproduce the same state, which is exactly
// what test/worldLayer.test.ts proves with a loader that hands back the
// same board twice.
// =============================================================================

import { createArea, createAreaWorld, AREA_STATE } from "./area.js";

export { createArea, AREA_STATE };

/**
 * @param {object} opts
 * @param {Array<{id:string, name?:string, state?:string, worldAnchor?:{x:number,z:number}}>} opts.areas
 */
export function createWorldLayer({ areas = [] } = {}) {
  const areaWorld = createAreaWorld({
    areas: areas.map((a) => createArea({ id: a.id, name: a.name, state: a.state })),
  });
  const anchors = new Map(areas.map((a) => [a.id, a.worldAnchor ? { ...a.worldAnchor } : { x: 0, z: 0 }]));
  // Resident only while an area is (or recently was, before its own leave())
  // active -- the "on entering" / "discarded on leaving" half of W5's table.
  const boards = new Map();

  /**
   * Enter an area, materialising its board via `loadBoard(areaId)` if it is
   * not already resident. Refuses exactly as areaWorld.enter() does (LOCKED
   * is still refused here — this wraps it, it does not re-decide it).
   */
  function enter(id, { loadBoard } = {}) {
    const result = areaWorld.enter(id);
    if (!result.ok) return result;
    if (result.left && result.left !== id) boards.delete(result.left);
    if (!boards.has(id) && typeof loadBoard === "function") {
      boards.set(id, loadBoard(id));
    }
    return result;
  }

  /** Leave the active area. Its board is released (W5: discarded on
   *  leaving); the area list and states are untouched (W5: always resident). */
  function leave() {
    const { left } = areaWorld.leave();
    if (left) boards.delete(left);
    return { left };
  }

  /** The resident board for an area, or null if it is not currently loaded. */
  function boardFor(id) {
    return boards.get(id) || null;
  }

  /**
   * Camera-relative origin (W6): the world-space anchor of the ACTIVE area,
   * or null if none is active. A caller subtracts this from any absolute
   * world position to get camera-relative coordinates -- the "one
   * translation on entry" the spec asks for. A piece's own stored
   * `anchorCell` never changes when the active area changes; only this
   * value does.
   */
  function cameraOrigin() {
    const active = areaWorld.active();
    if (!active) return null;
    return { ...anchors.get(active.id) };
  }

  /**
   * Resolve a full address `{ areaId, x, y }` to whatever piece (if any)
   * occupies that cell -- strictly within that one area's own board. There
   * is no fallback and no shared index: an areaId naming an area with no
   * resident board, or a cell address that happens to numerically match
   * something in a DIFFERENT area's board, cannot resolve to that other
   * area's piece. That is W6's own gate ("a piece resolving to the wrong
   * area") made structurally impossible rather than merely checked.
   */
  function resolveCell({ areaId, x, y }) {
    const board = boards.get(areaId);
    if (!board) return null;
    return board.pieceAt(x, y);
  }

  return {
    list: areaWorld.list,
    get: areaWorld.get,
    open: areaWorld.open,
    lock: areaWorld.lock,
    active: areaWorld.active,
    get activeAreaId() { return areaWorld.activeAreaId; },
    enter,
    leave,
    boardFor,
    cameraOrigin,
    resolveCell,
  };
}
