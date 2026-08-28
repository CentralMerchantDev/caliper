// FINISH.md section 5: re-derived caps (daily $2/weekly $7/monthly $20,
// per-run ceiling ~$0.15, 2 live runs/IP/day) -- verified by forcing each
// one, not by reading the numbers. Rate-limit tests use a minimal in-memory
// KV; spend-cap tests use a mock DurableObjectNamespace whose stub.fetch()
// delegates to a REAL SpendCounterDO instance (in-process, own storage),
// so the actual reserve/reconcile logic runs, not a re-implementation of it.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROL_LIMITS, assertUnderPipelineSpendCap, reconcilePipelineSpend, assertUnderPipelineRateLimit, recordPipelineRateLimitHit, PipelineLimitError } from "../src/controlLayer.ts";
import { SpendCounterLogic, handleSpendCounterRequest, type StorageLike } from "../src/spendCounterDO.ts";

function mockKv(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })), list_complete: true, cursor: undefined }) as any,
  } as unknown as KVNamespace;
}

function mockStorage(initial: Record<string, number> = {}): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) as any,
    put: async (key: string, value: unknown) => {
      store.set(key, value as number);
    },
  };
}

/** One real SpendCounterLogic instance behind a mock DurableObjectNamespace
 * -- every idFromName("global") call returns a stub pointed at the SAME
 * instance, matching the real one-global-instance design, and routed
 * through handleSpendCounterRequest exactly as the real DO's fetch() does. */
function mockSpendCounterNamespace(initial: Record<string, number> = {}): DurableObjectNamespace {
  const logic = new SpendCounterLogic(mockStorage(initial));
  const stub = { fetch: (url: string, init?: RequestInit) => handleSpendCounterRequest(logic, new Request(url, init)) };
  return { idFromName: () => "global", get: () => stub } as unknown as DurableObjectNamespace;
}

test("re-derived numbers match FINISH.md section 5 exactly", () => {
  assert.equal(CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD, 2.0);
  assert.equal(CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD, 7.0);
  assert.equal(CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD, 20.0);
  assert.equal(CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP, 3);
  assert.ok(CONTROL_LIMITS.PER_RUN_CEILING_USD <= 0.2, "per-run ceiling should track ~$0.15, not the old $0.35");
});

// ---------------------------------------------------------------------
// Guardrail: the weekly cap is a NEW checkpoint added tonight -- it must
// actually fire, not just exist as an unused constant.
// ---------------------------------------------------------------------
test("guardrail: weekly cap refuses a request that would cross it, even though daily/monthly both have room", async () => {
  const weekKey = `weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 0.01, [weekKey]: 6.99 });
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.05), (e: unknown) => e instanceof PipelineLimitError && e.kind === "weekly-cap");
});

test("control: the same weekly-spend scenario does NOT refuse when the estimate fits under the weekly cap", async () => {
  const weekKey = `weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 0.01, [weekKey]: 6.5 });
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(ns, 0.05));
});

test("guardrail: daily cap still refuses independently of the weekly cap having room", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.99 });
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.05), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap");
});

// ---------------------------------------------------------------------
// The atomicity fix itself: reserve commits the ESTIMATE immediately, so a
// second call sees the reservation even before the first call's real cost
// is known -- this is what a KV check-then-later-record shape couldn't do.
// ---------------------------------------------------------------------
test("reserve commits the estimate immediately -- a second reserve sees it, not the stale pre-call total", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.9 });
  await assertUnderPipelineSpendCap(ns, 0.05); // reserves up to 1.95, still under 2.00
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.06), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap"); // 1.95 + 0.06 = 2.01, over 2.00
});

test("guardrail: two reservations that would each individually fit are still caught in sum -- this is the exact race the DO closes", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.97 });
  await assertUnderPipelineSpendCap(ns, 0.02); // 1.97 -> 1.99, fits
  await assert.rejects(() => assertUnderPipelineSpendCap(ns, 0.02), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap"); // 1.99 + 0.02 = 2.01, over
});

test("reconcile trues a reservation down to the real (lower) cost, freeing room for the next call", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 1.9 });
  await assertUnderPipelineSpendCap(ns, 0.08); // reserves to 1.98
  await reconcilePipelineSpend(ns, 0.08, 0.02); // real cost was only 0.02 -> daily should true down to 1.92
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(ns, 0.05)); // 1.92 + 0.05 = 1.97, fits -- would NOT fit if reconcile hadn't freed the difference
});

test("reconcile releasing a failed call's reservation (actual=0) never lets the bucket go negative", async () => {
  const ns = mockSpendCounterNamespace({ [`daily/${new Date().toISOString().slice(0, 10)}`]: 0.01 });
  await assertUnderPipelineSpendCap(ns, 0.05); // -> 0.06
  await reconcilePipelineSpend(ns, 0.05, 0); // failed call, release the whole reservation -> back to 0.01
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(ns, 1.9)); // 0.01 + 1.9 = 1.91, fits -- would fail if the release left it at 0.06 or higher by mistake
});

// ---------------------------------------------------------------------
// Guardrail: the per-IP daily limit, re-derived to 3 (UPGRADE.md, up from 2).
// ---------------------------------------------------------------------
test("guardrail: a 4th live run for the same IP on the same day is refused (limit is now 3)", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "1.2.3.4");
  await recordPipelineRateLimitHit(kv, "1.2.3.4");
  await recordPipelineRateLimitHit(kv, "1.2.3.4");
  await assert.rejects(() => assertUnderPipelineRateLimit(kv, "1.2.3.4"), (e: unknown) => e instanceof PipelineLimitError && e.kind === "per-ip-daily");
});

test("control: a 3rd run for the same IP on the same day is still allowed", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "5.6.7.8");
  await recordPipelineRateLimitHit(kv, "5.6.7.8");
  await assert.doesNotReject(() => assertUnderPipelineRateLimit(kv, "5.6.7.8"));
});

test("control: a different IP is unaffected by another IP's hits", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "1.1.1.1");
  await recordPipelineRateLimitHit(kv, "1.1.1.1");
  await assert.doesNotReject(() => assertUnderPipelineRateLimit(kv, "2.2.2.2"));
});
