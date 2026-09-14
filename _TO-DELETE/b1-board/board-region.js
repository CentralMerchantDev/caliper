// Shared by public/isolate.js (P4.3) and public/move-piece.js (P4.4): both
// need a real board.js query scoped to a small region, not the whole
// 18,000+-piece world. Extracted here rather than duplicated, per this
// project's own standing rule against building a second answer to the same
// need beside an existing one (docs/AUDIT-PROTOCOL.md's Failure pattern E).
import { footCellRect, createBoard } from "./board.js";

/**
 * A real board.js board, populated with only the pieces whose FOOT
 * rectangle overlaps `box` -- a coarse prefilter over the flat piece list
 * (board.js's own exported footCellRect, not a re-derived rectangle test),
 * so a small local query never pays board.js's own place()-per-piece
 * ground/space validation cost across the whole world.
 *
 * Best-effort placement: real adapted data (board-adapter.js's own
 * documented footprint-proxy approximation) is not guaranteed to satisfy
 * board.js's own stricter canPlace on every piece. A piece that does not
 * place is simply absent from this local board, not a crash -- callers get
 * `placedCount`/`localCount` to judge how much of the region actually
 * populated.
 *
 * @param {{xMin:number,xMax:number,zMin:number,zMax:number}} box world metres
 * @param {Map<string,object>} boardPieces `bld-${plotId}` -> piece record
 * @param {object} [opts]
 * @param {(x:number,z:number)=>number} [opts.heightAt]
 * @param {(i:number,j:number)=>boolean} [opts.inWorld]
 */
export function localBoard(box, boardPieces, { heightAt = null, inWorld = null } = {}) {
  const local = [];
  for (const p of boardPieces.values()) {
    const r = footCellRect(p);
    if (r.xMax <= box.xMin || r.xMin >= box.xMax || r.zMax <= box.zMin || r.zMin >= box.zMax) continue;
    local.push(p);
  }
  const board = createBoard({ heightAt, inWorld });
  let placedCount = 0;
  for (const p of local) {
    if (board.place(p).ok) placedCount++;
  }
  return { board, localCount: local.length, placedCount };
}
