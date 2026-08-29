import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateCriteria, evaluateCriterion, type ProbeRunner } from "../src/criteriaExecution.ts";
import type { ExistenceCriterion, StructuralCriterion, NonRegressionCriterion, RenderCriterion } from "../src/criteria.ts";

function mockProbe(byFn: Record<string, unknown>): ProbeRunner {
  return async (fn) => {
    if (!(fn in byFn)) return { error: `function '${fn}' is not defined in this source` };
    return { actual: byFn[fn] };
  };
}

test("existence: field present on the candidate's result passes", async () => {
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "initialWorld", args: [], field: "pets" };
  const probe = mockProbe({ initialWorld: { pets: [] } });
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, true);
});

test("existence: field absent on the candidate's result fails -- implementation didn't add it", async () => {
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "initialWorld", args: [], field: "pets" };
  const probe = mockProbe({ initialWorld: { sims: [] } });
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, false);
});

test("existence: fn not defined on the candidate fails with the real error, not a false pass", async () => {
  const c: ExistenceCriterion = { kind: "existence", description: "x", fn: "feedPet", args: [], field: null };
  const probe = mockProbe({});
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, false);
  assert.match(r.error!, /not defined/);
});

test("structural: type check passes when the field has the right type", async () => {
  const c: StructuralCriterion = { kind: "structural", description: "x", fn: "initialWorld", args: [], field: "pets", check: "typeCheck", expectedType: "array", minCount: null };
  const probe = mockProbe({ initialWorld: { pets: [1] } });
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, true);
});

test("structural: type check fails when the field has the wrong type", async () => {
  const c: StructuralCriterion = { kind: "structural", description: "x", fn: "initialWorld", args: [], field: "pets", check: "typeCheck", expectedType: "array", minCount: null };
  const probe = mockProbe({ initialWorld: { pets: "not an array" } });
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, false);
});

test("structural: minCount passes/fails correctly", async () => {
  const c: StructuralCriterion = { kind: "structural", description: "x", fn: "initialWorld", args: [], field: "pets", check: "minCount", expectedType: null, minCount: 2 };
  const probeEnough = mockProbe({ initialWorld: { pets: [1, 2] } });
  const probeShort = mockProbe({ initialWorld: { pets: [1] } });
  assert.equal((await evaluateCriterion(c, probeEnough, probeEnough)).pass, true);
  assert.equal((await evaluateCriterion(c, probeShort, probeShort)).pass, false);
});

// ---------------------------------------------------------------------
// non-regression: this is the one kind where "expected" is computed by
// actually running the baseline, never model-supplied -- the direct fix
// for the flagship 52-vs-55 case. These tests are the load-bearing ones.
// ---------------------------------------------------------------------
test("non-regression: candidate output matching baseline output passes", async () => {
  const c: NonRegressionCriterion = { kind: "non-regression", description: "x", fn: "tick", args: [{ hunger: 15 }], repeat: null };
  const probeCandidate = mockProbe({ tick: { hunger: 52 } });
  const probeBaseline = mockProbe({ tick: { hunger: 52 } });
  const r = await evaluateCriterion(c, probeCandidate, probeBaseline);
  assert.equal(r.pass, true);
  assert.deepEqual(r.expected, { hunger: 52 });
});

test("non-regression: candidate diverging from baseline fails, and 'expected' is the REAL baseline value, never a guessed one", async () => {
  const c: NonRegressionCriterion = { kind: "non-regression", description: "x", fn: "tick", args: [{ hunger: 15 }], repeat: null };
  const probeCandidate = mockProbe({ tick: { hunger: 55 } }); // what a model might have hand-computed, wrong
  const probeBaseline = mockProbe({ tick: { hunger: 52 } }); // what the mechanism ACTUALLY produces
  const r = await evaluateCriterion(c, probeCandidate, probeBaseline);
  assert.equal(r.pass, false);
  assert.deepEqual(r.expected, { hunger: 52 }, "expected must come from running baseline, not from a model's arithmetic");
  assert.deepEqual(r.actual, { hunger: 55 });
});

// Guardrail: fail closed if the baseline comparison itself can't run --
// never silently treat "couldn't establish ground truth" as "matches".
test("guardrail: non-regression fails closed when the baseline probe itself errors, never treats it as a pass", async () => {
  const c: NonRegressionCriterion = { kind: "non-regression", description: "x", fn: "tick", args: [{}], repeat: null };
  const probeCandidate = mockProbe({ tick: { hunger: 52 } });
  const probeBaselineBroken: ProbeRunner = async () => ({ error: "sandbox exploded" });
  const r = await evaluateCriterion(c, probeCandidate, probeBaselineBroken);
  assert.equal(r.pass, false);
  assert.match(r.error!, /baseline comparison could not run/);
});

test("guardrail-on-the-guardrail: with a healthy baseline probe, the same criterion is NOT forced to fail -- the fail-closed path is selective", async () => {
  const c: NonRegressionCriterion = { kind: "non-regression", description: "x", fn: "tick", args: [{}], repeat: null };
  const probe = mockProbe({ tick: { hunger: 52 } });
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, true);

  const calls: string[] = [];
  const orderedProbe: ProbeRunner = async (fn) => {
    calls.push(fn);
    await Promise.resolve();
    return { actual: { hunger: 52 } };
  };
  await evaluateCriteria([
    { ...c, description: "first", fn: "first" },
    { ...c, description: "second", fn: "second" },
  ], orderedProbe, orderedProbe);
  assert.deepEqual(calls, ["first", "first", "second", "second"], "Dynamic Worker probes must run sequentially in criterion order");
});

test("render: a known station passes the structural check", async () => {
  const c: RenderCriterion = { kind: "render", description: "x", stationOrEntityKey: "bed" };
  const probe = mockProbe({});
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, true);
});

test("render: an unknown station fails the structural check (this is the weaker, non-executing check -- documented in the result name)", async () => {
  const c: RenderCriterion = { kind: "render", description: "x", stationOrEntityKey: "totally-made-up" };
  const probe = mockProbe({});
  const r = await evaluateCriterion(c, probe, probe);
  assert.equal(r.pass, false);
  assert.match(r.name, /client-side check/);
});
