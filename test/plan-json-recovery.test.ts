// Found running real trials (BUILD-V2 step 5): the same change request
// ("add a second sim who can socialise") crashed the run twice in a row on
// the re-plan call after answering a clarifying question. Cause: the plan
// schema only required argsJson/expectedJson to be TYPE string -- it
// couldn't constrain their CONTENT to be valid JSON, so the model could
// emit a string that looks like JSON but isn't (unescaped quotes, a stray
// single quote, a trailing comma). Nothing retried; the run just died with
// an `error` event, no ledger, nothing recorded.
//
// CALIPER world-build (BUILD-WORLD.md, chunk 6): the fix this file pins
// changed shape along with the criteria format itself. `parseCriteria`
// (which threw on bad JSON, requiring a try/catch and a manual retry loop
// in generatePlan) is gone -- replaced by validateProposedCriteria, which
// never throws. A malformed criterion becomes an entry in `rejected` with
// a clear reason instead of an exception, and generatePlan's retry loop
// (src/claude.ts) re-asks only for the rejected ones. Same underlying
// concern this file has always pinned -- malformed criterion JSON must
// never crash the run with nothing recorded -- now enforced one layer
// down, by construction (a function that returns a result can't take down
// its caller the way an uncaught throw could).
import { test } from "node:test";
import assert from "node:assert/strict";

import { validateProposedCriterion, validateProposedCriteria } from "../src/criteria.ts";

const validExistence = { kind: "existence", description: "eat restores hunger", fn: "applyAction", argsJson: '[{"hunger":10}]', field: "hunger", check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null };

test("validateProposedCriterion: valid argsJson parses cleanly", () => {
  const r = validateProposedCriterion(validExistence);
  assert.equal(r.valid, true);
  if (r.valid && "args" in r.criterion) assert.deepEqual(r.criterion.args, [{ hunger: 10 }]);
});

test("validateProposedCriterion: malformed argsJson (single-quoted keys) is rejected with a clear reason, not thrown", () => {
  const malformed = { ...validExistence, description: "applyAction call restores sim2 social independent of sim1", argsJson: "[{'social': 10}]" };
  assert.doesNotThrow(() => validateProposedCriterion(malformed));
  const r = validateProposedCriterion(malformed);
  assert.equal(r.valid, false);
  if (!r.valid) {
    assert.match(r.reason, /not valid JSON/);
    assert.match(r.reason, /applyAction call restores sim2 social independent of sim1/, "the reason must name which criterion failed, not just that something did");
  }
});

test("validateProposedCriteria: an empty criteria list is a legitimate outcome, not a failure", () => {
  const { accepted, rejected } = validateProposedCriteria([]);
  assert.deepEqual(accepted, []);
  assert.deepEqual(rejected, []);
});

test("validateProposedCriteria: one malformed criterion among several valid ones is isolated -- it doesn't take the whole batch down", () => {
  const good1 = { ...validExistence, description: "a" };
  const bad = { ...validExistence, description: "b", argsJson: "not json at all" };
  const good2 = { ...validExistence, description: "c" };
  const { accepted, rejected } = validateProposedCriteria([good1, bad, good2]);
  assert.equal(accepted.length, 2);
  assert.equal(rejected.length, 1);
  assert.equal((rejected[0].raw as any).description, "b");
});
