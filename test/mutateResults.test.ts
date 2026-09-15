// FIX-6 (PLAN.md §3.6, docs/briefs/CLI-2026-09-16.md) -- THE SHARED WRITER,
// TESTED DIRECTLY. scripts/mutate.mjs and scripts/_mutcheck.mjs both call
// loadResults/saveResults/recordResult now instead of each keeping (or, for
// _mutcheck.mjs, never keeping) its own copy. This proves the shared
// functions themselves, against a scratch path -- never the real, gitignored
// test/.mutate-results.json a live mutation run would be using.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadResults, saveResults, recordResult } from "../scripts/mutate-results.mjs";

function withScratchPath<T>(fn: (path: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "mutate-results-test-"));
  const path = join(dir, ".mutate-results.json");
  try {
    return fn(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("loadResults on a path that does not exist returns an empty, well-shaped state -- not a throw, not undefined", () => {
  withScratchPath((path) => {
    assert.equal(existsSync(path), false, "sanity check: the scratch path must not exist yet");
    assert.deepEqual(loadResults(path), { results: [], baseline: null });
  });
});

test("loadResults on a corrupted file falls back to empty state rather than throwing -- a half-written progress file must not crash the caller", () => {
  withScratchPath((path) => {
    saveResults({ results: "not even an object" }, path); // write something, then corrupt it
    writeFileSync(path, "{ this is not valid json");
    assert.deepEqual(loadResults(path), { results: [], baseline: null });
  });
});

test("saveResults then loadResults round-trips exactly", () => {
  withScratchPath((path) => {
    const state = { results: [{ id: "a", status: "CAUGHT" }], baseline: { fail: 0 } };
    saveResults(state, path);
    assert.deepEqual(loadResults(path), state);
  });
});

test("GATE (FIX-6): recordResult appends a new id and persists immediately -- a crash right after this call must not lose the result", () => {
  withScratchPath((path) => {
    const state = { results: [], baseline: null };
    recordResult(state, { id: "fresh-id", status: "CAUGHT", baselineScope: "full-suite" }, path);
    assert.equal(state.results.length, 1, "the in-memory state must reflect the new result immediately");
    // Read back from DISK, not from `state` -- proves this was actually
    // persisted and not just mutated in memory.
    const onDisk = loadResults(path);
    assert.deepEqual(onDisk.results, [{ id: "fresh-id", status: "CAUGHT", baselineScope: "full-suite" }]);
  });
});

test("GATE (FIX-6): recordResult UPSERTS by id -- a second recording of the same id replaces the row, it does not duplicate it", () => {
  withScratchPath((path) => {
    const state = { results: [], baseline: null };
    recordResult(state, { id: "repeat-id", status: "SURVIVED", baselineScope: "scoped:test/x.test.ts" }, path);
    recordResult(state, { id: "repeat-id", status: "CAUGHT", baselineScope: "full-suite" }, path);
    assert.equal(state.results.length, 1, "one id must produce one row, however many times it is recorded");
    assert.equal(state.results[0].status, "CAUGHT", "the LATEST recording must win");
    assert.equal(state.results[0].baselineScope, "full-suite");
    const onDisk = loadResults(path);
    assert.equal(onDisk.results.length, 1);
  });
});

test("recordResult upserting one id leaves every OTHER id's row untouched", () => {
  withScratchPath((path) => {
    const state = { results: [{ id: "keep-me", status: "CAUGHT", baselineScope: "full-suite" }], baseline: null };
    recordResult(state, { id: "new-one", status: "CAUGHT", baselineScope: "scoped:test/y.test.ts" }, path);
    assert.equal(state.results.length, 2);
    const kept = state.results.find((r: { id: string }) => r.id === "keep-me");
    assert.deepEqual(kept, { id: "keep-me", status: "CAUGHT", baselineScope: "full-suite" });
  });
});

test("a scoped result (scripts/_mutcheck.mjs's own shape) and a full-suite result (scripts/mutate.mjs's own shape) for DIFFERENT ids coexist in one file, each carrying its own baselineScope", () => {
  withScratchPath((path) => {
    const state = { results: [], baseline: null };
    recordResult(state, { id: "from-mutcheck", status: "CAUGHT", baselineScope: "scoped:test/scoring.test.ts" }, path);
    recordResult(state, { id: "from-mutate", status: "CAUGHT", baselineScope: "full-suite" }, path);
    const onDisk = loadResults(path);
    assert.equal(onDisk.results.length, 2);
    assert.equal(onDisk.results.find((r: { id: string }) => r.id === "from-mutcheck").baselineScope, "scoped:test/scoring.test.ts");
    assert.equal(onDisk.results.find((r: { id: string }) => r.id === "from-mutate").baselineScope, "full-suite");
  });
});
