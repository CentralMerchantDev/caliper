/**
 * CALIPER — SHOWSTOPPER HERO ASSETS
 * High-tier architectural, transit, maritime, aviation, infrastructure,
 * and civic showstopper models that set the benchmark for quality.
 */
import * as THREE from "./vendor/three/three.module.min.js";

function mergeGeometries(geometries, T = THREE) {
  let totalVerts = 0;
  for (const g of geometries) {
    if (g && g.attributes && g.attributes.position) {
      totalVerts += g.attributes.position.count;
    }
  }
  const pos = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of geometries) {
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

// =============================================================================
// 1. BUILDINGS: SHOWSTOPPERS
// =============================================================================

/**
 * Showstopper: Art Deco Spire Skyscraper (48x48m, 168m high, multi-tier stepped crown & illuminated spire)
 */
export function bldArtDecoSpire(seed = "artdeco-0") {
  return {
    id: "bld-artdeco-spire",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 48, d: 48 },
    height: 168.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Tier 1: Grand Podium (48x48m, 24m high) with vertical stone fluting
          const p = new T.BoxGeometry(48, 24, 48);
          p.translate(0, 12, 0);
          parts.push(p);

          // Tier 2: Main Tower Shaft with Corner Setbacks (36x36m, 72m high, y: 24-96m)
          const s1 = new T.BoxGeometry(36, 72, 36);
          s1.translate(0, 60, 0);
          parts.push(s1);

          // Tier 3: Upper Stepped Tower (28x28m, 36m high, y: 96-132m)
          const s2 = new T.BoxGeometry(28, 36, 28);
          s2.translate(0, 114, 0);
          parts.push(s2);

          // Tier 4: Art Deco Stepped Crown (4 steps, y: 132-152m)
          for (let i = 0; i < 4; i++) {
            const stepW = 22 - i * 4;
            const stepH = 5.0;
            const step = new T.BoxGeometry(stepW, stepH, stepW);
            step.translate(0, 132 + i * 5 + 2.5, 0);
            parts.push(step);
          }

          // Tier 5: Gilded Needle Spire (y: 152-168m)
          const spire = new T.ConeGeometry(2.2, 16.0, 8);
          spire.translate(0, 160.0, 0);
          parts.push(spire);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 96,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(48, 24, 48);
          b1.translate(0, 12, 0);
          const b2 = new T.BoxGeometry(36, 72, 36);
          b2.translate(0, 60, 0);
          const b3 = new T.BoxGeometry(28, 36, 28);
          b3.translate(0, 114, 0);
          const spire = new T.ConeGeometry(3.0, 36.0, 6);
          spire.translate(0, 150, 0);
          return mergeGeometries([b1, b2, b3, spire], T);
        },
      },
      {
        level: 2,
        tris: 24,
        createGeometry: (T = THREE) => {
          const env = new T.BoxGeometry(48, 140, 48);
          env.translate(0, 70, 0);
          const sp = new T.ConeGeometry(4.0, 28.0, 4);
          sp.translate(0, 154, 0);
          return mergeGeometries([env, sp], T);
        },
      },
    ],
  };
}

/**
 * Showstopper: Grand Mansard Chateau Palace (40x32m, 22m high, twin pavilions & copper dormers)
 */
export function bldGrandChateau(seed = "chateau-0") {
  return {
    id: "bld-grand-chateau",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 40, d: 32 },
    height: 22.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Central Corps de Logis (24x20m, 12m wall)
          const corps = new T.BoxGeometry(24, 12, 20);
          corps.translate(0, 6, 0);
          // Central Mansard Roof
          const roof = new T.ConeGeometry(13.8, 6, 4);
          roof.rotateY(Math.PI / 4);
          roof.translate(0, 15, 0);
          parts.push(corps, roof);

          // Twin Symmetrical Pavilions (8x24m, 14m wall + 7m pyramidal mansards)
          for (const sx of [-16, 16]) {
            const pav = new T.BoxGeometry(8, 14, 24);
            pav.translate(sx, 7, 0);
            const pavRoof = new T.ConeGeometry(5.4, 7.5, 4);
            pavRoof.rotateY(Math.PI / 4);
            pavRoof.translate(sx, 17.75, 0);
            parts.push(pav, pavRoof);
          }

          // Grand Entrance Portico & Stone Balustrades
          const portico = new T.BoxGeometry(8, 6, 4);
          portico.translate(0, 3, 11);
          parts.push(portico);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 200,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(40, 12, 24);
          body.translate(0, 6, 0);
          const roof = new T.ConeGeometry(22, 9, 4);
          roof.rotateY(Math.PI / 4);
          roof.translate(0, 16.5, 0);
          return mergeGeometries([body, roof], T);
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const env = new T.BoxGeometry(40, 20, 28);
          env.translate(0, 10, 0);
          return env;
        },
      },
    ],
  };
}

/**
 * Showstopper: Stepped Waterfront Cascading Luxury Residence (32x48m, 28m high, tiered balconies)
 */
export function bldCascadingTerraces(seed = "cascade-0") {
  return {
    id: "bld-cascading-terraces",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 32, d: 48 },
    height: 28.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const parts = [];
          // 6 Stepped Cascading Terraces stepping back towards the water/view
          for (let i = 0; i < 6; i++) {
            const h = 4.5;
            const y = i * 4.5 + 2.25;
            const d = 42 - i * 6;
            const z = i * 3.5;
            const tier = new T.BoxGeometry(29.6, h, d);
            tier.translate(0, y, z);
            // Cantilevered glass balustrade lip
            const rail = new T.BoxGeometry(29.8, 0.9, 0.2);
            rail.translate(0, y + 2.25, z - d / 2 - 0.1);
            parts.push(tier, rail);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32, 26, 46);
          b.translate(0, 13, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(32, 26, 46);
          b.translate(0, 13, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// 2. CIVIC LANDMARKS: SHOWSTOPPERS
// =============================================================================

/**
 * Showstopper: Grand Gothic Cathedral (64x120m, 88m twin towers & rose window portal)
 */
export function civicGrandCathedral() {
  return {
    id: "civic-grand-cathedral",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 64, d: 120 },
    height: 88.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Main Nave (28x100m, 36m vault)
          const nave = new T.BoxGeometry(28, 36, 100);
          nave.translate(0, 18, -8);
          // Transept Cross Wing (60x28m, 36m vault)
          const transept = new T.BoxGeometry(60, 36, 28);
          transept.translate(0, 18, -16);
          parts.push(nave, transept);

          // Central Crossing Lantern Spire (88m)
          const spire = new T.ConeGeometry(5.5, 52.0, 8);
          spire.translate(0, 62.0, -16);
          parts.push(spire);

          // Twin West Front Towers (18x18m, 72m high each)
          for (const sx of [-18, 18]) {
            const tower = new T.BoxGeometry(18, 64, 18);
            tower.translate(sx, 32, 45);
            const tSpire = new T.ConeGeometry(8.5, 16.0, 8);
            tSpire.translate(sx, 72, 45);
            parts.push(tower, tSpire);
          }

          // Flying Buttresses along Nave flanks
          for (let z = -45; z <= 25; z += 14) {
            for (const sx of [-18, 18]) {
              const butt = new T.BoxGeometry(4.0, 28, 1.6);
              butt.translate(sx, 14, z);
              parts.push(butt);
            }
          }

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 96,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(56, 36, 110);
          body.translate(0, 18, 0);
          const sp = new T.ConeGeometry(8, 52, 6);
          sp.translate(0, 62, -16);
          return mergeGeometries([body, sp], T);
        },
      },
      {
        level: 2,
        tris: 24,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(56, 75, 110);
          b.translate(0, 37.5, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * Showstopper: Grand Beaux-Arts Central Railway Terminus (80x160m, 42m arched glass barrel train-shed)
 */
export function civicGrandTerminus() {
  return {
    id: "civic-grand-terminus",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 80, d: 160 },
    height: 50.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Beaux-Arts Front Concourse Headhouse (80x36m, 32m high)
          const headhouse = new T.BoxGeometry(78, 32, 36);
          headhouse.translate(0, 16, 60);
          // Clock Tower Campanile (12x12m, 48m high)
          const clockTower = new T.BoxGeometry(12, 44, 12);
          clockTower.translate(-30, 22, 60);
          const cap = new T.ConeGeometry(6.5, 8.0, 4);
          cap.rotateY(Math.PI / 4);
          cap.translate(-30, 46, 60);
          parts.push(headhouse, clockTower, cap);

          // Arched Glass & Iron Barrel Train-Shed (68x120m, 28m high vault)
          const shed = new T.CylinderGeometry(34, 34, 116, 16, 1, false, 0, Math.PI);
          shed.rotateZ(Math.PI / 2);
          shed.rotateY(Math.PI / 2);
          shed.translate(0, 14, -18);
          parts.push(shed);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 80,
        createGeometry: (T = THREE) => {
          const b1 = new T.BoxGeometry(78, 32, 36);
          b1.translate(0, 16, 60);
          const b2 = new T.BoxGeometry(68, 26, 116);
          b2.translate(0, 13, -18);
          return mergeGeometries([b1, b2], T);
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(80, 32, 160);
          b.translate(0, 16, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// 3. VEHICLES & TRANSIT: SHOWSTOPPERS
// =============================================================================

/**
 * Showstopper: High-Speed Bullet Train Articulated 3-Car Unit (3.2x72m, 4.2m high, aerodynamic nose)
 */
export function vehicleBulletTrain() {
  return {
    id: "vehicle-bullet-train",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 3.4, d: 72.0 },
    height: 4.5,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["open", "rail"],
    lod: [
      {
        level: 0,
        tris: 420,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Lead Car with Aerodynamic Needle Nose (24m)
          const lead = new T.BoxGeometry(3.2, 3.4, 20);
          lead.translate(0, 2.0, 22);
          const nose = new T.ConeGeometry(1.55, 6.0, 8);
          nose.rotateX(Math.PI / 2);
          nose.translate(0, 1.8, 33);
          parts.push(lead, nose);

          // Intermediate Coach Car (22m)
          const mid = new T.BoxGeometry(3.2, 3.4, 22);
          mid.translate(0, 2.0, 0);
          parts.push(mid);

          // Trailing Car with Pantograph (24m)
          const tail = new T.BoxGeometry(3.2, 3.4, 20);
          tail.translate(0, 2.0, -22);
          const tailNose = new T.ConeGeometry(1.55, 6.0, 8);
          tailNose.rotateX(-Math.PI / 2);
          tailNose.translate(0, 1.8, -33);
          // Pantograph frame
          const panto = new T.BoxGeometry(1.6, 0.8, 2.0);
          panto.translate(0, 4.1, -18);
          parts.push(tail, tailNose, panto);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 48,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.2, 3.4, 70);
          b.translate(0, 2.0, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(3.0, 3.2, 68);
          b.translate(0, 1.9, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// 4. MARITIME: SHOWSTOPPERS
// =============================================================================

/**
 * Showstopper: Ultra-Luxury Tri-Deck Superyacht with Helipad (10x54m, 16m high)
 */
export function vesselSuperyacht() {
  return {
    id: "vessel-superyacht",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 10.0, d: 54.0 },
    height: 16.5,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["water"],
    lod: [
      {
        level: 0,
        tris: 380,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Sleek flared hull with raked bow (9.6x52m, 4.5m freeboard)
          const hull = new T.BoxGeometry(9.4, 4.5, 48);
          hull.translate(0, 2.25, -2);
          const bow = new T.ConeGeometry(4.5, 7.0, 4);
          bow.rotateX(Math.PI / 2);
          bow.scale(1, 0.45, 1);
          bow.translate(0, 2.25, 23.2);
          parts.push(hull, bow);

          // Tier 1 Main Deck Salon
          const d1 = new T.BoxGeometry(8.2, 3.2, 32);
          d1.translate(0, 5.8, -4);
          // Tier 2 Bridge Deck
          const d2 = new T.BoxGeometry(7.0, 3.0, 22);
          d2.translate(0, 8.8, -2);
          // Tier 3 Sun Deck & Jacuzzi
          const d3 = new T.BoxGeometry(5.5, 2.4, 14);
          d3.translate(0, 11.4, -2);
          // Radar Arch Mast & Satcom Domes
          const mast = new T.BoxGeometry(1.2, 3.8, 3.2);
          mast.translate(0, 14.2, -4);
          // Bow Helipad Disc
          const helipad = new T.CylinderGeometry(4.0, 4.0, 0.2, 16);
          helipad.translate(0, 4.6, 16);

          parts.push(d1, d2, d3, mast, helipad);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const h = new T.BoxGeometry(9.4, 4.5, 52);
          h.translate(0, 2.25, 0);
          const s = new T.BoxGeometry(7.0, 7.0, 28);
          s.translate(0, 8.0, -3);
          return mergeGeometries([h, s], T);
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(9.4, 10, 52);
          b.translate(0, 5, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// 5. PARKS & CULTURE: SHOWSTOPPERS
// =============================================================================

/**
 * Showstopper: Victorian Botanical Palm House Crystal Palace (32x64m, 24m high arched ribbed vault)
 */
export function parkBotanicalPalmHouse() {
  return {
    id: "park-palm-house",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 32, d: 64 },
    height: 24.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Central Transept Glass Dome (28m diameter, 24m high)
          const dome = new T.SphereGeometry(14, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
          dome.translate(0, 10, 0);
          const drum = new T.CylinderGeometry(14, 14, 10, 16);
          drum.translate(0, 5, 0);
          parts.push(dome, drum);

          // Longitudinal Barrel-Vault Wings (18x56m, 14m vault)
          const wing = new T.CylinderGeometry(9, 9, 56, 12, 1, false, 0, Math.PI);
          wing.rotateZ(Math.PI / 2);
          wing.rotateY(Math.PI / 2);
          wing.translate(0, 8, 0);
          parts.push(wing);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(28, 18, 60);
          b.translate(0, 9, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(28, 18, 60);
          b.translate(0, 9, 0);
          return b;
        },
      },
    ],
  };
}

/**
 * Showstopper: Giant Observation Ferris Wheel (16x64m, 68m high, dual A-frame legs)
 */
export function parkObservationWheel() {
  return {
    id: "park-observation-wheel",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 20, d: 64 },
    height: 68.6,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Dual Support A-Frame Legs
          for (const sx of [-4.5, 4.5]) {
            const leg1 = new T.CylinderGeometry(0.6, 1.2, 42, 6);
            leg1.rotateX(0.25);
            leg1.translate(sx, 21.0, -5.0);
            const leg2 = new T.CylinderGeometry(0.6, 1.2, 42, 6);
            leg2.rotateX(-0.25);
            leg2.translate(sx, 21.0, 5.0);
            parts.push(leg1, leg2);
          }

          // Outer Wheel Rim (60m diameter, y: 38m)
          const rim = new T.TorusGeometry(30, 0.6, 8, 24);
          rim.rotateY(Math.PI / 2);
          rim.translate(0, 38, 0);
          parts.push(rim);

          // 12 Radial Tension Spokes
          for (let i = 0; i < 12; i++) {
            const rad = (i * Math.PI) / 6;
            const spoke = new T.CylinderGeometry(0.12, 0.12, 60, 4);
            spoke.rotateX(rad);
            spoke.translate(0, 38, 0);
            parts.push(spoke);
          }

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 200,
        createGeometry: (T = THREE) => {
          const rim = new T.TorusGeometry(30, 0.6, 6, 16);
          rim.rotateY(Math.PI / 2);
          rim.translate(0, 38, 0);
          return rim;
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(16, 68, 64);
          b.translate(0, 34, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// 6. BRIDGES & INFRASTRUCTURE: SHOWSTOPPERS
// =============================================================================

/**
 * Showstopper: Landmark Cable-Stayed Suspension Bridge Tower & Stay Array (36x120m, 96m pylon)
 */
export function bridgeCableStayedTower() {
  return {
    id: "bridge-cable-stayed-pylon",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 36, d: 120 },
    height: 96.0,
    clearance: 18.0, // Waterway navigation clearance
    origin: "base-centre",
    standsOn: ["water", "open"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Soaring Diamond A-Frame Pylon Tower (96m)
          const pylon1 = new T.CylinderGeometry(1.4, 3.8, 96, 6);
          pylon1.rotateZ(0.14);
          pylon1.translate(-6.5, 48, 0);
          const pylon2 = new T.CylinderGeometry(1.4, 3.8, 96, 6);
          pylon2.rotateZ(-0.14);
          pylon2.translate(6.5, 48, 0);
          // Upper Pylon Diamond Cross-Strut
          const strut = new T.BoxGeometry(18, 2.5, 3.0);
          strut.translate(0, 52, 0);
          parts.push(pylon1, pylon2, strut);

          // Roadway Aerodynamic Box Girder Deck (28x120m at y=20m)
          const deck = new T.BoxGeometry(28, 3.6, 120);
          deck.translate(0, 20, 0);
          parts.push(deck);

          // Fan of 8 High-Tension Stay Cables radiating from pylon top to deck
          for (let i = 1; i <= 4; i++) {
            const dz = i * 8.0;
            const cable1 = new T.BoxGeometry(0.12, 48, 0.12);
            cable1.rotateX(0.3 + i * 0.08);
            cable1.translate(0, 56, dz);
            const cable2 = new T.BoxGeometry(0.12, 48, 0.12);
            cable2.rotateX(-(0.3 + i * 0.08));
            cable2.translate(0, 56, -dz);
            parts.push(cable1, cable2);
          }

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const p = new T.BoxGeometry(18, 96, 4);
          p.translate(0, 48, 0);
          const d = new T.BoxGeometry(28, 3.6, 120);
          d.translate(0, 20, 0);
          return mergeGeometries([p, d], T);
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(28, 96, 120);
          b.translate(0, 48, 0);
          return b;
        },
      },
    ],
  };
}

export const SHOWSTOPPERS = {
  "bld-artdeco-spire": bldArtDecoSpire(),
  "bld-grand-chateau": bldGrandChateau(),
  "bld-cascading-terraces": bldCascadingTerraces(),
  "civic-grand-cathedral": civicGrandCathedral(),
  "civic-grand-terminus": civicGrandTerminus(),
  "vehicle-bullet-train": vehicleBulletTrain(),
  "vessel-superyacht": vesselSuperyacht(),
  "park-palm-house": parkBotanicalPalmHouse(),
  "park-observation-wheel": parkObservationWheel(),
  "bridge-cable-stayed-pylon": bridgeCableStayedTower(),
};





// =============================================================================
// RESIDENTIAL ECO SHOWSTOPPERS (5 Models)
// =============================================================================

export function bldEcoBoscoVerticale() {
  return {
    id: "bld-eco-bosco-verticale",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 40, d: 40 },
    height: 112.0,
    clearance: 0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Main tower core (28x28m, 108m high)
          const core = new T.BoxGeometry(28, 108, 28);
          core.translate(0, 54, 0);
          parts.push(core);

          // 14 Staggered Cantilevered Green Planter Balconies on 4 faces
          for (let i = 1; i <= 14; i++) {
            const y = i * 7.2;
            const side = (i % 2 === 0) ? 1 : -1;
            // North/South Balcony
            const bNS = new T.BoxGeometry(36, 1.2, 5.0);
            bNS.translate(0, y, side * 16);
            // Green foliage box
            const fNS = new T.BoxGeometry(34, 1.8, 3.8);
            fNS.translate(0, y + 1.2, side * 16);
            // East/West Balcony
            const bEW = new T.BoxGeometry(5.0, 1.2, 36);
            bEW.translate(-side * 16, y + 3.6, 0);
            const fEW = new T.BoxGeometry(3.8, 1.8, 34);
            fEW.translate(-side * 16, y + 4.8, 0);
            parts.push(bNS, fNS, bEW, fEW);
          }

          // Rooftop Pergola Arboretum
          const pergola = new T.BoxGeometry(26, 4.0, 26);
          pergola.translate(0, 110, 0);
          parts.push(pergola);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 88,
        createGeometry: (T = THREE) => {
          const body = new T.BoxGeometry(34, 110, 34);
          body.translate(0, 55, 0);
          return body;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(34, 112, 34);
          b.translate(0, 56, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoCurvedRibbonVilla() {
  return {
    id: "bld-eco-curved-ribbon-villa",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 24, d: 32 },
    height: 12.0,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 440,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Lower Ground Pod
          const pod1 = new T.CylinderGeometry(10, 11, 4.5, 16);
          pod1.scale(1.0, 1.0, 1.3);
          pod1.translate(0, 2.25, 0);
          parts.push(pod1);

          // Upper Fluid Ribbon (Cantilevered Sweeping Floor)
          const ribbon = new T.CylinderGeometry(11, 10, 4.5, 16);
          ribbon.scale(0.9, 1.0, 1.2);
          ribbon.translate(0, 6.75, 2.0);
          parts.push(ribbon);

          // Sinuous Green Roof Parapet & Solar Pergola
          const roofGarden = new T.CylinderGeometry(9.5, 9.5, 1.0, 16);
          roofGarden.scale(0.9, 1.0, 1.2);
          roofGarden.translate(0, 9.5, 2.0);
          const pergola = new T.BoxGeometry(14, 2.0, 16);
          pergola.translate(0, 11.0, 2.0);
          parts.push(roofGarden, pergola);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22, 12, 30);
          b.translate(0, 6, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(22, 12, 30);
          b.translate(0, 6, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoStepGardenWalkup() {
  return {
    id: "bld-eco-step-garden-walkup",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 32, d: 48 },
    height: 24.0,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const parts = [];
          // 5 Cascading stepped residential tiers
          for (let i = 0; i < 5; i++) {
            const y = i * 4.4 + 2.2;
            const d = 44 - i * 7.5;
            const z = i * 3.6;
            const tier = new T.BoxGeometry(28, 4.4, d);
            tier.translate(0, y, z);
            // Green balcony planter ledge
            const planter = new T.BoxGeometry(28, 0.8, 1.6);
            planter.translate(0, y + 2.0, z - d / 2 + 0.8);
            parts.push(tier, planter);
          }
          const pergola = new T.BoxGeometry(24, 2.0, 12);
          pergola.translate(0, 23.0, 14);
          parts.push(pergola);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30, 24, 46);
          b.translate(0, 12, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30, 24, 46);
          b.translate(0, 12, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoBiophilicTownhouseRow() {
  return {
    id: "bld-eco-biophilic-townhouse-row",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 24, d: 24 },
    height: 16.0,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 460,
        createGeometry: (T = THREE) => {
          const parts = [];
          for (let i = 0; i < 3; i++) {
            const ux = -8 + i * 8;
            // Unit Body
            const body = new T.BoxGeometry(7.6, 12, 20);
            body.translate(ux, 6, 0);
            // Vertical Green Timber Screen
            const screen = new T.BoxGeometry(7.2, 10, 0.4);
            screen.translate(ux, 6, 10.2);
            // Rooftop Green Solarium Greenhouse
            const solarium = new T.BoxGeometry(6.4, 3.8, 12);
            solarium.translate(ux, 14, -2.0);
            parts.push(body, screen, solarium);
          }
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24, 16, 22);
          b.translate(0, 8, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(24, 16, 22);
          b.translate(0, 8, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoHelixTerrace() {
  return {
    id: "bld-eco-helix-terrace",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 32, d: 32 },
    height: 28.0,
    clearance: 0.5,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 520,
        createGeometry: (T = THREE) => {
          const parts = [];
          // 7 Interlocking Rotated Quadrant Floor Plates with Sky Garden Balconies
          for (let i = 0; i < 7; i++) {
            const y = i * 3.8 + 1.9;
            const rot = i * 0.15;
            const floor = new T.BoxGeometry(20, 3.4, 20);
            floor.rotateY(rot);
            floor.translate(0, y, 0);
            // Garden corner protrusion
            const garden = new T.BoxGeometry(5.0, 1.2, 5.0);
            garden.rotateY(rot);
            garden.translate(Math.cos(rot) * 9.5, y + 1.2, Math.sin(rot) * 9.5);
            parts.push(floor, garden);
          }
          const crown = new T.CylinderGeometry(10, 12, 1.4, 12);
          crown.translate(0, 27.3, 0);
          parts.push(crown);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 80,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30, 28, 30);
          b.translate(0, 14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(30, 28, 30);
          b.translate(0, 14, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// COMMERCIAL / OFFICE ECO SHOWSTOPPERS (5 Models)
// =============================================================================

export function bldEcoDiagridBiotower() {
  return {
    id: "bld-eco-diagrid-biotower",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 48, d: 48 },
    height: 144.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Podium (44x44m, 16m high)
          const pod = new T.CylinderGeometry(22, 23, 16, 16);
          pod.translate(0, 8, 0);
          parts.push(pod);

          // 4 Main Diagrid Twisted Shaft Sections with Atrium Hollow
          for (let i = 0; i < 4; i++) {
            const y = 16 + i * 28 + 14;
            const rTop = 20 - i * 1.5;
            const rBot = 22 - i * 1.5;
            const sec = new T.CylinderGeometry(rTop, rBot, 28, 16);
            sec.rotateY(i * 0.2);
            sec.translate(0, y, 0);
            parts.push(sec);
          }

          // Sky Garden Atrium Crown
          const crown = new T.CylinderGeometry(12, 15, 16, 16);
          crown.translate(0, 136, 0);
          parts.push(crown);

          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 96,
        createGeometry: (T = THREE) => {
          const b = new T.CylinderGeometry(15, 23, 144, 12);
          b.translate(0, 72, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(44, 144, 44);
          b.translate(0, 72, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoHyperboloidTimberHQ() {
  return {
    id: "bld-eco-hyperboloid-timber-hq",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 48, d: 64 },
    height: 36.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Base campus podium
          const pod = new T.BoxGeometry(44, 12, 58);
          pod.translate(0, 6, 0);
          // Hyperbolic curved timber shell
          const shell = new T.CylinderGeometry(20, 24, 20, 16);
          shell.scale(1.0, 1.0, 1.3);
          shell.translate(0, 22, 0);
          // Undulating Sedum green roof canopy
          const sedumRoof = new T.CylinderGeometry(18, 20, 4, 16);
          sedumRoof.scale(1.0, 1.0, 1.3);
          sedumRoof.translate(0, 34, 0);
          parts.push(pod, shell, sedumRoof);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 72,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(44, 36, 60);
          b.translate(0, 18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(44, 36, 60);
          b.translate(0, 18, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoFloatingCanopyHub() {
  return {
    id: "bld-eco-floating-canopy-hub",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 40, d: 56 },
    height: 32.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 480,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Elevated Glass Pod Body (y: 6 - 26m)
          const pod = new T.BoxGeometry(34, 20, 46);
          pod.translate(0, 16, -2.0);
          // Cantilevered Solar Aerofoil Wing (y: 26 - 32m)
          const wing = new T.BoxGeometry(38, 2.5, 54);
          wing.translate(0, 28, 0);
          const solarLip = new T.BoxGeometry(36, 1.5, 52);
          solarLip.translate(0, 30.5, 0);
          // Ground Sculptural Columns
          for (const cx of [-12, 12]) {
            for (const cz of [-16, 16]) {
              const col = new T.CylinderGeometry(1.2, 1.8, 6.0, 8);
              col.translate(cx, 3.0, cz);
              parts.push(col);
            }
          }
          parts.push(pod, wing, solarLip);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 64,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38, 32, 54);
          b.translate(0, 16, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(38, 32, 54);
          b.translate(0, 16, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoSolarSpire() {
  return {
    id: "bld-eco-solar-spire",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 40, d: 40 },
    height: 160.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 560,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Tapered 4-facet Photovoltaic tower shaft (4 tiers)
          for (let i = 0; i < 4; i++) {
            const y = i * 36 + 18;
            const wBot = 36 - i * 5;
            const wTop = 31 - i * 5;
            const tier = new T.CylinderGeometry(wTop / 2, wBot / 2, 36, 4);
            tier.rotateY(Math.PI / 4);
            tier.translate(0, y, 0);
            parts.push(tier);
          }
          // Spire Tip & Wind Cowl
          const spire = new T.ConeGeometry(3.0, 16.0, 4);
          spire.rotateY(Math.PI / 4);
          spire.translate(0, 152, 0);
          parts.push(spire);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 88,
        createGeometry: (T = THREE) => {
          const b = new T.ConeGeometry(18, 160, 4);
          b.rotateY(Math.PI / 4);
          b.translate(0, 80, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(36, 160, 36);
          b.translate(0, 80, 0);
          return b;
        },
      },
    ],
  };
}

export function bldEcoGreenPodOffice() {
  return {
    id: "bld-eco-green-pod-office",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 48, d: 48 },
    height: 28.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const parts = [];
          // 4 Elevated Circular Pods on Stems
          const coords = [[-12, -12], [12, -12], [-12, 12], [12, 12]];
          for (const [cx, cz] of coords) {
            const stem = new T.CylinderGeometry(2.0, 3.0, 8.0, 8);
            stem.translate(cx, 4.0, cz);
            const pod = new T.CylinderGeometry(9.0, 8.0, 16.0, 12);
            pod.translate(cx, 16.0, cz);
            const greenCap = new T.CylinderGeometry(8.0, 9.0, 2.0, 12);
            greenCap.translate(cx, 25.0, cz);
            parts.push(stem, pod, greenCap);
          }
          // Connecting Cross Skybridge (y: 16m)
          const bridgeX = new T.BoxGeometry(32, 3.2, 4.0);
          bridgeX.translate(0, 16.0, 0);
          const bridgeZ = new T.BoxGeometry(4.0, 3.2, 32);
          bridgeZ.translate(0, 16.0, 0);
          parts.push(bridgeX, bridgeZ);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 80,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(44, 28, 44);
          b.translate(0, 14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(44, 28, 44);
          b.translate(0, 14, 0);
          return b;
        },
      },
    ],
  };
}

// =============================================================================
// CIVIC / CULTURAL / MIXED-USE ECO SHOWSTOPPERS (5 Models)
// =============================================================================

export function civicEcoOperaFlow() {
  return {
    id: "civic-eco-opera-flow",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 64, d: 96 },
    height: 36.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Sculptural Sinuous Primary Shell (Auditorium 1)
          const shell1 = new T.CylinderGeometry(16, 20, 28, 16);
          shell1.scale(1.0, 1.0, 1.25);
          shell1.translate(0, 14, -12);
          // Secondary Shell (Auditorium 2)
          const shell2 = new T.CylinderGeometry(12, 16, 20, 16);
          shell2.scale(1.0, 1.0, 1.25);
          shell2.translate(0, 10, 18);
          // Walkable Landscaped Green Ramp Concourse
          const ramp = new T.BoxGeometry(58, 3.0, 80);
          ramp.rotateX(-0.04);
          ramp.translate(0, 3.2, 0);
          parts.push(shell1, shell2, ramp);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 96,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60, 36, 92);
          b.translate(0, 18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60, 36, 92);
          b.translate(0, 18, 0);
          return b;
        },
      },
    ],
  };
}

export function civicEcoBiomeDome() {
  return {
    id: "civic-eco-biome-dome",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 64, d: 64 },
    height: 42.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 540,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Central Grand Geodesic Dome (56m dia, 38m high)
          const dome = new T.SphereGeometry(28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
          dome.scale(1.0, 1.35, 1.0);
          dome.translate(0, 0, 0);
          // Surrounding Ring Canopy
          const ring = new T.CylinderGeometry(30, 31, 4.0, 16);
          ring.translate(0, 2.0, 0);
          parts.push(dome, ring);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 88,
        createGeometry: (T = THREE) => {
          const dome = new T.SphereGeometry(28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
          dome.scale(1.0, 1.35, 1.0);
          return dome;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(58, 42, 58);
          b.translate(0, 21, 0);
          return b;
        },
      },
    ],
  };
}

export function civicEcoWaveLibrary() {
  return {
    id: "civic-eco-wave-library",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 48, d: 72 },
    height: 28.0,
    clearance: 1.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 500,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Main library podium
          const body = new T.BoxGeometry(44, 16, 66);
          body.translate(0, 8, 0);
          // Parametric Wave Timber Roof
          const wave1 = new T.CylinderGeometry(14, 18, 6.0, 16);
          wave1.scale(1.0, 1.0, 1.15);
          wave1.translate(0, 19, -10);
          const wave2 = new T.CylinderGeometry(12, 16, 8.0, 16);
          wave2.scale(1.0, 1.0, 1.15);
          wave2.translate(0, 22, 12);
          parts.push(body, wave1, wave2);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 80,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(46, 28, 68);
          b.translate(0, 14, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 12,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(46, 28, 68);
          b.translate(0, 14, 0);
          return b;
        },
      },
    ],
  };
}

export function civicEcoSportsArena() {
  return {
    id: "civic-eco-sports-arena",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 80, d: 96 },
    height: 36.0,
    clearance: 2.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 580,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Elliptical Stadium Bowl (74x90m, 24m high)
          const bowl = new T.CylinderGeometry(34, 38, 24, 16);
          bowl.scale(1.0, 1.0, 1.2);
          bowl.translate(0, 12, 0);
          // Floating Solar Petal Canopy Ring (y: 24 - 36m)
          const canopy = new T.CylinderGeometry(36, 32, 10, 16);
          canopy.scale(1.0, 1.0, 1.22);
          canopy.translate(0, 29, 0);
          parts.push(bowl, canopy);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 96,
        createGeometry: (T = THREE) => {
          const b = new T.CylinderGeometry(36, 38, 36, 12);
          b.scale(1.0, 1.0, 1.2);
          b.translate(0, 18, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(76, 36, 92);
          b.translate(0, 18, 0);
          return b;
        },
      },
    ],
  };
}

export function civicEcoHydroTransitTerminal() {
  return {
    id: "civic-eco-hydro-transit-terminal",
    tier: "showstopper",
    kind: "hard",
    footprint: { w: 64, d: 112 },
    height: 32.0,
    clearance: 2.0,
    origin: "base-centre",
    standsOn: ["plot", "open"],
    lod: [
      {
        level: 0,
        tris: 560,
        createGeometry: (T = THREE) => {
          const parts = [];
          // Grand Concourse Vault (58x104m, 26m high)
          const vault = new T.CylinderGeometry(26, 30, 26, 16);
          vault.scale(1.0, 1.0, 1.8);
          vault.translate(0, 13, 0);
          // Green Rooftop Living Sedum Canopy with Clerestory Skylights
          const roof = new T.BoxGeometry(60, 4.0, 106);
          roof.translate(0, 28, 0);
          // Transit Dock Piers (South)
          const pier = new T.BoxGeometry(20, 2.0, 14);
          pier.translate(0, 1.0, 46);
          parts.push(vault, roof, pier);
          return mergeGeometries(parts, T);
        },
      },
      {
        level: 1,
        tris: 88,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60, 32, 108);
          b.translate(0, 16, 0);
          return b;
        },
      },
      {
        level: 2,
        tris: 16,
        createGeometry: (T = THREE) => {
          const b = new T.BoxGeometry(60, 32, 108);
          b.translate(0, 16, 0);
          return b;
        },
      },
    ],
  };
}
