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

// THREE MUTATIONS SURVIVED THIS FILE AND THESE ARE THEM.
//
// A blind audit removed the max clamp from the ZOOM path, changed the `max`
// default from Infinity to 3600, and changed the NaN fallback from 48 to 4800 --
// all three stayed green. Every one is a behaviour the docstring argues for at
// length, so the file was defending its prose and not its code.

test("the maximum clamps the zoom path too, not only zoom:false", () => {
  // A focus that starts beyond the limit must come back inside it. Only the
  // zoom:false branch was covered, so deleting Math.min from the other one --
  // the branch every real call takes -- changed nothing any test could see.
  assert.equal(focusDistance(20000, { factor: 0.45, min: 4, max: 5000 }), 5000);
  assert.equal(focusDistance(9000, { factor: 0.9, min: 4, max: 6000 }), 6000);
});

test("max defaults to Infinity, so a city camera is not clamped to a village", () => {
  // The docstring spends five lines on why this default is Infinity: at 3600 --
  // the village limit -- any caller that forgot to pass `max` silently clamped a
  // 46 km city camera to 3.6 km, and nothing would have said so.
  assert.equal(focusDistance(40000, { zoom: false }), 40000);
  assert.equal(focusDistance(40000, { factor: 0.5 }), 20000);
});

test("the fallback for a nonsense range is a sane 48, not an arbitrary number", () => {
  // Value, not just finiteness. The existing NaN test only asserted the result
  // was >= min, which 4800 satisfies as happily as 48 does.
  assert.equal(focusDistance(NaN, { zoom: false, min: 4 }), 48);
  assert.equal(focusDistance(undefined as unknown as number, { zoom: false, min: 4 }), 48);
  assert.equal(focusDistance(0, { zoom: false, min: 4 }), 48);
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
