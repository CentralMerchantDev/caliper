// =============================================================================
// CALIPER — MODULAR KITBASH ASSEMBLER (Phase A3)
//
// Stacks compatible kitbash parts (Podium -> Shaft -> Crown -> Roof Feature)
// based on mating sockets, lot cell dimensions, typology styles, and a deterministic seed.
//
// Hard Constraints:
//   - Deterministic from seed (seed -> identical assembly output)
//   - Multi-LOD geometry for near, middle, and distant rendering bands
// =============================================================================

import * as THREE from "./vendor/three/three.module.min.js";
import { KITBASH_PARTS } from "./kitbash-parts.js";
import { DESIGN_RECIPE_MAP } from "./kitbash-recipe-map.js";
import { getFacadeMaterial } from "./facade-textures.js";

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
    foot = { w: 32, d: 32 },
    style = "commercial",
    seed = 42,
    lod = 0,
    palette = {},
  } = options;

  const rng = createRng(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const character = palette.character || (style === "landmark" ? "contemporary" : "interwar");
  const buildingFacade = getFacadeMaterial(character, {
    wallColor: palette.wallColor,
    night: palette.night === true,
  });
  const curtainFacade = getFacadeMaterial("contemporary", { night: palette.night === true });
  const materialFor = (part) => part.material || (part.tag === "wall" ? buildingFacade : part.tag === "glass" ? curtainFacade : undefined);

  // For ordinary low-rise fabric, assemble single or dual-tier plain modules
  if (style === "fabric" || foot.w <= 16 && foot.d <= 16 && rng() < 0.4) {
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
    Math.abs(p.sockets.bottom.w - topSocketPod.w) <= 8 &&
    Math.abs(p.sockets.bottom.d - topSocketPod.d) <= 8
  );
  const shaft = shaftCandidates.length ? pick(shaftCandidates) : KITBASH_PARTS["shaft-curtain-wall-straight"];
  const topSocketShaft = shaft.sockets.top;

  // 3. Select Crown mating with shaft's top socket
  const crownCandidates = getMatchingParts("crown", (p) =>
    Math.abs(p.sockets.bottom.w - topSocketShaft.w) <= 8 &&
    Math.abs(p.sockets.bottom.d - topSocketShaft.d) <= 8
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
      material: materialFor(g),
      facadeCharacter: g.facadeCharacter,
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
      material: materialFor(g),
      facadeCharacter: g.facadeCharacter,
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
      material: materialFor(g),
      facadeCharacter: g.facadeCharacter,
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
        material: materialFor(g),
        facadeCharacter: g.facadeCharacter,
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

/**
 * Assembles one of the 40 canonical library designs from
 * kitbash-recipe-map.js's DESIGN_RECIPE_MAP by actually building and
 * stacking its named `recipe` array, part by part.
 *
 * RUN2 item 3's finding: DESIGN_RECIPE_MAP's `recipe` field existed, was
 * structurally validated by test/kitbashRecipeMap.test.ts (every part id
 * resolves, no dangling references), and was imported into
 * public/kitbash-district.html -- and then never read again anywhere. The
 * only executable path, assembleBuilding() above, picks parts at random by
 * socket compatibility and never consults a design's curated recipe at
 * all. Measured directly (not assumed): across 60,000 assembleBuilding
 * trials spanning every style/foot combination, the entire "connector"
 * category -- all 8 parts, ~13% of the 62-part registry -- was never
 * reached, because assembleBuilding never calls getMatchingParts("connector",
 * ...). Every other category IS reachable via assembleBuilding's random
 * path even though named-recipe execution didn't exist; connectors were
 * the one category that only ever appeared in a recipe array nothing ran.
 *
 * Unlike assembleBuilding's fixed four-slot (podium/shaft/crown/roof)
 * stack, a design's recipe can be any length in any order (`'geodetic-eco-
 * home'`'s recipe is a single crown; `'skybridge-complex'`'s recipe
 * interleaves a connector between a shaft and a crown) -- so this stacks
 * generically by iterating the recipe array and accumulating Y offset by
 * each part's own declared height, the same mechanism assembleBuilding
 * already uses per-slot, generalised to any sequence.
 */
export function assembleNamedDesign(designId, options = {}, T = THREE) {
  const design = DESIGN_RECIPE_MAP[designId];
  if (!design) {
    throw new Error(`assembleNamedDesign: "${designId}" is not a canonical design in DESIGN_RECIPE_MAP`);
  }
  const { lod = 0, palette = {} } = options;
  const character = palette.character || (design.rarity === "landmark" ? "contemporary" : "interwar");
  const buildingFacade = getFacadeMaterial(character, {
    wallColor: palette.wallColor,
    night: palette.night === true,
  });
  const curtainFacade = getFacadeMaterial("contemporary", { night: palette.night === true });
  const materialFor = (part) => part.material || (part.tag === "wall" ? buildingFacade : part.tag === "glass" ? curtainFacade : undefined);

  const assembledParts = [];
  let currentY = 0;
  for (const partId of design.recipe) {
    const part = KITBASH_PARTS[partId];
    if (!part) {
      // Refuse loudly, matching this project's standard of proof: a design
      // that names a part which no longer exists in the registry is a real
      // defect, not something to silently skip and build partially.
      throw new Error(`assembleNamedDesign: "${designId}" references unknown part "${partId}"`);
    }
    const geos = part.buildGeometry(T, palette, lod);
    for (const g of geos) {
      assembledParts.push({
        geo: g.geo.clone().translate(0, currentY, 0),
        tag: g.tag,
        color: g.color,
        material: materialFor(g),
        facadeCharacter: g.facadeCharacter,
      });
    }
    currentY += part.height;
  }

  return {
    name: design.name,
    recipe: design.recipe,
    rarity: design.rarity,
    category: design.category,
    height: currentY,
    foot: design.foot,
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
