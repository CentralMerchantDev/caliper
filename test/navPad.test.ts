// THE NAVIGATION PAD READS AS ONE INSTRUMENT.
//
// Mark, on the first boxless version: "the nav is a mess from a looks standpoint
// ... overall it just looks disconnected from each other and random."
//
// That sounds like taste and is not. The pad is five stacked rows -- modes,
// readout, dial, zoom, actions. Each sized itself to its own content and was
// left-aligned, so their right edges landed in five different places; and they
// drew themselves with THREE different corner radii (11px, 10px, 50%) and two
// different shadows. Ragged widths plus mismatched corners is what "random"
// looks like. No single row was wrong.
//
// The fix was three tokens -- --nav-w, --nav-radius, --nav-shadow -- and every
// row using them. This file is what stops the fourth radius arriving later,
// because that is exactly how the first three got there: one row at a time,
// each reasonable on its own.
//
// WHAT THIS CANNOT DO: say whether the result looks good. Nothing in node can.
// It checks the property that made it look bad, which is that the rows disagreed.
// Judging the result needs `node scripts/shoot-app.mjs` and eyes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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

// Stripped once, here, so every indexOf()/slice()/assert.match() below this
// line -- including ruleBody()'s -- checks against code that actually runs,
// not against a comment that merely describes it. See
// test/stripSourceComments.ts and docs/LESSONS.md's "a regex over source
// matches your comments too" entry: this file's own trackLiveRect(navPadEl,
// check below is the one that found the bug this control exists for.
const html = stripSourceComments(readFileSync(path.join(repoRoot(), "public", "index.html"), "utf8"));

/** The body of a CSS rule, by exact selector. */
function ruleBody(selector: string): string {
  const i = html.indexOf(selector + " {");
  assert.notEqual(i, -1, `no CSS rule found for "${selector}"`);
  const open = html.indexOf("{", i);
  const close = html.indexOf("}", open);
  assert.ok(close > open, `rule "${selector}" is not closed`);
  return html.slice(open + 1, close);
}

test("the pad declares one width, one radius and one shadow", () => {
  const root = ruleBody(".nav-pad.nav-bare");
  for (const token of ["--nav-w:", "--nav-radius:", "--nav-shadow:"]) {
    assert.ok(root.includes(token), `.nav-pad.nav-bare does not declare ${token}`);
  }
  // The pad itself must take the width, or the rows have nothing to fill.
  assert.match(root, /width:\s*var\(--nav-w\)/, "the pad does not adopt its own --nav-w");
});

test("every row of the pad uses those tokens instead of its own numbers", () => {
  // These are the three rows that draw a surface. The raggedness lived here:
  // .nav-strip was 11px, .nav-readout 10px, .nav-dial 50% and a heavier shadow.
  for (const selector of [".nav-bare .nav-strip", ".nav-bare .nav-readout", ".nav-bare .nav-dial"]) {
    const body = ruleBody(selector);
    assert.match(
      body,
      /border-radius:\s*var\(--nav-radius\)/,
      `${selector} hard-codes a corner radius instead of using --nav-radius -- this is the fourth radius arriving`,
    );
    assert.match(
      body,
      /box-shadow:\s*var\(--nav-shadow\)/,
      `${selector} hard-codes a shadow instead of using --nav-shadow`,
    );
  }
});

test("the rows are all measured the same way, so their edges line up", () => {
  // Without border-box the 1px borders and the padding push each row past
  // --nav-w by a different amount, and the ragged right edge comes back by
  // arithmetic rather than by anybody typing a width.
  const body = ruleBody(".nav-bare > *");
  assert.match(body, /box-sizing:\s*border-box/, "the pad's rows are not measured border-box");
  assert.match(body, /width:\s*100%/, "the pad's rows do not fill the pad");
});

test("the mode buttons share their row rather than each taking its label's width", () => {
  // Four differently-sized mode buttons was the most visible piece of the
  // raggedness, because that row is where the eye lands first.
  const body = ruleBody(".nav-bare .nav-strip-modes button");
  assert.match(body, /flex:\s*1/, "the mode buttons do not share the row equally");
});

test("the inspector opens BELOW the pad, never on top of it", () => {
  // Mark: the nav "gets hidden when you click on any target -- this should open
  // below it not on top of it". The inspector clears the pad by reading the
  // pad's own measured height, published by a ResizeObserver, rather than by a
  // fixed offset that goes stale the moment the pad changes size -- which it
  // just did.
  //
  // WHAT THIS CANNOT DO, per the file header: this only checks that the CSS
  // mechanism exists in the source, not that it's the thing actually governing
  // on screen. It was not -- `body.inspecting-mobile #nav-compass-pad {
  // display: none }` hid the pad outright whenever the inspector opened, at
  // every width, so this passed while Mark's exact complaint was still true.
  // The real behavioural guarantee (the pad stays visible AND the two never
  // overlap, measured with getBoundingClientRect against a live page) is
  // e2e/panelOverlap.spec.ts's "the nav pad stays visible when the inspector
  // opens, and does not overlap it" -- that test is the one that can fail.
  assert.match(
    html,
    /bottom:\s*calc\(var\(--nav-pad-height/,
    "the inspector no longer clears the nav pad by its measured height",
  );
  assert.match(
    html,
    /--nav-pad-height/,
    "nothing publishes the pad's measured height",
  );
  assert.ok(
    /ResizeObserver/.test(html),
    "the pad's height is not observed, so the inspector's clearance will go stale",
  );
});

test("the inspector's LEFT and BOTTOM are measured from the pad's live position, not assumed", () => {
  // --nav-pad-height (checked above) only ever fixed the height half of the
  // original guess. `left: 20px` and the bottom-calc's implicit "the pad
  // sits at its CSS-default bottom-left corner" was the other half, and it
  // was still a guess: public/workbench.js can dock the pad anywhere on
  // screen. This is the same "measure, don't predict" property, now
  // checked for position -- via the shared public/live-position.js
  // (trackLiveRect), not a second hand-written ResizeObserver+resize+poll
  // block, which is what U4's wheel needed the identical fix twice before
  // this was extracted.
  assert.match(html, /from ["']\.\/live-position\.js["']/, "index.html does not import the shared live-position tracker");
  assert.match(
    html,
    /trackLiveRect\(navPadEl,/,
    "the inspector's position is not tracked off the pad's live rect",
  );
});

test("no other stylesheet in public/ reintroduces a nav radius behind this one's back", () => {
  // index.html is not the only page. A second file styling .nav-strip with its
  // own numbers would undo this quietly, and only on that page.
  const dir = path.join(repoRoot(), "public");
  const offenders: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "index.html") continue;
    if (!/\.(html|css)$/.test(name)) continue;
    const text = stripSourceComments(readFileSync(path.join(dir, name), "utf8"));
    for (const m of text.matchAll(/\.nav-(?:strip|readout|dial)\b[^{]*\{([^}]*)\}/g)) {
      if (/border-radius:\s*(?!var\()/.test(m[1]) || /box-shadow:\s*(?!var\()/.test(m[1])) {
        offenders.push(name);
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], [], `these files style the nav rows with their own numbers: ${offenders}`);
});
