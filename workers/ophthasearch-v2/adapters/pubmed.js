const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function doiFromAid(values = []) {
  for (const value of values) {
    const match = String(value).match(/^(10\.\S+?)\s*\[doi\]$/i);
    if (match) return match[1].replace(/[.,;]+$/, '').toLowerCase();
  }
  return '';
}

export function parseMedline(text = '') {
  const records = [];
  let fields = {};
  let currentTag = '';

  const flush = () => {
    const pmid = clean(fields.PMID?.[0]);
    const title = clean((fields.TI || []).join(' '));
    if (!pmid && !title) { fields = {}; currentTag = ''; return; }
    const date = clean(fields.DP?.[0]);
    records.push({
      sourceType: 'journal_article',
      title,
      authors: (fields.AU || []).map(clean).filter(Boolean),
      journal: clean(fields.JT?.[0]),
      year: date.match(/(?:19|20)\d{2}/)?.[0] || '',
      abstractText: clean((fields.AB || []).join(' ')),
      doi: doiFromAid(fields.AID || []),
      pmid,
      pmcid: clean(fields.PMC?.[0]),
      publicationTypes: (fields.PT || []).map(clean).filter(Boolean),
      sourceUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '',
      providerKey: 'pubmed'
    });
    fields = {};
    currentTag = '';
  };

  for (const rawLine of String(text).split(/\r?\n/)) {
    if (!rawLine.trim()) { if (Object.keys(fields).length) flush(); continue; }
    const match = rawLine.match(/^([A-Z0-9]{2,4})\s*-\s?(.*)$/);
    if (match) {
      currentTag = match[1];
      (fields[currentTag] ||= []).push(match[2]);
      continue;
    }
    if (currentTag && /^\s+/.test(rawLine)) {
      const list = fields[currentTag];
      list[list.length - 1] = `${list[list.length - 1]} ${rawLine.trim()}`;
    }
  }
  if (Object.keys(fields).length) flush();
  return records;
}

function addNcbiIdentity(params, deps) {
  if (deps.apiKey) params.set('api_key', deps.apiKey);
  if (deps.tool) params.set('tool', deps.tool);
  if (deps.email) params.set('email', deps.email);
}

export async function search(track, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const query = clean(track?.query);
  if (!query) return { provider: 'pubmed', records: [], total: 0 };

  const searchParams = new URLSearchParams({ db: 'pubmed', term: query, retmode: 'json', retmax: String(deps.limit || 10) });
  addNcbiIdentity(searchParams, deps);
  const searchResponse = await fetchImpl(`${ESEARCH_URL}?${searchParams}`, { headers: { Accept: 'application/json' }, signal: deps.signal });
  if (!searchResponse.ok) throw new Error(`PubMed ESearch HTTP ${searchResponse.status}`);
  const searchData = await searchResponse.json();
  const ids = Array.isArray(searchData?.esearchresult?.idlist) ? searchData.esearchresult.idlist.map(clean).filter(Boolean) : [];
  if (!ids.length) return { provider: 'pubmed', records: [], total: Number(searchData?.esearchresult?.count || 0) };

  const fetchParams = new URLSearchParams({ db: 'pubmed', id: ids.join(','), rettype: 'medline', retmode: 'text' });
  addNcbiIdentity(fetchParams, deps);
  const detailResponse = await fetchImpl(`${EFETCH_URL}?${fetchParams}`, { headers: { Accept: 'text/plain' }, signal: deps.signal });
  if (!detailResponse.ok) throw new Error(`PubMed EFetch HTTP ${detailResponse.status}`);
  return { provider: 'pubmed', records: parseMedline(await detailResponse.text()), total: Number(searchData?.esearchresult?.count || ids.length) };
}
