// CAN A PLAYER ACTUALLY GET THERE?
//
// This test exists because of the worst defect found in this repository, and it
// was not a bug. Everything worked. Six pages lived in public/ and exactly ONE
// of them was reachable:
//
//     index.html             227 KB   the game -- linked to no other page
//     model-library.html      53 KB   orphaned
//     kit-contact-sheet.html  27 KB   orphaned
//     city.html               27 KB   orphaned
//     world.html               9 KB   orphaned
//     plan-preview.html      0.6 KB   the only page that linked anywhere
//
// 2,400 registry entries and 2,403 model builders, and a player could only see
// them by typing a filename. Nothing was broken, no test failed, and nothing
// ever would have: an unreachable page is not an error, it is an absence, and
// absences do not throw.
//
// That is why this check has to walk the links rather than check the files
// exist. Every previous check in this suite asks "is this thing correct" -- this
// one asks "can anyone find it", which is a different question and the one that
// was never being asked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const PUBLIC = path.join(repoRoot(), "public");
const HOME = "index.html";

/**
 * Is this page a redirect stub rather than somewhere a player lands?
 *
 * DETECTED, NOT NAMED. plan-preview.html exists only so an already-shared URL
 * still works -- it replaces the location immediately and carries the query
 * string across. Linking a redirect from a menu would be wrong, and demanding a
 * "way back" from a page nobody stays on is meaningless.
 *
 * But excluding it BY NAME would be a hard-coded exception, and the next stub
 * would be excluded by nobody. So the property is what excludes it: a page that
 * navigates away on load is not a destination. If plan-preview ever stops
 * redirecting, it stops being exempt on the same line.
 */
function isRedirectStub(page: string): boolean {
  const html = readFileSync(path.join(PUBLIC, page), "utf8");
  return /location\.replace\(/.test(html) || /http-equiv=["\']refresh["\']/i.test(html);
}

/** Every .html file a player could actually land on. */
function pages(): string[] {
  return readdirSync(PUBLIC).filter((f) => f.endsWith(".html") && !isRedirectStub(f));
}

/** Including the stubs -- used where the question is about files, not destinations. */
function allHtml(): string[] {
  return readdirSync(PUBLIC).filter((f) => f.endsWith(".html"));
}

/** The pages this one links to, by filename, ignoring anchors and query strings. */
function linksFrom(page: string): Set<string> {
  const html = readFileSync(path.join(PUBLIC, page), "utf8");
  const out = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/g)) {
    const raw = m[1].split("#")[0].split("?")[0];
    if (!raw.endsWith(".html")) continue;
    out.add(path.basename(raw));
  }
  return out;
}

test("every page is reachable from the front door", () => {
  // A breadth-first walk from index.html, exactly as a player moves: click
  // something, see where you land, click again.
  const all = pages();
  assert.ok(all.includes(HOME), "there is no index.html -- the game has no front door at all");

  const seen = new Set<string>([HOME]);
  const queue = [HOME];
  while (queue.length) {
    const here = queue.shift()!;
    for (const next of linksFrom(here)) {
      if (!all.includes(next) || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  const stranded = all.filter((p) => !seen.has(p));
  assert.deepEqual(
    stranded,
    [],
    `${stranded.length} page(s) cannot be reached from ${HOME} by clicking: ${stranded.join(", ")}.\n` +
      "A page nobody can navigate to is not a feature, however well it works.",
  );
});

test("every page offers a way back, so none of them is a trap", () => {
  // A door that opens one way is barely a door. A player who finds the
  // catalogue and cannot get home has been trapped by the navigation, and that
  // reads as broken even when every page on both sides works perfectly.
  // THE LINK IS THE EVIDENCE, NOT THE CLASS NAME.
  //
  // The first version accepted EITHER a `back-to-caliper` class OR a link home.
  // A mutation renaming the class survived, correctly: the href was still there,
  // so the page still had a way back and the test was right to pass. But that
  // exposed the real weakness in the other direction -- a page carrying the
  // class with a broken or missing href would ALSO have passed, on the strength
  // of a CSS class name.
  //
  // A class is decoration. An href is the way out. Only the href is checked.
  const trapped: string[] = [];
  for (const page of pages()) {
    if (page === HOME) continue;
    if (!linksFrom(page).has(HOME)) trapped.push(page);
  }
  assert.deepEqual(trapped, [], `these pages have no way back to ${HOME}: ${trapped.join(", ")}`);
});

test("the Build menu names the catalogue, and the catalogue exists", () => {
  // The link and the file are two different claims. A menu entry pointing at a
  // page that is not there is worse than no menu entry: it promises something
  // and then 404s, which is the same class of defect as a declaration that no
  // longer matches the code.
  const home = readFileSync(path.join(PUBLIC, HOME), "utf8");
  assert.match(home, /data-menu="build"/, "the Build menu is gone");

  const named = [...linksFrom(HOME)];
  assert.ok(named.length > 0, "index.html links to no other page at all");

  const missing = named.filter((p) => !allHtml().includes(p));
  assert.deepEqual(missing, [], `index.html links to pages that do not exist: ${missing.join(", ")}`);

  // And specifically the catalogue, because that is the one this was built for.
  assert.ok(
    named.includes("model-library.html"),
    "the catalogue is not linked from the front door -- 2,400 models are unreachable again",
  );
});

test("the back control is painted before the scene it sits on top of", () => {
  // These pages build large 3D scenes. A back link injected by a script after
  // the renderer boots is missing during the slowest, most confusing moment --
  // and absent entirely if the renderer throws, which is exactly when a player
  // most wants to leave.
  for (const page of pages()) {
    const html = readFileSync(path.join(PUBLIC, page), "utf8");
    const idx = html.indexOf("back-to-caliper");
    if (idx === -1) continue;
    const body = html.search(/<body[^>]*>/);
    assert.ok(body !== -1, `${page} has no body tag`);
    // The first script INSIDE the body. A page may legitimately carry an
    // importmap in its head -- kit-contact-sheet.html does -- and that is not a
    // renderer whose failure could strand anyone.
    const bodyEnd = html.search(/<body[^>]*>/) + (html.match(/<body[^>]*>/)?.[0].length ?? 0);
    const firstScript = html.indexOf("<script", bodyEnd);
    assert.ok(
      idx > body && (firstScript === -1 || idx < firstScript),
      `${page}'s back control is not plain markup at the top of the body -- it will be missing exactly when the renderer fails`,
    );
  }
});
