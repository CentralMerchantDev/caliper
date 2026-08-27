# Rename to CALIPER, fix the eyebrow copy, prepare for a public repo

Mark has decided both open questions: the project is **CALIPER**, and the repository goes public.

---

## 1 — The section eyebrows are briefing language, not page copy

Live right now:

- "Stated plainly, not as a disclaimer" — The limit
- "Co-headline, not a footnote" — Verification fixes slips, not disagreements
- "In full, not softened" — Methodology
- "Not just static claims" — Run one cycle yourself
- "Support, not the argument" — How the sandbox works

Those are my instructions to you, rendered as UI. They tell the reader how to read the page and
argue with a critic who is not there. Writing that is actually confident does not announce that it
isn't softening.

Replace them with plain labels that say what the section contains, or remove the eyebrow line
entirely where the heading already carries it. Same treatment for any similar phrasing elsewhere —
check the whole page, not just these five.

---

## 2 — Rename to CALIPER

- Worker name in `wrangler.jsonc`, and deploy to `caliper.markfrasertoronto.workers.dev`.
- Page title, meta description, any in-copy references to the project name.
- `README.md` and the docs under `docs/`.
- Anywhere "sandbox-spike" appears in code, comments, or config.

**Do not rename the folder.** The current working directory stays as-is for now — you are running
inside it and renaming it mid-session will break your own working directory. Mark will rename it
once this session is no longer active.

**Do not delete the old `sandbox-spike` worker.** Leave it deployed until the new URL is confirmed
working; Mark decides what happens to it after that.

Add a short note in the README recording that the project was called sandbox-spike during the
exploratory phase, so the git history and the docs under `docs/` are not confusing to a reader.

---

## 3 — Read the repo as a hostile reviewer before it goes public

This is going on Mark's résumé as the one inspectable thing in his package. Someone senior will
open it and form a view in about two minutes.

Go through it as if you were reviewing a stranger's code with no context:

- Naming that only makes sense to us. Dead code, commented-out experiments, leftover scaffolding.
- Comments that reference our conversation rather than the code.
- Anything in `docs/` that reads as internal working notes rather than project history — the
  NEXT/BUILD/PAGE files are fine as history if the README frames them that way, but check they
  don't contain instructions that read oddly out of context.
- Does `README.md` let someone clone, configure and run this without asking a question?
- Is the test/verification story visible? The ground-truth-verified-against-independent-reference
  step is one of the strongest things here and it should be obvious from the repo, not only from
  the page.

Fix what you find. Report what you changed and anything you decided to leave and why.

---

## 4 — Then

Commit, deploy to the new URL, verify the live page against every changed claim, and report. Do
not push to any remote — Mark creates the GitHub repository himself.
