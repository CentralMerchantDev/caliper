// SHOOT-LOOK-PROOF — one fixed camera, one page, one PNG.
//
// scripts/shoot.mjs is wired to city.html's own ?view= camera-position
// mechanism, which is dormant (city.html is quarantined, Phase 1 "take it
// all down"). This is the same technique -- Chromium + SwiftShader, read
// the canvas directly rather than through the compositor -- pointed at
// public/look-proof-scene.html by default, for
// docs/briefs/BLD-2026-09-14-look-proof.md's own before/after evidence.
//
//   node scripts/shoot-look-proof.mjs <output-name> [page.html]
//
// [page.html] defaults to look-proof-scene.html -- I2
// (docs/briefs/OVERNIGHT-BLD-2026-09-14.md) reuses this same script for
// overview-massing-scene.html rather than a third near-duplicate.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT_DIR = process.env.SHOOT_OUT || path.join(ROOT, "docs/look-proof-shots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const outName = process.argv[2];
const pageName = process.argv[3] || "look-proof-scene.html";
if (!outName) {
  console.error("usage: node scripts/shoot-look-proof.mjs <output-name> [page.html]");
  process.exit(1);
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".glb": "model/gltf-binary", ".hdr": "application/octet-stream",
};

// RB1 -- board mode fetches the real data/catalogue.json (BO7A's own glb
// bindings), which lives at the repo root, deliberately outside public/
// (CLI's own data, not a served asset). `/data/...` is the one exception,
// mapped to ROOT/data/ instead of PUBLIC -- everything else is unchanged.
const DATA = path.join(ROOT, "data");
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

const W = +(process.env.SHOOT_W || 1200), H = +(process.env.SHOOT_H || 700);
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
         "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const errors = [];
// FIX-4 (docs/briefs/BLD-2026-09-16.md) -- 26-readout-real-numbers.png
// showed a cursor marker and no number anywhere in frame, because there
// never was one: look-proof-scene.html's own RB3/RC5 design renders the
// readout as a coloured 3D marker plus a console.log line
// ("READOUT-STATE cell=... current=... ifPlaced=..."), deliberately, not
// on-screen text -- the screenshot was only ever meant to be HALF the
// evidence, paired with the console line. That pairing was never actually
// preserved: this script printed console lines to the terminal and threw
// them away the moment the process exited, so the "real numbers" in
// 26's own commit message were a hand transcript, not something anyone
// could check against a committed artefact afterward. Captured here
// (every line, not just errors) and written to a companion file below.
const consoleLines = [];
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => {
  consoleLines.push(m.text());
  if (m.type() === "error") errors.push("CONSOLE " + m.text());
  else console.log("  " + m.text());
});

const t0 = Date.now();
await page.goto(`http://127.0.0.1:${PORT}/${pageName}`, { waitUntil: "load", timeout: 60000 });
try {
  await page.waitForFunction("window.__ready === true || window.__ready === 'error'", null, { timeout: 60000 });
} catch {
  errors.push("TIMEOUT waiting for window.__ready");
}
const ready = await page.evaluate(() => window.__ready);
const renderInfo = await page.evaluate(() => {
  if (window.__renderer && window.__renderer.info) {
    return { calls: window.__renderer.info.render.calls, triangles: window.__renderer.info.render.triangles };
  }
  return null;
});
if (ready === true) {
  const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  fs.writeFileSync(path.join(OUT_DIR, outName + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
  // FIX-4 -- the durable half of "a screenshot paired with the console
  // line": every captured console line, written next to the PNG it
  // belongs to, so a claim like "the readout shows 2.32 here" is
  // something a later reader can open and check, not something they have
  // to trust a commit message transcribed correctly.
  fs.writeFileSync(path.join(OUT_DIR, outName + ".console.txt"), consoleLines.join("\n") + "\n");
  console.log(`wrote ${outName}.png in ${((Date.now() - t0) / 1000).toFixed(1)}s` + (renderInfo ? ` [calls: ${renderInfo.calls}, tris: ${renderInfo.triangles}]` : ""));
} else {
  console.log(`NOT WRITTEN -- window.__ready was "${ready}"`);
}

await page.close().catch(() => {});
await browser.close();
server.close();
if (errors.length) { console.log("\nERRORS:"); for (const e of [...new Set(errors)]) console.log("  " + e); process.exitCode = 1; }
