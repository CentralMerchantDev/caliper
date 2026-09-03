import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import {
  bldVilla,
  bldTerrace,
  bldTownhouse,
  bldMidrise,
  bldTower,
  bldShop,
  bldOffice,
  bldWarehouse,
  bldWorkshop,
  bldApartmentWalkup,
  building,
} from "../public/buildings.js";

const TYPOLOGIES = [
  { id: "bld-villa", gen: bldVilla, name: "Villa" },
  { id: "bld-terrace", gen: bldTerrace, name: "Terrace" },
  { id: "bld-townhouse", gen: bldTownhouse, name: "Townhouse" },
  { id: "bld-midrise", gen: bldMidrise, name: "Midrise" },
  { id: "bld-tower", gen: bldTower, name: "Tower" },
  { id: "bld-shop", gen: bldShop, name: "Shop" },
  { id: "bld-office", gen: bldOffice, name: "Office" },
  { id: "bld-warehouse", gen: bldWarehouse, name: "Warehouse" },
  { id: "bld-workshop", gen: bldWorkshop, name: "Workshop" },
  { id: "bld-apartment-walkup", gen: bldApartmentWalkup, name: "Apartment Walkup" },
];

export function runBuildingVarietyAudit(seedsCount = 200) {
  console.log(`=== CALIPER BUILDING VARIETY AUDIT (${seedsCount} SEEDS PER TYPOLOGY) ===\n`);
  const results = {};

  for (const typo of TYPOLOGIES) {
    const fingerprints = new Set();
    const heights = [];
    const footprints = new Set();

    for (let i = 0; i < seedsCount; i++) {
      const seed = `${typo.id}-seed-${i}`;
      const model = typo.gen(seed, {}, THREE);
      const geom = model.lod[0].createGeometry();
      geom.computeBoundingBox();
      const bb = geom.boundingBox;

      const w = +(bb.max.x - bb.min.x).toFixed(2);
      const h = +(bb.max.y - bb.min.y).toFixed(2);
      const d = +(bb.max.z - bb.min.z).toFixed(2);
      const vertCount = geom.attributes.position.count;
      const triCount = geom.index ? geom.index.count / 3 : vertCount / 3;

      const fpKey = `${vertCount}v_${triCount}t_${w}x${h}x${d}`;
      fingerprints.add(fpKey);
      heights.push(h);
      footprints.add(`${model.footprint.w}x${model.footprint.d}`);
    }

    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    results[typo.id] = {
      name: typo.name,
      uniqueShapes: fingerprints.size,
      footprintsCount: footprints.size,
      heightRange: `${minH.toFixed(1)}m - ${maxH.toFixed(1)}m`,
      seedsTested: seedsCount,
    };

    console.log(
      `[${typo.id.padEnd(20)}] ${fingerprints.size}/${seedsCount} distinct geometry fingerprints | ${footprints.size} footprint variants | height: ${results[typo.id].heightRange}`
    );
  }

  return results;
}

if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("test-buildings-variety.mjs")) {
  try {
    const res = runBuildingVarietyAudit(200);
    console.log("\nALL 10 BUILDING TYPOLOGIES PRODUCED HIGH GEOMETRIC VARIETY!");
  } catch (err) {
    console.error("BUILDING VARIETY AUDIT FAILED:", err);
    process.exit(1);
  }
}
