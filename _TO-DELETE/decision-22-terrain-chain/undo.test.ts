// UNDO IS DROPPING A LAYER -- PROVEN END TO END, NOT JUST AT THE MODEL LEVEL.
//
// world-model.js's remove() already proves "drop exactly this layer's edits,
// leave every other author's work standing" in isolation
// (test/worldModel.test.ts). The gap that isolation cannot see is
// persistence: a removal that only happens in memory and is never re-saved
// would look like undo worked, right up until the next reload brought the
// "removed" layer straight back. That is the actual failure this proves
// does not happen.

import { test } from "node:test";
import assert from "node:assert/strict";

import { undoLayer } from "../public/undo.js";
import { createWorld, worldFromJSON } from "../public/world.js";
import { createWorldStore, memoryAdapter } from "../public/world-store.js";
import { layerFrom } from "../public/world-model.js";

async function twoAuthorWorld() {
  const world = createWorld({ seed: "prospect-quarter" });
  const store = createWorldStore(memoryAdapter());
  world.layers.add(layerFrom({ id: "mark-1", author: "mark", edits: [{ address: "p1", op: "retint", payload: { color: 0xff0000 } }] }));
  world.layers.add(layerFrom({ id: "mark-2", author: "mark", edits: [{ address: "p2", op: "move", payload: { x: 5, z: 5 } }] }));
  world.layers.add(layerFrom({ id: "jess-1", author: "jess", edits: [{ address: "p3", op: "retint", payload: { color: 0x00ff00 } }] }));
  await store.save("w1", world.toJSON());
  return { world, store };
}

test("undo removes exactly that layer's edits, and leaves every other author's work standing, end to end", async () => {
  const { world, store } = await twoAuthorWorld();

  const result = await undoLayer(world, "w1", "mark-2", store);
  assert.equal(result.ok, true, (result as any).reason);

  assert.equal(world.resolve("p2").removed, false);
  assert.equal(world.resolve("p2").move, undefined, "the undone layer's edit is still resolving");
  assert.equal(world.resolve("p1").retint.color, 0xff0000, "an unrelated layer by the SAME author was also removed");
  assert.equal(world.resolve("p3").retint.color, 0x00ff00, "another author's work was disturbed by someone else's undo");
});

test("the undo survives a reload -- it was not only removed in memory", async () => {
  const { world, store } = await twoAuthorWorld();
  await undoLayer(world, "w1", "mark-2", store);

  const loaded = await store.load("w1");
  assert.equal(loaded.ok, true, (loaded as any).reason);
  const reloaded = worldFromJSON({ seed: (loaded as any).seed, layers: (loaded as any).layers });

  assert.equal(reloaded.layers.layers().some((l: any) => l.id === "mark-2"), false, "the undone layer came back after a reload");
  assert.equal(reloaded.layers.layers().length, 2, "the reload did not have exactly the two surviving layers");
  assert.equal(reloaded.resolve("p1").retint.color, 0xff0000);
  assert.equal(reloaded.resolve("p3").retint.color, 0x00ff00);
});

test("undoing a layer that does not exist is refused, not silently a no-op success", async () => {
  const { world, store } = await twoAuthorWorld();
  const result = await undoLayer(world, "w1", "no-such-layer", store);
  assert.equal(result.ok, false);
  assert.equal(world.layers.layers().length, 3, "a failed undo still changed the layer stack");
});
