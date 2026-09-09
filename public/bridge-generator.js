// =============================================================================
// B2.7 — BRIDGES AND BOAT ROUTES: the 12 settled boundaries, connected
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.7 section (95cf588, blind-reviewed
// and corrected). Adapts scripts/gen-bridges.mjs's own nearest-gap / MST /
// redundant-short-edge algorithm -- that script derives crossings from the
// geometry itself and is tracked, committed, never imported by anything --
// to the REAL B1 archipelago's settled boundaries instead of the OLD
// world's `plan.landmassPolygons`, and to real board.js pieces instead of a
// printed table meant for hand-pasting into city-plan.js.
//
// THE THRESHOLD IS THE REAL BUILDABLE CEILING, NOT THE OLD "PLAUSIBLE" ONE.
// gen-bridges.mjs used 9,000 m as "too far to bridge" -- a number that
// answers "is this geographically plausible on a map", not "can roadkit.js
// actually build across it". public/roadkit.js's own `bridgeSpan()` refuses
// outright past 800 m ("exceeds maximum engineering limit"), and
// public/road-network.js's own comment records that the OLD world's bridges
// violated exactly this limit 11 of 19 times because 9,000 m was reused for
// the wrong question. This file uses 800 m for both the bridge/boat split
// and the redundant-edge pass, sourced from `bridgeSpan()` itself, not
// invented.
//
// AXIS-ALIGNED, LIKE EVERY OTHER PIECE ON THIS BOARD. board.js pieces are
// axis-aligned rectangles (rotation 0/90/180/270 only); a bridge or dock
// piece is no exception. Given two boundaries' own nearest points, the
// dominant separation axis (whichever of |dx|/|dz| is larger) is spanned;
// the anchor walk holds the OTHER coordinate fixed and searches along the
// dominant axis for dry, road-legal, correctly-owned ground -- the same
// "at"/"from"/"awayFrom" shape gen-bridges.mjs's own `dryAnchor` already
// uses, adapted to this file's board.js piece output instead of a printed
// `{axis, x, a, b}` row.
// =============================================================================

import { atomOf, atomCentre } from "./grid.js";
import { classifyAt, roadAllowedAt, USE } from "./land-use.js";
import { bridgeSpan } from "./roadkit.js";

/** roadkit.js's own bridgeSpan() engineering ceiling -- exported so the gate
 *  test can assert this file reads it from there, not from a second,
 *  independently-typed copy of the same number. */
export const BRIDGE_MAX_SPAN_M = 800;

// A "redundant" edge that cannot actually be built is not redundancy --
// re-thresholded to the same real ceiling, not the old world's 3,000 m.
const REDUNDANT_MAX_GAP_M = BRIDGE_MAX_SPAN_M;
const REDUNDANT_DEGREE_CAP = 5; // gen-bridges.mjs's own precedent

// A bridge anchor sets back from a fragile edge; gen-bridges.mjs's own
// precedent walks up to 2,600 m inland looking for dry, road-legal,
// correctly-owned ground. A dock's whole purpose is to sit AT the water's
// edge -- walking that far would defeat it, so its own search is bounded
// far tighter (this plan's own review finding).
const BRIDGE_ANCHOR_WALK_M = 2600;
const DOCK_ANCHOR_WALK_M = 200;
const ANCHOR_STEP_M = 10;

const ROAD_WIDTH = 9; // matches board-generator.js's own ROAD_WIDTH -- one bridge deck lane width

let pieceSeq = 0;
function nextId(prefix) {
  pieceSeq += 1;
  return `${prefix}-${pieceSeq}`;
}

/** Nearest pair of vertices between two polygons, world metres. Mirrors
 *  gen-bridges.mjs's own `nearest()` exactly -- same problem, same shape. */
function nearestGap(polyA, polyB) {
  let best = { d: Infinity, ax: 0, az: 0, bx: 0, bz: 0 };
  for (const [ax, az] of polyA) {
    for (const [bx, bz] of polyB) {
      const d = Math.hypot(ax - bx, az - bz);
      if (d < best.d) best = { d, ax, az, bx, bz };
    }
  }
  return best;
}

/**
 * Every settled boundary pair's own nearest gap, a minimum spanning tree
 * over those gaps (every boundary reachable, by construction), plus a
 * redundant-short-edge pass -- gen-bridges.mjs's own two-pass shape,
 * unchanged, applied to `settlementBoundaries()`'s real polygons instead of
 * the old world's `plan.landmassPolygons`.
 */
export function crossingGraph(boundaries) {
  const pairs = [];
  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 1; j < boundaries.length; j++) {
      const gap = nearestGap(boundaries[i].polygon, boundaries[j].polygon);
      pairs.push({ aId: boundaries[i].id, bId: boundaries[j].id, ...gap });
    }
  }
  pairs.sort((p, q) => p.d - q.d);

  const parent = new Map(boundaries.map((b) => [b.id, b.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const chosen = [];
  for (const p of pairs) {
    const ra = find(p.aId), rb = find(p.bId);
    if (ra === rb) continue;
    parent.set(ra, rb);
    chosen.push(p);
  }

  const degree = new Map();
  for (const p of chosen) {
    degree.set(p.aId, (degree.get(p.aId) || 0) + 1);
    degree.set(p.bId, (degree.get(p.bId) || 0) + 1);
  }
  for (const p of pairs) {
    if (chosen.includes(p)) continue;
    if (p.d > REDUNDANT_MAX_GAP_M) continue;
    if ((degree.get(p.aId) || 0) >= REDUNDANT_DEGREE_CAP) continue;
    if ((degree.get(p.bId) || 0) >= REDUNDANT_DEGREE_CAP) continue;
    chosen.push(p);
    degree.set(p.aId, (degree.get(p.aId) || 0) + 1);
    degree.set(p.bId, (degree.get(p.bId) || 0) + 1);
  }

  return { nodes: boundaries, edges: chosen };
}

/** Bridge if the real, measured buildable ceiling covers it; a boat route
 *  otherwise. Reads BRIDGE_MAX_SPAN_M -- never a second, inlined number. */
export function classifyCrossing(edge) {
  return edge.d <= BRIDGE_MAX_SPAN_M ? "bridge" : "boat";
}

function inPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const hit = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/**
 * Walk from a boundary's own near point RADIALLY AWAY from the other
 * boundary's own near point -- along the real 2D direction between them,
 * not locked to a single fixed axis coordinate -- looking for ground that
 * is dry, road-legal, AND inside THIS boundary's own polygon. Mechanism 1's
 * own hard-won rule (gen-bridges.mjs's `dryAnchor`) is carried across:
 * requiring only "dry" found dry ground belonging to a DIFFERENT landmass
 * (the barrier-redcliff bug its own comment records).
 *
 * A fixed-axis walk (gen-bridges.mjs's own literal shape, tried first here)
 * fails outright for a small boundary whose own footprint does not span the
 * fixed cross-coordinate two distant boundaries' midpoint produces --
 * measured directly: every cottage-island boat route failed at every walk
 * distance up to 5,000 m under a fixed-axis search, because the cottage
 * island's own tiny polygon simply never crosses that line. A radial walk
 * has no such blind spot -- it moves through the boundary's own real
 * footprint from the start.
 */
function walkAnchor(fromX, fromZ, awayX, awayZ, boundaryPolygon, heightAt, maxWalk) {
  const dx = fromX - awayX, dz = fromZ - awayZ;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  for (let d = 0; d <= maxWalk; d += ANCHOR_STEP_M) {
    const x = fromX + ux * d;
    const z = fromZ + uz * d;
    if (classifyAt(heightAt, x, z, null).use !== USE.BUILDABLE) continue;
    if (!roadAllowedAt(heightAt, x, z).ok) continue;
    if (!inPolygon(x, z, boundaryPolygon)) continue;
    return { x, z };
  }
  return null;
}

function boundaryById(boundaries, id) {
  return boundaries.find((b) => b.id === id);
}

function edgeKeyOf(aId, bId) {
  return [aId, bId].sort().join("|");
}

/** One board.js "bridge" piece from an already-anchored span, axis-aligned,
 *  atom-aligned by construction (atomOf on absolute world metres only --
 *  never a landform-derived offset, B2.1's own rule, applied here). Bridge
 *  decks are allowed to stand over water (that is the entire point of a
 *  bridge) -- the two ANCHOR cells are what this file separately verifies
 *  dry, not the whole span. */
function bridgePieceFrom(edge, anchorA, anchorB, boundaries) {
  const spanResult = bridgeSpan(
    [anchorA.x, 0, anchorA.z],
    [anchorB.x, 0, anchorB.z],
    { roadClass: "AVENUE" },
  );
  if (!spanResult.ok) return { ok: false, reason: spanResult.refusal };

  const cellA = atomOf(anchorA.x, anchorA.z);
  const cellB = atomOf(anchorB.x, anchorB.z);
  // Axis picked from the REAL anchors found, not the original nearest-gap
  // guess -- a radial walk can land anchors whose dominant separation
  // differs from the two boundaries' own nearest points.
  const axis = Math.abs(cellB.j - cellA.j) >= Math.abs(cellB.i - cellA.i) ? "j" : "i";
  let cell, foot;
  if (axis === "i") {
    const iLo = Math.min(cellA.i, cellB.i), iHi = Math.max(cellA.i, cellB.i);
    const jFixed = Math.round((cellA.j + cellB.j) / 2) - Math.floor(ROAD_WIDTH / 2);
    cell = { i: iLo, j: jFixed, k: 0 };
    foot = { w: Math.max(1, iHi - iLo), d: ROAD_WIDTH };
  } else {
    const jLo = Math.min(cellA.j, cellB.j), jHi = Math.max(cellA.j, cellB.j);
    const iFixed = Math.round((cellA.i + cellB.i) / 2) - Math.floor(ROAD_WIDTH / 2);
    cell = { i: iFixed, j: jLo, k: 0 };
    foot = { w: ROAD_WIDTH, d: Math.max(1, jHi - jLo) };
  }
  if (foot.w < 1 || foot.d < 1) return { ok: false, reason: "degenerate span" };

  const piece = {
    id: nextId(`bridge-${edge.aId}-${edge.bId}`),
    pieceType: "bridge",
    edgeKey: edgeKeyOf(edge.aId, edge.bId),
    cell, rotation: 0, foot, levels: 1, clear: { w: 0, d: 0 },
    standsOn: [USE.WATER, USE.BUILDABLE, USE.BEACH],
    surface: "road",
    typology: spanResult.typology,
    spanM: spanResult.spanM,
    anchors: [
      { ...anchorA, boundaryId: edge.aId },
      { ...anchorB, boundaryId: edge.bId },
    ],
  };
  return { ok: true, piece };
}

/** Two board.js "dock" pieces, one per boundary, carrying the route
 *  relationship (`routeTo`/`routeId`) as fields ON the piece itself --
 *  inside the board, satisfying Standing Gate 5 ("no world state outside
 *  the board"), which a separate route table would not. */
function dockPiecesFrom(edge, anchorA, anchorB, dockSeqByBoundary) {
  const routeId = `route-${edge.aId}-${edge.bId}`;
  const seqA = (dockSeqByBoundary.get(edge.aId) || 0) + 1;
  dockSeqByBoundary.set(edge.aId, seqA);
  const seqB = (dockSeqByBoundary.get(edge.bId) || 0) + 1;
  dockSeqByBoundary.set(edge.bId, seqB);

  const idA = `dock-${edge.aId}-${edge.bId}`;
  const idB = `dock-${edge.bId}-${edge.aId}`;
  const cellA = atomOf(anchorA.x, anchorA.z);
  const cellB = atomOf(anchorB.x, anchorB.z);
  const dockA = {
    id: idA, pieceType: "dock", edgeKey: edgeKeyOf(edge.aId, edge.bId),
    cell: { i: cellA.i, j: cellA.j, k: 0 }, rotation: 0,
    foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 },
    standsOn: [USE.BUILDABLE, USE.BEACH], surface: "dock",
    routeId, routeTo: idB,
    anchor: { ...anchorA, boundaryId: edge.aId },
  };
  const dockB = {
    id: idB, pieceType: "dock", edgeKey: edgeKeyOf(edge.aId, edge.bId),
    cell: { i: cellB.i, j: cellB.j, k: 0 }, rotation: 0,
    foot: { w: 4, d: 4 }, levels: 1, clear: { w: 0, d: 0 },
    standsOn: [USE.BUILDABLE, USE.BEACH], surface: "dock",
    routeId, routeTo: idA,
    anchor: { ...anchorB, boundaryId: edge.bId },
  };
  return [dockA, dockB];
}

/**
 * Build every crossing in `crossingGraph(boundaries)`'s own edge list as a
 * real board.js piece: a bridge where the classification and the real
 * geometry both allow it, a pair of docks otherwise -- including a bridge
 * candidate `bridgeSpan()` itself refuses at build time, which redirects to
 * a boat route rather than silently dropping the connection (this plan's
 * own named fallback rule).
 */
export function buildCrossingPieces(boundaries, heightAt, board, opts = {}) {
  pieceSeq = 0;
  const graph = crossingGraph(boundaries);
  const built = [];
  const refused = [];
  const dockSeqByBoundary = new Map();

  for (const edge of graph.edges) {
    const boundaryA = boundaryById(boundaries, edge.aId);
    const boundaryB = boundaryById(boundaries, edge.bId);
    const kind = classifyCrossing(edge);
    const walkM = kind === "bridge" ? BRIDGE_ANCHOR_WALK_M : DOCK_ANCHOR_WALK_M;
    const edgeKey = edgeKeyOf(edge.aId, edge.bId);

    const anchorA = walkAnchor(edge.ax, edge.az, edge.bx, edge.bz, boundaryA.polygon, heightAt, walkM);
    const anchorB = walkAnchor(edge.bx, edge.bz, edge.ax, edge.az, boundaryB.polygon, heightAt, walkM);

    const tryDockFallback = () => {
      const dockA = walkAnchor(edge.ax, edge.az, edge.bx, edge.bz, boundaryA.polygon, heightAt, DOCK_ANCHOR_WALK_M);
      const dockB = walkAnchor(edge.bx, edge.bz, edge.ax, edge.az, boundaryB.polygon, heightAt, DOCK_ANCHOR_WALK_M);
      if (dockA && dockB) { built.push(...dockPiecesFrom(edge, dockA, dockB, dockSeqByBoundary)); return true; }
      return false;
    };

    if (!anchorA || !anchorB) {
      // A bridge anchor search can fail where a boat's own, much shorter
      // shoreline search still succeeds (or vice versa, if the boat walk's
      // own bound was the limiting one) -- retry with the dock's own bound
      // before giving up on this edge entirely.
      if (tryDockFallback()) continue;
      refused.push({ edgeKey, edge, reason: "no dry anchor on both boundaries" });
      continue;
    }

    if (kind === "boat") {
      built.push(...dockPiecesFrom(edge, anchorA, anchorB, dockSeqByBoundary));
      continue;
    }

    const result = bridgePieceFrom(edge, anchorA, anchorB, boundaries);
    let bridgePlaced = false;
    if (result.ok) {
      const r = board.place(result.piece);
      if (r.ok) { built.push(result.piece); bridgePlaced = true; }
    }
    if (bridgePlaced) continue;
    // Either bridgeSpan() itself refused (the real anchor separation can
    // exceed 800 m even though the straight-line gap between the two
    // boundaries' nearest points was under it) or board.place() refused
    // (an occupied-cell collision) -- either way, redirect to a boat route
    // rather than drop the connection, this plan's own named fallback
    // rule, applied uniformly.
    if (!tryDockFallback()) {
      refused.push({ edgeKey, edge, reason: `bridge refused (${result.ok ? "board placement" : result.reason}) and no fallback dock anchor` });
    }
  }

  // Dock pieces are placed on the board too, after the loop, so a dock that
  // collides with a bridge decided later in edge order still surfaces as a
  // real board refusal rather than an assumed success.
  const finalBuilt = [];
  for (const piece of built) {
    if (piece.pieceType === "bridge") { finalBuilt.push(piece); continue; }
    const r = board.place(piece);
    if (r.ok) finalBuilt.push(piece);
    else refused.push({ edgeKey: piece.edgeKey, edge: null, reason: `board refused dock ${piece.id}: ${r.reason}` });
  }

  return { graph, built: finalBuilt, refused };
}
