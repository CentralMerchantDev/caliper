# Case file — run `b99d3894-df75-4558-8ba9-27ea28ba4d2f`

**Change request:** "Add a pet that needs feeding. If the pet goes unfed for too long, something bad should happen to it."

**Outcome: refused — not shipped.** Correctly, across every attempt. This is not a demo of success. CALIPER's rule is "refuse to close": a change ships only when the hand-authored regression suite and the model-proposed criteria for the new behavior both pass, for real, against a sandboxed run of the actual code. This document is the record of what was caught, what four real repair attempts were each shown, what that bought, and — the sharpest thing in it — two failures inside the same run that look identical from the outside and are not the same kind of problem at all.

Total real spend, full investigation including the controlled experiment below: **$0.7547** (breakdown at the end).

---

## The sharpest finding: one closable failure, one that wasn't

By the last real fix attempt, this run had exactly two remaining failures:

| | Regression suite (crash on legacy worlds) | Criterion (feed math) |
|---|---|---|
| Evidence given | Full: exact input, throw location, before/after | Full since attempt 1: exact input, full expected-vs-actual |
| Attempts | 4 | 4 |
| Outcome | **Fixed** — 9/9 passing | **Never fixed** — 52 vs. 55, unchanged across every attempt |
| Why | A missing guard. One correct answer. More evidence let the model find it. | Plan's criterion computes 15 + 40 = 55 (feed overrides decay that tick). Implementation computes (15 − 3) + 40 = 52 (decay, then feed). **Both are internally consistent.** Nothing in the change request says which one is intended. |

Same fix stage. Same model. Same enriched-evidence treatment, in the same call. One failure closed completely once given enough information. The other had full expected-vs-actual from the very first attempt and never moved, because there was never a decision to discover — only one to make. Full evidence resolves an information gap. It cannot resolve a choice nobody made. Treating these two as the same kind of "the model failed to fix it" would have been the wrong conclusion for the second one, and the right one for the first — which is exactly why they needed to be told apart rather than lumped into one refusal.

---

## What the suite caught — attempt 1

The model added a `pets` array, a decay/feed/run-away cycle, and wired it into the world's per-tick update. Two independent checks caught problems before any human read a line of the diff:

- **Regression suite — 6 / 9 crashed.** Every regression test predating the pets feature calls `tick()` with a world that has no `pets` field. The new code read `world.pets.length` unconditionally.
- **Independent reviewer (gpt-5.5) — 1 material finding.** Flagged, unprompted, that `tickPet` logs the run-away event using the tick value *before* it advances — a genuine off-by-one, caught by a completely different mechanism than the crash above.

## Attempts 1 & 2 — repair, given a thin signal

The review gate was approved and the fix stage ran for real, twice. Attempt 1 corrected the reviewer's off-by-one cleanly. Neither attempt touched the crash. Before concluding the model couldn't do it, we checked exactly what it was shown — the entire payload, both times:

```
regression "idle tick from full health does nothing but decay": Cannot read properties of undefined (reading 'length')
regression "10-tick trace from full health matches exactly, including a work cycle": Cannot read properties of undefined (reading 'length')
regression "work hour with energy and no urgent need triggers work": Cannot read properties of undefined (reading 'length')
... 3 more, identical shape
```

A bare V8 error string and a test name. Not which function threw. Not what input it was called with. Not that the missing property was specifically `pets`. The function name and the exact failing world were sitting in the regression suite's own source the whole time — `fn: "tick"`, a full `args` array — and were never carried through to the prompt asking for a repair.

### Pattern — evidence captured, never forwarded

This is not the fail-open defect this project already tracks (below): nothing here read an absence as a pass, and the pipeline correctly refused both times. It's a second, independent mistake, and it has a name now because it has shown up twice, in two unrelated systems: **DATUM's diagnosis ignored its own validators' failure detail in exactly the same way** — the check that caught the problem and the process that acted on it were connected by a signal too thin to carry what the validator already knew. Here, the sandbox's `TestResult` knew exactly which function ran and on what input; the fix prompt got a test name and a V8 message. Two systems, two teams, the same shape of mistake, found separately. The repetition is the finding, not either incident alone.

The first fix: `TestResult` now carries the exact `fn`, `args`, and `repeat` that produced it, threaded from the sandbox harness (`src/simSandbox.ts`) through to the prompt (`describeFailure` in `src/changePipeline.ts`). It wasn't enough on its own.

## Attempt 3 — location, but not the whole picture

Given the function and the failing input, the model added a real guard (`const pets = next.pets || []`) and the crash was genuinely gone — real progress, not a wash. But the same change unconditionally re-attached `pets: []` and `log: []` to every world it touched, including ones that never had those fields. The hand-authored suite checks exact equality, so six tests that no longer crashed now failed a stricter check instead: extra keys the expected value didn't have.

The model was never shown what already worked. It couldn't know it was breaking six passing checks in the same edit it used to fix a seventh.

**Result: 3 / 9 regression, failure mode changed from crash to shape mismatch.**

## Attempt 4 — full evidence

Two more things were added to the payload: a stack-trace excerpt naming the exact throwing frame for crashes, and — new this round — an explicit list of every check that currently *passes*, with its exact call and return value, so "don't break this" is a fact the model can check itself against instead of a hope. Excerpt (the real payload sent was 7 failing + 7 passing checks, zero truncation on any value):

```
-- still failing, in full --
regression "idle tick from full health does nothing but decay"
  -- calling tick({"tick":0,"money":100,"sims":[{"id":"s","needs":{"hunger":100,...},"lastAction":null}]})
  : expected {"tick":1,"money":100,"sims":[{"id":"s","needs":{"hunger":97,...},"lastAction":"idle"}]}
    got      {"tick":1,"money":100,"sims":[{"id":"s","needs":{"hunger":97,...},"lastAction":"idle"}],"pets":[],"log":[]}

-- still passing, shown for the first time --
regression "applyAction(eat) restores hunger and charges money"
  -- calling applyAction({"tick":0,"money":100,"sims":[...]}, 0, "eat")
  returns {"tick":0,"money":95,"sims":[{"id":"s","needs":{"hunger":62,...},"lastAction":"eat"}]}
criterion "Initial world contains one alive pet..."
  -- calling initialWorld() returns {"tick":0,"rngState":1,"money":100,...,"pets":[{"id":"pet1","hunger":100,...}],"log":[]}
```

**Result: 9 / 9 regression, 4 / 5 criteria.** The diff is precise: a `hasOwnProperty("pets")` check in both `applyAction` and `tick` that only attaches pet/log bookkeeping to worlds that already had it — a correctly-scoped fix, not a lucky one.

### Finding — repair quality was bounded by evidence quality, not model capability

The crash took four rounds of payload work to fix and zero additional model capability. Attempts 1–2 gave a guessing task and got guesses. Attempt 3 gave a location and got a correct-but-incomplete fix, because "don't break this" was never stated as fact. Attempt 4 gave the full picture and got a fix that reads like it was written by someone who could see the test suite — because, for the first time, it effectively could.

That was n = 1 against n = 2 failures. It needed a measurement, not an anecdote.

---

## The controlled experiment

**Question:** holding the model, the starting code, the plan, and the reviewer's finding fixed, does payload richness change the fix stage's success rate on the *same* bug — or was attempt 4's result a fluke?

**Method:** the fix stage (`fixChange`) called directly, 5 times per arm, from the same starting state (the post-attempt-1 code, which still has the raw crash — 6/9 regression, `error` set on each). Nothing else in the run touched; each call is otherwise identical.

- **THIN** — the exact attempt-1/2 shape: test name + bare error or bare expected/actual. No `fn`, no `args`, no stack, no passing list.
- **RICH** — `describeFailure`/`describePassing`: exact triggering input, full expected-vs-actual, and every currently-passing check with its call and return value.

**Spend:** stated before running — 10 real `claude-sonnet-5` calls at the production token cap, ~$0.04–0.05 each. Actual: **$0.457** ($0.214 THIN, $0.243 RICH).

**Result**, graded against the live sandbox for each of the 10 real outputs:

| | Crash eliminated | Fully passing (9/9 regression) |
|---|---|---|
| THIN (n=5) | 1 / 5 | 1 / 5 |
| RICH (n=5) | 5 / 5 | 4 / 5 |

Reported without cherry-picking the confirming cases:

- **THIN rep 2 succeeded anyway** — it independently wrote `if (next.pets) { ... }`, a correct guard from a bare error string alone. Guessing right is possible; it just isn't reliable (1/5 here).
- **RICH rep 2 didn't fully succeed** — it wrote `if (!next.pets) next = Object.assign({}, next, { pets: [] })`, unconditionally, at the top of `tick()`. The crash is gone, but it reintroduces attempt 3's exact shape-leak. Why: the "still passing" list for this starting state happens to contain no example of a `tick()` call that returns *without* pets/log fields — the three passing checks are two `applyAction` calls and one `chooseAction` call, none of which touch pets. Rich evidence helps in proportion to what it actually shows; it isn't a guarantee, and this run's evidence set had a gap of its own.

The headline holds as a measurement, not an observation: **richer evidence roughly quintupled the crash-elimination rate (1/5 → 5/5) and quadrupled the full-pass rate (1/5 → 4/5) on the identical bug, same model, same starting code.** It is not a guarantee — one rich rep still missed, for a legible reason (a gap in what the passing evidence happened to demonstrate), and one thin rep still succeeded, by chance. The direction and the magnitude are what n=5 per arm earns over n=1: a real spread of outcomes instead of a single data point standing in for a trend.

---

## Ledger — what was fixed, and what wasn't

- **Fixed (attempt 1):** the reviewer's off-by-one in the run-away log's tick value.
- **Fixed (attempt 4, correctly and completely, and reproduced at 4/5 in the controlled experiment):** the crash on legacy, pets-less worlds, and the shape-leak attempt 3 introduced while fixing it.
- **Not fixed, four attempts, richly evidenced since the first:** feeding restores hunger from a different baseline than the plan's criterion expects (52 vs. 55) — an underspecified decision, not a demonstrated repair failure. See "The sharpest finding," above.

Refused, correctly, every time. The sim baseline on disk (`sim/current-source`) is exactly what it was before this change request arrived — nothing partially-working ever reached it.

---

## Two more findings, found along the way

### The discipline caught itself

While writing an automated test (`test/fail-open.test.ts`) to pin down five known instances of one bug class — a missing, empty, or timed-out signal silently read as a pass — the test surfaced a **sixth, previously unreported instance**: `checkAnswer` returned `undefined` for a present-but-empty answer record, and the caller's `=== null` check missed it, meaning a malformed answer would have been treated as a real one instead of leaving the run halted. Fixed, and verified by reintroducing the bug on purpose, watching the new test fail, and restoring the fix — proof the test has teeth, not just coverage. That a purpose-built check for a known defect class found a new member of that class before it shipped is the strongest evidence in this project that "refuse to close" is load-bearing, not stated intention.

### A seventh fail-open instance, found while grading the experiment

Grading the 10 experiment outputs initially produced identical, wrong results for every candidate — including ones directly confirmed by inspection to still contain the raw crash. Cause: `/sim-selftest` called Worker Loader's `loader.get(id, getCode)` with a **fixed** isolate id (`"sim-selftest"`). Worker Loader only invokes `getCode` on a cache miss for that id, so every call after the first silently re-served whichever source built the very first isolate — regardless of what `sim/current-source` said by the time of a later call. Fixed by giving every self-test call a fresh id (`sim-selftest-${crypto.randomUUID()}`).

This belongs on the fail-open list this project already tracks, as the seventh instance, not a separate curiosity: a stale result was read as a current one. The same invariant applies — anywhere a signal could be silently out of date, it must be forced fresh or explicitly checked, never assumed current by default.

**Scope, stated plainly so this isn't overclaimed:** this affected only the ad hoc `/sim-selftest` diagnostic route used while investigating this case. The real pipeline's verify/reverify calls (`runVerification` in `src/changePipeline.ts`) already used a unique id per run and per stage (`change-${runId}-1`, `change-${runId}-2`) — no real ship decision in this project was ever made against a stale isolate. Recorded here because it's the same family of mistake as everything else in this file: a signal that looked current and wasn't, caught only by noticing the output didn't match what direct inspection said should be true.

---

## Cost

| Stage | Notes | USD |
|---|---|---|
| Plan | initial | 0.0346 |
| Plan | re-planned after a clarifying question | 0.0283 |
| Implement | attempt 1 | 0.0353 |
| Review | gpt-5.5, cross-model | 0.0241 |
| Fix | attempt 1 — thin payload | 0.0408 |
| Fix | attempt 2 — thin payload | 0.0415 |
| Fix | attempt 3 — location, no passing list | 0.0428 |
| Fix | attempt 4 — full evidence | 0.0502 |
| Experiment | 5× fix, THIN | 0.2140 |
| Experiment | 5× fix, RICH | 0.2432 |
| **Total** | | **0.7547** |

Against a $10.00 hard cap enforced independently of this report.

---

*CALIPER — plan → implement → verify → review → fix → refuse-or-ship. Recorded, not staged.*
