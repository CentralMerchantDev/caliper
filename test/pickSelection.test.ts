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

import { buildWorldState } from "../public/city-render.js";
import { buildSpatialIndex } from "../public/spatial-index.js";
import { createSelection } from "../public/selection.js";

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

test("I3 (data): a pick at a real plot's centre selects that plot's real id, and it stays selected", () => {
  const { world } = buildWorldState("pick-selection-seed");
  const index = buildSpatialIndex(world);
  const selection = createSelection(index);

  assert.equal(selection.current, null, "a fresh selection should start with nothing picked");

  const target = world.plots[Math.floor(world.plots.length / 2)];
  const cx = (target.xMin + target.xMax) / 2;
  const cz = (target.zMin + target.zMax) / 2;

  const picked = selection.pick(cx, cz);
  assert.equal(picked.plotId, target.id, "the pick did not resolve to the real plot at its own centre");
  assert.equal(selection.current.plotId, target.id, "the pick did not persist -- a later describe/generate step would find nothing selected");

  // A second, different pick REPLACES the first -- one selection, not a history.
  const other = world.plots[0].id === target.id ? world.plots[1] : world.plots[0];
  selection.pick((other.xMin + other.xMax) / 2, (other.zMin + other.zMax) / 2);
  assert.equal(selection.current.plotId, other.id, "picking a second plot did not replace the first selection");
});

test("I3 (wiring): the real click handler resolves through the persisted selection, not the index directly", () => {
  assert.match(
    RENDER_3D,
    /this\._selection\s*=\s*createSelection\(this\._index\)/,
    "world-render-3d.js no longer constructs a selection over the spatial index -- a later describe/generate step would have nothing to read",
  );
  const pickHandlerStart = RENDER_3D.indexOf("CITY MODE PICKS AGAINST THE SCENE");
  assert.ok(pickHandlerStart > -1, "could not find the city-mode pick handler by its own comment -- it may have moved or been renamed");
  const cityModeBlock = RENDER_3D.slice(pickHandlerStart, pickHandlerStart + 1200);
  assert.match(
    cityModeBlock,
    /this\._selection\s*\?\s*this\._selection\.pick\(pt\.x,\s*pt\.z\)/,
    "the city-mode click handler resolves the address directly from the index again, instead of through the persisted selection",
  );
});

test("B3 (wiring): the city-mode pick handler resolves a real board piece via pieceAtPoint when the real board has been loaded", () => {
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
