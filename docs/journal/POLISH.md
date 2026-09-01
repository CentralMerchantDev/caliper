# Final pass

Mark is sending this to employers. Everything here is deterministic — **zero API spend.** If you
believe a paid call is needed, stop and report first. Do not consume or advance his parked runs.

Order matters. Structure first, materials second, **copy last** so nothing is written twice.

**If you run short, items 1, 2 and 4 are the ones that must land.**

---

## 1 — A run history, in a tab. Real runs only, kept vague.

The page claims a system that only says yes when yes is true, and shows exactly one recorded run,
which said yes. The most distinctive claim on the page has no evidence behind it.

**Do not manufacture a refusal or stage a failure.** Mark was explicit and he is right — the only
thing this page has going for it is that nothing on it is staged.

Instead: **log every real run and show that history in its own tab**, not on the main display.

- One row per run: the date, what was asked for, and how it ended — shipped, refused, halted at a
  gate, or abandoned. A one-line reason for the outcome.
- **Never display raw visitor-typed text.** This is a public page carrying a stranger's keyboard
  input; one crude submission would sit permanently on Mark's job-application artifact. Show the
  system's own summarised account of what was requested, generated at grounding time, not the
  original string. If no summary exists for a historical run, show the outcome alone.
- **Keep it vague on method.** Outcomes and reasons, not transcripts, not prompts, not stage
  internals. Mark's standing position: do not give away how it works, only what it does.
- Backfill from the runs already in KV so the tab is not empty on day one.
- The tab is secondary. It does not compete with the world or the recorded run for attention.

Over time this becomes the honest version of the evidence — refusals included — without anything
being arranged.

---

## 2 — Mobile, done properly

Not "no horizontal overflow." A hiring manager opens this link on a phone between meetings, and
right now the phone version is the weak one.

Work at 375px and 390px, on a real narrow viewport, and judge it visually:

- **The world is legible and worth looking at** — correctly scaled, not a letterboxed strip.
- **The action bar is reachable and does not cover content**, and the run log is readable beneath
  it rather than sliding under it.
- **The stage output is readable on a narrow column** — no cramped multi-column remnants, no text
  running under a sticky element, sensible line lengths.
- **The nav does not consume a third of the first screen.** It currently wraps to two rows and
  takes a large share of the viewport before anything of substance appears.
- **Tap targets at least 44px.** The 3D/Plan toggle, the bar controls, the history tab.
- **Test the real journey on a phone-sized viewport**: land, watch the recording, open the history
  tab, switch views. If any step is awkward, fix it.

---

## 3 — Fix the first screen

A stranger gives this fifteen seconds. Currently they get a headline, a paragraph, and an
orientation panel before anything moves — the world and the recorded run, the two strongest
assets, are below the fold.

Restructure so **something alive and evidently real is visible in the first screenful**, on desktop
and on mobile. The world running, or the recording beginning, with enough framing to know what is
being looked at. The explanatory copy moves below it.

Do not add an animation or a splash to achieve this. The world is already alive; put it where it
can be seen.

---

## 4 — Close the page

Someone reaches the bottom impressed and there is no next step. The page never says what Mark is
looking for or how to reach him. This is a job-application artifact and it currently has no ask.

Add a short, confident close:

- What he is looking for — **applied-AI roles**. Plainly, once, not needy and not a plea.
- **How to reach him: mark@fhinc.ca.**
- Links to the résumé, the portfolio and DATUM, as the rest of the picture.

One short block. No call-to-action language, no "let's connect." State it and stop.

---

## 5 — Materials and surfaces. Textures yes, models no.

A bounded materials pass, and a hard line on scope.

**Do:**

- **CC0 textures from Poly Haven** (`polyhaven.com`) — wood for floors, plaster for walls, ground
  and path surfaces. Vendored small, licence and checksum recorded as you did for the HDRI.
- Correct colour space and sensible tiling. Normal and roughness maps where they earn their weight;
  albedo alone on anything that does not.
- **Material definition per object type**, driven from the registry so a new type still gets a
  sensible default with no renderer change.
- **Fill the shop and the workshop.** They are empty rooms and it reads as unfinished. A counter, a
  workbench — placements, which is now just data.

**Do not:**

- **No GLTF model packs.** Not Kenney, not Quaternius, not any asset library. Two reasons, neither
  about time: the page's stated limits include having no art asset pipeline, and those limits are
  what its refusals rest on — importing models makes a claim on the page untrue. And it breaks the
  registry's primitive-recipe model, which is exactly what makes "add a new object type" cheap and
  verifiable. That trade is not worth better props.

Keep 60fps on integrated graphics, pixel ratio capped at 2, total texture payload modest — this
loads on a phone. **Screenshot before and after and judge honestly.** If it is not clearly better,
keep what is there and say so.

---

## 6 — The copy. Professional pass, and this goes last.

Every word on the served page. Mark's own assessment of an earlier version, and the failure mode to
write against:

> "it all sounds a little fake and, no offence, written by AI"

**Rules:**

- **Plain declarative sentences.** No em-dash-balanced clauses, no triads, no "not X, but Y", no
  rhetorical questions. Those patterns are the tell.
- **Lead with what it does.** State a limit once, plainly, and move on. Repeated hedging reads as
  apology.
- **Specific beats abstract.** A concrete mechanism or number beats a category noun every time.
- **Never brag, never apologise.** State what happens and let it stand.
- **Cut anything that does not earn its place.** If a sentence could be deleted without loss,
  delete it.
- **The orientation and rules copy in particular** — a stranger who has never seen this must
  understand what they are looking at and what they can do, in a few lines, without being coached
  toward a specific request.
- **Spell-check every word.** Real words, correct meaning, verified. This is a standing rule and it
  is not optional on a page going to employers.

**Read every sentence aloud before keeping it.** If it sounds like a brochure or like a model wrote
it, rewrite it.

Check every quantitative claim on the page against what has actually been measured. **One completed
run means no rate can be published.** If any number rests on a sample too small to support it,
remove it or state the sample size. A stranger who catches one shaky number discards everything
else on the page, and honesty is the only thing this page really has.

---

## 7 — Deploy and verify

`wrangler deploy`. Then against the deployed URL:

- The history tab, populated from real runs, with no raw visitor text displayed.
- Screenshots at 375px of: landing, the recording playing, the history tab, both world views.
- Something alive visible in the first screenful, desktop and mobile, screenshotted.
- The closing block present with the correct email.
- Before and after screenshots of the materials pass.
- Regression 9/9 unedited. Full suite passing. No console errors.
- No model names, no internal identifiers, on any served asset.
- Texture and HDRI licences recorded.
- Mark's parked runs untouched.

Paste the raw output, and say what you would still change.
