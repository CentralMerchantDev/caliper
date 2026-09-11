// =============================================================================
// B2 — THE GENERATOR: real board pieces, on the real B1 archipelago
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.1 contract, in code. No plot/road
// intermediate structure, no adapter: every piece below is built by calling
// public/board.js's own createBoard().place() directly.
//
// SETTLEMENT_TABLE DECIDES DENSITY AND ERA FROM public/terrain.js's OWN
// LANDMASSES `kind`, AS A TABLE -- Mark, 2026-09-08, approving B2.1: "a
// cottage island holding one house BECAUSE ONLY ONE PLOT SURVIVED THE
// BUILDABILITY CHECK... is an accident that looks like a decision until the
// terrain changes; the second is a decision." Every settled landmass's
// boundary, block size, plot size, era and level count is read from this
// table, decided once, before any road or plot is laid -- never derived by
// generating everywhere and filtering what survives.
//
// ROADS ARE AN EXPLICIT JUNCTION GRAPH -- nodes are junction pieces, edges
// are span pieces between two named nodes. A road without a junction at its
// end is not representable: the "lines of roads in rows with no
// crossroads" defect (Mark's oldest reported complaint) is unconstructable
// here, not merely checked for after the fact.
//
// GRID ALIGNMENT AND ORIGIN STABILITY, BY CONSTRUCTION: every coordinate
// below is an integer atom index from the moment it is chosen -- grid line
// positions are computed by adding whole ATOM multiples to a boundary's own
// atomOf() origin, never by placing a piece at a continuous float position
// and rounding afterward. No piece here is ever positioned relative to an
// island's own bounds, WORLD.SIZE, or any landform extent -- atomOf/
// atomOrigin/atomCentre are called on absolute world metres exclusively, the
// same property grid.js's own atomOf already has for free (zero dependency
// on WORLD.SIZE), so this is inherited, not built.
// =============================================================================

import { atomOf, atomOrigin, atomCentre, atomsFor, ATOM } from "./grid.js";
import { createBoard } from "./board.js";
import { classifyAt, roadAllowedAt, USE } from "./land-use.js";
import { assessFootprint } from "./footprint.js";
import { landmassPolygonsWorld, waterwayAt } from "./terrain.js";
import { ROAD_STANDARDS } from "./roadkit.js";

/**
 * Per-`kind` (public/terrain.js's LANDMASSES) settlement decision, made
 * once, as data -- B2.1's own table, approved by Mark 2026-09-08.
 *
 * `boundaryK`: the linear scale-toward-centroid factor used to inset an
 * island's own real coastline into its settlement boundary (area scales as
 * k^2 -- see `islandBoundary` below). Islands only; the mainland uses its
 * own coastal-strip construction (see `mainlandBoundary`).
 *
 * `blockAtoms`: road-grid spacing, tighter for denser tiers.
 * `plotAtoms`: plot size within a block -- the "1.5-2x lot growth" the
 * brief asks for is authored directly into these numbers (a lot at 1x was
 * roughly 9-12 m; these are 1.5-2x that), not derived from an old baseline
 * this file has no way to read.
 * `levels`: storeys per building at this density tier.
 * `oneHouse`: bypasses the road/block/plot machinery entirely -- a cottage
 * island gets exactly one building at its own centroid, because it is a
 * cottage island, not because a road grid happened to leave one plot.
 */
export const SETTLEMENT_TABLE = {
  // blockAtoms MUST leave room for at least one plot inside a block's own
  // interior (blockAtoms - the road's own width, eaten off each side as a
  // half-width margin) -- an earlier version picked blockAtoms close to
  // plotAtoms and produced a road grid with almost nowhere left to build
  // (21 buildings against 100,717 road pieces, caught by this file's own
  // gate test before any tuning). Sized here for roughly 2-3 plots per
  // block side (blockAtoms ~= plotsPerSide*plotAtoms + the road's own
  // width), a real block, not a single lot fenced by road on every side.
  // These numbers were tuned against the fixed 9 m width Decision 5
  // retired (see roadWidthFor()/halfRoadFor() below) -- re-tuning them for
  // the new, wider default is docs/specs/PIECE-CATALOGUE-ROADS.md §9's
  // own Step 3, not this step.
  mainland:  { settled: true,  density: "low-medium",   era: "mixed",                    blockAtoms: 80, plotAtoms: 22, levels: 3 },
  city:      { settled: true,  density: "highest",       era: "contemporary+heritage",    boundaryK: 0.55, blockAtoms: 57, plotAtoms: 18, levels: 9 },
  suburb:    { settled: true,  density: "medium-high",   era: "postwar+contemporary",     boundaryK: 0.55, blockAtoms: 69, plotAtoms: 20, levels: 3 },
  resort:    { settled: true,  density: "medium",        era: "contemporary",             boundaryK: 0.50, blockAtoms: 57, plotAtoms: 24, levels: 4 },
  highland:  { settled: true,  density: "low",           era: "heritage+interwar",        boundaryK: 0.35, blockAtoms: 65, plotAtoms: 28, levels: 2 },
  fishing:   { settled: true,  density: "very low",      era: "interwar+heritage",        boundaryK: 0.30, blockAtoms: 65, plotAtoms: 28, levels: 2 },
  farm:      { settled: true,  density: "very low",      era: "interwar+heritage",        boundaryK: 0.30, blockAtoms: 65, plotAtoms: 28, levels: 2 },
  vineyard:  { settled: true,  density: "very low",      era: "interwar+heritage",        boundaryK: 0.30, blockAtoms: 65, plotAtoms: 28, levels: 2 },
  quarry:    { settled: true,  density: "very low",      era: "interwar+heritage",        boundaryK: 0.30, blockAtoms: 65, plotAtoms: 28, levels: 2 },
  cottage:   { settled: true,  density: "one house",     era: "heritage",                 oneHouse: true, levels: 1 },
  wooded:    { settled: false },
  sandbar:   { settled: false },
  rock:      { settled: false },
  skerry:    { settled: false },
};

// Decision 5's retirement of the old fixed road-width constant
// (docs/DECISIONS-FOR-MARK.md #5, docs/specs/PIECE-CATALOGUE-ROADS.md §9).
// Step 1 gave every road piece a
// roadClass (default "STREET", matching roadkit.js's own fallback
// ROAD_STANDARDS[stdKey] || ROAD_STANDARDS.STREET -- not a new convention).
// Step 2 (this) retires the one-fixed-width constant that used to size
// every road piece and the block-carving margin: both now read the road's
// own class from roadkit.js's own ROAD_STANDARDS table instead. Every piece
// still carries the same "STREET" default step 1 chose, so this doubles the
// real width every road/block-carving site uses (was 9, STREET.row is 18)
// -- a real, visible geometry change, not a rename.
const ROAD_CLASS_DEFAULT = "STREET";
function roadWidthFor(roadClass) {
  return (ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.STREET).row;
}
function halfRoadFor(roadClass) {
  return Math.floor(roadWidthFor(roadClass) / 2);
}
// Atoms of clearance around a placed building, inside its own plot. Tuned,
// not guessed: measured coverage at CLEAR=2 was 38.5-46.5% across every
// density tier (public/terrain.js's own real ground, not a hand estimate)
// -- above the 20-40% target band docs/specs/BOARD-REBUILD-PLAN.md states.
// CLEAR=3, plus city's own plotAtoms nudged 16->18 (its own tier alone ran
// 40.9%, just over the ceiling, after CLEAR's own fix brought every other
// tier inside the band), measured 24.0-39.0% across every settled,
// non-oneHouse boundary -- inside the band on every one, mainland included.
const CLEAR = 3;

/** The one standsOn value every road/building piece declares -- a real Set,
 *  shared, so sampledGroundOk's own .has() calls don't rebuild one per
 *  candidate. */
const BUILDABLE_SET = new Set([USE.BUILDABLE]);

/** Shoelace, world m². Local, not imported -- this file's own boundary
 *  construction needs it before anything is placed, same function every
 *  other area-honest module in this project already carries locally
 *  (terrain.js, measure-land.mjs) rather than share a cross-module utility
 *  for one four-line function. */
function polygonAreaM2(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

function centroidOf(poly) {
  const cx = poly.reduce((s, [x]) => s + x, 0) / poly.length;
  const cz = poly.reduce((s, [, z]) => s + z, 0) / poly.length;
  return { x: cx, z: cz };
}

/** Mirrors public/board.js's own kindBelow(i, j, 0) exactly -- classifyAt at
 *  the cell's own atom centre, no `reserved` predicate (this generator's
 *  board is created with none). The candidate for a per-cell answer BOTH
 *  the sampled and exhaustive ground checks below share, so any agreement
 *  or disagreement measured between them is about WHICH CELLS are looked
 *  at, never about a different definition of "buildable" underneath. */
function groundKindAt(heightAt, i, j) {
  const { x, z } = atomCentre(i, j);
  return classifyAt(heightAt, x, z, null).use;
}

/**
 * A SAMPLED ground check over a foot rectangle: the FULL PERIMETER at
 * native (1-atom) resolution, plus a stride-spaced interior grid -- not
 * every interior cell. A DIFFERENT check from board.js's own exhaustive
 * per-cell one (docs/specs/BOARD-REBUILD-PLAN.md's B2.5), adopted only
 * after being measured to agree with it on every real piece this
 * generator actually produces (see the B2.5 section of that document for
 * the numbers). The perimeter is never sampled, on purpose: a cliff or
 * water edge cutting through a footprint is a connected boundary, and a
 * convex rectangle's own edge is where such a boundary is caught with
 * certainty; only a feature small enough to fit entirely inside the
 * interior AND between stride points could be missed, which is exactly
 * what the real-sample verification checks for rather than assumes away.
 */
// exported for test/boardGenerator.test.ts (RUN3 C1 -- a deterministic
// mechanism control for b2-5-sampled-ground-perimeter-is-load-bearing)
export function sampledGroundOk(heightAt, iMin, jMin, w, d, standsSet, stride) {
  for (let di = 0; di < w; di++) {
    if (!standsSet.has(groundKindAt(heightAt, iMin + di, jMin))) return false;
    if (!standsSet.has(groundKindAt(heightAt, iMin + di, jMin + d - 1))) return false;
  }
  for (let dj = 0; dj < d; dj++) {
    if (!standsSet.has(groundKindAt(heightAt, iMin, jMin + dj))) return false;
    if (!standsSet.has(groundKindAt(heightAt, iMin + w - 1, jMin + dj))) return false;
  }
  for (let di = stride; di < w - 1; di += stride) {
    for (let dj = stride; dj < d - 1; dj += stride) {
      if (!standsSet.has(groundKindAt(heightAt, iMin + di, jMin + dj))) return false;
    }
  }
  return true;
}

/** Ray-casting point-in-polygon, world metres. */
function inPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1];
    const xj = poly[j][0], zj = poly[j][1];
    const intersect = ((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** An island's settlement boundary: its own real coastline, scaled toward
 *  its own centroid by `k` (area ~ k^2) -- an inset of the real shape, not
 *  a bounding box or a copy of the coastline itself. */
function islandBoundary(polygon, k) {
  const { x: cx, z: cz } = centroidOf(polygon);
  return polygon.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
}

/**
 * The mainland's settlement boundary: a strip along the real coastline,
 * `stripDepth` world metres deep -- MAINLAND_ZONES' own coastal-strip band,
 * the only settleable part of the mainland (public/terrain.js).
 *
 * APPROXIMATION, NAMED RATHER THAN HIDDEN: a true perpendicular offset of a
 * jittered polyline needs a normal at every vertex; this instead offsets
 * every coastline point by `stripDepth` in world -X -- MAINLAND_INLAND_XW
 * (-13000) is LESS than MAINLAND_COAST_X0W (-8000) in terrain.js's own
 * construction, so inland from the coast is -X, not +X (a first version of
 * this function offset +X instead and built a strip that was 1,397 of
 * 1,402 sampled points WATER, measured directly, not assumed -- the strip
 * ran out into the sea the coast faces, not onto the land behind it) --
 * and closes the strip between the coastline and that offset copy. The
 * coastline's own jitter is modest next to the strip depth chosen (checked
 * at the point SETTLEMENT_TABLE.mainland's numbers were picked, not
 * assumed) -- close enough for a first real boundary, not claimed exact.
 *
 * `coastPolyline` MUST be identified by coordinate, not by array position.
 * landmassPolygonsDesign() builds the mainland polygon as [...splined
 * coast, ...raw inland corners], but its own `if (signedArea2(polygon) > 0)
 * polygon.reverse()` (winding-direction fix, applied to every landmass) can
 * reverse the WHOLE array -- found directly, by measuring: a first version
 * of this function sliced the array's first N points expecting the coast
 * and got the four raw inland corners instead (a ~0 km² self-intersecting
 * "boundary" with a 46,800 m bounding box, caught by this file's own gate
 * test before it ever reached the road/plot machinery). Fixed by selecting
 * on the coastline's own known position instead of array order.
 */
function mainlandBoundary(polygon, coastXThresholdWorld, stripDepth) {
  const coastPolyline = polygon.filter(([x]) => x > coastXThresholdWorld);
  const inland = coastPolyline.map(([x, z]) => [x - stripDepth, z]);
  return [...coastPolyline, ...inland.reverse()];
}

/**
 * Junction graph for one settlement boundary: nodes at every atom-aligned
 * grid intersection inside the boundary and on real, road-legal ground;
 * edges between adjacent nodes, each checked at its own midpoint too. A
 * road is only ever emitted from an edge that names its two junction
 * nodes -- see the file header.
 */
function junctionGraph(boundary, bbox, blockAtoms, heightAt) {
  const iMin = Math.floor(bbox.iMin / blockAtoms) * blockAtoms;
  const jMin = Math.floor(bbox.jMin / blockAtoms) * blockAtoms;
  const nodes = new Map(); // "i,j" -> {i,j,x,z}
  for (let i = iMin; i <= bbox.iMax; i += blockAtoms) {
    for (let j = jMin; j <= bbox.jMax; j += blockAtoms) {
      const { x, z } = atomCentre(i, j);
      if (!inPolygon(x, z, boundary)) continue;
      const r = roadAllowedAt(heightAt, x, z);
      if (!r.ok) continue;
      nodes.set(`${i},${j}`, { i, j, x, z });
    }
  }
  const edges = [];
  for (const node of nodes.values()) {
    const east = nodes.get(`${node.i + blockAtoms},${node.j}`);
    if (east) {
      const mid = atomCentre(node.i + blockAtoms / 2, node.j);
      if (roadAllowedAt(heightAt, mid.x, mid.z).ok) edges.push({ a: node, b: east, axis: "i" });
    }
    const north = nodes.get(`${node.i},${node.j + blockAtoms}`);
    if (north) {
      const mid = atomCentre(node.i, node.j + blockAtoms / 2);
      if (roadAllowedAt(heightAt, mid.x, mid.z).ok) edges.push({ a: node, b: north, axis: "j" });
    }
  }
  return { nodes: [...nodes.values()], edges };
}

let pieceSeq = 0;
function nextId(prefix) {
  pieceSeq += 1;
  return `${prefix}-${pieceSeq}`;
}

function placeRoadGraph(board, boundaryId, graph, heightAt, stats) {
  const placed = [];
  // Computed once per boundary, not per piece -- every piece placed by this
  // function shares the same ROAD_CLASS_DEFAULT today, so this is one
  // lookup, not one per piece, without pre-judging a future step where a
  // boundary's own roadClass could vary.
  const halfRoad = halfRoadFor(ROAD_CLASS_DEFAULT), roadWidth = roadWidthFor(ROAD_CLASS_DEFAULT);
  let t = now();
  for (const node of graph.nodes) {
    const piece = {
      id: nextId(`road-j-${boundaryId}`), pieceType: "road", boundaryId, roadClass: ROAD_CLASS_DEFAULT,
      cell: { i: node.i - halfRoad, j: node.j - halfRoad, k: 0 }, rotation: 0,
      foot: { w: roadWidth, d: roadWidth }, levels: 1, clear: { w: 0, d: 0 },
      standsOn: [USE.BUILDABLE], surface: "road",
    };
    const r = board.place(piece);
    if (r.ok) placed.push(piece);
  }
  stats.roadNodePlaceMs += now() - t; t = now();
  let spanCellsTotal = 0;
  for (const edge of graph.edges) {
    let piece;
    if (edge.axis === "i") {
      const iLo = Math.min(edge.a.i, edge.b.i) + halfRoad + 1, iHi = Math.max(edge.a.i, edge.b.i) - halfRoad;
      if (iHi <= iLo) continue;
      piece = {
        id: nextId(`road-s-${boundaryId}`), pieceType: "road", boundaryId, roadClass: ROAD_CLASS_DEFAULT,
        cell: { i: iLo, j: edge.a.j - halfRoad, k: 0 }, rotation: 0,
        foot: { w: iHi - iLo, d: roadWidth }, levels: 1, clear: { w: 0, d: 0 },
        standsOn: [USE.BUILDABLE], surface: "road",
      };
    } else {
      const jLo = Math.min(edge.a.j, edge.b.j) + halfRoad + 1, jHi = Math.max(edge.a.j, edge.b.j) - halfRoad;
      if (jHi <= jLo) continue;
      piece = {
        id: nextId(`road-s-${boundaryId}`), pieceType: "road", boundaryId, roadClass: ROAD_CLASS_DEFAULT,
        cell: { i: edge.a.i - halfRoad, j: jLo, k: 0 }, rotation: 0,
        foot: { w: roadWidth, d: jHi - jLo }, levels: 1, clear: { w: 0, d: 0 },
        standsOn: [USE.BUILDABLE], surface: "road",
      };
    }
    spanCellsTotal += piece.foot.w * piece.foot.d;

    if (stats.verifySampling) {
      const sampled = sampledGroundOk(heightAt, piece.cell.i, piece.cell.j, piece.foot.w, piece.foot.d, BUILDABLE_SET, stats.verifyStride);
      const check = board.canPlace(piece);
      const exhaustiveGroundOk = check.ok || check.reason !== "ground";
      recordSamplingComparison(stats, "road", sampled, exhaustiveGroundOk, piece);
    }

    const r = stats.useSampling
      ? placeWithSampledGround(board, piece, heightAt, BUILDABLE_SET, stats.verifyStride, stats)
      : board.place(piece);
    if (r.ok) placed.push(piece);
  }
  stats.roadSpanPlaceMs += now() - t;
  stats.roadSpanCells += spanCellsTotal;
  return placed;
}

/** Place a piece whose ground has already been verified by sampledGroundOk
 *  -- skips board.js's own exhaustive per-cell re-check (board.js's own
 *  `groundVerified` option, added for exactly this), still pays SPACE in
 *  full, always. Refuses without reserving if the SAMPLED check itself
 *  says no -- the exhaustive check is never run at all in that case,
 *  which is the entire saving. */
function placeWithSampledGround(board, piece, heightAt, standsSet, stride, stats) {
  let t = now();
  const ok = sampledGroundOk(heightAt, piece.cell.i, piece.cell.j, piece.foot.w, piece.foot.d, standsSet, stride);
  stats.sampledCheckMs = (stats.sampledCheckMs || 0) + (now() - t);
  if (!ok) return { ok: false, reason: "ground" };
  t = now();
  const r = board.place(piece, { groundVerified: true });
  stats.spaceCheckMs = (stats.spaceCheckMs || 0) + (now() - t);
  return r;
}

/** Accumulates real-sample agreement between the sampled and exhaustive
 *  ground checks, by piece kind -- docs/specs/BOARD-REBUILD-PLAN.md's
 *  B2.5: "prove the two agree on a real sample before adopting it." The
 *  DANGEROUS direction is sampled=true, exhaustive=false (a piece the fast
 *  check would have approved that the real ground refuses) -- tracked and
 *  reported separately, and named explicitly if it is ever non-zero,
 *  rather than averaged into a single agreement percentage that could
 *  hide it. */
function recordSamplingComparison(stats, kind, sampled, exhaustive, piece) {
  stats.samplingChecked[kind] = (stats.samplingChecked[kind] || 0) + 1;
  if (sampled === exhaustive) {
    stats.samplingAgree[kind] = (stats.samplingAgree[kind] || 0) + 1;
    return;
  }
  if (sampled && !exhaustive) {
    stats.samplingDangerous.push({ kind, piece: piece.id, cell: piece.cell, foot: piece.foot });
  } else {
    stats.samplingConservative[kind] = (stats.samplingConservative[kind] || 0) + 1;
  }
}

/** Plots and buildings inside one block interior (the atom rectangle
 *  between four road edges, already inset by the road's own half-width). */
function placeBlockBuildings(board, boundaryId, boundary, block, plotAtoms, levels, heightAt, stats) {
  const placed = [];
  for (let i = block.iMin; i + plotAtoms <= block.iMax; i += plotAtoms) {
    for (let j = block.jMin; j + plotAtoms <= block.jMax; j += plotAtoms) {
      const centre = atomCentre(i + plotAtoms / 2, j + plotAtoms / 2);
      if (!inPolygon(centre.x, centre.z, boundary)) continue;
      const origin = atomOrigin(i + CLEAR, j + CLEAR);
      const far = atomOrigin(i + plotAtoms - CLEAR, j + plotAtoms - CLEAR);
      const env = { xMin: origin.x, xMax: far.x, zMin: origin.z, zMax: far.z };
      if (env.xMax <= env.xMin || env.zMax <= env.zMin) continue;
      let t = now();
      const verdict = assessFootprint(heightAt, env, waterwayAt);
      stats.footprintMs += now() - t;
      if (verdict.verdict === "refuse") continue;
      const piece = {
        id: nextId(`bldg-${boundaryId}`), pieceType: "building", boundaryId,
        cell: { i: i + CLEAR, j: j + CLEAR, k: 0 }, rotation: 0,
        foot: { w: plotAtoms - 2 * CLEAR, d: plotAtoms - 2 * CLEAR }, levels,
        clear: { w: CLEAR, d: CLEAR },
        standsOn: [USE.BUILDABLE], surface: "roof",
      };

      if (stats.verifySampling) {
        const sampled = sampledGroundOk(heightAt, piece.cell.i, piece.cell.j, piece.foot.w, piece.foot.d, BUILDABLE_SET, stats.verifyStride);
        const check = board.canPlace(piece);
        const exhaustiveGroundOk = check.ok || check.reason !== "ground";
        recordSamplingComparison(stats, "building", sampled, exhaustiveGroundOk, piece);
      }

      t = now();
      const r = stats.useSampling
        ? placeWithSampledGround(board, piece, heightAt, BUILDABLE_SET, stats.verifyStride, stats)
        : board.place(piece);
      stats.buildingPlaceMs += now() - t;
      if (r.ok) placed.push(piece);
    }
  }
  return placed;
}

/** One building at an island's own centroid -- a cottage island, not a
 *  road grid that happened to leave one plot. */
function placeOneHouse(board, boundaryId, boundary, heightAt) {
  const { x, z } = centroidOf(boundary);
  const { i, j } = atomOf(x, z);
  const half = 6; // a 12x12 m house -- a real single dwelling, not a block
  const origin = atomOrigin(i - half, j - half);
  const far = atomOrigin(i + half, j + half);
  const verdict = assessFootprint(heightAt, { xMin: origin.x, xMax: far.x, zMin: origin.z, zMax: far.z }, waterwayAt);
  if (verdict.verdict === "refuse") return [];
  const piece = {
    id: nextId(`bldg-${boundaryId}`), pieceType: "building", boundaryId,
    cell: { i: i - half, j: j - half, k: 0 }, rotation: 0,
    foot: { w: 2 * half, d: 2 * half }, levels: 1, clear: { w: 1, d: 1 },
    standsOn: [USE.BUILDABLE], surface: "roof",
  };
  const r = board.place(piece);
  return r.ok ? [piece] : [];
}

/** Every settled landmass's own boundary polygon, id and kind -- exposed on
 *  its own so a caller (and this file's own gate test) can measure coverage
 *  and total settled area without re-deriving the boundary construction. */
export function settlementBoundaries(polysWorld = landmassPolygonsWorld()) {
  const out = [];
  for (const lm of polysWorld) {
    const rule = SETTLEMENT_TABLE[lm.kind];
    if (!rule || !rule.settled) continue;
    if (lm.kind === "mainland") {
      // MAINLAND_COAST_X0W (-8000) and MAINLAND_INLAND_XW (-13000), world
      // metres, both terrain.js constants this file does not import (kept
      // local rather than exported solely for this) -- their midpoint
      // safely separates the coastline (jitters +-585 m around -8000) from
      // the four raw inland corners (exactly -13000), same numbers
      // terrain.js's own comments cite for this geometry.
      const coastXThresholdWorld = -10500;
      // MAINLAND_ZONES' coastal-strip fraction (0.12) * MAINLAND_DEPTH_W
      // (5000, ALREADY world metres per terrain.js's own comment on it --
      // an earlier version of this line multiplied by WORLD_SCALE again, a
      // spurious extra factor found only by the origin-stability test
      // below: the real mainland coastline is bit-identical between
      // WORLD_SCALE 0.65 and 0.52 -- measured directly, max delta 0.00 m
      // across all 171 coast points -- so a boundary built ONLY from that
      // coastline and a WORLD-space-fixed depth has no remaining reason to
      // move; this file's own hardcoded scale factor was the only thing
      // that did).
      const stripDepthWorld = 0.12 * 5000;
      out.push({ id: lm.id, kind: lm.kind, polygon: mainlandBoundary(lm.polygon, coastXThresholdWorld, stripDepthWorld) });
      continue;
    }
    if (rule.oneHouse) {
      out.push({ id: lm.id, kind: lm.kind, polygon: lm.polygon, oneHouse: true });
      continue;
    }
    out.push({ id: lm.id, kind: lm.kind, polygon: islandBoundary(lm.polygon, rule.boundaryK) });
  }
  return out;
}

const now = () => performance.now();

/**
 * The real board: every settled landmass's roads, plots and buildings,
 * placed by calling public/board.js's own place() directly.
 *
 * @param {(x:number,z:number)=>number} heightAt real WORLD-space terrain
 * @param {string|number} [seed] unused today (the generator is otherwise
 *        deterministic from the archipelago's own data) -- accepted so
 *        callers matching public/world.js's createWorld(seed) signature do
 *        not need a special case for this generator.
 * @param {object} [opts]
 * @param {boolean} [opts.useSampling] B2.5: place with sampledGroundOk's own
 *        pre-verified ground (public/board.js's `groundVerified` option),
 *        skipping the exhaustive per-cell re-check for pieces the sampled
 *        check has already approved. Default false -- opt-in, matches the
 *        exhaustive-only behaviour every earlier commit measured.
 * @param {boolean} [opts.verifySampling] B2.5: for every road span and
 *        building candidate, run BOTH the sampled and exhaustive ground
 *        checks and record agreement in `.stats` -- "prove the two agree
 *        on a real sample before adopting it" (Mark, 2026-09-08). Costs
 *        roughly double the exhaustive-only running time (both checks run);
 *        meant for producing the real-sample proof, not for every call.
 * @param {number} [opts.verifyStride] sampledGroundOk's own interior stride,
 *        in atoms. Default 3.
 *
 * `.stats` on the return value is a real profile, by phase and by piece
 * kind, not a guess -- B2.5 (Mark, 2026-09-08): "ground it before fixing:
 * profile and report WHERE the time goes... do not optimise on my
 * hypothesis." See docs/specs/BOARD-REBUILD-PLAN.md's B2.5 section for the
 * measured breakdown this produced and the fix it justified.
 */
export function generateBoard(heightAtRaw, seed = 0, opts = {}) {
  const { useSampling = false, verifySampling = false, verifyStride = 3 } = opts;
  pieceSeq = 0;
  const stats = {
    totalMs: 0, boundaryMs: 0, graphMs: 0,
    roadNodePlaceMs: 0, roadSpanPlaceMs: 0, roadSpanCells: 0,
    footprintMs: 0, buildingPlaceMs: 0,
    heightAtRawCalls: 0, heightAtCacheHits: 0,
    useSampling, verifySampling, verifyStride,
    samplingChecked: {}, samplingAgree: {}, samplingConservative: {}, samplingDangerous: [],
  };
  const tStart = now();
  // Memoised once per call, by exact (x, z) -- classifyAt/roadAllowedAt and
  // assessFootprint's own grid sampling repeatedly probe the SAME atom
  // centres from different code paths, and LandField's heightAt is not
  // free (noise octaves, not a lookup) -- pure function of (x, z) for one
  // LandField, so caching is exact, not approximate. CAPPED, not
  // unbounded: measured directly that board.js's own canPlace checks EVERY
  // foot cell of a piece individually (not a sample), so a single road
  // span's foot (tens of metres by the road's own width) alone can cost hundreds of
  // classifyAt calls, each calling slopeAt for four MORE heightAt calls at
  // distinct offsets that rarely repeat -- an uncapped Map hit V8's own
  // ~16.7M-entry ceiling and crashed mid-run before this cap existed. Most
  // of that volume genuinely does not repeat, so the cap trades away
  // caching's benefit past this size rather than trading away correctness.
  const cache = new Map();
  const CACHE_LIMIT = 2_000_000;
  const heightAt = (x, z) => {
    if (cache.size >= CACHE_LIMIT) { stats.heightAtRawCalls++; return heightAtRaw(x, z); }
    const key = `${x},${z}`;
    let v = cache.get(key);
    if (v === undefined) {
      v = heightAtRaw(x, z);
      cache.set(key, v);
      stats.heightAtRawCalls++;
    } else {
      stats.heightAtCacheHits++;
    }
    return v;
  };
  const board = createBoard({ heightAt });
  let t = now();
  const polysWorld = landmassPolygonsWorld();
  const boundaries = settlementBoundaries(polysWorld);
  stats.boundaryMs = now() - t;
  const pieces = [];

  for (const b of boundaries) {
    const rule = SETTLEMENT_TABLE[b.kind];
    if (b.oneHouse || rule.oneHouse) {
      pieces.push(...placeOneHouse(board, b.id, b.polygon, heightAt));
      continue;
    }

    let iMin = Infinity, iMax = -Infinity, jMin = Infinity, jMax = -Infinity;
    for (const [x, z] of b.polygon) {
      const { i, j } = atomOf(x, z);
      if (i < iMin) iMin = i; if (i > iMax) iMax = i;
      if (j < jMin) jMin = j; if (j > jMax) jMax = j;
    }

    t = now();
    const graph = junctionGraph(b.polygon, { iMin, iMax, jMin, jMax }, rule.blockAtoms, heightAt);
    stats.graphMs += now() - t;
    pieces.push(...placeRoadGraph(board, b.id, graph, heightAt, stats));

    // Blocks: the atom rectangle between four adjacent junction nodes,
    // whichever exist -- a block with a missing corner (coastline cut a
    // node out) is simply not built, not forced. The margin carved off each
    // side must be the SAME half-width placeRoadGraph() just built its own
    // road pieces at (ROAD_CLASS_DEFAULT, today) -- a second, independent
    // site computing it, not shared code, so it is checked for on its own
    // (see decision-5 step 2's own test in test/boardGenerator.test.ts).
    const blockHalfRoad = halfRoadFor(ROAD_CLASS_DEFAULT);
    for (let i = iMin; i + rule.blockAtoms <= iMax; i += rule.blockAtoms) {
      for (let j = jMin; j + rule.blockAtoms <= jMax; j += rule.blockAtoms) {
        const block = {
          iMin: i + blockHalfRoad + 1, iMax: i + rule.blockAtoms - blockHalfRoad,
          jMin: j + blockHalfRoad + 1, jMax: j + rule.blockAtoms - blockHalfRoad,
        };
        if (block.iMax <= block.iMin || block.jMax <= block.jMin) continue;
        pieces.push(...placeBlockBuildings(board, b.id, b.polygon, block, rule.plotAtoms, rule.levels, heightAt, stats));
      }
    }
  }

  stats.totalMs = now() - tStart;
  return { board, pieces, boundaries, stats };
}
