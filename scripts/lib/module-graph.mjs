// =============================================================================
// THE MODULE GRAPH — shared parsing primitives for this project's own ES
// module wiring, over public/*.js, public/*.html and src/*.ts.
//
// Extracted from test/importsResolve.test.ts (I1, docs/BUILD-LOOP.md Step 2
// plan approved 2026-09-08), which already parsed this graph in one
// direction: every import resolves to a real export. findImportClauses,
// findExportedNames and moduleScriptBlocks are moved here VERBATIM -- same
// regexes, same behaviour -- so test/importsResolve.test.ts and the new
// dead-export gate (test/deadExports.test.ts, next commit) share exactly one
// parser instead of two. Writing a second parser is the pattern the
// dead-export gate exists to stop catching elsewhere in this codebase; it
// does not get to exist here either.
//
// Deliberately plain JS (not .ts): the dead-export gate's own MODULE-MAP.md
// generator (a later commit) must run as plain Node outside the
// TypeScript-test-bundling pipeline (test/run.mjs esbuild-bundles .test.ts
// files before running them; a generator script invoked directly by `node`
// cannot ride that pipeline), and test/importsResolve.test.ts imports plain
// .mjs/.js without issue either way.
// =============================================================================

/**
 * Every `import ... from "..."` statement in `source`, pure and exported for
 * its own direct test. Deliberately regex-based, matching this project's
 * other source scanners (test/claimSpansAreChecked.test.ts,
 * test/thinkingDisabledOnEveryCall.test.ts) rather than a full parser --
 * this codebase's own import statements are simple, and a cheap scanner
 * that is watched red against a real break is worth more than an unbuilt
 * "proper" one.
 *
 * THE `s` (dotAll) FLAG IS LOAD-BEARING, NOT COSMETIC. Without it `.` does
 * not match a newline, so a MULTI-LINE destructured import --
 * `import {\n  A, B,\n} from "./x.js"`, which public/city-render.js's own
 * import of city-plan.js already was before this function existed -- was
 * silently never matched at all. Invisible on the forward direction this
 * function was built for (findUnresolvedImports only ever asks "does this
 * named binding exist"; a clause it never saw is a clause it never asked
 * about, which reads identically to one with no problems). Found only when
 * I1's reverse map (buildReverseMap, below) turned every binding in every
 * unparsed multi-line import into a false "no importer at all" -- 6 files
 * in this codebase use the multi-line form, and this bug predates the
 * dead-export gate entirely; it was latent in the original, single-direction
 * checker the whole time.
 */
export function findImportClauses(source) {
  const clauses = [];
  const re = /^\s*import\s+(.+?)\s+from\s+["']([^"']+)["']/gms;
  for (const m of source.matchAll(re)) {
    const [, clause, path] = m;
    const trimmed = clause.trim();
    const nsMatch = trimmed.match(/^\*\s*as\s+[A-Za-z_$][\w$]*$/);
    if (nsMatch) {
      clauses.push({ kind: "namespace", path });
      continue;
    }
    const braceMatch = trimmed.match(/^(?:([A-Za-z_$][\w$]*)\s*,\s*)?\{([^}]*)\}$/);
    if (braceMatch) {
      const named = braceMatch[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.split(/\s+as\s+/)[0].trim()); // `X as Y` -- the export's real name is X
      clauses.push({ kind: "bindings", path, default: !!braceMatch[1], named });
      continue;
    }
    const defaultOnly = trimmed.match(/^[A-Za-z_$][\w$]*$/);
    if (defaultOnly) {
      clauses.push({ kind: "bindings", path, default: true, named: [] });
      continue;
    }
    // No clause at all (`import "./x.js"`) never matches the `from` regex
    // above, so nothing else reaches here -- an unrecognised clause shape
    // is intentionally left unclassified rather than guessed at.
  }
  return clauses;
}

/**
 * Every `<script type="module">...</script>` block's text content, so HTML
 * pages are scanned the same way .js files are.
 */
export function moduleScriptBlocks(html) {
  const blocks = [];
  for (const m of html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    blocks.push(m[1]);
  }
  return blocks;
}

/**
 * Every name a module actually exports, pure and exported for its own
 * direct test. `hasDefault` is tracked separately since a default import
 * checks a different thing than a named one.
 */
export function findExportedNames(source) {
  const named = new Set();
  let hasDefault = false;
  for (const m of source.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) named.add(m[1]);
  for (const m of source.matchAll(/^export\s+(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/gm)) named.add(m[1]);
  for (const m of source.matchAll(/^export\s+class\s+([A-Za-z_$][\w$]*)/gm)) named.add(m[1]);
  if (/^export\s+default\b/m.test(source)) hasDefault = true;
  for (const m of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const raw of m[1].split(",")) {
      const piece = raw.trim();
      if (!piece) continue;
      const exportedName = piece.split(/\s+as\s+/).pop().trim(); // `{ A as B }` -- consumers import B
      if (exportedName === "default") hasDefault = true;
      else named.add(exportedName);
    }
  }
  return { named, hasDefault };
}

// =============================================================================
// THE REVERSE MAP (I1) -- new. findImportClauses and findExportedNames above
// are the only things reused; loading src/*.ts, resolving extensionless
// TS-style import specifiers, and building the caller graph are new
// questions the forward-only import checker never had to answer.
//
// KNOWN LIMITATIONS, named rather than left implicit -- per this project's
// own standard (AUDIT-PROTOCOL.md), a known gap left as a comment is how
// nine pattern-E instances happened; a known gap guarded by an assertion is
// different, and the dead-export gate that calls this function asserts the
// second one, not just states it here:
//
//   - No dynamic `import()`. Only static `import ... from "..."` is text a
//     regex scanner can see. Not used anywhere in this codebase today.
//   - `import type { X } from "..."` is not classified by findImportClauses
//     (falls through, matching its own existing "unrecognised clause shape"
//     behaviour). This only affects the IMPORT side; findExportedNames
//     already never treats `export interface`/`export type` as an exported
//     NAME, so type-only bindings are out of scope for a runtime-usage gate
//     by construction on both sides, not by omission on one.
//   - `export * from "./other.js"` (wildcard re-export) is not recognised by
//     findExportedNames at all -- an export reachable only through a
//     wildcard re-export chain would look uncalled when it is not. There are
//     zero occurrences in this codebase today; the dead-export gate asserts
//     that stays true (fails loud if one appears) rather than trusting this
//     comment to still be correct later.
// =============================================================================

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";

/**
 * Recursively collect every `.js`/`.html` file under `publicDir` (excluding
 * `vendor/`, third-party code this project does not author) and every `.ts`
 * file under `srcDir` (excluding `.generated.ts`, which is written by a
 * generator, not hand-wired). Same shape test/importsResolve.test.ts's own
 * `loadPublicFiles()` already used: `{ path, source, isHtml }`.
 */
export function loadModuleFiles({ publicDir, srcDir }) {
  const out = [];
  function walk(dir, { skipDirNames = [], extensions, excludeSuffixes = [] }) {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) {
        if (skipDirNames.includes(f)) continue;
        walk(full, { skipDirNames, extensions, excludeSuffixes });
        continue;
      }
      if (!extensions.some((ext) => f.endsWith(ext))) continue;
      if (excludeSuffixes.some((suf) => f.endsWith(suf))) continue;
      out.push({ path: full, source: readFileSync(full, "utf8"), isHtml: f.endsWith(".html") });
    }
  }
  if (publicDir) walk(publicDir, { skipDirNames: ["vendor"], extensions: [".js", ".html"] });
  if (srcDir) walk(srcDir, { skipDirNames: [], extensions: [".ts"], excludeSuffixes: [".generated.ts"] });
  return out;
}

/**
 * Resolve a relative import specifier to one of `files`' real paths.
 *
 * public/*.js imports always name their real extension (`./foo.js`).
 * src/*.ts imports never do (`./foo`, resolved by the TypeScript/wrangler
 * toolchain to `./foo.ts`) -- the one thing test/importsResolve.test.ts's
 * own resolver, built only for public/*.js, never had to handle. Tried in
 * order: the literal path, then `.ts` appended, then `.js` appended (a
 * src/*.ts file could in principle import a plain .js sibling).
 */
function resolveImportTarget(fromPath, specifier, byPath) {
  const base = resolve(dirname(fromPath), specifier);
  if (byPath.has(base)) return byPath.get(base);
  for (const ext of [".ts", ".js"]) {
    if (byPath.has(base + ext)) return byPath.get(base + ext);
  }
  return null;
}

/**
 * The reverse map I1 asks for: for every export of every file in `files`,
 * who imports it -- split into real callers and test-only callers, because
 * test-only usage is not a caller (docs/AUDIT-LEDGER.md line 90:
 * decideGroundingOutcome, "tested in 4 places and used in 0").
 *
 * `isTestPath(path)` decides which importers count as tests; the caller
 * supplies it so this stays a pure function of its inputs rather than
 * hardcoding a path convention two callers might disagree about.
 *
 * Returns a Map keyed by the exporting file's absolute path, to a Map keyed
 * by export name, to `{ callers: Set<string>, testCallers: Set<string> }`
 * (both sets of absolute importer paths). Every export of every file is
 * present as a key even when both sets are empty -- an export with no entry
 * at all would be indistinguishable from an export this scan never saw, and
 * those are different findings.
 */
export function buildReverseMap(files, isTestPathFn) {
  // `byResolvedPath` exists ONLY to answer "which file object does this
  // specifier resolve to" reliably across platforms (resolve() normalises
  // drive letters/separators). Everything the caller sees back out --
  // map keys, caller entries -- uses each file's ORIGINAL `path` string, not
  // a resolved one, both because that is what a caller (a test, a report
  // generator) actually wants to read, and because comparing an un-resolved
  // literal against a resolve()'d key is exactly how this was first wrong:
  // resolve() reinterprets a POSIX-shaped synthetic path ("/repo/a.js")
  // against the current drive on Windows, so two representations of "the
  // same" path stopped being equal the moment a test looked one up by its
  // own literal string. Caught by this function's own direct tests
  // (test/moduleGraph.test.ts), not by inspection.
  const byResolvedPath = new Map(files.map((f) => [resolve(f.path), f]));
  const reverse = new Map();
  for (const file of files) {
    if (file.isHtml) continue; // HTML pages import; they do not export
    const { named, hasDefault } = findExportedNames(file.source);
    const exportsByName = new Map();
    for (const name of named) exportsByName.set(name, { callers: new Set(), testCallers: new Set() });
    if (hasDefault) exportsByName.set("default", { callers: new Set(), testCallers: new Set() });
    reverse.set(file.path, exportsByName);
  }

  for (const file of files) {
    const chunks = file.isHtml ? moduleScriptBlocks(file.source) : [file.source];
    for (const chunk of chunks) {
      for (const clause of findImportClauses(chunk)) {
        if (clause.kind === "namespace" || clause.kind === "side-effect") continue;
        if (!clause.path.startsWith(".")) continue; // bare specifier (e.g. "three") -- out of scope
        const target = resolveImportTarget(file.path, clause.path, byResolvedPath);
        if (!target) continue; // an unresolved import is importsResolve.test.ts's finding, not this one's
        if (resolve(target.path) === resolve(file.path)) continue; // a file referencing its own export is not a caller
        const exportsByName = reverse.get(target.path);
        if (!exportsByName) continue; // target has no exports at all (e.g. an .html file, defensively)
        const names = [];
        if (clause.default) names.push("default");
        names.push(...clause.named);
        for (const name of names) {
          const entry = exportsByName.get(name);
          if (!entry) continue; // names the import checker already flags separately
          (isTestPathFn(file.path) ? entry.testCallers : entry.callers).add(file.path);
        }
      }
    }
  }
  return reverse;
}

/** True for any path with a `test` path segment, from either OS's separator. */
export function isTestPath(path) {
  return /[/\\]test[/\\]/.test(path) || /[/\\]test$/.test(dirname(path));
}

/** A path relative to `root`, with forward slashes, for stable, OS-independent output. */
export function displayPath(root, path) {
  return relative(root, path).split("\\").join("/");
}
