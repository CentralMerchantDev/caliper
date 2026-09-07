// =============================================================================
// CALIPER — MODULAR KITBASH TOWER EXEMPLAR (LOOK-UPGRADE.md Stage 2 Proof of Concept)
//
// Demonstrates the modular kitbash geometry path for high-silhouette landmark
// buildings. Assembled from 4 modular parts:
//   1. Podium: Ground retail colonnade, fluted stone pillars, entrance lobby, bevelled cornice
//   2. Shaft: Chamfered tower core extruded with bevels, vertical structural fins, curtain wall glazing
//   3. Crown: Stepped Art Deco ziggurat lantern crown with bevelled setbacks
//   4. Roof Feature: Rooftop architectural spire / aerial array with lathe mast and structural struts
//
// Conforms strictly to PLACEMENT-CONTRACT.md (whole-cell footprint: 4x4 cells = 32x32m).
// Uses ExtrudeGeometry with bevels and profiles rather than stacked plain boxes.
// =============================================================================

import * as THREE from "./vendor/three/three.module.min.js";

/**
 * Creates a 2D rounded rectangle shape with chamfered or rounded corners.
 */
function createChamferedRectShape(width, depth, radius) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, Math.min(hw, hd) * 0.4);

  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  return shape;
}

/**
 * Creates an extruded bevelled box / slab with 3D profile edge.
 */
function createBevelledExtrusion(shape, height, bevelSize = 0.3, bevelSegments = 2) {
  const extrudeSettings = {
    steps: 1,
    depth: height - bevelSize * 2,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize: bevelSize,
    bevelOffset: 0,
    bevelSegments: bevelSegments,
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rotate so extrusion runs upward along Y axis instead of Z
  geo.rotateX(Math.PI / 2);
  geo.translate(0, height, 0);
  return geo;
}

/**
 * Builds the modular kitbash tower exemplar.
 */
export function buildKitbashTowerExemplar(options = {}, T = THREE) {
  const footW = 32; // 4 cells = 32 m
  const footD = 32; // 4 cells = 32 m
  const palette = {
    wall: options.wallColor || 0xd8d0c2,   // warm limestone / architectural masonry
    roof: options.roofColor || 0x3d4852,   // dark zinc / slate trim
    glass: options.glassColor || 0x1a3347, // deep reflective architectural glass
    trim: options.trimColor || 0xb5a995,   // bronze/stone trim
  };

  const parts = [];

  // ---------------------------------------------------------------------------
  // 1. PODIUM (Ground Level to 14m)
  // ---------------------------------------------------------------------------
  const podH = 14;
  const podW = 31.0;
  const podD = 31.0;

  // Base plinth
  const plinth = new T.BoxGeometry(podW, 1.2, podD);
  plinth.translate(0, 0.6, 0);
  parts.push({ geo: plinth, tag: "roof", color: palette.roof });

  // Glazed ground lobby core (recessed behind colonnade)
  const lobbyW = podW * 0.88;
  const lobbyD = podD * 0.88;
  const lobby = new T.BoxGeometry(lobbyW, podH - 2.4, lobbyD);
  lobby.translate(0, 1.2 + (podH - 2.4) / 2, 0);
  parts.push({ geo: lobby, tag: "glass", color: palette.glass });

  // Fluted perimeter colonnade pillars
  const pillarCountX = 6;
  const pillarCountZ = 6;
  const pillarSize = 1.0;
  for (let ix = 0; ix < pillarCountX; ix++) {
    for (let iz = 0; iz < pillarCountZ; iz++) {
      const isPerimeter = ix === 0 || ix === pillarCountX - 1 || iz === 0 || iz === pillarCountZ - 1;
      if (!isPerimeter) continue;

      const px = -podW / 2 + 1.2 + (ix / (pillarCountX - 1)) * (podW - 2.4);
      const pz = -podD / 2 + 1.2 + (iz / (pillarCountZ - 1)) * (podD - 2.4);

      // Chamfered column profile via small extruded cylinder or box
      const col = new T.CylinderGeometry(pillarSize * 0.5, pillarSize * 0.55, podH - 2.4, 8);
      col.translate(px, 1.2 + (podH - 2.4) / 2, pz);
      parts.push({ geo: col, tag: "wall", color: palette.wall });
    }
  }

  // Grand entrance canopy on front (+Z)
  const canopyW = 12.0;
  const canopyD = 3.5;
  const canopy = new T.BoxGeometry(canopyW, 0.6, canopyD);
  canopy.translate(0, 5.5, podD / 2 + canopyD / 2 - 0.5);
  parts.push({ geo: canopy, tag: "roof", color: palette.roof });

  // Bevelled podium cornice molding
  const podCorniceShape = createChamferedRectShape(podW + 0.6, podD + 0.6, 1.2);
  const podCornice = createBevelledExtrusion(podCorniceShape, 1.2, 0.35, 2);
  podCornice.translate(0, podH - 1.2, 0);
  parts.push({ geo: podCornice, tag: "wall", color: palette.trim });

  // ---------------------------------------------------------------------------
  // 2. SHAFT (14m to 68m, Height = 54m)
  // ---------------------------------------------------------------------------
  const shaftH = 54;
  const shaftBaseW = 27.0;
  const shaftBaseD = 27.0;

  // Extruded chamfered glass curtain wall core
  const glassCoreShape = createChamferedRectShape(shaftBaseW - 0.4, shaftBaseD - 0.4, 2.0);
  const glassCore = createBevelledExtrusion(glassCoreShape, shaftH, 0.25, 2);
  glassCore.translate(0, podH, 0);
  parts.push({ geo: glassCore, tag: "glass", color: palette.glass });

  // Architectural vertical structural pilasters / fins on 4 facades
  const finCount = 5;
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    for (let f = 0; f < finCount; f++) {
      const offset = (-0.5 + f / (finCount - 1)) * (shaftBaseW - 4.0);
      const fin = new T.BoxGeometry(0.6, shaftH + 1.5, 0.8);
      fin.translate(offset, podH + (shaftH + 1.5) / 2, (shaftBaseD - 0.2) / 2);
      fin.rotateY(angle);
      parts.push({ geo: fin, tag: "wall", color: palette.wall });
    }
  }

  // Mid-shaft sculptural belt course band at 40m
  const beltH = 1.0;
  const beltShape = createChamferedRectShape(shaftBaseW + 0.4, shaftBaseD + 0.4, 2.2);
  const beltBand = createBevelledExtrusion(beltShape, beltH, 0.3, 2);
  beltBand.translate(0, podH + shaftH * 0.5, 0);
  parts.push({ geo: beltBand, tag: "wall", color: palette.trim });

  // Shaft top balcony / observation cantilever cornice
  const shaftTopShape = createChamferedRectShape(shaftBaseW + 0.8, shaftBaseD + 0.8, 2.2);
  const shaftCornice = createBevelledExtrusion(shaftTopShape, 1.4, 0.4, 2);
  shaftCornice.translate(0, podH + shaftH, 0);
  parts.push({ geo: shaftCornice, tag: "roof", color: palette.roof });

  // ---------------------------------------------------------------------------
  // 3. CROWN (68m to 82m, Height = 14m)
  // ---------------------------------------------------------------------------
  const crownH = 14;
  const crownTiers = 3;
  const tierH = crownH / crownTiers;

  for (let i = 0; i < crownTiers; i++) {
    const k = 1.0 - i * 0.22;
    const tw = shaftBaseW * k * 0.88;
    const td = shaftBaseD * k * 0.88;
    const ty = podH + shaftH + 1.4 + i * tierH;

    // Bevelled ziggurat tier
    const tierShape = createChamferedRectShape(tw, td, 1.5 * k);
    const tierGeo = createBevelledExtrusion(tierShape, tierH, 0.35, 2);
    tierGeo.translate(0, ty, 0);
    parts.push({ geo: tierGeo, tag: "wall", color: palette.wall });

    // Lantern illuminated window slots on each tier
    const slotW = tw * 0.7;
    const slotD = td * 0.7;
    const slot = new T.BoxGeometry(slotW, tierH * 0.6, slotD);
    slot.translate(0, ty + tierH * 0.5, 0);
    parts.push({ geo: slot, tag: "glass", color: palette.glass });
  }

  // ---------------------------------------------------------------------------
  // 4. ROOF FEATURE: ARCHITECTURAL SPIRE & MAST (82m to 92m)
  // ---------------------------------------------------------------------------
  const spireBaseY = podH + shaftH + 1.4 + crownH;

  // Spire plinth base
  const spireBase = new T.CylinderGeometry(2.2, 2.8, 1.5, 12);
  spireBase.translate(0, spireBaseY + 0.75, 0);
  parts.push({ geo: spireBase, tag: "roof", color: palette.roof });

  // Lathe-like tapered architectural communications spire
  const spireH = 8.5;
  const spire = new T.CylinderGeometry(0.2, 1.4, spireH, 12);
  spire.translate(0, spireBaseY + 1.5 + spireH / 2, 0);
  parts.push({ geo: spire, tag: "roof", color: palette.trim });

  // Spire beacon tip
  const beacon = new T.SphereGeometry(0.5, 8, 8);
  beacon.translate(0, spireBaseY + 1.5 + spireH + 0.3, 0);
  parts.push({ geo: beacon, tag: "roof", color: 0xff3333 });

  // Four structural diagonal support struts
  for (let s = 0; s < 4; s++) {
    const angle = (s * Math.PI) / 2 + Math.PI / 4;
    const strut = new T.CylinderGeometry(0.12, 0.12, 4.2, 6);
    strut.rotateZ(0.45);
    strut.rotateY(angle);
    strut.translate(
      Math.sin(angle) * 1.8,
      spireBaseY + 2.5,
      Math.cos(angle) * 1.8
    );
    parts.push({ geo: strut, tag: "roof", color: palette.roof });
  }

  // Merge into single multi-LOD geometry
  return {
    footprint: { w: footW, d: footD },
    totalHeight: spireBaseY + 1.5 + spireH + 0.8,
    partsCount: parts.length,
    createGeometry: (geomT = T) => {
      return mergeGeometries(parts, palette, geomT);
    },
  };
}

/**
 * Helper to merge parts into a single BufferGeometry with vertexColors and UV tags.
 */
function mergeGeometries(parts, palette, T = THREE) {
  let totalPos = 0;
  let totalIdx = 0;

  for (const item of parts) {
    const g = item.geo;
    totalPos += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : g.attributes.position.count;
  }

  const posArr = new Float32Array(totalPos * 3);
  const normArr = new Float32Array(totalPos * 3);
  const colArr = new Float32Array(totalPos * 3);
  const uvArr = new Float32Array(totalPos * 2);
  const idxArr = new Uint32Array(totalIdx);

  let posOffset = 0;
  let idxOffset = 0;
  let vertOffset = 0;

  for (const item of parts) {
    const g = item.geo;
    const p = g.attributes.position;
    posArr.set(p.array, posOffset * 3);

    if (g.attributes.normal) {
      normArr.set(g.attributes.normal.array, posOffset * 3);
    }

    const tag = item.tag || "wall";
    if (tag === "wall") {
      if (g.attributes.uv) {
        uvArr.set(g.attributes.uv.array, posOffset * 2);
      }
    } else if (tag === "glass") {
      for (let i = 0; i < p.count; i++) {
        uvArr[(posOffset + i) * 2 + 0] = 0.03;
        uvArr[(posOffset + i) * 2 + 1] = 0.97;
      }
    } else {
      // Roof / trim / metal
      for (let i = 0; i < p.count; i++) {
        uvArr[(posOffset + i) * 2 + 0] = 0.97;
        uvArr[(posOffset + i) * 2 + 1] = 0.97;
      }
    }

    const c = new T.Color(item.color || (tag === "glass" ? palette.glass : tag === "roof" ? palette.roof : palette.wall));
    for (let i = 0; i < p.count; i++) {
      colArr[(posOffset + i) * 3 + 0] = c.r;
      colArr[(posOffset + i) * 3 + 1] = c.g;
      colArr[(posOffset + i) * 3 + 2] = c.b;
    }

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        idxArr[idxOffset + i] = g.index.array[i] + vertOffset;
      }
      idxOffset += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) {
        idxArr[idxOffset + i] = i + vertOffset;
      }
      idxOffset += p.count;
    }

    vertOffset += p.count;
    posOffset += p.count;
  }

  const merged = new T.BufferGeometry();
  merged.setAttribute("position", new T.BufferAttribute(posArr, 3));
  merged.setAttribute("normal", new T.BufferAttribute(normArr, 3));
  merged.setAttribute("color", new T.BufferAttribute(colArr, 3));
  merged.setAttribute("uv", new T.BufferAttribute(uvArr, 2));
  merged.setIndex(new T.BufferAttribute(idxArr, 1));
  merged.computeVertexNormals();

  return merged;
}
