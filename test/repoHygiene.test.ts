// THINGS ABOUT THE REPOSITORY THAT COST A RUN WHEN THEY DRIFT.
//
// Not style rules. Each check below corresponds to something that actually went
// wrong and wasted real time, and each would be invisible in a code review
// because none of it is code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripSourceComments } from "./stripSourceComments.ts";

function repoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      readFileSync(path.join(dir, "package.json"), "utf8");
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error("could not find the repository root");
}

const root = repoRoot();
const attributes = readFileSync(path.join(root, ".gitattributes"), "utf8");

test("the working tree and the repository hold the same bytes", () => {
  // `* text=auto` stores LF and checks out CRLF on Windows, so every `git add`
  // rewrites every file it touches. That is not cosmetic:
  //
  //   - one commit of small edits reported 66,043 insertions across 12 files
  //   - `git add -A` renormalised public/tier-models.js (4 MB, 109,447 lines)
  //     while `mutate --all` was running; esbuild read it mid-rewrite, reported
  //     a syntax error at 4722:40 that does not exist, and the run produced 14
  //     consecutive INCONCLUSIVE results before claiming "10 of 24 controls
  //     proved they exist"
  //
  // eol=lf leaves nothing to convert, so there is nothing to rewrite.
  assert.match(
    attributes,
    /^\*\s+text=auto\s+eol=lf\s*$/m,
    "the default line-ending rule is not `* text=auto eol=lf` -- git will rewrite files on every add again",
  );
});

test("Windows scripts keep CRLF, because they are the one place it is required", () => {
  for (const ext of ["bat", "cmd", "ps1"]) {
    assert.match(
      attributes,
      new RegExp(`^\\*\\.${ext}\\s+text\\s+eol=crlf\\s*$`, "m"),
      `*.${ext} is not pinned to CRLF`,
    );
  }
});

test("binaries are declared binary, because getting this wrong corrupts them silently", () => {
  // A binary caught by a text rule is not a churn problem, it is a destroyed
  // file — and it destroys it quietly, which is worse than the thing this
  // whole file is about.
  for (const ext of ["png", "jpg", "woff2", "hdr", "zip", "pdf"]) {
    assert.match(
      attributes,
      new RegExp(`^\\*\\.${ext}\\s+binary\\s*$`, "m"),
      `*.${ext} is not marked binary -- git may line-ending-convert it`,
    );
  }
});

test("mutate.mjs stops when the HARNESS breaks, rather than blaming the controls", () => {
  // A run with no fail count means the suite did not run at all. That says
  // nothing about the control under test, and nothing about the next twenty
  // either, because whatever broke is still broken. Reporting each of them as
  // INCONCLUSIVE and carrying on produced a summary that read as fourteen weak
  // controls when the real finding was one broken build.
  // Stripped -- this is exactly the "does the real control still throw"
  // question docs/LESSONS.md's comment-matching entry is about, and mutate.mjs
  // is the harness the whole project's standard of proof depends on.
  const mutate = stripSourceComments(readFileSync(path.join(root, "scripts", "mutate.mjs"), "utf8"));
  assert.match(
    mutate,
    /harnessBroke/,
    "mutate.mjs no longer distinguishes a broken harness from a surviving control",
  );
  assert.match(
    mutate,
    /if \(r\.fail === null\) \{/,
    "mutate.mjs no longer treats a missing fail count as a reason to stop",
  );
  // And it must still be a THROW, not a return -- a return would carry on.
  const idx = mutate.indexOf("harnessBroke = true");
  assert.ok(idx > 0, "harnessBroke is never set");
  assert.match(
    mutate.slice(idx, idx + 200),
    /throw e;/,
    "the harness failure is flagged but not thrown, so the run would continue anyway",
  );
});
