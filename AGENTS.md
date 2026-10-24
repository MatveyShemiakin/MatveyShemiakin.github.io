# Website maintenance

This website uses Vanilla HTML/CSS/JS. Do not introduce frameworks, npm builds or inline style attributes.

## Shared header
- Edit `shared/site-header.html` for the header structure and `site-header.css` for its scoped layout. Use existing CSS classes. Every public RU/EN page uses this same fragment.
- Edit `site-mega-nav.js` for menu labels, links and dropdown behavior. Keep theme, language and search logic in their shared controllers.
- Do not add page-specific header copies or header overrides. Do not let `doctors-legal.js` rewrite a header carrying `data-site-header`.
- Run `python scripts/site_header.py` after changing templates, shared scripts/CSS, generators or any HTML. Asset versions are derived automatically from content. Commit the generated HTML along with the source changes.
- Run `python scripts/site_header.py --check`, `python -m unittest tests/test_shared_site_header.py tests/test_site_mega_nav.py`, and `node --test tests/shared-header-menu.test.mjs tests/shared-header-language.test.mjs tests/mobile-navbar.test.mjs tests/site-mega-nav.test.mjs` before publication.
- Preserve patient hero sections formerly nested inside headers, article content, anchors, media, legal notices, and page-specific tables of contents.
- Header geometry is shared across languages/themes. At widths <=1020px use the top monogram/language/theme row and the existing bottom navigation. Verify no horizontal overflow.
- Keep the separate logbook application, media/file listings, technical konspekt.html and test fixtures out of header generation.
- All automatic page-generation workflows must run `python scripts/site_header.py` last, and validate with `--check`.
