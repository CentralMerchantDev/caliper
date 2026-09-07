# UMAA Field Audit — CALIPER

Standard applied: **UMAA-FIELD-PLAYBOOK-2026** (Universal Meta-Audit Architecture).
Target: CALIPER — an AI pipeline that modifies a running 3D city simulation behind
two human gates.

**RE-GROUNDED 2026-09-06 (PART 7b/E6), RE-MEASURED AGAIN 2026-09-06 (M3):**
this document is handed to every blind audit as grounding material, and its
own numbers had gone stale — the exact defect Step 2 below exists to name.
The "438 tests" cited at lines ~133, ~204 and ~219 describes this specific
document's Phases 1–7 (`up from 379`, its own historical progression) and is
left as written there — rewriting a completed phase's own tally would
falsify the history, not fix it. But a fresh auditor reading it as "the
current suite" would be calibrated to a suite less than half its real size:
`node test/run.mjs` measures **919** node tests today (905 when this note
was first written, five phases and 14 tests ago), not 438. Treat every
specific figure below as dated to Phases 1–7, including line ~77's "19,481
plots / 1,399 roads" (now 19,874 / 1,402 — 54 settlements is, coincidentally,
still correct) — re-measure before citing any of them in a new finding, the
same rule Step 2 states for the page itself. **This note itself will go
stale the next time the suite grows — that is expected and fine; the
instruction to re-measure before citing, not the specific number, is the
part that must stay true.**

---

## Why this document exists, and what it changes

Phases 1–4 of the internal audit were run before this framework was adopted. They
were thorough in a narrow way: 60+ findings, all of the form *"this is broken"* or
*"this claims something untrue."* That found real and serious defects — including a
world build that threw on every single page load.

UMAA names two things that work missed entirely, and both matter more than the
findings still open:

1. **There was no 4-State Horizon.** Every finding was about *what is done and
   wrong*. Nothing recorded what is deliberately **Undone**, what the base makes
   **Possible**, or what **Should** come next. For a portfolio piece the second
   of those is worth more than the first: an acknowledged boundary reads as
   judgement, an unacknowledged one reads as an oversight not yet found.

2. **Only 5 of the 12 divisions were audited.** Divisions 1, 4, 5, 6 and 10 were
   covered hard. Divisions 2, 3, 7, 8, 9, 11 and 12 were not audited at all — and
   Division 7 (does this persuade its reader in 30 seconds) is arguably the one
   the whole artefact exists to pass.

So the remaining phases are restructured around the 12 divisions rather than
around the files, and every division is answered across all four horizon states.

---

## Phase 0 — Grounding Protocol

> **AMENDED 2026-09-07 — Step 0 added, and the audit now has trigger points.**
> Mark:
>
> > before we set any sort of numbers, we should be looking for benchmarks to
> > measure against the industry standards … rather than measuring against
> > things that really produce nothing and have no real value at the end of the
> > day if they pass, because asking something that doesn't really matter is
> > inevitable to pass but doesn't show anything
>
> > it should be set to run at specific times within the overall initial plan …
> > so once a certain benchmark is reached, the plan knows that it's time to run
> > the audit. That should be a checkpoint within it.

---

### Step 0 · The External Anchor — BORROW THE BENCHMARK, DO NOT INVENT ONE

**This runs before Step 1, and before any audit criterion is written.**

An audit that checks a system against criteria the same project invented can
only report that the project agrees with itself. It is unfalsifiable by
construction, and it will pass.

**The evidence, from this project, in two days:**

| Reported | Actual | How it passed |
|---|---|---|
| 13,200 distinct triangles | 153,060 | number typed into a report |
| Draw calls: 1, triangles: 1 | ~470 / 75,682 | counter read after a post-process quad |
| Retrieval precision@1 = 100% | lexical scorer, weights tuned to the set | golden set written by the same author |
| Retrieval precision@1 = 90% | hand-written `SEMANTIC_CLUSTERS` table, no model | `ai` parameter optional, tests passed none |

**Every one satisfied its gate.** Each gate named a number, and something was
built that produced that number. **A public benchmark cannot be satisfied that
way** — a hand-authored cluster table scores near-random on SciFact, because it
has no training and generalises to nothing beyond the words someone typed in.
One external run catches in minutes what four internal gates did not.

**The order, for every measurement this audit will examine:**

1. **Find the published standard and its known figures first.** Retrieval →
   **BEIR** / **MTEB**, metric **nDCG@10**. Embedding models → their published
   MTEB scores. Frame time → real engine targets. Mutation testing → published
   mutation-score norms.
2. **Reproduce the published number before trusting the harness.** If the
   pipeline cannot land near a known figure on a standard set, the
   implementation is wrong and no project-specific number from it means
   anything.
3. **Only then** measure the project-specific thing, and report it **beside**
   the external anchor rather than alone.
4. **State what the project measure adds** that the public one does not.
5. **Where no published standard exists, say so explicitly and derive the
   number in writing.** Naming an invented threshold as invented is honest; the
   failure is presenting it as though it were borrowed.

**Audit finding to carry forward:** every budget in this project was chosen, not
derived. The 200,000 distinct-triangle ceiling was 7× headroom over a single
measurement. The 900 draw-call limit was a comment inside a test. The 12M drawn
ceiling has no cited source at all. None of these is necessarily wrong — but
none has ever been checked against anything outside this repository, and the
audit should say so rather than measure against them as if they were standards.

---

### WHEN THIS AUDIT RUNS — checkpoints, not a schedule

UMAA is expensive and blunt. Run continuously it becomes noise; run never it
becomes decoration. It is triggered by **state in the plan**, not by the clock.

**Trigger on any of these:**

1. **A new KIND of measurement appears.** The first time a phase reports a
   category of number the project has not reported before — a retrieval score, a
   frame time, an accuracy figure — audit before that number is trusted or
   repeated. Every one of the four fabrications above was a first-of-its-kind
   number.
2. **A number is about to leave the repository.** Before anything goes onto the
   public page, the résumé, or a deploy. External claims get audited first,
   without exception.
3. **A control exists that has never been watched red.** A gate that has only
   ever been seen green is not known to be a gate. Audit it, or break it
   deliberately and watch.
4. **Three consecutive phases close green.** A run of clean passes is when drift
   accumulates unobserved. This is the most common trigger and the easiest to
   skip.
5. **A phase is reported complete that changed few or no files.** Compare the
   claim against `git diff --stat`. An eight-phase report over fourteen lines of
   code has happened here once already.
6. **Mark reports something the measurements say is fine.** His eye disagreeing
   with a green suite means the suite is measuring the wrong thing, and that is
   an audit, not a debate.

**Where the current plans hit these triggers:**

| Plan | Checkpoint | Trigger |
|---|---|---|
| `RETRIEVAL-PLAN.md` | R1 exit | 1 — first retrieval score; **2** — it is résumé-bound |
| `BOARD-CONVERSION-PLAN.md` | P1 exit | 3 — `canPlace` and reversibility are new controls |
| `BOARD-CONVERSION-PLAN.md` | P2.4 | 1 — first full-network connectivity figure |
| `AGY-OVERNIGHT-PLAN.md` | A5 exit | 3 — the visual regression gate |
| Any | before a résumé number ships | 2 |

**The audit records its own trigger.** Which of the six fired, and what state in
the plan fired it, goes at the top of the audit report. An audit that cannot say
why it ran was probably run out of habit.

---

### Step 1 · The Epistemic Anchor (the immutable law)

CALIPER has **no statute**. There is no Building Code equivalent, which means the
Step-1 question has to be answered differently than it was for DATUM — and
answering it "we don't have one" would be the wrong answer, not an exemption.

CALIPER's immutable law is **execution**. The closed set is not a corpus of
clauses; it is *what the sandbox actually did when the code was run*:

| Claim the system may make | Closed-set source that can refute it |
|---|---|
| "the change works" | the 9 regression cases, executed in a Workers isolate |
| "the plan's criteria hold" | `evaluateCriteria` against a real probe runner |
| "these criteria mean something" | `findVacuousCriteria` — do they already pass on the UNMODIFIED world? |
| "the reviewer approved" | a different vendor's model, reading the diff cold |
| "this costs $X" | the Durable Object's atomic spend counter |
| "the world contains Y" | `citySummary.generated.ts`, regenerated from the real generator |

**The invariant, stated so it can fail:** no stage may report a pass it did not
observe. Silence, an empty result, a failed read, and a caught exception are all
*unknown* — never *fine*.

This is the anchor the audit has actually been enforcing, and naming it explains
why the same defect kept recurring in different clothes. Every one of these was
the anchor being violated:

- a review loop that returned `clean` when findings were overruled rather than resolved
- `reviewFoundNits` counted over a different span than `reviewFoundMaterial`
- a criteria dry-run failure rendering byte-identically to a clean dry run
- `verified` displaying the bare word "Verified" when `fatalError` said it never ran
- `pipelineAvailability` reporting `runsUsed: 0` from a read that threw
- a colour edit caching success after repainting nothing
- 205 contact shadows under buildings that were refused

### Step 2 · Artifact Topology (the raw inputs)

| Input | Shape | Measured or inferred |
|---|---|---|
| Visitor request | free text, ≤500 chars, `checkInputGuard` | **inferred** — never trusted, never echoed to HTML |
| World state | `SIM_BASELINE_SOURCE`, a JS module string | **measured** — the literal source that runs |
| City geometry | 19,481 plots / 1,399 roads / 54 settlements, generated deterministically | **measured** |
| City summary | `citySummary.generated.ts` | **measured**, regenerated by script — *not hand-written* |
| Terrain | one pure height function over 26 km | **measured** |
| Model output | plan JSON, edit ops, review findings | **inferred** — schema-validated, never executed unvalidated |
| Spend | Durable Object counters | **measured** |

**Where the line has been crossed historically:** the public page presented
*hand-typed* numbers (40 km, 57 settlements, 31,000 buildings, 379 tests) in the
same visual register as measured ones. That is inference wearing measurement's
clothes, which Step 2 exists to forbid. `test/publicClaims.test.ts` now enforces
the boundary mechanically.

### Step 3 · The Executive Persona

**Reader:** a hiring engineer or founder in applied AI, 30 seconds, probably on a
phone, probably one of many tabs.

**Their unspoken fear:** *"another LLM wrapper with a nice demo."*

**The 30-second test CALIPER must pass:** the visitor must, without uploading
anything, configuring anything, or spending anything, see that this system
**refuses**. Not that it produces — that it declines to produce when it cannot
verify. A demo that only shows success is indistinguishable from a wrapper.

**Audit consequence:** the recorded run must be reachable and legible with no
account, no API key and no live spend, and the *refusal* paths must be as visible
as the success ones. This is Division 3 and Division 7, and it is where the
remaining work is.

### Step 4 · The Failure Floor (worst-case invariants)

The single most catastrophic failure CALIPER could produce, in order:

1. **Shipping an unverified change while reporting it as verified.** This is the
   product's one claim. Anything that lets a fatal sandbox error read as a pass is
   a total audit failure.
2. **Unbounded spend.** A loop outside the ceiling arithmetic, or a cap that can
   be raced or replayed.
3. **Sandbox escape** — model-authored code reaching the Worker's environment,
   secrets, or another visitor's run.
4. **Displaying visitor-typed text as HTML.**

Each is tested deliberately, and each has already caught something real:
(1) the manufactured `clean` verdict and the client-side "Verified"; (2) the
uncapped Gate 1 reply loop; (3) `browserOnlyReferences` and the nine regression
checks; (4) verified clean — `esc()` is applied on every path.

---

## The 4-State Horizon, by division

Grades are deliberately unflattering where the work has not been done. A division
marked **not audited** is not a pass.

| # | Division | Done | Undone | Could | Should |
|---|---|---|---|---|---|
| 1 | Technical architecture | Two-gate pipeline, atomic DO spend claim, lease + concurrency, CAS publish, 438 tests | Renderer cannot be executed by the suite (no GPU) — closed statically instead | Headless WebGL in CI (`swiftshader`) to actually build a scene | **Nothing** — the static check covers the failure class that shipped |
| 2 | Visual design system | Contrast audited over the LIVE canvas; `--panel-bg` 0.82→0.92 takes `--text-muted` from 4.36:1 to 5.60:1 worst case; state is no longer colour-only | 19 font sizes (5 fractional), no type scale; `:root` tokens bypassed by inline hex | Six type tokens, snap spacing to 4/8/12/16/24 | Low priority — it is untidy, not false |
| 3 | Product & UX | The most recent real refusal renders on FIRST PAINT; flythrough toggles and Escape exits it; boot overlay has a 20 s watchdog | The rationed Build button is still the loudest control on the page | Lead with the refusal in the hero paragraph too | Consider the hero rewrite the Division 7 audit proposed |
| 4 | Frontend performance | World build 6.02 s → 2.36 s, 91 MB → 34 MB, disposal + listener leaks fixed; per-frame GPU texture upload removed; tree occupancy O(n)→bucket grid | ~700 loose prop meshes are still not instanced — the header no longer claims otherwise | Instance the boats, aircraft, cranes and stadium bays | Measure a frame budget first; the claim is honest now either way |
| 5 | Backend & applied AI | Closed-set verification, cross-vendor review, circuit breaker, retry accounting, input caps | Worker tests cannot run in this sandbox (vitest/workerd) | — | Run them on Mark's machine |
| 6 | Domain ground truth | Terrain, grading, footprint refusal, zoning from measured percentiles; **earthworks now built** (1,086 roads carry a batter); golf and container yard graded; boardwalk smoothed | 154 roads hold their gradient by exceeding their earthworks budget — reported, not hidden | Retaining walls where the batter is steep | Nothing |
| 7 | Editorial & commercial narrative | Refusal on first paint; nounspeak headings rewritten; crown emoji gone; buzzword sweep of 28 terms came back clean | The moat (a test that fails CI when a marketing number drifts) is still stated only inside a modal | Promote one moat sentence to the welcome card | Do that one edit |
| 8 | Strategic horizon | — | **Did not exist.** This table is the first one | — | This document |
| 9 | Commercial viability / FinOps | $2/$7/$20 caps, per-IP limits, published worst case | Spend estimates parked by Mark until they can be tested live | Per-audit pricing model | Leave parked |
| 10 | Observability | Ledger, run history, stage costs, `countersRead`, refusal reasons | No forensic replay | 3× replay loop as in DATUM | Consider |
| 11 | Security & governance | 2 CRITICAL closed (verdict forgery, scanner bypass); IP retention now hashed + pruned; privacy notice added; SSE leak, auth ordering, KV fan-out fixed | Worker tests unrun here; retry pricing under-books a truncation | Self-host fonts to drop the last third party | Run the Worker suite |
| 12 | Developer experience | Single test command; three generated artefacts (city summary, test count, sim baseline) regenerate from the real thing | Two 0-byte test files existed and were counted as coverage — now impossible | — | Nothing |

---

## Cross-disciplinary collisions found in CALIPER

| A | B | The conflict | Resolution taken |
|---|---|---|---|
| Domain truth | Frontend performance | Grading every built surface properly costs build time on the main thread before first paint | Roads and rail are graded; the rest is recorded as **Undone** (B13) rather than half-done and claimed |
| Observability | Editorial honesty | Reporting every refusal, unknown settlement and unplaced feature makes the system look *worse* on its own status line | Report anyway. A system that only surfaces its successes is the thing this project argues against |
| AI ambition | FinOps | Every Gate 1 reply re-runs ground + plan | Capped at 4, enforced on the counter that persists with the run |
| Visual polish | Epistemic honesty | An empty state and a failed fetch look identical, and the empty one looks tidier | Failures now say "could not check", which is uglier and correct |

---

## Verdict, stated plainly

CALIPER was **strong on Divisions 1, 4, 5, 6, 10** — the machinery of not lying —
and that is the part of the thesis it was built to defend.

It was **unaudited on 2, 3, 7, 8, 11, 12**. Those have now been run, and the
reordering was worth more than the 20 renderer findings it displaced. What the
missing divisions found:

**Division 11 (security)** produced the two worst defects in the entire audit,
both of which defeat failure-floor invariants that four technical passes had
already walked past:

- A candidate could **forge its own 9/9 verdict** by replacing
  `Array.prototype.push` or defining `Object.prototype.toJSON` — the harness
  captured its comparators and not its recorder, and neither payload needs a
  top-level statement, so the two AST scanners never looked where they lived.
- `browserOnlyReferences`, the only thing between a model-written world and every
  visitor's browser, could be **switched off by one dead function**, because its
  binding collector had no notion of scope.

**Division 7 (editorial)** found that the page's central claim — that it refuses
— had its only evidence at second 25 of a 30-second visit, behind an 11.5px link
and eleven seconds of a run that shipped. Not a bug in any technical sense, and
the single highest-value change made in this session.

**Division 3 (UX)** found the shiniest button on the page was a 22-second
letterboxed trap with both obvious exits dead.

**Division 2 (visual)** found `--text-muted` at 4.36:1 over the day sky —
computed against the live canvas rather than on paper, which is where every
static check said it passed.

### What is honestly still Undone

All 61 audit findings are closed — 59 fixed, one WONTFIX with a stated reason,
one claim-corrected rather than built. What remains is not a backlog of defects;
it is the set of things this project has decided not to do yet, named so that
none of them reads as an oversight:

- **The renderer cannot be executed by the suite.** Closed statically instead,
  which answers "does this run at all" and not "does it draw the right thing".
  Headless WebGL in CI would close it properly.
- **The 12 Worker tests need `vitest`/`workerd`** and have never run in this
  sandbox. They are real — their comments record three genuine defects they
  caught — but the 438 headline does not include them.
- **~700 prop meshes are not instanced.** Boats, aircraft, cranes, stadium bays.
  Real work with a real payoff; the header no longer claims otherwise.
- **154 roads hold their gradient by exceeding their earthworks budget**, worst
  by 38.6 m. `gradeRun` always finishes on the gradient pass, which is the right
  trade — and it is now reported rather than computed and dropped.
- **Several `cityWorld` sanity bounds carry 20×–90× headroom.** Weak, not false.
- **The retry-truncation path under-books its reservation** by up to $0.108 on a
  `fix` call. Bounded, and parked with the rest of the spend estimates at Mark's
  instruction until they can be tested against a live run.
- **Google Fonts is the only remaining third party.** Self-hosting it would drop
  the last external origin from the CSP.

### The one number worth keeping

Across seven phases: **438 tests, up from 379**, and — the figure that actually
matters — **every fix in Phases 4 through 7 was verified by mutation**. The
standard that produced the two CRITICALs was not cleverness. It was refusing to
accept a green suite as evidence that a control exists.
