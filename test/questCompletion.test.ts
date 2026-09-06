// "CHANGE SOMETHING IN THE WORLD" COMPLETES BECAUSE SOMETHING CHANGED.
//
// This is named as the single most important mutation in Phase E: a quest
// that completes on a flag is a cutscene. Setting a UI flag is free and
// proves nothing about the world; the only thing that can honestly complete
// this quest is the world's own layer stack actually holding an edit.

import { test } from "node:test";
import assert from "node:assert/strict";

import { questState, evaluateQuest } from "../public/quest.js";
import { changeSomethingQuest } from "../public/change-quest.js";
import { createWorld } from "../public/world.js";
import { layerFrom } from "../public/world-model.js";
import { buildWorldState } from "../public/city-render.js";

test("questState's new 'changed' field is empty by default -- existing callers are unaffected", () => {
  // No 5th argument at all -- every call site before tonight looked like this.
  const state = questState({ plots: [], blocks: [], districts: [], settlements: [], bridges: [] });
  assert.deepEqual(state.changed, { touchedAddresses: [], layerCount: 0 });
});

test("setting a UI flag, with no real edit, does NOT complete the quest", () => {
  const world = createWorld({ seed: "x" });
  // The temptation this quest exists to refuse: a UI-only signal with
  // nothing behind it in the world. changeSomethingQuest's check never even
  // receives this -- QUEST_STATE_FIELDS does not include a flag field at
  // all -- but it is exercised here via a snapshot built exactly as a naive
  // implementation would have been tempted to build it, with no layers.
  const state = questState(world.plan, { mode: "editing" }, {}, {}, null);
  const verdict = evaluateQuest(changeSomethingQuest, state);
  assert.equal(verdict.done, false, "a quest completed with no world edit behind it");
});

test("a real edit to the world -- an actual layer -- completes the quest", () => {
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p1", op: "retint", payload: { color: 0xff0000 } }] }));

  const state = questState(world.plan, {}, {}, {}, world.layers);
  const verdict = evaluateQuest(changeSomethingQuest, state);
  assert.equal(verdict.done, true, verdict.reason || "");
});

// I7: THE SAME PROOF, AGAINST THE REAL LIVE WORLD, NOT A TWO-PLOT FIXTURE.
//
// The test above proves the mechanism with a toy seed and a made-up plot id
// ("p1") that was never checked against a real plot -- correct about the
// LOGIC, silent about whether it holds up against the real 26 km city I6
// wires a layer into. This targets a real plot from buildWorldState()'s own
// production seed (the same pattern test/runGenerateRequest.test.ts's own
// I5 end-to-end test already established for exactly this reason), through
// the same instance I6's apply/persist/undo path actually uses.
test("a real edit against the real production world -- not a toy fixture -- completes the quest", () => {
  const { instance, world } = buildWorldState();
  const realPlot = world.plots.find((p: any) => p.className !== "PARK");
  assert.ok(realPlot, "setup: no real plot found in the production world");

  const before = questState(instance.plan, {}, {}, {}, instance.layers);
  assert.equal(evaluateQuest(changeSomethingQuest, before).done, false, "the quest reads as complete before any edit exists");

  const added = instance.layers.add(layerFrom({
    id: "i7-real-edit", author: "i7-test",
    edits: [{ address: realPlot.id, op: "retint", payload: { color: 0xff0000 } }],
  }));
  assert.equal(added.ok, true, JSON.stringify(added));

  const after = questState(instance.plan, {}, {}, {}, instance.layers);
  const verdict = evaluateQuest(changeSomethingQuest, after);
  assert.equal(verdict.done, true, verdict.reason || "");
});

test("the quest check itself never receives anything shaped like a UI flag", () => {
  // QUEST_STATE_FIELDS is the model's own contract for what a generated
  // check may rely on -- this asserts changeSomethingQuest's check function
  // source does not reference the word "flag" or "mode" at all, so a
  // reviewer (or a future generated quest copying this one) cannot even see
  // a flag-shaped field to complete on.
  const src = changeSomethingQuest.check.toString();
  assert.doesNotMatch(src, /\bflag\b/i);
  assert.doesNotMatch(src, /player\.mode/);
});
