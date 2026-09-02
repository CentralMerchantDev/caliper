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
// The open sea gets the same treatment for the same reason: it is not a
// special case, it is just another derived answer, `heightAt(x, z) < 0` away.
//
// WHY SOFT OCCUPANCY IS NOT "IGNORE IT"
//
// A park and a stadium are both things that are there. The difference is not
// whether they block automatic placement -- both do, so a road generator does
// not grow a street through a wheat field for the same reason it does not
// grow one through a stadium. The difference is what it takes to build on top
// of them afterward: a stadium is not meant to be removed by anything this
// codebase does; a field is, by a caller that looks at `solid: false`, decides
// that is fine, and calls release() before reserving something new. "Soft"
// describes what a caller may choose to do about it, not what it does to a
// blind search.
// =============================================================================

/**
 * @typedef {Object} Occupant
 * @property {string} kind    "feature" | "plot" | "road" | "rock" | "free" | ...
 * @property {string|null} id
 * @property {string|null} owner
 * @property {boolean} solid  hard occupancy (true: a road, a building, rock,
 *   water -- normally permanent) vs soft (false: a park, a field -- removable
 *   by a caller that explicitly release()s it first). Both block
 *   overlapsReserved()/findFree() equally; `solid` is what a caller reads to
 *   decide whether removing what is there is a reasonable thing to offer.
 * @property {number} since   world time this occupant starts existing, inclusive
 * @property {number} until   world time this occupant stops existing, exclusive
 */

/** The answer for a point nothing has ever claimed. */
const FREE = Object.freeze({ kind: "free", id: null, owner: null, solid: false, since: -Infinity, until: Infinity });

/** The answer for a point below the terrain surface. Rock is solid at every time -- the ground does not un-build itself. */
const ROCK = Object.freeze({ kind: "rock", id: null, owner: null, solid: true, since: -Infinity, until: Infinity });

/**
 * The answer for a point in the open sea -- at or above the seabed, at or
 * below sea level, wherever the column beneath it is underwater at all.
 *
 * Like ROCK, this is a derived rule rather than a reservation: the sea is
 * everywhere `heightAt(x, z) < 0`, which is most of the world's area, and
 * enumerating that as discrete rectangles would mean maintaining a second
 * copy of the coastline. It is solid for the same reason rock is -- nothing
 * gets to silently reserve a volume inside open water; a marina or a bridge
 * has to say so explicitly, which is exactly what registering them does.
 */
const WATER = Object.freeze({ kind: "water", id: null, owner: null, solid: true, since: -Infinity, until: Infinity });

/**
 * @param {(x: number, z: number) => number} [heightAt]
 *        Ground surface height. Optional: a registry built to reason about
 *        footprints alone (no terrain available yet) simply never returns
 *        ROCK, which is correct -- it has nothing to say about depth.
 */
export function createWorldRegistry(heightAt = null) {
  /** @type {Array<Occupant & {xMin:number,xMax:number,zMin:number,zMax:number,yMin:number,yMax:number}>} */
  const entries = [];

  // ---------------------------------------------------------------------------
  // A BUCKET GRID OVER THE RESERVATIONS
  //
  // Every query was a scan of the whole array, and a query that finds NOTHING
  // has to examine every entry to know it. Measured on this machine, 5,000
  // queries that miss:
  //
  //       1,000 entries      3 us per query
  //       5,000 entries     17 us
  //      20,000 entries     85 us
  //      40,000 entries    276 us
  //
  // A clean linear curve, and misses are the common case: a layout engine asks
  // "is this free?" far more often than it asks "what is here?". canPlace issues
  // three surfaceAt passes over its sample points, so one placement of a 16-
  // sample footprint was 48 full scans of the world.
  //
  // The world is 26 km and the things in it are metres across, so bucketing by
  // position turns a scan into a handful of comparisons. Same reasoning, and the
  // same 400 m cell, as spatial-index.js already uses over plots -- that one is
  // built for plots specifically and cannot hold arbitrary reservations, which
  // is why this is here rather than a call to it.
  const BUCKET = 400;
  /** @type {Map<number, Array<object>>} */
  const buckets = new Map();
  // Anything so large that indexing it would cost more than scanning it. A
  // reservation spanning the whole world would otherwise be inserted into
  // thousands of buckets, and be found in all of them.
  const sprawling = [];
  const MAX_BUCKETS_PER_ENTRY = 400;
  const bkey = (i, j) => i * 65536 + j;

  function bucketRange(e) {
    return {
      i0: Math.floor(e.xMin / BUCKET), i1: Math.floor(e.xMax / BUCKET),
      j0: Math.floor(e.zMin / BUCKET), j1: Math.floor(e.zMax / BUCKET),
    };
  }

  function index(e) {
    const { i0, i1, j0, j1 } = bucketRange(e);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAX_BUCKETS_PER_ENTRY) { sprawling.push(e); return; }
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = bkey(i, j);
        let b = buckets.get(k);
        if (!b) buckets.set(k, (b = []));
        b.push(e);
      }
    }
  }

  function unindex(e) {
    const at = sprawling.indexOf(e);
    if (at >= 0) { sprawling.splice(at, 1); return; }
    const { i0, i1, j0, j1 } = bucketRange(e);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const b = buckets.get(bkey(i, j));
        if (!b) continue;
        const n = b.indexOf(e);
        if (n >= 0) b.splice(n, 1);
      }
    }
  }

  /**
   * Every entry that could possibly overlap this rectangle, in the order they
   * were reserved.
   *
   * ORDER IS PRESERVED DELIBERATELY. whatIsAt documents "whoever claimed this
   * ground first owns the conflict", and bucketing would otherwise answer by
   * whichever bucket happened to be visited first -- a different answer for the
   * same world depending on which way the query rectangle was drawn. Each entry
   * carries the serial it was reserved with, and candidates are walked in that
   * order rather than sorted, so the cost stays linear in the CANDIDATES rather
   * than in the world.
   */
  function candidates(xMin, xMax, zMin, zMax) {
    const i0 = Math.floor(xMin / BUCKET), i1 = Math.floor(xMax / BUCKET);
    const j0 = Math.floor(zMin / BUCKET), j1 = Math.floor(zMax / BUCKET);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAX_BUCKETS_PER_ENTRY) {
      // A query bigger than the index is worth: scan everything, which is what
      // used to happen for every query and is still correct.
      return entries;
    }
    // THE FAST PATH, AND IT IS NOT AN OPTIMISATION -- IT IS UNDOING A REGRESSION.
    //
    // Indexing fixed the misses (276 us -> 1 us at 40,000) and made the HITS
    // three times slower: 6 us -> 19 us. The dedupe Set, the candidate array and
    // the sort were being built on every query, including the overwhelmingly
    // common one that touches a single bucket and matches its first entry.
    // Measuring only the case you set out to improve is how a change gets
    // reported as a win while being a loss for most callers.
    //
    // A single bucket needs none of that machinery: entries are pushed into each
    // bucket in serial order, so the bucket's own array is already correctly
    // ordered. Only a multi-bucket query can see the same entry twice or out of
    // order, and only then is the bookkeeping worth its cost.
    if (i0 === i1 && j0 === j1 && sprawling.length === 0) {
      // The bucket's own array, not a copy of it. Returning an ARRAY rather than
      // a generator is worth measuring: the generator version cost 7 us per hit
      // against a 4 us baseline purely in iterator machinery, on a path that
      // runs tens of times per placement.
      return buckets.get(bkey(i0, j0)) || EMPTY;
    }
    const seen = new Set();
    const found = [];
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const e of buckets.get(bkey(i, j)) || []) {
          if (seen.has(e._n)) continue;
          seen.add(e._n);
          found.push(e);
        }
      }
    }
    for (const e of sprawling) if (!seen.has(e._n)) { seen.add(e._n); found.push(e); }
    found.sort((a, b) => a._n - b._n);
    return found;
  }

  /** Shared, so a miss does not allocate. */
  const EMPTY = [];

  let serial = 0;

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
    // WHAT THIS GROUND IS, when the kind alone does not say it.
    //
    // A road is not one surface: a boulevard is a carriageway with a verge, a
    // sidewalk and parking either side, and those carry different things -- a
    // lamp belongs on one and a car on another. Without this the only thing a
    // caller could say was "road", every strip of it degraded to CARRIAGEWAY,
    // and "on the road" and "on the pavement" were the same fact again.
    surface = null,
    since = 0, until = Infinity,
  }) {
    if (!(xMax >= xMin) || !(zMax >= zMin)) {
      throw new Error(`world-registry: reserve(${kind}/${id}) has an inverted or NaN footprint`);
    }
    const entry = { kind, id, owner, xMin, xMax, zMin, zMax, yMin, yMax, solid, surface, since, until, _n: serial++ };
    entries.push(entry);
    index(entry);
    return entry;
  }

  /**
   * Erase a reservation as though it had never been made.
   *
   * For CORRECTING A MISTAKE -- something reserved that should not have been.
   * Not for demolition: see close(). The distinction is the whole reason this
   * registry carries a time range, and collapsing the two would mean the world
   * could never answer "what was here before".
   */
  function release(id) {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].id === id) { unindex(entries[i]); entries.splice(i, 1); }
    }
  }

  /**
   * End something's life at time `t`. It stood here until then, and it did not
   * afterwards.
   *
   * REMOVING A THING IS CLOSING ITS INTERVAL, NOT ERASING IT -- which is the
   * claim docs/WORLD-RULES.md makes about time, and which nothing implemented
   * until now. Every reservation has carried `since` and `until` since the file
   * was written, but the only way to take something away was release(), which
   * deletes the record. So the world could say what is here, and could have
   * said what was here a year ago, and in practice could never say the second
   * one about anything that had been removed. An unused dimension is cheap; a
   * dimension that is carried and then quietly discarded is a false claim.
   *
   * Returns how many entries were closed, so a caller that expected to end one
   * thing and ended none can tell.
   *
   * (This block documents close(), which is defined below reopen(). It sat
   * immediately above reopen() with reopen's own docstring stacked under it, so
   * close() read as undocumented and reopen() carried two -- in a file where
   * the comments are the specification.)
   */
  /**
   * Undo a close: ONE record did not stop existing after all.
   *
   * The symmetric partner of close(), and it exists for one reason: a MOVE is a
   * close followed by a place, and when the new position is refused the old one
   * has to come back exactly as it was.
   *
   * IT TAKES A `since`, AND THAT IS THE WHOLE FIX. The first version matched on
   * `id` alone. An object that has been moved has SEVERAL records under one id
   * -- one per place it has stood -- so reopening by id reopened the history
   * too, and a hut that had moved once and was then refused a second move ended
   * up standing in both places at once, forever:
   *
   *     after move 1   { x -3, since 0, until 5 }  { x 97, since 5, until Inf }
   *     after refusal  { x -3, since 0, until Inf} { x 97, since 5, until Inf }
   *
   * That is the same corruption the previous implementation was written to
   * prevent, arrived at by a different route -- and the test that caught the
   * first version could not catch this one, because it only ever moved an
   * object that had never moved before. (id, since) identifies one record.
   */
  function reopen(id, until = Infinity, since = undefined) {
    let n = 0;
    for (const e of entries) {
      if (e.id !== id) continue;
      if (since !== undefined && e.since !== since) continue;
      e.until = until; n++;
    }
    return n;
  }

  function close(id, t = 0) {
    let n = 0;
    for (const e of entries) {
      if (e.id !== id) continue;
      if (t <= e.since) {
        // Closing before it began would make an interval that is true at no
        // time at all -- silently correct-looking and impossible to reason
        // about later.
        throw new Error(
          `world-registry: close(${id}, ${t}) is at or before its since (${e.since}); ` +
          `use release() to undo a reservation that should never have existed`,
        );
      }
      if (t < e.until) { e.until = t; n++; }
    }
    return n;
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
    if (heightAt) {
      const surface = heightAt(x, z);
      if (y < surface) return ROCK;
      // Underwater column: the seabed is below sea level and this point is at
      // or below the surface (y <= 0) but not below the seabed (caught above).
      // A dry column (surface >= 0) never reaches this -- y < surface already
      // returned ROCK for anything below it, and surface itself is dry ground.
      if (surface < 0 && y <= 0) return WATER;
    }
    for (const e of candidates(x, x, z, z)) {
      if (t < e.since || t >= e.until) continue;
      if (x < e.xMin || x > e.xMax || z < e.zMin || z > e.zMax) continue;
      if (y < e.yMin || y > e.yMax) continue;
      return { kind: e.kind, id: e.id, owner: e.owner, solid: e.solid, surface: e.surface, since: e.since, until: e.until };
    }
    return FREE;
  }

  /**
   * The 2D plan question: is this (x, z) column claimed at ground level, at
   * time t? Every plan-generation caller wants this shape, not the full 3D
   * query, so it is offered directly rather than making every caller pass a y.
   */
  function occupiedAt(x, z, t = 0) {
    for (const e of candidates(x, x, z, z)) {
      if (t < e.since || t >= e.until) continue;
      if (x < e.xMin || x > e.xMax || z < e.zMin || z > e.zMax) continue;
      return e;
    }
    return null;
  }

  /**
   * Does this rectangle touch a reservation at time t? Returns the first one
   * found, or null.
   *
   * `solid` on an entry is NOT a filter here -- both hard occupants (a road,
   * a building, a stadium) and soft ones (a park, a wheat field) block by
   * default. That is the point of "soft": a field is buildable only if the
   * caller SAYS it may replace it, not merely because nothing asked. This
   * used to skip `solid: false` entries unconditionally, which would have
   * made every park and field invisible to automatic plot generation the
   * moment one was registered -- silently reintroducing the exact bug this
   * file exists to prevent, just for softer ground. The one and only way to
   * build on reserved ground, hard or soft, is release() it first: an
   * explicit act by a caller who has looked at what is there and decided.
   */
  function overlapsReserved(xMin, xMax, zMin, zMax, t = 0, opts = {}) {
    const {
      yMin = -Infinity, yMax = Infinity,
      ignoreKinds = null, onlyKinds = null,
    } = opts;
    const ignore = ignoreKinds ? new Set(ignoreKinds) : null;
    const only = onlyKinds ? new Set(onlyKinds) : null;

    for (const e of candidates(xMin, xMax, zMin, zMax)) {
      if (t < e.since || t >= e.until) continue;
      // WHICH QUESTION IS BEING ASKED.
      //
      // "May I build a house here?" and "may I stand here?" are different, and
      // this used to be unable to tell them apart -- there was no filter, so a
      // caller got one answer covering both. That is not a missing feature, it
      // is a wrong answer waiting: roads are reserved across their FULL right
      // of way, footway included, so a lamp on a pavement is legitimately
      // INSIDE a road's rectangle. Asked without a filter, this refuses every
      // lamp and every bench in the city and empties the street scene, while
      // looking like the placement code had simply stopped working.
      //
      // So the caller says what it is asking about. The land's canPlace ignores
      // the kinds that merely DEFINE ground (road, park, plot) because its
      // surface check has already governed whether that ground may be stood on,
      // and keeps the kinds that physically OCCUPY it (a building, a feature,
      // another prop).
      if (only && !only.has(e.kind)) continue;
      if (ignore && ignore.has(e.kind)) continue;
      // SHARING AN EDGE IS NOT OVERLAPPING -- <=/>=, not </>.
      //
      // A plot's own xMin is built as `roadCentre + roadWidth/2`: the block
      // grid places it with its edge touching its own street's reserved
      // half-width EXACTLY, on purpose, the same way city-plan.js's own
      // plot-vs-plot de-overlap pass already treats a shared edge as legal
      // ("touching edges is not overlapping -- adjacent plots share a line").
      // The first version of this used inclusive </> here, which is right
      // for a POINT query (whatIsAt: a point on the stadium's wall is still
      // in the stadium) and wrong for this one: it made every plot in the
      // city overlap its own street, and 18,894 of 19,092 plots vanished the
      // moment roads were registered -- not because the roads were too wide,
      // but because "touching" was being scored as a conflict.
      if (xMax <= e.xMin || xMin >= e.xMax || zMax <= e.zMin || zMin >= e.zMax) continue;
      // HEIGHT WAS BEING IGNORED, AND THE ENTRIES ALREADY CARRIED IT.
      //
      // reserve() has taken yMin/yMax since it was written, and bridges are
      // registered with a real deck clearance -- arch 2-30 m, cable 2-55 m --
      // for the express purpose of leaving the water beneath them navigable.
      // This test then discarded that and answered in plan only, so a bridge
      // blocked the channel it spans, and a lamp head at 9 m blocked the
      // pavement under it. Every reservation that does not care about height
      // still defaults to -Infinity..Infinity and is unaffected.
      //
      // Same touching rule as the plan axes: a deck resting exactly on a datum
      // is not inside it.
      if (yMax <= e.yMin || yMin >= e.yMax) continue;
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
  function findFree(w, d, near, { radius = 1500, step = 40, t = 0, ...opts } = {}) {
    // Passes the height range and kind filters straight through: a search for
    // room that asks a different question from the caller's own placement check
    // will confidently return somewhere that placement then refuses.
    const fits = (cx, cz) => !overlapsReserved(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, t, opts);
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

  return { reserve, release, close, reopen, whatIsAt, occupiedAt, overlapsReserved, findFree, list };
}
