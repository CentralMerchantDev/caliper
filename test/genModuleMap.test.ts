// I3 (docs/BUILD-LOOP.md Step 2 plan, approved 2026-09-08, corrected in
// review): docs/MODULE-MAP.md's own generator, tested for STRUCTURE, not
// specific names.
//
// The first version of this test asserted the generated document named
// propModel, createBoard and a roadkit junction builder by name -- exactly
// the three names Step 6's own first-run check exists to look for. Review
// caught this before it landed: those names are in the map TODAY because
// they are uncalled, and wiring them up is the point of the B4 phase this
// whole gate exists to gate. A standing test asserting specific uncalled
// names would start failing the moment the project succeeds at the thing
// it is trying to do, and the pressure from a red CI run would be to weaken
// the test -- "a test that must be edited every time the codebase improves
// is a test that gets edited into uselessness."
//
// So this asserts the STRUCTURE instead: every module with exports gets a
// section, every export line carries either a caller list or an UNCALLED
// marker, and the counts printed in the document agree with what
// buildReverseMap itself returns for the same input. That holds regardless
// of which specific exports are wired up between now and whenever this
// runs. The specific names belong in Step 6's first-run check (recorded in
// this task's own commit messages), a one-time proof the detector works,
// not a standing assertion.

import { test } from "node:test";
import assert from "node:assert/strict";
import { renderModuleMap } from "../scripts/gen-module-map.mjs";

const SYNTHETIC_FILES = [
  { path: "/repo/public/called.js", source: `export function widget() {}`, isHtml: false },
  { path: "/repo/public/caller.js", source: `import { widget } from "./called.js";\nwidget();`, isHtml: false },
  { path: "/repo/public/dead.js", source: `export function neverCalled() {}`, isHtml: false },
];

test("renderModuleMap: every module with exports gets a section, every export line names its callers or UNCALLED", () => {
  const { text } = renderModuleMap(SYNTHETIC_FILES, { root: "/repo", allowlist: {} });

  assert.ok(text.includes("## `public/called.js`"), "a module with a called export must get its own section");
  assert.ok(text.includes("## `public/dead.js`"), "a module with an uncalled export must ALSO get its own section");
  assert.ok(!text.includes("## `public/caller.js`"), "a module with no exports of its own must not get an empty section");

  assert.ok(/`widget` -- called from/.test(text), "a real caller must be named, not just implied");
  assert.ok(/`neverCalled` -- \*\*UNCALLED\*\*/.test(text), "an uncalled export must be marked, not silently omitted");
});

test("renderModuleMap: an allowlist reason is shown beside its UNCALLED export", () => {
  const { text } = renderModuleMap(SYNTHETIC_FILES, {
    root: "/repo",
    allowlist: { "public/dead.js:neverCalled": "kept for a documented future use" },
  });
  assert.ok(
    text.includes("**UNCALLED** -- *kept for a documented future use*"),
    "an allowlisted export's written reason must appear in the generated document, not just in the JSON nobody reads",
  );
});

test("renderModuleMap: the printed counts agree with the actual number of sections and markers, not a number computed separately", () => {
  const { text, counts } = renderModuleMap(SYNTHETIC_FILES, { root: "/repo", allowlist: {} });

  const sectionCount = (text.match(/^## `/gm) || []).length;
  assert.equal(counts.modules, sectionCount, "the header's module count must equal the actual number of `## ` sections printed");

  const calledLines = (text.match(/-- called from/g) || []).length;
  const uncalledLines = (text.match(/\*\*UNCALLED\*\*/g) || []).length;
  assert.equal(counts.called, calledLines, "the header's called count must equal the actual number of \"called from\" lines");
  assert.equal(counts.testOnly + counts.dead, uncalledLines, "testOnly + dead must equal the actual number of UNCALLED lines -- these are not two independently-computed numbers that could quietly disagree");
  assert.equal(counts.exports, calledLines + uncalledLines, "every export line is either called or uncalled; the total must be exactly their sum");
});
