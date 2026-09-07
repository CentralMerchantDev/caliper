import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "Code", "sandbox-spike");
const PUBLIC = path.join(ROOT, "public");
const SHOTS_OUT = path.join(ROOT, ".shots");
const ARTIFACTS_OUT = "C:\\Users\\User\\.gemini\\antigravity\\brain\\fddb8235-96c2-4609-87df-43a8a184d182";

fs.mkdirSync(SHOTS_OUT, { recursive: true });

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

const W = 1500, H = 860;
const browser = await chromium.launch({
  args: [
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"
  ],
});

const results = [];

// 1. Six core camera views
const CAMERA_VIEWS = [
  "The harbour",
  "Downtown skyline",
  "Downtown close",
  "Street level",
  "Waterfront",
  "Heritage quarter",
];

for (const viewName of CAMERA_VIEWS) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=0&post=0&still=2&pdb=1&view=${encodeURIComponent(viewName)}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 240000 });
  
  const renderInfo = await page.evaluate(() => {
    if (window.__renderer && window.__renderer.info) {
      return {
        calls: window.__renderer.info.render.calls,
        triangles: window.__renderer.info.render.triangles,
      };
    }
    return null;
  });

  const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  const fileName = viewName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-stage1.png";
  
  fs.writeFileSync(path.join(SHOTS_OUT, fileName), buffer);
  if (fs.existsSync(ARTIFACTS_OUT)) {
    fs.writeFileSync(path.join(ARTIFACTS_OUT, fileName), buffer);
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[CAMERA] ${fileName}: ${durationSec}s, calls=${renderInfo?.calls}, tris=${renderInfo?.triangles?.toLocaleString()}`);
  results.push({ name: viewName, file: fileName, ...renderInfo, durationSec });
  await page.close();
}

// 2. Night render
{
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=0&post=0&still=2&pdb=1&tod=night&view=Downtown%20skyline`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 240000 });
  
  const renderInfo = await page.evaluate(() => ({
    calls: window.__renderer?.info?.render?.calls,
    triangles: window.__renderer?.info?.render?.triangles,
  }));

  const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  const fileName = "downtown-skyline-night.png";
  
  fs.writeFileSync(path.join(SHOTS_OUT, fileName), buffer);
  if (fs.existsSync(ARTIFACTS_OUT)) {
    fs.writeFileSync(path.join(ARTIFACTS_OUT, fileName), buffer);
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[NIGHT] ${fileName}: ${durationSec}s, calls=${renderInfo?.calls}, tris=${renderInfo?.triangles?.toLocaleString()}`);
  results.push({ name: "Downtown skyline (Night)", file: fileName, ...renderInfo, durationSec });
  await page.close();
}

// 3. Kitbash comparison: Air & Street
for (const mode of ["air", "street"]) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const url = `http://127.0.0.1:${PORT}/kitbash-comparison.html?view=${mode}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });

  const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  const fileName = `kitbash-tower-${mode}.png`;

  fs.writeFileSync(path.join(SHOTS_OUT, fileName), buffer);
  if (fs.existsSync(ARTIFACTS_OUT)) {
    fs.writeFileSync(path.join(ARTIFACTS_OUT, fileName), buffer);
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[KITBASH] ${fileName}: ${durationSec}s`);
  results.push({ name: `Kitbash Comparison (${mode})`, file: fileName, durationSec });
  await page.close();
}

await browser.close();
server.close();

console.log("\nSummary of Render Measurements:");
console.table(results);
