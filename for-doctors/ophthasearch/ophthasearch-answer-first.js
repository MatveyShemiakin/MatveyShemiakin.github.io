const ANSWER_FIRST_CSS = '/for-doctors/ophthasearch/ophthasearch-answer-first.css?v=20260824-1';

const UI = {
  ru: {
    directAnswer: 'Короткий ответ',
    evidenceBasis: 'Опора ответа',
    keyEvidence: 'Ключевые доказательства',
    allSources: (count) => `Все найденные публикации (${count})`,
    howBuilt: 'Как сформирован ответ',
    searchOptions: 'Настройки и источники поиска',
    originalTitle: 'Оригинальное название публикации',
    originalAbstract: 'Оригинальная аннотация',
    source: 'Открыть источник',
    signalBenefit: 'Сигнал в пользу эффекта',
    signalNeutral: 'Убедимого преимущества не показано',
    signalRisk: 'Неблагоприятный сигнал / риск',
    signalUnknown: 'Направление эффекта не определено автоматически',
    aiPending: 'Анализируем найденные исследования…',
    aiProvenance: 'Gemma 4 · синтез найденных публикаций',
    aiFallback: 'Автоматический синтез временно недоступен · показан локальный анализ доказательств',
    aiConfidence: 'Уверенность',
    aiEvidence: 'Что показывают данные',
    aiLimitations: 'Ограничения',
    aiSources: 'Источники ответа',
    confidence: { high: 'высокая', moderate: 'средняя', low: 'низкая', insufficient: 'недостаточная' },
    answerBenefit: (i, c, p) => `${i || 'Изучаемый подход'} по найденным публикациям скорее имеет преимущество${c ? ` перед ${c}` : ''}${p ? ` у пациентов с ${p}` : ''}. Вывод основан на автоматически отобранных аннотациях исследований более высокого уровня; ниже показаны ключевые источники.`,
    answerNeutral: (i, c, p) => `По найденным публикациям убедительного преимущества ${i || 'изучаемого подхода'}${c ? ` перед ${c}` : ''}${p ? ` у пациентов с ${p}` : ''} не показано. Ниже приведены исследования, которые в наибольшей степени определили этот вывод.`,
    answerMixed: (i, c, p) => `Однозначного ответа нет: найденные исследования дают разнонаправленные результаты по ${i || 'изучаемому подходу'}${c ? ` по сравнению с ${c}` : ''}${p ? ` при ${p}` : ''}. Ориентироваться следует прежде всего на систематические обзоры и RCT, представленные ниже.`,
    answerRisk: (i, c, p) => `В найденных публикациях есть неблагоприятный сигнал для ${i || 'изучаемого подхода'}${c ? ` по сравнению с ${c}` : ''}${p ? ` при ${p}` : ''}. Пользу и риск необходимо оценивать по первичным исследованиям, показанным ниже.`,
    answerInsufficient: (i, c, p) => `Найденных данных недостаточно для уверенного ответа по ${i || 'заданному вмешательству'}${c ? ` по сравнению с ${c}` : ''}${p ? ` при ${p}` : ''}. Ниже показаны наиболее релевантные источники, но автоматический синтез не должен заменять чтение оригинальных публикаций.`
  },
  en: {
    directAnswer: 'Short answer',
    evidenceBasis: 'Evidence basis',
    keyEvidence: 'Key evidence',
    allSources: (count) => `All retrieved publications (${count})`,
    howBuilt: 'How this answer was built',
    searchOptions: 'Search settings and sources',
    originalTitle: 'Original publication title',
    originalAbstract: 'Original abstract',
    source: 'Open source',
    signalBenefit: 'Signal in favour of effect',
    signalNeutral: 'No convincing advantage shown',
    signalRisk: 'Adverse / risk signal',
    signalUnknown: 'Direction of effect not classified automatically',
    aiPending: 'Synthesizing the retrieved evidence…',
    aiProvenance: 'Gemma 4 · synthesis of retrieved publications',
    aiFallback: 'AI synthesis is temporarily unavailable · local evidence analysis shown',
    aiConfidence: 'Confidence',
    aiEvidence: 'What the evidence shows',
    aiLimitations: 'Limitations',
    aiSources: 'Answer sources',
    confidence: { high: 'high', moderate: 'moderate', low: 'low', insufficient: 'insufficient' },
    answerBenefit: (i, c, p) => `${i || 'The studied approach'} appears to have an advantage${c ? ` over ${c}` : ''}${p ? ` in ${p}` : ''} in the retrieved literature. The conclusion is based on automatically selected higher-level study abstracts; the key sources are shown below.`,
    answerNeutral: (i, c, p) => `The retrieved literature does not show a convincing advantage of ${i || 'the studied approach'}${c ? ` over ${c}` : ''}${p ? ` in ${p}` : ''}. The studies contributing most to this conclusion are shown below.`,
    answerMixed: (i, c, p) => `The evidence is mixed for ${i || 'the studied approach'}${c ? ` versus ${c}` : ''}${p ? ` in ${p}` : ''}. Systematic reviews and randomized trials below should carry the greatest weight.`,
    answerRisk: (i, c, p) => `The retrieved literature contains an adverse or risk signal for ${i || 'the studied approach'}${c ? ` versus ${c}` : ''}${p ? ` in ${p}` : ''}. Benefits and harms should be checked against the primary studies below.`,
    answerInsufficient: (i, c, p) => `The retrieved evidence is insufficient for a confident answer about ${i || 'the intervention'}${c ? ` versus ${c}` : ''}${p ? ` in ${p}` : ''}. The most relevant sources are shown below, but automated synthesis does not replace reading the original papers.`
  }
};

function addStyles() {
  if (document.querySelector('link[data-ophtha-answer-first]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = ANSWER_FIRST_CSS;
  link.dataset.ophthaAnswerFirst = 'true';
  document.head.append(link);
}

function create(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function langCopy() {
  const root = document.querySelector('[data-ophthasearch]');
  return UI[root?.dataset.lang === 'en' ? 'en' : 'ru'];
}

function moveTechnicalControls(copy) {
  const searchCard = document.querySelector('.ophtha-search-card');
  const filters = document.querySelector('.ophtha-filters');
  const sourceBoard = document.querySelector('.ophtha-source-board');
  if (!searchCard || (!filters && !sourceBoard) || document.querySelector('.ophtha-search-options')) return;

  const details = create('details', 'ophtha-search-options');
  const summary = create('summary', 'ophtha-search-options-summary', copy.searchOptions);
  const body = create('div', 'ophtha-search-options-body');
  if (filters) body.append(filters);
  if (sourceBoard) body.append(sourceBoard);
  details.append(summary, body);
  searchCard.insertAdjacentElement('afterend', details);
  document.body.classList.add('ophtha-answer-first');
}

function picoValues(panel) {
  const values = Array.from(panel.querySelectorAll('.ophtha-pico-item .ophtha-pico-value')).map((el) => el.textContent.trim());
  const clean = (value) => value && !/не указано|not specified/i.test(value) ? value : '';
  return { population: clean(values[0]), intervention: clean(values[1]), comparator: clean(values[2]), outcome: clean(values[3]) };
}

function signalCounts(panel) {
  const read = (selector) => Number(panel.querySelector(`${selector} .ophtha-signal-count`)?.textContent || 0);
  return {
    benefit: read('.ophtha-signal-card--benefit'),
    neutral: read('.ophtha-signal-card--neutral'),
    risk: read('.ophtha-signal-card--risk')
  };
}

function directAnswer(copy, pico, counts) {
  const nonZero = [counts.benefit, counts.neutral, counts.risk].filter((n) => n > 0).length;
  if (!counts.benefit && !counts.neutral && !counts.risk) return copy.answerInsufficient(pico.intervention, pico.comparator, pico.population);
  if (nonZero >= 2) return copy.answerMixed(pico.intervention, pico.comparator, pico.population);
  if (counts.benefit) return copy.answerBenefit(pico.intervention, pico.comparator, pico.population);
  if (counts.neutral) return copy.answerNeutral(pico.intervention, pico.comparator, pico.population);
  return copy.answerRisk(pico.intervention, pico.comparator, pico.population);
}

function signalIndex(panel) {
  const index = [];
  for (const [selector, key] of [
    ['.ophtha-signal-card--benefit', 'benefit'],
    ['.ophtha-signal-card--neutral', 'neutral'],
    ['.ophtha-signal-card--risk', 'risk']
  ]) {
    for (const el of panel.querySelectorAll(`${selector} .ophtha-signal-excerpt`)) {
      const excerpt = el.textContent.replace(/\s+/g, ' ').trim();
      if (excerpt && excerpt !== '—') index.push({ key, excerpt });
    }
  }
  return index;
}

function resultSignal(card, signals) {
  const abstract = card.querySelector('.ophtha-abstract-text')?.textContent.replace(/\s+/g, ' ').trim() || '';
  if (!abstract) return 'unknown';
  const hit = signals.find((item) => abstract.includes(item.excerpt));
  return hit?.key || 'unknown';
}

function signalLabel(copy, key) {
  if (key === 'benefit') return copy.signalBenefit;
  if (key === 'neutral') return copy.signalNeutral;
  if (key === 'risk') return copy.signalRisk;
  return copy.signalUnknown;
}

function buildEvidenceCard(sourceCard, copy, signal) {
  const card = create('article', `ophtha-key-card ophtha-key-card--${signal}`);
  const badges = create('div', 'ophtha-key-card-badges');
  const evidenceBadge = sourceCard.querySelector('.ophtha-badge-evidence, .ophtha-badge-registry');
  const year = sourceCard.querySelector('.ophtha-result-year');
  if (evidenceBadge) badges.append(create('span', 'ophtha-key-tier', evidenceBadge.textContent.trim()));
  if (year) badges.append(create('span', 'ophtha-key-year', year.textContent.trim()));
  card.append(badges);

  card.append(create('strong', 'ophtha-key-signal', signalLabel(copy, signal)));

  const ids = sourceCard.querySelector('.ophtha-result-identifiers')?.textContent.trim();
  if (ids) card.append(create('p', 'ophtha-key-identifiers', ids));

  const title = sourceCard.querySelector('.ophtha-result-title')?.textContent.trim();
  if (title) {
    const titleDetails = create('details', 'ophtha-key-original');
    titleDetails.append(create('summary', '', copy.originalTitle), create('p', '', title));
    card.append(titleDetails);
  }

  const links = create('div', 'ophtha-key-links');
  const originalLinks = Array.from(sourceCard.querySelectorAll('.ophtha-result-links a')).slice(0, 3);
  for (const original of originalLinks) {
    const link = create('a', 'ophtha-result-link', original.textContent.trim() || copy.source);
    link.href = original.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    links.append(link);
  }
  if (links.children.length) card.append(links);
  return card;
}

function restructureClinicalPanel(panel, copy) {
  if (!panel || panel.hidden) return;
  const answerSummary = panel.querySelector('.ophtha-answer-summary');
  const interpretation = panel.querySelector('.ophtha-question-interpretation');
  const signalGrid = panel.querySelector('[data-signal-grid]');
  const landscape = panel.querySelector('.ophtha-landscape');
  if (!answerSummary || !interpretation || !signalGrid || !landscape) return;

  let direct = panel.querySelector('.ophtha-direct-answer');
  if (!direct) {
    direct = create('section', 'ophtha-direct-answer');
    const kicker = create('span', 'ophtha-clinical-kicker', copy.directAnswer);
    const text = create('p', 'ophtha-direct-answer-text');
    const basis = create('p', 'ophtha-direct-answer-basis');
    direct.append(kicker, text, basis);
    answerSummary.prepend(direct);
  }

  if (!['pending', 'success'].includes(panel.dataset.aiState)) {
    const pico = picoValues(panel);
    const counts = signalCounts(panel);
    direct.querySelector('.ophtha-direct-answer-text').textContent = directAnswer(copy, pico, counts);
    const strength = panel.querySelector('[data-strength]')?.textContent.trim();
    direct.querySelector('.ophtha-direct-answer-basis').textContent = strength ? `${copy.evidenceBasis}: ${strength}` : '';
  }

  let technical = panel.querySelector('.ophtha-answer-method');
  if (!technical) {
    technical = create('details', 'ophtha-answer-method');
    technical.append(create('summary', 'ophtha-answer-method-summary', copy.howBuilt));
    const body = create('div', 'ophtha-answer-method-body');
    body.append(interpretation, signalGrid, landscape);
    technical.append(body);
    answerSummary.append(technical);
  }
}

function rebuildKeyEvidence(panel, resultsEl, copy) {
  if (!panel || panel.hidden || !resultsEl) return;
  const cards = Array.from(resultsEl.querySelectorAll(':scope > .ophtha-result-card'));
  if (!cards.length) return;
  const signals = signalIndex(panel);

  let section = document.querySelector('.ophtha-key-evidence');
  if (!section) {
    section = create('section', 'ophtha-key-evidence');
    const title = create('h2', 'ophtha-key-evidence-title', copy.keyEvidence);
    const grid = create('div', 'ophtha-key-evidence-grid');
    section.append(title, grid);
    const resultsPanel = document.querySelector('.ophtha-results-panel');
    resultsPanel?.insertBefore(section, resultsEl);
  }

  const grid = section.querySelector('.ophtha-key-evidence-grid');
  grid.replaceChildren(...cards.slice(0, 6).map((card) => buildEvidenceCard(card, copy, resultSignal(card, signals))));

  let allDetails = document.querySelector('.ophtha-all-results');
  if (!allDetails) {
    allDetails = create('details', 'ophtha-all-results');
    const summary = create('summary', 'ophtha-all-results-summary', copy.allSources(cards.length));
    allDetails.append(summary);
    resultsEl.insertAdjacentElement('beforebegin', allDetails);
    allDetails.append(resultsEl);
  } else {
    const summary = allDetails.querySelector('.ophtha-all-results-summary');
    if (summary) summary.textContent = copy.allSources(cards.length);
  }
}

function ensureAiProvenance(panel) {
  restructureClinicalPanel(panel, langCopy());
  const direct = panel.querySelector('.ophtha-direct-answer');
  if (!direct) return null;
  let provenance = direct.querySelector('.ophtha-ai-provenance');
  if (!provenance) {
    provenance = create('p', 'ophtha-ai-provenance');
    direct.append(provenance);
  }
  return provenance;
}

function clearAiDetails(panel) {
  panel.querySelector('.ophtha-ai-details')?.remove();
}

function safeSourceUrl(result) {
  const candidates = [
    ...(Array.isArray(result?.sourceLinks) ? result.sourceLinks.map((item) => item?.url) : []),
    result?.pubMedUrl,
    result?.doiUrl,
    result?.fullTextUrl,
    result?.sourceUrl
  ];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (['http:', 'https:'].includes(url.protocol)) return url.href;
    } catch {}
  }
  return '';
}

function buildTextList(className, title, items) {
  if (!Array.isArray(items) || !items.length) return null;
  const section = create('section', className);
  section.append(create('h3', 'ophtha-ai-section-title', title));
  const list = create('ul', 'ophtha-ai-list');
  for (const item of items.slice(0, 4)) list.append(create('li', '', item));
  section.append(list);
  return section;
}

function buildAiCitations(detail, copy) {
  const citations = Array.isArray(detail.synthesis?.citations) ? detail.synthesis.citations : [];
  if (!citations.length || !(detail.sourceMap instanceof Map)) return null;
  const section = create('section', 'ophtha-ai-citations');
  section.append(create('h3', 'ophtha-ai-section-title', copy.aiSources));
  const list = create('div', 'ophtha-ai-citations-list');

  for (const citation of citations.slice(0, 8)) {
    const result = detail.sourceMap.get(citation.sourceId);
    if (!result) continue;
    const card = create('article', 'ophtha-ai-citation');
    const title = [citation.sourceId, result.title, result.year].filter(Boolean).join(' · ');
    card.append(create('strong', 'ophtha-ai-citation-title', title));
    card.append(create('p', 'ophtha-ai-citation-statement', citation.statement));
    const url = safeSourceUrl(result);
    if (url) {
      const link = create('a', 'ophtha-result-link', copy.source);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link);
    }
    list.append(card);
  }

  if (!list.children.length) return null;
  section.append(list);
  return section;
}

function renderAiPending(panel, copy) {
  panel.dataset.aiState = 'pending';
  restructureClinicalPanel(panel, copy);
  const direct = panel.querySelector('.ophtha-direct-answer');
  if (!direct) return;
  direct.querySelector('.ophtha-direct-answer-text').textContent = copy.aiPending;
  direct.querySelector('.ophtha-direct-answer-basis').textContent = '';
  const provenance = ensureAiProvenance(panel);
  if (provenance) provenance.textContent = '';
  clearAiDetails(panel);
}

function renderAiSuccess(panel, detail, copy) {
  panel.dataset.aiState = 'success';
  restructureClinicalPanel(panel, copy);
  const direct = panel.querySelector('.ophtha-direct-answer');
  if (!direct) return;
  direct.querySelector('.ophtha-direct-answer-text').textContent = detail.synthesis.answer;
  direct.querySelector('.ophtha-direct-answer-basis').textContent = `${copy.aiConfidence}: ${copy.confidence[detail.synthesis.confidence] || detail.synthesis.confidence}`;
  const provenance = ensureAiProvenance(panel);
  if (provenance) provenance.textContent = copy.aiProvenance;

  clearAiDetails(panel);
  const container = create('div', 'ophtha-ai-details');
  const evidence = buildTextList('ophtha-ai-evidence', copy.aiEvidence, detail.synthesis.evidenceSummary);
  const limitations = buildTextList('ophtha-ai-limitations', copy.aiLimitations, detail.synthesis.limitations);
  const citations = buildAiCitations(detail, copy);
  if (evidence) container.append(evidence);
  if (limitations) container.append(limitations);
  if (citations) container.append(citations);
  if (container.children.length) direct.insertAdjacentElement('afterend', container);
}

function renderAiFallback(panel, copy) {
  panel.dataset.aiState = 'fallback';
  clearAiDetails(panel);
  restructureClinicalPanel(panel, copy);
  const provenance = ensureAiProvenance(panel);
  if (provenance) provenance.textContent = copy.aiFallback;
}

function simplifyStaticCopy() {
  const root = document.querySelector('[data-ophthasearch]');
  if (!root) return;
  const lang = root.dataset.lang === 'en' ? 'en' : 'ru';
  const lead = document.querySelector('.ophtha-brand-lead');
  if (lead) lead.textContent = lang === 'en'
    ? 'Ask a clinical ophthalmology question. OphthaSearch retrieves the literature, ranks the evidence and shows the answer first; original publications remain available as sources.'
    : 'Задайте клинический вопрос по офтальмологии. OphthaSearch найдёт публикации, ранжирует доказательства и сначала покажет ответ; оригинальные статьи останутся доступными как источники.';
}

function initAnswerFirst() {
  const root = document.querySelector('[data-ophthasearch]');
  if (!root) return;
  addStyles();
  const copy = langCopy();
  moveTechnicalControls(copy);
  simplifyStaticCopy();

  const panel = document.querySelector('#ophtha-clinical-answer');
  const resultsEl = document.querySelector('#ophtha-results');
  if (!panel || !resultsEl) return;

  let newestAiSearchId = 0;
  const acceptAiEvent = (event) => {
    const searchId = Number(event.detail?.searchId || 0);
    if (searchId < newestAiSearchId) return false;
    newestAiSearchId = searchId;
    return true;
  };

  root.addEventListener('ophthasearch:ai-pending', (event) => {
    if (acceptAiEvent(event)) renderAiPending(panel, copy);
  });
  root.addEventListener('ophthasearch:ai-success', (event) => {
    if (acceptAiEvent(event)) renderAiSuccess(panel, event.detail, copy);
  });
  root.addEventListener('ophthasearch:ai-fallback', (event) => {
    if (acceptAiEvent(event)) renderAiFallback(panel, copy);
  });

  let scheduled = false;
  const refresh = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      restructureClinicalPanel(panel, copy);
      rebuildKeyEvidence(panel, resultsEl, copy);
    });
  };

  const observer = new MutationObserver(refresh);
  observer.observe(panel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  observer.observe(resultsEl, { childList: true, subtree: false });
  refresh();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAnswerFirst, { once: true });
  else initAnswerFirst();
}
