import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { KITBASH_PARTS, CELL_M } from "../public/kitbash-parts.js";

test("all kitbash parts build, adhere to whole-cell contract and declare sockets", () => {
  const partIds = Object.keys(KITBASH_PARTS);
  console.log(`\nVerifying ${partIds.length} kitbash parts across all categories...`);

  assert.ok(partIds.length >= 50, `Expected at least 50 parts, got ${partIds.length}`);

  const census = {
    podium: 0,
    shaft: 0,
    crown: 0,
    roof: 0,
    connector: 0,
    fabric: 0,
  };

  console.log("\n| ID | Category | Cells (WxD) | Height | LOD0 Tris | LOD1 Tris | LOD2 Tris |");
  console.log("|---|---|---|---|---|---|---|");

  for (const id of partIds) {
    const part = KITBASH_PARTS[id];
    census[part.category] = (census[part.category] || 0) + 1;

    // 1. Whole metre footprint validation on standard table or named exception
    assert.ok(Number.isInteger(part.foot.w) && part.foot.w > 0, `${id}: foot.w must be positive integer in metres`);
    assert.ok(Number.isInteger(part.foot.d) && part.foot.d > 0, `${id}: foot.d must be positive integer in metres`);

    const STANDARD_FOOTPRINTS = new Set([
      "8x8", "8x16", "16x8", "16x16", "16x24", "24x16", "24x32", "32x24", "32x32", "48x48", "64x64",
      // Named exceptions: connectors (skybridges)
      "32x8", "24x8", "16x8"
    ]);
    const footKey = `${part.foot.w}x${part.foot.d}`;
    assert.ok(STANDARD_FOOTPRINTS.has(footKey), `${id}: footprint ${footKey} must be on standard table or named exception`);

    // 2. Declared sockets validation in whole metres
    assert.ok(part.sockets, `${id}: sockets must be defined`);
    assert.ok(part.sockets.bottom, `${id}: bottom socket must be defined`);
    assert.ok(Number.isInteger(part.sockets.bottom.w) && part.sockets.bottom.w >= 0, `${id}: bottom.w must be whole metre integer`);
    assert.ok(Number.isInteger(part.sockets.bottom.d) && part.sockets.bottom.d >= 0, `${id}: bottom.d must be whole metre integer`);
    assert.ok(Number.isInteger(part.sockets.top.w) && part.sockets.top.w >= 0, `${id}: top.w must be whole metre integer`);
    assert.ok(Number.isInteger(part.sockets.top.d) && part.sockets.top.d >= 0, `${id}: top.d must be whole metre integer`);

    // 3. Geometry builds at LOD0, LOD1, LOD2
    let tris0 = 0, tris1 = 0, tris2 = 0;

    const g0 = part.buildGeometry(THREE, {}, 0);
    for (const p of g0) {
      assert.ok(p.geo && p.geo.isBufferGeometry, `${id}: LOD0 part must have BufferGeometry`);
      tris0 += p.geo.index ? p.geo.index.count / 3 : p.geo.attributes.position.count / 3;
    }

    const g1 = part.buildGeometry(THREE, {}, 1);
    for (const p of g1) {
      assert.ok(p.geo && p.geo.isBufferGeometry, `${id}: LOD1 part must have BufferGeometry`);
      tris1 += p.geo.index ? p.geo.index.count / 3 : p.geo.attributes.position.count / 3;
    }

    const g2 = part.buildGeometry(THREE, {}, 2);
    for (const p of g2) {
      assert.ok(p.geo && p.geo.isBufferGeometry, `${id}: LOD2 part must have BufferGeometry`);
      tris2 += p.geo.index ? p.geo.index.count / 3 : p.geo.attributes.position.count / 3;
    }

    assert.ok(tris0 > 0, `${id}: LOD0 must have positive triangles`);

    if (part.category === "fabric") for (const [lod, geometries] of [[0, g0], [1, g1], [2, g2]] as const) {
      const bounds = new THREE.Box3();
      for (const item of geometries) {
        item.geo.computeBoundingBox();
        assert.ok(item.geo.boundingBox, `${id}: LOD${lod} geometry must have bounds`);
        bounds.union(item.geo.boundingBox);
      }
      assert.ok(bounds.min.x > -part.foot.w / 2 && bounds.max.x < part.foot.w / 2,
        `${id}: LOD${lod} must fit strictly inside its declared width`);
      assert.ok(bounds.min.z > -part.foot.d / 2 && bounds.max.z < part.foot.d / 2,
        `${id}: LOD${lod} must fit strictly inside its declared depth`);
      const geometryEpsilon = 1e-5;
      assert.ok(bounds.min.y >= -geometryEpsilon && bounds.max.y <= part.height + geometryEpsilon,
        `${id}: LOD${lod} must remain within its declared height`);
    }

    console.log(`| ${id} | ${part.category} | ${part.foot.w}x${part.foot.d} | ${part.height}m | ${tris0} | ${tris1} | ${tris2} |`);
  }

  console.log("\nKitbash Category Census:", JSON.stringify(census));
  assert.ok(census.podium >= 8, "Podiums >= 8");
  assert.ok(census.shaft >= 16, "Shafts >= 16");
  assert.ok(census.crown >= 12, "Crowns >= 12");
  assert.ok(census.roof >= 10, "Roof features >= 10");
  assert.ok(census.connector >= 8, "Connectors >= 8");
  assert.ok(census.fabric >= 8, "Fabric >= 8");
});
