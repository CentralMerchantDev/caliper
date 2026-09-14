# LANE BRIEF — BLD, prove the look on five pieces

**Terminal:** BLD · **Repo:** `C:\Code\sandbox-spike-codex` (linked worktree —
`.git` is a FILE, so write commit messages to `$env:TEMP\COMMIT_MSG.txt`) ·
**Branch:** `codex-lane` · **Mode:** autonomous, long run.

**Read `docs/specs/REBUILD-PLAN.md` before anything else** — it was substantially
rewritten on 2026-09-14 and several sections you may remember are now corrected
in place. Especially R1, R8, R9, C1.6, and the REVISED BUILD ORDER at the end.
This brief cites that document rather than restating it.

---

## 0. SYNC FIRST. The plan you need is on `main`.

`main` now carries the Phase 1 takedown and the 2026-09-14 rewrite. Bring
`codex-lane` up to it before reading anything, or you will work from a stale
spec. Confirm `docs/specs/REBUILD-PLAN.md` contains a section headed
`ADDED 2026-09-14` before you continue. If it does not, stop and say so.

Then commit this brief.

## 1. OBJECTIVE

**Prove that a handful of pieces can be made to stop reading as a blockout,
before a catalogue of two hundred gets built to a look nobody has tested.**

This is step 4 of the revised build order, and it moved earlier on purpose. The
look has been scheduled last twice, and both times the result was rejected on
sight. R2 and C1.5 already say it — *"start with ONE variant and test it in a
real scene before building a second."* A12 says greybox the kit and prove it
before modelling anything. This run is that test.

**You are not building the catalogue.** Five pieces, done properly.

## 2. HOW WORK IS DONE

`rule://build-loop`, every step. `rule://reviewer-independence` — blind review
before each implementation. `rule://quarantine` — nothing deleted.
`rule://queue-exhaustion` — descend to the next written item, never invent.
Merges and deploys: not on your own initiative.

## 3. THE FIVE PIECES

Chosen to exercise the range rather than to look good together:

1. A house — 2×3 modules.
2. A mid-rise — 4×4.
3. A tower base — 6×6.
4. A street tile — 4 modules wide, carriageway plus its own footways in one
   piece, per C1.3.
5. The ground they sit on.

Sourced from the CC0 packs named in C1.6. Correct footprints, correct pivot —
**anchor cell's corner, on the ground plane**, per the corrected G1. If a pack
mesh does not match a catalogue footprint, scale it to fit rather than changing
the footprint.

## 4. CHECKLIST

**4.1 The shared material.** C1.6 as corrected — and note it now says the
opposite of what it used to.

Keep each pack's own albedo texture. Do **not** remap UVs onto a palette atlas;
that instruction was withdrawn because it destroys the road markings, window
panes and signage that carry the information. Instead: load every texture as a
layer of one `DataArrayTexture`, pass the layer index as a per-instance
attribute, and replace only the lighting equation. One material, one draw call,
textures intact.

A build-time script normalises every texture to one resolution and format, since
array textures require it. Offline, run once, committed.

*Gate:* two pieces from different packs render in a single draw call with their
own textures visibly intact. Prove the draw count.

**4.2 The four mechanisms, R1, each its own commit.**

- **Half Lambert.** `(0.5·(N·L) + 0.5)²` — **squared.** R1 omitted the square
  until 2026-09-14; the corrected text carries the paper's own quotation.
- **Warm→cool terminator.** Shadows shift toward cool, never to black.
  Saturation rises at the terminator.
- **Rim separation.** Rim highlights, not dark outlines. A Fresnel-masked lobe,
  modulated by N·up.
- **Contact darkening.** Ambient bounce or baked AO where objects meet ground.
  The paper calls this *"critical to truly grounding"* objects.

Plus the fifth, sourced separately and possibly the highest-value one for a
scene of boxes: **a value split between horizontal and vertical surfaces**, so
walls do not merge into the floor.

*Gate for each:* a shot from a fixed camera, committed beside the previous one.
**The evidence is the pair of images, not a description of them.**

**4.3 One join, done properly.** R8 — *"interesting things happen where
different things meet."* Take the worst join in the scene, which will be
building meeting ground, and implement the cheapest of the three tiers that
actually works: contact darkening baked into the lower mesh, a ground decal
sized to the footprint, or a modelled skirt. One join. Before and after.

**4.4 The verdict, stated plainly.** Does the scene still read as a blockout?

If it does after all five mechanisms and the join, **say so.** That is a more
valuable finding than a partial success, because it means the problem is
geometry and the catalogue budget has to move. Do not oversell a marginal
improvement — this project has been burned by exactly that.

## 5. WHAT DONE LOOKS LIKE

Five pieces, one shared material, five mechanisms each with its own before and
after shot from the same camera, one join treated, and an honest verdict. Plus
the texture-normalisation script, committed and runnable.

## 6. STOPPING POINT

**Stop when 4.4 is committed with its verdict.** Write the handover before the
budget gets close; a run cut off by the limit loses everything except what was
committed.

**Do not start the catalogue, the board, the world layer or placement.** CLI
owns those and is running concurrently. Coordinate through
`docs/CROSS-LANE-REQUESTS.md`.

## 7. IF BLOCKED

1. If a mechanism cannot be implemented in the current material setup, say which
   and why — that is a real constraint Phase 2 needs, not a failure.
2. Impostor baking (build order step 8) is available work if 4.4 lands early:
   pre-render one piece from multiple angles with colour, normal and depth, and
   report what it costs in texture memory. Investigate under its real name —
   octahedral impostors — and verify against primary sources.

## 8. GUARDS

`CALIPER_ALLOW_SPEND` unset, zero API spend. Nothing deleted. `git commit -F`
with explicit paths, never `git add -A`. PowerShell — no heredocs, no `&&`, no
`$( )`. Spell-check every word. **Never kill a process; record PIDs.**

## 9. REPORT

The before and after images by path, per mechanism. Whether the scene still
reads as a blockout, stated plainly. The draw count with two packs in one call.
What you could not implement and why. Anything in `REBUILD-PLAN.md` you believe
is wrong — it was heavily rewritten and has not been reviewed by anyone but its
author.
