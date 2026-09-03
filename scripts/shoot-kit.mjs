import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.ROOT || process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OUT = process.env.OUT || path.join(ROOT, ".shots", "kit");
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".hdr": "application/octet-stream",
  ".txt": "text/plain",
  ".css": "text/css"
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url === "/" ? "/kit-contact-sheet.html" : url);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end("Not Found");
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ["--no-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
  headless: true
});

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`http://127.0.0.1:${port}/kit-contact-sheet.html`);

await page.waitForTimeout(2000);

const filters = [
  "all",
  "roof",
  "furniture",
  "facade",
  "vegetation",
  "people",
  "vehicles",
  "maritime",
  "airport",
  "aviation",
  "roads"
];

for (const f of filters) {
  const btn = page.locator(`.filter-btn[data-filter="${f}"]`);
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(400);
    const shotPath = path.join(OUT, `${f}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);
  }
}

await browser.close();
server.close();
console.log("All kit screenshots captured successfully into .shots/kit/");
