import type { LoaderBinding } from "./sandbox";
import type { SimTestCase, TestResult } from "./types";

// CALIPER v2's regression/new-behavior runner. Same underlying primitive as
// SandboxRunner (a Cloudflare Dynamic Worker via the Worker Loader binding,
// no bindings, no network, CPU-capped) but a different shape of problem:
// one source blob exports several functions (tick/chooseAction/applyAction,
// plus whatever a change adds), and each check names which one it calls and
// optionally chains repeated calls -- doesn't fit SandboxRunner's one-
// function-per-Task interface, so this is deliberately a sibling, not a
// forced reuse.

const WALL_CLOCK_ABORT_MS = 3000;
const TIMEOUT = Symbol("sim-sandbox-wall-clock-abort");

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
  throw new Error(`Cannot serialize a value of type ${typeof value} into the sim sandbox harness`);
}

/**
 * Exported so the "comparators are captured before the candidate" invariant can
 * be asserted against the module this actually builds, rather than against the
 * text of this file. A test that greps source passes the moment someone
 * reformats; a test that reads the generated module cannot.
 */
export function buildSimHarnessModule(sourceCode: string, tests: SimTestCase[]): string {
  const testsLiteral = toJsLiteral(tests);
  // Worker Loader modules are real ES modules, so top-level "function
  // tick(){}" declarations in the embedded source are module-scoped, not
  // attached to globalThis -- confirmed by actually running this and
  // seeing "tick is not defined". `eval` would resolve them via the
  // lexical scope chain, but Workers disallows dynamic code generation
  // outright (confirmed the same way: eval threw "Code generation from
  // strings disallowed" once the first fix's swallowed error was surfaced).
  // Instead, generate one plain assignment per function name the tests
  // actually reference -- known here at harness-build time from `tests`,
  // needs no advance knowledge of everything the source defines.
  const fnNames = [...new Set(tests.map((t) => t.fn))];
  const attachments = fnNames
    .map((name) => `try { __fns[${JSON.stringify(name)}] = ${name}; } catch (e) {}`)
    .join("\n");
  return `
// =============================================================================
// THE COMPARATORS ARE CAPTURED BEFORE THE CANDIDATE RUNS.
//
// The model's source is spliced in below, at module scope, and it executes
// BEFORE __deepEqual is ever called. So anything it does to the intrinsics
// __deepEqual depends on, it does to the judge:
//
//     function tick(w){ return w; } Object.is = () => true;
//
// -- one line, and every regression case and every acceptance criterion
// compares equal. The suite reports 9/9 and 5/5, convergence is declared, and
// the run ships. "A system that only says yes when yes is true" would be
// saying yes because the thing under test told it to.
//
// The scanner that is supposed to reject that line is a separate defence and
// has been fixed too, but a scanner is a filter and this is an invariant: the
// judge must not be reachable from the dock. Snapshotting here costs nothing
// and makes the whole class of attack impossible rather than merely detected.
// =============================================================================
const __is = Object.is;
const __keys = Object.keys;
const __isArray = Array.isArray;
const __hasOwn = Object.prototype.hasOwnProperty;
// (There was an Object.freeze here. It froze the function OBJECTS, which stops
//  nothing: reassigning Object.is is a property write on Object, and in any
//  case the comparators below read these const bindings and never touch
//  Object.is again. It was reassurance, not a mechanism, so it is gone.)

${sourceCode}

const __fns = {};
${attachments}

// A const, NOT a function declaration. A function declaration hoists into a mutable
// module-scope binding, so capturing the intrinsics above only moved the target
// one level out -- the candidate, spliced in below, could simply write
//     const _a = () => {}; __deepEqual = () => true;
// and own the verdict exactly as before. Verified in a real ES module: it
// returned true for __deepEqual(1, 2).
//
// A const declared BELOW the candidate is in the temporal dead zone while the
// candidate runs, so an assignment to it throws instead of succeeding -- the
// same protection __fns already had, by accident rather than design.
const __deepEqual = (a, b) => {
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
};

// Every key in "expected" must match in "actual" (recursively into nested
// objects); extra keys "actual" has that "expected" doesn't mention are
// ignored. Arrays and primitives still compare exactly -- only object keys
// are treated as a subset. Used for model-proposed plan criteria, which
// often assert only the part of a return value that changed; the hand-
// authored regression suite never uses this, only __deepEqual.
const __partialMatch = (actual, expected) => {
  if (expected === null || typeof expected !== "object" || __isArray(expected)) {
    return __deepEqual(actual, expected);
  }
  if (actual === null || typeof actual !== "object" || __isArray(actual)) return false;
  for (const k of __keys(expected)) {
    if (!__hasOwn.call(actual, k) || !__partialMatch(actual[k], expected[k])) return false;
  }
  return true;
};

const __tests = ${testsLiteral};

export default {
  async fetch() {
    const results = [];
    for (const t of __tests) {
      // fn/args/repeat ride along on every result, pass or fail -- this is
      // the exact call that produced it, and the fix stage needs it to
      // repair a crash instead of guessing from a bare error string.
      try {
        const fn = __fns[t.fn];
        if (typeof fn !== "function") {
          results.push({ name: t.name, pass: false, fn: t.fn, args: t.args, repeat: t.repeat, error: "function '" + t.fn + "' is not defined in this source" });
          continue;
        }
        let actual = t.args[0];
        const rest = t.args.slice(1);
        const times = t.repeat && t.repeat > 0 ? t.repeat : 1;
        for (let i = 0; i < times; i++) actual = fn(actual, ...rest);
        const pass = typeof t.tolerance === "number"
          ? typeof actual === "number" && Math.abs(actual - t.expected) <= t.tolerance
          : t.partial
            ? __partialMatch(actual, t.expected)
            : __deepEqual(actual, t.expected);
        results.push({ name: t.name, pass, fn: t.fn, args: t.args, repeat: t.repeat, actual, expected: t.expected });
      } catch (e) {
        results.push({ name: t.name, pass: false, fn: t.fn, args: t.args, repeat: t.repeat, error: String((e && e.message) || e), stack: e && e.stack ? String(e.stack) : undefined });
      }
    }
    return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
  },
};
`;
}

export async function runSimTests(
  loader: LoaderBinding,
  sourceCode: string,
  tests: SimTestCase[],
  isolateId: string,
  cpuMs = 1000,
): Promise<{ results: TestResult[]; fatalError?: string; wallTimeMs: number }> {
  const moduleSource = buildSimHarnessModule(sourceCode, tests);
  const start = Date.now();
  try {
    const worker = loader.get(isolateId, async () => ({
      compatibilityDate: "2025-08-01",
      mainModule: "sim-harness.js",
      modules: { "sim-harness.js": moduleSource },
      env: {},
      globalOutbound: null,
      limits: { cpuMs, subRequests: 0 },
    }));
    const entrypoint = worker.getEntrypoint();
    const outcome = await raceAbort(entrypoint.fetch("http://sandbox/run"), WALL_CLOCK_ABORT_MS);
    const wallTimeMs = Date.now() - start;
    if (outcome === TIMEOUT) {
      return { results: [], wallTimeMs, fatalError: `wall-clock abort after ${WALL_CLOCK_ABORT_MS}ms` };
    }
    if (!outcome.ok) {
      return { results: [], wallTimeMs, fatalError: `sandbox returned HTTP ${outcome.status}` };
    }
    const results = (await outcome.json()) as TestResult[];
    return { results, wallTimeMs };
  } catch (e) {
    return { results: [], wallTimeMs: Date.now() - start, fatalError: String((e as Error)?.message ?? e) };
  }
}
