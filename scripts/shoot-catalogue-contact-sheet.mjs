// SHOOT-CATALOGUE-CONTACT-SHEET — CP2, docs/specs/REBUILD-CHECKLIST.md.
//
// public/catalogue-contact-sheet.html renders every glb-bound catalogue
// entry with a DOM label positioned over its own real screen projection.
// scripts/shoot-look-proof.mjs's own canvas.toDataURL() capture would
// miss those labels entirely (they are HTML, not WebGL) -- this uses
// page.screenshot() instead, the one real difference from that script.
//
//   node scripts/shoot-catalogue-contact-sheet.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "docs/look-proof-shots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".glb": "model/gltf-binary",
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const base = url.startsWith("/data/") ? DATA : PUBLIC;
  const rel = url.startsWith("/data/") ? url.slice("/data/".length) : url;
  const file = path.join(base, rel);
  if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("not found");
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const W = 1400, H = 900;
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
         "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE " + m.text());
  else console.log("  " + m.text());
});

const t0 = Date.now();
await page.goto(`http://127.0.0.1:${PORT}/catalogue-contact-sheet.html`, { waitUntil: "load", timeout: 60000 });
try {
  await page.waitForFunction("window.__ready === true || window.__ready === 'error'", null, { timeout: 60000 });
} catch {
  errors.push("TIMEOUT waiting for window.__ready");
}
const ready = await page.evaluate(() => window.__ready);

if (ready === true) {
  const counts = await page.evaluate(() => ({ bound: window.__boundCount, total: window.__totalCount }));
  await page.screenshot({ path: path.join(OUT_DIR, "27-catalogue-contact-sheet.png") });
  console.log(`wrote 27-catalogue-contact-sheet.png in ${((Date.now() - t0) / 1000).toFixed(1)}s -- ${counts.bound}/${counts.total} catalogue entries bound`);
} else {
  console.log(`NOT WRITTEN -- window.__ready was "${ready}"`);
}

await page.close().catch(() => {});
await browser.close();
server.close();
if (errors.length) { console.log("\nERRORS:"); for (const e of [...new Set(errors)]) console.log("  " + e); process.exitCode = 1; }
