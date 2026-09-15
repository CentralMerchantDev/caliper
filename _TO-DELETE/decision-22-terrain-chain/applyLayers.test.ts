// LAYERS APPLY TO THE PLAN, TOUCHING ONLY WHAT THEY TOUCH.
//
// planCity can produce 19,874 placements. A player's layer edits a handful of
// them. The property that matters is not "the edit is visible" -- a function
// that re-resolved every single placement against the layer stack would also
// make the edit visible, correctly, and cost O(plots) on every single frame a
// world with layers is drawn. The actual guard is that untouched placements
// are not just unchanged, they are not even LOOKED AT: world.resolve() is
// called exactly once per touched address, never once per placement.

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyLayers } from "../public/apply-layers.js";
import { createWorld } from "../public/world.js";
import { layerFrom } from "../public/world-model.js";

function fakePlacements(n: number) {
  return Array.from({ length: n }, (_, i) => ({ plotId: `p${i}`, typology: "bld-villa", options: {} }));
}

test("an edit changes exactly its own object and nothing else", () => {
  const placements = fakePlacements(5);
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p2", op: "retint", payload: { color: 0xff0000 } }] }));

  const out = applyLayers(placements, world);
  for (let i = 0; i < placements.length; i++) {
    if (i === 2) {
      assert.notEqual(out[i], placements[i], "the touched placement was not replaced");
      assert.deepEqual((out[i] as any).override.retint, { color: 0xff0000 });
    } else {
      // Reference equality, not deep equality -- an untouched placement must
      // be the EXACT SAME OBJECT, proving it was never even copied, let alone
      // re-resolved.
      assert.equal(out[i], placements[i], `placement ${i} was touched when its address was not edited`);
    }
  }
});

test("resolve is called exactly once per touched address, never once per placement", () => {
  const placements = fakePlacements(1000);
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p500", op: "retint", payload: { color: 1 } }] }));

  let calls = 0;
  const realResolve = world.resolve;
  (world as any).resolve = (address: string) => { calls++; return realResolve(address); };

  applyLayers(placements, world);
  assert.equal(calls, 1, `resolve was called ${calls} times for 1 touched address out of 1000 placements`);
});

test("a removed address is marked removed, not silently kept", () => {
  const placements = fakePlacements(3);
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p1", op: "remove" }] }));

  const out = applyLayers(placements, world);
  assert.equal((out[1] as any).removed, true);
  assert.equal(out[0], placements[0]);
  assert.equal(out[2], placements[2]);
});

test("an edit addressing something outside this placement set is not an error", () => {
  // A layer can touch a park, a road, or anything else with an address --
  // not every address is a building placement. applyLayers is handed one
  // slice of the drawable world at a time and must not assume its slice is
  // the whole plan.
  const placements = fakePlacements(3);
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "road-42", op: "remove" }] }));

  assert.doesNotThrow(() => applyLayers(placements, world));
  const out = applyLayers(placements, world);
  assert.deepEqual(out, placements);
});

test("no touched addresses at all returns the identical array, not a copy", () => {
  const placements = fakePlacements(3);
  const world = createWorld({ seed: "x" });
  const out = applyLayers(placements, world);
  assert.equal(out, placements, "a world with no layers still allocated a new array");
});
