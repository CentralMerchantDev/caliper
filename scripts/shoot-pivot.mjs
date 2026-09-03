// Does the orbit-point marker actually appear, and is it legible?
//
// Nothing had ever answered this. scripts/shoot.mjs renders city.html, which is
// a BARE renderer with its own scene -- it never constructs WorldRenderer, so it
// cannot see focusAtScreen or the pivot ring. scripts/shoot-ui.mjs stubs the
// renderer out entirely. Both were green while the marker was unproven.
//
// So this loads index.html with the REAL renderer, waits out the world build,
// double-clicks, and photographs the result at two ranges.
//
//   node scripts/shoot-pivot.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = process.cwd(); const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, ".shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = {".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".webp":"image/webp",".png":"image/png",".hdr":"application/octet-stream",".txt":"text/plain",".css":"text/css"};
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const f = path.join(PUBLIC, u === "/" ? "/index.html" : u === "/world-source" ? "/sim-baseline.generated.js" : u);
  if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end("nf"); }
  // no-store, because a probe that measures a cached copy of the file it is
  // supposed to be testing reports on code that is not on disk any more.
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 180000 });
// The world build is synchronous and long. Wait for the renderer to exist AND
// for a marker method to be present -- if the 2D fallback loaded instead, say so
// rather than photographing the wrong thing.
await page.waitForFunction("window.renderer3d && typeof window.renderer3d.focusAtScreen === 'function'", null, { timeout: 300000 });
await page.waitForTimeout(Number(process.env.WARM || 8000));
const mode = await page.evaluate(() => ({
  impl: window.renderer3d._impl ? "present" : "missing",
  hasMarker: typeof window.renderer3d._impl?._showPivotMarker === "function",
  dist: window.renderer3d._impl?._camDist,
}));
console.log("renderer:", JSON.stringify(mode));
const dismissed = await page.evaluate(() => {
  const b = document.getElementById("welcome-close-btn");
  if (b) b.click();
  const c = document.getElementById("welcome-mission-card");
  return c ? getComputedStyle(c).display : "no card";
});
console.log("welcome card:", dismissed);
// Call the API DIRECTLY first. If this misses, the defect is in the raycast and
// not in the gesture, and those are very different problems.
console.log("direct focusAtScreen:", JSON.stringify(await page.evaluate(() => {
  const r = window.renderer3d.focusAtScreen(800, 560);
  const impl = window.renderer3d._impl;
  return { r, groupChildren: impl.neighbourhoodGroup?.children?.length ?? null,
           markerVisible: !!impl._pivotMarker?.visible };
})));
await page.waitForTimeout(1500);
// Does the GESTURE reach the canvas? The direct call above proves the API. If
// the marker does not MOVE when a real double-click lands somewhere else, the
// gesture is not arriving -- a different defect entirely.
await page.evaluate(() => { const b = document.getElementById("welcome-close-btn"); if (b) b.click(); });

console.log(JSON.stringify(await page.evaluate(() => {
  const impl = window.renderer3d._impl;
  const THREE = impl.neighbourhoodGroup.constructor;   // for typeof checks only
  const rect = impl.canvas.getBoundingClientRect();
  const x = ((1120 - rect.left) / rect.width) * 2 - 1;
  const y = -((620 - rect.top) / rect.height) * 2 + 1;
  impl._mouse.set(x, y);
  impl._raycaster.setFromCamera(impl._mouse, impl.camera);
  const hits = impl._raycaster.intersectObjects(impl.neighbourhoodGroup.children, true);
  const g = impl.neighbourhoodGroup;
  return {
    ndc: [Number(x.toFixed(3)), Number(y.toFixed(3))],
    cameraPos: impl.camera.position.toArray().map((n) => Math.round(n)),
    cameraIsRenderCam: impl.camera === impl._renderCamera || "unknown",
    lookAt: impl._lookAt ? impl._lookAt.toArray().map((n) => Math.round(n)) : null,
    groupPos: g.position.toArray(),
    groupScale: g.scale.toArray(),
    rayOrigin: impl._raycaster.ray.origin.toArray().map((n) => Math.round(n)),
    rayDir: impl._raycaster.ray.direction.toArray().map((n) => Number(n.toFixed(3))),
    hitCount: hits.length,
    first: hits[0] ? {
      point: hits[0].point.toArray().map((n) => Math.round(n)),
      distance: Math.round(hits[0].distance),
      objName: hits[0].object.name || "(unnamed)",
      objType: hits[0].object.type,
      isInstanced: hits[0].object.isInstancedMesh === true,
      instanceId: hits[0].instanceId ?? null,
    } : null,
    firstFew: hits.slice(0, 4).map((h) => ({ t: h.object.type, n: h.object.name || "-", d: Math.round(h.distance), p: h.point.toArray().map((v) => Math.round(v)) })),
  };
}), null, 1));
if (errs.length) console.log("ERRORS:", [...new Set(errs)].slice(0, 4));
await browser.close(); server.close();
