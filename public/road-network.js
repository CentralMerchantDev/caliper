// =============================================================================
// THE ARTERIAL LAYER — settlement centres, connected, as piece chains
//
// BOARD-CONVERSION-PLAN.md P2.2/P2.3/P2.4: docs/specs/ROAD-HIERARCHY.md's
// hierarchy, actually laid out. Arterials connect settlement centres to
// each other and to the regional network (HIGHWAYS/FREEWAYS); junction
// class follows what meets what; the whole graph is connected BY
// CONSTRUCTION (a minimum spanning tree per landmass), which is what makes
// P2.4's "one connected component per landmass" gate true by design rather
// than by luck.
//
// WHY THESE ARE NEW PIECES, NOT roadkit.js's straight()/intersection4Way().
//
// PLACEMENT-CONTRACT.md Part 0 gives P2 a STANDARD width table (ALLEY/LANE
// 8, STREET 16, AVENUE 24, BOULEVARD 32, FREEWAY 64) -- Mark's own words,
// "not ROAD_STANDARDS' real values, and not a rounding: a deliberate
// standard". roadkit.js's straight()/intersection4Way()/etc are locked to
// ROAD_STANDARDS' REAL row widths (BOULEVARD 44 m, AVENUE 28 m, STREET
// 18 m) -- correctly so, per Part 0's OWN "what changes" table: "Widths
// return to ROAD_STANDARDS' real values" for the kit's existing pieces.
// Those two statements are not reconcilable by reusing the same functions:
// a BOULEVARD arterial built with roadkit.js's straight("BOULEVARD", n)
// would be 44 m wide, not the 32 m Part 0 asks P2 to lay out with.
//
// So this file builds its OWN minimal, standard-width piece family --
// straight segments and junctions, in the same {id, kind, footprint,
// sockets, lod} shape roadkit.js's pieces use, verified through the SAME
// shared functions (roadkit.js's transformSocket/verifySocketMating, not a
// second implementation) -- rather than either bending roadkit.js's real
// kit to a width it does not have, or writing a second verifier. Real
// simplification, named rather than hidden: these pieces have a plain box
// deck, no sidewalk/parking/tram strip detail roadkit.js's real pieces
// carry. Reconciling the two width systems into one piece family is real,
// unresolved work, left for a later pass -- not decided here.
// =============================================================================

import * as THREE from "three";
import { SETTLEMENTS, HIGHWAYS, FREEWAYS, settlementCentres, ISLAND, LANDMASSES } from "./city-plan.js";
import { transformSocket, verifySocketMating, ROAD_STANDARDS } from "./roadkit.js";
import { ROAD_GRADE } from "./grade.js";

/** PLACEMENT-CONTRACT.md Part 0's standard road widths -- the layout unit
 *  P2 lays arterials/collectors/locals out with. Not ROAD_STANDARDS' real
 *  values (see file header). */
export const STANDARD_WIDTH = { ALLEY: 8, LANE: 8, STREET: 16, AVENUE: 24, BOULEVARD: 32, FREEWAY: 64 };

const D2R = Math.PI / 180;

/** A straight standard-width road segment, roadkit-model-shaped. Lane
 *  count borrowed from ROAD_STANDARDS[cls] -- Part 0 only redefines width,
 *  not lane count. */
function standardStraight(cls, lengthM) {
  const width = STANDARD_WIDTH[cls] || STANDARD_WIDTH.STREET;
  const lanes = (ROAD_STANDARDS[cls] || ROAD_STANDARDS.STREET).lanes;
  const halfL = lengthM / 2;
  return {
    id: `arterial-straight-${cls.toLowerCase()}-${Math.round(lengthM)}m`,
    kind: "hard",
    roadClass: cls,
    footprint: { w: width, d: lengthM },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets: [
      { at: [0, 0, -halfL], bearing: 180, width, lanes, kind: "road" },
      { at: [0, 0, halfL], bearing: 0, width, lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: 12,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(width, 0.2, lengthM);
          deck.translate(0, 0.1, 0);
          return deck;
        },
      },
    ],
  };
}

/** The junction footprint's own half-size -- independent of how many arms
 *  meet there (only the class/width decides it), so a caller can trim an
 *  edge's own endpoint back to where the junction's socket will actually
 *  sit BEFORE building the junction itself. Same formula standardJunction()
 *  uses; kept as one function so the two cannot drift apart. */
function standardJunctionRadius(cls) {
  const width = STANDARD_WIDTH[cls] || STANDARD_WIDTH.STREET;
  return Math.max(width * 1.6, width + 16) / 2;
}

/** A junction where `armCount` standard-width legs of `cls` meet, one per
 *  bearing in `bearingsDeg`. Cardinal-agnostic -- arterial connections
 *  between settlement centres are not axis-aligned, so this places sockets
 *  at whatever real bearings the network graph gives it. */
function standardJunction(cls, bearingsDeg) {
  const width = STANDARD_WIDTH[cls] || STANDARD_WIDTH.STREET;
  const lanes = (ROAD_STANDARDS[cls] || ROAD_STANDARDS.STREET).lanes;
  const halfS = standardJunctionRadius(cls);
  const sizeM = halfS * 2;
  const sockets = bearingsDeg.map((bearing) => {
    const r = bearing * D2R;
    return { at: [Math.sin(r) * halfS, 0, Math.cos(r) * halfS], bearing, width, lanes, kind: "road" };
  });
  return {
    id: `arterial-junction-${cls.toLowerCase()}-${bearingsDeg.length}way`,
    kind: "hard",
    roadClass: cls,
    footprint: { w: sizeM, d: sizeM },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets,
    lod: [
      {
        level: 0,
        tris: 12,
        createGeometry: (T = THREE) => {
          const core = new T.BoxGeometry(sizeM, 0.25, sizeM);
          core.translate(0, 0.125, 0);
          return core;
        },
      },
    ],
  };
}

/**
 * Which junction piece for a node where `degree` legs of `cls` meet --
 * docs/specs/ROAD-HIERARCHY.md's junction table. Arterial x arterial with
 * 3+ legs reads as the "highest-order junction" case (a roundabout in the
 * real kit); this file's own standardJunction() has one shape for any
 * degree (a box with N sockets) since it does not attempt roundabout
 * geometry -- the DISTINCTION (which real roadkit.js piece a later pass
 * would render this as) is recorded on the node, not built here.
 */
function junctionKind(degree) {
  if (degree <= 1) return "terminus";
  if (degree === 2) return "through"; // not really a junction -- see filterThroughNodes
  if (degree === 3) return "intersection3Way";
  return "intersection4Way-or-roundabout"; // 4+: named, not resolved to a specific piece here
}

/** Chain standard-width straight segments between exactly two world points,
 *  turtle-graphics style (same technique as roadkit-street-demo.js's
 *  buildDemoStreet, P0), verified through roadkit.js's OWN
 *  transformSocket/verifySocketMating -- not a second implementation. */
function chainSingleLegRun(cls, ax, az, bx, bz, segmentM = 64) {
  const dx = bx - ax, dz = bz - az;
  const totalLen = Math.hypot(dx, dz);
  if (totalLen < 1e-6) return { placements: [], verification: [], totalLen: 0, bearing: 0, entrySocket0: null, exitSocketEnd: null };
  const bearing = ((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360;

  const segments = [];
  let remaining = totalLen;
  while (remaining > 1e-6) {
    const len = Math.min(segmentM, remaining);
    segments.push(len);
    remaining -= len;
  }

  let x = ax, z = az;
  const placements = [];
  const verification = [];
  let prevExitWorld = null;
  for (const len of segments) {
    const model = standardStraight(cls, len);
    const entrySock = model.sockets[0], exitSock = model.sockets[1];
    const rotY = bearing;
    const rotatedOnly = transformSocket(entrySock, { x: 0, z: 0, rotationDeg: rotY });
    const originX = x - rotatedOnly.at[0], originZ = z - rotatedOnly.at[2];
    placements.push({ model, x: originX, z: originZ, rotY });

    const entryWorld = transformSocket(entrySock, { x: originX, z: originZ, rotationDeg: rotY });
    if (prevExitWorld) {
      let error = null;
      try { verifySocketMating(prevExitWorld, entryWorld); } catch (e) { error = e.message; }
      verification.push({ ok: !error, error });
    }
    const exitWorld = transformSocket(exitSock, { x: originX, z: originZ, rotationDeg: rotY });
    prevExitWorld = exitWorld;
    x = exitWorld.at[0]; z = exitWorld.at[2];
  }
  return {
    placements, verification, totalLen, bearing,
    entrySocket0: placements[0] ? transformSocket(placements[0].model.sockets[0], { x: placements[0].x, z: placements[0].z, rotationDeg: placements[0].rotY }) : null,
    exitSocketEnd: prevExitWorld,
  };
}

/** Backward-compatible two-point wrapper -- most callers (regional ties,
 *  which do not attempt terrain-following) still just want A to B. */
function chainStraightRun(cls, ax, az, bx, bz, segmentM = 64) {
  return chainSingleLegRun(cls, ax, az, bx, bz, segmentM);
}

/**
 * Chain standard-width straight segments through an arbitrary multi-point
 * waypoint path. A REAL BEND JOINT AT EVERY INTERIOR WAYPOINT, not a bare
 * abutment -- found necessary by measurement, not assumed: a straight
 * piece's two end faces are always parallel (it is a straight box), so
 * two straight pieces meeting at different headings can never satisfy
 * verifySocketMating's bearing-opposition check directly. First attempt
 * skipped this and produced 70 "bearing not opposed" failures the moment
 * terrain-following actually bent a route. The fix reuses the SAME
 * standardJunction() piece the graph's own settlement-centre junctions
 * use, sized for 2 legs, trimmed back by its own radius on each side --
 * exactly the pattern already proven at graph nodes, applied one level
 * further in, at every kink the router introduces. `bearing` on the
 * return value is the FIRST leg's heading, for the node's own
 * junction-socket bearing. */
function chainWaypointRun(cls, points, segmentM = 64) {
  if (points.length < 2) return { placements: [], verification: [], totalLen: 0, bearing: 0, entrySocket0: null, exitSocketEnd: null };
  if (points.length === 2) return chainSingleLegRun(cls, points[0][0], points[0][1], points[1][0], points[1][1], segmentM);

  const radius = standardJunctionRadius(cls);
  const legBearing = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    legBearing.push(((Math.atan2(bx - ax, bz - az) * 180) / Math.PI + 360) % 360);
  }
  const bendAngle = (b1, b2) => Math.abs(((b1 - b2 + 540) % 360) - 180);

  const placements = [];
  const verification = [];
  let totalLen = 0;
  let firstBearing = null;
  let prevExitWorld = null;
  let entrySocket0 = null;

  for (let leg = 0; leg < points.length - 1; leg++) {
    let [ax, az] = points[leg];
    let [bx, bz] = points[leg + 1];
    const dx0 = bx - ax, dz0 = bz - az;
    const len0 = Math.hypot(dx0, dz0);
    const ux = len0 > 1e-6 ? dx0 / len0 : 0, uz = len0 > 1e-6 ? dz0 / len0 : 0;

    const bendsAtStart = leg > 0 && bendAngle(legBearing[leg - 1], legBearing[leg]) > 1e-3;
    const bendsAtEnd = leg < points.length - 2 && bendAngle(legBearing[leg], legBearing[leg + 1]) > 1e-3;
    const maxTrim = Math.max(len0 - 1e-3, 0) / 2;
    const ts = bendsAtStart ? Math.min(radius, maxTrim) : 0;
    const te = bendsAtEnd ? Math.min(radius, maxTrim) : 0;
    const sax = ax + ux * ts, saz = az + uz * ts;
    const sbx = bx - ux * te, sbz = bz - uz * te;

    const legRun = chainSingleLegRun(cls, sax, saz, sbx, sbz, segmentM);
    placements.push(...legRun.placements);
    verification.push(...legRun.verification);
    totalLen += legRun.totalLen;
    if (firstBearing === null && legRun.bearing !== undefined) firstBearing = legRun.bearing;
    if (!entrySocket0 && legRun.entrySocket0) entrySocket0 = legRun.entrySocket0;

    if (bendsAtStart && prevExitWorld && legRun.entrySocket0) {
      // The kink junction sits at the route's own (untrimmed) waypoint --
      // both adjoining legs were trimmed back to meet it exactly there.
      const [jx, jz] = points[leg];
      const junctionModel = standardJunction(cls, [(legBearing[leg - 1] + 180) % 360, legBearing[leg]]);
      const socketBack = transformSocket(junctionModel.sockets[0], { x: jx, z: jz, rotationDeg: 0 });
      const socketFwd = transformSocket(junctionModel.sockets[1], { x: jx, z: jz, rotationDeg: 0 });
      let err1 = null, err2 = null;
      try { verifySocketMating(prevExitWorld, socketBack); } catch (e) { err1 = e.message; }
      try { verifySocketMating(socketFwd, legRun.entrySocket0); } catch (e) { err2 = e.message; }
      verification.push({ ok: !err1, error: err1 }, { ok: !err2, error: err2 });
      placements.push({ model: junctionModel, x: jx, z: jz, rotY: 0 });
    } else if (prevExitWorld && legRun.entrySocket0) {
      let error = null;
      try { verifySocketMating(prevExitWorld, legRun.entrySocket0); } catch (e) { error = e.message; }
      verification.push({ ok: !error, error });
    }
    if (legRun.exitSocketEnd) prevExitWorld = legRun.exitSocketEnd;
  }

  return { placements, verification, totalLen, bearing: firstBearing ?? 0, entrySocket0, exitSocketEnd: prevExitWorld };
}

/**
 * Real max slope along a straight line from (ax,az) to (bx,bz), sampled
 * every ~40 m -- the same probe this file's own grade-finding pass uses,
 * factored out so the router can ask the identical question the gate does.
 */
function worstGradeAlong(heightAt, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 1e-6) return 0;
  const steps = Math.max(2, Math.round(len / 40));
  let worst = 0;
  let prevH = heightAt(ax, az);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const h = heightAt(ax + (bx - ax) * t, az + (bz - az) * t);
    worst = Math.max(worst, Math.abs(h - prevH) / (len / steps));
    prevH = h;
  }
  return worst;
}

/**
 * TERRAIN-FOLLOWING ROUTING. A straight line's average grade can hide a
 * short, genuinely too-steep stretch (this file's own first measurement:
 * one barrier-crescent edge averaged 100.7%). Real roads climb by taking
 * a LONGER path -- more horizontal run for the same rise, which is
 * exactly what grade (rise/run) responds to. This recursively displaces a
 * segment's own midpoint sideways (perpendicular to its direct line),
 * trying several offsets each side, keeping whichever most reduces the
 * WORST sampled slope across the two resulting halves, and recurses on
 * each half up to a depth limit. NOT a real engineering router (no true
 * shortest-feasible-path search, e.g. A* over the height field) -- a
 * bounded heuristic, honestly named as one. `maxDepth` bounds it to at
 * most 2^maxDepth sub-segments per original edge.
 */
function routeTerrainFollowing(heightAt, ax, az, bx, bz, maxGrade, maxDepth = 5, depth = 0) {
  const direct = worstGradeAlong(heightAt, ax, az, bx, bz);
  if (direct <= maxGrade || depth >= maxDepth) return [[ax, az], [bx, bz]];

  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len;
  const perpX = -uz, perpZ = ux; // rotate 90 deg
  const midX = (ax + bx) / 2, midZ = (az + bz) / 2;

  let best = { grade: direct, mx: midX, mz: midZ };
  for (const frac of [0.15, 0.3, 0.45]) {
    for (const side of [1, -1]) {
      const offset = len * frac * side;
      const mx = midX + perpX * offset, mz = midZ + perpZ * offset;
      const g1 = worstGradeAlong(heightAt, ax, az, mx, mz);
      const g2 = worstGradeAlong(heightAt, mx, mz, bx, bz);
      const worst = Math.max(g1, g2);
      if (worst < best.grade) best = { grade: worst, mx, mz };
    }
  }
  if (best.mx === midX && best.mz === midZ && best.grade === direct) {
    // No lateral offset helped at all (e.g. a genuine cliff, any detour
    // this search tried is just as steep) -- stop here rather than
    // recurse forever finding nothing.
    return [[ax, az], [bx, bz]];
  }
  const left = routeTerrainFollowing(heightAt, ax, az, best.mx, best.mz, maxGrade, maxDepth, depth + 1);
  const right = routeTerrainFollowing(heightAt, best.mx, best.mz, bx, bz, maxGrade, maxDepth, depth + 1);
  return [...left.slice(0, -1), ...right]; // left's own endpoint === right's own start
}

/**
 * Trim a routed waypoint path's first and last leg back by a junction's
 * own radius -- ALONG THAT LEG'S OWN DIRECTION, not the original straight
 * A-to-B bearing. Found necessary the hard way: trimming along the direct
 * bearing while the router had already bent the first leg away from it
 * left the junction's own socket (built at the CORRECT, bent bearing)
 * sitting somewhere the trimmed road never actually reached -- the exact
 * same class of position mismatch the untrimmed-centre-to-centre version
 * hit originally, one level further in. Route first (on the true
 * endpoints), THEN trim each end by its own real direction -- not the
 * other order, which is what created this bug.
 */
function trimRouteForJunctions(waypoints, radiusFrom, radiusTo) {
  if (waypoints.length < 2) return waypoints;
  const pts = waypoints.map((p) => [...p]);
  const firstLegLen = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  if (radiusFrom > 0 && firstLegLen > 1e-6) {
    const t = Math.min(radiusFrom / firstLegLen, 0.9); // never trim past 90% of a too-short first leg
    pts[0] = [pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t];
  }
  const n = pts.length;
  const lastLegLen = Math.hypot(pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]);
  if (radiusTo > 0 && lastLegLen > 1e-6) {
    const t = Math.min(radiusTo / lastLegLen, 0.9);
    pts[n - 1] = [pts[n - 1][0] + (pts[n - 2][0] - pts[n - 1][0]) * t, pts[n - 1][1] + (pts[n - 2][1] - pts[n - 1][1]) * t];
  }
  return pts;
}

/** Prim's algorithm -- straight-line Euclidean distance, connecting every
 *  node into ONE tree. Minimal by construction: exactly N-1 edges for N
 *  nodes, which is the fewest a connected graph can have. A real network
 *  would add redundant loops on top; this file only guarantees P2.4's
 *  "one connected component" property, not redundancy -- named, not
 *  claimed as more than it is. */
function minimumSpanningTree(nodes) {
  if (nodes.length <= 1) return [];
  const inTree = new Set([0]);
  const edges = [];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  while (inTree.size < nodes.length) {
    let best = null;
    for (const i of inTree) {
      for (let j = 0; j < nodes.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(nodes[i], nodes[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    inTree.add(best.j);
    edges.push({ from: best.i, to: best.j, distM: best.d });
  }
  return edges;
}

/** Nearest point on any regional HIGHWAYS/FREEWAYS span to (x, z) -- the
 *  "connects to the regional network" half of P2.1's rule. Spans are
 *  {axis, at, from, to}; the nearest point on a span is a clamp along its
 *  own axis. */
function nearestRegionalPoint(x, z) {
  let best = null;
  for (const r of [...HIGHWAYS, ...FREEWAYS]) {
    const lo = Math.min(r.from, r.to), hi = Math.max(r.from, r.to);
    let px, pz;
    if (r.axis === "ew") { px = Math.max(lo, Math.min(hi, x)); pz = r.at; }
    else { px = r.at; pz = Math.max(lo, Math.min(hi, z)); }
    const d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = { x: px, z: pz, d, roadId: r.id };
  }
  return best;
}

/** Evenly-spaced centres along a bounding box's longer axis -- the same
 *  rule settlementCentres() applies to a settlement's own bounds, reused
 *  here for landmasses that carry no SETTLEMENTS entry at all. */
function boundsCentres(bounds, spacingM = 1600) {
  const w = bounds.xMax - bounds.xMin, d = bounds.zMax - bounds.zMin;
  const n = Math.max(1, Math.round(Math.max(w, d) / spacingM));
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    out.push(w >= d
      ? { x: bounds.xMin + u * w, z: (bounds.zMin + bounds.zMax) / 2 }
      : { x: (bounds.xMin + bounds.xMax) / 2, z: bounds.zMin + u * d });
  }
  return out;
}

/** Evenly-spaced centres along a landmass polygon's own perimeter, by arc
 *  length -- for a thin, curved landmass (the barrier crescent) a bounding
 *  box's centre line cuts across open water; walking the traced coastline
 *  itself stays on the landmass. Not a true skeleton/centreline -- a
 *  documented approximation, not claimed as more than one. */
function polygonPerimeterCentres(points, spacingM = 1600) {
  const segLen = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, az] = points[i], [bx, bz] = points[(i + 1) % points.length];
    const l = Math.hypot(bx - ax, bz - az);
    segLen.push(l);
    total += l;
  }
  const n = Math.max(1, Math.round(total / spacingM));
  const out = [];
  for (let i = 0; i < n; i++) {
    let target = (total * (i + 0.5)) / n;
    let seg = 0;
    while (target > segLen[seg] && seg < segLen.length - 1) { target -= segLen[seg]; seg++; }
    const [ax, az] = points[seg], [bx, bz] = points[(seg + 1) % points.length];
    const t = segLen[seg] > 0 ? target / segLen[seg] : 0;
    out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t });
  }
  return out;
}

/** downtown and barrier carry no SETTLEMENTS entry -- confirmed directly
 *  (SETTLEMENTS.map(s => s.landmass) never includes either), not assumed.
 *  downtown is generated through a separate path (buildCityPlan()) keyed
 *  off ISLAND's own bounds; barrier's settlements are generated from its
 *  traced polygon (barrierSettlements(), inside generateWorld(), not
 *  exported) rather than declared. Both get real centres here from their
 *  own landmass geometry so P2.4's "every landmass" gate can mean every
 *  landmass, not just the 9 with a SETTLEMENTS entry. */
function extraLandmassCentres() {
  const out = new Map();
  out.set("downtown", boundsCentres(ISLAND));
  const barrier = LANDMASSES.find((l) => l.id === "barrier");
  if (barrier && barrier.points) out.set("barrier", polygonPerimeterCentres(barrier.points));
  return out;
}

/**
 * Build the arterial layer: one MST per landmass over that landmass's
 * settlement centres, each edge a chained, socket-verified BOULEVARD run,
 * plus a tie-in from the tree's own closest node to the nearest regional
 * road. Returns per-landmass results and a flat list of every join's
 * verification (P2.2's gate).
 */
export function buildArterialNetwork({ heightAt = null } = {}) {
  const byLandmass = new Map();
  for (const s of SETTLEMENTS) {
    const centres = settlementCentres(s);
    for (let i = 0; i < centres.length; i++) {
      const list = byLandmass.get(s.landmass) || [];
      list.push({ x: centres[i].x, z: centres[i].z, settlementId: s.id, centreIndex: i });
      byLandmass.set(s.landmass, list);
    }
  }
  for (const [landmass, centres] of extraLandmassCentres()) {
    const list = byLandmass.get(landmass) || [];
    for (let i = 0; i < centres.length; i++) {
      list.push({ x: centres[i].x, z: centres[i].z, settlementId: landmass, centreIndex: i });
    }
    byLandmass.set(landmass, list);
  }

  const landmasses = [];
  let allVerification = [];
  for (const [landmass, nodes] of byLandmass) {
    const mstEdges = minimumSpanningTree(nodes);
    const degree = new Array(nodes.length).fill(0);
    for (const e of mstEdges) { degree[e.from]++; degree[e.to]++; }
    // Node 0 (the tree's anchor) also carries the regional tie-in below,
    // which is one more leg at that node -- decided here, before any edge
    // is trimmed, so a leaf node that only reaches degree 2 BECAUSE of its
    // regional tie still gets a junction and its neighbours still trim
    // against it. Looked up once, not computed twice.
    const regionalNear = nodes.length > 0 ? nearestRegionalPoint(nodes[0].x, nodes[0].z) : null;
    if (regionalNear) degree[0]++;
    // A node with 2+ legs gets a real junction piece (below), which has its
    // OWN footprint radius -- the connecting road must stop there, not run
    // through to the node's raw centre point. Precomputed before any edge
    // is built, not after: an edge trimmed against a radius decided later
    // would need rebuilding, and building it twice is exactly the kind of
    // thing this project's own LESSONS.md exists to catch.
    const junctionRadius = degree.map((d) => (d >= 2 ? standardJunctionRadius("BOULEVARD") : 0));

    const edgeRuns = [];
    const gradeFindings = [];
    const nodeSockets = nodes.map(() => []); // per node: [{bearing away from node, worldSocket the chain presents}]
    for (const e of mstEdges) {
      const a = nodes[e.from], b = nodes[e.to];

      // TERRAIN-FOLLOWING FIRST, on the true node-to-node endpoints, THEN
      // trim each end back by its own junction's radius along whatever
      // direction the route actually leaves in. Trimming a straight A-to-B
      // line BEFORE routing (the original version) meant the junction's
      // own socket -- built at the route's real first-leg bearing -- no
      // longer lined up with where the trimmed road actually started,
      // once that first leg bent. Route, then trim; not the other order.
      const fullRoute = heightAt
        ? routeTerrainFollowing(heightAt, a.x, a.z, b.x, b.z, ROAD_GRADE.BOULEVARD.maxGrade)
        : [[a.x, a.z], [b.x, b.z]];
      const waypoints = trimRouteForJunctions(fullRoute, junctionRadius[e.from], junctionRadius[e.to]);

      const run = chainWaypointRun("BOULEVARD", waypoints);
      allVerification = allVerification.concat(run.verification.map((v) => ({ ...v, landmass, from: e.from, to: e.to })));
      edgeRuns.push({ from: e.from, to: e.to, distM: e.distM, pieceCount: run.placements.length, bearing: run.bearing, waypointCount: waypoints.length });
      if (run.entrySocket0) nodeSockets[e.from].push({ bearing: run.bearing, socket: run.entrySocket0 });
      if (run.exitSocketEnd) nodeSockets[e.to].push({ bearing: (run.exitSocketEnd.bearing + 180) % 360, socket: run.exitSocketEnd });

      if (heightAt) {
        // Measured against the ACTUAL routed path (every leg of
        // `waypoints`), not the original straight line -- routing only
        // means something if the gate checks what was actually built.
        let maxGrade = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
          maxGrade = Math.max(maxGrade, worstGradeAlong(heightAt, waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1]));
        }
        if (maxGrade > ROAD_GRADE.BOULEVARD.maxGrade) {
          gradeFindings.push({ from: e.from, to: e.to, maxGrade, limit: ROAD_GRADE.BOULEVARD.maxGrade, waypointCount: waypoints.length });
        }
      }
    }

    // Tie to the regional network from the tree's own lowest-index node
    // (arbitrary but deterministic) -- "connects... to the regional
    // network", P2.1. `regionalNear` was already looked up above, when
    // node 0's junction radius needed to know about it.
    let regionalTie = null;
    if (regionalNear) {
      const anchor = nodes[0];
      const dx = regionalNear.x - anchor.x, dz = regionalNear.z - anchor.z;
      const len = Math.hypot(dx, dz);
      const ux = len > 1e-6 ? dx / len : 0, uz = len > 1e-6 ? dz / len : 0;
      const sax = anchor.x + ux * junctionRadius[0], saz = anchor.z + uz * junctionRadius[0];
      const run = chainStraightRun("BOULEVARD", sax, saz, regionalNear.x, regionalNear.z);
      allVerification = allVerification.concat(run.verification.map((v) => ({ ...v, landmass, regionalTie: true })));
      regionalTie = { toRoadId: regionalNear.roadId, distM: regionalNear.d, pieceCount: run.placements.length };
      if (run.entrySocket0) nodeSockets[0].push({ bearing: run.bearing, socket: run.entrySocket0 });
    }

    // P2.3: a real junction piece at every node where 2+ legs meet -- "zero
    // implicit crossings". degree() and junctionKind() label WHAT KIND of
    // junction the node reads as (docs/specs/ROAD-HIERARCHY.md's table);
    // this builds the piece and verifies it against every leg's own end
    // socket through the shared P0 verifier, not a second implementation.
    const junctions = [];
    for (let i = 0; i < nodes.length; i++) {
      const legs = nodeSockets[i];
      if (legs.length < 2) continue; // a terminus (1 leg) or an isolated node (0) needs no junction piece
      const bearings = legs.map((l) => l.bearing);
      const junctionModel = standardJunction("BOULEVARD", bearings);
      const junctionResults = [];
      for (let li = 0; li < legs.length; li++) {
        const jSocket = transformSocket(junctionModel.sockets[li], { x: nodes[i].x, z: nodes[i].z, rotationDeg: 0 });
        let error = null;
        try { verifySocketMating(jSocket, legs[li].socket); } catch (e2) { error = e2.message; }
        junctionResults.push({ ok: !error, error });
      }
      allVerification = allVerification.concat(junctionResults.map((v) => ({ ...v, landmass, junctionNode: i })));
      junctions.push({ node: i, legCount: legs.length, kind: junctionKind(legs.length), model: junctionModel, x: nodes[i].x, z: nodes[i].z, allOk: junctionResults.every((v) => v.ok) });
    }

    landmasses.push({
      landmass,
      nodeCount: nodes.length,
      nodes,
      edges: edgeRuns,
      degree,
      junctionKinds: degree.map(junctionKind),
      junctions,
      gradeFindings,
      regionalTie,
    });
  }

  return { landmasses, verification: allVerification };
}
