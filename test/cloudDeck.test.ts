// A CEILING IS ONLY A CEILING FROM UNDERNEATH.
//
// The two cloud decks are BackSide hemispheres, which is correct and deliberate:
// from below, the texture is on the inside and reads as an overcast ceiling from
// anywhere in the world, which a flat plane cannot do.
//
// From ABOVE it is the opposite. Backface culling removes the near surface and
// draws the inside of the far rim, so a dome you have climbed above renders as a
// bright crescent hanging over the horizon. Mark saw exactly that from a 46 km
// orbit and asked what the "odd white crest shapes" were. They were these.
//
// Nothing could have caught it. Every image that judged this sky was taken at
// city level -- the one altitude at which the assumption in the comment holds --
// and the comment itself states the assumption plainly. So the defect was
// written down, shipped, and rendered for a week without a single check standing
// between it and the deployed page.
//
// THE REAL THREE.JS, NOT A FAKE OF IT.
//
// The first two versions of this file hand-rolled a stub three.js, and both went
// red inside the constructor without ever reaching a cloud: one carried
// Float32BufferAttribute where sky.js uses BufferAttribute, the next built its
// materials as arrow functions, which `new` refuses. Twelve red tests, zero of
// them about the sky.
//
// That is the same error this whole project argues against -- testing a copy of
// the thing instead of the thing -- and the repository already had the answer
// sitting in scripts/variant-coverage.mjs, which imports the vendored three
// directly in node. Geometry and materials need no GL context. So this imports
// the real library, and the only thing stubbed is the 2D canvas the cloud
// texture is painted on, because node genuinely has not got one.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { createCitySky } from "../public/sky.js";

/**
 * makeCloudTexture() paints its blobs on a real 2D canvas. Only the six calls
 * sky.js actually makes are stubbed -- taken from
 * `grep -o "\bg\.[a-zA-Z]*" public/sky.js` -- so if the drawing code starts
 * using a seventh, this throws rather than quietly returning undefined.
 */
function withCanvas<T>(fn: () => T): T {
  const had = "document" in globalThis;
  const prev = (globalThis as any).document;
  (globalThis as any).document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({
        clearRect() {}, beginPath() {}, fill() {}, arc() {},
        fillStyle: null as any,
        createRadialGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };
  try { return fn(); }
  finally { if (had) (globalThis as any).document = prev; else delete (globalThis as any).document; }
}

function sky() {
  return withCanvas(() => createCitySky(THREE as any, new THREE.Group()));
}

const sun = new THREE.Vector3(0.3, 0.8, 0.5);

test("the harness itself works: a sky is built from the real three.js", () => {
  // If this fails, every assertion below is about a constructor rather than
  // about clouds -- which is exactly how the first two versions of this file
  // wasted a run. It is checked first so the failure says so.
  const s = sky();
  assert.ok(s.cloudsLow && s.cloudsHigh, "no cloud decks were built");
  assert.ok(s.cloudsLow.material, "the low deck has no material");
});

test("below both decks, the clouds are a ceiling and both are drawn", () => {
  const s = sky();
  s.update(sun, 0, 0.016, { x: 0, z: 0 }, 400);
  assert.equal(s.cloudsLow.visible, true, "the low deck should be overhead at 400 m");
  assert.equal(s.cloudsHigh.visible, true, "the high deck should be overhead at 400 m");
  assert.ok(s.cloudsLow.material.opacity > 0.5, `low deck opacity was ${s.cloudsLow.material.opacity}`);
});

test("at the orbit Mark was flying, NEITHER dome is drawn -- this is the crest", () => {
  const s = sky();
  // 46 km of range at 21 degrees of pitch is roughly 16.5 km up. Both decks --
  // 2.6 km and 4.2 km -- are far below that.
  s.update(sun, 0, 0.016, { x: 0, z: 0 }, 16500);
  assert.equal(s.cloudsLow.visible, false, "the low deck was still drawn from above");
  assert.equal(s.cloudsHigh.visible, false, "the high deck was still drawn from above -- this is the crescent");
});

test("the decks fade INDEPENDENTLY -- one shared material could not do this", () => {
  const s = sky();
  // 3.4 km: above the 2.6 km deck, below the 4.2 km one. This altitude is the
  // reason each deck needs its own material. Sharing one meant the low deck
  // could not go while the high deck was still a real ceiling overhead, so
  // crossing 2.6 km would have blinked the whole sky at once.
  s.update(sun, 0, 0.016, { x: 0, z: 0 }, 3400);
  assert.equal(s.cloudsHigh.visible, true, "the high deck is still overhead at 3.4 km and should still draw");
  assert.ok(
    s.cloudsLow.material.opacity < s.cloudsHigh.material.opacity,
    "the low deck should be thinner than the high one at 3.4 km: " +
    `low ${s.cloudsLow.material.opacity}, high ${s.cloudsHigh.material.opacity}`,
  );
  assert.notEqual(s.cloudsLow.material, s.cloudsHigh.material, "the two decks share a material and cannot fade apart");
});

test("the fade is a climb, not a switch", () => {
  const s = sky();
  const readings: number[] = [];
  for (const y of [0, 1500, 2200, 2800, 3400, 3800, 4400, 7000]) {
    s.update(sun, 0, 0.016, { x: 0, z: 0 }, y);
    readings.push(s.cloudsHigh.material.opacity);
  }
  for (let i = 1; i < readings.length; i++) {
    assert.ok(readings[i] <= readings[i - 1] + 1e-9, `opacity rose on the way up: ${readings.join(", ")}`);
  }
  // Distinct values, not just "reaches zero": a hard cutoff would satisfy a
  // monotone check and still pop visibly in flight.
  const distinct = new Set(readings.map((v) => v.toFixed(3))).size;
  assert.ok(distinct >= 4, `the fade has only ${distinct} distinct values -- that is a switch, not a fade: ${readings.join(", ")}`);
});

test("with NO camera altitude given, nothing changes -- the old behaviour is the fallback", () => {
  // city-render.js calls update() with four arguments while building the world.
  // That call must not be silently blanked by a fifth parameter it never passes.
  const s = sky();
  s.update(sun, 0, 0, null);
  assert.equal(s.cloudsLow.visible, true, "clouds vanished when no camera altitude was supplied");
  assert.equal(s.deckVisibility(undefined, 2600), 1);
  assert.equal(s.deckVisibility(NaN, 2600), 1);
});

test("the curve is bounded at both ends, whatever it is handed", () => {
  const s = sky();
  for (const y of [-99999, 0, 1e9]) {
    const v = s.deckVisibility(y, 2600);
    assert.ok(v >= 0 && v <= 1, `deckVisibility(${y}) returned ${v}`);
  }
});
