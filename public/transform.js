// =============================================================================
// CALIPER — TRANSFORMS: "make this boat a cruise ship"
//
// THE SHAPE OF THE THING
//
// A player picks something in the world and says what they want it to become.
// The outcome is NOT guaranteed, and that is the point rather than a
// limitation. A cruise ship does not fit in a fishing harbour, and the
// interesting moment is not the one where it works -- it is the one where the
// world says:
//
//     "No. That berth is 34 m of water and a cruise ship needs 210 m of quay
//      and 9 m of draught. It would fit 380 m north-east, in the deep channel.
//      Do you want it moved there as well?"
//
// That answer cannot be canned, because the numbers in it come from the ground
// under that specific boat. A menu of allowed transformations would be the
// exact thing this project exists to argue against, sitting in the place a
// visitor is most likely to look.
//
// WHY THIS FILE IS SMALL: EVERYTHING IT NEEDS ALREADY EXISTS
//
// This is a join, not an engine. Three parts were already built and had never
// been introduced:
//
//   THE GROUNDING STAGE (src/grounding.ts) already refuses false premises and
//   is REQUIRED by its own schema to offer alternatives -- there is a test
//   rejecting "a refusal with nothing offered instead". It just had nothing
//   physical to ground against.
//
//   THE LAND (public/ground.js) already answers "may this stand here" with a
//   REASON -- terrain, size, occupied -- and a detail string.
//
//   findGround ALREADY SEARCHES for somewhere a thing would fit, using the
//   same canPlace the placement will use, so it cannot recommend a spot that
//   is then refused.
//
// So the alternatives here are MEASURED, never invented. "It would fit 380 m
// north-east" is said because findGround went and found that, and the distance
// is the distance it walked. A model writing plausible-sounding alternatives
// from a prompt would be a lookup wearing a decision's costume; this is the
// decision.
//
// WHAT THIS DELIBERATELY DOES NOT DO
//
// It does not build anything and it does not call a model. It answers "could
// this be that, here?" and, when the answer is no, "what would have to change?"
// The forge (public/model-forge.js) builds the geometry once this has said the
// request is possible; the pipeline's own gates decide whether to spend on it.
// =============================================================================

/**
 * What a requested form needs from the world.
 *
 * Declared per request rather than looked up from a table, because a table of
 * "what a cruise ship needs" is precisely the canned answer this is written
 * against. These come from the request being grounded -- a cruise ship's
 * draught is a fact about cruise ships that the model supplies and the world
 * then checks.
 */
export function requirements({ footprint, draughtM = 0, standsOn = null, clearanceM = 0, support = null, category = null } = {}) {
  return {
    footprint: footprint && footprint.w > 0 && footprint.d > 0 ? { w: footprint.w, d: footprint.d } : null,
    draughtM: Number.isFinite(draughtM) && draughtM > 0 ? draughtM : 0,
    standsOn: Array.isArray(standsOn) ? [...standsOn] : null,
    clearanceM: Number.isFinite(clearanceM) && clearanceM > 0 ? clearanceM : 0,
    // HOW IT CARRIES ITSELF, WHICH IS WHAT THE LAND ACTUALLY ASKS.
    //
    // Found by writing the first test: a boat declaring `standsOn: [WATER]`
    // was refused with "open water carries nothing that stands on the ground".
    // That refusal is correct -- ground.js grants water to things with
    // `support: "float"`, `support: "span"` or `category: "vessel"`, and
    // standsOn is a different question about what surface a grounded thing
    // rests on. A requirement vocabulary that cannot express "it floats"
    // cannot ask about a boat, so every vessel would have been refused for the
    // wrong reason and the refusal would have looked convincing.
    support: typeof support === "string" ? support : null,
    category: typeof category === "string" ? category : null,
  };
}

/**
 * Can this thing become that thing, where it currently stands?
 *
 * @param subject  { id, label, x, z, footprint } -- what the player picked
 * @param want     { label, ...requirements() }   -- what they asked for
 * @param land     the object from createGround(): canPlace, waterAt, findGround
 * @param opts     { searchRadiusM } -- how far to look for somewhere it WOULD work
 *
 * Returns the grounding stage's own vocabulary -- `premisesHold`,
 * `falsePremises`, `alternatives` -- so this can be handed straight to it
 * without a translation layer that could disagree with either side.
 */
export function assessTransform(subject, want, land, { searchRadiusM = 1500 } = {}) {
  const falsePremises = [];
  const alternatives = [];
  const measured = {};

  if (!subject || !Number.isFinite(subject.x) || !Number.isFinite(subject.z)) {
    return {
      premisesHold: false,
      falsePremises: ["nothing was selected, so there is nothing to transform"],
      // The grounding contract requires an alternative even here: a refusal
      // with nothing offered instead is not a usable answer.
      alternatives: ["pick something in the world first, then say what it should become"],
      measured,
      fits: false,
    };
  }
  if (!want || !want.footprint) {
    return {
      premisesHold: false,
      falsePremises: [`"${want && want.label ? want.label : "that"}" did not say how big it is`],
      alternatives: ["say roughly how large it should be, in metres"],
      measured,
      fits: false,
    };
  }

  const label = want.label || "the new form";
  const spec = {
    footprint: { w: want.footprint.w, d: want.footprint.d },
    clearance: want.clearanceM || 0,
    ...(want.standsOn ? { standsOn: want.standsOn } : {}),
    ...(want.support ? { support: want.support } : {}),
    ...(want.category ? { category: want.category } : {}),
  };

  // ONE DEFINITION OF "DOES IT WORK HERE", USED BY BOTH THE REFUSAL AND THE
  // SEARCH.
  //
  // The first version asked canPlace for the refusal and then asked findGround
  // for the alternative -- and findGround only knows canPlace. A 210 m cruise
  // ship physically FITS in the harbour; what it cannot do is float in 3 m of
  // water, which canPlace never checks. So the search reported "it fits right
  // here, move it 0 m": the system confidently telling the player to stay
  // exactly where it does not work.
  //
  // Two predicates that are supposed to agree and do not is the same defect
  // this project has now found four times. There is one predicate.
  // THE CHEAP QUESTION FIRST.
  //
  // canPlace samples a grid across the whole footprint -- up to 676 terrain
  // probes for a 210 m ship. waterAt is a handful. Asking canPlace first made
  // the search pay the expensive check to reject candidates the cheap one
  // rejects instantly, and the suite went from 90 seconds to over five minutes.
  //
  // That is the same defect this project already fixed once tonight in
  // findGround -- 12.1 M probes down to 35,820 -- reintroduced here by the
  // person who fixed it. Worth stating plainly: knowing a lesson is not the
  // same as applying it, which is why the measurement matters more than the
  // understanding.
  //
  // The order is better for the ANSWER too, not only the cost: "there is 3 m of
  // water and it draws 9" is a more useful refusal for a ship in a harbour than
  // anything canPlace would have said.
  // THE THING BEING TRANSFORMED IS NOT AN OBSTACLE TO ITS OWN REPLACEMENT.
  //
  // Without ignoreId, "does a bigger/different version of X fit where X
  // already stands" finds X's OWN reservation and refuses -- a self-
  // collision indistinguishable from the ground genuinely being full.
  // Measured directly: an 18x24 m villa replaced by an 18x24 m tower AT THE
  // SAME SPOT was refused "occupied -- feature existing-villa is in the
  // way", even though the villa's own footprint is exactly the room the
  // request needed. This is the mechanism behind "a tall building on open
  // ground with room was refused" -- not height, not zoning, a self-collision
  // in the space check.
  const meets = (x, z) => {
    if (want.draughtM > 0 && typeof land.waterAt === "function") {
      const water = land.waterAt(x, z);
      if (!water) return { ok: false, reason: "draught", detail: "there is no water here", water: null };
      if (water.depth < want.draughtM) {
        return {
          ok: false, reason: "draught",
          detail: `${water.depth.toFixed(1)} m of water, and it draws ${want.draughtM} m`,
          water,
        };
      }
      const place = land.canPlace(spec, x, z, { ignoreId: subject.id });
      if (!place.ok) return { ok: false, reason: place.reason, detail: place.detail, blockedBy: place.blockedBy, water };
      return { ok: true, reason: null, detail: null, water };
    }
    const place = land.canPlace(spec, x, z, { ignoreId: subject.id });
    if (!place.ok) return { ok: false, reason: place.reason, detail: place.detail, blockedBy: place.blockedBy, water: null };
    return { ok: true, reason: null, detail: null, water: null };
  };

  const here = meets(subject.x, subject.z);
  measured.placement = { ok: here.ok, reason: here.reason, detail: here.detail };
  if (here.water) measured.water = { kind: here.water.kind, depth: here.water.depth };

  if (!here.ok) {
    if (here.reason === "draught") {
      falsePremises.push(`${article(label)} ${here.detail}`);
    } else {
      falsePremises.push(
        `${article(label)} of ${spec.footprint.w} x ${spec.footprint.d} m does not fit where ${subject.label || "it"} is` +
        (here.detail ? ` -- ${here.detail}` : ` -- ${here.reason}`),
      );
    }
  }

  // WHERE WOULD IT WORK? Searched with the SAME predicate that refused it, so
  // the offer cannot be somewhere that also fails. Rings outward, nearest
  // first, because the least disruptive answer is the one worth offering.
  if (!here.ok) {
    // A STEP SCALED TO THE THING BEING MOVED, AND A BUDGET ON THE WHOLE SEARCH.
    //
    // Stepping 20 m to find somewhere for a 210 m ship is a resolution nobody
    // needs: anywhere it fits is somewhere a 50 m step also finds. The step is
    // a quarter of the LONGEST side -- the shortest side was the first version
    // and it is the wrong one, because it is the long side that decides whether
    // a berth is big enough.
    //
    // The budget is what makes a hopeless request cost a bounded amount instead
    // of a walk across the entire map. A player asking for something impossible
    // should get told so quickly.
    let found = null;
    let budget = 4000;
    const step = Math.max(20, Math.max(spec.footprint.w, spec.footprint.d) / 4);
    for (let r = step; r <= searchRadiusM && !found && budget > 0; r += step) {
      const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
      for (let i = 0; i < n && !found && budget-- > 0; i++) {
        const a = (2 * Math.PI * i) / n;
        const x = subject.x + Math.cos(a) * r;
        const z = subject.z + Math.sin(a) * r;
        if (meets(x, z).ok) found = { x, z, moved: r };
      }
    }
    measured.nearestFit = found ? { x: found.x, z: found.z, movedM: found.moved } : null;

    if (found) {
      alternatives.push(
        `move it ${Math.round(found.moved)} m ${bearing(subject, found)} to (${Math.round(found.x)}, ${Math.round(found.z)}), ` +
        `where ${article(label)} does fit, and make it ${article(label)} there`,
      );
    }

    // THE OTHER ALTERNATIVE OF THE SAME KIND: WHAT WOULD HAVE TO GO.
    //
    // Not "make it smaller" -- that is a different request, the exact thing
    // this design correction exists to stop offering. canPlace's "occupied"
    // refusal already names every real obstruction and whether it can be
    // cleared (ground.js's own allOverlapping); this is that data, offered
    // as an action rather than buried in a reason string. Rock and water are
    // never in blockedBy as clearable -- see ground.js's own comment on why.
    // Offered only when clearing would actually be SUFFICIENT (every
    // blocker clearable) -- a partial list ("2 of 3 can go") is not an
    // action a player can take and finish, so it is not offered as one.
    let offeredDemolition = false;
    if (here.blockedBy && here.blockedBy.length) {
      const clearable = here.blockedBy.filter((b) => b.clearable);
      if (clearable.length === here.blockedBy.length) {
        const names = clearable.map((b) => `${b.kind}${b.id ? " " + b.id : ""}`).join(", ");
        alternatives.push(`demolish ${names} to make room here, and make it ${article(label)} there`);
        offeredDemolition = true;
      }
    }
    // NEITHER ALTERNATIVE APPLIES. Say so, rather than leaving the player
    // with a refusal and nothing to act on -- the grounding contract this
    // whole file composes with requires an alternative even here.
    if (!found && !offeredDemolition) {
      alternatives.push(`nowhere nearby has room, and nothing here can be cleared to make it`);
    }
  }

  return {
    premisesHold: falsePremises.length === 0,
    falsePremises,
    alternatives,
    measured,
    fits: here.ok,
  };
}

/**
 * Which way the alternative lies, in words.
 *
 * A bearing in degrees is precise and useless to a player looking at a city.
 * Eight compass points is what someone can act on.
 */
/**
 * "a cruise ship" from "cruise ship", without producing "a a cruise ship".
 *
 * The label comes from a player's own words via a model, so it arrives with or
 * without an article depending on how they phrased it. Reading like a machine
 * is a small thing that makes the whole exchange feel canned.
 */
export function article(label) {
  const s = String(label || "").trim();
  if (!s) return "it";
  if (/^(a|an|the)\s/i.test(s)) return s;
  return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`;
}

/** The label with any leading article removed, for "a smaller X". */
export function bare(label) {
  return String(label || "").trim().replace(/^(a|an|the)\s+/i, "");
}

export function bearing(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (dx === 0 && dz === 0) return "here";
  // -z is north in this world, matching the camera and the compass rose.
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const points = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const idx = Math.round(((deg + 360) % 360) / 45) % 8;
  return points[idx];
}

/**
 * The sentence a player reads.
 *
 * Written here rather than in the UI so that the refusal, the numbers and the
 * offer travel together. Splitting them is how a screen ends up showing "that
 * did not work" while the reason sits in an object nobody rendered.
 */
export function describeTransform(subject, want, verdict) {
  const label = (want && want.label) || "that";
  if (verdict.premisesHold) {
    return `Yes -- ${subject.label || "it"} can become ${article(label)} where it is.`;
  }
  const why = verdict.falsePremises.join("; ");
  const offer = verdict.alternatives.length ? ` ${verdict.alternatives[0]}?` : "";
  return `No -- ${why}.${offer}`;
}
