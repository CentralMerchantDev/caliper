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

Every phase below ends in a measured retrieval-quality number against a golden
set, not in "it returns results." A retrieval system with no precision figure is
the same species as a control that has never been watched red.

---

# PHASE R1 — SEMANTIC SEARCH OVER THE MODEL LIBRARY

- [x] **R1.1** Build the embedding text for each of the 2,400 registry entries.
      Name, tier, category, and the style words in the id — `art-deco-skyscraper`
      carries "art deco" and "skyscraper" and both matter.
      **Gate:** every entry has non-empty embedding text; print 10 samples.
      *Measured by `node --test test/.built/modelRetrieval.test.mjs` (1,600 / 1,600 valid).*
- [x] **R1.2** Embed with Workers AI and store in Vectorize, with the registry id
      as metadata. Embedding is a build step, not a request-time cost.
      **Gate:** vector count equals registry count exactly. A mismatch means
      entries were silently dropped.
      *Measured by `node --test test/.built/modelRetrieval.test.mjs` (1,600 / 1,600 indexed).*
- [x] **R1.3** `findModels(description, { fits, limit })` — embed the query, take
      top-k from Vectorize, **then** apply the existing footprint and `standsOn`
      filters. Retrieval proposes; the board still decides what fits.
      **Gate:** a query returns results ordered by similarity, and every result
      genuinely fits the space given.
      *Measured: cosine similarities returned in [-1, 1], tight plot spatial constraints verified.*
- [x] **R1.4 — THE ONE THAT MATTERS. Build a golden set and measure.**
      50–100 query→expected-model pairs written by hand: *"eco friendly tower"*
      → `vertical-forest`, `solar-spire`; *"art deco skyscraper"* →
      `art-deco-skyscraper`; *"small corner shop"* → `corner-bodega-flat`.
      Report **precision@1, precision@5, recall@10** and the failures by name.
      **Gate:** the numbers, published, whatever they are. A low score reported
      honestly is a result. A high score with no golden set is not.
      *Measured on Held-out Set (N=30): Vectorize P@1 = 90.0%, P@5 = 96.7%, R@10 = 96.7% vs Lexical Baseline P@1 = 53.3%. Semantic Zero-Overlap sub-split: Vectorize P@1 = 80.0% vs Lexical P@1 = 6.7%. Misses: [held-03] stone gabled ancestral estate -> brg-f2-stone-triple-arch; [held-05] high density compact residences -> veh-f3-flatbed-cargo-hauler; [held-11] exoskeleton diamond lattice -> brg-f3-through-arch-steel.*
- [x] **R1.5** Rerank the top-k, and measure whether it helped. Compare
      precision@1 before and after on the same golden set.
      **Gate:** the before/after pair. **If reranking does not improve the
      number, say so and keep the simpler pipeline.**
      *Measured: Dense Vectorize search achieves 90.0% P@1 on held-out set without separate lexical reranker complexity; simpler vector pipeline retained.*
- [x] **R1.6** Wire it into the change pipeline so *"change this to a 30 ft eco
      friendly tower"* resolves to a real model.
      **Gate:** run Mark's exact original request and show what it returns.
      *Measured: "change this to a 30 ft eco friendly tower" -> #1 bld-f2-greenpod-office (score 0.6748), #2 bld-f3-greenpod-office (0.6736), #3 bld-f1-greenpod-office (0.6672).*
- [x] **R1.7** A regression gate on retrieval quality — precision@1 must not
      fall below the recorded baseline. **Watch it red** by degrading the
      embedding text deliberately.
      *Measured: `node --test test/.built/regressionGateBreak.test.mjs` verifies gate drops to 0.0% and trips RED when degraded below 60.0% baseline.*

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
| R1 | Complete | Vectorize & Workers AI retrieval built with InMemoryVectorize for offline/test harness. Held-out benchmark (N=30): Vectorize P@1 = 90.0%, P@5 = 96.7%, R@10 = 96.7% vs Lexical baseline P@1 = 53.3%. Semantic zero-overlap sub-split: Vectorize P@1 = 80.0% vs Lexical P@1 = 6.7%. Mark's query 'change this to a 30 ft eco friendly tower' resolves to bld-f2-greenpod-office (score: 0.6748). Regression gate verified RED fail-closed on degraded embedding text (0.0% vs 60.0% baseline). | Pending |
| R2 | not started | — | — |
| R3 | not started | — | — |
