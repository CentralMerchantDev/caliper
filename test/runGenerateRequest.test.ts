// I5 -- THE REQUEST PATH, END TO END, WITH AN INJECTED MODEL CALLER.
// BUILT AND STUB-PROVEN. NO MODEL IS EVER CALLED IN THIS FILE.
//
// public/run-generate-request.js composes D3 (assessTransform), D4
// (buildGeometryPrompt/verifyGeneratedGeometry) and an INJECTED caller --
// production passes public/model-caller.js's productionModelCaller (which
// cannot spend anything: it throws, because no live route exists yet);
// every test here passes a stub. Two properties, not one:
//
//   1. THE MONEY GUARD. A refused transform must never reach the caller.
//      Checked by the stub's CALL COUNT, never by its outcome -- an
//      outcome-only assertion passes whether or not the call was made,
//      which is exactly the gap that let a broken feature ship elsewhere
//      tonight with its gate "proved" and nothing actually exercising it.
//
//   2. THE POSITIVE CASE, END TO END. Every D-phase test in this repo up to
//      now proves a REFUSAL. Proving only refusals is a genuine gap: it
//      never asserts that a good answer is found and actually usable. So
//      this proves the other half -- a stubbed VALID model response is
//      verified, registered, applied as a real layer, persisted, reloaded,
//      and RESOLVES to the real geometry when the scene is built (I2's own
//      mechanism) -- not just that verifyModelSource said ok:true.

import { test } from "node:test";
import assert from "node:assert/strict";

import { runGenerateRequest } from "../public/run-generate-request.js";
import { requirements } from "../public/transform.js";
import { createGround } from "../public/ground.js";
import { createModelRegistry } from "../public/model-registry.js";
import { applyAndPersist } from "../public/apply-and-persist.js";
import { createWorld, worldFromJSON } from "../public/world.js";
import { createWorldStore, memoryAdapter } from "../public/world-store.js";
import { buildWorldState, buildScenePlacements } from "../public/city-render.js";
import { resolveOverrideModels } from "../public/resolve-models.js";

// The same deterministic fixtures test/generateRequest.test.ts already
// established for D3/D4 -- dry land at x < -100, harbour water at
// -100 <= x < 100, deep water beyond. No model is called anywhere here; the
// "response" in every test below is a hand-written string or a counting stub.
const heightAt = (x: number) => (x < -100 ? 12 : x < 100 ? -3 : -14);
const land = createGround({ heightAt });
const boat = { id: "boat-1", label: "the fishing boat", x: 0, z: 0, footprint: { w: 4, d: 12 } };
const shed = { id: "shed-1", label: "the old shed", x: -200, z: 0, footprint: { w: 3, d: 3 } };
const evaluate = (src: string) => new Function(`"use strict"; return (${src});`)();
const THREE = {
  BoxGeometry: class {
    attributes: any; boundingBox: any; __box: any;
    constructor(w: number, h: number, d: number) {
      this.attributes = { position: { count: 24 } };
      this.__box = { w, d };
    }
    computeBoundingBox() {
      const { w, d } = this.__box;
      this.boundingBox = { min: { x: -w / 2, z: -d / 2 }, max: { x: w / 2, z: d / 2 } };
    }
  },
};

function countingStub(returns: string | null) {
  const calls: any[] = [];
  const caller = async (prompt: any) => {
    calls.push(prompt);
    if (returns === null) throw new Error("stub should never have been called");
    return returns;
  };
  return { caller, calls };
}

test("I5 money guard: a refused transform never reaches the caller -- checked by call count, not outcome", async () => {
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const { caller, calls } = countingStub(null); // throws if ever called -- the count assertion below is the real guard, this is a belt
  const result = await runGenerateRequest({
    subject: boat, want, request: { address: "boat-1", text: "make it a cruise ship" }, land, caller, evaluate, THREE,
  });
  assert.equal(result.ok, false);
  assert.equal(result.stage, "prompt", "refused for the wrong reason -- it should have been refused before a prompt, not after");
  assert.equal(calls.length, 0, "the model caller was invoked for a transform the ground had already refused -- this is the mutation that guards real money");
});

test("I5 positive case: a stubbed valid model response is verified", async () => {
  const want = { label: "a small shed", ...requirements({ footprint: { w: 3, d: 3 }, support: "ground" }) };
  const { caller, calls } = countingStub("(T) => new T.BoxGeometry(2.5, 3, 2.5)");
  const result = await runGenerateRequest({
    subject: shed, want, request: { address: "shed-1", text: "add a small shed" }, land, caller, evaluate, THREE,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.verdict.ok, true, result.verdict.reason);
  assert.equal(calls.length, 1, "a transform the ground approved should call the model exactly once");
});

test("I5 end to end: a verified model reaches the scene, not just verifyModelSource", async () => {
  // The assessment/verify half uses the deterministic D3/D4 fixture (above);
  // the "reaches the scene" half needs a REAL plot address a real world
  // actually resolves -- the two concerns are independent, so this borrows
  // a real plotId from the real generated plan rather than re-deriving one.
  const { world, heightAt: realHeightAt } = buildWorldState("i5-end-to-end-seed");
  const realPlot = world.plots.find((p: any) => p.className !== "PARK");
  assert.ok(realPlot, "setup: no real plot found to target");

  const want = { label: "a small shed", ...requirements({ footprint: { w: 3, d: 3 }, support: "ground" }) };
  const source = "(T) => new T.BoxGeometry(2.5, 3, 2.5)";
  const { caller } = countingStub(source);
  const result = await runGenerateRequest({
    subject: shed, want, request: { address: realPlot.id, text: "add a small shed" }, land, caller, evaluate, THREE,
  });
  assert.equal(result.ok, true, JSON.stringify(result));

  const registry = createModelRegistry();
  const instance = createWorld({ seed: "i5-end-to-end-seed" });
  const store = createWorldStore(memoryAdapter());
  const persisted = await applyAndPersist({
    world: instance, worldId: "i5-world", registry, store,
    request: { address: realPlot.id }, source, verdict: result.verdict,
    modelId: "i5-generated-shed", layerId: "i5-layer", author: "i5-test",
  });
  assert.equal(persisted.ok, true, JSON.stringify(persisted));

  // SURVIVES A RELOAD -- not just true in the same in-memory instance that
  // just wrote it (the exact gap D8's own undo test was written to catch).
  const loaded = await store.load("i5-world");
  assert.equal(loaded.ok, true, JSON.stringify(loaded));
  const reloaded = worldFromJSON({ seed: (loaded as any).seed, layers: (loaded as any).layers });

  const { overridden } = buildScenePlacements({ instance: reloaded, world: reloaded.plan, heightAt: realHeightAt });
  const targetPlacement = overridden.find((p: any) => p.plotId === realPlot.id);
  assert.ok(targetPlacement, "the generated model's plot never left its instance group after reload -- it would not be drawn at all");

  const reloadedRegistry = createModelRegistry();
  reloadedRegistry.register("i5-generated-shed", result.verdict);
  const { resolved, refused } = resolveOverrideModels([targetPlacement], reloadedRegistry);
  assert.equal(refused.length, 0, JSON.stringify(refused));
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].model.geometry, result.verdict.geometry, "the placement did not resolve to the SAME verified geometry the model call produced");
});
