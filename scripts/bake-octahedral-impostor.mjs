// BAKE-OCTAHEDRAL-IMPOSTOR — I1, docs/briefs/OVERNIGHT-BLD-2026-09-14.md.
//
// Renders public/impostor-bake-scene.html headlessly (same
// Chromium+SwiftShader technique as scripts/shoot-look-proof.mjs), reads
// back its three atlas canvases (colour, normal, depth) and its own
// measured bake stats, and writes both the PNGs and a JSON report to
// docs/look-proof-shots/impostor-bake/.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT_DIR = path.join(ROOT, "docs/look-proof-shots/impostor-bake");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".glb": "model/gltf-binary",
};
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
const PORT = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
         "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE " + m.text());
  else console.log("  " + m.text());
});

const t0 = Date.now();
await page.goto(`http://127.0.0.1:${PORT}/impostor-bake-scene.html`, { waitUntil: "load", timeout: 60000 });
try {
  await page.waitForFunction("window.__ready === true || window.__ready === 'error'", null, { timeout: 60000 });
} catch {
  errors.push("TIMEOUT waiting for window.__ready");
}
const ready = await page.evaluate(() => window.__ready);

if (ready === true) {
  const atlases = await page.evaluate(() => window.__atlases);
  const stats = await page.evaluate(() => window.__impostorStats);
  for (const [name, dataUrl] of Object.entries(atlases)) {
    fs.writeFileSync(path.join(OUT_DIR, `${name}-atlas.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
  }
  // Measure the REAL committed PNG bytes too -- compressed atlas size on
  // disk, alongside the uncompressed RGBA figure the page itself reports.
  const realFileBytes = {};
  let totalRealBytes = 0;
  for (const name of Object.keys(atlases)) {
    const p = path.join(OUT_DIR, `${name}-atlas.png`);
    const b = fs.statSync(p).size;
    realFileBytes[name] = b;
    totalRealBytes += b;
  }
  const report = { ...stats, realPngBytesPerAtlas: realFileBytes, totalRealPngBytes: totalRealBytes };
  fs.writeFileSync(path.join(OUT_DIR, "stats.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`wrote ${Object.keys(atlases).length} atlases + stats.json in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`NOT WRITTEN -- window.__ready was "${ready}"`);
}

await page.close().catch(() => {});
await browser.close();
server.close();
if (errors.length) { console.log("\nERRORS:"); for (const e of [...new Set(errors)]) console.log("  " + e); process.exitCode = 1; }
