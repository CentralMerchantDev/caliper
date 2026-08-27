# Design approved, with four changes. Build it.

The proposal in `docs/REBUILD-PROPOSAL.md` is approved. Three things in it were better than what
I asked for and should be kept exactly as designed: Brief-as-lookup for presets, the choice of all
five presets so the correctness-critical logic stays a server-verifiable pure function, and the
transparent `[MATERIAL]`/`[NIT]` triage rule.

On your process question: measuring rather than guessing was right, and stopping when the
classifier blocked the re-run was right — your own read of why was correct. Going forward, state
what you are about to spend **before** you spend it. Seven cents is trivially approvable in
advance; the problem is only ever finding out afterwards.

Four changes.

---

## 1 — OPENAI_API_KEY is set on the `caliper` worker

Mark configured it. The cross-model review stage is genuinely cross-vendor — wire it to OpenAI, as
his real pipeline does. Choose the reviewer model deliberately and say on the page which
model reviews and why. The "same-vendor stand-in" labelling is no longer needed.

You may still need it in `.dev.vars` for local runs; ask rather than assuming.

---

## 2 — Pre-record a canonical run per preset. This is the main change.

$0.075–0.10 per run against a $10 cap is ~110 runs total. A few employers sharing the link exhausts
that in an afternoon, and 75–100 seconds is a long time to hold a stranger who arrived from a CV.

**Run each of the five presets once, properly, and capture the complete transcript** — brief, model
routing, generated code, verification results, review findings, triage, the gate decision, the fix
round, re-verification, the final artifact, costs and timings per stage. Store it the same way the
matrix results are stored.

A visitor gets that instantly on arrival: the full pipeline, stage by stage, with the real artifact
rendering at the end. **It is a recording of a real run, and the page must say so plainly** — not a
simulation, not a mock, a captured genuine execution, with its date.

Then a separate, clearly-labelled **"run it live yourself"** action, hard rate-limited, for anyone
who doubts it. That is what makes the recording credible rather than a claim.

Re-derive the spend cap and the per-IP limit for the live path specifically. The inherited constants
are an order of magnitude wrong for this feature, as you noted.

---

## 3 — Turn your two biggest unknowns into published numbers

**The "reviewed, nothing found" rate.** You have n=1. Run all five presets at least three times
each before shipping — roughly $1.20 — and publish the actual rate. If the reviewer finds something
every single time, that is theatre and we need to know before a stranger does. If it finds nothing
most of the time, that is a real and interesting result about well-specified tasks.

**Reviewer calibration.** You correctly flagged that nothing checks whether the reviewer's own
severity tagging is honest. Collect every finding from those trial runs into a list for Mark to
read and mark agree/disagree, then publish the agreement rate.

That converts your weakest point into a measurement. **Publishing a calibration rate for your own
reviewer is more rigorous than most shipped code-review tools manage** — do not bury it.

---

## 4 — Browser Rendering: not for v1

Ship the client-side DOM check with the limitation stated at full weight, exactly as you proposed.
Server-side logic verification through `SandboxRunner` remains the strong claim; the DOM check is
the weaker one and the page should say which is which.

Name Browser Rendering as the known upgrade path. Do not build it now.

---

## Also

**The human gate must be a real interaction.** The visitor clicks approve or reject, and rejecting
actually stops the run. A gate that cannot be exercised is a diagram.

**Design for the "nothing found" case.** If the reviewer finds nothing, the run should feel
complete and correct, not anticlimactic — the ledger records "reviewed, nothing found" as a real
outcome with its own count. Do not add filler to make quiet runs feel busy.

**Set expectations in copy for the live path**, as you proposed: four real model calls, 60–90
seconds. Tell the visitor before they start, not while they wait.

---

## Order of work

1. Cross-vendor review wired and verified.
2. Pipeline working end to end for one preset, verified by running it.
3. Trials across all five presets — publish the clean rate and gather findings for calibration.
4. Record the canonical runs.
5. The app UI.
6. The essay sections moved behind it.

**Report after step 3 with the clean rate and the findings list.** Those numbers decide how the
page is written, and I would rather see them before the UI exists than after.
