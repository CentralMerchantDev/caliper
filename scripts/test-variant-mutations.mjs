import assert from "node:assert/strict";
import { runVariantCoverageSuite } from "./variant-coverage.mjs";

console.log("=== CALIPER VARIANT COVERAGE MUTATION AUDIT ===");

// 1. Mutation A: tree("conifer", "ancient") returns the sapling
console.log("\n[Mutation A] tree('conifer', 'ancient') returns sapling:");
try {
  runVariantCoverageSuite({ mutations: { treeConiferAncientReturnsSapling: true } });
  console.error("  FAILED: Mutation A survived (did not go red)!");
} catch (err) {
  console.log("  RED AS EXPECTED -> Caught:", err.message);
}

// 2. Mutation B: person("tall", ...) returns adult unchanged
console.log("\n[Mutation B] person('tall', ...) returns adult unchanged:");
try {
  runVariantCoverageSuite({ mutations: { personTallReturnsAdult: true } });
  console.error("  FAILED: Mutation B survived (did not go red)!");
} catch (err) {
  console.log("  RED AS EXPECTED -> Caught:", err.message);
}

// 3. Mutation C: vehicle("taxi", ...) returns sedan
console.log("\n[Mutation C] vehicle('taxi', ...) returns sedan:");
try {
  runVariantCoverageSuite({ mutations: { vehicleTaxiReturnsSedan: true } });
  console.error("  FAILED: Mutation C survived (did not go red)!");
} catch (err) {
  console.log("  RED AS EXPECTED -> Caught:", err.message);
}

// 4. Mutation D: compare ONLY vertex counts, not bounding boxes
console.log("\n[Mutation D] Compare ONLY vertex counts (no bounding boxes):");
try {
  runVariantCoverageSuite({ compareMode: "vertices-only" });
  console.log("  SURVIVED: Comparing only vertex counts did NOT find any collision (all variants happened to have distinct vertex counts).");
} catch (err) {
  console.log("  COLLISION DETECTED (Different geometries sharing identical vertex count):", err.message);
}
