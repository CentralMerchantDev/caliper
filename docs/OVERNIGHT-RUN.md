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
> what you are about to write already exists, use it and say so. If the map does
> not exist on this branch yet, read the source directly and say that you did.
>
> **You work `docs/BUILD-LOOP.md`, the same as everyone else.** Steps 2 through
> 9 apply to you exactly as written: plan in writing before touching code, write
> the test first, implement, verify, mutate and prove CAUGHT, measure anything
> you are about to claim, then commit. A change whose test has never been
> watched red is not finished, whatever the diff looks like. This is the single
> reason every report can be compared with every other one.
>
> **Ground before you build.** Your brief is a claim, written by someone who has
> not just read the file. Check its assertions against the repository first, and
> contradict it in your report where it is wrong.
>
> **Every number you report is sourced, or it is a fabrication.** A ceiling, a
> threshold or a measurement with no named origin is treated here the same way
> an invented benchmark is. Say where it came from or do not state it.
>
> **Zero API spend.** `CALIPER_ALLOW_SPEND` stays unset. Never run a command
> that bills a model provider. `test/run.mjs` once ignored its argument and ran
> every test file, billing Workers AI on what was meant to be a single file —
> check what a command will actually do before running it.
>
> **Nothing is deleted.** Quarantine to `_TO-DELETE/<reason>/` instead, git lock
> files included. This applies to files you created yourself.
>
> **`git commit -F` with explicit paths, never `git add -A`.** Spell-check every
> word you write, in code comments, commit messages and your report alike.
>
> **REPORT EVERYTHING, INCLUDING WHAT DID NOT WORK.** This is not optional and
> it is not padding. What failed is often what points at the answer. Return it
> under these exact headings, in this order, so the hub can compare one report
> against another without re-reading both in full:
>
>   1. **SCOPE AS RECEIVED** — the task in your own words, and whether it
>      survived contact with the code.
>   2. **GROUNDING** — what you checked, and every place the brief was wrong.
>   3. **WHAT I DID** — the change, and the commit hash or the diff.
>   4. **THE GATE** — red first, then green, both pasted verbatim, with the
>      mutation that produced the red.
>   5. **WHAT DID NOT WORK** — what you tried, and why you think it failed.
>   6. **CONSIDERED AND REJECTED** — the approaches you did not take, and on
>      what grounds.
>   7. **OUTSIDE MY SCOPE** — anything you noticed that someone should look at.
>   8. **UNVERIFIED** — anything you could not prove, named as unproven rather
>      than left to be assumed.
>
> Sections 5 and 6 are never empty on real work. A report of only successes is
> an incomplete report and will be sent back.

---

## THE THREE MOMENTS OF A SUBAGENT

The contract above is what the agent is told. This is what YOU do around it.

**AT DISPATCH.** Hand over, in writing: the contract verbatim; the task in one
sentence; the explicit list of files it may touch; the gate it must satisfy,
including what red looks like; the attempt budget as a number; and the documents
it must read first. A brief that does not name its gate is a request for an
opinion, and you will get one.

**MID-FLIGHT.** Do not interrupt to steer. If an agent returns early saying the
brief is wrong, that is the system working — read the finding, decide, and
re-dispatch with a corrected brief rather than arguing it back on course. An
agent that has spent its budget is finished, whatever state the work is in.

**ON RETURN.** A report is a claim. Before you accept it: confirm the commit
exists and its diff matches the report; re-run the gate yourself rather than
trusting the pasted output; check the mutation genuinely produces red; and read
sections 5 and 6 first, because what failed is where tomorrow's work is. If
either is empty on real work, send it back. Only then tick the ledger.

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
- **Renders, tested, not assumed:** a single-camera `scripts/shoot.mjs`
  render and the full multi-camera `test/regressionGate.test.ts`/
  `test/cullingRatio.test.ts` pass both completed successfully on
  2026-09-11, measured, at free memory (`Get-CimInstance
  Win32_OperatingSystem`) as low as **0.02 GB** — no crash, no hang, no
  corrupted output (`docs/audits/MEMORY-FLOOR-EXPERIMENT-2026-09-11.md`).
  The prior "4 GB floor" this line stated had no source anywhere in this
  repository, ground-checked the same day — no measurement, no incident,
  no citation, traced to the commit that first tracked this file. Retired
  for these two render workloads, verified working down to the reading
  above; **below 0.02 GB free is unmeasured**, not proven safe — this
  experiment observed no failure, which is not the same as knowing where
  one would occur.
  **What this does NOT cover, real and separate:** the full, unscoped
  `node test/run.mjs` (every test, no target file) has genuinely crashed
  on this host with a JavaScript heap out-of-memory error at DEFAULT V8
  settings — a different failure mode (Node's own default old-space
  ceiling, not Windows' system free memory) that this experiment neither
  tested nor retires. Use `NODE_OPTIONS="--max-old-space-size=8192"` (or
  target specific test files) for a full-suite run; that is a V8 heap
  question, not a "wait for more free memory" one. **Do not kill
  processes** — record PIDs and reasoning in the handover.
- Stay on the branch. Do not merge, deploy, open a PR, or touch `main`.
- Nothing deleted — quarantine to `_TO-DELETE/<reason>/`.
- `git commit -F`, explicit paths, never `git add -A`. Spell-check every word.

---

## WHEN YOU MAY STOP — AND A FINISHED PLAN IS NOT ONE OF THEM

Written after the 2026-09-09 run, in which this lane planned B2.7, had the plan
blind-reviewed, corrected four real defects, committed it, and then **stopped**.
Forty-five minutes against a night. The plan was never built. Nothing in this
document said to implement it, so nothing was implemented.

**BUILD-LOOP Step 2's "stop for review" is satisfied by the blind reviewer.**
On an unattended run there is no second gate. The moment the blind audit comes
back and its findings are folded in, you are at Step 3 and you keep going —
write the test, implement, verify, mutate, measure, commit. A phase is finished
when its gate is green and committed, not when its plan is good.

The only legal stopping conditions:

1. **Every item on your checklist is green and committed.** Descend to the next
   WRITTEN item — `process_next_item` again, the next phase's checklist, which
   already exists. **If there is no next written item, the plan is too shallow
   and THAT is the finding to report.**

   **Corrected 2026-09-15.** This line used to say *"keep going on the most
   valuable thing you can name."* `rule://queue-exhaustion` retires that
   wording explicitly, by name: *"it licensed exactly the invention ADR-023
   feared."* A lane reading this file at 3am would have invented work while the
   rule governing it forbade exactly that — two sources of truth with nothing
   binding them, which is itself a named failure pattern.

   **A lane may continue past its own checklist. A lane may never invent work.**
2. **A blocker no decision can clear tonight** — a missing credential, a
   physical resource, an external service that is down. Memory pressure is not
   this: rotate to work that fits.
3. **The repository is in a state where continuing would destroy work.**
4. **Your context is genuinely exhausted.** Write the handover first.

Everything else is a decision, and decisions go in the queue while you carry on
with the next item. "I would like Mark's view on this" is never a reason to
stop; it is a reason to write in `docs/DECISIONS-FOR-MARK.md`, take the least
irreversible path, and continue.

If you find yourself about to end a run, check this list first. If your reason
is not on it, you are not finished.

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

**The checklist is [`docs/specs/CHECKLIST.md`](specs/CHECKLIST.md)**, the index
into [`docs/specs/PLAN.md`](specs/PLAN.md), which governs. Tick there, not here.
Call `process_next_item` rather than choosing by eye, passing the OTHER lanes'
ids as `skip_ids`.

**Corrected 2026-09-15.** This section previously pointed at
`docs/specs/COMPLETION-PLAN.md` and `docs/specs/BOARD-REBUILD-PLAN.md`, and
carried B-phase state from the 2026-09-09 run. All of that is the pre-rebuild
world: both files still exist on disk (checked directly, not assumed — neither
is quarantined) but neither governs any more, and a lane reading this pointer
would have been sent to a document nothing current cites. The research those
plans carried survives intact in [`docs/specs/RESEARCH.md`](specs/RESEARCH.md)
and is cited by section. Whether `COMPLETION-PLAN.md`/`BOARD-REBUILD-PLAN.md`
themselves should be formally retired (matching `WORLD-RULES.md`'s own
item-0 quarantine) is a separate, undecided question, not settled here.

**`docs/BUILD-LOOP.md` is superseded by `rule://build-loop`**, served by the
process server. Fetch it with `process_get_rule` rather than reading a copy — a
copy drifts, which is `rule://reference-not-copy`'s whole subject. The same
applies to the subagent contract above: retrieve it with the `subagent_contract`
prompt and hand it over verbatim.

**Pass `repo` and `lane` to `process_at` and `process_get_rule`.** Supplying both
is what records the consultation, and the consultation record is what
`process_check_consultation` audits. Omit them and a run that followed every rule
reports as having consulted none.

Running out of night is expected. Running out of work is not.

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
