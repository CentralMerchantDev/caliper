// PLAN.md §6.5 ("two known defects, both CLI's", defect 1): "It cannot load
// in a browser. catalogue-registry.js transitively imports
// scripts/migrate-catalogue-s2-fields.mjs, a Node script that reads the
// filesystem." Fixed by extracting the pure formulas into
// public/catalogue-formulas.js, which imports nothing.
//
// A plain `import()` under Node proves nothing here -- Node has node:fs, so
// the coupling this defect names would load there even unfixed. The real
// test is esbuild with `platform: "browser"`: browser platform does not
// shim node:* built-ins the way `platform: "node"` (test/run.mjs's own
// build) does, so bundling fails outright if the import graph reaches one.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { build } from "esbuild";

const PUBLIC_DIR = path.join(process.cwd(), "public");

test("GATE (PLAN.md §6.5 defect 1): public/catalogue-registry.js bundles for platform:\"browser\" with no node:* built-in in its import graph", async () => {
  const result = await build({
    entryPoints: [path.join(PUBLIC_DIR, "catalogue-registry.js")],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  assert.equal(result.errors.length, 0, `expected a clean browser bundle, got: ${JSON.stringify(result.errors)}`);
  const code = result.outputFiles[0].text;
  assert.ok(!/require\(["']fs["']\)|require\(["']path["']\)|require\(["']url["']\)/.test(code), "bundle references a node:* built-in that platform:\"browser\" should have refused to resolve");
});

test("GATE (PLAN.md §6.5 defect 1): public/catalogue-formulas.js itself has zero imports -- the formulas are the leaf, not just transitively clean today", async () => {
  const result = await build({
    entryPoints: [path.join(PUBLIC_DIR, "catalogue-formulas.js")],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  assert.equal(result.errors.length, 0, `expected a clean browser bundle, got: ${JSON.stringify(result.errors)}`);
});
