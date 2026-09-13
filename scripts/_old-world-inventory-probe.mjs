// One-off probe for Phase 1 item 1's site inventory. Not committed as a
// permanent script -- reuses scripts/lib/module-graph.mjs's existing forward
// graph and reachability primitives (same tool test/deadExports.test.ts and
// scripts/gen-module-map.mjs already trust) rather than a hand-rolled grep,
// so the inventory is built the same way the codebase already measures
// reachability, not a second, less-trustworthy parser.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadModuleFiles,
  buildForwardDependencyGraph,
  declareEntryPoints,
  reachableFilesFrom,
  displayPath,
} from "./lib/module-graph.mjs";

const repoRoot = resolve(process.cwd());
const publicDir = resolve(repoRoot, "public");
const srcDir = resolve(repoRoot, "src");
const testDir = resolve(repoRoot, "test");
const wranglerText = readFileSync(resolve(repoRoot, "wrangler.jsonc"), "utf8");

const files = loadModuleFiles({ publicDir, srcDir, testDir });
const forwardDeps = buildForwardDependencyGraph(files);
const { product, demo, test } = declareEntryPoints({ files, repoRoot, wranglerText });

const productReachable = reachableFilesFrom(product, forwardDeps);
const demoReachable = reachableFilesFrom(demo, forwardDeps);

// Reverse adjacency: who directly imports each file.
const importedBy = new Map(files.map((f) => [f.path, new Set()]));
for (const [from, deps] of forwardDeps) {
  for (const dep of deps) importedBy.get(dep)?.add(from);
}

const CANDIDATES = ["layout.js", "instance-groups.js", "road-network.js", "city-plan.js", "city-render.js"].map((n) =>
  resolve(publicDir, n)
);

function show(path) {
  const inProduct = productReachable.has(path);
  const inDemo = demoReachable.has(path);
  const direct = [...(importedBy.get(path) || [])];
  console.log(`\n${displayPath(repoRoot, path)}`);
  console.log(`  product-reachable: ${inProduct}  demo-reachable: ${inDemo}`);
  console.log(`  direct importers (${direct.length}):`);
  for (const d of direct.sort()) console.log(`    - ${displayPath(repoRoot, d)}`);
}

console.log("=== PRODUCT ENTRY POINTS ===");
for (const p of product) console.log("  " + displayPath(repoRoot, p));

console.log("\n=== CANDIDATE FILES ===");
for (const c of CANDIDATES) show(c);

// What in public/ is reachable from product AND transitively depends on at
// least one candidate -- i.e. the live rendering path that the "goes" list
// would break, so quarantine order can be judged correctly.
console.log("\n=== FILES THAT TRANSITIVELY DEPEND ON A CANDIDATE (any reachability) ===");
function transitiveDependents(target) {
  const dependents = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [from, deps] of forwardDeps) {
      if (dependents.has(from)) continue;
      if ([...deps].some((d) => d === target || dependents.has(d))) {
        dependents.add(from);
        changed = true;
      }
    }
  }
  return dependents;
}
for (const c of CANDIDATES) {
  const deps = transitiveDependents(c);
  console.log(`\n  depends (transitively) on ${displayPath(repoRoot, c)}: ${deps.size} files`);
  for (const d of [...deps].sort()) {
    console.log(`    - ${displayPath(repoRoot, d)}  [product:${productReachable.has(d)} demo:${demoReachable.has(d)}]`);
  }
}

// Test files that import a candidate directly.
console.log("\n=== TEST FILES DIRECTLY IMPORTING A CANDIDATE ===");
for (const c of CANDIDATES) {
  const importers = [...(importedBy.get(c) || [])].filter((p) => /[\\/]test[\\/]/.test(p));
  console.log(`\n  ${displayPath(repoRoot, c)}: ${importers.length} direct test importers`);
  for (const i of importers.sort()) console.log(`    - ${displayPath(repoRoot, i)}`);
}

console.log("\n=== EXTENDED: direct importers of files entangled with city-plan.js ===");
for (const name of ["buildings.js", "terrain.js", "board-adapter.js", "world-render-3d.js", "layout-fits.js", "props.js", "prop-models.js", "world.js", "grid.js", "board.js", "board-render.js", "board-load.js", "move-piece.js"]) {
  const p = resolve(publicDir, name);
  const direct = [...(importedBy.get(p) || [])];
  console.log(`\n  ${name} (product:${productReachable.has(p)} demo:${demoReachable.has(p)}) -- direct importers (${direct.length}):`);
  for (const d of direct.sort()) console.log(`    - ${displayPath(repoRoot, d)}`);
}

console.log("\n=== MODEL/KITBASH CLUSTER + TERRAIN-GEN SUPPORT: direct importers ===");
for (const name of ["model-registry.js","model-forge.js","kitbash-assembler.js","kitbash-parts.js","kitbash-recipe-map.js","kitbash-exemplar.js","tier-models.js","resolve-models.js","roadkit.js","roadkit-street-demo.js","facade-textures.js","asset-registry.js","typology-footprints.js","showstoppers.js","grade.js","zoning.js","land-use.js","features.js","noise.js","waterways.js","settlement-fit.js","footprint.js","spatial-index.js"]) {
  const p = resolve(publicDir, name);
  const direct = [...(importedBy.get(p) || [])];
  console.log(`\n  ${name} (product:${productReachable.has(p)} demo:${demoReachable.has(p)}) -- direct importers (${direct.length}):`);
  for (const d of direct.sort()) console.log(`    - ${displayPath(repoRoot, d)}`);
}
