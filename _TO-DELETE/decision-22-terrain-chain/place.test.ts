// =============================================================================
// ASKING AND RECORDING ARE ONE OPERATION
//
// public/place.js is the only door between "the land says yes" and "the world
// now holds this". These check the properties that make it a door rather than a
// suggestion:
//
//   * a refusal changes nothing -- no half-placed thing, no reservation
//   * a success is visible to the NEXT question, so two placements cannot both
//     be told the same ground is free
//   * removal closes an interval instead of erasing history
//   * a failed move puts the thing back
//
// That last one is the one worth having. A move that deletes what it was moving
// when the destination is refused is the most obvious way for an editing tool
// to destroy someone's work, and it happens exactly when the user is already
// being told no.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGround, SURFACE } from "../public/ground.js";
import { createWorldRegistry } from "../public/world-registry.js";
import { createPlacer } from "../public/place.js";
import { createGrid } from "../public/grid.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField());
const probe = createGround({ heightAt });

/** Open, flat ground with room around it, found rather than assumed. */
function clearGround(r = 40): [number, number] {
  for (let x = -8000; x <= 8000; x += 80) {
    for (let z = -8000; z <= 8000; z += 80) {
      if (heightAt(x, z) < 5) continue;
      let ok = true;
      for (let dx = -r; dx <= r && ok; dx += r / 2) {
        for (let dz = -r; dz <= r && ok; dz += r / 2) {
          if (probe.surfaceAt(x + dx, z + dz) !== SURFACE.OPEN) ok = false;
          if (Math.abs(heightAt(x + dx, z + dz) - heightAt(x, z)) > 3) ok = false;
        }
      }
      if (ok) return [x, z];
    }
  }
  throw new Error("no clear ground anywhere — the world has changed shape");
}

function world() {
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  return { registry, ground, placer: createPlacer({ ground, registry }) };
}

const HUT = { id: "hut", kind: "building", category: "building", footprint: { w: 6, d: 6 }, height: 4, clearance: 0, maxRange: 1e9 };

test("a placer will not exist without a land to ask or a world to record in", () => {
  // @ts-expect-error deliberately wrong
  assert.throws(() => createPlacer({ registry: createWorldRegistry(null) }), /ground/);
  // @ts-expect-error deliberately wrong
  assert.throws(() => createPlacer({ ground: createGround({ heightAt }) }), /registry/);
});

test("placing records it, and the next question can see it", () => {
  // THE PROPERTY THE WHOLE FILE EXISTS FOR. If a placement is not visible to
  // the next placement, two things are told the same ground is free and both
  // stand there -- which is every defect this project has found, in one line.
  const { placer, registry } = world();
  const [x, z] = clearGround();

  const first = placer.place(HUT, x, z);
  assert.equal(first.ok, true, `expected clear ground to take a hut: ${(first as any).reason} — ${(first as any).detail}`);
  assert.ok(registry.list().length === 1, "a successful placement must leave exactly one record");

  const second = placer.place(HUT, x, z);
  assert.equal(second.ok, false, "the same ground must not be given away twice");
  assert.equal((second as any).reason, "occupied");
});

test("a refusal leaves nothing behind", () => {
  // A half-placed thing is worse than a refused one: the world would hold a
  // reservation for something that was never put there.
  const { placer, registry } = world();
  const [x, z] = clearGround();
  const wet = (() => {
    for (let a = -8000; a <= 8000; a += 40) for (let b = -8000; b <= 8000; b += 40) if (heightAt(a, b) < -20) return [a, b];
    throw new Error("no deep water found");
  })() as [number, number];

  const r = placer.place(HUT, wet[0], wet[1]);
  assert.equal(r.ok, false);
  assert.equal(registry.list().length, 0, "a refused placement must not reserve anything");

  // And the ground it was refused on is still free for something that belongs.
  assert.equal(placer.place(HUT, x, z).ok, true);
});

test("refusals are counted by reason, not swallowed", () => {
  const { placer } = world();
  const wet = (() => {
    for (let a = -8000; a <= 8000; a += 40) for (let b = -8000; b <= 8000; b += 40) if (heightAt(a, b) < -20) return [a, b];
    throw new Error("no deep water found");
  })() as [number, number];

  placer.place(HUT, wet[0], wet[1]);
  placer.place(HUT, wet[0], wet[1]);
  const rep = placer.report();
  assert.equal(rep.placed, 0);
  assert.equal(rep.refused.terrain, 2, `two refusals for terrain should be counted: ${JSON.stringify(rep.refused)}`);
});

test("placeNear moves outward and says how far it went", () => {
  const { placer } = world();
  const [x, z] = clearGround(80);

  const first = placer.placeNear(HUT, { x, z }, { radius: 400, step: 20 });
  assert.equal(first.ok, true);
  assert.equal((first as any).moved, 0, "the first hut should not have to move at all");

  const second = placer.placeNear(HUT, { x, z }, { radius: 400, step: 20 });
  assert.equal(second.ok, true, "there should be room nearby for a second hut");
  assert.ok((second as any).moved > 0, "the second hut must have moved off the first");
});

test("removing closes the interval instead of erasing the record", () => {
  // The fourth dimension, actually used. A registry that forgets on removal has
  // a time axis it cannot answer with.
  const { placer, registry } = world();
  const [x, z] = clearGround();
  const put = placer.place(HUT, x, z, { id: "hut-1", t: 0 });
  assert.equal(put.ok, true);

  assert.deepEqual(placer.remove("hut-1", 10), { ok: true, closed: 1 });

  const still = registry.list().find((e) => e.id === "hut-1");
  assert.ok(still, "the record must survive removal — that is what makes the past answerable");
  assert.equal(still!.until, 10);

  // It stood at t=5 and does not at t=20.
  assert.ok(registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 5));
  assert.equal(registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 20), null);
});

test("removing something that is not there says so", () => {
  const { placer } = world();
  const r = placer.remove("never-existed", 1);
  assert.equal(r.ok, false);
  assert.equal((r as any).reason, "not-found");
});

test("closing before something began is refused rather than quietly recorded", () => {
  // An interval that is true at no time at all looks correct in the data and is
  // impossible to reason about later.
  const { placer, registry } = world();
  const [x, z] = clearGround();
  placer.place(HUT, x, z, { id: "hut-1", t: 10 });
  assert.throws(() => registry.close("hut-1", 5), /before its since/);
});

test("a MOVE that is refused puts the thing back exactly as it was", () => {
  // The property worth having. Without it, a refused move deletes what it was
  // moving -- and it happens precisely when the user is being told no.
  const { placer, registry } = world();
  const [x, z] = clearGround();
  placer.place(HUT, x, z, { id: "hut-1", t: 0 });
  const before = registry.list().find((e) => e.id === "hut-1")!;
  const wasAt = { xMin: before.xMin, zMin: before.zMin, since: before.since, until: before.until };

  const wet = (() => {
    for (let a = -8000; a <= 8000; a += 40) for (let b = -8000; b <= 8000; b += 40) if (heightAt(a, b) < -20) return [a, b];
    throw new Error("no deep water found");
  })() as [number, number];

  const moved = placer.move(HUT, "hut-1", wet[0], wet[1], { t: 5 });
  assert.equal(moved.ok, false, "a hut cannot be moved into the sea");
  assert.match((moved as any).detail, /left where it was/);

  const after = registry.list().filter((e) => e.id === "hut-1");
  assert.equal(after.length, 1, "a refused move must leave exactly one record, not zero and not two");
  assert.deepEqual(
    { xMin: after[0].xMin, zMin: after[0].zMin, since: after[0].since, until: after[0].until },
    wasAt,
    "a refused move must leave no trace at all — including in the history",
  );
});

test("a thing that digs in reserves the hole it digs, not just what shows above", () => {
  // Reserving only what is visible is how two basements end up sharing the same
  // hole while both look fine from above. It is also what makes the strata in
  // ground.js load-bearing rather than decorative.
  const { placer, registry } = world();
  const [x, z] = clearGround();
  const TOWER = {
    id: "tower", kind: "building", category: "building",
    footprint: { w: 8, d: 8 }, height: 40, depth: 12, clearance: 0, maxRange: 1e9,
  };
  const put = placer.place(TOWER, x, z, { id: "t1" });
  assert.equal(put.ok, true);

  const e = registry.list().find((r) => r.id === "t1")!;
  const surface = heightAt(x, z);
  assert.ok(e.yMin < surface, `the reservation must start below the surface: yMin ${e.yMin} vs ground ${surface}`);
  assert.ok(
    Math.abs((e.yMax - e.yMin) - 52) < 1.5,
    `a 40 m tower with a 12 m basement occupies 52 m of world, got ${(e.yMax - e.yMin).toFixed(1)}`,
  );

  // And the hole is genuinely occupied: something trying to use it is refused.
  assert.ok(
    registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 0, { yMin: surface - 10, yMax: surface - 8 }),
    "the basement volume must be occupied, not merely recorded",
  );
});

test("a model with no depth sits on the surface and digs nothing", () => {
  // The pair. If depth were applied unconditionally every bench would come with
  // a basement, and the check above would pass for the wrong reason.
  const { placer, registry } = world();
  const [x, z] = clearGround();
  placer.place(HUT, x, z, { id: "h1" });
  const e = registry.list().find((r) => r.id === "h1")!;
  assert.ok(Math.abs(e.yMin - heightAt(x, z)) < 1.5, "a hut with no declared depth should start at the ground");
});

test("the grid refuses locked and off-map ground before the land is even asked", () => {
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const grid = createGrid({ openRegions: [] });
  const placer = createPlacer({ ground, registry, grid });
  const [x, z] = clearGround();

  const shut = placer.place(HUT, x, z);
  assert.equal(shut.ok, false, "nothing is placeable while nothing is open");
  assert.equal((shut as any).reason, "locked");
  assert.equal(registry.list().length, 0, "a locked refusal must reserve nothing");

  grid.openRegion({ xMin: x - 200, xMax: x + 200, zMin: z - 200, zMax: z + 200, name: "opened" });
  assert.equal(placer.place(HUT, x, z).ok, true, "once opened, the same ground takes it");

  const far = placer.place(HUT, 26000, 26000);
  assert.equal(far.ok, false);
  assert.equal((far as any).reason, "off-map");
});

test("a MOVE that is accepted leaves the thing in the new place and not the old", () => {
  const { placer, registry } = world();
  const [x, z] = clearGround(120);
  placer.place(HUT, x, z, { id: "hut-1", t: 0 });

  const moved = placer.move(HUT, "hut-1", x + 60, z, { t: 5 });
  assert.equal(moved.ok, true, `expected room 60 m away: ${(moved as any).reason} — ${(moved as any).detail}`);

  // Nothing stands at the old spot now...
  assert.equal(registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 10), null);
  // ...but something did, before the move.
  assert.ok(registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 1));
  // ...and it stands at the new spot.
  assert.ok(registry.overlapsReserved(x + 59, x + 61, z - 1, z + 1, 10));
});
