// TER-1/TER-2/TER-3 (PLAN.md §4, docs/DECISIONS-FOR-MARK.md #22) --
// docs/specs/RESEARCH.md §T1-§T3, built fresh with no reference to the
// retired public/terrain.js. Contract: docs/specs/CAT-1-TERRAIN-MESH-CONTRACT.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTerrainField, SEA_LEVEL_RISE_M } from "../public/terrain-field.js";

function samplePoints(half, n, seedOffset = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = (hashRand(i * 2 + seedOffset) - 0.5) * 2 * half;
    const z = (hashRand(i * 2 + 1 + seedOffset) - 0.5) * 2 * half;
    pts.push({ x, z });
  }
  return pts;
}
// A tiny deterministic PRNG for the test's own sampling -- not the module
// under test's noise, so a bug in one cannot mask a bug in the other.
function hashRand(n) {
  let h = (n * 2654435761) | 0;
  h = (h ^ (h >>> 15)) * 2246822519;
  h = h ^ (h >>> 13);
  return ((h >>> 0) % 100000) / 100000;
}

test("GATE (TER): same seed produces byte-identical heightAt/isWater/slopeAt across two independent field instances", () => {
  const a = createTerrainField({ seed: "gate-seed" });
  const b = createTerrainField({ seed: "gate-seed" });
  for (const { x, z } of samplePoints(4000, 40)) {
    assert.equal(a.heightAt(x, z), b.heightAt(x, z), `heightAt(${x},${z}) differs between two instances of the same seed`);
    assert.equal(a.isWater(x, z), b.isWater(x, z));
    assert.equal(a.slopeAt(x, z), b.slopeAt(x, z));
  }
});

test("a different seed produces a genuinely different field -- determinism is per-seed, not a constant", () => {
  const a = createTerrainField({ seed: "seed-a" });
  const b = createTerrainField({ seed: "seed-b" });
  const diffs = samplePoints(4000, 30).filter(({ x, z }) => a.heightAt(x, z) !== b.heightAt(x, z));
  assert.ok(diffs.length > 0, "two different seeds produced identical height at every sampled point");
});

test("isWater is exactly heightAt(x,z) <= 0, never a second, separately-computed answer", () => {
  const field = createTerrainField({ seed: "consistency" });
  for (const { x, z } of samplePoints(5000, 200)) {
    assert.equal(field.isWater(x, z), field.heightAt(x, z) <= 0, `isWater/heightAt disagree at (${x},${z})`);
  }
});

test("GATE (TER-2, RESEARCH.md T1): the pre-flood landmass is dominated by ONE connected region, not scattered independent blobs", () => {
  const field = createTerrainField({ seed: "connectivity" });
  const N = 80, HALF = 4200;
  const cell = (2 * HALF) / (N - 1);
  const land = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -HALF + i * cell, z = -HALF + j * cell;
      // preFloodHeightAt: the landmass BEFORE the sea-level rise floods it --
      // this is the "one landmass" T1 claims, tested directly rather than
      // trusting the post-flood archipelago (which MAY legitimately split
      // into several islands -- that is T1's own stated outcome, not a
      // failure of it).
      land[j * N + i] = field.preFloodHeightAt(x, z) > 0 ? 1 : 0;
    }
  }
  const seen = new Uint8Array(N * N);
  let totalLand = 0, largest = 0;
  for (let start = 0; start < N * N; start++) {
    if (!land[start]) continue;
    totalLand++;
    if (seen[start]) continue;
    let size = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const pi = p % N, pj = Math.floor(p / N);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = pi + di, nj = pj + dj;
        if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
        const np = nj * N + ni;
        if (land[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
      }
    }
    if (size > largest) largest = size;
  }
  assert.ok(totalLand > 0, "sanity check: the sampled region must contain some pre-flood land");
  const fraction = largest / totalLand;
  assert.ok(fraction > 0.6, `largest connected pre-flood landmass is only ${(fraction * 100).toFixed(1)}% of total land -- reads as scattered blobs, not one landmass (largest ${largest} of ${totalLand} land cells)`);
});

test("GATE (TER-1, RESEARCH.md T2): the coastline is a DERIVED contour of the height field (isWater/heightAt agree by construction), not an independently-decided boundary elevation could disagree with", () => {
  // Structural, not a separate measurement: covered by the isWater test
  // above, restated here as its own named gate because CHECKLIST.md names
  // "coastline first" as its own item. If isWater were ever computed from
  // a second, independent boundary (the elevation-first failure T2 names),
  // this assertion is where a mutation removing that link would be caught.
  const field = createTerrainField({ seed: "order-of-operations" });
  let sawLand = false, sawWater = false;
  for (const { x, z } of samplePoints(4500, 300)) {
    const h = field.heightAt(x, z);
    if (h > 0) sawLand = true; else sawWater = true;
    assert.equal(field.isWater(x, z), h <= 0);
  }
  assert.ok(sawLand && sawWater, "sanity check: the sampled region must contain both land and water for this gate to mean anything");
});

test("GATE (TER-3, RESEARCH.md T3): hydraulic erosion measurably changes the pre-flood height field, both eroding and depositing", () => {
  const field = createTerrainField({ seed: "erosion" });
  let eroded = 0, deposited = 0, unchanged = 0;
  for (const { x, z } of samplePoints(3500, 500)) {
    const before = field.preErosionHeightAt(x, z);
    const after = field.preFloodHeightAt(x, z);
    const delta = after - before;
    if (delta < -0.01) eroded++;
    else if (delta > 0.01) deposited++;
    else unchanged++;
  }
  assert.ok(eroded > 0, "erosion never lowered any sampled point -- the droplet pass is not dissolving anything");
  assert.ok(deposited > 0, "erosion never raised any sampled point -- the droplet pass is not depositing sediment anywhere");
  assert.ok(eroded + deposited > unchanged, `erosion changed fewer points (${eroded + deposited}) than it left alone (${unchanged}) -- too weak to be a real pass`);
});

test("slopeAt is a real numerical derivative of heightAt, not a separately-authored value -- verified against an independently-computed finite difference at a different step size", () => {
  const field = createTerrainField({ seed: "slope-check" });
  const EPS = 10; // deliberately different from terrain-field.js's own internal SLOPE_EPS_M (4)
  for (const { x, z } of samplePoints(3500, 60)) {
    const dhdx = (field.heightAt(x + EPS, z) - field.heightAt(x - EPS, z)) / (2 * EPS);
    const dhdz = (field.heightAt(x, z + EPS) - field.heightAt(x, z - EPS)) / (2 * EPS);
    const independentSlope = Math.hypot(dhdx, dhdz);
    const reported = field.slopeAt(x, z);
    // Different epsilon -> not bit-identical, but must agree to a real
    // tolerance on a field this smooth (erosion introduces some local
    // roughness, so this is not an exact match).
    assert.ok(
      Math.abs(independentSlope - reported) < 0.15 || Math.abs(independentSlope - reported) / (reported + 1e-6) < 0.5,
      `slopeAt(${x},${z}) = ${reported}, independently recomputed = ${independentSlope}`,
    );
  }
});

test("the field produces both land and water within a real, sane fraction -- not an empty ocean and not dry to every edge", () => {
  const field = createTerrainField({ seed: "sanity" });
  const N = 50, HALF = 4200;
  let land = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -HALF + (i / (N - 1)) * 2 * HALF;
      const z = -HALF + (j / (N - 1)) * 2 * HALF;
      if (field.heightAt(x, z) > 0) land++;
    }
  }
  const fraction = land / (N * N);
  assert.ok(fraction > 0.03 && fraction < 0.85, `land fraction ${fraction.toFixed(3)} is not a sane archipelago -- either almost all water or almost all land`);
});

test("SEA_LEVEL_RISE_M is a real, positive, disclosed constant -- the drowning in 'generate one landmass, then flood it' is not zero", () => {
  assert.ok(SEA_LEVEL_RISE_M > 0);
});

test("GATE (TER-1): heightAt is EXACTLY preFloodHeightAt minus SEA_LEVEL_RISE_M -- the flood is a real subtraction, checked directly rather than inferred from the resulting land fraction", () => {
  const field = createTerrainField({ seed: "flood-relationship" });
  for (const { x, z } of samplePoints(4000, 100)) {
    assert.equal(field.heightAt(x, z), field.preFloodHeightAt(x, z) - SEA_LEVEL_RISE_M, `heightAt(${x},${z}) does not equal preFloodHeightAt minus the disclosed rise`);
  }
});
