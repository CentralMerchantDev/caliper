// One-off probe for the b1-board takedown, 2026-09-13. Mark's ruling:
// "the b1-board board code is not a foundation... it comes out." Reuses
// scripts/lib/module-graph.mjs, the same tool the prior takedown used, so
// this inventory is built the same way the codebase already measures
// reachability, not a second, less-trustworthy parser.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

const importedBy = new Map(files.map((f) => [f.path, new Set()]));
for (const [from, deps] of forwardDeps) {
  for (const dep of deps) importedBy.get(dep)?.add(from);
}

const NAMED = ["board-render.js", "board-generator.js", "board-load.js", "bridge-generator.js", "board.js"].map((n) =>
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

console.log("=== NAMED FILES ===");
for (const p of NAMED) show(p);

// Every dynamic import() edge anywhere, so nothing is missed the way the
// prior takedown's first pass missed one.
console.log("\n=== DYNAMIC import() SCAN, all of public/*.js and public/*.html ===");
for (const f of files) {
  if (!f.path.startsWith(publicDir)) continue;
  const re = /\bimport\(\s*["'`]([^"'`]+)["'`]/g;
  for (const m of f.source.matchAll(re)) {
    console.log(`  ${displayPath(repoRoot, f.path)} -> ${m[1]}`);
  }
}

// Reverse-transitive closure: everything that depends (directly or
// transitively) on any NAMED file, so quarantine order and "serves only"
// candidates can be judged correctly.
console.log("\n=== FILES THAT TRANSITIVELY DEPEND ON A NAMED FILE ===");
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
for (const p of NAMED) {
  const deps = transitiveDependents(p);
  console.log(`\n  depends (transitively) on ${displayPath(repoRoot, p)}: ${deps.size} files`);
  for (const d of [...deps].sort()) {
    console.log(`    - ${displayPath(repoRoot, d)}  [product:${productReachable.has(d)} demo:${demoReachable.has(d)}]`);
  }
}

// What each NAMED file itself imports (forward), so "innermost first" order
// can be judged.
console.log("\n=== WHAT EACH NAMED FILE ITSELF IMPORTS ===");
for (const p of NAMED) {
  const deps = [...(forwardDeps.get(p) || [])];
  console.log(`\n  ${displayPath(repoRoot, p)} imports (${deps.length}):`);
  for (const d of deps.sort()) console.log(`    - ${displayPath(repoRoot, d)}`);
}

// Which test files import a NAMED file directly.
console.log("\n=== TEST FILES DIRECTLY IMPORTING A NAMED FILE ===");
for (const p of NAMED) {
  const importers = [...(importedBy.get(p) || [])].filter((x) => /[\\/]test[\\/]/.test(x));
  console.log(`\n  ${displayPath(repoRoot, p)}: ${importers.length} direct test importers`);
  for (const i of importers.sort()) console.log(`    - ${displayPath(repoRoot, i)}`);
}

// board.generated.json is data, not a module -- find every file/script that
// reads it by literal path string (fetch, readFileSync, import assertion).
console.log("\n=== REFERENCES TO board.generated.json (literal string scan) ===");
for (const dir of ["public", "src", "scripts", "test"]) {
  const full = resolve(repoRoot, dir);
  if (!existsSync(full)) continue;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = resolve(d, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", "vendor", ".built"].includes(entry.name)) continue;
        walk(p);
      } else if (/\.(js|ts|mjs|html|jsonc?)$/.test(entry.name)) {
        const src = readFileSync(p, "utf8");
        if (src.includes("board.generated.json")) console.log(`  ${displayPath(repoRoot, p)}`);
      }
    }
  };
  walk(full);
}
