// A QUEST MAY ONLY SAY DONE WHEN DONE IS TRUE.
//
// This is the project's thesis in the one place it will matter most to a
// player: a function written by a model, at their request, making a claim about
// their world. Every test below is a way that claim could be false.
//
// The failure modes are not hypothetical. They are what a wrong generated
// check actually returns: `true`, or nothing, or a crash. If any of those
// completes a quest, then the first thing the coding agent ever writes for a
// player is a system that lies to them.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  questState,
  validateQuest,
  evaluateQuest,
  createQuestLog,
  QUEST_STATE_FIELDS,
} from "../public/quest.js";

const ok = (over: any = {}) => ({
  id: "q1",
  title: "See the city",
  brief: "Visit three districts.",
  check: (s: any) => ({ done: s.player.visitedDistricts.length >= 3, progress: s.player.visitedDistricts.length / 3 }),
  ...over,
});

const state = (over: any = {}) =>
  questState(
    { plots: new Array(20).fill(0), blocks: new Array(3).fill(0), districts: [{ id: "downtown" }], settlements: [{ id: "harbour" }], bridges: [] },
    { x: 10, z: 20, mode: "walk", visitedDistricts: [], ...over },
  );

// ---------------------------------------------------------------------------
// The snapshot
// ---------------------------------------------------------------------------

test("the state a check sees is plain data, with no live objects in it", () => {
  // A check runs in an isolate during verification and in a browser during
  // play. If the state carried a mesh or a closure those would be two different
  // worlds, and a check verified in one would be unverified in the other.
  const s = state();
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s, "the quest state is not round-trippable as JSON");
});

test("the state carries counts and ids, not the world itself", () => {
  const s = state();
  assert.equal(s.world.plots, 20, "plots should be a count");
  assert.deepEqual(s.world.districts, ["downtown"], "districts should be ids");
  assert.equal(typeof s.world.plots, "number");
});

test("a missing world does not produce a state full of undefined", () => {
  // A check is a generated function. Handing it undefined fields is how you get
  // "cannot read properties of undefined" reported as a quest that cannot be
  // completed, which is a crash wearing a difficulty's costume.
  const s = questState(undefined as any, undefined as any);
  assert.equal(s.world.plots, 0);
  assert.deepEqual(s.world.districts, []);
  assert.equal(s.player.x, 0);
  assert.equal(s.time.day, 1);
});

test("the declared field list matches what the state actually has", () => {
  // The model is TOLD these fields exist. If the list and the object drift, the
  // model writes checks against fields that are not there -- a quest that can
  // never complete, for a reason nobody can see.
  const s = state();
  for (const [group, fields] of Object.entries(QUEST_STATE_FIELDS)) {
    assert.ok((s as any)[group], `the state has no "${group}" group, but the field list declares one`);
    for (const f of fields as string[]) {
      assert.ok(f in (s as any)[group], `QUEST_STATE_FIELDS promises ${group}.${f}, which the state does not have`);
    }
  }
});

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

test("a quest without a check, title, id or brief is refused", () => {
  assert.match(validateQuest(ok({ check: undefined }))!, /check function/);
  assert.match(validateQuest(ok({ title: "" }))!, /title/);
  assert.match(validateQuest(ok({ id: "" }))!, /id/);
  assert.match(validateQuest(ok({ brief: "" }))!, /brief/);
  assert.equal(validateQuest(ok()), null, "a well-formed quest was refused");
});

test("a check that takes no argument is refused -- it cannot be reading the world", () => {
  // A zero-argument check cannot be answering a question about the world, so
  // whatever it returns is a constant. That is a lookup wearing a quest's
  // costume, which is the exact thing this project exists to catch.
  assert.match(validateQuest(ok({ check: () => ({ done: true }) }))!, /take the world state/);
});

// ---------------------------------------------------------------------------
// THE VERDICT -- every way a generated check could lie
// ---------------------------------------------------------------------------

test("a check that throws does not complete the quest, and says so", () => {
  const r = evaluateQuest(ok({ check: (_s: any) => { throw new Error("boom"); } }), state());
  assert.equal(r.done, false);
  assert.equal(r.errored, true, "a crashing check must be ERRORED, not merely not-yet-done");
  assert.match(r.reason!, /threw: boom/);
});

test("a check returning bare true does not complete the quest", () => {
  // The single most likely thing a wrong generated check returns. If this
  // counted, every broken quest would complete instantly.
  const r = evaluateQuest(ok({ check: (_s: any) => true as any }), state());
  assert.equal(r.done, false);
  assert.equal(r.errored, true);
  assert.match(r.reason!, /not a verdict object/);
});

test("a check returning nothing, or an array, does not complete the quest", () => {
  for (const bad of [undefined, null, [], [1, 2]]) {
    const r = evaluateQuest(ok({ check: (_s: any) => bad as any }), state());
    assert.equal(r.done, false, `${JSON.stringify(bad)} completed a quest`);
    assert.equal(r.errored, true);
  }
});

test("done must be a real boolean, not merely truthy", () => {
  // A check sloppy about its verdict is not one to trust with a verdict.
  for (const sloppy of [1, "yes", "true", {}]) {
    const r = evaluateQuest(ok({ check: (_s: any) => ({ done: sloppy }) as any }), state());
    assert.equal(r.done, false, `done: ${JSON.stringify(sloppy)} was accepted as completion`);
    assert.equal(r.errored, true);
    assert.match(r.reason!, /real boolean/);
  }
  // And the control: a real boolean is accepted, in both directions.
  assert.equal(evaluateQuest(ok({ check: (_s: any) => ({ done: true }) }), state()).done, true);
  assert.equal(evaluateQuest(ok({ check: (_s: any) => ({ done: false }) }), state()).done, false);
});

test("progress is clamped, and never invents completion", () => {
  const r = evaluateQuest(ok({ check: (_s: any) => ({ done: false, progress: 4 }) }), state());
  assert.equal(r.progress, 1, "progress was not clamped to 1");
  assert.equal(r.done, false, "progress of 1 completed a quest that said it was not done");

  const n = evaluateQuest(ok({ check: (_s: any) => ({ done: false, progress: -3 }) }), state());
  assert.equal(n.progress, 0);

  const nan = evaluateQuest(ok({ check: (_s: any) => ({ done: false, progress: NaN }) }), state());
  assert.equal(nan.progress, 0, "NaN progress should fall back, not propagate");
});

test("a real quest completes when the world genuinely satisfies it", () => {
  // The control for every refusal above. Without this, a validate() that
  // refused EVERYTHING would pass this whole file.
  const before = evaluateQuest(ok(), state({ visitedDistricts: ["a"] }));
  assert.equal(before.done, false);
  assert.ok(before.progress > 0 && before.progress < 1, `partial progress expected, got ${before.progress}`);

  const after = evaluateQuest(ok(), state({ visitedDistricts: ["a", "b", "c"] }));
  assert.equal(after.done, true);
  assert.equal(after.errored, false);
  assert.equal(after.progress, 1);
});

// ---------------------------------------------------------------------------
// The log
// ---------------------------------------------------------------------------

test("the log refuses a malformed quest rather than storing it", () => {
  const log = createQuestLog();
  assert.equal(log.offer(ok({ check: undefined })).ok, false);
  assert.equal(log.size(), 0, "a malformed quest was stored anyway");
  assert.equal(log.offer(ok()).ok, true);
  assert.equal(log.size(), 1);
  assert.equal(log.offer(ok()).ok, false, "the same id was offered twice");
});

test("completion is one-way -- a later world change cannot take it back", () => {
  // You did visit those districts. A world edit afterwards does not undo it,
  // and a player losing progress for reasons they cannot see is worse than a
  // quest that stays done.
  const log = createQuestLog();
  log.offer(ok());
  log.update(state({ visitedDistricts: ["a", "b", "c"] }));
  assert.equal(log.get("q1")!.done, true);

  log.update(state({ visitedDistricts: [] }));
  assert.equal(log.get("q1")!.done, true, "a completed quest was un-completed by a later check");
});

test("a broken quest is reported as broken, not left looking merely difficult", () => {
  // A generated check that always throws would otherwise sit at 0% forever,
  // indistinguishable from a hard quest. The difference is what the player
  // needs and what a repair loop needs.
  const log = createQuestLog();
  log.offer(ok({ id: "bad", check: (_s: any) => { throw new Error("no such field"); } }));
  log.offer(ok({ id: "good" }));
  log.update(state());

  const broken = log.broken();
  assert.equal(broken.length, 1, `expected exactly one broken quest, got ${JSON.stringify(broken)}`);
  assert.equal(broken[0].id, "bad");
  assert.match(broken[0].reason, /no such field/);
});

test("update reports what changed, so nothing has to poll the whole log", () => {
  const log = createQuestLog();
  log.offer(ok());
  const first = log.update(state({ visitedDistricts: ["a"] }));
  assert.equal(first.length, 1, "a progress change was not reported");

  const second = log.update(state({ visitedDistricts: ["a"] }));
  assert.equal(second.length, 0, "an unchanged quest was reported as changed");
});
