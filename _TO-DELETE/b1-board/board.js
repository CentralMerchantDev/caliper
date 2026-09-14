// =============================================================================
// THE BOARD — a list of placed pieces, addressed by cube
//
// WHAT THIS IS
//
// BOARD-CONVERSION-PLAN.md P1: "the board is a list of placed pieces". Every
// element -- road, building, tree, prop, bridge -- becomes one record:
//
//   { id, pieceType, cell: {i, j, k}, rotation, foot: {w, d}, levels,
//     clear: {w, d}, standsOn: [...], surface }
//
// `cell: {i, j, k}` IS AN ATOM ADDRESS -- PLACEMENT-CONTRACT.md Part 0
// (Mark, 2026-09-07): the grid's real addressing unit is the 1 m ATOM, not
// the 8 m CELL grid.js originally exposed. `foot`/`clear` are still in
// whole METRES (never a coarser "cell count") -- an 18 m STREET is 18, not
// 2.25 CELLs rounded to 3. Built on grid.js's `atomOf`/`atomOrigin`/
// `atomRect`/`atomCentre`/`atomsFor` (ATOM=1), not the CELL=8 ones, which
// still exist for the 8 m standard-size increment (roadkit.js's MODULE_M,
// the building footprint table) but are a different concern from placement.
//
// THE BOARD IS CUBES, NOT SQUARES -- Mark, 2026-09-07: "the board is a list
// of cubes, really ... defined spaces, defined cubes that are told what they
// are and what they can be." `k` is the vertical index, in grid.js's LEVEL
// (4 m) unit; `levels` is how many cubes tall the piece is. Two dimensions
// cannot express a raised intersection, a flyover, or a bridge over a road;
// a bare, unresolved `w`/`h` mismatch here is exactly the kind of gap this
// project keeps finding after the fact -- this file exists so it doesn't.
//
// A CELL HAS A KIND, A PIECE DECLARES WHAT KINDS IT STANDS ON.
//
// What ground IS comes from land-use.js's `classifyAt` (water/beach/cliff/
// steep/reserved/buildable) when nothing is stacked below (k === 0). What a
// piece may stand on is its own `standsOn` list. PIECES STACK: a piece's
// `surface` (what it presents on top -- pavement/road/roof/grass/plaza/
// track/deck/none) becomes the "ground" for whatever is placed at k+1 above
// it. Mark's park-bench example: a bench standsOn ["grass","pavement"], and
// a ROOFTOP bench is a different piece, standsOn ["roof"] -- the mechanism
// is the same list, not a special case.
//
// Nothing here invents a second spatial index: occupancy is answered by
// world-registry.js's own bucketed reservation store, translated to and
// from cell/cube coordinates at the edges. Reserving twice, in two
// different modules, is the two-sources-of-truth pattern this project keeps
// finding and keeps paying for -- see docs/LESSONS.md.
//
// WHAT "foot + clear" MEANS HERE
//
// PLACEMENT-CONTRACT.md: "a rectangle of free, buildable cells at least
// foot + clear in both directions". That fixes the TOTAL size required per
// axis (foot.w + clear.w, foot.d + clear.d) but not how the extra margin is
// distributed around the footprint. This module splits it as evenly as
// possible around the foot (floor on the west/south side, ceil on the
// east/north side, so an odd clear value still produces an exact whole-cell
// rectangle) -- a defensible default, not dictated by the contract. Flagged
// here rather than assumed silently. The GROUND check (standsOn) only
// applies to the FOOT's own cells -- the clear margin is required to be
// FREE, not required to be a particular kind, matching "clear" meaning
// open space around a piece, not ground it stands on.
//
// NOTHING RENDERS DIFFERENTLY YET. This is the representation only.
// =============================================================================

import { atomRect, atomCentre, heightOf } from "./grid.js";
import { createWorldRegistry } from "./world-registry.js";
import { classifyAt } from "./land-use.js";

/** 0/90/180/270 only, for P1 -- rotation is stored for later use; nothing
 *  here needs finer resolution, and finer resolution is not yet meaningful
 *  when nothing renders from this record yet. */
const VALID_ROTATIONS = new Set([0, 90, 180, 270]);

function assertValidPiece(p) {
  if (!p || typeof p.id !== "string" || !p.id) throw new Error("board: piece needs a non-empty string id");
  if (typeof p.pieceType !== "string" || !p.pieceType) throw new Error(`board: piece "${p.id}" needs a pieceType`);
  if (!p.cell || !Number.isInteger(p.cell.i) || !Number.isInteger(p.cell.j) || !Number.isInteger(p.cell.k)) {
    throw new Error(`board: piece "${p.id}" needs an integral cell {i, j, k}`);
  }
  if (!VALID_ROTATIONS.has(p.rotation)) {
    throw new Error(`board: piece "${p.id}" rotation must be one of 0/90/180/270 (got ${p.rotation})`);
  }
  for (const key of ["foot", "clear"]) {
    const v = p[key];
    if (!v || !Number.isInteger(v.w) || !Number.isInteger(v.d) || v.w < 0 || v.d < 0) {
      throw new Error(`board: piece "${p.id}" needs an integral, non-negative ${key} {w, d}`);
    }
  }
  if (p.foot.w === 0 || p.foot.d === 0) {
    throw new Error(`board: piece "${p.id}" foot must be at least 1x1 cell`);
  }
  if (!Number.isInteger(p.levels) || p.levels < 1) {
    throw new Error(`board: piece "${p.id}" needs an integral levels >= 1`);
  }
  if (!Array.isArray(p.standsOn) || p.standsOn.length === 0 || !p.standsOn.every((s) => typeof s === "string" && s)) {
    throw new Error(`board: piece "${p.id}" needs a non-empty standsOn list of strings`);
  }
  if (typeof p.surface !== "string" || !p.surface) throw new Error(`board: piece "${p.id}" needs a surface`);
}

/** Swap w/d for a 90/270 rotation -- the footprint as it actually sits on
 *  the grid, not as the piece declares itself before rotation. */
function orientedWD(wd, rotation) {
  return rotation === 90 || rotation === 270 ? { w: wd.d, d: wd.w } : { w: wd.w, d: wd.d };
}

/** The exact cells this piece's FOOT occupies -- what it reserves, in plan. */
function footCellRect(piece) {
  const { w, d } = orientedWD(piece.foot, piece.rotation);
  return atomRect(piece.cell.i, piece.cell.j, w, d);
}

/**
 * The vertical extent (metres) this piece's cube spans, per grid.js's LEVEL
 * unit -- k=0..levels above the k-th level's floor, MEASURED FROM LOCAL
 * GROUND, not from sea level. `groundY` is the real terrain height at this
 * piece's own footprint (0 for a plan-only board with no terrain at all).
 *
 * WITHOUT groundY, k=0 silently meant "y: 0..4m of absolute world
 * elevation" -- fine on flat ground at y=0, wrong everywhere else: a piece
 * placed at k=0 on a 50 m hill would occupy y:[0,4), entirely BELOW the
 * hill's own surface, and world-registry.js's own heightAt-based ROCK check
 * would then read a piece standing ON TOP of a building (k=2, y:[8,12) on
 * flat ground at y=0) as buried, because a piece's own base is not the same
 * thing as sea level. Found by the file's own stacking test, which places a
 * building and a rooftop piece on FLAT ground at y=10 (not 0) and watched
 * the rooftop piece read as buried rock before this fix existed.
 */
function verticalExtent(piece, groundY = 0) {
  return { yMin: groundY + heightOf(piece.cell.k), yMax: groundY + heightOf(piece.cell.k + piece.levels) };
}

/** The larger rectangle canPlace checks against: foot expanded by clear,
 *  split as evenly as possible around the foot (see file header). Returns
 *  cell bounds {iMin, iMax, jMin, jMax} (iMax/jMax exclusive, matching
 *  grid.js's cellRect convention of xMax/zMax being the far edge). */
function checkedCellBounds(piece) {
  const { w: fw, d: fd } = orientedWD(piece.foot, piece.rotation);
  const { w: cw, d: cd } = orientedWD(piece.clear, piece.rotation);
  const west = Math.floor(cw / 2), east = Math.ceil(cw / 2);
  const south = Math.floor(cd / 2), north = Math.ceil(cd / 2);
  return {
    iMin: piece.cell.i - west, iMax: piece.cell.i + fw + east,
    jMin: piece.cell.j - south, jMax: piece.cell.j + fd + north,
  };
}

/**
 * A board: an occupancy index built ON world-registry.js (not beside it),
 * plus the place/remove/replace/move operations P1.4 asks for, plus
 * canPlace (P1.3) and a byId lookup (P1.2's "given a piece id, where is
 * it").
 *
 * @param {object} [opts]
 * @param {(x: number, z: number) => number} [opts.heightAt] real terrain,
 *        passed to land-use.js's classifyAt for the k=0 ground check; omit
 *        for a plan-only board (every k=0 ground check then refuses, since
 *        there is no terrain to classify -- see canPlace).
 * @param {(i: number, j: number) => boolean} [opts.inWorld] cell-level
 *        world-boundary check (grid.js's own inWorld, cell-shaped); omit to
 *        skip the off-the-edge refusal.
 * @param {(x: number, z: number) => boolean} [opts.reserved] passed to
 *        classifyAt -- ground deliberately kept open (park, foreshore).
 */
export function createBoard({ heightAt = null, inWorld = null, reserved = null } = {}) {
  const registry = createWorldRegistry(heightAt);
  /** @type {Map<string, object>} id -> the piece record as currently placed */
  const byId = new Map();

  /** Real terrain height at a piece's own footprint origin -- the "local
   *  ground" k=0 is measured from (see verticalExtent's own comment for
   *  why this cannot be a fixed 0). Sampled at the footprint's own cell
   *  origin -- a single reference point, matching how classifyAt itself is
   *  sampled per-cell rather than per-metre elsewhere in this file. 0 for
   *  a plan-only board with no terrain at all. */
  function groundYFor(piece) {
    if (!heightAt) return 0;
    const { x, z } = atomCentre(piece.cell.i, piece.cell.j);
    return heightAt(x, z);
  }

  /**
   * What kind of ground is directly below this one foot cell, for the
   * piece's own standsOn check. k === 0: land-use.js's classifyAt (a real
   * terrain kind: water/beach/cliff/steep/reserved/buildable). k > 0:
   * whatever piece occupies the cell directly below (i, j, k-1) presents
   * as ITS `surface` -- Mark's stacking rule, a rooftop bench standing on
   * the building below it, not on the ground under the building. Returns
   * null if k > 0 and nothing is there to stand on (floating, refused).
   */
  function kindBelow(i, j, k) {
    if (k === 0) {
      if (!heightAt) return null;
      const { x, z } = atomCentre(i, j);
      return classifyAt(heightAt, x, z, reserved).use;
    }
    // A REAL 3D QUERY, NOT A 2D ONE. world-registry.js's occupiedAt() has no
    // height parameter at all -- it answers "what is reserved in PLAN at
    // this (x,z)", oldest-reservation-first, regardless of which k-level it
    // occupies. Two pieces stacked at different levels over the same (x,z)
    // footprint (a road at k=0, a building at k=1 above it) would make
    // occupiedAt() return whichever was placed FIRST, not the one actually
    // beneath this level -- found by reasoning through the stacking case
    // this function exists for, before it ever placed a piece wrong.
    // whatIsAt() takes a real y and reads the reservation's own `surface`
    // field directly (set in reserve() below), so no separate byId lookup
    // or vertical-extent recomputation is needed either.
    // Sampled locally, at THIS cell -- not at the checking piece's own
    // origin cell -- since this is "what is the real ground here", cell by
    // cell, the same way classifyAt is sampled per point rather than once
    // for a whole footprint. On genuinely uneven terrain this can disagree
    // very slightly with a placed piece's own single-sampled groundY (see
    // groundYFor) for cells away from that piece's origin; not resolved
    // here -- named, since P1's real adapted data is k=0 only and never
    // exercises this edge.
    const { x, z } = atomCentre(i, j);
    const groundY = heightAt ? heightAt(x, z) : 0;
    const belowY = groundY + heightOf(k) - 0.01; // a hair below this level's own floor
    const occ = registry.whatIsAt(x, belowY, z, 0);
    if (occ.kind !== "piece") return null;
    return occ.surface;
  }

  /**
   * Is there a free rectangle of foot + clear buildable cells here, of a
   * kind this piece can stand on? Two conditions, and only two --
   * BOARD-CONVERSION-PLAN.md P1.3: SPACE (a free box of foot+clear cells,
   * `levels` tall) and GROUND (every foot cell's kind is in `standsOn`).
   * No zoning check, no plot-class check, no height cap. `ignoreId` lets a
   * caller ask "does a piece fit where THIS existing piece already stands"
   * (a resize or replace) without the piece's own reservation refusing
   * itself.
   *
   * `groundVerified` (default false -- every existing caller is unaffected):
   * SKIPS the exhaustive per-foot-cell GROUND loop below, for a caller that
   * has ALREADY established ground validity by a different, proven-
   * equivalent method and does not need this function to re-derive it.
   * Added for docs/specs/BOARD-REBUILD-PLAN.md's B2.5 (Mark, 2026-09-08):
   * a generator placing tens of thousands of pieces pays this loop's real
   * cost (classifyAt -> slopeAt, several heightAt calls) PER CELL of EVERY
   * foot, including large road-span footprints, measured directly at ~106
   * of ~111 s in public/board-generator.js's own profile
   * (roadSpanPlaceMs + buildingPlaceMs). "The board is a spatial index --
   * partition the space, query the partition, never scan the set" (this
   * project's own architecture note) -- a caller with its own sampled,
   * proven-equivalent ground check is the partition query; re-scanning
   * every cell here on top of it is the same defect this file exists to
   * prevent one layer up. SPACE is still checked, always, exactly as
   * before -- occupancy is never something a caller may claim to have
   * pre-verified, since it can change between the caller's own check and
   * this call in a way ground cannot. `board.test.ts`'s own tests are
   * unaffected (none pass this option, so every one exercises the exact
   * behaviour that existed before this option did).
   */
  function canPlace({ cell, rotation = 0, foot, clear = { w: 0, d: 0 }, levels = 1, standsOn }, { ignoreId = null, groundVerified = false } = {}) {
    const probe = {
      id: "__probe__", pieceType: "__probe__", cell, rotation, foot, clear, levels,
      standsOn: standsOn && standsOn.length ? standsOn : ["__unspecified__"], surface: "none",
    };
    assertValidPiece(probe);

    if (inWorld) {
      const { iMin, iMax, jMin, jMax } = checkedCellBounds(probe);
      // iMax/jMax are exclusive far edges (grid.js convention) -- the last
      // occupied cell is iMax-1/jMax-1.
      if (!inWorld(iMin, jMin) || !inWorld(iMax - 1, jMax - 1)) {
        return { ok: false, reason: "off-map" };
      }
    }

    // GROUND: every cell of the FOOT (not the clear margin) must be a kind
    // this piece declares it can stand on. Skipped when groundVerified is
    // true -- see this function's own header comment for why that is safe.
    if (!groundVerified && standsOn && standsOn.length) {
      const { w: fw, d: fd } = orientedWD(foot, rotation);
      const standsSet = new Set(standsOn);
      for (let di = 0; di < fw; di++) {
        for (let dj = 0; dj < fd; dj++) {
          const i = cell.i + di, j = cell.j + dj;
          const kind = kindBelow(i, j, cell.k);
          if (kind === null || !standsSet.has(kind)) {
            return { ok: false, reason: "ground", blockedBy: { kind } };
          }
        }
      }
    }

    // SPACE: the foot+clear rectangle, at this piece's vertical extent, must
    // be free. NEVER skipped -- groundVerified only ever stands in for the
    // GROUND half of this function's own contract.
    const { iMin, iMax, jMin, jMax } = checkedCellBounds(probe);
    const r = atomRect(iMin, jMin, iMax - iMin, jMax - jMin);
    const { yMin, yMax } = verticalExtent(probe, groundYFor(probe));
    const blocker = registry.overlapsReserved(r.xMin, r.xMax, r.zMin, r.zMax, 0, {
      yMin, yMax, terrain: false, // terrain/ground already answered above, by standsOn
      ignoreIds: ignoreId ? [ignoreId] : null,
    });
    if (blocker) {
      return { ok: false, reason: "occupied", blockedBy: blocker };
    }
    return { ok: true };
  }

  /**
   * Place a new piece. Refuses (does not reserve) if canPlace says no --
   * this function is itself the authority deciding the ground is committed,
   * matching world-registry.js's own reserve() contract.
   *
   * `groundVerified` -- see canPlace's own comment. Default false; forwarded
   * unchanged, not re-decided here.
   */
  function place(piece, { groundVerified = false } = {}) {
    assertValidPiece(piece);
    if (byId.has(piece.id)) {
      return { ok: false, reason: "duplicate-id", detail: `a piece with id "${piece.id}" is already placed` };
    }
    const fit = canPlace(piece, { groundVerified });
    if (!fit.ok) return fit;

    const rect = footCellRect(piece);
    const { yMin, yMax } = verticalExtent(piece, groundYFor(piece));
    registry.reserve({
      kind: "piece", id: piece.id, owner: piece.pieceType,
      xMin: rect.xMin, xMax: rect.xMax, zMin: rect.zMin, zMax: rect.zMax,
      yMin, yMax, solid: true, surface: piece.surface,
    });
    byId.set(piece.id, { ...piece });
    return { ok: true, piece: byId.get(piece.id) };
  }

  /** Take a piece off the board entirely. Reversible only by calling
   *  place() again with the same record -- see P1.4's byte-identical gate. */
  function remove(id) {
    if (!byId.has(id)) return { ok: false, reason: "not-found" };
    registry.release(id);
    byId.delete(id);
    return { ok: true };
  }

  /**
   * Replace an existing piece with a different one AT THE SAME id. The new
   * shape must independently fit (ignoring the old piece's own
   * reservation, which is about to be removed anyway) before anything
   * changes -- a replace that would not fit does not partially apply.
   */
  function replace(id, nextPiece) {
    if (!byId.has(id)) return { ok: false, reason: "not-found" };
    if (nextPiece.id !== id) {
      return { ok: false, reason: "id-mismatch", detail: "replace() keeps the id; use remove()+place() to change it" };
    }
    const fit = canPlace(nextPiece, { ignoreId: id });
    if (!fit.ok) return fit;

    registry.release(id);
    const rect = footCellRect(nextPiece);
    const { yMin, yMax } = verticalExtent(nextPiece, groundYFor(nextPiece));
    registry.reserve({
      kind: "piece", id: nextPiece.id, owner: nextPiece.pieceType,
      xMin: rect.xMin, xMax: rect.xMax, zMin: rect.zMin, zMax: rect.zMax,
      yMin, yMax, solid: true, surface: nextPiece.surface,
    });
    byId.set(id, { ...nextPiece });
    return { ok: true, piece: byId.get(id) };
  }

  /**
   * Move a placed piece to a new cell/rotation, same id and shape
   * otherwise. Refused, and the piece stays exactly where it was, if the
   * new position does not fit -- this is replace() specialised to "same
   * pieceType/foot/clear/levels/standsOn/surface, new cell/rotation", not a
   * separate implementation of the same fit check.
   */
  function move(id, { cell, rotation }) {
    const current = byId.get(id);
    if (!current) return { ok: false, reason: "not-found" };
    return replace(id, { ...current, cell, rotation: rotation ?? current.rotation });
  }

  /** P1.2: given a piece id, where is it. */
  function whereIs(id) {
    const p = byId.get(id);
    return p ? { ...p } : null;
  }

  /** P1.2: given a rectangle of cells (at level k), what is in it. Returns
   *  the distinct placed-piece records whose FOOT overlaps the query
   *  rectangle at that level (not the clear margin -- "what is here" means
   *  what physically stands here). */
  function inCells(i, j, w, d, k = 0) {
    const r = atomRect(i, j, w, d);
    const { x, z } = atomCentre(i, j);
    const groundY = heightAt ? heightAt(x, z) : 0;
    const y = groundY + heightOf(k) + 0.01; // a hair above the level's own floor
    const hits = registry.allOverlapping(r.xMin, r.xMax, r.zMin, r.zMax, 0, {
      yMin: y, yMax: y, onlyKinds: ["piece"],
    });
    const seen = new Set();
    const out = [];
    for (const e of hits) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const p = byId.get(e.id);
      if (p) out.push({ ...p });
    }
    return out;
  }

  /** Every placed piece, for tests and determinism hashing (P1.5). Copied,
   *  same reasoning as world-registry.js's own list(). */
  function list() {
    return Array.from(byId.values()).map((p) => ({ ...p }));
  }

  return { canPlace, place, remove, replace, move, whereIs, inCells, list };
}

export { footCellRect, checkedCellBounds, orientedWD, verticalExtent };
