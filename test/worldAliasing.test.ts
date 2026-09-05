// A3 ESTABLISHED "ONE WORLD'S STATE MUST NOT ALIAS ANOTHER'S" -- FOR DISTRICT
// BOUNDS SPECIFICALLY. FINDING 5 SHARED A DIFFERENT OBJECT AND THAT SPECIFIC
// TEST STAYED GREEN, BECAUSE IT WAS NEVER ASKED ABOUT LandField.
//
// public/world.js now memoizes LandField/heightAt per seed (Finding 5), so
// two createWorld() calls for the same seed hand back the SAME `land` object
// on purpose. That is a deliberate, tested, documented decision (see
// public/terrain.js's own comment on the class). But it is also exactly the
// shape of bug A3 fixed three commits earlier -- two worlds sharing a mutable
// object -- and test/worldSpec.test.ts, which caught THAT bug, only ever
// checked district bounds. A different shared object slipped straight past
// it, because the test was written against the specific case, not the
// general property.
//
// This is the general property, checked directly: walk both worlds' full
// object graphs (plan, land, layers, grid) by IDENTITY, collect what is
// reached from both, and require every such object to be on an explicit,
// reasoned allow-list. Anything else reachable from two different worlds by
// the same reference is unannounced aliasing -- exactly the class of defect
// this file exists to make impossible to introduce silently again.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createWorld } from "../public/world.js";
import { WORLD, LANDMASSES, HIGHWAYS } from "../public/city-plan.js";

/**
 * Collect every non-primitive object reachable from `root`, by reference,
 * bounded so this stays fast against a plan holding ~20,000 plots:
 *
 *   - a depth cap, so no path is followed forever
 *   - a per-walk visited set, so no object is descended into twice
 *   - primitives and functions skipped outright -- a number or a closure
 *     cannot alias another world's mutable state, only objects can
 *   - a TypedArray (LandField's `mask`) is recorded as a single object and
 *     never indexed into -- every element is a number, which cannot alias
 *     anything, so walking a million mask cells would cost time for zero
 *     information
 *   - anything reference-equal to a value in `stopAt` is recorded (so its
 *     OWN identity is still checked for sharing) but not descended into --
 *     this is what keeps a shared, frozen object's entire internal tree
 *     (LandField's edges/buckets/masses, WORLD's fields) from each having to
 *     be individually named on the allow-list; the root being named is enough
 */
function collectReachable(root, stopAt, maxDepth = 14) {
  const visited = new Set();

  function walk(node, depth) {
    if (node === null || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);
    if (stopAt.has(node)) return;
    if (depth >= maxDepth) return;
    if (ArrayBuffer.isView(node)) return; // TypedArray -- opaque, numbers only inside

    if (node instanceof Map) {
      for (const [k, v] of node) { walk(k, depth + 1); walk(v, depth + 1); }
      return;
    }
    if (node instanceof Set) {
      for (const v of node) walk(v, depth + 1);
      return;
    }
    for (const key of Object.keys(node)) {
      walk(node[key], depth + 1);
    }
  }

  walk(root, 0);
  return visited;
}

/** Every object reachable from a world's own generated state, one set per named root. */
function graphOf(world, stopAt) {
  return {
    plan: collectReachable(world.plan, stopAt),
    land: collectReachable(world.land, stopAt),
    layers: collectReachable(world.layers, stopAt),
    grid: collectReachable(world.grid, stopAt),
  };
}

/** Objects present in both sets, by reference -- a plain intersection. */
function sharedBetween(setA, setB) {
  return [...setA].filter((o) => setB.has(o));
}

/**
 * Everything this project has DECIDED is safe to share across two world
 * instances, each with the one-line reason that makes it so. A shared object
 * not on this list is not "probably fine" -- it is unreviewed, which is
 * exactly what let Finding 5 relax A3's own guarantee without anything
 * noticing on the day it landed.
 */
function allowedShared(landIfSameSeed) {
  const list = [
    {
      label: "WORLD (public/city-plan.js)",
      value: WORLD,
      reason:
        "a flat, frozen spec of world-extent constants (Object.freeze(WORLD)); generateWorld() embeds it by reference in every plan it returns, for every seed, and TERRAIN.WORLD (terrain.js) is the identical object -- deliberately one frozen table, not one per world.",
    },
    // Found BY this test: landmassPolygonsDesign()'s `{ ...lm, polygon }`
    // shallow-copies each LANDMASSES entry but leaves `.points` (the raw
    // authored outline) shared by reference -- deep-frozen afterward,
    // because nothing anywhere writes to a mass's `.points` (checked
    // directly), the same category as WORLD, not districts' `bounds`.
    ...LANDMASSES.filter((lm) => lm.points).map((lm) => ({
      label: `LANDMASSES["${lm.id}"].points (public/city-plan.js)`,
      value: lm.points,
      reason: "deep-frozen raw coastline outline, deliberately one shared source table -- see the comment on LANDMASSES' deepFreeze call.",
    })),
    // Found BY this test: generateWorld()'s `roads` array spreads `...HIGHWAYS`
    // directly (unlike the separate `highways:` field a few lines down, which
    // copies each entry) -- so a highway that survives road-clipping unchanged
    // is the literal HIGHWAYS object, for every seed. Deep-frozen afterward;
    // flat spec data, zero write sites anywhere, same category as BRIDGES.
    ...HIGHWAYS.map((h) => ({
      label: `HIGHWAYS["${h.id}"] (public/city-plan.js)`,
      value: h,
      reason: "deep-frozen highway spec entry -- see the comment on HIGHWAYS' deepFreeze call.",
    })),
  ];
  if (landIfSameSeed) {
    list.push({
      label: "land (public/terrain.js LandField)",
      value: landIfSameSeed,
      reason:
        "Finding 5: public/world.js's createWorld() memoizes LandField/heightAt per seed on purpose, so that generateWorld's own heightAt-identity-keyed caches (cityDemand, placeFeatures) can hit on a repeat call for the same seed. LandField freezes itself and nothing in this codebase writes to one after construction (verified: the full suite was run once with the freeze in place, unchanged, 872/872) -- sharing it is the saving, not a risk grandfathered in.",
    });
  }
  return list;
}

/** Assert every shared object is accounted for, and say what an unexplained one was if not. */
function assertOnlyAllowedSharing(worldLabel, sharedObjects, allowed) {
  const allowedValues = new Set(allowed.map((a) => a.value));
  const unexplained = sharedObjects.filter((o) => !allowedValues.has(o));
  if (unexplained.length === 0) return;
  const sample = unexplained[0];
  const shape = Array.isArray(sample) ? `array(${sample.length})` : sample && sample.constructor ? sample.constructor.name : typeof sample;
  const keys = sample && typeof sample === "object" && !Array.isArray(sample) ? Object.keys(sample).slice(0, 6).join(", ") : "";
  assert.fail(
    `${worldLabel}: ${unexplained.length} object(s) are reachable from two different worlds by the same reference, ` +
    `and none of them is on the declared allow-list. First one: a ${shape}` +
    (keys ? ` with keys [${keys}]` : "") +
    `. If this sharing is deliberate, add it to allowedShared() in test/worldAliasing.test.ts with a one-line reason. ` +
    `If it is not deliberate, something is aliasing two worlds' state -- find what handed back a shared reference instead of a fresh one.`,
  );
}

test("two worlds with the SAME seed share only the declared allow-list (WORLD, and land)", () => {
  const a = createWorld({ seed: "aliasing-same-seed" });
  const b = createWorld({ seed: "aliasing-same-seed" });
  assert.equal(a.land, b.land, "setup: Finding 5's own cache should have made these the same land -- if this fails, the memoisation itself broke, not this test");

  const allowed = allowedShared(a.land);
  const stopAt = new Set(allowed.map((x) => x.value));
  const graphA = graphOf(a, stopAt);
  const graphB = graphOf(b, stopAt);

  for (const root of ["plan", "land", "layers", "grid"]) {
    const shared = sharedBetween(graphA[root], graphB[root]);
    assertOnlyAllowedSharing(`same-seed worlds, root "${root}"`, shared, allowed);
  }

  // layers and grid are one fresh instance per createWorld() call, always --
  // asserted directly, not just left to fall out of the walk above, because
  // test/world.test.ts already makes exactly this promise for `layers` and a
  // regression here is a different, sharper signal than "something on the
  // allow-list stopped appearing".
  assert.notEqual(a.layers, b.layers, "two worlds sharing a layer model would let editing one edit the other");
  assert.notEqual(a.grid, b.grid, "two worlds sharing a grid would let opening a region in one open it in the other");
});

test("two worlds with DIFFERENT seeds share only the declared allow-list (WORLD -- never land)", () => {
  const a = createWorld({ seed: "aliasing-seed-one" });
  const c = createWorld({ seed: "aliasing-seed-two" });
  assert.notEqual(a.land, c.land, "setup: two different seeds must not be keyed to the same cached land");

  const allowed = allowedShared(null); // land is NOT expected shared here
  const stopAt = new Set(allowed.map((x) => x.value));
  const graphA = graphOf(a, stopAt);
  const graphC = graphOf(c, stopAt);

  for (const root of ["plan", "land", "layers", "grid"]) {
    const shared = sharedBetween(graphA[root], graphC[root]);
    assertOnlyAllowedSharing(`different-seed worlds, root "${root}"`, shared, allowed);
  }
});
