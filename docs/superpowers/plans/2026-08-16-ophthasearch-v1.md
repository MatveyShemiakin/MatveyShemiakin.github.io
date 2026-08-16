# OphthaSearch v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish RU/EN OphthaSearch pages with a real Europe PMC search, stable responsive UI, and links from the clinician library.

**Architecture:** Static Vanilla HTML/CSS/JS on GitHub Pages. A single shared `ophthasearch.js` builds Europe PMC queries, normalizes JSON records, manages URL state, and renders localized results using page `data-lang`. `ophthasearch.css` contains all feature styling; no inline styles are introduced.

**Tech Stack:** HTML5, CSS3, Vanilla JS, Europe PMC REST API, existing site theme/language/navigation modules.

## Global Constraints
- No React, npm, Astro, build step or CSS framework.
- No inline `style="..."` attributes.
- Reuse existing `.container`, global variables, header/footer and site modules.
- RU: `/for-doctors/ophthasearch/`; EN: `/en/for-doctors/ophthasearch/`.
- Planned regional sources must not be represented as live until they are actually queried.

---

### Task 1: Shared OphthaSearch UI shell

**Files:**
- Create: `for-doctors/ophthasearch/ophthasearch.css`
- Create: `for-doctors/ophthasearch/index.html`
- Create: `en/for-doctors/ophthasearch/index.html`

**Interfaces:**
- Produces DOM IDs consumed by JS: `ophtha-search-form`, `ophtha-query`, `ophtha-sort`, `ophtha-date`, `ophtha-oa`, `ophtha-pubtype`, `ophtha-results`, `ophtha-status`, `ophtha-result-count`, `ophtha-filters`.

- [ ] Build semantic RU page using current clinician header/footer and global modules.
- [ ] Build EN page with identical structure and localized copy.
- [ ] Add responsive feature CSS with `ophtha-` prefix.
- [ ] Verify no inline `style=` attributes and no horizontal overflow rules that conflict with the global site.

### Task 2: Live Europe PMC search adapter

**Files:**
- Create: `for-doctors/ophthasearch/ophthasearch.js`

**Interfaces:**
- `buildEuropePmcQuery(state)` -> Europe PMC query string.
- `searchEuropePmc(state)` -> Promise resolving normalized response.
- `normalizeEuropePmcRecord(record)` -> normalized result object.
- `renderResults(response)` -> updates result list and count.

- [ ] Parse initial state from URL query parameters.
- [ ] Validate non-empty search query.
- [ ] Map date/open-access/publication-type controls to Europe PMC syntax.
- [ ] Fetch `https://www.ebi.ac.uk/europepmc/webservices/rest/search` with `resultType=core`, `format=json`, `pageSize=25`.
- [ ] Normalize records without inventing missing metadata.
- [ ] Render links for Europe PMC, PubMed, DOI and full text only when identifiers/URLs exist.
- [ ] Use `textContent` for untrusted API text and safe URL construction for external links.
- [ ] Add loading, empty and error states localized from `data-lang`.
- [ ] Mirror form state into URL using `history.pushState` and restore on `popstate`.

### Task 3: Integrate OphthaSearch into For Doctors library

**Files:**
- Modify: `for-doctors/index.html`
- Modify: `en/for-doctors/index.html`
- Create: `for-doctors/ophthasearch-card.css`

**Interfaces:**
- Adds a fourth library card linking to the corresponding RU/EN OphthaSearch page.

- [ ] Add a card-specific visual class without inline CSS.
- [ ] Add RU card copy.
- [ ] Add EN card copy.
- [ ] Ensure existing three cards remain unchanged.

### Task 4: Static verification and API smoke test

**Files:**
- Read/verify all files from Tasks 1–3.

- [ ] Confirm both HTML pages reference correct absolute CSS/JS paths.
- [ ] Confirm both pages reference the existing analytics/theme/language/motion/mega-nav modules.
- [ ] Confirm no `style=` attributes exist in new OphthaSearch HTML.
- [ ] Call a representative Europe PMC search (`macular hole surgery`) and verify JSON results are returned.
- [ ] Check result field assumptions against the real response.
- [ ] Verify branch diff only contains intended OphthaSearch/integration changes.

### Task 5: Review and publish

**Files:**
- Branch: `feature/ophthasearch-v1`

- [ ] Open a pull request describing live scope vs planned regional connectors.
- [ ] Review changed files and CI/status if available.
- [ ] Merge only after verification is green.