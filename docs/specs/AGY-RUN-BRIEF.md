# agy — the unattended visual run

**Written 2026-09-06. This is your whole brief for this session. Read it to the
end before starting.**

Mark is out for a few hours. He has asked you to build **every remaining visual
phase** without stopping for approval, and to leave the run in a state he can
review in one sitting when he returns.

Read these three, in this order, before your first change:

1. `docs/specs/PLACEMENT-CONTRACT.md` — **new, binding, and it changes how you
   build models.** Start here.
2. `docs/VISUAL-BUILD-PLAN.md` — the RECORD table and the two notes under it
   have changed since you last read them.
3. `docs/visual-reference/README.md` — the nine reference images and what to
   take from each.

---

## PART A — WHY V0 CAME OFF YOUR LANE

Your `docs/audits/V0-BOARD-AUDIT.md` refuted three of Mark's four reports and
recommended proceeding to V1. **Its own settlement table is the evidence against
that verdict.** Every settlement declared a dense core is dominated by terraces:

| Settlement | Declared class | Your own dominant typology |
|---|---|---|
| `fairlight-isle-core` | **TOWER** | `bld-terrace`, 834 of 1,206 |
| `westbay-isle-core` | MIDRISE | `bld-terrace`, 499 of 706 |
| `kingsley-isle-core` | MIDRISE | `bld-terrace`, 321 of 452 |
| `cormorant-isle-core` | MIDRISE | `bld-terrace`, 345 of 481 |
| `downtown` | — | `bld-townhouse` 424, towers 81 |

Claim 4 was refuted on the grounds that all 19,725 buildings strictly obey their
plot classes. **They do. The plot classes are what is wrong** — only 4.19% of
plots are large enough to hold a tower, so a TOWER settlement produces terraces
and no rule is broken while it happens.

The audit also contradicts itself. The summary says *"all 81 towers and 1,344
midrises are intact on the central estuary island"*; 1,344 is the world-wide
MIDRISE plot count, and your own table gives downtown **308**. The summary
overstates downtown roughly fourfold, and that overstatement is what carries the
REFUTED verdict.

Mark has looked at the board and says it is not right. He is correct and the
data agrees with him. Board correctness now belongs to the CLI lane, working to
`docs/specs/WORLD-REBALANCE-BRIEF.md`.

### Two of your findings are real, stand, and are yours to fix

- **V0.3 — the crest.** `roadsWithBatter: 1,172`, cuts to **38.0 m**, fills to
  **44.6 m**, 165 roads over the earthworks budget, the railway cutting 27.2 m.
  A 38-metre cut shelf across a hillside reads exactly as "a road that isn't".
  This is the best explanation anyone has for Mark's report and it was not
  otherwise known. **Good find. Fix it in this run.**
- **V0.5 — LOD switching is not active.** Every building in the world draws at
  LOD0. This had been assumed working. It is V7 and it is yours.

### One change to how you audit, for next time

You were handed Mark's four reports as claims to adjudicate, and you
adjudicated them. That is a different activity from measuring the world and
writing down what is there, and it is why your table and your verdict disagree.
**Measure first, record the numbers, and only then look at what was reported.**
Naming the suspicion is what stops it looking.

---

## PART B — THE PLACEMENT CONTRACT COMES FIRST

Read `docs/specs/PLACEMENT-CONTRACT.md` in full. The short version, because it
changes your first task:

`buildings.js` **already builds in cells** — every typology takes `cellW`/`cellD`
and computes `footW = cellW * 8`. `PLOT_CLASSES` does not: `TERRACE` and
`TOWNHOUSE` declare `module: 8`, while `MIDRISE`, `TOWER` and `CIVIC` declare no
module at all, and `TOWER`'s 45 m minimum is 5.625 cells. A model says "I am six
cells wide", a plot says "I am 47.3 metres wide", and nothing reconciles them.

Mark's principle, and it governs everything you build from here:

> **A model declares what it needs, and the board is carved to fit models.**
> Never the reverse.

A thing that states its own requirements can be swapped for anything that states
the same requirements. That is the difference between a game board and a picture
of one.

### YOUR FIRST TASK, BEFORE ANY VISUAL WORK

Part 1 of the contract. **Derive** the footprint size table from what
`buildings.js` already declares — do not invent numbers — publish it as one
exported constant, and write the test asserting every plot class can hold at
least one typology.

The CLI lane has the same instruction. **Whoever commits it first wins; the
other reads it rather than writing a second one.** Check whether it already
exists before you write it. If you both write one, that is a merge conflict
rather than silent divergence, which is the safe failure, but it wastes an hour.

`TOWER` needs Mark's decision: 45–90 m is 5.625 to 11.25 cells, and the nearest
honest bracket is **6–11 cells (48–88 m)**. Proposed, not decided. Record it as a
question and use the proposal meanwhile.

### The no-floating-edge rule — build the geometry for it

Mark's words:

> if a house or building is placed on a cliff the building will extend a section
> down to just below the points that it touch as in that all sides are
> surrounded by ground

A building on uneven ground extends a skirt down to the lowest ground height
sampled on its footprint perimeter. **No edge of any building anywhere shows
daylight underneath it.** You build that skirt geometry; the CLI lane writes the
world-wide assertion that catches the ones that float.

### Part 3 of the contract is a WARNING, not a task

The roads drawn today are continuous procedural ribbon meshes, not kit pieces,
so there is no unit a player could remove or replace. That is a real problem and
it is **not** in this run. **Do not start it.** Build toward it rather than
further from it, and flag anything you do that would make the change harder
later — every road detail added to a ribbon is detail that does not survive
becoming pieces.

**Neither lane edits the contract alone.** Propose, say why, Mark decides.

---

## PART C — RUN EVERY PHASE, UNATTENDED

Run **V1, V2, V3, V4, V5, V6, V7, V8 in order**. Do not stop between them. Do
not wait for a verdict. Complete the run.

The plan's normal safeguard — *Mark judges every phase* — is unavailable. These
five substitutions replace it, and they are not optional.

**1. Render every phase anyway.** Before-and-after, same camera, saved under
`.shots/<phase>/`. He is reviewing the whole run in one sitting, so the
comparison shots **are** the deliverable. A phase with no render is not done.

**2. Mark the RECORD table "PROVISIONAL".** Leave his verdict column empty. You
are not closing these phases; you are queueing them for his judgement.

**3. Do not stop to ask — write it down instead.** Every point where you would
have asked him goes in `docs/audits/VISUAL-RUN-QUESTIONS.md`: what you were
deciding, what you chose, and what the alternative was. That file is the first
thing he reads. **Judgements made in his absence are borrowed, not granted.**

**4. The budgets are the guardrail now.** 12M triangle ceiling, 60 fps at 1440p,
the near/mid/far bands in PART 1 of the plan, texture memory ≤ 64 MB. With no
visual judge in the room these are the only thing between a rich city and an
unplayable one. Measure with the command, not by feel. Exceeding a band is a
written justification in the phase notes, **never a quiet raise**.

**5. If a phase cannot be done honestly, skip it and say so.** Record why in the
questions file and move on. A skipped phase with a stated reason is worth more
than a weak one nobody was watching you ship.

---

## PART D — SCOPE FENCE

The CLI lane is rebalancing the world **in parallel, right now**, working to
`docs/specs/WORLD-REBALANCE-BRIEF.md`.

| | Yours | Theirs |
|---|---|---|
| Models, props, materials, textures, LOD | ✅ | |
| Road **surface** — sidewalks, kerbs, crossings, markings, junction geometry | ✅ | |
| Foundation and skirt geometry | ✅ | |
| Which settlements exist, their class, how blocks subdivide | | ✅ |
| Which roads exist, where they run, whether they connect | | ✅ |
| `SHORE` / `SPAN` placement rules | | ✅ |
| Files | `buildings.js`, `tier-models.js`, `props.js`, `roadkit.js`, render and material path | `city-plan.js`, `layout.js`, `land-use.js` |

**Road surface is yours. Road network is theirs.** That is the one boundary easy
to cross by accident, and a collision costs both lanes their afternoon.

**Your work survives the rebalance.** Facade textures and prop models are
per-typology, not per-placement, so a townhouse carries the same facade wherever
the rebalance puts it. Nothing in V1–V3 is invalidated. Keep going.

---

## PART E — RULES AND CLOSE-OUT

- **One branch for the whole run.** Commit per phase with `git commit -F` so each
  is reviewable on its own.
- **Do not merge. Do not deploy.**
- **Nothing deleted** — quarantine to `_TO-DELETE/<reason>/`.
- **Zero API spend.**
- The nine regression checks pass **unedited**. Do not touch `tick`,
  `chooseAction` or `applyAction`.
- Every test **watched red before green**.

**When the run ends**, write `docs/audits/VISUAL-RUN-SUMMARY.md`: every phase,
its before and after numbers with the command beside each, where the shots are,
what you skipped and why, and **the three things you most want overruled**.

Assume Mark reads that file and the shots, and nothing else.
