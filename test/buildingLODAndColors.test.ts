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
      // for this one typical seed. The anti-padding check used to live here
      // too, comparing this single seed against the declared ceiling -- moved
      // to AS3b below, which anchors it against the true worst case across
      // the full reachable range instead of one arbitrary seed (see AS3b's
      // own comment for why that arbitrary-seed anchor stopped being valid
      // once the declared ceiling itself had to reflect the worst case, not
      // the typical one).
      assert.ok(
        measured <= declared,
        `${typo} LOD${i} measured triangles (${measured}) exceed declared budget (${declared})`
      );
    }
    // Verify LOD0 is enriched (>= 140 tris)
    assert.ok(
      s.lod[0].tris >= 140,
      `${typo} LOD0 triangle count (${s.lod[0].tris}) is under budget`
    );
  }
});

// AS3 above samples exactly ONE fixed seed with no explicit options per
// typology. Proven insufficient this session: bldWarehouse's own roofStyle
// ("sawtooth" vs "barrel"/"curved") measures very different triangle counts
// depending which value a seed happens to roll, and AS3's one fixed seed
// never happened to land on "sawtooth" at max cell size -- so a real,
// measured ~2x budget violation (roughly 780 triangles against a declared
// 392) sat uncaught. "A budget gate that samples one seed is not a budget
// gate." This test sweeps the REAL reachable range instead: every legal
// MIN/MAX cellW/cellD extreme (the same source of truth
// buildingExplicitSize.test.ts's own TYPOLOGIES table already establishes),
// crossed with every declared style-enum option each typology actually
// accepts (roofStyle/profile/podiumType/cornerTreatment -- the ones proven,
// same as bldWarehouse's, to each independently change triangle count), plus
// `foundation: "plinth"` at the MAX case (the one foundation value proven,
// via `applyFoundation`, to add geometry unconditionally over the "slab"
// default). Typologies with no enum-valued option (shop, office -- booleans
// only) still get swept at MIN/MAX cell size.
const CELL_RANGE: Record<string, { minW: number; maxW: number; minD: number; maxD: number }> = {
  "bld-villa": { minW: 2, maxW: 3, minD: 3, maxD: 4 },
  "bld-midrise": { minW: 3, maxW: 6, minD: 4, maxD: 8 },
  "bld-shop": { minW: 2, maxW: 4, minD: 2, maxD: 3 },
  "bld-office": { minW: 4, maxW: 8, minD: 6, maxD: 10 },
  "bld-apartment-walkup": { minW: 3, maxW: 5, minD: 4, maxD: 7 },
  "bld-warehouse": { minW: 6, maxW: 10, minD: 10, maxD: 20 },
  "bld-workshop": { minW: 3, maxW: 5, minD: 4, maxD: 7 },
  "bld-tower": { minW: 4, maxW: 8, minD: 4, maxD: 8 },
};

const STYLE_OPTIONS: Record<string, Record<string, unknown>[]> = {
  "bld-villa": [{ roofStyle: "gable" }, { roofStyle: "hip" }, { roofStyle: "mansard" }, { roofStyle: "parapet" }],
  "bld-midrise": [
    { podiumType: "retail" }, { podiumType: "arcade" }, { podiumType: "flush" },
    { cornerTreatment: "chamfer" }, { cornerTreatment: "curved" }, { cornerTreatment: "square" },
  ],
  "bld-shop": [{}],
  "bld-office": [{}],
  "bld-apartment-walkup": [{ roofStyle: "pitched" }, { roofStyle: "mansard" }, { roofStyle: "parapet" }],
  "bld-warehouse": [{ roofStyle: "sawtooth" }, { roofStyle: "barrel" }, { roofStyle: "curved" }],
  "bld-workshop": [{ roofStyle: "monopitch" }, { roofStyle: "gabled" }],
  "bld-tower": [{ profile: "stepped" }, { profile: "tapered" }, { profile: "slab" }, { profile: "crown" }, { profile: "straight" }],
};

test("AS3b: declared triangle budget holds across the full reachable range -- every cellW/cellD extreme x every declared style option, not one fixed seed", () => {
  for (const [typo, range] of Object.entries(CELL_RANGE)) {
    const cellCases: { label: string; cellW: number; cellD: number; extra: Record<string, unknown> }[] = [
      { label: "MIN", cellW: range.minW, cellD: range.minD, extra: {} },
      { label: "MAX", cellW: range.maxW, cellD: range.maxD, extra: { foundation: "plinth" } },
    ];
    // Tracks the worst (highest-triangle) measurement seen per LOD across
    // the whole sweep -- this is what the anti-padding check below anchors
    // against, replacing AS3's old anchor (one arbitrary default seed),
    // which stopped being valid once the declared ceiling itself had to
    // reflect the true worst case rather than the typical one: a typology
    // with wide real variance (e.g. bld-midrise, whose default seed measures
    // 420 against a 624 ceiling set by its own "podiumType: retail" worst
    // case) would otherwise fail an anti-padding check anchored to a seed
    // that was never the worst case to begin with.
    const worst: number[] = [];
    for (const cellCase of cellCases) {
      for (const styleOptions of STYLE_OPTIONS[typo]) {
        const options = { cellW: cellCase.cellW, cellD: cellCase.cellD, ...styleOptions, ...cellCase.extra };
        const s = building(typo, "as3b-seed", options, THREE);
        for (let i = 0; i < s.lod.length; i++) {
          const g = s.lod[i].createGeometry(THREE);
          const measured = (g.index ? g.index.count : g.attributes.position.count) / 3;
          const declared = s.lod[i].tris;
          g.dispose();
          assert.ok(
            measured <= declared,
            `${typo} ${cellCase.label} (cellW=${cellCase.cellW}, cellD=${cellCase.cellD}) ${JSON.stringify(styleOptions)} LOD${i} measured triangles (${measured}) exceed declared budget (${declared})`
          );
          worst[i] = Math.max(worst[i] ?? 0, measured);
        }
      }
    }
    const s0 = building(typo, "as3b-seed", {}, THREE);
    for (let i = 0; i < worst.length; i++) {
      const declared = s0.lod[i].tris;
      // Anti-padding check, anchored to the true worst case across the full
      // sweep rather than one arbitrary seed -- a declared ceiling that no
      // reachable combination gets within 30% of is exactly the "hollow
      // declaration" AS3's own original comment warned about, just measured
      // against the right thing now.
      assert.ok(
        worst[i] >= declared * 0.7,
        `${typo} LOD${i}: even the worst reachable combination (${worst[i]} tris) is below 70% of declared budget (${declared}) -- the declared ceiling looks padded`
      );
    }
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
