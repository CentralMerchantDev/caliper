import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { assembleBuilding } from "../public/kitbash-assembler.js";

test("assembler preserves facade materials explicitly supplied by parts", () => {
  const fabric = assembleBuilding({ foot: { w: 16, d: 16 }, style: "fabric", seed: 7, lod: 0 }, THREE);
  assert.ok(fabric.parts.some((item) => item.facadeCharacter && Array.isArray(item.material) && item.material[0]?.map?.isTexture),
    "fabric assembly must retain the part's selected facade family and atlas");
});

test("assembler maps landmark walls and curtain glazing with the shared facade system", () => {
  const landmark = assembleBuilding({ foot: { w: 48, d: 48 }, style: "landmark", seed: 42, lod: 0 }, THREE);
  const facadeSurfaces = landmark.parts.filter((item) => item.tag === "wall" || item.tag === "glass");
  assert.ok(facadeSurfaces.length > 0, "landmark sample must expose a facade surface");
  assert.ok(facadeSurfaces.every((item) => item.material?.map?.isTexture),
    "landmark wall and glass surfaces must not fall back to flat black materials");
});

test("A3.1: Assembler is strictly deterministic from seed", () => {
  const seeds = [1, 42, 999, 1337, 2026, 8888];
  for (const seed of seeds) {
    const b1 = assembleBuilding({ foot: { w: 32, d: 32 }, seed, lod: 0 }, THREE);
    const b2 = assembleBuilding({ foot: { w: 32, d: 32 }, seed, lod: 0 }, THREE);

    assert.deepEqual(b1.recipe, b2.recipe, `Seed ${seed}: recipe must match exactly`);
    assert.equal(b1.height, b2.height, `Seed ${seed}: height must match exactly`);
    assert.equal(b1.triangleCount, b2.triangleCount, `Seed ${seed}: triangle count must match exactly`);
    assert.equal(b1.parts.length, b2.parts.length, `Seed ${seed}: parts count must match exactly`);
  }
  console.log("✔ A3.1: Verified deterministic assembly across test seeds");
});

test("A3.2 & A3.3: Report triangle distribution across 100 assembled buildings and LOD scaling", () => {
  const count = 100;
  const triDist0 = [];
  const triDist1 = [];
  const triDist2 = [];

  const standards = [
    { w: 16, d: 16 },
    { w: 16, d: 24 },
    { w: 24, d: 32 },
    { w: 32, d: 32 },
    { w: 48, d: 48 },
  ];

  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 7;
    const foot = standards[i % standards.length];

    const a0 = assembleBuilding({ foot, seed, lod: 0 }, THREE);
    const a1 = assembleBuilding({ foot, seed, lod: 1 }, THREE);
    const a2 = assembleBuilding({ foot, seed, lod: 2 }, THREE);

    triDist0.push(a0.triangleCount);
    triDist1.push(a1.triangleCount);
    triDist2.push(a2.triangleCount);

    assert.ok(a0.triangleCount > 0 && a1.triangleCount > 0 && a2.triangleCount > 0,
      `Assembly seed=${seed} must produce geometry at every LOD`);
  }

  const avg0 = triDist0.reduce((a, b) => a + b, 0) / count;
  const min0 = Math.min(...triDist0);
  const max0 = Math.max(...triDist0);

  const avg1 = triDist1.reduce((a, b) => a + b, 0) / count;
  const avg2 = triDist2.reduce((a, b) => a + b, 0) / count;
  const max2 = Math.max(...triDist2);

  console.log("\n=== A3.2 & A3.3 TRIANGLE DISTRIBUTION (100 ASSEMBLED BUILDINGS) ===");
  console.log(`LOD0 (Near-band): Avg = ${avg0.toFixed(0)} tris | Min = ${min0} | Max = ${max0} tris`);
  console.log(`LOD1 (Mid-band):  Avg = ${avg1.toFixed(0)} tris`);
  console.log(`LOD2 (Far-band):  Avg = ${avg2.toFixed(0)} tris | Max = ${max2} tris`);
});
