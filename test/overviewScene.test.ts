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
  assert.match(SCENE_SRC, /import \{ resolveBoardPieces, resolveGhost, resolveReadout, anchorForCell, rotateGeometryY, MODULE_SIZE_M \} from "\.\/board-renderer\.js"/, "the real board-renderer module is not imported");
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

// =============================================================================
// SHIP-1 (docs/briefs/BLD-2026-09-17.md §5) -- "one page, both sides: overview
// -> area -> place -> author -> reload." Real clicks (hover, commit, remove,
// cancel), the live readout, authoring, and a real reload action, proven for
// real by scripts/interact-overview-scene.mjs (RC2/SHIP-1 GATE), not this
// suite -- same split this file's own header already establishes for RC2.
// =============================================================================

test("GATE (SHIP-1/place): the real pointer-interaction.js and placement.js modules are imported -- not a second, hand-rolled hover/commit/cancel path", () => {
  assert.match(SCENE_SRC, /import \{ createPlacementSession, loadBoard \} from "\.\/placement\.js"/, "the real placement session/loadBoard are not imported");
  assert.match(SCENE_SRC, /import \{ cellFromWorldXZ, handleHover, handleClick, handleCancel \} from "\.\/pointer-interaction\.js"/, "the real pointer-interaction.js handlers are not imported");
});

test("GATE (SHIP-1/place): entering a board creates a real session over THAT area's own board, and place/author UI is only shown then", () => {
  assert.match(SCENE_SRC, /session = createPlacementSession\(\{ board \}\)/, "enterBoardView does not create a real placement session over the entered board");
  assert.match(SCENE_SRC, /document\.getElementById\("authorPanel"\)\.style\.display = "block"/, "the author panel is not shown on entering a board");
  assert.match(SCENE_SRC, /document\.getElementById\("reloadButton"\)\.style\.display = "block"/, "the reload button is not shown on entering a board");
});

test("GATE (SHIP-1/place): pointer handlers are gated to board mode -- hover/click/cancel cannot even resolve while the overview is showing, the same structural (not merely re-checked) discipline RC2's own click-gating already uses for the overview pads", () => {
  assert.match(SCENE_SRC, /renderer\.domElement\.addEventListener\("pointermove", \(e\) => \{\s*\n\s*if \(mode !== "board"\) return;/, "pointermove does not bail out of overview mode before resolving a cell");
  assert.match(SCENE_SRC, /if \(e\.button !== 0 \|\| mode !== "board"\) return;/, "the board pointerdown handler does not bail out of overview mode");
});

test("GATE (SHIP-1/place): Escape cancels a live ghost FIRST, only leaving the board when nothing is being previewed -- RC2's own 'Escape leaves the board' gate must still hold exactly when it always did (no hover having happened yet)", () => {
  assert.match(SCENE_SRC, /if \(session && session\.getGhost\(\)\) \{\s*\n\s*handleCancel\(session\);/, "Escape does not cancel a live ghost before leaving the board");
});

test("(synthetic) the vulnerability: a comment mentioning createPlacementSession must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// session = createPlacementSession({ board }) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /session = createPlacementSession\(\{ board \}\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// -------------------------------------------------- SHIP-1: the live readout

test("GATE (RDO-1/SHIP-1): the real board-renderer readout functions and a real, unmodified ScoringModule namespace import back the live label -- never a second, hand-computed number", () => {
  assert.match(SCENE_SRC, /resolveGhost, resolveReadout, anchorForCell/, "resolveGhost/resolveReadout/anchorForCell are not imported from the real board-renderer.js");
  assert.match(SCENE_SRC, /import \* as ScoringModule from "\.\/scoring\.js"/, "ScoringModule is not imported as a namespace -- a named import would crash this page for as long as S4 is absent, the same reason RB3 kept it a namespace import");
  assert.match(SCENE_SRC, /function buildReadoutLabelTexture\(current, ifPlaced\)/, "buildReadoutLabelTexture is missing -- there is no on-screen label to draw");
});

test("GATE (RDO-1/SHIP-1): the readout is recomputed on EVERY hover, from the real resolveReadout against the real board -- 'that number, changing as the cursor moves, IS the reason one cell beats another', not a value computed once", () => {
  assert.match(SCENE_SRC, /readoutResolved = resolveReadout\(ScoringModule, worldLayer\.boardFor\(currentAreaId\), catalogueById, ghost\.anchorCell, currentBrushTypeId, 0\)/, "updateGhostAndReadout does not call the real resolveReadout against the real, currently-active board");
});

// -------------------------------------------------- SHIP-1: author

test("GATE (SHIP-1/author): catalogue-registry.js is loaded via a DYNAMIC import, never a static top-level one -- FOUND BY RUNNING THIS PAGE: a static import crashes the ENTIRE page's module graph the moment the browser tries to resolve the migration script's own node:fs/node:url/node:path (docs/CROSS-LANE-REQUESTS.md #4)", () => {
  assert.doesNotMatch(SCENE_SRC, /^import \{ createCatalogueRegistry \} from "\.\/catalogue-registry\.js";/m, "catalogue-registry.js is imported statically -- this would crash the whole page in every real browser");
  assert.match(SCENE_SRC, /const mod = await import\("\.\/catalogue-registry\.js"\);/, "catalogue-registry.js is not loaded via a dynamic import");
  assert.match(SCENE_SRC, /mod\.createCatalogueRegistry\(shippedCatalogueById\)/, "the real createCatalogueRegistry is not constructed from the dynamically-loaded module");
});

test("GATE (SHIP-1/author): a failed registry load degrades the AUTHOR step honestly -- reported via a real, checkable error, not a silent no-op, while the rest of the page keeps working", () => {
  assert.match(SCENE_SRC, /catch \(e\) \{\s*\n\s*registryLoadError = e;/, "a registry load failure is not caught and recorded");
  assert.match(SCENE_SRC, /if \(!registry\) \{\s*\n\s*return \{ ok: false, errors: \[\{ rule: "registry-unavailable"/, "addRenderableAuthoredEntry does not report a real, specific registry-unavailable refusal when the registry failed to load");
});

test("GATE (SHIP-1/author): a successfully authored entry gets a real, already-shipped glb as a caller-side rendering stand-in -- read from the real shipped catalogue, never invented -- and B1's own 'the board cannot tell the difference' is exercised through the SAME addAuthoredEntry every headless test already proves, not a second implementation", () => {
  assert.match(SCENE_SRC, /const AUTHORED_STANDIN_GLB = shippedCatalogueById\["house-a"\]\.glb;/, "the authored-entry stand-in glb is not read from a real shipped catalogue entry");
  assert.match(SCENE_SRC, /const result = registry\.addAuthoredEntry\(fields\);/, "addRenderableAuthoredEntry does not call the real, unmodified addAuthoredEntry");
});

test("GATE (SHIP-1/author): a successfully authored piece is immediately selected as the current brush -- author, then place it, the SAME session/ghost/commit path as any shipped brush", () => {
  assert.match(SCENE_SRC, /currentBrushTypeId = result\.entry\.id;/, "authoring does not select the new piece as the current brush");
});

test("(synthetic) the vulnerability: a comment mentioning addRenderableAuthoredEntry must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// function addRenderableAuthoredEntry(fields) used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /function addRenderableAuthoredEntry\(fields\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});

// -------------------------------------------------- SHIP-1: reload

test("GATE (SHIP-1/reload): a real button click serializes the REAL session (RB4's own proven placement.js round trip) and persists it, keyed per area -- not a ?reload=1 query-param demo", () => {
  assert.match(SCENE_SRC, /document\.getElementById\("reloadButton"\)\.addEventListener\("click", \(\) => \{/, "the reload button has no real click handler");
  assert.match(SCENE_SRC, /const save = session\.serialize\(\{ seed: "ship1-demo", generatorParams: null \}\);/, "the reload handler does not call the real session.serialize()");
  assert.match(SCENE_SRC, /localStorage\.setItem\(SAVE_KEY_PREFIX \+ currentAreaId, JSON\.stringify\(save\)\);/, "the save is not persisted, keyed by the real current area id");
  assert.match(SCENE_SRC, /location\.reload\(\);/, "the reload handler does not trigger a REAL page navigation reload");
});

test("GATE (SHIP-1/reload): loadBoardForArea replays a real save via the real loadBoard() when one exists for this area, instead of re-deriving AREA_DEMO_PLACEMENTS", () => {
  assert.match(SCENE_SRC, /const \{ board, failures \} = loadBoard\(\{ width: AREA_BOARD_WIDTH, height: AREA_BOARD_HEIGHT, catalogue: catalogueById \}, save\);/, "loadBoardForArea does not call the real loadBoard() against a saved session");
  assert.match(SCENE_SRC, /if \(failures\.length\) console\.log\(`SHIP1-RELOAD-FAILURES/, "a failed replay is not surfaced -- C2.5's own contract (never silently drop a placement that fails to re-apply)");
});

test("(synthetic) the vulnerability: a comment mentioning SHIP1-SAVE must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments('// console.log(`SHIP1-SAVE area=${currentAreaId} placements=${save.placements.length}`) used to be here\nconst m = {};\n');
  assert.doesNotMatch(commentOnly, /console\.log\(`SHIP1-SAVE area=\$\{currentAreaId\} placements=\$\{save\.placements\.length\}`\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});
