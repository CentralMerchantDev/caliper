# Finish the build and deploy it live

Picks up from the overnight run. Chunks 1, 3, 4, 5, 6 are done and committed. This finishes
chunks 2, 7 and 8 and puts the whole thing live.

---

## Spend rule

**Everything here is free.** Building, testing and deploying cost nothing — Workers hosting is
free and no stage in this brief calls a model.

**One paid step, at the very end, and only after Mark approves it:** a single live pipeline run,
about $0.15, to prove the whole thing works end to end. Build up to it, state the exact cost, and
**wait for his go-ahead.** Do not run it on your own judgement.

---

## 1 — Confidentiality, before anything else

If the earlier prompt's fix is already deployed, verify it and move on. If not, finish it:
`public/index.html` was serving `llm-control-layer`, `SQ.FT` and `Codex` publicly. Sanitise, re-scan
**every served asset** as well as the repo, paste the raw scan output, deploy.

Standing rule from here: no internal identifier from any other project enters this repo, any served
page, or any commit message.

---

## 2 — Chunk 7: Gate 1 as a conversation

Before any code is written, the visitor sees:

- What the grounding stage found in the **real current code**.
- What the system proposes to build, and what it will not touch.
- The acceptance criteria it will be judged against.
- **What it cannot do and why** — citing the actual constraint, with concrete alternatives.
- The estimated cost against the per-run budget, and a smaller version if the request exceeds it.

Three actions: **approve**, **reject**, or **reply in free text**. A reply re-grounds and re-plans
against what the visitor said. The gate never advances on silence, never times out into proceeding,
and persists so a run resumes cleanly.

This is the centre of the app. "I could do that, but not within one run's budget — here is what I
can do instead" is the single most credible moment it can produce, and it is the thing that
separates it from every demo that says yes to everything.

---

## 3 — Chunk 8: the app UI

**`public/index.html` is still wired to the deprecated v1 pipeline** — three references to the old
routes, none to `/change-run`. This is catch-up to a backend it was never updated for, not a
restyle. Budget accordingly.

The page becomes a workspace:

- **The world, large, running, central** — the architectural-plan renderer from chunk 1/3.
- **A free-text request box**, with framing copy: this is a shared world, add something to it.
- **The pipeline streaming stage by stage** beside it, nothing shifting once on screen.
- **Diffs** syntax-highlighted, before and after, changed lines marked.
- **Review findings anchored to the code** they refer to, grouped by **root cause** — the count of
  distinct causes is the headline, never raw finding count, which rewards fragmenting one problem
  into four.
- **Gate 1 and Gate 2 as real decision moments** with weight, not toasts.
- **The ledger**: what was caught, by which stage, at what cost.
- The essay sections (the cost experiment, methodology) move behind the app, as supporting
  evidence for anyone who scrolls.

Palette and type from DATUM and the portfolio. Carry every accessibility fix — `--muted:#6E5E49`,
`--line-strong` on control borders, `:focus-visible` on `--accent`. Works at 375px. Meaningful
content within a second. **WCAG AA verified by computing contrast ratios, not by eye.**

---

## 4 — Chunk 2: the intro

A sibling to DATUM's, not a copy: linework assembling into the world, then seating into the page
header and continuing to live there.

Carry over every lesson from DATUM exactly: **~4 seconds**; **skip button visible from the first
frame** (44px, real button, "Skip intro", no fade-in); the **reveal watchdog** — if no painted frame
is confirmed within ~1s, seat it immediately, so a blocked CDN or dead WebGL context can never
leave a frozen curtain over the page; `prefers-reduced-motion` skips the flight entirely; repeat
visits skip via `sessionStorage`.

Build it last. If it is not working well, ship without it rather than shipping it rough — the world
itself is the visual, the intro is the frame.

---

## 5 — Controls, wired and verified by forcing them

All already written. Wire to the new paths and verify by forcing each limit, **not by reading code**:

- Per-run ceiling, aborting mid-run, re-derived for the new routing (~$0.15, not $0.35).
- Per-stage token caps. Per-IP daily live-run limit of 2, bypassed only by a valid `?k=` code.
- Global daily $2.00, weekly $7.00, monthly $20.00 across both vendors, checked **before** a run.
- Concurrency limit, input guard on the free-text request, circuit breaker.
- Generated code only in the Dynamic Workers sandbox — no network, no bindings, hard CPU cap.
  Rendered output in `<iframe sandbox="allow-scripts">` without `allow-same-origin`.
- **The spend counter must be atomic.** KV is eventually consistent and can be raced — move it to a
  Durable Object. A cap that can be raced is not a cap.
- A cap being hit explains the design rather than erroring.

Apply the routing changes now: Haiku grounds, Sonnet plans, Haiku implements, Sonnet fixes,
`gpt-5.3-codex` reviews, Haiku retrospects. **No Opus on any path**, and remove it from the
worst-case estimates.

---

## 6 — Deploy and verify live

`wrangler deploy`, not `wrangler dev`. Then verify against the **deployed URL**:

- The world page returns the world, not an index.html fallback. (`/world.html` and `/` returned
  byte-identical content earlier — the asset layer falls back silently, so check by content, not
  by status code.)
- The intro plays and can be skipped from the first frame.
- The world renders and animates.
- The request box accepts input and reaches Gate 1.
- Every control refuses when forced.
- No internal identifiers anywhere in the served HTML or JS.

Paste the raw verification output.

---

## 7 — Then stop and report

Report: what is live, the URL, what you verified and how, anything parked, and **the exact cost of
the one live proof run** — then wait for Mark's go-ahead before spending it.

---

## How to work

Ground before acting; re-read the current source before each chunk. One chunk at a time, committed
separately. Verify by running, not reading — show the command and its output. Every guardrail needs
a test that plants a deliberate violation and asserts it fails. Never stall: park a blocked chunk
and move on. Fail closed — anywhere a missing, empty or timed-out signal could read as a pass, it
must read as a failure. Never bulk-delete; move aside to a review folder.

**A weak version of a capability is worse than no version.** Cut scope, never quality within a
capability.
