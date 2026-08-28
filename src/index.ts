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
import { runChangePipeline, loadInstructions, type ChangeEvent } from "./changePipeline";
import {
  getPipelineBudgetStatus,
  checkInputGuard,
  assertUnderPipelineRateLimit,
  recordPipelineRateLimitHit,
  tryLeaseActiveRun,
  releaseActiveRun,
  PipelineLimitError,
} from "./controlLayer";

export interface Env {
  LOADER: LoaderBinding;
  SPEND_KV: KVNamespace;
  SPEND_CAP_USD: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  ASSETS: Fetcher;
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
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
    if (e instanceof RateLimitExceededError) return json({ error: e.message }, 429);
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
  try {
    await tryLeaseActiveRun(env.SPEND_KV, runId);
  } catch (e) {
    if (e instanceof PipelineLimitError) return json({ error: e.message }, 429);
    throw e;
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event: string, data: unknown) => writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

  (async () => {
    try {
      send("runId", { runId });
      const onEvent = (e: ChangeEvent) => send(e.type, e);
      await runChangePipeline(env, runId, changeRequest, onEvent);
      send("done", { runId });
    } catch (e) {
      send("error", { message: String((e as Error)?.message ?? e) });
    } finally {
      await releaseActiveRun(env.SPEND_KV, runId);
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
  });
}

async function handleChangeResume(env: Env, runId: string): Promise<Response> {
  const stateRaw = await env.SPEND_KV.get(`change/state/${runId}`);
  if (!stateRaw) return json({ error: `no halted run found for runId "${runId}" -- it may have already finished, or never existed` }, 404);
  const changeRequest = (JSON.parse(stateRaw) as { changeRequest: string }).changeRequest;
  return handleChangeRun(env, changeRequest, runId);
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
          "GET /change-run?request=<text>": "CALIPER v2 (BUILD-V2.md): plan -> implement -> verify -> review -> ship, one call per stage-boundary",
          "GET /change-resume?runId=<id>": "continue a halted change run after a real decision/answer has been posted",
          "GET /change-plan-decision?runId=<id>&approve=true|false": "resolve the plan gate",
          "GET /change-review-decision?runId=<id>&approve=true|false": "resolve the review gate",
          "GET /change-answer?runId=<id>&answer=<text>": "answer a plan-mode clarifying question",
          "GET /sim-selftest": "run the regression suite against the current sim source",
          "GET /change-instructions": "the accumulated lessons file, fed into plan/implement/review/fix prompts on future runs",
        },
        availableTasks: TASKS.map((t) => t.id),
        availableModels: MODELS,
      });
    }

    if (url.pathname === "/tasks") {
      return json(TASKS.map((t) => ({ id: t.id, title: t.title, hiddenTestCount: t.hiddenTests.length })));
    }

    if (url.pathname === "/run") {
      const taskId = url.searchParams.get("task");
      if (!taskId) return json({ error: "pass ?task=<id>", availableTasks: TASKS.map((t) => t.id) }, 400);
      const model = url.searchParams.get("model") ?? MODELS[0];
      return handleRun(env, taskId, model, clientIp(request));
    }

    if (url.pathname === "/live-run") {
      const taskId = url.searchParams.get("task");
      const model = url.searchParams.get("model") ?? MODELS[0];
      if (!taskId) return json({ error: "pass ?task=<id>&model=<id>" }, 400);
      return handleLiveRun(env, taskId, model, clientIp(request));
    }

    if (url.pathname === "/matrix-run") {
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
      return json(await getPipelineBudgetStatus(env.SPEND_KV));
    }

    if (url.pathname === "/change-run") {
      const request_ = url.searchParams.get("request");
      if (!request_) return json({ error: "pass ?request=<text>" }, 400);
      // The only path where a visitor controls raw input, so the only one
      // that gets attacked -- checked first, before it can consume a
      // per-IP rate-limit slot on a request that should never have counted.
      const guard = checkInputGuard(request_);
      if (!guard.ok) return json({ error: `Request rejected: ${guard.reason}` }, 400);
      // Only a fresh run counts against the per-IP daily limit -- resuming
      // an already-started run (/change-resume) isn't a second live run.
      const unlocked = !!env.UNLOCK_CODE && url.searchParams.get("k") === env.UNLOCK_CODE;
      const ip = clientIp(request);
      if (!unlocked) {
        try {
          await assertUnderPipelineRateLimit(env.SPEND_KV, ip);
        } catch (e) {
          if (e instanceof PipelineLimitError) return json({ error: e.message }, 429);
          throw e;
        }
        await recordPipelineRateLimitHit(env.SPEND_KV, ip);
      }
      return handleChangeRun(env, request_);
    }

    if (url.pathname === "/change-plan-decision") {
      const runId = url.searchParams.get("runId");
      const approve = url.searchParams.get("approve") === "true";
      if (!runId) return json({ error: "pass ?runId=<id>&approve=true|false" }, 400);
      await env.SPEND_KV.put(`change/plan-decision/${runId}`, JSON.stringify({ approve }), { expirationTtl: 600 });
      return json({ ok: true });
    }

    if (url.pathname === "/change-review-decision") {
      const runId = url.searchParams.get("runId");
      const approve = url.searchParams.get("approve") === "true";
      if (!runId) return json({ error: "pass ?runId=<id>&approve=true|false" }, 400);
      await env.SPEND_KV.put(`change/review-decision/${runId}`, JSON.stringify({ approve }), { expirationTtl: 600 });
      return json({ ok: true });
    }

    if (url.pathname === "/change-resume") {
      const runId = url.searchParams.get("runId");
      if (!runId) return json({ error: "pass ?runId=<id>" }, 400);
      return handleChangeResume(env, runId);
    }

    if (url.pathname === "/change-answer") {
      const runId = url.searchParams.get("runId");
      const answer = url.searchParams.get("answer");
      if (!runId || answer === null) return json({ error: "pass ?runId=<id>&answer=<text>" }, 400);
      await env.SPEND_KV.put(`change/answer/${runId}`, JSON.stringify({ answer }), { expirationTtl: 600 });
      return json({ ok: true });
    }

    if (url.pathname === "/change-instructions") {
      return json({ instructions: await loadInstructions(env.SPEND_KV) });
    }

    if (url.pathname === "/sim-selftest") {
      const source = (await env.SPEND_KV.get("sim/current-source")) ?? SIM_BASELINE_SOURCE;
      // Worker Loader's loader.get(id, getCode) only calls getCode on a
      // cache miss for that id -- a fixed id here would mean every call
      // after the first silently re-serves whichever source built the
      // first-ever isolate, no matter what sim/current-source says by the
      // time of a later call. Found by actually hitting this repeatedly
      // with different KV contents and getting the same stale result each
      // time. A unique id per call means a self-test is always live.
      const outcome = await runSimTests(env.LOADER, source, SIM_REGRESSION_SUITE, `sim-selftest-${crypto.randomUUID()}`);
      return json({ ...outcome, passed: outcome.results.filter((r) => r.pass).length, total: outcome.results.length });
    }

    return json({ error: "not found" }, 404);
  },
};
