# CALIPER — handoff

Read this first. It is the current state of the project, what is broken, and what is left.

**Before starting anything, verify current state against the code and against the deployed URL.**
Parts of this may already be done. Re-read the source before acting on any claim here.

---

## What this is

`caliper.markfrasertoronto.workers.dev` — a job-application artifact for **applied-AI roles**. A
shared 3D neighbourhood that a visitor asks to change. A real pipeline grounds the request against
the actual source, plans it, **parks at a human gate**, implements, verifies in a Cloudflare
Dynamic Workers sandbox, has it reviewed by a different vendor's model, then ships or refuses.

The argument it makes: **a system that only says yes when yes is true.**

Repo: `C:\Code\sandbox-spike`. **It is private and stays private.**

---

## State

**Working:**

- Grounding, planning and the human gate. These perform well — grounding catches false premises and
  offers concrete alternatives.
- A recorded canonical run plays back on arrival, honestly labelled, with a live path offered
  alongside it.
- The world: type registry plus placement list, 3D and 2D plan views, day/night cycle, CC0 HDRI
  lighting.
- 170+ tests, regression suite 9/9.

**Broken — this is the blocker:**

Every live run dies at implement with:

```
implement failed: Code generation from strings disallowed for this context
```

**Diagnosis:** something in the world-edit apply path calls `eval()` or `new Function()`. workerd
forbids it. The likely site is the applier in `src/worldEdit.ts` / `src/worldStructure.ts` — edits
are applied by splicing JSON into sentinel-marked regions of the real source text, and the patched
source then has to be evaluated to produce a world object for validation.

**Why it was never caught: the test suite runs in Node under vitest; production runs in workerd.**
Every Workers restriction is invisible to the suite. This is the systemic defect, not just the eval
call.

Second, smaller: `op[0] overridePlacement: "overridesJson" is missing` — the schema requires a field
the model is not reliably supplying. Schema and prompt disagree.

---

## Lane split

### Codex — the runtime and the pipeline

1. **Find every dynamic-code-evaluation site** reachable from a request handler. List file and line.
2. **Remove the need for it, do not work around it.** The world is already a data model. Applying an
   edit should mutate a data structure and serialize it — never round-trip through source text that
   has to be evaluated. Source text should be generated from data, not parsed back out of it. Keep
   every existing validation guarantee: an edit naming a type that does not exist, or a malformed
   entry, is rejected before anything is applied.
3. **Move handler-path tests onto the Workers runtime** with `@cloudflare/vitest-pool-workers`.
   Confirm the eval failure reproduces there before the fix and passes after. A suite that cannot
   catch this class of bug is the real defect.
4. **Fix the `overridesJson` mismatch** — schema and prompt must agree, and a missing required field
   must be a clean validation rejection, not a runtime failure.
5. **Add a kill switch for the live-run path** — an env flag that hides the live button and presents
   the recording and history as the artifact, deployable in one push. See "Safety valve" below.

### Antigravity — the page

Verify what is already done first; some of this may have landed.

1. **Mobile, properly.** 375px and 390px, judged visually, not by CSS audit. The world legible and
   worth looking at. The action bar reachable without covering the run log. Stage output readable in
   a narrow column. The nav must not eat a third of the first screen — it currently wraps to two
   rows. Tap targets 44px minimum. Walk the whole journey on a phone-sized viewport: land, watch the
   recording, open the history, switch views.
2. **The first screen.** A stranger gives this fifteen seconds and currently gets a headline, a
   paragraph and an orientation panel before anything moves. Something alive and evidently real must
   be visible in the first screenful, desktop and mobile. Do not add a splash — the world is already
   alive, put it where it can be seen.
3. **A run history tab.** Real runs only — **do not manufacture a refusal or stage a failure.** One
   row per run: date, what was asked in the system's own summarised words, and the outcome, with a
   one-line reason. **Never display raw visitor-typed text** — this is a public page carrying
   strangers' keyboard input. Keep it vague on method: outcomes and reasons, not transcripts or
   internals. Backfill from runs already in KV. Secondary to the world, in its own tab.
4. **Close the page.** It has no ask. Add one short block: he is looking for **applied-AI roles**,
   reachable at **mark@fhinc.ca**, with links to the résumé, the portfolio and DATUM. No
   call-to-action language. State it and stop.
5. **Materials — textures yes, models no.** CC0 textures from Poly Haven for floors, walls, ground
   and paths, vendored small with licence and checksum recorded as was done for the HDRI. Material
   definition driven from the registry so a new type still gets a sensible default. Fill the shop and
   the workshop, which are empty rooms — that is two placements, which is now just data.
   **No GLTF model packs.** Not Kenney, not Quaternius, not any asset library. The page's stated
   limits include having no art asset pipeline, and those limits are what its refusals rest on —
   importing models makes a claim on the page untrue. It also breaks the registry's primitive-recipe
   model, which is what makes adding a new object type cheap and verifiable.
6. **The copy, last**, so nothing is written twice. Mark's verdict on an earlier version was that it
   sounded fake and written by AI. Write against that. Plain declarative sentences. No
   em-dash-balanced clauses, no triads, no "not X, but Y", no rhetorical questions. Lead with what it
   does; state a limit once and move on. Cut any sentence that could be deleted without loss. Read
   every sentence aloud. **Spell-check every word.** And check every number on the page against what
   has actually been measured — one completed run means no rate can be published.

---

## Safety valve — decide before sending

The page currently invites a stranger to spend real money and watch the live path fail. If the eval
bug is not fixed by the time this goes out, **turn the live path off**. The recording and the
history are real and stand on their own. Say plainly that the recording is the artifact.

Do not gamble the page on a cold live run completing in front of someone deciding whether to
interview him.

---

## Standing rules — all lanes

- **Zero Anthropic or OpenAI spend.** Everything remaining is deterministic. If a paid call seems
  necessary, stop and ask.
- **The nine regression checks pass 9/9, unedited.** If one cannot survive a change, stop and report
  rather than editing it.
- **Never touch `tick`, `chooseAction` or `applyAction`.**
- **Fail closed.** Anywhere a missing, empty or timed-out signal could read as a pass, it must read
  as a failure. Nine instances of the opposite are on record in this codebase — the most recent was
  a route missing from `run_worker_first` in `wrangler.jsonc`, so every Retry click was served
  `index.html` with HTTP 200 and silently did nothing.
- **Never delete.** Move aside to `_TO-DELETE/<reason>/`.
- **No internal identifiers** from any other project in this repo, on any served page, or in any
  commit message. No model names on the visitor-facing page.
- **Verify by running against the deployed URL, not by reading code.** Paste raw output.
- **Do not consume or advance Mark's parked runs.**
- One task at a time, committed separately.

---

## Facts worth having

- Deploy: `npx wrangler deploy` from the repo root. Not `wrangler dev`.
- Live selftest: `/sim-selftest` runs the real regression suite in the real sandbox.
- Spend caps: 3 live runs per IP per day; $2 daily, $7 weekly, $20 monthly across both vendors,
  atomic via a Durable Object because KV can be raced.
- Per-run ceiling: $0.14 data-edit path, $0.23 source-edit path. Real runs land $0.04–0.08.
- Anthropic structured outputs reject `enum` combined with `type: ["string","null"]`. Use
  `anyOf: [{type:"string", enum:[...]}, {type:"null"}]`. A schema-audit test enforces this.
- 4xx errors are permanent. Do not retry them.
- `cpuMs` in Dynamic Workers has a ~2 second enforcement floor regardless of configuration.
- Cloudflare hard-caps a single subrequest near 90–100 seconds. Per-stage timeout is 85s.

---

## Definition of done

A stranger opens the link on a phone, sees something real and alive immediately, watches a genuine
recorded run, can look at a history of what has actually happened, understands what it does without
being coached, and knows who built it and how to reach him. Every word spelled correctly. Every
number true.

Then it goes in an email.
