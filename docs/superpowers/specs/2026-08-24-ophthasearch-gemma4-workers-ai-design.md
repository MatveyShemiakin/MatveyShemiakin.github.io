# OphthaSearch + Gemma 4 / Cloudflare Workers AI — Design

## Goal
Add a source-grounded AI synthesis layer to the existing **OphthaSearch** without replacing its working literature search. The current Europe PMC, ClinicalTrials.gov and J-STAGE retrieval, normalization, deduplication, evidence ranking and result rendering stay in place. A new Cloudflare Worker uses **Gemma 4** only to synthesize the already retrieved evidence into a concise clinician-facing answer.

The production model is `@cf/google/gemma-4-26b-a4b-it` through a Workers AI binding (`env.AI`).

## Product decision
The AI layer is an enhancement, not a dependency.

If the Worker is unavailable, the free Workers AI allocation is exhausted, inference fails, JSON is invalid, citation validation fails or the browser request times out, OphthaSearch must fall back to the current deterministic `synthesizeEvidenceAnswer()` behavior. Search results and source links must continue to work independently of AI.

## Existing baseline retained
The current frontend already:
- normalizes RU/EN clinical questions;
- searches Europe PMC, ClinicalTrials.gov and J-STAGE;
- normalizes records into a shared result model;
- deduplicates and ranks evidence;
- classifies study design;
- builds an evidence landscape;
- provides a heuristic evidence synthesis;
- renders RU/EN answer-first UI.

No provider search is moved to Cloudflare in this phase.

## Architecture

```text
Clinician
  |
  v
OphthaSearch static frontend (GitHub Pages)
  |
  +--> Europe PMC / ClinicalTrials.gov / J-STAGE
  |        |
  |        v
  |    normalized + ranked results
  |
  +--> select bounded evidence packet
           |
           v
      Cloudflare Worker
           |
           v
     Workers AI binding
           |
           v
@cf/google/gemma-4-26b-a4b-it
           |
           v
 validated structured JSON
           |
           v
 OphthaSearch AI answer UI

Any AI-path failure --> existing deterministic synthesis
```

## Frontend integration
Create a small AI client module next to the existing OphthaSearch modules. It must not contain Cloudflare credentials or model API tokens.

The frontend search flow becomes:
1. Run the existing provider search.
2. Normalize, merge and rank results exactly as today.
3. Render source results immediately.
4. Build the existing deterministic synthesis in memory as the fallback.
5. If enough source text exists, request AI synthesis from the Worker.
6. While AI synthesis is pending, show a localized neutral state such as `Анализируем найденные исследования…` / `Synthesizing the retrieved evidence…` rather than briefly showing one conclusion and then replacing it with another.
7. On valid AI success, render the AI synthesis.
8. On any AI failure, render the existing deterministic synthesis with no broken state.

Use `AbortController` so a new search cancels an obsolete AI request.

## Evidence packet sent to the Worker
The browser never sends arbitrary system prompts. It sends only a bounded structured payload derived from OphthaSearch results.

Request body:

```json
{
  "schemaVersion": "1.0",
  "language": "ru",
  "question": "clinical question",
  "questionInfo": {
    "questionType": "comparison",
    "pico": {
      "population": "",
      "intervention": "",
      "comparator": "",
      "outcome": ""
    }
  },
  "sources": [
    {
      "sourceId": "S1",
      "kind": "article",
      "provider": "europepmc",
      "title": "...",
      "year": "2026",
      "publicationTypes": ["..."],
      "evidenceTier": 1,
      "abstractText": "...",
      "doi": "...",
      "pmid": "...",
      "registryId": ""
    }
  ]
}
```

### Bounds
- question: maximum 600 characters;
- sources: maximum 12 records;
- each title: maximum 500 characters;
- each abstract/registry description: maximum 3,000 characters;
- publication types: maximum 8 short strings per source;
- request body: reject above 80 KB;
- only plain JSON; no HTML is accepted from the browser.

The source selector prefers the evidence already ranked highest by OphthaSearch. Records with no substantive text cannot support an AI claim. If fewer than two usable evidence records remain after selection, the AI request is skipped and the deterministic fallback is used.

Registered ClinicalTrials.gov records may be included as context but must never be treated as proof of treatment efficacy merely because a trial is registered.

## Stable source IDs
Before calling the Worker, the frontend assigns bounded IDs `S1` … `S12` to the selected records.

Gemma never creates URLs. It cites only these IDs. The frontend maps valid IDs back to the original normalized records and therefore to the already validated Europe PMC / PubMed / DOI / ClinicalTrials.gov / J-STAGE links.

This prevents the model from inventing publication URLs.

## Worker API
Endpoint path:

`POST /v1/synthesize`

The deployed Worker base URL is environment-specific. The static frontend keeps it in one module-level configuration constant so changing the Worker hostname does not affect the rest of OphthaSearch.

### Allowed requests
- method: `POST`;
- content type: `application/json`;
- production browser origin: `https://matveyshemyakin.ru`;
- `OPTIONS` handles CORS preflight;
- unsupported methods return `405`;
- invalid origin returns `403`;
- invalid input returns `400` without invoking AI.

No API key is exposed to the browser. The Worker calls the model only through its Workers AI binding.

## Gemma prompt contract
The Worker owns the system prompt. The frontend cannot override it.

Core instructions:
- answer the supplied ophthalmology evidence question only from the supplied sources;
- do not use unsupported external facts as evidence;
- never invent a study, author, DOI, PMID, registry identifier, statistic or citation;
- treat a source as supporting a claim only when its supplied title/abstract/description supports that claim;
- distinguish registered/ongoing trials from completed efficacy evidence;
- preserve uncertainty and contradictory findings;
- when evidence is insufficient, say so explicitly;
- do not convert evidence synthesis into a patient-specific prescription or individualized treatment order;
- output in the requested RU/EN language;
- return only the requested structured object.

The prompt may ask for internal reasoning, but private reasoning is never returned to the browser. Only the structured clinical synthesis is returned.

## Structured output schema
Use Workers AI JSON mode / `response_format` with a JSON Schema. The schema is generated for each request so the `sourceId` field can be constrained to the actual IDs supplied in that request.

Response shape:

```json
{
  "schemaVersion": "1.0",
  "conclusion": "benefit",
  "answer": "...",
  "confidence": "moderate",
  "evidenceSummary": ["..."],
  "limitations": ["..."],
  "citations": [
    {
      "sourceId": "S1",
      "relation": "supports",
      "statement": "..."
    }
  ],
  "insufficientEvidence": false
}
```

Allowed values:
- `conclusion`: `benefit`, `no_difference`, `mixed`, `risk`, `insufficient`;
- `confidence`: `high`, `moderate`, `low`, `insufficient`;
- citation `relation`: `supports`, `conflicts`, `context`.

Output limits enforced by schema and server validation:
- answer: concise clinician-facing paragraph;
- evidence summary: maximum 4 items;
- limitations: maximum 4 items;
- citations: maximum 8 items;
- every citation source ID must belong to the request.

## Server-side validation
A model response is accepted only if:
- it parses as JSON;
- required fields exist;
- enum values are valid;
- arrays stay within bounds;
- every citation ID is one of the supplied source IDs;
- text values remain within defined length limits.

If validation fails, the Worker returns a controlled error and the frontend uses the deterministic fallback. The browser never attempts to repair malformed model output.

## Model invocation
Use the Workers AI binding:

`env.AI.run('@cf/google/gemma-4-26b-a4b-it', ...)`

Use synchronous inference for v1. Streaming is deliberately out of scope because the result must be validated as one structured object before it is shown as a medical evidence synthesis.

Keep generation bounded. The intended output is a short answer, not an essay.

## Cost and abuse controls
The design targets the Workers AI free allocation first.

Controls:
- hard request-size limits before inference;
- maximum 12 sources and 3,000 characters of source text each;
- no user-supplied system prompt;
- exact production CORS origin;
- repeated identical synthesis requests cached by a SHA-256 hash of the canonicalized evidence packet;
- cache successful validated responses for 6 hours;
- stale browser requests are aborted;
- no automatic retry loop that could multiply inference usage.

The cache key includes schema version, language, normalized question and the selected source IDs/content fingerprint so changed evidence does not reuse an unrelated answer.

If the free daily Workers AI allocation is exhausted, AI synthesis simply fails closed to the deterministic OphthaSearch answer; literature search remains available.

## Error contract
The Worker returns JSON errors with a stable code, for example:
- `INVALID_REQUEST` — 400;
- `ORIGIN_NOT_ALLOWED` — 403;
- `METHOD_NOT_ALLOWED` — 405;
- `AI_UNAVAILABLE` — 503;
- `AI_INVALID_OUTPUT` — 502.

The frontend does not expose infrastructure details to the clinician. It silently switches to the existing synthesis and may show a small localized note that AI synthesis is temporarily unavailable.

## UI changes
Keep the current answer-first visual hierarchy and site design.

On AI success, the existing answer section gains only the information needed to communicate provenance:
- concise answer;
- confidence label;
- up to four evidence-summary bullets;
- limitations when present;
- source citations mapped to existing result cards/links;
- a restrained label such as `Gemma 4 · синтез найденных публикаций` / `Gemma 4 · synthesis of retrieved publications`.

Do not add a chatbot layout or conversational history in this phase.

## Files / modules
Frontend remains static Vanilla HTML/CSS/JS and keeps the existing build-free site architecture.

Expected implementation boundaries:
- `for-doctors/ophthasearch/ophthasearch-ai.js` — request preparation, source selection, Worker call, response validation helper and cancellation;
- existing `ophthasearch-v3.js` — minimal integration hook; retain deterministic synthesis as fallback;
- existing RU/EN answer-first rendering module — extend to render validated AI fields without changing global header/footer;
- `workers/ophthasearch-ai/worker.js` — pure JavaScript Cloudflare Worker;
- `workers/ophthasearch-ai/wrangler.jsonc` — Worker metadata and `AI` binding configuration, no site build step;
- tests under `tests/` for frontend integration and Worker contract.

Do not add React, a CSS framework, a frontend bundler or inline styles. Do not move the website off GitHub Pages.

## Testing
Tests must not depend on live model inference.

### Worker unit tests
Mock `env.AI.run()` and verify:
- valid request produces a bounded model call;
- dynamic response schema contains only supplied source IDs;
- malformed input is rejected before inference;
- disallowed origin is rejected;
- hallucinated citation ID causes output rejection;
- malformed model JSON causes controlled failure;
- registered trial instructions are present in the prompt contract;
- cached valid result bypasses a second inference where the cache test harness supports it.

### Frontend tests
Verify:
- source packet selection is deterministic and bounded;
- fewer than two usable records skips AI;
- AI success replaces the pending state with validated synthesis;
- AI timeout/network/5xx/invalid payload uses the existing deterministic synthesis;
- a new search aborts the previous synthesis request;
- citation IDs map only to retrieved result records;
- RU and EN labels render correctly;
- static pages still contain no inline `style=` attributes;
- mobile answer layout does not introduce horizontal overflow.

### Regression
Existing OphthaSearch provider and static tests must continue to pass.

## Deployment sequence
1. Implement and test Worker locally with mocked AI binding behavior.
2. Deploy the Worker with an `AI` binding to Cloudflare Workers AI.
3. Verify Gemma 4 structured output with a controlled ophthalmology evidence packet.
4. Set the deployed Worker base URL in the single frontend AI configuration constant.
5. Deploy the static frontend.
6. Smoke-test RU and EN searches on `matveyshemyakin.ru`.
7. Verify explicit failure mode by disabling/invalidating the AI endpoint and confirming that deterministic synthesis still appears.

## Acceptance criteria
The feature is complete when:
- OphthaSearch still searches all currently connected providers with AI unavailable;
- successful searches can produce a Gemma 4 synthesis based only on retrieved evidence;
- AI citations resolve exclusively to sources that OphthaSearch actually retrieved;
- invalid or hallucinated citation IDs are never rendered;
- no Cloudflare secret is present in static site files;
- free-quota exhaustion cannot break literature search;
- RU and EN versions work;
- dark/light and desktop/mobile behavior remains intact;
- existing deterministic synthesis remains an operational fallback;
- tests cover AI success, malformed output, timeout/unavailability and citation-integrity failure.

## Deliberately out of scope
- RAG / Vectorize knowledge base;
- user accounts or saved conversations;
- patient-specific treatment recommendations;
- AI-controlled web browsing;
- moving provider search to the Worker;
- streaming partial AI text;
- automatic model switching to paid providers;
- replacing deterministic evidence ranking with model ranking.

Those are later phases only after the usefulness and reliability of this MVP are measured.