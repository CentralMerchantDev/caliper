# CALIPER

**Does a verification loop substitute for model capability, and what does it cost?**

A Cloudflare Worker that generates a JavaScript function with an LLM, runs it against hidden
tests inside an isolated sandbox, and — if it fails — shows the model exactly what broke and
lets it try again. Run across 32 tasks (three difficulty tiers) and 3 models (cheapest, mid,
frontier) to measure whether that repair loop lets a cheap model match an expensive one, and
what that costs per correct answer rather than per token.

**Live:** https://caliper.markfrasertoronto.workers.dev — read the results, or run one
cycle yourself.

## The pipeline

The live page leads with a second thing: a change pipeline. A visitor types a change in plain
English and it is **grounded** against the real source, **planned**, **parked at a human gate**,
**implemented**, **verified** by executing it in a fresh Cloudflare Dynamic Worker isolate, and
**reviewed** by a different vendor's model (Claude authors, `gpt-5.3-codex` reviews) before it
ships — or is refused. It mirrors a real cross-model build process rather than diagramming one.
See [`docs/REBUILD-PROPOSAL.md`](docs/REBUILD-PROPOSAL.md) for the design.

Two things are worth stating plainly because they are what the project is actually about:

- **Gate 2 never auto-approves.** If the reviewing model raises anything material, the run stops
  for a person. There is no branch that skips it.
- **Grounding refuses false premises.** If the request rests on something that is not true of the
  world, the pipeline says so and offers alternatives instead of confidently building the wrong
  thing.

If the live path is unavailable — a small number of runs per visitor per day, $2/day total, both enforced in
code — the page replays a real recorded run instead, labelled as a recording.

Every visitor-facing cost/rate limit is enforced in code and shown on the page, not just
documented: a per-run cost ceiling, per-stage token caps, a per-IP daily limit on live runs, a
combined daily and monthly spend cap across both model vendors, a concurrency limit, an input
guard on free-form prompts, and a per-provider circuit breaker (`src/controlLayer.ts`).

## The result, short version

The cheapest model (`claude-haiku-4-5`) matches or slightly exceeds the frontier model's
(`claude-opus-4-8`) final correctness once one or two repair rounds are in the loop, at
roughly **36–41% of the cost per correct answer** — measured four separate times across a core
set of well-specified single-function tasks, a harder tier of classic algorithm problems
(dynamic programming, graph traversal), and a novel tier of fabricated business-rule specs
invented specifically so they couldn't be recalled from training data.

That cost claim is now well-supported. It comes with a real limit that's stated on the page
and in [`docs/MATRIX-RESULTS.md`](docs/MATRIX-RESULTS.md), not left implicit:

- Every task, at all three tiers, is a single pure function, a few dozen lines at most. That
  says nothing about multi-file work, ongoing state, or ambiguous multi-step tasks.
- The harder tier is textbook algorithms (Levenshtein distance, LCS, coin change, word break,
  bipartite graphs) — solving them near-perfectly is much better explained by memorization
  than by there being no capability gap.
- The novel tier was built to rule that out: seven invented business-rule specs (one
  deliberately contradicts a real memorized formula), each with a one-line argument for why it
  can't be recalled. Every model solved every one on the first try anyway. That's real
  progress — it rules out memorization as the explanation — but "can't be recalled" isn't the
  same property as "hard enough to separate these models," and nothing built across all three
  tiers has actually been cognitively hard, only unfamiliar or technique-heavy. **The
  quality-equivalence question is still open**, for a narrower and better-argued reason than
  before.
- One task (converting `camelCase` to `snake_case`) produced a genuine, interesting failure:
  every model at every tier read an underspecified rule the same alternative way, and their
  answer is arguably *better* than the hidden test's. That's disclosed on the page as a
  finding about verification's limits, not hidden as a bug.

Full methodology, sample sizes, and the specific caveats a skeptical reader should push on are
on the page itself and in `docs/MATRIX-RESULTS.md`.

## How to run it

Needs a Cloudflare account on the **Workers Paid plan** — [Dynamic Workers](https://developers.cloudflare.com/dynamic-workers/)
(the sandboxing primitive this depends on) isn't available on the Free plan.

```bash
npm install
npx wrangler kv namespace create SPEND_KV   # creates a KV namespace in your own account
```

Copy the `id` it prints into the `kv_namespaces` entry in `wrangler.jsonc`, replacing the one
checked in here — that one points at the author's account and won't exist in yours.

For local dev, create `.dev.vars` (gitignored) with:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

The OpenAI key powers the pipeline's cross-model review stage only; everything else in the repo
runs on the Anthropic key alone. Then:

```bash
npx wrangler dev          # local dev server
npx wrangler deploy       # deploy to your own Cloudflare account
```

For a real deployment, set both as secrets instead: `npx wrangler secret put ANTHROPIC_API_KEY`
and `npx wrangler secret put OPENAI_API_KEY`.

A hard spend cap (`SPEND_CAP_USD` in `wrangler.jsonc`) is enforced in code — see
`src/spendCap.ts` — before every generation call, not just documented. A per-IP daily limit on
the page's live-run feature is enforced the same way — see `src/rateLimit.ts`.

## What's actually here

| Path | What it is |
|---|---|
| `src/index.ts` | Routes: the single-cycle API, the SSE live-run stream the page uses, the matrix runner, the security probes |
| `src/tasks.ts` | The 32 tasks (18 core + 7 harder + 7 novel), each with hidden tests the generating model never sees |
| `src/claude.ts` | The Claude API call: structured-output code generation, per-model pricing, the repair prompt |
| `src/sandbox.ts` | `SandboxRunner` — the one interface execution goes through. `DynamicWorkersSandbox` is the only implementation actually built; a Workers-for-Platforms fallback would implement the same interface without touching any caller |
| `src/attacks.ts` | Hand-written, deliberate sandbox-escape attempts (network, env/bindings, CPU, memory, recursion) — used by `/security-check`, not by real task execution |
| `src/spendCap.ts`, `src/rateLimit.ts` | The original experiment's two hard limits, both KV-backed so they survive isolate restarts |
| `src/presets.ts` | The pipeline's 5 presets: hand-authored brief, hidden acceptance criteria, structural/interaction checks |
| `src/pipeline.ts` | The brief → route → implement → verify → review → triage → gate → fix → ship → ledger orchestrator |
| `src/controlLayer.ts` | The pipeline's own cost/safety controls — entirely separate budget from `spendCap.ts` above |
| `src/openai.ts` | The GPT-5.5 cross-model review call, `[MATERIAL]`/`[NIT]` finding parser |
| `public/index.html` | The live page — single file, no build step, no framework |
| `docs/` | The actual working instructions given to the AI assistant that built this, and its results log, kept verbatim as project history rather than rewritten after the fact: the pivot from a demo to a published experiment (`BUILD.md`), the harder-tier follow-up (`NEXT.md`), the novel-tier follow-up (`NEXT-2-novel-tier.md`), the reframe-and-commit pass (`NEXT-3-final-pass.md`), the CALIPER rename and public-repo pass (`NEXT-4-caliper-rename.md`), the page brief (`PAGE.md`), the pipeline design proposal (`REBUILD-PROPOSAL.md`), and the full per-sweep results history (`MATRIX-RESULTS.md`) |
| `REBUILD.md`, `REBUILD-CONTROLS.md` | The instructions the pipeline rebuild was built from, kept verbatim at the repo root since work against them is still in progress |
| `LICENSE` | MIT |

## How the sandbox is proven, not just documented

Every generated function runs inside a Cloudflare Dynamic Worker — a fresh V8 isolate with no
bindings and no network access. That isolation was checked by writing code that deliberately
tries to escape it (`src/attacks.ts`, `GET /security-check` — authorized only, since it runs ten sandbox invocations and costs real CPU; pass `Authorization: Bearer <UNLOCK_CODE>`), run
against the real production edge, not just read about in Cloudflare's docs:

- Network access (`fetch()`) throws immediately.
- Reading `env`, `process`, or any global binding comes back empty.
- A tight CPU busy-loop, unbounded memory growth, and unbounded recursion are all caught —
  the isolate is killed outright for the first two, and the third surfaces as an ordinary
  catchable error inside the sandbox itself. None of them hang the calling request.

One measured result changed the design: the CPU limit has a floor of roughly 2–4 seconds of
real wall-clock time before it terminates a runaway isolate, regardless of how tight the
configured budget is. So the app doesn't rely on it for bounding latency — the parent Worker
imposes its own 3-second wall-clock abort on every real task-execution sandbox call instead.

## How correctness is checked, not just claimed

Every hidden test's expected value, at all three tiers, was computed from an independently
written reference implementation *before* any model ever saw the task — ground truth was
verified, not assumed. That's not only a claim on the page: the discipline is recorded next to
each tier boundary in `src/tasks.ts` (search for "reference implementation"), and every hidden
test is plain data in that same file, inspectable by anyone without running the app.

## Origin

This started as a narrower spike with one question: is Cloudflare Dynamic Workers a viable
primitive for running untrusted, model-generated code with real isolation guarantees? It was
— see the isolation results above and the full detail in `docs/MATRIX-RESULTS.md`. The first
attempt at building on top of that was a "watch a verification loop catch the model's
mistakes" demo. It didn't hold up once a capable model stopped making mistakes — see
`docs/BUILD.md` for where and why that pivoted into the actual experiment this page reports.

The project was called **sandbox-spike** during that exploratory phase and only became CALIPER
once the experiment's shape was settled. The git history and the working documents under
`docs/` (`BUILD.md`, `NEXT.md`, `NEXT-2-novel-tier.md`, `NEXT-3-final-pass.md`, `PAGE.md`) still
use the old name — they're left as written, as a record of how the project actually developed,
rather than edited after the fact to look like it was always called CALIPER.
