// Chunk 4's actual claim ("one source of truth... made legible") is only
// true if src/worldStructure.ts's STATIONS can never silently drift from
// public/world-render.js's STATIONS -- otherwise this is two lists someone
// has to remember to keep in sync, which is exactly the kind of thing that
// quietly goes stale. This test makes drift a failing test, not a hope.
import { test } from "node:test";
import assert from "node:assert/strict";

import { STATIONS as PIPELINE_STATIONS, ACTIONS, structureSummary, NOT_YET_PRESENT } from "../src/worldStructure.ts";
import { STATIONS as RENDERER_STATIONS } from "../public/world-render.js";

function normalize(stations: Record<string, unknown>) {
  return Object.entries(stations)
    .filter(([, v]) => (v as { label: string | null }).label !== null) // "center" is an idle fallback, not a drawn station
    .map(([key, v]) => ({ key, action: (v as { action: string }).action, label: (v as { label: string }).label }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

test("worldStructure's STATIONS match world-render.js's STATIONS exactly -- no drift", () => {
  const fromPipeline = [...PIPELINE_STATIONS].sort((a, b) => a.key.localeCompare(b.key));
  const fromRenderer = normalize(RENDERER_STATIONS as Record<string, unknown>);
  assert.deepEqual(fromPipeline, fromRenderer);
});

// The guardrail test itself needs a test: does the comparison above actually
// fail on real drift, or would it silently pass no matter what? Simulate
// the drift directly against the same comparison logic instead of trusting
// that "deepEqual" does the right thing by construction.
test("guardrail: the same comparison actually fails when the two lists genuinely disagree", () => {
  const fromPipeline = [...PIPELINE_STATIONS].sort((a, b) => a.key.localeCompare(b.key));
  const driftedRenderer = normalize({
    ...(RENDERER_STATIONS as Record<string, unknown>),
    bed: { ...(RENDERER_STATIONS as any).bed, action: "wrong-action-planted-on-purpose" },
  });
  assert.throws(() => assert.deepEqual(fromPipeline, driftedRenderer));
});

test("every station's action is a real action in ACTIONS", () => {
  for (const s of PIPELINE_STATIONS) assert.ok((ACTIONS as readonly string[]).includes(s.action), `${s.key} claims action "${s.action}", not in ACTIONS`);
});

test("structureSummary is deterministic and mentions every NOT_YET_PRESENT item (grounding reads this verbatim)", () => {
  const a = structureSummary();
  const b = structureSummary();
  assert.equal(a, b);
  for (const item of NOT_YET_PRESENT) assert.ok(a.includes(item), `summary is missing: ${item}`);
});

// CITY.md item 1: the single-room-only limit is gone -- a second location
// (in fact several) is now the whole point of the world, so grounding must
// no longer report one as absent. This is the direct update to the test
// that used to assert the opposite; the fact changed, so the test that
// checks the fact must change with it -- this is not the sim's regression
// suite, which stays untouched.
test("structureSummary reports a real neighbourhood, not a single room", () => {
  const summary = structureSummary();
  assert.match(summary, /neighbourhood/);
  assert.doesNotMatch(summary, /no second location/);
});
