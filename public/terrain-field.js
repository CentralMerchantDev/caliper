// =============================================================================
// THE TERRAIN FIELD — TER-1/TER-2/TER-3 (PLAN.md §4, docs/DECISIONS-FOR-MARK.md
// #22). Built fresh from docs/specs/RESEARCH.md §T1–§T3, with no reference to
// the retired public/terrain.js (quarantined 2026-09-15,
// _TO-DELETE/decision-22-terrain-chain/ -- pre-rebuild code that survived a
// takedown by omission, not by approval; Mark's own ruling was to rebuild
// this, not wire it).
//
// THE CONTRACT this module implements is published separately and in full:
// docs/specs/CAT-1-TERRAIN-MESH-CONTRACT.md. Read that file for what BLD is
// entitled to rely on; this file's own comments are implementation, not the
// interface.
//
// THE METHOD, IN ORDER (RESEARCH.md T1, T2, T3):
//
//   T2 -- coastline first, elevation-first is a named failure. Read literally
//   this is Red Blob Games' "define the coastline boundary, then derive
//   elevation from distance to it" -- a different concrete technique from T1.
//   The two are reconciled here the way §T1's own text supports: T1's
//   "generate one landmass, then flood it" is not naive elevation-first
//   (independent noise values with no shared structure, which is what T2
//   calls the named failure) -- it is ONE deliberately connected landform
//   (a single dome, one drainage network) whose coastline EMERGES from
//   flooding it, topologically consistent by construction rather than
//   accidental. T2's warning is honoured by building the dome and its
//   drainage as one coherent structure before any threshold is applied, not
//   by literally drawing a boundary polygon before any height exists.
//
//   T1 -- the drowned river valley method. One base landmass (a single,
//   noise-warped dome -- never several independent blobs), a dendritic
//   drainage network carved into it by tracing steepest descent from ridge
//   seeds to the coast, THEN a sea-level rise that floods the carved valleys.
//   Islands that remain nestle together because they are the high ground of
//   ONE eroded landform, sharing a real drainage history -- not independent
//   shapes with nothing in common.
//
//   T3 -- hydraulic erosion. A droplet simulation dissolves the pre-flood
//   landmass, carves continuous downhill channels and deposits sediment in
//   low ground, producing the sharp ridges and flat coastal plains that
//   raw noise does not have on its own -- what actually makes the drainage
//   network read as CARVED rather than PAINTED onto the height field.
// =============================================================================

// -----------------------------------------------------------------------------
// DETERMINISTIC NOISE. Self-contained -- see this file's own header for why:
// public/noise.js sits in the second, undecided cluster this session found
// (docs/specs/OLD-WORLD-SECOND-CLUSTER-2026-09-15.md, DECISIONS-FOR-MARK.md
// #23), and depending on it before that decision is made would make this
// module's own fate depend on an answer that has not been given yet.
// -----------------------------------------------------------------------------

/** A 32-bit integer hash of (x, y, seed) -- deterministic, no external state. */
function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296; // [0, 1)
}

function smoother(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Value noise: smooth interpolation across a lattice of hashed corners. */
function valueNoise(x, z, seed) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const x1 = x0 + 1, z1 = z0 + 1;
  const tx = smoother(x - x0), tz = smoother(z - z0);
  const h00 = hash2(x0, z0, seed), h10 = hash2(x1, z0, seed);
  const h01 = hash2(x0, z1, seed), h11 = hash2(x1, z1, seed);
  const a = h00 + (h10 - h00) * tx;
  const b = h01 + (h11 - h01) * tx;
  return a + (b - a) * tz; // [0, 1)
}

/** Fractal Brownian motion: `octaves` layers of value noise at `scale`,
 *  each half the amplitude and double the frequency of the last. Returns
 *  [0, 1), renormalised so amplitude loss across octaves does not compress
 *  the range. */
export function fbm(x, z, scale, octaves = 4, seed = 0) {
  let sum = 0, amp = 1, freq = 1 / scale, maxAmp = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, z * freq, seed + o * 101) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2.03; // non-integer lacunarity -- an exact 2x octave stack can phase-lock and repeat visibly
  }
  return sum / maxAmp;
}

function seedToInt(seed) {
  if (typeof seed === "number") return seed | 0;
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// -----------------------------------------------------------------------------
// T1 -- THE BASE LANDMASS. One dome, noise-warped so its boundary is organic
// rather than a perfect circle, but still ONE connected high-elevation
// region -- never several independent peaks with nothing shared between them.
// -----------------------------------------------------------------------------

const DOME_RADIUS_M = 3200;      // the landmass's own rough radius before warp
const DOME_WARP_M = 900;         // how far noise may push the boundary in or out
const DOME_HEIGHT_M = 340;       // the dome's own peak, before erosion/detail
const DETAIL_SCALE_M = 260;      // wavelength of the ridges/hills riding on the dome
const DETAIL_HEIGHT_M = 55;

function baseElevation(x, z, seed) {
  const r = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  // Warp the dome's own radius by low-frequency noise sampled around its
  // perimeter (by angle, not by x/z) so the coastline is organic without
  // ever splitting the dome into separate lobes -- a radius perturbation
  // can narrow or widen the shape, it cannot disconnect it.
  const warp = (fbm(Math.cos(angle) * 3, Math.sin(angle) * 3, 1, 3, seed + 7) - 0.5) * 2 * DOME_WARP_M;
  const effectiveRadius = DOME_RADIUS_M + warp;
  const domeFalloff = smoother(Math.max(0, Math.min(1, 1 - r / effectiveRadius)));
  const dome = domeFalloff * DOME_HEIGHT_M;
  const detail = (fbm(x, z, DETAIL_SCALE_M, 4, seed + 31) - 0.5) * 2 * DETAIL_HEIGHT_M;
  // Detail is damped near the dome's own edge (domeFalloff -> 0) so the
  // coastline itself stays smooth and the noise texture reads as hills on
  // land, not static ON the shoreline.
  return dome + detail * Math.max(0.15, domeFalloff);
}

// -----------------------------------------------------------------------------
// T1 -- THE DENDRITIC DRAINAGE NETWORK. Traced by steepest descent from ridge
// seeds toward the coast, carved as a groove along the traced path. Multiple
// independent seeds naturally branch and converge exactly the way a real
// watershed does, because they are all descending the SAME height field.
// -----------------------------------------------------------------------------

const RIVER_SEED_COUNT = 14;
const RIVER_STEP_M = 60;
const RIVER_MAX_STEPS = 140;
const RIVER_CARVE_WIDTH_M = 130;
const RIVER_CARVE_DEPTH_M = 40;

/** One traced river path, as a polyline of {x, z} in world metres, from a
 *  high seed point down to (approximately) the coast. Pure function of
 *  (seed, seedIndex) -- same inputs, same path, always. */
function traceRiver(seed, index, sampleFn) {
  const angle = (index / RIVER_SEED_COUNT) * Math.PI * 2 + hash2(index, 0, seed) * 0.6;
  const startR = DOME_RADIUS_M * (0.25 + hash2(index, 1, seed) * 0.45); // starts inland, on high ground
  let x = Math.cos(angle) * startR, z = Math.sin(angle) * startR;
  const path = [{ x, z }];
  const GRAD_EPS = 20;
  for (let i = 0; i < RIVER_MAX_STEPS; i++) {
    const h = sampleFn(x, z);
    if (h <= 0) break; // reached the coast (or a lower valley already carved)
    const hx = sampleFn(x + GRAD_EPS, z), hz = sampleFn(x, z + GRAD_EPS);
    let dx = -(hx - h), dz = -(hz - h); // steepest descent direction
    const mag = Math.hypot(dx, dz) || 1;
    dx /= mag; dz /= mag;
    x += dx * RIVER_STEP_M;
    z += dz * RIVER_STEP_M;
    path.push({ x, z });
  }
  return path;
}

/** Distance from (x, z) to the nearest segment of `path`, in world metres. */
function distanceToPath(x, z, path) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const ex = b.x - a.x, ez = b.z - a.z;
    const l2 = ex * ex + ez * ez || 1;
    let t = ((x - a.x) * ex + (z - a.z) * ez) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + t * ex, pz = a.z + t * ez;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

// -----------------------------------------------------------------------------
// T3 -- HYDRAULIC EROSION. A coarse droplet pass over a sampled grid of the
// base landmass: each droplet flows downhill, eroding where it accelerates
// and depositing where it slows, then the result is read back as a
// correction added to the raw base elevation. Run once per field (memoised),
// not per query -- heightAt must stay cheap per call.
// -----------------------------------------------------------------------------

const EROSION_GRID_N = 96;           // samples per axis over the eroded region
const EROSION_GRID_HALF_M = DOME_RADIUS_M + DOME_WARP_M + 400;
const EROSION_DROPLETS = 2200;
const EROSION_MAX_STEPS = 48;

function buildErosionGrid(seed, baseFn) {
  const n = EROSION_GRID_N;
  const cell = (2 * EROSION_GRID_HALF_M) / (n - 1);
  const heights = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -EROSION_GRID_HALF_M + i * cell;
      const z = -EROSION_GRID_HALF_M + j * cell;
      heights[j * n + i] = baseFn(x, z);
    }
  }
  const idx = (i, j) => j * n + i;
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < n && j < n;

  for (let d = 0; d < EROSION_DROPLETS; d++) {
    let i = hash2(d, 100, seed) * (n - 1);
    let j = hash2(d, 200, seed) * (n - 1);
    let carrying = 0;
    for (let s = 0; s < EROSION_MAX_STEPS; s++) {
      const i0 = Math.floor(i), j0 = Math.floor(j);
      if (!inGrid(i0, j0) || !inGrid(i0 + 1, j0 + 1)) break;
      // bilinear gradient from the four surrounding samples
      const h00 = heights[idx(i0, j0)], h10 = heights[idx(i0 + 1, j0)];
      const h01 = heights[idx(i0, j0 + 1)], h11 = heights[idx(i0 + 1, j0 + 1)];
      const gx = (h10 - h00 + h11 - h01) * 0.5;
      const gz = (h01 - h00 + h11 - h10) * 0.5;
      const mag = Math.hypot(gx, gz);
      if (mag < 1e-4) break; // flat -- droplet stops
      const stepI = -(gx / mag) * 0.9, stepJ = -(gz / mag) * 0.9;
      const hBefore = (h00 + h10 + h01 + h11) / 4;
      i += stepI; j += stepJ;
      const ni0 = Math.floor(i), nj0 = Math.floor(j);
      if (!inGrid(ni0, nj0) || !inGrid(ni0 + 1, nj0 + 1)) break;
      const hAfter = (heights[idx(ni0, nj0)] + heights[idx(ni0 + 1, nj0)] +
                      heights[idx(ni0, nj0 + 1)] + heights[idx(ni0 + 1, nj0 + 1)]) / 4;
      const drop = hBefore - hAfter;
      if (drop > 0) {
        // Descending fast: pick up sediment (erode).
        const erode = Math.min(drop * 0.35, 1.4);
        heights[idx(i0, j0)] -= erode;
        carrying += erode;
      } else {
        // Slowing or climbing: drop whatever is being carried (deposit).
        heights[idx(i0, j0)] += carrying * 0.5;
        carrying *= 0.5;
      }
    }
  }
  return { n, cell, heights };
}

function sampleErosionGrid(grid, x, z) {
  const { n, cell, heights } = grid;
  const fi = (x + EROSION_GRID_HALF_M) / cell;
  const fj = (z + EROSION_GRID_HALF_M) / cell;
  const i0 = Math.floor(fi), j0 = Math.floor(fj);
  if (i0 < 0 || j0 < 0 || i0 >= n - 1 || j0 >= n - 1) return null; // outside the eroded region
  const tx = fi - i0, tz = fj - j0;
  const h00 = heights[j0 * n + i0], h10 = heights[j0 * n + i0 + 1];
  const h01 = heights[(j0 + 1) * n + i0], h11 = heights[(j0 + 1) * n + i0 + 1];
  const a = h00 + (h10 - h00) * tx;
  const b = h01 + (h11 - h01) * tx;
  return a + (b - a) * tz;
}

// -----------------------------------------------------------------------------
// T1 -- THE SEA-LEVEL RISE. Generate the landmass and its drainage against a
// natural baseline, THEN flood it -- a positive rise subtracted from every
// query, so what the base landform treated as "a bit above its own zero" is
// exposed as submerged. This is what turns a carved-but-dry valley network
// into flooded straits separating ridge-top islands.
// -----------------------------------------------------------------------------

/** Exported as a real, disclosed generation constant (not part of CAT-1's
 *  BLD-facing contract, which only promises heightAt/isWater/slopeAt) --
 *  how far sea level rises above the landmass's own natural baseline
 *  before flooding. Used by test/terrainField.test.ts to verify T1's own
 *  "one landmass, then flood it" claim directly, rather than trusting the
 *  post-flood result alone. */
export const SEA_LEVEL_RISE_M = 55;

/**
 * A deterministic terrain field: `heightAt`/`isWater`/`slopeAt`, per
 * docs/specs/CAT-1-TERRAIN-MESH-CONTRACT.md. Everything above this line is
 * implementation; this is the published interface.
 */
export function createTerrainField({ seed = "default" } = {}) {
  const s = seedToInt(seed);

  const rivers = [];
  for (let i = 0; i < RIVER_SEED_COUNT; i++) {
    rivers.push(traceRiver(s, i, (x, z) => baseElevation(x, z, s)));
  }

  /** The pre-erosion, pre-flood landmass: dome + detail, with rivers carved
   *  as grooves. This is what buildErosionGrid samples -- erosion runs on
   *  the CARVED landform, not on the raw dome, so it sharpens real valleys
   *  rather than inventing its own. */
  function preErosionHeight(x, z) {
    let h = baseElevation(x, z, s);
    let carve = 0;
    for (const path of rivers) {
      const d = distanceToPath(x, z, path);
      if (d < RIVER_CARVE_WIDTH_M) {
        const t = smoother(1 - d / RIVER_CARVE_WIDTH_M);
        carve = Math.max(carve, t * RIVER_CARVE_DEPTH_M);
      }
    }
    return h - carve;
  }

  const erosionGrid = buildErosionGrid(s, preErosionHeight);

  /** Pre-flood height, with erosion applied where the grid covers this
   *  point and the raw carved landform elsewhere (erosion only runs over a
   *  bounded region around the dome -- see EROSION_GRID_HALF_M). */
  function erodedHeight(x, z) {
    const eroded = sampleErosionGrid(erosionGrid, x, z);
    return eroded === null ? preErosionHeight(x, z) : eroded;
  }

  function heightAt(x, z) {
    return erodedHeight(x, z) - SEA_LEVEL_RISE_M;
  }

  function isWater(x, z) {
    return heightAt(x, z) <= 0;
  }

  // Diagnostic exports, NOT part of CAT-1's BLD-facing contract (heightAt/
  // isWater/slopeAt only) -- for test/terrainField.test.ts to verify T1's
  // "one landmass, then flood it" and T3's "erosion changes the field"
  // claims against the real intermediate stages, not just the final output.
  function preFloodHeightAt(x, z) { return erodedHeight(x, z); }
  function preErosionHeightAt(x, z) { return preErosionHeight(x, z); }

  const SLOPE_EPS_M = 4; // central-difference step, well under the 4 m gameplay module
  function slopeAt(x, z) {
    const hx0 = heightAt(x - SLOPE_EPS_M, z), hx1 = heightAt(x + SLOPE_EPS_M, z);
    const hz0 = heightAt(x, z - SLOPE_EPS_M), hz1 = heightAt(x, z + SLOPE_EPS_M);
    const dhdx = (hx1 - hx0) / (2 * SLOPE_EPS_M);
    const dhdz = (hz1 - hz0) / (2 * SLOPE_EPS_M);
    return Math.hypot(dhdx, dhdz);
  }

  return { heightAt, isWater, slopeAt, seed: s, preFloodHeightAt, preErosionHeightAt };
}
