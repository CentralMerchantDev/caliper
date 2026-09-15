# CALIPER — THE PLAN, START TO V1

**Written 2026-09-15. This is the governing plan.** It replaces
`REBUILD-PLAN.md`, which carried three layers of correction and a great deal of
the rejected world. The research that plan contained is preserved intact in
`docs/specs/RESEARCH.md` and cited here by section; **nothing in this document
restates it**, per `rule://reference-not-copy`.

**Nothing from the pre-rebuild world is referenced, bridged, revived or repaired.
It was learned from. It is not carried forward.**

---

## 0. WHAT V1 IS

A **functional, tested, playable** CALIPER that can be sent to someone.

> A person opens the page. They see a world worth looking at. They pick an area,
> place buildings, and see why one cell is worth more than another. They can
> author a piece the catalogue does not contain, and the board cannot tell it
> from a shipped one. Everything they did is still there on reload.

Both ways to play are in v1: **Side A**, placing pieces on a board, and
**Side B**, the coding lane that authors new pieces. Side B is not a later phase
— it is the thing that makes this CALIPER rather than a city builder.

**This is a portfolio piece for senior roles in established industries.** It has
to look like someone who knows what they are doing built it. "Works" is the
floor, not the goal.

### Explicitly NOT v1

Deferred with reasons recorded, not dropped:

- **The economy** — placement cost, authoring rewards, banked value. Authoring
  pays in *capability* in v1: you get the piece you wanted, and it plays like any
  other. See §9.1.
- **Taxes, services, budgets.** These need a clock, and §S1 is stateless by
  construction — *"if it needs a clock, it is out of scope."* Adding a tick would
  not extend the current model, it would replace its central premise. §9.2.
- **The city score's amenity terms** — jobs, healthcare, education, parks.
  Blocked on a catalogue taxonomy that can distinguish a hospital from a
  substation, and they belong with the economy they spend into. §9.2.
- **Progression** — tasks, goals, NPCs.

---

## 1. THE TWO LANES

The split exists so both lanes can run at full speed without touching the same
files. It has held for two weeks; it is written down here because it was never
written down before.

| | **CLI** — `C:\Code\sandbox-spike` | **BLD** — `C:\Code\sandbox-spike-codex` |
|---|---|---|
| **Owns** | Data, logic, rules | Everything rendered |
| | The board, placement, scoring | Materials, meshes, the board render |
| | Terrain **generation** | Terrain **mesh** and its look |
| | The save format, Side B's model | Pointer interaction, the overview |
| | The catalogue's **game fields** | The catalogue's **mesh bindings** |
| **Never touches** | `public/look-proof-*`, `board-renderer.js`, `pointer-interaction.js` | `public/scoring.js`, the migration script, catalogue game fields |

**The seam is data.** CLI produces a height field; BLD displaces a mesh off it.
CLI produces `valueAt`; BLD draws the number. Neither reaches across.

Cross-lane needs go in `docs/CROSS-LANE-REQUESTS.md`. Neither lane merges the
other's branch on its own initiative — `rule://` merge policy, ADR-020.

---

## 2. WHERE THE BUILD ACTUALLY IS

Landed and proven, with gate records in `docs/GATE-LEDGER.jsonl`:

- **The world layer** — areas, LOCKED/OPEN/ACTIVE, addressing, camera-relative
  origin. At most one area active, structurally.
- **The area board** — typed arrays, occupancy index, `occupiedRect()` shared by
  the board and the ghost so they cannot disagree.
- **Placement** — ghost, inert-on-invalid commit, cancel, remove. Save carries a
  schema version and a per-placement timestamp.
- **Scoring** — `value(cell)` stateless at Chebyshev R=3, exponential falloff,
  dirty-set recompute, `valueAt`/`valueIfPlaced`, `perUnitWorth`/`totalWorth`.
- **The city score** — a registry of terms, median wealth as its first.
- **Side B's registry** — an authored piece is validated, placed and scored
  through the identical path a shipped piece uses. Proven by test. **Not
  persisted.**
- **The look** — one shared material, one draw call at twenty pieces across three
  CC0 packs, five lighting mechanisms, cast shadows, a join treatment.
- **The board renders**, the ghost renders, pointer interaction works, the
  overview connects to real area state, impostors cut 99.5% of triangles at
  distance, and a reload round-trips byte-identically.

**12 of 50 catalogue entries are bound to a mesh. 38 are not.**

---

## 3. THE BLOCKERS — FIRST, BOTH LANES

Nothing else starts until these clear. Each is a known defect with a named cause.

### 3.1 The height range is capped at roughly a tenth of what it should be. (BLD)

`mega-tower-a` renders at **26.88 m** — about eight storeys. A 6× cap was added
during L12 to stop it scaling oddly against smaller pieces. **Mark's ruling: a
mega-tower is 100+ storeys, and the range descends from there.** Shanghai, New
York, Hong Kong, Tokyo, Melbourne, Sydney, Toronto — Toronto is the clearest
reference because it holds the whole range in one view: a 72-storey tower and
three-storey semis a kilometre apart.

Remove the cap. §T7 has real dimensions; §R9 has the massing rules.

**That range IS the game.** Compressing it removes the thing scoring exists to
reward.

### 3.2 `massing` tiers are not storeys, and the value model reads them as if they were. (CLI)

`baseValue = footprint area × massing tiers` and `unitQuality = 1/√tiers`. But
`massing` is a shape-segment array — `["base", "top"]` — with two to four
entries, not a storey count.

At real proportions `√100 = 10` against `√4 = 2`: the per-unit dilution and the
total-worth inversion both change by five times. **The scale fix and the value
model are one fix, not two.**

Add a real storey count as a generated catalogue field. Point `baseValue` and
`unitQuality` at it. Same idempotent migration script — a re-run, never a
50-entry hand edit.

### 3.3 The board camera's scene pass is a regression. (BLD)

`25-board-scene-pass.png`, judged by Mark: hazier and more of a dust bowl than
`14-board.png`, which it was meant to improve. The fog wash removed the ground
texture, the horizon and the contrast the buildings need.

**Revert to `14`'s settings and retune from there.** The problem it was solving —
a ground that ends at a visible edge — is real; the cure was worse.

### 3.4 The readout has no evidence. (BLD)

`26-readout-real-numbers.png` shows no number, only a cursor marker. If the
readout is an HTML overlay then `toDataURL()` captured the canvas and not the
text. RC5's gate is *"the number changes as the cursor moves"* and this shot
cannot demonstrate it either way.

Same shape as the blank-canvas-reporting-`draw calls: 1` defect this lane caught
itself. Settle it and produce evidence that shows the number.

### 3.5 Two thirds of the mutation manifest is about deleted code. (CLI)

Roughly 140 of 185 entries in `test/mutations.json` target
`city-plan.js`, `layout.js`, `board-generator.js`, `board-render.js` and their
siblings — quarantined, then deleted. They can only ever report INCONCLUSIVE.

**Purge them first.** `deadExports.allowlist.json`'s ~162-entry drift is the same
residue from the same quarantine. Expect the sweep to clear several of the seven
failures on its own, because `mutationEvidence.test.ts` is red *because* the
manifest is stale — a gate currently holding itself shut.

### 3.6 Two mutation tools, one of which records nothing. (CLI)

`mutate.mjs` runs a full-suite baseline per mutation and is the only thing that
writes `.mutate-results.json`. `_mutcheck.mjs` is scoped and fast and has
verified every mutation this month — and its results are discarded.

**Mark's ruling: both work properly, or don't keep both.**

**One recorder, two runners.** Extract the results writer into a shared module
both call, with a field recording the baseline scope each result was obtained
under. Format cannot drift because one thing writes it; a scoped CAUGHT and a
full-baseline CAUGHT are both real and distinguishable. Same move the process
server made when it shared `plan.ts`'s append-only writer rather than adding a
second one.

---

## 4. TERRAIN — CLI, BUILT FULL

Not a placeholder. `land-lane` is a dormant pre-rebuild worktree with no copy of
any current plan; **nobody else is building this.**

The research is done and answers the hard questions — §T1–T9 and §L1–L7. What
remains is implementation against answers already in hand.

1. **Coastline first.** §T2: elevation-first is a named failure.
2. **The drowned river valley method** — §T1. Generate one landmass, then flood
   it. This is the answer to scattered blobs.
3. **Hydraulic erosion** — §T3, and what it actually fixes.
4. **Heights, water and slope as real fields** on the board, replacing the zeroed
   `elevation`/`cornerOffset`/`surfaceType` the board already carries.
5. **`terrainContribution()` stops being a stub** — scoring's terrain term reads
   real values.

The coarse terrain mesh is **decoupled from the gameplay grid** — §T1's own
wording, and the seam where BLD takes over.

---

## 5. THE CATALOGUE — 50 ENTRIES, REAL RANGE, REAL VARIETY

### 5.1 Bind the remaining 38 (BLD)

**kenney.nl is an authorised standing CC0 source**, on the existing discipline:
every import records URL, licence and SHA-256 in `public/vendor/kits/LICENCES.md`;
anything not CC0 stops and asks.

Four verified shapes — `road-crossroad`, `road-intersection`, `road-end`,
`road-end-round` — cover the lane/street/avenue/highway tiers through existing
scaling and unblock 26 of the 38 in one pass.

**Correct `street-cross` while you are there.** It currently binds
`road-crossing.glb`, which is a straight road with a crosswalk painted on it.
The real four-way is `road-crossroad.glb`. Verified by rendering three candidates
top-down, not by trusting filenames.

### 5.2 Variety is a requirement, not a nicety (BLD)

Mark, 2026-09-15: *a city builder is about diversity in design, shape, size and
height — within the plot limits — as in real buildings in a real city.*

Two towers of the same footprint should not be the same tower. §R2's variation
numbers are far lower than instinct suggests — read them before deciding how
many variants — and §C1.5 gives the real starting counts.

### 5.3 The contact sheet is how this is judged (BLD)

Every bound piece, same ground, same camera, labelled, **on a grid** — the
current sheet is a diagonal strip in a field of black, which makes judging harder
than it needs to be. It already earned its keep: it is what made the scale
problem visible.

Say which pieces look wrong beside the others. A wall of thumbnails presented as
a pass is the failure this exists to prevent.

---

## 6. SIDE B — THE CODING LANE. Rewritten 2026-09-15.

**Side B is the reason this is CALIPER and not a city builder, and it is the
artifact this whole project exists to produce.** Mark is applying for AI roles.
A game is a nice portfolio piece; a game whose core mechanic is a working,
self-checking agent loop is a demonstration of the work itself.

### 6.1 Two ways in, and the second is the control

**The guided form.** Pick a slot; it tells you what fits there — footprint,
category, what the rules allow. You fill in what it cannot infer. It produces a
valid catalogue entry. No agent, no spend, always available.

**The loop.** You describe what you want. It grounds itself in the rules, plans,
asks the questions it genuinely needs answered, builds, checks its own work, and
reports what it could not verify. The same shape as a lane run.

Both ship. The form serves players who want a building; the loop serves players
who want to see it think. **And the form is the control**: if form-authored and
loop-authored pieces come out comparable, the loop is doing real work. If they do
not, that is a finding worth having.

### 6.2 It is public, and the caps make that safe

**Not gated, not a recording.** Mark's ruling, and it is correct: a recorded
session proves only that a session can be recorded. The claim being made is about
what the system does with input nobody anticipated, and gating that removes the
only interesting part.

- **Hard spend cap per account.** Exceeding it is a good problem, not a failure.
- **Graceful degradation is a requirement, not a nicety.** When the budget is
  gone, the visitor gets the guided form and an honest message. A broken page in
  front of someone evaluating you is worse than a capped one.
- **Rate limits per session and per IP.** A spend cap protects the bill; it does
  not stop one script burning the budget before anyone real arrives. Different
  guard, different purpose, both needed.

### 6.3 The process is visible; the method is not

A reviewer behind a Worker boundary sees a game. **What makes them see an
engineer is watching the loop work**: the plan on screen, the questions as they
are asked, the verification step and its result, and an honest report when
something could not be done.

They do not see the rule text, the prompts, or the tool calls.

**This is a UI requirement and it is the highest-value item in Side B for the
purpose this project serves.**

### 6.4 Architecture

Browser → Cloudflare Worker → agent (Claude API) → the game's own tools.

The Worker is the boundary that keeps the method private and the place caps and
rate limits live. Authored pieces persist in **D1** — Mark's ruling: surviving a
full redeploy, not just an isolate. Anything less is a cache. An authored entry
is a record with validated, queried fields, so D1 over KV.

**No model is trained or built.** Calling one well is the skill being
demonstrated; training a worse one badly is not. Orchestration — the loop, the
gates, the blind review, the honest reporting — is the portfolio.

### 6.5 What already exists

`public/catalogue-registry.js` validates an authored piece and proves the board
cannot tell it from a shipped one — demonstrated by test, not asserted. That is
the data floor and it is real.

**Two known defects, both CLI's:**

1. **It cannot load in a browser.** `catalogue-registry.js` transitively imports
   `scripts/migrate-catalogue-s2-fields.mjs`, a Node script that reads the
   filesystem. The three formulas — `storeysFor`, `baseValueFor`,
   `unitQualityFor` — must move to a plain module both the build script and the
   browser import. One source of truth is the right design; the coupling to a
   filesystem-reading file is the defect.
2. **Persistence is an in-memory `Map`.** See 6.2's D1 ruling.

### 6.6 One field to add now

Record the **class** of what each authoring run produced — prop, house, condo.
No mechanic attached. Cheap now, expensive to backfill, and it makes the deferred
reward table a lookup rather than a retrofit against entries that never recorded
what they were.

---

## 6B. THE RULE-CONSULTATION AUDIT — one mechanism, two homes

**The claim this project makes about itself is that it checks its own work. That
check has a hole in it, and closing it is worth more than any feature.**

Nothing currently verifies that a lane **consulted the rules**. There is a blind
audit, mutation testing, and a gate ledger — all of which check the *output*.
None of them can tell you whether the process was followed.

We found this the hard way: the lanes had the process server connected for days
and were not calling it, and the only reason anyone knew was that Mark asked and
the source was read by hand. **An audit that cannot tell whether the rules were
followed is a check that cannot fail** — the defect named more often than any
other in this repository.

### 6B.1 In the process server

Record rule consultation the same way gates are recorded: which moment, which
rules were returned, when. `process_at` and `process_get_rule` already have every
piece of that information and currently discard it.

Then an audit can report, for a run: **these moments were consulted, these were
not, and this item was ticked without its rules ever being read.** Cross-checked
against the plan — ticked, gate-recorded, rules-consulted — so a tick with two of
three is visible rather than silent.

This composes what exists: `process_at`, `process_record_gate`,
`process_reconcile_plan`, `docs/EVENT-LOG.jsonl`. It is not a new system.

### 6B.2 In the game

Side B's loop grounds itself in the game's rules before planning — the same
discipline, pointed at a player instead of a lane. **That grounding is recorded
and shown**, which is 6.3's visible-process requirement and this audit being the
same thing seen from two ends.

### 6B.3 Why it matters more than it sounds

It turns the project's central claim from an assertion into evidence. Right now
"the lanes follow the process" is something we believe. Afterwards it is
something the audit reports, per run, with the gaps named.

That is the difference the rest of this build already insists on everywhere else.

---

## 6C. SIDE B — PERSISTENCE (CLI)

The registry is real and proven. The overlay is an in-memory `Map`, and on a
Cloudflare Worker isolates are per-request — **an authored piece does not survive
the request that created it.** §B2 calls persistence the day-one requirement.

**Mark's ruling: D1, and it must survive a full redeploy, not just an isolate.**
Anything less is a cache, not persistence. An authored entry is a record with
fields that get validated and queried, not a blob — D1 over KV.

The registry's public shape — `get` / `all` / `addAuthoredEntry` — does not
change. Only its internals.

**One field to add now, cheap now and expensive later:** record the *class* of
what each authoring run produced (prop, house, condo). No mechanic attached. It
makes V2's reward table a lookup instead of a retrofit against entries that never
recorded what they were.

---

## 7. ASSEMBLE, PROVE, SHIP

1. **One page, both sides.** Overview → area → place → author → reload.
2. **The full suite green**, with its own summary line as the evidence.
3. **The mutation manifest complete** over the real entries.
4. **Published claims regenerated and true** — `gen:claims` runs, the test count
   on the page is the test count.
5. **A deploy manifest** — version, commit, build time, on the page, with a test
   asserting the page's declared commit matches what built it. A manifest nothing
   checks is decoration.
6. **Deploy.**

---

## 8. THE TUNING SITTING

Three questions are parked deliberately, all of them curve shapes in one value
model, none answerable from a formula on paper:

- **The falloff anchor** — as built, the nearest possible neighbour contributes
  ~46% of its face value, because the curve is anchored at distance 0, which no
  piece can occupy.
- **`unitQuality`'s curve** — `1/√tiers`, chosen because `1/tiers` cancels the
  tiers term inside `baseValue` exactly.
- **`medianWealth`'s unit** — per occupied cell today, so a wide low building
  out-votes a narrow tall one. Bounded while footprints top out at 8×8; grows if
  they widen.

**All three want the same moment: the readout on screen, a real board, real
numbers.** One sitting, not three. Each is a one-line change behind a generated
field or a single function — `rule://published-claims` applies, and every one is
disclosed rather than silently chosen.

---

## 8B. THE FULL ARC — EVERY PHASE TO THE END

**This section exists for two reasons and both matter.**

**Depth**, because `rule://queue-exhaustion` makes it a precondition: *"a lane
cannot be told 'continue within the plan' if the plan runs out two items past the
brief. Check before launching."* A lane that reaches the end of its list at 3am
descends to the next written phase. If there is no next written phase, it stops
and reports — and a night is lost.

**Coherence**, because a decision made tonight can foreclose a phase in November.
So each phase below states **what it constrains about now**. That line is the
load-bearing part of this section; the rest is context for it.

Phases after v1 are **not** built until v1 ships. They are written so that what
is built tonight fits them.

---

### PHASE 2 — THE ECONOMY

Placement costs money. Authoring earns it, graded by what was produced — a prop,
a house, a condo — with complexity read from how much the player had to specify
versus how much the lane inferred. Rule compliance is a **gate, not a grade**: a
piece that breaks the rules does not earn less, it does not get placed.

**What it constrains about now:**

- **A balance is a number on a save, so the save format must tolerate new
  top-level fields.** It already does — schema-versioned since V3.
- **`SDB-2`'s authored-class field is the hook.** Recording prop/house/condo at
  authoring time, with no mechanic attached, is what makes the reward table a
  lookup rather than a retrofit against entries that never recorded what they
  were. **Do not remove it because nothing reads it yet.**
- **Banked value, if it is ever spendable on a cell, is spent by PLACING
  something.** Anything else makes a cell's worth depend on allocation history,
  and `value(cell)` is path-independent by construction. §V3's *"value is
  DEVELOPED"* already describes the compliant mechanic.

---

### PHASE 3 — TAXES, SERVICES, AND THE CITY SCORE'S REAL TERMS

Set a rate, fund services, watch the city respond. The city score's deferred
terms — jobs, healthcare, education, social services, parks, entertainment — are
what that money buys, so the economy and those terms are **one body of work, not
two.**

**What it constrains about now, and this is the sharpest constraint in the
document:**

- **This phase needs a clock. §S1 forbids one.** *"If it needs a clock, it is out
  of scope."* So the economy **layers on top of a board that stays stateless** —
  it ticks over a board it only reads. `value(cell)` never learns about time.
  §S5's *"developed value sits on top, unchanged in mechanism"* is the precedent
  and the shape.
- **`C1`'s city score must stay a REGISTRY of terms, never a formula.** Adding
  the amenity terms later must touch nothing but the new term. That is why its
  gate is "add a throwaway second term and prove the registry did not change."
- **The catalogue taxonomy is the real prerequisite.** Six categories cannot tell
  a hospital from a substation, so an amenity term today would score against a
  taxonomy that cannot see what it is measuring. **Any catalogue work done now
  should keep `typeId`-level distinctions available**, as `A1` already did for
  the amenity-civic split.

---

### PHASE 4 — PROGRESSION: TASKS, GOALS, NPCs

Reasons to build a particular thing in a particular place. Step 11 of the
original build order.

**What it constrains about now:**

- **A task is "make this true of the board."** So anything that reads board state
  must be queryable, not just renderable. `valueAt`, `occupiedRect`, the city
  score's terms — all already pure functions over board state, which is what
  makes this cheap later.
- **NPCs are the first thing that might want a clock.** Same answer as Phase 3:
  they observe a stateless board; the board does not observe them.

---

### PHASE 5 — THE GENERATOR, LAST

A world that generates itself: districts, street networks, a plausible starting
city. §L1–L7 and §T4's six measured gates are the sourced material.

**Deliberately last, and the reason is the whole project's history.** The
previous world was generated first and rejected on sight. §A1: *sandbox first,
simulation second.*

**What it constrains about now:**

- **The generator emits through the SAME `place()` the player calls.** Not a
  parallel path, not a bulk loader. If generated pieces could enter the board by
  a route a player cannot use, the two would drift and the generator would
  produce boards the game cannot make. **Every placement API decision must keep
  one entry point.**
- **Terrain generation (TER-1..5) is the generator's foundation**, which is why
  it sits in v1 while the generator does not.

---

### PHASE 6 — THE WORLD AT SCALE

The board is the **whole world**, generated and ready, with the initial build one
area of it. Big, partly filled; unbuilt land is the growth space. A 1024² board
at the 4 m module is 4.1 km across and about 2.1 MB.

**What it constrains about now:**

- **Nothing may assume a per-frame full-board sweep.** `S3`'s dirty-set recompute
  is the pattern and it is already correct. Any new board-wide operation must be
  dirty-set-scoped or explicitly one-off.
- **Impostors and the massing bake already exist** (`I1`, `I2`) and are wired
  (`RC3`). They are the distance strategy; do not build a second one.
- **Area addressing is already `{areaId, x, y}` with no global grid**, which makes
  cross-area collision structurally impossible rather than merely checked. Keep
  it that way.

---

### PHASE 7 — SIDE B MATURITY

The reward table, complexity grading, and whatever Side B becomes once people
have used it.

**What it constrains about now:**

- **An authored piece is a catalogue entry. Full stop.** §B1. The board cannot
  tell the difference — already proven by test, and that proof is the thing
  every later Side B feature stands on.
- **D1 persistence must survive a redeploy**, not just an isolate. A cache here
  would quietly lose player work and the loss would look like a bug in something
  else.
- **The formulas live in ONE browser-safe module** (`SDB-3`). Every future
  authoring path — form, loop, or anything after — computes the same numbers the
  same way or the indistinguishability claim fails.

---

### THE INVARIANTS — TRUE AT EVERY PHASE

Break one of these and something above breaks with it.

1. **`value(cell)` is stateless and path-independent.** The same arrangement
   scores identically however it was reached. Every later system layers on top.
2. **One entry point for placement.** Player, generator, Side B — all through
   `place()`.
3. **An authored piece is indistinguishable from a shipped one.**
4. **One draw call.** The array-texture material is what makes the world free;
   every asset decision answers to it.
5. **The save is an append-only log** — seed, placements, tombstones — versioned,
   timestamped, and never read by `value()`.
6. **`storeys` is real.** What is rendered and what is scored read the same
   number. No compression, no separate display height.
7. **Nothing is deleted.** Quarantine, ledger, and only then a purge Mark named.

---

## 9. DEFERRED, WITH REASONS

### 9.1 The economy

Placement costs money; authoring earns it, graded by what was created — a prop,
a house, a condo — since complexity is already visible in how much the player had
to specify versus how much the lane inferred.

Rule compliance is a **gate, not a grade**: a piece that breaks the game's rules
does not earn less, it does not get placed. Making it a score would let a player
buy past the rules.

If banked value is later spendable on raising a cell, it must be spent by
**placing something** — otherwise value depends on allocation history and §S1's
path-independence gate breaks. §V3's *"value is DEVELOPED"* already describes
that mechanic.

### 9.2 Taxes, services, and the city score's amenity terms

One body of work, not two. A tax loop spends into exactly the services the city
score's deferred terms measure. It needs a clock, which v1 does not have — and it
layers cleanly on top later, the board staying stateless while an economy ticks
over it. §S5's *"developed value sits on top, unchanged in mechanism"* is the
precedent.

---

## 10. HOW WORK IS DONE

`rule://build-loop`, every step. `rule://reviewer-independence` — a blind review
before implementation, in every mode. `rule://standard-of-proof` — state what red
looks like, not only green. `rule://decision-queue` — never block; queue with a
recommendation and take the least irreversible path.

**Decisions are surfaced to Mark one at a time**, with the decision, the
reasoning, and a recommendation with its why. An unsurfaced decision is a
backlogged one.

**Long commands are auto-promoted to background tasks regardless of the
parameter.** The evidence a run completed is the runner's own summary line —
absent it, the run did not complete, whatever the exit code says.
`rule://background-promotion-evidence`.
