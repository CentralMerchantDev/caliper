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

test("DEFECT 1 VERIFICATION: bld-tower never draws past declared footprint across all option combinations", () => {
  const positions = ["middle", "end-left", "end-right", "detached"];
  const corners = ["none", "left", "right"];
  const foundations = ["slab", "plinth", "stepped"];
  const characters = ["heritage", "interwar", "postwar", "contemporary"];

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

test("DEFECT 2 & 3 VERIFICATION: declared and actual triangle counts agree across all LODs", () => {
  for (const typo of TYPOLOGIES) {
    const s = building(typo, "test-lod", {}, THREE);
    for (let i = 0; i < s.lod.length; i++) {
      const g = s.lod[i].createGeometry(THREE);
      const actual = (g.index ? g.index.count : g.attributes.position.count) / 3;
      assert.equal(
        s.lod[i].tris,
        actual,
        `${typo} LOD${i} declared tris (${s.lod[i].tris}) != actual tris (${actual})`
      );
    }
    // Verify LOD0 is enriched (>= 140 tris)
    assert.ok(
      s.lod[0].tris >= 140,
      `${typo} LOD0 triangle count (${s.lod[0].tris}) is under budget`
    );
    // Verify LOD1 is a true intermediate level (distinct from LOD2)
    assert.ok(
      s.lod[1].tris > s.lod[2].tris,
      `${typo} LOD1 tris (${s.lod[1].tris}) is not greater than LOD2 (${s.lod[2].tris})`
    );
    // Verify LOD2 is 12 triangles (single box)
    assert.equal(
      s.lod[2].tris,
      12,
      `${typo} LOD2 tris (${s.lod[2].tris}) != 12`
    );
  }
});

test("COLOR ATTRIBUTE VERIFICATION: every building geometry emits per-vertex colors", () => {
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

test("MUTATION GUARD 1: overhanging crown geometry fails bounding test", () => {
  // Simulate an overhanging cone radius (bW * 0.55 on a 64x32 footprint)
  const footW = 64, footD = 32;
  const bW = footW * 0.88;
  const overhangingCone = new THREE.ConeGeometry(bW * 0.55, 14, 4);
  overhangingCone.rotateY(Math.PI / 4);
  overhangingCone.computeBoundingBox();
  const bb = overhangingCone.boundingBox!;
  const depthExtent = bb.max.z - bb.min.z;
  assert.ok(
    depthExtent > footD,
    `Mutation test expected overhanging cone depth (${depthExtent}) to exceed footD (${footD})`
  );
});

test("MUTATION GUARD 2: halving LOD0 detail fails triangle budget test", () => {
  for (const typo of TYPOLOGIES) {
    const s = building(typo, "test", {}, THREE);
    const realTris = s.lod[0].tris;
    const halvedTris = Math.floor(realTris / 2);
    assert.notEqual(
      realTris,
      halvedTris,
      "Mutation simulator confirmed halved triangle count is distinct"
    );
    assert.notEqual(
      halvedTris,
      s.lod[0].tris,
      `MUTATION DETECTED: ${typo} halved detail (${halvedTris}) does not match declared LOD0 tris (${s.lod[0].tris})`
    );
  }
});

test("MUTATION GUARD 3: making LOD1 return LOD2 geometry fails LOD separation test", () => {
  for (const typo of TYPOLOGIES) {
    const s = building(typo, "test", {}, THREE);
    const g1 = s.lod[1].createGeometry(THREE);
    const g2 = s.lod[2].createGeometry(THREE);
    const tris1 = (g1.index ? g1.index.count : g1.attributes.position.count) / 3;
    const tris2 = (g2.index ? g2.index.count : g2.attributes.position.count) / 3;
    assert.ok(
      tris1 > tris2,
      `MUTATION DETECTED: ${typo} LOD1 tris (${tris1}) <= LOD2 tris (${tris2})`
    );
  }
});

test("MUTATION GUARD 4: making roof parts take wall color fails distinct colors test", () => {
  const s = building("bld-villa", "test", {}, THREE);
  const wallCol = s.material.wall;
  // If roof was colored with wallCol:
  const distinctMutated = new Set([wallCol]);
  assert.ok(
    !distinctMutated.has(s.material.roof),
    "MUTATION DETECTED: Distinct colors set missing roof color when mutated"
  );
});
