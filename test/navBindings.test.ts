import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NAV_BINDINGS,
  wheelSegments,
  keyboardOnlyBindings,
  hintText,
  createPoseHistory,
  createSettleTracker,
} from "../public/nav-bindings.js";

test("every binding has a unique id and a label", () => {
  const ids = NAV_BINDINGS.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate binding id");
  for (const b of NAV_BINDINGS) {
    assert.ok(b.label && b.label.length > 0, `${b.id} has no label`);
    assert.ok(b.gestureHint && b.gestureHint.length > 0, `${b.id} has no gestureHint`);
  }
});

test("wheelSegments returns only segment:true bindings, in table order", () => {
  const segs = wheelSegments();
  assert.ok(segs.length >= 4, "expected several wheel segments");
  for (const s of segs) assert.equal(s.segment, true);
  // Modes never appear as wheel segments -- a switch mixed into an action
  // wheel is the confusion Mark named, solved by keeping them out entirely.
  assert.ok(!segs.some((s) => /orbit-mode|walk-mode|drive-mode|fly-mode/.test(s.id)));
});

test("keyboardOnlyBindings is mode-scoped: walk's WASD entry does not leak into drive", () => {
  const walk = keyboardOnlyBindings("walk");
  const drive = keyboardOnlyBindings("drive");
  assert.ok(walk.some((b) => b.id === "walk-move"));
  assert.ok(!drive.some((b) => b.id === "walk-move"));
  assert.ok(drive.some((b) => b.id === "drive-move"));
});

test("hintText mentions pan -- the gap that made #nav-pad-hint stale", () => {
  assert.match(hintText("orbit"), /pan/i);
});

test("hintText is mode-aware: walk mode mentions WASD, orbit mode does not", () => {
  assert.match(hintText("walk"), /WASD/);
  assert.doesNotMatch(hintText("orbit"), /WASD/);
});

test("pose history: rewind returns poses most-recent-first (browser-back)", () => {
  const h = createPoseHistory({ max: 20 });
  h.push("A");
  h.push("B");
  h.push("C");
  assert.equal(h.length, 3);
  assert.equal(h.rewind(), "C");
  assert.equal(h.rewind(), "B");
  assert.equal(h.rewind(), "A");
  assert.equal(h.rewind(), null, "history exhausted, not stuck -- returning null is correct, not a bug");
});

test("pose history caps at max, dropping the oldest entry", () => {
  const h = createPoseHistory({ max: 3 });
  h.push(1);
  h.push(2);
  h.push(3);
  h.push(4);
  assert.equal(h.length, 3, "max is 3 -- the 4th push should have dropped entry 1");
  assert.equal(h.rewind(), 4);
  assert.equal(h.rewind(), 3);
  assert.equal(h.rewind(), 2);
  assert.equal(h.rewind(), null, "entry 1 was dropped when the cap was exceeded");
});

// THE CLASSIC BUG: rewind() moves the camera, the settle-tracker notices the
// camera moved and tries to push the pose it just moved TO -- which is
// exactly the pose rewind() just popped. If that push is not swallowed, it
// lands right back on top of the stack, and the button that is supposed to
// go back appears to do nothing past the first click.
test("rewind does not let its own settle-triggered push refill the stack", () => {
  const h = createPoseHistory({ max: 20 });
  h.push("A");
  h.push("B");
  h.push("C");
  assert.equal(h.length, 3);
  const rewoundTo = h.rewind();
  assert.equal(rewoundTo, "C");
  assert.equal(h.length, 2);
  // Simulate the settle-tracker firing once the camera settles at the
  // rewound-to pose -- this is the exact call sequence createSettleTracker
  // would produce, not a synthetic shortcut.
  h.push(rewoundTo);
  assert.equal(h.length, 2, "the settle-triggered push right after a rewind must be swallowed -- otherwise rewind can never make progress");
  assert.equal(h.rewind(), "B", "the stack must still be B, A underneath -- not re-fed C");
});

test("rewind's push-suppression is exactly one-shot -- normal navigation right after a rewind still records", () => {
  const h = createPoseHistory({ max: 20 });
  h.push("A");
  h.push("B");
  const rewoundTo = h.rewind(); // -> "B", suppression armed
  h.push(rewoundTo); // swallowed, the settle-echo of the rewind itself
  h.push("C"); // a genuine new move after the rewind -- must NOT be swallowed
  assert.equal(h.length, 2, "A, then C");
  assert.equal(h.rewind(), "C");
  assert.equal(h.rewind(), "A");
});

test("settle tracker: one continuous run of changes settling is ONE history entry, not one per update", () => {
  const settled = [];
  const t = createSettleTracker({ settleMs: 400, onSettle: (pose) => settled.push(pose) });
  let now = 0;
  t.update({ lookAtX: 0, lookAtZ: 0, delta: 0, pitch: 0, camDist: 100 }, now);
  // A continuous drag: five updates, each within the settle window of the last.
  for (let i = 1; i <= 5; i++) {
    now += 50;
    t.update({ lookAtX: i, lookAtZ: 0, delta: 0, pitch: 0, camDist: 100 }, now);
  }
  assert.equal(settled.length, 0, "still moving -- must not have settled yet");
  now += 400; // no further change for settleMs
  t.update({ lookAtX: 5, lookAtZ: 0, delta: 0, pitch: 0, camDist: 100 }, now);
  assert.equal(settled.length, 1, "exactly one settle for the whole drag, not five");
  assert.equal(settled[0].lookAtX, 0, "the captured pose is where the drag STARTED, so rewind undoes the whole drag");
});

test("settle tracker: no change at all never settles (nothing to undo)", () => {
  const settled = [];
  const t = createSettleTracker({ settleMs: 400, onSettle: (p) => settled.push(p) });
  const pose = { lookAtX: 0, lookAtZ: 0, delta: 0, pitch: 0, camDist: 100 };
  t.update(pose, 0);
  t.update(pose, 500);
  t.update(pose, 1000);
  assert.equal(settled.length, 0);
});
