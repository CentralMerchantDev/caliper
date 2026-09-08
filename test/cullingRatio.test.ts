import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function repoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      fs.readFileSync(path.join(dir, "package.json"), "utf8");
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error("could not find the repository root");
}

const ROOT = repoRoot();
const PUBLIC = path.join(ROOT, "public");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

test("street level drawn triangles are a small fraction of skyline view (culling ratio gate)", async () => {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(
      PUBLIC,
      url === "/" ? "/city.html" : url === "/world-source" ? "/sim-baseline.generated.js" : url,
    );
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end("not found");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const browser = await chromium.launch({
    args: [
      "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"
    ],
  });

  // frustumCull=0 is an existing debug flag (public/city-render.js) that turns
  // off THREE's per-mesh frustumCulled flag without touching LOD selection or
  // chunk size. Comparing the SAME camera with it on vs off isolates frustum
  // culling itself, decoupled from LOD/geometry budget -- a street-vs-skyline
  // triangle ratio cannot do that, because richer near LOD0 geometry raises
  // the ratio regardless of whether culling still works. See
  // docs/audits/K6-BUILDINGS.md "The culling-ratio gate was measuring the
  // wrong thing" for the derivation and the 90% floor's reasoning; this test
  // duplicated test/regressionGate.test.ts's old triangle-ratio gate exactly
  // (same unsourced 40% threshold), so it gets the same replacement.
  const getCalls = async (viewName, frustumCull) => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    const url = `http://127.0.0.1:${port}/city.html?bare=1&dpr=1&shadows=0&post=0&still=5&pdb=1&chunkSize=2000&view=${encodeURIComponent(viewName)}&frustumCull=${frustumCull}`;
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction("window.__ready === true", null, { timeout: 240000 });
    const info = await page.evaluate(() => {
      const stats = window.__getRenderStats ? window.__getRenderStats() : {
        calls: window.__renderer.info.render.calls,
        triangles: window.__renderer.info.render.triangles,
      };
      return {
        calls: stats.calls,
        triangles: stats.triangles,
      };
    });
    await page.close();
    return info;
  };

  try {
    const on = await getCalls("Street level", 1);
    const off = await getCalls("Street level", 0);
    const retained = on.calls / off.calls;
    console.log(`Frustum culling measurement: Street level ${on.calls} calls with culling, ${off.calls} without (retained ${(retained * 100).toFixed(2)}%)`);

    // Culling must discard a real fraction of draw calls, not merely avoid
    // drawing everything. 90% is a floor derived from "less than a 10%
    // reduction is not meaningfully culling," not from today's measurement.
    assert.ok(
      retained < 0.90,
      `Culling failed: Street level retains ${(retained * 100).toFixed(1)}% of draw calls with culling on vs off (${on.calls} vs ${off.calls}). Must discard >=10%.`
    );
  } finally {
    await browser.close();
    server.close();
  }
});
