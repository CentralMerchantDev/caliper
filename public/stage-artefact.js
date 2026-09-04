// =============================================================================
// CALIPER — SHOW THE WORK
//
// The pipeline (src/changePipeline.ts) already streams stages over SSE and
// the page already renders grounding -> plan -> implement -> verify ->
// review -> fix, for the data-edit path against the parcel. This is the
// artefact shape a source-edit stage (D4) event would carry once wired in --
// the code a model actually wrote, and the verdict it actually got.
//
// A FAILED VERIFY MUST READ AS A FAILED VERIFY.
//
// This project's failure floor names, first, "shipping an unverified change
// while reporting it as verified". describeStageOutcome exists to make that
// impossible to phrase by accident: it takes ok/fail/not-yet-checked
// straight from the verdict, and never invents a friendlier word for "no".
// =============================================================================

/** What one stage's stream event carries: the stage name, the source the
 *  model wrote, and the verdict it got (or null if verification has not
 *  run yet -- an "implement" event fires before "verify" does). */
export function stageArtefact(stage, source, verdict = null) {
  return { stage, source, verdict };
}

/**
 * A human-readable outcome for one artefact. `ok` is `true`, `false`, or
 * `null` -- never collapsed to a boolean, because "not yet checked" is a
 * real, different state from either a pass or a fail, and the failure floor
 * this project keeps finding is exactly that distinction being lost.
 */
export function describeStageOutcome(artefact) {
  const v = artefact && artefact.verdict;
  if (!v) return { ok: null, text: "not yet verified" };
  if (v.ok) {
    const m = v.measured;
    const tri = m ? `${Math.round(m.triangles)} triangles` : "verified";
    return { ok: true, text: `verified -- ${tri}` };
  }
  return { ok: false, text: `verification failed at ${v.stage}: ${v.reason}` };
}
