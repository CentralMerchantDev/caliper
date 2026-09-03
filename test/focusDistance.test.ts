// The rule that makes double-click-to-focus walk you in rather than teleport.
//
// This test exists because a browser mutation SURVIVED. The check drives the
// real page but stubs the renderer, so when the zoom was turned off in
// focusAtScreen the check stayed green -- it had been measuring the stub's own
// arithmetic and reading that as evidence about the renderer. The rule is now a
// pure function and this is the thing that actually defends it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { focusDistance } from "../public/world-render-3d.js";

test("focusDistance closes the gap by the factor", () => {
  assert.equal(focusDistance(1000, { factor: 0.45, min: 4, max: 46000 }), 450);
  assert.equal(focusDistance(100, { factor: 0.5, min: 4, max: 46000 }), 50);
});

test("repeated focuses walk in geometrically, and reach street level", () => {
  // The claim being defended: a few double-clicks take you from a 4 km
  // overview to something you can stand in, without a single jump.
  let d = 4000;
  const steps: number[] = [];
  for (let i = 0; i < 8; i++) {
    d = focusDistance(d, { factor: 0.45, min: 4, max: 46000 });
    steps.push(Math.round(d));
  }
  assert.deepEqual(steps, [1800, 810, 365, 164, 74, 33, 15, 7]);
  assert.ok(d < 10, `eight focuses should reach street level, got ${d}`);
  // and every step is strictly closer -- no step may move the camera outward
  for (let i = 1; i < steps.length; i++) {
    assert.ok(steps[i] < steps[i - 1], `step ${i} did not close the gap`);
  }
});

test("it never goes closer than the minimum, however many times you focus", () => {
  let d = 500;
  for (let i = 0; i < 50; i++) d = focusDistance(d, { factor: 0.45, min: 4, max: 46000 });
  assert.equal(d, 4);
});

test("it never goes further than the maximum", () => {
  assert.equal(focusDistance(999999, { zoom: false, min: 4, max: 3600 }), 3600);
});

// PAIRED with the first test: turning zoom off must genuinely leave the range
// alone. Without this, a mutation that hard-codes zoom to false would only be
// caught by the walk-in test, and only because the numbers happen to differ.
test("zoom:false leaves the range where it was", () => {
  assert.equal(focusDistance(1000, { zoom: false, min: 4, max: 46000 }), 1000);
  assert.equal(focusDistance(12.5, { zoom: false, min: 4, max: 46000 }), 12.5);
});

test("a nonsense current range falls back rather than propagating NaN", () => {
  // _camDist is undefined before the first frame, and NaN once if a divide
  // slipped. Either must produce a usable number, not poison the camera.
  for (const bad of [undefined, null, NaN, 0, -12, Infinity] as unknown[]) {
    const d = focusDistance(bad as number, { factor: 0.45, min: 4, max: 46000 });
    assert.ok(Number.isFinite(d) && d >= 4, `focusDistance(${String(bad)}) = ${d}`);
  }
});
