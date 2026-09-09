// =============================================================================
// B3 -- THE RENDER PATH: draws board pieces, and nothing else
//
// docs/briefs/RUN2-CLI-2026-09-09.md, reordered ahead of everything else:
// public/board.generated.json holds 35,000+ real pieces and nothing opened
// it. This module is the render path that does -- one mesh per piece, sized
// and positioned from the piece's own cell/foot/levels, nothing read from
// public/city-plan.js, public/layout.js, or public/city-render.js.
//
// DELIBERATELY MINIMAL. A box per piece, coloured by pieceType, is B3's own
// scope ("draw board pieces and nothing else"); real facades, roofs and kit
// geometry are B4's job ("the kits wire by construction"). Partial credit
// named as such, not disguised as more than it is.
// =============================================================================

import { atomOrigin, heightOf } from "./grid.js";

/** One flat colour per pieceType this file currently knows how to draw.
 *  An unrecognised pieceType still gets a mesh (the fallback grey) rather
 *  than being silently skipped -- a new pieceType this file has not been
 *  taught about yet is a gap worth SEEING on the page, not one that
 *  disappears quietly. */
const COLOR_BY_TYPE = {
  road: 0x4a4a4a,
  building: 0x8fa3b8,
  bridge: 0x6b6b78,
  dock: 0x8b6b4a,
};
const FALLBACK_COLOR = 0xaaaaaa;

/** A bridge's own deck sits above the ground at roughly its own declared
 *  `height` (roadkit.js's bridgeSpan() own field, carried onto the piece in
 *  public/bridge-generator.js); every other piece type sits on the ground
 *  at y = 0, board.js's own k=0 convention for a piece with no stacking. */
function baseYFor(piece) {
  if (piece.pieceType === "bridge" && typeof piece.height === "number") return Math.max(0, piece.height - 4);
  return 0;
}

function heightMFor(piece) {
  if (piece.pieceType === "building") return heightOf(piece.levels);
  if (piece.pieceType === "bridge") return 1.4; // roadkit.js's own deck slab thickness
  if (piece.pieceType === "dock") return 0.6;
  return 0.3; // road -- a thin, walkable slab, not a solid block
}

/** One box mesh for one real board.js piece -- position and size read
 *  ENTIRELY from the piece's own cell/foot/levels, atomOrigin() (grid.js,
 *  no landform-derived offset), never from a second, independently
 *  computed geometry. */
export function meshForPiece(THREE, piece) {
  const origin = atomOrigin(piece.cell.i, piece.cell.j);
  const w = piece.foot.w, d = piece.foot.d;
  const h = heightMFor(piece);
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({ color: COLOR_BY_TYPE[piece.pieceType] ?? FALLBACK_COLOR });
  const mesh = new THREE.Mesh(geometry, material);
  const baseY = baseYFor(piece);
  mesh.position.set(origin.x + w / 2, baseY + h / 2, origin.z + d / 2);
  mesh.userData.pieceId = piece.id;
  mesh.userData.pieceType = piece.pieceType;
  return mesh;
}

/**
 * Every piece in the given list, as one mesh each, inside one THREE.Group.
 * The whole render path's own contract: given real board pieces (from
 * public/board-load.js's loadBoard()/fetchBoard(), never generated here),
 * build a scene from them and nothing else.
 */
export function buildBoardScene(THREE, pieces) {
  const group = new THREE.Group();
  group.name = "board-pieces";
  for (const piece of pieces) {
    if (!piece || !piece.pieceType) continue;
    group.add(meshForPiece(THREE, piece));
  }
  return group;
}
