(function () {
  'use strict';

  const config = window.CLINICAL_VERTICAL_CONFIG || {};
  const form = document.getElementById('case-form');
  const caseInput = document.getElementById('case-input');
  const analyzeButton = document.getElementById('analyze-button');
  const status = document.getElementById('analysis-status');
  const errorBox = document.getElementById('analysis-error');
  const results = document.getElementById('analysis-results');
  const urgency = document.getElementById('urgency-card');
  const factsList = document.getElementById('recognized-facts');
  const questionsSection = document.getElementById('questions-section');
  const questionsList = document.getElementById('questions-list');
  const diagnosisList = document.getElementById('diagnosis-options');
  const managementSection = document.getElementById('management-section');
  const managementList = document.getElementById('management-options');
  const limitationsList = document.getElementById('limitations-list');
  const providerBadge = document.getElementById('provider-badge');
  const exampleButton = document.getElementById('example-button');
  const newCaseButton = document.getElementById('new-case-button');

  const state = {
    originalText: '',
    combinedText: '',
    facts: null,
    selectedDiagnosis: '',
    selectedManagement: '',
    requestSequence: 0
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function setBusy(busy, message = '') {
    analyzeButton.disabled = busy;
    caseInput.disabled = busy;
    analyzeButton.textContent = busy ? 'Анализирую…' : 'Проанализировать случай';
    status.hidden = !busy && !message;
    status.classList.toggle('is-loading', busy);
    status.textContent = message || (busy ? 'Модель извлекает факты и подбирает релевантные рекомендации…' : '');
  }

  function showError(message) {
    errorBox.hidden = false;
    errorBox.innerHTML = `<strong>Анализ не выполнен.</strong><span>${escapeHtml(message)}</span>`;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.replaceChildren();
  }

  async function request(payload) {
    if (!config.endpoint) throw new Error('Backend endpoint не настроен.');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), Number(config.requestTimeoutMs) || 90000);
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) {
        throw new Error(body.message || `Backend вернул HTTP ${response.status}.`);
      }
      return body;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Превышено время ожидания ответа модели.');
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function recognizedFactsFromLegacy(facts, text) {
    const rows = [];
    const symptomLabels = {
      pain: 'Боль', photophobia: 'Светобоязнь', redness: 'Покраснение',
      vision_loss: 'Снижение зрения', halos: 'Ореолы', headache: 'Головная боль',
      nausea: 'Тошнота', floaters: 'Плавающие помутнения', flashes: 'Фотопсии'
    };
    const valueLabels = {
      unilateral: 'Одностороннее поражение', bilateral: 'Двустороннее поражение',
      asymmetric: 'Асимметричное поражение', first: 'Первый эпизод',
      recurrent: 'Рецидивирующее течение', chronic: 'Хроническое течение',
      hours: 'Начало в течение часов', days: 'Начало в течение дней',
      weeks: 'Начало в течение недель', months: 'Начало в течение месяцев'
    };
    const add = (id, label, value = 'указано') => rows.push({ id, label, value, confidence: facts?.source_confidence || 0.6 });
    if (facts?.laterality) add(facts.laterality, valueLabels[facts.laterality] || 'Латеральность', facts.laterality);
    if (facts?.course) add(facts.course, valueLabels[facts.course] || 'Течение', facts.course);
    if (facts?.onset) add(facts.onset, valueLabels[facts.onset] || 'Начало', facts.onset);
    for (const symptom of facts?.symptoms || []) add(symptom, symptomLabels[symptom] || symptom, symptom);
    const exam = facts?.examination || {};
    if (exam.iop_mm_hg !== null && exam.iop_mm_hg !== undefined) add('iop_mm_hg', 'ВГД', `${exam.iop_mm_hg} мм рт. ст.`);
    if (exam.anterior_chamber_cells) add('cells', 'Клетки передней камеры', exam.anterior_chamber_cells);
    if (exam.hypopyon === true) add('hypopyon', 'Гипопион', 'есть');
    if (exam.vitritis === true) add('vitritis', 'Витреит', 'есть');
    if (exam.synechiae === true) add('synechiae', 'Задние синехии', 'есть');

    const normalized = String(text || '').toLowerCase().replaceAll('ё', 'е');
    if (/hla[- ]?b27|\bb27\b/.test(normalized)) add('hla_b27', 'Связь с HLA-B27', 'указана');
    if (/артрит|спондилоарт/.test(normalized)) add('spondyloarthritis', 'Спондилоартрит / артрит', 'указан');
    if (/фибрин/.test(normalized)) add('fibrin', 'Фибрин', 'есть');
    if (/перикорнеальн\w* инъекц/.test(normalized)) add('pericorneal_injection', 'Перикорнеальная инъекция', 'есть');
    const map = new Map();
    rows.forEach((row) => map.set(row.id, row));
    return [...map.values()];
  }

  function questionsFromLegacy(facts, options) {
    const questions = [];
    const add = (id, text, reason, priority = 'important') => {
      if (!questions.some((item) => item.id === id)) questions.push({ id, text, reason, priority });
    };
    const exam = facts?.examination || {};
    if (!facts?.laterality) add('laterality', 'Какой глаз поражён и является ли процесс односторонним, двусторонним или альтернирующим?', 'Латеральность меняет этиологический ряд.');
    if (!facts?.course) add('course', 'Это первый эпизод, рецидивирующее или хроническое воспаление?', 'Течение различает основные фенотипы.');
    if (exam.visual_acuity_reduced === null) add('visual_acuity', 'Какова острота зрения каждого глаза и насколько она изменилась?', 'Нужна для оценки срочности.', 'safety');
    if (!exam.anterior_chamber_cells) add('activity', 'Какова степень клеточной реакции и опалесценции?', 'Нужна для оценки активности.');
    if (exam.iop_mm_hg === null && !exam.iop_state) add('iop', 'Какое ВГД на поражённом и парном глазу?', 'Гипертензивный фенотип влияет на дифференциальный ряд.', 'safety');
    if (exam.hypopyon === null) add('hypopyon', 'Есть ли гипопион или выраженный фибрин?', 'Нужен для исключения опасных состояний.', 'safety');
    if (exam.vitritis === null) add('posterior', 'Есть ли витреит, ретинит, васкулит или другое вовлечение заднего отрезка?', 'Это меняет срочность и лечение.', 'safety');
    for (const text of options?.questions_to_resolve || []) {
      if (typeof text === 'string' && text.length > 5) add(`model_${questions.length + 1}`, text, 'Вопрос сформирован моделью для различения вариантов.');
    }
    return questions.slice(0, 7);
  }

  async function analyze(caseText, priorFacts = null) {
    const sequence = ++state.requestSequence;
    clearError();
    setBusy(true);
    results.hidden = true;
    try {
      let payload = await request({
        action: 'analyze_case',
        case_text: caseText,
        prior_facts: priorFacts,
        authoring_mode: config.authoringMode === true
      });

      if (payload.action !== 'analyze_case' || !Array.isArray(payload.diagnostic_options)) {
        const extraction = payload.action === 'extract_facts'
          ? payload
          : await request({ action: 'extract_facts', case_text: caseText, prior_facts: priorFacts });
        const generation = await request({
          action: 'generate_options',
          case_text: caseText,
          facts: extraction.facts,
          authoring_mode: config.authoringMode === true
        });
        const options = generation.options || {};
        payload = {
          ok: true,
          action: 'analyze_case_compat',
          provider: generation.provider || extraction.provider || 'unknown',
          case_text: caseText,
          facts: extraction.facts,
          recognized_facts: recognizedFactsFromLegacy(extraction.facts, caseText),
          missing_questions: questionsFromLegacy(extraction.facts, options),
          diagnostic_options: options.diagnostic_options || [],
          management_options: options.management_options || [],
          urgency: options.urgency || { level: 'uncertain', rationale: 'Срочность не определена.', evidence_chunk_ids: [] },
          limitations: options.limitations || [],
          physician_selection_required: true,
          final_decision_owner: 'physician',
          context_meta: generation.context_meta || {}
        };
      }

      if (sequence !== state.requestSequence) return;
      state.facts = payload.facts || null;
      render(payload);
      setBusy(false, `Анализ завершён · провайдер: ${payload.provider || 'не указан'}`);
    } catch (error) {
      if (sequence !== state.requestSequence) return;
      setBusy(false);
      showError(error?.message || 'Неизвестная ошибка анализа.');
    }
  }

  function renderUrgency(data) {
    const levelLabels = {
      routine: 'Плановая оценка', accelerated: 'Ускоренная оценка',
      same_day: 'Оценка в день обращения', emergency: 'Неотложная помощь',
      uncertain: 'Срочность требует уточнения'
    };
    urgency.dataset.level = data?.level || 'uncertain';
    urgency.innerHTML = `
      <span>Срочность</span>
      <strong>${escapeHtml(levelLabels[data?.level] || levelLabels.uncertain)}</strong>
      <p>${escapeHtml(data?.rationale || 'Недостаточно данных для оценки срочности.')}</p>
    `;
  }

  function renderFacts(items) {
    factsList.innerHTML = (items || []).length
      ? items.map((item) => `
          <li>
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.value)}</span>
            <small>${Math.round(Number(item.confidence || 0) * 100)}%</small>
          </li>
        `).join('')
      : '<li class="empty-state">Модель пока не извлекла структурированные факты.</li>';
  }

  function renderQuestions(items) {
    const questions = items || [];
    questionsSection.hidden = questions.length === 0;
    if (!questions.length) {
      questionsList.replaceChildren();
      return;
    }
    questionsList.innerHTML = questions.map((item, index) => `
      <label class="question-card ${item.priority === 'safety' ? 'is-safety' : ''}">
        <span>${index + 1}</span>
        <div>
          <strong>${escapeHtml(item.text)}</strong>
          <small>${escapeHtml(item.reason || '')}</small>
          <textarea name="${escapeHtml(item.id)}" rows="2" placeholder="Ответ врача"></textarea>
        </div>
      </label>
    `).join('') + '<button type="button" id="reanalyze-button" class="secondary-action">Дополнить случай и пересчитать варианты</button>';

    document.getElementById('reanalyze-button')?.addEventListener('click', () => {
      const answers = [...questionsList.querySelectorAll('textarea')]
        .map((field) => ({ id: field.name, value: field.value.trim(), question: field.closest('.question-card')?.querySelector('strong')?.textContent || field.name }))
        .filter((item) => item.value);
      if (!answers.length) {
        showError('Заполните хотя бы один уточняющий ответ.');
        return;
      }
      const supplement = answers.map((item) => `${item.question} Ответ: ${item.value}`).join('\n');
      state.combinedText = `${state.combinedText}\n${supplement}`.trim();
      caseInput.value = state.combinedText;
      analyze(state.combinedText, state.facts);
    });
  }

  function optionCard(item, type) {
    const isDiagnosis = type === 'diagnosis';
    const selected = isDiagnosis ? state.selectedDiagnosis === item.id : state.selectedManagement === item.id;
    const body = isDiagnosis
      ? `
        <div class="option-grid">
          <section><h4>Аргументы за</h4>${list(item.supporting_facts)}</section>
          <section><h4>Против / не хватает данных</h4>${list(item.against_or_missing_facts)}</section>
        </div>
        <section><h4>Что различит варианты</h4>${list(item.tests_to_discriminate)}</section>
      `
      : `
        <p>${escapeHtml(item.rationale || '')}</p>
        <section><h4>Компоненты</h4>${list((item.components || []).map((component) => [component.intervention, component.regimen, component.duration].filter(Boolean).join(' · ')))}</section>
        <div class="option-grid">
          <section><h4>Контроль</h4>${list(item.monitoring)}</section>
          <section><h4>Риски и ограничения</h4>${list(item.risks_and_constraints)}</section>
        </div>
      `;
    return `
      <article class="option-card ${selected ? 'is-selected' : ''}" data-option-id="${escapeHtml(item.id)}" data-option-type="${type}">
        <header>
          <div>
            <span>${isDiagnosis ? escapeHtml(item.support_level || 'вариант') : 'вариант ведения'}</span>
            <h3>${escapeHtml(item.label)}</h3>
          </div>
          <button type="button" class="select-option">${selected ? 'Выбрано врачом' : 'Выбрать для обсуждения'}</button>
        </header>
        ${body}
        <footer>Evidence: ${escapeHtml((item.evidence_chunk_ids || []).join(', ') || 'не указано')}</footer>
      </article>
    `;
  }

  function list(items) {
    const values = unique(items);
    return values.length
      ? `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '<p class="muted">Не указано.</p>';
  }

  function wireSelections(container, type) {
    container.querySelectorAll('.option-card').forEach((card) => {
      card.querySelector('.select-option')?.addEventListener('click', () => {
        if (type === 'diagnosis') state.selectedDiagnosis = card.dataset.optionId;
        else state.selectedManagement = card.dataset.optionId;
        container.querySelectorAll('.option-card').forEach((item) => {
          const selected = item.dataset.optionId === card.dataset.optionId;
          item.classList.toggle('is-selected', selected);
          const button = item.querySelector('.select-option');
          if (button) button.textContent = selected ? 'Выбрано врачом' : 'Выбрать для обсуждения';
        });
      });
    });
  }

  function render(payload) {
    providerBadge.textContent = payload.provider || 'не указан';
    renderUrgency(payload.urgency);
    renderFacts(payload.recognized_facts);
    renderQuestions(payload.missing_questions);

    diagnosisList.innerHTML = (payload.diagnostic_options || []).map((item) => optionCard(item, 'diagnosis')).join('');
    wireSelections(diagnosisList, 'diagnosis');

    const management = payload.management_options || [];
    managementSection.hidden = management.length === 0;
    managementList.innerHTML = management.map((item) => optionCard(item, 'management')).join('');
    wireSelections(managementList, 'management');

    limitationsList.innerHTML = list(payload.limitations || []);
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reset() {
    state.requestSequence += 1;
    state.originalText = '';
    state.combinedText = '';
    state.facts = null;
    state.selectedDiagnosis = '';
    state.selectedManagement = '';
    caseInput.value = '';
    results.hidden = true;
    clearError();
    setBusy(false);
    caseInput.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = caseInput.value.trim();
    if (text.length < 10) {
      showError('Опишите клинический случай подробнее — минимум 10 символов.');
      return;
    }
    state.originalText = text;
    state.combinedText = text;
    state.selectedDiagnosis = '';
    state.selectedManagement = '';
    analyze(text, null);
  });

  exampleButton?.addEventListener('click', () => {
    caseInput.value = 'Женщина 34 лет. Острый односторонний передний увеит: боль, светобоязнь, перикорнеальная инъекция, фибрин, клетки 3+. В анамнезе HLA-B27-ассоциированный артрит. ВГД 18 мм рт. ст., гипопиона нет, задний отрезок без патологии.';
    caseInput.focus();
  });
  newCaseButton?.addEventListener('click', reset);
}());
