// =============================================================================
// THE SHARED RESULTS WRITER -- FIX-6 (PLAN.md §3.6, docs/briefs/CLI-2026-09-16.md)
//
// Mark's ruling: both mutation tools work properly, or this project does not
// keep both. `scripts/mutate.mjs` runs a full-suite baseline per mutation and
// was the ONLY thing that wrote `test/.mutate-results.json` -- the file
// `scripts/gen-mutation-summary.mjs` reads to produce the committed
// `test/mutationSummary.generated.json`, the evidence this project's central
// mutation claim rests on. `scripts/_mutcheck.mjs` is scoped to one test file
// and one source file, faster, and had verified every S/C/U-item's own
// mutations for weeks -- and every one of those results was thrown away the
// moment the process exited, because it only ever printed to the console.
//
// ONE WRITER, SO THE FORMAT CANNOT DRIFT. Both tools now call the functions
// below instead of each keeping (or, in _mutcheck.mjs's case, never keeping)
// its own copy of "how a result gets recorded." A result recorded this way
// always carries `baselineScope` -- "full-suite" for mutate.mjs, or
// "scoped:<testFile>" for _mutcheck.mjs -- so a scoped CAUGHT and a
// full-baseline CAUGHT are both real, both stored, and never confused for
// each other by anything that reads this file afterward.
//
// UPSERT BY ID, NOT APPEND-ONLY. A mutation id run twice (mutate.mjs once,
// _mutcheck.mjs again while developing the same control, or either tool a
// second time) replaces its own prior row rather than accumulating a
// duplicate -- gen-mutation-summary.mjs's own `Map` keyed by id would take
// the last one anyway; this keeps the file itself from growing rows nothing
// will ever read.
//
// KNOWN, DISCLOSED CAVEAT: `scripts/mutate.mjs` run WITHOUT `--resume` still
// starts from `{ results: [], baseline: null }` (unchanged by this fix) and
// overwrites the whole file at the end of its run -- including any rows
// `_mutcheck.mjs` recorded since the last full run. This is existing
// behaviour, not new breakage from sharing a writer; changing mutate.mjs's
// fresh-vs-resume semantics is a bigger decision than "share the writer" and
// is not made here.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Written after EVERY mutation, not at the end -- gitignored, since it is a
 * progress file, not a project artefact. See scripts/mutate.mjs's own
 * original header comment for the crash-safety reasoning ("a kill must cost
 * one mutation, never the whole run"), which applies identically to
 * _mutcheck.mjs now that it uses this same path. */
export const RESULTS_PATH = join(ROOT, "test", ".mutate-results.json");

export function loadResults(path = RESULTS_PATH) {
  if (!existsSync(path)) return { results: [], baseline: null };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { results: [], baseline: null };
  }
}

export function saveResults(state, path = RESULTS_PATH) {
  writeFileSync(path, JSON.stringify(state, null, 2));
}

/**
 * Record one mutation's result into `state` and persist immediately --
 * upserting by `entry.id` so a re-run of the same control replaces its own
 * row rather than duplicating it. Returns `state` (mutated in place, same
 * object) so a caller can keep using its own reference.
 *
 * `entry` must carry at least `{ id, status }`; callers (mutate.mjs,
 * _mutcheck.mjs) spread the full mutation record plus the outcome plus
 * `baselineScope` before calling this, matching the shape
 * gen-mutation-summary.mjs already reads.
 */
export function recordResult(state, entry, path = RESULTS_PATH) {
  const i = state.results.findIndex((r) => r.id === entry.id);
  if (i >= 0) state.results[i] = entry;
  else state.results.push(entry);
  saveResults(state, path);
  return state;
}
