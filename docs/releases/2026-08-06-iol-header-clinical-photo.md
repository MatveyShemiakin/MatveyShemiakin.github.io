# IOL header clinical photo — 2026-08-06

## Changes

- Added the uploaded slit-lamp photograph as a web-optimized clinical image asset without generative, anatomical, retouching, or colour-content edits.
- Added a dedicated CSS-only background layer to the right side of the existing IOL-dislocation header.
- Preserved the existing header markup, navigation, copy, dimensions, spacing, language controls, and theme controls.
- Added responsive positioning and blue readability overlays for desktop, tablet, and mobile widths.
- Applied the same implementation to Russian and English pages.

## Files

- `assets/iol-dislocation-header.webp`
- `patients/iol-dislocation/header-photo.css`
- `patients/iol-dislocation/index.html`
- `en/patients/iol-dislocation/index.html`
- `tests/iol-header-photo.test.mjs`

## Verification

- Clinical image SHA-256: `206a48ac12500a267206dbd57a235d58c949ef23da5836d4f4c0f087fc858557`
- `node --test tests/iol-header-photo.test.mjs`
- `node --test tests/iol-next-section-scroll.test.mjs`
- `node --test tests/mobile-navbar.test.mjs`
- `node --test tests/site-theme.test.mjs`
- `node --test tests/site-motion.test.mjs`

All focused checks passed in GitHub Actions run `31095374849`.
