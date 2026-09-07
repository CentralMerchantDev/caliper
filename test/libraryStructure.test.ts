import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ASSET_REGISTRY, deriveRank, deriveScaleClass } from "../public/asset-registry.js";
import { TIER_MODELS } from "../public/tier-models.js";

const VALID_PLANS = new Set(["bar", "L", "U", "court", "tower-on-podium", "point", "ring"]);
const VALID_FINISHES = new Set(["f1", "f2", "f3", "f4"]);

test("deriveScaleClass and deriveRank produce expected scale letters and rank strings", () => {
  assert.equal(deriveScaleClass({ w: 2, d: 2 }, 3), "A"); // vol = 12 <= 16
  assert.equal(deriveScaleClass({ w: 3, d: 3 }, 6), "B"); // vol = 54 <= 64
  assert.equal(deriveScaleClass({ w: 4, d: 4 }, 10), "C"); // vol = 160 <= 200
  assert.equal(deriveScaleClass({ w: 5, d: 5 }, 20), "D"); // vol = 500 <= 600
  assert.equal(deriveScaleClass({ w: 5, d: 5 }, 40), "E"); // vol = 1000 <= 1500
  assert.equal(deriveScaleClass({ w: 8, d: 8 }, 50), "F"); // vol = 3200 > 1500

  assert.equal(deriveRank({ w: 2, d: 2 }, 3, "f1"), "A1");
  assert.equal(deriveRank({ w: 3, d: 3 }, 6, "f2"), "B2");
  assert.equal(deriveRank({ w: 4, d: 4 }, 10, "f3"), "C3");
  assert.equal(deriveRank({ w: 5, d: 5 }, 20, "f4"), "D4");
});

test("every building entry in ASSET_REGISTRY declares all four axes and valid schema", () => {
  const buildings = Object.values(ASSET_REGISTRY).filter((e: any) => e.category === "buildings");
  assert.ok(buildings.length >= 160, "expected at least 160 building models in registry");

  for (const b of buildings as any[]) {
    assert.ok(b.design && typeof b.design === "string", `${b.id} missing design`);
    assert.ok(b.finish && VALID_FINISHES.has(b.finish), `${b.id} invalid finish: ${b.finish}`);
    assert.ok(b.foot && Number.isInteger(b.foot.w) && b.foot.w >= 1 && Number.isInteger(b.foot.d) && b.foot.d >= 1, `${b.id} invalid foot`);
    assert.ok(b.plan && VALID_PLANS.has(b.plan), `${b.id} invalid plan: ${b.plan}`);
    assert.ok(Number.isInteger(b.levels) && b.levels >= 1, `${b.id} invalid levels: ${b.levels}`);
    assert.ok(b.clear && Number.isInteger(b.clear.w) && b.clear.w >= 0 && Number.isInteger(b.clear.d) && b.clear.d >= 0, `${b.id} invalid clear`);
    assert.match(b.rank, /^[A-F][1-4]$/, `${b.id} invalid rank: ${b.rank}`);
  }
});

test("every building model generator in TIER_MODELS builds valid multi-LOD geometry", () => {
  const buildings = Object.values(ASSET_REGISTRY).filter((e: any) => e.category === "buildings");
  let checked = 0;
  for (const b of buildings as any[]) {
    const fn = (TIER_MODELS as any)[b.id];
    assert.ok(typeof fn === "function", `TIER_MODELS missing generator for ${b.id}`);
    const spec = fn();
    assert.ok(spec.lod && spec.lod.length >= 3, `${b.id} must declare at least 3 LODs`);
    
    // Test LOD0
    const lod0 = spec.lod[0].createGeometry(THREE);
    assert.ok(lod0 && lod0.attributes && lod0.attributes.position, `${b.id} LOD0 position attribute missing`);
    assert.ok(lod0.attributes.color, `${b.id} LOD0 color attribute missing`);
    assert.ok(lod0.attributes.normal, `${b.id} LOD0 normal attribute missing`);
    assert.ok(lod0.attributes.uv, `${b.id} LOD0 UV attribute missing`);
    const tris0 = lod0.index ? lod0.index.count / 3 : lod0.attributes.position.count / 3;
    assert.ok(tris0 >= 12, `${b.id} LOD0 tris (${tris0}) too low`);

    // Test LOD1
    const lod1 = spec.lod[1].createGeometry(THREE);
    assert.ok(lod1 && lod1.attributes && lod1.attributes.position, `${b.id} LOD1 position missing`);
    const tris1 = lod1.index ? lod1.index.count / 3 : lod1.attributes.position.count / 3;
    assert.ok(tris1 >= 12, `${b.id} LOD1 tris (${tris1}) too low`);

    // Test LOD2
    const lod2 = spec.lod[2].createGeometry(THREE);
    assert.ok(lod2 && lod2.attributes && lod2.attributes.position, `${b.id} LOD2 position missing`);
    const tris2 = lod2.index ? lod2.index.count / 3 : lod2.attributes.position.count / 3;
    assert.equal(tris2, 12, `${b.id} LOD2 tris must be exactly 12 (bounding box)`);

    checked++;
  }
  assert.ok(checked >= 160, `checked ${checked} building models`);
});
