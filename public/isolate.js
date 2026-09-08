// =============================================================================
// P4.3 ISOLATE — hide everything but the selection and its immediate
// neighbours, restore exactly.
//
// Split the way grid.js's groundOrRefuse/gradeGroundBands already are, and
// for the same reason (their own header, P3.5): city-render.js's own
// scene-building cannot run in the node suite (needs a GPU, per
// test/rendererStatic.test.ts's own documented, deliberate scope), so the
// DECISION is exported here as pure functions and unit-tested even though
// the renderer that calls them is not. Two halves:
//
//   neighboursOf()      -- which pieces count as neighbours. Board/plot data
//                           only, no Three.js, testable against a real
//                           generated world with no renderer at all.
//   planIsolate()/
//   applyIsolate()/
//   restoreIsolate()    -- the render-side mechanism. Three.js object
//                           manipulation (Matrix4, Mesh, InstancedMesh), but
//                           NONE of it calls .render() or touches a WebGL
//                           context -- constructing and mutating a scene
//                           graph needs no GPU, only DRAWING one does. That
//                           makes this half runnable, and real, in plain
//                           node too (see scripts/_isolate-probe.mjs).
//
// THE RULE CHOSEN FOR "IMMEDIATE NEIGHBOURS": within one BLOCK (grid.js's
// own BLOCK=16m constant) of the selected piece's own footprint, not the
// city PLAN's separate, larger `blockId` zoning grouping. grid.js's own
// header is explicit that QUADRANT/BLOCK are "named groupings for
// indexing/display ONLY... the groupings do not constrain placement" --
// exactly the kind of grouping an ISOLATE (a display operation) needs, and
// an already-named unit rather than an invented margin. plan.blockId was the
// other real candidate and was rejected: it is a zoning/settlement-structure
// grouping (how many plots share a block varies hugely by settlement density
// -- Harbour City vs. a beach village), not a visual-proximity one, and using
// it would make "immediate neighbours" mean anywhere from one plot to
// hundreds depending on which block the visitor happened to click.
//
// THE QUERY ITSELF goes through board.js's own createBoard()/inCells() --
// "board.js already answers spatial queries by cell; use it" (Mark,
// P4 brief) -- rather than a hand-rolled rectangle-overlap scan repeating
// board.js's own SPACE-check geometry. A coarse bounding-box prefilter over
// the flat piece list (using board.js's own exported footCellRect, not a
// re-derived one) bounds which pieces are worth placing into the small
// local board before the real query runs, so this never places more than a
// few dozen pieces even in the densest settlement -- not the world's
// 18,000+, which board.js's own place()-per-piece validation cost is real
// (a ground sample per foot cell) and not worth paying at world scale for a
// single click's neighbour query.
// =============================================================================
import { footCellRect, createBoard } from "./board.js";

/** grid.js's own display/indexing grouping -- see file header for why this,
 *  not plan.blockId, is the right unit for a visual isolate margin. */
export const NEIGHBOUR_MARGIN_M = 16;

/**
 * Which board piece is at `plotId`, and which OTHER pieces count as its
 * immediate neighbours (within NEIGHBOUR_MARGIN_M of its own footprint, via
 * a real board.js inCells() query -- see file header).
 *
 * @param {string} plotId
 * @param {Map<string, object>} boardPieces `bld-${plotId}` -> piece record
 *        (board-adapter.js's boardPiecesById -- callers already have this
 *        built once per world load; not rebuilt here).
 * @param {object} [opts]
 * @param {(x:number,z:number)=>number} [opts.heightAt]
 * @param {(i:number,j:number)=>boolean} [opts.inWorld]
 * @returns {{selected: object|null, neighbours: object[], keepIds: Set<string>}}
 */
export function neighboursOf(plotId, boardPieces, { heightAt = null, inWorld = null } = {}) {
  const selected = boardPieces.get(`bld-${plotId}`) || null;
  if (!selected) return { selected: null, neighbours: [], keepIds: new Set() };

  const selFoot = footCellRect(selected);
  const m = NEIGHBOUR_MARGIN_M;
  const bx0 = selFoot.xMin - m, bx1 = selFoot.xMax + m;
  const bz0 = selFoot.zMin - m, bz1 = selFoot.zMax + m;

  // Coarse prefilter: bounds which pieces are worth placing into the local
  // board below. Uses board.js's own footCellRect for the per-piece
  // rectangle -- not a re-derived one -- so the only geometry invented here
  // is the margin box itself, not the piece-overlap test.
  const local = [];
  for (const p of boardPieces.values()) {
    const r = footCellRect(p);
    if (r.xMax <= bx0 || r.xMin >= bx1 || r.zMax <= bz0 || r.zMin >= bz1) continue;
    local.push(p);
  }

  const board = createBoard({ heightAt, inWorld });
  // Best-effort: this is real adapted data (board-adapter.js's own
  // footprint-proxy approximation, per its header), not guaranteed to pass
  // board.js's own stricter canPlace on every piece -- a piece that does not
  // place is simply invisible to the neighbour query, not a crash. Named
  // rather than silently swallowed: callers can inspect placedCount below.
  let placedCount = 0;
  for (const p of local) {
    if (board.place(p).ok) placedCount++;
  }

  const i = Math.floor(bx0), j = Math.floor(bz0);
  const w = Math.ceil(bx1 - bx0), d = Math.ceil(bz1 - bz0);
  const hits = board.inCells(i, j, w, d, selected.cell.k);
  const neighbours = hits.filter((p) => p.id !== selected.id);
  const keepIds = new Set([selected.id, ...neighbours.map((p) => p.id)]);
  return { selected, neighbours, keepIds, localCount: local.length, placedCount };
}

/**
 * Decide which InstancedMesh batches must be hidden wholesale, and which
 * kept (selection+neighbour) entries need their own standalone mesh drawn
 * in front of them. Pure decision, no scene mutation -- see applyIsolate.
 *
 * @param {Map<string, {mesh:object, index:number, geometry:object}>} buildingInstanceIndex
 * @param {Set<string>} keepIds board-piece ids (`bld-${plotId}`)
 */
export function planIsolate(buildingInstanceIndex, keepIds) {
  const hideMeshes = new Set();
  const keepEntries = [];
  for (const [plotId, entry] of buildingInstanceIndex) {
    if (keepIds.has(`bld-${plotId}`)) keepEntries.push({ plotId, ...entry });
    else hideMeshes.add(entry.mesh);
  }
  return { hideMeshes, keepEntries };
}

/**
 * Apply an isolate: hide every non-kept InstancedMesh batch wholesale
 * (cheap -- one `.visible = false` per batch, not per instance, and NOT
 * "hiding by mutating shared InstancedMesh state" the way per-instance
 * zero-scaling across thousands of instances would be), then draw a
 * standalone Mesh for each kept piece at its saved matrix -- the same
 * technique world-render-3d.js's own P4.2 `_setHighlight` uses for its one
 * selected instance, generalised here to the whole kept set. Returns the
 * state restoreIsolate() needs to undo this exactly.
 *
 * @param {object} opts
 * @param {typeof import("./vendor/three/three.module.min.js")} opts.THREE
 * @param {object} opts.scene THREE.Scene
 * @param {Map<string, {mesh:object, index:number, geometry:object}>} opts.buildingInstanceIndex
 * @param {Set<string>} opts.keepIds
 */
export function applyIsolate({ THREE, scene, buildingInstanceIndex, keepIds }) {
  const { hideMeshes, keepEntries } = planIsolate(buildingInstanceIndex, keepIds);

  const hiddenMeshes = [];
  for (const mesh of hideMeshes) {
    hiddenMeshes.push({ mesh, wasVisible: mesh.visible });
    mesh.visible = false;
  }

  const addedMeshes = [];
  for (const { plotId, mesh, index, geometry } of keepEntries) {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(index, matrix);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 });
    const standalone = new THREE.Mesh(geometry, material);
    standalone.applyMatrix4(matrix);
    standalone.name = "p4-isolate";
    standalone.castShadow = true;
    standalone.receiveShadow = true;
    scene.add(standalone);
    addedMeshes.push({ plotId, standalone, material, matrix });
  }

  return { hiddenMeshes, addedMeshes };
}

/**
 * Undo applyIsolate() exactly: every hidden mesh's `.visible` goes back to
 * what it was (not hard-coded true -- a mesh already invisible for some
 * other reason before isolate ran must stay invisible after restore), and
 * every standalone mesh added is removed from the scene and its own
 * material disposed (the geometry is SHARED with the InstancedMesh -- never
 * disposed here, matching _clearHighlight's identical reasoning).
 */
export function restoreIsolate(scene, state) {
  for (const { mesh, wasVisible } of state.hiddenMeshes) mesh.visible = wasVisible;
  for (const { standalone, material } of state.addedMeshes) {
    scene.remove(standalone);
    material.dispose();
  }
}
