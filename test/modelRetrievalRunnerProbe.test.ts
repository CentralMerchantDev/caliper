import test from "node:test";
import assert from "node:assert/strict";

test("runner selection probe", () => {
  assert.equal(2 + 2, 4);
  console.log("RUNNER_SELECTION_PROBE");
});
