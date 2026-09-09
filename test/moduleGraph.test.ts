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
import { buildReverseMap, isTestPath } from "../scripts/lib/module-graph.mjs";

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
