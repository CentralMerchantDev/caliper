// =============================================================================
// PLAN MAP
//
// A true top-down map of the world, drawn from the plan data rather than
// rendered in 3D.
//
// This exists because comparing a hand-drawn layout against an oblique 3D
// screenshot kept producing wrong conclusions: a perspective camera compresses
// distance non-linearly, so "your islands are too small" and "my camera is
// lower than the one you drew on" look identical. Several passes were spent
// chasing what turned out to be camera mismatch.
//
// A plan view has a LINEAR mapping to world coordinates. Mark up this image and
// every pixel converts straight back to metres -- so a correction can be
// applied exactly instead of estimated.
//
// Output: SVG (crisp at any zoom, and readable as text).
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = path.join(ROOT, "public");

const plan = await import(path.join(P, "city-plan.js"));
const terrain = await import(path.join(P, "terrain.js"));

const X0 = -23000, X1 = 23000, Z0 = -13000, Z1 = 7000;
const W = 2000;
const S = W / (X1 - X0);
const H = Math.round((Z1 - Z0) * S);
const px = (x) => ((x - X0) * S).toFixed(1);
const py = (z) => ((z - Z0) * S).toFixed(1);

const masses = plan.landmassPolygons(20);
const heightAt = terrain.makeHeightAt(new terrain.LandField(16));
const world = plan.generateWorld(heightAt);

const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
out.push(`<rect width="${W}" height="${H}" fill="#123a4d"/>`);

// --- land ------------------------------------------------------------------
const FILL = { mainland: "#cfd9a8", city: "#d9d2b4", island: "#d3dcae", "beach-strip": "#e8dfba" };
for (const m of masses) {
  const pts = m.polygon.map(([x, z]) => `${px(x)},${py(z)}`).join(" ");
  out.push(`<polygon points="${pts}" fill="${FILL[m.kind] || "#d3dcae"}" stroke="#8d9a6a" stroke-width="1.5"/>`);
}

// --- rivers and canals -----------------------------------------------------
for (const w of terrain.WATERWAYS) {
  const d = w.points.map(([x, z], i) => `${i ? "L" : "M"}${px(x)},${py(z)}`).join(" ");
  out.push(`<path d="${d}" fill="none" stroke="#2f7d99" stroke-width="${Math.max(1.5, w.halfWidth * 2 * S)}" stroke-linecap="round"/>`);
}

// --- roads, by class -------------------------------------------------------
const RW = { FREEWAY: 2.6, BOULEVARD: 1.5, AVENUE: 0.9, STREET: 0.5, RAMP: 0.7 };
const RC = { FREEWAY: "#b8412e", BOULEVARD: "#7a6a55", AVENUE: "#8d8069", STREET: "#9d9384", RAMP: "#c07a55" };
for (const r of world.roads) {
  if (r.bridge) continue;
  const ew = r.axis === "ew";
  const x1 = ew ? px(r.from) : px(r.at), x2 = ew ? px(r.to) : px(r.at);
  const y1 = ew ? py(r.at) : py(r.from), y2 = ew ? py(r.at) : py(r.to);
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${RC[r.class] || "#999"}" stroke-width="${RW[r.class] || 0.5}"/>`);
}
// bridges on top, in a colour you cannot miss
for (const b of plan.BRIDGES) {
  const ew = b.axis === "ew";
  const x1 = ew ? px(b.a) : px(b.x), x2 = ew ? px(b.b) : px(b.x);
  const y1 = ew ? py(b.x) : py(b.a), y2 = ew ? py(b.x) : py(b.b);
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e03b2f" stroke-width="3"/>`);
}

// --- a coordinate grid, so a mark on this map converts to metres -----------
for (let x = X0; x <= X1; x += 5000) {
  out.push(`<line x1="${px(x)}" y1="0" x2="${px(x)}" y2="${H}" stroke="#ffffff" stroke-width="0.6" opacity="0.28"/>`);
  out.push(`<text x="${px(x) + 4}" y="14" font-family="monospace" font-size="12" fill="#ffffff" opacity="0.75">x ${x}</text>`);
}
for (let z = Z0; z <= Z1; z += 5000) {
  out.push(`<line x1="0" y1="${py(z)}" x2="${W}" y2="${py(z)}" stroke="#ffffff" stroke-width="0.6" opacity="0.28"/>`);
  out.push(`<text x="4" y="${py(z) - 4}" font-family="monospace" font-size="12" fill="#ffffff" opacity="0.75">z ${z}</text>`);
}

// --- labels ----------------------------------------------------------------
for (const m of masses) {
  if (m.kind === "mainland") continue;
  let cx = 0, cz = 0;
  for (const [x, z] of m.polygon) { cx += x; cz += z; }
  cx /= m.polygon.length; cz /= m.polygon.length;
  let area = 0;
  for (let i = 0; i < m.polygon.length; i++) {
    const [ax, az] = m.polygon[i], [bx, bz] = m.polygon[(i + 1) % m.polygon.length];
    area += ax * bz - bx * az;
  }
  const km2 = (Math.abs(area / 2) / 1e6).toFixed(1);
  out.push(`<text x="${px(cx)}" y="${py(cz)}" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1c2b12" text-anchor="middle">${m.name || m.id}</text>`);
  out.push(`<text x="${px(cx)}" y="${py(cz) + 16}" font-family="monospace" font-size="12" fill="#3a4a2a" text-anchor="middle">${km2} km²</text>`);
}

out.push(`<text x="12" y="${H - 14}" font-family="sans-serif" font-size="15" fill="#ffffff">CALIPER — plan view. Grid = 5 km. Red = bridges. Dark red = freeway.</text>`);
out.push(`</svg>`);

const dest = process.argv[2] || path.join(ROOT, ".shots", "plan-map.svg");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out.join("\n"));
console.log(`wrote ${dest}  (${W} x ${H}, ${(X1 - X0) / 1000} km wide)`);
