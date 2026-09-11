// RUN3-CLI-2026-09-09 Item 6 -- a mechanical first pass at splitting
// test/deadExports.allowlist.json's 2,762 "unreachable"/"test-only"/
// "demo-only" entries by REAL mechanism, per UMAA trigger 2 ("a number is
// about to leave the repository... audited first, without exception") --
// no raw count from this allowlist may be published until this split
// exists.
//
// THE FIFTH CLASS THIS FINDS: "data-reachable" -- an export whose bare
// identifier is referenced elsewhere in ITS OWN FILE (a dispatch table
// like buildings.js's own `building()` function, `{ "bld-tower": bldTower,
// ... }`), where the import-graph walker (scripts/lib/module-graph.mjs)
// only tracks cross-file import/export edges and cannot see a local
// object-literal value reference at all. An export used this way is not
// "unreachable" in any real sense -- a visitor's own browser reaches it
// every time that dispatch table is read with the right key -- but the
// current classifier has no way to say so.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const allowlist = JSON.parse(readFileSync(join(ROOT, "test", "deadExports.allowlist.json"), "utf8")).entries;

const byFile = new Map();
for (const key of Object.keys(allowlist)) {
  const idx = key.lastIndexOf(":");
  const file = key.slice(0, idx);
  const name = key.slice(idx + 1);
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(name);
}

const results = { product: 0, demoOnly: 0, testOnly: 0, unreachable: 0, dataReachableCandidate: 0 };
const candidates = [];

for (const [file, names] of byFile) {
  let src;
  try {
    src = readFileSync(join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  for (const name of names) {
    const key = `${file}:${name}`;
    const reason = allowlist[key];
    const isUnreachable = reason.startsWith("unreachable");
    if (reason.startsWith("test-only")) { results.testOnly++; continue; }
    if (reason.startsWith("demo-only")) { results.demoOnly++; continue; }
    if (!isUnreachable) { continue; }

    // Count every occurrence of the bare identifier in this file, minus
    // its own declaration line (export function NAME / export const NAME).
    const declPattern = new RegExp(`export\\s+(function|const|let|class)\\s+${name}\\b`);
    const allOccurrences = [...src.matchAll(new RegExp(`\\b${name}\\b`, "g"))].length;
    const declMatch = src.match(declPattern);
    const declCount = declMatch ? 1 : 0;
    const usedElsewhereInFile = allOccurrences - declCount > 0; // any occurrence beyond the declaration line itself is a real second reference

    if (usedElsewhereInFile) {
      results.dataReachableCandidate++;
      candidates.push({ key, occurrences: allOccurrences });
    } else {
      results.unreachable++;
    }
  }
}

console.log("BREAKDOWN BY REAL MECHANISM (mechanical first pass):");
console.log(JSON.stringify(results, null, 2));
console.log(`\nTotal entries: ${Object.keys(allowlist).length}`);
console.log(`\nFirst 20 data-reachable CANDIDATES (need individual confirmation, not yet verified one by one):`);
for (const c of candidates.slice(0, 20)) console.log(`  ${c.key}  (${c.occurrences} occurrences in its own file)`);
console.log(`\n...${candidates.length} candidates total.`);
