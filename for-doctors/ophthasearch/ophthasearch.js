const EUROPE_PMC_API = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const CLINICAL_TRIALS_API = 'https://clinicaltrials.gov/api/v2/studies';
const JSTAGE_API = 'https://api.jstage.jst.go.jp/searchapi/do';

const PUB_TYPE_MAP = {
  review: 'review',
  'systematic-review': 'systematic review',
  'clinical-trial': 'clinical trial',
  rct: 'randomized controlled trial'
};

const PROVIDER_LABELS = {
  europepmc: 'Europe PMC',
  clinicaltrials: 'ClinicalTrials.gov',
  jstage: 'J-STAGE'
};

const COPY = {
  ru: {
    emptyQuery: 'Введите поисковый запрос.',
    loading: 'Ищем одновременно в подключённых источниках…',
    noResults: 'По этому запросу результаты не найдены.',
    partial: 'Часть источников временно недоступна. Показаны результаты из ответивших баз.',
    error: 'Не удалось получить данные из подключённых источников. Повторите поиск позже.',
    results: (visible, providers) => `${visible.toLocaleString('ru-RU')} результатов · ${providers} источн.`,
    abstract: 'Аннотация / описание',
    citations: 'Цитирований',
    openAccess: 'Open access',
    openPubMed: 'PubMed',
    openDoi: 'DOI',
    fullText: 'Полный текст',
    trial: 'Клиническое исследование',
    sourceUnavailable: 'Недоступен',
    sourceReady: 'Готов',
    sourceSearching: 'Поиск…',
    sourceSkipped: 'Не применён к фильтру',
    sourceResults: (count) => `${Number(count || 0).toLocaleString('ru-RU')} найдено`
  },
  en: {
    emptyQuery: 'Enter a search query.',
    loading: 'Searching connected sources in parallel…',
    noResults: 'No results were found for this query.',
    partial: 'Some sources are temporarily unavailable. Results from responding databases are shown.',
    error: 'Connected sources could not be loaded. Please try again later.',
    results: (visible, providers) => `${visible.toLocaleString('en-US')} results · ${providers} sources`,
    abstract: 'Abstract / description',
    citations: 'Citations',
    openAccess: 'Open access',
    openPubMed: 'PubMed',
    openDoi: 'DOI',
    fullText: 'Full text',
    trial: 'Clinical study',
    sourceUnavailable: 'Unavailable',
    sourceReady: 'Ready',
    sourceSearching: 'Searching…',
    sourceSkipped: 'Not used for this filter',
    sourceResults: (count) => `${Number(count || 0).toLocaleString('en-US')} found`
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

function dateYears(state) {
  return { '1y': 1, '5y': 5, '10y': 10 }[state?.date] || 0;
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

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function sourceLink(key, url) {
  const safe = safeHttpUrl(url);
  return safe ? { key, label: PROVIDER_LABELS[key] || key, url: safe } : null;
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

export function buildEuropePmcQuery(state) {
  const rawQuery = String(state?.q || '').trim();
  if (!rawQuery) return '';

  const parts = [`(${rawQuery})`];
  const now = state?.now instanceof Date ? state.now : new Date();
  const years = dateYears(state);

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

export function normalizeEuropePmcRecord(record = {}) {
  const source = String(record.source || record.src || '').trim();
  const id = String(record.id || record.extId || record.pmid || record.pmcid || '').trim();
  const publicationTypes = Array.isArray(record?.pubTypeList?.pubType)
    ? record.pubTypeList.pubType.filter(Boolean).map(String)
    : [];

  const pmid = String(record.pmid || (source === 'MED' ? record.id || '' : '')).trim();
  const pmcid = String(record.pmcid || '').trim();
  const doi = String(record.doi || '').trim();
  const europePmcUrl = source && id
    ? `https://europepmc.org/article/${encodeURIComponent(source)}/${encodeURIComponent(id)}`
    : '';

  return {
    kind: 'article',
    providerKey: 'europepmc',
    providerLabel: PROVIDER_LABELS.europepmc,
    sourceKeys: ['europepmc'],
    sourceLinks: [sourceLink('europepmc', europePmcUrl)].filter(Boolean),
    id,
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
    registryId: '',
    isOpenAccess: record.isOpenAccess === true || String(record.isOpenAccess || '').toUpperCase() === 'Y',
    fullTextUrl: firstFullTextUrl(record),
    sourceUrl: europePmcUrl,
    europePmcUrl,
    pubMedUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/` : '',
    doiUrl: doi ? `https://doi.org/${encodeURIComponent(doi)}` : '',
    trialStatus: '',
    phase: '',
    sponsor: '',
    conditions: '',
    interventions: ''
  };
}

export function buildSearchUrl(state) {
  const params = new URLSearchParams({
    query: buildEuropePmcQuery(state),
    format: 'json',
    resultType: 'core',
    pageSize: '18'
  });
  return `${EUROPE_PMC_API}?${params.toString()}`;
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
    providerKey: 'europepmc',
    hitCount: Number(data?.hitCount || 0),
    results: records.map(normalizeEuropePmcRecord)
  };
}

function clinicalTrialsAdvancedFilter(state) {
  if (state?.pubType === 'clinical-trial') return 'AREA[StudyType]INTERVENTIONAL';
  if (state?.pubType === 'rct') return 'AREA[StudyType]INTERVENTIONAL AND AREA[DesignAllocation]RANDOMIZED';
  return '';
}

function shouldSearchClinicalTrials(state) {
  return !['review', 'systematic-review'].includes(state?.pubType);
}

export function buildClinicalTrialsUrl(state) {
  const params = new URLSearchParams({
    'query.term': String(state?.q || '').trim(),
    format: 'json',
    pageSize: '12',
    countTotal: 'true'
  });
  const advanced = clinicalTrialsAdvancedFilter(state);
  if (advanced) params.set('filter.advanced', advanced);
  return `${CLINICAL_TRIALS_API}?${params.toString()}`;
}

export function normalizeClinicalTrialsStudy(study = {}) {
  const protocol = study?.protocolSection || {};
  const identification = protocol?.identificationModule || {};
  const status = protocol?.statusModule || {};
  const sponsorModule = protocol?.sponsorCollaboratorsModule || {};
  const conditionsModule = protocol?.conditionsModule || {};
  const design = protocol?.designModule || {};
  const description = protocol?.descriptionModule || {};
  const arms = protocol?.armsInterventionsModule || {};

  const nctId = String(identification?.nctId || '').trim();
  const sourceUrl = nctId ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : '';
  const phases = Array.isArray(design?.phases) ? design.phases : [];
  const conditions = Array.isArray(conditionsModule?.conditions) ? conditionsModule.conditions : [];
  const interventions = Array.isArray(arms?.interventions)
    ? arms.interventions.map((item) => item?.name).filter(Boolean)
    : [];
  const studyType = String(design?.studyType || '').trim();
  const allocation = String(design?.designInfo?.allocation || '').trim();
  const publicationTypes = uniqueStrings([
    'ClinicalTrials.gov registry',
    studyType === 'INTERVENTIONAL' ? 'Interventional study' : studyType,
    allocation === 'RANDOMIZED' ? 'Randomized' : allocation
  ]);

  return {
    kind: 'trial',
    providerKey: 'clinicaltrials',
    providerLabel: PROVIDER_LABELS.clinicaltrials,
    sourceKeys: ['clinicaltrials'],
    sourceLinks: [sourceLink('clinicaltrials', sourceUrl)].filter(Boolean),
    id: nctId,
    registryId: nctId,
    title: String(identification?.briefTitle || identification?.officialTitle || '').trim(),
    authors: '',
    journal: '',
    year: String(status?.startDateStruct?.date || status?.studyFirstPostDateStruct?.date || '').slice(0, 4),
    publicationTypes,
    abstractText: String(description?.briefSummary || description?.detailedDescription || '').trim(),
    citedByCount: null,
    pmid: '',
    pmcid: '',
    doi: '',
    isOpenAccess: null,
    fullTextUrl: '',
    sourceUrl,
    europePmcUrl: '',
    pubMedUrl: '',
    doiUrl: '',
    trialStatus: String(status?.overallStatus || '').trim(),
    phase: phases.join(' / '),
    sponsor: String(sponsorModule?.leadSponsor?.name || '').trim(),
    conditions: uniqueStrings(conditions).join(', '),
    interventions: uniqueStrings(interventions).join(', ')
  };
}

export async function searchClinicalTrials(state, fetchImpl = globalThis.fetch) {
  if (!shouldSearchClinicalTrials(state)) {
    return { providerKey: 'clinicaltrials', hitCount: 0, results: [], skipped: true, reason: 'publication-type' };
  }
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const response = await fetchImpl(buildClinicalTrialsUrl(state), {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`ClinicalTrials.gov HTTP ${response.status}`);
  const data = await response.json();
  const studies = Array.isArray(data?.studies) ? data.studies : [];
  return {
    providerKey: 'clinicaltrials',
    hitCount: Number(data?.totalCount || studies.length),
    results: studies.map(normalizeClinicalTrialsStudy)
  };
}

function shouldSearchJStage(state) {
  return state?.pubType === 'any' && !state?.openAccess;
}

export function buildJStageUrl(state) {
  const params = new URLSearchParams({
    service: '3',
    text: String(state?.q || '').trim(),
    sortflg: '1',
    count: '12'
  });
  const now = state?.now instanceof Date ? state.now : new Date();
  const years = dateYears(state);
  if (years) {
    params.set('pubyearfrom', String(now.getUTCFullYear() - years));
    params.set('pubyearto', String(now.getUTCFullYear()));
  }
  return `${JSTAGE_API}?${params.toString()}`;
}

function firstByLocalName(root, localName) {
  if (!root?.getElementsByTagNameNS) return null;
  return root.getElementsByTagNameNS('*', localName)?.[0] || null;
}

function textByLocalName(root, localName) {
  return String(firstByLocalName(root, localName)?.textContent || '').trim();
}

function localizedText(root, containerName, preferred = 'en') {
  const container = firstByLocalName(root, containerName);
  if (!container) return '';
  const preferredNode = firstByLocalName(container, preferred);
  if (preferredNode?.textContent?.trim()) return preferredNode.textContent.trim();
  const fallback = preferred === 'en' ? firstByLocalName(container, 'ja') : firstByLocalName(container, 'en');
  return String(fallback?.textContent || container.textContent || '').trim();
}

function jStageAuthors(entry, preferred = 'en') {
  const author = firstByLocalName(entry, 'author');
  if (!author) return '';
  const languageNode = firstByLocalName(author, preferred) || firstByLocalName(author, preferred === 'en' ? 'ja' : 'en') || author;
  const names = Array.from(languageNode.getElementsByTagNameNS?.('*', 'name') || [])
    .map((node) => String(node.textContent || '').trim())
    .filter(Boolean);
  return uniqueStrings(names).join(', ');
}

export function parseJStageXml(xmlText, preferredLanguage = 'en', parserFactory) {
  const Parser = parserFactory || globalThis.DOMParser;
  if (typeof Parser !== 'function') throw new Error('DOMParser is unavailable');
  const xml = new Parser().parseFromString(String(xmlText || ''), 'application/xml');
  if (firstByLocalName(xml, 'parsererror')) throw new Error('J-STAGE returned invalid XML');

  const result = firstByLocalName(xml, 'result');
  const status = textByLocalName(result, 'status');
  if (status && status !== '0') {
    throw new Error(`J-STAGE API ${status}: ${textByLocalName(result, 'message')}`);
  }

  const entries = Array.from(xml.getElementsByTagNameNS('*', 'entry') || []);
  const results = entries.map((entry) => {
    const title = localizedText(entry, 'article_title', preferredLanguage) || textByLocalName(entry, 'title');
    const journal = localizedText(entry, 'material_title', preferredLanguage);
    const articleLink = localizedText(entry, 'article_link', preferredLanguage) || textByLocalName(entry, 'id');
    const doi = textByLocalName(entry, 'doi');
    const sourceUrl = safeHttpUrl(articleLink);
    return {
      kind: 'article',
      providerKey: 'jstage',
      providerLabel: PROVIDER_LABELS.jstage,
      sourceKeys: ['jstage'],
      sourceLinks: [sourceLink('jstage', sourceUrl)].filter(Boolean),
      id: doi || sourceUrl,
      registryId: '',
      title,
      authors: jStageAuthors(entry, preferredLanguage),
      journal,
      year: textByLocalName(entry, 'pubyear').slice(0, 4),
      publicationTypes: ['J-STAGE'],
      abstractText: '',
      citedByCount: null,
      pmid: '',
      pmcid: '',
      doi,
      isOpenAccess: null,
      fullTextUrl: '',
      sourceUrl,
      europePmcUrl: '',
      pubMedUrl: '',
      doiUrl: doi ? `https://doi.org/${encodeURIComponent(doi)}` : '',
      trialStatus: '',
      phase: '',
      sponsor: '',
      conditions: '',
      interventions: ''
    };
  }).filter((item) => item.title || item.sourceUrl);

  return {
    hitCount: Number(textByLocalName(xml, 'totalResults') || results.length),
    results
  };
}

export async function searchJStage(state, fetchImpl = globalThis.fetch, parserFactory) {
  if (!shouldSearchJStage(state)) {
    return { providerKey: 'jstage', hitCount: 0, results: [], skipped: true, reason: 'unsupported-filter' };
  }
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable');
  const response = await fetchImpl(buildJStageUrl(state), {
    headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5' }
  });
  if (!response.ok) throw new Error(`J-STAGE HTTP ${response.status}`);
  const parsed = parseJStageXml(await response.text(), 'en', parserFactory);
  return { providerKey: 'jstage', ...parsed };
}

function resultIdentity(result) {
  const doi = String(result?.doi || '').trim().toLowerCase();
  if (doi) return `doi:${doi}`;
  const registryId = String(result?.registryId || '').trim().toLowerCase();
  if (registryId) return `registry:${registryId}`;
  const pmid = String(result?.pmid || '').trim().toLowerCase();
  if (pmid) return `pmid:${pmid}`;
  const title = String(result?.title || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return title ? `title:${title}|${String(result?.year || '')}` : `provider:${result?.providerKey}|${result?.id || Math.random()}`;
}

function mergeSourceLinks(a = [], b = []) {
  const map = new Map();
  for (const item of [...a, ...b]) {
    if (!item?.url) continue;
    map.set(`${item.key}:${item.url}`, item);
  }
  return [...map.values()];
}

export function mergeProviderResults(results = []) {
  const map = new Map();
  for (const item of results) {
    if (!item) continue;
    const key = resultIdentity(item);
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        sourceKeys: uniqueStrings(item.sourceKeys || [item.providerKey]),
        sourceLinks: mergeSourceLinks(item.sourceLinks, [])
      });
      continue;
    }
    const existing = map.get(key);
    map.set(key, {
      ...existing,
      authors: existing.authors || item.authors || '',
      journal: existing.journal || item.journal || '',
      abstractText: existing.abstractText || item.abstractText || '',
      fullTextUrl: existing.fullTextUrl || item.fullTextUrl || '',
      pmid: existing.pmid || item.pmid || '',
      pmcid: existing.pmcid || item.pmcid || '',
      doi: existing.doi || item.doi || '',
      isOpenAccess: existing.isOpenAccess === true || item.isOpenAccess === true,
      sourceKeys: uniqueStrings([...(existing.sourceKeys || []), ...(item.sourceKeys || [item.providerKey])]),
      sourceLinks: mergeSourceLinks(existing.sourceLinks, item.sourceLinks)
    });
  }
  return [...map.values()];
}

function interleaveProviderResults(groups) {
  const result = [];
  const max = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < max; index += 1) {
    for (const group of groups) {
      if (group[index]) result.push(group[index]);
    }
  }
  return result;
}

function sortMergedResults(results, state) {
  if (state?.sort !== 'newest') return results;
  return [...results].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
}

export async function searchAllProviders(state, fetchImpl = globalThis.fetch, parserFactory) {
  const tasks = [
    ['europepmc', () => searchEuropePmc(state, fetchImpl)],
    ['clinicaltrials', () => searchClinicalTrials(state, fetchImpl)],
    ['jstage', () => searchJStage(state, fetchImpl, parserFactory)]
  ];

  const settled = await Promise.allSettled(tasks.map(([, run]) => run()));
  const providers = [];
  const successfulGroups = [];

  settled.forEach((outcome, index) => {
    const key = tasks[index][0];
    if (outcome.status === 'fulfilled') {
      const value = outcome.value;
      providers.push({
        key,
        status: value.skipped ? 'skipped' : 'ready',
        hitCount: Number(value.hitCount || 0),
        reason: value.reason || ''
      });
      if (!value.skipped) successfulGroups.push(value.results || []);
    } else {
      providers.push({ key, status: 'error', hitCount: 0, reason: String(outcome.reason?.message || outcome.reason || '') });
    }
  });

  const interleaved = interleaveProviderResults(successfulGroups);
  const merged = sortMergedResults(mergeProviderResults(interleaved), state).slice(0, 36);
  return { providers, results: merged };
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

function humanizeToken(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function renderResultCard(result, copy) {
  const article = createElement('article', `ophtha-result-card ophtha-result-card--${result.kind || 'article'}`);
  const top = createElement('div', 'ophtha-result-top');
  const badges = createElement('div', 'ophtha-result-badges');

  for (const sourceKey of result.sourceKeys || [result.providerKey]) {
    badges.append(createElement('span', 'ophtha-badge ophtha-badge-source', PROVIDER_LABELS[sourceKey] || sourceKey));
  }

  if (result.kind === 'trial') {
    badges.append(createElement('span', 'ophtha-badge ophtha-badge-trial', copy.trial));
    if (result.trialStatus) badges.append(createElement('span', 'ophtha-badge', humanizeToken(result.trialStatus)));
    if (result.phase) badges.append(createElement('span', 'ophtha-badge', humanizeToken(result.phase)));
  } else {
    const primaryType = (result.publicationTypes || []).find((type) => type && type !== 'Journal Article' && type !== 'J-STAGE');
    if (primaryType) badges.append(createElement('span', 'ophtha-badge', primaryType));
    if (result.isOpenAccess === true) badges.append(createElement('span', 'ophtha-badge ophtha-badge-oa', copy.openAccess));
  }
  if (result.year) badges.append(createElement('span', 'ophtha-result-year', result.year));
  top.append(badges);

  article.append(top, createElement('h2', 'ophtha-result-title', result.title || 'Untitled'));

  const metaParts = result.kind === 'trial'
    ? [result.sponsor, result.conditions, result.interventions].filter(Boolean)
    : [result.authors, result.journal].filter(Boolean);
  if (metaParts.length) article.append(createElement('p', 'ophtha-result-meta', metaParts.join(' · ')));

  const identifiers = [];
  if (result.registryId) identifiers.push(result.registryId);
  if (result.pmid) identifiers.push(`PMID ${result.pmid}`);
  if (result.pmcid) identifiers.push(result.pmcid);
  if (result.doi) identifiers.push(`DOI ${result.doi}`);
  if (result.citedByCount !== null && result.citedByCount !== undefined) identifiers.push(`${copy.citations}: ${result.citedByCount}`);
  if (identifiers.length) article.append(createElement('p', 'ophtha-result-identifiers', identifiers.join(' · ')));

  if (result.abstractText) {
    const details = createElement('details', 'ophtha-abstract');
    details.append(createElement('summary', 'ophtha-abstract-summary', copy.abstract));
    details.append(createElement('p', 'ophtha-abstract-text', result.abstractText));
    article.append(details);
  }

  const links = createElement('div', 'ophtha-result-links');
  for (const link of result.sourceLinks || []) addExternalLink(links, link.url, link.label);
  addExternalLink(links, result.pubMedUrl, copy.openPubMed);
  addExternalLink(links, result.doiUrl, copy.openDoi);
  addExternalLink(links, result.fullTextUrl, copy.fullText, 'ophtha-result-link ophtha-result-link-primary');
  if (links.children.length) article.append(links);

  return article;
}

function getStateFromControls(root) {
  return {
    q: root.querySelector('#ophtha-query')?.value || '',
    sort: root.querySelector('#ophtha-sort')?.value || 'relevance',
    date: root.querySelector('#ophtha-date')?.value || 'any',
    openAccess: Boolean(root.querySelector('#ophtha-oa')?.checked),
    pubType: root.querySelector('#ophtha-pubtype')?.value || 'any'
  };
}

function applyStateToControls(root, state) {
  const query = root.querySelector('#ophtha-query');
  const sort = root.querySelector('#ophtha-sort');
  const date = root.querySelector('#ophtha-date');
  const oa = root.querySelector('#ophtha-oa');
  const pubType = root.querySelector('#ophtha-pubtype');
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

function setProviderState(key, status, copy, hitCount = 0) {
  const card = document.querySelector(`[data-provider-status="${key}"]`);
  if (!card) return;
  const state = card.querySelector('[data-provider-state]');
  if (!state) return;
  card.dataset.state = status;
  if (status === 'searching') state.textContent = copy.sourceSearching;
  else if (status === 'ready') state.textContent = copy.sourceResults(hitCount);
  else if (status === 'skipped') state.textContent = copy.sourceSkipped;
  else if (status === 'error') state.textContent = copy.sourceUnavailable;
  else state.textContent = copy.sourceReady;
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

  for (const key of ['europepmc', 'clinicaltrials', 'jstage']) setProviderState(key, 'idle', copy);

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
    for (const key of ['europepmc', 'clinicaltrials', 'jstage']) setProviderState(key, 'searching', copy);

    try {
      const response = await searchAllProviders(state);
      if (currentRequest !== requestId) return;

      for (const provider of response.providers) {
        setProviderState(provider.key, provider.status, copy, provider.hitCount);
      }

      resultsEl.replaceChildren(...response.results.map((result) => renderResultCard(result, copy)));
      const responding = response.providers.filter((provider) => provider.status === 'ready').length;
      const errors = response.providers.filter((provider) => provider.status === 'error').length;
      countEl.textContent = response.results.length ? copy.results(response.results.length, responding) : '';

      if (!response.results.length) {
        statusEl.textContent = errors === response.providers.length ? copy.error : copy.noResults;
        statusEl.dataset.state = errors === response.providers.length ? 'error' : 'empty';
      } else if (errors) {
        statusEl.textContent = copy.partial;
        statusEl.dataset.state = 'warning';
      } else {
        statusEl.textContent = '';
        statusEl.dataset.state = 'ready';
      }

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
    const state = getStateFromControls(root);
    if (!String(state.q).trim()) {
      statusEl.textContent = copy.emptyQuery;
      statusEl.dataset.state = 'error';
      root.querySelector('#ophtha-query')?.focus();
      return;
    }
    render(state);
  });

  ['ophtha-sort', 'ophtha-date', 'ophtha-oa', 'ophtha-pubtype'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      const state = getStateFromControls(root);
      if (String(state.q).trim()) render(state);
    });
  });

  window.addEventListener('popstate', () => {
    const state = readUrlState();
    applyStateToControls(root, state);
    render(state, { fromPopstate: true });
  });

  const initial = readUrlState();
  applyStateToControls(root, initial);
  if (String(initial.q).trim()) render(initial, { replaceUrl: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowser, { once: true });
  } else {
    initBrowser();
  }
}
