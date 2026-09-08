import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { ASSET_REGISTRY } from "../public/asset-registry.js";
import { KITBASH_PARTS } from "../public/kitbash-parts.js";
import { DESIGN_RECIPE_MAP } from "../public/kitbash-recipe-map.js";

test("A4.1 & A4.2: All 40 canonical library designs map to valid kit recipes with rarity policies", () => {
  // Extract all unique building designs from ASSET_REGISTRY
  const expectedDesigns = new Set();
  for (const [key, entry] of Object.entries(ASSET_REGISTRY)) {
    if (entry.category === "buildings" && entry.design) {
      expectedDesigns.add(entry.design);
    }
  }

  assert.equal(expectedDesigns.size, 40, "ASSET_REGISTRY must have exactly 40 building designs");
  assert.equal(Object.keys(DESIGN_RECIPE_MAP).length, 40, "DESIGN_RECIPE_MAP must have 40 entries");

  const rarityCounts = { landmark: 0, standard: 0, fabric: 0 };
  const lod0TrianglesByDesign = new Map<string, number>();

  console.log("\n| Design | Rarity | Category | Foot (WxD) | Recipe Parts | LOD0 Tris | LOD2 Tris |");
  console.log("|---|---|---|---|---|---|---|");

  for (const design of expectedDesigns) {
    const mapEntry = DESIGN_RECIPE_MAP[design];
    assert.ok(mapEntry, `Design '${design}' must exist in DESIGN_RECIPE_MAP`);

    rarityCounts[mapEntry.rarity] = (rarityCounts[mapEntry.rarity] || 0) + 1;

    // Validate recipe parts exist in KITBASH_PARTS
    assert.ok(Array.isArray(mapEntry.recipe) && mapEntry.recipe.length > 0, `${design}: recipe must be non-empty array`);
    let lod0Tris = 0;
    let lod2Tris = 0;

    for (const partId of mapEntry.recipe) {
      const part = KITBASH_PARTS[partId];
      assert.ok(part, `${design}: part '${partId}' must exist in KITBASH_PARTS`);

      const g0 = part.buildGeometry(THREE, {}, 0);
      for (const p of g0) {
        lod0Tris += p.geo.index ? p.geo.index.count / 3 : p.geo.attributes.position.count / 3;
      }
      const g2 = part.buildGeometry(THREE, {}, 2);
      for (const p of g2) {
        lod2Tris += p.geo.index ? p.geo.index.count / 3 : p.geo.attributes.position.count / 3;
      }
    }

    assert.ok(lod0Tris > 0, `${design}: LOD0 triangles must be positive`);
    assert.ok(lod2Tris > 0, `${design}: LOD2 triangles must be positive`);
    lod0TrianglesByDesign.set(design, lod0Tris);

    console.log(`| ${design} | ${mapEntry.rarity} | ${mapEntry.category} | ${mapEntry.foot.w}x${mapEntry.foot.d} | ${mapEntry.recipe.length} parts | ${lod0Tris} | ${lod2Tris} |`);
  }

  console.log("\n=== A4.2 RARITY DISTRIBUTION ACROSS 40 DESIGNS ===");
  console.log(`Landmarks (Sculptural/Twisted): ${rarityCounts.landmark} / 40 (${((rarityCounts.landmark / 40) * 100).toFixed(1)}%)`);
  console.log(`Standard  (Structured Office):   ${rarityCounts.standard} / 40 (${((rarityCounts.standard / 40) * 100).toFixed(1)}%)`);
  console.log(`Fabric    (Plain Urban Mass):    ${rarityCounts.fabric} / 40 (${((rarityCounts.fabric / 40) * 100).toFixed(1)}%)`);

  assert.deepEqual(rarityCounts, { landmark: 14, standard: 10, fabric: 16 },
    "The 35% landmark, 25% standard, and 40% fabric catalogue distribution must not move");
  assert.deepEqual(
    {
      artDeco: lod0TrianglesByDesign.get("art-deco-skyscraper"),
      diagrid: lod0TrianglesByDesign.get("diagrid-tower"),
      hyperboloid: lod0TrianglesByDesign.get("hyperboloid-hq"),
    },
    { artDeco: 900, diagrid: 732, hyperboloid: 1_068 },
    "The three established landmark geometries must remain unchanged"
  );
});
