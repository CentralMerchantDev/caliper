// Private helper for test/boardAdapter.test.ts (BOARD-CONVERSION-PLAN.md
// P1.1/P1.5). Builds ONE full 26 km world, runs every check the test file
// needs against it, and reports a small JSON summary -- not the world, not
// even the full piece list -- back over stdout.
//
// WHY THE CHECKS RUN HERE AND NOT IN THE TEST PROCESS: building the world
// even ONCE at module scope in test/run.mjs's shared process (~110 other
// bundled test files' own world-builds already resident by the time this
// file's tests run) reliably crashed the whole suite with a V8 OOM
// ("Committing semi space failed"), watched three times, with different
// exit codes (134, 127, 127) -- including after the SECOND build (P1.5's)
// was already moved to its own child process. The remaining, and it turned
// out necessary, fix: the FIRST build cannot live in the shared process
// either. Measured directly: `node scripts/_board-adapter-probe.mjs` alone,
// in its own process, completes in a few seconds with no memory pressure at
// all. The problem was never this script's own logic; it was one process
// holding a 26 km world's worth of state for the remaining lifetime of a
// 110-file test run.
import { createHash } from "node:crypto";
import { generateWorld } from "../public/city-plan.js";
import { piecesFromWorld } from "../public/board-adapter.js";
import { atomOf, atomOrigin } from "../public/grid.js";
import { planCity } from "../public/layout.js";
import { assessFootprint } from "../public/footprint.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const verdictFor = (plot) => {
  const b = plot.buildable || plot;
  return assessFootprint(heightAt, { xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax }).verdict;
};
const { placements } = planCity(world.blocks, world.plots, verdictFor);
const pieces = piecesFromWorld(world, placements);

// P1.1 -- every field present and integral.
const fieldViolations = [];
for (const p of pieces) {
  const bad = [];
  if (typeof p.id !== "string" || !p.id) bad.push("id");
  if (typeof p.pieceType !== "string" || !p.pieceType) bad.push("pieceType");
  if (!p.cell || !Number.isInteger(p.cell.i) || !Number.isInteger(p.cell.j) || !Number.isInteger(p.cell.k)) bad.push("cell");
  if (![0, 90, 180, 270].includes(p.rotation)) bad.push("rotation");
  if (!Number.isInteger(p.foot?.w) || p.foot.w <= 0) bad.push("foot.w");
  if (!Number.isInteger(p.foot?.d) || p.foot.d <= 0) bad.push("foot.d");
  if (!Number.isInteger(p.levels) || p.levels < 1) bad.push("levels");
  if (!Number.isInteger(p.clear?.w) || p.clear.w < 0) bad.push("clear.w");
  if (!Number.isInteger(p.clear?.d) || p.clear.d < 0) bad.push("clear.d");
  if (!Array.isArray(p.standsOn) || p.standsOn.length === 0) bad.push("standsOn");
  if (typeof p.surface !== "string" || !p.surface) bad.push("surface");
  if (bad.length) fieldViolations.push({ id: p.id, bad });
}

// P1.1 -- every id globally unique.
const seenIds = new Set();
const duplicateIds = [];
for (const p of pieces) {
  if (seenIds.has(p.id)) duplicateIds.push(p.id);
  seenIds.add(p.id);
}

// P1.1 -- plot cells round-trip through atomOf/atomOrigin unchanged. ATOM
// (1 m), not the old CELL (8 m) -- PLACEMENT-CONTRACT.md Part 0.
const plotMismatches = [];
for (const p of world.plots) {
  const cell = atomOf(p.xMin, p.zMin);
  const back = atomOrigin(cell.i, cell.j);
  if (back.x !== p.xMin || back.z !== p.zMin) {
    plotMismatches.push({ id: p.id, xMin: p.xMin, zMin: p.zMin, roundTripped: back });
  }
}

// P1.1 -- road span along-axis anchors, measured (not a gate -- see the test file).
const roadsNoBridge = world.roads.filter((r) => !r.bridge);
let roadAligned = 0;
for (const r of roadsNoBridge) {
  const lo = Math.min(r.from, r.to);
  const cell = r.axis === "ew" ? atomOf(lo, 0) : atomOf(0, lo);
  const back = r.axis === "ew" ? atomOrigin(cell.i, 0).x : atomOrigin(0, cell.j).z;
  if (back === lo) roadAligned++;
}

// P3.1 -- buildings: present, and no two overlap each other or an unbuilt
// plot's own "plot" piece. Grid-bucketed (32x32 atoms), same technique
// scripts/measure-roads.mjs-style checks use elsewhere in this project --
// exact pairwise (O(n^2)) is too slow at 17k+ building pieces.
const buildingPieces = pieces.filter((p) => p.id.startsWith("bld-"));
const plotPieces = pieces.filter((p) => p.pieceType === "plot");
function rectOf(p) { return { i0: p.cell.i, j0: p.cell.j, i1: p.cell.i + p.foot.w, j1: p.cell.j + p.foot.d }; }
function overlaps(a, b) { return a.i0 < b.i1 && a.i1 > b.i0 && a.j0 < b.j1 && a.j1 > b.j0; }
const BUCKET = 32;
// Bucket the PIECE, not a freshly-built rect -- comparing rects by object
// identity for self-exclusion silently failed the first version of this
// check, because the same piece's rect is rebuilt independently in the
// outer and inner loops, so `other === r` never matched even for a piece
// checked against itself, and inflated the count several thousand-fold.
// Compare piece identity instead.
function countOverlaps(as, bs) {
  const buckets = new Map();
  for (const p of bs) {
    const r = rectOf(p);
    for (let bi = Math.floor(r.i0 / BUCKET); bi <= Math.floor((r.i1 - 1) / BUCKET); bi++) {
      for (let bj = Math.floor(r.j0 / BUCKET); bj <= Math.floor((r.j1 - 1) / BUCKET); bj++) {
        const k = `${bi}_${bj}`;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(p);
      }
    }
  }
  let count = 0;
  for (const p of as) {
    const r = rectOf(p);
    const seen = new Set();
    for (let bi = Math.floor(r.i0 / BUCKET); bi <= Math.floor((r.i1 - 1) / BUCKET); bi++) {
      for (let bj = Math.floor(r.j0 / BUCKET); bj <= Math.floor((r.j1 - 1) / BUCKET); bj++) {
        for (const other of buckets.get(`${bi}_${bj}`) || []) {
          if (other === p || seen.has(other)) continue;
          seen.add(other);
          if (overlaps(r, rectOf(other))) { count++; break; }
        }
      }
    }
  }
  return count;
}
const buildingSelfOverlaps = countOverlaps(buildingPieces, buildingPieces) / 2; // each pair counted from both sides
const buildingPlotOverlaps = countOverlaps(buildingPieces, plotPieces);

// P1.5 -- digest + ids, for the caller to compare against a second, equally
// isolated build (see the test file: it spawns this script twice).
const digest = createHash("sha256").update(JSON.stringify(pieces)).digest("hex");

process.stdout.write(JSON.stringify({
  pieceCount: pieces.length,
  fieldViolations: fieldViolations.slice(0, 20),
  fieldViolationCount: fieldViolations.length,
  duplicateIds: duplicateIds.slice(0, 20),
  duplicateIdCount: duplicateIds.length,
  plotMismatches: plotMismatches.slice(0, 5),
  plotMismatchCount: plotMismatches.length,
  plotCount: world.plots.length,
  roadAligned, roadTotal: roadsNoBridge.length,
  buildingCount: buildingPieces.length,
  placementCount: placements.length,
  refusedCount: placements.filter((p) => p.refused).length,
  buildingSelfOverlaps,
  buildingPlotOverlaps,
  digest,
  ids: pieces.map((p) => p.id),
}));
