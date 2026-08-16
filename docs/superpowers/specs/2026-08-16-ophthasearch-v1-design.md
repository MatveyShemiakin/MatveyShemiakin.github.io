# OphthaSearch v1 — Design

## Goal
Build the first production-ready version of **OphthaSearch**, an international ophthalmology research search interface inside `matveyshemyakin.ru/for-doctors/`, with a real live literature search that works on the existing static GitHub Pages stack.

## Product position
OphthaSearch is a clinician-facing global ophthalmology evidence search tool. The long-term product aggregates international and regional literature, including Asia-Pacific, Russia/CIS, Europe, North America, Latin America, Africa and the Middle East. The first release establishes the UI, normalized result model and live search adapter so additional regional sources can be attached without redesigning the page.

## V1 scope
- RU page: `/for-doctors/ophthasearch/`
- EN page: `/en/for-doctors/ophthasearch/`
- Existing site header/footer, theme, language, motion, analytics and mega-navigation modules remain intact.
- No React, npm, build step, CSS framework or inline styles.
- New feature CSS and JS live next to the RU page and are reused by EN.
- First live provider: **Europe PMC REST API**.
- Search runs client-side with `fetch()` and renders real results.
- Europe PMC `resultType=core`, `format=json`, relevance/date sorting and page size are used.
- Results show: publication type, title, authors, journal, year, source, citation count when present, PMID/PMCID/DOI when present, open-access status, abstract preview when available, and links to Europe PMC / PubMed / DOI / full text when metadata supports them.
- The interface never invents PICO, study design, sample size, region, evidence level or full-text availability. Missing metadata stays absent.
- Search errors and empty states are explicit and localized.

## Information architecture
### Hero
- Brand: `OphthaSearch`
- Subtitle: `Global Ophthalmology Research Search`
- RU explanatory line / EN explanatory line
- Search input with example ophthalmology query
- Primary Search button
- Sort control: relevance / newest
- `Worldwide search` status chip
- `Europe PMC live` provider chip

### Search workspace
Desktop:
- Left filter rail.
- Main results column.

Mobile:
- Single column.
- Filters collapse into a compact disclosure panel.

### Filters implemented in v1
Filters must map to actual Europe PMC query syntax or reliable client-side metadata:
- publication date: any / 1 year / 5 years / 10 years
- open access only
- publication type shortcuts: review, systematic review, clinical trial, randomized controlled trial

### Global-source roadmap block
A compact source-coverage panel below the search controls shows:
- Live now: Europe PMC
- Planned connectors: PubMed enrichment, WPRIM / Global Index Medicus, J-STAGE, KoreaScience, ClinicalTrials.gov, LILACS/SciELO, Russia/CIS sources where legal API access is available.

This panel is informational only. Planned sources must never be presented as already searched.

## Search data flow
1. User enters a query.
2. JS trims and validates the input.
3. JS constructs a Europe PMC query from text + selected filters.
4. Browser calls `https://www.ebi.ac.uk/europepmc/webservices/rest/search`.
5. Response is normalized into an internal result shape.
6. Result cards are rendered with safe text insertion (`textContent`) and sanitized URL construction.
7. Search state is mirrored to the URL query string (`q`, `sort`, filters) so searches are shareable and back/forward navigation works.

## Internal normalized result
```js
{
  id,
  source,
  title,
  authors,
  journal,
  year,
  publicationTypes,
  abstractText,
  citedByCount,
  pmid,
  pmcid,
  doi,
  isOpenAccess,
  fullTextUrl,
  europePmcUrl
}
```

## Accessibility
- Semantic `main`, `section`, `form`, `fieldset`, `article`.
- Search form has visible label or accessible label.
- Loading state uses `aria-live`.
- Result count and errors use `role=status` / `role=alert` as appropriate.
- Keyboard focus styles remain visible.
- No click-only non-button controls.

## Visual direction
Use the existing site system:
- navy hero / paper content surface
- serif display headings
- blue accent
- rounded cards and restrained borders
- existing `.container`, `.site-footer`, `.monogram` and theme variables

OphthaSearch-specific classes use the `ophtha-` prefix to avoid collisions.

## Integration into For Doctors
Add one new library card on both RU and EN `/for-doctors/` pages linking to OphthaSearch. Existing cards remain unchanged.

## Error handling
- Empty input: inline localized validation, no network call.
- Network/API failure: localized retry message; existing results remain only if explicitly marked stale, otherwise clear results.
- Malformed record: render only safe fields that exist.
- External links open in a new tab with `rel="noopener noreferrer"`.

## Testing / acceptance
- Static HTML has no inline `style=` attributes.
- Both RU and EN pages load with existing global modules.
- Search query returns live Europe PMC results.
- Enter key submits search.
- Filters change the query and results.
- Sort works.
- Empty query is blocked.
- API error state is visible.
- URLs are shareable/restorable.
- Mobile layout works at 390 px without horizontal overflow.
- Dark/light theme remains usable.
- Existing For Doctors cards and links remain functional.

## Deliberately out of scope for v1
- AI article analysis / PICO extraction.
- Personal library / login.
- Alerts and saved searches.
- Unified deduplication across multiple providers.
- True geographic filtering across regional databases.
- Automated translation into Japanese/Chinese/Korean.

These require the multi-provider layer and will be implemented after the first live-search release is stable.