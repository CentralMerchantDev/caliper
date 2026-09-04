# The finish plan

Rewritten 2026-09-04 after Mark corrected the framing. The first version of this
document read the README, concluded "research artefact with a city attached",
and ranked the world below the pipeline. That was wrong, and it was wrong in the
specific way this project exists to catch: a confident conclusion drawn from a
skim, presented as grounding.

---

## What CALIPER is

**A game about building.** You build, play, and adjust the game from inside it.
The coding agent and the design-loop verification are a core MECHANIC of that
game, not a paper the game illustrates. Mark, in his own words:

> "this is about the coding agent and the design loop verification and such like
> that, **but it's built into the game. It's part of the game. A big part of the
> game.**"

> "this is about that you can build and play and adjust the game from it. The
> game itself is a game. **It's a game about building**, and then we wanna have a
> side quest and such."

### Why look and feel is load-bearing, not polish

> "the world being made right and operating right and even looking good is a big
> part... **when things look good, they're perceived to work well**, and you're
> willing to let things slide a little bit more because of it. Whereas when they
> look cheap, then anything that doesn't work all of a sudden seems a lot
> cheaper than it is."

This is a mechanism, not a preference: perceived quality transfers between
parts. A world that reads as considered buys credibility for the verification
loop and earns forgiveness for rough edges. A world that reads as cheap makes
every real flaw in the pipeline look cheaper than it is.

So visual correctness ranks WITH correctness, not after it. The first version of
this plan put it last. That was the error.

### What follows from "it is a game"

- The model library is not a portfolio gallery. It is **the catalogue the player
  builds from**. 2,400 entries nobody can open is a missing game system.
- NPCs are characters in a game, so a canned lookup is not a placeholder — it is
  the wrong thing, and it is the exact failure the project's own thesis names.
- "The game only operates in one part of that world at a time" (Mark) is a game
  design requirement, and `grid.js` already has the regions to do it.
- Side quests are wanted.

---

## Measured state, 2026-09-04

Every number came from a command.

| | |
|---|---|
| World | 20,624 plots, 20,472 buildings, 0 overhanging their plot |
| Draw | 480 InstancedMeshes, 1.45 M triangles, `sceneChildren` 1015 |
| Library | 2,400 registry entries, 2,403 tier-model builders |
| Suite | 719 tests, 57 files, 25 mutation controls |
| Pages | 6 exist, 1 reachable |
| NPCs | 5, with 30 canned lines and 10 keyword answers, no model call |
| Regions | infrastructure present in `grid.js`, unused |

---

## Order of work

Ordered by what unblocks the most and what carries the most perceived quality,
not by what is easiest to finish.

### 1. Reachability — the game has a front door

Nothing links to anything. The catalogue, the kit sheet and the city view are
unreachable. Cheapest fix in the plan and it unblocks judging everything else.
A test walks the links, because this recurs silently every time a page is added.

### 2. The catalogue shows the whole catalogue

`model-library.html` imports `tier-models.js`; browse by tier and category; the
count asserted against the registry so it cannot silently show a fraction again.
This is the player's palette.

### 3. The look pass

The one known visual defect: buildings render wall-coloured roofs, because a
merged mesh carries one colour and the geometry has no colour attribute. agy has
the prompt. Beyond that, judge from `shoot-app.mjs` frames rather than opinion,
and fix what the frames show.

### 4. NPCs that can only say true things

Grounded in what the NPC can actually verify — role, position, the real district,
the real building beside them, the real plot class. One that cannot verify a
claim says so. The project's thesis applied to conversation.

Reuses the existing per-IP and spend caps in `src/controlLayer.ts` rather than a
second weaker set. Canned lines stay as the labelled fallback when the cap is
spent, the same way the page labels a replayed run as a recording.

### 5. Side quests

Objectives the player can be given and complete inside the world. Design first,
then build — this is the least specified item and should not be guessed at.

### 6. Regions — a world bigger than the part you are in

`grid.js` already models regions as open or LOCKED, where locked is present and
refuses with a reason rather than being absent. That is the right shape for
streaming one part of a larger world.

### 7. UMAA findings, then deploy

The blind audit's findings land before deploy, not after. Any finding that
contradicts this document wins: it was produced without knowledge of intent and
this document was not.

---

## Not doing, with reasons

- **Rebuilding the world.** Measured: the layout ran against the existing plan
  and produced 20,472 buildings, 0 overhangs, 0 footprint disagreements. The one
  real defect it exposed — row plots that could not tile — was three lines. A
  rebuild discards 719 tests and 40-plus ledger findings, each a mistake already
  paid for.
- **More models.** 2,400 is not the constraint; reachability is.
