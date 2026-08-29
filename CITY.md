# Scale the world up, light it properly, stop coaching the visitor

Three tasks. **Zero API spend** — all of this is deterministic sim, renderer and copy work. If you
believe a paid call is needed, stop and report before making it.

Work in order. Commit each separately. Verify by running, not by reading.

---

## 0 — One defect first, because it hit Mark on the live site

The live page showed: **"STOPPED — Connection to the pipeline stream was lost."**

Find out why the SSE/stream connection drops. Likely candidates: no keep-alive on a long-idle
stream, a Worker request lifetime limit, or the client not reconnecting after a transient drop.

Whatever the cause, the fix has two parts:

1. **Keep the stream alive** — periodic heartbeat, and client-side reconnect that resumes the run
   rather than abandoning it. A run parked at a gate can idle for minutes; that is the normal case,
   not the exception.
2. **Never lose a run to a lost stream.** Run state is already persisted. If the stream drops, the
   client should reconnect and re-attach to the run in progress. A dropped pipe is a display
   problem, not a run-ending one, and right now it reads as the app failing.

A visitor who spent real cents and then saw "connection lost" has watched the app fail at the one
thing it claims to be good at: reporting honestly what is happening.

---

## 1 — The world becomes a neighbourhood, not a room

Mark's direction, and the reasoning behind it matters more than the instruction:

> "we are not doing the sims, let's do sim city — we want to build a world, not just a room that
> we are stuck in"

**Why this is right.** A single room makes almost every request a visitor thinks of impossible,
because nearly everything needs a second location. So refusal became the default answer, and a
system that mostly says no reads as broken rather than principled. A larger world inverts that: a
wide space of requests that genuinely succeed, with the honest limits sitting where they actually
are. **Earned refusals are the point. Frequent refusals are the failure.**

### Extend outward. Do not rewrite inward.

This is the hard constraint and the thing most likely to go wrong.

**The existing sim is the verification backbone. It stays.** `tick`, `chooseAction`, `applyAction`,
the needs model and the nine hand-authored regression checks in `simRegression.ts` are what make
every claim on the page true. They must still pass **9/9, unchanged**, when you are done. Do not
edit a regression check to accommodate the new world. If one genuinely cannot survive the change,
stop and report rather than editing it — that is a design conversation, not a fix.

The way to get there: **the current room becomes one building in a larger world.** The interior
logic that exists today keeps running exactly as it does now; what changes is that there is now an
outside, and more than one of them.

### What the world becomes

- **A plot of ground with several buildings on it**, laid out on a grid. The existing room is one
  of them. Others can be simple to start — a shop, a workshop, a second dwelling.
- **Ground between them**: paths or roads, and open space. Somewhere for things to be added that
  is not inside a room.
- **More than one person**, moving between buildings and between the objects inside them. The
  existing per-person action logic drives each of them.
- **Objects can live outdoors** — a bench, a tree, a lamp post, a planter. This is what makes
  "add something to the world" a request with a large, honest space of valid answers.

Keep it a **neighbourhood, not a metropolis.** A handful of buildings that read as a place, not a
procedurally generated city. Enough that a visitor sees somewhere they could add to; small enough
that the whole thing is legible in one composed shot.

### The pipeline must see the new world honestly

`worldStructure.ts` is code-derived and must stay code-derived — regenerate it from the new code so
grounding reads what actually exists: building types, object types placed indoors and out, how many
people, what `tick` touches, what the renderer knows how to draw. **No hand-written list of what is
possible.** The grounding stage's credibility rests entirely on it reading the real source.

### The limits change, so the copy about limits must change

"There is only one room" stops being true and must stop being said. The real remaining walls, from
the actual code and budget:

- Anything needing **art assets or textures** that do not exist — there is no asset pipeline.
- Anything needing **sound**.
- A **new simulation subsystem** — weather, economy, traffic logic — is more than one run's budget
  can implement and verify.
- Anything needing **state shared between visitors in real time**.

State these from what the code and the budget actually impose. Do not invent a limit to have
something to refuse, and do not keep an old one that no longer holds.

---

## 2 — The look-dev pass

The scene reads flat and pale. One directional light plus a hemisphere is doing all the work, so
there is almost no range between what is lit and what is not, and nothing in the frame is genuinely
bright. **Contrast is the fix, not more geometry.**

- **Real point lights, warm, with distance falloff** — one per lamp, window and street light. Cap
  the number that cast shadows for performance and let the rest contribute light only.
- **Emissive materials on the light sources themselves**, so a lamp reads as a bright object rather
  than only as a pool on the floor.
- **The sun as a directional light with a shadow camera fitted tightly to the visible plot** —
  angle, colour temperature and shadow length driven by the world clock. At night the point lights
  carry the scene and the sun is gone. Day and night should look genuinely different.
- **Deepen the ground and wall values.** Everything currently sits in the top third of the range,
  which is why it looks washed out. Bring the base values down and let the lights create the
  brightness.
- **Environment lighting** — `RoomEnvironment` or an equivalent generated environment map, so
  surfaces have something to reflect and stop reading as flat-shaded plastic.
- **ACES Filmic tone mapping, correct colour space, exposure tuned per time of day.**
- **Contact shadows / ambient occlusion** where objects meet the ground. Cheap, and it is what
  makes objects sit in the scene rather than float above it.
- **Material variety** — vary roughness across surfaces. Matte plaster, softer fabric, a little
  specular on wood, restrained metalness on fittings. Uniform roughness is a large part of why it
  reads as programmer art.
- **Restrained bloom, on emissives only**, and a gentle vignette. Overdone bloom looks worse than
  none.
- **Camera**: a composed three-quarter view of the whole neighbourhood, orbitable within a small
  arc. Not a free camera.

Palette stays in the family: warm paper, ink, the accent, warm woods and muted greens.

**Performance:** 60fps on integrated graphics, pixel ratio capped at 2. `prefers-reduced-motion`
gets a good static render. No WebGL means a good static image, not a broken canvas.

**Verify by looking.** Screenshot the scene at midday and at night in a real browser and compare
them. If the two do not look meaningfully different, the lighting is not done.

---

## 3 — Stop coaching the request

The four-column panel above the world currently includes **"TRY ONE OF THESE"** with three worked
examples. Mark's note:

> "I don't want 'try these' — it makes it seem like it is pre-designed for that input. An e.g. is
> fine but not so blatant guiding of the prompt."

He is right, and it undercuts the whole argument. A page that hands the visitor three approved
requests looks like a system that can only do three things.

- **Delete the "try one of these" column.**
- **One quiet example lives in the input placeholder**, and nowhere else.
- Keep a short line on what the world is and what is in it — that is orientation, and it is needed.
- Keep the honest limits, rewritten for the new world, but as **one plain sentence**, not as the
  mirror half of an instruction panel.

The panel should tell a visitor **where they are**, not **what to type**. With a neighbourhood
instead of a room, most of what they think of will now work — which is the real answer to the
problem the examples were papering over.

---

## 4 — Deploy and verify

`wrangler deploy`. Then, against the deployed URL:

- The world renders as a neighbourhood, animates, holds 60fps.
- Screenshots at day and night proving the lighting genuinely changes.
- Regression suite still **9/9**, unedited.
- Full test suite still passing.
- No console errors.
- Narrow viewport (375px) verified visually, not by CSS audit.
- No "try one of these", no model names, no internal identifiers in any served asset.
- The stream survives a run parked at a gate for several minutes, and reconnects if dropped.

Paste the raw output.

---

## How to work

Ground before acting — read the current source before each task. One task at a time, committed
separately. Never stall: park a blocked task with a note and move on. Fail closed. Never
bulk-delete; move aside to a review folder.

**A weak version of a capability is worse than no version.** If the neighbourhood cannot be made to
look genuinely better than the room does now, say so and keep the room rather than shipping
something in between.

Report what you changed, what you verified and how, and anything in this brief that turned out
wrong once you were in the code.
