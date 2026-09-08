// =============================================================================
// P3.5.1 — THE FLOATING-EDGE GATE
//
// "There are buildings in the air." Nothing in this project's own test suite
// caught it, because every existing check either samples one point (a single
// heightAt under a piece's centre) or reimplements the renderer rather than
// running it -- the same class of error scripts/measure-layout.mjs's own
// header names ("a fallback that reported a flat world"). This runs the REAL
// renderer (public/city.html, the same harness scripts/shoot-reference-
// baselines.mjs already drives) and asks every Mesh/InstancedMesh instance
// in the actual scene graph the same question: how far is your own lowest
// point from the real ground under it.
//
// THE THRESHOLD -- RULE ZERO, ANCHOR (a) VISIBILITY, NOT (b) CONSTRUCTION.
//
// (b) ACI 117 / CSA A23.1 finished-level tolerance is real and citable, but
// it describes a POURED SLAB ON A CONSTRUCTION SITE -- a different object at
// a different scale than a 26 km procedural render. Transferring a
// millimetre-to-centimetre-scale construction tolerance to a scene where the
// terrain itself is a fractal noise field would be borrowing a number's
// authority without borrowing anything about what it actually measures.
//
// (a) VISIBILITY is the anchor actually tied to what Mark complained about:
// what he SEES. A gap "matters" when it would occupy at least one device
// pixel in an actual saved view -- smaller than that and no camera this
// project uses could show it as separate from the ground even if the render
// were perfect. This makes the threshold a function of distance (near
// things need a tighter absolute tolerance than far ones), derived from the
// SAME camera fov/viewport the six baseline shots and the new "Container
// port" view actually use (public/city.html's own PerspectiveCamera(fov=33,
// ...) and the 1400x900 viewport scripts/shoot-reference-baselines.mjs
// renders at) -- not invented.
//
// For a mesh at distance d from the nearest of these seven real cameras,
// one vertical device pixel spans:
//     metresPerPixel(d) = 2 * d * tan(fovRad / 2) / viewportHeightPx
// A gap below that many metres could not read as separated from the ground
// in any saved view; at or above it, it visibly floats or is visibly buried.
//
// Run: node scripts/measure-floating.mjs
// =============================================================================
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".hdr": "application/octet-stream", ".txt": "text/plain",
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url === "/" ? "/city.html" : url === "/world-source" ? "/sim-baseline.generated.js" : url);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
});

// The seven real views this gate's threshold is derived from -- the six
// baselines (scripts/shoot-reference-baselines.mjs) plus "Container port"
// (already a named preset in public/city.html's own VIEWS object; the
// container yard is not well covered by any of the original six, per
// Mark's own report -- this is what P3.5.3's "one camera aimed at the
// container port" adds, not a new invention).
const VIEW_NAMES = [
  "Downtown skyline", "Downtown close", "Street level",
  "The harbour", "Waterfront", "Heritage quarter",
  "Container port",
];
const VIEWPORT = { width: 1400, height: 900 };
const FOV_DEG = 33; // public/city.html's own default PerspectiveCamera fov

// EXCLUDE list -- things that are MEANT to be above (or, rarely, below)
// ground, each with a real reason. If an offender ends up hiding behind one
// of these, that is failure pattern (A) this gate exists to catch, so every
// entry is a NAME match against an object's own `.name` -- names added
// directly at each construction site in public/city-render.js as part of
// this pass (nothing in the renderer named anything before; walking up an
// unnamed object's parent chain to find one is this script's own fallback,
// not a substitute for real identification).
//
// Deliberately NOT excluded, though they might look like candidates:
//   - "building" -- the 17,105 plot buildings; this is exactly the
//     population Mark measured as CLEAN (lowest ground 0.60 m) and the gate
//     needs to reconfirm that, not wave it through.
//   - "container-port-yard" / "container-port-crane" -- the primary target
//     of this whole gate.
//   - "station" / "stadium" / "cathedral" -- Mark's own single-sample
//     concern; stadium/cathedral measured fine (0.1 m relief), station is
//     the second target. All three stay IN the check.
//   - "marina-clubhouse"/"marina-clubhouse-roof"/"marina-clubhouse-deck"/
//     "marina-hauled-out-boat" -- these rest on land (the quay, the
//     hardstanding), unlike the afloat fleet below, so a real gap here is a
//     real defect, not a design choice.
const ALLOW_ABOVE_GROUND = [
  { test: (o) => o.name === "city-sky", reason: "public/sky.js's own sky group (stars/cloud layer) -- pre-existing name, not one added by this pass; a sky layer by definition is not ground-relative" },
  { test: (o) => /^env:/.test(o.name || ""), reason: "terrain surface, its skirt, ground-fabric water areas, or road/bridge-deck geometry -- these ARE the ground or are graded to their own profile, not point-samplable objects resting on it (the same 'one sample misrepresents an extended surface' problem this gate exists to catch elsewhere, so checking them here would be circular or wrong, not informative)" },
  { test: (o) => /-boat-afloat$/.test(o.name || ""), reason: "boats afloat (marina moorings, open-bay sail, container ships on approach) -- draught means partly BELOW the water surface by design, and heightAt is land terrain, not water level" },
  { test: (o) => /^marina-pontoon$/.test(o.name || ""), reason: "floating pontoon dock, rides the water level, not the seabed heightAt underneath it" },
  { test: (o) => /^golf-course-pond$/.test(o.name || ""), reason: "sits at its own water level, not the seabed/ground heightAt underneath it -- same reasoning as the sea and marina pontoons" },
  { test: (o) => /^boardwalk-railing$/.test(o.name || ""), reason: "sits on the boardwalk deck, not the ground -- its correct reference surface is the deck (already checked separately as 'boardwalk'), not heightAt" },
  { test: (o) => /^pier$/.test(o.name || ""), reason: "the pleasure pier and its pavilion/wheel stand on piles out over open water by design -- heightAt beneath is sea floor, not the structure's own reference elevation" },
  { test: (o) => /-(roof|cap|dome|spire|pod|cab|boom)$/.test(o.name || ""), reason: "Mark's own example category -- a roof/cap/dome/spire/pod/cabin/boom mounted on top of a TALLER part of the same structure (named separately and left in the check, unexcluded). Its own bottom is not meant to touch heightAt; the part it sits on is the one that answers whether the structure itself floats or is buried." },
];

async function newPage(view) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const url = `http://127.0.0.1:${PORT}/city.html?post=0&chunkSize=2000&view=${encodeURIComponent(view)}&still=4`;
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
  return page;
}

console.log("=== P3.5.1 FLOATING-EDGE GATE ===\n");

// --- Pass 1: the seven real camera positions, one page load each (cheap --
// no scene traversal, just read window.__camera.position). ---
const cameraPositions = [];
for (const name of VIEW_NAMES) {
  const page = await newPage(name);
  const pos = await page.evaluate(() => window.__camera.position.toArray());
  cameraPositions.push({ name, pos });
  await page.close();
}
console.log("Camera positions (7 real views):");
for (const c of cameraPositions) console.log(`  ${c.name}: [${c.pos.map((n) => n.toFixed(0)).join(", ")}]`);

// --- Pass 2: ONE full scene traversal (the scene itself does not depend on
// which camera is looking at it) -- every Mesh/InstancedMesh's world-space
// bounding-box bottom Y, per INSTANCE for InstancedMesh (a group-level check
// would miss every individual offender in an instanced port/lamp/bench). ---
const scanPage = await newPage("Downtown skyline");
const raw = await scanPage.evaluate((allowNames) => {
  const THREE = window.__world.THREE;
  const heightAt = window.__world.heightAt;
  const out = [];
  const box = new THREE.Box3();
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();

  function allowed(obj) {
    // Re-check by regex client-side is not possible (functions don't
    // serialize); instead just record the object's own name/type so the
    // node side can apply ALLOW_ABOVE_GROUND after the fact -- keeps the
    // allow-list itself in ONE place (this file, not duplicated in-page).
    return obj.name || "";
  }

  window.__scene.traverse((obj) => {
    if (!(obj.isMesh || obj.isInstancedMesh)) return;
    if (!obj.geometry) return;
    // NOT a `.visible` check. `.visible` is which LOD level THIS PARTICULAR
    // scan page's camera happened to select by distance -- for a scan camera
    // far from a feature (e.g. "Downtown skyline" looking at the container
    // port), that is the EMPTY culling placeholder, and the real geometry
    // (the 2,200 container instances) would silently vanish from every
    // measurement, the exact "gate that passes because it never looked"
    // failure this project exists to refuse. Instead: for any object that is
    // one of an LOD's own levels, keep ONLY level 0 (the real, finest
    // geometry, always) regardless of which level is camera-visible right
    // now, and ignore every coarser level (they describe the same footprint
    // at lower fidelity or are literally empty, so including them would only
    // ever duplicate or dilute level 0's answer, never add real information).
    if (obj.parent && obj.parent.isLOD) {
      const levels = obj.parent.levels;
      if (!levels || !levels.length || levels[0].object !== obj) return;
    }
    const geo = obj.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const localBox = geo.boundingBox;
    if (!localBox || !isFinite(localBox.min.x)) return;

    // Walk up to find a name if this object itself is anonymous (most
    // meshes here are built anonymously and added to a named LOD/Group).
    let named = obj, depth = 0;
    while (named && !named.name && named.parent && depth < 6) { named = named.parent; depth++; }
    const ownerName = named ? named.name : "";

    if (obj.isInstancedMesh && obj.count > 0) {
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, m);
        const worldM = new THREE.Matrix4().multiplyMatrices(obj.matrixWorld, m);
        box.copy(localBox).applyMatrix4(worldM);
        const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
        const bottomY = box.min.y;
        const ground = heightAt(cx, cz);
        out.push({ name: obj.name || ownerName, x: cx, z: cz, bottomY, ground, gap: bottomY - ground, instanced: true, geoType: geo.type, vertCount: geo.attributes.position ? geo.attributes.position.count : 0 });
      }
    } else {
      box.copy(localBox).applyMatrix4(obj.matrixWorld);
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
      const bottomY = box.min.y;
      const ground = heightAt(cx, cz);
      out.push({ name: obj.name || ownerName, x: cx, z: cz, bottomY, ground, gap: bottomY - ground, instanced: false, geoType: geo.type, vertCount: geo.attributes.position ? geo.attributes.position.count : 0 });
    }
  });
  return out;
}, ALLOW_ABOVE_GROUND.map((a) => a.reason));
await scanPage.close();
console.log(`\nScanned ${raw.length} mesh/instance entries from the real scene graph.`);

await browser.close();
server.close();

// --- Apply the allow-list (Node-side, real functions, not serialized) ---
function isAllowed(name) {
  const fakeObj = { name };
  return ALLOW_ABOVE_GROUND.find((a) => a.test(fakeObj));
}

// --- Per-entry threshold: metres-per-pixel at the distance to the NEAREST
// of the seven real cameras. ---
const fovRad = (FOV_DEG * Math.PI) / 180;
function metresPerPixelAt(d) {
  return (2 * d * Math.tan(fovRad / 2)) / VIEWPORT.height;
}
function nearestCameraDistance(x, z, y) {
  let best = Infinity;
  for (const c of cameraPositions) {
    const dx = c.pos[0] - x, dy = c.pos[1] - y, dz = c.pos[2] - z;
    const d = Math.hypot(dx, dy, dz);
    if (d < best) best = d;
  }
  return best;
}

const excluded = [];
const checked = [];
for (const r of raw) {
  const allow = isAllowed(r.name);
  if (allow) { excluded.push({ ...r, reason: allow.reason }); continue; }
  checked.push(r);
}

const offenders = [];
for (const r of checked) {
  const d = nearestCameraDistance(r.x, r.z, r.bottomY);
  const threshold = metresPerPixelAt(d);
  if (Math.abs(r.gap) >= threshold) offenders.push({ ...r, threshold, distanceToNearestCamera: d });
}

offenders.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

console.log(`\nExcluded by allow-list: ${excluded.length} (${new Set(excluded.map((e) => e.reason)).size} distinct reasons)`);
console.log(`Checked: ${checked.length}`);
console.log(`\n=== OFFENDERS: ${offenders.length} of ${checked.length} float or bury past their own visibility threshold ===`);
console.log(`(threshold = 1 device pixel at nearest-camera distance, fov=${FOV_DEG}deg, viewport=${VIEWPORT.width}x${VIEWPORT.height})\n`);

console.log("Top 20 by |gap|:");
for (const o of offenders.slice(0, 20)) {
  console.log(`  ${o.gap >= 0 ? "FLOAT" : "BURY "} ${Math.abs(o.gap).toFixed(2)}m  name="${o.name || "(anonymous)"}"  at (${o.x.toFixed(0)}, ${o.z.toFixed(0)})  threshold=${o.threshold.toFixed(3)}m  bottomY=${o.bottomY.toFixed(2)} ground=${o.ground.toFixed(2)}  geo=${o.geoType}(${o.vertCount}v)`);
}

const byName = new Map();
for (const o of offenders) byName.set(o.name || "(anonymous)", (byName.get(o.name || "(anonymous)") || 0) + 1);
console.log("\nOffenders by name (all distinct names, not just the top slice -- a name with a real count buried behind noise is still a real count):");
for (const [name, count] of [...byName.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(6)}  ${name}`);
}

// The container yard's own worst cases, called out on their own -- P3.5.1's
// mutation-proof requirement is that the yard shows up as a real, severe
// offender, not that it happens to out-rank every other defect this same
// gate finds. Suppressing the crane/golf bugs to force the yard higher in
// one merged ranking would be exactly the dishonesty this project refuses;
// showing its own worst cases directly is the honest way to make the point.
const yardOffenders = offenders.filter((o) => o.name === "container-port-yard").sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
if (yardOffenders.length) {
  console.log(`\nContainer yard specifically: ${yardOffenders.length} offending instances, worst 10:`);
  for (const o of yardOffenders.slice(0, 10)) {
    console.log(`  ${o.gap >= 0 ? "FLOAT" : "BURY "} ${Math.abs(o.gap).toFixed(2)}m  at (${o.x.toFixed(0)}, ${o.z.toFixed(0)})  threshold=${o.threshold.toFixed(3)}m  bottomY=${o.bottomY.toFixed(2)} ground=${o.ground.toFixed(2)}`);
  }
}

// Same per-name detail for the other two P3.5.2 targets and the two new
// finds, so a before/after diff doesn't have to trust a single aggregate
// count -- a count can stay the same while every individual gap shrinks
// (or grows), and only the actual worst instances show that.
for (const n of ["station", "container-port-crane", "golf-course", "golf-clubhouse"]) {
  const named = offenders.filter((o) => o.name === n).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  if (!named.length) continue;
  console.log(`\n${n} specifically: ${named.length} offending instances, worst 5:`);
  for (const o of named.slice(0, 5)) {
    console.log(`  ${o.gap >= 0 ? "FLOAT" : "BURY "} ${Math.abs(o.gap).toFixed(2)}m  at (${o.x.toFixed(0)}, ${o.z.toFixed(0)})  threshold=${o.threshold.toFixed(3)}m  bottomY=${o.bottomY.toFixed(2)} ground=${o.ground.toFixed(2)}`);
  }
}

console.log(`\nGATE: ${offenders.length === 0 ? "PASS (0 offenders)" : `FAIL (${offenders.length} offenders)`}`);
process.exitCode = offenders.length === 0 ? 0 : 1;
