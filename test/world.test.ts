// THE WORLD INSTANCE -- PLAN, LAND AND LAYERS TIED TO ONE SEED.
//
// A1/A2/A2b seeded the noise, the terrain and the plan, each on its own.
// A3 made the shared tables frozen and per-instance. None of that adds up to
// "a world is a value" until something ties a seed to ITS plan, ITS land and
// ITS layers as one addressable thing -- which is all this file does. It
// generates nothing: `public/world.js`'s own header says it composes, and
// this suite guards that specifically, not just "does createWorld work".

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createWorld, worldFromJSON } from "../public/world.js";
import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { layerFrom } from "../public/world-model.js";

/** Same fingerprint shape test/planSeed.test.ts uses -- the whole plan in one value. */
function planFingerprint(plan: any): string {
  const rows: string[] = [];
  for (const p of plan.plots) rows.push(["p", p.id, p.xMin, p.xMax, p.zMin, p.zMax, p.className, p.settlement].join(","));
  for (const b of plan.blocks) rows.push(["b", b.id, b.xMin, b.xMax, b.zMin, b.zMax].join(","));
  for (const r of plan.roads) rows.push(["r", r.id, r.axis, r.class, r.at, r.from, r.to].join(","));
  rows.sort();
  return createHash("sha256").update(rows.join("|")).digest("hex");
}

/** Same fingerprint shape test/worldSeed.test.ts uses -- the whole ground in one value. */
function landFingerprint(land: any, step = 1009): string {
  const h = makeHeightAt(land);
  let s = "";
  for (let x = -20000; x <= 20000; x += 1013) {
    for (let z = -20000; z <= 20000; z += step) s += h(x, z).toFixed(4) + ",";
  }
  return createHash("sha256").update(s).digest("hex");
}

test("createWorld composes generateWorld and LandField -- it does not reimplement them", () => {
  // If public/world.js ever grew its own copy of plan or terrain generation,
  // this is what would catch it drifting from the real thing.
  const w = createWorld({ seed: "prospect-quarter" });
  const heightAt = makeHeightAt(new LandField(16, 420, 40, "prospect-quarter"));
  const directPlan = generateWorld(heightAt, "prospect-quarter");
  assert.equal(planFingerprint(w.plan), planFingerprint(directPlan), "world.plan is not what generateWorld itself produces for this seed");
  assert.equal(landFingerprint(w.land), landFingerprint(new LandField(16, 420, 40, "prospect-quarter")), "world.land is not what LandField itself produces for this seed");
});

test("two instances with the same seed have equal plan and land, and independent layers", () => {
  const a = createWorld({ seed: "harbour-of-saint-elms" });
  const b = createWorld({ seed: "harbour-of-saint-elms" });
  assert.equal(planFingerprint(a.plan), planFingerprint(b.plan));
  assert.equal(landFingerprint(a.land), landFingerprint(b.land));
  assert.notEqual(a.layers, b.layers, "two instances share the same layer model object");
  const res = a.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p1", op: "retint", payload: { color: 0xff0000 } }] }));
  assert.equal(res.ok, true);
  assert.deepEqual(b.layers.layers(), [], "adding a layer to world A appeared in world B");
});

test("a world round-trips through JSON and rebuilds to the same fingerprint, with its layers intact", () => {
  const a = createWorld({ seed: "prospect-quarter" });
  a.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p1", op: "retint", payload: { color: 0x00ff00 } }] }));
  const json = a.toJSON();
  assert.deepEqual(JSON.parse(JSON.stringify(json)), json, "toJSON returned something that does not survive its own serialisation");

  const b = worldFromJSON(json);
  assert.equal(b.seed, a.seed);
  assert.equal(planFingerprint(b.plan), planFingerprint(a.plan), "the rebuilt world's plan does not match the original's");
  assert.equal(landFingerprint(b.land), landFingerprint(a.land), "the rebuilt world's land does not match the original's");
  assert.deepEqual(b.layers.layers(), a.layers.layers(), "the rebuilt world lost its layers");
});

test("world.resolve and world.toJSON are the layer model's own, not a second implementation", () => {
  const w = createWorld({ seed: "east-gate" });
  w.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p9", op: "move", payload: { x: 10, z: 20 } }] }));
  assert.deepEqual(w.resolve("p9"), w.layers.resolve("p9"));
  assert.deepEqual(w.toJSON(), w.layers.toJSON());
});

// Found by docs/audits/UMAA-phases-B-H.md (Finding 5): createWorld() costs
// 2.3-2.7 s per call and a REPEAT call with the identical seed was not
// materially cheaper, because a fresh LandField/heightAt was built every
// time and generateWorld's own internal caches are keyed on that object's
// identity, not the seed. A caller doing exactly what B1's store and this
// suite's own 17 other createWorld() call sites do -- ask for the same seed
// more than once in a session -- paid the full cost every time.
// Asserts the CAUSE (the same object is reused), not the timing CONSEQUENCE --
// the lesson test/layoutFits.test.ts's own H1 survivor fix already recorded
// for this project: a millisecond threshold is a margin that erodes with
// unrelated tuning and machine load, an object-identity check cannot drift.
// The actual saving (measured separately, not asserted here, because timing
// assertions are exactly the flakiness this discipline exists to avoid): a
// fresh heightAt costs ~2.4s to generate a world from; the SAME heightAt
// object, reused, costs ~1.2s -- generateWorld's own cityDemand/placeFeatures
// caches (keyed on heightAt identity) finally get to hit on a repeat call.
test("a second createWorld() call for the same seed reuses the same land -- not a fresh one every time", () => {
  const a = createWorld({ seed: "sixth-street-crossing" });
  const b = createWorld({ seed: "sixth-street-crossing" });
  assert.equal(a.land, b.land, "two calls with the identical seed built two separate LandField instances -- the memoisation this test guards is not happening");
  const c = createWorld({ seed: "a-completely-different-seed" });
  assert.notEqual(a.land, c.land, "two calls with DIFFERENT seeds shared the same land -- the cache is keyed wrong");
});
