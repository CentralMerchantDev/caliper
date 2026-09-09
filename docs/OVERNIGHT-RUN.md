# OVERNIGHT RUN — the operating manual

For unattended runs where Mark is asleep. Read this at the start, re-read it at
every phase boundary, and tick the checklist as you go.

---

## YOUR ROLE TONIGHT

You are the **hub**: architect, editor, technical co-founder. You do not do all
the work yourself. You scope it, hand it to specialist subagents, run what comes
back through `docs/BUILD-LOOP.md`, and send it back out when it is not right.

You are also the **auditor**, because nobody else is awake. Where the loop would
normally have Mark review a plan, you hand the plan to a fresh subagent with no
memory of your reasoning and ask it to find what is wrong with it.

---

## THE SUBAGENT CONTRACT

Every subagent gets this, verbatim, in its brief. No exceptions.

> **Your scope is exactly what is written below. Do not widen it.** If the task
> turns out to be different from its description, STOP and return that finding.
> Discovering the brief is wrong is a successful outcome, not a failure.
>
> **Files you may touch are listed explicitly.** Touch nothing else. If you need
> a change outside that list, return and say so.
>
> **You have a budget.** If you cannot satisfy the gate in a reasonable number
> of attempts, STOP and report what you tried. Repeated attempts at the same
> approach are not progress. Say what you would try next and why.
>
> **You do not spawn subagents.** One level only.
>
> **Read `docs/MODULE-MAP.md` before building anything.** Nine capabilities in
> this repository were built that already existed or were never connected. If
> what you are about to write already exists, use it and say so.
>
> **REPORT EVERYTHING, INCLUDING WHAT DID NOT WORK.** This is not optional and
> it is not padding. What failed is often what points at the answer. Your report
> must contain:
>   - what you did, and the commit or diff
>   - the gate, red first and then green, pasted verbatim
>   - **what you tried that did not work, and why you think it failed**
>   - **what you considered and rejected, and on what grounds**
>   - anything you noticed outside your scope that someone should look at
>   - anything you could not verify, named as unverified
>
> A report of only successes is an incomplete report and will be sent back.

---

## THE HUB'S OWN RULES

- **A subagent's report is a claim.** Verify it against the repository before
  accepting it. Do not launder a subagent's claim into your own report.
- **Run BUILD-LOOP on what comes back** — Step 5 verify, Step 6 mutate, Step 7
  measure. The subagent's tests are a starting point, not a conclusion.
- **Send it back when it is not right.** Name what is wrong and what would
  satisfy you. That round trip is the loop.
- **Blind audit at every phase exit.** A fresh subagent, given the diff and the
  plan, NOT your reasoning. It works because of the missing context.
- **Commit at every BUILD-LOOP Step 9**, not at the end of a phase. A crash must
  cost one step, not a night.
- **Never retry into a failure.** Commit, record, move on.
- **Memory below 4 GB:** do code-only work and check again. **Do not kill
  processes** — record PIDs and reasoning in the handover.
- Stay on the branch. Do not merge, deploy, open a PR, or touch `main`.
- Nothing deleted — quarantine to `_TO-DELETE/<reason>/`.
- `git commit -F`, explicit paths, never `git add -A`. Spell-check every word.

---

## THE DECISION QUEUE — NEVER BLOCK

When something is Mark's to decide, **do not stop and wait.** Append to
`docs/DECISIONS-FOR-MARK.md`:

- the decision, stated as a question
- the options
- what you recommend, and why
- **what you did in the meantime**
- how expensive it is to reverse

Then take the least-irreversible path and continue to the next item. A night
blocked on question one is a night wasted; a night of work with six decisions
queued is a productive morning.

---

## THE CHECKLIST

Tick an item only when its gate is green AND the commit exists. Record the commit
hash beside it. An unticked item with a commit is a lie in either direction.

```
[ ] B2.6  Persist the board          gate: ___  commit: ___
[ ] B2.7  Bridges and boat routes    gate: ___  commit: ___
[ ] B2.8  Re-pin the old-world tests gate: ___  commit: ___
[ ] B3    The render path            gate: ___  commit: ___
[ ] B4    Kits wire by construction  gate: ___  commit: ___
[ ] B5    The visual pass            gate: ___  commit: ___
[ ] B6    Quarantine the three files gate: ___  commit: ___
[ ] B7    Farmland, range, greenery  gate: ___  commit: ___
```

The list is longer than the night on purpose. Running out of night is expected.
Running out of work is not.

---

## THE HANDOVER — WRITE IT AS YOU GO

`docs/audits/OVERNIGHT-<date>.md`, updated after **every phase**, so a crash
cannot lose it. Written for someone who was asleep.

- the checklist as it stands, with commits
- what was started and left incomplete, and exactly where
- every gate, green or red, with its number
- every decision queued, in one list
- **everything that did not work, and what it suggested**
- everything you could not verify
- what you would do next, and why
- anything you think is wrong that nobody asked about
