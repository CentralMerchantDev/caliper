// =============================================================================
// CALIPER — MODULAR KITBASH VOCABULARY & PART REGISTRY (Phase A2)
//
// 62 Authored parts across 6 categories:
//   1. Podiums (~8 parts)
//   2. Shafts (~16 parts)
//   3. Crowns (~12 parts)
//   4. Roof Features (~10 parts)
//   5. Connectors (~8 parts)
//   6. Ordinary Fabric (~8 parts)
//
// Every part conforms strictly to PLACEMENT-CONTRACT.md:
//   - Footprint in whole cells: foot: { w, d } (each cell = 8m)
//   - Declared mating sockets: sockets: { bottom: { w, d }, top: { w, d } }
//   - Multi-LOD geometry generation (LOD0: detailed, LOD1: simplified, LOD2: distant)
// =============================================================================

import * as THREE from "./vendor/three/three.module.min.js";
import { getFacadeMaterial } from "./facade-textures.js";

export const CELL_M = 8;

/**
 * Creates a 2D rounded rectangle shape with chamfered or rounded corners.
 */
export function createChamferedRectShape(width, depth, radius, T = THREE) {
  const shape = new T.Shape();
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
export function createBevelledExtrusion(shape, height, bevelSize = 0.3, bevelSegments = 2, T = THREE) {
  const extrudeSettings = {
    steps: 1,
    depth: Math.max(0.1, height - bevelSize * 2),
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize: bevelSize,
    bevelOffset: 0,
    bevelSegments: bevelSegments,
  };
  const geo = new T.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, height, 0);
  return geo;
}

/** Default architectural materials palette */
export function resolvePalette(palette = {}) {
  return {
    wall: palette.wallColor || 0xd8d0c2,   // warm limestone masonry
    roof: palette.roofColor || 0x3d4852,   // dark slate / zinc
    glass: palette.glassColor || 0x1a3347, // reflective architectural glass
    trim: palette.trimColor || 0xb5a995,   // bronze / sandstone accents
    metal: palette.metalColor || 0x5a6268, // structural steel
    green: palette.greenColor || 0x3b5e38, // landscaped foliage
    night: palette.night === true,
  };
}

// -----------------------------------------------------------------------------
// PART DEFINITIONS
// -----------------------------------------------------------------------------

export const KITBASH_PARTS = {};

function registerPart(def) {
  KITBASH_PARTS[def.id] = def;
  return def;
}

// =============================================================================
// 1. PODIUMS (Ground to 10m-16m)
// =============================================================================

registerPart({
  id: "podium-retail-colonnade",
  name: "Retail Colonnade Podium",
  category: "podium",
  foot: { w: 32, d: 32 }, // 32x32m
  height: 14,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0, H = 14;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    // Plinth
    parts.push({ geo: new T.BoxGeometry(W, 1.2, D).translate(0, 0.6, 0), tag: "roof", color: pal.roof });
    // Core lobby
    parts.push({ geo: new T.BoxGeometry(W * 0.88, H - 2.4, D * 0.88).translate(0, 1.2 + (H - 2.4) / 2, 0), tag: "glass", color: pal.glass });
    // Pillars
    const cols = lod === 1 ? 4 : 6;
    for (let ix = 0; ix < cols; ix++) {
      for (let iz = 0; iz < cols; iz++) {
        if (ix > 0 && ix < cols - 1 && iz > 0 && iz < cols - 1) continue;
        const px = -W / 2 + 1.2 + (ix / (cols - 1)) * (W - 2.4);
        const pz = -D / 2 + 1.2 + (iz / (cols - 1)) * (D - 2.4);
        const colGeo = lod === 1 ? new T.BoxGeometry(1.0, H - 2.4, 1.0) : new T.CylinderGeometry(0.5, 0.55, H - 2.4, 8);
        parts.push({ geo: colGeo.translate(px, 1.2 + (H - 2.4) / 2, pz), tag: "wall", color: pal.wall });
      }
    }
    // Cornice
    parts.push({ geo: new T.BoxGeometry(W + 0.6, 1.2, D + 0.6).translate(0, H - 0.6, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "podium-entrance-plaza",
  name: "Entrance Plaza Podium",
  category: "podium",
  foot: { w: 32, d: 32 },
  height: 12,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0, H = 12;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    // Stepped entrance terrace
    parts.push({ geo: new T.BoxGeometry(W, 2.0, D).translate(0, 1.0, 0), tag: "wall", color: pal.trim });
    // Plaza floor with overhang canopy
    parts.push({ geo: new T.BoxGeometry(W * 0.75, H - 3.0, D * 0.75).translate(0, 2.0 + (H - 3.0) / 2, -D * 0.1), tag: "glass", color: pal.glass });
    // Grand portal frame
    parts.push({ geo: new T.BoxGeometry(W * 0.85, 1.5, 4.0).translate(0, H - 0.75, D * 0.35), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(2.0, H - 2.0, 4.0).translate(-W * 0.4, 2.0 + (H - 2.0) / 2, D * 0.35), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(2.0, H - 2.0, 4.0).translate(W * 0.4, 2.0 + (H - 2.0) / 2, D * 0.35), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "podium-waterfront-base",
  name: "Waterfront Promenade Base",
  category: "podium",
  foot: { w: 32, d: 32 },
  height: 10,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0, H = 10;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 2.5, D).translate(0, 1.25, 0), tag: "roof", color: pal.roof });
    parts.push({ geo: new T.BoxGeometry(W * 0.82, H - 3.5, D * 0.82).translate(0, 2.5 + (H - 3.5) / 2, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(W + 0.4, 1.0, D + 0.4).translate(0, H - 0.5, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "podium-parking-deck",
  name: "Ventilated Parking Deck Podium",
  category: "podium",
  foot: { w: 32, d: 32 },
  height: 16,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0, H = 16;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
    // Louvred band cutouts
    for (let fl = 0; fl < 3; fl++) {
      const y = 3.5 + fl * 4.0;
      parts.push({ geo: new T.BoxGeometry(W + 0.2, 1.4, D * 0.7).translate(0, y, 0), tag: "roof", color: pal.roof });
    }
    return parts;
  }
});

registerPart({
  id: "podium-recessed-lobby",
  name: "Recessed Atrium Lobby",
  category: "podium",
  foot: { w: 24, d: 32 }, // 24x24m
  height: 12,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 12;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 1.0, D).translate(0, 0.5, 0), tag: "roof", color: pal.roof });
    parts.push({ geo: new T.BoxGeometry(W * 0.7, H - 2.0, D * 0.7).translate(0, 1.0 + (H - 2.0) / 2, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(W, 1.0, D).translate(0, H - 0.5, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "podium-arcade-terrace",
  name: "Classical Arcade Terrace",
  category: "podium",
  foot: { w: 24, d: 32 },
  height: 10,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 10;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.85, H - 2.0, 2.0).translate(0, H / 2, D / 2), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "podium-civic-steps",
  name: "Civic Portico Steps",
  category: "podium",
  foot: { w: 48, d: 48 }, // 40x40m
  height: 14,
  sockets: { bottom: { w: 48, d: 48 }, top: { w: 32, d: 32 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 39.0, D = 39.0, H = 14;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 3.0, D).translate(0, 1.5, 0), tag: "wall", color: pal.trim });
    parts.push({ geo: new T.BoxGeometry(W * 0.85, H - 4.5, D * 0.85).translate(0, 3.0 + (H - 4.5) / 2, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(W * 0.95, 1.5, D * 0.95).translate(0, H - 0.75, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "podium-stepped-garden",
  name: "Stepped Garden Terraces",
  category: "podium",
  foot: { w: 32, d: 32 },
  height: 15,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0, H = 15;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 5.0, D).translate(0, 2.5, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.85, 5.0, D * 0.85).translate(0, 7.5, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.7, 5.0, D * 0.7).translate(0, 12.5, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

// =============================================================================
// 2. SHAFTS (Tower Cores 44m-64m)
// =============================================================================

registerPart({
  id: "shaft-twisted-glass",
  name: "Twisted Glass Helical Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 }, // 24x24m
  height: 60,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 60;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
      return parts;
    }
    const slices = lod === 1 ? 6 : 12;
    const sliceH = H / slices;
    for (let i = 0; i < slices; i++) {
      const angle = (i / slices) * (Math.PI / 4); // 45 degree twist
      const g = new T.BoxGeometry(W * 0.95, sliceH * 0.92, D * 0.95);
      g.rotateY(angle);
      g.translate(0, sliceH * (i + 0.5), 0);
      parts.push({ geo: g, tag: "glass", color: pal.glass });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-fluted-artdeco",
  name: "Fluted Art Deco Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 56,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 56;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W * 0.92, H, D * 0.92).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    const fins = lod === 1 ? 3 : 5;
    for (let i = 0; i < fins; i++) {
      const offset = (-0.5 + i / (fins - 1)) * (W - 2.0);
      parts.push({ geo: new T.BoxGeometry(0.8, H + 0.4, 0.8).translate(offset, H / 2, D / 2), tag: "wall", color: pal.wall });
      parts.push({ geo: new T.BoxGeometry(0.8, H + 0.4, 0.8).translate(offset, H / 2, -D / 2), tag: "wall", color: pal.wall });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-curved-eco-terrace",
  name: "Curved Eco-Terrace Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 52,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 52;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W * 0.8, H, D * 0.8).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    const tiers = lod === 1 ? 4 : 8;
    for (let i = 0; i < tiers; i++) {
      const y = (i + 0.5) * (H / tiers);
      parts.push({ geo: new T.CylinderGeometry(W * 0.48, W * 0.48, 1.2, 12).translate(0, y, 0), tag: "wall", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-cylindrical-core",
  name: "Cylindrical Drum Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 64,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 11.0, H = 64;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.CylinderGeometry(R, R, H, 8).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
      return parts;
    }
    const segs = lod === 1 ? 12 : 24;
    parts.push({ geo: new T.CylinderGeometry(R, R, H, segs).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.CylinderGeometry(R * 1.03, R * 1.03, 2.0, segs).translate(0, H * 0.33, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.CylinderGeometry(R * 1.03, R * 1.03, 2.0, segs).translate(0, H * 0.66, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "shaft-curtain-wall-straight",
  name: "Curtain Wall Glass Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 48,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 48;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    // Horizontal brise-soleil bands
    const bands = lod === 1 ? 3 : 6;
    for (let b = 1; b < bands; b++) {
      parts.push({ geo: new T.BoxGeometry(W + 0.4, 0.6, D + 0.4).translate(0, b * (H / bands), 0), tag: "wall", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-chamfered-piers",
  name: "Chamfered Piers Shaft",
  category: "shaft",
  foot: { w: 32, d: 32 }, // 32x32m
  height: 64,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0, H = 64;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W * 0.88, H, D * 0.88).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    // 4 Corner massive piers
    const pw = 3.5;
    parts.push({ geo: new T.BoxGeometry(pw, H + 1.0, pw).translate(-W / 2 + pw / 2, H / 2, -D / 2 + pw / 2), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(pw, H + 1.0, pw).translate(W / 2 - pw / 2, H / 2, -D / 2 + pw / 2), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(pw, H + 1.0, pw).translate(-W / 2 + pw / 2, H / 2, D / 2 - pw / 2), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(pw, H + 1.0, pw).translate(W / 2 - pw / 2, H / 2, D / 2 - pw / 2), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "shaft-setback-stack",
  name: "Telescoping Setback Stack",
  category: "shaft",
  foot: { w: 32, d: 32 },
  height: 60,
  sockets: { bottom: { w: 32, d: 32 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 31.0;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, 60, D).translate(0, 30, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 20, D).translate(0, 10, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.75, 20, D * 0.75).translate(0, 30, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(W * 0.52, 20, D * 0.52).translate(0, 50, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "shaft-octagonal-tower",
  name: "Octagonal Faceted Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 54,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 11.5, H = 54;
    const parts = [];
    parts.push({ geo: new T.CylinderGeometry(R, R, H, 8).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    if (lod < 2) {
      parts.push({ geo: new T.CylinderGeometry(R * 1.02, R * 1.02, 1.5, 8).translate(0, H - 0.75, 0), tag: "wall", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-diamond-lattice",
  name: "Diagrid Exoskeleton Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 58,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 58;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W * 0.9, H, D * 0.9).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    if (lod < 2) {
      parts.push({ geo: new T.BoxGeometry(W, 1.0, D).translate(0, H * 0.25, 0), tag: "wall", color: pal.trim });
      parts.push({ geo: new T.BoxGeometry(W, 1.0, D).translate(0, H * 0.5, 0), tag: "wall", color: pal.trim });
      parts.push({ geo: new T.BoxGeometry(W, 1.0, D).translate(0, H * 0.75, 0), tag: "wall", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-elliptical-aerofoil",
  name: "Elliptical Aerofoil Shaft",
  category: "shaft",
  foot: { w: 32, d: 24 },
  height: 50,
  sockets: { bottom: { w: 32, d: 24 }, top: { w: 24, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 23.0, H = 50;
    const parts = [];
    const g = new T.CylinderGeometry(D / 2, D / 2, H, lod >= 2 ? 8 : 16);
    g.scale(W / D, 1, 1);
    g.translate(0, H / 2, 0);
    parts.push({ geo: g, tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "shaft-brutalist-ribs",
  name: "Brutalist Concrete Ribs Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 46,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 46;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
    if (lod < 2) {
      parts.push({ geo: new T.BoxGeometry(W * 0.7, H * 0.8, D + 0.2).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    }
    return parts;
  }
});

registerPart({
  id: "shaft-balconied-residential",
  name: "Balconied Residential Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 44,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 44;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W * 0.85, H, D * 0.85).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
    if (lod < 2) {
      const floors = lod === 1 ? 4 : 8;
      for (let fl = 0; fl < floors; fl++) {
        parts.push({ geo: new T.BoxGeometry(W, 0.4, D).translate(0, (fl + 0.5) * (H / floors), 0), tag: "glass", color: pal.glass });
      }
    }
    return parts;
  }
});

registerPart({
  id: "shaft-twin-atrium",
  name: "Twin Atrium Tower Shaft",
  category: "shaft",
  foot: { w: 32, d: 24 },
  height: 56,
  sockets: { bottom: { w: 32, d: 24 }, top: { w: 24, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 31.0, D = 23.0, H = 56;
    const parts = [];
    const tw = W * 0.38;
    parts.push({ geo: new T.BoxGeometry(tw, H, D).translate(-W / 2 + tw / 2, H / 2, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(tw, H, D).translate(W / 2 - tw / 2, H / 2, 0), tag: "wall", color: pal.wall });
    // Glass atrium connector
    parts.push({ geo: new T.BoxGeometry(W - tw * 2, H * 0.85, D * 0.8).translate(0, H * 0.425, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "shaft-triangular-prism",
  name: "Triangular Prism Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 52,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 12.0, H = 52;
    const parts = [];
    parts.push({ geo: new T.CylinderGeometry(R, R, H, 3).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "shaft-stepped-chevron",
  name: "Stepped Chevron Shaft",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 54,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 54;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, H, D * 0.6).translate(0, H / 2, -D * 0.2), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.6, H, D * 0.6).translate(0, H / 2, D * 0.2), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "shaft-cantilever-boxes",
  name: "Cantilever Shifted Boxes",
  category: "shaft",
  foot: { w: 24, d: 32 },
  height: 48,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 48;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W * 0.8, 16, D * 0.8).translate(-1.5, 8, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.8, 16, D * 0.8).translate(1.5, 24, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(W * 0.8, 16, D * 0.8).translate(-1.0, 40, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

// =============================================================================
// 3. CROWNS (Tower Terminations 6m-32m)
// =============================================================================

registerPart({
  id: "crown-ziggurat-lantern",
  name: "Ziggurat Lantern Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 18,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 8, d: 8 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W * 0.85, 6, D * 0.85).translate(0, 3, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.65, 6, D * 0.65).translate(0, 9, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.42, 6, D * 0.42).translate(0, 15, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "crown-sunburst-arch",
  name: "Sunburst Vaulted Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 16,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 8, d: 8 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 16;
    const parts = [];
    parts.push({ geo: new T.CylinderGeometry(1.0, W * 0.45, H, lod >= 2 ? 6 : 12).translate(0, H / 2, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "crown-solar-dish",
  name: "Parabolic Solar Dish Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 10,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 10;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.CylinderGeometry(W * 0.45, W * 0.35, 3.0, 6).translate(0, 1.5, 0), tag: "wall", color: pal.metal });
      return parts;
    }
    const segs = lod === 1 ? 8 : 16;
    parts.push({ geo: new T.CylinderGeometry(W * 0.5, W * 0.35, 4.0, segs).translate(0, 2, 0), tag: "wall", color: pal.metal });
    parts.push({ geo: new T.CylinderGeometry(W * 0.45, W * 0.45, 1.0, segs).translate(0, 4.5, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "crown-dome-lantern",
  name: "Geodesic Dome & Cupola",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 15,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 8, d: 8 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 11.0, H = 15;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.ConeGeometry(R, 8.0, 6).translate(0, 4.0, 0), tag: "roof", color: pal.roof });
      return parts;
    }
    parts.push({ geo: new T.SphereGeometry(R, lod === 1 ? 8 : 16, lod === 1 ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0, 0), tag: "roof", color: pal.roof });
    parts.push({ geo: new T.CylinderGeometry(2.0, 2.0, 4.0, lod === 1 ? 4 : 8).translate(0, R + 2.0, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "crown-plain-parapet",
  name: "Architectural Parapet Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 6,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 6;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(W * 0.85, H, D * 0.85).translate(0, H / 2 + 0.5, 0), tag: "roof", color: pal.roof });
    return parts;
  }
});

registerPart({
  id: "crown-tapered-spire",
  name: "Tapered Architectural Spire",
  category: "crown",
  foot: { w: 16, d: 16 },
  height: 32,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 7.0, H = 32;
    const parts = [];
    parts.push({ geo: new T.ConeGeometry(R, H, lod >= 2 ? 4 : 8).translate(0, H / 2, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "crown-sky-pyramid",
  name: "Glass Apex Pyramid Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 14,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 11.5, H = 14;
    const parts = [];
    parts.push({ geo: new T.ConeGeometry(R * 1.414, H, 4).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "crown-slanted-crystal",
  name: "Slanted Crystalline Roof",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 16,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 8, d: 8 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 16;
    const parts = [];
    const g = new T.CylinderGeometry(0.5, W * 0.45, H, 4);
    g.rotateY(Math.PI / 4);
    g.translate(0, H / 2, 0);
    parts.push({ geo: g, tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "crown-open-pergola",
  name: "Open Trellis Pergola",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 8,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 8;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, 1.5, D).translate(0, H - 0.75, 0), tag: "wall", color: pal.trim });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 1.0, D).translate(0, H - 0.5, 0), tag: "wall", color: pal.trim });
    parts.push({ geo: new T.BoxGeometry(1.2, H, 1.2).translate(-W / 2 + 1, H / 2, -D / 2 + 1), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(1.2, H, 1.2).translate(W / 2 - 1, H / 2, -D / 2 + 1), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(1.2, H, 1.2).translate(-W / 2 + 1, H / 2, D / 2 - 1), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.BoxGeometry(1.2, H, 1.2).translate(W / 2 - 1, H / 2, D / 2 - 1), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "crown-pagoda-tier",
  name: "Tiered Flared Pagoda Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 16,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 8, d: 8 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W * 0.9, 8.0, D * 0.9).translate(0, 4.0, 0), tag: "roof", color: pal.roof });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W * 1.05, 1.5, D * 1.05).translate(0, 2, 0), tag: "roof", color: pal.roof });
    parts.push({ geo: new T.BoxGeometry(W * 0.85, 1.5, D * 0.85).translate(0, 7, 0), tag: "roof", color: pal.roof });
    parts.push({ geo: new T.BoxGeometry(W * 0.65, 1.5, D * 0.65).translate(0, 12, 0), tag: "roof", color: pal.roof });
    return parts;
  }
});

registerPart({
  id: "crown-crown-finials",
  name: "Crenellated Finials Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 12,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 8, d: 8 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 12;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W, 4.0, D).translate(0, 2.0, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W, 3.0, D).translate(0, 1.5, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.CylinderGeometry(0.8, 0.8, H, 6).translate(-W / 2 + 1, H / 2, -D / 2 + 1), tag: "wall", color: pal.trim });
    parts.push({ geo: new T.CylinderGeometry(0.8, 0.8, H, 6).translate(W / 2 - 1, H / 2, -D / 2 + 1), tag: "wall", color: pal.trim });
    parts.push({ geo: new T.CylinderGeometry(0.8, 0.8, H, 6).translate(-W / 2 + 1, H / 2, D / 2 - 1), tag: "wall", color: pal.trim });
    parts.push({ geo: new T.CylinderGeometry(0.8, 0.8, H, 6).translate(W / 2 - 1, H / 2, D / 2 - 1), tag: "wall", color: pal.trim });
    return parts;
  }
});

registerPart({
  id: "crown-helipad-cantilever",
  name: "Cantilever Flight Deck Crown",
  category: "crown",
  foot: { w: 24, d: 32 },
  height: 9,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 9;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(W * 0.8, H, D * 0.8).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.BoxGeometry(W * 0.8, H * 0.6, D * 0.8).translate(0, H * 0.3, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.CylinderGeometry(W * 0.55, W * 0.55, 1.5, lod === 1 ? 8 : 16).translate(0, H - 0.75, 0), tag: "roof", color: pal.roof });
    return parts;
  }
});

// =============================================================================
// 4. ROOF FEATURES (Apparatus 3m-24m)
// =============================================================================

registerPart({
  id: "roof-helipad",
  name: "Rooftop Helipad",
  category: "roof",
  foot: { w: 16, d: 16 },
  height: 4,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const R = 7.0;
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(14.0, 1.0, 14.0).translate(0, 0.5, 0), tag: "roof", color: pal.roof });
      return parts;
    }
    parts.push({ geo: new T.CylinderGeometry(R, R, 1.0, lod === 1 ? 8 : 16).translate(0, 2.0, 0), tag: "roof", color: pal.roof });
    return parts;
  }
});

registerPart({
  id: "roof-infinity-pool",
  name: "Sky Infinity Pool",
  category: "roof",
  foot: { w: 16, d: 16 },
  height: 3,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, 1.2, D).translate(0, 0.6, 0), tag: "wall", color: pal.trim });
    if (lod < 2) {
      parts.push({ geo: new T.BoxGeometry(W * 0.75, 0.8, D * 0.75).translate(0, 1.4, 0), tag: "glass", color: pal.glass });
    }
    return parts;
  }
});

registerPart({
  id: "roof-sky-garden",
  name: "Landscaped Sky Garden",
  category: "roof",
  foot: { w: 16, d: 16 },
  height: 4,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, 0.8, D).translate(0, 0.4, 0), tag: "wall", color: pal.green });
    if (lod < 2) {
      parts.push({ geo: new T.BoxGeometry(4.0, 2.5, 4.0).translate(-3, 1.8, -3), tag: "glass", color: pal.glass });
    }
    return parts;
  }
});

registerPart({
  id: "roof-plant-chiller-room",
  name: "HVAC Plant Penthouse",
  category: "roof",
  foot: { w: 16, d: 16 },
  height: 5,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 14.0, D = 14.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, 5.0, D).translate(0, 2.5, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "roof-aerial-antenna-array",
  name: "Telecommunications Mast",
  category: "roof",
  foot: { w: 8, d: 8 },
  height: 24,
  sockets: { bottom: { w: 8, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const H = 24;
    const parts = [];
    parts.push({ geo: new T.CylinderGeometry(0.3, 0.8, H, lod >= 2 ? 4 : 6).translate(0, H / 2, 0), tag: "wall", color: pal.metal });
    if (lod < 2) {
      parts.push({ geo: new T.CylinderGeometry(1.5, 1.5, 0.4, 8).translate(0, H * 0.7, 0), tag: "wall", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "roof-stair-lift-overrun",
  name: "Elevator Lift Overrun",
  category: "roof",
  foot: { w: 8, d: 8 },
  height: 4,
  sockets: { bottom: { w: 8, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 7.0, D = 7.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, 4.0, D).translate(0, 2.0, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "roof-satellite-radome",
  name: "Satellite Radome",
  category: "roof",
  foot: { w: 8, d: 8 },
  height: 7,
  sockets: { bottom: { w: 8, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(4.0, 4.0, 4.0).translate(0, 2.0, 0), tag: "wall", color: pal.wall });
      return parts;
    }
    parts.push({ geo: new T.SphereGeometry(3.0, lod === 1 ? 8 : 12, lod === 1 ? 4 : 8).translate(0, 4.0, 0), tag: "wall", color: pal.wall });
    parts.push({ geo: new T.CylinderGeometry(1.5, 2.0, 2.0, 6).translate(0, 1.0, 0), tag: "wall", color: pal.metal });
    return parts;
  }
});

registerPart({
  id: "roof-solar-panel-canopy",
  name: "Solar PV Canopy",
  category: "roof",
  foot: { w: 16, d: 16 },
  height: 4,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0;
    const parts = [];
    const g = new T.BoxGeometry(W, 0.4, D);
    g.rotateX(0.25);
    g.translate(0, 3.0, 0);
    parts.push({ geo: g, tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "roof-cooling-tower-cluster",
  name: "HVAC Cooling Towers",
  category: "roof",
  foot: { w: 16, d: 16 },
  height: 6,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const parts = [];
    if (lod >= 2) {
      parts.push({ geo: new T.BoxGeometry(12.0, 4.0, 6.0).translate(0, 2.0, 0), tag: "wall", color: pal.metal });
      return parts;
    }
    parts.push({ geo: new T.CylinderGeometry(2.5, 2.5, 4.5, lod === 1 ? 6 : 8).translate(-3.5, 2.25, 0), tag: "wall", color: pal.metal });
    parts.push({ geo: new T.CylinderGeometry(2.5, 2.5, 4.5, lod === 1 ? 6 : 8).translate(3.5, 2.25, 0), tag: "wall", color: pal.metal });
    return parts;
  }
});

registerPart({
  id: "roof-maintenance-cradle-rig",
  name: "Facade BMU Maintenance Rig",
  category: "roof",
  foot: { w: 8, d: 8 },
  height: 5,
  sockets: { bottom: { w: 8, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(2.0, 4.0, 2.0).translate(0, 2.0, 0), tag: "wall", color: pal.metal });
    parts.push({ geo: new T.BoxGeometry(6.0, 0.6, 0.8).translate(2.0, 4.0, 0), tag: "wall", color: pal.metal });
    return parts;
  }
});

// =============================================================================
// 5. CONNECTORS (Skybridges 5m-12m)
// =============================================================================

registerPart({
  id: "connector-skybridge-straight-single",
  name: "Single-Deck Skybridge",
  category: "connector",
  foot: { w: 32, d: 8 },
  height: 6,
  sockets: { bottom: { w: 32, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 30.0, W = 6.0, H = 5.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(L, H, W).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(L, 0.8, W + 0.4).translate(0, 0.4, 0), tag: "wall", color: pal.metal });
    parts.push({ geo: new T.BoxGeometry(L, 0.8, W + 0.4).translate(0, H - 0.4, 0), tag: "wall", color: pal.metal });
    return parts;
  }
});

registerPart({
  id: "connector-skybridge-straight-double",
  name: "Double-Deck Skybridge",
  category: "connector",
  foot: { w: 32, d: 8 },
  height: 12,
  sockets: { bottom: { w: 32, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 30.0, W = 6.5, H = 11.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(L, H, W).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    parts.push({ geo: new T.BoxGeometry(L, 1.0, W + 0.4).translate(0, H / 2, 0), tag: "wall", color: pal.metal });
    return parts;
  }
});

registerPart({
  id: "connector-skybridge-curved-arch",
  name: "Parabolic Arched Skybridge",
  category: "connector",
  foot: { w: 32, d: 8 },
  height: 10,
  sockets: { bottom: { w: 32, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 30.0, W = 6.0, H = 6.0;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(L, H, W).translate(0, 4 + H / 2, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "connector-skybridge-truss-diagonal",
  name: "Exposed Steel Truss Skybridge",
  category: "connector",
  foot: { w: 32, d: 8 },
  height: 7,
  sockets: { bottom: { w: 32, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 30.0, W = 6.0, H = 6.5;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(L, H, W).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "connector-skybridge-glass-tube",
  name: "Cylindrical Tube Skybridge",
  category: "connector",
  foot: { w: 32, d: 8 },
  height: 5,
  sockets: { bottom: { w: 32, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 30.0, R = 3.0;
    const parts = [];
    const g = new T.CylinderGeometry(R, R, L, lod >= 2 ? 6 : 12);
    g.rotateZ(Math.PI / 2);
    g.translate(0, R, 0);
    parts.push({ geo: g, tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "connector-podium-bridge-covered",
  name: "Low Covered Podium Bridge",
  category: "connector",
  foot: { w: 24, d: 8 },
  height: 5,
  sockets: { bottom: { w: 24, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 22.0, W = 5.0, H = 4.5;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(L, H, W).translate(0, H / 2, 0), tag: "wall", color: pal.wall });
    return parts;
  }
});

registerPart({
  id: "connector-sky-concourse",
  name: "Multi-Tower Sky Concourse",
  category: "connector",
  foot: { w: 24, d: 32 },
  height: 10,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 10;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "glass", color: pal.glass });
    return parts;
  }
});

registerPart({
  id: "connector-cantilever-walkway",
  name: "Sky Cantilever Walkway",
  category: "connector",
  foot: { w: 16, d: 8 },
  height: 4,
  sockets: { bottom: { w: 16, d: 8 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const L = 15.0, W = 5.0, H = 3.5;
    const parts = [];
    parts.push({ geo: new T.BoxGeometry(L, H, W).translate(0, H / 2, 0), tag: "wall", color: pal.trim });
    return parts;
  }
});

// =============================================================================
// 6. ORDINARY FABRIC (Plain Background Masses 5m-28m)
// =============================================================================

function fabricFacadeMaterial(character, repeatX, repeatY, night = false) {
  const material = getFacadeMaterial(character, { night }).clone();
  for (const key of ["map", "roughnessMap", "metalnessMap", "normalMap", "emissiveMap"]) {
    material[key] = material[key].clone();
    material[key].repeat.set(repeatX, repeatY);
    material[key].needsUpdate = true;
  }
  return material;
}

function facadePart(geo, material, character) {
  geo.userData.facadeCharacter = character;
  const cap = material.clone();
  cap.map = null;
  cap.roughnessMap = null;
  cap.metalnessMap = null;
  cap.normalMap = null;
  cap.emissiveMap = null;
  cap.roughness = 0.82;
  cap.metalness = 0.04;
  const materials = [material, material, cap, cap, material, material];
  geo.userData.facadeMaterial = materials;
  return { geo, tag: "wall", material: materials, facadeCharacter: character };
}

function buildFabricBlock(T, pal, {
  W, D, H, baseH = 2.8, lod = 0, character = "heritage", repeatX = 0.5, repeatY = 0.5, topBandH = 0.38,
}) {
  if (lod >= 2) {
    return [{ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "wall", color: pal.wall }];
  }
  const parts = [];
  const parapetH = Math.min(0.8, H * 0.12);
  const shaftTop = H - parapetH;
  const shaftW = W - 0.4;
  const shaftD = D - 0.6;
  const shaftH = shaftTop - baseH;
  const facadeMaterial = fabricFacadeMaterial(character, repeatX, repeatY, !!pal.night);

  // Base, middle, and top are separate masses. The middle is set inward.
  parts.push(facadePart(new T.BoxGeometry(W, baseH, D - 0.1).translate(0, baseH / 2, -0.05), facadeMaterial, character));
  parts.push(facadePart(new T.BoxGeometry(shaftW, shaftH, shaftD).translate(0, baseH + shaftH / 2, -0.2), facadeMaterial, character));

  // Courses project beyond the atlas-mapped wall and cast real horizontal shadows.
  const courseCount = lod === 1 ? 1 : Math.max(1, Math.round(repeatY * 4) - 1);
  for (let course = 1; course <= courseCount; course++) {
    const y = baseH + shaftH * (course / (courseCount + 1));
    parts.push({ geo: new T.BoxGeometry(W - 0.12, 0.24, D - 0.08).translate(0, y, -0.04), tag: "trim", color: pal.trim });
  }

  // A contained cornice and four-sided parapet terminate the wall below H.
  parts.push({ geo: new T.BoxGeometry(W - 0.08, topBandH, D - 0.08).translate(0, shaftTop - topBandH / 2, -0.04), tag: "trim", color: pal.trim });
  const parapetThickness = 0.28;
  parts.push({ geo: new T.BoxGeometry(W - 0.08, parapetH, parapetThickness).translate(0, H - parapetH / 2, D / 2 - parapetThickness / 2 - 0.04), tag: "roof", color: pal.roof });
  parts.push({ geo: new T.BoxGeometry(W - 0.08, parapetH, parapetThickness).translate(0, H - parapetH / 2, -D / 2 + parapetThickness / 2 + 0.04), tag: "roof", color: pal.roof });
  parts.push({ geo: new T.BoxGeometry(parapetThickness, parapetH, D - 0.64).translate(W / 2 - parapetThickness / 2 - 0.04, H - parapetH / 2, 0), tag: "roof", color: pal.roof });
  parts.push({ geo: new T.BoxGeometry(parapetThickness, parapetH, D - 0.64).translate(-W / 2 + parapetThickness / 2 + 0.04, H - parapetH / 2, 0), tag: "roof", color: pal.roof });
  return parts;
}

registerPart({
  id: "fabric-masonry-block-low",
  name: "Low-Rise Masonry Block",
  category: "fabric",
  foot: { w: 16, d: 16 },
  height: 12,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0, H = 12;
    return buildFabricBlock(T, pal, { W, D, H, baseH: 3.0, lod, character: "heritage", repeatX: 0.45, repeatY: 0.28 });
  }
});

registerPart({
  id: "fabric-masonry-block-mid",
  name: "Mid-Rise Perimeter Block",
  category: "fabric",
  foot: { w: 16, d: 24 },
  height: 22,
  sockets: { bottom: { w: 16, d: 24 }, top: { w: 16, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 23.0, H = 22;
    return buildFabricBlock(T, pal, { W, D, H, baseH: 3.2, lod, character: "interwar", repeatX: 0.48, repeatY: 0.95, topBandH: 0.75 });
  }
});

registerPart({
  id: "fabric-punched-window-slab",
  name: "Punched-Window Office Slab",
  category: "fabric",
  foot: { w: 24, d: 32 },
  height: 28,
  sockets: { bottom: { w: 24, d: 24 }, top: { w: 24, d: 24 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 23.0, D = 23.0, H = 28;
    const parts = buildFabricBlock(T, pal, { W, D, H, baseH: 4.0, lod, character: "postwar", repeatX: 0.9, repeatY: 0.72 });
    if (lod < 2) {
      // One deep, atlas-lined facade recess distinguishes the slab without
      // rebuilding every atlas window as geometry.
      const material = fabricFacadeMaterial("postwar", 0.72, 0.72, !!pal.night);
      parts.push(facadePart(new T.BoxGeometry(W * 0.68, H * 0.58, 0.18).translate(0, H * 0.53, D / 2 - 0.72), material, "postwar"));
      parts.push({ geo: new T.BoxGeometry(W * 0.74, 0.38, 0.72).translate(0, H * 0.83, D / 2 - 0.38), tag: "trim", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "fabric-retail-ground-simple",
  name: "Simple High-Street Shopfront",
  category: "fabric",
  foot: { w: 16, d: 16 },
  height: 5,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0, H = 5;
    return buildFabricBlock(T, pal, { W, D, H, baseH: 0.7, lod, character: "heritage", repeatX: 0.42, repeatY: 0.18 });
  }
});

registerPart({
  id: "fabric-flat-roof-parapet",
  name: "Flat Roof Parapet Cap",
  category: "fabric",
  foot: { w: 16, d: 16 },
  height: 2,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0, H = 2;
    if (lod >= 2) return [{ geo: new T.BoxGeometry(W, H, D).translate(0, H / 2, 0), tag: "roof", color: pal.roof }];
    const parts = [];
    const facadeMaterial = fabricFacadeMaterial("contemporary", 0.35, 0.18, pal.night);
    parts.push({ geo: new T.BoxGeometry(W - 0.5, 0.32, D - 0.5).translate(0, 0.16, 0), tag: "roof", color: pal.roof });
    const t = 0.32;
    parts.push(facadePart(new T.BoxGeometry(W, H - 0.32, t).translate(0, 0.32 + (H - 0.32) / 2, D / 2 - t / 2), facadeMaterial, "contemporary"));
    parts.push(facadePart(new T.BoxGeometry(W, H - 0.32, t).translate(0, 0.32 + (H - 0.32) / 2, -D / 2 + t / 2), facadeMaterial, "contemporary"));
    parts.push(facadePart(new T.BoxGeometry(t, H - 0.32, D - 0.64).translate(W / 2 - t / 2, 0.32 + (H - 0.32) / 2, 0), facadeMaterial, "contemporary"));
    parts.push(facadePart(new T.BoxGeometry(t, H - 0.32, D - 0.64).translate(-W / 2 + t / 2, 0.32 + (H - 0.32) / 2, 0), facadeMaterial, "contemporary"));
    return parts;
  }
});

registerPart({
  id: "fabric-mansard-roof-dormer",
  name: "Mansard Roof with Dormers",
  category: "fabric",
  foot: { w: 16, d: 16 },
  height: 6,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 0, d: 0 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0, H = 6;
    if (lod >= 2) return [{ geo: new T.CylinderGeometry(W * 0.35, W * 0.5, H, 4).rotateY(Math.PI / 4).translate(0, H / 2, 0), tag: "roof", color: pal.roof }];
    const parts = [];
    const facadeMaterial = fabricFacadeMaterial("heritage", 0.3, 0.25, pal.night);
    parts.push({ geo: new T.BoxGeometry(W - 0.08, 0.45, D - 0.08).translate(0, 0.225, 0), tag: "trim", color: pal.trim });
    parts.push({ geo: new T.CylinderGeometry(W * 0.35, W * 0.48, H - 0.45, 4).rotateY(Math.PI / 4).translate(0, 0.45 + (H - 0.45) / 2, 0), tag: "roof", color: pal.roof });
    const dormers = lod === 1 ? [-3.2, 3.2] : [-4.5, 0, 4.5];
    for (const x of dormers) {
      parts.push(facadePart(new T.BoxGeometry(2.3, 2.2, 1.2).translate(x, 2.7, D / 2 - 0.5), facadeMaterial, "heritage"));
      parts.push({ geo: new T.BoxGeometry(1.35, 1.2, 0.12).translate(x, 2.65, D / 2 + 0.06), tag: "glass", color: pal.glass });
    }
    return parts;
  }
});

registerPart({
  id: "fabric-townhouse-bay-front",
  name: "Townhouse with Canted Bays",
  category: "fabric",
  foot: { w: 8, d: 16 },
  height: 14,
  sockets: { bottom: { w: 8, d: 16 }, top: { w: 8, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 7.5, D = 15.0, H = 14;
    const parts = buildFabricBlock(T, pal, { W, D, H, baseH: 2.6, lod, character: "heritage", repeatX: 0.32, repeatY: 0.56 });
    if (lod < 2) {
      parts.push({ geo: new T.BoxGeometry(W * 0.58, H * 0.58, 0.55).translate(0, H * 0.48, D / 2 - 0.18), tag: "trim", color: pal.trim });
    }
    return parts;
  }
});

registerPart({
  id: "fabric-walkup-balconies",
  name: "Walkup with Loggias",
  category: "fabric",
  foot: { w: 16, d: 16 },
  height: 16,
  sockets: { bottom: { w: 16, d: 16 }, top: { w: 16, d: 16 } },
  buildGeometry: (T = THREE, p = {}, lod = 0) => {
    const pal = resolvePalette(p);
    const W = 15.0, D = 15.0, H = 16;
    const parts = buildFabricBlock(T, pal, { W, D, H, baseH: 2.8, lod, character: "postwar", repeatX: 0.58, repeatY: 0.72 });
    if (lod < 2) {
      const balconyCount = lod === 1 ? 2 : 3;
      for (let level = 1; level <= balconyCount; level++) {
        const y = 2.8 + level * 3.1;
        parts.push({ geo: new T.BoxGeometry(W * 0.68, 0.22, 1.25).translate(0, y, D / 2 - 0.64), tag: "trim", color: pal.trim });
        parts.push({ geo: new T.BoxGeometry(W * 0.68, 0.55, 0.12).translate(0, y + 0.38, D / 2 - 0.08), tag: "metal", color: pal.metal });
      }
    }
    return parts;
  }
});
