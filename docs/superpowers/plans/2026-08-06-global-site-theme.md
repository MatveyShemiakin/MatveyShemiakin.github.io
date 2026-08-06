# Global Site Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared light/dark theme switch beside RU/EN on every public page, with saved preference and compatibility across existing page families.

**Architecture:** A synchronous head initializer prevents a wrong-theme first paint. A deferred controller mounts the control and synchronizes existing components. A single override stylesheet supplies page-family palettes while preserving current layout and images.

**Tech Stack:** Vanilla HTML5, CSS3, Vanilla JavaScript, Python 3 injection script, Node.js static regression tests, GitHub Pages.

## Global Constraints

- No React, npm build system or CSS framework.
- No inline `style` attributes are introduced.
- The first visit follows the operating-system theme.
- Manual choice is stored in `site_theme_v1`.
- The control appears beside RU/EN on desktop and mobile, in RU and EN.
- No permanent `MutationObserver` or new `backdrop-filter` is allowed.
- Only public pages from `sitemap.xml` are updated.

---

### Task 1: Regression contract

**Files:**
- Create: `tests/site-theme.test.mjs`

**Interfaces:**
- Consumes: `sitemap.xml` and current public HTML.
- Produces: assertions used by all later tasks.

- [ ] Write tests that require one initializer, stylesheet and controller on every sitemap page.
- [ ] Verify the test fails before implementation.
- [ ] Add requirements for script order, storage key, RU/EN labels, no observer, no blur and clinical compatibility.
- [ ] Re-run and retain the failing result as the red phase.

### Task 2: Early theme state

**Files:**
- Create: `site-theme-init.js`

**Interfaces:**
- Produces: `data-site-theme`, `data-theme`, `data-site-theme-family`, `window.__siteThemeInitial`.

- [ ] Read `site_theme_v1`, then legacy keys, then `prefers-color-scheme`.
- [ ] Set both current and compatibility attributes before body rendering.
- [ ] Classify each public path family.
- [ ] Validate with `node --check site-theme-init.js`.

### Task 3: Theme control and synchronization

**Files:**
- Create: `site-theme.js`

**Interfaces:**
- Consumes: early attributes and `.site-language-switch`.
- Produces: `[data-site-theme-toggle]` and `site-theme-change` events.

- [ ] Remove page-specific legacy theme controls.
- [ ] Mount one localized accessible button after the language switch.
- [ ] Persist changes to `site_theme_v1` and mirror compatibility keys.
- [ ] Synchronize the IOL page, mobile navigation, mobile search and theme-color.
- [ ] Add storage and system preference listeners without attribute observers.
- [ ] Validate with `node --check site-theme.js`.

### Task 4: Page-family palettes

**Files:**
- Create: `site-theme.css`
- Reuse: `bacterial-theme-contrast-v14-1.css`
- Reuse: `bacterial-theme-contrast-v14-2.css`
- Reuse: `bacterial-theme-contrast-v14-3.css`

**Interfaces:**
- Consumes: `data-site-theme` and `data-site-theme-family`.
- Produces: visual light/dark states without layout changes.

- [ ] Style the shared theme button.
- [ ] Add dark surfaces and text colors for home, patient, doctor, terms and privacy families.
- [ ] Keep clinical images unchanged.
- [ ] Concatenate the reviewed bacterial contrast rules into the deployed stylesheet.
- [ ] Confirm no `backdrop-filter` exists in the new stylesheet.

### Task 5: Public-page integration

**Files:**
- Create: `scripts/inject_site_theme.py`
- Modify: all 27 public HTML files from `sitemap.xml`
- Modify: `patients/iol-dislocation/script.js`
- Modify: RU/EN penetrating-keratoplasty inline theme initialization

**Interfaces:**
- Consumes: sitemap URL list.
- Produces: one head initializer, one stylesheet and one deferred controller per public page.

- [ ] Inject the head assets immediately before `</head>`.
- [ ] Inject the deferred controller immediately before `</body>` after language-switch markup.
- [ ] Add the bacterial clinical body class statically.
- [ ] Bridge IOL and penetrating-keratoplasty legacy theme logic to `site_theme_v1`.
- [ ] Keep `konspekt.html` unchanged.

### Task 6: Verification and publication

**Files:**
- Test: `tests/site-theme.test.mjs`

**Interfaces:**
- Consumes: completed implementation.
- Produces: verified GitHub Pages release.

- [ ] Run `node --check` on all theme JavaScript files and changed page scripts.
- [ ] Run `node tests/site-theme.test.mjs`.
- [ ] Run `python3 -m py_compile scripts/inject_site_theme.py`.
- [ ] Run `git diff --check`.
- [ ] Commit only production files, tests and documentation.
- [ ] Push to `main`, remove the temporary publishing workflow and verify GitHub Pages success.
