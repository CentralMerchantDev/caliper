// =============================================================================
// THE OVERVIEW SCENE'S OWN STATIC WIRING — RC2's gate, restated: "from the
// overview, click an OPEN area and the board for THAT area loads. Click a
// LOCKED one and it refuses visibly. RED is entering a locked area, or two
// areas ACTIVE at once."
//
// No GPU in this suite (the same gap test/lookProofScene.test.ts's own
// header names) -- these are static source checks that the page's own
// wiring calls the REAL area.js/world-layer.js functions rather than a
// second, hand-rolled decision path. The actual pointer-driven proof
// (real clicks, real board.pieces(), real worldLayer.active()) is
// scripts/interact-overview-scene.mjs, run directly, not from this suite.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stripSourceComments, stripHtmlComments } from "./stripSourceComments.ts";

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
const PUBLIC = findPublic();
const SCENE_SRC = stripHtmlComments(stripSourceComments(readFileSync(join(PUBLIC, "overview-scene.html"), "utf8")));

test("GATE (RC2): the real area.js/world-layer.js state machine is imported and constructed -- not a second, hand-rolled LOCKED/OPEN/ACTIVE copy", () => {
  assert.match(SCENE_SRC, /import \{ createAreaBoard \} from "\.\/area-board\.js"/, "the real area board is not imported");
  assert.match(SCENE_SRC, /import \{ createWorldLayer \} from "\.\/world-layer\.js"/, "the real world layer is not imported");
  assert.match(SCENE_SRC, /const worldLayer = createWorldLayer\(\{ areas: DEMO_AREAS \}\)/, "a real world layer is not constructed from DEMO_AREAS");
});

test("GATE (RC2): at least one demo area is LOCKED and at least one is OPEN -- both paths (refuse, enter) must be real, not staged by only ever having one state to click", () => {
  assert.match(SCENE_SRC, /state: "OPEN"/, "no OPEN demo area -- the entry path would be untestable");
  assert.match(SCENE_SRC, /state: "LOCKED"/, "no LOCKED demo area -- the refusal path would be untestable");
});

test("GATE (RC2): clicking calls the REAL worldLayer.enter(), never a second is-it-open check written here", () => {
  assert.match(SCENE_SRC, /const result = worldLayer\.enter\(areaId, \{ loadBoard: loadBoardForArea \}\)/, "the click handler does not call the real worldLayer.enter()");
  assert.doesNotMatch(SCENE_SRC, /area\.state\s*===\s*"OPEN"\s*\?/, "a hand-rolled state check would re-decide what worldLayer.enter() already decides -- exactly the 'renderer and the rule disagreeing' failure class this run's own brief names");
});

test("GATE (RC2): a refused entry (LOCKED) is shown on screen, not only logged -- 'refuses visibly'", () => {
  assert.match(SCENE_SRC, /if \(!result\.ok\) \{\s*\n\s*showRefusal\(areaId, result\.reason\);/, "a refused entry does not call showRefusal");
  assert.match(SCENE_SRC, /el\.style\.display = "block"/, "showRefusal does not actually make the refusal element visible");
});

test("GATE (RC2): a successful entry actually switches to a real per-area board render -- resolveBoardPieces against worldLayer's own boardFor(), never a hardcoded piece list", () => {
  assert.match(SCENE_SRC, /import \{ resolveBoardPieces, rotateGeometryY, MODULE_SIZE_M \} from "\.\/board-renderer\.js"/, "the real board-renderer module is not imported");
  assert.match(SCENE_SRC, /const board = worldLayer\.boardFor\(areaId\)/, "enterBoardView does not read the real, resident board for the entered area");
  assert.match(SCENE_SRC, /const \{ resolved, skipped \} = resolveBoardPieces\(board, catalogueById, manifest\)/, "the entered board's pieces are not resolved via the real resolveBoardPieces");
});

test("RC2/W5: leaving calls the real worldLayer.leave(), and re-entering calls loadBoardForArea again via worldLayer's own enter() -- residency is never assumed by this file's own code (a cached board reference reused across leave/enter would defeat W5 silently)", () => {
  assert.match(SCENE_SRC, /const \{ left \} = worldLayer\.leave\(\)/, "leaveBoardView does not call the real worldLayer.leave()");
  assert.match(SCENE_SRC, /function loadBoardForArea\(id\) \{\s*\n\s*loadCounts\[id\] = \(loadCounts\[id\] \|\| 0\) \+ 1;/, "loadBoardForArea does not count its own real invocations -- W5's own gate ('reloads, does not assume residency') would be unverifiable");
  assert.doesNotMatch(SCENE_SRC, /let\s+cachedBoard/, "a locally-cached board variable would let this file silently reuse a stale board across leave/enter, bypassing world-layer.js's own boards Map entirely");
});

test("GATE (RC2): at most one ACTIVE is never re-implemented here -- this file tracks no second activeAreaId of its own, only worldLayer's", () => {
  assert.doesNotMatch(SCENE_SRC, /let\s+activeAreaId/, "a second, locally-tracked activeAreaId would be a second place the 'at most one active' invariant could disagree with world-layer.js's own single slot");
  assert.match(SCENE_SRC, /window\.__worldLayer = worldLayer;/, "the real world layer is not exposed for a driving script to assert the invariant directly against");
});

test("RC2: clicking is only wired to the overview's own pad meshes, gated to overview mode -- a click cannot even resolve to an area while a board is showing, structurally, not by a re-check of mode inside the resolver", () => {
  assert.match(SCENE_SRC, /if \(e\.button !== 0 \|\| mode !== "overview"\) return;/, "the click handler does not bail out of board mode before resolving an area");
  assert.match(SCENE_SRC, /raycaster\.intersectObjects\(overviewGroup\.children\)/, "clicks are not raycast against the overview's own pad meshes specifically");
});

test("(synthetic) the vulnerability: a comment mentioning worldLayer.enter must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// const result = worldLayer.enter(areaId, { loadBoard: loadBoardForArea }) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /const result = worldLayer\.enter\(areaId, \{ loadBoard: loadBoardForArea \}\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

test("GATE (CAM-1): the overview's own board view passes each piece's real storeys to fitToFootprint -- FIX-1's real height, not the old default-capped path this page silently kept", () => {
  assert.match(SCENE_SRC, /fitToFootprint\(geom, p\.footprint, p\.anchor, p\.storeys\)/, "buildBoardMesh's own fitToFootprint call does not pass p.storeys -- entering an area from the overview would still show the old, capped ~27m heights while look-proof-scene.html's own board shows FIX-1's real ~376m range, two pages silently disagreeing about the same catalogue data");
});

test("GATE (CAM-1): setBoardCamera is framed off the real board mesh's own max height, not a fixed groundWidth-only distance -- the old formula assumed a compressed range, same defect look-proof-scene.html's own board camera had", () => {
  assert.match(SCENE_SRC, /function setBoardCamera\(maxHeight\)/, "setBoardCamera does not take a real maxHeight argument");
  assert.doesNotMatch(SCENE_SRC, /const dist = Math\.max\(w, d\);/, "setBoardCamera's own distance is still driven only by the board's ground width/depth, never the real height of what is actually placed on it");
});
