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

  it("exposes the kill-switch state without starting or advancing a run", async () => {
    const response = await SELF.fetch("https://example.test/live-status");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: true });
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
    const ip = "workerd-rate-limit-test";
    const day = new Date().toISOString().slice(0, 10);
    await env.SPEND_KV.put(`pipeline/ratelimit/${ip}/${day}`, "3");
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
