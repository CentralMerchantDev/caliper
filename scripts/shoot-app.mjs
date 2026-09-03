// Photograph THE APPLICATION — index.html, the page a visitor actually opens.
//
// This did not exist, and its absence was expensive. scripts/shoot.mjs renders
// city.html, a bare renderer that never constructs WorldRenderer; scripts/
// shoot-ui.mjs stubs the renderer out entirely. So between them, nothing could
// photograph the real page — and three separate defects were diagnosed from
// images of something else:
//
//   * the colour grade the application never ran, invisible because every shot
//     came through city.html, which does run it
//   * the pivot marker, which could not appear in either harness
//   * a raycast "returning the origin", which was a camera that had never been
//     positioned because index.html's animation loop does not advance headlessly
//
// The fix is the hooks, not the harness: index.html now publishes __ready,
// __renderOnce, __tick, __scene and __camera, and accepts ?pdb=1 to keep the
// drawing buffer. This drives those.
//
//   node scripts/shoot-app.mjs                       -> .shots/app.png
//   NAME=night TOD=night node scripts/shoot-app.mjs
//   TICKS=60 node scripts/shoot-app.mjs              -> advance 60 frames first
//   REPORT=1 node scripts/shoot-app.mjs              -> print world state, no image
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.ROOT || process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OUT = process.env.OUT || path.join(ROOT, ".shots");
const NAME = process.env.NAME || "app";
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".hdr": "application/octet-stream", ".txt": "text/plain", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url === "/" ? "/index.html" : url === "/world-source" ? "/sim-baseline.generated.js" : url);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  // no-store: a probe that measures a cached copy of the file it is testing
  // reports on code that is no longer on disk.
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: Number(process.env.W || 1600), height: Number(process.env.H || 900) },
});
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // The console echoes every failed request as a bare "Failed to load resource"
  // with NO url, while the response listener below records the same failure WITH
  // one. Keeping both means the url-less copy can never be matched against the
  // harness list, so it fails forever for a request that was already explained.
  // The response listener is the authoritative record; this echo adds nothing.
  if (t.startsWith("Failed to load resource")) return;
  errs.push("CONSOLE " + t.slice(0, 160));
});
page.on("requestfailed", (r) => errs.push("REQFAIL " + r.url().slice(-70)));
page.on("response", (r) => { if (r.status() >= 400) errs.push("HTTP " + r.status() + " " + r.url().slice(-70)); });

await page.goto(`http://127.0.0.1:${port}/?pdb=1`, { waitUntil: "load", timeout: 180000 });
await page.waitForFunction("window.__ready === true", null, { timeout: 300000 });

// Advance the world deterministically rather than waiting on rAF and hoping.
// This is the whole point of __tick: the previous attempt to shoot this page
// read a camera that had never been positioned, because nothing had driven a
// frame.
// 4, not 30. Each tick draws a ~3.6M-triangle scene, and under SwiftShader
// that is seconds apiece -- thirty of them ran past a three-minute timeout and
// the browser was killed mid-capture. Four is enough to position the camera,
// which is all this needs.
const ticks = Number(process.env.TICKS || 4);
await page.evaluate((n) => { for (let i = 0; i < n; i++) window.__tick(0.016); }, ticks);
if (process.env.TOD) {
  await page.evaluate((t) => window.renderer3d?.setTimeOfDay?.(t), process.env.TOD);
  await page.evaluate(() => { for (let i = 0; i < 12; i++) window.__tick(0.25); });
}
await page.click("#welcome-close-btn").catch(() => {});

const report = await page.evaluate(() => {
  const impl = window.renderer3d?._impl;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    hasRenderer: !!impl,
    camera: window.__camera?.position.toArray().map((n) => Math.round(n)) ?? null,
    // Distinguishing "no renderer" from "a broken number" matters: Math.round of
    // undefined is NaN, JSON.stringify writes NaN as null, and the two used to
    // print identically.
    camDist: impl ? num(impl._camDist) : null,
    hour: impl ? num(impl._currentHour) : null,
    skyGroup: !!window.__scene?.getObjectByName("city-sky"),
    sceneChildren: window.__scene?.children.length ?? 0,
    unplaceable: impl?.unplaceablePlacements ?? null,
  };
});
console.log(JSON.stringify(report, null, 1));

/**
 * IT HAS TO BE ABLE TO FAIL.
 *
 * An audit measured this script exiting 0 while printing two page errors and
 * twenty refused placements, and called the `unplaceable` line "a guard that
 * prints and never fails is a log line". It was right: there was no assertion
 * and no non-zero exit anywhere in the file.
 */
const problems = [];
if (!report.hasRenderer) problems.push("no renderer on the page");
if (report.camDist === null) problems.push("camDist is not a finite number");
if (report.hour === null) problems.push("the world clock is not a finite number");
if (!report.skyGroup) problems.push("the city sky group is missing from the scene");
if (report.sceneChildren < 100) problems.push(`scene has only ${report.sceneChildren} children -- the world did not build`);
// WHAT THIS HARNESS CANNOT SERVE IS NOT A DEFECT IN THE PAGE.
//
// The first version of this assertion failed on eight "page errors" and every
// one of them was the harness: /change-history and /recent-runs are Cloudflare
// Worker routes that a static file server does not have, and the Datum iframe's
// frame-ancestors allows the deployed origin but not 127.0.0.1. Flagging those
// is measuring the instrument -- the same mistake that made three separate
// defects look real earlier in this project.
//
// The list is deliberately specific rather than a pattern. A broad allowlist
// would hide the errors this check exists to find, so each entry names one thing
// and says why it cannot be served here.
const HARNESS_ONLY = [
  "/change-history",   // Worker route; this server serves files only
  "/recent-runs",      // Worker route; this server serves files only
  "/spend",            // Worker route; this server serves files only
  "/live-status",      // Worker route; this server serves files only
  "datum.markfrasertoronto.workers.dev",  // frame-ancestors allows the deployed origin, not 127.0.0.1
  "frame-ancestors",
];
const realErrs = [...new Set(errs)].filter((e) => !HARNESS_ONLY.some((h) => e.includes(h)));
if (realErrs.length) problems.push(`${realErrs.length} page error(s): ${realErrs.slice(0, 3).join(" | ")}`);
if (errs.length !== realErrs.length) {
  console.log(`(${errs.length - realErrs.length} harness-only error(s) ignored -- Worker routes and the cross-origin frame)`);
}

// Refused placements are EXPECTED here -- the six baseline props carry village
// plot units and the land correctly refuses them -- so the assertion is on the
// COUNT not moving, rather than on there being none. A new refusal is a fact
// worth surfacing; silence about twenty of them is not.
const EXPECTED_UNPLACEABLE = Number(process.env.EXPECT_UNPLACEABLE || 20);
const got = report.unplaceable?.length ?? 0;
if (got !== EXPECTED_UNPLACEABLE) {
  problems.push(`${got} unplaceable placements, expected ${EXPECTED_UNPLACEABLE} -- set EXPECT_UNPLACEABLE if this is intended`);
}

if (!process.env.REPORT) {
  // Draw and read back in the SAME task. Without ?pdb=1 the buffer is already
  // cleared by the time a later evaluate runs, and toDataURL returns a blank.
  const dataUrl = await page.evaluate(() => {
    window.__renderOnce();
    return document.getElementById("world-canvas").toDataURL("image/png");
  });
  const out = path.join(OUT, NAME + ".png");
  fs.writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("shot ->", out);
}

if (errs.length) console.log("PAGE ERRORS:", [...new Set(errs)].slice(0, 5));
await browser.close();
server.close();

if (problems.length) {
  console.error(`FAIL (${problems.length}):`);
  for (const p of problems) console.error("  - " + p);
  process.exitCode = 1;
} else {
  console.log("app OK: world built, sky present, clock and camera finite, no page errors");
}
