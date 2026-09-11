// =============================================================================
// B2.7 GATE — bridges and boat routes connect the 12 settled boundaries
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.7 section (95cf588, blind-reviewed
// and corrected): adapt scripts/gen-bridges.mjs's nearest-gap/MST/redundant-
// edge algorithm to the real B1 archipelago's 12 settled boundaries, classify
// each edge at roadkit.js's own real 800 m buildable ceiling (NOT the old
// world's 9,000 m "plausible" cutoff), emit real board.js pieces.
//
// WATCHED RED FIRST: public/bridge-generator.js does not exist yet at the
// point this file is written -- every test below fails on the import itself
// ("Cannot find module"), the same standing rule every other B2 gate file
// used (test/boardGenerator.test.ts, test/landCoverage.test.ts).
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  crossingGraph,
  classifyCrossing,
  buildCrossingPieces,
  BRIDGE_MAX_SPAN_M,
} from "../public/bridge-generator.js";
import { settlementBoundaries } from "../public/board-generator.js";
import { createBoard } from "../public/board.js";
import { ROAD_STANDARDS } from "../public/roadkit.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { atomOf } from "../public/grid.js";
import { classifyAt, roadAllowedAt, USE } from "../public/land-use.js";

const land = new LandField(16);
const heightAt = makeHeightAt(land);
const boundaries = settlementBoundaries();

function repoRoot(): string {
  let dir = fileURLToPath(import.meta.url);
  for (let up = 0; up < 6; up++) {
    dir = join(dir, "..");
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

function inPolygon(x: number, z: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const hit = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

// -----------------------------------------------------------------------------
// The graph itself
// -----------------------------------------------------------------------------

test("B2.7 gate: the crossing graph reaches every one of the 12 settled boundaries in one connected component", () => {
  const graph = crossingGraph(boundaries);
  assert.equal(boundaries.length, 12, `expected 12 settled boundaries (B2.2/B2.3's own measured count), got ${boundaries.length} -- the world changed, or this pin is stale`);
  const parent = new Map(boundaries.map((b) => [b.id, b.id]));
  const find = (x: string): string => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
  for (const e of graph.edges) {
    const ra = find(e.aId), rb = find(e.bId);
    if (ra !== rb) parent.set(ra, rb);
  }
  const roots = new Set(boundaries.map((b) => find(b.id)));
  assert.equal(roots.size, 1, `expected one connected component over the crossing graph, got ${roots.size} -- some boundary is unreachable`);
});

test("B2.7 gate: the connectivity check actually walks the graph -- dropping one boundary's own edge strands it", () => {
  const graph = crossingGraph(boundaries);
  // Mutation-in-place, in the test itself, proving the check above has teeth:
  // remove every edge touching the boundary with the fewest connections (the
  // one most likely to be a leaf of the MST, so dropping it is guaranteed to
  // strand something rather than merely removing a redundant edge).
  const degree = new Map<string, number>();
  for (const e of graph.edges) {
    degree.set(e.aId, (degree.get(e.aId) || 0) + 1);
    degree.set(e.bId, (degree.get(e.bId) || 0) + 1);
  }
  const leaf = [...degree.entries()].sort((a, b) => a[1] - b[1])[0][0];
  const prunedEdges = graph.edges.filter((e) => e.aId !== leaf && e.bId !== leaf);
  const parent = new Map(boundaries.map((b) => [b.id, b.id]));
  const find = (x: string): string => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
  for (const e of prunedEdges) {
    const ra = find(e.aId), rb = find(e.bId);
    if (ra !== rb) parent.set(ra, rb);
  }
  const roots = new Set(boundaries.map((b) => find(b.id)));
  assert.ok(roots.size >= 2, `expected pruning ${leaf}'s own edges to strand at least one component, got ${roots.size} component(s) -- the graph has a redundant path this test did not account for, or the connectivity check is not really sensitive to a missing edge`);
});

test("B2.7 gate: classifyCrossing splits at roadkit.js's own real 800 m buildable ceiling, not the old world's 9,000 m 'plausible' cutoff", () => {
  assert.equal(BRIDGE_MAX_SPAN_M, 800, "expected the imported ceiling to be 800 m -- roadkit.js's own bridgeSpan() engineering limit, not a number invented for this file");
  assert.equal(classifyCrossing({ d: 799 }), "bridge");
  assert.equal(classifyCrossing({ d: 800 }), "bridge");
  assert.equal(classifyCrossing({ d: 801 }), "boat");
  assert.equal(classifyCrossing({ d: 9000 }), "boat", "9,000 m must NOT classify as a bridge -- that was the old world's wrong-question cutoff this plan's own review corrected");
});

// -----------------------------------------------------------------------------
// The real pieces
// -----------------------------------------------------------------------------

test("B2.7 gate: every bridge and every dock lands on dry, road-legal ground belonging to the boundary it serves", () => {
  const board = createBoard({ heightAt });
  const { built } = buildCrossingPieces(boundaries, heightAt, board);
  assert.ok(built.length > 0, "expected at least one built piece (bridge or dock) for a graph connecting 12 boundaries");
  for (const piece of built) {
    if (piece.pieceType !== "bridge" && piece.pieceType !== "dock") continue;
    const anchors = piece.pieceType === "bridge" ? piece.anchors : [piece.anchor];
    for (const a of anchors) {
      const c = classifyAt(heightAt, a.x, a.z, null);
      assert.ok(c.use === USE.BUILDABLE, `${piece.id}'s own anchor at (${a.x}, ${a.z}) is "${c.use}", not dry buildable ground`);
      assert.ok(roadAllowedAt(heightAt, a.x, a.z).ok, `${piece.id}'s own anchor at (${a.x}, ${a.z}) is not road-legal ground`);
      const boundary = boundaries.find((b) => b.id === a.boundaryId)!;
      assert.ok(inPolygon(a.x, a.z, boundary.polygon), `${piece.id}'s own anchor at (${a.x}, ${a.z}) is outside ${a.boundaryId}'s own boundary polygon -- the exact mechanism-1 bug (both ends landing on the mainland) this plan's own dry-anchor walk exists to prevent`);
    }
  }
});

test("B2.7 gate: no duplicate dock ids -- a boundary with routes to two partners gets two distinct docks", () => {
  const board = createBoard({ heightAt });
  const { built } = buildCrossingPieces(boundaries, heightAt, board);
  const docks = built.filter((p) => p.pieceType === "dock");
  const ids = docks.map((p) => p.id);
  assert.equal(ids.length, new Set(ids).size, "expected every dock id to be unique -- board.js's own place() would have refused a duplicate outright");
});

test("B2.7 gate: the route relationship lives ON the dock piece itself, inside the board -- not a separate table beside it", () => {
  const board = createBoard({ heightAt });
  const { built } = buildCrossingPieces(boundaries, heightAt, board);
  const docks = built.filter((p) => p.pieceType === "dock");
  if (docks.length === 0) return; // no boat routes were needed on this run -- nothing to check
  for (const d of docks) {
    assert.ok(typeof d.routeTo === "string" && d.routeTo, `${d.id} is missing its own routeTo field`);
    assert.ok(typeof d.routeId === "string" && d.routeId, `${d.id} is missing its own routeId field`);
    const partner = docks.find((x) => x.id === d.routeTo);
    assert.ok(partner, `${d.id}'s own routeTo ("${d.routeTo}") does not name a real dock piece`);
    assert.equal(partner!.routeTo, d.id, `${d.id} and its partner ${d.routeTo} must point at each other`);
  }
});

test("B2.7 gate: a refused bridge candidate redirects to a boat route rather than silently dropping the connection", () => {
  const board = createBoard({ heightAt });
  const { built, refused, graph } = buildCrossingPieces(boundaries, heightAt, board);
  // Every edge in the graph must be represented by SOMETHING (a bridge, a
  // pair of docks, or an honest refusal with a reason) -- never silently
  // absent, per this plan's own "what happens to a gap that later refuses"
  // section.
  const accountedFor = new Set<string>();
  for (const p of built) {
    if (p.pieceType === "bridge") accountedFor.add(p.edgeKey);
    if (p.pieceType === "dock") accountedFor.add(p.edgeKey);
  }
  for (const r of refused) accountedFor.add(r.edgeKey);
  for (const e of graph.edges) {
    const key = [e.aId, e.bId].sort().join("|");
    assert.ok(accountedFor.has(key), `edge ${key} is not represented in built or refused -- a silently dropped connection`);
  }
});

test("B2.7 gate: the REAL BUILT pieces -- not just the abstract graph -- connect all 12 boundaries, zero refused", () => {
  // Distinct from "the crossing graph reaches every boundary" above, which
  // proves the MST's own structure is connected by construction and would
  // stay green even if every single edge failed to become a real piece.
  // This is the property that actually matters: does what got PLACED
  // connect everything, with nothing silently refused.
  const board = createBoard({ heightAt });
  const { built, refused } = buildCrossingPieces(boundaries, heightAt, board);
  assert.equal(refused.length, 0, `expected zero refused crossings, got ${refused.length}: ${refused.map((r) => r.reason).join("; ")}`);
  const parent = new Map(boundaries.map((b) => [b.id, b.id]));
  const find = (x: string): string => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
  for (const p of built) {
    if (p.pieceType === "bridge") {
      const [aId, bId] = p.anchors.map((a: any) => a.boundaryId);
      const ra = find(aId), rb = find(bId);
      if (ra !== rb) parent.set(ra, rb);
    }
  }
  // Docks connect via their shared routeId -- two dock pieces with the same
  // routeId are the two ends of one real, built boat route.
  const byRoute = new Map<string, string[]>();
  for (const p of built) {
    if (p.pieceType !== "dock") continue;
    (byRoute.get(p.routeId) || byRoute.set(p.routeId, []).get(p.routeId)!).push(p.anchor.boundaryId);
  }
  for (const [aId, bId] of byRoute.values()) {
    const ra = find(aId), rb = find(bId);
    if (ra !== rb) parent.set(ra, rb);
  }
  const roots = new Set(boundaries.map((b) => find(b.id)));
  assert.equal(roots.size, 1, `expected the REAL BUILT pieces to connect all 12 boundaries into one component, got ${roots.size}`);
});

test("B2.7 gate: a bridge candidate the BOARD refuses (occupied cell) redirects to a real boat route -- exercised on the real archipelago, not a synthetic stand-in", () => {
  // Learn the one real bridge's own footprint on a fresh board, then
  // pre-occupy exactly that footprint on a SECOND fresh board before
  // building -- board.place() must now refuse the bridge for a real
  // reason (not simulated), forcing the exact fallback branch this test
  // targets to actually execute.
  const boardA = createBoard({ heightAt });
  const before = buildCrossingPieces(boundaries, heightAt, boardA);
  const realBridge = before.built.find((p) => p.pieceType === "bridge");
  assert.ok(realBridge, "expected at least one real bridge on the default archipelago to occupy and re-test against");

  const boardB = createBoard({ heightAt });
  const occupier = {
    id: "test-occupier", pieceType: "building", cell: realBridge.cell, rotation: 0,
    foot: realBridge.foot, levels: 1, clear: { w: 0, d: 0 },
    standsOn: [USE.WATER, USE.BUILDABLE, USE.BEACH], surface: "roof",
  };
  const occupied = boardB.place(occupier, { groundVerified: true });
  assert.ok(occupied.ok, "expected the pre-occupier to place cleanly on a fresh board");

  const after = buildCrossingPieces(boundaries, heightAt, boardB);
  assert.equal(after.built.filter((p) => p.pieceType === "bridge").length, 0, "expected the occupied bridge candidate to build ZERO bridges");
  assert.equal(after.refused.length, 0, "expected the occupied bridge candidate to be redirected to a boat route, not left refused");
  assert.ok(after.built.filter((p) => p.pieceType === "dock").length > before.built.filter((p) => p.pieceType === "dock").length, "expected MORE dock pieces after the bridge was redirected to a boat route");
});

test("decision-5 step 4: every real bridge deck is the SAME width as the road pieces it connects to, not a fixed constant of its own", () => {
  // board-generator.js's placeRoadGraph() places every road piece uniformly
  // at ROAD_CLASS_DEFAULT ("STREET", test/boardGenerator.test.ts's own
  // "decision-5 step 1" test guards that this stays true) -- so agreement
  // with "the road pieces it connects to" and agreement with
  // ROAD_STANDARDS.STREET.row are the same claim today. Dock footprints are
  // NOT part of this claim -- checked directly, they are a fixed 4x4,
  // unrelated to road width.
  const board = createBoard({ heightAt });
  const { built } = buildCrossingPieces(boundaries, heightAt, board);
  const bridges = built.filter((p) => p.pieceType === "bridge");
  assert.ok(bridges.length > 0, "expected at least one real bridge on the default archipelago to check");
  for (const p of bridges) {
    const narrow = Math.min(p.foot.w, p.foot.d);
    assert.equal(
      narrow, ROAD_STANDARDS.STREET.row,
      `bridge "${p.id}" has narrow dimension ${narrow}, expected ${ROAD_STANDARDS.STREET.row} (ROAD_STANDARDS.STREET.row) -- still sized from a fixed constant, not the class the roads it connects to are built at`,
    );
  }
});

test("B2.7 gate: grid alignment by construction -- every bridge/dock cell is an integer atom index", () => {
  const board = createBoard({ heightAt });
  const { built } = buildCrossingPieces(boundaries, heightAt, board);
  for (const piece of built) {
    if (piece.pieceType !== "bridge" && piece.pieceType !== "dock") continue;
    assert.ok(Number.isInteger(piece.cell.i) && Number.isInteger(piece.cell.j), `${piece.id}'s own cell is not an integer atom index`);
  }
});

test("B2.7 gate: origin stability -- the crossing graph's own edges do not depend on any landform-derived offset", () => {
  // The same property B2.1/B2.3 already proved for settlementBoundaries()
  // itself: the crossing graph is built ONLY from boundary polygons (already
  // proven origin-stable) and roadAllowedAt/classifyAt (heightAt-dependent,
  // which B2.3 already distinguishes from a coordinate-origin dependency).
  // Asserted here as "no boundary id in the graph names a boundary absent
  // from settlementBoundaries()'s own output" -- a real, mechanical check
  // that the graph is derived FROM the boundary list, not from some second,
  // independently-computed set of positions.
  const graph = crossingGraph(boundaries);
  const ids = new Set(boundaries.map((b) => b.id));
  for (const e of graph.edges) {
    assert.ok(ids.has(e.aId) && ids.has(e.bId), `edge references a boundary id (${e.aId}/${e.bId}) not present in settlementBoundaries()'s own output`);
  }
});

// -----------------------------------------------------------------------------
// THE DELIVERED ASSET, NOT A FRESH ONE -- found 2026-09-10 by a blind Codex
// review: every test above builds its own board with createBoard() and
// proves buildCrossingPieces() works against it. None of them ever open
// public/board.generated.json, the file public/board-load.js::fetchBoard()
// actually serves to a visitor. Codex found that the committed asset had
// 17,728 roads, 17,637 buildings, and ZERO bridges or docks -- the generator
// worked, its output never reached the file that ships. This is the gate
// that would have caught it: it reads the COMMITTED file, not a fixture, so
// it can only pass if the real, delivered board actually contains crossings.
// -----------------------------------------------------------------------------

test("GATE: the COMMITTED public/board.generated.json -- the file a visitor actually loads -- contains real crossing pieces, not just a generator that can produce them", () => {
  const payload = JSON.parse(readFileSync(join(ROOT, "public", "board.generated.json"), "utf8"));
  const pieces = payload.pieces;
  assert.ok(Array.isArray(pieces) && pieces.length > 30000, `expected tens of thousands of real pieces in the committed board, got ${Array.isArray(pieces) ? pieces.length : typeof pieces} -- reading the wrong file, or the committed board is not what it claims to be`);

  const bridges = pieces.filter((p: any) => p.pieceType === "bridge");
  const docks = pieces.filter((p: any) => p.pieceType === "dock");

  // NOT "at least 1 bridge": buildCrossingPieces() is placed onto the SAME
  // board instance generateBoard() already filled with roads and buildings
  // (gen-board.mjs's own comment: real occupancy, not a fresh fixture). On
  // the real archipelago the one bridge-classified edge's own candidate cell
  // collided with an already-placed piece, board.place() refused it, and the
  // documented fallback rule (tested above, "a refused bridge candidate
  // redirects to a boat route") correctly redirected it to docks instead --
  // measured directly, this run: 0 bridges, 16 docks. A future regeneration
  // legitimately could produce 0 or 1+ bridges depending on where roads and
  // buildings land; asserting an exact bridge count here would be asserting
  // a coincidence, not a control. What must always be true is that SOME real
  // crossing pieces exist -- that is the actual defect this gate exists to
  // catch.
  const crossingCount = bridges.length + docks.length;
  assert.ok(crossingCount > 0, `expected real crossing pieces (bridge and/or dock) in the committed board -- got 0 bridges and 0 docks, which is the exact defect Codex found: the generator works, but its output never reached the delivered asset`);
  assert.ok(docks.length >= 1, `expected at least 1 dock piece in the committed board, got ${docks.length}`);
});

// -----------------------------------------------------------------------------
// A DEEPER, RELATED FINDING -- surfaced while fixing the defect above, not
// itself the thing Codex named. crossingGraph()/buildCrossingPieces() are
// proven (above, against a FRESH board) to connect all 12 settled boundaries
// with zero refusals. Against the REAL, already-occupied board that
// gen-board.mjs actually places crossings onto, that is not what happens:
// each of the 12 boundaries is a leaf on exactly one edge in three cases
// (farm-isle, quarry-isle, resort-isle), and for each of those three, THAT
// boundary's own dock -- the only crossing piece that would have given it
// any egress at all -- collided with a real building or road and was
// refused. The other end of each of those three routes built fine, so the
// route exists in the data, but nobody standing on farm-isle, quarry-isle,
// or resort-isle has anywhere to board a boat: zero crossing pieces sit on
// their own territory. This is the SAME category of gap as the one above
// (a property proven on a fresh fixture, not proven on delivery) one level
// deeper: the fixed gate now correctly reports "crossings exist," which is
// true and was the literal defect, but does not claim "every settled
// boundary has one," because on the real committed board that is currently
// false. Recorded honestly, watched red, not silently strengthened or
// hidden -- docs/DECISIONS-FOR-MARK.md #7.
// -----------------------------------------------------------------------------

test("GATE (currently RED, named -- docs/DECISIONS-FOR-MARK.md #7): every one of the 12 settled boundaries has at least one real crossing piece on its own territory in the COMMITTED board.generated.json", () => {
  const payload = JSON.parse(readFileSync(join(ROOT, "public", "board.generated.json"), "utf8"));
  const boundaryIds: string[] = payload.boundaries.map((b: any) => b.id);
  assert.equal(boundaryIds.length, 12, `expected 12 settled boundaries in the committed board's own boundaries field, got ${boundaryIds.length}`);

  const covered = new Set<string>();
  for (const p of payload.pieces) {
    if (p.pieceType === "dock" && p.anchor?.boundaryId) covered.add(p.anchor.boundaryId);
    if (p.pieceType === "bridge" && Array.isArray(p.anchors)) for (const a of p.anchors) if (a.boundaryId) covered.add(a.boundaryId);
  }
  const missing = boundaryIds.filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], `expected every settled boundary to have its own crossing piece; missing egress on: ${missing.join(", ")} -- each is a leaf boundary whose only crossing edge had its own-side dock refused by real occupancy, with no retry. Real, current, tracked in docs/DECISIONS-FOR-MARK.md #7 -- not fixed by this gate.`);
});
