import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { parseRawWorldEdit } from "../src/worldEdit";
import { liveRunsDisabledResponse, liveRunsEnabled } from "../src/index";

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
    expect(body.runsLimit).toBe(3);
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
    // Drive it through the REAL path: consume a run, then ask.
    const ip = "workerd-live-status-agreement";
    const before = await SELF.fetch("https://example.test/live-status", { headers: { "cf-connecting-ip": ip } });
    const b0 = await before.json<{ runsUsed: number }>();
    await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": ip } });
    const after = await SELF.fetch("https://example.test/live-status", { headers: { "cf-connecting-ip": ip } });
    const b1 = await after.json<{ runsUsed: number }>();
    expect(b1.runsUsed).toBeGreaterThan(b0.runsUsed);
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

  it("returns a structured 429 envelope before starting a rate-limited run", async () => {
    // This seeded the KV key and expected a 429 -- but SPEND_COUNTER is bound
    // in the pool config, so claimPipelineRun takes the Durable Object branch
    // and returns before KV is ever read. The test was exercising the dev-only
    // fallback and the production limiter had no coverage at all.
    //
    // Exhaust it the way a visitor does instead: the limit is 3, so make 3
    // runs and check the 4th is refused.
    const ip = "workerd-rate-limit-test";
    for (let i = 0; i < 3; i++) {
      await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": ip } });
    }
    const response = await SELF.fetch("https://example.test/change-run?request=add%20a%20lamp", { headers: { "cf-connecting-ip": ip } });
    expect(response.status).toBe(429);
    const body = await response.json<{ error: string; reason: string }>();
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.reason).toMatch(/limit of 3 live pipeline runs/);
  });

  it("rejects a missing override payload with a precise validation error", () => {
    expect(() => parseRawWorldEdit({ ops: [{ op: "overridePlacement", placementId: "lamp-1" }] }))
      .toThrow('op[0] overridePlacement: "overridesJson" is missing');
  });

});
