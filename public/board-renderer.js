// =============================================================================
// THE BOARD RENDERER — RB1, docs/specs/REBUILD-CHECKLIST.md "THE CONVERGENCE".
//
// `look-proof-scene.html` has, since L1, rendered `PIECES` -- a literal
// array. This module is the FEED that replaces it: it reads a real
// `createAreaBoard()` (public/area-board.js) and a real catalogue (with
// BO7A's own `glb` field) and resolves what is ACTUALLY placed into the
// exact shape `look-proof-scene.html`'s own geometry pipeline already
// consumes (loadPieceGeometry/fitToFootprint from public/look-proof-
// pieces.js) -- not a rewrite of that pipeline, not a second copy of it.
//
// PURE DATA RESOLUTION, NO THREE.JS, NO GPU -- everything here is plain
// objects and arithmetic, testable with `node test/run.mjs` alone. The one
// exception, rotateGeometryY, takes a real THREE.BufferGeometry because
// rotating a mesh is unavoidably a THREE operation; it is still a pure
// function (no loader, no renderer, no canvas) and is exercised by
// look-proof-scene.html itself at render time, not by these tests.
//
// A PIECE WITH NO glb IS SKIPPED, NOT SILENTLY DROPPED: most of the 50
// catalogue entries have no matching mesh yet (BO7A's own honest finding),
// and a board built against the full catalogue will place some of them.
// `resolveBoardPieces` returns `{ resolved, skipped }` so a caller can say
// so rather than hide it -- exactly the brief's own "the render and the
// rule disagreeing" failure class, avoided by reporting the disagreement
// instead of pretending it did not happen.
// =============================================================================

/** REBUILD-PLAN.md C1.1: every catalogue footprint is a whole number of
 * 4m modules. The board's own coordinates (cells) and the render's own
 * coordinates (metres) meet here, in exactly one place. */
export const MODULE_SIZE_M = 4;

export function glbBasename(glbPath) {
  return glbPath.split("/").pop();
}

/** Resolve a glb's own array-texture layer index from the SAME manifest
 * look-proof-scene.html's buildArrayTexture() already reads -- one source
 * of truth for "which file is on which layer", not a second, hand-typed
 * kit-name parser that could drift from it. Returns null (not a guess) if
 * the manifest names no layer for this file. */
export function layerForGlb(glbPath, manifest) {
  const basename = glbBasename(glbPath);
  for (const layer of manifest.layers) {
    if (layer.usedBy.includes(basename)) return layer.index;
  }
  return null;
}

/** occupiedRect's own rotation rule (area-board.js): 90/270 swap the
 * footprint's own [w,d]. The RENDER's footprint must swap the identical
 * way, or a rotated piece would be scaled to fit a box the board itself
 * does not agree is what that piece occupies -- the render/rule
 * disagreement this whole item exists to prevent, just inside one piece
 * instead of across the whole board. */
export function footprintForRotation(footprint, rotation) {
  const [w, d] = footprint;
  const swapped = rotation === 90 || rotation === 270;
  return swapped ? [d, w] : [w, d];
}

/** A board cell address, in modules, to a render anchor, in metres. Board
 * (x,y) maps to render (x,z) -- the same axis pairing occupiedRect's own
 * cellsOf already uses, kept consistent rather than silently swapped. */
export function anchorForCell(anchorCell) {
  return [anchorCell.x * MODULE_SIZE_M, anchorCell.y * MODULE_SIZE_M];
}

/** CAT-3 (docs/specs/PLAN.md §5.2, Mark: "two towers of the same footprint
 * should not be the same tower"). A deterministic index into a variant
 * pool, keyed on the placement's OWN typeId+id -- never Math.random(),
 * so the same real placement always resolves to the same mesh across
 * re-renders (a rebuild after a click must not make an already-placed
 * piece appear to change shape), and two DIFFERENT types placed as the
 * Nth piece on a board do not read the same index. FNV-1a: small, no
 * dependency, good enough distribution for a pool this size (2-4 items),
 * not a cryptographic requirement.
 */
export function deterministicVariantIndex(seed, poolSize) {
  let hash = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % poolSize;
}

/** CAT-3 -- an entry MAY carry `glbVariants`, additional already-vendored
 * mesh paths beyond its own primary `glb` (R2/C1.5's own "start far lower
 * than instinct says": these are real, already-sourced meshes benched by
 * BO7A's own UNMATCHED_MESHES, not newly-commissioned assets). Absent
 * `glbVariants`, this returns entry.glb UNCHANGED -- the other 47+
 * catalogue entries behave exactly as before this feature existed.
 */
function glbForPiece(entry, piece) {
  if (!entry.glbVariants || entry.glbVariants.length === 0) return entry.glb;
  const pool = [entry.glb, ...entry.glbVariants];
  return pool[deterministicVariantIndex(`${piece.typeId}:${piece.id}`, pool.length)];
}

/**
 * Read a real board's own CURRENT placements (board.pieces()) and resolve
 * each into a render-ready descriptor: `{ id, typeId, glb, layer,
 * footprint (metres), anchor (metres), rotation }`.
 *
 * `catalogue` is the same id -> entry shape area-board.js's own
 * `createAreaBoard` already accepts (a Map or a plain object).
 *
 * Never invents a footprint, a layer, or a glb path -- everything returned
 * is read directly from the board's own state, the catalogue's own
 * entries (CAT-3: OR one of that entry's own disclosed glbVariants), and
 * the array-texture manifest's own `usedBy` lists.
 */
export function resolveBoardPieces(board, catalogue, manifest) {
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];
  const resolved = [];
  const skipped = [];

  for (const piece of board.pieces()) {
    const entry = catalogueOf(piece.typeId);
    if (!entry) {
      skipped.push({ ...piece, reason: "unknown-type" });
      continue;
    }
    if (!entry.glb) {
      skipped.push({ ...piece, reason: "no-glb" });
      continue;
    }
    const glb = glbForPiece(entry, piece);
    const layer = layerForGlb(glb, manifest);
    if (layer === null) {
      skipped.push({ ...piece, reason: "unknown-layer" });
      continue;
    }
    const footprintModules = footprintForRotation(entry.footprint, piece.rotation);
    resolved.push({
      id: piece.id,
      typeId: piece.typeId,
      glb,
      layer,
      footprint: [footprintModules[0] * MODULE_SIZE_M, footprintModules[1] * MODULE_SIZE_M],
      anchor: anchorForCell(piece.anchorCell),
      rotation: piece.rotation,
    });
  }

  return { resolved, skipped };
}

/**
 * RB2 -- resolve a real placement session's own ghost (public/placement.js's
 * `session.getGhost()`) into a render-ready overlay descriptor: `{ valid,
 * reason, footprint (metres), anchor (metres) }`. `null` in, `null` out (no
 * ghost is being previewed); an unknown typeId also resolves to `null` --
 * there is no real footprint to size an overlay from, and this function
 * does not guess one.
 *
 * Deliberately reads `ghost.valid`/`ghost.reason` VERBATIM from the real
 * session rather than re-deriving them -- `setGhost` already calls the
 * board's own `evaluatePlacement`, the SAME function `place()` itself
 * calls (area-board.js's own "one function, two callers" guarantee). This
 * function has no business re-deciding whether a placement is valid; it
 * only sizes and positions what the session already decided.
 */
export function resolveGhost(ghost, catalogue) {
  if (!ghost) return null;
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];
  const entry = catalogueOf(ghost.typeId);
  if (!entry) return null;
  const footprintModules = footprintForRotation(entry.footprint, ghost.rotation);
  return {
    valid: ghost.valid,
    reason: ghost.reason,
    footprint: [footprintModules[0] * MODULE_SIZE_M, footprintModules[1] * MODULE_SIZE_M],
    anchor: anchorForCell(ghost.anchorCell),
  };
}

/**
 * RB3/RC5 -- THE VALUE READOUT, reassigned from CLI's S5. §S4's own
 * `valueAt`/`valueIfPlaced` were CLI's, not built as of RB3's own run
 * (checked `origin/scoring` and `origin/main` directly at the time,
 * neither had them). **S4 landed 2026-09-15**, merged from `scoring` into
 * `main` with Mark's own authorisation (`ADR-020`, logged in
 * `EVENT-LOG.jsonl`), then merged into this branch -- this function now
 * calls the REAL functions on every render, not a guessed fallback.
 *
 * `scoringModule` is still the DYNAMICALLY imported public/scoring.js
 * namespace (`await import("./scoring.js")` /
 * `import * as ScoringModule` in look-proof-scene.html), not a static
 * named import -- kept that way even though the export now exists, since
 * a static `import { valueAt }` would have thrown at parse time for the
 * entire lifetime this function had to tolerate S4's absence, and there
 * is no benefit to switching now that reintroduces that fragility for a
 * future export this file might reference before it lands.
 *
 * THE GUESSED SIGNATURE, CONFIRMED, NOT JUST HOPED: RB3's own guess --
 * `valueAt(board, catalogue, x, y)` and `valueIfPlaced(board, catalogue,
 * typeId, x, y, rotation)`, matching S1's own `value()` argument order --
 * turned out to match S4's real, shipped signature exactly (verified
 * directly against `public/scoring.js`, not assumed from the guess
 * having been reasonable). The `typeof scoringModule.valueAt ===
 * "function"` check and the try/catch around the real call both stay:
 * if a FUTURE scoring change ever alters the signature again, this
 * reports `available: false` with the real error message rather than a
 * silently wrong number, exactly as it did while S4 was still absent.
 */
export function resolveReadout(scoringModule, board, catalogue, cell, candidateTypeId, rotation) {
  if (typeof scoringModule.valueAt !== "function" || typeof scoringModule.valueIfPlaced !== "function") {
    return { available: false, reason: "S4 not landed: valueAt/valueIfPlaced are not yet exported from public/scoring.js" };
  }
  try {
    const current = scoringModule.valueAt(board, catalogue, cell.x, cell.y);
    const ifPlaced = scoringModule.valueIfPlaced(board, catalogue, candidateTypeId, cell.x, cell.y, rotation);
    return { available: true, current, ifPlaced };
  } catch (e) {
    return { available: false, reason: `S4 call failed against this file's own guessed signature (board, catalogue, x, y / typeId, x, y, rotation): ${e.message}` };
  }
}

/** Rotate a geometry around its own local Y axis by the placement's own
 * rotation (degrees, clockwise, matching ROTATIONS in area-board.js) --
 * applied BEFORE look-proof-pieces.js's own fitToFootprint, so the
 * ALREADY-swapped footprint passed to fitToFootprint matches a geometry
 * whose own bounding box has actually been turned to match, not just
 * stretched into the swapped box's own dimensions. Takes a real
 * THREE.BufferGeometry (the one THREE dependency in this module) and a
 * THREE namespace object, so this file itself never imports THREE at the
 * top level -- look-proof-scene.html already has it loaded via the page's
 * own importmap, and passing it in keeps this module importable from a
 * plain Node test with zero THREE/browser dependency. */
export function rotateGeometryY(geometry, rotationDegrees, THREE) {
  if (rotationDegrees === 0) return geometry;
  const radians = -(rotationDegrees * Math.PI) / 180; // clockwise, matching the board's own convention
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(radians));
  return geometry;
}
