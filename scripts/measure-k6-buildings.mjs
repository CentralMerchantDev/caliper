import fs from "node:fs";
import { buildWorldState, buildScenePlacements } from "../public/city-render.js";
import { groupByVariant } from "../public/layout.js";
import { building } from "../public/buildings.js";

// Use the renderer's own placement path, including terrain refusals and fits.
const state = buildWorldState();
const { instanced, overridden } = buildScenePlacements(state);
const groups = groupByVariant([...instanced, ...overridden]);
const rows = {};
for (const group of groups.values()) {
  const spec = building(group.typology, group.seed, group.options);
  const geometry = spec.lod[0].createGeometry();
  const triangles = (geometry.index?.count ?? geometry.attributes.position.count) / 3;
  geometry.dispose();
  const row = rows[group.typology] ??= { typology: group.typology, count: 0, variants: 0, min: Infinity, max: 0, total: 0 };
  row.count += group.placements.length;
  row.variants++;
  row.min = Math.min(row.min, triangles);
  row.max = Math.max(row.max, triangles);
  row.total += triangles * group.placements.length;
}
const result = Object.values(rows).sort((a, b) => b.count - a.count);
const total = result.reduce((sum, row) => sum + row.count, 0);
for (const row of result) {
  row.percent = +(row.count / total * 100).toFixed(2);
  row.mean = +(row.total / row.count).toFixed(2);
}
const output = JSON.stringify({ total, rows: result }, null, 2);
if (process.argv[2]) fs.writeFileSync(process.argv[2], output + "\n");
console.log(output);
