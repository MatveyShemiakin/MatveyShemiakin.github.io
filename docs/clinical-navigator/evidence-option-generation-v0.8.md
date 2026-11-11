# Evidence-grounded physician choice workflow v0.8

Status: research prototype. Not approved for clinical use.

## Product principle

The system does not store a prewritten final answer and does not make the final clinical choice.

It performs the following sequence:

1. extracts facts already stated by the physician;
2. identifies missing or conflicting data;
3. retrieves relevant evidence chunks from a versioned pathology package;
4. asks the configured language model to compose several diagnostic and management options;
5. validates the answer against the retrieved evidence and safety contract;
6. presents all options as unselected;
7. lets the physician mark a working diagnosis and a management option for discussion.

## Three backend actions

### `extract_facts`

Converts Russian free text and subsequent messages into one structured case state.

### `build_options`

Retrieves evidence and returns the generation context without asking the model to draft cards. This is useful for testing retrieval quality and reviewing which source fragments reached the model.

### `generate_options`

Uses the same context to generate structured option cards. It supports `mock`, Yandex, OpenAI and another OpenAI-compatible provider.

## Mandatory output contract

The model must return:

- 2–5 diagnostic options;
- support level for each option;
- case facts supporting each option;
- missing or conflicting facts;
- investigations that can discriminate between options;
- management options only when treatment evidence is available;
- monitoring and constraints;
- evidence chunk IDs for material claims;
- `selected: false` for every option;
- `physician_selection_required: true`;
- `final_decision_owner: physician`.

## Server-side rejection rules

The response is rejected when:

- fewer than two or more than five diagnostic options are returned;
- the model selects any diagnosis or management option automatically;
- a cited evidence chunk was not retrieved for this request;
- a management option lacks a retrieved treatment evidence chunk;
- management options are generated while treatment evidence is locked;
- physician decision ownership is removed or changed.

## Treatment evidence states

### `retrievable`

May be used in normal mode after the corresponding clinical package is approved.

### `draft_locked`

May be inspected only on a closed authoring deployment. The server must have `ALLOW_DRAFT_CLINICAL_OPTIONS=true`, and the client request must explicitly set `authoring_mode: true`.

The first anterior-uveitis treatment chunks remain `draft_locked`.

## Frontend behaviour

The v0.8 interface adds:

- a “Варианты по гайдам” action;
- extraction of the case conversation into structured facts;
- a second request for evidence-grounded options;
- diagnostic comparison cards;
- management comparison cards when enabled;
- explicit physician-only selection buttons;
- a summary of what the physician marked;
- a clear lock message when treatment evidence is not enabled.

When no backend endpoint is configured, the frontend does not imitate an AI answer. It reports that the server connection is not configured.

## Current coverage

The generation workflow is currently connected to the anterior-uveitis evidence package. Other pathologies must be added as separate versioned packages with their own manifest, evidence chunks, source registry entries and tests.

## Next implementation gate

To make the preview interactive, deploy the backend in `mock` mode first and set its HTTPS URL in `doctors/navigator/ai-config.js`. After validating the user flow, connect a Yandex AI Studio model to the same contract and compare its outputs against the mock baseline and clinician-authored reference cases.
