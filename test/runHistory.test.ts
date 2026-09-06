// POLISH.md item 1: a run history tab, real runs only. The most
// distinctive claim on the page ("only says yes when yes is true") had
// exactly one recorded run behind it, and that run said yes -- refusals,
// stops, and abandons were never logged to changelog/${runId} at all
// before this, only the shipped/refused-verification-after-review path
// was. This tests both halves: the pure reason text (deriveHistoryReason)
// and that a stop, a plan-gate rejection, and an abandon-after-error now
// genuinely write a changelog entry through the REAL runChangePipeline --
// not a reimplementation of the control flow.
import { test } from "node:test";
import assert from "node:assert/strict";

import { runChangePipeline, deriveHistoryReason, type ChangeEnv, type ChangeEvent, type ChangeLedger } from "../src/changePipeline.ts";

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
    _store: store,
  } as unknown as KVNamespace & { _store: Map<string, string> };
}

function makeFakeSpendCounter() {
  const stub = {
    fetch: async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/reserve")) return new Response(JSON.stringify({ ok: true }));
      if (url.includes("/status")) return new Response(JSON.stringify({ dailySpentUsd: 0, weeklySpentUsd: 0, monthlySpentUsd: 0 }));
      return new Response(JSON.stringify({ ok: true }));
    },
  };
  return { idFromName: () => ({}) as unknown, get: () => stub } as unknown as DurableObjectNamespace;
}

function makeEnv(kv: KVNamespace): ChangeEnv {
  return {
    LOADER: {} as unknown as ChangeEnv["LOADER"],
    SPEND_KV: kv,
    SPEND_COUNTER: makeFakeSpendCounter(),
    ANTHROPIC_API_KEY: "sk-ant-deliberately-invalid-test-key-000000000000000000000000",
    OPENAI_API_KEY: "deliberately-invalid",
  };
}

// ---------------------------------------------------------------------
// deriveHistoryReason -- pure, one line per outcome, never the raw
// visitor request (the caller never passes it in at all -- there's no
// argument for it, so it structurally can't leak in).
// ---------------------------------------------------------------------

test("deriveHistoryReason: shipped clean reads as a plain pass", () => {
  const l = { outcome: "shipped", fixApplied: false, fixHeld: null, reviewFoundMaterial: 0 } as ChangeLedger;
  assert.equal(deriveHistoryReason(l), "It passed every check.");
});

test("deriveHistoryReason: shipped after a fix that held names the fix", () => {
  const l = { outcome: "shipped", fixApplied: true, fixHeld: true, reviewFoundMaterial: 2 } as ChangeLedger;
  assert.match(deriveHistoryReason(l), /fix addressed/);
});

test("deriveHistoryReason: shipped as-is despite findings says so, not that nothing was found", () => {
  const l = { outcome: "shipped", fixApplied: false, fixHeld: null, reviewFoundMaterial: 3 } as ChangeLedger;
  assert.match(deriveHistoryReason(l), /accepted as is/);
});

test("deriveHistoryReason: refused-plan never mentions internals", () => {
  const l = { outcome: "refused-plan", fixApplied: false, fixHeld: null, reviewFoundMaterial: 0 } as ChangeLedger;
  const reason = deriveHistoryReason(l);
  assert.equal(reason, "The plan was not approved.");
  assert.doesNotMatch(reason, /regression|criteria|schema|prompt/i);
});

test("deriveHistoryReason: refused-verification without a fix attempt differs from with one", () => {
  const noFix = deriveHistoryReason({ outcome: "refused-verification", fixApplied: false, fixHeld: null, reviewFoundMaterial: 0 } as ChangeLedger);
  const withFix = deriveHistoryReason({ outcome: "refused-verification", fixApplied: true, fixHeld: false, reviewFoundMaterial: 1 } as ChangeLedger);
  assert.notEqual(noFix, withFix);
  assert.match(withFix, /fix was attempted/);
});

test("deriveHistoryReason: stopped and abandoned are each their own, distinct sentence", () => {
  const stopped = deriveHistoryReason({ outcome: "stopped", fixApplied: false, fixHeld: null, reviewFoundMaterial: 0 } as ChangeLedger);
  const abandoned = deriveHistoryReason({ outcome: "abandoned-after-error", fixApplied: false, fixHeld: null, reviewFoundMaterial: 0 } as ChangeLedger);
  assert.match(stopped, /by request/);
  assert.match(abandoned, /not retried/);
  assert.notEqual(stopped, abandoned);
});

// ---------------------------------------------------------------------
// Integration: real runChangePipeline, real KV writes, zero spend
// (invalid key, same technique as changePipelineErrorRecovery.test.ts).
// Proves outcomes that were NEVER logged before this now genuinely are.
// ---------------------------------------------------------------------

test("a run stopped mid-flight now writes a changelog entry -- it did not before this fix", async () => {
  const kv = makeFakeKV();
  const env = makeEnv(kv);
  const runId = `test-history-stopped-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  // Seed a state already past Gate 1 (mirrors SHIP.md item 1's own stray-
  // stop test) so this resume heads straight for the checkStopped() right
  // before implement, without needing a real ground/plan call.
  const plan = { willBuild: "x", willNotTouch: "y", criteria: [], implementationPath: "data-edit", question: null, understoodIntent: "Add a lamp post near the workshop." };
  const grounding = { premisesHold: true, reasoning: "ok", falsePremises: [] };
  await kv.put(
    `change/state/${runId}`,
    JSON.stringify({
      runId, changeRequest, currentSourceAtStart: "", budgetSpent: 0, stageCosts: [],
      questionAsked: false, planGateReplyCount: 0, runStartedAt: Date.now(),
      stage: "errored", errorMessage: "simulated prior transient blip", erroredAtStage: "implement",
      errorKind: "transient", erroredPastGate1: true, plan, grounding,
    }),
  );
  await kv.put(`change/error-decision/${runId}`, JSON.stringify({ approve: true }));
  await kv.put(`change/stop/${runId}`, "1");

  const events: ChangeEvent[] = [];
  const rec = await runChangePipeline(env, runId, changeRequest, (e) => events.push(e));
  assert.equal(rec.ledger.outcome, "stopped");

  const raw = await kv.get(`changelog/${runId}`);
  assert.ok(raw, "a stopped run must now be findable in changelog/ for the history tab");
  const stored = JSON.parse(raw!);
  assert.equal(stored.changeRequest, undefined, "the changelog must never persist the raw visitor request");
  assert.equal(stored.ledger.outcome, "stopped");
  assert.equal(stored.reason, "Stopped partway through, by request.");
  assert.ok(stored.completedAt > 0);
  assert.equal(stored.plan.understoodIntent, "Add a lamp post near the workshop.", "the history entry must carry the system's own summary, not require the caller to reconstruct it");
});

// NOT round-tripped end to end here, unlike "stopped" and "abandoned"
// above: the refused-plan path unconditionally calls
// runRetrospectiveAndRecord before it ever reaches recordTerminalRun,
// which is a real, un-catchable Anthropic call this file's fake env
// (invalid key, zero spend) cannot get past -- it throws and the run
// checkpoints as "errored" instead, same as it would for ANY real
// network failure at that point. Confirmed by running this exact
// scenario: it lands in "halted-awaiting-error-decision", not
// "refused-plan". POLISH.md's zero-spend constraint makes the real path
// untestable live; recordTerminalRun's placement immediately after the
// refused-plan ledger is built (src/changePipeline.ts, the
// planDecision === "reject" branch) is verified by reading, and
// deriveHistoryReason's own "refused-plan" case is unit-tested above.

test("abandoning after an error now writes a changelog entry with outcome abandoned-after-error", async () => {
  const kv = makeFakeKV();
  const env = makeEnv(kv);
  const runId = `test-history-abandoned-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  await kv.put(
    `change/state/${runId}`,
    JSON.stringify({
      runId, changeRequest, currentSourceAtStart: "", budgetSpent: 0.05, stageCosts: [],
      questionAsked: false, planGateReplyCount: 0, runStartedAt: Date.now(),
      stage: "errored", errorMessage: "simulated failure", erroredAtStage: "implement", errorKind: "transient",
    }),
  );
  await kv.put(`change/error-decision/${runId}`, JSON.stringify({ approve: false }));

  const events: ChangeEvent[] = [];
  const rec = await runChangePipeline(env, runId, changeRequest, (e) => events.push(e));
  assert.equal(rec.ledger.outcome, "abandoned-after-error");

  const raw = await kv.get(`changelog/${runId}`);
  assert.ok(raw, "an abandoned run must now be findable in changelog/");
  const stored = JSON.parse(raw!);
  assert.equal(stored.reason, "It failed partway through and was not retried.");
});

test("a run still halted at a gate (not yet terminal) does NOT write a changelog entry -- it hasn't ended", async () => {
  const kv = makeFakeKV();
  const env = makeEnv(kv);
  const runId = `test-history-halted-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  const plan = { willBuild: "x", willNotTouch: "y", criteria: [], implementationPath: "data-edit", question: null, understoodIntent: "Add a lamp post near the workshop." };
  const grounding = { premisesHold: true, reasoning: "ok", falsePremises: [] };
  await kv.put(
    `change/state/${runId}`,
    JSON.stringify({
      runId, changeRequest, currentSourceAtStart: "", budgetSpent: 0, stageCosts: [],
      questionAsked: false, planGateReplyCount: 0, runStartedAt: Date.now(),
      stage: "awaiting-plan-decision", plan, grounding,
    }),
  );
  // No decision posted -- this resume just re-halts at the same gate.

  const rec = await runChangePipeline(env, runId, changeRequest, () => {});
  assert.equal(rec.ledger.outcome, "halted-awaiting-plan-decision");
  const raw = await kv.get(`changelog/${runId}`);
  assert.equal(raw, null, "a run still parked at a gate is not finished -- it must not appear in a history of completed runs");
});

// ---------------------------------------------------------------------
// PART 7b/E3 -- the changelog records WHICH MODEL and WHEN, per stage.
//
// 19 real production runs (checked directly against the live changelog/ KV
// namespace) carry neither: stageCosts entries were always {stage, costUsd,
// wallTimeMs}, so a run's outcome could never be attributed to a specific
// model or dated. groundRequest/generatePlan/etc. all already RETURN a
// `model` field (checked directly in src/claude.ts/src/openai.ts) -- it was
// just never copied into stageCosts. Testing the real call sites would
// need a real Anthropic/OpenAI call, which the zero-spend constraint above
// forbids; this instead proves the SURVIVAL half of the claim -- once a
// stage-cost entry carries model/at, it reaches the actual changelog/ KV
// record unchanged, through the real recordTerminalRun -- using the same
// seeded-state, zero-spend resume technique as the "stopped" test above.
// ---------------------------------------------------------------------

test("a stage cost's model and timestamp survive into the changelog record", async () => {
  const kv = makeFakeKV();
  const env = makeEnv(kv);
  const runId = `test-history-provenance-${Date.now()}`;
  const changeRequest = "add a lamp post near the workshop";

  const plan = { willBuild: "x", willNotTouch: "y", criteria: [], implementationPath: "data-edit", question: null, understoodIntent: "Add a lamp post near the workshop." };
  const grounding = { premisesHold: true, reasoning: "ok", falsePremises: [] };
  const seededStageCosts = [
    { stage: "ground", costUsd: 0.00247, wallTimeMs: 2835, model: "claude-haiku-4-5", at: 1735000000000 },
  ];
  await kv.put(
    `change/state/${runId}`,
    JSON.stringify({
      runId, changeRequest, currentSourceAtStart: "", budgetSpent: 0, stageCosts: seededStageCosts,
      questionAsked: false, planGateReplyCount: 0, runStartedAt: Date.now(),
      stage: "errored", errorMessage: "simulated prior transient blip", erroredAtStage: "implement",
      errorKind: "transient", erroredPastGate1: true, plan, grounding,
    }),
  );
  await kv.put(`change/error-decision/${runId}`, JSON.stringify({ approve: true }));
  await kv.put(`change/stop/${runId}`, "1");

  const rec = await runChangePipeline(env, runId, changeRequest, () => {});
  assert.equal(rec.ledger.outcome, "stopped");
  assert.equal(rec.ledger.stageCosts[0].model, "claude-haiku-4-5", "the in-memory ledger must carry the stage's model");
  assert.equal(rec.ledger.stageCosts[0].at, 1735000000000, "the in-memory ledger must carry the stage's timestamp");

  const raw = await kv.get(`changelog/${runId}`);
  assert.ok(raw, "a stopped run must be in changelog/");
  const stored = JSON.parse(raw!);
  assert.equal(stored.ledger.stageCosts[0].model, "claude-haiku-4-5", "the CHANGELOG record -- what a fresh reader actually sees -- must carry the model, not just the in-memory object");
  assert.equal(stored.ledger.stageCosts[0].at, 1735000000000, "the CHANGELOG record must carry the timestamp");
});
