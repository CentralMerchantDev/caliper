// =============================================================================
// ROAD KIT — PARAMETERISED ROAD, BRIDGE AND RAIL FAMILIES
//
// WHAT THIS IS
// Parameterised code for the circulation network: roads, junctions, roundabouts,
// ramp merges, level crossings, bridges, bridge spans, and rail pieces.
//
// Every piece satisfies the model contract (docs/WORLD-RULES.md §4):
//   - id, kind: "hard"
//   - footprint: { w, d }  (ground occupancy)
//   - height               (elevation / overhead clearance)
//   - clearance: 0
//   - origin: "base-centre" ((0,0,0) is footprint centre at ground level)
//   - standsOn: ["open"]   (or ["water", "rock", "open"] for bridge structures)
//   - sockets: [ { at: [x,y,z], bearing: deg, width: m, lanes: n, kind } ]
//   - strips:  [ { name, surface, xMin, xMax, width } ]
//   - lod:     [ LOD0, LOD1, LOD2 ] with declared triangle budgets
//
// THE 8 METRE MODULE
// Every tiling piece is a whole number of 8 m modules.
//
// SOCKETS
// Bearing is the direction traffic LEAVES the piece: 0 = +Z (clockwise).
// Two pieces mate when sockets face each other (bearing diff 180°) and
// widths/lanes match.
// =============================================================================

import * as THREE from "three";

export const MODULE_M = 8; // 8 m module length

/**
 * Standard Right-Of-Way (ROW) definitions from docs/WORLD-RULES.md §3.1
 * Dimensions are real-world metres and NEVER scale.
 */
export const ROAD_STANDARDS = {
  FREEWAY: {
    name: "FREEWAY",
    row: 62,
    lanes: 6,
    speedKmH: 100,
    hasSidewalk: false,
    hasParking: false,
    hasTram: false,
    kerbRadiusM: 15,
    kerbRadiusReason: "AASHTO / Austroads design vehicle WB-15 / 16.5m semi-trailer turning envelope",
    strips: [
      { name: "verge-left",       surface: "verge",       xMin: -31.0, xMax: -24.65, width: 6.35 },
      { name: "shoulder-left",    surface: "carriageway", xMin: -24.65, xMax: -21.65, width: 3.0  },
      { name: "lanes-left",       surface: "carriageway", xMin: -21.65, xMax: -10.85, width: 10.8 },
      { name: "shoulder-inner-l", surface: "carriageway", xMin: -10.85, xMax: -3.0,   width: 7.85 },
      { name: "median-barrier",   surface: "verge",       xMin: -3.0,   xMax: 3.0,    width: 6.0  },
      { name: "shoulder-inner-r", surface: "carriageway", xMin: 3.0,    xMax: 10.85,  width: 7.85 },
      { name: "lanes-right",      surface: "carriageway", xMin: 10.85,  xMax: 21.65,  width: 10.8 },
      { name: "shoulder-right",   surface: "carriageway", xMin: 21.65,  xMax: 24.65,  width: 3.0  },
      { name: "verge-right",      surface: "verge",       xMin: 24.65,  xMax: 31.0,   width: 6.35 },
    ],
  },
  RAMP: {
    name: "RAMP",
    row: 14,
    lanes: 1,
    speedKmH: 50,
    hasSidewalk: false,
    hasParking: false,
    hasTram: false,
    kerbRadiusM: 12,
    kerbRadiusReason: "Interchange slip ramp radius for heavy freight access",
    strips: [
      { name: "verge-left",    surface: "verge",       xMin: -7.0, xMax: -3.7, width: 3.3 },
      { name: "shoulder-left", surface: "carriageway", xMin: -3.7, xMax: -2.5, width: 1.2 },
      { name: "lane",          surface: "carriageway", xMin: -2.5, xMax: 1.2,  width: 3.7 },
      { name: "shoulder-right",surface: "carriageway", xMin: 1.2,  xMax: 3.7,  width: 2.5 },
      { name: "verge-right",   surface: "verge",       xMin: 3.7,  xMax: 7.0,  width: 3.3 },
    ],
  },
  BOULEVARD: {
    name: "BOULEVARD",
    row: 44,
    lanes: 4,
    speedKmH: 50,
    hasSidewalk: true,
    hasParking: true,
    hasTram: true,
    kerbRadiusM: 12,
    kerbRadiusReason: "12m radius allows standard city transit buses (12.5m length) to turn without mounting kerbs",
    strips: [
      { name: "sidewalk-left",  surface: "sidewalk",    xMin: -22.0, xMax: -16.0, width: 6.0 },
      { name: "parking-left",   surface: "parking",     xMin: -16.0, xMax: -13.5, width: 2.5 },
      { name: "lanes-left",     surface: "carriageway", xMin: -13.5, xMax: -6.5,  width: 7.0 },
      { name: "median-tram",    surface: "track",       xMin: -6.5,  xMax: 6.5,   width: 13.0},
      { name: "lanes-right",    surface: "carriageway", xMin: 6.5,   xMax: 13.5,  width: 7.0 },
      { name: "parking-right",  surface: "parking",     xMin: 13.5,  xMax: 16.0,  width: 2.5 },
      { name: "sidewalk-right", surface: "sidewalk",    xMin: 16.0,  xMax: 22.0,  width: 6.0 },
    ],
  },
  AVENUE: {
    name: "AVENUE",
    row: 28,
    lanes: 2,
    speedKmH: 40,
    hasSidewalk: true,
    hasParking: true,
    hasTram: false,
    kerbRadiusM: 6,
    kerbRadiusReason: "6m radius balances single-unit truck turning envelope against pedestrian crossing distance",
    strips: [
      { name: "sidewalk-left",  surface: "sidewalk",    xMin: -14.0, xMax: -10.0, width: 4.0 },
      { name: "verge-left",     surface: "verge",       xMin: -10.0, xMax: -7.5,  width: 2.5 },
      { name: "parking-left",   surface: "parking",     xMin: -7.5,  xMax: -5.0,  width: 2.5 },
      { name: "carriageway",    surface: "carriageway", xMin: -5.0,  xMax: 5.0,   width: 10.0},
      { name: "parking-right",  surface: "parking",     xMin: 5.0,   xMax: 7.5,   width: 2.5 },
      { name: "verge-right",    surface: "verge",       xMin: 7.5,   xMax: 10.0,  width: 2.5 },
      { name: "sidewalk-right", surface: "sidewalk",    xMin: 10.0,  xMax: 14.0,  width: 4.0 },
    ],
  },
  STREET: {
    name: "STREET",
    row: 18,
    lanes: 2,
    speedKmH: 30,
    hasSidewalk: true,
    hasParking: false,
    hasTram: false,
    kerbRadiusM: 4,
    kerbRadiusReason: "4m tight kerb enforces pedestrian priority, short sightlines, and 15 km/h turning speed",
    strips: [
      { name: "sidewalk-left",  surface: "sidewalk",    xMin: -9.0, xMax: -6.0, width: 3.0 },
      { name: "verge-left",     surface: "verge",       xMin: -6.0, xMax: -4.5, width: 1.5 },
      { name: "carriageway",    surface: "carriageway", xMin: -4.5, xMax: 4.5,  width: 9.0 },
      { name: "verge-right",    surface: "verge",       xMin: 4.5,  xMax: 6.0,  width: 1.5 },
      { name: "sidewalk-right", surface: "sidewalk",    xMin: 6.0,  xMax: 9.0,  width: 3.0 },
    ],
  },
  LANE: {
    name: "LANE",
    row: 10,
    lanes: 1,
    speedKmH: 20,
    hasSidewalk: true,
    hasParking: false,
    hasTram: false,
    kerbRadiusM: 3,
    kerbRadiusReason: "3m radius creates walkable laneway grain and prevents through-traffic speeding",
    strips: [
      { name: "sidewalk-left",  surface: "sidewalk",    xMin: -5.0, xMax: -3.5, width: 1.5 },
      { name: "carriageway",    surface: "carriageway", xMin: -3.5, xMax: 3.5,  width: 7.0 },
      { name: "sidewalk-right", surface: "sidewalk",    xMin: 3.5,  xMax: 5.0,  width: 1.5 },
    ],
  },
  ALLEY: {
    name: "ALLEY",
    row: 6,
    lanes: 1,
    speedKmH: 15,
    hasSidewalk: false,
    hasParking: false,
    hasTram: false,
    kerbRadiusM: 3,
    kerbRadiusReason: "Service alley rear-access turning apron",
    strips: [
      { name: "drainage-left",  surface: "carriageway", xMin: -3.0, xMax: -2.25, width: 0.75 },
      { name: "carriageway",    surface: "carriageway", xMin: -2.25, xMax: 2.25, width: 4.5 },
      { name: "drainage-right", surface: "carriageway", xMin: 2.25,  xMax: 3.0,  width: 0.75 },
    ],
  },
};

export function mergeGeometries(geometries, T = THREE) {
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;
  for (const g of geometries) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const count = p.count;
    pos.set(p.array, vOffset * 3);
    if (n) norm.set(n.array, vOffset * 3);

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[iOffset + i] = g.index.array[i] + vOffset;
      }
      iOffset += g.index.count;
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += count;
    }
    vOffset += count;
  }
  const merged = new T.BufferGeometry();
  merged.setAttribute("position", new T.BufferAttribute(pos, 3));
  merged.setAttribute("normal", new T.BufferAttribute(norm, 3));
  merged.setIndex(new T.BufferAttribute(indices, 1));
  return merged;
}

export function straight(roadClass = "STREET", modules = 1) {
  const stdKey = typeof roadClass === "string" ? roadClass.toUpperCase() : "STREET";
  const std = ROAD_STANDARDS[stdKey] || ROAD_STANDARDS.STREET;
  const lengthM = modules * MODULE_M;
  const halfL = lengthM / 2;
  const widthM = std.row;

  return {
    id: `road-straight-${roadClass.toLowerCase()}-${modules}m`,
    kind: "hard",
    roadClass: std.name,
    modules,
    footprint: { w: widthM, d: lengthM },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    strips: std.strips,
    sockets: [
      { at: [0, 0, -halfL], bearing: 180, width: widthM, lanes: std.lanes, kind: "road" },
      { at: [0, 0, halfL],  bearing: 0,   width: widthM, lanes: std.lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: modules * 24,
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 0.2, lengthM);
          deck.translate(0, 0.1, 0);
          parts.push(deck);
          if (std.hasSidewalk) {
            for (const s of std.strips.filter((st) => st.surface === "sidewalk")) {
              const sw = new T.BoxGeometry(s.width, 0.15, lengthM);
              sw.translate((s.xMin + s.xMax) / 2, 0.25, 0);
              parts.push(sw);
            }
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: modules * 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, 0.25, lengthM);
          b.translate(0, 0.125, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, 0.2, lengthM);
          b.translate(0, 0.1, 0);
          return b;
        },
      },
    ],
  };
}

export function curve(roadClass = "STREET", radiusM = 32, angleDeg = 90) {
  const stdKey = typeof roadClass === "string" ? roadClass.toUpperCase() : "STREET";
  const std = ROAD_STANDARDS[stdKey] || ROAD_STANDARDS.STREET;
  const angleRad = (angleDeg * Math.PI) / 180;
  const widthM = std.row;
  const outerR = radiusM + widthM / 2;
  const chordW = outerR * 2;
  const chordD = outerR * 2;

  return {
    id: `road-curve-${roadClass.toLowerCase()}-r${radiusM}-a${angleDeg}`,
    kind: "hard",
    roadClass: std.name,
    radiusM,
    angleDeg,
    footprint: { w: chordW, d: chordD },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    strips: std.strips,
    sockets: [
      { at: [0, 0, -radiusM], bearing: 180, width: widthM, lanes: std.lanes, kind: "road" },
      {
        at: [radiusM * Math.sin(angleRad), 0, -radiusM * Math.cos(angleRad)],
        bearing: (180 + angleDeg) % 360,
        width: widthM,
        lanes: std.lanes,
        kind: "road",
      },
    ],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const g = new T.CylinderGeometry(outerR, outerR, 0.25, 12, 1, false, 0, angleRad);
          g.translate(0, 0.125, 0);
          return g;
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const g = new T.CylinderGeometry(outerR, outerR, 0.25, 6, 1, false, 0, angleRad);
          g.translate(0, 0.125, 0);
          return g;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(chordW, 0.2, chordD);
          b.translate(0, 0.1, 0);
          return b;
        },
      },
    ],
  };
}

export function junction(arms = [
  { class: "STREET", bearing: 0 },
  { class: "STREET", bearing: 90 },
  { class: "STREET", bearing: 180 },
  { class: "STREET", bearing: 270 },
]) {
  const isFourWay = arms.length >= 4;
  const classes = arms.map((a) => ROAD_STANDARDS[a.class] || ROAD_STANDARDS.STREET);
  const maxRow = Math.max(...classes.map((c) => c.row));
  const maxKerbRadius = Math.max(...classes.map((c) => c.kerbRadiusM));
  const totalBoxSize = maxRow + maxKerbRadius * 2;

  const sockets = arms.map((arm, idx) => {
    const std = classes[idx];
    const halfSpan = totalBoxSize / 2;
    const rad = (arm.bearing * Math.PI) / 180;
    const sx = Math.sin(rad) * halfSpan;
    const sz = Math.cos(rad) * halfSpan;
    return {
      at: [Number(sx.toFixed(2)), 0, Number(sz.toFixed(2))],
      bearing: arm.bearing,
      width: std.row,
      lanes: std.lanes,
      kind: "road",
    };
  });

  return {
    id: `junction-${arms.length}way-${arms.map((a) => a.class.toLowerCase()).join("-")}`,
    kind: "hard",
    armCount: arms.length,
    kerbRadiusM: maxKerbRadius,
    kerbRadiusReason: classes[0].kerbRadiusReason,
    footprint: { w: totalBoxSize, d: totalBoxSize },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets,
    lod: [
      {
        level: 0,
        tris: isFourWay ? 64 : 48,
        createGeometry: (T = THREE) => {
          const parts = [];
          const core = new T.BoxGeometry(totalBoxSize, 0.25, totalBoxSize);
          core.translate(0, 0.125, 0);
          parts.push(core);
          const cornerW = maxKerbRadius;
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              const corner = new T.BoxGeometry(cornerW, 0.15, cornerW);
              corner.translate(
                sx * (totalBoxSize / 2 - cornerW / 2),
                0.275,
                sz * (totalBoxSize / 2 - cornerW / 2)
              );
              parts.push(corner);
            }
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const core = new T.BoxGeometry(totalBoxSize, 0.25, totalBoxSize);
          core.translate(0, 0.125, 0);
          return core;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const core = new T.BoxGeometry(totalBoxSize, 0.2, totalBoxSize);
          core.translate(0, 0.1, 0);
          return core;
        },
      },
    ],
  };
}

export function roundabout(arms = [
  { class: "AVENUE", bearing: 0 },
  { class: "AVENUE", bearing: 90 },
  { class: "AVENUE", bearing: 180 },
  { class: "AVENUE", bearing: 270 },
], islandRadiusM = 16) {
  const classes = arms.map((a) => ROAD_STANDARDS[a.class] || ROAD_STANDARDS.AVENUE);
  const maxRow = Math.max(...classes.map((c) => c.row));
  const circulatingWidthM = 10;
  const outerRadiusM = islandRadiusM + circulatingWidthM;
  const totalBoxSize = outerRadiusM * 2 + 8;

  const sockets = arms.map((arm, idx) => {
    const std = classes[idx];
    const rad = (arm.bearing * Math.PI) / 180;
    const sx = Math.sin(rad) * (totalBoxSize / 2);
    const sz = Math.cos(rad) * (totalBoxSize / 2);
    return {
      at: [Number(sx.toFixed(2)), 0, Number(sz.toFixed(2))],
      bearing: arm.bearing,
      width: std.row,
      lanes: std.lanes,
      kind: "road",
    };
  });

  return {
    id: `roundabout-r${islandRadiusM}-${arms.length}arms`,
    kind: "hard",
    islandRadiusM,
    outerRadiusM,
    footprint: { w: totalBoxSize, d: totalBoxSize },
    height: 1.2,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets,
    lod: [
      {
        level: 0,
        tris: 80,
        createGeometry: (T = THREE) => {
          const ring = new T.CylinderGeometry(outerRadiusM, outerRadiusM, 0.25, 24);
          ring.translate(0, 0.125, 0);
          const island = new T.CylinderGeometry(islandRadiusM, islandRadiusM + 0.5, 0.8, 20);
          island.translate(0, 0.55, 0);
          return mergeGeometries([ring, island], T);
        },
      },
      {
        level: 1,
        tris: 36,
        createGeometry: (T = THREE) => {
          const ring = new T.CylinderGeometry(outerRadiusM, outerRadiusM, 0.25, 12);
          ring.translate(0, 0.125, 0);
          const island = new T.CylinderGeometry(islandRadiusM, islandRadiusM, 0.6, 12);
          island.translate(0, 0.55, 0);
          return mergeGeometries([ring, island], T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(totalBoxSize, 0.3, totalBoxSize);
          b.translate(0, 0.15, 0);
          return b;
        },
      },
    ],
  };
}

export function rampMerge(mainClass = "FREEWAY", rampSide = "right") {
  const stdMain = ROAD_STANDARDS[mainClass] || ROAD_STANDARDS.FREEWAY;
  const stdRamp = ROAD_STANDARDS.RAMP;
  const taperModules = 6;
  const lengthM = taperModules * MODULE_M;
  const totalWidthM = stdMain.row + stdRamp.row;
  const halfL = lengthM / 2;

  return {
    id: `ramp-merge-${mainClass.toLowerCase()}-${rampSide}`,
    kind: "hard",
    footprint: { w: totalWidthM, d: lengthM },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets: [
      { at: [0, 0, -halfL], bearing: 180, width: stdMain.row, lanes: stdMain.lanes, kind: "road" },
      {
        at: [rampSide === "right" ? stdMain.row / 2 + stdRamp.row / 2 : -(stdMain.row / 2 + stdRamp.row / 2), 0, -halfL],
        bearing: 195,
        width: stdRamp.row,
        lanes: 1,
        kind: "road",
      },
      { at: [0, 0, halfL], bearing: 0, width: stdMain.row, lanes: stdMain.lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: 48,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(totalWidthM, 0.25, lengthM);
          slab.translate(0, 0.125, 0);
          return slab;
        },
      },
      {
        level: 1,
        tris: 24,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(totalWidthM, 0.25, lengthM);
          slab.translate(0, 0.125, 0);
          return slab;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(totalWidthM, 0.2, lengthM);
          slab.translate(0, 0.1, 0);
          return slab;
        },
      },
    ],
  };
}

export function levelCrossing(roadClass = "STREET") {
  const std = ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.STREET;
  const lengthM = 16;
  const widthM = std.row;
  const halfL = lengthM / 2;

  return {
    id: `level-crossing-${roadClass.toLowerCase()}`,
    kind: "hard",
    footprint: { w: widthM, d: lengthM },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets: [
      { at: [0, 0, -halfL], bearing: 180, width: widthM, lanes: std.lanes, kind: "road" },
      { at: [0, 0, halfL],  bearing: 0,   width: widthM, lanes: std.lanes, kind: "road" },
      { at: [-widthM / 2, 0, 0], bearing: 270, width: 4.8, lanes: 1, kind: "rail" },
      { at: [widthM / 2, 0, 0],  bearing: 90,  width: 4.8, lanes: 1, kind: "rail" },
    ],
    lod: [
      {
        level: 0,
        tris: 120,
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 0.25, lengthM);
          deck.translate(0, 0.125, 0);
          parts.push(deck);
          const rails = new T.BoxGeometry(widthM, 0.1, 1.435);
          rails.translate(0, 0.28, 0);
          parts.push(rails);
          // 2 Stanchion Masts + Red-and-White Striped Barrier Arms
          for (const sx of [-widthM / 2 + 1.5, widthM / 2 - 1.5]) {
            const mast = new T.CylinderGeometry(0.12, 0.15, 3.8, 6);
            mast.translate(sx, 1.9, -halfL + 2);
            // Crossbuck warning sign board
            const cross1 = new T.BoxGeometry(1.2, 0.15, 0.05);
            cross1.rotateZ(0.78);
            cross1.translate(sx, 3.4, -halfL + 2.1);
            const cross2 = new T.BoxGeometry(1.2, 0.15, 0.05);
            cross2.rotateZ(-0.78);
            cross2.translate(sx, 3.4, -halfL + 2.1);
            // Barrier Boom Arm
            const arm = new T.BoxGeometry(widthM * 0.45, 0.12, 0.08);
            arm.translate(sx > 0 ? sx - (widthM * 0.22) : sx + (widthM * 0.22), 1.1, -halfL + 2.15);
            parts.push(mast, cross1, cross2, arm);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 28,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(widthM, 0.25, lengthM);
          deck.translate(0, 0.125, 0);
          return deck;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, 0.2, lengthM);
          b.translate(0, 0.1, 0);
          return b;
        },
      },
    ],
  };
}

export function turningHead(roadClass = "STREET", type = "bulb") {
  const std = ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.STREET;
  const bulbRadiusM = 12;
  const totalWidthM = Math.max(std.row, bulbRadiusM * 2);
  const totalLengthM = bulbRadiusM * 2;

  return {
    id: `turning-head-${roadClass.toLowerCase()}-${type}`,
    kind: "hard",
    footprint: { w: totalWidthM, d: totalLengthM },
    height: 0.35,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open"],
    sockets: [
      { at: [0, 0, -totalLengthM / 2], bearing: 180, width: std.row, lanes: std.lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: 44,
        createGeometry: (T = THREE) => {
          const bulb = new T.CylinderGeometry(bulbRadiusM, bulbRadiusM, 0.25, 18);
          bulb.translate(0, 0.125, 0);
          return bulb;
        },
      },
      {
        level: 1,
        tris: 20,
        createGeometry: (T = THREE) => {
          const bulb = new T.CylinderGeometry(bulbRadiusM, bulbRadiusM, 0.25, 8);
          bulb.translate(0, 0.125, 0);
          return bulb;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(totalWidthM, 0.2, totalLengthM);
          b.translate(0, 0.1, 0);
          return b;
        },
      },
    ],
  };
}

export function bridgeArch(roadClass = "AVENUE", spanM = 64, clearanceHeightM = 16) {
  const std = ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.AVENUE;
  const widthM = std.row;
  const halfSpan = spanM / 2;
  const totalArchHeightM = clearanceHeightM + halfSpan;

  return {
    id: `bridge-arch-${roadClass.toLowerCase()}-${spanM}m`,
    kind: "hard",
    footprint: { w: widthM, d: spanM },
    height: totalArchHeightM,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["water", "rock", "open"],
    sockets: [
      { at: [0, clearanceHeightM, -halfSpan], bearing: 180, width: widthM, lanes: std.lanes, kind: "road" },
      { at: [0, clearanceHeightM, halfSpan],  bearing: 0,   width: widthM, lanes: std.lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: 128,
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 1.4, spanM);
          deck.translate(0, clearanceHeightM, 0);
          parts.push(deck);
          const arch = new T.CylinderGeometry(halfSpan * 0.95, halfSpan, widthM * 0.85, 16, 1, true, 0, Math.PI);
          arch.rotateZ(Math.PI / 2);
          arch.translate(0, clearanceHeightM - 4, 0);
          parts.push(arch);
          for (const sz of [-halfSpan, halfSpan]) {
            const abut = new T.BoxGeometry(widthM, clearanceHeightM + 2, 8);
            abut.translate(0, (clearanceHeightM + 2) / 2, sz - Math.sign(sz) * 4);
            parts.push(abut);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(widthM, 1.4, spanM);
          deck.translate(0, clearanceHeightM, 0);
          return deck;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, clearanceHeightM + 2, spanM);
          b.translate(0, (clearanceHeightM + 2) / 2, 0);
          return b;
        },
      },
    ],
  };
}

export function bridgeCableStayed(roadClass = "BOULEVARD", spanM = 160, pylonHeightM = 54) {
  const std = ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.BOULEVARD;
  const widthM = std.row;
  const halfSpan = spanM / 2;
  const deckHeightM = 18;

  return {
    id: `bridge-cablestay-${roadClass.toLowerCase()}-${spanM}m`,
    kind: "hard",
    footprint: { w: widthM * 1.4, d: spanM },
    height: pylonHeightM,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["water", "rock", "open"],
    sockets: [
      { at: [0, deckHeightM, -halfSpan], bearing: 180, width: widthM, lanes: std.lanes, kind: "road" },
      { at: [0, deckHeightM, halfSpan],  bearing: 0,   width: widthM, lanes: std.lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: 160,
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 1.8, spanM);
          deck.translate(0, deckHeightM, 0);
          parts.push(deck);
          for (const sx of [-widthM / 2 - 1.5, widthM / 2 + 1.5]) {
            const pylonLeg = new T.BoxGeometry(2.4, pylonHeightM, 3.2);
            pylonLeg.translate(sx, pylonHeightM / 2, 0);
            parts.push(pylonLeg);
          }
          const crossbeam = new T.BoxGeometry(widthM + 4, 3.0, 3.2);
          crossbeam.translate(0, deckHeightM + 4, 0);
          parts.push(crossbeam);
          for (const zDir of [-1, 1]) {
            for (let i = 1; i <= 3; i++) {
              const cableLen = Math.hypot(halfSpan * (i / 4), pylonHeightM * 0.7);
              const cable = new T.CylinderGeometry(0.12, 0.12, cableLen, 4);
              cable.rotateX(Math.atan2(halfSpan * (i / 4), pylonHeightM * 0.7) * zDir);
              cable.translate(0, (pylonHeightM * 0.7 + deckHeightM) / 2, (halfSpan * (i / 4) * zDir) / 2);
              parts.push(cable);
            }
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 52,
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 1.8, spanM);
          deck.translate(0, deckHeightM, 0);
          parts.push(deck);
          const pylon = new T.BoxGeometry(widthM + 4, pylonHeightM, 3.2);
          pylon.translate(0, pylonHeightM / 2, 0);
          parts.push(pylon);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, pylonHeightM, spanM);
          b.translate(0, pylonHeightM / 2, 0);
          return b;
        },
      },
    ],
  };
}

export function causeway(roadClass = "FREEWAY", modules = 4) {
  const std = ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.FREEWAY;
  const lengthM = modules * MODULE_M;
  const widthM = std.row;
  const deckHeightM = 8;
  const halfL = lengthM / 2;

  return {
    id: `causeway-${roadClass.toLowerCase()}-${modules}m`,
    kind: "hard",
    footprint: { w: widthM, d: lengthM },
    height: deckHeightM + 1.2,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["water", "rock", "open"],
    sockets: [
      { at: [0, deckHeightM, -halfL], bearing: 180, width: widthM, lanes: std.lanes, kind: "road" },
      { at: [0, deckHeightM, halfL],  bearing: 0,   width: widthM, lanes: std.lanes, kind: "road" },
    ],
    lod: [
      {
        level: 0,
        tris: modules * 32,
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 1.2, lengthM);
          deck.translate(0, deckHeightM, 0);
          parts.push(deck);
          for (let z = -halfL + 8; z < halfL; z += 16) {
            const pier = new T.CylinderGeometry(1.6, 2.2, deckHeightM, 8);
            pier.translate(0, deckHeightM / 2, z);
            parts.push(pier);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: modules * 16,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(widthM, 1.2, lengthM);
          deck.translate(0, deckHeightM, 0);
          return deck;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, deckHeightM, lengthM);
          b.translate(0, deckHeightM / 2, 0);
          return b;
        },
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// DYNAMIC BRIDGE SPANNING ENGINE
// bridgeSpan(a, b, { roadClass, clearance, heightAt, groundAt })
// -----------------------------------------------------------------------------

export function bridgeSpan(a, b, options = {}) {
  const pA = Array.isArray(a) ? { x: a[0], y: a[1] || 0, z: a[2] } : a;
  const pB = Array.isArray(b) ? { x: b[0], y: b[1] || 0, z: b[2] } : b;
  const roadClass = options.roadClass || "AVENUE";
  const std = ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.AVENUE;
  const clearance = typeof options.clearance === "number" ? options.clearance : 12;
  const heightAt = typeof options.heightAt === "function" ? options.heightAt : null;
  const groundAt = typeof options.groundAt === "function" ? options.groundAt : null;

  const dx = pB.x - pA.x;
  const dz = pB.z - pA.z;
  const dy = pB.y - pA.y;
  const horizontalSpanM = Math.hypot(dx, dz);

  // Refusal Checks
  if (horizontalSpanM < MODULE_M) {
    return {
      ok: false,
      refusal: `Span distance ${horizontalSpanM.toFixed(1)}m is too short for bridge structure (minimum ${MODULE_M}m module)`,
    };
  }
  if (horizontalSpanM > 800) {
    return {
      ok: false,
      refusal: `Span distance ${horizontalSpanM.toFixed(1)}m exceeds maximum engineering limit (800m)`,
    };
  }

  const grade = Math.abs(dy) / horizontalSpanM;
  if (grade > 0.08) {
    return {
      ok: false,
      refusal: `Bridge grade ${(grade * 100).toFixed(1)}% exceeds maximum allowed vehicular slope (8%)`,
    };
  }

  if (groundAt) {
    const gA = groundAt(pA.x, pA.z);
    const gB = groundAt(pB.x, pB.z);
    if (gA === "water" || gA === "deep_water") {
      return { ok: false, refusal: "Abutment A sits on open water without solid ground anchorage" };
    }
    if (gB === "water" || gB === "deep_water") {
      return { ok: false, refusal: "Abutment B sits on open water without solid ground anchorage" };
    }
  }

  // Bearing from A to B (0 = +Z, clockwise)
  const rad = Math.atan2(dx, dz);
  let bearingDeg = (rad * 180) / Math.PI;
  if (bearingDeg < 0) bearingDeg += 360;

  // Typology Selection based on span distance
  let typology = "beam";
  if (horizontalSpanM < 32) {
    typology = "beam";
  } else if (horizontalSpanM < 96) {
    typology = "arch";
  } else if (horizontalSpanM <= 350) {
    typology = "cablestay";
  } else {
    typology = "causeway";
  }

  const widthM = std.row;
  const halfSpan = horizontalSpanM / 2;
  const midY = (pA.y + pB.y) / 2;
  const deckHeightM = Math.max(clearance, midY);
  const totalHeightM = typology === "cablestay" ? deckHeightM + horizontalSpanM * 0.35 : deckHeightM + 8;

  // Generate intermediate pier locations
  const pierIntervalM = typology === "causeway" ? 16 : typology === "beam" ? 12 : 24;
  const pierPositions = [];
  if (typology === "causeway" || typology === "beam") {
    for (let s = pierIntervalM; s < horizontalSpanM - pierIntervalM / 2; s += pierIntervalM) {
      const frac = s / horizontalSpanM;
      const px = pA.x + dx * frac;
      const pz = pA.z + dz * frac;
      const deckAtFrac = pA.y + dy * frac + clearance;
      const groundH = heightAt ? heightAt(px, pz) : 0;
      pierPositions.push({ x: px, y: groundH, z: pz, frac, deckY: deckAtFrac, height: Math.max(2, deckAtFrac - groundH) });
    }
  }

  return {
    ok: true,
    id: `bridge-${typology}-${roadClass.toLowerCase()}-${Math.round(horizontalSpanM)}m`,
    kind: "hard",
    typology,
    roadClass: std.name,
    spanM: horizontalSpanM,
    bearingDeg,
    footprint: { w: widthM * (typology === "cablestay" ? 1.4 : 1.0), d: horizontalSpanM },
    height: totalHeightM,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["water", "rock", "open"],
    sockets: [
      {
        at: [pA.x, pA.y, pA.z],
        bearing: (bearingDeg + 180) % 360,
        width: widthM,
        lanes: std.lanes,
        kind: "road",
      },
      {
        at: [pB.x, pB.y, pB.z],
        bearing: bearingDeg,
        width: widthM,
        lanes: std.lanes,
        kind: "road",
      },
    ],
    piers: pierPositions,
    lod: [
      {
        level: 0,
        tris: Math.max(48, Math.round(horizontalSpanM * 1.5)),
        createGeometry: (T = THREE) => {
          const parts = [];
          const deck = new T.BoxGeometry(widthM, 1.4, horizontalSpanM);
          deck.translate(0, deckHeightM, 0);
          parts.push(deck);
          if (typology === "arch") {
            const arch = new T.CylinderGeometry(halfSpan * 0.95, halfSpan, widthM * 0.85, 16, 1, true, 0, Math.PI);
            arch.rotateZ(Math.PI / 2);
            arch.translate(0, deckHeightM - 4, 0);
            parts.push(arch);
          } else if (typology === "cablestay") {
            const pylonH = totalHeightM;
            for (const sx of [-widthM / 2 - 1.2, widthM / 2 + 1.2]) {
              const pylon = new T.BoxGeometry(2.2, pylonH, 3.0);
              pylon.translate(sx, pylonH / 2, 0);
              parts.push(pylon);
            }
          } else {
            for (let z = -halfSpan + 8; z < halfSpan; z += 16) {
              const pier = new T.CylinderGeometry(1.4, 1.8, deckHeightM, 8);
              pier.translate(0, deckHeightM / 2, z);
              parts.push(pier);
            }
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 32,
        createGeometry: (T = THREE) => {
          const deck = new T.BoxGeometry(widthM, 1.4, horizontalSpanM);
          deck.translate(0, deckHeightM, 0);
          return deck;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, totalHeightM, horizontalSpanM);
          b.translate(0, totalHeightM / 2, 0);
          return b;
        },
      },
    ],
  };
}

export const RAIL_GAUGE_M = 1.435;
export const RAIL_TRACK_ROW = 4.8;

export function railStraight(modules = 1) {
  const lengthM = modules * MODULE_M;
  const halfL = lengthM / 2;

  return {
    id: `rail-straight-${modules}m`,
    kind: "hard",
    modules,
    footprint: { w: RAIL_TRACK_ROW, d: lengthM },
    height: 0.45,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["track", "open"],
    sockets: [
      { at: [0, 0, -halfL], bearing: 180, width: RAIL_TRACK_ROW, lanes: 1, kind: "rail" },
      { at: [0, 0, halfL],  bearing: 0,   width: RAIL_TRACK_ROW, lanes: 1, kind: "rail" },
    ],
    lod: [
      {
        level: 0,
        tris: modules * 40,
        createGeometry: (T = THREE) => {
          const parts = [];
          const ballast = new T.BoxGeometry(3.6, 0.2, lengthM);
          ballast.translate(0, 0.1, 0);
          parts.push(ballast);
          for (const rx of [-RAIL_GAUGE_M / 2, RAIL_GAUGE_M / 2]) {
            const rail = new T.BoxGeometry(0.08, 0.16, lengthM);
            rail.translate(rx, 0.28, 0);
            parts.push(rail);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: modules * 16,
        createGeometry: (T = THREE) => {
          const ballast = new T.BoxGeometry(3.6, 0.3, lengthM);
          ballast.translate(0, 0.15, 0);
          return ballast;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(RAIL_TRACK_ROW, 0.2, lengthM);
          b.translate(0, 0.1, 0);
          return b;
        },
      },
    ],
  };
}

export function railPlatform(modules = 4) {
  const lengthM = modules * MODULE_M;
  const widthM = 3.6;
  const platformH = 1.1;
  const halfL = lengthM / 2;

  return {
    id: `rail-platform-${modules}m`,
    kind: "hard",
    footprint: { w: widthM, d: lengthM },
    height: platformH,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open", "plot"],
    sockets: [
      { at: [0, 0, -halfL], bearing: 180, width: widthM, lanes: 0, kind: "pedestrian" },
      { at: [0, 0, halfL],  bearing: 0,   width: widthM, lanes: 0, kind: "pedestrian" },
    ],
    lod: [
      {
        level: 0,
        tris: modules * 24,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(widthM, platformH, lengthM);
          slab.translate(0, platformH / 2, 0);
          return slab;
        },
      },
      {
        level: 1,
        tris: 16,
        createGeometry: (T = THREE) => {
          const slab = new T.BoxGeometry(widthM, platformH, lengthM);
          slab.translate(0, platformH / 2, 0);
          return slab;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(widthM, platformH, lengthM);
          b.translate(0, platformH / 2, 0);
          return b;
        },
      },
    ],
  };
}

export function computeBounds(geometry) {
  const pos = geometry.attributes.position;
  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;
  let zMin = Infinity, zMax = -Infinity;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  return { xMin, xMax, yMin, yMax, zMin, zMax };
}


export function verifySocketMating(sockA, sockB) {
  if (!sockA || !sockB) {
    throw new Error("Socket mating failed: missing socket definition");
  }
  if (sockA.kind !== sockB.kind) {
    throw new Error(`Socket mating failed: incompatible kind (${sockA.kind} vs ${sockB.kind})`);
  }
  if (sockA.width !== sockB.width) {
    throw new Error(`Socket mating failed: width mismatch (${sockA.width}m vs ${sockB.width}m)`);
  }
  if (sockA.lanes !== sockB.lanes) {
    throw new Error(`Socket mating failed: lane count mismatch (${sockA.lanes} vs ${sockB.lanes})`);
  }
  return true;
}

export function verifyModel(model, T = THREE) {
  const foot = model.footprint;
  const sweep = model.sweep || foot;
  const allowedW = Math.max(foot.w, sweep.w);
  const allowedD = Math.max(foot.d, sweep.d);

  // Socket validation
  if (Array.isArray(model.sockets)) {
    for (const s of model.sockets) {
      if (!Array.isArray(s.at) || s.at.length < 3) {
        throw new Error(`${model.id}: socket 'at' must be a 3D coordinate [x, y, z]`);
      }
      if (typeof s.bearing !== "number" || s.bearing < 0 || s.bearing >= 360) {
        throw new Error(`${model.id}: socket bearing must be in [0, 360) (got ${s.bearing})`);
      }
      if (typeof s.width !== "number" || s.width <= 0) {
        throw new Error(`${model.id}: socket width must be a positive number`);
      }
    }

    if (model.id.startsWith("road-straight") && model.sockets.length === 2) {
      const bDiff = Math.abs(model.sockets[0].bearing - model.sockets[1].bearing);
      if (bDiff !== 180 && bDiff !== 180) {
        throw new Error(`${model.id}: straight piece sockets must face opposite directions (180 deg apart, got ${bDiff} deg diff)`);
      }
    }
  }

  
  // Module length check for tiling pieces (straight roads, causeways, rails)
  if (model.id && (model.id.startsWith("road-straight") || model.id.startsWith("rail-straight") || model.id.startsWith("causeway"))) {
    if (foot.d % MODULE_M !== 0 || foot.d < MODULE_M) {
      throw new Error(`${model.id}: tiling piece length (${foot.d}m) must be an exact multiple of the ${MODULE_M}m module`);
    }
  }

  for (const l of model.lod) {
    const geom = l.createGeometry(T);
    const b = computeBounds(geom);

    if (b.yMin < -0.05) {
      throw new Error(`${model.id} LOD${l.level} penetrates below ground: yMin = ${b.yMin.toFixed(3)} m`);
    }
    if (b.yMax > model.height + 0.15) {
      throw new Error(`${model.id} LOD${l.level} exceeds declared height ${model.height} m (yMax = ${b.yMax.toFixed(3)} m)`);
    }
    const width = b.xMax - b.xMin;
    if (width > allowedW + 0.15) {
      throw new Error(`${model.id} LOD${l.level} width ${width.toFixed(3)} exceeds allowed width ${allowedW} m`);
    }
    const depth = b.zMax - b.zMin;
    if (depth > allowedD + 0.15) {
      throw new Error(`${model.id} LOD${l.level} depth ${depth.toFixed(3)} exceeds allowed depth ${allowedD} m`);
    }
  }
  return true;
}

export function verifyAllRoadKit(T = THREE) {
  const models = [
    straight("FREEWAY", 1),
    straight("BOULEVARD", 1),
    straight("AVENUE", 1),
    straight("STREET", 1),
    straight("LANE", 1),
    straight("ALLEY", 1),
    curve("STREET", 32, 90),
    junction([
      { class: "STREET", bearing: 0 },
      { class: "STREET", bearing: 90 },
      { class: "STREET", bearing: 180 },
      { class: "STREET", bearing: 270 },
    ]),
    roundabout([
      { class: "AVENUE", bearing: 0 },
      { class: "AVENUE", bearing: 90 },
      { class: "AVENUE", bearing: 180 },
      { class: "AVENUE", bearing: 270 },
    ], 16),
    rampMerge("FREEWAY", "right"),
    levelCrossing("STREET"),
    turningHead("STREET"),
    bridgeArch("AVENUE", 64, 16),
    bridgeCableStayed("BOULEVARD", 160, 54),
    causeway("FREEWAY", 2),
    railStraight(1),
    railPlatform(2),
  ];

  const spanBridge = bridgeSpan({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 120 }, { roadClass: "AVENUE", clearance: 14 });
  if (spanBridge.ok) {
    models.push(spanBridge);
  }

  for (const m of models) {
    verifyModel(m, T);
  }
  return models;
}


export function testBridgeSpanInvariants() {
  // 1. Span under 8m (Refusal + Paired Acceptance)
  const rShort = bridgeSpan([0, 0, 0], [0, 0, 7.9]);
  if (rShort.ok || rShort.refusal !== "Span distance 7.9m is too short for bridge structure (minimum 8m module)") {
    throw new Error("testBridgeSpanInvariants: span < 8m refusal failed (got: " + JSON.stringify(rShort) + ")");
  }
  const aShort = bridgeSpan([0, 0, 0], [0, 0, 8.0]);
  if (!aShort.ok || aShort.typology !== "beam") {
    throw new Error("testBridgeSpanInvariants: span = 8m acceptance failed");
  }

  // 2. Span over 800m (Refusal + Paired Acceptance)
  const rLong = bridgeSpan([0, 0, 0], [0, 0, 800.1]);
  if (rLong.ok || rLong.refusal !== "Span distance 800.1m exceeds maximum engineering limit (800m)") {
    throw new Error("testBridgeSpanInvariants: span > 800m refusal failed (got: " + JSON.stringify(rLong) + ")");
  }
  const aLong = bridgeSpan([0, 0, 0], [0, 0, 800.0]);
  if (!aLong.ok || aLong.typology !== "causeway") {
    throw new Error("testBridgeSpanInvariants: span = 800m acceptance failed");
  }

  // 3. Grade over 8% (Refusal + Paired Acceptance)
  const rGrade = bridgeSpan([0, 0, 0], [0, 8.1, 100.0]);
  if (rGrade.ok || rGrade.refusal !== "Bridge grade 8.1% exceeds maximum allowed vehicular slope (8%)") {
    throw new Error("testBridgeSpanInvariants: grade > 8% refusal failed (got: " + JSON.stringify(rGrade) + ")");
  }
  const aGrade = bridgeSpan([0, 0, 0], [0, 8.0, 100.0]);
  if (!aGrade.ok) {
    throw new Error("testBridgeSpanInvariants: grade = 8% acceptance failed");
  }

  // 4. Abutment on open water (Refusal + Paired Acceptance)
  const rWaterA = bridgeSpan([0, 0, 0], [0, 0, 100.0], { groundAt: (x, z) => (z === 0 ? "water" : "open") });
  if (rWaterA.ok || rWaterA.refusal !== "Abutment A sits on open water without solid ground anchorage") {
    throw new Error("testBridgeSpanInvariants: abutment A water refusal failed");
  }
  const rWaterB = bridgeSpan([0, 0, 0], [0, 0, 100.0], { groundAt: (x, z) => (z === 100 ? "water" : "open") });
  if (rWaterB.ok || rWaterB.refusal !== "Abutment B sits on open water without solid ground anchorage") {
    throw new Error("testBridgeSpanInvariants: abutment B water refusal failed");
  }
  const aGround = bridgeSpan([0, 0, 0], [0, 0, 100.0], { groundAt: () => "open" });
  if (!aGround.ok) {
    throw new Error("testBridgeSpanInvariants: solid ground acceptance failed");
  }

  // 5. Typology boundaries
  const t31 = bridgeSpan([0, 0, 0], [0, 0, 31.0]);
  if (t31.typology !== "beam") throw new Error("Span 31m must be beam (got " + t31.typology + ")");
  const t33 = bridgeSpan([0, 0, 0], [0, 0, 33.0]);
  if (t33.typology !== "arch") throw new Error("Span 33m must be arch (got " + t33.typology + ")");
  const t95 = bridgeSpan([0, 0, 0], [0, 0, 95.0]);
  if (t95.typology !== "arch") throw new Error("Span 95m must be arch (got " + t95.typology + ")");
  const t97 = bridgeSpan([0, 0, 0], [0, 0, 97.0]);
  if (t97.typology !== "cablestay") throw new Error("Span 97m must be cablestay (got " + t97.typology + ")");
  const t350 = bridgeSpan([0, 0, 0], [0, 0, 350.0]);
  if (t350.typology !== "cablestay") throw new Error("Span 350m must be cablestay (got " + t350.typology + ")");
  const t351 = bridgeSpan([0, 0, 0], [0, 0, 351.0]);
  if (t351.typology !== "causeway") throw new Error("Span 351m must be causeway (got " + t351.typology + ")");

  return true;
}

if (typeof process !== "undefined" && process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("roadkit.js")) {
  try {
    testBridgeSpanInvariants();
    const verified = verifyAllRoadKit(THREE);
    console.log(`Verified ${verified.length} road kit families successfully:`);
    for (const m of verified) {
      console.log(`  ${m.id.padEnd(38)} | Footprint: ${m.footprint.w}x${m.footprint.d}m h=${m.height}m`);
    }

    // Test bridgeSpan refusal cases
    const shortRefuse = bridgeSpan([0,0,0], [0,0,4]);
    console.log("bridgeSpan too short refusal test:", !shortRefuse.ok, shortRefuse.refusal);
    const steepRefuse = bridgeSpan([0,0,0], [0,20,50]);
    console.log("bridgeSpan steep grade refusal test:", !steepRefuse.ok, steepRefuse.refusal);
  } catch (err) {
    console.error("ROADKIT VERIFICATION FAILED:", err.message);
    process.exit(1);
  }
}
