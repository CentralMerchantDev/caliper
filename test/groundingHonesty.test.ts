// =============================================================================
// GROUNDING CANNOT DESCRIBE A WORLD THAT ISN'T THERE
//
// Three separate places used to fall back to the ORIGINAL world when they could
// not read the current one, and all three did it silently:
//
//   1. structureSummary()   -- caught a parse failure and re-derived from the
//      baseline, so grounding kept printing "Current world structure (generated
//      directly from the code)" about a world that no longer existed.
//   2. objectTypeKeysFor()  -- same catch, so an acceptance criterion could be
//      judged against a registry belonging to a different world.
//   3. changePipeline's `?? SIM_BASELINE_SOURCE` -- would have grounded a whole
//      run against the original world while telling the visitor otherwise.
//
// The pipeline ships model-authored source, so (1) and (2) are live paths, not
// theoretical ones. Describing the wrong world confidently is the exact failure
// this project exists to refuse, and a fallback that does it quietly is worse
// than a crash: a crash is visible.
//
// These tests pin the refusal. They are about HONESTY, not parsing.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { structureSummary, objectTypeKeysFor, OBJECT_TYPE_KEYS } from "../src/worldStructure";
import { SIM_BASELINE_SOURCE } from "../src/simBaseline";

const NOT_A_WORLD = "export const nothing = 1;\n";

test("structureSummary throws on an unparseable world rather than describing the baseline", () => {
  assert.throws(
    () => structureSummary(NOT_A_WORLD),
    "a world that cannot be read must raise, not silently become the original world",
  );
});

test("structureSummary still describes a world it CAN read", () => {
  const s = structureSummary(SIM_BASELINE_SOURCE);
  assert.ok(typeof s === "string" && s.length > 0);
});

test("objectTypeKeysFor treats absent and unreadable as different things", () => {
  // ABSENT means "no candidate yet" -- the baseline registry is the right
  // answer and always has been.
  assert.deepEqual(objectTypeKeysFor(undefined), OBJECT_TYPE_KEYS);
  // UNREADABLE means the world is broken. Answering from the baseline would
  // judge a criterion against a registry that is not the one under test.
  assert.throws(() => objectTypeKeysFor(NOT_A_WORLD));
});

test("a readable candidate is read, not assumed", () => {
  assert.deepEqual(objectTypeKeysFor(SIM_BASELINE_SOURCE), OBJECT_TYPE_KEYS);
});
