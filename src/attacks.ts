export interface AttackProbe {
  id: string;
  description: string;
  code: string;
  /** CPU limit to run this probe under -- deliberately tight for the CPU-deadline probe. */
  cpuMs: number;
  /** What counts as "the sandbox held" for this probe. */
  expectedOutcome: string;
  /**
   * Decides whether the sandbox held, given the outcome of the probe.
   * Not every probe "holding" looks the same: network access should throw,
   * a CPU deadline should kill the isolate outright, but reading env should
   * succeed and simply come back empty -- a thrown error there would be a
   * different (also acceptable) way of holding, so both are accepted.
   */
  judge(outcome: { invoked: boolean; result?: unknown; error?: string }): boolean;
}

// Hand-written, not model-generated: each of these deliberately tries to
// break out of the sandbox so the blocking behavior can be observed
// directly, rather than assumed from Cloudflare's documentation.
export const ATTACK_PROBES: AttackProbe[] = [
  {
    id: "network-egress",
    description: "Attempts an outbound fetch() to a public URL",
    cpuMs: 200,
    expectedOutcome: "fetch() throws because globalOutbound is null",
    judge: (o) => {
      // Must have actually been invoked and failed with an error
      if (!o.invoked) return false;
      return !!o.error;
    },
    code: `
        const res = await fetch("https://example.com/");
        return { leaked: true, status: res.status };
    `,
  },
  {
    id: "read-env-and-bindings",
    description: "Attempts to read the env object, globalThis bindings, and process.env",
    cpuMs: 200,
    expectedOutcome: "env is an empty object; no Cloudflare bindings or Node env are reachable",
    judge: (o) => {
      if (!o.invoked) return false; // Must have actually run in the sandbox
      if (o.error) return true; // Threw trying to read something -- held
      const r = o.result as { envKeys?: unknown[]; hasProcess?: boolean; globalHasKv?: boolean } | undefined;
      return !!r && Array.isArray(r.envKeys) && r.envKeys.length === 0 && !r.hasProcess && !r.globalHasKv;
    },
    code: `
        const envKeys = Object.keys(env || {});
        const hasProcess = typeof process !== "undefined";
        const globalHasKv = typeof globalThis.SPEND_KV !== "undefined";
        return { envKeys, hasProcess, globalHasKv };
    `,
  },
  {
    id: "cpu-deadline",
    description: "Busy-loops well past a deliberately tight CPU limit",
    cpuMs: 50,
    expectedOutcome: "the isolate is killed with an exception before the loop can finish",
    judge: (o) => {
      // For CPU deadline, the isolate is terminated before returning a Response (entrypoint.fetch throws in parent)
      // Must verify an explicit CPU limit or execution deadline exhaustion error occurred, strictly rejecting other runtime/stack/memory drops
      if (!o.error) return false;
      const err = o.error.toLowerCase();
      if (err.includes("stack") || err.includes("rangeerror") || err.includes("memory") || err.includes("allocation")) {
        return false;
      }
      return err.includes("cpu") || err.includes("deadline") || (err.includes("time") && (err.includes("limit") || err.includes("exceeded")));
    },
    code: `
        let x = 0;
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
          for (let i = 0; i < 1e7; i++) { x += i; }
        }
        return { leaked: true, x };
    `,
  },
  {
    id: "memory-balloon",
    description: "Grows an array of large strings without bound until something gives",
    // Generous CPU budget so the CPU limit isn't what stops this -- the
    // point is to see the memory ceiling, not re-confirm the CPU one.
    cpuMs: 10000,
    expectedOutcome: "allocation fails with a catchable error before the isolate is killed outright",
    judge: (o) => {
      // Must be invoked inside the sandbox and throw a catchable memory/allocation error
      if (!o.invoked || !o.error) return false;
      const err = o.error.toLowerCase();
      return err.includes("memory") || err.includes("allocation") || err.includes("out of") || err.includes("exhaust") || err.includes("rangeerror");
    },
    code: `
        const chunks = [];
        let totalBytes = 0;
        while (true) {
          chunks.push(new Array(1_000_000).fill("x").join(""));
          totalBytes += 1_000_000;
        }
    `,
  },
  {
    id: "deep-recursion",
    description: "Recurses with no base case until the call stack is exhausted",
    cpuMs: 10000,
    expectedOutcome: "stack overflow surfaces as a catchable RangeError",
    judge: (o) => {
      // Must be invoked inside the sandbox and throw a catchable RangeError or stack overflow
      if (!o.invoked || !o.error) return false;
      const err = o.error.toLowerCase();
      return err.includes("rangeerror") || err.includes("stack") || err.includes("recursion") || err.includes("call stack");
    },
    code: `
        function recurse(n) { return 1 + recurse(n + 1); }
        return recurse(0);
    `,
  },
];
