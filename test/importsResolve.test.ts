// EVERY IMPORT MUST NAME SOMETHING THE TARGET MODULE ACTUALLY EXPORTS.
//
// public/model-library.html imported { ASSET_REGISTRY, registrySummary }
// from ./asset-registry.js. registrySummary was added in 0f7e267 and
// DELETED in f670c71 without checking its consumers -- the module threw on
// load (a named import of a binding that doesn't exist is a hard ESM parse-
// time error, not a runtime undefined) and the page rendered nothing.
// Nothing in this suite caught it, because nothing had ever checked an
// import against its target's real exports -- every existing test either
// runs a module directly (which only proves ITS OWN imports resolve) or
// never imports the page that broke at all.
//
// This is a class of defect, not one instance: any `./relative.js` import,
// in any public/*.js file OR inside a public/*.html page's `<script
// type="module">` block, can name a binding its target no longer has. So
// this walks EVERY relative import across both file types and checks it
// against the target's real, current export list -- not a snapshot, not a
// mock, the actual file on disk.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
// I1 (docs/BUILD-LOOP.md Step 2 plan, approved 2026-09-08): findImportClauses,
// moduleScriptBlocks and findExportedNames moved to scripts/lib/module-graph.mjs
// so the new dead-export gate (test/deadExports.test.ts) and MODULE-MAP.md
// generator (scripts/gen-module-map.mjs) can share this file's parser instead
// of each writing their own. Verified byte-identical output across all 109
// files in public/ and src/ before the move landed -- see the commit message.
import { findImportClauses, findExportedNames, moduleScriptBlocks } from "../scripts/lib/module-graph.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + HERE);
}
const ROOT = repoRoot();
const PUBLIC = join(ROOT, "public");

export interface ImportProblem {
  importer: string;
  target: string;
  missing: string; // "default" or a named binding, or "(module not found)"
}

/**
 * The core check, pure and exported for its own direct test: resolve every
 * relative import found by findImportClauses against the target file's own
 * findExportedNames. Non-relative imports (bare specifiers like "three",
 * vendored files under public/vendor/) are out of scope -- this checks
 * THIS project's own module graph, not third-party packages.
 *
 * @param files   { path: absolute path (used as the importer label and to
 *                  resolve relative targets), source: file content, isHtml }
 */
export function findUnresolvedImports(files: { path: string; source: string; isHtml: boolean }[]): ImportProblem[] {
  // Normalised through resolve() on the way IN as well as the way OUT, so
  // a synthetic test's POSIX-shaped fake paths and this OS's real absolute
  // paths are both looked up the same way they were stored.
  const byPath = new Map(files.map((f) => [resolve(f.path), f]));
  const problems: ImportProblem[] = [];

  for (const file of files) {
    const chunks = file.isHtml ? moduleScriptBlocks(file.source) : [file.source];
    for (const chunk of chunks) {
      for (const clause of findImportClauses(chunk)) {
        if (clause.kind === "namespace" || clause.kind === "side-effect") continue;
        if (!clause.path.startsWith(".")) continue; // bare specifier (e.g. "three") -- out of scope
        const targetPath = resolve(dirname(file.path), clause.path);
        const target = byPath.get(targetPath);
        if (!target) {
          problems.push({ importer: file.path, target: clause.path, missing: "(module not found)" });
          continue;
        }
        const exported = findExportedNames(target.source);
        if (clause.default && !exported.hasDefault) {
          problems.push({ importer: file.path, target: clause.path, missing: "default" });
        }
        for (const name of clause.named) {
          if (!exported.named.has(name)) {
            problems.push({ importer: file.path, target: clause.path, missing: name });
          }
        }
      }
    }
  }
  return problems;
}

// RECURSIVE, INCLUDING public/vendor/ -- an import can point into a
// subdirectory (public/vendor/three/addons/...) as easily as a sibling
// file, and the checker's own file map has to contain everything an import
// could resolve to, not just the top level, or a real target reads as
// "(module not found)" for a reason that is a gap in the checker, not the
// code it is checking.
function loadPublicFiles(): { path: string; source: string; isHtml: boolean }[] {
  const out: { path: string; source: string; isHtml: boolean }[] = [];
  function walk(dir: string) {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (f.endsWith(".js") || f.endsWith(".html")) {
        out.push({ path: full, source: readFileSync(full, "utf8"), isHtml: f.endsWith(".html") });
      }
    }
  }
  walk(PUBLIC);
  return out;
}

test("findImportClauses: named, default, default+named, and namespace imports are all recognised", () => {
  const src = `
import { A, B } from "./x.js";
import Def from "./y.js";
import Def2, { C, D as E } from "./z.js";
import * as NS from "./w.js";
import "./side-effect.js";
`;
  const clauses = findImportClauses(src);
  assert.deepEqual(clauses.filter((c) => c.path === "./x.js")[0], { kind: "bindings", path: "./x.js", default: false, named: ["A", "B"] });
  assert.deepEqual(clauses.filter((c) => c.path === "./y.js")[0], { kind: "bindings", path: "./y.js", default: true, named: [] });
  // `D as E` imports the export named D, bound locally as E -- the name
  // that must exist on the target is D, not the local alias E.
  assert.deepEqual(clauses.filter((c) => c.path === "./z.js")[0], { kind: "bindings", path: "./z.js", default: true, named: ["C", "D"] });
  // `alias` (the local binding NS is bound to) was added for buildReverseMap
  // (scripts/lib/module-graph.mjs) -- see that file's own header for why.
  assert.deepEqual(clauses.filter((c) => c.path === "./w.js")[0], { kind: "namespace", path: "./w.js", alias: "NS" });
});

test("findExportedNames: const/function/class/export-list/default are all recognised", () => {
  const src = `
export const A = 1;
export function B() {}
export async function C() {}
export class D {}
export { X, Y as Z };
export default function () {}
`;
  const { named, hasDefault } = findExportedNames(src);
  assert.deepEqual([...named].sort(), ["A", "B", "C", "D", "X", "Z"]);
  assert.equal(hasDefault, true);
});

test("synthetic: an import naming a binding the target does not export is caught, naming both sides", () => {
  const files = [
    { path: "/repo/public/a.js", source: `import { existsHere, doesNotExist } from "./b.js";`, isHtml: false },
    { path: "/repo/public/b.js", source: `export const existsHere = 1;`, isHtml: false },
  ];
  const problems = findUnresolvedImports(files);
  assert.deepEqual(problems, [{ importer: "/repo/public/a.js", target: "./b.js", missing: "doesNotExist" }]);
});

test("synthetic: this is exactly the model-library.html shape -- an HTML page's module script importing a deleted export", () => {
  const files = [
    {
      path: "/repo/public/model-library.html",
      source: `<html><body><script type="module">\nimport { ASSET_REGISTRY, registrySummary } from "./asset-registry.js";\n</script></body></html>`,
      isHtml: true,
    },
    { path: "/repo/public/asset-registry.js", source: `export const ASSET_REGISTRY = {};`, isHtml: false },
  ];
  const problems = findUnresolvedImports(files);
  assert.deepEqual(problems, [{ importer: "/repo/public/model-library.html", target: "./asset-registry.js", missing: "registrySummary" }]);
});

test("synthetic: a valid import set produces no problems -- this is not a checker that flags everything", () => {
  const files = [
    { path: "/repo/public/a.js", source: `import { real } from "./b.js";\nimport Def from "./b.js";`, isHtml: false },
    { path: "/repo/public/b.js", source: `export const real = 1;\nexport default function () {}`, isHtml: false },
  ];
  assert.deepEqual(findUnresolvedImports(files), []);
});

test("every relative import across public/*.js and public/*.html resolves against its target's real exports", () => {
  const problems = findUnresolvedImports(loadPublicFiles());
  assert.deepEqual(
    problems, [],
    `unresolved import(s) -- a target module does not export what its importer asks for: ${problems.map((p) => `${p.importer} imports "${p.missing}" from ${p.target}`).join("; ")}`,
  );
});
