// =============================================================================
// CALIPER — THE MODEL CALLER, INJECTED
//
// D4's own header already says it: "the API call this pipeline sends the
// prompt to, and receives the response from, lives elsewhere." This is
// elsewhere -- and it is a SEAM, not an implementation, so the whole request
// path (I5) can be proven correct without spending a cent.
//
// public/*.js runs in the browser and never holds an API key; every real
// call has to cross to the Worker (src/), through its existing spend gates,
// caps, per-IP limits and circuit breaker -- extended, never bypassed. That
// crossing does not exist yet (G1 found the same gap the other direction:
// "public/*.js never imports from src/*.ts"), so productionModelCaller
// below is a placeholder that CANNOT spend anything if it is ever reached
// by accident -- it throws, naming exactly what is missing, rather than
// attempting a fetch to a route that is not there. See
// docs/WORLD-BUILD-PLAN.md's I5 entry for the supervised-run command that
// replaces this once that route exists.
// =============================================================================

/** @typedef {(prompt: {ok: true, address: string, instructions: string, constraints: object}) => Promise<string>} ModelCaller */

/** @type {ModelCaller} */
export async function productionModelCaller(prompt) {
  throw new Error(
    "no live model route is wired yet -- public/*.js has nowhere authorised to send a prompt. " +
    "See docs/WORLD-BUILD-PLAN.md's I5 entry for the exact command Mark runs for a supervised live call.",
  );
}
