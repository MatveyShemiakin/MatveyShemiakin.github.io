# OphthaSearch Single Architecture Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leave one production OphthaSearch path in which a clinician enters a question and receives a relevant, source-grounded clinical synthesis from the deployed `/v2/research` Worker.

**Architecture:** The public RU/EN OphthaSearch pages use only the v2 browser client. The browser sends one request to the deployed Cloudflare Worker; server-side query interpretation, multi-source retrieval, relevance filtering, evidence packaging, Gemma 4 reasoning, and citation verification happen inside `workers/ophthasearch-v2`. Legacy v1/v3 browser search code is not loaded in production and is treated as deprecated compatibility code until removal is safe.

**Tech Stack:** Vanilla HTML5/CSS3/JS, Cloudflare Worker + Workers AI Gemma 4, PubMed/Europe PMC/J-STAGE/ClinicalTrials adapters, Node.js built-in test runner, GitHub Actions.

**Spec:** User-approved production behavior in the current project: one clinical question → clinical conclusion → management → limitations → sources; no technical pipeline tables in the physician UI.

## Global Constraints

- Keep the existing site header/footer, theme system, responsive containers, and retention modules.
- No inline styles and no frontend framework/build step.
- Production browser code must not call scientific provider APIs directly.
- Gemma may reason only over the server-created Evidence Pack; source IDs and regimen details remain verified.
- If a secondary regimen field is unsupported, remove that field rather than discard an otherwise verified answer.
- Do not expose diagnostics, Evidence Pack internals, adapter counters, PICO tables, or heuristic signal cards to end users.
- Do not merge to `main` until automated tests and live smoke checks pass.

---

### Task 1: Establish end-to-end acceptance tests

**Files:**
- Modify: `tests/ophthasearch-production-v2.test.mjs`
- Modify: `.github/workflows/ophthasearch-live-smoke.yml`

**Interfaces:**
- Consumes: production HTML, v2 browser client, deployed `/v2/research` response.
- Produces: deterministic acceptance criteria for RU/EN production UI and three representative ophthalmology queries.

- [ ] Add tests requiring RU/EN pages to load only v2 OphthaSearch UI hooks and not legacy `ophthasearch.js`, PICO, source-board, signal-grid, or heuristic synthesis UI.
- [ ] Add live smoke cases for: latanoprost vs timolol in POAG; surgical management of rhegmatogenous retinal detachment; inverted ILM flap vs conventional ILM peeling for >400 µm macular hole.
- [ ] Require each live result to have a non-empty clinical bottom line, at least one verified citation, at least one source, no `evidence_only` status, and an intent consistent with the question.
- [ ] Run GitHub Actions on the feature branch and inspect failures before changing production code.

### Task 2: Stabilize clinical intent and research-plan construction

**Files:**
- Modify: `workers/ophthasearch-v2/query-interpreter.js`
- Modify: `workers/ophthasearch-v2/research-planner.js`
- Test: `tests/ophthasearch-v2-query.test.mjs`
- Test: `tests/ophthasearch-production-v2.test.mjs`

**Interfaces:**
- Consumes: validated research request `{language, question}`.
- Produces: normalized intent with condition/question type/intervention/comparator/outcomes/modifiers and targeted research tracks.

- [ ] Add failing deterministic tests for the three acceptance questions, including Russian morphology and named procedures/drugs.
- [ ] Ensure fallback interpretation correctly resolves rhegmatogenous retinal detachment, inverted ILM flap, conventional ILM peeling, macular-hole size modifier, latanoprost, and timolol.
- [ ] Ensure comparison research tracks include both named arms; surgery tracks include clinically relevant surgery terms rather than generic management-only queries.
- [ ] Run the query/planner tests and require all to pass.

### Task 3: Tighten relevance and evidence selection

**Files:**
- Modify: `workers/ophthasearch-v2/relevance.js`
- Modify: `workers/ophthasearch-v2/evidence.js`
- Test: `tests/ophthasearch-v2-relevance.test.mjs`
- Test: `tests/ophthasearch-v2-evidence.test.mjs`

**Interfaces:**
- Consumes: normalized retrieval records plus clinical intent.
- Produces: ranked, deduplicated Evidence Pack containing sources that answer the clinician's question.

- [ ] Add failing tests showing that a molecular/proteomic RRD paper ranks below directly therapeutic RRD evidence for a surgical-management question.
- [ ] Add failing tests requiring both named comparison arms in high-priority comparison evidence where available.
- [ ] Increase relevance penalties for topic-only records that miss the requested management/comparison intent, while preserving recall when only limited evidence exists.
- [ ] Preserve evidence-design ranking only after clinical relevance; do not let a high design label rescue an off-question article.
- [ ] Run relevance/evidence tests and require all to pass.

### Task 4: Make Gemma synthesis robust and physician-facing

**Files:**
- Modify: `workers/ophthasearch-v2/reasoner.js`
- Modify: `workers/ophthasearch-v2/citations.js` only if tests expose verifier failures
- Test: `tests/ophthasearch-v2-reasoner.test.mjs`
- Test: `tests/ophthasearch-v2-pipeline.test.mjs`

**Interfaces:**
- Consumes: verified Evidence Pack.
- Produces: `clinical_bottom_line`, confidence, management steps, important caveats, and safe source metadata.

- [ ] Add tests requiring the reasoning prompt to explicitly answer the clinical decision asked, not summarize unrelated literature.
- [ ] Keep the main conclusion strict and source-cited; keep secondary regimen fields fail-soft.
- [ ] Keep registered trials out of efficacy claims.
- [ ] Ensure the pipeline retains a verified conclusion if only secondary regimen details fail validation.
- [ ] Run reasoner/pipeline tests and require all to pass.

### Task 5: Finish the single production UI

**Files:**
- Modify: `for-doctors/ophthasearch/index.html`
- Modify: `en/for-doctors/ophthasearch/index.html`
- Modify: `for-doctors/ophthasearch-v2/ophthasearch-v2.js`
- Modify: `for-doctors/ophthasearch-v2/ophthasearch-v2.css` only for required responsive/visibility fixes
- Test: `tests/ophthasearch-v2-ui.test.mjs`
- Test: `tests/ophthasearch-production-v2.test.mjs`

**Interfaces:**
- Consumes: public v2 response.
- Produces: one user flow: question → clinical conclusion → management → important caveats → collapsible key sources.

- [ ] Ensure stale answer content is hidden immediately when the query changes or a new search starts.
- [ ] Localize all browser-generated copy for RU/EN from one client implementation.
- [ ] Hide empty management/important blocks rather than showing technical fallback prose unless clinically useful.
- [ ] Never render plan/diagnostics/internal adapter state in the public DOM.
- [ ] Run UI/production tests and require all to pass.

### Task 6: CI, live verification, and production release

**Files:**
- Modify: `.github/workflows/ophthasearch-tests.yml` only if the new tests are not already included
- Modify: `.github/workflows/deploy-ophthasearch-worker.yml`
- Modify: `.github/workflows/ophthasearch-live-smoke.yml`

**Interfaces:**
- Consumes: feature-branch code and deployed Worker.
- Produces: a release gate that prevents declaring success without end-to-end evidence.

- [ ] Run the full OphthaSearch Node test suite on the feature branch.
- [ ] Open a PR into `main` only after tests pass.
- [ ] Merge/update `main`, allow the Worker deployment workflow and GitHub Pages deployment to complete.
- [ ] Run all three live smoke queries against the deployed Worker and verify the production RU page no longer serves legacy UI.
- [ ] Report completion only with commit/PR/workflow evidence and any remaining known limitations.