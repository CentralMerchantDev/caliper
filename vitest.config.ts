import path from "node:path";
import { cloudflarePool, cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Wrangler's debug log defaults to the user profile, which is deliberately
// unwritable in hermetic CI/sandbox runs. Tests do not need a disk log.
process.env.WRANGLER_LOG ??= "none";

// SDB-1 (PLAN.md §6): the same migration file production applies, read once
// here in Node and handed into the worker as a plain-JSON binding -- the
// `migrations/` directory itself is not reachable from inside workerd, so
// `applyD1Migrations` (test/applyD1Migrations.workers-setup.ts) cannot read
// it directly the way `wrangler d1 migrations apply` does.
const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
const poolOptions = {
  wrangler: { configPath: "./wrangler.jsonc" },
  miniflare: {
    bindings: { TEST_D1_MIGRATIONS: migrations },
  },
};

export default defineConfig({
  logLevel: "error",
  plugins: [cloudflareTest(poolOptions)],
  test: {
    include: ["test/**/*.workers.test.ts"],
    setupFiles: ["./test/applyD1Migrations.workers-setup.ts"],
    pool: cloudflarePool(poolOptions),
  },
});
