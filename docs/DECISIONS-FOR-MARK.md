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
