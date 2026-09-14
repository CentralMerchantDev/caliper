# BLD lane, OVERNIGHT, 2026-09-15 -- handover

Brief: [docs/briefs/BLD-2026-09-15-overnight.md](../briefs/BLD-2026-09-15-overnight.md).
Item zero found S4 not yet on `origin/main`; worked CP1 (found blocked,
queued), then S4 landed and was confirmed authorised -- merged, then RC5
(the highest-value item), then CP2, then CP3, this run's own declared
end. Pushed to `origin/codex-lane` through `2be5369`.

## §1 -- item zero, checked at start and at every transition, never waited on

At session start: `git fetch`, `node scripts/query-event-log.mjs --item
S4 --event pushed/merged` (both empty), `origin/main:public/scoring.js`
checked directly for `valueAt`/`valueIfPlaced` by name (absent). Not
there yet -- carried on with CP1, per the brief's own explicit
instruction not to stall.

## CP1 -- checked, correctly not taken

Investigated the road category (26 of the 38 unbound entries, the
largest group). Downloaded the SAME already-licensed CC0 zip
`public/vendor/kits/LICENCES.md` already documents, to see what the full
pack contains beyond the 6 files already vendored, and rendered several
candidates top-down to verify their real shapes before drawing any
conclusion from a filename. **A real defect found:** BO7A's own
`street-crossing` → `street-cross` binding (already flagged "least
certain" in its own comment) is wrong -- `road-crossing.glb` is a
straight road with a pedestrian crosswalk, not a 4-way intersection;
`road-crossroad.glb` is the real 4-way. **Not fixed unilaterally** --
the permission layer correctly blocked copying newly-downloaded assets
into `public/vendor/`, and the user confirmed directly: new CC0 asset
sourcing is Mark's call while he is out. Everything extracted for
verification was untracked and has been deleted; `data/catalogue.json`
and `scripts/link-catalogue-meshes.mjs` are untouched. Written up as
`docs/DECISIONS-FOR-MARK.md` #19 (renumbered during the later merge --
see below), with a concrete recommendation (four real shapes found:
crossroad/intersection/end/end-round) for whoever gets sourcing
authorisation next.

## The merge -- confirmed by the user, then real conflicts resolved

S4 landed on `origin/main` (merged from `scoring`, authorised by Mark per
`ADR-020`, logged in `EVENT-LOG.jsonl`). The permission layer correctly
stopped a first merge attempt (the user's own instruction had said
"check for the merge," not explicitly "merge") and asked directly --
confirmed, then merged.

Real conflicts, resolved (full detail in commit `504680d`):
- 6 files under `_TO-DELETE/` (codex-lane still had them; origin/main
  deleted them via CLI's own already-authorised purge). Confirmed with
  the user before resolving, since this touches CLAUDE.md's own
  "nothing is deleted" rule directly -- completing an already-authorised
  deletion, not performing a new one.
- `data/catalogue.json` (50 entries, each conflicting on its own last
  field: `glb` vs `unitQuality`). Verified programmatically first that
  every OTHER field was byte-identical across all 50 entries, then
  merged both real fields onto every entry -- 12 still glb-bound.
- `docs/DECISIONS-FOR-MARK.md` (both branches independently numbered new
  entries from the same next integer -- exactly the divergence this
  file's own header already documents as structural). Kept both sides;
  renumbered codex-lane's own two entries to #18/#19.
- `public/catalogue-validator.js` / `test/catalogueValidator.test.ts`
  (both branches independently added their own "rule 9"). Kept both as
  separate rules -- unitQuality stays 9, glb renumbered to 10.

Verified before completing the merge, not assumed: 104/104 targeted
tests pass, `tsc` clean. The one expected failure -- RB3's own
live-signal test -- fired red exactly as designed.

## RC5 -- finished for real, the highest-value item

`2f98a4c`. `resolveReadout` needed no code change -- the guessed
signature matched S4's real, shipped one exactly. RB3's own live-signal
test replaced with a real verification cross-checking `resolveReadout`'s
output directly against the real `valueAt`/`valueIfPlaced`. Rendered on
the real demo board: `26-readout-real-numbers.png`, a house beside the
landmark tower reads `ifPlaced=2.32` -- `2.32/5 = 0.464`, matching Mark's
own falloff-anchor question almost exactly ("the nearest possible
neighbour contributes only ~46%"). Three real, distinguishable numbers
measured and shown (not tuned): `-0.43` near a dilutive residential
piece, `2.32` near the landmark, `0` far from everything. Zero edits to
`public/scoring.js`. RB3 and RC5 both ticked `[x]`.

## CP2 -- a contact sheet, and a real defect caught by looking

`810fca2`. New `public/catalogue-contact-sheet.html` + a dedicated
`page.screenshot()`-based driver (canvas-only capture would have missed
the DOM labels). **A real defect found first:** the shared material's
default fog range (tuned for HERO_MODE's much closer composition) left
most of this larger 12-piece grid fogged into the ground's own tone --
caught by opening the first render, not assumed from clean stats. Fixed
with a caller-side `uFogFar` override (RC4's own pattern). Honest read,
written into the checklist in full: the strongest pattern is a cross-kit
palette split (warm modular-buildings vs cool city-kit-commercial vs
neutral roads) -- directly answering R2/A8's "coherent kit" question,
and the honest answer is not fully, yet. A suspected green patch on
`small-commercial-a` was checked directly and did not hold up.

## CP3 -- the five pending pairs, gathered

`6b07194`. `docs/audits/BLD-2026-09-15-image-pairs-for-mark.md` --
N1a/N1b/N1c/RB5/RC4, each by real path, what changed, an honest read.
No re-rendering, no re-tuning. Summary: the two paving-radius changes
(RB5, RC4) are the strongest; N1a close behind; N1b real but quieter;
N1c the weakest on this evidence alone (the dumpster prop is the one
unambiguous addition in that pair). None looks like a regression.

## Commits, in order

`a7d68a7` brief+checklist, `f3d7296` CP1 decision, `504680d` merge,
`2f98a4c` RC5, `999d946` RB3/RC5 ticks, `810fca2` CP2, `a884c52` CP2
tick, `6b07194` CP3, `2be5369` CP3 gate. All pushed:
`e00ba53..2be5369 codex-lane -> codex-lane`.

## Verification, this run overall

Every item's own targeted test run passed at the time it landed (peak:
225/225 after the merge; final additions bring the total higher). `npx
tsc --noEmit` clean throughout. Every new mechanism mutation-verified
where a mutation was meaningful (RC5's cross-check, the merge's own
conflict resolutions spot-checked against real distances/shapes). Did
not attempt a full, unfiltered `npm test` -- `test/cullingRatio.test.ts`'s
own pre-existing internal-timeout stall remains documented and not this
run's to chase.

## For the next run

- **Six pending before/after pairs now, not five**, plus a contact
  sheet: `docs/audits/BLD-2026-09-15-image-pairs-for-mark.md` and
  `27-catalogue-contact-sheet.png` are both ready for Mark's own look in
  one sitting.
- **CP1 stays open, blocked on asset-sourcing authorisation, not missing
  work.** `docs/DECISIONS-FOR-MARK.md` #19 names four real shapes
  (crossroad/intersection/end/end-round) from the SAME already-licensed
  pack, verified by rendering, ready to bind the moment sourcing is
  authorised -- would close a large fraction of the 26 unbound road
  entries at once (reused across the lane/street/avenue/highway width
  tiers).
- **The phase gate's own "sees why that cell was worth choosing" clause
  is now real, not honest-unavailable.** RC1-RC5 together cover the
  entire phase gate sentence for the first time this project has been
  able to say that.
- `docs/DECISIONS-FOR-MARK.md` now runs through #19; #18 (the BO7A/A1
  merge question) is marked RESOLVED by this run's own merge.
