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
const chunkSizes = [1500, 2000, 3000, 4000];

console.log("\n| Chunk Size | Camera | Draw Calls | Drawn Triangles | Frame Time (GPU loop) | Headless Script Time |");
console.log("|---|---|---|---|---|---|");

for (const cs of chunkSizes) {
  for (const v of views) {
    const t0 = performance.now();
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=0&post=0&still=2&pdb=1&chunkSize=${cs}&view=${encodeURIComponent(v)}`;
    await page.goto(url, { timeout: 120000 });
    await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
    const info = await page.evaluate(() => {
      return {
        calls: window.__renderer.info.render.calls,
        triangles: window.__renderer.info.render.triangles,
        frameTime: window.__lastFrameMs || (1000 / (window.__fps || 60)),
      };
    });
    const scriptTime = (performance.now() - t0).toFixed(1) + "ms";
    await page.close();
    console.log(`| ${cs}m | ${v} | ${info.calls} | ${info.triangles.toLocaleString()} | ${typeof info.frameTime === 'number' ? info.frameTime.toFixed(1) + 'ms' : info.frameTime} | ${scriptTime} |`);
  }
}

await browser.close();
server.close();
