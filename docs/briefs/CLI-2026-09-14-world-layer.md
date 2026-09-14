# LANE BRIEF — CLI, the world layer, the area board, and placement

**Terminal:** CLI · **Repo:** `C:\Code\sandbox-spike` · **Branch:** `main`,
cut `world-layer` from it · **Mode:** autonomous, long run.

**Read `docs/specs/REBUILD-PLAN.md` before anything else.** It was substantially
rewritten on 2026-09-14: a section headed `ADDED 2026-09-14` defines three
systems that did not previously exist, and five corrections that had sat
unapplied in the CORRECTIONS block are now applied in place. Sections you may
remember — G1's pivot, C2.5's save format, C1.6's atlas, R1's Half Lambert —
now say different things. This brief cites that document rather than restating
it.

---

## 0. RE-GROUND, THEN COMMIT WHAT IS UNCOMMITTED

Verify state before assuming anything. Skip whatever is already done.

- `git fetch origin`, then report where `main` is against `origin/main`.
- `git status --porcelain`. Expect uncommitted edits to
  `docs/specs/REBUILD-PLAN.md` and two new files in `docs/briefs/`. Commit them
  with `git commit -F` and explicit paths — never `git add -A`.
- **Check whether the b1-board quarantine happened.** `public/board-render.js`,
  `public/board-generator.js`, `public/board-load.js`,
  `public/bridge-generator.js`, `public/board.generated.json` and
  `public/board.js` were ruled out on 2026-09-13 — they predate the research
  they would have to implement, and `board-render.js` was live in the world Mark
  rejected. If they are still in `public/`, quarantine them to
  `_TO-DELETE/b1-board/` with a ledger line each per `rule://quarantine` Tier 2,
  and derive the rest of the set with `scripts/lib/module-graph.mjs`. If they are
  already gone, say so and move on.
- **Verify `data/catalogue.json` against §C1 field by field** if that has not
  already been done — every footprint a whole number of modules and in C1.1's set
  of eight; every road width even and one of 2/4/6/8; every pivot at the anchor
  cell's corner; no duplicate ids. Report the count that pass and every entry
  that does not, by id. If it does not hold up, quarantine it rather than
  repairing it.

Then cut `world-layer` from `main`.

## 1. OBJECTIVE

Build the three layers underneath everything else, as **data and logic only. No
rendering.** Steps 1, 2 and 3 of the REVISED BUILD ORDER.

BLD is running concurrently on materials and lighting against five pieces. You
do not touch rendering, materials, shaders or the look. Coordinate through
`docs/CROSS-LANE-REQUESTS.md`.

## 2. HOW WORK IS DONE

`rule://build-loop`, every step, none skipped. `rule://reviewer-independence` —
blind review before each implementation. `rule://standard-of-proof` — state what
RED looks like and watch it fail before you make it pass.
`rule://queue-exhaustion` — descend to the next written item, never invent.
`rule://quarantine` — nothing deleted. Merges and deploys: not on your own
initiative. **You are authorised to push `world-layer`.**

## 3. CHECKLIST

**3.1 The world layer. W1–W6.**

Areas are geography, not grid tiles — one island, one stretch of coast, one
valley — with boundaries at water or impassable terrain. Every area is `LOCKED`
or `OPEN`; exactly one OPEN area is `ACTIVE`. Locked does not mean ungenerated.

Implement: the area record, the state machine, the load and unload contract from
W5, and addressing per W6 — a cell is `{ areaId, x, y }`, local to its area,
with **no global cell grid**.

**Camera-relative origin is part of this layer, not a rendering detail.** The
active area re-centres at the origin on entry. Design it in now; retrofitting it
means touching every transform.

*Gate:* RED is a piece resolving to the wrong area, an area that can be entered
while LOCKED, or two areas ACTIVE at once.

**3.2 The area board. C2.1, inside an area.**

Typed arrays addressed `y * width + x`. A dense occupancy index holding the
piece's integer id in **every covered cell**. Footprint DERIVED via
`occupiedRect(anchor, rotation, catalogue[typeId].size)`, never stored. No object
per cell, no `Map` keyed on a string, no sparse arrays — V8 documents a permanent
6× slowdown from one hole.

The cell record carries **elevation, corner offsets and surface type from the
start**, defaulted to zero while the board is flat. Terrain arrives at step 6; if
those fields are absent it is a rewrite of validity, picking and bounds rather
than a layer.

*Gate:* RED is a footprint that survives a rotation incorrectly, or an occupancy
index that disagrees with the derived rect.

**3.3 Placement. C2.2's Tier 1.**

Palette → ghost snapped to the cell showing the true footprint → validity
evaluated continuously and shown, binary, with the click **inert** when invalid →
commit → cancel → remove. **Undo is not Tier 1.** Fast-replace is the next thing
after, not now.

Validity revalidates when the anchor cell or rotation changes, not per frame.
Checks in order of cheapness: in bounds → terrain type permits → no cell in the
rect occupied → slope within tolerance. **The ghost and the commit call the same
function.** If they can diverge, they will.

Persistence per C2.5 **as corrected**:
`{ seed, generatorParams, tombstones: number[], placements[] }`. Tombstones are
required — without them the format cannot record that a player bulldozed
generated content, and reload silently restores it.

*Gate:* place, remove, reload, and the board is what you left. RED is a removal
that comes back.

## 4. WHAT DONE LOOKS LIKE

A world of areas that can be entered, left and locked; a board inside an area
that answers what is where in O(1); placement and removal that survive a reload;
tests for each; and not one line of rendering code.

## 5. STOPPING POINT

**Stop when 3.3 is committed.** Write the handover as you go, after every item,
so a crash costs one step rather than the run.

Do not start terrain, the catalogue, impostors, the overview's render, the
generator or Side B. Do not touch materials or shaders — that is BLD's run.

## 6. GUARDS

`CALIPER_ALLOW_SPEND` unset, zero API spend. Nothing deleted. `git commit -F`
with explicit paths, never `git add -A`. PowerShell — no heredocs, no `&&`, no
`$( )`. Spell-check every word. **Never kill a process; record PIDs.**

## 7. REPORT

What you found at re-ground and what you skipped as already done. The catalogue
verdict entry by entry. What was quarantined, if anything. Each gate with its
red-first evidence. And **anything in `REBUILD-PLAN.md`'s new sections you
believe is wrong** — W, S and B were written in one pass on 2026-09-14 and have
been reviewed by nobody. The last document that went into a lane unreviewed came
back with eleven findings, nine of them real.
