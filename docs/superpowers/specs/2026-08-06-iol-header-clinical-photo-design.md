# IOL Header Clinical Photo Design

## Goal

Add the exact uploaded slit-lamp photograph as a visual background on the right side of the existing IOL-dislocation page header, without moving, replacing, or restructuring any existing header content.

## Approved composition

- Preserve the current navigation, breadcrumbs, kicker, heading, lead text, dimensions, spacing, and responsive layout.
- Use the original uploaded JPEG byte-for-byte; do not retouch, regenerate, recolour, annotate, or alter anatomical details.
- Render the photograph through CSS as a background layer on the right side of the existing `.site-head`.
- Keep the deep-blue page header as the base layer and place dark-blue gradients over the photograph so text remains readable.
- On desktop, the photograph occupies the right portion of the header and visually begins below the navigation divider.
- On mobile, the photograph remains a background layer in the lower/right part of the same header; no new block is inserted and no content is displaced.
- Apply the same visual treatment to the Russian and English IOL-dislocation pages.

## Files

- Add `assets/iol-dislocation-header.jpg` using the exact uploaded file.
- Add `patients/iol-dislocation/header-photo.css` containing the isolated header background treatment.
- Add the new stylesheet link to the Russian and English IOL-dislocation pages.
- Add a regression test that verifies the exact image checksum, both stylesheet links, desktop rules, mobile rules, and CSS-only integration.

## Constraints

- Vanilla HTML and CSS only.
- No inline styles.
- No changes to the existing header markup.
- No changes to header copy, navigation, language controls, theme controls, or page structure.
- No changes outside the two IOL-dislocation pages and their dedicated shared assets/tests.
