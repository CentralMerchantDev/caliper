// =============================================================================
// CALIPER — QUESTS
//
// WHAT THIS IS
//
// A quest is a QUESTION ABOUT THE WORLD that can be answered by running a
// function. "Have you visited three districts?" "Is there a red building on the
// seawall?" The function is the quest.
//
// WHY IT IS SHAPED THIS WAY, AND WHY IT IS THE FIRST THING THE AGENT WRITES
//
// The point of this project is that a player describes something and the coding
// agent WRITES IT, checks it, repairs it, and the result appears in the game.
// Not a menu of predefined options -- if everything is predefined, the whole
// demonstration is dead.
//
// So the first thing the agent is asked to author has to be something where
// "did it work?" is answerable by machine. A quest is the best possible
// candidate, and it is worth being explicit about why:
//
//   IT IS BEHAVIOUR, NOT DATA. The existing data-edit path can compose new
//   OBJECTS from a closed vocabulary of boxes and spheres, but it cannot
//   express a rule -- `station.action` must name an action that already
//   exists. A quest is a rule. It is exactly the thing the safe path cannot
//   reach, which makes it the honest test of the unsafe one.
//
//   IT HAS A VERIFICATION CONTRACT ALREADY. `SimTestCase` in src/types.ts is
//   {name, fn, args, expected}: run a named function with arguments, compare
//   the result. A quest check is a named function taking one argument and
//   returning a small object. The sandbox that verifies a generated
//   `camelToSnake` verifies a generated quest check without changing shape.
//
//   IT CANNOT BREAK THE WORLD. A check reads a state snapshot and returns a
//   verdict. It draws nothing, mutates nothing and touches no renderer, so a
//   bad one is a wrong answer rather than a broken frame.
//
//   IT IS THE BETTER DEMONSTRATION. "I asked for a quest, it wrote the code,
//   the code was tested, and now I can play it" is a stronger sentence than
//   any change to an object's colour.
//
// THE RULE THIS FILE ENFORCES
//
// A quest may only say "done" when done is TRUE -- the project's thesis,
// applied to the one place a generated function gets to make a claim about the
// player's world. A check that throws does not complete a quest. A check that
// returns nonsense does not complete a quest. A check that returns `true` for a
// world it never looked at is the failure this file is written against, and
// `evaluateQuest` is where that is refused rather than trusted.
// =============================================================================

/**
 * The fields a quest check is allowed to see.
 *
 * DELIBERATELY SMALL, AND DELIBERATELY A SNAPSHOT.
 *
 * Three reasons, all load-bearing:
 *
 *   1. A GENERATED CHECK IS SENT THIS IN A PROMPT. The model has to be told
 *      exactly what exists, or it will invent a field, and a check reading
 *      `state.player.inventory` on a world that has no inventory is a quest
 *      that can never complete and a bug nobody can see. Every field here is
 *      one the model may rely on; nothing else exists.
 *
 *   2. IT MUST BE SERIALISABLE. The check runs in an isolate during
 *      verification and in the browser during play. If the state carried live
 *      objects -- a THREE.Mesh, the renderer, a closure -- those two would be
 *      different worlds and a check verified in one would be unverified in the
 *      other. Plain data means the thing that was tested is the thing that runs.
 *
 *   3. IT IS A BOUNDARY, NOT A CONVENIENCE. A check cannot reach the DOM, the
 *      network or the renderer because it is never handed them. That is a
 *      stronger guarantee than scanning for misuse afterwards.
 */
export const QUEST_STATE_FIELDS = Object.freeze({
  player: ["x", "z", "mode", "visitedDistricts", "visitedSettlements"],
  world: ["plots", "blocks", "districts", "settlements", "bridges"],
  time: ["day", "hour"],
  built: ["placementIds"],
  // WHAT THE WORLD'S OWN LAYER STACK ACTUALLY HOLDS -- not a UI signal.
  // "Change something in the world" can only honestly complete by reading
  // this, because it is sourced from world-model.js's own touched()/
  // layers() rather than anything a player-facing flag could set without a
  // real edit behind it.
  changed: ["touchedAddresses", "layerCount"],
});

/**
 * Build the snapshot a check is given.
 *
 * Counts and ids, not objects. A quest may ask "how many plots are there" and
 * "am I in the harbour district"; it may not walk 20,000 plot objects, which
 * would make every check slow and would put the whole world in a prompt.
 */
export function questState(world, player = {}, time = {}, built = {}, layers = null) {
  const w = world || {};
  return {
    player: {
      x: Number.isFinite(player.x) ? player.x : 0,
      z: Number.isFinite(player.z) ? player.z : 0,
      mode: typeof player.mode === "string" ? player.mode : "orbit",
      visitedDistricts: Array.isArray(player.visitedDistricts) ? [...player.visitedDistricts] : [],
      visitedSettlements: Array.isArray(player.visitedSettlements) ? [...player.visitedSettlements] : [],
    },
    world: {
      plots: Array.isArray(w.plots) ? w.plots.length : 0,
      blocks: Array.isArray(w.blocks) ? w.blocks.length : 0,
      bridges: Array.isArray(w.bridges) ? w.bridges.length : 0,
      districts: Array.isArray(w.districts) ? w.districts.map((d) => d.id) : [],
      settlements: Array.isArray(w.settlements) ? w.settlements.map((s) => s.id) : [],
    },
    time: {
      day: Number.isFinite(time.day) ? time.day : 1,
      hour: Number.isFinite(time.hour) ? time.hour : 12,
    },
    built: {
      placementIds: Array.isArray(built.placementIds) ? [...built.placementIds] : [],
    },
    // `layers` is the live layer MODEL (world.layers from public/world.js),
    // not a snapshot someone could fake by hand -- touched()/layers() are
    // the same calls world-model.js's own tests already prove correct.
    changed: {
      touchedAddresses: layers && typeof layers.touched === "function" ? layers.touched() : [],
      layerCount: layers && typeof layers.layers === "function" ? layers.layers().length : 0,
    },
  };
}

/** The verdict shape a check must return. Anything else is refused. */
export const VERDICT_KEYS = Object.freeze(["done", "progress", "note"]);

/**
 * Is this a well-formed quest?
 *
 * Checked BEFORE it is ever run, and separately from whether it is correct.
 * A malformed quest is a different failure from a wrong one, and saying which
 * is what lets a repair loop fix the right thing.
 */
export function validateQuest(quest) {
  if (!quest || typeof quest !== "object") return "a quest must be an object";
  if (typeof quest.id !== "string" || !quest.id.trim()) return "a quest needs an id";
  if (typeof quest.title !== "string" || !quest.title.trim()) return "a quest needs a title";
  if (typeof quest.brief !== "string" || !quest.brief.trim()) {
    return "a quest needs a brief -- the player has to be told what to do";
  }
  if (typeof quest.check !== "function") return "a quest needs a check function";
  // A quest that takes no argument cannot be reading the world, so it cannot be
  // answering a question about it. That is a lookup wearing a quest's costume.
  if (quest.check.length < 1) return "a quest's check must take the world state as its argument";
  return null;
}

/**
 * Run a quest's check against a state, and REFUSE anything that is not a real
 * answer.
 *
 * This is the whole point of the file. A generated function is about to make a
 * claim about the player's world, and the claim is only worth having if the
 * function actually ran and actually looked. So:
 *
 *   - a check that THROWS does not complete the quest. It reports `errored`,
 *     which is a third outcome -- not done, and not merely "not yet". A quest
 *     silently stuck at not-done because its check crashes every tick is the
 *     exact "absence nobody can see" this project keeps finding.
 *   - a check returning a non-object, or `true`, or nothing, is refused. A
 *     bare `true` is the single most likely thing a wrong generated check
 *     returns, and accepting it would mean every broken quest completes
 *     immediately.
 *   - `done` must be a real boolean, not a truthy value. `done: "yes"` and
 *     `done: 1` are refused, because a check that is sloppy about its verdict
 *     is a check nobody should trust with one.
 *   - `progress` is clamped to 0..1 and never invents completion: progress 1
 *     does not imply done, and done does not require progress 1. They are two
 *     claims and each is the check's own to make.
 */
export function evaluateQuest(quest, state) {
  const malformed = validateQuest(quest);
  if (malformed) return { done: false, progress: 0, errored: true, reason: malformed };

  let raw;
  try {
    raw = quest.check(state);
  } catch (e) {
    return {
      done: false,
      progress: 0,
      errored: true,
      reason: `check threw: ${e && e.message ? e.message : String(e)}`,
    };
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      done: false,
      progress: 0,
      errored: true,
      reason: `check returned ${Array.isArray(raw) ? "an array" : typeof raw}, not a verdict object`,
    };
  }
  if (typeof raw.done !== "boolean") {
    return {
      done: false,
      progress: 0,
      errored: true,
      reason: `check returned done: ${JSON.stringify(raw.done)} -- it must be a real boolean`,
    };
  }

  const progress = Number.isFinite(raw.progress) ? Math.min(1, Math.max(0, raw.progress)) : (raw.done ? 1 : 0);
  const note = typeof raw.note === "string" ? raw.note.slice(0, 240) : null;
  return { done: raw.done, progress, errored: false, reason: null, note };
}

/**
 * The quest log: what has been offered, what is being played, what is finished.
 *
 * Completion is ONE-WAY. A quest that has been completed stays completed even
 * if the world later changes so its check would say no -- you did visit those
 * districts, and a world edit afterwards does not undo that. Re-running checks
 * against a moving world and letting them retract is how a player loses
 * progress for reasons they cannot see.
 */
export function createQuestLog() {
  const quests = new Map();
  const state = new Map();   // id -> { done, progress, errored, reason, note, completedAt }

  return {
    /** Add a quest. Refuses a malformed one rather than storing it. */
    offer(quest) {
      const bad = validateQuest(quest);
      if (bad) return { ok: false, reason: bad };
      if (quests.has(quest.id)) return { ok: false, reason: `a quest with id "${quest.id}" is already offered` };
      quests.set(quest.id, quest);
      state.set(quest.id, { done: false, progress: 0, errored: false, reason: null, note: null, completedAt: null });
      return { ok: true };
    },

    /** Re-check every quest that is not already complete. */
    update(snapshot, now = Date.now()) {
      const changed = [];
      for (const [id, quest] of quests) {
        const prev = state.get(id);
        if (prev.done) continue;                 // completion is one-way
        const verdict = evaluateQuest(quest, snapshot);
        const next = { ...verdict, completedAt: verdict.done ? now : null };
        state.set(id, next);
        if (next.done !== prev.done || next.progress !== prev.progress || next.errored !== prev.errored) {
          changed.push({ id, ...next });
        }
      }
      return changed;
    },

    get(id) {
      const q = quests.get(id);
      return q ? { ...q, ...state.get(id) } : null;
    },

    list() {
      return [...quests.keys()].map((id) => ({ ...quests.get(id), ...state.get(id) }));
    },

    /**
     * Quests whose check is broken, reported rather than swallowed.
     *
     * A generated quest that always throws would otherwise sit in the log
     * forever at 0% looking merely difficult. The difference between "you have
     * not done this yet" and "this cannot be done" is the difference the
     * player needs and the repair loop needs.
     */
    broken() {
      return [...state.entries()].filter(([, s]) => s.errored).map(([id, s]) => ({ id, reason: s.reason }));
    },

    size() {
      return quests.size;
    },
  };
}
