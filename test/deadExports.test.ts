// I2 (docs/BUILD-LOOP.md Step 2 plan, approved 2026-09-08): the gate.
//
// test/importsResolve.test.ts asks "does every import resolve to a real
// export". This asks the direction nothing has ever checked: does every
// export have a caller. docs/AUDIT-LEDGER.md line 90 found one instance by
// hand -- decideGroundingOutcome, "tested in 4 places and used in 0" -- and
// recorded it rather than building a gate. It then happened eight more
// times (docs/AUDIT-PROTOCOL.md's pattern E). This is the gate.
//
// TEST-ONLY USAGE IS NOT A CALLER. An export imported only from test/ is
// exactly decideGroundingOutcome's shape: exercised, never wired to
// anything a real page or Worker request reaches. buildReverseMap already
// keeps callers and testCallers separate; this gate treats both as failing
// unless allowlisted, but reports which shape each failure is, because they
// are different findings (docs/AUDIT-PROTOCOL.md's own standard: name what
// is wrong, not just that something is).
//
// THE ESCAPE HATCH HAS TO BE HONEST. Every uncalled export is removed,
// wired, or allowlisted with a written reason -- test/deadExports.allowlist.json,
// one sentence per entry, not the word "intentional" (a cheap mechanical
// check below refuses that literal word and anything implausibly short, but
// a sentence that says nothing is still a human failure this test cannot
// catch by itself). Seeded from this gate's own first real run over the
// committed tree -- see that file's own header for what "seeded" means and
// why it is not yet "earned".
//
// THE ALLOWLIST MUST PRUNE ITSELF. An entry that no longer names a
// currently-uncalled export (the export was wired up, renamed, or removed)
// is stale and this gate fails on it too -- otherwise the allowlist only
// ever grows, which is the same shape of drift as never having a gate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadModuleFiles, buildReverseMap, isTestPath, displayPath } from "../scripts/lib/module-graph.mjs";

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
const ALLOWLIST_PATH = join(ROOT, "test", "deadExports.allowlist.json");

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

test("every export in public/ and src/ has a real (non-test) caller, or a written reason in test/deadExports.allowlist.json", () => {
  const files = loadModuleFiles({ publicDir: PUBLIC, srcDir: SRC });
  const map = buildReverseMap(files, isTestPath);
  const allowlist = loadAllowlist();

  const uncalled: { key: string; testOnly: boolean }[] = [];
  for (const [filePath, exportsByName] of map) {
    const relFile = displayPath(ROOT, filePath);
    for (const [exportName, entry] of exportsByName) {
      if (entry.callers.size > 0) continue; // real caller -- not this gate's business
      const key = `${relFile}:${exportName}`;
      if (Object.prototype.hasOwnProperty.call(allowlist, key)) continue; // allowlisted below
      uncalled.push({ key, testOnly: entry.testCallers.size > 0 });
    }
  }
  uncalled.sort((a, b) => a.key.localeCompare(b.key));

  if (uncalled.length > 0) {
    const lines = uncalled.map((u) => `  ${u.key}${u.testOnly ? "  (imported only by a test -- decideGroundingOutcome's own shape)" : "  (no importer at all)"}`);
    assert.fail(
      `${uncalled.length} export(s) have no real caller and no allowlist entry:\n${lines.join("\n")}\n\n` +
      `Each one must be removed, wired up, or added to test/deadExports.allowlist.json with a written reason ` +
      `(a sentence, not the word "intentional").`,
    );
  }
});

test("every test/deadExports.allowlist.json entry still names a currently-uncalled export, and gives a real reason", () => {
  const files = loadModuleFiles({ publicDir: PUBLIC, srcDir: SRC });
  const map = buildReverseMap(files, isTestPath);
  const allowlist = loadAllowlist();

  const byKey = new Map<string, { callers: Set<string>; testCallers: Set<string> } | undefined>();
  for (const [filePath, exportsByName] of map) {
    const relFile = displayPath(ROOT, filePath);
    for (const [exportName, entry] of exportsByName) byKey.set(`${relFile}:${exportName}`, entry);
  }

  const stale: string[] = [];
  const weakReason: string[] = [];
  for (const [key, reason] of Object.entries(allowlist)) {
    const entry = byKey.get(key);
    if (!entry) { stale.push(`${key} -- no such export exists any more (renamed, removed, or the key is wrong)`); continue; }
    if (entry.callers.size > 0) { stale.push(`${key} -- now has a real caller (${[...entry.callers][0]}); remove this line`); continue; }
    const trimmed = reason.trim();
    if (trimmed.length < 12 || /^intentional\.?$/i.test(trimmed) || /^seeded$/i.test(trimmed)) {
      weakReason.push(`${key} -- reason is "${reason}", not a sentence`);
    }
  }

  assert.deepEqual(stale, [], `stale allowlist entr${stale.length === 1 ? "y" : "ies"} (the export was wired up, renamed, or removed -- update the allowlist to match):\n  ${stale.join("\n  ")}`);
  assert.deepEqual(weakReason, [], `allowlist entr${weakReason.length === 1 ? "y" : "ies"} without a real written reason:\n  ${weakReason.join("\n  ")}`);
});
