const SEARCH_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function list(value) { return Array.isArray(value) ? value.map(clean).filter(Boolean) : []; }

function normalize(record = {}) {
  const pmid = clean(record.pmid || (record.source === 'MED' ? record.id : ''));
  const pmcid = clean(record.pmcid || (record.source === 'PMC' ? record.id : ''));
  const doi = clean(record.doi).toLowerCase();
  const source = clean(record.source);
  const id = clean(record.id);
  return {
    sourceType: 'journal_article',
    title: clean(record.title),
    authors: clean(record.authorString) ? clean(record.authorString).split(/\s*,\s*/).filter(Boolean) : [],
    journal: clean(record.journalTitle),
    year: clean(record.pubYear),
    abstractText: clean(record.abstractText),
    doi,
    pmid,
    pmcid,
    publicationTypes: list(record.pubTypeList?.pubType),
    sourceUrl: source && id ? `https://europepmc.org/article/${encodeURIComponent(source)}/${encodeURIComponent(id)}` : '',
    providerKey: 'europepmc',
    verification: { identifier_verified: Boolean(doi || pmid || pmcid), metadata_crosschecked: false }
  };
}

export async function search(track, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const query = clean(track?.query);
  if (!query) return { provider: 'europepmc', records: [], total: 0 };
  const params = new URLSearchParams({ query, resultType: 'core', format: 'json', pageSize: String(deps.limit || 12) });
  const response = await fetchImpl(`${SEARCH_URL}?${params}`, { headers: { Accept: 'application/json' }, signal: deps.signal });
  if (!response.ok) throw new Error(`Europe PMC HTTP ${response.status}`);
  const data = await response.json();
  const raw = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];
  return { provider: 'europepmc', records: raw.map(normalize), total: Number(data?.hitCount || raw.length) };
}
