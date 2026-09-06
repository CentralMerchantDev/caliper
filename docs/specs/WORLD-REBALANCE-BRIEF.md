# BRIEF — rebalance the world

**Read `docs/audits/WORLD-DENSITY-FINDINGS.md` first, in full.** It is a
measured audit written 2026-09-06 and it is the evidence this brief rests on.
Do not re-derive it. Verify it (step 1), then build.

---

## WHY THIS EXISTS

The world is not sparse. It is **inverted**.

- **56%** of every building sits on a sandbar — the "Ocean Barrier Island".
- The **downtown island is 48% townhouses** and holds 80 of the world's 81
  tower plots.
- Only **4.19%** of plots are large enough to *be* a tower, so a settlement
  declared `cls:"TOWER"` produces terraces instead. Silently.
- Density where a city is meant to be runs **8 to 74 buildings per km²**. That
  is farmland.
- The 1,402 roads have **no junctions and no adjacency** — connectivity is not
  represented anywhere, so a road that reaches nothing is indistinguishable
  from one that does.

Mark reported every one of these by looking at the screen, before any of it was
measured. No rendering, texture, material or LOD work touches any of it.

**A previous claim of mine — that the layout data was sound and the defect was
in the renderer — was wrong.** It rested on proving the placements are not
*stale*, which is true, and is not the same as the rules being *right*. That
error is recorded so nobody repeats it: "it regenerates from rules" only tells
you the output is fresh.

---

## WHAT IS SOUND — DO NOT REBUILD IT

The engine is not the problem and rebuilding it would cost weeks for nothing.

- **`grid.js`** — an 8 m cell grid with exact binary subdivision down to 0.5 m.
  This is already the squares-and-cubes addressing the game needs.
- **`terrain.js`, `footprint.js`** — the ground and its verdicts.
- **`layout.js`** — the layout engine. Its anti-clone decisions demonstrably
  work: 0 of 1,379 blocks internally mixed, all four characters spread 24–26%,
  row positions read from real rows. **It is being fed a broken plan.**
- **The renderer** — PBR, shadows, bloom, tone mapping, colour management, LOD
  and instancing are all present and working.

What is wrong is the **world definition**: the `SETTLEMENTS` table, the
subdivision parameters, and the barrier island's share. Data and parameters, not
architecture.

---

## THE SEED PINS WILL GO RED. THAT IS CORRECT.

`test/worldSeed.test.ts` and `test/planSeed.test.ts` pin the default world by
hash. **This work deliberately changes the world, so they will fire.**

- Do **not** delete them.
- Do **not** weaken them.
- Re-pin them **once, at the end**, with the new hash and a comment naming the
  commit that changed the world and why.

A pin test deleted the first time it fires was never a control. It exists
precisely to make a change like this one impossible to make by accident.

---

## THE WORK, IN ORDER

Do not skip ahead to step 3. Steps 1 and 2 are what make step 3 verifiable.

### 1. Make the numbers re-takeable

Commit **`scripts/measure-density.mjs`** printing:

- plots by landmass
- plots per settlement, with area and per-km² density
- plot `className` mix
- typology mix
- count of plots meeting each `PLOT_CLASSES` minimum **in both directions**

Its output on today's world must reproduce sections 1–4 of the findings doc.

> **If any number disagrees, STOP and report.** The audit would then be wrong
> and that has to be known before anything is built on it.

The figures in the audit were taken with throwaway scripts. Until this script
exists, every number in this brief is a claim rather than a measurement.

### 2. Bind declared class to carved geometry — the root cause

`PLOT_CLASSES.TOWER` requires 45–90 m in **both** directions. The subdivision
uses avenue and street spacing of 185–210 m by 146–165 m and carves narrow
frontages, so almost nothing ever qualifies.

The result is **failure pattern (B)** from `docs/LESSONS.md`: two sources of
truth — the settlement's declared intent, and the geometry the subdivision
actually produces — with nothing binding them. Intent loses every time, and the
only visible symptom is that the skyline never arrives.

**Fix:** a settlement's declared class must produce plots that can hold it. A
TOWER district merges to 45–90 m parcels rather than carving narrow lots.

**Then add the control that stops it failing silently again:** a test asserting
each settlement's realised `className` mix is dominated by its declared class.

> **Watch that test go red on today's world before fixing anything.** A control
> that has never been seen red is not known to be a control.

### 3. Rebalance — Mark's brief

Keep the 26 km extent. Keep all eleven landmasses. **Nothing is deleted.**

| Where | What it becomes |
|---|---|
| **Downtown island** | A real core. Towers in the middle, mid-rise shoulders, housing at the edge. Height and density fall off with distance from the centre. This is the skyline — it has to read from the air. |
| **The islands** | Genuine settlements with their own small centres. Not uniform villa fields. |
| **The mainland** | Suburbs at suburban density near the bridges and roads, thinning outward. |
| **The barrier island** | Stops being the city. It is a **beach** — shore housing, resorts, low and sparse. Its 56% share should end in single digits. |
| **The land between** | Undeveloped **on purpose**, and it must READ that way: farmland, forest, countryside with roads running through it. |

That last row is the one that is easy to get wrong. Empty ground is fine as
countryside and is not fine as a city that failed to generate. The difference is
entirely in whether it looks deliberate.

> **If you cannot make the empty land read as deliberate, say so rather than
> shipping it.** That is a real answer and it is more useful than a render Mark
> has to reject.

### 4. Roads — represent connectivity, measure it, report

All 1,402 roads are axis-aligned spans:

```json
{"id":"little-x-1349","axis":"ns","class":"LANE","at":-1348.8,
 "from":859.9,"to":1079.9,"settlement":"downtown"}
```

`roadkit.js` can draw `junction()` and `intersection4Way()`, but nothing in the
plan ever states that two roads meet.

Build the junction set and adjacency from the spans, run a connected-components
pass, and **report**: how many components, how large, what is stranded.

**Do not start re-planning the network in this pass.** Fixing follows from
measuring. Report the numbers.

### 5. Expansion — a constraint, not a feature

Mark's requirement: *26 km is the world now, not forever.* Land must open later
so new cities, levels and adventures can be added.

Everything follows from one rule: **the origin must never move**, because a
saved build is a coordinate. If opening new land ever shifts the origin, every
world anyone has built is silently wrong.

`grid.js` already assumes this and argues it well — locked ground has
coordinates, terrain and an address, and refuses placement with a reason. What is
missing is that `WORLD.SIZE` is a constant read by the terrain apron, the sea and
abyss planes, the scatter regions and the sky dome.

**Write ONE test now, before the rebalance lands:** generate the world, record a
known plot's coordinates, change `WORLD.SIZE`, regenerate, assert that plot is at
the identical coordinate.

> **If it is already red, that is a finding — report it, do not fix it in this
> pass.** §8 of the findings doc has the full reasoning and the other two
> properties (locked-is-not-absent, determinism-survives-growth) for later.

### 6. Show it

Six renders via `scripts/shoot-app.mjs`:

1. Downtown from the air
2. Downtown at street level
3. One island
4. The mainland suburbs
5. The barrier island
6. The countryside between two settlements

Put **before and after side by side**.

Write **`docs/audits/WORLD-REBALANCE.md`**: every number before and after, the
command beside each, and every judgement you made that Mark should overrule.

---

## WHERE TO ASK RATHER THAN GUESS

**Mark is the visual judge.** Density targets, how tall downtown goes, how much
countryside is right — those are his calls.

Come back with a render and a question rather than picking a number and
defending it afterwards. He reads these faster than anyone reads a test report,
and he has been right about the world every time so far.

---

## SCOPE FENCE

**Do not touch** — agy is working the visual layer in parallel and edits here
will collide:

- `public/buildings.js`
- `public/tier-models.js`
- `public/props.js`
- anything in the render or material path

**This pass is** `city-plan.js`, `layout.js`, `land-use.js` and their tests.

---

## STANDING RULES

- The nine regression checks pass **unedited**.
- Do not touch `tick`, `chooseAction`, `applyAction`.
- **Nothing deleted** — quarantine to `_TO-DELETE/<reason>/`.
- Zero API spend.
- Every test **watched red before green**.
- Commit with `git commit -F`.
- **Do not deploy.**
- One branch. Mark merges.
