// THE SHARED PIECE LIST -- extracted from look-proof-scene.html for I2
// (docs/briefs/OVERNIGHT-BLD-2026-09-14.md), so the overview's massing
// bake reads the SAME 20 pieces L12 already proved rather than a second,
// independently-typed list that could drift from it. BUILD-LOOP.md's own
// opening names this exact failure shape: "two tables that must agree,
// kept in two places."
import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/addons/loaders/GLTFLoader.js";

// L12 -- 20 pieces, not 200. R2/C1.5 both say start far lower than
// instinct: Firewatch shipped 23 unique tree models for its entire game;
// Caravan SandWitch's entire foliage is 39 props. Three real CC0 packs,
// spanning 6 of C1.1's 8 footprint classes including 8x8.
export const PIECES = [
  { id: "house-2x3", glb: "vendor/kits/kenney-modular-buildings/building-sample-house-b.glb", footprint: [8, 12], layer: 0 },
  { id: "house-2x2", glb: "vendor/kits/kenney-modular-buildings/building-sample-house-a.glb", footprint: [8, 8], layer: 0 },
  { id: "house-2x3-alt", glb: "vendor/kits/kenney-modular-buildings/building-sample-house-c.glb", footprint: [8, 12], layer: 0 },
  { id: "midrise-4x4", glb: "vendor/kits/kenney-modular-buildings/building-sample-tower-b.glb", footprint: [16, 16], layer: 0 },
  { id: "midrise-4x4-alt", glb: "vendor/kits/kenney-modular-buildings/building-sample-tower-a.glb", footprint: [16, 16], layer: 0 },
  { id: "tower-base-6x6", glb: "vendor/kits/kenney-modular-buildings/building-sample-tower-d.glb", footprint: [24, 24], layer: 0 },
  { id: "tower-base-6x6-alt", glb: "vendor/kits/kenney-modular-buildings/building-sample-tower-c.glb", footprint: [24, 24], layer: 0 },
  { id: "street-tile-4wide", glb: "vendor/kits/kenney-city-kit-roads/road-straight.glb", footprint: [16, 16], layer: 1 },
  { id: "street-bend", glb: "vendor/kits/kenney-city-kit-roads/road-bend.glb", footprint: [16, 16], layer: 1 },
  { id: "street-crossing", glb: "vendor/kits/kenney-city-kit-roads/road-crossing.glb", footprint: [16, 16], layer: 1 },
  { id: "street-lamp-1x1", glb: "vendor/kits/kenney-city-kit-roads/light-square.glb", footprint: [4, 4], layer: 1 },
  { id: "utility-pole-1x1", glb: "vendor/kits/kenney-city-kit-roads/electricity-pole.glb", footprint: [4, 4], layer: 1 },
  { id: "dumpster-1x1", glb: "vendor/kits/kenney-city-kit-roads/dumpster.glb", footprint: [4, 4], layer: 1 },
  { id: "commercial-2x2", glb: "vendor/kits/kenney-city-kit-commercial/building-a.glb", footprint: [8, 8], layer: 2 },
  { id: "commercial-2x2-alt", glb: "vendor/kits/kenney-city-kit-commercial/building-e.glb", footprint: [8, 8], layer: 2 },
  { id: "commercial-3x3", glb: "vendor/kits/kenney-city-kit-commercial/building-f.glb", footprint: [12, 12], layer: 2 },
  { id: "commercial-4x4", glb: "vendor/kits/kenney-city-kit-commercial/building-j.glb", footprint: [16, 16], layer: 2 },
  { id: "mega-tower-8x8", glb: "vendor/kits/kenney-city-kit-commercial/building-skyscraper-b.glb", footprint: [32, 32], layer: 2 },
  { id: "awning-1x1", glb: "vendor/kits/kenney-city-kit-commercial/detail-awning.glb", footprint: [4, 4], layer: 2 },
  { id: "parasol-1x1", glb: "vendor/kits/kenney-city-kit-commercial/detail-parasol-a.glb", footprint: [4, 4], layer: 2 },
];

// A shelf packer, not a hand-picked grid -- deterministic from PIECES'
// own order, so adding a 21st piece later never requires re-deriving 20
// existing anchor coordinates by hand. Each piece's ANCHOR is its own
// corner on the ground plane (G1), never its centre.
export const LAYOUT_GAP = 2; // metres between pieces
export const LAYOUT_ROW_WIDTH = 76; // metres before wrapping to a new row
export function layoutPieces(pieces) {
  let cursorX = 0, cursorZ = 0, rowDepth = 0;
  for (const p of pieces) {
    const [w, d] = p.footprint;
    if (cursorX > 0 && cursorX + w > LAYOUT_ROW_WIDTH) {
      cursorX = 0;
      cursorZ += rowDepth + LAYOUT_GAP;
      rowDepth = 0;
    }
    p.anchor = [cursorX, cursorZ];
    cursorX += w + LAYOUT_GAP;
    rowDepth = Math.max(rowDepth, d);
  }
  const totalDepth = cursorZ + rowDepth;
  return { totalWidth: LAYOUT_ROW_WIDTH, totalDepth };
}
export const LAYOUT_BOUNDS = layoutPieces(PIECES);
export const GROUND = {
  footprint: [LAYOUT_BOUNDS.totalWidth + 8, LAYOUT_BOUNDS.totalDepth + 8],
  anchor: [-4, -4],
  layer: 3,
};

const loader = new GLTFLoader();
export function loadPieceGeometry(glbPath) {
  return loader.loadAsync(glbPath).then((gltf) => {
    let geom = null;
    gltf.scene.traverse((obj) => {
      if (!geom && obj.isMesh) geom = obj.geometry;
    });
    if (!geom) throw new Error(`no mesh found in ${glbPath}`);
    return geom.clone();
  });
}

// Anchor-cell-corner pivot: move the piece's own minimum corner (the
// corner nearest the origin of its local space) to (0,0,0), scale
// non-uniformly to fit the catalogue footprint (the brief's own
// instruction: "if a pack mesh does not match a catalogue footprint,
// scale it to fit rather than changing the footprint"), then translate so
// that corner sits at [anchorX, 0, anchorZ] on the ground plane.
export function fitToFootprint(geometry, footprint, anchor) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const nativeW = bb.max.x - bb.min.x;
  const nativeD = bb.max.z - bb.min.z;
  const sx = footprint[0] / nativeW;
  const sz = footprint[1] / nativeD;
  // Capped, not the raw footprint average: a 32 m mega-tower footprint
  // needs a real 16x horizontal scale (footprint is what C1.1 fixes), but
  // applying that same 16x to HEIGHT produced an ~87 m tower against this
  // scene's own ~24 m tower-base pieces -- footprint area and storey
  // count are not the same axis, and this proof does not model storeys.
  // Capped at 6x, matching the largest height scale the smaller pieces
  // (tower-base-6x6) already use successfully.
  const sy = Math.min((sx + sz) / 2, 6);
  const m = new THREE.Matrix4()
    .makeTranslation(anchor[0], 0, anchor[1])
    .multiply(new THREE.Matrix4().makeScale(sx, sy, sz))
    .multiply(new THREE.Matrix4().makeTranslation(-bb.min.x, -bb.min.y, -bb.min.z));
  geometry.applyMatrix4(m);
  return geometry;
}
