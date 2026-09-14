// =============================================================================
// V1 — THE CROSS-LANE EVENT LOG. The checklist's own gate: "append-only
// proven by test -- a write cannot truncate. That exact defect was found by
// blind audit in recordGate on 2026-09-10, where a read-then-write-whole-file
// with a catch that swallowed every read error silently truncated the ledger
// to its newest line. Do not rebuild it."
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvent, EVENTS } from "../scripts/record-event.mjs";
import { queryEvents, hasEvent } from "../scripts/query-event-log.mjs";

function tempLog() {
  const dir = mkdtempSync(join(tmpdir(), "event-log-test-"));
  return join(dir, "EVENT-LOG.jsonl");
}

// ---------------------------------------------------------------- appendEvent

test("appendEvent writes one valid JSON line with the required fields", () => {
  const log = tempLog();
  appendEvent(log, { at: "2026-09-15T00:00:00Z", lane: "CLI", event: "pushed", item: "A1", commit: "62650f4", ref: "origin/scoring" });
  const lines = readFileSync(log, "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.equal(record.lane, "CLI");
  assert.equal(record.event, "pushed");
  assert.equal(record.item, "A1");
  assert.equal(record.commit, "62650f4");
  assert.equal(record.ref, "origin/scoring");
});

test("appendEvent refuses an event name outside the closed list", () => {
  const log = tempLog();
  assert.throws(() => appendEvent(log, { lane: "CLI", event: "deployed", item: "A1" }), /pushed|merged|EVENTS|one of/);
});

test("appendEvent refuses a missing lane or item", () => {
  const log = tempLog();
  assert.throws(() => appendEvent(log, { event: "pushed", item: "A1" }));
  assert.throws(() => appendEvent(log, { lane: "CLI", event: "pushed" }));
});

test("appendEvent fills in `at` with the current time when not supplied", () => {
  const log = tempLog();
  const before = Date.now();
  const record = appendEvent(log, { lane: "CLI", event: "started", item: "V1" });
  const after = Date.now();
  const at = new Date(record.at).getTime();
  assert.ok(at >= before && at <= after, `at=${record.at} should be between ${before} and ${after}`);
});

test("multiple appendEvent calls each add exactly one more line, in order", () => {
  const log = tempLog();
  appendEvent(log, { lane: "CLI", event: "started", item: "V1", at: "2026-09-15T00:00:00Z" });
  appendEvent(log, { lane: "CLI", event: "item-green", item: "V1", at: "2026-09-15T00:01:00Z" });
  appendEvent(log, { lane: "CLI", event: "pushed", item: "V1", commit: "abc1234", at: "2026-09-15T00:02:00Z" });
  const lines = readFileSync(log, "utf8").trim().split("\n");
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((l) => JSON.parse(l).event), ["started", "item-green", "pushed"]);
});

// ---------------------------------------------------------------- the gate: cannot truncate

// Blind review finding: the first version of this test only checked that
// the file's bytes came out equal to a read-parse-rewrite round trip --
// which they DO for a well-formed fixture (JSON.stringify(JSON.parse(x))
// reproduces x byte-for-byte), so a read-then-rewrite implementation of
// appendEvent passed this test too. Proven by hand: swapping appendEvent
// for exactly that anti-pattern left this assertion green. A real proof
// has to watch what appendEvent actually calls, not infer absence-of-
// reading from output equality.
//
// A RUNTIME spy was tried first and does not work here: `node:test`'s
// `mock.method` cannot redefine `node:fs`'s own exports (they are
// non-configurable), and `mock.module` intercepts module RESOLUTION, which
// is too late -- esbuild bundles this test file and record-event.mjs
// together, so record-event.mjs's own `import { readFileSync,
// appendFileSync } from "node:fs"` is already resolved to the real
// functions before any test body runs. A STATIC check of the real source
// on disk is the tool that actually fits this specific claim (appendEvent
// never calls these two functions, structurally) -- reading the SOURCE
// FILE directly, not the bundle, so this cannot be fooled by anything
// esbuild does to the test's own copy.
test("GATE: appendEvent's own source never calls readFileSync or writeFileSync -- a static check of the real file on disk, not the bundle", () => {
  // Walks up looking for CLAUDE.md, not a fixed "one level up" -- a fixed
  // offset breaks the moment esbuild bundles this test into
  // test/.built/eventLog.test.mjs, whose own import.meta.url sits one
  // directory deeper than test/ itself (confirmed the hard way: a fixed
  // "../scripts" resolved to test/scripts, which does not exist).
  let dir = dirname(fileURLToPath(import.meta.url));
  let root = null;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); root = dir; break; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  assert.ok(root, "could not locate the repo root by walking up from the test bundle's own location");
  const sourcePath = join(root, "scripts", "record-event.mjs");
  const source = readFileSync(sourcePath, "utf8");
  const fnStart = source.indexOf("export function appendEvent");
  assert.ok(fnStart !== -1, "appendEvent must still be named exactly this in the real source");
  const fnEnd = source.indexOf("\nfunction ", fnStart + 1); // the next top-level function (exported or not) marks the end of this one
  assert.ok(fnEnd !== -1, "could not find the end of appendEvent's own body");
  const body = source.slice(fnStart, fnEnd);
  assert.ok(!body.includes("readFileSync("), "appendEvent's own body must never call readFileSync");
  assert.ok(!body.includes("writeFileSync("), "appendEvent's own body must never call writeFileSync");
  assert.ok(body.includes("appendFileSync("), "sanity check: appendEvent should still actually call appendFileSync somewhere");
});

test("GATE: a malformed line left by a prior crashed write does NOT get lost when a new event is appended -- this is the exact 2026-09-10 recordGate failure shape, reproduced and proven fixed", () => {
  const log = tempLog();
  appendFileSync(log, '{"at":"2026-09-15T00:00:00Z","lane":"CLI","event":"started","item":"A"}\n');
  appendFileSync(log, '{"at":"2026-09-15T00:01:00Z","lane":"CLI","event":"item-green","item":"A"}\n');
  // Simulates a process that crashed mid-write, leaving a truncated/garbage
  // line -- a read-then-write-whole-file implementation must either crash
  // parsing this, or (with the swallowing catch the checklist names) treat
  // the read as failed and silently rewrite the file with ONLY the new
  // event, losing everything above. Neither may happen here.
  appendFileSync(log, '{"at":"2026-09-15T00:02:00","lane":"CLI","event":"pus\n');

  appendEvent(log, { lane: "CLI", event: "pushed", item: "A", commit: "deadbee", at: "2026-09-15T00:03:00Z" });

  const lines = readFileSync(log, "utf8").trim().split("\n");
  assert.equal(lines.length, 4, "3 original lines (2 valid + 1 malformed) plus the new one -- nothing discarded");
  assert.equal(JSON.parse(lines[0]).item, "A");
  assert.equal(JSON.parse(lines[0]).event, "started");
  assert.equal(JSON.parse(lines[1]).event, "item-green");
  assert.throws(() => JSON.parse(lines[2]), "line 3 is the deliberately malformed one -- it must still be exactly what was written, not repaired or removed");
  const newest = JSON.parse(lines[3]);
  assert.equal(newest.event, "pushed");
  assert.equal(newest.commit, "deadbee");
});

test("GATE: appending to a log file that does not exist yet creates it, rather than throwing ENOENT", () => {
  const dir = mkdtempSync(join(tmpdir(), "event-log-test-"));
  const log = join(dir, "does-not-exist-yet.jsonl");
  appendEvent(log, { lane: "CLI", event: "started", item: "X", at: "2026-09-15T00:00:00Z" });
  const lines = readFileSync(log, "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
});

// ---------------------------------------------------------------- queryEvents / hasEvent

test("queryEvents filters by item, event and lane, all together", () => {
  const log = tempLog();
  appendEvent(log, { lane: "CLI", event: "pushed", item: "A1", ref: "origin/scoring", at: "2026-09-15T00:00:00Z" });
  appendEvent(log, { lane: "CLI", event: "pushed", item: "S1", ref: "origin/scoring", at: "2026-09-15T00:01:00Z" });
  appendEvent(log, { lane: "BLD", event: "pushed", item: "L1", ref: "origin/codex-lane", at: "2026-09-15T00:02:00Z" });

  const result = queryEvents(log, { item: "A1", event: "pushed" });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].item, "A1");
});

test("GATE: hasEvent answers V1's own named question -- 'is there a pushed event for item A1?' -- without the caller naming a ref", () => {
  const log = tempLog();
  appendEvent(log, { lane: "CLI", event: "started", item: "A1", at: "2026-09-15T00:00:00Z" });
  assert.equal(hasEvent(log, "A1", "pushed"), false, "not pushed yet");
  appendEvent(log, { lane: "CLI", event: "pushed", item: "A1", commit: "62650f4", ref: "origin/scoring", at: "2026-09-15T00:01:00Z" });
  assert.equal(hasEvent(log, "A1", "pushed"), true, "now it has been -- and the caller never had to name origin/scoring to find out");
});

test("queryEvents against a log with NO malformed lines reports malformedLines as empty, not undefined", () => {
  const log = tempLog();
  appendEvent(log, { lane: "CLI", event: "started", item: "A", at: "2026-09-15T00:00:00Z" });
  const result = queryEvents(log, {});
  assert.deepEqual(result.malformedLines, []);
});

test("queryEvents SKIPS a malformed line and names it, rather than throwing and returning nothing", () => {
  const log = tempLog();
  appendFileSync(log, '{"at":"2026-09-15T00:00:00Z","lane":"CLI","event":"started","item":"A"}\n');
  appendFileSync(log, "not json at all\n");
  appendFileSync(log, '{"at":"2026-09-15T00:01:00Z","lane":"CLI","event":"pushed","item":"A"}\n');
  const result = queryEvents(log, { item: "A" });
  assert.equal(result.events.length, 2, "both valid lines found despite the malformed one between them");
  assert.deepEqual(result.malformedLines, [2]);
});

test("queryEvents against a log file that does not exist returns empty, not a crash", () => {
  const result = queryEvents(join(tmpdir(), "definitely-does-not-exist-" + Date.now() + ".jsonl"), {});
  assert.deepEqual(result, { events: [], malformedLines: [] });
});

test("EVENTS is the exact closed list the spec names", () => {
  assert.deepEqual([...EVENTS].sort(), ["blocked", "committed", "finding", "item-green", "merged", "pushed", "started", "unblocked"].sort());
});
