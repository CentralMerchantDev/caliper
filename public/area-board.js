// =============================================================================
// THE AREA BOARD — REBUILD-PLAN.md C2.1, inside one area.
//
// "A piece is `{ typeId, anchorCell, rotation }`. Nothing else." Its
// footprint is DERIVED, never stored — occupiedRect(anchor, rotation,
// catalogue[typeId].footprint), recomputed on demand, RimWorld's pattern,
// because a STORED footprint and a rotation can disagree with each other
// the moment either one is edited alone.
//
// A dense occupancy index (typed array, `y * width + x`) holds the piece's
// own integer id in every cell it covers, for O(1) reverse lookup. No
// object per cell, no Map keyed on a string, no sparse arrays — V8
// documents a permanent 6x slowdown from a single hole in an array.
//
// THE GATE, NAMED IN THE BRIEF: "RED is a footprint that survives a
// rotation incorrectly, or an occupancy index that disagrees with the
// derived rect." Both are tested directly in test/areaBoard.test.ts: a
// rotated footprint's real w/d swap, and — for every placed piece — the
// SET of cells the occupancy index actually names for that id compared
// against occupiedRect()'s own output, cell for cell.
// =============================================================================

/** The four rotations a piece may be placed at, degrees, clockwise. */
export const ROTATIONS = Object.freeze([0, 90, 180, 270]);

/**
 * The rectangle of cells a piece covers, derived — never stored.
 *
 * `footprint` is `[w, d]` in the piece's own unrotated frame, exactly as
 * `data/catalogue.json` stores it. At 90/270 the two axes swap; C1.1's
 * "rotation gives the transposes free" is what makes that swap correct
 * rather than merely convenient — an 8x8 piece never needs a rotation because
 * it is already square.
 *
 * The anchor is the piece's own corner (C-5's corrected pivot, the value
 * `data/catalogue.json` already uses throughout) — so the returned rect's
 * own min corner IS the anchor cell, with no half-cell offset to reconcile.
 */
export function occupiedRect(anchorCell, rotation, footprint) {
  if (!ROTATIONS.includes(rotation)) {
    throw new Error(`occupiedRect: rotation must be one of ${ROTATIONS.join("/")}, got ${rotation}`);
  }
  const [fw, fd] = footprint;
  const swapped = rotation === 90 || rotation === 270;
  const w = swapped ? fd : fw;
  const d = swapped ? fw : fd;
  return {
    xMin: anchorCell.x, xMax: anchorCell.x + w,
    yMin: anchorCell.y, yMax: anchorCell.y + d,
  };
}

/** Every `{x,y}` cell inside a rect, xMin/yMin inclusive, xMax/yMax exclusive. */
export function* cellsOf(rect) {
  for (let y = rect.yMin; y < rect.yMax; y++) {
    for (let x = rect.xMin; x < rect.xMax; x++) yield { x, y };
  }
}

/** Surface types a board cell may carry. `land` is the only one that exists
 *  while terrain is flat (REBUILD-PLAN.md's own note on C2.2: "defaulted to
 *  zero while the board is flat" — terrain arrives at build-order step 6,
 *  not this phase). Kept as a real enum, not a bare string, so a future
 *  terrain phase adding "water"/"slope-too-steep" is additive here. */
export const SURFACE = Object.freeze({ LAND: "land" });

/**
 * One area's board. Typed arrays throughout, addressed `y * width + x`.
 *
 * `catalogue` is a plain object/Map from typeId -> `{ footprint, terrainMask }`
 * (the shape `data/catalogue.json`'s entries already carry, keyed by id).
 */
export function createAreaBoard({ width, height, catalogue }) {
  if (!(Number.isInteger(width) && width > 0) || !(Number.isInteger(height) && height > 0)) {
    throw new Error("createAreaBoard: width and height must be positive integers");
  }
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];

  const size = width * height;
  // -1 means empty. A piece's own integer id (>= 1) is written into every
  // cell it covers — this IS the reverse lookup, not a cache of one.
  const occupancy = new Int32Array(size).fill(-1);
  // Defaulted to zero/flat throughout, per C2.2's own instruction: these
  // fields exist from the start so terrain (build-order step 6) is a value
  // change, not a schema rewrite.
  const elevation = new Float32Array(size); // metres, per cell
  const cornerOffsets = new Float32Array(size * 4); // 4 corners per cell, metres
  const surfaceType = new Uint8Array(size); // index into SURFACE's own order below
  const SURFACE_INDEX = { [SURFACE.LAND]: 0 };

  const pieces = new Map(); // id -> { typeId, anchorCell, rotation, origin }
  let nextId = 1;

  function index(x, y) { return y * width + x; }
  function cellInBounds(x, y) { return x >= 0 && y >= 0 && x < width && y < height; }

  function rectInBounds(rect) {
    return rect.xMin >= 0 && rect.yMin >= 0 && rect.xMax <= width && rect.yMax <= height;
  }

  function rectFree(rect) {
    for (const { x, y } of cellsOf(rect)) {
      if (occupancy[index(x, y)] !== -1) return false;
    }
    return true;
  }

  function footprintOf(typeId) {
    const entry = catalogueOf(typeId);
    return entry ? entry.footprint : null;
  }

  /**
   * The single validity check, walked in order of cheapness, early-out on
   * the first failure — C2.3, verbatim. Used by BOTH the ghost preview and
   * the actual commit (board.place() calls this too), so the two cannot
   * diverge: there is exactly one function that decides yes or no.
   */
  function evaluatePlacement(typeId, anchorCell, rotation) {
    const footprint = footprintOf(typeId);
    if (!footprint) return { ok: false, reason: "unknown-type", detail: `no catalogue entry for "${typeId}"` };

    const rect = occupiedRect(anchorCell, rotation, footprint);

    if (!rectInBounds(rect)) {
      return { ok: false, reason: "out-of-bounds", detail: "footprint extends past the area's own edge", rect };
    }

    const entry = catalogueOf(typeId);
    const terrainMask = entry.terrainMask || [SURFACE.LAND];
    for (const { x, y } of cellsOf(rect)) {
      const surfaceName = Object.keys(SURFACE_INDEX)[surfaceType[index(x, y)]] || SURFACE.LAND;
      if (!terrainMask.includes(surfaceName)) {
        return { ok: false, reason: "terrain", detail: `cell (${x},${y}) is "${surfaceName}", not permitted for "${typeId}"`, rect };
      }
    }

    if (!rectFree(rect)) {
      return { ok: false, reason: "occupied", detail: "one or more cells in the footprint are already occupied", rect };
    }

    // Slope tolerance: the range of elevation across the footprint's own
    // cells. Zero everywhere until terrain exists (build-order step 6), so
    // this always passes today — but it reads the real field, not a stub,
    // so the day elevation is non-zero this check is already live.
    let min = Infinity, max = -Infinity;
    for (const { x, y } of cellsOf(rect)) {
      const h = elevation[index(x, y)];
      if (h < min) min = h;
      if (h > max) max = h;
    }
    const SLOPE_TOLERANCE_M = 1.2; // matches public/footprint.js's own SLAB_MAX
    // Padded by 1e-6, the same boundary-safety idiom public/grid.js's own
    // cellsFor/levelsFor use: elevation is a Float32Array (deliberately, for
    // memory at board scale), and a value written as the JS float64 literal
    // 1.2 reads back as the nearest float32 -- 1.2000000476837158, here --
    // which is a hair ABOVE the float64 1.2 this compares against. Without
    // the pad, writing exactly the tolerance value refuses it, which is not
    // what "within tolerance" means.
    if (max - min > SLOPE_TOLERANCE_M + 1e-6) {
      return { ok: false, reason: "slope", detail: `${(max - min).toFixed(2)} m of relief across the footprint exceeds ${SLOPE_TOLERANCE_M} m`, rect };
    }

    return { ok: true, rect };
  }

  /** Place a piece. Refused with the same reason evaluatePlacement gives —
   *  this function does not re-decide anything, it only acts on the answer. */
  function place(typeId, anchorCell, rotation, opts = {}) {
    const verdict = evaluatePlacement(typeId, anchorCell, rotation);
    if (!verdict.ok) return verdict;

    if (opts.id !== undefined && !(Number.isInteger(opts.id) && opts.id >= 0)) {
      // The occupancy index is an Int32Array: a non-integer id would be
      // silently coerced to NaN -> 0 on write, corrupting the index rather
      // than refusing cleanly -- the exact "occupancy index disagrees with
      // the derived rect" shape this module's own gate exists to prevent.
      return { ok: false, reason: "invalid-id", detail: `piece id must be a non-negative integer, got ${JSON.stringify(opts.id)}` };
    }
    const id = opts.id ?? nextId++;
    if (pieces.has(id)) {
      return { ok: false, reason: "id-in-use", detail: `piece id ${id} already exists` };
    }
    for (const { x, y } of cellsOf(verdict.rect)) occupancy[index(x, y)] = id;
    pieces.set(id, { typeId, anchorCell: { ...anchorCell }, rotation, origin: opts.origin || "player" });
    if (typeof id === "number" && id >= nextId) nextId = id + 1;
    return { ok: true, id, rect: verdict.rect };
  }

  /** Remove a piece by id. Clears every cell it occupied, derived fresh from
   *  its own stored { typeId, anchorCell, rotation } -- never from a second,
   *  separately-maintained list of "cells this piece owns". */
  function remove(id) {
    const piece = pieces.get(id);
    if (!piece) return { ok: false, reason: "not-found", detail: `no piece with id ${id}` };
    const rect = occupiedRect(piece.anchorCell, piece.rotation, footprintOf(piece.typeId));
    for (const { x, y } of cellsOf(rect)) occupancy[index(x, y)] = -1;
    pieces.delete(id);
    return { ok: true, id, piece: { ...piece }, rect };
  }

  function pieceIdAt(x, y) {
    if (!cellInBounds(x, y)) return -1;
    return occupancy[index(x, y)];
  }

  function pieceAt(x, y) {
    const id = pieceIdAt(x, y);
    if (id === -1) return null;
    return { id, ...pieces.get(id) };
  }

  function getPiece(id) {
    const piece = pieces.get(id);
    return piece ? { id, ...piece } : null;
  }

  function rectFor(id) {
    const piece = pieces.get(id);
    if (!piece) return null;
    return occupiedRect(piece.anchorCell, piece.rotation, footprintOf(piece.typeId));
  }

  function allPieces() {
    return [...pieces.entries()].map(([id, p]) => ({ id, ...p }));
  }

  function setElevation(x, y, metres) {
    if (!cellInBounds(x, y)) throw new Error(`setElevation: (${x},${y}) is out of bounds`);
    elevation[index(x, y)] = metres;
  }

  function elevationAt(x, y) {
    return cellInBounds(x, y) ? elevation[index(x, y)] : null;
  }

  /** One of a cell's four corners: 0=NW, 1=NE, 2=SE, 3=SW (clockwise from
   *  the anchor-facing corner), metres of offset from the flat plane. Same
   *  defaulted-to-zero-while-flat contract as elevation/surfaceType. */
  function cornerOffsetAt(x, y, corner) {
    if (!cellInBounds(x, y)) return null;
    if (!Number.isInteger(corner) || corner < 0 || corner > 3) {
      throw new Error(`cornerOffsetAt: corner must be 0-3, got ${corner}`);
    }
    return cornerOffsets[index(x, y) * 4 + corner];
  }

  function setCornerOffset(x, y, corner, metres) {
    if (!cellInBounds(x, y)) throw new Error(`setCornerOffset: (${x},${y}) is out of bounds`);
    if (!Number.isInteger(corner) || corner < 0 || corner > 3) {
      throw new Error(`setCornerOffset: corner must be 0-3, got ${corner}`);
    }
    cornerOffsets[index(x, y) * 4 + corner] = metres;
  }

  function surfaceAt(x, y) {
    if (!cellInBounds(x, y)) return null;
    return Object.keys(SURFACE_INDEX)[surfaceType[index(x, y)]] || SURFACE.LAND;
  }

  return {
    width, height,
    inBounds: rectInBounds,
    isFree: rectFree,
    evaluatePlacement,
    place,
    remove,
    pieceIdAt,
    pieceAt,
    getPiece,
    rectFor,
    pieces: allPieces,
    cornerOffsetAt,
    setCornerOffset,
    setElevation,
    elevationAt,
    surfaceAt,
  };
}
