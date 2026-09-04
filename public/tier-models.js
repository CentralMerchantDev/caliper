/**
 * CALIPER — 6-TIER PROCEDURAL ASSET LIBRARY
 * 540 Procedural Models across 9 Categories and 6 Quality Tiers:
 * 10 Showstopper | 10 Luxury | 10 High-End | 10 Mid-High | 10 Mid | 10 Mid-Low
 */
import * as THREE from "./vendor/three/three.module.min.js";

function mergeGeometries(geometries, T = THREE) {
  const nonIndexed = geometries.filter(Boolean).map(g => g.toNonIndexed ? g.toNonIndexed() : g);
  let totalVerts = 0;
  for (const g of nonIndexed) {
    if (g && g.attributes && g.attributes.position) {
      totalVerts += g.attributes.position.count;
    }
  }
  const pos = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    if (g && g.attributes && g.attributes.position) {
      const p = g.attributes.position.array;
      pos.set(p, offset);
      offset += p.length;
    }
  }
  const merged = new T.BufferGeometry();
  merged.setAttribute("position", new T.BufferAttribute(pos, 3));
  merged.computeVertexNormals();
  return merged;
}

/**
 * SHOWSTOPPER: Showstopper: 160m Faceted Shard Bio-Tower with integrated hanging skygardens (44.0x44.0m, 160.0m high)
 */
export function bldShowstopperShardBiotower(seed = "bld-showstopper-shard-biotower-0") {
  return {
    id: "bld-showstopper-shard-biotower",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 44.0, d: 44.0 },
    height: 160.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(18, 22, 24, 8); base.translate(0, 12, 0);
         const shaft = new T.ConeGeometry(19, 136, 8); shaft.translate(0, 92, 0);
         const spire = new T.CylinderGeometry(0.5, 3.2, 28, 6); spire.translate(0, 146, 0);
         return mergeGeometries([base, shaft, spire], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(41.80, 152.00, 41.80);
          b.translate(0, 76.00, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(44.0, 160.0, 44.0);
          b.translate(0, 80.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Curvilinear Modular Habitat Pod Tower with cantilevered rings (48.0x48.0m, 72.0m high)
 */
export function bldShowstopperCurvilinearHabPod(seed = "bld-showstopper-curvilinear-hab-pod-0") {
  return {
    id: "bld-showstopper-curvilinear-hab-pod",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 48.0, d: 48.0 },
    height: 72.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const core = new T.CylinderGeometry(12, 14, 70, 16); core.translate(0, 35, 0);
         const pod1 = new T.TorusGeometry(18, 4.5, 8, 16); pod1.rotateX(Math.PI/2); pod1.translate(0, 24, 0);
         const pod2 = new T.TorusGeometry(16, 4.0, 8, 16); pod2.rotateX(Math.PI/2); pod2.translate(0, 48, 0);
         return mergeGeometries([core, pod1, pod2], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 68.40, 45.60);
          b.translate(0, 34.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 72.0, 48.0);
          b.translate(0, 36.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Mass-timber elevated toroid ring building with inner courtyard (56.0x56.0m, 48.0m high)
 */
export function bldShowstopperFloatingTimberRing(seed = "bld-showstopper-floating-timber-ring-0") {
  return {
    id: "bld-showstopper-floating-timber-ring",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 56.0, d: 56.0 },
    height: 48.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const ring = new T.TorusGeometry(22, 5.5, 12, 24); ring.rotateX(Math.PI/2); ring.translate(0, 24, 0);
         const pil1 = new T.CylinderGeometry(1.2, 1.2, 24, 8); pil1.translate(-18, 12, -18);
         const pil2 = new T.CylinderGeometry(1.2, 1.2, 24, 8); pil2.translate(18, 12, -18);
         const pil3 = new T.CylinderGeometry(1.2, 1.2, 24, 8); pil3.translate(18, 12, 18);
         const pil4 = new T.CylinderGeometry(1.2, 1.2, 24, 8); pil4.translate(-18, 12, 18);
         return mergeGeometries([ring, pil1, pil2, pil3, pil4], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(53.20, 45.60, 53.20);
          b.translate(0, 22.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56.0, 48.0, 56.0);
          b.translate(0, 24.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 184m Parametric Diagrid Lotus Spire Skyscraper (40.0x40.0m, 184.0m high)
 */
export function bldShowstopperDiagridLotusSpire(seed = "bld-showstopper-diagrid-lotus-spire-0") {
  return {
    id: "bld-showstopper-diagrid-lotus-spire",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 40.0 },
    height: 184.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(16, 19, 40, 12); base.translate(0, 20, 0);
         const mid = new T.CylinderGeometry(12, 16, 80, 12); mid.translate(0, 80, 0);
         const crown = new T.ConeGeometry(12, 64, 12); crown.translate(0, 152, 0);
         return mergeGeometries([base, mid, crown], T);
        },
      },
      {
        level: 1,
        tris: 68,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 174.80, 38.00);
          b.translate(0, 87.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 184.0, 40.0);
          b.translate(0, 92.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Aerodynamic dual-twist high-efficiency glass tower (48.0x32.0m, 144.0m high)
 */
export function bldShowstopperTwistedAerofoilTower(seed = "bld-showstopper-twisted-aerofoil-tower-0") {
  return {
    id: "bld-showstopper-twisted-aerofoil-tower",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 48.0, d: 32.0 },
    height: 144.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(44, 48, 28); b1.translate(0, 24, 0);
         const b2 = new T.BoxGeometry(40, 48, 24); b2.rotateY(0.2); b2.translate(0, 72, 0);
         const b3 = new T.BoxGeometry(34, 48, 20); b3.rotateY(0.4); b3.translate(0, 120, 0);
         return mergeGeometries([b1, b2, b3], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 136.80, 30.40);
          b.translate(0, 68.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 144.0, 32.0);
          b.translate(0, 72.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Cascading 4-Tier Bio-Terrace Complex with central light canyon (64.0x48.0m, 64.0m high)
 */
export function bldShowstopperTerracedWaterfallAtrium(seed = "bld-showstopper-terraced-waterfall-atrium-0") {
  return {
    id: "bld-showstopper-terraced-waterfall-atrium",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 64.0, d: 48.0 },
    height: 64.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const t1 = new T.BoxGeometry(62, 16, 46); t1.translate(0, 8, 0);
         const t2 = new T.BoxGeometry(52, 16, 38); t2.translate(0, 24, 0);
         const t3 = new T.BoxGeometry(40, 16, 28); t3.translate(0, 40, 0);
         const t4 = new T.BoxGeometry(28, 16, 18); t4.translate(0, 56, 0);
         return mergeGeometries([t1, t2, t3, t4], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 60.80, 45.60);
          b.translate(0, 30.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 64.0, 48.0);
          b.translate(0, 32.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Twin Skyscraper Gate with 3-Storey Cantilevered Skybridge Atrium (64.0x32.0m, 120.0m high)
 */
export function bldShowstopperCantileverSkybridgeTwin(seed = "bld-showstopper-cantilever-skybridge-twin-0") {
  return {
    id: "bld-showstopper-cantilever-skybridge-twin",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 64.0, d: 32.0 },
    height: 120.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 550,
        createGeometry: (T = THREE) => {
          const towerA = new T.BoxGeometry(22, 118, 26); towerA.translate(-18, 59, 0);
         const towerB = new T.BoxGeometry(22, 118, 26); towerB.translate(18, 59, 0);
         const skybridge = new T.BoxGeometry(38, 14, 18); skybridge.translate(0, 88, 0);
         return mergeGeometries([towerA, towerB, skybridge], T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 114.00, 30.40);
          b.translate(0, 57.00, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 120.0, 32.0);
          b.translate(0, 60.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Geodesic Eco-Tower with multi-level internal climate biomes (48.0x48.0m, 136.0m high)
 */
export function bldShowstopperGeodesicEcotower(seed = "bld-showstopper-geodesic-ecotower-0") {
  return {
    id: "bld-showstopper-geodesic-ecotower",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 48.0, d: 48.0 },
    height: 136.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const core = new T.CylinderGeometry(16, 20, 134, 16); core.translate(0, 67, 0);
         const dome1 = new T.SphereGeometry(22, 12, 8); dome1.scale(1, 0.4, 1); dome1.translate(0, 40, 0);
         const dome2 = new T.SphereGeometry(18, 12, 8); dome2.scale(1, 0.4, 1); dome2.translate(0, 95, 0);
         return mergeGeometries([core, dome1, dome2], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 129.20, 45.60);
          b.translate(0, 64.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 136.0, 48.0);
          b.translate(0, 68.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Origami-Folded Zinc & Glass Corporate World Headquarters (48.0x48.0m, 88.0m high)
 */
export function bldShowstopperOrigamiFoldedHq(seed = "bld-showstopper-origami-folded-hq-0") {
  return {
    id: "bld-showstopper-origami-folded-hq",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 48.0, d: 48.0 },
    height: 88.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(46, 28, 46); b1.translate(0, 14, 0);
         const b2 = new T.CylinderGeometry(18, 23, 32, 6); b2.translate(0, 44, 0);
         const b3 = new T.ConeGeometry(18, 28, 6); b3.translate(0, 74, 0);
         return mergeGeometries([b1, b2, b3], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 83.60, 45.60);
          b.translate(0, 41.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 88.0, 48.0);
          b.translate(0, 44.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Hyperboloid Lattice Innovation Tower with flared skydeck (56.0x56.0m, 112.0m high)
 */
export function bldShowstopperHyperboloidLatticeHub(seed = "bld-showstopper-hyperboloid-lattice-hub-0") {
  return {
    id: "bld-showstopper-hyperboloid-lattice-hub",
    tier: "showstopper",
    category: "buildings",
    kind: "hard",
    footprint: { w: 56.0, d: 56.0 },
    height: 112.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 530,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(20, 26, 36, 16); base.translate(0, 18, 0);
         const waist = new T.CylinderGeometry(15, 20, 40, 16); waist.translate(0, 56, 0);
         const flare = new T.CylinderGeometry(24, 15, 36, 16); flare.translate(0, 94, 0);
         return mergeGeometries([base, waist, flare], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(53.20, 106.40, 53.20);
          b.translate(0, 53.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56.0, 112.0, 56.0);
          b.translate(0, 56.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: High-rise residences with wraparound cantilevered glass penthouses (32.0x32.0m, 96.0m high)
 */
export function bldLuxuryPenthouseTower(seed = "bld-luxury-penthouse-tower-0") {
  return {
    id: "bld-luxury-penthouse-tower",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 96.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 320,
        createGeometry: (T = THREE) => {
          const shaft = new T.BoxGeometry(26, 82, 26); shaft.translate(0, 41, 0);
         const top = new T.BoxGeometry(30, 12, 30); top.translate(0, 88, 0);
         const pool = new T.BoxGeometry(10, 2, 8); pool.translate(10, 94, 0);
         return mergeGeometries([shaft, top, pool], T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 91.20, 30.40);
          b.translate(0, 45.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 96.0, 32.0);
          b.translate(0, 48.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Organic ribbon-contoured private villa with tiered balconies (40.0x24.0m, 16.0m high)
 */
export function bldLuxuryCurvedRibbonMansion(seed = "bld-luxury-curved-ribbon-mansion-0") {
  return {
    id: "bld-luxury-curved-ribbon-mansion",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 24.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const main = new T.BoxGeometry(36, 7.5, 20); main.translate(0, 3.75, 0);
         const upper = new T.BoxGeometry(26, 7.5, 16); upper.translate(4, 11.25, -1);
         const canopy = new T.BoxGeometry(20, 0.6, 10); canopy.translate(-8, 7.8, 4);
         return mergeGeometries([main, upper, canopy], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 15.20, 22.80);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 16.0, 24.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Stepped limestone hillside villa with green pergola loggias (32.0x32.0m, 16.0m high)
 */
export function bldLuxuryTerracedVineyardVilla(seed = "bld-luxury-terraced-vineyard-villa-0") {
  return {
    id: "bld-luxury-terraced-vineyard-villa",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const g1 = new T.BoxGeometry(30, 5, 30); g1.translate(0, 2.5, 0);
         const g2 = new T.BoxGeometry(22, 5, 22); g2.translate(-3, 7.5, -3);
         const g3 = new T.BoxGeometry(14, 5, 14); g3.translate(-6, 12.5, -6);
         return mergeGeometries([g1, g2, g3], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 15.20, 30.40);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 16.0, 32.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Boutique duplex tower with double-height landscaped sky loggias (24.0x24.0m, 48.0m high)
 */
export function bldLuxurySkyTerraceResidence(seed = "bld-luxury-sky-terrace-residence-0") {
  return {
    id: "bld-luxury-sky-terrace-residence",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 48.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(22, 46, 22); base.translate(0, 23, 0);
         const deck1 = new T.BoxGeometry(23.5, 1.2, 10); deck1.translate(0, 18, 6);
         const deck2 = new T.BoxGeometry(23.5, 1.2, 10); deck2.translate(0, 34, -6);
         return mergeGeometries([base, deck1, deck2], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 45.60, 22.80);
          b.translate(0, 22.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 48.0, 24.0);
          b.translate(0, 24.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Nautical streamlined waterfront condominiums with curved glass prow (50.0x24.0m, 36.0m high)
 */
export function bldLuxuryMarinaWaterfrontCondo(seed = "bld-luxury-marina-waterfront-condo-0") {
  return {
    id: "bld-luxury-marina-waterfront-condo",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 50.0, d: 24.0 },
    height: 36.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(44, 34, 20); body.translate(0, 17, 0);
         const nose = new T.CylinderGeometry(9, 9, 34, 12); nose.translate(-16, 17, 0);
         const canopy = new T.BoxGeometry(46, 1.2, 22); canopy.translate(0, 34.6, 0);
         return mergeGeometries([body, nose, canopy], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(47.50, 34.20, 22.80);
          b.translate(0, 17.10, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(50.0, 36.0, 24.0);
          b.translate(0, 18.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 5-Star Boutique Hotel around an illuminated 10-storey atrium court (32.0x32.0m, 40.0m high)
 */
export function bldLuxuryBoutiqueHotelAtrium(seed = "bld-luxury-boutique-hotel-atrium-0") {
  return {
    id: "bld-luxury-boutique-hotel-atrium",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 40.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const w1 = new T.BoxGeometry(30, 38, 8); w1.translate(0, 19, -10);
         const w2 = new T.BoxGeometry(30, 38, 8); w2.translate(0, 19, 10);
         const roof = new T.BoxGeometry(30, 1.5, 28); roof.translate(0, 38.8, 0);
         return mergeGeometries([w1, w2, roof], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 38.00, 30.40);
          b.translate(0, 19.00, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 40.0, 32.0);
          b.translate(0, 20.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Dramatic steel-and-timber cantilevered ridge house (24.0x32.0m, 12.0m high)
 */
export function bldLuxuryCantileverRidgeHouse(seed = "bld-luxury-cantilever-ridge-house-0") {
  return {
    id: "bld-luxury-cantilever-ridge-house",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 32.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 260,
        createGeometry: (T = THREE) => {
          const anchor = new T.BoxGeometry(18, 10, 14); anchor.translate(0, 5, -8);
         const cant = new T.BoxGeometry(22, 5.5, 18); cant.translate(0, 8.5, 6);
         return mergeGeometries([anchor, cant], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 11.40, 30.40);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 12.0, 32.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Mass-timber residential lofts with integrated living facade planters (32.0x24.0m, 28.0m high)
 */
export function bldLuxuryBiophilicLoftBlock(seed = "bld-luxury-biophilic-loft-block-0") {
  return {
    id: "bld-luxury-biophilic-loft-block",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 275,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 26, 20); bld.translate(0, 13, 0);
         const f1 = new T.BoxGeometry(31, 1.2, 3); f1.translate(0, 9, 10.5);
         const f2 = new T.BoxGeometry(31, 1.2, 3); f2.translate(0, 17, 10.5);
         const f3 = new T.BoxGeometry(31, 1.2, 3); f3.translate(0, 25, 10.5);
         return mergeGeometries([bld, f1, f2, f3], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 26.60, 22.80);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 28.0, 24.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Contemporary travertine palazzo centered on a private courtyard (40.0x40.0m, 20.0m high)
 */
export function bldLuxuryCourtyardPalazzo(seed = "bld-luxury-courtyard-palazzo-0") {
  return {
    id: "bld-luxury-courtyard-palazzo",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 40.0 },
    height: 20.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 295,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(38, 18, 38); base.translate(0, 9, 0);
         const court = new T.BoxGeometry(16, 20, 16); court.translate(0, 10, 0);
         const roof = new T.BoxGeometry(39, 1.5, 39); roof.translate(0, 19, 0);
         return mergeGeometries([base, roof], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 19.00, 38.00);
          b.translate(0, 9.50, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 20.0, 40.0);
          b.translate(0, 10.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Minimalist steel-and-glass modernist architectural pavilion (32.0x24.0m, 12.0m high)
 */
export function bldLuxuryCliffsideGlassPavilion(seed = "bld-luxury-cliffside-glass-pavilion-0") {
  return {
    id: "bld-luxury-cliffside-glass-pavilion",
    tier: "luxury",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 250,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(30, 2.5, 22); base.translate(0, 1.25, 0);
         const glass = new T.BoxGeometry(28, 6.5, 18); glass.translate(0, 5.75, 0);
         const roof = new T.BoxGeometry(31, 1.2, 23); roof.translate(0, 10.2, 0);
         return mergeGeometries([base, glass, roof], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 11.40, 22.80);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 12.0, 24.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 16-Storey sleek solar-glazed corporate office tower (32.0x32.0m, 64.0m high)
 */
export function bldHighendCurtainWallOffice(seed = "bld-highend-curtain-wall-office-0") {
  return {
    id: "bld-highend-curtain-wall-office",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 64.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(28, 62, 28); body.translate(0, 31, 0);
         const crown = new T.BoxGeometry(30, 1.8, 30); crown.translate(0, 62.9, 0);
         return mergeGeometries([body, crown], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 60.80, 30.40);
          b.translate(0, 30.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 64.0, 32.0);
          b.translate(0, 32.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Stepped urban residential midrise with landscaped roof gardens (40.0x24.0m, 40.0m high)
 */
export function bldHighendSteppedResidentialBlock(seed = "bld-highend-stepped-residential-block-0") {
  return {
    id: "bld-highend-stepped-residential-block",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 24.0 },
    height: 40.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(38, 14, 22); b1.translate(0, 7, 0);
         const b2 = new T.BoxGeometry(30, 13, 20); b2.translate(-3, 20.5, 0);
         const b3 = new T.BoxGeometry(20, 12, 18); b3.translate(-7, 33, 0);
         return mergeGeometries([b1, b2, b3], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 38.00, 22.80);
          b.translate(0, 19.00, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 40.0, 24.0);
          b.translate(0, 20.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 8-Storey engineered mass-timber apartment building (24.0x24.0m, 32.0m high)
 */
export function bldHighendTimberMidrise(seed = "bld-highend-timber-midrise-0") {
  return {
    id: "bld-highend-timber-midrise",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 32.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 30, 22); bld.translate(0, 15, 0);
         const canopy = new T.BoxGeometry(23.5, 1.5, 23.5); canopy.translate(0, 31, 0);
         return mergeGeometries([bld, canopy], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 30.40, 22.80);
          b.translate(0, 15.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 32.0, 24.0);
          b.translate(0, 16.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Contemporary triangular flatiron corner residential building (24.0x32.0m, 48.0m high)
 */
export function bldHighendCornerFlatIron(seed = "bld-highend-corner-flat-iron-0") {
  return {
    id: "bld-highend-corner-flat-iron",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 32.0 },
    height: 48.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(22, 46, 26); b1.translate(0, 23, 2);
         const nose = new T.CylinderGeometry(4, 4, 46, 8); nose.translate(0, 23, -12);
         return mergeGeometries([b1, nose], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 45.60, 30.40);
          b.translate(0, 22.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 48.0, 32.0);
          b.translate(0, 24.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Articulated bay-window live-work urban studios (32.0x24.0m, 28.0m high)
 */
export function bldHighendModularLiveWork(seed = "bld-highend-modular-live-work-0") {
  return {
    id: "bld-highend-modular-live-work",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 26, 22); bld.translate(0, 13, 0);
         const bays = new T.BoxGeometry(31, 24, 2); bays.translate(0, 14, 11);
         return mergeGeometries([bld, bays], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 26.60, 22.80);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 28.0, 24.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Bioclimatic technology research laboratory building (48.0x32.0m, 24.0m high)
 */
export function bldHighendTechCampusLab(seed = "bld-highend-tech-campus-lab-0") {
  return {
    id: "bld-highend-tech-campus-lab",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 48.0, d: 32.0 },
    height: 24.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const wing1 = new T.BoxGeometry(44, 11, 28); wing1.translate(0, 5.5, 0);
         const wing2 = new T.BoxGeometry(38, 11, 24); wing2.translate(0, 16.5, 0);
         const louvers = new T.BoxGeometry(45, 22, 1); louvers.translate(0, 11, 14.5);
         return mergeGeometries([wing1, wing2, louvers], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 22.80, 30.40);
          b.translate(0, 11.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 24.0, 32.0);
          b.translate(0, 12.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Row of 4 luxury sustainable townhomes with green roof terrace (32.0x16.0m, 16.0m high)
 */
export function bldHighendGreenRoofTownhomes(seed = "bld-highend-green-roof-townhomes-0") {
  return {
    id: "bld-highend-green-roof-townhomes",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 16.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const units = new T.BoxGeometry(30, 14, 14); units.translate(0, 7, 0);
         const parapet = new T.BoxGeometry(31, 1.5, 15); parapet.translate(0, 15, 0);
         return mergeGeometries([units, parapet], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 15.20, 15.20);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 16.0, 16.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Mixed-use retail podium with slender residential tower (32.0x32.0m, 72.0m high)
 */
export function bldHighendPodiumTowerResidential(seed = "bld-highend-podium-tower-residential-0") {
  return {
    id: "bld-highend-podium-tower-residential",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 72.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const podium = new T.BoxGeometry(30, 12, 30); podium.translate(0, 6, 0);
         const tower = new T.BoxGeometry(20, 58, 20); tower.translate(0, 41, 0);
         return mergeGeometries([podium, tower], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 68.40, 30.40);
          b.translate(0, 34.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 72.0, 32.0);
          b.translate(0, 36.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Zinc-clad boutique contemporary art lofts (24.0x25.0m, 24.0m high)
 */
export function bldHighendArtGalleryLofts(seed = "bld-highend-art-gallery-lofts-0") {
  return {
    id: "bld-highend-art-gallery-lofts",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 25.0 },
    height: 24.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 155,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 22, 22); bld.translate(0, 11, 0);
         const frame = new T.BoxGeometry(16, 10, 2); frame.translate(0, 12, 11.5);
         return mergeGeometries([bld, frame], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 22.80, 23.75);
          b.translate(0, 11.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 24.0, 25.0);
          b.translate(0, 12.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Urban midrise with continuous wrap-around cantilevered balconies (40.0x18.0m, 32.0m high)
 */
export function bldHighendLinearBalconyApartments(seed = "bld-highend-linear-balcony-apartments-0") {
  return {
    id: "bld-highend-linear-balcony-apartments",
    tier: "highend",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 18.0 },
    height: 32.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const core = new T.BoxGeometry(38, 30, 14); core.translate(0, 15, 0);
         const balc = new T.BoxGeometry(39, 28, 2.5); balc.translate(0, 15, 7.5);
         return mergeGeometries([core, balc], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 30.40, 17.10);
          b.translate(0, 15.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 32.0, 18.0);
          b.translate(0, 16.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 7-Storey brick masonry loft apartment building (24.0x24.0m, 28.0m high)
 */
export function bldMidhighBrickLoftApartments(seed = "bld-midhigh-brick-loft-apartments-0") {
  return {
    id: "bld-midhigh-brick-loft-apartments",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 26, 22); bld.translate(0, 13, 0);
         const cornice = new T.BoxGeometry(23, 1.5, 23); cornice.translate(0, 26.8, 0);
         return mergeGeometries([bld, cornice], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 26.60, 22.80);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 28.0, 24.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Modernist residential slab block with inset loggias (40.0x16.0m, 32.0m high)
 */
export function bldMidhighModernistSlabBlock(seed = "bld-midhigh-modernist-slab-block-0") {
  return {
    id: "bld-midhigh-modernist-slab-block",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 16.0 },
    height: 32.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(38, 30, 14); slab.translate(0, 15, 0);
         const roof = new T.BoxGeometry(39, 1.2, 15); roof.translate(0, 31, 0);
         return mergeGeometries([slab, roof], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 30.40, 15.20);
          b.translate(0, 15.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 32.0, 16.0);
          b.translate(0, 16.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 6-Storey urban perimeter street wall building (32.0x16.0m, 24.0m high)
 */
export function bldMidhighPerimeterBlockWing(seed = "bld-midhigh-perimeter-block-wing-0") {
  return {
    id: "bld-midhigh-perimeter-block-wing",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 16.0 },
    height: 24.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const wing = new T.BoxGeometry(30, 22, 14); wing.translate(0, 11, 0);
         const base = new T.BoxGeometry(31, 4.5, 15); base.translate(0, 2.25, 0);
         return mergeGeometries([wing, base], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 22.80, 15.20);
          b.translate(0, 11.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 24.0, 16.0);
          b.translate(0, 12.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Corner mixed-use retail and residential block (24.0x24.0m, 28.0m high)
 */
export function bldMidhighStreetCornerMixed(seed = "bld-midhigh-street-corner-mixed-0") {
  return {
    id: "bld-midhigh-street-corner-mixed",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(22, 26, 22); body.translate(0, 13, 0);
         const corner = new T.CylinderGeometry(3, 3, 26, 8); corner.translate(9, 13, 9);
         return mergeGeometries([body, corner], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 26.60, 22.80);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 28.0, 24.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Urban triplex townhouses with contemporary composite cladding (24.0x12.0m, 16.0m high)
 */
export function bldMidhighTerraceTriplex(seed = "bld-midhigh-terrace-triplex-0") {
  return {
    id: "bld-midhigh-terrace-triplex",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 12.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 14, 10); bld.translate(0, 7, 0);
         const bays = new T.BoxGeometry(23, 10, 2); bays.translate(0, 6, 4.5);
         return mergeGeometries([bld, bays], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 15.20, 11.40);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 16.0, 12.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 4-Storey suburban corporate campus office building (32.0x36.0m, 20.0m high)
 */
export function bldMidhighSuburbanOfficePark(seed = "bld-midhigh-suburban-office-park-0") {
  return {
    id: "bld-midhigh-suburban-office-park",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 36.0 },
    height: 20.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 18, 30); bld.translate(0, 9, 0);
         const entry = new T.BoxGeometry(10, 5, 4); entry.translate(0, 2.5, 16);
         return mergeGeometries([bld, entry], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 19.00, 34.20);
          b.translate(0, 9.50, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 20.0, 36.0);
          b.translate(0, 10.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: U-shaped garden courtyard residential complex (32.0x24.0m, 20.0m high)
 */
export function bldMidhighGardenApartments(seed = "bld-midhigh-garden-apartments-0") {
  return {
    id: "bld-midhigh-garden-apartments",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 20.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const w1 = new T.BoxGeometry(10, 18, 22); w1.translate(-10, 9, 0);
         const w2 = new T.BoxGeometry(10, 18, 22); w2.translate(10, 9, 0);
         const mid = new T.BoxGeometry(12, 18, 10); mid.translate(0, 9, -6);
         return mergeGeometries([w1, w2, mid], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 19.00, 22.80);
          b.translate(0, 9.50, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 20.0, 24.0);
          b.translate(0, 10.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 11-Storey urban micro-unit co-living tower (24.0x24.0m, 44.0m high)
 */
export function bldMidhighCoLivingTower(seed = "bld-midhigh-co-living-tower-0") {
  return {
    id: "bld-midhigh-co-living-tower",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 44.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const tower = new T.BoxGeometry(22, 42, 22); tower.translate(0, 21, 0);
         const louvers = new T.BoxGeometry(23, 38, 2); louvers.translate(0, 22, 10.5);
         return mergeGeometries([tower, louvers], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 41.80, 22.80);
          b.translate(0, 20.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 44.0, 24.0);
          b.translate(0, 22.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Mixed-use commercial streetfront with upper residential flats (32.0x20.0m, 20.0m high)
 */
export function bldMidhighRetailFlatsRow(seed = "bld-midhigh-retail-flats-row-0") {
  return {
    id: "bld-midhigh-retail-flats-row",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 20.0 },
    height: 20.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 18, 14); bld.translate(0, 9, 0);
         const canopy = new T.BoxGeometry(31, 0.8, 3.5); canopy.translate(0, 4.5, 8);
         return mergeGeometries([bld, canopy], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 19.00, 19.00);
          b.translate(0, 9.50, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 20.0, 20.0);
          b.translate(0, 10.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Architectural flex office and light research warehouse (32.0x24.0m, 12.0m high)
 */
export function bldMidhighLightIndustrialFlex(seed = "bld-midhigh-light-industrial-flex-0") {
  return {
    id: "bld-midhigh-light-industrial-flex",
    tier: "midhigh",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 85,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 10, 22); bld.translate(0, 5, 0);
         const office = new T.BoxGeometry(12, 11, 8); office.translate(8, 5.5, 8);
         return mergeGeometries([bld, office], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 11.40, 22.80);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 12.0, 24.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 6-Storey standard modular multifamily apartment block (24.0x24.0m, 24.0m high)
 */
export function bldMidStandardApartmentBlock(seed = "bld-mid-standard-apartment-block-0") {
  return {
    id: "bld-mid-standard-apartment-block",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 24.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 55,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 22, 22); bld.translate(0, 11, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 22.80, 22.80);
          b.translate(0, 11.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 24.0, 24.0);
          b.translate(0, 12.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Single-storey commercial shopping strip with covered walkway (40.0x16.0m, 8.0m high)
 */
export function bldMidStripMallCommercial(seed = "bld-mid-strip-mall-commercial-0") {
  return {
    id: "bld-mid-strip-mall-commercial",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 40.0, d: 16.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const shop = new T.BoxGeometry(38, 6.8, 13); shop.translate(0, 3.4, -1);
         const canopy = new T.BoxGeometry(38, 0.6, 3); canopy.translate(0, 4.5, 6);
         return mergeGeometries([shop, canopy], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 7.60, 15.20);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 8.0, 16.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Two-family residential duplex with pitched shingle roof (16.0x13.0m, 10.0m high)
 */
export function bldMidSuburbanDuplex(seed = "bld-mid-suburban-duplex-0") {
  return {
    id: "bld-mid-suburban-duplex",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 16.0, d: 13.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 60,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(14, 6, 10); bld.translate(0, 3, 0);
         const roof = new T.ConeGeometry(8.5, 3.5, 4); roof.rotateY(Math.PI/4); roof.translate(0, 7.75, 0);
         return mergeGeometries([bld, roof], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 9.50, 12.35);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 10.0, 13.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 4-Storey urban walk-up residential tenement (16.0x16.0m, 16.0m high)
 */
export function bldMidWalkupTenement(seed = "bld-mid-walkup-tenement-0") {
  return {
    id: "bld-mid-walkup-tenement",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(14, 15, 14); bld.translate(0, 7.5, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 15.20, 15.20);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 16.0, 16.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 2-Storey community healthcare and dental clinic (24.0x20.0m, 10.0m high)
 */
export function bldMidCommunityMedicalClinic(seed = "bld-mid-community-medical-clinic-0") {
  return {
    id: "bld-mid-community-medical-clinic",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 20.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 8.5, 14); bld.translate(0, 4.25, 0);
         const canopy = new T.BoxGeometry(8, 0.5, 4); canopy.translate(0, 3.5, 8);
         return mergeGeometries([bld, canopy], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 9.50, 19.00);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 10.0, 20.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Row of four standard suburban residential townhouses (24.0x12.0m, 12.0m high)
 */
export function bldMidRowhouseQuad(seed = "bld-mid-rowhouse-quad-0") {
  return {
    id: "bld-mid-rowhouse-quad",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 12.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 58,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(22, 8.5, 10); body.translate(0, 4.25, 0);
         const roof = new T.BoxGeometry(23, 2.5, 11); roof.translate(0, 10.25, 0);
         return mergeGeometries([body, roof], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 11.40, 11.40);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 12.0, 12.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard logistics and freight distribution warehouse bay (48.0x32.0m, 12.0m high)
 */
export function bldMidDistributionWarehouse(seed = "bld-mid-distribution-warehouse-0") {
  return {
    id: "bld-mid-distribution-warehouse",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 48.0, d: 32.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(46, 10.5, 30); hall.translate(0, 5.25, 0); return hall;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 11.40, 30.40);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 12.0, 32.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Freestanding retail bank branch with drive-through lane (20.0x16.0m, 8.0m high)
 */
export function bldMidBankBranchOffice(seed = "bld-mid-bank-branch-office-0") {
  return {
    id: "bld-mid-bank-branch-office",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 20.0, d: 16.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(14, 6.8, 14); bld.translate(0, 3.4, 0);
         const lane = new T.BoxGeometry(6, 0.4, 6); lane.translate(7, 3.5, 0);
         return mergeGeometries([bld, lane], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(19.00, 7.60, 15.20);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(20.0, 8.0, 16.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 4-Storey climate controlled self-storage facility (32.0x24.0m, 16.0m high)
 */
export function bldMidSelfStorageFacility(seed = "bld-mid-self-storage-facility-0") {
  return {
    id: "bld-mid-self-storage-facility",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 15, 22); bld.translate(0, 7.5, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 15.20, 22.80);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 16.0, 24.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Automotive vehicle showroom and service bays (32.0x24.0m, 8.0m high)
 */
export function bldMidAutoDealershipShowroom(seed = "bld-mid-auto-dealership-showroom-0") {
  return {
    id: "bld-mid-auto-dealership-showroom",
    tier: "mid",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const show = new T.BoxGeometry(20, 6.8, 20); show.translate(-5, 3.4, 0);
         const bays = new T.BoxGeometry(10, 6.0, 20); bays.translate(10, 3.0, 0);
         return mergeGeometries([show, bays], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 7.60, 22.80);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 8.0, 24.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Precast concrete utility equipment substation shelter (8.0x8.0m, 6.0m high)
 */
export function bldMidlowUtilitySubstationShed(seed = "bld-midlow-utility-substation-shed-0") {
  return {
    id: "bld-midlow-utility-substation-shed",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 8.0, d: 8.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(6.8, 4.8, 6.8); bld.translate(0, 2.4, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 5.70, 7.60);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 6.0, 8.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Corrugated steel utility and agricultural storage shed (16.0x12.0m, 8.0m high)
 */
export function bldMidlowCorrugatedStorageBarn(seed = "bld-midlow-corrugated-storage-barn-0") {
  return {
    id: "bld-midlow-corrugated-storage-barn",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 16.0, d: 12.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 28,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(14, 5.5, 10); bld.translate(0, 2.75, 0);
         const roof = new T.ConeGeometry(7, 2, 4); roof.rotateY(Math.PI/4); roof.translate(0, 6.5, 0);
         return mergeGeometries([bld, roof], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 7.60, 11.40);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 8.0, 12.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: 2-Storey exterior-corridor economy highway motel block (32.0x12.0m, 8.0m high)
 */
export function bldMidlowBudgetMotelUnit(seed = "bld-midlow-budget-motel-unit-0") {
  return {
    id: "bld-midlow-budget-motel-unit",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 32.0, d: 12.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 30,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(30, 6.8, 10); bld.translate(0, 3.4, 0);
         const walk = new T.BoxGeometry(30, 0.4, 2); walk.translate(0, 3.8, 5);
         return mergeGeometries([bld, walk], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 7.60, 11.40);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 8.0, 12.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Temporary prefabricated construction site office trailer (12.0x4.0m, 3.5m high)
 */
export function bldMidlowModularTrailerOffice(seed = "bld-midlow-modular-trailer-office-0") {
  return {
    id: "bld-midlow-modular-trailer-office",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 12.0, d: 4.0 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(11, 2.8, 3.4); body.translate(0, 1.6, 0);
         const skirt = new T.BoxGeometry(11, 0.4, 3.4); skirt.translate(0, 0.2, 0);
         return mergeGeometries([body, skirt], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 3.32, 3.80);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 3.5, 4.0);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Standard modular fast-food restaurant box (16.0x12.0m, 6.0m high)
 */
export function bldMidlowFreestandingFastFoodBox(seed = "bld-midlow-freestanding-fast-food-box-0") {
  return {
    id: "bld-midlow-freestanding-fast-food-box",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 16.0, d: 12.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 26,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(14, 4.8, 10); box.translate(0, 2.4, 0); return box;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 5.70, 11.40);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 6.0, 12.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Pre-engineered steel light industrial strip bay (24.0x16.0m, 8.0m high)
 */
export function bldMidlowStripWarehouseUnit(seed = "bld-midlow-strip-warehouse-unit-0") {
  return {
    id: "bld-midlow-strip-warehouse-unit",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const unit = new T.BoxGeometry(22, 6.8, 14); unit.translate(0, 3.4, 0); return unit;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 7.60, 15.20);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 8.0, 16.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Security checkpoint guardhouse booth with overhang (4.0x4.0m, 3.5m high)
 */
export function bldMidlowGuardhouseCheckpoint(seed = "bld-midlow-guardhouse-checkpoint-0") {
  return {
    id: "bld-midlow-guardhouse-checkpoint",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const booth = new T.BoxGeometry(3.2, 2.8, 3.2); booth.translate(0, 1.4, 0);
         const roof = new T.BoxGeometry(3.8, 0.3, 3.8); roof.translate(0, 2.95, 0);
         return mergeGeometries([booth, roof], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 3.32, 3.80);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 3.5, 4.0);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Steel frame covered vehicle carport parking canopy (16.0x6.0m, 3.5m high)
 */
export function bldMidlowCarportShelterRow(seed = "bld-midlow-carport-shelter-row-0") {
  return {
    id: "bld-midlow-carport-shelter-row",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 16.0, d: 6.0 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const roof = new T.BoxGeometry(15, 0.25, 5.5); roof.translate(0, 2.8, 0);
         const p1 = new T.CylinderGeometry(0.1, 0.1, 2.8, 6); p1.translate(-6.5, 1.4, -2.4);
         const p2 = new T.CylinderGeometry(0.1, 0.1, 2.8, 6); p2.translate(6.5, 1.4, -2.4);
         return mergeGeometries([roof, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 3.32, 5.70);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 3.5, 6.0);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Modified 40ft ISO shipping container field office (12.0x2.5m, 2.9m high)
 */
export function bldMidlowShippingContainerOffice(seed = "bld-midlow-shipping-container-office-0") {
  return {
    id: "bld-midlow-shipping-container-office",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 12.0, d: 2.5 },
    height: 2.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const c = new T.BoxGeometry(11.8, 2.6, 2.3); c.translate(0, 1.3, 0); return c;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 2.75, 2.38);
          b.translate(0, 1.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 2.9, 2.5);
          b.translate(0, 1.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Municipal water works pump house kiosk (6.0x6.0m, 4.5m high)
 */
export function bldMidlowPumpHouseKiosk(seed = "bld-midlow-pump-house-kiosk-0") {
  return {
    id: "bld-midlow-pump-house-kiosk",
    tier: "midlow",
    category: "buildings",
    kind: "hard",
    footprint: { w: 6.0, d: 6.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const shed = new T.BoxGeometry(4.8, 3.8, 4.8); shed.translate(0, 1.9, 0); return shed;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 4.27, 5.70);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 4.5, 6.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Multimodal hydrofoil terminal & ferry hub with sweeping aquatic canopy (64.0x52.0m, 28.0m high)
 */
export function civicShowstopperHydroTransitTerminal(seed = "civic-showstopper-hydro-transit-terminal-0") {
  return {
    id: "civic-showstopper-hydro-transit-terminal",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 64.0, d: 52.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const pier = new T.BoxGeometry(62, 3, 46); pier.translate(0, 1.5, 0);
         const hall = new T.CylinderGeometry(16, 22, 14, 16); hall.translate(0, 10, 0);
         const wingL = new T.BoxGeometry(24, 8, 16); wingL.translate(-18, 7, 0);
         const wingR = new T.BoxGeometry(24, 8, 16); wingR.translate(18, 7, 0);
         const canopy = new T.CylinderGeometry(26, 26, 1.5, 16); canopy.translate(0, 18, 0);
         return mergeGeometries([pier, hall, wingL, wingR, canopy], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 26.60, 49.40);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 28.0, 52.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: World-class acoustic symphony hall with organic interlocking acoustic shells (77.0x64.0m, 44.0m high)
 */
export function civicShowstopperOperaSymphonyHall(seed = "civic-showstopper-opera-symphony-hall-0") {
  return {
    id: "civic-showstopper-opera-symphony-hall",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 77.0, d: 64.0 },
    height: 44.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 560,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(60, 8, 60); base.translate(0, 4, 0);
         const s1 = new T.SphereGeometry(22, 16, 12); s1.scale(1.2, 0.7, 0.9); s1.translate(-12, 18, -8);
         const s2 = new T.SphereGeometry(18, 16, 12); s2.scale(1.1, 0.8, 1.0); s2.translate(14, 20, 10);
         return mergeGeometries([base, s1, s2], T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(73.15, 41.80, 60.80);
          b.translate(0, 20.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(77.0, 44.0, 64.0);
          b.translate(0, 22.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: National Museum of Art & Antiquities with carved central atrium canyon (64.0x48.0m, 36.0m high)
 */
export function civicShowstopperNationalMuseumCanyon(seed = "civic-showstopper-national-museum-canyon-0") {
  return {
    id: "civic-showstopper-national-museum-canyon",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 64.0, d: 48.0 },
    height: 36.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const wing1 = new T.BoxGeometry(26, 32, 44); wing1.translate(-16, 16, 0);
         const wing2 = new T.BoxGeometry(26, 32, 44); wing2.translate(16, 16, 0);
         const bridge = new T.BoxGeometry(16, 8, 36); bridge.translate(0, 24, 0);
         return mergeGeometries([wing1, wing2, bridge], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 34.20, 45.60);
          b.translate(0, 17.10, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 36.0, 48.0);
          b.translate(0, 18.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Tri-cluster geodesic botanical conservatory biomes (64.0x64.0m, 32.0m high)
 */
export function civicShowstopperBiomeBotanicalDomes(seed = "civic-showstopper-biome-botanical-domes-0") {
  return {
    id: "civic-showstopper-biome-botanical-domes",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 64.0, d: 64.0 },
    height: 32.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const d1 = new T.SphereGeometry(20, 16, 12); d1.scale(1.0, 0.75, 1.0); d1.translate(-12, 14, -10);
         const d2 = new T.SphereGeometry(16, 16, 12); d2.scale(1.0, 0.75, 1.0); d2.translate(14, 11, -8);
         const d3 = new T.SphereGeometry(14, 16, 12); d3.scale(1.0, 0.75, 1.0); d3.translate(0, 9.5, 16);
         const _m = mergeGeometries([d1, d2, d3], T);; _m.translate(0, 1.000, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 68,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 30.40, 60.80);
          b.translate(0, 15.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 32.0, 64.0);
          b.translate(0, 16.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: National Parliament Capitol Assembly Rotunda with illuminated grand dome (56.0x56.0m, 52.0m high)
 */
export function civicShowstopperParliamentDomeRotunda(seed = "civic-showstopper-parliament-dome-rotunda-0") {
  return {
    id: "civic-showstopper-parliament-dome-rotunda",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 56.0, d: 56.0 },
    height: 52.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(52, 10, 52); plinth.translate(0, 5, 0);
         const drum = new T.CylinderGeometry(18, 20, 24, 16); drum.translate(0, 22, 0);
         const dome = new T.SphereGeometry(18, 16, 12); dome.scale(1, 0.8, 1); dome.translate(0, 36, 0);
         const cupola = new T.CylinderGeometry(2, 4, 8, 8); cupola.translate(0, 48, 0);
         return mergeGeometries([plinth, drum, dome, cupola], T);
        },
      },
      {
        level: 1,
        tris: 70,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(53.20, 49.40, 53.20);
          b.translate(0, 24.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56.0, 52.0, 56.0);
          b.translate(0, 26.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Central Metropolitan Public Library with parametric wave wooden ceiling (56.0x40.0m, 26.4m high)
 */
export function civicShowstopperWavePublicLibrary(seed = "civic-showstopper-wave-public-library-0") {
  return {
    id: "civic-showstopper-wave-public-library",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 56.0, d: 40.0 },
    height: 26.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(52, 8, 36); base.translate(0, 4, 0);
         const mid = new T.BoxGeometry(46, 8, 30); mid.translate(0, 12, 0);
         const wave = new T.CylinderGeometry(24, 24, 52, 16, 1, false, 0, Math.PI);
         wave.rotateZ(Math.PI/2); wave.scale(1, 0.35, 0.7); wave.translate(0, 18, 0);
         return mergeGeometries([base, mid, wave], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(53.20, 25.08, 38.00);
          b.translate(0, 12.54, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56.0, 26.4, 40.0);
          b.translate(0, 13.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Olympic Aquatic Arena with double-curved hyperbolic roof membrane (64.0x48.0m, 26.0m high)
 */
export function civicShowstopperAquaticOlympicArena(seed = "civic-showstopper-aquatic-olympic-arena-0") {
  return {
    id: "civic-showstopper-aquatic-olympic-arena",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 64.0, d: 48.0 },
    height: 26.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const pool = new T.BoxGeometry(60, 6, 44); pool.translate(0, 3, 0);
         const roof = new T.CylinderGeometry(28, 28, 62, 16, 1, false, 0, Math.PI);
         roof.rotateZ(Math.PI/2); roof.scale(1, 0.35, 0.75); roof.translate(0, 15, 0);
         return mergeGeometries([pool, roof], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 24.70, 45.60);
          b.translate(0, 12.35, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 26.0, 48.0);
          b.translate(0, 13.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Grand High-Speed Rail Terminal Concourse with soaring rib arches (76.0x40.0m, 28.0m high)
 */
export function civicShowstopperHighspeedRailConcourse(seed = "civic-showstopper-highspeed-rail-concourse-0") {
  return {
    id: "civic-showstopper-highspeed-rail-concourse",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 76.0, d: 40.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 530,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(62, 6, 38); base.translate(0, 3, 0);
         const rib1 = new T.TorusGeometry(18, 1.8, 8, 16, Math.PI); rib1.rotateX(Math.PI/2); rib1.translate(-18, 14, 0);
         const rib2 = new T.TorusGeometry(18, 1.8, 8, 16, Math.PI); rib2.rotateX(Math.PI/2); rib2.translate(0, 14, 0);
         const rib3 = new T.TorusGeometry(18, 1.8, 8, 16, Math.PI); rib3.rotateX(Math.PI/2); rib3.translate(18, 14, 0);
         return mergeGeometries([base, rib1, rib2, rib3], T);
        },
      },
      {
        level: 1,
        tris: 66,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(72.20, 26.60, 38.00);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(76.0, 28.0, 40.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: City Planetarium & Astronomical Observatory with geodesic titanium dome (48.0x48.0m, 38.0m high)
 */
export function civicShowstopperPlanetariumObservatory(seed = "civic-showstopper-planetarium-observatory-0") {
  return {
    id: "civic-showstopper-planetarium-observatory",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 48.0, d: 48.0 },
    height: 38.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(20, 22, 12, 16); base.translate(0, 6, 0);
         const dome = new T.SphereGeometry(16, 16, 12); dome.translate(0, 22, 0);
         const ring = new T.TorusGeometry(21, 1.5, 8, 20); ring.rotateX(Math.PI/2); ring.translate(0, 12, 0);
         return mergeGeometries([base, dome, ring], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 36.10, 45.60);
          b.translate(0, 18.05, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 38.0, 48.0);
          b.translate(0, 19.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Contemporary Art Pavilion with canted basalt gallery volumes (56.0x40.0m, 20.0m high)
 */
export function civicShowstopperContemporaryArtPavilion(seed = "civic-showstopper-contemporary-art-pavilion-0") {
  return {
    id: "civic-showstopper-contemporary-art-pavilion",
    tier: "showstopper",
    category: "civic",
    kind: "hard",
    footprint: { w: 56.0, d: 40.0 },
    height: 20.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(52, 2, 36); plinth.translate(0, 1, 0);
         const pod1 = new T.BoxGeometry(24, 14, 18); pod1.rotateY(0.2); pod1.translate(-12, 9, 0);
         const pod2 = new T.BoxGeometry(24, 12, 18); pod2.rotateY(-0.25); pod2.translate(12, 8, 0);
         return mergeGeometries([plinth, pod1, pod2], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(53.20, 19.00, 38.00);
          b.translate(0, 9.50, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56.0, 20.0, 40.0);
          b.translate(0, 10.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Victorian-style wrought-iron and glass botanical palm conservatory (40.0x24.0m, 18.0m high)
 */
export function civicLuxuryConservatoryGlasshouse(seed = "civic-luxury-conservatory-glasshouse-0") {
  return {
    id: "civic-luxury-conservatory-glasshouse",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 40.0, d: 24.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(38, 3, 22); base.translate(0, 1.5, 0);
         const barrel = new T.CylinderGeometry(9, 9, 36, 16, 1, false, 0, Math.PI);
         barrel.rotateZ(Math.PI / 2); barrel.translate(0, 9, 0);
         return mergeGeometries([base, barrel], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 17.10, 22.80);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 18.0, 24.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Classical neoclassical municipal opera house with colonnaded portico (48.0x36.0m, 28.0m high)
 */
export function civicLuxuryMunicipalOperaTheatre(seed = "civic-luxury-municipal-opera-theatre-0") {
  return {
    id: "civic-luxury-municipal-opera-theatre",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 48.0, d: 36.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 325,
        createGeometry: (T = THREE) => {
          const portico = new T.BoxGeometry(44, 18, 32); portico.translate(0, 9, 0);
         const ped = new T.ConeGeometry(24, 8, 4); ped.rotateY(Math.PI / 4); ped.translate(0, 22, 0);
         return mergeGeometries([portico, ped], T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 26.60, 34.20);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 28.0, 36.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Octagonal garden tea pavilion with flared copper pagoda roof (32.0x32.0m, 14.0m high)
 */
export function civicLuxuryBotanicalGardenPavilion(seed = "civic-luxury-botanical-garden-pavilion-0") {
  return {
    id: "civic-luxury-botanical-garden-pavilion",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(30, 1.5, 30); plinth.translate(0, 0.75, 0);
         const core = new T.CylinderGeometry(8, 8, 10, 12); core.translate(0, 6.5, 0);
         const roof = new T.ConeGeometry(14, 4.5, 12); roof.translate(0, 11.5, 0);
         return mergeGeometries([plinth, core, roof], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 13.30, 30.40);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 14.0, 32.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Historic civic town hall with 48m sandstone clock tower (24.0x24.0m, 48.0m high)
 */
export function civicLuxuryHeritageClocktowerHall(seed = "civic-luxury-heritage-clocktower-hall-0") {
  return {
    id: "civic-luxury-heritage-clocktower-hall",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 48.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(22, 16, 22); hall.translate(0, 8, 0);
         const shaft = new T.BoxGeometry(8, 24, 8); shaft.translate(0, 28, 0);
         const spire = new T.ConeGeometry(5, 7.5, 4); spire.rotateY(Math.PI / 4); spire.translate(0, 44, 0);
         return mergeGeometries([hall, shaft, spire], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 45.60, 22.80);
          b.translate(0, 22.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 48.0, 24.0);
          b.translate(0, 24.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: High-security diplomatic embassy chancery residence and plaza (48.0x40.0m, 20.0m high)
 */
export function civicLuxuryEmbassyChanceryCompound(seed = "civic-luxury-embassy-chancery-compound-0") {
  return {
    id: "civic-luxury-embassy-chancery-compound",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 48.0, d: 40.0 },
    height: 20.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const main = new T.BoxGeometry(36, 16, 26); main.translate(0, 8, -4);
         const guard = new T.BoxGeometry(10, 5, 8); guard.translate(-14, 2.5, 14);
         const court = new T.BoxGeometry(44, 0.8, 36); court.translate(0, 0.4, 0);
         return mergeGeometries([main, guard, court], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 19.00, 38.00);
          b.translate(0, 9.50, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 20.0, 40.0);
          b.translate(0, 10.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Waterfront private yacht club and regatta pavilion with observation deck (40.0x24.0m, 16.0m high)
 */
export function civicLuxurySailingClubhouse(seed = "civic-luxury-sailing-clubhouse-0") {
  return {
    id: "civic-luxury-sailing-clubhouse",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 40.0, d: 24.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(38, 2.5, 22); deck.translate(0, 1.25, 0);
         const bld = new T.BoxGeometry(32, 8.5, 16); bld.translate(0, 6.75, -2);
         const mast = new T.CylinderGeometry(0.2, 0.3, 14, 8); mast.translate(12, 8, 8);
         return mergeGeometries([deck, bld, mast], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 15.20, 22.80);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 16.0, 24.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Palace of Justice High Court with monumental pedimented facade (48.0x53.0m, 26.0m high)
 */
export function civicLuxuryLawCourtsPalace(seed = "civic-luxury-law-courts-palace-0") {
  return {
    id: "civic-luxury-law-courts-palace",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 48.0, d: 53.0 },
    height: 26.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(44, 20, 32); base.translate(0, 10, 0);
         const col = new T.BoxGeometry(36, 14, 4); col.translate(0, 8, 14);
         const ped = new T.ConeGeometry(20, 5, 4); ped.rotateY(Math.PI/4); ped.translate(0, 22.5, 12);
         return mergeGeometries([base, col, ped], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 24.70, 50.35);
          b.translate(0, 12.35, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 26.0, 53.0);
          b.translate(0, 13.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Fine Arts Academy with north-facing northlight painting studios (40.0x32.0m, 22.0m high)
 */
export function civicLuxuryFineArtsAcademy(seed = "civic-luxury-fine-arts-academy-0") {
  return {
    id: "civic-luxury-fine-arts-academy",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 40.0, d: 32.0 },
    height: 22.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const wing1 = new T.BoxGeometry(36, 18, 12); wing1.translate(0, 9, -8);
         const wing2 = new T.BoxGeometry(12, 18, 16); wing2.translate(-12, 9, 6);
         const skylight = new T.ConeGeometry(6, 3, 4); skylight.rotateY(Math.PI/4); skylight.translate(0, 19.5, -8);
         return mergeGeometries([wing1, wing2, skylight], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 20.90, 30.40);
          b.translate(0, 10.45, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 22.0, 32.0);
          b.translate(0, 11.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Executive VIP rotorcraft terminal with elevated rooftop helipad (32.0x32.0m, 12.0m high)
 */
export function civicLuxuryVipHelipadTerminal(seed = "civic-luxury-vip-helipad-terminal-0") {
  return {
    id: "civic-luxury-vip-helipad-terminal",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(26, 6.5, 26); bld.translate(0, 3.25, 0);
         const pad = new T.CylinderGeometry(11, 11, 1.2, 16); pad.translate(0, 7.1, 0);
         return mergeGeometries([bld, pad], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 11.40, 30.40);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 12.0, 32.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Civic multi-purpose performance theatre and community hall (40.0x40.0m, 18.0m high)
 */
export function civicLuxuryCommunityAuditorium(seed = "civic-luxury-community-auditorium-0") {
  return {
    id: "civic-luxury-community-auditorium",
    tier: "luxury",
    category: "civic",
    kind: "hard",
    footprint: { w: 40.0, d: 40.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 295,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(36, 14, 28); hall.translate(0, 7, 0);
         const canopy = new T.BoxGeometry(20, 1.2, 8); canopy.translate(0, 8, 16);
         return mergeGeometries([hall, canopy], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 17.10, 38.00);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 18.0, 40.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Modern central fire and rescue station with training hose tower (32.0x24.0m, 18.0m high)
 */
export function civicHighendCentralFireHeadquarters(seed = "civic-highend-central-fire-headquarters-0") {
  return {
    id: "civic-highend-central-fire-headquarters",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const bays = new T.BoxGeometry(28, 9, 20); bays.translate(0, 4.5, 0);
         const tower = new T.BoxGeometry(6, 16, 6); tower.translate(-10, 8, -6);
         return mergeGeometries([bays, tower], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 17.10, 22.80);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 18.0, 24.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: District police headquarters with communications mast and secured Sally port (32.0x24.0m, 16.0m high)
 */
export function civicHighendDistrictPolicePrecinct(seed = "civic-highend-district-police-precinct-0") {
  return {
    id: "civic-highend-district-police-precinct",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(28, 13, 20); bld.translate(0, 6.5, 0);
         const secure = new T.BoxGeometry(10, 14, 4); secure.translate(0, 7, 10);
         return mergeGeometries([bld, secure], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 15.20, 22.80);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 16.0, 24.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Metropolitan general hospital acute care wing & emergency drop-off (48.0x38.0m, 32.0m high)
 */
export function civicHighendGeneralHospitalWing(seed = "civic-highend-general-hospital-wing-0") {
  return {
    id: "civic-highend-general-hospital-wing",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 48.0, d: 38.0 },
    height: 32.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 210,
        createGeometry: (T = THREE) => {
          const main = new T.BoxGeometry(44, 28, 26); main.translate(0, 14, 0);
         const er = new T.BoxGeometry(18, 5, 10); er.translate(10, 2.5, 14);
         return mergeGeometries([main, er], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 30.40, 36.10);
          b.translate(0, 15.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 32.0, 38.0);
          b.translate(0, 16.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Neighborhood public library with two-storey reading glass atrium (24.0x24.0m, 14.0m high)
 */
export function civicHighendPublicLibraryBranch(seed = "civic-highend-public-library-branch-0") {
  return {
    id: "civic-highend-public-library-branch",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(22, 11, 20); body.translate(0, 5.5, 0);
         const glass = new T.BoxGeometry(14, 12, 4); glass.translate(0, 6, 9.5);
         return mergeGeometries([body, glass], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 13.30, 22.80);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 14.0, 24.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Modern secondary school academic wing and indoor athletic gymnasium (48.0x32.0m, 16.0m high)
 */
export function civicHighendSecondarySchoolCampus(seed = "civic-highend-secondary-school-campus-0") {
  return {
    id: "civic-highend-secondary-school-campus",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 48.0, d: 32.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const bld1 = new T.BoxGeometry(44, 13, 14); bld1.translate(0, 6.5, -7);
         const gym = new T.BoxGeometry(20, 14, 14); gym.translate(-10, 7, 7);
         return mergeGeometries([bld1, gym], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 15.20, 30.40);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 16.0, 32.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Municipal indoor 25m swimming pool and aquatic leisure center (40.0x24.0m, 14.0m high)
 */
export function civicHighendCommunitySwimmingCenter(seed = "civic-highend-community-swimming-center-0") {
  return {
    id: "civic-highend-community-swimming-center",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 40.0, d: 24.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(36, 11, 20); hall.translate(0, 5.5, 0);
         const roof = new T.BoxGeometry(38, 1.2, 22); roof.translate(0, 12, 0);
         return mergeGeometries([hall, roof], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 13.30, 22.80);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 14.0, 24.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Glass-canopied rapid transit subway station headhouse entrance (16.0x12.0m, 8.0m high)
 */
export function civicHighendSubwayStationEntry(seed = "civic-highend-subway-station-entry-0") {
  return {
    id: "civic-highend-subway-station-entry",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 16.0, d: 12.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(14, 4, 10); base.translate(0, 2, 0);
         const canopy = new T.BoxGeometry(15, 0.6, 11); canopy.translate(0, 6.5, 0);
         const glass = new T.BoxGeometry(13, 3, 9); glass.translate(0, 4.5, 0);
         return mergeGeometries([base, canopy, glass], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 7.60, 11.40);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 8.0, 12.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Serene granite memorial park chapel and columbarium cloister (32.0x24.0m, 14.0m high)
 */
export function civicHighendCrematoriumMemorialChapel(seed = "civic-highend-crematorium-memorial-chapel-0") {
  return {
    id: "civic-highend-crematorium-memorial-chapel",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const chapel = new T.BoxGeometry(26, 11, 18); chapel.translate(0, 5.5, 0);
         const chimney = new T.CylinderGeometry(0.8, 1.2, 13, 8); chimney.translate(-10, 6.5, -6);
         return mergeGeometries([chapel, chimney], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 13.30, 22.80);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 14.0, 24.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Central district postal sorting depot and public parcel counter (32.0x33.0m, 12.0m high)
 */
export function civicHighendPostOfficeLogisticsHub(seed = "civic-highend-post-office-logistics-hub-0") {
  return {
    id: "civic-highend-post-office-logistics-hub",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 33.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(28, 9.5, 28); hall.translate(0, 4.75, 0);
         const dock = new T.BoxGeometry(12, 4.0, 4); dock.translate(0, 2.0, 14.5);
         return mergeGeometries([hall, dock], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 11.40, 31.35);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 12.0, 33.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Doppler weather radar station with radome dome atop concrete shaft (16.0x16.0m, 26.0m high)
 */
export function civicHighendMeteorologicalRadarDome(seed = "civic-highend-meteorological-radar-dome-0") {
  return {
    id: "civic-highend-meteorological-radar-dome",
    tier: "highend",
    category: "civic",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 26.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const tower = new T.CylinderGeometry(3.5, 5.0, 17, 10); tower.translate(0, 8.5, 0);
         const dome = new T.SphereGeometry(5.5, 12, 10); dome.translate(0, 20.5, 0);
         return mergeGeometries([tower, dome], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 24.70, 15.20);
          b.translate(0, 12.35, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 26.0, 16.0);
          b.translate(0, 13.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Local suburban police substation with secured reception (24.0x17.0m, 12.0m high)
 */
export function civicMidhighNeighborhoodPoliceStation(seed = "civic-midhigh-neighborhood-police-station-0") {
  return {
    id: "civic-midhigh-neighborhood-police-station",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 17.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 10, 14); bld.translate(0, 5, 0);
         const ent = new T.BoxGeometry(6, 4, 2); ent.translate(0, 2, 7.5);
         return mergeGeometries([bld, ent], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 11.40, 16.15);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 12.0, 17.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 2-Bay volunteer fire station with equipment mezzanine (24.0x16.0m, 10.8m high)
 */
export function civicMidhighVolunteerFirehouse(seed = "civic-midhigh-volunteer-firehouse-0") {
  return {
    id: "civic-midhigh-volunteer-firehouse",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 10.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const bays = new T.BoxGeometry(22, 8.5, 14); bays.translate(0, 4.25, 0);
         const bell = new T.BoxGeometry(4, 3, 4); bell.translate(-7, 9.25, 0);
         return mergeGeometries([bays, bell], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 10.26, 15.20);
          b.translate(0, 5.13, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 10.8, 16.0);
          b.translate(0, 5.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Community public healthcare clinic and urgent care facility (24.0x28.0m, 10.0m high)
 */
export function civicMidhighPrimaryHealthCenter(seed = "civic-midhigh-primary-health-center-0") {
  return {
    id: "civic-midhigh-primary-health-center",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 28.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 8.5, 22); bld.translate(0, 4.25, 0);
         const canopy = new T.BoxGeometry(8, 0.4, 4); canopy.translate(0, 3.5, 12);
         return mergeGeometries([bld, canopy], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 9.50, 26.60);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 10.0, 28.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Single-storey modular elementary school classroom building (32.0x25.0m, 10.0m high)
 */
export function civicMidhighElementarySchoolWing(seed = "civic-midhigh-elementary-school-wing-0") {
  return {
    id: "civic-midhigh-elementary-school-wing",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 25.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const wing = new T.BoxGeometry(30, 8.5, 20); wing.translate(0, 4.25, 0);
         const entry = new T.BoxGeometry(8, 4.5, 3); entry.translate(0, 2.25, 11);
         return mergeGeometries([wing, entry], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 9.50, 23.75);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 10.0, 25.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Senior community activity center with garden veranda (24.0x19.0m, 8.0m high)
 */
export function civicMidhighSeniorCommunityCenter(seed = "civic-midhigh-senior-community-center-0") {
  return {
    id: "civic-midhigh-senior-community-center",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 19.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 6.8, 14); bld.translate(0, 3.4, 0);
         const porch = new T.BoxGeometry(10, 0.3, 3); porch.translate(0, 3.2, 7.8);
         return mergeGeometries([bld, porch], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 7.60, 18.05);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 8.0, 19.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Community recreation basketball gym and youth club (32.0x26.0m, 12.0m high)
 */
export function civicMidhighYouthClubGymnasium(seed = "civic-midhigh-youth-club-gymnasium-0") {
  return {
    id: "civic-midhigh-youth-club-gymnasium",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 26.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const gym = new T.BoxGeometry(28, 10.5, 20); gym.translate(0, 5.25, 0);
         const annex = new T.BoxGeometry(12, 6.0, 4); annex.translate(0, 3.0, 11);
         return mergeGeometries([gym, annex], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 11.40, 24.70);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 12.0, 26.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Municipal public records archive and town clerk repository (24.0x16.0m, 12.0m high)
 */
export function civicMidhighTownClerkArchive(seed = "civic-midhigh-town-clerk-archive-0") {
  return {
    id: "civic-midhigh-town-clerk-archive",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(22, 10.5, 14); hall.translate(0, 5.25, 0); return hall;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 11.40, 15.20);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 12.0, 16.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 3-Bay emergency medical service ambulance base (24.0x16.0m, 8.0m high)
 */
export function civicMidhighAmbulanceStationDepot(seed = "civic-midhigh-ambulance-station-depot-0") {
  return {
    id: "civic-midhigh-ambulance-station-depot",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const bays = new T.BoxGeometry(22, 6.8, 14); bays.translate(0, 3.4, 0); return bays;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 7.60, 15.20);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 8.0, 16.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Stone groundskeeper cottage and cemetery office (16.0x12.0m, 8.0m high)
 */
export function civicMidhighCemeteryCaretakerLodge(seed = "civic-midhigh-cemetery-caretaker-lodge-0") {
  return {
    id: "civic-midhigh-cemetery-caretaker-lodge",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 16.0, d: 12.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const lodge = new T.BoxGeometry(14, 5.5, 10); lodge.translate(0, 2.75, 0);
         const roof = new T.ConeGeometry(7, 2.5, 4); roof.rotateY(Math.PI/4); roof.translate(0, 6.75, 0);
         return mergeGeometries([lodge, roof], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 7.60, 11.40);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 8.0, 12.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Municipal drinking water quality testing and purification laboratory (32.0x24.0m, 10.0m high)
 */
export function civicMidhighWaterFiltrationLab(seed = "civic-midhigh-water-filtration-lab-0") {
  return {
    id: "civic-midhigh-water-filtration-lab",
    tier: "midhigh",
    category: "civic",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const plant = new T.BoxGeometry(28, 8.5, 20); plant.translate(0, 4.25, 0);
         const tank = new T.CylinderGeometry(4, 4, 7, 10); tank.translate(10, 4.5, 0);
         return mergeGeometries([plant, tank], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 9.50, 22.80);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 10.0, 24.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard local branch post office (16.0x16.0m, 6.0m high)
 */
export function civicMidNeighborhoodPostBranch(seed = "civic-mid-neighborhood-post-branch-0") {
  return {
    id: "civic-mid-neighborhood-post-branch",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(14, 5.0, 14); bld.translate(0, 2.5, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 5.70, 15.20);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 6.0, 16.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Department of motor vehicles licensing field office (24.0x16.0m, 6.0m high)
 */
export function civicMidDmvLicensingOffice(seed = "civic-mid-dmv-licensing-office-0") {
  return {
    id: "civic-mid-dmv-licensing-office",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 5.0, 14); bld.translate(0, 2.5, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 5.70, 15.20);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 6.0, 16.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Timber community scout troop cabin and meeting hall (16.0x12.0m, 6.0m high)
 */
export function civicMidScoutHutCabin(seed = "civic-mid-scout-hut-cabin-0") {
  return {
    id: "civic-mid-scout-hut-cabin",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 16.0, d: 12.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 55,
        createGeometry: (T = THREE) => {
          const hut = new T.BoxGeometry(14, 4.0, 10); hut.translate(0, 2.0, 0);
         const roof = new T.ConeGeometry(7, 2, 4); roof.rotateY(Math.PI/4); roof.translate(0, 5.0, 0);
         return mergeGeometries([hut, roof], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 5.70, 11.40);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 6.0, 12.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Parks and recreation mower and grounds maintenance depot (24.0x16.0m, 6.0m high)
 */
export function civicMidParkMaintenanceDepot(seed = "civic-mid-park-maintenance-depot-0") {
  return {
    id: "civic-mid-park-maintenance-depot",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const shed = new T.BoxGeometry(22, 5.0, 14); shed.translate(0, 2.5, 0); return shed;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 5.70, 15.20);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 6.0, 16.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Municipal animal shelter and rescue kennel (24.0x16.0m, 6.0m high)
 */
export function civicMidAnimalControlShelter(seed = "civic-mid-animal-control-shelter-0") {
  return {
    id: "civic-mid-animal-control-shelter",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(22, 4.8, 14); bld.translate(0, 2.4, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 5.70, 15.20);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 6.0, 16.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Brick municipal public park restroom facility (12.0x8.0m, 4.5m high)
 */
export function civicMidPublicRestroomBuilding(seed = "civic-mid-public-restroom-building-0") {
  return {
    id: "civic-mid-public-restroom-building",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 12.0, d: 8.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const bld = new T.BoxGeometry(10, 3.8, 6.8); bld.translate(0, 1.9, 0); return bld;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 4.27, 7.60);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 4.5, 8.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Neighborhood civic voting hall and ward station (16.0x12.0m, 6.0m high)
 */
export function civicMidPollingStationHall(seed = "civic-mid-polling-station-hall-0") {
  return {
    id: "civic-mid-polling-station-hall",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 16.0, d: 12.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(14, 5.0, 10); hall.translate(0, 2.5, 0); return hall;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 5.70, 11.40);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 6.0, 12.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Civil defense tornado and tsunami alert warning siren tower (4.0x4.0m, 14.0m high)
 */
export function civicMidEmergencySirenPole(seed = "civic-mid-emergency-siren-pole-0") {
  return {
    id: "civic-mid-emergency-siren-pole",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.2, 0.3, 12.5, 8); pole.translate(0, 6.25, 0);
         const siren = new T.CylinderGeometry(1.2, 1.2, 1.2, 8); siren.translate(0, 13.0, 0);
         return mergeGeometries([pole, siren], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 13.30, 3.80);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 14.0, 4.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Fenced automated surface meteorological weather station (8.0x8.0m, 5.0m high)
 */
export function civicMidWeatherStationEnclosure(seed = "civic-mid-weather-station-enclosure-0") {
  return {
    id: "civic-mid-weather-station-enclosure",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 8.0, d: 8.0 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(6.8, 1.8, 6.8); fence.translate(0, 0.9, 0);
         const mast = new T.CylinderGeometry(0.1, 0.1, 4.5, 6); mast.translate(0, 2.25, 0);
         return mergeGeometries([fence, mast], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 4.75, 7.60);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 5.0, 8.0);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Classical granite family cemetery mausoleum vault (12.0x8.0m, 5.0m high)
 */
export function civicMidCemeteryMausoleumVault(seed = "civic-mid-cemetery-mausoleum-vault-0") {
  return {
    id: "civic-mid-cemetery-mausoleum-vault",
    tier: "mid",
    category: "civic",
    kind: "hard",
    footprint: { w: 12.0, d: 8.0 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const vault = new T.BoxGeometry(10, 4.2, 6.8); vault.translate(0, 2.1, 0); return vault;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 4.75, 7.60);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 5.0, 8.0);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Wooden trailhead map and park information bulletin kiosk (4.0x4.0m, 3.2m high)
 */
export function civicMidlowParkInformationKiosk(seed = "civic-midlow-park-information-kiosk-0") {
  return {
    id: "civic-midlow-park-information-kiosk",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const post1 = new T.BoxGeometry(0.2, 2.8, 0.2); post1.translate(-1.2, 1.4, 0);
         const post2 = new T.BoxGeometry(0.2, 2.8, 0.2); post2.translate(1.2, 1.4, 0);
         const board = new T.BoxGeometry(2.4, 1.4, 0.15); board.translate(0, 1.8, 0);
         const roof = new T.BoxGeometry(2.8, 0.3, 1.2); roof.translate(0, 2.9, 0);
         return mergeGeometries([post1, post2, board, roof], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 3.04, 3.80);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 3.2, 4.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Public municipal recycling and donation drop-off collection banks (4.0x4.0m, 2.2m high)
 */
export function civicMidlowRecyclingDropoffBin(seed = "civic-midlow-recycling-dropoff-bin-0") {
  return {
    id: "civic-midlow-recycling-dropoff-bin",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const bin1 = new T.BoxGeometry(1.2, 1.8, 1.2); bin1.translate(-1.0, 0.9, 0);
         const bin2 = new T.BoxGeometry(1.2, 1.8, 1.2); bin2.translate(1.0, 0.9, 0);
         return mergeGeometries([bin1, bin2], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 2.09, 3.80);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 2.2, 4.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Signalized intersection traffic light control cabinet (2.0x2.0m, 2.2m high)
 */
export function civicMidlowTrafficControlBox(seed = "civic-midlow-traffic-control-box-0") {
  return {
    id: "civic-midlow-traffic-control-box",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 2.0, d: 2.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(0.8, 1.6, 0.8); box.translate(0, 0.8, 0);
         const base = new T.BoxGeometry(1.0, 0.4, 1.0); base.translate(0, 0.2, 0);
         return mergeGeometries([box, base], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 2.09, 1.90);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 2.2, 2.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Folding civic election voter registration booth (3.0x3.0m, 2.4m high)
 */
export function civicMidlowTemporaryPollingBooth(seed = "civic-midlow-temporary-polling-booth-0") {
  return {
    id: "civic-midlow-temporary-polling-booth",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 3.0, d: 3.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const booth = new T.BoxGeometry(2.2, 2.1, 2.2); booth.translate(0, 1.05, 0); return booth;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 2.28, 2.85);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 2.4, 3.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: High-pressure municipal cast iron fire hydrant (1.5x1.5m, 1.1m high)
 */
export function civicMidlowFireHydrantAssembly(seed = "civic-midlow-fire-hydrant-assembly-0") {
  return {
    id: "civic-midlow-fire-hydrant-assembly",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 1.5, d: 1.5 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 26,
        createGeometry: (T = THREE) => {
          const body = new T.CylinderGeometry(0.18, 0.22, 0.8, 8); body.translate(0, 0.4, 0);
         const cap = new T.SphereGeometry(0.2, 8, 6); cap.translate(0, 0.85, 0);
         const valve = new T.CylinderGeometry(0.08, 0.08, 0.6, 6); valve.rotateZ(Math.PI/2); valve.translate(0, 0.55, 0);
         return mergeGeometries([body, cap, valve], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 1.04, 1.42);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 1.1, 1.5);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Winter road salt and grit roadside storage hopper (1.8x1.4m, 1.1m high)
 */
export function civicMidlowStreetGritBin(seed = "civic-midlow-street-grit-bin-0") {
  return {
    id: "civic-midlow-street-grit-bin",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 1.8, d: 1.4 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const bin = new T.BoxGeometry(1.4, 0.85, 1.0); bin.translate(0, 0.425, 0); return bin;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.04, 1.33);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.1, 1.4);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Waterfront emergency rescue lifebuoy ring on post (1.4x0.8m, 2.2m high)
 */
export function civicMidlowPublicLifebuoyStation(seed = "civic-midlow-public-lifebuoy-station-0") {
  return {
    id: "civic-midlow-public-lifebuoy-station",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 1.4, d: 0.8 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const post = new T.BoxGeometry(0.12, 1.9, 0.12); post.translate(0, 0.95, 0);
         const ring = new T.TorusGeometry(0.4, 0.1, 8, 12); ring.translate(0, 1.4, 0.1);
         return mergeGeometries([post, ring], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 2.09, 0.76);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 2.2, 0.8);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Public access automated external defibrillator (AED) enclosure (1.2x0.8m, 1.8m high)
 */
export function civicMidlowDefibrillatorAedKiosk(seed = "civic-midlow-defibrillator-aed-kiosk-0") {
  return {
    id: "civic-midlow-defibrillator-aed-kiosk",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 1.2, d: 0.8 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const post = new T.BoxGeometry(0.12, 1.6, 0.12); post.translate(0, 0.8, 0);
         const box = new T.BoxGeometry(0.5, 0.6, 0.35); box.translate(0, 1.2, 0.15);
         return mergeGeometries([post, box], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.71, 0.76);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.8, 0.8);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Municipal park regulations and bylaws signage post (1.0x0.6m, 2.2m high)
 */
export function civicMidlowParkRulesSignpost(seed = "civic-midlow-park-rules-signpost-0") {
  return {
    id: "civic-midlow-park-rules-signpost",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 1.0, d: 0.6 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const post = new T.BoxGeometry(0.1, 1.9, 0.1); post.translate(0, 0.95, 0);
         const plate = new T.BoxGeometry(0.7, 0.5, 0.05); plate.translate(0, 1.6, 0.05);
         return mergeGeometries([post, plate], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 2.09, 0.57);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 2.2, 0.6);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Concrete geodetic survey reference benchmark monument (1.2x1.2m, 1.2m high)
 */
export function civicMidlowSurveyBenchmarkMonument(seed = "civic-midlow-survey-benchmark-monument-0") {
  return {
    id: "civic-midlow-survey-benchmark-monument",
    tier: "midlow",
    category: "civic",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const block = new T.BoxGeometry(0.6, 0.8, 0.6); block.translate(0, 0.4, 0);
         const pin = new T.CylinderGeometry(0.04, 0.04, 0.2, 6); pin.translate(0, 0.9, 0);
         return mergeGeometries([block, pin], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.14, 1.14);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.2, 1.2);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Calatrava-inspired harp cable-stayed monumental suspension bridge (24.0x96.0m, 68.0m high)
 */
export function bridgeShowstopperCalatravaHarpPylon(seed = "bridge-showstopper-calatrava-harp-pylon-0") {
  return {
    id: "bridge-showstopper-calatrava-harp-pylon",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 96.0 },
    height: 68.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 560,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(16, 2.5, 94); deck.translate(0, 8, 0);
         const pylon = new T.CylinderGeometry(1.6, 3.2, 64, 12); pylon.rotateX(0.25); pylon.translate(0, 32, -36);
         const stay1 = new T.CylinderGeometry(0.12, 0.12, 54, 6); stay1.rotateX(-0.55); stay1.translate(0, 32, 0);
         const stay2 = new T.CylinderGeometry(0.12, 0.12, 68, 6); stay2.rotateX(-0.72); stay2.translate(0, 32, 20);
         return mergeGeometries([deck, pylon, stay1, stay2], T);
        },
      },
      {
        level: 1,
        tris: 68,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 64.60, 91.20);
          b.translate(0, 32.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 68.0, 96.0);
          b.translate(0, 34.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Iconic Sundial Cantilever Footbridge with tilted white steel gnomon (16.0x80.0m, 52.0m high)
 */
export function bridgeShowstopperCalatravaSundialFootbridge(seed = "bridge-showstopper-calatrava-sundial-footbridge-0") {
  return {
    id: "bridge-showstopper-calatrava-sundial-footbridge",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 80.0 },
    height: 52.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(6, 1.8, 78); deck.translate(0, 5, 0);
         const gnomon = new T.CylinderGeometry(0.8, 1.8, 48, 10); gnomon.rotateX(0.35); gnomon.translate(0, 24, -30);
         const c1 = new T.CylinderGeometry(0.08, 0.08, 42, 6); c1.rotateX(-0.5); c1.translate(0, 22, -6);
         const c2 = new T.CylinderGeometry(0.08, 0.08, 56, 6); c2.rotateX(-0.68); c2.translate(0, 22, 16);
         return mergeGeometries([deck, gnomon, c1, c2], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 49.40, 76.00);
          b.translate(0, 24.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 52.0, 80.0);
          b.translate(0, 26.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Calatrava-inspired twin dynamic steel rib-arch throughway viaduct (24.0x96.0m, 49.5m high)
 */
export function bridgeShowstopperCalatravaRibArch(seed = "bridge-showstopper-calatrava-rib-arch-0") {
  return {
    id: "bridge-showstopper-calatrava-rib-arch",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 96.0 },
    height: 49.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(18, 2.0, 94); deck.translate(0, 6, 0);
         const archL = new T.TorusGeometry(42, 1.4, 8, 24, Math.PI); archL.rotateY(Math.PI/2); archL.translate(-8, 6, 0);
         const archR = new T.TorusGeometry(42, 1.4, 8, 24, Math.PI); archR.rotateY(Math.PI/2); archR.translate(8, 6, 0);
         return mergeGeometries([deck, archL, archR], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 47.02, 91.20);
          b.translate(0, 23.51, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 49.5, 96.0);
          b.translate(0, 24.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Calatrava Twin-Mast Grand Gateway Viaduct with counterweighted cable fans (32.0x128.0m, 72.0m high)
 */
export function bridgeShowstopperCalatravaTwinMastViaduct(seed = "bridge-showstopper-calatrava-twin-mast-viaduct-0") {
  return {
    id: "bridge-showstopper-calatrava-twin-mast-viaduct",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 32.0, d: 128.0 },
    height: 72.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(24, 3.0, 124); deck.translate(0, 10, 0);
         const m1 = new T.CylinderGeometry(1.8, 3.5, 68, 12); m1.rotateX(0.18); m1.translate(0, 36, -34);
         const m2 = new T.CylinderGeometry(1.8, 3.5, 68, 12); m2.rotateX(-0.18); m2.translate(0, 36, 34);
         return mergeGeometries([deck, m1, m2], T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 68.40, 121.60);
          b.translate(0, 34.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 72.0, 128.0);
          b.translate(0, 36.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Calatrava-style aerodynamic rotating winged pedestrian swing bridge (24.0x80.0m, 48.0m high)
 */
export function bridgeShowstopperCalatravaWingedSwingBridge(seed = "bridge-showstopper-calatrava-winged-swing-bridge-0") {
  return {
    id: "bridge-showstopper-calatrava-winged-swing-bridge",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 80.0 },
    height: 48.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const pivot = new T.CylinderGeometry(4, 5, 8, 16); pivot.translate(0, 4, 0);
         const deck = new T.BoxGeometry(14, 2.0, 76); deck.translate(0, 6, 0);
         const wing = new T.BoxGeometry(2, 38, 12); wing.rotateX(0.2); wing.translate(0, 24, 0);
         return mergeGeometries([pivot, deck, wing], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 45.60, 76.00);
          b.translate(0, 22.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 48.0, 80.0);
          b.translate(0, 24.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Calatrava skeletal-vertebrate covered transit interchange overpass (24.0x64.0m, 22.0m high)
 */
export function bridgeShowstopperCalatravaSkeletalSpineOverpass(seed = "bridge-showstopper-calatrava-skeletal-spine-overpass-0") {
  return {
    id: "bridge-showstopper-calatrava-skeletal-spine-overpass",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 64.0 },
    height: 22.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(16, 1.8, 62); deck.translate(0, 7, 0);
         const spine = new T.CylinderGeometry(1.2, 1.2, 60, 12); spine.rotateX(Math.PI/2); spine.translate(0, 14, 0);
         const rib1 = new T.TorusGeometry(8, 0.6, 6, 12, Math.PI); rib1.rotateX(Math.PI/2); rib1.translate(0, 7, -18);
         const rib2 = new T.TorusGeometry(8, 0.6, 6, 12, Math.PI); rib2.rotateX(Math.PI/2); rib2.translate(0, 7, 0);
         const rib3 = new T.TorusGeometry(8, 0.6, 6, 12, Math.PI); rib3.rotateX(Math.PI/2); rib3.translate(0, 7, 18);
         return mergeGeometries([deck, spine, rib1, rib2, rib3], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 20.90, 60.80);
          b.translate(0, 10.45, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 22.0, 64.0);
          b.translate(0, 11.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Multi-tier 3D helical highway interchange and elevated flyover complex (64.0x64.0m, 28.0m high)
 */
export function roadsShowstopperHelixInterchangeFlyover(seed = "roads-showstopper-helix-interchange-flyover-0") {
  return {
    id: "roads-showstopper-helix-interchange-flyover",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 64.0, d: 64.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const deck1 = new T.BoxGeometry(12, 2.0, 62); deck1.translate(0, 6, 0);
         const deck2 = new T.BoxGeometry(62, 2.0, 12); deck2.translate(0, 14, 0);
         const flyover = new T.TorusGeometry(24, 4.0, 8, 20, Math.PI * 1.5);
         flyover.rotateX(Math.PI/2); flyover.translate(0, 20, 0);
         return mergeGeometries([deck1, deck2, flyover], T);
        },
      },
      {
        level: 1,
        tris: 66,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 26.60, 60.80);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 28.0, 64.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Grand Metropolitan Rotunda Plaza with monumental ring colonnade (64.0x64.0m, 16.0m high)
 */
export function roadsShowstopperGrandRotundaPlaza(seed = "roads-showstopper-grand-rotunda-plaza-0") {
  return {
    id: "roads-showstopper-grand-rotunda-plaza",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 64.0, d: 64.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const plaza = new T.CylinderGeometry(30, 31, 1.5, 24); plaza.translate(0, 0.75, 0);
         const fountain = new T.CylinderGeometry(10, 12, 4.0, 16); fountain.translate(0, 3.25, 0);
         const colonnade = new T.TorusGeometry(26, 1.2, 8, 24); colonnade.rotateX(Math.PI/2); colonnade.translate(0, 8, 0);
         return mergeGeometries([plaza, fountain, colonnade], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 15.20, 60.80);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 16.0, 64.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Biophilic sunken urban canal promenade with tree-lined pedestrian quays (48.0x64.0m, 12.0m high)
 */
export function roadsShowstopperSunkenCanalPromenade(seed = "roads-showstopper-sunken-canal-promenade-0") {
  return {
    id: "roads-showstopper-sunken-canal-promenade",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 48.0, d: 64.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const quayL = new T.BoxGeometry(14, 6, 62); quayL.translate(-16, 3, 0);
         const quayR = new T.BoxGeometry(14, 6, 62); quayR.translate(16, 3, 0);
         const canal = new T.BoxGeometry(18, 1, 62); canal.translate(0, 0.5, 0);
         const footbridge = new T.BoxGeometry(34, 1.5, 6); footbridge.translate(0, 7.5, 0);
         return mergeGeometries([quayL, quayR, canal, footbridge], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 11.40, 60.80);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 12.0, 64.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Elevated dual-tube vacuum transit hyperloop guideway viaduct (32.0x96.0m, 24.0m high)
 */
export function roadsShowstopperHyperloopTubeViaduct(seed = "roads-showstopper-hyperloop-tube-viaduct-0") {
  return {
    id: "roads-showstopper-hyperloop-tube-viaduct",
    tier: "showstopper",
    category: "roads",
    kind: "hard",
    footprint: { w: 32.0, d: 96.0 },
    height: 24.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const pier1 = new T.CylinderGeometry(1.5, 2.5, 12, 8); pier1.translate(0, 6, -32);
         const pier2 = new T.CylinderGeometry(1.5, 2.5, 12, 8); pier2.translate(0, 6, 32);
         const tube1 = new T.CylinderGeometry(3.5, 3.5, 94, 16); tube1.rotateX(Math.PI/2); tube1.translate(-6, 17, 0);
         const tube2 = new T.CylinderGeometry(3.5, 3.5, 94, 16); tube2.rotateX(Math.PI/2); tube2.translate(6, 17, 0);
         return mergeGeometries([pier1, pier2, tube1, tube2], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 22.80, 91.20);
          b.translate(0, 11.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 24.0, 96.0);
          b.translate(0, 12.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Elegant tubular steel bowstring tied-arch river bridge (16.0x64.0m, 31.7m high)
 */
export function bridgeLuxuryBowstringTiedArch(seed = "bridge-luxury-bowstring-tied-arch-0") {
  return {
    id: "bridge-luxury-bowstring-tied-arch",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 64.0 },
    height: 31.7,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 320,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(14, 1.6, 62); deck.translate(0, 4.5, 0);
         const arch = new T.TorusGeometry(26, 1.1, 8, 20, Math.PI); arch.rotateY(Math.PI / 2); arch.translate(0, 4.5, 0);
         return mergeGeometries([deck, arch], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 30.11, 60.80);
          b.translate(0, 15.06, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 31.7, 64.0);
          b.translate(0, 15.85, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Classical dressed ashlar limestone three-arch river viaduct (16.0x64.0m, 18.0m high)
 */
export function bridgeLuxuryStoneThreeArchViaduct(seed = "bridge-luxury-stone-three-arch-viaduct-0") {
  return {
    id: "bridge-luxury-stone-three-arch-viaduct",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 64.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(14, 2.2, 62); deck.translate(0, 13, 0);
         const p1 = new T.BoxGeometry(14, 12, 6); p1.translate(0, 6, -18);
         const p2 = new T.BoxGeometry(14, 12, 6); p2.translate(0, 6, 18);
         return mergeGeometries([deck, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 17.10, 60.80);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 18.0, 64.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Tree-lined grand avenue boulevard section with landscaped central median (24.0x64.0m, 6.0m high)
 */
export function roadsLuxuryGrandBoulevardMedian(seed = "roads-luxury-grand-boulevard-median-0") {
  return {
    id: "roads-luxury-grand-boulevard-median",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 64.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const lanes = new T.BoxGeometry(22, 0.4, 62); lanes.translate(0, 0.2, 0);
         const median = new T.BoxGeometry(4, 0.6, 62); median.translate(0, 0.5, 0);
         const trees = new T.BoxGeometry(2, 4.5, 60); trees.translate(0, 2.8, 0);
         return mergeGeometries([lanes, median, trees], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 5.70, 60.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 6.0, 64.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Hardwood timber seafront promenade boardwalk with marine pilings (16.0x64.0m, 6.0m high)
 */
export function roadsLuxuryPromenadeBoardwalkPier(seed = "roads-luxury-promenade-boardwalk-pier-0") {
  return {
    id: "roads-luxury-promenade-boardwalk-pier",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 64.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(14, 0.8, 62); deck.translate(0, 3.5, 0);
         const piles = new T.BoxGeometry(12, 3.2, 60); piles.translate(0, 1.6, 0);
         return mergeGeometries([deck, piles], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 5.70, 60.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 6.0, 64.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Granite patterned cobblestone pedestrian piazza with heritage plinth (32.0x32.0m, 4.0m high)
 */
export function roadsLuxuryCobblestoneHeritagePlaza(seed = "roads-luxury-cobblestone-heritage-plaza-0") {
  return {
    id: "roads-luxury-cobblestone-heritage-plaza",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 260,
        createGeometry: (T = THREE) => {
          const plaza = new T.BoxGeometry(30, 0.4, 30); plaza.translate(0, 0.2, 0);
         const monument = new T.CylinderGeometry(1.2, 2.0, 3.2, 8); monument.translate(0, 1.8, 0);
         return mergeGeometries([plaza, monument], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 3.80, 30.40);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 4.0, 32.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Extradosed twin-fin prestressed concrete bridge deck with low stay towers (24.0x80.0m, 28.0m high)
 */
export function bridgeLuxuryExtradosedTwinFin(seed = "bridge-luxury-extradosed-twin-fin-0") {
  return {
    id: "bridge-luxury-extradosed-twin-fin",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 80.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 330,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(18, 2.2, 78); deck.translate(0, 7, 0);
         const f1 = new T.BoxGeometry(1.2, 18, 12); f1.translate(-7, 16, 0);
         const f2 = new T.BoxGeometry(1.2, 18, 12); f2.translate(7, 16, 0);
         return mergeGeometries([deck, f1, f2], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 26.60, 76.00);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 28.0, 80.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Cantilevered panoramic mountain scenic overlook terrace with glass balustrade (32.0x24.0m, 8.0m high)
 */
export function roadsLuxuryScenicOverlookTerrace(seed = "roads-luxury-scenic-overlook-terrace-0") {
  return {
    id: "roads-luxury-scenic-overlook-terrace",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 32.0, d: 24.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(30, 3.5, 22); base.translate(0, 1.75, 0);
         const deck = new T.BoxGeometry(28, 0.6, 20); deck.translate(0, 3.8, 0);
         const rail = new T.BoxGeometry(28, 1.1, 0.3); rail.translate(0, 4.6, 9.8);
         return mergeGeometries([base, deck, rail], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 7.60, 22.80);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 8.0, 24.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Handcrafted Douglas fir covered bridge with timber lattice truss (12.0x48.0m, 12.3m high)
 */
export function bridgeLuxuryCoveredTimberTruss(seed = "bridge-luxury-covered-timber-truss-0") {
  return {
    id: "bridge-luxury-covered-timber-truss",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 12.0, d: 48.0 },
    height: 12.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(10, 1.2, 46); deck.translate(0, 3.5, 0);
         const sides = new T.BoxGeometry(10, 6.0, 46); sides.translate(0, 7.0, 0);
         const roof = new T.ConeGeometry(7, 2.5, 4); roof.rotateY(Math.PI/4); roof.scale(1, 1, 3.2); roof.translate(0, 11, 0);
         return mergeGeometries([deck, sides, roof], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 11.69, 45.60);
          b.translate(0, 5.84, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 12.3, 48.0);
          b.translate(0, 6.15, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Stepped travertine water cascade staircase with integrated fountain channels (16.0x32.0m, 10.0m high)
 */
export function roadsLuxurySteppedWaterCascadeStairs(seed = "roads-luxury-stepped-water-cascade-stairs-0") {
  return {
    id: "roads-luxury-stepped-water-cascade-stairs",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 32.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 275,
        createGeometry: (T = THREE) => {
          const s1 = new T.BoxGeometry(14, 2, 28); s1.translate(0, 1, 0);
         const s2 = new T.BoxGeometry(12, 2, 20); s2.translate(0, 3, -4);
         const s3 = new T.BoxGeometry(10, 2, 12); s3.translate(0, 5, -8);
         return mergeGeometries([s1, s2, s3], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 9.50, 30.40);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 10.0, 32.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Spiral tubular steel enclosed pedestrian skyway bridge (8.0x48.0m, 10.0m high)
 */
export function bridgeLuxuryTubularSteelPedestrianHelix(seed = "bridge-luxury-tubular-steel-pedestrian-helix-0") {
  return {
    id: "bridge-luxury-tubular-steel-pedestrian-helix",
    tier: "luxury",
    category: "roads",
    kind: "hard",
    footprint: { w: 8.0, d: 48.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(4.5, 0.8, 46); deck.translate(0, 4.5, 0);
         const tube = new T.TorusGeometry(3.5, 0.4, 8, 16); tube.rotateX(Math.PI/2); tube.translate(0, 5.0, 0);
         return mergeGeometries([deck, tube], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 9.50, 45.60);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 10.0, 48.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Modern continuous welded steel box girder highway bridge span (16.0x48.0m, 14.0m high)
 */
export function bridgeHighendSteelBoxGirderSpan(seed = "bridge-highend-steel-box-girder-span-0") {
  return {
    id: "bridge-highend-steel-box-girder-span",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 48.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(14, 1.8, 46); deck.translate(0, 7.5, 0);
         const pier = new T.BoxGeometry(4, 7.0, 8); pier.translate(0, 3.5, 0);
         return mergeGeometries([deck, pier], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 13.30, 45.60);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 14.0, 48.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Rigid concrete portal frame grade separation overpass (16.0x32.0m, 10.0m high)
 */
export function bridgeHighendConcretePortalOverpass(seed = "bridge-highend-concrete-portal-overpass-0") {
  return {
    id: "bridge-highend-concrete-portal-overpass",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 32.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(14, 1.4, 30); deck.translate(0, 6.5, 0);
         const legL = new T.BoxGeometry(1.8, 6.0, 28); legL.translate(-6.5, 3.0, 0);
         const legR = new T.BoxGeometry(1.8, 6.0, 28); legR.translate(6.5, 3.0, 0);
         return mergeGeometries([deck, legL, legR], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 9.50, 30.40);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 10.0, 32.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 4-Lane divided municipal arterial roadway section with concrete median barrier (24.0x48.0m, 4.0m high)
 */
export function roadsHighendMultiLaneDividedArterial(seed = "roads-highend-multi-lane-divided-arterial-0") {
  return {
    id: "roads-highend-multi-lane-divided-arterial",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 48.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(22, 0.4, 46); road.translate(0, 0.2, 0);
         const curb = new T.BoxGeometry(2, 0.5, 46); curb.translate(0, 0.45, 0);
         return mergeGeometries([road, curb], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 3.80, 45.60);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 4.0, 48.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Modern multilane circulatory roundabout with landscaped central hub (32.0x32.0m, 7.0m high)
 */
export function roadsHighendRoundaboutCirculatorIsland(seed = "roads-highend-roundabout-circulator-island-0") {
  return {
    id: "roads-highend-roundabout-circulator-island",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 7.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const ring = new T.TorusGeometry(12, 3.5, 8, 16); ring.rotateX(Math.PI/2); ring.translate(0, 0.3, 0);
         const island = new T.CylinderGeometry(8, 8, 1.2, 16); island.translate(0, 0.8, 0);
         const _m = mergeGeometries([ring, island], T);; _m.translate(0, 3.200, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 6.65, 30.40);
          b.translate(0, 3.32, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 7.0, 32.0);
          b.translate(0, 3.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Center-running Bus Rapid Transit (BRT) platform and passenger canopy (12.0x32.0m, 6.0m high)
 */
export function roadsHighendBusRapidTransitMedianStation(seed = "roads-highend-bus-rapid-transit-median-station-0") {
  return {
    id: "roads-highend-bus-rapid-transit-median-station",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 12.0, d: 32.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const platform = new T.BoxGeometry(4, 0.8, 28); platform.translate(0, 0.4, 0);
         const canopy = new T.BoxGeometry(6, 0.3, 26); canopy.translate(0, 4.0, 0);
         const p1 = new T.CylinderGeometry(0.1, 0.1, 3.5, 6); p1.translate(0, 2.0, -8);
         const p2 = new T.CylinderGeometry(0.1, 0.1, 3.5, 6); p2.translate(0, 2.0, 8);
         return mergeGeometries([platform, canopy, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 5.70, 30.40);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 6.0, 32.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Heavy steel through-truss rail bridge span for double-track railway (12.0x48.0m, 14.0m high)
 */
export function bridgeHighendThroughTrussRailwaySpan(seed = "bridge-highend-through-truss-railway-span-0") {
  return {
    id: "bridge-highend-through-truss-railway-span",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 12.0, d: 48.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(8, 1.5, 46); deck.translate(0, 5, 0);
         const trussL = new T.BoxGeometry(0.8, 7.5, 46); trussL.translate(-3.6, 9.5, 0);
         const trussR = new T.BoxGeometry(0.8, 7.5, 46); trussR.translate(3.6, 9.5, 0);
         return mergeGeometries([deck, trussL, trussR], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 13.30, 45.60);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 14.0, 48.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Reinforced concrete pedestrian underpass portal beneath main road (16.0x24.0m, 8.0m high)
 */
export function roadsHighendIlluminatedPedestrianUnderpass(seed = "roads-highend-illuminated-pedestrian-underpass-0") {
  return {
    id: "roads-highend-illuminated-pedestrian-underpass",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 24.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(14, 1.2, 22); road.translate(0, 6.5, 0);
         const tunnel = new T.BoxGeometry(10, 5.5, 22); tunnel.translate(0, 3.0, 0);
         return mergeGeometries([road, tunnel], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 7.60, 22.80);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 8.0, 24.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Urban street section with flush grooved embedded light-rail tram tracks (16.0x48.0m, 4.0m high)
 */
export function roadsHighendTramwayEmbeddedStreet(seed = "roads-highend-tramway-embedded-street-0") {
  return {
    id: "roads-highend-tramway-embedded-street",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 48.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 155,
        createGeometry: (T = THREE) => {
          const street = new T.BoxGeometry(14, 0.3, 46); street.translate(0, 0.15, 0);
         const trackL = new T.BoxGeometry(0.3, 0.1, 46); trackL.translate(-1.8, 0.35, 0);
         const trackR = new T.BoxGeometry(0.3, 0.1, 46); trackR.translate(1.8, 0.35, 0);
         return mergeGeometries([street, trackL, trackR], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 3.80, 45.60);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 4.0, 48.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Curved post-tensioned concrete freeway flyover connector ramp (24.0x48.0m, 16.0m high)
 */
export function roadsHighendCurvedFreewayFlyoverRamp(seed = "roads-highend-curved-freeway-flyover-ramp-0") {
  return {
    id: "roads-highend-curved-freeway-flyover-ramp",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 48.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(10, 1.6, 44); deck.rotateY(0.2); deck.translate(0, 9, 0);
         const pier = new T.CylinderGeometry(1.2, 1.5, 8.5, 8); pier.translate(0, 4.25, 0);
         return mergeGeometries([deck, pier], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 15.20, 45.60);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 16.0, 48.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: High-speed all-electronic highway tolling transponder gantry (24.0x8.0m, 10.0m high)
 */
export function roadsHighendHighwayElectronicTollingGantry(seed = "roads-highend-highway-electronic-tolling-gantry-0") {
  return {
    id: "roads-highend-highway-electronic-tolling-gantry",
    tier: "highend",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 8.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const postL = new T.BoxGeometry(0.8, 8.5, 0.8); postL.translate(-10, 4.25, 0);
         const postR = new T.BoxGeometry(0.8, 8.5, 0.8); postR.translate(10, 4.25, 0);
         const truss = new T.BoxGeometry(22, 1.4, 1.2); truss.translate(0, 8.2, 0);
         return mergeGeometries([postL, postR, truss], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 9.50, 7.60);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 10.0, 8.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Standard 2-lane municipal asphalt avenue with concrete curbs and sidewalks (16.0x32.0m, 2.0m high)
 */
export function roadsMidhighStandardAsphaltAvenue(seed = "roads-midhigh-standard-asphalt-avenue-0") {
  return {
    id: "roads-midhigh-standard-asphalt-avenue",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 32.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(14, 0.3, 30); road.translate(0, 0.15, 0);
         const walkL = new T.BoxGeometry(2, 0.4, 30); walkL.translate(-6.5, 0.2, 0);
         const walkR = new T.BoxGeometry(2, 0.4, 30); walkR.translate(6.5, 0.2, 0);
         return mergeGeometries([road, walkL, walkR], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 1.90, 30.40);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 2.0, 32.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Standard precast I-beam concrete bridge span with twin cylindrical piers (12.0x32.0m, 10.0m high)
 */
export function bridgeMidhighPrecastConcreteGirderSpan(seed = "bridge-midhigh-precast-concrete-girder-span-0") {
  return {
    id: "bridge-midhigh-precast-concrete-girder-span",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 12.0, d: 32.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(10, 1.2, 30); deck.translate(0, 6, 0);
         const col1 = new T.CylinderGeometry(0.8, 0.8, 5.5, 8); col1.translate(-3, 2.75, 0);
         const col2 = new T.CylinderGeometry(0.8, 0.8, 5.5, 8); col2.translate(3, 2.75, 0);
         return mergeGeometries([deck, col1, col2], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 9.50, 30.40);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 10.0, 32.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 3-Way T-Junction asphalt roadway intersection (24.0x24.0m, 2.0m high)
 */
export function roadsMidhighAsphaltIntersectionTJunction(seed = "roads-midhigh-asphalt-intersection-t-junction-0") {
  return {
    id: "roads-midhigh-asphalt-intersection-t-junction",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const main = new T.BoxGeometry(22, 0.3, 14); main.translate(0, 0.15, 0);
         const side = new T.BoxGeometry(14, 0.3, 10); side.translate(0, 0.15, 6);
         return mergeGeometries([main, side], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 1.90, 22.80);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 2.0, 24.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 4-Way crossroads intersection with mast-arm traffic signals (24.0x24.0m, 6.0m high)
 */
export function roadsMidhighSignalized4wayIntersection(seed = "roads-midhigh-signalized-4way-intersection-0") {
  return {
    id: "roads-midhigh-signalized-4way-intersection",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(22, 0.3, 22); road.translate(0, 0.15, 0);
         const p1 = new T.BoxGeometry(0.3, 4.5, 0.3); p1.translate(-9, 2.25, -9);
         const p2 = new T.BoxGeometry(0.3, 4.5, 0.3); p2.translate(9, 2.25, 9);
         return mergeGeometries([road, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 5.70, 22.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 6.0, 24.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Highway approach ramp with cast-in-place concrete retaining wall (16.0x32.0m, 8.0m high)
 */
export function roadsMidhighConcreteRetainingWallRamp(seed = "roads-midhigh-concrete-retaining-wall-ramp-0") {
  return {
    id: "roads-midhigh-concrete-retaining-wall-ramp",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 32.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const ramp = new T.BoxGeometry(12, 1.0, 30); ramp.rotateX(0.12); ramp.translate(0, 3.5, 0);
         const wall = new T.BoxGeometry(1.2, 5.5, 30); wall.translate(-6, 2.75, 0);
         return mergeGeometries([ramp, wall], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 7.60, 30.40);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 8.0, 32.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Zebra pedestrian crosswalk with tactile paving median refuge island (16.0x16.0m, 4.0m high)
 */
export function roadsMidhighPedestrianRefugeCrossing(seed = "roads-midhigh-pedestrian-refuge-crossing-0") {
  return {
    id: "roads-midhigh-pedestrian-refuge-crossing",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(14, 0.3, 14); road.translate(0, 0.15, 0);
         const island = new T.BoxGeometry(2.5, 0.5, 8); island.translate(0, 0.25, 0);
         const bollard1 = new T.CylinderGeometry(0.1, 0.1, 1.0, 6); bollard1.translate(0, 0.9, -3);
         const bollard2 = new T.CylinderGeometry(0.1, 0.1, 1.0, 6); bollard2.translate(0, 0.9, 3);
         return mergeGeometries([road, island, bollard1, bollard2], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 3.80, 15.20);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 4.0, 16.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Overhead green highway guide sign truss bridge (24.0x6.0m, 9.0m high)
 */
export function roadsMidhighHighwayOverpassSignBridge(seed = "roads-midhigh-highway-overpass-sign-bridge-0") {
  return {
    id: "roads-midhigh-highway-overpass-sign-bridge",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 6.0 },
    height: 9.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const legL = new T.BoxGeometry(0.6, 7.5, 0.6); legL.translate(-10, 3.75, 0);
         const legR = new T.BoxGeometry(0.6, 7.5, 0.6); legR.translate(10, 3.75, 0);
         const beam = new T.BoxGeometry(22, 1.0, 0.8); beam.translate(0, 7.2, 0);
         const sign = new T.BoxGeometry(14, 2.2, 0.2); sign.translate(0, 7.2, 0.5);
         return mergeGeometries([legL, legR, beam, sign], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 8.55, 5.70);
          b.translate(0, 4.27, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 9.0, 6.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Rustic timber bent trestle boardwalk footbridge (6.0x24.0m, 6.0m high)
 */
export function bridgeMidhighTimberTrestleFootbridge(seed = "bridge-midhigh-timber-trestle-footbridge-0") {
  return {
    id: "bridge-midhigh-timber-trestle-footbridge",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 6.0, d: 24.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(4.2, 0.4, 22); deck.translate(0, 3.2, 0);
         const bents = new T.BoxGeometry(3.8, 3.0, 20); bents.translate(0, 1.5, 0);
         const rails = new T.BoxGeometry(4.4, 0.9, 22); rails.translate(0, 3.8, 0);
         return mergeGeometries([deck, bents, rails], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 5.70, 22.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 6.0, 24.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Residential suburban cul-de-sac turnaround bulb (24.0x26.0m, 2.0m high)
 */
export function roadsMidhighCulDeSacTurningBulb(seed = "roads-midhigh-cul-de-sac-turning-bulb-0") {
  return {
    id: "roads-midhigh-cul-de-sac-turning-bulb",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 24.0, d: 26.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 85,
        createGeometry: (T = THREE) => {
          const bulb = new T.CylinderGeometry(10, 10, 0.3, 16); bulb.translate(0, 0.15, 2);
         const stem = new T.BoxGeometry(8, 0.3, 10); stem.translate(0, 0.15, -8);
         return mergeGeometries([bulb, stem], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 1.90, 24.70);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 2.0, 26.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Dedicated channelized right-turn slip lane with triangular island (16.0x24.0m, 2.0m high)
 */
export function roadsMidhighCurvedSlipLane(seed = "roads-midhigh-curved-slip-lane-0") {
  return {
    id: "roads-midhigh-curved-slip-lane",
    tier: "midhigh",
    category: "roads",
    kind: "hard",
    footprint: { w: 16.0, d: 24.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const lane = new T.BoxGeometry(6, 0.3, 22); lane.rotateY(0.3); lane.translate(0, 0.15, 0);
         const island = new T.BoxGeometry(4, 0.5, 12); island.translate(-4, 0.25, 0);
         return mergeGeometries([lane, island], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 1.90, 22.80);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 2.0, 24.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard residential two-way neighborhood street segment (12.0x24.0m, 1.5m high)
 */
export function roadsMidSuburbanResidentialStreet(seed = "roads-mid-suburban-residential-street-0") {
  return {
    id: "roads-mid-suburban-residential-street",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 12.0, d: 24.0 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 45,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(10, 0.25, 22); road.translate(0, 0.125, 0); return road;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 1.42, 22.80);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 1.5, 24.0);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Dual-cell precast concrete drainage box culvert road crossing (8.0x16.0m, 5.0m high)
 */
export function bridgeMidConcreteBoxCulvert(seed = "bridge-mid-concrete-box-culvert-0") {
  return {
    id: "bridge-mid-concrete-box-culvert",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 8.0, d: 16.0 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "roadway"],
    lod: [
      {
        level: 0,
        tris: 55,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(7, 0.8, 14); deck.translate(0, 4.0, 0);
         const walls = new T.BoxGeometry(6.5, 3.6, 14); walls.translate(0, 1.8, 0);
         return mergeGeometries([deck, walls], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 4.75, 15.20);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 5.0, 16.0);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Straight asphalt roadway dead-end termination (12.0x16.0m, 1.5m high)
 */
export function roadsMidAsphaltDeadEnd(seed = "roads-mid-asphalt-dead-end-0") {
  return {
    id: "roads-mid-asphalt-dead-end",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 12.0, d: 16.0 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 40,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(10, 0.25, 14); road.translate(0, 0.125, 0); return road;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 1.42, 15.20);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 1.5, 16.0);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Compacted unpaved crushed stone gravel utility road (8.0x24.0m, 1.2m high)
 */
export function roadsMidGravelAccessTrack(seed = "roads-mid-gravel-access-track-0") {
  return {
    id: "roads-mid-gravel-access-track",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 8.0, d: 24.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const track = new T.BoxGeometry(6.5, 0.2, 22); track.translate(0, 0.1, 0); return track;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 1.14, 22.80);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 1.2, 24.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Traffic calming asphalt speed table road hump segment (10.0x12.0m, 1.5m high)
 */
export function roadsMidSpeedHumpSegment(seed = "roads-mid-speed-hump-segment-0") {
  return {
    id: "roads-mid-speed-hump-segment",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 10.0, d: 12.0 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const road = new T.BoxGeometry(8.5, 0.25, 10); road.translate(0, 0.125, 0);
         const hump = new T.BoxGeometry(8.5, 0.15, 2.5); hump.translate(0, 0.32, 0);
         return mergeGeometries([road, hump], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 1.42, 11.40);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 1.5, 12.0);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Parallel street parking bay strip with marked parking stalls (8.0x24.0m, 1.2m high)
 */
export function roadsMidAsphaltParkingBayStrip(seed = "roads-mid-asphalt-parking-bay-strip-0") {
  return {
    id: "roads-mid-asphalt-parking-bay-strip",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 8.0, d: 24.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const bay = new T.BoxGeometry(6.8, 0.2, 22); bay.translate(0, 0.1, 0); return bay;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 1.14, 22.80);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 1.2, 24.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 90-Degree concrete sidewalk pedestrian street corner (8.0x8.0m, 1.2m high)
 */
export function roadsMidConcreteSidewalkCorner(seed = "roads-mid-concrete-sidewalk-corner-0") {
  return {
    id: "roads-mid-concrete-sidewalk-corner",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 8.0, d: 8.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const walk = new T.BoxGeometry(6.8, 0.25, 6.8); walk.translate(0, 0.125, 0); return walk;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 1.14, 7.60);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 1.2, 8.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Residential dropped curb apron driveway entrance (8.0x8.0m, 1.2m high)
 */
export function roadsMidDrivewayCurbCut(seed = "roads-mid-driveway-curb-cut-0") {
  return {
    id: "roads-mid-driveway-curb-cut",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 8.0, d: 8.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(6.8, 0.2, 6.8); base.translate(0, 0.1, 0);
         const apron = new T.BoxGeometry(4.5, 0.15, 3.5); apron.translate(0, 0.2, 1.5);
         return mergeGeometries([base, apron], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 1.14, 7.60);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 1.2, 8.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: W-Beam galvanized steel roadside highway crash guardrail (2.0x24.0m, 1.6m high)
 */
export function roadsMidGuardrailRoadsideBarrier(seed = "roads-mid-guardrail-roadside-barrier-0") {
  return {
    id: "roads-mid-guardrail-roadside-barrier",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 2.0, d: 24.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const rail = new T.BoxGeometry(0.2, 0.4, 22); rail.translate(0, 0.8, 0);
         const post1 = new T.BoxGeometry(0.15, 1.0, 0.15); post1.translate(0, 0.5, -8);
         const post2 = new T.BoxGeometry(0.15, 1.0, 0.15); post2.translate(0, 0.5, 8);
         return mergeGeometries([rail, post1, post2], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.52, 22.80);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.6, 24.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Narrow paved urban service alleyway passage (6.0x24.0m, 1.2m high)
 */
export function roadsMidAlleywayPavedPassage(seed = "roads-mid-alleyway-paved-passage-0") {
  return {
    id: "roads-mid-alleyway-paved-passage",
    tier: "mid",
    category: "roads",
    kind: "hard",
    footprint: { w: 6.0, d: 24.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 40,
        createGeometry: (T = THREE) => {
          const alley = new T.BoxGeometry(4.8, 0.2, 22); alley.translate(0, 0.1, 0); return alley;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 1.14, 22.80);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 1.2, 24.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Standard high-visibility orange road construction safety cone (0.6x0.6m, 0.9m high)
 */
export function roadsMidlowTrafficConeOrange(seed = "roads-midlow-traffic-cone-orange-0") {
  return {
    id: "roads-midlow-traffic-cone-orange",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(0.45, 0.05, 0.45); base.translate(0, 0.025, 0);
         const cone = new T.ConeGeometry(0.18, 0.75, 8); cone.translate(0, 0.42, 0);
         return mergeGeometries([base, cone], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.85, 0.57);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.9, 0.6);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Heavy precast concrete K-rail Jersey traffic barrier (1.0x3.0m, 1.1m high)
 */
export function roadsMidlowConcreteJerseyBarrier(seed = "roads-midlow-concrete-jersey-barrier-0") {
  return {
    id: "roads-midlow-concrete-jersey-barrier",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 1.0, d: 3.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const barrier = new T.BoxGeometry(0.65, 0.95, 2.8); barrier.translate(0, 0.475, 0); return barrier;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 1.04, 2.85);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 1.1, 3.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Interlocking red/white polyethylene water-filled road barricade (0.8x2.0m, 1.0m high)
 */
export function roadsMidlowPlasticWaterFilledBarricade(seed = "roads-midlow-plastic-water-filled-barricade-0") {
  return {
    id: "roads-midlow-plastic-water-filled-barricade",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 0.8, d: 2.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.55, 0.85, 1.8); b.translate(0, 0.425, 0); return b;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.95, 1.90);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.0, 2.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Portable diamond orange road work ahead warning sign (2.0x1.2m, 1.9m high)
 */
export function roadsMidlowRoadWorkAheadSign(seed = "roads-midlow-road-work-ahead-sign-0") {
  return {
    id: "roads-midlow-road-work-ahead-sign",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 2.0, d: 1.2 },
    height: 1.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const legs = new T.BoxGeometry(0.8, 1.4, 0.6); legs.translate(0, 0.7, 0);
         const diamond = new T.BoxGeometry(0.9, 0.9, 0.05); diamond.rotateZ(Math.PI/4); diamond.translate(0, 1.2, 0);
         return mergeGeometries([legs, diamond], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.80, 1.14);
          b.translate(0, 0.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.9, 1.2);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: High-intensity reflective flexible lane delineator post (0.4x0.4m, 1.1m high)
 */
export function roadsMidlowFlexibleDelineatorPost(seed = "roads-midlow-flexible-delineator-post-0") {
  return {
    id: "roads-midlow-flexible-delineator-post",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 0.4, d: 0.4 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(0.12, 0.12, 0.05, 6); base.translate(0, 0.025, 0);
         const post = new T.CylinderGeometry(0.05, 0.05, 0.95, 6); post.translate(0, 0.5, 0);
         return mergeGeometries([base, post], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.04, 0.38);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.1, 0.4);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Fresh black bitumen roadway pothole repair patch (2.0x2.0m, 0.1m high)
 */
export function roadsMidlowAsphaltPotholePatch(seed = "roads-midlow-asphalt-pothole-patch-0") {
  return {
    id: "roads-midlow-asphalt-pothole-patch",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 2.0, d: 2.0 },
    height: 0.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 16,
        createGeometry: (T = THREE) => {
          const patch = new T.BoxGeometry(1.6, 0.06, 1.6); patch.translate(0, 0.03, 0); return patch;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 0.10, 1.90);
          b.translate(0, 0.05, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 0.1, 2.0);
          b.translate(0, 0.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Circular ductile iron street sewer manhole cover and rim (1.2x1.2m, 0.15m high)
 */
export function roadsMidlowStormDrainManholeCover(seed = "roads-midlow-storm-drain-manhole-cover-0") {
  return {
    id: "roads-midlow-storm-drain-manhole-cover",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 0.15,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const rim = new T.CylinderGeometry(0.48, 0.48, 0.08, 8); rim.translate(0, 0.04, 0); return rim;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 0.14, 1.14);
          b.translate(0, 0.07, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 0.15, 1.2);
          b.translate(0, 0.075, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Molded rubber parking lot tire wheel stop curb (0.4x2.0m, 0.25m high)
 */
export function roadsMidlowWheelStopParkingCurb(seed = "roads-midlow-wheel-stop-parking-curb-0") {
  return {
    id: "roads-midlow-wheel-stop-parking-curb",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 0.4, d: 2.0 },
    height: 0.25,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const curb = new T.BoxGeometry(0.25, 0.14, 1.8); curb.translate(0, 0.07, 0); return curb;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 0.24, 1.90);
          b.translate(0, 0.12, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 0.25, 2.0);
          b.translate(0, 0.125, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Raised retroreflective roadway lane line cat-eye studs (0.3x4.0m, 0.1m high)
 */
export function roadsMidlowRoadMarkingCatEyesRow(seed = "roads-midlow-road-marking-cat-eyes-row-0") {
  return {
    id: "roads-midlow-road-marking-cat-eyes-row",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 0.3, d: 4.0 },
    height: 0.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const c1 = new T.BoxGeometry(0.12, 0.04, 0.12); c1.translate(0, 0.02, -1.5);
         const c2 = new T.BoxGeometry(0.12, 0.04, 0.12); c2.translate(0, 0.02, 1.5);
         return mergeGeometries([c1, c2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 0.10, 3.80);
          b.translate(0, 0.05, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 0.1, 4.0);
          b.translate(0, 0.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Standard roadside speed limit traffic regulation signpost (0.6x0.6m, 2.4m high)
 */
export function roadsMidlowSpeedLimitSignpost(seed = "roads-midlow-speed-limit-signpost-0") {
  return {
    id: "roads-midlow-speed-limit-signpost",
    tier: "midlow",
    category: "roads",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.04, 0.04, 2.1, 6); pole.translate(0, 1.05, 0);
         const sign = new T.BoxGeometry(0.5, 0.6, 0.04); sign.translate(0, 1.75, 0.04);
         return mergeGeometries([pole, sign], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 2.28, 0.57);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.4, 0.6);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 600 km/h aerodynamic streamlined superconducting Maglev train lead car (4.0x48.0m, 4.5m high)
 */
export function vehicleShowstopperMaglevBulletTrain(seed = "vehicle-showstopper-maglev-bullet-train-0") {
  return {
    id: "vehicle-showstopper-maglev-bullet-train",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 4.0, d: 48.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "roadway"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const nose = new T.ConeGeometry(1.8, 8.0, 12); nose.rotateX(Math.PI/2); nose.translate(0, 1.8, 20);
         const body = new T.CylinderGeometry(1.8, 1.8, 38, 12); body.rotateX(Math.PI/2); body.translate(0, 1.8, -3);
         const tail = new T.BoxGeometry(3.2, 3.2, 4); tail.translate(0, 1.8, -22);
         return mergeGeometries([nose, body, tail], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 4.27, 45.60);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 4.5, 48.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Carbon-fiber active aerodynamic Le Mans Hypercar prototype (2.4x5.2m, 1.4m high)
 */
export function vehicleShowstopperHypercarPrototype(seed = "vehicle-showstopper-hypercar-prototype-0") {
  return {
    id: "vehicle-showstopper-hypercar-prototype",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.4, d: 5.2 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const tub = new T.BoxGeometry(2.0, 0.55, 4.6); tub.translate(0, 0.45, 0);
         const canopy = new T.SphereGeometry(0.85, 12, 8); canopy.scale(1.0, 0.6, 1.8); canopy.translate(0, 0.85, -0.3);
         const wing = new T.BoxGeometry(2.1, 0.08, 0.45); wing.translate(0, 1.05, -2.1);
         return mergeGeometries([tub, canopy, wing], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 1.33, 4.94);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.4, 5.2);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Elevated 3D autonomous straddling transit bus allowing traffic to pass beneath (6.5x24.0m, 5.5m high)
 */
export function vehicleShowstopperAutonomousStraddlingBus(seed = "vehicle-showstopper-autonomous-straddling-bus-0") {
  return {
    id: "vehicle-showstopper-autonomous-straddling-bus",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 6.5, d: 24.0 },
    height: 5.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const cabin = new T.BoxGeometry(6.0, 1.8, 22); cabin.translate(0, 4.2, 0);
         const legL = new T.BoxGeometry(0.6, 3.8, 20); legL.translate(-2.7, 1.9, 0);
         const legR = new T.BoxGeometry(0.6, 3.8, 20); legR.translate(2.7, 1.9, 0);
         return mergeGeometries([cabin, legL, legR], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.17, 5.22, 22.80);
          b.translate(0, 2.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.5, 5.5, 24.0);
          b.translate(0, 2.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 400-ton ultra-class diesel-electric open-pit mining haul truck (9.0x16.0m, 8.5m high)
 */
export function vehicleShowstopperHeavyMiningDumpTruck(seed = "vehicle-showstopper-heavy-mining-dump-truck-0") {
  return {
    id: "vehicle-showstopper-heavy-mining-dump-truck",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 9.0, d: 16.0 },
    height: 8.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const chassis = new T.BoxGeometry(7.5, 2.5, 14); chassis.translate(0, 2.5, 0);
         const dump = new T.BoxGeometry(8.2, 3.8, 11); dump.translate(0, 5.8, -2);
         const cab = new T.BoxGeometry(3.0, 2.5, 3.5); cab.translate(-2.2, 6.0, 4.5);
         return mergeGeometries([chassis, dump, cab], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.55, 8.07, 15.20);
          b.translate(0, 4.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.0, 8.5, 16.0);
          b.translate(0, 4.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Low-floor 100% electric bi-directional dual-articulated urban tram (3.2x36.0m, 4.1m high)
 */
export function vehicleShowstopperDualArticulatedTram(seed = "vehicle-showstopper-dual-articulated-tram-0") {
  return {
    id: "vehicle-showstopper-dual-articulated-tram",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.2, d: 36.0 },
    height: 4.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 530,
        createGeometry: (T = THREE) => {
          const c1 = new T.BoxGeometry(2.8, 3.2, 10.5); c1.translate(0, 1.8, -12);
         const c2 = new T.BoxGeometry(2.8, 3.2, 10.5); c2.translate(0, 1.8, 0);
         const c3 = new T.BoxGeometry(2.8, 3.2, 10.5); c3.translate(0, 1.8, 12);
         const panto = new T.BoxGeometry(1.2, 0.8, 1.8); panto.translate(0, 3.7, 0);
         return mergeGeometries([c1, c2, c3, panto], T);
        },
      },
      {
        level: 1,
        tris: 66,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.04, 3.89, 34.20);
          b.translate(0, 1.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 4.1, 36.0);
          b.translate(0, 2.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Heavy telescopic quint aerial turntable ladder platform fire truck (3.2x14.0m, 4.6m high)
 */
export function vehicleShowstopperAerialLadderFireTruck(seed = "vehicle-showstopper-aerial-ladder-fire-truck-0") {
  return {
    id: "vehicle-showstopper-aerial-ladder-fire-truck",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.2, d: 14.0 },
    height: 4.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.8, 2.8, 12.5); cab.translate(0, 1.6, 0);
         const ladder = new T.BoxGeometry(1.6, 0.6, 11); ladder.rotateX(0.15); ladder.translate(0, 3.4, -1);
         return mergeGeometries([cab, ladder], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.04, 4.37, 13.30);
          b.translate(0, 2.18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 4.6, 14.0);
          b.translate(0, 2.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Multi-axle heavy orbital rocket payload transporter & erector crawler (12.0x36.0m, 9.0m high)
 */
export function vehicleShowstopperMobileRocketTransporter(seed = "vehicle-showstopper-mobile-rocket-transporter-0") {
  return {
    id: "vehicle-showstopper-mobile-rocket-transporter",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 12.0, d: 36.0 },
    height: 9.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(11, 2.5, 34); deck.translate(0, 2.2, 0);
         const cradle = new T.CylinderGeometry(4.5, 4.5, 28, 12, 1, true, 0, Math.PI);
         cradle.rotateX(Math.PI/2); cradle.translate(0, 4.5, 0);
         return mergeGeometries([deck, cradle], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 8.55, 34.20);
          b.translate(0, 4.27, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 9.0, 36.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 8x8 Extreme climate amphibious polar expedition exploration vehicle (3.8x10.0m, 3.8m high)
 */
export function vehicleShowstopperAmphibiousAllTerrainExpedition(seed = "vehicle-showstopper-amphibious-all-terrain-expedition-0") {
  return {
    id: "vehicle-showstopper-amphibious-all-terrain-expedition",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.8, d: 10.0 },
    height: 3.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(3.4, 1.8, 9.2); hull.translate(0, 1.6, 0);
         const tracks = new T.BoxGeometry(3.6, 0.9, 8.8); tracks.translate(0, 0.55, 0);
         const snorkel = new T.CylinderGeometry(0.12, 0.12, 1.5, 6); snorkel.translate(1.4, 3.0, 2.5);
         return mergeGeometries([hull, tracks, snorkel], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.61, 3.61, 9.50);
          b.translate(0, 1.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.8, 3.8, 10.0);
          b.translate(0, 1.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: VIP Tri-axle touring motorcoach with panoramic salon roof (3.2x16.0m, 4.2m high)
 */
export function vehicleShowstopperLuxurySleeperCoach(seed = "vehicle-showstopper-luxury-sleeper-coach-0") {
  return {
    id: "vehicle-showstopper-luxury-sleeper-coach",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.2, d: 16.0 },
    height: 4.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.8, 3.4, 14.8); body.translate(0, 2.0, 0);
         const ac = new T.BoxGeometry(2.2, 0.4, 6.0); ac.translate(0, 3.9, -2);
         return mergeGeometries([body, ac], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.04, 3.99, 15.20);
          b.translate(0, 1.99, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 4.2, 16.0);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Heavy airport dual-engine rotary turbine snowblower clearing vehicle (3.6x13.0m, 4.5m high)
 */
export function vehicleShowstopperHeavyRotarySnowplow(seed = "vehicle-showstopper-heavy-rotary-snowplow-0") {
  return {
    id: "vehicle-showstopper-heavy-rotary-snowplow",
    tier: "showstopper",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.6, d: 13.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const truck = new T.BoxGeometry(3.0, 3.0, 9.0); truck.translate(0, 1.8, -1.0);
         const blower = new T.CylinderGeometry(1.6, 1.6, 3.2, 12); blower.rotateZ(Math.PI/2); blower.translate(0, 1.8, 4.8);
         const chute = new T.CylinderGeometry(0.3, 0.4, 1.6, 8); chute.translate(0, 3.6, 4.5);
         return mergeGeometries([truck, blower, chute], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.42, 4.27, 12.35);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.6, 4.5, 13.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: High-performance handcrafted V12 grand tourer coupe (2.2x5.0m, 1.4m high)
 */
export function vehicleLuxuryGrandTourerCoupe(seed = "vehicle-luxury-grand-tourer-coupe-0") {
  return {
    id: "vehicle-luxury-grand-tourer-coupe",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 5.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.9, 0.65, 4.6); body.translate(0, 0.5, 0);
         const cabin = new T.BoxGeometry(1.5, 0.55, 2.2); cabin.translate(0, 1.05, -0.4);
         return mergeGeometries([body, cabin], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.33, 4.75);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.4, 5.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Extended wheelbase executive chauffeur limousine with privacy partition (2.2x6.8m, 1.6m high)
 */
export function vehicleLuxuryChauffeurLimousine(seed = "vehicle-luxury-chauffeur-limousine-0") {
  return {
    id: "vehicle-luxury-chauffeur-limousine",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 6.8 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 320,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.95, 0.75, 6.4); body.translate(0, 0.55, 0);
         const cabin = new T.BoxGeometry(1.65, 0.65, 4.2); cabin.translate(0, 1.2, -0.6);
         return mergeGeometries([body, cabin], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.52, 6.46);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.6, 6.8);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Full-size luxury all-wheel-drive flagship SUV (2.4x5.4m, 1.9m high)
 */
export function vehicleLuxuryFullsizePrestigeSuv(seed = "vehicle-luxury-fullsize-prestige-suv-0") {
  return {
    id: "vehicle-luxury-fullsize-prestige-suv",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.4, d: 5.4 },
    height: 1.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const lower = new T.BoxGeometry(2.1, 0.9, 5.0); lower.translate(0, 0.65, 0);
         const upper = new T.BoxGeometry(1.85, 0.85, 3.4); upper.translate(0, 1.45, -0.5);
         return mergeGeometries([lower, upper], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 1.80, 5.13);
          b.translate(0, 0.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.9, 5.4);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Mid-engine open-top roadster supercar with active diffuser (2.2x4.8m, 1.25m high)
 */
export function vehicleLuxurySupercarSpider(seed = "vehicle-luxury-supercar-spider-0") {
  return {
    id: "vehicle-luxury-supercar-spider",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 4.8 },
    height: 1.25,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(1.95, 0.55, 4.4); base.translate(0, 0.42, 0);
         const roll = new T.BoxGeometry(1.4, 0.45, 0.8); roll.translate(0, 0.85, -0.4);
         return mergeGeometries([base, roll], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.19, 4.56);
          b.translate(0, 0.59, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.25, 4.8);
          b.translate(0, 0.625, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Ballistic VR7-certified discreet armored executive convoy vehicle (2.6x6.2m, 2.2m high)
 */
export function vehicleLuxuryArmoredSecurityTransport(seed = "vehicle-luxury-armored-security-transport-0") {
  return {
    id: "vehicle-luxury-armored-security-transport",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.6, d: 6.2 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(2.3, 1.4, 5.8); hull.translate(0, 0.95, 0);
         const turret = new T.CylinderGeometry(0.7, 0.7, 0.45, 8); turret.translate(0, 1.8, 0);
         return mergeGeometries([hull, turret], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 2.09, 5.89);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 2.2, 6.2);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 1930s style classic collector roadster with chrome radiator grille (2.0x5.0m, 1.35m high)
 */
export function vehicleLuxuryClassicVintageRoadster(seed = "vehicle-luxury-classic-vintage-roadster-0") {
  return {
    id: "vehicle-luxury-classic-vintage-roadster",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.0, d: 5.0 },
    height: 1.35,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.7, 0.6, 4.4); body.translate(0, 0.45, 0);
         const grille = new T.CylinderGeometry(0.4, 0.4, 0.6, 8); grille.rotateX(Math.PI/2); grille.translate(0, 0.6, 2.1);
         return mergeGeometries([body, grille], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.28, 4.75);
          b.translate(0, 0.64, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.35, 5.0);
          b.translate(0, 0.675, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Custom leather VIP mobile office high-roof executive transporter (2.4x6.4m, 2.8m high)
 */
export function vehicleLuxuryExecutiveSprinterVan(seed = "vehicle-luxury-executive-sprinter-van-0") {
  return {
    id: "vehicle-luxury-executive-sprinter-van",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.4, d: 6.4 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 295,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.1, 2.1, 5.8); body.translate(0, 1.35, 0);
         const roof = new T.BoxGeometry(1.8, 0.3, 4.5); roof.translate(0, 2.5, -0.4);
         return mergeGeometries([body, roof], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 2.66, 6.08);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 2.8, 6.4);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Tri-motor 1000hp flagship electric grand saloon with glass canopy (2.2x5.2m, 1.45m high)
 */
export function vehicleLuxuryElectricHyperSedan(seed = "vehicle-luxury-electric-hyper-sedan-0") {
  return {
    id: "vehicle-luxury-electric-hyper-sedan",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 5.2 },
    height: 1.45,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 305,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(1.95, 0.6, 4.8); base.translate(0, 0.45, 0);
         const glass = new T.BoxGeometry(1.6, 0.6, 2.8); glass.translate(0, 1.05, -0.2);
         return mergeGeometries([base, glass], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.38, 4.94);
          b.translate(0, 0.69, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.45, 5.2);
          b.translate(0, 0.725, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Heavyweight cross-country touring motorcycle with aerodynamic sidecar (2.2x2.8m, 1.5m high)
 */
export function vehicleLuxuryTouringMotorcycleSidecar(seed = "vehicle-luxury-touring-motorcycle-sidecar-0") {
  return {
    id: "vehicle-luxury-touring-motorcycle-sidecar",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 2.8 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const bike = new T.BoxGeometry(0.8, 1.1, 2.4); bike.translate(-0.5, 0.65, 0);
         const pod = new T.BoxGeometry(0.7, 0.7, 1.8); pod.translate(0.6, 0.45, 0);
         return mergeGeometries([bike, pod], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.42, 2.66);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.5, 2.8);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Gilded ceremonial royal Landau carriage with velvet upholstered cabin (2.4x4.8m, 2.6m high)
 */
export function vehicleLuxuryHorseDrawnRoyalCarriage(seed = "vehicle-luxury-horse-drawn-royal-carriage-0") {
  return {
    id: "vehicle-luxury-horse-drawn-royal-carriage",
    tier: "luxury",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.4, d: 4.8 },
    height: 2.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const cabin = new T.BoxGeometry(1.8, 1.5, 2.4); cabin.translate(0, 1.5, 0);
         const w1 = new T.CylinderGeometry(0.6, 0.6, 0.1, 8); w1.rotateZ(Math.PI/2); w1.translate(-1.0, 0.6, -1.0);
         const w2 = new T.CylinderGeometry(0.6, 0.6, 0.1, 8); w2.rotateZ(Math.PI/2); w2.translate(1.0, 0.6, -1.0);
         return mergeGeometries([cabin, w1, w2], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 2.47, 4.56);
          b.translate(0, 1.23, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 2.6, 4.8);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 12-Meter zero-emission zero-floor electric urban transit bus (2.8x12.0m, 3.4m high)
 */
export function vehicleHighendCityTransitElectricBus(seed = "vehicle-highend-city-transit-electric-bus-0") {
  return {
    id: "vehicle-highend-city-transit-electric-bus",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.8, d: 12.0 },
    height: 3.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.5, 2.6, 11.2); body.translate(0, 1.55, 0);
         const bat = new T.BoxGeometry(2.1, 0.4, 6.0); bat.translate(0, 3.0, 0);
         return mergeGeometries([body, bat], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.66, 3.23, 11.40);
          b.translate(0, 1.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 3.4, 12.0);
          b.translate(0, 1.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Type III Heavy-duty ambulance and mobile intensive care unit (2.6x6.8m, 3.0m high)
 */
export function vehicleHighendParamedicMobileIcu(seed = "vehicle-highend-paramedic-mobile-icu-0") {
  return {
    id: "vehicle-highend-paramedic-mobile-icu",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.6, d: 6.8 },
    height: 3.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.2, 1.8, 2.4); cab.translate(0, 1.2, 1.8);
         const box = new T.BoxGeometry(2.4, 2.1, 4.0); box.translate(0, 1.45, -1.2);
         return mergeGeometries([cab, box], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 2.85, 6.46);
          b.translate(0, 1.42, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 3.0, 6.8);
          b.translate(0, 1.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Highway patrol police pursuit interceptor with LED lightbar (2.2x5.2m, 1.7m high)
 */
export function vehicleHighendPoliceInterceptorCruiser(seed = "vehicle-highend-police-interceptor-cruiser-0") {
  return {
    id: "vehicle-highend-police-interceptor-cruiser",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 5.2 },
    height: 1.7,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.95, 0.7, 4.8); body.translate(0, 0.55, 0);
         const cabin = new T.BoxGeometry(1.65, 0.65, 2.6); cabin.translate(0, 1.2, -0.2);
         const bar = new T.BoxGeometry(1.2, 0.12, 0.3); bar.translate(0, 1.58, -0.2);
         return mergeGeometries([body, cabin, bar], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.61, 4.94);
          b.translate(0, 0.81, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.7, 5.2);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Aerodynamic long-haul Class 8 sleeper tractor unit (2.8x8.0m, 4.0m high)
 */
export function vehicleHighendSemiTruckSleeperCab(seed = "vehicle-highend-semi-truck-sleeper-cab-0") {
  return {
    id: "vehicle-highend-semi-truck-sleeper-cab",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.8, d: 8.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 200,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(2.4, 1.0, 7.4); frame.translate(0, 0.75, 0);
         const cab = new T.BoxGeometry(2.4, 2.6, 4.5); cab.translate(0, 2.4, 1.0);
         const fairing = new T.BoxGeometry(2.3, 0.7, 3.5); fairing.translate(0, 3.65, 1.2);
         return mergeGeometries([frame, cab, fairing], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.66, 3.80, 7.60);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 4.0, 8.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 35-Ton hydraulic crawler excavator with heavy digging boom (3.8x11.0m, 5.2m high)
 */
export function vehicleHighendTrackedHeavyExcavator(seed = "vehicle-highend-tracked-heavy-excavator-0") {
  return {
    id: "vehicle-highend-tracked-heavy-excavator",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.8, d: 11.0 },
    height: 5.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 210,
        createGeometry: (T = THREE) => {
          const tracks = new T.BoxGeometry(3.4, 1.0, 5.2); tracks.translate(0, 0.5, -1.0);
         const body = new T.BoxGeometry(2.8, 1.8, 3.8); body.translate(0, 1.8, -1.0);
         const boom = new T.BoxGeometry(0.6, 2.8, 5.5); boom.rotateX(-0.4); boom.translate(0, 2.8, 2.0);
         return mergeGeometries([tracks, body, boom], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.61, 4.94, 10.45);
          b.translate(0, 2.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.8, 5.2, 11.0);
          b.translate(0, 2.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 5-Axle all-terrain 100-ton mobile telescopic crane (3.2x14.0m, 4.0m high)
 */
export function vehicleHighendMobileTelescopicCrane(seed = "vehicle-highend-mobile-telescopic-crane-0") {
  return {
    id: "vehicle-highend-mobile-telescopic-crane",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.2, d: 14.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const carrier = new T.BoxGeometry(2.8, 1.4, 12.5); carrier.translate(0, 0.9, 0);
         const boom = new T.BoxGeometry(1.2, 1.2, 11.5); boom.translate(0, 2.6, -0.5);
         return mergeGeometries([carrier, boom], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.04, 3.80, 13.30);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 4.0, 14.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 6x6 ARFF Major airport crash fire rescue tender vehicle (3.4x12.0m, 4.4m high)
 */
export function vehicleHighendAirportCrashTender(seed = "vehicle-highend-airport-crash-tender-0") {
  return {
    id: "vehicle-highend-airport-crash-tender",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.4, d: 12.0 },
    height: 4.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(3.0, 2.4, 11.0); body.translate(0, 1.5, 0);
         const cannon = new T.CylinderGeometry(0.2, 0.2, 2.2, 8); cannon.rotateX(0.2); cannon.translate(0, 3.2, 4.0);
         return mergeGeometries([body, cannon], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.23, 4.18, 11.40);
          b.translate(0, 2.09, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.4, 4.4, 12.0);
          b.translate(0, 2.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 6x6 Articulated all-terrain earthmoving hauler truck (3.4x11.0m, 3.6m high)
 */
export function vehicleHighendArticulatedDumpHauler(seed = "vehicle-highend-articulated-dump-hauler-0") {
  return {
    id: "vehicle-highend-articulated-dump-hauler",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 3.4, d: 11.0 },
    height: 3.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const tractor = new T.BoxGeometry(3.0, 2.2, 4.5); tractor.translate(0, 1.5, 2.8);
         const trailer = new T.BoxGeometry(3.0, 2.0, 5.5); trailer.translate(0, 1.8, -2.5);
         return mergeGeometries([tractor, trailer], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.23, 3.42, 10.45);
          b.translate(0, 1.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.4, 3.6, 11.0);
          b.translate(0, 1.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: High-altitude ski slope tracked snow grooming tractor (4.2x8.0m, 2.8m high)
 */
export function vehicleHighendTrackedSnowcatGroomer(seed = "vehicle-highend-tracked-snowcat-groomer-0") {
  return {
    id: "vehicle-highend-tracked-snowcat-groomer",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 4.2, d: 8.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.8, 1.8, 3.5); cab.translate(0, 1.5, 0);
         const blade = new T.BoxGeometry(4.0, 0.8, 0.8); blade.translate(0, 0.5, 2.6);
         const tiller = new T.BoxGeometry(3.8, 0.4, 1.6); tiller.translate(0, 0.4, -2.8);
         return mergeGeometries([cab, blade, tiller], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.99, 2.66, 7.60);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.2, 2.8, 8.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Temperature-controlled insulated refrigerated food transport truck (2.6x9.5m, 3.8m high)
 */
export function vehicleHighendRefrigeratedFreightTruck(seed = "vehicle-highend-refrigerated-freight-truck-0") {
  return {
    id: "vehicle-highend-refrigerated-freight-truck",
    tier: "highend",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.6, d: 9.5 },
    height: 3.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.3, 2.0, 2.4); cab.translate(0, 1.3, 3.0);
         const box = new T.BoxGeometry(2.4, 2.4, 6.4); box.translate(0, 1.9, -1.2);
         const unit = new T.BoxGeometry(1.6, 0.8, 0.6); unit.translate(0, 3.0, 2.2);
         return mergeGeometries([cab, box, unit], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 3.61, 9.03);
          b.translate(0, 1.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 3.8, 9.5);
          b.translate(0, 1.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Modern compact crossover utility family vehicle (2.0x4.6m, 1.6m high)
 */
export function vehicleMidhighModernCompactCrossover(seed = "vehicle-midhigh-modern-compact-crossover-0") {
  return {
    id: "vehicle-midhigh-modern-compact-crossover",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.0, d: 4.6 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.8, 0.7, 4.2); body.translate(0, 0.55, 0);
         const cabin = new T.BoxGeometry(1.5, 0.65, 2.5); cabin.translate(0, 1.2, -0.3);
         return mergeGeometries([body, cabin], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.52, 4.37);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.6, 4.6);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Commercial parcel delivery walk-in electric step van (2.2x5.8m, 2.6m high)
 */
export function vehicleMidhighElectricDeliveryVan(seed = "vehicle-midhigh-electric-delivery-van-0") {
  return {
    id: "vehicle-midhigh-electric-delivery-van",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 5.8 },
    height: 2.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.95, 2.0, 5.2); body.translate(0, 1.2, 0); return body;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 2.47, 5.51);
          b.translate(0, 1.23, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 2.6, 5.8);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 4-Door 4WD crew-cab utility pickup truck (2.2x5.8m, 1.9m high)
 */
export function vehicleMidhighCrewCabPickupTruck(seed = "vehicle-midhigh-crew-cab-pickup-truck-0") {
  return {
    id: "vehicle-midhigh-crew-cab-pickup-truck",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 5.8 },
    height: 1.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(1.9, 1.2, 3.0); cab.translate(0, 1.15, 0.8);
         const bed = new T.BoxGeometry(1.9, 0.7, 2.4); bed.translate(0, 0.9, -1.6);
         return mergeGeometries([cab, bed], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.80, 5.51);
          b.translate(0, 0.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.9, 5.8);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Compact street sweeping vacuum maintenance truck (2.2x5.2m, 2.5m high)
 */
export function vehicleMidhighMunicipalSweeperTruck(seed = "vehicle-midhigh-municipal-sweeper-truck-0") {
  return {
    id: "vehicle-midhigh-municipal-sweeper-truck",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 5.2 },
    height: 2.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(1.8, 1.8, 2.2); cab.translate(0, 1.15, 1.2);
         const hopper = new T.BoxGeometry(1.9, 1.6, 2.4); hopper.translate(0, 1.3, -1.0);
         return mergeGeometries([cab, hopper], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 2.38, 4.94);
          b.translate(0, 1.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 2.5, 5.2);
          b.translate(0, 1.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Automated side-loader municipal waste collection truck (2.6x8.8m, 3.4m high)
 */
export function vehicleMidhighRefuseGarbageTruck(seed = "vehicle-midhigh-refuse-garbage-truck-0") {
  return {
    id: "vehicle-midhigh-refuse-garbage-truck",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.6, d: 8.8 },
    height: 3.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 125,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.3, 2.0, 2.2); cab.translate(0, 1.3, 2.8);
         const body = new T.BoxGeometry(2.4, 2.3, 5.6); body.translate(0, 1.7, -1.1);
         return mergeGeometries([cab, body], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 3.23, 8.36);
          b.translate(0, 1.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 3.4, 8.8);
          b.translate(0, 1.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Hydraulic rollback flatbed automotive recovery tow truck (2.4x7.8m, 2.6m high)
 */
export function vehicleMidhighFlatbedTowTruck(seed = "vehicle-midhigh-flatbed-tow-truck-0") {
  return {
    id: "vehicle-midhigh-flatbed-tow-truck",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.4, d: 7.8 },
    height: 2.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.1, 1.8, 2.2); cab.translate(0, 1.2, 2.4);
         const bed = new T.BoxGeometry(2.2, 0.4, 5.0); bed.translate(0, 0.9, -1.0);
         return mergeGeometries([cab, bed], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 2.47, 7.41);
          b.translate(0, 1.23, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 2.6, 7.8);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Articulated medium wheel loader with front loading bucket (2.8x7.2m, 3.4m high)
 */
export function vehicleMidhighWheelLoaderTractor(seed = "vehicle-midhigh-wheel-loader-tractor-0") {
  return {
    id: "vehicle-midhigh-wheel-loader-tractor",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.8, d: 7.2 },
    height: 3.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.4, 2.2, 4.0); body.translate(0, 1.6, -0.8);
         const bucket = new T.BoxGeometry(2.7, 1.2, 1.4); bucket.translate(0, 0.7, 2.4);
         return mergeGeometries([body, bucket], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.66, 3.23, 6.84);
          b.translate(0, 1.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 3.4, 7.2);
          b.translate(0, 1.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Standard Type C conventional yellow school bus (2.6x10.5m, 3.2m high)
 */
export function vehicleMidhighSchoolTransitBus(seed = "vehicle-midhigh-school-transit-bus-0") {
  return {
    id: "vehicle-midhigh-school-transit-bus",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.6, d: 10.5 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.3, 2.3, 9.8); body.translate(0, 1.45, 0);
         const hood = new T.BoxGeometry(1.8, 1.2, 1.6); hood.translate(0, 0.9, 4.2);
         return mergeGeometries([body, hood], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 3.04, 9.97);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 3.2, 10.5);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 8-Cubic-yard rotating drum concrete transit mixer truck (2.6x8.8m, 5.4m high)
 */
export function vehicleMidhighConcreteMixerTruck(seed = "vehicle-midhigh-concrete-mixer-truck-0") {
  return {
    id: "vehicle-midhigh-concrete-mixer-truck",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.6, d: 8.8 },
    height: 5.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 130,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.2, 2.0, 2.2); cab.translate(0, 1.3, 2.8);
         const drum = new T.CylinderGeometry(1.2, 0.8, 5.0, 10); drum.rotateX(0.25); drum.translate(0, 2.0, -1.0);
         const _m = mergeGeometries([cab, drum], T);; _m.translate(0, 0.620, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 5.13, 8.36);
          b.translate(0, 2.56, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 5.4, 8.8);
          b.translate(0, 2.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Electric utility bucket truck with articulated aerial boom (2.4x7.5m, 3.5m high)
 */
export function vehicleMidhighBucketUtilityCherryPicker(seed = "vehicle-midhigh-bucket-utility-cherry-picker-0") {
  return {
    id: "vehicle-midhigh-bucket-utility-cherry-picker",
    tier: "midhigh",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.4, d: 7.5 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const truck = new T.BoxGeometry(2.1, 1.8, 6.8); truck.translate(0, 1.15, 0);
         const arm = new T.BoxGeometry(0.3, 0.3, 5.0); arm.rotateX(0.2); arm.translate(0, 2.6, 0);
         const bucket = new T.BoxGeometry(0.8, 0.9, 0.8); bucket.translate(0, 3.0, -2.4);
         return mergeGeometries([truck, arm, bucket], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 3.32, 7.12);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 3.5, 7.5);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 4-Door standard compact family sedan (1.9x4.7m, 1.5m high)
 */
export function vehicleMidStandardFamilySedan(seed = "vehicle-mid-standard-family-sedan-0") {
  return {
    id: "vehicle-mid-standard-family-sedan",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.9, d: 4.7 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 55,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.7, 0.6, 4.4); body.translate(0, 0.45, 0);
         const cab = new T.BoxGeometry(1.4, 0.6, 2.2); cab.translate(0, 1.05, -0.2);
         return mergeGeometries([body, cab], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.80, 1.42, 4.46);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.9, 1.5, 4.7);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 5-Door economy compact city hatchback (1.8x4.0m, 1.5m high)
 */
export function vehicleMidCompactHatchback(seed = "vehicle-mid-compact-hatchback-0") {
  return {
    id: "vehicle-mid-compact-hatchback",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.8, d: 4.0 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.6, 0.6, 3.8); body.translate(0, 0.45, 0);
         const cab = new T.BoxGeometry(1.35, 0.65, 2.0); cab.translate(0, 1.05, -0.4);
         return mergeGeometries([body, cab], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.42, 3.80);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.5, 4.0);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 7-Passenger family passenger minivan (2.0x5.0m, 1.75m high)
 */
export function vehicleMidStandardMinivan(seed = "vehicle-mid-standard-minivan-0") {
  return {
    id: "vehicle-mid-standard-minivan",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.0, d: 5.0 },
    height: 1.75,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 58,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.8, 1.3, 4.6); body.translate(0, 0.85, 0); return body;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.66, 4.75);
          b.translate(0, 0.83, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.75, 5.0);
          b.translate(0, 0.875, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Regular single-cab utility pickup truck (2.0x5.0m, 1.8m high)
 */
export function vehicleMidSingleCabPickup(seed = "vehicle-mid-single-cab-pickup-0") {
  return {
    id: "vehicle-mid-single-cab-pickup",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.0, d: 5.0 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 54,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(1.8, 1.1, 2.0); cab.translate(0, 1.05, 1.2);
         const bed = new T.BoxGeometry(1.8, 0.6, 2.8); bed.translate(0, 0.8, -1.0);
         return mergeGeometries([cab, bed], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.71, 4.75);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.8, 5.0);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard commercial cargo panel van (2.1x5.4m, 2.2m high)
 */
export function vehicleMidCargoPanelVan(seed = "vehicle-mid-cargo-panel-van-0") {
  return {
    id: "vehicle-mid-cargo-panel-van",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.1, d: 5.4 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.9, 1.7, 5.0); body.translate(0, 1.05, 0); return body;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.99, 2.09, 5.13);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.1, 2.2, 5.4);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 5-Door family station wagon estate car (1.9x4.8m, 1.5m high)
 */
export function vehicleMidStationWagon(seed = "vehicle-mid-station-wagon-0") {
  return {
    id: "vehicle-mid-station-wagon",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.9, d: 4.8 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.7, 0.6, 4.5); body.translate(0, 0.45, 0);
         const cab = new T.BoxGeometry(1.4, 0.6, 2.8); cab.translate(0, 1.05, -0.4);
         return mergeGeometries([body, cab], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.80, 1.42, 4.56);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.9, 1.5, 4.8);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 16-Foot medium duty commercial box moving truck (2.3x6.8m, 3.2m high)
 */
export function vehicleMidBoxDeliveryTruck(seed = "vehicle-mid-box-delivery-truck-0") {
  return {
    id: "vehicle-mid-box-delivery-truck",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.3, d: 6.8 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 56,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.0, 1.8, 2.0); cab.translate(0, 1.15, 2.1);
         const box = new T.BoxGeometry(2.2, 2.1, 4.4); box.translate(0, 1.6, -1.0);
         return mergeGeometries([cab, box], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.18, 3.04, 6.46);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.3, 3.2, 6.8);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Industrial 3-ton warehouse forklift truck (1.4x2.6m, 2.2m high)
 */
export function vehicleMidForkliftPalletTruck(seed = "vehicle-mid-forklift-pallet-truck-0") {
  return {
    id: "vehicle-mid-forklift-pallet-truck",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.4, d: 2.6 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.2, 1.2, 1.6); body.translate(0, 0.7, -0.3);
         const mast = new T.BoxGeometry(0.8, 2.0, 0.15); mast.translate(0, 1.1, 0.7);
         return mergeGeometries([body, mast], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 2.09, 2.47);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 2.2, 2.6);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 75hp agricultural utility farm tractor with ROPS canopy (2.2x3.8m, 2.5m high)
 */
export function vehicleMidFarmUtilityTractor(seed = "vehicle-mid-farm-utility-tractor-0") {
  return {
    id: "vehicle-mid-farm-utility-tractor",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.2, d: 3.8 },
    height: 2.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 54,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.6, 1.2, 3.2); body.translate(0, 0.9, 0);
         const rops = new T.BoxGeometry(1.4, 1.2, 0.15); rops.translate(0, 1.9, -0.8);
         return mergeGeometries([body, rops], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 2.38, 3.61);
          b.translate(0, 1.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 2.5, 3.8);
          b.translate(0, 1.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 2-Seater battery electric resort golf buggy cart (1.3x2.4m, 1.8m high)
 */
export function vehicleMidElectricGolfCart(seed = "vehicle-mid-electric-golf-cart-0") {
  return {
    id: "vehicle-mid-electric-golf-cart",
    tier: "mid",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.3, d: 2.4 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.1, 0.6, 2.1); body.translate(0, 0.45, 0);
         const roof = new T.BoxGeometry(1.1, 0.1, 1.6); roof.translate(0, 1.7, -0.2);
         return mergeGeometries([body, roof], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.23, 1.71, 2.28);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.3, 1.8, 2.4);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Standard adult city commuter bicycle (0.6x2.0m, 1.1m high)
 */
export function vehicleMidlowCommuterBicycle(seed = "vehicle-midlow-commuter-bicycle-0") {
  return {
    id: "vehicle-midlow-commuter-bicycle",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.6, d: 2.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(0.1, 0.7, 1.2); frame.translate(0, 0.55, 0);
         const w1 = new T.CylinderGeometry(0.3, 0.3, 0.05, 6); w1.rotateZ(Math.PI/2); w1.translate(0, 0.3, -0.6);
         const w2 = new T.CylinderGeometry(0.3, 0.3, 0.05, 6); w2.rotateZ(Math.PI/2); w2.translate(0, 0.3, 0.6);
         return mergeGeometries([frame, w1, w2], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.04, 1.90);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.1, 2.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Shared dockless electric kick scooter (0.5x1.1m, 1.2m high)
 */
export function vehicleMidlowElectricKickScooter(seed = "vehicle-midlow-electric-kick-scooter-0") {
  return {
    id: "vehicle-midlow-electric-kick-scooter",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.5, d: 1.1 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(0.18, 0.08, 0.9); deck.translate(0, 0.1, 0);
         const stem = new T.CylinderGeometry(0.02, 0.02, 1.0, 6); stem.translate(0, 0.6, 0.4);
         return mergeGeometries([deck, stem], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.47, 1.14, 1.04);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 1.2, 1.1);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: 50cc lightweight motor scooter (0.8x1.8m, 1.2m high)
 */
export function vehicleMidlowMopedScooter50cc(seed = "vehicle-midlow-moped-scooter-50cc-0") {
  return {
    id: "vehicle-midlow-moped-scooter-50cc",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.8, d: 1.8 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(0.5, 0.7, 1.4); body.translate(0, 0.55, 0);
         const bars = new T.BoxGeometry(0.6, 0.1, 0.1); bars.translate(0, 1.1, 0.4);
         return mergeGeometries([body, bars], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.14, 1.71);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.2, 1.8);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Manual hydraulic manual pallet jack truck (0.8x1.6m, 1.2m high)
 */
export function vehicleMidlowHandPalletJack(seed = "vehicle-midlow-hand-pallet-jack-0") {
  return {
    id: "vehicle-midlow-hand-pallet-jack",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.8, d: 1.6 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const forks = new T.BoxGeometry(0.6, 0.1, 1.1); forks.translate(0, 0.1, -0.2);
         const handle = new T.CylinderGeometry(0.03, 0.03, 1.0, 6); handle.translate(0, 0.6, 0.5);
         return mergeGeometries([forks, handle], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.14, 1.52);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.2, 1.6);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Single-axle light cargo utility tow trailer (1.8x3.2m, 1.2m high)
 */
export function vehicleMidlowUtilityBoxTrailer(seed = "vehicle-midlow-utility-box-trailer-0") {
  return {
    id: "vehicle-midlow-utility-box-trailer",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.8, d: 3.2 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(1.5, 0.65, 2.4); box.translate(0, 0.6, -0.3);
         const tongue = new T.BoxGeometry(0.1, 0.1, 0.9); tongue.translate(0, 0.35, 1.1);
         return mergeGeometries([box, tongue], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.14, 3.04);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.2, 3.2);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Heavy gauge steel construction wheelbarrow cart (0.9x1.4m, 0.8m high)
 */
export function vehicleMidlowSiteDumpCartBarrow(seed = "vehicle-midlow-site-dump-cart-barrow-0") {
  return {
    id: "vehicle-midlow-site-dump-cart-barrow",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.9, d: 1.4 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const tub = new T.BoxGeometry(0.7, 0.4, 0.9); tub.translate(0, 0.45, 0);
         const wheel = new T.CylinderGeometry(0.18, 0.18, 0.08, 6); wheel.rotateZ(Math.PI/2); wheel.translate(0, 0.18, 0.45);
         return mergeGeometries([tub, wheel], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.85, 0.76, 1.33);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.9, 0.8, 1.4);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Gas-powered walk-behind rotary lawn mower (0.6x1.4m, 1.0m high)
 */
export function vehicleMidlowPushLawnMower(seed = "vehicle-midlow-push-lawn-mower-0") {
  return {
    id: "vehicle-midlow-push-lawn-mower",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.6, d: 1.4 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(0.5, 0.25, 0.6); deck.translate(0, 0.2, 0);
         const handle = new T.BoxGeometry(0.4, 0.7, 0.6); handle.translate(0, 0.6, -0.3);
         return mergeGeometries([deck, handle], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.95, 1.33);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.0, 1.4);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Mobile street vendor hot dog and snack cart with parasol (2.0x2.2m, 2.2m high)
 */
export function vehicleMidlowStreetFoodVendingCart(seed = "vehicle-midlow-street-food-vending-cart-0") {
  return {
    id: "vehicle-midlow-street-food-vending-cart",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 2.0, d: 2.2 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const cart = new T.BoxGeometry(1.1, 0.9, 1.8); cart.translate(0, 0.55, 0);
         const umb = new T.ConeGeometry(0.8, 0.3, 8); umb.translate(0, 2.0, 0);
         return mergeGeometries([cart, umb], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 2.09, 2.09);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 2.2, 2.2);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Airport apron baggage cart tug trailer (1.6x2.8m, 1.5m high)
 */
export function vehicleMidlowAirportBaggageTrailer(seed = "vehicle-midlow-airport-baggage-trailer-0") {
  return {
    id: "vehicle-midlow-airport-baggage-trailer",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 1.6, d: 2.8 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const bed = new T.BoxGeometry(1.3, 0.4, 2.2); bed.translate(0, 0.5, 0);
         const cage = new T.BoxGeometry(1.3, 0.8, 2.2); cage.translate(0, 1.0, 0);
         return mergeGeometries([bed, cage], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.52, 1.42, 2.66);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 1.5, 2.8);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Two-wheel heavy tubular steel hand truck sack barrow dolly (0.6x1.0m, 1.3m high)
 */
export function vehicleMidlowHandTruckDolly(seed = "vehicle-midlow-hand-truck-dolly-0") {
  return {
    id: "vehicle-midlow-hand-truck-dolly",
    tier: "midlow",
    category: "vehicles",
    kind: "hard",
    footprint: { w: 0.6, d: 1.0 },
    height: 1.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(0.45, 1.1, 0.1); frame.translate(0, 0.6, 0);
         const plate = new T.BoxGeometry(0.45, 0.05, 0.3); plate.translate(0, 0.08, 0.15);
         return mergeGeometries([frame, plate], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.23, 0.95);
          b.translate(0, 0.62, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.3, 1.0);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 140m Tier-1 Giga-Yacht with dual helipads and multi-tier aft infinity pools (18.0x96.0m, 26.0m high)
 */
export function maritimeShowstopperGigaYachtHelipad(seed = "maritime-showstopper-giga-yacht-helipad-0") {
  return {
    id: "maritime-showstopper-giga-yacht-helipad",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 18.0, d: 96.0 },
    height: 26.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 560,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(16, 7.5, 92); hull.translate(0, 3.75, 0);
         const superstr = new T.BoxGeometry(12, 12, 54); superstr.translate(0, 13.5, -6);
         const helipad = new T.CylinderGeometry(6, 6, 0.8, 16); helipad.translate(0, 16.5, 26);
         const mast = new T.CylinderGeometry(0.4, 0.8, 8, 8); mast.translate(0, 21.5, -8);
         return mergeGeometries([hull, superstr, helipad, mast], T);
        },
      },
      {
        level: 1,
        tris: 68,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(17.10, 24.70, 91.20);
          b.translate(0, 12.35, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(18.0, 26.0, 96.0);
          b.translate(0, 13.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Flagship luxury ocean cruise liner with twin aerodynamic funnels (32.0x128.0m, 44.0m high)
 */
export function maritimeShowstopperOceanCruiseLiner(seed = "maritime-showstopper-ocean-cruise-liner-0") {
  return {
    id: "maritime-showstopper-ocean-cruise-liner",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 32.0, d: 128.0 },
    height: 44.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(28, 14, 124); hull.translate(0, 7, 0);
         const decks = new T.BoxGeometry(24, 18, 90); decks.translate(0, 23, -10);
         const funnel1 = new T.CylinderGeometry(2.5, 2.0, 8, 8); funnel1.translate(0, 36, -20);
         const funnel2 = new T.CylinderGeometry(2.5, 2.0, 8, 8); funnel2.translate(0, 36, 0);
         return mergeGeometries([hull, decks, funnel1, funnel2], T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 41.80, 121.60);
          b.translate(0, 20.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 44.0, 128.0);
          b.translate(0, 22.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 20,000 TEU Ultra-Large Container Vessel (ULCV) with cellular bays (48.0x128.0m, 38.0m high)
 */
export function maritimeShowstopperContainerShipTripleE(seed = "maritime-showstopper-container-ship-triple-e-0") {
  return {
    id: "maritime-showstopper-container-ship-triple-e",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 48.0, d: 128.0 },
    height: 38.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(44, 14, 124); hull.translate(0, 7, 0);
         const stacks = new T.BoxGeometry(40, 14, 88); stacks.translate(0, 21, 6);
         const bridge = new T.BoxGeometry(42, 18, 16); bridge.translate(0, 23, -42);
         return mergeGeometries([hull, stacks, bridge], T);
        },
      },
      {
        level: 1,
        tris: 66,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 36.10, 121.60);
          b.translate(0, 18.05, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 38.0, 128.0);
          b.translate(0, 19.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Post-Panamax STS container quayside gantry crane with 60m outreach boom (32.0x32.0m, 64.0m high)
 */
export function maritimeShowstopperContainerQuaysideGantryCrane(seed = "maritime-showstopper-container-quayside-gantry-crane-0") {
  return {
    id: "maritime-showstopper-container-quayside-gantry-crane",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 64.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const legs = new T.BoxGeometry(26, 38, 20); legs.translate(0, 19, 0);
         const boom = new T.BoxGeometry(6, 4, 31); boom.translate(0, 40, 0);
         const tower = new T.BoxGeometry(8, 20, 14); tower.translate(0, 50, -4);
         return mergeGeometries([legs, boom, tower], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 60.80, 30.40);
          b.translate(0, 30.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 64.0, 32.0);
          b.translate(0, 32.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Heavy nuclear-powered polar research icebreaker with reinforced spoon prow (24.0x82.0m, 28.0m high)
 */
export function maritimeShowstopperPolarIcebreakerShip(seed = "maritime-showstopper-polar-icebreaker-ship-0") {
  return {
    id: "maritime-showstopper-polar-icebreaker-ship",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 24.0, d: 82.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(22, 10, 76); hull.translate(0, 5, 0);
         const prow = new T.ConeGeometry(10, 14, 8); prow.rotateX(Math.PI/2); prow.translate(0, 5, 34);
         const superstr = new T.BoxGeometry(16, 12, 32); superstr.translate(0, 16, -10);
         const _m = mergeGeometries([hull, prow, superstr], T);; _m.translate(0, 5.000, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 26.60, 77.90);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 28.0, 82.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: High-speed passenger foil-assisted wave-piercing catamaran ferry (16.0x48.0m, 14.0m high)
 */
export function maritimeShowstopperHydrofoilCatamaranFerry(seed = "maritime-showstopper-hydrofoil-catamaran-ferry-0") {
  return {
    id: "maritime-showstopper-hydrofoil-catamaran-ferry",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 16.0, d: 48.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const demiL = new T.BoxGeometry(3.5, 3.5, 46); demiL.translate(-6, 1.75, 0);
         const demiR = new T.BoxGeometry(3.5, 3.5, 46); demiR.translate(6, 1.75, 0);
         const deck = new T.BoxGeometry(15.5, 5.5, 38); deck.translate(0, 6.25, -2);
         const foil = new T.BoxGeometry(15.8, 0.4, 4); foil.translate(0, 0.5, 14);
         return mergeGeometries([demiL, demiR, deck, foil], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 13.30, 45.60);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 14.0, 48.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Deepwater semi-submersible drilling production exploration platform rig (64.0x64.0m, 56.0m high)
 */
export function maritimeShowstopperSemiSubmersibleOilRig(seed = "maritime-showstopper-semi-submersible-oil-rig-0") {
  return {
    id: "maritime-showstopper-semi-submersible-oil-rig",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 64.0, d: 64.0 },
    height: 56.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 530,
        createGeometry: (T = THREE) => {
          const pont1 = new T.BoxGeometry(12, 6, 60); pont1.translate(-24, 3, 0);
         const pont2 = new T.BoxGeometry(12, 6, 60); pont2.translate(24, 3, 0);
         const col1 = new T.CylinderGeometry(4, 4, 28, 8); col1.translate(-24, 20, -20);
         const col2 = new T.CylinderGeometry(4, 4, 28, 8); col2.translate(24, 20, -20);
         const col3 = new T.CylinderGeometry(4, 4, 28, 8); col3.translate(24, 20, 20);
         const col4 = new T.CylinderGeometry(4, 4, 28, 8); col4.translate(-24, 20, 20);
         const deck = new T.BoxGeometry(58, 6, 58); deck.translate(0, 37, 0);
         const derrick = new T.ConeGeometry(6, 16, 4); derrick.translate(0, 48, 0);
         return mergeGeometries([pont1, pont2, col1, col2, col3, col4, deck, derrick], T);
        },
      },
      {
        level: 1,
        tris: 66,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 53.20, 60.80);
          b.translate(0, 26.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 56.0, 64.0);
          b.translate(0, 28.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Fully-rigged 3-masted historic naval square-rigged sailing frigate (16.0x64.0m, 43.0m high)
 */
export function maritimeShowstopperHistoricTallShipFrigate(seed = "maritime-showstopper-historic-tall-ship-frigate-0") {
  return {
    id: "maritime-showstopper-historic-tall-ship-frigate",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 16.0, d: 64.0 },
    height: 43.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(12, 7, 58); hull.translate(0, 3.5, 0);
         const mast1 = new T.CylinderGeometry(0.3, 0.5, 34, 8); mast1.translate(0, 24, -14);
         const mast2 = new T.CylinderGeometry(0.3, 0.5, 36, 8); mast2.translate(0, 25, 2);
         const mast3 = new T.CylinderGeometry(0.3, 0.5, 30, 8); mast3.translate(0, 22, 18);
         const yard = new T.BoxGeometry(14, 0.3, 0.3); yard.translate(0, 26, 2);
         return mergeGeometries([hull, mast1, mast2, mast3, yard], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 40.85, 60.80);
          b.translate(0, 20.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 43.0, 64.0);
          b.translate(0, 21.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Moss-type spherical tank liquefied natural gas (LNG) carrier (32.0x96.0m, 32.0m high)
 */
export function maritimeShowstopperLngCarrierSphericalTanks(seed = "maritime-showstopper-lng-carrier-spherical-tanks-0") {
  return {
    id: "maritime-showstopper-lng-carrier-spherical-tanks",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 32.0, d: 96.0 },
    height: 32.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(28, 10, 92); hull.translate(0, 5, 0);
         const s1 = new T.SphereGeometry(8, 12, 8); s1.translate(0, 15, -24);
         const s2 = new T.SphereGeometry(8, 12, 8); s2.translate(0, 15, 0);
         const s3 = new T.SphereGeometry(8, 12, 8); s3.translate(0, 15, 24);
         return mergeGeometries([hull, s1, s2, s3], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 30.40, 91.20);
          b.translate(0, 15.20, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 32.0, 96.0);
          b.translate(0, 16.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Heavy caisson floating drydock ship repair facility (48.0x80.0m, 22.0m high)
 */
export function maritimeShowstopperFloatingDrydock(seed = "maritime-showstopper-floating-drydock-0") {
  return {
    id: "maritime-showstopper-floating-drydock",
    tier: "showstopper",
    category: "maritime",
    kind: "hard",
    footprint: { w: 48.0, d: 80.0 },
    height: 22.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const floor = new T.BoxGeometry(44, 4, 76); floor.translate(0, 2, 0);
         const wallL = new T.BoxGeometry(6, 16, 76); wallL.translate(-19, 12, 0);
         const wallR = new T.BoxGeometry(6, 16, 76); wallR.translate(19, 12, 0);
         return mergeGeometries([floor, wallL, wallR], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 20.90, 76.00);
          b.translate(0, 10.45, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 22.0, 80.0);
          b.translate(0, 11.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 45m Tri-deck composite displacement motor superyacht (10.0x48.0m, 16.0m high)
 */
export function maritimeLuxurySuperyachtFlybridge(seed = "maritime-luxury-superyacht-flybridge-0") {
  return {
    id: "maritime-luxury-superyacht-flybridge",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 10.0, d: 48.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 320,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(8.5, 4.5, 44); hull.translate(0, 2.25, 0);
         const cabin = new T.BoxGeometry(6.5, 6.5, 24); cabin.translate(0, 7.5, -2);
         const fly = new T.BoxGeometry(5.5, 2.2, 12); fly.translate(0, 12.0, -4);
         return mergeGeometries([hull, cabin, fly], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 15.20, 45.60);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 16.0, 48.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 100ft Carbon-rigged performance cruising sailing sloop (8.0x32.0m, 28.0m high)
 */
export function maritimeLuxuryModernSailingYacht(seed = "maritime-luxury-modern-sailing-yacht-0") {
  return {
    id: "maritime-luxury-modern-sailing-yacht",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 8.0, d: 32.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(6.5, 3.0, 28); hull.translate(0, 1.5, 0);
         const cabin = new T.BoxGeometry(4.5, 1.8, 12); cabin.translate(0, 3.9, -2);
         const mast = new T.CylinderGeometry(0.2, 0.35, 22, 8); mast.translate(0, 15, 2);
         return mergeGeometries([hull, cabin, mast], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 26.60, 30.40);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 28.0, 32.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Convertible tournament sportfishing yacht with tuna tower (6.0x20.0m, 9.0m high)
 */
export function maritimeLuxuryOffshoreSportfisher(seed = "maritime-luxury-offshore-sportfisher-0") {
  return {
    id: "maritime-luxury-offshore-sportfisher",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 6.0, d: 20.0 },
    height: 9.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(5.2, 2.4, 18); hull.translate(0, 1.2, 0);
         const house = new T.BoxGeometry(3.8, 2.8, 8); house.translate(0, 3.8, -1);
         const tower = new T.BoxGeometry(2.4, 3.2, 2.4); tower.translate(0, 6.8, -1);
         return mergeGeometries([hull, house, tower], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 8.55, 19.00);
          b.translate(0, 4.27, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 9.0, 20.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Concrete pontoon floating marina dock finger piers (24.0x48.0m, 5.0m high)
 */
export function maritimeLuxuryWaterfrontMarinaBerthComplex(seed = "maritime-luxury-waterfront-marina-berth-complex-0") {
  return {
    id: "maritime-luxury-waterfront-marina-berth-complex",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 24.0, d: 48.0 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const spine = new T.BoxGeometry(4.0, 0.8, 46); spine.translate(0, 0.4, 0);
         const finger1 = new T.BoxGeometry(18, 0.6, 1.5); finger1.translate(0, 0.3, -14);
         const finger2 = new T.BoxGeometry(18, 0.6, 1.5); finger2.translate(0, 0.3, 14);
         return mergeGeometries([spine, finger1, finger2], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 4.75, 45.60);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 5.0, 48.0);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Handcrafted Italian varnished mahogany twin-cockpit speed runabout (3.0x10.0m, 2.2m high)
 */
export function maritimeLuxuryClassicMahoganyRunabout(seed = "maritime-luxury-classic-mahogany-runabout-0") {
  return {
    id: "maritime-luxury-classic-mahogany-runabout",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 3.0, d: 10.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(2.4, 1.0, 9.2); hull.translate(0, 0.5, 0);
         const screen = new T.BoxGeometry(1.8, 0.5, 0.1); screen.rotateX(-0.3); screen.translate(0, 1.2, 1.0);
         return mergeGeometries([hull, screen], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 2.09, 9.50);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 2.2, 10.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Foiling electric VIP water taxi passenger shuttle (4.0x14.0m, 4.2m high)
 */
export function maritimeLuxuryHydrofoilWaterTaxi(seed = "maritime-luxury-hydrofoil-water-taxi-0") {
  return {
    id: "maritime-luxury-hydrofoil-water-taxi",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 4.0, d: 14.0 },
    height: 4.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 295,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(3.2, 1.6, 12.5); hull.translate(0, 1.8, 0);
         const cabin = new T.BoxGeometry(2.6, 1.4, 6.0); cabin.translate(0, 3.2, -1);
         const struts = new T.BoxGeometry(3.6, 1.2, 0.2); struts.translate(0, 0.6, 2);
         return mergeGeometries([hull, cabin, struts], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 3.99, 13.30);
          b.translate(0, 1.99, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 4.2, 14.0);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 60ft Wide-beam bluewater cruising sailing catamaran (10.0x24.0m, 18.0m high)
 */
export function maritimeLuxuryCatamaranCruisingYacht(seed = "maritime-luxury-catamaran-cruising-yacht-0") {
  return {
    id: "maritime-luxury-catamaran-cruising-yacht",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 10.0, d: 24.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const hullL = new T.BoxGeometry(2.2, 2.4, 22); hullL.translate(-3.6, 1.2, 0);
         const hullR = new T.BoxGeometry(2.2, 2.4, 22); hullR.translate(3.6, 1.2, 0);
         const bridge = new T.BoxGeometry(8.5, 2.0, 14); bridge.translate(0, 3.0, -2);
         const mast = new T.CylinderGeometry(0.2, 0.3, 13.5, 8); mast.translate(0, 10.5, 2);
         return mergeGeometries([hullL, hullR, bridge, mast], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 17.10, 22.80);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 18.0, 24.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Self-righting high-speed offshore port pilot cutter launch (6.0x24.0m, 8.0m high)
 */
export function maritimeLuxuryHarborPilotCommandVessel(seed = "maritime-luxury-harbor-pilot-command-vessel-0") {
  return {
    id: "maritime-luxury-harbor-pilot-command-vessel",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 6.0, d: 24.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(5.2, 2.5, 22); hull.translate(0, 1.25, 0);
         const wheel = new T.BoxGeometry(3.6, 2.8, 6); wheel.translate(0, 3.8, -2);
         const mast = new T.CylinderGeometry(0.15, 0.2, 2.5, 6); mast.translate(0, 6.4, -2);
         return mergeGeometries([hull, wheel, mast], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 7.60, 22.80);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 8.0, 24.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Offshore floating superyacht landing helipad pontoon (16.0x16.0m, 4.0m high)
 */
export function maritimeLuxuryFloatingHelipadPontoon(seed = "maritime-luxury-floating-helipad-pontoon-0") {
  return {
    id: "maritime-luxury-floating-helipad-pontoon",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 275,
        createGeometry: (T = THREE) => {
          const pontoon = new T.BoxGeometry(14, 1.5, 14); pontoon.translate(0, 0.75, 0);
         const deck = new T.CylinderGeometry(6.5, 6.5, 0.4, 16); deck.translate(0, 1.7, 0);
         return mergeGeometries([pontoon, deck], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 3.80, 15.20);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 4.0, 16.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Zero-emission solar-canopied transoceanic catamaran yacht (8.0x24.0m, 6.0m high)
 */
export function maritimeLuxurySolarElectricYacht(seed = "maritime-luxury-solar-electric-yacht-0") {
  return {
    id: "maritime-luxury-solar-electric-yacht",
    tier: "luxury",
    category: "maritime",
    kind: "hard",
    footprint: { w: 8.0, d: 24.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(6.8, 2.2, 22); hull.translate(0, 1.1, 0);
         const roof = new T.BoxGeometry(7.2, 0.3, 16); roof.translate(0, 3.4, -1);
         return mergeGeometries([hull, roof], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 5.70, 22.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 6.0, 24.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 80-ton bollard-pull ASD ship-handling escort tugboat (10.0x32.0m, 12.0m high)
 */
export function maritimeHighendOceanTugboatEscort(seed = "maritime-highend-ocean-tugboat-escort-0") {
  return {
    id: "maritime-highend-ocean-tugboat-escort",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 10.0, d: 32.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 210,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(8.5, 3.8, 28); hull.translate(0, 1.9, 0);
         const house = new T.BoxGeometry(5.5, 4.2, 10); house.translate(0, 5.8, 0);
         const winch = new T.CylinderGeometry(1.2, 1.2, 3.0, 8); winch.rotateZ(Math.PI/2); winch.translate(0, 4.0, -8);
         return mergeGeometries([hull, house, winch], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 11.40, 30.40);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 12.0, 32.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Deepsea stern ramp refrigerated fishing trawler vessel (8.0x32.0m, 14.0m high)
 */
export function maritimeHighendCommercialTrawler(seed = "maritime-highend-commercial-trawler-0") {
  return {
    id: "maritime-highend-commercial-trawler",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 8.0, d: 32.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(6.8, 3.5, 28); hull.translate(0, 1.75, 0);
         const bridge = new T.BoxGeometry(5.0, 3.5, 6); bridge.translate(0, 5.25, 6);
         const gantry = new T.BoxGeometry(5.5, 6.0, 1.2); gantry.translate(0, 6.5, -10);
         return mergeGeometries([hull, bridge, gantry], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 13.30, 30.40);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 14.0, 32.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Double-ended Roll-on/Roll-off (RoRo) passenger vehicle ferry (18.0x64.0m, 18.0m high)
 */
export function maritimeHighendCarFerryRollOnRollOff(seed = "maritime-highend-car-ferry-roll-on-roll-off-0") {
  return {
    id: "maritime-highend-car-ferry-roll-on-roll-off",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 18.0, d: 64.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 200,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(16, 5.5, 58); hull.translate(0, 2.75, 0);
         const bridge = new T.BoxGeometry(14, 6.0, 16); bridge.translate(0, 8.5, -10);
         const visor = new T.BoxGeometry(12, 4.0, 4); visor.translate(0, 4.5, 26);
         return mergeGeometries([hull, bridge, visor], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(17.10, 17.10, 60.80);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(18.0, 18.0, 64.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 3000 DWT general cargo coastal feeder vessel (16.0x64.0m, 16.0m high)
 */
export function maritimeHighendCoastalCargoFeeder(seed = "maritime-highend-coastal-cargo-feeder-0") {
  return {
    id: "maritime-highend-coastal-cargo-feeder",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 16.0, d: 64.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(14, 4.8, 58); hull.translate(0, 2.4, 0);
         const hold = new T.BoxGeometry(12, 3.5, 36); hold.translate(0, 4.0, 4);
         const aft = new T.BoxGeometry(12, 8.0, 10); aft.translate(0, 6.5, -20);
         return mergeGeometries([hull, hold, aft], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 15.20, 60.80);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 16.0, 64.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: High-volume water cannon harbor emergency response fireboat (6.0x24.0m, 9.0m high)
 */
export function maritimeHighendHarborFireboatMonitor(seed = "maritime-highend-harbor-fireboat-monitor-0") {
  return {
    id: "maritime-highend-harbor-fireboat-monitor",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 6.0, d: 24.0 },
    height: 9.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(5.2, 2.4, 20); hull.translate(0, 1.2, 0);
         const house = new T.BoxGeometry(3.6, 2.8, 7); house.translate(0, 3.8, -1);
         const cannon = new T.CylinderGeometry(0.15, 0.2, 2.0, 6); cannon.translate(0, 6.0, 4);
         return mergeGeometries([hull, house, cannon], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 8.55, 22.80);
          b.translate(0, 4.27, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 9.0, 24.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Oceanographic survey and marine biology research vessel with stern A-frame (12.0x48.0m, 16.0m high)
 */
export function maritimeHighendScientificResearchVessel(seed = "maritime-highend-scientific-research-vessel-0") {
  return {
    id: "maritime-highend-scientific-research-vessel",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 12.0, d: 48.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(10, 4.0, 44); hull.translate(0, 2.0, 0);
         const superstr = new T.BoxGeometry(8, 6.5, 18); superstr.translate(0, 7.0, 4);
         const aframe = new T.BoxGeometry(6, 6.0, 1.2); aframe.translate(0, 6.0, -18);
         return mergeGeometries([hull, superstr, aframe], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 15.20, 45.60);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 16.0, 48.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Fast offshore platform supply and oil rig crew transfer vessel (10.0x40.0m, 12.0m high)
 */
export function maritimeHighendOffshoreCrewSupplyVessel(seed = "maritime-highend-offshore-crew-supply-vessel-0") {
  return {
    id: "maritime-highend-offshore-crew-supply-vessel",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 10.0, d: 40.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(8.5, 3.5, 36); hull.translate(0, 1.75, 0);
         const house = new T.BoxGeometry(6.5, 5.5, 10); house.translate(0, 6.0, 10);
         const deck = new T.BoxGeometry(7.5, 0.4, 18); deck.translate(0, 3.7, -6);
         return mergeGeometries([hull, house, deck], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 11.40, 38.00);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 12.0, 40.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Restored Victorian river paddle wheel excursion steamer (14.0x48.0m, 14.0m high)
 */
export function maritimeHighendHistoricPaddleSteamer(seed = "maritime-highend-historic-paddle-steamer-0") {
  return {
    id: "maritime-highend-historic-paddle-steamer",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 14.0, d: 48.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 205,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(10, 3.0, 44); hull.translate(0, 1.5, 0);
         const boxL = new T.BoxGeometry(2.2, 4.0, 6.0); boxL.translate(-5.5, 2.5, 0);
         const boxR = new T.BoxGeometry(2.2, 4.0, 6.0); boxR.translate(5.5, 2.5, 0);
         const stack = new T.CylinderGeometry(0.8, 0.8, 8.0, 8); stack.translate(0, 8.5, 0);
         return mergeGeometries([hull, boxL, boxR, stack], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 13.30, 45.60);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 14.0, 48.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Rail-mounted luffing jib harbor wharf cargo crane (8.0x25.0m, 28.0m high)
 */
export function maritimeHighendQuaysidePortalWharfCrane(seed = "maritime-highend-quayside-portal-wharf-crane-0") {
  return {
    id: "maritime-highend-quayside-portal-wharf-crane",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 8.0, d: 25.0 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const portal = new T.BoxGeometry(7.0, 10.0, 8.0); portal.translate(0, 5.0, 0);
         const cab = new T.BoxGeometry(3.5, 3.5, 4.0); cab.translate(0, 12.0, 0);
         const jib = new T.BoxGeometry(1.2, 1.2, 18.0); jib.rotateX(-0.5); jib.translate(0, 18.0, 4);
         return mergeGeometries([portal, cab, jib], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 26.60, 23.75);
          b.translate(0, 13.30, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 28.0, 25.0);
          b.translate(0, 14.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Trailing suction hopper channel maintenance dredger ship (14.0x56.0m, 20.6m high)
 */
export function maritimeHighendDredgerVesselHopper(seed = "maritime-highend-dredger-vessel-hopper-0") {
  return {
    id: "maritime-highend-dredger-vessel-hopper",
    tier: "highend",
    category: "maritime",
    kind: "hard",
    footprint: { w: 14.0, d: 56.0 },
    height: 20.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(12, 4.5, 52); hull.translate(0, 2.25, 0);
         const hopper = new T.BoxGeometry(9, 3.0, 24); hopper.translate(0, 4.0, 0);
         const pipe = new T.CylinderGeometry(0.4, 0.4, 22, 6); pipe.rotateX(0.4); pipe.translate(6.2, 2.0, 0);
         const _m = mergeGeometries([hull, hopper, pipe], T);; _m.translate(0, 8.287, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 19.57, 53.20);
          b.translate(0, 9.79, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 20.6, 56.0);
          b.translate(0, 10.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Commercial steel workboat harbor utility service tender (4.0x14.0m, 5.0m high)
 */
export function maritimeMidhighHarborServiceLaunch(seed = "maritime-midhigh-harbor-service-launch-0") {
  return {
    id: "maritime-midhigh-harbor-service-launch",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 4.0, d: 14.0 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(3.4, 1.5, 12); hull.translate(0, 0.75, 0);
         const cabin = new T.BoxGeometry(2.4, 1.8, 5); cabin.translate(0, 2.4, -1);
         return mergeGeometries([hull, cabin], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 4.75, 13.30);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 5.0, 14.0);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Inshore pot lobster fishing coble with forward cuddy (3.5x10.0m, 4.0m high)
 */
export function maritimeMidhighCoastalFishingCoble(seed = "maritime-midhigh-coastal-fishing-coble-0") {
  return {
    id: "maritime-midhigh-coastal-fishing-coble",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 3.5, d: 10.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(3.0, 1.3, 8.8); hull.translate(0, 0.65, 0);
         const shelter = new T.BoxGeometry(2.2, 1.4, 3.0); shelter.translate(0, 2.0, 1.8);
         return mergeGeometries([hull, shelter], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.32, 3.80, 9.50);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.5, 4.0, 10.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Welded flat-deck heavy industrial aggregate transport cargo barge (12.0x36.0m, 4.0m high)
 */
export function maritimeMidhighSteelDeckCargoBarge(seed = "maritime-midhigh-steel-deck-cargo-barge-0") {
  return {
    id: "maritime-midhigh-steel-deck-cargo-barge",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 12.0, d: 36.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const barge = new T.BoxGeometry(10.5, 2.4, 32); barge.translate(0, 1.2, 0); return barge;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 3.80, 34.20);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 4.0, 36.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Floating pedestrian ferry terminal pontoon with articulated gangway (10.0x32.0m, 4.0m high)
 */
export function maritimeMidhighPontoonFerryLandingStage(seed = "maritime-midhigh-pontoon-ferry-landing-stage-0") {
  return {
    id: "maritime-midhigh-pontoon-ferry-landing-stage",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 10.0, d: 32.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(8.5, 1.2, 22); deck.translate(0, 0.6, 0);
         const gangway = new T.BoxGeometry(3.0, 0.8, 12); gangway.rotateX(0.18); gangway.translate(0, 2.0, 10);
         return mergeGeometries([deck, gangway], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 3.80, 30.40);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 4.0, 32.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Twin-outboard offshore coast guard Rigid Inflatable Boat (RIB) (2.8x8.5m, 2.8m high)
 */
export function maritimeMidhighRigidInflatableRescueRib(seed = "maritime-midhigh-rigid-inflatable-rescue-rib-0") {
  return {
    id: "maritime-midhigh-rigid-inflatable-rescue-rib",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 2.8, d: 8.5 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const collar = new T.BoxGeometry(2.4, 0.6, 7.8); collar.translate(0, 0.45, 0);
         const console = new T.BoxGeometry(1.0, 1.2, 1.2); console.translate(0, 1.2, -0.5);
         const arch = new T.BoxGeometry(1.6, 1.4, 0.2); arch.translate(0, 1.6, -3.2);
         return mergeGeometries([collar, console, arch], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.66, 2.66, 8.07);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 2.8, 8.5);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Cylindrical masonry coastal navigation lighthouse beacon tower (7.0x7.0m, 18.0m high)
 */
export function maritimeMidhighNavigationChannelLighthouse(seed = "maritime-midhigh-navigation-channel-lighthouse-0") {
  return {
    id: "maritime-midhigh-navigation-channel-lighthouse",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 7.0, d: 7.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(2.5, 3.5, 14, 10); base.translate(0, 7, 0);
         const lantern = new T.CylinderGeometry(1.8, 1.8, 3.2, 8); lantern.translate(0, 15.6, 0);
         return mergeGeometries([base, lantern], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.65, 17.10, 6.65);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.0, 18.0, 7.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Driven heavy timber multi-pile berthing dolphin cluster (4.0x4.0m, 6.0m high)
 */
export function maritimeMidhighTimberMooringDolphinCluster(seed = "maritime-midhigh-timber-mooring-dolphin-cluster-0") {
  return {
    id: "maritime-midhigh-timber-mooring-dolphin-cluster",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const p1 = new T.CylinderGeometry(0.25, 0.25, 5.5, 6); p1.translate(-0.8, 2.75, -0.8);
         const p2 = new T.CylinderGeometry(0.25, 0.25, 5.5, 6); p2.translate(0.8, 2.75, -0.8);
         const p3 = new T.CylinderGeometry(0.25, 0.25, 5.5, 6); p3.translate(0, 2.75, 0.8);
         return mergeGeometries([p1, p2, p3], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 5.70, 3.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 6.0, 4.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Spud barge with mounted lattice-boom clamshell bucket excavator (10.0x20.0m, 14.0m high)
 */
export function maritimeMidhighClamShellDredgingCraneBarge(seed = "maritime-midhigh-clam-shell-dredging-crane-barge-0") {
  return {
    id: "maritime-midhigh-clam-shell-dredging-crane-barge",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 10.0, d: 20.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const pontoon = new T.BoxGeometry(8.5, 1.8, 18); pontoon.translate(0, 0.9, 0);
         const crane = new T.BoxGeometry(3.2, 3.0, 3.5); crane.translate(0, 3.2, -4);
         const boom = new T.BoxGeometry(0.6, 0.6, 12); boom.rotateX(-0.6); boom.translate(0, 7.5, 2);
         return mergeGeometries([pontoon, crane, boom], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 13.30, 19.00);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 14.0, 20.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Coastal marine diesel bunkering refueling tanker (8.0x32.0m, 7.0m high)
 */
export function maritimeMidhighHarborBunkeringTankerSmall(seed = "maritime-midhigh-harbor-bunkering-tanker-small-0") {
  return {
    id: "maritime-midhigh-harbor-bunkering-tanker-small",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 8.0, d: 32.0 },
    height: 7.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(6.8, 2.6, 28); hull.translate(0, 1.3, 0);
         const bridge = new T.BoxGeometry(5.0, 3.5, 6); bridge.translate(0, 4.3, -10);
         return mergeGeometries([hull, bridge], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 6.65, 30.40);
          b.translate(0, 3.32, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 7.0, 32.0);
          b.translate(0, 3.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Boatyard travel-lift mobile straddle hoist marina gantry (8.0x12.0m, 8.0m high)
 */
export function maritimeMidhighMarineBoatLiftHoistDock(seed = "maritime-midhigh-marine-boat-lift-hoist-dock-0") {
  return {
    id: "maritime-midhigh-marine-boat-lift-hoist-dock",
    tier: "midhigh",
    category: "maritime",
    kind: "hard",
    footprint: { w: 8.0, d: 12.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(7.2, 7.0, 10.5); frame.translate(0, 3.5, 0); return frame;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 7.60, 11.40);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 8.0, 12.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Aluminum utility open skiff fishing boat with outboard engine (2.0x5.5m, 1.4m high)
 */
export function maritimeMidOpenSkiffUtilityOutboard(seed = "maritime-mid-open-skiff-utility-outboard-0") {
  return {
    id: "maritime-mid-open-skiff-utility-outboard",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 2.0, d: 5.5 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(1.7, 0.6, 5.0); hull.translate(0, 0.4, 0);
         const motor = new T.BoxGeometry(0.3, 0.6, 0.3); motor.translate(0, 0.7, -2.4);
         return mergeGeometries([hull, motor], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.33, 5.22);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.4, 5.5);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Lateral port-hand green can marine navigational channel marker buoy (1.8x1.8m, 3.5m high)
 */
export function maritimeMidMooredChannelBuoyCan(seed = "maritime-mid-moored-channel-buoy-can-0") {
  return {
    id: "maritime-mid-moored-channel-buoy-can",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.8, d: 1.8 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 54,
        createGeometry: (T = THREE) => {
          const float = new T.CylinderGeometry(0.8, 0.8, 1.2, 8); float.translate(0, 0.8, 0);
         const tower = new T.BoxGeometry(0.6, 1.8, 0.6); tower.translate(0, 2.2, 0);
         return mergeGeometries([float, tower], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 3.32, 1.71);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 3.5, 1.8);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: North cardinal mark spar navigation warning buoy with top-cones (1.6x1.6m, 4.8m high)
 */
export function maritimeMidCardinalNavigationSparBuoy(seed = "maritime-mid-cardinal-navigation-spar-buoy-0") {
  return {
    id: "maritime-mid-cardinal-navigation-spar-buoy",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.6, d: 1.6 },
    height: 4.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const buoy = new T.CylinderGeometry(0.3, 0.4, 3.6, 8); buoy.translate(0, 1.8, 0);
         const cones = new T.ConeGeometry(0.4, 0.8, 6); cones.translate(0, 4.0, 0);
         return mergeGeometries([buoy, cones], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.52, 4.56, 1.52);
          b.translate(0, 2.28, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 4.8, 1.6);
          b.translate(0, 2.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Straight timber recreational fishing and mooring jetty (4.0x16.0m, 2.4m high)
 */
export function maritimeMidFixedPileTimberJetty(seed = "maritime-mid-fixed-pile-timber-jetty-0") {
  return {
    id: "maritime-mid-fixed-pile-timber-jetty",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 4.0, d: 16.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(3.2, 0.25, 14.5); deck.translate(0, 1.8, 0);
         const piles = new T.BoxGeometry(2.8, 1.6, 14.0); piles.translate(0, 0.8, 0);
         return mergeGeometries([deck, piles], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 2.28, 15.20);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 2.4, 16.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Outdoor cedar multi-tier kayak and canoe storage rack (2.2x4.8m, 2.2m high)
 */
export function maritimeMidCanoeKayakRackStorage(seed = "maritime-mid-canoe-kayak-rack-storage-0") {
  return {
    id: "maritime-mid-canoe-kayak-rack-storage",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 2.2, d: 4.8 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const rack = new T.BoxGeometry(1.8, 1.9, 4.2); rack.translate(0, 0.95, 0); return rack;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 2.09, 4.56);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 2.2, 4.8);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Quayside cast iron twin-horn marine mooring bollard (1.2x0.8m, 0.8m high)
 */
export function maritimeMidHeavyMooringCleatBollard(seed = "maritime-mid-heavy-mooring-cleat-bollard-0") {
  return {
    id: "maritime-mid-heavy-mooring-cleat-bollard",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.2, d: 0.8 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(0.8, 0.2, 0.5); base.translate(0, 0.1, 0);
         const bitt = new T.CylinderGeometry(0.15, 0.15, 0.5, 8); bitt.translate(0, 0.4, 0);
         const pin = new T.CylinderGeometry(0.08, 0.08, 0.9, 6); pin.rotateZ(Math.PI/2); pin.translate(0, 0.55, 0);
         return mergeGeometries([base, bitt, pin], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 0.76, 0.76);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 0.8, 0.8);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Compact roll-up inflatable yacht tender dinghy (1.8x3.8m, 1.1m high)
 */
export function maritimeMidInflatableRescueDinghy(seed = "maritime-mid-inflatable-rescue-dinghy-0") {
  return {
    id: "maritime-mid-inflatable-rescue-dinghy",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.8, d: 3.8 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const ring = new T.BoxGeometry(1.5, 0.4, 3.4); ring.translate(0, 0.3, 0); return ring;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.04, 3.61);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.1, 3.8);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Heavy shipyard diesel engine-driven mobile welding power unit (1.6x2.4m, 1.6m high)
 */
export function maritimeMidShipyardWeldingGeneratorCart(seed = "maritime-mid-shipyard-welding-generator-cart-0") {
  return {
    id: "maritime-mid-shipyard-welding-generator-cart",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.6, d: 2.4 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(1.2, 1.1, 1.8); box.translate(0, 0.7, 0); return box;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.52, 1.52, 2.28);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 1.6, 2.4);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Marina dockside marine fuel and lubricant dispenser pump (1.2x1.2m, 2.0m high)
 */
export function maritimeMidMarineFuelDispenserPump(seed = "maritime-mid-marine-fuel-dispenser-pump-0") {
  return {
    id: "maritime-mid-marine-fuel-dispenser-pump",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const pump = new T.BoxGeometry(0.7, 1.7, 0.7); pump.translate(0, 0.85, 0); return pump;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.90, 1.14);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 2.0, 1.2);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Floating harbor automated surface debris trash skimmer collection pod (1.8x2.4m, 1.2m high)
 */
export function maritimeMidHarborTrashSkimmerBin(seed = "maritime-mid-harbor-trash-skimmer-bin-0") {
  return {
    id: "maritime-mid-harbor-trash-skimmer-bin",
    tier: "mid",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.8, d: 2.4 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 45,
        createGeometry: (T = THREE) => {
          const bin = new T.BoxGeometry(1.4, 0.9, 1.8); bin.translate(0, 0.5, 0); return bin;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.14, 2.28);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.2, 2.4);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Clinker-built wooden rowing dinghy with wooden oars (1.6x3.8m, 0.8m high)
 */
export function maritimeMidlowWoodenRowboatOars(seed = "maritime-midlow-wooden-rowboat-oars-0") {
  return {
    id: "maritime-midlow-wooden-rowboat-oars",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.6, d: 3.8 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(1.3, 0.5, 3.4); hull.translate(0, 0.3, 0);
         const seat = new T.BoxGeometry(1.2, 0.05, 0.3); seat.translate(0, 0.35, 0);
         return mergeGeometries([hull, seat], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.52, 0.76, 3.61);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 0.8, 3.8);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Stack of wooden and wire mesh commercial lobster crab creel pots (1.4x1.4m, 1.2m high)
 */
export function maritimeMidlowStackedLobsterTraps(seed = "maritime-midlow-stacked-lobster-traps-0") {
  return {
    id: "maritime-midlow-stacked-lobster-traps",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.4, d: 1.4 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const t1 = new T.BoxGeometry(1.1, 0.35, 1.1); t1.translate(0, 0.175, 0);
         const t2 = new T.BoxGeometry(1.1, 0.35, 1.1); t2.translate(0, 0.55, 0);
         const t3 = new T.BoxGeometry(1.1, 0.35, 1.1); t3.translate(0, 0.925, 0);
         return mergeGeometries([t1, t2, t3], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 1.14, 1.33);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.2, 1.4);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Cylindrical marine vinyl inflatable boat fender buoy (0.6x0.6m, 1.1m high)
 */
export function maritimeMidlowFloatingPolyFenderBuoy(seed = "maritime-midlow-floating-poly-fender-buoy-0") {
  return {
    id: "maritime-midlow-floating-poly-fender-buoy",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const body = new T.CylinderGeometry(0.22, 0.22, 0.8, 8); body.translate(0, 0.45, 0);
         const eye = new T.TorusGeometry(0.08, 0.03, 6, 8); eye.translate(0, 0.95, 0);
         return mergeGeometries([body, eye], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.04, 0.57);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.1, 0.6);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Flaked spiral coil of heavy 3-strand nylon mooring hawser rope (1.0x1.0m, 0.4m high)
 */
export function maritimeMidlowDocksideRopeCoil(seed = "maritime-midlow-dockside-rope-coil-0") {
  return {
    id: "maritime-midlow-dockside-rope-coil",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.0, d: 1.0 },
    height: 0.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const ring = new T.TorusGeometry(0.35, 0.12, 8, 12); ring.rotateX(Math.PI/2); ring.translate(0, 0.15, 0); return ring;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.38, 0.95);
          b.translate(0, 0.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.4, 1.0);
          b.translate(0, 0.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Galvanized steel pivoting fluke Danforth boat anchor (1.0x1.2m, 0.8m high)
 */
export function maritimeMidlowDanforthFlukeAnchor(seed = "maritime-midlow-danforth-fluke-anchor-0") {
  return {
    id: "maritime-midlow-danforth-fluke-anchor",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.0, d: 1.2 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const shank = new T.BoxGeometry(0.08, 0.08, 0.9); shank.translate(0, 0.3, 0);
         const flukes = new T.BoxGeometry(0.7, 0.05, 0.4); flukes.translate(0, 0.1, -0.3);
         return mergeGeometries([shank, flukes], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.76, 1.14);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.8, 1.2);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Fixed aluminum seawall and pontoon safety boarding ladder (0.6x0.4m, 1.8m high)
 */
export function maritimeMidlowDockLadderAluminum(seed = "maritime-midlow-dock-ladder-aluminum-0") {
  return {
    id: "maritime-midlow-dock-ladder-aluminum",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 0.6, d: 0.4 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const ladder = new T.BoxGeometry(0.45, 1.6, 0.15); ladder.translate(0, 0.8, 0); return ladder;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.71, 0.38);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.8, 0.4);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Stacked high-density plastic fish processing catch totes (1.2x1.2m, 0.9m high)
 */
export function maritimeMidlowFishToteIceCrates(seed = "maritime-midlow-fish-tote-ice-crates-0") {
  return {
    id: "maritime-midlow-fish-tote-ice-crates",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const c1 = new T.BoxGeometry(0.9, 0.35, 0.9); c1.translate(0, 0.2, 0);
         const c2 = new T.BoxGeometry(0.9, 0.35, 0.9); c2.translate(0, 0.6, 0);
         return mergeGeometries([c1, c2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 0.85, 1.14);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 0.9, 1.2);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Treated timber dock piling with conical white protective pile cap (0.8x0.8m, 1.8m high)
 */
export function maritimeMidlowMooringPileCap(seed = "maritime-midlow-mooring-pile-cap-0") {
  return {
    id: "maritime-midlow-mooring-pile-cap",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const pile = new T.CylinderGeometry(0.25, 0.25, 1.5, 8); pile.translate(0, 0.75, 0);
         const cap = new T.ConeGeometry(0.28, 0.2, 8); cap.translate(0, 1.6, 0);
         return mergeGeometries([pile, cap], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.71, 0.76);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.8, 0.8);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Rotomolded polyethylene sit-on-top recreational kayak (0.8x3.2m, 0.5m high)
 */
export function maritimeMidlowKayakSinglePlastic(seed = "maritime-midlow-kayak-single-plastic-0") {
  return {
    id: "maritime-midlow-kayak-single-plastic",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 0.8, d: 3.2 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(0.65, 0.3, 3.0); hull.translate(0, 0.2, 0); return hull;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.47, 3.04);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 0.5, 3.2);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Quayside emergency throw ring station on tubular pedestal (0.8x0.6m, 1.8m high)
 */
export function maritimeMidlowQuaysideSafetyRingPost(seed = "maritime-midlow-quayside-safety-ring-post-0") {
  return {
    id: "maritime-midlow-quayside-safety-ring-post",
    tier: "midlow",
    category: "maritime",
    kind: "hard",
    footprint: { w: 0.8, d: 0.6 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.04, 0.04, 1.6, 6); pole.translate(0, 0.8, 0);
         const ring = new T.TorusGeometry(0.28, 0.06, 6, 10); ring.translate(0, 1.2, 0.1);
         return mergeGeometries([pole, ring], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.71, 0.57);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.8, 0.6);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Delta-wing supersonic commercial airliner with droop nose (24.0x62.0m, 11.5m high)
 */
export function aircraftShowstopperSupersonicConcorde(seed = "aircraft-showstopper-supersonic-concorde-0") {
  return {
    id: "aircraft-showstopper-supersonic-concorde",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 24.0, d: 62.0 },
    height: 11.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(1.4, 1.4, 58, 16); fus.rotateX(Math.PI / 2); fus.translate(0, 3.5, 0);
         const wing = new T.BoxGeometry(22, 0.4, 26); wing.translate(0, 3.0, -4);
         const fin = new T.BoxGeometry(0.3, 7.5, 8); fin.translate(0, 7.25, -22);
         return mergeGeometries([fus, wing, fin], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 10.92, 58.90);
          b.translate(0, 5.46, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 11.5, 62.0);
          b.translate(0, 5.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Double-deck wide-body four-engine flagship long-haul airliner (64.0x72.0m, 22.0m high)
 */
export function aircraftShowstopperJumboQuadAirliner(seed = "aircraft-showstopper-jumbo-quad-airliner-0") {
  return {
    id: "aircraft-showstopper-jumbo-quad-airliner",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 64.0, d: 72.0 },
    height: 22.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(3.2, 3.2, 68, 16); fus.rotateX(Math.PI / 2); fus.translate(0, 6.0, 0);
         const wing = new T.BoxGeometry(62, 0.8, 22); wing.translate(0, 5.5, -2);
         const tail = new T.BoxGeometry(0.6, 14, 12); tail.translate(0, 14.5, -26);
         return mergeGeometries([fus, wing, tail], T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 20.90, 68.40);
          b.translate(0, 10.45, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 22.0, 72.0);
          b.translate(0, 11.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 64m Clear-span columnless composite arch airliner maintenance hangar (64.0x64.0m, 26.0m high)
 */
export function aviationShowstopperCantileverHangarArch(seed = "aviation-showstopper-cantilever-hangar-arch-0") {
  return {
    id: "aviation-showstopper-cantilever-hangar-arch",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 64.0, d: 64.0 },
    height: 26.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 530,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(62, 1.2, 62); slab.translate(0, 0.6, 0);
         const arch = new T.CylinderGeometry(30, 30, 60, 16, 1, true, 0, Math.PI);
         arch.rotateZ(Math.PI / 2); arch.scale(1, 0.8, 0.95); arch.translate(0, 0, 0);
         const door = new T.BoxGeometry(56, 18, 1.5); door.translate(0, 9, 28);
         return mergeGeometries([slab, arch, door], T);
        },
      },
      {
        level: 1,
        tris: 66,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60.80, 24.70, 60.80);
          b.translate(0, 12.35, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(64.0, 26.0, 64.0);
          b.translate(0, 13.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 72m Parametric twisting hyperboloid air traffic control tower (24.0x24.0m, 73.2m high)
 */
export function aviationShowstopperAtcControlTowerHyperboloid(seed = "aviation-showstopper-atc-control-tower-hyperboloid-0") {
  return {
    id: "aviation-showstopper-atc-control-tower-hyperboloid",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 24.0, d: 24.0 },
    height: 73.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const shaft = new T.CylinderGeometry(3.5, 6.5, 58, 12); shaft.translate(0, 29, 0);
         const cab = new T.CylinderGeometry(10.5, 8.5, 10, 16); cab.translate(0, 63, 0);
         const radome = new T.SphereGeometry(3.2, 10, 8); radome.translate(0, 70, 0);
         return mergeGeometries([shaft, cab, radome], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 69.54, 22.80);
          b.translate(0, 34.77, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 73.2, 24.0);
          b.translate(0, 36.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Next-gen heavy military tiltrotor VTOL tactical transport (24.0x18.0m, 7.5m high)
 */
export function aircraftShowstopperTiltrotorVtolHeavy(seed = "aircraft-showstopper-tiltrotor-vtol-heavy-0") {
  return {
    id: "aircraft-showstopper-tiltrotor-vtol-heavy",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 24.0, d: 18.0 },
    height: 7.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "runway", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(4.0, 3.2, 16); body.translate(0, 2.6, 0);
         const wing = new T.BoxGeometry(22, 0.6, 3.0); wing.translate(0, 4.2, 0);
         const p1 = new T.CylinderGeometry(0.8, 0.8, 2.2, 8); p1.translate(-10, 5.2, 0);
         const p2 = new T.CylinderGeometry(0.8, 0.8, 2.2, 8); p2.translate(10, 5.2, 0);
         return mergeGeometries([body, wing, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 7.12, 17.10);
          b.translate(0, 3.56, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 7.5, 18.0);
          b.translate(0, 3.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Blended-wing-body zero-emission hydrogen test airliner (48.0x24.0m, 6.5m high)
 */
export function aircraftShowstopperFlyingWingBlendedBody(seed = "aircraft-showstopper-flying-wing-blended-body-0") {
  return {
    id: "aircraft-showstopper-flying-wing-blended-body",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 48.0, d: 24.0 },
    height: 6.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const center = new T.BoxGeometry(14, 3.8, 20); center.translate(0, 2.4, 0);
         const wingL = new T.BoxGeometry(18, 1.2, 14); wingL.translate(-15, 2.0, -3);
         const wingR = new T.BoxGeometry(18, 1.2, 14); wingR.translate(15, 2.0, -3);
         return mergeGeometries([center, wingL, wingR], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.60, 6.17, 22.80);
          b.translate(0, 3.09, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(48.0, 6.5, 24.0);
          b.translate(0, 3.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Multi-engine heavy aerial firefighting retardant air tanker (40.0x44.0m, 12.0m high)
 */
export function aircraftShowstopperHeavyFirefightingAirtanker(seed = "aircraft-showstopper-heavy-firefighting-airtanker-0") {
  return {
    id: "aircraft-showstopper-heavy-firefighting-airtanker",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 40.0, d: 44.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(2.4, 2.4, 40, 12); fus.rotateX(Math.PI/2); fus.translate(0, 4.0, 0);
         const wing = new T.BoxGeometry(38, 0.8, 12); wing.translate(0, 5.2, 2);
         const pod = new T.BoxGeometry(3.6, 1.8, 16); pod.translate(0, 1.2, 0);
         return mergeGeometries([fus, wing, pod], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 11.40, 41.80);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 12.0, 44.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Tandem-rotor heavy-lift logistics helicopter (8.0x32.0m, 7.5m high)
 */
export function aircraftShowstopperTwinRotorHeavyLiftHelicopter(seed = "aircraft-showstopper-twin-rotor-heavy-lift-helicopter-0") {
  return {
    id: "aircraft-showstopper-twin-rotor-heavy-lift-helicopter",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 8.0, d: 32.0 },
    height: 7.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "runway", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(3.8, 3.6, 18); body.translate(0, 3.0, 0);
         const pylon1 = new T.BoxGeometry(1.4, 2.0, 2.0); pylon1.translate(0, 5.8, 7.5);
         const pylon2 = new T.BoxGeometry(1.4, 2.0, 2.0); pylon2.translate(0, 6.2, -7.5);
         return mergeGeometries([body, pylon1, pylon2], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 7.12, 30.40);
          b.translate(0, 3.56, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 7.5, 32.0);
          b.translate(0, 3.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Airport satellite rotunda gate concourse with dual boarding bridges (56.0x56.0m, 19.3m high)
 */
export function aviationShowstopperTerminalPierSatelliteRotunda(seed = "aviation-showstopper-terminal-pier-satellite-rotunda-0") {
  return {
    id: "aviation-showstopper-terminal-pier-satellite-rotunda",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 56.0, d: 56.0 },
    height: 19.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 530,
        createGeometry: (T = THREE) => {
          const core = new T.CylinderGeometry(24, 26, 8, 16); core.translate(0, 4, 0);
         const dome = new T.SphereGeometry(24, 16, 10); dome.scale(1, 0.4, 1); dome.translate(0, 8, 0);
         const bridge1 = new T.BoxGeometry(6, 4, 22); bridge1.translate(-24, 4, 0);
         const bridge2 = new T.BoxGeometry(6, 4, 22); bridge2.translate(24, 4, 0);
         const _m = mergeGeometries([core, dome, bridge1, bridge2], T);; _m.translate(0, 1.600, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(53.20, 18.34, 53.20);
          b.translate(0, 9.17, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56.0, 19.3, 56.0);
          b.translate(0, 9.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Precision military aerobatic display lead jet aircraft (12.0x16.0m, 4.5m high)
 */
export function aircraftShowstopperAerobaticFormationLeadJet(seed = "aircraft-showstopper-aerobatic-formation-lead-jet-0") {
  return {
    id: "aircraft-showstopper-aerobatic-formation-lead-jet",
    tier: "showstopper",
    category: "aviation",
    kind: "hard",
    footprint: { w: 12.0, d: 16.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const fus = new T.ConeGeometry(1.0, 15, 8); fus.rotateX(Math.PI/2); fus.translate(0, 1.8, 0);
         const delta = new T.BoxGeometry(11, 0.25, 7); delta.translate(0, 1.8, -2);
         const tail = new T.BoxGeometry(0.2, 2.5, 3.0); tail.translate(0, 3.1, -6);
         return mergeGeometries([fus, delta, tail], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 4.27, 15.20);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 4.5, 16.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Intercontinental ultra-long-range VIP business jet with T-tail (28.0x32.0m, 7.8m high)
 */
export function aircraftLuxuryUltraLongRangePrivateJet(seed = "aircraft-luxury-ultra-long-range-private-jet-0") {
  return {
    id: "aircraft-luxury-ultra-long-range-private-jet",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 28.0, d: 32.0 },
    height: 7.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 320,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(1.2, 1.2, 30, 12); fus.rotateX(Math.PI / 2); fus.translate(0, 2.5, 0);
         const wing = new T.BoxGeometry(26, 0.3, 7.5); wing.translate(0, 2.2, -1);
         const tail = new T.BoxGeometry(8.5, 0.3, 4.0); tail.translate(0, 7.0, -13);
         const fin = new T.BoxGeometry(0.3, 5.0, 5.0); fin.translate(0, 4.8, -12.5);
         return mergeGeometries([fus, wing, tail, fin], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(26.60, 7.41, 30.40);
          b.translate(0, 3.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(28.0, 7.8, 32.0);
          b.translate(0, 3.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Executive VIP twin-engine corporate transport helicopter (4.0x17.0m, 4.6m high)
 */
export function aircraftLuxuryTwinTurbineExecutiveHelicopter(seed = "aircraft-luxury-twin-turbine-executive-helicopter-0") {
  return {
    id: "aircraft-luxury-twin-turbine-executive-helicopter",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 4.0, d: 17.0 },
    height: 4.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "runway", "open"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.4, 2.2, 7.5); body.translate(0, 2.0, 1.5);
         const boom = new T.CylinderGeometry(0.3, 0.5, 7.5, 8); boom.rotateX(Math.PI / 2); boom.translate(0, 2.5, -4.5);
         const skidL = new T.BoxGeometry(0.12, 0.12, 6.0); skidL.translate(-1.1, 0.4, 1.0);
         const skidR = new T.BoxGeometry(0.12, 0.12, 6.0); skidR.translate(1.1, 0.4, 1.0);
         return mergeGeometries([body, boom, skidL, skidR], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 4.37, 16.15);
          b.translate(0, 2.18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 4.6, 17.0);
          b.translate(0, 2.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Fixed-base operator (FBO) VIP private aviation executive terminal (32.0x32.0m, 9.0m high)
 */
export function aviationLuxuryFboPrivateTerminalLounge(seed = "aviation-luxury-fbo-private-terminal-lounge-0") {
  return {
    id: "aviation-luxury-fbo-private-terminal-lounge",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 32.0, d: 32.0 },
    height: 9.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const lounge = new T.BoxGeometry(28, 6.5, 20); lounge.translate(0, 3.25, 0);
         const canopy = new T.BoxGeometry(18, 0.8, 12); canopy.translate(0, 7.2, 10);
         return mergeGeometries([lounge, canopy], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30.40, 8.55, 30.40);
          b.translate(0, 4.27, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32.0, 9.0, 32.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Climate-controlled corporate flight department private hangar (40.0x40.0m, 14.0m high)
 */
export function aviationLuxuryPrivateJetHangarExecutive(seed = "aviation-luxury-private-jet-hangar-executive-0") {
  return {
    id: "aviation-luxury-private-jet-hangar-executive",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 40.0, d: 40.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 325,
        createGeometry: (T = THREE) => {
          const hall = new T.BoxGeometry(38, 11.5, 38); hall.translate(0, 5.75, 0);
         const canopy = new T.BoxGeometry(36, 1.5, 8); canopy.translate(0, 12.0, 16);
         return mergeGeometries([hall, canopy], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38.00, 13.30, 38.00);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(40.0, 14.0, 40.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Vintage twin-radial engine amphibious luxury flying boat yacht (24.0x18.0m, 6.2m high)
 */
export function aircraftLuxuryClassicAmphibiousFlyingBoat(seed = "aircraft-luxury-classic-amphibious-flying-boat-0") {
  return {
    id: "aircraft-luxury-classic-amphibious-flying-boat",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 24.0, d: 18.0 },
    height: 6.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["water", "runway", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const hull = new T.BoxGeometry(3.6, 2.6, 16); hull.translate(0, 1.8, 0);
         const wing = new T.BoxGeometry(22, 0.4, 4.5); wing.translate(0, 3.8, 1.0);
         const eng1 = new T.BoxGeometry(1.2, 1.2, 2.4); eng1.translate(-4.5, 4.4, 1.0);
         const eng2 = new T.BoxGeometry(1.2, 1.2, 2.4); eng2.translate(4.5, 4.4, 1.0);
         return mergeGeometries([hull, wing, eng1, eng2], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 5.89, 17.10);
          b.translate(0, 2.94, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 6.2, 18.0);
          b.translate(0, 3.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Dedicated pressurized critical-care aeromedical turboprop aircraft (18.0x16.0m, 5.2m high)
 */
export function aircraftLuxuryAirAmbulanceTurboprop(seed = "aircraft-luxury-air-ambulance-turboprop-0") {
  return {
    id: "aircraft-luxury-air-ambulance-turboprop",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 18.0, d: 16.0 },
    height: 5.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(1.1, 1.1, 14, 10); fus.rotateX(Math.PI/2); fus.translate(0, 1.8, 0);
         const wing = new T.BoxGeometry(17, 0.3, 3.2); wing.translate(0, 2.2, 0);
         const tail = new T.BoxGeometry(5.0, 0.25, 2.0); tail.translate(0, 4.5, -6.5);
         return mergeGeometries([fus, wing, tail], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(17.10, 4.94, 15.20);
          b.translate(0, 2.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(18.0, 5.2, 16.0);
          b.translate(0, 2.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Elevated aluminum rooftop helipad with omnidirectional LED lighting array (16.0x16.0m, 3.5m high)
 */
export function aviationLuxuryHelipadApproachLightingRig(seed = "aviation-luxury-helipad-approach-lighting-rig-0") {
  return {
    id: "aviation-luxury-helipad-approach-lighting-rig",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const pad = new T.CylinderGeometry(6.5, 6.5, 0.5, 16); pad.translate(0, 0.25, 0);
         const pole1 = new T.CylinderGeometry(0.08, 0.08, 2.8, 6); pole1.translate(-6.5, 1.4, -6.5);
         const pole2 = new T.CylinderGeometry(0.08, 0.08, 2.8, 6); pole2.translate(6.5, 1.4, 6.5);
         return mergeGeometries([pad, pole1, pole2], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 3.32, 15.20);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 3.5, 16.0);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: High-performance carbon composite two-seater sport aircraft (10.0x8.0m, 2.8m high)
 */
export function aircraftLuxuryCarbonLightSportMonoplane(seed = "aircraft-luxury-carbon-light-sport-monoplane-0") {
  return {
    id: "aircraft-luxury-carbon-light-sport-monoplane",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 10.0, d: 8.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const fus = new T.ConeGeometry(0.5, 7.5, 8); fus.rotateX(Math.PI/2); fus.translate(0, 1.1, 0);
         const wing = new T.BoxGeometry(9.5, 0.15, 1.8); wing.translate(0, 1.2, 0.5);
         const prop = new T.CylinderGeometry(0.05, 0.05, 1.4, 6); prop.translate(0, 1.1, 3.8);
         return mergeGeometries([fus, wing, prop], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 2.66, 7.60);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 2.8, 8.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Architectural flight operations administration and pilot briefing center (24.0x16.0m, 8.0m high)
 */
export function aviationLuxuryHangarOfficeAnnex(seed = "aviation-luxury-hangar-office-annex-0") {
  return {
    id: "aviation-luxury-hangar-office-annex",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 24.0, d: 16.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const office = new T.BoxGeometry(22, 6.8, 14); office.translate(0, 3.4, 0);
         const glass = new T.BoxGeometry(18, 4.0, 1.5); glass.translate(0, 4.0, 7.2);
         return mergeGeometries([office, glass], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 7.60, 15.20);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 8.0, 16.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 5-Passenger electric vertical takeoff and landing (eVTOL) air taxi (12.0x10.0m, 3.2m high)
 */
export function aircraftLuxuryElectricVerticalTakeoffShuttle(seed = "aircraft-luxury-electric-vertical-takeoff-shuttle-0") {
  return {
    id: "aircraft-luxury-electric-vertical-takeoff-shuttle",
    tier: "luxury",
    category: "aviation",
    kind: "hard",
    footprint: { w: 12.0, d: 10.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "runway", "open"],
    lod: [
      {
        level: 0,
        tris: 295,
        createGeometry: (T = THREE) => {
          const pod = new T.BoxGeometry(2.4, 1.8, 6.5); pod.translate(0, 1.4, 0);
         const wing = new T.BoxGeometry(11.5, 0.25, 1.8); wing.translate(0, 2.0, 0);
         const r1 = new T.CylinderGeometry(0.6, 0.6, 0.1, 8); r1.translate(-5.0, 2.3, 0);
         const r2 = new T.CylinderGeometry(0.6, 0.6, 0.1, 8); r2.translate(5.0, 2.3, 0);
         return mergeGeometries([pod, wing, r1, r2], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 3.04, 9.50);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 3.2, 10.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 70-Seat regional twin-turbofan commercial passenger aircraft (28.0x36.0m, 9.8m high)
 */
export function aircraftHighendRegionalTwinJetAirliner(seed = "aircraft-highend-regional-twin-jet-airliner-0") {
  return {
    id: "aircraft-highend-regional-twin-jet-airliner",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 28.0, d: 36.0 },
    height: 9.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 200,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(1.6, 1.6, 34, 12); fus.rotateX(Math.PI / 2); fus.translate(0, 2.8, 0);
         const wing = new T.BoxGeometry(26, 0.5, 8.5); wing.translate(0, 2.4, -1);
         const tail = new T.BoxGeometry(0.4, 6.2, 5.5); tail.translate(0, 6.2, -15);
         return mergeGeometries([fus, wing, tail], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(26.60, 9.31, 34.20);
          b.translate(0, 4.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(28.0, 9.8, 36.0);
          b.translate(0, 4.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Telescopic apron passenger jet bridge boarding corridor (8.0x24.0m, 6.5m high)
 */
export function aviationHighendMobilePassengerBoardingBridge(seed = "aviation-highend-mobile-passenger-boarding-bridge-0") {
  return {
    id: "aviation-highend-mobile-passenger-boarding-bridge",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 8.0, d: 24.0 },
    height: 6.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const tun = new T.BoxGeometry(3.2, 3.2, 20); tun.translate(0, 4.2, 0);
         const col = new T.BoxGeometry(1.2, 3.5, 1.2); col.translate(0, 1.75, 6);
         return mergeGeometries([tun, col], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 6.17, 22.80);
          b.translate(0, 3.09, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 6.5, 24.0);
          b.translate(0, 3.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Aircraft winter de-icing boom sprayer vehicle (3.4x9.5m, 6.0m high)
 */
export function aviationHighendAircraftDeicingTruck(seed = "aviation-highend-aircraft-deicing-truck-0") {
  return {
    id: "aviation-highend-aircraft-deicing-truck",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 3.4, d: 9.5 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const cab = new T.BoxGeometry(2.8, 2.2, 8.5); cab.translate(0, 1.5, 0);
         const boom = new T.BoxGeometry(0.6, 4.5, 0.6); boom.rotateX(0.4); boom.translate(0, 3.8, 1);
         return mergeGeometries([cab, boom], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.23, 5.70, 9.03);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.4, 6.0, 9.5);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: High-speed runway snowplow with towed rotary broom sweeper (3.8x15.0m, 3.8m high)
 */
export function aviationHighendAirportSnowSweeperPlow(seed = "aviation-highend-airport-snow-sweeper-plow-0") {
  return {
    id: "aviation-highend-airport-snow-sweeper-plow",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 3.8, d: 15.0 },
    height: 3.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const truck = new T.BoxGeometry(3.0, 2.6, 12); truck.translate(0, 1.6, 0);
         const blade = new T.BoxGeometry(3.6, 1.2, 0.4); blade.rotateY(0.3); blade.translate(0, 0.8, 6.5);
         return mergeGeometries([truck, blade], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.61, 3.61, 14.25);
          b.translate(0, 1.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.8, 3.8, 15.0);
          b.translate(0, 1.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Instrument Landing System (ILS) runway localizer antenna array (24.0x4.0m, 3.5m high)
 */
export function aviationHighendIlsLocalizerAntennaArray(seed = "aviation-highend-ils-localizer-antenna-array-0") {
  return {
    id: "aviation-highend-ils-localizer-antenna-array",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 24.0, d: 4.0 },
    height: 3.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(22, 0.4, 0.8); frame.translate(0, 1.8, 0);
         const legs = new T.BoxGeometry(22, 1.8, 0.8); legs.translate(0, 0.9, 0);
         return mergeGeometries([frame, legs], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.80, 3.32, 3.80);
          b.translate(0, 1.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24.0, 3.5, 4.0);
          b.translate(0, 1.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Apron under-wing pressurized aviation fuel hydrant servicer truck (2.6x8.5m, 3.0m high)
 */
export function aviationHighendAirportFuelHydrantDispenser(seed = "aviation-highend-airport-fuel-hydrant-dispenser-0") {
  return {
    id: "aviation-highend-airport-fuel-hydrant-dispenser",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.6, d: 8.5 },
    height: 3.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const truck = new T.BoxGeometry(2.3, 1.8, 7.8); truck.translate(0, 1.2, 0);
         const mast = new T.BoxGeometry(0.8, 1.4, 0.8); mast.translate(0, 2.2, -2);
         return mergeGeometries([truck, mast], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 2.85, 8.07);
          b.translate(0, 1.42, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 3.0, 8.5);
          b.translate(0, 1.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 50-Passenger high-wing twin turboprop regional airliner (22.0x24.0m, 7.2m high)
 */
export function aircraftHighendTwinTurbopropCommuter(seed = "aircraft-highend-twin-turboprop-commuter-0") {
  return {
    id: "aircraft-highend-twin-turboprop-commuter",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 22.0, d: 24.0 },
    height: 7.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const fus = new T.CylinderGeometry(1.3, 1.3, 22, 10); fus.rotateX(Math.PI/2); fus.translate(0, 2.2, 0);
         const wing = new T.BoxGeometry(21, 0.4, 4.0); wing.translate(0, 3.2, 0);
         const tail = new T.BoxGeometry(0.3, 4.0, 3.5); tail.translate(0, 4.8, -9.5);
         return mergeGeometries([fus, wing, tail], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(20.90, 6.84, 22.80);
          b.translate(0, 3.42, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.0, 7.2, 24.0);
          b.translate(0, 3.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Rotating primary airfield surveillance radar antenna atop steel tower (12.0x12.0m, 18.0m high)
 */
export function aviationHighendAirfieldPrimarySurveillanceRadar(seed = "aviation-highend-airfield-primary-surveillance-radar-0") {
  return {
    id: "aviation-highend-airfield-primary-surveillance-radar",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 12.0, d: 12.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const tower = new T.BoxGeometry(4.0, 14.0, 4.0); tower.translate(0, 7.0, 0);
         const ant = new T.BoxGeometry(10.0, 2.5, 1.2); ant.translate(0, 15.8, 0);
         return mergeGeometries([tower, ant], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 17.10, 11.40);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 18.0, 12.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Continuous runway surface friction measuring decelerometer vehicle (2.2x5.4m, 1.8m high)
 */
export function aviationHighendRunwayFrictionTesterVehicle(seed = "aviation-highend-runway-friction-tester-vehicle-0") {
  return {
    id: "aviation-highend-runway-friction-tester-vehicle",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.2, d: 5.4 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const car = new T.BoxGeometry(1.9, 1.3, 4.8); car.translate(0, 0.85, 0);
         const wheel = new T.CylinderGeometry(0.3, 0.3, 0.2, 8); wheel.translate(0, 0.3, -2.2);
         return mergeGeometries([car, wheel], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.71, 5.13);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.8, 5.4);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Motorized self-propelled wide-body passenger boarding stairs truck (2.6x8.8m, 6.6m high)
 */
export function aviationHighendAirportMobileStairsTruck(seed = "aviation-highend-airport-mobile-stairs-truck-0") {
  return {
    id: "aviation-highend-airport-mobile-stairs-truck",
    tier: "highend",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.6, d: 8.8 },
    height: 6.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const truck = new T.BoxGeometry(2.2, 1.4, 6.5); truck.translate(0, 0.9, -0.5);
         const stairs = new T.BoxGeometry(1.8, 4.2, 6.0); stairs.rotateX(0.5); stairs.translate(0, 3.2, 0.5);
         const _m = mergeGeometries([truck, stairs], T);; _m.translate(0, 0.081, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 6.27, 8.36);
          b.translate(0, 3.13, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 6.6, 8.8);
          b.translate(0, 3.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Heavy towbarless aircraft pushback apron tractor (3.2x8.0m, 2.2m high)
 */
export function aviationMidhighAircraftPushbackTug(seed = "aviation-midhigh-aircraft-pushback-tug-0") {
  return {
    id: "aviation-midhigh-aircraft-pushback-tug",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 3.2, d: 8.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.9, 1.4, 7.4); body.translate(0, 0.95, 0);
         const cab = new T.BoxGeometry(2.4, 0.9, 2.2); cab.translate(0, 1.7, 2.0);
         return mergeGeometries([body, cab], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.04, 2.09, 7.60);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 2.2, 8.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Mobile apron baggage conveyor belt loader truck (2.4x7.5m, 3.2m high)
 */
export function aviationMidhighBeltLoaderConveyorTruck(seed = "aviation-midhigh-belt-loader-conveyor-truck-0") {
  return {
    id: "aviation-midhigh-belt-loader-conveyor-truck",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.4, d: 7.5 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.1, 1.2, 6.5); body.translate(0, 0.8, 0);
         const belt = new T.BoxGeometry(1.0, 0.3, 7.0); belt.rotateX(0.3); belt.translate(0, 1.9, 0);
         return mergeGeometries([body, belt], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 3.04, 7.12);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 3.2, 7.5);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: High-wing four-seat single-engine general aviation piston airplane (11.0x8.5m, 3.2m high)
 */
export function aircraftMidhighGeneralAviationCessna(seed = "aircraft-midhigh-general-aviation-cessna-0") {
  return {
    id: "aircraft-midhigh-general-aviation-cessna",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 11.0, d: 8.5 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["runway", "open"],
    lod: [
      {
        level: 0,
        tris: 125,
        createGeometry: (T = THREE) => {
          const fus = new T.ConeGeometry(0.7, 7.8, 8); fus.rotateX(Math.PI / 2); fus.translate(0, 1.4, 0);
         const wing = new T.BoxGeometry(10.5, 0.2, 2.0); wing.translate(0, 2.3, 0.5);
         const tail = new T.BoxGeometry(3.6, 0.15, 1.4); tail.translate(0, 1.8, -3.2);
         return mergeGeometries([fus, wing, tail], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.45, 3.04, 8.07);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.0, 3.2, 8.5);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Precision Approach Path Indicator (PAPI) runway optical box (1.2x1.2m, 1.1m high)
 */
export function aviationMidhighRunwayPapiLightUnit(seed = "aviation-midhigh-runway-papi-light-unit-0") {
  return {
    id: "aviation-midhigh-runway-papi-light-unit",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(0.8, 0.6, 0.8); box.translate(0, 0.6, 0);
         const legs = new T.BoxGeometry(0.6, 0.6, 0.6); legs.translate(0, 0.3, 0);
         return mergeGeometries([box, legs], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.04, 1.14);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.1, 1.2);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Hi-lift aircraft cabin catering scissor-lift truck (2.6x8.5m, 5.0m high)
 */
export function aviationMidhighAircraftCateringScissorTruck(seed = "aviation-midhigh-aircraft-catering-scissor-truck-0") {
  return {
    id: "aviation-midhigh-aircraft-catering-scissor-truck",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.6, d: 8.5 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 130,
        createGeometry: (T = THREE) => {
          const chassis = new T.BoxGeometry(2.3, 1.2, 7.8); chassis.translate(0, 0.8, 0);
         const van = new T.BoxGeometry(2.4, 2.4, 6.0); van.translate(0, 3.6, -0.6);
         return mergeGeometries([chassis, van], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 4.75, 8.07);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 5.0, 8.5);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Towed diesel 400Hz 115V Ground Power Unit (GPU) trailer (1.8x4.0m, 1.6m high)
 */
export function aviationMidhighAirfieldGroundPowerUnit(seed = "aviation-midhigh-airfield-ground-power-unit-0") {
  return {
    id: "aviation-midhigh-airfield-ground-power-unit",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.8, d: 4.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(1.5, 1.1, 2.6); box.translate(0, 0.75, 0);
         const tongue = new T.BoxGeometry(0.1, 0.1, 0.8); tongue.translate(0, 0.4, 1.4);
         return mergeGeometries([box, tongue], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.52, 3.80);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.6, 4.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: High-pressure air start cart (ASU) turbine compressor unit (1.8x3.2m, 1.8m high)
 */
export function aviationMidhighAircraftAirStarterUnit(seed = "aviation-midhigh-aircraft-air-starter-unit-0") {
  return {
    id: "aviation-midhigh-aircraft-air-starter-unit",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.8, d: 3.2 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.5, 1.3, 2.8); body.translate(0, 0.85, 0); return body;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.71, 3.04);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.8, 3.2);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Extra-wide airport apron passenger transfer shuttle bus (3.2x14.0m, 3.2m high)
 */
export function aviationMidhighApronPassengerTransferBus(seed = "aviation-midhigh-apron-passenger-transfer-bus-0") {
  return {
    id: "aviation-midhigh-apron-passenger-transfer-bus",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 3.2, d: 14.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 125,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(2.9, 2.5, 13.2); body.translate(0, 1.5, 0); return body;
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.04, 3.04, 13.30);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 3.2, 14.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Airside yellow perimeter patrol 4x4 response vehicle (2.2x5.2m, 1.9m high)
 */
export function aviationMidhighAirportSecurityPatrolVehicle(seed = "aviation-midhigh-airport-security-patrol-vehicle-0") {
  return {
    id: "aviation-midhigh-airport-security-patrol-vehicle",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.2, d: 5.2 },
    height: 1.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.9, 1.3, 4.8); body.translate(0, 0.85, 0);
         const light = new T.BoxGeometry(0.8, 0.15, 0.3); light.translate(0, 1.7, 0);
         return mergeGeometries([body, light], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 1.80, 4.94);
          b.translate(0, 0.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 1.9, 5.2);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Frangible blast fence runway end safety arresting net (16.0x2.0m, 2.2m high)
 */
export function aviationMidhighRunwayEndSafetyBarrier(seed = "aviation-midhigh-runway-end-safety-barrier-0") {
  return {
    id: "aviation-midhigh-runway-end-safety-barrier",
    tier: "midhigh",
    category: "aviation",
    kind: "hard",
    footprint: { w: 16.0, d: 2.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(15, 1.8, 0.4); fence.translate(0, 0.9, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 2.09, 1.90);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 2.2, 2.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Lighted international orange aviation windsock mast assembly (2.4x4.0m, 5.5m high)
 */
export function aviationMidAirfieldWindsockMast(seed = "aviation-mid-airfield-windsock-mast-0") {
  return {
    id: "aviation-mid-airfield-windsock-mast",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.4, d: 4.0 },
    height: 5.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 60,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.08, 0.12, 4.8, 8); pole.translate(0, 2.4, 0);
         const sock = new T.ConeGeometry(0.45, 1.8, 8); sock.rotateX(Math.PI/2); sock.translate(0, 4.8, 0.9);
         return mergeGeometries([pole, sock], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 5.22, 3.80);
          b.translate(0, 2.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 5.5, 4.0);
          b.translate(0, 2.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Compact industrial electric baggage tow tractor (1.4x2.8m, 1.6m high)
 */
export function aviationMidBaggageTractorTug(seed = "aviation-mid-baggage-tractor-tug-0") {
  return {
    id: "aviation-mid-baggage-tractor-tug",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.4, d: 2.8 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 55,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.2, 0.7, 2.4); body.translate(0, 0.5, 0);
         const cab = new T.BoxGeometry(1.0, 0.8, 1.0); cab.translate(0, 1.15, -0.3);
         return mergeGeometries([body, cab], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 1.52, 2.66);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.6, 2.8);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Wheel chock and ramp hazard safety cone storage cart (1.2x1.2m, 1.2m high)
 */
export function aviationMidAirportChocksAndConesRack(seed = "aviation-mid-airport-chocks-and-cones-rack-0") {
  return {
    id: "aviation-mid-airport-chocks-and-cones-rack",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const rack = new T.BoxGeometry(0.9, 0.9, 0.9); rack.translate(0, 0.5, 0); return rack;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.14, 1.14);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.2, 1.2);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid-Low: Mobile aluminum aircraft mechanics work access platform ladder (1.6x3.0m, 2.9m high)
 */
export function aviationMidAircraftMaintenanceStepLadder(seed = "aviation-mid-aircraft-maintenance-step-ladder-0") {
  return {
    id: "aviation-mid-aircraft-maintenance-step-ladder",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.6, d: 3.0 },
    height: 2.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const stairs = new T.BoxGeometry(1.2, 2.2, 2.0); stairs.rotateX(0.4); stairs.translate(0, 1.2, 0); const _g = stairs; _g.translate(0, 0.203, 0); return _g;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.52, 2.75, 2.85);
          b.translate(0, 1.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 2.9, 3.0);
          b.translate(0, 1.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Mobile hazmat aviation fuel spill containment response kit (1.4x1.8m, 1.4m high)
 */
export function aviationMidFuelSpillResponseKitCart(seed = "aviation-mid-fuel-spill-response-kit-cart-0") {
  return {
    id: "aviation-mid-fuel-spill-response-kit-cart",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.4, d: 1.8 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const cart = new T.BoxGeometry(1.1, 1.0, 1.5); cart.translate(0, 0.65, 0); return cart;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 1.33, 1.71);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.4, 1.8);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 4-Bottle aviation high-pressure tire nitrogen service cart (1.2x2.2m, 1.4m high)
 */
export function aviationMidNitrogenServiceCart(seed = "aviation-mid-nitrogen-service-cart-0") {
  return {
    id: "aviation-mid-nitrogen-service-cart",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.2, d: 2.2 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const cart = new T.BoxGeometry(0.9, 0.4, 1.8); cart.translate(0, 0.35, 0);
         const bottle1 = new T.CylinderGeometry(0.15, 0.15, 1.2, 8); bottle1.rotateX(Math.PI/2); bottle1.translate(-0.25, 0.7, 0);
         const bottle2 = new T.CylinderGeometry(0.15, 0.15, 1.2, 8); bottle2.rotateX(Math.PI/2); bottle2.translate(0.25, 0.7, 0);
         return mergeGeometries([cart, bottle1, bottle2], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.33, 2.09);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.4, 2.2);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Portable hydraulic ground test power cart (mule) (1.4x2.2m, 1.5m high)
 */
export function aviationMidHydraulicMuleTestCart(seed = "aviation-mid-hydraulic-mule-test-cart-0") {
  return {
    id: "aviation-mid-hydraulic-mule-test-cart",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.4, d: 2.2 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 45,
        createGeometry: (T = THREE) => {
          const cart = new T.BoxGeometry(1.1, 1.1, 1.8); cart.translate(0, 0.7, 0); return cart;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 1.42, 2.09);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.5, 2.2);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Airport ramp aircraft potable water and waste service truck (2.2x6.0m, 2.4m high)
 */
export function aviationMidLavatoryServiceTruck(seed = "aviation-mid-lavatory-service-truck-0") {
  return {
    id: "aviation-mid-lavatory-service-truck",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.2, d: 6.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const truck = new T.BoxGeometry(1.9, 1.8, 5.4); truck.translate(0, 1.1, 0); return truck;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 2.28, 5.70);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 2.4, 6.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Heavy universal aircraft towbar storage carrier cart (1.8x3.8m, 1.2m high)
 */
export function aviationMidAircraftTowbarRackCart(seed = "aviation-mid-aircraft-towbar-rack-cart-0") {
  return {
    id: "aviation-mid-aircraft-towbar-rack-cart",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.8, d: 3.8 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const rack = new T.BoxGeometry(1.4, 0.8, 3.4); rack.translate(0, 0.5, 0); return rack;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 1.14, 3.61);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 1.2, 3.8);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Towed runway FOD (Foreign Object Debris) friction sweeping mat (2.4x2.4m, 0.4m high)
 */
export function aviationMidAirfieldForeignObjectSweeperMat(seed = "aviation-mid-airfield-foreign-object-sweeper-mat-0") {
  return {
    id: "aviation-mid-airfield-foreign-object-sweeper-mat",
    tier: "mid",
    category: "aviation",
    kind: "hard",
    footprint: { w: 2.4, d: 2.4 },
    height: 0.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 40,
        createGeometry: (T = THREE) => {
          const mat = new T.BoxGeometry(2.1, 0.15, 2.1); mat.translate(0, 0.1, 0); return mat;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 0.38, 2.28);
          b.translate(0, 0.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 0.4, 2.4);
          b.translate(0, 0.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Elevated runway edge incandescent omnidirectional marker light (0.6x0.6m, 0.8m high)
 */
export function aviationMidlowRunwayEdgeLightStake(seed = "aviation-midlow-runway-edge-light-stake-0") {
  return {
    id: "aviation-midlow-runway-edge-light-stake",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "runway", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const stake = new T.CylinderGeometry(0.04, 0.04, 0.4, 6); stake.translate(0, 0.2, 0);
         const head = new T.CylinderGeometry(0.12, 0.12, 0.25, 8); head.translate(0, 0.52, 0);
         return mergeGeometries([stake, head], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.76, 0.57);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.8, 0.6);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Illuminated yellow/black taxiway intersection mandatory sign box (1.4x0.6m, 0.8m high)
 */
export function aviationMidlowTaxiwayGuidanceSignbox(seed = "aviation-midlow-taxiway-guidance-signbox-0") {
  return {
    id: "aviation-midlow-taxiway-guidance-signbox",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.4, d: 0.6 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(1.1, 0.45, 0.25); box.translate(0, 0.45, 0);
         const legs = new T.BoxGeometry(0.9, 0.3, 0.1); legs.translate(0, 0.15, 0);
         return mergeGeometries([box, legs], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 0.76, 0.57);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 0.8, 0.6);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Pair of yellow extruded rubber triangular aircraft wheel chocks (0.6x0.8m, 0.3m high)
 */
export function aviationMidlowAircraftWheelChocksPair(seed = "aviation-midlow-aircraft-wheel-chocks-pair-0") {
  return {
    id: "aviation-midlow-aircraft-wheel-chocks-pair",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.6, d: 0.8 },
    height: 0.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const c1 = new T.BoxGeometry(0.45, 0.18, 0.18); c1.translate(0, 0.1, -0.22);
         const c2 = new T.BoxGeometry(0.45, 0.18, 0.18); c2.translate(0, 0.1, 0.22);
         const rope = new T.BoxGeometry(0.05, 0.05, 0.45); rope.translate(0, 0.1, 0);
         return mergeGeometries([c1, c2, rope], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.28, 0.76);
          b.translate(0, 0.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.3, 0.8);
          b.translate(0, 0.15, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Flush-mounted copper static grounding tie-down apron receptacle (0.4x0.4m, 0.2m high)
 */
export function aviationMidlowAircraftGroundingReceptaclePin(seed = "aviation-midlow-aircraft-grounding-receptacle-pin-0") {
  return {
    id: "aviation-midlow-aircraft-grounding-receptacle-pin",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.4, d: 0.4 },
    height: 0.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const rim = new T.CylinderGeometry(0.15, 0.15, 0.08, 8); rim.translate(0, 0.04, 0); return rim;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 0.19, 0.38);
          b.translate(0, 0.10, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 0.2, 0.4);
          b.translate(0, 0.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Orange LED aircraft ground marshalling wands in charging cradle (0.6x0.6m, 1.2m high)
 */
export function aviationMidlowMarshallingWandsHolder(seed = "aviation-midlow-marshalling-wands-holder-0") {
  return {
    id: "aviation-midlow-marshalling-wands-holder",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const stand = new T.BoxGeometry(0.3, 0.8, 0.3); stand.translate(0, 0.4, 0);
         const w1 = new T.CylinderGeometry(0.02, 0.02, 0.45, 6); w1.translate(-0.08, 0.95, 0);
         const w2 = new T.CylinderGeometry(0.02, 0.02, 0.45, 6); w2.translate(0.08, 0.95, 0);
         return mergeGeometries([stand, w1, w2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.14, 0.57);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.2, 0.6);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: High-visibility weighted plastic apron boundary stanchions (0.4x3.0m, 1.0m high)
 */
export function aviationMidlowRampSafetyStanchionChain(seed = "aviation-midlow-ramp-safety-stanchion-chain-0") {
  return {
    id: "aviation-midlow-ramp-safety-stanchion-chain",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.4, d: 3.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const p1 = new T.CylinderGeometry(0.05, 0.15, 0.85, 6); p1.translate(0, 0.425, -1.2);
         const p2 = new T.CylinderGeometry(0.05, 0.15, 0.85, 6); p2.translate(0, 0.425, 1.2);
         return mergeGeometries([p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 0.95, 2.85);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.0, 3.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Aircraft nose landing gear universal tow bar (0.8x3.8m, 0.6m high)
 */
export function aviationMidlowAircraftUniversalTowBar(seed = "aviation-midlow-aircraft-universal-tow-bar-0") {
  return {
    id: "aviation-midlow-aircraft-universal-tow-bar",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.8, d: 3.8 },
    height: 0.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const bar = new T.CylinderGeometry(0.08, 0.08, 3.5, 6); bar.rotateX(Math.PI / 2); bar.translate(0, 0.25, 0); return bar;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.57, 3.61);
          b.translate(0, 0.28, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 0.6, 3.8);
          b.translate(0, 0.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Aviation fuel 55-gallon drums on wooden storage pallet (1.4x1.4m, 1.1m high)
 */
export function aviationMidlowFuelDrumPallet(seed = "aviation-midlow-fuel-drum-pallet-0") {
  return {
    id: "aviation-midlow-fuel-drum-pallet",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.4, d: 1.4 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const pallet = new T.BoxGeometry(1.3, 0.15, 1.3); pallet.translate(0, 0.075, 0);
         const drum1 = new T.CylinderGeometry(0.28, 0.28, 0.85, 8); drum1.translate(-0.3, 0.58, -0.3);
         const drum2 = new T.CylinderGeometry(0.28, 0.28, 0.85, 8); drum2.translate(0.3, 0.58, 0.3);
         return mergeGeometries([pallet, drum1, drum2], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 1.04, 1.33);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.1, 1.4);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Airport airfield perimeter security sliding gate (0.8x6.0m, 2.4m high)
 */
export function aviationMidlowPerimeterSecurityGate(seed = "aviation-midlow-perimeter-security-gate-0") {
  return {
    id: "aviation-midlow-perimeter-security-gate",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 0.8, d: 6.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 28,
        createGeometry: (T = THREE) => {
          const post1 = new T.BoxGeometry(0.4, 2.3, 0.4); post1.translate(0, 1.15, -2.8);
         const post2 = new T.BoxGeometry(0.4, 2.3, 0.4); post2.translate(0, 1.15, 2.8);
         const gate = new T.BoxGeometry(0.2, 2.0, 5.2); gate.translate(0, 1.1, 0);
         return mergeGeometries([post1, post2, gate], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 2.28, 5.70);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 2.4, 6.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: 16m high-mast apron LED floodlight illumination tower (1.2x1.2m, 16.0m high)
 */
export function aviationMidlowApronFloodlightPole(seed = "aviation-midlow-apron-floodlight-pole-0") {
  return {
    id: "aviation-midlow-apron-floodlight-pole",
    tier: "midlow",
    category: "aviation",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 30,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.2, 0.4, 15.5, 8); pole.translate(0, 7.75, 0);
         const head = new T.BoxGeometry(1.0, 0.4, 1.0); head.translate(0, 15.7, 0);
         return mergeGeometries([pole, head], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 15.20, 1.14);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 16.0, 1.2);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Ancient sprawling banyan tree with cascading aerial prop roots (16.0x16.0m, 14.0m high)
 */
export function treeShowstopperAncientBanyan(seed = "tree-showstopper-ancient-banyan-0") {
  return {
    id: "tree-showstopper-ancient-banyan",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 16.0, d: 16.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(1.8, 3.2, 5.5, 12); trunk.translate(0, 2.75, 0);
         const crown1 = new T.SphereGeometry(6.5, 16, 10); crown1.scale(1.1, 0.6, 1.1); crown1.translate(0, 9.5, 0);
         const prop1 = new T.CylinderGeometry(0.3, 0.4, 6.0, 6); prop1.translate(-4.5, 3.0, -3.5);
         const prop2 = new T.CylinderGeometry(0.3, 0.4, 6.0, 6); prop2.translate(4.5, 3.0, 3.5);
         return mergeGeometries([trunk, crown1, prop1, prop2], T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 13.30, 15.20);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 14.0, 16.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Monumental 38m old-growth giant sequoia red cedar (12.0x12.0m, 38.0m high)
 */
export function treeShowstopperGiantSequoia(seed = "tree-showstopper-giant-sequoia-0") {
  return {
    id: "tree-showstopper-giant-sequoia",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 12.0, d: 12.0 },
    height: 38.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 450,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(1.4, 3.5, 36, 12); trunk.translate(0, 18, 0);
         const foliage = new T.ConeGeometry(5.2, 28, 12); foliage.translate(0, 23, 0);
         return mergeGeometries([trunk, foliage], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 36.10, 11.40);
          b.translate(0, 18.05, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 38.0, 12.0);
          b.translate(0, 19.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 16m High freestanding multi-species biophilic hydroponic living wall (8.0x3.0m, 16.0m high)
 */
export function vegetationShowstopperVerticalLivingWallMonolith(seed = "vegetation-showstopper-vertical-living-wall-monolith-0") {
  return {
    id: "vegetation-showstopper-vertical-living-wall-monolith",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 3.0 },
    height: 16.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 440,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(7.5, 15.5, 1.5); wall.translate(0, 7.75, 0);
         const cap = new T.BoxGeometry(7.8, 0.4, 1.8); cap.translate(0, 15.7, 0);
         return mergeGeometries([wall, cap], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 15.20, 2.85);
          b.translate(0, 7.60, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 16.0, 3.0);
          b.translate(0, 8.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Grand flowering weeping sakura cherry tree with drooping blossom canopy (14.0x14.0m, 10.9m high)
 */
export function treeShowstopperJapaneseWeepingCherryGrand(seed = "tree-showstopper-japanese-weeping-cherry-grand-0") {
  return {
    id: "tree-showstopper-japanese-weeping-cherry-grand",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 14.0, d: 14.0 },
    height: 10.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.8, 1.6, 4.0, 10); trunk.translate(0, 2.0, 0);
         const crown = new T.SphereGeometry(6.2, 16, 12); crown.scale(1.1, 0.7, 1.1); crown.translate(0, 6.5, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 46,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 10.36, 13.30);
          b.translate(0, 5.18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 10.9, 14.0);
          b.translate(0, 5.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: African grand bottle baobab tree with massive succulent trunk (16.0x16.0m, 18.0m high)
 */
export function treeShowstopperBaobabGrandSpecimen(seed = "tree-showstopper-baobab-grand-specimen-0") {
  return {
    id: "tree-showstopper-baobab-grand-specimen",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 16.0, d: 16.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(4.0, 5.5, 12, 16); trunk.translate(0, 6, 0);
         const crown = new T.SphereGeometry(7.0, 14, 10); crown.scale(1.1, 0.4, 1.1); crown.translate(0, 15, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 17.10, 15.20);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 18.0, 16.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Cascading waterside weeping willow with trailing foliage strands (16.0x16.0m, 13.3m high)
 */
export function treeShowstopperWeepingWillowPondCanopy(seed = "tree-showstopper-weeping-willow-pond-canopy-0") {
  return {
    id: "tree-showstopper-weeping-willow-pond-canopy",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 16.0, d: 16.0 },
    height: 13.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park", "water"],
    lod: [
      {
        level: 0,
        tris: 450,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(1.2, 2.2, 5.0, 10); trunk.translate(0, 2.5, 0);
         const dome = new T.SphereGeometry(7.2, 16, 10); dome.scale(1.0, 0.8, 1.0); dome.translate(0, 7.5, 0);
         return mergeGeometries([trunk, dome], T);
        },
      },
      {
        level: 1,
        tris: 46,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 12.63, 15.20);
          b.translate(0, 6.32, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 13.3, 16.0);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 12m Formal geometric manicured helical spiral boxwood topiary (6.0x6.0m, 12.0m high)
 */
export function vegetationShowstopperTopiarySpiralSculpture(seed = "vegetation-showstopper-topiary-spiral-sculpture-0") {
  return {
    id: "vegetation-showstopper-topiary-spiral-sculpture",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 6.0, d: 6.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 430,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(1.2, 1.6, 2.0, 10); base.translate(0, 1.0, 0);
         const spiral = new T.ConeGeometry(2.4, 9.5, 12); spiral.translate(0, 6.8, 0);
         return mergeGeometries([base, spiral], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 11.40, 5.70);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 12.0, 6.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Vibrant violet-blooming Jacaranda mimosifolia specimen shade tree (14.0x14.0m, 14.4m high)
 */
export function treeShowstopperJacarandaPurpleBloom(seed = "tree-showstopper-jacaranda-purple-bloom-0") {
  return {
    id: "tree-showstopper-jacaranda-purple-bloom",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 14.0, d: 14.0 },
    height: 14.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.9, 1.8, 5.0, 10); trunk.translate(0, 2.5, 0);
         const crown = new T.SphereGeometry(6.5, 16, 12); crown.scale(1.0, 0.75, 1.0); crown.translate(0, 9.5, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 46,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 13.68, 13.30);
          b.translate(0, 6.84, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 14.4, 14.0);
          b.translate(0, 7.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Grand cluster of three mature Canary Island date palms with feather fronds (14.0x12.0m, 16.4m high)
 */
export function treeShowstopperCanaryIslandDatePalmTrio(seed = "tree-showstopper-canary-island-date-palm-trio-0") {
  return {
    id: "tree-showstopper-canary-island-date-palm-trio",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 14.0, d: 12.0 },
    height: 16.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const t1 = new T.CylinderGeometry(0.6, 0.9, 14, 8); t1.translate(-2, 7, -1);
         const c1 = new T.SphereGeometry(3.8, 12, 8); c1.scale(1.2, 0.5, 1.2); c1.translate(-2, 14.5, -1);
         const t2 = new T.CylinderGeometry(0.5, 0.8, 11, 8); t2.translate(2, 5.5, 1.5);
         const c2 = new T.SphereGeometry(3.2, 12, 8); c2.scale(1.2, 0.5, 1.2); c2.translate(2, 11.5, 1.5);
         return mergeGeometries([t1, c1, t2, c2], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 15.58, 11.40);
          b.translate(0, 7.79, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 16.4, 12.0);
          b.translate(0, 8.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Sculptural Japanese Niwaki cloud pine atop granite garden monolith (8.0x8.0m, 5.0m high)
 */
export function vegetationShowstopperBotanicalZenBonsaiRock(seed = "vegetation-showstopper-botanical-zen-bonsai-rock-0") {
  return {
    id: "vegetation-showstopper-botanical-zen-bonsai-rock",
    tier: "showstopper",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 5.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 440,
        createGeometry: (T = THREE) => {
          const rock = new T.DodecahedronGeometry(2.2); rock.scale(1.5, 0.6, 1.2); rock.translate(0, 1.2, 0);
         const pine = new T.SphereGeometry(2.0, 12, 8); pine.scale(1.4, 0.5, 1.0); pine.translate(0.5, 3.5, 0);
         const _m = mergeGeometries([rock, pine], T);; _m.translate(0, 0.033, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 4.75, 7.60);
          b.translate(0, 2.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 5.0, 8.0);
          b.translate(0, 2.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Pair of 18m smooth-trunk Cuban royal palms (Roystonea regia) (7.0x14.0m, 18.0m high)
 */
export function treeLuxuryRoyalPalmAvenuePair(seed = "tree-luxury-royal-palm-avenue-pair-0") {
  return {
    id: "tree-luxury-royal-palm-avenue-pair",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 7.0, d: 14.0 },
    height: 18.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const t1 = new T.CylinderGeometry(0.35, 0.5, 16, 8); t1.translate(0, 8, -3.5);
         const c1 = new T.SphereGeometry(2.8, 10, 6); c1.scale(1.2, 0.4, 1.2); c1.translate(0, 16.5, -3.5);
         const t2 = new T.CylinderGeometry(0.35, 0.5, 16, 8); t2.translate(0, 8, 3.5);
         const c2 = new T.SphereGeometry(2.8, 10, 6); c2.scale(1.2, 0.4, 1.2); c2.translate(0, 16.5, 3.5);
         return mergeGeometries([t1, c1, t2, c2], T);
        },
      },
      {
        level: 1,
        tris: 44,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.65, 17.10, 13.30);
          b.translate(0, 8.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.0, 18.0, 14.0);
          b.translate(0, 9.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Formal columnar Italian Mediterranean cypress architectural screen (4.0x16.0m, 12.0m high)
 */
export function vegetationLuxuryItalianCypressScreen(seed = "vegetation-luxury-italian-cypress-screen-0") {
  return {
    id: "vegetation-luxury-italian-cypress-screen",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 16.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const c1 = new T.ConeGeometry(1.0, 11, 8); c1.translate(0, 6, -5.5);
         const c2 = new T.ConeGeometry(1.0, 11.5, 8); c2.translate(0, 6.2, 0);
         const c3 = new T.ConeGeometry(1.0, 11, 8); c3.translate(0, 6, 5.5);
         return mergeGeometries([c1, c2, c3], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 11.40, 15.20);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 12.0, 16.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: French classical embroidery boxwood parterre garden knot (16.0x16.0m, 1.6m high)
 */
export function vegetationLuxuryManicuredParterreGarden(seed = "vegetation-luxury-manicured-parterre-garden-0") {
  return {
    id: "vegetation-luxury-manicured-parterre-garden",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 16.0, d: 16.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(14.5, 0.4, 14.5); frame.translate(0, 0.2, 0);
         const h1 = new T.BoxGeometry(4.0, 0.7, 4.0); h1.translate(-4, 0.55, -4);
         const h2 = new T.BoxGeometry(4.0, 0.7, 4.0); h2.translate(4, 0.55, 4);
         return mergeGeometries([frame, h1, h2], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 1.52, 15.20);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 1.6, 16.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Formal pleached linden architectural raised hedge screen (6.0x24.0m, 8.0m high)
 */
export function treeLuxuryPleachedLindenAllée(seed = "tree-luxury-pleached-linden-allée-0") {
  return {
    id: "tree-luxury-pleached-linden-allée",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 6.0, d: 24.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const t1 = new T.CylinderGeometry(0.2, 0.3, 3.5, 6); t1.translate(0, 1.75, -8);
         const t2 = new T.CylinderGeometry(0.2, 0.3, 3.5, 6); t2.translate(0, 1.75, 0);
         const t3 = new T.CylinderGeometry(0.2, 0.3, 3.5, 6); t3.translate(0, 1.75, 8);
         const block = new T.BoxGeometry(3.5, 4.0, 22); block.translate(0, 5.5, 0);
         return mergeGeometries([t1, t2, t3, block], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 7.60, 22.80);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 8.0, 24.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: 3-Tier carved limestone ornamental garden urn planter (8.0x8.0m, 3.2m high)
 */
export function vegetationLuxuryTieredRaisedStonePlanter(seed = "vegetation-luxury-tiered-raised-stone-planter-0") {
  return {
    id: "vegetation-luxury-tiered-raised-stone-planter",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const t1 = new T.BoxGeometry(7.2, 1.0, 7.2); t1.translate(0, 0.5, 0);
         const t2 = new T.BoxGeometry(5.0, 1.0, 5.0); t2.translate(0, 1.5, 0);
         const t3 = new T.BoxGeometry(2.8, 1.0, 2.8); t3.translate(0, 2.5, 0);
         return mergeGeometries([t1, t2, t3], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 3.04, 7.60);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 3.2, 8.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Stately deep-purple mature European copper beech tree (14.0x14.0m, 16.1m high)
 */
export function treeLuxuryMatureCopperBeech(seed = "tree-luxury-mature-copper-beech-0") {
  return {
    id: "tree-luxury-mature-copper-beech",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 14.0, d: 14.0 },
    height: 16.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(1.0, 1.8, 5.0, 8); trunk.translate(0, 2.5, 0);
         const crown = new T.SphereGeometry(6.2, 14, 10); crown.scale(1.0, 0.9, 1.0); crown.translate(0, 10.5, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 15.29, 13.30);
          b.translate(0, 7.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 16.1, 14.0);
          b.translate(0, 8.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Dense Japanese black bamboo (Phyllostachys nigra) zen grove (8.0x8.0m, 10.0m high)
 */
export function vegetationLuxuryBambooZenGrove(seed = "vegetation-luxury-bamboo-zen-grove-0") {
  return {
    id: "vegetation-luxury-bamboo-zen-grove",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const p1 = new T.CylinderGeometry(0.08, 0.08, 9.5, 6); p1.translate(-2, 4.75, -2);
         const p2 = new T.CylinderGeometry(0.08, 0.08, 9.5, 6); p2.translate(2, 4.75, 2);
         const mass = new T.SphereGeometry(3.5, 12, 8); mass.scale(1, 0.6, 1); mass.translate(0, 7.5, 0);
         return mergeGeometries([p1, p2, mass], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 9.50, 7.60);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 10.0, 8.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Trio of graduated manicured spherical Buxus sempervirens boxwood balls (4.0x8.0m, 2.3m high)
 */
export function vegetationLuxurySculptedBoxwoodSphereTrio(seed = "vegetation-luxury-sculpted-boxwood-sphere-trio-0") {
  return {
    id: "vegetation-luxury-sculpted-boxwood-sphere-trio",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 8.0 },
    height: 2.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 260,
        createGeometry: (T = THREE) => {
          const s1 = new T.SphereGeometry(0.9, 10, 8); s1.translate(0, 0.9, -2.2);
         const s2 = new T.SphereGeometry(1.1, 10, 8); s2.translate(0, 1.1, 0);
         const s3 = new T.SphereGeometry(0.75, 10, 8); s3.translate(0, 0.75, 2.2);
         return mergeGeometries([s1, s2, s3], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 2.18, 7.60);
          b.translate(0, 1.09, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 2.3, 8.0);
          b.translate(0, 1.15, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Umbrella-shaped Mediterranean stone pine (Pinus pinea) (12.0x12.0m, 14.0m high)
 */
export function treeLuxuryMediterraneanStonePine(seed = "tree-luxury-mediterranean-stone-pine-0") {
  return {
    id: "tree-luxury-mediterranean-stone-pine",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 12.0, d: 12.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 295,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.7, 1.4, 9.0, 8); trunk.translate(0, 4.5, 0);
         const crown = new T.CylinderGeometry(5.8, 2.0, 4.0, 12); crown.translate(0, 11.5, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 13.30, 11.40);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 14.0, 12.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Cut granite circular ornamental water lily and koi garden pond (12.0x12.0m, 1.8m high)
 */
export function vegetationLuxuryOrnamentalKoiLilyPond(seed = "vegetation-luxury-ornamental-koi-lily-pond-0") {
  return {
    id: "vegetation-luxury-ornamental-koi-lily-pond",
    tier: "luxury",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 12.0, d: 12.0 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park", "water"],
    lod: [
      {
        level: 0,
        tris: 275,
        createGeometry: (T = THREE) => {
          const basin = new T.CylinderGeometry(5.2, 5.5, 0.8, 16); basin.translate(0, 0.4, 0);
         const rock = new T.DodecahedronGeometry(0.9); rock.translate(2.5, 0.9, -2);
         return mergeGeometries([basin, rock], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 1.71, 11.40);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 1.8, 12.0);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Mature full-canopy Norway maple shade tree (10.0x10.0m, 12.0m high)
 */
export function treeHighendNorwayMapleCanopy(seed = "tree-highend-norway-maple-canopy-0") {
  return {
    id: "tree-highend-norway-maple-canopy",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 10.0, d: 10.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.5, 0.9, 4.5, 8); trunk.translate(0, 2.25, 0);
         const crown = new T.SphereGeometry(4.6, 12, 8); crown.translate(0, 7.2, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 11.40, 9.50);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 12.0, 10.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Dense English yew (Taxus baccata) formal boundary hedge (2.0x8.0m, 2.4m high)
 */
export function vegetationHighendPrunedYewHedgeSegment(seed = "vegetation-highend-pruned-yew-hedge-segment-0") {
  return {
    id: "vegetation-highend-pruned-yew-hedge-segment",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.0, d: 8.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const hedge = new T.BoxGeometry(1.6, 2.2, 7.6); hedge.translate(0, 1.1, 0); return hedge;
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 2.28, 7.60);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 2.4, 8.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: High-canopy urban boulevard London plane street tree (8.0x8.0m, 14.0m high)
 */
export function treeHighendLondonPlaneStreetTree(seed = "tree-highend-london-plane-street-tree-0") {
  return {
    id: "tree-highend-london-plane-street-tree",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.45, 0.8, 6.0, 8); trunk.translate(0, 3.0, 0);
         const crown = new T.SphereGeometry(3.8, 12, 8); crown.translate(0, 9.5, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 13.30, 7.60);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 14.0, 8.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Continuous fragrant English lavender flowering herbaceous border (2.0x8.0m, 1.0m high)
 */
export function vegetationHighendLavenderPerennialBorder(seed = "vegetation-highend-lavender-perennial-border-0") {
  return {
    id: "vegetation-highend-lavender-perennial-border",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.0, d: 8.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 150,
        createGeometry: (T = THREE) => {
          const border = new T.BoxGeometry(1.4, 0.75, 7.6); border.translate(0, 0.375, 0); return border;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 0.95, 7.60);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.0, 8.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Naturalistic multistem white-bark silver birch copse (8.0x8.0m, 12.2m high)
 */
export function treeHighendSilverBirchTrio(seed = "tree-highend-silver-birch-trio-0") {
  return {
    id: "tree-highend-silver-birch-trio",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 12.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 200,
        createGeometry: (T = THREE) => {
          const t1 = new T.CylinderGeometry(0.15, 0.25, 10, 6); t1.translate(-1.2, 5.0, -1);
         const t2 = new T.CylinderGeometry(0.15, 0.25, 11, 6); t2.translate(1.2, 5.5, 0.5);
         const c1 = new T.SphereGeometry(2.4, 10, 6); c1.translate(-1.2, 9.0, -1);
         const c2 = new T.SphereGeometry(2.6, 10, 6); c2.translate(1.2, 9.5, 0.5);
         return mergeGeometries([t1, t2, c1, c2], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 11.59, 7.60);
          b.translate(0, 5.79, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 12.2, 8.0);
          b.translate(0, 6.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Weathering Cor-ten steel architectural street planter box (3.0x6.0m, 1.4m high)
 */
export function vegetationHighendCortenSteelRaisedPlanter(seed = "vegetation-highend-corten-steel-raised-planter-0") {
  return {
    id: "vegetation-highend-corten-steel-raised-planter",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 3.0, d: 6.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(2.6, 0.8, 5.6); box.translate(0, 0.4, 0);
         const shrubs = new T.BoxGeometry(2.2, 0.5, 5.2); shrubs.translate(0, 1.0, 0);
         return mergeGeometries([box, shrubs], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 1.33, 5.70);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 1.4, 6.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Vibrant golden-orange autumn foliage sugar maple (10.0x10.0m, 14.0m high)
 */
export function treeHighendSugarMapleAutumnGold(seed = "tree-highend-sugar-maple-autumn-gold-0") {
  return {
    id: "tree-highend-sugar-maple-autumn-gold",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 10.0, d: 10.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.5, 1.0, 5.0, 8); trunk.translate(0, 2.5, 0);
         const crown = new T.SphereGeometry(4.8, 12, 8); crown.translate(0, 8.8, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.50, 13.30, 9.50);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(10.0, 14.0, 10.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Sustainable urban bioswale with feather reed ornamental grasses (4.0x12.0m, 1.6m high)
 */
export function vegetationHighendOrnamentalGrassesSwale(seed = "vegetation-highend-ornamental-grasses-swale-0") {
  return {
    id: "vegetation-highend-ornamental-grasses-swale",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 12.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const swale = new T.BoxGeometry(3.5, 0.3, 11.5); swale.translate(0, 0.15, 0);
         const grass = new T.BoxGeometry(3.2, 1.1, 11.0); grass.translate(0, 0.8, 0);
         return mergeGeometries([swale, grass], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 1.52, 11.40);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 1.6, 12.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Spring-flowering pink saucer magnolia garden tree (8.0x8.0m, 8.4m high)
 */
export function treeHighendSaucerMagnoliaPink(seed = "tree-highend-saucer-magnolia-pink-0") {
  return {
    id: "tree-highend-saucer-magnolia-pink",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 8.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.35, 0.6, 3.0, 8); trunk.translate(0, 1.5, 0);
         const crown = new T.SphereGeometry(3.6, 12, 8); crown.translate(0, 4.8, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 7.98, 7.60);
          b.translate(0, 3.99, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 8.4, 8.0);
          b.translate(0, 4.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Traditional Belgian fence espaliered fruit tree lattice (1.5x8.0m, 3.0m high)
 */
export function vegetationHighendEspalierFruitTrellis(seed = "vegetation-highend-espalier-fruit-trellis-0") {
  return {
    id: "vegetation-highend-espalier-fruit-trellis",
    tier: "highend",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.5, d: 8.0 },
    height: 3.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const trellis = new T.BoxGeometry(0.2, 2.6, 7.6); trellis.translate(0, 1.3, 0);
         const foliage = new T.BoxGeometry(0.6, 2.2, 7.4); foliage.translate(0, 1.4, 0);
         return mergeGeometries([trellis, foliage], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 2.85, 7.60);
          b.translate(0, 1.42, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 3.0, 8.0);
          b.translate(0, 1.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Standard suburban residential pin oak shade tree (8.0x8.0m, 10.0m high)
 */
export function treeMidhighSuburbanOak(seed = "tree-midhigh-suburban-oak-0") {
  return {
    id: "tree-midhigh-suburban-oak",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 10.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.4, 0.7, 3.5, 6); trunk.translate(0, 1.75, 0);
         const crown = new T.SphereGeometry(3.6, 10, 6); crown.translate(0, 6.0, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 9.50, 7.60);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 10.0, 8.0);
          b.translate(0, 5.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Fast-growing Lombardy poplar windbreak tree (4.0x4.0m, 14.0m high)
 */
export function treeMidhighColumnarPoplar(seed = "tree-midhigh-columnar-poplar-0") {
  return {
    id: "tree-midhigh-columnar-poplar",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 4.0 },
    height: 14.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.25, 0.45, 4.0, 6); trunk.translate(0, 2.0, 0);
         const crown = new T.CylinderGeometry(1.2, 1.6, 9.5, 8); crown.translate(0, 8.5, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 13.30, 3.80);
          b.translate(0, 6.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 14.0, 4.0);
          b.translate(0, 7.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Trimmed privet perimeter garden hedge (1.5x6.0m, 1.5m high)
 */
export function vegetationMidhighBoxwoodHedgeStraight(seed = "vegetation-midhigh-boxwood-hedge-straight-0") {
  return {
    id: "vegetation-midhigh-boxwood-hedge-straight",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.5, d: 6.0 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const hedge = new T.BoxGeometry(1.1, 1.3, 5.6); hedge.translate(0, 0.65, 0); return hedge;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 1.42, 5.70);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 1.5, 6.0);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Compact white flowering dogwood understory tree (6.0x6.0m, 6.5m high)
 */
export function treeMidhighFloweringDogwood(seed = "tree-midhigh-flowering-dogwood-0") {
  return {
    id: "tree-midhigh-flowering-dogwood",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 6.0, d: 6.0 },
    height: 6.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.2, 0.35, 2.2, 6); trunk.translate(0, 1.1, 0);
         const crown = new T.SphereGeometry(2.6, 10, 6); crown.translate(0, 3.8, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 6.17, 5.70);
          b.translate(0, 3.09, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 6.5, 6.0);
          b.translate(0, 3.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Flowering blue mophead hydrangea garden bush group (4.0x5.0m, 2.1m high)
 */
export function vegetationMidhighHydrangeaShrubCluster(seed = "vegetation-midhigh-hydrangea-shrub-cluster-0") {
  return {
    id: "vegetation-midhigh-hydrangea-shrub-cluster",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 5.0 },
    height: 2.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const s1 = new T.SphereGeometry(0.9, 8, 6); s1.translate(-1.0, 0.8, 0);
         const s2 = new T.SphereGeometry(1.0, 8, 6); s2.translate(1.0, 0.85, 0);
         const _m = mergeGeometries([s1, s2], T);; _m.translate(0, 0.150, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 1.99, 4.75);
          b.translate(0, 1.00, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 2.1, 5.0);
          b.translate(0, 1.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Emerald green pyramidal arborvitae privacy cedar (3.0x3.0m, 7.0m high)
 */
export function treeMidhighPyramidalArborvitae(seed = "tree-midhigh-pyramidal-arborvitae-0") {
  return {
    id: "tree-midhigh-pyramidal-arborvitae",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 3.0, d: 3.0 },
    height: 7.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const cone = new T.ConeGeometry(1.2, 6.5, 8); cone.translate(0, 3.25, 0); return cone;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 6.65, 2.85);
          b.translate(0, 3.32, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 7.0, 3.0);
          b.translate(0, 3.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Round architectural precast concrete street urn planter with shrub (2.5x2.5m, 2.1m high)
 */
export function vegetationMidhighConcreteRoundPlanter(seed = "vegetation-midhigh-concrete-round-planter-0") {
  return {
    id: "vegetation-midhigh-concrete-round-planter",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.5, d: 2.5 },
    height: 2.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const pot = new T.CylinderGeometry(1.1, 0.9, 0.9, 10); pot.translate(0, 0.45, 0);
         const bush = new T.SphereGeometry(1.0, 8, 6); bush.translate(0, 1.1, 0);
         return mergeGeometries([pot, bush], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.38, 1.99, 2.38);
          b.translate(0, 1.00, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.5, 2.1, 2.5);
          b.translate(0, 1.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Multi-trunk pink flowering crape myrtle tree (5.0x5.0m, 6.6m high)
 */
export function treeMidhighCrepeMyrtle(seed = "tree-midhigh-crepe-myrtle-0") {
  return {
    id: "tree-midhigh-crepe-myrtle",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 5.0, d: 5.0 },
    height: 6.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.2, 0.35, 2.5, 6); trunk.translate(0, 1.25, 0);
         const crown = new T.SphereGeometry(2.2, 10, 6); crown.translate(0, 4.4, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.75, 6.27, 4.75);
          b.translate(0, 3.13, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.0, 6.6, 5.0);
          b.translate(0, 3.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Broadleaf evergreen rhododendron woodland shrub border (4.0x6.0m, 2.2m high)
 */
export function vegetationMidhighRhododendronThicket(seed = "vegetation-midhigh-rhododendron-thicket-0") {
  return {
    id: "vegetation-midhigh-rhododendron-thicket",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 6.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const bush = new T.BoxGeometry(3.4, 1.8, 5.2); bush.translate(0, 0.9, 0); return bush;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 2.09, 5.70);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 2.2, 6.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: White-blooming ornamental crabapple fruit tree (6.0x6.0m, 7.4m high)
 */
export function treeMidhighCrabappleSpringSnow(seed = "tree-midhigh-crabapple-spring-snow-0") {
  return {
    id: "tree-midhigh-crabapple-spring-snow",
    tier: "midhigh",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 6.0, d: 6.0 },
    height: 7.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.25, 0.4, 2.6, 6); trunk.translate(0, 1.3, 0);
         const crown = new T.SphereGeometry(2.7, 10, 6); crown.translate(0, 4.6, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 7.03, 5.70);
          b.translate(0, 3.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 7.4, 6.0);
          b.translate(0, 3.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard evergreen scotch pine park tree (5.0x5.0m, 9.0m high)
 */
export function treeMidGenericConiferPine(seed = "tree-mid-generic-conifer-pine-0") {
  return {
    id: "tree-mid-generic-conifer-pine",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 5.0, d: 5.0 },
    height: 9.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.25, 0.4, 2.5, 6); trunk.translate(0, 1.25, 0);
         const cone = new T.ConeGeometry(2.2, 6.8, 8); cone.translate(0, 5.6, 0);
         return mergeGeometries([trunk, cone], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.75, 8.55, 4.75);
          b.translate(0, 4.27, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.0, 9.0, 5.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Generic round-crown broadleaf park tree (6.0x6.0m, 8.0m high)
 */
export function treeMidGenericDeciduousRound(seed = "tree-mid-generic-deciduous-round-0") {
  return {
    id: "tree-mid-generic-deciduous-round",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 6.0, d: 6.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.3, 0.5, 3.0, 6); trunk.translate(0, 1.5, 0);
         const crown = new T.SphereGeometry(2.6, 8, 6); crown.translate(0, 5.0, 0);
         return mergeGeometries([trunk, crown], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 7.60, 5.70);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 8.0, 6.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Naturalized unmown wildflower meadow grass patch (6.0x6.0m, 0.8m high)
 */
export function vegetationMidWildflowerMeadowPatch(seed = "vegetation-mid-wildflower-meadow-patch-0") {
  return {
    id: "vegetation-mid-wildflower-meadow-patch",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 6.0, d: 6.0 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const patch = new T.BoxGeometry(5.2, 0.5, 5.2); patch.translate(0, 0.25, 0); return patch;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 0.76, 5.70);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 0.8, 6.0);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Hemispherical landscaped garden shrub bush (2.5x2.5m, 1.5m high)
 */
export function vegetationMidGenericShrubMound(seed = "vegetation-mid-generic-shrub-mound-0") {
  return {
    id: "vegetation-mid-generic-shrub-mound",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.5, d: 2.5 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const mound = new T.SphereGeometry(1.1, 8, 6); mound.scale(1.1, 0.65, 1.1); mound.translate(0, 0.7, 0); const _g = mound; _g.translate(0, 0.015, 0); return _g;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.38, 1.42, 2.38);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.5, 1.5, 2.5);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Wooden slatted rectangular patio flowerbox planter (1.2x3.0m, 1.1m high)
 */
export function vegetationMidRectWoodenPlanterTrough(seed = "vegetation-mid-rect-wooden-planter-trough-0") {
  return {
    id: "vegetation-mid-rect-wooden-planter-trough",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.2, d: 3.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 54,
        createGeometry: (T = THREE) => {
          const trough = new T.BoxGeometry(0.9, 0.55, 2.6); trough.translate(0, 0.275, 0);
         const plant = new T.BoxGeometry(0.8, 0.4, 2.4); plant.translate(0, 0.75, 0);
         return mergeGeometries([trough, plant], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.04, 2.85);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.1, 3.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Wetland emergent marsh cattail and bulrush cluster (2.0x2.0m, 2.2m high)
 */
export function vegetationMidTallCattailReedsCluster(seed = "vegetation-mid-tall-cattail-reeds-cluster-0") {
  return {
    id: "vegetation-mid-tall-cattail-reeds-cluster",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.0, d: 2.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const reeds = new T.CylinderGeometry(0.8, 0.8, 1.9, 6); reeds.translate(0, 0.95, 0); return reeds;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 2.09, 1.90);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 2.2, 2.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Woodland sword fern understory clump (2.2x2.2m, 0.9m high)
 */
export function vegetationMidFernUndergrowthClump(seed = "vegetation-mid-fern-undergrowth-clump-0") {
  return {
    id: "vegetation-mid-fern-undergrowth-clump",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.2, d: 2.2 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 45,
        createGeometry: (T = THREE) => {
          const clump = new T.SphereGeometry(0.95, 8, 6); clump.scale(1.1, 0.45, 1.1); clump.translate(0, 0.4, 0); const _g = clump; _g.translate(0, 0.028, 0); return _g;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 0.85, 2.09);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 0.9, 2.2);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Newly-planted nursery street sapling with wooden support stakes (2.0x2.0m, 3.8m high)
 */
export function treeMidYoungSaplingTreeStakes(seed = "tree-mid-young-sapling-tree-stakes-0") {
  return {
    id: "tree-mid-young-sapling-tree-stakes",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 2.0, d: 2.0 },
    height: 3.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 58,
        createGeometry: (T = THREE) => {
          const trunk = new T.CylinderGeometry(0.06, 0.08, 3.2, 6); trunk.translate(0, 1.6, 0);
         const crown = new T.SphereGeometry(0.9, 8, 6); crown.translate(0, 2.8, 0);
         const stake1 = new T.CylinderGeometry(0.03, 0.03, 1.8, 6); stake1.translate(-0.4, 0.9, 0);
         const stake2 = new T.CylinderGeometry(0.03, 0.03, 1.8, 6); stake2.translate(0.4, 0.9, 0);
         return mergeGeometries([trunk, crown, stake1, stake2], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 3.61, 1.90);
          b.translate(0, 1.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 3.8, 2.0);
          b.translate(0, 1.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Manicured suburban lawn green turf sod tile (8.0x8.0m, 0.1m high)
 */
export function vegetationMidLawnGrassSquareTurf(seed = "vegetation-mid-lawn-grass-square-turf-0") {
  return {
    id: "vegetation-mid-lawn-grass-square-turf",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 8.0, d: 8.0 },
    height: 0.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 40,
        createGeometry: (T = THREE) => {
          const turf = new T.BoxGeometry(7.6, 0.06, 7.6); turf.translate(0, 0.03, 0); return turf;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 0.10, 7.60);
          b.translate(0, 0.05, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 0.1, 8.0);
          b.translate(0, 0.05, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Spreading English ivy evergreen groundcover planting bed (4.0x4.0m, 0.3m high)
 */
export function vegetationMidIvyGroundcoverBed(seed = "vegetation-mid-ivy-groundcover-bed-0") {
  return {
    id: "vegetation-mid-ivy-groundcover-bed",
    tier: "mid",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 4.0, d: 4.0 },
    height: 0.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const ivy = new T.BoxGeometry(3.6, 0.2, 3.6); ivy.translate(0, 0.1, 0); return ivy;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 0.28, 3.80);
          b.translate(0, 0.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 0.3, 4.0);
          b.translate(0, 0.15, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Opportunistic weeds growing through cracked pavement (1.2x1.2m, 0.4m high)
 */
export function vegetationMidlowWeedPatchCrackedPavement(seed = "vegetation-midlow-weed-patch-cracked-pavement-0") {
  return {
    id: "vegetation-midlow-weed-patch-cracked-pavement",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.2, d: 1.2 },
    height: 0.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const weed = new T.BoxGeometry(0.9, 0.25, 0.9); weed.translate(0, 0.125, 0); return weed;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 0.38, 1.14);
          b.translate(0, 0.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 0.4, 1.2);
          b.translate(0, 0.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Shredded bark woodchip landscape mulch tree ring basin (1.8x1.8m, 0.15m high)
 */
export function vegetationMidlowMulchTreeRing(seed = "vegetation-midlow-mulch-tree-ring-0") {
  return {
    id: "vegetation-midlow-mulch-tree-ring",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.8, d: 1.8 },
    height: 0.15,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const ring = new T.CylinderGeometry(0.8, 0.8, 0.08, 8); ring.translate(0, 0.04, 0); return ring;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 0.14, 1.71);
          b.translate(0, 0.07, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 0.15, 1.8);
          b.translate(0, 0.075, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Chainsaw-felled tree stump with radial bark (1.2x1.2m, 0.6m high)
 */
export function vegetationMidlowCutTreeStump(seed = "vegetation-midlow-cut-tree-stump-0") {
  return {
    id: "vegetation-midlow-cut-tree-stump",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.2, d: 1.2 },
    height: 0.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const stump = new T.CylinderGeometry(0.4, 0.5, 0.45, 8); stump.translate(0, 0.225, 0); return stump;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 0.57, 1.14);
          b.translate(0, 0.28, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 0.6, 1.2);
          b.translate(0, 0.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Weathered fallen decomposing tree trunk log (1.0x3.2m, 0.5m high)
 */
export function vegetationMidlowFallenLogDecayed(seed = "vegetation-midlow-fallen-log-decayed-0") {
  return {
    id: "vegetation-midlow-fallen-log-decayed",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.0, d: 3.2 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const log = new T.CylinderGeometry(0.2, 0.22, 2.8, 6); log.rotateX(Math.PI/2); log.translate(0, 0.22, 0); return log;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.47, 3.04);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.5, 3.2);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Individual marsh cattail reed stem with brown seed head (0.4x0.4m, 1.8m high)
 */
export function vegetationMidlowSingleCattailStem(seed = "vegetation-midlow-single-cattail-stem-0") {
  return {
    id: "vegetation-midlow-single-cattail-stem",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 0.4, d: 0.4 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "water", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const stem = new T.CylinderGeometry(0.02, 0.02, 1.6, 6); stem.translate(0, 0.8, 0);
         const head = new T.CylinderGeometry(0.06, 0.06, 0.35, 6); head.translate(0, 1.4, 0);
         return mergeGeometries([stem, head], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.71, 0.38);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.8, 0.4);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Small terra cotta potted decorative houseplant (0.6x0.6m, 0.8m high)
 */
export function vegetationMidlowPottedPlasticFern(seed = "vegetation-midlow-potted-plastic-fern-0") {
  return {
    id: "vegetation-midlow-potted-plastic-fern",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 0.6, d: 0.6 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const pot = new T.CylinderGeometry(0.18, 0.14, 0.3, 8); pot.translate(0, 0.15, 0);
         const fern = new T.SphereGeometry(0.25, 6, 6); fern.translate(0, 0.45, 0);
         return mergeGeometries([pot, fern], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.76, 0.57);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.8, 0.6);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Low-growing white clover patch in lawn turf (1.4x1.4m, 0.15m high)
 */
export function vegetationMidlowCloverPatch(seed = "vegetation-midlow-clover-patch-0") {
  return {
    id: "vegetation-midlow-clover-patch",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 1.4, d: 1.4 },
    height: 0.15,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const patch = new T.BoxGeometry(1.1, 0.06, 1.1); patch.translate(0, 0.03, 0); return patch;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 0.14, 1.33);
          b.translate(0, 0.07, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 0.15, 1.4);
          b.translate(0, 0.075, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Yellow flowering dandelion weed rosette (0.5x0.5m, 0.4m high)
 */
export function vegetationMidlowDandelionTuft(seed = "vegetation-midlow-dandelion-tuft-0") {
  return {
    id: "vegetation-midlow-dandelion-tuft",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 0.5, d: 0.5 },
    height: 0.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const puff = new T.SphereGeometry(0.12, 6, 6); puff.translate(0, 0.18, 0);
         const stem = new T.CylinderGeometry(0.01, 0.01, 0.18, 4); stem.translate(0, 0.09, 0);
         return mergeGeometries([puff, stem], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.47, 0.38, 0.47);
          b.translate(0, 0.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 0.4, 0.5);
          b.translate(0, 0.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Square concrete succulent planter with desert cactus (0.6x0.6m, 0.7m high)
 */
export function vegetationMidlowGravelCactusSucculentPot(seed = "vegetation-midlow-gravel-cactus-succulent-pot-0") {
  return {
    id: "vegetation-midlow-gravel-cactus-succulent-pot",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 0.6, d: 0.6 },
    height: 0.7,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const pot = new T.BoxGeometry(0.35, 0.3, 0.35); pot.translate(0, 0.15, 0);
         const cactus = new T.CylinderGeometry(0.1, 0.1, 0.35, 6); cactus.translate(0, 0.45, 0);
         return mergeGeometries([pot, cactus], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.66, 0.57);
          b.translate(0, 0.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.7, 0.6);
          b.translate(0, 0.35, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Dried arid Russian thistle tumbleweed ball (0.9x0.9m, 0.8m high)
 */
export function vegetationMidlowBrushTumbleweedBall(seed = "vegetation-midlow-brush-tumbleweed-ball-0") {
  return {
    id: "vegetation-midlow-brush-tumbleweed-ball",
    tier: "midlow",
    category: "vegetation",
    kind: "soft",
    footprint: { w: 0.9, d: 0.9 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const ball = new T.DodecahedronGeometry(0.38); ball.translate(0, 0.38, 0); return ball;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.85, 0.76, 0.85);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.9, 0.8, 0.9);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Zaha-inspired sweeping curvilinear glass-and-steel transit super-shelter (6.0x16.0m, 11.9m high)
 */
export function furnitureShowstopperCurvilinearTransitShelter(seed = "furniture-showstopper-curvilinear-transit-shelter-0") {
  return {
    id: "furniture-showstopper-curvilinear-transit-shelter",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 6.0, d: 16.0 },
    height: 11.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(4.5, 0.2, 14.5); base.translate(0, 0.1, 0);
         const canopy = new T.CylinderGeometry(8, 8, 15, 16, 1, false, 0, Math.PI);
         canopy.rotateZ(Math.PI / 2); canopy.scale(0.3, 1, 0.4); canopy.translate(0, 3.8, 0);
         const glass = new T.BoxGeometry(0.2, 3.2, 14); glass.translate(-1.8, 1.8, 0);
         return mergeGeometries([base, canopy, glass], T);
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 11.30, 15.20);
          b.translate(0, 5.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 11.9, 16.0);
          b.translate(0, 5.95, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Monumental bronze kinetic water sculpture fountain (16.0x16.0m, 8.7m high)
 */
export function furnitureShowstopperGrandPlazaFountainSculpture(seed = "furniture-showstopper-grand-plaza-fountain-sculpture-0") {
  return {
    id: "furniture-showstopper-grand-plaza-fountain-sculpture",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 8.7,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const basin = new T.CylinderGeometry(7.5, 7.8, 1.2, 24); basin.translate(0, 0.6, 0);
         const sculp = new T.TorusGeometry(3.5, 0.6, 12, 24); sculp.translate(0, 4.5, 0);
         const core = new T.CylinderGeometry(0.8, 1.4, 4.0, 12); core.translate(0, 2.6, 0);
         return mergeGeometries([basin, sculp, core], T);
        },
      },
      {
        level: 1,
        tris: 62,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 8.26, 15.20);
          b.translate(0, 4.13, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 8.7, 16.0);
          b.translate(0, 4.35, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Smart solar leaf canopy with 360-degree wireless charging ring bench (8.0x8.0m, 5.1m high)
 */
export function furnitureShowstopperSolarCanopySeatingHub(seed = "furniture-showstopper-solar-canopy-seating-hub-0") {
  return {
    id: "furniture-showstopper-solar-canopy-seating-hub",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 8.0, d: 8.0 },
    height: 5.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.3, 0.4, 4.2, 10); mast.translate(0, 2.1, 0);
         const canopy = new T.CylinderGeometry(3.6, 3.6, 0.3, 8); canopy.rotateX(0.15); canopy.translate(0, 4.4, 0);
         const bench = new T.TorusGeometry(2.4, 0.35, 8, 16); bench.rotateX(Math.PI/2); bench.translate(0, 0.45, 0);
         return mergeGeometries([mast, canopy, bench], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 4.84, 7.60);
          b.translate(0, 2.42, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 5.1, 8.0);
          b.translate(0, 2.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: 12m Polished stainless steel counter-rotating aerodynamic wind sculpture (6.0x6.0m, 12.0m high)
 */
export function furnitureShowstopperKineticWindSculpture(seed = "furniture-showstopper-kinetic-wind-sculpture-0") {
  return {
    id: "furniture-showstopper-kinetic-wind-sculpture",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 6.0, d: 6.0 },
    height: 12.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(0.4, 0.6, 8.5, 8); base.translate(0, 4.25, 0);
         const ring1 = new T.TorusGeometry(2.2, 0.15, 8, 16); ring1.translate(0, 9.5, 0);
         const ring2 = new T.TorusGeometry(1.6, 0.15, 8, 16); ring2.rotateY(0.6); ring2.translate(0, 9.5, 0);
         return mergeGeometries([base, ring1, ring2], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 11.40, 5.70);
          b.translate(0, 5.70, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 12.0, 6.0);
          b.translate(0, 6.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Contemporary timber louvered promenade pergola colonnade (8.0x24.0m, 4.5m high)
 */
export function furnitureShowstopperCurvedPergolaColonnade(seed = "furniture-showstopper-curved-pergola-colonnade-0") {
  return {
    id: "furniture-showstopper-curved-pergola-colonnade",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 8.0, d: 24.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const col1 = new T.CylinderGeometry(0.2, 0.25, 4.0, 8); col1.translate(-2.5, 2.0, -9);
         const col2 = new T.CylinderGeometry(0.2, 0.25, 4.0, 8); col2.translate(2.5, 2.0, -9);
         const col3 = new T.CylinderGeometry(0.2, 0.25, 4.0, 8); col3.translate(-2.5, 2.0, 9);
         const col4 = new T.CylinderGeometry(0.2, 0.25, 4.0, 8); col4.translate(2.5, 2.0, 9);
         const roof = new T.BoxGeometry(7.2, 0.4, 22); roof.translate(0, 4.2, 0);
         return mergeGeometries([col1, col2, col3, col4, roof], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.60, 4.27, 22.80);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(8.0, 4.5, 24.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Enclosed acoustic living moss meditation and wellness retreat pod (6.0x6.0m, 4.6m high)
 */
export function furnitureShowstopperBiophilicMossWellnessPod(seed = "furniture-showstopper-biophilic-moss-wellness-pod-0") {
  return {
    id: "furniture-showstopper-biophilic-moss-wellness-pod",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 6.0, d: 6.0 },
    height: 4.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const dome = new T.SphereGeometry(2.8, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6); dome.translate(0, 1.8, 0);
         const bench = new T.TorusGeometry(1.8, 0.3, 8, 16); bench.rotateX(Math.PI/2); bench.translate(0, 0.5, 0);
         return mergeGeometries([dome, bench], T);
        },
      },
      {
        level: 1,
        tris: 50,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 4.37, 5.70);
          b.translate(0, 2.18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 4.6, 6.0);
          b.translate(0, 2.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Dual-sided 8K digital smart city wayfinding kiosk beacon (2.4x2.4m, 4.2m high)
 */
export function furnitureShowstopperSmartInteractiveDigitalKiosk(seed = "furniture-showstopper-smart-interactive-digital-kiosk-0") {
  return {
    id: "furniture-showstopper-smart-interactive-digital-kiosk",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.4, d: 2.4 },
    height: 4.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 450,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(1.6, 0.3, 1.6); base.translate(0, 0.15, 0);
         const monolith = new T.BoxGeometry(1.2, 3.8, 0.4); monolith.translate(0, 2.1, 0);
         const canopy = new T.BoxGeometry(2.2, 0.2, 1.2); canopy.translate(0, 4.0, 0);
         return mergeGeometries([base, monolith, canopy], T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 3.99, 2.28);
          b.translate(0, 1.99, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 4.2, 2.4);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Parametric spiral sheltered 40-bike automated parking pavilion (14.0x16.0m, 3.8m high)
 */
export function furnitureShowstopperHelixBicycleParkingPavilion(seed = "furniture-showstopper-helix-bicycle-parking-pavilion-0") {
  return {
    id: "furniture-showstopper-helix-bicycle-parking-pavilion",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 14.0, d: 16.0 },
    height: 3.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const canopy = new T.TorusGeometry(5.5, 1.2, 8, 20, Math.PI); canopy.rotateX(Math.PI/2); canopy.translate(0, 2.6, 0);
         const racks = new T.BoxGeometry(6.5, 0.8, 14); racks.translate(0, 0.4, 0);
         return mergeGeometries([canopy, racks], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(13.30, 3.61, 15.20);
          b.translate(0, 1.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(14.0, 3.8, 16.0);
          b.translate(0, 1.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Black granite mirror-finish acoustic reflecting water table (6.0x12.0m, 1.2m high)
 */
export function furnitureShowstopperInfinityReflectingPoolTable(seed = "furniture-showstopper-infinity-reflecting-pool-table-0") {
  return {
    id: "furniture-showstopper-infinity-reflecting-pool-table",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 6.0, d: 12.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 440,
        createGeometry: (T = THREE) => {
          const basin = new T.BoxGeometry(5.4, 0.8, 11.2); basin.translate(0, 0.4, 0);
         const top = new T.BoxGeometry(5.6, 0.1, 11.4); top.translate(0, 0.85, 0);
         return mergeGeometries([basin, top], T);
        },
      },
      {
        level: 1,
        tris: 46,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(5.70, 1.14, 11.40);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.0, 1.2, 12.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Semicircular stepped granite outdoor civic gathering amphitheatre (16.0x16.0m, 3.2m high)
 */
export function furnitureShowstopperAmphitheatreSteppedSeatingBowl(seed = "furniture-showstopper-amphitheatre-stepped-seating-bowl-0") {
  return {
    id: "furniture-showstopper-amphitheatre-stepped-seating-bowl",
    tier: "showstopper",
    category: "furniture",
    kind: "hard",
    footprint: { w: 16.0, d: 16.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const t1 = new T.CylinderGeometry(7.5, 7.8, 0.6, 24, 1, false, 0, Math.PI); t1.translate(0, 0.3, 0);
         const t2 = new T.CylinderGeometry(5.5, 5.8, 0.6, 24, 1, false, 0, Math.PI); t2.translate(0, 0.9, 0);
         const t3 = new T.CylinderGeometry(3.5, 3.8, 0.6, 24, 1, false, 0, Math.PI); t3.translate(0, 1.5, 0);
         return mergeGeometries([t1, t2, t3], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(15.20, 3.04, 15.20);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 3.2, 16.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Custom continuous solid teak ribbon serpentine garden park bench (3.0x10.0m, 1.1m high)
 */
export function furnitureLuxurySolidTeakSerpentineBench(seed = "furniture-luxury-solid-teak-serpentine-bench-0") {
  return {
    id: "furniture-luxury-solid-teak-serpentine-bench",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 3.0, d: 10.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const s1 = new T.BoxGeometry(1.6, 0.45, 4.5); s1.rotateY(0.2); s1.translate(0, 0.45, -2.2);
         const s2 = new T.BoxGeometry(1.6, 0.45, 4.5); s2.rotateY(-0.2); s2.translate(0, 0.45, 2.2);
         return mergeGeometries([s1, s2], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 1.04, 9.50);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 1.1, 10.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Twin-lantern ornamental antique bronze heritage gaslamp column (2.0x2.0m, 6.5m high)
 */
export function furnitureLuxuryBronzeCastStreetlampPost(seed = "furniture-luxury-bronze-cast-streetlamp-post-0") {
  return {
    id: "furniture-luxury-bronze-cast-streetlamp-post",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.0, d: 2.0 },
    height: 6.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(0.35, 0.5, 1.2, 8); base.translate(0, 0.6, 0);
         const shaft = new T.CylinderGeometry(0.12, 0.2, 4.2, 8); shaft.translate(0, 3.2, 0);
         const head1 = new T.BoxGeometry(0.45, 0.6, 0.45); head1.translate(-0.6, 5.6, 0);
         const head2 = new T.BoxGeometry(0.45, 0.6, 0.45); head2.translate(0.6, 5.6, 0);
         return mergeGeometries([base, shaft, head1, head2], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 6.17, 1.90);
          b.translate(0, 3.09, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 6.5, 2.0);
          b.translate(0, 3.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Rattan luxury resort dining cabana with fabric umbrella canopy (4.0x4.0m, 3.2m high)
 */
export function furnitureLuxuryOutdoorDiningCabanaSet(seed = "furniture-luxury-outdoor-dining-cabana-set-0") {
  return {
    id: "furniture-luxury-outdoor-dining-cabana-set",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const table = new T.CylinderGeometry(1.0, 1.0, 0.75, 12); table.translate(0, 0.4, 0);
         const roof = new T.ConeGeometry(1.8, 0.6, 8); roof.translate(0, 2.8, 0);
         const pole = new T.CylinderGeometry(0.05, 0.05, 2.8, 6); pole.translate(0, 1.4, 0);
         return mergeGeometries([table, roof, pole], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 3.04, 3.80);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 3.2, 4.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Pair of teak poolside sun loungers with travertine drinks table (3.0x3.0m, 1.4m high)
 */
export function furnitureLuxuryLoungerDaybedTerracePair(seed = "furniture-luxury-lounger-daybed-terrace-pair-0") {
  return {
    id: "furniture-luxury-lounger-daybed-terrace-pair",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 3.0, d: 3.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const l1 = new T.BoxGeometry(1.0, 0.4, 2.2); l1.translate(-0.8, 0.25, 0);
         const l2 = new T.BoxGeometry(1.0, 0.4, 2.2); l2.translate(0.8, 0.25, 0);
         const stand = new T.BoxGeometry(0.5, 0.4, 0.5); stand.translate(0, 0.25, 0);
         return mergeGeometries([l1, l2, stand], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 1.33, 2.85);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 1.4, 3.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Carved Carrara marble pedestal dual-height drinking fountain (1.5x1.5m, 1.3m high)
 */
export function furnitureLuxuryMarbleDrinkingFountain(seed = "furniture-luxury-marble-drinking-fountain-0") {
  return {
    id: "furniture-luxury-marble-drinking-fountain",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.5, d: 1.5 },
    height: 1.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const col = new T.CylinderGeometry(0.3, 0.4, 0.9, 10); col.translate(0, 0.45, 0);
         const basin = new T.CylinderGeometry(0.5, 0.3, 0.3, 12); basin.translate(0, 1.05, 0);
         return mergeGeometries([col, basin], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 1.23, 1.42);
          b.translate(0, 0.62, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 1.3, 1.5);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Honed Jura limestone curved amphitheatre garden bench (7.0x7.0m, 1.0m high)
 */
export function furnitureLuxuryCurvedLimestoneBench(seed = "furniture-luxury-curved-limestone-bench-0") {
  return {
    id: "furniture-luxury-curved-limestone-bench",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 7.0, d: 7.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const seat = new T.TorusGeometry(3.0, 0.4, 8, 16, Math.PI * 0.6); seat.rotateX(Math.PI/2); seat.translate(0, 0.45, 0);
         const base = new T.BoxGeometry(1.8, 0.3, 4.5); base.translate(0, 0.15, 0);
         return mergeGeometries([seat, base], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(6.65, 0.95, 6.65);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(7.0, 1.0, 7.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Glass enclosed heated transit shelter with integrated LED bench (3.5x8.0m, 3.2m high)
 */
export function furnitureLuxuryHeatedBusWaitingShelter(seed = "furniture-luxury-heated-bus-waiting-shelter-0") {
  return {
    id: "furniture-luxury-heated-bus-waiting-shelter",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 3.5, d: 8.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const glass = new T.BoxGeometry(0.1, 2.6, 7.2); glass.translate(-1.4, 1.3, 0);
         const roof = new T.BoxGeometry(3.0, 0.3, 7.6); roof.translate(0, 2.9, 0);
         const seat = new T.BoxGeometry(0.5, 0.45, 6.0); seat.translate(-1.0, 0.45, 0);
         return mergeGeometries([glass, roof, seat], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.32, 3.04, 7.60);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.5, 3.2, 8.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Row of architectural brushed brass LED glowing pathway bollards (1.0x8.0m, 1.1m high)
 */
export function furnitureLuxuryBrassIlluminatedBollardsRow(seed = "furniture-luxury-brass-illuminated-bollards-row-0") {
  return {
    id: "furniture-luxury-brass-illuminated-bollards-row",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 8.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "roadway"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const b1 = new T.CylinderGeometry(0.12, 0.12, 0.95, 8); b1.translate(0, 0.475, -3.0);
         const b2 = new T.CylinderGeometry(0.12, 0.12, 0.95, 8); b2.translate(0, 0.475, 0);
         const b3 = new T.CylinderGeometry(0.12, 0.12, 0.95, 8); b3.translate(0, 0.475, 3.0);
         return mergeGeometries([b1, b2, b3], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 1.04, 7.60);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 1.1, 8.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Natural stone outdoor gas fire pit table with lava rock center (3.0x3.0m, 1.0m high)
 */
export function furnitureLuxuryGasFirePitLoungeTable(seed = "furniture-luxury-gas-fire-pit-lounge-table-0") {
  return {
    id: "furniture-luxury-gas-fire-pit-lounge-table",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 3.0, d: 3.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 275,
        createGeometry: (T = THREE) => {
          const table = new T.BoxGeometry(2.6, 0.5, 2.6); table.translate(0, 0.35, 0);
         const pit = new T.CylinderGeometry(0.6, 0.6, 0.2, 12); pit.translate(0, 0.65, 0);
         return mergeGeometries([table, pit], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 0.95, 2.85);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 1.0, 3.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Four-faced illuminated four-sided civic plaza clock tower column (2.2x2.2m, 5.5m high)
 */
export function furnitureLuxurySculpturalClockKiosk(seed = "furniture-luxury-sculptural-clock-kiosk-0") {
  return {
    id: "furniture-luxury-sculptural-clock-kiosk",
    tier: "luxury",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.2, d: 2.2 },
    height: 5.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 305,
        createGeometry: (T = THREE) => {
          const col = new T.CylinderGeometry(0.25, 0.4, 4.0, 8); col.translate(0, 2.0, 0);
         const clock = new T.BoxGeometry(1.2, 1.2, 1.2); clock.translate(0, 4.6, 0);
         return mergeGeometries([col, clock], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 5.22, 2.09);
          b.translate(0, 2.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 5.5, 2.2);
          b.translate(0, 2.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Powder-coated steel and FSC hardwood street bench with backrest (1.2x3.2m, 1.0m high)
 */
export function furnitureHighendContemporarySteelWoodBench(seed = "furniture-highend-contemporary-steel-wood-bench-0") {
  return {
    id: "furniture-highend-contemporary-steel-wood-bench",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.2, d: 3.2 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(0.8, 0.8, 2.8); frame.translate(0, 0.4, 0);
         const slats = new T.BoxGeometry(0.6, 0.1, 2.9); slats.translate(0, 0.48, 0);
         return mergeGeometries([frame, slats], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 0.95, 3.04);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.0, 3.2);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: 8m High-efficiency LED roadway illumination luminaire mast (1.5x4.0m, 8.5m high)
 */
export function furnitureHighendLedStreetLightMast(seed = "furniture-highend-led-street-light-mast-0") {
  return {
    id: "furniture-highend-led-street-light-mast",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.5, d: 4.0 },
    height: 8.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.12, 0.18, 8.0, 8); pole.translate(0, 4.0, 0);
         const arm = new T.BoxGeometry(0.15, 0.15, 2.0); arm.translate(0, 8.1, 0.8);
         return mergeGeometries([pole, arm], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 8.07, 3.80);
          b.translate(0, 4.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 8.5, 4.0);
          b.translate(0, 4.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Standard urban cantilevered glass bus passenger shelter (2.6x6.0m, 2.8m high)
 */
export function furnitureHighendModularBusStopShelter(seed = "furniture-highend-modular-bus-stop-shelter-0") {
  return {
    id: "furniture-highend-modular-bus-stop-shelter",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.6, d: 6.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 200,
        createGeometry: (T = THREE) => {
          const glass = new T.BoxGeometry(0.1, 2.4, 5.4); glass.translate(-1.0, 1.2, 0);
         const roof = new T.BoxGeometry(2.2, 0.25, 5.8); roof.translate(0, 2.5, 0);
         const bench = new T.BoxGeometry(0.4, 0.45, 4.0); bench.translate(-0.6, 0.45, 0);
         return mergeGeometries([glass, roof, bench], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.47, 2.66, 5.70);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.6, 2.8, 6.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Row of brushed stainless steel inverted-U Sheffield bicycle racks (1.2x6.0m, 1.1m high)
 */
export function furnitureHighendStainlessBikeRackRow(seed = "furniture-highend-stainless-bike-rack-row-0") {
  return {
    id: "furniture-highend-stainless-bike-rack-row",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.2, d: 6.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const r1 = new T.TorusGeometry(0.45, 0.05, 6, 12, Math.PI); r1.translate(0, 0.5, -2.0);
         const r2 = new T.TorusGeometry(0.45, 0.05, 6, 12, Math.PI); r2.translate(0, 0.5, 0);
         const r3 = new T.TorusGeometry(0.45, 0.05, 6, 12, Math.PI); r3.translate(0, 0.5, 2.0);
         return mergeGeometries([r1, r2, r3], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.04, 5.70);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.1, 6.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Dual-stream stainless steel municipal litter and recycling kiosk (1.2x2.2m, 1.4m high)
 */
export function furnitureHighendDualStreamWasteRecyclingStation(seed = "furniture-highend-dual-stream-waste-recycling-station-0") {
  return {
    id: "furniture-highend-dual-stream-waste-recycling-station",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.2, d: 2.2 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(0.7, 1.2, 0.7); b1.translate(0, 0.6, -0.5);
         const b2 = new T.BoxGeometry(0.7, 1.2, 0.7); b2.translate(0, 0.6, 0.5);
         return mergeGeometries([b1, b2], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 1.33, 2.09);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 1.4, 2.2);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Dual-port Level 2 electric vehicle fast-charging pedestal (1.0x1.6m, 2.0m high)
 */
export function furnitureHighendEvChargingPedestalStation(seed = "furniture-highend-ev-charging-pedestal-station-0") {
  return {
    id: "furniture-highend-ev-charging-pedestal-station",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 1.6 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(0.6, 1.7, 0.6); base.translate(0, 0.85, 0);
         const cord = new T.CylinderGeometry(0.04, 0.04, 1.2, 6); cord.translate(0.35, 0.9, 0);
         return mergeGeometries([base, cord], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 1.90, 1.52);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 2.0, 1.6);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Heavy timber park picnic pavilion with integrated benches (4.0x4.0m, 3.2m high)
 */
export function furnitureHighendPicnicTableTimberShelter(seed = "furniture-highend-picnic-table-timber-shelter-0") {
  return {
    id: "furniture-highend-picnic-table-timber-shelter",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 4.0, d: 4.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const table = new T.BoxGeometry(1.8, 0.75, 2.4); table.translate(0, 0.4, 0);
         const canopy = new T.BoxGeometry(3.6, 0.2, 3.6); canopy.translate(0, 2.8, 0);
         const p1 = new T.BoxGeometry(0.15, 2.6, 0.15); p1.translate(-1.6, 1.4, -1.6);
         const p2 = new T.BoxGeometry(0.15, 2.6, 0.15); p2.translate(1.6, 1.4, 1.6);
         return mergeGeometries([table, canopy, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 30,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 3.04, 3.80);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 3.2, 4.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Aluminum pedestrian city map and directional wayfinding totem (1.0x1.6m, 3.2m high)
 */
export function furnitureHighendWayfindingMonolithTotem(seed = "furniture-highend-wayfinding-monolith-totem-0") {
  return {
    id: "furniture-highend-wayfinding-monolith-totem",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 1.6 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const totem = new T.BoxGeometry(0.4, 3.0, 1.2); totem.translate(0, 1.5, 0); return totem;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 3.04, 1.52);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 3.2, 1.6);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Cedar timber garden arbor with suspended porch swing seat (2.4x3.8m, 2.8m high)
 */
export function furnitureHighendParkPergolaSwingSeat(seed = "furniture-highend-park-pergola-swing-seat-0") {
  return {
    id: "furniture-highend-park-pergola-swing-seat",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.4, d: 3.8 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(2.0, 2.6, 3.4); frame.translate(0, 1.3, 0);
         const seat = new T.BoxGeometry(0.8, 0.5, 2.2); seat.translate(0, 0.6, 0);
         return mergeGeometries([frame, seat], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.28, 2.66, 3.61);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 2.8, 3.8);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Decorative cast iron sidewalk tree root protection grate (2.2x2.2m, 0.15m high)
 */
export function furnitureHighendCastIronTreeGrate(seed = "furniture-highend-cast-iron-tree-grate-0") {
  return {
    id: "furniture-highend-cast-iron-tree-grate",
    tier: "highend",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.2, d: 2.2 },
    height: 0.15,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 155,
        createGeometry: (T = THREE) => {
          const ring = new T.BoxGeometry(1.8, 0.08, 1.8); ring.translate(0, 0.04, 0); return ring;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 0.14, 2.09);
          b.translate(0, 0.07, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 0.15, 2.2);
          b.translate(0, 0.075, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Standard slatted oak wood park bench with cast iron legs (1.0x2.4m, 0.9m high)
 */
export function furnitureMidhighSlattedWoodParkBench(seed = "furniture-midhigh-slatted-wood-park-bench-0") {
  return {
    id: "furniture-midhigh-slatted-wood-park-bench",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 2.4 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const bench = new T.BoxGeometry(0.7, 0.75, 2.1); bench.translate(0, 0.38, 0); return bench;
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.85, 2.28);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.9, 2.4);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Standard cobra-head roadway sodium street lighting pole (1.2x3.0m, 7.9m high)
 */
export function furnitureMidhighCobraHeadStreetlight(seed = "furniture-midhigh-cobra-head-streetlight-0") {
  return {
    id: "furniture-midhigh-cobra-head-streetlight",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.2, d: 3.0 },
    height: 7.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.1, 0.15, 7.0, 8); pole.translate(0, 3.5, 0);
         const arm = new T.CylinderGeometry(0.06, 0.06, 1.6, 6); arm.rotateX(0.5); arm.translate(0, 7.1, 0.6);
         return mergeGeometries([pole, arm], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 7.50, 2.85);
          b.translate(0, 3.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 7.9, 3.0);
          b.translate(0, 3.95, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Traditional wooden A-frame park picnic table with attached benches (2.2x2.2m, 0.9m high)
 */
export function furnitureMidhighWoodenPicnicTable(seed = "furniture-midhigh-wooden-picnic-table-0") {
  return {
    id: "furniture-midhigh-wooden-picnic-table",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.2, d: 2.2 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const top = new T.BoxGeometry(1.0, 0.08, 1.9); top.translate(0, 0.72, 0);
         const b1 = new T.BoxGeometry(0.3, 0.06, 1.9); b1.translate(-0.8, 0.42, 0);
         const b2 = new T.BoxGeometry(0.3, 0.06, 1.9); b2.translate(0.8, 0.42, 0);
         const legs = new T.BoxGeometry(1.8, 0.7, 1.6); legs.translate(0, 0.35, 0);
         return mergeGeometries([top, b1, b2, legs], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 0.85, 2.09);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 0.9, 2.2);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Pair of traditional bell-top cast iron traffic barrier bollards (0.6x3.0m, 1.0m high)
 */
export function furnitureMidhighCastIronBollardPair(seed = "furniture-midhigh-cast-iron-bollard-pair-0") {
  return {
    id: "furniture-midhigh-cast-iron-bollard-pair",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 3.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const b1 = new T.CylinderGeometry(0.12, 0.15, 0.85, 8); b1.translate(0, 0.425, -1.0);
         const b2 = new T.CylinderGeometry(0.12, 0.15, 0.85, 8); b2.translate(0, 0.425, 1.0);
         return mergeGeometries([b1, b2], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.95, 2.85);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.0, 3.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Expanded metal mesh park trash can with rain lid (0.8x0.8m, 1.1m high)
 */
export function furnitureMidhighMeshLitterReceptacle(seed = "furniture-midhigh-mesh-litter-receptacle-0") {
  return {
    id: "furniture-midhigh-mesh-litter-receptacle",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const can = new T.CylinderGeometry(0.35, 0.3, 0.85, 10); can.translate(0, 0.45, 0); return can;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.04, 0.76);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.1, 0.8);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Galvanized tubular steel inverted-U bike locking hoop (1.0x1.8m, 1.0m high)
 */
export function furnitureMidhighSingleLoopBikeRack(seed = "furniture-midhigh-single-loop-bike-rack-0") {
  return {
    id: "furniture-midhigh-single-loop-bike-rack",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 1.8 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const hoop = new T.TorusGeometry(0.45, 0.04, 6, 12, Math.PI); hoop.translate(0, 0.5, 0); return hoop;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.95, 1.71);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 1.0, 1.8);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Street corner coin-operated newspaper honor distribution boxes (0.8x1.4m, 1.3m high)
 */
export function furnitureMidhighNewspaperVendingBox(seed = "furniture-midhigh-newspaper-vending-box-0") {
  return {
    id: "furniture-midhigh-newspaper-vending-box",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 1.4 },
    height: 1.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const box1 = new T.BoxGeometry(0.5, 1.1, 0.5); box1.translate(0, 0.55, -0.35);
         const box2 = new T.BoxGeometry(0.5, 1.1, 0.5); box2.translate(0, 0.55, 0.35);
         return mergeGeometries([box1, box2], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.23, 1.33);
          b.translate(0, 0.62, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.3, 1.4);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Heavy precast concrete dome-top spherical safety bollard (0.8x0.8m, 0.9m high)
 */
export function furnitureMidhighConcreteRoundBollard(seed = "furniture-midhigh-concrete-round-bollard-0") {
  return {
    id: "furniture-midhigh-concrete-round-bollard",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 85,
        createGeometry: (T = THREE) => {
          const b = new T.CylinderGeometry(0.3, 0.3, 0.75, 8); b.translate(0, 0.375, 0); return b;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.85, 0.76);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 0.9, 0.8);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Cast aluminum outdoor park bubbler drinking fountain (0.8x0.8m, 1.1m high)
 */
export function furnitureMidhighParkDrinkingWaterFountain(seed = "furniture-midhigh-park-drinking-water-fountain-0") {
  return {
    id: "furniture-midhigh-park-drinking-water-fountain",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const col = new T.BoxGeometry(0.35, 0.85, 0.35); col.translate(0, 0.425, 0);
         const basin = new T.BoxGeometry(0.5, 0.15, 0.5); basin.translate(0, 0.9, 0);
         return mergeGeometries([col, basin], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.04, 0.76);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.1, 0.8);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Community public notice bulletin display board on posts (0.6x2.2m, 2.2m high)
 */
export function furnitureMidhighPublicBulletinNoticeBoard(seed = "furniture-midhigh-public-bulletin-notice-board-0") {
  return {
    id: "furniture-midhigh-public-bulletin-notice-board",
    tier: "midhigh",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 2.2 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const p1 = new T.BoxGeometry(0.1, 1.9, 0.1); p1.translate(0, 0.95, -0.8);
         const p2 = new T.BoxGeometry(0.1, 1.9, 0.1); p2.translate(0, 0.95, 0.8);
         const board = new T.BoxGeometry(0.1, 1.0, 1.5); board.translate(0, 1.4, 0);
         return mergeGeometries([p1, p2, board], T);
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 2.09, 2.09);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.2, 2.2);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard backless perforated steel strap bench (0.8x2.0m, 0.8m high)
 */
export function furnitureMidBasicSteelSlatBench(seed = "furniture-mid-basic-steel-slat-bench-0") {
  return {
    id: "furniture-mid-basic-steel-slat-bench",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 2.0 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const bench = new T.BoxGeometry(0.6, 0.7, 1.8); bench.translate(0, 0.35, 0); return bench;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.76, 1.90);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 0.8, 2.0);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Basic galvanized steel parking lot light pole (0.8x1.0m, 6.0m high)
 */
export function furnitureMidGalvanizedLightPole(seed = "furniture-mid-galvanized-light-pole-0") {
  return {
    id: "furniture-mid-galvanized-light-pole",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 1.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.08, 0.12, 5.5, 6); pole.translate(0, 2.75, 0);
         const lamp = new T.BoxGeometry(0.3, 0.2, 0.5); lamp.translate(0, 5.6, 0.2);
         return mergeGeometries([pole, lamp], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 5.70, 0.95);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 6.0, 1.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Exposed aggregate concrete round waste receptacle (0.8x0.8m, 1.0m high)
 */
export function furnitureMidRoundConcreteTrashCan(seed = "furniture-mid-round-concrete-trash-can-0") {
  return {
    id: "furniture-mid-round-concrete-trash-can",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const can = new T.CylinderGeometry(0.35, 0.35, 0.85, 8); can.translate(0, 0.425, 0); return can;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.95, 0.76);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.0, 0.8);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Yellow safety steel pipe bollard with reflective tape (0.5x0.5m, 1.1m high)
 */
export function furnitureMidSteelPipeBollard(seed = "furniture-mid-steel-pipe-bollard-0") {
  return {
    id: "furniture-mid-steel-pipe-bollard",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.5, d: 0.5 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.1, 0.1, 0.95, 6); pole.translate(0, 0.475, 0); return pole;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.47, 1.04, 0.47);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 1.1, 0.5);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Municipal transit bus route timetable flag stop sign (0.6x0.6m, 2.8m high)
 */
export function furnitureMidBusStopFlagPole(seed = "furniture-mid-bus-stop-flag-pole-0") {
  return {
    id: "furniture-mid-bus-stop-flag-pole",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.03, 0.03, 2.5, 6); pole.translate(0, 1.25, 0);
         const sign = new T.BoxGeometry(0.05, 0.4, 0.3); sign.translate(0, 2.3, 0.1);
         return mergeGeometries([pole, sign], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 2.66, 0.57);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.8, 0.6);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Molded polypropylene outdoor cafe table and four chairs set (2.2x2.2m, 0.9m high)
 */
export function furnitureMidOutdoorPlasticTableChairs(seed = "furniture-mid-outdoor-plastic-table-chairs-0") {
  return {
    id: "furniture-mid-outdoor-plastic-table-chairs",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 2.2, d: 2.2 },
    height: 0.9,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const table = new T.BoxGeometry(1.0, 0.75, 1.0); table.translate(0, 0.375, 0);
         const c1 = new T.BoxGeometry(0.4, 0.75, 0.4); c1.translate(-0.8, 0.375, 0);
         const c2 = new T.BoxGeometry(0.4, 0.75, 0.4); c2.translate(0.8, 0.375, 0);
         return mergeGeometries([table, c1, c2], T);
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.09, 0.85, 2.09);
          b.translate(0, 0.43, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 0.9, 2.2);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Traditional galvanized toast-rack 5-slot bicycle stand (1.0x2.4m, 0.8m high)
 */
export function furnitureMidGridBikeRackStand(seed = "furniture-mid-grid-bike-rack-stand-0") {
  return {
    id: "furniture-mid-grid-bike-rack-stand",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 2.4 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(0.6, 0.65, 2.2); frame.translate(0, 0.325, 0); return frame;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.76, 2.28);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.8, 2.4);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Minimalist precast concrete cubic street seating block (0.8x0.8m, 0.5m high)
 */
export function furnitureMidSquareConcreteSeatCube(seed = "furniture-mid-square-concrete-seat-cube-0") {
  return {
    id: "furniture-mid-square-concrete-seat-cube",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 40,
        createGeometry: (T = THREE) => {
          const cube = new T.BoxGeometry(0.65, 0.45, 0.65); cube.translate(0, 0.225, 0); return cube;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.47, 0.76);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 0.5, 0.8);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Red municipal emergency telegraph fire alarm pull station pedestal (0.6x0.6m, 1.8m high)
 */
export function furnitureMidFireAlarmCallBoxPedestal(seed = "furniture-mid-fire-alarm-call-box-pedestal-0") {
  return {
    id: "furniture-mid-fire-alarm-call-box-pedestal",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 45,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.06, 0.08, 1.4, 6); post.translate(0, 0.7, 0);
         const box = new T.BoxGeometry(0.3, 0.4, 0.25); box.translate(0, 1.45, 0);
         return mergeGeometries([post, box], T);
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.71, 0.57);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.8, 0.6);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Free-standing brushed aluminum outdoor cigarette disposal urn (0.4x0.4m, 1.1m high)
 */
export function furnitureMidOutdoorAshtrayPoleBin(seed = "furniture-mid-outdoor-ashtray-pole-bin-0") {
  return {
    id: "furniture-mid-outdoor-ashtray-pole-bin",
    tier: "mid",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.4, d: 0.4 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.04, 0.04, 0.9, 6); pole.translate(0, 0.45, 0);
         const top = new T.CylinderGeometry(0.12, 0.12, 0.18, 6); top.translate(0, 0.95, 0);
         return mergeGeometries([pole, top], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.04, 0.38);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.1, 0.4);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Basic molded plastic patio Monobloc chair (0.6x0.6m, 0.85m high)
 */
export function furnitureMidlowPlasticStackingChair(seed = "furniture-midlow-plastic-stacking-chair-0") {
  return {
    id: "furniture-midlow-plastic-stacking-chair",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 0.85,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const seat = new T.BoxGeometry(0.42, 0.4, 0.42); seat.translate(0, 0.22, 0);
         const back = new T.BoxGeometry(0.42, 0.4, 0.05); back.translate(0, 0.62, -0.18);
         return mergeGeometries([seat, back], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.81, 0.57);
          b.translate(0, 0.40, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.85, 0.6);
          b.translate(0, 0.425, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Standard blue plastic residential curbside recycling crate (0.6x0.6m, 0.5m high)
 */
export function furnitureMidlowCurbsideBlueRecyclingBox(seed = "furniture-midlow-curbside-blue-recycling-box-0") {
  return {
    id: "furniture-midlow-curbside-blue-recycling-box",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(0.42, 0.38, 0.42); box.translate(0, 0.19, 0); return box;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.47, 0.57);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.5, 0.6);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Square vinyl folding card and utility table (1.0x1.0m, 0.75m high)
 */
export function furnitureMidlowFoldingCardTable(seed = "furniture-midlow-folding-card-table-0") {
  return {
    id: "furniture-midlow-folding-card-table",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.0, d: 1.0 },
    height: 0.75,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const top = new T.BoxGeometry(0.85, 0.04, 0.85); top.translate(0, 0.71, 0);
         const legs = new T.BoxGeometry(0.8, 0.68, 0.8); legs.translate(0, 0.34, 0);
         return mergeGeometries([top, legs], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 0.71, 0.95);
          b.translate(0, 0.36, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.75, 1.0);
          b.translate(0, 0.375, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: 2x4 Wooden carpenter sawhorse barricade (0.8x1.2m, 0.8m high)
 */
export function furnitureMidlowWoodenSawhorseBarrier(seed = "furniture-midlow-wooden-sawhorse-barrier-0") {
  return {
    id: "furniture-midlow-wooden-sawhorse-barrier",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.8, d: 1.2 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const bar = new T.BoxGeometry(0.12, 0.12, 1.0); bar.translate(0, 0.7, 0);
         const legs = new T.BoxGeometry(0.6, 0.65, 0.9); legs.translate(0, 0.325, 0);
         return mergeGeometries([bar, legs], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 0.76, 1.14);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 0.8, 1.2);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Repurposed 55-gallon steel industrial oil drum trash bin (0.7x0.7m, 0.95m high)
 */
export function furnitureMidlow55galSteelBurnDrum(seed = "furniture-midlow-55gal-steel-burn-drum-0") {
  return {
    id: "furniture-midlow-55gal-steel-burn-drum",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.7, d: 0.7 },
    height: 0.95,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 24,
        createGeometry: (T = THREE) => {
          const drum = new T.CylinderGeometry(0.28, 0.28, 0.85, 8); drum.translate(0, 0.425, 0); return drum;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.66, 0.90, 0.66);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.7, 0.95, 0.7);
          b.translate(0, 0.475, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Molded polyethylene heavy-duty milk crate seat (0.5x0.5m, 0.4m high)
 */
export function furnitureMidlowPlasticMilkCrate(seed = "furniture-midlow-plastic-milk-crate-0") {
  return {
    id: "furniture-midlow-plastic-milk-crate",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.5, d: 0.5 },
    height: 0.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const crate = new T.BoxGeometry(0.35, 0.32, 0.35); crate.translate(0, 0.16, 0); return crate;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.47, 0.38, 0.47);
          b.translate(0, 0.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 0.4, 0.5);
          b.translate(0, 0.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: 6-Foot fold-in-half white blow-molded plastic bench (0.5x1.8m, 0.5m high)
 */
export function furnitureMidlowTemporaryPlasticTrestleBench(seed = "furniture-midlow-temporary-plastic-trestle-bench-0") {
  return {
    id: "furniture-midlow-temporary-plastic-trestle-bench",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.5, d: 1.8 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const bench = new T.BoxGeometry(0.3, 0.42, 1.6); bench.translate(0, 0.21, 0); return bench;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.47, 0.47, 1.71);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 0.5, 1.8);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Curbside plastic rural delivery newspaper tube on stake (0.4x1.0m, 1.2m high)
 */
export function furnitureMidlowPlasticNewspaperTubePost(seed = "furniture-midlow-plastic-newspaper-tube-post-0") {
  return {
    id: "furniture-midlow-plastic-newspaper-tube-post",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.4, d: 1.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.03, 0.03, 1.0, 6); post.translate(0, 0.5, 0);
         const tube = new T.CylinderGeometry(0.08, 0.08, 0.4, 6); tube.rotateX(Math.PI/2); tube.translate(0, 0.95, 0);
         return mergeGeometries([post, tube], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.14, 0.95);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.2, 1.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Stack of 3 rough pine forklift wooden shipping pallets (1.4x1.4m, 0.5m high)
 */
export function furnitureMidlowWoodenShippingPalletStack(seed = "furniture-midlow-wooden-shipping-pallet-stack-0") {
  return {
    id: "furniture-midlow-wooden-shipping-pallet-stack",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 1.4, d: 1.4 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const p1 = new T.BoxGeometry(1.2, 0.12, 1.2); p1.translate(0, 0.06, 0);
         const p2 = new T.BoxGeometry(1.2, 0.12, 1.2); p2.translate(0, 0.22, 0);
         const p3 = new T.BoxGeometry(1.2, 0.12, 1.2); p3.translate(0, 0.38, 0);
         return mergeGeometries([p1, p2, p3], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.33, 0.47, 1.33);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 0.5, 1.4);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Improvised cinder block and wooden 2x6 timber plank bench (0.6x1.6m, 0.5m high)
 */
export function furnitureMidlowConcreteCinderblockBench(seed = "furniture-midlow-concrete-cinderblock-bench-0") {
  return {
    id: "furniture-midlow-concrete-cinderblock-bench",
    tier: "midlow",
    category: "furniture",
    kind: "hard",
    footprint: { w: 0.6, d: 1.6 },
    height: 0.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(0.4, 0.38, 0.25); b1.translate(0, 0.19, -0.6);
         const b2 = new T.BoxGeometry(0.4, 0.38, 0.25); b2.translate(0, 0.19, 0.6);
         const plank = new T.BoxGeometry(0.35, 0.05, 1.5); plank.translate(0, 0.41, 0);
         return mergeGeometries([b1, b2, plank], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.47, 1.52);
          b.translate(0, 0.24, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.5, 1.6);
          b.translate(0, 0.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Monumental classical wrought iron palace ceremonial triumphal gate (19.0x24.0m, 18.8m high)
 */
export function boundaryShowstopperMonumentalPalaceGate(seed = "boundary-showstopper-monumental-palace-gate-0") {
  return {
    id: "boundary-showstopper-monumental-palace-gate",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 19.0, d: 24.0 },
    height: 18.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const pierL = new T.BoxGeometry(2.4, 12, 2.4); pierL.translate(-8, 6, 0);
         const pierR = new T.BoxGeometry(2.4, 12, 2.4); pierR.translate(8, 6, 0);
         const arch = new T.TorusGeometry(8, 0.8, 8, 20, Math.PI); arch.translate(0, 10, 0);
         const gate = new T.BoxGeometry(14, 9.5, 0.4); gate.translate(0, 4.75, 0);
         return mergeGeometries([pierL, pierR, arch, gate], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(18.05, 17.86, 22.80);
          b.translate(0, 8.93, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(19.0, 18.8, 24.0);
          b.translate(0, 9.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Kinetic fluttering aluminum architectural wind mitigation acoustic screen (3.0x24.0m, 8.0m high)
 */
export function boundaryShowstopperKineticWindScreenWall(seed = "boundary-showstopper-kinetic-wind-screen-wall-0") {
  return {
    id: "boundary-showstopper-kinetic-wind-screen-wall",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 3.0, d: 24.0 },
    height: 8.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 490,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(1.8, 1.2, 22); base.translate(0, 0.6, 0);
         const screen = new T.BoxGeometry(0.4, 6.2, 22); screen.translate(0, 4.5, 0);
         const cap = new T.BoxGeometry(1.2, 0.4, 23); cap.translate(0, 7.8, 0);
         return mergeGeometries([base, screen, cap], T);
        },
      },
      {
        level: 1,
        tris: 58,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 7.60, 22.80);
          b.translate(0, 3.80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 8.0, 24.0);
          b.translate(0, 4.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Faceted origami geometric Cor-ten steel landscape retaining wall (4.0x32.0m, 7.5m high)
 */
export function boundaryShowstopperOrigamiCortenRetainingWall(seed = "boundary-showstopper-origami-corten-retaining-wall-0") {
  return {
    id: "boundary-showstopper-origami-corten-retaining-wall",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 4.0, d: 32.0 },
    height: 7.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(2.4, 6.8, 30); wall.rotateZ(0.1); wall.translate(0, 3.4, 0);
         const base = new T.BoxGeometry(3.6, 1.2, 30); base.translate(0, 0.6, 0);
         const _m = mergeGeometries([wall, base], T);; _m.translate(0, 0.103, 0); return _m;
        },
      },
      {
        level: 1,
        tris: 56,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 7.12, 30.40);
          b.translate(0, 3.56, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 7.5, 32.0);
          b.translate(0, 3.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: High-speed motorway curved laminated acoustic noise attenuation wall (22.0x24.0m, 11.0m high)
 */
export function boundaryShowstopperCurvedAcousticGlassBarrier(seed = "boundary-showstopper-curved-acoustic-glass-barrier-0") {
  return {
    id: "boundary-showstopper-curved-acoustic-glass-barrier",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 22.0, d: 24.0 },
    height: 11.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const footing = new T.BoxGeometry(1.4, 1.0, 22); footing.translate(0, 0.5, 0);
         const glass = new T.CylinderGeometry(8, 8, 22, 12, 1, false, 0, Math.PI * 0.35);
         glass.rotateZ(Math.PI/2); glass.translate(0, 3.8, 0);
         return mergeGeometries([footing, glass], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(20.90, 10.45, 22.80);
          b.translate(0, 5.22, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22.0, 11.0, 24.0);
          b.translate(0, 5.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Double-sided living ivy and climbing floral boundary screening wall (2.5x24.0m, 6.0m high)
 */
export function boundaryShowstopperBiophilicLivingGreenScreenWall(seed = "boundary-showstopper-biophilic-living-green-screen-wall-0") {
  return {
    id: "boundary-showstopper-biophilic-living-green-screen-wall",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 2.5, d: 24.0 },
    height: 6.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(1.2, 5.5, 22); frame.translate(0, 2.75, 0);
         const planters = new T.BoxGeometry(2.0, 5.0, 21.5); planters.translate(0, 2.8, 0);
         return mergeGeometries([frame, planters], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.38, 5.70, 22.80);
          b.translate(0, 2.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.5, 6.0, 24.0);
          b.translate(0, 3.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Gilded acanthus-leaf ornamental wrought iron estate perimeter fence (1.5x24.0m, 4.5m high)
 */
export function boundaryShowstopperGildedBotanicalIronFence(seed = "boundary-showstopper-gilded-botanical-iron-fence-0") {
  return {
    id: "boundary-showstopper-gilded-botanical-iron-fence",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.5, d: 24.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 510,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(0.8, 1.2, 22); wall.translate(0, 0.6, 0);
         const rails = new T.BoxGeometry(0.2, 2.8, 22); rails.translate(0, 2.6, 0);
         const finials = new T.ConeGeometry(0.12, 0.4, 6); finials.translate(0, 4.2, 0);
         return mergeGeometries([wall, rails, finials], T);
        },
      },
      {
        level: 1,
        tris: 60,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 4.27, 22.80);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 4.5, 24.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Automated heavy industrial anti-ram crash-rated cantilever sliding gate (2.5x18.0m, 4.2m high)
 */
export function boundaryShowstopperHighSecuritySlidingCantileverGate(seed = "boundary-showstopper-high-security-sliding-cantilever-gate-0") {
  return {
    id: "boundary-showstopper-high-security-sliding-cantilever-gate",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 2.5, d: 18.0 },
    height: 4.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const postL = new T.BoxGeometry(1.2, 3.8, 1.2); postL.translate(0, 1.9, -7.5);
         const postR = new T.BoxGeometry(1.2, 3.8, 1.2); postR.translate(0, 1.9, 7.5);
         const leaf = new T.BoxGeometry(0.3, 3.4, 14); leaf.translate(0, 1.8, 0);
         return mergeGeometries([postL, postR, leaf], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.38, 3.99, 17.10);
          b.translate(0, 1.99, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.5, 4.2, 18.0);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Black slate cascading illuminated weeping water wall boundary (3.0x24.0m, 5.5m high)
 */
export function boundaryShowstopperWaterCurtainWeepingWall(seed = "boundary-showstopper-water-curtain-weeping-wall-0") {
  return {
    id: "boundary-showstopper-water-curtain-weeping-wall",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 3.0, d: 24.0 },
    height: 5.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 470,
        createGeometry: (T = THREE) => {
          const basin = new T.BoxGeometry(2.6, 0.8, 22); basin.translate(0, 0.4, 0);
         const wall = new T.BoxGeometry(0.8, 4.4, 20); wall.translate(0, 2.8, 0);
         const header = new T.BoxGeometry(1.4, 0.4, 21); header.translate(0, 5.2, 0);
         return mergeGeometries([basin, wall, header], T);
        },
      },
      {
        level: 1,
        tris: 54,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 5.22, 22.80);
          b.translate(0, 2.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 5.5, 24.0);
          b.translate(0, 2.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Stepped rock-filled galvanized wire gabion terrace bastion wall (4.0x24.0m, 4.5m high)
 */
export function boundaryShowstopperGabionCurvedBastionWall(seed = "boundary-showstopper-gabion-curved-bastion-wall-0") {
  return {
    id: "boundary-showstopper-gabion-curved-bastion-wall",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 4.0, d: 24.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 450,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(3.2, 1.4, 22); b1.translate(0, 0.7, 0);
         const b2 = new T.BoxGeometry(2.4, 1.4, 22); b2.translate(0, 2.1, 0);
         const b3 = new T.BoxGeometry(1.6, 1.4, 22); b3.translate(0, 3.5, 0);
         return mergeGeometries([b1, b2, b3], T);
        },
      },
      {
        level: 1,
        tris: 50,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.80, 4.27, 22.80);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 4.5, 24.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * SHOWSTOPPER: Showstopper: Parametric twisted vertical timber blade architectural privacy screen (2.0x24.0m, 4.0m high)
 */
export function boundaryShowstopperSculpturalTimberBladeFence(seed = "boundary-showstopper-sculptural-timber-blade-fence-0") {
  return {
    id: "boundary-showstopper-sculptural-timber-blade-fence",
    tier: "showstopper",
    category: "boundary",
    kind: "hard",
    footprint: { w: 2.0, d: 24.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(1.4, 0.4, 22); plinth.translate(0, 0.2, 0);
         const blades = new T.BoxGeometry(0.8, 3.4, 22); blades.translate(0, 2.1, 0);
         return mergeGeometries([plinth, blades], T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 3.80, 22.80);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 4.0, 24.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Ashlar dressed sandstone estate perimeter wall with rusticated piers (1.8x24.0m, 3.6m high)
 */
export function boundaryLuxuryDressedSandstonePierWall(seed = "boundary-luxury-dressed-sandstone-pier-wall-0") {
  return {
    id: "boundary-luxury-dressed-sandstone-pier-wall",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.8, d: 24.0 },
    height: 3.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 310,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(0.8, 2.2, 22); wall.translate(0, 1.1, 0);
         const p1 = new T.BoxGeometry(1.4, 3.2, 1.4); p1.translate(0, 1.6, -7);
         const p2 = new T.BoxGeometry(1.4, 3.2, 1.4); p2.translate(0, 1.6, 7);
         return mergeGeometries([wall, p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 3.42, 22.80);
          b.translate(0, 1.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 3.6, 24.0);
          b.translate(0, 1.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Spearhead ornamental wrought iron security railings atop granite curb (1.0x24.0m, 2.8m high)
 */
export function boundaryLuxuryOrnamentalIronEstateRailings(seed = "boundary-luxury-ornamental-iron-estate-railings-0") {
  return {
    id: "boundary-luxury-ornamental-iron-estate-railings",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.0, d: 24.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const curb = new T.BoxGeometry(0.5, 0.4, 22); curb.translate(0, 0.2, 0);
         const rails = new T.BoxGeometry(0.12, 2.2, 22); rails.translate(0, 1.5, 0);
         return mergeGeometries([curb, rails], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 2.66, 22.80);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 2.8, 24.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Structural laminated frameless glass perimeter safety balustrade (0.6x24.0m, 1.4m high)
 */
export function boundaryLuxurySeamlessFramelessGlassBalustrade(seed = "boundary-luxury-seamless-frameless-glass-balustrade-0") {
  return {
    id: "boundary-luxury-seamless-frameless-glass-balustrade",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 270,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(0.3, 0.2, 22); base.translate(0, 0.1, 0);
         const glass = new T.BoxGeometry(0.08, 1.1, 22); glass.translate(0, 0.75, 0);
         return mergeGeometries([base, glass], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.33, 22.80);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.4, 24.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Architectural Western red cedar horizontal slat modern privacy fence (0.8x24.0m, 2.4m high)
 */
export function boundaryLuxuryHorizontalCedarSlatScreen(seed = "boundary-luxury-horizontal-cedar-slat-screen-0") {
  return {
    id: "boundary-luxury-horizontal-cedar-slat-screen",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 24.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 285,
        createGeometry: (T = THREE) => {
          const screen = new T.BoxGeometry(0.25, 2.2, 22); screen.translate(0, 1.1, 0); return screen;
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 2.28, 22.80);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 2.4, 24.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Sweeping curved ashlar stone driveway entrance wing walls (12.0x16.0m, 2.8m high)
 */
export function boundaryLuxuryCurvedDrivewayEntranceSweep(seed = "boundary-luxury-curved-driveway-entrance-sweep-0") {
  return {
    id: "boundary-luxury-curved-driveway-entrance-sweep",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 12.0, d: 16.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 300,
        createGeometry: (T = THREE) => {
          const wL = new T.BoxGeometry(1.0, 2.4, 7); wL.rotateY(0.4); wL.translate(-4, 1.2, 0);
         const wR = new T.BoxGeometry(1.0, 2.4, 7); wR.rotateY(-0.4); wR.translate(4, 1.2, 0);
         return mergeGeometries([wL, wR], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(11.40, 2.66, 15.20);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 2.8, 16.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Stainless steel full-height secure access turnstile and canopy entry (3.0x6.0m, 3.4m high)
 */
export function boundaryLuxurySecurityTurnstileCanopyGate(seed = "boundary-luxury-security-turnstile-canopy-gate-0") {
  return {
    id: "boundary-luxury-security-turnstile-canopy-gate",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 3.0, d: 6.0 },
    height: 3.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 320,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(2.6, 3.0, 5.5); frame.translate(0, 1.5, 0);
         const rotor = new T.CylinderGeometry(0.8, 0.8, 2.2, 8); rotor.translate(0, 1.3, 0);
         return mergeGeometries([frame, rotor], T);
        },
      },
      {
        level: 1,
        tris: 42,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.85, 3.23, 5.70);
          b.translate(0, 1.61, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 3.4, 6.0);
          b.translate(0, 1.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Laser-cut organic branch pattern decorative Cor-ten privacy screen (0.8x24.0m, 2.6m high)
 */
export function boundaryLuxuryLaserCutCortenPanelFence(seed = "boundary-luxury-laser-cut-corten-panel-fence-0") {
  return {
    id: "boundary-luxury-laser-cut-corten-panel-fence",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 24.0 },
    height: 2.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 280,
        createGeometry: (T = THREE) => {
          const screen = new T.BoxGeometry(0.18, 2.4, 22); screen.translate(0, 1.2, 0); return screen;
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 2.47, 22.80);
          b.translate(0, 1.23, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 2.6, 24.0);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Handcrafted dry-stacked rustic blue slate garden terrace wall (1.6x24.0m, 2.2m high)
 */
export function boundaryLuxuryDryStackSlateRetainingWall(seed = "boundary-luxury-dry-stack-slate-retaining-wall-0") {
  return {
    id: "boundary-luxury-dry-stack-slate-retaining-wall",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.6, d: 24.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 290,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(1.2, 1.9, 22); wall.translate(0, 0.95, 0);
         const cap = new T.BoxGeometry(1.4, 0.2, 22.5); cap.translate(0, 1.95, 0);
         return mergeGeometries([wall, cap], T);
        },
      },
      {
        level: 1,
        tris: 38,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.52, 2.09, 22.80);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 2.2, 24.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Dual-swing motorized bronze entrance gates with decorative scrolls (1.5x8.0m, 3.2m high)
 */
export function boundaryLuxuryBronzeAutomatedDrivewayGates(seed = "boundary-luxury-bronze-automated-driveway-gates-0") {
  return {
    id: "boundary-luxury-bronze-automated-driveway-gates",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.5, d: 8.0 },
    height: 3.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 305,
        createGeometry: (T = THREE) => {
          const postL = new T.BoxGeometry(0.8, 2.8, 0.8); postL.translate(0, 1.4, -3.5);
         const postR = new T.BoxGeometry(0.8, 2.8, 0.8); postR.translate(0, 1.4, 3.5);
         const leafL = new T.BoxGeometry(0.15, 2.4, 3.0); leafL.translate(0, 1.4, -1.6);
         const leafR = new T.BoxGeometry(0.15, 2.4, 3.0); leafR.translate(0, 1.4, 1.6);
         return mergeGeometries([postL, postR, leafL, leafR], T);
        },
      },
      {
        level: 1,
        tris: 40,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.42, 3.04, 7.60);
          b.translate(0, 1.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.5, 3.2, 8.0);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * LUXURY: Luxury: Mediterranean white stucco boundary wall with terracotta barrel tile coping (1.2x24.0m, 2.6m high)
 */
export function boundaryLuxuryStuccoVillaWallTerracottaTile(seed = "boundary-luxury-stucco-villa-wall-terracotta-tile-0") {
  return {
    id: "boundary-luxury-stucco-villa-wall-terracotta-tile",
    tier: "luxury",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.2, d: 24.0 },
    height: 2.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 275,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(0.6, 2.1, 22); wall.translate(0, 1.05, 0);
         const tile = new T.BoxGeometry(0.9, 0.25, 22.5); tile.translate(0, 2.2, 0);
         return mergeGeometries([wall, tile], T);
        },
      },
      {
        level: 1,
        tris: 34,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 2.47, 22.80);
          b.translate(0, 1.23, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 2.6, 24.0);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Triple-pointed D-section galvanized steel palisade anti-climb fence (0.8x24.0m, 3.0m high)
 */
export function boundaryHighendSteelPalisadeSecurityFence(seed = "boundary-highend-steel-palisade-security-fence-0") {
  return {
    id: "boundary-highend-steel-palisade-security-fence",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 24.0 },
    height: 3.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.3, 2.7, 22); fence.translate(0, 1.35, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 2.85, 22.80);
          b.translate(0, 1.42, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 3.0, 24.0);
          b.translate(0, 1.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Industrial acoustic perforated aluminum sound wall barrier (1.2x24.0m, 4.0m high)
 */
export function boundaryHighendPerforatedMetalAcousticBarrier(seed = "boundary-highend-perforated-metal-acoustic-barrier-0") {
  return {
    id: "boundary-highend-perforated-metal-acoustic-barrier",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.2, d: 24.0 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 190,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(0.6, 3.7, 22); wall.translate(0, 1.85, 0); return wall;
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 3.80, 22.80);
          b.translate(0, 1.90, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 4.0, 24.0);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Double-wythe red clay brick wall with half-round soldier coping (1.0x24.0m, 2.2m high)
 */
export function boundaryHighendBrickCopingGardenWall(seed = "boundary-highend-brick-coping-garden-wall-0") {
  return {
    id: "boundary-highend-brick-coping-garden-wall",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.0, d: 24.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(0.5, 1.9, 22); wall.translate(0, 0.95, 0);
         const cap = new T.BoxGeometry(0.7, 0.15, 22.5); cap.translate(0, 1.95, 0);
         return mergeGeometries([wall, cap], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 2.09, 22.80);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 2.2, 24.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Heavy diamond expanded steel mesh industrial security fencing (0.6x24.0m, 2.8m high)
 */
export function boundaryHighendExpandedMetalMeshFence(seed = "boundary-highend-expanded-metal-mesh-fence-0") {
  return {
    id: "boundary-highend-expanded-metal-mesh-fence",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 165,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.2, 2.6, 22); fence.translate(0, 1.3, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 2.66, 22.80);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.8, 24.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: High-speed parking revenue and access control rising boom barrier (2.0x6.0m, 1.4m high)
 */
export function boundaryHighendAutomatedBoomBarrierGate(seed = "boundary-highend-automated-boom-barrier-gate-0") {
  return {
    id: "boundary-highend-automated-boom-barrier-gate",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 2.0, d: 6.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 180,
        createGeometry: (T = THREE) => {
          const pedestal = new T.BoxGeometry(0.6, 1.1, 0.6); pedestal.translate(0, 0.55, -2.4);
         const arm = new T.BoxGeometry(0.1, 0.15, 5.2); arm.translate(0, 1.0, 0.2);
         return mergeGeometries([pedestal, arm], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.90, 1.33, 5.70);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.4, 6.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Architectural welded wire mesh granite rock-filled gabion wall (1.8x24.0m, 2.4m high)
 */
export function boundaryHighendModularGabionBasketWall(seed = "boundary-highend-modular-gabion-basket-wall-0") {
  return {
    id: "boundary-highend-modular-gabion-basket-wall",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.8, d: 24.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 175,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(1.2, 2.1, 22); wall.translate(0, 1.05, 0); return wall;
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.71, 2.28, 22.80);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 2.4, 24.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Flat-top black powder-coated aluminum pool enclosure safety fence (0.6x24.0m, 1.6m high)
 */
export function boundaryHighendTubularSteelPoolSafetyFence(seed = "boundary-highend-tubular-steel-pool-safety-fence-0") {
  return {
    id: "boundary-highend-tubular-steel-pool-safety-fence",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.15, 1.4, 22); fence.translate(0, 0.7, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.52, 22.80);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.6, 24.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Precast prestressed concrete reflective highway noise barrier wall (1.2x24.0m, 4.5m high)
 */
export function boundaryHighendPrecastConcreteSoundPanelWall(seed = "boundary-highend-precast-concrete-sound-panel-wall-0") {
  return {
    id: "boundary-highend-precast-concrete-sound-panel-wall",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.2, d: 24.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 195,
        createGeometry: (T = THREE) => {
          const posts = new T.BoxGeometry(0.8, 4.2, 22); posts.translate(0, 2.1, 0); return posts;
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.14, 4.27, 22.80);
          b.translate(0, 2.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 4.5, 24.0);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Automatic hydraulic rising security anti-ram traffic bollards array (1.0x6.0m, 1.2m high)
 */
export function boundaryHighendRetractableSecurityBollardsUnit(seed = "boundary-highend-retractable-security-bollards-unit-0") {
  return {
    id: "boundary-highend-retractable-security-bollards-unit",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.0, d: 6.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 185,
        createGeometry: (T = THREE) => {
          const b1 = new T.CylinderGeometry(0.14, 0.14, 0.9, 8); b1.translate(0, 0.45, -2.0);
         const b2 = new T.CylinderGeometry(0.14, 0.14, 0.9, 8); b2.translate(0, 0.45, 0);
         const b3 = new T.CylinderGeometry(0.14, 0.14, 0.9, 8); b3.translate(0, 0.45, 2.0);
         return mergeGeometries([b1, b2, b3], T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 1.14, 5.70);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 1.2, 6.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * HIGHEND: High-End: Classical urn-profile cast stone promenade balustrade (1.0x24.0m, 1.4m high)
 */
export function boundaryHighendDecorativeCastStoneBalustrade(seed = "boundary-highend-decorative-cast-stone-balustrade-0") {
  return {
    id: "boundary-highend-decorative-cast-stone-balustrade",
    tier: "highend",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.0, d: 24.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 170,
        createGeometry: (T = THREE) => {
          const base = new T.BoxGeometry(0.6, 0.3, 22); base.translate(0, 0.15, 0);
         const rail = new T.BoxGeometry(0.6, 0.2, 22); rail.translate(0, 1.1, 0);
         const bal = new T.BoxGeometry(0.3, 0.7, 21.5); bal.translate(0, 0.65, 0);
         return mergeGeometries([base, rail, bal], T);
        },
      },
      {
        level: 1,
        tris: 26,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 1.33, 22.80);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 1.4, 24.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Commercial chain link fence with 3-strand barbed wire top extension (0.6x24.0m, 2.8m high)
 */
export function boundaryMidhighChainLinkFenceBarbedWire(seed = "boundary-midhigh-chain-link-fence-barbed-wire-0") {
  return {
    id: "boundary-midhigh-chain-link-fence-barbed-wire",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 2.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 115,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.15, 2.4, 22); fence.translate(0, 1.2, 0);
         const barb = new T.BoxGeometry(0.3, 0.3, 22); barb.translate(0, 2.5, 0);
         return mergeGeometries([fence, barb], T);
        },
      },
      {
        level: 1,
        tris: 22,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 2.66, 22.80);
          b.translate(0, 1.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.8, 24.0);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Rustic 3-rail Western red cedar split-rail perimeter fence (0.8x24.0m, 1.5m high)
 */
export function boundaryMidhighSplitRailWoodenFarmFence(seed = "boundary-midhigh-split-rail-wooden-farm-fence-0") {
  return {
    id: "boundary-midhigh-split-rail-wooden-farm-fence",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 24.0 },
    height: 1.5,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const rails = new T.BoxGeometry(0.2, 1.2, 22); rails.translate(0, 0.6, 0); return rails;
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.42, 22.80);
          b.translate(0, 0.71, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.5, 24.0);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: 6-Foot dog-ear pressure-treated wood privacy stockade fence (0.6x24.0m, 2.2m high)
 */
export function boundaryMidhighVerticalWoodPrivacyStockade(seed = "boundary-midhigh-vertical-wood-privacy-stockade-0") {
  return {
    id: "boundary-midhigh-vertical-wood-privacy-stockade",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 110,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.2, 1.95, 22); fence.translate(0, 0.975, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 2.09, 22.80);
          b.translate(0, 1.04, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.2, 24.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Galvanized steel pedestrian sidewalk safety guard railing (0.6x24.0m, 1.3m high)
 */
export function boundaryMidhighCurvedMetalPedestrianRailing(seed = "boundary-midhigh-curved-metal-pedestrian-railing-0") {
  return {
    id: "boundary-midhigh-curved-metal-pedestrian-railing",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 1.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const rail = new T.BoxGeometry(0.15, 1.1, 22); rail.translate(0, 0.55, 0); return rail;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.23, 22.80);
          b.translate(0, 0.62, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.3, 24.0);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Commercial chain link double-drive vehicular access swing gate (1.0x8.0m, 2.4m high)
 */
export function boundaryMidhighDoubleSwingUtilityGate(seed = "boundary-midhigh-double-swing-utility-gate-0") {
  return {
    id: "boundary-midhigh-double-swing-utility-gate",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 1.0, d: 8.0 },
    height: 2.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const p1 = new T.BoxGeometry(0.4, 2.2, 0.4); p1.translate(0, 1.1, -3.8);
         const p2 = new T.BoxGeometry(0.4, 2.2, 0.4); p2.translate(0, 1.1, 3.8);
         const gates = new T.BoxGeometry(0.1, 1.9, 7.2); gates.translate(0, 1.0, 0);
         return mergeGeometries([p1, p2, gates], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.95, 2.28, 7.60);
          b.translate(0, 1.14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 2.4, 8.0);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Cast iron boundary posts strung with heavy forged steel chain (0.6x24.0m, 1.1m high)
 */
export function boundaryMidhighPostAndChainBarrier(seed = "boundary-midhigh-post-and-chain-barrier-0") {
  return {
    id: "boundary-midhigh-post-and-chain-barrier",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 100,
        createGeometry: (T = THREE) => {
          const posts = new T.BoxGeometry(0.2, 0.9, 22); posts.translate(0, 0.45, 0); return posts;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.04, 22.80);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.1, 24.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Temporary construction site corrugated steel security hoarding (0.8x24.0m, 2.6m high)
 */
export function boundaryMidhighCorrugatedMetalSiteHoarding(seed = "boundary-midhigh-corrugated-metal-site-hoarding-0") {
  return {
    id: "boundary-midhigh-corrugated-metal-site-hoarding",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 24.0 },
    height: 2.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 105,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.3, 2.4, 22); fence.translate(0, 1.2, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 2.47, 22.80);
          b.translate(0, 1.23, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 2.6, 24.0);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: White PVC vinyl 3-rail post and rail boundary fence (0.6x24.0m, 1.6m high)
 */
export function boundaryMidhighRanchStyleVinylRailFence(seed = "boundary-midhigh-ranch-style-vinyl-rail-fence-0") {
  return {
    id: "boundary-midhigh-ranch-style-vinyl-rail-fence",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 90,
        createGeometry: (T = THREE) => {
          const rails = new T.BoxGeometry(0.18, 1.4, 22); rails.translate(0, 0.7, 0); return rails;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.52, 22.80);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.6, 24.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Continuous precast concrete parking lot wheel curb barrier (0.6x24.0m, 0.4m high)
 */
export function boundaryMidhighConcreteWheelCurbBarrier(seed = "boundary-midhigh-concrete-wheel-curb-barrier-0") {
  return {
    id: "boundary-midhigh-concrete-wheel-curb-barrier",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 0.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway", "open"],
    lod: [
      {
        level: 0,
        tris: 85,
        createGeometry: (T = THREE) => {
          const curb = new T.BoxGeometry(0.35, 0.25, 22); curb.translate(0, 0.125, 0); return curb;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 0.38, 22.80);
          b.translate(0, 0.19, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.4, 24.0);
          b.translate(0, 0.2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDHIGH: Mid-High: Highway median green plastic anti-glare anti-dazzle paddle vanes (0.6x24.0m, 2.0m high)
 */
export function boundaryMidhighMeshAntiDazzleScreen(seed = "boundary-midhigh-mesh-anti-dazzle-screen-0") {
  return {
    id: "boundary-midhigh-mesh-anti-dazzle-screen",
    tier: "midhigh",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "roadway"],
    lod: [
      {
        level: 0,
        tris: 95,
        createGeometry: (T = THREE) => {
          const screen = new T.BoxGeometry(0.2, 1.7, 22); screen.translate(0, 0.85, 0); return screen;
        },
      },
      {
        level: 1,
        tris: 18,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.90, 22.80);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.0, 24.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Standard residential 6-foot galvanized chain link wire fence (0.4x24.0m, 2.0m high)
 */
export function boundaryMidStandardChainLinkFence(seed = "boundary-mid-standard-chain-link-fence-0") {
  return {
    id: "boundary-mid-standard-chain-link-fence",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.4, d: 24.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 50,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.1, 1.8, 22); fence.translate(0, 0.9, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.90, 22.80);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 2.0, 24.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Traditional white pointed wooden residential garden picket fence (0.4x24.0m, 1.2m high)
 */
export function boundaryMidWoodenPicketFence(seed = "boundary-mid-wooden-picket-fence-0") {
  return {
    id: "boundary-mid-wooden-picket-fence",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.4, d: 24.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 52,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.12, 1.0, 22); fence.translate(0, 0.5, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.14, 22.80);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.2, 24.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: T-Post metal agricultural 4-strand barbed wire livestock fence (0.4x24.0m, 1.4m high)
 */
export function boundaryMidAgriculturalBarbedWireFence(seed = "boundary-mid-agricultural-barbed-wire-fence-0") {
  return {
    id: "boundary-mid-agricultural-barbed-wire-fence",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.4, d: 24.0 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.1, 1.2, 22); fence.translate(0, 0.6, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.33, 22.80);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.4, 24.0);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: 5-Bar galvanized tubular steel farm field livestock gate (0.8x4.5m, 1.4m high)
 */
export function boundaryMidFieldGateTubularSteel(seed = "boundary-mid-field-gate-tubular-steel-0") {
  return {
    id: "boundary-mid-field-gate-tubular-steel",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 4.5 },
    height: 1.4,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const gate = new T.BoxGeometry(0.1, 1.1, 4.0); gate.translate(0, 0.6, 0); return gate;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.33, 4.27);
          b.translate(0, 0.66, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.4, 4.5);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Slotted concrete post and gravel board gravel fence panels (0.6x24.0m, 2.0m high)
 */
export function boundaryMidConcretePostPanelFence(seed = "boundary-mid-concrete-post-panel-fence-0") {
  return {
    id: "boundary-mid-concrete-post-panel-fence",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 2.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 46,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.2, 1.8, 22); fence.translate(0, 0.9, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.90, 22.80);
          b.translate(0, 0.95, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 2.0, 24.0);
          b.translate(0, 1.0, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Welded steel pipe continuous horse corral fence (0.6x24.0m, 1.6m high)
 */
export function boundaryMidPipeRailCorralFence(seed = "boundary-mid-pipe-rail-corral-fence-0") {
  return {
    id: "boundary-mid-pipe-rail-corral-fence",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.6, d: 24.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const fence = new T.BoxGeometry(0.15, 1.35, 22); fence.translate(0, 0.675, 0); return fence;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.57, 1.52, 22.80);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.6, 24.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Orange polyethylene safety mesh winter snowdrift fence (0.3x24.0m, 1.3m high)
 */
export function boundaryMidOrangeConstructionSnowFence(seed = "boundary-mid-orange-construction-snow-fence-0") {
  return {
    id: "boundary-mid-orange-construction-snow-fence",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 24.0 },
    height: 1.3,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 40,
        createGeometry: (T = THREE) => {
          const mesh = new T.BoxGeometry(0.08, 1.1, 22); mesh.translate(0, 0.55, 0); return mesh;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 1.23, 22.80);
          b.translate(0, 0.62, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.3, 24.0);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Interlocking galvanized steel tubular event crowd control barrier (0.8x2.5m, 1.2m high)
 */
export function boundaryMidMetalCrowdControlPedestrianBarrier(seed = "boundary-mid-metal-crowd-control-pedestrian-barrier-0") {
  return {
    id: "boundary-mid-metal-crowd-control-pedestrian-barrier",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.8, d: 2.5 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "roadway"],
    lod: [
      {
        level: 0,
        tris: 54,
        createGeometry: (T = THREE) => {
          const bar = new T.BoxGeometry(0.45, 1.0, 2.2); bar.translate(0, 0.5, 0); return bar;
        },
      },
      {
        level: 1,
        tris: 14,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.76, 1.14, 2.38);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 1.2, 2.5);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Natural woven bamboo and reed garden privacy screen roll (0.3x12.0m, 1.8m high)
 */
export function boundaryMidReedScreenGardenTrellis(seed = "boundary-mid-reed-screen-garden-trellis-0") {
  return {
    id: "boundary-mid-reed-screen-garden-trellis",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 12.0 },
    height: 1.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open", "park"],
    lod: [
      {
        level: 0,
        tris: 42,
        createGeometry: (T = THREE) => {
          const screen = new T.BoxGeometry(0.1, 1.6, 11); screen.translate(0, 0.8, 0); return screen;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 1.71, 11.40);
          b.translate(0, 0.85, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.8, 12.0);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MID: Mid: Chrome stanchions strung with braided velvet queue boundary rope (0.4x12.0m, 1.0m high)
 */
export function boundaryMidRopeBoundaryStanchionLine(seed = "boundary-mid-rope-boundary-stanchion-line-0") {
  return {
    id: "boundary-mid-rope-boundary-stanchion-line",
    tier: "mid",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.4, d: 12.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 45,
        createGeometry: (T = THREE) => {
          const line = new T.BoxGeometry(0.15, 0.85, 11); line.translate(0, 0.425, 0); return line;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 0.95, 11.40);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.0, 12.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: High-visibility orange plastic safety netting on steel road pins (0.2x8.0m, 1.0m high)
 */
export function boundaryMidlowPlasticOrangeMeshBarrier(seed = "boundary-midlow-plastic-orange-mesh-barrier-0") {
  return {
    id: "boundary-midlow-plastic-orange-mesh-barrier",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.2, d: 8.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const mesh = new T.BoxGeometry(0.1, 0.85, 7.6); mesh.translate(0, 0.425, 0); return mesh;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.19, 0.95, 7.60);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.2, 1.0, 8.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Construction scaffolding clamp-and-tube safety railing (0.3x6.0m, 1.1m high)
 */
export function boundaryMidlowScaffoldPipeRailing(seed = "boundary-midlow-scaffold-pipe-railing-0") {
  return {
    id: "boundary-midlow-scaffold-pipe-railing",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 6.0 },
    height: 1.1,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const rail = new T.BoxGeometry(0.18, 0.95, 5.6); rail.translate(0, 0.475, 0); return rail;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 1.04, 5.70);
          b.translate(0, 0.52, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.1, 6.0);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Unrendered modular stacked concrete cinder block boundary wall (0.4x8.0m, 1.2m high)
 */
export function boundaryMidlowStackedCinderBlockWall(seed = "boundary-midlow-stacked-cinder-block-wall-0") {
  return {
    id: "boundary-midlow-stacked-cinder-block-wall",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.4, d: 8.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(0.32, 1.05, 7.6); wall.translate(0, 0.525, 0); return wall;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.38, 1.14, 7.60);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 1.2, 8.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Rebar pins strung with yellow-black hazard warning tape (0.3x6.0m, 1.0m high)
 */
export function boundaryMidlowHazardTapeStanchions(seed = "boundary-midlow-hazard-tape-stanchions-0") {
  return {
    id: "boundary-midlow-hazard-tape-stanchions",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 6.0 },
    height: 1.0,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const posts = new T.BoxGeometry(0.15, 0.85, 5.6); posts.translate(0, 0.425, 0); return posts;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 0.95, 5.70);
          b.translate(0, 0.47, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.0, 6.0);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Wooden stakes with polypropylene twisted guide rope (0.3x6.0m, 0.8m high)
 */
export function boundaryMidlowPostAndRopeBarrier(seed = "boundary-midlow-post-and-rope-barrier-0") {
  return {
    id: "boundary-midlow-post-and-rope-barrier",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 6.0 },
    height: 0.8,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 18,
        createGeometry: (T = THREE) => {
          const barrier = new T.BoxGeometry(0.15, 0.68, 5.6); barrier.translate(0, 0.34, 0); return barrier;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 0.76, 5.70);
          b.translate(0, 0.38, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 0.8, 6.0);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Fluorescent tipped wooden snowplow survey boundary stake (0.2x0.2m, 1.6m high)
 */
export function boundaryMidlowWoodenSnowMarkerLath(seed = "boundary-midlow-wooden-snow-marker-lath-0") {
  return {
    id: "boundary-midlow-wooden-snow-marker-lath",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.2, d: 0.2 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 16,
        createGeometry: (T = THREE) => {
          const stake = new T.BoxGeometry(0.04, 1.4, 0.04); stake.translate(0, 0.7, 0); return stake;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.19, 1.52, 0.19);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.2, 1.6, 0.2);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Pink vinyl underground utility locating survey flag on steel wire (0.2x0.2m, 0.7m high)
 */
export function boundaryMidlowPlasticSurveyFlagWire(seed = "boundary-midlow-plastic-survey-flag-wire-0") {
  return {
    id: "boundary-midlow-plastic-survey-flag-wire",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.2, d: 0.2 },
    height: 0.7,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 16,
        createGeometry: (T = THREE) => {
          const wire = new T.CylinderGeometry(0.005, 0.005, 0.55, 4); wire.translate(0, 0.275, 0);
         const flag = new T.BoxGeometry(0.08, 0.06, 0.01); flag.translate(0, 0.55, 0.04);
         return mergeGeometries([wire, flag], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.19, 0.66, 0.19);
          b.translate(0, 0.33, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.2, 0.7, 0.2);
          b.translate(0, 0.35, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Salvaged rusty corrugated tin and pallet wood patch fence (0.3x6.0m, 1.6m high)
 */
export function boundaryMidlowCorrugatedTinPatchFence(seed = "boundary-midlow-corrugated-tin-patch-fence-0") {
  return {
    id: "boundary-midlow-corrugated-tin-patch-fence",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 6.0 },
    height: 1.6,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 20,
        createGeometry: (T = THREE) => {
          const sheet = new T.BoxGeometry(0.1, 1.45, 5.6); sheet.translate(0, 0.725, 0); return sheet;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 1.52, 5.70);
          b.translate(0, 0.76, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.6, 6.0);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Steel construction rebar picket with mushroom safety cap (0.3x0.3m, 1.2m high)
 */
export function boundaryMidlowCautionTapeRebarPicket(seed = "boundary-midlow-caution-tape-rebar-picket-0") {
  return {
    id: "boundary-midlow-caution-tape-rebar-picket",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 0.3 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 16,
        createGeometry: (T = THREE) => {
          const rebar = new T.CylinderGeometry(0.02, 0.02, 1.0, 4); rebar.translate(0, 0.5, 0); return rebar;
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 1.14, 0.28);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.2, 0.3);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * MIDLOW: Mid-Low: Linked upright wooden shipping pallet temporary yard barrier (0.3x4.0m, 1.2m high)
 */
export function boundaryMidlowWoodenPalletPerimeterHurdle(seed = "boundary-midlow-wooden-pallet-perimeter-hurdle-0") {
  return {
    id: "boundary-midlow-wooden-pallet-perimeter-hurdle",
    tier: "midlow",
    category: "boundary",
    kind: "hard",
    footprint: { w: 0.3, d: 4.0 },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    stands_on: ["ground", "open"],
    lod: [
      {
        level: 0,
        tris: 22,
        createGeometry: (T = THREE) => {
          const p1 = new T.BoxGeometry(0.15, 1.0, 1.8); p1.translate(0, 0.5, -0.95);
         const p2 = new T.BoxGeometry(0.15, 1.0, 1.8); p2.translate(0, 0.5, 0.95);
         return mergeGeometries([p1, p2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.28, 1.14, 3.80);
          b.translate(0, 0.57, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 1.2, 4.0);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  };
}

export const TIER_MODELS = {
  "bld-showstopper-shard-biotower": bldShowstopperShardBiotower(),
  "bld-showstopper-curvilinear-hab-pod": bldShowstopperCurvilinearHabPod(),
  "bld-showstopper-floating-timber-ring": bldShowstopperFloatingTimberRing(),
  "bld-showstopper-diagrid-lotus-spire": bldShowstopperDiagridLotusSpire(),
  "bld-showstopper-twisted-aerofoil-tower": bldShowstopperTwistedAerofoilTower(),
  "bld-showstopper-terraced-waterfall-atrium": bldShowstopperTerracedWaterfallAtrium(),
  "bld-showstopper-cantilever-skybridge-twin": bldShowstopperCantileverSkybridgeTwin(),
  "bld-showstopper-geodesic-ecotower": bldShowstopperGeodesicEcotower(),
  "bld-showstopper-origami-folded-hq": bldShowstopperOrigamiFoldedHq(),
  "bld-showstopper-hyperboloid-lattice-hub": bldShowstopperHyperboloidLatticeHub(),
  "bld-luxury-penthouse-tower": bldLuxuryPenthouseTower(),
  "bld-luxury-curved-ribbon-mansion": bldLuxuryCurvedRibbonMansion(),
  "bld-luxury-terraced-vineyard-villa": bldLuxuryTerracedVineyardVilla(),
  "bld-luxury-sky-terrace-residence": bldLuxurySkyTerraceResidence(),
  "bld-luxury-marina-waterfront-condo": bldLuxuryMarinaWaterfrontCondo(),
  "bld-luxury-boutique-hotel-atrium": bldLuxuryBoutiqueHotelAtrium(),
  "bld-luxury-cantilever-ridge-house": bldLuxuryCantileverRidgeHouse(),
  "bld-luxury-biophilic-loft-block": bldLuxuryBiophilicLoftBlock(),
  "bld-luxury-courtyard-palazzo": bldLuxuryCourtyardPalazzo(),
  "bld-luxury-cliffside-glass-pavilion": bldLuxuryCliffsideGlassPavilion(),
  "bld-highend-curtain-wall-office": bldHighendCurtainWallOffice(),
  "bld-highend-stepped-residential-block": bldHighendSteppedResidentialBlock(),
  "bld-highend-timber-midrise": bldHighendTimberMidrise(),
  "bld-highend-corner-flat-iron": bldHighendCornerFlatIron(),
  "bld-highend-modular-live-work": bldHighendModularLiveWork(),
  "bld-highend-tech-campus-lab": bldHighendTechCampusLab(),
  "bld-highend-green-roof-townhomes": bldHighendGreenRoofTownhomes(),
  "bld-highend-podium-tower-residential": bldHighendPodiumTowerResidential(),
  "bld-highend-art-gallery-lofts": bldHighendArtGalleryLofts(),
  "bld-highend-linear-balcony-apartments": bldHighendLinearBalconyApartments(),
  "bld-midhigh-brick-loft-apartments": bldMidhighBrickLoftApartments(),
  "bld-midhigh-modernist-slab-block": bldMidhighModernistSlabBlock(),
  "bld-midhigh-perimeter-block-wing": bldMidhighPerimeterBlockWing(),
  "bld-midhigh-street-corner-mixed": bldMidhighStreetCornerMixed(),
  "bld-midhigh-terrace-triplex": bldMidhighTerraceTriplex(),
  "bld-midhigh-suburban-office-park": bldMidhighSuburbanOfficePark(),
  "bld-midhigh-garden-apartments": bldMidhighGardenApartments(),
  "bld-midhigh-co-living-tower": bldMidhighCoLivingTower(),
  "bld-midhigh-retail-flats-row": bldMidhighRetailFlatsRow(),
  "bld-midhigh-light-industrial-flex": bldMidhighLightIndustrialFlex(),
  "bld-mid-standard-apartment-block": bldMidStandardApartmentBlock(),
  "bld-mid-strip-mall-commercial": bldMidStripMallCommercial(),
  "bld-mid-suburban-duplex": bldMidSuburbanDuplex(),
  "bld-mid-walkup-tenement": bldMidWalkupTenement(),
  "bld-mid-community-medical-clinic": bldMidCommunityMedicalClinic(),
  "bld-mid-rowhouse-quad": bldMidRowhouseQuad(),
  "bld-mid-distribution-warehouse": bldMidDistributionWarehouse(),
  "bld-mid-bank-branch-office": bldMidBankBranchOffice(),
  "bld-mid-self-storage-facility": bldMidSelfStorageFacility(),
  "bld-mid-auto-dealership-showroom": bldMidAutoDealershipShowroom(),
  "bld-midlow-utility-substation-shed": bldMidlowUtilitySubstationShed(),
  "bld-midlow-corrugated-storage-barn": bldMidlowCorrugatedStorageBarn(),
  "bld-midlow-budget-motel-unit": bldMidlowBudgetMotelUnit(),
  "bld-midlow-modular-trailer-office": bldMidlowModularTrailerOffice(),
  "bld-midlow-freestanding-fast-food-box": bldMidlowFreestandingFastFoodBox(),
  "bld-midlow-strip-warehouse-unit": bldMidlowStripWarehouseUnit(),
  "bld-midlow-guardhouse-checkpoint": bldMidlowGuardhouseCheckpoint(),
  "bld-midlow-carport-shelter-row": bldMidlowCarportShelterRow(),
  "bld-midlow-shipping-container-office": bldMidlowShippingContainerOffice(),
  "bld-midlow-pump-house-kiosk": bldMidlowPumpHouseKiosk(),
  "civic-showstopper-hydro-transit-terminal": civicShowstopperHydroTransitTerminal(),
  "civic-showstopper-opera-symphony-hall": civicShowstopperOperaSymphonyHall(),
  "civic-showstopper-national-museum-canyon": civicShowstopperNationalMuseumCanyon(),
  "civic-showstopper-biome-botanical-domes": civicShowstopperBiomeBotanicalDomes(),
  "civic-showstopper-parliament-dome-rotunda": civicShowstopperParliamentDomeRotunda(),
  "civic-showstopper-wave-public-library": civicShowstopperWavePublicLibrary(),
  "civic-showstopper-aquatic-olympic-arena": civicShowstopperAquaticOlympicArena(),
  "civic-showstopper-highspeed-rail-concourse": civicShowstopperHighspeedRailConcourse(),
  "civic-showstopper-planetarium-observatory": civicShowstopperPlanetariumObservatory(),
  "civic-showstopper-contemporary-art-pavilion": civicShowstopperContemporaryArtPavilion(),
  "civic-luxury-conservatory-glasshouse": civicLuxuryConservatoryGlasshouse(),
  "civic-luxury-municipal-opera-theatre": civicLuxuryMunicipalOperaTheatre(),
  "civic-luxury-botanical-garden-pavilion": civicLuxuryBotanicalGardenPavilion(),
  "civic-luxury-heritage-clocktower-hall": civicLuxuryHeritageClocktowerHall(),
  "civic-luxury-embassy-chancery-compound": civicLuxuryEmbassyChanceryCompound(),
  "civic-luxury-sailing-clubhouse": civicLuxurySailingClubhouse(),
  "civic-luxury-law-courts-palace": civicLuxuryLawCourtsPalace(),
  "civic-luxury-fine-arts-academy": civicLuxuryFineArtsAcademy(),
  "civic-luxury-vip-helipad-terminal": civicLuxuryVipHelipadTerminal(),
  "civic-luxury-community-auditorium": civicLuxuryCommunityAuditorium(),
  "civic-highend-central-fire-headquarters": civicHighendCentralFireHeadquarters(),
  "civic-highend-district-police-precinct": civicHighendDistrictPolicePrecinct(),
  "civic-highend-general-hospital-wing": civicHighendGeneralHospitalWing(),
  "civic-highend-public-library-branch": civicHighendPublicLibraryBranch(),
  "civic-highend-secondary-school-campus": civicHighendSecondarySchoolCampus(),
  "civic-highend-community-swimming-center": civicHighendCommunitySwimmingCenter(),
  "civic-highend-subway-station-entry": civicHighendSubwayStationEntry(),
  "civic-highend-crematorium-memorial-chapel": civicHighendCrematoriumMemorialChapel(),
  "civic-highend-post-office-logistics-hub": civicHighendPostOfficeLogisticsHub(),
  "civic-highend-meteorological-radar-dome": civicHighendMeteorologicalRadarDome(),
  "civic-midhigh-neighborhood-police-station": civicMidhighNeighborhoodPoliceStation(),
  "civic-midhigh-volunteer-firehouse": civicMidhighVolunteerFirehouse(),
  "civic-midhigh-primary-health-center": civicMidhighPrimaryHealthCenter(),
  "civic-midhigh-elementary-school-wing": civicMidhighElementarySchoolWing(),
  "civic-midhigh-senior-community-center": civicMidhighSeniorCommunityCenter(),
  "civic-midhigh-youth-club-gymnasium": civicMidhighYouthClubGymnasium(),
  "civic-midhigh-town-clerk-archive": civicMidhighTownClerkArchive(),
  "civic-midhigh-ambulance-station-depot": civicMidhighAmbulanceStationDepot(),
  "civic-midhigh-cemetery-caretaker-lodge": civicMidhighCemeteryCaretakerLodge(),
  "civic-midhigh-water-filtration-lab": civicMidhighWaterFiltrationLab(),
  "civic-mid-neighborhood-post-branch": civicMidNeighborhoodPostBranch(),
  "civic-mid-dmv-licensing-office": civicMidDmvLicensingOffice(),
  "civic-mid-scout-hut-cabin": civicMidScoutHutCabin(),
  "civic-mid-park-maintenance-depot": civicMidParkMaintenanceDepot(),
  "civic-mid-animal-control-shelter": civicMidAnimalControlShelter(),
  "civic-mid-public-restroom-building": civicMidPublicRestroomBuilding(),
  "civic-mid-polling-station-hall": civicMidPollingStationHall(),
  "civic-mid-emergency-siren-pole": civicMidEmergencySirenPole(),
  "civic-mid-weather-station-enclosure": civicMidWeatherStationEnclosure(),
  "civic-mid-cemetery-mausoleum-vault": civicMidCemeteryMausoleumVault(),
  "civic-midlow-park-information-kiosk": civicMidlowParkInformationKiosk(),
  "civic-midlow-recycling-dropoff-bin": civicMidlowRecyclingDropoffBin(),
  "civic-midlow-traffic-control-box": civicMidlowTrafficControlBox(),
  "civic-midlow-temporary-polling-booth": civicMidlowTemporaryPollingBooth(),
  "civic-midlow-fire-hydrant-assembly": civicMidlowFireHydrantAssembly(),
  "civic-midlow-street-grit-bin": civicMidlowStreetGritBin(),
  "civic-midlow-public-lifebuoy-station": civicMidlowPublicLifebuoyStation(),
  "civic-midlow-defibrillator-aed-kiosk": civicMidlowDefibrillatorAedKiosk(),
  "civic-midlow-park-rules-signpost": civicMidlowParkRulesSignpost(),
  "civic-midlow-survey-benchmark-monument": civicMidlowSurveyBenchmarkMonument(),
  "bridge-showstopper-calatrava-harp-pylon": bridgeShowstopperCalatravaHarpPylon(),
  "bridge-showstopper-calatrava-sundial-footbridge": bridgeShowstopperCalatravaSundialFootbridge(),
  "bridge-showstopper-calatrava-rib-arch": bridgeShowstopperCalatravaRibArch(),
  "bridge-showstopper-calatrava-twin-mast-viaduct": bridgeShowstopperCalatravaTwinMastViaduct(),
  "bridge-showstopper-calatrava-winged-swing-bridge": bridgeShowstopperCalatravaWingedSwingBridge(),
  "bridge-showstopper-calatrava-skeletal-spine-overpass": bridgeShowstopperCalatravaSkeletalSpineOverpass(),
  "roads-showstopper-helix-interchange-flyover": roadsShowstopperHelixInterchangeFlyover(),
  "roads-showstopper-grand-rotunda-plaza": roadsShowstopperGrandRotundaPlaza(),
  "roads-showstopper-sunken-canal-promenade": roadsShowstopperSunkenCanalPromenade(),
  "roads-showstopper-hyperloop-tube-viaduct": roadsShowstopperHyperloopTubeViaduct(),
  "bridge-luxury-bowstring-tied-arch": bridgeLuxuryBowstringTiedArch(),
  "bridge-luxury-stone-three-arch-viaduct": bridgeLuxuryStoneThreeArchViaduct(),
  "roads-luxury-grand-boulevard-median": roadsLuxuryGrandBoulevardMedian(),
  "roads-luxury-promenade-boardwalk-pier": roadsLuxuryPromenadeBoardwalkPier(),
  "roads-luxury-cobblestone-heritage-plaza": roadsLuxuryCobblestoneHeritagePlaza(),
  "bridge-luxury-extradosed-twin-fin": bridgeLuxuryExtradosedTwinFin(),
  "roads-luxury-scenic-overlook-terrace": roadsLuxuryScenicOverlookTerrace(),
  "bridge-luxury-covered-timber-truss": bridgeLuxuryCoveredTimberTruss(),
  "roads-luxury-stepped-water-cascade-stairs": roadsLuxurySteppedWaterCascadeStairs(),
  "bridge-luxury-tubular-steel-pedestrian-helix": bridgeLuxuryTubularSteelPedestrianHelix(),
  "bridge-highend-steel-box-girder-span": bridgeHighendSteelBoxGirderSpan(),
  "bridge-highend-concrete-portal-overpass": bridgeHighendConcretePortalOverpass(),
  "roads-highend-multi-lane-divided-arterial": roadsHighendMultiLaneDividedArterial(),
  "roads-highend-roundabout-circulator-island": roadsHighendRoundaboutCirculatorIsland(),
  "roads-highend-bus-rapid-transit-median-station": roadsHighendBusRapidTransitMedianStation(),
  "bridge-highend-through-truss-railway-span": bridgeHighendThroughTrussRailwaySpan(),
  "roads-highend-illuminated-pedestrian-underpass": roadsHighendIlluminatedPedestrianUnderpass(),
  "roads-highend-tramway-embedded-street": roadsHighendTramwayEmbeddedStreet(),
  "roads-highend-curved-freeway-flyover-ramp": roadsHighendCurvedFreewayFlyoverRamp(),
  "roads-highend-highway-electronic-tolling-gantry": roadsHighendHighwayElectronicTollingGantry(),
  "roads-midhigh-standard-asphalt-avenue": roadsMidhighStandardAsphaltAvenue(),
  "bridge-midhigh-precast-concrete-girder-span": bridgeMidhighPrecastConcreteGirderSpan(),
  "roads-midhigh-asphalt-intersection-t-junction": roadsMidhighAsphaltIntersectionTJunction(),
  "roads-midhigh-signalized-4way-intersection": roadsMidhighSignalized4wayIntersection(),
  "roads-midhigh-concrete-retaining-wall-ramp": roadsMidhighConcreteRetainingWallRamp(),
  "roads-midhigh-pedestrian-refuge-crossing": roadsMidhighPedestrianRefugeCrossing(),
  "roads-midhigh-highway-overpass-sign-bridge": roadsMidhighHighwayOverpassSignBridge(),
  "bridge-midhigh-timber-trestle-footbridge": bridgeMidhighTimberTrestleFootbridge(),
  "roads-midhigh-cul-de-sac-turning-bulb": roadsMidhighCulDeSacTurningBulb(),
  "roads-midhigh-curved-slip-lane": roadsMidhighCurvedSlipLane(),
  "roads-mid-suburban-residential-street": roadsMidSuburbanResidentialStreet(),
  "bridge-mid-concrete-box-culvert": bridgeMidConcreteBoxCulvert(),
  "roads-mid-asphalt-dead-end": roadsMidAsphaltDeadEnd(),
  "roads-mid-gravel-access-track": roadsMidGravelAccessTrack(),
  "roads-mid-speed-hump-segment": roadsMidSpeedHumpSegment(),
  "roads-mid-asphalt-parking-bay-strip": roadsMidAsphaltParkingBayStrip(),
  "roads-mid-concrete-sidewalk-corner": roadsMidConcreteSidewalkCorner(),
  "roads-mid-driveway-curb-cut": roadsMidDrivewayCurbCut(),
  "roads-mid-guardrail-roadside-barrier": roadsMidGuardrailRoadsideBarrier(),
  "roads-mid-alleyway-paved-passage": roadsMidAlleywayPavedPassage(),
  "roads-midlow-traffic-cone-orange": roadsMidlowTrafficConeOrange(),
  "roads-midlow-concrete-jersey-barrier": roadsMidlowConcreteJerseyBarrier(),
  "roads-midlow-plastic-water-filled-barricade": roadsMidlowPlasticWaterFilledBarricade(),
  "roads-midlow-road-work-ahead-sign": roadsMidlowRoadWorkAheadSign(),
  "roads-midlow-flexible-delineator-post": roadsMidlowFlexibleDelineatorPost(),
  "roads-midlow-asphalt-pothole-patch": roadsMidlowAsphaltPotholePatch(),
  "roads-midlow-storm-drain-manhole-cover": roadsMidlowStormDrainManholeCover(),
  "roads-midlow-wheel-stop-parking-curb": roadsMidlowWheelStopParkingCurb(),
  "roads-midlow-road-marking-cat-eyes-row": roadsMidlowRoadMarkingCatEyesRow(),
  "roads-midlow-speed-limit-signpost": roadsMidlowSpeedLimitSignpost(),
  "vehicle-showstopper-maglev-bullet-train": vehicleShowstopperMaglevBulletTrain(),
  "vehicle-showstopper-hypercar-prototype": vehicleShowstopperHypercarPrototype(),
  "vehicle-showstopper-autonomous-straddling-bus": vehicleShowstopperAutonomousStraddlingBus(),
  "vehicle-showstopper-heavy-mining-dump-truck": vehicleShowstopperHeavyMiningDumpTruck(),
  "vehicle-showstopper-dual-articulated-tram": vehicleShowstopperDualArticulatedTram(),
  "vehicle-showstopper-aerial-ladder-fire-truck": vehicleShowstopperAerialLadderFireTruck(),
  "vehicle-showstopper-mobile-rocket-transporter": vehicleShowstopperMobileRocketTransporter(),
  "vehicle-showstopper-amphibious-all-terrain-expedition": vehicleShowstopperAmphibiousAllTerrainExpedition(),
  "vehicle-showstopper-luxury-sleeper-coach": vehicleShowstopperLuxurySleeperCoach(),
  "vehicle-showstopper-heavy-rotary-snowplow": vehicleShowstopperHeavyRotarySnowplow(),
  "vehicle-luxury-grand-tourer-coupe": vehicleLuxuryGrandTourerCoupe(),
  "vehicle-luxury-chauffeur-limousine": vehicleLuxuryChauffeurLimousine(),
  "vehicle-luxury-fullsize-prestige-suv": vehicleLuxuryFullsizePrestigeSuv(),
  "vehicle-luxury-supercar-spider": vehicleLuxurySupercarSpider(),
  "vehicle-luxury-armored-security-transport": vehicleLuxuryArmoredSecurityTransport(),
  "vehicle-luxury-classic-vintage-roadster": vehicleLuxuryClassicVintageRoadster(),
  "vehicle-luxury-executive-sprinter-van": vehicleLuxuryExecutiveSprinterVan(),
  "vehicle-luxury-electric-hyper-sedan": vehicleLuxuryElectricHyperSedan(),
  "vehicle-luxury-touring-motorcycle-sidecar": vehicleLuxuryTouringMotorcycleSidecar(),
  "vehicle-luxury-horse-drawn-royal-carriage": vehicleLuxuryHorseDrawnRoyalCarriage(),
  "vehicle-highend-city-transit-electric-bus": vehicleHighendCityTransitElectricBus(),
  "vehicle-highend-paramedic-mobile-icu": vehicleHighendParamedicMobileIcu(),
  "vehicle-highend-police-interceptor-cruiser": vehicleHighendPoliceInterceptorCruiser(),
  "vehicle-highend-semi-truck-sleeper-cab": vehicleHighendSemiTruckSleeperCab(),
  "vehicle-highend-tracked-heavy-excavator": vehicleHighendTrackedHeavyExcavator(),
  "vehicle-highend-mobile-telescopic-crane": vehicleHighendMobileTelescopicCrane(),
  "vehicle-highend-airport-crash-tender": vehicleHighendAirportCrashTender(),
  "vehicle-highend-articulated-dump-hauler": vehicleHighendArticulatedDumpHauler(),
  "vehicle-highend-tracked-snowcat-groomer": vehicleHighendTrackedSnowcatGroomer(),
  "vehicle-highend-refrigerated-freight-truck": vehicleHighendRefrigeratedFreightTruck(),
  "vehicle-midhigh-modern-compact-crossover": vehicleMidhighModernCompactCrossover(),
  "vehicle-midhigh-electric-delivery-van": vehicleMidhighElectricDeliveryVan(),
  "vehicle-midhigh-crew-cab-pickup-truck": vehicleMidhighCrewCabPickupTruck(),
  "vehicle-midhigh-municipal-sweeper-truck": vehicleMidhighMunicipalSweeperTruck(),
  "vehicle-midhigh-refuse-garbage-truck": vehicleMidhighRefuseGarbageTruck(),
  "vehicle-midhigh-flatbed-tow-truck": vehicleMidhighFlatbedTowTruck(),
  "vehicle-midhigh-wheel-loader-tractor": vehicleMidhighWheelLoaderTractor(),
  "vehicle-midhigh-school-transit-bus": vehicleMidhighSchoolTransitBus(),
  "vehicle-midhigh-concrete-mixer-truck": vehicleMidhighConcreteMixerTruck(),
  "vehicle-midhigh-bucket-utility-cherry-picker": vehicleMidhighBucketUtilityCherryPicker(),
  "vehicle-mid-standard-family-sedan": vehicleMidStandardFamilySedan(),
  "vehicle-mid-compact-hatchback": vehicleMidCompactHatchback(),
  "vehicle-mid-standard-minivan": vehicleMidStandardMinivan(),
  "vehicle-mid-single-cab-pickup": vehicleMidSingleCabPickup(),
  "vehicle-mid-cargo-panel-van": vehicleMidCargoPanelVan(),
  "vehicle-mid-station-wagon": vehicleMidStationWagon(),
  "vehicle-mid-box-delivery-truck": vehicleMidBoxDeliveryTruck(),
  "vehicle-mid-forklift-pallet-truck": vehicleMidForkliftPalletTruck(),
  "vehicle-mid-farm-utility-tractor": vehicleMidFarmUtilityTractor(),
  "vehicle-mid-electric-golf-cart": vehicleMidElectricGolfCart(),
  "vehicle-midlow-commuter-bicycle": vehicleMidlowCommuterBicycle(),
  "vehicle-midlow-electric-kick-scooter": vehicleMidlowElectricKickScooter(),
  "vehicle-midlow-moped-scooter-50cc": vehicleMidlowMopedScooter50cc(),
  "vehicle-midlow-hand-pallet-jack": vehicleMidlowHandPalletJack(),
  "vehicle-midlow-utility-box-trailer": vehicleMidlowUtilityBoxTrailer(),
  "vehicle-midlow-site-dump-cart-barrow": vehicleMidlowSiteDumpCartBarrow(),
  "vehicle-midlow-push-lawn-mower": vehicleMidlowPushLawnMower(),
  "vehicle-midlow-street-food-vending-cart": vehicleMidlowStreetFoodVendingCart(),
  "vehicle-midlow-airport-baggage-trailer": vehicleMidlowAirportBaggageTrailer(),
  "vehicle-midlow-hand-truck-dolly": vehicleMidlowHandTruckDolly(),
  "maritime-showstopper-giga-yacht-helipad": maritimeShowstopperGigaYachtHelipad(),
  "maritime-showstopper-ocean-cruise-liner": maritimeShowstopperOceanCruiseLiner(),
  "maritime-showstopper-container-ship-triple-e": maritimeShowstopperContainerShipTripleE(),
  "maritime-showstopper-container-quayside-gantry-crane": maritimeShowstopperContainerQuaysideGantryCrane(),
  "maritime-showstopper-polar-icebreaker-ship": maritimeShowstopperPolarIcebreakerShip(),
  "maritime-showstopper-hydrofoil-catamaran-ferry": maritimeShowstopperHydrofoilCatamaranFerry(),
  "maritime-showstopper-semi-submersible-oil-rig": maritimeShowstopperSemiSubmersibleOilRig(),
  "maritime-showstopper-historic-tall-ship-frigate": maritimeShowstopperHistoricTallShipFrigate(),
  "maritime-showstopper-lng-carrier-spherical-tanks": maritimeShowstopperLngCarrierSphericalTanks(),
  "maritime-showstopper-floating-drydock": maritimeShowstopperFloatingDrydock(),
  "maritime-luxury-superyacht-flybridge": maritimeLuxurySuperyachtFlybridge(),
  "maritime-luxury-modern-sailing-yacht": maritimeLuxuryModernSailingYacht(),
  "maritime-luxury-offshore-sportfisher": maritimeLuxuryOffshoreSportfisher(),
  "maritime-luxury-waterfront-marina-berth-complex": maritimeLuxuryWaterfrontMarinaBerthComplex(),
  "maritime-luxury-classic-mahogany-runabout": maritimeLuxuryClassicMahoganyRunabout(),
  "maritime-luxury-hydrofoil-water-taxi": maritimeLuxuryHydrofoilWaterTaxi(),
  "maritime-luxury-catamaran-cruising-yacht": maritimeLuxuryCatamaranCruisingYacht(),
  "maritime-luxury-harbor-pilot-command-vessel": maritimeLuxuryHarborPilotCommandVessel(),
  "maritime-luxury-floating-helipad-pontoon": maritimeLuxuryFloatingHelipadPontoon(),
  "maritime-luxury-solar-electric-yacht": maritimeLuxurySolarElectricYacht(),
  "maritime-highend-ocean-tugboat-escort": maritimeHighendOceanTugboatEscort(),
  "maritime-highend-commercial-trawler": maritimeHighendCommercialTrawler(),
  "maritime-highend-car-ferry-roll-on-roll-off": maritimeHighendCarFerryRollOnRollOff(),
  "maritime-highend-coastal-cargo-feeder": maritimeHighendCoastalCargoFeeder(),
  "maritime-highend-harbor-fireboat-monitor": maritimeHighendHarborFireboatMonitor(),
  "maritime-highend-scientific-research-vessel": maritimeHighendScientificResearchVessel(),
  "maritime-highend-offshore-crew-supply-vessel": maritimeHighendOffshoreCrewSupplyVessel(),
  "maritime-highend-historic-paddle-steamer": maritimeHighendHistoricPaddleSteamer(),
  "maritime-highend-quayside-portal-wharf-crane": maritimeHighendQuaysidePortalWharfCrane(),
  "maritime-highend-dredger-vessel-hopper": maritimeHighendDredgerVesselHopper(),
  "maritime-midhigh-harbor-service-launch": maritimeMidhighHarborServiceLaunch(),
  "maritime-midhigh-coastal-fishing-coble": maritimeMidhighCoastalFishingCoble(),
  "maritime-midhigh-steel-deck-cargo-barge": maritimeMidhighSteelDeckCargoBarge(),
  "maritime-midhigh-pontoon-ferry-landing-stage": maritimeMidhighPontoonFerryLandingStage(),
  "maritime-midhigh-rigid-inflatable-rescue-rib": maritimeMidhighRigidInflatableRescueRib(),
  "maritime-midhigh-navigation-channel-lighthouse": maritimeMidhighNavigationChannelLighthouse(),
  "maritime-midhigh-timber-mooring-dolphin-cluster": maritimeMidhighTimberMooringDolphinCluster(),
  "maritime-midhigh-clam-shell-dredging-crane-barge": maritimeMidhighClamShellDredgingCraneBarge(),
  "maritime-midhigh-harbor-bunkering-tanker-small": maritimeMidhighHarborBunkeringTankerSmall(),
  "maritime-midhigh-marine-boat-lift-hoist-dock": maritimeMidhighMarineBoatLiftHoistDock(),
  "maritime-mid-open-skiff-utility-outboard": maritimeMidOpenSkiffUtilityOutboard(),
  "maritime-mid-moored-channel-buoy-can": maritimeMidMooredChannelBuoyCan(),
  "maritime-mid-cardinal-navigation-spar-buoy": maritimeMidCardinalNavigationSparBuoy(),
  "maritime-mid-fixed-pile-timber-jetty": maritimeMidFixedPileTimberJetty(),
  "maritime-mid-canoe-kayak-rack-storage": maritimeMidCanoeKayakRackStorage(),
  "maritime-mid-heavy-mooring-cleat-bollard": maritimeMidHeavyMooringCleatBollard(),
  "maritime-mid-inflatable-rescue-dinghy": maritimeMidInflatableRescueDinghy(),
  "maritime-mid-shipyard-welding-generator-cart": maritimeMidShipyardWeldingGeneratorCart(),
  "maritime-mid-marine-fuel-dispenser-pump": maritimeMidMarineFuelDispenserPump(),
  "maritime-mid-harbor-trash-skimmer-bin": maritimeMidHarborTrashSkimmerBin(),
  "maritime-midlow-wooden-rowboat-oars": maritimeMidlowWoodenRowboatOars(),
  "maritime-midlow-stacked-lobster-traps": maritimeMidlowStackedLobsterTraps(),
  "maritime-midlow-floating-poly-fender-buoy": maritimeMidlowFloatingPolyFenderBuoy(),
  "maritime-midlow-dockside-rope-coil": maritimeMidlowDocksideRopeCoil(),
  "maritime-midlow-danforth-fluke-anchor": maritimeMidlowDanforthFlukeAnchor(),
  "maritime-midlow-dock-ladder-aluminum": maritimeMidlowDockLadderAluminum(),
  "maritime-midlow-fish-tote-ice-crates": maritimeMidlowFishToteIceCrates(),
  "maritime-midlow-mooring-pile-cap": maritimeMidlowMooringPileCap(),
  "maritime-midlow-kayak-single-plastic": maritimeMidlowKayakSinglePlastic(),
  "maritime-midlow-quayside-safety-ring-post": maritimeMidlowQuaysideSafetyRingPost(),
  "aircraft-showstopper-supersonic-concorde": aircraftShowstopperSupersonicConcorde(),
  "aircraft-showstopper-jumbo-quad-airliner": aircraftShowstopperJumboQuadAirliner(),
  "aviation-showstopper-cantilever-hangar-arch": aviationShowstopperCantileverHangarArch(),
  "aviation-showstopper-atc-control-tower-hyperboloid": aviationShowstopperAtcControlTowerHyperboloid(),
  "aircraft-showstopper-tiltrotor-vtol-heavy": aircraftShowstopperTiltrotorVtolHeavy(),
  "aircraft-showstopper-flying-wing-blended-body": aircraftShowstopperFlyingWingBlendedBody(),
  "aircraft-showstopper-heavy-firefighting-airtanker": aircraftShowstopperHeavyFirefightingAirtanker(),
  "aircraft-showstopper-twin-rotor-heavy-lift-helicopter": aircraftShowstopperTwinRotorHeavyLiftHelicopter(),
  "aviation-showstopper-terminal-pier-satellite-rotunda": aviationShowstopperTerminalPierSatelliteRotunda(),
  "aircraft-showstopper-aerobatic-formation-lead-jet": aircraftShowstopperAerobaticFormationLeadJet(),
  "aircraft-luxury-ultra-long-range-private-jet": aircraftLuxuryUltraLongRangePrivateJet(),
  "aircraft-luxury-twin-turbine-executive-helicopter": aircraftLuxuryTwinTurbineExecutiveHelicopter(),
  "aviation-luxury-fbo-private-terminal-lounge": aviationLuxuryFboPrivateTerminalLounge(),
  "aviation-luxury-private-jet-hangar-executive": aviationLuxuryPrivateJetHangarExecutive(),
  "aircraft-luxury-classic-amphibious-flying-boat": aircraftLuxuryClassicAmphibiousFlyingBoat(),
  "aircraft-luxury-air-ambulance-turboprop": aircraftLuxuryAirAmbulanceTurboprop(),
  "aviation-luxury-helipad-approach-lighting-rig": aviationLuxuryHelipadApproachLightingRig(),
  "aircraft-luxury-carbon-light-sport-monoplane": aircraftLuxuryCarbonLightSportMonoplane(),
  "aviation-luxury-hangar-office-annex": aviationLuxuryHangarOfficeAnnex(),
  "aircraft-luxury-electric-vertical-takeoff-shuttle": aircraftLuxuryElectricVerticalTakeoffShuttle(),
  "aircraft-highend-regional-twin-jet-airliner": aircraftHighendRegionalTwinJetAirliner(),
  "aviation-highend-mobile-passenger-boarding-bridge": aviationHighendMobilePassengerBoardingBridge(),
  "aviation-highend-aircraft-deicing-truck": aviationHighendAircraftDeicingTruck(),
  "aviation-highend-airport-snow-sweeper-plow": aviationHighendAirportSnowSweeperPlow(),
  "aviation-highend-ils-localizer-antenna-array": aviationHighendIlsLocalizerAntennaArray(),
  "aviation-highend-airport-fuel-hydrant-dispenser": aviationHighendAirportFuelHydrantDispenser(),
  "aircraft-highend-twin-turboprop-commuter": aircraftHighendTwinTurbopropCommuter(),
  "aviation-highend-airfield-primary-surveillance-radar": aviationHighendAirfieldPrimarySurveillanceRadar(),
  "aviation-highend-runway-friction-tester-vehicle": aviationHighendRunwayFrictionTesterVehicle(),
  "aviation-highend-airport-mobile-stairs-truck": aviationHighendAirportMobileStairsTruck(),
  "aviation-midhigh-aircraft-pushback-tug": aviationMidhighAircraftPushbackTug(),
  "aviation-midhigh-belt-loader-conveyor-truck": aviationMidhighBeltLoaderConveyorTruck(),
  "aircraft-midhigh-general-aviation-cessna": aircraftMidhighGeneralAviationCessna(),
  "aviation-midhigh-runway-papi-light-unit": aviationMidhighRunwayPapiLightUnit(),
  "aviation-midhigh-aircraft-catering-scissor-truck": aviationMidhighAircraftCateringScissorTruck(),
  "aviation-midhigh-airfield-ground-power-unit": aviationMidhighAirfieldGroundPowerUnit(),
  "aviation-midhigh-aircraft-air-starter-unit": aviationMidhighAircraftAirStarterUnit(),
  "aviation-midhigh-apron-passenger-transfer-bus": aviationMidhighApronPassengerTransferBus(),
  "aviation-midhigh-airport-security-patrol-vehicle": aviationMidhighAirportSecurityPatrolVehicle(),
  "aviation-midhigh-runway-end-safety-barrier": aviationMidhighRunwayEndSafetyBarrier(),
  "aviation-mid-airfield-windsock-mast": aviationMidAirfieldWindsockMast(),
  "aviation-mid-baggage-tractor-tug": aviationMidBaggageTractorTug(),
  "aviation-mid-airport-chocks-and-cones-rack": aviationMidAirportChocksAndConesRack(),
  "aviation-mid-aircraft-maintenance-step-ladder": aviationMidAircraftMaintenanceStepLadder(),
  "aviation-mid-fuel-spill-response-kit-cart": aviationMidFuelSpillResponseKitCart(),
  "aviation-mid-nitrogen-service-cart": aviationMidNitrogenServiceCart(),
  "aviation-mid-hydraulic-mule-test-cart": aviationMidHydraulicMuleTestCart(),
  "aviation-mid-lavatory-service-truck": aviationMidLavatoryServiceTruck(),
  "aviation-mid-aircraft-towbar-rack-cart": aviationMidAircraftTowbarRackCart(),
  "aviation-mid-airfield-foreign-object-sweeper-mat": aviationMidAirfieldForeignObjectSweeperMat(),
  "aviation-midlow-runway-edge-light-stake": aviationMidlowRunwayEdgeLightStake(),
  "aviation-midlow-taxiway-guidance-signbox": aviationMidlowTaxiwayGuidanceSignbox(),
  "aviation-midlow-aircraft-wheel-chocks-pair": aviationMidlowAircraftWheelChocksPair(),
  "aviation-midlow-aircraft-grounding-receptacle-pin": aviationMidlowAircraftGroundingReceptaclePin(),
  "aviation-midlow-marshalling-wands-holder": aviationMidlowMarshallingWandsHolder(),
  "aviation-midlow-ramp-safety-stanchion-chain": aviationMidlowRampSafetyStanchionChain(),
  "aviation-midlow-aircraft-universal-tow-bar": aviationMidlowAircraftUniversalTowBar(),
  "aviation-midlow-fuel-drum-pallet": aviationMidlowFuelDrumPallet(),
  "aviation-midlow-perimeter-security-gate": aviationMidlowPerimeterSecurityGate(),
  "aviation-midlow-apron-floodlight-pole": aviationMidlowApronFloodlightPole(),
  "tree-showstopper-ancient-banyan": treeShowstopperAncientBanyan(),
  "tree-showstopper-giant-sequoia": treeShowstopperGiantSequoia(),
  "vegetation-showstopper-vertical-living-wall-monolith": vegetationShowstopperVerticalLivingWallMonolith(),
  "tree-showstopper-japanese-weeping-cherry-grand": treeShowstopperJapaneseWeepingCherryGrand(),
  "tree-showstopper-baobab-grand-specimen": treeShowstopperBaobabGrandSpecimen(),
  "tree-showstopper-weeping-willow-pond-canopy": treeShowstopperWeepingWillowPondCanopy(),
  "vegetation-showstopper-topiary-spiral-sculpture": vegetationShowstopperTopiarySpiralSculpture(),
  "tree-showstopper-jacaranda-purple-bloom": treeShowstopperJacarandaPurpleBloom(),
  "tree-showstopper-canary-island-date-palm-trio": treeShowstopperCanaryIslandDatePalmTrio(),
  "vegetation-showstopper-botanical-zen-bonsai-rock": vegetationShowstopperBotanicalZenBonsaiRock(),
  "tree-luxury-royal-palm-avenue-pair": treeLuxuryRoyalPalmAvenuePair(),
  "vegetation-luxury-italian-cypress-screen": vegetationLuxuryItalianCypressScreen(),
  "vegetation-luxury-manicured-parterre-garden": vegetationLuxuryManicuredParterreGarden(),
  "tree-luxury-pleached-linden-allée": treeLuxuryPleachedLindenAllée(),
  "vegetation-luxury-tiered-raised-stone-planter": vegetationLuxuryTieredRaisedStonePlanter(),
  "tree-luxury-mature-copper-beech": treeLuxuryMatureCopperBeech(),
  "vegetation-luxury-bamboo-zen-grove": vegetationLuxuryBambooZenGrove(),
  "vegetation-luxury-sculpted-boxwood-sphere-trio": vegetationLuxurySculptedBoxwoodSphereTrio(),
  "tree-luxury-mediterranean-stone-pine": treeLuxuryMediterraneanStonePine(),
  "vegetation-luxury-ornamental-koi-lily-pond": vegetationLuxuryOrnamentalKoiLilyPond(),
  "tree-highend-norway-maple-canopy": treeHighendNorwayMapleCanopy(),
  "vegetation-highend-pruned-yew-hedge-segment": vegetationHighendPrunedYewHedgeSegment(),
  "tree-highend-london-plane-street-tree": treeHighendLondonPlaneStreetTree(),
  "vegetation-highend-lavender-perennial-border": vegetationHighendLavenderPerennialBorder(),
  "tree-highend-silver-birch-trio": treeHighendSilverBirchTrio(),
  "vegetation-highend-corten-steel-raised-planter": vegetationHighendCortenSteelRaisedPlanter(),
  "tree-highend-sugar-maple-autumn-gold": treeHighendSugarMapleAutumnGold(),
  "vegetation-highend-ornamental-grasses-swale": vegetationHighendOrnamentalGrassesSwale(),
  "tree-highend-saucer-magnolia-pink": treeHighendSaucerMagnoliaPink(),
  "vegetation-highend-espalier-fruit-trellis": vegetationHighendEspalierFruitTrellis(),
  "tree-midhigh-suburban-oak": treeMidhighSuburbanOak(),
  "tree-midhigh-columnar-poplar": treeMidhighColumnarPoplar(),
  "vegetation-midhigh-boxwood-hedge-straight": vegetationMidhighBoxwoodHedgeStraight(),
  "tree-midhigh-flowering-dogwood": treeMidhighFloweringDogwood(),
  "vegetation-midhigh-hydrangea-shrub-cluster": vegetationMidhighHydrangeaShrubCluster(),
  "tree-midhigh-pyramidal-arborvitae": treeMidhighPyramidalArborvitae(),
  "vegetation-midhigh-concrete-round-planter": vegetationMidhighConcreteRoundPlanter(),
  "tree-midhigh-crepe-myrtle": treeMidhighCrepeMyrtle(),
  "vegetation-midhigh-rhododendron-thicket": vegetationMidhighRhododendronThicket(),
  "tree-midhigh-crabapple-spring-snow": treeMidhighCrabappleSpringSnow(),
  "tree-mid-generic-conifer-pine": treeMidGenericConiferPine(),
  "tree-mid-generic-deciduous-round": treeMidGenericDeciduousRound(),
  "vegetation-mid-wildflower-meadow-patch": vegetationMidWildflowerMeadowPatch(),
  "vegetation-mid-generic-shrub-mound": vegetationMidGenericShrubMound(),
  "vegetation-mid-rect-wooden-planter-trough": vegetationMidRectWoodenPlanterTrough(),
  "vegetation-mid-tall-cattail-reeds-cluster": vegetationMidTallCattailReedsCluster(),
  "vegetation-mid-fern-undergrowth-clump": vegetationMidFernUndergrowthClump(),
  "tree-mid-young-sapling-tree-stakes": treeMidYoungSaplingTreeStakes(),
  "vegetation-mid-lawn-grass-square-turf": vegetationMidLawnGrassSquareTurf(),
  "vegetation-mid-ivy-groundcover-bed": vegetationMidIvyGroundcoverBed(),
  "vegetation-midlow-weed-patch-cracked-pavement": vegetationMidlowWeedPatchCrackedPavement(),
  "vegetation-midlow-mulch-tree-ring": vegetationMidlowMulchTreeRing(),
  "vegetation-midlow-cut-tree-stump": vegetationMidlowCutTreeStump(),
  "vegetation-midlow-fallen-log-decayed": vegetationMidlowFallenLogDecayed(),
  "vegetation-midlow-single-cattail-stem": vegetationMidlowSingleCattailStem(),
  "vegetation-midlow-potted-plastic-fern": vegetationMidlowPottedPlasticFern(),
  "vegetation-midlow-clover-patch": vegetationMidlowCloverPatch(),
  "vegetation-midlow-dandelion-tuft": vegetationMidlowDandelionTuft(),
  "vegetation-midlow-gravel-cactus-succulent-pot": vegetationMidlowGravelCactusSucculentPot(),
  "vegetation-midlow-brush-tumbleweed-ball": vegetationMidlowBrushTumbleweedBall(),
  "furniture-showstopper-curvilinear-transit-shelter": furnitureShowstopperCurvilinearTransitShelter(),
  "furniture-showstopper-grand-plaza-fountain-sculpture": furnitureShowstopperGrandPlazaFountainSculpture(),
  "furniture-showstopper-solar-canopy-seating-hub": furnitureShowstopperSolarCanopySeatingHub(),
  "furniture-showstopper-kinetic-wind-sculpture": furnitureShowstopperKineticWindSculpture(),
  "furniture-showstopper-curved-pergola-colonnade": furnitureShowstopperCurvedPergolaColonnade(),
  "furniture-showstopper-biophilic-moss-wellness-pod": furnitureShowstopperBiophilicMossWellnessPod(),
  "furniture-showstopper-smart-interactive-digital-kiosk": furnitureShowstopperSmartInteractiveDigitalKiosk(),
  "furniture-showstopper-helix-bicycle-parking-pavilion": furnitureShowstopperHelixBicycleParkingPavilion(),
  "furniture-showstopper-infinity-reflecting-pool-table": furnitureShowstopperInfinityReflectingPoolTable(),
  "furniture-showstopper-amphitheatre-stepped-seating-bowl": furnitureShowstopperAmphitheatreSteppedSeatingBowl(),
  "furniture-luxury-solid-teak-serpentine-bench": furnitureLuxurySolidTeakSerpentineBench(),
  "furniture-luxury-bronze-cast-streetlamp-post": furnitureLuxuryBronzeCastStreetlampPost(),
  "furniture-luxury-outdoor-dining-cabana-set": furnitureLuxuryOutdoorDiningCabanaSet(),
  "furniture-luxury-lounger-daybed-terrace-pair": furnitureLuxuryLoungerDaybedTerracePair(),
  "furniture-luxury-marble-drinking-fountain": furnitureLuxuryMarbleDrinkingFountain(),
  "furniture-luxury-curved-limestone-bench": furnitureLuxuryCurvedLimestoneBench(),
  "furniture-luxury-heated-bus-waiting-shelter": furnitureLuxuryHeatedBusWaitingShelter(),
  "furniture-luxury-brass-illuminated-bollards-row": furnitureLuxuryBrassIlluminatedBollardsRow(),
  "furniture-luxury-gas-fire-pit-lounge-table": furnitureLuxuryGasFirePitLoungeTable(),
  "furniture-luxury-sculptural-clock-kiosk": furnitureLuxurySculpturalClockKiosk(),
  "furniture-highend-contemporary-steel-wood-bench": furnitureHighendContemporarySteelWoodBench(),
  "furniture-highend-led-street-light-mast": furnitureHighendLedStreetLightMast(),
  "furniture-highend-modular-bus-stop-shelter": furnitureHighendModularBusStopShelter(),
  "furniture-highend-stainless-bike-rack-row": furnitureHighendStainlessBikeRackRow(),
  "furniture-highend-dual-stream-waste-recycling-station": furnitureHighendDualStreamWasteRecyclingStation(),
  "furniture-highend-ev-charging-pedestal-station": furnitureHighendEvChargingPedestalStation(),
  "furniture-highend-picnic-table-timber-shelter": furnitureHighendPicnicTableTimberShelter(),
  "furniture-highend-wayfinding-monolith-totem": furnitureHighendWayfindingMonolithTotem(),
  "furniture-highend-park-pergola-swing-seat": furnitureHighendParkPergolaSwingSeat(),
  "furniture-highend-cast-iron-tree-grate": furnitureHighendCastIronTreeGrate(),
  "furniture-midhigh-slatted-wood-park-bench": furnitureMidhighSlattedWoodParkBench(),
  "furniture-midhigh-cobra-head-streetlight": furnitureMidhighCobraHeadStreetlight(),
  "furniture-midhigh-wooden-picnic-table": furnitureMidhighWoodenPicnicTable(),
  "furniture-midhigh-cast-iron-bollard-pair": furnitureMidhighCastIronBollardPair(),
  "furniture-midhigh-mesh-litter-receptacle": furnitureMidhighMeshLitterReceptacle(),
  "furniture-midhigh-single-loop-bike-rack": furnitureMidhighSingleLoopBikeRack(),
  "furniture-midhigh-newspaper-vending-box": furnitureMidhighNewspaperVendingBox(),
  "furniture-midhigh-concrete-round-bollard": furnitureMidhighConcreteRoundBollard(),
  "furniture-midhigh-park-drinking-water-fountain": furnitureMidhighParkDrinkingWaterFountain(),
  "furniture-midhigh-public-bulletin-notice-board": furnitureMidhighPublicBulletinNoticeBoard(),
  "furniture-mid-basic-steel-slat-bench": furnitureMidBasicSteelSlatBench(),
  "furniture-mid-galvanized-light-pole": furnitureMidGalvanizedLightPole(),
  "furniture-mid-round-concrete-trash-can": furnitureMidRoundConcreteTrashCan(),
  "furniture-mid-steel-pipe-bollard": furnitureMidSteelPipeBollard(),
  "furniture-mid-bus-stop-flag-pole": furnitureMidBusStopFlagPole(),
  "furniture-mid-outdoor-plastic-table-chairs": furnitureMidOutdoorPlasticTableChairs(),
  "furniture-mid-grid-bike-rack-stand": furnitureMidGridBikeRackStand(),
  "furniture-mid-square-concrete-seat-cube": furnitureMidSquareConcreteSeatCube(),
  "furniture-mid-fire-alarm-call-box-pedestal": furnitureMidFireAlarmCallBoxPedestal(),
  "furniture-mid-outdoor-ashtray-pole-bin": furnitureMidOutdoorAshtrayPoleBin(),
  "furniture-midlow-plastic-stacking-chair": furnitureMidlowPlasticStackingChair(),
  "furniture-midlow-curbside-blue-recycling-box": furnitureMidlowCurbsideBlueRecyclingBox(),
  "furniture-midlow-folding-card-table": furnitureMidlowFoldingCardTable(),
  "furniture-midlow-wooden-sawhorse-barrier": furnitureMidlowWoodenSawhorseBarrier(),
  "furniture-midlow-55gal-steel-burn-drum": furnitureMidlow55galSteelBurnDrum(),
  "furniture-midlow-plastic-milk-crate": furnitureMidlowPlasticMilkCrate(),
  "furniture-midlow-temporary-plastic-trestle-bench": furnitureMidlowTemporaryPlasticTrestleBench(),
  "furniture-midlow-plastic-newspaper-tube-post": furnitureMidlowPlasticNewspaperTubePost(),
  "furniture-midlow-wooden-shipping-pallet-stack": furnitureMidlowWoodenShippingPalletStack(),
  "furniture-midlow-concrete-cinderblock-bench": furnitureMidlowConcreteCinderblockBench(),
  "boundary-showstopper-monumental-palace-gate": boundaryShowstopperMonumentalPalaceGate(),
  "boundary-showstopper-kinetic-wind-screen-wall": boundaryShowstopperKineticWindScreenWall(),
  "boundary-showstopper-origami-corten-retaining-wall": boundaryShowstopperOrigamiCortenRetainingWall(),
  "boundary-showstopper-curved-acoustic-glass-barrier": boundaryShowstopperCurvedAcousticGlassBarrier(),
  "boundary-showstopper-biophilic-living-green-screen-wall": boundaryShowstopperBiophilicLivingGreenScreenWall(),
  "boundary-showstopper-gilded-botanical-iron-fence": boundaryShowstopperGildedBotanicalIronFence(),
  "boundary-showstopper-high-security-sliding-cantilever-gate": boundaryShowstopperHighSecuritySlidingCantileverGate(),
  "boundary-showstopper-water-curtain-weeping-wall": boundaryShowstopperWaterCurtainWeepingWall(),
  "boundary-showstopper-gabion-curved-bastion-wall": boundaryShowstopperGabionCurvedBastionWall(),
  "boundary-showstopper-sculptural-timber-blade-fence": boundaryShowstopperSculpturalTimberBladeFence(),
  "boundary-luxury-dressed-sandstone-pier-wall": boundaryLuxuryDressedSandstonePierWall(),
  "boundary-luxury-ornamental-iron-estate-railings": boundaryLuxuryOrnamentalIronEstateRailings(),
  "boundary-luxury-seamless-frameless-glass-balustrade": boundaryLuxurySeamlessFramelessGlassBalustrade(),
  "boundary-luxury-horizontal-cedar-slat-screen": boundaryLuxuryHorizontalCedarSlatScreen(),
  "boundary-luxury-curved-driveway-entrance-sweep": boundaryLuxuryCurvedDrivewayEntranceSweep(),
  "boundary-luxury-security-turnstile-canopy-gate": boundaryLuxurySecurityTurnstileCanopyGate(),
  "boundary-luxury-laser-cut-corten-panel-fence": boundaryLuxuryLaserCutCortenPanelFence(),
  "boundary-luxury-dry-stack-slate-retaining-wall": boundaryLuxuryDryStackSlateRetainingWall(),
  "boundary-luxury-bronze-automated-driveway-gates": boundaryLuxuryBronzeAutomatedDrivewayGates(),
  "boundary-luxury-stucco-villa-wall-terracotta-tile": boundaryLuxuryStuccoVillaWallTerracottaTile(),
  "boundary-highend-steel-palisade-security-fence": boundaryHighendSteelPalisadeSecurityFence(),
  "boundary-highend-perforated-metal-acoustic-barrier": boundaryHighendPerforatedMetalAcousticBarrier(),
  "boundary-highend-brick-coping-garden-wall": boundaryHighendBrickCopingGardenWall(),
  "boundary-highend-expanded-metal-mesh-fence": boundaryHighendExpandedMetalMeshFence(),
  "boundary-highend-automated-boom-barrier-gate": boundaryHighendAutomatedBoomBarrierGate(),
  "boundary-highend-modular-gabion-basket-wall": boundaryHighendModularGabionBasketWall(),
  "boundary-highend-tubular-steel-pool-safety-fence": boundaryHighendTubularSteelPoolSafetyFence(),
  "boundary-highend-precast-concrete-sound-panel-wall": boundaryHighendPrecastConcreteSoundPanelWall(),
  "boundary-highend-retractable-security-bollards-unit": boundaryHighendRetractableSecurityBollardsUnit(),
  "boundary-highend-decorative-cast-stone-balustrade": boundaryHighendDecorativeCastStoneBalustrade(),
  "boundary-midhigh-chain-link-fence-barbed-wire": boundaryMidhighChainLinkFenceBarbedWire(),
  "boundary-midhigh-split-rail-wooden-farm-fence": boundaryMidhighSplitRailWoodenFarmFence(),
  "boundary-midhigh-vertical-wood-privacy-stockade": boundaryMidhighVerticalWoodPrivacyStockade(),
  "boundary-midhigh-curved-metal-pedestrian-railing": boundaryMidhighCurvedMetalPedestrianRailing(),
  "boundary-midhigh-double-swing-utility-gate": boundaryMidhighDoubleSwingUtilityGate(),
  "boundary-midhigh-post-and-chain-barrier": boundaryMidhighPostAndChainBarrier(),
  "boundary-midhigh-corrugated-metal-site-hoarding": boundaryMidhighCorrugatedMetalSiteHoarding(),
  "boundary-midhigh-ranch-style-vinyl-rail-fence": boundaryMidhighRanchStyleVinylRailFence(),
  "boundary-midhigh-concrete-wheel-curb-barrier": boundaryMidhighConcreteWheelCurbBarrier(),
  "boundary-midhigh-mesh-anti-dazzle-screen": boundaryMidhighMeshAntiDazzleScreen(),
  "boundary-mid-standard-chain-link-fence": boundaryMidStandardChainLinkFence(),
  "boundary-mid-wooden-picket-fence": boundaryMidWoodenPicketFence(),
  "boundary-mid-agricultural-barbed-wire-fence": boundaryMidAgriculturalBarbedWireFence(),
  "boundary-mid-field-gate-tubular-steel": boundaryMidFieldGateTubularSteel(),
  "boundary-mid-concrete-post-panel-fence": boundaryMidConcretePostPanelFence(),
  "boundary-mid-pipe-rail-corral-fence": boundaryMidPipeRailCorralFence(),
  "boundary-mid-orange-construction-snow-fence": boundaryMidOrangeConstructionSnowFence(),
  "boundary-mid-metal-crowd-control-pedestrian-barrier": boundaryMidMetalCrowdControlPedestrianBarrier(),
  "boundary-mid-reed-screen-garden-trellis": boundaryMidReedScreenGardenTrellis(),
  "boundary-mid-rope-boundary-stanchion-line": boundaryMidRopeBoundaryStanchionLine(),
  "boundary-midlow-plastic-orange-mesh-barrier": boundaryMidlowPlasticOrangeMeshBarrier(),
  "boundary-midlow-scaffold-pipe-railing": boundaryMidlowScaffoldPipeRailing(),
  "boundary-midlow-stacked-cinder-block-wall": boundaryMidlowStackedCinderBlockWall(),
  "boundary-midlow-hazard-tape-stanchions": boundaryMidlowHazardTapeStanchions(),
  "boundary-midlow-post-and-rope-barrier": boundaryMidlowPostAndRopeBarrier(),
  "boundary-midlow-wooden-snow-marker-lath": boundaryMidlowWoodenSnowMarkerLath(),
  "boundary-midlow-plastic-survey-flag-wire": boundaryMidlowPlasticSurveyFlagWire(),
  "boundary-midlow-corrugated-tin-patch-fence": boundaryMidlowCorrugatedTinPatchFence(),
  "boundary-midlow-caution-tape-rebar-picket": boundaryMidlowCautionTapeRebarPicket(),
  "boundary-midlow-wooden-pallet-perimeter-hurdle": boundaryMidlowWoodenPalletPerimeterHurdle(),
};
