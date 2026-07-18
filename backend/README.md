# Clinical Navigator AI Backend

Provider-neutral serverless backend for extracting structured ophthalmology facts from Russian clinical text.

## Current modes

- `mock` — deterministic local parser; no credentials and no paid requests.
- `yandex` — Yandex AI Studio through the OpenAI-compatible Chat Completions endpoint.
- `openai` — OpenAI Responses API.
- `openai-compatible` — another provider exposing an OpenAI-compatible Chat Completions endpoint.

The clinical UI receives the same `facts` object in every mode. Provider-specific responses are never exposed to the browser.

## Endpoint

`POST /v1/clinical/extract`

```json
{
  "case_text": "Односторонний рецидивирующий увеит, клетки 2+, ВГД 28",
  "prior_facts": null
}
```

Response:

```json
{
  "ok": true,
  "provider": "mock",
  "facts": {
    "laterality": "unilateral",
    "course": "recurrent",
    "symptoms": [],
    "examination": {
      "iop_mm_hg": 28,
      "iop_state": "high",
      "anterior_chamber_cells": "2+"
    }
  }
}
```

## Environment variables

### Free test mode

```text
AI_PROVIDER=mock
ALLOWED_ORIGINS=https://matveyshemyakin.ru
```

### Yandex AI Studio

```text
AI_PROVIDER=yandex
YANDEX_API_KEY=<secret>
YANDEX_FOLDER_ID=<folder id>
YANDEX_MODEL=<model name or full gpt:// URI>
YANDEX_BASE_URL=https://ai.api.cloud.yandex.net/v1
ALLOWED_ORIGINS=https://matveyshemyakin.ru
```

The Yandex key should belong to a dedicated service account and be restricted to the AI Studio execution scope. Never place it in frontend JavaScript or GitHub.

### OpenAI

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_MODEL=<model id>
OPENAI_BASE_URL=https://api.openai.com/v1
ALLOWED_ORIGINS=https://matveyshemyakin.ru
```

## Security defaults

- no clinical text logging in application code;
- `Cache-Control: no-store`;
- allowed-origin list;
- maximum case length;
- credentials only through server environment variables;
- model extracts facts only and does not generate treatment;
- medication logic remains in the reviewed clinical rule base.

## Local verification

```bash
cd backend
npm test
npm run check
```

The handler format is compatible with Node.js serverless runtimes, including Yandex Cloud Functions. A deployment URL will later be assigned to `window.CLINICAL_AI_CONFIG.endpoint` in the frontend.
