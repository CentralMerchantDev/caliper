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

async function evaluateView(viewName) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 860 } });
  await page.goto(`http://127.0.0.1:${PORT}/city.html?bare=1&dpr=1&shadows=0&post=0&still=2&pdb=1&view=${encodeURIComponent(viewName)}`, { timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });

  const breakdown = await page.evaluate(() => {
    const THREE = window.__world.THREE;
    const camera = window.__camera;
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const isEffectivelyVisible = (obj) => {
      for (let cur = obj; cur; cur = cur.parent) {
        if (cur.visible === false) return false;
      }
      return true;
    };

    const drawn = [];
    window.__scene.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh) {
        if (!isEffectivelyVisible(obj)) return;
        const geo = obj.geometry;
        if (!geo) return;
        const tris = geo.index ? geo.index.count / 3 : (geo.attributes?.position?.count / 3 || 0);
        const count = obj.isInstancedMesh ? obj.count : 1;
        const totalTris = tris * count;

        let bs = obj.boundingSphere || geo.boundingSphere;
        let inFrustum = true;
        let worldSphere = null;
        if (obj.frustumCulled && bs) {
          worldSphere = bs.clone().applyMatrix4(obj.matrixWorld);
          inFrustum = frustum.intersectsSphere(worldSphere);
        }

        const ancestors = [];
        let p = obj.parent;
        while (p && p !== window.__scene) {
          ancestors.push(`${p.constructor.name}(${p.name || ''}, pos=[${Math.round(p.position.x)},${Math.round(p.position.y)},${Math.round(p.position.z)}])`);
          p = p.parent;
        }

        if (inFrustum) {
          const mat = obj.material;
          const matColor = Array.isArray(mat) ? mat.map(m => m?.color?.getHexString()) : mat?.color?.getHexString();
          drawn.push({
            name: obj.name || obj.parent?.name || "unnamed",
            parentName: obj.parent?.constructor?.name,
            ancestors: ancestors.join(" -> "),
            isLODChild: !!obj.parent?.isLOD,
            type: obj.isInstancedMesh ? "InstancedMesh" : "Mesh",
            geoType: geo.type,
            count,
            geoTris: tris,
            totalTris,
            matColor,
            matType: Array.isArray(mat) ? mat.map(m => m?.type).join(",") : mat?.type,
            distToCam: worldSphere ? Math.round(camera.position.distanceTo(worldSphere.center)) : null,
            pos: [Math.round(obj.position.x), Math.round(obj.position.y), Math.round(obj.position.z)],
          });
        }
      }
    });
    drawn.sort((a, b) => b.totalTris - a.totalTris);

    const categories = {};
    for (const d of drawn) {
      let cat = "other";
      if (d.name?.includes("building") || d.parentName === "LOD" || d.geoType === "BoxGeometry" && d.count > 100) cat = "buildings";
      else if (d.matColor === "4b5058" || d.matColor === "bdb5a6" || d.matColor === "f0e4b0" || d.matColor === "7d7360") cat = "roads/earth";
      else if (d.geoTris === 30258 || d.geoTris === 64640 || d.geoTris === 59640 || d.geoTris === 4910 || d.geoTris === 7190 || d.geoTris === 8230 || d.geoTris === 8364 || d.geoTris === 3130) cat = "terrain";
      else if (d.matColor === "5f452d" || d.matColor === "ffffff" && (d.geoType === "SphereGeometry" || d.geoType === "ConeGeometry")) cat = "trees";
      else if (d.geoTris === 2) cat = "water/abyss";
      else if (d.matType === "MeshBasicMaterial" && d.geoTris === 16358) cat = "surf";

      categories[cat] = (categories[cat] || 0) + d.totalTris;
    }

    return {
      calls: window.__renderer.info.render.calls,
      triangles: window.__renderer.info.render.triangles,
      categories,
      topDrawn: drawn.slice(0, 40).map(d => ({
        name: d.name,
        parentName: d.parentName,
        ancestors: d.ancestors,
        type: d.type,
        geoType: d.geoType,
        count: d.count,
        geoTris: d.geoTris,
        totalTris: d.totalTris,
        matColor: d.matColor,
        matType: d.matType,
        distToCam: d.distToCam,
        pos: d.pos
      })),
    };
  });

  console.log(`\n=== ${viewName.toUpperCase()} ===`);
  console.log(`Calls: ${breakdown.calls}, Triangles: ${breakdown.triangles}`);
  console.log("Categories:", JSON.stringify(breakdown.categories));
  for (const m of breakdown.topDrawn.slice(0, 40)) {
    console.log(` - [${m.totalTris}t] ${m.type} ${m.geoType} count=${m.count} geoTris=${m.geoTris} mat=${m.matColor}/${m.matType} camDist=${m.distToCam}m anc=${m.ancestors}`);
  }
}

const street = await evaluateView("Street level");
const skyline = await evaluateView("Downtown skyline");

await browser.close();
server.close();
