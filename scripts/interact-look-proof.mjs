// INTERACT-LOOK-PROOF — RC1's own gate, driven for real.
//
// scripts/shoot-look-proof.mjs proves a SINGLE render. This drives a REAL
// pointer sequence (page.mouse.move / page.mouse.click, actual DOM events,
// not a call into look-proof-scene.html's own JS functions) against
// public/look-proof-scene.html?board=1&interactive=1, then reads back the
// REAL board's own board.pieces().length via page.evaluate(() =>
// window.__board.pieces().length) -- never the renderer's own claim, per
// this run's own brief §3: "assert against the real thing."
//
//   node scripts/interact-look-proof.mjs
//
// Exits non-zero and prints which assertion failed if the sequence does
// not match RC1's own gate text: "hover an invalid cell, click, and the
// board is unchanged; hover a valid one, click, and exactly one piece
// exists."
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
await page.goto(`http://127.0.0.1:${PORT}/look-proof-scene.html?board=1&interactive=1`, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction("window.__ready === true || window.__ready === 'error'", null, { timeout: 60000 });
const ready = await page.evaluate(() => window.__ready);
if (ready !== true) {
  console.log(`NOT READY -- window.__ready was "${ready}"`);
  await browser.close(); server.close();
  process.exit(1);
}

const piecesBefore = await page.evaluate(() => window.__board.pieces().length);
assertEqual(piecesBefore, 4, "pieces on load (BOARD_DEMO_PLACEMENTS)");

// GATE, part 1 -- "hover an invalid cell, click, and the board is
// unchanged." (23,15) is genuinely out-of-bounds for house-a's 2x3
// footprint against this file's own BOARD_WIDTH_CELLS=24/HEIGHT_CELLS=16
// (xMax=25>24), and unoccupied by any BOARD_DEMO_PLACEMENTS piece -- a
// real "out-of-bounds" refusal, not staged.
const invalidScreen = await page.evaluate(() => window.__cellCenterToScreen(23, 15));
await page.mouse.move(invalidScreen.x, invalidScreen.y);
const invalidGhost = await page.evaluate(() => window.__ghostResolved);
assertEqual(invalidGhost && invalidGhost.valid, false, "ghost reads invalid at (23,15)");
await page.mouse.click(invalidScreen.x, invalidScreen.y);
const piecesAfterInvalidClick = await page.evaluate(() => window.__board.pieces().length);
assertEqual(piecesAfterInvalidClick, 4, "board unchanged after clicking the invalid cell");

// GATE, part 2 -- "hover a valid one, click, and exactly one piece
// exists." (2,6) is empty (the same cell RB2's own GHOST_DEMO.valid
// already established as safe) -- committing here is the FIFTH piece on
// the demo board, so "exactly one piece exists" is read as "exactly one
// MORE piece exists" -- the gate's own wording assumes an otherwise-empty
// board; this scene's board mode always starts from BOARD_DEMO_PLACEMENTS,
// so the real assertion is piecesBefore -> piecesBefore+1.
const validScreen = await page.evaluate(() => window.__cellCenterToScreen(2, 6));
await page.mouse.move(validScreen.x, validScreen.y);
const validGhost = await page.evaluate(() => window.__ghostResolved);
assertEqual(validGhost && validGhost.valid, true, "ghost reads valid at (2,6)");
await page.mouse.click(validScreen.x, validScreen.y);
const piecesAfterValidClick = await page.evaluate(() => window.__board.pieces().length);
assertEqual(piecesAfterValidClick, 5, "exactly one new piece exists after committing the valid cell");
const placedTypeId = await page.evaluate(() => window.__board.pieceAt(2, 6)?.typeId);
assertEqual(placedTypeId, "house-a", "the committed piece is the real board's own house-a, at the real cell");

// A click on THAT SAME now-placed piece removes it.
await page.mouse.move(validScreen.x, validScreen.y); // re-hover so the ghost state is current
await page.mouse.click(validScreen.x, validScreen.y);
const piecesAfterRemove = await page.evaluate(() => window.__board.pieces().length);
assertEqual(piecesAfterRemove, 4, "clicking the placed piece removes it, back to the original 4");

// Escape drops the ghost without touching the board.
await page.mouse.move(validScreen.x, validScreen.y);
const ghostBeforeEscape = await page.evaluate(() => window.__ghostResolved);
assertEqual(ghostBeforeEscape !== null, true, "a ghost is showing before Escape");
await page.keyboard.press("Escape");
const ghostAfterEscape = await page.evaluate(() => window.__ghostResolved);
assertEqual(ghostAfterEscape, null, "Escape drops the ghost");
const piecesAfterEscape = await page.evaluate(() => window.__board.pieces().length);
assertEqual(piecesAfterEscape, 4, "Escape never touches the board");

const renderInfo = await page.evaluate(() => ({ calls: window.__renderer.info.render.calls, triangles: window.__renderer.info.render.triangles }));
console.log(`  draw calls: ${renderInfo.calls}, triangles: ${renderInfo.triangles}`);

const dataUrl = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
fs.writeFileSync(path.join(OUT_DIR, "22-interactive.png"), Buffer.from(dataUrl.split(",")[1], "base64"));
console.log(`wrote 22-interactive.png in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

await page.close().catch(() => {});
await browser.close();
server.close();

if (errors.length) { console.log("\nCONSOLE/PAGE ERRORS:"); for (const e of [...new Set(errors)]) console.log("  " + e); process.exitCode = 1; }
if (fail) { console.log("\n" + fail); process.exitCode = 1; }
if (!fail && errors.length === 0) console.log("\nRC1 GATE: pass");
