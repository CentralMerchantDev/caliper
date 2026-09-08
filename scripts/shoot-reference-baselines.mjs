import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const BASELINES = path.join(ROOT, ".shots", "baselines");

if (!fs.existsSync(BASELINES)) fs.mkdirSync(BASELINES, { recursive: true });

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
  args: [
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"
  ],
});

const views = [
  { name: "Downtown skyline", slug: "downtown-skyline" },
  { name: "Downtown close", slug: "downtown-close" },
  { name: "Street level", slug: "street-level" },
  { name: "The harbour", slug: "the-harbour" },
  { name: "Waterfront", slug: "waterfront" },
  { name: "Heritage quarter", slug: "heritage-quarter" },
  // P3.5.3: none of the six baselines above frames the container port, the
  // one defect Mark could actually see and could not judge from any
  // existing angle. "Container port" is an existing preset in city.html's
  // own VIEWS object (under "THE REGION") -- reused, not invented, and the
  // same camera scripts/measure-floating.mjs's threshold is derived from.
  { name: "Container port", slug: "container-port" },
];

console.log("\n=== A5.1 SHOOTING FIXED-CAMERA BASELINE RENDERS ===");

for (const v of views) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const url = `http://127.0.0.1:${PORT}/city.html?post=1&chunkSize=2000&view=${encodeURIComponent(v.name)}&still=6`;
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });

  const outPath = path.join(BASELINES, `${v.slug}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved baseline render: ${outPath}`);
  await page.close();
}

await browser.close();
server.close();
console.log("All baseline renders captured successfully.");
