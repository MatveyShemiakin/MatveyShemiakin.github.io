# Responsive events calendar and globe
Goal: Fit the monthly calendar at 320px and add a rotating geographic events view in RU/EN.
Architecture: retain the existing vanilla calendar and shared header. A compact month with a selected-day agenda replaces overflowing mobile labels. A lazy WebGL sphere uses a local Natural Earth land texture; city markers and a keyboard-accessible city list open existing event dialogs. Locations represent city centres, not exact venues. No Google account, third-party scripts, tiles or tracking.
Alternatives: full map SDK adds downloads and provider dependencies; a flat map does not satisfy rotation. Use the lightweight local globe.
Tasks: (1) tests for projection, front/back visibility, grouping and coordinate coverage, (2) implement globe and mobile agenda, (3) run header/dataset/startup/regression checks, (4) publish, exercise live RU/EN views and inspect overflow.
Checks: filters and no-results; keyboard and touch; light/dark; WebGL unavailable city-list fallback; preserve data and shared header.
