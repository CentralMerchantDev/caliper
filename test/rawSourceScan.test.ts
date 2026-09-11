// F4 (2026-09-11): "the comment-strip sweep, finished as a CATEGORY, not
// nine files." bac6c1b swept nine test files by hand for one defect shape --
// a regex matched against a raw source file's text is satisfied by a call
// sitting inside a comment just as happily as by real code, so a "is this
// wired" check can pass forever on a comment describing what USED to be
// wired. That commit's own body records the pattern had already been
// half-built twice, unshared, before it was finally named and extracted
// into test/stripSourceComments.ts's shared helper -- Failure pattern D,
// an enumerated-instance fix with no category gate behind it.
//
// This is that gate. It does not re-decide which of tonight's files are
// safe (that judgment call is recorded once, below, per file, with a real
// reason) -- it makes sure a TENTH instance, added after tonight, cannot
// land silently: every test file that reads a real source file (public/*,
// src/*, or another test/* file) AND pattern-matches its raw text must
// either import the shared helper, or be named here with a reason. A file
// matching neither fails, by name -- the same shape
// test/deadExports.allowlist.json already uses for exports, reused
// deliberately rather than invented a second time.
//
// SWEPT TONIGHT, MECHANICALLY, NOT BY LISTING FILES FIRST: every test/*.ts
// file that calls readFileSync targeting a .js/.ts/.mjs/.html path AND also
// calls .match(/.test(/RegExp( anywhere in the same file. Two real,
// previously-unswept instances were found and fixed (not just excluded):
//
//   - claimSpansAreChecked.test.ts had grown its OWN local `stripComments`,
//     a fourth/fifth unshared copy of the exact function bac6c1b's own
//     commit already found duplicated three times -- its own header even
//     recorded fixing the underlying bug without importing the fix that
//     already existed for it. Now imports the shared helper.
//   - propManifest.test.ts's regex checks for bin/bench/busShelter were
//     matching a DELIBERATELY PRESERVED HISTORICAL COMMENT in
//     city-render.js (documenting the pre-migration primitives these props
//     used to be), not the live propGeometry() calls that replaced them --
//     real verification of zero real code, for as long as that migration
//     has stood. Stripping comments exposed it immediately: bin and
//     busShelter's real geometry still matched the manifest; bench's did
//     not (manifest claimed 1.8 x 0.55, the real model measures 1.76 x
//     0.45) -- a genuine, silent drift, fixed in public/prop-manifest.js
//     the same run. Re-pointed at the real built geometry's bounding box
//     for those three, which is what should have been checked all along.
//
// Every OTHER match this sweep found is reviewed and named below, with why
// it is not the same defect (a different check entirely, a tokenizer/AST-
// based check already immune to this bug class, a check against non-code
// text where "comment" does not carry the same risk, or a genuine but
// lower-priority instance named for a future pass rather than fixed
// tonight, time-boxed, per this project's own established discipline).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
const TEST_DIR = join(ROOT, "test");

// This file's own name -- excluded from its own scan. Scanning OTHER test
// files' source for this heuristic is this file's whole job, a different
// level of indirection from "does this file check whether SOME SOURCE FILE
// has a real, wired call in it," which is the actual defect shape.
const SELF = "rawSourceScan.test.ts";

// Reviewed 2026-09-11, one by one, not by category assumption -- each entry
// says WHY the match is not (or not yet fixed as) the navPad/isolate/
// movePiece/claimSpansAreChecked/propManifest defect shape.
const REVIEWED_EXCLUSIONS: Record<string, string> = {
  "boardGenerator.test.ts":
    "Reviewed 2026-09-11 (b1-land merge). Two of its four checks against " +
    "board-generator.js's raw source are the safe direction (ROAD_WIDTH/" +
    "HALF_ROAD must be ABSENT -- a comment false-positive fails loud, does " +
    "not hide a real regression). The other two (halfRoadFor(/roadWidthFor( " +
    "must be PRESENT inside a sliced function body) are the risky direction " +
    "and a real, not-yet-fixed instance of the same defect shape; named for " +
    "a future pass, time-boxed out of tonight's sweep.",
  "boardRender.test.ts":
    "Reviewed 2026-09-11 (b1-land merge). Its own forbidden-import scan " +
    "(line ~44-62) already carries a dedicated guardrail test proving it is " +
    "comment-safe by construction (\"a comment line was mistaken for an " +
    "import statement\" -- asserts zero false positives), independently of " +
    "the shared stripSourceComments helper. Every other readFileSync in this " +
    "file reads JSON data (board.generated.json) or checks mesh/geometry " +
    "output, not source-code presence.",
  "terrainLandmassOwnership.test.ts":
    "Reviewed 2026-09-11 (b1-land merge). The import-clause check (\"terrain.js " +
    "no longer imports landmassPolygonsDesign or LANDMASSES\") extracts a " +
    "specific `import { ... } from \"./city-plan.js\"` clause first, then " +
    "checks names are ABSENT within just that clause -- low risk (a full " +
    "commented-out import statement would be needed to false-positive, not " +
    "an arbitrary comment). A separate check (\"terrain.js exports its own " +
    "landmassPolygonsDesign\") DOES match a required pattern against the " +
    "whole raw file and is the risky direction -- a real, not-yet-fixed " +
    "instance; named for a future pass.",
  "cityWorld.test.ts":
    "Every .match()/.test()/.includes() call found targets DATA (a generated " +
    "city-summary report string, plot/road ids, directory-listing filenames), " +
    "never a source file's code text as a stand-in for \"is this wired\" -- " +
    "the comment-vs-code ambiguity does not apply to data.",
  "deadExports.test.ts":
    "Two matches, both reviewed: (1) `/^export\\s*\\*/m.test(file.source)` is " +
    "the reachability graph's OWN wildcard-re-export guard -- theoretically " +
    "matchable inside an unindented block comment, but the literal `export *` " +
    "syntax essentially never appears in prose, and this check is the " +
    "mechanism other reachability gates (including this file's own new one) " +
    "depend on, so tightening it belongs in scripts/lib/module-graph.mjs " +
    "itself, not a test-local patch. (2) `/^intentional\\.?$/i` and " +
    "`/^seeded$/i` match ALLOWLIST REASON TEXT (a JSON string value), not " +
    "source code -- no comment concept applies.",
  "duplicateKeys.test.ts":
    "duplicateKeysIn() parses with acorn.parse() (a real AST), not regex -- " +
    "comment-immune by construction, checked directly in the source.",
  "kitbashNamedDesigns.test.ts":
    "Every .match()/.test()/.includes() call found targets DATA (a part's " +
    "display name, a design's recipe array, a file-path string), never " +
    "source-code text. This file's own new PRODUCT-reachability gate " +
    "(2026-09-11, F3) uses a real import-graph walk, not regex-over-source.",
  "modelRetrievalSecurity.test.ts":
    "Regex-checks that NODE_TLS_REJECT_UNAUTHORIZED is never ASSIGNED in " +
    "src/clientWorkersAI.ts -- the opposite risk direction from the original " +
    "bug: a comment mentioning the forbidden assignment could cause a false " +
    "ALARM (fails loud, safe), not a false PASS that hides a real one. Lower " +
    "priority; named rather than fixed tonight.",
  "publicClaims.test.ts":
    "spanText()-style matching here runs through visibleCopy() first (script/" +
    "style/HTML-comment stripped) for the page-content checks -- reviewed and " +
    "confirmed comment-safe for the html sources. Also reads " +
    "src/citySummary.generated.ts, matched only for numeric substring " +
    "presence in a generated (not hand-authored) file -- not the same risk.",
  "supervisedGenerateScript.test.ts":
    "assert.match() targets a spawned child process's own STDERR text at " +
    "runtime, not a source file's code -- \"comment\" has no meaning for " +
    "program output.",
  "verifyUntrustedGeometry.test.ts":
    "`.includes(\"process\")` checks a TEST FIXTURE payload string defined " +
    "in this same file (a sanity check on the test's own setup), not a real " +
    "source file's code.",
};

/**
 * True if `src` reads a real .js/.ts/.mjs/.html file via readFileSync.
 * Deliberately loose (readFileSync's presence, plus a quoted extension
 * ANYWHERE in the file, not necessarily inside the same call's own
 * parens) rather than trying to parse the call's real argument list --
 * a nested join(...) call inside readFileSync(...) defeats a same-call
 * regex (readFileSync\([^)]*\.js) at its first inner close-paren, which
 * would silently undercount real instances. Precision is recovered by
 * the human-reviewed REVIEWED_EXCLUSIONS list below, not by this heuristic.
 */
function readsSourceFile(src: string): boolean {
  return /\breadFileSync\(/.test(src) && /["'`][^"'`]*\.(?:js|ts|mjs|html)["'`]/.test(src);
}

/** True if `src` pattern-matches raw text anywhere in the file. */
function doesRawPatternMatch(src: string): boolean {
  return /\.match\(|\.test\(|\.exec\(|new RegExp\(/.test(src);
}

test("GATE: every test file that reads a source file and pattern-matches its raw text either strips comments first, or is a reviewed, named exception", () => {
  const files = readdirSync(TEST_DIR).filter((f) => f.endsWith(".test.ts") && f !== SELF);
  const unreviewed: string[] = [];
  const staleExclusions = new Set(Object.keys(REVIEWED_EXCLUSIONS));

  for (const file of files) {
    const src = readFileSync(join(TEST_DIR, file), "utf8");
    if (!readsSourceFile(src) || !doesRawPatternMatch(src)) continue;
    if (src.includes("stripSourceComments")) continue;
    if (REVIEWED_EXCLUSIONS[file]) { staleExclusions.delete(file); continue; }
    unreviewed.push(file);
  }

  assert.deepEqual(
    unreviewed, [],
    `these test file(s) read a source file and pattern-match its raw text, ` +
    `with neither the shared stripSourceComments helper nor a reviewed reason ` +
    `in this file's own REVIEWED_EXCLUSIONS: ${unreviewed.join(", ")} -- ` +
    `either import test/stripSourceComments.ts, or add a real, individually-` +
    `checked reason here (not "SEEDED" boilerplate).`,
  );

  // The allowlist must prune itself too -- an exclusion for a file that no
  // longer matches the risky pattern (fixed, deleted, or renamed) is stale
  // and would silently stop meaning anything, the same drift
  // test/deadExports.test.ts's own allowlist already guards against.
  assert.deepEqual(
    [...staleExclusions], [],
    `these REVIEWED_EXCLUSIONS entries no longer name a file matching the ` +
    `risky pattern -- remove them or confirm they still apply: ${[...staleExclusions].join(", ")}`,
  );
});
