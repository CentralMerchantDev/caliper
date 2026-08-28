// CALIPER world-build (BUILD-WORLD.md, chunk 4; extended by CITY.md item 1):
// "the rules are not a written list -- they are the existing code." This
// file is that list made legible -- a cheap, deterministic, code-derived
// description of the world's actual structure, for the grounding stage
// (chunk 5) to read before ever calling a model. No model call produces
// this; it's just data about the code, kept next to the code it describes.
//
// Every field here corresponds to something real and checkable: the
// stations match public/world-render.js's STATIONS 1:1 (asserted by
// test/worldStructure.test.ts, not just claimed here), the actions match
// src/simBaseline.ts's ACTION_FOR_NEED plus "idle" and "work", and the
// buildings/outdoor objects/world fields match what
// simBaseline.ts's initialWorld()/tick() actually produce -- read straight
// off the real initialWorld() output, not hand-imagined.

export interface StationInfo {
  key: string;
  action: string;
  label: string;
}

// Kept in lockstep with public/world-render.js's STATIONS by
// test/worldStructure.test.ts, which imports both and diffs them --
// drift here is a failing test, not a stale comment. These are the ONLY
// action-linked furniture types that exist anywhere in the world -- every
// dwelling that has stations at all has exactly this set; nothing else
// drives a sim's chosen action.
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

// CITY.md item 1: the world is a plot of ground with several buildings on
// a grid, not one room. Building TYPE is a structural/visual distinction
// only -- chooseAction/applyAction were not extended with new actions, so
// only "dwelling" buildings currently have action-linked stations inside
// them (the same six STATIONS above, once per dwelling). "shop" and
// "workshop" exist as real, drawn structures with no interior stations
// yet -- honestly reported as such, not padded out with fake behavior.
export const BUILDING_TYPES = ["dwelling", "shop", "workshop"] as const;

// Objects that can exist outdoors, in the open ground between buildings --
// not inside any room, not tied to any sim action. Purely structural/
// decorative world data the renderer draws and grounding can point to.
export const OUTDOOR_OBJECT_TYPES = ["bench", "tree", "lampPost", "planter"] as const;

export const WORLD_FIELDS: Record<string, string> = {
  tick: "number -- world clock; hour is tick % 24, day is floor(tick / 24) + 1",
  rngState: "number -- reserved for future use, currently unused by any logic",
  money: "number -- shared across every sim in the world; there is no per-sim wallet",
  sims: "array of { id: string, home: string (a building id), needs: { hunger, energy, hygiene, fun, social }, lastAction }",
  buildings: "array of { id, type: dwelling|shop|workshop, label, plot: {x,y}, stations: string[] } -- a dwelling's stations are always the same six STATIONS keys; shop/workshop have none yet",
  outdoorObjects: "array of { id, type: bench|tree|lampPost|planter, plot: {x,y} } -- objects sitting in the open ground, not inside any building",
};

// What tick() actually does, per BUILD-WORLD.md's phrasing ("what tick
// touches, what the render loop understands") -- read off the real
// function, not asserted from memory. Unchanged by CITY.md: tick still
// only ever reads sim.needs, world.tick and world.money.
export const TICK_TOUCHES = ["chooseAction", "applyAction"] as const;

// Things a change request might assume that are NOT true today. The
// grounding stage checks a request's premises against exactly this list
// before ever proposing a plan -- see src/grounding.ts. Re-derived for
// CITY.md: a second location is no longer absent (that was the single
// biggest false premise before this change, and the reason refusal used
// to be the default answer), so it comes off this list. What's still
// genuinely missing comes from the actual code and the actual budget, not
// from habit.
export const NOT_YET_PRESENT = [
  "any entity type other than a sim (no pet, no NPC, no object with its own behavior)",
  "any sim action beyond the existing seven (idle, eat, sleep, shower, play, call, work)",
  "any station/furniture type beyond the six listed in STATIONS -- shop and workshop are real structures but have no interior stations yet",
  "a per-sim wallet (money is shared, world-level state)",
  "art assets or textures beyond what the renderer already draws procedurally -- there is no asset pipeline",
  "sound",
  "a new simulation subsystem such as weather, economy, or traffic logic -- more than one run's budget can implement and verify",
  "state shared between visitors in real time -- the world advances per visitor's own session, not a single synchronized clock everyone watches together",
  "persistence of world state across a page reload beyond what the worker's KV stores",
  "any randomness (rngState exists as a field but nothing reads or writes it)",
] as const;

/** Cheap, deterministic, plain-text summary -- exactly what the grounding
 * stage sends as context, and exactly what a human at Gate 1 can read in
 * five seconds. Producing this costs nothing; it's string formatting over
 * the constants above (and the real initialWorld() output), not a query,
 * not a call. */
export function structureSummary(): string {
  return [
    `Entity types that exist: ${ENTITY_TYPES.join(", ")}.`,
    `The world is a neighbourhood: a plot of ground with ${BUILDING_TYPES.length} building types (${BUILDING_TYPES.join(", ")}) laid out on a grid, paths and open ground between them, and objects that live outdoors (${OUTDOOR_OBJECT_TYPES.join(", ")}), not inside any room.`,
    `World state fields: ${Object.entries(WORLD_FIELDS)
      .map(([k, v]) => `${k} (${v})`)
      .join("; ")}.`,
    `Actions a sim can take: ${ACTIONS.join(", ")}.`,
    `Stations the renderer draws inside a dwelling, one per action: ${STATIONS.map((s) => `${s.label} (${s.action})`).join(", ")}. Every dwelling has the same set; shop and workshop buildings exist but have none.`,
    `Every tick calls: ${TICK_TOUCHES.join(", ")}, once per sim, in sim order.`,
    `Not yet present -- a request assuming any of these needs grounding to fail on, not a guess:\n` +
      NOT_YET_PRESENT.map((n) => `  - ${n}`).join("\n"),
  ].join("\n");
}
