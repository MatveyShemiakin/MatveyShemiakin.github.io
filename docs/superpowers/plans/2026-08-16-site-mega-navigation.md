# Global Mega Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single RU/EN desktop mega-menu with Patients, For doctors, and About the doctor groups across the site while preserving the existing mobile navigation.

**Architecture:** A global Vanilla JS component generates the navigation from a central data model and mounts into recognised header structures. A dedicated CSS file owns all visual and responsive behaviour. A Python injector adds both assets to site HTML idempotently via the existing GitHub Actions generation workflow.

**Tech Stack:** Vanilla HTML5/CSS3/JavaScript, Python 3.12 build injection, Node/Python tests, GitHub Pages.

## Global Constraints
- No React/npm/frameworks.
- No inline `style` attributes.
- Use existing navy/blue visual language.
- Desktop mega-menu hidden at `<=1020px`; existing mobile navigation is unchanged.
- RU and EN must be supported.
- Top-level labels remain direct links; chevrons toggle menus.

---

### Task 1: Failing tests for global menu
**Files:**
- Create: `tests/test_site_mega_nav.py`
- Create: `tests/site-mega-nav.test.mjs`
- Modify: `.github/workflows/inject-legal.yml`

- [ ] Add Python tests for injector asset insertion/idempotency and representative header patterns.
- [ ] Add Node static/behaviour-contract tests for menu groups, RU/EN routes, accessibility hooks and no inline styles.
- [ ] Add test commands to workflow.
- [ ] Run workflow and confirm RED because implementation files/functions do not exist.

### Task 2: Mega-menu component
**Files:**
- Create: `site-mega-nav.js`
- Create: `site-mega-nav.css`

- [ ] Implement central RU/EN menu data.
- [ ] Mount into `.site-header`, `.patient-header`, `.site-head`, and `.doctors-header` patterns.
- [ ] Replace legacy desktop nav only after successful mount.
- [ ] Add hover/focus/click/Escape/outside-click behaviour.
- [ ] Preserve direct top-level links.
- [ ] Hide the component at `<=1020px`.
- [ ] Run Node tests and syntax check.

### Task 3: Build injector
**Files:**
- Create: `scripts/inject_site_mega_nav.py`
- Modify: `.github/workflows/inject-legal.yml`

- [ ] Add idempotent stylesheet/script injection to HTML pages.
- [ ] Run representative Python tests.
- [ ] Run injector in GitHub Actions.
- [ ] Verify generated RU/EN pages contain one CSS and one JS reference.

### Task 4: Final verification and publication
**Files:** existing generated HTML only.

- [ ] Verify main RU/EN, patient hub, glaucoma/IOL, cataract and professional-library pages.
- [ ] Verify no changes to `mobile-nav.js`/`mobile-nav.css`.
- [ ] Confirm all automated tests pass.
- [ ] Confirm GitHub Pages deployment succeeds.
