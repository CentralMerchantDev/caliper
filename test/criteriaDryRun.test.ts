import { test } from "node:test";
import assert from "node:assert/strict";

import { dryRunCriterion } from "../src/criteriaDryRun.ts";
import type { ExistenceCriterion, StructuralCriterion, NonRegressionCriterion, RenderCriterion } from "../src/criteria.ts";

const baseline = {
  initialWorld: () => ({ tick: 0, money: 100, sims: [{ id: "s", needs: { hunger: 100 }, lastAction: null }] }),
  tick: (w: any) => ({ ...w, tick: w.tick + 1 }),
};

test("existence: a field that already exists on baseline is vacuous -- tests nothing", () => {
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "initialWorld", args: [], field: "sims" };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "invalid");
});

test("existence: a field absent on baseline is a real, valid new-behaviour assertion", () => {
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "initialWorld", args: [], field: "pets" };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "valid");
});

test("existence: a not-yet-existing function is valid, not malformed -- the whole point of an existence criterion for new behaviour", () => {
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "feedPet", args: [], field: null };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "valid");
});

test("structural: a type that already holds on baseline is vacuous", () => {
  const c: StructuralCriterion = { kind: "structural", description: "x", fn: "initialWorld", args: [], field: "sims", check: "type", expectedType: "array", minCount: null };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "invalid");
});

test("structural: minCount already satisfied on baseline is vacuous", () => {
  const c: StructuralCriterion = { kind: "structural", description: "x", fn: "initialWorld", args: [], field: "sims", check: "minCount", expectedType: null, minCount: 1 };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "invalid");
});

test("structural: minCount NOT yet satisfied on baseline is a real assertion", () => {
  const c: StructuralCriterion = { kind: "structural", description: "x", fn: "initialWorld", args: [], field: "sims", check: "minCount", expectedType: null, minCount: 2 };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "valid");
});

test("non-regression: fn missing on baseline is malformed -- there is no baseline behaviour to compare against", () => {
  const c: NonRegressionCriterion = { kind: "non-regression", description: "x", fn: "feedPet", args: [{}], repeat: null };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "invalid");
  assert.match(v.reason, /malformed/);
});

test("non-regression: fn present and runs cleanly is valid", () => {
  const c: NonRegressionCriterion = { kind: "non-regression", description: "x", fn: "tick", args: [{ tick: 0 }], repeat: 3 };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "valid");
});

test("render: an unknown key is valid (a new station the plan is adding, not vacuous)", () => {
  const c: RenderCriterion = { kind: "render", description: "x", stationOrEntityKey: "lamp" };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "valid");
});

test("render: a real existing key is also valid (a legitimate render-regression check)", () => {
  const c: RenderCriterion = { kind: "render", description: "x", stationOrEntityKey: "bed" };
  const v = dryRunCriterion(c, baseline);
  assert.equal(v.verdict, "valid");
});

// Guardrail: does "existence" actually catch a throwing call as malformed,
// distinct from "not present"?
test("guardrail: existence catches a genuine crash as malformed, not as 'field absent'", () => {
  const throwing = { boom: () => { throw new Error("planted failure"); } };
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "boom", args: [], field: "x" };
  const v = dryRunCriterion(c, throwing);
  assert.equal(v.verdict, "invalid");
  assert.match(v.reason, /malformed/);
  assert.match(v.reason, /planted failure/);
});
