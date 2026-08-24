# Doctors Retention + Telegram Design

## Goal

Turn `/for-doctors/` from a static library into a returning professional workspace while keeping the existing Vanilla HTML/CSS/JS architecture and the current `for-doctors/updates.json` feed as the single source of truth. Every published clinician update must also be eligible for automatic publication to `@DrShemMYu` after the update reaches the repository.

## Constraints

- Static GitHub Pages only: Vanilla HTML5, CSS3 and JavaScript.
- No React, npm application runtime, bundlers, or CSS frameworks.
- No inline `style="..."`; new styling lives in CSS files.
- Preserve the existing site container/grid language, typography, dark/light themes, RU/EN structure, mobile behaviour and existing clinician audience gate.
- No server-side account system. Personal state is device-local via `localStorage`.
- `for-doctors/updates.json` remains the canonical update feed. Do not create a competing update database.
- Telegram publication must never expose the bot token to client-side code.

## Existing foundation

The repository already contains:

- `for-doctors/updates.json` + `updates-manifest.json` generated from clinician materials.
- `scripts/generate_doctors_updates.py` for revision detection.
- `for-doctors/doctors-updates.js` and `.css` for unread update notifications.
- GitHub Actions that regenerate the feed and inject shared modules.
- RU and EN clinician hubs.

The new subsystem extends these pieces instead of replacing them.

## Architecture

### 1. Clinician metadata

Create `for-doctors/professional-meta.json` as a small editorial metadata map keyed by slug. Each entry may contain:

- `topics`: stable machine-readable topic identifiers (`cornea`, `cataract-iol`, `glaucoma`, `retina`, `drugs`, `research`, `events`).
- `priority`: optional integer for recommendation ordering.

`generate_doctors_updates.py` enriches feed items with `topics` while preserving all existing fields and revision logic. Missing metadata produces an empty topic list rather than breaking generation.

### 2. Retention state

Create `for-doctors/doctor-retention.js`. It owns only clinician workspace state and exports pure functions for tests.

Local storage keys:

- `doctor_topics_v1`: selected topic ids.
- `doctor_bookmarks_v1`: saved material records.
- `doctor_continue_v1`: most recent progress records keyed by pathname.
- `doctor_last_visit_v1`: prior clinician-hub visit date/time.

Behaviour:

- Topic chips toggle preferences locally.
- Bookmark controls save/remove the current professional material.
- Reading progress records pathname, title, last relevant heading, ratio and timestamp.
- The hub renders `New for you`, `Continue working`, and `Saved` from feed + local state.
- Return visit count is derived by comparing feed update dates with the previous hub visit timestamp.
- All storage access is exception-safe.

### 3. Hub UI

The RU and EN `/for-doctors/` pages receive one professional workspace section before the existing material library. The section uses the existing `.container`, heading typography and card language; dedicated selectors live in `doctor-retention.css`.

The workspace contains:

- update summary (`N updates since your last visit`),
- topic preference chips,
- `Continue working`,
- `Saved`,
- personalized `For you` items,
- Telegram CTA to `https://t.me/DrShemMYu`.

The existing header bell remains unchanged and continues to expose the full unread update feed.

### 4. Material-page injection

Create `scripts/inject_doctor_retention.py`, following the existing injector pattern. It injects a marked clinician-retention module into each `for-doctors/*/index.html` and matching EN page, excluding the hub itself.

The injected module provides:

- bookmark button,
- related professional materials container,
- Telegram CTA,
- retention JS/CSS includes.

The related-material algorithm runs client-side from the canonical feed and prefers topic overlap. `OphthaSearch` and events become cross-links naturally through topic metadata. Future `OphthaDrug` becomes eligible automatically once its page appears in the feed and receives metadata.

### 5. Analytics

Use the existing consent-aware Yandex Metrika pattern. Add goals:

- `doctor_return_visit`
- `doctor_topic_follow`
- `doctor_bookmark_add`
- `doctor_bookmark_remove`
- `doctor_continue_open`
- `doctor_related_open`
- `doctor_telegram_click`

No analytics is sent unless the existing analytics consent is present.

### 6. Telegram publication

Create `scripts/publish_doctors_updates_telegram.py` with pure functions for:

- detecting new/revised events by `event_id` between previous and current feeds,
- localizing/formatting the Russian Telegram post,
- building the canonical absolute site URL.

Create `.github/workflows/publish-doctors-updates-telegram.yml` triggered only when `for-doctors/updates.json` changes on `main`.

Flow:

1. checkout with enough history for `HEAD^`,
2. compare current feed with previous committed feed,
3. select event ids not present previously,
4. publish each event through Telegram Bot API,
5. channel defaults to `@DrShemMYu`,
6. bot token comes only from `secrets.TELEGRAM_BOT_TOKEN`,
7. if the token is absent the workflow exits safely without exposing or inventing credentials.

Because the existing injection workflow regenerates `updates.json` only after a clinician material changes, Telegram publication occurs on the resulting feed revision rather than on every source-code push.

## Telegram post format

Russian-only publication for the current channel:

- first line: `Обновление для врачей` or `Новый материал для врачей`,
- title,
- concise feed description,
- canonical link to `https://matveyshemyakin.ru/for-doctors/.../`.

No automatic clinical interpretation beyond the text already approved in the published feed.

## Error handling

- Corrupt/missing localStorage state falls back to empty state.
- Missing topic metadata yields `topics: []`.
- Feed fetch failure leaves the static site usable and hides empty dynamic blocks.
- Telegram network/API failure must fail the publish job so it is visible in Actions; it must not alter the website feed.
- Missing Telegram secret skips publication with an explicit workflow message.

## Testing

- Node tests for retention pure functions and existing update functions.
- Python tests for feed enrichment and retention injection idempotency.
- Python tests for Telegram event detection and message formatting without network access.
- Existing RU/EN desktop/mobile/light/dark smoke render remains in the clinician workflow and is extended to assert the new workspace hooks.
- Syntax checks for all changed JS/Python files.

## Rollout

Implement on `feature/doctors-retention-telegram`, open a PR, run the existing clinician CI, then merge only after green checks. Telegram publication becomes live after `TELEGRAM_BOT_TOKEN` is configured in repository Actions secrets and the bot is an administrator of `@DrShemMYu` with posting permission.
