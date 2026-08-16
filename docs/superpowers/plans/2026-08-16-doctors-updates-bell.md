# Doctors Updates Bell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized “Что нового / What’s new” bell to the clinician library and automatically generate unread update events when a clinician-facing clinical material is first published or its `<main>` clinical content changes.

**Architecture:** A Python generator fingerprints only each clinical document’s `<main>` content, pairs RU and EN pages by slug, and persists per-material fingerprint/revision state in `for-doctors/updates-manifest.json`. It emits a public `for-doctors/updates.json`; a separate injected vanilla-JS component renders the bell on the two `/for-doctors/` hub pages and tracks read event revisions in its own localStorage namespace.

**Tech Stack:** Static HTML5/CSS3, Vanilla JS, Python 3.12 standard library, GitHub Actions, Node 22 tests.

## Global Constraints

- No React, npm application runtime, build framework, or CSS framework.
- No inline `style="..."` in newly injected markup; component styling lives in `for-doctors/doctors-updates.css`.
- Preserve existing medical text; the feature only reads clinical HTML and changes hub/infrastructure files.
- RU and EN represent one material event, not duplicate notifications.
- Technical-only header/footer/navigation/analytics/style changes must not create an update because the fingerprint is based on `<main>` only.
- Read state must be independent from the patient bell and a later revision of an already-read material must become unread again.

---

### Task 1: Clinical update generator

**Files:**
- Create: `scripts/generate_doctors_updates.py`
- Create: `tests/test_generate_doctors_updates.py`
- Generate: `for-doctors/updates.json`
- Generate: `for-doctors/updates-manifest.json`

**Interfaces:**
- Produces: `build_updates(root: Path, today: str) -> tuple[list[dict], dict]`
- Public feed fields: `id`, `event_id`, `published`, `updated`, `revision`, `kind`, `title`, `title_en`, `description`, `description_en`, `url`, `url_en`.

- [ ] Write tests proving: first discovery creates `kind=new`; second unchanged run is stable; a `<main>` change increments revision and produces `kind=updated`; header/footer-only changes do not; RU/EN pages with the same slug are one item.
- [ ] Run `python -m unittest tests/test_generate_doctors_updates.py` and verify the tests fail because the generator does not exist.
- [ ] Implement the generator using only Python standard library. Extract `<main>...</main>` with an `HTMLParser`-based canonicalizer, normalize insignificant whitespace, SHA-256 the canonical content, and preserve previous publication/revision state from the manifest.
- [ ] Run the generator against the repository to seed the current clinician materials.
- [ ] Run the generator tests again and verify they pass.

### Task 2: Clinician bell UI and independent unread state

**Files:**
- Create: `for-doctors/doctors-updates.js`
- Create: `for-doctors/doctors-updates.css`
- Create: `tests/doctors-updates.test.mjs`

**Interfaces:**
- Consumes: `/for-doctors/updates.json`.
- Produces: `normalizeUpdates`, `eventKey`, `readSeen`, `writeSeen`, `unreadEventIds`, `withReadEvent`, `withAllRead`, `init` for browser/CommonJS testing.

- [ ] Write tests proving feed normalization/sorting, RU/EN localization selection, independent storage key, revision-based unread identity, and marking one/all events read.
- [ ] Run `node --test tests/doctors-updates.test.mjs` and verify failure before implementation.
- [ ] Implement the JS component by adapting the proven patient bell interaction pattern while using storage key `doctor_updates_read_v1` and analytics goals prefixed `doctors_`.
- [ ] Implement external CSS with the existing bell/panel visual language, responsive fixed panel below 900px, and high-contrast light/dark-compatible colors.
- [ ] Run Node syntax/test checks and verify green.

### Task 3: Idempotent RU/EN hub injection

**Files:**
- Create: `scripts/inject_doctors_updates.py`
- Create: `tests/test_doctors_updates_inject.py`
- Modify/generated: `for-doctors/index.html`
- Modify/generated: `en/for-doctors/index.html`

**Interfaces:**
- Produces: `inject_doctors_updates(text: str, lang: str) -> str`.

- [ ] Write tests proving the shell, CSS, and deferred JS are injected once; RU/EN labels differ; injection is adjacent to the clinician language switch; and no inline `style=` is introduced.
- [ ] Run `python -m unittest tests/test_doctors_updates_inject.py` and verify failure before implementation.
- [ ] Implement the injector with deterministic markup IDs/classes and localized accessible labels.
- [ ] Run the injector on both hubs and run its tests again.

### Task 4: GitHub Actions automation

**Files:**
- Modify: `.github/workflows/inject-legal.yml`

**Interfaces:**
- Workflow order: generate clinician feed → inject clinician bell → existing injectors → tests → commit generated HTML/feed/manifest.

- [ ] Add clinician update source/generator/UI/test paths to the workflow trigger list.
- [ ] Add `python scripts/generate_doctors_updates.py` and `python scripts/inject_doctors_updates.py` before tests.
- [ ] Add Python/Node clinician update tests and syntax checks.
- [ ] Extend generated commit staging to include `for-doctors/updates.json` and `for-doctors/updates-manifest.json`.

### Task 5: End-to-end verification and publication

**Files:**
- No new production files beyond Tasks 1–4.

- [ ] Run all new generator, injector, and UI tests plus existing site navigation/update tests.
- [ ] Verify generated feed contains one record per current RU/EN clinician material and no `professional-use.html` entry.
- [ ] Verify PR CI succeeds.
- [ ] Merge to `main` and verify the existing post-merge injection workflow succeeds.
- [ ] Verify GitHub Pages builds the resulting `main` commit successfully.
