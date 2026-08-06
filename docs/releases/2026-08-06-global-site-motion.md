# Global site motion release

## Scope

The release adds one shared motion layer to all 27 public URLs listed in `sitemap.xml`. The same production assets serve Russian and English pages and adapt to desktop, tablet and mobile viewports.

## Included behaviours

- A 2 px reading-progress indicator on sufficiently long pages.
- One-time reveal transitions for ordinary content sections.
- Restrained hover and press feedback for linked cards and calls to action.
- Native FAQ and `<details>` opening feedback without replacing browser semantics.
- Localized next-material navigation for mapped patient and professional reading routes.

## Medical-safety and accessibility safeguards

- Urgent, warning, emergency, red-flag, alert and medical-disclaimer blocks are excluded from delayed reveal.
- Pages that already own a reading-progress control do not receive a duplicate global control.
- `prefers-reduced-motion: reduce` disables displacement, transition and detail-entry motion.
- Coarse-pointer devices do not depend on hover to communicate interactivity.
- Keyboard order and native `<details>` semantics are unchanged.

## Technical implementation

- `site-motion.css` contains all visual states and responsive rules.
- `site-motion.js` uses one `IntersectionObserver`, `requestAnimationFrame` and passive scroll handling.
- No framework, package manager, external animation library, inline style or `MutationObserver` was added.
- `scripts/inject_site_theme.py` injects the two shared assets exactly once on every public sitemap page.
- Theme bridges for the IOL-dislocation and penetrating-keratoplasty pages are idempotent.

## Verification

The feature workflow performs two consecutive generator runs and compares their output before running:

```bash
node --test tests/site-motion.test.mjs
node --test tests/mobile-navbar.test.mjs
node --test tests/penetrating-keratoplasty-page.test.mjs
node --test tests/site-breadcrumbs.test.mjs
node --test tests/site-theme.test.mjs
```

The focused motion test confirms RU/EN route copy, responsive and reduced-motion rules, critical-content exclusions, single asset inclusion on 27 public pages, technical-page exclusion, and the absence of prohibited dependencies and effects.
