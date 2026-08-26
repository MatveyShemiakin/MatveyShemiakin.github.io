# Unified Site Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the main-page header the canonical header shell for every public RU/EN page without changing editorial or medical `<main>` content.

**Architecture:** Add `site-header-unified.js` and `site-header-unified.css` as a shared runtime layer. A Python injector guarantees those assets are loaded exactly once on every public HTML page. The runtime replaces legacy header shells with one canonical DOM structure, reuses existing patient/doctor update bells when present, delegates desktop navigation to `site-mega-nav.js`, and leaves mobile primary navigation to `mobile-nav.js`.

**Tech Stack:** Vanilla HTML5/CSS3/JS, Python 3.12 standard library, Node 22 tests, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-26-unified-site-header-design.md`

## Global Constraints

- Main-page header is the visual reference.
- Vanilla HTML/CSS/JS only; no framework/build system.
- No new inline `style=` attributes.
- Do not modify medical/editorial content inside `<main>`.
- Preserve patient and doctor update read state and existing bell DOM nodes.
- Do not duplicate mega navigation or mobile navigation.
- RU/EN equivalent structure; light/dark and desktop/mobile supported.
- Preserve page breadcrumbs, heroes, TOCs, clinical tools below the header.

---

### Task 1: Idempotent shared-header injector

**Files:**
- Create: `scripts/inject_unified_header.py`
- Create: `tests/test_unified_header_inject.py`
- Modify: `.github/workflows/inject-legal.yml`

**Interfaces:**
- Produces `inject_unified_header(text: str) -> str`.
- Injects `/site-header-unified.css?v=20260826-1` before `</head>` and `/site-header-unified.js?v=20260826-1` before `</body>` exactly once.

- [ ] Write failing unittest cases for: assets added once, second injection unchanged, `<main>` bytes unchanged, no inline style introduced.
- [ ] Verify RED with `python -m unittest tests/test_unified_header_inject.py`.
- [ ] Implement the minimal injector using string-safe insertion around closing tags.
- [ ] Verify GREEN and add the injector/tests to the main injection workflow before existing navigation tests.

### Task 2: Canonical runtime DOM normalization

**Files:**
- Create: `site-header-unified.js`
- Create: `tests/site-header-unified.test.mjs`

**Interfaces:**
- Exports for Node tests: `pageContext(path, lang)`, `languageRoutes(path, lang)`, `normalizeHeader(document, windowLike)`.
- Canonical shell classes: `.unified-site-header`, `.unified-site-header__inner`, `.unified-site-header__brand`, `.unified-site-header__nav-mount`, `.unified-site-header__context`, `.unified-site-header__controls`.

- [ ] Write failing tests with representative legacy DOM fixtures: main `.site-header`, patient `.patient-header`, doctor `.doctors-header`, collaboration `.site-header/.header-inner`.
- [ ] Assert exactly one canonical header, preserved bell nodes by identity/id, correct RU/EN links, no duplicate `.site-mega-nav`, no removal/change of `<main>`.
- [ ] Verify RED with `node --test tests/site-header-unified.test.mjs`.
- [ ] Implement minimal runtime: identify existing header, detach contextual bell if present, create canonical shell, preserve monogram semantics, create language controls/theme button, replace legacy header, then allow `site-mega-nav.js` to mount into `.unified-site-header__nav-mount`.
- [ ] Verify GREEN; run `node --check site-header-unified.js` and existing mega/mobile nav tests.

### Task 3: Adapt mega-nav mounting to canonical shell

**Files:**
- Modify: `site-mega-nav.js`
- Modify: `tests/site-mega-nav.test.mjs`

**Interfaces:**
- `findMount()` must prefer `.unified-site-header__nav-mount` and insert the single mega-nav there.

- [ ] Add a failing mega-nav regression for canonical mount.
- [ ] Verify RED.
- [ ] Add the canonical mount branch without changing menu data.
- [ ] Verify GREEN and ensure existing patient/doctors/main legacy fixtures still pass.

### Task 4: Canonical shared styling

**Files:**
- Create: `site-header-unified.css`
- Modify: `tests/site-header-unified.test.mjs` only if structural class assertions are needed.

**Interfaces:**
- Desktop >=1021px: 98px main-page-equivalent header, thin lower border, MS monogram, mega nav, contextual bell, RU/EN pill, theme toggle.
- Mobile <=1020px: 76px header with MS + contextual control (when present) + RU/EN + theme; desktop mega nav hidden; bottom `mobile-nav.js` remains primary navigation.

- [ ] Implement only external CSS; no inline style.
- [ ] Include dark/light variables, focus-visible state, reduced-motion handling and safe z-index for update panels/mega menu.
- [ ] Run existing global contrast audit plus representative browser smoke.

### Task 5: Global injection and coverage regression

**Files:**
- Create: `tests/unified-header-coverage.test.mjs` or equivalent Python coverage test.
- Modify: `.github/workflows/inject-legal.yml`

**Interfaces:**
- Enumerate public `.html` excluding tests/docs and verify each receives shared assets once after injector execution.

- [ ] Write coverage test before bulk injection and confirm it fails.
- [ ] Run `python scripts/inject_unified_header.py` across repository public HTML.
- [ ] Re-run coverage and all patient/doctors/analytics/navigation regressions.
- [ ] Confirm no `<main>` medical-content regression hashes are changed where such locks exist.

### Task 6: Visual verification and rollout

**Files:**
- Create/modify CI workflow for header smoke screenshots if needed.

**Interfaces:**
- Representative pages: `/`, `/patients/`, `/patients/cataract/`, `/for-doctors/`, `/for-doctors/bacterial-keratitis/`, `/for-doctors/events/`, `/collaboration/` plus EN mirrors where available.
- Matrix: desktop/mobile × light/dark; verify single visible header and single mobile nav.

- [ ] Run structural/unit tests and syntax checks.
- [ ] Render smoke screenshots and DOM assertions in CI.
- [ ] Open PR, inspect changed-file scope and CI.
- [ ] Merge only after green checks.
- [ ] Verify post-merge injector workflow and final GitHub Pages build on generated `main` commit.
