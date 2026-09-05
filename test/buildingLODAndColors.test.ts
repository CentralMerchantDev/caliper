import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { building } from "../public/buildings.js";

const TYPOLOGIES = [
  "bld-villa",
  "bld-terrace",
  "bld-townhouse",
  "bld-midrise",
  "bld-tower",
  "bld-shop",
  "bld-office",
  "bld-warehouse",
  "bld-workshop",
  "bld-apartment-walkup",
  "bld-highstreet-terrace",
  "bld-business-park",
];

test("AS1: every building geometry emits per-vertex colors distinguishing wall and roof without geometry groups", () => {
  for (const typo of TYPOLOGIES) {
    const s = building(typo, "test-colors", {}, THREE);
    const g0 = s.lod[0].createGeometry(THREE);

    // Color attribute exists with correct length and itemSize
    assert.ok(g0.attributes.color, `${typo} LOD0 is missing color attribute`);
    assert.equal(
      g0.attributes.color.count,
      g0.attributes.position.count,
      `${typo} LOD0 color count != position count`
    );
    assert.equal(g0.attributes.color.itemSize, 3);
    assert.equal(g0.groups.length, 0, `${typo} must not use geometry groups`);

    // Verify distinct colors include both wall and roof
    const distinct = new Set<number>();
    const c = new THREE.Color();
    for (let i = 0; i < g0.attributes.color.count; i++) {
      c.fromBufferAttribute(g0.attributes.color, i);
      distinct.add(c.getHex());
    }

    assert.ok(
      distinct.has(s.material.wall),
      `${typo} LOD0 geometry distinct colors do not contain wall color 0x${s.material.wall.toString(16)}`
    );
    assert.ok(
      distinct.has(s.material.roof),
      `${typo} LOD0 geometry distinct colors do not contain roof color 0x${s.material.roof.toString(16)}`
    );
  }
});

test("AS2: bld-tower never draws past declared footprint across all option combinations", () => {
  const positions = ["middle", "end-left", "end-right", "detached"];
  const corners = ["none", "left", "right"];
  const foundations = ["slab", "plinth", "stepped"];
  const characters = ["heritage", "interwar", "postwar", "contemporary"];
  const profiles = ["stepped", "tapered", "slab", "crown", "straight"];

  // Explicit test for the historical defect: 64x32 crown tower overhang
  for (const profile of profiles) {
    const s = building("bld-tower", "tower-crown-64x32", { cellW: 8, cellD: 4, profile });
    const g = s.lod[0].createGeometry(THREE);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    assert.ok(b.min.x >= -32 - 0.05, `bld-tower 64x32 min.x (${b.min.x}) < -32`);
    assert.ok(b.max.x <= 32 + 0.05, `bld-tower 64x32 max.x (${b.max.x}) > 32`);
    assert.ok(b.min.z >= -16 - 0.05, `bld-tower 64x32 min.z (${b.min.z}) < -16`);
    assert.ok(b.max.z <= 16 + 0.05, `bld-tower 64x32 max.z (${b.max.z}) > 16`);
  }

  for (const position of positions) {
    for (const corner of corners) {
      for (const foundation of foundations) {
        for (const character of characters) {
          for (const seed of ["probe", "tower-0", "tower-1", "tower-2", "tower-3"]) {
            const s = building("bld-tower", seed, { position, corner, foundation, character });
            const g = s.lod[0].createGeometry(THREE);
            g.computeBoundingBox();
            const b = g.boundingBox!;
            const footW = s.footprint.w;
            const footD = s.footprint.d;

            assert.ok(
              b.min.x >= -footW / 2 - 0.05,
              `bld-tower ${seed} min.x (${b.min.x}) < -${footW / 2}`
            );
            assert.ok(
              b.max.x <= footW / 2 + 0.05,
              `bld-tower ${seed} max.x (${b.max.x}) > ${footW / 2}`
            );
            assert.ok(
              b.min.z >= -footD / 2 - 0.05,
              `bld-tower ${seed} min.z (${b.min.z}) < -${footD / 2}`
            );
            assert.ok(
              b.max.z <= footD / 2 + 0.05,
              `bld-tower ${seed} max.z (${b.max.z}) > ${footD / 2}`
            );
          }
        }
      }
    }
  }
});

test("AS3: declared and actual triangle counts agree and LOD0 geometry is enriched across all typologies", () => {
  for (const typo of TYPOLOGIES) {
    const s = building(typo, "test-lod", {}, THREE);
    for (let i = 0; i < s.lod.length; i++) {
      const g = s.lod[i].createGeometry(THREE);
      const measured = (g.index ? g.index.count : g.attributes.position.count) / 3;
      const declared = s.lod[i].tris;
      // Budget check: measured geometry must stay within declared budget ceiling
      assert.ok(
        measured <= declared,
        `${typo} LOD${i} measured triangles (${measured}) exceed declared budget (${declared})`
      );
      // Anti-padding check: measured geometry must be at least 70% of budget
      // (a 30% margin accommodates procedural variation across seeds without permitting hollow declarations)
      assert.ok(
        measured >= declared * 0.7,
        `${typo} LOD${i} measured triangles (${measured}) below 70% of declared budget (${declared})`
      );
    }
    // Verify LOD0 is enriched (>= 140 tris)
    assert.ok(
      s.lod[0].tris >= 140,
      `${typo} LOD0 triangle count (${s.lod[0].tris}) is under budget`
    );
  }
});

test("AS4: LOD1 is an intermediate massing level distinct from LOD2 single silhouette box", () => {
  for (const typo of TYPOLOGIES) {
    const s = building(typo, "test-lod-dist", {}, THREE);
    const g1 = s.lod[1].createGeometry(THREE);
    const tris1 = (g1.index ? g1.index.count : g1.attributes.position.count) / 3;
    const g2 = s.lod[2].createGeometry(THREE);
    const tris2 = (g2.index ? g2.index.count : g2.attributes.position.count) / 3;
    // Verify LOD1 is a true intermediate level (distinct from LOD2)
    assert.ok(
      tris1 > tris2,
      `${typo} LOD1 measured tris (${tris1}) is not greater than LOD2 (${tris2})`
    );
    assert.ok(
      s.lod[1].tris > s.lod[2].tris,
      `${typo} LOD1 declared tris (${s.lod[1].tris}) is not greater than LOD2 (${s.lod[2].tris})`
    );
    // Verify LOD2 is exactly 12 triangles (single box)
    assert.equal(
      tris2,
      12,
      `${typo} LOD2 measured tris (${tris2}) != 12`
    );
    assert.equal(
      s.lod[2].tris,
      12,
      `${typo} LOD2 declared tris (${s.lod[2].tris}) != 12`
    );
  }
});
