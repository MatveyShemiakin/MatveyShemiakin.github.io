# OphthaSearch Dataset Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a privacy-first D1-ready data foundation to OphthaSearch that records minimized research runs, accepts physician feedback, and creates a controlled boundary for future expert-curated training cases without changing clinical search behavior.

**Architecture:** Keep the existing `question -> intent -> retrieval -> Evidence Pack -> Gemma -> validation` pipeline intact. Attach isolated storage modules after verified synthesis, fail open when storage is disabled/unavailable, and expose only an opaque `run_id` for feedback. Production D1 remains unbound until a canary database has been provisioned and verified.

**Tech Stack:** Vanilla JavaScript, Cloudflare Workers, Cloudflare D1 SQL migrations, Web Crypto HMAC-SHA-256, Node.js built-in test runner, existing Vanilla HTML/CSS UI.

**Spec:** `docs/superpowers/specs/2026-08-29-ophthasearch-dataset-foundation-design.md`

## Global Constraints

- Do not store raw incoming questions or raw feedback comments.
- Missing `OPHTHASEARCH_DB` or `OPHTHASEARCH_DATASET_HASH_KEY` means dataset logging is disabled, never a clinical-search failure.
- Suspicious free text degrades to metadata-only storage and suppresses `answer_json`.
- Persist only minimized scientific source identifiers/metadata; never abstracts or article full text.
- D1 failures must never change clinical `status`, `answer`, citations, or successful `/v2/research` HTTP behavior.
- No automatic promotion to `training_cases`.
- No production D1 binding in this plan until isolated canary verification passes.
- No inline HTML styles; use existing OphthaSearch CSS conventions.

---

### Task 1: Privacy, serialization and migration foundation

**Files:**
- Create: `workers/ophthasearch-v2/storage/privacy.js`
- Create: `workers/ophthasearch-v2/storage/serialize.js`
- Create: `workers/ophthasearch-v2/storage/d1.js`
- Create: `workers/ophthasearch-v2/storage/feedback.js`
- Create: `migrations/0001_ophthasearch_dataset.sql`
- Create: `tests/ophthasearch-v2-storage.test.mjs`
- Modify: `.github/workflows/ophthasearch-tests.yml`

**Interfaces:**
- `sanitizeFreeText(text) -> { storageState, redactedText }`
- `fingerprintQuestion(question, secret) -> Promise<string>`
- `serializeResearchRun({ request, result, runId, fingerprint, privacy, latencyMs }) -> object`
- `serializeSourceRefs(evidencePack) -> array`
- `validateFeedbackRequest(payload) -> normalized object`
- `insertResearchRun(db, record) -> Promise<void>`
- `insertFeedback(db, record) -> Promise<void>`
- `researchRunExists(db, runId) -> Promise<boolean>`

- [ ] **Step 1: Write failing privacy/serialization tests**

Test examples must prove email, phone, long numeric IDs and explicit labels (`ФИО`, `номер истории`, `patient name`, `address`) never survive as stored free text; normalized equivalent questions yield the same HMAC; different secrets yield different fingerprints; source serialization omits `abstractText` and other content fields; metadata-only questions force `answer_json=null`.

```js
const safe = sanitizeFreeText('Тактика лечения ПОУГ?');
assert.equal(safe.storageState, 'redacted_text');
assert.equal(safe.redactedText, 'Тактика лечения ПОУГ?');

const unsafe = sanitizeFreeText('ФИО Иванов Иван, карта 123456789, тактика при ПОУГ');
assert.equal(unsafe.storageState, 'metadata_only');
assert.equal(unsafe.redactedText, null);
```

- [ ] **Step 2: Run the new test and confirm RED**

Run: `node --test tests/ophthasearch-v2-storage.test.mjs`
Expected: FAIL because storage modules/migration do not exist.

- [ ] **Step 3: Implement privacy and HMAC**

Use Web Crypto only. Normalize whitespace and Unicode before HMAC. Import key as `HMAC` + `SHA-256`; return lowercase hex. Sanitizer is conservative: if any direct-identifier pattern is detected, persist no free text rather than attempting partial reconstruction.

```js
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(normalized));
```

- [ ] **Step 4: Implement minimized serializers and D1 adapters**

`source_refs_json` may contain only `source_id`, DOI, PMID, NCT, guideline metadata, canonical URL, title, year, evidence label and provider provenance. D1 functions use prepared statements and do not log raw values.

- [ ] **Step 5: Add SQL migration with constraints/indexes**

Create `research_runs`, `feedback`, `training_cases`. Add `CHECK` constraints for statuses, ratings, curation state, quality 1–5 and FK relationships. Add indexes listed in the approved spec.

- [ ] **Step 6: Update CI test command and verify GREEN**

Add `tests/ophthasearch-v2-storage.test.mjs` to `.github/workflows/ophthasearch-tests.yml` and run the branch workflow. Expected: all pre-existing tests + storage tests pass.

---

### Task 2: Fail-open research logging and opaque run IDs

**Files:**
- Modify: `workers/ophthasearch-v2/pipeline.js`
- Modify: `tests/ophthasearch-v2-pipeline.test.mjs`

**Interfaces:**
- Public result may add `run_id` only; never `question_fingerprint`, storage state or D1 errors.
- Dataset logging is enabled only when `env.OPHTHASEARCH_DB` and non-empty `env.OPHTHASEARCH_DATASET_HASH_KEY` both exist.

- [ ] **Step 1: Write failing integration tests**

Cover four cases: storage disabled => no `run_id`; storage enabled + successful insert => opaque UUID returned; D1 insert throws => clinical response remains 200 and unchanged except no usable feedback dependency; stored payload contains no raw question/abstract; sensitive question stores metadata-only and null answer.

- [ ] **Step 2: Run pipeline tests and confirm RED**

Run: `node --test tests/ophthasearch-v2-pipeline.test.mjs tests/ophthasearch-v2-storage.test.mjs`
Expected: FAIL on missing logging integration.

- [ ] **Step 3: Integrate storage after verified pipeline result**

Measure scientific pipeline latency before D1 write. Generate `crypto.randomUUID()`, HMAC the validated question, serialize minimized result, `await insertResearchRun(...)` inside `try/catch`. Use dependency injection in tests (`deps.datasetStore`) so D1 is not required locally.

- [ ] **Step 4: Keep public contract minimal**

`publicResult()` returns existing fields plus `run_id` when logging succeeded. It must not expose fingerprint, privacy state, SQL errors or full Evidence Pack.

- [ ] **Step 5: Run focused + full OphthaSearch CI**

Expected: existing retrieval/reasoning behavior remains green with dataset logging disabled.

---

### Task 3: Feedback endpoint and Worker routing

**Files:**
- Create: `workers/ophthasearch-v2/feedback-handler.js`
- Modify: `_worker.js`
- Modify: `workers/ophthasearch-v2/storage/feedback.js`
- Create: `tests/ophthasearch-v2-feedback.test.mjs`
- Modify: `.github/workflows/ophthasearch-tests.yml`

**Interfaces:**
- `POST /v2/feedback`
- Request: `{ schemaVersion:'2.0', runId, rating:'helpful'|'problem', errorTags?: string[], comment?: string }`
- Response success: `{ ok:true, feedback_id }`

- [ ] **Step 1: Write endpoint contract tests**

Assert strict production Origin, JSON content type, bounded body, UUID-like `runId`, rating allow-list, error tag allow-list, missing-run rejection, privacy handling of comments, no research data in response, and routing without affecting `/v1/synthesize` or static assets.

- [ ] **Step 2: Run feedback tests and confirm RED**

Run: `node --test tests/ophthasearch-v2-feedback.test.mjs`
Expected: FAIL because route/handler do not exist.

- [ ] **Step 3: Implement validation + persistence handler**

Reuse the same CORS origin semantics as `/v2/research`. If storage binding/secret is absent, return a controlled unavailable response; never expose SQL/internal messages. Verify research run exists before insert.

- [ ] **Step 4: Route `/v2/feedback` in `_worker.js`**

Keep `/v2/research`, `/v1/synthesize` and ASSETS behavior unchanged.

- [ ] **Step 5: Update CI and verify GREEN**

Add feedback test file to the explicit Node test list.

---

### Task 4: Physician feedback UI and privacy notice

**Files:**
- Modify: `for-doctors/ophthasearch/index.html`
- Modify: `en/for-doctors/ophthasearch/index.html`
- Modify: `for-doctors/ophthasearch-v2/index.html`
- Modify: `for-doctors/ophthasearch-v2/ophthasearch-v2.js`
- Modify: `for-doctors/ophthasearch-v2/ophthasearch-v2.css`
- Modify: `tests/ophthasearch-v2-ui.test.mjs`
- Modify: `tests/ophthasearch-production-v2.test.mjs`

**Interfaces:**
- `requestFeedback(runId, feedback, options) -> Promise<object>`
- Feedback UI is hidden unless latest result has `run_id`.

- [ ] **Step 1: Write failing UI/static tests**

Require visible non-blocking RU/EN warning against patient names/contacts/chart numbers. Require feedback hook after answer, `Полезно` / `Есть проблема` equivalents, error-tag controls, no inline styles, stale input clearing feedback state, and `/v2/feedback` request using latest `run_id`.

- [ ] **Step 2: Run UI tests and confirm RED**

Run: `node --test tests/ophthasearch-v2-ui.test.mjs tests/ophthasearch-production-v2.test.mjs`
Expected: FAIL on missing notice/feedback hooks.

- [ ] **Step 3: Implement minimal semantic HTML + existing-design CSS**

Feedback stays visually secondary to the clinical answer. Do not expose terms D1, dataset, training, pipeline, adapters or Evidence Pack.

- [ ] **Step 4: Implement client feedback state machine**

On new query/change: hide/reset feedback. After successful answer with `run_id`: show controls. A positive click submits immediately; problem reveals bounded tags and optional comment, then submits. Failure is neutral and never removes the clinical answer.

- [ ] **Step 5: Run UI + production tests and verify GREEN**

Also ensure current XSS guard remains: no `innerHTML`, `insertAdjacentHTML` or `document.write`.

---

### Task 5: Canary provisioning workflow, D1 migration gate and full verification

**Files:**
- Create: `.github/workflows/ophthasearch-dataset-canary.yml`
- Modify: `tests/ophthasearch-deployment.test.mjs`
- Do not modify production `wrangler.jsonc` with a D1 binding yet.

**Interfaces:**
- Canary workflow uses Cloudflare secrets already present for Wrangler deployment.
- Database binding name remains `OPHTHASEARCH_DB`.
- HMAC secret name remains `OPHTHASEARCH_DATASET_HASH_KEY`.

- [ ] **Step 1: Write deployment tests first**

Require production `wrangler.jsonc` to remain without `OPHTHASEARCH_DB` during Phase A. Require canary workflow to create/use an isolated D1 resource, apply `migrations/0001_ophthasearch_dataset.sql`, configure a canary-only Wrangler config generated in CI, deploy an isolated Worker, run research logging/feedback smoke, and then run the existing live clinical acceptance set.

- [ ] **Step 2: Confirm deployment test RED**

Run: `node --test tests/ophthasearch-deployment.test.mjs`
Expected: FAIL because canary dataset workflow is absent.

- [ ] **Step 3: Implement canary workflow without production mutation**

Use Wrangler CLI with existing `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`. The workflow must be manually dispatchable and branch-scoped. It may create/reuse a named canary D1 database, apply migrations and deploy a distinct canary Worker. Never commit a production database ID from canary.

- [ ] **Step 4: Run static/CI verification**

All Node tests must pass before any live canary provisioning.

- [ ] **Step 5: Run canary D1 smoke**

Verify: safe question creates a run with `run_id`; sensitive question returns the same clinical answer but stores metadata-only/no answer text; feedback links to the run; scientific response remains usable with dataset storage deliberately disabled; D1 overhead is recorded.

- [ ] **Step 6: Re-run the 20-case clinical acceptance suite**

Dataset integration is accepted only if existing clinical quality/latency checks remain green. Production D1 remains unbound until this evidence is reviewed.

---

## Final Verification

- [ ] Run the complete explicit OphthaSearch Node test suite from `.github/workflows/ophthasearch-tests.yml`.
- [ ] Confirm production `wrangler.jsonc` contains no D1 binding yet.
- [ ] Confirm no raw clinical question appears in storage SQL or logging code.
- [ ] Confirm abstracts/full text are absent from serialized dataset records.
- [ ] Confirm no storage failure can change a successful clinical answer.
- [ ] Confirm RU/EN feedback UI is hidden when `run_id` is absent.
- [ ] Confirm canary D1 + feedback smoke passes before proposing production enablement.
