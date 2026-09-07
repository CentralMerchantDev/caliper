// Screenshot public/roadkit-street-demo.html and print its verification
// report to stdout as JSON. One-off, for WORLD-REBALANCE-BRIEF.md's
// road-piece-kit step 3 ("one street, end to end... rendered").
//
// Run: node scripts/shoot-roadkit-street.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, ".shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png" };
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
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`http://localhost:${port}/roadkit-street-demo.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__streetDemoReady === true, { timeout: 15000 });
await page.waitForTimeout(300);

const verification = await page.evaluate(() => window.__streetDemoVerification);
await page.screenshot({ path: path.join(OUT, "roadkit-street-demo.png") });

await browser.close();
server.close();

console.log(`errors: ${errors.length}`);
for (const e of errors) console.log("  " + e);
console.log("\nverification:");
console.log(JSON.stringify(verification, null, 2));
const allOk = verification.every((v) => v.dimensionalOk && v.positionOk && v.bearingOk);
console.log(`\nALL JOINS VERIFIED: ${allOk}`);
console.log(`wrote ${path.join(OUT, "roadkit-street-demo.png")}`);
process.exit(errors.length || !allOk ? 1 : 0);
