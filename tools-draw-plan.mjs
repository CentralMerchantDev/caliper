import { generateCityPlan, DISTRICTS, ROADS, BANDS, ISLAND, WORLD, SUBURBS, BRIDGES } from '/tmp/cal-x/public/city-plan.js';
const p = generateCityPlan();

// Drawing window: the island plus a generous margin of context.
const X0=-2200, X1=2200, Z0=-2000, Z1=900;
const W=X1-X0, H=Z1-Z0, S=0.62, PAD=70;
const px=x=>((x-X0)*S+PAD).toFixed(1), pz=z=>((z-Z0)*S+PAD).toFixed(1);
const w=(W*S+PAD*2), h=(H*S+PAD*2);
const COL={ water:'#a8cfe0', ocean:'#8fc0d6', sand:'#efe3c0', land:'#e9e6dd', island:'#f4f2ec',
  road:'#ffffff', rowline:'#b9b3a6', ink:'#2b2b2b', block:'#ded9cf' };
const DC={ waterfront:'#7fb5a3', downtown:'#6f8fc4', heritage:'#c08a6a', civic:'#b07fb0', residential:'#9fbf7a', port:'#8a9aa8' };
const o=[];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" font-family="Helvetica,Arial,sans-serif">`);
o.push(`<rect width="100%" height="100%" fill="${COL.ocean}"/>`);
// mainland
o.push(`<rect x="${px(X0)}" y="${pz(Z0)}" width="${(X1-X0)*S}" height="${(BANDS.MAINLAND_Z-Z0)*S}" fill="${COL.land}"/>`);
// harbour
o.push(`<rect x="${px(X0)}" y="${pz(BANDS.HARBOUR_Z_MIN)}" width="${(X1-X0)*S}" height="${(BANDS.ISLAND_Z_MIN-BANDS.HARBOUR_Z_MIN)*S}" fill="${COL.water}"/>`);
// island
o.push(`<rect x="${px(ISLAND.xMin)}" y="${pz(ISLAND.zMin)}" width="${ISLAND.width*S}" height="${ISLAND.depth*S}" fill="${COL.island}" stroke="${COL.ink}" stroke-width="1.1"/>`);
// beach + seawall
o.push(`<rect x="${px(ISLAND.xMin)}" y="${pz(BANDS.SEAWALL_Z_MAX)}" width="${ISLAND.width*S}" height="${(BANDS.BEACH_Z_MAX-BANDS.SEAWALL_Z_MAX)*S}" fill="${COL.sand}"/>`);
o.push(`<rect x="${px(ISLAND.xMin)}" y="${pz(BANDS.SEAWALL_Z_MIN)}" width="${ISLAND.width*S}" height="${(BANDS.SEAWALL_Z_MAX-BANDS.SEAWALL_Z_MIN)*S}" fill="#9a9a94"/>`);
// district tints
for(const d of DISTRICTS){const b=d.bounds;
 o.push(`<rect x="${px(b.xMin)}" y="${pz(b.zMin)}" width="${(b.xMax-b.xMin)*S}" height="${(b.zMax-b.zMin)*S}" fill="${DC[d.id]}" fill-opacity="0.16"/>`);}
// roads as real right-of-way widths
for(const r of p.roads){const row=ROADS[r.class].row;
 if(r.axis==='ew') o.push(`<rect x="${px(r.from)}" y="${pz(r.at-row/2)}" width="${(r.to-r.from)*S}" height="${row*S}" fill="${COL.road}" stroke="${COL.rowline}" stroke-width="0.4"/>`);
 else o.push(`<rect x="${px(r.at-row/2)}" y="${pz(r.from)}" width="${row*S}" height="${(r.to-r.from)*S}" fill="${COL.road}" stroke="${COL.rowline}" stroke-width="0.4"/>`);}
// plots
for(const pl of p.plots){const c=DC[pl.districtId]||'#999';
 o.push(`<rect x="${px(pl.xMin)}" y="${pz(pl.zMin)}" width="${pl.width*S}" height="${pl.depth*S}" fill="${c}" fill-opacity="0.55" stroke="${COL.ink}" stroke-width="0.35"/>`);}
// suburbs + bridges
for(const s of SUBURBS){const b=s.bounds;
 o.push(`<rect x="${px(b.xMin)}" y="${pz(b.zMin)}" width="${(b.xMax-b.xMin)*S}" height="${(b.zMax-b.zMin)*S}" fill="#cfd8c0" stroke="${COL.ink}" stroke-width="0.7" stroke-dasharray="4 3"/>`);
 o.push(`<text x="${px((b.xMin+b.xMax)/2)}" y="${pz((b.zMin+b.zMax)/2)}" font-size="13" text-anchor="middle" fill="${COL.ink}">${s.name}</text>`);}
for(const br of BRIDGES) o.push(`<line x1="${px(br.x)}" y1="${pz(BANDS.ISLAND_Z_MIN)}" x2="${px(br.x)}" y2="${pz(BANDS.HARBOUR_Z_MIN)}" stroke="${COL.ink}" stroke-width="3"/>`);
// district labels
for(const d of DISTRICTS){const b=d.bounds;
 o.push(`<text x="${px((b.xMin+b.xMax)/2)}" y="${pz(b.zMin)-6}" font-size="13" font-weight="bold" text-anchor="middle" fill="${COL.ink}">${d.name.toUpperCase()}</text>`);}
// scale bar + title
o.push(`<text x="${PAD}" y="30" font-size="20" font-weight="bold" fill="${COL.ink}">CALIPER — ISLAND METROPOLIS MASTERPLAN</text>`);
o.push(`<text x="${PAD}" y="50" font-size="12" fill="#555">Island ${ISLAND.width}×${ISLAND.depth}m · world ${WORLD.SIZE}m · ${p.roads.length} roads · ${p.blocks.length} blocks · ${p.plots.length} plots</text>`);
const sbL=500*S, sy=h-28;
o.push(`<rect x="${PAD}" y="${sy}" width="${sbL}" height="6" fill="${COL.ink}"/><text x="${PAD+sbL+8}" y="${sy+7}" font-size="12" fill="${COL.ink}">500 m</text>`);
o.push(`<text x="${w-PAD}" y="${sy+7}" font-size="12" text-anchor="end" fill="#555">north ↑</text>`);
o.push('</svg>');
import('node:fs').then(fs=>fs.writeFileSync('/tmp/masterplan.svg', o.join('\n')));
