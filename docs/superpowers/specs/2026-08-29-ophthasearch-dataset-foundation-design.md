# OphthaSearch Dataset Foundation — Design

Date: 2026-08-29
Status: proposed, user-approved architecture pending written-spec review
Owner: matveyshemyakin.ru / OphthaSearch

## 1. Goal

Create a privacy-first data foundation that lets OphthaSearch accumulate high-quality, versioned clinical research cases for future evaluation, supervised fine-tuning (SFT/LoRA/QLoRA), and preference optimization (DPO), without changing the current scientific retrieval and clinical-answer behavior.

The first implementation milestone is D1-only. R2 export storage and model fine-tuning are explicitly deferred until enough expert-reviewed cases exist.

## 2. Non-goals

This milestone does not:

- train or fine-tune a model;
- store full-text scientific articles;
- create a patient medical record system;
- collect names, phone numbers, emails, chart numbers, addresses, or other direct patient identifiers;
- make D1 availability a dependency for answering a clinical question;
- expose pipeline diagnostics or internal dataset records in the physician-facing UI;
- add R2, analytics dashboards, or automated model-training jobs yet.

## 3. Existing system boundary

OphthaSearch v2 already runs server-side as:

`question -> intent -> research plan -> retrieval -> Evidence Pack -> Gemma -> validation -> public result`

The dataset subsystem is attached after a research result is produced. It observes the run and writes a minimized record asynchronously when possible. Failure of storage must never change the research response returned to the physician.

## 4. Recommended architecture

```text
Physician question
    |
    v
OphthaSearch /v2/research
    |
    +--> intent -> retrieval -> Evidence Pack -> reasoner -> verification
    |                                             |
    |                                             v
    |                                      clinical answer
    |                                             |
    +---------------------------------------------+
                                                  |
                                       privacy/minimization gate
                                                  |
                         +------------------------+---------------------+
                         |                                              |
                  safe-to-store                                      blocked
                         |                                              |
                         v                                              v
                 D1 research_runs                         hash + structured metadata only
                         |
                         v
                  physician feedback
                         |
                         v
                     feedback
                         |
                  expert curation
                         |
                         v
                   training_cases
                         |
                 future version export
                         |
                         v
                  R2 dataset snapshots
```

## 5. Storage technology

### 5.1 Cloudflare D1 — milestone 1

Binding name: `OPHTHASEARCH_DB`.

D1 stores normalized metadata, approved answers, feedback, and references to scientific identifiers. It does not store article full text.

D1 is selected because the Worker already runs on Cloudflare and D1 avoids introducing another application server.

### 5.2 Cloudflare R2 — deferred

R2 is introduced only when versioned dataset exports are useful. It will store immutable export artifacts such as JSONL/Parquet snapshots, not live application state.

## 6. Data model

### 6.1 `research_runs`

One row per research request that reaches the pipeline.

Fields:

- `run_id TEXT PRIMARY KEY` — random UUID generated server-side;
- `created_at TEXT NOT NULL` — UTC ISO timestamp;
- `schema_version TEXT NOT NULL` — dataset schema version;
- `pipeline_version TEXT NOT NULL` — application/pipeline version identifier;
- `language TEXT NOT NULL` — `ru` or `en`;
- `question_hash TEXT NOT NULL` — SHA-256 of normalized original question; used for deduplication without requiring raw storage;
- `question_redacted TEXT NULL` — only stored when privacy gate classifies the text as safe;
- `question_storage_state TEXT NOT NULL` — `redacted_text`, `metadata_only`, or `rejected`;
- `intent_json TEXT NOT NULL` — normalized structured intent;
- `status TEXT NOT NULL` — `complete`, `partial`, or `evidence_only`;
- `source_refs_json TEXT NOT NULL` — minimized list of source identifiers and metadata;
- `answer_json TEXT NULL` — verified structured answer; null if no safe synthesis exists;
- `latency_ms INTEGER NULL`;
- `storage_error TEXT NULL` — reserved for controlled internal diagnostics if a deferred write is retried; never sent to the UI.

`source_refs_json` may contain PMID, DOI, NCT, guideline registry ID, title, year, and evidence class. It must not contain article full text or fetched abstracts.

### 6.2 `feedback`

One or more feedback rows may refer to the same run.

Fields:

- `feedback_id TEXT PRIMARY KEY`;
- `run_id TEXT NOT NULL`;
- `created_at TEXT NOT NULL`;
- `rating TEXT NOT NULL` — initially `helpful` or `problem`;
- `error_tags_json TEXT NOT NULL` — bounded allow-list of error categories;
- `comment_redacted TEXT NULL` — optional text after privacy gate;
- `comment_storage_state TEXT NOT NULL`;
- `review_status TEXT NOT NULL DEFAULT 'unreviewed'`;
- foreign key to `research_runs(run_id)`.

Initial error-tag allow-list:

- `irrelevant_sources`
- `wrong_conclusion`
- `missing_evidence`
- `wrong_management`
- `citation_problem`
- `too_slow`
- `other`

### 6.3 `training_cases`

Only expert-curated runs enter this table. A normal user rating never automatically creates a training case.

Fields:

- `case_id TEXT PRIMARY KEY`;
- `run_id TEXT NOT NULL UNIQUE`;
- `created_at TEXT NOT NULL`;
- `approved_question TEXT NOT NULL` — manually reviewed, de-identified canonical question;
- `approved_intent_json TEXT NOT NULL`;
- `approved_answer_json TEXT NOT NULL`;
- `approved_source_refs_json TEXT NOT NULL`;
- `quality_score INTEGER NOT NULL` — integer 1–5;
- `curation_status TEXT NOT NULL` — `approved`, `needs_revision`, `excluded`;
- `dataset_version TEXT NULL` — populated only when included in a released dataset version;
- `curation_notes TEXT NULL`.

No record is eligible for model training unless `curation_status='approved'` and `quality_score>=4`.

## 7. Privacy and minimization gate

Privacy is enforced before any free-text write.

### 7.1 Always retained

The system may retain:

- random run ID;
- UTC timestamp;
- language;
- pipeline/schema versions;
- question hash;
- normalized intent;
- status;
- minimized scientific source identifiers;
- verified structured answer;
- latency.

### 7.2 Free-text policy

The raw incoming question is never written directly to D1.

A deterministic sanitizer produces `question_redacted`. The sanitizer detects and removes common direct identifiers, including:

- email addresses;
- phone numbers;
- URLs containing query parameters that look like identifiers;
- long digit sequences that may be chart/document/account numbers;
- explicit labels such as `ФИО`, `имя пациента`, `телефон`, `email`, `номер истории`, `номер карты`, `адрес`, and English equivalents.

If a suspicious identifier remains or confidence is insufficient, `question_redacted` is not stored and `question_storage_state='metadata_only'`.

The same rule applies to optional feedback comments.

The sanitizer is a minimization guard, not a guarantee of perfect anonymization. Therefore the storage default is conservative: uncertainty means no free-text persistence.

### 7.3 UI warning

The search form should include a short physician-facing reminder not to enter patient names, contacts, chart numbers, or other direct identifiers. This is informational and must not obstruct normal use.

## 8. Scientific-source policy

OphthaSearch stores identifiers and provenance, not copyrighted article content.

Permitted source fields include:

- PMID;
- DOI;
- NCT;
- guideline registry identifier;
- canonical URL;
- title;
- publication year;
- evidence class / hierarchy label;
- provider provenance.

Abstracts, full text, figures, tables, and long quoted passages are not persisted as dataset content.

## 9. Worker integration

### 9.1 Storage module

Add a focused module under `workers/ophthasearch-v2/storage/` with three responsibilities:

1. privacy-safe normalization;
2. D1 writes;
3. dataset-specific serialization.

The research pipeline remains responsible for research only.

### 9.2 Research write

After the pipeline produces the final verified result:

1. generate `run_id`;
2. construct a minimized storage record;
3. run privacy gate;
4. write to D1 through `ctx.waitUntil(...)` when a valid D1 binding and execution context exist;
5. return the physician-facing answer immediately with `run_id` included as opaque metadata for later feedback.

If D1 is unavailable, missing, or write fails, the `/v2/research` response remains successful. Storage failure is observable in Worker logs only.

### 9.3 Feedback endpoint

Add `POST /v2/feedback`.

Request contract:

- `schemaVersion`;
- `runId`;
- `rating`;
- optional bounded `errorTags`;
- optional `comment`.

The endpoint:

- uses the same production-origin CORS policy;
- validates body size and JSON content type;
- verifies `runId` exists before inserting feedback;
- applies privacy gate to comment text;
- never returns the stored research content;
- rate-limits by existing Cloudflare mechanisms if abuse becomes a real problem; custom rate-limiting is deferred.

## 10. Physician-facing feedback UI

After a successful answer, show a compact feedback control:

`Полезно` / `Есть проблема`

When `Есть проблема` is selected, show the bounded error-tag choices. A free-text comment is optional and secondary.

The feedback UI must not expose dataset terminology, training concepts, D1, diagnostic adapters, or pipeline internals.

English version uses equivalent labels.

## 11. Curation boundary

Curation is deliberately separate from normal site use.

Milestone 1 does not build a public admin dashboard. Expert curation may initially be performed through controlled scripts/SQL or a later authenticated internal tool.

Automatic promotion from feedback to `training_cases` is forbidden.

A future curation flow can compare:

- original verified answer;
- physician feedback;
- revised/approved answer;
- source set;
- pipeline version.

This is the foundation for future SFT examples and DPO chosen/rejected pairs.

## 12. Dataset versioning

Dataset versions are immutable logical releases.

Proposed naming:

- `ophthasearch-clinical-v0.1`
- `ophthasearch-clinical-v0.2`
- `ophthasearch-clinical-v1.0`

A version contains only expert-approved cases. Adding or correcting cases produces a new version; an old version is not mutated.

R2 export is deferred until the first meaningful release candidate exists.

## 13. Failure handling

Required invariants:

1. D1 failure must never make scientific search fail.
2. Feedback failure must never alter an already-rendered answer.
3. Invalid or suspicious free text must degrade to metadata-only storage, not to a failed clinical request.
4. Missing D1 binding in local/test environments is treated as storage-disabled, not as an application error.
5. No storage error details are returned to physicians.
6. No unverified answer is promoted to a training case.

## 14. Testing strategy

Implementation follows TDD.

### Unit tests

- privacy sanitizer redacts email, phone, direct identifiers, and long numeric IDs;
- uncertain free text becomes metadata-only;
- question hashing is deterministic after normalization;
- source serializer excludes abstracts/full text;
- dataset serializer keeps only approved fields;
- invalid feedback tags are rejected.

### D1 contract tests

- migrations create all expected tables/indexes;
- research run inserts are idempotent by `run_id`;
- feedback requires an existing run;
- one run can accept multiple feedback rows;
- training case requires valid run and curation constraints.

### Pipeline tests

- research success is preserved when D1 insert throws;
- storage receives only minimized records;
- public response includes opaque `run_id` but no private storage metadata;
- `evidence_only` runs may be logged but are never auto-promoted.

### UI tests

- feedback controls appear only after a successful answer;
- stale result reset also removes stale feedback state;
- feedback request uses `/v2/feedback` and the returned `run_id`;
- user sees a neutral success/error state without internal diagnostics.

### Deployment tests

- Wrangler config declares `OPHTHASEARCH_DB` only in environments where the D1 resource exists;
- canary deployment runs migrations against canary D1 first;
- production D1 migration occurs only after canary tests are green;
- production scientific response is smoke-tested with storage deliberately unavailable to verify fail-open behavior.

## 15. Rollout

### Phase A — code and schema, storage disabled

- migrations;
- storage/privacy modules;
- unit and contract tests;
- no production binding yet.

### Phase B — isolated canary D1

- create canary D1 database;
- bind canary Worker;
- run migrations;
- verify research writes, metadata-only privacy fallback, and feedback writes;
- execute existing OphthaSearch live clinical acceptance suite.

### Phase C — production D1

Only after canary is green:

- create/bind production D1;
- run production migrations;
- enable research-run logging;
- enable compact feedback UI;
- monitor write failures and latency impact.

### Phase D — curation and dataset exports

Deferred until sufficient real, reviewed cases accumulate.

- curation tooling;
- approved training cases;
- versioned export job;
- R2 snapshots;
- later evaluation of SFT/LoRA/QLoRA/DPO.

## 16. Success criteria for milestone 1

Milestone 1 is complete only when:

- OphthaSearch returns the same clinical answers with or without D1;
- every stored run has a stable opaque `run_id` and question hash;
- no raw input question is written directly;
- suspicious questions persist metadata only;
- scientific full text/abstracts are not stored;
- feedback can be linked to a run without exposing research records;
- only explicitly curated cases can enter `training_cases`;
- all unit/contract/pipeline/UI tests are green;
- existing live clinical acceptance cases remain green;
- production is not enabled before isolated canary verification.

## 17. Future extension points

Explicitly deferred but supported by this schema:

- DPO `chosen` / `rejected` pairs derived from expert revisions;
- dataset quality dashboards;
- authenticated curation interface;
- R2 JSONL/Parquet exports;
- automated evaluation harness comparing pipeline versions;
- LoRA/QLoRA experiments against a fixed validation set;
- model-independent dataset portability.
