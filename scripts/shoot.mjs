// =============================================================================
// SHOOT — render the world headlessly and write PNGs.
//
// This exists because for a long stretch of this build the only way to judge a
// change was to ask someone to deploy it and look. That is a terrible loop: slow,
// and it spends someone else's attention on things that a screenshot settles in
// ten seconds. Chromium with SwiftShader renders the same WebGL 2 scene the
// browser does, so the world can be inspected here, before it ships.
//
//   node scripts/shoot.mjs                       # the standard contact sheet
//   node scripts/shoot.mjs "Downtown skyline"    # one view
// =============================================================================
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = process.env.SHOOT_OUT || path.join(ROOT, ".shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  // Stand in for the worker's /world-source route so the live-quarter code
  // takes its REAL path here, not its fallback. Testing only the fallback would
  // leave the path that actually runs in production unrendered.
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

const VIEWS = process.argv.length > 2 ? process.argv.slice(2) : [
  "The whole world", "Coast from the sea", "City + mountains",
  "Downtown skyline", "Downtown close", "Street level", "The promenade", "Waterfront",
  "Heritage quarter", "The harbour", "The marina", "The Venetian chain",
  "Harbour City", "Container port", "Airport",
  "Hillside", "The range", "Farm belt",
  "Ocean City", "Barrier crescent", "West tip + link", "East tip + link",
  "North Key", "West Key",
  "Westhead", "Eastpoint", "The embayment",
];

const W = +(process.env.SHOOT_W || 1500), H = +(process.env.SHOOT_H || 860);
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
         "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const errors = [];

// SwiftShader is a software rasteriser: a 4096 shadow map is 16 M texels per
// frame and takes minutes. Quality knobs are opt-in for a final beauty pass.
const QUALITY = process.env.SHOOT_QUALITY === "1";
const knobs = process.env.SHOOT_KNOBS
  ? process.env.SHOOT_KNOBS
  : QUALITY ? "&shadowmap=1024&post=1" : "&shadows=0&post=0";
const STILL = "&still=2&pdb=1" + (process.env.SHOOT_MARKERS === "1" ? "&markers=1" : "");

let statsPrinted = false;
for (const v of VIEWS) {
  // A FRESH PAGE per view. Reusing one page meant every navigation after the
  // first had to tear down a WebGL context holding 114,000 instances and 22
  // textures, and under a software rasteriser that never came back -- the sheet
  // reliably produced exactly one image and then hung.
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE " + m.text());
    else if (!statsPrinted && m.text().startsWith("WORLD ")) console.log("  " + m.text().slice(0, 600));
  });
  const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1${knobs}${STILL}&view=${encodeURIComponent(v)}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  try {
    await page.waitForFunction("window.__ready === true", null, { timeout: 240000 });
  } catch {
    errors.push(`TIMEOUT waiting for first frame on "${v}"`);
    await page.close().catch(() => {});
    continue;
  }
  if (!statsPrinted) {
    const s = await page.evaluate(() => window.__world.stats);
    console.log("stats", JSON.stringify(s, null, 1).replace(/\n\s*/g, " "));
    statsPrinted = true;
  }
  await page.waitForTimeout(150);
  const name = v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Read the WebGL canvas directly. page.screenshot() goes through the browser
  // compositor, which under SwiftShader never returns for a scene this size.
  const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`  ${name}.png   ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.close().catch(() => {});
}

await browser.close();
server.close();
if (errors.length) { console.log("\nERRORS:"); for (const e of [...new Set(errors)]) console.log("  " + e); }
console.log("\nwrote to", OUT);
