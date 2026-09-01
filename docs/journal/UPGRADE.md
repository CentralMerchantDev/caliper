# Upgrade: real 3D world, stronger copy, better UI

The app works. This makes it good enough to send.

**Zero API spend.** Every task here is deterministic front-end work. The one paid step — the live
proof run — is Mark's, in his browser, not yours.

---

## 0 — Two small config changes first

- **`DAILY_LIVE_RUNS_PER_IP: 3`** (from 2). A permanent config change, not a temporary carve-out.
  Note in the comment that it can go higher once the routing change brings a run under $0.05.
- Confirm the routing change is applied and deployed: Haiku grounds/implements/retrospects, Sonnet
  plans/fixes, `gpt-5.3-codex` reviews, **no Opus on any path**, per-run ceiling ~$0.15.

---

## 1 — The world in real 3D

The current 2D canvas plan view reads flat and dated. Rebuild the renderer in **three.js** —
already a known quantity here, DATUM uses it.

**Target: stylised 3D with excellent lighting.** Not photorealism, which isn't achievable in a
browser demo without an asset pipeline — but clean forms lit properly read as *premium*, and that
is the actual goal. Think a well-lit architectural model, or a modern game's build mode: simple
geometry, beautiful light.

**The techniques that do the work** — most of the quality comes from lighting and material, not
from geometry complexity:

- **Rounded geometry, never hard cubes.** Rounded box geometry with a small bevel is the single
  biggest difference between "premium" and "programmer art."
- **PBR materials** (`MeshStandardMaterial`) with considered roughness and metalness per surface —
  matte plaster, soft fabric, warm wood, brushed metal.
- **Soft shadows** — `PCFSoftShadowMap`, generous shadow-map resolution, and a shadow camera fitted
  tightly to the scene so the resolution isn't wasted.
- **An environment map** for reflections and ambient light, even a simple gradient one. This is what
  stops surfaces looking like flat-shaded plastic.
- **ACES Filmic tone mapping** and correct colour space. Without these, everything looks washed out.
- **Ambient occlusion** — contact shadows where objects meet the floor. Cheap, enormous payoff.
- **Subtle post-processing**: a little bloom, a gentle vignette. Restraint — overdone bloom reads
  amateur.
- **Camera**: a fixed three-quarter view, slight perspective, orbitable within a small arc. Not a
  free camera; a composed shot.
- **Time of day drives the lighting** — sun angle, colour temperature and shadow length shifting
  with the world clock. This alone makes it feel alive.

**Palette** stays in the family: warm paper, ink, the accent. Materials in that range — warm woods,
soft off-whites, muted greens — not saturated primaries.

**Characters** as simple, well-proportioned figures with real animation. Interpolated movement
between ticks, as before, so they walk rather than teleport.

**Do not change the simulation logic.** The renderer is swapped; `tick`, `chooseAction`,
`applyAction` and the regression suite stay untouched. That protects the verification story, and
the regression suite must still pass 9/9 after this.

**Performance:** 60fps on a laptop integrated GPU. Cap the pixel ratio at 2. `prefers-reduced-motion`
gets a static, well-lit render rather than nothing.

**Fallback:** if WebGL is unavailable, show a good static image of the scene rather than a broken
canvas.

---

## 2 — The copy

Mark's assessment: weak, dry, and less informative than it should be. He's right — a lot of it was
written defensively.

**Rewrite it confident and specific.** The rules:

- **Lead with what it does**, not with what it can't. State the capability, then the limit once,
  plainly, and move on. The current copy hedges repeatedly and that reads as apology.
- **Be specific.** "A different model from a different vendor reviews the code before you see it"
  beats "cross-model review." Numbers and mechanisms beat abstractions.
- **Say more, not less.** Where a visitor would reasonably ask "how?" — answer it. The current copy
  assumes knowledge the reader doesn't have, then over-explains the things they don't care about.
- **No em-dash-heavy, balanced-clause rhythm.** Plain declarative sentences.
- **Never brag, never apologise.** State what happens and let it land.

The strongest thing on the page is the thesis — a system that only says yes when yes is true.
Everything else should build toward that. Say what a refusal actually means and why it's harder to
build than a system that always agrees.

Spell-check every word. Read each sentence aloud before keeping it.

---

## 3 — UI and UX

- **The world is the hero.** Large, central, immediately alive. Everything else arranges around it.
- **The request box** should invite a real request — a placeholder with a genuine example, and one
  line of framing that this is a shared world.
- **The pipeline stages** should feel like something happening: each stage entering with intent,
  the current one clearly active, completed ones settled. No layout shift once anything is on
  screen.
- **Gate 1 needs weight.** It is the centre of the app. The proposal, the criteria, what it will not
  touch, what it can't do and why — laid out so a visitor reads it rather than clicks past it.
  Approve, reject and reply are three real choices, presented as such.
- **The ledger** should be readable at a glance: what was caught, by which stage, what it cost.
- **Empty and waiting states** matter — a run halted at a gate should look deliberate, not stalled.

Keep every accessibility fix: `--muted:#6E5E49`, `--line-strong` on control borders,
`:focus-visible` on `--accent`. WCAG AA verified by computing ratios. Works at 375px — and this
time verify it with an actual narrow viewport, not a CSS audit.

---

## 4 — Deploy and verify

`wrangler deploy`. Then against the deployed URL:

- The world renders in 3D, animates, and holds 60fps.
- Screenshots at two moments proving movement and lighting change.
- No console errors.
- Regression suite still 9/9.
- Narrow viewport verified visually.
- No internal identifiers in any served asset.

Paste the raw output. Report what you'd still improve if you had another pass.

---

## How to work

One task at a time, committed separately. Verify by running, not reading. Never stall — park and
move on. **A weak version of a capability is worse than no version**: if the 3D can't be made to
look genuinely good, say so and keep the 2D rather than shipping something in between.
