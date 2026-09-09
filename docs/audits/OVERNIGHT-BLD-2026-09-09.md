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
[ ] Item 1  U2 — mobile grounding (largest item, not started)
[ ] Item 3  K7.1 — visual re-shoot (needs browser/render, memory-gated)
[ ] Item 4  Wedge-wheel screenshot, panels closed (needs browser)
[ ] Item 5  U1 live-position re-watch in e2e/panelOverlap.spec.ts (needs browser)
[ ] Item 6  Buildings checklist extension from K6-BUILDINGS.md
[ ] Item 7  Bug 2 (CSS cascade, UNEXPLAINED) — time-boxed, likely last
```

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

---

## Memory, throughout

Launch measurement (per brief §8): 3.0 GB free / 15.7 GB total, against
this project's 4 GB floor, both lanes running. Measured again mid-item-2:
**2.47 GB free**, below even the launch figure — moved to item 2 (code-only)
immediately per the brief's own instruction rather than attempting a
browser-dependent item first. Rechecked after item 2's work: **3.99 GB
free**. Still below the 4 GB floor; the full suite and any render/browser
item continue to wait. No process was killed or considered for killing.

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

Everything the checklist above marks `[ ]`. Items 1, 4 and 5 need a
browser; item 3 needs a render; both are memory-gated tonight and will be
attempted as memory allows, per brief §8's ordering (code-only first).
Item 6 (buildings checklist) is code/doc-only and is next if memory stays
tight. Item 7 (the CSS cascade bug) is explicitly time-boxed last, per the
brief, and may stay UNEXPLAINED again tonight — that is an acceptable,
honestly-reported outcome per the brief's own instruction, not a target to
force.

Nothing in the brief has been found wrong yet beyond what item 2's own
section states in writing above (the control existed in narrower, unshared
form, contradicting "does not exist yet") — everything else grounded
matches. This document will be updated again after the next phase closes,
win or blocked.
