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

  // 3. Normal Map Canvas (RGB: X=R, Y=G, Z=B)
  const normCanvas = createCanvas(size, size);
  const nctx = normCanvas.getContext("2d");

  // 4. Emissive Canvas (RGB: Night glow)
  const emissCanvas = createCanvas(size, size);
  const ectx = emissCanvas.getContext("2d");

  // Fill wall backgrounds
  dctx.fillStyle = spec.wallBase;
  dctx.fillRect(0, 0, size, size);

  const wallRoughByte = Math.round(spec.roughnessWall * 255);
  rctx.fillStyle = `rgb(${wallRoughByte},${wallRoughByte},${wallRoughByte})`;
  rctx.fillRect(0, 0, size, size);

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

      // Window Glass
      dctx.fillStyle = spec.glassColor;
      dctx.fillRect(winX, winY, winW, winH);

      // Roughness: Glass is very smooth (glossy)
      const glassRoughByte = Math.round(spec.roughnessGlass * 255);
      rctx.fillStyle = `rgb(${glassRoughByte},${glassRoughByte},${glassRoughByte})`;
      rctx.fillRect(winX, winY, winW, winH);

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

      // Window Mullions (crossbar)
      dctx.fillStyle = spec.windowFrame;
      dctx.fillRect(winX + winW / 2 - 1, winY, 2, winH);
      dctx.fillRect(winX, winY + winH * 0.4 - 1, winW, 2);

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

  // Create Three.js CanvasTextures
  const map = new THREE.CanvasTexture(diffCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(emissCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap, normalMap, emissiveMap, character, spec };
}

/** Cache of created materials per character */
const _materialCache = new Map();

/**
 * Returns a PBR MeshStandardMaterial equipped with facade texture maps for a given character.
 */
export function getFacadeMaterial(character = "heritage", options = {}) {
  const key = `${character}-${options.vertexColors ? "vc" : options.wallColor || "default"}`;
  if (_materialCache.has(key)) return _materialCache.get(key);

  const atlas = generateFacadeAtlas(character);
  const mat = new THREE.MeshStandardMaterial({
    map: atlas.map,
    roughnessMap: atlas.roughnessMap,
    normalMap: atlas.normalMap,
    emissiveMap: atlas.emissiveMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: options.night ? 0.8 : 0.05,
    roughness: 0.8,
    metalness: atlas.spec.metalnessGlass * 0.15,
    vertexColors: !!options.vertexColors,
  });

  if (!options.vertexColors && options.wallColor) {
    mat.color.setHex(options.wallColor);
  }

  _materialCache.set(key, mat);
  return mat;
}
