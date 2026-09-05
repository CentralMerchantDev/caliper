// I5's SUPERVISED LIVE CALL. Mark runs this by hand; nothing else does.
//
// Every other file this session added (public/run-generate-request.js,
// public/model-caller.js) is stub-proven and calls nothing. This is the one
// place that can spend money, on purpose, and it exists ONLY so a single
// supervised run can happen before anything is wired into the live app.
//
// SAFETY, IN LAYERS, EACH INDEPENDENTLY SUFFICIENT:
//   1. It is a script, not a route -- nothing on the live page can reach it.
//   2. It refuses immediately if ANTHROPIC_API_KEY is not set.
//   3. It refuses immediately unless --confirm is passed, so a script run
//      by habit (tab-completed, re-run from history) does not spend by
//      accident either.
//   4. It prints the prompt BEFORE calling anything, and asks on the
//      terminal for a final go-ahead unless --yes is also passed.
//
//   USAGE
//     ANTHROPIC_API_KEY=sk-... node scripts/supervised-generate.mjs \
//       --address <a real plotId, e.g. from the seed you pass> \
//       --text "add a small shed" \
//       --w 3 --d 3 \
//       --seed default \
//       --confirm
//
//   WHAT TO LOOK FOR
//     - The PROMPT block, printed before any call: confirm the constraints
//       (footprint, support, clearance) are the ones you expect for this
//       plot, and that "instructions" is your own text, verbatim.
//     - The RAW RESPONSE block: read it. This is what the model actually
//       wrote, unfiltered, before verification touches it.
//     - The VERDICT: `ok: true` with a triangle/vertex count means it
//       passed determinism, footprint and compile checks against the SAME
//       numbers the prompt asked for, not anything the response claimed
//       about itself. `ok: false` names the stage and reason it failed at.
//     - Token usage and an estimated cost, printed last, from the API
//       response's own usage block -- not a guess.
//
//   This script does not register the model, apply it as a layer, or touch
//   any stored world. That join (public/apply-and-persist.js,
//   public/model-registry.js) is already built and stub-proven
//   (test/runGenerateRequest.test.ts's third test) -- wiring a REAL verified
//   result through it live is deliberately a separate, later step, so a bad
//   first call cannot leave a half-applied edit anywhere.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import readline from "node:readline";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
/** Dynamic import() requires a file:// URL on Windows -- a raw "C:\..." path throws ERR_UNSUPPORTED_ESM_URL_SCHEME. */
const importPublic = (...parts) => import(pathToFileURL(join(ROOT, "public", ...parts)).href);

function parseArgs(argv) {
  const out = { seed: "default", w: null, d: null, confirm: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--address") out.address = argv[++i];
    else if (a === "--text") out.text = argv[++i];
    else if (a === "--w") out.w = Number(argv[++i]);
    else if (a === "--d") out.d = Number(argv[++i]);
    else if (a === "--seed") out.seed = argv[++i];
    else if (a === "--confirm") out.confirm = true;
    else if (a === "--yes") out.yes = true;
  }
  return out;
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return answer;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set. Refusing -- this script never calls a model without an explicit key.");
    process.exit(1);
  }
  if (!args.confirm) {
    console.error("Refusing: pass --confirm to run this for real. (Safety layer 3 -- see this file's own header.)");
    process.exit(1);
  }
  if (!args.address || !args.text || !args.w || !args.d) {
    console.error("Usage: ANTHROPIC_API_KEY=sk-... node scripts/supervised-generate.mjs --address <plotId> --text \"...\" --w <metres> --d <metres> [--seed <name>] --confirm [--yes]");
    process.exit(1);
  }

  const { createWorld } = await importPublic("world.js");
  const { createGround } = await importPublic("ground.js");
  const { requirements } = await importPublic("transform.js");
  const { runGenerateRequest } = await importPublic("run-generate-request.js");
  const { makeHeightAt } = await importPublic("terrain.js");
  const THREE = await importPublic("vendor", "three", "three.module.min.js");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;

  const instance = createWorld({ seed: args.seed });
  const plot = instance.plan.plots.find((p) => p.id === args.address);
  if (!plot) {
    console.error(`No plot "${args.address}" in the world built for seed "${args.seed}". Pick a real plot id from that seed's plan.`);
    process.exit(1);
  }

  const heightAt = makeHeightAt(instance.land);
  const land = createGround({ heightAt });
  const subject = {
    id: plot.id, label: plot.className.toLowerCase(),
    x: (plot.xMin + plot.xMax) / 2, z: (plot.zMin + plot.zMax) / 2,
    footprint: { w: plot.width, d: plot.depth },
  };
  const want = { label: args.text, ...requirements({ footprint: { w: args.w, d: args.d }, support: "ground" }) };
  const request = { address: args.address, text: args.text };

  const evaluate = (src) => new Function(`"use strict"; return (${src});`)();

  // BUILT, PRINTED, NEVER CALLED WITHOUT THE TERMINAL CONFIRMATION BELOW.
  let promptSeen = null;
  const previewCaller = async (prompt) => { promptSeen = prompt; return null; };
  await runGenerateRequest({ subject, want, request, land, caller: previewCaller, evaluate, THREE });

  if (!promptSeen) {
    console.error("The transform was refused before a prompt was even built -- nothing to call. Re-check --address/--w/--d against the real plot.");
    process.exit(1);
  }
  console.log("PROMPT (sent to the model, nothing has been called yet):");
  console.log(JSON.stringify(promptSeen, null, 2));

  if (!args.yes) {
    const answer = await ask("\nProceed with a REAL, SPEND-INCURRING call to Anthropic? [y/N] ");
    if (answer.trim().toLowerCase() !== "y") {
      console.log("Aborted -- nothing was called.");
      process.exit(0);
    }
  }

  const client = new Anthropic({ apiKey });
  const model = "claude-sonnet-5";
  const systemPrompt =
    "You write a single JavaScript arrow function `(T) => T.Geometry_or_similar`, " +
    "given a THREE.js-like namespace `T`, that returns a THREE geometry. " +
    "Output ONLY the function expression, no markdown fences, no explanation.";
  const userPrompt =
    `Build geometry for: ${promptSeen.instructions}\n` +
    `Footprint: ${promptSeen.constraints.footprint.w} x ${promptSeen.constraints.footprint.d} m.\n` +
    (promptSeen.constraints.support ? `Support: ${promptSeen.constraints.support}.\n` : "") +
    (promptSeen.constraints.clearanceM ? `Clearance: ${promptSeen.constraints.clearanceM} m.\n` : "");

  const response = await client.messages.create({
    model, max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const rawText = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  console.log("\nRAW RESPONSE:");
  console.log(rawText);

  const source = rawText.trim().replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  const realCaller = async () => source;
  const result = await runGenerateRequest({ subject, want, request, land, caller: realCaller, evaluate, THREE });

  console.log("\nVERDICT:");
  console.log(JSON.stringify(result.verdict, null, 2));

  const usage = response.usage;
  if (usage) {
    console.log("\nTOKEN USAGE (from the API response, not estimated):");
    console.log(JSON.stringify(usage, null, 2));
  }
}

main().catch((err) => {
  console.error("supervised-generate.mjs failed:", err && err.stack ? err.stack : err);
  process.exit(1);
});
