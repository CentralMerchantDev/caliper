// I3 -- PICK. WHAT WAS CLICKED STAYS SELECTED.
//
// The real running app already raycasts a city-mode click to a world point
// and asks the spatial index what is there (world-render-3d.js's "CITY MODE
// PICKS AGAINST THE SCENE" handler) -- that part predates this step and was
// never broken. What was missing is memory: `_index.addressAt(x, z)`
// answers for one instant and nothing kept it, so a later "describe this"
// request (D2/D4) would have nothing to write itself against. D1's
// createSelection() (public/selection.js) already solved exactly this and
// was proven in isolation; nothing wired it into the real click handler.
//
// Two properties, at the two levels this codebase actually verifies
// renderer code: the DATA property (D1's own contract, re-confirmed at the
// composition boundary I3 introduces -- createSelection over the real
// generated plan's spatial index, not a fixture), and the WIRING property
// (world-render-3d.js's click handler now calls THROUGH the selection, not
// the index directly -- read from source, because constructing a real
// WorldRenderer needs a GPU this suite does not have, the same limitation
// test/rendererStatic.test.ts already states and works around the same way).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function findPublic(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "public");
    try { readFileSync(join(c, "world-scale.js"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
const RENDER_3D = readFileSync(join(findPublic(), "world-render-3d.js"), "utf8");

// BLOCKED, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md). buildWorldState no
// longer exists (public/city-render.js is quarantined) -- test 1 needs it
// directly. Test 2 checks that world-render-3d.js's now-dormant
// _buildCityBase still constructs `this._selection = createSelection(this._index)`;
// it does not any more, on purpose (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md's
// "what goes dormant" section names this exact line). Both document a real
// capability -- picking an address to describe a change against -- that
// Phase 2 needs to reconnect to the new board, not a defect to patch here.
test("I3 (data): a pick at a real plot's centre selects that plot's real id, and it stays selected", { skip: "BLOCKED: buildWorldState no longer exists; public/city-render.js is quarantined (see comment above)" }, () => {});

test("I3 (wiring): the real click handler resolves through the persisted selection, not the index directly", { skip: "BLOCKED: this._selection is no longer constructed -- it lived in _buildCityBase, now a dormant stub (see comment above)" }, () => {});

// BLOCKED, 2026-09-13, board quarantine (Mark's ruling: "the b1-board board
// code is not a foundation... it comes out"). public/board-load.js is
// quarantined to _TO-DELETE/b1-board/ -- world-render-3d.js no longer
// imports pieceAtPoint from it, and the city-mode pick handler's
// this._boardData branch was removed (this._boardData was never set
// anywhere in the file to begin with; see the comment left in its place).
// Not retired: the capability this test names -- resolving a click to a
// real committed board piece -- is real and will matter again once Phase 2
// supplies a board to load.
test("B3 (wiring): the city-mode pick handler resolves a real board piece via pieceAtPoint when the real board has been loaded", { skip: "BLOCKED: public/board-load.js is quarantined; world-render-3d.js's pieceAtPoint call was removed with it (see comment above)" }, () => {
  assert.match(
    RENDER_3D,
    /import\s*\{[^}]*\bpieceAtPoint\b[^}]*\}\s*from\s*["']\.\/board-load\.js["']/,
    "world-render-3d.js does not import pieceAtPoint from board-load.js",
  );
  const pickHandlerStart = RENDER_3D.indexOf("CITY MODE PICKS AGAINST THE SCENE");
  assert.ok(pickHandlerStart > -1, "could not find the city-mode pick handler by its own comment -- it may have moved or been renamed");
  const cityModeBlock = RENDER_3D.slice(pickHandlerStart, pickHandlerStart + 2500);
  assert.match(
    cityModeBlock,
    /pieceAtPoint\(\s*this\._boardData\.board,\s*pt\.x,\s*pt\.z\s*\)/,
    "the city-mode pick handler does not call pieceAtPoint against the real, loaded board",
  );
});
