# Global Light and Dark Theme Design

## Objective

Add one consistent light/dark theme control to every public Russian and English page of matveyshemyakin.ru on desktop and mobile devices.

## Approved behaviour

- The first visit follows `prefers-color-scheme`.
- A manual choice is stored under `site_theme_v1` and takes priority on later visits.
- The same choice persists across Russian and English pages and all site sections.
- The control is placed directly beside the unified RU/EN language switch.
- The control uses localized accessible labels in Russian and English.
- The browser `theme-color`, mobile navbar, mobile search, legal controls and existing clinical-page themes stay synchronized.
- No permanent `MutationObserver`, `backdrop-filter`, framework or third-party dependency is introduced.

## Architecture

### Early initializer

`site-theme-init.js` is parser-blocking in `<head>`. It reads the saved preference or system preference before `<body>` is rendered, then sets:

- `html[data-site-theme]`;
- `html[data-theme]` for compatibility with existing clinical pages;
- `html[data-site-theme-family]` based on the current pathname.

Legacy keys are read only for migration to the new shared key.

### Interactive controller

`site-theme.js` runs after `site-language-switch.js`. It:

- removes old page-specific theme buttons;
- mounts one standardized button beside `.site-language-switch`;
- applies and persists user changes;
- mirrors the value to legacy keys while old page scripts still exist;
- synchronizes `.sim-page`, the mobile navbar, mobile search and `theme-color`;
- responds to cross-tab storage changes and system-theme changes only while no manual preference exists.

### Theme stylesheet

`site-theme.css` contains:

- the shared button component;
- dark palette overrides for the main website, patient pages, professional library, legal pages and floating controls;
- compatibility rules for the IOL page;
- the already reviewed bacterial-keratitis contrast rules concatenated into the compiled file;
- no image inversion and no layout changes.

The penetrating-keratoplasty page continues using its existing `html[data-theme]` variables.

## Page coverage

The injector reads `sitemap.xml` and updates exactly the 27 public HTML pages listed there. `konspekt.html` and non-public technical pages are excluded.

## Accessibility

- Button target is 41 × 41 px on desktop and 37 × 37 px on mobile.
- `aria-label`, `title`, `aria-pressed` and visible icon state are updated on every change.
- Focus outline remains clearly visible.
- Colors use explicit dark surfaces rather than filters or image inversion.
- Reduced-motion preferences disable the control transition.

## Performance constraints

- No observers that watch theme attributes.
- No blur effect on the new control.
- One small early script, one deferred controller and one stylesheet.
- No eager rendering of additional UI.

## Verification

Static regression tests verify all sitemap pages, single asset inclusion, correct script order, RU/EN support, shared storage key, absence of `MutationObserver` and `backdrop-filter`, clinical compatibility hooks and exclusion of `konspekt.html`.
