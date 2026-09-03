import { SHOWSTOPPERS } from "../public/showstoppers.js";
import { assertModelDeclaration } from "../public/props.js";
import * as THREE from "../public/vendor/three/three.module.min.js";

console.log("=== CALIPER SHOWSTOPPER ASSET AUDIT ===");
for (const [id, model] of Object.entries(SHOWSTOPPERS)) {
  assertModelDeclaration(model, THREE);
  console.log(`✔ Verified showstopper: ${id.padEnd(28)} | ${model.footprint.w}x${model.footprint.d}m h=${model.height}m`);
}
console.log("\nALL SHOWSTOPPERS PASSED GEOMETRIC INVARIANT CHECKS!\n");
