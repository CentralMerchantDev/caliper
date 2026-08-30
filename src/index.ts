import { getTask, TASKS } from "./tasks";
import { generateFunctionBody, repairFunctionBody, MODELS } from "./claude";
import { DynamicWorkersSandbox, runRawScriptInSandbox, type LoaderBinding } from "./sandbox";
import { getCumulativeSpend, SpendCapExceededError } from "./spendCap";
import { assertUnderRateLimit, recordRateLimitHit, RateLimitExceededError } from "./rateLimit";
import { ATTACK_PROBES } from "./attacks";
import type { GenerationResult, TestResult, Task } from "./types";
import { SIM_BASELINE_SOURCE } from "./simBaseline";
import { SIM_REGRESSION_SUITE } from "./simRegression";
import { runSimTests } from "./simSandbox";
import { runChangePipeline, loadInstructions, deriveHistoryReason, type ChangeEvent, type ChangeRecord } from "./changePipeline";
import {
  getPipelineBudgetStatus,
  checkInputGuard,
  assertUnderPipelineRateLimit,
  recordPipelineRateLimitHit,
  tryLeaseActiveRun,
  releaseActiveRun,
  PipelineLimitError,
} from "./controlLayer";
export { SpendCounterDO } from "./spendCounterDOClass";

export interface Env {
  LOADER: LoaderBinding;
  SPEND_KV: KVNamespace;
  SPEND_COUNTER: DurableObjectNamespace;
  SPEND_CAP_USD: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  ASSETS: Fetcher;
  /** Set to "false" to disable new public change runs in one deploy. */
  LIVE_RUN_ENABLED?: string;
  /** Optional. When set, ?k=<UNLOCK_CODE> on /change-run bypasses the
   * per-IP daily live-run limit -- for Mark's own use (demoing live)
   * without raising the number every visitor gets. Unset means the bypass
   * is simply never available, not an open door. */
  UNLOCK_CODE?: string;
}

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function timingSafeCompare(aStr: string, bStr: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aDigest = await crypto.subtle.digest("SHA-256", encoder.encode(aStr));
  const bDigest = await crypto.subtle.digest("SHA-256", encoder.encode(bStr));
  return crypto.subtle.timingSafeEqual(aDigest, bDigest);
}

const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
  "content-security-policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net data: blob:;",
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
  });
}

function jsonError(error: string, reason: string, status: number): Response {
  return json({ error, reason }, status);
}

export function liveRunsEnabled(env: Pick<Env, "LIVE_RUN_ENABLED">): boolean {
  // Fail closed: missing, malformed, or unreadable configuration never
  // exposes a paid public action. Only the explicit string "true" enables it.
  return env.LIVE_RUN_ENABLED === "true";
}

export function liveRunsDisabledResponse(): Response {
  const reason = "Live runs are disabled. The recording and run history remain available.";
  return jsonError("live_runs_disabled", reason, 503);
}

const MAX_ATTEMPTS = 3; // one shot + up to two repair attempts -- see docs/MATRIX-RESULTS.md for how this budget was chosen

interface AttemptRecord {
  attempt: number;
  generation: GenerationResult;
  coldRunWallTimeMs: number;
  warmRunWallTimeMs: number;
  fatalError?: string;
  passed: number;
  total: number;
  results: TestResult[];
}

interface CycleSuccess {
  ok: true;
  task: { id: string; title: string };
  model: string;
  attemptsMade: number;
  attempts: ReturnType<typeof serializeAttempts>;
  finalResult: { allTestsPassed: boolean; passed: number; total: number };
  firstFailedTest: string | null;
  totalCostUsd: number;
  totalCycleWallTimeMs: number;
}

interface CycleFailure {
  ok: false;
  error: string;
  status: number;
  attempts: ReturnType<typeof serializeAttempts>;
}

function serializeAttempts(attempts: AttemptRecord[]) {
  return attempts.map((a) => ({
    attempt: a.attempt,
    generatedCode: a.generation.code,
    generation: {
      model: a.generation.model,
      inputTokens: a.generation.inputTokens,
      outputTokens: a.generation.outputTokens,
      costUsd: a.generation.costUsd,
      wallTimeMs: a.generation.wallTimeMs,
    },
    execution: {
      coldRunWallTimeMs: a.coldRunWallTimeMs,
      warmRunWallTimeMs: a.warmRunWallTimeMs,
      fatalError: a.fatalError,
    },
    tests: { total: a.total, passed: a.passed, failed: a.total - a.passed, results: a.results },
  }));
}

export type CycleEvent =
  | { type: "generating"; attempt: number }
  | { type: "generated"; attempt: number; code: string; inputTokens: number; outputTokens: number; costUsd: number; wallTimeMs: number }
  | { type: "testing"; attempt: number }
  | {
      type: "tested";
      attempt: number;
      passed: number;
      total: number;
      results: TestResult[];
      coldRunWallTimeMs: number;
      warmRunWallTimeMs: number;
      fatalError?: string;
    };

/**
 * The one full generate -> execute -> test [-> repair -> re-test] cycle.
 * Used by the single-cycle /run route, the streaming /live-run route, and
 * the matrix runner -- none of them duplicate this logic. `onEvent` is
 * optional and only used by /live-run to relay real progress as it
 * happens (not a simulated delay -- each event fires exactly when that
 * stage of this function actually completes).
 */
async function runCycle(
  env: Env,
  task: Task,
  model: string,
  onEvent?: (e: CycleEvent) => void,
): Promise<CycleSuccess | CycleFailure> {
  const capUsd = parseFloat(env.SPEND_CAP_USD);
  const cycleStart = Date.now();
  const sandbox = new DynamicWorkersSandbox(env.LOADER);

  const attempts: AttemptRecord[] = [];
  let generation: GenerationResult;
  let previousFailures: TestResult[] = [];

  for (let attemptNum = 1; attemptNum <= MAX_ATTEMPTS; attemptNum++) {
    onEvent?.({ type: "generating", attempt: attemptNum });
    try {
      generation =
        attemptNum === 1
          ? await generateFunctionBody(env.ANTHROPIC_API_KEY, env.SPEND_KV, capUsd, task, model)
          : await repairFunctionBody(
              env.ANTHROPIC_API_KEY,
              env.SPEND_KV,
              capUsd,
              task,
              attempts[attempts.length - 1].generation.code,
              previousFailures,
              model,
            );
    } catch (e) {
      if (e instanceof SpendCapExceededError) {
        return { ok: false, error: e.message, status: 402, attempts: serializeAttempts(attempts) };
      }
      return {
        ok: false,
        error: `generation failed: ${String((e as Error)?.message ?? e)}`,
        status: 502,
        attempts: serializeAttempts(attempts),
      };
    }
    onEvent?.({
      type: "generated",
      attempt: attemptNum,
      code: generation.code,
      inputTokens: generation.inputTokens,
      outputTokens: generation.outputTokens,
      costUsd: generation.costUsd,
      wallTimeMs: generation.wallTimeMs,
    });

    onEvent?.({ type: "testing", attempt: attemptNum });
    const isolateId = `task-${task.id}-${await sha256Hex(generation.code)}`;
    // Cold run: first time this exact generated code has been loaded.
    const cold = await sandbox.run(generation.code, task, { cpuMs: 500, isolateId });
    // Warm run: identical id -> Dynamic Workers should reuse the isolate.
    const warm = await sandbox.run(generation.code, task, { cpuMs: 500, isolateId });

    const passed = cold.results.filter((r) => r.pass).length;
    attempts.push({
      attempt: attemptNum,
      generation,
      coldRunWallTimeMs: cold.wallTimeMs,
      warmRunWallTimeMs: warm.wallTimeMs,
      fatalError: cold.fatalError ?? warm.fatalError,
      passed,
      total: task.hiddenTests.length,
      results: cold.results,
    });
    onEvent?.({
      type: "tested",
      attempt: attemptNum,
      passed,
      total: task.hiddenTests.length,
      results: cold.results,
      coldRunWallTimeMs: cold.wallTimeMs,
      warmRunWallTimeMs: warm.wallTimeMs,
      fatalError: cold.fatalError ?? warm.fatalError,
    });

    if (passed === task.hiddenTests.length) break; // all tests passed, no repair needed
    previousFailures = cold.results.filter((r) => !r.pass);
  }

  const totalCycleMs = Date.now() - cycleStart;
  const totalCostUsd = attempts.reduce((sum, a) => sum + a.generation.costUsd, 0);
  const finalAttempt = attempts[attempts.length - 1];
  const firstFailedTest = attempts[0]?.results.find((r) => !r.pass)?.name ?? null;

  return {
    ok: true,
    task: { id: task.id, title: task.title },
    model,
    attemptsMade: attempts.length,
    attempts: serializeAttempts(attempts),
    finalResult: {
      allTestsPassed: finalAttempt.passed === finalAttempt.total,
      passed: finalAttempt.passed,
      total: finalAttempt.total,
    },
    firstFailedTest,
    totalCostUsd,
    totalCycleWallTimeMs: totalCycleMs,
  };
}

async function handleRun(env: Env, taskId: string, model: string, ip: string): Promise<Response> {
  const task = getTask(taskId);
  if (!task) {
    return json({ error: `unknown task "${taskId}"`, availableTasks: TASKS.map((t) => t.id) }, 404);
  }
  try {
    await assertUnderRateLimit(env.SPEND_KV, ip);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return jsonError("rate_limit_exceeded", e.message, 429);
    throw e;
  }
  await recordRateLimitHit(env.SPEND_KV, ip);

  const cycle = await runCycle(env, task, model);
  if (!cycle.ok) return json({ error: cycle.error, attempts: cycle.attempts }, cycle.status);

  const cumulativeSpend = await getCumulativeSpend(env.SPEND_KV);
  const capUsd = parseFloat(env.SPEND_CAP_USD);
  return json({ ...cycle, cumulativeSpendUsd: cumulativeSpend, spendCapUsd: capUsd });
}

/**
 * Server-Sent Events version of the same cycle, for the page's "one live
 * run" section. Every event fires when that real stage of runCycle()
 * completes -- this is not a simulated/staged reveal.
 */
async function handleLiveRun(env: Env, taskId: string, model: string, ip: string): Promise<Response> {
  const task = getTask(taskId);
  if (!task) return json({ error: `unknown task "${taskId}"` }, 404);
  if (!MODELS.includes(model)) return json({ error: `unknown model "${model}"`, availableModels: MODELS }, 400);

  // Everything past this point returns a 200 text/event-stream response no
  // matter what happens inside -- including the rate limit and spend cap
  // rejections. A native EventSource treats any non-200 status as a dead
  // connection and never surfaces the response body, so a plain 429/402
  // here would reach the page as a generic "connection lost" instead of
  // the friendly message. Discovered by actually driving the deployed page
  // in a browser, not by reading the code.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event: string, data: unknown) =>
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

  (async () => {
    try {
      await assertUnderRateLimit(env.SPEND_KV, ip);
      await recordRateLimitHit(env.SPEND_KV, ip);
      send("task", { id: task.id, title: task.title, prompt: task.prompt, model });
      const cycle = await runCycle(env, task, model, (e) => send(e.type, e));
      if (!cycle.ok) send("error", { message: cycle.error });
      else send("done", cycle);
    } catch (e) {
      send("error", { message: String((e as Error)?.message ?? e) });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

/**
 * Runs one (task, model, rep) matrix cell and persists the full cycle
 * result to KV under matrix/<model>/<taskId>/<rep>. One cell per request
 * by design -- an external loop drives the sweep across the whole matrix,
 * one HTTP call per (task, model, rep), so no single request has to stay
 * open for the full multi-minute sweep.
 */
async function handleMatrixRun(env: Env, taskId: string, model: string, rep: number): Promise<Response> {
  const task = getTask(taskId);
  if (!task) return json({ error: `unknown task "${taskId}"` }, 404);
  if (!MODELS.includes(model)) return json({ error: `unknown model "${model}"`, availableModels: MODELS }, 400);

  const cycle = await runCycle(env, task, model);
  const key = `matrix/${model}/${taskId}/${rep}`;
  const record = { ...cycle, taskId, model, rep, runDate: new Date().toISOString().slice(0, 10) };
  await env.SPEND_KV.put(key, JSON.stringify(record));
  return json(record, cycle.ok ? 200 : cycle.status);
}

async function handleMatrixResults(env: Env): Promise<Response> {
  const results: unknown[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.SPEND_KV.list({ prefix: "matrix/", cursor });
    // Fetching each value sequentially took 74s+ once the matrix passed ~450
    // cells -- this is a public link on the page ("raw results"), not just
    // internal tooling, so a slow fetch here is a real page defect. KV reads
    // are independent, so fetch each page's values concurrently.
    const values = await Promise.all(page.keys.map((key) => env.SPEND_KV.get(key.name)));
    for (const value of values) {
      if (value) results.push(JSON.parse(value));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ count: results.length, results });
}

async function handleSecurityCheck(env: Env): Promise<Response> {
  const results = [];
  for (const probe of ATTACK_PROBES) {
    const isolateId = `attack-${probe.id}`;
    const cold = await runRawScriptInSandbox(env.LOADER, probe.code, { cpuMs: probe.cpuMs, isolateId });
    const warm = await runRawScriptInSandbox(env.LOADER, probe.code, { cpuMs: probe.cpuMs, isolateId });
    const held = probe.judge(cold);
    // Categorizes what the calling (parent) Worker actually experiences:
    // - "isolate-killed-before-response": entrypoint.fetch() itself threw/rejected --
    //   the child never got to run its own try/catch, but the parent still gets
    //   a normal catchable JS exception, not a dead request.
    // - "catchable-error-in-response": the child's harness caught an exception
    //   (from the attack code or the runtime) and returned it as a normal
    //   {ok:false, error} response body.
    // - "completed-without-error": nothing stopped the attack code at all.
    const outcome = !cold.invoked
      ? "isolate-killed-before-response"
      : cold.error
        ? "catchable-error-in-response"
        : "completed-without-error";
    results.push({
      id: probe.id,
      description: probe.description,
      expectedOutcome: probe.expectedOutcome,
      held,
      outcome,
      cold: { invoked: cold.invoked, result: cold.result, error: cold.error, wallTimeMs: cold.wallTimeMs },
      warm: { invoked: warm.invoked, result: warm.result, error: warm.error, wallTimeMs: warm.wallTimeMs },
    });
  }
  return json({ probes: results, allHeld: results.every((r) => r.held) });
}

// ---------------------------------------------------------------------
// CALIPER pipeline routes (REBUILD.md / REBUILD-CONTROLS.md). Entirely
// separate control-layer state (src/controlLayer.ts, KV keys prefixed
// "pipeline/") from the plain 32-task routes above, which are unchanged.
// ---------------------------------------------------------------------

function randomRunId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------
// CALIPER v2 change pipeline routes (BUILD-V2.md). Superseding, not yet
// replacing, the preset pipeline routes above.
// ---------------------------------------------------------------------

// One call = one pass: plan, or resume from wherever a prior call halted,
// up to the next point that needs a real human decision (or a terminal
// shipped/refused outcome). Never holds the connection open waiting --
// see the "gate never advances on its own" note in changePipeline.ts.
//
// The concurrency lease wraps each individual call (fresh start or
// resume), not a run's whole halted-and-waiting lifetime -- a run can halt
// for up to a week (STATE_TTL_SEC in changePipeline.ts) waiting on a
// human, and holding a concurrency slot for that entire wait would let a
// handful of unanswered gates exhaust MAX_CONCURRENT_PIPELINE_RUNS and
// lock out every other visitor for days. The limit bounds simultaneous
// real API spend, which only happens while a call is actively executing.
async function handleChangeRun(env: Env, changeRequest: string, existingRunId?: string): Promise<Response> {
  const runId = existingRunId ?? randomRunId();
  let leaseToken: string | null = null;
  try {
    leaseToken = await tryLeaseActiveRun(env.SPEND_KV, runId, env.SPEND_COUNTER);
  } catch (e) {
    if (e instanceof PipelineLimitError) return jsonError("rate_limit_exceeded", e.message, 429);
    throw e;
  }

  // Generate or retrieve per-run cryptographic controlToken
  let controlToken = await env.SPEND_KV.get(`change/token/${runId}`);
  if (!controlToken) {
    controlToken = crypto.randomUUID();
    await env.SPEND_KV.put(`change/token/${runId}`, controlToken, { expirationTtl: 604800 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event: string, data: unknown) => writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => {});

  // Periodic heartbeat & lease renewal: extends active lease every 30s while actively executing
  const heartbeatTimer = setInterval(async () => {
    writer.write(encoder.encode(`: keep-alive\n\n`)).catch(() => {});
    if (env.SPEND_COUNTER && leaseToken) {
      try {
        const id = env.SPEND_COUNTER.idFromName("global");
        const stub = env.SPEND_COUNTER.get(id);
        await stub.fetch("https://spend-counter.internal/renew-lease", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId, leaseToken, extensionSec: 600 }),
        });
      } catch {}
    }
  }, 15_000);

  (async () => {
    try {
      send("runId", { runId, controlToken });
      const onEvent = (e: ChangeEvent) => send(e.type, e);
      await runChangePipeline(env, runId, changeRequest, onEvent);
      send("done", { runId });
    } catch (e) {
      send("error", { message: String((e as Error)?.message ?? e) });
    } finally {
      clearInterval(heartbeatTimer);
      await releaseActiveRun(env.SPEND_KV, runId, env.SPEND_COUNTER, leaseToken ?? undefined);
      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "SAMEORIGIN",
      "content-security-policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net data: blob:; frame-ancestors 'self';",
    },
  });
}

async function handleChangeResume(env: Env, runId: string): Promise<Response> {
  const stateRaw = await env.SPEND_KV.get(`change/state/${runId}`);
  if (!stateRaw) return json({ error: `no halted run found for runId "${runId}" -- it may have already finished, or never existed` }, 404);
  const changeRequest = (JSON.parse(stateRaw) as { changeRequest: string }).changeRequest;
  return handleChangeRun(env, changeRequest, runId);
}

/** POLISH.md item 1: a run history, real runs only. Reads every completed
 * run straight from changelog/ (written by every terminal outcome now,
 * not just shipped/refused-verification -- see recordTerminalRun in
 * changePipeline.ts) and reduces each one to exactly three public fields:
 * a date, the system's own summary (never the raw visitor request --
 * there is no code path in this function that ever reads
 * record.changeRequest), and the outcome plus its one-line reason.
 * Records written before this feature (missing completedAt/reason)
 * still show up correctly -- the reason is derived at read time from the
 * same deriveHistoryReason the write path uses, so there is no separate
 * migration step for the backfill this was asked for. */
async function handleChangeHistory(env: Env): Promise<Response> {
  const list = await env.SPEND_KV.list({ prefix: "changelog/" });
  const entries: { date: string; summary: string | null; outcome: string; reason: string }[] = [];
  for (const key of list.keys) {
    const raw = await env.SPEND_KV.get(key.name);
    if (!raw) continue;
    let record: ChangeRecord;
    try {
      record = JSON.parse(raw);
    } catch {
      continue; // a malformed record is skipped, not shown as a broken row
    }
    const completedAt = typeof record.completedAt === "number" && record.completedAt > 0 ? record.completedAt : 0;
    const reason = record.reason || deriveHistoryReason(record.ledger);
    entries.push({
      date: completedAt > 0 ? new Date(completedAt).toISOString().slice(0, 10) : "",
      summary: record.plan?.understoodIntent ?? null,
      outcome: record.ledger.outcome,
      reason,
    });
  }
  // Most recent first; entries with no known date (pre-dating completedAt)
  // sort last rather than first, so they don't masquerade as the newest.
  entries.sort((a, b) => (b.date || "0000-00-00").localeCompare(a.date || "0000-00-00"));
  return json({ entries: entries.slice(0, 200) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api") {
      return json({
        routes: {
          "GET /tasks": "list the seed tasks",
          "GET /run?task=<id>[&model=<id>]": "generate + execute + test one task end to end",
          "GET /live-run?task=<id>&model=<id>": "same cycle, streamed via SSE -- what the page's live-run section calls",
          "GET /matrix-run?task=<id>&model=<id>&rep=<n>": "run one matrix cell and persist it to KV",
          "GET /matrix-results": "dump every stored matrix cell",
          "GET /security-check": "run the deliberate sandbox-escape probes (no model calls, no cost)",
          "GET /spend": "cumulative spend against the hard cap",
          "GET /pipeline-budget": "today's/this month's change-pipeline spend against the caps",
          "GET /live-status": "whether new public live change runs are enabled",
          "GET /world-edit-selftest": "apply and validate a deterministic in-memory data edit (no model call, no persistence)",
          "GET /change-run?request=<text>": "CALIPER v2 (BUILD-V2.md): plan -> implement -> verify -> review -> ship, one call per stage-boundary",
          "GET /change-resume?runId=<id>&ticket=<single-use-ticket>": "continue an authenticated halted change run via short-lived single-use resume ticket issued by decision endpoints",
          "POST /change-plan-decision": "approve/reject at Gate 1 (JSON body: { runId, approve: boolean, controlToken })",
          "POST /change-plan-reply": "the third Gate 1 action -- reply in free text instead of approve/reject; re-grounds and re-plans (JSON body: { runId, reply: string, controlToken })",
          "POST /change-review-decision": "resolve the review gate (JSON body: { runId, approve: boolean, controlToken })",
          "POST /change-error-decision": "resolve a stage-error halt -- true retries the failed stage, false abandons the run (JSON body: { runId, approve: boolean, controlToken })",
          "POST /change-answer": "answer a plan-mode clarifying question (JSON body: { runId, answer: string, controlToken })",
          "POST /change-stop": "halt a run at its next stage boundary (JSON body: { runId, controlToken })",
          "GET /sim-selftest": "run the regression suite against the current sim source",
          "GET /spend-counter-selftest?n=<count>": "fire n concurrent reservations at an isolated DO instance and confirm none are lost (free, no real spend touched)",
          "GET /change-instructions": "the accumulated lessons file, fed into plan/implement/review/fix prompts on future runs",
        },
        availableTasks: TASKS.map((t) => t.id),
        availableModels: MODELS,
      });
    }

    if (url.pathname === "/tasks") {
      return json(TASKS.map((t) => ({ id: t.id, title: t.title, hiddenTestCount: t.hiddenTests.length })));
    }

    async function isAuthorizedSecret(req: Request, urlObj: URL): Promise<boolean> {
      if (!env.UNLOCK_CODE) return false;
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        if (await timingSafeCompare(token, env.UNLOCK_CODE)) return true;
      }
      const xHeader = req.headers.get("x-unlock-code");
      if (xHeader && await timingSafeCompare(xHeader.trim(), env.UNLOCK_CODE)) return true;
      // Fallback query secret supported with deprecation
      const keyParam = urlObj.searchParams.get("k");
      if (keyParam && await timingSafeCompare(keyParam, env.UNLOCK_CODE)) return true;
      return false;
    }

    if (url.pathname === "/run") {
      if (!(await isAuthorizedSecret(request, url))) return json({ error: "Unauthorized: this legacy evaluation endpoint requires authorization (Authorization: Bearer <secret> or X-Unlock-Code header)" }, 403);
      const taskId = url.searchParams.get("task");
      if (!taskId) return json({ error: "pass ?task=<id>", availableTasks: TASKS.map((t) => t.id) }, 400);
      const model = url.searchParams.get("model") ?? MODELS[0];
      return handleRun(env, taskId, model, clientIp(request));
    }

    if (url.pathname === "/live-run") {
      if (!(await isAuthorizedSecret(request, url))) return json({ error: "Unauthorized: this legacy evaluation endpoint requires authorization (Authorization: Bearer <secret> or X-Unlock-Code header)" }, 403);
      const taskId = url.searchParams.get("task");
      const model = url.searchParams.get("model") ?? MODELS[0];
      if (!taskId) return json({ error: "pass ?task=<id>&model=<id>" }, 400);
      return handleLiveRun(env, taskId, model, clientIp(request));
    }

    if (url.pathname === "/matrix-run") {
      if (!(await isAuthorizedSecret(request, url))) return json({ error: "Unauthorized: this legacy evaluation endpoint requires authorization (Authorization: Bearer <secret> or X-Unlock-Code header)" }, 403);
      const taskId = url.searchParams.get("task");
      const model = url.searchParams.get("model");
      const rep = parseInt(url.searchParams.get("rep") ?? "0", 10);
      if (!taskId || !model) return json({ error: "pass ?task=<id>&model=<id>&rep=<n>" }, 400);
      return handleMatrixRun(env, taskId, model, rep);
    }

    if (url.pathname === "/matrix-results") {
      return handleMatrixResults(env);
    }

    if (url.pathname === "/security-check") {
      return handleSecurityCheck(env);
    }

    if (url.pathname === "/spend") {
      const capUsd = parseFloat(env.SPEND_CAP_USD);
      const current = await getCumulativeSpend(env.SPEND_KV);
      return json({ cumulativeSpendUsd: current, spendCapUsd: capUsd, remainingUsd: capUsd - current });
    }

    if (url.pathname === "/pipeline-budget") {
      return json(await getPipelineBudgetStatus(env.SPEND_COUNTER));
    }

    if (url.pathname === "/live-status") {
      return json({ enabled: liveRunsEnabled(env) });
    }

    if (url.pathname === "/world-edit-selftest") {
      const { runValidatedWorldEdit, readWorldData } = await import("./worldEdit");
      const rejection = url.searchParams.get("reject");
      const edit = rejection === "collision"
        ? { ops: [{ op: "addPlacement" as const, placement: { id: "selftest-collision", type: "lampPost", location: "outdoors", plot: { x: 0, y: 0 } } }] }
        : rejection === "unknown-placement"
          ? { ops: [{ op: "overridePlacement" as const, placementId: "missing-placement", overrides: { color: "#ffffff" } }] }
          : rejection === "invalid-parcel"
            ? { ops: [{ op: "addPlacement" as const, placement: { id: "selftest-outside", type: "lampPost", location: "outdoors", plot: { x: 3, y: 1 } } }] }
            : { ops: [{ op: "addPlacement" as const, placement: { id: "selftest-lamp", type: "lampPost", location: "outdoors", plot: { x: 1, y: 1 } } }] };
      const result = runValidatedWorldEdit(SIM_BASELINE_SOURCE, edit);
      if (!result.ok) return jsonError("world_edit_rejected", result.reason, rejection ? 400 : 500);
      const world = readWorldData(result.source);
      return json({ passed: world.placements.some((p) => p.id === "selftest-lamp"), persisted: false });
    }

    if (url.pathname === "/change-run") {
      if (!liveRunsEnabled(env)) return liveRunsDisabledResponse();
      const request_ = url.searchParams.get("request");
      if (!request_) return json({ error: "pass ?request=<text>" }, 400);
      // The only path where a visitor controls raw input, so the only one
      // that gets attacked -- checked first, before it can consume a
      // per-IP rate-limit slot on a request that should never have counted.
      const guard = checkInputGuard(request_);
      if (!guard.ok) return jsonError("request_rejected", guard.reason, 400);
      // Only a fresh run counts against the per-IP daily limit -- resuming
      // an already-started run (/change-resume) isn't a second live run.
      // Constant-time comparison against configured secret only; no hardcoded bypass tokens.
      const keyParam = url.searchParams.get("k");
      const unlocked = !!env.UNLOCK_CODE && !!keyParam && (await timingSafeCompare(keyParam, env.UNLOCK_CODE));
      const ip = clientIp(request);
      if (!unlocked) {
        try {
          await assertUnderPipelineRateLimit(env.SPEND_KV, ip);
        } catch (e) {
          if (e instanceof PipelineLimitError) return jsonError("rate_limit_exceeded", e.message, 429);
          throw e;
        }
        await recordPipelineRateLimitHit(env.SPEND_KV, ip);
      }
      return handleChangeRun(env, request_);
    }

    // Parse decision body: accept POST JSON body with query param fallback
    async function readDecisionPayload(req: Request, urlObj: URL): Promise<Record<string, unknown>> {
      const out: Record<string, unknown> = {};
      if (req.method === "POST" || req.method === "PUT") {
        try {
          const body = (await req.json()) as Record<string, unknown>;
          if (body && typeof body === "object") Object.assign(out, body);
        } catch {}
      }
      urlObj.searchParams.forEach((v, k) => { out[k] = v; });
      return out;
    }

    async function createResumeTicket(runId: string): Promise<string> {
      if (env.SPEND_COUNTER) {
        try {
          const id = env.SPEND_COUNTER.idFromName("global");
          const stub = env.SPEND_COUNTER.get(id);
          const res = await stub.fetch("https://spend-counter.internal/create-resume-ticket", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ runId, ttlSec: 90 }),
          });
          if (res.ok) {
            const data = (await res.json()) as { ok: boolean; ticket: string };
            return data.ticket;
          }
        } catch {}
      }
      const ticket = crypto.randomUUID();
      await env.SPEND_KV.put(`change/resume-ticket/${runId}/${ticket}`, "1", { expirationTtl: 90 });
      return ticket;
    }

    async function verifyResumeAuth(req: Request, runId: string, payload: Record<string, unknown>): Promise<boolean> {
      const ticket = (typeof payload.ticket === "string" ? payload.ticket : null) ||
        (typeof payload.resumeTicket === "string" ? payload.resumeTicket : null);
      if (!ticket) {
        return false; // Strictly fail-closed: /change-resume requires single-use ticket
      }
      if (env.SPEND_COUNTER) {
        try {
          const id = env.SPEND_COUNTER.idFromName("global");
          const stub = env.SPEND_COUNTER.get(id);
          const res = await stub.fetch("https://spend-counter.internal/consume-resume-ticket", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ runId, ticket: ticket.trim() }),
          });
          if (res.ok) {
            const data = (await res.json()) as { ok: boolean; valid: boolean };
            return data.valid === true;
          }
          return false;
        } catch {
          return false; // Fail closed if DO unavailable
        }
      }
      // KV fallback strictly for test harness when SPEND_COUNTER binding is absent
      const ticketKey = `change/resume-ticket/${runId}/${ticket.trim()}`;
      const validTicket = await env.SPEND_KV.get(ticketKey);
      if (validTicket) {
        await env.SPEND_KV.delete(ticketKey).catch(() => {});
        return true;
      }
      return false;
    }

    async function verifyRunAuth(req: Request, runId: string, payload: Record<string, unknown>): Promise<boolean> {
      const storedToken = await env.SPEND_KV.get(`change/token/${runId}`);
      if (!storedToken) return false; // Strictly fail-closed: unauthenticated or unknown run
      const token = req.headers.get("x-control-token") ||
        (typeof payload.controlToken === "string" ? payload.controlToken : null);
      if (!token) return false; // Strictly fail-closed: missing token rejected
      return await timingSafeCompare(token.trim(), storedToken.trim());
    }

    if (url.pathname === "/change-plan-decision") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405);
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      const approve = payload.approve === true || payload.approve === "true";
      if (!runId) return json({ error: "pass runId & approve (boolean) via POST body" }, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/plan-decision/${runId}`, JSON.stringify({ approve }), { expirationTtl: 600 });
      const resumeTicket = await createResumeTicket(runId);
      return json({ ok: true, resumeTicket });
    }

    if (url.pathname === "/change-review-decision") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405);
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      const approve = payload.approve === true || payload.approve === "true";
      if (!runId) return json({ error: "pass runId & approve (boolean) via POST body" }, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/review-decision/${runId}`, JSON.stringify({ approve }), { expirationTtl: 600 });
      const resumeTicket = await createResumeTicket(runId);
      return json({ ok: true, resumeTicket });
    }

    // FOUNDATION-2 item 4: the third gate a run can halt at -- not a human
    // choice about the work, a human choice about what to do after a stage
    // failed (approve=true means retry, approve=false means abandon). Same
    // one-shot-signal shape as the two gates above, on purpose -- a stage
    // error is a halt like any other, not a special case.
    if (url.pathname === "/change-error-decision") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405);
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      const approve = payload.approve === true || payload.approve === "true";
      if (!runId) return json({ error: "pass runId & approve (boolean) via POST body" }, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/error-decision/${runId}`, JSON.stringify({ approve }), { expirationTtl: 600 });
      const resumeTicket = await createResumeTicket(runId);
      return json({ ok: true, resumeTicket });
    }

    // FINAL.md item 2: "a stop action that actually halts the run" -- writes
    // the same kind of one-shot KV signal a gate decision does, checked at
    // every stage boundary inside runChangePipeline (changePipeline.ts).
    // Works whether the run is actively processing (checked before its next
    // paid call) or halted at a gate (checked on the next /change-resume).
    if (url.pathname === "/change-stop") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405);
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      if (!runId) return json({ error: "pass runId via POST body" }, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/stop/${runId}`, "1", { expirationTtl: 600 });
      return json({ ok: true });
    }

    if (url.pathname === "/change-resume") {
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      if (!runId) return json({ error: "pass ?runId=<id>" }, 400);
      if (!(await verifyResumeAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid or already-consumed resume ticket" }, 403);
      return handleChangeResume(env, runId);
    }

    if (url.pathname === "/change-history") {
      return handleChangeHistory(env);
    }

    if (url.pathname === "/change-answer") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405);
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      const answer = typeof payload.answer === "string" ? payload.answer : null;
      if (!runId || answer === null) return json({ error: "pass runId & answer via POST body" }, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/answer/${runId}`, JSON.stringify({ answer }), { expirationTtl: 600 });
      const resumeTicket = await createResumeTicket(runId);
      return json({ ok: true, resumeTicket });
    }

    // FINISH.md chunk 7: the third Gate 1 action -- reply in free text
    // instead of approve/reject. checkAnswer (changePipeline.ts) reads this
    // same {answer} shape; re-used rather than inventing a parallel one.
    if (url.pathname === "/change-plan-reply") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405);
      const payload = await readDecisionPayload(request, url);
      const runId = typeof payload.runId === "string" ? payload.runId : null;
      const reply = typeof payload.reply === "string" ? payload.reply : (typeof payload.answer === "string" ? payload.answer : null);
      if (!runId || reply === null) return json({ error: "pass runId & reply via POST body" }, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/plan-reply/${runId}`, JSON.stringify({ answer: reply }), { expirationTtl: 600 });
      const resumeTicket = await createResumeTicket(runId);
      return json({ ok: true, resumeTicket });
    }

    if (url.pathname === "/change-instructions") {
      return json({ instructions: await loadInstructions(env.SPEND_KV) });
    }

    if (url.pathname === "/spend-counter-selftest") {
      // Free, real concurrency proof for the atomic spend counter (FINISH.md
      // section 5) -- fires N reserve() calls concurrently (Promise.all,
      // not sequential awaits) against a throwaway-named DO instance
      // (never "global", so this can never touch real spend tracking) and
      // checks that every single one was individually accounted for with
      // no lost update. A KV-backed check-then-record version of this same
      // test would show lost updates under real concurrency; a Durable
      // Object's one-request-at-a-time-per-instance guarantee (Cloudflare's
      // platform behavior, not code this file writes) is what prevents it.
      const n = Math.min(50, parseInt(url.searchParams.get("n") ?? "20", 10));
      const perCallUsd = 0.001;
      const testId = `selftest-${crypto.randomUUID()}`;
      const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName(testId));
      const caps = { dailyCapUsd: 1000, weeklyCapUsd: 1000, monthlyCapUsd: 1000 }; // effectively unbounded -- this test is about lost updates, not cap enforcement
      const results = await Promise.all(
        Array.from({ length: n }, () =>
          stub.fetch("https://spend-counter/reserve", { method: "POST", body: JSON.stringify({ estimateUsd: perCallUsd, caps }) }).then((r) => r.json() as Promise<{ ok: boolean }>),
        ),
      );
      const statusRes = await stub.fetch("https://spend-counter/status");
      const status = (await statusRes.json()) as { dailySpentUsd: number };
      const succeeded = results.filter((r) => r.ok).length;
      const expectedTotal = succeeded * perCallUsd;
      const noLostUpdates = Math.abs(status.dailySpentUsd - expectedTotal) < 1e-9;
      return json({ n, succeeded, expectedTotalUsd: expectedTotal, actualTotalUsd: status.dailySpentUsd, noLostUpdates, verdict: noLostUpdates ? "PASS -- every concurrent reservation was accounted for" : "FAIL -- a concurrent reservation was lost" });
    }

    if (url.pathname === "/world-source") {
      let source: string | null = null;
      if (env.SPEND_COUNTER) {
        try {
          const id = env.SPEND_COUNTER.idFromName("global");
          const stub = env.SPEND_COUNTER.get(id);
          const res = await stub.fetch("https://spend-counter.internal/get-source");
          if (res.ok) {
            const data = (await res.json()) as { source: string | null };
            source = data.source;
          } else {
            return new Response("Service Unavailable: coordinator failed to yield authoritative source", { status: 503 });
          }
        } catch {
          return new Response("Service Unavailable: source coordinator unreachable", { status: 503 });
        }
      } else {
        // Fallback strictly for test harness when SPEND_COUNTER binding is deliberately absent
        source = (await env.SPEND_KV.get("sim/current-source")) ?? SIM_BASELINE_SOURCE;
      }
      if (!source) {
        source = SIM_BASELINE_SOURCE;
      }
      const trimmed = source.trim();
      return new Response(`${trimmed}\n\nexport { initialWorld, chooseAction, applyAction, tick };\n`, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "x-frame-options": "SAMEORIGIN",
        },
      });
    }

    if (url.pathname === "/sim-selftest") {
      let source: string | null = null;
      if (env.SPEND_COUNTER) {
        try {
          const id = env.SPEND_COUNTER.idFromName("global");
          const stub = env.SPEND_COUNTER.get(id);
          const res = await stub.fetch("https://spend-counter.internal/get-source");
          if (res.ok) {
            const data = (await res.json()) as { source: string | null };
            source = data.source;
          } else {
            return jsonError("service_unavailable", "coordinator failed to yield authoritative source", 503);
          }
        } catch (e) {
          return jsonError("service_unavailable", `source coordinator unreachable: ${(e as Error).message || "network error"}`, 503);
        }
      } else {
        source = (await env.SPEND_KV.get("sim/current-source")) ?? SIM_BASELINE_SOURCE;
      }
      if (!source) {
        source = SIM_BASELINE_SOURCE;
      }
      const outcome = await runSimTests(env.LOADER, source, SIM_REGRESSION_SUITE, `sim-selftest-${crypto.randomUUID()}`);
      return json({ ...outcome, passed: outcome.results.filter((r) => r.pass).length, total: outcome.results.length });
    }

    return json({ error: "not found" }, 404);
  },
};
