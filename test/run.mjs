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

const testFiles = readdirSync(testDir).filter((f) => f.endsWith(".test.ts") && !f.endsWith(".workers.test.ts"));

// BUILD EVERYTHING FIRST, AND FAIL LOUDLY IF ANYTHING WILL NOT BUILD.
//
// This used to build and import each file in turn inside one loop. When a build
// failed -- a typo in an import, say -- the loop aborted, every file after it
// was never loaded, and the files loaded BEFORE it had already registered their
// tests. So the run reported "# pass 10, # fail 0" while most of the suite had
// silently vanished. Green, and meaningless.
//
// That is precisely the failure this project exists to argue against, sitting in
// its own harness. Two changes: build every file up front so one bad file cannot
// hide the rest, and state the file count so a silent drop is visible even to
// someone skimming the tail of the output.
const built = [];
let buildFailed = false;

for (const file of testFiles) {
  const outfile = path.join(outDir, file.replace(/\.ts$/, ".mjs"));
  try {
    await build({
      entryPoints: [path.join(testDir, file)],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      packages: "external", // real npm deps stay external; only relative src/ imports get bundled
      logLevel: "warning",
    });
    built.push(outfile);
  } catch (err) {
    buildFailed = true;
    console.error(`\n### BUILD FAILED: ${file}`);
    console.error(String(err && err.message ? err.message : err));
  }
}

if (buildFailed) {
  console.error(`\n### ${testFiles.length - built.length} of ${testFiles.length} test files did not build.`);
  console.error("### Refusing to report a result for a suite that did not run.");
  process.exit(1);
}

console.log(`# test files: ${built.length}`);

// node:test auto-runs registered tests to completion and sets the process exit
// code on failure even when imported as a plain module, not just under
// `node --test` -- no separate test-runner invocation needed.
for (const outfile of built) {
  await import(pathToFileURL(outfile).href);
}
