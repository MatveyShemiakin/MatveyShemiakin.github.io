# Global Site Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add restrained reading progress, content reveal, card feedback, FAQ feedback and localized next-material navigation to every public RU/EN page on desktop and mobile.

**Architecture:** Create one global CSS module and one deferred Vanilla JS controller, then extend the existing sitemap-driven injector so every public page receives the assets exactly once. Keep all route-specific copy inside a small explicit map in the controller and protect urgent medical content through exclusion selectors.

**Tech Stack:** Vanilla HTML5, CSS3, Vanilla JavaScript, Python 3.12 injector, Node.js static regression tests, GitHub Pages.

## Global Constraints

- Use no framework, package manager, build tool or third-party motion library.
- Use no inline styles.
- Preserve all existing page markup, content and URL paths.
- Cover exactly the 27 public pages in `sitemap.xml`; exclude `konspekt.html`.
- Support Russian and English, desktop and mobile.
- Critical warnings, emergency content, red flags and medical disclaimers must never be delayed.
- Respect `prefers-reduced-motion: reduce`.
- Do not add `MutationObserver`, `backdrop-filter`, parallax or continuous decorative animation.

---

### Task 1: Add regression coverage for the global motion contract

**Files:**
- Create: `tests/site-motion.test.mjs`
- Temporary test runner: `.github/workflows/global-site-motion-temp.yml`

**Interfaces:**
- Consumes: `sitemap.xml`, existing public HTML pages, future `site-motion.css`, `site-motion.js` and injector constants.
- Produces: a deterministic Node test that fails until the global assets and behaviours exist.

- [ ] **Step 1: Write the failing test**

The test must assert that all 27 sitemap pages contain one motion stylesheet and one deferred motion controller; the controller follows `site-theme.js`; `konspekt.html` remains excluded; RU/EN route labels exist; critical exclusion selectors exist; CSS includes reduced-motion overrides; and forbidden APIs/effects are absent.

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
node tests/site-motion.test.mjs
```

Expected: FAIL because `/site-motion.css?v=20260806-1` and `/site-motion.js?v=20260806-1` do not yet exist in public pages.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/site-motion.test.mjs .github/workflows/global-site-motion-temp.yml
git commit -m "Add failing global motion regression test"
```

---

### Task 2: Implement the global motion stylesheet

**Files:**
- Create: `site-motion.css`
- Test: `tests/site-motion.test.mjs`

**Interfaces:**
- Consumes classes added by `site-motion.js`: `.site-motion-ready`, `.site-reading-progress`, `.site-reading-progress__bar`, `.site-motion-reveal`, `.is-visible`, `.site-motion-card`, `.site-motion-details`, `.site-next-material`.
- Produces visual states without changing semantic markup or layout dimensions.

- [ ] **Step 1: Confirm the stylesheet assertions fail**

Run:

```bash
node tests/site-motion.test.mjs
```

Expected: FAIL with missing `site-motion.css`.

- [ ] **Step 2: Create the minimal stylesheet**

Implement shared timing tokens, 2 px progress bar, one-time reveal using opacity/translate, 3 px desktop card lift, brief active feedback, native-details content feedback, next-material layout, mobile reductions and a complete reduced-motion media query.

- [ ] **Step 3: Run the test**

Run:

```bash
node tests/site-motion.test.mjs
```

Expected: stylesheet-specific assertions PASS; asset-injection and controller assertions still FAIL.

- [ ] **Step 4: Commit**

```bash
git add site-motion.css
git commit -m "Add global site motion styles"
```

---

### Task 3: Implement the global motion controller

**Files:**
- Create: `site-motion.js`
- Test: `tests/site-motion.test.mjs`

**Interfaces:**
- Consumes: DOM content, `document.documentElement.lang`, `location.pathname`, `IntersectionObserver`, `requestAnimationFrame` and `matchMedia`.
- Produces: progress UI, reveal classes, card classes, FAQ state classes and one localized next-material anchor.

- [ ] **Step 1: Confirm controller assertions fail**

Run:

```bash
node tests/site-motion.test.mjs
```

Expected: FAIL with missing `site-motion.js`.

- [ ] **Step 2: Implement localized route data**

Add explicit RU and EN route maps for the patient sequence, IOL return path and professional sequence. Each entry must contain `eyebrow`, `title`, `description`, `href` and `linkLabel`.

- [ ] **Step 3: Implement reading progress**

Mount a decorative progress element only when `documentElement.scrollHeight` exceeds `innerHeight * 1.35`. Use one passive scroll listener and one queued `requestAnimationFrame` update. Remove the element when the page becomes too short after resize.

- [ ] **Step 4: Implement safe reveal**

Scan ordinary section/card containers, exclude urgent/warning/emergency/red-flag/alert/disclaimer selectors, mark the first visible hero immediately and reveal remaining elements once through a single `IntersectionObserver`.

- [ ] **Step 5: Implement card and FAQ feedback**

Add `.site-motion-card` only to existing interactive cards or linked cards. Add `.site-motion-details` to native details elements and toggle `.is-open` from the native `toggle` event without replacing browser semantics.

- [ ] **Step 6: Implement next-material injection**

For mapped routes only, append one localized `<aside class="site-next-material">` to `<main>`, before an in-main disclaimer when present. Do not inject on landing, privacy or home pages. Prevent duplicates with a data marker.

- [ ] **Step 7: Run the test**

Run:

```bash
node tests/site-motion.test.mjs
```

Expected: controller and stylesheet assertions PASS; page-injection assertions still FAIL.

- [ ] **Step 8: Commit**

```bash
git add site-motion.js
git commit -m "Add global site motion controller"
```

---

### Task 4: Extend the sitemap-driven injector

**Files:**
- Modify: `scripts/inject_site_theme.py`
- Test: `tests/site-motion.test.mjs`

**Interfaces:**
- Consumes: `site-motion.css`, `site-motion.js`, `sitemap.xml` and existing theme injection helpers.
- Produces: exactly one motion stylesheet in `<head>` and one deferred controller before `</body>` on every public page.

- [ ] **Step 1: Confirm injection assertions fail**

Run:

```bash
node tests/site-motion.test.mjs
```

Expected: FAIL because public HTML pages do not contain motion assets.

- [ ] **Step 2: Add independent motion markers**

Define:

```python
MOTION_HEAD_ASSET = '<link rel="stylesheet" href="/site-motion.css?v=20260806-1">'
MOTION_BODY_ASSET = '<script defer src="/site-motion.js?v=20260806-1"></script>'
```

Call `inject_once` separately for each marker so pages already containing the theme assets still receive the motion assets.

- [ ] **Step 3: Generate all public pages**

Run:

```bash
python scripts/inject_site_theme.py
```

Expected: all 27 sitemap pages change once; technical pages remain unchanged.

- [ ] **Step 4: Verify idempotence**

Run the injector a second time and confirm:

```bash
git diff --exit-code
```

Expected: no additional changes after the first generated output is committed/staged.

- [ ] **Step 5: Run focused tests**

```bash
node tests/site-motion.test.mjs
node tests/site-theme.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/inject_site_theme.py '**/*.html' '*.html'
git commit -m "Inject global motion across public pages"
```

---

### Task 5: Run the complete regression suite and remove temporary automation

**Files:**
- Delete: `.github/workflows/global-site-motion-temp.yml`
- Create: `docs/releases/2026-08-06-global-site-motion.md`

**Interfaces:**
- Consumes: all production changes and existing tests.
- Produces: verified feature branch ready for review.

- [ ] **Step 1: Run all repository tests**

```bash
for test in tests/*.test.mjs; do node "$test"; done
```

Expected: every test exits 0.

- [ ] **Step 2: Verify generated asset counts**

```bash
node tests/site-motion.test.mjs
```

Expected: `Global site motion verified on 27 public pages.`

- [ ] **Step 3: Remove the temporary workflow**

Delete `.github/workflows/global-site-motion-temp.yml` so the final branch does not retain feature-specific automation.

- [ ] **Step 4: Add release note**

Document the five motion behaviours, RU/EN coverage, responsive support, reduced-motion support and verification commands.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Record global site motion release"
```

- [ ] **Step 6: Open a pull request**

Open a PR from `feature/global-site-motion` to `main` with the test evidence and explicit note that urgent medical content is excluded from reveal delays.
