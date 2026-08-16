# Patient Consultation CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pathology-specific consultation CTA blocks to RU/EN glaucoma, cataract and IOL-dislocation patient pages, all linking to `https://t.me/ShemMYu`.

**Architecture:** Use a small idempotent Python injector, matching the repository’s existing generated-module pattern. The injector inserts or replaces a marked CTA before the author block on six target pages and injects one shared CTA stylesheet. Existing global analytics handles `data-analytics-cta` and Telegram links without changes.

**Tech Stack:** Vanilla HTML5/CSS3, Python 3.12 build script, unittest, GitHub Actions, GitHub Pages.

## Global Constraints
- No inline styles.
- Preserve existing page grids and visual language.
- Support RU/EN, desktop/mobile, light/dark themes.
- Do not alter urgent/red-flag medical guidance.
- CTA URL is exactly `https://t.me/ShemMYu`.
- CTA links use `target="_blank" rel="noopener" data-analytics-cta`.

---

### Task 1: Regression tests

**Files:**
- Create: `tests/test_patient_consultation_cta.py`

- [ ] Write tests asserting each of six target pages contains exactly one marked CTA after generation.
- [ ] Assert pathology-specific RU/EN headings, Telegram URL, new-tab safety attributes and `data-analytics-cta`.
- [ ] Assert old glaucoma contact CTA is absent.
- [ ] Assert stylesheet is loaded exactly once.

### Task 2: Shared CTA styles and injector

**Files:**
- Create: `patients/consultation-cta.css`
- Create: `scripts/inject_patient_consultation_cta.py`

- [ ] Create shared CSS that reuses `.section-next` on glaucoma/IOL pages and provides a matching cataract CTA card.
- [ ] Create an idempotent injector with explicit six-page configuration and pathology-specific copy.
- [ ] Replace the legacy glaucoma consultation block rather than adding a duplicate.
- [ ] Insert CTA immediately before the author section on cataract and IOL pages.
- [ ] Inject stylesheet into the six target `<head>` elements once.

### Task 3: CI integration

**Files:**
- Modify: `.github/workflows/inject-legal.yml`

- [ ] Add the new CSS/script/test paths to workflow triggers.
- [ ] Run the CTA injector after other HTML injectors.
- [ ] Run `python -m unittest tests/test_patient_consultation_cta.py`.
- [ ] Let the workflow commit generated HTML changes.

### Task 4: Verification

- [ ] Confirm workflow conclusion is `success`.
- [ ] Inspect RU glaucoma, cataract and IOL generated HTML and one EN page.
- [ ] Confirm GitHub Pages deploy for the generated commit is successful.
