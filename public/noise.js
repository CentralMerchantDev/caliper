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

export function hash2(i, j) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const fade = (t) => t * t * (3 - 2 * t);

export function valueNoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = fade(x - i), fy = fade(y - j);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** Fractal noise in world metres. `scale` is the size of the largest feature. */
export function fbm(x, z, scale, octaves = 4, gain = 0.5, lac = 2.03) {
  let amp = 1, freq = 1 / scale, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, z * freq);
    norm += amp;
    amp *= gain; freq *= lac;
  }
  return sum / norm;                                   // 0..1
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
