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
