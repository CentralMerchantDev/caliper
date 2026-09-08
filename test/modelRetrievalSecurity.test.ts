import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createWorkersAIClient, parseWranglerOauthToken } from "../src/clientWorkersAI.ts";

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(resolved) : entry.name.endsWith(".ts") ? [resolved] : [];
  });
}

test("source never assigns NODE_TLS_REJECT_UNAUTHORIZED", () => {
  const sourceDirectory = path.join(process.cwd(), "src");
  const assignments = sourceFiles(sourceDirectory).filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /(?:process\.env|env)\s*(?:\.NODE_TLS_REJECT_UNAUTHORIZED|\[\s*["']NODE_TLS_REJECT_UNAUTHORIZED["']\s*\])\s*=/.test(source);
  });

  assert.deepEqual(assignments, [], `TLS verification disabled in: ${assignments.join(", ")}`);
});

test("Workers AI client requires an account ID", () => {
  const previous = process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  try {
    assert.throws(() => createWorkersAIClient({ apiToken: "test-token" }), /No Cloudflare account ID found/);
  } finally {
    if (previous === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previous;
  }
});

test("Workers AI client contains no machine-specific user path", () => {
  const clientSource = fs.readFileSync(path.join(process.cwd(), "src", "clientWorkersAI.ts"), "utf8");
  assert.doesNotMatch(clientSource, /[A-Za-z]:\\\\Users\\\\/);
});

test("Workers AI authentication failure is reported after one request without a hidden retry", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount++;
    return new Response('{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}', { status: 401 });
  };

  try {
    const client = createWorkersAIClient({ accountId: "account", apiToken: "expired-token" });
    await assert.rejects(() => client.run("@cf/baai/bge-small-en-v1.5", { text: "probe" }), /Workers AI HTTP 401/);
    assert.equal(requestCount, 1, "a 401 must not trigger an automatic retry or token refresh");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Workers AI client distinguishes a missing OAuth expiry from a missing token", () => {
  assert.throws(
    () => parseWranglerOauthToken('oauth_token = "present"'),
    /OAuth token was found, but its expiration_time is missing/
  );
  assert.equal(parseWranglerOauthToken(""), null);
});

test("Workers AI client turns certificate failures into an actionable system-CA error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const error = new TypeError("fetch failed") as TypeError & { cause: { code: string } };
    error.cause = { code: "SELF_SIGNED_CERT_IN_CHAIN" };
    throw error;
  };
  try {
    const client = createWorkersAIClient({ accountId: "account", apiToken: "token" });
    await assert.rejects(
      () => client.run("@cf/baai/bge-small-en-v1.5", { text: "probe" }),
      /Set NODE_USE_SYSTEM_CA=1.*never disable certificate verification/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
