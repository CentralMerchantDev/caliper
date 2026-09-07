// =============================================================================
// THE ROAD KIT — socket mating is the contract every placed piece depends on.
//
// verifySocketMating()'s own header comment claimed it checks that two sockets
// "face each other (bearing diff 180 deg)" as well as matching width/lanes.
// The function itself only read kind, width and lanes -- it never touched
// `.at` or `.bearing` on either socket. It would pass two pieces a kilometre
// apart pointing the same way. Found by BOARD-CONVERSION-PLAN.md P0's audit,
// reading the body instead of the comment.
//
// These tests are the gate P0.1 asks for: a verifier watched rejecting bad
// input, not just a claim that it does.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { straight, transformSocket, verifySocketMating } from "../public/roadkit.js";
import { buildDemoStreet } from "../public/roadkit-street-demo.js";

const ROAD = { kind: "road", width: 8, lanes: 2 };

test("verifySocketMating passes two sockets that are coincident and opposed", () => {
  const a = { ...ROAD, at: [0, 0, 0], bearing: 0 };
  const b = { ...ROAD, at: [0, 0, 0], bearing: 180 };
  assert.equal(verifySocketMating(a, b), true);
});

test("verifySocketMating rejects two dimensionally-compatible sockets at different positions", () => {
  const a = { ...ROAD, at: [0, 0, 0], bearing: 0 };
  const farAway = { ...ROAD, at: [0, 0, 1000], bearing: 180 };
  assert.throws(() => verifySocketMating(a, farAway), /position/i);
});

test("verifySocketMating rejects two coincident sockets facing the same way", () => {
  const a = { ...ROAD, at: [0, 0, 0], bearing: 0 };
  const sameWay = { ...ROAD, at: [0, 0, 0], bearing: 0 };
  assert.throws(() => verifySocketMating(a, sameWay), /bearing/i);
});

test("the exact regression named in the plan: a kilometre apart, pointing the same way, dimensionally identical", () => {
  const a = transformSocket(straight("STREET", 1).sockets[1], { x: 0, z: 0, rotationDeg: 0 });
  const b = transformSocket(straight("STREET", 1).sockets[0], { x: 0, z: 1000, rotationDeg: 0 });
  assert.throws(() => verifySocketMating(a, b));
});

test("two straight pieces placed to chain correctly do mate", () => {
  const a = straight("STREET", 1);
  const b = straight("STREET", 1);
  const aExit = transformSocket(a.sockets[1], { x: 0, z: 0, rotationDeg: 0 });
  // b's entry socket lands exactly on a's exit -- b is 1 module (8m) long, so
  // its own entry socket sits 4m behind its centre.
  const bEntry = transformSocket(b.sockets[0], { x: aExit.at[0], z: aExit.at[2] + 4, rotationDeg: 0 });
  assert.equal(verifySocketMating(aExit, bEntry), true);
});

test("P0.2: the 7-piece street chain mates through the shared verifier, zero error at all 6 joins", () => {
  const { verification } = buildDemoStreet();
  assert.equal(verification.length, 6);
  for (const v of verification) {
    assert.equal(v.error, null);
    assert.equal(v.ok, true);
    assert.ok(v.positionErrorM < 1e-6, `positionErrorM ${v.positionErrorM} not < 1e-6`);
    assert.ok(v.bearingDiffFrom180 < 1e-6, `bearingDiffFrom180 ${v.bearingDiffFrom180} not < 1e-6`);
  }
});
