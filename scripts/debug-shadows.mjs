import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PUBLIC = "c:/Code/sandbox-spike/public";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".hdr": "application/octet-stream" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const rel = url.replace(/^\/+/, "");
  const file = path.join(PUBLIC, rel === "" ? "city.html" : rel === "world-source" ? "sim-baseline.generated.js" : rel);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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


for (const shadows of [0, 1]) {
  for (const post of [0, 1]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=${shadows}&post=${post}&ao=0&still=6&pdb=1&chunkSize=2000&view=Downtown%20skyline`;
    await page.goto(url, { timeout: 120000 });
    await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
    const info = await page.evaluate(() => window.__getRenderStats());
    console.log(`shadows=${shadows}, post=${post} -> calls=${info.calls}, tris=${info.triangles.toLocaleString()}`);
    await page.close();
  }
}
	await browser.close();
server.close();
