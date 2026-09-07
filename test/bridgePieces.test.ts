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
    // The two sockets face opposite directions along the bridge's own line.
    // NOT `verifySocketMating(s0, s1)` directly -- that function ALSO
    // requires position coincidence (it verifies two ADJACENT pieces'
    // touching sockets), which does not apply to a single bridge's own two
    // ends, hundreds of metres apart; calling it directly throws a
    // "position mismatch" on every real bridge regardless of bearing.
    // This extracts just `verifySocketMating`'s own bearing-opposition
    // half (`target = sockA.bearing + 180`, compare `sockB.bearing`
    // against it) rather than re-deriving a formula independently. A
    // first version of this test DID re-derive one independently and got
    // the sign backwards (compared the raw bearing DIFFERENCE against 180
    // directly, asserting it near zero) -- a genuinely correct, opposed
    // pair produces that difference AT 180, not near 0, so the test was
    // inverted: it would have PASSED two sockets facing the SAME direction
    // (the literal floating-edge defect this test exists to catch) and
    // FAILED every real, correct bridge. Caught by a blind audit re-
    // deriving the canonical check from `verifySocketMating`'s own source
    // rather than trusting the comment beside the old formula.
    const [s0, s1] = b.model.sockets;
    const target = (s0.bearing + 180) % 360;
    const bearingDiff = Math.abs(((s1.bearing - target + 540) % 360) - 180);
    assert.ok(bearingDiff < 1e-6, `${b.id}'s own two end sockets are not bearing-opposed (${bearingDiff} deg off)`);
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

test("P3.3: verifyBridgeEnds tries every candidate within tolerance, not just the single nearest one", () => {
  // A blind-audit finding: the first version picked the candidate closest
  // by raw XZ distance and tried only that one. A closer candidate whose
  // own socket does not actually mate (wrong bearing) would be reported as
  // the match attempt, hiding a real, slightly-farther candidate that DOES
  // mate. Constructed here rather than relied on from real data (the real
  // world currently has no matching candidates at all, so this scenario
  // cannot be observed there).
  const { built } = buildBridgePieces(BRIDGES, { heightAt });
  const sample = built[0];
  const [s0] = sample.model.sockets;
  const closeButWrong = { x: s0.at[0], z: s0.at[2], socket: { at: s0.at, bearing: s0.bearing, width: s0.width, lanes: s0.lanes, kind: "road" } };
  const farButRight = { x: s0.at[0] + 3, z: s0.at[2] + 3, socket: { at: s0.at, bearing: (s0.bearing + 180) % 360, width: s0.width, lanes: s0.lanes, kind: "road" } };
  const result = verifyBridgeEnds([sample], [closeButWrong, farButRight], 10);
  assert.ok(result.some((r) => r.ok), `expected the correctly-mating candidate to be found despite ranking farther by raw distance, got: ${JSON.stringify(result)}`);
});
