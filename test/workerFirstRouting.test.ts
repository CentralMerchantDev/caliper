// SHIP.md item 1: the actual root cause behind "aborted, it stayed on
// screen, offered retry, retried, nothing happened" -- not a control-flow
// bug in changePipeline.ts (that gap is real and separately fixed and
// tested), but /change-error-decision, the one route that handles BOTH
// Retry and Abandon, was simply missing from wrangler.jsonc's
// assets.run_worker_first allowlist. Every other request to it was quietly
// served the SPA fallback (index.html, HTTP 200) instead of ever reaching
// src/index.ts's route handler -- the fetch() "succeeded" from the client's
// point of view, so its .then(() => resumeCurrent()) still fired, but no
// decision was ever written to KV, so resuming just re-showed the exact
// same stage-error halt. Confirmed by hand against a real (local) run: the
// route returned index.html with a plain Content-Type/ETag instead of the
// {"ok":true} JSON every sibling route returns.
//
// This is exactly the kind of defect that's invisible by reading either
// file alone -- src/index.ts's route looks completely correct in
// isolation, and wrangler.jsonc's list looks like a plausible list unless
// you count it against the actual routes. Walking both mechanically, the
// way schemaAudit.test.ts already does for the enum/nullable-type-array
// class of bug, makes this specific failure mode structurally impossible
// to reintroduce silently.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { stripSourceComments } from "./stripSourceComments.ts";

// esbuild bundles this test into test/.built/ before running it, so
// import.meta.url points at the built copy, not the source tree --
// process.cwd() (the repo root `npm test` always runs from) is the
// reliable anchor here, with a short upward walk as a safety net in case
// a future test runner invocation changes that.
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(path.join(dir, "wrangler.jsonc"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error("could not locate repo root (wrangler.jsonc not found within 5 levels of cwd)");
}
const ROOT = findRepoRoot();

/** wrangler.jsonc is JSON-with-comments -- strips // line comments and
 * /* block comments *\/ (never inside a string, since none of this file's
 * string values contain "//" or "/*") before JSON.parse. */
function parseJsonc(text: string): unknown {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      // Only strip a `//` that isn't inside a string literal on this line --
      // this file's strings never contain `//`, so the first unquoted `//`
      // is always safe to treat as the start of a comment.
      let inString = false;
      for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === '"' && line[i - 1] !== "\\") inString = !inString;
        if (!inString && line[i] === "/" && line[i + 1] === "/") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
  return JSON.parse(stripped);
}

function extractWorkerRoutes(indexTsSource: string): string[] {
  const routes: string[] = [];
  const re = /url\.pathname\s*===\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  // A route mentioned only in a comment (a stale "used to check ..." left
  // by a rewrite) must not be extracted as if it were a real handled
  // route -- comments stripped first, same offset-preserving helper every
  // other source-text scan in this suite uses.
  const source = stripSourceComments(indexTsSource);
  while ((m = re.exec(source)) !== null) routes.push(m[1]);
  return routes;
}

function readRunWorkerFirst(config: unknown): string[] {
  const c = config as { assets?: { run_worker_first?: unknown } };
  const list = c.assets?.run_worker_first;
  if (!Array.isArray(list) || !list.every((p) => typeof p === "string")) {
    throw new Error("wrangler.jsonc: assets.run_worker_first is missing or not a string array");
  }
  return list;
}

test("every url.pathname route src/index.ts handles is reachable -- present in wrangler.jsonc's assets.run_worker_first allowlist", () => {
  const indexTs = readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
  const config = parseJsonc(readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8"));
  const routes = extractWorkerRoutes(indexTs);
  const allowlist = new Set(readRunWorkerFirst(config));

  assert.ok(routes.length > 10, "sanity check: the route extractor must find src/index.ts's real routes, not silently match zero");

  const missing = routes.filter((r) => !allowlist.has(r));
  assert.deepEqual(
    missing,
    [],
    `these routes exist in src/index.ts but are missing from wrangler.jsonc's assets.run_worker_first -- every request to them is silently served the SPA fallback instead of ever reaching the Worker: ${missing.join(", ")}`,
  );
});

test("guardrail: the check above actually fails on a route missing from the allowlist, not just passing by construction", () => {
  const indexTs = readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
  const config = parseJsonc(readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8"));
  const routes = extractWorkerRoutes(indexTs);
  const allowlist = new Set(readRunWorkerFirst(config));
  allowlist.delete("/change-error-decision"); // plant the exact real violation this test guards against

  const missing = routes.filter((r) => !allowlist.has(r));
  assert.deepEqual(missing, ["/change-error-decision"]);
});

// --- rawSourceScan's own gap, closed: extractWorkerRoutes matched
// `url.pathname === "..."` against raw src/index.ts text, no comment
// stripping. See test/rawSourceScan.test.ts's own history (2026-09-11) --
// verified rigorously here rather than left as "likely safe, not checked".

test("(synthetic) the vulnerability: a route mentioned only in a comment must not be extracted as a real one", () => {
  const withPhantom = `if (url.pathname === "/real-route") { return handleReal(); }\n// used to check url.pathname === "/old-phantom-route" before the rewrite\n`;
  const routes = extractWorkerRoutes(withPhantom);
  assert.deepEqual(routes, ["/real-route"], `a comment-only route was extracted as real: ${JSON.stringify(routes)}`);
});

test("(synthetic) a real, uncommented route is still extracted correctly after stripping", () => {
  const real = `if (url.pathname === "/real-route") { return handleReal(); }\n`;
  assert.deepEqual(extractWorkerRoutes(real), ["/real-route"]);
});

test("control: extractWorkerRoutes finds the routes actually present in src/index.ts, including /change-error-decision itself", () => {
  const indexTs = readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
  const routes = extractWorkerRoutes(indexTs);
  for (const expected of ["/change-run", "/change-stop", "/change-resume", "/change-error-decision", "/change-plan-decision"]) {
    assert.ok(routes.includes(expected), `expected extractWorkerRoutes to find ${expected}`);
  }
});
