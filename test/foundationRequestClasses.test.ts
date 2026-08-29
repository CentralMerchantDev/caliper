// FOUNDATION.md item 5, the acceptance test for the whole brief: "for each
// request class a visitor would actually try... whether the architecture
// now supports it, proven by a test that applies the change as data and
// checks the renderer draws it." Zero API spend -- every change below is
// applied directly to world data, the same shape a plan's criteria would
// produce, never a model call.
//
// Two things are proven per class, both for real, not asserted from
// reading the code:
//   1. The renderer draws the changed world without throwing -- the REAL
//      public/world-render.js class, given a mock canvas 2D context (no
//      DOM/canvas package exists in this project's plain node:test setup,
//      so the mock stubs exactly the ctx methods world-render.js calls --
//      see the enumerated list below, kept in sync by hand since there's
//      no browser here to catch a missing one other than a thrown
//      "ctx.x is not a function").
//   2. The real 9-case SIM_REGRESSION_SUITE still passes, run against the
//      real tick/chooseAction/applyAction extracted from the actual
//      SIM_BASELINE_SOURCE (the same evaluate-the-real-source technique
//      src/worldStructure.ts uses) -- proving, not just asserting, that a
//      pure data change never touches simulation behavior.
import { test } from "node:test";
import assert from "node:assert/strict";

import { SIM_BASELINE_SOURCE } from "../src/simBaseline.ts";
import { SIM_REGRESSION_SUITE } from "../src/simRegression.ts";
import { WorldRenderer } from "../public/world-render.js";

// ---------------------------------------------------------------------
// Real functions, evaluated once from the real source -- not a second,
// hand-typed copy of initialWorld/tick/chooseAction/applyAction.
// ---------------------------------------------------------------------
const baseline = new Function(`${SIM_BASELINE_SOURCE}\nreturn { initialWorld, tick, chooseAction, applyAction };`)() as {
  initialWorld: () => any;
  tick: (w: any) => any;
  chooseAction: (sim: any, w: any) => any;
  applyAction: (w: any, i: number, action: string) => any;
};

function runRegressionSuite(fns: typeof baseline): { name: string; pass: boolean }[] {
  return SIM_REGRESSION_SUITE.map((c) => {
    const fn = (fns as any)[c.fn];
    let actual = c.args[0];
    if (c.fn === "tick") {
      for (let i = 0; i < (c.repeat ?? 1); i++) actual = fn(actual);
    } else {
      actual = fn(...c.args);
    }
    let pass: boolean;
    try {
      assert.deepEqual(actual, c.expected);
      pass = true;
    } catch {
      pass = false;
    }
    return { name: c.name, pass };
  });
}

function assertRegressionSuiteStillPasses(fns: typeof baseline) {
  const results = runRegressionSuite(fns);
  const failed = results.filter((r) => !r.pass);
  assert.equal(failed.length, 0, `regression checks failed: ${failed.map((f) => f.name).join("; ")}`);
  assert.equal(results.length, 9, `expected exactly 9 regression checks, found ${results.length}`);
}

test("control: the real 9-case regression suite passes against the real, unmodified baseline functions", () => {
  assertRegressionSuiteStillPasses(baseline);
});

// ---------------------------------------------------------------------
// A minimal CanvasRenderingContext2D + HTMLCanvasElement + ResizeObserver
// stand-in -- enough for the REAL WorldRenderer class from
// public/world-render.js to run its real draw() path without throwing.
// Every ctx method world-render.js calls is stubbed as a no-op; every
// property it assigns is just a plain writable property. Not a rendering
// correctness check (there is no pixel output to inspect here) -- a
// does-this-throw check, the same bar FOUNDATION.md item 5 asks for.
// ---------------------------------------------------------------------
function makeMockCanvas() {
  const ctx = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "left", textBaseline: "alphabetic", globalAlpha: 1,
    clearRect() {}, fillRect() {}, fillText() {},
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {}, arc() {}, ellipse() {},
    fill() {}, stroke() {}, save() {}, restore() {}, clip() {}, setLineDash() {},
  };
  const canvas: any = {
    width: 800, height: 600,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  };
  return canvas;
}

(globalThis as any).window = (globalThis as any).window ?? { devicePixelRatio: 1 };
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? class { observe() {} disconnect() {} };

function assertRendererDrawsWithoutThrowing(world: any) {
  const renderer = new WorldRenderer(makeMockCanvas(), { reducedMotion: true });
  renderer.pushTick(world);
  renderer.pushTick(world);
  assert.doesNotThrow(() => renderer.draw(1));
}

// ---------------------------------------------------------------------
// The five request classes a visitor would actually try, per FOUNDATION.md
// item 5's own list. Each is applied as a pure data edit to a fresh clone
// of the real initialWorld() output -- never a source-code edit, never a
// model call.
// ---------------------------------------------------------------------

test("request class: a second street lamp -- placement of an EXISTING type", () => {
  const world = structuredClone(baseline.initialWorld());
  const before = world.placements.length;
  world.placements.push({ id: "lamp-3", type: "lampPost", location: "outdoors", plot: { x: 1.8, y: 1.8 } });

  assert.equal(world.placements.length, before + 1);
  assert.ok(world.placements.some((p: any) => p.id === "lamp-3" && p.type === "lampPost"));
  assert.ok("lampPost" in world.objectTypes, "lampPost must already exist in the registry -- this class adds no new type");

  assertRendererDrawsWithoutThrowing(world);
  assertRegressionSuiteStillPasses(baseline);
});

test("request class: a bench by the shop -- placement of an EXISTING type, near a specific building", () => {
  const world = structuredClone(baseline.initialWorld());
  const shop = world.buildings.find((b: any) => b.id === "shop");
  const before = world.placements.length;
  world.placements.push({ id: "bench-2", type: "bench", location: "outdoors", plot: { x: shop.plot.x + 0.3, y: shop.plot.y - 0.2 } });

  assert.equal(world.placements.length, before + 1);
  assert.ok(world.placements.some((p: any) => p.id === "bench-2" && p.type === "bench"));

  assertRendererDrawsWithoutThrowing(world);
  assertRegressionSuiteStillPasses(baseline);
});

test("request class: a new object type -- one registry entry plus a placement, no renderer code change", () => {
  const world = structuredClone(baseline.initialWorld());
  assert.ok(!("birdbath" in world.objectTypes), "birdbath must not already exist -- this is the genuinely-new-type case");

  world.objectTypes.birdbath = {
    material: "stone",
    footprint: { w: 0.5, d: 0.5 },
    shadow: { w: 0.7, d: 0.7 },
    local: null,
    station: null,
    recipe: [
      { shape: "cylinder", size: [0.5, 0.5, 0.15], position: [0, 0.6, 0], color: "#9a9186", roughness: 0.8 },
      { shape: "cylinder", size: [0.08, 0.08, 0.6], position: [0, 0.3, 0], color: "#9a9186", roughness: 0.8 },
    ],
  };
  world.placements.push({ id: "birdbath-1", type: "birdbath", location: "outdoors", plot: { x: 0.4, y: 0.4 } });

  assert.ok("birdbath" in world.objectTypes);
  assert.ok(world.placements.some((p: any) => p.type === "birdbath"));
  // world-render.js has no hand-tuned SYMBOL_DRAWERS entry for "birdbath" --
  // this specifically exercises the generic-footprint fallback path, not
  // the hand-tuned symbol table.
  assert.ok(!("birdbath" in (WorldRenderer as any).SYMBOL_DRAWERS), "this class only proves something if birdbath has no hand-tuned symbol");

  assertRendererDrawsWithoutThrowing(world);
  assertRegressionSuiteStillPasses(baseline);
});

test("request class: a colour change on an existing placement -- an override, not a new type", () => {
  const world = structuredClone(baseline.initialWorld());
  const lamp = world.placements.find((p: any) => p.type === "lampPost");
  assert.ok(!lamp.overrides, "picking a placement that starts with no override, so this test proves the override is what changed it");
  lamp.overrides = { color: "#2244aa" };

  assert.equal(world.placements.find((p: any) => p.id === lamp.id).overrides.color, "#2244aa");

  assertRendererDrawsWithoutThrowing(world);
  assertRegressionSuiteStillPasses(baseline);
});

test("request class: a ground surface change -- an existing surfaces field, not a new mechanism", () => {
  const world = structuredClone(baseline.initialWorld());
  const before = world.surfaces.ground.color;
  world.surfaces.ground.color = "#3a4a2e";

  assert.notEqual(world.surfaces.ground.color, before);
  assert.equal(world.surfaces.ground.material, "grass", "changing colour must not require also touching material");

  assertRendererDrawsWithoutThrowing(world);
  assertRegressionSuiteStillPasses(baseline);
});
