// =============================================================================
// CALIPER — WORLD RENDERER
//
// Draws the plan. Owns no world data of its own: every coordinate comes from
// city-plan.js, every ground height from terrain.js, every building silhouette
// from buildings.js. That separation is the point -- the AI pipeline edits the
// PLAN, and whatever it says appears here without the renderer needing to know
// what changed.
//
// SCALE, MEASURED. A 26 km world with 19,194 buildings in 88,062 parts across 14
// instanced buckets, 266,774 terrain vertices, and roads whose triangle count is
// reported in stats.roadTris rather than restated here.
//
// The previous version of this paragraph said "40 km", "~64,000 building parts"
// and "185,000 terrain vertices", and claimed "about thirty draw calls ...
// nothing is a loose Mesh". Every figure was stale and the last clause was
// simply untrue: an audit counted roughly 700 loose meshes -- 132 boats and 70
// sails each with their own geometry because the scale varies per boat, 48
// aircraft parts, 28 stadium bays, 24 crane members, 22 train cars.
//
// The instanced core IS about a dozen draw calls, and that is the part worth
// claiming. The props are not instanced and saying otherwise was the kind of
// round number that sounds measured because it is round. Recorded as a real
// gap in docs/PHASE-4-FINDINGS.md (B14) rather than quietly restated.
// =============================================================================

import { Sky } from "./vendor/three/addons/objects/Sky.js";
import { createCitySky } from "./sky.js";
import { RoundedBoxGeometry } from "./vendor/three/addons/geometries/RoundedBoxGeometry.js";
import {
  WORLD, ROADS, BRIDGES, MARINA, PIER, BOARDWALK, PLOT_CLASSES,
  generateWorld, generateCityPlan, landmassPolygons, offsetPolygon,
} from "./city-plan.js";
import { makeHeightAt, groundColor, fbm, cliffiness, TREE_LINE, GROUND_BANDS, WATERWAYS, waterwaySurface , waterwayAt, beachWeight } from "./terrain.js";
import { createWorld } from "./world.js";
import { DEFAULT_SEED } from "./noise.js";
import { applyLayers } from "./apply-layers.js";
import { partitionForInstancing } from "./instance-groups.js";
import { resolveOverrideModels } from "./resolve-models.js";
import { createModelRegistry } from "./model-registry.js";
import { assessFootprint, DRY_ENOUGH } from "./footprint.js";
import { propFootprint } from "./prop-manifest.js";
// The join to the asset lane's model library. prop-manifest decides what a prop
// CLAIMS; this decides what it LOOKS LIKE, and prop-models.js is the table that
// keeps the two agreeing. See its header for why the mapping is written out in
// full rather than matched by name.
import { propGeometry } from "./prop-models.js";
// `sm` is already used as a local variable in this file (a THREE.Mesh), so the
// world-scale helper is imported under a name that cannot be shadowed.
import { sm as wm, toDesign } from "./world-scale.js";
import { placeFeatures, FEATURES } from "./features.js";
import { gradeRun, GRADE, ROAD_GRADE, RAIL_ALIGNMENT } from "./grade.js";
import { building, rnd } from "./buildings.js";
import { planCity, groupByVariant, variantKeyOf } from "./layout.js";
import { makeFits } from "./layout-fits.js";
import { getFacadeMaterial } from "./facade-textures.js";
import { HDRLoader } from "./vendor/three/addons/loaders/HDRLoader.js";

// -----------------------------------------------------------------------------
// Tunables. Collected here because these are the numbers that get argued about.
// -----------------------------------------------------------------------------
export const LOOK = {
  // Three-quarter light. At azimuth 152 the sun sat BEYOND the city and blew the
  // horizon out; at 232 it sat behind the camera and every face was flat. From
  // the east-north-east the near faces split into lit and shaded, and shadows
  // fall across the streets where you can see them.
  // The default views sit SOUTH-EAST of the city looking north-west, so the
  // south and east faces are the ones you see. The sun has to share that
  // quadrant or every visible face is in shade. Azimuth 152 and 108 both put it
  // beyond the city (blown horizon, blue city); 232 put it behind the camera
  // (flat, no shadows). 62 degrees is about 40 off the view axis: lit east
  // faces, shaded south faces, shadows falling where you can see them.
  sunElevation: 66,          // high enough that the sun disc stays out of frame
  sunAzimuth: 68,
  exposure: 0.78,
  // Aerial perspective, not soup. At 0.0000265 this was ~40% extinction at
  // 20 km and over 60% at the 38 km the wide views actually use -- the whole
  // world washed to pale blue and the layout became impossible to read from
  // altitude, which is exactly the distance you look at a city plan from.
  // 0.0000092 gives ~17% at 20 km and ~30% at 38 km: distance still reads,
  // the land still has colour.
  fogDensity: 0.0000092,
  fogColor: 0x8fb4cf,
  // The fine grid has to cover the whole COAST, not just the city: the headlands
  // sat on the 200 m grid, where a cliff is narrower than one cell, so they came
  // out as flat plateaux. 50 m over 40 x 14 km costs about the same as 40 m over
  // the old box and resolves every peninsula.
  coreX: wm(20000), coreZ0: wm(-9000), coreZ1: wm(5000),
  coreStep: wm(50),
  outerStep: wm(250),
  seaLevel: 0,
  chunkSize: 2000,           // Spatial chunk size for frustum culling and distance LOD
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// =============================================================================
// GEOMETRY PRIMITIVES
//
// Silhouettes a box cannot make. Each is a unit shape centred on its own base so
// archetypes can position by centre and scale freely.
// =============================================================================

/** Gable roof: base 1x1, ridge along z at the top. Origin at the eaves plane. */
function prismGeometry(THREE) {
  const g = new THREE.BufferGeometry();
  const v = [
    -0.5, 0, -0.5,  0.5, 0, -0.5,  0.5, 0, 0.5,  -0.5, 0, 0.5,   // 0..3 eaves
     0.0, 1, -0.5,  0.0, 1, 0.5,                                 // 4,5 ridge
  ];
  const idx = [
    0, 4, 5, 0, 5, 3,     // west slope
    1, 2, 5, 1, 5, 4,     // east slope
    0, 1, 4,              // north gable
    3, 5, 2,              // south gable
    0, 3, 2, 0, 2, 1,     // soffit
  ];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  // FLAT shading, via de-indexing. Indexed vertices are shared between the two
  // slopes AND the down-facing soffit, so computeVertexNormals averaged them
  // into normals pointing sideways and down -- every pitched roof in the world
  // shaded as though it faced away from the sun, and the port's sawtooth sheds
  // rendered solid black. A roof is a set of flat planes; it must not be smooth.
  const flat = g.toNonIndexed(); flat.computeVertexNormals();
  return flat;
}

/** Hipped roof: all four sides slope to a short ridge. */
function hipGeometry(THREE) {
  const g = new THREE.BufferGeometry();
  const v = [
    -0.5, 0, -0.5,  0.5, 0, -0.5,  0.5, 0, 0.5,  -0.5, 0, 0.5,
     0.0, 1, -0.22,  0.0, 1, 0.22,
  ];
  const idx = [
    0, 4, 5, 0, 5, 3,
    1, 2, 5, 1, 5, 4,
    0, 1, 4,
    3, 5, 2,
    0, 3, 2, 0, 2, 1,
  ];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed(); flat.computeVertexNormals();   // see prismGeometry
  return flat;
}

/** Half-cylinder lying along z: aircraft hangars, market halls. */
function barrelGeometry(THREE) {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1, false, 0, Math.PI);
  g.rotateZ(-Math.PI / 2); g.rotateY(Math.PI / 2);
  g.translate(0, 0, 0);
  return g;
}

function domeGeometry(THREE) {
  const g = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  return g;
}

// =============================================================================
// TEXTURES — all procedural, so the world has no binary dependencies
// =============================================================================

/**
 * Horizontal storey banding. Without it a box has no scale at ANY size: this
 * one texture is most of the difference between massing and architecture.
 * `bands` is chosen per height tier so a storey stays about 3.5 m whether the
 * building is 30 m or 260 m.
 */
function windowTexture(THREE, renderer, bands) {
  const w = 128, h = 1024, c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
  const step = h / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * step;
    x.fillStyle = "rgba(38,56,76,0.62)";
    x.fillRect(0, y + step * 0.22, w, step * 0.5);
    x.fillStyle = "rgba(255,255,255,0.30)";
    x.fillRect(0, y + step * 0.72, w, step * 0.10);
  }
  for (let i = 0; i < 10; i++) {                 // mullions
    x.fillStyle = "rgba(255,255,255,0.42)";
    x.fillRect(Math.round(i * w / 10), 0, 2, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  // Capped, not maxed. 16x anisotropy is sixteen texel fetches per fragment and
  // every tower face is a grazing angle, so the cost lands exactly where the
  // pixels are. 4x is visually indistinguishable here and roughly 4x cheaper.
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function waterNormalTexture(THREE) {
  const N = 512, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d"), d = g.createImageData(N, N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const v = Math.sin(i * 0.085) * Math.cos(j * 0.062) + Math.sin((i + j) * 0.041) * 0.75 + Math.sin(i * 0.021 - j * 0.017) * 0.5;
    const k = (i * N + j) * 4;
    d.data[k] = 128 + v * 26; d.data[k + 1] = 128 + Math.cos(i * 0.055 + j * 0.03) * 22;
    d.data[k + 2] = 255; d.data[k + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(120, 120);
  return t;
}

/** White at one edge, transparent at the other: the surf ramp across a ribbon. */
function foamTexture(THREE) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0.00, "rgba(255,255,255,0)");
  grd.addColorStop(0.30, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.62, "rgba(255,255,255,0.92)");
  grd.addColorStop(0.86, "rgba(255,255,255,0.35)");
  grd.addColorStop(1.00, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * The world this renderer draws, tied to one seed -- I1.
 *
 * Composes via createWorld() (public/world.js) instead of reimplementing
 * plan/terrain generation a second time here, the exact discipline world.js's
 * own header states and this file's own header claims ("owns no world data
 * of its own"). Returns the same four values buildWorld() has always built
 * inline (field/heightAt/plan/world) -- a data-SOURCE swap, not a behaviour
 * change: for the default seed, every one of them is byte-identical to what
 * the direct `new LandField(16)` / `generateWorld(heightAt)` calls this
 * replaces used to produce (test/cityRenderWorldState.test.ts).
 *
 * `plan` (the downtown-only slice, from generateCityPlan) and `world` (the
 * whole world, from createWorld's own `.plan`) stay two separate values, not
 * one -- this file already relies on that distinction (plan.plots is 1,374
 * downtown entries; world.plots is the whole world, ~20,000) and createWorld
 * only exposes the latter. generateCityPlan(seed) is memoised by seed
 * (A2b), so calling it again here is a cache hit, not a second generation.
 */
/**
 * A set piece's site, or a refusal. Absence read as success used to be the
 * pattern here -- Math.max(<const>, heightAt(x, z)) turns "no ground" into
 * "+<const> m of ground", floating a crane, a clubhouse, a boardwalk span
 * or a stadium over open water. This is the explicit decision that
 * replaced it at every one of the seven sites P3.5.2 named: null means
 * refuse and do not build, a number is real ground to build on.
 *
 * Pure and THREE-free on purpose -- city-render.js's own scene-building
 * functions need a GPU (see test/rendererStatic.test.ts) and cannot run in
 * the node test suite, but the DECISION a site is wet or dry does not need
 * one, so it is extracted here where it can actually be unit-tested.
 */
export function groundOrRefuse(heightAt, x, z) {
  const h = heightAt(x, z);
  return h < DRY_ENOUGH ? null : h;
}

/**
 * P3.6.1/P3.6.2/P3.6.3 -- a rectangular footprint graded in a 2D grid,
 * extracted pure and THREE-free for the same reason groundOrRefuse is:
 * city-render.js's scene-building cannot run in the node test suite, but
 * the grading DECISION does not need a GPU. Shared by the container yard
 * and the golf course -- both carried the identical "single mean over a
 * wide footprint" defect (docs/audits/P3.5-FLOATING.md), and a shared
 * defect gets one fix, not two different ones.
 *
 * A single mean over the container yard's 1,800 x 490 m footprint (what
 * this replaced) put 2,022 of its own rendered instances more than one
 * visible pixel from the real ground beneath them. A 1D strip banded only
 * by depth-from-quay still averaged away a real cross-slope. This is a 2D
 * grid, each cell graded to its own local mean via groundOrRefuse -- a
 * cell with no dry sample point is `null`, refused, not a fabricated
 * number or a borrowed neighbour's (P3.6.2: the previous version fell back
 * to a hardcoded 2 m, absence read as success again, in the same commit
 * that removed seven other instances of exactly that).
 *
 * @param {Function} heightAt
 * @param {{x0:number,x1:number,z0:number,z1:number}} bounds  the footprint to grade
 * @param {{cellX?:number, cellZ?:number}} [opts]
 * @returns {{cols:number, rows:number, x0:number, x1:number, z0:number, z1:number, cellY:(number|null)[], refused:number}}
 */
export function gradeGroundBands(heightAt, bounds, opts = {}) {
  const { cellX = 150, cellZ = 35 } = opts;
  const { x0, x1, z0, z1 } = bounds;
  const cols = Math.max(1, Math.round(Math.abs(x1 - x0) / cellX));
  const rows = Math.max(1, Math.round(Math.abs(z1 - z0) / cellZ));
  const cellY = new Array(cols * rows).fill(null);
  let refused = 0;
  for (let ri = 0; ri < rows; ri++) {
    const bz0 = z0 + ((z1 - z0) * ri) / rows;
    const bz1 = z0 + ((z1 - z0) * (ri + 1)) / rows;
    for (let ci = 0; ci < cols; ci++) {
      const bx0 = x0 + ((x1 - x0) * ci) / cols;
      const bx1 = x0 + ((x1 - x0) * (ci + 1)) / cols;
      let sum = 0, cnt = 0;
      for (const x of [bx0, (bx0 + bx1) / 2, bx1]) {
        for (const z of [bz0, (bz0 + bz1) / 2, bz1]) {
          const g = groundOrRefuse(heightAt, x, z);
          if (g !== null) { sum += g; cnt++; }
        }
      }
      const idx = ri * cols + ci;
      if (cnt) cellY[idx] = sum / cnt;
      else refused++;
    }
  }
  return { cols, rows, x0, x1, z0, z1, cellY, refused };
}

/** Look up a graded band's level at a world point, or null if that cell was refused. */
export function bandLevelAt(bands, x, z) {
  const tx = (x - bands.x0) / (bands.x1 - bands.x0);
  const tz = (z - bands.z0) / (bands.z1 - bands.z0);
  const ci = Math.min(bands.cols - 1, Math.max(0, Math.floor(tx * bands.cols)));
  const ri = Math.min(bands.rows - 1, Math.max(0, Math.floor(tz * bands.rows)));
  return bands.cellY[ri * bands.cols + ci];
}

/**
 * P3.7.1 -- the airport's own embankment already does what P3.5.2/P3.6 asked
 * of the container yard: a real earthwork, not a decal. Extracted so the
 * container yard and the golf course get the SAME mechanism the airport
 * already had, not a third different answer to the same defect.
 *
 * Geometry only -- returns plain vertex arrays, not THREE objects, so this
 * stays testable without a GPU (mirroring gradeGroundBands). The caller
 * builds the actual Mesh with its own material/name.
 *
 * `topAt(x, z)` is the platform's own top level at a point -- a constant
 * function for a single-level platform (the airport, historically) or
 * `(x, z) => bandLevelAt(bands, x, z)` for a terraced one (the yard, the
 * golf course, and the airport once P3.7.2 bands it too). Returns null for
 * an edge segment where either endpoint's topAt is null (a refused cell --
 * no platform there, so no skirt to draw down from).
 *
 * @param {Function} heightAt
 * @param {{x0:number,x1:number,z0:number,z1:number}} bounds
 * @param {Function} topAt  (x:number, z:number) => number|null
 * @param {number} [segments]
 * @returns {Array<{positions:number[]}>} one entry per one of the 4 edges that produced any geometry
 */
export function buildEmbankmentSkirt(heightAt, bounds, topAt, segments = 28) {
  const { x0, x1, z0, z1 } = bounds;
  const edges = [
    { from: [x0, z0], to: [x1, z0] },
    { from: [x0, z1], to: [x1, z1] },
    { from: [x0, z0], to: [x0, z1] },
    { from: [x1, z0], to: [x1, z1] },
  ];
  const out = [];
  for (const e of edges) {
    const v = [];
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments, t1 = (i + 1) / segments;
      const ex0 = e.from[0] + (e.to[0] - e.from[0]) * t0, ez0 = e.from[1] + (e.to[1] - e.from[1]) * t0;
      const ex1 = e.from[0] + (e.to[0] - e.from[0]) * t1, ez1 = e.from[1] + (e.to[1] - e.from[1]) * t1;
      const top0 = topAt(ex0, ez0), top1 = topAt(ex1, ez1);
      if (top0 === null || top1 === null) continue; // a refused cell has no platform here to skirt
      const bot0 = Math.min(top0, heightAt(ex0, ez0)) - 0.4;
      const bot1 = Math.min(top1, heightAt(ex1, ez1)) - 0.4;
      // Two triangles, DoubleSide relied on by the caller rather than a
      // winding fixed per-edge -- see the airport's own original comment on
      // why (the four edges' windings are not uniform under a shared `along`
      // parameterisation, and fixing that by hand invites it to regress).
      v.push(ex0, top0, ez0, ex1, top1, ez1, ex0, bot0, ez0);
      v.push(ex1, top1, ez1, ex1, bot1, ez1, ex0, bot0, ez0);
    }
    if (v.length) out.push({ positions: v });
  }
  return out;
}

/**
 * The graded platform itself: one flat quad per non-refused band cell, at
 * that cell's own level -- a terraced pad, not one infinite plane, which is
 * what "graded rather than sampled" actually looks like as geometry.
 * @param {ReturnType<typeof gradeGroundBands>} bands
 * @returns {Array<{x0:number,x1:number,z0:number,z1:number,y:number}>}
 */
export function platformCells(bands) {
  const out = [];
  for (let ri = 0; ri < bands.rows; ri++) {
    for (let ci = 0; ci < bands.cols; ci++) {
      const y = bands.cellY[ri * bands.cols + ci];
      if (y === null) continue;
      out.push({
        x0: bands.x0 + ((bands.x1 - bands.x0) * ci) / bands.cols,
        x1: bands.x0 + ((bands.x1 - bands.x0) * (ci + 1)) / bands.cols,
        z0: bands.z0 + ((bands.z1 - bands.z0) * ri) / bands.rows,
        z1: bands.z0 + ((bands.z1 - bands.z0) * (ri + 1)) / bands.rows,
        y,
      });
    }
  }
  return out;
}

/**
 * The same terraced platform as platformCells, but as ONE flat vertex
 * array instead of one descriptor per cell -- found necessary the first
 * time this landed: a Mesh per cell (140 for the container yard, ~100 for
 * the golf course) pushed the downtown skyline draw-call count from under
 * 900 to 1,123, tripping test/regressionGate.test.ts's own A5.2/A5.3 gate.
 * One merged BufferGeometry, one Mesh, the same pattern city-render.js
 * already uses for terrain tiles and bridge spans.
 * @param {ReturnType<typeof gradeGroundBands>} bands
 * @returns {number[]} flat [x,y,z, x,y,z, ...] triangle list
 */
export function mergedPlatformGeometry(bands) {
  const v = [];
  for (const cell of platformCells(bands)) {
    const { x0, x1, z0, z1, y } = cell;
    v.push(x0, y, z0, x1, y, z0, x1, y, z1);
    v.push(x1, y, z1, x0, y, z1, x0, y, z0);
  }
  return v;
}

export function buildWorldState(seed = DEFAULT_SEED, layers = []) {
  const instance = createWorld({ seed, layers });
  const field = instance.land;
  const heightAt = makeHeightAt(field);
  const plan = generateCityPlan(seed);
  const world = instance.plan;
  return { instance, field, heightAt, plan, world };
}

/**
 * Which placements still share an instance group, and which a layer has
 * pulled out to draw on their own -- I2.
 *
 * Pure (no THREE): this is the ONLY place city-render.js decides which
 * placements go where, so it is the one thing about "layers reach the
 * scene" that can be proven without a renderer. Runs apply-layers.js
 * (public/apply-layers.js) between planCity and instance-groups.js
 * (public/instance-groups.js), exactly the order Phase B/C proved in
 * isolation and nothing had run for real until now.
 *
 * `instance` must be the FULL createWorld() object (`.layers`/`.resolve`),
 * not `world` (`instance.plan`, plain data) -- apply-layers.js's own
 * contract needs both of those methods.
 */
export function buildScenePlacements({ instance, world, heightAt }) {
  const footByPlot = new Map();
  const verdictForPlot = (p) => {
    const foot = assessFootprint(heightAt, p.buildable, waterwayAt);
    footByPlot.set(p.id, foot);
    return foot.verdict;
  };
  const plan2 = planCity(world.blocks, world.plots, verdictForPlot, makeFits());
  const withLayers = applyLayers(plan2.placements, instance);
  const { instanced, overridden } = partitionForInstancing(withLayers);
  return { instanced, overridden, refusals: plan2.refusals, footByPlot };
}

// =============================================================================
// BUILD
// =============================================================================
export function buildWorld(THREE, renderer, scene, layers = []) {
  const t0 = performance.now();
  const stats = {};
  // Set pieces (cranes, marina buildings/boats, boardwalk spans, landmarks)
  // that land on water: refused here, not floated on a Math.max floor. One
  // shared list so every site records the same way.
  stats.setPieceRefused = [];

  if (!THREE.LOD.prototype._urbanOcclusionInstalled) {
    THREE.LOD.prototype._urbanOcclusionInstalled = true;
    const _v1 = new THREE.Vector3();
    const _v2 = new THREE.Vector3();

    THREE.LOD.prototype.update = function (camera) {
      const levels = this.levels;
      if (levels.length > 1) {
        _v1.setFromMatrixPosition(camera.matrixWorld);
        _v2.setFromMatrixPosition(this.matrixWorld);

        let distance = _v1.distanceTo(_v2) / camera.zoom;

        // Urban canyon occlusion model:
        // When camera is near street/ground level (camY < 60m), horizontal line of sight
        // through dense urban fabric is occluded by building walls within 500-800m.
        // For ground-level fabric (low-rise buildings, roads, ground vegetation),
        // we scale the effective distance when camera.position.y is at street level,
        // while preserving true Euclidean distance for aerial/skyline viewpoints (camY > 100m)
        // and for tall towers/landmarks whose crowns rise above the urban canyon.
        if (this.isGroundFabric && _v1.y < 300) {
          const canyonFactor = 1 + (300 - Math.max(0, _v1.y)) / 35;
          distance *= canyonFactor;
        }

        levels[0].object.visible = true;
        let i, l;
        for (i = 1, l = levels.length; i < l; i++) {
          let levelDistance = levels[i].distance;
          if (levels[i].hysteresis > 0 && levels[i].object.visible) {
            levelDistance -= levelDistance * levels[i].hysteresis;
          }
          if (distance >= levelDistance) {
            levels[i - 1].object.visible = false;
            levels[i].object.visible = true;
          } else {
            break;
          }
        }
        for (; i < l; i++) {
          levels[i].object.visible = false;
        }
      }
    };
  }

  // ?skip=trees,props — a bisect handle. Worth keeping: when a scene this size
  // misbehaves, being able to remove one subsystem at a time is the difference
  // between a diagnosis and a guess.
  const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
  const isNight = Boolean(params && (params.get("night") === "1" || params.get("tod") === "night"));
  const SKIP = new Set((params ? params.get("skip") || "" : "").split(","));
  // ?seed=<name> -- I1: the renderer now builds a world instance instead of
  // the bare module-default plan/terrain, so which seed it builds is a real
  // question with a real answer instead of always DEFAULT_SEED.
  const seed = (params && params.get("seed")) || DEFAULT_SEED;
  const CHUNK_SIZE = params && params.get("chunkSize") ? parseFloat(params.get("chunkSize")) : (LOOK.chunkSize || 4000);
  const useChunking = Number.isFinite(CHUNK_SIZE) && CHUNK_SIZE > 0;
  const useLod = !(params && (params.get("lod") === "0" || params.get("cull") === "0" || params.get("culling") === "0" || params.get("nolod") === "1"));
  const useFrustumCulling = !(params && (params.get("frustumCull") === "0" || params.get("cull") === "0" || params.get("culling") === "0"));
  // `layers` is a 4th, optional argument, last, defaulting to `[]` -- every
  // existing call site (city.html, world-render-3d.js's WorldRenderer) still
  // means exactly what it meant before I2. Nothing today passes one; I6 is
  // where a live, persisted layer stack reaches this argument for real.

  const { instance, field, heightAt, plan, world } = buildWorldState(seed, layers);
  const masses = landmassPolygons(16);

  // --- settlement lookup, used for urban ground tint and centrality ---
  //
  // DERIVED FROM THE PLOTS, BECAUSE THE TABLE DESCRIBED A CITY THAT MOVED.
  //
  // This was a hardcoded `downtown` rectangle plus SETTLEMENTS.map(). Both parts
  // were wrong, and each was wrong in a way the other hid:
  //
  //   * The downtown literal was { z: -720..575 }. Measured from the plots that
  //     actually carry settlement === "downtown": z 629..2547. The ranges do not
  //     OVERLAP -- the literal ends 54 m before the real downtown begins. So
  //     settAt() returned null for every downtown plot (no urban ground tint, no
  //     street furniture anywhere in the city centre), and the centrality curve
  //     was measured from a circle 1.6 km away. 80 of the world's 82 TOWER plots
  //     are downtown, and every one of them was height-scaled to ~46% -- the
  //     floor value, i.e. the number for "outside the settlement entirely."
  //     The comment on that curve says "tallest at a settlement's centre... a
  //     peak with shoulders is a city." That was not happening.
  //
  //   * SETTLEMENTS is 26 entries. The world has 54 settlements with plots in
  //     them, because fitSettlements grows the beach strips at generation time.
  //     The 28 missing ones hold 10,282 plots -- 53% of the world, the entire
  //     ocean frontage. For all of them SETT.find() missed, `central` stayed at
  //     its initialiser of 1 (no taper at all, every plot at full height), and
  //     the barrier-island planting pass, which skips ground inside a
  //     settlement, planted palms through beachfront buildings.
  //
  // Aggregating the plots is O(n) once and cannot drift: a settlement's extent
  // IS the extent of its plots. There is no table left to go stale.
  const SETT_BY_ID = new Map();
  for (const p of world.plots) {
    const id = p.settlement;
    if (!id) continue;
    let e = SETT_BY_ID.get(id);
    if (!e) SETT_BY_ID.set(id, (e = { id, b: { xMin: Infinity, xMax: -Infinity, zMin: Infinity, zMax: -Infinity } }));
    if (p.xMin < e.b.xMin) e.b.xMin = p.xMin;
    if (p.xMax > e.b.xMax) e.b.xMax = p.xMax;
    if (p.zMin < e.b.zMin) e.b.zMin = p.zMin;
    if (p.zMax > e.b.zMax) e.b.zMax = p.zMax;
  }
  const SETT = [...SETT_BY_ID.values()];
  for (const s of SETT) {
    s.cx = (s.b.xMin + s.b.xMax) / 2;
    s.cz = (s.b.zMin + s.b.zMax) / 2;
    s.r = Math.max(s.b.xMax - s.b.xMin, s.b.zMax - s.b.zMin) / 2;
  }
  stats.settlementsTracked = SETT.length;

  // A UNIFORM GRID OVER THE SETTLEMENTS, because settAt() was a linear scan of
  // the whole list run once per plot -- 19,481 times over 54 entries, and it
  // MISSED on the 10,282 that were absent, so those paid the full scan every
  // time to be told nothing.
  const SCELL = 500;
  const settGrid = new Map();
  const skey = (cx, cz) => cx * 4096 + cz;
  for (const s of SETT) {
    for (let cx = Math.floor(s.b.xMin / SCELL); cx <= Math.floor(s.b.xMax / SCELL); cx++) {
      for (let cz = Math.floor(s.b.zMin / SCELL); cz <= Math.floor(s.b.zMax / SCELL); cz++) {
        const k = skey(cx, cz);
        let bucket = settGrid.get(k);
        if (!bucket) settGrid.set(k, (bucket = []));
        bucket.push(s);
      }
    }
  }
  const settAt = (x, z) => {
    const bucket = settGrid.get(skey(Math.floor(x / SCELL), Math.floor(z / SCELL)));
    if (!bucket) return null;
    for (const s of bucket) {
      if (x >= s.b.xMin && x <= s.b.xMax && z >= s.b.zMin && z <= s.b.zMax) return s;
    }
    return null;
  };


  // ---------------------------------------------------------------------------
  // SKY, SUN, ATMOSPHERE
  //
  // Aerial perspective is the single biggest difference between a render that
  // looks like a model and one that looks like a landscape: distance has to cost
  // contrast and saturation. Exponential-squared fog matched to the horizon does
  // it, tuned so a 3 km city is untouched and a 15 km mountain is half sky.
  // ---------------------------------------------------------------------------
  const sky = new Sky();
  sky.name = "env:sky-dome";
  sky.scale.setScalar(WORLD.HORIZON * 6);
  const su = sky.material.uniforms;
  su.turbidity.value = isNight ? 10.0 : 1.45;
  su.rayleigh.value = isNight ? 0.05 : 0.88;
  su.mieCoefficient.value = isNight ? 0.0005 : 0.0022;   // the sun disc glow: at 0.0042 it blew a hole in every view it appeared in
  su.mieDirectionalG.value = 0.82;
  const phi = THREE.MathUtils.degToRad(90 - LOOK.sunElevation);
  const theta = THREE.MathUtils.degToRad(LOOK.sunAzimuth);
  const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  su.sunPosition.value.copy(sunPos);
  scene.add(sky);

  scene.fog = new THREE.FogExp2(isNight ? 0x080e18 : LOOK.fogColor, isNight ? LOOK.fogDensity * 1.4 : LOOK.fogDensity);

  // THE SKY GETS CLOUDS, STARS AND A MOON, AND IT IS BUILT HERE.
  //
  // It was first written into world-render-3d.js, next to the day/night code
  // that drives it. That is the wrong file and the render proved it: city.html
  // never constructs WorldRenderer, so scripts/shoot.mjs -- the only way to
  // photograph this world -- could not see any of it. The identical trap had
  // already cost a long detour on the pivot marker.
  //
  // The atmosphere belongs with the sun and the fog. Built here, both pages get
  // it and it can be verified with a screenshot.
  const citySky = createCitySky(THREE, scene);
  // Daytime defaults at construction, so a bare render that never ticks the
  // day/night loop still shows a sky rather than an empty one.
  citySky.update(sunPos, isNight ? 1.0 : 0.0, 0, null);

  // Environment map from the sky itself, so glass and water reflect the actual
  // sky rather than a grey studio.
  // ---------------------------------------------------------------------------
  // ENVIRONMENT
  //
  // A small equirectangular sky painted to a canvas, convolved by PMREM. It
  // replaces a PMREM capture OF THE SKY OBJECT, which silently baked a BLACK
  // environment map: PMREMGenerator renders with a near/far of 0.1..100 and the
  // sky sphere is scaled past the far plane, so the capture saw nothing. three.js
  // then multiplied that black map into every material -- including
  // MeshBasicMaterial, which does use scene.environment -- and the entire world
  // rendered as an unlit silhouette while every light, colour and normal in the
  // scene was correct. It cost hours, so there is now a guard below.
  // ---------------------------------------------------------------------------
  function skyEquirect() {
    const w = 256, h = 128, c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0.00, "#2f79b8");     // zenith
    grd.addColorStop(0.34, "#79b2dc");
    grd.addColorStop(0.49, "#cfe2ee");     // horizon haze
    grd.addColorStop(0.51, "#a89f8a");     // just below the horizon: land haze
    grd.addColorStop(1.00, "#6d6a54");     // ground bounce
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // a soft sun disc, so glass and water have something to catch
    const sx = ((LOOK.sunAzimuth / 360) % 1) * w;
    const sy = (0.5 - LOOK.sunElevation / 180) * h;
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.10);
    sg.addColorStop(0, "rgba(255,248,225,1)");
    sg.addColorStop(1, "rgba(255,248,225,0)");
    g.fillStyle = sg; g.fillRect(sx - w * 0.1, sy - w * 0.1, w * 0.2, w * 0.2);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
/**
 * Average luminance of one texel of a render target, whatever its type.
 *
 * The caller needs one question answered -- "does this environment map carry
 * any light" -- and the only reason this is more than four lines is that
 * gl.readPixels demands a typed-array view matching the texture's type, and a
 * PMREM target is half-float.
 */
function readTargetLuminance(THREE, renderer, rt) {
  const type = rt.texture && rt.texture.type;

  if (type === THREE.HalfFloatType) {
    const buf = new Uint16Array(4);
    renderer.readRenderTargetPixels(rt, 4, 4, 1, 1, buf);
    return half(buf[0]) + half(buf[1]) + half(buf[2]);
  }
  if (type === THREE.FloatType) {
    const buf = new Float32Array(4);
    renderer.readRenderTargetPixels(rt, 4, 4, 1, 1, buf);
    return buf[0] + buf[1] + buf[2];
  }
  const buf = new Uint8Array(4);
  renderer.readRenderTargetPixels(rt, 4, 4, 1, 1, buf);
  return (buf[0] + buf[1] + buf[2]) / 255;
}

/** IEEE 754 half-precision to a JS number. */
function half(h) {
  const s = (h & 0x8000) >> 15, e = (h & 0x7c00) >> 10, f = h & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 0x1f) return f ? NaN : (s ? -Infinity : Infinity);
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

  if (!SKIP.has("env")) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();

      const applyEnv = (srcTexture, isHdr = false) => {
        try {
          const rt = pmrem.fromEquirectangular(srcTexture);
          let ok = true;
          try {
            const lum = readTargetLuminance(THREE, renderer, rt);
            ok = Number.isFinite(lum) && lum > 0.02;
            stats.envLuminance = Number.isFinite(lum) ? +lum.toFixed(4) : "NaN";
          } catch (e) {
            stats.envReadback = "unsupported";
            ok = true; // Still apply if readback is unsupported
          }
          if (ok) {
            scene.environment = rt.texture;
            scene.environmentIntensity = isNight ? 0.18 : (isHdr ? 0.95 : 0.6);
            stats.envSource = isHdr ? "hdri" : "canvas";
          } else {
            rt.dispose();
          }
        } catch (err) {
          stats.envError = String(err && err.message).slice(0, 80);
        } finally {
          srcTexture.dispose();
        }
      };

      // 1. Synchronous fallback canvas environment
      const canvasSrc = skyEquirect();
      applyEnv(canvasSrc, false);

      // 2. Real Poly Haven HDRI (vendored)
      stats.hdrLoading = true;
      const hdrLoader = new HDRLoader();
      hdrLoader.load("./vendor/hdri/kloofendal_48d_partly_cloudy_1k.hdr", (hdrTex) => {
        applyEnv(hdrTex, true);
        stats.hdrLoading = false;
        stats.hdrLoaded = true;
        pmrem.dispose();
      }, undefined, (err) => {
        stats.hdrLoading = false;
        stats.hdrError = String(err && err.message).slice(0, 80);
        pmrem.dispose();
        console.warn("HDRI load deferred/fallback:", err);
      });
    } catch (e) {
      stats.envError = String(e && e.message).slice(0, 80);
    }
  }

  const sun = new THREE.DirectionalLight(isNight ? 0x88aacc : 0xfff0d0, isNight ? 0.25 : 3.5);
  sun.position.copy(sunPos).multiplyScalar(6000);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 1.6;
  const SH = wm(2600);
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 100, far: 16000 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  // A cool fill from the opposite side. One sun crushes every shaded face to
  // near-black, which is what makes a render look heavy and lifeless.
  const fill = new THREE.DirectionalLight(isNight ? 0x334466 : 0x8fb8e4, isNight ? 0.1 : 0.42);
  fill.position.set(-sunPos.x * 4000, 2200, -sunPos.z * 4000);
  scene.add(fill);
  // Ambient was carrying too much of the image. A sun of 3.1 against 1.34 of
  // ambient fill leaves almost no difference between a lit face and a shaded
  // one, which is what made the city look flat and chalky no matter what the
  // palette did.
  scene.add(new THREE.HemisphereLight(isNight ? 0x182436 : 0xcfe6ff, isNight ? 0x080c14 : 0x6a6752, isNight ? 0.2 : 0.48));

  // ---------------------------------------------------------------------------
  // TERRAIN
  //
  // Two resolutions: 32.5 m over the modelled core and 162.5 m for the rest of the
  // (the comment said 40 and 200 -- those are the DESIGN-space values; the steps
  // are wm()-scaled, so what the mesh actually uses is k times each)
  // 40 km, with a hole in the coarse grid so they do not overlap. The core grid
  // carries a downward skirt at its border, which hides the hairline crack a
  // resolution change always leaves.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // THE GROUND IS A SOLID, NOT A SHEET
  //
  // Until now the world was `heightAt(x, z) -> y`: one number per column, drawn
  // as a single surface with nothing behind it. The OUTER mesh was built with
  // `skirtDepth = 0`, so over most of the modelled area the land had no underside
  // at all -- and a flat plane at y = -175 was added to stop you seeing sky
  // through the ocean where the grid ended. That plane is the tell. It is a lid
  // over an absence.
  //
  // A sheet cannot be cut into, cannot have a cliff face with a body behind it,
  // and reads as a map rather than a place from any angle but straight down. The
  // road batters added earlier drop from the carriageway to the surface -- and
  // the surface was the only thing there, so a cutting had nothing to cut INTO.
  //
  // BEDROCK_Y is where the solid stops. It matches the abyss plane so the two
  // meet: the terrain's walls run from its edge down to the ocean floor, and the
  // world closes itself instead of being closed for it.
  const BEDROCK_Y = -175;


  /**
   * What you see in a cut face, by depth below the local surface.
   *
   * This is the difference between "a solid" and "the earth". A cliff, a road
   * cutting, a quarry and the world's own edge all show the same layers in the
   * same order, so the ground reads as something that was there before the city
   * was -- which is exactly what a heightfield cannot express.
   *
   * Depths are shallow on purpose: at 26 km across, a 2 m topsoil band is
   * sub-pixel from the air and clearly legible from a street. The point is that
   * it is CORRECT when you get close, not that it is visible from orbit.
   */
  const STRATA = [
    { to: 2,    color: 0x6b5a41 },   // topsoil -- dark, organic
    { to: 8,    color: 0x8a7355 },   // subsoil
    { to: 25,   color: 0xa08a63 },   // clay and gravel
    { to: 70,   color: 0x8b8378 },   // weathered rock -- the same grey as a sea cliff
    { to: Infinity, color: 0x5f5a55 }, // bedrock
  ];
  const _strataColor = new THREE.Color();
  function strataAt(depth) {
    for (const layer of STRATA) {
      if (depth <= layer.to) return _strataColor.setHex(layer.color);
    }
    return _strataColor.setHex(STRATA[STRATA.length - 1].color);
  }

  // ===========================================================================
  // THE COASTLINE IS DECIDED PER PIXEL, NOT PER VERTEX
  //
  // Mark: "the edges of them get blurred or change to something else, like land
  // to water." The depth-buffer fix stopped the sea DRAWING OVER the land. This
  // is the other half, and it is a sampling problem.
  //
  // The whole beach lives in a 3.8 m window of height: the tide strip ends at
  // -0.6, dry sand at +1.6, dune grass at +3.2 (design metres). The outer
  // terrain mesh samples every 162.5 m. On any ordinary coastal slope no vertex
  // ever LANDS in that window -- consecutive samples come out at something like
  // -20 m and +25 m -- so bandColor is asked for the shelf blue and the coastal
  // green and never once for sand. The GPU then interpolates between those two
  // across the whole triangle. That is the blur: not a soft edge, but a beach
  // that was never sampled, replaced by a 162 m gradient from sea colour to
  // grass colour. It moves as the camera moves because which vertices get
  // sampled changes.
  //
  // Evaluating the band table against the INTERPOLATED height, in the fragment
  // shader, puts the beach exactly where the surface actually crosses sea level
  // at whatever resolution the screen has -- independent of vertex spacing.
  //
  // THE TABLE IS NOT RETYPED IN GLSL. It is compiled from the same exported
  // GROUND_BANDS the CPU path uses, because a colour table maintained in two
  // languages is a drift defect with a delay fuse, and this file has already
  // paid for that lesson more than once.
  //
  // Sequential mixes are EXACTLY equivalent to bandColor's find-the-band-then-
  // blend: below a band's window its t is 0 and the mix is a no-op, above it t
  // is 1 and the colour is replaced outright, so applying every band in order
  // lands on the same value the loop would have returned.
  const SHORE_GLSL = (() => {
    const hex = (c) => `vec3(${(((c >> 16) & 255) / 255).toFixed(4)},${(((c >> 8) & 255) / 255).toFixed(4)},${((c & 255) / 255).toFixed(4)})`;
    let body = `  vec3 c = ${hex(GROUND_BANDS[0].color)};\n`;
    for (let i = 1; i < GROUND_BANDS.length; i++) {
      const lo = GROUND_BANDS[i - 1], hi = GROUND_BANDS[i];
      const span = (hi.upTo - lo.upTo) * 0.75;
      body += `  { float t = clamp((h - ${lo.upTo.toFixed(4)}) / ${span.toFixed(6)}, 0.0, 1.0);\n` +
              `    c = mix(c, ${hex(hi.color)}, t * t * (3.0 - 2.0 * t)); }\n`;
    }
    return `vec3 caliperBand(float h) {\n${body}  return c;\n}\n`;
  })();

  // How much of the per-fragment answer to trust, by height. Full authority at
  // the waterline, handing back to the vertex colour well before the bands stop
  // mattering, so there is no seam where the two meet. In WORLD metres, since
  // GROUND_BANDS is already the world-scaled table.
  const SHORE_BAND_M = wm(6);
  const SHORE_FADE_M = wm(14);

  /**
   * Teach a terrain material to resolve its own shoreline.
   *
   * Stock MeshStandardMaterial, patched at compile time rather than replaced by
   * a ShaderMaterial, so it keeps three.js's lighting, shadows, tone mapping and
   * -- importantly, given the depth work -- the logarithmic depth chunks.
   */
  function withPerPixelShoreline(material) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
attribute vec3 aMod;
attribute float aShoreOK;
varying vec3 vMod;
varying float vShoreOK;
varying float vGroundH;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
vMod = aMod;
vShoreOK = aShoreOK;
vGroundH = (modelMatrix * vec4(position, 1.0)).y;`);

      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
varying vec3 vMod;
varying float vShoreOK;
varying float vGroundH;
${SHORE_GLSL}`)
        // AFTER color_fragment, not before: that chunk is what multiplies the
        // vertex colour in, so replacing the result here is replacing the thing
        // that is actually wrong.
        .replace("#include <color_fragment>", `#include <color_fragment>
{
  float w = (1.0 - smoothstep(${SHORE_BAND_M.toFixed(3)}, ${SHORE_FADE_M.toFixed(3)}, abs(vGroundH))) * vShoreOK;
  diffuseColor.rgb = mix(diffuseColor.rgb, caliperBand(vGroundH) * vMod, w);
}`);
    };
    return material;
  }

  // ===========================================================================
  // THE SEA KNOWS HOW DEEP IT IS
  //
  // Mark: "the water [should] lap up on the beach like real waves ... and
  // provide a depth and base to the ocean and other waterways like in real
  // life." The base already exists -- the sea bed is the terrain surface
  // continuing below zero, walled to bedrock and floored by the abyss plane, so
  // the ocean genuinely sits in a basin. What was missing is that the WATER had
  // no idea any of that was there.
  //
  // It was one flat PlaneGeometry, four worlds wide, with a constant opacity of
  // 0.62 and a tiled normal map. A single sheet of blue laid over everything.
  // It could not shallow toward a beach, could not clear over sand, and could
  // not put foam on a shoreline, because nothing in it knew where the shoreline
  // was. The precomputed surf ribbon below is the workaround for that, and it
  // is geometry offset from a polygon -- resolution-bound in exactly the way
  // the vertex-coloured beach was.
  //
  // So the sea gets the height field as a texture and reads its own depth per
  // pixel, which is the same move that fixed the beach.
  //
  // WHY 512, AND WHY LATE. Measured on this machine: 256^2 costs 276 ms for
  // 152 m texels, 512^2 costs 477 ms for 76 m, 1024^2 costs 1786 ms for 38 m.
  // 512 is the first resolution FINER THAN THE LAND under it -- the outer
  // terrain mesh steps 162 m -- so the water is never the coarser of the two.
  // But 477 ms is a fifth of a generateWorld that earlier work deliberately cut
  // from 6.02 s to 2.36 s, and paying that before first paint would give back a
  // meaningful part of that win for something nobody sees in the first frame.
  // So the bake is deferred: the sea starts as it always did and gains its
  // depth response a beat later, off the critical path.
  const WATER_TEX = 512;
  function giveWaterItsDepth(seaMesh) {
    const x0 = wm(-30000), x1 = wm(30000), z0 = wm(-33000), z1 = wm(10000);
    // One texel of "deep everywhere" until the real bake lands, so the shader is
    // valid from the first frame and the swap is invisible.
    const placeholder = new THREE.DataTexture(new Float32Array([-1000]), 1, 1, THREE.RedFormat, THREE.FloatType);
    placeholder.needsUpdate = true;

    const uniforms = {
      uDepthMap: { value: placeholder },
      // x0, z0 and the reciprocal spans, so the shader does two multiplies
      // rather than two divides per fragment.
      uExtent: { value: new THREE.Vector4(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0)) },
      uTime: { value: 0 },
      uSeaLevel: { value: LOOK.seaLevel },
    };

    seaMesh.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
varying vec3 vSeaWorld;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
vSeaWorld = (modelMatrix * vec4(position, 1.0)).xyz;`);

      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
uniform sampler2D uDepthMap;
uniform vec4 uExtent;
uniform float uTime;
uniform float uSeaLevel;
varying vec3 vSeaWorld;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
{
  vec2 uv = vec2((vSeaWorld.x - uExtent.x) * uExtent.z, (vSeaWorld.z - uExtent.y) * uExtent.w);
  // Outside the modelled world there is no sea bed, and clamping the sample
  // would smear the edge texel across the open ocean. Treat it as deep water
  // instead, which is what it is.
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float bed = mix(-1000.0, texture2D(uDepthMap, uv).r, inside);
  float depth = max(0.0, uSeaLevel - bed);

  // Shallow water is not thinner blue, it is a different colour: sand and
  // turquoise from below, less of the deep column above. Both cues, together,
  // are what makes depth read at all.
  float shallow = 1.0 - smoothstep(0.0, ${wm(14).toFixed(2)}, depth);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.78, 0.74), shallow * 0.55);
  diffuseColor.a = mix(diffuseColor.a, 0.12, shallow * shallow);

  // THE WAVES. A foam band that sits on the true waterline at whatever
  // resolution the screen has, and breathes in and out across it the way a
  // tide line does -- so the edge of the water moves against the sand instead
  // of the sand ending at a fixed painted line.
  float swash = ${wm(3.0).toFixed(3)} * (0.55 + 0.45 * sin(uTime * 0.6 + vSeaWorld.x * ${(0.9 / wm(100)).toFixed(6)} + vSeaWorld.z * ${(0.7 / wm(100)).toFixed(6)}));
  float foam = (1.0 - smoothstep(0.0, swash, depth)) * inside;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 0.97), foam * 0.85);
  diffuseColor.a = max(diffuseColor.a, foam * 0.8);
}`);
    };
    seaMesh.material.needsUpdate = true;
    seaMesh.onBeforeRender = () => { uniforms.uTime.value = performance.now() * 0.001; };

    // SLICED, BECAUSE DEFERRING A STALL IS NOT REMOVING IT.
    //
    // Measured in the headless renderer: baking all 262,144 samples in one go
    // took generateWorld from 5,568 ms to 8,156 ms -- 2.6 s, against the 477 ms
    // the same loop costs in plain Node. Moving that off the critical path stops
    // it delaying first paint, but a 2.6 s block is still 2.6 s of frozen page,
    // just later, where it reads as the world hanging for no reason. Rows are
    // cheap to resume, so it goes 32 at a time and the browser keeps the frame.
    const data = new Float32Array(WATER_TEX * WATER_TEX);
    const ROWS_PER_SLICE = 32;
    let row = 0;
    const bakeSlice = () => {
      const end = Math.min(WATER_TEX, row + ROWS_PER_SLICE);
      for (; row < end; row++) {
        const z = z0 + (z1 - z0) * (row / (WATER_TEX - 1));
        for (let i = 0; i < WATER_TEX; i++) {
          data[row * WATER_TEX + i] = heightAt(x0 + (x1 - x0) * (i / (WATER_TEX - 1)), z);
        }
      }
      if (row < WATER_TEX) return schedule();
      const tex = new THREE.DataTexture(data, WATER_TEX, WATER_TEX, THREE.RedFormat, THREE.FloatType);
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      uniforms.uDepthMap.value = tex;
      placeholder.dispose();
    };
    // requestIdleCallback is not universal, so a timeout backs it up. A depth
    // map that never arrives is a flat sea, not a broken one, which is the right
    // way for this to fail.
    function schedule() {
      if (typeof requestIdleCallback === "function") requestIdleCallback(bakeSlice, { timeout: 200 });
      else setTimeout(bakeSlice, 0);
    }
    schedule();
  }

  function terrainMesh(x0, x1, z0, z1, step, hole, skirtDepth, casts = true, targetParent = scene) {
    const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
    const W = nx + 1, H = nz + 1;
    const hs = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) hs[j * W + i] = heightAt(x0 + i * step, z0 + j * step);

    const pos = new Float32Array(W * H * 3);
    const col = new Float32Array(W * H * 3);
    // The two things the fragment shader needs in order to redo the shoreline
    // itself: the noise multipliers that were folded into the vertex colour
    // (so a per-pixel beach carries the same grain as the ground around it and
    // does not read as a flat painted stripe), and whether this vertex is
    // allowed to be beach at all. Cliffed shore is rock and built ground is
    // built, at any resolution -- those are decided from data the CPU has and
    // the shader does not.
    const mod = new Float32Array(W * H * 3);
    const shoreOK = new Float32Array(W * H);
    const c = new THREE.Color();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, x = x0 + i * step, z = z0 + j * step, h = hs[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      const hx = hs[j * W + Math.min(W - 1, i + 1)] - hs[j * W + Math.max(0, i - 1)];
      const hz = hs[Math.min(H - 1, j + 1) * W + i] - hs[Math.max(0, j - 1) * W + i];
      const slope = Math.hypot(hx, hz) / (2 * step);
      c.setHex(groundColor(h, slope));
      // A sea cliff is bare rock whether or not the mesh happens to resolve the
      // slope: the shore profile already knows this stretch is cliffed, so use
      // that rather than inferring it from a gradient the grid may have smoothed.
      let cliffAmt = 0;
      if (h > 0 && h < 110) {
        const cf = cliffiness(x, z);
        if (cf > 0.35) {
          cliffAmt = Math.min(0.8, (cf - 0.35) * 1.7);
          c.lerp(new THREE.Color(0x8b8378), cliffAmt);
        }
      }
      // built ground reads as ground, not lawn
      const s = h > 0 ? settAt(x, z) : null;
      if (s) c.lerp(new THREE.Color(0xc3b9a6), 0.5);
      // Sand is refused wherever the CPU already knows better. These are the
      // SAME judgements the vertex colour above just made, expressed as a weight
      // rather than a blend -- so the shader cannot paint a beach onto a sea
      // cliff or through a waterfront street.
      //
      // A BEACH HAS A WIDTH. THIS ONE HAD ONLY A HEIGHT.
      //
      // Mark, on the deployed build: "on the front edge of the main island there
      // is a weird sand bar ... it just isn't done well."
      //
      // The per-pixel shoreline decides sand from HEIGHT alone -- a 3.8 m window
      // from the tide strip at -0.6 to dune grass at +3.2. On a steep shore that
      // window is crossed in twenty metres and the beach looks like a beach. On
      // the near-flat shelf at the island's front it takes hundreds of metres to
      // climb 3.8 m, so the same rule paints sand across the whole shelf. That
      // flat pale sheet with a hard outer edge is not a landform the generator
      // decided to put there; it is the beach rule with nothing bounding it.
      //
      // Real beaches are tens of metres wide, not hundreds -- the width is set by
      // wave run-up and tide range, not by how slowly the land happens to rise.
      // field.signed() already returns distance to the coastline (heightAt uses
      // it for the shore ramp), so the bound costs one call already being made
      // elsewhere and needs no new data.
      //
      // beachWeight lives in terrain.js with the rest of the shore rules, and it
      // takes a DISTANCE rather than a coordinate so it can be tested without
      // building a world -- see test/beachWidth.test.ts. It was inline here
      // first, which meant the only way to check it was to render.
      //
      // toDesign(), because beachWeight's thresholds are BUILT metres -- 70 m of
      // sand is 70 m of sand in any size of world -- while field.signed returns
      // world metres. Converting the distance is the same direction the manifest
      // props already go and keeps one set of numbers rather than two.
      const beachW = beachWeight(toDesign(Math.abs(field.signed(x, z).d)));
      shoreOK[k] = (1 - cliffAmt) * (s ? 0 : 1) * beachW;
      // Two scales of variation. One fine (soil, mown grass, scrub) and one
      // broad, so a ten-kilometre hillside is not one flat green: real land
      // reads as patches of pasture, woodland and bare ground at 500 m across.
      const n = (0.82 + fbm(x, z, 240, 2) * 0.36) * (0.84 + fbm(x + 9000, z - 4000, 1500, 3) * 0.34);
      const warm = 0.90 + fbm(x - 3000, z + 6000, 2800, 2) * 0.22;
      col[k * 3] = c.r * n * warm;
      col[k * 3 + 1] = c.g * n;
      col[k * 3 + 2] = c.b * n * (1.94 - warm);
      // The multipliers on their own, so the fragment can apply the identical
      // grain to a colour it computes itself.
      mod[k * 3] = n * warm;
      mod[k * 3 + 1] = n;
      mod[k * 3 + 2] = n * (1.94 - warm);
    }

    const idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      if (hole) {
        const cx = x0 + (i + 0.5) * step, cz = z0 + (j + 0.5) * step;
        if (cx > hole.x0 && cx < hole.x1 && cz > hole.z0 && cz < hole.z1) continue;
      }
      const a = j * W + i, b = a + 1, d2 = a + W, e = d2 + 1;
      idx.push(a, d2, b, b, d2, e);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aMod", new THREE.BufferAttribute(mod, 3));
    g.setAttribute("aShoreOK", new THREE.BufferAttribute(shoreOK, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();

    let mesh = new THREE.Mesh(g, withPerPixelShoreline(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 })));
    mesh.name = "env:terrain";
    mesh.receiveShadow = true;
    // The COARSE grid does not cast. At 200 m a triangle is far bigger than any
    // shadow-map texel it lands in, so it self-shadows: the sea bed showed hard
    // polygonal dark patches straight through the transparent water. Its shadows
    // were worth nothing anyway -- it is mostly sea bed and distant haze.
    mesh.castShadow = casts;
    targetParent.add(mesh);

    if (skirtDepth) {                                   // border skirt
      // THE SKIRT IS THE ONLY PLACE THE WORLD'S THICKNESS IS VISIBLE, AND IT WAS
      // A DARKENED COPY OF THE GRASS.
      //
      // It pushed `col * 0.7` down the wall -- so the cut face of the earth was
      // green, just dimmer. That is what makes a cliff read as painted on: the
      // side of the land looked like the top of the land in shadow, because that
      // is literally what it was.
      //
      // It is now the strata. And "bedrock" as a skirt depth means the wall runs
      // all the way down to BEDROCK_Y rather than a fixed distance, which is what
      // closes the world at its outer edge -- the case that was passed 0 and
      // therefore drew nothing at all.
      const toBedrock = skirtDepth === "bedrock";

      // ONE VERTEX PER STRATUM BOUNDARY, not two per column.
      //
      // A two-vertex wall can only ever show a GRADIENT from the surface colour
      // to the deepest layer -- which is a smear, not geology. Emitting a vertex
      // wherever a stratum changes gives real bands, and the bands stay
      // horizontal while the ground above them is not, which is what makes it
      // read as layers the land was built from rather than paint on its side.
      //
      // The depths are shared with strataAt, so the geometry and the colour
      // cannot disagree about where a layer ends.
      const bandDepths = STRATA.map((s) => s.to).filter((d) => Number.isFinite(d));
      const sp = [], sc = [];
      let perColumn = 0;

      const push = (i, j) => {
        const k = j * W + i;
        const topY = pos[k * 3 + 1];
        const botY = toBedrock ? BEDROCK_Y : topY - skirtDepth;
        const total = Math.max(0.01, topY - botY);

        // EVERY COLUMN EMITS THE SAME NUMBER OF VERTICES.
        //
        // The obvious version pushes only the boundaries that FIT inside this
        // column's wall. I wrote that version first, and its failure is worse
        // than it sounds. A short column -- deep sea bed, close to BEDROCK_Y --
        // then emits fewer vertices than a tall one, while the index arithmetic
        // below uses a single stride for all of them. Measured on a 12-column
        // sample spanning -174.5 m to 2150 m: counts came out 2,3,6,6,6..., the
        // stride was taken from the first column as 2, and every index stayed
        // IN BOUNDS. So there is no crash and no error. The strip simply reads
        // the wrong vertices from that point on and draws a wrong wall in
        // silence -- which is the failure this whole project exists to refuse.
        //
        // Clamping each boundary to the column's own depth keeps the count
        // constant. Where a layer does not fit, its vertex coincides with the one
        // below and the quad between them is degenerate -- zero area, drawn as
        // nothing, and the strip stays aligned.
        const depths = [0];
        for (const d of bandDepths) depths.push(Math.min(d, total));
        depths.push(total);

        // The stride is an ASSUMPTION the index loop makes. Check it here rather
        // than trust it, because the way it breaks is invisible.
        if (perColumn && perColumn !== depths.length) {
          throw new Error(`skirt stride changed: ${perColumn} -> ${depths.length}`);
        }

        for (let di = 0; di < depths.length; di++) {
          const d = depths[di];
          sp.push(pos[k * 3], topY - d, pos[k * 3 + 2]);
          if (di === 0) {
            // The top edge keeps the surface colour, so the join to the ground
            // above is seamless rather than a visible seam of soil.
            sc.push(col[k * 3], col[k * 3 + 1], col[k * 3 + 2]);
          } else {
            const s = strataAt(d);
            sc.push(s.r, s.g, s.b);
          }
        }
        perColumn = depths.length;
      };

      const ring = [];
      for (let i = 0; i < W; i++) ring.push([i, 0]);
      for (let j = 1; j < H; j++) ring.push([W - 1, j]);
      for (let i = W - 2; i >= 0; i--) ring.push([i, H - 1]);
      for (let j = H - 2; j >= 1; j--) ring.push([0, j]);
      for (const [i, j] of ring) push(i, j);

      // Quads between consecutive columns, one row per band. perColumn is the
      // same for every column because the band list is the same -- a column
      // shorter than a boundary simply has that boundary clamped to its bottom,
      // which degenerates that quad rather than misaligning the strip.
      const si = [];
      for (let n = 0; n + 1 < ring.length; n++) {
        const a = n * perColumn, b = (n + 1) * perColumn;
        for (let r = 0; r + 1 < perColumn; r++) {
          si.push(a + r, a + r + 1, b + r, b + r, a + r + 1, b + r + 1);
        }
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute("color", new THREE.Float32BufferAttribute(sc, 3));
      sg.setIndex(si);
      sg.computeVertexNormals();
      sg.computeBoundingSphere();
      const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, side: THREE.DoubleSide }));
      sm.name = "env:terrain-skirt";
      targetParent.add(sm);
    }
    return W * H;
  }

  const hole = { x0: -LOOK.coreX, x1: LOOK.coreX, z0: LOOK.coreZ0, z1: LOOK.coreZ1 };
  let verts = 0;
  if (!SKIP.has("terrain")) {
    // THE SKIRT DEPTH IS 45. Not 0, and -- this is the part that has been wrong
    // twice -- not "bedrock" either.
    //
    // This one argument has now had three values, and the first two each fixed
    // the previous defect by causing the next one:
    //
    //   0          No skirt at all. The outer mesh -- most of the modelled world
    //              -- was a surface with no underside, over nothing. A flat plane
    //              at y = -175 was added later to stop you seeing sky through the
    //              ocean where the grid ended, which covered the symptom.
    //   "bedrock"  A wall from the terrain edge all the way down to BEDROCK_Y
    //              (that same -175). It did close the world. It also stood a
    //              175 m vertical wall in 62%-opacity water all the way round the
    //              modelled rectangle, which is exactly the "long line in the
    //              ocean on the left side and right side" Mark reported seeing.
    //   45         What is here now. The APRON below carries real ground onward
    //              past this border, abutting it exactly, so this skirt no longer
    //              has to reach the sea floor. It only has to close the
    //              resolution crack between a 162.5 m mesh and a 650 m one, which
    //              is metres deep, not hundreds. Same reasoning and same number
    //              as the core seam thirty lines down.
    //
    // WHY THIS IS WRITTEN OUT RATHER THAN JUST CORRECTED: the two earlier
    // comments were both left in place, stacked, one arguing for "bedrock" and
    // the next saying "45, not bedrock" -- adjacent, contradictory, with the
    // stale one first. A blind audit found the identical pattern in the apron
    // comment thirty lines below and ranked it above every logic defect in the
    // diff, on the grounds that nobody reads code twice and the first number is
    // the one they believe. That was the apron; this is the same defect in the
    // same function, and it survived that audit because the audit's scope was
    // the apron. One history, in order, with the live value named first.
    const OUT = { x0: wm(-30000), x1: wm(30000), z0: wm(-33000), z1: wm(10000) };
    const emptyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    // Outer terrain LOD
    const outCenterX = (OUT.x0 + OUT.x1) / 2, outCenterZ = (OUT.z0 + OUT.z1) / 2;
    const outLOD = new THREE.LOD();
    outLOD.position.set(outCenterX, 0, outCenterZ);
    const outG0 = new THREE.Group(); outG0.position.set(-outCenterX, 0, -outCenterZ);
    const outG1 = new THREE.Group(); outG1.position.set(-outCenterX, 0, -outCenterZ);
    const outG2 = new THREE.Group(); outG2.position.set(-outCenterX, 0, -outCenterZ);
    verts = terrainMesh(OUT.x0, OUT.x1, OUT.z0, OUT.z1, LOOK.outerStep, hole, 45, false, outG0);
    terrainMesh(OUT.x0, OUT.x1, OUT.z0, OUT.z1, LOOK.outerStep * 3, hole, 45, false, outG1);
    terrainMesh(OUT.x0, OUT.x1, OUT.z0, OUT.z1, LOOK.outerStep * 6, hole, 45, false, outG2);
    outLOD.addLevel(outG0, 0);
    outLOD.addLevel(outG1, 2500);
    outLOD.addLevel(outG2, 5000);
    outLOD.addLevel(new THREE.Mesh(emptyGeo, dummyMat), 5500);
    scene.add(outLOD);

    // -------------------------------------------------------------------------
    // THE APRON -- ground out past the far edge of the water
    //
    // Without this the world is a rectangle of real ground floating inside a sea
    // plane 2.7x wider than it, so the rectangle's edge is visible through the
    // water as a tray. See WORLD.GROUND_SPAN in city-plan.js for the measurement
    // and the invariant.
    //
    // It is only sea bed, seen from kilometres up through translucent water, so
    // it is tessellated coarsely. heightAt answers out here on its own --
    // roughly -122 m of gently noisy floor -- so this invents nothing, it only
    // draws what the terrain function already said was there. The step and the
    // cost are stated once, below, where they are derived; an earlier version of
    // this comment stated them here as well ("ten times the outer step, about
    // 4,900 cells") and was left behind when the arithmetic changed the step to
    // four times. Two comments, one commit, disagreeing 6x on the count. A blind
    // audit found it, ranked it above every logic defect, and was right to:
    // nobody reads code twice, and the first number is the one they believe.
    // THE APRON GRID ALIGNS EXACTLY TO THE RECTANGLE'S EDGES. This is arithmetic,
    // not a tolerance, and it is the difference between the apron abutting the
    // fine mesh and it either gapping or fighting with it.
    //
    // The first attempt inset the hole by two apron cells so the two meshes would
    // OVERLAP, on the reasoning that an overlap is invisible where a gap is a
    // hole in the world. Measured before committing to it: the highest ground
    // inside that band is 63.2 m, at (-11600, 3350). So the overlap would have
    // drawn 650 m-resolution land on top of 162.5 m-resolution land along the
    // northern edge. Invisible was the wrong word.
    //
    //     rectangle spans  39,000 m in x  and  27,950 m in z
    //     gcd(39000, 27950) = 650
    //     650 = wm(1000) = LOOK.outerStep x 4
    //     58,500 = WORLD.SIZE x GROUND_SPAN / 2 = 650 x 90
    //
    // With that step and that half-extent, all four edges land on apron grid
    // lines: (19500 + 58500) / 650 = 120, (-19500 + 58500) / 650 = 60,
    // (6500 + 58500) / 650 = 100, (-21450 + 58500) / 650 = 57. So the hole is
    // cut to the rectangle exactly and the two meshes meet edge to edge.
    //
    // Cost: 180 x 180 cells less the hole, about 59,600 triangles -- 1.6% of the
    // scene -- for the thing that made the world look like it was on a tray.
    const apronHalf = WORLD.SIZE * WORLD.GROUND_SPAN / 2;
    const apronStep = LOOK.outerStep * WORLD.APRON_STEP_MULTIPLE * 4;
    verts += terrainMesh(-apronHalf, apronHalf, -apronHalf, apronHalf, apronStep, OUT, "bedrock", false);

    const TILE_SIZE = CHUNK_SIZE || 4000;
    for (let x = hole.x0; x < hole.x1; x += TILE_SIZE) {
      const xEnd = Math.min(hole.x1, x + TILE_SIZE);
      const tileCenterX = (x + xEnd) / 2;
      for (let z = hole.z0; z < hole.z1; z += TILE_SIZE) {
        const zEnd = Math.min(hole.z1, z + TILE_SIZE);
        const tileCenterZ = (z + zEnd) / 2;
        const lod = new THREE.LOD();
        lod.position.set(tileCenterX, 0, tileCenterZ);
        const g0 = new THREE.Group(); g0.position.set(-tileCenterX, 0, -tileCenterZ);
        const g1 = new THREE.Group(); g1.position.set(-tileCenterX, 0, -tileCenterZ);
        const g2 = new THREE.Group(); g2.position.set(-tileCenterX, 0, -tileCenterZ);

        verts += terrainMesh(x, xEnd, z, zEnd, LOOK.coreStep, null, 45, true, g0);
        terrainMesh(x, xEnd, z, zEnd, LOOK.coreStep * 2, null, 45, false, g1);
        terrainMesh(x, xEnd, z, zEnd, LOOK.coreStep * 6, null, 45, false, g2);

        lod.addLevel(g0, 0);
        lod.addLevel(g1, 400);
        lod.addLevel(g2, 1200);
        lod.addLevel(new THREE.Mesh(emptyGeo, dummyMat), 5500);
        scene.add(lod);
      }
    }
  }
  stats.terrainVerts = verts;

  // ---------------------------------------------------------------------------
  // WATER
  //
  // One transparent surface at y = 0 over the modelled sea bed. Depth then comes
  // for free and is CORRECT -- sand shows through the shallows as turquoise, the
  // shelf edge reads as a line, and the deep bay goes blue -- instead of being
  // three hand-placed rings of coloured plastic that had to be kept in register
  // with a coastline they knew nothing about.
  // ---------------------------------------------------------------------------
  // An abyss plane far under the water, well beyond the modelled sea bed. The
  // water is transparent, so where the terrain grid ENDS you were looking at the
  // sky through the ocean -- which read as a flat table with a cliff at its edge
  // on every wide shot. Two triangles close the world.
  if (!SKIP.has("water")) {
    // Now a backstop rather than the thing you are actually looking at: the
    // apron carries real ground out to GROUND_SPAN, which is wider than the sea
    // plane, so this is no longer visible THROUGH water anywhere. It stays
    // because it costs two triangles and closes everything beyond the apron.
    const abyss = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.SIZE * WORLD.ABYSS_SPAN, WORLD.SIZE * WORLD.ABYSS_SPAN),
      new THREE.MeshStandardMaterial({ color: 0x16334a, roughness: 1 })
    );
    abyss.name = "env:abyss-plane";
    abyss.rotation.x = -Math.PI / 2; abyss.position.y = -175; scene.add(abyss);
  }

  const wn = waterNormalTexture(THREE);
  const sea = SKIP.has("water") ? { position: {} } : new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.SIZE * WORLD.SEA_SPAN, WORLD.SIZE * WORLD.SEA_SPAN),
    new THREE.MeshStandardMaterial({
      // Opacity is the whole depth cue: at 0.80 the modelled sea bed underneath
      // was invisible and the bay was one flat blue. At 0.62 the shelf, the
      // turquoise band and the deep channel all read through it.
      color: 0x2181a6, roughness: 0.055, metalness: 0.5,
      transparent: true, opacity: 0.62, depthWrite: false,
      normalMap: wn, normalScale: new THREE.Vector2(0.42, 0.42),
    })
  );
  if (!SKIP.has("water")) {
    sea.name = "env:sea-plane";
    sea.rotation.x = -Math.PI / 2; sea.position.y = LOOK.seaLevel; sea.renderOrder = 2;
    scene.add(sea);
    giveWaterItsDepth(sea);
  }

  // Surf: a ribbon hugging every shoreline, faded across its width.
  if (!SKIP.has("water")) {
    const ftex = foamTexture(THREE);
    for (const lm of masses) {
      const inner = offsetPolygon(lm.polygon, -9);
      const outer = offsetPolygon(lm.polygon, 30);
      const n = lm.polygon.length;
      const pos = [], uv = [], idx = [];
      for (let i = 0; i < n; i++) {
        pos.push(inner[i][0], 0.5, inner[i][1]); uv.push(0, 0);
        pos.push(outer[i][0], 0.5, outer[i][1]); uv.push(0, 1);
      }
      for (let i = 0; i < n; i++) {
        const a = i * 2, b = a + 1, c2 = ((i + 1) % n) * 2, d2 = c2 + 1;
        idx.push(a, b, c2, c2, b, d2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const center = g.boundingSphere.center.clone();
      g.translate(-center.x, -center.y, -center.z);
      g.computeBoundingSphere();
      const surfMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        map: ftex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide
      }));
      surfMesh.renderOrder = 3;
      const surfLOD = new THREE.LOD();
      surfLOD.name = "env:water-fabric";
      surfLOD.position.copy(center);
      surfLOD.isGroundFabric = true;
      surfLOD.addLevel(surfMesh, 0);
      surfLOD.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 2500);
      scene.add(surfLOD);
    }
  }

  // ---------------------------------------------------------------------------
  // ROADS
  //
  // Roads FOLLOW THE GROUND now. They were flat planes at a fixed y, which is
  // fine on a flat plate and impossible on a hillside. Each is walked in steps,
  // sampled against the terrain, and emitted as a ribbon -- and a segment is
  // only emitted if both its ends are on dry land, which is what stops the
  // settlement grids running out over the water.
  //
  // Footways are drawn slightly BELOW the carriageway so that at every
  // intersection the road wins, instead of a pavement crossing the junction.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // BRIDGE PROFILES
  //
  // A bridge is a road, so its deck has to be a height ALONG that road, not a
  // separate object placed nearby. For each crossing the water span is measured
  // from the terrain, then the deck is the greater of (the ground plus kerb) and
  // (a ramp between the two shores plus an arch over the water). The ends
  // therefore melt into the street grid on both sides and the middle clears the
  // shipping, which is what makes a bridge read as connecting two places rather
  // than as a deck floating between them.
  // ---------------------------------------------------------------------------
  const ARCH_RISE = { cable: 44, arch: 15, causeway: 8 };
  const bridgeProfile = new Map();
  const bridgeSpans = [];
  for (const br of BRIDGES) {
    // `at` is the fixed coordinate, `t` runs along the span. For a north-south
    // bridge that is (x = at, z = t); for an east-west one it is (x = t, z = at).
    const ew = br.axis === "ew";
    const H = (t) => (ew ? heightAt(t, br.x) : heightAt(br.x, t));
    const z0 = Math.min(br.a, br.b), z1 = Math.max(br.a, br.b);
    let w0 = null, w1 = null;
    for (let z = z0; z <= z1; z += 5) {
      if (H(z) <= 0.5) { if (w0 === null) w0 = z; w1 = z; }
    }
    const yA = H(z0) + 0.9, yB = H(z1) + 0.9;
    const rise = ARCH_RISE[br.type] || 10;
    // RENAMED FROM `wm`, WHICH SHADOWED THE WORLD-SCALE HELPER.
    //
    // The import comment says sm() is "imported under a name that cannot be
    // shadowed" -- and then this line shadowed it, inside the BRIDGES loop.
    // Nothing in that block calls wm() today, so it worked; the stated guarantee
    // was simply false, and the next line added there that needs a scaled metre
    // would silently get a number instead. `wmid` is the midpoint of the water
    // gap, which is what it always was.
    const wmid = w0 === null ? (z0 + z1) / 2 : (w0 + w1) / 2;
    const half = w0 === null ? 200 : Math.max(160, (w1 - w0) * 0.72);
    const prof = (z) => {
      const t = (z - z0) / Math.max(1, z1 - z0);
      const base = yA + (yB - yA) * t;
      const u = clamp(1 - Math.abs(z - wmid) / half, 0, 1);
      const arch = rise * (u * u * (3 - 2 * u));
      return Math.max(H(z) + 0.9, base + arch);
    };
    bridgeProfile.set(br.id, prof);
    bridgeSpans.push({ br, z0, z1, w0, w1, wm: wmid, prof, rise, ew, H });
  }

  if (!SKIP.has("roads")) {
    const roadChunks = new Map();
    function getRoadChunk(x, z) {
      const cx = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
      const cz = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
      const key = `${cx},${cz}`;
      let c = roadChunks.get(key);
      if (!c) {
        c = {
          cx, cz,
          road: { pos: [], idx: [] },
          walk: { pos: [], idx: [] },
          mark: { pos: [], idx: [] },
          earth: { pos: [], idx: [] },
        };
        roadChunks.set(key, c);
      }
      return c;
    }

    const inCore = (x, z) => Math.abs(x) < LOOK.coreX && z > LOOK.coreZ0 && z < LOOK.coreZ1;

    function strip(bufName, x, z, ew, half, y, prev) {
      const c = getRoadChunk(x, z);
      const buf = c[bufName];
      const ax = ew ? x : x - half, az = ew ? z - half : z;
      const bx = ew ? x : x + half, bz = ew ? z + half : z;
      const i0 = buf.pos.length / 3;
      buf.pos.push(ax, y, az, bx, y, bz);
      if (prev !== null && prev.chunk === c) {
        buf.idx.push(prev.i0, prev.i0 + 1, i0, i0, prev.i0 + 1, i0 + 1);
      }
      return { chunk: c, i0 };
    }

    // A ROAD IS A SURVEYED SURFACE, NOT A DRAPE.
    //
    // This used to read the terrain at every point and pin the ribbon to it:
    // `const h = heightAt(x, z)`. That makes the carriageway follow fbm noise,
    // including the micro-relief term whose entire job is to stop ground being
    // flat -- so every street undulated, and the outer roads, sampled only every
    // 110 m, came out as chains of faceted planes at random angles.
    //
    // A road built that way does not read as a road. It reads as differently
    // coloured ground, which is exactly the long-standing complaint that the
    // streets are not legible in the near field despite 385,000 road triangles.
    //
    // Real roads are graded: a surveyed vertical alignment with a bounded
    // gradient, embankment where the ground falls away and cutting where it
    // rises. gradeRun() produces that profile. The road now sits slightly above
    // the hollows and slightly below the humps, which is not an error -- it is
    // what every road on earth does.
    //
    // Profiles are cached per road: the carriageway, its two footways and its
    // centreline markings must share ONE alignment, or the kerb saws through the
    // tarmac.
    const gradeCache = new Map();
    function profileFor(r) {
      let g = gradeCache.get(r.id);
      if (g === undefined) {
        // Per class: a motorway is driven through the landscape on embankment,
        // a residential street follows the ground. The maxDev cap is what keeps
        // a side street from quietly becoming a flyover.
        const spec = ROAD_GRADE[r.class] || ROAD_GRADE.STREET;
        g = gradeRun(heightAt, r, { step: 20, ...spec });
        gradeCache.set(r.id, g);
      }
      return g;
    }

    /**
     * The embankment or cutting a graded road implies, as geometry.
     *
     * gradeRun RETURNS maxFill, maxCut and overBudget, and its own comment says
     * they exist "so a caller can build the kerb, batter or retaining wall that
     * a real road would have there". Nothing built any of it, and nothing read
     * the measurement either. Measured across the 1,380 non-bridge roads: 378 of
     * them sit more than 3 m off the natural ground, 19 of them more than 20 m,
     * the worst at 44.6 m of fill -- ribbons of tarmac hanging in mid-air with
     * a visible gap underneath.
     *
     * A batter is the cheapest honest answer: two skirts, one per side, from the
     * carriageway edge down to wherever the ground actually is. Not a retaining
     * wall and not a structural claim -- it is the earth a road displaces, which
     * is what the surface's deviation from the terrain physically means.
     *
     * Emitted into one merged buffer with the roads, so it costs draw calls in
     * the single digits rather than one per road.
     */
    function batter(r, half, prof, grade) {
      if (prof) return;                       // a bridge is held up by piers, not earth
      const ew = r.axis === "ew";
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      const step = 55;
      let prev = null;
      for (let t = from; t <= to + 1e-6; t += step) {
        const x = ew ? t : r.at, z = ew ? r.at : t;
        const g = heightAt(x, z);
        if (g < 0.8) { prev = null; continue; }
        const y = grade.y(t);
        // Below a metre the kerb covers it and a skirt is just triangles.
        if (Math.abs(y - g) < 1.0) { prev = null; continue; }
        const c = getRoadChunk(x, z);
        const buf = c.earth;
        const i0 = buf.pos.length / 3;
        // Four vertices: both road edges at the surface, both at the ground.
        const ax = ew ? x : x - half, az = ew ? z - half : z;
        const bx = ew ? x : x + half, bz = ew ? z + half : z;
        buf.pos.push(ax, y, az, ax, g, az, bx, y, bz, bx, g, bz);
        if (prev !== null && prev.chunk === c) {
          // left skirt
          buf.idx.push(prev.i0, prev.i0 + 1, i0, i0, prev.i0 + 1, i0 + 1);
          // right skirt
          buf.idx.push(prev.i0 + 2, i0 + 2, prev.i0 + 3, prev.i0 + 3, i0 + 2, i0 + 3);
        }
        prev = { chunk: c, i0 };
      }
    }

    function ribbon(r, half, bufName, lift) {
      const ew = r.axis === "ew";
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      const core = inCore(ew ? (from + to) / 2 : r.at, ew ? r.at : (from + to) / 2);
      const prof = r.bridge ? bridgeProfile.get(r.bridge) : null;
      // Graded roads need a finer emit step than draped ones did: the whole point
      // is a smooth alignment, and 110 m segments cannot express one.
      const step = prof ? 18 : core ? 26 : 55;
      const grade = prof ? null : profileFor(r);
      let prev = null;
      for (let t = from; t <= to + 1e-6; t += step) {
        const x = ew ? t : r.at, z = ew ? r.at : t;
        // prof(t), NOT prof(z). bridgeProfile is parameterised by the
        // ALONG-SPAN coordinate -- its own H() is `ew ? heightAt(t, br.x) :
        // heightAt(br.x, t)` and its z0/z1 come from br.a/br.b. For an
        // east-west bridge the along-span coordinate is x, which is `t` here;
        // `z` is the road's constant cross-axis position.
        //
        // So all 7 east-west crossings were drawn as a FLAT ribbon at one
        // height, computed from a coordinate that is not on the span -- while
        // the soffit, parapets, piers and arch beneath them were built
        // correctly with the real profile. The deck no longer met its own
        // structure at any point, or the road grid at either end.
        //
        // `t` is the along-span parameter for both axes, which is why the
        // north-south bridges looked right: prof(z) happened to equal prof(t)
        // for them, and the bug was invisible on 12 of 19 crossings.
        if (prof) { prev = strip(bufName, x, z, ew, half, prof(t) + lift - 0.9, prev); continue; }
        // Still refuse to pave the sea -- tested against the NATURAL ground, since
        // that is what is actually wet. A graded surface may legitimately sit a
        // little above it.
        if (heightAt(x, z) < 0.8) { prev = null; continue; }
        prev = strip(bufName, x, z, ew, half, grade.y(t) + lift, prev);
      }
    }

    const allRoads = [...world.roads];
    // THE MEASUREMENT WAS TAKEN AND THROWN AWAY. profileFor already returns
    // gradeRun's maxFill / maxCut / overBudget / holdsGrade and nothing read any
    // of them, so a road 44 m off the ground and a road sitting on it were
    // indistinguishable in the output.
    const earth = { built: 0, worstFill: 0, worstCut: 0, overBudget: 0, worstOver: 0 };
    for (const r of allRoads) {
      const spec = ROADS[r.class]; if (!spec) continue;
      if (!r.bridge) {
        const g = profileFor(r);
        if (g) {
          if (g.maxFill > earth.worstFill) earth.worstFill = g.maxFill;
          if (g.maxCut > earth.worstCut) earth.worstCut = g.maxCut;
          if (g.overBudget > 0) {
            earth.overBudget++;
            if (g.overBudget > earth.worstOver) earth.worstOver = g.overBudget;
          }
          if (g.maxFill > 1.0 || g.maxCut > 1.0) {
            batter(r, spec.row / 2, null, g);
            earth.built++;
          }
        }
      }
      ribbon(r, spec.row / 2 - spec.footway, "road", 0.9);
      if (spec.footway > 0) {
        ribbon(r, spec.row / 2, "walk", 0.62);
        if (spec.row >= 28 && inCore(r.axis === "ew" ? 0 : r.at, r.axis === "ew" ? r.at : 0)) {
          ribbon(r, 0.55, "mark", 1.02);
        }
      }
    }
    stats.earthworks = {
      roadsWithBatter: earth.built,
      worstFillM: +earth.worstFill.toFixed(1),
      worstCutM: +earth.worstCut.toFixed(1),
      // Roads whose alignment could not be held inside their class earthworks
      // budget. Reported rather than hidden: gradeRun always ends on the
      // GRADIENT pass, so these hold the gradient and exceed the budget, which
      // is the trade it makes and the one worth being able to see.
      roadsOverBudget: earth.overBudget,
      worstOverBudgetM: +earth.worstOver.toFixed(1),
    };

    const mkMat = (colour, rough, order, doubleSide = false) => new THREE.MeshStandardMaterial({
      color: colour, roughness: rough, metalness: 0,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      polygonOffset: true, polygonOffsetFactor: -order, polygonOffsetUnits: -order,
    });
    const earthMat = mkMat(0x7d7360, 0.98, 0, true);
    const walkMat = mkMat(0xbdb5a6, 0.95, 1);
    const roadMat = mkMat(0x4b5058, 0.92, 2);
    const markMat = mkMat(0xf0e4b0, 0.8, 3);

    let totalEarthTris = 0;
    let totalRoadTris = 0;

    const emptyRoadGeo = new THREE.BufferGeometry();
    const dummyRoadMat = new THREE.MeshBasicMaterial({ visible: false });

    for (const c of roadChunks.values()) {
      const chunkCenterX = useChunking ? (c.cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (c.cz + 0.5) * CHUNK_SIZE : 0;
      const lod = new THREE.LOD();
      if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);
      const group = new THREE.Group();
      if (useChunking) group.position.set(-chunkCenterX, 0, -chunkCenterZ);

      const emit = (buf, mat) => {
        if (!buf.pos.length || !buf.idx.length) return 0;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
        g.setIndex(buf.idx);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mat);
        m.receiveShadow = true;
        group.add(m);
        return buf.idx.length / 3;
      };
      const eTris = emit(c.earth, earthMat);
      const wTris = emit(c.walk, walkMat);
      const rTris = emit(c.road, roadMat);
      const mTris = emit(c.mark, markMat);
      const chunkTotalTris = eTris + wTris + rTris + mTris;
      if (chunkTotalTris > 0) {
        totalEarthTris += eTris;
        totalRoadTris += wTris + rTris + mTris;
        lod.isGroundFabric = true;
        lod.name = "env:road"; // includes bridge-deck geometry, graded to bridgeProfile not raw heightAt
        lod.addLevel(group, 0);
        lod.addLevel(new THREE.Mesh(emptyRoadGeo, dummyRoadMat), 4800);
        scene.add(lod);
      }
    }
    stats.earthworksTris = totalEarthTris;
    stats.roadTris = totalRoadTris;
  }

  // ---------------------------------------------------------------------------
  // BUILDINGS
  //
  // Height is scaled by CENTRALITY: tallest at a settlement's centre, tapering
  // to its edge. A uniformly random skyline is a comb; a peak with shoulders is
  // a city, and it is the difference you read from ten kilometres away.
  // ---------------------------------------------------------------------------
  // Filled by the building pass, consumed by the contact-shadow pass in
  // buildProps. One shadow per building that exists, at the base it stands on.
  const placedBuildings = [];
  // P4.1 -- the SAME placements the scene was actually drawn from, exposed
  // so a caller can derive real board pieces (board-adapter.js) for what
  // is really on screen, instead of computing buildScenePlacements a
  // second time and risking the two disagreeing.
  let scenePlacements = null;
  if (!SKIP.has("buildings")) {
    // -------------------------------------------------------------------------
    // THE CITY IS LAID OUT BY RULES, THEN BUILT FROM THE LIBRARY.
    //
    // What follows replaces a loop that read a plot's CLASS, looked up a height
    // curve, and emitted a stack of coloured boxes. That produced a building
    // shaped like its plot and nothing else: no end units, no corners, no eras,
    // no foundations, and no relationship between one house and its neighbour.
    //
    // Now `layout.js` decides what stands on each plot from where it stands --
    // row position, corner, foundation from the terrain, era from the block --
    // and `buildings.js` builds it. Measured over the real world: 20,472
    // buildings, 0 that overhang their plot, 0 whose geometry disagrees with
    // its declared footprint.
    //
    // WHY IT IS GROUPED BEFORE IT IS BUILT. `building()` returns ONE MERGED
    // GEOMETRY per building. Built per plot that is 20,472 geometries and
    // 20,472 draw calls, against the 14 the old collector used. But two
    // buildings in the same SITUATION are the same building, so they share one
    // geometry and one InstancedMesh: the city collapses to 479 of them at
    // 1.5 M triangles.
    // -------------------------------------------------------------------------
    const byClass = {};
    let placed = 0, refused = 0;
    const refusedWhy = {};
    const unknownSettlements = new Set();

    // I2: layers reach the scene. buildScenePlacements() runs apply-layers.js
    // between planCity and here, then instance-groups.js to pull anything a
    // layer touched OUT of instancing entirely -- an InstancedMesh draws
    // every instance from the same geometry, so an overridden placement left
    // in its group would be drawn there AND wherever the override draws it.
    // `footByPlot` (the ground asked ONCE per plot, kept rather than
    // re-sampled) comes back from the same call for the same reason it
    // always has: layout.js needs the verdict to choose a foundation, the
    // renderer needs the base height, and asking twice risks the two
    // disagreeing.
    const { instanced, overridden, refusals: layoutRefusals, footByPlot } =
      buildScenePlacements({ instance, world, heightAt });
    scenePlacements = { instanced, overridden, footByPlot };
    for (const r of layoutRefusals) {
      refused++;
      refusedWhy[r.reason] = (refusedWhy[r.reason] || 0) + 1;
    }

    // DISTANCE-BANDED LOD & SPATIAL CHUNKING (Phase V7)
    //
    // 1. Geometry Cache: builds and caches LOD0, LOD1, and LOD2 per variant so
    //    geometry is built once per variant and shared across all spatial chunks.
    // 2. Spatial Chunking: groups instances into 1.6 km spatial chunks with tight
    //    bounding spheres so Three.js frustum culling culls off-screen regions.
    // 3. Distance Banding (THREE.LOD):
    //    - Near (0-600 m): LOD0 (Full detail + modeled reveals)
    //    - Mid (600-1800 m): LOD1 (Massing + facade textures)
    //    - Far (> 1800 m): LOD2 (Silhouette massing)
    const variantGeomCache = new Map();
    const getVariantGeom = (g) => {
      if (variantGeomCache.has(g.key)) return variantGeomCache.get(g.key);
      let spec;
      try {
        spec = building(g.typology, g.seed, g.options);
      } catch (err) {
        return null;
      }
      const lod0 = spec.lod && spec.lod[0];
      const lod1 = spec.lod && (spec.lod[1] || spec.lod[0]);
      const lod2 = spec.lod && (spec.lod[2] || spec.lod[1] || spec.lod[0]);
      const geo0 = lod0 ? lod0.createGeometry(THREE) : null;
      const geo1 = lod1 ? lod1.createGeometry(THREE) : geo0;
      const geo2 = lod2 ? lod2.createGeometry(THREE) : geo1;

      const usesVertexColour = !!(geo0 && geo0.attributes.color);
      const char = g.options?.character || spec.character || "heritage";
      const wallColor = (!usesVertexColour && spec.material && spec.material.wall) || 0x9a9a94;
      const mat = getFacadeMaterial(char, { vertexColors: usesVertexColour, wallColor, night: isNight });

      const entry = { spec, geo0, geo1, geo2, mat };
      variantGeomCache.set(g.key, entry);
      return entry;
    };

    // SPATIAL CHUNKING & DISTANCE-BANDED LOD (Phase A0)
    const emptyGeo = new THREE.BufferGeometry();

    // Group placements by spatial chunk, then by variant
    const chunkMap = new Map();
    for (const p of instanced) {
      const cx = useChunking ? Math.floor(p.x / CHUNK_SIZE) : 0;
      const cz = useChunking ? Math.floor(p.z / CHUNK_SIZE) : 0;
      const ckey = `${cx},${cz}`;
      let cEntry = chunkMap.get(ckey);
      if (!cEntry) {
        cEntry = { cx, cz, variants: new Map() };
        chunkMap.set(ckey, cEntry);
      }
      const char = p.options?.character || "";
      const baseKey = variantKeyOf(p);
      const vk = `${baseKey}|${char}`;
      let vGroup = cEntry.variants.get(vk);
      if (!vGroup) {
        vGroup = { key: vk, typology: p.typology, seed: baseKey, options: p.options, placements: [] };
        cEntry.variants.set(vk, vGroup);
      }
      vGroup.placements.push(p);
    }

    const dummy = new THREE.Object3D();
    let variantMeshes = 0, variantParts = 0;

    for (const cEntry of chunkMap.values()) {
      const chunkCenterX = useChunking ? (cEntry.cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (cEntry.cz + 0.5) * CHUNK_SIZE : 0;

      for (const g of cEntry.variants.values()) {
        const vData = getVariantGeom(g);
        if (!vData) {
          refused += g.placements.length;
          refusedWhy[`could not build ${g.typology}`] = (refusedWhy[`could not build ${g.typology}`] || 0) + g.placements.length;
          continue;
        }

        const { geo0, geo1, geo2, mat } = vData;
        const count = g.placements.length;

        const lod = new THREE.LOD();
        if (useChunking) {
          lod.position.set(chunkCenterX, 0, chunkCenterZ);
        }

        const im0 = new THREE.InstancedMesh(geo0, mat, count);
        const im1 = (geo1 && geo1 !== geo0) ? new THREE.InstancedMesh(geo1, mat, count) : im0;
        const im2 = (geo2 && geo2 !== geo0) ? new THREE.InstancedMesh(geo2, mat, count) : im1;

        let i = 0;
        for (const p of g.placements) {
          const foot = footByPlot.get(p.plotId);
          if (!foot) continue;
          const y = foot.verdict === "terrace" ? foot.base + foot.range : foot.base;
          const px = useChunking ? (p.x - chunkCenterX) : p.x;
          const pz = useChunking ? (p.z - chunkCenterZ) : p.z;
          dummy.position.set(px, y, pz);
          dummy.rotation.set(0, p.facing || 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();

          im0.setMatrixAt(i, dummy.matrix);
          if (im1 !== im0) im1.setMatrixAt(i, dummy.matrix);
          if (im2 !== im0 && im2 !== im1) im2.setMatrixAt(i, dummy.matrix);
          i++;

          placed++;
          byClass[p.situation.className] = (byClass[p.situation.className] || 0) + 1;
          placedBuildings.push([p.x, p.z, y, p.fits.w, p.fits.d]);
        }

        im0.count = i;
        im0.instanceMatrix.needsUpdate = true;
        im0.computeBoundingSphere();
        im0.castShadow = true;
        im0.receiveShadow = true;
        if (!useFrustumCulling) im0.frustumCulled = false;

        if (im1 !== im0) {
          im1.count = i;
          im1.instanceMatrix.needsUpdate = true;
          im1.computeBoundingSphere();
          im1.castShadow = true;
          im1.receiveShadow = true;
          if (!useFrustumCulling) im1.frustumCulled = false;
        }

        if (im2 !== im0 && im2 !== im1) {
          im2.count = i;
          im2.instanceMatrix.needsUpdate = true;
          im2.computeBoundingSphere();
          im2.castShadow = true;
          im2.receiveShadow = true;
          if (!useFrustumCulling) im2.frustumCulled = false;
        }

        if (!useLod) {
          scene.add(im0);
        } else {
          const isTower = (typeof g.typology === "string") && (
            g.typology.includes("tower") ||
            g.typology.includes("midrise") ||
            g.typology.includes("office") ||
            g.typology.includes("civic") ||
            g.typology.includes("business-park")
          );
          lod.isGroundFabric = !isTower;
          if (isTower) {
            lod.addLevel(im0, 0);
            lod.addLevel(im1, 200);
            lod.addLevel(im2, 5500);
            const cullMesh = new THREE.Mesh(emptyGeo, mat);
            lod.addLevel(cullMesh, 10000);
          } else {
            lod.addLevel(im0, 0);
            lod.addLevel(im1, 150);
            lod.addLevel(im2, 450);
            const cullMesh = new THREE.Mesh(emptyGeo, mat);
            lod.addLevel(cullMesh, 4800);
          }

          scene.add(lod);
        }
        variantMeshes++;
        variantParts += i;
      }
    }

    // I2: OVERRIDDEN PLACEMENTS, DRAWN INDIVIDUALLY, NOT INSTANCED.
    //
    // resolve-models.js decides what an override actually draws: a "replace"
    // must name a VERIFIED, registered model or it is refused outright (never
    // a default-shaped fallback -- that is the exact temptation its own
    // header names); a "retint"/"move" never touches the registry at all and
    // draws the placement's own stock model with the edit applied.
    // The registry is populated at build time from tier-models.js (2,400 models),
    // closing I5 so that every replace override resolves and renders.
    const registry = createModelRegistry({ populateTierModels: true, THREE });
    const { resolved: resolvedOverrides, refused: modelRefusals } = resolveOverrideModels(overridden, registry);
    for (const r of modelRefusals) {
      refused++;
      refusedWhy[r.reason] = (refusedWhy[r.reason] || 0) + 1;
    }
    let overriddenDrawn = 0;
    for (const p of resolvedOverrides) {
      const foot = footByPlot.get(p.plotId);
      if (!foot) continue;
      let geo, mat, lodObj = null;
      const isT = (typeof p.typology === "string") && (
        p.typology.includes("tower") ||
        p.typology.includes("midrise") ||
        p.typology.includes("office") ||
        p.typology.includes("civic") ||
        p.typology.includes("business-park")
      );
      if (p.model) {
        // A verified replace -- the registered, already-built geometry with LOD support.
        const s = p.model.spec;
        const lod0 = s && s.lod && s.lod[0];
        const lod1 = s && s.lod && (s.lod[1] || s.lod[0]);
        const lod2 = s && s.lod && (s.lod[2] || s.lod[1] || s.lod[0]);
        const geo0 = lod0 ? lod0.createGeometry(THREE) : p.model.geometry;
        const geo1 = lod1 ? lod1.createGeometry(THREE) : geo0;
        const geo2 = lod2 ? lod2.createGeometry(THREE) : geo1;
        const usesVertexColour = !!(geo0 && geo0.attributes && geo0.attributes.color);
        mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02, vertexColors: usesVertexColour });
        if (!usesVertexColour) mat.color.setHex(0x9a9a94);

        if (geo0 && (geo1 || geo2)) {
          lodObj = new THREE.LOD();
          lodObj.isGroundFabric = !isT;
          const m0 = new THREE.Mesh(geo0, mat); m0.castShadow = m0.receiveShadow = true;
          lodObj.addLevel(m0, 0);
          if (geo1 && geo1 !== geo0) {
            const m1 = new THREE.Mesh(geo1, mat); m1.castShadow = m1.receiveShadow = true;
            lodObj.addLevel(m1, isT ? 200 : 150);
          }
          if (geo2 && geo2 !== geo0 && geo2 !== geo1) {
            const m2 = new THREE.Mesh(geo2, mat); m2.castShadow = m2.receiveShadow = true;
            lodObj.addLevel(m2, isT ? 5500 : 450);
          }
          const cullM = new THREE.Mesh(new THREE.BufferGeometry(), mat);
          lodObj.addLevel(cullM, isT ? 10000 : 4800);
        } else {
          geo = geo0;
        }
      } else {
        // A retint/move only -- the placement's own stock model, built once
        // more because it can no longer share the instanced group's copy.
        let spec;
        try {
          spec = building(p.typology, p.seed, p.options);
          const lod0 = spec.lod && spec.lod[0];
          const lod1 = spec.lod && (spec.lod[1] || spec.lod[0]);
          const lod2 = spec.lod && (spec.lod[2] || spec.lod[1] || spec.lod[0]);
          const geo0 = lod0 ? lod0.createGeometry(THREE) : null;
          const geo1 = lod1 ? lod1.createGeometry(THREE) : geo0;
          const geo2 = lod2 ? lod2.createGeometry(THREE) : geo1;
          const usesVertexColour = !!(geo0 && geo0.attributes.color);
          mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02, vertexColors: usesVertexColour });
          const retint = p.override && p.override.retint;
          if (retint) mat.color.setHex(retint.color);
          else if (!usesVertexColour) mat.color.setHex((spec.material && spec.material.wall) || 0x9a9a94);

          if (geo0 && (geo1 || geo2)) {
            lodObj = new THREE.LOD();
            lodObj.isGroundFabric = !isT;
            const m0 = new THREE.Mesh(geo0, mat); m0.castShadow = m0.receiveShadow = true;
            lodObj.addLevel(m0, 0);
            if (geo1 && geo1 !== geo0) {
              const m1 = new THREE.Mesh(geo1, mat); m1.castShadow = m1.receiveShadow = true;
              lodObj.addLevel(m1, isT ? 200 : 150);
            }
            if (geo2 && geo2 !== geo0 && geo2 !== geo1) {
              const m2 = new THREE.Mesh(geo2, mat); m2.castShadow = m2.receiveShadow = true;
              lodObj.addLevel(m2, isT ? 5500 : 450);
            }
            const cullM = new THREE.Mesh(new THREE.BufferGeometry(), mat);
            lodObj.addLevel(cullM, isT ? 10000 : 4800);
          } else {
            geo = geo0;
          }
        } catch (err) {
          refused++;
          refusedWhy[`could not build ${p.typology}`] = (refusedWhy[`could not build ${p.typology}`] || 0) + 1;
          continue;
        }
      }
      const targetObj = lodObj || new THREE.Mesh(geo, mat);
      targetObj.name = "building";
      targetObj.castShadow = true;
      targetObj.receiveShadow = true;
      const move = p.override && p.override.move;
      const px = move ? move.x : p.x;
      const pz = move ? move.z : p.z;
      const y = foot.verdict === "terrace" ? foot.base + foot.range : foot.base;
      targetObj.position.set(px, y, pz);
      scene.add(targetObj);
      placedBuildings.push([px, pz, y, p.fits.w, p.fits.d]);
      overriddenDrawn++;
      placed++;
    }

    stats.buildings = placed;
    stats.byClass = byClass;
    stats.refused = refused;
    stats.refusedWhy = refusedWhy;
    stats.unknownSettlements = [...unknownSettlements];
    stats.variants = variantMeshes;
    stats.parts = variantParts;
    stats.instancedMeshes = variantMeshes;
    stats.overriddenBuildings = overriddenDrawn;
  }


  // ---------------------------------------------------------------------------
  // VEGETATION
  //
  // Two species and a tree line. Trees stop at 1,080 m, which is most of what
  // makes a mountain look like a mountain rather than a green cone.
  // ---------------------------------------------------------------------------
  if (!SKIP.has("trees")) {
    const spots = [];
    // A LINEAR SCAN OF EVERY PLOT, PER CANDIDATE. plan.plots is 1,374 entries
    // and this ran once per street-tree candidate and 2,400 times in the parks
    // pass below -- millions of comparisons for a question a bucket grid answers
    // in a handful. The world already has spatial-index.js for exactly this
    // shape of query; this pass predates it and never adopted it.
    //
    // Built once here rather than reusing buildSpatialIndex, because that indexes
    // world.plots (19,481, the whole world) and this only needs plan.plots (the
    // downtown grid). Same idea, a tenth of the data.
    const TCELL = 200;
    const treeGrid = new Map();
    const tkey = (cx, cz) => cx * 4096 + cz;
    for (const p of plan.plots) {
      for (let cx = Math.floor((p.xMin - 3) / TCELL); cx <= Math.floor((p.xMax + 3) / TCELL); cx++) {
        for (let cz = Math.floor((p.zMin - 3) / TCELL); cz <= Math.floor((p.zMax + 3) / TCELL); cz++) {
          const k = tkey(cx, cz);
          let b = treeGrid.get(k);
          if (!b) treeGrid.set(k, (b = []));
          b.push(p);
        }
      }
    }
    const occupied = (x, z) => {
      const b = treeGrid.get(tkey(Math.floor(x / TCELL), Math.floor(z / TCELL)));
      if (!b) return false;
      for (const p of b) if (x > p.xMin - 3 && x < p.xMax + 3 && z > p.zMin - 3 && z < p.zMax + 3) return true;
      return false;
    };
    // street trees along the downtown roads
    for (const r of plan.roads) {
      const spec = ROADS[r.class], ew = r.axis === "ew";
      // ON THE FOOTWAY, not beyond it. Planted at row/2 + 3.5 every street tree
      // stood inside the adjoining plot and was rejected as occupied, so the
      // densest part of the city had no street trees at all.
      for (let t = r.from + 20; t < r.to - 20; t += 24) for (const side of [-1, 1]) {
        const off = side * (spec.row / 2 - Math.max(2.2, spec.footway * 0.45));
        const x = ew ? t : r.at + off;
        const z = ew ? r.at + off : t;
        if (heightAt(x, z) < 2) continue;
        if (occupied(x, z)) continue;
        spots.push([x, z, 0.8 + rnd("s" + x + z) * 0.5, 0]);
      }
    }
    // THE WIDER LANDSCAPE: woods, not a sprinkle.
    //
    // This planted 26,000 trees at a uniform random density, which from any
    // distance is not countryside -- it is grain. Evenly-spaced isolated dots
    // over every green surface, exactly the noise that made the land rendering
    // look dirty.
    //
    // Real country is CLUMPED: woods, shelter belts along field edges, and open
    // ground between them. Gating placement on a low-frequency noise field
    // gives contiguous woodland with genuinely empty fields, at the same tree
    // count -- so it costs nothing and stops reading as static.
    for (let i = 0; i < 26000; i++) {
      const x = wm(-21000) + rnd("fx" + i) * wm(42000), z = wm(-23000) + rnd("fz" + i) * wm(20500);
      const h = heightAt(x, z);
      if (h < 3 || h > TREE_LINE) continue;
      if (settAt(x, z)) continue;

      // two scales: where the woods are, and their ragged edges
      const wood = fbm(x + 3100, z - 1700, 2300, 2);
      const edge = fbm(x - 800, z + 2600, 520, 2);
      const canopy = wood * 0.78 + edge * 0.22;

      // uplands are more wooded, and the threshold moves with height rather
      // than the density doing all the work
      const gate = h > 400 ? 0.42 : h > 60 ? 0.52 : 0.60;
      if (canopy < gate) continue;

      // inside a wood, plant densely; near its edge, thin out
      const dens = Math.min(0.95, (canopy - gate) * 3.4);
      if (rnd("fd" + i) > dens) continue;
      spots.push([x, z, 1.5 + rnd("fs" + i) * 1.9, h > 520 ? 1 : 0]);
    }
    // the barrier island and the keys: palms and scrub
    for (let i = 0; i < 3200; i++) {
      const x = wm(-8400) + rnd("bx" + i) * wm(17000), z = wm(1800) + rnd("bz" + i) * wm(1700);
      const h = heightAt(x, z);
      if (h < 1.5) continue;
      if (settAt(x, z) && rnd("bk" + i) > 0.18) continue;
      spots.push([x, z, 0.9 + rnd("bs" + i) * 0.7, 0]);
    }
    // GARDEN TREES. Every settlement was a carpet of roofs with not one tree in
    // it, because the landscape pass skipped anything inside a settlement
    // boundary to avoid planting trees through buildings. Low-rise plots have
    // gardens; placing one at the rear corner of a plot puts it exactly where a
    // garden tree goes and cannot land on the street.
    for (const p of world.plots) {
      if (p.className !== "VILLA" && p.className !== "TOWNHOUSE" && p.className !== "TERRACE") continue;
      if (rnd("gt" + p.id) > 0.42) continue;
      const gx = p.xMax - Math.max(2.5, p.width * 0.16);
      const gz = p.zMax - 2.6;
      if (heightAt(gx, gz) < 1.5) continue;
      spots.push([gx, gz, 0.5 + rnd("gs" + p.id) * 0.4, 0]);
    }

    // PARK CANOPIES. Planted here rather than in the park pass so they share the
    // same instanced meshes as every other tree in the world -- a park with its
    // own tree mesh is another draw call for no reason.
    for (const b of (plan.parks || [])) {
      const cx2 = (b.xMin + b.xMax) / 2, cz2 = (b.zMin + b.zMax) / 2;
      const w2 = b.xMax - b.xMin, d2 = b.zMax - b.zMin;
      const n2 = Math.max(8, Math.round((w2 * d2) / 800));
      for (let i = 0; i < n2; i++) {
        const tx = b.xMin + 8 + rnd("pt" + b.id + i) * (w2 - 16);
        const tz = b.zMin + 8 + rnd("pu" + b.id + i) * (d2 - 16);
        if (Math.abs(tx - cx2) < 6 || Math.abs(tz - cz2) < 6) continue;   // keep the paths clear
        if (heightAt(tx, tz) < 1) continue;
        spots.push([tx, tz, 1.0 + rnd("pv" + b.id + i) * 0.7, 0]);
      }
    }

    // parks and gaps inside the city
    for (let i = 0; i < 2400; i++) {
      const x = -1500 + rnd("px" + i) * 2950, z = -760 + rnd("pz" + i) * 1400;
      if (heightAt(x, z) < 2.5) continue;
      if (occupied(x, z)) continue;
      spots.push([x, z, 1 + rnd("ps" + i) * 0.8, 0]);
    }

    const trunkG = new THREE.CylinderGeometry(0.45, 0.8, 6, 4);
    const broad = new THREE.SphereGeometry(1, 6, 4);
    const conif = new THREE.ConeGeometry(1, 2.4, 6);

    const trunkG1 = new THREE.CylinderGeometry(0.45, 0.8, 6, 3);
    const broad1 = new THREE.SphereGeometry(1, 4, 2);
    const conif1 = new THREE.ConeGeometry(1, 2.4, 4);

    const trunkG2 = new THREE.CylinderGeometry(0.45, 0.8, 6, 3, 1, true);
    const broad2 = new THREE.ConeGeometry(1, 2.4, 3, 1, true);
    const conif2 = new THREE.ConeGeometry(1, 2.4, 3, 1, true);

    const trunkM = new THREE.MeshStandardMaterial({ color: 0x5f452d, roughness: 0.95 });
    const broadM = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const conifM = new THREE.MeshStandardMaterial({ roughness: 0.9 });

    const treeChunks = new Map();
    spots.forEach(([x, z, s, kind], idx) => {
      const cx = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
      const cz = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
      const ck = `${cx},${cz}`;
      let cEntry = treeChunks.get(ck);
      if (!cEntry) {
        cEntry = { cx, cz, spots: [] };
        treeChunks.set(ck, cEntry);
      }
      cEntry.spots.push([x, z, s, kind, idx]);
    });

    const emptyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    for (const cEntry of treeChunks.values()) {
      const cSpots = cEntry.spots;
      const n = cSpots.length;
      const chunkCenterX = useChunking ? (cEntry.cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (cEntry.cz + 0.5) * CHUNK_SIZE : 0;

      const lod = new THREE.LOD();
      lod.isGroundFabric = true;
      if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

      // LOD0: Full detail
      const treeGroup0 = new THREE.Group();
      const tI0 = new THREE.InstancedMesh(trunkG, trunkM, n);
      const bI0 = new THREE.InstancedMesh(broad, broadM, n);
      const cI0 = new THREE.InstancedMesh(conif, conifM, n);
      tI0.castShadow = bI0.castShadow = cI0.castShadow = true;

      // LOD1: Medium detail
      const treeGroup1 = new THREE.Group();
      const tI1 = new THREE.InstancedMesh(trunkG1, trunkM, n);
      const bI1 = new THREE.InstancedMesh(broad1, broadM, n);
      const cI1 = new THREE.InstancedMesh(conif1, conifM, n);
      tI1.castShadow = bI1.castShadow = cI1.castShadow = true;

      // LOD2: Coarse massing for distant/skyline views
      const treeGroup2 = new THREE.Group();
      const tI2 = new THREE.InstancedMesh(trunkG2, trunkM, n);
      const bI2 = new THREE.InstancedMesh(broad2, broadM, n);
      const cI2 = new THREE.InstancedMesh(conif2, conifM, n);

      const d = new THREE.Object3D(), c = new THREE.Color();
      let nb = 0, nc = 0;
      cSpots.forEach(([x, z, s, kind, i], j) => {
        const y = heightAt(x, z);
        const px = useChunking ? (x - chunkCenterX) : x;
        const pz = useChunking ? (z - chunkCenterZ) : z;
        d.position.set(px, y + 3 * s, pz); d.scale.setScalar(s); d.rotation.set(0, 0, 0); d.updateMatrix();
        tI0.setMatrixAt(j, d.matrix);
        tI1.setMatrixAt(j, d.matrix);
        tI2.setMatrixAt(j, d.matrix);
        const tint = c.setHex(kind ? 0x38612f : 0x4f8a3e).offsetHSL(0, (rnd("h" + i) - 0.5) * 0.09, (rnd("l" + i) - 0.5) * 0.17);
        if (kind) {
          d.position.set(px, y + 6 * s + 3.4 * s, pz); d.scale.set(3.4 * s, 9 * s, 3.4 * s); d.updateMatrix();
          cI0.setMatrixAt(nc, d.matrix); cI0.setColorAt(nc, tint);
          cI1.setMatrixAt(nc, d.matrix); cI1.setColorAt(nc, tint);
          cI2.setMatrixAt(nc, d.matrix); cI2.setColorAt(nc, tint);
          nc++;
        } else {
          d.position.set(px, y + 8.4 * s, pz); d.scale.set(5.4 * s, 4.6 * s, 5.4 * s); d.updateMatrix();
          bI0.setMatrixAt(nb, d.matrix); bI0.setColorAt(nb, tint);
          bI1.setMatrixAt(nb, d.matrix); bI1.setColorAt(nb, tint);
          bI2.setMatrixAt(nb, d.matrix); bI2.setColorAt(nb, tint);
          nb++;
        }
      });
      bI0.count = bI1.count = bI2.count = nb;
      cI0.count = cI1.count = cI2.count = nc;
      tI0.instanceMatrix.needsUpdate = bI0.instanceMatrix.needsUpdate = cI0.instanceMatrix.needsUpdate = true;
      tI1.instanceMatrix.needsUpdate = bI1.instanceMatrix.needsUpdate = cI1.instanceMatrix.needsUpdate = true;
      tI2.instanceMatrix.needsUpdate = bI2.instanceMatrix.needsUpdate = cI2.instanceMatrix.needsUpdate = true;
      if (bI0.instanceColor) bI0.instanceColor.needsUpdate = true;
      if (cI0.instanceColor) cI0.instanceColor.needsUpdate = true;
      if (bI1.instanceColor) bI1.instanceColor.needsUpdate = true;
      if (cI1.instanceColor) cI1.instanceColor.needsUpdate = true;
      if (bI2.instanceColor) bI2.instanceColor.needsUpdate = true;
      if (cI2.instanceColor) cI2.instanceColor.needsUpdate = true;

      tI0.computeBoundingSphere(); bI0.computeBoundingSphere(); cI0.computeBoundingSphere();
      tI1.computeBoundingSphere(); bI1.computeBoundingSphere(); cI1.computeBoundingSphere();
      tI2.computeBoundingSphere(); bI2.computeBoundingSphere(); cI2.computeBoundingSphere();

      treeGroup0.add(tI0);
      if (nb > 0) treeGroup0.add(bI0);
      if (nc > 0) treeGroup0.add(cI0);

      treeGroup1.add(tI1);
      if (nb > 0) treeGroup1.add(bI1);
      if (nc > 0) treeGroup1.add(cI1);

      if (nb > 0) treeGroup2.add(bI2);
      if (nc > 0) treeGroup2.add(cI2);

      lod.addLevel(treeGroup0, 0);
      lod.addLevel(treeGroup1, 100);
      lod.addLevel(treeGroup2, 350);
      const cullTree = new THREE.Mesh(emptyGeo, dummyMat);
      lod.addLevel(cullTree, 4800);
      scene.add(lod);
    }
    stats.trees = spots.length;
  }
  stats.trees = stats.trees || 0;

  // P4.1 -- `instance` (world-model.js's seed+layers result) exposed so a
  // caller can derive the real board pieces (board-adapter.js's
  // piecesFromWorld) for the SAME placements this render actually drew,
  // and so P4.4's move op has a live handle to the same layer stack
  // buildScenePlacements already reads (apply-layers.js). Not previously
  // exposed because nothing outside this module needed it before P4.
  const api = { scene, field, heightAt, plan, world, instance, scenePlacements, masses, stats, sun, sunDir: sunPos.clone(), sky, citySky, sea, wn, LOOK, THREE, renderer, settAt, SETT, SETT_BY_ID, bridgeSpans, placedBuildings, CHUNK_SIZE, useChunking };
  if (!SKIP.has("props")) buildProps(api);
  stats.buildMs = Math.round(performance.now() - t0);
  return api;
}

// =============================================================================
// PROPS — the things that say what a place IS
//
// A container port, an airport, marinas, causeways, traffic. Individually small;
// together they are the difference between "buildings on land" and a working
// coastal city.
// =============================================================================
function buildProps(api) {
  // ---------------------------------------------------------------------------
  // ONE PIECE OF PAVEMENT, ONE OBJECT
  //
  // Measured before this existed: 27 lamp posts standing inside a bin or a
  // bench, one pair 5 cm apart. Two loops walk the same footways -- lamps every
  // 52 m from +24, furniture every 55 m from +30 -- and neither could see the
  // other, because until prop-manifest.js there was nothing to see. A bench's
  // size lived only as arguments to a BoxGeometry call.
  //
  // WHY THIS DOES NOT ASK registry.overlapsReserved.
  //
  // It looks like it should, and doing so would delete the entire street scene.
  // generateWorld reserves each road across its FULL ROW WIDTH -- carriageway
  // and footway together -- so a lamp at row/2 - 1.4 and a bench at
  // row/2 - footway*0.45 are both, correctly, inside a road rectangle. A prop
  // on a footway is not trespassing; it is standing where it belongs. The road
  // reservation means "do not put a BUILDING here", and the registry has no way
  // to say which of those two questions is being asked: overlapsReserved takes
  // no kind filter. That is worth adding, and it is the world lane's file.
  //
  // So placement is decided prop-against-prop here, where the question actually
  // is, and every placed prop is then RESERVED into the world registry so that
  // whatIsAt knows it exists. Deciding and recording are two different jobs and
  // conflating them is what produced the 27.
  const PCELL = 12;
  const propGrid = new Map();
  const pkey = (i, j) => i * 8192 + j;
  const propCells = (r) => {
    const out = [];
    for (let i = Math.floor(r.xMin / PCELL); i <= Math.floor(r.xMax / PCELL); i++) {
      for (let j = Math.floor(r.zMin / PCELL); j <= Math.floor(r.zMax / PCELL); j++) out.push(pkey(i, j));
    }
    return out;
  };
  const propRefused = {};
  // Filled where the lamps claim their ground, consumed where their meshes are
  // built. One array, so the two cannot disagree about where a lamp is.
  const lampPosts = [];

  /**
   * Claim ground for a prop, or refuse and say why.
   *
   * Returns false when the spot is taken. A refusal is a fact about the world
   * worth counting, not something to swallow, so every one lands in stats --
   * the same reasoning as `refusedWhy` for buildings.
   */
  function claimProp(id, x, z, opts = {}) {
    const r = propFootprint(id, x, z, opts);
    const cells = propCells(r);
    for (const c of cells) {
      for (const other of propGrid.get(c) || []) {
        if (r.xMin < other.xMax && r.xMax > other.xMin && r.zMin < other.zMax && r.zMax > other.zMin) {
          propRefused[id] = (propRefused[id] || 0) + 1;
          return false;
        }
      }
    }
    for (const c of cells) {
      let bucket = propGrid.get(c);
      if (!bucket) propGrid.set(c, (bucket = []));
      bucket.push(r);
    }
    // The world's own record, so `whatIsAt` can answer for a bench. Soft props
    // are recorded too -- "know everything that is in the world" includes the
    // things you are allowed to remove.
    if (world.registry) {
      world.registry.reserve({
        kind: "prop", id: `${id}:${Math.round(x)}:${Math.round(z)}`, owner: id,
        xMin: r.xMin, xMax: r.xMax, zMin: r.zMin, zMax: r.zMax,
      });
    }
    return true;
  }

  // THIS DESTRUCTURING USED TO SIT BELOW THE THREE LINES THAT FOLLOW IT, AND
  // buildProps THREW EVERY SINGLE TIME.
  //
  // `stats` is declared here, by const. The feature-placement lines below read
  // it. When they came first, they read it inside its temporal dead zone:
  //
  //     ReferenceError: Cannot access 'stats' before initialization
  //
  // Nothing catches buildProps. buildWorld calls it unguarded, and both callers
  // -- city.html:88 and world-render-3d.js's _buildCityBase -- call buildWorld
  // unguarded too. So this threw out of the entire world build, every load.
  // Bridges, the port, railway, airport, golf, marina, pier, boardwalk, parks,
  // landmarks, traffic, people, lamps and contact shadows: none of it existed,
  // and `stats.buildMs` was never assigned so even the console line that would
  // have hinted at it never ran.
  //
  // It got here by insertion: a later commit added the placeFeatures block
  // ABOVE the destructuring rather than below it. The order is the whole bug,
  // and nothing caught it because no test builds the scene -- three.js needs a
  // GPU, so the renderer is the one part of this project the suite cannot
  // execute. That is a real gap and it is recorded in the ledger, not papered
  // over: the fix here is ordering, and the protection is the module-order
  // check added alongside it.
  const { THREE, scene, heightAt, masses, stats, world, plan, settAt, CHUNK_SIZE, useChunking } = api;

  // WHERE EVERYTHING GOES, DECIDED ONCE, BY ASKING THE LAND.
  //
  // Every large feature below used to carry its own coordinate. See features.js
  // for what that cost. Placement now happens in one pass against the land
  // registry, before a single mesh is made, and anything that cannot be placed
  // is absent from SITE -- so the geometry below simply does not run, rather
  // than running over water.
  const { sites: SITE, report: siteReport } = placeFeatures(heightAt);
  // Reported, not swallowed. If the world has nowhere for a container port, that
  // is a fact about the world and should be visible, not silently absent.
  stats.featurePlacement = siteReport;
  stats.featuresUnplaced = siteReport.filter((r) => !r.placed).map((r) => r.id);
  const M = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  /** Same, but visible from both sides -- for hand-wound strips where getting
   *  every face's winding right is more fragile than just not depending on it. */
  const M2 = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, side: THREE.DoubleSide });
  const RB = (w, h, d, r = 0.3) => new RoundedBoxGeometry(w, h, d, 1, r);

  // ---------------------------------------------------------------------------
  // BRIDGES
  //
  // The deck itself is the ROAD -- generated with the rest of the network from
  // the same profile, so the carriageway, footways, markings and lamps run
  // straight across and join the grid at both ends. What is built here is the
  // structure that holds it up and the edge that stops you falling off: the
  // soffit, the piers, the parapets, and the towers and stays or the arch.
  //
  // Everything is written into TWO merged buffers rather than emitted as loose
  // meshes. Built the obvious way -- one Mesh per soffit box, parapet segment,
  // pier, stay and arch segment -- ten crossings came to about three thousand
  // draw calls, and the wide views simply stopped returning frames. A bridge is
  // a few hundred boxes; boxes belong in a buffer.
  // ---------------------------------------------------------------------------
  {
    const conc = { pos: [], idx: [] }, steelB = { pos: [], idx: [] };

    /** Append a box, centred and rotated about X (pitch along the span). */
    function pushBox(buf, cx, cy, cz, w, h, l, pitch = 0) {
      const c = Math.cos(pitch), sn = Math.sin(pitch);
      const hw = w / 2, hh = h / 2, hl = l / 2;
      const base = buf.pos.length / 3;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const y = sy * hh, z = sz * hl;
        buf.pos.push(cx + sx * hw, cy + y * c - z * sn, cz + y * sn + z * c);
      }
      // corners are indexed x*4 + y*2 + z
      const F = [
        [0, 1, 3, 2], [4, 6, 7, 5],       // -x, +x
        [0, 4, 5, 1], [2, 3, 7, 6],       // -y, +y
        [0, 2, 6, 4], [1, 5, 7, 3],       // -z, +z
      ];
      for (const [a, b, c2, d2] of F) {
        buf.idx.push(base + a, base + b, base + c2, base + a, base + c2, base + d2);
      }
    }

    /** Same box, laid along X instead of Z. */
    function pushBoxEW(buf, cx, cy, cz, w, h, l, pitch = 0) {
      const c = Math.cos(pitch), sn = Math.sin(pitch);
      const hw = w / 2, hh = h / 2, hl = l / 2;
      const base = buf.pos.length / 3;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const y = sy * hh, x = sx * hw;
        buf.pos.push(cx + x * c - y * sn, cy + x * sn + y * c, cz + sz * hl);
      }
      const F = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
      for (const [a, b, c2, d2] of F) buf.idx.push(base + a, base + b, base + c2, base + a, base + c2, base + d2);
    }

    let totalBridgeTris = 0;
    for (const sp of api.bridgeSpans) {
      const { br, z0, z1, w0, w1, prof, ew, H } = sp;
      if (w0 === null) continue;                       // nothing to cross
      const spec = ROADS[br.class] || ROADS.AVENUE;
      const width = spec.row;
      const SEG = 30;
      const bConc = { pos: [], idx: [] }, bSteel = { pos: [], idx: [] };

      // place(t, lateralOffset) -> [x, z] on the correct axis
      const P = (t, off = 0) => (ew ? [t, br.x + off] : [br.x + off, t]);
      const put = (buf, t, off, y, w, h, l, pitch) => {
        const [px, pz] = P(t, off);
        if (ew) pushBoxEW(buf, px, y, pz, l, h, w, pitch);
        else pushBox(buf, px, y, pz, w, h, l, pitch);
      };

      for (let z = z0; z < z1; z += SEG) {
        const zb = Math.min(z1, z + SEG);
        const yA = prof(z), yB = prof(zb), len = zb - z;
        const y = (yA + yB) / 2, cz = (z + zb) / 2;
        const pitch = -Math.atan2(yB - yA, len);
        const L = Math.hypot(len, yB - yA) * 1.04;
        put(bConc, cz, 0, y - 2.0, width * 0.98, 2.6, L, pitch);                 // soffit
        for (const side of [-1, 1]) {                                            // parapets
          put(bConc, cz, side * (width / 2 - 0.4), y + 0.85, 0.7, 1.5, L, pitch);
        }
      }

      // --- piers, in the water only ---
      const pierGap = br.type === "cable" ? 240 : br.type === "arch" ? 170 : 130;
      for (let z = w0 + pierGap * 0.5; z < w1; z += pierGap) {
        const bed = Math.min(-2, H(z));
        const top = prof(z) - 2.4, hgt = top - bed;
        if (hgt < 4) continue;
        put(bConc, z, 0, bed + hgt / 2, width * 0.30, hgt, 9, 0);
        put(bConc, z, 0, top - 1.1, width * 0.72, 2.2, 11, 0);                   // pier cap
      }

      if (br.type === "cable") {
        const span = w1 - w0;
        for (const t of [0.30, 0.70]) {
          const tz = w0 + span * t;
          const deckY = prof(tz), bed = Math.min(-4, H(tz));
          const towerH = 96, legH = deckY - bed + towerH;
          for (const side of [-1, 1]) {
            put(bSteel, tz, side * (width / 2 - 2), bed + legH / 2, 5.5, legH, 6.5, 0);
          }
          put(bSteel, tz, 0, deckY + towerH * 0.62, width, 4, 5, 0);            // cross beam
          for (const dir of [-1, 1]) for (let k = 1; k <= 6; k++) {
            const reach = span * 0.17 * (k / 6), az = tz + dir * reach;
            if (az < z0 || az > z1) continue;
            const dy = deckY + towerH - prof(az), L = Math.hypot(reach, dy);
            for (const side of [-1, 1]) {
              put(bSteel, (tz + az) / 2, side * (width / 2 - 2),
                (deckY + towerH + prof(az)) / 2, 0.8, 0.8, L, dir * Math.atan2(reach, dy));
            }
          }
        }
      } else if (br.type === "arch") {
        const cz = (w0 + w1) / 2, halfSpan = (w1 - w0) / 2 + 40, rise = 26, N = 14;
        for (const side of [-1, 1]) for (let i = 0; i < N; i++) {
          const u0 = -1 + (2 * i) / N, u1 = -1 + (2 * (i + 1)) / N;
          const z0a = cz + u0 * halfSpan, z1a = cz + u1 * halfSpan;
          const y0 = prof(z0a) - 2 + rise * (1 - u0 * u0);
          const y1 = prof(z1a) - 2 + rise * (1 - u1 * u1);
          const dz = z1a - z0a, dy = y1 - y0, L = Math.hypot(dz, dy) * 1.08;
          put(bSteel, (z0a + z1a) / 2, side * (width / 2 - 1.5), (y0 + y1) / 2,
            2.2, 2.2, L, -Math.atan2(dy, dz));
        }
      }

      const emitSpan = (buf, colour, rough, metal) => {
        if (!buf.pos.length) return 0;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
        g.setIndex(buf.idx);
        const flat = g.toNonIndexed();
        flat.computeVertexNormals();
        flat.computeBoundingSphere();
        const center = flat.boundingSphere.center.clone();
        flat.translate(-center.x, -center.y, -center.z);
        flat.computeBoundingSphere();
        const m = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal }));
        m.castShadow = true; m.receiveShadow = true;
        const bLOD = new THREE.LOD();
        bLOD.name = "bridge-span"; // spans a gap on piers by design -- heightAt beneath is the valley/water it crosses, not its reference elevation
        bLOD.position.copy(center);
        bLOD.addLevel(m, 0);
        bLOD.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 4500);
        scene.add(bLOD);
        return buf.idx.length / 3;
      };
      totalBridgeTris += emitSpan(bConc, 0xdcd6c8, 0.88, 0) + emitSpan(bSteel, 0xe4e0d6, 0.5, 0.3);
    }
    stats.bridgeTris = totalBridgeTris;
    stats.bridges = api.bridgeSpans.length;
  }

  // --- container port: the most recognisable silhouette in any working harbour
  port: {
    const cc = [0xd94f3d, 0x2f7fb5, 0xe0a53f, 0x3f9e6a, 0xb04a8a, 0xe8e4dc];
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 2.6, 2.6), new THREE.MeshStandardMaterial({ roughness: 0.72 }), 2200);
    const d = new THREE.Object3D(), c = new THREE.Color(); let n = 0;
    // The stack yard sits BEHIND the quay, on the land side of it, because that
    // is the only place a container yard can be. It used to be a literal
    // rectangle 40 m up a hillside with no water anywhere near it.
    const _q = SITE.containerPort;
    if (!_q) break port;
    const _qs = _q.landSide;
    // A PAVED YARD IS FLAT. THIS FOLLOWED fbm NOISE, PER CONTAINER, THEN A
    // SINGLE MEAN LEVEL FOR THE WHOLE 1,800 x 490 m FOOTPRINT.
    //
    // Measured before this fix (scripts/measure-floating.mjs,
    // docs/audits/P3.5-FLOATING.md): the single mean put 2,022 of the yard's
    // own rendered container instances more than one visible pixel from the
    // real ground beneath them, worst case 23.9 m, because the ground under
    // this footprint runs 1 m to 58 m. The comment this replaced claimed the
    // mean made the yard "sit in the ground rather than on one point of it"
    // -- a mean does the opposite of that: it guarantees roughly half the
    // footprint is on the wrong side of it.
    //
    // heightAt is a pure function shared by roads, buildings and everything
    // else in the world; there is no per-feature override of it from the
    // renderer, so the terrain itself cannot be cut and filled here without
    // a new shared mechanism this pass does not build (named, not pursued --
    // see docs/audits/P3.5-FLOATING.md). Per Mark's own documented fallback
    // for exactly that case: the yard follows the ground in BANDS instead of
    // one plane. Real terminals are graded in terraces, not an infinite
    // slab -- cut and fill balance within each terrace, not across the
    // whole site.
    //
    // ONE dimension of banding was not enough: the worst residuals after the
    // first pass (measured) all sat at the SAME handful of x positions near
    // the yard's outer edge, meaning the relief here varies across x as much
    // as it does moving inland -- a strip that only bands by depth-from-quay
    // still averages away a real slope running the other way. So this is a
    // 2D grid, not a 1D strip (public/city-render.js's own `gradeGroundBands`,
    // extracted and unit-tested -- test/setPieceRefusal.test.ts -- and shared
    // with the golf course below, which carried the identical defect).
    const yardBands = gradeGroundBands(heightAt, { x0: _q.x - 900, x1: _q.x + 900, z0: _q.z + _qs * 70, z1: _q.z + _qs * 560 });
    const yardDry = yardBands.cellY.filter((v) => v !== null);
    stats.containerYardLevel = yardDry.length ? +(yardDry.reduce((a, b) => a + b, 0) / yardDry.length).toFixed(1) : null;
    stats.containerYardBands = yardBands.cellY.map((v) => (v === null ? null : +v.toFixed(1)));
    stats.containerYardCellsRefused = yardBands.refused;

    // P3.7.1 -- THE AIRPORT ALREADY DID THIS. THE YARD DID NOT.
    //
    // Grading each container to its own band's level closed most of the gap
    // (P3.6.1) but left containers resting on nothing visible -- there was no
    // yard SURFACE, only the bare hillside underneath and the containers
    // floating at their graded Y regardless of what the real ground did in
    // between. The airport's own embankment (public/city-render.js,
    // "env:airport-embankment") already builds a real earthwork: a platform,
    // with a batter carried down to true terrain at its edges. That is what a
    // container terminal on sloping ground actually is, and it is the fix,
    // not a finer grid or an unreachable relocation (P3.6.1).
    //
    // A terraced pad, one quad per graded cell (buildEmbankmentSkirt's
    // sibling, platformCells) -- not one infinite plane, because the whole
    // point is that the yard is NOT one level -- plus a skirt around the
    // footprint's outer perimeter carrying each edge cell's own level down to
    // real heightAt, exactly the airport's technique, generalised to a
    // varying top instead of one constant (buildEmbankmentSkirt).
    const yardPaveMat = M(0x9a9488, 0.96);
    const yardSkirtMat = M2(0x8a7d5c, 0.97);
    {
      // ONE merged mesh, not one per cell (140 of them tripped the A5.2/A5.3
      // draw-call gate the first time this landed) -- mergedPlatformGeometry,
      // shared with the golf course and the airport below.
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(mergedPlatformGeometry(yardBands), 3));
      pg.computeVertexNormals();
      const pave = new THREE.Mesh(pg, yardPaveMat);
      pave.name = "env:container-yard-platform"; // a graded, terraced pad by design -- see the airport's identical "env:airport-platform"
      pave.position.y = 0.05;
      pave.receiveShadow = true;
      scene.add(pave);
    }
    for (const edge of buildEmbankmentSkirt(heightAt, yardBands, (x, z) => bandLevelAt(yardBands, x, z))) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(edge.positions, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, yardSkirtMat);
      m.name = "env:container-yard-embankment"; // carries the graded pad down to real terrain, per-point, on all four sides -- the airport's own mechanism, shared
      m.receiveShadow = true;
      scene.add(m);
    }

    const portCenterZ = _q.z + _qs * 300;
    const portLOD = new THREE.LOD();
    portLOD.name = "container-port-yard";
    portLOD.position.set(_q.x, 0, portCenterZ);

    for (let x = _q.x - 900; x < _q.x + 900 && n < 2200; x += 16)
      for (let z = _q.z + _qs * 70; _qs > 0 ? z < _q.z + _qs * 560 : z > _q.z + _qs * 560; z += _qs * 4) {
        if (rnd("ct" + x + z) < 0.42) continue;
        // Still refuse to stack in the water -- the yard is level, not blind.
        if (heightAt(x, z) < 1) continue;
        const g = bandLevelAt(yardBands, x, z);
        if (g === null) continue; // this cell's own ground refused -- do not place, do not guess
        const stack = 1 + Math.floor(rnd("cs" + x + z) * 4);
        for (let k = 0; k < stack && n < 2200; k++) {
          d.position.set(x - _q.x, g + 1.4 + k * 2.7, z - portCenterZ); d.scale.set(1, 1, 1); d.updateMatrix();
          inst.setMatrixAt(n, d.matrix);
          inst.setColorAt(n, c.setHex(cc[Math.floor(rnd("cc" + x + z + k) * cc.length) % cc.length]));
          n++;
        }
      }
    inst.count = n; inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.computeBoundingSphere();
    portLOD.addLevel(inst, 0);
    portLOD.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 4000);
    scene.add(portLOD);
    stats.containers = n;

    // Cranes go ON THE QUAY. Fixed at z = -2300 they stood in open water,
    // because the mainland coast has a bay at this end and the shoreline is
    // hundreds of metres further north here than the constant assumed. Walk
    // north until the ground comes up, then stand just inland of it.
    for (let x = _q.x - 800; x < _q.x + 800; x += 400) {
      // The quay line is known now, so this no longer marches until the ground
      // comes up -- a search whose own comment admitted the coordinate it
      // replaced "stood in open water". (The `let quayZ = null; ... if (quayZ
      // === null) continue;` that survived that change was a guard that could
      // never fire, left behind by the search it used to protect.)
      const quayZ = _q.z + _qs * 30;
      const craneH = groundOrRefuse(heightAt, x, quayZ);
      // This one crane is skipped, not the whole quay.
      if (craneH === null) { stats.setPieceRefused.push({ id: `container-port-crane@${x}`, reason: "site is underwater" }); continue; }
      const g = new THREE.Group(), gy = craneH;
      g.name = "container-port-crane";
      for (const dx of [-24, 24]) for (const dz of [-17, 17]) {
        const leg = new THREE.Mesh(RB(3, 56, 3, 0.3), M(0xe0673a, 0.75));
        leg.position.set(dx, 28, dz); leg.castShadow = true; g.add(leg);
      }
      const beam = new THREE.Mesh(RB(136, 5, 6, 0.4), M(0xe0673a, 0.75));
      beam.name = "container-port-crane-boom"; // mounted atop the 56m leg lattice, not the ground
      beam.position.set(26, 58, 0); beam.castShadow = true; g.add(beam);
      const house = new THREE.Mesh(RB(13, 9, 13, 0.5), M(0xf0ece2, 0.8));
      house.name = "container-port-crane-cab"; // mounted atop the 56m leg lattice, not the ground
      house.position.set(0, 64, 0); g.add(house);
      g.position.set(x, gy, quayZ); scene.add(g);
    }
  }

  // ---------------------------------------------------------------------------
  // STREET FURNITURE
  //
  // Bins, benches and bus shelters on the footways of the dense core. Individually
  // trivial; collectively the difference between a street and a corridor between
  // two rows of massing. Instanced, so the whole lot is three draw calls.
  // ---------------------------------------------------------------------------
  {
    // LAMPS CLAIM THEIR GROUND FIRST, AND THAT ORDER IS A DECISION.
    //
    // Whichever loop ran first used to win by accident, and furniture ran first
    // purely because it appears earlier in this file. That would let a litter
    // bin veto a streetlight, which is a silly thing for a city to believe. A
    // lamp is infrastructure placed at a deliberate interval; a bin is
    // decoration that can move a few metres or not exist. So the positions are
    // computed here -- a pure function of the roads and the ground, the same
    // loop the lighting block below runs -- and claimed before anything else
    // touches a footway. The block below consumes this array rather than
    // recomputing it, so the two cannot disagree about where the lamps are.
    for (const r of api.plan.roads) {
      if (!ROADS[r.class] || ROADS[r.class].row < 18) continue;
      const ew = r.axis === "ew", spec = ROADS[r.class];
      for (let t = r.from + 24; t < r.to - 24; t += 52) for (const side of [-1, 1]) {
        const x = ew ? t : r.at + side * (spec.row / 2 - 1.4);
        const z = ew ? r.at + side * (spec.row / 2 - 1.4) : t;
        const h = heightAt(x, z); if (h < 1.2) continue;
        if (!claimProp("lampPost", x, z)) continue;
        lampPosts.push([x, h, z]);
      }
    }

    const spots = { bin: [], bench: [], shelter: [] };
    for (const r of world.roads) {
      const spec = ROADS[r.class];
      if (!spec || spec.footway <= 0) continue;
      if (r.bridge || r.connector) continue;
      const ew = r.axis === "ew";
      // only in the built-up core -- furniture in open country is litter
      const step = spec.row >= 40 ? 55 : 90;
      for (let t = r.from + 30; t < r.to - 30; t += step) {
        const across = spec.row / 2 - spec.footway * 0.45;
        for (const side of [-1, 1]) {
          const x = ew ? t : r.at + side * across;
          const z = ew ? r.at + side * across : t;
          if (!settAt(x, z)) continue;
          const g = heightAt(x, z);
          if (g < 1.2) continue;
          const k = rnd(`sf${r.id}${t}${side}`);
          // Ask before standing here. The roll decides WHAT would go in this
          // spot; the claim decides whether the spot is free. Keeping those two
          // separate matters: rerolling on refusal would quietly change the mix
          // of bins to benches wherever the city is crowded.
          if (k < 0.30) { if (claimProp("bin", x, z)) spots.bin.push([x, g, z]); }
          else if (k < 0.52) { if (claimProp("bench", x, z, { rotated: !ew })) spots.bench.push([x, g, z, ew]); }
          else if (k < 0.57 && spec.row >= 40) { if (claimProp("busShelter", x, z, { rotated: !ew })) spots.shelter.push([x, g, z, ew]); }
        }
      }
    }
    const put = (geo, mat, list, yOff, rotFromEw) => {
      if (!list.length) return 0;
      const chunks = new Map();
      list.forEach((p) => {
        const cx = useChunking ? Math.floor(p[0] / CHUNK_SIZE) : 0;
        const cz = useChunking ? Math.floor(p[2] / CHUNK_SIZE) : 0;
        const ck = `${cx},${cz}`;
        let cEntry = chunks.get(ck);
        if (!cEntry) {
          cEntry = [];
          chunks.set(ck, cEntry);
        }
        cEntry.push(p);
      });

      const emptyGeo = new THREE.BufferGeometry();
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      const o = new THREE.Object3D();
      for (const [ck, cList] of chunks.entries()) {
        const [cx, cz] = ck.split(",").map(Number);
        const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
        const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
        const lod = new THREE.LOD();
        if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

        const inst = new THREE.InstancedMesh(geo, mat, cList.length);
        cList.forEach((p, i) => {
          const px = useChunking ? (p[0] - chunkCenterX) : p[0];
          const pz = useChunking ? (p[2] - chunkCenterZ) : p[2];
          o.position.set(px, p[1] + yOff, pz);
          o.rotation.set(0, rotFromEw && p[3] ? Math.PI / 2 : 0, 0);
          o.scale.setScalar(1);
          o.updateMatrix();
          inst.setMatrixAt(i, o.matrix);
        });
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = true;
        inst.computeBoundingSphere();
        lod.addLevel(inst, 0);
        const cullMesh = new THREE.Mesh(emptyGeo, dummyMat);
        lod.addLevel(cullMesh, 500);
        scene.add(lod);
      }
      return list.length;
    };
    // THE SAME STRING NOW CLAIMS THE GROUND AND DRAWS THE THING.
    //
    // Twenty lines up, claimProp("bin", ...) decides whether this square metre
    // is free. Here, propGeometry("bin", ...) decides what stands on it. Until
    // prop-models.js those were a manifest id and a hand-written primitive with
    // nothing holding them together, and they had already drifted:
    //
    //   bin      CylinderGeometry(0.32, 0.28, 1.0, 6)   a six-sided tube
    //   bench    BoxGeometry(1.8, 0.45, 0.55)           a box
    //   shelter  BoxGeometry(3.6, 2.5, 1.4)             a box
    //
    // yOff was the tell. It lifted each primitive by half its own height to
    // stand it on the ground -- 0.5 for a 1.0 m bin, 1.25 for a 2.5 m shelter,
    // both exactly right. The bench got 0.35 for a 0.45 m box, which is half of
    // 0.7, not half of 0.45: every bench in the downtown core stood 12.5 cm in
    // the air. Nothing could see it, because the number that was wrong lived at
    // a call site and the height it was meant to halve lived in a constructor
    // argument on the same line.
    //
    // The library's origin is "base-centre" -- (0,0,0) is the centre of the
    // footprint AT GROUND LEVEL -- so there is no lift to get wrong any more.
    // yOff is 0 for all three, and that is not a tuning choice, it is what the
    // model contract in docs/WORLD-RULES.md section 4 already says.
    const nBin = put(propGeometry("bin", THREE), M(0x3f4a44, 0.7), spots.bin, 0, false);
    const nBench = put(propGeometry("bench", THREE), M(0xa9835a, 0.85), spots.bench, 0, true);
    const nShel = put(propGeometry("busShelter", THREE), M(0x9fc4dd, 0.25, 0.4), spots.shelter, 0, true);
    stats.streetFurniture = nBin + nBench + nShel;
    // Refusals are a fact about the world, reported rather than swallowed --
    // the same reasoning as refusedWhy for buildings. An empty object here
    // means nothing collided, which is a claim worth being able to check.
    stats.propRefused = { ...propRefused };
  }

  // ---------------------------------------------------------------------------
  // THE RAILWAY
  //
  // A city this size has one, and its absence was conspicuous: a port, an
  // airport, a container terminal and no way to move any of it inland. Routed
  // along the coastal corridor a few hundred metres behind the shore, which is
  // where a coastal main line actually goes -- flat ground, serves the towns,
  // out of the way of the beach.
  //
  // Built as instanced sleepers and two continuous rails so it costs two draw
  // calls rather than one per tie.
  // ---------------------------------------------------------------------------
  railway: {
    // A RAILWAY IS THE LEAST FORGIVING SURFACE IN THE WORLD.
    //
    // This followed the raw ground -- `heightAt(x, RAIL_Z)` plus a fixed 0.9 m --
    // which is the same drape defect the roads had, except worse. A road can
    // climb 8%; an adhesion railway is done at about 2.5%, and the EU TSI caps
    // even passenger-dedicated high-speed line at 3.5% with a 10 km moving
    // average of 2.5%. A line pinned to fbm noise is not a railway, it is a
    // rollercoaster. See docs/CITY-PLANNING-SPEC.md §4.1.
    //
    // Railways answer this with heavy earthworks -- embankment, cutting, viaduct --
    // far more than roads do, because the gradient limit leaves them no choice.
    // So the formation is graded at GRADE.RAIL with a generous deviation budget.
    // THE ONE FEATURE THAT STILL FELL BACK TO ITS LITERAL.
    //
    // This read `SITE.railway || { at: wm(-3900) }`. Every other feature breaks
    // out when placement fails -- port, golf, airport, stadium -- and the rule is
    // stated at the top of buildProps: anything that cannot be placed is absent
    // from SITE, so its geometry does not run. The railway alone would instead
    // draw itself on the un-vetted drawn-world coordinate: the exact 15.2%
    // drape the corridor search exists to prevent, restored without a word.
    const _rw = SITE.railway;
    if (!_rw) break railway;   // no buildable corridor: build no railway
    const RAIL_Z = _rw.at;
    const RAIL_FROM = _rw.from;
    const RAIL_TO = _rw.to;
    const railGrade = gradeRun(heightAt, { axis: "ew", at: RAIL_Z, from: RAIL_FROM, to: RAIL_TO },
                               { step: 40, window: RAIL_ALIGNMENT.window,
                                 maxGrade: RAIL_ALIGNMENT.maxGrade, maxDev: RAIL_ALIGNMENT.maxDev });
    // 30 m matches the budget findCorridor used to CHOOSE this line. A smaller
    // budget here would silently build a different, steeper railway than the one
    // the corridor search approved.
    const pts = [];
    for (let x = RAIL_FROM; x <= RAIL_TO; x += 60) {
      // The formation is graded, but it still cannot cross open water or climb
      // into the range -- tested against the NATURAL ground, which is what is
      // actually wet.
      const nat = heightAt(x, RAIL_Z);
      if (nat < 2 || nat > 240) { pts.push(null); continue; }
      pts.push([x, railGrade.y(x) + 0.9, RAIL_Z]);
    }
    stats.railway = {
      at: Math.round(RAIL_Z), lengthKm: +((RAIL_TO - RAIL_FROM) / 1000).toFixed(1),
      maxFill: +railGrade.maxFill.toFixed(1), maxCut: +railGrade.maxCut.toFixed(1),
    };
    const railM = M(0x6b6f74, 0.55, 0.55), tieM = M(0x4a4038, 0.95);
    const tieG = new THREE.BoxGeometry(3.2, 0.35, 0.42);
    const ties = [];
    for (let i = 0; i < pts.length; i += 2) if (pts[i]) ties.push(pts[i]);
    const tI = new THREE.InstancedMesh(tieG, tieM, ties.length);
    const dd = new THREE.Object3D();
    ties.forEach((p, i) => { dd.position.set(p[0], p[1], p[2]); dd.rotation.set(0, 0, 0); dd.scale.setScalar(1); dd.updateMatrix(); tI.setMatrixAt(i, dd.matrix); });
    tI.instanceMatrix.needsUpdate = true; tI.receiveShadow = true; tI.computeBoundingSphere();
    scene.add(tI);
    // the two rails, as continuous ribbons
    for (const off of [-0.72, 0.72]) {
      const pos = [], idx = [];
      let n = 0;
      for (const p of pts) {
        if (!p) continue;
        pos.push(p[0], p[1] + 0.28, p[2] + off - 0.06, p[0], p[1] + 0.28, p[2] + off + 0.06);
        n++;
      }
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, railM));
    }
    // Trains sit at fractions ALONG the line rather than at absolute positions,
    // so they stay on their own railway wherever it ends up.
    for (const [frac, cars] of [[0.23, 7], [0.53, 9], [0.79, 6]]) {
      const tx = RAIL_FROM + (RAIL_TO - RAIL_FROM) * frac;
      const gy = railGrade.y(tx) + 1.9;
      for (let c = 0; c < cars; c++) {
        const cx = tx + c * 24;
        const body = new THREE.Mesh(RB(21, 3.6, 3.1, 0.7), M(c === 0 ? 0xc4453a : 0xdfe3e6, 0.5, 0.2));
        body.position.set(cx, gy, RAIL_Z); body.castShadow = true; scene.add(body);
      }
    }
    stats.railTies = ties.length;
  }

  // ---------------------------------------------------------------------------
  // THE GOLF COURSE
  //
  // Land use a city actually has and this one did not: a large piece of managed
  // open green with water, sand and no buildings. It reads instantly from the
  // air and it is the sort of thing whose absence makes a model look like a
  // model.
  // ---------------------------------------------------------------------------
  golf: {
    // A golf course needs 1.5 km of continuous ground that is not water, cliff or
    // mountainside. Asked for, not asserted -- the rough radius is 760 m, so the
    // footprint tested is the whole course.
    const _gf = SITE.golf;
    if (!_gf) break golf;   // no room for a course: build none rather than one in the sea
    const CX = _gf.x, CZ = _gf.z;
    const fair = M(0x74a84a, 0.95), rough = M(0x5c8a3c, 0.97);
    const sand = M(0xe6d8a8, 0.95), water = M(0x2f7d99, 0.2, 0.4);
    // ONE HEIGHT SAMPLE FOR A 1,520 m DISC -- THE AIRPORT'S DOCUMENTED DEFECT.
    //
    // The airport comment sixty lines below says exactly why this is wrong:
    // "`ay` was ONE height sample ... clipping into a hill at one end and
    // floating over air at the other." The golf course does the same thing on a
    // larger footprint, and its own site object ALREADY CARRIES the answer:
    // findSite measured `range: 107.6 m` of relief across this ground and handed
    // it over. Nothing read it.
    //
    // FEATURES.golf has no `limit`, so placeFeatures reported placed: true,
    // moved: 0 for a site with 108 m of relief -- a true statement about a
    // constraint nobody set.
    //
    // P3.6.3 -- carried the identical defect the container yard did (a
    // single mean over a wide footprint), fixed the same way, on purpose:
    // gradeGroundBands, the same shared function, not a second answer to
    // the same defect. The course is a 1,520 m disc, CX +/- 760 in both
    // axes (no along/inland asymmetry the way the quay has), so a square
    // grid is passed directly.
    const golfBands = gradeGroundBands(heightAt, { x0: CX - 760, x1: CX + 760, z0: CZ - 760, z1: CZ + 760 }, { cellX: 150, cellZ: 150 });
    const golfDry = golfBands.cellY.filter((v) => v !== null);
    const golfLo = golfDry.length ? Math.min(...golfDry) : null, golfHi = golfDry.length ? Math.max(...golfDry) : null;
    stats.golf = golfDry.length
      ? { base: +(golfDry.reduce((a, b) => a + b, 0) / golfDry.length).toFixed(1), relief: +(golfHi - golfLo).toFixed(1), cellsRefused: golfBands.refused }
      : { base: null, relief: null, cellsRefused: golfBands.refused };
    // P3.7.1 -- the same earthwork the container yard now gets, not a third
    // different answer to the same defect: a terraced pad plus a skirt
    // carrying each edge cell down to real terrain, shared via
    // platformCells/buildEmbankmentSkirt.
    const golfPaveMat = M(0x5c8a3c, 0.97);
    const golfSkirtMat = M2(0x51763a, 0.97);
    {
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(mergedPlatformGeometry(golfBands), 3));
      pg.computeVertexNormals();
      const pave = new THREE.Mesh(pg, golfPaveMat);
      pave.name = "env:golf-course-platform"; // graded/terraced pad, same reasoning as the airport's and the yard's
      pave.position.y = 0.02;
      pave.receiveShadow = true;
      scene.add(pave);
    }
    for (const edge of buildEmbankmentSkirt(heightAt, golfBands, (x, z) => bandLevelAt(golfBands, x, z))) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(edge.positions, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, golfSkirtMat);
      m.name = "env:golf-course-embankment";
      m.receiveShadow = true;
      scene.add(m);
    }
    // the rough: one big soft footprint
    const base = new THREE.Mesh(new THREE.CircleGeometry(760, 22), rough);
    base.name = "golf-course";
    { const g = bandLevelAt(golfBands, CX, CZ); if (g !== null) { base.rotation.x = -Math.PI / 2; base.position.set(CX, g + 0.35, CZ); base.receiveShadow = true; scene.add(base); } }
    // fairways: nine mown strips at varied angles
    for (let i = 0; i < 9; i++) {
      const a = rnd("gf" + i) * Math.PI * 2;
      const r = 180 + rnd("gr" + i) * 420;
      const fx = CX + Math.cos(a) * r * 0.6, fz = CZ + Math.sin(a) * r * 0.6;
      const fg = bandLevelAt(golfBands, fx, fz);
      if (fg !== null) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(70 + rnd("gw" + i) * 40, 300 + rnd("gl" + i) * 220), fair);
        strip.name = "golf-course";
        strip.rotation.x = -Math.PI / 2; strip.rotation.z = a;
        strip.position.set(fx, fg + 0.42, fz); strip.receiveShadow = true; scene.add(strip);
      }
      // a green with a bunker beside it
      const grX = fx + Math.cos(a) * 150, grZ = fz + Math.sin(a) * 150;
      const grG = bandLevelAt(golfBands, grX, grZ);
      if (grG !== null) {
        const gr = new THREE.Mesh(new THREE.CircleGeometry(26, 12), fair);
        gr.name = "golf-course";
        gr.rotation.x = -Math.PI / 2; gr.position.set(grX, grG + 0.5, grZ); scene.add(gr);
      }
      const bkX = fx + Math.cos(a + 1) * 172, bkZ = fz + Math.sin(a + 1) * 172;
      const bkG = bandLevelAt(golfBands, bkX, bkZ);
      if (bkG !== null) {
        const bk = new THREE.Mesh(new THREE.CircleGeometry(15, 10), sand);
        bk.name = "golf-course";
        bk.rotation.x = -Math.PI / 2; bk.position.set(bkX, bkG + 0.46, bkZ); scene.add(bk);
      }
    }
    // a water hazard and the clubhouse
    { const g = bandLevelAt(golfBands, CX + 240, CZ - 180);
      if (g !== null) {
        const pond = new THREE.Mesh(new THREE.CircleGeometry(88, 16), water);
        pond.name = "golf-course-pond"; // sits at its own water level, not heightAt
        pond.rotation.x = -Math.PI / 2; pond.position.set(CX + 240, g + 0.44, CZ - 180); scene.add(pond);
      } }
    { const g = bandLevelAt(golfBands, CX - 520, CZ + 380);
      if (g !== null) {
        const club = new THREE.Mesh(RB(62, 10, 30, 0.8), M(0xf2ece0, 0.85));
        club.name = "golf-clubhouse";
        club.position.set(CX - 520, g + 5, CZ + 380); club.castShadow = true; scene.add(club);
        const croof = new THREE.Mesh(new THREE.ConeGeometry(44, 9, 4), M(0x8a5a3c, 0.85));
        croof.name = "golf-clubhouse-roof"; // mounted on top of the clubhouse, not the ground
        croof.position.set(CX - 520, g + 14, CZ + 380); croof.rotation.y = Math.PI / 4; croof.castShadow = true; scene.add(croof);
      } }
    // Was `stats.golf = 9`, silently overwriting the base/relief object set
    // above with a fairway count -- a pre-existing collision, found while
    // fixing P3.6.3, not introduced by it.
    stats.golfFairways = 9;
  }

  // --- airport ---
  airport: {
    const rwMat = M(0x3b4045, 0.95), mkMat = M(0xf2ead2, 0.8), apMat = M(0x555c63, 0.94);

    // AN AIRPORT IS AN EARTHWORK, NOT A DECAL.
    //
    // `ay` was ONE height sample. Everything below -- a 3,400 m runway plane, a
    // 3,200 m taxiway, a 900 x 420 apron -- was then drawn flat at that single
    // height. Measured along the actual runway line, the ground varies by 42.3 m.
    // So the runway was clipping into a hill at one end and floating over air at
    // the other, by the height of a twelve-storey building.
    //
    // Relocating does not fix it. The flattest DRY 3.4 km run anywhere in this
    // world varies by 11.3 m, and the flattest 3,600 x 1,400 AREA within 5 km
    // still varies by 34 m -- and sits 4 km from the airport road and the airport
    // settlement, so moving there would strand it. There is no site; the premise
    // that a runway can be laid on undisturbed ground is simply false.
    //
    // Which is exactly what real airports discovered. They are enormous graded
    // platforms: cut into the high side, built out on the low side, with
    // embankments down to the surrounding land. Hong Kong, Madeira and Gibraltar
    // are the dramatic cases; every airport does it.
    //
    // So the platform is now explicit. Its level is the MEAN of the ground it
    // covers, so cut and fill roughly balance the way real earthworks are
    // designed, and an embankment skirt carries it down to the terrain. The
    // runway is honest tarmac on honest ground instead of a plane hanging in
    // space.
    // ONE AIRPORT, NOT TWELVE COORDINATES.
    //
    // Every part of this used to carry its own absolute position: runways,
    // taxiway, apron, terminal, jetways, tower and sixteen aircraft, thirteen
    // literals in all. Nothing tied them together, so nothing could move the
    // airport -- and one of them (the jetway z) was still unscaled after the
    // world shrank, sitting 1.7 km from the terminal it belonged to, because
    // there was no relationship for anything to check.
    //
    // Now there is an ORIGIN, chosen by asking the land, and everything else is
    // an offset from it in BUILT metres. The internal layout of an airport does
    // not shrink because the island did: two runways are 600 m apart because
    // that is the separation independent parallel approaches need.
    // Read from the manifest so the platform drawn is the platform that was vetted.
    const _apSpec = FEATURES.find((f) => f.id === "airport").need;
    const AP_W = _apSpec.w, AP_D = _apSpec.d;
    const apSite = SITE.airport;
    if (!apSite) break airport;   // nowhere to grade a platform: build no airport
    const AX = apSite.x, AZ = apSite.z;

    // AN AIRPORT IS AN EARTHWORK, NOT A DECAL.
    //
    // `ay` was ONE height sample, and a 3,400 m runway plane was drawn flat at
    // it over ground that varies by tens of metres -- clipping into a hill at one
    // end and floating over air at the other. Relocation alone cannot fix that:
    // the flattest dry 3.4 km run anywhere in this world varies by 11.3 m.
    //
    // P3.7.2 -- `Math.max(6, apSite.mean)` was an eighth fail-open floor of
    // exactly the pattern the P3.5 sweep removed seven of (absence read as
    // success: "no real mean" would have read as "+6 m"), missed because
    // apSite.mean is a pre-aggregated value, not a direct heightAt(x, z)
    // call, so it did not look like the other seven at a glance. Routed
    // through groundOrRefuse the same way, via a trivial constant heightAt.
    const apMean = groundOrRefuse(() => apSite.mean, AX, AZ);
    if (apMean === null) { stats.setPieceRefused.push({ id: "airport", reason: "site is underwater" }); break airport; }
    // And it was the SAME mean-Y defect as the yard and the golf course,
    // survivable only because the embankment hid the consequence: the whole
    // platform sat at one level while the ground under it varied by tens of
    // metres. Banded the same way, sharing the same mechanism end to end
    // (P3.7.1) -- gradeGroundBands over the platform's own AP_W x AP_D
    // footprint, a terraced pad (platformCells) instead of one plane, and
    // the embankment skirt now follows each edge cell's own level
    // (buildEmbankmentSkirt) instead of one constant `ay`.
    const apBands = gradeGroundBands(heightAt, { x0: AX - AP_W / 2, x1: AX + AP_W / 2, z0: AZ - AP_D / 2, z1: AZ + AP_D / 2 }, { cellX: 200, cellZ: 200 });
    const apDry = apBands.cellY.filter((v) => v !== null);
    const apLo = apDry.length ? Math.min(...apDry) : null, apHi = apDry.length ? Math.max(...apDry) : null;
    // ay stays as the platform's own MEAN -- reported for continuity and used
    // as the fallback level for features whose own cell refused -- but every
    // ground surface below now looks up its own local band, not this one
    // number, the same as the yard and the golf course.
    const ay = apMean;
    stats.airportPlatform = {
      level: +ay.toFixed(1), cut: apHi !== null ? +(apHi - ay).toFixed(1) : null,
      fill: apLo !== null ? +(ay - apLo).toFixed(1) : null, range: apDry.length ? +(apHi - apLo).toFixed(1) : null,
      moved: Math.round(apSite.moved), cellsRefused: apBands.refused,
    };
    const apLevelAt = (x, z) => { const v = bandLevelAt(apBands, x, z); return v === null ? ay : v; };

    // the platform, and an embankment skirt carrying it down to the terrain
    {
      const apPaveMat = M(0x7c8b63, 0.97);
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(mergedPlatformGeometry(apBands), 3));
      pg.computeVertexNormals();
      const pad = new THREE.Mesh(pg, apPaveMat);
      pad.name = "env:airport-platform"; // a graded plateau by design, not a placed object resting on one ground point
      pad.position.y = 0.05;
      pad.receiveShadow = true;
      scene.add(pad);
      // TWO OF THE FOUR SKIRTS WERE WOUND INSIDE-OUT AND DID NOT RENDER, in
      // the original single-constant version of this skirt -- see git
      // history for the diagnosis. buildEmbankmentSkirt (shared, P3.7.1)
      // keeps the DoubleSide fix: not depending on winding is the durable
      // answer for a strip only ever seen from outside anyway.
      const apSkirtMat = M2(0x6f7d58, 0.98);
      for (const edge of buildEmbankmentSkirt(heightAt, apBands, (x, z) => bandLevelAt(apBands, x, z))) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(edge.positions, 3));
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, apSkirtMat);
        m.name = "env:airport-embankment"; // carries the graded platform down to real terrain, per-point, on all four sides
        m.receiveShadow = true;
        scene.add(m);
      }
    }

    // Runway length is the clearest built dimension in the world: 3,400 m of
    // tarmac is what a wide-body needs to get airborne, on any size of island.
    for (const [dz, len] of [[450, 3400], [-150, 2800]]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(len, 60), rwMat);
      r.name = "env:airport-platform";
      r.rotation.x = -Math.PI / 2; r.position.set(AX, apLevelAt(AX, AZ + dz) + 0.5, AZ + dz); r.receiveShadow = true; scene.add(r);
      for (let x = -len / 2 + 90; x < len / 2 - 90; x += 140) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 3), mkMat);
        m.name = "env:airport-platform";
        m.rotation.x = -Math.PI / 2; m.position.set(AX + x, apLevelAt(AX + x, AZ + dz) + 0.56, AZ + dz); scene.add(m);
      }
    }
    const taxi = new THREE.Mesh(new THREE.PlaneGeometry(3200, 26), apMat);
    taxi.name = "env:airport-platform";
    taxi.rotation.x = -Math.PI / 2; taxi.position.set(AX, apLevelAt(AX, AZ + 150) + 0.48, AZ + 150); scene.add(taxi);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(900, 420), apMat);
    apron.name = "env:airport-platform";
    apron.rotation.x = -Math.PI / 2; apron.position.set(AX - 700, apLevelAt(AX - 700, AZ - 400) + 0.46, AZ - 400); apron.receiveShadow = true; scene.add(apron);
    // the terminal: a pier with jetways, so the apron reads as an airport rather
    // than a car park with aeroplanes on it
    const termY = apLevelAt(AX - 700, AZ - 130);
    const term = new THREE.Mesh(RB(520, 16, 78, 1.4), M(0xe8ecef, 0.6, 0.15));
    term.position.set(AX - 700, termY + 8, AZ - 130); term.castShadow = term.receiveShadow = true; scene.add(term);
    const troof = new THREE.Mesh(RB(540, 2.2, 92, 0.8), M(0xb9c2c8, 0.5, 0.3));
    troof.name = "airport-terminal-roof"; // mounted on top of the terminal, not the ground
    troof.position.set(AX - 700, termY + 17, AZ - 130); troof.castShadow = true; scene.add(troof);
    for (let i = 0; i < 6; i++) {
      const jx = AX - 920 + i * 92, jz = AZ - 240, jy = apLevelAt(jx, jz);
      const jet = new THREE.Mesh(RB(6, 4, 46, 0.6), M(0xd4d9dc, 0.6, 0.2));
      jet.position.set(jx, jy + 7, jz); jet.castShadow = true; scene.add(jet);
    }
    // control tower
    const twY = apLevelAt(AX - 1100, AZ - 30);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 42, 10), M(0xeae4d6, 0.8));
    tw.position.set(AX - 1100, twY + 21, AZ - 30); tw.castShadow = true; scene.add(tw);
    const cab = new THREE.Mesh(RB(15, 8, 15, 1.2), M(0x9fc4dd, 0.3, 0.4));
    cab.name = "airport-tower-cab"; // mounted on top of the control tower mast, not the ground
    cab.position.set(AX - 1100, twY + 45, AZ - 30); cab.castShadow = true; scene.add(cab);
    for (let i = 0; i < 16; i++) {
      const x = AX - 1100 + rnd("ap" + i) * 820;
      const z = AZ - 570 + Math.floor(rnd("aq" + i) * 3) * 110;
      const py = apLevelAt(x, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 42, 12), M(0xf8f8f6, 0.45, 0.25));
      body.rotation.z = Math.PI / 2; body.position.set(x, py + 6, z); body.castShadow = true; scene.add(body);
      const wing = new THREE.Mesh(RB(9, 1.3, 40, 0.4), M(0xecebe7, 0.45, 0.25));
      wing.position.set(x, py + 5, z); wing.castShadow = true; scene.add(wing);
      const tail = new THREE.Mesh(RB(1.2, 13, 9, 0.4), M(0xd94f3d, 0.6));
      tail.position.set(x - 18, py + 13, z); tail.castShadow = true; scene.add(tail);
    }
  }

  // --- farm fields: a crop patchwork. Colour is what makes farmland read. ---
  {
    const crops = [0xc9b471, 0xa8bd66, 0xd9c98a, 0x8fae5c, 0xe0cf94, 0xbcae72, 0x9db85f];
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    // Farm belts are checked cell by cell below (h < 3 is skipped), so the belt
    // rectangle itself only has to land on the right part of the world.
    // Belts are centred on their resolved sites rather than being two literal
    // rectangles. Each cell is still tested individually below.
    const belts = [];
    for (const [id, bw, bd] of [["farmWest", 2400, 2400], ["farmEast", 1600, 2400]]) {
      const f = SITE[id];
      if (f) belts.push([f.x - bw / 2, f.x + bw / 2, f.z - bd / 2, f.z + bd / 2]);
    }
    const cells = [];
    for (const [x0, x1, z0, z1] of belts)
      for (let x = x0; x < x1; x += 260) for (let z = z0; z < z1; z += 200) {
        const h = heightAt(x + 130, z + 100);
        if (h < 3) continue;
        cells.push([x, z, h]);
      }
    const inst = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.97 }), cells.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    cells.forEach(([x, z, h], i) => {
      d.position.set(x + 130, h + 0.4, z + 100); d.scale.set(246, 1, 186); d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, c.setHex(crops[Math.floor(rnd("cr" + x + z) * crops.length) % crops.length]));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.receiveShadow = true; inst.computeBoundingSphere(); scene.add(inst);
    stats.fields = cells.length;
  }

  // ---------------------------------------------------------------------------
  // THE MARINA
  //
  // A real one, in the dredged basin behind the breakwater on the island's east
  // side: a stone arm sheltering the mouth, a spine pontoon with finger berths,
  // a fleet on the moorings, a fuel dock, a hardstanding, and a clubhouse on the
  // quay. The previous four "marinas" were identical pontoon rectangles dropped
  // at four coordinates with no basin, no shelter and no shore.
  // ---------------------------------------------------------------------------
  {
    const pon = M(0xe6dcc6, 0.9), hull = M(0xf8f6f0, 0.62, 0.05);
    const stone = M(0xb8b2a4, 0.95), teak = M(0xa9835a, 0.85);

    // --- the breakwater arm ---
    for (let i = 0; i < MARINA.breakwater.length - 1; i++) {
      const [ax, az] = MARINA.breakwater[i], [bx, bz] = MARINA.breakwater[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const arm = new THREE.Mesh(RB(22, 7, len * 1.06, 1.2), stone);
      arm.position.set((ax + bx) / 2, 1.4, (az + bz) / 2);
      arm.rotation.y = Math.atan2(bx - ax, bz - az);
      arm.castShadow = true; arm.receiveShadow = true; scene.add(arm);
    }
    // a light at the head of the arm
    const head = MARINA.breakwater[MARINA.breakwater.length - 1];
    const bcn = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 9, 8), M(0xe8e2d4, 0.8));
    bcn.position.set(head[0], 9, head[1]); bcn.castShadow = true; scene.add(bcn);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3fbf6a, emissive: 0x1a5a30 }));
    lamp.position.set(head[0], 14.5, head[1]); scene.add(lamp);

    // --- pontoons: a spine along the basin with fingers off it ---
    const boats = [];
    const spineLen = MARINA.r * 1.7;
    const spine = new THREE.Mesh(RB(spineLen, 1.4, 6, 0.4), pon);
    spine.name = "marina-pontoon";
    spine.position.set(MARINA.x, 1.2, MARINA.z); spine.receiveShadow = true;
    spine.castShadow = true; scene.add(spine);
    for (let i = -spineLen / 2 + 20; i <= spineLen / 2 - 20; i += 24) {
      for (const dir of [-1, 1]) {
        const fl = MARINA.r * 0.52;
        const f = new THREE.Mesh(RB(4.5, 1.3, fl, 0.35), pon);
        f.name = "marina-pontoon";
        f.position.set(MARINA.x + i, 1.2, MARINA.z + dir * (fl / 2 + 3));
        f.receiveShadow = true; f.castShadow = true; scene.add(f);
        for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
          if (rnd("mb" + i + dir + side + k) < 0.24) continue;
          const bl = 8 + rnd("ml" + i + dir + side + k) * 9;
          boats.push([MARINA.x + i + side * 5.2, MARINA.z + dir * (10 + k * 15), bl,
                      rnd("mt" + i + dir + side + k)]);
        }
      }
    }
    // --- the fleet ---
    {
      const bg = RB(4.6, 2.6, 1, 0.7);
      const inst = new THREE.InstancedMesh(bg, hull, boats.length);
      const cg = RB(3.2, 2.0, 1, 0.5);
      const cabs = new THREE.InstancedMesh(cg, M(0xdfe6ea, 0.5, 0.1), boats.length);
      const mg = new THREE.CylinderGeometry(0.22, 0.28, 1, 5);
      const masts = new THREE.InstancedMesh(mg, M(0xf2f0ea, 0.6), boats.length);
      const d = new THREE.Object3D();
      let nm = 0;
      boats.forEach(([bx, bz, bl, t], i) => {
        d.position.set(bx, 1.7, bz); d.rotation.set(0, 0, 0); d.scale.set(1, 1, bl);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
        d.position.set(bx, 3.7, bz); d.scale.set(1, 1, bl * 0.34);
        d.updateMatrix(); cabs.setMatrixAt(i, d.matrix);
        if (t > 0.42) {                                  // sailing boats carry a mast
          const mh = bl * 1.5;
          d.position.set(bx, 3 + mh / 2, bz); d.scale.set(1, mh, 1);
          d.updateMatrix(); masts.setMatrixAt(nm++, d.matrix);
        }
      });
      masts.count = nm;
      inst.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = masts.instanceMatrix.needsUpdate = true;
      inst.castShadow = cabs.castShadow = masts.castShadow = true;
      inst.computeBoundingSphere(); cabs.computeBoundingSphere(); masts.computeBoundingSphere();
      inst.name = cabs.name = masts.name = "marina-boat-afloat";
      scene.add(inst, cabs, masts);
      stats.marinaBoats = boats.length;
    }
    // --- the quay: clubhouse, hardstanding, fuel dock ---
    marinaQuay: {
      const qz = MARINA.z - MARINA.r - 40, qx = MARINA.x + 30;
      const quayH = groundOrRefuse(heightAt, qx, qz);
      if (quayH === null) { stats.setPieceRefused.push({ id: "marina-clubhouse", reason: "site is underwater" }); break marinaQuay; }
      const gy = quayH;
      const club = new THREE.Mesh(RB(58, 11, 26, 0.8), M(0xf2ece0, 0.85));
      club.name = "marina-clubhouse"; club.position.set(qx, gy + 5.5, qz); club.castShadow = true; club.receiveShadow = true; scene.add(club);
      const roof = new THREE.Mesh(RB(62, 1.4, 30, 0.5), M(0x4d8fa6, 0.8));
      roof.name = "marina-clubhouse-roof"; roof.position.set(qx, gy + 11.6, qz); roof.castShadow = true; scene.add(roof);
      const deck = new THREE.Mesh(RB(70, 0.6, 14, 0.3), teak);
      deck.name = "marina-clubhouse-deck"; deck.position.set(qx, gy + 0.5, qz + 22); deck.receiveShadow = true; scene.add(deck);
      // boats out of the water on the hardstanding
      for (let i = 0; i < 9; i++) {
        const hx = qx - 90 + (i % 5) * 22, hz = qz + Math.floor(i / 5) * 18;
        const hardH = groundOrRefuse(heightAt, hx, hz);
        if (hardH === null) { stats.setPieceRefused.push({ id: `marina-hauled-out-boat@${i}`, reason: "site is underwater" }); continue; }
        const g2 = hardH;
        const b = new THREE.Mesh(RB(4.4, 2.4, 12, 0.7), hull);
        b.name = "marina-hauled-out-boat";
        b.position.set(hx, g2 + 2.6, hz); b.castShadow = true; scene.add(b);
      }
    }
  }

  // --- CALIBRATION MARKERS (?markers=1) --------------------------------------
  //
  // Bright pillars at known world coordinates. Rendering them and finding them
  // in the image gives an EXACT pixel->metres mapping for a given camera, which
  // is the only way to convert a hand-drawn overlay into real geometry. Deriving
  // it from the camera maths instead would be a guess about projection, and
  // guessing about coordinates is what produced several wrong passes.
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("markers") === "1") {
    const MARKS = [[-15000, 0], [15000, 0], [0, -8000], [0, 4000], [-15000, -8000], [15000, 4000]]
      .map(([x, z]) => [wm(x), wm(z)]);
    const mm = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    for (const [mx, mz] of MARKS) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(420, 900, 420), mm);
      pin.position.set(mx, 420, mz);
      scene.add(pin);
    }
    stats.markers = MARKS.length;
  }

  // ---------------------------------------------------------------------------
  // RIVERS AND CANALS
  //
  // The trough is already cut into the height field; this is the water in it.
  // Each waterway gets a ribbon following its own surface, which descends to
  // sea level at the mouth -- a single sea-level plane cannot show a river
  // 120 m up a hillside, and a river that does not run downhill is worse than
  // no river.
  // ---------------------------------------------------------------------------
  {
    // (this runs in the detail pass, where the ?skip= set is not in scope)
    let quads = 0;
    for (const w of WATERWAYS) {
      const surf = waterwaySurface(w, heightAt);
      if (surf.length < 2) continue;
      const pos = [], idx = [];
      for (let i = 0; i < surf.length; i++) {
        const a = surf[Math.max(0, i - 1)], b = surf[Math.min(surf.length - 1, i + 1)];
        let nx = -(b.z - a.z), nz = (b.x - a.x);
        const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
        // rivers broaden toward the mouth; canals keep one width
        const t = i / (surf.length - 1);
        const hw = w.kind === "river" ? w.halfWidth * (0.45 + 0.55 * t) : w.halfWidth;
        const p = surf[i];
        pos.push(p.x + nx * hw, p.y, p.z + nz * hw);
        pos.push(p.x - nx * hw, p.y, p.z - nz * hw);
      }
      for (let i = 0; i < surf.length - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        quads++;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
        color: w.kind === "river" ? 0x2f6f86 : 0x2a7d94,
        roughness: 0.12, metalness: 0.34, transparent: true, opacity: 0.92,
      }));
      mesh.name = "env:waterway"; // a river/canal surface follows its own carved channel bed, not raw heightAt
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    stats.waterways = WATERWAYS.length;
    stats.waterwayQuads = quads;
  }

  // ---------------------------------------------------------------------------
  // THE PLEASURE PIER
  //
  // Walks out over the water on piles, with a pavilion at the head. It is the
  // one structure on the ocean side visible from right across the bay, and the
  // reason the beachfront has a centre instead of just running past.
  // ---------------------------------------------------------------------------
  {
    const deckM = M(0xc8b48f, 0.9), pileM = M(0x6b6257, 0.95);
    const roofM = M(0xd9534a, 0.8), wallM = M(0xf4efe2, 0.85);
    const len = PIER.to - PIER.from;

    const deck = new THREE.Mesh(RB(PIER.width, 2.2, len, 0.4), deckM);
    deck.name = "pier";
    deck.position.set(PIER.x, 6.2, (PIER.from + PIER.to) / 2);
    deck.castShadow = deck.receiveShadow = true;
    scene.add(deck);

    // piles, stopping where the deck meets the sand
    const pileG = new THREE.CylinderGeometry(PIER.pilings.radius, PIER.pilings.radius, 18, 6);
    const n = Math.floor(len / PIER.pilings.spacing);
    const piles = new THREE.InstancedMesh(pileG, pileM, n * 2);
    const d = new THREE.Object3D();
    let pi = 0;
    for (let i = 0; i < n; i++) {
      const z = PIER.from + i * PIER.pilings.spacing;
      for (const side of [-1, 1]) {
        d.position.set(PIER.x + side * (PIER.width / 2 - 2.5), -2.6, z);
        d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix();
        piles.setMatrixAt(pi++, d.matrix);
      }
    }
    piles.count = pi;
    piles.instanceMatrix.needsUpdate = true;
    piles.castShadow = true; piles.computeBoundingSphere();
    piles.name = "pier";
    scene.add(piles);

    // The pavilion at the seaward end.
    //
    // First attempt used a single wide cone for the roof: radius 56 on a
    // height of 11 read from the beach as a flat red disc floating over the
    // water, not a building. A roof needs to be steeper than it is wide.
    const hall = new THREE.Mesh(RB(PIER.head.w, 15, PIER.head.d, 0.8), wallM);
    hall.name = "pier"; hall.position.set(PIER.x, 14.6, PIER.head.z);
    hall.castShadow = hall.receiveShadow = true;
    scene.add(hall);
    // a hipped roof: four sides, taller than it is broad, with real eaves
    const roof = new THREE.Mesh(new THREE.ConeGeometry(PIER.head.w * 0.62, 22, 4), roofM);
    roof.name = "pier"; roof.position.set(PIER.x, 32, PIER.head.z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    scene.add(roof);
    // a smaller hall halfway out, so the pier has something along its length
    const mid = new THREE.Mesh(RB(30, 9, 34, 0.6), wallM);
    mid.name = "pier"; mid.position.set(PIER.x, 11.6, PIER.from + (PIER.to - PIER.from) * 0.42);
    mid.castShadow = true;
    scene.add(mid);
    const midRoof = new THREE.Mesh(new THREE.ConeGeometry(24, 12, 4), roofM);
    midRoof.name = "pier"; midRoof.position.set(PIER.x, 22, PIER.from + (PIER.to - PIER.from) * 0.42);
    midRoof.rotation.y = Math.PI / 4;
    midRoof.castShadow = true;
    scene.add(midRoof);

    // The big wheel. A bare torus is a hoop; what makes it read is the spokes,
    // the hub and the cabins hanging off the rim.
    {
      const wx = PIER.x - 58, wy = 40, wz = PIER.head.z - 40;
      const steel = M(0xe8e4d8, 0.55, 0.35);
      for (const off of [-5, 5]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(28, 1.6, 6, 30), steel);
        rim.name = "pier"; rim.position.set(wx + off, wy, wz);
        rim.castShadow = true;
        scene.add(rim);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 12, 8), steel);
      hub.name = "pier"; hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      scene.add(hub);
      const spokeG = new THREE.BoxGeometry(0.6, 56, 0.6);
      const spokes = new THREE.InstancedMesh(spokeG, steel, 8);
      const cabG = new THREE.BoxGeometry(4.4, 4.4, 5.2);
      const cabs = new THREE.InstancedMesh(cabG, M(0xd94f3d, 0.7), 12);
      const o = new THREE.Object3D();
      for (let i = 0; i < 8; i++) {
        o.position.set(wx, wy, wz); o.rotation.set(0, 0, (i / 8) * Math.PI);
        o.scale.setScalar(1); o.updateMatrix(); spokes.setMatrixAt(i, o.matrix);
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        o.position.set(wx, wy + Math.sin(a) * 28, wz + Math.cos(a) * 28);
        o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix();
        cabs.setMatrixAt(i, o.matrix);
      }
      spokes.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = true;
      spokes.castShadow = cabs.castShadow = true;
      spokes.computeBoundingSphere(); cabs.computeBoundingSphere();
      spokes.name = cabs.name = "pier";
      scene.add(spokes, cabs);
      // the legs it stands on
      for (const sx of [-16, 16]) {
        const leg = new THREE.Mesh(RB(2.2, 40, 2.2, 0.3), steel);
        leg.name = "pier";
        leg.position.set(wx + sx, wy - 22, wz);
        leg.castShadow = true;
        scene.add(leg);
      }
    }
    stats.pier = pi;
  }

  // ---------------------------------------------------------------------------
  // THE BOARDWALK
  //
  // Runs ALONG the back of the beach rather than out into the sea -- a
  // different job from the pier. Built as a chain of segments between the
  // declared points so it follows the crescent instead of cutting across it.
  // ---------------------------------------------------------------------------
  {
    const plank = M(0xbfa578, 0.92), rail = M(0xf2ede0, 0.8);
    let segs = 0;

    // A BOARDWALK IS A BUILT SURFACE AND WAS BEING DRAPED, ONE SAMPLE AT A TIME.
    //
    // Each segment took a single heightAt at its MIDPOINT and then laid a rigid
    // box between two points, so both ends were free to float above the sand or
    // sink into it, and consecutive segments stepped against each other. That is
    // the exact category error grade.js was written for -- a promenade is
    // manufactured, it is allowed to slope and not allowed to be lumpy.
    //
    // gradeRun does not fit here (the boardwalk is a polyline, not an axis-aligned
    // run), so the same idea is applied directly: sample the whole line first,
    // then smooth it. One pass, and the deck stops undulating.
    const bwRaw = BOARDWALK.points.map(([px, pz]) => heightAt(px, pz));
    const bwY = bwRaw.map((_, i) => {
      let sum = 0, n = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(bwRaw.length - 1, i + 2); j++) { sum += bwRaw[j]; n++; }
      return sum / n;
    });

    for (let i = 0; i < BOARDWALK.points.length - 1; i++) {
      const [ax, az] = BOARDWALK.points[i], [bx, bz] = BOARDWALK.points[i + 1];
      // Absence read as success: a point below DRY_ENOUGH used to be floored
      // to 1.2 m and built over anyway. Refuse this segment instead.
      if (bwRaw[i] < DRY_ENOUGH || bwRaw[i + 1] < DRY_ENOUGH) {
        stats.setPieceRefused.push({ id: `boardwalk@${i}`, reason: "site is underwater" });
        continue;
      }
      const len = Math.hypot(bx - ax, bz - az);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      // The mean of the two ENDS of this segment, off the smoothed profile --
      // so the deck is continuous across the joint instead of each segment
      // choosing its own height from its own midpoint.
      const g = (bwY[i] + bwY[i + 1]) / 2;
      const seg = new THREE.Mesh(RB(BOARDWALK.width, 1.1, len * 1.04, 0.3), plank);
      seg.name = "boardwalk";
      seg.position.set(mx, g + 0.9, mz);
      seg.rotation.y = -Math.atan2(bz - az, bx - ax) + Math.PI / 2;
      seg.receiveShadow = true;
      scene.add(seg);
      // the seaward railing, so it reads as a promenade rather than a path
      const r = new THREE.Mesh(RB(0.5, 1.5, len * 1.04, 0.2), rail);
      r.name = "boardwalk-railing"; // sits ON the deck, not the ground -- its reference surface is the boardwalk
      r.position.set(mx + Math.cos(seg.rotation.y) * (BOARDWALK.width / 2), g + 2.1, mz - Math.sin(seg.rotation.y) * (BOARDWALK.width / 2));
      r.rotation.y = seg.rotation.y;
      scene.add(r);
      segs++;
    }
    stats.boardwalk = segs;
  }

  // --- shipping and sail out in the bay ---
  {
    const hull = M(0xf7f4ec, 0.7), sail = M(0xffffff, 0.6);
    const cargo = M(0x2b4b63, 0.7);
    for (let i = 0; i < 320; i++) {
      const x = wm(-14000) + rnd("bx" + i) * wm(28000), z = wm(-3200) + rnd("bz" + i) * wm(7200);
      if (heightAt(x, z) > -3) continue;
      const s = 0.8 + rnd("bs" + i) * 1.2;
      const b = new THREE.Mesh(RB(16 * s, 3 * s, 5 * s, 0.6), hull);
      b.name = "coastal-boat-afloat";
      b.position.set(x, 1.1, z); b.rotation.y = rnd("br" + i) * 6.28; b.castShadow = true; scene.add(b);
      if (rnd("bt" + i) > 0.45) {
        const m2 = new THREE.Mesh(new THREE.ConeGeometry(3.2 * s, 13 * s, 3), sail);
        m2.name = "coastal-boat-afloat";
        m2.position.set(x, 8 * s, z); m2.rotation.y = b.rotation.y; m2.castShadow = true; scene.add(m2);
      }
    }
    for (let i = 0; i < 7; i++) {                       // container ships on the approach
      const x = wm(-9000) + rnd("sx" + i) * wm(12000), z = wm(-2600) + rnd("sz" + i) * wm(900);
      if (heightAt(x, z) > -6) continue;
      const b = new THREE.Mesh(RB(190, 16, 30, 1.5), cargo);
      b.name = "coastal-boat-afloat";
      b.position.set(x, 5, z); b.castShadow = true; scene.add(b);
      const sup = new THREE.Mesh(RB(22, 20, 26, 0.8), M(0xf0ece2, 0.8));
      sup.name = "coastal-boat-afloat";
      sup.position.set(x - 70, 22, z); sup.castShadow = true; scene.add(sup);
    }
  }

  // ---------------------------------------------------------------------------
  // PARKS AND PLAZAS
  //
  // Blocks the plan marked as PARK, drawn as parks: mown lawn, a pond, gravel
  // paths across the diagonals, a dense canopy and benches. A city with no
  // unbuilt ground in it is a warehouse estate -- the gaps are as legible from
  // the air as the buildings, and there were none.
  // ---------------------------------------------------------------------------
  {
    const lawn = M(0x6f9c4c, 0.96), path = M(0xcfc4ad, 0.95), pond = M(0x3f86a8, 0.15, 0.4);
    const quad = new THREE.PlaneGeometry(1, 1); quad.rotateX(-Math.PI / 2);
    const lawns = [], paths = [], ponds = [], benches = [];
    for (const b of (plan.parks || [])) {
      const cx = (b.xMin + b.xMax) / 2, cz = (b.zMin + b.zMax) / 2;
      const g = heightAt(cx, cz); if (g < 1) continue;
      const w = b.xMax - b.xMin, d = b.zMax - b.zMin;
      lawns.push([cx, g + 0.30, cz, w, d]);
      // two paths across it, and a third along one edge
      paths.push([cx, g + 0.42, cz, w, 5.5]);
      paths.push([cx, g + 0.42, cz, 5.5, d]);
      if (rnd("pk" + b.id) > 0.45) {
        ponds.push([cx + (rnd("px" + b.id) - 0.5) * w * 0.3, g + 0.36,
                    cz + (rnd("pz" + b.id) - 0.5) * d * 0.3, w * 0.30, d * 0.34]);
      }
      for (let i = 0; i < 4; i++) {
        benches.push([cx + (i < 2 ? -1 : 1) * 9, g + 0.9, cz + (i % 2 ? -1 : 1) * (d * 0.22)]);
      }
    }
    const flat = (list, mat, order) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(quad, mat, list.length);
      const d2 = new THREE.Object3D();
      list.forEach(([x, y, z, w, h], i) => {
        d2.position.set(x, y, z); d2.rotation.set(0, 0, 0); d2.scale.set(w, 1, h);
        d2.updateMatrix(); im.setMatrixAt(i, d2.matrix);
      });
      im.instanceMatrix.needsUpdate = true; im.receiveShadow = true;
      im.renderOrder = order; im.computeBoundingSphere(); scene.add(im);
    };
    flat(lawns, lawn, 0); flat(paths, path, 1); flat(ponds, pond, 2);
    if (benches.length) {
      // THE FIRST THING IN THIS WORLD DRAWN FROM THE MODEL LIBRARY.
      //
      // It was RB(2.2, 0.5, 0.7, 0.15) -- a rounded box, 2.2 m long, standing in
      // for a bench. The asset lane's bench-slat has legs, back posts, two seat
      // planks and a back plank, and it is 1.8 x 0.6 m, which is what
      // prop-manifest.js has claimed as a bench's ground all along.
      //
      // So the box was also the wrong size: 2.2 m of geometry over a 1.8 m
      // claim, overhanging its own footprint by 20 cm at each end. That is the
      // reason prop-models.js asserts the two agree rather than trusting them
      // to -- see test/propModels.test.ts, which measures every static prop.
      //
      // y is left as the caller set it: the park pass positions benches at
      // ground + 0.9 because the old box was centred on its own height. The
      // library's origin is "base-centre" -- (0,0,0) is the CENTRE of the
      // footprint at GROUND LEVEL -- so the lift has to come off, or every
      // bench floats 90 cm above the grass.
      const bg0 = propGeometry("bench", THREE, { lod: 0 });
      const bg1 = propGeometry("bench", THREE, { lod: 1 }) || bg0;
      const benchMat = M(0x9b7d55, 0.9);
      const benchChunks = new Map();
      benches.forEach(([x, y, z], i) => {
        const cx = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
        const cz = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
        const ck = `${cx},${cz}`;
        let cEntry = benchChunks.get(ck);
        if (!cEntry) { cEntry = []; benchChunks.set(ck, cEntry); }
        cEntry.push([x, y, z, i]);
      });

      for (const [ck, list] of benchChunks.entries()) {
        const [cx, cz] = ck.split(",").map(Number);
        const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
        const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
        const lod = new THREE.LOD();
        if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

        const im0 = new THREE.InstancedMesh(bg0, benchMat, list.length);
        const im1 = new THREE.InstancedMesh(bg1, benchMat, list.length);
        const d2 = new THREE.Object3D();
        list.forEach(([x, y, z, i], j) => {
          const px = useChunking ? (x - chunkCenterX) : x;
          const pz = useChunking ? (z - chunkCenterZ) : z;
          d2.position.set(px, y - 0.9, pz); d2.rotation.set(0, rnd("bq" + i) * 3.14, 0); d2.scale.setScalar(1);
          d2.updateMatrix();
          im0.setMatrixAt(j, d2.matrix);
          im1.setMatrixAt(j, d2.matrix);
        });
        im0.instanceMatrix.needsUpdate = im1.instanceMatrix.needsUpdate = true;
        im0.castShadow = true; im0.computeBoundingSphere();
        im1.computeBoundingSphere();
        lod.addLevel(im0, 0);
        lod.addLevel(im1, 200);
        lod.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 600);
        scene.add(lod);
      }
    }
    // (planted by the vegetation pass, which runs before this one)
    stats.parks = (plan.parks || []).length;
  }

  // ---------------------------------------------------------------------------
  // LANDMARKS
  //
  // A city is not only its grain. It has things that are only there once: a
  // stadium, a station, a cathedral, a tall mast on the hill. They are what
  // people navigate by, and a skyline of nothing but commercial floorspace has
  // nothing to navigate by at all.
  // ---------------------------------------------------------------------------
  {
    const conc = M(0xdcd6c8, 0.92), steel = M(0xc8ccd0, 0.5, 0.4);

    // --- the stadium, on the north-east of the island ---
    stadium: {
      const _st = SITE.stadium;
      // No legal site within range: build nothing rather than build it in the sea.
      if (!_st) break stadium;
      const sx = _st.x, sz = _st.z, stH = groundOrRefuse(heightAt, sx, sz);
      // placeFeatures' own site search is coarser than this single point --
      // refuse explicitly rather than float, the same as the plot buildings.
      if (stH === null) { stats.setPieceRefused.push({ id: "stadium", reason: "site is underwater" }); break stadium; }
      const gy = stH;
      const RX = 150, RZ = 118, N = 28;
      const grp = new THREE.Group();
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const mx = (Math.cos(a0) + Math.cos(a1)) / 2, mz = (Math.sin(a0) + Math.sin(a1)) / 2;
        const len = Math.hypot((Math.cos(a1) - Math.cos(a0)) * RX, (Math.sin(a1) - Math.sin(a0)) * RZ) * 1.15;
        const seg = new THREE.Mesh(RB(30, 34, len, 1.5), conc);
        seg.position.set(mx * (RX + 8), 17, mz * (RZ + 8));
        seg.rotation.y = -Math.atan2(Math.sin(a1) - Math.sin(a0), (Math.cos(a1) - Math.cos(a0)) * (RX / RZ));
        seg.castShadow = true; seg.receiveShadow = true; grp.add(seg);
      }
      const pitch = new THREE.Mesh(new THREE.CircleGeometry(1, 32), M(0x4f8f42, 0.95));
      pitch.rotation.x = -Math.PI / 2; pitch.scale.set(RX * 0.82, 1, RZ * 0.82);
      pitch.position.set(0, 0.5, 0); pitch.receiveShadow = true; grp.add(pitch);
      const lod = new THREE.LOD();
      lod.name = "stadium";
      lod.position.set(sx, gy, sz);
      lod.addLevel(grp, 0);
      lod.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 6000);
      scene.add(lod);
      stats.stadium = 1;
    }

    // --- the central station: a train shed with a clock tower ---
    station: {
      const _sn = SITE.station;
      // No legal site within range: build nothing rather than build it in the sea.
      if (!_sn) break station;
      const sx = _sn.x, sz = _sn.z;
      // The same footprint assessment every plot building gets (public/footprint.js),
      // not a single centre sample -- features.js's own "site" need for the
      // station is w:240, d:120 (public/features.js), so that is the envelope
      // assessed here too, not a hand-derived one from the mesh.
      const stationFoot = assessFootprint(heightAt, { xMin: sx - 120, xMax: sx + 120, zMin: sz - 60, zMax: sz + 60 }, waterwayAt);
      // A verdict placeFeatures' own coarser site search cannot see: refuse
      // rather than float, the same "no ground, no building" the plot
      // buildings already enforce.
      if (stationFoot.verdict === "refuse") {
        stats.featuresUnplaced.push("station");
        stats.stationRefused = stationFoot.reason;
        break station;
      }
      const gy = stationFoot.verdict === "terrace" ? stationFoot.base + stationFoot.range : stationFoot.base;
      const grp = new THREE.Group();
      const shed = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 210, 14, 1, false, 0, Math.PI), steel);
      shed.rotation.z = Math.PI / 2; shed.position.set(0, 4, 0);
      shed.castShadow = true; grp.add(shed);
      const front = new THREE.Mesh(RB(30, 34, 220, 0.8), M(0xefe6d4, 0.85));
      front.position.set(-58, 17, 0); front.castShadow = true; grp.add(front);
      const tower = new THREE.Mesh(RB(20, 76, 20, 0.8), M(0xefe6d4, 0.85));
      tower.position.set(-58, 38, -96); tower.castShadow = true; grp.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(16, 26, 4), M(0x4f7a6a, 0.85));
      cap.name = "station-cap"; // mounted on top of the tower, not the ground
      cap.rotation.y = Math.PI / 4; cap.position.set(-58, 89, -96);
      cap.castShadow = true; grp.add(cap);
      const lod = new THREE.LOD();
      lod.name = "station";
      lod.position.set(sx, gy, sz);
      lod.addLevel(grp, 0);
      lod.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 5000);
      scene.add(lod);
      stats.station = 1;
    }

    // --- a cathedral on the civic square ---
    cathedral: {
      const _cd = SITE.cathedral;
      // No legal site within range: build nothing rather than build it in the sea.
      if (!_cd) break cathedral;
      const sx = _cd.x, sz = _cd.z, cdH = groundOrRefuse(heightAt, sx, sz);
      if (cdH === null) { stats.setPieceRefused.push({ id: "cathedral", reason: "site is underwater" }); break cathedral; }
      const gy = cdH;
      const grp = new THREE.Group();
      const nave = new THREE.Mesh(RB(34, 30, 110, 0.6), M(0xeee6d2, 0.9));
      nave.position.set(0, 15, 0); nave.castShadow = true; grp.add(nave);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 112, 10, 1, false, 0, Math.PI), M(0x5e7d6c, 0.85));
      roof.name = "cathedral-roof"; // mounted on top of the nave, not the ground
      roof.rotation.z = Math.PI / 2; roof.position.set(0, 30, 0); roof.castShadow = true; grp.add(roof);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(24, 16, 10, 0, 6.283, 0, 1.57), M(0x5e7d6c, 0.6, 0.2));
      dome.name = "cathedral-dome"; // mounted on top of the nave, not the ground
      dome.position.set(0, 34, 0); dome.castShadow = true; grp.add(dome);
      for (const dz of [-46, 46]) {
        const t = new THREE.Mesh(RB(14, 74, 14, 0.5), M(0xeee6d2, 0.9));
        t.position.set(0, 37, dz); t.castShadow = true; grp.add(t);
        const sp = new THREE.Mesh(new THREE.ConeGeometry(10, 30, 4), M(0x5e7d6c, 0.85));
        sp.name = "cathedral-spire"; // mounted on top of a tower, not the ground
        sp.rotation.y = Math.PI / 4; sp.position.set(0, 89, dz); sp.castShadow = true; grp.add(sp);
      }
      const lod = new THREE.LOD();
      lod.name = "cathedral";
      lod.position.set(sx, gy, sz);
      lod.addLevel(grp, 0);
      lod.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 5000);
      scene.add(lod);
    }

    // --- a broadcast mast on the hill behind the city ---
    {
      const mx = (SITE.mast || { x: wm(-1400) }).x, mz = (SITE.mast || { z: wm(-6300) }).z, gy = heightAt(mx, mz);
      const grp = new THREE.Group();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 6, 180, 6), steel);
      mast.position.set(0, 90, 0); mast.castShadow = true; grp.add(mast);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 14, 12), M(0xe8e2d4, 0.7));
      pod.name = "broadcast-mast-pod"; // mounted partway up the mast, not the ground
      pod.position.set(0, 128, 0); pod.castShadow = true; grp.add(pod);
      const lod = new THREE.LOD();
      lod.name = "broadcast-mast";
      lod.position.set(mx, gy, mz);
      lod.addLevel(grp, 0);
      lod.addLevel(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false })), 8000);
      scene.add(lod);
    }
  }

  // ---------------------------------------------------------------------------
  // CONTACT SHADOWS
  //
  // A soft dark blob under every building in the core. Real shadow maps put a
  // hard shadow on the sunlit side, but nothing darkens the ground where two
  // buildings meet, or under an overhang, and the result is buildings that look
  // stuck onto the ground rather than standing on it. This is the cheapest
  // ambient occlusion there is: one instanced quad each.
  // ---------------------------------------------------------------------------
  {
    const emptyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    const quad = new THREE.PlaneGeometry(1, 1);
    quad.rotateX(-Math.PI / 2);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const g = canvas.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 18, 64, 64, 60);
    grd.addColorStop(0, "rgba(10,12,18,0.72)");
    grd.addColorStop(0.55, "rgba(12,16,22,0.38)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 });

    const shadowChunks = new Map();
    let totalShadows = 0;
    for (const [cx, cz, base, bw, bd] of api.placedBuildings) {
      if (Math.abs(cx) > wm(12000) || cz < wm(-6500) || cz > wm(3600)) continue;   // core only
      const chunkX = useChunking ? Math.floor(cx / CHUNK_SIZE) : 0;
      const chunkZ = useChunking ? Math.floor(cz / CHUNK_SIZE) : 0;
      const ck = `${chunkX},${chunkZ}`;
      let cEntry = shadowChunks.get(ck);
      if (!cEntry) {
        cEntry = [];
        shadowChunks.set(ck, cEntry);
      }
      cEntry.push([cx, base + 0.35, cz, bw * 2.0, bd * 2.0]);
      totalShadows++;
    }

    const d = new THREE.Object3D();
    for (const [ck, list] of shadowChunks.entries()) {
      if (list.length === 0) continue;
      const [cx, cz] = ck.split(",").map(Number);
      const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
      const lod = new THREE.LOD();
      if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

      const inst = new THREE.InstancedMesh(quad, mat, list.length);
      list.forEach(([x, y, z, sx, sz], i) => {
        const px = useChunking ? (x - chunkCenterX) : x;
        const pz = useChunking ? (z - chunkCenterZ) : z;
        d.position.set(px, y, pz); d.rotation.set(0, 0, 0); d.scale.set(sx, 1, sz);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.renderOrder = 1;
      inst.computeBoundingSphere();
      lod.addLevel(inst, 0);
      const cullMesh = new THREE.Mesh(emptyGeo, dummyMat);
      lod.addLevel(cullMesh, 800);
      scene.add(lod);
    }
    stats.contactShadows = totalShadows;
  }

  // ---------------------------------------------------------------------------
  // TRAFFIC
  // ---------------------------------------------------------------------------
  {
    const emptyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    const cols = [0xd94f3d, 0x2f7fb5, 0xf0ece2, 0x3b4045, 0xe0a53f, 0x6f8f5c, 0xb0b6bc,
                  0x8a4436, 0xe8e4dc, 0x556070, 0xc9a184];
    const profOf = new Map(api.bridgeSpans.map((s2) => [s2.br.id, s2.prof]));
    const carChunks = new Map();
    let totalCars = 0;

    for (const r of world.roads) {
      const spec = ROADS[r.class]; if (!spec) continue;
      const ew = r.axis === "ew";
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      const near = Math.abs(r.at) < wm(14000);
      const step = r.bridge ? 18 : near ? 15 : 90;
      const keep = r.bridge ? 0.8 : near ? 0.72 : 0.30;
      const prof = r.bridge ? profOf.get(r.bridge) : null;
      for (let t = from + 30; t < to - 30; t += step) {
        if (rnd("v" + r.id + t) > keep) continue;
        const side = rnd("vs" + r.id + t) > 0.5 ? 1 : -1;
        const off = side * (spec.row / 2 - spec.footway - 2.4);
        const x = ew ? t : r.at + off, z = ew ? r.at + off : t;
        let y;
        if (prof) y = prof(t) + 1.6;
        else { const h = heightAt(x, z); if (h < 1) continue; y = h + 1.7; }
        
        const chunkX = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
        const chunkZ = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
        const ck = `${chunkX},${chunkZ}`;
        let cEntry = carChunks.get(ck);
        if (!cEntry) {
          cEntry = [];
          carChunks.set(ck, cEntry);
        }
        cEntry.push([x, y, z, ew ? 0 : Math.PI / 2, rnd("vt" + r.id + t), totalCars]);
        totalCars++;
        if (totalCars > 26000) break;
      }
      if (totalCars > 26000) break;
    }

    const car = new THREE.BoxGeometry(4.4, 1.5, 2.0);
    const cab = new THREE.BoxGeometry(2.4, 1.1, 1.85);
    const carMat = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.3 });
    const cabMat = new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.1, color: 0x9fb4c4 });
    const d = new THREE.Object3D(), c = new THREE.Color();

    for (const [ck, list] of carChunks.entries()) {
      if (list.length === 0) continue;
      const [cx, cz] = ck.split(",").map(Number);
      const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
      const lod = new THREE.LOD();
      if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

      const carGroup = new THREE.Group();
      const inst = new THREE.InstancedMesh(car, carMat, list.length);
      const cabs = new THREE.InstancedMesh(cab, cabMat, list.length);
      list.forEach(([x, y, z, ry, t, origIdx], i) => {
        const truck = t > 0.86;
        const px = useChunking ? (x - chunkCenterX) : x;
        const pz = useChunking ? (z - chunkCenterZ) : z;
        d.position.set(px, y, pz); d.rotation.set(0, ry, 0);
        d.scale.set(truck ? 2.3 : 1, truck ? 1.7 : 1, truck ? 1.15 : 1);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
        inst.setColorAt(i, c.setHex(cols[Math.floor(rnd("vc" + origIdx) * cols.length) % cols.length]));
        d.position.set(px, y + (truck ? 1.9 : 1.2), pz); d.scale.set(truck ? 1.6 : 1, 1, 1);
        d.updateMatrix(); cabs.setMatrixAt(i, d.matrix);
      });
      inst.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = true;
      inst.computeBoundingSphere();
      cabs.computeBoundingSphere();
      carGroup.add(inst, cabs);

      lod.addLevel(carGroup, 0);
      const cullCar = new THREE.Mesh(emptyGeo, dummyMat);
      lod.addLevel(cullCar, 600);
      scene.add(lod);
    }
    stats.cars = totalCars;
  }

  // ---------------------------------------------------------------------------
  // PEOPLE
  // ---------------------------------------------------------------------------
  {
    const emptyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    const skin = [0xd94f3d, 0x2f7fb5, 0xf5f0e6, 0x3b4045, 0xe0a53f, 0x6f8f5c,
                  0xb85a8a, 0x4f7a6a, 0xe8e4dc, 0x8a6a4a];
    const peopleChunks = new Map();
    let totalPeople = 0;
    const CORE = (x, z) => Math.abs(x) < wm(6500) && z > wm(-4200) && z < wm(3600);
    const addPerson = (x, y, z) => {
      const chunkX = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
      const chunkZ = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
      const ck = `${chunkX},${chunkZ}`;
      let cEntry = peopleChunks.get(ck);
      if (!cEntry) {
        cEntry = [];
        peopleChunks.set(ck, cEntry);
      }
      cEntry.push([x, y, z, totalPeople]);
      totalPeople++;
    };

    for (const r of world.roads) {
      const spec = ROADS[r.class]; if (!spec || spec.footway <= 0) continue;
      const ew = r.axis === "ew";
      if (!CORE(ew ? 0 : r.at, ew ? r.at : 0)) continue;
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      for (let t = from + 12; t < to - 12; t += 11) {
        if (rnd("p" + r.id + t) > 0.30) continue;
        const side = rnd("ps" + r.id + t) > 0.5 ? 1 : -1;
        const off = side * (spec.row / 2 - spec.footway * 0.5);
        const x = ew ? t : r.at + off, z = ew ? r.at + off : t;
        const h = heightAt(x, z); if (h < 1) continue;
        addPerson(x, h + 0.9, z);
        if (totalPeople > 14000) break;
      }
      if (totalPeople > 14000) break;
    }

    const parasols = [];
    for (const lm of masses) {
      if (lm.kind === "mainland") continue;
      const poly = lm.polygon;
      for (let i = 0; i < poly.length; i += 2) {
        const [px, pz] = poly[i];
        if (cliffiness(px, pz) > 0.4) continue;
        const busy = rnd("beach" + lm.id + i);
        if (busy > 0.72) continue;
        const nx = poly[(i + 1) % poly.length][0] - px, nz = poly[(i + 1) % poly.length][1] - pz;
        const L = Math.hypot(nx, nz) || 1;
        const inx = nz / L, inz = -nx / L;
        for (let k = 0; k < 7; k++) {
          const off = 6 + rnd("bo" + lm.id + i + k) * 40;
          const along = (rnd("ba" + lm.id + i + k) - 0.5) * 90;
          for (const sgn of [1, -1]) {
            const bx = px + inx * off * sgn + (nx / L) * along;
            const bz = pz + inz * off * sgn + (nz / L) * along;
            const h = heightAt(bx, bz);
            if (h < 0.4 || h > 3.6) continue;
            addPerson(bx, h + 0.9, bz);
            if (k === 0 && rnd("pu" + lm.id + i) > 0.55) parasols.push([bx, h, bz]);
            break;
          }
        }
        if (totalPeople > 22000) break;
      }
      if (totalPeople > 22000) break;
    }

    if (parasols.length) {
      const pcols = [0xe8503c, 0xf2b134, 0x3f8fc4, 0xf0ece2, 0x4f9e6a, 0xe0709a];
      const top = new THREE.ConeGeometry(2.6, 1.1, 8);
      const pole = new THREE.CylinderGeometry(0.13, 0.13, 2.6, 4);
      const topMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
      const poleMat = M(0xd8d2c4, 0.8);
      
      const parasolChunks = new Map();
      parasols.forEach(([x, y, z], idx) => {
        const chunkX = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
        const chunkZ = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
        const ck = `${chunkX},${chunkZ}`;
        let cEntry = parasolChunks.get(ck);
        if (!cEntry) {
          cEntry = [];
          parasolChunks.set(ck, cEntry);
        }
        cEntry.push([x, y, z, idx]);
      });

      const d2 = new THREE.Object3D(), c2 = new THREE.Color();
      for (const [ck, list] of parasolChunks.entries()) {
        const [cx, cz] = ck.split(",").map(Number);
        const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
        const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
        const lod = new THREE.LOD();
        if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

        const ti = new THREE.InstancedMesh(top, topMat, list.length);
        const pi = new THREE.InstancedMesh(pole, poleMat, list.length);
        list.forEach(([x, y, z, origIdx], i) => {
          const px = useChunking ? (x - chunkCenterX) : x;
          const pz = useChunking ? (z - chunkCenterZ) : z;
          d2.position.set(px, y + 1.3, pz); d2.rotation.set(0, 0, 0); d2.scale.setScalar(1);
          d2.updateMatrix(); pi.setMatrixAt(i, d2.matrix);
          d2.position.set(px, y + 2.9, pz); d2.updateMatrix(); ti.setMatrixAt(i, d2.matrix);
          ti.setColorAt(i, c2.setHex(pcols[Math.floor(rnd("pcx" + origIdx) * pcols.length) % pcols.length]));
        });
        ti.instanceMatrix.needsUpdate = pi.instanceMatrix.needsUpdate = true;
        if (ti.instanceColor) ti.instanceColor.needsUpdate = true;
        ti.castShadow = pi.castShadow = true;
        ti.computeBoundingSphere(); pi.computeBoundingSphere();
        const pGroup = new THREE.Group();
        pGroup.add(ti, pi);
        lod.addLevel(pGroup, 0);
        const cullMesh = new THREE.Mesh(emptyGeo, dummyMat);
        lod.addLevel(cullMesh, 600);
        scene.add(lod);
      }
      stats.parasols = parasols.length;
    }

    const g = new THREE.BoxGeometry(0.62, 1.75, 0.62);
    const personMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const d = new THREE.Object3D(), c = new THREE.Color();
    for (const [ck, list] of peopleChunks.entries()) {
      const [cx, cz] = ck.split(",").map(Number);
      const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
      const lod = new THREE.LOD();
      if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

      const inst = new THREE.InstancedMesh(g, personMat, list.length);
      list.forEach(([x, y, z, origIdx], i) => {
        const px = useChunking ? (x - chunkCenterX) : x;
        const pz = useChunking ? (z - chunkCenterZ) : z;
        d.position.set(px, y, pz); d.rotation.set(0, rnd("pr" + origIdx) * 6.28, 0);
        d.scale.set(1, 0.9 + rnd("ph" + origIdx) * 0.22, 1);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
        inst.setColorAt(i, c.setHex(skin[Math.floor(rnd("pc" + origIdx) * skin.length) % skin.length]));
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = true; inst.computeBoundingSphere();
      lod.addLevel(inst, 0);
      const cullMesh = new THREE.Mesh(emptyGeo, dummyMat);
      lod.addLevel(cullMesh, 400);
      scene.add(lod);
    }
    stats.people = totalPeople;
  }

  // --- street lighting along the downtown boulevards ---
  {
    const emptyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    const posts = lampPosts;
    const pg = new THREE.CylinderGeometry(0.22, 0.3, 9, 5);
    const postMat = M(0x4d545c, 0.6, 0.3);
    const hg = new THREE.BoxGeometry(1.6, 0.5, 0.9);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0x2a2312 });

    const lampChunks = new Map();
    posts.forEach(([x, y, z]) => {
      const chunkX = useChunking ? Math.floor(x / CHUNK_SIZE) : 0;
      const chunkZ = useChunking ? Math.floor(z / CHUNK_SIZE) : 0;
      const ck = `${chunkX},${chunkZ}`;
      let cEntry = lampChunks.get(ck);
      if (!cEntry) {
        cEntry = [];
        lampChunks.set(ck, cEntry);
      }
      cEntry.push([x, y, z]);
    });

    const d = new THREE.Object3D();
    for (const [ck, list] of lampChunks.entries()) {
      const [cx, cz] = ck.split(",").map(Number);
      const chunkCenterX = useChunking ? (cx + 0.5) * CHUNK_SIZE : 0;
      const chunkCenterZ = useChunking ? (cz + 0.5) * CHUNK_SIZE : 0;
      const lod = new THREE.LOD();
      if (useChunking) lod.position.set(chunkCenterX, 0, chunkCenterZ);

      const lampGroup = new THREE.Group();
      const inst = new THREE.InstancedMesh(pg, postMat, list.length);
      const hi = new THREE.InstancedMesh(hg, headMat, list.length);
      list.forEach(([x, y, z], i) => {
        const px = useChunking ? (x - chunkCenterX) : x;
        const pz = useChunking ? (z - chunkCenterZ) : z;
        d.position.set(px, y + 4.5, pz); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix();
        inst.setMatrixAt(i, d.matrix);
        d.position.set(px, y + 9.1, pz); d.updateMatrix(); hi.setMatrixAt(i, d.matrix);
      });
      inst.instanceMatrix.needsUpdate = hi.instanceMatrix.needsUpdate = true;
      inst.castShadow = true; inst.computeBoundingSphere(); hi.computeBoundingSphere();
      lampGroup.add(inst, hi);

      lod.addLevel(lampGroup, 0);
      const cullMesh = new THREE.Mesh(emptyGeo, dummyMat);
      lod.addLevel(cullMesh, 450);
      scene.add(lod);
    }
    stats.lamps = posts.length;
  }
  void masses;
}
