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
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(
    PUBLIC,
    url === "/" ? "/city.html" : url === "/world-source" ? "/sim-baseline.generated.js" : url,
  );
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    console.log(`404 for ${url} -> ${file}`);
    res.writeHead(404); return res.end("not found");
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});

fs.mkdirSync(path.join(".shots", "gtao-comparison"), { recursive: true });

const shots = [
  { name: "skyline-no-ao.png", view: "Downtown skyline", ao: 0 },
  { name: "skyline-gtao.png", view: "Downtown skyline", ao: 1 },
  { name: "street-no-ao.png", view: "Street level", ao: 0 },
  { name: "street-gtao.png", view: "Street level", ao: 1 },
];

for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  page.on("pageerror", (err) => console.error("Page error:", err));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("Page console error:", msg.text());
  });
  const url = `http://127.0.0.1:${PORT}/city.html?post=1&ao=${s.ao}&chunkSize=2000&still=6&view=${encodeURIComponent(s.view)}`;
  console.log(`Navigating to ${s.name} (${s.view}, ao=${s.ao})...`);
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
  const shotPath = path.join(".shots", "gtao-comparison", s.name);
  const buf = await page.screenshot({ type: "png" });
  fs.writeFileSync(shotPath, buf);
  const frameStats = await page.evaluate(() => window.__getFrameStats ? window.__getFrameStats() : null);
  const rs = await page.evaluate(() => window.__getRenderStats ? window.__getRenderStats() : { calls: 0, triangles: 0 });
  console.log(`Saved ${s.name} - calls=${rs.calls}, tris=${rs.triangles}, ft=${frameStats ? frameStats.min : '?'}/${frameStats ? frameStats.median : '?'}/${frameStats ? frameStats.max : '?'}ms`);
  await page.close();
}

await browser.close();
server.close();
console.log("GTAO comparison renders complete.");
