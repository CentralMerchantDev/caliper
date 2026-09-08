import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const SHOTS = path.join(ROOT, ".shots");
const labelArg = process.argv.find((argument) => argument.startsWith("--label="));
const label = labelArg ? labelArg.slice("--label=".length) : "current";
const partsArg = process.argv.find((argument) => argument.startsWith("--parts="));
const alternateParts = partsArg ? path.resolve(ROOT, partsArg.slice("--parts=".length)) : null;
fs.mkdirSync(SHOTS, { recursive: true });

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]);
  if (relative === "/probe.html") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<!doctype html><title>Kitbash fabric probe</title>");
    return;
  }
  const file = alternateParts && relative === "/kitbash-parts.js" ? alternateParts : path.join(PUBLIC, relative);
  const permitted = file.startsWith(PUBLIC) || (alternateParts && file === alternateParts);
  if (!permitted || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, { "content-type": path.extname(file) === ".js" ? "text/javascript" : "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/probe.html`);
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#0b1016;color:#f0ece4;font:14px system-ui;overflow:hidden}
#title{position:fixed;left:22px;top:16px;z-index:2;padding:10px 14px;background:#101722dd;border:1px solid #ffffff22;border-radius:8px}
#labels{position:fixed;inset:0;pointer-events:none}.label{position:absolute;width:330px;text-align:center;color:#e8e2d8;text-shadow:0 2px 3px #000}
canvas{display:block}</style><div id="title">CALIPER — eight ordinary fabric parts — ${label}</div><div id="labels"></div><canvas id="sheet"></canvas>`);

const result = await page.evaluate(async ({ port, label }) => {
  const THREE = await import(`http://127.0.0.1:${port}/vendor/three/three.module.min.js`);
  const { KITBASH_PARTS } = await import(`http://127.0.0.1:${port}/kitbash-parts.js`);
  const ids = Object.keys(KITBASH_PARTS).filter((id) => KITBASH_PARTS[id].category === "fabric");
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.78 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x3d4852, roughness: 0.65 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x19364b, roughness: 0.2, metalness: 0.55 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xb5a995, roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x5a6268, roughness: 0.5 }),
  };

  function addPart(scene, id, position = new THREE.Vector3()) {
    const group = new THREE.Group();
    group.position.copy(position);
    for (const item of KITBASH_PARTS[id].buildGeometry(THREE, {}, 0)) {
      const mesh = new THREE.Mesh(item.geo, materials[item.tag] || materials.wall);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    scene.add(group);
    return group;
  }

  function addLighting(scene, targetY = 8) {
    scene.add(new THREE.HemisphereLight(0xb9cee2, 0x20252d, 0.75));
    const sun = new THREE.DirectionalLight(0xffefd0, 3.4);
    sun.position.set(-32, 38, 28);
    sun.target.position.set(0, targetY, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0002;
    scene.add(sun, sun.target);
  }

  const canvas = document.querySelector("#sheet");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1600, 1000, false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1016);
  addLighting(scene, 9);
  const positions = [];
  ids.forEach((id, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const position = new THREE.Vector3((column - 1.5) * 38, 0, (row - 0.5) * 48);
    positions.push(position);
    addPart(scene, id, position);
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(190, 130), new THREE.MeshStandardMaterial({ color: 0x263039, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const camera = new THREE.PerspectiveCamera(32, 1.6, 1, 500);
  camera.position.set(112, 82, 130);
  camera.lookAt(0, 8, 0);
  renderer.render(scene, camera);

  const labels = document.querySelector("#labels");
  ids.forEach((id, index) => {
    const point = positions[index].clone().project(camera);
    const node = document.createElement("div");
    node.className = "label";
    node.textContent = id;
    node.style.left = `${(point.x * 0.5 + 0.5) * 1600 - 165}px`;
    node.style.top = `${(-point.y * 0.5 + 0.5) * 1000 + 105}px`;
    labels.appendChild(node);
  });

  const measurements = [];
  for (const id of ids) {
    const probeCanvas = document.createElement("canvas");
    const probe = new THREE.WebGLRenderer({ canvas: probeCanvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
    probe.setSize(320, 320, false);
    probe.setPixelRatio(1);
    probe.shadowMap.type = THREE.PCFSoftShadowMap;
    const probeScene = new THREE.Scene();
    const group = addPart(probeScene, id);
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    addLighting(probeScene, center.y);
    const probeCamera = new THREE.OrthographicCamera(-size.x * 0.8, size.x * 0.8, size.y * 0.62, -size.y * 0.62, 0.1, 200);
    probeCamera.position.set(size.x * 1.7, center.y + size.y * 0.2, size.z * 2.2);
    probeCamera.lookAt(center);
    const context = probe.getContext();
    probe.shadowMap.enabled = false;
    probe.render(probeScene, probeCamera);
    const unshadowed = new Uint8Array(320 * 320 * 4);
    context.readPixels(0, 0, 320, 320, context.RGBA, context.UNSIGNED_BYTE, unshadowed);
    probe.shadowMap.enabled = true;
    probe.shadowMap.needsUpdate = true;
    probeScene.traverse((object) => {
      if (object.material) object.material.needsUpdate = true;
    });
    probe.render(probeScene, probeCamera);
    const shadowed = new Uint8Array(320 * 320 * 4);
    context.readPixels(0, 0, 320, 320, context.RGBA, context.UNSIGNED_BYTE, shadowed);
    let objectPixels = 0;
    let selfShadowPixels = 0;
    const shadowMask = new Uint8Array(320 * 320);
    for (let offset = 0; offset < shadowed.length; offset += 4) {
      if (shadowed[offset + 3] === 0 || unshadowed[offset + 3] === 0) continue;
      objectPixels++;
      const before = unshadowed[offset] + unshadowed[offset + 1] + unshadowed[offset + 2];
      const after = shadowed[offset] + shadowed[offset + 1] + shadowed[offset + 2];
      if (before - after >= 24) {
        selfShadowPixels++;
        shadowMask[offset / 4] = 1;
      }
    }
    let selfShadowQuads = 0;
    for (let y = 0; y < 319; y++) {
      for (let x = 0; x < 319; x++) {
        const index = y * 320 + x;
        if (shadowMask[index] && shadowMask[index + 1] && shadowMask[index + 320] && shadowMask[index + 321]) selfShadowQuads++;
      }
    }
    measurements.push({ id, objectPixels, selfShadowPixels, selfShadowQuads, ratio: selfShadowPixels / objectPixels });
    probe.dispose();
  }
  return { label, ids, measurements };
}, { port, label });

const screenshot = path.join(SHOTS, `kitbash-fabric-${label}.png`);
const measurementFile = path.join(SHOTS, `kitbash-fabric-${label}.json`);
await page.screenshot({ path: screenshot });
fs.writeFileSync(measurementFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
for (const measurement of result.measurements) {
  console.log(`${measurement.id}: self-shadow ${measurement.selfShadowPixels}/${measurement.objectPixels} pixels, ${measurement.selfShadowQuads} contiguous quads (${(measurement.ratio * 100).toFixed(3)}%)`);
}
console.log(`Saved fabric contact sheet to ${screenshot}`);
console.log(`Saved self-shadow measurements to ${measurementFile}`);

await page.close();
await browser.close();
server.close();

const failures = result.measurements.filter((measurement) => measurement.selfShadowQuads === 0);
if (failures.length > 0) {
  console.error(`SELF-SHADOW GATE FAILED: ${failures.map((measurement) => measurement.id).join(", ")}`);
  process.exitCode = 1;
}
