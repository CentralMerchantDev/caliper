import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, ".shots", "v3-exemplar");
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url === "/" ? "/city.html" : url === "/world-source" ? "/sim-baseline.generated.js" : url);
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

const MODELS = [
  { id: "bld-highend-art-deco-skyscraper", label: "tier-a-800-tris" },
  { id: "bld-showstopper-art-deco-skyscraper", label: "tier-b-3000-tris" }
];

const VIEWS = [
  { name: "air", tx: 184 / 0.65, ty: 75, tz: 805 / 0.65, dist: 260, az: 3.4, pitch: 0.42 },
  { name: "street", tx: 184 / 0.65, ty: 18, tz: 805 / 0.65, dist: 90, az: 0.15, pitch: 0.14 }
];

for (const model of MODELS) {
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=0&post=0&still=2&pdb=1&debugOverridePlot=block-146-760-p0&debugOverrideModel=${model.id}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction("window.__ready === true", null, { timeout: 60000 });

    await page.evaluate(({ tx, ty, tz, dist, az, pitch }) => {
      window.__set(tx, ty, tz, dist, az, pitch);
      window.__renderOnce();
    }, v);

    await page.waitForTimeout(200);
    const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
    const filename = `${model.label}-${v.name}.png`;
    fs.writeFileSync(path.join(OUT, filename), Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log(`Rendered: ${filename}`);
    await page.close();
  }
}

await browser.close();
server.close();
console.log("All exemplar shots saved to:", OUT);
