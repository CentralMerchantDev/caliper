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
//   2. IT BUILDS INSIDE THE REPO, not into /tmp. Tests that locate the repo
//      root by walking up from import.meta.url -- publicClaims, navPad,
//      threeIsSingle -- cannot find it from /tmp and fail for a reason that has
//      nothing to do with the mutation. The real runner builds into
//      test/.built/, so this does too.
//   3. A RED SUITE IS NOT A CATCH. The failure has to name the expected test.
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

// test/mutations.json is `{ _comment, mutations: [...] }`, not a bare array --
// this read the whole file as the array and threw "muts is not iterable" the
// first time it was pointed at the real manifest rather than an ad-hoc scratch
// list. Accepts both shapes so a genuinely bare array still works.
const specParsed = JSON.parse(readFileSync(specFile, "utf8"));
const allMuts = Array.isArray(specParsed) ? specParsed : specParsed.mutations;
// Scoped to this source file. Without this, every mutation recorded for every
// OTHER file in the manifest reports INCONCLUSIVE against this one (its find
// string matches zero times here, correctly, but noisily) -- and running the
// real edit through NO filter at all one time did exactly that across 30-plus
// unrelated entries before the actual result could be read.
const muts = allMuts.filter((m) => !m.file || m.file === sourceFile);
const original = readFileSync(sourceFile, "utf8");

function run() {
  // shell: true -- on Windows, npx is npx.cmd, and execFileSync cannot launch
  // a .cmd directly (CreateProcess needs a real executable). `which npx` in a
  // POSIX shell finds it because the shell does its own PATH resolution; Node
  // asking Windows to run it directly does not, and fails ENOENT with no
  // mutation ever attempted -- silently zero, not a mutation-testing error.
  execFileSync("npx", [
    "esbuild", testFile, "--outfile=test/.built/_mutcheck.scratch.mjs", "--bundle",
    "--platform=node", "--format=esm", "--target=node22", "--packages=external", "--log-level=error",
  ], { encoding: "utf8", shell: true });
  try {
    execFileSync("node", ["test/.built/_mutcheck.scratch.mjs"], { encoding: "utf8" });
    return { ok: true, failed: [] };
  } catch (e) {
    const out = String(e.stdout || "");
    // Node's built-in test runner's default ("spec") reporter prints
    // "✖ name (12.3ms)", not TAP's "not ok N - name" -- the old regex
    // never matched it, so every genuinely red run reported CAUGHT/SURVIVED
    // against an EMPTY failed-test list and printed "red, but not on ...: "
    // with nothing after the colon. That is INCONCLUSIVE dressed as a result:
    // the run really was red, but which test failed was never actually read.
    const failed = [...out.matchAll(/^✖ (.+?) \([\d.]+m?s\)$/gm)].map((m) => m[1]);
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
