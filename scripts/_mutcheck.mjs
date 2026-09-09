// A scratch mutation runner for one test file, used while developing a control.
//
// `scripts/mutate.mjs` is the real one and runs the WHOLE suite per mutation,
// which is right for a permanent record and too slow for a tight loop. This
// rebuilds and runs a single test file instead.
//
// It repeats mutate.mjs's hard-won rules, because all were re-learned the
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
//   4. TAKE THE LOCK. PART 7b/E1 (docs/WORLD-BUILD-PLAN.md): two of THIS
//      script's own invocations, run concurrently against the same source
//      file, raced -- one read the other's in-flight mutation as a red
//      baseline. Nothing was lost that time (confirmed by diff afterward),
//      but nothing prevented it either. Now this and mutate.mjs share one
//      lock (scripts/mutate-lock.mjs); a second run against a file the first
//      still holds refuses outright rather than measuring anything.
//
// Usage: node scripts/_mutcheck.mjs <testFile> <sourceFile> <mutations.json>

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { acquireLock, releaseLock, sha } from "./mutate-lock.mjs";
import { unexpectedFailures } from "./expected-red.mjs";

const [testFile, sourceFile, specFile] = process.argv.slice(2);
if (!testFile || !sourceFile || !specFile) {
  console.error("usage: node scripts/_mutcheck.mjs <testFile> <sourceFile> <mutations.json>");
  process.exit(2);
}
// Resolved, not the raw argv spelling -- so this coordinates with mutate.mjs
// (and with a second _mutcheck.mjs invocation using a different relative
// path to the same file) through one identity, not two.
const sourcePath = resolve(sourceFile);

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

// TAKE THE LOCK BEFORE THE BASELINE, NOT JUST BEFORE THE FIRST MUTATION.
//
// The race PART 7b/E1 records was exactly this: a second process's baseline
// ran while a first process had this same file mid-mutation, and read a
// corrupted "original" as though it were real. Throws, touching nothing, if
// another run already holds this file.
acquireLock(sourcePath, `${testFile} vs ${sourceFile}`, sha(sourcePath));

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
    const failed = unexpectedFailures([...out.matchAll(/^✖ (.+?) \([\d.]+m?s\)$/gm)].map((m) => m[1]));
    // scripts/expected-red.mjs: a named, documented, honestly-red test (B2.5's
    // own CPU-time gate) is not a broken tree -- Candidate pattern F, second
    // instance (docs/AUDIT-PROTOCOL.md §7, 2026-09-09). Every OTHER failure
    // still counts; `ok` is true here ONLY when the allowlist accounts for
    // everything that failed.
    return { ok: failed.length === 0, failed };
  }
}

// A KILL MUST NOT LEAVE THE FILE MUTATED OR THE LOCK STUCK.
//
// Found for real, not hypothesized: a prior run of this exact scenario
// (two concurrent invocations, one of them killed by an outer timeout) left
// `public/city-plan.js` on disk with `deepFreeze(LANDMASSES);` still deleted
// and the lock marker still present -- because this script had no SIGINT/
// SIGTERM handler, unlike mutate.mjs, which grew one for the identical
// reason. Node does not run a `finally` block on an uncaught signal by
// default; without a handler the process just stops.
let restored = false;
function cleanup() {
  if (restored) return;
  restored = true;
  try { writeFileSync(sourceFile, original); } catch { /* best effort on the way out */ }
  releaseLock();
}
const onSignal = () => { cleanup(); process.exit(130); };
process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);

try {
  const base = run();
  console.log(`baseline: ${base.ok ? "GREEN" : "RED"}`);
  if (!base.ok) {
    console.error("refusing to score mutations against a red baseline:\n  " + base.failed.join("\n  "));
    // process.exit() inside a try does not run `finally` -- cleanup() must be
    // called explicitly here, or the lock this run just took would stick
    // forever with nothing mutated to explain why.
    cleanup();
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
  restored = true;
  releaseLock();
  process.off("SIGINT", onSignal);
  process.off("SIGTERM", onSignal);
}
