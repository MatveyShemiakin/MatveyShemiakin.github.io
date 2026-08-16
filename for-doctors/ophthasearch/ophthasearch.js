const API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

const PUB_TYPE_MAP = {
  review: 'review',
  'systematic-review': 'systematic review',
  'clinical-trial': 'clinical trial',
  rct: 'randomized controlled trial'
};

const COPY = {
  ru: {
    emptyQuery: 'Введите поисковый запрос.',
    loading: 'Ищем публикации…',
    noResults: 'По этому запросу публикации не найдены.',
    error: 'Не удалось получить данные Europe PMC. Повторите поиск позже.',
    results: (count) => `Найдено: ${Number(count).toLocaleString('ru-RU')}`,
    abstract: 'Аннотация',
    citations: 'Цитирований',
    openAccess: 'Open access',
    openEuropePmc: 'Europe PMC',
    openPubMed: 'PubMed',
    openDoi: 'DOI',
    fullText: 'Полный текст'
  },
  en: {
    emptyQuery: 'Enter a search query.',
    loading: 'Searching publications…',
    noResults: 'No publications were found for this query.',
    error: 'Europe PMC data could not be loaded. Please try again later.',
    results: (count) => `${Number(count).toLocaleString('en-US')} results`,
    abstract: 'Abstract',
    citations: 'Citations',
    openAccess: 'Open access',
    openEuropePmc: 'Europe PMC',
    openPubMed: 'PubMed',
    openDoi: 'DOI',
    fullText: 'Full text'
  }
};

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function subtractYears(date, years) {
  const copy = new Date(date.getTime());
  copy.setUTCFullYear(copy.getUTCFullYear() - years);
  return copy;
}

export function buildEuropePmcQuery(state) {
  const rawQuery = String(state?.q || '').trim();
  if (!rawQuery) return '';

  const parts = [`(${rawQuery})`];
  const now = state?.now instanceof Date ? state.now : new Date();
  const dateMap = { '1y': 1, '5y': 5, '10y': 10 };
  const years = dateMap[state?.date];

  if (years) {
    parts.push(`FIRST_PDATE:[${isoDate(subtractYears(now, years))} TO ${isoDate(now)}]`);
  }
  if (state?.openAccess) {
    parts.push('OPEN_ACCESS:y');
  }

  const pubType = PUB_TYPE_MAP[state?.pubType];
  if (pubType) {
    parts.push(`PUB_TYPE:"${pubType}"`);
  }

  let query = parts.join(' AND ');
  if (state?.sort === 'newest') {
    query += ' sort_date:y';
  }
  return query;
}

function safeHttpUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function firstFullTextUrl(record) {
  const list = record?.fullTextUrlList?.fullTextUrl;
  if (!Array.isArray(list)) return '';
  for (const item of list) {
    const candidate = safeHttpUrl(item?.url);
    if (candidate) return candidate;
  }
  return '';
}

export function normalizeEuropePmcRecord(record = {}) {
  const source = String(record.source || record.src || '').trim();
  const id = String(record.id || record.extId || record.pmid || record.pmcid || '').trim();
  const publicationTypes = Array.isArray(record?.pubTypeList?.pubType)
    ? record.pubTypeList.pubType.filter(Boolean).map(String)
    : [];

  const pmid = String(record.pmid || (source === 'MED' ? record.id || '' : '')).trim();
  const pmcid = String(record.pmcid || '').trim();
  const doi = String(record.doi || '').trim();

  return {
    id,
    source,
    title: String(record.title || '').trim(),
    authors: String(record.authorString || '').trim(),
    journal: String(record.journalTitle || record.journalInfo?.journal?.title || '').trim(),
    year: String(record.pubYear || record.firstPublicationDate || '').slice(0, 4),
    publicationTypes,
    abstractText: String(record.abstractText || '').trim(),
    citedByCount: Number.isFinite(Number(record.citedByCount)) ? Number(record.citedByCount) : null,
    pmid,
    pmcid,
    doi,
    isOpenAccess: record.isOpenAccess === true || String(record.isOpenAccess || '').toUpperCase() === 'Y',
    fullTextUrl: firstFullTextUrl(record),
    europePmcUrl: source && id ? `https://europepmc.org/article/${encodeURIComponent(source)}/${encodeURIComponent(id)}` : '',
    pubMedUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/` : '',
    doiUrl: doi ? `https://doi.org/${encodeURIComponent(doi)}` : ''
  };
}

export function buildSearchUrl(state) {
  const params = new URLSearchParams({
    query: buildEuropePmcQuery(state),
    format: 'json',
    resultType: 'core',
    pageSize: '25'
  });
  return `${API_BASE}?${params.toString()}`;
}

export async function searchEuropePmc(state, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const response = await fetchImpl(buildSearchUrl(state), {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Europe PMC HTTP ${response.status}`);
  const data = await response.json();
  const records = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];
  return {
    hitCount: Number(data?.hitCount || 0),
    results: records.map(normalizeEuropePmcRecord)
  };
}

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function addExternalLink(container, href, label, className = 'ophtha-result-link') {
  const safe = safeHttpUrl(href);
  if (!safe) return;
  const link = createElement('a', className, label);
  link.href = safe;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  container.append(link);
}

function renderResultCard(result, copy) {
  const article = createElement('article', 'ophtha-result-card');
  const top = createElement('div', 'ophtha-result-top');
  const badges = createElement('div', 'ophtha-result-badges');

  const primaryType = result.publicationTypes.find((type) => type && type !== 'Journal Article');
  if (primaryType) badges.append(createElement('span', 'ophtha-badge', primaryType));
  if (result.isOpenAccess) badges.append(createElement('span', 'ophtha-badge ophtha-badge-oa', copy.openAccess));
  if (result.year) badges.append(createElement('span', 'ophtha-result-year', result.year));
  top.append(badges);

  article.append(top, createElement('h2', 'ophtha-result-title', result.title || 'Untitled'));

  const metaParts = [result.authors, result.journal].filter(Boolean);
  if (metaParts.length) article.append(createElement('p', 'ophtha-result-meta', metaParts.join(' · ')));

  const identifiers = [];
  if (result.pmid) identifiers.push(`PMID ${result.pmid}`);
  if (result.pmcid) identifiers.push(result.pmcid);
  if (result.doi) identifiers.push(`DOI ${result.doi}`);
  if (result.citedByCount !== null) identifiers.push(`${copy.citations}: ${result.citedByCount}`);
  if (identifiers.length) article.append(createElement('p', 'ophtha-result-identifiers', identifiers.join(' · ')));

  if (result.abstractText) {
    const details = createElement('details', 'ophtha-abstract');
    details.append(createElement('summary', 'ophtha-abstract-summary', copy.abstract));
    details.append(createElement('p', 'ophtha-abstract-text', result.abstractText));
    article.append(details);
  }

  const links = createElement('div', 'ophtha-result-links');
  addExternalLink(links, result.europePmcUrl, copy.openEuropePmc);
  addExternalLink(links, result.pubMedUrl, copy.openPubMed);
  addExternalLink(links, result.doiUrl, copy.openDoi);
  addExternalLink(links, result.fullTextUrl, copy.fullText, 'ophtha-result-link ophtha-result-link-primary');
  if (links.children.length) article.append(links);

  return article;
}

function getStateFromForm(form) {
  return {
    q: form.querySelector('#ophtha-query')?.value || '',
    sort: form.querySelector('#ophtha-sort')?.value || 'relevance',
    date: form.querySelector('#ophtha-date')?.value || 'any',
    openAccess: Boolean(form.querySelector('#ophtha-oa')?.checked),
    pubType: form.querySelector('#ophtha-pubtype')?.value || 'any'
  };
}

function applyStateToForm(form, state) {
  const query = form.querySelector('#ophtha-query');
  const sort = form.querySelector('#ophtha-sort');
  const date = form.querySelector('#ophtha-date');
  const oa = form.querySelector('#ophtha-oa');
  const pubType = form.querySelector('#ophtha-pubtype');
  if (query) query.value = state.q || '';
  if (sort) sort.value = state.sort || 'relevance';
  if (date) date.value = state.date || 'any';
  if (oa) oa.checked = Boolean(state.openAccess);
  if (pubType) pubType.value = state.pubType || 'any';
}

function readUrlState() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get('q') || '',
    sort: params.get('sort') || 'relevance',
    date: params.get('date') || 'any',
    openAccess: params.get('oa') === '1',
    pubType: params.get('type') || 'any'
  };
}

function writeUrlState(state, replace = false) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.sort !== 'relevance') params.set('sort', state.sort);
  if (state.date !== 'any') params.set('date', state.date);
  if (state.openAccess) params.set('oa', '1');
  if (state.pubType !== 'any') params.set('type', state.pubType);
  const url = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
  history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

function initBrowser() {
  const root = document.querySelector('[data-ophthasearch]');
  const form = document.querySelector('#ophtha-search-form');
  const resultsEl = document.querySelector('#ophtha-results');
  const statusEl = document.querySelector('#ophtha-status');
  const countEl = document.querySelector('#ophtha-result-count');
  if (!root || !form || !resultsEl || !statusEl || !countEl) return;

  const lang = root.dataset.lang === 'en' ? 'en' : 'ru';
  const copy = COPY[lang];
  let requestId = 0;

  const render = async (state, options = {}) => {
    if (!String(state.q || '').trim()) {
      resultsEl.replaceChildren();
      countEl.textContent = '';
      statusEl.textContent = copy.emptyQuery;
      statusEl.dataset.state = 'idle';
      return;
    }

    const currentRequest = ++requestId;
    statusEl.textContent = copy.loading;
    statusEl.dataset.state = 'loading';
    resultsEl.setAttribute('aria-busy', 'true');

    try {
      const response = await searchEuropePmc(state);
      if (currentRequest !== requestId) return;
      resultsEl.replaceChildren(...response.results.map((result) => renderResultCard(result, copy)));
      countEl.textContent = copy.results(response.hitCount);
      statusEl.textContent = response.results.length ? '' : copy.noResults;
      statusEl.dataset.state = response.results.length ? 'ready' : 'empty';
      if (!options.fromPopstate) writeUrlState(state, Boolean(options.replaceUrl));
    } catch (error) {
      if (currentRequest !== requestId) return;
      console.error('OphthaSearch:', error);
      resultsEl.replaceChildren();
      countEl.textContent = '';
      statusEl.textContent = copy.error;
      statusEl.dataset.state = 'error';
    } finally {
      if (currentRequest === requestId) resultsEl.removeAttribute('aria-busy');
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = getStateFromForm(form);
    if (!String(state.q).trim()) {
      statusEl.textContent = copy.emptyQuery;
      statusEl.dataset.state = 'error';
      form.querySelector('#ophtha-query')?.focus();
      return;
    }
    render(state);
  });

  ['ophtha-sort', 'ophtha-date', 'ophtha-oa', 'ophtha-pubtype'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      const state = getStateFromForm(form);
      if (String(state.q).trim()) render(state);
    });
  });

  window.addEventListener('popstate', () => {
    const state = readUrlState();
    applyStateToForm(form, state);
    render(state, { fromPopstate: true });
  });

  const initial = readUrlState();
  applyStateToForm(form, initial);
  if (String(initial.q).trim()) render(initial, { replaceUrl: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowser, { once: true });
  } else {
    initBrowser();
  }
}
