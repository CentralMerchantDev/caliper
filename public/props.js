// =============================================================================
// CALIPER — PROP & MODEL LIBRARY
//
// Every model in this world describes itself (docs/WORLD-RULES.md §4).
//
// A prop states WHAT IT IS and WHAT IT OCCUPIES in built metres:
//   - kind: "hard" (blocks placement) or "soft" (removable)
//   - footprint: { w, d } ground occupancy BEFORE rotation
//   - sweep: { w, d } widest extent at height (if different from footprint)
//   - height: total vertical extent in metres
//   - clearance: free ground required around footprint (>= 0)
//   - origin: "base-centre" -- (0,0,0) is CENTRE of footprint at GROUND LEVEL.
//     Universal, no exceptions: the world places things by putting origin
//     on the terrain surface.
//   - standsOn: [ "sidewalk", "park", "verge", ... ] allowed ground types (§4)
//   - lod: 3 levels of detail (LOD0 full, LOD1 simplified, LOD2 box/card).
//
// FAMILIES & GENERATORS:
//   - tree(species, age)
//   - person(build, pose, palette)
//   - vehicle(class, variant)
//   - vessel(class)
//   - aircraft(class)
//
// SINGLE SOURCE OF TRUTH FOR SIZES:
// Dimensions for existing manifest props are imported directly from public/prop-manifest.js.
//
// BUILT METRES DO NOT SCALE.
// A bench is 1.8 m in any size of world. Never multiply asset dimensions
// by WORLD_SCALE.
// =============================================================================

import * as THREE from "three";
import { PROPS } from "./prop-manifest.js";

/**
 * Pure BufferGeometry combiner that merges an array of positioned geometries
 * into a single clean BufferGeometry without external addon dependencies.
 */
export function mergeGeometries(geoms, T = THREE) {
  if (!geoms || !geoms.length) return new T.BufferGeometry();
  if (geoms.length === 1) return geoms[0].clone();

  let totalPos = 0;
  let totalIdx = 0;
  for (const g of geoms) {
    if (!g.attributes.position) continue;
    totalPos += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : g.attributes.position.count;
  }

  const positions = new Float32Array(totalPos * 3);
  const normals = new Float32Array(totalPos * 3);
  const indices = new (totalPos > 65535 ? Uint32Array : Uint16Array)(totalIdx);

  let pOffset = 0;
  let iOffset = 0;
  let vOffset = 0;

  for (const g of geoms) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    positions.set(pos.array, pOffset * 3);
    if (norm) {
      normals.set(norm.array, pOffset * 3);
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[iOffset++] = g.index.array[i] + vOffset;
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices[iOffset++] = i + vOffset;
      }
    }
    pOffset += pos.count;
    vOffset += pos.count;
  }

  const merged = new T.BufferGeometry();
  merged.setAttribute("position", new T.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new T.BufferAttribute(normals, 3));
  merged.setIndex(new T.BufferAttribute(indices, 1));
  return merged;
}

// -----------------------------------------------------------------------------
// PARAMETERISED FAMILIES
// -----------------------------------------------------------------------------

/**
 * Tree Family: tree(species, age)
 * @param {"broadleaf"|"conifer"|"palm"|"cypress"|"birch"} species
 * @param {"sapling"|"mature"|"ancient"} age
 */
export function tree(species = "broadleaf", age = "mature") {
  const scales = { sapling: 0.4, mature: 1.0, ancient: 1.8 };
  const s = scales[age] || 1.0;
  const h = (species === "conifer" ? 8.5 : species === "palm" ? 7.0 : species === "cypress" ? 9.0 : 7.5) * s;
  const crownW = (species === "cypress" ? 1.8 : species === "palm" ? 4.5 : species === "conifer" ? 3.5 : 4.8) * s;
  const trunkR = (species === "ancient" ? 0.45 : species === "sapling" ? 0.08 : 0.22);
  const footW = Math.max(1.2, crownW * 0.7);

  return {
    id: `tree-${species}-${age}`,
    kind: "soft",
    family: "tree",
    species,
    age,
    footprint: { w: Number(footW.toFixed(2)), d: Number(footW.toFixed(2)) },
    sweep: { w: Number(crownW.toFixed(2)), d: Number(crownW.toFixed(2)) },
    height: Number(h.toFixed(2)),
    clearance: 0.4,
    origin: "base-centre",
    standsOn: ["park", "verge", "sidewalk", "open", "beach", "plot"],
    lod: [
      {
        level: 0,
        tris: 80, createGeometry: (T = THREE) => { const trunkH = h * 0.38;
          const trunk = new T.CylinderGeometry(trunkR * 0.75, trunkR, trunkH, 6);
          trunk.translate(0, trunkH / 2, 0);
          const parts = [trunk];

          if (species === "conifer" || species === "cypress") {
            const tiers = 3;
            for (let i = 0; i < tiers; i++) {
              const r = (crownW / 2) * (1 - i * 0.25);
              const th = (h - trunkH) * 0.45;
              const cone = new T.ConeGeometry(r, th, 6);
              cone.translate(0, trunkH + (i * th * 0.6) + th / 2, 0);
              parts.push(cone);
            }
          } else if (species === "palm") {
            const crownH = h - trunkH;
            const top = new T.ConeGeometry(crownW / 2, crownH * 0.6, 7);
            top.translate(0, trunkH + crownH * 0.3, 0);
            parts.push(top);
          } else {
            const crown = new T.SphereGeometry(crownW / 2, 7, 5);
            crown.translate(0, trunkH + (crownW / 2) * 0.8, 0);
            parts.push(crown);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 32, createGeometry: (T = THREE) => { const trunkH = h * 0.35;
          const trunk = new T.CylinderGeometry(trunkR * 0.9, trunkR, trunkH, 5);
          trunk.translate(0, trunkH / 2, 0);
          const canopy = new T.ConeGeometry(crownW / 2, h - trunkH, 6);
          canopy.translate(0, trunkH + (h - trunkH) / 2, 0);
          return mergeGeometries([trunk, canopy], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(crownW, h, crownW);
          b.translate(0, h / 2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * Person Family: person(build, pose, palette)
 * @param {"adult"|"child"|"tall"} build
 * @param {"standing"|"sitting"|"walking"} pose
 * @param {"casual"|"formal"|"worker"|"beach"} palette
 */
export function person(build = "adult", pose = "standing", palette = "casual") {
  const heightScale = build === "child" ? 0.65 : build === "tall" ? 1.1 : 1.0;
  const h = (pose === "sitting" ? 1.15 : 1.78) * heightScale;
  const footW = 0.45 * heightScale;
  const footD = (pose === "sitting" ? 0.65 : 0.45) * heightScale;

  return {
    id: `person-${build}-${pose}-${palette}`,
    kind: "soft",
    family: "person",
    build,
    pose,
    palette,
    footprint: { w: Number(footW.toFixed(2)), d: Number(footD.toFixed(2)) },
    height: Number(h.toFixed(2)),
    clearance: 0,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "beach", "open", "plot"],
    anchors: { eye: [0, h * 0.9, 0] },
    lod: [
      {
        level: 0,
        tris: 66, createGeometry: (T = THREE) => { const parts = []; if (pose === 'sitting') {
            const seatLegs = new T.BoxGeometry(0.3 * heightScale, 0.45 * heightScale, 0.4 * heightScale);
            seatLegs.translate(0, 0.225 * heightScale, 0.1 * heightScale);
            const torso = new T.BoxGeometry(0.32 * heightScale, 0.55 * heightScale, 0.22 * heightScale);
            torso.translate(0, 0.725 * heightScale, -0.05 * heightScale);
            const head = new T.SphereGeometry(0.12 * heightScale, 5, 4);
            head.translate(0, 1.05 * heightScale, -0.05 * heightScale);
            parts.push(seatLegs, torso, head);
          } else {
            const bodyH = h * 0.62;
            const body = new T.CylinderGeometry(0.16 * heightScale, 0.14 * heightScale, bodyH, 6);
            body.translate(0, bodyH / 2 + 0.3 * heightScale, 0);
            const legs = new T.BoxGeometry(0.24 * heightScale, 0.6 * heightScale, 0.18 * heightScale);
            legs.translate(0, 0.3 * heightScale, 0);
            const head = new T.SphereGeometry(0.13 * heightScale, 5, 4);
            head.translate(0, h - 0.14 * heightScale, 0);
            parts.push(body, legs, head);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 20, createGeometry: (T = THREE) => { const cyl = new T.CylinderGeometry(0.18 * heightScale, 0.18 * heightScale, h, 5);
          cyl.translate(0, h / 2, 0);
          return cyl;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(footW, h, footD);
          b.translate(0, h / 2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * Vehicle Family: vehicle(class, variant)
 * @param {"car"|"van"|"bus"|"truck"|"artic"|"taxi"|"emergency"|"bicycle"|"motorcycle"} vehicleClass
 * @param {string} variant
 */
export function vehicle(vehicleClass = "car", variant = "sedan") {
  const specs = {
    car: { w: 1.9, d: 4.4, h: 1.45, tris: 68 },
    van: { w: 2.1, d: 5.4, h: 2.2, tris: 56 },
    bus: { w: 2.6, d: 12.0, h: 3.2, tris: 72 },
    truck: { w: 2.5, d: 8.5, h: 3.4, tris: 64 },
    artic: { w: 2.6, d: 16.5, h: 4.0, tris: 88 },
    taxi: { w: 1.9, d: 4.5, h: 1.5, tris: 72 },
    emergency: { w: 2.2, d: 6.2, h: 2.6, tris: 76 },
    bicycle: { w: 0.55, d: 1.75, h: 1.05, tris: 38 },
    motorcycle: { w: 0.8, d: 2.2, h: 1.25, tris: 48 },
  };
  const sp = specs[vehicleClass] || specs.car;

  return {
    id: `vehicle-${vehicleClass}-${variant}`,
    kind: "hard",
    family: "vehicle",
    vehicleClass,
    variant,
    footprint: { w: sp.w, d: sp.d },
    height: sp.h,
    clearance: vehicleClass === "bicycle" ? 0.1 : 0.3,
    origin: "base-centre",
    standsOn: vehicleClass === "bicycle" ? ["carriageway", "parking", "sidewalk", "open"] : ["carriageway", "parking", "open"],
    lod: [
      {
        level: 0,
        tris: sp.tris,
        createGeometry: (T = THREE) => {
          const parts = [];
          if (vehicleClass === "bicycle" || vehicleClass === "motorcycle") {
            const frame = new T.BoxGeometry(sp.w, sp.h * 0.8, sp.d * 0.85);
            frame.translate(0, sp.h * 0.45, 0);
            parts.push(frame);
          } else {
            const lowerH = sp.h * 0.45;
            const lower = new T.BoxGeometry(sp.w, lowerH, sp.d);
            lower.translate(0, lowerH / 2 + 0.15, 0);
            parts.push(lower);

            const cabinH = sp.h * 0.5;
            const cabinL = sp.d * (vehicleClass === "bus" ? 0.92 : vehicleClass === "van" ? 0.75 : 0.55);
            const cabin = new T.BoxGeometry(sp.w * 0.92, cabinH, cabinL);
            cabin.translate(0, lowerH + cabinH / 2 + 0.1, vehicleClass === "bus" ? 0 : -sp.d * 0.08);
            parts.push(cabin);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(sp.w, sp.h, sp.d);
          b.translate(0, sp.h / 2, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(sp.w, sp.h, sp.d);
          b.translate(0, sp.h / 2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * Vessel Family: vessel(class)
 * @param {"rowboat"|"sailboat"|"yacht"|"ferry"|"container-ship"|"tug"} vesselClass
 */
export function vessel(vesselClass = "yacht") {
  const specs = {
    rowboat: { w: 1.4, d: 3.8, h: 0.9, tris: 32 },
    sailboat: { w: 3.0, d: 9.2, h: 11.5, sweepW: 3.2, tris: 54 },
    yacht: { w: 3.6, d: 14.5, h: 4.8, tris: 68 },
    ferry: { w: 8.5, d: 32.0, h: 7.5, tris: 84 },
    "container-ship": { w: 18.0, d: 85.0, h: 16.0, tris: 120 },
    tug: { w: 4.8, d: 16.0, h: 5.5, tris: 62 },
  };
  const sp = specs[vesselClass] || specs.yacht;

  return {
    id: `vessel-${vesselClass}`,
    kind: "hard",
    family: "vessel",
    vesselClass,
    footprint: { w: sp.w, d: sp.d },
    sweep: sp.sweepW ? { w: sp.sweepW, d: sp.d } : { w: sp.w, d: sp.d },
    height: sp.h,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["water"],
    lod: [
      {
        level: 0,
        tris: sp.tris,
        createGeometry: (T = THREE) => {
          const hullH = sp.h * 0.4;
          const hull = new T.BoxGeometry(sp.w, hullH, sp.d);
          hull.translate(0, hullH / 2, 0);
          const parts = [hull];
          if (vesselClass === "sailboat") {
            const mast = new T.CylinderGeometry(0.08, 0.12, sp.h * 0.75, 5);
            mast.translate(0, sp.h * 0.55, 0);
            parts.push(mast);
          } else {
            const cabinH = sp.h * 0.5;
            const cabin = new T.BoxGeometry(sp.w * 0.75, cabinH, sp.d * 0.45);
            cabin.translate(0, hullH + cabinH / 2, -sp.d * 0.1);
            parts.push(cabin);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(sp.w, sp.h, sp.d);
          b.translate(0, sp.h / 2, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(sp.w, sp.h, sp.d);
          b.translate(0, sp.h / 2, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * Aircraft Family: aircraft(class)
 * @param {"light-single"|"airliner-twin"|"regional-jet"|"helicopter"} aircraftClass
 */
export function aircraft(aircraftClass = "light-single") {
  const specs = {
    "light-single": { w: 10.8, d: 8.2, h: 2.7, tris: 62 },
    "airliner-twin": { w: 34.0, d: 37.5, h: 11.8, tris: 110 },
    "regional-jet": { w: 26.0, d: 29.5, h: 8.2, tris: 88 },
    helicopter: { w: 12.0, d: 13.5, h: 3.8, tris: 74 },
  };
  const sp = specs[aircraftClass] || specs["light-single"];

  return {
    id: `aircraft-${aircraftClass}`,
    kind: "hard",
    family: "aircraft",
    aircraftClass,
    footprint: { w: sp.w, d: sp.d },
    height: sp.h,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["open", "plot"],
    lod: [
      {
        level: 0,
        tris: sp.tris,
        createGeometry: (T = THREE) => {
          const fuseW = sp.w * 0.14;
          const fuseH = sp.h * 0.35;
          const fuse = new T.BoxGeometry(fuseW, fuseH, sp.d);
          fuse.translate(0, sp.h * 0.45, 0);
          const wingW = sp.w;
          const wing = new T.BoxGeometry(wingW, 0.25, sp.d * 0.22);
          wing.translate(0, sp.h * 0.45, 0);
          return mergeGeometries([fuse, wing], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(sp.w, sp.h, sp.d);
          b.translate(0, sp.h / 2, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(sp.w, sp.h, sp.d);
          b.translate(0, sp.h / 2, 0);
          return b;
        },
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// STATIC PROPS REGISTRY (Manifest Backed, Roof Clutter, Street & Airport)
// -----------------------------------------------------------------------------

export const MODELS = {
  // --- BENCHES ---
  "bench-slat": {
    id: "bench-slat",
    kind: PROPS.bench.kind,
    footprint: { w: PROPS.bench.foot.w, d: 0.6 },
    height: 0.9,
    clearance: PROPS.bench.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "verge", "open"],
    anchors: { seat: [0, 0.45, 0] },
    lod: [
      {
        level: 0, tris: 84,
        createGeometry: (T = THREE) => {
          const parts = [];
          for (const lx of [-0.75, 0.75]) {
            const leg = new T.BoxGeometry(0.08, 0.45, 0.52);
            leg.translate(lx, 0.225, 0);
            const backPost = new T.BoxGeometry(0.08, 0.48, 0.08);
            backPost.translate(lx, 0.65, -0.22);
            parts.push(leg, backPost);
          }
          const seatPlank1 = new T.BoxGeometry(1.78, 0.04, 0.22);
          seatPlank1.translate(0, 0.45, -0.1);
          const seatPlank2 = new T.BoxGeometry(1.78, 0.04, 0.22);
          seatPlank2.translate(0, 0.45, 0.14);
          const backPlank = new T.BoxGeometry(1.78, 0.22, 0.04);
          backPlank.translate(0, 0.74, -0.24);
          parts.push(seatPlank1, seatPlank2, backPlank);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 24,
        createGeometry: (T = THREE) => {
          const seat = new T.BoxGeometry(1.8, 0.45, 0.5);
          seat.translate(0, 0.225, 0.05);
          const back = new T.BoxGeometry(1.8, 0.45, 0.1);
          back.translate(0, 0.675, -0.25);
          return mergeGeometries([seat, back], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 0.9, 0.6);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  },

  "bench-backless": {
    id: "bench-backless",
    manifestKey: "bench",
    kind: PROPS.bench.kind,
    footprint: { w: PROPS.bench.foot.w, d: PROPS.bench.foot.d },
    height: PROPS.bench.h,
    clearance: PROPS.bench.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "verge", "open"],
    anchors: { seat: [0, 0.45, 0] },
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const p1 = new T.BoxGeometry(0.25, 0.36, 0.48);
          p1.translate(-0.65, 0.18, 0);
          const p2 = new T.BoxGeometry(0.25, 0.36, 0.48);
          p2.translate(0.65, 0.18, 0);
          const top = new T.BoxGeometry(1.8, 0.09, 0.55);
          top.translate(0, 0.405, 0);
          return mergeGeometries([p1, p2, top], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 0.45, 0.55);
          b.translate(0, 0.225, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 0.45, 0.55);
          b.translate(0, 0.225, 0);
          return b;
        },
      },
    ],
  },

  // --- LITTER BINS ---
  "bin-round": {
    id: "bin-round",
    manifestKey: "bin",
    kind: PROPS.bin.kind,
    footprint: { w: PROPS.bin.foot.w, d: PROPS.bin.foot.d },
    height: PROPS.bin.h,
    clearance: PROPS.bin.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "verge", "open"],
    anchors: { opening: [0, 0.75, 0] },
    lod: [
      {
        level: 0, tris: 96,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(0.28, 0.31, 0.15, 8);
          base.translate(0, 0.075, 0);
          const body = new T.CylinderGeometry(0.31, 0.28, 0.65, 8);
          body.translate(0, 0.475, 0);
          const hood = new T.CylinderGeometry(0.32, 0.32, 0.2, 8);
          hood.translate(0, 0.9, 0);
          return mergeGeometries([base, body, hood], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const cyl = new T.CylinderGeometry(0.32, 0.28, 1.0, 6);
          cyl.translate(0, 0.5, 0);
          return cyl;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.64, 1.0, 0.64);
          b.translate(0, 0.5, 0);
          return b;
        },
      },
    ],
  },

  "bin-post": {
    id: "bin-post",
    kind: PROPS.bin.kind,
    footprint: { w: 0.45, d: 0.45 },
    height: 0.95,
    clearance: PROPS.bin.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "verge", "open"],
    lod: [
      {
        level: 0, tris: 48,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.04, 0.04, 0.95, 6);
          post.translate(0, 0.475, 0);
          const drum = new T.CylinderGeometry(0.18, 0.16, 0.45, 6);
          drum.translate(0, 0.62, 0.05);
          return mergeGeometries([post, drum], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.CylinderGeometry(0.2, 0.2, 0.95, 6);
          b.translate(0, 0.475, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 0.95, 0.4);
          b.translate(0, 0.475, 0);
          return b;
        },
      },
    ],
  },

  // --- TRANSIT SHELTERS ---
  "bus-shelter": {
    id: "bus-shelter",
    manifestKey: "busShelter",
    kind: PROPS.busShelter.kind,
    footprint: { w: PROPS.busShelter.foot.w, d: PROPS.busShelter.foot.d },
    height: PROPS.busShelter.h,
    clearance: PROPS.busShelter.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "open"],
    anchors: { bench: [0, 0.45, 0.2] },
    lod: [
      {
        level: 0, tris: 72,
        createGeometry: (T = THREE) => {
          const parts = [];
          for (const px of [-1.65, 0, 1.65]) {
            const post = new T.BoxGeometry(0.1, 2.45, 0.1);
            post.translate(px, 1.225, -0.6);
            parts.push(post);
          }
          const roof = new T.BoxGeometry(3.6, 0.1, 1.4);
          roof.translate(0, 2.45, 0);
          parts.push(roof);
          const glassBack = new T.BoxGeometry(3.4, 2.1, 0.05);
          glassBack.translate(0, 1.2, -0.6);
          parts.push(glassBack);
          const bench = new T.BoxGeometry(2.4, 0.45, 0.35);
          bench.translate(0, 0.225, -0.3);
          parts.push(bench);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 24,
        createGeometry: (T = THREE) => {
          const roof = new T.BoxGeometry(3.6, 0.12, 1.4);
          roof.translate(0, 2.44, 0);
          const wall = new T.BoxGeometry(3.5, 2.4, 0.1);
          wall.translate(0, 1.2, -0.6);
          return mergeGeometries([roof, wall], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.6, 2.5, 1.4);
          b.translate(0, 1.25, 0);
          return b;
        },
      },
    ],
  },

  // --- LIGHTING ---
  "lamp-street": {
    id: "lamp-street",
    manifestKey: "lampPost",
    kind: PROPS.lampPost.kind,
    footprint: { w: PROPS.lampPost.foot.w, d: PROPS.lampPost.foot.d },
    sweep: { w: PROPS.lampPost.sweep.w, d: PROPS.lampPost.sweep.d },
    height: 9.35,
    clearance: PROPS.lampPost.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    anchors: { light: [0.55, 8.85, 0] },
    lod: [
      {
        level: 0, tris: 48,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.14, 0.28, 8.5, 6);
          post.translate(0, 4.25, 0);
          const arm = new T.BoxGeometry(0.5, 0.12, 0.12);
          arm.translate(0.25, 8.8, 0);
          const head = new T.BoxGeometry(0.4, 0.22, 0.3);
          head.translate(0.55, 8.85, 0);
          return mergeGeometries([post, arm, head], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.18, 0.28, 8.6, 5);
          post.translate(0, 4.3, 0);
          const head = new T.BoxGeometry(0.7, 0.3, 0.3);
          head.translate(0.35, 8.95, 0);
          return mergeGeometries([post, head], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 9.1, 0.6);
          b.translate(0, 4.55, 0);
          return b;
        },
      },
    ],
  },

  "lamp-pedestrian": {
    id: "lamp-pedestrian",
    kind: "hard",
    footprint: { w: 0.5, d: 0.5 },
    height: 4.2,
    clearance: 0.25,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "verge", "open"],
    anchors: { light: [0, 4.0, 0] },
    lod: [
      {
        level: 0, tris: 72,
        createGeometry: (T = THREE) => {
          const base = new T.CylinderGeometry(0.18, 0.24, 0.6, 6);
          base.translate(0, 0.3, 0);
          const shaft = new T.CylinderGeometry(0.08, 0.12, 3.2, 6);
          shaft.translate(0, 2.2, 0);
          const globe = new T.CylinderGeometry(0.22, 0.18, 0.4, 6);
          globe.translate(0, 4.0, 0);
          return mergeGeometries([base, shaft, globe], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const shaft = new T.CylinderGeometry(0.1, 0.18, 4.2, 5);
          shaft.translate(0, 2.1, 0);
          return shaft;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.45, 4.2, 0.45);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  },

  // --- ROOF CLUTTER ---
  "roof-plant": {
    id: "roof-plant",
    kind: "hard",
    footprint: { w: 3.2, d: 2.4 },
    height: 1.8,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 76,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(3.2, 1.4, 2.4);
          body.translate(0, 0.7, 0);
          const fan1 = new T.CylinderGeometry(0.5, 0.5, 0.3, 8);
          fan1.translate(-0.8, 1.55, 0);
          const fan2 = new T.CylinderGeometry(0.5, 0.5, 0.3, 8);
          fan2.translate(0.8, 1.55, 0);
          return mergeGeometries([body, fan1, fan2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 1.8, 2.4);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 1.8, 2.4);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  },

  "chimney": {
    id: "chimney",
    kind: "hard",
    footprint: { w: 0.8, d: 0.8 },
    height: 1.6,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 60,
        createGeometry: (T = THREE) => {
          const stack = new T.BoxGeometry(0.75, 1.25, 0.75);
          stack.translate(0, 0.625, 0);
          const pot1 = new T.CylinderGeometry(0.12, 0.14, 0.35, 6);
          pot1.translate(-0.18, 1.425, 0);
          const pot2 = new T.CylinderGeometry(0.12, 0.14, 0.35, 6);
          pot2.translate(0.18, 1.425, 0);
          return mergeGeometries([stack, pot1, pot2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const stack = new T.BoxGeometry(0.8, 1.6, 0.8);
          stack.translate(0, 0.8, 0);
          return stack;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const stack = new T.BoxGeometry(0.8, 1.6, 0.8);
          stack.translate(0, 0.8, 0);
          return stack;
        },
      },
    ],
  },

  "aerial": {
    id: "aerial",
    kind: "hard",
    footprint: { w: 0.4, d: 0.4 },
    sweep: { w: 1.6, d: 0.8 },
    height: 3.6,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 48,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.04, 0.05, 3.6, 6);
          mast.translate(0, 1.8, 0);
          const cross1 = new T.BoxGeometry(1.5, 0.04, 0.04);
          cross1.translate(0, 3.2, 0);
          const cross2 = new T.BoxGeometry(1.1, 0.04, 0.04);
          cross2.translate(0, 2.7, 0);
          return mergeGeometries([mast, cross1, cross2], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.06, 0.06, 3.6, 5);
          mast.translate(0, 1.8, 0);
          return mast;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 3.6, 0.4);
          b.translate(0, 1.8, 0);
          return b;
        },
      },
    ],
  },

  "satellite-dish": {
    id: "satellite-dish",
    kind: "hard",
    footprint: { w: 0.6, d: 0.6 },
    sweep: { w: 1.2, d: 1.4 },
    height: 1.4,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    sweep: { w: 1.2, d: 1.4 },
    height: 1.4,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 64,
        createGeometry: (T = THREE) => {
          const bracket = new T.CylinderGeometry(0.04, 0.04, 0.9, 6);
          bracket.translate(0, 0.45, 0);
          const dish = new T.CylinderGeometry(0.55, 0.05, 0.15, 10);
          dish.rotateX(Math.PI / 4);
          dish.translate(0, 0.95, 0.2);
          return mergeGeometries([bracket, dish], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 1.4, 0.8);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 1.4, 0.6);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  },

  "solar-panel": {
    id: "solar-panel",
    kind: "hard",
    footprint: { w: 2.2, d: 1.8 },
    height: 0.95,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const stand = new T.BoxGeometry(1.8, 0.35, 1.4);
          stand.translate(0, 0.175, 0);
          const panel = new T.BoxGeometry(2.15, 0.08, 1.75);
          panel.rotateX(0.4);
          panel.translate(0, 0.55, 0);
          return mergeGeometries([stand, panel], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 0.95, 1.8);
          b.translate(0, 0.475, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.2, 0.95, 1.8);
          b.translate(0, 0.475, 0);
          return b;
        },
      },
    ],
  },

  "ac-unit": {
    id: "ac-unit",
    kind: "hard",
    footprint: { w: 0.9, d: 0.45 },
    height: 0.75,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 44,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(0.88, 0.65, 0.42);
          body.translate(0, 0.325, 0);
          const fan = new T.CylinderGeometry(0.2, 0.2, 0.05, 8);
          fan.rotateX(Math.PI / 2);
          fan.translate(0.18, 0.325, 0.22);
          return mergeGeometries([body, fan], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.9, 0.75, 0.45);
          b.translate(0, 0.375, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.9, 0.75, 0.45);
          b.translate(0, 0.375, 0);
          return b;
        },
      },
    ],
  },

  // --- STREET DETAILS & FURNITURE ---
  "traffic-light": {
    id: "traffic-light",
    kind: "hard",
    footprint: { w: 0.4, d: 0.4 },
    sweep: { w: 0.9, d: 0.5 },
    height: 4.2,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.1, 0.12, 4.0, 6);
          post.translate(0, 2.0, 0);
          const head = new T.BoxGeometry(0.35, 1.1, 0.3);
          head.translate(0.2, 3.5, 0);
          return mergeGeometries([post, head], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 4.2, 0.4);
          b.translate(0.1, 2.1, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 4.2, 0.4);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  },

  "sign-warning": {
    id: "sign-warning",
    kind: "hard",
    footprint: { w: 0.3, d: 0.3 },
    sweep: { w: 0.7, d: 0.3 },
    height: 2.4,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.04, 0.04, 2.4, 6);
          pole.translate(0, 1.2, 0);
          const plate = new T.CylinderGeometry(0.32, 0.32, 0.03, 3);
          plate.rotateX(Math.PI / 2);
          plate.translate(0, 2.05, 0);
          return mergeGeometries([pole, plate], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.05, 0.05, 2.4, 5);
          pole.translate(0, 1.2, 0);
          return pole;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 2.4, 0.3);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  },

  "sign-wayfinding": {
    id: "sign-wayfinding",
    kind: "hard",
    footprint: { w: 0.3, d: 0.3 },
    sweep: { w: 1.2, d: 0.4 },
    height: 2.8,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "open"],
    lod: [
      {
        level: 0, tris: 48,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.05, 0.05, 2.8, 6);
          post.translate(0, 1.4, 0);
          const blade1 = new T.BoxGeometry(0.65, 0.18, 0.03);
          blade1.translate(0.3, 2.5, 0);
          const blade2 = new T.BoxGeometry(0.65, 0.18, 0.03);
          blade2.translate(-0.3, 2.2, 0);
          return mergeGeometries([post, blade1, blade2], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.06, 0.06, 2.8, 5);
          post.translate(0, 1.4, 0);
          return post;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 2.8, 0.3);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  },

  "utility-cabinet-telecom": {
    id: "utility-cabinet-telecom",
    kind: "hard",
    footprint: { w: 1.1, d: 0.45 },
    height: 1.3,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(1.08, 1.25, 0.42);
          body.translate(0, 0.625, 0);
          const top = new T.BoxGeometry(1.1, 0.05, 0.45);
          top.translate(0, 1.275, 0);
          return mergeGeometries([body, top], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.1, 1.3, 0.45);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.1, 1.3, 0.45);
          b.translate(0, 0.65, 0);
          return b;
        },
      },
    ],
  },

  "utility-cabinet-power": {
    id: "utility-cabinet-power",
    kind: "hard",
    footprint: { w: 1.6, d: 0.9 },
    height: 1.5,
    clearance: 0.3,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(1.58, 0.2, 0.88);
          plinth.translate(0, 0.1, 0);
          const body = new T.BoxGeometry(1.5, 1.3, 0.8);
          body.translate(0, 0.85, 0);
          return mergeGeometries([plinth, body], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 1.5, 0.9);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.6, 1.5, 0.9);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  },

  "manhole": {
    id: "manhole",
    kind: "hard",
    footprint: { w: 0.75, d: 0.75 },
    height: 0.05,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["carriageway", "sidewalk", "parking", "open"],
    lod: [
      {
        level: 0, tris: 40,
        createGeometry: (T = THREE) => {
          const cover = new T.CylinderGeometry(0.36, 0.36, 0.04, 10);
          cover.translate(0, 0.02, 0);
          return cover;
        },
      },
      {
        level: 1, tris: 24,
        createGeometry: (T = THREE) => {
          const cover = new T.CylinderGeometry(0.36, 0.36, 0.04, 6);
          cover.translate(0, 0.02, 0);
          return cover;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.75, 0.04, 0.75);
          b.translate(0, 0.02, 0);
          return b;
        },
      },
    ],
  },

  "drain-grating": {
    id: "drain-grating",
    kind: "hard",
    footprint: { w: 0.6, d: 0.4 },
    height: 0.05,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["carriageway", "parking", "open"],
    lod: [
      {
        level: 0, tris: 12,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(0.58, 0.04, 0.38);
          frame.translate(0, 0.02, 0);
          return frame;
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.04, 0.4);
          b.translate(0, 0.02, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.6, 0.04, 0.4);
          b.translate(0, 0.02, 0);
          return b;
        },
      },
    ],
  },

  "market-stall": {
    id: "market-stall",
    kind: "hard",
    footprint: { w: 2.8, d: 2.2 },
    sweep: { w: 3.2, d: 2.6 },
    height: 2.6,
    clearance: 0.3,
    origin: "base-centre",
    standsOn: ["sidewalk", "plot", "open"],
    lod: [
      {
        level: 0, tris: 20,
        createGeometry: (T = THREE) => {
          const table = new T.BoxGeometry(2.6, 0.85, 1.8);
          table.translate(0, 0.425, 0);
          const canopy = new T.ConeGeometry(1.75, 0.7, 4);
          canopy.rotateY(Math.PI / 4);
          canopy.translate(0, 2.25, 0);
          return mergeGeometries([table, canopy], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 2.6, 2.2);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 2.6, 2.2);
          b.translate(0, 1.3, 0);
          return b;
        },
      },
    ],
  },

  "playground-slide": {
    id: "playground-slide",
    kind: "hard",
    footprint: { w: 3.4, d: 1.2 },
    height: 2.4,
    clearance: 0.8,
    origin: "base-centre",
    standsOn: ["park", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const tower = new T.BoxGeometry(1.0, 1.6, 1.0);
          tower.translate(-1.1, 0.8, 0);
          const chute = new T.BoxGeometry(2.4, 0.15, 0.6);
          chute.rotateZ(-0.55);
          chute.translate(0.5, 0.85, 0);
          return mergeGeometries([tower, chute], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.4, 2.4, 1.2);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.4, 2.4, 1.2);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  },

  "playground-swings": {
    id: "playground-swings",
    kind: "hard",
    footprint: { w: 4.4, d: 2.2 },
    height: 2.8,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["park", "open"],
    height: 2.8,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["park", "open"],
    lod: [
      {
        level: 0, tris: 108,
        createGeometry: (T = THREE) => {
          const topBar = new T.BoxGeometry(3.6, 0.1, 0.1);
          topBar.translate(0, 2.75, 0);
          const parts = [topBar];
          for (const sx of [-1.75, 1.75]) {
            const leg1 = new T.CylinderGeometry(0.05, 0.05, 2.8, 6);
            leg1.rotateZ(0.25 * Math.sign(sx));
            leg1.translate(sx, 1.4, -0.6);
            const leg2 = new T.CylinderGeometry(0.05, 0.05, 2.8, 6);
            leg2.rotateZ(0.25 * Math.sign(sx));
            leg2.translate(sx, 1.4, 0.6);
            parts.push(leg1, leg2);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.6, 2.8, 2.2);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.6, 2.8, 2.2);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  },

  "fountain": {
    id: "fountain",
    kind: "hard",
    footprint: { w: 4.2, d: 4.2 },
    height: 2.8,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["park", "sidewalk", "plot", "open"],
    lod: [
      {
        level: 0, tris: 184,
        createGeometry: (T = THREE) => {
          const basin = new T.CylinderGeometry(2.05, 2.05, 0.5, 14);
          basin.translate(0, 0.25, 0);
          const pedestal = new T.CylinderGeometry(0.5, 0.6, 1.4, 8);
          pedestal.translate(0, 1.1, 0);
          const upperBasin = new T.CylinderGeometry(1.1, 1.1, 0.35, 10);
          upperBasin.translate(0, 1.9, 0);
          const topFinial = new T.SphereGeometry(0.35, 7, 5);
          topFinial.translate(0, 2.45, 0);
          return mergeGeometries([basin, pedestal, upperBasin, topFinial], T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const basin = new T.CylinderGeometry(2.1, 2.1, 0.6, 8);
          basin.translate(0, 0.3, 0);
          const core = new T.CylinderGeometry(0.8, 0.8, 2.2, 8);
          core.translate(0, 1.7, 0);
          return mergeGeometries([basin, core], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.2, 2.8, 4.2);
          b.translate(0, 1.4, 0);
          return b;
        },
      },
    ],
  },

  "statue": {
    id: "statue",
    kind: "hard",
    footprint: { w: 1.8, d: 1.8 },
    height: 4.2,
    clearance: 0.4,
    origin: "base-centre",
    standsOn: ["park", "sidewalk", "plot", "open"],
    lod: [
      {
        level: 0, tris: 88,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(1.75, 1.8, 1.75);
          plinth.translate(0, 0.9, 0);
          const torso = new T.CylinderGeometry(0.35, 0.3, 1.4, 7);
          torso.translate(0, 2.5, 0);
          const head = new T.SphereGeometry(0.24, 6, 5);
          head.translate(0, 3.5, 0);
          return mergeGeometries([plinth, torso, head], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const plinth = new T.BoxGeometry(1.8, 2.0, 1.8);
          plinth.translate(0, 1.0, 0);
          const figure = new T.CylinderGeometry(0.4, 0.4, 2.2, 6);
          figure.translate(0, 3.1, 0);
          return mergeGeometries([plinth, figure], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.8, 4.2, 1.8);
          b.translate(0, 2.1, 0);
          return b;
        },
      },
    ],
  },

  "flagpole": {
    id: "flagpole",
    kind: "hard",
    footprint: { w: 0.5, d: 0.5 },
    sweep: { w: 3.4, d: 0.5 },
    height: 9.5,
    clearance: 0.3,
    origin: "base-centre",
    standsOn: ["plot", "park", "sidewalk", "open"],
    sweep: { w: 3.4, d: 0.5 },
    height: 9.5,
    clearance: 0.3,
    origin: "base-centre",
    standsOn: ["plot", "park", "sidewalk", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.06, 0.12, 9.4, 6);
          mast.translate(0, 4.7, 0);
          const flag = new T.BoxGeometry(1.6, 0.9, 0.02);
          flag.translate(0.85, 8.8, 0);
          return mergeGeometries([mast, flag], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.08, 0.14, 9.5, 5);
          mast.translate(0, 4.75, 0);
          return mast;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 9.5, 0.5);
          b.translate(0, 4.75, 0);
          return b;
        },
      },
    ],
  },

  // --- BOUNDARIES, WALLS & GATES ---
  "fence-iron": {
    id: "fence-iron",
    kind: "hard",
    footprint: { w: 2.4, d: 0.2 },
    height: 1.6,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "park", "verge", "open"],
    lod: [
      {
        level: 0,
        tris: 232,
        createGeometry: (T = THREE) => {
          const parts = [];
          const base = new T.BoxGeometry(2.4, 0.15, 0.18);
          base.translate(0, 0.075, 0);
          parts.push(base);
          for (let x = -1.1; x <= 1.1; x += 0.22) {
            const bar = new T.CylinderGeometry(0.015, 0.015, 1.45, 5);
            bar.translate(x, 0.85, 0);
            parts.push(bar);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.6, 0.1);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.6, 0.2);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  },

  "fence-picket": {
    id: "fence-picket",
    kind: "hard",
    footprint: { w: 2.4, d: 0.15 },
    height: 1.1,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "park", "verge", "open"],
    lod: [
      {
        level: 0, tris: 144,
        createGeometry: (T = THREE) => {
          const rail1 = new T.BoxGeometry(2.4, 0.08, 0.06);
          rail1.translate(0, 0.35, 0);
          const rail2 = new T.BoxGeometry(2.4, 0.08, 0.06);
          rail2.translate(0, 0.8, 0);
          const parts = [rail1, rail2];
          for (let x = -1.1; x <= 1.1; x += 0.24) {
            const pale = new T.BoxGeometry(0.08, 1.05, 0.02);
            pale.translate(x, 0.525, 0.04);
            parts.push(pale);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.1, 0.1);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.1, 0.15);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  },

  "gate-iron": {
    id: "gate-iron",
    kind: "hard",
    footprint: { w: 2.0, d: 0.2 },
    height: 1.6,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["plot", "park", "sidewalk", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const parts = [];
          for (const sx of [-0.95, 0.95]) {
            const post = new T.BoxGeometry(0.12, 1.6, 0.16);
            post.translate(sx, 0.8, 0);
            parts.push(post);
          }
          const leaf = new T.BoxGeometry(1.7, 1.3, 0.06);
          leaf.translate(0, 0.8, 0);
          parts.push(leaf);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.6, 0.15);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.0, 1.6, 0.2);
          b.translate(0, 0.8, 0);
          return b;
        },
      },
    ],
  },

  "hedge": {
    id: "hedge",
    kind: "soft",
    footprint: { w: 2.4, d: 0.8 },
    height: 1.4,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "park", "verge", "open"],
    lod: [
      {
        level: 0, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.38, 1.38, 0.78);
          b.translate(0, 0.69, 0);
          return b;
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.4, 0.8);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.4, 0.8);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  },

  "wall-garden": {
    id: "wall-garden",
    kind: "hard",
    footprint: { w: 2.4, d: 0.35 },
    height: 1.5,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(2.4, 1.4, 0.32);
          wall.translate(0, 0.7, 0);
          const coping = new T.BoxGeometry(2.44, 0.1, 0.35);
          coping.translate(0, 1.45, 0);
          return mergeGeometries([wall, coping], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.5, 0.35);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.4, 1.5, 0.35);
          b.translate(0, 0.75, 0);
          return b;
        },
      },
    ],
  },

  // --- FACADE & BUILDING ELEMENTS ---
  "awning": {
    id: "awning",
    kind: "hard",
    footprint: { w: 3.6, d: 1.8 },
    height: 1.4,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "plot", "open"],
    lod: [
      {
        level: 0, tris: 12,
        createGeometry: (T = THREE) => {
          const canopy = new T.BoxGeometry(3.55, 0.08, 1.75);
          canopy.rotateX(-0.35);
          canopy.translate(0, 0.8, 0);
          return canopy;
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.6, 1.4, 1.8);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.6, 1.4, 1.8);
          b.translate(0, 0.7, 0);
          return b;
        },
      },
    ],
  },

  "shopfront": {
    id: "shopfront",
    kind: "hard",
    footprint: { w: 4.8, d: 0.6 },
    height: 3.2,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "plot", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const frame = new T.BoxGeometry(4.75, 3.15, 0.55);
          frame.translate(0, 1.575, 0);
          const fascia = new T.BoxGeometry(4.8, 0.5, 0.6);
          fascia.translate(0, 2.95, 0);
          return mergeGeometries([frame, fascia], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.8, 3.2, 0.6);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.8, 3.2, 0.6);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  },

  "shutters": {
    id: "shutters",
    kind: "hard",
    footprint: { w: 1.4, d: 0.15 },
    height: 1.8,
    clearance: 0.05,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const left = new T.BoxGeometry(0.65, 1.75, 0.08);
          left.translate(-0.35, 0.875, 0);
          const right = new T.BoxGeometry(0.65, 1.75, 0.08);
          right.translate(0.35, 0.875, 0);
          return mergeGeometries([left, right], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.8, 0.15);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 1.8, 0.15);
          b.translate(0, 0.9, 0);
          return b;
        },
      },
    ],
  },

  "balcony": {
    id: "balcony",
    kind: "hard",
    footprint: { w: 2.8, d: 1.2 },
    height: 1.1,
    clearance: 0.1,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(2.78, 0.15, 1.18);
          slab.translate(0, 0.075, 0);
          const rail = new T.BoxGeometry(2.78, 0.95, 0.06);
          rail.translate(0, 0.625, 0.55);
          return mergeGeometries([slab, rail], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 1.1, 1.2);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(2.8, 1.1, 1.2);
          b.translate(0, 0.55, 0);
          return b;
        },
      },
    ],
  },

  // --- AIRPORT SET ---
  "runway-module": {
    id: "runway-module",
    kind: "hard",
    footprint: { w: 45.0, d: 32.0 },
    height: 0.35,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(45.0, 0.25, 32.0);
          slab.translate(0, 0.125, 0);
          const stripe = new T.BoxGeometry(1.8, 0.08, 24.0);
          stripe.translate(0, 0.29, 0);
          return mergeGeometries([slab, stripe], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(45.0, 0.25, 32.0);
          slab.translate(0, 0.125, 0);
          return slab;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(45.0, 0.35, 32.0);
          b.translate(0, 0.175, 0);
          return b;
        },
      },
    ],
  },

  "taxiway-module": {
    id: "taxiway-module",
    kind: "hard",
    footprint: { w: 23.0, d: 24.0 },
    height: 0.35,
    clearance: 0.8,
    origin: "base-centre",
    standsOn: ["open"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(23.0, 0.25, 24.0);
          slab.translate(0, 0.125, 0);
          const stripe = new T.BoxGeometry(0.4, 0.08, 24.0);
          stripe.translate(0, 0.29, 0);
          return mergeGeometries([slab, stripe], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(23.0, 0.25, 24.0);
          slab.translate(0, 0.125, 0);
          return slab;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(23.0, 0.35, 24.0);
          b.translate(0, 0.175, 0);
          return b;
        },
      },
    ],
  },

  "apron-stand": {
    id: "apron-stand",
    kind: "hard",
    footprint: { w: 36.0, d: 36.0 },
    height: 0.35,
    clearance: 1.5,
    origin: "base-centre",
    standsOn: ["open", "plot"],
    lod: [
      {
        level: 0, tris: 24,
        createGeometry: (T = THREE) => {
          const apron = new T.BoxGeometry(36.0, 0.25, 36.0);
          apron.translate(0, 0.125, 0);
          const stopBar = new T.BoxGeometry(8.0, 0.08, 0.6);
          stopBar.translate(0, 0.29, 6.0);
          return mergeGeometries([apron, stopBar], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(36.0, 0.25, 36.0);
          b.translate(0, 0.125, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(36.0, 0.35, 36.0);
          b.translate(0, 0.175, 0);
          return b;
        },
      },
    ],
  },

  "jet-bridge": {
    id: "jet-bridge",
    kind: "hard",
    footprint: { w: 18.0, d: 3.6 },
    sweep: { w: 22.0, d: 4.2 },
    height: 6.8,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["open", "plot"],
    lod: [
      {
        level: 0, tris: 68,
        createGeometry: (T = THREE) => {
          const rotunda = new T.CylinderGeometry(1.8, 1.8, 5.2, 8);
          rotunda.translate(-8.0, 2.6, 0);
          const tunnel = new T.BoxGeometry(16.0, 2.8, 2.6);
          tunnel.translate(0, 4.2, 0);
          const cab = new T.BoxGeometry(3.6, 3.2, 3.6);
          cab.translate(8.0, 4.2, 0);
          const bogie = new T.BoxGeometry(1.6, 3.0, 3.2);
          bogie.translate(4.0, 1.5, 0);
          return mergeGeometries([rotunda, tunnel, cab, bogie], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const tunnel = new T.BoxGeometry(18.0, 3.0, 3.6);
          tunnel.translate(0, 4.2, 0);
          const leg = new T.BoxGeometry(2.0, 4.2, 2.0);
          leg.translate(-6.0, 2.1, 0);
          return mergeGeometries([tunnel, leg], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(18.0, 6.8, 3.6);
          b.translate(0, 3.4, 0);
          return b;
        },
      },
    ],
  },

  "blast-fence": {
    id: "blast-fence",
    kind: "hard",
    footprint: { w: 12.0, d: 2.0 },
    height: 3.2,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["open"],
    height: 3.2,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["open"],
    lod: [
      {
        level: 0, tris: 12,
        createGeometry: (T = THREE) => {
          const panel = new T.BoxGeometry(12.0, 3.4, 0.15);
          panel.rotateX(-0.55);
          panel.translate(0, 1.5, 0);
          return panel;
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 3.2, 1.8);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(12.0, 3.2, 1.8);
          b.translate(0, 1.6, 0);
          return b;
        },
      },
    ],
  },

  "approach-lighting": {
    id: "approach-lighting",
    kind: "hard",
    footprint: { w: 16.0, d: 0.8 },
    height: 4.5,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["open", "water"],
    lod: [
      {
        level: 0, tris: 84,
        createGeometry: (T = THREE) => {
          const crossbar = new T.BoxGeometry(16.0, 0.25, 0.4);
          crossbar.translate(0, 4.3, 0);
          const parts = [crossbar];
          for (const sx of [-6.0, 0, 6.0]) {
            const leg = new T.CylinderGeometry(0.12, 0.16, 4.3, 6);
            leg.translate(sx, 2.15, 0);
            parts.push(leg);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 24,
        createGeometry: (T = THREE) => {
          const crossbar = new T.BoxGeometry(16.0, 0.3, 0.4);
          crossbar.translate(0, 4.3, 0);
          const leg = new T.BoxGeometry(0.4, 4.3, 0.4);
          leg.translate(0, 2.15, 0);
          return mergeGeometries([crossbar, leg], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16.0, 4.5, 0.8);
          b.translate(0, 2.25, 0);
          return b;
        },
      },
    ],
  },

  "windsock": {
    id: "windsock",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    sweep: { w: 2.4, d: 1.2 },
    height: 4.8,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["open", "plot"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.06, 0.08, 4.5, 6);
          mast.translate(0, 2.25, 0);
          const sock = new T.ConeGeometry(0.3, 1.1, 6);
          sock.rotateZ(Math.PI / 2);
          sock.translate(0.55, 4.5, 0);
          return mergeGeometries([mast, sock], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const mast = new T.CylinderGeometry(0.1, 0.1, 4.8, 5);
          mast.translate(0, 2.4, 0);
          return mast;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 4.8, 1.2);
          b.translate(0, 2.4, 0);
          return b;
        },
      },
    ],
  },

  // --- MARITIME ---
  "quay-wall": {
    id: "quay-wall",
    kind: "hard",
    footprint: { w: 8.0, d: 2.4 },
    height: 4.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open", "water"],
    lod: [
      {
        level: 0, tris: 12,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(8.0, 4.0, 2.4);
          wall.translate(0, 2.0, 0);
          return wall;
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(8.0, 4.0, 2.4);
          wall.translate(0, 2.0, 0);
          return wall;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const wall = new T.BoxGeometry(8.0, 4.0, 2.4);
          wall.translate(0, 2.0, 0);
          return wall;
        },
      },
    ],
  },

  "jetty": {
    id: "jetty",
    kind: "hard",
    footprint: { w: 3.2, d: 16.0 },
    height: 2.2,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["water", "beach", "open"],
    lod: [
      {
        level: 0, tris: 156,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(3.2, 0.4, 16.0);
          deck.translate(0, 2.0, 0);
          const parts = [deck];
          for (const z of [-6, 0, 6]) {
            for (const x of [-1.2, 1.2]) {
              const pile = new T.CylinderGeometry(0.18, 0.18, 2.0, 6);
              pile.translate(x, 1.0, z);
              parts.push(pile);
            }
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 2.2, 16.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 2.2, 16.0);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  },

  "container": {
    id: "container",
    kind: PROPS.container.kind,
    footprint: { w: PROPS.container.foot.w, d: PROPS.container.foot.d },
    height: PROPS.container.h,
    clearance: PROPS.container.clear,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0, tris: 12,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(12.0, 2.6, 2.6);
          box.translate(0, 1.3, 0);
          return box;
        },
      },
      {
        level: 1, tris: 12,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(12.0, 2.6, 2.6);
          box.translate(0, 1.3, 0);
          return box;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const box = new T.BoxGeometry(12.0, 2.6, 2.6);
          box.translate(0, 1.3, 0);
          return box;
        },
      },
    ],
  },

  "mooring": {
    id: "mooring",
    kind: PROPS.mooring.kind,
    footprint: { w: PROPS.mooring.foot.w, d: PROPS.mooring.foot.d },
    height: PROPS.mooring.h,
    clearance: PROPS.mooring.clear,
    origin: "base-centre",
    standsOn: ["sidewalk", "open"],
    lod: [
      {
        level: 0, tris: 48,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.22, 0.28, 0.65, 6);
          post.translate(0, 0.325, 0);
          const cap = new T.CylinderGeometry(0.28, 0.22, 0.1, 6);
          cap.translate(0, 0.7, 0);
          return mergeGeometries([post, cap], T);
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const post = new T.CylinderGeometry(0.28, 0.28, 0.75, 5);
          post.translate(0, 0.375, 0);
          return post;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.56, 0.75, 0.56);
          b.translate(0, 0.375, 0);
          return b;
        },
      },
    ],
  },

  "beacon": {
    id: "beacon",
    kind: PROPS.beacon.kind,
    footprint: { w: PROPS.beacon.foot.w, d: PROPS.beacon.foot.d },
    height: PROPS.beacon.h,
    clearance: PROPS.beacon.clear,
    origin: "base-centre",
    standsOn: ["water", "rock", "open"],
    anchors: { light: [0, 8.8, 0] },
    lod: [
      {
        level: 0, tris: 88,
        createGeometry: (T = THREE) => {
          const tower = new T.CylinderGeometry(1.4, 2.0, 8.0, 8);
          tower.translate(0, 4.0, 0);
          const gallery = new T.CylinderGeometry(1.8, 1.8, 0.4, 8);
          gallery.translate(0, 8.2, 0);
          const lantern = new T.CylinderGeometry(0.8, 0.8, 0.8, 6);
          lantern.translate(0, 8.6, 0);
          return mergeGeometries([tower, gallery, lantern], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const tower = new T.CylinderGeometry(1.4, 2.0, 9.0, 6);
          tower.translate(0, 4.5, 0);
          return tower;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(4.0, 9.0, 4.0);
          b.translate(0, 4.5, 0);
          return b;
        },
      },
    ],
  },

  "parasol": {
    id: "parasol",
    kind: PROPS.parasol.kind,
    footprint: { w: 0.4, d: 0.4 },
    sweep: { w: 2.2, d: 2.2 },
    height: 2.2,
    clearance: PROPS.parasol.clear,
    origin: "base-centre",
    standsOn: ["beach", "park", "open"],
    lod: [
      {
        level: 0, tris: 40,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.03, 0.03, 2.1, 6);
          pole.translate(0, 1.05, 0);
          const canopy = new T.ConeGeometry(1.1, 0.4, 8);
          canopy.translate(0, 2.0, 0);
          return mergeGeometries([pole, canopy], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.04, 0.04, 2.2, 5);
          pole.translate(0, 1.1, 0);
          const canopy = new T.ConeGeometry(1.1, 0.4, 6);
          canopy.translate(0, 2.0, 0);
          return mergeGeometries([pole, canopy], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.4, 2.2, 0.4);
          b.translate(0, 1.1, 0);
          return b;
        },
      },
    ],
  },

  "rail-tie": {
    id: "rail-tie",
    kind: PROPS.railTie.kind,
    footprint: { w: PROPS.railTie.foot.w, d: PROPS.railTie.foot.d },
    height: PROPS.railTie.h,
    clearance: PROPS.railTie.clear,
    origin: "base-centre",
    standsOn: ["track", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const sleeper = new T.BoxGeometry(3.2, 0.22, 0.42);
          sleeper.translate(0, 0.11, 0);
          const r1 = new T.BoxGeometry(0.08, 0.13, 0.42);
          r1.translate(-0.7175, 0.285, 0);
          const r2 = new T.BoxGeometry(0.08, 0.13, 0.42);
          r2.translate(0.7175, 0.285, 0);
          return mergeGeometries([sleeper, r1, r2], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const sleeper = new T.BoxGeometry(3.2, 0.35, 0.42);
          sleeper.translate(0, 0.175, 0);
          return sleeper;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const sleeper = new T.BoxGeometry(3.2, 0.35, 0.42);
          sleeper.translate(0, 0.175, 0);
          return sleeper;
        },
      },
    ],
  },

  "mailbox": {
    id: "mailbox",
    kind: "hard",
    footprint: { w: 0.5, d: 0.5 },
    height: 1.2,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "open"],
    lod: [
      {
        level: 0, tris: 48,
        createGeometry: (T = THREE) => {
          const body = new T.CylinderGeometry(0.24, 0.24, 1.05, 8);
          body.translate(0, 0.525, 0);
          const cap = new T.ConeGeometry(0.25, 0.15, 8);
          cap.translate(0, 1.125, 0);
          return mergeGeometries([body, cap], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const body = new T.CylinderGeometry(0.24, 0.24, 1.2, 6);
          body.translate(0, 0.6, 0);
          return body;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.5, 1.2, 0.5);
          b.translate(0, 0.6, 0);
          return b;
        },
      },
    ],
  },

  "hydrant": {
    id: "hydrant",
    kind: "hard",
    footprint: { w: 0.4, d: 0.4 },
    height: 0.75,
    clearance: 0.3,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    lod: [
      {
        level: 0, tris: 68,
        createGeometry: (T = THREE) => {
          const barrel = new T.CylinderGeometry(0.14, 0.16, 0.65, 8);
          barrel.translate(0, 0.325, 0);
          const nozzle = new T.CylinderGeometry(0.07, 0.07, 0.38, 6);
          nozzle.rotateZ(Math.PI / 2);
          nozzle.translate(0, 0.45, 0);
          const bonnet = new T.ConeGeometry(0.15, 0.1, 6);
          bonnet.translate(0, 0.7, 0);
          return mergeGeometries([barrel, nozzle, bonnet], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const barrel = new T.CylinderGeometry(0.16, 0.18, 0.75, 6);
          barrel.translate(0, 0.375, 0);
          return barrel;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.35, 0.75, 0.35);
          b.translate(0, 0.375, 0);
          return b;
        },
      },
    ],
  },

  "bollard": {
    id: "bollard",
    kind: "hard",
    footprint: { w: 0.3, d: 0.3 },
    height: 0.9,
    clearance: 0.15,
    origin: "base-centre",
    standsOn: ["sidewalk", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const shaft = new T.CylinderGeometry(0.11, 0.13, 0.8, 6);
          shaft.translate(0, 0.4, 0);
          const cap = new T.ConeGeometry(0.12, 0.1, 6);
          cap.translate(0, 0.85, 0);
          return mergeGeometries([shaft, cap], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const shaft = new T.CylinderGeometry(0.13, 0.14, 0.9, 6);
          shaft.translate(0, 0.45, 0);
          return shaft;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.3, 0.9, 0.3);
          b.translate(0, 0.45, 0);
          return b;
        },
      },
    ],
  },

  "sign": {
    id: "sign",
    kind: "hard",
    footprint: { w: 0.3, d: 0.3 },
    sweep: { w: 0.8, d: 0.3 },
    height: 2.4,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "verge", "open"],
    lod: [
      {
        level: 0, tris: 36,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.04, 0.04, 2.4, 6);
          pole.translate(0, 1.2, 0);
          const blade = new T.BoxGeometry(0.76, 0.35, 0.04);
          blade.translate(0, 2.15, 0);
          return mergeGeometries([pole, blade], T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const pole = new T.CylinderGeometry(0.05, 0.05, 2.4, 5);
          pole.translate(0, 1.2, 0);
          const blade = new T.BoxGeometry(0.76, 0.35, 0.04);
          blade.translate(0, 2.15, 0);
          return mergeGeometries([pole, blade], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(0.8, 2.4, 0.3);
          b.translate(0, 1.2, 0);
          return b;
        },
      },
    ],
  },

  "planter": {
    id: "planter",
    kind: "hard",
    footprint: { w: 1.2, d: 1.2 },
    height: 0.85,
    clearance: 0.2,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "open"],
    lod: [
      {
        level: 0, tris: 44,
        createGeometry: (T = THREE) => {
          const pot = new T.CylinderGeometry(0.58, 0.44, 0.6, 8);
          pot.translate(0, 0.3, 0);
          const plant = new T.ConeGeometry(0.5, 0.35, 6);
          plant.translate(0, 0.65, 0);
          return mergeGeometries([pot, plant], T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const pot = new T.CylinderGeometry(0.58, 0.45, 0.65, 6);
          pot.translate(0, 0.325, 0);
          return pot;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.2, 0.65, 1.2);
          b.translate(0, 0.325, 0);
          return b;
        },
      },
    ],
  },

  "bike-rack": {
    id: "bike-rack",
    kind: "hard",
    footprint: { w: 1.0, d: 0.25 },
    height: 0.8,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "open"],
    lod: [
      {
        level: 0, tris: 72,
        createGeometry: (T = THREE) => {
          const leg1 = new T.CylinderGeometry(0.03, 0.03, 0.77, 6);
          leg1.translate(-0.45, 0.385, 0);
          const leg2 = new T.CylinderGeometry(0.03, 0.03, 0.77, 6);
          leg2.translate(0.45, 0.385, 0);
          const top = new T.CylinderGeometry(0.03, 0.03, 0.96, 6);
          top.rotateZ(Math.PI / 2);
          top.translate(0, 0.77, 0);
          return mergeGeometries([leg1, leg2, top], T);
        },
      },
      {
        level: 1,
        tris: 12,
        createGeometry: (T = THREE) => {
          const arch = new T.BoxGeometry(1.0, 0.8, 0.1);
          arch.translate(0, 0.4, 0);
          return arch;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.0, 0.8, 0.25);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  },

  "cafe-table": {
    id: "cafe-table",
    kind: "hard",
    footprint: { w: 1.4, d: 1.4 },
    height: 0.8,
    clearance: 0.3,
    origin: "base-centre",
    standsOn: ["sidewalk", "park", "plot", "open"],
    anchors: { tabletop: [0, 0.72, 0] },
    lod: [
      {
        level: 0, tris: 104,
        createGeometry: (T = THREE) => {
          const leg = new T.CylinderGeometry(0.04, 0.08, 0.7, 6);
          leg.translate(0, 0.35, 0);
          const top = new T.CylinderGeometry(0.42, 0.42, 0.04, 8);
          top.translate(0, 0.72, 0);
          const parts = [leg, top];
          for (const cx of [-0.52, 0.52]) {
            const seat = new T.BoxGeometry(0.34, 0.04, 0.34);
            seat.translate(cx, 0.46, 0);
            const back = new T.BoxGeometry(0.04, 0.34, 0.34);
            back.translate(cx + (cx < 0 ? -0.15 : 0.15), 0.63, 0);
            parts.push(seat, back);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1, tris: 24,
        createGeometry: (T = THREE) => {
          const table = new T.CylinderGeometry(0.45, 0.45, 0.75, 6);
          table.translate(0, 0.375, 0);
          return table;
        },
      },
      {
        level: 2, tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(1.4, 0.8, 1.4);
          b.translate(0, 0.4, 0);
          return b;
        },
      },
    ],
  },
};

// Add default family instances to MODELS registry
MODELS["tree"] = tree("broadleaf", "mature");
MODELS["tree-broadleaf-mature"] = MODELS["tree"];
MODELS["tree-conifer-mature"] = tree("conifer", "mature");
MODELS["tree-palm-mature"] = tree("palm", "mature");
MODELS["tree-cypress-mature"] = tree("cypress", "mature");

MODELS["person"] = person("adult", "standing", "casual");
MODELS["person-adult-standing"] = MODELS["person"];
MODELS["person-adult-sitting"] = person("adult", "sitting", "casual");
MODELS["person-child-standing"] = person("child", "standing", "casual");

MODELS["car"] = vehicle("car", "sedan");
MODELS["vehicle-car-sedan"] = MODELS["car"];
MODELS["vehicle-van-standard"] = vehicle("van", "standard");
MODELS["vehicle-bus-transit"] = vehicle("bus", "transit");
MODELS["vehicle-truck-box"] = vehicle("truck", "box");
MODELS["vehicle-bicycle"] = vehicle("bicycle", "standard");

MODELS["boat"] = vessel("yacht");
MODELS["vessel-yacht"] = MODELS["boat"];
MODELS["vessel-sailboat"] = vessel("sailboat");
MODELS["vessel-ferry"] = vessel("ferry");

MODELS["aircraft-light"] = aircraft("light-single");
MODELS["aircraft-airliner"] = aircraft("airliner-twin");

// -----------------------------------------------------------------------------
// CONVENIENCE ALIASES (Compatible with prop-manifest.js & legacy keys)
// -----------------------------------------------------------------------------
MODELS["bench"] = MODELS["bench-slat"];
MODELS["bin"] = MODELS["bin-round"];
MODELS["busShelter"] = MODELS["bus-shelter"];
MODELS["lampPost"] = MODELS["lamp-street"];
MODELS["railTie"] = MODELS["rail-tie"];

export function getModel(id) {
  return MODELS[id] || null;
}

// -----------------------------------------------------------------------------
// BOUNDING BOX & LOD VERIFICATION
// -----------------------------------------------------------------------------

export function computeBounds(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  return {
    xMin: bb.min.x,
    xMax: bb.max.x,
    yMin: bb.min.y,
    yMax: bb.max.y,
    zMin: bb.min.z,
    zMax: bb.max.z,
    width: bb.max.x - bb.min.x,
    height: bb.max.y - bb.min.y,
    depth: bb.max.z - bb.min.z,
  };
}

export function countTriangles(geometry) {
  if (geometry.index) return geometry.index.count / 3;
  if (geometry.attributes.position) return geometry.attributes.position.count / 3;
  return 0;
}

export function assertModelDeclaration(model, T = THREE) {
  if (!model || typeof model !== "object") {
    throw new Error("Invalid model declaration: expected an object");
  }
  const id = model.id || "unknown";

  if (!model.footprint || typeof model.footprint.w !== "number" || typeof model.footprint.d !== "number") {
    throw new Error(`${id}: footprint must declare positive { w, d }`);
  }
  if (typeof model.height !== "number" || model.height <= 0) {
    throw new Error(`${id}: height must be a positive number`);
  }
  if (typeof model.clearance !== "number" || model.clearance < 0) {
    throw new Error(`${id}: clearance must be a non-negative number (got ${model.clearance})`);
  }
  if (model.origin !== "base-centre") {
    throw new Error(`${id}: origin must be "base-centre" (got "${model.origin}")`);
  }
  if (!Array.isArray(model.standsOn) || model.standsOn.length === 0) {
    throw new Error(`${id}: standsOn must be a non-empty array of valid ground surfaces`);
  }
  if (!Array.isArray(model.lod) || model.lod.length < 3) {
    throw new Error(`${id}: must provide at least 3 LOD levels (LOD0, LOD1, LOD2)`);
  }

  // Manifest match verification
  if (model.manifestKey && PROPS[model.manifestKey]) {
    const p = PROPS[model.manifestKey];
    if (model.footprint.w !== p.foot.w) {
      throw new Error(`${id}: footprint width (${model.footprint.w}) must match manifest PROPS.${model.manifestKey}.foot.w (${p.foot.w})`);
    }
  }

  const allowedW = (model.sweep && model.sweep.w) || model.footprint.w;
  const allowedD = (model.sweep && model.sweep.d) || model.footprint.d;
  const allowedH = model.height;
  const eps = 0.05;

  for (const lod of model.lod) {
    if (typeof lod.level !== "number" || typeof lod.tris !== "number") {
      throw new Error(`${id} LOD${lod.level}: must declare numeric level and tris`);
    }
    if (typeof lod.createGeometry !== "function") {
      throw new Error(`${id} LOD${lod.level}: createGeometry must be a function`);
    }

    const geom = lod.createGeometry(T);
    const bounds = computeBounds(geom);
    const realTris = countTriangles(geom);

    // Enforce declared LOD triangle budget (mesh triangles must not exceed declared budget by > 10%)
    if (realTris > lod.tris * 1.1 + 2) {
      throw new Error(
        `${id} LOD${lod.level}: real triangles (${realTris}) exceed declared budget (${lod.tris})`
      );
    }

    // Ground level check: base-centre means (0, 0, 0) is at terrain level
    if (bounds.yMin < -eps) {
      throw new Error(
        `${id} LOD${lod.level} extends ${(-bounds.yMin).toFixed(3)} m below ground level (min y = ${bounds.yMin.toFixed(3)})`
      );
    }
    if (bounds.yMax > allowedH + eps) {
      throw new Error(
        `${id} LOD${lod.level} exceeds declared height ${allowedH} m (max y = ${bounds.yMax.toFixed(3)} m)`
      );
    }

    // Sweep vs Footprint Guardrail
    const realMaxX = Math.max(Math.abs(bounds.xMin), Math.abs(bounds.xMax));
    const realMaxZ = Math.max(Math.abs(bounds.zMin), Math.abs(bounds.zMax));
    if (realMaxX > (model.footprint.w / 2) + eps || realMaxZ > (model.footprint.d / 2) + eps) {
      if (!model.sweep) {
        throw new Error(`${id} LOD${lod.level}: geometry extent exceeds footprint without declared sweep`);
      }
      if (realMaxX > (model.sweep.w / 2) + eps || realMaxZ > (model.sweep.d / 2) + eps) {
        throw new Error(`${id} LOD${lod.level}: geometry extent exceeds declared sweep (${model.sweep.w}x${model.sweep.d}m)`);
      }
    }

    if (Math.abs(bounds.xMin) > allowedW / 2 + eps || bounds.xMax > allowedW / 2 + eps) {
      throw new Error(
        `${id} LOD${lod.level} width [${bounds.xMin.toFixed(3)}, ${bounds.xMax.toFixed(3)}] exceeds allowed width ${allowedW} m`
      );
    }
    if (Math.abs(bounds.zMin) > allowedD / 2 + eps || bounds.zMax > allowedD / 2 + eps) {
      throw new Error(
        `${id} LOD${lod.level} depth [${bounds.zMin.toFixed(3)}, ${bounds.zMax.toFixed(3)}] exceeds allowed depth ${allowedD} m`
      );
    }
  }

  return true;
}

export function verifyFamilyVariants() {
  // Tree family: distinct ages must produce distinct heights
  const tSapling = tree("conifer", "sapling");
  const tMature = tree("conifer", "mature");
  const tAncient = tree("conifer", "ancient");
  if (tSapling.height >= tMature.height || tMature.height >= tAncient.height) {
    throw new Error("Tree age progression failed: heights are not strictly increasing");
  }

  // Person family: distinct builds must produce distinct heights
  const pChild = person("child", "standing", "casual");
  const pAdult = person("adult", "standing", "casual");
  const pTall = person("tall", "standing", "casual");
  if (pChild.height >= pAdult.height || pAdult.height >= pTall.height) {
    throw new Error("Person build progression failed: heights are not strictly increasing");
  }

  // Vehicle family: distinct classes must produce distinct footprints
  const vCar = vehicle("car", "sedan");
  const vBus = vehicle("bus", "transit");
  if (vCar.footprint.d >= vBus.footprint.d) {
    throw new Error("Vehicle family failed: bus length must exceed car length");
  }

  return true;
}

export function verifyAllModels(T = THREE) {
  const verified = [];
  const checkedKeys = new Set();
  for (const key of Object.keys(MODELS)) {
    const model = MODELS[key];
    if (checkedKeys.has(model.id)) continue;
    checkedKeys.add(model.id);
    assertModelDeclaration(model, T);
    verified.push({
      id: model.id,
      lod0_tris: model.lod[0].tris,
      lod1_tris: model.lod[1].tris,
      lod2_tris: model.lod[2].tris,
      footprint: `${model.footprint.w}x${model.footprint.d}m`,
      height: `${model.height}m`,
    });
  }
  verifyFamilyVariants();
  return verified;
}

if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("props.js")) {
  try {
    const res = verifyAllModels(THREE);
    console.log(`Verified ${res.length} models successfully:`);
    for (const r of res) {
      console.log(`  ${r.id.padEnd(26)} | LOD tris: ${r.lod0_tris}/${r.lod1_tris}/${r.lod2_tris} | ${r.footprint} h=${r.height}`);
    }
  } catch (err) {
    console.error("VERIFICATION FAILED:", err.message);
    process.exit(1);
  }
}
