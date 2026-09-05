// =============================================================================
// CALIPER — I5: THE REQUEST PATH, END TO END, WITH AN INJECTED MODEL CALLER
//
// assessTransform (D3) -> buildGeometryPrompt (D4) -> [an injected caller] ->
// verifyGeneratedGeometry (D4). What happens to a verified model after this
// -- register it, stage it for the page, apply it as a layer -- is D6/D7's
// job and this file's caller's decision, not this function's.
//
// THE CALLER IS INJECTED, NEVER IMPORTED, so this whole path is provable at
// $0. Production passes public/model-caller.js's productionModelCaller
// (which cannot spend anything -- it throws, because no live route exists
// yet); every test here passes a stub that counts its own calls and returns
// a hand-written string, the same "no model is called anywhere in this
// file" discipline test/generateRequest.test.ts already established for D4.
//
// THE ONE GUARANTEE THIS FILE EXISTS TO MAKE: a refused transform never
// reaches the caller. buildGeometryPrompt already refuses before generating
// a prompt when assessTransform said the transform does not fit -- this
// function's only additional job is to not call `caller` when that refusal
// happens. Checked by call COUNT on the stub, never by the stub's outcome:
// an outcome-only assertion passes whether or not the call was ever made.
// =============================================================================

import { assessTransform } from "./transform.js";
import { buildGeometryPrompt, verifyGeneratedGeometry } from "./generate-request.js";

/**
 * @param subject   what was selected -- { id, label, x, z, footprint }
 * @param want      what it should become -- { label, ...requirements() }
 * @param request   the described request -- { address, text } (D2's makeDescribeRequest)
 * @param land      the object from createGround(): canPlace, waterAt, findGround
 * @param caller    (prompt) => Promise<string> -- the injected model call
 * @param evaluate  turns a source string into a callable builder (never `eval` in production; test/generateRequest.test.ts's own `new Function` pattern)
 * @param THREE     the geometry library the builder is handed
 */
export async function runGenerateRequest({ subject, want, request, land, caller, evaluate, THREE }) {
  const assessment = assessTransform(subject, want, land);
  const prompt = buildGeometryPrompt(assessment, want, request);
  if (!prompt.ok) {
    // NOTHING BELOW THIS LINE RUNS. `caller` is not referenced, let alone
    // invoked -- the money-guarding property this file exists for.
    return { ok: false, stage: "prompt", reason: prompt.reason, assessment, prompt };
  }
  const source = await caller(prompt);
  const verdict = verifyGeneratedGeometry(source, prompt, evaluate, THREE);
  return { ok: verdict.ok, stage: "verify", verdict, source, prompt, assessment };
}
