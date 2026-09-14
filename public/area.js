// =============================================================================
// AREAS — REBUILD-PLAN.md W1/W2. Geography, not tiles of a uniform grid.
//
// An area is one island, one stretch of coast, one valley — whatever the
// generator decided its boundary was. This module does not know what that
// boundary looks like (that is the generator's business, later); it only
// knows the two facts every area has regardless of shape: an id, and a
// state.
//
// THE STATE MACHINE, AND WHY IT LIVES HERE AND NOT IN THE CALLER
//
// Every area is LOCKED or OPEN. Exactly one OPEN area is ACTIVE. Both of
// those are invariants of the WHOLE COLLECTION, not of one area in
// isolation — "am I the only active one" cannot be answered by an area
// asking itself. So the collection (createAreaWorld) is what enforces them,
// the same way a bank account object enforces "balance never goes negative"
// rather than trusting every caller to check first.
//
// W2, read literally: "Locked does not mean ungenerated." Locking controls
// PLAY, not existence — an area's terrain can exist from the first frame
// while still refusing entry. This module has nothing to say about terrain
// (out of scope this phase — REBUILD-PLAN.md's REVISED BUILD ORDER puts
// terrain at step 6, after this); it only guards the one thing that IS in
// scope now: whether the player may enter.
// =============================================================================

export const AREA_STATE = Object.freeze({ LOCKED: "LOCKED", OPEN: "OPEN" });

/**
 * One area's own record. Plain data — no behaviour, so it can be saved,
 * cloned or sent exactly like any other JSON, the same discipline
 * WORLD-BUILD-PLAN.md's layer model already runs on ("a layer holds DATA,
 * never behaviour").
 *
 * @param {object} opts
 * @param {string} opts.id     stable, unique within the world
 * @param {string} [opts.name] display name; defaults to the id
 * @param {"LOCKED"|"OPEN"} [opts.state]  defaults to LOCKED — an area starts
 *   closed unless the world explicitly opens it (W2: "One area is OPEN at
 *   the start", a decision the WORLD makes, not a default every area gets).
 */
export function createArea({ id, name = null, state = AREA_STATE.LOCKED } = {}) {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("createArea needs a non-empty string id");
  }
  if (state !== AREA_STATE.LOCKED && state !== AREA_STATE.OPEN) {
    throw new Error(`createArea: state must be LOCKED or OPEN, got ${JSON.stringify(state)}`);
  }
  return { id, name: name ?? id, state };
}

/**
 * The collection of every area in the world, plus the one rule that only
 * makes sense at the collection's level: at most one ACTIVE area at a time,
 * and it is always among the OPEN ones.
 *
 * `activeAreaId` is tracked here, not as a field on the area record itself
 * — an area object copied out of the collection (for a test, for a save
 * file) must not be able to lie about being active independently of
 * whether the world agrees.
 */
export function createAreaWorld({ areas = [] } = {}) {
  const byId = new Map();
  for (const a of areas) {
    if (byId.has(a.id)) throw new Error(`createAreaWorld: duplicate area id "${a.id}"`);
    byId.set(a.id, { ...a });
  }
  let activeAreaId = null;

  function get(id) {
    const a = byId.get(id);
    return a ? { ...a } : null;
  }

  function list() {
    return [...byId.values()].map((a) => ({ ...a }));
  }

  function requireArea(id) {
    const a = byId.get(id);
    if (!a) throw new Error(`createAreaWorld: no such area "${id}"`);
    return a;
  }

  /** LOCKED -> OPEN. Does not activate it — opening and entering are
   *  separate actions (W2's "opening an area is a game action"; entering it
   *  is a different one, `enter`, below). */
  function open(id) {
    const a = requireArea(id);
    a.state = AREA_STATE.OPEN;
    return { ...a };
  }

  /** OPEN -> LOCKED. Refused, not silently allowed, on the active area —
   *  locking the ground under the player is not a state this machine will
   *  produce by itself. */
  function lock(id) {
    const a = requireArea(id);
    if (id === activeAreaId) {
      return { ok: false, reason: "active", detail: `"${id}" is the active area and cannot be locked while entered` };
    }
    a.state = AREA_STATE.LOCKED;
    return { ok: true, area: { ...a } };
  }

  /**
   * Enter an area: it becomes ACTIVE, and whatever was ACTIVE before stops
   * being so. Refused — not entered anyway — when the target is LOCKED.
   * That refusal is the whole reason this function exists rather than
   * callers setting `activeAreaId` directly: a caller with a raw field
   * could enter a locked area by mistake and nothing would say no.
   */
  function enter(id) {
    const a = requireArea(id);
    if (a.state !== AREA_STATE.OPEN) {
      return { ok: false, reason: "locked", detail: `"${id}" is LOCKED and cannot be entered` };
    }
    const left = activeAreaId;
    activeAreaId = id;
    return { ok: true, entered: id, left };
  }

  /** Leave the active area. It stays OPEN — leaving is not locking. */
  function leave() {
    const left = activeAreaId;
    activeAreaId = null;
    return { left };
  }

  function active() {
    return activeAreaId === null ? null : { ...byId.get(activeAreaId) };
  }

  return { get, list, open, lock, enter, leave, active, get activeAreaId() { return activeAreaId; } };
}
