const JSTAGE_API = 'https://api.jstage.jst.go.jp/searchapi/do';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function decodeXml(value) {
  return clean(String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'"));
}

function stripTags(value) {
  return decodeXml(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function tagPattern(name, flags = 'i') {
  return new RegExp(`<(?:[A-Za-z0-9_-]+:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${name}>`, flags);
}

function tagText(xml, name) {
  const match = String(xml || '').match(tagPattern(name));
  return match ? stripTags(match[1]) : '';
}

function localizedTagText(xml, name) {
  const outer = String(xml || '').match(tagPattern(name));
  if (!outer) return '';
  const inner = outer[1];
  return tagText(inner, 'en') || tagText(inner, 'ja') || stripTags(inner);
}

function safeUrl(value) {
  try {
    const url = new URL(clean(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function buildJStageUrl(track = {}, deps = {}) {
  const limit = Math.min(50, Math.max(1, Number(deps.limit || 8)));
  const params = new URLSearchParams({
    service: '3',
    text: clean(track.query || track.q || ''),
    sortflg: '1',
    count: String(limit)
  });
  return `${JSTAGE_API}?${params.toString()}`;
}

export function parseJStageXml(xmlText) {
  const xml = String(xmlText || '');
  const total = Number(tagText(xml, 'totalResults') || 0);
  const entries = [...xml.matchAll(/<(?:[A-Za-z0-9_-]+:)?entry\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?entry>/gi)];
  const records = entries.map((match) => {
    const entry = match[1];
    const title = localizedTagText(entry, 'article_title') || tagText(entry, 'title');
    const journal = localizedTagText(entry, 'material_title');
    const doi = tagText(entry, 'doi');
    const sourceUrl = safeUrl(localizedTagText(entry, 'article_link') || tagText(entry, 'id'));
    const year = tagText(entry, 'pubyear').slice(0, 4);
    const abstractText = localizedTagText(entry, 'abstract') || localizedTagText(entry, 'description');
    return {
      sourceType: 'journal_article',
      title,
      authors: [],
      journal,
      year,
      publicationTypes: ['J-STAGE'],
      abstractText,
      doi,
      pmid: '',
      pmcid: '',
      nct: '',
      sourceUrl,
      providerKey: 'jstage',
      identifierVerified: Boolean(doi || sourceUrl)
    };
  }).filter((record) => record.title || record.sourceUrl);
  return { records, total: total || records.length };
}

export async function search(track = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API unavailable');
  const response = await fetchImpl(buildJStageUrl(track, deps), {
    signal: deps.signal,
    headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5' }
  });
  if (!response.ok) throw new Error(`J-STAGE HTTP ${response.status}`);
  return parseJStageXml(await response.text());
}
