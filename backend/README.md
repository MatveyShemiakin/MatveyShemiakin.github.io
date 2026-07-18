# Clinical Navigator AI Backend

Provider-neutral serverless backend for:

1. extracting structured ophthalmology facts from Russian clinical text;
2. retrieving relevant evidence chunks from a versioned pathology package;
3. generating several diagnostic and management options for physician review;
4. validating that the model did not select a final diagnosis or treatment and did not cite unavailable evidence.

## Current modes

- `mock` — deterministic free parser and option composer; no credentials or paid requests.
- `yandex` — Yandex AI Studio through an OpenAI-compatible Chat Completions endpoint.
- `openai` — OpenAI Responses API.
- `openai-compatible` — another compatible provider such as MWS or Cloud.ru.

The clinical UI receives the same structured contracts in every mode. Provider-specific payloads and API credentials are never exposed to the browser.

## Endpoint

The serverless handler accepts `POST` requests. The operation is selected by the `action` field.

### 1. Extract facts

```json
{
  "action": "extract_facts",
  "case_text": "Односторонний рецидивирующий увеит, клетки 2+, ВГД 28",
  "prior_facts": null
}
```

The response contains a normalized `facts` object and can be merged with facts from subsequent messages.

### 2. Retrieve evidence context

```json
{
  "action": "build_options",
  "facts": {},
  "supplemental_tags": ["anterior_uveitis", "hsv"],
  "authoring_mode": false
}
```

This operation returns the evidence chunks and the generation contract without asking a model to draft the final cards.

### 3. Generate physician-selectable options

```json
{
  "action": "generate_options",
  "case_text": "Односторонний рецидивирующий передний увеит, ВГД 28",
  "facts": {},
  "supplemental_tags": ["anterior_uveitis"],
  "authoring_mode": false
}
```

The response includes:

- 2–5 diagnostic options;
- supporting and missing/conflicting facts;
- tests that can discriminate between options;
- management options only when reviewed treatment evidence is available to the current server mode;
- monitoring, risks and evidence chunk identifiers;
- `physician_selection_required: true`;
- `final_decision_owner: "physician"`;
- `selected: false` for every option.

## Draft treatment authoring mode

Treatment evidence in the first anterior-uveitis package is currently marked `draft_locked`. It is excluded by default.

A closed development deployment may expose draft options only when both conditions are met:

```text
ALLOW_DRAFT_CLINICAL_OPTIONS=true
```

and the request explicitly contains:

```json
{
  "authoring_mode": true
}
```

The public navigator path requests normal mode. The preview path may request authoring mode, but the server flag remains the decisive control.

## Environment variables

### Free test mode

```text
AI_PROVIDER=mock
ALLOWED_ORIGINS=https://matveyshemyakin.ru
ALLOW_DRAFT_CLINICAL_OPTIONS=false
```

### Yandex AI Studio

```text
AI_PROVIDER=yandex
YANDEX_API_KEY=<secret>
YANDEX_FOLDER_ID=<folder id>
YANDEX_MODEL=<model name or full gpt:// URI>
YANDEX_BASE_URL=https://ai.api.cloud.yandex.net/v1
ALLOWED_ORIGINS=https://matveyshemyakin.ru
ALLOW_DRAFT_CLINICAL_OPTIONS=false
```

The Yandex key should belong to a dedicated service account and be stored only in server environment variables.

### OpenAI

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_MODEL=<model id>
OPENAI_BASE_URL=https://api.openai.com/v1
ALLOWED_ORIGINS=https://matveyshemyakin.ru
ALLOW_DRAFT_CLINICAL_OPTIONS=false
```

### Other OpenAI-compatible provider

```text
AI_PROVIDER=openai-compatible
AI_API_KEY=<secret>
AI_MODEL=<model id>
AI_BASE_URL=<provider base URL>
AI_AUTH_SCHEME=Bearer
```

## Safety validators

- no API secrets in frontend or repository;
- no application logging of clinical free text;
- `Cache-Control: no-store`;
- restricted CORS origin list;
- maximum input length and request timeout;
- only retrieved evidence chunk IDs may be cited;
- no management option may be generated while treatment evidence is locked;
- every diagnostic and management option must remain unselected;
- the model may rank support but cannot make the final choice;
- drugs, doses and durations must not be invented outside retrieved source material;
- urgent safety rules take priority over routine option presentation.

## Frontend connection

After deployment, assign the protected HTTPS endpoint in:

```javascript
window.CLINICAL_AI_CONFIG = {
  endpoint: "https://api.example/v1/clinical",
  authoringMode: false
};
```

The frontend then performs:

```text
extract_facts → generate_options → physician selects a working option
```

## Local verification

```bash
cd backend
npm test
npm run check
```

The handler format is compatible with Node.js serverless runtimes, including Yandex Cloud Functions.
