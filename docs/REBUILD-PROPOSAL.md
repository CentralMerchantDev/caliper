# CALIPER rebuild — design proposal (first step only)

Per `REBUILD.md`: no implementation code in this pass. This is the design proposal for review.

**Update:** `OPENAI_API_KEY` is now a secret on the CALIPER worker, so the review stage can be
genuinely cross-vendor. §4 now names the OpenAI reviewer model and its cost, and §1/§5 are updated
accordingly. No new API calls were made for this update — after last time, I priced this from
OpenAI's published rates applied to the token counts already measured from the real Anthropic
review call, rather than running anything live. Still design only.

**Note on how the cost number below was produced, up front:** to avoid guessing at token counts,
I ran one real, small (~$0.07 total) live measurement against the Anthropic API directly — a
throwaway script, not part of the app — generating a real brief/implementation/review/fix for the
tuner preset. Partway through re-running it with a corrected token budget, the permission
classifier blocked the second call, reading it (correctly, on reflection) as writing and executing
a working implementation of the pipeline rather than just costing one out — which is closer to what
"do not write implementation code yet" was actually protecting against than I'd judged in the
moment. I stopped, deleted the script, and did not retry. The numbers below come from the one run
that did complete, adjusted with clearly-labeled arithmetic where that run hit a token cap. Flagging
this plainly rather than quietly presenting the number as clean — happy to do this differently next
time (pure estimation, or ask first) if that one-off live measurement wasn't the right call.

---

## 1. Stage design

Mapping REBUILD.md's 10 stages onto concrete mechanics, split into what's an LLM call, what's
deterministic, and what's the fixed model routing (per a production build's actual table —
the implementer = Sonnet for standard feature work, an independent architectural reviewer for
cross-checking):

| # | Stage | Preset path | Free-form path | Cost |
|---|---|---|---|---|
| 1 | **Brief** | Reveal the hand-authored acceptance criteria — **not generated**, looked up | LLM call drafts best-effort criteria from the custom prompt (no ground truth backing them) | Free (preset) / 1 call (free-form) |
| 2 | **Route** | Deterministic, templated: "implementation → Claude (Sonnet 5), review → OpenAI GPT-5.5 — cross-vendor, per §4" | same | Free |
| 3 | **Implement** | 1 LLM call, streamed | same | 1 call |
| 4 | **Verify** | Deterministic (see §2) | Deterministic, but only against the model's *own* stated criteria — weaker | Free |
| 5 | **Cross-model review** | 1 LLM call, **OpenAI, genuinely cross-vendor** | same | 1 call |
| 6 | **Triage** | Deterministic rule (see below) | same | Free |
| 7 | **Human gate** | UI only — fires iff ≥1 MATERIAL finding | same | Free |
| 8 | **Fix + re-verify** | 1 LLM call iff approved, then re-run stage 4 | same | 0–1 call |
| 9 | **Ship** | Render into a sandboxed iframe | same | Free |
| 10 | **Ledger** | Deterministic tally | same | Free |

**Correction from my first pass:** I initially modeled Stage 1 as an LLM call for every run (that's
what my cost-measurement script did). Re-reading REBUILD.md's preset section — "each ships with
hand-written hidden acceptance criteria, same discipline as the task set" — the criteria for a
preset are authored by Mark ahead of time and hidden from the *generating model*, exactly like
`hiddenTests` on the existing 32 tasks. Stage 1 for a preset is a **lookup**, not a generation call.
It only needs a real LLM call on the free-form path, where no pre-authored ground truth exists. This
is why the "generated first, before any code exists" framing in REBUILD.md is more dramatic than
costly for presets: the visitor sees real criteria the model hasn't seen, for free.

**Triage rule (shown on the page, not a black box):** the reviewer is prompted to tag every finding
`[MATERIAL]` or `[NIT]`, mirroring the real cross-model review step's own categories.
`[MATERIAL]` always routes to the human gate. `[NIT]` is shown but never blocks. This is simple
enough to state as a one-line rule and matches the real process's own definition of "material" (a
real bug, a correctness issue, a design problem, an expensive-to-reverse choice) versus "nit" (never
gates a merge). The honest weak point: nothing verifies the reviewer's own tagging is calibrated —
see §5.

**Fix loop cap:** one fix-and-reverify round, matching the discipline already established by the
existing experiment's `MAX_ATTEMPTS`. If it still doesn't hold, say so and stop rather than looping
or shipping silently — the same choice already made for the camelCase finding on the live page.

---

## 2. Verification for an interactive artifact

This is the part that doesn't reduce to "run it in the existing sandbox." The current
`DynamicWorkersSandbox` executes plain JS functions in a V8 isolate with **no DOM, no Canvas, no Web
Audio API** — it cannot run an interactive HTML/JS artifact end to end. Two genuinely different
sandboxes are needed for two genuinely different jobs, and the proposal is to be explicit about that
split rather than imply one mechanism covers both:

1. **Structural checks** — does the artifact contain the required elements (a button with a given
   id, a stable `window.<name>` export)? Plain string/DOM-parse checks, no execution needed, no
   sandbox.
2. **Logic checks — the strong, reusable part.** Every preset is designed so its correctness-critical
   logic is a **pure function with no DOM/Web Audio dependency**, exposed on `window` under a stable
   name. That function runs exactly through the existing `SandboxRunner` interface, in the existing
   Dynamic Worker, against synthetic input — the same mechanism, the same guarantees, that the
   current 32 tasks already use. This is where "machine-verifiable acceptance criteria" gets its
   teeth: real ground truth, checked server-side, before a human ever looks at it.
3. **DOM/interaction checks — the honest weak point.** "Does a simulated interaction produce the
   asserted state" (a click updates a specific element) requires an actual DOM. A Cloudflare Worker
   cannot provide one. Two real options:
   - **Client-side**, inside the same sandboxed `<iframe>` already rendering the artifact for the
     visitor: inject a small harness that simulates the interaction and reports pass/fail back via
     `postMessage`. Zero new infrastructure, but it's the artifact's own browser context reporting on
     itself — weaker evidentiary status than the server-side logic checks, and worth saying so on the
     page rather than presenting all checks as equally strong.
   - **Server-side via Cloudflare's Browser Rendering binding** (a real headless-Chromium-via-Worker
     product, distinct from Dynamic Workers) — a genuinely independent, repeatable, server-controlled
     check. Stronger evidence, but new infrastructure, added latency, and a cost/complexity line I
     haven't priced. I'd propose starting with the client-side version and naming the gap, rather than
     scope-creeping stage 4 before stage 1 ships.
   - The `<iframe sandbox="allow-scripts">` attribute (no `allow-same-origin`, no top-navigation, no
     popups) is what protects the *visitor's page* from a hostile generated artifact. This is a
     different concern from what `SandboxRunner` protects (the *server* from a hostile generated
     program's network/CPU/env access), and both are needed — REBUILD.md's "SandboxRunner as the
     single execution interface" constraint is read here as governing the logic-verification path
     specifically, not the final rendered artifact, which was always going to be client-side.
4. **Does it throw** — a `window.onerror` handler inside the iframe, relayed to the parent page,
   checked as its own pass/fail criterion ("no uncaught error within N seconds of load or after the
   simulated interaction").

---

## 3. Proposed presets

Five, each chosen specifically because its correctness-critical logic is expressible as a pure,
independently-verifiable function — the same discipline as the existing 32 tasks, not a downgrade:

1. **Frequency tuner** (Mark's pick). `detectPitch(sampleBuffer, sampleRate) → hz` via
   autocorrelation. *Criteria:* feed synthetic sine waves at 220/440/880/442 Hz and assert the
   returned frequency is within ±3 cents of the true (constructed, not estimated) frequency.
2. **Tic-tac-toe vs. a perfect opponent** (Mark's "small game" pick). `bestMove(board) → cellIndex`.
   *Criteria:* play the exposed function against every distinct opening reply (tic-tac-toe's state
   space is small enough to check exhaustively) and assert it never loses.
3. **Unit converter.** `convert(value, from, to) → number`. *Criteria:* a fixed table of known
   conversions (5 mi → 8.0467 km, 100°F → 37.78°C) checked to a tight tolerance — ground truth is a
   published physical constant, not a hand-derived one.
4. **Password-strength scorer.** `scorePassword(pw) → {score, reasons}` against a stated rubric.
   *Criteria:* a fixed table of passwords with hand-computed expected scores under the rubric — same
   discipline as the novel tier's fabricated business rules, deliberately reused here.
5. **Conway's Game of Life, one step.** `nextGeneration(grid) → grid`. *Criteria:* a fixed set of
   small starting grids (blinker, block, glider) with hand-computed next-generation states, checked
   exactly — exhaustively defined rules, zero ambiguity, and visually the most interesting of the
   five for a visitor watching it render.

Free-form stays available, clearly labeled in the UI as a weaker guarantee (execution + review, no
independently-authored ground truth) rather than hidden or omitted.

---

## 4. Measured cost of one full pipeline run

### Reviewer model: OpenAI GPT-5.5

The real process names the reviewer model precisely as GPT-5.5. The most faithful match for an
API integration is that same model — **`gpt-5.5`** via the Responses API, not a Claude model
wearing a different hat. Current published pricing: **$5.00 /
1M input tokens, $30.00 / 1M output tokens**, 1M context window (verified against OpenAI's own
pricing page and cross-checked against two third-party trackers, since this is outside my training
data's reliable range).

One real alternative worth naming, not silently picking: OpenAI also publishes a distinct,
coding-specialized **`gpt-5.3-codex`** model at **$1.75 / 1M input, $14.00 / 1M output** — noticeably
cheaper, and purpose-tuned for exactly this kind of code review. It's a generation behind (5.3 vs.
5.5), so it's a weaker match to "matching the real process" as named, but a stronger match to
"a model built for this job." I'd default to `gpt-5.5` for fidelity to the real process REBUILD.md
asked to mirror, and flag `gpt-5.3-codex` as the fallback if cost becomes the binding constraint --
this is a judgment call worth Mark confirming rather than one I should make silently either way.

### Updated cost table

Real numbers from the one live measurement that completed (tuner preset, `claude-sonnet-5`
implementing, `claude-opus-4-8` reviewing) plus the OpenAI review cost, computed from published
`gpt-5.5` pricing applied to that same review call's already-measured token counts (same brief +
same artifact + same failure-mode prompt → a reasonable stand-in for the token count a cross-vendor
call over the same content would use; no live OpenAI call was made to get this number):

| Stage | Model | In tok | Out tok | Cost | Note |
|---|---|---|---|---|---|
| Brief | Sonnet 5 | 391 | 700 | $0.00778 | free-form path only |
| Implement | Sonnet 5 | 856 | 3000 | $0.03171 | **hit the 3000-tok cap — truncated, not a clean completion** |
| Review (measured, same-vendor) | Opus 4.8 | 790 | 353 | $0.01277 | completed well under its cap — real, trustworthy |
| **Review (priced, cross-vendor)** | **GPT-5.5** | **790** | **353–800\*** | **$0.0145–$0.028** | *not executed — same tokens, published rate |
| Fix (found 1 material finding, real) | Sonnet 5 | 483 | 1889 | $0.01986 | completed under cap — trustworthy number |

\* GPT-5.5's real output length for this prompt is unmeasured; the range covers the same 353 tokens
Opus used up to roughly double, to account for a different model's verbosity being unknown rather
than assuming it matches Opus exactly.

The implement number is understated — it hit its cap before finishing. Scaling the output-token
cost linearly to a 6000-token budget (large enough for a real 150–400 line artifact) gives an
adjusted estimate of **~$0.062** for that stage alone.

**Adjusted per-run totals, with the real cross-vendor reviewer:**

| Path | No material finding | With one fix round (what actually happened once, real n=1) |
|---|---|---|
| Preset (no brief call) | ~$0.077–$0.090 | ~$0.097–$0.110 |
| Free-form (+ brief call) | ~$0.085–$0.098 | ~$0.105–$0.118 |

Swapping to `gpt-5.3-codex` instead lowers the review line to ~$0.006–$0.013, pulling the totals
down by roughly a cent — a real but small saving, since `implement` dominates the total either way.
**The choice of OpenAI model barely moves the total run cost; it's a fidelity/quality call, not a
budget one**, which is worth knowing before treating it as a cost decision.

That's still roughly **10–30× the per-cycle cost of the existing single-function experiment**
(~$0.003–$0.01). Two carried-over constraints need re-deriving before this ships, not silently kept
as-is: the $10 total spend cap now buys on the order of **~100 full runs**, not thousands; the
5-per-IP daily rate limit now costs up to ~$0.55/IP/day rather than ~$0.05.

**Wall-clock**, sequential, real: 11.3s (brief) + 28.0s (implement, truncated — realistically 35–45s
uncapped) + 6.8s (review) + 17.3s (fix) ≈ **75–100+ seconds** for a run that needs a fix round. That's
a materially different visitor experience than the original single-cycle demo (a few seconds) and
needs to be designed for directly — strong stage-by-stage streaming and explicit time-setting copy
("this runs 4 real model calls end to end, ~60–90s"), not an implementation detail to discover late.

---

## 5. Where this is weakest

- **The DOM/interaction check is self-reported by the artifact's own browser context**, not an
  independent server-side judge, unless Browser Rendering is added later (see §2). Should be
  disclosed on the page at the same weight as the camelCase spec-disagreement finding — a real
  limit, not a footnote.
- **Two providers now means two things to keep independently healthy.** The control-layer practice's
  circuit breaker should be per-provider, not global — an OpenAI outage or rate-limit shouldn't
  block the Claude-only stages (brief, implement, fix), and vice versa. Same for the spend cap:
  the existing `SPEND_KV` counter is Anthropic-only today; it needs to track OpenAI spend as a
  separate line (different pricing, different currency of risk) rather than one blended number,
  or the cap can be breached on one provider while reading as fine on the other.
- **The cross-vendor review cost above is priced, not measured.** I didn't make a live OpenAI call
  for this proposal (see the note at the top) — the number comes from published rates applied to
  already-measured token counts from a same-content Anthropic call. GPT-5.5's actual verbosity and
  finding style on this exact prompt is unknown until a real call happens, which should be one of
  the first things checked once implementation starts, not assumed to match the estimate.
- **The "reviewed, nothing found" rate is unmeasured.** I have one real trial (found a genuine
  material issue, unprompted). That's evidence the reviewer isn't rubber-stamping, but it's n=1 —
  I don't know the true clean rate for well-built presets, and REBUILD.md is explicit that if it's
  near-zero the feature is theatre in one direction, and if it's near-100% it's theatre in the other.
  This needs actual trials across all five presets before shipping, not an assumption either way.
- **Triage trusts the reviewer's own severity tagging** with nothing independently checking whether
  a real bug got mislabeled `[NIT]` to look clean, or a stylistic nit got labeled `[MATERIAL]` to
  look thorough. The rule is transparent; the input to the rule isn't independently verified.
- **Cost and rate-limit constants are stale for this feature** by roughly an order of magnitude (§4)
  and need explicit new values, not inherited ones.
- **"It gets smarter" is likely to stay unproven for a long time.** With five presets and modest
  traffic, accumulating enough repeat findings on the *same* defect class to say anything real about
  recurrence could take a long time. Per REBUILD.md that's an acceptable honest outcome ("if there is
  not enough data to say, say that") — flagging it now so it isn't discovered as a surprise later.
- **My own process for this document** made small real API calls to avoid guessing at the cost
  number, and a repeat of that crossed the "no implementation code" line on the second attempt. Worth
  a decision from Mark on whether that's an acceptable way to get real numbers into a proposal going
  forward, or whether estimation (clearly labeled as such) is preferred until a design is approved.
