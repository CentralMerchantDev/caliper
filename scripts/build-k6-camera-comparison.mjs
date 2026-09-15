import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const views = [
  ["downtown-skyline", "Downtown skyline"], ["downtown-close", "Downtown close"],
  ["street-level", "Street level"], ["the-harbour", "The harbour"],
  ["waterfront", "Waterfront"], ["heritage-quarter", "Heritage quarter"],
  ["container-port", "Container port"],
];
for (const [slug] of views) for (const phase of ["before", "after"]) {
  const file = path.join(root, ".shots", `k6-${phase}`, `${slug}.png`);
  const bytes = fs.readFileSync(file);
  if (bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(16) !== 1400 || bytes.readUInt32BE(20) !== 900 || bytes.length < 50000) {
    throw new Error(`Invalid world camera capture: ${file}`);
  }
}
const cards = views.map(([slug, name]) => `
<section><h2>${name}</h2>
<div class="pair"><figure><figcaption>Before</figcaption><a href="k6-before/${slug}.png"><img loading="lazy" src="k6-before/${slug}.png" alt="${name} before"></a></figure>
<figure><figcaption>After</figcaption><a href="k6-after/${slug}.png"><img loading="lazy" src="k6-after/${slug}.png" alt="${name} after"></a></figure></div></section>`).join("\n");
const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>K6 world cameras: before and after</title>
<style>body{margin:24px;background:#181c20;color:#eee;font:16px system-ui}h1{font-size:28px}h2{font-size:20px;margin-top:36px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{margin-bottom:8px;color:#bbc7d1}img{width:100%;height:auto}a{color:#9dd2fa}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style>
<h1>K6 world cameras</h1><p>Seven unchanged cameras. Click any image for the full 1400 × 900 capture.</p>
<p><a href="../docs/audits/K6-BUILDINGS.md">Audit: geometry, performance, gates, and visual judgment</a></p>${cards}</html>`;
fs.writeFileSync(path.join(root, ".shots", "k6-world-comparison.html"), html);
console.log("Validated 14 world camera captures; wrote .shots/k6-world-comparison.html");
