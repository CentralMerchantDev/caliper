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
export function generateFacadeAtlas(character = "heritage", size = 1024) {
  const spec = FACADE_FAMILIES[character] || FACADE_FAMILIES.heritage;
  
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

  const floors = 8;
  const cols = 8;
  const cellH = size / floors;
  const cellW = size / cols;

  for (let f = 0; f < floors; f++) {
    const y = f * cellH;
    const isGroundFloor = f === floors - 1;
    const isTopFloor = f === 0;

    // Floor dividing spandrel
    dctx.fillStyle = spec.stoneTrim;
    dctx.fillRect(0, y, size, 8);
    rctx.fillStyle = `rgb(${Math.round(spec.roughnessTrim * 255)},${Math.round(spec.roughnessTrim * 255)},${Math.round(spec.roughnessTrim * 255)})`;
    rctx.fillRect(0, y, size, 8);
    mctx.fillStyle = `rgb(${wallMetalByte},${wallMetalByte},${wallMetalByte})`;
    mctx.fillRect(0, y, size, 8);

    // Spandrel top/bottom normal bevel
    nctx.fillStyle = "rgb(128, 180, 255)"; // slight upward normal
    nctx.fillRect(0, y, size, 2);
    nctx.fillStyle = "rgb(128, 80, 255)";  // slight downward normal
    nctx.fillRect(0, y + 6, size, 2);

    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const winMarginX = cellW * 0.18;
      const winMarginY = cellH * 0.18;
      const winW = cellW - winMarginX * 2;
      const winH = cellH - winMarginY * 2;
      const winX = x + winMarginX;
      const winY = y + winMarginY;

      // Window Frame
      dctx.fillStyle = spec.windowFrame;
      dctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
      rctx.fillStyle = `rgb(${Math.round(spec.roughnessTrim * 255)},${Math.round(spec.roughnessTrim * 255)},${Math.round(spec.roughnessTrim * 255)})`;
      rctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
      mctx.fillStyle = "rgb(80, 80, 80)"; // metallic trim frame
      mctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);

      // Window Glass
      dctx.fillStyle = spec.glassColor;
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

      // Window Mullions (structural crossbars in diffuse + normal)
      dctx.fillStyle = spec.windowFrame;
      dctx.fillRect(winX + winW / 2 - 1, winY, 2, winH);
      dctx.fillRect(winX, winY + winH * 0.4 - 1, winW, 2);

      // Mullion normal bevels
      nctx.fillStyle = "rgb(160, 128, 255)";
      nctx.fillRect(winX + winW / 2 - 1, winY, 1, winH);
      nctx.fillStyle = "rgb(96, 128, 255)";
      nctx.fillRect(winX + winW / 2, winY, 1, winH);

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

  return { map, roughnessMap, metalnessMap, normalMap, emissiveMap, character, spec };
}

/** Cache of created materials per character */
const _materialCache = new Map();

/**
 * Returns a PBR MeshStandardMaterial equipped with facade texture maps for a given character.
 */
export function getFacadeMaterial(character = "heritage", options = {}) {
  const key = `${character}-${options.vertexColors ? "vc" : options.wallColor || "default"}-${options.night ? "night" : "day"}`;
  if (_materialCache.has(key)) return _materialCache.get(key);

  const atlas = generateFacadeAtlas(character);
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

