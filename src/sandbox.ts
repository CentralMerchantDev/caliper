import type { SandboxRunner, SandboxRunOptions, SandboxRunResult, Task, TestResult } from "./types";

// Minimal local typings for the Worker Loader (Dynamic Workers) binding.
// Named distinctly from anything @cloudflare/workers-types might declare
// globally, so there's no risk of colliding with an upstream type as the
// beta stabilizes.
export interface LoaderWorkerCode {
  compatibilityDate: string;
  compatibilityFlags?: string[];
  mainModule: string;
  modules: Record<string, string>;
  env: Record<string, unknown>;
  globalOutbound: unknown | null;
  limits?: { cpuMs?: number; subRequests?: number };
}

export interface LoaderEntrypointHandle {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface LoaderWorkerStub {
  getEntrypoint(name?: string, options?: { props?: Record<string, unknown> }): LoaderEntrypointHandle;
}

export interface LoaderBinding {
  get(id: string, getCode: () => Promise<LoaderWorkerCode>): LoaderWorkerStub;
}

/** Serializes a JS value as a JS *source* literal (not JSON) so NaN,
 * Infinity, and undefined survive being embedded directly into the
 * generated module's source text. Plain JSON.stringify would turn NaN
 * into null and drop undefined entirely. */
function toJsLiteral(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(toJsLiteral).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${toJsLiteral(v)}`).join(",")}}`;
  }
  throw new Error(`Cannot serialize a value of type ${typeof value} into the sandbox test harness`);
}

// Shared by both harness builders below. `__genArgs` synthesizes large
// inputs (e.g. thousands of audio samples) from a tiny description instead
// of serializing a huge literal -- computed here, inside the trusted
// harness, from author-written test data only (never model- or
// visitor-influenced). `__deepEqual`/`__judge` implement the extended
// TestCase kinds (tolerance, acceptedAny) alongside plain equality.
const TEST_HELPERS_JS = `
// =============================================================================
// THE SAME HARDENING simSandbox.ts HAS, WHICH THIS HARNESS DID NOT.
//
// simSandbox.ts documents at length why the judge must not be reachable from
// the dock, and captures its intrinsics above the splice point. That reasoning
// applies here identically and was never applied here. Two working forgeries,
// both demonstrated against this exact template:
//
//   * __deepEqual began with a call to the LIVE Object.is, so reassigning
//     Object.is to () => true made every hidden test compare equal -- it
//     reported 3/3 on a solve() that returns undefined.
//
//   * __runTests / __judge / __deepEqual are hoisted FUNCTION DECLARATIONS,
//     which are mutable bindings, spliced AFTER the model's code. And the
//     model's output is interpolated as a raw function body, so it can close
//     the function and reach module top level:
//         } Object.is = () => true; function __pad(){
//
// This matters even though /run and /matrix-run are auth-gated now, because
// /matrix-results is NOT, and the page links it as the project's raw results.
// Forged cells would be published as evidence.
const __is = Object.is;
const __keys = Object.keys;
const __isArray = Array.isArray;
const __abs = Math.abs;
const __stringify = JSON.stringify;
const __push = Function.prototype.call.bind(Array.prototype.push);
const __create = Object.create;
/** A record with no prototype, so no candidate-defined toJSON can rewrite it. */
function __record(obj) {
  const out = __create(null);
  for (const k of __keys(obj)) out[k] = obj[k];
  return out;
}

function __genArgs(t) {
  if (!t.gen) return t.args;
  if (t.gen.kind === "sine") {
    const { freq, sampleRate, n } = t.gen;
    const samples = new Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    return [samples, sampleRate];
  }
  return t.args;
}
function __deepEqual(a, b) {
  if (__is(a, b)) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (__isArray(a) || __isArray(b)) {
    if (!__isArray(a) || !__isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!__deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === "object") {
    const ak = __keys(a), bk = __keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) if (!__deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}
function __judge(t, actualFull) {
  const actual = t.pluck ? actualFull?.[t.pluck] : actualFull;
  if (t.acceptedAny) return t.acceptedAny.some((v) => __deepEqual(actual, v));
  if (typeof t.tolerance === "number") return typeof actual === "number" && Math.abs(actual - t.expected) <= t.tolerance;
  return __deepEqual(actual, t.expected);
}
async function __runTests(tests, fn) {
  const results = [];
  for (const t of tests) {
    try {
      const args = __genArgs(t);
      const actual = fn(...args);
      if (t.throws) {
        __push(results, __record({ name: t.name, pass: false, error: "expected the call to throw, but it returned " + __stringify(actual) }));
      } else {
        __push(results, __record({ name: t.name, pass: __judge(t, actual), actual, expected: t.expected }));
      }
    } catch (e) {
      if (t.throws) __push(results, __record({ name: t.name, pass: true }));
      else __push(results, __record({ name: t.name, pass: false, error: String((e && e.message) || e) }));
    }
  }
  return results;
}
`;

export function buildHarnessModule(code: string, task: Task): string {
  const testsLiteral = toJsLiteral(
    task.hiddenTests.map((t) => ({
      name: t.name,
      args: t.args,
      expected: t.expected,
      throws: t.throws ?? false,
      acceptedAny: t.acceptedAny,
      tolerance: t.tolerance,
      gen: t.gen,
      pluck: t.pluck,
    })),
  );

  // Everything below this point runs inside the Dynamic Worker: no
  // bindings (env: {}), no network (globalOutbound: null), CPU-capped.
  // `code` is model-generated and untrusted -- it only gets to define the
  // body of one function, called by name from the harness below it.
  // HELPERS FIRST, CANDIDATE SECOND.
  //
  // The candidate was spliced ABOVE the helpers, so every capture happened
  // after the model's code had already run at module scope -- which is the one
  // ordering that makes capturing pointless. simSandbox.ts gets this right and
  // says so; this file did the opposite. The model can still close its function
  // and reach module top level (it is a raw body interpolation, and validating
  // that is a separate problem), but by then __is, __push and the rest are
  // already bound to the real intrinsics.
  return `
${TEST_HELPERS_JS}
function ${task.functionName}(${task.paramNames.join(", ")}) {
${code}
}
const __tests = ${testsLiteral};

export default {
  async fetch() {
    const results = await __runTests(__tests, ${task.functionName});
    return new Response(__stringify(results), { headers: { "content-type": "application/json" } });
  },
};
`;
}

/**
 * Minimal stand-ins for the browser globals a real interactive artifact
 * touches, so its top-level script can execute headless without a DOM
 * instead of throwing before it even defines the function we need to test.
 * These are NOT a real DOM -- they make top-level wiring code (element
 * lookups, event listeners, an AudioContext) harmless no-ops rather than
 * crashes. They do not make DOM/Web Audio *behavior* verifiable; see
 * docs/REBUILD-PROPOSAL.md §2 for why that class of check runs client-side
 * in the visitor's real browser instead.
 */
const DOM_SHIM_JS = `
function __stubEl() {
  const target = function () {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "style") return __stubEl();
      if (prop === "classList") return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
      if (prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf") return () => "";
      return __stubEl();
    },
    set() { return true; },
    apply() { return __stubEl(); },
  });
}
const document = new Proxy({}, {
  get(_t, prop) {
    if (["getElementById", "querySelector", "createElement"].includes(prop)) return () => __stubEl();
    if (prop === "querySelectorAll") return () => [];
    if (prop === "addEventListener" || prop === "removeEventListener") return () => {};
    return __stubEl();
  },
});
class __StubAudioNode {
  connect() { return this; }
  disconnect() {}
  start() {}
  stop() {}
}
class AudioContext {
  constructor() { this.sampleRate = 44100; this.currentTime = 0; this.destination = new __StubAudioNode(); }
  createOscillator() { const n = new __StubAudioNode(); n.frequency = { value: 0, setValueAtTime() {} }; return n; }
  createAnalyser() { const n = new __StubAudioNode(); n.fftSize = 2048; n.frequencyBinCount = 1024; n.getFloatTimeDomainData = () => {}; n.getByteFrequencyData = () => {}; return n; }
  createGain() { const n = new __StubAudioNode(); n.gain = { value: 1, setValueAtTime() {} }; return n; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
const webkitAudioContext = AudioContext;
function requestAnimationFrame() { return 0; }
function cancelAnimationFrame() {}
const navigator = {};
const window = globalThis;
`;

function extractInlineScript(html: string): string {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return scripts.join("\n;\n");
}

function buildPresetHarnessModule(artifactHtml: string, task: Task): string {
  const script = extractInlineScript(artifactHtml);
  const testsLiteral = toJsLiteral(
    task.hiddenTests.map((t) => ({
      name: t.name,
      args: t.args,
      expected: t.expected,
      throws: t.throws ?? false,
      acceptedAny: t.acceptedAny,
      tolerance: t.tolerance,
      gen: t.gen,
      pluck: t.pluck,
    })),
  );
  const structuralLiteral = toJsLiteral(task.structuralChecks ?? []);

  // The artifact's own script runs largely as-is (untrusted, no bindings, no
  // network, CPU-capped, same as the plain-task path above) against the DOM
  // shim rather than a real browser -- this is what lets a full interactive
  // HTML/JS artifact's *pure logic* be checked server-side at all, per
  // docs/REBUILD-PROPOSAL.md §2. `${task.functionName}` must end up defined
  // on `window` (the artifact is instructed to do this explicitly) for any
  // of this to find it.
  return `
${DOM_SHIM_JS}
let __scriptError = null;
try {
${script}
} catch (e) {
  __scriptError = String((e && e.message) || e);
}
${TEST_HELPERS_JS}
const __tests = ${testsLiteral};
const __structuralChecks = ${structuralLiteral};
const __html = ${JSON.stringify(artifactHtml)};

export default {
  async fetch() {
    const results = [];
    for (const c of __structuralChecks) {
      results.push({ name: "structural: " + c.name, pass: new RegExp(c.pattern, "i").test(__html) });
    }
    ${
      !task.functionName
        ? `
    // Free-form path: no pre-authored function to call, so this is the
    // whole of "verify" -- did the artifact's own script run without
    // throwing (per docs/REBUILD-PROPOSAL.md, verification degrades to
    // execution plus review with no independently-authored ground truth).
    results.push({ name: "artifact script executes without throwing", pass: __scriptError === null, error: __scriptError || undefined });
    return new Response(__stringify(results), { headers: { "content-type": "application/json" } });
    `
        : ""
    }
    const fn = (typeof window !== "undefined" && window["${task.functionName}"]) || (typeof globalThis["${task.functionName}"] !== "undefined" && globalThis["${task.functionName}"]);
    if (typeof fn !== "function") {
      results.push({
        name: "exposes " + ${JSON.stringify(task.functionName)} + " on window",
        pass: false,
        error: __scriptError
          ? "artifact script threw before defining it: " + __scriptError
          : "window." + ${JSON.stringify(task.functionName)} + " is not a function after the script ran",
      });
      return new Response(__stringify(results), { headers: { "content-type": "application/json" } });
    }
    results.push({ name: "exposes " + ${JSON.stringify(task.functionName)} + " on window", pass: true });
    results.push(...(await __runTests(__tests, fn)));
    ${
      task.customVerification
        ? `
    try {
      ${task.customVerification.harnessCode}
      const custom = __custom(fn);
      results.push({ name: ${JSON.stringify(task.customVerification.name)}, pass: !!custom.pass, error: custom.detail });
    } catch (e) {
      results.push({ name: ${JSON.stringify(task.customVerification.name)}, pass: false, error: String((e && e.message) || e) });
    }
    `
        : ""
    }
    return new Response(__stringify(results), { headers: { "content-type": "application/json" } });
  },
};
`;
}

// Measured on the real edge (see README.md): cpuMs has a ~2-4s+ enforcement
// floor, so it cannot be trusted to bound latency. The parent imposes its
// own wall-clock abort on every real task-execution sandbox call instead --
// the isolate may keep burning CPU in the background after we give up on
// it, but the user-facing request stays bounded. This applies to
// DynamicWorkersSandbox.run() (the real execution path) only -- the
// deliberate attack probes in src/attacks.ts use runRawScriptInSandbox()
// directly and intentionally skip this, since their entire point is
// observing how long the runtime itself takes to intervene.
export const WALL_CLOCK_ABORT_MS = 3000;

const TIMEOUT = Symbol("sandbox-wall-clock-abort");

async function raceAbort<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout>;
  const abort = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), ms);
  });
  try {
    return await Promise.race([promise, abort]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Primary execution layer: Cloudflare Dynamic Workers (the Worker Loader
 * binding). Everything the rest of the app needs is behind SandboxRunner --
 * swapping to Workers for Platforms dispatch namespaces means writing a
 * second class with this same shape, not touching any caller.
 */
export class DynamicWorkersSandbox implements SandboxRunner {
  constructor(private loader: LoaderBinding) {}

  async run(code: string, task: Task, options: SandboxRunOptions): Promise<SandboxRunResult> {
    // `code` means two different things depending on tier: a bare function
    // body for the plain 32-task set, a full HTML/JS artifact for a preset.
    // Same interface, same isolation, different harness -- see
    // buildPresetHarnessModule for why presets need the DOM shim.
    const moduleSource = task.tier === "preset" ? buildPresetHarnessModule(code, task) : buildHarnessModule(code, task);
    const start = Date.now();
    try {
      const worker = this.loader.get(options.isolateId, async () => ({
        compatibilityDate: "2025-08-01",
        mainModule: "harness.js",
        modules: { "harness.js": moduleSource },
        env: {},
        globalOutbound: null,
        limits: { cpuMs: options.cpuMs, subRequests: 0 },
      }));

      const entrypoint = worker.getEntrypoint();
      const outcome = await raceAbort(entrypoint.fetch("http://sandbox/run"), WALL_CLOCK_ABORT_MS);
      const wallTimeMs = Date.now() - start;

      if (outcome === TIMEOUT) {
        return {
          results: [],
          wallTimeMs,
          fatalError: `wall-clock abort after ${WALL_CLOCK_ABORT_MS}ms (parent gave up waiting on the sandbox)`,
        };
      }
      if (!outcome.ok) {
        return { results: [], wallTimeMs, fatalError: `sandbox returned HTTP ${outcome.status}` };
      }
      const results = (await outcome.json()) as TestResult[];
      return { results, wallTimeMs };
    } catch (e) {
      const wallTimeMs = Date.now() - start;
      return { results: [], wallTimeMs, fatalError: String((e as Error)?.message ?? e) };
    }
  }
}

export interface RawScriptResult {
  /** True if the sandbox invocation completed at all (regardless of whether the script itself errored). */
  invoked: boolean;
  /** Return value of the script, if it completed without throwing. */
  result?: unknown;
  /** Error message, whether from the script throwing or the isolate being killed (CPU limit, etc). */
  error?: string;
  wallTimeMs: number;
}

/**
 * Runs an arbitrary script (not wrapped in a named function) inside a
 * Dynamic Worker with the same isolation as DynamicWorkersSandbox.run().
 * Used only for the deliberate attack probes in src/attacks.ts -- real
 * task execution goes through DynamicWorkersSandbox.run() above.
 */
export async function runRawScriptInSandbox(
  loader: LoaderBinding,
  code: string,
  options: SandboxRunOptions,
): Promise<RawScriptResult> {
  const moduleSource = `
export default {
  async fetch(request, env, ctx) {
    try {
      const result = await (async () => {
${code}
      })();
      return new Response(JSON.stringify({ ok: true, result }));
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    }
  },
};
`;
  const start = Date.now();
  try {
    const worker = loader.get(options.isolateId, async () => ({
      compatibilityDate: "2025-08-01",
      mainModule: "attack.js",
      modules: { "attack.js": moduleSource },
      env: {},
      globalOutbound: null,
      limits: { cpuMs: options.cpuMs, subRequests: 0 },
    }));
    const entrypoint = worker.getEntrypoint();
    const response = await entrypoint.fetch("http://sandbox/attack");
    const wallTimeMs = Date.now() - start;
    const body = (await response.json()) as { ok: boolean; result?: unknown; error?: string };
    return { invoked: true, result: body.result, error: body.ok ? undefined : body.error, wallTimeMs };
  } catch (e) {
    // The isolate itself was killed (e.g. CPU limit exceeded) before it
    // could return a Response at all -- this is the outcome we expect
    // from the CPU-deadline attack.
    const wallTimeMs = Date.now() - start;
    return { invoked: false, error: String((e as Error)?.message ?? e), wallTimeMs };
  }
}

/**
 * Fallback execution layer: Workers for Platforms dispatch namespaces. NOT
 * implemented -- building it out requires provisioning a dispatch namespace
 * and an outbound Worker via the Cloudflare API and uploading a script per
 * invocation, which is a meaningfully larger lift than Dynamic Workers and
 * wasn't needed once the primary path worked. Left here so the interface
 * boundary is real: this is where that implementation would go, with no
 * changes anywhere else.
 */
export class DispatchNamespaceSandbox implements SandboxRunner {
  async run(): Promise<SandboxRunResult> {
    throw new Error(
      "DispatchNamespaceSandbox is not implemented -- see README for why Dynamic Workers was sufficient",
    );
  }
}
