// The front-end modules must at least LOAD.
//
// A blind audit put a bare `throw` at module scope in world-render-3d.js and the
// browser check stayed green, because that check route-stubs the renderer -- the
// real file is never parsed there. Its own comment claimed otherwise.
//
// The node suite did catch it, but only by accident: focusDistance.test.ts
// imports the real module for a different reason, so a module-scope failure took
// that file down with it. Coverage that exists as a side effect of an unrelated
// test is coverage that disappears the moment someone rewrites that test to use
// a fixture. This makes it deliberate and says what it is for.
//
// This is a load check, not a behaviour check. It answers one question: does the
// module evaluate at all. Everything a module does after that belongs elsewhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Absolute, from the repo root. A relative specifier resolves against THIS
// file, and the runner compiles tests into test/.built/ first -- so "../public"
// pointed at test/public and every one of these failed to resolve. Static
// imports are rewritten by the build; a runtime string is not.
const FILES = [
  "world-render-3d.js", "menus.js", "workbench.js", "navigate.js",
  "grid.js", "ground.js", "place.js", "world-registry.js", "prop-manifest.js",
];

for (const name of FILES) {
  test(`${name} evaluates`, async () => {
    const spec = pathToFileURL(path.join(process.cwd(), "public", name)).href;
    const mod = await import(spec);
    // An empty module object would mean it parsed and exported nothing, which
    // for every file in this list would be a mistake rather than a design.
    assert.ok(
      Object.keys(mod).length > 0,
      `${spec} loaded but exported nothing`,
    );
  });
}

// PAIRED: the check above only means something if a broken module actually
// fails it. This proves the import machinery reports failure rather than
// resolving to an empty object -- the way a load check quietly stops working.
test("a module that throws is reported, not swallowed", async () => {
  await assert.rejects(
    () => import("data:text/javascript,throw new Error('deliberate')"),
    /deliberate/,
  );
});
