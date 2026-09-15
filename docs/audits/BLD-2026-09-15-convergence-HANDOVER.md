# BLD lane, THE CONVERGENCE, 2026-09-15 -- handover

Brief: [docs/briefs/BLD-2026-09-15-convergence.md](../briefs/BLD-2026-09-15-convergence.md).
RB1-RB5 all landed this run, in order, without stopping between them per
the brief's own §5. RB3 is honestly `[!]` (partial), not `[x]` -- CLI's S4
has not landed. Everything else is `[x]`. Pushed to `origin/codex-lane`
through `eea5291`.

## §0 -- start

`codex-lane` was current with `origin/main` at `8c9b3a9` per the brief's
own claim, confirmed. This run's own brief and `docs/specs/REBUILD-
CHECKLIST.md`'s new "THE CONVERGENCE" section (RB1-RB5) were found already
in the working tree -- committed as-received at `fde9af8`.

## RB1 -- a board renderer

`6fb1cec`. New module `public/board-renderer.js`, pure data resolution
(no THREE at the top level, GPU-free tests): `resolveBoardPieces` reads a
real `createAreaBoard()`'s own `board.pieces()` and the real
`data/catalogue.json` (BO7A's own `glb` field, from the prior run),
resolves each into a render-ready descriptor via the SAME array-texture
manifest `buildArrayTexture()` already reads for layer assignment -- one
source of truth, not a second kit-name parser. `look-proof-scene.html`'s
new `?board=1` places 4 real glb-bound pieces via the real `board.place()`
onto a real board; `PIECES` is empty in this mode -- nothing hardcoded
feeds the render alongside it. `?board=1&removeId=<id>` calls the real
`board.remove()` before rendering.

`14-board.png` / `15-board-removed.png`: `remove()`'d piece (tower-
base-6x6-a) visibly gone, the other three unchanged, draw calls held at 2
(merged mesh + sky) at both counts.

## RB2 -- the ghost

`727ca0e`. `resolveGhost` reads a real `session.getGhost()`'s own
`valid`/`reason` VERBATIM (never re-derives them -- `setGhost` already
calls the board's own `evaluatePlacement`, the same function `place()`
itself calls). `?board=1&ghost=valid`/`invalid` build a real
`createPlacementSession`; the invalid demo targets the SAME cell
`house-a` already occupies, so the refusal is real, not staged. Rendered
as a SEPARATE overlay mesh (its own `MeshBasicMaterial` -- the shared
material has no tint/alpha uniform and RB1's own brief said not to
rewrite it): green valid, red invalid. `16-ghost-valid.png` /
`17-ghost-invalid.png`. "Committing it changes nothing" proven on the
real board, not asserted: `GHOST-COMMIT ok=false reason=inert
piecesBefore=4 piecesAfter=4 unchanged=true`.

## RB3 -- the value readout (`[!]`, honestly partial)

`fb5b1f4`. Checked `origin/scoring` and `origin/main` directly -- neither
has `valueAt`/`valueIfPlaced` as of this run, only S1's `value()` and
S2's `falloff`. Built exactly what the brief's own §4 asked for in that
case: `resolveReadout` checks for both functions before calling either
(never invents a number), called through a NAMESPACE import
(`import * as ScoringModule`, never a named import of an export that
does not exist yet -- that would crash every other mode this file
ships). `?board=1&readout=x,y` renders the real, honest "unavailable"
state -- `18-readout-unavailable.png`, a deliberately muted grey marker,
console: `READOUT-STATE ... available=false reason="S4 not landed: ..."`.

The item's own real gate ("the number changes as the cursor moves")
cannot be shown with real numbers while none exist. Proven instead at
the mechanism level against a mock. A SEPARATE, live test against the
real, unmocked `public/scoring.js` is written to deliberately fail the
moment `valueAt`/`valueIfPlaced` land -- that failure is the signal to
come back, render real numbers, and re-verify the actual visual gate
before this item is re-ticked `[x]`.

**Zero edits to `public/scoring.js`**, per the brief's own explicit
boundary.

## RB4 -- still there on reload

`ef44341`. `?board=1&reload=1` serializes the real session
(`session.serialize()`, C2.5's save shape) and rebuilds via the real
`loadBoard()`; `board` (declared `let`, not `const`, specifically for
this) is reassigned to the reloaded board before any downstream
resolution runs. `19-reload.png` is BYTE-IDENTICAL to `14-board.png` --
confirmed with `cmp`, not eyeballed.

`?reloadShrink=1` reloads into a deliberately narrower board (20 cells,
not 24) so `mega-tower-a`'s own saved anchor genuinely no longer fits --
a real out-of-bounds refusal, not an untested happy-path-only
`failures: []`. Console: `RELOAD-FAILURES mega-tower-a(out-of-bounds)`.
`20-reload-failure.png` shows exactly that piece missing (`resolved`
4 -> 3), the other three unchanged.

## RB5 -- the ground stops reading as desert

`b4949c9`. Measured first, not assumed: the existing ground texture
(manifest's own "ground-grass") has a real mean RGB of (172,148,121) --
a warm dirt/sand tone despite its own filename, not green. A second,
already-vendored, already CC0-licensed layer (`04-ground-paved.png`,
gravel, mean RGB (173,163,150), notably more neutral) assigned PER
VERTEX within a 6m radius of any real footprint, reusing 4.3's own
`distanceOutsideFootprint`. Deliberately not the road pack's own layer --
N1c already found that bands under a large stretch. Fog colour and the
sky's own horizon stop retuned TOGETHER and matched exactly, so N1b's
own seamless ground-into-sky fade does not grow a visible seam.

`13-street-level.png` (Mark's own actually-judged shot) deliberately
left untouched / `21-ground-material.png`. **Honest read:** the paving is
a real, clearly visible change -- a continuous grey ground area now
connects all four pieces. The fog/sky retune is the more subtle of the
two but present in the same pair, not cherry-picked separately.

**A real mistake, caught mid-work, not after:** because the ground/sky
change is global, RB1-RB4's own already-gated shots (14-20) needed
refreshing to stay consistent with the current scene -- and while doing
that refresh, `13-street-level.png` itself got swept up and re-rendered
by mistake before being caught. `git status` immediately after showed it
modified; restored via `git checkout HEAD --` before anything was staged
or committed. Exactly the "check before trusting" discipline this
project has needed before, working as intended. RB1-RB4's own gates are
NOT reopened by the refresh -- their structural evidence (draw calls,
resolved/skipped counts, `RELOAD-FAILURES`, `GHOST-COMMIT`) is unchanged
and was re-confirmed against the refreshed renders; `19-reload.png` was
re-checked byte-identical to the refreshed `14-board.png` after the
refresh, proving RB4's own gate still holds.

## A separate, real finding: `_TO-DELETE/` was found empty on disk mid-run

Discovered via a routine `git status` check during RB1, before this
run's own first commit. All 56 files under `_TO-DELETE/` (including
`_TO-DELETE/b1-board/` -- the exact "rejected world" this brief's own §2
says must never be touched -- and `_TO-DELETE/LEDGER.jsonl`, the file
this project has specifically hardened `.gitignore` against losing
before) were missing from the working directory, though still present
in git's index (`git status` showed them as unstaged deletions, not
already-committed removals). Not caused by any command this session ran
-- nothing in this run's own history touches that directory at all --
and, unlike every other externally-modified file encountered this
session, no "this was intentional" note accompanied it.

Restored via `git checkout -- _TO-DELETE/` (a safe, reversible recovery
from HEAD, not a judgement call about someone else's in-progress work)
and diff-confirmed byte-identical against HEAD, `LEDGER.jsonl` included.
A full repo-wide `git status` sweep afterward showed nothing else
affected. Not treated as one of this run's own RB items -- flagged here,
plainly, for Mark.

## Commits, in order

`fde9af8` brief+checklist, `6fb1cec` RB1, `8f24898` RB1 tick,
`727ca0e` RB2, `686c633` RB2 tick, `fb5b1f4` RB3, `886e1b7` RB3 tick,
`ef44341` RB4, `64c8431` RB4 tick, `b4949c9` RB5, `eea5291` RB5 tick.
All pushed: `8f5a436..eea5291 codex-lane -> codex-lane`.

## Verification, this run overall

`node test/run.mjs test/lookProofScene.test.ts test/boardRenderer.test.ts
test/placement.test.ts test/areaBoard.test.ts test/catalogueValidator.test.ts
test/scoring.test.ts test/worldLayer.test.ts test/area.test.ts`: 230/230
pass. `npx tsc --noEmit` clean throughout. Every new mechanism (RB1's
board resolution, RB2's ghost, RB3's readout adapter, RB4's reload
reassignment, RB5's per-vertex ground layer and fog/sky match) mutation-
verified: mutated, watched red, restored via `cp` from an explicit
backup (never `git checkout --` for that purpose) and diff-confirmed
byte-identical. Did not attempt a full, unfiltered `npm test` run this
session -- the prior run in this same environment already diagnosed
`test/cullingRatio.test.ts`'s own reproducible internal-timeout stall as
pre-existing and unrelated (`docs/DECISIONS-FOR-MARK.md` item 4); this
run's own brief §7 says plainly not to chase a fifth reproduction.

## For the next run

- **Show Mark the pairs.** `08-cast-shadows.png` was the last shot he
  actually judged; N1's own three pairs (11/12/13) and now RB5's own
  pair (13/21) are all waiting on a real verdict.
- **RB3 stays `[!]` until CLI's S4 lands.** The live test in
  `test/boardRenderer.test.ts` (`GATE (RB3): the REAL public/scoring.js
  ...`) is written to fail the moment `valueAt`/`valueIfPlaced` exist --
  that failure is the signal to come back and finish this item for real,
  not a bug to fix quietly.
- **The phase gate sentence is now reachable, mechanically.** RB1-RB4
  together are "a person ... picks an area, places a building, sees why
  that cell was worth choosing, and it is still there on reload" minus
  the "sees why" half (blocked on RB3/S4) and minus any actual UI (this
  is still a proof scene with query-string modes, not a playable page --
  BO9/BO10/BO11, explicitly "later," are that work).
- The `_TO-DELETE/` deletion finding above is unresolved as a mystery --
  restored, but not explained. Worth asking whether anything else was
  running against this same working directory around 14:14 on 2026-09-14
  (the mtime `_TO-DELETE/` itself carried when found empty).
