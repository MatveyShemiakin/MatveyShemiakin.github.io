export const DEFAULT_RESEARCH_ENDPOINT = 'https://matveyshemiakin-github-io.matvei-shemyakin.workers.dev/v2/research';

const COPY = {
  ru: {
    emptyQuestion: 'Введите клинический вопрос.',
    networkUnavailable: 'Сетевой запрос недоступен.',
    invalidResponse: 'Сервер вернул некорректный ответ.',
    unavailable: 'Исследовательский агент временно недоступен.',
    sourceAria: (id) => `Источник ${id}`,
    noManagement: 'Безопасно конкретизировать схему по найденным данным не удалось. Используйте клинический вывод и оригинальные источники ниже.',
    regimen: ['Препарат / вмешательство', 'Доза / концентрация', 'Частота', 'Длительность'],
    monitoring: 'Мониторинг',
    changeIf: 'Изменить тактику, если',
    noImportant: 'Дополнительные ограничения или существенные неопределённости в сформированном ответе не выделены.',
    noSources: 'Верифицированные источники не возвращены.',
    sourceFallback: 'Источник',
    originalSource: 'Оригинальный источник',
    confidence: { high: 'Высокая уверенность', moderate: 'Умеренная уверенность', low: 'Низкая уверенность', insufficient: 'Недостаточно данных' },
    confidenceUnknown: 'Уверенность не определена',
    sourceCount: (count) => {
      const value = Number(count) || 0;
      const mod10 = value % 10;
      const mod100 = value % 100;
      const word = mod10 === 1 && mod100 !== 11 ? 'источник' : (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'источника' : 'источников');
      return `${value} ${word}`;
    },
    complete: 'Клинический вывод сформирован.',
    partial: 'Клинический вывод сформирован по доступным источникам.',
    evidenceOnly: 'Публикации найдены, но единый клинический вывод сейчас сформировать не удалось.',
    received: 'Ответ получен.',
    loading: 'Ищу релевантные публикации и формирую клинический вывод…',
    prompt: 'Введите вопрос так, как сформулировали бы его при обсуждении клинического случая с коллегой.'
  },
  en: {
    emptyQuestion: 'Enter a clinical question.',
    networkUnavailable: 'Network request is unavailable.',
    invalidResponse: 'The server returned an invalid response.',
    unavailable: 'The research agent is temporarily unavailable.',
    sourceAria: (id) => `Source ${id}`,
    noManagement: 'The retrieved evidence does not support a safe specific regimen. Use the clinical bottom line and original sources below.',
    regimen: ['Drug / procedure', 'Dose / concentration', 'Frequency', 'Duration'],
    monitoring: 'Monitoring',
    changeIf: 'Change strategy if',
    noImportant: 'No additional major limitations or uncertainties were identified in the generated answer.',
    noSources: 'No verified sources were returned.',
    sourceFallback: 'Source',
    originalSource: 'Original source',
    confidence: { high: 'High confidence', moderate: 'Moderate confidence', low: 'Low confidence', insufficient: 'Insufficient evidence' },
    confidenceUnknown: 'Confidence not determined',
    sourceCount: (count) => `${Number(count) || 0} ${(Number(count) || 0) === 1 ? 'source' : 'sources'}`,
    complete: 'Clinical synthesis completed.',
    partial: 'Clinical synthesis completed from the available sources.',
    evidenceOnly: 'Publications were retrieved, but a unified clinical synthesis could not be generated.',
    received: 'Response received.',
    loading: 'Retrieving relevant evidence and building the clinical synthesis…',
    prompt: 'Enter the question as you would phrase it when discussing a clinical case with a colleague.'
  }
};

function languageCode(value) {
  return value === 'en' ? 'en' : 'ru';
}

function currentLanguage(root = document) {
  const lang = root?.documentElement?.lang || (typeof document !== 'undefined' ? document.documentElement.lang : 'ru');
  return languageCode(lang);
}

function copyFor(language) {
  return COPY[languageCode(language)];
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setText(node, value) {
  if (node) node.textContent = clean(value);
}

function safeHttpUrl(value) {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://matveyshemyakin.ru';
    const url = new URL(String(value || ''), base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

export async function requestResearch(question, language = 'ru', options = {}) {
  const lang = languageCode(language);
  const copy = copyFor(lang);
  const query = clean(question);
  if (!query) throw new Error(copy.emptyQuestion);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error(copy.networkUnavailable);
  const endpoint = options.endpoint || DEFAULT_RESEARCH_ENDPOINT;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schemaVersion: '2.0',
      language: lang,
      question: query,
      mode: 'standard',
      filters: {}
    })
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(copy.invalidResponse); }
  if (!response.ok || !payload?.ok || !payload.result) {
    const message = clean(payload?.error?.message) || copy.unavailable;
    throw new Error(message);
  }
  return payload.result;
}

function citationList(ids, target, copy) {
  if (!target) return;
  target.replaceChildren();
  for (const raw of Array.isArray(ids) ? ids : []) {
    const id = clean(raw);
    if (!id) continue;
    const link = el('a', 'ophtha-v2-cite', id);
    link.href = `#v2-source-${encodeURIComponent(id)}`;
    link.setAttribute('aria-label', copy.sourceAria(id));
    target.append(link);
  }
}

function renderManagement(items, target, copy) {
  if (!target) return;
  target.replaceChildren();
  const values = Array.isArray(items) ? items : [];
  if (!values.length) {
    target.append(el('p', 'ophtha-v2-empty', copy.noManagement));
    return;
  }
  const list = el('div', 'ophtha-v2-management');
  values.forEach((item, index) => {
    const step = el('article', 'ophtha-v2-step');
    step.append(el('span', 'ophtha-v2-step-number', String(item?.step || index + 1)));
    const body = el('div', 'ophtha-v2-step-body');
    body.append(el('p', 'ophtha-v2-step-action', clean(item?.action)));

    const regimenValues = [
      [copy.regimen[0], item?.drug_or_procedure],
      [copy.regimen[1], item?.dose],
      [copy.regimen[2], item?.frequency],
      [copy.regimen[3], item?.duration]
    ].filter((entry) => clean(entry[1]));
    if (regimenValues.length) {
      const regimen = el('div', 'ophtha-v2-regimen');
      for (const [label, value] of regimenValues) {
        const cell = el('div');
        cell.append(el('strong', '', label), el('span', '', clean(value)));
        regimen.append(cell);
      }
      body.append(regimen);
    }
    if (clean(item?.monitoring)) body.append(el('p', 'ophtha-v2-step-note', `${copy.monitoring}: ${clean(item.monitoring)}`));
    if (clean(item?.change_if)) body.append(el('p', 'ophtha-v2-step-note', `${copy.changeIf}: ${clean(item.change_if)}`));
    const citations = el('div', 'ophtha-v2-citations');
    citationList(item?.citations, citations, copy);
    if (citations.childElementCount) body.append(citations);
    step.append(body);
    list.append(step);
  });
  target.append(list);
}

function renderImportant(answer, target, copy) {
  if (!target) return;
  target.replaceChildren();
  const candidates = [
    ...(Array.isArray(answer?.arguments_against) ? answer.arguments_against : []),
    ...(Array.isArray(answer?.uncertainties) ? answer.uncertainties : []),
    ...(Array.isArray(answer?.alternatives) ? answer.alternatives : [])
  ];
  const seen = new Set();
  const items = [];
  for (const item of candidates) {
    const text = clean(item?.text);
    const key = text.toLocaleLowerCase(currentLanguage() === 'en' ? 'en-US' : 'ru-RU');
    if (!text || seen.has(key)) continue;
    seen.add(key);
    items.push({ text, citations: item?.citations });
  }

  const interpretation = clean(answer?.clinical_interpretation);
  if (!items.length && !interpretation) {
    target.append(el('p', 'ophtha-v2-empty', copy.noImportant));
    return;
  }

  const list = el('div', 'ophtha-v2-list');
  for (const item of items) {
    const card = el('article', 'ophtha-v2-item');
    card.append(el('p', '', item.text));
    const citations = el('div', 'ophtha-v2-citations');
    citationList(item.citations, citations, copy);
    if (citations.childElementCount) card.append(citations);
    list.append(card);
  }
  if (interpretation) {
    const card = el('article', 'ophtha-v2-item');
    card.append(el('p', '', interpretation));
    list.append(card);
  }
  target.append(list);
}

function appendSourceLink(container, label, href) {
  const url = safeHttpUrl(href);
  if (!url) return;
  const link = el('a', '', label);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  container.append(link);
}

function renderSources(sources, target, copy) {
  if (!target) return;
  target.replaceChildren();
  const values = Array.isArray(sources) ? sources : [];
  if (!values.length) {
    target.append(el('p', 'ophtha-v2-empty', copy.noSources));
    return;
  }
  const list = el('div', 'ophtha-v2-sources');
  for (const source of values) {
    const id = clean(source?.source_id);
    const card = el('article', 'ophtha-v2-source');
    if (id) card.id = `v2-source-${id}`;
    card.append(el('p', 'ophtha-v2-source-title', `${id ? `${id} · ` : ''}${clean(source?.title) || copy.sourceFallback}`));
    const metadata = [
      clean(source?.journal_or_body),
      source?.year ? String(source.year) : '',
      clean(source?.evidence?.label),
      clean(source?.guideline_version)
    ].filter(Boolean).join(' · ');
    if (metadata) card.append(el('p', 'ophtha-v2-source-meta', metadata));

    const identifiers = [
      source?.doi ? `DOI ${clean(source.doi)}` : '',
      source?.pmid ? `PMID ${clean(source.pmid)}` : '',
      source?.nct ? `NCT ${clean(source.nct)}` : ''
    ].filter(Boolean).join(' · ');
    if (identifiers) card.append(el('p', 'ophtha-v2-source-meta', identifiers));

    const links = el('div', 'ophtha-v2-source-links');
    appendSourceLink(links, copy.originalSource, source?.canonical_url);
    if (source?.doi) appendSourceLink(links, 'DOI', `https://doi.org/${encodeURIComponent(clean(source.doi))}`);
    if (source?.pmid) appendSourceLink(links, 'PubMed', `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(clean(source.pmid))}/`);
    if (source?.nct) appendSourceLink(links, 'ClinicalTrials.gov', `https://clinicaltrials.gov/study/${encodeURIComponent(clean(source.nct))}`);
    if (links.childElementCount) card.append(links);
    list.append(card);
  }
  target.append(list);
}

function confidenceLabel(value, copy) {
  return copy.confidence[clean(value)] || copy.confidenceUnknown;
}

function statusText(status, copy) {
  if (status === 'complete') return copy.complete;
  if (status === 'partial') return copy.partial;
  if (status === 'evidence_only') return copy.evidenceOnly;
  return copy.received;
}

export function renderResearchResult(result, root = document) {
  const lang = currentLanguage(root);
  const copy = copyFor(lang);
  const answer = result?.answer || {};
  const shell = root.querySelector('[data-v2-answer-shell]');
  if (shell) shell.hidden = false;
  setText(root.querySelector('[data-v2-bottom-line]'), answer.clinical_bottom_line);
  const sourceCount = Array.isArray(answer.sources) ? answer.sources.length : 0;
  const confidence = sourceCount
    ? `${confidenceLabel(answer.confidence, copy)} · ${copy.sourceCount(sourceCount)}`
    : confidenceLabel(answer.confidence, copy);
  setText(root.querySelector('[data-v2-confidence]'), confidence);
  citationList(answer.bottom_line_citations, root.querySelector('[data-v2-bottom-line-citations]'), copy);
  renderManagement(answer.management, root.querySelector('[data-v2-management]'), copy);
  renderImportant(answer, root.querySelector('[data-v2-important]'), copy);
  renderSources(answer.sources, root.querySelector('[data-v2-sources]'), copy);

  const status = root.querySelector('[data-v2-status]');
  if (status) {
    status.textContent = statusText(result?.status, copy);
    status.dataset.state = result?.status === 'partial' || result?.status === 'evidence_only' ? 'partial' : 'ready';
  }
}

function initResearchUi() {
  const form = document.querySelector('[data-v2-search-form]');
  const input = document.querySelector('[data-v2-query]');
  const button = document.querySelector('[data-v2-submit]');
  const status = document.querySelector('[data-v2-status]');
  const shell = document.querySelector('[data-v2-answer-shell]');
  if (!form || !input || !button || !status) return;

  const lang = currentLanguage();
  const copy = copyFor(lang);
  let lastSubmittedQuestion = '';

  input.addEventListener('input', () => {
    const current = clean(input.value);
    if (lastSubmittedQuestion && current !== lastSubmittedQuestion) {
      if (shell) shell.hidden = true;
      status.textContent = copy.prompt;
      status.dataset.state = 'idle';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = clean(input.value);
    if (!question) {
      status.textContent = copy.emptyQuestion;
      status.dataset.state = 'error';
      input.focus();
      return;
    }
    lastSubmittedQuestion = question;
    if (shell) shell.hidden = true;
    button.disabled = true;
    status.textContent = copy.loading;
    status.dataset.state = 'loading';
    try {
      const result = await requestResearch(question, lang);
      if (clean(input.value) !== lastSubmittedQuestion) return;
      renderResearchResult(result);
    } catch (error) {
      if (clean(input.value) !== lastSubmittedQuestion) return;
      status.textContent = clean(error?.message) || copy.unavailable;
      status.dataset.state = 'error';
    } finally {
      button.disabled = false;
    }
  });
}

if (typeof document !== 'undefined') initResearchUi();
