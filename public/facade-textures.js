// =============================================================================
// CALIPER — PROCEDURAL FACADE TEXTURE & MATERIAL SYSTEM (Phase V1)
//
// Generates PBR texture atlases (diffuse, normal, roughness, emissive) for
// the 4 architectural characters: heritage, interwar, postwar, contemporary.
//
// Conforms to Phase V1 budget:
//   - Total texture memory: 4 atlases @ 1024x1024 = 16 MB (<= 64 MB budget)
//   - PBR maps: map, normalMap, roughnessMap, emissiveMap
//   - Fully deterministic procedural generation
// =============================================================================

import * as THREE from "./vendor/three/three.module.min.js";

/** Material families and their physical properties */
export const FACADE_FAMILIES = {
  heritage: {
    name: "Heritage (Victorian / Edwardian Brick & Stone)",
    wallBase: "#8d4c3d",
    brickDark: "#6a3429",
    stoneTrim: "#d4cbbe",
    glassColor: "#1a2630",
    windowFrame: "#2d241e",
    roughnessWall: 0.92,
    roughnessGlass: 0.08,
    roughnessTrim: 0.75,
    metalnessWall: 0.0,
    metalnessGlass: 0.9,
    emissiveNight: "#ffd580",
    archStyle: "arched",
  },
  interwar: {
    name: "Interwar (Art Deco & Classical Masonry)",
    wallBase: "#cfc5b4",
    brickDark: "#a89d8c",
    stoneTrim: "#ede6d8",
    glassColor: "#1e2c38",
    windowFrame: "#3a3630",
    roughnessWall: 0.82,
    roughnessGlass: 0.06,
    roughnessTrim: 0.65,
    metalnessWall: 0.05,
    metalnessGlass: 0.85,
    emissiveNight: "#ffeaad",
    archStyle: "deco",
  },
  postwar: {
    name: "Postwar (Mid-Century Concrete & Ribbon Panels)",
    wallBase: "#9ea1a2",
    brickDark: "#7d8082",
    stoneTrim: "#c8cbcc",
    glassColor: "#223340",
    windowFrame: "#404345",
    roughnessWall: 0.88,
    roughnessGlass: 0.08,
    roughnessTrim: 0.80,
    metalnessWall: 0.02,
    metalnessGlass: 0.88,
    emissiveNight: "#fff2cc",
    archStyle: "ribbon",
  },
  contemporary: {
    name: "Contemporary (Glass Curtain Wall & Composite Metal)",
    wallBase: "#2e3a46",
    brickDark: "#1c252e",
    stoneTrim: "#788796",
    glassColor: "#1d3a52",
    windowFrame: "#10161c",
    roughnessWall: 0.45,
    roughnessGlass: 0.04,
    roughnessTrim: 0.30,
    metalnessWall: 0.65,
    metalnessGlass: 0.95,
    emissiveNight: "#e6f2ff",
    archStyle: "curtain",
  },
};

/**
 * Intra-character atlas variety. `getFacadeMaterial`'s cache keys on
 * character alone (plus a vertex-colour/day-night flag) -- four textures for
 * the entire world, traced in docs/audits/K6-BUILDINGS.md and
 * docs/audits/OVERNIGHT-BLD-2026-09-09.md as the actual cause of "the same
 * window grid... still dominates." `characterFor` (public/layout.js) chooses
 * character per BLOCK on purpose, not per building -- ANTI-CLONE 1 there
 * explains why (random-per-building averages a whole city into one texture
 * at the scale it's viewed from). So the fix here is NOT more characters; it
 * is more grids WITHIN a character, so a block still reads as one coherent
 * era while its individual buildings stop sharing one bitmap.
 *
 * Variant 0 of every character is BYTE-IDENTICAL to this file's values
 * before this table existed (floors 8, cols 8, 18% margins, cross mullion,
 * 8px spandrel) -- the default variant when no `variantSeed` is supplied, so
 * every existing caller keeps its exact current output.
 *
 * `mullion`: "cross" (vertical + horizontal, today's only style), "single"
 * (vertical only), "double" (two vertical piers, no horizontal), or "none"
 * (bare glazing, curtain-wall). `spandrel`: the floor-dividing band's pixel
 * height at the 1024px atlas size non-default variants share, unscaled.
 *
 * 1980-2000 stays excluded by construction: every variant is a real,
 * era-appropriate development of one of the four already-approved
 * characters, never a fifth character or a blend between postwar and
 * contemporary. test/facadeVariants.test.ts asserts the character count
 * directly so this cannot silently regress.
 */
// `spandrelMaterial` ("stone", the default, or "metal") and `glassTint`/
// `frameTint` (RGB multipliers, default 1 = unchanged) are RUN3's second
// pass at this table: RUN2 shipped real variety in floor count, window
// proportion and mullion style, but every variant of a character still
// drew its spandrel band and window glass/frame in that ONE character's
// single fixed colour (docs/audits/K6-BUILDINGS.md's item 2 named this
// gap explicitly: "no equivalent variety in window-frame colour or glass
// tint"). Omitted on every RUN2 variant on purpose, so they default to
// "stone"/1/1 -- byte-identical to RUN2's own output, not just RUN1's.
export const FACADE_VARIANTS = {
  heritage: [
    { name: "sash-grid", floors: 8, cols: 8, winMarginXFrac: 0.18, winMarginYFrac: 0.18, mullion: "cross", spandrel: 8 },
    { name: "tall-sash", floors: 6, cols: 7, winMarginXFrac: 0.22, winMarginYFrac: 0.12, mullion: "single", spandrel: 14 },
    { name: "narrow-bay", floors: 9, cols: 9, winMarginXFrac: 0.26, winMarginYFrac: 0.22, mullion: "cross", spandrel: 10 },
    { name: "soot-aged", floors: 8, cols: 8, winMarginXFrac: 0.20, winMarginYFrac: 0.16, mullion: "cross", spandrel: 9, glassTint: 0.72, frameTint: 0.65 },
  ],
  interwar: [
    { name: "classic-grid", floors: 8, cols: 8, winMarginXFrac: 0.18, winMarginYFrac: 0.18, mullion: "cross", spandrel: 8 },
    { name: "deco-pier", floors: 10, cols: 6, winMarginXFrac: 0.16, winMarginYFrac: 0.10, mullion: "double", spandrel: 10 },
    { name: "classical-masonry", floors: 7, cols: 7, winMarginXFrac: 0.20, winMarginYFrac: 0.16, mullion: "single", spandrel: 12 },
    { name: "verdigris-trim", floors: 9, cols: 7, winMarginXFrac: 0.17, winMarginYFrac: 0.13, mullion: "double", spandrel: 8, spandrelMaterial: "metal", glassTint: 1.12 },
  ],
  postwar: [
    { name: "standard-grid", floors: 8, cols: 8, winMarginXFrac: 0.18, winMarginYFrac: 0.18, mullion: "cross", spandrel: 8 },
    { name: "ribbon-window", floors: 8, cols: 10, winMarginXFrac: 0.08, winMarginYFrac: 0.22, mullion: "single", spandrel: 6 },
    { name: "concrete-grid", floors: 6, cols: 6, winMarginXFrac: 0.14, winMarginYFrac: 0.14, mullion: "cross", spandrel: 16 },
    { name: "metal-spandrel", floors: 8, cols: 8, winMarginXFrac: 0.16, winMarginYFrac: 0.18, mullion: "single", spandrel: 10, spandrelMaterial: "metal", frameTint: 0.85 },
  ],
  contemporary: [
    { name: "standard-curtain", floors: 8, cols: 8, winMarginXFrac: 0.18, winMarginYFrac: 0.18, mullion: "cross", spandrel: 8 },
    { name: "full-curtain-wall", floors: 12, cols: 6, winMarginXFrac: 0.04, winMarginYFrac: 0.04, mullion: "none", spandrel: 3 },
    { name: "composite-panel", floors: 9, cols: 9, winMarginXFrac: 0.10, winMarginYFrac: 0.10, mullion: "single", spandrel: 5 },
    { name: "dark-reflective", floors: 10, cols: 7, winMarginXFrac: 0.06, winMarginYFrac: 0.06, mullion: "none", spandrel: 4, spandrelMaterial: "metal", glassTint: 0.55 },
  ],
};

/**
 * Deterministic in [0, 1) from a string -- no Math.random, matching this
 * file's existing reproducibility rule. FNV-1a, not a plain polynomial
 * accumulator: a `h = h*31 + charCode` hash barely changes between strings
 * that differ only in a trailing digit (`"x|sample-8"` vs `"x|sample-9"`
 * differ by 1 before the final modulo), and real building seeds are
 * exactly that shape (`"terrace-0"`, `"terrace-1"`, ...) -- caught by
 * test/facadeVariants.test.ts's own distribution check going red against
 * the weaker hash first, not assumed safe from reading the formula alone.
 */
function hash01(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 4294967296;
}

/**
 * Scales a "#rrggbb" colour by `factor`, clamped to a valid byte per
 * channel. Exported and unit-tested directly (test/facadeVariants.test.ts):
 * this file's own createCanvas() Node fallback makes every canvas drawing
 * call a no-op, so nothing about what generateFacadeAtlas actually PAINTS
 * can be verified by running it in this test harness -- the pure colour
 * math is the one part of RUN3's tint/spandrel-material feature that CAN
 * be checked directly, and it is, rather than leaving the whole feature
 * structurally untestable and calling that acceptable.
 */
export function tintHex(hex, factor) {
  const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${clampByte(r * factor)}, ${clampByte(g * factor)}, ${clampByte(b * factor)})`;
}

/**
 * The spandrel band's PBR treatment for a variant: real metal values
 * (lower roughness, high metalness) for `spandrelMaterial: "metal"`,
 * unchanged stone values otherwise. Exported and unit-tested directly for
 * the same reason as `tintHex` above -- it is a pure decision, computed
 * once per atlas, that canvas drawing calls cannot make independently
 * checkable in this harness.
 */
export function spandrelTreatment(variant, spec, wallMetalByte) {
  const isMetal = variant.spandrelMaterial === "metal";
  return {
    diffuse: isMetal ? "rgb(90, 92, 96)" : spec.stoneTrim,
    roughByte: Math.round((isMetal ? 0.35 : spec.roughnessTrim) * 255),
    metalByte: isMetal ? 200 : wallMetalByte,
  };
}

/**
 * Picks one variant for (character, variantSeed), deterministically. No
 * variantSeed -> variant 0, so every caller that does not yet pass one keeps
 * today's exact output (backward compatible by construction, not by review).
 */
export function pickVariant(character, variantSeed) {
  const variants = FACADE_VARIANTS[character] || FACADE_VARIANTS.heritage;
  if (!variantSeed) return variants[0];
  const idx = Math.floor(hash01(`${character}|${variantSeed}`) * variants.length);
  return variants[idx];
}

/**
 * Creates an offscreen canvas or node canvas wrapper.
 */
function createCanvas(w, h) {
  if (typeof document !== "undefined" && document.createElement) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  // Node / headless fallback
  return {
    width: w,
    height: h,
    getContext: () => ({
      fillStyle: "#000000",
      strokeStyle: "#000000",
      lineWidth: 1,
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
      arc() {},
      getImageData: () => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData() {},
      drawImage() {},
    }),
  };
}

/**
 * Procedurally draws a complete facade atlas tile.
 */
export function generateFacadeAtlas(character = "heritage", size = 1024, variantSeed = "") {
  const spec = FACADE_FAMILIES[character] || FACADE_FAMILIES.heritage;
  const variant = pickVariant(character, variantSeed);

  // 1. Diffuse (Color) Canvas
  const diffCanvas = createCanvas(size, size);
  const dctx = diffCanvas.getContext("2d");

  // 2. Roughness Canvas (Grayscale: 0 = smooth, 255 = rough)
  const roughCanvas = createCanvas(size, size);
  const rctx = roughCanvas.getContext("2d");

  // 3. Metalness Canvas (Grayscale: 0 = dielectric/wall, 255 = metallic glass)
  const metalCanvas = createCanvas(size, size);
  const mctx = metalCanvas.getContext("2d");

  // 4. Normal Map Canvas (RGB: X=R, Y=G, Z=B)
  const normCanvas = createCanvas(size, size);
  const nctx = normCanvas.getContext("2d");

  // 5. Emissive Canvas (RGB: Night glow)
  const emissCanvas = createCanvas(size, size);
  const ectx = emissCanvas.getContext("2d");

  // Fill wall backgrounds
  dctx.fillStyle = spec.wallBase;
  dctx.fillRect(0, 0, size, size);

  const wallRoughByte = Math.round(spec.roughnessWall * 255);
  rctx.fillStyle = `rgb(${wallRoughByte},${wallRoughByte},${wallRoughByte})`;
  rctx.fillRect(0, 0, size, size);

  const wallMetalByte = Math.round((spec.metalnessWall || 0.0) * 255);
  mctx.fillStyle = `rgb(${wallMetalByte},${wallMetalByte},${wallMetalByte})`;
  mctx.fillRect(0, 0, size, size);

  // Flat normal base (0.5, 0.5, 1.0 -> RGB: 128, 128, 255)
  nctx.fillStyle = "rgb(128, 128, 255)";
  nctx.fillRect(0, 0, size, size);

  // Emissive black base
  ectx.fillStyle = "#000000";
  ectx.fillRect(0, 0, size, size);

  const floors = variant.floors;
  const cols = variant.cols;
  const spandrelPx = variant.spandrel;
  const cellH = size / floors;
  const cellW = size / cols;

  // Per-variant colour treatment (RUN3): "stone"/1/1 on every RUN2 variant,
  // by omission, so their output is unchanged. `spandrelMaterial: "metal"`
  // gives the floor-dividing band real metal PBR values instead of stone's
  // (lower roughness, real metalness), not just a different diffuse colour.
  const { diffuse: spandrelDiffuse, roughByte: spandrelRoughByte, metalByte: spandrelMetalByte } =
    spandrelTreatment(variant, spec, wallMetalByte);
  const windowFrameDiffuse = tintHex(spec.windowFrame, variant.frameTint ?? 1);
  const glassDiffuse = tintHex(spec.glassColor, variant.glassTint ?? 1);

  for (let f = 0; f < floors; f++) {
    const y = f * cellH;
    const isGroundFloor = f === floors - 1;
    const isTopFloor = f === 0;

    // Floor dividing spandrel
    dctx.fillStyle = spandrelDiffuse;
    dctx.fillRect(0, y, size, spandrelPx);
    rctx.fillStyle = `rgb(${spandrelRoughByte},${spandrelRoughByte},${spandrelRoughByte})`;
    rctx.fillRect(0, y, size, spandrelPx);
    mctx.fillStyle = `rgb(${spandrelMetalByte},${spandrelMetalByte},${spandrelMetalByte})`;
    mctx.fillRect(0, y, size, spandrelPx);

    // Spandrel top/bottom normal bevel
    nctx.fillStyle = "rgb(128, 180, 255)"; // slight upward normal
    nctx.fillRect(0, y, size, Math.min(2, spandrelPx));
    nctx.fillStyle = "rgb(128, 80, 255)";  // slight downward normal
    nctx.fillRect(0, y + Math.max(0, spandrelPx - 2), size, Math.min(2, spandrelPx));

    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const winMarginX = cellW * variant.winMarginXFrac;
      const winMarginY = cellH * variant.winMarginYFrac;
      const winW = cellW - winMarginX * 2;
      const winH = cellH - winMarginY * 2;
      const winX = x + winMarginX;
      const winY = y + winMarginY;

      // Window Frame
      dctx.fillStyle = windowFrameDiffuse;
      dctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
      rctx.fillStyle = `rgb(${Math.round(spec.roughnessTrim * 255)},${Math.round(spec.roughnessTrim * 255)},${Math.round(spec.roughnessTrim * 255)})`;
      rctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
      mctx.fillStyle = "rgb(80, 80, 80)"; // metallic trim frame
      mctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);

      // Window Glass
      dctx.fillStyle = glassDiffuse;
      dctx.fillRect(winX, winY, winW, winH);

      // Roughness: Glass is very smooth (glossy specular reflection)
      const glassRoughByte = Math.round(spec.roughnessGlass * 255);
      rctx.fillStyle = `rgb(${glassRoughByte},${glassRoughByte},${glassRoughByte})`;
      rctx.fillRect(winX, winY, winW, winH);

      // Metalness: Glass is highly metallic PBR reflection
      const glassMetalByte = Math.round(spec.metalnessGlass * 255);
      mctx.fillStyle = `rgb(${glassMetalByte},${glassMetalByte},${glassMetalByte})`;
      mctx.fillRect(winX, winY, winW, winH);

      // Normal map: Recessed window reveal edges
      // Left edge normal (+X: 180)
      nctx.fillStyle = "rgb(180, 128, 255)";
      nctx.fillRect(winX - 2, winY, 3, winH);
      // Right edge normal (-X: 80)
      nctx.fillStyle = "rgb(80, 128, 255)";
      nctx.fillRect(winX + winW - 1, winY, 3, winH);
      // Top edge normal (+Y: 180)
      nctx.fillStyle = "rgb(128, 180, 255)";
      nctx.fillRect(winX, winY - 2, winW, 3);
      // Bottom sill normal (-Y: 80)
      nctx.fillStyle = "rgb(128, 80, 255)";
      nctx.fillRect(winX, winY + winH - 1, winW, 3);

      // Window Mullions (structural crossbars in diffuse + normal). Style
      // varies by variant.mullion -- "cross" reproduces this file's
      // original single-vertical-plus-horizontal bar exactly (default
      // variant 0, so today's output is unchanged byte-for-byte).
      if (variant.mullion !== "none") {
        const piers = variant.mullion === "double" ? [winW / 3, (winW * 2) / 3] : [winW / 2];
        for (const px of piers) {
          dctx.fillStyle = windowFrameDiffuse;
          dctx.fillRect(winX + px - 1, winY, 2, winH);
          nctx.fillStyle = "rgb(160, 128, 255)";
          nctx.fillRect(winX + px - 1, winY, 1, winH);
          nctx.fillStyle = "rgb(96, 128, 255)";
          nctx.fillRect(winX + px, winY, 1, winH);
        }
        if (variant.mullion === "cross") {
          dctx.fillStyle = windowFrameDiffuse;
          dctx.fillRect(winX, winY + winH * 0.4 - 1, winW, 2);
        }
      }

      // Window Sill
      dctx.fillStyle = spec.stoneTrim;
      dctx.fillRect(winX - 4, winY + winH, winW + 8, 4);

      // Emissive Night Lighting (approx 40% of windows lit)
      const isLit = (Math.sin(f * 13.7 + c * 19.3) > 0.1);
      if (isLit) {
        ectx.fillStyle = spec.emissiveNight;
        ectx.fillRect(winX + 2, winY + 2, winW - 4, winH - 4);
      }
    }
  }

  // 6. Reserved Plain / Roof Patch (Bottom-Right and Top-Right in UV space)
  // Ensures that non-wall parts (roofs, copings, eaves, plant) mapped to UV (0.97, 0.97)
  // receive clean solid diffuse (multiplied by vertexColors), matte roughness, flat normal, and zero emissive.
  const patchSize = 64;
  for (const patchY of [0, size - patchSize]) {
    const patchX = size - patchSize;
    // Diffuse: Solid pure white so vertex color carries the roof palette
    dctx.fillStyle = "#ffffff";
    dctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Roughness: Matte / stone finish (roughness ~0.84)
    rctx.fillStyle = "rgb(215, 215, 215)";
    rctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Metalness: Zero metalness on roof/stone
    mctx.fillStyle = "rgb(0, 0, 0)";
    mctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Normal: Flat normal pointing straight out (128, 128, 255)
    nctx.fillStyle = "rgb(128, 128, 255)";
    nctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Emissive: Pure black (no window glow on roofs)
    ectx.fillStyle = "#000000";
    ectx.fillRect(patchX, patchY, patchSize, patchSize);
  }

  // 6b. Reserved TEXTURED Trim Patch (K7.1) -- immediately left of the plain
  // patch above, same two mirrored rows, same size. Closes the gap
  // docs/audits/K6-BUILDINGS.md named: architectural trim (cornices, string
  // courses, parapets -- built by buildings.js's mergeWithMassingDepth) had
  // no atlas region that was both textured and free of window/mullion
  // pixels. `stoneTrim` already existed per character for exactly this
  // purpose but was only ever painted as thin in-texture spandrel bands.
  // This gives it a patch of its own: a real, visible value grain plus
  // coursing joints, not a flat solid multiplied by vertex color the way
  // the plain patch above works. Painted with deterministic sine-based
  // pseudo-noise (matching this file's existing window-lit-pattern
  // convention above), not Math.random -- atlas generation stays
  // reproducible run to run.
  {
    const trimPatchSize = 64;
    const trimPatchX = size - patchSize * 2; // directly left of the plain/roof patch, never overlapping it
    const tr = parseInt(spec.stoneTrim.slice(1, 3), 16);
    const tg = parseInt(spec.stoneTrim.slice(3, 5), 16);
    const tb = parseInt(spec.stoneTrim.slice(5, 7), 16);
    const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const grainCell = 4;
    for (const patchY of [0, size - trimPatchSize]) {
      for (let py = 0; py < trimPatchSize; py += grainCell) {
        for (let px = 0; px < trimPatchSize; px += grainCell) {
          const n = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
          const grain = (n - Math.floor(n)) - 0.5; // deterministic pseudo-random in [-0.5, 0.5)
          const shade = 1 + grain * 0.22; // +/-11% value variation per grain cell
          dctx.fillStyle = `rgb(${clampByte(tr * shade)}, ${clampByte(tg * shade)}, ${clampByte(tb * shade)})`;
          dctx.fillRect(trimPatchX + px, patchY + py, grainCell, grainCell);
        }
      }
      // Coursing joints: a stone or concrete cornice reads as coursed
      // blocks, not a smooth slab.
      dctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      for (let cy = 16; cy < trimPatchSize; cy += 16) {
        dctx.fillRect(trimPatchX, patchY + cy, trimPatchSize, 1);
      }

      rctx.fillStyle = `rgb(${Math.round(spec.roughnessTrim * 255)}, ${Math.round(spec.roughnessTrim * 255)}, ${Math.round(spec.roughnessTrim * 255)})`;
      rctx.fillRect(trimPatchX, patchY, trimPatchSize, trimPatchSize);

      mctx.fillStyle = `rgb(${wallMetalByte}, ${wallMetalByte}, ${wallMetalByte})`;
      mctx.fillRect(trimPatchX, patchY, trimPatchSize, trimPatchSize);

      nctx.fillStyle = "rgb(128, 128, 255)";
      nctx.fillRect(trimPatchX, patchY, trimPatchSize, trimPatchSize);

      ectx.fillStyle = "#000000";
      ectx.fillRect(trimPatchX, patchY, trimPatchSize, trimPatchSize);
    }
  }

  // 7. Reserved Dedicated Glass / Curtain Wall Patch (Bottom-Left and Top-Left in UV space)
  // Maps to UV (0.03, 0.97) for glass facades, curtain wall panels, and structural glazing.
  for (const patchY of [0, size - patchSize]) {
    const patchX = 0;
    // Diffuse: Tinted reflective architectural glass
    dctx.fillStyle = spec.glassColor;
    dctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Roughness: Ultra-smooth glass (~0.04)
    rctx.fillStyle = "rgb(10, 10, 10)";
    rctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Metalness: High PBR specular reflection (~0.94)
    mctx.fillStyle = "rgb(240, 240, 240)";
    mctx.fillRect(patchX, patchY, patchSize, patchSize);

    // Normal: Mullion grid lines every 16 pixels
    nctx.fillStyle = "rgb(128, 128, 255)";
    nctx.fillRect(patchX, patchY, patchSize, patchSize);
    for (let gx = 0; gx < patchSize; gx += 16) {
      nctx.fillStyle = "rgb(160, 128, 255)";
      nctx.fillRect(patchX + gx, patchY, 1, patchSize);
      nctx.fillStyle = "rgb(96, 128, 255)";
      nctx.fillRect(patchX + gx + 1, patchY, 1, patchSize);
    }
    for (let gy = 0; gy < patchSize; gy += 16) {
      nctx.fillStyle = "rgb(128, 160, 255)";
      nctx.fillRect(patchX, patchY + gy, patchSize, 1);
      nctx.fillStyle = "rgb(128, 96, 255)";
      nctx.fillRect(patchX, patchY + gy + 1, patchSize, 1);
    }

    // Emissive: Pure black
    ectx.fillStyle = "#000000";
    ectx.fillRect(patchX, patchY, patchSize, patchSize);
  }

  // Create Three.js CanvasTextures
  const map = new THREE.CanvasTexture(diffCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const metalnessMap = new THREE.CanvasTexture(metalCanvas);
  metalnessMap.wrapS = THREE.RepeatWrapping;
  metalnessMap.wrapT = THREE.RepeatWrapping;

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(emissCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap, metalnessMap, normalMap, emissiveMap, character, spec, variant };
}

/** Cache of created materials per character (and, now, per atlas variant) */
const _materialCache = new Map();

/**
 * Returns a PBR MeshStandardMaterial equipped with facade texture maps for a
 * given character. `options.variantSeed`, if supplied, selects one of that
 * character's intra-character atlas variants (see FACADE_VARIANTS above);
 * omitted, this is byte-identical to this function's behaviour before
 * variants existed -- every existing caller that does not pass it keeps
 * exactly the material it got before.
 */
export function getFacadeMaterial(character = "heritage", options = {}) {
  const key = `${character}-${options.vertexColors ? "vc" : options.wallColor || "default"}-${options.night ? "night" : "day"}-${options.variantSeed || ""}`;
  if (_materialCache.has(key)) return _materialCache.get(key);

  const atlas = generateFacadeAtlas(character, 1024, options.variantSeed);
  const mat = new THREE.MeshStandardMaterial({
    map: atlas.map,
    roughnessMap: atlas.roughnessMap,
    metalnessMap: atlas.metalnessMap,
    normalMap: atlas.normalMap,
    emissiveMap: atlas.emissiveMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: options.night ? 1.2 : 0.08,
    roughness: 1.0,
    metalness: 1.0,
    envMapIntensity: 1.2,
    vertexColors: !!options.vertexColors,
  });

  if (!options.vertexColors && options.wallColor) {
    mat.color.setHex(options.wallColor);
  }

  _materialCache.set(key, mat);
  return mat;
}

