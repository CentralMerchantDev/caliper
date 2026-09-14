// =============================================================================
// POINTER INTERACTION'S OWN TESTS — RC1's gate, restated: "a scripted
// pointer sequence -- hover an invalid cell, click, and the board is
// unchanged; hover a valid one, click, and exactly one piece exists."
// Against a REAL createAreaBoard() and a REAL createPlacementSession(),
// asserting the REAL board's own board.pieces().length -- never a mock,
// never the renderer's own claim about what it drew.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { cellFromWorldXZ, handleHover, handleClick, handleCancel } from "../public/pointer-interaction.js";
import { MODULE_SIZE_M } from "../public/board-renderer.js";
import { createAreaBoard } from "../public/area-board.js";
import { createPlacementSession } from "../public/placement.js";

const CATALOGUE = {
  "house-a": { footprint: [2, 3], terrainMask: ["land"] },
};

test("cellFromWorldXZ is the inverse of anchorForCell -- floor, half-open cells", () => {
  assert.deepEqual(cellFromWorldXZ(0, 0), { x: 0, y: 0 });
  assert.deepEqual(cellFromWorldXZ(3.9, 3.9), { x: 0, y: 0 });
  assert.deepEqual(cellFromWorldXZ(4, 4), { x: 1, y: 1 });
  assert.deepEqual(cellFromWorldXZ(4 * MODULE_SIZE_M - 0.01, 4 * MODULE_SIZE_M - 0.01), { x: 3, y: 3 });
});

test("GATE (RC1): hover an invalid cell, click, and the real board is unchanged", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });

  // Out-of-bounds: house-a is 2x3, anchored at (9,9) runs past the board's
  // own 10x10 edge -- a real "out-of-bounds" refusal from evaluatePlacement,
  // not a hand-picked "invalid" label.
  const invalidCell = { x: 9, y: 9 };
  const ghost = handleHover(session, "house-a", invalidCell, 0);
  assert.equal(ghost.valid, false, "the ghost itself must read invalid before the click, or this is not testing what it claims to");

  const outcome = handleClick(board, session, invalidCell);
  assert.equal(outcome.action, "commit");
  assert.equal(outcome.result.ok, false);
  assert.equal(board.pieces().length, 0, "RED would be a click that places where the ghost read invalid");
});

test("GATE (RC1): hover a valid cell, click, and exactly one piece exists on the real board", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });

  const validCell = { x: 2, y: 2 };
  const ghost = handleHover(session, "house-a", validCell, 0);
  assert.equal(ghost.valid, true);

  const outcome = handleClick(board, session, validCell);
  assert.equal(outcome.action, "commit");
  assert.equal(outcome.result.ok, true);
  assert.equal(board.pieces().length, 1, "RED would be a committed placement the board does not actually contain");
  assert.equal(board.pieceAt(2, 2).typeId, "house-a");
});

test("a click on an already-placed piece removes it -- routed by the real board's own pieceIdAt, not the ghost", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });

  const placed = board.place("house-a", { x: 2, y: 2 }, 0);
  assert.ok(placed.ok);
  assert.equal(board.pieces().length, 1);

  // Hover a DIFFERENT cell -- the ghost's own state must not be what
  // decides this; only board.pieceIdAt at the CLICKED cell may.
  handleHover(session, "house-a", { x: 6, y: 6 }, 0);

  const outcome = handleClick(board, session, { x: 2, y: 2 });
  assert.equal(outcome.action, "remove");
  assert.equal(outcome.result.ok, true);
  assert.equal(board.pieces().length, 0);
});

test("clicking an occupied cell removes even while the ghost (from a stale hover of that same cell) reads invalid", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });
  board.place("house-a", { x: 2, y: 2 }, 0);

  const ghost = handleHover(session, "house-a", { x: 2, y: 2 }, 0);
  assert.equal(ghost.valid, false, "occupied -- a real refusal, not staged");

  const outcome = handleClick(board, session, { x: 2, y: 2 });
  assert.equal(outcome.action, "remove");
  assert.equal(board.pieces().length, 0);
});

test("handleCancel drops the ghost and never touches the board", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });
  handleHover(session, "house-a", { x: 2, y: 2 }, 0);
  assert.ok(session.getGhost());

  const outcome = handleCancel(session);
  assert.equal(outcome.action, "cancel");
  assert.equal(session.getGhost(), null);
  assert.equal(board.pieces().length, 0);

  // A click right after a cancel is inert (no-ghost), not a commit of
  // whatever was last hovered.
  const clickOutcome = handleClick(board, session, { x: 2, y: 2 });
  assert.equal(clickOutcome.result.ok, false);
  assert.equal(clickOutcome.result.reason, "no-ghost");
});

test("a full scripted sequence: hover invalid+click (unchanged), hover valid+click (one piece), click again (removed)", () => {
  const board = createAreaBoard({ width: 10, height: 10, catalogue: CATALOGUE });
  const session = createPlacementSession({ board });

  handleHover(session, "house-a", { x: 9, y: 9 }, 0);
  handleClick(board, session, { x: 9, y: 9 });
  assert.equal(board.pieces().length, 0);

  handleHover(session, "house-a", { x: 2, y: 2 }, 0);
  handleClick(board, session, { x: 2, y: 2 });
  assert.equal(board.pieces().length, 1);

  const removeOutcome = handleClick(board, session, { x: 2, y: 2 });
  assert.equal(removeOutcome.action, "remove");
  assert.equal(board.pieces().length, 0);
});
