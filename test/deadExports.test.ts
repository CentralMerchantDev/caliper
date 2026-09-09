// I2 (docs/BUILD-LOOP.md Step 2 plan, approved 2026-09-08): the gate.
// UPGRADED to reachability (Mark's own review, same day): "does anything
// import this" and "is this reachable from what a visitor or the Worker
// actually runs" are different questions, and they can disagree.
// roadkit.js's junction and roundabout DO have a caller
// (roadkit-street-demo.js) -- but that caller is a demo page nothing else
// imports, so the piece is not reachable from anything real. Import
// counting alone could not see that; this gate now walks reachability from
// three declared entry-point classes instead.
//
// PRODUCT   wrangler.jsonc's "main" (src/index.ts) and the module scripts
//           in public/index.html and public/city.html -- what a visitor's
//           browser or the Worker itself actually loads.
// DEMO      every other html page in public/, and their scripts.
// TEST      anything under test/.
//
// Only PRODUCT passes without justification. demo-only, test-only and
// unreachable all need a written reason in test/deadExports.allowlist.json --
// demo-only and test-only are not failures of the SAME severity as
// unreachable (a demo page is real, deliberate code; an unreachable export
// may be genuinely dead), but neither is "wired" in the sense that matters:
// nothing a visitor or the platform runs would notice if either disappeared.
//
// THE PLATFORM CAN BE A CALLER TOO. src/index.ts's own `default` export and
// SpendCounterDO (CALIPER's spend-cap Durable Object, bound in
// wrangler.jsonc, never imported by any other JS file) are reached by the
// Cloudflare platform reading wrangler.jsonc directly -- no JS import could
// ever see that. platformReachableExports seeds these as "product" before
// any graph walk runs. The guard below is the second, independent line of
// defence Mark asked for: even if the reachability walk itself ever has a
// bug, an export named in wrangler.jsonc must never be allowlisted as dead.
// That specific mistake -- "wire or remove" the live spend cap -- must not
// be possible twice.
//
// THE ESCAPE HATCH HAS TO BE HONEST. Every export that is not product-
// reachable is removed, wired to something product-reachable, or
// allowlisted with a written reason -- test/deadExports.allowlist.json, one
// sentence per entry, not the word "intentional". Seeded from this gate's
// own first reachability-aware run over the committed tree -- see that
// file's own header for what "seeded" means and why it is not yet "earned".
//
// THE ALLOWLIST MUST PRUNE ITSELF. An entry that no longer names a
// non-product export (wired up, promoted from demo-only by a new product
// caller, renamed, or removed) is stale and this gate fails on it too --
// otherwise the allowlist only ever grows, which is the same shape of drift
// as never having a gate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadModuleFiles, displayPath, classifyRepoReachability } from "../scripts/lib/module-graph.mjs";

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
const SRC = join(ROOT, "src");
const TEST = join(ROOT, "test");
const ALLOWLIST_PATH = join(ROOT, "test", "deadExports.allowlist.json");
const WRANGLER_PATH = join(ROOT, "wrangler.jsonc");

interface AllowlistFile {
  _comment?: unknown;
  entries: Record<string, string>;
}

function loadAllowlist(): Record<string, string> {
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")) as AllowlistFile;
  if (!raw.entries || typeof raw.entries !== "object") {
    throw new Error(`${ALLOWLIST_PATH} must have an "entries" object`);
  }
  return raw.entries;
}

/** The full reachability classification, computed once and shared by every test below -- one graph walk, not one per assertion. */
function classifyRepo() {
  const wranglerText = readFileSync(WRANGLER_PATH, "utf8");
  const { classified } = classifyRepoReachability({ publicDir: PUBLIC, srcDir: SRC, testDir: TEST, repoRoot: ROOT, wranglerText });

  // Keyed by the SAME "relPath:exportName" shape the allowlist uses, so
  // every other test in this file works from one flat map rather than
  // re-walking the nested `Map<file, Map<export, ...>>` structure itself.
  const byKey = new Map<string, { state: string; via: string | null }>();
  for (const [filePath, exportsByName] of classified) {
    const relFile = displayPath(ROOT, filePath);
    for (const [exportName, entry] of exportsByName) {
      byKey.set(`${relFile}:${exportName}`, { state: entry.state, via: entry.via });
    }
  }
  return { byKey };
}

// A gap this project's own parser names as real, not hidden: findExportedNames
// (scripts/lib/module-graph.mjs) does not recognise `export * from "..."` --
// an export reachable only through a wildcard re-export chain would look
// uncalled when it is not. There are zero occurrences today. This asserts
// that stays true rather than trusting the comment describing it to still be
// correct later -- the exact distinction Mark's review drew: "a known gap
// guarded by a comment is how this project got nine pattern-E instances; a
// known gap guarded by an assertion cannot silently become a wrong answer."
test("no `export * from` anywhere in public/ or src/ -- the reverse map does not support wildcard re-exports yet", () => {
  const files = loadModuleFiles({ publicDir: PUBLIC, srcDir: SRC });
  const offenders: string[] = [];
  for (const file of files) {
    if (/^export\s*\*/m.test(file.source)) offenders.push(displayPath(ROOT, file.path));
  }
  assert.deepEqual(
    offenders, [],
    `wildcard re-export(s) found in ${offenders.join(", ")} -- the dead-export gate cannot see exports reached ` +
    `only through these and would silently under-report. Extend buildReverseMap's findExportedNames to handle ` +
    `\`export * from\` before adding one, or this gate's results are not trustworthy for the affected file(s).`,
  );
});

test("every export in public/ and src/ is product-reachable, or has a written reason in test/deadExports.allowlist.json", () => {
  const { byKey } = classifyRepo();
  const allowlist = loadAllowlist();

  const notProduct: { key: string; state: string }[] = [];
  for (const [key, { state }] of byKey) {
    if (state === "product") continue;
    if (Object.prototype.hasOwnProperty.call(allowlist, key)) continue;
    notProduct.push({ key, state });
  }
  notProduct.sort((a, b) => a.key.localeCompare(b.key));

  if (notProduct.length > 0) {
    const lines = notProduct.map((u) => `  ${u.key}  (${u.state})`);
    assert.fail(
      `${notProduct.length} export(s) are not product-reachable and have no allowlist entry:\n${lines.join("\n")}\n\n` +
      `Each one must be removed, wired to something product-reachable, or added to ` +
      `test/deadExports.allowlist.json with a written reason (a sentence, not the word "intentional").`,
    );
  }
});

test("every test/deadExports.allowlist.json entry still names a currently-non-product export, and gives a real reason", () => {
  const { byKey } = classifyRepo();
  const allowlist = loadAllowlist();

  const stale: string[] = [];
  const weakReason: string[] = [];
  for (const [key, reason] of Object.entries(allowlist)) {
    const entry = byKey.get(key);
    if (!entry) { stale.push(`${key} -- no such export exists any more (renamed, removed, or the key is wrong)`); continue; }
    if (entry.state === "product") { stale.push(`${key} -- now product-reachable (via ${entry.via}); remove this line`); continue; }
    const trimmed = reason.trim();
    if (trimmed.length < 12 || /^intentional\.?$/i.test(trimmed) || /^seeded$/i.test(trimmed)) {
      weakReason.push(`${key} -- reason is "${reason}", not a sentence`);
    }
  }

  assert.deepEqual(stale, [], `stale allowlist entr${stale.length === 1 ? "y" : "ies"} (the export is now product-reachable -- update the allowlist to match):\n  ${stale.join("\n  ")}`);
  assert.deepEqual(weakReason, [], `allowlist entr${weakReason.length === 1 ? "y" : "ies"} without a real written reason:\n  ${weakReason.join("\n  ")}`);
});

// THE GUARD MARK ASKED FOR, GENUINELY INDEPENDENT OF THE REACHABILITY WALK
// ABOVE, NOT JUST A SECOND CALL INTO THE SAME MACHINERY.
//
// SpendCounterDO was found dead because nothing in the JS graph could see a
// wrangler.jsonc binding -- fixed by teaching the walk about the platform
// (platformReachableExports, used by classifyRepo() above). Checking that
// SAME function's output against the allowlist here would not be a second
// line of defence: a bug in platformReachableExports itself would make both
// checks blind in exactly the same way at exactly the same time, which is
// not independence, it is the same check run twice. So this reads
// wrangler.jsonc directly, by itself, and asks the simplest possible
// question: does any allowlist entry's EXPORT NAME (the part after the
// last ":") match a class_name wrangler.jsonc declares? No reachability
// graph, no forward dependency walk, no file resolution -- if this ever
// disagrees with the classification above, something is badly wrong, and
// disagreeing is exactly what makes it worth having.
test("nothing wrangler.jsonc declares as a durable_objects class_name is ever allowlisted as unwired, checked independently of the reachability graph", () => {
  const wranglerText = readFileSync(WRANGLER_PATH, "utf8");
  const declaredNames = new Set([...wranglerText.matchAll(/"class_name"\s*:\s*"([^"]+)"/g)].map((m) => m[1]));
  const allowlist = loadAllowlist();
  const violations = Object.keys(allowlist).filter((key) => declaredNames.has(key.split(":").pop()!));
  assert.deepEqual(
    violations, [],
    `wrangler.jsonc-declared class_name(s) found in the allowlist: ${violations.join(", ")} -- ` +
    `these are bound by the Cloudflare platform directly, never through a JS import. Allowlisting ` +
    `one as "unwired" is a live production risk; remove the allowlist entry.`,
  );
});
