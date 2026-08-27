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

function initialWorld() {
  return {
    tick: 0,
    rngState: 1,
    money: 100,
    sims: [
      { id: "sim1", needs: { hunger: 100, energy: 100, fun: 100, social: 100, hygiene: 100 }, lastAction: null },
    ],
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
