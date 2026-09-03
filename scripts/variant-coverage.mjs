import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import {
  tree,
  person,
  vehicle,
  vessel,
  aircraft,
  roofClutter,
  streetFurniture,
  facade,
  boundary,
  groundFurniture,
  MODELS,
} from "../public/props.js";

/**
 * Geometric fingerprint of an instantiated Three.js BufferGeometry at LOD0
 */
export function getGeometryFingerprint(geom, mode = "all") {
  assert.ok(geom, "Geometry must exist");
  assert.ok(geom.attributes && geom.attributes.position, "Geometry must have position attribute");
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  const vertexCount = geom.attributes.position.count;
  const triangleCount = geom.index ? geom.index.count / 3 : vertexCount / 3;
  const w = +(bb.max.x - bb.min.x).toFixed(3);
  const h = +(bb.max.y - bb.min.y).toFixed(3);
  const d = +(bb.max.z - bb.min.z).toFixed(3);

  return {
    vertexCount,
    triangleCount,
    bbox: [w, h, d],
    mode,
  };
}

/**
 * Asserts all variants in a collection produce distinct geometry fingerprints
 */
export function assertDistinctGeometries(variants, familyName, compareMode = "all") {
  const fingerprints = new Map();
  for (const v of variants) {
    const fp = getGeometryFingerprint(v.geom, compareMode);
    for (const [otherKey, otherFp] of fingerprints.entries()) {
      let isIdentical = false;
      if (compareMode === "vertices-only") {
        // Mutation control (d): compare ONLY vertex counts
        isIdentical = fp.vertexCount === otherFp.vertexCount;
      } else {
        // Full fingerprint: vertex count, triangle count, and bbox [w, h, d] to 3 decimals
        isIdentical =
          fp.vertexCount === otherFp.vertexCount &&
          fp.triangleCount === otherFp.triangleCount &&
          Math.abs(fp.bbox[0] - otherFp.bbox[0]) < 1e-3 &&
          Math.abs(fp.bbox[1] - otherFp.bbox[1]) < 1e-3 &&
          Math.abs(fp.bbox[2] - otherFp.bbox[2]) < 1e-3;
      }

      if (isIdentical) {
        throw new Error(
          `[${familyName}] Duplicate geometry found between variants '${v.key}' and '${otherKey}': vertCount=${fp.vertexCount}, bbox=[${fp.bbox.join(", ")}]`
        );
      }
    }
    fingerprints.set(v.key, fp);
  }
  return variants.length;
}

export function runVariantCoverageSuite(options = {}) {
  const { compareMode = "all", mutations = {} } = options;
  const results = {};
  let totalVariants = 0;

  // 1. roofClutter: 6 kinds x 3 sizes = 18 variants
  {
    const kinds = ["plant", "chimney", "aerial", "dish", "solar", "ac"];
    const sizes = ["small", "medium", "large"];
    const variants = [];
    for (const k of kinds) {
      for (const s of sizes) {
        const m = roofClutter(k, s);
        variants.push({ key: `${k}-${s}`, geom: m.lod[0].createGeometry(THREE) });
      }
    }
    results.roofClutter = assertDistinctGeometries(variants, "roofClutter", compareMode);
    totalVariants += results.roofClutter;
  }

  // 2. streetFurniture: all declared variants across all kinds = 25 variants
  {
    const variants = [];
    for (const [kind, varList] of Object.entries(streetFurniture.variants)) {
      for (const v of varList) {
        const m = streetFurniture(kind, v);
        variants.push({ key: `${kind}-${v}`, geom: m.lod[0].createGeometry(THREE) });
      }
    }
    results.streetFurniture = assertDistinctGeometries(variants, "streetFurniture", compareMode);
    totalVariants += results.streetFurniture;
  }

  // 3. facade: 4 kinds x 3 widths = 12 variants
  {
    const kinds = ["awning", "shopfront", "shutters", "balcony"];
    const widths = [2.4, 3.6, 4.8];
    const variants = [];
    for (const k of kinds) {
      for (const w of widths) {
        const m = facade(k, w);
        variants.push({ key: `${k}-${w}`, geom: m.lod[0].createGeometry(THREE) });
      }
    }
    results.facade = assertDistinctGeometries(variants, "facade", compareMode);
    totalVariants += results.facade;
  }

  // 4. boundary: 5 kinds x 3 lengths = 15 variants
  {
    const kinds = ["fence-iron", "fence-picket", "gate-iron", "hedge", "wall-garden"];
    const lengths = [1.2, 2.4, 4.8];
    const variants = [];
    for (const k of kinds) {
      for (const l of lengths) {
        const m = boundary(k, l);
        variants.push({ key: `${k}-${l}`, geom: m.lod[0].createGeometry(THREE) });
      }
    }
    results.boundary = assertDistinctGeometries(variants, "boundary", compareMode);
    totalVariants += results.boundary;
  }

  // 5. groundFurniture: 3 kinds = 3 variants
  {
    const kinds = ["manhole", "grate", "tactile"];
    const variants = [];
    for (const k of kinds) {
      const m = groundFurniture(k);
      variants.push({ key: k, geom: m.lod[0].createGeometry(THREE) });
    }
    results.groundFurniture = assertDistinctGeometries(variants, "groundFurniture", compareMode);
    totalVariants += results.groundFurniture;
  }

  // 6. tree: 5 species x 3 ages = 15 variants
  {
    const species = ["broadleaf", "conifer", "palm", "cypress", "bush-flowering"];
    const ages = ["sapling", "mature", "ancient"];
    const variants = [];
    for (const sp of species) {
      for (const age of ages) {
        let m;
        if (mutations.treeConiferAncientReturnsSapling && sp === "conifer" && age === "ancient") {
          m = tree("conifer", "sapling");
        } else {
          m = tree(sp, age);
        }
        variants.push({ key: `${sp}-${age}`, geom: m.lod[0].createGeometry(THREE) });
      }
    }
    results.tree = assertDistinctGeometries(variants, "tree", compareMode);
    totalVariants += results.tree;
  }

  // 7. person: 3 builds x 3 poses = 9 variants
  {
    const builds = ["adult", "child", "tall"];
    const poses = ["standing", "sitting", "walking"];
    const variants = [];
    for (const b of builds) {
      for (const p of poses) {
        let m;
        if (mutations.personTallReturnsAdult && b === "tall") {
          m = person("adult", p, "casual");
        } else {
          m = person(b, p, "casual");
        }
        variants.push({ key: `${b}-${p}`, geom: m.lod[0].createGeometry(THREE) });
      }
    }
    results.person = assertDistinctGeometries(variants, "person", compareMode);
    totalVariants += results.person;
  }

  // 8. vehicle: 9 classes = 9 variants
  {
    const classes = ["car", "van", "bus", "truck", "artic", "taxi", "emergency", "bicycle", "motorcycle"];
    const variants = [];
    for (const c of classes) {
      let m;
      if (mutations.vehicleTaxiReturnsSedan && c === "taxi") {
        m = vehicle("car", "sedan");
      } else {
        m = vehicle(c);
      }
      variants.push({ key: c, geom: m.lod[0].createGeometry(THREE) });
    }
    results.vehicle = assertDistinctGeometries(variants, "vehicle", compareMode);
    totalVariants += results.vehicle;
  }

  // 9. vessel: 6 classes = 6 variants
  {
    const classes = ["rowboat", "sailboat", "yacht", "ferry", "container-ship", "tug"];
    const variants = [];
    for (const c of classes) {
      const m = vessel(c);
      variants.push({ key: c, geom: m.lod[0].createGeometry(THREE) });
    }
    results.vessel = assertDistinctGeometries(variants, "vessel", compareMode);
    totalVariants += results.vessel;
  }

  // 10. aircraft: 4 classes = 4 variants
  {
    const classes = ["light-single", "airliner-twin", "regional-jet", "helicopter"];
    const variants = [];
    for (const c of classes) {
      const m = aircraft(c);
      variants.push({ key: c, geom: m.lod[0].createGeometry(THREE) });
    }
    results.aircraft = assertDistinctGeometries(variants, "aircraft", compareMode);
    totalVariants += results.aircraft;
  }

  return { results, totalVariants };
}

// Self-test execution when invoked from CLI
if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("variant-coverage.mjs")) {
  console.log("=== CALIPER VARIANT COVERAGE TEST SUITE ===");
  try {
    const { results, totalVariants } = runVariantCoverageSuite();
    for (const [family, count] of Object.entries(results)) {
      console.log(`  - ${family.padEnd(16)}: ${count} distinct variants verified`);
    }
    console.log(`TOTAL VERIFIED GENERATOR VARIANTS: ${totalVariants}`);
    console.log("ALL GENERATOR VARIANTS PROVEN GEOMETRICALLY DISTINCT AND UNIQUE!");
  } catch (err) {
    console.error("VARIANT COVERAGE FAILED:", err.message);
    process.exit(1);
  }
}
