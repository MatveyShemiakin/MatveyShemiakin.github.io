# One website header

The already approved homepage menu is the reference: monogram; Patients, For doctors, About dropdowns; RU/EN; theme; search. At <=1020px, the top contains monogram, languages and theme and the bottom contains the existing four mobile navigation actions. Header geometry and controls are identical in RU/EN and both themes.

Use one HTML fragment in shared/site-header.html and one scoped stylesheet site-header.css, with existing class names only. Existing Python publishing helpers insert this fragment; no framework, npm dependency or static site generator is added. The existing mega-navigation data remains the single source for dropdown labels and routes. Shared language, theme and search scripts remain the only owners of their controls. The doctors notice script must not rewrite the shared header.

Replace navigation only. Patient hero text currently nested in a header must survive outside the navigation shell; main content, anchors, photos, media, page-specific navigation and professional/legal notices must remain intact. Homepage keeps its existing overlay placement. Exclude the separate logbook, media/file indexes, test fixtures and technical konspekt.html.

Derive asset cache versions from file content, and run the shared-header updater last in automatic generation. Verify every public document and new pages, RU/EN links, idempotence, content preservation, one of each control, keyboard dropdown behavior and the <=1020px mobile/tablet breakpoint. Add a publishing check and root maintenance instructions so future edits use this same source.
