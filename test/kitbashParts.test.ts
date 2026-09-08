import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { KITBASH_PARTS, CELL_M } from "../public/kitbash-parts.js";

const FABRIC_FACADE_CHARACTER = {
  "fabric-masonry-block-low": "heritage",
  "fabric-masonry-block-mid": "interwar",
  "fabric-punched-window-slab": "postwar",
  "fabric-retail-ground-simple": "heritage",
  "fabric-flat-roof-parapet": "contemporary",
  "fabric-mansard-roof-dormer": "heritage",
  "fabric-townhouse-bay-front": "heritage",
  "fabric-walkup-balconies": "postwar",
};

test("fabric parts use complete facade atlases and no repeated modelled windows", () => {
  for (const [id, expectedCharacter] of Object.entries(FABRIC_FACADE_CHARACTER)) {
    const geometries = KITBASH_PARTS[id].buildGeometry(THREE, {}, 0);
    const facadeParts = geometries.filter((item) => item.facadeCharacter);
    assert.ok(facadeParts.length > 0, `${id}: must expose an atlas-mapped facade`);
    assert.equal(geometries.some((item) => item.tag === "glass"), id === "fabric-mansard-roof-dormer",
      `${id}: only the mansard's discrete dormer glazing remains modelled`);

    for (const item of facadeParts) {
      assert.equal(item.facadeCharacter, expectedCharacter, `${id}: architectural family`);
      assert.equal(item.geo.userData.facadeCharacter, expectedCharacter, `${id}: geometry carries family to render adapters`);
      assert.equal(item.material, item.geo.userData.facadeMaterial, `${id}: geometry and part share one material set`);
      const facadeMaterials = Array.isArray(item.material) ? [item.material[0], item.material[1], item.material[4], item.material[5]] : [item.material];
      for (const mapName of ["map", "roughnessMap", "metalnessMap", "normalMap", "emissiveMap"]) {
        assert.ok(facadeMaterials.every((facadeMaterial) => facadeMaterial?.[mapName]?.isTexture),
          `${id}: ${mapName} must cover all four facade sides`);
      }

      const normals = item.geo.attributes.normal;
      const directions = new Set();
      for (let i = 0; i < normals.count; i++) {
        const x = normals.getX(i), z = normals.getZ(i);
        if (x > 0.9) directions.add("+x");
        if (x < -0.9) directions.add("-x");
        if (z > 0.9) directions.add("+z");
        if (z < -0.9) directions.add("-z");
      }
      if (item.geo.type === "BoxGeometry") {
        assert.deepEqual([...directions].sort(), ["+x", "+z", "-x", "-z"],
          `${id}: one atlas material must cover all four elevations of each facade box`);
      }
    }
  }
});

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
