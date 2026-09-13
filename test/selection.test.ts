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

// BLOCKED, two of three tests, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md) -- both need a real plot
// from public/city-plan.js's generateWorld(), quarantined. selection.js and
// spatial-index.js survive; the third test (an off-plot pick) needs no real
// plot and is unaffected.
const index = buildSpatialIndex({ plots: [] });

test("a pick returns a real plot id that is present in the plan", { skip: "BLOCKED: needs a real plot from a generated plan; public/city-plan.js is quarantined (see file header)" }, () => {});

test("the selection persists as .current until picked again or cleared", { skip: "BLOCKED: needs a real plot from a generated plan; public/city-plan.js is quarantined (see file header)" }, () => {});

test("a pick between plots (a street) still resolves, on-plot false, and does not throw", () => {
  const selection = createSelection(index);
  // Far outside any built land -- open water/void, per addressAt's own
  // "not on a plot" fallback path.
  const picked = selection.pick(200000, 200000);
  assert.equal(picked.onPlot, false);
  assert.equal(picked.plotId, null);
});
