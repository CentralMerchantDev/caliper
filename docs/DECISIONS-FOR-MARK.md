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

---

## 5. B4's road pieces are a fixed 9 m; roadkit's own closest class is 10 m. No exact match exists to wire "roads from roadkit" against. RESOLVED, 2026-09-11 (retire `ROAD_WIDTH`).

**Ground-checked, 2026-09-09 (CLI lane, RUN3):** `public/board-generator.js`
builds every road piece at `ROAD_WIDTH = 9` (metres, one fixed width for
every road, "P1 of this generator" per its own comment). `public/
roadkit.js`'s own `ROAD_STANDARDS` table has no 9 m class: `ALLEY` is 6 m,
`LANE` is 10 m, `STREET` is 18 m, and up. Checked directly (`grep`
against every class's own `row` field), not assumed. Wiring
`roadkit.straight(roadClass, modules)` onto a real 9 m piece means either
drawing a 10 m-wide kit geometry on a 9 m-wide reserved footprint (a real,
visible 1 m mismatch against the piece's own SPACE reservation) or
changing `ROAD_WIDTH` itself — which regenerates every road piece in the
committed board and is a generation-affecting decision, not a rendering
one.

**The question:** which side moves — roadkit gains a class that matches
the generator's own 9 m, or the generator's own width changes to match an
existing roadkit class?

**Options:**
1. **Add a new roadkit class** (e.g. `LOCAL_STREET`, 9 m, a narrower strip
   layout than `LANE`'s 10 m) alongside the existing seven. Purely
   additive — no existing class's `strips`/`row` changes, so nothing
   already wired to `AVENUE`/`STREET`/`LANE`/etc. is affected. Costs
   designing one real cross-section (verge/carriageway widths summing to
   9 m) and one new table entry.
2. **Change `ROAD_WIDTH` to 10** to match `LANE` exactly, and regenerate
   `public/board.generated.json`. Touches every one of the ~11,538 real
   road pieces already placed and measured (coverage %, block/plot sizing
   in `SETTLEMENT_TABLE` were tuned against the current 9 m), so this is
   NOT a free rename — it is a real re-tuning pass across B2's own
   already-measured numbers.
3. **Accept the 1 m mismatch** and wire roadkit's `LANE` class onto the
   9 m piece as-is, documented as a known, small visual discrepancy.
   Cheapest, but ships a real, visible seam (a kit road 11% wider than
   its own reserved footprint) rather than fixing or naming a genuine
   design gap.

**Recommendation: Option 1.** It is additive (nothing else in `roadkit.js`
changes), does not touch the already-measured B2 generation numbers, and
produces an exact match rather than a documented compromise. Not
implemented — designing a real 9 m cross-section is itself a content
decision (verge/carriageway proportions), the same kind of call
`ROAD_STANDARDS`'s existing seven classes each represent, and this run
did not have grounds to invent one unilaterally.

**What was done in the meantime:** nothing in `public/roadkit.js` or
`public/board-generator.js` was touched. `scatterStreetLamps` (RUN3 item
2, commit `a8f5e14`) was wired instead — a real B4 increment that does
not depend on this question, chosen specifically because it does not.

**Reversibility:** Option 1 is fully reversible (delete the new class).
Option 2 is not free to reverse — it means re-measuring B2's own
coverage/density numbers a second time. Option 3 is reversible but ships
a visible defect in the meantime.

**RESOLVED, Mark, 2026-09-11: none of the three options above.** All three
accepted the premise that the board has one road width; that premise is
the defect. `rule://standard-piece-sizes` (decided 2026-09-10, one day
after this entry was ground-checked, 2026-09-09 — the queue went stale by
a rule that postdates it) settles the two things that made a real fix feel
too expensive to attempt here: *"Widths need not match real-world
dimensions"* (so no cross-section had to be researched to justify a match)
and *"Regeneration is accepted. Coverage and density numbers get re-taken
when the catalogue changes. That cost was accepted explicitly."* The
recommendation above (Option 1, add a 9 m roadkit class) is superseded,
not merely revised — under the new rule the board should not have a
one-size premise at all, whether that size is 9 m or a new 9 m class.

**Resolution: retire `ROAD_WIDTH` as a single constant.** The board
generator places TYPED road pieces, taking their widths from
`roadkit.js`'s own `ROAD_STANDARDS`, in place of one hard-coded 9 m for
every road. Regeneration and re-taking B2's coverage/density numbers are
accepted costs, per the rule, not a reason to avoid this. Full detail,
including the module-size proposal (2 m, already true of every existing
`ROAD_STANDARDS` class) and the type catalogue this unlocks:
`docs/specs/PIECE-CATALOGUE-ROADS.md`. Three items open under `§8` of that
document remain Mark's call (module size, whether the partitioned
one-lane road needs its own footprint, and whether freeway-class
junctions should always be grade-separated rather than at-grade) — this
resolution answers decision 5 itself, not those three.

**What was done in the meantime:** `docs/specs/PIECE-CATALOGUE-ROADS.md`
committed. Step one of the retirement (a road piece can carry a class,
default `STREET`, no geometry changed yet) is this session's item 2 — see
its own commit for gate evidence. No regeneration, and no coverage/density
re-measurement, has happened yet.

**Reversibility:** the catalogue document itself is trivially reversible
(it is a proposal). The retirement itself is the same shape as Option 2
above always was — not free to reverse once the board is regenerated
against typed widths — but that cost is now an accepted one, not an
open question.

---

## 6. B4's building typologies size themselves internally; two of twelve have no override at all. A naive "typologies from the kit" wiring would silently overhang the plot for at least those two.

**Ground-checked, 2026-09-09 (CLI lane, RUN3):** `public/buildings.js`'s
`building(typology, seed, options)` dispatches to twelve generator
functions (`bldVilla`, `bldTerrace`, …), each of which computes its OWN
footprint from its own seed/options — most (checked: `bldVilla`,
`bldTower`, `bldWarehouse`, `bldWorkshop`) accept a `cellW`/`cellD`
override that lets a caller force a specific footprint, but two
(`bldHighStreetTerrace`, `bldBusinessParkBlock`) have **hard-coded**
`footW`/`footD` values with no override parameter at all — checked
directly in their source, not assumed. `public/layout.js`'s own
`typologyFor`/`fits` mechanism exists SPECIFICALLY because of this: its
own comment records that without a fits-check, "3,552 of 20,472
buildings — 17.4% — overhung the plot they were chosen for." That
mechanism is not reusable as-is for the new board pipeline — `layout.js`
is itself scheduled for quarantine (B4's own exit condition, RUN3 item 3,
blocked on this) — so the new pipeline needs an equivalent, not a
borrowed one.

**The question:** build a new, fits-safe typology selector for the board
pipeline before wiring real typologies onto building pieces, or accept a
narrower first slice that sidesteps the two hard-coded typologies
entirely?

**Options:**
1. **Build a real fits-safe selector for the new pipeline** — for each
   building piece, try typologies in a defined order, ask each one
   (via its own returned `footprint`, not a caller-side guess) whether
   it fits the piece's own `foot.w`/`foot.d`, and place the first that
   does; refuse (fall back to a placeholder, or skip) rather than
   overhang. Matches the plan's own standard ("never silently spread the
   defect further"), but is real, separate design-and-test work — not a
   rendering change.
2. **Wire only the ten typologies that accept a `cellW`/`cellD`
   override**, forcing each to the piece's own footprint directly (as
   `bldVilla`'s own contract already allows), and leave
   `bldHighStreetTerrace`/`bldBusinessParkBlock` out of rotation until
   option 1 exists. Narrower, but ships real kit geometry for 10 of 12
   typologies without the overhang risk for the other 2 — the clamp
   ranges of the ten still need checking against real plot sizes before
   this is safe (not yet done).
3. **Wait for option 1 before wiring any real typology** — keeps the
   current plain-box placeholder for every building piece until a
   fits-safe selector exists for all twelve. Safest, slowest.

**Recommendation: Option 1, with option 2 as a legitimate interim step
if a real typology pass is wanted sooner** — a partial wiring that
silently omits two typologies is a smaller version of the exact defect
this decision exists to avoid (an unstated gap presented as if the
kit were fully wired), so it should be named as a real, explicit interim
if chosen, not treated as equivalent to finishing the job. Neither
option was implemented this run — beyond the fits question, wiring real
per-typology geometry across the board's own ~17,600 building pieces
(unmerged LOD0 parts, per typology) would also need its own performance
check, which cannot currently be trusted (Decision #4 above).

**What was done in the meantime:** nothing in `public/buildings.js`,
`public/board-generator.js`, or `public/board-render.js` was touched for
building typologies. Building pieces still render as the plain box B3
originally built.

**Reversibility:** trivial either way tonight — no code was written
against either option, so there is nothing to undo.

**RESOLVED-BY-RULE, checked 2026-09-11 against `rule://standard-piece-sizes`
(decided 2026-09-10 — one day AFTER this entry was ground-checked,
2026-09-09; the queue went stale by exactly one day here, the same shape
as decision 5 above).** The rule answers this directly, and its answer is
the opposite of this entry's own recommendation:

- *"Fits-searching stops being a category. Nothing needs to try
  typologies until one fits, because nothing can fail to fit."* — Option 1
  above (*"try typologies in a defined order... place the first that
  does"*) is precisely the fits-searching category the rule retires. It
  is not the safe, thorough choice this entry took it for; it is the
  mechanism the rule exists to make unnecessary.
- *"A typology with a hardcoded footprint gets remade, not worked
  around."* — the two problem typologies, `bldHighStreetTerrace` and
  `bldBusinessParkBlock`, are not a search problem at all. They are
  remade to accept a `cellW`/`cellD` override, the same contract the
  other ten (`bldVilla`, `bldTower`, `bldWarehouse`, `bldWorkshop`, …)
  already honour. Once all twelve accept an override, every building
  piece can be forced to its own slot directly — no trying, no first-fit,
  no refusal path, because (per the rule) nothing can fail to fit a slot
  it was built for.

This is cheaper than either original option: narrower than Option 1 (no
selector to design, test, or maintain) and does not leave a permanent gap
the way Option 2 did (all twelve typologies end up wired, not ten).
**Not implemented this session** — remaking two typology generator
functions is real code work, out of scope for this decision-queue
correction pass; named here so the next B4 typology step starts from the
rule's answer rather than re-deriving or re-arguing it.

**What was done in the meantime:** nothing in `public/buildings.js` was
touched. This entry's own recommendation (Option 1) should no longer be
read as live guidance — superseded by the rule, not merely qualified.

**Reversibility:** trivial — no code was written against either the
original options or this resolution; the next session remakes two
functions, following an already-decided rule rather than choosing among
options.

---

## 7. Three of the 12 settled boundaries have zero crossing egress on the real, committed board. Retry the anchor search, reserve space before roads/buildings place, or leave it named?

**Ground-checked, 2026-09-10 (CLI lane), found while fixing the zero-crossings
defect a blind Codex review surfaced in `b1-land`:** that defect (the
committed `public/board.generated.json` had 17,728 roads, 17,637 buildings,
and zero bridges/docks — `buildCrossingPieces()` worked, its output never
reached the shipped asset) is fixed — `npm run gen:board` regenerated the
asset and it now carries 16 real dock pieces. But the real regeneration
surfaced a second, more specific gap underneath the first: every existing
`test/bridgeGenerator.test.ts` gate proves `buildCrossingPieces()` against a
**fresh** `createBoard()` — nothing placed on it yet. `scripts/gen-board.mjs`
places crossings onto the SAME board instance `generateBoard()` already
filled with 35,365 roads and buildings (its own comment: real occupancy, not
a synthetic stand-in). On the real archipelago that changes the outcome:
the one bridge-classified edge's own candidate cell collided with an
already-placed piece and fell back to a boat route exactly as designed (0
bridges, not 1 — correct behaviour, not a bug); and of the resulting 22
candidate dock placements, 6 individually collided with real occupancy and
were refused. Three of those six sit on a boundary (`farm-isle`,
`quarry-isle`, `resort-isle`) that has only ONE edge in the crossing graph —
each is a leaf, with no alternate route the algorithm can fall back to. For
those three, the refused dock was the only crossing piece that would have
given that boundary any egress at all. **Confirmed directly, not inferred:**
`farm-isle`/`quarry-isle`/`resort-isle` have zero bridge or dock pieces
anywhere on their own territory in the committed board, while the other 9 of
12 boundaries each have at least one. A new gate
(`test/bridgeGenerator.test.ts`, "every one of the 12 settled boundaries has
at least one real crossing piece...") asserts this and is currently, honestly
RED — watched red on purpose, the same standard this project holds every
other real gap to.

**Why this is not the same defect Codex found, and not fixed by the same
regeneration:** Codex's finding was "the delivered asset has zero crossings
at all" — a total absence, fixed by running the generator that already
existed. This finding is "the delivered asset has crossings, but three
specific boundaries still have none of their own" — a real limitation in how
`buildCrossingPieces()` behaves against a REAL, already-occupied board, which
no amount of re-running the existing code changes; the algorithm has no retry
or reservation logic for this case today.

**The question:** how should a leaf boundary's own crossing survive real
occupancy?

**Options:**
1. **Retry with a different anchor point** when a leaf boundary's own dock is
   refused, instead of accepting the first candidate found — `walkAnchor()`
   already walks along the boundary's own shoreline for a dry cell; extending
   it to also probe for board-emptiness before returning would let it step
   past the collision. Contained to `public/bridge-generator.js`; does not
   touch `board-generator.js`'s own road/building placement at all. Real
   design work (how far to step, when to give up) and needs its own test —
   not implemented this run.
2. **Reserve crossing footprints on the board BEFORE `generateBoard()` places
   roads and buildings**, so the collision cannot happen in the first place.
   Requires computing `crossingGraph()`/anchor candidates earlier in
   `scripts/gen-board.mjs`'s own pipeline, which currently computes them
   strictly after. A bigger, sequencing-level change with a wider blast
   radius (whatever `generateBoard()` would have placed there instead now
   can't be) — not attempted unilaterally.
3. **Leave it named, exactly as this entry does** — the render path (B3)
   already draws whatever pieces exist; three boundaries simply render
   without a boat stop or bridgehead for now, a real but bounded and legible
   gap, not a crash or a silent one. Costs nothing to leave, and the new gate
   means nobody can re-claim "B2.7 connects all 12 boundaries" against the
   real asset without this test going green first.

**Recommendation: Option 3 stands for now, Option 1 as the real next step if
this is worth closing before B4/B5.** Retrying the anchor search (option 1)
is the narrower, more contained fix and does not risk re-tuning B2's own
already-measured coverage numbers the way option 2 would; it is real,
scoped, separate work this run did not have grounds to attempt under the
same time pressure that produced the original defect. Left named and red
rather than guessed at.

**What was done in the meantime:** `public/bridge-generator.js` and
`public/board-generator.js` were not touched. `docs/specs/COMPLETION-PLAN.md`'s
own B2.7 line was moved from `[x]` to `[!]` to match: crossings are real and
delivered, but "connects the 12 settled boundaries" is not yet true of the
committed asset, and the plan's own rule is a tick requires both.

**Reversibility:** trivial — nothing was implemented against either option,
only a test and a status line, both easy to revisit.

**RESOLVED-BY-RULE, checked 2026-09-11 against
`rule://generated-world-is-a-starting-state` (decided 2026-09-10, same day
this entry was ground-checked — the rule's OWN worked example is this
exact case, described in the past tense: "the crossing gate demanded that
every settled boundary have crossing egress, and three did not. That was
read as a defect. It is not." That sentence is this decision, named
directly, not a coincidence of subject matter).** The rule reframes the
question this entry asked ("how should a leaf boundary's own crossing
survive real occupancy?") as the wrong question:

- *"Bridges must be possible, not required. An island reached only by
  dock and boat lane is fine. Three boundaries having no bridge means
  nobody has placed one there yet."* — none of Options 1-3 above were
  wrong to consider, but Option 1 (retry the anchor search) and Option 2
  (reserve space before placement) both treat the absence as damage to
  repair. The rule says it isn't damage; a starting state that leaves
  room for a player or a later pass to add a crossing is doing its job.
- **Corrected gate, verbatim from the rule:** *"every settled boundary
  has at least one crossing — bridge or dock — or is listed as
  intentionally isolated. A dock counts."* Checked directly against the
  real, current gate (`test/bridgeGenerator.test.ts`, the test named in
  this entry) rather than assumed: it ALREADY treats a dock as sufficient
  — `covered` is built from both `pieceType === "dock"` and
  `pieceType === "bridge"`, so "a dock counts" is not a gap. The gap
  against the corrected gate is narrower than the whole test: there is no
  "or is listed as intentionally isolated" allowance anywhere, so the
  gate currently demands a real, placed piece for all 12 with no way to
  name an island as deliberately not-yet-connected.
- Per the rule's own "what still has to hold": a boundary reachable by
  NOTHING at all (no road, no dock, no bridge, not listed as isolated)
  would still be a real defect — coherence, not completeness, is what the
  rule keeps. `farm-isle`/`quarry-isle`/`resort-isle` are not that; they
  are leaf boundaries whose one crossing candidate was refused, which is
  exactly "nobody has placed one there yet," not "nothing ever could."

**Not implemented this session** — rewriting `test/bridgeGenerator.test.ts`'s
gate to the corrected form (and deciding whether these three boundaries
get formally listed as intentionally isolated, or left for a future
anchor-retry pass to actually connect) is real test-and-code work, out of
scope for this decision-queue correction pass. Named here so that work
starts from the rule's answer.

**What was done in the meantime:** nothing in
`test/bridgeGenerator.test.ts`, `public/bridge-generator.js`, or
`public/board-generator.js` was touched. The gate stays red, exactly as
found — now understood to be asserting a stronger property (full
completeness) than the project's own rule says a generated world owes.

---

## 8. Should the scheduled Cowork run keep pointing at this brief at all? (transcribed from an untracked handover its own environment could not commit)

**Not this run's own finding — transcribed verbatim in substance from
`docs/audits/OVERNIGHT-2026-09-10.md` §5, written 2026-09-10 ~07:20-07:45 EDT
by a scheduled Cowork run that could not write to git at all** (its shell
mounts this repository read/write but not unlink; `git`'s own lock-file
protocol needs unlink for every commit, so the FIRST `git status` of that
session created `.git/index.lock` and nothing could remove it afterward —
proved, not assumed: a throwaway repo on the same mount accepted exactly one
commit and jammed permanently on the second). That run could not append this
to the tracked queue for the same reason it could not commit anything else,
and said so, asking a later session to transcribe it once the lock cleared.
**Ground-checked here, 2026-09-10 (CLI lane): the lock and its companion
probe file (`.writetest`) do not exist on this checkout** — either they were
specific to that other session's own mount and never touched this disk, or
something cleared them independently; `git status`, `git fsck
--connectivity-only` both clean. Not a live blocker for this session.

**The question, as that run posed it:** the overnight brief assumes a shell
that can run `git commit` and PowerShell. The environment that scheduled run
executed in had neither. Should the scheduled task be repointed, adapted, or
narrowed?

**Options (that run's own, preserved):**
1. **Repoint the schedule at the Claude Code CLI**, where every prior RUN 1-5
   and this one executed and where PowerShell/a normal filesystem are
   available. The brief works exactly as written, unchanged.
2. **Approve file deletion for the Cowork sandbox** so its mount permits
   unlink. One-time approval; after it `git` behaves normally there too. Per
   that run: "cannot be granted mid-run... has to be granted in advance."
3. **Narrow the Cowork schedule to read-only verification** — run gates, read
   the plan, ground-check published numbers, write a report — and leave all
   building to the CLI lanes. That run's own read-only half worked and found
   a real defect (the 1087-vs-1194 test-count drift, §1/§9 below) in a few
   minutes.

**That run's recommendation, preserved: option 1, with option 3 as a genuine
addition, not a consolation.** Not this session's call to make — a scheduling
decision, not a code one.

**What was done in the meantime:** nothing — this section only transcribes
the question into the tracked queue, per that run's own explicit request, so
it is not lost the way an untracked file would be. `docs/audits/
OVERNIGHT-2026-09-10.md` itself has now been added to git by this session
(see this session's own handover entry) rather than left permanently
untracked.

**Reversibility:** trivial — a schedule setting or a permission toggle,
neither touches this repository's own tracked content.

---

## 9. `test/publicClaims.test.ts`'s own count-claim exemption cannot fire while ~40+ unrelated, already-tracked gates stay red — by design, correctly, but that means the page's number cannot be brought into agreement with the runner without either fixing all of them first or relaxing the exemption

**Ground-checked, 2026-09-10 (CLI lane):** `scripts/gen-test-count.mjs`'s own
page-update step is guarded by design: it writes `public/index.html`'s test-
count claim only when the WHOLE suite is green, with one narrow, named
exemption — if the *only* failing test, across both runners, is
`"the test counts on the page are the test counts"` itself, it updates the
page anyway, because that specific staleness is exactly what the script
exists to fix and doing so makes the suite green. Read directly in the
script's own source and comments (`scripts/gen-test-count.mjs`, the
`onlyTheCountClaim` block): *"This is narrow on purpose... the way this one
stays honest is that it cannot fire while anything else is wrong."*

**The consequence, found while attempting to resolve the red
`publicClaims.test.ts` gate this session was asked to fix:** the real,
current suite carries roughly 40+ other failing tests that are not staleness
at all — they are this project's own already-decided, already-tracked,
deliberately-red controls (B2.5's CPU-time gate, decisions #3-#7 above,
`cullingRatio`/`regressionGate`, several road-network/waterway gates named in
this session's own full-suite log). Because the exemption requires the count-
claim to be the *only* failure, it structurally cannot fire while any of
those remain red — which is every day this repository has existed so far.
**The page's stale "1087 tests" claim therefore cannot be legitimately
brought into agreement with the generated record by running the intended
tool, not because the tool is broken, but because it is working exactly as
designed:** a script that updated the page while 40 unrelated things are
failing would be manufacturing the same "green-looking evidence" the
script's own header comment says it was written to stop.

**The question:** how should the count-claim surface be told apart from "the
suite is genuinely broken" when the gap between them is this structural and
this permanent?

**Options:**
1. **Widen the exemption** to also permit updating the page when every OTHER
   failure is already a named, tracked, decided-red control (cross-checked
   against `scripts/expected-red.mjs`'s own allowlist, or an equivalent list
   for node-side gates that are not mutation-scoped). Keeps the page's raw
   test-COUNT honest and current without waiting on B2.5/cullingRatio/etc to
   be resolved. Real, reviewable code — the exact kind of change Decision #2
   above already treated with real caution ("an exemption is how a guard
   grows a hole"), so it should not be done unilaterally.
2. **Leave the page's number stale, exactly as it is, until the suite is
   genuinely fully green** — the strictest reading of the gate's own intent.
   Correct in spirit, but means the page's own test-count sentence is
   expected to stay wrong for as long as this project carries any
   deliberately-red gate, which per Decision #3/#4/#5/#6/#7 above is likely
   to be a long time, possibly permanently for B2.5's own category-error
   gate.
3. **Change what the page claims**, so it is not a number that requires full
   suite health to be honest — e.g. "N tests, M currently red, each named
   below" instead of a single count implying "the suite passes." This is a
   content change to `public/index.html`, not a test-harness change, and it
   sidesteps the exemption question entirely by making the claim match what
   is actually true at all times.

**Recommendation: option 3.** It does not touch the deliberately narrow
exemption logic at all (leaving that guard exactly as strict as it was
designed to be), and it fixes the actual underlying dishonesty risk directly
— a page that says "1087 tests, all passing" when dozens are deliberately,
permanently red is a worse claim than a page that says "1,19X tests, N
currently red, all named" would be. Not implemented this run: it is a
content/copy decision about what the public page should say, the same
category of call `docs/DECISIONS-FOR-MARK.md` already reserves for Mark
elsewhere in this file (e.g. #3's "inventing a new threshold has no source").

**What was done in the meantime:** the generated record
(`test/testCount.generated.json`) was regenerated honestly from a real,
complete run and committed; the page's own claim was left untouched rather
than hand-edited or forced through the exemption. See this session's own
handover entry for the exact numbers and the commit.

**Reversibility:** all three options are reversible; option 3 is the
cheapest to try and the cheapest to revert if Mark prefers a different
framing.

**Addendum, 2026-09-11 (CLI lane, attended):** re-measured, not just
re-reasoned-about. The drift is worse than it looked, structurally, not
just numerically: `test/testCount.generated.json` had itself gone stale
again since the entry above (1194 -> 1212, three intervening commits each
adding tests), confirming this is a recurring, ongoing gap rather than a
one-time staleness -- every time work lands, the generated record needs
re-running, and the page needs this decision resolved before it can ever
catch up on its own. Regenerated honestly again
(`test/testCount.generated.json`, 1212/1150/46/15/1); page left at 1087,
unchanged, per this decision's own "what was done in the meantime." The
gate itself (`test/publicClaims.test.ts`'s "the test counts on the page
are the test counts") was verified to be a real, working equality check,
not a vacuously-red one: temporarily setting the page's claim to 1212 to
match the fresh record turned it GREEN, and reverting turned it red again
for the correct, current reason. This does not change the recommendation
above or resolve the decision -- it is still Mark's call.
