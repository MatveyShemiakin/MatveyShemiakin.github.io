# OphthaSearch reliability implementation plan

**Approved scope:** Repair current OphthaSearch end to end; keep Vanilla HTML/CSS/JS and existing visual system; conserve free AI usage. User approved implementation and necessary product changes on 2026-09-07.

**Architecture:** Retain `/v2/research` and its answer contract. Strengthen retrieval and comparison validation, carry the original question into synthesis, add bounded retries and cache successful non-personal queries. Return typed degradation reasons with useful source-only output. No new paid service.

- [x] Reproduce comparison drift, missing original question, animal evidence, source-less fallback, redundant AI calls, rate limiting, and repeated requests in offline behavior tests.
- [x] Add shared clinical term matching; require both comparison arms in the conclusion and supporting source; exclude explicit non-human studies from human clinical evidence. Preserve explicit uncertainty instead of inventing a conclusion.
- [x] Build a concise primary retrieval query; pace NCBI requests and retry transient errors within bounded deadlines. Keep independent providers concurrent.
- [x] Add bounded successful-response caching and concurrent-request coalescing; bypass storage for potentially personal queries. Do not cache failures. Add AI timeouts and quota circuit breaker.
- [x] Show typed reasons, bounded wait/cancellation, and honest progress in RU/EN using existing markup/classes. Preserve all themes and mobile layout.
- [x] Run all existing and new tests plus 20 offline clinical cases; inspect desktop RU/EN controls and theme switching; review, commit, publish and verify live. Mobile visual verification remains unavailable and is explicitly excluded from the completion claim.

**Files:** `workers/ophthasearch-v2/{query-interpreter,research-planner,pipeline,reasoner,citations,evidence,relevance}.js`, new `clinical-terms.js`, `runtime.js`, `adapters/pubmed.js`; current V2 frontend JS and three entry pages; `tests/ophthasearch-reliability.test.mjs`; deployment smoke workflow.

**Verification:** `node --test tests/ophthasearch*.test.mjs`; offline browser-behavior fixtures and live browser checks for supported controls/theme states; live API requests limited initially to three diverse questions plus a cached repeat. Expand only to resolve observed defects. No model calls during offline tests. Release must not treat HTTP 200 or a nonempty answer as sufficient evidence of relevance.


## Verification checkpoint — 2026-09-08

- 175 offline tests pass, including 20 synthetic end-to-end scenarios. These verify software behavior, not clinical efficacy.
- Release r2 deployed successfully (GitHub commit `2cdd04de7221273a956c9f900a661e06d7e0bd99`). The original latanoprost/timolol production question returned a comparison with 18 sources and four bottom-line citations; cached repeat reported `diagnostics.cached=true`.
- Browser RU search, source citation expansion, theme switch and EN navigation worked. EN vitrectomy versus scleral buckle example returned a cited answer with 21 sources. Mobile viewport inspection was unavailable through the browser interface; no claim of mobile visual verification.
- Rare-topic probe: citicoline for anterior ischemic optic neuropathy initially overstated a pilot trial and omitted a placebo-controlled study. Added Crossref bibliographic retrieval with abstracts, neuropathy aliases and relevance checks, pilot evidence flags, low-confidence/no-prescribing guard for pilot-only cited evidence, and instructions to preserve conflicting/non-significant results.
- Release r3 deployed successfully (GitHub commit `c9772935910625ef4c5017efd06d8eadd5e2db69`); tests, deployment smoke and Pages succeeded. Rare-topic production recheck recorded below when complete.
- Limits: no guarantee of exhaustive retrieval or factual perfection; API quotas/outages remain external dependencies. OpenAlex is unavailable without its configured key. Browser-supported desktop checks do not replace mobile device testing.

- Short Russian `ПИОН` production probe exposed a separate model interpretation error (`neuroretinitis`). Release r4 preserves locally recognized neuropathy/drug intent without an AI interpretation call. Regression reproduced the issue and then passed.

- Final r4 live check: `Использование цитиколина в терапии ПИОН` returned HTTP 200 in 23.3 seconds; correctly resolved anterior ischemic optic neuropathy, low confidence, empty prescribing/management section, and four source records. The bottom line cited both the 2019 pilot (`10.1371/journal.pone.0220435`) and the 2022 placebo-controlled study (`10.35749/journal.v48i1.100495`), explicitly preserving its non-significant result. Registry and correction records are not independent efficacy trials. Status remained `partial` because provider availability is incomplete.
- Final production release: `20260908-r4`, GitHub commit `9bb1810b0a8cf2d6265805594e0da4bf83b894a9`; deployment and named-comparison smoke succeeded. Local regression suite: 175 passed, 0 failed. No claim of 100% clinical accuracy.
