# LANE BRIEF — BLD, OVERNIGHT, 2026-09-14

**Terminal:** BLD · **Repository:** `C:\Code\sandbox-spike-codex` · **Branch:** `codex-lane`
**Mode:** overnight. Mark is asleep. Nothing waits; decisions queue.

Linked worktree — `.git` is a FILE. Commit messages to
`$env:TEMP\COMMIT_MSG_BLD.txt`, lane-named because `$env:TEMP` is shared.

Policy is cited, never restated — `rule://lane-brief`.

---

## 0. START

`process_list_moments` once, then `process_at("session-start")`. Call
`process_at` again at every moment transition. Your project id is
**`caliper-bld`**.

Generate this run's brief with the `lane_brief` prompt and commit it, per
`rule://lane-brief`. `process_open_audit` and `process_cross_vendor_review` spawn
`codex` — confirm it is on PATH before you need it.

## 1. THE LOOK PROOF IS DONE. THIS IS THE THREAD IT PULLED.

Your own run finished all ten items today: `99e0a8c` through `a06edae`, seven
shots in `docs/look-proof-shots/`, verdict in
`docs/audits/BLD-2026-09-14-LOOK-PROOF-VERDICT.md`. **Do not redo any of it.**

The verdict's caveat is the reason this brief exists: *the sourced CC0 meshes did
more of that work than the lighting mechanisms, and the join did more visible
work than all five mechanisms combined.* So the lever is **assets**, not shading,
and tonight pulls that lever.

**Nothing in items L11, L12, I1 or I2 touches `data/catalogue.json`.** That file
belongs to CLI tonight; see §5.

## 2. CHECKLIST

`docs/specs/REBUILD-CHECKLIST.md`, via `process_next_item` for `caliper-bld`,
skipping every `R*`, `S*`, `A*` and `T*` id — those are CLI's.

**L11, L12, I1, I2**, then **BO7A only if §5's gate has opened.**

Longer than the night on purpose. Running out of time is expected; running out of
work is not.

### L11 — cast shadows

Not a miss by the look-proof run: R1 names four mechanisms and cast shadows is
not among them. But across all seven shots **nothing throws a shadow** onto the
ground or onto anything else, and that is the remaining tell that reads as
"objects arranged on a plane" rather than "a place". Contact darkening grounds a
piece where it meets the floor; it does not put the tower's shadow across the
street.

Same fixed camera, before and after, committed as a pair — the evidence is the
images. Measure the shadow-map cost and say whether it survives L12's piece
counts.

### L12 — the proof scene at a real piece count

Five pieces proved the pipeline. C1.5 gives the real starting counts and **R2's
numbers are far lower than instinct** — read R2 before deciding how many, and say
what number you chose and why.

Source and normalise through `scripts/normalise-kit-textures.mjs`, prove them in
the existing look-proof scene.

**Gate: still ONE draw call at the higher count, textures intact, measured. RED
is the draw count rising with the piece count.** That is the property the whole
array-texture approach exists for, and it has only ever been proven at four
pieces.

### I1, I2 — impostors and the overview bake

Investigate under the real name, **octahedral impostors**, against primary
sources rather than a summary. Report texture-memory cost **measured**.

## 3. THE GATES

`rule://standard-of-proof`. Your gates are images and a draw count.

A render is a long command and will likely be auto-promoted to background — that
is fine, it captures output and returns an exit code. **But exit 0 is not
evidence a shot exists. Open the file and look at it.** This project's own first
look-proof render was a blank white canvas with zero console errors and
`draw calls: 1` — green on every measure available without a GPU, drawing
nothing. You caught that one. The same trap is still there.

Do not let a memory reading stop a render. On 2026-09-11 the full multi-camera
regression render completed with system free memory at **0.02 GB**, its own peak
footprint 418.7 MB. The 4 GB floor was tested and found to have no source.

## 4. FILES

`public/look-proof-scene.html`, `public/look-proof-material.js`,
`scripts/normalise-kit-textures.mjs`, `scripts/shoot-look-proof.mjs`, the asset
directories, `docs/look-proof-shots/`, and the impostor work's own new files.

**Not `data/catalogue.json`.** Not until §5.

## 5. THE GATE ON BO7A — CHECK IT, DO NOT WAIT ON IT

CLI is rewriting the catalogue's category table tonight (item `A1`) under a
scoring model Mark settled a few hours ago: amenities gain real positive
adjacency, housing becomes dilutive on housing, `baseValue` leaves the cell
readout. Until that lands, the catalogue's category table is in flux and any
entry you wrote against the old one would be written wrong.

So `BO7A` — catalogue entries for L12's new meshes — is **blocked until CLI's A1
commit exists on origin.**

**Check for it; never wait for it.** Fetch, look, and if it is not there yet, go
straight to the next open item and say in the handover that you checked and when.
A lane that sits waiting is stalled. A lane that checks and moves on is working —
`rule://stopping-authority` does not list "waiting for another lane" as a reason
to stop.

Check again at each moment transition. If it appears mid-run, L12's meshes get
their entries; if it never appears, that is a finding about A1, not about you.

Do not open `data/catalogue.json` before that check passes. Cross-lane needs go
in `docs/CROSS-LANE-REQUESTS.md`.

## 6. ATTEMPT BUDGET

2 per item.

## 7. STILL OPEN FROM YOUR OWN HANDOVER

Named so they are not lost, none of them tonight's work unless you run dry:
`docs/specs/LOOK-UPGRADE.md` rejects the CC0 pipeline that `REBUILD-PLAN.md` now
requires, unreconciled; `CLAUDE.md` still points at `docs/WORLD-BUILD-PLAN.md` as
"the current work"; `test/mutationEvidence.test.ts`'s summary is stale at 133
against 149 real entries. All three predate your run.

## 8. THE ONE THING NO RULE COVERS YET

**Do not make a long command a gate.** The harness auto-promotes long-running
commands to background tasks regardless of the parameter — proven 2026-09-14
(`bpoyjxdg3`). **The evidence is the runner's own `ℹ tests` / `ℹ pass` line;
absent it, the run did not complete whatever the exit code says.** Waiting on a
full suite is what left this morning's merge unfinished. CLI has been asked to
draft this as a rule.
