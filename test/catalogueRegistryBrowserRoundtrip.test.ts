// SDB-3 (PLAN.md §6.5, CHECKLIST.md): "the page loads and an authored piece
// places, in a real browser." test/catalogueRegistryBrowserSafe.test.ts
// proves the STRUCTURAL half (the import graph resolves with no node:*
// built-in) via a static esbuild bundle -- necessary, not sufficient. This
// is the dynamic half: an ACTUAL Chromium, headless, executing the real
// modules from public/, doing a real author-then-place round trip and
// reporting the result back across the page boundary. No wrangler dev, no
// Worker -- SDB-3's own defect is entirely client-side module loading, and
// nothing about the guided form/loop UI (SDB-4/5/6) exists yet to serve a
// real page against, so this drives the modules directly, the way any
// future authoring UI necessarily will.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// process.cwd(), not import.meta.url -- test/run.mjs esbuild-bundles this
// file into test/.built/ before running it, so a path computed relative to
// THIS file's own url resolves one level short of the real repo root (the
// exact bundling-depth mistake scripts/migrate-catalogue-s2-fields.mjs's own
// repoRoot() and test/modulesLoad.test.ts both already document). The
// runner is always invoked from the repo root, so process.cwd() is stable
// at any bundling depth -- test/modulesLoad.test.ts's own established
// pattern, reused here rather than re-deriving it.
const PUBLIC = path.join(process.cwd(), "public");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };

// The real round trip, executed AS PAGE JAVASCRIPT (import() of real
// public/ files, served over http:// so ES module resolution behaves the
// way an actual deployed page's does -- file:// import semantics differ
// across browsers and would not be testing the real thing).
const ROUNDTRIP_HTML = `<!doctype html><html><body><script type="module">
import { createCatalogueRegistry, UNIQUENESS_MULTIPLIER } from "/catalogue-registry.js";
import { createAreaBoard } from "/area-board.js";

const BASE_CATALOGUE = {
  "house-a": { id: "house-a", category: "residential", footprint: [1, 1], rotatable: true, terrainMask: ["land"], pivot: "corner", massing: ["base"], baseValue: 1, adjacency: {}, unitQuality: 1 },
};

const registry = createCatalogueRegistry(BASE_CATALOGUE);
const authored = registry.addAuthoredEntry({
  id: "browser-authored-house", footprint: [1, 1], category: "residential", rotatable: true,
  terrainMask: ["land"], massing: ["base"],
  author: "playwright", verifiedBy: "sdb-3-gate", createdAt: "2026-09-15T00:00:00Z", sourceRef: "roundtrip",
});

const catalogue = registry.all();
const board = createAreaBoard({ width: 5, height: 5, catalogue });
const placed = board.place("browser-authored-house", { x: 0, y: 0 }, 0, { id: 1 });

window.__sdb3Result = {
  authoredOk: authored.ok,
  baseValueDoubled: authored.ok && authored.entry.baseValue === 1 * UNIQUENESS_MULTIPLIER,
  placedOk: placed.ok,
};
</script></body></html>`;

test("GATE (SDB-3): a piece is authored and PLACED entirely inside a real Chromium page, via the real public/ ES modules over http", async () => {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (url === "/roundtrip.html") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(ROUNDTRIP_HTML);
    }
    const file = path.join(PUBLIC, url);
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end("not found");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;

  const browser = await chromium.launch();
  const pageErrors: string[] = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("requestfailed", (r) => pageErrors.push(`requestfailed ${r.url()}: ${r.failure()?.errorText}`));
    await page.goto(`http://127.0.0.1:${port}/roundtrip.html`);
    try {
      await page.waitForFunction(() => (window as unknown as { __sdb3Result?: unknown }).__sdb3Result !== undefined, undefined, { timeout: 10_000 });
    } catch (e) {
      throw new Error(`waitForFunction failed: ${(e as Error).message}; page signals so far: ${JSON.stringify(pageErrors)}`);
    }
    const result = await page.evaluate(() => (window as unknown as { __sdb3Result: { authoredOk: boolean; baseValueDoubled: boolean; placedOk: boolean } }).__sdb3Result);

    assert.deepEqual(pageErrors, [], `the real browser page threw: ${pageErrors.join("; ")}`);
    assert.equal(result.authoredOk, true, "addAuthoredEntry refused a valid entry inside the real browser");
    assert.equal(result.baseValueDoubled, true, "the uniqueness multiplier did not apply inside the real browser");
    assert.equal(result.placedOk, true, "the authored piece did not PLACE inside the real browser -- SDB-3's own literal gate");
  } finally {
    await browser.close();
    server.close();
  }
});
