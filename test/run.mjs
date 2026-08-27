// No test framework existed before this project's tests did. Node's
// built-in node:test/node:assert avoids adding one, but Node's native
// TypeScript support (type-stripping) can't load this codebase directly --
// it rejects TS parameter properties (used by src/controlLayer.ts's error
// classes) as "not supported in strip-only mode". esbuild (already present
// via wrangler's own dependency tree, pinned directly in package.json here)
// bundles the real source files -- not a reimplementation of their logic --
// into plain JS that plain node can run.
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { mkdirSync, readdirSync } from "node:fs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(testDir, ".built");
mkdirSync(outDir, { recursive: true });

const testFiles = readdirSync(testDir).filter((f) => f.endsWith(".test.ts"));

for (const file of testFiles) {
  const outfile = path.join(outDir, file.replace(/\.ts$/, ".mjs"));
  await build({
    entryPoints: [path.join(testDir, file)],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    packages: "external", // real npm deps (openai, @anthropic-ai/sdk) stay external; only relative src/ imports get bundled
    logLevel: "warning",
  });
  // node:test auto-runs registered tests to completion and sets the process
  // exit code on failure even when imported as a plain module, not just
  // under `node --test` -- no separate test-runner invocation needed.
  await import(pathToFileURL(outfile).href);
}
