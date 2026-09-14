// =============================================================================
// PLACEMENT — REBUILD-PLAN.md C2.2 (Tier 1) and C2.5 (save format).
//
// C2.2: palette -> ghost -> validity, continuous -> commit (inert when
// invalid) -> cancel -> remove. "The ghost and the commit call the same
// function." Here that is not a promise kept by discipline — `commit()`
// calls `board.place()`, and `board.place()` itself calls
// `evaluatePlacement()` before doing anything (area-board.js). `setGhost()`
// calls the identical `evaluatePlacement()` for its own preview. One
// function, two callers; they cannot disagree because there is only one of
// them to ask.
//
// C2.5, corrected 2026-09-14: `{ seed, generatorParams, tombstones: number[],
// placements[] }`. A GENERATED piece that gets removed (bulldozed) is not
// saved as "absent" by omission — its anchor cell is recorded in
// `tombstones`, so `loadBoard` knows to skip it when the generator
// reproduces it from the seed. A PLAYER-placed piece needs no tombstone: it
// simply is not regenerated, so its absence from `placements` already means
// gone. This is why the two lists have different shapes — one is what to
// ADD back, the other is what to REFUSE to add back.
// =============================================================================

import { createAreaBoard } from "./area-board.js";

/**
 * @param {object} opts
 * @param {object} opts.board  a board from createAreaBoard()
 */
export function createPlacementSession({ board }) {
  let ghost = null;
  // Cell indices (y*width+x, matching the board's own addressing) where a
  // GENERATED piece was removed. Tracked here, not in area-board.js itself
  // -- the board is pure occupancy/placement data; "what the generator
  // would have put back that the player refused" is a persistence concern,
  // not a board concern, the same separation world.js/apply-layers.js and
  // model-registry.js/resolve-models.js already keep elsewhere in this repo.
  const tombstones = new Set();

  /** Preview a placement. Revalidated only when THIS is called -- C2.3: "not
   *  every frame" -- so a caller re-evaluates on anchor-cell or rotation
   *  change, not on a timer. */
  function setGhost(typeId, anchorCell, rotation) {
    const verdict = board.evaluatePlacement(typeId, anchorCell, rotation);
    ghost = {
      typeId,
      anchorCell: { ...anchorCell },
      rotation,
      valid: verdict.ok,
      reason: verdict.ok ? null : verdict.reason,
    };
    return { ...ghost };
  }

  function getGhost() {
    return ghost ? { ...ghost } : null;
  }

  /** Esc: drop the ghost. The board is never touched by a cancel. */
  function cancel() {
    ghost = null;
  }

  /**
   * Click. Inert when the ghost is invalid or absent -- no error, nothing to
   * dismiss, per C2.2 item 3 verbatim. On success the ghost clears, since
   * committed content is no longer a preview of anything.
   */
  function commit() {
    if (!ghost) return { ok: false, reason: "no-ghost", detail: "nothing is being placed" };
    if (!ghost.valid) return { ok: false, reason: "inert", detail: `placement is invalid: ${ghost.reason}` };
    const result = board.place(ghost.typeId, ghost.anchorCell, ghost.rotation, { origin: "player" });
    if (result.ok) ghost = null;
    return result;
  }

  /** Bulldoze. A generated piece's removal is recorded as a tombstone so a
   *  reload does not silently bring it back; a player piece's removal needs
   *  nothing extra -- it is simply gone from the placements list. */
  function remove(id) {
    const piece = board.getPiece(id);
    if (!piece) return { ok: false, reason: "not-found", detail: `no piece with id ${id}` };
    const result = board.remove(id);
    if (result.ok && piece.origin === "generated") {
      tombstones.add(piece.anchorCell.y * board.width + piece.anchorCell.x);
    }
    return result;
  }

  /** C2.5's save shape. Generated pieces are never in `placements` -- they
   *  are reproduced by the generator on load, not stored twice. */
  function serialize({ seed, generatorParams }) {
    const placements = board
      .pieces()
      .filter((p) => p.origin !== "generated")
      .map((p) => ({ id: p.id, typeId: p.typeId, anchorCell: p.anchorCell, rotation: p.rotation }));
    return {
      seed,
      generatorParams,
      tombstones: [...tombstones].sort((a, b) => a - b),
      placements,
    };
  }

  return { setGhost, getGhost, cancel, commit, remove, serialize, tombstones: () => [...tombstones] };
}

/**
 * Rebuild a board from a C2.5 save. `generate(seed, generatorParams)` is
 * supplied by the caller -- REBUILD-PLAN.md's REVISED BUILD ORDER puts the
 * generator at step 9, after this, so this module does not assume one
 * exists; a save with no `generate` function (or one that returns nothing)
 * rebuilds a board containing only what the player actually placed.
 *
 * Returns `{ board, failures }`, never just a board. `board.place()` can
 * refuse (an unknown typeId if the catalogue changed since the save, an
 * out-of-bounds anchor if the area was resized, an id collision) and a save
 * is, by construction, from a point in time that may no longer match the
 * catalogue or board it is being replayed against -- B2's own "the catalogue
 * is a registry with a persisted overlay" makes catalogue drift between a
 * save and a later load the EXPECTED future case, not a hypothetical one.
 * Silently discarding a placement that fails to re-apply would mean a
 * player's own kept work disappears on reload with nothing to say so, which
 * is the exact class of silent failure this whole project exists to refuse.
 * `failures` names each one, with the real reason `board.place()` gave.
 */
export function loadBoard({ width, height, catalogue }, save, generate = null) {
  const board = createAreaBoard({ width, height, catalogue });
  const tombstoneSet = new Set(save.tombstones || []);
  const failures = [];

  if (typeof generate === "function") {
    const generatedPieces = generate(save.seed, save.generatorParams) || [];
    for (const gp of generatedPieces) {
      const cellIndex = gp.anchorCell.y * width + gp.anchorCell.x;
      if (tombstoneSet.has(cellIndex)) continue; // bulldozed -- do not restore it
      const result = board.place(gp.typeId, gp.anchorCell, gp.rotation, { id: gp.id, origin: "generated" });
      if (!result.ok) failures.push({ ...gp, origin: "generated", reason: result.reason, detail: result.detail });
    }
  }

  for (const p of save.placements || []) {
    const result = board.place(p.typeId, p.anchorCell, p.rotation, { id: p.id, origin: "player" });
    if (!result.ok) failures.push({ ...p, origin: "player", reason: result.reason, detail: result.detail });
  }

  return { board, failures };
}
