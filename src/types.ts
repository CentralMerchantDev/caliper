export interface TestCase {
  name: string;
  /** Required unless `gen` is present, which synthesizes args instead. */
  args?: unknown[];
  /** Present unless `throws` is set. */
  expected?: unknown;
  /** If true, the test passes only if calling the function throws. */
  throws?: boolean;
  /** Any one of these counts as a pass -- for problems with more than one
   * correct answer (e.g. a tic-tac-toe position with several tied-optimal
   * moves, verified exhaustively before use, not guessed). */
  acceptedAny?: unknown[];
  /** Absolute numeric tolerance: pass if |actual - expected| <= tolerance. */
  tolerance?: number;
  /** Synthesize `args` inside the sandbox at execution time instead of
   * serializing a large literal (e.g. thousands of audio samples). Computed
   * from trusted, author-written code -- never model- or visitor-influenced. */
  gen?: { kind: "sine"; freq: number; sampleRate: number; n: number };
  /** Compare `actual[pluck]` instead of `actual` itself -- for functions
   * that return an object where only one field has an exact, checkable
   * answer (e.g. a score, not the free-form prose next to it). */
  pluck?: string;
}

export interface Task {
  id: string;
  title: string;
  /** Exact signature shown to the generating model. */
  functionName: string;
  paramNames: string[];
  /** Prompt describing the task. Hidden tests are NOT included here. */
  prompt: string;
  /** Tests the generating model never sees. */
  hiddenTests: TestCase[];
  /**
   * "core" (default): small, mostly edge-case-driven functions -- the
   * original 18-task set. "hard": requires real algorithmic reasoning
   * (DP, graph traversal) where a capability gap would actually show up,
   * not just careful edge-case handling. "novel": fabricated business-rule
   * specs invented for this experiment -- correctness requires reading and
   * composing this prompt's specific rules, not recalling a named
   * algorithm. See docs/NEXT.md / docs/MATRIX-RESULTS.md.
   */
  tier?: "core" | "hard" | "novel" | "preset";
  /**
   * One-line argument for why this task can't be solved by recall alone --
   * required for every "novel"-tier task, not just asserted. Not shown to
   * the generating model; shown on the page next to the task.
   */
  noveltyArgument?: string;

  // --- "preset" tier only (the CALIPER pipeline rebuild, see REBUILD.md /
  // REBUILD-CONTROLS.md). A preset is a Task with a richer, hand-authored
  // brief and extra check kinds the plain 32-task set never needed --
  // deliberately built as an extension of Task/TestCase/SandboxRunner
  // rather than a parallel type, so the sandbox stays the single execution
  // interface for every kind of verification.

  /** Hand-authored Why / What / Machine-verifiable acceptance criteria /
   * Must NOT brief -- hidden from the generating model (which only sees
   * `prompt`), revealed to the *visitor* at pipeline Stage 1, before any
   * code exists. Same brief shape as a production build's real PR briefs. */
  briefMarkdown?: string;
  /** One-line argument for why the hidden checks below are real,
   * independently-derived ground truth (physics, exhaustive search, a
   * published constant, or a stated rubric) -- same discipline as
   * `noveltyArgument`, required for every preset. */
  groundTruthArgument?: string;
  /** Required DOM markers, checked as a plain string/regex search against
   * the generated HTML source -- there is no DOM available server-side, so
   * this cannot be a real DOM query. `pattern` is a RegExp source string. */
  structuralChecks?: { name: string; pattern: string }[];
  /** A simulated click plus a JS assertion, executed client-side in the
   * visitor's own browser against the rendered iframe -- the sandbox has no
   * DOM, so this class of check cannot run server-side (see
   * docs/REBUILD-PROPOSAL.md §2). Weaker evidence than the server-side
   * checks above; disclosed as such, not presented as equally strong. */
  interactionChecks?: {
    name: string;
    action: "click" | "type";
    selector: string;
    text?: string;
    assertExpr: string;
  }[];
  /** Trusted, author-written verification logic -- never model-generated --
   * embedded directly into the sandbox harness alongside the artifact's
   * exposed function. Used only where a check can't be expressed as
   * independent single calls (e.g. playing a full adversarial game against
   * the model's exposed move-picking function). `harnessCode` must define a
   * function `__custom(fn)` returning `{ pass: boolean, detail?: string }`. */
  customVerification?: { name: string; harnessCode: string };
}

/** CALIPER v2 (BUILD-V2.md): a regression check against the life-sim's
 * source blob -- unlike TestCase above, each check names which function it
 * calls (`fn`), since one source blob exports several: tick, chooseAction,
 * applyAction. Runs through the same underlying Dynamic Worker sandbox,
 * via a dedicated harness (src/simSandbox.ts) rather than SandboxRunner,
 * since the multi-function-per-blob shape doesn't fit that interface. */
export interface SimTestCase {
  name: string;
  fn: string;
  args: unknown[];
  expected?: unknown;
  tolerance?: number;
  /** Call `fn` this many times, feeding each result back in as the next
   * call's first argument (for chaining e.g. `tick(tick(tick(world)))`).
   * Omit for a single call. */
  repeat?: number;
  /** Match `expected` as a partial/subset of `actual` (every key in
   * `expected` must match, recursively for nested objects; extra keys in
   * `actual` are ignored) instead of a strict full-object comparison.
   * Model-proposed plan criteria often only assert the part of the return
   * value that changed -- found by actually running one: several criteria
   * gave a partial expected object (e.g. just the "pets" field) against a
   * function that returns the whole world, which would fail every one of
   * them under strict equality regardless of correctness. The hand-
   * authored regression suite never sets this -- it stays exact. */
  partial?: boolean;
}

export interface TestResult {
  name: string;
  pass: boolean;
  actual?: unknown;
  expected?: unknown;
  error?: string;
  /** The function name and arguments that actually produced this result --
   * carried from the SimTestCase through to the result so a downstream
   * consumer (the fix stage's prompt) can show the real failing call, not
   * just a bare error string. Found missing the hard way: a fix stage was
   * twice asked to repair a crash described only as "Cannot read
   * properties of undefined (reading 'length')" -- the function and the
   * exact world that triggered it existed in the test definition the whole
   * time and were never forwarded. */
  fn?: string;
  args?: unknown[];
  repeat?: number;
  /** The raw stack trace from a thrown error, when there is one -- a test
   * name and a message ("Cannot read properties of undefined") doesn't say
   * WHERE, and "where" is often the difference between a one-line fix and
   * a guess across several candidate variables. */
  stack?: string;
}

export interface SandboxRunResult {
  results: TestResult[];
  /** Wall-clock time for the sandbox invocation, measured by the caller. */
  wallTimeMs: number;
  /** Set if the sandbox itself failed to execute at all (e.g. CPU limit hit before any test ran). */
  fatalError?: string;
}

export interface SandboxRunOptions {
  /** Hard CPU time limit enforced by the runtime, in milliseconds. */
  cpuMs: number;
  /**
   * Cache key for isolate reuse. Same code -> same id -> warm isolate on
   * repeat calls. Different code must use a different id.
   */
  isolateId: string;
}

/** The one interface the rest of the app depends on. Swapping the execution
 * layer (Dynamic Workers -> Workers for Platforms dispatch namespace) means
 * writing a new class that implements this — nothing else changes. */
export interface SandboxRunner {
  run(code: string, task: Task, options: SandboxRunOptions): Promise<SandboxRunResult>;
}

export interface GenerationResult {
  code: string;
  /** A deterministic edit rejection that the pipeline should report and
   * stop on, rather than treating unchanged code as a successful fix. */
  rejectionReason?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wallTimeMs: number;
}
