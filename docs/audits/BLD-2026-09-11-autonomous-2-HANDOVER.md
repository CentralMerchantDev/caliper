# BLD lane, second autonomous run, 2026-09-11 -- handover

Brief: [docs/briefs/BLD-2026-09-11-autonomous-2.md](../briefs/BLD-2026-09-11-autonomous-2.md).
Stopped at the declared stopping point (section 11): item 3 committed.

## Item 0 -- brief committed, server currency confirmed

`process_get_rule('lane-brief')` returned the rule -- process-mcp server
current. Also committed 6 stray `docs/GATE-LEDGER.jsonl` lines left
unstaged from the previous run's close. Commit `2969b4b`.

## Before item 1 -- the memory-floor claim, verified rather than trusted

The brief's own instruction was explicit: "confirm for yourself that it no
longer blocks you, rather than acting on this brief's summary of it." Did
exactly that, and found a real discrepancy worth naming: `docs/OVERNIGHT-
RUN.md` on **this branch** (`codex-lane`) was last touched 2026-09-09 --
`git log --follow` shows nothing today -- and still reads "Memory below 4
GB: do code-only work and check again." The fix commit (`a53cbc8`) and its
measurement (`b8ad79b`) both live on `b1-land` only, not merged here. The
brief's instruction to "read docs/OVERNIGHT-RUN.md's memory line" does not
literally hold on this branch.

Read the real record instead via `git show b1-land:docs/audits/MEMORY-
FLOOR-EXPERIMENT-2026-09-11.md`: Mark's own attended experiment,
2026-09-11. Ground-checked first that the original 4 GB figure had no real
source anywhere in the repo. Renders (`scripts/shoot.mjs`, then the full
`regressionGate`/`cullingRatio` render suite) completed successfully while
system free memory cycled in a sawtooth down to 0.02 GB -- a Windows
caching artifact, not real starvation (peak render WorkingSet stayed
150-420 MB throughout the whole run). Treated as trustworthy: a physical-
host fact, not something that depends on which git branch documents it.
Did not merge `b1-land` -- not authorised this run.

## Item 1 -- K7.1, verified visually

`scripts/shoot.mjs` rendered four views. "Street level" and "Downtown
close" were too distant/oddly framed to resolve trim detail (reported
honestly, not treated as confirmation). "Art Deco close", then "In the
street" and "Downtown corner" (`public/city.html`'s own closer camera
presets) both show a real, textured cornice band at the roofline, distinct
from the flat brick wall and flat roof, and a string-course band between
floors on one -- exactly what the K7.1 trim-atlas patch was built to
produce, on two separate buildings. `docs/specs/COMPLETION-PLAN.md`'s K7.1
ticked with the exact command and evidence. Commits `eb863ee`, `d05566a`
(commit-hash correction). Gate ledger: `K7.1`.

## Item 2 -- B6, touch-action gap

Started from the CSS-only trace already on record (`docs/audits/U4-NAV-
WHEEL.md`, and this lane's own prior-run handover): `public/index.html`'s
`#world-canvas, #world-canvas-2d` rule has no `touch-action` property. A
first draft plan proposed adding `touch-action: none` to both. **A blind
subagent review caught two things the CSS-only trace missed**, both
confirmed directly against the real files (not trusted from the review):

1. `public/world-render-3d.js:6373`, inside `_bindOrbitControls()`
   (constructor-called, conditional on `Renderer3D` constructing
   successfully -- e.g. WebGL available), already sets
   `canvas.style.touchAction = "none"` INLINE, which wins the cascade over
   any stylesheet rule. A live probe against the real, unmodified page
   confirmed `#world-canvas` already computes `touchAction: "none"` today.
2. `#world-canvas-2d` has ZERO pointer/wheel/gesture listeners anywhere in
   this codebase (confirmed, full-file grep of `public/world-render.js`) --
   a passive 2D draw surface. The first draft's fix would have silently
   removed its only touch-interaction mechanism (native pinch/pan), with
   nothing to replace it -- a real regression, not a fix.

**The corrected finding: there was no real runtime defect.** What was
genuinely missing was a GATE -- nothing protected either fact from
regressing. New `e2e/worldCanvasTouchAction.spec.ts`: two tests, measured
via `getComputedStyle()` on a real, live page -- comment-immune by
construction, exactly matching the brief's own "measured on a real
viewport, never a stylesheet substring" gate language. Watched RED twice,
by hand, against the real live server: (1) commenting out the real inline-
style line failed the canvas3d test; (2) adding `touch-action: none` to
the shared CSS rule (the naive fix v1 almost shipped) failed the canvas2d
test. Both mutations reverted, confirmed byte-identical via `git diff
--stat`, both tests re-verified green in isolation. Commit `88a752a`, gate
ledger `B6-touch-action` (+ a commit-hash correction entry, `de7dc64`,
after the first record was mistakenly written with a "PENDING" placeholder
before the commit existed).

Did not proceed to the rest of B6's mobile list (world fills screen,
landscape, prompt box findable, touch) this run -- moved to item 3 instead,
since the brief's own section 11 treats "item 3 committed" as an
independent, equally-valid stopping condition.

## Item 3 -- wedge-wheel screenshot, U1 re-watch

**Screenshot: closed.** `docs/audits/U4-NAV-WHEEL.md`'s own prior note
named the exact gap -- the one confirmed-good render had the "How it
works" welcome card still open behind it. Taken via a one-off standalone
script (not committed -- `scripts/shoot.mjs`'s own static-server + direct
`chromium.launch()` pattern, deliberately avoiding `wrangler dev` after it
crashed/deadlocked twice this run -- see below). `#tour-toggle-btn` alone
still did not clear the panels even against the real renderer, confirming
the prior session's suspicion; `#welcome-close-btn` directly, plus
`panelOverlap.spec.ts`'s own dismiss-every-✕ sweep, worked cleanly.
Result: `.shots/nav-wheel-open.png` -- full ring, six wedge divisions,
legible labels (Orbit/Pan/Zoom/Focus/North/Rewind), world rendering
correctly, no panel in frame. Checked past the pixels too:
`#nav-wheel-hub`'s `aria-expanded="true"`, `.nav-wheel` classList
`["nav-wheel","open"]`, 6 `.nav-wheel-seg` elements -- genuinely open, not
coincidental framing. Commits `33e7347`, `5d61830` (gate ledger). Gate
ledger: `wedge-wheel-screenshot`.

**U1 re-watch: still blocked, not completed this run.** Attempted twice.
First, a combined `e2e` run (the new touch-action spec plus
`panelOverlap.spec.ts`) was terminated by the harness itself at 6.05 GB
free memory -- not a memory blocker, a background-task duration one. The
orphaned child processes it left (PIDs 39348, 22668, 29496, 18876, 20612
and their `wrangler dev --port 8787` / `playwright test` command lines)
showed zero CPU movement over an 8 s sample -- left alone, per the standing
"lanes do not kill processes" rule, named here rather than acted on.
Second, a clean solo re-run of `panelOverlap.spec.ts` hit a real
`wrangler dev` crash mid-suite (`wrangler-2026-09-11_23-05-37_005.log`) --
the exact "Network connection lost" instability `playwright.config.ts`'s
own comments already document as pre-existing, independent of this
session's changes. Port 8787 confirmed to have no active listener
afterward, checked twice a few minutes apart via `Get-NetTCPConnection`,
despite process entries still present in `Win32_Process` with periodic
inspector-heartbeat log activity but flat, zero-delta CPU -- a genuinely
stuck state, not a slow one. Not cleared this run.

## Stopping point

Per section 11: item 3 is committed. Stopping here.

## What is still open, named rather than left implicit

- U1's re-watch in `e2e/panelOverlap.spec.ts` -- blocked by the `wrangler
  dev` port-8787 contention/crash described above, not by memory. The
  orphaned processes named above have not been cleared; whoever picks this
  up next should check whether they are still present before spawning more
  `wrangler dev`/`playwright` invocations, or clear them directly if
  confirmed safe to do so (this lane did not have that confidence on a
  shared host mid-run).
- B6's remaining mobile list: world fills the screen, landscape, the
  prompt box findable, touch (beyond the touch-action gate now closed).
  U2 (mobile grounding) as a whole has not been started.
- Section 12's own fallback list (F2's K6 checklist re-read, remaining
  `rawSourceScan.test.ts` exclusions if any, F3's kitbash-wiring proposal)
  was not reached this run -- items 1-3 of the brief's own checklist filled
  the whole run.
- Every decision already in the queue before this run started
  (`process_pending_decisions`, 11 open across caliper/caliper-bld) is
  unchanged -- none blocked this run's own checklist, so none were acted
  on.
