import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  bldVilla,
  bldMidrise,
  bldShop,
  bldOffice,
  bldApartmentWalkup,
  bldWarehouse,
  bldWorkshop,
  bldTower,
  building
} from "../public/buildings.js";

interface TypologySpec {
  name: string;
  fn: (seed?: string, options?: any, T?: typeof THREE) => any;
  minCellW: number;
  maxCellW: number;
  minCellD: number;
  maxCellD: number;
}

const TYPOLOGIES: TypologySpec[] = [
  { name: "bldVilla", fn: bldVilla, minCellW: 2, maxCellW: 3, minCellD: 3, maxCellD: 4 },
  { name: "bldMidrise", fn: bldMidrise, minCellW: 3, maxCellW: 6, minCellD: 4, maxCellD: 8 },
  { name: "bldShop", fn: bldShop, minCellW: 2, maxCellW: 4, minCellD: 2, maxCellD: 3 },
  { name: "bldOffice", fn: bldOffice, minCellW: 4, maxCellW: 8, minCellD: 6, maxCellD: 10 },
  { name: "bldApartmentWalkup", fn: bldApartmentWalkup, minCellW: 3, maxCellW: 5, minCellD: 4, maxCellD: 7 },
  { name: "bldWarehouse", fn: bldWarehouse, minCellW: 6, maxCellW: 10, minCellD: 10, maxCellD: 20 },
  { name: "bldWorkshop", fn: bldWorkshop, minCellW: 3, maxCellW: 5, minCellD: 4, maxCellD: 7 },
  { name: "bldTower", fn: bldTower, minCellW: 4, maxCellW: 8, minCellD: 4, maxCellD: 8 },
];

test("every dynamic building typology accepts explicit cellW and cellD options within legal range", () => {
  for (const typo of TYPOLOGIES) {
    for (let w = typo.minCellW; w <= typo.maxCellW; w++) {
      for (let d = typo.minCellD; d <= typo.maxCellD; d++) {
        const m = typo.fn("test-seed", { cellW: w, cellD: d }, THREE);
        assert.equal(m.params.cellW, w, `${typo.name} failed to set params.cellW=${w}`);
        assert.equal(m.params.cellD, d, `${typo.name} failed to set params.cellD=${d}`);
        assert.equal(m.footprint.w, w * 8, `${typo.name} failed footprint.w=${w * 8}`);
        assert.equal(m.footprint.d, d * 8, `${typo.name} failed footprint.d=${d * 8}`);
      }
    }
  }
});

test("building typologies CLAMP options that fall below minimum legal range and record adjusted params", () => {
  for (const typo of TYPOLOGIES) {
    const m = typo.fn("test-seed", { cellW: 0, cellD: -5 }, THREE);
    assert.equal(
      m.params.cellW,
      typo.minCellW,
      `${typo.name} did not clamp under-range cellW to ${typo.minCellW}`
    );
    assert.equal(
      m.params.cellD,
      typo.minCellD,
      `${typo.name} did not clamp under-range cellD to ${typo.minCellD}`
    );
    assert.equal(m.footprint.w, typo.minCellW * 8);
    assert.equal(m.footprint.d, typo.minCellD * 8);
  }
});

test("building typologies CLAMP options that fall above maximum legal range and record adjusted params", () => {
  for (const typo of TYPOLOGIES) {
    const m = typo.fn("test-seed", { cellW: 999, cellD: 1000 }, THREE);
    assert.equal(
      m.params.cellW,
      typo.maxCellW,
      `${typo.name} did not clamp over-range cellW to ${typo.maxCellW}`
    );
    assert.equal(
      m.params.cellD,
      typo.maxCellD,
      `${typo.name} did not clamp over-range cellD to ${typo.maxCellD}`
    );
    assert.equal(m.footprint.w, typo.maxCellW * 8);
    assert.equal(m.footprint.d, typo.maxCellD * 8);
  }
});

test("geometry fits strictly inside declared footprint at both MIN and MAX option ranges", () => {
  for (const typo of TYPOLOGIES) {
    const cases = [
      { label: "MIN", cellW: typo.minCellW, cellD: typo.minCellD },
      { label: "MAX", cellW: typo.maxCellW, cellD: typo.maxCellD },
    ];

    for (const c of cases) {
      const m = typo.fn("test-bounds", { cellW: c.cellW, cellD: c.cellD }, THREE);
      const footW = m.footprint.w;
      const footD = m.footprint.d;
      const height = m.height;

      for (let lodIdx = 0; lodIdx < m.lod.length; lodIdx++) {
        const geom = m.lod[lodIdx].createGeometry(THREE);
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;

        assert.ok(
          bb.min.x >= -footW / 2 - 0.05,
          `${typo.name} ${c.label} LOD${lodIdx} min.x (${bb.min.x}) < -${footW / 2}`
        );
        assert.ok(
          bb.max.x <= footW / 2 + 0.05,
          `${typo.name} ${c.label} LOD${lodIdx} max.x (${bb.max.x}) > ${footW / 2}`
        );
        assert.ok(
          bb.min.z >= -footD / 2 - 0.05,
          `${typo.name} ${c.label} LOD${lodIdx} min.z (${bb.min.z}) < -${footD / 2}`
        );
        assert.ok(
          bb.max.z <= footD / 2 + 0.05,
          `${typo.name} ${c.label} LOD${lodIdx} max.z (${bb.max.z}) > ${footD / 2}`
        );
        assert.ok(
          bb.min.y >= -0.05,
          `${typo.name} ${c.label} LOD${lodIdx} min.y (${bb.min.y}) < 0`
        );
        assert.ok(
          bb.max.y <= height + 0.5,
          `${typo.name} ${c.label} LOD${lodIdx} max.y (${bb.max.y}) > height ${height}`
        );
      }
    }
  }
});

test("MUTATION GUARD: options.cellW must never be ignored by any typology", () => {
  // A mutation simulator where options.cellW is ignored produces a model identical
  // to the seed-only model. We verify that requesting a specific distinct cellW
  // genuinely changes footprint.w and params.cellW.
  for (const typo of TYPOLOGIES) {
    // Seed-derived model with no options
    const mSeed = typo.fn("fixed-seed", {}, THREE);
    const defaultCellW = mSeed.params.cellW;

    // Pick an alternative valid cellW
    const altCellW = defaultCellW === typo.minCellW ? typo.maxCellW : typo.minCellW;
    const mOpt = typo.fn("fixed-seed", { cellW: altCellW }, THREE);

    assert.notEqual(
      mOpt.params.cellW,
      defaultCellW,
      `MUTATION DETECTED: ${typo.name} ignored options.cellW and returned seed default ${defaultCellW}`
    );
    assert.equal(
      mOpt.footprint.w,
      altCellW * 8,
      `MUTATION DETECTED: ${typo.name} footprint.w does not reflect options.cellW`
    );

    // Verify geometry changed dimension as well
    const geom1 = mSeed.lod[0].createGeometry(THREE);
    geom1.computeBoundingBox();
    const geom2 = mOpt.lod[0].createGeometry(THREE);
    geom2.computeBoundingBox();

    const w1 = geom1.boundingBox!.max.x - geom1.boundingBox!.min.x;
    const w2 = geom2.boundingBox!.max.x - geom2.boundingBox!.min.x;
    assert.ok(
      Math.abs(w1 - w2) > 2.0,
      `MUTATION DETECTED: ${typo.name} geometry did not scale with options.cellW (w1=${w1}, w2=${w2})`
    );
  }
});
