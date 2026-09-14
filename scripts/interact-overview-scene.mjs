// INTERACT-OVERVIEW-SCENE — RC2's own gate, driven for real.
//
// Real page.mouse.click DOM events against public/overview-scene.html,
// read back through window.__worldLayer -- the real createWorldLayer()
// (public/world-layer.js), never the renderer's own claims about it, per
// this run's own brief §3: "assert against the real thing."
//
//   node scripts/interact-overview-scene.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const OUT_DIR = process.env.SHOOT_OUT || path.join(ROOT, "docs/look-proof-shots");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".glb": "model/gltf-binary", ".hdr": "application/octet-stream",
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

const W = +(process.env.SHOOT_W || 1200), H = +(process.env.SHOOT_H || 700);
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

let fail = null;
function assertEqual(actual, expected, label) {
  if (actual !== expected) fail = fail || `FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  console.log(`  ${actual === expected ? "ok" : "FAIL"} ${label}: ${JSON.stringify(actual)}`);
}

const t0 = Date.now();
await page.goto(`http://127.0.0.1:${PORT}/overview-scene.html`, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction("window.__ready === true || window.__ready === 'error'", null, { timeout: 60000 });
const ready = await page.evaluate(() => window.__ready);
if (ready !== true) {
  console.log(`NOT READY -- window.__ready was "${ready}"`);
  await browser.close(); server.close();
  process.exit(1);
}

assertEqual(await page.evaluate(() => window.__mode()), "overview", "starts in overview mode");
assertEqual(await page.evaluate(() => window.__worldLayer.active()), null, "no area is active on load");

// GATE, part 1 -- "click a LOCKED one and it refuses visibly."
const harborScreen = await page.evaluate(() => window.__padCenterToScreen("harbor"));
await page.mouse.click(harborScreen.x, harborScreen.y);
const harborResult = await page.evaluate(() => window.__lastEnterResult);
assertEqual(harborResult && harborResult.ok, false, "entering harbor (LOCKED) is refused");
assertEqual(harborResult && harborResult.reason, "locked", "the real refusal reason is 'locked', from area.js itself");
assertEqual(await page.evaluate(() => window.__mode()), "overview", "still in overview mode after a refused entry");
const refusalVisible = await page.evaluate(() => document.getElementById("refusal").style.display === "block" && document.getElementById("refusal").textContent.length > 0);
assertEqual(refusalVisible, true, "the refusal is shown on screen, not just logged");

const refusalDataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
fs.writeFileSync(path.join(OUT_DIR, "23-overview-refused.png"), Buffer.from(refusalDataUrl.split(",")[1], "base64"));

// GATE, part 2 -- "click an OPEN area and the board for THAT area loads."
// enterBoardView is async (a real glb fetch); page.mouse.click() only
// waits for the DOM event dispatch, not for that page-side promise to
// resolve -- waitForFunction is what actually waits for the transition.
const downtownScreen = await page.evaluate(() => window.__padCenterToScreen("downtown"));
await page.mouse.click(downtownScreen.x, downtownScreen.y);
await page.waitForFunction("window.__mode() === 'board'", null, { timeout: 10000 });
assertEqual(await page.evaluate(() => window.__mode()), "board", "clicking downtown (OPEN) enters board mode");
assertEqual(await page.evaluate(() => window.__worldLayer.active()?.id), "downtown", "the real world layer's own active area is downtown");
const downtownPieces = await page.evaluate(() => window.__worldLayer.boardFor("downtown").pieces().length);
assertEqual(downtownPieces, 1, "downtown's own real board has its own real demo piece (mega-tower-a)");
assertEqual(await page.evaluate(() => window.__loadCounts.downtown), 1, "downtown's board was loaded exactly once so far");

const afterEnterDataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
fs.writeFileSync(path.join(OUT_DIR, "23-area-entered.png"), Buffer.from(afterEnterDataUrl.split(",")[1], "base64"));

// W5 -- "re-entering after leaving RELOADS. Do not assume residency."
await page.keyboard.press("Escape");
assertEqual(await page.evaluate(() => window.__mode()), "overview", "Escape leaves the board and returns to overview");
assertEqual(await page.evaluate(() => window.__worldLayer.active()), null, "no area is active after leaving");
await page.mouse.click(downtownScreen.x, downtownScreen.y);
await page.waitForFunction("window.__mode() === 'board'", null, { timeout: 10000 });
assertEqual(await page.evaluate(() => window.__mode()), "board", "re-entering downtown works");
assertEqual(await page.evaluate(() => window.__loadCounts.downtown), 2, "re-entering after leaving called loadBoard again -- NOT still 1, which would mean residency was silently assumed");

// "At most one ACTIVE... must be structurally impossible for two" -- proven
// directly against the real world layer object, bypassing this page's own
// UI guard (which hides the overview pads in board mode) so the invariant
// itself is what is being checked, not just this file's own click-blocking.
await page.evaluate(() => window.__worldLayer.enter("hills", { loadBoard: () => ({ pieces: () => [] }) }));
const activeAfterSecondEnter = await page.evaluate(() => window.__worldLayer.active()?.id);
assertEqual(activeAfterSecondEnter, "hills", "entering a second area while the first is still active reassigns the SAME single active slot");
const downtownStillActive = await page.evaluate(() => window.__worldLayer.get("downtown"));
console.log(`  (downtown itself, post-reassignment: ${JSON.stringify(downtownStillActive)})`);

const renderInfo = await page.evaluate(() => ({ calls: window.__renderer.info.render.calls, triangles: window.__renderer.info.render.triangles }));
console.log(`  draw calls: ${renderInfo.calls}, triangles: ${renderInfo.triangles}`);

await page.close().catch(() => {});
await browser.close();
server.close();

if (errors.length) { console.log("\nCONSOLE/PAGE ERRORS:"); for (const e of [...new Set(errors)]) console.log("  " + e); process.exitCode = 1; }
if (fail) { console.log("\n" + fail); process.exitCode = 1; }
if (!fail && errors.length === 0) console.log("\nRC2 GATE: pass");
console.log(`\ntotal time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
