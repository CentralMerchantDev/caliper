// =============================================================================
// B4 (2b) -- PICKING MUST SURVIVE INSTANCING
//
// docs/briefs/CLI-2026-09-11-autonomous-2.md's own load-bearing requirement:
// "Write a test that a click resolves the CORRECT piece, not merely some
// piece, and watch it red before you fix it."
//
// Ground-checked before writing this: world-render-3d.js's real pick handler
// (its city-mode click path) does NOT read instanceId or any mesh identity
// for board pieces. It raycasts against the scene, takes the intersection's
// world-space point, and calls pieceAtPoint(board, x, z) -- board-load.js's
// own spatial-index lookup (atomOf -> board.inCells), entirely independent
// of which mesh or instance the raycast happened to hit.
// mesh.userData.pieceId (board-render.js, pre-instancing) is set but never
// read anywhere else in the codebase -- confirmed by a repo-wide grep.
//
// So the real risk instancing introduces is different from "resolving the
// wrong instanceId": it is "does a raycast against a shared InstancedMesh
// still land at the CORRECT piece's own world position, so the SAME
// production pieceAtPoint() lookup still resolves to the right piece."
// This test exercises the REAL production path end to end -- the real
// buildBoardScene() output, a real THREE.Raycaster, and the real
// pieceAtPoint() -- not a reimplementation of any of them.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { buildBoardScene } from "../public/board-render.js";
import { loadBoard, pieceAtPoint } from "../public/board-load.js";
import { atomOrigin } from "../public/grid.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

function makePickPiece(id: string, pieceType: string, i: number, j: number, w: number, d: number, levels = 1, boundaryId?: string): any {
  const piece: any = {
    id, pieceType, cell: { i, j, k: 0 }, rotation: 0,
    foot: { w, d }, clear: { w: 0, d: 0 }, levels,
    standsOn: ["buildable"], surface: pieceType === "road" ? "road" : "roof",
  };
  if (boundaryId) piece.boundaryId = boundaryId;
  return piece;
}

/** A real board.js instance, real buildBoardScene() render output, and a
 *  real raycaster all built from the SAME piece list -- so a pick test
 *  against this fixture exercises the production path, not a stand-in. */
function buildPickFixture() {
  const heightAt = makeHeightAt(new LandField(16));
  const pieces = [
    // Two buildings in the SAME group (same foot + levels, same boundary)
    // -- the case that shares one InstancedMesh across more than one
    // instance.
    makePickPiece("bldg-a", "building", 0, 0, 20, 20, 3, "mainland"),
    makePickPiece("bldg-b", "building", 0, 30, 20, 20, 3, "mainland"),
    // A third building in a DIFFERENT group (different levels).
    makePickPiece("bldg-c", "building", 0, 60, 20, 20, 7, "mainland"),
    // Item 2 (spatial chunking): two buildings that would have shared ONE
    // group under 2b's own (pieceType, foot, levels) key alone -- same
    // foot/levels as bldg-a/b -- but sit in DIFFERENT real boundaries, so
    // chunking must split them into two groups. Picking must still
    // resolve each to its own correct piece, not the other one's.
    makePickPiece("bldg-d-mainland", "building", 300, 0, 20, 20, 3, "mainland"),
    makePickPiece("bldg-e-downtown", "building", 300, 30, 20, 20, 3, "downtown"),
    // Two roads in the SAME group (same foot dims).
    makePickPiece("road-a", "road", 50, 0, 40, 9, 1, "mainland"),
    makePickPiece("road-b", "road", 100, 0, 40, 9, 1, "mainland"),
    // A dock, alone in its own group.
    makePickPiece("dock-a", "dock", 150, 0, 9, 9, 1, "mainland"),
  ];
  const board = loadBoard({ pieces }, heightAt);
  assert.equal(board.pieces.length, pieces.length, "test fixture setup: a piece failed to place (space conflict in the fixture itself, not the code under test)");
  const scene = buildBoardScene(THREE, board.pieces);
  return { board, pieces: board.pieces, scene };
}

/** Fire a ray straight down through a piece's own known world-space centre
 *  -- the exact centre meshForPiece/buildBoardScene already position every
 *  box at -- and return the resolved piece via the REAL production
 *  pieceAtPoint() call, from the REAL intersection point. */
function pickAt(scene: any, board: any, piece: any) {
  const origin = atomOrigin(piece.cell.i, piece.cell.j);
  const x = origin.x + piece.foot.w / 2;
  const z = origin.z + piece.foot.d / 2;
  const raycaster = new THREE.Raycaster();
  raycaster.set(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
  const hits = raycaster.intersectObjects(scene.children, true);
  assert.ok(hits.length > 0, `expected the ray through piece ${piece.id}'s own centre to hit something`);
  const point = hits[0].point;
  return pieceAtPoint(board.board, point.x, point.z);
}

test("B4 gate (2b): a click resolves the CORRECT board piece via the real InstancedMesh scene -- not merely some piece", () => {
  const { board, pieces, scene } = buildPickFixture();
  // Confirm the fixture actually exercises multi-instance groups, not just
  // singletons -- picking instance 0 of a 1-instance mesh proves nothing
  // about per-instance index handling.
  const multiInstanceMeshes = scene.children.filter((m: any) => m.count > 1);
  assert.ok(multiInstanceMeshes.length >= 2, "expected at least two InstancedMesh groups holding more than one instance -- the fixture must actually exercise shared-instance picking");

  for (const piece of pieces) {
    const resolved = pickAt(scene, board, piece);
    assert.ok(resolved, `expected a click on piece ${piece.id}'s own centre to resolve to a real piece, got null`);
    assert.equal(resolved.id, piece.id, `expected a click on piece ${piece.id}'s own centre to resolve to THAT piece, got "${resolved.id}" instead -- a click resolved to the wrong piece after instancing`);
  }
});

// NOTE ON A MUTATION SHAPE DELIBERATELY NOT TESTED HERE, AND WHY: swapping
// which INSTANCE SLOT holds which piece's transform (post-hoc, after
// buildBoardScene has already run) is INVISIBLE to this test, and rightly
// so -- tried first, watched, and removed rather than kept as a hollow
// pass. Two instances in the same group share IDENTICAL geometry, so
// swapping their transforms produces a scene with boxes at the exact same
// two world positions as before; the raycast point is unchanged, and
// pieceAtPoint() -- which reads the board's own independent spatial index,
// never the mesh -- resolves identically either way. That is not a gap in
// this test; it is what the earlier ground-check already established
// (picking never reads mesh/instance identity), confirmed a second way.
// The mutation that WOULD matter is a bug in buildBoardScene's own
// per-instance loop that computes the wrong piece's position (e.g. reusing
// the group's first piece's cell for every instance) -- proven red via a
// real, temporary source edit (BUILD-LOOP's own mutation-proof step,
// reverted after), not as a permanent assertion in this file.
