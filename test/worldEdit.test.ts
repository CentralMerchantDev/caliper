// FOUNDATION-2 ("emit the change, not the file"): validates the structured
// WorldEdit path end to end using the REAL current source (SIM_BASELINE_SOURCE),
// never a hand-typed stand-in -- an edit that doesn't apply correctly here
// wouldn't apply correctly in production either, since this is the same
// function the implement/fix stages call.
import { test } from "node:test";
import assert from "node:assert/strict";

import { SIM_BASELINE_SOURCE } from "../src/simBaseline.ts";
import { SIM_REGRESSION_SUITE } from "../src/simRegression.ts";
import { validateWorldEdit, runValidatedWorldEdit, worldEditPathAvailable, type WorldEdit } from "../src/worldEdit.ts";

function loadWorld(source: string) {
  return new Function(`${source}\nreturn { initialWorld };`)().initialWorld();
}

function loadFns(source: string) {
  return new Function(`${source}\nreturn { initialWorld, tick, chooseAction, applyAction };`)();
}

function runRegressionSuite(source: string) {
  const fns = loadFns(source) as Record<string, any>;
  return SIM_REGRESSION_SUITE.map((c) => {
    let actual = c.args[0];
    if (c.fn === "tick") {
      for (let i = 0; i < (c.repeat ?? 1); i++) actual = fns.tick(actual);
    } else {
      actual = fns[c.fn](...c.args);
    }
    return { name: c.name, pass: JSON.stringify(actual) === JSON.stringify(c.expected) };
  });
}

test("worldEditPathAvailable is true for the real current source", () => {
  assert.equal(worldEditPathAvailable(SIM_BASELINE_SOURCE), true);
});

test("addPlacement: a second street lamp applies, splices cleanly, and the regression suite still passes 9/9", () => {
  const edit: WorldEdit = { ops: [{ op: "addPlacement", placement: { id: "lamp-3", type: "lampPost", location: "outdoors", plot: { x: 1.8, y: 1.8 } } }] };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const world = loadWorld(result.source);
  assert.ok(world.placements.some((p: any) => p.id === "lamp-3" && p.type === "lampPost"));

  const fnsBefore = loadFns(SIM_BASELINE_SOURCE);
  const fnsAfter = loadFns(result.source);
  assert.equal(fnsAfter.chooseAction.toString(), fnsBefore.chooseAction.toString(), "chooseAction must be byte-identical -- never touched by a data-edit");
  assert.equal(fnsAfter.applyAction.toString(), fnsBefore.applyAction.toString(), "applyAction must be byte-identical");
  assert.equal(fnsAfter.tick.toString(), fnsBefore.tick.toString(), "tick must be byte-identical");

  const results = runRegressionSuite(result.source);
  assert.equal(results.filter((r) => r.pass).length, 9);
  assert.equal(results.length, 9);
});

test("addObjectType + addPlacement in one edit: a genuinely new type applies together with its placement", () => {
  const edit: WorldEdit = {
    ops: [
      {
        op: "addObjectType",
        key: "birdbath",
        definition: {
          material: "stone",
          footprint: { w: 0.5, d: 0.5 },
          station: null,
          recipe: [{ shape: "cylinder", size: [0.5, 0.5, 0.15], position: [0, 0.6, 0], color: "#9a9186" }],
        },
      },
      { op: "addPlacement", placement: { id: "birdbath-1", type: "birdbath", location: "outdoors", plot: { x: 0.4, y: 0.4 } } },
    ],
  };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const world = loadWorld(result.source);
  assert.ok("birdbath" in world.objectTypes);
  assert.ok(world.placements.some((p: any) => p.type === "birdbath"));
  assert.equal(runRegressionSuite(result.source).filter((r) => r.pass).length, 9);
});

test("overridePlacement: a colour change applies to the named placement only", () => {
  const edit: WorldEdit = { ops: [{ op: "overridePlacement", placementId: "lamp-1", overrides: { color: "#2244aa" } }] };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const world = loadWorld(result.source);
  assert.equal(world.placements.find((p: any) => p.id === "lamp-1").overrides.color, "#2244aa");
  assert.equal(world.placements.find((p: any) => p.id === "lamp-2").overrides, undefined, "only the named placement changes");
});

test("overridePlacement: a position change (repositioning, the real fix scenario this was extended for) replaces plot without touching colour", () => {
  const edit: WorldEdit = { ops: [{ op: "overridePlacement", placementId: "lamp-1", overrides: { plot: { x: 2.4, y: 2 } } }] };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const world = loadWorld(result.source);
  const lamp = world.placements.find((p: any) => p.id === "lamp-1");
  assert.deepEqual(lamp.plot, { x: 2.4, y: 2 });
  assert.equal(lamp.overrides, undefined, "a plot-only override must not add an empty overrides object");
});

test("overridePlacement: colour and position can change together in one op", () => {
  const edit: WorldEdit = { ops: [{ op: "overridePlacement", placementId: "lamp-1", overrides: { color: "#112233", plot: { x: 0.9, y: 1.1 } } }] };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const world = loadWorld(result.source);
  const lamp = world.placements.find((p: any) => p.id === "lamp-1");
  assert.deepEqual(lamp.plot, { x: 0.9, y: 1.1 });
  assert.equal(lamp.overrides.color, "#112233");
});

test("guardrail: overridePlacement.plot with a non-numeric coordinate is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "overridePlacement", placementId: "lamp-1", overrides: { plot: { x: "far", y: 2 } as any } }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /overrides\.plot must be/);
});

test("setSurfaceField: a ground colour change applies without touching material", () => {
  const edit: WorldEdit = { ops: [{ op: "setSurfaceField", surfaceKey: "ground", field: "color", value: "#3a4a2e" }] };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const world = loadWorld(result.source);
  assert.equal(world.surfaces.ground.color, "#3a4a2e");
  assert.equal(world.surfaces.ground.material, "grass");
});

// ---------------------------------------------------------------------
// Rejection: "an edit naming a type that does not exist, or a malformed
// entry, must be rejected, not applied" -- this project's own explicit
// requirement for this brief.
// ---------------------------------------------------------------------

test("guardrail: addPlacement of a type that does not exist is rejected, not applied", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "addPlacement", placement: { id: "x-1", type: "unicornStatue", location: "outdoors", plot: { x: 0, y: 0 } } }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /does not exist/);
});

test("guardrail: addPlacement with a duplicate id is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "addPlacement", placement: { id: "lamp-1", type: "lampPost", location: "outdoors", plot: { x: 0, y: 0 } } }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /already exists/);
});

test("guardrail: addPlacement outdoors with no plot is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "addPlacement", placement: { id: "x-2", type: "lampPost", location: "outdoors" } }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /plot/);
});

test("guardrail: addPlacement at a location that is neither outdoors nor a real building is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "addPlacement", placement: { id: "x-3", type: "bed", location: "attic" } }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /not "outdoors" or a real building/);
});

test("guardrail: addObjectType with a malformed recipe part (bad shape) is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = {
    ops: [{ op: "addObjectType", key: "gadget", definition: { material: "x", footprint: { w: 1, d: 1 }, station: null, recipe: [{ shape: "torus", size: [1], position: [0, 0, 0], color: "#fff" } as any] } }],
  };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /shape must be one of/);
});

test("guardrail: addObjectType with a non-hex colour is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = {
    ops: [{ op: "addObjectType", key: "gadget", definition: { material: "x", footprint: { w: 1, d: 1 }, station: null, recipe: [{ shape: "box", size: [1, 1, 1], position: [0, 0, 0], color: "red" } as any] } }],
  };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /#hex/);
});

test("guardrail: addObjectType reusing an existing key is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = {
    ops: [{ op: "addObjectType", key: "bed", definition: { material: "x", footprint: { w: 1, d: 1 }, station: null, recipe: [{ shape: "box", size: [1, 1, 1], position: [0, 0, 0], color: "#fff" }] } }],
  };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /already exists/);
});

test("guardrail: overridePlacement of a placement id that does not exist is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "overridePlacement", placementId: "no-such-placement", overrides: { color: "#000000" } }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /does not exist/);
});

test("guardrail: overridePlacement with an unsupported field is rejected, not silently dropped", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "overridePlacement", placementId: "lamp-1", overrides: { size: "huge" } as any }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /unsupported field/);
});

test("guardrail: setSurfaceField on an unknown surface is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const edit: WorldEdit = { ops: [{ op: "setSurfaceField", surfaceKey: "sky", field: "color", value: "#000000" }] };
  const v = validateWorldEdit(world, edit);
  assert.equal(v.valid, false);
  if (!v.valid) assert.match(v.reason, /does not exist/);
});

test("guardrail: an edit with no ops is rejected", () => {
  const world = loadWorld(SIM_BASELINE_SOURCE);
  const v = validateWorldEdit(world, { ops: [] });
  assert.equal(v.valid, false);
});

test("guardrail: one invalid op rejects the WHOLE edit -- no partial application", () => {
  const edit: WorldEdit = {
    ops: [
      { op: "addPlacement", placement: { id: "lamp-3", type: "lampPost", location: "outdoors", plot: { x: 1.8, y: 1.8 } } },
      { op: "addPlacement", placement: { id: "x-4", type: "doesNotExist", location: "outdoors", plot: { x: 0, y: 0 } } },
    ],
  };
  const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
  assert.equal(result.ok, false);
  // The whole source must be untouched -- re-running against the original
  // source should show lamp-3 was never applied.
  const world = loadWorld(SIM_BASELINE_SOURCE);
  assert.ok(!world.placements.some((p: any) => p.id === "lamp-3"));
});
