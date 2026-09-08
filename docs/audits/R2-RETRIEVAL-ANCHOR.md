# R2 retrieval anchor audit

**Date:** 2026-09-07  
**Model:** `@cf/baai/bge-small-en-v1.5`  
**Metric:** nDCG@10  
**Dataset source:** [BEIR SciFact archive](https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip)

## Dataset attribution and integrity

SciFact was created by AllenAI and is available from the
[AllenAI SciFact source](https://allenai.org/data/scifact). The evaluation uses
the copy distributed at the exact BEIR archive URL above and cites the
[BEIR paper](https://arxiv.org/abs/2104.08663). SciFact is licensed under
[CC BY-NC 2.0](https://creativecommons.org/licenses/by-nc/2.0/), which requires
attribution and permits non-commercial use only. BEIR does not grant a separate
license for the datasets it distributes.

The repository no longer redistributes SciFact. The runner fetches the archive
on demand and accepts it only when its SHA-256 checksum is
`536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165`. This
checksum was computed from
`https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip`
on 2026-09-07 and is pinned in `test/fetchBeirDataset.mjs`. A mismatch stops
extraction and evaluation. If the archive cannot be downloaded, SciFact tests
report a named skip with the fetch command; they never use a substitute fixture.

Checksum mutation run, verbatim:

```text
RED: one-byte-corrupted SciFact archive rejected: checksum mismatch
GREEN: published SciFact archive accepted: SHA-256 536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165
```

Committing the corpus asks a reader to trust that those bytes are the real BEIR
SciFact; a pinned checksum proves it. This is both the stronger control and the
smaller repository.

ArguAna Counterargs was created by Henning Wachsmuth, Shahbaz Syed, and
Benno Stein. Its [primary Zenodo record](https://zenodo.org/records/3973258)
declares the dataset under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
and requests citation of their 2018 ACL paper,
[Retrieval of the Best Counterargument without Prior Topic Knowledge](https://aclanthology.org/P18-1023/).
The evaluation fetches the BEIR-formatted archive from
`https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/arguana.zip`
and requires SHA-256
`cfdf79adce27a401b3cd3ea267903134dbfab2c6afeb95d7fe5724a00bf7557b`.
ArguAna is fetched and checksum-verified rather than redistributed. Its three
formerly tracked files are preserved under
`_TO-DELETE/redistributed-cc-by-4-arguana/` for review.

ArguAna checksum mutation run, verbatim:

```text
RED: one-byte-corrupted ArguAna archive rejected: checksum mismatch
GREEN: published ArguAna archive accepted: SHA-256 cfdf79adce27a401b3cd3ea267903134dbfab2c6afeb95d7fe5724a00bf7557b
```

R2.6 fixed one enumerated dataset instance and left the larger ArguAna instance
tracked. R2.7 generalizes both the fetcher and the check: a repository test now
rejects any tracked `.jsonl` file or any tracked path inside a `qrels` directory
under `test/`.

Class-level tracking check before R2.7, verbatim:

```text
✖ Git does not track corpus-shaped evaluation data under test
AssertionError [ERR_ASSERTION]: tracked corpus-shaped evaluation data:
test/beir-arguana/corpus.jsonl
test/beir-arguana/qrels/test.tsv
test/beir-arguana/queries.jsonl
tests 1
pass 0
fail 1
```

After untracking ArguAna, verbatim:

```text
✔ Git does not track corpus-shaped evaluation data under test
tests 1
pass 1
fail 0
```

## Outcome

This lane produced the first earned retrieval number in this workstream. The
harness first reproduced a published lexical result, then measured the dense
model, and finally failed when its document vectors were deliberately shifted.
The earlier anchor did none of those things reliably.

The [BEIR paper](https://arxiv.org/abs/2104.08663) reports SciFact BM25 at
66.500% nDCG@10 using Anserini with `k1=0.9` and `b=0.4`. This harness uses the
same BM25 parameters and measured 66.271%, a difference of 0.229 points. The
±1.500-point tolerance covers the remaining analyzer difference while still
being narrow enough to reject the fabricated fixture's 95.9% result.

The [official BAAI model card](https://huggingface.co/BAAI/bge-small-en-v1.5)
reports BGE-small-en-v1.5 at 71.275% SciFact nDCG@10. That result comes from
MTEB, not the BEIR paper's Anserini harness, so it is a cross-check rather than
one half of a claimed published gap. This harness measured BGE at 70.441% and
its reproduced BM25 at 66.271%. The only valid same-harness gap is therefore
**4.171 points**.

| Corpus documents | Eligible queries | BGE nDCG@10 | BM25 nDCG@10 | Same-harness gap |
|---:|---:|---:|---:|---:|
| 500 | 29 | 88.020% | 73.529% | 14.491 points |
| 1,000 | 65 | 80.676% | 75.409% | 5.267 points |
| 2,500 | 150 | 77.718% | 73.083% | 4.636 points |
| 5,183 | 300 | 70.441% | 66.271% | 4.171 points |

The smaller rows use one fixed SHA-256 ordering of document IDs and include
only queries for which every relevant document is present. Their changing query
counts mean they show the scaling trend; they are not substitutes for the
full-corpus benchmark.

## The anchor was fabricated

The fixture claimed 100 abstracts and had 50. Its qrels were sequential and
one-to-one: `q1` pointed to `doc-01`, through `q30` pointing to `doc-30`. Each
relevant document paraphrased its own query. Therefore the 100% result was
structural, not a measurement.

The recorded 78.4% in `docs/audits/R1-RETRIEVAL-AUDIT.md` did not come from the
current code. The current fabricated fixture produced 100.0%; no randomness is
present in the fixture, scorer, or in-memory cosine ranking. The most plausible
source is output from an earlier, uncommitted fixture or a number transcribed
from a different run. There is no retained evidence that can identify which,
so the provenance is unknown.

The artifact built to satisfy Rule Zero was itself invented, which is precisely
what Rule Zero exists to stop.

The old claim that 78.4% "reproduces the published ~67.7% range" does not hold
up. It neither reproduced the committed fixture nor cited the actual published
BM25 66.5% or BGE 71.275% result accurately.

The fabricated fixture was moved intact to
`_TO-DELETE/fabricated-scifact-anchor/test/beirSciFactSubset.ts`. The replacement
fetches and loads all 5,183 published corpus documents, all 300 test queries,
and the published test qrels. The formerly tracked dataset files were preserved
under `_TO-DELETE/redistributed-cc-by-nc-scifact/` for review.

## Mutation proof

Green run, verbatim:

```text
BEIR SciFact BM25 nDCG@10: 66.271% (published: 66.500%, tolerance: ±1.500 points)
SciFact BGE-small nDCG@10: 70.441%
SciFact reproduced BM25 nDCG@10: 66.271%
SciFact dense-minus-BM25 gap: 4.171 points
Embedding mutation: none
✔ full SciFact BGE-small beats the reproduced BM25 baseline
```

Red run after shifting every document vector by one position, verbatim:

```text
SciFact BGE-small nDCG@10: 0.000%
SciFact reproduced BM25 nDCG@10: 66.271%
SciFact dense-minus-BM25 gap: -66.271 points
Embedding mutation: document vectors shifted by one position
✖ full SciFact BGE-small beats the reproduced BM25 baseline
AssertionError [ERR_ASSERTION]: BGE-small must beat reproduced BM25; measured gap -66.271 points
```

The same assertion is green for the real vectors and red for the mutation. It
can fail and did fail.

## Authentication and TLS

The mixed 401 result came from independent clients capturing one expired
Wrangler OAuth access token at module load. Their concurrent 401 handlers then
attempted to exchange the same rotating refresh token. One exchange could
succeed and retry while the others retained their failed responses. This is why
one test could authenticate and later tests in the same process could return
Cloudflare error 10000. Rate limiting and model scope were ruled out: the calls
used the same model endpoint and account, and rate limits use 429 rather than
this authentication response.

The client no longer refreshes or retries a 401. It validates credential expiry
before inference and fails closed. Wrangler owns OAuth refresh. A mocked 401
test proves the client makes exactly one request.

The former global assignment to `NODE_TLS_REJECT_UNAUTHORIZED=0` was masking a
local certificate-chain problem. Live runs succeeded with
`NODE_USE_SYSTEM_CA=1`, which preserves verification and uses the operating
system CA store. `.dev.vars` now records `NODE_USE_SYSTEM_CA=1` and the
non-secret `CLOUDFLARE_ACCOUNT_ID`. Because Node does not automatically load
`.dev.vars` for this plain test runner, the retrieval plan also states that the
variables must be loaded before starting Node. Certificate failures are caught
and replaced by an actionable message naming `NODE_USE_SYSTEM_CA=1`; they never
fall back to disabled verification.

### R2.1 control, red and green

Before the fix, verbatim:

```text
# test files: 1
✖ source never assigns NODE_TLS_REJECT_UNAUTHORIZED
AssertionError [ERR_ASSERTION]: TLS verification disabled in: C:\Code\sandbox-spike-codex\src\clientWorkersAI.ts
tests 1
pass 0
fail 1
```

After the fix, verbatim:

```text
# test files: 1
✔ source never assigns NODE_TLS_REJECT_UNAUTHORIZED
✔ Workers AI client requires an account ID
✔ Workers AI client contains no machine-specific user path
✔ Workers AI authentication failure is reported after one request without a hidden retry
✔ Workers AI client distinguishes a missing OAuth expiry from a missing token
✔ Workers AI client turns certificate failures into an actionable system-CA error
tests 6
pass 6
fail 0
```

## ArguAna rejection and reviewer correction

The reviewer initially supplied a secondary-source BGE ArguAna figure of
33.1%. That figure was wrong. The primary BAAI model card reports 59.550%.
Recording the reviewer's error matters: an audit that records only the lane's
errors gives an incomplete account of how false numbers entered the work.

The BEIR paper reports ArguAna BM25 at 31.500%. The paper-era BEIR `v0.2.0`
evaluator did not remove identical query and document IDs. Current BEIR does,
and ArguAna requires that exclusion because each query is itself a corpus
document. With no exclusion, this implementation measured 30.466%, close to the
paper. With the required exclusion, it measured 40.503%, 9.003 points high.
One proof query placed its own document at raw rank 1 and removed it from the
scored ranking.

The corpus is genuinely 8,674 documents and 1,406 queries. This implementation
uses `k1=0.9` and `b=0.4`, lowercases alphanumeric tokens, removes 33 English
stop words, and does not stem. Analyzer details can account for small residual
differences, but not this measured 10.037-point change caused by self-document
exclusion. SciFact has no identical query/document IDs, so this protocol change
does not affect its 0.229-point reproduction. Agreement on SciFact and failure
on ArguAna demonstrate that reproducing one corpus does not validate every
task-specific evaluation rule. The proposed 1,493-call ArguAna dense run was
therefore rejected before inference.

## Domain evaluation and zero-overlap split

Only 5 of the original 15 alleged zero-overlap queries share no stemmed content
token with every acceptable target. The old 46.7% figure is invalid. On the
corrected five-query set, dense retrieved 1/5, lexical 0/5, and the pseudo-table
3/5. This is `n=5`, so it is too small to support a conclusion; counts are
reported instead of headline percentages.

The expansion produced three distinct attrition facts:

- 80 plain-language requests were authored.
- 50 were labelable; **30 of 80 had no target in the asset registry**, a
  separate registry-coverage finding.
- 33 of the 50 labeled candidates passed the corrected coded stemming-and-
  stopword zero-overlap rule; 17 failed qualification. An earlier plural rule
  incorrectly stemmed `vehicles` to `vehicl` and admitted five more. It was
  found during the exit self-audit after 38 query calls had been made; those
  five vectors were excluded from the corrected scores.

The answer-free query list was committed before expected targets were inspected
or assigned. That commit proves authoring order. It does not prove the author
was ignorant of the registry: the author had already worked with this repository
and knew some of its contents. The control is therefore accurately described as
answer-free-before-labeling, not as proof of an independent blind author.

On the 33 qualified expansion queries:

| Ranker | P@1 count | nDCG@10 |
|---|---:|---:|
| Real BGE-small | 17/33 | 67.3% |
| Lexical | 0/33 | 0.0% |
| Hand-tuned pseudo-table | 4/33 | 16.5% |
| RRF over dense and lexical | 10/33 | 45.8% |

The hand-written pseudo-table scored 27/30 and 94.2% nDCG@10 on the original
domain set, beating the real model there, because it was authored against that
very set. Its score is memorization rather than retrieval. Reproducing it here
is a deliberate control for the fourth of this project's five fabrications;
its collapse to 4/33 on answer-free-before-labeling queries is the evidence.

RRF over these two rankers did not beat dense alone on this set. It scored
55.6% versus dense 61.2% nDCG@10 on the original 30, and 45.8% versus 67.3% on
the expanded zero-overlap set. This is one fusion method, two rankers, one weak
lexical baseline, and small domain evaluations; it does not establish that
hybrid retrieval generally does not help. RRF is not included in production.

## Claims in the R1 audit proved wrong

- The fixture was not a standard 30-query, 100-abstract subset. It was 30
  queries and 50 invented abstracts.
- The fixture did not use standard qrels. It used sequential, one-to-one labels.
- The committed harness does not produce the recorded 78.4%; it produced 100%.
- The 78.4% figure did not reproduce a published "~67.7% range."
- The pseudo-table was not near-random on that fixture because the fixture and
  table shared authored vocabulary.
- The 15-query zero-overlap claim was false; only five qualified.
- The reported 46.7% corrected-split result was therefore false.
- The claim that hybrid retrieval "maximizes coverage" was unsupported. The
  tested RRF combination was worse than dense alone.
- The old regression mutation did not degrade the real document embedder; it
  generated pseudo-vectors while labeling their metadata as Workers AI. The new
  mutation degrades the authenticated real vectors and makes the anchor red.

## Spend control

`test/run.mjs` now honors explicit filenames. With no filenames it retains the
complete-suite behavior. Every live retrieval test requires
`CALIPER_ALLOW_SPEND=1`; otherwise Node reports a named skip. The full SciFact
run made exactly 352 authorized calls. The original domain run made 46
authorized calls, and the expanded split made 38 authorized calls, of which
five were excluded after the stemming correction. No ArguAna dense calls were
made.
