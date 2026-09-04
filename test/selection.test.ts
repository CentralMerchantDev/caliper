// A CLICK RESOLVES TO AN ADDRESS, AND STAYS SELECTED.
//
// spatial-index.js's addressAt already answers "what is at this point" --
// this only adds the STATE a UI needs: what is currently picked, so a
// selection outlives the single click that made it and D2's description box
// can be scoped to it. Nothing here re-derives addressing; it is a thin
// wrapper the way world.js is a thin wrapper over generateWorld/LandField.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createSelection } from "../public/selection.js";
import { buildSpatialIndex } from "../public/spatial-index.js";
import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const plan = generateWorld(heightAt);
const index = buildSpatialIndex(plan);

test("a pick returns a real plot id that is present in the plan", () => {
  const plot = plan.plots.find((p: any) => p.className !== "PARK") as any;
  assert.ok(plot, "no non-park plot in the real plan to pick");
  const cx = (plot.xMin + plot.xMax) / 2, cz = (plot.zMin + plot.zMax) / 2;

  const selection = createSelection(index);
  const picked = selection.pick(cx, cz);

  assert.equal(picked.plotId, plot.id);
  assert.ok(plan.plots.some((p: any) => p.id === picked.plotId), "the picked id is not a real plot in the plan");
});

test("the selection persists as .current until picked again or cleared", () => {
  const plot = plan.plots[0] as any;
  const cx = (plot.xMin + plot.xMax) / 2, cz = (plot.zMin + plot.zMax) / 2;
  const selection = createSelection(index);

  assert.equal(selection.current, null, "a fresh selection was not empty");
  selection.pick(cx, cz);
  assert.equal(selection.current.plotId, plot.id);
  selection.clear();
  assert.equal(selection.current, null, "clear() did not clear the selection");
});

test("a pick between plots (a street) still resolves, on-plot false, and does not throw", () => {
  const selection = createSelection(index);
  // Far outside any built land -- open water/void, per addressAt's own
  // "not on a plot" fallback path.
  const picked = selection.pick(200000, 200000);
  assert.equal(picked.onPlot, false);
  assert.equal(picked.plotId, null);
});
