// =============================================================================
// PUT A THING IN THE WORLD, MOVE IT, TAKE IT AWAY
//
// WHAT THIS IS
//
// The land can be asked (ground.js) and the world remembers (world-registry.js).
// This is the only thing that connects them: asking, and then -- on a yes --
// recording. Nothing else in the codebase should reserve ground directly, for
// the same reason nothing should draw a bench by typing its size into a
// BoxGeometry call.
//
// It is small on purpose. Every hard question is already answered somewhere
// else; what was missing was the one place where a decision becomes a fact.
//
// WHY ASK-THEN-RECORD HAS TO BE ONE OPERATION
//
// Every defect this project has found is a version of the same shape: two
// subsystems with private beliefs about the same ground and nothing to
// reconcile them. A stadium at -7.0 m in the water. 389 plots inside feature
// footprints. 27 lamp posts inside benches. Two placement loops walking the
// same footway, neither able to see the other.
//
// The cure is not more checking. It is that checking and committing cannot be
// separated -- if a caller can reserve without asking, or ask without
// reserving, the two drift apart again and nothing detects it. So this is the
// door, and it is the only door.
//
// WHAT IT DELIBERATELY DOES NOT DO
//
// It does not decide WHERE things go. `place` is told a position; `placeNear`
// searches outward from a preference. Neither invents a layout, and neither
// knows what a city is. That is a layout engine's job, written in terms of
// these three verbs and the model library.
// =============================================================================

/**
 * @param {object} opts
 * @param {object} opts.ground    from createGround() -- canPlace, surfaceAt
 * @param {object} opts.registry  from createWorldRegistry() -- reserve, close
 */
export function createPlacer({ ground, registry, grid = null }) {
  if (!ground || typeof ground.canPlace !== "function") {
    throw new Error("createPlacer needs a ground that can be asked -- see createGround()");
  }
  if (!registry || typeof registry.reserve !== "function") {
    throw new Error("createPlacer needs a registry to record in -- see createWorldRegistry()");
  }

  // Refusals are counted, not swallowed. A run that placed 4,000 things and
  // refused 12,000 is a fact worth being able to see, and the shape of the
  // refusals says which rule is doing the work -- the same reasoning as
  // `refusedWhy` for buildings, which is how the "in a waterway" and "cliff"
  // counts first showed the plot generator was fighting the terrain.
  const refused = {};
  let placedCount = 0;
  let serial = 0;

  /**
   * Ask, and on a yes, record.
   *
   * @param {object} model  a declaration: { id, kind, category, footprint,
   *   height, clearance, standsOn, support, surface, solid }
   * @param {number} x
   * @param {number} z
   * @param {object} [opts]  { rotated, t, id, owner }
   * @returns {{ok:true, entry:object}|{ok:false, reason:string, detail:string}}
   */
  function place(model, x, z, opts = {}) {
    const { rotated = false, t = 0 } = opts;

    // THE GRID GETS ASKED FIRST, because its two refusals are about whether
    // this place is available to anyone at all, and answering them after the
    // terrain check would report "too steep" about ground the player cannot
    // reach. Off-map and locked are cheap integer tests; everything after them
    // samples the height field.
    if (grid) {
      const g = grid.check(x, z);
      if (!g.ok) {
        refused[g.reason] = (refused[g.reason] || 0) + 1;
        return { ok: false, reason: g.reason, detail: g.detail };
      }
    }

    const verdict = ground.canPlace(model, x, z, { rotated, t });
    if (!verdict.ok) {
      refused[verdict.reason] = (refused[verdict.reason] || 0) + 1;
      return { ok: false, reason: verdict.reason, detail: verdict.detail };
    }

    const f = model.footprint;
    const w = (rotated ? f.d : f.w) + (model.clearance || 0) * 2;
    const d = (rotated ? f.w : f.d) + (model.clearance || 0) * 2;
    // The ground the check just measured, not a second reading of it. Asking
    // heightAt again here would be a different number the moment the two
    // disagreed about sampling, and the entry would describe a volume the
    // verdict never looked at.
    const surfaceY = verdict.ground;

    // THINGS DIG IN. A model carries the depth it occupies BELOW the surface --
    // a foundation, a basement, a road's sub-base, a bridge pier's footing --
    // and reserving only what shows above ground is how two things end up
    // sharing the same hole while looking fine from above. It is also what
    // makes the strata in ground.js load-bearing rather than decorative: a
    // basement is dug through topsoil and subsoil into clay, and the world can
    // now say so.
    const yMin = surfaceY - (model.depth || 0);

    const entry = registry.reserve({
      kind: model.kind || "object",
      id: opts.id || `${model.id || "thing"}#${++serial}`,
      owner: opts.owner || model.id || null,
      xMin: x - w / 2, xMax: x + w / 2,
      zMin: z - d / 2, zMax: z + d / 2,
      yMin, yMax: surfaceY + (model.height || 0),
      // A thing that DEFINES ground says so. A road segment declares the strip
      // it lays down; a bench declares nothing and leaves the ground as it was.
      surface: model.surface || null,
      // HARD/SOFT REACHES THE REGISTRY, AND `kind` IS NOT THE FIELD THAT CARRIES IT.
      //
      // The model contract calls a thing "hard" or "soft"; the registry calls a
      // thing a road, a plot or a feature. Both were spelled `kind`, so a model
      // declaring kind:"soft" was recorded with kind "soft" -- which is not a
      // registry class at all -- and `solid` defaulted to TRUE regardless. So
      // nothing placed through the only door was ever soft, while
      // world-registry's own header describes callers reading solid:false to
      // decide a field may be removed. Two vocabularies, one field name.
      //
      // `occupancy` carries hard/soft; `kind` stays the registry's own class.
      solid: model.solid !== undefined ? model.solid : model.occupancy !== "soft",
      since: t,
    });
    placedCount++;
    return { ok: true, entry };
  }

  /**
   * Place at the first spot that will take it, spiralling out from a preference.
   *
   * The same shape as land-use.js's findSite and the registry's findFree,
   * because "find me room for this" always takes that shape -- try where you
   * want, then widen. Reports how far it had to move, because a thing that
   * ended up 3 km from where it was wanted is a fact about the world, not a
   * successful placement: the airport moved 450 m and that number is the
   * difference between a considered decision and a coincidence.
   */
  function placeNear(model, near, opts = {}) {
    const { radius = 1500, step = 20 } = opts;
    const first = place(model, near.x, near.z, opts);
    if (first.ok) return { ...first, moved: 0 };

    // A SEARCH IS NOT A HUNDRED REFUSALS, IT IS ONE.
    //
    // Every probe on every ring went through place(), so a single placeNear
    // that walked out 340 m logged 858 "refusals". The tally is meant to say
    // which RULE is doing the work -- and with search effort mixed in it
    // measures how far the caller had to look instead. The refusal that gets
    // counted is the one at the position actually asked for; the probes are
    // rolled back.
    const probeBase = { ...refused };
    let lastReason = first.reason, lastDetail = first.detail;
    for (let r = step; r <= radius; r += step) {
      const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        const x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r;
        const got = place(model, x, z, opts);
        if (got.ok) {
          for (const k of Object.keys(refused)) refused[k] = probeBase[k] || 0;
          refused[first.reason] = (probeBase[first.reason] || 0) + 1;
          return { ...got, moved: r };
        }
        lastReason = got.reason; lastDetail = got.detail;
      }
    }
    for (const k of Object.keys(refused)) refused[k] = probeBase[k] || 0;
    refused[first.reason] = (probeBase[first.reason] || 0) + 1;
    return { ok: false, reason: lastReason, detail: `${lastDetail} (and nowhere within ${radius} m would take it)` };
  }

  /**
   * Take something away at time `t`.
   *
   * CLOSES the interval rather than erasing the record, so the world can still
   * answer what stood here before. That is what the fourth dimension is FOR --
   * a registry that forgets on removal has a time axis it cannot use.
   */
  function remove(id, t = 0) {
    // REMOVE IS DOCUMENTED TO RETURN, NOT TO THROW, AND IT THREW ON ITS OWN
    // DEFAULTS. place() defaults `since: 0` and remove() defaulted `t = 0`, and
    // close() rejects a time at or before `since` -- so removing anything
    // placed with the default time threw an exception from a function whose
    // whole contract is a result object. Two defaults that cannot both be used.
    //
    // The guard in close() is right: something removed at the instant it was
    // placed existed for no time at all. So the error becomes a refusal with a
    // reason, which is what every other refusal in this file already is.
    try {
      const closed = registry.close(id, t);
      if (!closed) return { ok: false, reason: "not-found", detail: `nothing called ${id} is standing` };
      return { ok: true, closed };
    } catch (e) {
      return {
        ok: false, reason: "invalid-time",
        detail: `${(e && e.message) || e} -- removing something needs a time AFTER it was placed`,
      };
    }
  }

  /**
   * Move something: take it away, and put it back somewhere else.
   *
   * IF THE NEW POSITION IS REFUSED, THE OLD ONE IS RESTORED. Without that, a
   * failed move deletes the thing being moved -- which is the single most
   * obvious way for an editing tool to destroy someone's work, and it happens
   * precisely when the user was already being told "no".
   */
  function move(model, id, x, z, opts = {}) {
    const { t = 0 } = opts;
    const before = registry.list().filter((e) => e.id === id && e.until > t);
    if (!before.length) return { ok: false, reason: "not-found", detail: `nothing called ${id} is standing` };

    // WRAPPED, BECAUSE ITS TWIN WAS. remove() thirty lines above carries a nine
    // line comment about close() throwing on the default t = 0, and wraps it.
    // This called the same close() bare, in the same file, for the same reason,
    // written in the same session -- so move() threw on ITS defaults too, and
    // threw again on a second move at the same instant. A rule applied in one
    // place and not its twin.
    try {
      registry.close(id, t);
    } catch (e) {
      return {
        ok: false, reason: "invalid-time",
        detail: `${(e && e.message) || e} -- moving something needs a time AFTER it was placed`,
      };
    }

    // AND place() MAY THROW, in which case the thing being moved has already
    // been closed and would be lost. The refusal path below reopens it; the
    // throw path did not, which is a data-loss route through an editing tool.
    let got;
    try {
      got = place(model, x, z, { ...opts, id });
    } catch (e) {
      for (const en of before) registry.reopen(id, en.until, en.since);
      return {
        ok: false, reason: "invalid-model",
        detail: `${(e && e.message) || e} -- ${id} was left where it was`,
      };
    }
    if (got.ok) return got;

    // Put it back by UN-closing the original, not by reserving a copy of it.
    // Re-reserving leaves the closed original in place and adds a second record
    // beside it, so the world believes the same thing stood in the same spot
    // twice with different lifetimes -- and every later query is answered by
    // whichever happens to come first.
    for (const e of before) registry.reopen(id, e.until, e.since);
    return { ok: false, reason: got.reason, detail: `${got.detail} — ${id} was left where it was` };
  }

  /** What happened, and why the refusals happened. Copied so callers cannot edit the tally. */
  function report() {
    return { placed: placedCount, refused: { ...refused } };
  }

  return { place, placeNear, remove, move, report };
}
