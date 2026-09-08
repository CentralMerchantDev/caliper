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

export function parseWranglerOauthToken(config: string, now = Date.now()): string | null {
  const tokenMatch = config.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!tokenMatch) return null;

  const expirationMatch = config.match(/expiration_time\s*=\s*"([^"]+)"/);
  if (!expirationMatch) {
    throw new Error("Wrangler OAuth token was found, but its expiration_time is missing. Run `npx wrangler login` before live inference.");
  }

  const expirationTime = Date.parse(expirationMatch[1]);
  if (!Number.isFinite(expirationTime) || expirationTime <= now) {
    throw new Error("Wrangler OAuth token is expired. Run `npx wrangler login` before live inference.");
  }
  return tokenMatch[1];
}

function isCertificateVerificationError(error: unknown): boolean {
  const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code || (error as { code?: string })?.code;
  return new Set(["SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT", "CERT_HAS_EXPIRED"]).has(code || "");
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
        token = parseWranglerOauthToken(defaultToml) || "";
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Wrangler OAuth token")) throw error;
      // A missing or unreadable file is handled by the explicit missing-token error below.
    }
  }

  if (!token) {
    throw new Error("No Cloudflare authentication token found. Set CLOUDFLARE_API_TOKEN or configure Wrangler credentials.");
  }

  return {
    async run(model: string, input: { text: string | string[] }) {
      const texts = Array.isArray(input.text) ? input.text : [input.text];
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: texts }),
        });
      } catch (error) {
        if (isCertificateVerificationError(error)) {
          throw new Error(
            "Workers AI TLS certificate verification failed. Set NODE_USE_SYSTEM_CA=1 before starting Node so it uses the operating-system CA store; never disable certificate verification.",
            { cause: error }
          );
        }
        throw error;
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
