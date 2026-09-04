// APPLY AND PERSIST: THE RESULT BECOMES A LAYER, AUTHORED, STORED.
//
// Everything up to here (D1 pick, D2 describe, D4 generate+verify, C2's
// model registry, B1's store) proves its own piece. This is the join: a
// verified model becomes a layer -- referencing the model BY ID, never
// inlining the source -- validated by the already-tested validateLayer,
// added to the world, and saved. An unverified model must never reach any
// of that.

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyAndPersist } from "../public/apply-and-persist.js";
import { createWorld, worldFromJSON } from "../public/world.js";
import { createModelRegistry } from "../public/model-registry.js";
import { createWorldStore, memoryAdapter } from "../public/world-store.js";
import { validateLayer } from "../public/world-model.js";

function verdictFor(source: string) {
  // Built by hand -- no model called -- mirroring what verifyGeneratedGeometry
  // (D4) would have already produced before this step ever runs.
  return { ok: true, stage: null, reason: null, measured: { vertices: 24, triangles: 8, buildMs: 1, drawn: { w: 2.9, d: 2.9 }, declared: { w: 3, d: 3 }, totalMs: 2 } };
}

test("a verified model becomes a layer that references it BY ID, never inlining the source", async () => {
  const world = createWorld({ seed: "prospect-quarter" });
  const registry = createModelRegistry();
  const store = createWorldStore(memoryAdapter());
  const source = "(T) => new T.BoxGeometry(2.9, 3, 2.9) /* a distinctive marker string nothing else in this test contains */";

  const result = await applyAndPersist({
    world, worldId: "w1", registry, store,
    request: { address: "p1", text: "add a small shed" },
    source,
    verdict: verdictFor(source),
    modelId: "shed-1",
    layerId: "layer-1",
    author: "mark",
  });

  assert.equal(result.ok, true, (result as any).reason);
  const layer = (result as any).layer;
  const serialised = JSON.stringify(layer);
  assert.ok(!serialised.includes(source), "the generated source was inlined into the layer instead of referenced by id");
  assert.equal(layer.edits[0].payload.modelId, "shed-1");
  assert.equal(layer.edits[0].address, "p1");
  assert.equal(layer.edits[0].op, "replace");
});

test("the produced layer is valid per validateLayer -- not a special case that happens to work", () => {
  const layer = { id: "layer-1", author: "mark", createdAt: new Date().toISOString(), scope: null, note: null, edits: [{ address: "p1", op: "replace", payload: { modelId: "shed-1" } }] };
  assert.equal(validateLayer(layer), null);
});

test("the layer survives a reload -- store, then rebuild the world from what was stored", async () => {
  const world = createWorld({ seed: "prospect-quarter" });
  const registry = createModelRegistry();
  const store = createWorldStore(memoryAdapter());
  const source = "(T) => new T.BoxGeometry(2.9, 3, 2.9)";

  await applyAndPersist({
    world, worldId: "w1", registry, store,
    request: { address: "p1", text: "add a small shed" },
    verdict: verdictFor(source), modelId: "shed-1", layerId: "layer-1", author: "mark",
  });

  const loaded = await store.load("w1");
  assert.equal(loaded.ok, true, (loaded as any).reason);
  const reloaded = worldFromJSON({ seed: (loaded as any).seed, layers: (loaded as any).layers });
  assert.deepEqual(reloaded.layers.layers(), world.layers.layers(), "the reloaded world's layers do not match what was persisted");
  assert.equal(reloaded.layers.resolve("p1").replace.modelId, "shed-1");
});

test("an unverified model is refused -- never becomes a layer, never gets persisted", async () => {
  const world = createWorld({ seed: "prospect-quarter" });
  const registry = createModelRegistry();
  const store = createWorldStore(memoryAdapter());
  const failedVerdict = { ok: false, stage: "footprint", reason: "declares 3x3 m and draws 40.0x40.0 m" };

  const result = await applyAndPersist({
    world, worldId: "w1", registry, store,
    request: { address: "p1", text: "add a small shed" },
    verdict: failedVerdict, modelId: "shed-1", layerId: "layer-1", author: "mark",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(world.layers.layers(), [], "an unverified model's layer was still added to the world");
  assert.equal(registry.has("shed-1"), false, "an unverified model was still registered");
  const loaded = await store.load("w1");
  assert.equal(loaded.ok, false, "an unverified change was still persisted");
});
