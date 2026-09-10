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
[!] B2.7   Bridges and boat routes -- generator IMPLEMENTED, tested, mutated
             (501f0a9); committed asset REGENERATED 2026-09-10 after a blind
             Codex review found it shipped zero crossings (generator worked,
             output never reached public/board.generated.json -- fixed,
             gate now reads the committed file, not a fixture). Regenerating
             surfaced a further, real gap: 3 of the 12 settled boundaries
             (farm-isle, quarry-isle, resort-isle) still have zero crossing
             egress on the real, already-occupied board -- named, watched
             red on purpose, docs/DECISIONS-FOR-MARK.md #7. Not [x] until
             that gate is green too. See docs/audits/OVERNIGHT-CLI-
             2026-09-09.md's RUN 5 section for the commit.
[!] B2.8   Re-pin the 38 old-world tests -- CATEGORIZED 38/38; ~4 bridge-
             shaped ones already superseded by bridgeGenerator.test.ts;
             the remaining ~30 need B4 first (their own old-world import
             chain -- layout.js/instance-groups.js/road-network.js -- is
             what B4 replaces), re-sequenced in writing                ca413a0
[!] B3     The render path -- draws board pieces, additively, alongside
             the still-running old path (picking/spatial-index/sun-sky
             not yet rebuilt against the board). Visual result VERIFIED
             2026-09-09 -- this line was stale until 2026-09-10 (RUN 3
             item 1, 18007b8, ran scripts/shoot.mjs with SHOOT_BOARD=1 and
             looked: .shots/downtown-close.png shows 35,365 real board
             pieces and 400 trees drawn, correctly positioned per B3's own
             additive scope, visibly interpenetrating the OLD world's
             still-running geometry -- an honest, imperfect, but genuinely
             OBSERVED result, not an unverified one. Board-drawing broke
             two standing perf gates when tried un-gated (measured: culling
             65.8% vs <40%, 7,851 draw calls vs <=900) -- fixed by gating
             behind ?board=1/SHOOT_BOARD=1, off by default; both gates
             reconfirmed green with it off.       6dcfda3 / bac86b0 / 18007b8
             2026-09-10: picking's own data source, closed one step -- the
             real board is already fetched in _buildCityBase (when
             ?board=1); it is now RETAINED (this._boardData) instead of
             discarded after drawing, and the city-mode pick handler
             additionally resolves the real board.js piece at a click via
             a new pieceAtPoint() query, alongside (not replacing) the
             existing old-world-derived addr/piece/label path -- purely
             additive, zero effect when ?board=1 is absent. Sun/sky still
             has no board-based equivalent at all (new, separate work, not
             started); picking is not yet SWITCHED to the board, only
             connected to it -- the old-world addr/districtId/className
             shape onInspect's other fields depend on has no board-only
             equivalent yet either. Evidence: node test/run.mjs
             test/boardLoad.test.ts test/pickSelection.test.ts (10/10 pass,
             including the new wiring gate); npx tsc --noEmit clean; node
             scripts/_mutcheck.mjs test/boardLoad.test.ts
             public/board-load.js (CAUGHT, test/mutations.json). See
             docs/audits/OVERNIGHT-2026-09-10.md's RUN 6 section for the
             commit.
             exit: city-render.js quarantined -- NOT YET, on purpose. Real
             remaining scope, unchanged by this step: switch picking over
             (not just connect it), sun/sky extracted from buildWorld(),
             fetchBoard() made unconditional for query purposes.
[!] B4     The kits wire by construction -- propModel wired live and
             product-reachable (dead-exports gate watched red, confirmed,
             re-greened); roadkit/buildings-typology/full props manifest
             still open                                c785e29 / 547b721
             2026-09-10: two more manifest ids wired live -- scatterStreetFurniture
             (public/board-render.js) alternates real propModel("bench", ...)/
             ("bin", ...) along road pieces, wired into world-render-3d.js's
             existing ?board=1-gated block alongside scatterTrees/
             scatterStreetLamps. A blind review of the plan (before
             implementation) found two real gaps, both fixed before
             writing code: the plan's own single id-parameterised
             propModel() call would not satisfy the static reachability
             gate's literal-string pattern (fixed: two literal calls); and
             copying scatterStreetLamps's rotation-free positioning would
             leave a bench (real footprint 1.8x0.55m, not roughly
             symmetric like a lamp) pointing ACROSS the road on every
             east/west-oriented span (fixed: the group now rotates 90
             degrees on that orientation). Both fixes mutation-tested,
             CAUGHT. Evidence: node test/run.mjs test/boardRender.test.ts
             (25/25 pass, targeted only -- free memory was 2.12 GB this
             session, under the 4 GB floor for a full suite/browser run,
             per docs/OVERNIGHT-RUN.md; a targeted run does not need it);
             npx tsc --noEmit clean; node scripts/_mutcheck.mjs
             test/boardRender.test.ts public/board-render.js (both new
             mutations CAUGHT, test/mutations.json). Roadkit/buildings-
             typology (decisions #5/#6) and busShelter (a third manifest
             alias, same pattern, not attempted this step) still open.
[ ] B5     The visual pass -- judged against named reference shots (K5.5)
[ ] B7     The countryside -- farmland, the range, greenery
```

**B3 is the item that makes the world visible again.** Landed additively
tonight; the visual result itself has not been looked at (memory-constrained
all session). Everything above it is correctness debt; everything below it
is polish.

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
[!] C1  Mutation evidence 119/129, 1 SURVIVED (confirmed real -- no node:test
          assertion for it exists), 9 NEVER RUN. The allowlist fix
          (scripts/expected-red.mjs) is BUILT and CONFIRMED working against
          the real deadlock -- d00aea5. Still not run: b2-6-no-live-route
          (same expensive file), b2-5-ground-verified-opt-in (needs a manual
          paired-timing run), 5 isolate.test.ts-scoped (blocked on B2.8/B4).
          2 more (wooded-exclusion, mainland-boundary) had a stale `expect`
          string -- fixed, not yet re-run (each run costs ~15+ min on this
          host). Target 129/129 (or fewer if the SURVIVED one needs its own
          decision, not just a re-run).
[ ] C2  The dead-export allowlist now exists for b1-land (seeded fresh, NOT
          copied from codex-lane): test/deadExports.allowlist.json,
          2,762 entries (37 demo-only, 211 test-only, 2,514 unreachable) --
          c785e29. Auto-generated reasons, not yet reviewed one-by-one for
          product/demo/test/unreachable breakdown-by-mechanism this item
          asks for. propModel already promoted out of it (547b721) by real
          wiring, not by editing the allowlist by hand.
[ ] C3  All seven standing gates green simultaneously. This has never happened.
[!] C4  The claim reconciliation, mutation-evidence surface: README.md's
          "98 deliberate defects, all 98 caught" fixed to name all four real
          states (injected/caught/never-run/survived-or-inconclusive), gated
          by src/generatedClaimChecks.ts's mutationClaimMismatch, mutation-
          tested twice (the count check, and the "SURVIVED cannot silently
          vanish from the arithmetic" check -- the same shape of gap this
          run's own ground-check found in the overnight brief's "1,141
          tests" line, generalised and closed here too)      9b717a9 / 547b721
          Other three surfaces (live page beyond this one sentence, DATUM,
          resume) NOT reconciled -- untouched, out of that run's scope.
          MOVED FROM [x], 2026-09-10: a DIFFERENT published-number surface in
          the same "every published number is generated from the thing it
          describes" family (this file's own header, condition 3) is red --
          public/index.html claims 1087 tests, the real, freshly-measured
          count is 1194 (48 real failures, most already named elsewhere in
          this file/decision queue). Not silently fixable: the count-claim
          test's own update path refuses to run while ANY other test fails,
          by design (`scripts/gen-test-count.mjs`'s own narrow exemption,
          read directly, not assumed) -- confirmed empirically this run, not
          just reasoned about. docs/DECISIONS-FOR-MARK.md #9 has the full
          detail and a recommendation. test/testCount.generated.json
          regenerated honestly regardless (1194/1130/48/15/1, measured
          `node test/run.mjs`, full log this session's own handover cites).
[ ] C5  B2.5's CPU-time gate: honestly red at ~40-291s against 30s (varies
          with this host's own memory pressure, measured repeatedly).
          Unaffected by this run -- generation still happens offline
          (B2.6), so nothing in src/ is exposed to the ceiling regardless.
          Still not formally retired or fixed; the allowlist (C1) works
          around it for mutation-testing purposes without resolving it.
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
