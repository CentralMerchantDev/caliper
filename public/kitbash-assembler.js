// =============================================================================
// CALIPER — MODULAR KITBASH ASSEMBLER (Phase A3)
//
// Stacks compatible kitbash parts (Podium -> Shaft -> Crown -> Roof Feature)
// based on mating sockets, lot cell dimensions, typology styles, and a deterministic seed.
//
// Hard Constraints:
//   - Deterministic from seed (seed -> identical assembly output)
//   - Budgeted: LOD0 within 1,500–3,000 triangles
//   - Multi-LOD: LOD1 (~300-800 tris), LOD2 (< 150 tris)
// =============================================================================

import * as THREE from "./vendor/three/three.module.min.js";
import { KITBASH_PARTS, CELL_M, resolvePalette } from "./kitbash-parts.js";

/**
 * Fast deterministic seeded PRNG (Mulberry32)
 */
export function createRng(seed) {
  let s = typeof seed === "number" ? seed >>> 0 : hashString(String(seed));
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Filters parts by category and matching socket constraints.
 */
function getMatchingParts(category, predicate) {
  return Object.values(KITBASH_PARTS).filter((p) => p.category === category && (!predicate || predicate(p)));
}

/**
 * Assembles a complete building from modular kitbash parts.
 *
 * @param {Object} options
 * @param {Object} options.foot - { w: number, d: number } in cells
 * @param {string} [options.style] - e.g. "commercial", "residential", "artdeco", "eco", "landmark", "fabric"
 * @param {number|string} [options.seed=42] - Deterministic PRNG seed
 * @param {number} [options.lod=0] - LOD level (0, 1, or 2)
 * @param {Object} [options.palette] - Materials palette overrides
 * @param {Object} [T=THREE] - Three.js namespace
 */
export function assembleBuilding(options = {}, T = THREE) {
  const {
    foot = { w: 4, d: 4 },
    style = "commercial",
    seed = 42,
    lod = 0,
    palette = {},
  } = options;

  const rng = createRng(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // For ordinary low-rise fabric, assemble single or dual-tier plain modules
  if (style === "fabric" || foot.w <= 2 && foot.d <= 2 && rng() < 0.4) {
    const fabricParts = getMatchingParts("fabric", (p) => p.foot.w <= foot.w && p.foot.d <= foot.d);
    const chosen = fabricParts.length ? pick(fabricParts) : KITBASH_PARTS["fabric-masonry-block-low"];
    const subGeos = chosen.buildGeometry(T, palette, lod);
    return {
      name: chosen.name,
      recipe: [chosen.id],
      height: chosen.height,
      foot: chosen.foot,
      parts: subGeos,
      triangleCount: countTriangles(subGeos),
    };
  }

  // 1. Select Podium matching lot cell dimensions
  const podiumCandidates = getMatchingParts("podium", (p) => p.foot.w <= foot.w && p.foot.d <= foot.d);
  const podium = podiumCandidates.length ? pick(podiumCandidates) : KITBASH_PARTS["podium-retail-colonnade"];
  const topSocketPod = podium.sockets.top;

  // 2. Select Shaft mating with podium's top socket
  const shaftCandidates = getMatchingParts("shaft", (p) =>
    Math.abs(p.sockets.bottom.w - topSocketPod.w) <= 1 &&
    Math.abs(p.sockets.bottom.d - topSocketPod.d) <= 1
  );
  const shaft = shaftCandidates.length ? pick(shaftCandidates) : KITBASH_PARTS["shaft-curtain-wall-straight"];
  const topSocketShaft = shaft.sockets.top;

  // 3. Select Crown mating with shaft's top socket
  const crownCandidates = getMatchingParts("crown", (p) =>
    Math.abs(p.sockets.bottom.w - topSocketShaft.w) <= 1 &&
    Math.abs(p.sockets.bottom.d - topSocketShaft.d) <= 1
  );
  const crown = crownCandidates.length ? pick(crownCandidates) : KITBASH_PARTS["crown-plain-parapet"];
  const topSocketCrown = crown.sockets.top;

  // 4. Select Optional Roof Feature if crown has a top mounting socket
  let roofFeature = null;
  if (topSocketCrown.w > 0 && rng() > 0.15) {
    const roofCandidates = getMatchingParts("roof", (p) => p.sockets.bottom.w <= topSocketCrown.w);
    if (roofCandidates.length) {
      roofFeature = pick(roofCandidates);
    }
  }

  // 5. Stack geometries along Y axis
  const recipe = [podium.id, shaft.id, crown.id];
  if (roofFeature) recipe.push(roofFeature.id);

  const assembledParts = [];
  let currentY = 0;

  // A. Build Podium
  const podGeos = podium.buildGeometry(T, palette, lod);
  for (const g of podGeos) {
    assembledParts.push({
      geo: g.geo.clone().translate(0, currentY, 0),
      tag: g.tag,
      color: g.color,
    });
  }
  currentY += podium.height;

  // B. Build Shaft
  const shaftGeos = shaft.buildGeometry(T, palette, lod);
  for (const g of shaftGeos) {
    assembledParts.push({
      geo: g.geo.clone().translate(0, currentY, 0),
      tag: g.tag,
      color: g.color,
    });
  }
  currentY += shaft.height;

  // C. Build Crown
  const crownGeos = crown.buildGeometry(T, palette, lod);
  for (const g of crownGeos) {
    assembledParts.push({
      geo: g.geo.clone().translate(0, currentY, 0),
      tag: g.tag,
      color: g.color,
    });
  }
  currentY += crown.height;

  // D. Build Roof Feature (if present)
  if (roofFeature) {
    const roofGeos = roofFeature.buildGeometry(T, palette, lod);
    for (const g of roofGeos) {
      assembledParts.push({
        geo: g.geo.clone().translate(0, currentY, 0),
        tag: g.tag,
        color: g.color,
      });
    }
    currentY += roofFeature.height;
  }

  return {
    name: `${podium.name} + ${shaft.name} + ${crown.name}`,
    recipe,
    height: currentY,
    foot,
    parts: assembledParts,
    triangleCount: countTriangles(assembledParts),
  };
}

function countTriangles(parts) {
  let tris = 0;
  for (const p of parts) {
    if (p.geo) {
      tris += p.geo.index ? p.geo.index.count / 3 : p.geo.attributes.position.count / 3;
    }
  }
  return tris;
}
