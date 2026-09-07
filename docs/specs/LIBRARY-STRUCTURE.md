# The library, restructured

**Mark's decisions, 2026-09-06.** The library grows, the quality axis shrinks to
four, size becomes a real property, and every model carries a **rank** the game
layer can gate on.

---

## WHERE 240 CAME FROM: NOWHERE

240 per category was chosen by the generation script. Commit `ae6c79b` reads
*"6-tier quality asset system with 540 procedural models across 9 categories"*,
which later became 240 × 10 = 2,400. It was never derived from a memory budget,
a variety target, a draw-call count, or anything else.

**It is not a ceiling and should not be treated as one.** These are procedural
functions; a new design costs a function, not an artist.

---

## THE PROBLEM, MEASURED

240 `bld-` entries are **40 designs × 6 quality tiers**.
`bld-highend-art-deco-skyscraper` and `bld-luxury-art-deco-skyscraper` are the
same building at two finish levels. So the entire building vocabulary of the
world is **40 shapes**, and 200 of the 240 slots hold near-duplicates.

Worse, the 40 are distributed inversely to demand:

| Band | Designs | Share of world placed |
|---|---|---|
| Towers | **11** | **0.3%** |
| Single family | 10 | 19% |
| Row / townhouse | 5 | **27%** |
| Small apartment / walkup | **4** | **11%** |
| Mid-rise / office | 4 | 4% |
| Commercial / industrial | 4 | <1% |
| Civic | 2 | <1% |

**Eleven tower designs for 0.3% of the world; four walkup designs for 11%.** The
ordinary middle — walkups, small apartment blocks, mixed use, corner commercial —
is what 90% of the world is made of and has roughly thirteen designs to draw on.
That is a large part of what reads as "the world's most boring subdivision."

---

## THE FOUR AXES

A model is identified by **design**, described by **size**, finished at one of
**four levels**, and carries a **rank** for the game to gate on. Four axes, each
doing one job.

### 1. DESIGN — the shape. This is where variety lives.

Target roughly **200 distinct designs**, weighted to what the world actually
places rather than to what is fun to model:

| Band | Designs | Why |
|---|---|---|
| Row / townhouse / terrace | **~45** | 27% of the world |
| Single family / villa | ~35 | 19% |
| Walkup / small apartment / condo | **~40** | 11%, and the thinnest band today |
| Mid-rise / mixed use / office | ~30 | the missing middle of any real city |
| Commercial — shopfront, corner store, strip, big box | ~20 | almost absent today |
| Towers | ~20 | already the deepest band; grow it last |
| Industrial / civic / institutional | ~15 | |

You notice a repeated **shape** long before a repeated **finish**. Design count
is the lever that kills repetition; everything else is secondary.

### 2. SIZE — three separable things, none of them a name

Mark: *"ground space, design layout, and height is how buildings use space."*
Exactly right, and they are three properties, not one:

- **`foot: { w, d }`** — ground space, in **whole cells** per
  `PLACEMENT-CONTRACT.md`.
- **`plan`** — the layout: `bar`, `L`, `U`, `court`, `tower-on-podium`,
  `point`, `ring`. Two buildings on the same 6 × 6 footprint read completely
  differently as a bar or a courtyard block.
- **`levels`** — height, in the vertical unit `grid.js` already defines
  (`LEVEL = 4`).
- **`clear: { w, d }`** — the free space needed around it, still owed from the
  placement contract.

**Size is queried, never parsed from a name.** The assembler asks "what fits
this space", which is the contract's own rule. A size baked into an id is a
second source of truth, and that pattern cost the skyline once today already.

### 3. FINISH — four levels, labels to be chosen

Mark: *"put all of them into 4 quality levels (not named as I have them, not
sure they need labels)."* Four steps, because six were not distinguishable on
screen at any distance.

Suggested internal keys, deliberately plain, to be replaced if better ones
arrive: `f1`, `f2`, `f3`, `f4`, ascending. **Finish affects material, trim and
detail density only — never footprint, never height, never silhouette.** That
separation is what lets one design carry four finishes without becoming four
designs.

### 4. RANK — a letter and a number, for the game to gate on

Mark: *"ranking them with a letter and number so that we can set rules like you
need to have x number of B type towers before you can build a C type tower."*

- **Letter = scale class**, derived from `foot` × `levels`. `A` smallest
  through `F` largest. Derived, not hand-assigned, so it cannot drift from the
  size it describes.
- **Number = prestige within that class**, 1–4, tracking finish.

So `C3` is a large building at the third finish level, and a progression rule
can read *"three B-class towers before a C."*

**THE RANK IS A GAME PROPERTY, NOT A BOARD PROPERTY.** The board still asks one
question and only one: does `foot + clear` fit in the free cells here. Rank is
consulted by the game layer — progression, unlocks, costs — and is designed to
be tunable or switched off entirely. Mark's own rule from earlier today:
*"restrictions about what is needed in an area … that is more about the game
than it is about the board."*

---

## THE COUNT

~200 designs × 4 finishes = **~800 building entries**, against 240 today. Three
and a half times the entries, **five times the distinct shapes**, and the growth
concentrated in the bands that are actually built.

Memory is not the constraint: `layoutGeometry.test.ts` now budgets 2,000,000
distinct triangles at roughly 56 MB of VRAM, and geometry is built lazily per
variant.

The same reasoning applies to the other nine categories — vehicles, vegetation,
furniture, marine, road, boundary, bridges, avenue, civic — each currently 40
designs × 6. **Buildings first**, because they are what Mark is looking at, but
the same rebalance is owed everywhere.

---

## ORDER

1. **Retire two finish levels** — 6 → 4. Frees 80 building slots immediately and
   nothing is deleted; quarantine per standing rule.
2. **Add `plan`, `levels` and `clear`** to every existing entry, and derive
   `rank` from them. No new models yet — this makes the existing 40 queryable.
3. **Fill the thin bands** — walkup, mixed use, commercial, mid-rise first.
   These are 90% of the world and have thirteen designs between them.
4. **Then the rest**, and only then the towers.

Step 2 before step 3, so new designs are authored against a structure that
exists rather than retrofitted into one.
