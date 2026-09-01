# Reframe: it's a showcase of a person, not documentation of a system

**Zero API spend except item 1**, which is a bug investigation and may need one cheap call — state
the cost before making it.

The app works. This fixes what it says, who it's for, and what a visitor is actually meant to do.

---

## 1 — A run is stuck at cross-model review. Find out why.

Mark's live run has been sitting at the review stage. Investigate: is the OpenAI call hanging, did
it fail without the failure being surfaced, or is the UI not updating when the stage completes?

**A stage that appears stuck with no explanation is the worst possible failure for this app** — the
whole argument is that it reports honestly what is happening. Add a visible timeout and a clear
message: what stage, how long, what happens next.

Check the stored run state first; that costs nothing. Only make a call if you must, and say what it
will cost first.

**Mark reports the review stage is STILL running on the live site.** So this is reproducible, not a
one-off. Treat it as a real defect.

**And add rotating status text while a stage is working.** Not a spinner, not dots — short lines
that change every few seconds so a visitor knows something is genuinely happening: *still
noodling · still pontificating · still turning it over · still weighing it up.* Light, a little
wry, never cute enough to undercut the work. Each stage can have its own set. This is the
difference between "thinking" and "hung," and right now a slow stage is indistinguishable from a
broken one.

---

## 2 — Tell the visitor what they're doing. This is the biggest usability failure.

There are no rules shown, no sense of what exists, and no coordinates or positions to build
against — so a visitor is far more likely to ask for something impossible than something possible.
**Rules only work if you know them before you start.**

Add a short "what you can do here" block above or beside the world. A few lines, not an essay:

- What the goal is: **help build this world** — add something to it.
- What's already there: the rooms, the objects, the people. Brief, factual.
- What kind of request works: add an object, add a room, add something people can use or interact
  with.
- What won't: anything needing art assets, sound, or a system that doesn't exist yet.

Below the world, one line on the goal. Not a tutorial — orientation.

---

## 3 — The world is about building, not money

The underlying sim is still a life-sim: needs, money, wages. So grounding describes everything in
money terms, and a request to add a room comes back framed as an economic question. That is a
leftover from what this used to be.

The people can still live in the world — that's what makes it alive. But **money is not the point
and should not be the frame.** Remove it from the visible goal, from the orientation copy, and from
how the grounding stage describes what a change means. What matters is: does the world support
this, what does it touch, will it break what's already there.

---

## 4 — Stop naming models

Remove every model name from the visitor-facing page. They date the artifact the moment a new
model ships, invite an argument about model choice, and mean nothing to the reader.

Describe the **roles** instead, which is what actually matters:

- "The code is reviewed by a model from a different vendor before you see it."
- "Each stage runs on the model suited to that stage."

Keep it honest — do not invent names or use placeholder gibberish. State the role, not the SKU.
The cross-vendor fact is the substance; which vendor is trivia.

---

## 5 — Cut the word "cheap" and the thrift framing

"Cheap" reads as corner-cutting. The skill on display is **routing each stage to the model that
fits it, and knowing what that costs** — that's engineering judgement, not economising.

Rewrite the routing and control sections in that register. Cost control stays — it is real and it
is good — but as evidence of someone who has run a system in production, not as a boast about
spending little. Lead with the routing decision; cost is the consequence, not the headline.

---

## 6 — The biggest change: this is a showcase of a person

Right now the page documents a system. Its actual audience is hiring managers, and its actual job
is to make the case for Mark. There is nothing on it that says who built this or why.

**Weave him through it. Do not add a bio section.**

Mark's instruction, and it is the better one: no separated "About me" block, no long passages about
himself. The person should appear *inside* the system, subtly, where it is relevant — so a reader
absorbs who built this while they are learning what it does, rather than being asked to switch
from one to the other.

Concretely: **short first-person notes at the points where a decision was made.** Not captions —
the reasoning of the person who chose it, in his voice, one or two sentences, placed exactly where
the thing they explain is happening.

- Beside the gate: why two human gates exist in his production process, and why "material versus
  nit" is a judgment he does not automate.
- Beside a refusal: why he wanted a system that can say no, and what it cost to build one that can.
- Beside the verification: why he does not accept a model's own account of its work.
- Beside the controls: what running a system on a real budget taught him.

That is the blend — the system explains itself, and the person shows up in *why it is built that
way.* Far more convincing than a paragraph claiming the same qualities.

Then, small and near the top: one line of who he is, and links to the résumé, the portfolio and
DATUM as the rest of the picture. That is all the direct self-description the page needs.

Source material for his voice and the facts: the résumés in Downloads, the portfolio site, and the
build documents in this repo. Use his actual phrasing where you find it. Do not invent
biographical claims — if you are unsure whether something is true of him, leave it out.

Then **rebalance the whole page from mechanism toward outcome.** For every section, ask: does a
hiring manager need this to judge whether to interview him? The internal mechanics — schemas, stage
plumbing, control-layer file paths — move down or out. What was built, what it does, what it caught,
and what that says about the person move up.

**Tone:** confident and plain. Not selling, not apologising. State what it does and let it stand.

Say more about what it means and less about how it is wired. He is applying for jobs, not
publishing a manual — and the detailed how is his to keep.

---

## 7 — Deploy and verify

Deploy, then check the live page: no model names anywhere, no "cheap", the rules block reads
clearly to someone who has never seen it, the personal section is present and sounds like a person
rather than a brochure, and the stuck-review issue is fixed or honestly reported.

Spell-check every word. Read each new sentence aloud before keeping it.

Report what you changed and anything you disagreed with.
