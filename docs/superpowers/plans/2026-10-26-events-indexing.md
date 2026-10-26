# Searchable events implementation plan

**Goal:** Make the existing bilingual calendar useful before JavaScript runs and retain interactive behavior.
**Architecture:** Render visible cards from the existing locale JSON into the existing grid. Refresh this snapshot daily and on catalogue edits; the browser enhances it using the same data. No frameworks, new CSS or inline styles.
**Scope approved:** User's “Действуй” accepts the preceding proposal to expose event content, correct sitemap dates, and check publication.

- [ ] Add regression coverage for meaningful RU/EN HTML, current dates, escaping and idempotent generation.
- [ ] Add a Python renderer for existing card classes and real dates/official links, meaningful initial counts, visible authorship and sitemap lastmod on actual changes.
- [ ] Preserve rendered cards on fetch failure; schedule static refresh and validate generation/header consistency.
- [ ] Run required shared-header checks and event tests, browser-check RU/EN desktop/mobile and no-JS/network-failure behavior, publish and verify production HTML.

Review focus: no duplicate cards after enhancement; no invented dates or source verification; empty/past-only catalogues; failed network preserves links; daily updates do not rewrite unrelated pages.
