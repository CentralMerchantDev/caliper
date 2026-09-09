# OVERNIGHT BRIEF — BLD LANE — 2026-09-09

Follows `docs/LANE-BRIEF-TEMPLATE.md` (which item zero brings onto this branch).
Every claim in this document is a claim: check it, and contradict it in writing
where it is wrong.

---

## 1. WHERE

`C:\Code\sandbox-spike-codex`, branch `codex-lane`. Confirm the branch before
touching anything. Two terminals look identical.

You are the **hub** for an unattended overnight run. Mark is asleep and reviews
in the morning. You are architect, editor and technical co-founder: you scope
work, hand it to specialist subagents, run what comes back through the build
loop, and send it back when it is not right. You are also the **auditor**,
because nobody else is awake.

---

## 2. ITEM ZERO — two documents on this branch are missing or wrong

Take all three documents from `b1-land` by path. No cherry-pick, no hashes, no
conflict — a file-level checkout of documentation only:

```
git checkout b1-land -- docs/OVERNIGHT-RUN.md docs/LANE-BRIEF-TEMPLATE.md docs/BUILD-LOOP.md
git status --porcelain
```

Confirm with `git status` that **only those three paths** changed. If anything
else moved, stop and report it.

**a. `docs/OVERNIGHT-RUN.md` and `docs/LANE-BRIEF-TEMPLATE.md` do not exist on
this branch at all.** The first is tonight's operating manual and you cannot
work without it.

**b. `docs/BUILD-LOOP.md` on this branch is stale in a way that will actively
mislead you.** Its guards section still says the default world *"must stay
byte-identical at seed 0, pinned at sha256 `418744f1...`"*. That pin is
obsolete: the other lane's B1 archipelago redesign legitimately changed the
terrain and correctly updated the real constant in `test/worldSeed.test.ts`. The
version you are checking out removes the hardcoded value and explains why a
process document must not carry a data value a future phase is expected to
change — Failure pattern B, living inside the document that defines the process.

Read that diff before committing, so you understand what changed. **Do not treat
the world's seed hash as a guard failure tonight.**

Commit all three, plus this brief, as one documentation commit before any real
work.

---

## 3. READ FIRST — in this order

- `docs/OVERNIGHT-RUN.md` — tonight's operating manual. The hub role, the
  verbatim subagent contract, the three moments of a subagent, the hub's own
  rules, the decision queue, the handover format.
- `docs/MODULE-MAP.md` — **before proposing to build anything.** This branch has
  it; `b1-land` does not, which is worth knowing. Nine capabilities in this
  repository were built that already existed or were never connected.
- `CLAUDE.md`
- `docs/BUILD-LOOP.md` — the corrected copy, eleven numbered steps.
- `docs/UMAA-CALIPER.md` — canonical for the audit.
- `docs/AUDIT-PROTOCOL.md` — the failure-pattern catalogue.
- `docs/LESSONS.md`
- `docs/audits/U4-NAV-WHEEL.md` — your own outstanding list.
- `docs/audits/K6-BUILDINGS.md`
- `docs/LANE-BRIEF-TEMPLATE.md`

---

## 4. GROUND — report before working

This brief's factual basis is your own wind-down commit `c2f3133` and the
outstanding list you wrote into `docs/audits/U4-NAV-WHEEL.md` on 2026-09-09. If
that list has moved on, or if anything below is already done, say so and stop
rather than rebuilding it. Rediscovering that the brief is wrong is a successful
outcome.

---

## 5. THE WORK — in this order

The list is deliberately longer than the night. Items 2, 3 and 6 need no
browser; items 1, 4 and 5 do. That ordering is deliberate — see §8.

**1. U2 — mobile grounding.** Your own audit calls this *"the largest item"* and
records it as not started. The world filling the screen, landscape working, the
prompt box findable, and touch gestures — including the `touch-action` gap on
`#world-canvas` that a previous session found, reported, and never fixed. This
is the item Mark has raised most often, which is why it is first.

**2. The `docs/LESSONS.md` entry that is still OPEN — a regex over source
matches your comments too.** The one instance in `test/navPad.test.ts` is fixed;
the general control is not built. Build the comment-stripping helper for
source-text assertions, sweep every raw-source `assert.match` check in this
suite through it, and **close the entry only when it has been watched red
against a reintroduced case of the same bug in a DIFFERENT file than the one
that found it.** That is Failure pattern D — the enumerated instances get fixed
while the one nobody wrote down survives. It is the fifth time in a week a
mutation check has caught a test rather than code.

**3. K7.1 — the atlas gap.** Your own audit says it is verified at the code
level and **NOT verified visually**. Close that, or record precisely why it
cannot be closed tonight.

**4. The wedge-wheel screenshot with the page panels closed.** Your note says to
try `#tour-toggle-btn` against the REAL renderer rather than the stub, memory
permitting, before falling back to dismissing panels individually — and that the
broad fallback destabilised the server and overwrote a good capture with a
corrupted one. **Time-box it.** One clean frame is the deliverable, not a
perfect one.

**5. U1's live-position fix at `434c0fb`, re-watched in
`e2e/panelOverlap.spec.ts`.** It currently has structural and mutation
verification but no browser re-confirmation.

**6. Buildings.** Mark's standing complaint is that they read as basic.
`docs/audits/K6-BUILDINGS.md` already carries a measurements-and-priority
section — **extend this checklist from it rather than from anyone's guess**, and
say what you added and why.

**7. Bug 2 — the CSS rule that selector-matched and never painted**, recorded
UNEXPLAINED. **Time-box this hard.** It is worked around with inline styles and
is the least valuable place to sink a night. If it stays unexplained, it stays
unexplained honestly.

---

## 6. HOW EACH SECTION RUNS

Every major section begins in **plan mode**: re-read the governing documents for
that section, write the plan per BUILD-LOOP step 2, then hand the plan to a
fresh subagent with no memory of your reasoning and ask it to find what is wrong
with it. That is your review gate tonight. It works *because* of the missing
context, not despite it.

Dispatch, mid-flight and return are covered in `docs/OVERNIGHT-RUN.md` under
**THE THREE MOMENTS OF A SUBAGENT**. Every subagent gets the contract verbatim.

---

## 7. ROUTING

**You own:** `public/buildings.js`, `public/facade-textures.js`,
`public/kitbash-*.js`, `public/prop-*.js`, `public/props.js`,
`public/nav-wheel.js`, `public/nav-bindings.js`, `public/live-position.js`, the
markup and CSS of `public/index.html` and `public/city.html`, `e2e/`, and the
tests for those.

**CLI lane owns**, working simultaneously in `C:\Code\sandbox-spike` on
`b1-land` and rebuilding the world from the ground up: `public/board*.js`,
`public/terrain.js`, `public/city-plan.js`, `public/city-render.js`,
`public/layout.js`, `public/world-render-3d.js`, `scripts/gen-board.mjs`. It
also owns the generated `claim-*` and `city-stat-*` spans inside `index.html`,
because it is regenerating those numbers tonight — leave those spans alone and
edit the rest of the file freely.

If you need a change in a CLI-lane file: write the exact diff you would make
into `docs/CROSS-LANE-REQUESTS.md`, say why, and carry on. **Do not edit across
the line, and do not stop waiting for an answer.** A previous brief forbade this
lane exactly the file its fix needed; the right response is to record the
request, not to stall.

---

## 8. MEMORY

Measured at launch: **3.0 GB available of 15.7 GB**, against this project's own
4 GB floor. You recorded 3.3–4.2 GB free all last session with the other lane
generating worlds throughout. Both lanes run tonight, so expect the same
pressure.

The lanes run inside Antigravity IDE — that memory is the working environment
and is not reclaimable. Chrome is needed for items 1, 4 and 5, so it is not
reclaimable either.

**Work the list accordingly.** When below the floor, move to a code-only item
(2, 3, 6) and check again. **Do not stall, and do not kill processes** — record
the PIDs and your reasoning instead.

---

## 9. THE DECISION QUEUE — never block

When something is Mark's to decide, append to `docs/DECISIONS-FOR-MARK.md` (it
does not exist yet; the first decision creates it, which is not a discrepancy):
the question, the options, your recommendation and why, **what you did in the
meantime**, and how expensive it is to reverse. Then take the least irreversible
path and continue.

---

## 10. DISCIPLINE

- Stay on `codex-lane`. **Do not merge, do not deploy, do not open a pull
  request, do not touch `main`.** The live site was accidentally deployed from
  the wrong branch tonight and had to be restored.
- Commit at every BUILD-LOOP **step 9**, not at the end of a phase.
- Never retry into a failure. Commit what exists, record it, move on.
- Nothing is deleted — quarantine to `_TO-DELETE/<reason>/`, git lock files
  included.
- `git commit -F`, explicit paths, **never `git add -A`**.
- **Zero API spend.** `CALIPER_ALLOW_SPEND` stays unset.
- Spell-check every word.

---

## 11. THE HANDOVER

`docs/audits/OVERNIGHT-BLD-2026-09-09.md`, updated after **every phase** so a
crash cannot lose it, written for someone who was asleep:

- the checklist as it stands, with commit hashes
- what was started and left incomplete, and exactly where
- every gate, green or red, with its number
- every decision queued, in one list
- **everything that did not work, and what it suggested**
- everything you could not verify
- what you would do next, and why
- anything you think is wrong that nobody asked about

---

## 12. THE ESCAPE CLAUSE

If anything in this brief is wrong about the code, say so and stop. This has
saved the project four times. It is not insubordination; it is the most
valuable thing a lane does.

Running out of night is expected. Running out of work is not.
