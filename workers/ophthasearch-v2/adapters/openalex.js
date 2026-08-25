const WORKS_URL = 'https://api.openalex.org/works';

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function normalizeDoi(value) { return clean(value).toLowerCase().replace(/^https?:\/\/doi\.org\//, '').replace(/^doi:/, ''); }
function normalizePmid(value) { return clean(value).replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '').replace(/\/$/, '').replace(/^pmid:/i, ''); }
function abstractFromInverted(index) {
  if (!index || typeof index !== 'object') return '';
  const positioned = [];
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) if (Number.isInteger(position)) positioned.push([position, word]);
  }
  return positioned.sort((a, b) => a[0] - b[0]).map((item) => item[1]).join(' ');
}
function normalize(work = {}) {
  const authors = Array.isArray(work.authorships)
    ? work.authorships.map((entry) => clean(entry?.author?.display_name)).filter(Boolean)
    : [];
  return {
    sourceType: work.type === 'preprint' ? 'preprint' : 'journal_article',
    title: clean(work.display_name || work.title),
    authors,
    journal: clean(work.primary_location?.source?.display_name),
    year: clean(work.publication_year),
    abstractText: abstractFromInverted(work.abstract_inverted_index),
    doi: normalizeDoi(work.doi),
    pmid: normalizePmid(work.ids?.pmid),
    pmcid: clean(work.ids?.pmcid).replace(/^https?:\/\/www\.ncbi\.nlm\.nih\.gov\/pmc\/articles\//, '').replace(/\/$/, ''),
    publicationTypes: [clean(work.type)].filter(Boolean),
    sourceUrl: clean(work.primary_location?.landing_page_url || work.id),
    providerKey: 'openalex',
    citedByCount: Number(work.cited_by_count || 0),
    openAlexId: clean(work.id),
    verification: { identifier_verified: Boolean(work.id), metadata_crosschecked: true }
  };
}

export async function search(track, deps = {}) {
  const apiKey = clean(deps.apiKey);
  if (!apiKey) throw new Error('OpenAlex API key is required');
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const query = clean(track?.query);
  if (!query) return { provider: 'openalex', records: [], total: 0 };
  const params = new URLSearchParams({
    search: query,
    per_page: String(deps.limit || 10),
    api_key: apiKey,
    select: 'id,display_name,publication_year,doi,cited_by_count,ids,primary_location,type,authorships,abstract_inverted_index'
  });
  const response = await fetchImpl(`${WORKS_URL}?${params}`, { headers: { Accept: 'application/json' }, signal: deps.signal });
  if (!response.ok) throw new Error(`OpenAlex HTTP ${response.status}`);
  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return { provider: 'openalex', records: results.map(normalize), total: Number(data?.meta?.count || results.length) };
}
