import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const SHOTS = path.join(ROOT, ".shots");
const partsArgument = process.argv.find((argument) => argument.startsWith("--parts="));
const alternateParts = partsArgument ? path.resolve(ROOT, partsArgument.slice("--parts=".length)) : null;

if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = alternateParts && url === "/kitbash-parts.js"
    ? alternateParts
    : path.join(PUBLIC, url === "/" ? "/kitbash-contact-sheet.html" : url);
  const permitted = file.startsWith(PUBLIC) || (alternateParts && file === alternateParts);
  if (!permitted || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("not found");
  }
  if (file.endsWith("kitbash-contact-sheet.html")) {
    const html = fs.readFileSync(file, "utf8").replace(
      "const mat = mats[sp.tag] || mats.wall;",
      "const mat = sp.material || mats[sp.tag] || mats.wall;",
    );
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(html);
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`http://127.0.0.1:${PORT}/kitbash-contact-sheet.html`, { timeout: 120000 });
await page.waitForFunction("window.__ready === true", null, { timeout: 60000 });

const shadowMeasurements = await page.evaluate(async () => {
  const THREE = await import("./vendor/three/three.module.min.js");
  const { KITBASH_PARTS } = await import("./kitbash-parts.js");
  const ids = Object.keys(KITBASH_PARTS).filter((id) => KITBASH_PARTS[id].category === "fabric");
  const azimuths = [45, 135, 225, 315];
  const measurements = [];
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(320, 320, false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  for (const id of ids) for (const azimuth of azimuths) {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    for (const item of KITBASH_PARTS[id].buildGeometry(THREE, {}, 0)) {
      const material = item.material || new THREE.MeshStandardMaterial({ color: item.color || 0xd8d0c2, roughness: 0.7 });
      const mesh = new THREE.Mesh(item.geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    scene.add(group);
    scene.add(new THREE.HemisphereLight(0xb9cee2, 0x20252d, 0.75));
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radians = THREE.MathUtils.degToRad(azimuth);
    const sun = new THREE.DirectionalLight(0xffefd0, 3.4);
    sun.position.set(Math.cos(radians) * 32, 38, Math.sin(radians) * 32);
    sun.target.position.copy(center);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const span = Math.max(size.x, size.z) * 1.5;
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: size.y * 1.4, bottom: -size.y * 0.4, near: 1, far: 120 });
    sun.shadow.bias = -0.0002;
    scene.add(sun, sun.target);

    const camera = new THREE.OrthographicCamera(-span, span, size.y * 0.75, -size.y * 0.75, 0.1, 200);
    const cameraAngle = radians + THREE.MathUtils.degToRad(55);
    camera.position.set(Math.cos(cameraAngle) * span * 2.4, center.y + size.y * 0.25, Math.sin(cameraAngle) * span * 2.4);
    camera.lookAt(center);
    const context = renderer.getContext();

    renderer.shadowMap.enabled = false;
    renderer.render(scene, camera);
    const unshadowed = new Uint8Array(320 * 320 * 4);
    context.readPixels(0, 0, 320, 320, context.RGBA, context.UNSIGNED_BYTE, unshadowed);
    renderer.shadowMap.enabled = true;
    scene.traverse((object) => { if (object.material) object.material.needsUpdate = true; });
    renderer.render(scene, camera);
    const shadowed = new Uint8Array(320 * 320 * 4);
    context.readPixels(0, 0, 320, 320, context.RGBA, context.UNSIGNED_BYTE, shadowed);

    const mask = new Uint8Array(320 * 320);
    let objectPixels = 0, selfShadowPixels = 0, selfShadowQuads = 0;
    for (let offset = 0; offset < shadowed.length; offset += 4) {
      if (shadowed[offset + 3] === 0 || unshadowed[offset + 3] === 0) continue;
      objectPixels++;
      const before = unshadowed[offset] + unshadowed[offset + 1] + unshadowed[offset + 2];
      const after = shadowed[offset] + shadowed[offset + 1] + shadowed[offset + 2];
      if (before - after >= 24) { selfShadowPixels++; mask[offset / 4] = 1; }
    }
    for (let y = 0; y < 319; y++) for (let x = 0; x < 319; x++) {
      const index = y * 320 + x;
      if (mask[index] && mask[index + 1] && mask[index + 320] && mask[index + 321]) selfShadowQuads++;
    }
    measurements.push({ id, azimuth, objectPixels, selfShadowPixels, selfShadowQuads });
  }
  renderer.dispose();
  return measurements;
});

for (const result of shadowMeasurements) {
  console.log(`${result.id} @ ${result.azimuth} degrees: ${result.selfShadowPixels}/${result.objectPixels} self-shadow pixels; ${result.selfShadowQuads} contiguous quads`);
}
const shadowFailures = shadowMeasurements.filter((result) => result.selfShadowPixels === 0);
if (shadowFailures.length) throw new Error(`FOUR-AZIMUTH SELF-SHADOW GATE FAILED: ${shadowFailures.map((result) => `${result.id}@${result.azimuth}`).join(", ")}`);

const shotPath = path.join(SHOTS, "kitbash-contact-sheet.png");
await page.screenshot({ path: shotPath, fullPage: false });
console.log(`Saved contact sheet screenshot to ${shotPath}`);

await page.close();
await browser.close();
server.close();
