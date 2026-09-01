// =============================================================================
// A CRITERION THAT CANNOT FAIL IS NOT EVIDENCE
//
// The verification stage reports "criteria 5/5" and the run ships. But the plan
// proposes its own criteria, and nothing checked whether they could ever have
// come out any other way. Measured against real historical runs: 33% were
// vacuous -- already true of the unmodified world, testing nothing.
//
// So "5/5" could mean five real assertions about new behaviour, or five checks
// that would have passed if the model had done nothing at all, and the ledger
// said the same either way.
//
// The previous implementation of this check took the baseline's functions as
// JavaScript values and called them, which cannot run in a Worker -- so it sat
// in the repo for weeks, imported by nothing but its own test, while the hole
// stayed open. These tests cover the version that runs where it has to.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { findVacuousCriteria } from "../src/criteriaDryRun";
import type { ProposedCriterion } from "../src/criteria";
import type { ProbeRunner } from "../src/criteriaExecution";

/** A probe standing in for the sandbox, so these tests need no isolate. */
function fakeProbe(world: Record<string, (...a: unknown[]) => unknown>): ProbeRunner {
  return async (fn, args) => {
    const f = world[fn];
    if (typeof f !== "function") return { error: `${fn} is not defined` };
    try {
      return { actual: f(...args) };
    } catch (e) {
      return { error: String((e as Error)?.message ?? e) };
    }
  };
}

const BASELINE = fakeProbe({
  initialWorld: () => ({ tick: 0, money: 100, sims: [{ name: "a" }] }),
});

test("a criterion that already holds on the unchanged world is reported vacuous", async () => {
  // `money` is already there. This passes whether the change works or not.
  const criteria: ProposedCriterion[] = [
    { kind: "existence", description: "initialWorld() has a money field", fn: "initialWorld", args: [], field: "money" },
  ];
  const [v] = await findVacuousCriteria(criteria, BASELINE, "");
  assert.equal(v.vacuous, true, v.reason);
  assert.match(v.reason, /already true/);
});

test("a criterion about something the change will ADD is not vacuous", async () => {
  // `weather` does not exist yet. This is the healthy shape: it fails now and
  // passes only if the change actually does something.
  const criteria: ProposedCriterion[] = [
    { kind: "existence", description: "initialWorld() has a weather field", fn: "initialWorld", args: [], field: "weather" },
  ];
  const [v] = await findVacuousCriteria(criteria, BASELINE, "");
  assert.equal(v.vacuous, false, v.reason);
});

test("a criterion naming a function that does not exist yet is NOT vacuous", async () => {
  // This is the case most likely to be got wrong. A criterion about a function
  // the change is about to add ERRORS on the baseline -- and an error is not a
  // pass, so it must not be called vacuous. Treating "it threw" as "already
  // true" would suppress exactly the criteria that carry the most information.
  const criteria: ProposedCriterion[] = [
    { kind: "existence", description: "forecast() exists", fn: "forecast", args: [], field: null },
  ];
  const [v] = await findVacuousCriteria(criteria, BASELINE, "");
  assert.equal(v.vacuous, false, v.reason);
  assert.match(v.reason, /does not hold on the current world/);
});

test("mixed criteria are reported per-criterion, in order", async () => {
  const criteria: ProposedCriterion[] = [
    { kind: "existence", description: "already there", fn: "initialWorld", args: [], field: "money" },
    { kind: "existence", description: "genuinely new", fn: "initialWorld", args: [], field: "weather" },
    { kind: "existence", description: "also already there", fn: "initialWorld", args: [], field: "tick" },
  ];
  const v = await findVacuousCriteria(criteria, BASELINE, "");
  assert.deepEqual(v.map((x) => x.vacuous), [true, false, true]);
  assert.deepEqual(v.map((x) => x.description), ["already there", "genuinely new", "also already there"]);
});

test("no criteria means nothing to report, and no sandbox work", async () => {
  let called = false;
  const spy: ProbeRunner = async () => { called = true; return { actual: null }; };
  assert.deepEqual(await findVacuousCriteria([], spy, ""), []);
  assert.equal(called, false, "an empty plan must not cost a sandbox load");
});
