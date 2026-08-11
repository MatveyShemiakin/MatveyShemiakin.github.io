# Yandex Metrika consent-gated integration design

## Goal
Connect Yandex Metrika counter `111504350` across every static HTML page of `matveyshemyakin.ru` without bypassing the site's existing analytics-consent flow.

## Approved approach
The site already stores the visitor's analytics choice in `localStorage` under `site_cookie_choice` and emits `site:analytics-consent` from `legal.js`. A new root-level `analytics.js` will be loaded early on every HTML page, but it must not contact Yandex until the stored choice is exactly `analytics` or the consent event is emitted.

## Components
- `analytics.js`: idempotent consent-gated Yandex Metrika loader and initializer.
- `scripts/inject_legal.py`: also injects/version-normalizes `/analytics.js?v=20260811-1` immediately after the opening `<head>` on every static HTML page; fallbacks handle malformed pages without a head.
- `.github/workflows/inject-legal.yml`: watches `analytics.js`, so future analytics changes re-run the site-wide injector.
- `tests/site-analytics.test.mjs`: verifies no Yandex network loader before consent, one-time initialization after consent, stored-consent startup, and global injection configuration.

## Metrika configuration
Counter: `111504350`.
Options: `ssr: true`, `webvisor: true`, `clickmap: true`, `ecommerce: 'dataLayer'`, current referrer and URL, `accurateTrackBounce: true`, `trackLinks: true`.

## Privacy behavior
No request to `mc.yandex.ru` is made before analytics consent. The `<noscript>` tracking pixel is intentionally omitted because it cannot participate in the JavaScript consent flow. Existing cookie banner wording and visual design remain unchanged.

## Constraints
- Vanilla HTML/CSS/JS only.
- No inline styles.
- No visual changes.
- Existing `legal.js` consent model remains authoritative.
- New pages must automatically receive the analytics loader through the existing injector workflow.

## Verification
Run `node --test tests/site-analytics.test.mjs`, `node --check analytics.js`, and `python3 -m py_compile scripts/inject_legal.py`. After deployment, verify representative RU/EN, patient, doctor, and privacy pages contain the versioned loader and that the workflow-generated commit updated all HTML pages.
