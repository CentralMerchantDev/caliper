// =============================================================================
// THE REGISTRY IS A VOLUME, AND IT KNOWS WHICH QUESTION IT WAS ASKED
//
// Two defects lived here, both invisible on a green suite because both produced
// a plausible answer to the wrong question.
//
// 1. HEIGHT WAS DISCARDED. reserve() has taken yMin/yMax since it was written,
//    and bridges are registered with real deck clearances -- arch 2-30 m,
//    cable-stayed 2-55 m -- for the express purpose of leaving the water
//    beneath them navigable. overlapsReserved then answered in plan only, so a
//    bridge blocked the channel it spans and a lamp head at 9 m blocked the
//    pavement under it. The data was right; the query threw it away.
//
// 2. THERE WAS NO WAY TO SAY WHICH QUESTION. "May I build a house here?" and
//    "may I stand here?" got one answer. Roads are reserved across their FULL
//    right of way, footway included, so a lamp on a pavement is legitimately
//    inside a road's rectangle. Asked without a filter, the registry refuses
//    every lamp and bench in the city -- and it looks like placement broke,
//    not like the wrong question was asked.
//
// Both tests below must be paired against a case that still blocks, or a
// registry that simply stopped refusing anything would satisfy them.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createWorldRegistry } from "../public/world-registry.js";

/** A registry with no terrain, so only explicit reservations answer. */
const bare = () => createWorldRegistry(null);

test("a bridge deck does not block the water it spans", () => {
  const reg = bare();
  reg.reserve({
    kind: "bridge", id: "span", owner: "cable",
    xMin: -100, xMax: 100, zMin: -10, zMax: 10,
    yMin: 2, yMax: 55,
  });

  // THE FIRST VERSION OF THIS TEST WAS WRONG, AND SAYING SO IS THE POINT.
  //
  // It asserted that a 4 m boat passes under a deck whose underside is at 2 m,
  // which is not true of any bridge. The reservation spans 2-55 m: that IS the
  // structure, and the clearance is what lies below it. A launch of 1.5 m goes
  // under; anything over 2 m does not. The registry was right and the
  // expectation was nonsense -- which is the more dangerous of the two, because
  // "fixing" the code to satisfy it would have opened every bridge in the world.
  const launch = reg.overlapsReserved(-5, 5, -5, 5, 0, { yMin: 0, yMax: 1.5 });
  assert.equal(launch, null, "a 1.5 m launch passes beneath a deck whose underside is at 2 m");

  const mast = reg.overlapsReserved(-5, 5, -5, 5, 0, { yMin: 0, yMax: 30 });
  assert.ok(mast, "a 30 m mast must NOT pass under a deck occupying 2-55 m");
  assert.equal((mast as any).id, "span");

  // And with no height given at all, the old behaviour: blocks.
  assert.ok(
    reg.overlapsReserved(-5, 5, -5, 5),
    "asked without a height range, a reservation must still block — otherwise every existing caller silently stopped checking",
  );
});

test("a deck resting exactly on a datum is not inside it", () => {
  const reg = bare();
  reg.reserve({ kind: "bridge", id: "span", xMin: -10, xMax: 10, zMin: -10, zMax: 10, yMin: 2, yMax: 55 });
  // Touching, not overlapping — the same rule the plan axes already use.
  assert.equal(reg.overlapsReserved(-1, 1, -1, 1, 0, { yMin: 0, yMax: 2 }), null);
  assert.ok(reg.overlapsReserved(-1, 1, -1, 1, 0, { yMin: 0, yMax: 2.01 }));
});

test("ignoreKinds lets a prop stand on a pavement inside a road's rectangle", () => {
  const reg = bare();
  // A road across its full right of way, as generateWorld registers them.
  reg.reserve({ kind: "road", id: "main-st", owner: "STREET", xMin: -9, xMax: 9, zMin: -500, zMax: 500 });
  // A bench already on the pavement.
  reg.reserve({ kind: "prop", id: "bench-1", owner: "bench", xMin: 6, xMax: 8, zMin: 0, zMax: 1 });

  // The unfiltered question refuses the whole pavement — this is the behaviour
  // that would have emptied the street scene.
  assert.ok(
    reg.overlapsReserved(6.5, 7.5, 40, 41),
    "without a filter a pavement position is inside the road, and this must still report that",
  );

  // The placement question: ignore the ground-defining kinds, keep the objects.
  const free = reg.overlapsReserved(6.5, 7.5, 40, 41, 0, { ignoreKinds: ["road"] });
  assert.equal(free, null, "a clear stretch of pavement should be free once the road itself is not the answer");

  const taken = reg.overlapsReserved(6.5, 7.5, 0.2, 0.8, 0, { ignoreKinds: ["road"] });
  assert.ok(taken, "the bench must still be found — ignoring roads must not ignore everything");
  assert.equal((taken as any).id, "bench-1");
});

test("onlyKinds asks about one kind and nothing else", () => {
  const reg = bare();
  reg.reserve({ kind: "road", id: "r", xMin: -9, xMax: 9, zMin: -100, zMax: 100 });
  reg.reserve({ kind: "prop", id: "p", xMin: 0, xMax: 1, zMin: 0, zMax: 1 });

  const onlyProps = reg.overlapsReserved(-9, 9, -100, 100, 0, { onlyKinds: ["prop"] });
  assert.equal((onlyProps as any).id, "p");

  const onlyBuildings = reg.overlapsReserved(-9, 9, -100, 100, 0, { onlyKinds: ["building"] });
  assert.equal(onlyBuildings, null, "there is no building here, and asking about buildings should say so");
});

test("findFree asks the same question the caller will ask when it places", () => {
  // A search that uses different rules from the placement check will happily
  // return somewhere that placement then refuses, and the caller has no way to
  // tell that the two disagreed.
  const reg = bare();
  reg.reserve({ kind: "road", id: "r", xMin: -200, xMax: 200, zMin: -200, zMax: 200 });

  const blind = reg.findFree(2, 2, { x: 0, z: 0 }, { radius: 100, step: 25 });
  assert.equal(blind, null, "everything within the radius is road, so an unfiltered search must find nothing");

  const filtered = reg.findFree(2, 2, { x: 0, z: 0 }, { radius: 100, step: 25, ignoreKinds: ["road"] });
  assert.ok(filtered, "with roads not counting as occupants, the same spot is free");
  assert.equal(filtered!.moved, 0, "and it is free where we asked, so nothing should have moved");
});

test("time still governs, with a height range in play", () => {
  const reg = bare();
  reg.reserve({
    kind: "building", id: "old-mill", xMin: -5, xMax: 5, zMin: -5, zMax: 5,
    yMin: 0, yMax: 20, since: 0, until: 100,
  });
  const q = { yMin: 0, yMax: 20 };
  assert.ok(reg.overlapsReserved(-1, 1, -1, 1, 50, q), "the mill stands at t=50");
  assert.equal(reg.overlapsReserved(-1, 1, -1, 1, 150, q), null, "the mill was demolished at t=100");
});
