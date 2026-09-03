// =============================================================================
// BREAK IT ON PURPOSE, AND MAKE THAT CHEAP ENOUGH TO ALWAYS DO
//
// AUDIT-PROTOCOL.md §6 states the standard: "A green suite is not evidence a
// control exists. It is evidence that nothing currently disagrees with it. The
// only evidence a control exists is that breaking it turns something red."
//
// The standard has been in the document for weeks and is met perhaps half the
// time, and the reason is not that anyone disagrees with it. It is that meeting
// it by hand is four fiddly steps -- edit the source, remember exactly what you
// edited, run a 40-second suite, put it back -- and the fourth step is the one
// that goes wrong. So the standard gets met when someone is being careful, and
// skipped when they are in the middle of something, which is precisely when a
// new control is most likely to be wrong.
//
// THE EVIDENCE THAT THIS IS REAL, FROM ONE DAY
//
//   - a page-count guard that published a count from a RED run, one commit
//     before the guard meant to stop that landed
//   - the fix for that guard then DEADLOCKED: the only tool that could clear a
//     stale count refused to run while the count was stale
//   - the fix for THAT could never fire at all, because its parser also matched
//     the summary header "✖ failing tests:" and so its every() was always false
//   - two comments in one commit disagreeing 6x about the same mesh
//   - a test asserting the exact prose of an error message
//
// Every one was found by running something. None by re-reading it. And three of
// the five were in code written specifically to enforce honesty about
// verification -- which is the tell. A control feels finished the moment it is
// written, and writing it is exactly what produces the confidence that it works.
//
// WHAT THIS DOES
//
//   node scripts/mutate.mjs --all
//   node scripts/mutate.mjs --id apron-alignment
//   node scripts/mutate.mjs --file public/sky.js --find "..." --replace "..." \
//                           --expect "at the orbit Mark was flying"
//
// For each mutation: assert the target text is present and UNAMBIGUOUS, hash the
// file, apply, verify the edit landed on disk, run the real suite, classify the
// result, restore, and verify the restore by hash. Exit non-zero unless every
// mutation was CAUGHT.
//
// THREE OUTCOMES, AND THE MIDDLE ONE IS THE POINT
//
//   CAUGHT        the suite went red, and the named test is among the failures
//   SURVIVED      the suite stayed green -- the control does not exist
//   INCONCLUSIVE  the edit did not apply, applied in more than one place, or
//                 the suite was ALREADY red before the mutation
//
// INCONCLUSIVE is never a pass. AUDIT-PROTOCOL.md §5.3 records that a mutation
// that did not apply has produced a false "verified" twice in this project, both
// times with sed patterns that silently matched nothing. This refuses to report
// a result it did not observe -- the same rule the pipeline itself is built on.
// =============================================================================
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "test", "mutations.json");

// WHERE THE BACKUP LIVES, AND WHY NOT /tmp.
//
// The first version put backups in os.tmpdir(). Then the very first run of this
// script was killed by SIGKILL mid-mutation -- no handler fires on SIGKILL -- and
// by the time anyone looked, /tmp had been cleared. `public/city-plan.js` was
// sitting on disk with GROUND_SPAN mutated from 4.5 to 3.5 and the only copy of
// the original was gone. It was recoverable from git, which is luck, not design:
// the same crash against an UNCOMMITTED file would have destroyed work.
//
// A restore path that depends on a directory the operating system is entitled to
// empty is not a restore path. So: the original is held in memory for the normal
// and signal cases, and the on-disk copy exists for the case where this process
// dies without running anything -- which means it has to still be there tomorrow.
// _TO-DELETE/ is already gitignored and is where this project quarantines things
// rather than deleting them.
const BACKUPS = join(ROOT, "_TO-DELETE", "mutate-backups");
// Written before the first edit, removed after the last restore. If it is still
// here at startup, a previous run died between those two points and something on
// disk is still mutated.
const MARKER = join(BACKUPS, "IN-PROGRESS.json");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

function args() {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  return { all: a.includes("--all"), id: get("--id"), file: get("--file"),
           find: get("--find"), replace: get("--replace"), expect: get("--expect") };
}

/** Run the node suite and report which tests failed, by name. */
function runSuite() {
  let out = "";
  let exit = 0;
  try {
    out = execFileSync(process.execPath, [join(ROOT, "test", "run.mjs")],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: process.env });
  } catch (e) {
    out = String(e.stdout || "");
    exit = e.status ?? 1;
  }
  const m = out.match(/^(?:#|ℹ) fail (\d+)$/m);
  const fail = m ? Number(m[1]) : null;
  // Same parse as gen-test-count.mjs, INCLUDING the header filter -- that header
  // is what made the exemption in gen-test-count dead code on its first version,
  // and this file would have inherited the identical bug by copying the pattern
  // without the lesson.
  const failing = [...out.matchAll(/^(?:not ok \d+ - |✖ )(.+?)(?: \(\d|$)/gm)]
    .map((x) => x[1].trim())
    .filter((n) => n !== "failing tests:");
  // Every test name the run reported, passing or failing. Used to check that a
  // mutation's `expect` still refers to a test that exists.
  const all = [...out.matchAll(/^(?:ok \d+ - |✔ |✖ )(.+?)(?: \(\d|$)/gm)]
    .map((x) => x[1].trim())
    .filter((n) => n !== "failing tests:");
  return { fail, failing: [...new Set(failing)], all: [...new Set(all)], exit, out };
}

function applyMutation(mut, baseline) {
  const target = join(ROOT, mut.file);
  const before = readFileSync(target, "utf8");

  // AMBIGUITY IS INCONCLUSIVE. A `find` that matches twice would mutate both and
  // the result would not be about the control under test.
  const hits = before.split(mut.find).length - 1;
  if (hits === 0) return { status: "INCONCLUSIVE", why: `the text to mutate is not in ${mut.file} -- it has been renamed or reworded` };
  if (hits > 1) return { status: "INCONCLUSIVE", why: `the text to mutate appears ${hits} times in ${mut.file}; narrow it` };

  mkdirSync(BACKUPS, { recursive: true });
  const backup = join(BACKUPS, mut.file.replace(/[\\/]/g, "__"));
  copyFileSync(target, backup);
  const originalHash = sha(target);
  // The marker is what makes a SIGKILL recoverable BY A HUMAN. Nothing in this
  // process runs after SIGKILL, so the only thing that can help is a note left
  // on disk beforehand saying exactly what was about to be changed and where the
  // original is.
  writeFileSync(MARKER, JSON.stringify({
    startedAt: new Date().toISOString(),
    mutating: mut.file, id: mut.id, backup, originalHash,
    ifYouAreReadingThis: "a mutation run died before restoring. Copy the backup " +
      "back over the file above, or `git checkout -- " + mut.file + "` if it was committed.",
  }, null, 2));

  // Restore on ANY exit this process can still act on -- return, throw, SIGINT,
  // SIGTERM. The IN-MEMORY copy is the source of truth, not the file: `before`
  // is already in hand and cannot be cleared by anything outside this process,
  // which is exactly how the first version lost an original to a /tmp sweep.
  const restore = () => {
    try {
      writeFileSync(target, before);
      if (sha(target) !== originalHash) {
        console.error(`\n### RESTORE FAILED for ${mut.file}. A copy is at ${backup}. Do not commit.`);
        process.exitCode = 2;
        return;
      }
      try { rmSync(MARKER, { force: true }); } catch { /* the marker is advisory */ }
    } catch (e) {
      console.error(`\n### RESTORE THREW for ${mut.file}: ${e.message}. Backup: ${backup}`);
      process.exitCode = 2;
    }
  };
  const onSignal = () => { restore(); process.exit(130); };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    writeFileSync(target, before.replace(mut.find, mut.replace));
    // VERIFY THE EDIT LANDED. Reading the file back is the whole difference
    // between a measurement and an assumption.
    const after = readFileSync(target, "utf8");
    if (after === before) return { status: "INCONCLUSIVE", why: "the file is unchanged after the write" };
    // A DELETION MUTATION NEEDS THE OPPOSITE CHECK, and the obvious one is
    // vacuous: `after.includes("")` is true for every string ever, so a mutation
    // whose replacement is "" would report "the edit landed" without looking at
    // anything. Deleting a line is one of the most useful mutations there is --
    // "remove this alias", "remove this guard" -- so this is not a corner case.
    const landed = mut.replace === ""
      ? !after.includes(mut.find)
      : after.includes(mut.replace);
    if (!landed) {
      return { status: "INCONCLUSIVE", why: mut.replace === ""
        ? "the text that was supposed to be deleted is still in the file"
        : "the replacement text is not in the file after the write" };
    }

    const r = runSuite();
    if (r.fail === null) return { status: "INCONCLUSIVE", why: "could not read a fail count from the runner" };
    if (r.fail === 0) return { status: "SURVIVED", why: "the suite stayed green with the control broken", failing: [] };

    const named = mut.expect
      ? r.failing.some((n) => n.includes(mut.expect))
      : true;
    if (!named) {
      return {
        status: "SURVIVED", failing: r.failing,
        why: `the suite went red, but not on "${mut.expect}" -- something else broke, so this control is still undefended`,
      };
    }
    return { status: "CAUGHT", failing: r.failing };
  } finally {
    restore();
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }
}

// ---------------------------------------------------------------------------

const opts = args();
let mutations = [];
if (opts.file && opts.find && opts.replace != null) {
  mutations = [{ id: "ad-hoc", file: opts.file, find: opts.find, replace: opts.replace, expect: opts.expect, guards: "(ad hoc)" }];
} else {
  if (!existsSync(MANIFEST)) { console.error(`no ${MANIFEST}`); process.exit(1); }
  mutations = JSON.parse(readFileSync(MANIFEST, "utf8")).mutations;
  if (opts.id) mutations = mutations.filter((m) => m.id === opts.id);
  if (!mutations.length) { console.error(`no mutation with id "${opts.id}"`); process.exit(1); }
}

// THE BASELINE COMES FIRST, AND A RED BASELINE STOPS EVERYTHING.
//
// This is the blind audit's own §7 finding, made mechanical: "a protocol that
// only says 'break it and watch it go red' has no step for 'it was already red
// before I broke anything'". Against a red baseline every result below would be
// meaningless, because the mutation's effect cannot be separated from the
// failure that was already there.
// DID THE LAST RUN DIE MID-MUTATION?
//
// SIGKILL runs nothing. The first ever run of this script was killed by a harness
// timeout while a mutation was applied, and the mutated source sat on disk until
// somebody happened to read a diff. Nothing announced it. The next run would have
// found a red baseline and refused -- correct, but for a reason that looks like a
// broken test rather than a leftover edit, which is the kind of misdirection that
// costs an hour.
if (existsSync(MARKER)) {
  const m = JSON.parse(readFileSync(MARKER, "utf8"));
  console.error(
    `### A PREVIOUS RUN DIED WHILE ${m.mutating} WAS MUTATED (${m.id}, ${m.startedAt}).\n` +
    `### That file is probably still broken on disk. Restore it:\n` +
    `###     git checkout -- ${m.mutating}\n` +
    `### or copy back:  ${m.backup}\n` +
    `### Then delete ${MARKER} and run this again.`,
  );
  process.exit(2);
}

console.log("running the unmutated suite first, to establish a baseline...\n");
const baseline = runSuite();
if (baseline.fail === null) { console.error("could not read the baseline fail count"); process.exit(1); }
if (baseline.fail > 0) {
  console.error(`### THE SUITE IS ALREADY RED: ${baseline.fail} failing before any mutation.`);
  console.error("### " + baseline.failing.join("\n### "));
  console.error("###\n### Every mutation result would be inconclusive against this, because the\n" +
                "### mutation's effect could not be told apart from the failure already there.\n" +
                "### Fix the suite, then run this.");
  process.exit(1);
}
// EVERY `expect` MUST NAME A TEST THAT EXISTS.
//
// `expect` is a reference to a test by name, and nothing enforced that the name
// was still real. Renaming a test -- which happens whenever a finding is better
// understood -- left the manifest pointing at a name that no longer existed, and
// the mutation then SURVIVED for a reason that had nothing to do with the code:
// the suite went red, the named test was not among the failures because it was
// not among anything, and seven minutes were spent discovering it.
//
// The baseline run just listed every test in the suite, so this costs nothing.
// A stale reference is caught before any mutation runs rather than after all of
// them, and it is reported as what it is -- a broken manifest, not a weak
// control.
const stale = mutations.filter((m) => m.expect && !baseline.all.some((n) => n.includes(m.expect)));
if (stale.length) {
  console.error("### THESE MUTATIONS NAME TESTS THAT DO NOT EXIST:\n");
  for (const m of stale) console.error(`###   ${m.id}\n###     expects: "${m.expect}"`);
  console.error(
    "\n### The test was probably renamed. A mutation whose expect cannot match\n" +
    "### will always report SURVIVED, whatever the code does -- which reads as a\n" +
    "### missing control when it is a stale reference. Fix test/mutations.json.",
  );
  process.exit(1);
}

console.log(`baseline green: ${mutations.length} mutation(s) to run, about 45s each.\n`);

const results = [];
for (const mut of mutations) {
  process.stdout.write(`${mut.id.padEnd(28)} ${mut.file} ... `);
  const r = applyMutation(mut, baseline);
  results.push({ ...mut, ...r });
  console.log(r.status + (r.why ? `  -- ${r.why}` : ""));
}

console.log("\n" + "=".repeat(72));
const caught = results.filter((r) => r.status === "CAUGHT");
const bad = results.filter((r) => r.status !== "CAUGHT");
for (const r of results) {
  console.log(`${r.status.padEnd(13)} ${r.id}`);
  console.log(`              guards: ${r.guards}`);
  if (r.status !== "CAUGHT") console.log(`              WHY: ${r.why}`);
}
console.log("=".repeat(72));
console.log(`${caught.length} of ${results.length} controls proved they exist.`);
if (bad.length) {
  console.error(
    `\n### ${bad.length} did not. A control that survives its own mutation is not a\n` +
    "### control -- it is a line of code that has never been disagreed with.",
  );
  process.exit(1);
}
