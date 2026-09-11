# OVERNIGHT BRIEF — CLI LANE — 2026-09-09

Follows `docs/LANE-BRIEF-TEMPLATE.md`. Read it top to bottom before acting.
Every claim in this document is a claim: check it, and contradict it in writing
where it is wrong.

---

## 1. WHERE

`C:\Code\sandbox-spike`, branch `b1-land`. Confirm the branch before touching
anything. Two terminals look identical.

You are the **hub** for an unattended overnight run. Mark is asleep and reviews
in the morning. You are architect, editor and technical co-founder: you scope
work, hand it to specialist subagents, run what comes back through the build
loop, and send it back when it is not right. You are also the **auditor**,
because nobody else is awake.

---

## 2. ITEM ZERO — before anything else

**This branch has no module map.** `docs/MODULE-MAP.md` and the scripts that
generate it live on `codex-lane` and were never brought across. Do not copy the
map itself — it describes a branch with no `board-generator.js` and no
`board-load.js`, and a stale map is worse than none. Generate a real one:

1. `git checkout codex-lane -- scripts/gen-module-map.mjs scripts/lib/module-graph.mjs`
2. Generate the map against **this** branch.
3. Spot-check that it names files that actually exist here.
4. Commit the scripts and the map together, `git commit -F`, explicit paths.

If the generator will not run: say so, fall back to reading source directly
before proposing anything new, and record the failure in the handover rather
than proceeding as though the map existed.

---

## 3. READ FIRST — in this order

- `docs/OVERNIGHT-RUN.md` — tonight's operating manual. The hub role, the
  verbatim subagent contract, the three moments of a subagent, the hub's own
  rules, the decision queue, the checklist, the handover format.
- `docs/MODULE-MAP.md` — the one you just generated. **Before proposing to
  build anything.** Nine capabilities in this repository were built that already
  existed or were never connected. Every one would have been caught here.
- `CLAUDE.md`
- `docs/BUILD-LOOP.md` — eleven numbered steps, followed literally.
- `docs/UMAA-CALIPER.md` — canonical for the audit.
- `docs/AUDIT-PROTOCOL.md` — the failure-pattern catalogue.
- `docs/specs/BOARD-REBUILD-PLAN.md` — the governing plan.
- `docs/LANE-BRIEF-TEMPLATE.md`

---

## 4. GROUND — check these four, report before working

1. **B2.6 is committed at `27cca18`** with its gates green. Tick it on the
   `docs/OVERNIGHT-RUN.md` checklist with that hash before starting anything.
2. **`npm test` reports 1,141 tests: 1,084 passing, 41 failing, 1 todo.**
3. **The 41 decompose as:** one deliberate red (B2.5's generation time against
   Cloudflare's 30,000 ms ceiling), two `mutationEvidence` failures, and 38
   old-world tests measuring the new B1 archipelago.
4. **`test/testCategoryScoped.ts` is untracked**, provenance unknown. Decide
   whether it belongs, record the decision, do not delete it.

If any of this is wrong, say so and stop. Discovering the brief is wrong is a
successful outcome, not a failure.

---

## 5. THE WORK

Start at **B2.7** and work the checklist in `docs/OVERNIGHT-RUN.md` in order.
Two items carry measured detail so they are not rediscovered.

### B2.8 — re-pin the old-world tests

The 38 failures are the inventory, already measured:

| File | Failures |
|---|---|
| `cityWorld` | 20 |
| `cityJoin` | 3 |
| `cityConnectivity` | 2 |
| `connectivityBridges` | 2 |
| `worldOccupancy` | 2 |
| `ground` | 2 |
| `layout`, `planSeed`, `instanceGroups`, `isolate`, `roadNetwork`, `umaaFindings`, `supervisedGenerateScript` | 1 each |

For each, decide and record which of three it is:

- a pin whose number moved with the land,
- a test whose subject no longer exists on the new world,
- a genuine defect the new land exposed.

**Never loosen an assertion to make it pass.** A test that is now vacuous is
worse than a test that is red.

### The `mutationEvidence` pair — not bookkeeping

`test/mutations.json` holds 119 entries. `mutationSummary.generated.json` claims
98, and 21 controls have no committed CAUGHT result. The README and the live
page both publish *"98 deliberate defects injected, all 98 caught"*, and the
generated-claims gate passes **only because it reads the stale summary** — two
sources of truth with nothing binding them, inside the machinery built to catch
exactly that. Failure pattern B.

Run the 21 outstanding mutations. Regenerate honestly. If any control does not
catch its defect, that finding is worth more than the tick.

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

**You own:** `public/board*.js`, `public/terrain.js`, `public/city-plan.js`,
`public/city-render.js`, `public/layout.js`, `public/world-render-3d.js`,
`scripts/gen-board.mjs`, and the tests for those. You also own the generated
`claim-*` and `city-stat-*` spans in `public/index.html`, because you are the
lane regenerating those numbers tonight — **nothing else in that file.**

**BLD lane owns**, working simultaneously in `C:\Code\sandbox-spike-codex` on
`codex-lane`: `public/buildings.js`, `public/facade-textures.js`,
`public/kitbash-*.js`, `public/prop-*.js`, `public/props.js`,
`public/nav-wheel.js`, `public/nav-bindings.js`, `public/live-position.js`, the
markup and CSS of `index.html` and `city.html`, and `e2e/`.

If you need a change in a BLD-lane file: write the exact diff you would make
into `docs/CROSS-LANE-REQUESTS.md`, say why, and carry on. **Do not edit across
the line and do not stop waiting for an answer.**

---

## 8. MEMORY

Measured at launch: **3.0 GB available of 15.7 GB**, against this project's own
4 GB floor. The lanes run inside Antigravity IDE, so that memory is the working
environment and is not reclaimable.

You are the heavier consumer — the BLD lane recorded 3.3–4.2 GB free all last
session with this lane's world generation the likely cause. B2.6 exists
precisely so the board is loaded rather than regenerated: **prefer the persisted
board wherever B2.6 makes that possible.** If you must generate repeatedly, say
so in the handover so the contention is on the record rather than inferred.

Below the floor: do code-only work and check again. **Do not kill processes** —
record the PIDs and your reasoning instead.

---

## 9. THE DECISION QUEUE — never block

When something is Mark's to decide, append to `docs/DECISIONS-FOR-MARK.md` (it
does not exist yet; the first decision creates it, which is not a discrepancy):
the question, the options, your recommendation and why, **what you did in the
meantime**, and how expensive it is to reverse. Then take the least irreversible
path and continue.

---

## 10. DISCIPLINE

- Stay on `b1-land`. **Do not merge, do not deploy, do not open a pull request,
  do not touch `main`.** The live site was accidentally deployed from this
  branch tonight and had to be restored from `main`. A second one takes the site
  down again.
- Commit at every BUILD-LOOP **step 9**, not at the end of a phase. A crash
  should cost one step, not the night.
- Never retry into a failure. Commit what exists, record it, move on.
- Nothing is deleted — quarantine to `_TO-DELETE/<reason>/`, git lock files
  included.
- `git commit -F`, explicit paths, **never `git add -A`**.
- **Zero API spend.** `CALIPER_ALLOW_SPEND` stays unset.
- Spell-check every word.

---

## 11. THE HANDOVER

`docs/audits/OVERNIGHT-CLI-2026-09-09.md`, updated after **every phase** so a
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

The checklist is longer than the night on purpose. Running out of night is
expected. Running out of work is not.
