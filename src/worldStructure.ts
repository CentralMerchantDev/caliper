// CALIPER world-build (BUILD-WORLD.md, chunk 4; extended by CITY.md item 1,
// FOUNDATION.md item 1): "the rules are not a written list -- they are the
// existing code." This file is that list made legible -- a cheap,
// deterministic, description of the world's actual structure, for the
// grounding stage (chunk 5) to read before ever calling a model. No model
// call produces this; it's just data about the code, kept next to the code
// it describes.
//
// FOUNDATION.md item 1 made this genuinely code-derived, not just
// hand-synced-and-tested-for-drift: SIM_BASELINE_SOURCE is evaluated once,
// at module load, and every constant below is read straight off that real
// output -- the type registry, the buildings, the surfaces. There is no
// second, hand-typed copy of "what types exist" anywhere in this file
// anymore. If simBaseline.ts's registry changes, this file's exports change
// with it automatically, on the next load -- not on the next person who
// remembers to update two files in the same commit.
import { SIM_BASELINE_SOURCE } from "./simBaseline";
import { readWorldData } from "./worldEdit";

interface BaselineObjectType {
  material: string;
  footprint: { w: number; d: number };
  station: { action: string; label: string } | null;
  emitsLight?: boolean;
}
interface BaselineWorld {
  buildings: { id: string; type: string; label: string; plot: { x: number; y: number } }[];
  placements: { id: string; type: string; location: string; plot?: { x: number; y: number } }[];
  objectTypes: Record<string, BaselineObjectType>;
  surfaces: Record<string, { material: string; color: string }>;
}

function loadBaselineWorld(): BaselineWorld {
  return readWorldData(SIM_BASELINE_SOURCE);
}

const BASELINE_WORLD = loadBaselineWorld();

export interface StationInfo {
  key: string;
  action: string;
  label: string;
}

// Every object-type entry that has a `station` -- these are the ONLY
// action-linked furniture types that exist anywhere in the world. Derived
// from the real registry, not a parallel hand-typed list -- see the file
// header.
export const STATIONS: StationInfo[] = Object.entries(BASELINE_WORLD.objectTypes)
  .filter((entry): entry is [string, BaselineObjectType & { station: { action: string; label: string } }] => entry[1].station !== null)
  .map(([key, t]) => ({ key, action: t.station.action, label: t.station.label }));

export const ACTIONS = ["idle", "eat", "sleep", "shower", "play", "call", "work"] as const;
export type WorldAction = (typeof ACTIONS)[number];

export const ENTITY_TYPES = ["sim"] as const;

// CITY.md item 1: the world is a plot of ground with several buildings on
// a grid, not one room. Building TYPE is a structural/visual distinction
// only -- chooseAction/applyAction were not extended with new actions, so
// only "dwelling" buildings currently have stations placed inside them (via
// the placement list, not a per-building field any more). "shop" and
// "workshop" exist as real, drawn structures with no interior stations
// yet -- honestly reported as such, not padded out with fake behavior.
export const BUILDING_TYPES = [...new Set(BASELINE_WORLD.buildings.map((b) => b.type))];
export const BUILDING_NAMES = BASELINE_WORLD.buildings.map((b) => `${b.label} (id: ${b.id}, type: ${b.type})`);

// Every registry type that is NOT a station -- freestanding outdoor props.
// Derived the same way as STATIONS, from the same real registry, so the
// two can never independently drift the way two hand-typed lists could.
export const OUTDOOR_OBJECT_TYPES = Object.entries(BASELINE_WORLD.objectTypes)
  .filter(([, t]) => t.station === null)
  .map(([key]) => key);

// FOUNDATION.md item 1: EVERY type the registry knows, stations and outdoor
// props together -- the single list that answers "can a placement of this
// type be added." Used by grounding/planning (this file) and by the
// render-criterion check (criteriaExecution.ts, criteriaDryRun.ts), which
// used to check STATIONS plus a hardcoded ["sim"] ENTITY_TYPES and silently
// never recognised an outdoor type like "lampPost" as valid -- a real gap,
// found while unifying this list, now closed structurally rather than by
// remembering to list outdoor types somewhere too.
export const OBJECT_TYPE_KEYS = Object.keys(BASELINE_WORLD.objectTypes);

// FOUNDATION.md item 4, folded from FINAL.md's surfaces model: named
// surfaces, real addressable data, derived from the real world.surfaces
// the same way everything else here is. Roof colours became trim/accent
// colours (used on a building's own sign post) once every building became
// open-topped -- there is no roof plane left to colour.
export const SURFACE_TYPES = Object.keys(BASELINE_WORLD.surfaces);

export const WORLD_FIELDS: Record<string, string> = {
  tick: "number -- world clock; hour is tick % 24, day is floor(tick / 24) + 1",
  rngState: "number -- reserved for future use, currently unused by any logic",
  money: "number -- shared across every sim in the world; there is no per-sim wallet",
  sims: "array of { id: string, home: string (a building id), needs: { hunger, energy, hygiene, fun, social }, lastAction }",
  buildings: `array of { id, type: ${BUILDING_TYPES.join("|")}, label, plot: {x,y} } -- a container other things are placed inside or around`,
  placements: `array of { id, type: one of the object types below, location: a building id or "outdoors", plot: {x,y} when location is "outdoors" } -- everything actually standing in the world, indoors or out. Adding an entry here is how a new instance of an existing type gets added.`,
  objectTypes: `object keyed by type name (${OBJECT_TYPE_KEYS.join(", ")}), each { material, footprint: {w,d}, station: {action,label}|null } -- what the renderer needs to draw a placement of that type and, for stations, which sim action it provides. Adding a key here is how a genuinely new object type gets added.`,
  surfaces: `object keyed by surface name (${SURFACE_TYPES.join(", ")}), each { material: string, color: string (hex) } -- read directly by the renderer, changeable like any other world field`,
};

// What tick() actually does, per BUILD-WORLD.md's phrasing ("what tick
// touches, what the render loop understands") -- read off the real
// function, not asserted from memory. Unchanged by CITY.md or FOUNDATION.md:
// tick still only ever reads sim.needs, world.tick and world.money.
export const TICK_TOUCHES = ["chooseAction", "applyAction"] as const;

// Things a change request might assume that are NOT true today. The
// grounding stage checks a request's premises against exactly this list
// before ever proposing a plan -- see src/grounding.ts. Re-derived for
// FOUNDATION.md item 1: "a station/furniture type beyond the six" is no
// longer a real limit -- the registry is designed to grow. What's actually
// still absent is a new SIM ACTION or a new ENTITY kind, which do require
// touching chooseAction/applyAction/tick and are the genuinely bounded
// case.
export const NOT_YET_PRESENT = [
  "any entity type other than a sim (no pet, no NPC, no object with its own behavior)",
  "any sim action beyond the existing seven (idle, eat, sleep, shower, play, call, work) -- adding one means touching chooseAction/applyAction, not just the registry",
  "a per-sim wallet (money is shared, world-level state)",
  "art assets or textures beyond primitive-shape geometry the renderer already draws procedurally -- there is no asset pipeline, no imported meshes or images",
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
 * not a call.
 *
 * FOUNDATION.md item 2: "the plan stage must know the difference between
 * adding a placement of an existing type (trivial), adding a new type plus
 * placements (small and bounded), changing an existing object's properties
 * (small), and a new kind of behaviour or subsystem (expensive)." Before
 * this, everything read as equally uncertain, so everything got treated as
 * the expensive case -- which is why a plainly supported request like
 * "add another street lamp" came back as a refusal. This paragraph is the
 * fix: it states the cost tiers explicitly, in the same summary grounding
 * and planning both read, so a data append no longer has to be inferred as
 * cheap -- it's stated as cheap. */
export function structureSummary(): string {
  return [
    `Entity types that exist: ${ENTITY_TYPES.join(", ")}.`,
    `The world is a neighbourhood: a plot of ground with ${BUILDING_TYPES.length} building types (${BUILDING_TYPES.join(", ")}) laid out on a grid, paths and open ground between them, and objects placed indoors or outdoors from a type registry.`,
    `Named buildings: ${BUILDING_NAMES.join(", ")}. "The tavern" means the building whose id and type are "shop"; use "shop" as the location id in placement data.`,
    `World state fields: ${Object.entries(WORLD_FIELDS)
      .map(([k, v]) => `${k} (${v})`)
      .join("; ")}.`,
    `Actions a sim can take: ${ACTIONS.join(", ")}.`,
    `Station types (each provides one sim action): ${STATIONS.map((s) => `${s.label} (${s.action})`).join(", ")}. Every dwelling has the same set placed inside it; the Tavern (shop) and workshop have none.`,
    `Outdoor prop types (no action, purely placed): ${OUTDOOR_OBJECT_TYPES.join(", ")}.`,
    `Named surfaces, each a real { material, color } pair in world state the renderer reads directly: ${SURFACE_TYPES.join(", ")}.`,
    `Cheap, always-possible operations on this world, cheapest first -- a request matching one of these is NOT the expensive case and should not be refused as one:\n` +
      `  1. Placing another instance of an EXISTING object type (${OBJECT_TYPE_KEYS.join(", ")}) -- one entry appended to the placements array. Outdoor placements require plot: {x, y} numbers strictly within parcel bounds 0.0..2.0 (e.g. {x: 1.0, y: 1.0} in the open plaza). No new code, no renderer change, verifiable by existence alone. This is what "add another street lamp" or "add a bench by the tavern" (location id "shop") is.\n` +
      `  2. Overriding a placement's colour, or changing an object type's or a surface's colour in the registry/surfaces data -- a small, existing-field edit.\n` +
      `  3. Adding a genuinely NEW object type -- one registry entry (definition has material: string, footprint: {w,d}, station: null, and a geometry recipe built from primitive shapes: box [w,h,d], cylinder [rTop,rBottom,h], sphere [r], icosahedron [r,detail] with position [x,y,z], valid color "#hex") plus at least one placement outdoors with plot: {x,y} in 0.0..2.0. Small and bounded, not a rewrite.\n` +
      `  The expensive case -- the honest place for a refusal -- is a request for a new SIM ACTION, a new ENTITY kind with its own behavior, or a new simulation subsystem (weather, economy, traffic). Those require touching chooseAction/applyAction/tick or adding real logic, not just data.`,
    `Every tick calls: ${TICK_TOUCHES.join(", ")}, once per sim, in sim order.`,
    `Not yet present -- a request assuming any of these needs grounding to fail on, not a guess:\n` +
      NOT_YET_PRESENT.map((n) => `  - ${n}`).join("\n"),
  ].join("\n");
}
