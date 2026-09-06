// PART 7b/E1 -- THE LOCK ITSELF, TESTED DIRECTLY, NOT JUST OBSERVED ONCE.
//
// The manual proof (two real `_mutcheck.mjs` processes launched against the
// same file) is in docs/WORLD-BUILD-PLAN.md's PART 7b entry -- it is what
// actually found the race and confirmed the fix against real esbuild/node
// child processes. This is the same contract, in-process, so it runs on
// every suite pass rather than needing a human to launch two terminals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLock, releaseLock, markerFileMatches, sha } from "../scripts/mutate-lock.mjs";

function withScratchFile<T>(fn: (path: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "mutate-lock-test-"));
  const path = join(dir, "scratch.txt");
  writeFileSync(path, "original content");
  try {
    return fn(path);
  } finally {
    releaseLock();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a second acquireLock on a file the first still holds throws, and mutates nothing", () => {
  withScratchFile((path) => {
    const before = readFileSync(path, "utf8");
    acquireLock(path, "holder-a", "irrelevant-hash-a");
    assert.throws(
      () => acquireLock(path, "holder-b", "irrelevant-hash-b"),
      /refusing to run/,
      "a second acquireLock on a held file must throw, not silently succeed",
    );
    // THE ACTUAL GUARANTEE: nothing about the target file changed. The lock
    // is meant to stop a second process from mutating the file underneath
    // the first, and acquireLock's own backup-then-lock sequence must not
    // itself have touched it.
    assert.equal(readFileSync(path, "utf8"), before, "the target file must be untouched by a refused lock attempt");
  });
});

test("releaseLock lets a subsequent acquireLock on the same file succeed", () => {
  withScratchFile((path) => {
    acquireLock(path, "holder-a", "hash-a");
    releaseLock();
    assert.doesNotThrow(() => acquireLock(path, "holder-b", "hash-b"));
  });
});

test("markerFileMatches tells a genuinely mutated file apart from a restored one, by hash", () => {
  withScratchFile((path) => {
    const originalHash = sha(path);
    acquireLock(path, "holder-a", originalHash);
    // Simulate a genuine crash: the file gets mutated, and the process dies
    // before restoring it -- the marker is left on disk, mid-mutation.
    writeFileSync(path, "MUTATED, then the process died before restoring");
    assert.equal(markerFileMatches().present, true);
    assert.equal(markerFileMatches().restored, false, "a genuinely mutated file must not read as restored");
    // Now simulate the actual recovery: put the original content back, by
    // hand (as a human running the marker's own suggested `git checkout`
    // would), and confirm the check is by HASH, not by the marker's mere
    // presence going away.
    writeFileSync(path, "original content");
    assert.equal(markerFileMatches().restored, true, "once the file's content matches the recorded hash again, it must read as restored");
    releaseLock();
    assert.equal(markerFileMatches().present, false);
  });
});
