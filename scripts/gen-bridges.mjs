// =============================================================================
// DERIVE THE CROSSINGS
//
// Builds the bridge list from the land itself: the shortest gap between each
// pair of land masses, a minimum spanning tree over those gaps so every island
// is reachable, plus a few extra edges so the network is a grid rather than a
// chain hanging off one crossing.
//
// Hand-authored bridges are what produced "19 of 40 bridge ends meet no road"
// and a span whose both ends landed on the same island. A crossing derived from
// the gap it crosses cannot be in the wrong place.
// =============================================================================
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = path.join(ROOT, "public");
const plan = await import(path.join(P, "city-plan.js"));
const terrain = await import(path.join(P, "terrain.js"));

const landUse = await import(path.join(P, "land-use.js"));
const heightAt = terrain.makeHeightAt(new terrain.LandField(16));
const masses = plan.landmassPolygons(20);

/** point-in-polygon, so an anchor can be checked against the mass it is for */
function inside(poly, x, z) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** Nearest pair of points between two polygons, and the gap between them. */
function nearest(a, b) {
  let best = { d: Infinity };
  for (let i = 0; i < a.length; i += 2) {
    for (let j = 0; j < b.length; j += 2) {
      const dx = a[i][0] - b[j][0], dz = a[i][1] - b[j][1];
      const d = Math.hypot(dx, dz);
      if (d < best.d) best = { d, ax: a[i][0], az: a[i][1], bx: b[j][0], bz: b[j][1] };
    }
  }
  return best;
}

const ids = masses.map((m) => m.id);
const pairs = [];
for (let i = 0; i < masses.length; i++) {
  for (let j = i + 1; j < masses.length; j++) {
    const n = nearest(masses[i].polygon, masses[j].polygon);
    if (n.d > 9000) continue;                    // too far to bridge
    pairs.push({ a: i, b: j, ...n });
  }
}
pairs.sort((p, q) => p.d - q.d);

// minimum spanning tree, so every mass is connected with the shortest crossings
const parent = ids.map((_, i) => i);
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
const chosen = [];
for (const p of pairs) {
  const ra = find(p.a), rb = find(p.b);
  if (ra === rb) continue;
  parent[ra] = rb;
  chosen.push(p);
}
// then a few redundant crossings: short gaps that would otherwise go unbridged
for (const p of pairs) {
  if (chosen.includes(p)) continue;
  // More redundancy than the MST: after the geography was rebuilt from the
  // drawing, a spanning tree left every island hanging off one crossing, and a
  // single clipped approach dropped it out of the network. A real archipelago
  // has more than one way onto each island.
  if (p.d > 3000) continue;   // 4.2 km came back as a span longer than any real bridge
  if (chosen.filter((c) => c.a === p.a || c.b === p.a || c.a === p.b || c.b === p.b).length >= 5) continue;
  chosen.push(p);
}

/**
 * Push an anchor inland until the ground is dry AND belongs to the right mass.
 *
 * Requiring only "dry" found dry ground that belonged to somebody else -- the
 * barrier-to-Redcliff crossing came back with both ends on the mainland. An
 * anchor has to be on the island the bridge is for, or the bridge is not that
 * bridge.
 */
function dryAnchor(axis, at, from, awayFrom, wantId) {
  const dir = Math.sign(from - awayFrom) || 1;
  const want = masses.find((m) => m.id === wantId);
  for (let d = 0; d <= 2600; d += 10) {
    const t = from + dir * d;
    const x = axis === "ew" ? t : at, z = axis === "ew" ? at : t;
    // The anchor must be ground a ROAD can use, not merely dry ground. Redcliff's
    // crossing landed on the cliff the island is named for -- 0.84 slope -- so
    // the deck was fine and nothing could drive off it.
    if (heightAt(x, z) >= 4.0 && landUse.roadAllowedAt(heightAt, x, z).ok
        && (!want || inside(want.polygon, x, z))) return t;
  }
  return null;
}

const TYPES = ["arch", "cable", "causeway"];
const out = [];
let n = 0;
for (const p of chosen) {
  const dx = Math.abs(p.ax - p.bx), dz = Math.abs(p.az - p.bz);
  const axis = dz >= dx ? "ns" : "ew";          // span the LONGER separation
  const at = Math.round(axis === "ns" ? (p.ax + p.bx) / 2 : (p.az + p.bz) / 2);
  let a = Math.round(axis === "ns" ? p.az : p.ax);
  let b = Math.round(axis === "ns" ? p.bz : p.bx);
  const sa = dryAnchor(axis, at, a, b, ids[p.a]);
  const sb = dryAnchor(axis, at, b, a, ids[p.b]);
  if (sa === null || sb === null) { console.error(`  skipped ${ids[p.a]}<->${ids[p.b]}: no dry anchor`); continue; }

  // THE ANCHORS MUST LAND ON THE MASSES THIS BRIDGE IS FOR.
  //
  // Walking inland until the ground is dry finds dry ground -- but not
  // necessarily the RIGHT dry ground. barrier-redcliff came back with both ends
  // on the mainland: a bridge between two islands that touched neither, which
  // the reachability invariant caught as "it bridges nothing".
  const massOf = (t) => {
    const x = axis === "ew" ? t : at, z = axis === "ew" ? at : t;
    for (const m of masses) if (inside(m.polygon, x, z)) return m.id;
    return null;
  };
  const ma = massOf(sa), mb = massOf(sb);
  if (ma !== ids[p.a] || mb !== ids[p.b]) {
    console.error(`  skipped ${ids[p.a]}<->${ids[p.b]}: anchors landed on ${ma}/${mb}`);
    continue;
  }
  if (Math.abs(sa - sb) < 120) { console.error(`  skipped ${ids[p.a]}<->${ids[p.b]}: gap too small`); continue; }
  const cls = p.d > 1800 ? "BOULEVARD" : "AVENUE";
  const id = `${ids[p.a].replace(/-isle$/, "")}-${ids[p.b].replace(/-isle$/, "")}`;
  out.push(`  { id: "${id}", ${axis === "ew" ? 'axis: "ew", ' : ""}x: ${at}, a: ${sa}, b: ${sb}, type: "${TYPES[n++ % 3]}", class: "${cls}" },`);
}

console.log(`export const BRIDGES = [\n${out.join("\n")}\n];`);
console.error(`\n${out.length} crossings derived from ${chosen.length} gaps`);
