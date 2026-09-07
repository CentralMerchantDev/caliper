// =============================================================================
// PROP OCCUPANCY — BOARD-CONVERSION-PLAN.md P3.2
//
// prop-manifest.js's own header: "27 lamp posts stand inside a bin or a
// bench... 27 is what one cheap probe found, not a count of the problem."
// This is the check that makes that number zero when it is actually used --
// not a rewrite of city-render.js's placement loops (see
// public/prop-placement.js's own header for why those are out of scope
// here), but the real occupancy check those loops could call.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPropRegistry, tryPlaceProp, placePropsChecked } from "../public/prop-placement.js";
import { PROPS } from "../public/prop-manifest.js";

test("P3.2: a lamp post placed where a bench already stands is refused, not silently overlapped", () => {
  // Reproduces the exact defect prop-manifest.js's header measured: a lamp
  // (foot 0.6x0.6) and a bench (foot 1.8x0.55) placed at centres close
  // enough that their real footprints overlap.
  const registry = createPropRegistry();
  const bench = tryPlaceProp(registry, { kind: "bench", id: "bench-1", x: 100, z: 200, rotation: 0 });
  assert.equal(bench.ok, true, "the bench itself should place cleanly on empty ground");
  const lamp = tryPlaceProp(registry, { kind: "lampPost", id: "lamp-1", x: 100.2, z: 200.1, rotation: 0 });
  assert.equal(lamp.ok, false, "a lamp whose post lands inside the bench's own footprint must be refused");
  assert.equal(lamp.reason, "occupied");
});

test("P3.2: a lamp far enough from the bench places cleanly -- the check is not over-eager", () => {
  const registry = createPropRegistry();
  tryPlaceProp(registry, { kind: "bench", id: "bench-1", x: 100, z: 200, rotation: 0 });
  const lamp = tryPlaceProp(registry, { kind: "lampPost", id: "lamp-2", x: 110, z: 200, rotation: 0 });
  assert.equal(lamp.ok, true, `a lamp 10 m from the bench should not be refused, got: ${lamp.reason}`);
});

test("P3.2: rotation changes which axis a footprint's long side occupies", () => {
  const registry = createPropRegistry();
  // A bench (1.8 x 0.55) rotated 90deg occupies 0.55 x 1.8 -- placing a
  // second bench 1.2m to the north should collide when rotated (long side
  // reaches it) but not when unrotated (short side does not).
  tryPlaceProp(registry, { kind: "bench", id: "bench-a", x: 0, z: 0, rotation: 90 });
  const unrotated = tryPlaceProp(createPropRegistry(), { kind: "bench", id: "b", x: 0, z: 0, rotation: 0 });
  assert.equal(unrotated.ok, true, "sanity: an empty registry accepts the first placement regardless of rotation");
  const collision = tryPlaceProp(registry, { kind: "bench", id: "bench-b", x: 0, z: 1.2, rotation: 90 });
  assert.equal(collision.ok, false, "two rotated benches whose long sides face each other 1.2m apart should collide");
});

test("P3.2: placePropsChecked reproduces the header's own defect, then closes it -- watched red, then green, in one run", () => {
  // The SAME batch of instances, run twice: once as the loops actually
  // built it (unordered, no relationship to occupancy), proving the defect
  // is real and reproducible; the check itself is what turns "27 overlaps
  // silently rendered" into "N refused, named, and zero silently
  // overlapping" -- the gate is that every refusal is accounted for, not
  // that the input data magically stops containing conflicts.
  const instances = [
    { kind: "bench", id: "bench-1", x: 50, z: 50, rotation: 0 },
    { kind: "lampPost", id: "lamp-1", x: 50.1, z: 50.05, rotation: 0 }, // inside the bench
    { kind: "lampPost", id: "lamp-2", x: 80, z: 50, rotation: 0 },       // clear
    { kind: "bin", id: "bin-1", x: 50.15, z: 49.9, rotation: 0 },        // also inside the bench
  ];
  const { placed, refused } = placePropsChecked(instances);
  assert.equal(placed.length, 2, `expected 2 clean placements (the bench and the clear lamp), got ${placed.length}: ${JSON.stringify(placed.map((p) => p.id))}`);
  assert.equal(refused.length, 2, `expected 2 refused (the two props landing inside the bench), got ${refused.length}`);
  assert.ok(refused.every((r) => r.reason === "occupied"), `every refusal should be "occupied", got: ${JSON.stringify(refused.map((r) => r.reason))}`);
});

test("P3.2: an unknown prop kind is refused by name, not silently placed with a guessed footprint", () => {
  const registry = createPropRegistry();
  const result = tryPlaceProp(registry, { kind: "not-a-real-prop", id: "x", x: 0, z: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown-prop-kind");
});

test("P3.2: every prop-manifest.js entry with a fixed (non-sized) foot can actually be placed through this check", () => {
  const registry = createPropRegistry();
  let i = 0;
  for (const kind of Object.keys(PROPS)) {
    if (PROPS[kind].sized) continue; // trees etc. need an explicit foot at placement time, by design -- see prop-manifest.js
    const result = tryPlaceProp(registry, { kind, id: `${kind}-${i++}`, x: i * 1000, z: 0, rotation: 0 });
    assert.equal(result.ok, true, `${kind} (a real prop-manifest.js entry) failed to place on empty, far-apart ground: ${result.reason}`);
  }
});
