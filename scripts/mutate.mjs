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

/**
 * Read the leftover-mutation marker, if any, and check its claim against the
 * file it names.
 *
 * Existence of the marker is not evidence: a run can die after restoring but
 * before unlinking, and the unlink can fail on a read-only or permission-odd
 * mount. What IS evidence is the sha256 the marker recorded before it mutated
 * anything. So every question about "is a file still mutated" is answered by
 * hashing the file, here, in one place, rather than by three callers each
 * deciding what the marker's presence implies.
 *
 * Returns `{ present: false }` when there is no marker, otherwise the parsed
 * marker plus `onDisk` (the file's current hash, or null if it is missing) and
 * `restored` (whether the file is byte-identical to its pre-mutation state).
 */
function markerFileMatches() {
  if (!existsSync(MARKER)) return { present: false, restored: true };
  let m;
  try {
    m = JSON.parse(readFileSync(MARKER, "utf8"));
  } catch (e) {
    // An unreadable marker is itself a reason to stop: something wrote it and
    // died, and its contents were the only record of what to put back.
    return { present: true, unreadable: String(e.message), restored: false, onDisk: null };
  }
  const onDisk = m.mutating && existsSync(m.mutating) ? sha(m.mutating) : null;
  return { present: true, m, onDisk, restored: onDisk === m.originalHash };
}

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
  // RESTORE RETRIES, AND A FAILURE STOPS EVERYTHING.
  //
  // Two defects, both found on a real run, and the second is the worse one.
  //
  // 1. On Windows a file can be briefly locked by an editor, a watcher or a
  //    virus scanner, and writeFileSync throws `UNKNOWN: unknown error, open`.
  //    That happened to public/city-plan.js. It is transient, so it retries.
  //
  // 2. When it still failed, the run CARRIED ON. It set process.exitCode and
  //    returned, the loop moved to the next mutation, and the final summary
  //    printed "7 of 7 controls proved they exist" -- a success report written
  //    on top of a source file that was still mutated. Worse, the next mutation
  //    touched the SAME file, wrote its own marker, restored cleanly and deleted
  //    the marker, erasing the only on-disk record that anything was wrong. The
  //    mutated GROUND_SPAN then shipped into the working tree and was found by
  //    gen-test-count refusing to publish, one command later.
  //
  // A tool that reports success over a broken tree is worse than one that
  // crashes. So a failed restore is FATAL: it throws, which aborts the loop
  // before any other file is touched, and leaves the marker in place.
  const restore = () => {
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        writeFileSync(target, before);
        if (sha(target) === originalHash) {
          try { rmSync(MARKER, { force: true }); } catch { /* the marker is advisory */ }
          return;
        }
        lastErr = new Error("the file on disk does not match the original after writing it back");
      } catch (e) {
        lastErr = e;
      }
      // Busy-wait rather than async: this runs inside a finally block, and an
      // await here would let the loop continue before the file was back.
      const until = Date.now() + 120 * (attempt + 1);
      while (Date.now() < until) { /* let the lock clear */ }
    }
    console.error(
      `\n### RESTORE FAILED for ${mut.file} after 5 attempts: ${lastErr?.message}\n` +
      `###\n### THAT FILE IS STILL MUTATED ON DISK. Put it back before anything else:\n` +
      `###     git checkout -- ${mut.file}\n` +
      `### or copy from ${backup}\n` +
      `###\n### Stopping here. Continuing would touch other files and bury this.`,
    );
    throw new Error(`restore failed for ${mut.file}`);
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
    if (r.fail === null) {
      // THE HARNESS BROKE, WHICH IS NOT THE SAME AS A CONTROL FAILING.
      //
      // No fail count means the suite did not RUN -- a file did not build, the
      // runner crashed, something outside this mutation went wrong. That says
      // nothing about the control, and it will say nothing about the next
      // twenty either, because whatever broke is still broken.
      //
      // This used to return INCONCLUSIVE and carry on. Measured on a real run:
      // `git add -A` renormalised line endings on a 4 MB tier-models.js while
      // this was running, esbuild read the file mid-rewrite, and the run
      // produced 14 consecutive INCONCLUSIVE results over about ten minutes
      // before reporting "10 of 24 controls proved they exist" -- which reads
      // as fourteen weak controls and was nothing of the sort.
      //
      // So it throws, which the caller turns into an abort. One honest "the
      // harness broke, fix that first" beats fourteen findings about nothing.
      const e = new Error(
        `the suite did not run for mutation "${mut.id}" -- no fail count.\n` +
        "This is the HARNESS failing, not the control. Nothing after this point would mean anything.\n" +
        "Most likely something else is writing to the tree: another editor, a git checkout, or a\n" +
        "`git add` renormalising line endings. Let the tree settle, then run this again.",
      );
      e.harnessBroke = true;
      throw e;
    }
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

  // CLEAR THE MARKER ONLY ON PROOF, NEVER ON ASSERTION.
  //
  // The marker used to end with "then delete this file and run again", which
  // asks a human to certify a repair by hand -- the same move this project
  // keeps finding to be the source of false confidence. Whoever deletes it is
  // stating the file is fixed; nothing checks that it is.
  //
  // The marker already carries the sha256 of the file as it was BEFORE the
  // mutation, so the claim is checkable. Hash the file. If it matches, the
  // restore genuinely happened -- by git checkout, by copying the backup, by
  // hand, it does not matter which -- and the marker can go. If it does not
  // match, refuse, and say so in terms of the file rather than the marker.
  //
  // This is the one deletion in this repo that is allowed to be automatic,
  // because it is the one where the tool can prove the thing the file exists
  // to warn about is no longer true.
  const onDisk = markerFileMatches().onDisk;
  if (onDisk === m.originalHash) {
    // If the unlink itself fails -- a read-only mount, a permission quirk --
    // that is not a reason to abort. The file is proven restored, which is the
    // thing that mattered; the marker is only a note. Every later check reads
    // the hash rather than the marker's existence, so a stuck marker cannot
    // turn into a false alarm at the end of the run.
    try { rmSync(MARKER, { force: true }); } catch { /* the marker is advisory */ }
    console.log(
      `a previous run died while ${m.mutating} was mutated (${m.id}, ${m.startedAt}),\n` +
      "but that file now matches its pre-mutation hash exactly, so it was restored.\n" +
      "clearing the marker and continuing.\n",
    );
  } else {
    console.error(
      `### A PREVIOUS RUN DIED WHILE ${m.mutating} WAS MUTATED (${m.id}, ${m.startedAt}).\n` +
      `### That file is STILL NOT back to its original contents -- checked, not assumed:\n` +
      `###   expected sha256 ${m.originalHash}\n` +
      `###   found           ${onDisk ?? "(the file does not exist)"}\n` +
      "### Restore it:\n" +
      `###     git checkout -- ${m.mutating}\n` +
      `### or copy back:  ${m.backup}\n` +
      "### Then run this again -- it will clear the marker itself once the file matches.",
    );
    process.exit(2);
  }
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
  let r;
  try {
    r = applyMutation(mut, baseline);
  } catch (e) {
    // Two things throw here, and both mean the same thing: stop.
    //
    //   a restore failure  -- the tree is dirty, and every later result would be
    //                         measured against a source file nobody intended.
    //   a harness failure  -- the suite did not run at all, so every later
    //                         result would be INCONCLUSIVE for the same reason.
    //
    // Either way the results already gathered are still valid and the ones
    // below would not be.
    console.log("ABORTED");
    console.error(`\n### RUN ABORTED after ${results.length} of ${mutations.length} mutations.`);
    console.error(`### ${e.message}`);
    console.error("### The results above this line are still valid. Nothing below ran.");
    if (e.harnessBroke) {
      console.error("###\n### Re-run once the tree is settled; this is not a finding about any control.");
    }
    process.exit(2);
  }
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

// DO NOT REPORT SUCCESS OVER A TREE YOU HAVE NOT CHECKED.
//
// The run that found this printed "7 of 7 controls proved they exist" while
// public/city-plan.js was still mutated on disk. Every restore now aborts on
// failure, so reaching here should mean the tree is clean -- but "should mean"
// is exactly the kind of reasoning this project keeps being punished for, and
// the check costs one stat call.
const leftover = markerFileMatches();
if (leftover.present && !leftover.restored) {
  console.error(
    "### A FILE WAS LEFT MUTATED BY THIS RUN. The results above describe a tree\n" +
    "### that no longer matches what you have on disk.\n" +
    `###   file            ${leftover.m?.mutating ?? "(unreadable marker)"}\n` +
    `###   expected sha256 ${leftover.m?.originalHash ?? "?"}\n` +
    `###   found           ${leftover.onDisk ?? "(the file does not exist)"}\n` +
    `### Restore it:  git checkout -- ${leftover.m?.mutating ?? ""}`,
  );
  process.exit(2);
}

console.log(`${caught.length} of ${results.length} controls proved they exist, and the tree is clean.`);
if (bad.length) {
  console.error(
    `\n### ${bad.length} did not. A control that survives its own mutation is not a\n` +
    "### control -- it is a line of code that has never been disagreed with.",
  );
  process.exit(1);
}
