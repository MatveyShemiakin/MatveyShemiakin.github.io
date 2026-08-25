# OphthaSearch Research Agent v2 — Design Specification

Date: 2026-08-25
Status: Approved architecture, pending implementation-plan approval
Branch: `feature/ophthasearch-research-agent-v2`
Production rule: OphthaSearch v1 remains frozen and unchanged until v2 passes the clinical benchmark and production-readiness gates.

## 1. Product definition

OphthaSearch Research Agent v2 is a professional clinical-research agent for ophthalmologists. It is not a keyword search engine and not a generic chatbot. Its job is to understand a clinical ophthalmology question, plan an evidence search, retrieve and verify real sources from multiple international databases, rank the evidence by clinical relevance and methodological strength, reason over the evidence as an experienced ophthalmologist-scientist, and return a practical answer with traceable citations.

The target user is an ophthalmologist or ophthalmic surgeon. The system should communicate at specialist level and may use professional terminology without simplifying for patients unless explicitly asked.

The central product promise is:

> A clinician asks a real ophthalmology question and receives a practical, evidence-grounded specialist answer with treatment strategy, specific therapeutic options, dosing where supported, escalation/de-escalation criteria, arguments for and against, alternatives, uncertainty, and verified primary sources/guidelines.

## 2. Non-goals

v2 is not intended to:

- replace source reading when a decision depends on narrow eligibility criteria or rare adverse-event details;
- invent bibliography, DOI, PMID, NCT identifiers, guideline statements, doses or contraindications;
- treat registry entries as evidence of efficacy;
- infer a diagnosis from insufficient clinical data without making the uncertainty explicit;
- expose unverified model-generated citations;
- depend on browser-side scraping of scientific websites;
- reuse the v1 Russian dictionary/ranking logic as the core reasoning engine.

## 3. User experience and answer contract

A clinician should be able to enter a free-form question in Russian or English, for example:

- “Современная медикаментозная терапия ПОУГ: что использовать первой линией и когда переходить на комбинацию?”
- “Стоит ли оперировать ERM при Vis 0.8 и выраженных metamorphopsia?”
- “What is the preferred management of a 450 µm full-thickness macular hole in a phakic patient?”
- “Тактика при дислокации ИОЛ в стекловидное тело у пациента с глаукомой.”

The answer should be rendered in the following clinical order:

1. **Клинический вывод / Clinical bottom line** — direct answer first.
2. **Практическая тактика / Practical management** — what to do now and in what sequence.
3. **Конкретная терапия** — drug, concentration/dose, frequency, duration or procedural parameters when supported by retrieved evidence/guidelines.
4. **Критерии контроля** — what to monitor, when, and what constitutes adequate response/failure.
5. **Когда менять или эскалировать тактику** — explicit triggers.
6. **Аргументы за** — benefits and supporting evidence.
7. **Аргументы против / ограничения** — contraindications, harms, uncertainty, weak evidence, applicability concerns.
8. **Альтернативные методы** — competing medical, laser and surgical strategies with when-to-use guidance.
9. **Что говорят рекомендации** — society/guideline position, including disagreements between guidelines when present.
10. **Ключевые исследования** — pivotal systematic reviews, RCTs, comparative studies and relevant registries.
11. **Где данные противоречивы или недостаточны** — explicit uncertainty.
12. **Клиническая интерпретация** — model synthesis clearly separated from directly sourced recommendations.
13. **Источники** — only verified sources from the Evidence Pack, with stable identifiers and working links.

The UI may offer compact and expanded modes, but the underlying answer object must preserve these sections independently.

## 4. High-level architecture

```text
Clinician question
      ↓
Clinical Query Interpreter
      ↓
Research Planner
      ↓
Parallel Source Retrieval
      ↓
Document Normalizer + Identifier Verification
      ↓
Medical Relevance Gate
      ↓
Evidence Hierarchy + Quality Signals
      ↓
Evidence Pack / Evidence Graph
      ↓
Clinical Reasoning Agent
      ↓
Citation & Claim Verifier
      ↓
Structured Specialist Answer
      ↓
UI renderer
```

v2 must be implemented as independent modules with explicit contracts. No module should both retrieve sources and write the final clinical answer.

## 5. Component design

### 5.1 Clinical Query Interpreter

Purpose: convert a free-form clinical question into a structured clinical intent without relying on a fixed phrase dictionary.

Input:
- user question;
- interface language;
- optional filters supplied by the clinician.

Output schema:

```json
{
  "language": "ru",
  "domain": "glaucoma",
  "condition": "primary open-angle glaucoma",
  "question_type": "therapy",
  "population": [],
  "interventions": [],
  "comparators": [],
  "outcomes": [],
  "modifiers": [],
  "requested_depth": "specialist",
  "needs_dosing": true,
  "needs_alternatives": true,
  "ambiguities": []
}
```

Rules:
- preserve original clinician wording;
- identify clinically meaningful modifiers such as age, lens status, pregnancy, ocular surface disease, glaucoma stage, macular status, prior surgery, anticoagulation, etc.;
- if a missing variable materially changes management, note it as an uncertainty rather than fabricating it;
- Russian input may produce English evidence-search concepts while preserving Russian output.

### 5.2 Research Planner

Purpose: decide what evidence is needed before searching.

It produces multiple search tracks rather than one query string. Example for “медикаментозная терапия ПОУГ”:

- current international guideline recommendations;
- first-line IOP-lowering treatment;
- prostaglandin analogues comparative efficacy;
- beta-blockers / CAI / alpha-2 agonists;
- rho-kinase inhibitors where relevant;
- fixed combinations;
- preservative-free therapy / ocular surface disease;
- adherence and persistence;
- SLT as an alternative first-line strategy;
- escalation criteria and target IOP evidence;
- recent pivotal or practice-changing trials.

Planner output must include source classes, query variants, date windows, and expected evidence types.

### 5.3 Source adapters

Each external source is an independent adapter with a common interface. Initial architecture should support:

**Core bibliographic evidence**
- PubMed / NCBI;
- Europe PMC.

**Metadata and citation graph**
- Crossref;
- OpenAlex.

**Trial registries**
- ClinicalTrials.gov;
- additional registries only where stable official interfaces are available.

**Regional / international literature**
- J-STAGE;
- Asia-Pacific and regional sources with stable official access, added adapter-by-adapter after licensing/API review;
- Latin-American or other regional sources where official access permits integration.

**Guidelines**
- controlled Guideline Registry for AAO, EGS, EURETINA, APVRS, NICE/RCOphth and other relevant professional societies/authorities;
- each guideline record stores organisation, title, version, publication/update date, topic tags, canonical URL, status and supersession metadata.

Every adapter must implement:

```text
search(plan) -> SourceRecord[]
fetchDetails(record) -> NormalizedDocument
healthCheck() -> status
```

Adapters must have independent timeout, retry and failure isolation. One slow source must never block the entire answer.

### 5.4 Document Normalizer and identifier verification

All retrieved records are converted to a common evidence object.

Minimum fields:

```json
{
  "source_id": "internal-stable-id",
  "source_type": "journal_article",
  "title": "...",
  "authors": [],
  "journal_or_body": "...",
  "year": 2025,
  "abstract_or_summary": "...",
  "doi": "...",
  "pmid": "...",
  "pmcid": "...",
  "nct": "...",
  "canonical_url": "...",
  "publication_types": [],
  "guideline_version": null,
  "retrieved_from": [],
  "verification": {
    "identifier_verified": true,
    "metadata_crosschecked": true
  }
}
```

Deduplication priority:
1. DOI;
2. PMID/PMCID;
3. trial registry ID;
4. normalized title + year + first author.

A source with unverifiable identifiers may still be retained when authoritative (for example a society guideline), but its provenance must be explicit.

### 5.5 Medical Relevance Gate

This is a mandatory stage before methodological ranking.

The previous v1 failure mode — a highly cited or high-level retinal-detachment paper appearing above glaucoma pharmacotherapy — must be structurally impossible.

For each candidate document the system computes a relevance score based on:
- target condition match;
- intervention/treatment-domain match;
- population/context modifiers;
- requested outcomes;
- question type;
- date relevance when requested;
- semantic match between title/abstract/guideline scope and structured intent.

Documents below the relevance threshold cannot enter the final Evidence Pack regardless of citation count or evidence tier.

Hard negative examples must be included in tests: a retinal-detachment article must score below threshold for a glaucoma-pharmacotherapy query even if it is an RCT or systematic review.

### 5.6 Evidence hierarchy and quality signals

After relevance filtering, the system classifies evidence type and assigns methodological signals.

Indicative hierarchy:
- current authoritative guideline / consensus with transparent methodology;
- systematic review / meta-analysis;
- randomized controlled trial;
- prospective comparative study;
- retrospective comparative cohort / case-control;
- case series;
- case report;
- narrative review / expert opinion.

Important constraints:
- hierarchy is not a substitute for GRADE;
- a systematic review of weak studies is not automatically “high certainty”;
- ClinicalTrials.gov records are “ongoing/registered evidence context”, not proof of efficacy;
- relevance outranks evidence tier;
- recency is a modifier, not a substitute for quality.

The system should capture risk signals such as small sample size, indirect population, surrogate endpoint, retrospective design, inconsistent results, old guideline version, or conflicts between major guidelines.

### 5.7 Evidence Pack / Evidence Graph

The Clinical Reasoning Agent must never receive raw uncontrolled search results. It receives a bounded Evidence Pack containing only selected and verified evidence.

Evidence Pack sections:
- question intent;
- active guideline statements;
- systematic reviews/meta-analyses;
- pivotal RCTs;
- comparative observational evidence;
- safety/adverse-event evidence;
- relevant ongoing trials;
- alternative-treatment evidence;
- disagreements/contradictions;
- evidence gaps;
- source map with immutable internal source IDs.

Each source includes a concise extracted evidence note generated from the source content/metadata, but the original title/abstract/identifier remains available for verification.

### 5.8 Clinical Reasoning Agent

The reasoning agent acts as an ophthalmologist-scientist writing for another ophthalmologist.

It must:
- answer the actual clinical question rather than summarise papers;
- use practical ophthalmic decision logic;
- state preferred strategy and reasonable alternatives;
- provide drugs, doses/concentrations, frequency and duration only when supported by the Evidence Pack;
- distinguish initiation, monitoring, failure criteria and escalation;
- weigh benefit, risk, feasibility and patient-specific modifiers;
- compare alternatives such as medical therapy, SLT, MIGS, filtering surgery, vitrectomy, tamponade options, etc. where relevant;
- explain why an option is preferred and why another may be inappropriate;
- expose uncertainty rather than filling gaps with model priors;
- separate evidence-backed statements from clinical interpretation.

The LLM is therefore the reasoning layer, not the search engine and not the bibliography generator.

Initial model runtime may use the existing Cloudflare Workers AI pathway and Gemma 4, but the reasoning interface must be model-agnostic so a stronger model can later replace or complement Gemma without rewriting retrieval.

### 5.9 Claim and citation verifier

No citation may be created directly from model memory.

The reasoning output first uses internal source references, for example `[S3]`.

Verifier rules:
- every factual claim marked as evidence-backed must map to one or more Evidence Pack source IDs;
- every cited source ID must exist in the Evidence Pack;
- DOI/PMID/NCT/canonical link displayed to the user comes from normalized verified metadata, never free-text generation;
- unsupported claims are removed, softened or explicitly labelled as clinical interpretation;
- dosing/treatment claims require a supporting guideline, label-quality source or suitable clinical evidence in the Evidence Pack;
- contradictory source claims must be surfaced rather than silently averaged.

This stage is a hard gate before rendering.

## 6. Structured answer object

The backend should return structured JSON, not preformatted HTML.

Indicative schema:

```json
{
  "question": "...",
  "clinical_bottom_line": "...",
  "management": [
    {
      "step": 1,
      "action": "...",
      "drug_or_procedure": "...",
      "dose": "...",
      "frequency": "...",
      "duration": "...",
      "monitoring": "...",
      "change_if": "...",
      "citations": ["S1", "S4"]
    }
  ],
  "arguments_for": [],
  "arguments_against": [],
  "alternatives": [],
  "guideline_positions": [],
  "uncertainties": [],
  "clinical_interpretation": "...",
  "sources": []
}
```

The schema will be versioned. UI must never infer medical meaning from DOM mutations; it renders this object once and updates only in response to explicit application events/state changes.

## 7. Backend and API boundaries

Recommended v2 service boundary:

```text
POST /v2/research
```

Request includes:
- question;
- language;
- optional filters;
- optional mode (`quick`, `standard`, `deep`) later, but v2 MVP may ship only `standard`.

Processing is server-side. Browser code must not directly orchestrate multiple scientific APIs.

The Worker/backend owns:
- query interpretation;
- research planning;
- source retrieval;
- timeouts and retries;
- normalization;
- relevance filtering;
- Evidence Pack assembly;
- model invocation;
- claim verification;
- response caching where safe.

Client owns only:
- input;
- progress states;
- rendering;
- source expansion;
- retry/cancel UI.

## 8. Latency and failure behaviour

Target experience:
- immediate acknowledgement: <300 ms;
- first progress state: <1 s;
- standard answer target: 5–12 s under normal conditions;
- hard standard-mode budget: approximately 15 s before controlled degradation.

No single source adapter may consume the whole budget. Adapters require independent deadlines.

If a source fails:
- continue with other sources;
- show which source class was unavailable only in technical details;
- never fabricate a replacement result;
- reduce confidence/coverage when the missing source materially affects the answer.

If reasoning model fails:
- return a controlled evidence-only fallback derived from verified sources, not a broken loading state.

If the user submits a new question:
- abort/ignore stale work using request IDs or AbortController/server request tokens;
- stale responses must never overwrite newer results.

## 9. Safety and professional-use rules

Because the audience is clinicians, v2 may provide concrete therapeutic schemes and procedural strategy. However:
- dose and regimen must be source-backed;
- contraindications and key safety modifiers must be included when material;
- paediatric, pregnancy/lactation, renal/hepatic, allergy and severe systemic-comorbidity modifiers must be surfaced when relevant;
- off-label use must be labelled when the evidence source supports that classification;
- final wording must distinguish guideline recommendation, published evidence and model clinical interpretation.

The system must not claim “guideline recommends” unless the cited guideline document is actually present and current in the Evidence Pack.

## 10. International evidence strategy

The system is intentionally global. Search planning must not assume that English-language Western literature is the entire evidence base.

The architecture therefore supports regional adapters and source provenance. A source can be added only after verifying:
- official/stable access method;
- terms/licensing compatible with the intended use;
- sufficient metadata quality;
- deterministic identifier/provenance handling;
- latency acceptable within the agent architecture.

Regional adapters are independent plugins and cannot degrade the core PubMed/Europe PMC/Guideline pathway.

## 11. Clinical benchmark and release gate

v2 must not replace v1 in production until it passes a clinician-oriented benchmark of at least 100 real ophthalmology questions.

Initial benchmark domains:
- glaucoma;
- cataract;
- IOL dislocation/fixation;
- retinal detachment;
- macular hole;
- epiretinal membrane;
- AMD;
- diabetic retinopathy/DME;
- corneal transplantation and graft failure;
- keratitis/corneal infection;
- uveitis/endophthalmitis;
- retinal vascular disease.

Question categories:
- therapy;
- surgical indication;
- procedure choice;
- dosing/regimen;
- comparative effectiveness;
- safety/contraindications;
- follow-up/monitoring;
- escalation/de-escalation;
- prognosis;
- diagnostic strategy.

Each benchmark case includes:
- expected topic/condition;
- expected evidence classes;
- forbidden irrelevant domains;
- minimum relevant-source precision;
- citation validity expectation;
- required practical elements where applicable.

Hard release failures include:
- wrong ophthalmic disease/domain in the clinical bottom line;
- invented paper/DOI/PMID/NCT;
- unsupported drug dose;
- registry record described as proven efficacy;
- stale guideline represented as current when a superseding version is registered;
- irrelevant high-tier paper outranking relevant evidence;
- UI lockup or runaway render loop.

Recommended acceptance targets before production:
- 100% citation identifiers valid in benchmark outputs;
- 0 cross-domain catastrophic relevance errors;
- ≥95% top-answer topic relevance;
- ≥90% required practical-management elements present on applicable benchmark cases;
- no browser main-thread runaway/observer loops in performance tests;
- controlled timeout/fallback behaviour under simulated source failures.

## 12. Testing strategy

### Unit tests
- interpreter structured intent;
- planner search-track generation;
- adapters and normalization;
- DOI/PMID/NCT deduplication;
- relevance scoring and hard negatives;
- evidence classification;
- claim-to-source validation;
- structured response schema.

### Contract tests
- each source adapter against recorded fixtures;
- model interface against deterministic mocks;
- `/v2/research` schema compatibility.

### Clinical regression tests
Every real failure becomes a permanent regression case. The first explicit case is:

> Query: “медикаментозная терапия глаукомы”
> Expected domain: glaucoma
> Expected question type: therapy
> Expected treatment concept: pharmacological/IOP-lowering therapy
> Forbidden top-domain: retinal detachment

### Performance tests
- source timeout isolation;
- cancellation/stale response protection;
- no MutationObserver-driven self-render loops;
- bounded DOM updates;
- mobile and desktop responsiveness.

## 13. Repository isolation

Production v1 stays on the existing `main` implementation while v2 is developed.

New development branch:

`feature/ophthasearch-research-agent-v2`

Recommended implementation structure (to be finalized in the implementation plan):

```text
workers/ophthasearch-v2/
  api/
  interpreter/
  planner/
  sources/
  normalization/
  relevance/
  evidence/
  reasoning/
  verification/

for-doctors/ophthasearch-v2/
  index.html
  app.js
  state.js
  render.js
  styles.css

tests/ophthasearch-v2/
  unit/
  contract/
  benchmark/
  fixtures/
```

Existing `for-doctors/ophthasearch/` remains untouched except for a future deliberate switchover after acceptance.

## 14. Rollout strategy

Phase 1 — backend skeleton and contracts.
Phase 2 — PubMed/Europe PMC + identifier verification.
Phase 3 — relevance gate + evidence hierarchy.
Phase 4 — Guideline Registry + trial registry + citation graph adapters.
Phase 5 — clinical reasoning + claim verifier.
Phase 6 — v2 clinician UI.
Phase 7 — 100-question benchmark and performance hardening.
Phase 8 — limited hidden/preview deployment.
Phase 9 — production switchover only after explicit approval.

No phase may skip the verification gates of the previous phase.

## 15. Decisions locked by this specification

- v2 is a research/clinical agent, not a keyword search UI.
- v1 is frozen during v2 development.
- retrieval, relevance, evidence grading, reasoning and citation verification are separate modules.
- international multi-source retrieval is required.
- practical specialist answers are required, including treatment tactics, dose/regimen where evidence supports it, monitoring, escalation, pros/cons and alternatives.
- relevance filtering occurs before evidence-tier ranking.
- citations can only come from the verified Evidence Pack.
- ClinicalTrials.gov records are never treated as efficacy evidence by themselves.
- the reasoning model is replaceable; architecture is not coupled to Gemma 4.
- browser code never coordinates scientific retrieval and never uses self-observing DOM mutation loops for application state.
- no production replacement before a ≥100-question ophthalmology benchmark and explicit approval.

## 16. Open implementation choices (not product ambiguities)

These do not change the approved product architecture and will be resolved in the implementation plan or during adapter spikes:

- exact model used for query interpretation versus final reasoning;
- whether a lightweight semantic reranker is model-based or embedding-based;
- persistence/cache technology for Evidence Packs;
- exact regional database order after API/licensing review;
- exact benchmark scoring weights;
- whether deep-research mode is included in MVP or added after standard mode is stable.

These choices must not weaken the locked decisions in section 15.
