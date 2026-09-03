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
// These tests are about the CURVE, not about the material existing. A test that
// only asserted "the clouds have an opacity" would have passed throughout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCitySky } from "../public/sky.js";

/** Enough of three.js for sky.js to build against, with no GPU and no canvas. */
function fakeTHREE() {
  class V3 {
    x = 0; y = 0; z = 0;
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
    copy(o: any) { this.x = o.x; this.y = o.y; this.z = o.z; return this; }
    normalize() { return this; }
    setScalar(s: number) { this.x = s; this.y = s; this.z = s; return this; }
  }
  class Col {
    r = 0; g = 0; b = 0;
    setRGB(r: number, g: number, b: number) { this.r = r; this.g = g; this.b = b; return this; }
    copy(o: any) { this.r = o.r; this.g = o.g; this.b = o.b; return this; }
  }
  class Obj {
    children: any[] = []; visible = true;
    position = new V3(); rotation = new V3(); scale = new V3();
    add(...c: any[]) { this.children.push(...c); return this; }
    removeFromParent() { return this; }
  }
  class Mat { opacity = 0; color = new Col(); dispose() {} }
  return {
    Vector3: V3, Color: Col, Group: Obj, Object3D: Obj,
    Mesh: class extends Obj { constructor(public geometry: any, public material: any) { super(); } },
    Points: class extends Obj { constructor(public geometry: any, public material: any) { super(); } },
    SphereGeometry: class { dispose() {} },
    BufferGeometry: class {
      setAttribute() { return this; } dispose() {}
    },
    // sky.js uses BufferAttribute, not Float32BufferAttribute. The first version
    // of this fake carried the wrong one and every test in the file died in the
    // constructor -- six red tests that said nothing about the clouds. The list
    // below is `grep -o "THREE\.[A-Za-z]*" sky.js | sort -u`, not a guess.
    BufferAttribute: class { constructor(public array: any, public itemSize: number) {} },
    Float32BufferAttribute: class { constructor(public array: any, public itemSize: number) {} },
    MeshBasicMaterial: Mat, PointsMaterial: Mat, MeshStandardMaterial: Mat,
    CanvasTexture: class { wrapS = 0; wrapT = 0; colorSpace = ""; repeat = { set() {} }; dispose() {} },
    RepeatWrapping: 1000, BackSide: 1, AdditiveBlending: 2, SRGBColorSpace: "srgb",
  } as any;
}

/**
 * makeCloudTexture() draws its blobs on a real 2D canvas, which node has not
 * got. Only the six methods sky.js actually calls are stubbed -- listed from
 * `grep -o "\bg\.[a-zA-Z]*" sky.js`, so if the drawing code starts using a
 * seventh this stub fails loudly rather than quietly returning undefined.
 */
function withCanvas<T>(fn: () => T): T {
  const had = "document" in globalThis;
  const prev = (globalThis as any).document;
  (globalThis as any).document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({
        clearRect() {}, beginPath() {}, fill() {}, arc() {},
        set fillStyle(_v: any) {},
        createRadialGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };
  try { return fn(); }
  finally { if (had) (globalThis as any).document = prev; else delete (globalThis as any).document; }
}

function sky() {
  return withCanvas(() => {
    const T = fakeTHREE();
    return createCitySky(T, new T.Group());
  });
}

const sun = { x: 0.3, y: 0.8, z: 0.5 };

test("below both decks, the clouds are a ceiling and both are drawn", () => {
  const s = sky();
  s.update(sun, 0, 0.016, { x: 0, z: 0 }, 400);
  assert.equal(s.cloudsLow.visible, true, "the low deck should be overhead at 400 m");
  assert.equal(s.cloudsHigh.visible, true, "the high deck should be overhead at 400 m");
  assert.ok(s.cloudsLow.material.opacity > 0.5, `low deck opacity was ${s.cloudsLow.material.opacity}`);
});

test("at the orbit Mark was flying, NEITHER dome is drawn -- this is the crest", () => {
  const s = sky();
  // 46 km range at 21 degrees of pitch is roughly 16.5 km up. Both decks are
  // 3-6x below that.
  s.update(sun, 0, 0.016, { x: 0, z: 0 }, 16500);
  assert.equal(s.cloudsLow.visible, false, "the low deck was still drawn from above");
  assert.equal(s.cloudsHigh.visible, false, "the high deck was still drawn from above -- this is the crescent");
});

test("the decks fade INDEPENDENTLY -- one material could not do this", () => {
  const s = sky();
  // 3.4 km: above the 2.6 km deck, below the 4.2 km one. This altitude is the
  // reason each deck needs its own material; sharing one meant the low deck
  // could not go while the high deck was still a real ceiling overhead.
  s.update(sun, 0, 0.016, { x: 0, z: 0 }, 3400);
  assert.equal(s.cloudsHigh.visible, true, "the high deck is still overhead at 3.4 km and should still draw");
  assert.ok(
    s.cloudsLow.material.opacity < s.cloudsHigh.material.opacity,
    `the low deck should be thinner than the high one at 3.4 km: ` +
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
  // Monotone down, and it actually moves rather than sitting at one value until
  // it drops -- a hard cutoff would pass a "goes to zero" test and still pop.
  for (let i = 1; i < readings.length; i++) {
    assert.ok(readings[i] <= readings[i - 1] + 1e-9, `opacity rose on the way up: ${readings.join(", ")}`);
  }
  const distinct = new Set(readings.map((v) => v.toFixed(3))).size;
  assert.ok(distinct >= 4, `the fade has only ${distinct} distinct values -- that is a switch, not a fade: ${readings.join(", ")}`);
});

test("with NO camera altitude given, nothing changes -- the old behaviour is the fallback", () => {
  // city-render.js calls update() with four arguments during world build. That
  // call must not be silently blanked by a fifth parameter it does not pass.
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
