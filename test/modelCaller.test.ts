// I5: THE PRODUCTION CALLER CANNOT SPEND ANYTHING, EVEN IF SOMETHING CALLS
// IT BY ACCIDENT.
//
// public/*.js has nowhere authorised to send a prompt yet (G1 found the same
// gap from the other side: "public/*.js never imports from src/*.ts"). Until
// that route exists, productionModelCaller throws immediately -- it does not
// attempt a fetch, a timeout, or anything that could reach a network. A
// caller that structurally cannot spend money is the safest thing to ship
// before the route it needs is reviewed and built.

import { test } from "node:test";
import assert from "node:assert/strict";

import { productionModelCaller } from "../public/model-caller.js";

test("I5: productionModelCaller refuses immediately, naming what is missing, rather than attempting a call", async () => {
  await assert.rejects(
    () => productionModelCaller({ ok: true, address: "p1", instructions: "x", constraints: { footprint: { w: 1, d: 1 } } }),
    /no live model route is wired yet/,
  );
});
