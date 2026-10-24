# Shared website header implementation plan

Goal: replace page-specific header copies with the approved header across public RU/EN pages.
Architecture: author-time HTML fragment injection using existing Python publishing tools; scoped CSS; existing Vanilla JS controllers.
Spec: docs/superpowers/specs/2026-10-24-shared-site-header.md
Constraints: Vanilla HTML/CSS/JS only, existing classes, no inline styles, no changed article/media content.

## Review focus
- Preserve hero content nested in patient headers and homepage overlay placement.
- Ignore obsolete doctors-header rewriting and prevent duplicate controls.
- Correct language counterparts, including unpaired RU-only pages.
- Prevent old CSS/script versions from returning through automatic generators.
- Avoid the tablet gap between desktop dropdowns and the mobile bar.

## Tasks
- [x] 1. Add regression tests for the real page variants, content preservation, idempotence and asset versions; observe failures.
- [x] 2. Implement shared/site-header.html, scripts/site_header.py and site-header.css; wire final injector and feed generation; run generation and preservation tests.
- [x] 3. Let existing controls adopt shared markup; guard the doctors rewriter; fix dropdown focus/Escape synchronization; align tablet navigation; run behavior and regression tests.
- [ ] 4. Add CI validation and root instructions, regenerate all pages, review the entire diff, publish authorized changes and verify live RU/EN representative pages and controls.

Review: nested patient headers, notification widgets/local anchors, language fallback URLs and theme state were checked independently and fixed with regression tests. Python suite: 49 pass. Full Node suite: 278 pass; 8 existing failures also reproduce in the baseline (patient ecosystem, clinical-header legacy assertion, four analytics checks, breadcrumbs, motion). Header-focused tests pass. Main content comparison across all 56 pages found no non-navigation changes. Live visual validation remains the final publication step.
