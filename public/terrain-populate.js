// =============================================================================
// TER-4 (PLAN.md §4) — real elevation, water and slope on the area board.
//
// public/area-board.js's elevation/cornerOffsets/surfaceType fields existed
// from C2.2 onward, defaulted to zero/flat with the explicit note that a
// future terrain phase would be "a value change, not a schema rewrite." This
// is that value change: samples public/terrain-field.js (TER-1/TER-2/TER-3)
// at each cell's real world position and writes the result into an already-
// constructed board.
//
// CELL_SIZE_M = 4 matches public/board-renderer.js's own live MODULE_SIZE_M
// (docs/specs/CAT-1-TERRAIN-MESH-CONTRACT.md §2) -- restated here rather
// than imported, since importing BLD's own renderer file from CLI's terrain
// population would cross the lane boundary PLAN.md §1 draws (CLI never
// touches board-renderer.js). If the two ever disagree, that is a defect to
// reconcile, not a reason to import across the seam.
// =============================================================================

import { SURFACE } from "./area-board.js";

export const CELL_SIZE_M = 4;

/** Corner order area-board.js's own cornerOffsetAt documents: 0=NW, 1=NE,
 *  2=SE, 3=SW, clockwise from the anchor-facing corner. In (x east, y south)
 *  cell-local metres from the cell's own origin. */
const CORNER_LOCAL_OFFSETS = [
  [0, 0],                 // NW
  [1, 0],                 // NE
  [1, 1],                 // SE
  [0, 1],                 // SW
];

/**
 * Populate every cell of `board` with real elevation, surface type and
 * corner offsets, sampled from `field` at the board's real position in the
 * world (`originX`/`originZ`, the world metres of the board's own (0,0)
 * cell corner).
 *
 * Idempotent and pure with respect to `field` -- calling this twice with
 * the same field and origin writes the identical values both times, since
 * `field.heightAt`/`isWater` are themselves deterministic
 * (docs/specs/CAT-1-TERRAIN-MESH-CONTRACT.md §3).
 */
export function populateTerrain(board, field, { originX = 0, originZ = 0, cellSizeM = CELL_SIZE_M } = {}) {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const cellOriginX = originX + x * cellSizeM;
      const cellOriginZ = originZ + y * cellSizeM;
      const centreX = cellOriginX + cellSizeM / 2;
      const centreZ = cellOriginZ + cellSizeM / 2;

      const h = field.heightAt(centreX, centreZ);
      board.setElevation(x, y, h);
      board.setSurfaceType(x, y, field.isWater(centreX, centreZ) ? SURFACE.WATER : SURFACE.LAND);

      for (let corner = 0; corner < 4; corner++) {
        const [dx, dz] = CORNER_LOCAL_OFFSETS[corner];
        const cornerHeight = field.heightAt(cellOriginX + dx * cellSizeM, cellOriginZ + dz * cellSizeM);
        // Offset FROM the cell's own stored elevation ("metres of offset
        // from the flat plane", area-board.js's own cornerOffsetAt doc) --
        // a tilt descriptor, not a second absolute height that could
        // disagree with elevationAt.
        board.setCornerOffset(x, y, corner, cornerHeight - h);
      }
    }
  }
}
