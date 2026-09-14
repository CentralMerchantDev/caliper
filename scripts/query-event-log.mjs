#!/usr/bin/env node
// =============================================================================
// V1's OWN STATED PURPOSE, MADE CALLABLE: "A gated item checks the log, not a
// ref it had to guess. BLD's check becomes 'is there a pushed event for item
// A1?' -- which is answerable without knowing which branch CLI chose."
// This is that question.
//
// Never assumes a line is well-formed. A single malformed line (a prior
// crashed write, a hand edit) is SKIPPED AND NAMED in the returned result's
// own `malformedLines` field -- never silently dropped, and never allowed to
// abort the whole query the way a naive `JSON.parse(wholeFile)` would.
// =============================================================================

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { EVENT_LOG_PATH } from "./record-event.mjs";

/**
 * @param {string} logPath
 * @param {{item?:string, event?:string, lane?:string, ref?:string}} filters
 * @returns {{events:object[], malformedLines:number[]}}
 */
export function queryEvents(logPath, filters = {}) {
  let text;
  try {
    text = readFileSync(logPath, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return { events: [], malformedLines: [] };
    throw e;
  }

  const lines = text.split("\n").filter((l) => l.length > 0);
  const events = [];
  const malformedLines = [];

  lines.forEach((line, i) => {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      malformedLines.push(i + 1); // 1-indexed, matches a human reading the file
      return;
    }
    if (filters.item !== undefined && record.item !== filters.item) return;
    if (filters.event !== undefined && record.event !== filters.event) return;
    if (filters.lane !== undefined && record.lane !== filters.lane) return;
    if (filters.ref !== undefined && record.ref !== filters.ref) return;
    events.push(record);
  });

  return { events, malformedLines };
}

/** "Is there a <event> event for <item>?" -- the exact question V1 exists to
 * answer, without needing to know which ref/branch the other lane used. */
export function hasEvent(logPath, item, event, extraFilters = {}) {
  return queryEvents(logPath, { item, event, ...extraFilters }).events.length > 0;
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
  const { events, malformedLines } = queryEvents(EVENT_LOG_PATH, args);
  if (malformedLines.length > 0) {
    console.error(`warning: ${malformedLines.length} malformed line(s) skipped (line numbers: ${malformedLines.join(", ")})`);
  }
  console.log(JSON.stringify(events, null, 2));
  console.log(`${events.length} matching event(s)`);
}

if (process.argv[1] && basename(process.argv[1]) === "query-event-log.mjs") {
  main();
}
