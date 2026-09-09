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

test("the hub lives inside the pad's own action row, not floating separately above it", () => {
  // Mark's review of the first version's screenshot: "a stray artefact...
  // nothing connects it to the panel it belongs to." Correct placement
  // (never overlapping the pad) and actually belonging to the pad are
  // different properties; this asserts the second one structurally --
  // the hub's markup must be inside .nav-strip-actions, not a sibling of
  // #nav-compass-pad the way the first version's whole #nav-wheel was.
  const actionsStart = html.indexOf('class="nav-strip nav-strip-actions"');
  assert.notEqual(actionsStart, -1, "no .nav-strip-actions row found");
  const actionsEnd = html.indexOf("</div>", actionsStart);
  const actionsBody = html.slice(actionsStart, actionsEnd);
  assert.match(actionsBody, /id="nav-wheel-hub"/, "the wheel hub is not inside the pad's action row");
});

test("the ring is positioned off the hub's own live position, not a second guessed offset", () => {
  // The same "measure, don't predict" principle U1 established for height
  // and this file's own earlier version established for the pad's rect,
  // now expressed against the hub itself: since the hub is a normal flow
  // child of the pad (previous test), its live position is correct by
  // construction wherever the pad renders, with nothing separate to go
  // stale. The measurement itself now lives in the shared
  // public/live-position.js (trackLiveRect) rather than being hand-written
  // here a second time -- this asserts the wheel actually calls it, not
  // that it reimplements ResizeObserver+resize+poll on its own again.
  const src = readFileSync(path.join(repoRoot(), "public", "nav-wheel.js"), "utf8");
  assert.match(src, /from ["']\.\/live-position\.js["']/, "nav-wheel.js does not import the shared live-position tracker");
  assert.match(src, /trackLiveRect\(hub,/, "the ring does not track the hub's live position via trackLiveRect");
});

test("live-position.js is a real module with the shared tracking function, not a name that stopped existing", () => {
  // Cheap, direct guard against the import above silently resolving to
  // nothing -- importsResolve.test.ts already checks this repo-wide, but a
  // second, local check here fails closer to the point anyone would look
  // when this specific pairing breaks.
  const src = readFileSync(path.join(repoRoot(), "public", "live-position.js"), "utf8");
  assert.match(src, /export function trackLiveRect/, "public/live-position.js does not export trackLiveRect");
});
