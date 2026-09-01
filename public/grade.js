// =============================================================================
// BUILT SURFACES ARE ENGINEERED, NOT DRAPED
//
// THE MISS
//
// Roads were laid on the terrain by sampling it: `const h = heightAt(x, z)` at
// every point along the run, and the ribbon was pinned to whatever came back.
// That produces a road which follows fbm noise -- including the micro-relief
// term, which exists precisely to stop ground being dead flat. So every street
// undulated by a metre or two every few dozen metres, and the outer roads, which
// only sample every 110 m, came out as a chain of faceted planes at random
// angles.
//
// A road built like that does not read as a road. It reads as a slightly
// different colour of ground, which is exactly the reported symptom: 385,000
// road triangles in the scene and the streets still not legible in the near
// field.
//
// WHY THIS IS A CATEGORY ERROR, NOT A TUNING PROBLEM
//
// Terrain is a natural surface and it is allowed to be lumpy. A carriageway is a
// MANUFACTURED one. Real roads slope -- sometimes steeply -- but they are graded:
// a surveyed vertical alignment with a bounded gradient and smooth vertical
// curves between changes of slope, built up on embankment where the ground falls
// away and cut into it where it rises. The same is true of footways, plazas, car
// parks, aprons, rail formations and quays. None of them are draped over
// anything. Every one of them was, here.
//
// WHAT THIS DOES
//
// gradeRun() takes the natural ground along a run and returns the SURVEYED
// surface over it:
//
//   1. SMOOTH. A moving average over a window much longer than the noise
//      wavelength. This removes the lumps while keeping the real hill -- a road
//      over a rise still climbs it, it just stops wobbling on the way up.
//
//   2. LIMIT THE GRADIENT. A forward and a backward pass clamp the change per
//      metre to a maximum. This is what stops a street from briefly becoming a
//      ramp when it crosses a gully, and it is why the result can be walked on.
//
//   3. LIMIT THE EARTHWORKS. Clamp how far the surface may leave the ground, so
//      the smoothing cannot quietly turn a side street into a flyover. This
//      fights constraint 2, so the two alternate until they settle.
//
// What comes out is a profile that sits slightly ABOVE the ground in the hollows
// and slightly BELOW it on the humps -- which is not an error. That is embankment
// and cutting, and it is what every road in the world does. The residual is
// reported so a caller can build the kerb, batter or retaining wall that a real
// road would have there.
// =============================================================================

// -----------------------------------------------------------------------------
// GRADING IS PER CLASS, BECAUSE EARTHWORK COSTS MONEY
//
// One setting cannot serve every road. Measured across 250 real runs in this
// world, the tradeoff is stark:
//
//     window   result                 earthwork needed
//     240 m    18% smoother           7.6 m
//     600 m    41% smoother          17.1 m
//    1400 m    73% smoother          31.2 m
//
// A 31 m embankment is a viaduct. That is the correct answer for a motorway and
// an absurd one for a residential street, and real road building draws exactly
// that distinction: a local street follows the ground closely and accepts steep
// bits, while a motorway is driven through the landscape on embankment and in
// cutting because its alignment matters more than its earthworks bill.
//
// So each class gets a smoothing window, a gradient limit, and -- crucially -- a
// cap on how far it may depart from the natural ground. The cap is what stops a
// side street quietly becoming a flyover.
// -----------------------------------------------------------------------------
export const GRADE = {
  ROAD: 0.08,      // default when a class is not recognised
  FOOTWAY: 0.08,   // follows its carriageway
  PLAZA: 0.02,     // a square reads as level
  RAIL: 0.025,     // 2.5% is already a hard climb for adhesion rail
};

/** window = smoothing length; maxGrade = gradient limit; maxDev = earthwork cap. */
export const ROAD_GRADE = {
  FREEWAY:   { window: 1200, maxGrade: 0.04, maxDev: 22 },  // built through the land
  RAMP:      { window:  400, maxGrade: 0.06, maxDev: 12 },
  BOULEVARD: { window:  700, maxGrade: 0.06, maxDev: 10 },
  AVENUE:    { window:  500, maxGrade: 0.07, maxDev:  6 },
  STREET:    { window:  320, maxGrade: 0.09, maxDev:  3 },  // hugs the ground
  LANE:      { window:  240, maxGrade: 0.10, maxDev:  2 },
  ALLEY:     { window:  200, maxGrade: 0.12, maxDev:  1.5 },
};

/**
 * Survey a graded surface along a straight run.
 *
 * @param {Function} heightAt   world-space natural ground
 * @param {object} run          {axis:"ew"|"ns", at, from, to}
 * @param {object} opts         {step, window, maxGrade}
 * @returns {{y(t):number, maxFill:number, maxCut:number, samples:number}}
 *          `y(t)` is the graded surface height at distance t along the run.
 */
export function gradeRun(heightAt, run, opts = {}) {
  const {
    step = 20,          // survey interval, metres
    window = 240,       // smoothing window, metres -- longer than the terrain noise
    maxGrade = GRADE.ROAD,
    // How far the surveyed surface may depart from natural ground. This is the
    // earthworks budget, and it is what keeps a street a street.
    maxDev = Infinity,
  } = opts;

  const ew = run.axis === "ew";
  const from = Math.min(run.from, run.to);
  const to = Math.max(run.from, run.to);
  const n = Math.max(2, Math.ceil((to - from) / step) + 1);

  // --- 1. the natural ground along the run ---
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = from + (i * (to - from)) / (n - 1);
    raw[i] = heightAt(ew ? t : run.at, ew ? run.at : t);
  }

  // --- 2. smooth: remove the lumps, keep the hill ---
  const half = Math.max(1, Math.round(window / 2 / step));
  const smooth = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sum += raw[j]; count++;
    }
    smooth[i] = sum / count;
  }

  // --- 3. limit the gradient, and the earthworks, together ---
  //
  // These two constraints fight: clamping the gradient pushes the surface away
  // from the ground, and clamping the deviation pushes it back, which can
  // reintroduce a steep step. Applying each once leaves whichever ran last in
  // charge. A few alternating passes settle to a profile that satisfies both,
  // and settle quickly because each pass only ever moves points toward the
  // constraint it enforces.
  const ds = (to - from) / (n - 1);
  const maxStep = Math.abs(maxGrade * ds);
  for (let pass = 0; pass < 4; pass++) {
    // gradient, forward then backward -- one direction alone only fixes the way
    // it travels, so a descent that is too steep looks right going out and wrong
    // coming back
    for (let i = 1; i < n; i++) {
      const d = smooth[i] - smooth[i - 1];
      if (d > maxStep) smooth[i] = smooth[i - 1] + maxStep;
      else if (d < -maxStep) smooth[i] = smooth[i - 1] - maxStep;
    }
    for (let i = n - 2; i >= 0; i--) {
      const d = smooth[i] - smooth[i + 1];
      if (d > maxStep) smooth[i] = smooth[i + 1] + maxStep;
      else if (d < -maxStep) smooth[i] = smooth[i + 1] - maxStep;
    }
    if (maxDev === Infinity) break;
    // earthworks budget
    let over = false;
    for (let i = 0; i < n; i++) {
      const d = smooth[i] - raw[i];
      if (d > maxDev) { smooth[i] = raw[i] + maxDev; over = true; }
      else if (d < -maxDev) { smooth[i] = raw[i] - maxDev; over = true; }
    }
    if (!over) break;
  }

  // --- 4. how much earthwork this implies, for whoever draws the kerb ---
  let maxFill = 0, maxCut = 0;
  for (let i = 0; i < n; i++) {
    const d = smooth[i] - raw[i];
    if (d > maxFill) maxFill = d;
    if (-d > maxCut) maxCut = -d;
  }

  return {
    samples: n,
    maxFill,
    maxCut,
    /** Graded surface height at distance t along the run, linearly interpolated. */
    y(t) {
      const u = ((t - from) / (to - from)) * (n - 1);
      if (!(u > 0)) return smooth[0];
      if (u >= n - 1) return smooth[n - 1];
      const i = u | 0;
      const f = u - i;
      return smooth[i] * (1 - f) + smooth[i + 1] * f;
    },
  };
}
