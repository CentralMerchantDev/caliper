// THE BRIDGE: does this typology fit this plot?
//
// `layout.js` chooses what stands on a plot and deliberately has no geometry in
// it. `buildings.js` knows how big each typology is -- and it is the ONLY thing
// that knows, because `cellW` and `cellD` are derived from the seed inside the
// generator and cannot be driven from options.
//
// So the layout cannot answer "will this fit?" and must not guess. A size table
// copied into layout.js would be a second table that has to agree with the
// first, which is the defect class this repo keeps finding and fixing. Instead
// the layout takes a predicate and ASKS, and this module is the predicate.
//
// It lives on its own rather than inside layout.js because importing it pulls in
// three.js, and the point of layout.js is that it does not need three.js to be
// tested. Anything that already has the renderer -- the renderer itself, the
// geometry check, the geometry test -- can import this freely.
//
// WHAT IT IS WORTH, MEASURED. Without the predicate, 3,552 of 20,472 buildings
// (17.4%) were larger than the plot the layout picked them for: `bld-office`
// deciding it was 48 x 56 m on a 48 x 53 m plot, and so on. Every one would be
// refused by place.js AFTER being built, or would sit visibly across its own
// boundary. With it, 269 (1.3%) -- and those are plots where NOTHING in the
// class fits, which is a real fact about the plot rather than a bad choice.

import { terraceUnitsFor, seedFor } from "./layout.js";
import { building } from "./buildings.js";

/**
 * Build the options and seed a candidate typology would actually be built with.
 *
 * This has to match `variantKeyOf` and `planPlot`, because the whole value of
 * the check is that it asks about the building that will really be built. If it
 * asked about a different seed it would be measuring a different building, and
 * would be worse than not asking at all -- a confident wrong answer.
 */
function optionsFor(typology, situation) {
  const options = {
    corner: situation.corner,
    position: situation.position,
    foundation: situation.foundation,
    character: situation.character,
  };
  // Row typologies take a unit count and it sets their width, so it has to be
  // part of the question.
  if (typology === "bld-terrace") options.units = terraceUnitsFor(situation.fits.w);
  // NO SEED IS INVENTED HERE. `seedFor` in layout.js is the single definition,
  // and the renderer uses the same one, so the building measured is the building
  // built. An independent seed here was a real defect, not a theoretical one.
  return options;
}

/**
 * A `fits(typology, situation)` predicate for `planCity`.
 *
 * Memoised per call site: the same variant is asked about thousands of times
 * across a city, and `building()` re-derives every parameter each time. The
 * cache is created per factory call rather than at module scope so two runs in
 * one process cannot leak into each other -- the tests build more than one world.
 */
export function makeFits() {
  const cache = new Map();

  // Returns the extra options this typology should be built with on this plot,
  // or null if it cannot be made to fit. `{}` is a legitimate answer -- it means
  // "fits as it is, no size needed" -- so callers must test for null, not for
  // falsiness. An empty object is truthy; that is deliberate.
  return function sizeFor(typology, situation) {
    const options = optionsFor(typology, situation);

    // ASK FOR A SIZE RATHER THAN HOPING FOR ONE.
    //
    // buildings.js honours explicit cellW/cellD (and clamps them to what the
    // typology can actually build). So instead of asking whether the
    // seed-derived size happens to fit, request the largest whole number of 8 m
    // cells the plot can hold. Typologies that do not read these ignore them,
    // and the clamp means an impossible request comes back as the nearest legal
    // size -- which the fit check below then catches, rather than trusting it.
    const cellW = Math.max(1, Math.floor(situation.fits.w / 8));
    const cellD = Math.max(1, Math.floor(situation.fits.d / 8));
    const asked = { ...options, cellW, cellD };
    const askedSeed = seedFor(typology, asked);

    let hit = cache.get(askedSeed);
    if (!hit) {
      try {
        const spec = building(typology, askedSeed, asked);
        hit = { footprint: spec.footprint };
      } catch {
        // A typology that cannot even be described is not one that fits. Saying
        // no here means the layout picks something else; throwing would take the
        // whole city down for one bad variant.
        hit = { footprint: { w: Infinity, d: Infinity } };
      }
      cache.set(askedSeed, hit);
    }

    // THE CLAMP IS NOT A PROMISE. A typology whose minimum is larger than this
    // plot comes back clamped UP and still overhangs, so the answer is checked
    // against what came back, never against what was asked for.
    const fits = hit.footprint.w <= situation.fits.w + 1e-6 && hit.footprint.d <= situation.fits.d + 1e-6;
    if (!fits) return null;

    return { cellW, cellD };
  };
}
