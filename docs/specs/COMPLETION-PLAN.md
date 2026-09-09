# COMPLETION PLAN — everything left to finish CALIPER

Written 2026-09-09, after Mark's observation that no single document held the
whole remaining build. `docs/OVERNIGHT-RUN.md` held one night's list;
`BOARD-REBUILD-PLAN.md` holds the world rebuild only. Neither answered "what is
left, and how will we know it works."

**This file is the checklist. Tick here.** Phase numbering is governed by
[`BOARD-REBUILD-PLAN.md`](BOARD-REBUILD-PLAN.md); where anything disagrees, that
file wins. Tick an item only when its gate is green **and** the commit exists —
an unticked item with a commit is a lie in either direction, and so is the
reverse.

---

## WHAT "FINISHED" MEANS

Five conditions, all measurable. Anything not serving one of these is not on
this list.

1. **The archipelago renders from the board**, and nothing else holds world
   state or is drawn.
2. **Every capability that was built is reachable**, or is written down as
   deliberately unreached with a reason.
3. **Every published number is generated from the thing it describes**, and a
   gate fails when they drift — on all four surfaces, not just the one.
4. **It works on a phone**, because that is where most people will open a link.
5. **A stranger can open three links and find nothing that contradicts
   anything else.**

---

## STATUS LEGEND

`[x]` green and committed `[!]` partial, state named `[ ]` not started
`[~]` in flight this run

---

## PART 1 — THE WORLD (CLI lane, `b1-land`)

```
[x] B1     The land -- archipelago, 68.2% water, 215.2 km2, 32 islands
[x] B2.1-6 The generator, coverage inside settlements, persisted board  27cca18
[!] B2.7   Bridges and boat routes -- PLANNED + BLIND-REVIEWED, NOT BUILT  95cf588
[!] B2.8   Re-pin the 38 old-world tests -- CATEGORIZED 38/38, NOT RE-PINNED  76e8d61
[ ] B3     The render path -- draws board pieces, nothing else
             exit: city-render.js quarantined
[ ] B4     The kits wire by construction -- roadkit, kit, propModel, manifest
             exit: city-plan.js, layout.js, and board-adapter.js quarantined
[ ] B5     The visual pass -- judged against named reference shots (K5.5)
[ ] B7     The countryside -- farmland, the range, greenery
```

**B3 is the item that makes the world visible again.** Everything above it is
correctness debt; everything below it is polish. If only one thing lands, this
is the one.

---

## PART 2 — BUILDINGS AND INTERFACE (BLD lane, `codex-lane`)

```
[x] --     Shared comment-stripping helper, swept 9 files, live mutation  bac6c1b
[x] --     "Buildings read as basic" traced to its real cause            a349b05
[ ] F1     Facade texture variety -- 4 window grids serve 17,108 buildings
             gate: distinct facade materials reachable from real placements,
             measured from the caller in city-render.js, floor well above 4
[ ] F2     The rest of the K6 buildings checklist, in K6's own priority order
[ ] F3     Kitbash variety -- what reaches the world vs what the registry holds
[ ] F4     The comment-strip sweep finished as a CATEGORY, not nine files
[ ] K7.1   The atlas gap -- code-verified, never visually verified
[ ] B6     The interface. Mobile is the open part: world fills the screen,
             landscape, prompt box findable, touch, and the touch-action gap
             on #world-canvas found and never fixed.
             Middle-mouse pan (9d54d05), inspector clearing the nav, and the
             nav wheel are already done -- do not rebuild them.
             gate: measured on a real viewport, never a stylesheet substring
[ ] --     Wedge-wheel screenshot with panels closed; U1's re-watch in
             e2e/panelOverlap.spec.ts
[!] --     Bug 2, the CSS rule that matched and never painted -- UNEXPLAINED.
             An honest permanent UNEXPLAINED is an acceptable close.
[ ] --     Decide the uncommitted package.json change and the 10 untracked
             pending-commit files
```

---

## PART 3 — CORRECTNESS DEBT

```
[!] C1  Mutation evidence 109/119. The 10 blocked by the pattern-F deadlock
          between _mutcheck.mjs's red-baseline refusal and B2.5's honest red.
          Fix: teach the harness a named-honest-red allowlist. Target 119/119.
[ ] C2  The dead-export allowlist holds 2,801 entries. NO NUMBER FROM IT MAY BE
          PUBLISHED until broken down by mechanism: product / demo-only /
          test-only / unreachable / data-reachable (string key selects from a
          registry). UMAA trigger 2.
[ ] C3  All seven standing gates green simultaneously. This has never happened.
[ ] C4  The claim reconciliation. Every published number appears on up to four
          surfaces -- the live page, the README, DATUM, the resume -- and they
          disagree today. Generated where the machinery exists, once, at the end.
          Known stale: "98 deliberate defects, all 98 caught" is now 109 of 119.
[ ] C5  B2.5's CPU-time gate: honestly red at 39.7s against 30s. Either the
          generation gets under the ceiling or the gate is retired with a
          written reason. Not left red forever without a decision.
```

---

## PART 4 — RELEASE

```
[ ] R1  Merge b1-land into main. Human-authorised, never by a lane.
[ ] R2  Merge codex-lane into main.
[ ] R3  Full suite green, or every red named and justified in one place.
[ ] R4  Deploy from main. Check the branch first -- 2026-09-09 shipped b1-land
          by accident and put 71.8% of plots in the water on the live site.
[ ] R5  Verify live, not locally: load the real URL on desktop AND on a phone.
[ ] R6  Push every branch. The whole rebuild lived on one disk for a full day.
```

---

## PART 5 — OUTSIDE THIS REPO

Tracked here so nothing is lost; executed elsewhere.

```
[ ] X1  DATUM's src/ui/index.html still publishes 19,874 plots and 387 cycles.
          CALIPER publishes 17,108 buildings and 450 cycles. Two of Mark's own
          live sites contradict each other. Cheapest high-value fix on the list.
[ ] X2  DATUM's framing matches its audit: drawing reviewer leads, incident loop
          demoted, 116 incidents / 112 undetermined / 3.4% diagnosis, no accuracy
          percentage published because n=4.
[ ] X3  One resume, not two. outputs/resume-v4.md is current;
          Downloads/Mark-Fraser-Resume-AI.{pdf,docx} is the older shipped pair.
          Pick v4, regenerate the pair, retire the other.
[ ] X4  The resume's own numbers pass C4.
```

---

## THE VERIFICATION PASS — how we know it works

Building it is not finishing it. Before R1, one pass, and it is not self-graded:

1. **A blind audit at the B4 exit** — a fresh agent with the diff and the plan
   and none of the reasoning. `docs/UMAA-CALIPER.md`, recording which of the six
   triggers fired. An audit that cannot say why it ran was run from habit.
2. **Mutation, not coverage.** Every gate this plan names must be watched red
   before it is trusted. A control only ever seen green is not known to be a
   control.
3. **Reachability, not import-counting.** C2's breakdown is this, and it has
   already found three real bugs.
4. **The claim trace.** Pick five published numbers at random and follow each
   back to the thing it describes. Any that cannot be traced is a C4 failure.
5. **Open it like a stranger would.** The real URL, on a phone, cold, with no
   knowledge of what it is meant to do.

---

## THE MINIMUM SENDABLE CUT

Not the finished build — the point at which the links can go out. Everything
else can land after the résumés are sent.

**B3 · C1 · C4 · R1–R6 · X1 · X3**

That is: the archipelago renders, the mutation number is true, every published
figure agrees with every other, it is merged and live and checked on a phone,
DATUM stops contradicting CALIPER, and there is one résumé. B4, B5, B7, the
interface polish and the allowlist breakdown are all real work and none of them
is why someone would or would not reply.
