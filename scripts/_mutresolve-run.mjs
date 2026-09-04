// DRIVES _mutcheck.mjs OVER EVERY MUTATION _mutresolve.mjs RESOLVED.
//
// One row at a time: write a scratch one-entry spec, shell out to
// scripts/_mutcheck.mjs (which does its own mutate/run/verify/restore cycle
// against ONE bundled test file, in seconds), read its CAUGHT/SURVIVED/
// INCONCLUSIVE verdict off stdout, and append the result to
// test/.mutate-results.json in the same shape scripts/mutate.mjs writes, so
// H1's record stays one unified file regardless of which tool proved which
// row.
//
//   node scripts/_mutresolve-run.mjs
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_PATH = join(ROOT, "test", ".mutate-results.json");
const RESOLVE_PATH = join(ROOT, "test", ".mutresolve.json");

const { resolved } = JSON.parse(readFileSync(RESOLVE_PATH, "utf8"));

// Manually resolved -- _mutresolve.mjs correctly refused to guess between two
// test files whose test NAMES both happen to contain the mutation's `expect`
// substring. Confirmed by reading each test file directly: worldModel.test.ts
// has "a malformed layer handed to the constructor is REPORTED, not silently
// dropped"; worldStore.test.ts has "a stored record that is not valid JSON is
// REPORTED, not silently dropped". Each mutation's own `file` field names
// which source it targets, and each source has exactly one test file testing
// it -- verified, not assumed, by grepping both files' content above.
const manual = [
  { id: "rejected-layers-are-reported", testFile: "test/worldModel.test.ts" },
  { id: "world-store-reports-corrupt-json", testFile: "test/worldStore.test.ts" },
];
const manifest = JSON.parse(readFileSync(join(ROOT, "test", "mutations.json"), "utf8")).mutations;
for (const m of manual) {
  const mut = manifest.find((x) => x.id === m.id);
  resolved.push({ ...mut, testFile: m.testFile });
}

function loadResults() {
  try { return JSON.parse(readFileSync(RESULTS_PATH, "utf8")); } catch { return { results: [], baseline: null }; }
}
function saveResults(state) { writeFileSync(RESULTS_PATH, JSON.stringify(state, null, 2)); }

const state = loadResults();
const doneIds = new Set(state.results.map((r) => r.id));
const scratchDir = mkdtempSync(join(tmpdir(), "mutresolve-"));

for (const row of resolved) {
  if (doneIds.has(row.id)) { console.log(`${row.id.padEnd(46)} already done, skipping`); continue; }

  const specPath = join(scratchDir, `${row.id}.json`);
  writeFileSync(specPath, JSON.stringify({ mutations: [{ id: row.id, file: row.file, find: row.find, replace: row.replace, expect: row.expect, guards: row.guards }] }, null, 2));

  process.stdout.write(`${row.id.padEnd(46)} ${row.testFile.padEnd(34)} ... `);
  let out;
  try {
    out = execFileSync(process.execPath, [join(ROOT, "scripts", "_mutcheck.mjs"), row.testFile, row.file, specPath], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = String(e.stdout || "") + String(e.stderr || "");
  }

  const line = out.split("\n").find((l) => /^(CAUGHT|SURVIVED|INCONCLUSIVE)\s/.test(l.trim()));
  const restored = /restored: byte identical/.test(out);
  if (!restored) {
    console.log("ABORTED -- restore not confirmed byte-identical. Stopping; inspect the tree before continuing.");
    console.error(out);
    process.exit(2);
  }
  if (!line) {
    console.log("NO VERDICT LINE -- treating as INCONCLUSIVE, see raw output below");
    console.error(out);
    state.results.push({ ...row, status: "INCONCLUSIVE", why: "_mutcheck.mjs produced no CAUGHT/SURVIVED/INCONCLUSIVE line" });
    saveResults(state);
    continue;
  }
  const trimmed = line.trim();
  const status = trimmed.split(/\s+/)[0];
  const why = trimmed.includes("--") ? trimmed.split("--").slice(1).join("--").trim() : undefined;
  console.log(status + (why ? `  -- ${why}` : ""));
  const entry = { ...row, status };
  if (why) entry.why = why;
  delete entry.testFile;
  state.results.push(entry);
  saveResults(state);
}

console.log(`\ndone. ${state.results.length} total mutations recorded in ${RESULTS_PATH}.`);
