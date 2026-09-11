// =============================================================================
// THE BOARD, GENERATED ONCE, OFFLINE -- NOT IN A WORKER, NOT IN A REQUEST
//
// B2.6 (Mark, 2026-09-08): "The board is a pure function of the seed --
// already a stated property, pinned by SHA-256. Recomputing a pure function
// per visitor is doing work whose answer is already known." Same move as
// scripts/gen-city-summary.mjs already makes for generateWorld() (its own
// header: "The city cannot be generated inside the Worker... But it is
// DETERMINISTIC, so it can be summarised once, here, and checked in.") --
// applied to the real board this time, not a summary of it.
//
// B2.5 measured public/board-generator.js's own generateBoard() at
// ~40-113 s depending on this host's own memory pressure -- always well
// past Cloudflare's documented 30 s default Worker CPU-time ceiling
// (wrangler.jsonc has no override). That is not a number to chase with a
// faster machine; it is a platform boundary. This script is the fix:
// generation happens here, once, and the output is committed as a static
// asset the live page fetches -- see docs/specs/BOARD-REBUILD-PLAN.md's
// B2.6 section for the size measurement that picked that transport over KV.
//
// Regenerate with:
//
//     node scripts/gen-board.mjs
//
// or npm run gen:board -- both are the same command, so "the seed it
// claims to represent" cannot drift from what actually produced the file.
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = path.join(ROOT, "public");
const terrain = await import(pathToFileURL(path.join(P, "terrain.js")).href);
const generator = await import(pathToFileURL(path.join(P, "board-generator.js")).href);
const bridges = await import(pathToFileURL(path.join(P, "bridge-generator.js")).href);
const noise = await import(pathToFileURL(path.join(P, "noise.js")).href);

const seed = noise.DEFAULT_SEED;
const heightAt = terrain.makeHeightAt(new terrain.LandField(16));

console.log(`gen-board: generating for seed ${JSON.stringify(seed)} (useSampling: true) -- this is the ~40 s step, run here, not in a Worker...`);
const t0 = Date.now();
const G = generator.generateBoard(heightAt, seed, { useSampling: true });
console.log(`gen-board: generated ${G.pieces.length} pieces in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// B2.7: bridges and boat routes, placed onto the SAME board instance (so
// they are checked for occupancy against every road/plot/building already
// placed above), connecting the same settlement boundaries the generator
// itself just built.
const t1 = Date.now();
const crossings = bridges.buildCrossingPieces(G.boundaries, heightAt, G.board);
console.log(`gen-board: B2.7 crossings -- ${crossings.built.length} pieces (${crossings.built.filter((p) => p.pieceType === "bridge").length} bridges, ${crossings.built.filter((p) => p.pieceType === "dock").length} docks), ${crossings.refused.length} refused, in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
if (crossings.refused.length > 0) {
  console.error("gen-board: B2.7 refused crossings:", crossings.refused.map((r) => r.reason));
}
G.pieces.push(...crossings.built);

// SERIALISED SHAPE: pieces + boundaries only -- `board` (the live
// board.js instance) is not data, it is behaviour, and is reconstructed
// on load (public/board-load.js's own loadBoard()) by replaying these
// same pieces through board.js's real place(), with groundVerified:true
// (the ground question was already answered, once, here -- see that
// file's own header for why re-answering it on load would put the 40 s
// cost right back in the request path this whole file exists to avoid).
const payload = {
  seed,
  pieceCount: G.pieces.length,
  pieces: G.pieces,
  boundaries: G.boundaries,
};

const json = JSON.stringify(payload);
const rawBytes = Buffer.byteLength(json, "utf8");
const gz = zlib.gzipSync(json, { level: 9 });

console.log(`gen-board: serialised ${rawBytes.toLocaleString()} bytes raw, ${gz.length.toLocaleString()} bytes gzipped (${(100 * gz.length / rawBytes).toFixed(1)}%)`);

const outPath = path.join(P, "board.generated.json");
fs.writeFileSync(outPath, json);
console.log(`gen-board: wrote ${path.relative(ROOT, outPath)}`);
