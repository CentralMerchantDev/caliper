// THE WHEEL'S MARKUP AGREES WITH THE BINDING TABLE, AND MODES STAY OFF IT.
//
// String-level checks only, same limits as test/navPad.test.ts's own header:
// this cannot say whether the wheel looks right or whether a drag actually
// moves the camera. What it can catch is the markup and the binding table
// disagreeing -- a segment with no matching binding, or a mode switch
// (orbit/walk/drive/fly as CAMERA MODES) slipping onto what is supposed to
// be an actions-only wheel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NAV_BINDINGS } from "../public/nav-bindings.js";

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

const html = readFileSync(path.join(repoRoot(), "public", "index.html"), "utf8");
const wheelBlock = (() => {
  const i = html.indexOf('id="nav-wheel"');
  assert.notEqual(i, -1, "no #nav-wheel element found");
  const close = html.indexOf("<!-- Street-Level", i);
  assert.ok(close > i, "could not find the end of the #nav-wheel block");
  return html.slice(i, close);
})();

test("every wheel segment in the markup has a matching wheel:true binding", () => {
  const segIds = [...wheelBlock.matchAll(/data-nav-action="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(segIds.length >= 6, "expected at least 6 wheel segments in the markup");
  const wheelIds = new Set(NAV_BINDINGS.filter((b) => b.segment).map((b) => b.id));
  for (const id of segIds) {
    assert.ok(wheelIds.has(id), `markup has a segment "${id}" with no matching wheel binding in NAV_BINDINGS`);
  }
  for (const id of wheelIds) {
    assert.ok(segIds.includes(id), `NAV_BINDINGS has wheel segment "${id}" missing from the markup`);
  }
});

test("no camera MODE is a wheel segment -- modes are a switch, not an action, and stay in the button row", () => {
  for (const mode of ["orbit-mode", "walk-mode", "drive-mode", "fly-mode", "walk", "drive", "fly"]) {
    assert.ok(
      !wheelBlock.includes(`data-nav-action="${mode}"`),
      `"${mode}" appears as a wheel segment -- mixing a mode switch into the action wheel is the confusion this design explicitly avoided`,
    );
  }
});

test("the wheel redeclares --nav-radius and --nav-shadow rather than assuming inheritance", () => {
  // #nav-wheel is a SIBLING of #nav-compass-pad, not a descendant -- the
  // custom properties .nav-pad.nav-bare scopes to itself do not reach a
  // sibling. If this ever regresses to `var(--nav-radius)` with nothing
  // declaring it locally, the wheel silently falls back to the browser
  // default border-radius (0) instead of the pad's rounding.
  const i = html.indexOf(".nav-wheel {");
  assert.notEqual(i, -1, "no .nav-wheel rule found");
  const body = html.slice(html.indexOf("{", i), html.indexOf("}", i));
  assert.match(body, /--nav-radius:/, ".nav-wheel does not redeclare --nav-radius");
  assert.match(body, /--nav-shadow:/, ".nav-wheel does not redeclare --nav-shadow");
});

test("the wheel is positioned off --nav-pad-height, not a second guessed offset", () => {
  const i = html.indexOf(".nav-wheel {");
  const body = html.slice(html.indexOf("{", i), html.indexOf("}", i));
  assert.match(body, /var\(--nav-pad-height/, "the wheel does not use the measured pad height -- U1 fixed exactly this class of bug once already");
});
