// THE MARKER-FILE LOCK, SHARED BY EVERY TOOL THAT MUTATES A SOURCE FILE ON
// DISK TO PROVE A CONTROL EXISTS.
//
// scripts/mutate.mjs invented this to survive a SIGKILL mid-mutation: the
// marker records which file is currently mutated, its pre-mutation hash, and
// where the backup is, so a crash leaves a note a human can act on instead of
// a silently-broken tree.
//
// It was never a LOCK against a second process, because mutate.mjs never ran
// two of itself. scripts/_mutcheck.mjs changed that: PART 7b/E1 in
// docs/WORLD-BUILD-PLAN.md records a real race where two `_mutcheck.mjs`
// invocations touched the same source file at once and one read the other's
// in-flight mutation as a red baseline. Nothing was lost that time (confirmed
// by diff afterward), but nothing PREVENTED it either -- the file was mutated
// and restored blind, coordination by luck.
//
// So this module is extracted so both tools hand-off through the exact same
// file, at the exact same path -- coordination through two independent
// marker files would coordinate nothing. `acquireLock` closes the
// check-then-write race with an atomic exclusive create (`wx`): only one of
// two simultaneous callers can win that write, and the loser throws before
// touching anything, exactly the "wait or refuse, never report" the test for
// this module asks for.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BACKUPS = join(ROOT, "_TO-DELETE", "mutate-backups");
export const MARKER = join(BACKUPS, "IN-PROGRESS.json");

export const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

/**
 * Read the marker, if any, and check its claim against the file it names.
 * Existence of the marker is not evidence a file is still mutated -- a run
 * can die after restoring but before unlinking. What IS evidence is the
 * sha256 the marker recorded before it mutated anything, so this hashes the
 * file and compares, rather than trusting the marker's mere presence.
 */
export function markerFileMatches() {
  if (!existsSync(MARKER)) return { present: false, restored: true };
  let m;
  try {
    m = JSON.parse(readFileSync(MARKER, "utf8"));
  } catch (e) {
    return { present: true, unreadable: String(e.message), restored: false, onDisk: null };
  }
  const onDisk = m.mutating && existsSync(m.mutating) ? sha(m.mutating) : null;
  return { present: true, m, onDisk, restored: onDisk === m.originalHash };
}

/**
 * Take the lock for `targetFile` before mutating it. Throws, mutating
 * nothing, if the lock is already held by a run that has not proven itself
 * restored (present && !restored) -- whether that other run is still
 * genuinely active or died without cleaning up, the caller must not proceed
 * on top of it either way. Returns the path of a fresh backup copy, made
 * while still holding the lock so a crash after this point still has
 * something to restore from.
 */
export function acquireLock(targetFile, holder, originalHash) {
  const existing = markerFileMatches();
  if (existing.present && !existing.restored) {
    throw new Error(
      `refusing to run: ${MARKER} says "${existing.m?.mutating ?? "(unreadable)"}" is already mutated, ` +
      `by "${existing.m?.holder ?? "another run"}" started ${existing.m?.startedAt ?? "an unknown time"}. ` +
      "Either that run is still active -- wait for it -- or it died without restoring: run " +
      `\`git checkout -- ${existing.m?.mutating ?? "<file>"}\` or copy back ${existing.m?.backup ?? "its backup"}, then retry.`,
    );
  }
  // A present-but-restored marker is stale bookkeeping, not a lock -- clear
  // it before taking a fresh one so the JSON below is this run's alone.
  if (existing.present) { try { rmSync(MARKER, { force: true }); } catch { /* advisory */ } }

  mkdirSync(BACKUPS, { recursive: true });
  // `:` MUST BE SANITIZED TOO, NOT JUST PATH SEPARATORS.
  //
  // targetFile is now an absolute path (E1 needs one identity across tools
  // and cwds), so on Windows it carries a drive letter: "C:\Code\...". The
  // first version of this line only replaced `\` and `/`, leaving
  // "C:__Code__...__CLAUDE.md" as the backup filename -- and NTFS treats a
  // colon after the first character as an Alternate Data Stream separator,
  // not a literal character. That silently created an empty file named "C"
  // with the real 5,392 bytes of backup content hidden in a stream
  // (`C:__Code__sandbox-spike__CLAUDE.md`) that readFileSync(backup) would
  // never see -- a backup that LOOKS like it exists and restores nothing.
  // Found by inspecting the file with `Get-Item -Stream *` after a real run
  // left it behind, not by reasoning about it in advance.
  const backup = join(BACKUPS, targetFile.replace(/[\\/:]/g, "__"));
  writeFileSync(backup, readFileSync(targetFile));

  try {
    // wx: create-exclusive. If another process's acquireLock() call raced
    // this one between the check above and this write, exactly one write
    // wins -- the loser gets EEXIST here, not a silently shared lock.
    writeFileSync(MARKER, JSON.stringify({
      startedAt: new Date().toISOString(),
      mutating: targetFile,
      holder,
      backup,
      originalHash,
    }, null, 2), { flag: "wx" });
  } catch (e) {
    if (e && e.code === "EEXIST") {
      throw new Error(
        `refusing to run: another process took the lock on ${MARKER} first, ` +
        "between this run's own check and its write. Retry.",
      );
    }
    throw e;
  }
  return { backup };
}

/** Release the lock. Advisory on failure -- the file being gone is what matters, not this call succeeding. */
export function releaseLock() {
  try { rmSync(MARKER, { force: true }); } catch { /* advisory */ }
}
