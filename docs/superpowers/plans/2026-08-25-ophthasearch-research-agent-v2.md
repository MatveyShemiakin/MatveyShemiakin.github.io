# OphthaSearch Research Agent v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-side ophthalmology research agent that interprets a clinician's question, plans and executes evidence retrieval, filters by medical relevance, assembles a verified Evidence Pack, reasons over that pack, verifies every cited claim, and returns a structured specialist answer without changing production OphthaSearch v1 until benchmark gates pass.

**Architecture:** v2 is implemented as focused ES modules under `workers/ophthasearch-v2/` and exposed only through a new `/v2/research` Worker route. The browser will later become a thin renderer of the structured answer; retrieval, ranking, reasoning and citation verification remain server-side. The existing v1 endpoint and stable client stay untouched until v2 passes the clinical benchmark.

**Tech Stack:** Vanilla JavaScript ES modules, Cloudflare Workers, Workers AI binding, Node.js 22 built-in test runner, GitHub Actions, static Vanilla HTML/CSS/JS client.

**Spec:** `docs/superpowers/specs/2026-08-25-ophthasearch-research-agent-v2-design.md`

## Global Constraints

- Work only on `feature/ophthasearch-research-agent-v2` until production-readiness gates pass.
- Do not modify the production v1 browser loader during backend development.
- No browser-side scraping of scientific websites.
- Relevance filtering is mandatory before evidence hierarchy ranking.
- ClinicalTrials.gov records are context for registered/ongoing studies, never efficacy evidence.
- Model-generated identifiers or bibliography must never be rendered; displayed DOI/PMID/NCT/URLs come only from normalized source metadata.
- Doses, concentrations, frequency, duration and escalation recommendations must be backed by Evidence Pack sources.
- A single slow source must not block the full research request.
- Standard-mode hard latency budget is approximately 15 seconds with controlled degradation.
- v2 must pass at least 100 ophthalmology benchmark questions before it can replace v1 in production.

---

## File Structure

### New server modules
- `workers/ophthasearch-v2/contracts.js` — request/response schemas and runtime validation helpers.
- `workers/ophthasearch-v2/query-interpreter.js` — structured ophthalmology intent extraction interface and deterministic fallback.
- `workers/ophthasearch-v2/research-planner.js` — converts structured intent into multiple evidence-search tracks.
- `workers/ophthasearch-v2/relevance.js` — condition/intervention/question-type relevance scoring and hard-negative gate.
- `workers/ophthasearch-v2/evidence.js` — evidence classification, deduplication, Evidence Pack assembly and quality flags.
- `workers/ophthasearch-v2/citations.js` — claim-to-source verification and safe source rendering metadata.
- `workers/ophthasearch-v2/adapters/europepmc.js` — Europe PMC adapter.
- `workers/ophthasearch-v2/adapters/clinicaltrials.js` — ClinicalTrials.gov adapter.
- `workers/ophthasearch-v2/adapters/crossref.js` — DOI metadata verification adapter.
- `workers/ophthasearch-v2/adapters/openalex.js` — citation/related-work enrichment adapter.
- `workers/ophthasearch-v2/guidelines/registry.js` — controlled guideline registry contract and records.
- `workers/ophthasearch-v2/reasoner.js` — model-agnostic clinical reasoning interface and Workers AI implementation.
- `workers/ophthasearch-v2/pipeline.js` — orchestration, deadlines, partial failures, evidence-only fallback.
- `workers/ophthasearch-v2/handler.js` — `/v2/research` HTTP boundary.

### Existing files modified later
- `_worker.js` — route `/v2/research` to v2 handler while preserving `/v1/synthesize` and static assets.
- `.github/workflows/ophthasearch-tests.yml` — include v2 test files and v2 server module paths.
- `.assetsignore` — already excludes `workers/**`; no change expected unless bundling proves otherwise.

### New tests
- `tests/ophthasearch-v2-contracts.test.mjs`
- `tests/ophthasearch-v2-query.test.mjs`
- `tests/ophthasearch-v2-relevance.test.mjs`
- `tests/ophthasearch-v2-evidence.test.mjs`
- `tests/ophthasearch-v2-adapters.test.mjs`
- `tests/ophthasearch-v2-reasoner.test.mjs`
- `tests/ophthasearch-v2-handler.test.mjs`
- `tests/ophthasearch-v2-benchmark.test.mjs`
- `tests/fixtures/ophthasearch-v2-benchmark.json`

---

### Task 1: Core contracts and relevance gate

**Files:**
- Create: `workers/ophthasearch-v2/contracts.js`
- Create: `workers/ophthasearch-v2/relevance.js`
- Create: `tests/ophthasearch-v2-contracts.test.mjs`
- Create: `tests/ophthasearch-v2-relevance.test.mjs`
- Modify: `.github/workflows/ophthasearch-tests.yml`

**Interfaces:**
- Produces: `validateResearchRequest(payload)`, `normalizeIntent(intent)`, `validateStructuredAnswer(answer, sourceIds)`, `scoreMedicalRelevance(document, intent)`, `filterRelevantDocuments(documents, intent, threshold)`.
- Consumes: plain JS objects only; no network and no model dependency.

- [ ] **Step 1: Write failing contract tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResearchRequest, validateStructuredAnswer } from '../workers/ophthasearch-v2/contracts.js';

test('research request accepts a Russian specialist question', () => {
  const result = validateResearchRequest({ schemaVersion: '2.0', language: 'ru', question: 'Современная медикаментозная терапия ПОУГ' });
  assert.equal(result.question, 'Современная медикаментозная терапия ПОУГ');
});

test('structured answer rejects citations outside Evidence Pack', () => {
  assert.throws(() => validateStructuredAnswer({ schemaVersion: '2.0', clinical_bottom_line: 'x', management: [{ step: 1, action: 'x', citations: ['S9'] }], sources: [] }, new Set(['S1'])), /unknown source/i);
});
```

- [ ] **Step 2: Write failing relevance tests including the production failure mode**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreMedicalRelevance, filterRelevantDocuments } from '../workers/ophthasearch-v2/relevance.js';

const intent = { domain: 'glaucoma', condition: 'primary open-angle glaucoma', question_type: 'therapy', interventions: ['pharmacological therapy'], outcomes: ['intraocular pressure'] };

test('glaucoma pharmacotherapy outranks unrelated retinal-detachment evidence', () => {
  const glaucoma = { title: 'Medical treatment of primary open-angle glaucoma', abstract_or_summary: 'Prostaglandin analogues and intraocular pressure lowering therapy.' };
  const retina = { title: 'Vitrectomy for rhegmatogenous retinal detachment', abstract_or_summary: 'Retinal reattachment after pars plana vitrectomy.' };
  assert.ok(scoreMedicalRelevance(glaucoma, intent) > scoreMedicalRelevance(retina, intent));
  assert.deepEqual(filterRelevantDocuments([retina, glaucoma], intent).map((x) => x.document.title), [glaucoma.title]);
});
```

- [ ] **Step 3: Run the v2 tests and verify RED**

Run: `node --test tests/ophthasearch-v2-contracts.test.mjs tests/ophthasearch-v2-relevance.test.mjs`
Expected: FAIL because v2 modules do not exist.

- [ ] **Step 4: Implement minimal contracts and relevance gate**

Implement strict schema-version/language/question limits, normalized intent arrays, source-ID checks and a deterministic relevance score with condition mismatch penalties strong enough to reject retinal-detachment evidence for glaucoma pharmacotherapy.

- [ ] **Step 5: Run the v2 tests and full OphthaSearch suite**

Run: `node --test tests/ophthasearch-v2-contracts.test.mjs tests/ophthasearch-v2-relevance.test.mjs`
Expected: PASS.

Run existing + v2 tests through GitHub Actions after workflow update.
Expected: 0 failures.

- [ ] **Step 6: Commit**

Commit message: `feat: add OphthaSearch v2 contracts and relevance gate`

---

### Task 2: Clinical Query Interpreter and Research Planner

**Files:**
- Create: `workers/ophthasearch-v2/query-interpreter.js`
- Create: `workers/ophthasearch-v2/research-planner.js`
- Create: `tests/ophthasearch-v2-query.test.mjs`

**Interfaces:**
- Consumes: validated request from Task 1.
- Produces: `interpretClinicalQuestion(request, deps) -> ClinicalIntent`; `buildResearchPlan(intent) -> ResearchTrack[]`.

- [ ] **Step 1: Add tests for glaucoma pharmacotherapy, ERM surgery, macular-hole surgery and IOL dislocation** with exact expected domain, condition, question type and required evidence tracks.
- [ ] **Step 2: Run tests and verify RED.**
- [ ] **Step 3: Implement deterministic fallback extraction plus model-ready interpreter interface.** The fallback must recognize broad ophthalmology concepts without the v1 phrase-dictionary architecture and must preserve unknown modifiers under `ambiguities`.
- [ ] **Step 4: Implement planner tracks** for guidelines, efficacy, safety, alternatives, monitoring/escalation and pivotal recent evidence.
- [ ] **Step 5: Run query tests and full suite; verify 0 failures.**
- [ ] **Step 6: Commit** `feat: add clinical query interpreter and research planner`.

---

### Task 3: Evidence normalization, deduplication and hierarchy

**Files:**
- Create: `workers/ophthasearch-v2/evidence.js`
- Create: `tests/ophthasearch-v2-evidence.test.mjs`

**Interfaces:**
- Consumes: normalized source records and relevance-scored candidates.
- Produces: `normalizeDocument(record)`, `deduplicateDocuments(documents)`, `classifyEvidence(document)`, `buildEvidencePack(intent, documents)`.

- [ ] **Step 1: Write tests** proving DOI/PMID/NCT deduplication priority, guideline/current-version handling, registry non-efficacy classification, and relevance-before-tier ordering.
- [ ] **Step 2: Run tests and verify RED.**
- [ ] **Step 3: Implement normalization and evidence hierarchy.**
- [ ] **Step 4: Implement quality flags** for indirect population, small sample, retrospective design, surrogate outcome, old guideline and contradictory findings.
- [ ] **Step 5: Run evidence tests and full suite.**
- [ ] **Step 6: Commit** `feat: add Evidence Pack normalization and hierarchy`.

---

### Task 4: Real source adapters with independent deadlines

**Files:**
- Create: `workers/ophthasearch-v2/adapters/europepmc.js`
- Create: `workers/ophthasearch-v2/adapters/clinicaltrials.js`
- Create: `workers/ophthasearch-v2/adapters/crossref.js`
- Create: `workers/ophthasearch-v2/adapters/openalex.js`
- Create: `tests/ophthasearch-v2-adapters.test.mjs`

**Interfaces:**
- Every adapter exports `search(track, deps)` and/or `fetchDetails(record, deps)` returning common records without throwing on empty result sets.
- Network calls accept injected `fetchImpl` and `signal` for tests and deadline control.

- [ ] **Step 1: Write URL/request-shape tests** for all four official APIs using injected fetch stubs.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement Europe PMC and ClinicalTrials adapters.**
- [ ] **Step 4: Implement Crossref identifier verification and OpenAlex citation enrichment.**
- [ ] **Step 5: Add abort/deadline tests** showing one stalled adapter does not prevent other adapters from returning.
- [ ] **Step 6: Run adapter tests and full suite.**
- [ ] **Step 7: Commit** `feat: add OphthaSearch v2 evidence adapters`.

---

### Task 5: Controlled guideline registry

**Files:**
- Create: `workers/ophthasearch-v2/guidelines/registry.js`
- Extend: `tests/ophthasearch-v2-evidence.test.mjs`

**Interfaces:**
- Produces: `findGuidelines(intent) -> GuidelineRecord[]`, `isCurrentGuideline(record, asOf)`.

- [ ] **Step 1: Write tests** for organization/topic/version/supersession metadata and current-vs-superseded selection.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement registry contract and seed only verified guideline metadata needed by the initial benchmark domains.**
- [ ] **Step 4: Run tests and full suite.**
- [ ] **Step 5: Commit** `feat: add controlled ophthalmology guideline registry`.

---

### Task 6: Clinical Reasoning Agent and claim verifier

**Files:**
- Create: `workers/ophthasearch-v2/reasoner.js`
- Create: `workers/ophthasearch-v2/citations.js`
- Create: `tests/ophthasearch-v2-reasoner.test.mjs`

**Interfaces:**
- Consumes: Evidence Pack only.
- Produces: `reasonOverEvidence(evidencePack, env, deps) -> StructuredAnswerDraft`; `verifyClaimsAndCitations(draft, evidencePack) -> StructuredAnswer`.

- [ ] **Step 1: Write tests** that reject hallucinated source IDs, reject unsupported dosing claims, preserve explicit uncertainty, and allow clinical interpretation only when labelled as such.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement a versioned JSON schema** for the specialist answer and Workers AI invocation using internal source IDs only.
- [ ] **Step 4: Implement citation/claim verification** so rendered identifiers always come from source metadata.
- [ ] **Step 5: Add controlled evidence-only fallback** for model failure.
- [ ] **Step 6: Run reasoning tests and full suite.**
- [ ] **Step 7: Commit** `feat: add evidence-grounded clinical reasoning and citation verification`.

---

### Task 7: Research pipeline, `/v2/research` route and stale-request safety

**Files:**
- Create: `workers/ophthasearch-v2/pipeline.js`
- Create: `workers/ophthasearch-v2/handler.js`
- Create: `tests/ophthasearch-v2-handler.test.mjs`
- Modify: `_worker.js`

**Interfaces:**
- Produces: `runResearchPipeline(request, env, deps)`; `handleResearchRequest(request, env, ctx, deps)`.
- HTTP: `POST /v2/research` returns versioned structured JSON.

- [ ] **Step 1: Write handler tests** for method/origin/body validation, success, partial-source failure, model failure fallback and request IDs.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement orchestration** with per-adapter deadlines and an overall standard-mode budget.
- [ ] **Step 4: Implement partial-failure coverage metadata** and no-result behavior.
- [ ] **Step 5: Route `/v2/research` from `_worker.js`** without changing `/v1/synthesize` or static asset behavior.
- [ ] **Step 6: Run handler tests, existing Worker tests and full suite.**
- [ ] **Step 7: Commit** `feat: expose OphthaSearch Research Agent v2 endpoint`.

---

### Task 8: Clinical benchmark gate

**Files:**
- Create: `tests/fixtures/ophthasearch-v2-benchmark.json`
- Create: `tests/ophthasearch-v2-benchmark.test.mjs`
- Modify: `.github/workflows/ophthasearch-tests.yml`

**Interfaces:**
- Benchmark fixture entries contain question, expected domain, expected condition, question type, required concepts and forbidden concepts.

- [ ] **Step 1: Seed at least 100 questions** across glaucoma, cataract/IOL, vitreoretinal surgery, AMD/retina, cornea/transplantation, uveitis/infection and diabetic eye disease, in Russian and English.
- [ ] **Step 2: Include hard negatives** such as glaucoma pharmacotherapy forbidding retinal-detachment concepts and ERM surgery forbidding glaucoma-medication concepts.
- [ ] **Step 3: Run benchmark and verify failures identify exact question IDs.**
- [ ] **Step 4: Tune interpreter/planner/relevance logic without weakening hard-negative rules.**
- [ ] **Step 5: Require benchmark in GitHub Actions.**
- [ ] **Step 6: Commit** `test: add OphthaSearch v2 clinical benchmark gate`.

---

### Task 9: v2 client preview without production replacement

**Files:**
- Create: `for-doctors/ophthasearch-v2/index.html`
- Create: `for-doctors/ophthasearch-v2/ophthasearch-v2.css`
- Create: `for-doctors/ophthasearch-v2/ophthasearch-v2.js`
- Create: `tests/ophthasearch-v2-static.test.mjs`

**Interfaces:**
- Client sends one request to `/v2/research` and renders the structured answer object.
- No DOM MutationObserver and no scientific API calls from the browser.

- [ ] **Step 1: Write static tests** for semantic markup, no inline styles, mobile layout hooks and single `/v2/research` client dependency.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement preview UI** matching existing site containers/classes where applicable and using v2-specific classes only for new components.
- [ ] **Step 4: Render bottom line, practical management, dosing, monitoring/escalation, pros/cons, alternatives, guideline positions, uncertainty and verified sources.**
- [ ] **Step 5: Add abort handling for a newer submitted question.**
- [ ] **Step 6: Run static tests and full suite.**
- [ ] **Step 7: Commit** `feat: add isolated OphthaSearch v2 clinical research UI`.

---

### Task 10: Production-readiness review

**Files:**
- No production switch unless all gates pass.

- [ ] **Step 1: Run the complete OphthaSearch test command** and verify 0 failures.
- [ ] **Step 2: Verify the 100+ question clinical benchmark passes.**
- [ ] **Step 3: Verify `/v1/synthesize` and current v1 static loader remain unchanged relative to branch base except intentionally shared infrastructure.**
- [ ] **Step 4: Review source licensing/API constraints for every enabled adapter.**
- [ ] **Step 5: Smoke-test v2 preview on mobile and desktop after branch deployment/preview availability.**
- [ ] **Step 6: Only then prepare a PR for review; do not merge or replace v1 without explicit approval.**
