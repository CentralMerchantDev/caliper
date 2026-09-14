// =============================================================================
// AREA RECORD + STATE MACHINE — REBUILD-PLAN.md W1/W2.
//
// The brief's own gate: "RED is a piece resolving to the wrong area, an area
// that can be entered while LOCKED, or two areas ACTIVE at once." The last
// two belong here; the first (addressing) is areaWorld.test.ts's.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createArea, createAreaWorld, AREA_STATE } from "../public/area.js";

test("an area starts LOCKED unless told otherwise", () => {
  const a = createArea({ id: "isle-1" });
  assert.equal(a.state, AREA_STATE.LOCKED);
});

test("an area can be constructed already OPEN", () => {
  const a = createArea({ id: "isle-1", state: AREA_STATE.OPEN });
  assert.equal(a.state, AREA_STATE.OPEN);
});

test("createArea refuses an id that is not a real string", () => {
  assert.throws(() => createArea({ id: "" }));
  assert.throws(() => createArea({}));
});

test("createArea refuses a state outside LOCKED/OPEN", () => {
  assert.throws(() => createArea({ id: "isle-1", state: "ACTIVE" }));
});

// ---------------------------------------------------------------- the gate

test("GATE: an area that is LOCKED cannot be entered", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1" })] });
  const result = world.enter("isle-1");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "locked");
  // Checked, not merely recorded: the world must not believe it entered.
  assert.equal(world.activeAreaId, null);
  assert.equal(world.active(), null);
});

test("an OPEN area can be entered and becomes active", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1", state: AREA_STATE.OPEN })] });
  const result = world.enter("isle-1");
  assert.equal(result.ok, true);
  assert.equal(world.activeAreaId, "isle-1");
  assert.equal(world.active().id, "isle-1");
});

test("GATE: entering a second area leaves exactly one active, never two", () => {
  const world = createAreaWorld({
    areas: [
      createArea({ id: "isle-1", state: AREA_STATE.OPEN }),
      createArea({ id: "isle-2", state: AREA_STATE.OPEN }),
    ],
  });
  world.enter("isle-1");
  const result = world.enter("isle-2");
  assert.equal(result.ok, true);
  assert.equal(result.left, "isle-1");
  // The invariant is not "isle-2 is active" alone -- it is that isle-1 is
  // NOT, checked by name, not inferred from isle-2 being active.
  assert.equal(world.activeAreaId, "isle-2");
  assert.notEqual(world.activeAreaId, "isle-1");
  assert.equal(world.active().id, "isle-2");
});

test("leaving the active area clears it, and the area stays OPEN (leaving is not locking)", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1", state: AREA_STATE.OPEN })] });
  world.enter("isle-1");
  const { left } = world.leave();
  assert.equal(left, "isle-1");
  assert.equal(world.active(), null);
  assert.equal(world.get("isle-1").state, AREA_STATE.OPEN);
});

test("locking the active area is refused, with a reason -- not silently allowed", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1", state: AREA_STATE.OPEN })] });
  world.enter("isle-1");
  const result = world.lock("isle-1");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "active");
  assert.equal(world.get("isle-1").state, AREA_STATE.OPEN);
});

test("locking a non-active OPEN area succeeds, and it can no longer be entered", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1", state: AREA_STATE.OPEN })] });
  const locked = world.lock("isle-1");
  assert.equal(locked.ok, true);
  assert.equal(world.get("isle-1").state, AREA_STATE.LOCKED);
  const entered = world.enter("isle-1");
  assert.equal(entered.ok, false);
});

test("open() moves LOCKED to OPEN without activating it", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1" })] });
  world.open("isle-1");
  assert.equal(world.get("isle-1").state, AREA_STATE.OPEN);
  assert.equal(world.active(), null);
});

test("operating on an unknown area id names it, rather than a generic failure", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1" })] });
  assert.throws(() => world.enter("no-such-area"), /no-such-area/);
});

test("duplicate area ids are refused at construction, not silently overwritten", () => {
  assert.throws(() =>
    createAreaWorld({ areas: [createArea({ id: "isle-1" }), createArea({ id: "isle-1" })] }),
  );
});

test("get() and list() return copies -- mutating the result cannot move the world's own state", () => {
  const world = createAreaWorld({ areas: [createArea({ id: "isle-1", state: AREA_STATE.OPEN })] });
  const a = world.get("isle-1");
  a.state = AREA_STATE.LOCKED;
  assert.equal(world.get("isle-1").state, AREA_STATE.OPEN);
});
