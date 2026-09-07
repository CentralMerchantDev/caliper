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

const discoveredTestFiles = readdirSync(testDir).filter((f) => f.endsWith(".test.ts") && !f.endsWith(".workers.test.ts"));
const requestedFiles = process.argv.slice(2);
const testFiles = requestedFiles.length === 0
  ? discoveredTestFiles
  : requestedFiles.map((requested) => {
      const file = path.basename(requested);
      if (requested !== file && path.resolve(requested) !== path.join(testDir, file)) {
        throw new Error(`Requested test must be a file in ${testDir}: ${requested}`);
      }
      if (!discoveredTestFiles.includes(file)) {
        throw new Error(`Requested test is not a runnable .test.ts file: ${requested}`);
      }
      return file;
    });

// ONE THREE.JS IN THE PROCESS, NOT ONE PER BUNDLE.
//
// Each test file is bundled on its own and then all of them are imported into
// this single process. An `alias` alone is not enough: it makes both spellings
// of the import agree WITHIN a bundle, but three.js is then inlined into every
// bundle that uses it, and five bundles means five copies live at once. The
// library says so itself -- "THREE.WARNING: Multiple instances of Three.js
// being imported" -- and the consequence is that classes differ between copies,
// so `instanceof` across a bundle boundary is false for reasons unrelated to
// the code under test.
//
// So three is resolved to one relative specifier and marked external. esbuild
// leaves the import alone, node loads the file once, and node's module cache
// hands every bundle the same instance. The specifier is relative because an
// absolute Windows path is not a legal ESM import specifier; test/.built/ is a
// fixed directory, so the relative path is stable.
const THREE_FROM_BUILT = "../../public/vendor/three/three.module.min.js";
const singleThree = {
  name: "single-three",
  setup(b) {
    b.onResolve({ filter: /(^three$)|(vendor[/\\]three[/\\]three\.module\.min\.js$)/ }, () => ({
      path: THREE_FROM_BUILT,
      external: true,
    }));
  },
};

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
      plugins: [singleThree],
      alias: {
        // THE TESTS MUST LOAD THE SAME THREE THE PAGE LOADS.
        //
        // index.html declares an importmap: "three" -> ./vendor/three/three.module.min.js.
        // So in a browser there is exactly one copy of the library, however a file
        // spells the import. Node has no importmap, so bare "three" resolves to
        // node_modules/three (a different build, 650 KB unminified vs the 365 KB
        // vendored one) while "./vendor/three/..." resolves to the shipped file.
        //
        // The suite mixed both spellings -- public/props.js and world-render-3d.js
        // use bare "three", public/buildings.js and showstoppers.js use the vendored
        // path -- so a single run held TWO copies of three.js. That is not cosmetic:
        // classes are per-copy, so `mesh instanceof THREE.Mesh` is false whenever the
        // mesh was built by the other copy, and any such check passes or fails for
        // reasons that have nothing to do with the code under test. It announced
        // itself only as "THREE.WARNING: Multiple instances of Three.js being
        // imported", which is easy to read as noise.
        //
        // Aliasing to the vendored file makes both spellings resolve to one absolute
        // path, which esbuild then bundles once -- and, more to the point, makes the
        // tests exercise the file that actually ships rather than a devDependency
        // that never reaches a user.
        three: path.join(testDir, "..", "public", "vendor", "three", "three.module.min.js"),
      },
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
