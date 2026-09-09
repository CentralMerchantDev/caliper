# Decisions for Mark — the queue

Per `docs/OVERNIGHT-RUN.md` §"THE DECISION QUEUE": when something is Mark's
to decide, it goes here rather than blocking the run. Each entry: the
question, the options, the recommendation and why, what was done in the
meantime, and how expensive it is to reverse.

---

## 1. `test/testCategoryScoped.ts` — untracked, spends real money if run. Keep, move, or formalise?

**Ground-checked, 2026-09-09 (CLI lane, overnight):** the file is a standalone
script, not a `node:test` file — no `test(...)` registrations, top-level
`await` that runs immediately on execution. It calls `createWorkersAIClient()`
(`src/clientWorkersAI.ts`) and `indexRegistryInVectorize` against the REAL
BGE embedding model, then compares "Unconstrained" vs "Category-Scoped" P@1
retrieval over `HELD_OUT_SET`'s `semantic_zero_overlap` items. This is real
API spend if executed, not a mock.

**Confirmed safe to leave in place, untouched:** `test/run.mjs`'s own
discovery (`test/run.mjs:18`) only picks up files ending in exactly
`.test.ts`. `testCategoryScoped.ts` does not match that suffix, so it is
never auto-discovered or auto-run by `npm test` / `node test/run.mjs`, and
never was — the "zero API spend" rule was not at risk tonight from this
file's mere presence.

**The question:** does this belong in the repository, and if so, as what?

**Options:**
1. **Leave it exactly as is** — untracked, in `test/`, never run automatically.
   Costs nothing, changes nothing, but an untracked file with real spend
   potential sitting in `test/` (a directory whose own convention is "ends in
   `.test.ts`, runs automatically, costs nothing") is a trap for a future
   session that renames it to fit the convention without reading it first.
2. **Move it to a clearly-labelled experiments location** (e.g.
   `scripts/experiments/category-scoped-retrieval.mjs`) and commit it there,
   named and routed so nothing mistakes it for an automated test. Preserves
   the work, removes the naming trap, costs one `git mv` + commit.
3. **Formalise it as a real, gated eval** — wire it behind the same
   `ANTHROPIC_ALLOW_SPEND`-style explicit-authorisation pattern
   `scripts/supervised-generate.mjs` already uses (API key present,
   `--confirm`, printed cost estimate), so it can be run deliberately and
   safely, on demand, without becoming part of `npm test`.

**Recommendation: Option 2 now, Option 3 later if the category-scoped
retrieval question is worth pursuing.** Moving it out of `test/` costs one
file move and closes the naming-convention trap immediately, with zero
functional change and zero API spend. Formalising it as a gated eval is more
work than tonight's scope and duplicates a pattern (`supervised-generate.mjs`)
that already exists — building it before Mark confirms the retrieval question
is still open would risk Failure pattern E (a second, weaker mechanism next
to one that already works).

**What was done in the meantime:** nothing. The file was read, not run, not
moved, not deleted, per Rule Zero and "nothing is deleted." It remains
untracked in `test/testCategoryScoped.ts`, exactly as found.

**Reversibility:** trivially reversible either way — it is a single file,
untracked, with no dependents. `git mv` is a one-line undo.

---

## 2. The mutation harness cannot verify anything in `board-generator.js`/`board.js`/`isolate.js` while their test files carry an honestly-red gate. Convert to `{ todo }`, or leave blocked?

**Ground-checked, 2026-09-09 (CLI lane, overnight), full details in
`docs/AUDIT-PROTOCOL.md` §7's new 2026-09-09 entry:** `scripts/_mutcheck.mjs`
refuses to score mutations against a "red baseline" — correct by design.
`test/boardGenerator.test.ts` carries B2.5's own deliberately-red gate
(generation time vs. the 30 s ceiling); `test/isolate.test.ts` carries one
already-catalogued old-world-pin failure. Both compose with the mutation
harness's own baseline check to make 9 of the 21 outstanding mutations
(4 in `board-generator.js`/itself, 5 in `isolate.js`/`world-render-3d.js`)
structurally unverifiable for as long as those files stay red — confirmed
by running the real commands and reading their refusal output, not
inferred. This is the SAME shape as the already-documented Candidate
pattern F (`docs/AUDIT-PROTOCOL.md` §7, 2026-09-08): two individually
correct controls (an honestly-red gate; a harness that refuses to trust a
red baseline) that together permanently disable a third thing (mutation
verification for those files).

**The question:** the fix that closed this exact deadlock once already
(`originStability.test.ts` + `gen-test-count.mjs`, via `node:test`'s
`{ todo }` status) would close it again if applied to B2.5's gate — but
that changes what "red" means for a control `docs/specs/BOARD-REBUILD-PLAN.md`
was explicit should stay a plain, visible failure ("asserted honestly,
and it is red... not hidden by loosening the assertion").

**Options:**
1. **Convert B2.5's gate to `{ todo: true }`.** `node:test` still runs it,
   still prints its real failure every time, and it stops counting toward
   both the fail total and (per this finding) the mutation harness's
   baseline check — unblocking 4 of the 9. Risk: a `todo` status reads to
   a casual reader as "not yet built" rather than "known limitation, real
   and current," which is a real change in how the finding presents,
   even though the number and the message are unchanged.
2. **Leave it a plain failing assertion; teach `_mutcheck.mjs`/`mutate.mjs`
   an explicit allowlist of expected-red test titles**, separate from
   `{ todo }` semantics, so the presentation Mark chose stays exactly as
   written and only the mutation harness's own blindness to it changes.
   More code to write and review than option 1; does not touch the
   already-working `{ todo }` precedent.
3. **Leave both blocked, named and explained (this run's choice for
   tonight)** — the honest-red gate's own meaning is untouched, and the
   9 blocked mutations are recorded as blocked-with-reason rather than
   silently reported as CAUGHT or quietly dropped from the manifest.

**Recommendation: Option 3 stands until Mark decides between 1 and 2** —
this is exactly the shape of decision `docs/BUILD-LOOP.md` Step 2 asks to
be planned in writing and reviewed before being acted on, not resolved
unilaterally by whoever hits the deadlock next, and unlike the
`test/testCategoryScoped.ts` decision above, either fix here touches a
gate whose exact wording and status Mark chose deliberately once already
this week.

**What was done in the meantime:** nothing touched `board-generator.js`,
`board.js`, `isolate.js`, `world-render-3d.js`, or either test file. The
9 blocked mutations are recorded as `NEVER RUN` in the honestly-regenerated
`test/mutationSummary.generated.json` (109 of 119 CAUGHT, 10 never run —
the 9 here plus 1 unrelated, see below), not silently reported CAUGHT and
not deleted from the manifest.

**The 10th, separate from this decision:** `b2-5-ground-verified-opt-in-
is-load-bearing` (`public/board.js`) is not blocked by the deadlock above
— it is blocked because it was never a `node:test` assertion to begin
with (its own manifest `note` says "verified BY HAND... a real timing
measurement"). No decision needed here; it just needs someone to run the
same paired-timing procedure `docs/specs/BOARD-REBUILD-PLAN.md`'s B2.5
section already describes and hand-record the result, the same way it
was done the first time.

**Reversibility:** option 1 is one `test()` call's options object; fully
reversible. Option 2 is new, reviewable code in two scripts; reversible
but not free. Option 3 (the current state) costs nothing to leave or to
change later.
