# OphthaSearch reliability implementation plan

**Approved scope:** Repair current OphthaSearch end to end; keep Vanilla HTML/CSS/JS and existing visual system; conserve free AI usage. User approved implementation and necessary product changes on 2026-09-07.

**Architecture:** Retain `/v2/research` and its answer contract. Strengthen retrieval and comparison validation, carry the original question into synthesis, add bounded retries and cache successful non-personal queries. Return typed degradation reasons with useful source-only output. No new paid service.

- [ ] Reproduce comparison drift, missing original question, animal evidence, source-less fallback, redundant AI calls, rate limiting, and repeated requests in offline behavior tests.
- [ ] Add shared clinical term matching; require both comparison arms in the conclusion and supporting source; exclude explicit non-human studies from human clinical evidence. Preserve explicit uncertainty instead of inventing a conclusion.
- [ ] Build a concise primary retrieval query; pace NCBI requests and retry transient errors within bounded deadlines. Keep independent providers concurrent.
- [ ] Add bounded successful-response caching and concurrent-request coalescing; bypass storage for potentially personal queries. Do not cache failures. Add AI timeouts and quota circuit breaker.
- [ ] Show typed reasons, bounded wait/cancellation, and honest progress in RU/EN using existing markup/classes. Preserve all themes and mobile layout.
- [ ] Run all existing and new tests plus 20 offline clinical cases. Inspect mobile/desktop RU/EN themes. Review diff, commit and publish. Run a small live verification budget, fix defects discovered, report actual limitations rather than promise perfect AI accuracy.

**Files:** `workers/ophthasearch-v2/{query-interpreter,research-planner,pipeline,reasoner,citations,evidence,relevance}.js`, new `clinical-terms.js`, `runtime.js`, `adapters/pubmed.js`; current V2 frontend JS and three entry pages; `tests/ophthasearch-reliability.test.mjs`; deployment smoke workflow.

**Verification:** `node --test tests/ophthasearch*.test.mjs`; local browser with intercepted fixture responses for viewport/theme and error states; live API requests limited initially to three diverse questions plus a cached repeat. Expand only to resolve observed defects. No model calls during offline tests. Release must not treat HTTP 200 or a nonempty answer as sufficient evidence of relevance.
