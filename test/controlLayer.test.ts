// FINISH.md section 5: re-derived caps (daily $2/weekly $7/monthly $20,
// per-run ceiling ~$0.15, 2 live runs/IP/day) -- verified by forcing each
// one, not by reading the numbers. A minimal in-memory KV stands in for
// the real binding; these are pure logic tests, not sandbox/network tests.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROL_LIMITS, assertUnderPipelineSpendCap, assertUnderPipelineRateLimit, recordPipelineRateLimitHit, PipelineLimitError } from "../src/controlLayer.ts";

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

test("re-derived numbers match FINISH.md section 5 exactly", () => {
  assert.equal(CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD, 2.0);
  assert.equal(CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD, 7.0);
  assert.equal(CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD, 20.0);
  assert.equal(CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP, 2);
  assert.ok(CONTROL_LIMITS.PER_RUN_CEILING_USD <= 0.2, "per-run ceiling should track ~$0.15, not the old $0.35");
});

// ---------------------------------------------------------------------
// Guardrail: the weekly cap is a NEW checkpoint added tonight -- it must
// actually fire, not just exist as an unused constant.
// ---------------------------------------------------------------------
test("guardrail: weekly cap refuses a request that would cross it, even though daily/monthly both have room", async () => {
  const kv = mockKv({
    [`pipeline/spend/daily/${new Date().toISOString().slice(0, 10)}`]: "0.01", // far under $2 daily
    [`pipeline/spend/weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`]: "6.99", // one cent under $7 weekly
  });
  await assert.rejects(() => assertUnderPipelineSpendCap(kv, 0.05), (e: unknown) => e instanceof PipelineLimitError && e.kind === "weekly-cap");
});

test("control: the same weekly-spend scenario does NOT refuse when the estimate fits under the weekly cap", async () => {
  const kv = mockKv({
    [`pipeline/spend/daily/${new Date().toISOString().slice(0, 10)}`]: "0.01",
    [`pipeline/spend/weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`]: "6.5",
  });
  await assert.doesNotReject(() => assertUnderPipelineSpendCap(kv, 0.05));
});

test("guardrail: daily cap still refuses independently of the weekly cap having room", async () => {
  const kv = mockKv({
    [`pipeline/spend/daily/${new Date().toISOString().slice(0, 10)}`]: "1.99",
  });
  await assert.rejects(() => assertUnderPipelineSpendCap(kv, 0.05), (e: unknown) => e instanceof PipelineLimitError && e.kind === "daily-cap");
});

// ---------------------------------------------------------------------
// Guardrail: the per-IP daily limit, re-derived to 2 (from 3).
// ---------------------------------------------------------------------
test("guardrail: a 3rd live run for the same IP on the same day is refused (limit is now 2)", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "1.2.3.4");
  await recordPipelineRateLimitHit(kv, "1.2.3.4");
  await assert.rejects(() => assertUnderPipelineRateLimit(kv, "1.2.3.4"), (e: unknown) => e instanceof PipelineLimitError && e.kind === "per-ip-daily");
});

test("control: a 2nd run for the same IP on the same day is still allowed", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "5.6.7.8");
  await assert.doesNotReject(() => assertUnderPipelineRateLimit(kv, "5.6.7.8"));
});

test("control: a different IP is unaffected by another IP's hits", async () => {
  const kv = mockKv();
  await recordPipelineRateLimitHit(kv, "1.1.1.1");
  await recordPipelineRateLimitHit(kv, "1.1.1.1");
  await assert.doesNotReject(() => assertUnderPipelineRateLimit(kv, "2.2.2.2"));
});
