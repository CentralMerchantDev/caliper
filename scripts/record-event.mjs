#!/usr/bin/env node
// =============================================================================
// V1 — THE CROSS-LANE EVENT LOG. docs/specs/VERSIONING-AND-TRACKING-2026-09-15.md
// V1, docs/specs/REBUILD-CHECKLIST.md's own V1 item.
//
// WHY THIS EXISTS: on 2026-09-14 CLI pushed item A1 to `origin/scoring`. BLD's
// own brief said "confirm A1's commit exists on origin" with no ref named; BLD
// sat on `codex-lane`, checked, correctly found nothing, and the item gated on
// A1 never ran. A lane had no way to ask "where did the other lane's work
// land?" This is that question made answerable: `docs/EVENT-LOG.jsonl`,
// append-only, one JSON object per line, readable from EITHER worktree once
// both push to the shared remote.
//
// NOT A NEW SYSTEM, per the checklist's own instruction: `process_record_gate`
// (an MCP tool in a separate process server, outside this repository's own
// tracked files -- confirmed by search, nothing under this name exists here)
// already appends to docs/GATE-LEDGER.jsonl for the SAME reason. This module
// cannot literally extend that external server's own source, so it mirrors
// its mechanism instead, in the one place this repo actually controls: the
// exact append-only technique, so the two ledgers stay the same SHAPE of
// system even though they are two files. If the process server later grows
// its own writer for this file, this script's `appendEvent` is what that
// writer should match, not diverge from.
//
// THE BUG THIS FILE EXISTS TO NOT REPEAT (named directly in the checklist):
// `recordGate` was READ-THEN-WRITE-WHOLE-FILE, with a catch that swallowed
// every read error -- so a transient read failure (or, as proven in
// test/eventLog.test.ts, a single malformed line left by a prior crashed
// write) silently truncated the ledger to just the newest line. Found by
// blind audit, 2026-09-10.
//
// THE FIX IS THE METHOD, NOT A CHECK: `appendEvent` never reads the log file
// at all. `fs.appendFileSync` is a single syscall-level append -- there is no
// "read the old content, add to it, write it back" step for a failure to
// interpose on, so the truncation bug's entire precondition does not exist
// here. This is why append-only is the fix, not a policy layered on top of
// read-modify-write.
// =============================================================================

import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join } from "node:path";

function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("record-event: could not locate the repo root");
}

export const EVENT_LOG_PATH = join(repoRoot(), "docs", "EVENT-LOG.jsonl");

/** The closed event set. Not open-ended, per the spec: "a closed list so the
 * log stays queryable." An unlisted event name is refused, not silently
 * accepted as a new de-facto category nobody agreed to. */
export const EVENTS = Object.freeze([
  "started", "item-green", "committed", "pushed", "merged", "blocked", "unblocked", "finding",
]);

/**
 * Append one event line. Never reads the log file -- see the header. Throws
 * on a malformed event rather than writing something a reader could not
 * trust; never THROWS on account of the log file's own prior content,
 * whatever state that is in, because it never looks at it.
 *
 * @param {string} logPath
 * @param {{at?:string, lane:string, event:string, item:string, commit?:string, ref?:string, note?:string}} event
 */
export function appendEvent(logPath, event) {
  if (!event || typeof event.lane !== "string" || event.lane.length === 0) {
    throw new Error(`record-event: "lane" is required, got ${JSON.stringify(event && event.lane)}`);
  }
  if (!EVENTS.includes(event.event)) {
    throw new Error(`record-event: "event" must be one of ${EVENTS.join("/")}, got ${JSON.stringify(event && event.event)}`);
  }
  if (typeof event.item !== "string" || event.item.length === 0) {
    throw new Error(`record-event: "item" is required, got ${JSON.stringify(event && event.item)}`);
  }
  const record = {
    at: event.at ?? new Date().toISOString(),
    lane: event.lane,
    event: event.event,
    item: event.item,
    ...(event.commit !== undefined ? { commit: event.commit } : {}),
    ...(event.ref !== undefined ? { ref: event.ref } : {}),
    ...(event.note !== undefined ? { note: event.note } : {}),
  };
  appendFileSync(logPath, JSON.stringify(record) + "\n", "utf8");
  return record;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.lane || !args.event || !args.item) {
    console.error("usage: node scripts/record-event.mjs --lane CLI --event pushed --item A1 [--commit <sha>] [--ref origin/scoring] [--note \"...\"]");
    process.exit(2);
  }
  const record = appendEvent(EVENT_LOG_PATH, args);
  console.log(`recorded: ${JSON.stringify(record)}`);
}

// Bundling-resistant entry-point guard -- see scripts/migrate-catalogue-
// s2-fields.mjs's own header for why a raw import.meta.url comparison
// breaks under esbuild (test/run.mjs and scripts/_mutcheck.mjs both inline
// local imports into one bundle, which collapses every inlined module's
// import.meta.url to the BUNDLE's own url). A basename check on
// process.argv[1] survives that, because no bundle's OUTPUT file is ever
// literally named record-event.mjs.
if (process.argv[1] && basename(process.argv[1]) === "record-event.mjs") {
  main();
}
