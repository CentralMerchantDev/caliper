import * as THREE from 'three';
import { tagGeometry, mergeGeometries, normalizeGeometry } from '../public/tier-models.js';

function countTris(geom) {
  if (!geom) return 0;
  if (geom.index) return geom.index.count / 3;
  if (geom.attributes.position) return geom.attributes.position.count / 3;
  return 0;
}

// Prototype Tier B (~3,000 tris)
export function createTierB_LOD0(T = THREE) {
  const geoms = [];

  // 1. Base / Podium (h: 0 to 28m)
  const plinth = new T.BoxGeometry(42, 6, 42);
  plinth.translate(0, 3, 0);
  tagGeometry(plinth, 0.38, 0.36, 0.34, T);
  geoms.push(plinth);

  const podMid = new T.BoxGeometry(39, 12, 39);
  podMid.translate(0, 12, 0);
  tagGeometry(podMid, 0.74, 0.72, 0.68, T);
  geoms.push(podMid);

  const podTop = new T.BoxGeometry(36, 10, 36);
  podTop.translate(0, 23, 0);
  tagGeometry(podTop, 0.78, 0.76, 0.72, T);
  geoms.push(podTop);

  // Multi-layered Stepped Archway Portal
  for (let step = 0; step < 4; step++) {
    const w = 15 - step * 2.2;
    const h = 18 - step * 2.2;
    const d = 1.2;
    const archFrame = new T.BoxGeometry(w, h, d);
    archFrame.translate(0, 3 + h / 2, 19.5 + step * 0.8);
    tagGeometry(archFrame, 0.75 - step * 0.08, 0.60 - step * 0.08, 0.32 - step * 0.04, T);
    geoms.push(archFrame);
  }

  const doorVoid = new T.BoxGeometry(5.5, 7, 2);
  doorVoid.translate(0, 3.5, 18.5);
  tagGeometry(doorVoid, 0.15, 0.15, 0.18, T);
  geoms.push(doorVoid);

  const marqueeCanopy = new T.BoxGeometry(10, 1.2, 4.5);
  marqueeCanopy.translate(0, 8.5, 22.5);
  tagGeometry(marqueeCanopy, 0.40, 0.58, 0.52, T);
  geoms.push(marqueeCanopy);

  // Podium Colonnade with fluted pilasters (20 fluted piers)
  for (let i = -3; i <= 3; i++) {
    if (i !== 0) {
      const pierF = new T.BoxGeometry(1.4, 20, 1.0);
      pierF.translate(i * 5.2, 13, 19.8);
      tagGeometry(pierF, 0.84, 0.82, 0.78, T);
      geoms.push(pierF);

      const pierB = new T.BoxGeometry(1.4, 20, 1.0);
      pierB.translate(i * 5.2, 13, -19.8);
      tagGeometry(pierB, 0.84, 0.82, 0.78, T);
      geoms.push(pierB);
    }
  }
  for (let i = -2; i <= 2; i++) {
    const pierL = new T.BoxGeometry(1.0, 20, 1.4);
    pierL.translate(-19.8, 13, i * 6.5);
    tagGeometry(pierL, 0.84, 0.82, 0.78, T);
    geoms.push(pierL);

    const pierR = new T.BoxGeometry(1.0, 20, 1.4);
    pierR.translate(19.8, 13, i * 6.5);
    tagGeometry(pierR, 0.84, 0.82, 0.78, T);
    geoms.push(pierR);
  }

  // 4 Corner Pylons & Stepped Obelisks
  for (const [bx, bz] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) {
    const pylonBase = new T.BoxGeometry(4.5, 8, 4.5);
    pylonBase.translate(bx, 28, bz);
    tagGeometry(pylonBase, 0.70, 0.68, 0.65, T);
    geoms.push(pylonBase);

    const obelisk = new T.CylinderGeometry(0.8, 2.0, 8, 8);
    obelisk.translate(bx, 36, bz);
    tagGeometry(obelisk, 0.82, 0.75, 0.45, T);
    geoms.push(obelisk);
  }

  // 2. Lower Shaft (h: 28 to 85m)
  const shaft1 = new T.BoxGeometry(32, 57, 32);
  shaft1.translate(0, 56.5, 0);
  tagGeometry(shaft1, 0.78, 0.76, 0.72, T);
  geoms.push(shaft1);

  for (const [bx, bz] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) {
    const chamfer = new T.BoxGeometry(5, 55, 5);
    chamfer.translate(bx, 55.5, bz);
    tagGeometry(chamfer, 0.72, 0.70, 0.66, T);
    geoms.push(chamfer);
  }

  // 24 Full-Height Fluted Vertical Ribs (6 ribs per face)
  for (const dir of [-1, 1]) {
    for (const offset of [-11, -6.6, -2.2, 2.2, 6.6, 11]) {
      const ribZ = new T.BoxGeometry(1.0, 56, 0.6);
      ribZ.translate(offset, 56.5, dir * 16.3);
      tagGeometry(ribZ, 0.86, 0.84, 0.80, T);
      geoms.push(ribZ);

      const ribX = new T.BoxGeometry(0.6, 56, 1.0);
      ribX.translate(dir * 16.3, 56.5, offset);
      tagGeometry(ribX, 0.86, 0.84, 0.80, T);
      geoms.push(ribX);
    }
  }

  // Spandrel Panels (4 floors x 4 offsets = 32 spandrels)
  for (const floor of [0, 1, 2, 3]) {
    const yFloor = 38 + floor * 12;
    for (const dir of [-1, 1]) {
      for (const offset of [-6.6, -2.2, 2.2, 6.6]) {
        const spandrelZ = new T.BoxGeometry(2.4, 1.4, 0.35);
        spandrelZ.translate(offset, yFloor, dir * 16.1);
        tagGeometry(spandrelZ, 0.65, 0.52, 0.32, T);
        geoms.push(spandrelZ);

        const spandrelX = new T.BoxGeometry(0.35, 1.4, 2.4);
        spandrelX.translate(dir * 16.1, yFloor, offset);
        tagGeometry(spandrelX, 0.65, 0.52, 0.32, T);
        geoms.push(spandrelX);
      }
    }
  }

  // 3. Mid Tower Setback (h: 85 to 125m)
  const shaft2 = new T.BoxGeometry(25, 40, 25);
  shaft2.translate(0, 105, 0);
  tagGeometry(shaft2, 0.78, 0.76, 0.72, T);
  geoms.push(shaft2);

  // 16 Mid Tower Vertical Ribs (4 per face)
  for (const dir of [-1, 1]) {
    for (const offset of [-7.5, -2.5, 2.5, 7.5]) {
      const ribZ = new T.BoxGeometry(1.1, 39, 0.7);
      ribZ.translate(offset, 105, dir * 12.8);
      tagGeometry(ribZ, 0.88, 0.86, 0.82, T);
      geoms.push(ribZ);

      const ribX = new T.BoxGeometry(0.7, 39, 1.1);
      ribX.translate(dir * 12.8, 105, offset);
      tagGeometry(ribX, 0.88, 0.86, 0.82, T);
      geoms.push(ribX);
    }
  }

  for (const [bx, bz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    const wing = new T.BoxGeometry(3.5, 36, 3.5);
    wing.translate(bx, 103, bz);
    tagGeometry(wing, 0.70, 0.68, 0.65, T);
    geoms.push(wing);
  }

  // Mid Spandrels (2 bands x 2 bays)
  for (const floor of [0, 1]) {
    const yFloor = 95 + floor * 15;
    for (const dir of [-1, 1]) {
      for (const offset of [-2.5, 2.5]) {
        const spZ = new T.BoxGeometry(2.6, 1.5, 0.4);
        spZ.translate(offset, yFloor, dir * 12.7);
        tagGeometry(spZ, 0.65, 0.52, 0.32, T);
        geoms.push(spZ);

        const spX = new T.BoxGeometry(0.4, 1.5, 2.6);
        spX.translate(dir * 12.7, yFloor, offset);
        tagGeometry(spX, 0.65, 0.52, 0.32, T);
        geoms.push(spX);
      }
    }
  }

  // 4. Upper Tower & Crown (h: 125 to 205m)
  const shaft3 = new T.BoxGeometry(18, 17, 18);
  shaft3.translate(0, 133.5, 0);
  tagGeometry(shaft3, 0.80, 0.78, 0.74, T);
  geoms.push(shaft3);

  // Upper vertical ribs (4 per face = 16 ribs)
  for (const dir of [-1, 1]) {
    for (const offset of [-6, -2, 2, 6]) {
      const ribZ = new T.BoxGeometry(1.0, 16, 0.6);
      ribZ.translate(offset, 133.5, dir * 9.3);
      tagGeometry(ribZ, 0.88, 0.86, 0.82, T);
      geoms.push(ribZ);

      const ribX = new T.BoxGeometry(0.6, 16, 1.0);
      ribX.translate(dir * 9.3, 133.5, offset);
      tagGeometry(ribX, 0.88, 0.86, 0.82, T);
      geoms.push(ribX);
    }
  }

  // 6-Tier Stepped Ziggurat Crown
  for (let t = 0; t < 6; t++) {
    const size = 16 - t * 2.2;
    const h = 2.5;
    const tier = new T.BoxGeometry(size, h, size);
    tier.translate(0, 142 + t * 2.5 + h / 2, 0);
    const metalness = t / 5;
    tagGeometry(tier, 0.78 + metalness * 0.12, 0.76 + metalness * 0.14, 0.72 + metalness * 0.20, T);
    geoms.push(tier);

    // Chevron Sunburst arches/fins on each tier (4 fins per tier)
    for (const dir of [-1, 1]) {
      const finZ = new T.BoxGeometry(size * 0.7, h * 0.85, 0.5);
      finZ.translate(0, 142 + t * 2.5 + h / 2, dir * (size / 2 + 0.3));
      tagGeometry(finZ, 0.90, 0.92, 0.95, T);
      geoms.push(finZ);

      const finX = new T.BoxGeometry(0.5, h * 0.85, size * 0.7);
      finX.translate(dir * (size / 2 + 0.3), 142 + t * 2.5 + h / 2, 0);
      tagGeometry(finX, 0.90, 0.92, 0.95, T);
      geoms.push(finX);
    }
  }

  // Fluted Lantern Chamber (segs = 16, 2 tiers)
  const lantern1 = new T.CylinderGeometry(4.5, 6.0, 5, 16);
  lantern1.translate(0, 159.5, 0);
  tagGeometry(lantern1, 0.75, 0.60, 0.30, T);
  geoms.push(lantern1);

  const lantern2 = new T.CylinderGeometry(3.5, 4.5, 5, 16);
  lantern2.translate(0, 164.5, 0);
  tagGeometry(lantern2, 0.82, 0.70, 0.35, T);
  geoms.push(lantern2);

  // 8 Corner Eagle Gargoyles / Radiating Fins around Lantern
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const gx = Math.cos(angle) * 5.5;
    const gz = Math.sin(angle) * 5.5;
    const gargoyle = new T.ConeGeometry(0.7, 3.5, 6);
    gargoyle.rotateZ(Math.PI / 4 * Math.cos(angle));
    gargoyle.rotateX(Math.PI / 4 * Math.sin(angle));
    gargoyle.translate(gx, 162, gz);
    tagGeometry(gargoyle, 0.92, 0.92, 0.95, T);
    geoms.push(gargoyle);
  }

  // 4-Stage Chrome Spire & Radiating Mast
  const spireBase = new T.CylinderGeometry(2.0, 3.5, 12, 16);
  spireBase.translate(0, 173, 0);
  tagGeometry(spireBase, 0.90, 0.92, 0.96, T);
  geoms.push(spireBase);

  const spireMid1 = new T.CylinderGeometry(1.2, 2.0, 12, 16);
  spireMid1.translate(0, 185, 0);
  tagGeometry(spireMid1, 0.92, 0.94, 0.97, T);
  geoms.push(spireMid1);

  const spireMid2 = new T.ConeGeometry(1.2, 14, 12);
  spireMid2.translate(0, 198, 0);
  tagGeometry(spireMid2, 0.95, 0.96, 0.99, T);
  geoms.push(spireMid2);

  const spireTip = new T.CylinderGeometry(0.2, 0.5, 12, 8);
  spireTip.translate(0, 211, 0);
  tagGeometry(spireTip, 0.98, 0.98, 1.0, T);
  geoms.push(spireTip);

  const beacon = new T.SphereGeometry(0.8, 12, 12);
  beacon.translate(0, 217.5, 0);
  tagGeometry(beacon, 1.0, 0.88, 0.35, T);
  geoms.push(beacon);

  return mergeGeometries(geoms, T);
}

const geomB = createTierB_LOD0();
console.log('Tier B LOD0 triangles:', countTris(geomB));
