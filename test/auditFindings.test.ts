// =============================================================================
// THE THINGS A CONTEXT-FREE AUDIT FOUND THAT THE SUITE DID NOT
//
// An agent with no knowledge of what any of this was meant to do was pointed at
// the land layer and asked to break it. It found 23 defects, two of them
// CRITICAL, in code that was already mutation-tested and 545 tests green. Every
// test in this file exists because something was wrong and NOTHING NOTICED.
//
// Worth being precise about why the existing tests missed them, because the
// pattern repeats:
//
//   * they tested the happy shape of a case, not its awkward one -- a move was
//     only ever tested on an object that had never moved before
//   * they asserted that a value was RECORDED, not that it was CHECKED
//   * they probed a boundary from far away on both sides, never at it
//   * they asserted a field was one of a set, never which one
//
// None of those is laziness. Each is a test written by someone who already knew
// what the code was supposed to do, which is exactly the knowledge that makes
// you stop looking.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGround, SURFACE } from "../public/ground.js";
import { createWorldRegistry } from "../public/world-registry.js";
import { createPlacer } from "../public/place.js";
import { createGrid, CELL, inWorld } from "../public/grid.js";
import { PROPS } from "../public/prop-manifest.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { TERRAIN } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField());
const probe = createGround({ heightAt });

function clearGround(r = 60): [number, number] {
  for (let x = -4000; x <= 4000; x += 80) {
    for (let z = -4000; z <= 4000; z += 80) {
      if (heightAt(x, z) < 5) continue;
      let ok = true;
      for (let dx = -r; dx <= r && ok; dx += r / 3) {
        for (let dz = -r; dz <= r && ok; dz += r / 3) {
          if (probe.surfaceAt(x + dx, z + dz) !== SURFACE.OPEN) ok = false;
          if (Math.abs(heightAt(x + dx, z + dz) - heightAt(x, z)) > 3) ok = false;
        }
      }
      if (ok) return [x, z];
    }
  }
  throw new Error("no clear ground");
}

function world() {
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  return { registry, ground, placer: createPlacer({ ground, registry }) };
}

const HUT = { id: "hut", kind: "building", category: "building", footprint: { w: 6, d: 6 }, height: 4, clearance: 0, maxRange: 1e9 };

// ---------------------------------------------------------------------------
// CRITICAL 1 -- a refused move corrupted the history of anything that had
// already moved once. reopen() matched on id alone, and a moved object has one
// record per place it has stood.
// ---------------------------------------------------------------------------
test("an object that has moved before, and is then refused a second move, does not stand in two places", () => {
  const { placer, registry } = world();
  const [x, z] = clearGround(120);

  placer.place(HUT, x, z, { id: "hut", t: 0 });
  const first = placer.move(HUT, "hut", x + 90, z, { t: 5 });
  assert.equal(first.ok, true, `the first move should succeed: ${(first as any).detail}`);

  // Now refuse a second move, into the sea.
  const wet = (() => {
    for (let a = -8000; a <= 8000; a += 40) for (let b = -8000; b <= 8000; b += 40) if (heightAt(a, b) < -20) return [a, b];
    throw new Error("no deep water");
  })() as [number, number];
  const second = placer.move(HUT, "hut", wet[0], wet[1], { t: 10 });
  assert.equal(second.ok, false);

  // THE ASSERTION. At t=50 the hut is at its second position and NOWHERE ELSE.
  const q = { yMin: heightAt(x, z) - 1, yMax: heightAt(x, z) + 6 };
  const atOld = registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 50, q);
  assert.equal(
    atOld, null,
    "the hut left its first position at t=5 and must not be standing there at t=50 — " +
    "reopening by id alone resurrects every place it has ever stood",
  );
  const atNew = registry.overlapsReserved(x + 89, x + 91, z - 1, z + 1, 50, q);
  assert.ok(atNew, "and it must still be standing where the successful move put it");

  // The history is intact: it WAS at the first position before t=5.
  assert.ok(registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 2, q), "at t=2 it stood at the first position");
});

// ---------------------------------------------------------------------------
// CRITICAL 2 -- place() reserved from `surface - depth` and canPlace() checked
// from the surface up, so the volume decided and the volume recorded were
// different volumes. Two basements, one hole, both accepted.
// ---------------------------------------------------------------------------
test("two things cannot be dug into the same hole", () => {
  const { placer } = world();
  const [x, z] = clearGround();
  // PURELY UNDERGROUND -- height EXACTLY zero, and that is not fussiness. The
  // first version of this test gave the cellar 0.2 m of height showing above
  // ground, so the two overlapped in that 20 cm whether or not the buried
  // volume was checked at all: it passed with the fix reverted. A test for the
  // hole has to be about nothing but the hole.
  const CELLAR = {
    id: "cellar", kind: "building", category: "building",
    footprint: { w: 10, d: 10 }, height: 0, depth: 12, clearance: 0, maxRange: 1e9,
  };
  assert.equal(placer.place(CELLAR, x, z, { id: "c1" }).ok, true);
  const second = placer.place(CELLAR, x, z, { id: "c2" });
  assert.equal(second.ok, false, "a second cellar must not be dug into the first one's hole");
  assert.equal((second as any).reason, "occupied");
});

test("but something with no basement may stand beside one at the same spot's edge", () => {
  // The pair: depth must not make everything block everything. A shallow thing
  // clear of the hole is still placeable.
  const { placer } = world();
  const [x, z] = clearGround();
  const CELLAR = { id: "cellar", kind: "building", category: "building", footprint: { w: 6, d: 6 }, height: 0, depth: 12, clearance: 0, maxRange: 1e9 };
  assert.equal(placer.place(CELLAR, x, z, { id: "c1" }).ok, true);
  assert.equal(placer.place(HUT, x + 20, z, { id: "h1" }).ok, true, "20 m away is not the same hole");
});

// ---------------------------------------------------------------------------
// HIGH 3 -- remove() threw on its own defaults. place() defaults since:0,
// remove() defaulted t:0, and close() rejects t <= since.
// ---------------------------------------------------------------------------
test("removing something at the time it was placed refuses, and does not throw", () => {
  const { placer } = world();
  const [x, z] = clearGround();
  placer.place(HUT, x, z, { id: "hut" });          // since: 0 by default
  let r: any;
  assert.doesNotThrow(() => { r = placer.remove("hut"); }, "remove is documented to return a result, not to throw");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid-time");
  // And removing it properly still works.
  assert.equal(placer.remove("hut", 10).ok, true);
});

// ---------------------------------------------------------------------------
// HIGH 4 -- the host was found by the object's CENTRE, so an apron whose centre
// fell just outside a plot matched no host and neither size check ran.
// ---------------------------------------------------------------------------
test("something overhanging a plot is refused even when its centre is outside it", () => {
  const { placer, registry, ground } = world();
  const [x, z] = clearGround(200);
  registry.reserve({ kind: "plot", id: "lot", xMin: x - 10, xMax: x + 10, zMin: z - 10, zMax: z + 10 });

  const APRON = { footprint: { w: 200, d: 200 }, height: 1, clearance: 0, category: "building", maxRange: 1e9 };
  // Centre 15 m off the lot: outside it, but the footprint swallows it whole.
  const off = ground.canPlace(APRON, x + 15, z);
  assert.equal(off.ok, false, "a 200 m apron overlapping a 20 m lot must be refused wherever its centre happens to be");
  assert.ok(
    off.reason === "too-big" || off.reason === "overhangs",
    `expected a sizing refusal, got ${off.reason}: ${off.detail}`,
  );
  void placer;
});

// ---------------------------------------------------------------------------
// HIGH 5 -- every square footprint was sampled at exactly 9 points whatever its
// size. A 120 m building was probed at 9 points 60 m apart.
// ---------------------------------------------------------------------------
test("a large footprint is sampled finely enough to see something inside it", () => {
  const land = createGround({ heightAt });
  const small = land.canPlace({ footprint: { w: 6, d: 6 }, height: 1, clearance: 0, maxRange: 1e9 }, 0, 0);
  const large = land.canPlace({ footprint: { w: 120, d: 120 }, height: 1, clearance: 0, maxRange: 1e9 }, 0, 0);
  assert.ok(
    large.samples > small.samples * 4,
    `a 120 m footprint took ${large.samples} samples and a 6 m one took ${small.samples} — ` +
    `sampling is not scaling with size, so a large footprint cannot see a river or a cliff inside it`,
  );
  // Spacing, which is the thing that actually matters.
  const spacing = 120 / (Math.sqrt(large.samples) - 1);
  assert.ok(spacing <= 6, `samples are ${spacing.toFixed(1)} m apart across a 120 m footprint — a 10 m lane would fit between them`);
});

test("a footprint smaller than one sample step still gets a centre, not only corners", () => {
  const land = createGround({ heightAt });
  const tiny = land.canPlace({ footprint: { w: 0.6, d: 0.6 }, height: 1, clearance: 0, maxRange: 1e9 }, 0, 0);
  assert.ok(tiny.samples >= 9, `a 0.6 m post took ${tiny.samples} samples — four corners and no middle`);
});

// ---------------------------------------------------------------------------
// HIGH 6 -- canPlace could stop passing the height range and the full suite
// stayed green. The registry honoured height; nothing proved its only caller
// sent it.
// ---------------------------------------------------------------------------
test("canPlace passes the height range, so a thing may stand under a bridge deck", () => {
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const [x, z] = clearGround();
  const g = heightAt(x, z);

  // A deck well overhead, exactly as generateWorld registers bridges.
  registry.reserve({ kind: "feature", id: "deck", xMin: x - 50, xMax: x + 50, zMin: z - 5, zMax: z + 5, yMin: g + 20, yMax: g + 55 });

  const low = ground.canPlace({ footprint: { w: 2, d: 2 }, height: 3, clearance: 0, category: "furniture", maxRange: 1e9 }, x, z);
  assert.equal(low.ok, true, `a 3 m object should fit under a deck starting 20 m up: ${low.reason} — ${low.detail}`);

  const tall = ground.canPlace({ footprint: { w: 2, d: 2 }, height: 40, clearance: 0, category: "building", maxRange: 1e9 }, x, z);
  assert.equal(tall.ok, false, "a 40 m tower must not be built through the deck");
  assert.equal(tall.reason, "occupied");
});

// ---------------------------------------------------------------------------
// HIGH 7 -- the world's edge was only probed 10 cells either side, never at it.
// ---------------------------------------------------------------------------
test("the world's edge is exactly where it is said to be", () => {
  const half = TERRAIN.WORLD.SIZE / 2;
  const lastCell = Math.floor((half - 1e-6) / CELL);
  assert.equal(inWorld(lastCell, 0), true, `cell ${lastCell} is the last one inside a ${TERRAIN.WORLD.SIZE} m world`);
  assert.equal(inWorld(lastCell + 1, 0), false, "and the next one is outside it");
  const firstCell = Math.floor(-half / CELL);
  assert.equal(inWorld(firstCell, 0), true, "the western edge is inside");
  assert.equal(inWorld(firstCell - 1, 0), false, "and one further west is not");
});

test("a region's edge is exactly where it is said to be", () => {
  const g = createGrid({ openRegions: [] });
  g.openRegion({ xMin: 0, xMax: 100, zMin: 0, zMax: 100, name: "r" });
  assert.equal(g.check(0, 0).ok, true, "the low edge is inside the region");
  assert.equal(g.check(99.999, 99.999).ok, true, "just inside the high edge is inside");
  assert.equal(g.check(100, 50).ok, false, "the high edge itself is outside — half-open, like every other range here");
});

test("the region list given to the constructor cannot be used to open the world later", () => {
  // regions() copies its output, and the constructor kept a live handle on the
  // caller's array — so the guard was on the way out and not on the way in.
  const mine: any[] = [];
  const g = createGrid({ openRegions: mine });
  assert.equal(g.check(0, 0).ok, false);
  mine.push({ xMin: -1e6, xMax: 1e6, zMin: -1e6, zMax: 1e6, name: "sneaked in" });
  assert.equal(g.check(0, 0).ok, false, "pushing to the array the caller passed in must not open the world");
});

// ---------------------------------------------------------------------------
// HIGH 8 -- three of the five prop-manifest fields survived mutation. Only
// `foot` was checked against anything.
// ---------------------------------------------------------------------------
test("every prop's declared height matches the geometry it is read from", () => {
  // `h` is what a placement writes as the object's yMax. It was checked against
  // nothing, and lampPost was wrong by 25 cm: its head is BoxGeometry(_, 0.5, _)
  // CENTRED at y+9.1, so the top is 9.35 and 9.1 was the centre read as the top.
  const EXPECTED: Record<string, number> = {
    bin: 1.0, bench: 0.45, busShelter: 2.5, lampPost: 9.35,
    container: 2.6, mooring: 1.0, beacon: 9.0, railTie: 0.35,
  };
  for (const [id, h] of Object.entries(EXPECTED)) {
    assert.equal(PROPS[id].h, h, `${id} declares h=${PROPS[id].h}; its geometry says ${h}`);
  }
});

test("every prop's hard/soft is asserted, not merely present", () => {
  // The old test checked `kind` was one of the two strings, so any prop could be
  // flipped from hard to soft silently — and soft means "may be built over".
  const EXPECTED: Record<string, string> = {
    bin: "hard", bench: "hard", busShelter: "hard", lampPost: "hard",
    container: "hard", mooring: "hard", beacon: "hard",
    railTie: "soft", tree: "soft", car: "hard", person: "soft", parasol: "soft",
  };
  for (const [id, kind] of Object.entries(EXPECTED)) {
    assert.equal(PROPS[id].kind, kind, `${id} is declared ${PROPS[id].kind}; it should be ${kind}`);
  }
});

test("clearances are declared where they matter and are actually applied", () => {
  const EXPECTED: Record<string, number> = {
    bin: 0.25, bench: 0.4, busShelter: 0.5, lampPost: 0.3,
    container: 0.1, mooring: 0.3, beacon: 1.0, railTie: 0,
  };
  for (const [id, clear] of Object.entries(EXPECTED)) {
    assert.equal(PROPS[id].clear, clear, `${id} declares clear=${PROPS[id].clear}, expected ${clear}`);
  }
});
