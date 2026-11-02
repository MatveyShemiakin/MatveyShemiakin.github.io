# Worldwide events release implementation plan

**Goal:** Complete PR #80 and publish a verified RU/EN calendar.
**Architecture:** Existing static JSON catalogues enhanced by Vanilla JS; generated HTML remains useful without JS. Preserve existing CSS classes and shared header.
**Tech stack:** HTML, CSS, JS, Python maintenance scripts; no production build dependencies.
**Spec:** User request in PR #80: official sources worldwide, no unconfirmed details, both locales/devices/themes, merge and production verification already authorized.

## Constraints
- Work in the requested events-worldwide-2026-11-02 branch in this fresh checkout.
- No frameworks, generated imagery, inline styles or page-specific header overrides.
- Unknown dates/deadlines/registration states must not be inferred.

## Review focus
- Regional/category labels must match filter values in both languages.
- Every physical meeting must resolve to a correct globe marker.
- Deadline wall dates and calendar exports must survive visitor timezone changes.
- Offline/failed data requests retain the static catalogue.
- Long titles, dialogs and calendar must fit 320px through desktop widths.

## Tasks
- [x] 1. Audit every existing event's official source and search society calendars across all represented regions; record evidence and exclusions. Correct/deduplicate both JSON datasets and normalize translations. Test locale parity, evidence coverage and duplicate identity.
- [x] 2. Reproduce interface regressions using existing tests and local browser integration checks. Add failing regression coverage, repair minimal causes, regenerate HTML using scripts/render_events.py and scripts/site_header.py.
- [x] 3. Run event/header tests plus RU/EN mobile/desktop light/dark browser matrix including search, filters, calendar, globe, dialogs, links and overflow. Review final diff independently, commit, push and merge PR #80 using expected head SHA. Verify live assets and rerun production browser checks.

## Progress / decisions
- Initial HEAD: 96c9b79c403e7b010fd4b1a6402aab61a2e20dca.
- Baseline: event unit tests 15/16, globe drops 13 physical events; static catalogue tests fail in RU/EN (64 old cards vs 70 upcoming records).
- Browser extension tool is absent; cloud browser initialization fails (read-only session path). Use a local Chromium integration-test harness for this public static site; report that physical-device testing is unavailable.
- User explicitly authorized full implementation and publication; no approval handoff is required.

- Review fixes: all 40 retained deadline URLs are monitored with date-specific context; date-only call opening compares calendar days. Regression tests were observed failing, then passing (32 Node tests).
- Visual review of CI screenshots found the homepage hero min-height leaked into the events page on desktop; events CSS now clears that minimum.
- Unrelated baseline failure: Patient ecosystem checks expects an old IOL page SHA1; current IOL HTML is identical to main and untouched by this PR. Do not alter unrelated patient content or weaken that test.

- Task 3 complete: PR #80 merged as 9bbfbe547e1d86171d07a7b429dbe1957a3dad79. Production run 41416654091 passed 16/16 cases with imagery and zero JS errors; 11/11 public resources match main c183b21. Report: docs/events/2026-11-02-release-report.md.
