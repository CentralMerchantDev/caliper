// =============================================================================
// P4.4 MOVE
//
// board.js's canPlace already refuses with a real, structured
// { ok:false, reason, blockedBy } -- this wires that existing refusal to a
// cursor (public/move-piece.js's tryMove), it does not write a new one. Per
// Mark's own brief: the refusal path is tested FIRST, before the success
// path, and an occupied destination and an off-the-map one are checked to
// read DIFFERENTLY, not just "refused".
//
// Every check runs against scripts/_move-piece-probe.mjs's real, isolated-
// child-process build of the real 26 km world -- test/boardAdapter.test.ts's
// own established pattern, same documented reason (a full world at module
// scope in the shared 130-file suite has crashed it with a V8 OOM before).
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const PROBE = join(ROOT, "scripts", "_move-piece-probe.mjs");
const R = JSON.parse(execFileSync(process.execPath, [PROBE], { encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 }));

// --- refusal path, checked first --------------------------------------------

test("P4.4: moving onto a real, already-occupied piece is refused with reason 'occupied' and names what blocked it", () => {
  assert.ok(R.occupied, "the probe could not find a real occupied-destination case -- see the probe's own search loop");
  assert.equal(R.occupied.ok, false);
  assert.equal(R.occupied.reason, "occupied");
  assert.ok(R.occupied.blockedBy && R.occupied.blockedBy.id, "an occupied refusal must name what blocked it (board.js's own blockedBy), not just say no");
});

test("P4.4: moving off the edge of the world is refused with reason 'off-map' -- a DIFFERENT reason than 'occupied', not the same generic refusal", () => {
  assert.equal(R.offMap.ok, false);
  assert.equal(R.offMap.reason, "off-map");
  assert.notEqual(R.offMap.reason, R.occupied.reason, "an off-map refusal and an occupied refusal must read differently, per Mark's own brief");
});

test("P4.4: moving a piece that is not on the board at all is refused as 'not-found', not silently accepted or thrown", () => {
  assert.equal(R.notFound.ok, false);
  assert.equal(R.notFound.reason, "not-found");
});

// --- success path, checked second -------------------------------------------

test("P4.4: a move to real, genuinely free ground succeeds and reports the real destination", () => {
  assert.ok(R.success, "the probe could not find a real free destination near any sampled building -- see the probe's own search loop");
  assert.equal(R.success.ok, true);
  assert.ok(Number.isFinite(R.success.destWorld.x) && Number.isFinite(R.success.destWorld.z), "a successful move must report a real, finite world position");
});

test("P4.4: a piece may move a short distance that overlaps its OWN current footprint -- board.js's ignoreId, not a self-refusal", () => {
  // A blind audit (docs/AUDIT-PROTOCOL.md) found this had no regression
  // coverage: with `{ ignoreId: selected.id }` removed from the real
  // tryMove, the full 8-test suite still passed, because "occupied" above
  // moves a DIFFERENT piece onto a real building and never tests a piece
  // against its own old position. This closes that gap directly: a 2 m
  // move (destCell.i + 2), which necessarily overlaps most of the piece's
  // own current footprint, must succeed -- a missing ignoreId would refuse
  // it as "occupied" against itself.
  assert.ok(R.selfCollision, "the probe could not find a real building for which a 2 m move succeeds -- see the probe's own search loop");
  assert.equal(R.selfCollision.ok, true);
});

test("P4.4: moveEditFor() builds world-model.js's own move-op shape exactly -- address/op/payload.x/payload.z, nothing more, nothing renamed", () => {
  const edit = R.success.edit;
  assert.equal(edit.address, R.success.plotId);
  assert.equal(edit.op, "move");
  assert.deepEqual(Object.keys(edit).sort(), ["address", "op", "payload"]);
  assert.deepEqual(edit.payload, R.success.destWorld);
});

// -----------------------------------------------------------------------------
// WIRING -- a real Renderer3D needs a GPU this suite does not have
// (test/rendererStatic.test.ts's own documented limitation); read the
// source and confirm the refusal reaches a caller-visible callback, not
// console.log, and that the success path emits a real world-model.js edit.
// -----------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
function findPublic() {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "public");
    try { readFileSync(join(c, "world-scale.js"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
const RENDER_3D = readFileSync(join(findPublic(), "world-render-3d.js"), "utf8");
function stripLineComments(src) {
  return src.split("\n").map((line) => {
    const i = line.indexOf("//");
    return i === -1 ? line : line.slice(0, i);
  }).join("\n");
}
const RENDER_3D_CODE_ONLY = stripLineComments(RENDER_3D);

test("P4.4 (wiring): a refused move reaches a caller-visible callback, not console.log", () => {
  assert.match(RENDER_3D_CODE_ONLY, /import\s*\{\s*tryMove,\s*moveEditFor\s*\}\s*from\s*"\.\/move-piece\.js"/, "world-render-3d.js no longer imports P4.4's real functions from public/move-piece.js");
  const start = RENDER_3D_CODE_ONLY.indexOf("_moveSelected(");
  assert.ok(start > -1, "could not find the _moveSelected() method");
  const body = RENDER_3D_CODE_ONLY.slice(start, start + 1400);
  assert.match(body, /tryMove\(plotId,\s*destCell,\s*this\._boardPieces/, "_moveSelected() does not call the real tryMove against the real board pieces index");
  assert.doesNotMatch(body, /console\.(log|warn|error)\(/, "a refused move must reach the player through a callback, not a console log -- per Mark's own brief, a refusal the player cannot read is the same as no refusal");
  // Narrowed to the block immediately following tryMove's own refusal check
  // -- a wider window here previously matched the SEPARATE onMoveRefused
  // call in the could-not-persist branch further down, so removing only the
  // refusal-path call still passed. Caught by mutating exactly that call out
  // and watching this test wrongly stay green; fixed by anchoring on
  // `if (!result.ok)` itself, not just presence anywhere in the method.
  const refusalCheckStart = body.indexOf("if (!result.ok)");
  assert.ok(refusalCheckStart > -1, "could not find tryMove's own !result.ok refusal branch");
  const refusalBranch = body.slice(refusalCheckStart, refusalCheckStart + 200);
  assert.match(refusalBranch, /this\.onMoveRefused/, "the tryMove refusal branch itself does not call the caller-visible onMoveRefused callback");
});

test("P4.4 (wiring): a successful move builds the real move edit and adds it to the real world-model layer stack", () => {
  const start = RENDER_3D_CODE_ONLY.indexOf("_moveSelected(");
  const body = RENDER_3D_CODE_ONLY.slice(start, start + 1400);
  assert.match(body, /moveEditFor\(/, "_moveSelected() does not call the real moveEditFor to build the layer edit");
  assert.match(body, /layerFrom\(/, "_moveSelected() does not build a real layer via world-model.js's own layerFrom -- see public/apply-and-persist.js's reference pattern");
  assert.match(body, /\.layers\.add\(/, "_moveSelected() does not add the layer to the real world-model layer stack");
});

test("P4.4 (wiring): WorldRenderer exposes moveSelected() that delegates to the real implementation", () => {
  assert.match(RENDER_3D, /moveSelected\([^)]*\)\s*\{\s*return\s+this\._impl\._moveSelected\s*\?\s*this\._impl\._moveSelected\(/, "WorldRenderer.moveSelected() no longer delegates to the real _impl._moveSelected()");
});
