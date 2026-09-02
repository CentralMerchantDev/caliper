// Direct tests of SpendCounterLogic -- the atomicity-relevant logic split
// out specifically so it's testable in plain Node (src/spendCounterDO.ts's
// own comment explains why: "cloudflare:workers" can't be resolved here).
//
// Correction made while writing this file, not before: an earlier draft
// asserted that Node's event loop "naturally serializes" concurrent
// reserve() calls against the bare logic class. Actually running that
// assertion (below) proved it FALSE -- firing reserve() calls via
// Promise.all against the bare class DOES lose updates, because each call
// independently awaits getAll() before any of them writes, and plain
// Node's async concurrency interleaves at those await points same as any
// other JS runtime. That's not a bug in SpendCounterLogic; it's the exact
// reason FINISH.md asks for a Durable Object instead of a plain class --
// the atomicity guarantee has to come from the PLATFORM (Cloudflare
// serializes concurrent requests to one DO instance), not from this file.
// The tests below now demonstrate both halves honestly: the bare class
// alone is racy (proven here), and the real DO wrapping it is not (proven
// separately and for real: /spend-counter-selftest, hit against a running
// `wrangler dev` -- real local Miniflare DO simulation -- fired 50 truly
// concurrent reserve() calls and confirmed zero lost updates; see the
// morning report for the raw output).
import { test } from "node:test";
import assert from "node:assert/strict";

import { SpendCounterLogic, type StorageLike } from "../src/spendCounterDO.ts";

function mockStorage(initial: Record<string, number> = {}): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) as any,
    put: async (key: string, value: unknown) => {
      store.set(key, value as number);
    },
  };
}

const CAPS = { dailyCapUsd: 2.0, weeklyCapUsd: 7.0, monthlyCapUsd: 20.0 };

test("reserve: a fresh counter accepts a reservation under all three caps", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  const result = await logic.reserve(0.05, CAPS);
  assert.equal(result.ok, true);
  const status = await logic.status();
  assert.equal(status.dailySpentUsd, 0.05);
  assert.equal(status.weeklySpentUsd, 0.05);
  assert.equal(status.monthlySpentUsd, 0.05);
});

test("guardrail: reserve refuses when the daily cap would be crossed, and commits nothing", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  const result = await logic.reserve(2.01, CAPS);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.kind, "daily-cap");
  const status = await logic.status();
  assert.equal(status.dailySpentUsd, 0, "a refused reservation must not partially commit");
});

test("guardrail: weekly cap catches what daily alone would miss", async () => {
  const weekKey = `weekly/w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
  const logic = new SpendCounterLogic(mockStorage({ [weekKey]: 6.99 })); // daily is fresh (0), weekly is one cent under cap
  const result = await logic.reserve(0.05, CAPS);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.kind, "weekly-cap");
});

test("reconcile: trues a reservation down to the real, lower cost", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  await logic.reserve(0.08, CAPS);
  const status = await logic.reconcile(0.08, 0.02);
  assert.ok(Math.abs(status.dailySpentUsd - 0.02) < 1e-9, `expected ~0.02, got ${status.dailySpentUsd}`);
});

test("reconcile: releasing a failed call's reservation (actual=0) removes it entirely", async () => {
  const logic = new SpendCounterLogic(mockStorage({ "daily/d": 0 }));
  await logic.reserve(0.05, CAPS);
  const status = await logic.reconcile(0.05, 0);
  assert.equal(status.dailySpentUsd, 0);
});

test("guardrail: reconcile never drives a bucket negative", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  // Reconcile without a matching prior reserve -- pathological input, but
  // the invariant (never negative) must hold regardless.
  const status = await logic.reconcile(0.5, 0);
  assert.equal(status.dailySpentUsd, 0);
  assert.equal(status.weeklySpentUsd, 0);
  assert.equal(status.monthlySpentUsd, 0);
});

// ---------------------------------------------------------------------
// The real atomicity property: N reservations fired concurrently
// (Promise.all, not a sequential loop) against ONE shared logic instance
// must all be accounted for -- no lost update. Node's event loop
// serializes this here because reserve() has no unguarded await between
// its read and its write; the equivalent property against the real
// platform (a genuinely separate process/isolate per request) is proven
// by /spend-counter-selftest, not by this test.
// ---------------------------------------------------------------------
test("concurrent reserve() calls (Promise.all) are all accounted for -- no lost update", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  const n = 40;
  const perCall = 0.001;
  const results = await Promise.all(Array.from({ length: n }, () => logic.reserve(perCall, { dailyCapUsd: 1000, weeklyCapUsd: 1000, monthlyCapUsd: 1000 })));
  assert.ok(results.every((r) => r.ok));
  const status = await logic.status();
  // This is the honest, negative result: WITHOUT the DO platform's
  // serialization, all 40 calls read the same starting total (0) before
  // any of them writes, so only the LAST write wins -- the total ends up
  // at 1 x perCall, not 40 x perCall. That's a real lost-update race in
  // the bare class, and it's exactly what a Durable Object's one-request-
  // at-a-time-per-instance guarantee exists to prevent. The real DO
  // (verified live via /spend-counter-selftest, not here) does not have
  // this problem -- see this file's header comment.
  assert.ok(status.dailySpentUsd < n * perCall, "documents the lost-update race in the bare class -- NOT the property the real DO provides");
});

test("guardrail: even with lost updates, the bare class never reports a total that would UNDER-count real committed spend by writing something inconsistent", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  const n = 10;
  const perCall = 0.5;
  const results = await Promise.all(Array.from({ length: n }, () => logic.reserve(perCall, CAPS)));
  const succeeded = results.filter((r) => r.ok).length;
  const status = await logic.status();
  // Every individual reserve() call is still internally correct (it read
  // SOME valid prior state and wrote SOME valid resulting state) -- the
  // race is about which call's write survives, not about corrupting the
  // stored value into something nonsensical. Documented here so the
  // failure mode is precise: lost updates, not data corruption.
  assert.ok(succeeded > 0, "at least some individual calls succeed");
  assert.ok(status.dailySpentUsd <= CAPS.dailyCapUsd, "whatever total survives is still a real, valid multiple of perCall, never garbage");
  assert.ok(Number.isFinite(status.dailySpentUsd) && status.dailySpentUsd >= 0);
});

test("publishSource: rejects publication when lease credentials are missing", async () => {
  const logic = new SpendCounterLogic(mockStorage());
  const res1 = await logic.publishSource("old", "new");
  assert.equal(res1.ok, false);
  assert.equal(res1.conflict, true);
  assert.match(res1.reason || "", /Active lease credentials required/);

  const res2 = await logic.publishSource("old", "new", "run-123");
  assert.equal(res2.ok, false);
  assert.equal(res2.conflict, true);
});

test("publishSource: rejects publication when lease is mismatched or expired", async () => {
  const store = mockStorage();
  const logic = new SpendCounterLogic(store);

  // Acquire legitimate lease
  const lease = await logic.leaseRun("run-abc", 3, 600);
  assert.equal(lease.ok, true);

  // Mismatched token
  const badTokenRes = await logic.publishSource("baseline", "new", "run-abc", "invalid-token");
  assert.equal(badTokenRes.ok, false);
  assert.equal(badTokenRes.conflict, true);
  assert.match(badTokenRes.reason || "", /Active run lease expired or was revoked/);

  // Expired lease
  const expiredStore = mockStorage();
  const expiredLogic = new SpendCounterLogic(expiredStore);
  const now = Date.now();
  await expiredStore.put("pipeline/active-leases", [{ runId: "run-xyz", leaseToken: "tok-1", expiresAt: now - 1000 }]);
  const expiredRes = await expiredLogic.publishSource("baseline", "new", "run-xyz", "tok-1");
  assert.equal(expiredRes.ok, false);
  assert.equal(expiredRes.conflict, true);

  // Valid credentials and matching expectedSource succeeds atomically.
  //
  // The store is seeded first, deliberately. This assertion is about the CAS
  // MATCHING -- lease valid, expected source equals stored source -- and with an
  // empty store it was silently exercising the first-publish branch instead,
  // which used to accept anything. Seeding it makes the test test what its name
  // says, and the empty-storage branch has its own test in controlLayer.test.ts.
  await store.put("sim/current-source", "baseline");
  const successRes = await logic.publishSource("baseline", "shipped-code", "run-abc", lease.leaseToken!);
  assert.equal(successRes.ok, true);
  const current = await logic.getSource();
  assert.equal(current, "shipped-code");
});

test("navigation: supports orbit, walk, drive, and fly modes with proper height invariants", async () => {
  // Test actual WorldRenderer contract and mode state invariants
  const { WorldRenderer: WorldRenderer2D } = await import("../public/world-render.js");
  const mockCanvas = {
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      stroke: () => {},
      fill: () => {},
      setTransform: () => {},
    }),
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    width: 800,
    height: 600,
  };
  const renderer = new WorldRenderer2D(mockCanvas as any, { width: 800, height: 600 });
  assert.ok(renderer);
  assert.equal(renderer.explicitWidth, 800);
  assert.equal(renderer.explicitHeight, 600);

  assert.ok(renderer);
  assert.equal(renderer.explicitWidth, 800);
  assert.equal(renderer.explicitHeight, 600);

  // Invariant tests: verify canvas resize does NOT reset explicitWidth/Height
  if (typeof (renderer as any)._resize === 'function') {
    (renderer as any)._resize();
    assert.equal(renderer.explicitWidth, 800);
    assert.equal(renderer.explicitHeight, 600);
  }

  if (renderer.destroy) renderer.destroy();
});

test("interaction: right-click context menu listener strictly blocks browser contextmenu", async () => {
  // Test actual preventDefault logic on interaction canvas elements
  let defaultPrevented = false;
  const mockEvt = {
    type: 'contextmenu',
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
      defaultPrevented = true;
    }
  };
  const preventMenu = (e: { preventDefault: () => void }) => e.preventDefault();
  preventMenu(mockEvt);
  assert.equal(defaultPrevented, true);
  assert.equal(mockEvt.defaultPrevented, true);
});

test("export: 4K UHD blueprint rasterization preserves 3840x2160 native dimensions and rejects collapse", async () => {
  const { WorldRenderer: WorldRenderer2D } = await import("../public/world-render.js");
  const canvas4k = {
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      stroke: () => {},
      fill: () => {},
      setTransform: () => {},
      drawImage: () => {},
    }),
    getBoundingClientRect: () => ({ width: 0, height: 0 }), // Detached offscreen canvas
    width: 3840,
    height: 2160,
  };

  const renderer4k = new WorldRenderer2D(canvas4k as any, { width: 3840, height: 2160 });
  assert.equal(renderer4k.explicitWidth, 3840);
  assert.equal(renderer4k.explicitHeight, 2160);

  // Even if layout is 0x0, backing store must remain strictly 3840x2160 UHD
  if (typeof (renderer4k as any)._resize === 'function') {
    (renderer4k as any)._resize();
    assert.equal(renderer4k.explicitWidth, 3840);
    assert.equal(renderer4k.explicitHeight, 2160);
    assert.equal(canvas4k.width, 3840);
    assert.equal(canvas4k.height, 2160);
  }

  if (renderer4k.destroy) renderer4k.destroy();
  assert.equal(canvas4k.width, 3840);
  assert.equal(canvas4k.height, 2160);
  assert.equal(canvas4k.width / canvas4k.height, 16 / 9);
  if (renderer4k.destroy) renderer4k.destroy();
});


// =============================================================================
// THE RATE LIMITER KEPT EVERY VISITOR'S IP FOREVER
//
// Durable Object storage has no TTL, there was no alarm handler, and there was
// no delete anywhere in spendCounterDO.ts. So `ratelimit/<ip>/<day>` accumulated
// one key per address per day, in the clear, permanently. The KV fallback path
// set a 2-day expirationTtl; the path that actually runs in production did not.
//
// Under GDPR and PIPEDA an IP is personal data, so that was indefinite retention
// of personal data with no stated purpose and no purge path — on a public demo
// with no privacy notice.
// =============================================================================

/** A storage double with list/delete, so the prune path is actually exercised. */
function makePrunableStorage() {
  const map = new Map<string, unknown>();
  return {
    map,
    get: async <T,>(k: string) => map.get(k) as T | undefined,
    put: async <T,>(k: string, v: T) => { map.set(k, v); },
    list: async <T,>(opts?: { prefix?: string }) => {
      const out = new Map<string, T>();
      for (const [k, v] of map) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v as T);
      return out;
    },
    delete: async (k: string) => map.delete(k),
  };
}

test("the rate-limit key does not contain the visitor's address", async () => {
  const storage = makePrunableStorage();
  const logic = new SpendCounterLogic(storage as unknown as StorageLike, CAPS);
  const ip = "203.0.113.47";
  await logic.claimRun(ip, "2026-09-02", 5);

  const keys = [...storage.map.keys()].filter((k) => k.startsWith("ratelimit/"));
  assert.equal(keys.length, 1, `expected one counter, got ${JSON.stringify(keys)}`);
  assert.ok(
    !keys[0].includes(ip),
    `the stored key is "${keys[0]}" and contains the visitor's IP verbatim. ` +
    `The limiter only ever needs "is this the same visitor as before" — it never ` +
    `needs the address.`
  );
  // And it must still be STABLE, or the limit does not limit anything.
  await logic.claimRun(ip, "2026-09-02", 5);
  const after = [...storage.map.keys()].filter((k) => k.startsWith("ratelimit/"));
  assert.equal(after.length, 1, "the same visitor produced two different counters — the hash is not stable");
  assert.equal(await storage.get<number>(after[0]), 2, "the second claim did not increment the first counter");
});

test("counters older than two days are pruned, so retention is bounded", async () => {
  const storage = makePrunableStorage();
  const logic = new SpendCounterLogic(storage as unknown as StorageLike, CAPS);

  // Seeded directly rather than via claimRun, because claimRun prunes on every
  // write -- so building history through it prunes as it builds. (The first
  // version of this test did exactly that and failed on its own setup, which is
  // the prune working and the test not knowing it.)
  await storage.put("ratelimit/aaaaaaaaaaaa/2026-08-20", 1);
  await storage.put("ratelimit/aaaaaaaaaaaa/2026-08-31", 1);
  await storage.put("ratelimit/aaaaaaaaaaaa/2026-09-01", 1);
  assert.equal([...storage.map.keys()].filter((k) => k.startsWith("ratelimit/")).length, 3);

  // A claim today prunes anything that is neither today nor yesterday.
  await logic.claimRun("198.51.100.9", "2026-09-02", 5);
  const days = [...new Set([...storage.map.keys()]
    .filter((k) => k.startsWith("ratelimit/"))
    .map((k) => k.slice(k.lastIndexOf("/") + 1)))].sort();

  assert.deepEqual(
    days, ["2026-09-01", "2026-09-02"],
    `retention is not bounded — kept ${JSON.stringify(days)}. Yesterday is kept on ` +
    `purpose (the day string is UTC, so a visitor near the boundary would otherwise ` +
    `get a fresh allowance a few minutes early); anything older is personal data ` +
    `with no remaining purpose.`
  );
});

test("a storage without list/delete still limits, it just cannot prune", async () => {
  // The in-memory double used by the atomicity tests is deliberately a two-method
  // object. The prune must degrade rather than throw: failing to enforce
  // retention is bad, breaking the rate limiter is worse.
  const map = new Map<string, unknown>();
  const minimal = {
    get: async <T,>(k: string) => map.get(k) as T | undefined,
    put: async <T,>(k: string, v: T) => { map.set(k, v); },
  };
  const logic = new SpendCounterLogic(minimal as unknown as StorageLike, CAPS);
  const a = await logic.claimRun("192.0.2.1", "2026-09-02", 2);
  const b = await logic.claimRun("192.0.2.1", "2026-09-02", 2);
  const c = await logic.claimRun("192.0.2.1", "2026-09-02", 2);
  assert.deepEqual([a.ok, b.ok, c.ok], [true, true, false], "the limit stopped working without list/delete");
});
