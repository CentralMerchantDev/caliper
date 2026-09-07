// Screenshot public/arterial-network-map.html -- BOARD-CONVERSION-PLAN.md
// P2.6's "Mark judges whether it looks like a city he could drive... that
// judgement needs a render", for the arterial layer specifically.
//
// Run: node scripts/_render-arterial-data.mjs && node scripts/shoot-arterial-network.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, ".shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("not found");
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`http://localhost:${port}/arterial-network-map.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__arterialMapReady === true, { timeout: 15000 });
await page.waitForTimeout(200);

await page.screenshot({ path: path.join(OUT, "arterial-network-map.png") });

await browser.close();
server.close();

console.log(`errors: ${errors.length}`);
for (const e of errors) console.log("  " + e);
console.log(`wrote ${path.join(OUT, "arterial-network-map.png")}`);
process.exit(errors.length ? 1 : 0);
