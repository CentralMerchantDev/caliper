// MEASURE-IMPOSTOR-TRIANGLES — RC3's own gate, as a single script rather
// than two manual shoot-look-proof.mjs runs eyeballed against each other.
//
// Renders public/impostor-overview-scene.html twice (impostors off, then
// on), reads back the REAL window.__impostorRenderStats each time, and
// asserts the triangle count is measurably lower with them on. RED is
// "no measurable difference" per the checklist's own wording -- this
// script fails loudly if that ever becomes true, rather than a human
// comparing two numbers in two separate console logs and trusting memory.
//
//   node scripts/measure-impostor-triangles.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

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

async function renderOnce(query) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE " + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/impostor-overview-scene.html${query}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction("window.__ready === true || window.__ready === 'error'", null, { timeout: 60000 });
  const ready = await page.evaluate(() => window.__ready);
  const stats = ready === true ? await page.evaluate(() => window.__impostorRenderStats) : null;
  await page.close().catch(() => {});
  return { ready, stats, errors };
}

const off = await renderOnce("");
const on = await renderOnce("?impostors=1");
await browser.close();
server.close();

console.log("impostors off:", JSON.stringify(off.stats));
console.log("impostors on: ", JSON.stringify(on.stats));

let fail = null;
if (off.ready !== true) fail = `impostors-off render did not become ready (was "${off.ready}")`;
else if (on.ready !== true) fail = `impostors-on render did not become ready (was "${on.ready}")`;
else if (off.errors.length || on.errors.length) fail = `console/page errors: ${[...off.errors, ...on.errors].join("; ")}`;
else if (!(off.stats.triangles > on.stats.triangles)) fail = `RED: no measurable triangle reduction -- off=${off.stats.triangles}, on=${on.stats.triangles}`;
else if (off.stats.instanceCount !== on.stats.instanceCount) fail = `instance counts differ between runs (${off.stats.instanceCount} vs ${on.stats.instanceCount}) -- this would not be the same view with impostors merely toggled`;

if (fail) {
  console.log("\nFAIL: " + fail);
  process.exitCode = 1;
} else {
  const reduction = 1 - on.stats.triangles / off.stats.triangles;
  console.log(`\nRC3 GATE: pass -- ${off.stats.triangles} triangles off, ${on.stats.triangles} on, a ${(reduction * 100).toFixed(1)}% reduction across ${off.stats.instanceCount} distant instances`);
}
