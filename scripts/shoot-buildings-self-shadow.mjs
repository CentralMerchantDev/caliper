import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// cspell:words swiftshader midrise highstreet

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const sourceArgument = process.argv.find((argument) => argument.startsWith("--buildings="));
const alternateSource = sourceArgument ? path.resolve(ROOT, sourceArgument.slice("--buildings=".length)) : null;

const server = http.createServer((request, response) => {
  const url = decodeURIComponent(request.url.split("?")[0]);
  if (url === "/probe.html") {
    response.writeHead(200, { "content-type": "text/html" });
    return response.end("<!doctype html><title>World building self-shadow probe</title>");
  }
  const file = alternateSource && url === "/buildings.js" ? alternateSource : path.join(PUBLIC, url);
  const permitted = file.startsWith(PUBLIC) || (alternateSource && file === alternateSource);
  if (!permitted || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404);
    return response.end("not found");
  }
  response.writeHead(200, { "content-type": "text/javascript" });
  fs.createReadStream(file).pipe(response);
});

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
await page.goto(`http://127.0.0.1:${port}/probe.html`);

const measurements = await page.evaluate(async () => {
  const THREE = await import("./vendor/three/three.module.min.js");
  const { building } = await import("./buildings.js");
  const typologies = [
    "bld-villa", "bld-terrace", "bld-townhouse", "bld-midrise", "bld-shop",
    "bld-office", "bld-apartment-walkup", "bld-warehouse", "bld-workshop",
    "bld-tower", "bld-highstreet-terrace", "bld-business-park",
  ];
  const azimuths = [45, 135, 225, 315];
  const output = [];
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(320, 320, false);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  for (const typology of typologies) {
    const spec = building(typology, `k6-shadow-${typology}`, {});
    const geometry = spec.lod[0].createGeometry(THREE);
    const material = new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.7 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const scene = new THREE.Scene();
    scene.add(mesh, new THREE.HemisphereLight(0xb9cee2, 0x20252d, 0.75));
    const bounds = new THREE.Box3().setFromObject(mesh);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.z) * 0.7;
    const sun = new THREE.DirectionalLight(0xffefd0, 3.4);
    sun.target.position.copy(center);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: size.y, bottom: -size.y * 0.25, near: 1, far: 300 });
    sun.shadow.bias = -0.0002;
    scene.add(sun, sun.target);
    const camera = new THREE.OrthographicCamera(-span, span, size.y * 0.65, -size.y * 0.65, 0.1, 500);
    const context = renderer.getContext();

    for (const azimuth of azimuths) {
      const radians = THREE.MathUtils.degToRad(azimuth);
      sun.position.set(Math.cos(radians) * span * 2, size.y * 1.4, Math.sin(radians) * span * 2);
      const cameraAngle = radians + THREE.MathUtils.degToRad(55);
      camera.position.set(Math.cos(cameraAngle) * span * 2.5, center.y + size.y * 0.15, Math.sin(cameraAngle) * span * 2.5);
      camera.lookAt(center);
      renderer.shadowMap.enabled = false;
      renderer.render(scene, camera);
      const without = new Uint8Array(320 * 320 * 4);
      context.readPixels(0, 0, 320, 320, context.RGBA, context.UNSIGNED_BYTE, without);
      renderer.shadowMap.enabled = true;
      material.needsUpdate = true;
      renderer.render(scene, camera);
      const withShadow = new Uint8Array(320 * 320 * 4);
      context.readPixels(0, 0, 320, 320, context.RGBA, context.UNSIGNED_BYTE, withShadow);
      let objectPixels = 0;
      let shadowPixels = 0;
      let shadowQuads = 0;
      const shadowMask = new Uint8Array(320 * 320);
      for (let offset = 0; offset < withShadow.length; offset += 4) {
        if (withShadow[offset + 3] === 0 || without[offset + 3] === 0) continue;
        objectPixels++;
        const before = without[offset] + without[offset + 1] + without[offset + 2];
        const after = withShadow[offset] + withShadow[offset + 1] + withShadow[offset + 2];
        if (before - after >= 24) {
          shadowPixels++;
          shadowMask[offset / 4] = 1;
        }
      }
      for (let y = 0; y < 319; y++) for (let x = 0; x < 319; x++) {
        const index = y * 320 + x;
        if (shadowMask[index] && shadowMask[index + 1] && shadowMask[index + 320] && shadowMask[index + 321]) shadowQuads++;
      }
      output.push({ typology, azimuth, objectPixels, shadowPixels, shadowQuads });
    }
    geometry.dispose();
    material.dispose();
    renderer.renderLists.dispose();
  }
  renderer.dispose();
  return output;
});

for (const measurement of measurements) {
  console.log(`${measurement.typology} @ ${measurement.azimuth} degrees: ${measurement.shadowPixels}/${measurement.objectPixels} self-shadow pixels; ${measurement.shadowQuads} contiguous quads`);
}
const failures = measurements.filter((measurement) => measurement.shadowQuads === 0);
await page.close();
await browser.close();
server.close();
if (failures.length) {
  console.error(`WORLD BUILDING SELF-SHADOW GATE FAILED: ${failures.map((failure) => `${failure.typology}@${failure.azimuth}`).join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`WORLD BUILDING SELF-SHADOW GATE PASSED: ${measurements.length} directions`);
}
