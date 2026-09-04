// FOR EACH REMAINING MUTATION, WHICH TEST FILE ACTUALLY GUARDS IT?
//
// scripts/mutate.mjs --all proves a mutation by re-running the WHOLE suite
// and checking the named test is among the failures. That is correct and it
// is also why it cannot finish here: 52 mutations against ~860 tests is over
// an hour of unbroken runtime, and this environment reaps long processes.
//
// _mutcheck.mjs already proves the same thing against ONE bundled test file
// in seconds -- every step tonight used exactly this. The one thing it needs
// that mutate.mjs's manifest does not directly give it is: which test FILE
// contains the `expect` string. This resolves that, once, by grepping every
// test/*.ts file for each remaining mutation's `expect` substring.
//
// A MUTATION WHOSE expect MATCHES NO TEST FILE IS A FINDING, NOT AN
// INCONVENIENCE. It means the control names a test that was renamed or never
// existed under that name -- exactly what AUDIT-PROTOCOL.md's mutate.mjs
// comment calls a "broken manifest, not a weak control". Reported separately;
// nothing here guesses a file for it.
//
//   node scripts/_mutresolve.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "test", "mutations.json");
const RESULTS_PATH = join(ROOT, "test", ".mutate-results.json");

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")).mutations;
const resultsFile = (() => {
  try { return JSON.parse(readFileSync(RESULTS_PATH, "utf8")); } catch { return { results: [] }; }
})();
const doneIds = new Set(resultsFile.results.map((r) => r.id));
const pending = manifest.filter((m) => !doneIds.has(m.id));

const testDir = join(ROOT, "test");
const testFiles = readdirSync(testDir).filter((f) => f.endsWith(".test.ts"));
const contents = new Map(testFiles.map((f) => [f, readFileSync(join(testDir, f), "utf8")]));

const resolved = [];
const unresolved = [];
for (const m of pending) {
  if (!m.expect) { unresolved.push({ ...m, reason: "no expect string in the manifest at all" }); continue; }
  const matches = testFiles.filter((f) => contents.get(f).includes(m.expect));
  if (matches.length === 0) { unresolved.push({ ...m, reason: `"${m.expect}" is not in any test/*.test.ts file` }); continue; }
  if (matches.length > 1) { unresolved.push({ ...m, reason: `"${m.expect}" appears in ${matches.length} test files: ${matches.join(", ")} -- ambiguous` }); continue; }
  resolved.push({ ...m, testFile: `test/${matches[0]}` });
}

console.log(`${pending.length} pending, ${resolved.length} resolved to exactly one test file, ${unresolved.length} could not be resolved.\n`);
console.log("id".padEnd(46) + "test file");
console.log("-".repeat(46) + "-".repeat(40));
for (const r of resolved) console.log(r.id.padEnd(46) + r.testFile);

if (unresolved.length) {
  console.log("\n### UNRESOLVED -- these are findings, not skipped work:\n");
  for (const u of unresolved) console.log(`###   ${u.id} (${u.file})\n###     ${u.reason}`);
}

// Machine-readable, for the driver that runs _mutcheck.mjs per row.
writeFileSync(join(ROOT, "test", ".mutresolve.json"), JSON.stringify({ resolved, unresolved }, null, 2));
