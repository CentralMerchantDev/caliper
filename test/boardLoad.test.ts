// =============================================================================
// B2.6 GATE — a persisted board loads back byte-identical to what generated it
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.6: "the load path asserted end to
// end -- a persisted board deserialises to a board byte-identical to what
// generation produced. Watched red by corrupting one piece."
//
// public/board.generated.json is scripts/gen-board.mjs's own committed
// output (regenerate with `npm run gen:board`). This file checks it
// against a FRESH generateBoard() call, so drift between the committed
// artefact and the generator that is supposed to produce it is caught the
// same way test/publicClaims.test.ts already catches drift in the public
// page's own numbers -- not assumed in sync because the file exists.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { generateBoard } from "../public/board-generator.js";
import { buildCrossingPieces } from "../public/bridge-generator.js";
import { loadBoard } from "../public/board-load.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { DEFAULT_SEED } from "../public/noise.js";

// test/run.mjs builds this file into test/.built/, so import.meta.url does
// not sit one level above public/ the way it would from test/ itself --
// walk up looking for the real public/ directory instead of assuming a
// fixed depth (the same technique test/originStability.test.ts's own
// findPublic() already uses, for the same reason).
function findPublic(): string {
  let dir = fileURLToPath(import.meta.url);
  for (let i = 0; i < 6; i++) {
    dir = join(dir, "..");
    const candidate = join(dir, "public");
    try {
      if (readFileSync(join(candidate, "board-generator.js"))) return candidate;
    } catch {}
  }
  throw new Error("boardLoad.test.ts: could not find public/ by walking up from import.meta.url");
}
const PERSISTED_PATH = join(findPublic(), "board.generated.json");

const heightAt = makeHeightAt(new LandField(16));
const persistedRaw = readFileSync(PERSISTED_PATH, "utf8");
const persisted = JSON.parse(persistedRaw);
// The same two-step pipeline scripts/gen-board.mjs itself runs -- generate,
// then place B2.7's crossings onto the SAME board instance -- not
// generateBoard() alone. Before B2.7 existed this distinction was invisible
// (there was nothing to add); once the committed asset genuinely started
// carrying bridge/dock pieces (2026-09-10, closing the defect a blind Codex
// review found), comparing against generateBoard() alone made this gate
// falsely report drift on a byte-identical file -- fixed here rather than
// pinning the comparison back to a pre-crossings state.
const fresh = generateBoard(heightAt, DEFAULT_SEED, { useSampling: true });
const freshCrossings = buildCrossingPieces(fresh.boundaries, heightAt, fresh.board);
fresh.pieces.push(...freshCrossings.built);

test("B2.6 gate: the committed board.generated.json matches the seed it claims -- no drift between the artefact and the generator", () => {
  assert.equal(persisted.seed, DEFAULT_SEED, "public/board.generated.json's own seed field does not match noise.js's DEFAULT_SEED -- regenerate with npm run gen:board");
  assert.equal(persisted.pieces.length, fresh.pieces.length,
    `public/board.generated.json has ${persisted.pieces.length} pieces, a fresh generateBoard() call produces ${fresh.pieces.length} -- stale, regenerate with npm run gen:board`);
  assert.deepEqual(persisted.pieces, fresh.pieces,
    "public/board.generated.json's pieces are not byte-identical to a fresh generateBoard() call -- stale, regenerate with npm run gen:board");
  assert.deepEqual(persisted.boundaries, fresh.boundaries,
    "public/board.generated.json's boundaries are not byte-identical to a fresh generateBoard() call -- stale, regenerate with npm run gen:board");
});

test("B2.6 gate: loadBoard() reconstructs a real board.js instance from the persisted payload, byte-identical to what generated it", () => {
  const loaded = loadBoard(persisted, heightAt);
  assert.equal(loaded.pieces.length, fresh.pieces.length, "loadBoard() placed a different number of pieces than generateBoard() produced");
  assert.deepEqual(
    loaded.pieces.map((p) => p.id).sort(),
    fresh.pieces.map((p) => p.id).sort(),
    "loadBoard()'s own piece ids do not match generateBoard()'s",
  );
  // The loaded BOARD (not just the piece list) answers real queries the
  // same way -- whereIs on a real id, picked from the fresh generation,
  // must resolve on the loaded board too.
  const sampleId = fresh.pieces[Math.floor(fresh.pieces.length / 2)].id;
  const loadedPiece = loaded.board.whereIs(sampleId);
  const freshPiece = fresh.pieces.find((p) => p.id === sampleId);
  assert.ok(loadedPiece, `loaded board's whereIs("${sampleId}") found nothing`);
  assert.deepEqual(loadedPiece, freshPiece, `loaded board's own copy of "${sampleId}" does not match the fresh one`);
});

test("B2.6 gate: WATCHED RED -- a corrupted persisted piece produces a board that does not match a fresh generation", () => {
  const corrupted = JSON.parse(persistedRaw);
  const target = corrupted.pieces[100];
  const originalI = target.cell.i;
  target.cell.i = originalI + 500; // move it somewhere else entirely
  const loadedCorrupt = loadBoard(corrupted, heightAt);
  const corruptPiece = loadedCorrupt.board.whereIs(target.id);
  const freshPiece = fresh.pieces.find((p) => p.id === target.id);
  assert.ok(freshPiece, "sanity: the corrupted piece's id exists in the fresh generation");
  assert.notEqual(corruptPiece.cell.i, freshPiece.cell.i,
    "corrupting a persisted piece's cell.i did not produce a mismatch against the fresh generation -- the equivalence check has no teeth");
});
