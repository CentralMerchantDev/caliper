// CALIPER v2 (BUILD-V2.md): the baseline life-sim source, stored as plain JS
// text rather than an imported module. It runs two places: inside a
// sandboxed Dynamic Worker (regression + new-behavior checks, see
// simSandbox.ts) and as the literal context the "implement" pipeline stage
// reads and rewrites. Keeping ONE text representation, seeded here and
// persisted to KV as `sim/current-source` after every shipped change,
// avoids drift between "what the model sees" and "what actually runs" --
// there is no separate "real" compiled version anywhere else.
//
// Every numeric rule below was verified against an independent reference
// script (not transcribed by hand) before use -- see the regression suite
// in simRegression.ts, whose expected values came from that same reference.
//
// FOUNDATION-2 item (structured edits): the /*@DATA:...:BEGIN*/.../*@DATA:...:END*/
// comment pairs around OBJECT_TYPES, placements, and surfaces are sentinel
// markers src/worldEdit.ts's applyWorldEdit() splices against -- exact
// string search, not brace-counting or a text diff -- to replace just that
// block with freshly serialized data and leave everything else (this
// comment, chooseAction/applyAction/tick, every other line) byte-identical.
// They're plain JS block comments, inert at runtime either way.
export const SIM_BASELINE_SOURCE = `
// A small life-sim world: one sim, five decaying needs, a clock, a job.
// All state is plain JSON. No DOM, no randomness in the baseline (a
// rngState field is reserved for future use but unused so far).

const NEED_ORDER = ["hunger", "energy", "hygiene", "fun", "social"];
const CRITICAL_THRESHOLD = 30;
const DECAY = { hunger: 3, energy: 2, fun: 2, social: 2, hygiene: 1 };
const EAT_COST = 5;
const RESTORE = { hunger: 40, energy: 35, hygiene: 50, fun: 30, social: 15 };
const ACTION_FOR_NEED = { hunger: "eat", energy: "sleep", hygiene: "shower", fun: "play", social: "call" };
const WORK_HOUR_START = 9;
const WORK_HOUR_END = 17;
const WORK_WAGE = 20;
const WORK_ENERGY_EXTRA = 10;
const WORK_FUN_EXTRA = 5;

function clamp(v) {
  return Math.max(0, Math.min(100, v));
}

// FOUNDATION.md item 1: a type registry, not per-object special-casing.
// Every object placed in the world -- an indoor station or an outdoor prop
// -- is exactly one of these types. This is "everything the system needs
// to know" about a type: its geometry as a small recipe of PRIMITIVES
// (box/cylinder/sphere/icosahedron -- the shapes both renderers already
// know how to draw), its material colour, its footprint (for spacing and
// contact-shadow size), whether it emits light, and -- if it is a station
// a sim can use -- which action it provides. A renderer draws ANY type
// here from this data alone; it never special-cases a type by name.
// Adding an instance of an EXISTING type is a placements append, zero
// registry change. Adding a genuinely NEW type is exactly one entry here
// (a recipe from these same primitives) plus a placement -- small,
// bounded, and verifiable by existence, never a renderer change.
//
// Each recipe part: { shape: "box"|"cylinder"|"sphere"|"icosahedron",
// size: box=[w,h,d] cylinder=[radiusTop,radiusBottom,height] sphere=[radius]
// icosahedron=[radius,detail], position: [x,y,z], rotation?: [x,y,z] (radians),
// scale?: [x,y,z], radius?: number (box corner rounding), segments?: number
// (cylinder/sphere), color: "#hex", roughness?: number, metalness?: number,
// emissive?: "#hex", emissiveIntensity?: number, emissiveAnimated?: boolean
// (ramps brighter at night -- a light source's own bulb, not a lit
// surface), transparent?: boolean, opacity?: number, castShadow?: boolean
// (default true) }.
const OBJECT_TYPES = /*@DATA:OBJECT_TYPES:BEGIN*/{
  bed: {
    material: "fabric", footprint: { w: 1.9, d: 1.2 }, shadow: { w: 2.4, d: 1.8 },
    // SHIP.md item 3: back-left corner, against both real walls -- the
    // point in the room furthest from the open (unwalled) front/right
    // side that functions as the entry, i.e. "a bed away from the door."
    // Unchanged from before this pass; it was already the one piece of
    // furniture in the right spot.
    local: { x: 0.15, y: 0.24 }, station: { action: "sleep", label: "Bed" },
    recipe: [
      { shape: "box", size: [1.9, 0.32, 1.05], radius: 0.1, position: [0, 0.2, 0], color: "#d8c9a8", roughness: 0.85 },
      { shape: "box", size: [1.9, 0.55, 0.1], radius: 0.05, position: [0, 0.42, -0.52], color: "#8a5a34", roughness: 0.6 },
      { shape: "box", size: [0.55, 0.14, 0.35], radius: 0.06, position: [-0.55, 0.42, -0.3], color: "#fbf5e8", roughness: 0.9 },
    ],
  },
  fridge: {
    material: "ceramic", footprint: { w: 0.75, d: 0.72 }, shadow: { w: 1.1, d: 0.825 },
    // SHIP.md item 3: back-right corner, against the back wall alongside
    // the shower -- a "utility corner" (kitchen + bathroom together
    // against the one solid wall run), the closest this two-wall shell
    // gets to "the fridge and counter grouped." Verified against every
    // other placement's own footprint by hand (bounding-box math, not
    // eyeballed) -- no two pieces of furniture overlap in any dwelling.
    local: { x: 0.88, y: 0.12 }, station: { action: "eat", label: "Fridge" },
    recipe: [
      { shape: "box", size: [0.75, 1.55, 0.72], radius: 0.08, position: [0, 0.78, 0], color: "#cfd2d6", roughness: 0.35, metalness: 0.55 },
      { shape: "box", size: [0.77, 0.03, 0.74], radius: 0.01, position: [0, 1.0, 0], color: "#9aa0a8", roughness: 0.4, metalness: 0.5, castShadow: false },
      { shape: "box", size: [0.04, 0.5, 0.05], radius: 0.02, position: [0.32, 1.1, 0.35], color: "#4a4d52", roughness: 0.3, metalness: 0.6, castShadow: false },
    ],
  },
  shower: {
    material: "ceramic", footprint: { w: 1.05, d: 1.0 }, shadow: { w: 1.6, d: 1.2 },
    // SHIP.md item 3: against the back wall, centre-left of the fridge --
    // the utility corner, not floating in the open middle of the room the
    // old {0.85,0.76} (front, no wall on that side at all) left it in.
    local: { x: 0.55, y: 0.15 }, station: { action: "shower", label: "Shower" },
    recipe: [
      { shape: "box", size: [1.05, 1.9, 0.06], radius: 0.02, position: [0, 0.95, -0.5], color: "#f3efe6", roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.88 },
      { shape: "box", size: [0.06, 1.9, 1.0], radius: 0.02, position: [-0.5, 0.95, 0], color: "#f3efe6", roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.88 },
      { shape: "cylinder", size: [0.09, 0.09, 0.05], segments: 12, position: [0, 1.7, -0.35], rotation: [0, 0, 1.5708], color: "#cfd2d6", roughness: 0.3, metalness: 0.7 },
    ],
  },
  desk: {
    material: "wood", footprint: { w: 1.55, d: 0.75 }, shadow: { w: 2.0, d: 1.5 },
    // SHIP.md item 3: along the left wall, mid-depth -- "desk to a
    // window" reads as the open (unwalled) side catching the light, with
    // the solid left wall at its back. Clear of the bed's back-left
    // corner by depth alone (bed sits further back), not by distance.
    local: { x: 0.12, y: 0.5 }, station: { action: "work", label: "Desk" },
    recipe: [
      { shape: "box", size: [1.55, 0.07, 0.75], radius: 0.03, position: [0, 0.74, 0], color: "#8a5a34", roughness: 0.55 },
      { shape: "cylinder", size: [0.03, 0.03, 0.74], segments: 8, position: [-0.68, 0.37, -0.3], color: "#6a4526", roughness: 0.6 },
      { shape: "cylinder", size: [0.03, 0.03, 0.74], segments: 8, position: [0.68, 0.37, -0.3], color: "#6a4526", roughness: 0.6 },
      { shape: "cylinder", size: [0.03, 0.03, 0.74], segments: 8, position: [-0.68, 0.37, 0.3], color: "#6a4526", roughness: 0.6 },
      { shape: "cylinder", size: [0.03, 0.03, 0.74], segments: 8, position: [0.68, 0.37, 0.3], color: "#6a4526", roughness: 0.6 },
      { shape: "box", size: [0.5, 0.34, 0.04], radius: 0.03, position: [0, 1.0, -0.28], color: "#2a2622", roughness: 0.4, emissive: "#3a4a5c", emissiveIntensity: 0.4 },
    ],
  },
  rug: {
    material: "fabric", footprint: { w: 2.1, d: 2.1 }, shadow: { w: 2.4, d: 1.8 },
    // SHIP.md item 3: centre of the room's open half, not against the
    // back wall -- a rug marks a lounge zone in the circulation space,
    // it doesn't belong wall-hugging next to the sleep/wash/eat furniture.
    local: { x: 0.55, y: 0.62 }, station: { action: "play", label: "Rug" },
    recipe: [
      { shape: "cylinder", size: [1.05, 1.05, 0.05], segments: 28, position: [0, 0.025, 0], color: "#c97a3d", roughness: 0.95 },
    ],
  },
  table: {
    material: "wood", footprint: { w: 1.04, d: 1.04 }, shadow: { w: 1.4, d: 1.05 },
    // SHIP.md item 3: open floor, front-right -- near the utility corner
    // without touching it, clear of the rug's own circle by bounding-box
    // math, and clear of the open (unwalled) front/right for circulation.
    local: { x: 0.75, y: 0.7 }, station: { action: "call", label: "Table" },
    recipe: [
      { shape: "cylinder", size: [0.52, 0.52, 0.06], segments: 24, position: [0, 0.62, 0], color: "#8a5a34", roughness: 0.55 },
      { shape: "cylinder", size: [0.08, 0.1, 0.6], segments: 10, position: [0, 0.31, 0], color: "#6a4526", roughness: 0.6 },
      { shape: "box", size: [0.42, 0.08, 0.42], radius: 0.04, position: [0.85, 0.42, 0], color: "#3d6b63", roughness: 0.8 },
      { shape: "cylinder", size: [0.03, 0.03, 0.42], segments: 8, position: [0.85, 0.21, 0], color: "#6a4526", roughness: 0.6 },
    ],
  },
  bench: {
    material: "wood", footprint: { w: 1.0, d: 0.34 }, shadow: { w: 1.2, d: 0.6 },
    local: null, station: null,
    recipe: [
      { shape: "box", size: [1.0, 0.06, 0.34], radius: 0.02, position: [0, 0.42, 0], color: "#8a5a34", roughness: 0.65 },
      { shape: "box", size: [1.0, 0.32, 0.05], radius: 0.02, position: [0, 0.6, -0.15], color: "#8a5a34", roughness: 0.65 },
      { shape: "box", size: [0.05, 0.42, 0.3], radius: 0.02, position: [-0.42, 0.21, 0], color: "#6a4526", roughness: 0.7 },
      { shape: "box", size: [0.05, 0.42, 0.3], radius: 0.02, position: [0.42, 0.21, 0], color: "#6a4526", roughness: 0.7 },
    ],
  },
  tree: {
    material: "leaf", footprint: { w: 1.24, d: 1.24 }, shadow: { w: 1.8, d: 1.8 },
    local: null, station: null,
    recipe: [
      { shape: "cylinder", size: [0.09, 0.13, 1.1], segments: 8, position: [0, 0.55, 0], color: "#6a4526", roughness: 0.85 },
      { shape: "icosahedron", size: [0.62, 1], position: [0, 1.35, 0], scale: [1, 0.85, 1], color: "#4f6b47", roughness: 0.85 },
    ],
  },
  lampPost: {
    material: "metal", footprint: { w: 0.22, d: 0.22 }, shadow: { w: 0.7, d: 0.7 }, emitsLight: true,
    local: null, station: null,
    light: { color: "#ffb066", distance: 5.5, decay: 2.2, baseIntensity: 0.7, isStreetLamp: true, position: [0, 1.72, 0] },
    recipe: [
      { shape: "cylinder", size: [0.035, 0.045, 1.7], segments: 8, position: [0, 0.85, 0], color: "#3a3a3a", roughness: 0.5, metalness: 0.4 },
      { shape: "sphere", size: [0.11], segments: [12, 10], position: [0, 1.72, 0], color: "#ffe9bf", roughness: 0.4, emissive: "#ffb066", emissiveIntensity: 0.6, emissiveAnimated: true, castShadow: false },
    ],
  },
  planter: {
    material: "leaf", footprint: { w: 0.5, d: 0.5 }, shadow: { w: 0.6, d: 0.6 },
    local: null, station: null,
    recipe: [
      { shape: "box", size: [0.5, 0.32, 0.5], radius: 0.04, position: [0, 0.16, 0], color: "#6a4526", roughness: 0.75 },
      { shape: "icosahedron", size: [0.24, 0], position: [0, 0.44, 0], scale: [1, 0.7, 1], color: "#4f6b47", roughness: 0.9 },
    ],
  },
  // POLISH.md item 5: "fill the empty shop and workshop" -- both buildings
  // existed (FOUNDATION.md item 4's shell) but had zero placements naming
  // them as a location, so they rendered as an empty floor and two walls.
  // Neither claims a sim action (no new action exists for a shop or
  // workshop to drive), so station stays null, same as bench/tree/planter
  // above -- but unlike those, local is set, because indoor placement
  // requires it (see world-render-3d.js's _buildNeighbourhoodIfNeeded: an
  // indoor placement with no typeDef.local is skipped, not defaulted).
  counter: {
    material: "wood", footprint: { w: 1.8, d: 0.6 }, shadow: { w: 2.2, d: 0.9 },
    local: { x: 0.5, y: 0.15 }, station: null,
    recipe: [
      { shape: "box", size: [1.8, 0.85, 0.55], radius: 0.05, position: [0, 0.425, 0], color: "#8a5a34", roughness: 0.6 },
      { shape: "box", size: [1.86, 0.04, 0.6], radius: 0.02, position: [0, 0.87, 0], color: "#cfd2d6", roughness: 0.3, metalness: 0.2 },
      { shape: "box", size: [0.34, 0.22, 0.24], radius: 0.02, position: [0.55, 1.0, 0], color: "#3a3a3a", roughness: 0.4, metalness: 0.5 },
    ],
  },
  workbench: {
    material: "wood", footprint: { w: 1.6, d: 0.7 }, shadow: { w: 2.0, d: 1.1 },
    local: { x: 0.5, y: 0.15 }, station: null,
    recipe: [
      { shape: "box", size: [1.6, 0.07, 0.7], radius: 0.02, position: [0, 0.78, 0], color: "#8a5a34", roughness: 0.65 },
      { shape: "cylinder", size: [0.04, 0.04, 0.76], segments: 8, position: [-0.7, 0.39, -0.28], color: "#6a4526", roughness: 0.7 },
      { shape: "cylinder", size: [0.04, 0.04, 0.76], segments: 8, position: [0.7, 0.39, -0.28], color: "#6a4526", roughness: 0.7 },
      { shape: "cylinder", size: [0.04, 0.04, 0.76], segments: 8, position: [-0.7, 0.39, 0.28], color: "#6a4526", roughness: 0.7 },
      { shape: "cylinder", size: [0.04, 0.04, 0.76], segments: 8, position: [0.7, 0.39, 0.28], color: "#6a4526", roughness: 0.7 },
      { shape: "box", size: [0.22, 0.2, 0.16], radius: 0.02, position: [-0.45, 0.92, 0], color: "#5c6b5a", roughness: 0.5, metalness: 0.3 },
      { shape: "cylinder", size: [0.03, 0.03, 0.18], segments: 8, position: [0.3, 0.9, 0], rotation: [1.5708, 0, 0], color: "#9aa0a8", roughness: 0.4, metalness: 0.6 },
    ],
  },
}/*@DATA:OBJECT_TYPES:END*/;

// CITY.md: the world becomes a neighbourhood, not a single room -- but only
// initialWorld() grows. chooseAction/applyAction/tick below are byte-for-byte
// the same functions that produced every value in simRegression.ts's suite;
// they only ever read sim.needs, world.tick and world.money, so the new
// fields here (buildings, placements, each sim's home, the type registry)
// ride along on every tick via the existing Object.assign spreads without
// those functions ever needing to know they exist. Two dwellings, each with
// the same six stations the room always had, a shop and a workshop
// (structures only -- no new action exists for them to drive, so none is
// claimed), and a handful of objects in the open ground between them.
function initialWorld() {
  return {
    // Starts at 09:00, not midnight -- a visitor's first frame is daylight,
    // the renderer's best light. Night is still there, it's just something
    // you reach by watching, not the first thing you see. Purely a starting
    // VALUE for this pure-data function; chooseAction/applyAction/tick below
    // don't care what tick they're handed and are untouched.
    tick: 9,
    rngState: 1,
    money: 100,
    sims: [
      { id: "sim1", home: "dwelling-1", needs: { hunger: 100, energy: 100, fun: 100, social: 100, hygiene: 100 }, lastAction: null },
      { id: "sim2", home: "dwelling-2", needs: { hunger: 100, energy: 100, fun: 100, social: 100, hygiene: 100 }, lastAction: null },
    ],
    buildings: /*@DATA:BUILDINGS:BEGIN*/[
      { id: "dwelling-1", type: "dwelling", label: "House 1", plot: { x: 0, y: 0 } },
      { id: "dwelling-2", type: "dwelling", label: "House 2", plot: { x: 2, y: 0 } },
      { id: "shop", type: "shop", label: "Tavern", plot: { x: 0, y: 2 } },
      { id: "workshop", type: "workshop", label: "Workshop", plot: { x: 2, y: 2 } },
    ]/*@DATA:BUILDINGS:END*/,
    // FOUNDATION.md item 1: the placement list -- the world's contents as
    // data. Which type, where (a building's id, or "outdoors" with a plot
    // position), and any per-instance override such as colour. Adding a
    // placement is how "add another street lamp" or "add a bench by the
    // shop" gets done: append one entry, verifiable by existence, no new
    // code in this function or in either renderer.
    placements: /*@DATA:PLACEMENTS:BEGIN*/[
      { id: "dwelling-1-bed", type: "bed", location: "dwelling-1" },
      { id: "dwelling-1-fridge", type: "fridge", location: "dwelling-1" },
      { id: "dwelling-1-shower", type: "shower", location: "dwelling-1" },
      { id: "dwelling-1-desk", type: "desk", location: "dwelling-1" },
      { id: "dwelling-1-rug", type: "rug", location: "dwelling-1" },
      { id: "dwelling-1-table", type: "table", location: "dwelling-1" },
      { id: "dwelling-2-bed", type: "bed", location: "dwelling-2" },
      { id: "dwelling-2-fridge", type: "fridge", location: "dwelling-2" },
      { id: "dwelling-2-shower", type: "shower", location: "dwelling-2" },
      { id: "dwelling-2-desk", type: "desk", location: "dwelling-2" },
      { id: "dwelling-2-rug", type: "rug", location: "dwelling-2" },
      { id: "dwelling-2-table", type: "table", location: "dwelling-2" },
      // SHIP.md item 3: the plaza (the open ground between the 4 buildings,
      // centred on plot 1,1) composed with rhythm instead of scattered --
      // two trees on the north-south path centreline, two lamps on the
      // diagonal through the centre, bench and planter on the OTHER
      // diagonal as their counterpoint. Every position checked against
      // every building's real footprint with a script computing the same
      // world-space rects world-render-3d.js does (BUILDING_TYPE_SCALE x
      // BUILDING_W/D, GRID_UNIT_X/Z) and testing bounding-box overlap --
      // not eyeballed, and not trusted by hand either: a first hand-done
      // pass placed lamp-2 inside dwelling-2's own footprint, caught only
      // once the check actually ran.
      { id: "tree-1", type: "tree", location: "outdoors", plot: { x: 1, y: 0.7 } },
      { id: "tree-2", type: "tree", location: "outdoors", plot: { x: 1, y: 1.3 } },
      { id: "lamp-1", type: "lampPost", location: "outdoors", plot: { x: 0.6, y: 1.25 } },
      { id: "lamp-2", type: "lampPost", location: "outdoors", plot: { x: 1.4, y: 0.75 } },
      { id: "bench-1", type: "bench", location: "outdoors", plot: { x: 0.8, y: 0.8 } },
      { id: "planter-1", type: "planter", location: "outdoors", plot: { x: 1.2, y: 1.2 } },
      // POLISH.md item 5: one placement each, against the back wall the
      // same way every dwelling station sits against a real wall (this
      // file's own SHIP.md item 3 convention) -- the shop and workshop had
      // a floor and two walls and nothing else since FOUNDATION.md item 4
      // gave them the same open-topped shell as a dwelling.
      { id: "shop-counter", type: "counter", location: "shop" },
      { id: "workshop-workbench", type: "workbench", location: "workshop" },
    ]/*@DATA:PLACEMENTS:END*/,
    // The type registry rides along inside the world object itself (not a
    // separate import) so a renderer that only ever receives pushTick(world)
    // has everything it needs to draw generically -- no second channel, no
    // separate deploy step to keep in sync.
    objectTypes: OBJECT_TYPES,
    // FINAL.md item 4, folded into the same model (FOUNDATION.md item 1):
    // named surfaces, real addressable data, the same { material, color }
    // shape every object-type entry above uses for its own material. Roof
    // colours became trim/accent colours on FOUNDATION.md item 4 (every
    // building is open-topped now, uniformly -- there is no roof plane left
    // to colour), used on each building's own sign post instead.
    surfaces: /*@DATA:SURFACES:BEGIN*/{
      ground: { material: "grass", color: "#6f6656" },
      path: { material: "gravel", color: "#bfb49c" },
      floor: { material: "wood", color: "#9c7a52" },
      wall: { material: "plaster", color: "#b8ad93" },
      trimShop: { material: "paint", color: "#9a5a3c" },
      trimWorkshop: { material: "paint", color: "#5c6b5a" },
    }/*@DATA:SURFACES:END*/,
  };
}

// Picks the next action for one sim, given the whole world (for the clock
// and shared money). Priority: any critical need (below CRITICAL_THRESHOLD,
// checked in NEED_ORDER, hunger skipped if unaffordable) beats everything;
// otherwise work during work hours if energy allows; otherwise address
// whichever need is lowest, or idle if every need is already maxed.
function chooseAction(sim, world) {
  const hour = world.tick % 24;
  const isWorkHour = hour >= WORK_HOUR_START && hour < WORK_HOUR_END;

  for (const need of NEED_ORDER) {
    if (sim.needs[need] < CRITICAL_THRESHOLD) {
      if (need === "hunger" && world.money < EAT_COST) continue;
      return ACTION_FOR_NEED[need];
    }
  }

  if (isWorkHour && sim.needs.energy > 20) return "work";

  let lowest = NEED_ORDER[0];
  for (const need of NEED_ORDER) if (sim.needs[need] < sim.needs[lowest]) lowest = need;
  if (sim.needs[lowest] >= 100) return "idle";
  if (lowest === "hunger" && world.money < EAT_COST) {
    let second = NEED_ORDER.find((n) => n !== "hunger");
    for (const need of NEED_ORDER) if (need !== "hunger" && sim.needs[need] < sim.needs[second]) second = need;
    return ACTION_FOR_NEED[second];
  }
  return ACTION_FOR_NEED[lowest];
}

// Applies universal per-tick decay to every need, then the chosen action's
// effect on top. Returns a new world; never mutates its input.
function applyAction(world, simIndex, action) {
  const sim = world.sims[simIndex];
  const needs = Object.assign({}, sim.needs);
  for (const n of NEED_ORDER) needs[n] = clamp(needs[n] - DECAY[n]);

  let money = world.money;
  if (action === "eat") {
    needs.hunger = clamp(needs.hunger + RESTORE.hunger);
    money -= EAT_COST;
  } else if (action === "sleep") {
    needs.energy = clamp(needs.energy + RESTORE.energy);
  } else if (action === "shower") {
    needs.hygiene = clamp(needs.hygiene + RESTORE.hygiene);
  } else if (action === "play") {
    needs.fun = clamp(needs.fun + RESTORE.fun);
  } else if (action === "call") {
    needs.social = clamp(needs.social + RESTORE.social);
  } else if (action === "work") {
    money += WORK_WAGE;
    needs.energy = clamp(needs.energy - WORK_ENERGY_EXTRA);
    needs.fun = clamp(needs.fun - WORK_FUN_EXTRA);
  }

  const newSims = world.sims.slice();
  newSims[simIndex] = Object.assign({}, sim, { needs: needs, lastAction: action });
  return Object.assign({}, world, { sims: newSims, money: money });
}

// Advances the whole world by exactly one discrete tick: every sim chooses
// and applies one action, then the clock advances.
function tick(world) {
  let next = world;
  for (let i = 0; i < next.sims.length; i++) {
    const action = chooseAction(next.sims[i], next);
    next = applyAction(next, i, action);
  }
  return Object.assign({}, next, { tick: next.tick + 1 });
}
`.trim();
