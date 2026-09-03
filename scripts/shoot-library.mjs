import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.ROOT || process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, ".shots", "library");
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
  const file = path.join(PUBLIC, url === "/" ? "/model-library.html" : url);
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
await page.goto(`http://127.0.0.1:${port}/model-library.html`);

// Scroll down to trigger all IntersectionObservers
await page.evaluate(async () => {
  const scrollStep = 400;
  for (let y = 0; y < document.body.scrollHeight; y += scrollStep) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 40));
  }
  window.scrollTo(0, 0);
});

await page.waitForTimeout(1500);

const categories = [
  "all", "roof", "furniture", "ground", "facade", "boundary",
  "vegetation", "people", "vehicles", "maritime", "airport", "aviation", "roads", "civic", "buildings", "parks", "industrial"
];

for (const cat of categories) {
  const btn = page.locator(`#category-filters .filter-btn[data-cat="${cat}"]`);
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(300);
    // Scroll through visible cards
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    const shotPath = path.join(OUT, `${cat}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved library screenshot: ${shotPath}`);
  }
}

// Open modal on first card and screenshot
const firstCard = page.locator(".card:visible").first();
if (await firstCard.count() > 0) {
  await firstCard.click();
  await page.waitForTimeout(600);
  const modalShotPath = path.join(OUT, "modal-inspect.png");
  await page.screenshot({ path: modalShotPath });
  console.log(`Saved modal inspector screenshot: ${modalShotPath}`);
}

await browser.close();
server.close();
console.log("All model library screenshots captured successfully into .shots/library/");
