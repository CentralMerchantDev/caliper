// Found running real trials (BUILD-V2 step 5): the same change request
// ("add a second sim who can socialise") crashed the run twice in a row on
// the re-plan call after answering a clarifying question. Cause: the plan
// schema only requires argsJson/expectedJson to be TYPE string -- it can't
// constrain their CONTENT to be valid JSON, so the model can emit a string
// that looks like JSON but isn't (unescaped quotes, a stray single quote,
// a trailing comma). Nothing retried; the run just died with an `error`
// event, no ledger, nothing recorded. This pins the fix: one retry with an
// explicit correction, same validate-before-consume shape as every other
// parse-then-trust step in claude.ts, then a clear failure -- never a
// crash with no record of what happened.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseCriteria } from "../src/claude.ts";

test("parseCriteria: valid JSON in every criterion parses cleanly", () => {
  const result = parseCriteria([
    { description: "eat restores hunger", fn: "applyAction", argsJson: '[{"hunger":10}]', expectedJson: '{"hunger":50}' },
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].args, [{ hunger: 10 }]);
  assert.deepEqual(result[0].expected, { hunger: 50 });
});

test("parseCriteria: malformed JSON (single-quoted keys) throws a clear, catchable error naming the criterion", () => {
  assert.throws(
    () =>
      parseCriteria([
        { description: "applyAction call restores sim2 social independent of sim1", fn: "applyAction", argsJson: "[{'social': 10}]", expectedJson: '{"social":50}' },
      ]),
    /applyAction call restores sim2 social independent of sim1/,
  );
});

test("parseCriteria: empty criteria list is a legitimate outcome, not a failure", () => {
  assert.deepEqual(parseCriteria([]), []);
});
