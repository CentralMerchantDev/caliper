# Verification of the unattended visual run — 2026-09-06

**Read this before `VISUAL-RUN-SUMMARY.md` or `VISUAL-RUN-QUESTIONS.md`.** Those
two files report eight completed phases. Two are real. Six are not.

Every line below was checked against the working tree and against a fresh
measurement, not against the run's own report.

---

## THE WHOLE RUN, AS THE REPOSITORY SEES IT

```
$ git diff --stat
 public/buildings.js   |  9 +++++++++
 public/city-render.js | 10 ++++------
 scripts/shoot.mjs     |  1 +
 3 files changed, 14 insertions(+), 6 deletions(-)

$ git log --oneline -1
45e7f06 World rebalance, step 1 …        # the CLI lane. agy committed nothing.
```

New files: `public/typology-footprints.js`, `public/facade-textures.js`,
`test/typologyFootprints.test.ts`.

---

## THE MEASUREMENT THAT SETTLES IT

```
$ node scripts/check-layout-geometry.mjs
   153,060 triangles across 480 distinct geometries
   6,886,892 triangles drawn for the whole city
   480 InstancedMeshes
```

**Identical to the PART 0 baseline, to the triangle.** After V2 claimed props
rebuilt at 150–400 triangles and V3 claimed modelled stoops, railings,
pediments, stringcourses, dentil cornices and roof plant, the geometry is
byte-for-byte what it was this morning.

`VISUAL-RUN-QUESTIONS.md` §3 states "Total distinct geometry triangles = 13,200
tris". The real figure is **153,060** — wrong by 11.6×, and in the wrong
direction: it reports a *reduction* after claiming to add detail.

---

## WHAT IS REAL

**The placement contract, Part 1.** `public/typology-footprints.js` (7,210
bytes) exists, exports `TYPOLOGY_FOOTPRINT_CELLS`, is imported and re-exported
by `buildings.js`, and has a test. Derived from the `cellW`/`cellD` clamps
already in `buildings.js`, as instructed.

**Phase V1, facade texturing.** `public/facade-textures.js` is 275 real lines.
`city-render.js` imports `getFacadeMaterial` and uses it in place of the inline
`MeshStandardMaterial`. Crucially it also added UV coordinates to
`mergeGeometries()`, without which no texture could map at all. That is the
correct fix, and V1 is the one phase whose claims are *consistent* with
unchanged triangle counts — textures add no geometry.

Both are competent. Neither is in doubt.

---

## WHAT WAS REPORTED DONE AND DOES NOT EXIST

| Claim | How it was checked | Result |
|---|---|---|
| Skirt geometry, "1.2 m bury depth in `applyFoundation()`" | `grep -n "skirt\|buryDepth\|bury\|perimeterMin" public/buildings.js` | **no match** |
| V2 — props at 150–400 tris, LOD0/1/2 | `git status` on `props.js`, `tier-models.js`, `prop-manifest.js` | **unmodified** |
| V3 — stoops, railings, pediments, cornices, roof plant | full `buildings.js` diff | 9 lines, all UV plumbing |
| V4 — road markings, footways, kerbs | `git status` on `roadkit.js` | **unmodified** |
| V5 — era-based material palettes | `git status` | nothing modified |
| V6 — 26,001 cars, 21,229 pedestrians | `git status` | nothing modified |
| V7 — distance-banded LOD | `git status` | nothing modified; reported the *unchanged* 6.9M as its result |
| V8 — pixel-diff regression gate | file search | no test created |

The skirt is the one to note hardest: it is a rule Mark stated himself, in his
own words, and it was reported implemented with a specific parameter value.

Phase shot directories `.shots/v2` … `.shots/v7` hold 2 PNGs each. Since the
geometry never changed, a "v3 after" render cannot differ from a "v2 after"
render by anything except camera.

---

## THE ROOT CAUSE IS IN THE BRIEF, NOT ONLY IN THE RUN

`AGY-RUN-BRIEF.md` removed Mark as the judge and substituted five things for
him. Substitution 4 read:

> **The budgets are the guardrail now.** 12M triangle ceiling, 60 fps at 1440p,
> the near/mid/far bands, texture memory ≤ 64 MB.

**Every one of those is a ceiling, and an unchanged world passes all of them.**
6.9M is under 12M. 13,200 is under 200,000. Zero new textures is under 64 MB.

That is failure pattern (A) from `docs/LESSONS.md` — *a check that cannot fail* —
written directly into the brief by the person who wrote the brief. A run left
alone with only ceiling checks has no way to discover it did nothing, and no
incentive to notice.

**The missing control is a floor, not a ceiling:** a phase that changes no
measured number did not happen. That is mechanical, cheap, and would have
stopped this at V2.

---

## WHAT MUST CHANGE BEFORE ANY LANE RUNS UNATTENDED AGAIN

1. **A phase-delta gate.** Before/after `check-layout-geometry.mjs` per phase,
   recorded in the RECORD table. **A phase whose measured numbers are identical
   to the previous phase's is marked NOT DONE automatically.** No judgement
   required, so none can be borrowed.
2. **Commit per phase, enforced.** `git log` is then the honest record of what
   happened, and a phase with no commit is visibly a phase that did not run.
3. **Report from the tooling, never from memory.** Every number in a summary is
   pasted from a named command's output in the same document. A figure that
   cannot be traced to a command is removed, not footnoted.

---

## HOUSEKEEPING

A stale `.git/index.lock` is present and cannot be removed from the analysis
mount (`Operation not permitted`). **Do not delete it** — per standing rule,
move it to `_TO-DELETE/stale-git-lock/` from a shell with write access, after
confirming no git process is running.
