// Chunk 6's core claim: the old failure mode (a criterion asserting a
// computed value that contradicts the plan's own stated mechanism) is now
// impossible to EXPRESS, not just discouraged. These tests prove that at
// the validation layer -- the one place that has to hold even if the API's
// own JSON Schema enforcement doesn't (validate-before-consume, applied to
// the criteria format itself this time).
import { test } from "node:test";
import assert from "node:assert/strict";

import { validateProposedCriterion, validateProposedCriteria } from "../src/criteria.ts";

test("existence: a well-formed criterion is accepted", () => {
  const r = validateProposedCriterion({ kind: "existence", description: "pets field exists", fn: "initialWorld", argsJson: "[]", field: "pets", check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null });
  assert.equal(r.valid, true);
});

test("structural: a well-formed type check is accepted", () => {
  const r = validateProposedCriterion({
    kind: "structural", description: "pets is an array", fn: "initialWorld", argsJson: "[]", field: "pets", check: "type", expectedType: "array", minCount: null, repeat: null, stationOrEntityKey: null,
  });
  assert.equal(r.valid, true);
});

test("non-regression: repeat is accepted -- the gap found auditing history is now expressible", () => {
  const r = validateProposedCriterion({
    kind: "non-regression", description: "tick 25 times still matches baseline", fn: "tick", argsJson: "[{}]", field: null, check: null, expectedType: null, minCount: null, repeat: 25, stationOrEntityKey: null,
  });
  assert.equal(r.valid, true);
  if (r.valid) assert.equal((r.criterion as any).repeat, 25);
});

test("render: a well-formed criterion is accepted", () => {
  const r = validateProposedCriterion({ kind: "render", description: "new lamp station renders", fn: null, argsJson: null, field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: "lamp" });
  assert.equal(r.valid, true);
});

// ---------------------------------------------------------------------
// The actual root-cause fix: there is no field to carry a computed value,
// and this function explicitly rejects anything that tries to smuggle one
// in through a field the schema doesn't define.
// ---------------------------------------------------------------------
test("rejects a criterion that smuggles a computed value in through an 'expected' field the schema doesn't define", () => {
  const r = validateProposedCriterion({
    kind: "non-regression", description: "feed math", fn: "tick", argsJson: "[{}]", field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null,
    expected: { money: 95, pets: [{ hunger: 55 }] }, // the exact flagship-case shape
  } as any);
  assert.equal(r.valid, false);
  if (!r.valid) assert.match(r.reason, /expected/i);
});

test("rejects a criterion smuggling a value via 'expectedJson' (the OLD schema's field name)", () => {
  const r = validateProposedCriterion({
    kind: "existence", description: "x", fn: "tick", argsJson: "[{}]", field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null,
    expectedJson: "{\"money\":95}",
  } as any);
  assert.equal(r.valid, false);
});

// Guardrail-on-the-guardrail: does the smuggled-field check fire on
// anything with "expect" in the name, or does it correctly leave a
// legitimate field (expectedType, which IS part of the real schema) alone?
test("guardrail: the smuggled-value check does not false-positive on the real 'expectedType' field", () => {
  const r = validateProposedCriterion({
    kind: "structural", description: "x", fn: "initialWorld", argsJson: "[]", field: "pets", check: "type", expectedType: "array", minCount: null, repeat: null, stationOrEntityKey: null,
  });
  assert.equal(r.valid, true);
});

test("malformed argsJson is rejected with a clear reason, not thrown as an uncaught crash", () => {
  const r = validateProposedCriterion({
    kind: "existence", description: "x", fn: "tick", argsJson: "[{'social': 10}]", field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null,
  });
  assert.equal(r.valid, false);
  if (!r.valid) assert.match(r.reason, /not valid JSON/);
});

test("structural without a field is rejected", () => {
  const r = validateProposedCriterion({
    kind: "structural", description: "x", fn: "tick", argsJson: "[{}]", field: null, check: "type", expectedType: "array", minCount: null, repeat: null, stationOrEntityKey: null,
  });
  assert.equal(r.valid, false);
});

test("render without stationOrEntityKey is rejected", () => {
  const r = validateProposedCriterion({ kind: "render", description: "x", fn: null, argsJson: null, field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null });
  assert.equal(r.valid, false);
});

test("unknown kind is rejected by name", () => {
  const r = validateProposedCriterion({ kind: "numeric", description: "x" } as any);
  assert.equal(r.valid, false);
  if (!r.valid) assert.match(r.reason, /unknown kind/);
});

test("validateProposedCriteria splits accepted from rejected, and rejected carries the raw input back for re-emission", () => {
  const { accepted, rejected } = validateProposedCriteria([
    { kind: "existence", description: "ok", fn: "tick", argsJson: "[{}]", field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null },
    { kind: "existence", description: "bad", fn: "tick", argsJson: "not json", field: null, check: null, expectedType: null, minCount: null, repeat: null, stationOrEntityKey: null },
  ]);
  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].raw);
});
