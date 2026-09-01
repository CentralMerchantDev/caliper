// =============================================================================
// DERIVE THE MAINLAND SETTLEMENTS
//
// The last hand-written rectangles in the world. Every other coordinate now
// comes from the land; these were still typed against a coastline that has
// since moved ~2 km south, which is why five bridges arrive at nothing and the
// network is in pieces.
//
// So: walk the traced shoreline, and for each stretch of coast lay a band of
// town INLAND of it. A settlement derived from the shore cannot fail to meet
// the shore.
//
// The bands vary along the coast the way a real one does -- a dense harbour
// city where the bay is deepest, mid-rise either side, suburbs beyond, and
// farmland at the ends -- rather than one uniform strip.
// =============================================================================
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = path.join(ROOT, "public");
const plan = await import(path.join(P, "city-plan.js"));
const terrain = await import(path.join(P, "terrain.js"));

const heightAt = terrain.makeHeightAt(new terrain.LandField(16));
const mainland = plan.LANDMASSES.find((m) => m.id === "mainland");
const shore = mainland.points.slice(0, mainland.coastCount);

/** How far inland is dry, buildable ground at this x? */
function inlandDepth(x, shoreZ) {
  let last = shoreZ;
  for (let d = 200; d <= 5200; d += 100) {
    const z = shoreZ - d;                 // inland is smaller z on the north shore
    if (heightAt(x, z) < 2) break;
    last = z;
  }
  return shoreZ - last;
}

// Only the north-facing stretch of the shore carries the city; the two arms run
// north-south and are handled as coast, not as a band.
const northShore = shore.filter(([, z]) => z < 1200).sort((a, b) => a[0] - b[0]);

const CHUNK = 2600;
const out = [];
let i = 0;
for (let x = -18000; x < 18000; x += CHUNK) {
  const here = northShore.filter(([px]) => px >= x && px < x + CHUNK);
  if (here.length === 0) continue;
  const shoreZ = here.reduce((a, [, z]) => a + z, 0) / here.length;
  const cx = x + CHUNK / 2;
  const depth = inlandDepth(cx, shoreZ);
  if (depth < 700) continue;

  const zMax = Math.round(shoreZ - 180);          // just inland of the water
  const zMin = Math.round(shoreZ - Math.min(depth, 4200));
  if (zMax - zMin < 600) continue;

  // character varies along the coast: the harbour city sits where the bay is
  // deepest, mid-rise shoulders either side, then suburbs, then farmland
  const t = Math.abs(cx) / 18000;
  let cls, av, st, core, edge;
  if (t < 0.16)      { cls = "TOWER";     av = 210; st = 165; core = 0.7;  edge = 0.5; }
  else if (t < 0.34) { cls = "MIDRISE";   av = 195; st = 152; core = 0.62; edge = 0.42; }
  else if (t < 0.56) { cls = "TOWNHOUSE"; av = 165; st = 130; core = 0.55; edge = 0.32; }
  else if (t < 0.78) { cls = "VILLA";     av = 150; st = 118; core = 0.48; edge = 0.24; }
  else               { cls = "FARM";      av = 420; st = 330; core = 0.4;  edge = 0.18; }

  // Name by WHERE it is, not by loop counter -- indexing a name list by `i`
  // called the farmland at the far west end "Harbour City".
  const west = cx < 0;
  const name =
    t < 0.16 ? "Harbour City" :
    t < 0.34 ? (west ? "Westgate" : "Eastgate") :
    t < 0.56 ? (west ? "Marchmont" : "Stonebridge") :
    t < 0.78 ? (west ? "Fernwood" : "Ridgeway") :
               (west ? "West Farms" : "East Farms");
  out.push(`  { id:"coastal-${i}", name:"${name}", landmass:"mainland",
    bounds:{xMin:${x},xMax:${x + CHUNK},zMin:${zMin},zMax:${zMax}}, av:${av}, st:${st}, cls:"${cls}",
    core:${core}, edge:${edge} },`);
  i++;
}

console.log(out.join("\n"));
console.error(`${out.length} coastal bands derived from the traced shore`);
