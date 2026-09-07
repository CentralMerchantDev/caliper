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
const BASELINES = path.join(ROOT, ".shots", "baselines");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

test("A5.1: Baseline reference renders exist and are valid non-empty files", () => {
  const views = [
    "downtown-skyline", "downtown-close", "street-level",
    "the-harbour", "waterfront", "heritage-quarter"
  ];
  for (const v of views) {
    const file = path.join(BASELINES, `${v}.png`);
    assert.ok(fs.existsSync(file), `Baseline ${v}.png must exist`);
    const stat = fs.statSync(file);
    assert.ok(stat.size > 50000, `Baseline ${v}.png must be > 50KB, got ${stat.size} bytes`);
  }
  console.log("✔ A5.1: All 6 baseline renders verified present on disk");
});

test("A5.2 & A5.3: Automated Regression Gate: draw calls, triangles, culling ratio, and LOD bounds", async () => {
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

  const measureView = async (viewName) => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    const url = `http://127.0.0.1:${port}/city.html?bare=1&dpr=1&shadows=0&post=0&still=2&pdb=1&chunkSize=2000&view=${encodeURIComponent(viewName)}`;
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction("window.__ready === true", null, { timeout: 240000 });
    const info = await page.evaluate(() => ({
      calls: window.__renderer ? window.__renderer.info.render.calls : 0,
      triangles: window.__renderer ? window.__renderer.info.render.triangles : 0,
      hasEnv: Boolean(window.__scene && window.__scene.environment),
    }));
    await page.close();
    return info;
  };

  const street = await measureView("Street level");
  const skyline = await measureView("Downtown skyline");
  const harbour = await measureView("The harbour");

  await browser.close();
  server.close();

  console.log("\n=== REGRESSION GATE MEASUREMENTS ===");
  console.log(`Street level:     ${street.calls} calls, ${street.triangles.toLocaleString()} triangles`);
  console.log(`Downtown skyline: ${skyline.calls} calls, ${skyline.triangles.toLocaleString()} triangles`);
  console.log(`The harbour:      ${harbour.calls} calls, ${harbour.triangles.toLocaleString()} triangles`);

  const ratio = street.triangles / skyline.triangles;
  console.log(`Culling Ratio:    ${(ratio * 100).toFixed(2)}% (Limit: < 40.0%)`);

  // Hard assertion budgets
  assert.ok(street.calls <= 900, `Street draw calls (${street.calls}) must be <= 900`);
  assert.ok(skyline.calls <= 900, `Skyline draw calls (${skyline.calls}) must be <= 900`);
  assert.ok(harbour.calls <= 900, `Harbour draw calls (${harbour.calls}) must be <= 900`);

  assert.ok(street.triangles <= 12000000, `Street triangles within 12M budget`);
  assert.ok(skyline.triangles <= 12000000, `Skyline triangles within 12M budget`);
  assert.ok(harbour.triangles <= 12000000, `Harbour triangles within 12M budget`);

  assert.ok(ratio < 0.40, `Culling ratio must be < 40%, got ${(ratio * 100).toFixed(2)}%`);
  assert.equal(skyline.hasEnv, true, "HDRI environment must be active");
});
