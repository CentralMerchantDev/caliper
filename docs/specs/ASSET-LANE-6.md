# CALIPER — ASSET LIBRARY LANE, BRIEF 6

Brief 5 landed and it checks out. Measured in your working copy, not read from
your summary: `asset-registry.js` declares 110 items — 23 built, 77 generator
variants, 10 planned gaps — all five generator families export, all twelve civic
typologies are present, and `scripts/shoot-kit.mjs` captured eleven plates. The
registry with gaps in it was the right call and it is the thing that makes "how
far along are we" answerable.

Now the part that matters more than any of it.

## 1. MARK OPENED THE LIBRARY AND COULD NOT SEE A SINGLE MODEL

His words: *"looked at the new models. I agree with you. None of them are real.
I can't see any of them."*

The page loads with no errors. The models are in the scene. It is not broken.
It is **unusable**, which from a visitor's side is worse, because nothing tells
you anything is wrong.

What a render of it actually shows: a field of small objects scattered across a
huge near-black plane, marching away from a default camera into the distance,
lit almost not at all. Most items are dark grey slabs a few pixels across. The
inspector works and shows real numbers. The data is fine. The PRESENTATION makes
110 items invisible.

**And your own report said the opposite.** Brief 5 asked you to look at the
plates and write down, per category, whether each reads at street distance. What
came back was favourable across the board — roof clutter "provides crisp
silhouette breaks", vegetation shows "clear silhouette separation", vehicles are
"instantly recognizable". Mark looked at the same page and could not find a
model. Both of you cannot be right.

This is the self-audit problem again, in its most expensive form: you judged
your own work by looking at it, and looking is exactly what the layout prevents.
When a visual check comes back all-positive, that is the moment to distrust it.

## 2. A CONTACT SHEET IS THE WRONG SHAPE. BUILD A LIBRARY.

Mark, and this is the real ask:

> *"We should have a visual library, for us but also for the user, so they can
> pick and choose and see the different model types that exist. It makes it much
> easier to work with. That also gives them a basis where if they want to use
> their runs to change a model, they can pick the model they're going to change,
> so they can create a new model in their run."*

That last sentence is the strongest idea in this project in a while, and it is
why this is worth doing properly. Picking a model turns *"add a lamp post near
the workshop"* into *"modify THIS model"* — a concrete, addressable, verifiable
target instead of a sentence someone has to interpret. It is the same argument
the whole pipeline rests on.

So: not one scene containing everything. **A grid of cards, one item each.**

- Each card renders ITS OWN item, framed to that item's bounding box, so a
  manhole cover and a cathedral both fill their card. Framing per item is the
  single change that fixes the invisibility.
- Neutral studio light on a light background. Three-quarter view, consistent
  angle and key light across every card, so differences between models are
  differences between MODELS.
- Render lazily — an IntersectionObserver and one shared renderer drawing into
  each card, not 110 live WebGL contexts. Browsers cap those around 16 and
  silently drop the oldest.
- Card face: the thumbnail, the id, the category, and the status. Nothing else.
  Detail belongs in the inspector when a card is opened.
- Planned gaps stay as cards, visibly empty. You already do this and it is
  right — a library that only shows what exists cannot show what is missing.
- Filter by category, status and source; and a text search, because 110 items is
  past the point where scanning works.

Keep `kit-contact-sheet.html` as the developer tool it is. Build the library as
its own page, `public/model-library.html`. One page cannot be both a diagnostic
dump and a browsing surface, and trying to make it both is how it ended up being
neither.

## 3. THE HOOK, BUT NOT THE WIRING

Each card carries a stable `data-model-id`, and opening one exposes a single
clearly-labelled action — "Use as target" or similar — which **dispatches a DOM
CustomEvent** with the model id and nothing else:

```js
document.dispatchEvent(new CustomEvent("caliper:model-target", {
  detail: { id, category, source }, bubbles: true,
}));
```

Emit the event and stop. Do **not** touch the pipeline, the build panel, the run
history or anything under `src/`. The world lane consumes that event; if you
wire both ends, the two lanes collide in exactly the file they collided in
before.

## 4. THEN JUDGE THE MODELS, PROPERLY THIS TIME

Once cards are framed and lit, re-shoot the plates and go through them again —
and this round, write down what is WRONG. A category where you can find nothing
to criticise is a category you have not looked at hard enough. Name the three
worst-reading items in each category and say what is wrong with each.

That list is what brief 7 works from.

## HOW WORK IS ACCEPTED — unchanged

`npm test` green and `npx tsc --noEmit` clean before every commit. A green suite
is not evidence a control works; mutate one control at a time, confirm each
mutation landed before reading its result, and record any that survive. Nothing
is deleted — move it to `_TO-DELETE/<reason>/`. Commit to `assets-lane`; never
merge to main yourself.

Report what you MEASURED and what you did not get to.
