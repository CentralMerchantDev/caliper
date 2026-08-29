// GENERATED FILE -- do not hand-edit. Regenerate with:
//   node scripts/export-sim-for-browser.mjs
// Mechanically extracted from src/simBaseline.ts's SIM_BASELINE_SOURCE so the
// browser demo runs the exact same logic as the worker, never a hand copy.

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
    local: { x: 0.15, y: 0.24 }, station: { action: "sleep", label: "Bed" },
    recipe: [
      { shape: "box", size: [1.9, 0.32, 1.05], radius: 0.1, position: [0, 0.2, 0], color: "#d8c9a8", roughness: 0.85 },
      { shape: "box", size: [1.9, 0.55, 0.1], radius: 0.05, position: [0, 0.42, -0.52], color: "#8a5a34", roughness: 0.6 },
      { shape: "box", size: [0.55, 0.14, 0.35], radius: 0.06, position: [-0.55, 0.42, -0.3], color: "#fbf5e8", roughness: 0.9 },
    ],
  },
  fridge: {
    material: "ceramic", footprint: { w: 0.75, d: 0.72 }, shadow: { w: 1.1, d: 0.825 },
    local: { x: 0.85, y: 0.24 }, station: { action: "eat", label: "Fridge" },
    recipe: [
      { shape: "box", size: [0.75, 1.55, 0.72], radius: 0.08, position: [0, 0.78, 0], color: "#cfd2d6", roughness: 0.35, metalness: 0.55 },
      { shape: "box", size: [0.77, 0.03, 0.74], radius: 0.01, position: [0, 1.0, 0], color: "#9aa0a8", roughness: 0.4, metalness: 0.5, castShadow: false },
      { shape: "box", size: [0.04, 0.5, 0.05], radius: 0.02, position: [0.32, 1.1, 0.35], color: "#4a4d52", roughness: 0.3, metalness: 0.6, castShadow: false },
    ],
  },
  shower: {
    material: "ceramic", footprint: { w: 1.05, d: 1.0 }, shadow: { w: 1.6, d: 1.2 },
    local: { x: 0.85, y: 0.76 }, station: { action: "shower", label: "Shower" },
    recipe: [
      { shape: "box", size: [1.05, 1.9, 0.06], radius: 0.02, position: [0, 0.95, -0.5], color: "#f3efe6", roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.88 },
      { shape: "box", size: [0.06, 1.9, 1.0], radius: 0.02, position: [-0.5, 0.95, 0], color: "#f3efe6", roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.88 },
      { shape: "cylinder", size: [0.09, 0.09, 0.05], segments: 12, position: [0, 1.7, -0.35], rotation: [0, 0, 1.5708], color: "#cfd2d6", roughness: 0.3, metalness: 0.7 },
    ],
  },
  desk: {
    material: "wood", footprint: { w: 1.55, d: 0.75 }, shadow: { w: 2.0, d: 1.5 },
    local: { x: 0.15, y: 0.76 }, station: { action: "work", label: "Desk" },
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
    local: { x: 0.5, y: 0.18 }, station: { action: "play", label: "Rug" },
    recipe: [
      { shape: "cylinder", size: [1.05, 1.05, 0.05], segments: 28, position: [0, 0.025, 0], color: "#c97a3d", roughness: 0.95 },
    ],
  },
  table: {
    material: "wood", footprint: { w: 1.04, d: 1.04 }, shadow: { w: 1.4, d: 1.05 },
    local: { x: 0.5, y: 0.82 }, station: { action: "call", label: "Table" },
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
    buildings: [
      { id: "dwelling-1", type: "dwelling", label: "House 1", plot: { x: 0, y: 0 } },
      { id: "dwelling-2", type: "dwelling", label: "House 2", plot: { x: 2, y: 0 } },
      { id: "shop", type: "shop", label: "Shop", plot: { x: 0, y: 2 } },
      { id: "workshop", type: "workshop", label: "Workshop", plot: { x: 2, y: 2 } },
    ],
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
      { id: "bench-1", type: "bench", location: "outdoors", plot: { x: 1, y: 0.3 } },
      { id: "tree-1", type: "tree", location: "outdoors", plot: { x: 1, y: 0.7 } },
      { id: "tree-2", type: "tree", location: "outdoors", plot: { x: 1.6, y: 1.3 } },
      { id: "lamp-1", type: "lampPost", location: "outdoors", plot: { x: 0.6, y: 1.3 } },
      { id: "lamp-2", type: "lampPost", location: "outdoors", plot: { x: 1.4, y: 0.6 } },
      { id: "planter-1", type: "planter", location: "outdoors", plot: { x: 1, y: 1.6 } },
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

export { initialWorld, chooseAction, applyAction, tick };
