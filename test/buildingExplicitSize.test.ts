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
  bldTerrace,
  bldTownhouse,
  bldHighStreetTerrace,
  bldBusinessParkBlock,
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

// RUN4 item 3: the four typologies that don't take cellW/cellD (they size
// by `units`, or not at all) were never covered by the MIN/MAX bounds check
// above -- not because anyone decided they didn't need it, but because the
// loop above is keyed on a dimension they don't have. A rotation-shaped
// overshoot (RUN3's real bldWorkshop regression) or any other bounds defect
// in these four would have gone uncaught indefinitely. Audited by hand
// first (8 seeds each, all within bounds, before writing this) so this test
// documents a real, checked property rather than a hopeful one.
// Option sets force every optional feature flag ON at least once, rather
// than hoping a plain seed sweep happens to roll it -- caught directly
// while writing this test: an 8-seed sweep of plain { units: 1 } never
// once rolled bldTerrace's hasDormers true, so a genuine, deliberately
// planted out-of-bounds mutation on the dormer's own geometry passed this
// test clean. A seed sweep alone is not proof of coverage; naming the
// flag explicitly is.
const NO_CELL_OPTION_TYPOLOGIES: { typology: string; fn: (seed?: string, options?: any, T?: typeof THREE) => any; optionSets: any[] }[] = [
  { typology: "bld-terrace", fn: bldTerrace, optionSets: [
    { units: 1 }, { units: 5 },
    { units: 1, hasBasement: true, hasStringCourse: true, hasDormers: true },
    { units: 5, hasBasement: true, hasStringCourse: true, hasDormers: true },
  ] },
  { typology: "bld-townhouse", fn: bldTownhouse, optionSets: [
    {}, { bayStyle: "cantilever", hasRoofDeck: true, hasRearExtension: true },
  ] },
  // bldHighStreetTerrace ignores `units` entirely (fixed 16x24 footprint,
  // no optional flags) -- checked by reading the function, not assumed;
  // one option set is genuinely all there is to cover.
  { typology: "bld-highstreet-terrace", fn: bldHighStreetTerrace, optionSets: [{}] },
  // hasSolarArray only removes an already-in-bounds box when false and
  // reproduces the prior always-present geometry when true -- not the same
  // defect shape as the dormer bounds gap below, covered here anyway for
  // completeness now that this typology has its first real option.
  { typology: "bld-business-park", fn: bldBusinessParkBlock, optionSets: [
    { hasSolarArray: true }, { hasSolarArray: false },
  ] },
];

test("the four typologies without cellW/cellD (terrace, townhouse, high-street terrace, business park) also fit strictly inside their own declared footprint", () => {
  for (const { typology, fn, optionSets } of NO_CELL_OPTION_TYPOLOGIES) {
    for (const options of optionSets) {
      for (let seed = 0; seed < 8; seed++) {
        const spec = fn(`bounds-seed-${seed}`, options, THREE);
        const { w: footW, d: footD } = spec.footprint;
        const height = spec.height;
        for (let lodIdx = 0; lodIdx < spec.lod.length; lodIdx++) {
          const geom = spec.lod[lodIdx].createGeometry(THREE);
          geom.computeBoundingBox();
          const bb = geom.boundingBox!;
          geom.dispose();
          assert.ok(bb.min.x >= -footW / 2 - 0.05 && bb.max.x <= footW / 2 + 0.05,
            `${typology} ${JSON.stringify(options)} seed ${seed} LOD${lodIdx}: x extent [${bb.min.x}, ${bb.max.x}] outside footprint width ${footW}`);
          assert.ok(bb.min.z >= -footD / 2 - 0.05 && bb.max.z <= footD / 2 + 0.05,
            `${typology} ${JSON.stringify(options)} seed ${seed} LOD${lodIdx}: z extent [${bb.min.z}, ${bb.max.z}] outside footprint depth ${footD}`);
          assert.ok(bb.min.y >= -0.05,
            `${typology} ${JSON.stringify(options)} seed ${seed} LOD${lodIdx}: geometry dips below ground (${bb.min.y})`);
          assert.ok(bb.max.y <= height + 0.5,
            `${typology} ${JSON.stringify(options)} seed ${seed} LOD${lodIdx}: max.y (${bb.max.y}) exceeds declared height ${height}`);
        }
      }
    }
  }
});
