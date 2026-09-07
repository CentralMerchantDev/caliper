// =============================================================================
// BRIDGES AS PIECE CHAINS — BOARD-CONVERSION-PLAN.md P3.3
//
// `roadkit.js`'s bridgeSpan() already builds a real, world-socketed piece;
// this measures it against every real BRIDGES entry rather than assuming
// it works at the world's actual scale.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBridgePieces, verifyBridgeEnds } from "../public/road-network.js";
import { BRIDGES } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));

test("P3.3: every real BRIDGES entry either builds a real piece or is refused BY NAME, with a reason -- nothing silently dropped", () => {
  const { built, refused } = buildBridgePieces(BRIDGES, { heightAt });
  assert.equal(built.length + refused.length, BRIDGES.length, "every bridge must land in exactly one of built/refused");
  assert.ok(built.length > 0, "expected at least one bridge to build cleanly");
  for (const r of refused) {
    assert.ok(typeof r.reason === "string" && r.reason.length > 0, `${r.id} was refused with no reason given`);
  }
});

test("P3.3: refusals are roadkit.js's own real engineering ceiling (800m), not a bug in this pass -- measured, not assumed", () => {
  const { refused } = buildBridgePieces(BRIDGES, { heightAt });
  for (const r of refused) {
    assert.match(r.reason, /exceeds maximum engineering limit \(800m\)/, `${r.id} refused for an unexpected reason: ${r.reason}`);
  }
});

test("P3.3: every built bridge piece carries two real, world-space, mateable sockets", () => {
  const { built } = buildBridgePieces(BRIDGES, { heightAt });
  for (const b of built) {
    assert.equal(b.model.sockets.length, 2, `${b.id} should have exactly 2 sockets (each end), got ${b.model.sockets.length}`);
    for (const s of b.model.sockets) {
      assert.ok(Array.isArray(s.at) && s.at.length === 3, `${b.id} socket missing a real world position`);
      assert.ok(Number.isFinite(s.bearing), `${b.id} socket missing a real bearing`);
      assert.ok(s.width > 0 && s.lanes > 0, `${b.id} socket missing real width/lanes`);
    }
    // The two sockets face opposite directions along the bridge's own line
    // -- the same bearing-opposition verifySocketMating checks everywhere
    // else in this project, checked here directly against the piece's own
    // two ends rather than assumed from bridgeSpan()'s own doc comment.
    const diff = Math.abs(((b.model.sockets[0].bearing - b.model.sockets[1].bearing + 540) % 360) - 180);
    assert.ok(diff < 1e-6, `${b.id}'s own two end sockets are not bearing-opposed (${diff} deg off)`);
  }
});

test("P3.3: verifyBridgeEnds correctly matches a socket placed exactly at a bridge end, and correctly refuses one that is not there", () => {
  const { built } = buildBridgePieces(BRIDGES, { heightAt });
  const sample = built[0];
  const [s0, s1] = sample.model.sockets;
  // A node placed exactly at one real end, facing the opposing bearing --
  // matches. verifyBridgeEnds is exercised directly, not just imported.
  const matching = [{ x: s0.at[0], z: s0.at[2], socket: { at: s0.at, bearing: (s0.bearing + 180) % 360, width: s0.width, lanes: s0.lanes, kind: "road" } }];
  const near = verifyBridgeEnds([sample], matching, 5);
  const ok0 = near.find((r) => r.bridgeId === sample.id);
  assert.ok(ok0, "expected a result for the sample bridge");
  // At least one of the two ends must be within tolerance of the single
  // planted node (the other end is far away and reports no match).
  assert.ok(near.some((r) => r.ok), `expected at least one end to match the planted node, got: ${JSON.stringify(near)}`);

  const empty = verifyBridgeEnds(built, [], 50);
  assert.equal(empty.length, built.length * 2, "one verification attempt per bridge end");
  assert.ok(empty.every((r) => !r.ok && r.reason === "no-road-piece-within-tolerance"), "with no candidate nodes at all, every end must be refused by name, not silently passed");
});
