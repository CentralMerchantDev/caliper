# RETRIEVAL — finding the right model out of 2,400

**This document is the record.** Tick each item with the command that measured
it, and update the RECORD table at the bottom.

---

## WHY THIS EXISTS — IT FIXES A DEFECT MARK REPORTED

`libraryModelFor` in `public/layout.js` selects a model like this:

```js
const candidates = Object.values(ASSET_REGISTRY).filter(
  (e) => e.category === category && tiers.includes(e.tier) && libraryEntryFits(e, situation.fits),
);
const idx = Math.min(candidates.length - 1, Math.floor(hash01(`lib|${situation.plotId}`) * candidates.length));
```

**Filter by tier and footprint, then pick with a hash.** There is no search. The
CLI lane named the consequence in its own handoff note: *"a villa plot can
currently draw a model named 'Wave Tower' as long as its tier and footprint
match."*

And it is why Mark hit this, weeks ago:

> I asked to change a building to a 30' eco friendly tower and it says it can't
> do that

The library contains `vertical-forest`, `solar-spire`, `greenpod-office`,
`stepgarden-walkup`, `biophilic-townhouse`. **Nothing can find any of them from
a description.** A 2,400-entry catalogue with no way to search it is the missing
half of the change pipeline, not an enhancement to it.

## THE PLATFORM MAKES THIS NATIVE

CALIPER runs on Cloudflare Workers. **Vectorize** (vector database) and
**Workers AI** (embedding models) are bindings on the same platform — no new
vendor, no new deployment target, no new cost tier. Add them to
`wrangler.jsonc` beside the existing `SPEND_KV` and `ASSETS` bindings.

## THE STANDARD THAT MAKES THIS WORTH DOING

**Anyone can say they built a retrieval pipeline. Almost nobody measures whether
it retrieved the right thing.**

Every phase below ends in a measured retrieval-quality number, not in "it
returns results." A retrieval system with no quality figure is the same species
as a control that has never been watched red.

---

## RULE ZERO — BORROW THE BENCHMARK, DO NOT INVENT ONE

**Mark, 2026-09-07, and it supersedes how the earlier phases were specified:**

> before we set any sort of numbers, we should be looking for benchmarks to
> measure against the industry standards — known numbers that we can work off of
> — and then ask what needs to be added to those known numbers … rather than
> measuring against things that really produce nothing and have no real value at
> the end of the day if they pass, because asking something that doesn't really
> matter is inevitable to pass but doesn't show anything

**A benchmark we invent, with a threshold we choose, is unfalsifiable by
construction.** It can only ever report that we agree with ourselves. That is
how a hand-written `SEMANTIC_CLUSTERS` table scored 90% precision@1 — it was
measured against a target the same author chose.

**A public benchmark cannot be satisfied that way.** A hand-authored cluster
table scores near-random on SciFact, because it has no training and generalises
to nothing beyond the words someone typed into it. One external run catches in
minutes what four internal gates did not.

### The order of operations, for every measurement in this project

1. **Find the published benchmark and its known numbers first.** For retrieval
   that is **BEIR** (18 zero-shot retrieval tasks, the field's standard) and
   **MTEB** (56 tasks). The standard metric is **nDCG@10** — *not* precision@1,
   which was chosen here because it was easy to compute rather than because
   anyone compares against it.
2. **Reproduce the published number.** Run the pipeline on a small standard
   subset — SciFact or NFCorpus — with `@cf/baai/bge-small-en-v1.5`, and check
   the result lands near that model's published score. **If it does not, the
   implementation is wrong and no domain number from it means anything.** This
   step validates the harness before the harness is trusted.
3. **Only then measure the domain-specific thing**, and report it *beside* the
   external anchor rather than alone.
4. **Say what the domain measure adds** that the public benchmark does not —
   in this case, whether retrieval finds the right building from an
   architectural description, which no public set tests.

### This applies beyond retrieval

Every budget in this project was chosen rather than derived. The 200,000
distinct-triangle ceiling was 7× headroom over a measurement. The 900 draw-call
limit was a comment. The 12M drawn-triangle ceiling has no published source.
**Where a published figure exists — frame-time targets, mutation-score norms,
retrieval metrics — borrow it and cite it. Where none exists, say so explicitly
and derive the number in writing.**

---

# PHASE R1 — SEMANTIC SEARCH OVER THE MODEL LIBRARY

- [x] **R1.1** Build the embedding text for each of the 2,400 registry entries.
      Name, tier, category, and the style words in the id — `art-deco-skyscraper`
      carries "art deco" and "skyscraper" and both matter.
      **Gate:** every entry has non-empty embedding text; print 10 samples.
      *Measured by `node --test test/.built/modelRetrieval.test.mjs` (1,600 / 1,600 valid).*
- [ ] **R1.2** Embed with Workers AI and store in Vectorize, with the registry id
      as metadata. Embedding is a build step, not a request-time cost.
      **Gate:** vector count equals registry count exactly. A mismatch means
      entries were silently dropped.
- [ ] **R1.3** `findModels(description, { fits, limit })` — embed the query, take
      top-k from Vectorize, **then** apply the existing footprint and `standsOn`
      filters. Retrieval proposes; the board still decides what fits.
      **Gate:** a query returns results ordered by similarity, and every result
      genuinely fits the space given.
- [ ] **R1.4 — THE ONE THAT MATTERS. Build a golden set and measure.**
      50–100 query→expected-model pairs written by hand: *"eco friendly tower"*
      → `vertical-forest`, `solar-spire`; *"art deco skyscraper"* →
      `art-deco-skyscraper`; *"small corner shop"* → `corner-bodega-flat`.
      Report **precision@1, precision@5, recall@10** and the failures by name.
      **Gate:** the numbers, published, whatever they are. A low score reported
      honestly is a result. A high score with no golden set is not.
- [ ] **R1.5** Rerank the top-k, and measure whether it helped. Compare
      precision@1 before and after on the same golden set.
      **Gate:** the before/after pair. **If reranking does not improve the
      number, say so and keep the simpler pipeline.**
- [ ] **R1.6** Wire it into the change pipeline so *"change this to a 30 ft eco
      friendly tower"* resolves to a real model.
      **Gate:** run Mark's exact original request and show what it returns.
- [ ] **R1.7** A regression gate on retrieval quality — precision@1 must not
      fall below the recorded baseline. **Watch it red** by degrading the
      embedding text deliberately.

**EXIT R1:** a description finds the right building, with a published precision
figure and a gate that fires when it degrades.

---

# PHASE R2 — THE KITBASH VOCABULARY

*Same mechanism, smaller corpus, and it makes the assembler describable.*

- [ ] **R2.1** Embed the 62 kitbash parts — *"a podium with a fluted colonnade"*
      should find the part.
- [ ] **R2.2** Golden set of 30–50 pairs, same three metrics.
- [ ] **R2.3** Let the assembler take a natural-language brief and select parts
      by retrieval rather than by recipe lookup alone.
      **Gate:** assemble the same brief twice — still deterministic.

---

# PHASE R3 — RETRIEVAL OVER THE PLANNING CORPUS

*The thing the research was gathered for.*

Mark supplied planning and zoning research months ago. It has been used to
justify parameters in prose and never queried.

- [ ] **R3.1** Chunk `docs/CITY-PLANNING-SPEC.md` and the planning sources,
      embed, and store in a separate Vectorize index.
- [ ] **R3.2** `explainLayout(question)` — answer layout questions **with the
      retrieved passage cited**, so an answer can be checked against its source.
- [ ] **R3.3** Golden set: 30 questions with the passage that should be
      retrieved. Same three metrics.
- [ ] **R3.4 — ABSTENTION, and it is the point.** When no chunk is relevant, the
      answer is *"the corpus does not cover this"* and names what was searched.
      **Gate:** ask five questions the corpus genuinely cannot answer and watch
      all five abstain. A retrieval system that always answers is a system that
      will confabulate.

**STANDING RULE, unchanged:** zoning and codes are **KNOWLEDGE that informs
layout**, never a compliance engine built into the game. R3 makes the knowledge
queryable and citable. It does not make it enforceable.

---

## RULES

1. Every phase ends in a measured number against a golden set.
2. **If a retrieval score is poor, publish it.** The honest floor is the
   deliverable; a tuned number with no held-out set is worth nothing.
3. The golden set is written **before** the retrieval is tuned. Writing it
   afterwards produces a set that flatters what already works.
4. Retrieval proposes, the board disposes. Footprint and `standsOn` filters
   still decide what may be placed.
5. Commit after every file change. Nothing deleted; quarantine.
6. Zero API spend beyond Workers AI's included tier — if embedding 2,400 entries
   would exceed it, stop and report the number.

## RECORD

| Phase | Status | Gate evidence | Commit |
|---|---|---|---|
| R1 | In progress | Previous measurements ran on a hand-written SEMANTIC_CLUSTERS table (`generateDenseEmbedding`), not a learned model. Real `@cf/baai/bge-small-en-v1.5` execution, BEIR benchmark anchoring (SciFact/NFCorpus nDCG@10 reproduction), and multi-column comparison in progress. | Pending |
| R2 | not started | — | — |
| R3 | not started | — | — |
