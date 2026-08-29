# OphthaSearch Dataset Foundation — Design

Date: 2026-08-29
Status: user-approved architecture, pending written-spec review
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

The dataset subsystem attaches after a research result is produced. It observes the verified run, minimizes it, applies the privacy gate, and attempts a D1 write. Storage failure must never change the clinical response returned to the physician.

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
                  safe-to-store                                  sensitive/uncertain
                         |                                              |
                         v                                              v
                 D1 research_runs                     metadata + source refs only
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

D1 stores normalized metadata, privacy-approved question text, verified answers when eligible, feedback, and references to scientific identifiers. It does not store article full text.

D1 is selected because the Worker already runs on Cloudflare and D1 avoids introducing another application server.

### 5.2 Cloudflare R2 — deferred

R2 is introduced only when versioned dataset exports are useful. It will store immutable export artifacts such as JSONL/Parquet snapshots, not live application state.

## 6. Data model

### 6.1 `research_runs`

One row per research request that reaches the pipeline and for which dataset logging is enabled.

Fields:

- `run_id TEXT PRIMARY KEY` — random UUID generated server-side;
- `created_at TEXT NOT NULL` — UTC ISO timestamp;
- `schema_version TEXT NOT NULL` — dataset schema version;
- `pipeline_version TEXT NOT NULL` — application/pipeline version identifier;
- `language TEXT NOT NULL` — `ru` or `en`;
- `question_fingerprint TEXT NOT NULL` — HMAC-SHA-256 of normalized original question using a server-only secret; used for deduplication without storing the original text;
- `question_redacted TEXT NULL` — only stored when the privacy gate classifies the text as safe;
- `question_storage_state TEXT NOT NULL` — `redacted_text` or `metadata_only`;
- `intent_json TEXT NOT NULL` — normalized structured intent;
- `status TEXT NOT NULL` — `complete`, `partial`, or `evidence_only`;
- `source_refs_json TEXT NOT NULL` — minimized list of source identifiers and metadata;
- `answer_json TEXT NULL` — verified structured answer only when the question passed the free-text privacy gate; otherwise null;
- `latency_ms INTEGER NULL`.

`source_refs_json` may contain PMID, DOI, NCT, guideline registry ID, canonical URL, title, year, evidence class, and provider provenance. It must not contain article full text or fetched abstracts.

Recommended indexes:

- `research_runs(created_at)`;
- `research_runs(question_fingerprint)`;
- `research_runs(status)`.

### 6.2 `feedback`

One or more feedback rows may refer to the same run.

Fields:

- `feedback_id TEXT PRIMARY KEY`;
- `run_id TEXT NOT NULL`;
- `created_at TEXT NOT NULL`;
- `rating TEXT NOT NULL` — initially `helpful` or `problem`;
- `error_tags_json TEXT NOT NULL` — bounded allow-list of error categories;
- `comment_redacted TEXT NULL` — optional text after privacy gate;
- `comment_storage_state TEXT NOT NULL` — `redacted_text` or `metadata_only`;
- `review_status TEXT NOT NULL DEFAULT 'unreviewed'`;
- foreign key to `research_runs(run_id)`.

Recommended indexes:

- `feedback(run_id)`;
- `feedback(created_at)`;
- `feedback(review_status)`.

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

Recommended indexes:

- `training_cases(curation_status, quality_score)`;
- `training_cases(dataset_version)`.

## 7. Privacy and minimization gate

Privacy is enforced before any free-text write.

### 7.1 Always eligible for retention

The system may retain:

- random run ID;
- UTC timestamp;
- language;
- pipeline/schema versions;
- HMAC question fingerprint;
- normalized intent;
- status;
- minimized scientific source identifiers;
- latency.

The HMAC key is stored only as a Worker secret, proposed name `OPHTHASEARCH_DATASET_HASH_KEY`. If the secret is missing, dataset logging is disabled rather than falling back to an unhashed or weak fingerprint.

### 7.2 Free-text policy

The raw incoming question is never written directly to D1.

A deterministic sanitizer produces `question_redacted`. The sanitizer detects and removes common direct identifiers, including:

- email addresses;
- phone numbers;
- URLs containing query parameters that look like identifiers;
- long digit sequences that may be chart/document/account numbers;
- explicit labels such as `ФИО`, `имя пациента`, `телефон`, `email`, `номер истории`, `номер карты`, `адрес`, and English equivalents.

If a suspicious identifier remains or confidence is insufficient:

- `question_redacted` is null;
- `question_storage_state='metadata_only'`;
- `answer_json` is also null because a generated answer may echo identifiers from the input.

The same conservative rule applies to optional feedback comments.

The sanitizer is a minimization guard, not a guarantee of perfect anonymization. Uncertainty therefore means no free-text persistence.

### 7.3 UI warning

The search form should include a short physician-facing reminder not to enter patient names, contacts, chart numbers, addresses, or other direct identifiers. This is informational and must not obstruct normal use.

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

Add focused modules under `workers/ophthasearch-v2/storage/` with separate responsibilities:

- `privacy.js` — normalization, direct-identifier detection, redaction, HMAC fingerprinting;
- `serialize.js` — minimize research results and scientific source references;
- `d1.js` — D1 persistence only;
- `feedback.js` — feedback validation/serialization.

The research pipeline remains responsible for research only.

### 9.2 Research write

After the pipeline produces the final verified result:

1. generate `run_id`;
2. construct a minimized storage record;
3. run privacy gate;
4. if D1 binding and HMAC secret exist, attempt the D1 insert with `await` inside a local `try/catch`;
5. if the insert fails, log the storage failure internally and continue;
6. return the physician-facing answer with the opaque `run_id` only when dataset logging is enabled for that request.

The D1 insert is intentionally awaited in milestone 1 to avoid a race where a physician submits feedback before the corresponding `research_runs` row exists. D1 write latency is measured. If it becomes material, a later design may introduce a queue or other durable asynchronous mechanism.

Storage success or failure never changes `status`, `answer`, citations, or HTTP success of a valid research request.

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
- applies the privacy gate to comment text;
- never returns stored research content;
- returns a neutral success response with a feedback ID;
- rate-limits by Cloudflare-native controls if abuse becomes a demonstrated problem; custom rate-limiting is deferred.

## 10. Physician-facing feedback UI

After a successful answer with a `run_id`, show a compact feedback control:

`Полезно` / `Есть проблема`

When `Есть проблема` is selected, show the bounded error-tag choices. A free-text comment is optional and secondary.

If no `run_id` is returned because dataset logging is disabled/unavailable, the feedback control is hidden. The clinical answer remains fully usable.

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
4. Missing D1 binding or HMAC secret in local/test environments is treated as storage-disabled, not as an application error.
5. No storage error details are returned to physicians.
6. No unverified answer is promoted to a training case.
7. No raw question or feedback comment is written before the privacy gate.

## 14. Testing strategy

Implementation follows TDD.

### Unit tests

- privacy sanitizer redacts email, phone, direct identifier labels, and long numeric IDs;
- uncertain free text becomes metadata-only;
- HMAC question fingerprint is deterministic for normalized equivalent inputs and changes with a different secret;
- no raw question is present in storage payloads;
- answer storage is disabled when the question is metadata-only;
- source serializer excludes abstracts/full text;
- dataset serializer keeps only approved fields;
- invalid feedback tags are rejected.

### D1 contract tests

- migrations create all expected tables, constraints, and indexes;
- research run inserts are idempotent by `run_id`;
- feedback requires an existing run;
- one run can accept multiple feedback rows;
- training case requires a valid run and curation constraints;
- `quality_score` is restricted to 1–5;
- status fields are constrained to their allow-lists.

### Pipeline tests

- research success is preserved when D1 insert throws;
- storage receives only minimized records;
- public response includes opaque `run_id` only when logging is enabled;
- public response never includes private storage state or HMAC fingerprint;
- `evidence_only` runs may be logged but are never auto-promoted;
- D1 write latency is recorded separately from scientific pipeline latency.

### UI tests

- feedback controls appear only after a successful answer with `run_id`;
- stale result reset also removes stale feedback state;
- feedback request uses `/v2/feedback` and the returned `run_id`;
- user sees a neutral feedback success/error state without internal diagnostics;
- direct-identifier warning is visible but non-blocking.

### Deployment tests

- production Wrangler config is not given a D1 binding until the production database exists;
- canary deployment runs migrations against canary D1 first;
- production D1 migration occurs only after canary tests are green;
- production scientific response is smoke-tested with storage deliberately unavailable to verify fail-open behavior.

## 15. Rollout

### Phase A — code and schema, storage disabled

- migrations;
- storage/privacy modules;
- unit and contract tests;
- feedback endpoint contract with fake/in-memory D1 in tests;
- no production binding or dataset secret yet.

### Phase B — isolated canary D1

- create canary D1 database;
- configure canary `OPHTHASEARCH_DB` and `OPHTHASEARCH_DATASET_HASH_KEY`;
- run migrations;
- verify research writes, metadata-only privacy fallback, and feedback writes;
- measure D1 write overhead;
- execute existing OphthaSearch live clinical acceptance suite.

### Phase C — production D1

Only after canary is green:

- create/bind production D1;
- configure production HMAC secret;
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
- every stored run has a stable opaque `run_id` and HMAC question fingerprint;
- no raw input question is written directly;
- suspicious questions persist metadata only and do not persist generated answer text;
- scientific full text/abstracts are not stored;
- feedback can be linked to a run without exposing research records;
- only explicitly curated cases can enter `training_cases`;
- all unit/contract/pipeline/UI tests are green;
- existing live clinical acceptance cases remain green;
- measured D1 write overhead is acceptable before production enablement;
- production is not enabled before isolated canary verification.

## 17. Future extension points

Explicitly deferred but supported by this schema:

- DPO `chosen` / `rejected` pairs derived from expert revisions;
- dataset quality dashboards;
- authenticated curation interface;
- R2 JSONL/Parquet exports;
- automated evaluation harness comparing pipeline versions;
- durable asynchronous logging via Cloudflare Queues if justified by latency/reliability data;
- LoRA/QLoRA experiments against a fixed validation set;
- model-independent dataset portability.
