// FOUNDATION.md item 1: chunk 4's original claim ("one source of truth...
// made legible") used to require this test to compare TWO hand-typed
// station lists -- src/worldStructure.ts's and public/world-render.js's own
// copy -- for drift. That second list is gone: world-render.js now derives
// station positions from world.objectTypes at draw time, the same registry
// worldStructure.ts reads. There is one list, not two, so there is nothing
// left to drift.
//
// What CAN still silently regress is narrower but real: world-render.js
// keeps a hand-tuned plan-view SYMBOL_DRAWERS entry per known type for
// visual quality (see its header comment); a station type present in the
// registry but missing a drawer entry would silently fall back to the
// plainer generic symbol. This test catches that specific omission.
import { test } from "node:test";
import assert from "node:assert/strict";

import { STATIONS as PIPELINE_STATIONS, ACTIONS, structureSummary, NOT_YET_PRESENT } from "../src/worldStructure.ts";
import { WorldRenderer } from "../public/world-render.js";

test("world-render.js has a hand-tuned plan symbol for every station type worldStructure.ts knows about -- no silent drop to the generic fallback", () => {
  const drawers = WorldRenderer.SYMBOL_DRAWERS as Record<string, unknown>;
  for (const s of PIPELINE_STATIONS) assert.ok(s.key in drawers, `${s.key} has no SYMBOL_DRAWERS entry in world-render.js -- would silently draw with the generic 2D fallback instead`);
});

// The guardrail test itself needs a test: does the check above actually
// fail on a real omission, or would it silently pass no matter what?
test("guardrail: the same check actually fails when a station's symbol is missing", () => {
  const drawers = { ...(WorldRenderer.SYMBOL_DRAWERS as Record<string, unknown>) };
  delete drawers.bed;
  assert.throws(() => assert.ok("bed" in drawers, "bed has no SYMBOL_DRAWERS entry"));
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
test("structureSummary describes the city the visitor sees, AND what can be changed", () => {
  // This used to assert the word "neighbourhood", which was true of a
  // four-house village and became a lie the moment the main page started
  // rendering a 40 km city. Grounding reads this verbatim, so a request like
  // "add a bench near the tower" was checked against a world containing no
  // tower and refused as a false premise -- correctly, by a model that had been
  // told the wrong thing.
  //
  // The two halves are the point, and they are different: the CITY is the
  // ground, the REGISTRY is what can be placed on it. A summary with only one
  // of them either blinds the model to the world or invites it to try to move
  // roads.
  const summary = structureSummary();

  // the city half
  assert.match(summary, /THE WORLD YOU ARE LOOKING AT/);
  assert.match(summary, /coastal region/);
  assert.match(summary, /building plots in \d+ settlements/);
  assert.match(summary, /Settlements, with what is in each/);

  // the editable half
  assert.match(summary, /WHAT A CHANGE CAN ADD OR ALTER/);
  assert.match(summary, /Tavern \(id: shop, type: shop\)/);
  assert.match(summary, /"The tavern" means.*"shop"/);
  assert.doesNotMatch(summary, /no second location/);

  // and the city must come FIRST -- context before the thing being changed
  assert.ok(
    summary.indexOf("THE WORLD YOU ARE LOOKING AT") < summary.indexOf("WHAT A CHANGE CAN ADD OR ALTER"),
    "the world has to be described before the change that acts on it",
  );
});

