# OphthaSearch: comparison of three models — 12 September 2026

Decision: retain Gemma in production. This screening did not demonstrate a reason to route difficult questions to either candidate. No production code or model selection changed.

| Model | Requests | Mean response time | Reported total tokens | Reported neurons |
|---|---:|---:|---:|---:|
| Gemma 4 26B A4B | 3 | 9.60 s | 3,905 | 61.43 |
| Qwen3 30B A3B FP8 | 3 | 8.75 s | 4,920 | 86.27 |
| GPT-OSS-120B | 3 | 19.22 s | 5,016 | 248.91 |

Nine actual requests, no retries, approximately 397 neurons. Token counts include provider-reported completion usage, which can include reasoning. These are observations from one run, not general speed/price guarantees.

## Method

Same frozen, short paraphrases of primary publications, same production reasoning instructions and answer schema, Russian answers, temperature 0.1, maximum 2,400 output tokens per request. Gemma used its existing low-effort/no-thinking settings; other candidates used their documented output limit with default reasoning behavior. This compares practical configurations, not equal reasoning effort or identical tokenizers. No live retrieval was involved, so missing-search-result variance was removed. The rubric was retained for review and was not sent as an answer key.

Three questions: conflicting citicoline results in anterior ischemic optic neuropathy; latanoprost versus timolol; posterior neuropathy queried against anterior-only sources. The last case deliberately tests an evidence-population mismatch. One sample per model/case, tiny non-blinded screen, curated summaries rather than full articles. No claim of statistical superiority or universal medical accuracy.

## Content review

- **Gemma:** preserved positive pilot versus non-significant placebo results, compared the right glaucoma drugs, distinguished IOP reduction from visual preservation, and declined to extrapolate anterior-neuropathy evidence to posterior disease. No critical error identified in these three outputs. A generic suggestion about other drugs exceeded the supplied source summary; evidence-bounded wording can still improve.
- **Qwen:** two neuropathy responses were broadly appropriate. Its glaucoma management introduced unsupported and high-risk advice: switching to timolol in the presence of bronchospasm/bradycardia/heart failure and considering timolol when a lower heart rate is needed. These instructions are not supported by the supplied evidence (which identifies reduced heart rate as an adverse effect). It also invented treatment frequencies. This configuration is rejected for deployment.
- **GPT-OSS:** captured the main neuropathy limitations, but added management/background assertions not supported by the supplied summaries. The glaucoma conclusion ended with the nonsensical expression about preventing IOP and omitted the adverse-effect comparison requested by the rubric. It was about twice as slow and consumed about four times Gemma's reported neurons. No demonstrated upgrade in this screen.

All nine drafts passed the existing citation/structure validator. This is direct evidence that citation existence and dose-string checking do not validate clinical meaning. Some unsupported uncited alternatives were removed by that validator, but Qwen's cited unsafe management remained; the validator cannot be used as the sole quality gate.

## Artifacts and sources

- [Run and logs](https://github.com/MatveyShemiakin/MatveyShemiakin.github.io/actions/runs/34693642883)
- [Structured answers and usage](ophthasearch-model-evaluation-2026-09-12.json)
- Source summaries: [Parisi 2019](https://doi.org/10.1371/journal.pone.0220435), [Chia 2022](https://doi.org/10.35749/journal.v48i1.100495), [Zhang 2001](https://pubmed.ncbi.nlm.nih.gov/11466259/).
- Model interfaces checked against Cloudflare's documentation for [Gemma](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/), [Qwen](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [GPT-OSS](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/).

Next priority: source support and contraindication checks on actionable management text, followed by a larger clinician-reviewed test set before any automatic routing change. Benchmark tooling has a nine-call ceiling and stops on quota/access failure; it creates no public inference endpoint. Tests: 178 passed, including budget/error behavior. Existing unrelated workspace image edits were preserved in their original checkout.
