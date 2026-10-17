# Website search

The existing `mobile-nav.js` / `mobile-nav.css` own both the desktop header
button and mobile bottom-navigation search. They reuse the site's existing
search classes, colors, fonts and light/dark palette. No client dependencies,
inline styles, API keys, external search services or build framework are used.
The query remains in the browser; opening search does not transmit its text.

`site-search-core.js` and `site-search-index.json` load only after a nonempty
query. Matches require every query word, normalize case and е/ё, and handle
common Russian endings. Exact titles and title words rank above body text;
both RU and EN are searched, with a small preference for the interface language.
Results contain a matching excerpt and highlight text using safe DOM nodes.
Results are paginated by 20 sections without discarding later matches.

## Refresh

Run `python scripts/build_site_search.py --write` after changing public pages
or their data. This uses only the Python and Node standard libraries. It scans
all published HTML rather than a manual sitemap list, adds stable heading
anchors and the shared search assets where missing, and generates the index.
Existing anchors and content are preserved. `--check` verifies freshness.
The GitHub workflow refreshes the index on main and explicitly requests a
Pages build after a bot update. A failed push (for example, protected main)
or disabled Pages build is reported as a failed workflow, not silently ignored.
On protected main, regenerate and include the files in the publishing PR.

Private surgical logbook, token-based viewer, docs, tests, and pages explicitly
marked noindex are excluded. Static text is indexed without navigation,
scripts, controls or footer boilerplate. Runtime cataract FAQs, homepage
research data, bilingual event catalogs and public update feeds are included.
Live external scientific-search results, personal data, and browser storage
are not site content and are not indexed. Calendar links open the requested
event directly, including past events. Existing tab and accordion handlers
are respected when navigating to matching sections.

## Validation

- `node tests/site-search.test.cjs`
- `python -m unittest discover -s tests -p test_site_search.py`
- `python scripts/build_site_search.py --check`
- `node tests/mobile-navbar.test.mjs`
- `node tests/patient-global-search.test.mjs`
- `node --test tests/complicated-cataract-series.test.mjs`
- Optional browser checks: serve the root at `127.0.0.1:8765`, make Playwright
  available to Node, then run `node tests/site-search-browser.cjs`.
  `SEARCH_TEST_URL` and `SEARCH_BROWSER` override the server and browser channel.

The full existing suite also has baseline failures unrelated to search:
patient ecosystem's pinned historic blob hashes; shared clinical header's
old navigation expectation; analytics consent fixtures and old loader version;
breadcrumbs' old asset version; motion/theme's fixed historic sitemap count.
These should be maintained separately from this change.
