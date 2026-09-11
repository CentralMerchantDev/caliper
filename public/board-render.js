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

/** Resolve (or create) the one shared material for a colour, when a cache
 *  is given -- one instance per distinct colour, not one per piece, so
 *  every piece of the same pieceType (or the same unrecognised fallback)
 *  in a build shares a single material object instead of 21,007 distinct
 *  ones. No cache means the old behaviour: a fresh material every call,
 *  unchanged for direct callers (e.g. this file's own tests). */
function materialFor(THREE, piece, materialCache) {
  const color = COLOR_BY_TYPE[piece.pieceType] ?? FALLBACK_COLOR;
  if (!materialCache) return new THREE.MeshStandardMaterial({ color });
  let material = materialCache.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color });
    materialCache.set(color, material);
  }
  return material;
}

/** One box mesh for one real board.js piece -- position and size read
 *  ENTIRELY from the piece's own cell/foot/levels, atomOrigin() (grid.js,
 *  no landform-derived offset), never from a second, independently
 *  computed geometry. */
export function meshForPiece(THREE, piece, materialCache = null) {
  const origin = atomOrigin(piece.cell.i, piece.cell.j);
  const w = piece.foot.w, d = piece.foot.d;
  const h = heightMFor(piece);
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = materialFor(THREE, piece, materialCache);
  const mesh = new THREE.Mesh(geometry, material);
  const baseY = baseYFor(piece);
  mesh.position.set(origin.x + w / 2, baseY + h / 2, origin.z + d / 2);
  mesh.userData.pieceId = piece.id;
  mesh.userData.pieceType = piece.pieceType;
  return mesh;
}

/** Two pieces produce IDENTICAL box geometry iff they share this key --
 *  heightMFor() only reads `levels` for `"building"` (every other
 *  pieceType's height is a fixed constant regardless of levels), so
 *  `levels` only needs to distinguish groups for buildings; including it
 *  for every pieceType would just fragment roads/bridges/docks into
 *  meaningless extra groups without ever being WRONG. */
function groupKeyFor(piece) {
  const levels = piece.pieceType === "building" ? piece.levels : 0;
  return `${piece.pieceType}|${piece.foot.w}|${piece.foot.d}|${levels}`;
}

/**
 * B4 (2b) -- one THREE.InstancedMesh per (pieceType, foot.w, foot.d,
 * levels-if-building) group, not one Mesh per piece. Measured directly
 * against the committed public/board.generated.json: 21,007 pieces collapse
 * into 16 such groups (9 road foot dims, 5 building foot/levels combos, no
 * bridge pieces exist yet). Geometry and material are shared once per
 * group; only each piece's own transform (position -- baseYFor() varies
 * PER INSTANCE for bridges, whose own `.height` differs piece to piece even
 * within one group) is set per instance, via THREE.InstancedMesh's own
 * setMatrixAt(). No piece is rotated today (meshForPiece never read
 * piece.rotation either -- not a new gap, not fixed here).
 *
 * `userData.pieceType` and `userData.pieceIds` (the group's own piece ids,
 * in the SAME order as their instance index) replace meshForPiece's
 * per-mesh `userData.pieceId` -- a single scalar has no meaning once one
 * mesh represents many pieces. Confirmed before this change that nothing
 * in the codebase reads `userData.pieceId` for picking or anything else
 * (board-piece picking resolves through pieceAtPoint()'s own spatial
 * index against the raycast hit point, never mesh/instance identity --
 * see test/boardPicking.test.ts), so this is a naming correction, not a
 * behaviour change.
 *
 * The whole render path's own contract: given real board pieces (from
 * public/board-load.js's loadBoard()/fetchBoard(), never generated here),
 * build a scene from them and nothing else.
 */
export function buildBoardScene(THREE, pieces) {
  const group = new THREE.Group();
  group.name = "board-pieces";
  const materialCache = new Map();
  const groups = new Map();
  for (const piece of pieces) {
    if (!piece || !piece.pieceType) continue;
    const key = groupKeyFor(piece);
    let g = groups.get(key);
    if (!g) { g = { sample: piece, list: [] }; groups.set(key, g); }
    g.list.push(piece);
  }
  const dummy = new THREE.Object3D();
  for (const { sample, list } of groups.values()) {
    const w = sample.foot.w, d = sample.foot.d;
    const h = heightMFor(sample);
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = materialFor(THREE, sample, materialCache);
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.userData.pieceType = sample.pieceType;
    mesh.userData.pieceIds = list.map((p) => p.id);
    list.forEach((piece, idx) => {
      const origin = atomOrigin(piece.cell.i, piece.cell.j);
      const baseY = baseYFor(piece);
      dummy.position.set(origin.x + w / 2, baseY + h / 2, origin.z + d / 2);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}

/**
 * B4 (2c) -- one THREE.InstancedMesh per (propId, geometry-part-index),
 * replacing one Mesh (or multi-part Group) per placed item. `items`:
 * `[{ id, propId, parts, position: {x,y,z}, rotationY, color }]` --
 * `parts` (a geometry[]) MUST be the SAME array object for every item
 * sharing a `propId` (each scatter function's own geometry cache
 * guarantees this, so `.createGeometry()` runs once per distinct variant
 * actually placed, not once per item).
 *
 * `"tree"` is `prop-models.js`'s own VARIED family (12 discrete species x
 * age combinations, chosen deterministically by seed -- ground-checked
 * directly: `props.js`'s `tree()` is a pure function of its two
 * arguments, no `Math.random()` anywhere in the file) -- genuinely
 * instanceable by bucketing on the resolved model's own `.id`, not a case
 * where "every instance shares one geometry" is violated.
 * lampPost/bench/bin/busShelter are non-VARIED plain aliases (one fixed
 * model each), the simpler case of the same mechanism.
 *
 * `group.userData.itemCount` records the real placed-item count once,
 * since `group.children.length` (now the small InstancedMesh-group count)
 * no longer means that -- `world-render-3d.js`'s and `city.html`'s own
 * console.log lines read the old `.children.length` for exactly this
 * number and would otherwise silently report the wrong count.
 */
function buildInstancedPropGroup(THREE, groupName, items) {
  const group = new THREE.Group();
  group.name = groupName;
  const byVariant = new Map();
  for (const item of items) {
    let v = byVariant.get(item.propId);
    if (!v) { v = { parts: item.parts, color: item.color, list: [] }; byVariant.set(item.propId, v); }
    v.list.push(item);
  }
  const materialCache = new Map();
  const dummy = new THREE.Object3D();
  for (const { parts, color, list } of byVariant.values()) {
    let material = materialCache.get(color);
    if (!material) { material = new THREE.MeshStandardMaterial({ color }); materialCache.set(color, material); }
    for (let partIdx = 0; partIdx < parts.length; partIdx++) {
      const mesh = new THREE.InstancedMesh(parts[partIdx], material, list.length);
      mesh.userData.propId = list[0].propId;
      mesh.userData.pieceIds = list.map((it) => it.id);
      list.forEach((item, idx) => {
        dummy.position.set(item.position.x, item.position.y, item.position.z);
        dummy.rotation.set(0, item.rotationY || 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
  }
  group.userData.itemCount = items.length;
  return group;
}

/**
 * B4 -- "kits wire by construction": a real tree, from
 * public/prop-models.js's own propModel(), not a placeholder. A SEPARATE
 * group from buildBoardScene() on purpose -- that function's own gate
 * (test/boardRender.test.ts) asserts every piece is drawn exactly once;
 * trees are not pieces (B2's own scope explicitly left them out, per
 * docs/specs/BOARD-REBUILD-PLAN.md's "Trees/props are explicitly OUT of
 * B2's scope"), so adding them there would break that contract instead of
 * satisfying a different one.
 *
 * DELIBERATELY MODEST, NAMED AS SUCH: one tree per `maxTrees`-th building
 * piece (default every 25th), not one per building -- a real board has
 * ~17,600 buildings. This satisfies B4's own gate (propModel becomes
 * product-reachable, not merely test-only) honestly -- it is a real,
 * working call from a real render path, not a token invocation -- without
 * shipping tens of thousands of trees tonight.
 *
 * THE CAP CHECK READS `items.length`, NOT `group.children.length` (2c):
 * once placed items are instanced at the end via buildInstancedPropGroup()
 * rather than added to a group inside this loop, `group.children.length`
 * would stay zero for the whole loop -- checked directly against the real
 * blind review that caught this exact bug before it shipped, universal
 * across all four scatter functions in this file.
 */
export function scatterTrees(THREE, pieces, { maxTrees = 400, everyNth = 25 } = {}) {
  let seen = 0;
  const geometryCache = new Map();
  const items = [];
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "building") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (items.length >= maxTrees) break;
    const model = propModel("tree", piece.cell.i * 31 + piece.cell.j);
    let parts = geometryCache.get(model.id);
    if (!parts) {
      const raw = model.lod[0].createGeometry(THREE);
      parts = Array.isArray(raw) ? raw : [raw];
      geometryCache.set(model.id, parts);
    }
    // Offset from the building's own footprint so the tree sits beside it,
    // inside the building piece's own clear margin, not through its walls.
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const offsetX = piece.foot.w + model.footprint.w / 2 + 0.5;
    items.push({
      id: piece.id, propId: model.id, parts, color: 0x3f6b35, rotationY: 0,
      position: { x: origin.x + offsetX, y: 0, z: origin.z + piece.foot.d / 2 },
    });
  }
  return buildInstancedPropGroup(THREE, "board-trees", items);
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
  let seen = 0;
  const geometryCache = new Map();
  const items = [];
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "road") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (items.length >= maxLamps) break;
    const model = propModel("lampPost", piece.cell.i * 31 + piece.cell.j);
    let parts = geometryCache.get(model.id);
    if (!parts) {
      const raw = model.lod[0].createGeometry(THREE);
      parts = Array.isArray(raw) ? raw : [raw];
      geometryCache.set(model.id, parts);
    }
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const { w, d } = piece.foot;
    const longAlongW = w >= d;
    const x = longAlongW ? origin.x + w / 2 : origin.x + w + model.footprint.w / 2 + 0.3;
    const z = longAlongW ? origin.z + d + model.footprint.d / 2 + 0.3 : origin.z + d / 2;
    items.push({ id: piece.id, propId: model.id, parts, color: 0x2a2a2a, rotationY: 0, position: { x, y: 0, z } });
  }
  return buildInstancedPropGroup(THREE, "board-street-lamps", items);
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
  let seen = 0;
  const geometryCache = new Map();
  const items = [];
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "road") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (items.length >= maxItems) break;
    const seed = piece.cell.i * 31 + piece.cell.j;
    // Alternates on THIS function's own placed-item count, not
    // group.children.length -- group stays empty until the end (2c), so
    // that read would always see 0 and place a bench forever, never a bin.
    const isBench = items.length % 2 === 0;
    const model = isBench ? propModel("bench", seed) : propModel("bin", seed);
    let parts = geometryCache.get(model.id);
    if (!parts) {
      const raw = model.lod[0].createGeometry(THREE);
      parts = Array.isArray(raw) ? raw : [raw];
      geometryCache.set(model.id, parts);
    }
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const { w, d } = piece.foot;
    const longAlongW = w >= d;
    const x = longAlongW ? origin.x + w / 2 : origin.x + w + model.footprint.d / 2 + 0.3;
    const z = longAlongW ? origin.z + d + model.footprint.d / 2 + 0.3 : origin.z + d / 2;
    items.push({
      id: piece.id, propId: model.id, parts, color: isBench ? 0x6b4a2a : 0x3a3a3a,
      rotationY: longAlongW ? 0 : Math.PI / 2, position: { x, y: 0, z },
    });
  }
  return buildInstancedPropGroup(THREE, "board-street-furniture", items);
}

/**
 * B4 -- "props from the manifest": a real bus shelter, from
 * public/prop-models.js's own propModel("busShelter", ...), the manifest's
 * FOURTH plain alias ("MODELS['busShelter']=MODELS['bus-shelter']",
 * public/props.js -- "tree" is a VARIED generator, not a plain alias, so
 * lampPost/bench/bin were the first three; railTie remains the last,
 * unwired). One manifest id, so no alternation is needed -- but still a
 * LITERAL string call, not a variable-fed one, matching every other
 * reachability gate in this file.
 *
 * ROTATED, SAME REASON AS scatterStreetFurniture: a bus shelter's own real
 * footprint (public/prop-manifest.js's PROPS.busShelter, w:3.6 d:1.4) is
 * even MORE asymmetric than the bench's 1.8x0.55 -- an unrotated shelter on
 * an east/west road span would face directly across the road, a worse
 * version of the exact defect that step's own blind review found. Same
 * fix, same technique: rotate 90 degrees around Y when the road's own long
 * axis runs along d instead of w.
 */
export function scatterBusShelters(THREE, pieces, { maxShelters = 400, everyNth = 150 } = {}) {
  let seen = 0;
  const geometryCache = new Map();
  const items = [];
  for (const piece of pieces) {
    if (!piece || piece.pieceType !== "road") continue;
    seen += 1;
    if (seen % everyNth !== 0) continue;
    if (items.length >= maxShelters) break;
    const seed = piece.cell.i * 31 + piece.cell.j;
    const model = propModel("busShelter", seed);
    let parts = geometryCache.get(model.id);
    if (!parts) {
      const raw = model.lod[0].createGeometry(THREE);
      parts = Array.isArray(raw) ? raw : [raw];
      geometryCache.set(model.id, parts);
    }
    const origin = atomOrigin(piece.cell.i, piece.cell.j);
    const { w, d } = piece.foot;
    const longAlongW = w >= d;
    const x = longAlongW ? origin.x + w / 2 : origin.x + w + model.footprint.d / 2 + 0.3;
    const z = longAlongW ? origin.z + d + model.footprint.d / 2 + 0.3 : origin.z + d / 2;
    items.push({
      id: piece.id, propId: model.id, parts, color: 0x557799,
      rotationY: longAlongW ? 0 : Math.PI / 2, position: { x, y: 0, z },
    });
  }
  return buildInstancedPropGroup(THREE, "board-bus-shelters", items);
}
