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

import { verifyModelSource } from "./model-forge.js";

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
