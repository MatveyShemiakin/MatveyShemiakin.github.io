const API_ROOT = 'https://api.crossref.org/v1';

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function normalizeDoi(value) { return clean(value).toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/^doi:\s*/, ''); }
function yearFrom(message = {}) {
  const candidates = [message.published, message['published-print'], message['published-online'], message.issued, message.created];
  for (const candidate of candidates) {
    const year = candidate?.['date-parts']?.[0]?.[0];
    if (Number.isInteger(year)) return String(year);
  }
  return '';
}

export async function verifyDoi(doi, deps = {}) {
  const normalized = normalizeDoi(doi);
  if (!normalized) throw new Error('DOI is required');
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const params = new URLSearchParams();
  if (deps.mailto) params.set('mailto', clean(deps.mailto));
  const url = `${API_ROOT}/works/${encodeURIComponent(normalized)}${params.size ? `?${params}` : ''}`;
  const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: deps.signal });
  if (!response.ok) throw new Error(`Crossref HTTP ${response.status}`);
  const message = (await response.json())?.message || {};
  const verifiedDoi = normalizeDoi(message.DOI || normalized);
  const authors = Array.isArray(message.author)
    ? message.author.map((author) => clean([author.given, author.family].filter(Boolean).join(' '))).filter(Boolean)
    : [];
  return {
    sourceType: clean(message.type) === 'posted-content' ? 'preprint' : 'journal_article',
    title: clean(Array.isArray(message.title) ? message.title[0] : message.title),
    authors,
    journal: clean(Array.isArray(message['container-title']) ? message['container-title'][0] : message['container-title']),
    year: yearFrom(message),
    abstractText: clean(message.abstract).replace(/<[^>]+>/g, ' '),
    doi: verifiedDoi,
    publicationTypes: [clean(message.type)].filter(Boolean),
    sourceUrl: verifiedDoi ? `https://doi.org/${verifiedDoi}` : '',
    providerKey: 'crossref',
    verification: { identifier_verified: verifiedDoi === normalized, metadata_crosschecked: true }
  };
}


export async function search(track, deps = {}) {
  const query = clean(track?.query);
  if (!query) return {provider:'crossref',records:[],total:0};
  const params = new URLSearchParams({'query.bibliographic':query,rows:String(deps.limit || 8),filter:'type:journal-article'});
  const response = await (deps.fetchImpl || globalThis.fetch)(`https://api.crossref.org/works?${params}`,{headers:{Accept:'application/json'},signal:deps.signal});
  if (!response.ok) throw new Error(`Crossref search HTTP ${response.status}`);
  const message = (await response.json())?.message || {};
  const records = (Array.isArray(message.items) ? message.items : []).map(item => ({
    sourceType:'journal_article',
    title:clean(Array.isArray(item.title) ? item.title[0] : item.title),
    authors:(Array.isArray(item.author) ? item.author : []).map(a=>clean([a.given,a.family].filter(Boolean).join(' '))).filter(Boolean),
    journal:clean(item['container-title']?.[0]),
    year:yearFrom(item),
    abstractText:clean(clean(item.abstract).replace(/<[^>]+>/g,' ')),
    doi:normalizeDoi(item.DOI),
    publicationTypes:[clean(item.type)].filter(Boolean),
    sourceUrl:item.DOI ? `https://doi.org/${normalizeDoi(item.DOI)}` : '',
    providerKey:'crossref',
    verification:{identifier_verified:Boolean(item.DOI),metadata_crosschecked:false}
  }));
  return {provider:'crossref',records,total:Number(message['total-results'] || records.length)};
}
