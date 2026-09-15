# U4 — the navigation wheel

## UNEXPLAINED: a CSS rule that selector-matched and never painted

**Status: CLOSED, permanently UNEXPLAINED, 2026-09-09 RUN3.** Worked around,
not fixed, and no further investigation is planned — see "Closed, 2026-09-09
RUN3" at the end of this section for why closing it this way is the correct
call, not a concession.

### What was observed

The wheel's first version positioned each open segment with a CSS rule:

```css
.nav-wheel.open .nav-wheel-seg[data-nav-action="orbit"] {
  transform: translate(0px, -76px) scale(1);
}
```

with a base rule:

```css
.nav-wheel-seg {
  opacity: 0;
  transform: translate(0, 0) scale(0.4);
  transition: transform 0.16s ease, opacity 0.16s ease, ...;
}
```

After clicking the hub (via a real Playwright `page.click()`, not a synthetic
`.click()` call) and waiting 400ms — well past the 0.16s transition — a
headless Chromium instance was queried directly:

```js
root.classList.contains("open")                                    // true
hub.getAttribute("aria-expanded")                                  // "true"
seg.matches(".nav-wheel.open .nav-wheel-seg")                       // true
seg.matches('.nav-wheel.open .nav-wheel-seg[data-nav-action="orbit"]') // true
getComputedStyle(seg).opacity                                       // "0"
getComputedStyle(seg).transform                                     // "matrix(0.4, 0, 0, 0.4, 0, 0)"
```

The class was present. The selector matched, confirmed twice, once generically
and once for the exact per-attribute rule. The computed style still reported
the CLOSED state, unchanged, as if the open-state rule did not exist.

### What was checked

- The CSS text itself, re-read character by character: braces balanced,
  selectors well-formed, no stray `!important` on an unrelated rule that could
  plausibly cascade into this one.
- `element.matches()` against both the general and the attribute-specific
  open-state selector: both true, ruling out a selector-logic or DOM-structure
  mistake.
- The root element's actual `className`: confirmed literally `"nav-wheel
  open"`, ruling out a class-name typo.
- Segment count via `querySelectorAll`: exactly 1 for the tested
  `data-nav-action="orbit"`, ruling out a duplicate/shadowed element elsewhere
  in the page being measured instead.

None of these isolated a cause. The leading, unconfirmed guess is a
specificity or ordering interaction with some other, unidentified rule
elsewhere in this file's roughly 5,200 lines of inline `<style>` — but this is
a guess, not a finding, and is recorded as such.

### Time-boxed follow-up, 2026-09-09 overnight (`codex-lane`) — still UNEXPLAINED, two things added

Per the overnight brief, time-boxed hard: no browser was available (memory
below the 4 GB floor all session — see `docs/audits/OVERNIGHT-BLD-2026-09-09.md`),
so this pass was pure static text analysis of `public/index.html`, nothing
run or rendered.

**The offending rule no longer exists to re-test.** `grep` for
`.nav-wheel.open` and `nav-wheel-seg\[data-nav-action` across the whole file
found exactly one hit: a comment (around line 1557) recording the history,
not live code. The wedge redesign fully replaced the class-based open-state
rule with inline styles set from `nav-wheel.js`'s `setOpen()`, as "The
workaround" section above already says. This closes off the most direct
path to explaining the original bug — it cannot be re-triggered without
deliberately reintroducing CSS that the codebase has already, separately,
moved past, which is not a good trade for a UNEXPLAINED item explicitly
named as the least valuable place to spend a night.

**One hypothesis ruled out.** The "leading, unconfirmed guess" above was a
specificity or ordering interaction with "some other, unidentified rule
elsewhere in this file." A full-file grep for every selector touching any
`.nav-wheel*` class found exactly one declaration site each for
`.nav-wheel`, `.nav-wheel-legend`, `.nav-wheel-ring`, `.nav-wheel-seg`, and
`.nav-wheel-seg-label` — no second rule anywhere in the file's ~5,200-line
style block targets any of them. If the guess was right, the conflicting
rule was never a *second, findable* rule in this file; it would have to
have been engine-internal (a default user-agent style, or the exact
SwiftShader/headless-Chromium behaviour named as never checked below).

**One piece of corroborating (not conclusive) evidence, for the next
person.** The wedge redesign's own CSS (`public/index.html`, `.nav-wheel-seg`
rule, ~line 1520) sets `transform-box: view-box` with a comment explaining
why: "transform-box: view-box makes scale() originate from that SAME
coordinate-space point for every wedge, rather than each wedge's own
bounding box (fill-box's default, which would scale each wedge from a
DIFFERENT corner and visibly misalign them)." That is a second, independently-
discovered instance of an SVG element's CSS `transform`/`transform-origin`
resolving against a surprising coordinate space (`fill-box` instead of the
expected `view-box`) in this exact file, on this exact family of elements
(SVG wedges inside `#nav-wheel`), found and fixed *after* the original
UNEXPLAINED bug without anyone connecting the two at the time. It does not
prove the original bug had the same cause — the original rule used
`translate()`+`scale()` on what may not even have been the same element
type (the six-dot version predates the SVG wedge redesign, per this file's
own note that the section "does not describe code that no longer exists"),
and `transform-box` defaulting differently would more plausibly explain a
WRONG position than a computed style that never changes at all. Recorded as
a lead, not a finding: SVG transform coordinate-space handling is the
single most concrete, project-specific pattern now on record for whoever
next hits a CSS rule that matches but does not visibly apply on this file's
SVG elements.

**Still not run, for the same reason as before**: `document.styleSheets`
iteration in a real browser, and a real (non-headless) browser comparison —
both need a browser this session did not have memory for.

### What was NOT checked, for the next person who hits this

- Whether the same rule painted correctly in a real (non-headless, non-
  SwiftShader) browser — only Playwright/Chromium-headless was available this
  session.
- Whether `document.styleSheets` iteration (walking `cssRules` directly and
  checking `matches` against declared selectors one rule at a time) would
  surface a different, overriding rule the DOM inspector view did not.
- Whether the transition itself was somehow interfering with the *computed*
  value read (as opposed to only the rendered/animated one) — plausible in
  theory, not tested directly, and CSS transitions are not supposed to affect
  `getComputedStyle`'s reporting of the resolved end state once complete.

### The workaround

Segment position is set directly as inline style from `setOpen()` in
`public/nav-wheel.js`, computed from plain JS tables rather than a CSS
class-scoped rule (originally `OPEN_OFFSET`, six floating points; since
superseded by `WEDGES`/`wedgePath` when the segments became real pie wedges —
same principle, updated shape, noted here so this section does not describe
code that no longer exists). Inline style has no cascade to fail — what JS
sets is what `getComputedStyle` (and a screenshot) shows. This is a reasonable
design on its own terms (one fewer place for "the state is open" and "the
segment is visibly there" to disagree), not only a workaround — but the
underlying CSS cascade failure was never explained, and moving away from the
failing mechanism is not the same claim as understanding why it failed.

### Closed, 2026-09-09 RUN3 — an honest permanent UNEXPLAINED, not a third attempt

Two sessions have now investigated this and neither isolated a cause.
`docs/briefs/RUN3-BLD-2026-09-09.md` asked for exactly this: a plain,
permanent UNEXPLAINED close, with what was ruled out stated once, clearly,
rather than a third night spent on the least valuable open item this
project has.

**What is ruled out, gathered in one place:**
- A selector-logic or DOM-structure mistake — `element.matches()` confirmed
  true against both the general and the exact per-attribute selector.
- A class-name typo — the root's `className` was read directly and matched
  the expected string exactly.
- A duplicate or shadowed element being measured instead of the real one —
  `querySelectorAll` found exactly one match for the tested segment.
- Malformed CSS (unbalanced braces, a stray `!important`) — the source text
  was read character by character.
- A second, findable CSS rule elsewhere in the file's ~5,200-line style
  block targeting the same classes and winning the cascade — a full-file
  grep for every selector touching any `.nav-wheel*` class found exactly
  one declaration site each; there is no second rule to be the culprit.
- The original bug being re-testable at all — the class-based rule it
  described no longer exists in the codebase; the wedge redesign replaced
  it with inline styles before this could be re-isolated, and reintroducing
  removed, already-superseded CSS solely to chase a low-value bug is not a
  good trade.

**What is NOT ruled out, named so the boundary is honest, not implied
total:** whether the same rule painted correctly in a real, non-headless,
non-SwiftShader browser; whether `document.styleSheets` iteration would
have surfaced an engine-internal or user-agent rule the DOM inspector view
would not; whether the CSS transition itself interfered with the computed
value read. All three need a real browser session this project's memory
floor never allowed across either investigation, and none was pursued
further per this closing brief's own instruction.

**The one lead on record, restated plainly**: the wedge redesign's own
`.nav-wheel-seg` CSS independently hit and fixed a related SVG
`transform-box` coordinate-space surprise (`fill-box` vs the expected
`view-box`) on the same family of elements, after the original bug and
without anyone connecting the two at the time. Not proof — the failure
modes differ (a wrong position vs. a computed style that never changes at
all) and the original rule predates the SVG redesign — but it is the most
concrete, project-specific pattern on record if this recurs.

**This closes as CLOSED / PERMANENTLY UNEXPLAINED**, not as FIXED. The
workaround (inline styles, above) is real, load-bearing, and staying. No
further nights are planned against this specific bug; if the same class of
symptom (a selector-matched rule that never visibly applies) recurs
elsewhere in this codebase, this section — and the `transform-box` lead
specifically — is where to start, not where to stop.

---

## Outstanding, at the point this lane stopped for the night (2026-09-09)

Host memory sat at 3.3–4.2 GB through this entire session (this project's own
4 GB floor), the other lane actively generating worlds throughout. Every item
below needs a browser; none could be finished tonight. Recorded here rather
than only in conversation, so it survives to whoever picks this up.

- **CLOSED, 2026-09-11 (second autonomous run).** The wedge redesign now has
  a real screenshot with the page panels genuinely closed:
  `.shots/nav-wheel-open.png` (gitignored, reproducible -- see the command
  below), showing the full ring, all six wedge divisions and legible labels
  ("↻ Orbit", "✥ Pan", "🔍 Zoom", "🎯 Focus", "N North", "↺ Rewind"), with
  the world rendering correctly behind it and no welcome/tour panel in
  frame. Confirmed this run's own prediction was right on the first count
  and wrong on the second: `#tour-toggle-btn` alone did NOT clear the
  panels even against the real renderer (a static, no-Worker-backend page --
  see below -- so its "put the panels away" logic still lacked whatever
  state it depends on); `#welcome-close-btn` clicked directly, plus the
  same dismiss-every-✕ sweep `e2e/panelOverlap.spec.ts`'s own
  `dismissOverlays()` uses, worked cleanly with no server destabilisation
  this time. Root cause of the previous corrupted capture was never
  isolated, but the direct-dismissal path used here sidesteps it either
  way.

  Taken via a one-off standalone script (not committed -- the same
  static-file-server + direct `chromium.launch()` pattern
  `scripts/shoot.mjs` already uses, deliberately avoiding `wrangler dev`
  entirely): serves `public/` directly, no Worker backend, so
  `/pipeline-budget`, `/live-status` etc. 404 harmlessly (caught in the
  page's own code) and the `datum.markfrasertoronto.workers.dev` embed hits
  its own CSP frame-ancestors block (expected, unrelated to this feature).
  Neither affects the nav wheel, which is pure client-side DOM/CSS.

  `getComputedStyle`-level debug taken alongside the shot: after the click,
  `#nav-wheel-hub`'s `aria-expanded` is `"true"`, `.nav-wheel`'s classList
  is `["nav-wheel", "open"]`, `.nav-wheel-seg` count is 6 -- the wheel's own
  state is genuinely open, not just visually coincidental.

- **STILL OPEN, blocked this run by a real infrastructure fault, not
  memory.** U1's live-position fix (`434c0fb`) has still not been
  re-watched in `e2e/panelOverlap.spec.ts`. Attempted twice this run:
  first, a combined run (this file's own spec plus the new
  `worldCanvasTouchAction.spec.ts`) was terminated by the harness itself
  (background-task duration, not memory -- host free memory read 6.05 GB
  at the time); the orphaned child processes it left showed zero CPU
  movement over an 8 s sample and were left alone per the standing "lanes
  do not kill processes" rule. Second, a clean re-run of
  `panelOverlap.spec.ts` alone hit a real `wrangler dev` crash
  mid-suite (`wrangler-2026-09-11_23-05-37_005.log`) -- the exact
  "Network connection lost" instability `playwright.config.ts`'s own
  comments already document. `wrangler dev --port 8787` has had no active
  listener since (checked directly via `Get-NetTCPConnection`, twice, a
  few minutes apart) despite process entries still showing in
  `Win32_Process` with periodic inspector-heartbeat log activity but zero
  measured CPU -- a genuinely stuck state, not a slow one. Not cleared this
  run; named with PIDs in this run's own handover rather than killed.
- **U2 (mobile grounding) has not been started.** The brief's own framing —
  "the largest item" — is still fully open: world-fills-screen, landscape,
  the prompt box findable, touch gestures. The `touch-action` gap on
  `#world-canvas` named here is CLOSED, 2026-09-11 -- see this same run's
  handover: it was never a real runtime defect (the 3D canvas has always
  set it inline via JS), and a real-viewport regression gate
  (`e2e/worldCanvasTouchAction.spec.ts`) now exists for both canvases.
- **U2 (mobile grounding) has not been started.** The brief's own framing —
  "the largest item" — is still fully open: world-fills-screen, landscape,
  the prompt box findable, touch gestures (including the `touch-action` gap
  on `#world-canvas` found and reported, never fixed this session).
- **Bug 2 (the CSS rule that selector-matched and never painted) is CLOSED,
  permanently UNEXPLAINED, 2026-09-09 RUN3** — see "Closed, 2026-09-09
  RUN3" above for the full accounting of what was ruled out across two
  sessions. Not fixed; not going to be investigated further. Worked around
  (inline styles) and staying that way.
- **`docs/LESSONS.md`'s "a regex over source matches your comments too"
  entry is now CLOSED, 2026-09-09 overnight** (`bac6c1b`) — a shared
  `test/stripSourceComments.ts` helper, swept into nine files, watched red
  for real against a mutation of `public/nav-wheel.js` (a file other than
  the one that found the bug), per the entry's own closing condition.
