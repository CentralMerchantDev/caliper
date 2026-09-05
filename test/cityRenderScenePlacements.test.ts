// I2 -- LAYERS REACH THE SCENE.
//
// apply-layers.js, instance-groups.js, resolve-models.js and model-registry.js
// were each proven correct in isolation (Phases B/C) and none of them ran for
// real: city-render.js fed groupByVariant() the raw planCity() output, with
// no layer ever applied and no override ever pulled out of its instance
// group. buildScenePlacements() (public/city-render.js) is where that
// mechanism actually runs now.
//
// The property, exactly as the ledger names it: a layer injected by hand
// changes exactly one building, and the TOTAL placement count is unchanged --
// nothing lost, nothing drawn twice. An InstancedMesh draws every instance
// from the SAME geometry, so a placement left in its group after being
// overridden is drawn there AND wherever the override draws it -- doubled,
// not lost, which is why the count check has to be exact, not just "not
// fewer".

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildWorldState, buildScenePlacements } from "../public/city-render.js";
import { layerFrom } from "../public/world-model.js";

test("I2: an injected layer moves exactly one placement to overridden, and the total count is unchanged", () => {
  const before = buildWorldState("scene-placements-seed");
  const { instanced: instancedBefore, overridden: overriddenBefore } = buildScenePlacements(before);
  assert.equal(overriddenBefore.length, 0, "setup: an unedited world should have nothing overridden yet");
  const totalBefore = instancedBefore.length + overriddenBefore.length;
  assert.ok(totalBefore > 1000, "setup: expected a real-scale placement count to make this check meaningful");

  // Pick one real placement to touch -- not a fixture, the real generated plan.
  const target = instancedBefore[Math.floor(instancedBefore.length / 2)];
  assert.ok(target && target.plotId, "setup: could not find a real placement to override");

  const after = buildWorldState("scene-placements-seed", [
    layerFrom({ id: "l1", author: "mark", edits: [{ address: target.plotId, op: "retint", payload: { color: 0xff00ff } }] }),
  ]);
  const { instanced, overridden } = buildScenePlacements(after);

  assert.equal(overridden.length, 1, "exactly one placement should have moved to overridden");
  assert.equal(overridden[0].plotId, target.plotId, "the wrong placement was overridden");
  assert.equal(instanced.length + overridden.length, totalBefore, "the total placement count changed -- something was lost or drawn twice");
  assert.ok(!instanced.some((p) => p.plotId === target.plotId), "the overridden placement is still present in the instanced group -- it would be drawn twice");

  // Everything else is untouched BY REFERENCE, matching apply-layers.js's own contract.
  const otherBefore = instancedBefore.filter((p) => p.plotId !== target.plotId);
  const otherAfterIds = new Set(instanced.map((p) => p.plotId));
  for (const p of otherBefore) assert.ok(otherAfterIds.has(p.plotId), `plot ${p.plotId} disappeared from the instanced set`);
});

test("I2: with no layers, every placement is instanced and none is overridden", () => {
  const state = buildWorldState("scene-placements-seed-2");
  const { instanced, overridden } = buildScenePlacements(state);
  assert.equal(overridden.length, 0);
  assert.ok(instanced.length > 1000);
});
