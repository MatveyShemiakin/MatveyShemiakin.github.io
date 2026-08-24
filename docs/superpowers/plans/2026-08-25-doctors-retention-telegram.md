# Doctors Retention + Telegram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a device-local professional workspace to `/for-doctors/` and publish every new clinician feed revision to `@DrShemMYu` through a secure GitHub Actions workflow.

**Architecture:** Keep `for-doctors/updates.json` as the canonical feed. Enrich it with editorial topics, render retention state in a dedicated Vanilla JS module, inject shared controls into clinician material pages with the existing Python-injector pattern, and publish only newly created `event_id` values to Telegram after the generated feed changes.

**Tech Stack:** Vanilla HTML5/CSS3/JS, Python 3.12 stdlib, Node 22 test runner, GitHub Actions, Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-08-25-doctors-retention-telegram-design.md`

## Global Constraints

- Static GitHub Pages only; no React, npm runtime, bundler or CSS framework.
- No inline `style="..."` in new markup.
- Preserve RU/EN, dark/light, desktop/mobile and existing clinician audience gating.
- Use `localStorage`; no account or server database.
- Keep `for-doctors/updates.json` as the only canonical clinician-update feed.
- Never expose `TELEGRAM_BOT_TOKEN` client-side.

---

### Task 1: Feed topic metadata

**Files:**
- Create: `for-doctors/professional-meta.json`
- Modify: `scripts/generate_doctors_updates.py`
- Modify: `tests/test_generate_doctors_updates.py`

**Interfaces:**
- Produces feed item field `topics: list[str]`.
- Missing metadata produces `topics: []`.

- [ ] Add failing generator tests asserting topic enrichment and safe missing metadata.
- [ ] Run `python -m unittest tests/test_generate_doctors_updates.py` and confirm the new assertions fail because `topics` is absent.
- [ ] Add metadata loading/normalization and enrich each feed item.
- [ ] Run the generator tests and confirm all pass.

### Task 2: Retention state module

**Files:**
- Create: `for-doctors/doctor-retention.js`
- Create: `for-doctors/doctor-retention.css`
- Create: `tests/doctor-retention.test.mjs`

**Interfaces:**
- Exports constants for four storage keys.
- Exports pure functions `normalizeTopics`, `toggleTopic`, `readJson`, `writeJson`, `newSinceVisit`, `upsertBookmark`, `removeBookmark`, `upsertProgress`, `relatedItems`.
- Browser `init(window, document)` enhances hub/material pages when matching hooks are present.

- [ ] Add failing Node tests for storage safety, topic toggling, new-since-last-visit calculation, bookmark upsert/remove, progress ordering and related-topic ranking.
- [ ] Run `node --test tests/doctor-retention.test.mjs` and confirm failure because module is missing.
- [ ] Implement the pure functions and browser initializer.
- [ ] Run `node --test tests/doctor-retention.test.mjs` and `node --check for-doctors/doctor-retention.js`.
- [ ] Add CSS using existing site variables, container proportions and theme tokens; do not add inline styles.

### Task 3: Inject workspace and material controls

**Files:**
- Create: `scripts/inject_doctor_retention.py`
- Create: `tests/test_doctor_retention_inject.py`
- Generated modifications: `for-doctors/index.html`, `en/for-doctors/index.html`, clinician material index pages.

**Interfaces:**
- Hub hook IDs: `doctor-workspace`, `doctor-return-summary`, `doctor-topic-list`, `doctor-continue-list`, `doctor-bookmark-list`, `doctor-personal-list`.
- Material hook IDs/classes: `doctor-material-tools`, `doctor-bookmark-toggle`, `doctor-related-list`.
- Markers: `<!-- doctor-retention:start -->...<!-- doctor-retention:end -->`.

- [ ] Add failing injector tests for RU/EN hub markup, material markup, exclusions and idempotency.
- [ ] Run `python -m unittest tests/test_doctor_retention_inject.py` and confirm failure because injector is missing.
- [ ] Implement injector using marker replacement and shared CSS/JS includes.
- [ ] Run injector tests until green.
- [ ] Run the injector once against the repository so generated HTML is committed.

### Task 4: Analytics + existing update compatibility

**Files:**
- Modify: `for-doctors/doctor-retention.js`
- Modify: `.github/workflows/doctors-updates.yml`
- Modify: `.github/workflows/inject-legal.yml`

**Interfaces:**
- Goals: `doctor_return_visit`, `doctor_topic_follow`, `doctor_bookmark_add`, `doctor_bookmark_remove`, `doctor_continue_open`, `doctor_related_open`, `doctor_telegram_click`.

- [ ] Add assertions in Node tests that `sendGoal` is consent-gated.
- [ ] Confirm failing test.
- [ ] Implement consent-aware goal helper using existing Metrika ID `111504350` and `site_cookie_choice=analytics`.
- [ ] Extend clinician workflows to run retention tests/injector and assert hub hooks in smoke DOM.
- [ ] Keep existing `doctors-updates.js` tests green.

### Task 5: Telegram publisher

**Files:**
- Create: `scripts/publish_doctors_updates_telegram.py`
- Create: `tests/test_publish_doctors_updates_telegram.py`
- Create: `.github/workflows/publish-doctors-updates-telegram.yml`

**Interfaces:**
- `detect_new_events(previous, current) -> list[dict]` compares by `event_id`.
- `format_message(item) -> str` emits Russian post text.
- `publish(token, chat_id, text)` uses Telegram Bot API over stdlib `urllib`.
- Default channel: `@DrShemMYu`.

- [ ] Add failing Python tests for new revision detection, stable feed no-op, absolute URL formatting and updated/new labels.
- [ ] Run `python -m unittest tests/test_publish_doctors_updates_telegram.py` and confirm failure because publisher is missing.
- [ ] Implement pure functions and CLI without network calls in tests.
- [ ] Add workflow triggered by `for-doctors/updates.json` on `main`, checkout with history, load previous feed from `HEAD^`, and publish only when `TELEGRAM_BOT_TOKEN` is present.
- [ ] Run publisher tests green.

### Task 6: Verification and PR

**Files:** all files above.

- [ ] Run/verify GitHub Actions on the feature PR: generator tests, update UI tests, retention JS tests, injector tests, Telegram publisher tests, syntax checks and RU/EN smoke renders.
- [ ] Inspect failing checks/logs and fix regressions before completion.
- [ ] Confirm no token or secret appears in repository content.
- [ ] Confirm `@DrShemMYu` exists only as channel target/link and bot token is referenced only as a secret.
- [ ] Merge only after green CI and final review.
