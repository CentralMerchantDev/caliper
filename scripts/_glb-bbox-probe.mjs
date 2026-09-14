// Throwaway probe -- reads a GLB's JSON chunk and computes the overall
// bounding box from every POSITION accessor's own min/max, without a
// renderer. Used once, to pick real pieces by real measured size before
// sourcing them into the repo. Not part of the product; not imported by
// anything.
import { readFileSync } from "node:fs";

function readGLB(path) {
  const buf = readFileSync(path);
  const jsonLength = buf.readUInt32LE(12);
  const jsonStart = 20;
  const json = JSON.parse(buf.subarray(jsonStart, jsonStart + jsonLength).toString("utf8"));
  return json;
}

function bbox(json) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const acc of json.accessors || []) {
    if (acc.type === "VEC3" && acc.min && acc.max) {
      // Heuristic: POSITION accessors are VEC3 float; skip if this looks like
      // a non-position accessor by checking componentType is float (5126).
      if (acc.componentType !== 5126) continue;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], acc.min[i]);
        max[i] = Math.max(max[i], acc.max[i]);
      }
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

for (const path of process.argv.slice(2)) {
  const json = readGLB(path);
  const { size } = bbox(json);
  console.log(`${path}: approx size x=${size[0].toFixed(2)} y=${size[1].toFixed(2)} z=${size[2].toFixed(2)} (metres, unscaled)`);
}
