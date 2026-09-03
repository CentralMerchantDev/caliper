// The land has to know a river is water.
//
// Two defects an audit measured and nobody had a test for:
//
//   F1/C2  waterAt read `.kind`, `.surface` and `.id` off waterwayAt(), which
//          returns a BOOLEAN. Every field was undefined, so every waterway
//          reported itself a "river" -- three of the seven are canals -- and the
//          depth was max(0, 0 - h), zero anywhere at or above sea level.
//          703 of 703 sampled points said "river"; 653 of 703 said depth 0.
//
//   F2     surfaceAt classified by ELEVATION, and these waterways run 27-105 m
//          above sea level, so all of them read as dry land and canPlace
//          accepted a building in the middle of a river. 643 of 703 points did.
//
// These are sampled the same way the audit sampled them -- real points inside
// real waterways -- rather than against a fixture, because a fixture would have
// agreed with the broken code just as happily.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WATERWAYS } from "../public/waterways.js";
import { waterwayAt, waterwayInfoAt } from "../public/terrain.js";
import { sm } from "../public/world-scale.js";

/** Points along each waterway's centreline, in world metres. */
function samplePoints(perWay = 40) {
  const pts: Array<{ x: number; z: number; id: string; kind: string }> = [];
  for (const w of WATERWAYS as any[]) {
    for (let i = 0; i < perWay; i++) {
      // Skip the very ends: a polyline's first and last vertex sit on the
      // boundary, where "inside" is a coin toss and a failure there would be
      // about float comparison rather than about water.
      const t = 0.1 + (0.8 * i) / (perWay - 1);
      const seg = t * (w.points.length - 1);
      const a = w.points[Math.floor(seg)];
      const b = w.points[Math.min(w.points.length - 1, Math.floor(seg) + 1)];
      const f = seg - Math.floor(seg);
      pts.push({
        x: sm(a[0] + (b[0] - a[0]) * f),
        z: sm(a[1] + (b[1] - a[1]) * f),
        id: w.id,
        kind: w.kind,
      });
    }
  }
  return pts;
}

test("every sampled centreline point is inside its waterway", () => {
  const pts = samplePoints();
  const outside = pts.filter((p) => !waterwayAt(p.x, p.z));
  // If this fails the rest of the file is testing nothing, so it is checked
  // first and reported as a sampling problem rather than a water problem.
  assert.equal(outside.length, 0, `${outside.length}/${pts.length} sample points fell outside their own waterway`);
});

test("a canal is reported as a canal, not as a river", () => {
  const pts = samplePoints();
  const canals = pts.filter((p) => p.kind === "canal");
  assert.ok(canals.length > 0, "no canals in the manifest -- this test would prove nothing");
  const misreported = canals.filter((p) => waterwayInfoAt(p.x, p.z)?.kind !== "canal");
  assert.equal(misreported.length, 0, `${misreported.length}/${canals.length} canal points reported the wrong kind`);
});

test("every waterway point carries its own id", () => {
  const pts = samplePoints();
  const wrong = pts.filter((p) => waterwayInfoAt(p.x, p.z)?.id !== p.id);
  assert.equal(wrong.length, 0, `${wrong.length}/${pts.length} points reported the wrong waterway id`);
});

test("a river tapers -- narrower upstream than at its mouth", () => {
  // waterwayAt tapers a river's half-width by how far along the polyline a point
  // is (0.45 -> 1.0). Removing the taper survived every test: nothing sampled
  // the width at two different points along the same river.
  const river = (WATERWAYS as any[]).find((w) => w.kind === "river");
  assert.ok(river, "no river in the manifest");
  const at = (t: number) => {
    const seg = t * (river.points.length - 1);
    const a = river.points[Math.floor(seg)];
    const b2 = river.points[Math.min(river.points.length - 1, Math.floor(seg) + 1)];
    const f = seg - Math.floor(seg);
    return [sm(a[0] + (b2[0] - a[0]) * f), sm(a[1] + (b2[1] - a[1]) * f)] as const;
  };
  // Walk outward perpendicular-ish from the centreline until the water ends, and
  // compare that reach near the head against near the mouth.
  const reach = (t: number) => {
    const [cx, cz] = at(t);
    let r = 0;
    for (let d = 0; d < 4000; d += 5) { if (!waterwayAt(cx + d, cz)) break; r = d; }
    return r;
  };
  const head = reach(0.08), mouth = reach(0.95);
  assert.ok(mouth > head * 1.25,
    `a river should widen toward its mouth: reach ${head.toFixed(0)} m upstream vs ${mouth.toFixed(0)} m at the mouth`);
});

test("a waterway has a real depth, not zero", () => {
  const pts = samplePoints();
  const flat = pts.filter((p) => !((waterwayInfoAt(p.x, p.z)?.depth ?? 0) > 0));
  assert.equal(flat.length, 0, `${flat.length}/${pts.length} points reported zero depth`);
});

// THE BOUNDARY, PROBED FROM CLOSE UP.
//
// A blind audit widened every waterway by 3x -- tripling the world's water from
// 1.29% to 4.00% of the sampled region, wrongly refusing about 8.7 km2 of land --
// and all 605 tests stayed green. The four "dry land" probes below sit 36x to
// 269x the local half-width away from any water; the multiplier has to reach
// roughly 50 before one of them notices. A boundary probed only from far away on
// both sides is not a boundary test.
//
// Area is the measurement that catches a width change, because it is the thing a
// width change alters.
test("the world's water covers the area it is meant to", () => {
  // A coarse grid over the mainland. Coarse is fine: this is looking for a
  // fractional change of tens of percent, not for a missing pixel.
  const STEP = 260, HALF = 13000;
  let inWater = 0, total = 0;
  for (let x = -HALF; x <= HALF; x += STEP) {
    for (let z = -HALF; z <= HALF; z += STEP) {
      total++;
      if (waterwayAt(x, z)) inWater++;
    }
  }
  const pct = (inWater / total) * 100;
  // The bounds are MEASURED at this exact extent and step, not carried over from
  // an audit that sampled a different region -- its 1.29% figure does not apply
  // here and using it would have been fitting the number to the story.
  //
  //     half-widths as the manifest declares them   0.255%   (26/10201)
  //     every half-width x3                         0.872%
  //     every half-width x0.5                       0.127%
  //
  // 0.17 to 0.45 sits clear of all three. It is a coarse grid -- 26 hits -- so it
  // will not notice a small retune, and it is not meant to: it is here to catch a
  // half-width or a scale factor moving by a large multiple, which is what the
  // surviving mutation did.
  assert.ok(pct > 0.17 && pct < 0.45,
    `waterways cover ${pct.toFixed(3)}% of the sampled region; expected about 0.26%. ` +
    `A move this large means a half-width or a scale factor changed.`);
});

// PAIRED: dry land must still report no waterway. A waterwayInfoAt that returned
// something for every point would pass all four tests above and be useless.
test("and dry land reports no waterway at all", () => {
  const dry = [
    [0, 0], [5000, 5000], [-8000, 3000], [12000, -9000],
  ] as Array<[number, number]>;
  for (const [x, z] of dry) {
    const info = waterwayInfoAt(x, z);
    if (info) {
      // Not an automatic failure -- a probe point could land in a waterway by
      // chance. But it must agree with the boolean, which is the real assertion.
      assert.equal(waterwayAt(x, z), true, `waterwayInfoAt found ${info.id} at ${x},${z} where waterwayAt says there is none`);
    } else {
      assert.equal(waterwayAt(x, z), false, `waterwayAt says water at ${x},${z} but waterwayInfoAt found none`);
    }
  }
});
