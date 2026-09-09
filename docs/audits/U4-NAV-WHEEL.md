# U4 — the navigation wheel

## UNEXPLAINED: a CSS rule that selector-matched and never painted

**Status: UNEXPLAINED. Worked around, not fixed. If this recurs elsewhere, this
note is what makes it findable.**

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

---

## Outstanding, at the point this lane stopped for the night (2026-09-09)

Host memory sat at 3.3–4.2 GB through this entire session (this project's own
4 GB floor), the other lane actively generating worlds throughout. Every item
below needs a browser; none could be finished tonight. Recorded here rather
than only in conversation, so it survives to whoever picks this up.

- **The wedge redesign has never been screenshotted with the page panels
  closed.** The one confirmed-good render (visible ring, wedge divisions,
  legible labels — "↻ Orbit", "✥ Pan", "🔍 Zoom", "🎯 Focus", "N North",
  "Rewind") was seen directly against a page with the "How it works" welcome
  content still open behind it, opaque and legible on its own but not the
  clean comparison frame Mark asked for. `#tour-toggle-btn` alone did not
  clear the panels in the stubbed-`window.renderer3d` environment this
  session used to work around the local dev server's unrelated 500/CSP
  failure (a real `datum.markfrasertoronto.workers.dev` embed issue, not
  this feature) — its "put the panels away" logic likely depends on real
  world/renderer state the stub never provided. A broader dismiss-every-✕
  fallback was tried once and destabilized an already-strained server,
  overwriting the one good capture with a corrupted one (empty segment
  labels) before a clean version could be re-taken. Next attempt: on a
  clear machine, try `#tour-toggle-btn` against the REAL renderer (no stub
  needed if memory allows a full load) before falling back to individual
  dismissal.
- **U1's live-position fix (`434c0fb`) has not been re-watched in
  `e2e/panelOverlap.spec.ts`.** That suite's "the nav pad stays visible when
  the inspector opens, and does not overlap it" test gave the ORIGINAL U1
  fix its red-then-green proof; this session's follow-up (positioning off
  the pad's live rect instead of a corner assumption) has only structural
  and mutation-test verification, not a browser re-confirmation.
- **U2 (mobile grounding) has not been started.** The brief's own framing —
  "the largest item" — is still fully open: world-fills-screen, landscape,
  the prompt box findable, touch gestures (including the `touch-action` gap
  on `#world-canvas` found and reported, never fixed this session).
- **Bug 2 (the CSS rule that selector-matched and never painted) stays
  UNEXPLAINED**, per the section above — worked around by moving to inline
  styles, cause never isolated. Nothing new to add tonight.
- **`docs/LESSONS.md`'s "a regex over source matches your comments too"
  entry stays OPEN** — the one instance (`test/navPad.test.ts`) is fixed,
  the general control (a comment-stripping helper for this suite's raw-
  source `assert.match` checks) does not exist yet.
