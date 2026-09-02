import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { parseRawWorldEdit } from "../src/worldEdit";
import { liveRunsDisabledResponse, liveRunsEnabled } from "../src/index";
import { CONTROL_LIMITS } from "../src/controlLayer";

describe("request handlers run in workerd", () => {
  it("loads the real handler without dynamic string evaluation", async () => {
    const response = await SELF.fetch("https://example.test/api");
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("routes.GET /world-edit-selftest");
  });

  it("applies and validates a world edit through a request handler", async () => {
    const response = await SELF.fetch("https://example.test/world-edit-selftest");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ passed: true, persisted: false });
  });

  it.each([
    ["collision", /collides with building/],
    ["unknown-placement", /placement id .* does not exist/],
    ["invalid-parcel", /outside parcel bounds/],
  ])("returns a structured JSON rejection for %s", async (kind, reasonPattern) => {
    const response = await SELF.fetch(`https://example.test/world-edit-selftest?reject=${kind}`);
    expect(response.status).toBe(400);
    const body = await response.json<{ error: string; reason: string }>();
    expect(body.error).toBe("world_edit_rejected");
    expect(body.reason).toMatch(reasonPattern);
  });

  it("says WHY a run cannot start, not merely whether", async () => {
    // This asserted `toEqual({ enabled: true })` against a response that has
    // reported seven fields since /live-status was rewritten -- so it was red,
    // silently, because the vitest half of the suite is one file and is easy to
    // not run. The endpoint's whole purpose is that EventSource cannot read an
    // HTTP error body, so the page has to ask what happened; a test that pins
    // only `enabled` pins the half that was never the problem.
    const response = await SELF.fetch("https://example.test/live-status");
    expect(response.status).toBe(200);
    const body = await response.json<{
      enabled: boolean; ok: boolean; reason: string | null; detail: string | null;
      runsUsed: number; runsLimit: number; dailyRemainingUsd: number;
    }>();
    expect(body.enabled).toBe(true);
    expect(body.runsLimit).toBe(CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP);
    expect(typeof body.runsUsed).toBe("number");
    expect(typeof body.dailyRemainingUsd).toBe("number");
    // ok and reason must agree with each other, whichever way they land
    expect(typeof body.ok).toBe("boolean");
    if (body.ok) expect(body.reason).toBeNull();
    else expect(typeof body.detail).toBe("string");
  });

  it("reports the per-IP count from the store that actually enforces it", async () => {
    // The reporting path used to read KV at `pipeline/ratelimit/...` while
    // claimPipelineRun incremented DO storage at `ratelimit/...`. Two stores,
    // and the one being read was never written in production -- so the page
    // said "0 of 3 used" right up until /change-run answered 429, which is the
    // precise failure /live-status exists to prevent.
    //
    // IT CAME BACK. The key was later changed to a salted hash of the address
    // for retention reasons, and only claimRun -- the writer -- was updated.
    // runsUsed kept reading `ratelimit/<raw ip>/<day>`, a key nothing writes,
    // so /live-status went back to reporting 0 for everyone. Same defect, one
    // refactor later, which is why this test is worth more than the fix was.
    //
    // The first version of this test drove /change-run and then read
    // /live-status. That could not work: /change-run answers 200 with an SSE
    // stream, `fetch` resolves when the HEADERS arrive, and the run is claimed
    // inside the body. Measured: with the body never pulled, the claim had not
    // landed 6.8 s later. The test was asserting a side effect it never waited
    // for -- so it failed even when the code was right, and would have passed
    // for the wrong reason if the timing had gone the other way.
    //
    // Drive the ENFORCER directly and ask over HTTP. That crosses every join
    // the defect lives in -- claimRun's key, the DO route, pipelineAvailability,
    // runsUsed's key -- with nothing racing.
    const ip = "workerd-live-status-agreement";
    const day = new Date().toISOString().slice(0, 10);
    const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));

    const zero = await SELF.fetch("https://example.test/live-status", { headers: { "cf-connecting-ip": ip } });
    expect((await zero.json<{ runsUsed: number }>()).runsUsed).toBe(0);

    await stub.fetch("https://do/claim-run", {
      method: "POST",
      body: JSON.stringify({ ip, day, limit: CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP }),
    });

    const after = await SELF.fetch("https://example.test/live-status", { headers: { "cf-connecting-ip": ip } });
    const b1 = await after.json<{ runsUsed: number; countersRead: boolean }>();
    expect(b1.countersRead).toBe(true);
    expect(b1.runsUsed).toBe(1);

    // And the refund path, which derived the same key a third time and so was
    // broken the same way -- silently, since decrementing a key that does not
    // exist floors at 0 and returns a plausible number.
    await stub.fetch("https://do/refund-run", { method: "POST", body: JSON.stringify({ ip, day }) });
    const back = await SELF.fetch("https://example.test/live-status", { headers: { "cf-connecting-ip": ip } });
    expect((await back.json<{ runsUsed: number }>()).runsUsed).toBe(0);
  });

  it("keeps the live path fail-closed when the flag is absent or malformed", () => {
    expect(liveRunsEnabled({})).toBe(false);
    expect(liveRunsEnabled({ LIVE_RUN_ENABLED: "TRUE" })).toBe(false);
    expect(liveRunsEnabled({ LIVE_RUN_ENABLED: "true" })).toBe(true);
    const response = liveRunsDisabledResponse();
    expect(response.status).toBe(503);
    return expect(response.json()).resolves.toEqual({
      error: "live_runs_disabled",
      reason: "Live runs are disabled. The recording and run history remain available.",
    });
  });

  it("refuses one run past the daily per-IP limit", async () => {
    // The PER-IP limiter on its own. Claim straight against the Durable Object
    // -- the same store and key claimPipelineRun uses in production -- so no
    // leases are held and the concurrency limiter cannot fire first and mask
    // this.
    //
    // This runs BEFORE the concurrency test on purpose. SSE streams opened by
    // that test stay open for the life of the file, so a run started there
    // still holds its slot here: when the order was reversed this test failed
    // with "5 pipeline runs are already in flight", which is a true statement
    // about the wrong limiter.
    const ip = "workerd-daily-limit-test";
    const day = new Date().toISOString().slice(0, 10);
    const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));
    for (let i = 0; i < CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP; i++) {
      await stub.fetch("https://do/claim-run", {
        method: "POST",
        body: JSON.stringify({ ip, day, limit: CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP }),
      });
    }
    const response = await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": ip } });
    expect(response.status).toBe(429);
    const body = await response.json<{ error: string; reason: string }>();
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.reason).toMatch(new RegExp(`limit of ${CONTROL_LIMITS.DAILY_LIVE_RUNS_PER_IP} live pipeline runs`));
  });

  it("a run refused for concurrency does not cost the visitor one of their runs", async () => {
    // The claim is taken before the lease, so a concurrency refusal used to
    // spend one of the visitor's daily runs and then tell them about a daily
    // limit that was not the reason.
    const ip = "workerd-refund-test";
    const day = new Date().toISOString().slice(0, 10);
    const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));
    const used = async () => {
      const r = await stub.fetch("https://do/runs-used", { method: "POST", body: JSON.stringify({ ip, day }) });
      return (await r.json<{ used: number }>()).used;
    };
    for (let i = 0; i < CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS; i++) {
      await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": `filler-${i}` } });
    }
    const before = await used();
    const response = await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": ip } });
    expect(response.status).toBe(429);
    expect(await used()).toBe(before);
  });

  // LAST: this one fills every concurrency slot and the streams stay open for
  // the rest of the file.
  it("refuses a CONCURRENT run once the in-flight limit is reached", async () => {
    // Three runs opened and never completed -- their SSE streams stay open and
    // hold their leases -- so the fourth is refused by the CONCURRENCY limiter.
    //
    // The first version of this test made these three requests and then
    // asserted the per-IP DAILY message, which is a different limiter. It
    // failed on the real runtime with "3 pipeline runs are already in flight
    // (max 3)" -- the right refusal, the wrong assertion. Worth keeping as two
    // tests, because they are two guarantees and a run that trips one should
    // not be able to masquerade as the other.
    // AND THE SECOND VERSION ASSERTED SOMETHING ARITHMETICALLY IMPOSSIBLE.
    //
    // It opened MAX_CONCURRENT_PIPELINE_RUNS runs from ONE address. But the
    // concurrency cap is GLOBAL -- leaseRun counts every active lease, whoever
    // holds it -- while the daily cap is per address, and DAILY_LIVE_RUNS_PER_IP
    // is 2 against MAX_CONCURRENT_PIPELINE_RUNS of 5. One address can hold at
    // most 2 leases, so it can never reach 5, and the third request is refused
    // by the DAILY limiter. That is what happened: the assertion wanted
    // /already in flight/ and got "You've hit the limit of 2 live pipeline
    // runs per day". The right refusal, the wrong limiter -- for the second
    // time in this one test, which is the tell that the test was never able to
    // reach the control it names.
    //
    // Take the leases directly, one per run id, the way the daily test claims
    // runs directly. Then a FRESH address -- with a clean daily allowance, so
    // the daily limiter provably cannot be what fires -- must be refused for
    // concurrency and nothing else.
    // FILL UNTIL FULL, DO NOT ASSUME EMPTY. Earlier tests in this file open
    // runs whose leases are still held here -- that is stated at the daily-limit
    // test above and it is just as true in this direction. Taking exactly
    // MAX_CONCURRENT leases and asserting each one succeeds failed on the fifth,
    // because four were already out. Fill until the coordinator itself says the
    // pool is full, which is the condition this test actually needs and the only
    // one that does not depend on what ran before it.
    const stub = env.SPEND_COUNTER.get(env.SPEND_COUNTER.idFromName("global"));
    let full = false;
    for (let i = 0; i <= CONTROL_LIMITS.MAX_CONCURRENT_PIPELINE_RUNS && !full; i++) {
      const lease = await stub.fetch("https://do/lease-run", {
        method: "POST",
        body: JSON.stringify({ runId: `workerd-concurrency-filler-${i}` }),
      });
      const body = await lease.json<{ ok: boolean; reason?: string }>();
      if (!body.ok) {
        expect(body.reason).toMatch(/already in flight/);
        full = true;
      }
    }
    expect(full, "the lease pool never filled, so this test never reached the control it names").toBe(true);
    const ip = "workerd-concurrency-test";
    const response = await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": ip } });
    expect(response.status).toBe(429);
    const body = await response.json<{ error: string; reason: string }>();
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.reason).toMatch(/already in flight/);
  });

  
  
  it("rejects a missing override payload with a precise validation error", () => {
    expect(() => parseRawWorldEdit({ ops: [{ op: "overridePlacement", placementId: "lamp-1" }] }))
      .toThrow('op[0] overridePlacement: "overridesJson" is missing');
  });

});
