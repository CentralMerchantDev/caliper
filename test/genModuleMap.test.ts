// I3 (docs/BUILD-LOOP.md Step 2 plan, approved 2026-09-08, corrected in
// review, UPGRADED to reachability the same day): docs/MODULE-MAP.md's own
// generator, tested for STRUCTURE, not specific names.
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
// section, every export line carries either a real caller or one of the
// four reachability markers, and the counts printed in the document agree
// with the actual sections/markers present. That holds regardless of which
// specific exports are wired up between now and whenever this runs. The
// specific names belong in Step 6's first-run check (recorded in this
// task's own commit messages), a one-time proof the detector works, not a
// standing assertion.
//
// renderModuleMap now takes an already-classified reachability map (the
// same shape classifyReachability returns), not raw files -- it does not
// recompute reachability itself, matching classifyRepoReachability being
// the ONE place that pipeline runs (scripts/lib/module-graph.mjs), shared
// with test/deadExports.test.ts. These fixtures build that shape directly
// rather than running the full pipeline, since what is under test here is
// the RENDERING, not the classification (which has its own direct tests in
// test/moduleGraph.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { renderModuleMap } from "../scripts/gen-module-map.mjs";

function classifiedFixture() {
  return new Map([
    ["/repo/public/product.js", new Map([
      ["widget", { state: "product", via: "/repo/public/index.html", callers: new Set(["/repo/public/index.html"]) }],
    ])],
    ["/repo/public/roadkit.js", new Map([
      ["junction", { state: "demo-only", via: "/repo/public/roadkit-street-demo.js", callers: new Set(["/repo/public/roadkit-street-demo.js"]) }],
    ])],
    ["/repo/src/grounding.ts", new Map([
      ["decideGroundingOutcome", { state: "test-only", via: "/repo/test/grounding.test.ts", callers: new Set(["/repo/test/grounding.test.ts"]) }],
    ])],
    ["/repo/public/dead.js", new Map([
      ["neverCalled", { state: "unreachable", via: null, callers: new Set() }],
    ])],
  ]);
}

test("renderModuleMap: every module with exports gets a section; product/demo-only/test-only/unreachable are all distinguishable in the text", () => {
  const { text } = renderModuleMap(classifiedFixture(), { root: "/repo", allowlist: {} });

  for (const path of ["public/product.js", "public/roadkit.js", "src/grounding.ts", "public/dead.js"]) {
    assert.ok(text.includes(`## \`${path}\``), `${path} must get its own section`);
  }

  assert.ok(/`widget` -- called from `public\/index\.html`/.test(text), "a product export names its real caller, with no state marker");
  assert.ok(/`junction` -- \*\*DEMO-ONLY\*\* \(via `public\/roadkit-street-demo\.js`\)/.test(text), "demo-only must be distinguishable from unreachable, not collapsed into one UNCALLED marker");
  assert.ok(/`decideGroundingOutcome` -- \*\*TEST-ONLY\*\* \(via `test\/grounding\.test\.ts`\)/.test(text), "test-only must be distinguishable from demo-only and unreachable");
  assert.ok(/`neverCalled` -- \*\*UNREACHABLE\*\*/.test(text), "unreachable must be marked, not silently omitted");
});

test("renderModuleMap: an allowlist reason is shown beside a non-product export's marker", () => {
  const { text } = renderModuleMap(classifiedFixture(), {
    root: "/repo",
    allowlist: { "public/dead.js:neverCalled": "kept for a documented future use" },
  });
  assert.ok(
    text.includes("**UNREACHABLE** -- *kept for a documented future use*"),
    "an allowlisted export's written reason must appear in the generated document, not just in the JSON nobody reads",
  );
});

test("renderModuleMap: the printed counts agree with the actual number of sections and state markers, not a number computed separately", () => {
  const { text, counts } = renderModuleMap(classifiedFixture(), { root: "/repo", allowlist: {} });

  const sectionCount = (text.match(/^## `/gm) || []).length;
  assert.equal(counts.modules, sectionCount, "the header's module count must equal the actual number of `## ` sections printed");

  // `^- \`` anchors on the PER-EXPORT bullet line specifically -- the
  // header's own explanatory prose above also bolds DEMO-ONLY/TEST-ONLY/
  // UNREACHABLE when introducing what each term means, and an unanchored
  // match over-counted by exactly that many, found by this assertion
  // itself failing (1 !== 2) rather than by inspection.
  const productLines = (text.match(/^- `.*-- called from/gm) || []).length;
  const demoLines = (text.match(/^- `.*\*\*DEMO-ONLY\*\*/gm) || []).length;
  const testLines = (text.match(/^- `.*\*\*TEST-ONLY\*\*/gm) || []).length;
  const unreachableLines = (text.match(/^- `.*\*\*UNREACHABLE\*\*/gm) || []).length;

  assert.equal(counts.product, productLines);
  assert.equal(counts["demo-only"], demoLines);
  assert.equal(counts["test-only"], testLines);
  assert.equal(counts.unreachable, unreachableLines);
  assert.equal(
    counts.exports, productLines + demoLines + testLines + unreachableLines,
    "every export line is exactly one of the four states; the total must be exactly their sum",
  );
});
