# OphthaSearch v2 Production Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/for-doctors/ophthasearch/` and its English counterpart use the server-side OphthaSearch v2 research pipeline: AI interpretation → multi-source retrieval → relevance gate → Evidence Pack → Gemma 4 synthesis → verified physician-facing answer.

**Architecture:** Keep the static Vanilla HTML/CSS/JS site and Cloudflare Worker. The public page becomes a thin UI over `/v2/research`; browser-side heuristic PICO/signal synthesis is no longer loaded on the production route. The Worker keeps PubMed, Europe PMC, ClinicalTrials.gov and optional OpenAlex, adds J-STAGE server-side, uses Workers AI for intent interpretation when available, then filters and reasons only over evidence that survives relevance scoring.

**Tech Stack:** Vanilla HTML5/CSS3/JS, Cloudflare Workers AI, Node test runner, GitHub Pages/static assets.

**Spec:** `docs/superpowers/plans/2026-08-24-ophthasearch-gemma4-workers-ai.md` plus the approved UX direction from 2026-08-25.

## Global Constraints

- No React, npm UI framework, bundler or CSS framework.
- No inline `style=` attributes.
- Preserve the existing site header/footer, language switcher, theme, mobile navigation and doctor-retention integration.
- The browser must not call scientific provider APIs directly on the production page.
- Gemma analyzes only server-filtered Evidence Pack sources and never replaces retrieval/relevance filtering.
- Clinical bottom-line citations remain strict; unsupported secondary regimen details fail soft rather than discarding the whole synthesis.
- Keep the main production URL unchanged: `/for-doctors/ophthasearch/` and `/en/for-doctors/ophthasearch/`.

---

### Task 1: Production-route regression tests

**Files:**
- Create: `tests/ophthasearch-production-v2.test.mjs`
- Modify: `tests/ophthasearch-v2-relevance.test.mjs`

**Interfaces:**
- Consumes: existing v2 UI hooks and `scoreMedicalRelevance`.
- Produces: tests proving the production pages load the v2 client, hide legacy PICO/provider/signal UI, and reject condition-only papers when a named comparison is requested.

- [ ] **Step 1: Write failing production-route tests**
- [ ] **Step 2: Write failing named-intervention relevance tests**
- [ ] **Step 3: Verify expected failures before implementation**

### Task 2: AI-first server-side question interpretation

**Files:**
- Modify: `workers/ophthasearch-v2/query-interpreter.js`
- Modify: `workers/ophthasearch-v2/pipeline.js`
- Test: `tests/ophthasearch-production-v2.test.mjs`

**Interfaces:**
- Produces: `buildIntentSchema()`, `buildIntentMessages()`, `interpretIntentWithAi(request, env, deps)` returning the existing normalized intent shape.
- Fallback: deterministic parser remains available if Workers AI fails.

- [ ] **Step 1: Add tests for a Russian comparison such as latanoprost vs timolol**
- [ ] **Step 2: Add structured Workers AI intent interpreter using the same Gemma 4 model**
- [ ] **Step 3: Wire it into `runResearchPipeline` without removing deterministic fallback**
- [ ] **Step 4: Verify named interventions/comparators survive normalization**

### Task 3: Query planning and relevance gate for named interventions

**Files:**
- Modify: `workers/ophthasearch-v2/research-planner.js`
- Modify: `workers/ophthasearch-v2/relevance.js`
- Test: `tests/ophthasearch-v2-relevance.test.mjs`

**Interfaces:**
- Planner consumes `intent.interventions` and `intent.comparators` and includes specific names in efficacy/safety/comparison queries.
- Relevance scorer gives explicit weight to requested interventions/comparators and penalizes comparison papers that mention only the condition.

- [ ] **Step 1: Add failing planner/relevance assertions**
- [ ] **Step 2: Include named intervention/comparator terms in all relevant search tracks**
- [ ] **Step 3: Add comparison-specific relevance scoring/penalty**
- [ ] **Step 4: Verify condition-only papers fall below the production threshold for named comparisons**

### Task 4: Preserve Asia-Pacific coverage through J-STAGE server-side

**Files:**
- Create: `workers/ophthasearch-v2/adapters/jstage.js`
- Modify: `workers/ophthasearch-v2/pipeline.js`
- Modify: `workers/ophthasearch-v2/research-planner.js`
- Test: `tests/ophthasearch-production-v2.test.mjs`

**Interfaces:**
- `search(track, deps)` returns `{ records, total }` in the same normalized document shape used by other v2 adapters.
- J-STAGE runs only from the Worker; browser-side direct API calls are removed from production.

- [ ] **Step 1: Add adapter parsing/query tests with a representative J-STAGE XML fixture**
- [ ] **Step 2: Implement safe XML text extraction without browser DOM dependencies**
- [ ] **Step 3: Register `jstage` in default adapters**
- [ ] **Step 4: Add `jstage` to efficacy/safety/alternatives/pivotal tracks**

### Task 5: Replace the public OphthaSearch UI with the v2 physician-first UI

**Files:**
- Modify: `for-doctors/ophthasearch/index.html`
- Modify: `en/for-doctors/ophthasearch/index.html`
- Modify: `for-doctors/ophthasearch-v2/ophthasearch-v2.js`
- Modify: `for-doctors/ophthasearch-v2/ophthasearch-v2.css`
- Test: `tests/ophthasearch-production-v2.test.mjs`

**Interfaces:**
- Production pages expose only `data-v2-search-form`, clinical bottom line, management, important considerations and collapsible sources.
- Client posts only to the deployed `/v2/research` Worker endpoint.
- Client localizes labels/messages from `document.documentElement.lang`.

- [ ] **Step 1: Replace legacy search workspace in RU while preserving header/footer and retention blocks**
- [ ] **Step 2: Replace legacy search workspace in EN with identical hooks**
- [ ] **Step 3: Make v2 client bilingual**
- [ ] **Step 4: Ensure old PICO, provider boards, hit counters, evidence-signal cards and heuristic synthesis are absent from production markup**
- [ ] **Step 5: Keep sources collapsed by default and show confidence + source count in the answer header**

### Task 6: Verification and deployment check

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run targeted Node tests for production UI, v2 relevance, reasoner and pipeline**
- [ ] **Step 2: Inspect the final production HTML/JS for no inline styles and no direct provider API calls**
- [ ] **Step 3: Confirm Cloudflare deployment sees the final main commit**
- [ ] **Step 4: Run a live clinical query on the deployed Worker, including a named comparison (latanoprost vs timolol), and verify the response is a unified synthesis or a controlled evidence-only fallback**
