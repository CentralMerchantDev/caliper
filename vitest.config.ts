import { cloudflarePool, cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Wrangler's debug log defaults to the user profile, which is deliberately
// unwritable in hermetic CI/sandbox runs. Tests do not need a disk log.
process.env.WRANGLER_LOG ??= "none";

export default defineConfig({
  logLevel: "error",
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    include: ["test/**/*.workers.test.ts"],
    pool: cloudflarePool({ wrangler: { configPath: "./wrangler.jsonc" } }),
  },
});
