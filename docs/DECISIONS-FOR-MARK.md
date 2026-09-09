# Decisions for Mark — the queue

Per `docs/OVERNIGHT-RUN.md` §"THE DECISION QUEUE": when something is Mark's
to decide, it goes here rather than blocking the run. Each entry: the
question, the options, the recommendation and why, what was done in the
meantime, and how expensive it is to reverse.

---

## 1. `test/testCategoryScoped.ts` — untracked, spends real money if run. Keep, move, or formalise? RESOLVED (moved).

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

**RESOLVED, 2026-09-09 (CLI lane, RUN3 tail): Option 2, executed.** Moved
(plain `mv`, not `git mv` — the file was untracked, so git had nothing to
rename) to `scripts/experiments/category-scoped-retrieval.ts`, keeping the
`.ts` extension rather than the `.mjs` this entry originally suggested —
the file imports two OTHER `.ts` files directly by their real filenames
(`src/modelRetrieval.ts`, `src/clientWorkersAI.ts`), which is only valid
because the entry file is itself `.ts` (Node's native TypeScript-stripping
import resolution); renaming the entry to `.mjs` while leaving those
`.ts` imports as-is would have been an untested, unverifiable functional
change disguised as a file move. All four relative imports were updated
for the new, one-level-deeper path (`../public/...` → `../../public/...`,
`../src/...` → `../../src/...`, `./modelRetrievalGolden.ts` →
`../../test/modelRetrievalGolden.ts`) and each target file's existence
was confirmed directly (`ls`) at its new relative path. **Not executed**
— running it would spend real Workers AI money, which this run has no
authorisation for, so the move's correctness rests on the confirmed
import paths, not on a real run's output.

**Reversibility:** trivially reversible either way — it is a single file,
now tracked at its new path, with no dependents. `git rm` + restoring the
original content at the old path is a one-line undo, same as before.

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

**DECIDED PROVISIONALLY, Mark, via `docs/briefs/RUN2-CLI-2026-09-09.md`:
Option 2, the allowlist** — "preserves the honest red AND unblocks the
controls, where converting the gate to `{todo}` would hide a real
measurement." **Implemented**, this run: `scripts/expected-red.mjs` (new)
— a named, documented `Map` of test titles expected to stay red, each
entry carrying its own reason, read by both `scripts/_mutcheck.mjs` and
`scripts/mutate.mjs` (one list, not two that could drift). Currently
carries exactly one entry, B2.5's own CPU-time gate title, copied
verbatim from `test/boardGenerator.test.ts` and asserted to match it by
a dedicated test (`test/expectedRed.test.ts`, 5 tests, mutation-tested:
`expected-red-does-not-rubber-stamp-everything`, CAUGHT). **Reversible
in one commit**, as promised: delete the entry (or the whole file) and
both scripts return to their original, stricter behaviour with no other
code to touch.

**What was done:** `board-generator.js`/`board.js`/`test/boardGenerator.test.ts`
were not touched — the fix lives entirely in the two scripts and the new
allowlist module, exactly as Option 2 promised. The `isolate.test.ts`-side
5 mutations are NOT unblocked by this fix (that file's own red is an
old-world pin, not a permanent gate like B2.5's — a different problem,
correctly not added to this allowlist) and wait on B2.8's re-pin instead.

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

---

## 3. B2.5's CPU-time gate (RUN3 item 8) — get under 30 s, or retire it? Neither, on its own — the comparison itself may now be a category error

**Ground-checked, 2026-09-09:** `test/boardGenerator.test.ts`'s B2.5 case
compares `generateBoard()`'s own wall-clock time against 30,000 ms —
Cloudflare's documented default Worker CPU-time ceiling for a single
request. That ceiling answers "is this safe to run inside a live
request." **B2.6 already moved generation OFF the live request path
entirely** (`scripts/gen-board.mjs`, an offline build step, run by hand
or CI, never inside a Worker) and built the actual replacement gate this
item asks for — a static scan (`test/boardGenerator.test.ts`'s own B2.6
case) asserting nothing in `src/` imports `generateBoard` at all. That
gate is real, green, and — per Mark's own words recorded when B2.6
landed — "a stronger gate than a time limit, and it cannot be satisfied
by a faster machine."

**So the real question is not "get under 30 s or retire the gate."** It
is: does an OFFLINE, run-once-per-seed build step need to fit inside a
LIVE-REQUEST CPU ceiling at all? Framed that way, comparing the two may
itself be the defect — not the 40–291 s measurement, and not the gate's
existence, but the specific number it is held against.

**Why this is not simply resolved by converting it to `{ todo }`
(RUN2's own precedent for a permanent, honest red):** Mark's own
reasoning against `{ todo }` for mutation-harness purposes, recorded in
Decision #2 above, was explicit — "a `todo` status reads to a casual
reader as 'not yet built' rather than 'known limitation, real and
current.'" That reasoning is not scoped only to the mutation harness; it
would apply just as much to converting the gate's own status here. This
run does not have grounds to override that stated preference
unilaterally, and Rule Zero (`docs/UMAA-CALIPER.md`) forbids inventing a
replacement threshold (a "reasonable CI build time," a "reasonable
developer wait") with no source to back it — the same discipline that
makes the current 30 s number traceable is exactly what makes a
made-up replacement untrustworthy.

**Options:**
1. **Leave the assertion exactly as it is, comparing to 30,000 ms**,
   accepting that the number it is compared against describes a
   constraint this code no longer runs under — an honest-but-slightly-
   wrong comparison, at least clearly labelled as such.
2. **Remove the numeric assertion; keep the measurement as reported
   information only** — `console.log`/a comment recording the real
   time every run, no pass/fail threshold at all, since B2.6's static
   gate is what actually guards the failure mode that matters (a live
   request calling this).
3. **Replace 30,000 ms with a sourced, different ceiling** appropriate
   to an offline build step (a CI timeout, a "developer's patience for
   a local command" figure) — but only if Mark can name where that
   number comes from; inventing one here would repeat the exact
   fabrication pattern `docs/AUDIT-PROTOCOL.md`'s own Rule Zero section
   was written to stop.

**Recommendation: Option 1 stands for tonight** — the least irreversible
choice, and the one that changes nothing about what is measured or
reported. The gate stays red, honestly, exactly as Mark last reviewed
it; this entry exists so the REASON it is being left alone is on record
(a real, considered "not solved by this run," not silence), rather than
either quietly converting it or quietly leaving it with no note at all.

**What was done in the meantime:** nothing touched
`test/boardGenerator.test.ts`'s B2.5 case, `public/board-generator.js`,
or `scripts/gen-board.mjs`. The gate stays exactly as found: red,
measured, unchanged.

**Reversibility:** trivial either way — a threshold comparison in one
test file, changeable in one commit whenever Mark picks an option.

---

## 4. `test/cullingRatio.test.ts` AND `test/regressionGate.test.ts` both report the skyline view as almost empty (12 triangles / 100% culling ratio) when it is visibly not. A real defect, found by accident, not caused by tonight's work — root-cause not fully traced. Fix now, or queue?

**Ground-checked, 2026-09-09 (CLI lane, overnight), found while verifying
RUN3 item 2's own street-lamp addition did not regress the standing
performance gates:** `node test/run.mjs test/cullingRatio.test.ts` fails:
`Culling failed: Street level draws 393466.7% of skyline triangles
(47,216 vs 12)`. `node test/run.mjs test/regressionGate.test.ts` fails
the SAME way — `Culling ratio must be < 40%, got 100.00%` — so this is
not one test's own bug, it is at least two gates sharing whatever
mechanism reads render stats. **Confirmed NOT caused by anything this
run touched, for both gates separately** — `git stash`ed every
uncommitted change back to the last real commit (`f99d149`) and re-ran
each test in isolation: identical failures, same numbers. The stash was
restored both times; nothing else was changed as a result of this check.

**Confirmed the render itself is fine, only the MEASUREMENT is wrong:**
`node scripts/shoot.mjs "Downtown skyline"` — the project's own real,
looked-at verification tool — produced a full, correct, richly detailed
skyline (`.shots/downtown-skyline.png`: dozens of towers, streets, trees,
harbour, boats, a stadium), while that exact same render's own reported
stats line read `[calls: 1, tris: 12]`. The pixels are right; the number
is not.

**A working theory, not a proof:** `public/city.html`'s render loop
(`window.__getRenderStats()`, around line 601) reads
`renderer.info.render.{calls,triangles}` (or a manually-captured
`sceneRenderInfo` snapshot when post-processing is on) once
`window.__ready` flips true. Three.js resets `renderer.info.render` at
the start of every `renderer.render()`/composer sub-pass call, so any
render invoked between the frame that actually drew the city and the
frame the test's `page.evaluate()` happens to sample can leave that
counter reflecting only the LAST, near-trivial pass (or a stale
snapshot) rather than the frame that produced the image on screen. This
would explain why **the failure is load-sensitive, not constant**: a
run of this test alongside other heavy processes tonight (the RUN3 item
5 mutation harness, running concurrently) showed BOTH views collapse to
`12 vs 12`; run in isolation, only skyline stayed stuck at `12` while
street read a correct `47,216`. That pattern — worse under contention,
never fully absent — fits a timing race in the stats-capture path, not
a one-off fluke and not a deterministic logic bug either. **This is a
theory sized from the evidence above, not a confirmed root cause** — the
exact line where the wrong number gets latched has not been isolated.

**Three candidate causes ruled out, so the next investigation does not
re-check them:** (1) a second, stray `THREE.WebGLRenderer` instance
(e.g. a minimap/gizmo canvas) whose stats `window.__renderer` might be
pointing at by mistake -- only one `new THREE.WebGLRenderer(` call
exists in `public/city.html`, and `window.__renderer` is assigned from
it directly. (2) an independent render call inside `buildWorld()`
(`public/city-render.js`) racing the page's own loop -- that file has
no `.render(` or `requestAnimationFrame` calls at all; it only builds
the scene graph, never draws it. (3) the `sceneRenderInfo` capture hook
itself being structurally wrong -- read directly: it wraps
`mainRenderPass.render`, calls the original render first, then snapshots
`r.info.render` immediately after, before any later composer pass (bloom,
AO, output) can reset it -- the mechanism designed to dodge exactly the
reset race in (this decision's own theory) reads as correct on
inspection. None of the three explains the 12-triangle reading by
itself, which is why the working theory above still stands as the best
remaining lead, not a wrong one that further reading would have
disproved quickly.

**Why this was not fixed tonight:** root-causing a three.js
`WebGLRenderer.info` reset race precisely enough to fix it, without
guessing, is a real, separate investigation — instrumenting the
composer's own pass sequence, or the `still`/`window.__ready` frame-count
interaction, then writing a regression test that would have caught the
wrong fix as readily as the wrong original. Attempting a guessed fix
under time pressure and calling it done would be exactly the "reported
unverified work as verified" failure this project's own standard exists
to catch.

**Options:**
1. **Leave it exactly as found, named here, for a future session to
   root-cause properly** — the render itself is confirmed correct by an
   independent tool (`shoot.mjs`), so visitors are not seeing a broken
   city; only this one automated gate's own number is untrustworthy.
2. **Queue a targeted investigation as its own next step**, scoped
   narrowly to instrumenting `renderer.info` resets around the composer
   pipeline and the `still` frame loop in `public/city.html`, with a
   regression test asserting the reported stats match a known-good
   reference count for a fixed, non-post-processed scene — the gate
   cannot be trusted to catch a REAL culling regression while its own
   measurement is this fragile.
3. **Disable/quarantine the gate immediately** as unreliable — rejected:
   it is evidence of a real defect (an untrustworthy measurement), and
   removing the messenger would just delete the record that the
   telemetry needs fixing, the same "absence read as success" pattern
   `docs/AUDIT-PROTOCOL.md` already names.

**Recommendation: Option 1 for tonight, Option 2 as the real next step**
— the least irreversible choice that does not pretend a guessed fix is
a verified one. Left exactly as found; not touched.

**What was done in the meantime:** nothing in `public/city.html`,
`test/cullingRatio.test.ts`, or `test/regressionGate.test.ts` was
changed. The stash-and-restore used to isolate this from tonight's own
work left the tree byte-identical to before the check
(`git status` confirmed clean before, matching after).

**Reversibility:** trivial to act on later either way — nothing was
changed tonight for this to revert.

**A consequence found afterward, worth recording here rather than as its
own entry:** this red result also blocks `scripts/mutate.mjs`'s own
whole-suite baseline check (it refuses to score any mutation against a
red baseline, correctly, by design) — so RUN3 item 5's real, verified
fixes (the SURVIVED mutation and its sibling, both now CAUGHT, confirmed
via the scoped `scripts/_mutcheck.mjs` runner against just their own
test files) could not be re-recorded through the AUTHORITATIVE whole-
suite path (`mutate.mjs --all` → `test/.mutate-results.json` →
`scripts/gen-mutation-summary.mjs` → the README sentence
`test/publicClaims.test.ts` pins). Rather than hand-edit README's
"1 survived or inconclusive" sentence without the generated evidence
behind it — the exact fabrication pattern this project's own claims
discipline exists to prevent — that sentence was left exactly as it
was tonight. **It is now understating real progress, not overstating
it** (the true count is better than what it says), which is the safe
direction to be wrong in but is still wrong, and stays wrong until
either decision #4 above is resolved (unblocking a real
`mutate.mjs --all` run) or `test/cullingRatio.test.ts`/
`test/regressionGate.test.ts` are added to `scripts/expected-red.mjs`'s
own allowlist — a real, separate decision (does a load-sensitive
telemetry bug belong in the same "honestly, permanently red" category
B2.5's CPU gate does, or is it different enough to need its own
category) that this run did not have grounds to make unilaterally
either.
