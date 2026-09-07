import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { assembleBuilding } from "../public/kitbash-assembler.js";

test("A3.1: Assembler is strictly deterministic from seed", () => {
  const seeds = [1, 42, 999, 1337, 2026, 8888];
  for (const seed of seeds) {
    const b1 = assembleBuilding({ foot: { w: 4, d: 4 }, seed, lod: 0 }, THREE);
    const b2 = assembleBuilding({ foot: { w: 4, d: 4 }, seed, lod: 0 }, THREE);

    assert.deepEqual(b1.recipe, b2.recipe, `Seed ${seed}: recipe must match exactly`);
    assert.equal(b1.height, b2.height, `Seed ${seed}: height must match exactly`);
    assert.equal(b1.triangleCount, b2.triangleCount, `Seed ${seed}: triangle count must match exactly`);
    assert.equal(b1.parts.length, b2.parts.length, `Seed ${seed}: parts count must match exactly`);
  }
  console.log("✔ A3.1: Verified deterministic assembly across test seeds");
});

test("A3.2 & A3.3: Triangle distribution across 100 assembled buildings & LOD scaling", () => {
  const count = 100;
  const triDist0 = [];
  const triDist1 = [];
  const triDist2 = [];

  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 7;
    const footW = 3 + (i % 3); // 3x3, 4x4, 5x5
    const footD = 3 + (i % 3);

    const a0 = assembleBuilding({ foot: { w: footW, d: footD }, seed, lod: 0 }, THREE);
    const a1 = assembleBuilding({ foot: { w: footW, d: footD }, seed, lod: 1 }, THREE);
    const a2 = assembleBuilding({ foot: { w: footW, d: footD }, seed, lod: 2 }, THREE);

    triDist0.push(a0.triangleCount);
    triDist1.push(a1.triangleCount);
    triDist2.push(a2.triangleCount);

    // Gate A3.3: LOD2 must be under 150 triangles
    assert.ok(
      a2.triangleCount <= 150,
      `Assembly seed=${seed} LOD2 exceeds 150 triangles: got ${a2.triangleCount}`
    );
  }

  const avg0 = triDist0.reduce((a, b) => a + b, 0) / count;
  const min0 = Math.min(...triDist0);
  const max0 = Math.max(...triDist0);

  const avg1 = triDist1.reduce((a, b) => a + b, 0) / count;
  const avg2 = triDist2.reduce((a, b) => a + b, 0) / count;
  const max2 = Math.max(...triDist2);

  console.log("\n=== A3.2 & A3.3 TRIANGLE DISTRIBUTION (100 ASSEMBLED BUILDINGS) ===");
  console.log(`LOD0 (Near-band): Avg = ${avg0.toFixed(0)} tris | Min = ${min0} | Max = ${max0} tris (Budget: 1500-3000 max)`);
  console.log(`LOD1 (Mid-band):  Avg = ${avg1.toFixed(0)} tris`);
  console.log(`LOD2 (Far-band):  Avg = ${avg2.toFixed(0)} tris | Max = ${max2} tris (Gate: <= 150 tris)`);

  // Assertions
  assert.ok(avg0 <= 3000, `Average LOD0 triangles (${avg0}) within 3,000 ceiling`);
  assert.ok(max2 <= 150, `LOD2 maximum triangles (${max2}) is <= 150`);
});
