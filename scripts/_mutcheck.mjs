// A scratch mutation runner for one test file, used while developing a control.
//
// `scripts/mutate.mjs` is the real one and runs the WHOLE suite per mutation,
// which is right for a permanent record and too slow for a tight loop. This
// rebuilds and runs a single test file instead.
//
// It repeats mutate.mjs's two hard-won rules, because both were re-learned the
// expensive way while writing the layout engine:
//
//   1. REBUILD BETWEEN MUTATIONS. esbuild inlines the source into the bundle, so
//      a bundle built before the edit runs the ORIGINAL code and every mutation
//      reports SURVIVED.
//   2. A RED SUITE IS NOT A CATCH. The failure has to name the expected test.
//      A crash -- a missing bundle, a syntax error -- turns everything red and
//      would otherwise score as proof that the control works.
//
// Usage: node scripts/_mutcheck.mjs <testFile> <sourceFile> <mutations.json>

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [testFile, sourceFile, specFile] = process.argv.slice(2);
if (!testFile || !sourceFile || !specFile) {
  console.error("usage: node scripts/_mutcheck.mjs <testFile> <sourceFile> <mutations.json>");
  process.exit(2);
}

const muts = JSON.parse(readFileSync(specFile, "utf8"));
const original = readFileSync(sourceFile, "utf8");

function run() {
  execFileSync("npx", [
    "esbuild", testFile, "--outfile=/tmp/_mutcheck.mjs", "--bundle",
    "--platform=node", "--format=esm", "--target=node22", "--packages=external", "--log-level=error",
  ], { encoding: "utf8" });
  try {
    execFileSync("node", ["/tmp/_mutcheck.mjs"], { encoding: "utf8" });
    return { ok: true, failed: [] };
  } catch (e) {
    const out = String(e.stdout || "");
    const failed = (out.match(/^not ok \d+ - (.*)$/gm) || []).map((s) => s.replace(/^not ok \d+ - /, ""));
    return { ok: false, failed };
  }
}

try {
  const base = run();
  console.log(`baseline: ${base.ok ? "GREEN" : "RED"}`);
  if (!base.ok) {
    console.error("refusing to score mutations against a red baseline:\n  " + base.failed.join("\n  "));
    process.exit(1);
  }

  for (const m of muts) {
    const hits = original.split(m.find).length - 1;
    if (hits !== 1) {
      console.log(`INCONCLUSIVE  ${m.id}  (find matched ${hits} times, must be exactly 1)`);
      continue;
    }
    writeFileSync(sourceFile, original.replace(m.find, m.replace));
    if (readFileSync(sourceFile, "utf8") === original) {
      console.log(`INCONCLUSIVE  ${m.id}  (the edit did not change the file)`);
      continue;
    }
    const r = run();
    const named = r.failed.some((n) => n.includes(m.expect));
    console.log(`${(!r.ok && named ? "CAUGHT" : !r.ok ? "INCONCLUSIVE" : "SURVIVED").padEnd(12)}  ${m.id}`);
    if (!r.ok && !named) console.log(`              red, but not on "${m.expect}": ${r.failed.join(" | ")}`);
    writeFileSync(sourceFile, original);
  }
} finally {
  writeFileSync(sourceFile, original);
  console.log(`\nrestored: ${readFileSync(sourceFile, "utf8") === original ? "byte identical" : "MISMATCH"}`);
}
