// =============================================================================
// CALIPER — A WORLD IS A SEED PLUS A STACK OF LAYERS
//
// WHAT THIS CHANGES
//
// Until now there was exactly one world. Not "a world" -- THE world, baked into
// module scope: `generateWorld()` took no seed, `new LandField(16)` took no
// seed, and DISTRICTS, SETTLEMENTS, BRIDGES and GRID were module constants
// describing that one place. Nothing could persist a change to it either; the
// only writes anywhere were UI preferences in localStorage.
//
// That is fine for a world you look at and fatal for a world you build in. Every
// one of these needs a world to be a VALUE rather than a module:
//
//     a player's own world            a clone of someone else's
//     a world inside a world          a world you can teleport between
//     an edit that survives a reload  an edit with an author
//     undo                            two players editing the same base
//
// So: a world is a SEED (which regenerates the base, identically, forever) plus
// an ORDERED STACK OF LAYERS (which are applied on top of it).
//
// WHY THIS WORKS AT ALL: THE BASE IS ALREADY DETERMINISTIC
//
// This model is only possible because the generated world is a pure function of
// its inputs, and this project already proved that rather than assuming it --
// `relief is deterministic`, `the whole plan is deterministic, two runs agree
// exactly`, sha256 fingerprints over every plot, block and road.
//
// That matters more than it looks. A layer says "plot block-146-1100-p0 is now
// a tank". If the base rebuilt differently on the next load, that address would
// point at different ground -- or at nothing -- and every stored edit would rot.
// Determinism is what makes an address a promise instead of a guess. The
// expensive part of this design was already paid for.
//
// WHAT A LAYER IS, AND WHY IT IS DATA
//
// Plain JSON: an id, an author, a time, an optional scope, and a list of edits
// keyed by address. Nothing in a layer is a function, a closure or a mesh.
//
// That is a deliberate constraint and it is what buys the whole feature list
// above. Data can be stored, sent, cloned, diffed, attributed, reordered and
// thrown away. A layer holding behaviour could do none of those things, and the
// first time we wanted to send someone a world we would be rewriting this file.
// Generated CODE has a home -- the forge verifies it and the result is
// referenced BY id from a layer -- but the layer itself stays data.
//
// WHAT THIS FILE DOES NOT DO
//
// It does not generate terrain, draw anything, or know what a building is. It
// composes: base + layers -> the world you see. Generation stays exactly where
// it is, because generation was never the problem.
// =============================================================================

/**
 * The ops a layer edit may carry.
 *
 * Deliberately small, and deliberately NOT the same list as the pipeline's
 * world-edit ops. Those describe changes to a source file; these describe
 * changes to an addressed object in a generated world. Sharing one vocabulary
 * between two different questions is how tables that must agree drift apart --
 * this project has found that four times.
 */
export const LAYER_OPS = Object.freeze(["replace", "retint", "move", "remove"]);

/** A layer edit is addressed at ONE object, by the id the plan already gives it. */
export function validateEdit(edit) {
  if (!edit || typeof edit !== "object") return "an edit must be an object";
  if (typeof edit.address !== "string" || !edit.address.trim()) {
    return "an edit needs an address -- the id of the thing it changes";
  }
  if (!LAYER_OPS.includes(edit.op)) {
    return `unknown op "${edit.op}" -- one of ${LAYER_OPS.join(", ")}`;
  }
  if (edit.op === "replace" && (!edit.payload || typeof edit.payload.modelId !== "string")) {
    return "a replace needs a payload.modelId naming the verified model to use";
  }
  if (edit.op === "retint" && (!edit.payload || typeof edit.payload.color !== "number")) {
    return "a retint needs a payload.color as a number";
  }
  if (edit.op === "move" && (!edit.payload || !Number.isFinite(edit.payload.x) || !Number.isFinite(edit.payload.z))) {
    return "a move needs payload.x and payload.z";
  }
  return null;
}

/**
 * Is this a well-formed layer?
 *
 * Checked when it is added, not when it is applied. A malformed layer that is
 * stored and then fails on every world build is the "absence nobody can see"
 * failure: the world quietly comes back without someone's work in it.
 */
export function validateLayer(layer) {
  if (!layer || typeof layer !== "object") return "a layer must be an object";
  if (typeof layer.id !== "string" || !layer.id.trim()) return "a layer needs an id";
  if (typeof layer.author !== "string" || !layer.author.trim()) {
    // Authorship is not bookkeeping. A world made of other people's layers
    // needs to know whose is whose, to credit it, to price it, and to let
    // someone remove exactly their own.
    return "a layer needs an author";
  }
  if (!Array.isArray(layer.edits)) return "a layer needs an edits array";
  if (layer.edits.length === 0) return "a layer with no edits changes nothing";
  for (let i = 0; i < layer.edits.length; i++) {
    const bad = validateEdit(layer.edits[i]);
    if (bad) return `edit ${i}: ${bad}`;
  }
  // A layer must be storable and sendable, and that has to be CHECKED rather
  // than assumed from a successful stringify. JSON.stringify silently DROPS a
  // function instead of failing on it, so a round-trip comparison of lengths
  // passes for a layer carrying a closure -- which then vanishes on save and
  // takes the player's work with it, quietly. Found by a mutation surviving.
  const live = firstLiveValue(layer);
  if (live) return `a layer must be plain data -- ${live} is not storable`;
  try {
    JSON.stringify(layer);
  } catch {
    return "a layer must be plain data -- this one cannot be serialised";
  }
  return null;
}

/**
 * Walk a value and name the first thing in it that cannot be stored.
 *
 * Functions and symbols are dropped by JSON.stringify rather than rejected, so
 * they have to be looked for directly. Cycles are handled by the stringify
 * below; this only reports what would silently disappear.
 */
function firstLiveValue(value, path = "a layer", depth = 0, seen = new Set()) {
  if (depth > 12) return null;
  const t = typeof value;
  if (t === "function") return `${path} is a function`;
  if (t === "symbol") return `${path} is a symbol`;
  if (value === null || t !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);
  for (const [k, v] of Object.entries(value)) {
    const found = firstLiveValue(v, `${path}.${k}`, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

/**
 * A world: a seed, and the layers on top of it.
 *
 * The seed is a STRING rather than a number so it can be a name -- "harbour-of-
 * saint-elms", a player's id, a share code. Anything that hashes to the same
 * value regenerates the same base, which is what makes a world shareable by
 * reference instead of by copying twenty thousand plots.
 */
export function createWorldModel({ seed = "caliper", layers = [] } = {}) {
  const stack = [];
  const errors = [];

  for (const layer of layers) {
    const bad = validateLayer(layer);
    if (bad) errors.push({ id: layer && layer.id, reason: bad });
    else stack.push(layer);
  }

  return {
    seed,

    /** Layers that were handed in but refused, with the reason. Never silent. */
    rejected() {
      return [...errors];
    },

    add(layer) {
      const bad = validateLayer(layer);
      if (bad) return { ok: false, reason: bad };
      if (stack.some((l) => l.id === layer.id)) return { ok: false, reason: `layer "${layer.id}" is already here` };
      stack.push(layer);
      return { ok: true };
    },

    /** Undo is dropping a layer. That is the whole feature. */
    remove(layerId) {
      const i = stack.findIndex((l) => l.id === layerId);
      if (i === -1) return { ok: false, reason: `no layer "${layerId}"` };
      stack.splice(i, 1);
      return { ok: true };
    },

    /**
     * A DEEP copy, not a shallow one.
     *
     * The first version spread each edit but shared its `payload` object, so a
     * clone handed out layers whose payloads still pointed at the original's.
     * Editing your copy of a world would silently edit the world you copied
     * from -- the worst possible version of this feature, and invisible until
     * someone noticed their world had changed. Found by a mutation surviving.
     */
    layers() {
      return JSON.parse(JSON.stringify(stack));
    },

    /** Everything by one author -- for crediting, pricing, or removing it all. */
    byAuthor(author) {
      return stack.filter((l) => l.author === author).map((l) => l.id);
    },

    /**
     * The edits that apply to one address, in order.
     *
     * LATER LAYERS WIN, and they win per-address rather than wholesale. Two
     * players editing the same world touch different things almost all of the
     * time; a model where the newest layer replaced the whole world would make
     * collaboration impossible and undo destructive.
     */
    editsFor(address) {
      const out = [];
      for (const layer of stack) {
        for (const edit of layer.edits) {
          if (edit.address === address) out.push({ ...edit, layerId: layer.id, author: layer.author });
        }
      }
      return out;
    },

    /**
     * The single resolved state of one address: the last edit of each kind.
     *
     * A move followed by a retint is both a move and a retint; a retint
     * followed by another retint is the second one. Collapsing by op rather
     * than taking only the last edit is what lets independent changes coexist
     * on the same object.
     */
    resolve(address) {
      const byOp = new Map();
      for (const e of this.editsFor(address)) byOp.set(e.op, e);
      if (byOp.has("remove")) return { removed: true, address };
      const out = { removed: false, address };
      for (const [op, e] of byOp) out[op] = e.payload;
      return out;
    },

    /** Every address any layer touches -- what the renderer must re-resolve. */
    touched() {
      const seen = new Set();
      for (const layer of stack) for (const edit of layer.edits) seen.add(edit.address);
      return [...seen];
    },

    /**
     * A clone: the same base, a copy of the stack, a new name.
     *
     * Cheap on purpose. A shared world is a seed and some JSON, not a copy of
     * the geometry -- which is what makes "clone this world and let me build on
     * it" a feature rather than an infrastructure project.
     */
    clone(newSeed = seed) {
      return createWorldModel({ seed: newSeed, layers: this.layers() });
    },

    /** Storable, sendable, diffable. The whole world in one JSON value. */
    toJSON() {
      return { seed, layers: this.layers() };
    },
  };
}

/**
 * Read a LAYER MODEL back from storage, keeping any refusals visible.
 *
 * Named worldModelFromJSON, not worldFromJSON, because public/world.js
 * exports its own worldFromJSON that returns a full world instance
 * ({ seed, plan, land, layers, grid, resolve, toJSON }) -- a different
 * shape round-tripping the same { seed, layers } payload. Two functions
 * with the same name and different shapes is the exact trap the districts/
 * settlements aliasing bugs earlier in this project were, one level up:
 * this is a naming trap, not a data trap, but the fix is the same --
 * stop letting them share a name.
 */
export function worldModelFromJSON(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  if (!data || typeof data !== "object") throw new Error("a stored world must be an object");
  return createWorldModel({ seed: data.seed, layers: Array.isArray(data.layers) ? data.layers : [] });
}

/**
 * Make a layer from one player action.
 *
 * The convenience that keeps every caller from inventing its own layer shape --
 * which is how a stack ends up holding four dialects of the same thing.
 */
export function layerFrom({ id, author, edits, scope = null, note = null, now = Date.now() }) {
  return {
    id,
    author,
    createdAt: new Date(now).toISOString(),
    scope,
    note,
    edits: Array.isArray(edits) ? edits : [edits],
  };
}
