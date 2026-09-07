// A GENERATED MODEL IS REGISTERED BY ID, AND AN UNKNOWN ID IS REFUSED -- NOT
// DRAWN AS A DEFAULT SHAPE.
//
// model-forge.js already proves a generated model is real: it compiles,
// builds, fits its declared footprint, and is deterministic. This is what
// happens after that -- a verified model gets a name a layer can reference,
// and if a layer references a name nothing verified ever claimed, the
// correct answer is to refuse and say which id, not to quietly draw
// something else in its place. A default box standing in for "we don't
// actually have this" is a lie with geometry.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createModelRegistry } from "../public/model-registry.js";
import { resolveOverrideModels } from "../public/resolve-models.js";

function fakeVerdict(overrides: any = {}) {
  return {
    ok: true, stage: null, reason: null,
    measured: { vertices: 12, triangles: 4, buildMs: 1, drawn: { w: 1, d: 1 }, declared: { w: 1, d: 1 }, totalMs: 1 },
    geometry: { attributes: {} },
    ...overrides,
  };
}

test("a verified model registers by id and can be fetched back", () => {
  const reg = createModelRegistry();
  const v = fakeVerdict();
  reg.register("custom-tower-1", v);
  assert.equal(reg.get("custom-tower-1"), v);
  assert.equal(reg.has("custom-tower-1"), true);
  assert.deepEqual(reg.ids(), ["custom-tower-1"]);
});

test("registering a failed verdict is refused -- only a verified model gets in", () => {
  const reg = createModelRegistry();
  const failed = { ok: false, stage: "budget", reason: "too many triangles" };
  assert.throws(() => reg.register("bad-model", failed), /not a verified model/);
  assert.equal(reg.has("bad-model"), false);
});

test("a layer referencing an unknown model id is refused at resolve, WITH the id", () => {
  const reg = createModelRegistry();
  const overridden = [{ plotId: "p9", override: { removed: false, address: "p9", replace: { modelId: "ghost-tower" } } }];

  const { resolved, refused } = resolveOverrideModels(overridden, reg);
  assert.equal(resolved.length, 0, "an unknown model id was resolved instead of refused");
  assert.equal(refused.length, 1);
  assert.equal(refused[0].plotId, "p9");
  assert.equal(refused[0].modelId, "ghost-tower", "the refusal did not name the missing id");
});

test("a registered model resolves and carries its verified geometry", () => {
  const reg = createModelRegistry();
  const v = fakeVerdict();
  reg.register("real-tower", v);
  const overridden = [{ plotId: "p1", override: { removed: false, address: "p1", replace: { modelId: "real-tower" } } }];

  const { resolved, refused } = resolveOverrideModels(overridden, reg);
  assert.equal(refused.length, 0);
  assert.equal(resolved.length, 1);
  assert.equal((resolved[0] as any).model, v, "the resolved placement does not carry the verified model");
});

test("an override with no replace (a bare retint or move) is not sent through the registry at all", () => {
  const reg = createModelRegistry();
  const overridden = [{ plotId: "p2", override: { removed: false, address: "p2", retint: { color: 0xff0000 } } }];
  const { resolved, refused } = resolveOverrideModels(overridden, reg);
  assert.equal(refused.length, 0, "a retint-only override was refused for having no model, which it never claimed to have");
  assert.equal(resolved.length, 1);
});

test("populated model registry contains all 2,400 tier models and resolves real replace overrides", () => {
  const reg = createModelRegistry({ populateTierModels: true });
  assert.equal(reg.ids().length, 2400, "expected 2,400 models to be registered");

  const testIds = [
    "bld-highend-art-deco-skyscraper",
    "bld-highend-alpine-chalet",
    "civic-highend-cathedral-spire",
    "veh-showstopper-city-transit-bus",
  ];

  for (const id of testIds) {
    assert.ok(reg.has(id), `expected registry to have ${id}`);
    const m = reg.get(id);
    assert.ok(m.geometry, `expected ${id} to evaluate valid geometry`);
    assert.ok(m.geometry.getAttribute("position").count > 0);
  }

  const overridden = [
    { plotId: "plot_deco", override: { removed: false, address: "plot_deco", replace: { modelId: "bld-highend-art-deco-skyscraper" } } }
  ];
  const { resolved, refused } = resolveOverrideModels(overridden, reg);
  assert.equal(refused.length, 0, `refused override: ${refused[0]?.reason}`);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].model.id, "bld-highend-art-deco-skyscraper");
  assert.ok(resolved[0].model.geometry);
});
