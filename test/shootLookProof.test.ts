// =============================================================================
// FIX-4 (docs/briefs/BLD-2026-09-16.md) -- THE READOUT'S EVIDENCE WAS EMPTY
//
// public/look-proof-scene.html's own RB3/RC5 comment (search "the value
// readout's own visual marker") says the design plainly: the readout is a
// coloured 3D marker (available/unavailable) plus a console.log line
// ("READOUT-STATE cell=... current=... ifPlaced=..."), by deliberate choice
// -- "a screenshot paired with the console line is what this run's own
// brief asked be shown to Mark, not a second, invented visual encoding of
// the same numbers." No on-screen text was ever built, and none should be
// -- that would fight a real, documented design decision.
//
// The real defect: scripts/shoot-look-proof.mjs saves the PNG (marker
// position/colour only -- canvas pixels, no text) and discards the console
// transcript the moment the process exits. 26-readout-real-numbers.png's
// own commit message (2f98a4c) hand-transcribes THREE cells' worth of
// numbers into prose; only ONE of the three was ever actually screenshotted,
// and the numbers in the commit message are not independently checkable
// against anything in the repository -- the pairing the design relies on
// was never actually preserved. This is the "blank-canvas-reporting-draw-
// calls:-1" failure shape again: green on every measure available, while
// the thing it claims is unverifiable.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stripSourceComments } from "./stripSourceComments.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
function findScripts(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "scripts");
    try { readFileSync(join(c, "shoot-look-proof.mjs"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate scripts/ from " + HERE);
}
const SCRIPTS = findScripts();
const SRC = stripSourceComments(readFileSync(join(SCRIPTS, "shoot-look-proof.mjs"), "utf8"));

test("GATE (FIX-4): every console line is captured, not filtered down to errors alone -- the readout's real number only ever exists as a console.log line, so dropping non-error lines throws away the one thing that would prove it", () => {
  assert.match(SRC, /consoleLines\.push\(m\.text\(\)\)/, "console messages are not captured into a transcript this script can persist -- only error lines are being kept");
});

test("GATE (FIX-4): a successful render writes the captured console transcript to a companion file beside the PNG -- a screenshot alone is canvas pixels and cannot show a number; this is the durable half of the 'screenshot paired with the console line' pairing look-proof-scene.html's own design already relies on", () => {
  assert.match(SRC, /outName \+ "\.console\.txt"/, "no companion console-transcript file is written next to the PNG -- the pairing the design relies on is not actually preserved anywhere");
  assert.match(SRC, /consoleLines\.join\("\\n"\)/, "the companion file is not built from the real captured console lines");
});

test("(synthetic) the vulnerability: a comment mentioning consoleLines.push must not satisfy the checks above", () => {
  const commentOnly = stripSourceComments("// consoleLines.push(m.text()); used to be here\nconst m = {};\n");
  assert.doesNotMatch(commentOnly, /consoleLines\.push\(m\.text\(\)\)/, "a comment-only mention should not match the real-code pattern once comments are stripped");
});
