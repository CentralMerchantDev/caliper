// =============================================================================
// THE THREE THINGS THE AUDIT LEFT OPEN
//
//   1. WORLD-RULES lists eight land queries; createGround exposed two.
//   2. prop-manifest and the model contract were two schemas that could not
//      meet -- canPlace(PROPS.bench) threw.
//   3. The registry was a linear array, so every query was O(n) and a miss had
//      to examine every entry to know it was a miss.
//
// The third is the one with a trap in it. Replacing a scan with an index is
// easy to get *fast* and quietly wrong: bucketing answers by whichever bucket
// was visited first, and the registry documents "whoever claimed this ground
// first owns the conflict". A world that answers differently depending on which
// way a query rectangle was drawn is worse than a slow one.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { createGround, SURFACE } from "../public/ground.js";
import { createWorldRegistry } from "../public/world-registry.js";
import { createPlacer } from "../public/place.js";
import { PROPS, modelFor } from "../public/prop-manifest.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField());
const land = createGround({ heightAt });

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

// ---------------------------------------------------------------------------
// 1. THE INTERFACE WORLD-RULES PROMISES
// ---------------------------------------------------------------------------

test("the land answers all eight questions WORLD-RULES section 1.1 says it answers", () => {
  // Named "the whole interface between the land and anything that wants to
  // stand on it" — and two of the eight existed. Every caller either reached
  // around the land to terrain.js, which is how two subsystems end up with
  // private beliefs about the same ground, or did without.
  for (const fn of ["heightAt", "slopeAt", "materialAt", "waterAt", "surfaceAt", "whatIsAt", "canPlace", "findGround"]) {
    assert.equal(typeof (land as any)[fn], "function", `the land cannot be asked ${fn}()`);
  }
});

test("each of the new queries returns something true, not merely something", () => {
  // A function that exists and answers nonsense is worse than a missing one:
  // the missing one is obvious.
  const [x, z] = dryGround();
  assert.equal(land.heightAt(x, z), heightAt(x, z), "the land's height must be the terrain's height, not a second opinion");
  assert.ok(land.slopeAt(x, z) >= 0, "slope is a magnitude");
  assert.equal(land.materialAt(x, z), "topsoil", "dry open ground is topsoil at the surface");
  assert.equal(land.waterAt(x, z), null, "dry ground has no water");

  const [wx, wz] = deepWater();
  const w = land.waterAt(wx, wz)!;
  assert.ok(w, "the open sea is water");
  assert.equal(w.kind, "sea");
  assert.ok(Math.abs(w.depth - -heightAt(wx, wz)) < 1e-9, "depth must be the actual depth, not a constant");
  assert.equal(land.materialAt(wx, wz), "seabed");
});

test("findGround finds ground the placement will then accept", () => {
  // A search using looser rules than the placement returns somewhere placement
  // refuses, and the caller cannot tell they disagreed. Whatever findGround
  // returns, canPlace must accept.
  const M = { footprint: { w: 8, d: 8 }, height: 4, clearance: 0, category: "building", maxRange: 2 };
  const [wx, wz] = deepWater();
  const got = land.findGround(M, { x: wx, z: wz }, { radius: 4000, step: 80 });
  assert.ok(got, "somewhere within 4 km of the sea there is buildable ground");
  assert.ok(got!.moved > 0, "it started in the sea, so it must have moved");
  assert.equal(land.canPlace(M, got!.x, got!.z).ok, true, "findGround returned ground canPlace refuses — the two disagree");
});

test("findGround returns nothing rather than somewhere wrong", () => {
  const M = { footprint: { w: 8, d: 8 }, height: 4, clearance: 0, category: "building", maxRange: 2 };
  const [wx, wz] = deepWater();
  assert.equal(land.findGround(M, { x: wx, z: wz }, { radius: 40, step: 20 }), null,
    "with a 40 m radius in open sea there is nowhere, and saying so is the answer");
});

test("whatIsAt speaks for the earth even with no registry", () => {
  const [x, z] = dryGround();
  const g = heightAt(x, z);
  assert.equal(land.whatIsAt(x, g - 10, z).kind, "rock", "ten metres down is rock");
  assert.equal(land.whatIsAt(x, g + 10, z).kind, "free", "ten metres up is nothing");
  const [wx, wz] = deepWater();
  assert.equal(land.whatIsAt(wx, -5, wz).kind, "water", "five metres below the surface at sea is water");
});

// ---------------------------------------------------------------------------
// 2. THE TWO SCHEMAS MEET
// ---------------------------------------------------------------------------

test("a prop from the manifest can be placed by the land, which it could not before", () => {
  // canPlace(PROPS.bench) threw "needs a footprint with a real width and depth".
  // Every prop in the world was undeclarable to the only thing that can place
  // it, while both files described the same benches.
  const [x, z] = dryGround();
  const bench = modelFor("bench");
  assert.equal(bench.footprint.w, PROPS.bench.foot!.w, "the model's width must BE the manifest's width, not a copy that can drift");
  assert.equal(bench.height, PROPS.bench.h);
  assert.equal(bench.clearance, PROPS.bench.clear);
  assert.equal(bench.occupancy, PROPS.bench.kind, "hard/soft must survive the translation");

  const verdict = land.canPlace(bench, x, z);
  assert.equal(verdict.ok, true, `a bench must be placeable on dry open ground: ${verdict.reason} — ${verdict.detail}`);
});

test("every prop in the manifest can be turned into a model", () => {
  // If one cannot, it is invisible to the layer that places things — and it
  // would be invisible silently, because nothing else joins these two files.
  for (const id of Object.keys(PROPS)) {
    const p = PROPS[id];
    const m = p.sized ? modelFor(id, { foot: { w: 2, d: 2 }, height: 3 }) : modelFor(id);
    assert.ok(m.category, `${id} produced a model with no category`);
    assert.ok(m.footprint.w > 0 && m.footprint.d > 0, `${id} produced a model with no footprint`);
    assert.ok(m.occupancy === "hard" || m.occupancy === "soft", `${id} produced a model with no occupancy`);
  }
});

test("a soft prop placed through the placer is recorded as soft", () => {
  // `kind` meant hard/soft in the contract and road/plot/feature in the
  // registry, so nothing placed through the only door was ever soft — while
  // world-registry's own header describes callers reading solid:false to decide
  // a field may be removed.
  const registry = createWorldRegistry(heightAt);
  const ground = createGround({ heightAt, registry });
  const placer = createPlacer({ ground, registry });
  const [x, z] = dryGround();

  const tree = modelFor("tree", { foot: { w: 4, d: 4 }, height: 9 });
  assert.equal(tree.occupancy, "soft");
  const put = placer.place(tree, x, z, { id: "t1" });
  assert.equal(put.ok, true, `a tree should stand on open ground: ${(put as any).detail}`);

  const e = registry.list().find((r) => r.id === "t1")!;
  assert.equal(e.solid, false, "a soft model must be recorded as soft occupancy");
  assert.equal(e.kind, "prop", "and its registry kind must be a registry kind, not the word 'soft'");

  const bench = modelFor("bench");
  placer.place(bench, x + 30, z, { id: "b1" });
  assert.equal(registry.list().find((r) => r.id === "b1")!.solid, true, "a hard model stays hard");
});

// ---------------------------------------------------------------------------
// 3. THE INDEX IS FAST *AND* STILL ANSWERS THE SAME
// ---------------------------------------------------------------------------

test("the index answers exactly what a full scan would, for thousands of queries", () => {
  // THE TRAP. An index that is fast and subtly wrong is worse than a slow
  // correct one, and the wrongness shows up as one query in a thousand. So
  // this compares the registry against a brute-force scan of the same data
  // rather than against an expectation someone typed.
  const reg = createWorldRegistry(null);
  const rects: any[] = [];
  let n = 0;
  for (let i = 0; i < 600; i++) {
    // Deliberately mixed: small things, long thin roads, and a few huge ones
    // that straddle many buckets, because uniform test data hides bucket bugs.
    const x = (i * 137) % 6000 - 3000, z = (i * 313) % 6000 - 3000;
    const w = i % 7 === 0 ? 900 : i % 3 === 0 ? 60 : 9;
    const d = i % 5 === 0 ? 700 : 9;
    const e = { kind: i % 4 === 0 ? "road" : "building", id: "e" + n++, xMin: x, xMax: x + w, zMin: z, zMax: z + d, yMin: 0, yMax: 10, since: 0, until: Infinity, solid: true, surface: null, owner: null };
    reg.reserve({ ...e });
    rects.push(e);
  }

  const scan = (xMin: number, xMax: number, zMin: number, zMax: number) => {
    for (const e of rects) {
      if (xMax <= e.xMin || xMin >= e.xMax || zMax <= e.zMin || zMin >= e.zMax) continue;
      return e.id;
    }
    return null;
  };

  let compared = 0, mismatches: string[] = [];
  for (let q = 0; q < 3000; q++) {
    const x = ((q * 89) % 7000) - 3500, z = ((q * 191) % 7000) - 3500;
    const w = q % 11 === 0 ? 300 : 5;
    const got = reg.overlapsReserved(x, x + w, z, z + w);
    const want = scan(x, x + w, z, z + w);
    compared++;
    if ((got ? (got as any).id : null) !== want && mismatches.length < 5) {
      mismatches.push(`at (${x}, ${z}) size ${w}: index said ${got ? (got as any).id : "null"}, a full scan says ${want}`);
    }
  }
  assert.equal(compared, 3000);
  assert.deepEqual(mismatches, [], `the index disagrees with a full scan:\n  ${mismatches.join("\n  ")}`);
});

test("the index preserves who claimed the ground first", () => {
  // The registry documents "whoever claimed this ground first owns the
  // conflict". Bucketing would otherwise answer by whichever bucket was visited
  // first, so the same world would answer differently depending on which way
  // the query rectangle was drawn.
  const reg = createWorldRegistry(null);
  reg.reserve({ kind: "road", id: "first", xMin: -1000, xMax: 1000, zMin: -5, zMax: 5 });
  reg.reserve({ kind: "plot", id: "second", xMin: -1000, xMax: 1000, zMin: -5, zMax: 5 });

  // A query spanning many buckets, drawn both ways.
  assert.equal((reg.overlapsReserved(-900, 900, -1, 1) as any).id, "first");
  assert.equal((reg.whatIsAt(0, 0, 0) as any).id, "first");
  assert.equal((reg.occupiedAt(500, 0) as any).id, "first", "and at the far end of the span too");
});

test("releasing something removes it from the index, not just the list", () => {
  // An index that keeps a released entry answers with something that is not
  // there — the exact opposite of the registry's job.
  const reg = createWorldRegistry(null);
  reg.reserve({ kind: "building", id: "gone", xMin: 0, xMax: 10, zMin: 0, zMax: 10 });
  assert.ok(reg.overlapsReserved(1, 2, 1, 2));
  reg.release("gone");
  assert.equal(reg.overlapsReserved(1, 2, 1, 2), null, "a released reservation must not still be found");
  assert.equal(reg.list().length, 0);
});

test("something spanning most of the world is still found", () => {
  // Entries too large to index are held aside and scanned. If that path were
  // dropped, the biggest things in the world would become invisible — and the
  // biggest things are the ones it matters most not to build inside.
  const reg = createWorldRegistry(null);
  reg.reserve({ kind: "feature", id: "huge", xMin: -13000, xMax: 13000, zMin: -13000, zMax: 13000 });
  reg.reserve({ kind: "building", id: "small", xMin: 0, xMax: 5, zMin: 0, zMax: 5 });
  assert.equal((reg.overlapsReserved(1, 2, 1, 2) as any).id, "huge", "the huge one was reserved first and owns the conflict");
  assert.equal((reg.overlapsReserved(9000, 9001, 9000, 9001) as any).id, "huge", "and it is found far from any small entry");
});
