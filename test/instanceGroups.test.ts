// AN OVERRIDDEN OBJECT LEAVES ITS INSTANCE GROUP.
//
// The 480-ish variant meshes exist because two buildings in the same
// SITUATION are the same building and share one InstancedMesh. That is
// exactly what breaks the moment a layer overrides one of them: an
// InstancedMesh draws every instance from the SAME geometry, so an
// overridden plot left inside its group would either draw the wrong (old)
// model, or -- if something else drew the override on top -- draw TWICE,
// once from each. Neither is a small bug: one makes edits invisible, the
// other doubles a building nobody asked to duplicate.
//
// This is pure partitioning, run BEFORE groupByVariant ever sees the
// placements, so the existing instancing path needs no changes at all --
// it simply never receives an overridden or removed placement.

import { test } from "node:test";
import assert from "node:assert/strict";

import { partitionForInstancing } from "../public/instance-groups.js";
import { groupByVariant } from "../public/layout.js";
import { applyLayers } from "../public/apply-layers.js";
import { createWorld } from "../public/world.js";
import { layerFrom } from "../public/world-model.js";
import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { planCity } from "../public/layout.js";
import { assessFootprint } from "../public/footprint.js";

function fakePlacements(n: number, typology = "bld-villa") {
  // All sharing one typology/options so groupByVariant puts every one of
  // them in a SINGLE group -- the group an override has to leave.
  return Array.from({ length: n }, (_, i) => ({
    plotId: `p${i}`, typology, options: { position: "middle", corner: "none", foundation: "slab", character: "heritage" },
  }));
}

test("an overridden plot is absent from its original variant's instance group, and nothing is lost or duplicated", () => {
  const placements = fakePlacements(6);
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({
    id: "l1", author: "mark",
    edits: [
      { address: "p2", op: "replace", payload: { modelId: "custom-tower-1" } },
      { address: "p4", op: "remove" },
    ],
  }));

  const resolved = applyLayers(placements, world);
  const { instanced, overridden } = partitionForInstancing(resolved);

  // conservation: every placement is accounted for exactly once -- as an
  // instanced draw, an overridden draw, or (for the removed one) neither.
  assert.equal(instanced.length + overridden.length, placements.length - 1, "the removed placement was not dropped, or something else was lost/duplicated");
  assert.equal(overridden.length, 1, "the replaced placement did not land in overridden");
  assert.equal((overridden[0] as any).plotId, "p2");

  const groups = groupByVariant(instanced);
  assert.equal(groups.size, 1, "the untouched placements did not all still share one variant group");
  const group = [...groups.values()][0];
  const groupIds = group.placements.map((p: any) => p.plotId);
  assert.ok(!groupIds.includes("p2"), "the overridden plot is still in its old instance group -- it will draw with the wrong geometry, or twice");
  assert.ok(!groupIds.includes("p4"), "the removed plot is still in an instance group -- it will draw when it should not exist");
  assert.equal(groupIds.length, 4, "the group's count does not match placements minus overridden minus removed");
});

test("a plot with no edits at all is never inspected by the partition -- reference equality holds", () => {
  const placements = fakePlacements(3);
  const world = createWorld({ seed: "x" });
  const { instanced, overridden } = partitionForInstancing(applyLayers(placements, world));
  assert.equal(overridden.length, 0);
  for (let i = 0; i < placements.length; i++) assert.equal(instanced[i], placements[i]);
});

test("at real scale: overriding one real plot in the real plan removes it from its group and only it", () => {
  // Not a fixture -- the actual generated world, the actual planCity output,
  // the same pipeline city-render.js itself uses. If this holds at ~20,000
  // real placements it is not a property of a six-item toy array.
  const heightAt = makeHeightAt(new LandField(16));
  const plan = generateWorld(heightAt);
  const verdictFor = (p: any) => assessFootprint(heightAt, p.buildable || p, undefined as any).verdict;
  const { placements } = planCity(plan.blocks, plan.plots, verdictFor);
  assert.ok(placements.length > 10000, `only ${placements.length} real placements -- too few to call this a scale test`);

  const target = placements[Math.floor(placements.length / 2)] as any;
  const world = createWorld({ seed: "x" });
  world.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: target.plotId, op: "replace", payload: { modelId: "custom" } }] }));

  const { instanced, overridden } = partitionForInstancing(applyLayers(placements as any, world));
  assert.equal(overridden.length, 1);
  assert.equal(instanced.length, placements.length - 1);
  const groups = groupByVariant(instanced);
  for (const g of groups.values()) {
    assert.ok(!g.placements.some((p: any) => p.plotId === target.plotId), "the overridden real plot is still present in a real instance group");
  }
});
