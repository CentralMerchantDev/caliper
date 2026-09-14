// =============================================================================
// THE WORLD LAYER — REBUILD-PLAN.md W5 (load/unload) and W6 (addressing,
// camera-relative origin). The brief's own gate for this piece: "RED is a
// piece resolving to the wrong area."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorldLayer } from "../public/world-layer.js";
import { createAreaBoard } from "../public/area-board.js";
import { AREA_STATE } from "../public/area.js";

const CATALOGUE = { "kiosk-a": { footprint: [1, 1], terrainMask: ["land"] } };

function twoAreaWorld() {
  return createWorldLayer({
    areas: [
      { id: "isle-a", state: AREA_STATE.OPEN, worldAnchor: { x: 1000, z: 2000 } },
      { id: "isle-b", state: AREA_STATE.OPEN, worldAnchor: { x: -500, z: 300 } },
    ],
  });
}

function freshBoard() {
  return createAreaBoard({ width: 8, height: 8, catalogue: CATALOGUE });
}

// ---------------------------------------------------------------- the gate

test("GATE: a cell address resolves ONLY within its own area's board -- a non-resident area must not see a resident SIBLING area's real piece at the same coordinates", () => {
  const world = twoAreaWorld();
  const boardB = freshBoard();
  boardB.place("kiosk-a", { x: 3, y: 3 }, 0, { id: 99 });
  world.enter("isle-b", { loadBoard: () => boardB });

  // isle-a was never entered and has no resident board of its own. If
  // resolution ever fell back to "whatever board happens to be resident"
  // instead of the address's own areaId, this would wrongly return isle-b's
  // real piece -- so the fixture deliberately puts a REAL piece at the
  // queried coordinate in the OTHER area, not an empty cell, which a
  // fallback-to-any-board bug could pass by accident.
  assert.equal(world.resolveCell({ areaId: "isle-a", x: 3, y: 3 }), null);
  assert.equal(world.resolveCell({ areaId: "isle-b", x: 3, y: 3 }).id, 99);
});

test("resolveCell finds a real piece in the area that actually owns it", () => {
  const world = twoAreaWorld();
  const boardA = freshBoard();
  boardA.place("kiosk-a", { x: 2, y: 2 }, 0, { id: 7 });
  world.enter("isle-a", { loadBoard: () => boardA });
  const found = world.resolveCell({ areaId: "isle-a", x: 2, y: 2 });
  assert.ok(found);
  assert.equal(found.id, 7);
});

test("resolveCell against an area with no resident board returns null, not a crash or a stale answer", () => {
  const world = twoAreaWorld();
  assert.equal(world.resolveCell({ areaId: "isle-a", x: 0, y: 0 }), null);
});

// ---------------------------------------------------------------- camera-relative origin

test("cameraOrigin is null when nothing is active", () => {
  const world = twoAreaWorld();
  assert.equal(world.cameraOrigin(), null);
});

test("cameraOrigin is the ACTIVE area's own world anchor, and changes on entry -- one translation, not per-piece", () => {
  const world = twoAreaWorld();
  world.enter("isle-a", { loadBoard: freshBoard });
  assert.deepEqual(world.cameraOrigin(), { x: 1000, z: 2000 });
  world.enter("isle-b", { loadBoard: freshBoard });
  assert.deepEqual(world.cameraOrigin(), { x: -500, z: 300 });
});

test("a piece's own stored anchorCell is unchanged by which area is active -- the recentre is applied at read time, not baked into the data", () => {
  const world = twoAreaWorld();
  const boardA = freshBoard();
  boardA.place("kiosk-a", { x: 5, y: 5 }, 0, { id: 1 });
  world.enter("isle-a", { loadBoard: () => boardA });
  world.enter("isle-b", { loadBoard: freshBoard });
  world.enter("isle-a", { loadBoard: () => boardA });
  const piece = world.boardFor("isle-a").getPiece(1);
  assert.deepEqual(piece.anchorCell, { x: 5, y: 5 });
});

// ---------------------------------------------------------------- W5: load / unload contract

test("entering an area for the first time calls the loader exactly once", () => {
  const world = twoAreaWorld();
  let calls = 0;
  world.enter("isle-a", { loadBoard: () => { calls++; return freshBoard(); } });
  assert.equal(calls, 1);
});

test("leaving discards the resident board -- boardFor returns null once left", () => {
  const world = twoAreaWorld();
  world.enter("isle-a", { loadBoard: freshBoard });
  assert.ok(world.boardFor("isle-a"));
  world.leave();
  assert.equal(world.boardFor("isle-a"), null);
});

test("GATE (W5): re-entering after leaving reloads -- the loader runs again, proving nothing is assumed still resident", () => {
  const world = twoAreaWorld();
  let calls = 0;
  const loader = () => { calls++; return freshBoard(); };
  world.enter("isle-a", { loadBoard: loader });
  world.leave();
  world.enter("isle-a", { loadBoard: loader });
  assert.equal(calls, 2);
});

test("placements survive the unload/reload round trip when the loader is backed by real persistence", () => {
  const world = twoAreaWorld();
  const persisted = freshBoard();
  persisted.place("kiosk-a", { x: 1, y: 1 }, 0, { id: 42 });
  // The loader always hands back the SAME persisted board object -- modelling
  // "placements are never discarded, only their rendered/resident form is."
  const loader = () => persisted;
  world.enter("isle-a", { loadBoard: loader });
  world.leave();
  world.enter("isle-a", { loadBoard: loader });
  const piece = world.boardFor("isle-a").getPiece(42);
  assert.ok(piece, "the placement must still be there after a leave/re-enter cycle");
  assert.equal(piece.typeId, "kiosk-a");
});

// ---------------------------------------------------------------- delegation, not reimplementation

test("entering a LOCKED area is still refused through the world layer -- the wrapper does not weaken the underlying gate", () => {
  const world = createWorldLayer({ areas: [{ id: "isle-a", state: AREA_STATE.LOCKED }] });
  const result = world.enter("isle-a", { loadBoard: freshBoard });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "locked");
  assert.equal(world.boardFor("isle-a"), null, "a refused entry must not materialise a board");
});

test("list() reflects area state regardless of board residency -- W5: the area list and states are always resident", () => {
  const world = twoAreaWorld();
  const before = world.list().find((a) => a.id === "isle-a").state;
  world.enter("isle-a", { loadBoard: freshBoard });
  const after = world.list().find((a) => a.id === "isle-a").state;
  assert.equal(before, AREA_STATE.OPEN);
  assert.equal(after, AREA_STATE.OPEN);
});
