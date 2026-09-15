# Overnight handover — BLD lane — 2026-09-09

Written for someone who was asleep. Updated after every phase, per
`docs/OVERNIGHT-RUN.md`. Branch `codex-lane`, working tree
`C:\Code\sandbox-spike-codex`. Do not merge, deploy, open a PR, or touch
`main` — none of that happened tonight.

---

## Checklist, as it stands

```
[x] Item 0  Pull OVERNIGHT-RUN.md, LANE-BRIEF-TEMPLATE.md, corrected
            BUILD-LOOP.md from b1-land          commit: 76b51d4
[x] Item 2  LESSONS.md comment-matching general control, swept + watched red
                                                  commit: bac6c1b
[x] Item 6  Buildings checklist extended from K6-BUILDINGS.md's own
            measurements-and-priority table, root cause traced to source
                                                  commit: a349b05
[!] Item 7  Bug 2 (CSS cascade) — time-boxed, BLOCKED on a browser for a
            full close; still UNEXPLAINED, two things added
                                                  commit: e21b112
[ ] Item 1  U2 — mobile grounding (largest item, not started — needs browser)
[ ] Item 3  K7.1 — visual re-shoot (needs browser/render, memory-gated —
            see correction to the brief, below)
[ ] Item 4  Wedge-wheel screenshot, panels closed (needs browser)
[ ] Item 5  U1 live-position re-watch in e2e/panelOverlap.spec.ts (needs browser)
```

**Correction to the brief (per its own §12 escape clause).** §5 groups items
2, 3 and 6 as needing no browser. That is true for 2 and 6 as done above,
but not for 3: `docs/audits/K6-BUILDINGS.md`'s own K7.1 section says
outright that its visual re-shoot never happened tonight because memory
never cleared the 4 GB floor, and that closing K7.1 for real needs exactly
that re-shoot. Item 3 is memory-gated the same as 1, 4 and 5, not exempt
from it. Recording this rather than either wrongly attempting a render
below the floor or silently leaving the brief's grouping unquestioned.

The list is longer than the night on purpose (brief §5). Running out of
night is expected; running out of work is not.

---

## Grounding, done before any work (per brief §4)

Checked, not assumed:

- `docs/OVERNIGHT-RUN.md` and `docs/LANE-BRIEF-TEMPLATE.md` were genuinely
  absent from `codex-lane` before item 0. `docs/BUILD-LOOP.md`'s guard
  section genuinely still hardcoded the stale seed-0 hash
  (`418744f1...`) that b1-land's archipelago redesign superseded.
- `docs/audits/U4-NAV-WHEEL.md`'s outstanding list (written by this lane's
  own wind-down commit `c2f3133`) matches the brief's §4 basis exactly: U2
  not started, the wedge screenshot with panels closed still open, U1's
  live-position re-watch still open, the CSS cascade bug still
  UNEXPLAINED, the LESSONS.md regex entry still OPEN.
- `docs/MODULE-MAP.md` exists on this branch, as the brief says (and as
  `b1-land` does not). Grepped it for this lane's owned files before
  starting; nothing already built and unwired was found among them.
- The ten untracked `docs/pending-commits/*.txt` files present at session
  start are leftover `-F` message sources from commits already landed
  (spot-checked `k7-1-trim-atlas-patch.txt` against `79f0bd1`'s message,
  byte-identical) — this project's normal convention, not lost or pending
  work. Left alone.
- One genuine anomaly: an uncommitted `package.json` change (an
  `allowScripts` block for esbuild/workerd) predates this session, is
  unrelated to the brief, and was not part of any commit made tonight.
  Still sitting uncommitted in the working tree — Mark's to decide what it
  was for; see Decision Queue below.

## Item 0 — done, commit `76b51d4`

Exactly the three named paths changed (`git status --porcelain` confirmed
before committing). Read the `BUILD-LOOP.md` diff in full before trusting
it: it removes the literal seed-0 hash and points at
`test/worldSeed.test.ts`'s own `PRE_SEED` constant instead, with the
reasoning written into the file. Not treating tonight's seed hash as a
guard failure, per the brief.

## Item 2 — done, commit `bac6c1b`

**Gate.** `node test/run.mjs stripSourceComments.test.ts navPad.test.ts
navWheel.test.ts isolate.test.ts movePiece.test.ts lookPipeline.test.ts
describeRequestUI.test.ts evidence-forwarding.test.ts threeIsSingle.test.ts
repoHygiene.test.ts` — 64/64 green. `npx tsc --noEmit` clean.

**What it found beyond the brief's own framing.** The brief described this
as building a control that "does not exist yet." Grounding against the
tree first found it had actually been built twice already, unshared:
`test/isolate.test.ts` and `test/movePiece.test.ts` each carried a
byte-identical, `//`-only `stripLineComments`, with `isolate.test.ts`'s own
header recording that THIS EXACT bug class defeated an unprotected check
there first. Neither copy was extracted into a shared module, neither
covered `/* */` block comments (the navPad bug's actual shape), and
neither reached navPad.test.ts before the bug recurred there days later.
Contradicting the brief's "does not exist yet" in writing, per its own
escape clause (§12) — the correct fix was extraction and generalisation,
not a fresh build.

**The mutation, watched red, in a file other than the one that found the
bug** (the brief's own closing condition for this entry). Renamed the real
`trackLiveRect(hub, ...)` call in `public/nav-wheel.js` (line 91) to
`trackLiveRectDISABLED`, left a comment reproducing the original call
syntax directly above it — the AUDIT-PROTOCOL disabling-mutation pattern,
on the real file. The protected `test/navWheel.test.ts` correctly failed.
Reverting that one assertion to raw, unstripped source against the
identical mutation produced 6/6 passing, including the exact test that
should have failed — the counterfactual proof. Both files restored and
verified byte-identical (`md5sum` on `nav-wheel.js` matched; `git diff`
empty) before committing.

**Swept into nine files**, each reviewed by hand first: navPad, navWheel,
isolate, movePiece, lookPipeline, describeRequestUI (this one guards an
XSS-relevant property, `.innerHTML` never receiving visitor-typed text —
closing the blind spot here cuts both ways), one check in
evidence-forwarding, one in threeIsSingle, and the `mutate.mjs` checks in
repoHygiene. **Deliberately excluded, named rather than silently skipped**:
publicClaims/generatedClaimsAreCurrent (computed diff messages, not
source), duplicateKeys (an analysis function's return value),
reachability's and threeIsSingle's import-scan (wrong-direction risk — a
comment there causes a false failure, not a silent false pass — the
opposite of what this entry is about), `.gitattributes` checks (immune by
construction). Full detail and reasoning is in `docs/LESSONS.md`'s now-
CLOSED entry.

**What did not work / was not attempted.** The full 1087-test suite was
not re-run tonight — memory sat at 2.47–3.99 GB through this item, against
the project's own 4 GB floor, and a full run building the real 26 km world
at module scope is documented elsewhere in this suite as OOM-risking. The
64 tests run are every test in every file this change touched, which is
the complete claim being made, not a sample of a larger untested set.
`lookPipeline.test.ts`'s `g.fragmentShader` checks (a JS string constant,
not a file read) were reviewed and left out — lower risk in practice, not
individually verified against a GLSL comment. Named, not hidden.

## Item 6 — done, commit `a349b05`

No gate in the BUILD-LOOP sense — this is a planning document, not code,
per the brief's own framing ("say what you added and why"). The value is in
what grounding found before writing: `public/buildings.js`'s `terrace()`,
`townhouse()`, `villa()`, `midrise()` already carry real procedural variety
(terrace has up to 5 bays, shopfront/stoop split, bay windows, 3 roof
forms, chimneys; townhouse has 5 distinct silhouettes) — "reads as basic"
is not a massing-geometry problem in the four dominant typologies.

**Root cause traced, not guessed.** `facade-textures.js`'s
`generateFacadeAtlas()` draws exactly one window-grid texture per
architectural character (4 total for the whole world), and
`getFacadeMaterial`'s cache — confirmed against its real caller,
`public/city-render.js:1930-1932` (read only; that file is CLI-lane-owned,
not edited) — makes 4 a mathematical ceiling, not just today's count,
because any unrecognised character string collapses to heritage
(`facade-textures.js:116`). Every building sharing a character shows the
literal same window/mullion pattern. This is the untraced cause of this
same document's own K6 verdict, "the same window grid... still dominates."

**The extended checklist** (in `docs/audits/K6-BUILDINGS.md`, new section)
is ordered by the measurements-and-priority table's own placement weights:
the shared atlas first (sits under 92.74% of placements at once), then
terrace, then townhouse, then villa/midrise (named as not fully read this
pass — time-boxed, said plainly), then everything under 3% share named as
correctly lower priority. Two smallest-first fixes are proposed for the
atlas item, both extensions of patterns already proven correct elsewhere
in the same files. Nothing implemented; nothing visually verified.

## Item 7 — bounded pass, commit `e21b112`, still UNEXPLAINED

Time-boxed hard per the brief, pure static text analysis, no browser.
Found: the original offending CSS rule no longer exists anywhere in
`public/index.html` (superseded by inline styles), so it cannot be
re-triggered without deliberately reintroducing already-superseded code —
not a good trade for this item. A full-file grep ruled out a second,
findable CSS rule anywhere in the ~5,200-line style block as the
specificity/ordering culprit the standing guess named. One corroborating
lead recorded: the wedge redesign's own CSS independently hit and fixed a
related SVG `transform-box` coordinate-space surprise on the same element
family, after the original bug and without anyone connecting the two at
the time. Not claimed as proof — the failure modes differ (wrong position
vs. no change at all) and the original code predates the SVG redesign.
Status stays UNEXPLAINED, honestly, per the brief's own instruction.

---

## Memory, throughout

Launch measurement (per brief §8): 3.0 GB free / 15.7 GB total, against
this project's 4 GB floor, both lanes running. Measured mid-item-2:
**2.47 GB free**, below even the launch figure — moved to item 2 (code-only)
immediately per the brief's own instruction rather than attempting a
browser-dependent item first. Rechecked after item 2: 3.99 GB. After items
6 and 7: **3.98 GB free**, `Get-Process` showing three `claude` processes
and four `Antigravity IDE` processes concurrently resident (206–506 MB
each) — consistent with the brief's own framing that both lanes run
tonight and share this memory pressure. Per this project's own precedent
(`docs/audits/K6-BUILDINGS.md`'s K7.1 section: "the single 4.0 GB reading —
treated as not clearing it, not as a green light"), 3.98–3.99 GB is treated
the same way here: not cleared. No process was killed, stopped, or
considered for either — `Get-Process` was read-only, per the standing rule
that lanes do not act on process lists even when a strong inference is
available.

**Consequence.** Items 1, 3, 4 and 5 all need a browser or a render and
were correctly not attempted below the floor. Every item that could be
done without one (2, 6, and a bounded pass on 7) has been. This session
does not have a mechanism to usefully wait out a memory recovery it cannot
control or predict the timing of; the honest thing is to stop here and
hand back a complete, verified record of what was done, rather than force
a memory-gated item and risk exactly the kind of corrupted-capture
incident `docs/audits/U4-NAV-WHEEL.md` already records from a previous
session's attempt to push through the same constraint.

---

## Decisions queued for Mark (per §9 — none of these blocked the work)

1. **The uncommitted `package.json` `allowScripts` change.** Question: was
   this intentional (approving postinstall scripts for `esbuild`/`workerd`
   during an `npm install`), or a stray edit that should be reverted?
   Options: keep uncommitted as-is (current state, no action), commit it
   with its own message once its purpose is confirmed, or revert it.
   Recommendation: leave it uncommitted and ask, rather than guess intent
   for a `package.json` change with no author or explanation attached —
   this file is trivially reversible either way, so the cost of waiting is
   near zero. What was done in the meantime: nothing touched it; every
   commit tonight explicitly excluded it by naming paths rather than using
   `git add -A`, per the standing rule.

---

## What is honestly still open

Items 1, 3, 4 and 5 — every item that needs a browser or a render. None
were attempted, per the brief's own memory-floor rule, held to all night
rather than relaxed once three other items were done. **What to do next,
and why**: recheck free memory first (`Get-CimInstance Win32_OperatingSystem`
→ `FreePhysicalMemory`); once it clears 4 GB for real (not a single 4.0-ish
reading, per this project's own precedent), take item 1 (U2 mobile
grounding) first — it is the item Mark has raised most often and the
brief's own "largest item" framing, and unlike 3/4/5 it is new work rather
than re-verification of something already believed correct, so it is where
an extra night is worth the most.

Item 7 stays UNEXPLAINED — an acceptable, honestly-reported outcome per the
brief's own instruction ("if it stays unexplained, it stays unexplained
honestly"), not a target to force further without a browser.

**Corrections made to the brief in writing tonight, per its own §12 escape
clause**: item 2's control existed already, in narrower unshared form,
contradicting "does not exist yet" (see Item 2 above); item 3 is
memory-gated the same as 1/4/5, not exempt from the browser floor as §5's
own grouping states (see the correction at the top of this document).
Everything else grounded
matches. This document will be updated again after the next phase closes,
win or blocked.
