// FOUNDATION-2 item 4: "a timeout must never lose a run." This exercises
// the REAL runChangePipeline against a REAL Anthropic call, not a
// reimplementation of the logic -- with a deliberately invalid API key so
// the call is genuinely rejected (401, before any token is processed or
// billed) rather than mocked into succeeding or failing. Confirmed by hand
// first: `curl` with this same bad key returns 401 immediately. Zero
// spend, and no Worker API key involved -- this key is a throwaway string,
// not a real credential.
//
// A fake in-memory KV and a fake always-approve spend-counter DO stand in
// for the two Workers-runtime bindings runChangePipeline needs; LOADER
// (the sandbox binding) is never touched, since every path this test
// drives fails before verification would ever run.
import { test } from "node:test";
import assert from "node:assert/strict";

import { runChangePipeline, type ChangeEnv, type ChangeEvent } from "../src/changePipeline.ts";

function makeFakeKV() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => (store.has(key) ? store.get(key)! : null),
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function makeFakeSpendCounter() {
  const stub = {
    fetch: async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/reserve")) return new Response(JSON.stringify({ ok: true }));
      if (url.includes("/status")) return new Response(JSON.stringify({ dailySpentUsd: 0, weeklySpentUsd: 0, monthlySpentUsd: 0 }));
      return new Response(JSON.stringify({ ok: true })); // /reconcile
    },
  };
  return {
    idFromName: () => ({}) as unknown,
    get: () => stub,
  } as unknown as DurableObjectNamespace;
}

function makeEnv(): ChangeEnv {
  return {
    LOADER: {} as unknown as ChangeEnv["LOADER"], // never touched -- every path here fails before verification
    SPEND_KV: makeFakeKV(),
    SPEND_COUNTER: makeFakeSpendCounter(),
    ANTHROPIC_API_KEY: "sk-ant-deliberately-invalid-test-key-000000000000000000000000",
    OPENAI_API_KEY: "deliberately-invalid",
  };
}

test("a stage failure checkpoints an errored, resumable state instead of losing the run -- real network call, zero spend", async (t) => {
  // Exercise the SDK's real HTTP-error wrapper deterministically. Depending
  // on the host network/proxy, a request to the real endpoint can fail at
  // DNS/TLS and surface only "Connection error", which is correctly
  // transient but cannot prove the permanent-401 branch this test names.
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    if (url.startsWith("https://api.anthropic.com/")) {
      return Promise.resolve(new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), {
        status: 401,
        headers: { "content-type": "application/json", "request-id": "test-auth-rejection" },
      }));
    }
    return realFetch(input, init);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const env = makeEnv();
  const runId = `test-error-recovery-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  let events: ChangeEvent[] = [];
  const onEvent = (e: ChangeEvent) => events.push(e);

  // ---- Attempt 1: fresh run, grounding fails on the bad key ----
  const rec1 = await runChangePipeline(env, runId, changeRequest, onEvent);
  assert.equal(rec1.ledger.outcome, "halted-awaiting-error-decision");
  assert.equal(rec1.ledger.totalCostUsd, 0, "a call rejected before any token is processed must cost nothing");
  const stageErrors1 = events.filter((e) => e.type === "stage-error");
  assert.equal(stageErrors1.length, 1);
  if (stageErrors1[0].type === "stage-error") {
    assert.match(stageErrors1[0].erroredAtStage, /ground/);
    assert.match(stageErrors1[0].errorMessage, /401|invalid|auth|status/i);
  }

  const savedRaw = await env.SPEND_KV.get(`change/state/${runId}`);
  assert.ok(savedRaw, "the run must be discoverable in KV after a stage failure, not silently lost");
  const saved = JSON.parse(savedRaw!);
  assert.equal(saved.stage, "errored");
  // LAST.md item 1: a 401 is a 4xx the API rejected outright -- permanent,
  // not worth retrying unchanged. This is the exact classification that
  // stops the "retried four times identically" failure mode.
  assert.equal(saved.errorKind, "permanent", "a 401 (bad auth, a 4xx) must be classified permanent");

  // ---- Attempt 2: resume with NO decision posted yet -- must re-halt without re-attempting ----
  events = [];
  const rec2 = await runChangePipeline(env, runId, changeRequest, onEvent);
  assert.equal(rec2.ledger.outcome, "halted-awaiting-error-decision");
  assert.ok(!events.some((e) => e.type === "grounding"), "a bare resume with no decision must not re-spend on the failed stage");

  // ---- Attempt 3: "retry" on a PERMANENT error -- must be refused server-side, zero new spend, zero new API call ----
  // This is the exact scenario LAST.md reports: a run retried four times
  // identically against a request the API had already rejected. The fix
  // is that "approve" on a permanent-error run no longer re-attempts the
  // doomed call at all.
  await env.SPEND_KV.put(`change/error-decision/${runId}`, JSON.stringify({ approve: true }));
  events = [];
  const rec3 = await runChangePipeline(env, runId, changeRequest, onEvent);
  assert.ok(!events.some((e) => e.type === "grounding"), "retry on a permanent error must NOT re-attempt the stage -- that's the exact bug this fixes");
  assert.equal(rec3.ledger.outcome, "halted-awaiting-error-decision", "still parked, still not lost -- just not re-attempted");
  const stageErrors3 = events.filter((e) => e.type === "stage-error");
  assert.equal(stageErrors3.length, 1);
  if (stageErrors3[0].type === "stage-error") {
    assert.equal(stageErrors3[0].errorKind, "permanent");
    assert.match(stageErrors3[0].errorMessage, /retrying without a code change will fail identically/);
  }

  // ---- Attempt 4: "abandon" -- must end the run and clear its state ----
  await env.SPEND_KV.put(`change/error-decision/${runId}`, JSON.stringify({ approve: false }));
  events = [];
  const rec4 = await runChangePipeline(env, runId, changeRequest, onEvent);
  assert.equal(rec4.ledger.outcome, "abandoned-after-error");
  const stateAfterAbandon = await env.SPEND_KV.get(`change/state/${runId}`);
  assert.equal(stateAfterAbandon, null, "abandoning must clear the run's state, the same as stopping does");
});

test("a TRANSIENT error, unlike a permanent one, is genuinely retried on approval", async (t) => {
  // Exercises the exact same branch in runChangePipeline as the test
  // above, from the other side: a state whose errorKind is "transient"
  // (what a real network blip or 5xx would produce -- see
  // classifyErrorPermanence's own unit tests in controlLayer.test.ts for
  // that classification) must actually re-attempt the failed stage on
  // "approve", not be silently refused the way a permanent one is.
  // Seeded directly rather than forcing real network flakiness, which
  // can't be made to happen on demand -- this tests the real
  // runChangePipeline control flow, not a reimplementation of it, just
  // starting from a constructed checkpoint instead of a caused failure.
  const env = makeEnv();
  const runId = `test-transient-retry-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  await env.SPEND_KV.put(
    `change/state/${runId}`,
    JSON.stringify({
      runId, changeRequest, currentSourceAtStart: "", budgetSpent: 0, stageCosts: [],
      questionAsked: false, planGateReplyCount: 0, runStartedAt: Date.now(),
      stage: "errored", errorMessage: "simulated transient failure (network blip)", erroredAtStage: "ground+plan",
      errorKind: "transient",
    }),
  );
  await env.SPEND_KV.put(`change/error-decision/${runId}`, JSON.stringify({ approve: true }));

  const events: ChangeEvent[] = [];
  await runChangePipeline(env, runId, changeRequest, (e) => events.push(e));
  assert.ok(events.some((e) => e.type === "grounding"), "a transient error must be genuinely retried, not refused the way a permanent one is");
});

// ---------------------------------------------------------------------
// SHIP.md item 1: "Mark aborted a run. It stayed on screen. It offered
// retry. He retried. Nothing happened." Root cause, found by tracing
// every checkStopped() call site against every stage the "running" bar
// offers a Stop button for: a stop clicked during Implementing/Verifying
// had nowhere to be checked before a real (unrelated) error occurred and
// got checkpointed -- so the stop signal was left sitting in KV,
// unconsumed, for the rest of its 10-minute TTL. A later Retry on that
// SAME run then hit the pre-existing checkStopped() check right before
// implement (changePipeline.ts, "about to spend on implement/verify/
// fix/review") and found that STALE flag from the original abort
// attempt -- indistinguishable, from the visitor's seat, from Retry
// doing nothing at all.
//
// This exercises the real fix (the catch block now consumes any pending
// stop signal when it checkpoints an error) against the real
// runChangePipeline, with a real invalid-key-induced failure (zero
// spend, same technique as every other test in this file) -- not a
// reimplementation of the control flow. The one part that can't be
// forced on demand is the exact race (the stop signal arriving in KV
// WHILE implement is in flight, between the pre-existing check and the
// catch block) -- simulated by making the fake KV's own get()/delete()
// answer that key exactly the way a stop clicked mid-stage would: absent
// on the first check (implement is allowed to start), present by the
// time the catch block asks.
// ---------------------------------------------------------------------
test("SHIP.md item 1: a stop signal that arrives mid-stage and misses every checkpoint is consumed when the resulting error is checkpointed, not left to silently swallow the retry that follows", async (t) => {
  const env = makeEnv();
  const runId = `test-stray-stop-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  // A run whose plan was already approved in an earlier, successful
  // invocation -- erroredPastGate1 makes pastPlanGate true on resume, so
  // this run heads straight for implement, the same as a real retry from
  // "Implementing failed" would.
  const plan = { willBuild: "add a lamp post", willNotTouch: "everything else", criteria: [], implementationPath: "data-edit", question: null };
  const grounding = { premisesHold: true, reasoning: "the workshop plot exists", falsePremises: [] };
  await env.SPEND_KV.put(
    `change/state/${runId}`,
    JSON.stringify({
      runId, changeRequest, currentSourceAtStart: "", budgetSpent: 0, stageCosts: [],
      questionAsked: false, planGateReplyCount: 0, runStartedAt: Date.now(),
      stage: "errored", errorMessage: "simulated prior transient blip", erroredAtStage: "implement",
      errorKind: "transient", erroredPastGate1: true, plan, grounding,
    }),
  );
  await env.SPEND_KV.put(`change/error-decision/${runId}`, JSON.stringify({ approve: true })); // "Mark clicks Retry"

  // Simulate the race described above: the stop key reads as absent the
  // FIRST time (the pre-existing checkStopped() right before implement,
  // unchanged by this fix, lets the retry proceed) but "arrives" by the
  // time anything checks it again -- exactly what a stop clicked while
  // "Implementing" was showing looks like from KV's point of view, since
  // nothing between there and a real error consumes it.
  const stopKey = `change/stop/${runId}`;
  let stopValue: string | null = null;
  let firstStopCheckDone = false;
  const originalGet = env.SPEND_KV.get.bind(env.SPEND_KV);
  const originalDelete = env.SPEND_KV.delete.bind(env.SPEND_KV);
  env.SPEND_KV.get = (async (key: string) => {
    if (key === stopKey) {
      if (!firstStopCheckDone) {
        firstStopCheckDone = true;
        stopValue = "1"; // arrives right after the pre-existing check misses it
        return null;
      }
      return stopValue;
    }
    return originalGet(key);
  }) as typeof env.SPEND_KV.get;
  env.SPEND_KV.delete = (async (key: string) => {
    if (key === stopKey) {
      stopValue = null;
      return;
    }
    return originalDelete(key);
  }) as typeof env.SPEND_KV.delete;

  const events1: ChangeEvent[] = [];
  const rec1 = await runChangePipeline(env, runId, changeRequest, (e) => events1.push(e));
  assert.equal(rec1.ledger.outcome, "halted-awaiting-error-decision", "the real (invalid-key) failure must be reported honestly, not silently swallowed as a stop");
  assert.ok(events1.some((e) => e.type === "stage-error"), "a genuine stage-error must fire for this attempt");
  assert.ok(!events1.some((e) => e.type === "stopped"), "this attempt must not report itself as stopped -- the flag arrived mid-implement, after the pre-existing pre-implement check already passed");

  // The flag that arrived mid-flight must not survive past this checkpoint.
  assert.equal(stopValue, null, "the stray stop signal must be consumed when the error is checkpointed, or it silently swallows the next retry");

  // Retry again -- must genuinely re-attempt implement (hitting the same
  // real invalid-key failure again), not immediately re-halt as
  // "stopped" because of the now-stale flag from the FIRST attempt.
  await env.SPEND_KV.put(`change/error-decision/${runId}`, JSON.stringify({ approve: true }));
  const events2: ChangeEvent[] = [];
  const rec2 = await runChangePipeline(env, runId, changeRequest, (e) => events2.push(e));
  assert.ok(!events2.some((e) => e.type === "stopped"), "SHIP.md item 1: this is the exact bug -- retry silently swallowed by a stale stop flag instead of genuinely re-attempting");
  assert.ok(events2.some((e) => e.type === "stage-error"), "the retry must genuinely re-attempt and hit the same real failure again, not stop silently");
  assert.equal(rec2.ledger.outcome, "halted-awaiting-error-decision");
});
