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
    res.writeHead(404); return res.end("not found");
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
	await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});

try {
  console.log("Validating probe with culling & LOD disabled against check-layout-geometry.mjs baseline (5,419,468 building triangles)...");
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  
  const url = `http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=0&post=0&still=3&pdb=1&cull=0&lod=0&chunkSize=0&view=The%20whole%20world`;
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });

  const stats = await page.evaluate(() => {
    let buildingTriangles = 0;
    let otherTriangles = 0;
    let buildingMeshes = 0;

    window.__scene.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh) {
        const geo = obj.geometry;
        if (!geo) return;
        const tris = geo.index ? geo.index.count / 3 : (geo.attributes?.position?.count / 3 || 0);
        const count = obj.isInstancedMesh ? obj.count : 1;
        const total = tris * count;

        if (obj.isInstancedMesh && obj.geometry && obj.count > 0 && obj.parent === window.__scene && obj.castShadow) {
          buildingTriangles += total;
          buildingMeshes++;
        } else {
          otherTriangles += total;
        }
      }
    });

    const renderStats = window.__getRenderStats ? window.__getRenderStats() : {
      calls: window.__renderer.info.render.calls,
      triangles: window.__renderer.info.render.triangles,
    };

    return {
      rendererReportedCalls: renderStats.calls,
      rendererReportedTriangles: renderStats.triangles,
      sceneBuildingTriangles: buildingTriangles,
      sceneBuildingMeshes: buildingMeshes,
      otherTriangles,
      frameTimes: window.__getFrameStats ? window.__getFrameStats() : null,
    };
  });

  console.log("\n=== PROBE VALIDATION RESULTS ===");
  console.log(`Expected Building Triangles (check-layout-geometry): 5,419,468`);
  console.log(`Actual Building Triangles in Scene:                  ${stats.sceneBuildingTriangles.toLocaleString()} (${stats.sceneBuildingMeshes} InstancedMeshes)`);
  console.log(`Total Triangles Rendered by Three.js:               ${stats.rendererReportedTriangles.toLocaleString()} (${stats.rendererReportedCalls} draw calls)`);
  console.log(`Other Scene Triangles (terrain, roads, props):      ${stats.otherTriangles.toLocaleString()}`);
  console.log(`Frame Times (min/median/max):                      ${stats.frameTimes?.min}ms / ${stats.frameTimes?.median}ms / ${stats.frameTimes?.max}ms`);

  const diff = Math.abs(stats.sceneBuildingTriangles - 5419468);
  const pctDiff = (diff / 5419468) * 100;
  console.log(`Discrepancy: ${pctDiff.toFixed(2)}%`);

  if (pctDiff > 1.0) {
    console.error(`VALIDATION FAILED: Building triangle count differs by ${pctDiff.toFixed(2)}%Z from check-layout-geometry!`);
    process.exit(1);
  } else {
    console.log(`VALIDATION SUCCESSFUL: Probe accurately measures the full scene within ${pctDiff.toFixed(2)}% of known ground truth!`);
  }
} finally {
  await browser.close();
  server.close();
}
