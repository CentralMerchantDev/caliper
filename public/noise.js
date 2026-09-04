// =============================================================================
// CALIPER — NOISE
//
// One deterministic value-noise implementation, shared by the terrain and the
// city plan. It lived in terrain.js, but the plan needs the same noise to lay
// out land value, and terrain.js imports the plan -- so copying it would have
// been two implementations that could drift, and importing it would have been a
// cycle. It is its own module instead.
//
// No seeding ceremony, no dependencies, identical in Node and the browser.
// =============================================================================

// -----------------------------------------------------------------------------
// SEEDED, WITHOUT CHANGING THE WORLD THAT ALREADY EXISTS
//
// There was exactly one world, because there was exactly one noise field. That
// is what made a player's own world, a clone of someone else's, and a world
// inside a world all impossible: not a missing feature, a missing PARAMETER.
//
// The seed is mixed into hash2, which every other function here is built on, so
// one number changes the entire landmass. And it is mixed by MULTIPLICATION:
//
//     Math.imul(seed, 1013904223)
//
// which is exactly zero when the seed is zero. So seed 0 reduces to the
// original expression, term for term, and the existing world is bit-identical
// rather than merely similar.
//
// That matters more than it sounds. Every measured number in this repository --
// 20,624 plots, 480 variants, 1.45 M triangles, the zoning percentiles, the
// airport's 11,041 dry sample points -- describes THIS world. A seed change
// that shifted the terrain by a metre would invalidate all of them silently,
// and the tests would go on passing because most of them assert properties
// rather than values. `test/noise.test.ts` pins the identity instead of
// trusting the arithmetic.
// -----------------------------------------------------------------------------

/** The seed the original, unseeded world was generated from. */
export const DEFAULT_SEED = 0;

/** A 32-bit integer from any seed -- a number passes through, a name is hashed. */
export function seedToInt(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed | 0;
  const s = String(seed == null ? "" : seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

export function hash2(i, j, seed = DEFAULT_SEED) {
  // seedToInt, not the raw value: Math.imul coerces its argument with ToInt32,
  // and ToInt32 of a non-numeric string is 0 -- so a NAME passed straight
  // through here collided with seed 0 silently, every time, no matter what the
  // name was. seedToInt is idempotent on a value already run through it (an
  // int seed | 0's to itself), so this costs nothing for every caller that was
  // already converting -- LandField's constructor, createNoise -- and fixes
  // every caller that was not.
  const s = seedToInt(seed);
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const fade = (t) => t * t * (3 - 2 * t);

export function valueNoise(x, y, seed = DEFAULT_SEED) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = fade(x - i), fy = fade(y - j);
  const a = hash2(i, j, seed), b = hash2(i + 1, j, seed);
  const c = hash2(i, j + 1, seed), d = hash2(i + 1, j + 1, seed);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** Fractal noise in world metres. `scale` is the size of the largest feature. */
export function fbm(x, z, scale, octaves = 4, gain = 0.5, lac = 2.03, seed = DEFAULT_SEED) {
  let amp = 1, freq = 1 / scale, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, z * freq, seed);
    norm += amp;
    amp *= gain; freq *= lac;
  }
  return sum / norm;                                   // 0..1
}

/**
 * A noise field bound to one seed.
 *
 * The seed goes LAST in every signature above so that adding it could not
 * change a single existing call site -- there are dozens, and a plan whose
 * first step edits all of them is a plan that breaks the world to make it
 * seedable. Callers that want their own world take a field from here instead
 * and never think about the parameter again.
 */
export function createNoise(seed = DEFAULT_SEED) {
  const s = seedToInt(seed);
  return {
    seed: s,
    hash2: (i, j) => hash2(i, j, s),
    valueNoise: (x, y) => valueNoise(x, y, s),
    fbm: (x, z, scale, octaves = 4, gain = 0.5, lac = 2.03) => fbm(x, z, scale, octaves, gain, lac, s),
  };
}

/** Deterministic 0..1 from any string. */
export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
