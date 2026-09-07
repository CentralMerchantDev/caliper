// =============================================================================
// CALIPER — WORKERS AI CLIENT BINDING (Phase R1 / Rule Zero)
//
// Provides WorkersAIBinding calling real Cloudflare Workers AI inference network.
// In Workers runtime, uses native env.AI.
// In Node / test harness, connects via Cloudflare REST API with Wrangler credentials.
// =============================================================================

import { WorkersAIBinding } from "./modelRetrieval";

export function createWorkersAIClient(options: { accountId?: string; apiToken?: string } = {}): WorkersAIBinding {
  let token = options.apiToken || (typeof process !== "undefined" ? process.env?.CLOUDFLARE_API_TOKEN : "") || "";
  let accountId = options.accountId || (typeof process !== "undefined" ? process.env?.CLOUDFLARE_ACCOUNT_ID : "") || "e821c95d30cd134e043d084605f384b6";

  if (!token && typeof process !== "undefined") {
    try {
      // In Node test harness, read token from default.toml
      // Use dynamic require / import to avoid bundling node:fs in workers build
      const fs = (globalThis as any).process?.getBuiltinModule ? (globalThis as any).process.getBuiltinModule("fs") : null;
      if (fs) {
        const defaultToml = fs.readFileSync("C:\\Users\\User\\.wrangler\\config\\default.toml", "utf8");
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

  if (typeof process !== "undefined" && process.env) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  return {
    async run(model: string, input: { text: string | string[] }) {
      const texts = Array.isArray(input.text) ? input.text : [input.text];
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: texts }),
      });

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
