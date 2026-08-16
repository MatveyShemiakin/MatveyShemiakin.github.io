# Patient Updates Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bell-based “Что нового” center to `/patients/` with unread count, local read state, accessible panel behavior, and privacy-safe Yandex Metrika events.

**Architecture:** Keep the feature static and isolated. `/patients/updates.json` is the content source; `/patients/patients-updates.js` owns loading, rendering, read-state and interactions; the existing `/patients/index.html` provides the semantic shell; existing patient styles are extended in `/patients/patients-ecosystem.css`. No external runtime dependency or backend is introduced.

**Tech Stack:** Vanilla HTML5, CSS3, Vanilla JS, JSON, Node built-in test runner, GitHub Pages.

## Global Constraints

- No React, npm application runtime, Astro, build framework, or third-party CSS framework.
- No inline styles.
- Preserve the existing patient header, container/grid system, typography and visual language.
- Store read state only in browser `localStorage`.
- Do not send update titles, medical topics, URLs or other content parameters to Yandex Metrika.
- Web Push, email, Telegram bot and subscriber database are out of scope.

---

### Task 1: Read-state and analytics behavior

**Files:**
- Create: `tests/patient-updates.test.mjs`
- Create: `patients/patients-updates.js`

**Interfaces:**
- Consumes: DOM elements with IDs `patient-updates-toggle`, `patient-updates-count`, `patient-updates-panel`, `patient-updates-list`, `patient-updates-mark-all`.
- Produces: client-side feature initialized on DOM ready; storage key `patient_updates_read_v1`; Yandex goals `updates_open`, `update_click`, `updates_mark_read`.

- [ ] **Step 1: Write failing tests** for unread count, marking one update read, marking all read, safe localStorage fallback, and analytics calls that contain only goal IDs.
- [ ] **Step 2: Run** `node --test tests/patient-updates.test.mjs` and confirm failures because `patients-updates.js` does not exist.
- [ ] **Step 3: Implement minimal JS** that fetches `/patients/updates.json`, validates entries, reads/writes only stable IDs, renders the list, updates the badge, marks clicked/all items read, closes on Escape/outside click, and calls `ym(111504350,'reachGoal',goal)` only when `site_cookie_choice === 'analytics'`.
- [ ] **Step 4: Run** `node --check patients/patients-updates.js && node --test tests/patient-updates.test.mjs` and confirm zero failures.

### Task 2: Static update feed and semantic header shell

**Files:**
- Create: `patients/updates.json`
- Modify: `patients/index.html`

**Interfaces:**
- `updates.json` entries: `{ "id": string, "published": "YYYY-MM-DD", "title": string, "description": string, "url": string }`.
- HTML IDs consumed by Task 1 must match exactly.

- [ ] **Step 1: Add a fixture assertion** to `tests/patient-updates.test.mjs` that the JSON feed contains unique IDs, valid dates, non-empty copy and local `/patients/` URLs.
- [ ] **Step 2: Run** the test and confirm it fails while the feed is absent.
- [ ] **Step 3: Add `updates.json`** using only currently published patient materials; exclude pending glaucoma until its page is published.
- [ ] **Step 4: Add the bell shell** to the existing `.patient-header .header-row`, using a button with `aria-expanded`, an unread badge, a labelled panel, list container and “Прочитать всё” control; include `/patients/patients-updates.js` with `defer`.
- [ ] **Step 5: Run** the Node tests again.

### Task 3: Patient-design styling and responsive behavior

**Files:**
- Modify: `patients/patients-ecosystem.css`
- Test: `tests/patient-updates.test.mjs`

**Interfaces:**
- Component-specific classes may only style the new shell; all layout remains anchored to existing `.patient-header`, `.header-row`, `.container` and site theme selectors.

- [ ] **Step 1: Add static assertions** that required CSS selectors exist and no inline style is introduced in `/patients/index.html`.
- [ ] **Step 2: Run tests and confirm the CSS assertions fail.**
- [ ] **Step 3: Add desktop styles** for compact bell/badge/dropdown matching current dark patient header.
- [ ] **Step 4: Add mobile styles** so the panel uses almost the full viewport width, remains keyboard reachable, and does not break the language switch/back link.
- [ ] **Step 5: Add dark-theme/reduced-motion compatibility** without new animation dependency.
- [ ] **Step 6: Run** `node --check patients/patients-updates.js && node --test tests/patient-updates.test.mjs`.

### Task 4: Site workflow and deployment verification

**Files:**
- Modify: `.github/workflows/inject-legal.yml` only if required to run the new tests when patient update files change.

**Interfaces:**
- Existing legal/content analytics injection remains unchanged.

- [ ] **Step 1: Ensure workflow watches** `patients/updates.json`, `patients/patients-updates.js`, `patients/patients-ecosystem.css`, `patients/index.html`, and `tests/patient-updates.test.mjs` and runs the new test.
- [ ] **Step 2: Run fresh verification** via GitHub Actions and confirm the analytics/content tests and patient-update tests all pass.
- [ ] **Step 3: Verify generated `/patients/index.html`** still references the current analytics loader and the new updates module exactly once.
- [ ] **Step 4: Verify GitHub Pages deployment** for the final generated commit finishes with `conclusion: success`.
