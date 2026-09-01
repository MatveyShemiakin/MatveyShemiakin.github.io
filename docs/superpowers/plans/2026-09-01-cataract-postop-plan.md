# Cataract Postoperative Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an interactive postoperative cataract-treatment plan with local adherence tracking and reminders, linked from the existing cataract patient page.

**Architecture:** Add a standalone static page under `/patients/cataract-postop-plan/` using only the existing patient design classes, plus one focused Vanilla JS module for treatment state, journal, notifications and calendar export. Add the entry card by extending the existing `patients/patients.js` renderer only when the current page is the cataract page. All patient-state data remains local to the device.

**Tech Stack:** Vanilla HTML5, existing project CSS, Vanilla JS, localStorage, Web Notifications API, iCalendar (`.ics`), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-01-cataract-postop-plan-design.md`

## Global Constraints

- No React, npm, Astro or CSS frameworks.
- No inline `style` attributes.
- Reuse existing containers, grids and CSS classes from the patient section.
- Preserve current site header/footer/theme behavior.
- Medical content follows the supplied printed memo; INN mapping is explanatory and trade names are examples.
- No server-side storage of patient treatment/adherence data in MVP.

---

### Task 1: Treatment-plan logic and tests

**Files:**
- Create: `patients/cataract-postop-plan.js`
- Create: `tests/cataract-postop-plan.test.mjs`

**Interfaces:**
- Produces: `periodFromOperationDate(operationDate, currentDate)`, `buildCalendar(operationDate)`, `getPeriodPlan(periodKey)` and browser initialization for the patient page.

- [ ] **Step 1: Write the failing tests**

Test that operation day maps to week 1, day 7 to week 2, day 28 to after-month; test the INN plan contents; test that calendar output includes VCALENDAR, reminders and the expected medicine names.

- [ ] **Step 2: Run the tests to verify RED**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: FAIL because `patients/cataract-postop-plan.js` does not yet exist.

- [ ] **Step 3: Implement minimal logic**

Create treatment data, date-period calculation, localStorage state helpers, DOM renderer, completed/missed actions, journal renderer, active-page notifications and `.ics` generation.

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: PASS.

---

### Task 2: Patient page

**Files:**
- Create: `patients/cataract-postop-plan/index.html`

**Interfaces:**
- Consumes: `patients/cataract-postop-plan.js`.
- Produces: DOM IDs required by the JS module: `operation-date`, `period-tabs`, `medication-grid`, `today-summary`, `journal-list`, `journal-summary`, `enable-reminders`, `calendar-download`, `show-journal`, `print-journal`.

- [ ] **Step 1: Add a failing static-page assertion to the existing test file**

Verify the page has no inline styles and contains all required DOM IDs, red flags, disclaimer and existing patient CSS references.

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: FAIL because the page does not exist.

- [ ] **Step 3: Build the page using existing classes only**

Reuse `.patient-header`, `.breadcrumbs`, `.patient-hero`, `.container`, `.paths-section`, `.section-head`, `.path-grid`, `.path-card`, `.filter-row`, `.filter-button`, `.faq-section`, `.faq-group`, `.faq-list`, `.faq-item`, `.urgent-card`, `.button`, `.author-section`, `.references-section` and existing global theme/navigation assets.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: PASS.

---

### Task 3: Cataract-page entry card

**Files:**
- Modify: `patients/patients.js`
- Test: `tests/cataract-postop-plan.test.mjs`

**Interfaces:**
- Existing path-grid renderer remains unchanged for other pages.
- On `body.cataract-page`, prepend one `.path-card` linking to `/patients/cataract-postop-plan/`.

- [ ] **Step 1: Add failing source assertions**

Test for the public postoperative URL and approved card title in `patients/patients.js`.

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: FAIL until the card integration is added.

- [ ] **Step 3: Add the cataract-only entry card**

Prepend the approved postoperative-plan card after normal path cards are generated, guarded by `document.body.classList.contains('cataract-page')`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: PASS.

---

### Task 4: Production verification

**Files:** none.

- [ ] **Step 1: Run the focused test suite**

Run: `node --test tests/cataract-postop-plan.test.mjs`
Expected: all tests PASS.

- [ ] **Step 2: Fetch the committed production files from GitHub**

Verify the new page, JS module, test and modified `patients.js` exist on `main`.

- [ ] **Step 3: Check the public URLs after deployment**

Confirm `/patients/cataract/` exposes the card and `/patients/cataract-postop-plan/` loads without missing assets. If GitHub Pages deployment has not propagated yet, report repository verification separately from live deployment status.
