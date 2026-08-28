#!/usr/bin/env node
// Generates public/sim-baseline.generated.js from src/simBaseline.ts's
// SIM_BASELINE_SOURCE literal -- never hand-transcribed, so the browser demo
// can never drift from the one source of truth the worker itself uses.
// Regenerate after any change to src/simBaseline.ts: node scripts/export-sim-for-browser.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, "..", "src", "simBaseline.ts");
const outPath = join(__dirname, "..", "public", "sim-baseline.generated.js");

const src = readFileSync(srcPath, "utf8");
const m = src.match(/export const SIM_BASELINE_SOURCE = `([\s\S]*)`\.trim\(\);/);
if (!m) {
  console.error("Could not find SIM_BASELINE_SOURCE in src/simBaseline.ts -- format changed, update this extractor.");
  process.exit(1);
}
const body = m[1].trim();

const header =
  "// GENERATED FILE -- do not hand-edit. Regenerate with:\n" +
  "//   node scripts/export-sim-for-browser.mjs\n" +
  "// Mechanically extracted from src/simBaseline.ts's SIM_BASELINE_SOURCE so the\n" +
  "// browser demo runs the exact same logic as the worker, never a hand copy.\n\n";
const footer = "\n\nexport { initialWorld, chooseAction, applyAction, tick };\n";

writeFileSync(outPath, header + body + footer, "utf8");
console.log(`Wrote ${outPath} (${body.length} chars extracted from simBaseline.ts)`);
