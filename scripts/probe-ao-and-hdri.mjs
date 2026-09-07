import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

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
const PORT = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});

const views = ["Street level", "Downtown skyline", "The harbour"];

console.log("\n=== A1.1 SSAO/GTAO PASS PERFORMANCE ===");
console.log("| Camera | AO Mode | Draw Calls | Drawn Triangles | Frame Time min/med/max (ms) | Headless Script Time |");
console.log("|---|---|---|---|---|---|");

for (const ao of [0, 1]) {
  for (const v of views) {
    const t0 = performance.now();
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    const url = `http://127.0.0.1:${PORT}/city.html?post=1&ao=${ao}&chunkSize=2000&view=${encodeURIComponent(v)}&still=6`;
    await page.goto(url, { timeout: 120000 });
    await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
    const info = await page.evaluate(() => {
      const renderStats = window.__getRenderStats ? window.__getRenderStats() : {
        calls: window.__renderer ? window.__renderer.info.render.calls : 0,
        triangles: window.__renderer ? window.__renderer.info.render.triangles : 0,
      };
      const frameStats = window.__getFrameStats ? window.__getFrameStats() : null;
      return {
        calls: renderStats.calls,
        tris: renderStats.triangles,
        frameStats,
      };
    });
    const scriptTime = (performance.now() - t0).toFixed(1) + "ms";
    await page.close();
    const ftStr = info.frameStats ? `${info.frameStats.min} / ${info.frameStats.median} / ${info.frameStats.max}` : "N/A";
    console.log(`| ${v} | ${ao === 1 ? "GTAO Enabled" : "No AO"} | ${info.calls} | ${info.tris.toLocaleString()} | ${ftStr} | ${scriptTime} |`);
  }
}

console.log("\n=== A1.2 HDRI RUNTIME VERIFICATION ===");
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const url = `http://127.0.0.1:${PORT}/city.html?post=1&ao=0&chunkSize=2000&view=Downtown%20skyline&still=10`;
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
  const hdriStats = await page.evaluate(() => {
    const scene = window.__scene;
    const env = scene ? scene.environment : null;
    const hasEnv = Boolean(env);
    const envIntensity = scene ? scene.environmentIntensity : 0;
    return {
      hasEnv,
      envIntensity,
    };
  });
  console.log("HDRI runtime scene test:", JSON.stringify(hdriStats));
  await page.close();
}

await browser.close();
server.close();
