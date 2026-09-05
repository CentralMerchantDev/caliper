// I1 -- THE RENDERER BUILDS A WORLD INSTANCE, NOT A SECOND ONE.
//
// public/city-render.js's buildWorld() built its own field/plan/world by
// calling `new LandField(16)` and `generateWorld(heightAt)` directly --
// the exact bare calls public/world.js's createWorld() already composes,
// proven and mutation-tested since A4. Nothing wired the renderer to it.
// Nine of the thirteen A-H modules were imported by nothing (the plan's own
// PART 7 Phase I note); this is city-render.js's own line of that gap.
//
// buildWorldState(seed, layers), exported from city-render.js and used by
// buildWorld() itself, is the fix: same data (field/heightAt/plan/world),
// sourced through createWorld() instead of reimplemented. Two properties,
// not one -- the ledger names both explicitly:
//
//   1. For the DEFAULT seed, this must be byte-identical to what the old
//      bare calls produced -- a data-source swap, not a behaviour change.
//   2. A NAMED, non-default seed must produce genuinely different data --
//      proving the seed reaches createWorld() and is not silently dropped
//      on the way through (which the default-seed check alone cannot see,
//      because a dropped seed still defaults to the same DEFAULT_SEED).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { buildWorldState } from "../public/city-render.js";
import { generateWorld, generateCityPlan } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { DEFAULT_SEED } from "../public/noise.js";

/** Same shape test/world.test.ts's planFingerprint uses -- id/extent/class/settlement rows, sorted. */
function planFingerprint(plan: any): string {
  const rows: string[] = [];
  for (const p of plan.plots) rows.push(["p", p.id, p.xMin, p.xMax, p.zMin, p.zMax, p.className, p.settlement].join(","));
  for (const b of plan.blocks) rows.push(["b", b.id, b.xMin, b.xMax, b.zMin, b.zMax].join(","));
  for (const r of plan.roads) rows.push(["r", r.id, r.axis, r.class, r.at, r.from, r.to].join(","));
  rows.sort();
  return createHash("sha256").update(rows.join("|")).digest("hex");
}

function landFingerprint(land: any, step = 1009): string {
  const h = makeHeightAt(land);
  let s = "";
  for (let x = -20000; x <= 20000; x += 1013) {
    for (let z = -20000; z <= 20000; z += step) s += h(x, z).toFixed(4) + ",";
  }
  return createHash("sha256").update(s).digest("hex");
}

test("I1: buildWorldState composes createWorld() -- byte-identical to the old bare calls, for the default seed", () => {
  const { field, heightAt, plan, world } = buildWorldState();

  const oldField = new LandField(16);
  const oldHeightAt = makeHeightAt(oldField);
  const oldWorld = generateWorld(oldHeightAt);
  const oldPlan = generateCityPlan();

  assert.equal(landFingerprint(field), landFingerprint(oldField), "buildWorldState's land is not what the old new LandField(16) call produced");
  assert.equal(planFingerprint(world), planFingerprint(oldWorld), "buildWorldState's world is not what the old generateWorld(heightAt) call produced");
  assert.equal(planFingerprint(plan), planFingerprint(oldPlan), "buildWorldState's downtown-only plan is not what the old generateCityPlan() call produced");
  assert.equal(heightAt(1000, 500), oldHeightAt(1000, 500), "buildWorldState's heightAt disagrees with the old one at a real sample point");
});

test("I1: a named, non-default seed reaches createWorld() -- it is not silently dropped on the way through", () => {
  const atDefault = buildWorldState(DEFAULT_SEED);
  const atOther = buildWorldState("shoreline-district-9");

  assert.notEqual(
    landFingerprint(atOther.field),
    landFingerprint(atDefault.field),
    "a different seed produced the identical land -- the seed is not reaching createWorld()",
  );
  assert.notEqual(
    planFingerprint(atOther.world),
    planFingerprint(atDefault.world),
    "a different seed produced the identical world plan -- the seed is not reaching createWorld()",
  );
});
