// =============================================================================
// B2 GATE — the generator's own board, real coverage, real alignment
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.1 contract: settlement density
// follows each island's B1-assigned character (public/terrain.js's
// LANDMASSES `kind`, a table, not a uniform sprinkle filtered afterward);
// coverage is measured INSIDE explicit settlement boundaries, 20-40%, not
// world-wide (today's 3.82% is a world-wide fraction, which is why it went
// unnoticed for 96% of the land); total settled land 20-40 km²; grid
// alignment and origin stability BY CONSTRUCTION, asserted here rather than
// printed.
//
// WATCHED RED FIRST: public/board-generator.js does not exist yet at the
// point this file is written -- every test below fails on the import itself
// ("Cannot find module"), a real, valid red (test/run.mjs's own standing
// rule), not yet proof the numeric bands are real. That proof is the same
// two-step landCoverage.test.ts already used: once the generator exists,
// re-run this file against a deliberately broken generator (SETTLEMENT_TABLE
// zeroed, or the boundary inset removed) and confirm it goes red for the
// right reason, not just any reason.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { generateBoard, SETTLEMENT_TABLE, settlementBoundaries, sampledGroundOk } from "../public/board-generator.js";
import { USE } from "../public/land-use.js";
import { LandField, makeHeightAt, landmassPolygonsWorld } from "../public/terrain.js";
import { atomOf, atomOrigin, ATOM } from "../public/grid.js";
import { ROAD_STANDARDS } from "../public/roadkit.js";
import { stripSourceComments } from "./stripSourceComments.ts";

// Walk up from this file's own built location (test/.built/) to the repo
// root, the same technique terrainLandmassOwnership.test.ts's own
// repoRoot() uses, for the same reason (test/run.mjs's build step changes
// import.meta.url's depth relative to a fixed "../.." guess).
function repoRoot(): string {
  let dir = fileURLToPath(import.meta.url);
  for (let up = 0; up < 6; up++) {
    dir = join(dir, "..");
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
  }
  throw new Error("boardGenerator.test.ts: could not locate the repo root");
}
const SRC_DIR = join(repoRoot(), "src");

/** Shoelace, world m² -- the same measurement landCoverage.test.ts's own
 *  gate and terrain.js's own area-correction use, so a boundary's stated
 *  area and this test's own measurement of it cannot silently disagree. */
function polygonAreaM2(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

const heightAt = makeHeightAt(new LandField(16));
// useSampling: true -- B2.5 (Mark, 2026-09-08): the exhaustive per-cell
// ground check cost ~106 of ~111 s measured (public/board-generator.js's
// own profile). Proven equivalent to the exhaustive check first (100%
// agreement, zero disagreements in either direction, across every real
// road-span and building candidate this generator produces -- 11,538 +
// 39,118 = 50,656 candidates, at both stride 3 and stride 5), THEN
// adopted -- see this file's own performance gate below for the measured
// numbers and docs/specs/BOARD-REBUILD-PLAN.md's B2.5 section for the
// full derivation. Every OTHER gate in this file runs against this same
// sampled board, on purpose: the two are proven identical in output
// (same piece count, same coverage, same everything), so there is no
// reason to pay the exhaustive cost twice in one test run.
const G = generateBoard(heightAt, 0, { useSampling: true });

test("B2 gate: something real was generated, not an empty board", () => {
  assert.ok(G.pieces.length > 100, `expected a real, non-trivial board -- got ${G.pieces.length} pieces`);
  const roads = G.pieces.filter((p) => p.pieceType === "road").length;
  const buildings = G.pieces.filter((p) => p.pieceType === "building").length;
  assert.ok(roads > 0, "no road pieces at all");
  assert.ok(buildings > 0, "no building pieces at all");
});

test("decision-5 step 1: every road piece the generator places carries a real, current roadClass, and step 1 has not changed which one", () => {
  const roadPieces = G.pieces.filter((p) => p.pieceType === "road");
  assert.ok(roadPieces.length > 0, "no road pieces to check");
  for (const p of roadPieces) {
    assert.ok(
      ROAD_STANDARDS[p.roadClass],
      `road piece "${p.id}" has roadClass "${p.roadClass}", which is not a real, current ROAD_STANDARDS key`,
    );
  }
  // "which, not one of": every piece, not a sample -- a rollout that only
  // reached some of the three piece-construction sites in placeRoadGraph()
  // would still pass a test that checked only one piece or one axis.
  const classesUsed = new Set(roadPieces.map((p) => p.roadClass));
  assert.deepStrictEqual(
    [...classesUsed],
    ["STREET"],
    "step 1 only adds a class label -- it must not change which class every road piece reports, since no geometry has changed yet",
  );
});

test("decision-5 step 2: every road piece's narrow dimension is its own class's real ROAD_STANDARDS width, not a fixed constant", () => {
  const roadPieces = G.pieces.filter((p) => p.pieceType === "road");
  assert.ok(roadPieces.length > 0, "no road pieces to check");
  for (const p of roadPieces) {
    const std = ROAD_STANDARDS[p.roadClass];
    assert.ok(std, `road piece "${p.id}" has roadClass "${p.roadClass}", which is not a real, current ROAD_STANDARDS key`);
    // Junction pieces are foot.w === foot.d === the class width; span pieces
    // have one long dimension (block length) and one narrow one (the class
    // width) -- the narrow one is always the smaller of the two for every
    // real piece this generator places (checked: the shortest configured
    // blockAtoms, 57, still leaves spans far longer than any class's row).
    const narrow = Math.min(p.foot.w, p.foot.d);
    assert.equal(
      narrow, std.row,
      `road piece "${p.id}" (class ${p.roadClass}) has narrow dimension ${narrow}, expected ${std.row} (ROAD_STANDARDS.${p.roadClass}.row) -- still sized from a fixed constant, not its own class`,
    );
  }
});

// --- rawSourceScan's own gap, closed: the PRESENCE checks below (halfRoadFor(/
// roadWidthFor( must appear inside a sliced function body) matched raw,
// unstripped source. See test/rawSourceScan.test.ts's own history
// (2026-09-11).

test("(synthetic) the vulnerability: a comment mentioning halfRoadFor( must not stand in for a real call that was removed", () => {
  const fakeSrc =
    "function placeRoadGraph(board) {\n" +
    "  // used to call halfRoadFor(cls) and roadWidthFor(cls) here before a refactor\n" +
    "  return board;\n" +
    "}\n" +
    "function placeBlockBuildings() {}\n";
  const region = fakeSrc.slice(fakeSrc.indexOf("function placeRoadGraph"), fakeSrc.indexOf("function placeBlockBuildings"));
  // Raw, unstripped: the comment satisfies the regex even though the real
  // call is gone -- this is spanText/extractWorkerRoutes/countRenderer...'s
  // same defect shape, applied here to a presence-inside-a-region check.
  assert.ok(/halfRoadFor\(/.test(region), "sanity: the raw fixture's comment does satisfy the naive regex, confirming the vulnerability is real");
  // Fixed: strip comments first, then the same real call must be genuinely absent.
  const strippedRegion = stripSourceComments(fakeSrc).slice(fakeSrc.indexOf("function placeRoadGraph"), fakeSrc.indexOf("function placeBlockBuildings"));
  assert.ok(!/halfRoadFor\(/.test(strippedRegion), "a comment-only mention of halfRoadFor( was wrongly treated as a real call after stripping");
});

test("decision-5 step 2: board-generator.js sizes every road site from ROAD_STANDARDS -- no hardcoded road-width constant survives at any of the four sites", () => {
  // A static source scan, not a generated-output check: board.js's own
  // occupancy guard (canPlace/place, "NEVER skipped") means a building
  // candidate that would overlap a road is refused before it ever reaches
  // G.pieces, so no amount of inspecting PLACED pieces can tell a site that
  // reads the real class width apart from one that still reads a stale,
  // hardcoded half-width -- both produce a board with zero overlaps, by
  // construction, for different reasons. Reading the source directly is
  // what actually distinguishes "reads ROAD_STANDARDS" from "got lucky with
  // today's number".
  const src = stripSourceComments(readFileSync(join(repoRoot(), "public", "board-generator.js"), "utf8"));
  assert.ok(!/\bROAD_WIDTH\b/.test(src), "ROAD_WIDTH still appears in board-generator.js -- the module constant was not fully retired");
  assert.ok(!/\bHALF_ROAD\b/.test(src), "HALF_ROAD still appears in board-generator.js -- the module constant was not fully retired");
  // Two independent call sites, not a sample of a bigger set: placeRoadGraph()
  // computes its own road/junction footprints; generateBoard()'s own
  // block-carving loop computes the SAME margin separately, to carve the
  // interior buildings are placed in. Both must read the real class width --
  // missing either leaves one half of the board's own geometry (what a road
  // occupies, or what a block believes is left over once a road is carved
  // out of it) still keyed to whatever the stale site last held.
  const placeRoadGraphSrc = src.slice(src.indexOf("function placeRoadGraph"), src.indexOf("function placeBlockBuildings"));
  const generateBoardSrc = src.slice(src.indexOf("export function generateBoard"));
  assert.ok(/halfRoadFor\(/.test(placeRoadGraphSrc), "placeRoadGraph() does not call halfRoadFor() -- its own road/junction pieces are not sized from ROAD_STANDARDS");
  assert.ok(/roadWidthFor\(/.test(placeRoadGraphSrc), "placeRoadGraph() does not call roadWidthFor() -- its own road/junction pieces are not sized from ROAD_STANDARDS");
  assert.ok(/halfRoadFor\(/.test(generateBoardSrc), "generateBoard()'s own block-carving loop does not call halfRoadFor() -- block interiors are still carved against a stale margin");
});

test("B2 gate: settlement boundaries exist, one per settled landmass, derived from the real coastline", () => {
  assert.ok(G.boundaries.length >= 5, `expected several settled landmasses, got ${G.boundaries.length}`);
  const polysById = new Map(landmassPolygonsWorld().map((lm) => [lm.id, lm]));
  for (const b of G.boundaries) {
    const lm = polysById.get(b.id);
    assert.ok(lm, `boundary "${b.id}" does not match any real landmass`);
    assert.ok(SETTLEMENT_TABLE[lm.kind]?.settled, `"${b.id}" (${lm.kind}) is not marked settled in SETTLEMENT_TABLE, but has a boundary`);
    // The boundary must be a real inset, not the coastline itself or a
    // bounding box unrelated to it: every boundary vertex should fall
    // inside (or on) the landmass's own real polygon.
    const areaFraction = polygonAreaM2(b.polygon) / polygonAreaM2(lm.polygon);
    assert.ok(areaFraction > 0 && areaFraction <= 1.001,
      `"${b.id}"'s boundary area is ${(areaFraction * 100).toFixed(1)}% of its landmass's real area -- should be a real inset, (0, 1]`);
  }
});

test("B2 gate: settled land totals 20-40 km2, not world-wide coverage", () => {
  const totalM2 = G.boundaries.reduce((s, b) => s + polygonAreaM2(b.polygon), 0);
  const totalKm2 = totalM2 / 1e6;
  assert.ok(totalKm2 >= 20 && totalKm2 <= 40,
    `total settled land is ${totalKm2.toFixed(1)} km2, outside the 20-40 km2 target (docs/specs/BOARD-REBUILD-PLAN.md)`);
});

test("B2 gate: coverage is measured INSIDE each settlement boundary, 20-40%, not world-wide", () => {
  // Cottage islands are excluded on purpose: SETTLEMENT_TABLE marks them
  // `oneHouse`, exactly one building on the WHOLE island (a design decision,
  // not a density outcome -- see the "cottage islands carry exactly one
  // building" gate above), so a density percentage does not describe them.
  // Applying it here would fail every cottage island by construction, for a
  // property this generator was never asked to hold there.
  for (const b of G.boundaries) {
    if (SETTLEMENT_TABLE[b.kind]?.oneHouse) continue;
    const boundaryAreaM2 = polygonAreaM2(b.polygon);
    const built = G.pieces.filter((p) => p.boundaryId === b.id && (p.pieceType === "building" || p.pieceType === "road"));
    const builtAreaM2 = built.reduce((s, p) => {
      const { w, d } = p.rotation === 90 || p.rotation === 270 ? { w: p.foot.d, d: p.foot.w } : p.foot;
      return s + w * d;
    }, 0);
    const fraction = builtAreaM2 / boundaryAreaM2;
    assert.ok(fraction >= 0.2 && fraction <= 0.4,
      `"${b.id}" is ${(fraction * 100).toFixed(1)}% covered (buildings+roads / boundary area) -- outside the 20-40% target`);
  }
});

test("B2 gate: cottage islands carry exactly one building, because they are cottage islands, not because only one plot survived", () => {
  const cottageBoundaries = G.boundaries.filter((b) => SETTLEMENT_TABLE[b.kind]?.oneHouse);
  assert.ok(cottageBoundaries.length >= 3, `expected the three B1 cottage islands, got ${cottageBoundaries.length}`);
  for (const b of cottageBoundaries) {
    const buildings = G.pieces.filter((p) => p.boundaryId === b.id && p.pieceType === "building");
    assert.equal(buildings.length, 1, `"${b.id}" (cottage) has ${buildings.length} buildings, expected exactly 1`);
  }
});

test("B2 gate: wooded/sandbar/rock/skerry islands carry no settlement at all", () => {
  const unsettledKinds = Object.entries(SETTLEMENT_TABLE).filter(([, v]) => !v.settled).map(([k]) => k);
  assert.ok(unsettledKinds.includes("wooded"), "SETTLEMENT_TABLE dropped the wooded exclusion");
  const boundaryKinds = new Set(G.boundaries.map((b) => b.kind));
  for (const k of unsettledKinds) {
    assert.ok(!boundaryKinds.has(k), `a "${k}" landmass has a settlement boundary, but SETTLEMENT_TABLE marks that kind unsettled`);
  }
});

test("B2 gate: grid round-trip is 100% by construction -- every piece's cell is a real integer atom, not a snapped float", () => {
  let mismatches = 0;
  const sample = [];
  for (const p of G.pieces) {
    const origin = atomOrigin(p.cell.i, p.cell.j);
    const back = atomOf(origin.x, origin.z);
    if (back.i !== p.cell.i || back.j !== p.cell.j) {
      mismatches++;
      if (sample.length < 3) sample.push({ id: p.id, cell: p.cell, back });
    }
  }
  assert.equal(mismatches, 0,
    `${mismatches}/${G.pieces.length} pieces do not round-trip through atomOf/atomOrigin -- sample: ${JSON.stringify(sample)}`);
});

test("B2 gate: no piece straddles a fractional atom -- ATOM is 1 m, so this is the same claim as the round-trip, stated as a property of the data rather than derived from it", () => {
  for (const p of G.pieces) {
    assert.ok(Number.isInteger(p.cell.i) && Number.isInteger(p.cell.j) && Number.isInteger(p.cell.k),
      `piece "${p.id}" has a non-integral cell ${JSON.stringify(p.cell)}`);
  }
  assert.equal(ATOM, 1, "this test's whole premise is ATOM=1m; grid.js's own constant changed underneath it");
});

// B2.5 -- GENERATION TIME, ASSERTED, WITH A STATED CEILING AND A SOURCE.
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.5 (Mark, 2026-09-08): "the source
// is not a number I like -- it is what the page can afford before a
// visitor leaves. Derive it and say from what."
//
// THE SOURCE: wrangler.jsonc's own bindings (Durable Objects, KV,
// Vectorize, Workers AI) require a paid Cloudflare Workers account, whose
// documented DEFAULT CPU-time limit for a single Worker invocation is
// 30,000 ms -- not overridden anywhere in this repo (`grep limits
// wrangler.jsonc` finds nothing; no `limits.cpu_ms` block exists). This is
// not a UX guess about visitor patience; it is the harder, more directly
// relevant constraint underneath it: a request exceeding this does not
// lose a visitor slowly, it is killed by the platform outright. If a
// visitor-patience number were wanted instead, it would have to be
// SMALLER than this, not larger -- so 30 s is the outer bound either way.
//
// THIS GATE ASSERTS THE CEILING HONESTLY, NOT A NUMBER PICKED TO PASS. At
// the time this was written, real measurement on the development host
// (test/run.mjs, single process, paired against an unsampled baseline in
// the SAME run to control for this host's own memory-pressure noise --
// see B2.5's own section in docs/specs/BOARD-REBUILD-PLAN.md for the
// paired numbers) put sampled generation at roughly 35-42 s, ABOVE this
// 30 s ceiling more often than not. That is reported as a real, open
// finding, not hidden by loosening the assertion: this generator is not
// yet fast enough to run synchronously inside one live request, and the
// architecturally honest fix is what public/world.js's own LandField
// memoisation already does for the height field -- generate once per
// seed, persist, never regenerate live per visitor -- not a synchronous
// per-request budget this file could ever reliably hit on CPU time alone.
test("B2.5 gate: generation time, against Cloudflare's own default Worker CPU-time ceiling (30,000 ms, wrangler.jsonc has no override)", () => {
  const CEILING_MS = 30_000;
  const heightAtForTiming = makeHeightAt(new LandField(16));
  const timed = generateBoard(heightAtForTiming, 0, { useSampling: true });
  console.log(`B2.5: generateBoard({useSampling:true}) took ${timed.stats.totalMs.toFixed(0)} ms against a ${CEILING_MS} ms ceiling (Cloudflare Workers' own default CPU-time limit for a single invocation -- see this test's own header comment for the source and for why this is reported as a real, currently-failing measurement rather than a loosened assertion).`);
  assert.ok(
    timed.stats.totalMs < CEILING_MS,
    `generateBoard() took ${timed.stats.totalMs.toFixed(0)} ms, over the ${CEILING_MS} ms ceiling -- ` +
    `this is expected to be red until the board is generated once per seed and persisted (matching world.js's own LandField memoisation), not regenerated live per request; see docs/specs/BOARD-REBUILD-PLAN.md's B2.5 section`,
  );
});

// RUN3 C1: sampledGroundOk's full-perimeter scan is load-bearing -- a
// deterministic replacement for b2-5-sampled-ground-perimeter-is-load-
// bearing, which was previously verified by hand only (a real-archipelago
// disagreement count, no node:test assertion -- confirmed SURVIVED against
// the automated suite this run). This builds a synthetic heightAt with a
// single WATER atom placed exactly on the west edge, strictly between the
// footprint's own north/south rows and off the interior stride grid, so
// only the west/east perimeter scan (not the north/south scan, not the
// interior sample) can see it. slopeAt samples 24m either side of any
// point it is asked about; every atom this test queries is well inside
// that radius of every other, so the single WATER dip cannot distort a
// neighbour's own slope reading -- the water/beach checks that would
// classify it run on the exact queried point's own height, before slope
// is even computed.
test("RUN3 C1: sampledGroundOk's west/east perimeter scan catches a boundary the north/south scan and the interior stride grid both miss", () => {
  const iMin = 100, jMin = 100, w = 8, d = 8, stride = 3;
  const badI = iMin, badJ = jMin + 3; // west edge (di=0), strictly interior in dj (not 0, not d-1=7)
  assert.notEqual(badJ, jMin, "sanity: bad atom must not sit on the north row the other loop already covers");
  assert.notEqual(badJ, jMin + d - 1, "sanity: bad atom must not sit on the south row the other loop already covers");
  const badX = badI + 0.5, badZ = badJ + 0.5; // atomCentre(i, j) = (i+0.5, j+0.5), ATOM=1
  const heightAtSynthetic = (x: number, z: number) => (x === badX && z === badZ ? -5 : 10);

  const ok = sampledGroundOk(heightAtSynthetic, iMin, jMin, w, d, new Set([USE.BUILDABLE]), stride);
  assert.equal(ok, false, "a WATER atom sitting on the west edge must be caught by the full-perimeter scan -- if this is true, the perimeter scan did not actually run");
});

// B2.6 -- THE STRONGER GATE. KEPT ALONGSIDE THE TIMING GATE ABOVE, NOT IN
// PLACE OF IT (Mark, 2026-09-08: "KEEP THE RED CPU GATE. Do not delete it
// because generation moved offline. Change what it guards: the request
// path must not generate... That is a stronger gate than a time limit,
// and it cannot be satisfied by a faster machine.").
//
// The timing gate above measures a number that varies with the host and
// can be gamed by a faster machine or a lucky run. This one cannot: it
// reads src/ (the Worker's own live request-handling code, not
// public/ -- client-side/browser code is not subject to Cloudflare's own
// CPU-time limit at all, so it is out of scope for what this gate
// protects) and asserts no file there imports generateBoard from
// board-generator.js, by source, the same static technique
// terrainLandmassOwnership.test.ts already uses for city-plan.js's own
// LANDMASSES imports.
test("B2.6 gate: no file in src/ (the Worker's own live request path) imports generateBoard -- the request path must not generate", () => {
  const found: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(SRC_DIR);
  } catch (e) {
    throw new Error(`B2.6 gate: could not read src/ to check it -- ${e}`);
  }
  for (const f of entries) {
    if (!/\.(ts|js|mjs)$/.test(f)) continue;
    const src = readFileSync(join(SRC_DIR, f), "utf8");
    const m = src.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*board-generator(?:\.js)?["']/);
    if (m && /\bgenerateBoard\b/.test(m[1])) found.push(f);
  }
  assert.deepEqual(found, [],
    `src/ file(s) import generateBoard from board-generator.js: ${found.join(", ")} -- ` +
    `the board must be generated offline (scripts/gen-board.mjs) and loaded (public/board-load.js), never generated inside a live Worker request`);
});
