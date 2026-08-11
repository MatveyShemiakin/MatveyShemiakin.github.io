# Yandex Metrika Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-gated Yandex Metrika counter `111504350` to every static HTML page.

**Architecture:** A root `analytics.js` defines an idempotent initializer that only loads Yandex after the existing `site_cookie_choice=analytics` consent state. The existing global HTML injection script places the loader immediately after `<head>` and the existing GitHub workflow maintains that invariant for future pages.

**Tech Stack:** Vanilla JavaScript, Python 3.12 injection script, Node.js built-in test runner, GitHub Actions.

## Global Constraints
- Vanilla HTML/CSS/JS only.
- No inline styles.
- Do not contact Yandex before analytics consent.
- Preserve the existing `legal.js` cookie-consent UI and storage key.
- Use counter `111504350` with Webvisor, click map, accurate bounce tracking, and link tracking enabled.

---

### Task 1: Consent-gated analytics loader

**Files:**
- Create: `analytics.js`
- Create: `tests/site-analytics.test.mjs`

**Interfaces:**
- Consumes: `localStorage['site_cookie_choice']` and `site:analytics-consent`.
- Produces: `window.initSiteAnalytics()` and one-time Yandex Metrika initialization.

- [ ] **Step 1: Write tests that require zero Yandex loading before consent and one-time initialization after consent.**
- [ ] **Step 2: Run `node --test tests/site-analytics.test.mjs` and verify the tests fail because `analytics.js` does not exist.**
- [ ] **Step 3: Implement `analytics.js` with counter `111504350`, consent gating, event listener, stored-consent startup, and idempotency.**
- [ ] **Step 4: Run `node --check analytics.js && node --test tests/site-analytics.test.mjs` and verify all tests pass.**

### Task 2: Site-wide early loader injection

**Files:**
- Modify: `scripts/inject_legal.py`
- Modify: `.github/workflows/inject-legal.yml`

**Interfaces:**
- Consumes: every non-hidden `*.html` file in the repository.
- Produces: exactly one `<script src="/analytics.js?v=20260811-1"></script>` near the start of each page head.

- [ ] **Step 1: Extend the analytics test to require an `ANALYTICS_SCRIPT` injector constant and the versioned loader path.**
- [ ] **Step 2: Run the test and verify the injector requirement fails.**
- [ ] **Step 3: Update `scripts/inject_legal.py` to normalize or inject the loader after `<head>`, with body/html fallbacks.**
- [ ] **Step 4: Add `analytics.js` to the workflow path triggers.**
- [ ] **Step 5: Run `python3 -m py_compile scripts/inject_legal.py` and a fixture injection smoke test, verifying one analytics loader is added and privacy pages remain free of `legal.js` while still receiving analytics.js.**

### Task 3: Deploy and verify generated pages

**Files:**
- Generated modifications: all repository HTML pages through `.github/workflows/inject-legal.yml`.

**Interfaces:**
- Consumes: the human feature commit on `main`.
- Produces: workflow-generated HTML updates containing the loader.

- [ ] **Step 1: Commit the loader, injector, workflow, tests, spec, and plan atomically to `main`.**
- [ ] **Step 2: Verify the injection workflow runs and produces a generated commit when HTML changes are required.**
- [ ] **Step 3: Fetch representative RU/EN, patient, doctor, and privacy pages and verify `/analytics.js?v=20260811-1` appears once near `<head>`.**
- [ ] **Step 4: Verify `analytics.js` on `main` still contains the consent gate and counter `111504350`.**
