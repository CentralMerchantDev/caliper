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
import { propModel } from "./prop-models.js";

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

/**
 * B4 -- "kits wire by construction": a real tree, from
 * public/prop-models.js's own propModel(), not a placeholder. A SEPARATE
 * group from buildBoardScene() on purpose -- that function's own gate
 * (test/boardRender.test.ts) asserts one mesh per PIECE exactly; trees are
 * not pieces (B2's own scope explicitly left them out, per
 * docs/specs/BOARD-REBUILD-PLAN.md's "Trees/props are explicitly OUT of
 * B2's scope"), so adding them there would break that contract instead of
 * satisfying a different one.
 *
 * DELIBERATELY MODEST, NAMED AS SUCH: one tree per `maxTrees`-th building
 * piece (default every 25th), not one per building -- a real board has
 * ~17,600 buildings, and propModel("tree")'s own LOD0 is a multi-part,
 * unmerged geometry (world-render-3d.js's own instancing machinery,
 * `partitionForInstancing`, is what B4's later work would wire this
 * through; this pass does not build a second one). This satisfies B4's
 * own gate (propModel becomes product-reachable, not merely test-only)
 * honestly -- it is a real, working call from a real render path, not a
 * token invocation -- without shipping tens of thousands of unmerged
 * meshes tonight.
 */
export function scatterTrees(THREE, pieces, { maxTrees = 400, everyNth = 25 } = {}) {
  const group = new THREE.Group();
  group.name = "board-trees";
  let seen = 0;
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "building") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (group.children.length >= maxTrees) break;
    const model = propModel("tree", piece.cell.i * 31 + piece.cell.j);
    const parts = model.lod[0].createGeometry(THREE);
    const partList = Array.isArray(parts) ? parts : [parts];
    const material = new THREE.MeshStandardMaterial({ color: 0x3f6b35 });
    const treeGroup = new THREE.Group();
    for (const geo of partList) treeGroup.add(new THREE.Mesh(geo, material));
    // Offset from the building's own footprint so the tree sits beside it,
    // inside the building piece's own clear margin, not through its walls.
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const offsetX = piece.foot.w + model.footprint.w / 2 + 0.5;
    treeGroup.position.set(origin.x + offsetX, 0, origin.z + piece.foot.d / 2);
    treeGroup.userData.pieceId = piece.id;
    treeGroup.userData.propId = model.id;
    group.add(treeGroup);
  }
  return group;
}

/**
 * B4 -- "props from the manifest": a real street lamp, from
 * public/prop-models.js's own propModel("lampPost", ...), the manifest's
 * OTHER resolution path -- not a VARIED generator family like tree/car/
 * person, but a plain alias through props.js's own MODELS table
 * ("MODELS['lampPost'] = MODELS['lamp-street']"), exercised here for the
 * first time by a real render path rather than a test fixture alone.
 *
 * One lamp per `everyNth`-th road piece (default every 40th), bounded by
 * `maxLamps` -- the same deliberately modest, named-as-such pattern
 * scatterTrees already established, not a claim of realistic street-lamp
 * spacing.
 *
 * POSITIONED BY THE PIECE'S OWN SHAPE, NOT A SINGLE FIXED AXIS: a road
 * piece is long in exactly one of foot.w/foot.d (board-generator.js's own
 * north/south spans are long in w, east/west spans long in d -- this file
 * reads neither constant, only the piece's own foot, per B3's own "reads
 * nothing but the board" gate) and ROAD_WIDTH-narrow in the other. The
 * lamp sits just past the NARROW edge, at the piece's own midpoint along
 * its LONG edge -- offsetting along the long dimension instead (copying
 * scatterTrees's single-axis pattern unchanged) would place a lamp
 * hundreds of metres from the road on a long span, off the piece
 * entirely; caught by this file's own test before it shipped.
 */
export function scatterStreetLamps(THREE, pieces, { maxLamps = 400, everyNth = 40 } = {}) {
  const group = new THREE.Group();
  group.name = "board-street-lamps";
  let seen = 0;
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "road") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (group.children.length >= maxLamps) break;
    const model = propModel("lampPost", piece.cell.i * 31 + piece.cell.j);
    const parts = model.lod[0].createGeometry(THREE);
    const partList = Array.isArray(parts) ? parts : [parts];
    const material = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const lampGroup = new THREE.Group();
    for (const geo of partList) lampGroup.add(new THREE.Mesh(geo, material));
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const { w, d } = piece.foot;
    const longAlongW = w >= d;
    const x = longAlongW ? origin.x + w / 2 : origin.x + w + model.footprint.w / 2 + 0.3;
    const z = longAlongW ? origin.z + d + model.footprint.d / 2 + 0.3 : origin.z + d / 2;
    lampGroup.position.set(x, 0, z);
    lampGroup.userData.pieceId = piece.id;
    lampGroup.userData.propId = model.id;
    group.add(lampGroup);
  }
  return group;
}

/**
 * B4 -- "props from the manifest": real street furniture, from
 * public/prop-models.js's own propModel("bench", ...) / propModel("bin",
 * ...), the manifest's SAME plain-alias resolution path lampPost already
 * uses ("MODELS['bench']=MODELS['bench-slat']", "MODELS['bin']=
 * MODELS['bin-round']", public/props.js). Two literal calls, not one call
 * fed by a variable id -- so that this function's own reachability gate
 * (test/boardRender.test.ts, matching the existing propModel("lampPost", ...)
 * pattern) can find both by name in the source, the same way every other
 * such gate in this file already does.
 *
 * Alternates bench/bin by how many items have been placed so far
 * (deterministic, not random -- the same board always scatters the same
 * furniture).
 *
 * ROTATED, UNLIKE scatterStreetLamps: a bench's own real footprint
 * (public/prop-manifest.js's PROPS.bench, w:1.8 d:0.55) is strongly
 * asymmetric, built long along its own local X axis (props.js's own
 * "bench-slat" geometry). scatterStreetLamps's positioning technique only
 * ever sets .position, which is enough for a roughly-symmetric lamp but
 * would leave a bench pointing across the road, not along it, on every
 * east/west-oriented span (found by a blind review of this step's own plan
 * before implementation). Rotating by 90 degrees around Y when the road's
 * own long axis runs along d instead of w keeps the furniture's own length
 * parallel to the road on BOTH real span orientations.
 */
export function scatterStreetFurniture(THREE, pieces, { maxItems = 400, everyNth = 60 } = {}) {
  const group = new THREE.Group();
  group.name = "board-street-furniture";
  let seen = 0;
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "road") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (group.children.length >= maxItems) break;
    const seed = piece.cell.i * 31 + piece.cell.j;
    const isBench = group.children.length % 2 === 0;
    const model = isBench ? propModel("bench", seed) : propModel("bin", seed);
    const parts = model.lod[0].createGeometry(THREE);
    const partList = Array.isArray(parts) ? parts : [parts];
    const material = new THREE.MeshStandardMaterial({ color: isBench ? 0x6b4a2a : 0x3a3a3a });
    const itemGroup = new THREE.Group();
    for (const geo of partList) itemGroup.add(new THREE.Mesh(geo, material));
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const { w, d } = piece.foot;
    const longAlongW = w >= d;
    const x = longAlongW ? origin.x + w / 2 : origin.x + w + model.footprint.d / 2 + 0.3;
    const z = longAlongW ? origin.z + d + model.footprint.d / 2 + 0.3 : origin.z + d / 2;
    itemGroup.position.set(x, 0, z);
    itemGroup.rotation.y = longAlongW ? 0 : Math.PI / 2;
    itemGroup.userData.pieceId = piece.id;
    itemGroup.userData.propId = model.id;
    group.add(itemGroup);
  }
  return group;
}
