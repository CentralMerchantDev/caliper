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
import { runChangePipeline, loadInstructions, deriveHistoryReason, recordPlanDecision, type ChangeEvent, type ChangeRecord } from "./changePipeline";
import {
  getPipelineBudgetStatus,
  checkInputGuard,
  claimPipelineRun,
  refundPipelineRun,
  pipelineAvailability,
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
  // CSP with an explicit script-src.
  //
  // There was no script-src, so scripts inherited default-src -- which includes
  // 'unsafe-eval', data: and blob:. For a project whose pitch is verification
  // before shipping, that is the first header a security-minded reader checks.
  //
  // 'unsafe-inline' stays: the page's own logic is inline and moving it out is
  // a real refactor, not a header change. 'unsafe-eval', data: and blob: are
  // gone from script-src, and object-src/base-uri are locked down, which closes
  // the cheap injection routes without pretending the page is stricter than it
  // is.
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' https://datum.markfrasertoronto.workers.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-ancestors 'self';",
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
    // THE WARM RUN WAS EXECUTED AND THEN IGNORED.
  //
  // `judge(cold)` only. The warm run costs the same CPU this endpoint is
  // auth-gated for, and it is the one that tests isolate REUSE -- whether state
  // carries between invocations, which is the more interesting failure. Both are
  // judged now, and a probe only counts as held if it held BOTH times.
  const held = probe.judge(cold) && probe.judge(warm);
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
async function handleChangeRun(env: Env, changeRequest: string, existingRunId?: string, ctx?: ExecutionContext): Promise<Response> {
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

  // Three consecutive misses at a 15 s heartbeat is 45 s of a lease that lasts
  // minutes -- long enough to be a real outage, short enough to abort before it
  // expires underneath us.
  const MAX_RENEWAL_FAILURES = 3;
  let renewalFailures = 0;
  let leaseLost = false;
  // WHY the lease was lost, which decides whether the slot is ours to release.
  //
  // These were one flag, and the finally block below skipped releaseActiveRun
  // whenever it was set. But it is set for two completely different reasons:
  //   * the DO said `renewed: false` -- a SUCCESSOR owns the slot now, and
  //     releasing would take it away from them. Correct not to release.
  //   * an HTTP error or a network blip -- we simply could not ASK. The lease
  //     is still ours, and not releasing leaks a concurrency slot for the full
  //     lease TTL. At MAX_CONCURRENT_PIPELINE_RUNS that is a self-inflicted
  //     lockout caused by one dropped request.
  let leaseSuperseded = false;
  let leaseAbortError: string | null = null;

  // Periodic heartbeat & lease renewal: extends active lease every 15s while actively executing
  const heartbeatTimer = setInterval(async () => {
    writer.write(encoder.encode(`: keep-alive\n\n`)).catch(() => {});
    if (env.SPEND_COUNTER && leaseToken && !leaseLost) {
      try {
        const id = env.SPEND_COUNTER.idFromName("global");
        const stub = env.SPEND_COUNTER.get(id);
        const res = await stub.fetch("https://spend-counter.internal/renew-lease", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId, leaseToken, extensionSec: 600 }),
        });
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; renewed: boolean };
          if (!data.renewed) {
            // Genuinely gone: someone else holds the slot.
            leaseLost = true;
            leaseSuperseded = true;
            leaseAbortError = "Run lease expired or concurrency slot was acquired by a successor";
            clearInterval(heartbeatTimer);
          } else {
            renewalFailures = 0;
          }
        } else {
          // TRANSIENT. One dropped request should not kill a run that is
          // otherwise healthy -- the heartbeat fires every 15 s and the lease
          // lasts minutes, so there is room to try again.
          renewalFailures++;
          if (renewalFailures >= MAX_RENEWAL_FAILURES) {
            leaseLost = true;
            leaseAbortError = `Lease renewal failed ${renewalFailures}x: HTTP ${res.status}`;
            clearInterval(heartbeatTimer);
          }
        }
      } catch (err) {
        renewalFailures++;
        if (renewalFailures >= MAX_RENEWAL_FAILURES) {
          leaseLost = true;
          leaseAbortError = `Lease coordinator unreachable ${renewalFailures}x: ${String((err as Error)?.message ?? err)}`;
          clearInterval(heartbeatTimer);
        }
      }
    }
  }, 15_000);

  const pipelineTask = (async () => {
    try {
      send("runId", { runId, controlToken });
      const onEvent = (e: ChangeEvent) => {
        if (leaseLost) {
          throw new Error(leaseAbortError || "Run lease lost during pipeline execution");
        }
        send(e.type, e);
      };
      await runChangePipeline(env, runId, changeRequest, onEvent, leaseToken ?? null);
      if (leaseLost) {
        throw new Error(leaseAbortError || "Run lease lost before completion");
      }
      send("done", { runId });
    } catch (e) {
      send("error", { message: String((e as Error)?.message ?? e) });
    } finally {
      clearInterval(heartbeatTimer);
      // Release unless a SUCCESSOR owns the slot. If we merely could not reach
      // the coordinator, the lease is still ours and holding it would lock the
      // slot out for its full TTL over a dropped request.
      if (!leaseSuperseded) {
        await releaseActiveRun(env.SPEND_KV, runId, env.SPEND_COUNTER, leaseToken ?? undefined)
          .catch(() => {});
      }
      await writer.close().catch(() => {});
    }
  })();

  // KEEP THE RUN ALIVE IF THE VISITOR LEAVES.
  //
  // The pipeline runs in a floating promise attached to this SSE stream. Close
  // the tab mid-run and the runtime is entitled to cancel the request context:
  // the catch block that writes the resumable `errored` checkpoint never
  // executes, and the concurrency lease is never released. A paid run
  // evaporates with no record -- exactly the loss the checkpointing was built
  // to prevent. waitUntil is the standard way to say "this work outlives the
  // response", and it should have been here from the start.
  if (ctx) ctx.waitUntil(pipelineTask);


  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "SAMEORIGIN",
      "content-security-policy": SECURITY_HEADERS["content-security-policy"],
    },
  });
}

async function handleChangeResume(env: Env, runId: string, ctx?: ExecutionContext): Promise<Response> {
  // The kill switch was checked inline in the /change-run branch only, so
  // LIVE_RUN_ENABLED=false stopped new runs while every halted run in KV could
  // still be resumed and keep spending -- for up to a week, the state TTL. A
  // switch that disables some of the spending is not a kill switch.
  if (!liveRunsEnabled(env)) return liveRunsDisabledResponse();
  const stateRaw = await env.SPEND_KV.get(`change/state/${runId}`);
  if (!stateRaw) return json({ error: `no halted run found for runId "${runId}" -- it may have already finished, or never existed` }, 404);
  const changeRequest = (JSON.parse(stateRaw) as { changeRequest: string }).changeRequest;
  return handleChangeRun(env, changeRequest, runId, ctx);
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
/** Thrown when a caller passes the unlock code in the URL. See isAuthorizedSecret. */
class QuerySecretRejected extends Error {
  constructor() {
    super("Pass the unlock code as `Authorization: Bearer <code>` or `X-Unlock-Code: <code>`. It is no longer accepted as ?k= because query strings are written to edge logs, browser history, and Referer headers.");
  }
}

async function handleChangeHistory(env: Env): Promise<Response> {
  // KV list() is paginated at 1000 keys and this took page one and stopped, so
  // the "complete" changelog silently truncated. Follow the cursor.
  const keys: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const list = await env.SPEND_KV.list({ prefix: "changelog/", cursor });
    for (const k of list.keys) keys.push(k.name);
    if (list.list_complete) break;
    cursor = list.cursor;
  }
  const entries: { date: string; summary: string | null; outcome: string; reason: string }[] = [];
  // In parallel. handleMatrixResults fixed exactly this and left a comment
  // about the 74 seconds it used to take; the same loop here was never
  // changed, and it is the one a visitor actually clicks.
  const raws = await Promise.all(keys.map((name) => env.SPEND_KV.get(name)));
  for (const raw of raws) {
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
  // A bare list of rows makes three failures look like the whole story and a
  // hundred successes look like nothing. Say what the record actually is --
  // including, plainly, when it is mostly failures.
  const tally: Record<string, number> = {};
  for (const e of entries) tally[e.outcome] = (tally[e.outcome] ?? 0) + 1;
  return json({
    note: entries.length === 0
      ? "No public runs recorded yet. The recorded run on the main page shows the pipeline end to end."
      : `${entries.length} public run(s) recorded, every one of them, including the ones that failed. This log is not filtered.` +
        (entries.length > 200 ? ` The 200 most recent are returned below.` : ""),
    totals: tally,
    entries: entries.slice(0, 200),
  });
}

/**
 * THE WORKER HAD NO TOP-LEVEL CATCH.
 *
 * Any throw that escaped a route -- QuerySecretRejected, an unguarded
 * JSON.parse on a malformed stored record, a null deref in a history entry --
 * left the runtime to answer with a bare, unstyled 500 and no body. The
 * carefully written message on QuerySecretRejected ("pass the unlock code as a
 * header, not ?k=, because query strings are written to edge logs") was
 * delivered to nobody but `wrangler tail`.
 *
 * A page arguing that a system should say what happened cannot answer "500".
 * Routes live in handleRequest; this wraps it, maps the errors it recognises to
 * real status codes with real explanations, and gives everything else a
 * generic 500 body that does not leak internals.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handleRequest(request, env, ctx);
    } catch (err) {
      if (err instanceof QuerySecretRejected) {
        return jsonError("query_secret_rejected", err.message, 400);
      }
      if (err instanceof PipelineLimitError) {
        return jsonError(err.kind, err.message, 429);
      }
      // Deliberately generic to the caller, specific to the log: an error
      // message is a fine place to leak a KV key name or a stack.
      console.error("unhandled error in fetch:", err);
      return jsonError(
        "internal_error",
        "Something failed on the server and was not handled. Nothing was shipped and nothing was charged.",
        500,
      );
    }
  },
};

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
      // ?k=<secret> USED TO BE ACCEPTED HERE AND NO LONGER IS.
      //
      // A secret in a query string is written to Cloudflare's request logs, to
      // any intermediary's logs, to the browser's history, and to the Referer
      // header of anything the page subsequently loads. The two header forms
      // above are equivalent in convenience and none of that is true of them.
      // Rejected explicitly, with a message, rather than quietly failing.
      if (urlObj.searchParams.get("k")) {
        throw new QuerySecretRejected();
      }
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
      // AUTH REQUIRED. This runs all five sandbox-escape probes twice, cold and
      // warm -- ten Dynamic Worker invocations including memory-balloon and
      // deep-recursion at cpuMs 10000 -- and runRawScriptInSandbox
      // deliberately has NO wall-clock abort (see sandbox.ts, which explains
      // why). So one anonymous GET could hold this Worker for tens of seconds,
      // and a loop of them is a self-funded denial of service billed to me.
      // The results are interesting; paying an unbounded stranger to recompute
      // them on demand is not.
      if (!(await isAuthorizedSecret(request, url))) {
        return jsonError("unauthorized", "This endpoint executes sandbox probes and costs real CPU. Authorize with an Authorization: Bearer header.", 403);
      }
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

    if (url.pathname === "/recent-runs") {
      // The last run that shipped and the last that did not, whichever they
      // currently are. Both real, both replaceable by the next run of that
      // kind. Falls back to nothing rather than to a fabricated example.
      const [shipped, refused] = await Promise.all([
        env.SPEND_KV.get("replay/last-shipped"),
        env.SPEND_KV.get("replay/last-refused"),
      ]);
      return json({
        shipped: shipped ? JSON.parse(shipped) : null,
        refused: refused ? JSON.parse(refused) : null,
      });
    }

    if (url.pathname === "/live-status") {
      // Reports WHY, not just whether -- see pipelineAvailability. Read-only:
      // asking this question must never consume one of the visitor's runs.
      const enabled = liveRunsEnabled(env);
      // A deployment without the loader binding cannot verify anything, so it
      // cannot honestly run the pipeline at all. Say so at the top rather than
      // letting someone start a run that is guaranteed to refuse.
      const sandboxAvailable = !!env.LOADER && typeof (env.LOADER as { get?: unknown }).get === "function";
      const avail = await pipelineAvailability(env, clientIp(request));
      return json({
        enabled,
        sandboxAvailable,
        ok: enabled && sandboxAvailable && avail.ok,
        reason: !sandboxAvailable ? "sandbox-unavailable" : !enabled ? "live-runs-off" : avail.reason,
        detail: !sandboxAvailable
          ? "The verification sandbox is not available on this deployment, so no change can be checked -- and this system does not ship anything it has not checked. Previous real runs are below."
          : !enabled
            ? "Live runs are switched off right now. Previous real runs are below."
            : avail.detail,
        runsUsed: avail.runsUsed,
        runsLimit: avail.runsLimit,
        dailyRemainingUsd: Number(avail.dailyRemainingUsd.toFixed(4)),
      });
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
      // DENIAL OF BUDGET.
      //
      // This is a GET that spends real money, and nothing checked where the
      // request came from. Any third-party page could embed
      // <img src="https://.../change-run?request=..."> and every visitor to it
      // would silently start a run against our daily cap. A handful of views
      // empties the day's budget and the public demo shows "budget used up"
      // until midnight, repeatable daily, from a page we do not control.
      //
      // Sec-Fetch-Site is sent by every current browser and cannot be forged
      // by page JavaScript. Absent (curl, an older client) is allowed through
      // so the endpoint stays usable by hand; what is refused is a browser
      // telling us plainly that another site caused this.
      const fetchSite = request.headers.get("sec-fetch-site");
      if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
        return jsonError("cross_site_blocked", "change runs cannot be started from another site", 403);
      }
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
      // Same rule as isAuthorizedSecret: the code travels in a header, never in
      // the URL, because a query string ends up in edge logs and browser
      // history. This is the rate-limit bypass, so it is exactly the value an
      // attacker most wants to harvest from a log.
      const unlockHeader = request.headers.get("x-unlock-code")
        ?? (request.headers.get("authorization")?.startsWith("Bearer ")
          ? request.headers.get("authorization")!.slice(7).trim()
          : null);
      const unlocked = !!env.UNLOCK_CODE && !!unlockHeader && (await timingSafeCompare(unlockHeader, env.UNLOCK_CODE));
      const ip = clientIp(request);
      if (!unlocked) {
        try {
          // one atomic claim, not a read-then-write
          await claimPipelineRun(env, ip);
        } catch (e) {
          if (e instanceof PipelineLimitError) return jsonError("rate_limit_exceeded", e.message, 429);
          throw e;
        }
      }
      // If the run cannot actually start -- concurrency, say -- give the claim
      // back. It was being spent before the lease was even attempted, so three
      // visitors arriving together burned a run each and were told about a
      // daily limit that was not the reason they were refused.
      const started = await handleChangeRun(env, request_, undefined, ctx);
      if (!unlocked && started.status === 429) {
        await refundPipelineRun(env, ip);
      }
      return started;
    }

    // Parse decision body: accept POST JSON body with query param fallback
    async function readDecisionPayload(req: Request, urlObj: URL): Promise<Record<string, unknown>> {
      const out: Record<string, unknown> = {};
      // Query params are applied FIRST so that a signed POST body wins. They
      // used to be applied last and silently overrode the body -- an attacker
      // who could get a decision URL loaded could override the signed values
      // with their own.
      urlObj.searchParams.forEach((v, k) => { out[k] = v; });
      if (req.method === "POST" || req.method === "PUT") {
        try {
          const body = (await req.json()) as Record<string, unknown>;
          if (body && typeof body === "object") Object.assign(out, body);
        } catch {}
      }
      return out;
    }

    async function createResumeTicket(runId: string): Promise<string> {
      if (!env.SPEND_COUNTER) {
        throw new Error("SPEND_COUNTER Durable Object binding required for atomic single-use resume tickets");
      }
      const id = env.SPEND_COUNTER.idFromName("global");
      const stub = env.SPEND_COUNTER.get(id);
      const res = await stub.fetch("https://spend-counter.internal/create-resume-ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, ttlSec: 90 }),
      });
      if (!res.ok) {
        throw new Error(`Durable Object failed to create resume ticket: HTTP ${res.status}`);
      }
      const data = (await res.json()) as { ok: boolean; ticket: string };
      return data.ticket;
    }

    async function verifyResumeAuth(_req: Request, runId: string, payload: Record<string, unknown>): Promise<boolean> {
      const ticket = (typeof payload.ticket === "string" ? payload.ticket : null) ||
        (typeof payload.resumeTicket === "string" ? payload.resumeTicket : null);
      if (!ticket) {
        return false; // Strictly fail-closed: /change-resume requires single-use ticket
      }
      if (!env.SPEND_COUNTER) {
        return false; // Strictly fail-closed: requires atomic Durable Object coordinator
      }
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
      await recordPlanDecision(
        env.SPEND_KV,
        runId,
        approve,
        payload.acknowledgeFalsePremise === true || payload.acknowledgeFalsePremise === "true",
      );
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
      return handleChangeResume(env, runId, ctx);
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
      // The input guard was applied on ?request= and nowhere else, so this
      // path -- which is concatenated straight into the plan prompt -- took
      // unbounded text with no length limit and no pattern checks at all.
      const answerGuard = checkInputGuard(answer);
      if (!answerGuard.ok) return jsonError("request_rejected", answerGuard.reason, 400);
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
      // Same hole as /change-answer: free text into the plan prompt, ungated.
      const replyGuard = checkInputGuard(reply);
      if (!replyGuard.ok) return jsonError("request_rejected", replyGuard.reason, 400);
      if (!(await verifyRunAuth(request, runId, payload))) return json({ error: "Unauthorized: invalid control token for run" }, 403);
      await env.SPEND_KV.put(`change/plan-reply/${runId}`, JSON.stringify({ answer: reply }), { expirationTtl: 600 });
      const resumeTicket = await createResumeTicket(runId);
      return json({ ok: true, resumeTicket });
    }

    if (url.pathname === "/change-instructions") {
      return json({ instructions: await loadInstructions(env.SPEND_KV) });
    }

    if (url.pathname === "/spend-counter-selftest") {
      // AUTH REQUIRED. Up to 50 Durable Object writes per request, and it used
      // to mint a BRAND NEW DO instance per call whose storage was never
      // deleted -- unbounded durable storage growth from an anonymous GET.
      if (!(await isAuthorizedSecret(request, url))) {
        return jsonError("unauthorized", "This endpoint performs Durable Object writes. Authorize with an Authorization: Bearer header.", 403);
      }
      // Free, real concurrency proof for the atomic spend counter (FINISH.md
      // section 5) -- fires N reserve() calls concurrently (Promise.all,
      // not sequential awaits) against a throwaway-named DO instance
      // (never "global", so this can never touch real spend tracking) and
      // checks that every single one was individually accounted for with
      // no lost update. A KV-backed check-then-record version of this same
      // test would show lost updates under real concurrency; a Durable
      // Object's one-request-at-a-time-per-instance guarantee (Cloudflare's
      // platform behavior, not code this file writes) is what prevents it.
      // A SELF-TEST THAT RAN NOTHING REPORTED PASS.
      //
      // parseInt("abc") is NaN; Math.min(50, NaN) is NaN; Array.from({length:
      // NaN}) is []. So ?n=abc fired zero reservations and the endpoint replied
      // "PASS -- every concurrent reservation was accounted for", because
      // 0 === 0. Same for n=0 and n=-5. This endpoint is publicly linked as the
      // proof that the spend cap cannot be raced, so a vacuous PASS from it is
      // precisely the failure this project exists to refuse -- claiming a
      // verification that never happened.
      const nRaw = parseInt(url.searchParams.get("n") ?? "20", 10);
      if (!Number.isFinite(nRaw) || nRaw < 1) {
        return jsonError("bad_request", `n must be a positive integer (got ${JSON.stringify(url.searchParams.get("n"))})`, 400);
      }
      const n = Math.min(50, nRaw);
      const perCallUsd = 0.001;
      // ONE reusable instance, not a new one per call. This was
      // `selftest-${crypto.randomUUID()}`, which minted a fresh Durable Object
      // on every request and never deleted its storage -- so repeated calls
      // grew durable storage without bound. The test is about lost updates
      // under concurrency, which a single dedicated instance demonstrates
      // exactly as well.
      const testId = "selftest-fixed";
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
      // SAY WHICH WORLD THIS IS.
      //
      // Falling back to the baseline here is correct -- a null source means
      // nothing has been published yet, so the baseline IS the live world --
      // but doing it silently is not. city-live-world.js goes to real trouble
      // to avoid substituting the baseline without saying so, and then this
      // endpoint substituted it for them, invisibly. A header costs nothing
      // and means the client can tell the difference.
      const isBaseline = !source;
      if (!source) {
        source = SIM_BASELINE_SOURCE;
      }
      const trimmed = source.trim();
      return new Response(`${trimmed}\n\nexport { initialWorld, chooseAction, applyAction, tick };\n`, {
        headers: {
          "x-world-source": isBaseline ? "baseline-nothing-published-yet" : "published",
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "x-frame-options": "SAMEORIGIN",
        },
      });
    }

    if (url.pathname === "/sim-selftest") {
      // AUTH REQUIRED: one Dynamic Worker invocation per request.
      if (!(await isAuthorizedSecret(request, url))) {
        return jsonError("unauthorized", "This endpoint runs the regression suite in a sandbox and costs real CPU. Authorize with an Authorization: Bearer header.", 403);
      }
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
}
