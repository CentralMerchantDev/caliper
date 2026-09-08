// Private helper for test/movePiece.test.ts (P4.4). Same isolated-child-
// process pattern as scripts/_isolate-probe.mjs and scripts/_board-adapter-
// probe.mjs, for the identical documented reason (a full 26 km world at
// module scope in the shared 130-file suite has crashed it with a V8 OOM
// before).
//
// THREE REAL CASES, per Mark's own brief ("test the refusal path first...
// an occupied destination and a destination whose footprint does not fit
// are two different refusals and should read differently"):
//
//   1. SUCCESS -- moved to real, genuinely free, real-ground-kind-matching
//      space nearby (found by trying tryMove() itself against a handful of
//      real candidate offsets, not invented coordinates).
//   2. REFUSED, reason "occupied" -- moved onto ANOTHER real building's own
//      exact cell.
//   3. REFUSED, reason "off-map" -- moved to a destination clearly outside
//      the world (grid.js's own inWorld refuses it before any ground/space
//      check runs at all).
import { generateWorld } from "../public/city-plan.js";
import { piecesFromWorld, boardPiecesById } from "../public/board-adapter.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { planCity } from "../public/layout.js";
import { assessFootprint } from "../public/footprint.js";
import { inWorld } from "../public/grid.js";
import { tryMove, moveEditFor } from "../public/move-piece.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const verdictFor = (plot) => {
  const b = plot.buildable || plot;
  return assessFootprint(heightAt, { xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax }).verdict;
};
const { placements } = planCity(world.blocks, world.plots, verdictFor);
const pieces = piecesFromWorld(world, placements);
const boardPieces = boardPiecesById(world, placements);
const buildings = pieces.filter((p) => p.id.startsWith("bld-"));

// --- 1. SUCCESS: find a building with a genuinely free nearby cell -------
const OFFSETS = [];
for (let r = 3; r <= 60; r += 3) {
  for (const [di, dj] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r]]) OFFSETS.push([di, dj]);
}
let successResult = null, successPlotId = null;
for (let i = 0; i < Math.min(300, buildings.length) && !successResult; i++) {
  const piece = buildings[i];
  const plotId = piece.id.slice("bld-".length);
  for (const [di, dj] of OFFSETS) {
    const dest = { i: piece.cell.i + di, j: piece.cell.j + dj };
    const r = tryMove(plotId, dest, boardPieces, { heightAt, inWorld });
    if (r.ok) { successResult = r; successPlotId = plotId; break; }
  }
}

// --- 2. REFUSED "occupied": move building A onto building B's own cell ---
const a = buildings[0];
const aPlotId = a.id.slice("bld-".length);
let occupiedResult = null;
for (let i = 1; i < buildings.length; i++) {
  const b = buildings[i];
  const r = tryMove(aPlotId, { i: b.cell.i, j: b.cell.j, rotation: b.rotation }, boardPieces, { heightAt, inWorld });
  if (!r.ok && r.reason === "occupied") { occupiedResult = r; break; }
  if (!r.ok && r.reason !== "occupied") continue; // ground mismatch -- try the next real building
}

// --- 3. REFUSED "off-map": destination clearly outside the world ---------
const offMapResult = tryMove(aPlotId, { i: 50_000_000, j: 50_000_000 }, boardPieces, { heightAt, inWorld });

// --- Refusal on an id that is not on the board at all ---------------------
const notFoundResult = tryMove("not-a-real-plot-id", { i: 0, j: 0 }, boardPieces, { heightAt, inWorld });

process.stdout.write(JSON.stringify({
  success: successResult ? {
    ok: true,
    plotId: successPlotId,
    destWorld: successResult.destWorld,
    edit: moveEditFor(successResult),
  } : null,
  occupied: occupiedResult ? { ok: false, reason: occupiedResult.reason, blockedBy: occupiedResult.blockedBy } : null,
  offMap: { ok: offMapResult.ok, reason: offMapResult.reason },
  notFound: { ok: notFoundResult.ok, reason: notFoundResult.reason },
}));
