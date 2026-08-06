# IOL next-section scroll fix

- Internal `data-next` and `data-jump` navigation now activates the requested panel and scrolls the document to the top.
- The Russian and English IOL-dislocation pages use the shared corrected script.
- The script URL was bumped to `v=20260806-2` to invalidate cached copies.
- A regression test reproduces the previous bottom-of-panel position and verifies a single smooth scroll request to `top: 0`.
- Focused checks passed for script syntax, IOL navigation, mobile navigation, global motion, theme compatibility and penetrating-keratoplasty pages.
