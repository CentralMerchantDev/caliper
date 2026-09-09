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
    const nsMatch = trimmed.match(/^\*\s*as\s+([A-Za-z_$][\w$]*)$/);
    if (nsMatch) {
      // `alias` is the local binding a namespace import creates
      // (`import * as ROADKIT from "./roadkit.js"` -> "ROADKIT"). Added for
      // buildReverseMap, below, which needs it to find `ROADKIT.member(...)`
      // usage elsewhere in the file; findUnresolvedImports (which already
      // consumed this clause shape before this field existed) never reads
      // it, so this is additive, not a breaking change to that checker.
      clauses.push({ kind: "namespace", path, alias: nsMatch[1] });
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
 * Every `export { X, Y as Z } from "path"` statement -- a re-export chain,
 * which is also, implicitly, an IMPORT of X and Y from path. Distinct from
 * `export { X, Y as Z };` (no `from` clause), which names bindings already
 * declared or imported in THIS file and imports nothing.
 *
 * Found necessary by a blind audit, not anticipated when buildReverseMap was
 * first written: src/index.ts re-exports SpendCounterDO this way
 * (`export { SpendCounterDO } from "./spendCounterDOClass"`) so wrangler can
 * bind it as a Durable Object class (wrangler.jsonc's own `class_name`).
 * Without recognising this as an import, src/spendCounterDOClass.ts -- the
 * file that actually DEFINES CALIPER's spend-cap enforcement -- read as
 * fully dead, and the dead-export gate's own seeded allowlist told a reader
 * to "wire or remove" it.
 */
export function findReExportClauses(source) {
  const clauses = [];
  const re = /^export\s*\{([^}]*)\}\s*from\s+["']([^"']+)["']/gms;
  for (const m of source.matchAll(re)) {
    const [, names, path] = m;
    const named = names
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(/\s+as\s+/)[0].trim()); // `{ A as B } from "..."` -- the source file's real export is A
    clauses.push({ path, named });
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
//   - A bare side-effect import (`import "./x.js";`, no binding clause at
//     all) is invisible to findImportClauses -- the regex requires a `from`
//     clause, and a side-effect import has none. Found while building
//     buildForwardDependencyGraph (a file loaded only this way would show no
//     dependency edge at all). Checked directly: zero occurrences in
//     public/*.js, public/*.html or src/*.ts today (every real page in this
//     codebase imports at least one named binding from its own script,
//     including every HTML entry point declareEntryPoints relies on).
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
export function loadModuleFiles({ publicDir, srcDir, testDir }) {
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
  // `.built` is esbuild's own output directory (test/run.mjs bundles every
  // .test.ts file there before running it) -- walking it would scan every
  // test file's entire dependency tree, INLINED, as though it were this
  // file's own source, multiplying every import and export by however many
  // bundles happen to include it. Test SOURCE files are what buildReverseMap
  // needs to see (to know what a test imports, so it can be classified as a
  // test caller rather than invisible); the built output is not source.
  if (testDir) walk(testDir, { skipDirNames: [".built"], extensions: [".ts"], excludeSuffixes: [] });
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
    // A file under test/ is scanned below for what it IMPORTS (so its
    // imports can be classified as test callers), but its OWN exports are
    // not tracked here -- test infrastructure (helper exports like
    // findUnresolvedImports) is not a capability this gate audits, and
    // callers.length passing `files` including test/ (needed so
    // decideGroundingOutcome's own shape -- "tested in 4 places, called
    // from 0" -- is visible at all) must not turn every test file's own
    // exports into gate findings as a side effect.
    if (isTestPathFn(file.path)) continue;
    const { named, hasDefault } = findExportedNames(file.source);
    const exportsByName = new Map();
    for (const name of named) exportsByName.set(name, { callers: new Set(), testCallers: new Set() });
    if (hasDefault) exportsByName.set("default", { callers: new Set(), testCallers: new Set() });
    reverse.set(file.path, exportsByName);
  }

  // Shared by every crediting path below (named import, namespace member
  // access, re-export chain) so "does this target/name exist, which bucket
  // does this importer belong in" is answered once, the same way, every
  // time -- not reimplemented per crediting shape, which is exactly how the
  // namespace path was missed the first time (buildReverseMap originally
  // had this logic inlined once, for named imports only, and nobody wrote
  // it a second time for the namespace-import case that turned out to need
  // it too).
  function credit(targetPath, exportName, importerPath) {
    const exportsByName = reverse.get(targetPath);
    if (!exportsByName) return; // target has no exports at all (e.g. an .html file, defensively)
    const entry = exportsByName.get(exportName);
    if (!entry) return; // name the import checker already flags separately
    (isTestPathFn(importerPath) ? entry.testCallers : entry.callers).add(importerPath);
  }

  for (const file of files) {
    const chunks = file.isHtml ? moduleScriptBlocks(file.source) : [file.source];
    for (const chunk of chunks) {
      for (const clause of findImportClauses(chunk)) {
        if (clause.kind === "side-effect") continue;
        if (!clause.path.startsWith(".")) continue; // bare specifier (e.g. "three") -- out of scope
        const target = resolveImportTarget(file.path, clause.path, byResolvedPath);
        if (!target) continue; // an unresolved import is importsResolve.test.ts's finding, not this one's
        if (resolve(target.path) === resolve(file.path)) continue; // a file referencing its own export is not a caller

        if (clause.kind === "namespace") {
          // `import * as ALIAS from "./x.js"` -- `ALIAS.member(...)`
          // anywhere else in this chunk credits x.js's `member` export, the
          // same as a named import would. Found necessary by a blind audit:
          // public/roadkit-street-demo.js and others call every roadkit.js
          // piece this way (`ROADKIT.straight(...)`, `ROADKIT.curve(...)`,
          // ...) -- 16 real, called exports read as fully dead without
          // this, including junction/roundabout, the two this task's own
          // Step 6 sanity check relied on being genuinely uncalled. They
          // were not; the scanner just could not see how they were reached.
          const memberRe = new RegExp(`\\b${clause.alias}\\.([A-Za-z_$][\\w$]*)`, "g");
          for (const mm of chunk.matchAll(memberRe)) credit(target.path, mm[1], file.path);
          continue;
        }

        const names = [];
        if (clause.default) names.push("default");
        names.push(...clause.named);
        for (const name of names) credit(target.path, name, file.path);
      }

      for (const reExport of findReExportClauses(chunk)) {
        if (!reExport.path.startsWith(".")) continue;
        const target = resolveImportTarget(file.path, reExport.path, byResolvedPath);
        if (!target) continue;
        if (resolve(target.path) === resolve(file.path)) continue;
        for (const name of reExport.named) credit(target.path, name, file.path);
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

// =============================================================================
// REACHABILITY, NOT IMPORT COUNTING -- added after a blind audit found two
// real false negatives (namespace-member-access, named re-exports) in
// buildReverseMap, and Mark's own review of the fix found a THIRD, structural
// one: "does anything import this" and "is this reachable from the renderer"
// are different questions that can disagree. roadkit.js's junction and
// roundabout ARE imported -- by public/roadkit-street-demo.js, a demo page
// nothing else imports. An export imported only by a module nothing reaches
// is still dead; import counting alone cannot see that.
//
// This computes, for every file, which of three declared entry-point classes
// can reach it via the forward import graph (the module dependency graph,
// not buildReverseMap's export-level caller graph): PRODUCT (wrangler.jsonc's
// "main", plus public/index.html and public/city.html -- what a visitor's
// browser or the Worker itself actually loads), DEMO (every other HTML page
// in public/), and TEST (everything under test/, which needs no declared
// root -- every test file is trivially runnable on its own).
//
// A file's reachability, combined with buildReverseMap's export-level caller
// list, classifies each export as "product" (reachable from a product entry
// point -- passes without justification), "demo-only" (has a caller, but
// that caller is only ever reached from a demo page -- exactly the
// roadkit.js shape), "test-only" (reachable only from test/), or
// "unreachable" (no caller at all, or every caller is itself unreachable
// from anywhere).
// =============================================================================

import { basename } from "node:path";

/**
 * Every file another file in `files` directly depends on -- ANY import
 * clause kind (named, namespace, default) plus re-export chains, because
 * file-level reachability only needs to know THAT A depends on B, not which
 * specific binding A uses (buildReverseMap's credit() answers that separate,
 * export-level question).
 */
export function buildForwardDependencyGraph(files) {
  const byResolvedPath = new Map(files.map((f) => [resolve(f.path), f]));
  const deps = new Map(files.map((f) => [f.path, new Set()]));
  for (const file of files) {
    const chunks = file.isHtml ? moduleScriptBlocks(file.source) : [file.source];
    for (const chunk of chunks) {
      const targets = [];
      for (const clause of findImportClauses(chunk)) targets.push(clause.path);
      for (const reExport of findReExportClauses(chunk)) targets.push(reExport.path);
      for (const specifier of targets) {
        if (!specifier.startsWith(".")) continue; // bare specifier -- out of scope
        const target = resolveImportTarget(file.path, specifier, byResolvedPath);
        if (!target) continue;
        if (target.path === file.path) continue;
        deps.get(file.path).add(target.path);
      }
    }
  }
  return deps;
}

/** Breadth-first closure: every file reachable from `rootPaths` by following `forwardDeps` edges, including the roots themselves. */
export function reachableFilesFrom(rootPaths, forwardDeps) {
  const seen = new Set();
  const queue = [...rootPaths];
  while (queue.length) {
    const p = queue.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    const deps = forwardDeps.get(p);
    if (deps) for (const d of deps) if (!seen.has(d)) queue.push(d);
  }
  return seen;
}

/**
 * The three entry-point root sets, declared explicitly rather than inferred:
 * PRODUCT is wrangler's own "main" plus the two pages a visitor's browser
 * loads; DEMO is every OTHER html page in publicDir; TEST is every file
 * loadModuleFiles found under testDir (trivially -- a test file needs no
 * importer to be a real root, it is one by being a test).
 *
 * `wranglerText` is read as text, not parsed as JSON -- wrangler.jsonc has
 * comments, and this project's convention throughout this file is a cheap,
 * targeted scanner over a full parser. Scoped to what this config actually
 * declares today: `"main"` and `durable_objects.bindings[].class_name`.
 */
export function declareEntryPoints({ files, repoRoot, wranglerText, productHtmlNames = ["index.html", "city.html"] }) {
  const product = new Set();
  const demo = new Set();
  const test = new Set();

  const mainMatch = wranglerText && wranglerText.match(/"main"\s*:\s*"([^"]+)"/);
  if (mainMatch) {
    const mainPath = join(repoRoot, ...mainMatch[1].split("/"));
    const mainFile = files.find((f) => resolve(f.path) === resolve(mainPath));
    if (mainFile) product.add(mainFile.path);
  }

  for (const file of files) {
    if (isTestPath(file.path)) { test.add(file.path); continue; }
    if (!file.isHtml) continue;
    (productHtmlNames.includes(basename(file.path)) ? product : demo).add(file.path);
  }

  return { product, demo, test };
}

/**
 * Every name wrangler.jsonc declares as a binding's `class_name` -- read
 * directly by the platform (Cloudflare's runtime binds the class named
 * here), not through any import a JS module graph could see. SpendCounterDO
 * is why this exists: CALIPER's bound spend-cap Durable Object, found dead
 * by a graph that had never heard of wrangler.jsonc.
 */
export function wranglerDeclaredNames(wranglerText) {
  const names = new Set();
  for (const m of wranglerText.matchAll(/"class_name"\s*:\s*"([^"]+)"/g)) names.add(m[1]);
  return names;
}

/**
 * `${filePath}:${exportName}` keys the PLATFORM reaches directly -- never
 * through a JS import, so no forward-graph walk could ever see them, no
 * matter how correct the walk is. Two shapes, both found the same way (an
 * export that IS the entry point itself has no caller to be reachable
 * through):
 *
 *   - The file wrangler's own "main" names: its `default` export is the
 *     Workers fetch handler contract -- the platform calls it directly.
 *     Without this, src/index.ts's OWN `default` (and its re-exported
 *     SpendCounterDO binding) measured "unreachable" despite index.ts being
 *     a declared PRODUCT ROOT itself -- found measuring the real repository
 *     the first time this ran, not anticipated in the design.
 *   - Every `durable_objects.bindings[].class_name`: found in whichever file
 *     actually defines a class or const of that name (via findExportedNames
 *     over every file, not assumed to be wherever wrangler happens to be
 *     read alongside).
 */
export function platformReachableExports(files, wranglerText, repoRoot) {
  const keys = new Set();
  const mainMatch = wranglerText.match(/"main"\s*:\s*"([^"]+)"/);
  if (mainMatch) {
    const mainPath = join(repoRoot, ...mainMatch[1].split("/"));
    const mainFile = files.find((f) => resolve(f.path) === resolve(mainPath));
    if (mainFile) keys.add(`${mainFile.path}:default`);
  }
  const classNames = wranglerDeclaredNames(wranglerText);
  if (classNames.size > 0) {
    for (const file of files) {
      if (file.isHtml) continue;
      const { named } = findExportedNames(file.source);
      for (const className of classNames) {
        if (named.has(className)) keys.add(`${file.path}:${className}`);
      }
    }
  }
  return keys;
}

/**
 * Classify every export buildReverseMap found, using file-level reachability
 * instead of a raw caller count. `reverse` is buildReverseMap's own output;
 * `fileReachability` is `{product, demo, test}` file-path Sets (from
 * reachableFilesFrom, run once per class against declareEntryPoints' roots).
 * `platformKeys` (platformReachableExports' output, optional) are
 * `filePath:exportName` pairs the platform itself reaches -- checked first,
 * since nothing in the JS graph could ever contradict a platform binding.
 *
 * Priority is platform > product > demo > test > unreachable: an export
 * reachable from BOTH a demo page and product code is product-reachable,
 * full stop -- "demo-only" specifically means the ONLY path in is through a
 * demo page. An export with callers, none of which are themselves reachable
 * from any declared entry point, is unreachable too -- a caller that
 * nothing loads does not make what it calls loaded either.
 */
export function classifyReachability(reverse, fileReachability, platformKeys = new Set()) {
  const { product, demo, test } = fileReachability;
  const classified = new Map();
  for (const [filePath, exportsByName] of reverse) {
    const byName = new Map();
    for (const [name, entry] of exportsByName) {
      const callers = new Set([...entry.callers, ...entry.testCallers]);
      let state = "unreachable";
      let via = null;
      if (platformKeys.has(`${filePath}:${name}`)) {
        state = "product";
        via = "wrangler.jsonc";
      }
      if (state !== "product") {
        for (const caller of callers) {
          if (product.has(caller)) { state = "product"; via = caller; break; }
        }
      }
      if (state !== "product") {
        for (const caller of callers) {
          if (demo.has(caller)) { state = "demo-only"; via = caller; break; }
        }
      }
      if (state === "unreachable") {
        for (const caller of callers) {
          if (test.has(caller)) { state = "test-only"; via = caller; break; }
        }
      }
      byName.set(name, { state, via, callers });
    }
    classified.set(filePath, byName);
  }
  return classified;
}

/**
 * The full pipeline, in one call: load files, build both graphs, declare
 * entry points, classify every export. test/deadExports.test.ts (the gate)
 * and scripts/gen-module-map.mjs (the document) both need exactly this
 * sequence in exactly this order; this is the one place it is written,
 * so neither has to re-derive "forward graph, then entry points, then
 * platform keys, then reverse map, then classify" and risk the two drifting
 * out of step with each other.
 */
export function classifyRepoReachability({ publicDir, srcDir, testDir, repoRoot, wranglerText, productHtmlNames }) {
  const files = loadModuleFiles({ publicDir, srcDir, testDir });
  const forwardDeps = buildForwardDependencyGraph(files);
  const { product, demo, test } = declareEntryPoints({ files, repoRoot, wranglerText, ...(productHtmlNames ? { productHtmlNames } : {}) });
  const fileReachability = {
    product: reachableFilesFrom(product, forwardDeps),
    demo: reachableFilesFrom(demo, forwardDeps),
    test: reachableFilesFrom(test, forwardDeps),
  };
  const platformKeys = platformReachableExports(files, wranglerText, repoRoot);
  const reverse = buildReverseMap(files, isTestPath);
  const classified = classifyReachability(reverse, fileReachability, platformKeys);
  return { files, classified };
}
