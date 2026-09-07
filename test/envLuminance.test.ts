import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function repoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      fs.readFileSync(path.join(dir, "package.json"), "utf8");
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error("could not find the repository root");
}

const ROOT = repoRoot();
const PUBLIC = path.join(ROOT, "public");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

test("HDRI is live at runtime and environment reflection is active", async () => {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
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
  const port = server.address().port;

  const browser = await chromium.launch({
    args: [
      "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const url = `http://127.0.0.1:${port}/city.html?post=0&pdb=1&chunkSize=2000&view=Downtown%20skyline&still=10`;
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 240000 });

  const envData = await page.evaluate(() => {
    const scene = window.__scene;
    const renderer = window.__renderer;
    const stats = window.__world?.stats || {};
    const hasEnv = Boolean(scene && scene.environment);
    const intensity = scene ? scene.environmentIntensity : 0;
    
    // 1. Read pixel with HDRI environment
    window.__renderOnce();
    const canvas = document.querySelector("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const p1 = new Uint8Array(4);
    gl.readPixels(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p1);

    // 2. Clear scene.environment and re-render to verify reflection change
    const savedEnv = scene.environment;
    scene.environment = null;
    window.__renderOnce();
    const p2 = new Uint8Array(4);
    gl.readPixels(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p2);

    // Restore environment
    scene.environment = savedEnv;

    return {
      hasEnv,
      intensity,
      envLuminance: stats.envLuminance,
      envSource: stats.envSource,
      withHdri: Array.from(p1),
      withoutHdri: Array.from(p2),
    };
  });

  console.log("HDRI verification result:", JSON.stringify(envData));

  assert.equal(envData.hasEnv, true, "scene.environment must be defined");
  assert.ok(envData.intensity > 0, "environmentIntensity must be positive");
  assert.ok(
    envData.withHdri[0] !== envData.withoutHdri[0] ||
    envData.withHdri[1] !== envData.withoutHdri[1] ||
    envData.withHdri[2] !== envData.withoutHdri[2],
    "Rendered reflection color must change when environment is removed/swapped"
  );

  await page.close();
  await browser.close();
  server.close();
});
