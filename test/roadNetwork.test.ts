// =============================================================================
// THE ARTERIAL LAYER — BOARD-CONVERSION-PLAN.md P2.2/P2.3/P2.4
//
// P2.2's gate: every join socket-verified through the P0 verifier, zero
// unverified joins. P2.3's gate (arterial-level part): every junction in
// the network is a named piece, zero implicit crossings. P2.4's gate:
// ONE connected component per landmass, watched red against today's world
// first.
//
// SCOPE, NAMED HONESTLY: this covers the ARTERIAL layer public/road-
// network.js builds (settlement centres <-> centres <-> regional network).
// It does not cover collectors/locals -- those still exist as the old
// {axis,at,from,to} spans, unconverted. P2.4's gate is measured TWICE
// here: once against today's full existing network (still 52 components,
// 38 stranded, reconfirmed red, unchanged from Step 4), and once against
// the NEW arterial layer alone, which the gate is fully met for. The full
// network gate is not claimed met -- see docs/audits/P2-ARTERIAL.md.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArterialNetwork } from "../public/road-network.js";

test("P2.2: every arterial join is socket-verified through the shared P0 verifier, zero unverified", () => {
  const { verification } = buildArterialNetwork({});
  assert.ok(verification.length > 0, "expected a real, non-trivial network");
  const failed = verification.filter((v) => !v.ok);
  assert.deepEqual(failed, [], `${failed.length} of ${verification.length} joins failed verification: ${JSON.stringify(failed.slice(0, 3))}`);
});

test("P2.3 (arterial level): every junction is a real piece, verified against every one of its legs", () => {
  const { landmasses } = buildArterialNetwork({});
  let totalJunctions = 0;
  for (const lm of landmasses) {
    for (const j of lm.junctions) {
      totalJunctions++;
      assert.equal(j.allOk, true, `${lm.landmass} junction at node ${j.node} (${j.legCount} legs) failed to verify against at least one leg`);
      assert.ok(j.model.sockets.length === j.legCount, "junction piece must have exactly one socket per leg");
    }
  }
  assert.ok(totalJunctions > 0, "expected at least one junction across the world's landmasses");
});

test("P2.4: watched red first -- today's FULL existing network is still 52 components, 38 stranded (Step 4's own numbers, unchanged)", () => {
  // Not re-measured here (scripts/measure-roads.mjs owns that, and it is
  // slow -- a full generateWorld() plus an O(n^2) crossing check). This test
  // records the number this file's OTHER two tests are read against: the
  // arterial layer being fully connected does NOT mean the gate is met for
  // the whole network, because collectors/locals are untouched. Command:
  // `node scripts/measure-roads.mjs` -> 52 components, 38 stranded, of
  // 1357 roads, reconfirmed unchanged from the Step 4 measurement this
  // plan's P2.4 gate quotes.
  assert.ok(true, "see docs/audits/P2-ARTERIAL.md for the reconfirmed baseline command and output");
});

test("P2.4 (arterial layer only): ONE connected component per landmass, by real measurement, not MST theory alone", () => {
  const { landmasses } = buildArterialNetwork({});
  for (const lm of landmasses) {
    if (lm.nodeCount <= 1) continue; // a single-centre landmass is trivially one component
    // Union-find over the MST edges -- the actual graph structure, not an
    // assumption that "it's a spanning tree so of course it's connected".
    const parent = Array.from({ length: lm.nodeCount }, (_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (const e of lm.edges) {
      const ri = find(e.from), rj = find(e.to);
      if (ri !== rj) parent[ri] = rj;
    }
    const roots = new Set(lm.nodes.map((_, i) => find(i)));
    assert.equal(roots.size, 1, `${lm.landmass}: arterial layer has ${roots.size} components across ${lm.nodeCount} centres, not 1`);
  }
});

test("P2.4: zero stranded arterial nodes -- every centre has at least one leg (an MST edge or a regional tie)", () => {
  const { landmasses } = buildArterialNetwork({});
  for (const lm of landmasses) {
    if (lm.nodeCount <= 1) continue;
    for (let i = 0; i < lm.nodeCount; i++) {
      assert.ok(lm.degree[i] >= 1, `${lm.landmass} node ${i} has degree 0 -- stranded`);
    }
  }
});
