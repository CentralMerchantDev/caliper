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
 * this codebase's own import statements are simple and single-line, and a
 * cheap scanner that is watched red against a real break is worth more than
 * an unbuilt "proper" one.
 */
export function findImportClauses(source) {
  const clauses = [];
  const re = /^\s*import\s+(.+?)\s+from\s+["']([^"']+)["']/gm;
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
