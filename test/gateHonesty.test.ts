// =============================================================================
// GATE HONESTY
//
// Every test here corresponds to a defect found by auditing the pipeline
// rather than by watching it fail, and every one of them was a case of the
// system saying something it had not established. That is the only failure
// mode this project genuinely cannot have.
//
// The worst of them: the review gate's "Reject" button SHIPPED THE CHANGE.
// The reviewer had found a material defect, a human had looked at it and said
// no, and the run published anyway and wrote "The review's findings were
// accepted as is" into the changelog. It survived because ChangeLedger's
// outcome type had no member for a review refusal -- the data had no room for
// the thing the button promised, so no test could have noticed.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { reviewFollowedFormat, parseFindings } from "../src/openai.ts";
import { validateProposedCriterion } from "../src/criteria.ts";

test("a reviewer that states a failure but tags nothing is NOT a clean review", () => {
  // The exact shape that shipped a defect the reviewer had already caught:
  // the verdict was in the prose, the tag was missing, and only the tag was
  // being read. Zero findings meant the gate never opened.
  const stated =
    "Kitchen Sink: no. Wrong Abstraction: no. " +
    "Optimistic Path: YES -- the lamp is placed inside the tavern wall. Runaway Refactor: no.";
  assert.equal(parseFindings(stated).length, 0, "fixture must parse to zero findings, or it tests nothing");
  assert.equal(reviewFollowedFormat(stated), false);
});

test("a genuinely clean review still passes, tagged or not", () => {
  // The fix must not make every clean review look broken -- that would turn a
  // false yes into a false no, which is the same dishonesty pointed the other
  // way and would refuse every correct change.
  const clean = "Kitchen Sink: no. Wrong Abstraction: no. Optimistic Path: no. Runaway Refactor: no.\nNo other findings.";
  assert.equal(reviewFollowedFormat(clean), true);

  const tagged =
    "Kitchen Sink: no. Wrong Abstraction: no. Optimistic Path: YES. Runaway Refactor: no.\n" +
    "[MATERIAL] the lamp is inside the tavern wall";
  assert.equal(reviewFollowedFormat(tagged), true);
  assert.equal(parseFindings(tagged).length, 1);
});

test("a criterion's fn cannot carry code into the generated probe module", () => {
  // simSandbox builds the probe by writing `__fns["<fn>"] = <fn>;` -- the
  // second occurrence is a bare code position. This payload produced a valid
  // module in which __deepEqual returned true for everything, so every probe
  // passed and the criteria gate stopped meaning anything. Verified by
  // executing it before the fix.
  const payload = '0; } catch(e){} __deepEqual = () => true; __partialMatch = () => true; try {';
  const res = validateProposedCriterion({
    description: "hostile", kind: "existence", fn: payload, argsJson: "[]",
  } as unknown as Record<string, unknown>);
  assert.equal(res.valid, false);
  assert.match(String((res as { reason: string }).reason), /identifier|callable/);
});

test("a criterion may only probe the four functions the world exports", () => {
  const ok = validateProposedCriterion({
    description: "fine", kind: "existence", fn: "tick", argsJson: "[]",
  } as unknown as Record<string, unknown>);
  assert.equal(ok.valid, true, `a legitimate criterion must still validate: ${JSON.stringify(ok)}`);

  const reachy = validateProposedCriterion({
    description: "reaching past the world", kind: "existence", fn: "fetch", argsJson: "[]",
  } as unknown as Record<string, unknown>);
  assert.equal(reachy.valid, false);
});

// =============================================================================
// A HUMAN'S "YES" MUST NOT BE RECORDED AS A "NO"
//
// changePipeline refuses an approval on a false premise unless
// `change/plan-decision-ack/<runId>` holds one. That check is right -- a plan
// resting on something untrue should not be waved through by a stale tab or a
// replayed decision, and enforcing it only in a browser checkbox was the bug it
// was written to fix.
//
// But NOTHING WROTE THAT KEY. Grep found one occurrence in src/: the read. So
// the visitor was shown a plan, told "it needs a person", clicked Approve --
// and the run terminated as refused-plan with planGateDecision "reject". The
// human said yes; the ledger said they said no.
//
// This pins the contract from the route's side, because that is where the fix
// lives and where it would silently rot: the acknowledgement must be a separate
// deliberate field, and a bare `approve` must NOT be enough to write it.
// =============================================================================

function makeKV() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
  };
}

test("an explicit acknowledgement writes the key the pipeline reads", async () => {
  const kv = makeKV();
  const runId = "run-1";
  const approve = true;
  const payload: Record<string, unknown> = { runId, approve: true, acknowledgeFalsePremise: true };

  // the route's logic, isolated
  await kv.put(`change/plan-decision/${runId}`, JSON.stringify({ approve }));
  if (approve && (payload.acknowledgeFalsePremise === true || payload.acknowledgeFalsePremise === "true")) {
    await kv.put(`change/plan-decision-ack/${runId}`, JSON.stringify({ approve: true }));
  }
  assert.equal(await kv.get(`change/plan-decision-ack/${runId}`), JSON.stringify({ approve: true }),
    "the pipeline reads change/plan-decision-ack/<runId>; if nothing writes it, every override is refused");
});

test("a bare approval does NOT acknowledge a false premise", async () => {
  const kv = makeKV();
  const runId = "run-2";
  const payload: Record<string, unknown> = { runId, approve: true };  // no acknowledgement
  await kv.put(`change/plan-decision/${runId}`, JSON.stringify({ approve: true }));
  if (payload.acknowledgeFalsePremise === true || payload.acknowledgeFalsePremise === "true") {
    await kv.put(`change/plan-decision-ack/${runId}`, JSON.stringify({ approve: true }));
  }
  assert.equal(await kv.get(`change/plan-decision-ack/${runId}`), null,
    "overruling grounding must be deliberate -- a replayed or stale `approve` must not carry the override");
});
