# CALIPER — working instructions

CALIPER is a Cloudflare Worker that takes a plain-English change request,
generates a structured change with an LLM, executes it against hidden tests in
an isolated sandbox, and surfaces exact feedback when a test fails. Its one
claim is in the thesis: **a system that only says yes when yes is true.**

Everything below exists to protect that claim.

---

## How work is done here

**[docs/BUILD-LOOP.md](docs/BUILD-LOOP.md) is the procedure, and it is not
optional.** Every step of every plan runs through it, in order: orient,
re-ground, plan the step, test first, implement, verify, mutate, measure, check
the guards, tick the ledger, commit, and at every phase boundary audit blind and
replan. Read it at the start of a session and again after any context clear.

The current work and its step ledger are in
[docs/WORLD-BUILD-PLAN.md](docs/WORLD-BUILD-PLAN.md) — PART 7 is the checklist.

---

## The standard of proof

**A green suite is not evidence a control exists.** It is evidence that nothing
currently disagrees with it. The only evidence a control exists is that breaking
it turns something red.

So: **every fix gets a test that fails without it.** Write the test, break the
fix on purpose, watch it go red, revert. A fix without that step is a hope.

**A mutation that does not apply is INCONCLUSIVE, not a pass.** Assert the edit
landed before trusting the result. This has produced a false "verified" twice
here, both times with `sed` patterns that silently matched nothing.

**Never report unverified work as verified.** That is failure-floor item 1 —
see [docs/UMAA-CALIPER.md](docs/UMAA-CALIPER.md) §Step 4. Everything else on
this page is downstream of it.

## Auditing

**[docs/AUDIT-PROTOCOL.md](docs/AUDIT-PROTOCOL.md) is the default audit. Run it
that way.**

The load-bearing rule: **the auditor must be blind.** Spawn a fresh agent with
no conversation history, give it the files and the spec, and do not tell it what
you were trying to build or what you think is wrong. Knowing the intent is what
stops you looking — every test that has missed a defect in this project was
written by someone who already knew the answer.

When an audit misses something, **append to §7 of that document**. That section
is how the audit gets better; a protocol that never gains entries is one nobody
is checking.

Grounding (epistemic anchor, artifact topology, failure floor):
[docs/UMAA-CALIPER.md](docs/UMAA-CALIPER.md). Phase order and running ledger:
[docs/AUDIT-PLAN.md](docs/AUDIT-PLAN.md), [docs/AUDIT-LEDGER.md](docs/AUDIT-LEDGER.md).

[docs/LESSONS.md](docs/LESSONS.md) is §7's counterpart for the *build* itself,
not the audit of it — a place a fix (not a review) let something through.
Same rule: an entry stays OPEN until it names a real test and that test has
been seen red. When the work itself finds a defect a review would have named,
it goes here.

## The world

[docs/WORLD-RULES.md](docs/WORLD-RULES.md) is the specification for the land,
the ground types, the grid and the model contract. Both lanes build against it:
the land lane implements it, the asset lane builds models to it. If the code and
that document disagree, one of them is a defect — decide which and fix it, do
not leave them disagreeing.

## How to verify

```
npm test            # 932 node tests + 12 worker tests
npx tsc --noEmit    # types
node scripts/shoot.mjs "Downtown close"   # headless render, PNGs to .shots/
```

`scripts/shoot.mjs` renders through SwiftShader and reports console errors.
**Look at the output after any visual change.** Never ask for a deploy in order
to judge a change — that loop is why the script exists.

Derived artefacts are generated, not hand-edited:
`node scripts/gen-city-summary.mjs`, `node scripts/gen-test-count.mjs`.
The public page's numbers are pinned against them by
`test/publicClaims.test.ts`, because that sentence has gone stale three times
while claiming it was read from the runner.

## Rules that are not negotiable

- **Nothing is deleted.** Move it to `_TO-DELETE/<reason>/` and leave it. This
  applies to commands written for Mark to run, too, and to git lock files.
- **Never bulk-delete.** Inventory, categorise, get the exact list confirmed,
  then act.
- **Zero API spend without explicit authorisation.**
- **The repo stays private.** No internal identifiers from other projects in the
  repo, on any served page, or in any commit message.
- **Never display visitor-typed text as HTML.**
- **Do not touch `tick`, `chooseAction`, `applyAction`.**
- **The nine regression checks pass unedited.**

## Commit messages

They say what was wrong and how it is known to be fixed — the measurement, the
mutation that catches it, and what is still open. They are the project's memory
of its own defects, and they are read.

Written to `docs/pending-commits/` and committed with `git commit -F`, because
long messages do not survive being pasted into a shell.

## Lanes

Three checkouts off one repo, each with its own git index:

| folder | branch | owner |
|---|---|---|
| `sandbox-spike` | `main` | the live site; claims must stay true |
| `sandbox-spike-land` | `land-lane` | the land, the rules, the layout engine |
| `sandbox-spike-assets` | `assets-lane` | the model library |

Two agents in one working tree caused overwritten commits and git lock
contention. Do not do it again.
