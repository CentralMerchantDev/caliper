// I1 (docs/BUILD-LOOP.md Step 2 plan, approved 2026-09-08): the REVERSE of
// what test/importsResolve.test.ts already checked. That file asks "does
// every import resolve to a real export" -- one direction. Nothing asked
// the other direction: does every export have a caller. All nine of this
// repository's recorded pattern-E failures (docs/AUDIT-PROTOCOL.md) came
// through the unchecked direction; docs/AUDIT-LEDGER.md line 90 recorded one
// in miniature -- "decideGroundingOutcome, tested in 4 places and used in
// 0" -- and nothing was built from the finding until now.
//
// These are buildReverseMap's own direct tests, synthetic and small,
// matching test/importsResolve.test.ts's own style for findImportClauses/
// findExportedNames. The gate itself (test/deadExports.test.ts) runs this
// same function over the real repository; that is a different test with a
// different job (does today's tree pass), not a substitute for testing the
// function's own logic in isolation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReverseMap, isTestPath, loadModuleFiles, findReExportClauses } from "../scripts/lib/module-graph.mjs";

test("buildReverseMap: an export called from a real (non-test) file is a caller", () => {
  const files = [
    { path: "/repo/public/a.js", source: `export function widget() {}`, isHtml: false },
    { path: "/repo/public/b.js", source: `import { widget } from "./a.js";\nwidget();`, isHtml: false },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/public/a.js").get("widget");
  assert.deepEqual([...entry.callers], ["/repo/public/b.js"]);
  assert.deepEqual([...entry.testCallers], []);
});

test("buildReverseMap: an export imported ONLY from a test/ path is testCallers, not callers -- decideGroundingOutcome's own shape", () => {
  const files = [
    { path: "/repo/src/grounding.ts", source: `export function decideGroundingOutcome() {}`, isHtml: false },
    { path: "/repo/test/grounding.test.ts", source: `import { decideGroundingOutcome } from "../src/grounding";\ndecideGroundingOutcome();`, isHtml: false },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/src/grounding.ts").get("decideGroundingOutcome");
  assert.deepEqual([...entry.callers], [], "a test importer must never count as a real caller");
  assert.deepEqual([...entry.testCallers], ["/repo/test/grounding.test.ts"]);
});

test("buildReverseMap: an export with no importer at all -- callers and testCallers both empty, not absent", () => {
  const files = [
    { path: "/repo/public/dead.js", source: `export function neverCalled() {}`, isHtml: false },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/public/dead.js").get("neverCalled");
  assert.ok(entry, "an unreferenced export must still appear in the map, distinct from an export this scan never saw");
  assert.deepEqual([...entry.callers], []);
  assert.deepEqual([...entry.testCallers], []);
});

test("buildReverseMap: a file importing its own export does not count as a caller", () => {
  // Not a realistic ES module (a file cannot relatively import itself under
  // its own name in this project's layout), but the exclusion is written as
  // a path-equality check, not a heuristic, so it is tested directly rather
  // than trusted by inspection.
  const files = [
    { path: "/repo/public/a.js", source: `export function selfRef() {}\nimport { selfRef } from "./a.js";`, isHtml: false },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/public/a.js").get("selfRef");
  assert.deepEqual([...entry.callers], []);
  assert.deepEqual([...entry.testCallers], []);
});

test("buildReverseMap: extensionless src/*.ts-style imports resolve to the real .ts file", () => {
  const files = [
    { path: "/repo/src/claude.ts", source: `export const PRICING = {};`, isHtml: false },
    { path: "/repo/src/grounding.ts", source: `import { PRICING } from "./claude";\nPRICING;`, isHtml: false },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/src/claude.ts").get("PRICING");
  assert.deepEqual([...entry.callers], ["/repo/src/grounding.ts"]);
});

test("buildReverseMap: an HTML page's <script type=module> import counts as a real (non-test) caller", () => {
  const files = [
    { path: "/repo/public/widget.js", source: `export function mount() {}`, isHtml: false },
    {
      path: "/repo/public/page.html",
      source: `<html><body><script type="module">\nimport { mount } from "./widget.js";\nmount();\n</script></body></html>`,
      isHtml: true,
    },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/public/widget.js").get("mount");
  assert.deepEqual([...entry.callers], ["/repo/public/page.html"]);
});

test("isTestPath: recognises a file under a test/ segment on both path separator styles", () => {
  assert.equal(isTestPath("/repo/test/grounding.test.ts"), true);
  assert.equal(isTestPath("C:\\repo\\test\\grounding.test.ts"), true);
  assert.equal(isTestPath("/repo/src/grounding.ts"), false);
  assert.equal(isTestPath("/repo/public/contest/widget.js"), false, "a directory that merely CONTAINS \"test\" as a substring is not a test/ path");
});

// A REAL BUG, found while building I3 (the MODULE-MAP.md generator): the
// gate and generator only ever passed loadModuleFiles a publicDir and a
// srcDir, so buildReverseMap never saw a SINGLE test/ file's own import
// clauses -- decideGroundingOutcome, imported by three real test files,
// rendered identically to an export nothing anywhere imports, because
// nothing had scanned test/grounding.test.ts's source at all. The gate's
// own PASS/FAIL was unaffected (an export with zero real callers needs an
// allowlist entry whether or not a test also happens to import it), but the
// test-only-vs-fully-dead DISTINCTION this whole task was motivated by
// (docs/AUDIT-LEDGER.md line 90) silently stopped working. These two tests
// cover the fix directly, not just the surrounding gate behaviour.
test("buildReverseMap: a file under test/ is scanned for its OWN imports (so test-only callers are found), but its OWN exports are not tracked", () => {
  const files = [
    { path: "/repo/src/grounding.ts", source: `export function decideGroundingOutcome() {}`, isHtml: false },
    {
      path: "/repo/test/grounding.test.ts",
      source: `import { decideGroundingOutcome } from "../src/grounding";\ndecideGroundingOutcome();\nexport function helperNobodyImports() {}`,
      isHtml: false,
    },
  ];
  const map = buildReverseMap(files, isTestPath);
  const srcEntry = map.get("/repo/src/grounding.ts").get("decideGroundingOutcome");
  assert.deepEqual([...srcEntry.callers], []);
  assert.deepEqual([...srcEntry.testCallers], ["/repo/test/grounding.test.ts"]);
  assert.equal(map.has("/repo/test/grounding.test.ts"), false, "a test file's own exports must not become gate findings");
});

test("loadModuleFiles: testDir is scanned for .ts files, excluding the .built/ esbuild output directory", () => {
  const files = loadModuleFiles({
    publicDir: null,
    srcDir: null,
    testDir: mkTmpTestDir(),
  });
  const paths = files.map((f) => f.path.split("\\").join("/"));
  assert.ok(paths.some((p) => p.endsWith("/real.test.ts")), "a real .ts source file under testDir must be loaded");
  assert.ok(!paths.some((p) => p.includes("/.built/")), ".built/ is esbuild's bundle output, not source, and must be skipped");
});

// TWO REAL FALSE NEGATIVES, found by a blind audit at this task's own phase
// boundary (docs/BUILD-LOOP.md Step 10), not anticipated when buildReverseMap
// was first written. Both are the DANGEROUS direction of error for a
// dead-export gate: reporting something genuinely called as dead, which
// tells a reader to "wire or remove" a capability that is already load-
// bearing. The audit found src/index.ts's re-export of SpendCounterDO
// (CALIPER's bound spend-cap Durable Object, wrangler.jsonc's own
// `class_name`) reading as fully dead, and 16 real public/roadkit.js
// exports -- including junction and roundabout, the two this task's own
// Step 6 sanity check relied on being genuinely uncalled -- reading as dead
// because public/roadkit-street-demo.js and others call them through
// `import * as ROADKIT from "./roadkit.js"; ROADKIT.straight(...)` rather
// than a named import.
test("buildReverseMap: `ALIAS.member(...)` after `import * as ALIAS from \"./x.js\"` credits x.js's `member` export -- the roadkit-street-demo.js shape", () => {
  const files = [
    { path: "/repo/public/kit.js", source: `export function straight() {}\nexport function curve() {}`, isHtml: false },
    {
      path: "/repo/public/demo.js",
      source: `import * as ROADKIT from "./kit.js";\nconst a = ROADKIT.straight("STREET", 2);\n// curve is never called here`,
      isHtml: false,
    },
  ];
  const map = buildReverseMap(files, isTestPath);
  assert.deepEqual([...map.get("/repo/public/kit.js").get("straight").callers], ["/repo/public/demo.js"]);
  assert.deepEqual([...map.get("/repo/public/kit.js").get("curve").callers], [], "a namespace import existing must not credit EVERY export of its target -- only the ones actually member-accessed");
});

test("buildReverseMap: `export { X } from \"./x.js\"` credits x.js's X with a real caller -- the src/index.ts/SpendCounterDO shape", () => {
  const files = [
    { path: "/repo/src/spendCounterDOClass.ts", source: `export class SpendCounterDO {}`, isHtml: false },
    { path: "/repo/src/index.ts", source: `export { SpendCounterDO } from "./spendCounterDOClass";`, isHtml: false },
  ];
  const map = buildReverseMap(files, isTestPath);
  const entry = map.get("/repo/src/spendCounterDOClass.ts").get("SpendCounterDO");
  assert.deepEqual([...entry.callers], ["/repo/src/index.ts"], "the file that DEFINES the export must show the re-exporting file as a real caller");
});

test("findReExportClauses: `X as Y` reports the source's real name X, not the local alias Y; a from-less export list is not a re-export", () => {
  const src = `export { A, B as C } from "./x.js";\nexport { D };`;
  const clauses = findReExportClauses(src);
  assert.deepEqual(clauses, [{ path: "./x.js", named: ["A", "B"] }]);
});

function mkTmpTestDir() {
  // A real, tiny directory on disk -- loadModuleFiles reads the filesystem
  // directly (readdirSync/statSync), so this cannot be tested with an
  // in-memory fixture the way buildReverseMap's own tests are.
  const dir = mkdtempSync(join(tmpdir(), "module-graph-test-"));
  writeFileSync(join(dir, "real.test.ts"), `export function realHelper() {}`);
  mkdirSync(join(dir, ".built"));
  writeFileSync(join(dir, ".built", "real.test.mjs"), `export function realHelper() {}`);
  return dir;
}
