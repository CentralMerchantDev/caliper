// =============================================================================
// CALIPER — WORKERS AI CLIENT BINDING (Phase R1 / Rule Zero)
//
// Provides WorkersAIBinding calling real Cloudflare Workers AI inference network.
// In Workers runtime, uses native env.AI.
// In Node / test harness, connects via Cloudflare REST API with Wrangler credentials.
// =============================================================================

import type { WorkersAIBinding } from "./modelRetrieval.ts";

function wranglerCredentialsPath(): string | null {
  const nodeProcess = (globalThis as any).process;
  const os = nodeProcess?.getBuiltinModule?.("os");
  const path = nodeProcess?.getBuiltinModule?.("path");
  return os && path ? path.join(os.homedir(), ".wrangler", "config", "default.toml") : null;
}

export function createWorkersAIClient(options: { accountId?: string; apiToken?: string } = {}): WorkersAIBinding {
  let token = options.apiToken || (typeof process !== "undefined" ? process.env?.CLOUDFLARE_API_TOKEN : "") || "";
  const accountId = options.accountId || (typeof process !== "undefined" ? process.env?.CLOUDFLARE_ACCOUNT_ID : "") || "";

  if (!accountId) {
    throw new Error("No Cloudflare account ID found. Set CLOUDFLARE_ACCOUNT_ID or pass accountId explicitly.");
  }

  if (!token && typeof process !== "undefined") {
    try {
      // In Node test harness, read token from default.toml
      // Use dynamic require / import to avoid bundling node:fs in workers build
      const fs = (globalThis as any).process?.getBuiltinModule ? (globalThis as any).process.getBuiltinModule("fs") : null;
      if (fs) {
        const credentialsPath = wranglerCredentialsPath();
        const defaultToml = credentialsPath ? fs.readFileSync(credentialsPath, "utf8") : "";
        const match = defaultToml.match(/oauth_token\s*=\s*"([^"]+)"/);
        if (match) token = match[1];
      }
    } catch {
      // Ignore if file is not found
    }
  }

  if (!token) {
    throw new Error("No Cloudflare authentication token found. Set CLOUDFLARE_API_TOKEN or configure Wrangler credentials.");
  }

  return {
    async run(model: string, input: { text: string | string[] }) {
      const texts = Array.isArray(input.text) ? input.text : [input.text];
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

      let res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: texts }),
      });

      if (res.status === 401 && typeof process !== "undefined") {
        // Attempt automatic refresh of OAuth token
        try {
          const fs = (globalThis as any).process?.getBuiltinModule ? (globalThis as any).process.getBuiltinModule("fs") : null;
          if (fs) {
            const tomlPath = wranglerCredentialsPath();
            if (!tomlPath) throw new Error("Cannot locate the Wrangler credentials file outside Node.js.");
            const toml = fs.readFileSync(tomlPath, "utf8");
            const rMatch = toml.match(/refresh_token\s*=\s*"([^"]+)"/);
            if (rMatch) {
              const rToken = rMatch[1];
              const params = new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: rToken,
                client_id: "54d11594-84e4-41aa-b438-e81b8fa78ee7",
              });
              const rRes = await fetch("https://dash.cloudflare.com/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
              });
              if (rRes.ok) {
                const rJson = (await rRes.json()) as any;
                if (rJson.access_token) {
                  token = rJson.access_token;
                  const newToml = `oauth_token = "${rJson.access_token}"\nexpiration_time = "${new Date(Date.now() + (rJson.expires_in || 3600) * 1000).toISOString()}"\nrefresh_token = "${rJson.refresh_token || rToken}"\nscopes = [ "user:read", "offline_access", "account:read", "workers:write", "workers_kv:write", "workers_routes:write", "workers_scripts:write", "workers_tail:read", "d1:write", "pages:write", "zone:read", "ssl_certs:write", "ai:write", "ai-search:write", "ai-search:run", "websearch.run", "agent-memory:write", "queues:write", "pipelines:write", "secrets_store:write", "artifacts:write", "flagship:write", "containers:write", "cloudchamber:write", "connectivity:admin", "email_routing:write", "email_sending:write", "browser:write", "challenge-widgets.write" ]\n`;
                  fs.writeFileSync(tomlPath, newToml, "utf8");
                  // Retry original request with refreshed token
                  res = await fetch(url, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text: texts }),
                  });
                }
              }
            }
          }
        } catch {
          // Fall through to error handler
        }
      }

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Workers AI HTTP ${res.status}: ${errBody}`);
      }

      const data = (await res.json()) as {
        success: boolean;
        result?: { shape?: number[]; data: number[][] | number[] };
        errors?: any[];
      };

      if (!data.success || !data.result) {
        throw new Error(`Workers AI API failure: ${JSON.stringify(data.errors || [])}`);
      }

      return data.result;
    },
  };
}
