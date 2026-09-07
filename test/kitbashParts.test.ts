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

    // 1. Whole cell footprint validation
    assert.ok(Number.isInteger(part.foot.w) && part.foot.w > 0, `${id}: foot.w must be positive integer`);
    assert.ok(Number.isInteger(part.foot.d) && part.foot.d > 0, `${id}: foot.d must be positive integer`);

    // 2. Declared sockets validation
    assert.ok(part.sockets, `${id}: sockets must be defined`);
    assert.ok(part.sockets.bottom, `${id}: bottom socket must be defined`);
    assert.ok(Number.isInteger(part.sockets.bottom.w), `${id}: bottom.w must be integer`);
    assert.ok(Number.isInteger(part.sockets.bottom.d), `${id}: bottom.d must be integer`);

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
    assert.ok(tris2 <= 150, `${id}: LOD2 must be cheap (< 150 triangles), got ${tris2}`);

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
