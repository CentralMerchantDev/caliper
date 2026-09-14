// =============================================================================
// PLACEMENT — REBUILD-PLAN.md C2.2 (Tier 1) and C2.5 (save format). The
// brief's own gates: "RED is a removal that comes back" (C2.5), and C2.3's
// "the ghost and the commit call the same function."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAreaBoard } from "../public/area-board.js";
import { createPlacementSession, loadBoard, SAVE_SCHEMA_VERSION } from "../public/placement.js";

const CATALOGUE = {
  "kiosk-a": { footprint: [1, 1], terrainMask: ["land"] },
  "house-a": { footprint: [2, 3], terrainMask: ["land"] },
};

function session() {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  return { board, session: createPlacementSession({ board }) };
}

// ---------------------------------------------------------------- C2.2 tier 1

test("palette -> ghost: setGhost previews validity without touching the board", () => {
  const { board, session: s } = session();
  const ghost = s.setGhost("kiosk-a", { x: 2, y: 2 }, 0);
  assert.equal(ghost.valid, true);
  assert.equal(board.pieceIdAt(2, 2), -1, "a ghost must not occupy the board");
});

test("an invalid ghost names WHY, not just that it failed", () => {
  const { board, session: s } = session();
  board.place("kiosk-a", { x: 2, y: 2 }, 0, { id: 1 });
  const ghost = s.setGhost("kiosk-a", { x: 2, y: 2 }, 0);
  assert.equal(ghost.valid, false);
  assert.equal(ghost.reason, "occupied");
});

test("GATE (C2.2 item 3): commit is INERT on an invalid ghost -- refused, and the board is untouched", () => {
  const { board, session: s } = session();
  board.place("kiosk-a", { x: 2, y: 2 }, 0, { id: 1 });
  s.setGhost("kiosk-a", { x: 2, y: 2 }, 0); // occupied -> invalid
  const before = board.pieces().length;
  const result = s.commit();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "inert");
  assert.equal(board.pieces().length, before, "an inert click must not place anything");
});

test("commit with no ghost set at all is refused, not a crash", () => {
  const { session: s } = session();
  const result = s.commit();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no-ghost");
});

test("a valid ghost commits, and clears itself once committed", () => {
  const { board, session: s } = session();
  s.setGhost("kiosk-a", { x: 3, y: 3 }, 0);
  const result = s.commit();
  assert.equal(result.ok, true);
  assert.equal(board.pieceIdAt(3, 3), result.id);
  assert.equal(s.getGhost(), null);
});

test("cancel drops the ghost and never touches the board", () => {
  const { board, session: s } = session();
  s.setGhost("kiosk-a", { x: 3, y: 3 }, 0);
  s.cancel();
  assert.equal(s.getGhost(), null);
  assert.equal(board.pieces().length, 0);
});

test("GATE (C2.3): the ghost's verdict and the commit's outcome always agree -- proven across valid, occupied, out-of-bounds and unknown-type", () => {
  const { board, session: s } = session();
  board.place("kiosk-a", { x: 5, y: 5 }, 0, { id: 1 });
  const cases = [
    { typeId: "kiosk-a", anchorCell: { x: 1, y: 1 }, rotation: 0 }, // valid
    { typeId: "kiosk-a", anchorCell: { x: 5, y: 5 }, rotation: 0 }, // occupied
    { typeId: "house-a", anchorCell: { x: 9, y: 9 }, rotation: 0 }, // out of bounds (2x3 at the edge)
    { typeId: "no-such-type", anchorCell: { x: 2, y: 2 }, rotation: 0 }, // unknown
  ];
  for (const c of cases) {
    const ghost = s.setGhost(c.typeId, c.anchorCell, c.rotation);
    const outcome = s.commit();
    assert.equal(outcome.ok, ghost.valid, `mismatch for ${JSON.stringify(c)}`);
    // commit()'s own refusal reason is always the generic "inert" (C2.2 item
    // 3's own word for it); the UNDERLYING cause the ghost already computed
    // must still be the one named inside it -- not a second, independently
    // reasoned refusal that could disagree with the ghost's own verdict.
    if (!ghost.valid) assert.match(outcome.detail, new RegExp(ghost.reason));
  }
});

test("remove: a player-placed piece is simply gone, no tombstone recorded", () => {
  const { board, session: s } = session();
  s.setGhost("kiosk-a", { x: 4, y: 4 }, 0);
  const placed = s.commit();
  const removed = s.remove(placed.id);
  assert.equal(removed.ok, true);
  assert.equal(board.pieceIdAt(4, 4), -1);
  assert.equal(s.tombstones().length, 0);
});

test("remove: a GENERATED piece's removal records a tombstone at its anchor cell", () => {
  const { board, session: s } = session();
  board.place("kiosk-a", { x: 6, y: 6 }, 0, { id: 50, origin: "generated" });
  const removed = s.remove(50);
  assert.equal(removed.ok, true);
  assert.deepEqual(s.tombstones(), [6 * 10 + 6]);
});

test("removing an id that does not exist is refused, not a silent no-op", () => {
  const { session: s } = session();
  const result = s.remove(999);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-found");
});

// ---------------------------------------------------------------- C2.5 save format

test("serialize never includes a generated piece in placements -- only what the player actually did", () => {
  const { board, session: s } = session();
  board.place("kiosk-a", { x: 1, y: 1 }, 0, { id: 1, origin: "generated" });
  s.setGhost("house-a", { x: 3, y: 3 }, 0);
  s.commit();
  const save = s.serialize({ seed: "abc", generatorParams: { density: 0.5 } });
  assert.equal(save.placements.length, 1);
  assert.equal(save.placements[0].typeId, "house-a");
});

test("a player placement survives a save/load round trip with no generator at all", () => {
  const { board, session: s } = session();
  s.setGhost("house-a", { x: 2, y: 2 }, 90);
  const placed = s.commit();
  const save = s.serialize({ seed: "seed-x", generatorParams: {} });

  const { board: reloaded, failures } = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save);
  assert.deepEqual(failures, [], "a clean reload reports no failures");
  const piece = reloaded.getPiece(placed.id);
  assert.ok(piece);
  assert.equal(piece.typeId, "house-a");
  assert.deepEqual(piece.anchorCell, { x: 2, y: 2 });
  assert.equal(piece.rotation, 90);
});

test("CONTRAST: a generated piece with NO tombstone reappears on reload -- the generator's normal behaviour", () => {
  const save = { seed: "s1", generatorParams: {}, tombstones: [], placements: [] };
  const generate = () => [{ id: 10, typeId: "kiosk-a", anchorCell: { x: 4, y: 4 }, rotation: 0 }];
  const { board: reloaded } = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save, generate);
  assert.ok(reloaded.getPiece(10), "with no tombstone, regeneration should restore it");
});

test("GATE (C2.5): a removal does NOT come back -- place a generated piece, bulldoze it, save, reload with the SAME generator, and it stays gone", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const s = createPlacementSession({ board });
  board.place("kiosk-a", { x: 4, y: 4 }, 0, { id: 10, origin: "generated" });

  const removed = s.remove(10);
  assert.equal(removed.ok, true);

  const save = s.serialize({ seed: "s1", generatorParams: {} });
  assert.ok(save.tombstones.includes(4 * 10 + 4));

  // The SAME generator that produced it the first time -- proving the
  // tombstone, not a coincidentally-absent generator, is what keeps it gone.
  const generate = () => [{ id: 10, typeId: "kiosk-a", anchorCell: { x: 4, y: 4 }, rotation: 0 }];
  const { board: reloaded } = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save, generate);
  assert.equal(reloaded.getPiece(10), null, "a bulldozed generated piece must not be restored by regeneration");
  assert.equal(reloaded.pieceIdAt(4, 4), -1);
});

test("place, remove, reload full cycle for a PLAYER piece: the board after reload matches the board as left", () => {
  const { board, session: s } = session();
  s.setGhost("kiosk-a", { x: 1, y: 1 }, 0);
  const a = s.commit();
  s.setGhost("house-a", { x: 5, y: 5 }, 0);
  const b = s.commit();
  s.remove(a.id); // change your mind on the kiosk

  const save = s.serialize({ seed: "s2", generatorParams: {} });
  const { board: reloaded } = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save);

  assert.equal(reloaded.pieceIdAt(1, 1), -1, "the removed kiosk must not come back");
  assert.ok(reloaded.getPiece(b.id), "the kept house must still be there");
});

// ---------------------------------------------------------------- loadBoard failure reporting

test("GATE: a saved placement that fails to re-apply on load is reported in failures, not silently dropped", () => {
  const { session: s } = session();
  s.setGhost("house-a", { x: 2, y: 2 }, 0);
  const placed = s.commit();
  const save = s.serialize({ seed: "s3", generatorParams: {} });

  // The catalogue at LOAD time no longer has "house-a" -- a real, named cause
  // (REBUILD-PLAN.md B2: the catalogue is a registry with a persisted
  // overlay, so catalogue drift between a save and a later load is the
  // designed future case, not a hypothetical one).
  const driftedCatalogue = { "kiosk-a": CATALOGUE["kiosk-a"] };
  const { board: reloaded, failures } = loadBoard({ width: 10, height: 10, catalogue: driftedCatalogue }, save);

  assert.equal(reloaded.getPiece(placed.id), null, "the piece genuinely could not be re-placed");
  assert.equal(failures.length, 1);
  assert.equal(failures[0].id, placed.id);
  assert.equal(failures[0].typeId, "house-a");
  assert.equal(failures[0].origin, "player");
  assert.equal(failures[0].reason, "unknown-type");
});

test("a placement that fails to re-apply because the area shrank is also reported, not silently dropped", () => {
  const { session: s } = session();
  s.setGhost("house-a", { x: 6, y: 6 }, 0); // fits the original 10x10 board (rect to x8,y9)
  const placed = s.commit();
  assert.equal(placed.ok, true, "the test's own premise: this must actually place on the ORIGINAL board");
  const save = s.serialize({ seed: "s4", generatorParams: {} });

  const { failures } = loadBoard({ width: 5, height: 5, catalogue: CATALOGUE }, save);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, "out-of-bounds");
});

// ---------------------------------------------------------------- V3: schema version + per-placement timestamp

test("serialize() writes the real SAVE_SCHEMA_VERSION, not a hand-typed number that could drift from it", () => {
  const { session: s } = session();
  const save = s.serialize({ seed: "v3", generatorParams: {} });
  assert.equal(save.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(SAVE_SCHEMA_VERSION, 1);
});

test("a committed placement carries the injected clock's timestamp, not the real wall clock", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const s = createPlacementSession({ board, now: () => "2026-09-15T03:00:00.000Z" });
  s.setGhost("kiosk-a", { x: 1, y: 1 }, 0);
  s.commit();
  const save = s.serialize({ seed: "x", generatorParams: {} });
  assert.equal(save.placements[0].at, "2026-09-15T03:00:00.000Z");
});

test("GATE: the clock is called only on a SUCCESSFUL commit -- never on preview, cancel, or an inert (invalid) commit attempt", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  let calls = 0;
  const s = createPlacementSession({ board, now: () => { calls++; return "t"; } });

  s.setGhost("kiosk-a", { x: 1, y: 1 }, 0);
  assert.equal(calls, 0, "previewing a ghost must never call the clock");
  s.cancel();
  assert.equal(calls, 0, "cancelling must never call the clock");

  board.place("kiosk-a", { x: 5, y: 5 }, 0, { id: 999 }); // occupy a spot out of band
  s.setGhost("kiosk-a", { x: 5, y: 5 }, 0); // now invalid -- occupied
  const inert = s.commit();
  assert.equal(inert.ok, false, "sanity check: this commit must actually be inert");
  assert.equal(calls, 0, "an inert commit must never call the clock");

  s.setGhost("kiosk-a", { x: 2, y: 2 }, 0);
  s.commit();
  assert.equal(calls, 1, "exactly one real commit must call the clock exactly once");
});

test("a piece placed directly via board.place() (bypassing the session) has no tracked timestamp -- serializes as null, not a crash", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  board.place("kiosk-a", { x: 3, y: 3 }, 0, { id: 7 });
  const s = createPlacementSession({ board });
  const save = s.serialize({ seed: "x", generatorParams: {} });
  assert.equal(save.placements.length, 1);
  assert.equal(save.placements[0].at, null);
});

test("GATE: remove() deletes the piece's own placedAt entry -- a later, unrelated piece reusing the same id must NOT inherit a stale timestamp", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const s = createPlacementSession({ board, now: () => "2026-09-15T00:00:00Z" });
  s.setGhost("kiosk-a", { x: 1, y: 1 }, 0);
  const first = s.commit(); // id N, timestamped

  s.remove(first.id);
  // A different, unrelated piece reuses the exact same numeric id --
  // area-board.js's own place() allows this once the original is gone.
  board.place("house-a", { x: 4, y: 4 }, 0, { id: first.id });

  const save = s.serialize({ seed: "x", generatorParams: {} });
  const reused = save.placements.find((p) => p.id === first.id);
  assert.ok(reused);
  assert.equal(reused.typeId, "house-a");
  assert.equal(reused.at, null, "the reused id must NOT carry the removed piece's old timestamp");
});

test("loadBoard() reports the save's own schemaVersion and the code's expected one, so a caller can compare", () => {
  const { session: s } = session();
  const save = s.serialize({ seed: "x", generatorParams: {} });
  const result = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save);
  assert.equal(result.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(result.expectedSchemaVersion, SAVE_SCHEMA_VERSION);
});

test("a save with no schemaVersion field at all (predates V3) reports schemaVersion 0, distinct from any real version", () => {
  const legacySave = { seed: "x", generatorParams: {}, tombstones: [], placements: [] };
  const result = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, legacySave);
  assert.equal(result.schemaVersion, 0);
  assert.equal(result.expectedSchemaVersion, 1);
  assert.notEqual(result.schemaVersion, result.expectedSchemaVersion);
});

test("GATE: reloading and re-serializing preserves every EXISTING placement's real timestamp -- round trip does not reset history to null", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const original = createPlacementSession({ board, now: () => "2026-09-01T00:00:00Z" });
  original.setGhost("kiosk-a", { x: 2, y: 2 }, 0);
  const placed = original.commit();
  const save = original.serialize({ seed: "x", generatorParams: {} });
  assert.equal(save.placements[0].at, "2026-09-01T00:00:00Z");

  const { board: reloadedBoard, placedAt } = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save);
  const resumed = createPlacementSession({ board: reloadedBoard, placedAt, now: () => "2026-09-15T00:00:00Z" });
  const resaved = resumed.serialize({ seed: "x", generatorParams: {} });

  assert.equal(resaved.placements[0].id, placed.id);
  assert.equal(resaved.placements[0].at, "2026-09-01T00:00:00Z", "the ORIGINAL timestamp must survive a reload, not reset to the resumed session's own clock");
});

test("loadBoard()'s placedAt is populated ONLY for placements that actually re-applied -- a failed one must not leave a phantom timestamp", () => {
  const { session: s } = session();
  s.setGhost("house-a", { x: 2, y: 2 }, 0);
  const placed = s.commit();
  const save = s.serialize({ seed: "x", generatorParams: {} });
  assert.ok(save.placements[0].at, "sanity check: the original placement really did get a timestamp");

  // Reload against a catalogue missing "house-a" -- the placement fails to
  // re-apply (B2: catalogue drift), so it is NOT on the reloaded board.
  const driftedCatalogue = { "kiosk-a": CATALOGUE["kiosk-a"] };
  const { failures, placedAt } = loadBoard({ width: 10, height: 10, catalogue: driftedCatalogue }, save);
  assert.equal(failures.length, 1);
  assert.equal(placedAt.has(placed.id), false, "a placement that failed to re-apply must not leave a phantom timestamp for its id to inherit later");
});

test("GATE (C2.5, extended to the new fields): a removed placement's timestamp does not come back on reload either", () => {
  const { session: s } = session();
  s.setGhost("kiosk-a", { x: 1, y: 1 }, 0);
  const kept = s.commit();
  s.setGhost("house-a", { x: 5, y: 5 }, 0);
  const removedLater = s.commit();
  s.remove(removedLater.id);

  const save = s.serialize({ seed: "x", generatorParams: {} });
  assert.equal(save.placements.length, 1, "only the kept piece is in the save at all");

  const { board: reloaded, placedAt } = loadBoard({ width: 10, height: 10, catalogue: CATALOGUE }, save);
  assert.equal(reloaded.pieceIdAt(5, 5), -1, "the removed house must not come back");
  assert.equal(placedAt.has(removedLater.id), false);
  assert.equal(placedAt.has(kept.id), true);
});
