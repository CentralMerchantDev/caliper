// =============================================================================
// WHAT THE UMAA AUDIT FOUND
//
// A blind auditor ran the full UMAA structure against the land layer — Phase 0
// re-grounded, the 4-State Horizon across twelve divisions, and a
// cross-disciplinary collision matrix. It applied 25 mutations, verified each
// one landed, and reported: 13 red, TWELVE SURVIVED.
//
// Its verdict, and the number worth keeping: ZERO — the number of production
// files that import ground.js, grid.js or place.js. Everything else follows.
// A subsystem whose only caller is a test written by its own author has no
// independent source of disagreement, which is exactly what the epistemic
// anchor requires. That is not a coverage problem; it is why the coverage
// problem exists.
//
// These tests close the findings that were fixed. The ones still open are
// listed in the commit message rather than implied away.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGround, SURFACE } from "../public/ground.js";
import { createWorldRegistry } from "../public/world-registry.js";
import { createPlacer } from "../public/place.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField());

function dryGround(): [number, number] {
  for (let x = -4000; x <= 4000; x += 80) {
    for (let z = -4000; z <= 4000; z += 80) if (heightAt(x, z) > 5) return [x, z];
  }
  throw new Error("no dry ground");
}
function deepWater(): [number, number] {
  for (let x = -8000; x <= 8000; x += 40) {
    for (let z = -8000; z <= 8000; z += 40) if (heightAt(x, z) < -20) return [x, z];
  }
  throw new Error("no deep water");
}
function highestPoint(): [number, number, number] {
  let px = 0, pz = 0, best = -Infinity;
  for (let x = -8000; x <= 8000; x += 200) {
    for (let z = -8000; z <= 8000; z += 200) {
      const h = heightAt(x, z);
      if (h > best) { best = h; px = x; pz = z; }
    }
  }
  return [px, pz, best];
}

const BUS = { footprint: { w: 2.5, d: 12 }, height: 3, clearance: 0, category: "vehicle", maxRange: 1e9 };
const CAR = { footprint: { w: 1.9, d: 4.4 }, height: 1.5, clearance: 0, category: "vehicle", maxRange: 1e9 };

// ---------------------------------------------------------------------------
// C1 — the blocking collision. "A road piece is one cell long" (WORLD-RULES
// §3.2) against the host sizing check. Both individually correct; together they
// made the layer refuse its own primary output.
// ---------------------------------------------------------------------------

test("a bus fits a road built the way the specification says to build roads", () => {
  // Measured before the fix:
  //   12 m bus  -> "too-big: needs 2.5 x 12.0 m; road st-1 is 18.0 x 8.0 m"
  // Every bus, tram, lorry and articulated vehicle was unplaceable, purely
  // because the road had been cut into the 8 m pieces the spec mandates.
  const [x, z] = dryGround();
  const reg = createWorldRegistry(heightAt);
  for (let i = 0; i < 8; i++) {
    reg.reserve({
      kind: "road", id: `st-${i}`, surface: SURFACE.CARRIAGEWAY,
      xMin: x - 9, xMax: x + 9, zMin: z + i * 8, zMax: z + (i + 1) * 8,
    });
  }
  const land = createGround({ heightAt, registry: reg });
  const r = land.canPlace(BUS, x, z + 20);
  assert.equal(r.ok, true, `a bus must fit a road made of 8 m pieces: ${r.reason} — ${r.detail}`);
});

test("a car may straddle the join between two road pieces", () => {
  // The other half: roughly half of all cars sat over a join and were refused
  // "overhangs" — by a boundary that is an artefact of chunking, not a kerb.
  const [x, z] = dryGround();
  const reg = createWorldRegistry(heightAt);
  for (let i = 0; i < 8; i++) {
    reg.reserve({
      kind: "road", id: `st-${i}`, surface: SURFACE.CARRIAGEWAY,
      xMin: x - 9, xMax: x + 9, zMin: z + i * 8, zMax: z + (i + 1) * 8,
    });
  }
  const land = createGround({ heightAt, registry: reg });
  assert.equal(land.canPlace(CAR, x, z + 8).ok, true, "a car on a piece boundary must be placeable");
  assert.equal(land.canPlace(CAR, x, z + 4).ok, true, "and so must one in the middle of a piece");
});

test("but a PARCEL still refuses what does not fit inside it", () => {
  // THE PAIRING THAT CAUGHT MY OWN BUG. Relaxing the road case is only correct
  // if the plot case still holds — and my first attempt broke it, because the
  // host query read `hi` before the heights had been sampled, so its height
  // range was (-Infinity, -Infinity) and no host was ever found. The bus and
  // car went green and this went silently wrong. An unpaired test would have
  // called that a fix.
  const [x, z] = dryGround();
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "plot", id: "lot", xMin: x - 6, xMax: x + 6, zMin: z - 9, zMax: z + 9 });
  const land = createGround({ heightAt, registry: reg });

  const TOWER = { footprint: { w: 30, d: 30 }, height: 90, clearance: 0, category: "building", maxRange: 1e9 };
  const HOUSE = { footprint: { w: 8, d: 12 }, height: 7, clearance: 0, category: "building", maxRange: 1e9 };

  const big = land.canPlace(TOWER, x, z);
  assert.equal(big.ok, false, "a 30 m tower must not fit a 12 x 18 m lot");
  assert.equal(big.reason, "too-big");
  assert.equal(land.canPlace(HOUSE, x, z).ok, true, "and a house that does fit must be accepted");
});

// ---------------------------------------------------------------------------
// F12 — the host query carried no height range, twelve lines above the
// occupancy check that does and has a test defending it.
// ---------------------------------------------------------------------------

test("a bench under a bridge deck is not refused for overhanging it", () => {
  const [x, z] = dryGround();
  const g = heightAt(x, z);
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "plot", id: "deck", xMin: x - 40, xMax: x + 40, zMin: z - 4, zMax: z + 4, yMin: g + 30, yMax: g + 55 });
  const land = createGround({ heightAt, registry: reg });

  const BENCH = { footprint: { w: 1.8, d: 0.55 }, height: 0.9, clearance: 0, category: "furniture", maxRange: 1e9 };

  // AT THE DECK'S EDGE, NOT UNDER ITS MIDDLE — and that is the whole test. The
  // first version put the bench inside the deck's plan rectangle, where it can
  // never overhang, so the height range was irrelevant and removing it left the
  // test green. A bench fully under a bridge was never the failing case; a
  // bench STRADDLING the edge of the deck's footprint was, because the host
  // check then asked "does it hang over the edge" about a structure 30 m up.
  const r = land.canPlace(BENCH, x, z + 4);
  assert.equal(r.ok, true, `a bench at the edge of a deck 30 m overhead: ${r.reason} — ${r.detail}`);
  assert.equal(land.canPlace(BENCH, x, z).ok, true, "and one directly beneath it");

  // THE PAIR, and it needs a different KIND, which is itself the point. `plot`
  // is a surface-defining kind, so the occupancy check ignores it by design --
  // that is what lets a bench stand on a pavement inside a road's rectangle.
  // A bridge deck is a structure that OCCUPIES its volume, so it is registered
  // as a feature, and then a mast tall enough to reach it is refused.
  const reg2 = createWorldRegistry(heightAt);
  reg2.reserve({ kind: "feature", id: "deck", owner: "cable bridge", xMin: x - 40, xMax: x + 40, zMin: z - 4, zMax: z + 4, yMin: g + 30, yMax: g + 55 });
  const land2 = createGround({ heightAt, registry: reg2 });

  const MAST = { footprint: { w: 1, d: 1 }, height: 45, clearance: 0, category: "structure", maxRange: 1e9 };
  const tall = land2.canPlace(MAST, x, z);
  assert.equal(tall.ok, false, "a 45 m mast must not be built through the deck");
  assert.equal(tall.reason, "occupied");

  // ...and the bench still passes beneath the same structure, at its edge too.
  assert.equal(land2.canPlace(BENCH, x, z + 4).ok, true, "a bench under a bridge is what a bridge is for");
});

// ---------------------------------------------------------------------------
// F4 / C4 — the registry's two occupancy queries disagreed about rock and open
// sea, while the file header said they were "the exact same check, not two".
// ---------------------------------------------------------------------------

test("the registry refuses a volume buried inside a mountain", () => {
  const [px, pz, peak] = highestPoint();
  const reg = createWorldRegistry(heightAt);
  const hit = reg.overlapsReserved(px - 5, px + 5, pz - 5, pz + 5, 0, { yMin: peak - 100, yMax: peak - 90 });
  assert.ok(hit, "a volume 100 m inside the highest peak is not free ground");
  assert.equal((hit as any).kind, "rock");

  const free = reg.findFree(10, 10, { x: px, z: pz }, { radius: 0, step: 40, yMin: peak - 100, yMax: peak - 90 });
  assert.equal(free, null, "and findFree must not hand it out — its docstring promises nothing SOLID");
});

test("the registry refuses a volume submerged in open sea", () => {
  const [wx, wz] = deepWater();
  const reg = createWorldRegistry(heightAt);
  const hit = reg.overlapsReserved(wx - 5, wx + 5, wz - 5, wz + 5, 0, { yMin: -15, yMax: -5 });
  assert.ok(hit, "a volume 5-15 m below sea level in open water is not free");
  assert.equal((hit as any).kind, "water");
});

test("but a foundation may be dug, and a plan-only query is unchanged", () => {
  // THE PAIR, and the one my first attempt failed. A foundation, a basement, a
  // sub-base and a pier's footing all reach below the surface — that is what
  // they are for. Refusing anything that touches below ground took the suite
  // from 571 to 564 immediately. The rule is ENTIRELY BURIED, not touching.
  const [x, z] = dryGround();
  const g = heightAt(x, z);
  const reg = createWorldRegistry(heightAt);
  assert.equal(
    reg.overlapsReserved(x - 4, x + 4, z - 4, z + 4, 0, { yMin: g - 2, yMax: g + 7 }), null,
    "a house with a 2 m footing is not buried in rock",
  );
  // And with no height range at all, this is a plan question and terrain is not
  // an answer to it — every existing caller behaves exactly as before.
  assert.equal(reg.overlapsReserved(x - 4, x + 4, z - 4, z + 4), null);
});

// ---------------------------------------------------------------------------
// F6 / F7 / C6 / C7 — two rule tables failing OPEN where their neighbours fail
// closed, in a module whose header argues that silent fallbacks are the defect
// this project keeps finding.
// ---------------------------------------------------------------------------

test("an unrecognised ground type carries nothing, rather than everything", () => {
  // Measured before the fix, with one transposed letter:
  //     reserve({ surface: "sidwalk" })
  //     canPlace vehicle / lamp / building / vessel  -> all true
  // ACCEPTS["sidwalk"] is undefined and so is TERRAIN_REFUSES["sidwalk"], so
  // neither table fired and a typo produced the most permissive ground in the
  // world. `reserve` takes a free-form string, so this is one keystroke away.
  const [x, z] = dryGround();
  const reg = createWorldRegistry(heightAt);
  reg.reserve({ kind: "road", id: "typo", surface: "sidwalk", xMin: x - 40, xMax: x + 40, zMin: z - 40, zMax: z + 40 });
  const land = createGround({ heightAt, registry: reg });

  for (const category of ["vehicle", "lamp", "building", "vessel"]) {
    const r = land.canPlace({ footprint: { w: 2, d: 2 }, height: 2, clearance: 0, category, maxRange: 1e9 }, x, z);
    assert.equal(r.ok, false, `a ${category} must not be placeable on ground nothing recognises`);
    assert.equal(r.reason, "unknown-surface");
  }

  // The pair: a surface the world DOES know still works normally.
  const reg2 = createWorldRegistry(heightAt);
  reg2.reserve({ kind: "road", id: "ok", surface: SURFACE.SIDEWALK, xMin: x - 40, xMax: x + 40, zMin: z - 40, zMax: z + 40 });
  const land2 = createGround({ heightAt, registry: reg2 });
  assert.equal(land2.canPlace({ footprint: { w: 0.6, d: 0.6 }, height: 9, clearance: 0, category: "lamp", maxRange: 1e9 }, x, z).ok, true);
});

test("a foreshore refuses a thing that will not say what it is", () => {
  // The beach rule was rewritten once to remove exactly this: it asked for a
  // field no caller writes, so the rule was dead and its default was ALLOW
  // while the water rule beside it defaults to refuse. The replacement asked
  // for `spec.category` — also optional, and omitted by every spec in the
  // suite. The same inconsistency, one field later, inside the paragraph
  // criticising it.
  let beach: [number, number] | null = null;
  const probe = createGround({ heightAt });
  for (let x = -8000; x <= 8000 && !beach; x += 40) {
    for (let z = -8000; z <= 8000 && !beach; z += 40) {
      if (probe.surfaceAt(x, z) === SURFACE.BEACH) beach = [x, z];
    }
  }
  assert.ok(beach, "the world has beaches");
  const [bx, bz] = beach!;

  const anonymous = probe.canPlace({ footprint: { w: 6, d: 6 }, height: 8, clearance: 0, maxRange: 1e9 }, bx, bz);
  assert.equal(anonymous.ok, false, "a thing with no declared category must not get the benefit of the doubt on a foreshore");
  assert.equal(anonymous.reason, "terrain");

  // The pair: what a beach IS for is still allowed.
  const parasol = probe.canPlace({ footprint: { w: 2, d: 2 }, height: 2.2, clearance: 0, category: "furniture", maxRange: 1e9 }, bx, bz);
  assert.equal(parasol.ok, true, `a parasol belongs on a beach: ${parasol.reason} — ${parasol.detail}`);
});

// ---------------------------------------------------------------------------
// F3 / C3 — move() threw on its own defaults. remove() carries a nine-line
// comment about exactly this and wraps close(); move(), thirty lines below,
// called the same close() bare.
// ---------------------------------------------------------------------------

test("moving something at the time it was placed refuses, and does not throw", () => {
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const placer = createPlacer({ ground, registry });
  const [x, z] = dryGround();
  const HUT = { id: "hut", kind: "building", category: "building", footprint: { w: 6, d: 6 }, height: 4, clearance: 0, maxRange: 1e9 };

  placer.place(HUT, x, z, { id: "hut" });        // since: 0 by default
  let r: any;
  assert.doesNotThrow(() => { r = placer.move(HUT, "hut", x + 40, z); }, "move is documented to return a result, not to throw");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid-time");

  // Twice at the same instant is the same defect and must also refuse.
  assert.equal(placer.move(HUT, "hut", x + 40, z, { t: 5 }).ok, true);
  let again: any;
  assert.doesNotThrow(() => { again = placer.move(HUT, "hut", x + 80, z, { t: 5 }); });
  assert.equal(again.ok, false);
});

test("a move that throws on a malformed model leaves the thing where it was", () => {
  // move() closes, then places. If place() THROWS rather than refusing, the
  // object was already closed and simply vanished — a data-loss route through
  // an editing tool. The refusal path reopened it; the throw path did not.
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const placer = createPlacer({ ground, registry });
  const [x, z] = dryGround();
  const HUT = { id: "hut", kind: "building", category: "building", footprint: { w: 6, d: 6 }, height: 4, clearance: 0, maxRange: 1e9 };
  placer.place(HUT, x, z, { id: "hut", t: 0 });

  const BROKEN = { ...HUT, footprint: { w: 0, d: 0 } };
  let r: any;
  assert.doesNotThrow(() => { r = placer.move(BROKEN as any, "hut", x + 40, z, { t: 5 }); });
  assert.equal(r.ok, false);

  const live = registry.list().filter((e) => e.id === "hut" && e.until === Infinity);
  assert.equal(live.length, 1, "the hut must still be standing exactly once after a throwing move");
  assert.ok(
    registry.overlapsReserved(x - 1, x + 1, z - 1, z + 1, 10),
    "and it must still be where it was, not closed and lost",
  );
});

// ---------------------------------------------------------------------------
// SIZE AGAINST AVAILABLE SPACE — Mark's rule, stated plainly:
//
//   "The only thing that dictates what can go on land is the size of the block
//    compared to the space available. If the condo is 10 x 10 and the space is
//    6 x 6 you can't put the condo — unless you clear more space for it."
//
// The second clause is the one that matters. A refusal that only says no is
// unusable by a builder; it has to name what is in the way and whether it can
// be taken away.
// ---------------------------------------------------------------------------

test("a 10 x 10 condo does not fit a 6 x 6 gap, and the refusal says what to clear", () => {
  const [x, z] = dryGround();
  const reg = createWorldRegistry(heightAt);
  const land0 = createGround({ heightAt, registry: reg });
  const g = heightAt(x, z);

  // Two sheds 6 m apart, leaving a 6 x 6 hole between them.
  reg.reserve({ kind: "building", id: "shed-north", owner: "shed", xMin: x - 9, xMax: x - 3, zMin: z - 3, zMax: z + 3, yMin: g, yMax: g + 3 });
  reg.reserve({ kind: "building", id: "shed-south", owner: "shed", xMin: x + 3, xMax: x + 9, zMin: z - 3, zMax: z + 3, yMin: g, yMax: g + 3 });

  const SMALL = { footprint: { w: 6, d: 6 }, height: 8, clearance: 0, category: "building", maxRange: 1e9 };
  const CONDO = { footprint: { w: 10, d: 10 }, height: 30, clearance: 0, category: "building", maxRange: 1e9 };

  assert.equal(land0.canPlace(SMALL, x, z).ok, true, "a 6 x 6 building fits the 6 x 6 gap exactly");

  const refused = land0.canPlace(CONDO, x, z);
  assert.equal(refused.ok, false, "a 10 x 10 condo must not fit a 6 x 6 gap");
  assert.equal(refused.reason, "occupied");

  // IT NAMES BOTH, not just the first thing it hit.
  const ids = (refused as any).blockedBy.map((b: any) => b.id).sort();
  assert.deepEqual(ids, ["shed-north", "shed-south"], `both sheds must be named, got ${JSON.stringify(ids)}`);
  assert.ok((refused as any).blockedBy.every((b: any) => b.clearable), "sheds are things somebody built, so they can be cleared");
  assert.match(refused.detail!, /clear them and this fits/);

  // AND CLEARING THEM MAKES IT FIT — the second clause, actually exercised.
  reg.close("shed-north", 10);
  reg.close("shed-south", 10);
  assert.equal(
    land0.canPlace(CONDO, x, z, { t: 20 }).ok, true,
    "once the sheds are cleared the condo fits, which is the whole point of saying what to clear",
  );
});

test("what cannot be cleared is reported as such, rather than offered", () => {
  // Rock is not a thing somebody put there. Telling a builder to clear a
  // hillside is worse than telling them no.
  // ON FLAT OPEN GROUND, buried deliberately — so the terrain step passes and
  // rock arrives as an OCCUPANCY blocker, which is the path being tested.
  //
  // The first version of this used the mountain peak, where the surface is
  // already ROCK: it was refused at the terrain step, `blockedBy` was undefined,
  // and the assertion sat inside `if (blockedBy)` and never ran. A conditional
  // assertion is a test that can silently not execute — it survived the
  // mutation that offers rock as clearable.
  const [x, z] = dryGround();
  const g = heightAt(x, z);
  const reg = createWorldRegistry(heightAt);
  const land0 = createGround({ heightAt, registry: reg });
  const BURIED = { footprint: { w: 8, d: 8 }, height: 4, clearance: 0, category: "building", maxRange: 1e9 };

  const r = land0.canPlace(BURIED, x, z, { y: g - 60 });
  assert.equal(r.ok, false, "a volume 60 m underground is not free");
  assert.equal(r.reason, "occupied", `expected an occupancy refusal, got ${r.reason}: ${r.detail}`);
  assert.ok((r as any).blockedBy, "an occupancy refusal must say what is in the way");
  assert.ok((r as any).blockedBy.length > 0);
  assert.ok(
    (r as any).blockedBy.every((b: any) => !b.clearable),
    `rock must never be offered as clearable: ${JSON.stringify((r as any).blockedBy)}`,
  );
  assert.match(r.detail!, /none of it can be cleared/);
});
