// =============================================================================
// WHAT IS AT ANY POINT, AT ANY TIME
//
// WHY THIS FILE EXISTS
//
// The stadium has houses in it. Not because anything placed them there on
// purpose -- features.js asks the land where the stadium goes, and it answers
// correctly -- but because city-plan.js grows settlements into "buildable"
// ground without ever asking whether something has already claimed it. Two
// subsystems, two private beliefs about the same ground, and nothing to
// reconcile them. That is the defect, and it is one defect wearing several
// coats: it is also why a camera bookmark can point at nothing and why a
// street can be drawn through a building that predates it.
//
// The fix is one registry that every occupant reserves ground in, and every
// placement decision reads from, instead of each subsystem keeping its own
// map. One question answers all of it:
//
//     whatIsAt(x, y, z, t) -> { kind, id, owner, solid, since, until }
//
// WHY FOUR ARGUMENTS AND NOT TWO
//
// A flat (x, z) registry answers "what plot is here" and stops there. It
// cannot say whether a point is buried in the hillside or standing in open
// air above it, and it cannot say whether that was true a year ago or is only
// true from today. Building the flat version first and adding height and time
// later means building the whole thing twice, because every caller of a 2D
// answer has to be found and upgraded. So every reservation carries a height
// range and a time range from its first day, even though most of today's
// callers only ever ask about the ground at the current moment. An unused
// dimension costs nothing to carry and everything to bolt on afterward.
//
// WHY ROCK IS SOLID
//
// "Cannot build inside a hill" and "cannot build inside a stadium" used to be
// two different problems, because a hill was a height sample and a stadium was
// a table entry. They are the same problem: a volume that is already occupied.
// Treating everything below the terrain surface as solid rock -- occupied by
// the earth itself, at every time -- means a query into a hillside and a query
// into a reserved footprint are refused by the exact same check, not two.
// =============================================================================

/**
 * @typedef {Object} Occupant
 * @property {string} kind    "feature" | "plot" | "road" | "rock" | "free" | ...
 * @property {string|null} id
 * @property {string|null} owner
 * @property {boolean} solid  can a new volume be reserved inside this one?
 * @property {number} since   world time this occupant starts existing, inclusive
 * @property {number} until   world time this occupant stops existing, exclusive
 */

/** The answer for a point nothing has ever claimed. */
const FREE = Object.freeze({ kind: "free", id: null, owner: null, solid: false, since: -Infinity, until: Infinity });

/** The answer for a point below the terrain surface. Rock is solid at every time -- the ground does not un-build itself. */
const ROCK = Object.freeze({ kind: "rock", id: null, owner: null, solid: true, since: -Infinity, until: Infinity });

/**
 * @param {(x: number, z: number) => number} [heightAt]
 *        Ground surface height. Optional: a registry built to reason about
 *        footprints alone (no terrain available yet) simply never returns
 *        ROCK, which is correct -- it has nothing to say about depth.
 */
export function createWorldRegistry(heightAt = null) {
  /** @type {Array<Occupant & {xMin:number,xMax:number,zMin:number,zMax:number,yMin:number,yMax:number}>} */
  const entries = [];

  /**
   * Claim a volume. Nothing checks for a clash here on purpose: reserving is
   * the act of an authority (a feature manifest, a plan generator) that has
   * already decided this ground is committed. The refusal happens on the
   * OTHER side -- whoever is about to place something new calls
   * `overlaps()`/`findFree()` first and does not reserve if it is occupied.
   * A registry that silently rejected a reserve() would hide the bug in the
   * caller instead of surfacing it.
   */
  function reserve({
    kind, id = null, owner = null,
    xMin, xMax, zMin, zMax,
    yMin = -Infinity, yMax = Infinity,
    solid = true,
    since = 0, until = Infinity,
  }) {
    if (!(xMax >= xMin) || !(zMax >= zMin)) {
      throw new Error(`world-registry: reserve(${kind}/${id}) has an inverted or NaN footprint`);
    }
    const entry = { kind, id, owner, xMin, xMax, zMin, zMax, yMin, yMax, solid, since, until };
    entries.push(entry);
    return entry;
  }

  function release(id) {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].id === id) entries.splice(i, 1);
    }
  }

  /**
   * THE single query. What occupies this exact point, at this exact time?
   *
   * Order matters and is deliberate: rock is checked first because it is the
   * one occupant nothing can ever be reserved inside of, at any recorded time
   * -- the earth was there before the plan and stays there after. Reservations
   * are then checked in the order they were made, which is oldest-first,
   * matching "whoever claimed this ground first owns the conflict".
   */
  function whatIsAt(x, y, z, t = 0) {
    if (heightAt && y < heightAt(x, z)) return ROCK;
    for (const e of entries) {
      if (t < e.since || t >= e.until) continue;
      if (x < e.xMin || x > e.xMax || z < e.zMin || z > e.zMax) continue;
      if (y < e.yMin || y > e.yMax) continue;
      return { kind: e.kind, id: e.id, owner: e.owner, solid: e.solid, since: e.since, until: e.until };
    }
    return FREE;
  }

  /**
   * The 2D plan question: is this (x, z) column claimed at ground level, at
   * time t? Every plan-generation caller wants this shape, not the full 3D
   * query, so it is offered directly rather than making every caller pass a y.
   */
  function occupiedAt(x, z, t = 0) {
    for (const e of entries) {
      if (t < e.since || t >= e.until) continue;
      if (x < e.xMin || x > e.xMax || z < e.zMin || z > e.zMax) continue;
      return e;
    }
    return null;
  }

  /** Does this rectangle touch any solid reservation at time t? Returns the first one found, or null. */
  function overlapsReserved(xMin, xMax, zMin, zMax, t = 0) {
    for (const e of entries) {
      if (!e.solid) continue;
      if (t < e.since || t >= e.until) continue;
      if (xMax < e.xMin || xMin > e.xMax || zMax < e.zMin || zMin > e.zMax) continue;
      return e;
    }
    return null;
  }

  /**
   * The nearest point to `near` where a `w` x `d` footprint touches nothing
   * solid. Same ring-search shape as land-use.js's findSite, because that is
   * the shape "find me room for this" always takes -- try where you want,
   * then spiral out.
   */
  function findFree(w, d, near, { radius = 1500, step = 40, t = 0 } = {}) {
    const fits = (cx, cz) => !overlapsReserved(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, t);
    if (fits(near.x, near.z)) return { x: near.x, z: near.z, moved: 0 };
    for (let r = step; r <= radius; r += step) {
      const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        const x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r;
        if (fits(x, z)) return { x, z, moved: r };
      }
    }
    return null;
  }

  /** Every reservation currently held, for tests and for a debug inspector. Copied so a caller cannot mutate the registry by editing the array. */
  function list() {
    return entries.map((e) => ({ ...e }));
  }

  return { reserve, release, whatIsAt, occupiedAt, overlapsReserved, findFree, list };
}
