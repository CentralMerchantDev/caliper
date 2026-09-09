import { test } from "node:test";
import assert from "node:assert/strict";
import { trackLiveRect } from "../public/live-position.js";

// Node has neither ResizeObserver nor `window` -- trackLiveRect's own
// `typeof` guards skip both branches harmlessly, leaving the immediate
// measure() call and the poll interval as the parts this environment can
// actually exercise. That is real coverage of the property that matters
// most (the fix for the bug this file exists to prevent a third copy of):
// measurement keeps happening on a timer, not once at setup.
function fakeElement(rectSequence) {
  let i = 0;
  return {
    getBoundingClientRect() {
      const r = rectSequence[Math.min(i, rectSequence.length - 1)];
      i++;
      return r;
    },
  };
}

test("measures immediately on call, before any timer fires", () => {
  const calls = [];
  const el = fakeElement([{ left: 10, top: 20 }]);
  const handle = trackLiveRect(el, (r) => calls.push(r));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { left: 10, top: 20 });
  handle.stop();
});

test("keeps measuring on a poll, so a moved (not resized) element is caught", (t, done) => {
  const calls = [];
  const el = fakeElement([{ left: 0, top: 0 }, { left: 50, top: 0 }, { left: 50, top: 0 }]);
  const handle = trackLiveRect(el, (r) => calls.push(r), { pollMs: 10 });
  setTimeout(() => {
    handle.stop();
    assert.ok(calls.length >= 2, `expected at least 2 measurements, got ${calls.length}`);
    assert.deepEqual(calls[0], { left: 0, top: 0 });
    assert.deepEqual(calls[1], { left: 50, top: 0 }, "a plain move (no resize) must still be picked up by the poll");
    done();
  }, 35);
});

test("stop() ends the poll -- no measurements after stopping", (t, done) => {
  const calls = [];
  const el = fakeElement([{ left: 0, top: 0 }]);
  const handle = trackLiveRect(el, (r) => calls.push(r), { pollMs: 10 });
  setTimeout(() => {
    handle.stop();
    const countAtStop = calls.length;
    setTimeout(() => {
      assert.equal(calls.length, countAtStop, "measure() ran after stop() -- the interval was not actually cleared");
      done();
    }, 40);
  }, 15);
});

test("a null element is inert, not a throw", () => {
  const handle = trackLiveRect(null, () => { throw new Error("must not be called"); });
  handle.stop(); // must not throw
});

test("a non-function onMeasure is inert, not a throw", () => {
  const el = fakeElement([{ left: 0, top: 0 }]);
  const handle = trackLiveRect(el, undefined);
  handle.stop(); // must not throw
});
