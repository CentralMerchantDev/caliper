import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const SHOTS = path.join(ROOT, ".shots");

if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url === "/" ? "/kitbash-district.html" : url);
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

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`http://127.0.0.1:${PORT}/kitbash-district.html`, { timeout: 120000 });
await page.waitForFunction("window.__ready === true", null, { timeout: 60000 });

const mix = await page.evaluate(() => window.__mix);
console.log("District mix statistics:", JSON.stringify(mix));

const shotPath = path.join(SHOTS, "kitbash-district-mix.png");
await page.screenshot({ path: shotPath, fullPage: false });
console.log(`Saved district mix screenshot to ${shotPath}`);

await page.close();
await browser.close();
server.close();
