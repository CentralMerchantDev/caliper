import { defineConfig } from "@playwright/test";

// Real-browser layout tests -- getBoundingClientRect() needs a real CSS box
// model, which Node's test runner doesn't have (see test/run.mjs's own
// comment on why the unit suite is esbuild+node, not a browser). Separate
// from `npm test` (node test/run.mjs && vitest) on purpose: this spins up
// an actual Chromium via `wrangler dev`, which is heavier and slower than
// the rest of the suite and shouldn't gate every test run.
export default defineConfig({
  testDir: "./e2e",
  // wrangler dev's local miniflare instance visibly slows down and can drop
  // its inspector proxy connection ("Network connection lost") under
  // repeated full-page loads of this app's real asset payload (HDRI,
  // textures) -- observed directly developing this suite, independent of
  // Playwright (the same dev server crashed once during plain manual
  // browser testing earlier in this session too). Generous timeout + one
  // retry rides that out without masking a real regression: a genuine
  // overlap fails immediately on assertion, it doesn't time out.
  timeout: 60_000,
  retries: 1,
  // Serial: many concurrent browser contexts made the instability above
  // worse. One page at a time is slower but far more reliable here.
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8787",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
