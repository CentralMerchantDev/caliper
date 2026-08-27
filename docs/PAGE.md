# Build the page

Data is final. Build it. Keep deploying to `sandbox-spike.markfrasertoronto.workers.dev` — Mark
names it in the morning, do not invent a domain.

Your last pass was right on all three counts: narrowing the hard-tier conclusion to "no gap on
well-known hard problems, says nothing about novel ones," correcting the old headline's
quality-equivalence claim, and owning that `parse_http_response` is arguably the better answer.
Hold that standard in the copy — it is the whole reason this artifact is worth sending.

---

## Structure, in order

**1. The question, stated plainly.** One or two sentences. Does a verification loop substitute for
model capability, and what does it cost? Not a tagline.

**2. The cost table.** Cost per correct answer by model, with n, first-pass rate, final pass rate.
This is the load-bearing claim and it survives scrutiny: Haiku at ~40% of Opus.

**3. What the experiment could not answer.** Immediately after the table, not buried below. Every
task at both tiers is a single pure function; the hard tier is textbook algorithms all three models
have likely near-memorised. So this says nothing about novel work, and the quality-equivalence
question is genuinely open. State it in your own voice, not as a disclaimer block.

**4. The spec-disagreement finding.** Co-headline weight. Every model at every tier read an
underspecified rule the same alternative way; the models' answer is arguably better than the test's;
a second repair round fixed nothing for Sonnet or Opus. Verification loops fix implementation slips,
not disagreements about intent — and when the disagreement is about intent, the verifier is
asserting a preference rather than catching a defect.

**5. Full methodology.** Port what is already in `MATRIX-RESULTS.md`. It is good; do not soften it
for the page.

**6. One live run.** Task and model selectable, rate-limited per IP, behind the daily spend cap,
with the 3s wall-clock abort. Stream it: prompt, generated code, test results, repair round if one
fires. If the daily cap is hit, say so plainly rather than failing oddly.

**7. How the sandbox works, last.** Isolation proven adversarially — `fetch()` throws, `env` empty,
runaway CPU and memory killed and catchable. Include the `cpuMs` ~2s enforcement floor and why the
parent imposes its own abort. This is the security answer, and it belongs at the end because it is
support, not the argument.

---

## Design

Reuse the palette and type from DATUM's `src/ui/index.html` — warm paper, serif headings, mono for
data. Two artifacts from the same person should look related.

Carry over the accessibility fixes already made there and do not regress them: `--muted:#6E5E49`,
`--line-strong` on control borders, and `:focus-visible{outline:2px solid var(--accent)}`. Verify
contrast on anything new rather than assuming the tokens cover it.

No metric tiles. Tables and prose.

---

## Also — make the repo presentable

This is the repository Mark will make public, and it closes the biggest gap in his application
package: 215,000 lines of claimed work and not one line currently inspectable.

Rewrite `README.md` for a stranger: what the experiment asks, how to run it, what the results were,
what it does not establish. Remove or clearly mark anything that only makes sense as internal
working notes. `NEXT.md`, `BUILD.md` and this file are working documents — move them under `docs/`
so the root reads as a finished project.

No secrets, no keys, no internal identifiers from any other project. Check before you finish.

---

## Then

Deploy, verify every claim against the live page rather than the local build, and report the final
copy. Do not overstate anything to fill a section — if a section has nothing solid to say, cut it.
