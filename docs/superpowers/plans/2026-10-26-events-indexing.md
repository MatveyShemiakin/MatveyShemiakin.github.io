# Searchable events implementation plan

**Goal:** Make the existing bilingual calendar useful before JavaScript runs and retain interactive behavior.
**Architecture:** Render visible cards from the existing locale JSON into the existing grid. Refresh this snapshot daily and on catalogue edits; the browser enhances it using the same data. No frameworks, new CSS or inline styles.
**Scope approved:** User's “Действуй” accepts the preceding proposal to expose event content, correct sitemap dates, and check publication.

- [x] Add regression coverage for meaningful RU/EN HTML, current dates, escaping and idempotent generation.
- [x] Add a Python renderer for existing card classes and real dates/official links, meaningful initial counts, visible authorship and sitemap lastmod on actual changes.
- [x] Preserve rendered cards on fetch failure; schedule static refresh and validate generation/header consistency.
- [ ] Run required shared-header checks and event tests, browser-check RU/EN desktop/mobile and no-JS/network-failure behavior, publish and verify production HTML.

Review focus: no duplicate cards after enhancement; no invented dates or source verification; empty/past-only catalogues; failed network preserves links; daily updates do not rewrite unrelated pages.

Investigation: analytics.js contained a legacy global fetch override that changed the raw 74-event JSON into 88 events in the browser. Materialise its exact RU/EN output into the catalogue, register existing sources, and remove the unrelated fetch override. Preserve every event, field and deadline from the prior browser response; do not infer or newly verify dates. This makes the actual visitor catalogue the single source for both HTML and JavaScript.

Geography: preserve existing city-centre coordinate aliases for migrated entries; add approximate city centres for Concepción, Santa Cruz de la Sierra, Miami, Antigua Guatemala and Jakarta from UNGEGN/GeoNames. Existing globe coverage regression now includes all 88 catalogue entries.

Validation: 17 Python and 21 Node checks pass. Actions 40268699222 passed Chrome checks for RU/EN, 390/1440 widths, both themes, disabled JavaScript, failed data requests, search/details/calendar dialogs and view switching. Independent migration parity confirmed all 88 events and their deadlines. Legal injector followed by renderer preserves unchanged pages and sitemap on the next day. A pre-existing patient-ecosystem hash assertion fails on the unchanged IOL page in main; it is outside this calendar change.
