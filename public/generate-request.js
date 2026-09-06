// =============================================================================
// CALIPER — GENERATE: THE MODEL WRITES A createGeometry BUILDER
//
// This is the step where the agent genuinely codes, and the one place a
// model's confidence is worth nothing on its own. D3 (transform.js) already
// answers "could this be that, here?" against the real land; this turns a
// YES from that into a prompt carrying the actual measured numbers, and
// checks whatever comes back against those SAME numbers -- never against
// anything the response itself might claim.
//
// NO MODEL IS CALLED HERE. Building the prompt and verifying the response
// are both pure functions; the API call this pipeline sends the prompt to,
// and receives the response from, lives elsewhere, under this project's
// zero-spend-without-authorisation rule.
// =============================================================================

import { verifyModelSource, ALLOWED_GEOMETRY_CONSTRUCTORS } from "./model-forge.js";

/**
 * K3 (blind security audit, 2026-09-06) found request.text had no length
 * bound anywhere in this pipeline -- unlike the older, separate live
 * pipeline's checkInputGuard/CONTROL_LIMITS.FREE_FORM_MAX_LENGTH
 * (src/controlLayer.ts), which nothing under public/*.js imports. Same
 * number, kept local: this file has no dependency on src/*.ts and should
 * not gain one just to share a constant.
 */
export const MAX_REQUEST_TEXT_LENGTH = 500;

/**
 * A prompt carrying D3's measured constraints -- footprint, support,
 * clearance -- so the model is grounded rather than guessing. Refused before
 * anything is built if the ground has not already approved the transform:
 * there is nothing to generate FOR at a location the request does not fit,
 * and refusing here is also what stops a prompt (and a spend) being sent for
 * a request that cannot work.
 */
export function buildGeometryPrompt(assessment, want, request) {
  if (!assessment || !assessment.fits) {
    return { ok: false, reason: "the ground has not approved this transform -- nothing to generate for" };
  }
  if (!request || typeof request.address !== "string" || typeof request.text !== "string") {
    return { ok: false, reason: "a geometry prompt needs a described request with an address and text" };
  }
  if (request.text.length > MAX_REQUEST_TEXT_LENGTH) {
    return { ok: false, reason: `request text is ${request.text.length} characters, over the ${MAX_REQUEST_TEXT_LENGTH}-character limit` };
  }
  if (!want || !want.footprint) {
    return { ok: false, reason: "a geometry prompt needs a footprint to constrain the model with" };
  }
  return {
    ok: true,
    address: request.address,
    instructions: request.text,
    constraints: {
      footprint: { w: want.footprint.w, d: want.footprint.d },
      support: want.support || null,
      clearanceM: want.clearanceM || 0,
      // 2026-09-06, real supervised run #2: the prompt used to hand the
      // model a bare namespace and never say what was on it. A competent
      // response reached for `T.BufferGeometryUtils.mergeGeometries(...)`
      // -- a real three.js addon module, not a property of the core
      // namespace -- a reasonable guess against an unstated contract,
      // refused only once it actually ran. The SAME list model-forge.js's
      // scanSource enforces, not a second copy that could drift from what
      // the model is actually told.
      allowedConstructors: ALLOWED_GEOMETRY_CONSTRUCTORS,
      apiNote:
        `The namespace you receive exposes exactly these constructors and nothing else -- ` +
        `no addon modules (BufferGeometryUtils or similar), no merging multiple geometries: ` +
        `${ALLOWED_GEOMETRY_CONSTRUCTORS.join(", ")}. Build and return exactly one of them, ` +
        `parameterised to fit the footprint.`,
    },
  };
}

/**
 * Verify a model's response against the PROMPT's own constraints, not
 * against anything the response claims about itself -- there is no field in
 * `source` this reads as a declaration. `declared` is always
 * `prompt.constraints.footprint`, so a response that ignores what it was
 * asked for is measured against what it was actually asked for, and fails
 * verification rather than being repaired or waved through.
 */
export function verifyGeneratedGeometry(source, prompt, evaluate, THREE) {
  if (!prompt || !prompt.ok || !prompt.constraints || !prompt.constraints.footprint) {
    return { ok: false, stage: "declaration", reason: "no constraints to verify the response against" };
  }
  return verifyModelSource(source, prompt.constraints.footprint, evaluate, THREE);
}
