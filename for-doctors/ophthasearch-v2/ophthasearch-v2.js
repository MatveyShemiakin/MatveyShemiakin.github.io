export const DEFAULT_RESEARCH_ENDPOINT = '/v2/research';

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
    const url = new URL(String(value || ''), window.location.origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

export async function requestResearch(question, language = 'ru', options = {}) {
  const query = clean(question);
  if (!query) throw new Error('Введите клинический вопрос.');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Сетевой запрос недоступен.');
  const endpoint = options.endpoint || DEFAULT_RESEARCH_ENDPOINT;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schemaVersion: '2.0',
      language: language === 'en' ? 'en' : 'ru',
      question: query,
      mode: 'standard',
      filters: {}
    })
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('Сервер вернул некорректный ответ.'); }
  if (!response.ok || !payload?.ok || !payload.result) {
    const message = clean(payload?.error?.message) || 'Исследовательский агент временно недоступен.';
    throw new Error(message);
  }
  return payload.result;
}

function citationList(ids, target) {
  if (!target) return;
  target.replaceChildren();
  for (const raw of Array.isArray(ids) ? ids : []) {
    const id = clean(raw);
    if (!id) continue;
    const link = el('a', 'ophtha-v2-cite', id);
    link.href = `#v2-source-${encodeURIComponent(id)}`;
    link.setAttribute('aria-label', `Источник ${id}`);
    target.append(link);
  }
}

function renderCitedItems(items, target) {
  target.replaceChildren();
  const values = Array.isArray(items) ? items : [];
  if (!values.length) {
    target.append(el('p', 'ophtha-v2-empty', 'Значимые данные в отобранном Evidence Pack не выделены.'));
    return;
  }
  const list = el('div', 'ophtha-v2-list');
  for (const item of values) {
    const card = el('article', 'ophtha-v2-item');
    card.append(el('p', '', clean(item?.text)));
    const citations = el('div', 'ophtha-v2-citations');
    citationList(item?.citations, citations);
    if (citations.childElementCount) card.append(citations);
    list.append(card);
  }
  target.append(list);
}

function renderManagement(items, target) {
  target.replaceChildren();
  const values = Array.isArray(items) ? items : [];
  if (!values.length) {
    target.append(el('p', 'ophtha-v2-empty', 'Источник-подтверждённая схема лечения не сформирована. Это может означать недостаточность данных для безопасной конкретизации.'));
    return;
  }
  const list = el('div', 'ophtha-v2-management');
  values.forEach((item, index) => {
    const step = el('article', 'ophtha-v2-step');
    step.append(el('span', 'ophtha-v2-step-number', String(item?.step || index + 1)));
    const body = el('div', 'ophtha-v2-step-body');
    body.append(el('p', 'ophtha-v2-step-action', clean(item?.action)));

    const regimenValues = [
      ['Препарат / вмешательство', item?.drug_or_procedure],
      ['Доза / концентрация', item?.dose],
      ['Частота', item?.frequency],
      ['Длительность', item?.duration]
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
    if (clean(item?.monitoring)) body.append(el('p', 'ophtha-v2-step-note', `Мониторинг: ${clean(item.monitoring)}`));
    if (clean(item?.change_if)) body.append(el('p', 'ophtha-v2-step-note', `Изменить тактику, если: ${clean(item.change_if)}`));
    const citations = el('div', 'ophtha-v2-citations');
    citationList(item?.citations, citations);
    if (citations.childElementCount) body.append(citations);
    step.append(body);
    list.append(step);
  });
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

function renderSources(sources, target) {
  target.replaceChildren();
  const values = Array.isArray(sources) ? sources : [];
  if (!values.length) {
    target.append(el('p', 'ophtha-v2-empty', 'Верифицированные источники не возвращены.'));
    return;
  }
  const list = el('div', 'ophtha-v2-sources');
  for (const source of values) {
    const id = clean(source?.source_id);
    const card = el('article', 'ophtha-v2-source');
    if (id) card.id = `v2-source-${id}`;
    card.append(el('p', 'ophtha-v2-source-title', `${id ? `${id} · ` : ''}${clean(source?.title) || 'Источник'}`));
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
    appendSourceLink(links, 'Оригинальный источник', source?.canonical_url);
    if (source?.doi) appendSourceLink(links, 'DOI', `https://doi.org/${encodeURIComponent(clean(source.doi))}`);
    if (source?.pmid) appendSourceLink(links, 'PubMed', `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(clean(source.pmid))}/`);
    if (source?.nct) appendSourceLink(links, 'ClinicalTrials.gov', `https://clinicaltrials.gov/study/${encodeURIComponent(clean(source.nct))}`);
    if (links.childElementCount) card.append(links);
    list.append(card);
  }
  target.append(list);
}

function renderDiagnostics(diagnostics, target) {
  target.replaceChildren();
  const entries = Array.isArray(diagnostics?.adapters) ? diagnostics.adapters : [];
  if (!entries.length) {
    target.append(el('p', 'ophtha-v2-empty', 'Диагностика источников не требуется.'));
    return;
  }
  const list = el('div', 'ophtha-v2-diagnostics-list');
  for (const entry of entries) {
    const row = el('div', 'ophtha-v2-diagnostic');
    row.append(
      el('span', '', `${clean(entry?.trackId)} · ${clean(entry?.adapter)}`),
      el('strong', '', `${clean(entry?.status)}${Number(entry?.total) ? ` · ${Number(entry.total)}` : ''}`)
    );
    list.append(row);
  }
  target.append(list);
}

function confidenceLabel(value) {
  const labels = { high: 'Высокая уверенность', moderate: 'Умеренная уверенность', low: 'Низкая уверенность', insufficient: 'Недостаточно данных' };
  return labels[clean(value)] || 'Уверенность не определена';
}

function statusText(status) {
  if (status === 'complete') return 'Поиск и клинический синтез завершены.';
  if (status === 'partial') return 'Ответ сформирован по доступным источникам; один или несколько коннекторов не ответили в срок.';
  if (status === 'evidence_only') return 'Доступен Evidence Pack без полноценного AI-синтеза.';
  return 'Ответ получен.';
}

export function renderResearchResult(result, root = document) {
  const answer = result?.answer || {};
  const shell = root.querySelector('[data-v2-answer-shell]');
  if (shell) shell.hidden = false;
  setText(root.querySelector('[data-v2-bottom-line]'), answer.clinical_bottom_line);
  setText(root.querySelector('[data-v2-confidence]'), confidenceLabel(answer.confidence));
  citationList(answer.bottom_line_citations, root.querySelector('[data-v2-bottom-line-citations]'));
  renderManagement(answer.management, root.querySelector('[data-v2-management]'));
  renderCitedItems(answer.guideline_positions, root.querySelector('[data-v2-guidelines]'));
  renderCitedItems(answer.arguments_for, root.querySelector('[data-v2-arguments-for]'));
  renderCitedItems(answer.arguments_against, root.querySelector('[data-v2-arguments-against]'));
  renderCitedItems(answer.alternatives, root.querySelector('[data-v2-alternatives]'));
  renderCitedItems(answer.uncertainties, root.querySelector('[data-v2-uncertainties]'));

  const interpretation = root.querySelector('[data-v2-clinical-interpretation]');
  if (interpretation) {
    interpretation.replaceChildren();
    const text = clean(answer.clinical_interpretation);
    interpretation.append(text ? el('p', '', text) : el('p', 'ophtha-v2-empty', 'Отдельная клиническая интерпретация не добавлена.'));
  }
  renderSources(answer.sources, root.querySelector('[data-v2-sources]'));
  renderDiagnostics(result?.diagnostics, root.querySelector('[data-v2-diagnostics]'));

  const status = root.querySelector('[data-v2-status]');
  if (status) {
    status.textContent = statusText(result?.status);
    status.dataset.state = result?.status === 'partial' || result?.status === 'evidence_only' ? 'partial' : 'ready';
  }
}

function initCanary() {
  const form = document.querySelector('[data-v2-search-form]');
  const input = document.querySelector('[data-v2-query]');
  const button = document.querySelector('[data-v2-submit]');
  const status = document.querySelector('[data-v2-status]');
  if (!form || !input || !button || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = clean(input.value);
    if (!question) {
      status.textContent = 'Введите клинический вопрос.';
      status.dataset.state = 'error';
      input.focus();
      return;
    }
    button.disabled = true;
    status.textContent = 'Интерпретирую вопрос, строю research plan и собираю Evidence Pack…';
    status.dataset.state = 'loading';
    try {
      const result = await requestResearch(question, document.documentElement.lang === 'en' ? 'en' : 'ru');
      renderResearchResult(result);
    } catch (error) {
      status.textContent = clean(error?.message) || 'Исследовательский агент временно недоступен.';
      status.dataset.state = 'error';
    } finally {
      button.disabled = false;
    }
  });
}

if (typeof document !== 'undefined') initCanary();
