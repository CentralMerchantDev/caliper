# The two-sided security agent

**Status: designed, not built.** Parked deliberately until the land layer, the
model library and the layout engine are done. Written down now because the
design is clear now, and because a design that lives only in a chat log is a
design that has to be reinvented.

Mark's idea, in his words: an agent with two sides, defence and offence. The
offence side is *completely blind* to the protection side. It tries to break in,
plant code, or otherwise threaten the system — and only then does it share with
the defence side what it found, how it did it, how many attempts it took, and
what it tried along the way. The defence side then doesn't just patch the hole
but makes it stronger and tracks it for future attempts. Both sides update
themselves periodically on current threats and techniques.

---

## 1. Why the blindness is the load-bearing part

This is the same principle that made the context-free audit work, and it is
worth stating precisely because it is easy to mistake for "get a second
opinion".

**A red team that knows where the defences are tests the defences. One that
doesn't tests the system.**

Every test that has missed a defect in this project was written by someone who
already knew what the code was meant to do. That knowledge is exactly what stops
you looking. On 2026-09-02 a blind auditor found 23 defects — two CRITICAL — in
five modules that were *already* mutation-tested with 545 tests green. Mutation
testing proves a control catches the failure you thought of. It says nothing
about the one you did not.

So the offence side gets: the running system, the ability to send it input, and
nothing else. Not the threat model. Not the list of controls. Not the
architecture document. Not this file.

## 2. Why CALIPER is an unusually good target for it

This is not a theoretical attack surface. CALIPER **executes LLM-authored code
in a sandbox**, and that sandbox has a documented history of being breakable:

- **Verdict forgery.** The harness captured the comparators but not the
  *recorder*. Two forgeries — replacing `Array.prototype.push`, and an
  `Object.prototype.toJSON` — both scored 9/9 against an inert `tick()`. A run
  that did nothing reported a perfect pass.
- **Scanner bypass.** `browserOnlyReferences` had a scope-blind
  `collectBindings`: one dead function whitelisted every global,
  program-wide.

Both were found by hand, by someone looking. That is precisely the work a blind
red agent does tirelessly and without getting bored, and the failure floor
already ranks these: shipping unverified change reported as verified is item 1,
sandbox escape is item 3.

## 3. The output that matters

**Not "an agent that hacks". An agent whose every success becomes a permanent
regression test.**

This is the difference between a security exercise and something that compounds.
Patching a hole proves it is closed today. A test that reproduces the attack
proves it stays closed — forever, under every future refactor, by the same
standard every other control in this project is held to.

Mark's "track it for future attempts" instinct is exactly this. It should be the
*primary* output, not a side effect:

```
attack succeeded
    -> test/attacks/<name>.test.ts        reproduces it, fails against the
                                          unpatched code
    -> the patch
    -> mutation: revert the patch, watch the test go red
    -> ledger entry: attempts taken, techniques tried, date
```

An attack that cannot be turned into a deterministic test is a finding that gets
written down but not claimed as fixed.

## 4. Shape

```
                    ┌──────────────────────────┐
   fixed budget ───►│  OFFENCE (blind)         │
                    │  - no repo write access  │
                    │  - no knowledge of       │
                    │    controls or design    │
                    │  - reports attempts,     │
                    │    successes, techniques │
                    └───────────┬──────────────┘
                                │  findings only, after the run ends
                                ▼
                    ┌──────────────────────────┐
                    │  DEFENCE                 │
                    │  - reproduces as a test  │
                    │  - patches               │
                    │  - mutation-verifies     │
                    │  - writes the ledger     │
                    └──────────────────────────┘
```

**One-way, and only at the end of a run.** If defence can talk back mid-run, the
blindness is gone — offence starts optimising against feedback rather than
against the system.

### What offence is given

- A running instance (local `wrangler dev`, or a disposable deploy)
- The public surface: the page, the API routes, the change-request input
- A budget: N attempts or $X, whichever comes first
- The instruction to record *every* attempt, not only the successful ones

### What offence is never given

- Write access to the repository. Findings only. An attacker that can commit is
  not a red team, it is an unreviewed contributor.
- The source of the controls it is attacking.
- Any target that is not ours. **Scope is CALIPER and CALIPER only** — our own
  system, our own deployment. This is legitimate security testing of our own
  software and it stays that way. No generalised offensive tooling, no
  third-party targets, no capability that outlives this repo.

## 5. Attack surfaces worth pointing it at, in order

1. **The sandbox.** Escape from the Dynamic Worker isolate. Reach the Worker's
   environment, secrets, or another visitor's run.
2. **The verdict.** Make a failing run report as passing — by any route.
   Forge results, poison the recorder, make a fatal error read as zero failures.
   This is failure-floor item 1 and has already been breached twice.
3. **The static scanner.** Get past `worldEdit.ts`'s checks with code that
   should have been refused.
4. **Spend.** Exceed the per-run or daily ceiling. Race the counter, replay a
   claim, get a refund for something never spent.
5. **Rate limits.** More runs than the per-IP cap allows.
6. **Injection.** Visitor text rendered as HTML; prompt injection through the
   change request into the model's instructions.
7. **The world edit path.** Once the layout engine exists: place something that
   should be refused, corrupt the registry, forge a placement.

## 6. The self-updating part, and its hazard

Mark is right that this decays without it — an attacker that only knows 2026
techniques is testing against 2026.

**But an agent that fetches external content and then writes code is one prompt
injection away from being the threat it was hired to find.** A page describing a
"new technique" can simply *be* an instruction, and an agent that treats fetched
material as guidance will follow it.

So:

- Fetched material is **data, never instructions**. The same rule I work under.
- Updates land in **a file a human reads**, on a cadence — not into a
  self-modifying prompt, and not directly into the attack loop.
- The offence agent reads that file the way it reads any other input: as
  something that might be lying.

## 7. Cost, which is a control here and not an afterthought

Zero API spend without explicit authorisation is a standing rule, and a red
agent that runs repeatedly is real money.

- Fixed budget per cycle, refused at the boundary rather than watched.
- Report **attempts per finding** — the more interesting number. "Took 14
  attempts" says something that "found a hole" does not: it is a measure of how
  hard the system is, and it is trackable over time. A control that used to take
  3 attempts and now takes 40 has genuinely got stronger.
- Cheap models for breadth, expensive ones only where breadth found something.

## 8. What would make it a good portfolio piece

For an applied-AI role this is a stronger story than most of what gets shown,
*if* it is framed by the measurement rather than the theatre:

> A blind red-team agent attacks my own sandbox. Every successful attack becomes
> a permanent regression test. Attempts-per-break is tracked over time, so the
> system's hardness is a number that moves.

The weak version of this project is "I built an AI that hacks things". The
strong version is "I built a loop where security findings become permanent
proofs, and I can show you the graph."

## 9. Honest scoping

This is a **second portfolio-grade artifact**, not an addition to the first. It
is weeks, not days. The land layer, the model library and the layout engine are
what stand between Mark and sending resumes, and this waits behind them.

## 10. Open questions, to settle before building

- Where does offence run? A disposable deploy is realistic but costs money and
  is publicly reachable while it exists. Local `wrangler dev` is free and safe
  but is not the real edge.
- How is "an attempt" counted — one request, or one strategy?
- Does offence get to see previous ledger entries? Arguably yes for
  attempts-per-break to mean anything over time; arguably no, because it
  reintroduces knowledge of the defences. **Leaning: it sees its own past
  attempts and their outcomes, never the patches.**
- What stops offence reporting a success it cannot reproduce? Probably: no
  finding is accepted until defence can turn it into a failing test.
