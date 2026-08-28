// CALIPER world-build (BUILD-WORLD.md, chunk 4): "the rules are not a
// written list -- they are the existing code." This file is that list made
// legible -- a cheap, deterministic, code-derived description of the
// world's actual structure, for the grounding stage (chunk 5) to read
// before ever calling a model. No model call produces this; it's just data
// about the code, kept next to the code it describes.
//
// Every field here corresponds to something real and checkable: the
// stations match public/world-render.js's STATIONS 1:1 (asserted by
// test/worldStructure.test.ts, not just claimed here), the actions match
// src/simBaseline.ts's ACTION_FOR_NEED plus "idle" and "work", and the
// world fields match what initialWorld()/tick() actually produce.

export interface StationInfo {
  key: string;
  action: string;
  label: string;
}

// Kept in lockstep with public/world-render.js's STATIONS by
// test/worldStructure.test.ts, which imports both and diffs them --
// drift here is a failing test, not a stale comment.
export const STATIONS: StationInfo[] = [
  { key: "bed", action: "sleep", label: "Bed" },
  { key: "fridge", action: "eat", label: "Fridge" },
  { key: "shower", action: "shower", label: "Shower" },
  { key: "desk", action: "work", label: "Desk" },
  { key: "rug", action: "play", label: "Rug" },
  { key: "table", action: "call", label: "Table" },
];

export const ACTIONS = ["idle", "eat", "sleep", "shower", "play", "call", "work"] as const;
export type WorldAction = (typeof ACTIONS)[number];

export const ENTITY_TYPES = ["sim"] as const;
export const LOCATIONS = ["room"] as const;

export const WORLD_FIELDS: Record<string, string> = {
  tick: "number -- world clock; hour is tick % 24, day is floor(tick / 24) + 1",
  rngState: "number -- reserved for future use, currently unused by any logic",
  money: "number -- shared across every sim in the world; there is no per-sim wallet",
  sims: "array of { id: string, needs: { hunger, energy, hygiene, fun, social }, lastAction }",
};

// What tick() actually does, per BUILD-WORLD.md's phrasing ("what tick
// touches, what the render loop understands") -- read off the real
// function, not asserted from memory.
export const TICK_TOUCHES = ["chooseAction", "applyAction"] as const;

// Things a change request might assume that are NOT true today. The
// grounding stage checks a request's premises against exactly this list
// before ever proposing a plan -- see src/grounding.ts.
export const NOT_YET_PRESENT = [
  "a second room or any location other than the single room",
  "any entity type other than a sim (no pet, no NPC, no object with its own behavior)",
  "any object/station beyond the six listed in STATIONS",
  "a per-sim wallet (money is shared, world-level state)",
  "persistence of world state across a page reload beyond what the worker's KV stores",
  "any randomness (rngState exists as a field but nothing reads or writes it)",
] as const;

/** Cheap, deterministic, plain-text summary -- exactly what the grounding
 * stage sends as context, and exactly what a human at Gate 1 can read in
 * five seconds. Producing this costs nothing; it's string formatting over
 * the constants above, not a query, not a call. */
export function structureSummary(): string {
  return [
    `Entity types that exist: ${ENTITY_TYPES.join(", ")}.`,
    `Locations that exist: ${LOCATIONS.join(", ")} (exactly one -- there is no second location).`,
    `World state fields: ${Object.entries(WORLD_FIELDS)
      .map(([k, v]) => `${k} (${v})`)
      .join("; ")}.`,
    `Actions a sim can take: ${ACTIONS.join(", ")}.`,
    `Stations the renderer draws, one per action: ${STATIONS.map((s) => `${s.label} (${s.action})`).join(", ")}.`,
    `Every tick calls: ${TICK_TOUCHES.join(", ")}, once per sim, in sim order.`,
    `Not yet present -- a request assuming any of these needs grounding to fail on, not a guess:\n` +
      NOT_YET_PRESENT.map((n) => `  - ${n}`).join("\n"),
  ].join("\n");
}
