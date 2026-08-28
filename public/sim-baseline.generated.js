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

// CITY.md: the world becomes a neighbourhood, not a single room -- but only
// initialWorld() grows. chooseAction/applyAction/tick below are byte-for-byte
// the same functions that produced every value in simRegression.ts's suite;
// they only ever read sim.needs, world.tick and world.money, so the new
// fields here (buildings, outdoorObjects, each sim's home) ride along on
// every tick via the existing Object.assign spreads without those functions
// ever needing to know they exist. Two dwellings, each with the same six
// stations the room always had, a shop and a workshop (structures only --
// no new action exists for them to drive, so none is claimed), and a
// handful of objects in the open ground between them.
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
      { id: "dwelling-1", type: "dwelling", label: "House 1", plot: { x: 0, y: 0 }, stations: ["bed", "fridge", "shower", "desk", "rug", "table"] },
      { id: "dwelling-2", type: "dwelling", label: "House 2", plot: { x: 2, y: 0 }, stations: ["bed", "fridge", "shower", "desk", "rug", "table"] },
      { id: "shop", type: "shop", label: "Shop", plot: { x: 0, y: 2 }, stations: [] },
      { id: "workshop", type: "workshop", label: "Workshop", plot: { x: 2, y: 2 }, stations: [] },
    ],
    outdoorObjects: [
      { id: "bench-1", type: "bench", plot: { x: 1, y: 0.3 } },
      { id: "tree-1", type: "tree", plot: { x: 1, y: 0.7 } },
      { id: "tree-2", type: "tree", plot: { x: 1.6, y: 1.3 } },
      { id: "lamp-1", type: "lampPost", plot: { x: 0.6, y: 1.3 } },
      { id: "lamp-2", type: "lampPost", plot: { x: 1.4, y: 0.6 } },
      { id: "planter-1", type: "planter", plot: { x: 1, y: 1.6 } },
    ],
    // FINAL.md item 4: named surfaces as real, addressable data. Mark asked
    // to change the grass and the world had no concept of a ground surface
    // at all -- a plainly reasonable request had nowhere to land. Each
    // surface here is a material label plus a colour the RENDERER reads
    // from this data (world-render-3d.js's PALETTE no longer hardcodes
    // these, described in worldStructure.ts so grounding can see them
    // too) -- not a value only the renderer used to know about. A request
    // to change one is now existence/structural work the pipeline can
    // actually verify, the same as any other field here.
    surfaces: {
      ground: { material: "grass", color: "#6f6656" },
      path: { material: "gravel", color: "#bfb49c" },
      floor: { material: "wood", color: "#a79c85" },
      roofShop: { material: "shingle", color: "#9a5a3c" },
      roofWorkshop: { material: "shingle", color: "#5c6b5a" },
    },
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
