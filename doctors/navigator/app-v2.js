(function () {
  'use strict';

  const modules = window.CLINICAL_MODULES || {};
  const stream = document.getElementById('chat-stream');
  const suggestions = document.getElementById('chat-suggestions');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const newCaseButton = document.getElementById('new-case-button');
  const cardButton = document.getElementById('card-button');
  const typingTemplate = document.getElementById('typing-template');
  const moduleTitle = document.getElementById('module-title');

  const summary = {
    completeness: document.getElementById('summary-completeness'),
    urgency: document.getElementById('summary-urgency'),
    conclusion: document.getElementById('summary-diagnosis'),
    direction: document.getElementById('summary-driver'),
    card: document.getElementById('summary-card'),
    status: document.getElementById('case-status'),
    progress: document.getElementById('context-progress-bar')
  };

  const insightRows = [1, 2, 3, 4, 5].map((index) => ({
    label: document.getElementById(`insight-label-${index}`),
    bar: document.getElementById(`insight-bar-${index}`)
  }));

  const globalSignals = {
    vision_loss: 'быстрое или выраженное снижение зрения',
    pain_photophobia: 'боль или светобоязнь',
    red_eye: 'покраснение глаза',
    corneal_contact: 'изменения роговицы или контактные линзы',
    flashes_floaters: 'вспышки, новые плавающие помутнения или дефект поля',
    high_iop: 'повышение ВГД, ореолы, головная боль или тошнота',
    inflammation: 'клетки/опалесценция, синехии или воспаление переднего отрезка',
    postop: 'связь с недавней операцией или внутриглазной инъекцией',
    none: 'перечисленные признаки не отмечены'
  };

  const phraseRules = {
    dry_eye: [
      ['синдром сухого глаза', 12], ['сухой глаз', 12], ['мгд', 10],
      ['мейбом', 10], ['улучшение после моргания', 7], ['песок', 4],
      ['сухость', 4], ['жжение', 2]
    ],
    red_eye: [
      ['острый красный глаз', 12], ['красный глаз', 9], ['конъюнктивит', 9],
      ['гнойное отделяемое', 7], ['покраснение', 4], ['зуд', 3]
    ],
    keratitis: [
      ['кератит', 13], ['язва роговицы', 13], ['инфильтрат роговицы', 13],
      ['инфильтрат', 9], ['дефект эпителия', 9], ['гипопион', 7],
      ['контактные линзы', 2]
    ],
    pvd_retina: [
      ['отслойка сетчатки', 13], ['разрыв сетчатки', 13], ['фотопсии', 10],
      ['вспышки', 8], ['мушки', 7], ['занавес', 10], ['зост', 9],
      ['дефект поля зрения', 8]
    ],
    glaucoma: [
      ['глаукома', 12], ['офтальмогипертензия', 12], ['повышенное вгд', 10],
      ['вгд', 7], ['закрытие угла', 11], ['ореолы', 4], ['экскавация', 7]
    ],
    uveitis: [
      ['увеит', 13], ['иридоциклит', 13], ['клетки во влаге', 10],
      ['опалесценция', 9], ['задние синехии', 9], ['перикорнеальная инъекция', 5]
    ],
    post_cataract: [
      ['после операции по поводу катаракты', 14], ['после факоэмульсификации', 14],
      ['после фако', 12], ['артифакия', 6], ['иол', 5],
      ['послеоперационное снижение зрения', 12]
    ]
  };

  const triageWeights = {
    vision_loss: { keratitis: 2, pvd_retina: 4, glaucoma: 3, uveitis: 2, post_cataract: 4, red_eye: 2 },
    pain_photophobia: { keratitis: 4, uveitis: 4, glaucoma: 3, red_eye: 2, post_cataract: 2 },
    red_eye: { red_eye: 5, keratitis: 3, uveitis: 3, glaucoma: 2, post_cataract: 2 },
    corneal_contact: { keratitis: 6, dry_eye: 2, red_eye: 2 },
    flashes_floaters: { pvd_retina: 8, post_cataract: 2 },
    high_iop: { glaucoma: 8, uveitis: 2, post_cataract: 3 },
    inflammation: { uveitis: 8, keratitis: 2, post_cataract: 3 },
    postop: { post_cataract: 9, keratitis: 2, glaucoma: 2, pvd_retina: 2 }
  };

  const initialState = () => ({
    stage: 'consent',
    accepted: false,
    caseText: '',
    globalSignals: [],
    candidates: [],
    moduleId: '',
    redFlags: [],
    answers: {},
    stepIndex: 0,
    notes: [],
    urgentRoute: false,
    conversationComplete: false,
    cardGenerated: false
  });

  let state = initialState();
  let selected = new Set();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replaceAll('ё', 'е');
  }

  function currentModule() {
    return modules[state.moduleId] || null;
  }

  function addMessage(role, html) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'assistant' ? 'AI' : 'В';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = html;
    row.append(avatar, bubble);
    stream.appendChild(row);
    requestAnimationFrame(() => stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' }));
    return bubble;
  }

  function addUserText(text) {
    addMessage('user', `<p>${escapeHtml(text).replaceAll('\n', '<br>')}</p>`);
  }

  function assistant(html, after) {
    const node = typingTemplate.content.firstElementChild.cloneNode(true);
    stream.appendChild(node);
    requestAnimationFrame(() => stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' }));
    window.setTimeout(() => {
      node.remove();
      const bubble = addMessage('assistant', html);
      if (after) after(bubble);
    }, 220);
  }

  function clearSuggestions() {
    suggestions.replaceChildren();
    selected = new Set();
  }

  function setSuggestions(items, mode = 'single', submitLabel = 'Продолжить') {
    clearSuggestions();
    let done = null;

    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion-chip';
      button.dataset.value = item.value;
      button.textContent = item.label;
      button.addEventListener('click', () => {
        if (mode === 'single') {
          submitStructured([item.value], item.label);
          return;
        }

        if (item.value === 'none') {
          selected.clear();
          suggestions.querySelectorAll('.suggestion-chip').forEach((chip) => chip.classList.remove('selected'));
        } else {
          selected.delete('none');
          suggestions.querySelector('[data-value="none"]')?.classList.remove('selected');
        }

        if (selected.has(item.value)) {
          selected.delete(item.value);
          button.classList.remove('selected');
        } else {
          selected.add(item.value);
          button.classList.add('selected');
        }
        if (done) done.disabled = selected.size === 0;
      });
      suggestions.appendChild(button);
    });

    if (mode === 'multi') {
      done = document.createElement('button');
      done.type = 'button';
      done.className = 'suggestion-submit';
      done.textContent = submitLabel;
      done.disabled = true;
      done.addEventListener('click', () => {
        const values = Array.from(selected);
        const text = values.map((value) => items.find((item) => item.value === value)?.label || value).join('; ');
        submitStructured(values, text);
      });
      suggestions.appendChild(done);
    }
  }

  function renderInlineForm(fields, submitLabel, onSubmit) {
    clearSuggestions();
    const wrapper = document.createElement('form');
    wrapper.className = 'inline-chat-form';
    wrapper.innerHTML = fields.map((field) => {
      const [name, type, label, options, placeholder] = field;
      if (type === 'select') {
        return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${(options || []).map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join('')}</select></label>`;
      }
      return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${escapeHtml(type || 'text')}" ${type === 'number' ? 'min="0" step="0.1"' : ''} placeholder="${escapeHtml(placeholder || '')}"></label>`;
    }).join('') + `<button type="submit">${escapeHtml(submitLabel)}</button>`;

    wrapper.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(wrapper).entries());
      const summaryText = fields.map(([name, , label]) => `${label}: ${data[name] || 'не указано'}`).join('; ');
      wrapper.closest('.message-bubble').classList.add('submitted-form');
      wrapper.querySelectorAll('input,select,button').forEach((element) => { element.disabled = true; });
      addUserText(summaryText);
      onSubmit(data);
    });
    return wrapper;
  }

  function scoreCandidates(text, signals = []) {
    const normalized = normalize(text);
    const scores = Object.fromEntries(Object.keys(modules).map((id) => [id, 0]));

    Object.entries(phraseRules).forEach(([moduleId, rules]) => {
      rules.forEach(([phrase, weight]) => {
        if (normalized.includes(normalize(phrase))) scores[moduleId] += weight;
      });
    });

    Object.values(modules).forEach((module) => {
      (module.keywords || []).forEach((keyword) => {
        if (normalized.includes(normalize(keyword))) scores[module.id] += 2;
      });
    });

    signals.filter((item) => item !== 'none').forEach((signal) => {
      Object.entries(triageWeights[signal] || {}).forEach(([moduleId, weight]) => {
        scores[moduleId] += weight;
      });
    });

    return Object.entries(scores)
      .map(([id, score]) => ({ id, score, module: modules[id] }))
      .filter((item) => item.module && item.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function confidenceLabel(candidates) {
    if (!candidates.length) return 'недостаточно данных';
    const first = candidates[0].score;
    const second = candidates[1]?.score || 0;
    if (first >= 12 && first - second >= 5) return 'высокая';
    if (first >= 7 && first - second >= 2) return 'умеренная';
    return 'низкая';
  }

  function startConversation() {
    stream.replaceChildren();
    clearSuggestions();
    state = initialState();
    updateContext();
    assistant(`
      <p class="message-eyebrow">Офтальмологический клинический навигатор</p>
      <h2>Опишите клинический случай обычным медицинским языком.</h2>
      <p>Система сначала сформирует дифференциальный ряд, проверит срочность и задаст уточняющие вопросы. Только после этого будет выбран профильный алгоритм.</p>
      <div class="message-alert"><strong>Важно:</strong> не вводите персональные данные пациента. Лекарственные схемы будут подключаться только из утверждённой базы источников.</div>
      <p>Подтверждаете ограничения?</p>
    `, () => setSuggestions([
      { value: 'accept', label: 'Да, продолжить' },
      { value: 'details', label: 'Показать ограничения' }
    ]));
  }

  function askCaseDescription() {
    state.stage = 'intake';
    updateContext();
    assistant(`
      <p>Опишите жалобы, сроки, латеральность, данные осмотра и уже известный диагноз, если он есть.</p>
      <p class="message-note">Например: «Односторонняя боль и светобоязнь, перикорнеальная инъекция, клетки 2+, ВГД 28 мм рт. ст.»</p>
    `);
    input.focus();
  }

  function askGlobalTriage() {
    state.stage = 'triage';
    updateContext();
    assistant(`
      <p>Перед выбором патологии уточню признаки, которые сильнее всего меняют дифференциальный ряд и срочность.</p>
      <p class="message-note">Отметьте всё, что присутствует.</p>
    `, () => setSuggestions([
      { value: 'vision_loss', label: 'Быстрое или выраженное снижение зрения' },
      { value: 'pain_photophobia', label: 'Боль или светобоязнь' },
      { value: 'red_eye', label: 'Красный глаз' },
      { value: 'corneal_contact', label: 'Инфильтрат / дефект роговицы / контактные линзы' },
      { value: 'flashes_floaters', label: 'Вспышки / новые мушки / занавес' },
      { value: 'high_iop', label: 'Высокое ВГД / ореолы / тошнота' },
      { value: 'inflammation', label: 'Клетки / опалесценция / синехии' },
      { value: 'postop', label: 'Недавняя операция или инъекция' },
      { value: 'none', label: 'Перечисленных признаков нет' }
    ], 'multi', 'Провести дифференциальный разбор'));
  }

  function presentDeduction() {
    state.candidates = scoreCandidates(state.caseText, state.globalSignals);
    updateContext();

    if (!state.candidates.length) {
      state.stage = 'candidate';
      assistant(`
        <p class="message-eyebrow">Дифференциальный разбор</p>
        <h2>Данных недостаточно для выбора профильного алгоритма.</h2>
        <p>Ни один из доступных сценариев не получил убедительной поддержки. Можно выбрать ближайшее клиническое направление или дополнить описание.</p>
      `, () => setSuggestions([
        ...Object.values(modules).map((module) => ({ value: module.id, label: module.title })),
        { value: 'more_text', label: 'Дополнить описание случая' }
      ]));
      return;
    }

    const top = state.candidates.slice(0, 3);
    const confidence = confidenceLabel(top);
    state.stage = 'candidate';
    assistant(`
      <p class="message-eyebrow">Предварительный дифференциальный ряд</p>
      <h2>Наиболее вероятное направление: ${escapeHtml(top[0].module.title)}</h2>
      <p>Уверенность маршрутизации: <strong>${escapeHtml(confidence)}</strong>. Это не окончательный диагноз.</p>
      <ol>${top.map((item) => `<li><strong>${escapeHtml(item.module.title)}</strong> — ${item.score} условных признаков соответствия</li>`).join('')}</ol>
      <p>Подтвердите рабочее направление или выберите более подходящее.</p>
    `, () => setSuggestions([
      ...top.map((item) => ({ value: item.id, label: item.module.title })),
      { value: 'more_text', label: 'Недостаточно данных — дополнить описание' },
      { value: 'all_modules', label: 'Показать все направления' }
    ]));
  }

  function selectModule(moduleId) {
    const module = modules[moduleId];
    if (!module) return;
    state.moduleId = moduleId;
    state.stage = 'redFlags';
    state.redFlags = [];
    state.answers = {};
    state.stepIndex = 0;
    state.urgentRoute = false;
    state.conversationComplete = false;
    state.cardGenerated = false;
    updateContext();

    const alternatives = state.candidates.filter((item) => item.id !== moduleId).slice(0, 2);
    assistant(`
      <p class="message-eyebrow">Рабочая клиническая гипотеза</p>
      <h2>${escapeHtml(module.title)}</h2>
      <p>${escapeHtml(module.description)}</p>
      ${alternatives.length ? `<p class="message-note">В дифференциальном ряду сохраняются: ${alternatives.map((item) => escapeHtml(item.module.title)).join('; ')}.</p>` : ''}
      <p>Теперь проверим специфические настораживающие признаки и перейдём к профильному алгоритму.</p>
    `, askRedFlags);
  }

  function askRedFlags() {
    const module = currentModule();
    if (!module) return askCaseDescription();
    state.stage = 'redFlags';
    setSuggestions(module.redFlags.map(([value, label]) => ({ value, label })), 'multi', 'Подтвердить');
  }

  function askStep() {
    const module = currentModule();
    if (!module) return askCaseDescription();
    const step = module.steps[state.stepIndex];

    if (!step) {
      state.stage = 'ready';
      state.conversationComplete = true;
      updateContext();
      assistant(`
        <p class="message-eyebrow">Профильный разбор завершён</p>
        <h2>Рабочая гипотеза и алгоритм действий сформированы.</h2>
        <p>Можно дополнить случай, посмотреть недостающие данные или сформировать итоговую карточку.</p>
        <div class="message-actions">
          <button type="button" data-chat-action="card">Сформировать карточку</button>
          <button type="button" data-chat-action="missing">Что ещё необходимо уточнить?</button>
        </div>
      `, wireMessageActions);
      return;
    }

    state.stage = 'step';
    updateContext();
    if (step.type === 'single' || step.type === 'multi') {
      assistant(`<p>${escapeHtml(step.prompt)}</p>${step.type === 'multi' ? '<p class="message-note">Можно выбрать несколько вариантов.</p>' : ''}`, () => {
        setSuggestions(step.options.map(([value, label]) => ({ value, label })), step.type, 'Продолжить');
      });
      return;
    }

    assistant(`<p>${escapeHtml(step.prompt)}</p><p class="message-note">Неизвестные показатели можно оставить пустыми.</p>`, (bubble) => {
      bubble.appendChild(renderInlineForm(step.fields, 'Отправить данные', (data) => {
        state.answers[step.id] = data;
        state.stepIndex += 1;
        askStep();
      }));
    });
  }

  function submitStructured(values, displayText) {
    clearSuggestions();
    addUserText(displayText);

    if (state.stage === 'consent') {
      if (values[0] === 'details') {
        assistant('<p>Навигатор формирует рабочий дифференциальный ряд и справочный алгоритм. Он не заменяет решение врача, не должен получать идентификаторы пациента и пока не выдаёт лекарственные назначения.</p><p>Продолжить?</p>', () => setSuggestions([{ value: 'accept', label: 'Да, продолжить' }]));
        return;
      }
      state.accepted = true;
      askCaseDescription();
      return;
    }

    if (state.stage === 'triage') {
      state.globalSignals = values;
      presentDeduction();
      return;
    }

    if (state.stage === 'candidate') {
      const value = values[0];
      if (value === 'more_text') {
        state.stage = 'intake_more';
        assistant('<p>Добавьте недостающие сведения: жалобы, сроки, латеральность, остроту зрения, ВГД, биомикроскопию, офтальмоскопию или связь с операцией.</p>');
        input.focus();
        return;
      }
      if (value === 'all_modules') {
        setSuggestions(Object.values(modules).map((module) => ({ value: module.id, label: module.title })));
        return;
      }
      selectModule(value);
      return;
    }

    if (state.stage === 'redFlags') {
      state.redFlags = values;
      state.urgentRoute = values.some((value) => value !== 'none');
      updateContext();
      if (state.urgentRoute) {
        assistant(`
          <p class="message-eyebrow critical-text">Срочность повышена</p>
          <h2>Есть признаки, требующие приоритетной очной оценки.</h2>
          <div class="message-alert critical"><strong>Не откладывайте необходимый маршрут ради заполнения навигатора.</strong><br>Можно продолжить структурирование случая или сразу сформировать карточку безопасности.</div>
          <div class="message-actions">
            <button type="button" data-chat-action="continue">Продолжить разбор</button>
            <button type="button" data-chat-action="card">Сформировать карточку безопасности</button>
          </div>
        `, wireMessageActions);
        return;
      }
      askStep();
      return;
    }

    if (state.stage === 'step') {
      const module = currentModule();
      const step = module?.steps[state.stepIndex];
      if (!step) return;
      state.answers[step.id] = step.type === 'single' ? values[0] : values;
      state.stepIndex += 1;
      askStep();
    }
  }

  function value(stepId, field) {
    const answer = state.answers[stepId];
    if (Array.isArray(answer)) return answer;
    if (answer && typeof answer === 'object') return answer[field] ?? '';
    return answer ?? '';
  }

  function has(stepId, item) {
    const answer = state.answers[stepId];
    return Array.isArray(answer) && answer.includes(item);
  }

  function numeric(stepId, field) {
    const raw = value(stepId, field);
    return raw === '' || raw === undefined ? null : Number(raw);
  }

  function resultBase() {
    const module = currentModule();
    const candidateAlternatives = state.candidates
      .filter((item) => item.id !== state.moduleId)
      .slice(0, 3)
      .map((item) => item.module.title);

    return {
      urgency: state.urgentRoute ? 'Приоритетная очная оценка' : 'Определяется по клиническим данным',
      conclusion: module ? `Рабочая гипотеза: ${module.title}` : 'Патология не определена',
      direction: module?.title || 'Дифференциальный разбор',
      findings: summarizeAnswers(),
      mechanisms: [],
      alternatives: candidateAlternatives,
      nextSteps: module ? [
        'Подтвердить рабочую гипотезу объективными данными профильного осмотра',
        'Исключить опасные альтернативные диагнозы',
        'Сопоставить результаты с актуальным клиническим алгоритмом'
      ] : [],
      missing: [],
      signals: state.candidates.slice(0, 5).map((item) => [item.module.shortTitle || item.module.title, Math.min(100, item.score * 7)])
    };
  }

  function interpret() {
    const r = resultBase();
    const module = currentModule();
    if (!module) return r;

    const answered = module.steps.filter((step) => state.answers[step.id] !== undefined).length;
    const missingSteps = module.steps.filter((step) => state.answers[step.id] === undefined).map((step) => step.prompt);
    r.missing = missingSteps;

    if (state.urgentRoute) {
      r.urgency = 'Неотложная или ускоренная очная оценка';
      r.conclusion = `Рабочая гипотеза: ${module.title}; выявлены настораживающие признаки`;
    } else if (answered === module.steps.length) {
      r.urgency = 'Срочность определяется профильным алгоритмом';
      r.conclusion = `Данные собраны для проверки гипотезы: ${module.title}`;
    } else {
      r.conclusion = `Предварительное направление: ${module.title}; данных пока недостаточно`;
    }

    if (module.id === 'dry_eye') {
      const nibt = numeric('tests', 'nibt');
      const osdi = value('tests', 'osdi6');
      const homeostasis = (nibt !== null && nibt < 10) || value('tests', 'osmolarity') === 'abnormal' || value('tests', 'staining') === 'abnormal';
      if (osdi === 'positive' && homeostasis) r.conclusion = 'Сочетание симптомов и объективных изменений поддерживает ССГ';
      if (osdi === 'negative') r.conclusion = 'ССГ не подтверждён симптоматическим скринингом; требуется поиск другой причины';
      r.nextSteps = ['Определить фенотип глазной поверхности', 'Оценить МГД, слезопродукцию, экспозицию и ятрогенные факторы'];
    }

    if (module.id === 'red_eye') {
      if (value('exam', 'va') === 'reduced' || value('exam', 'iop') === 'high' || value('exam', 'anterior_chamber') === 'hypopyon' || value('exam', 'fluorescein') === 'positive') {
        r.urgency = 'Осмотр в день обращения';
      }
      r.nextSteps = ['Острота зрения каждого глаза', 'Биомикроскопия с флюоресцеином', 'ВГД, зрачок и передняя камера'];
    }

    if (module.id === 'keratitis') {
      const size = numeric('lesion', 'size');
      if (state.urgentRoute || size !== null && size >= 2 || value('lesion', 'hypopyon') === 'yes' || value('lesion', 'thinning') === 'yes') {
        r.urgency = 'Неотложная оценка в день обращения';
      }
      r.nextSteps = ['Оценить размер, глубину, локализацию и прогрессию инфильтрата', 'Определить показания к соскобу, микроскопии и посеву', 'Исключить угрозу перфорации и эндофтальмит'];
    }

    if (module.id === 'pvd_retina') {
      if (value('symptoms', 'field_defect') === 'yes' || value('exam', 'tear') === 'yes' || value('exam', 'detachment') === 'yes') r.urgency = 'Осмотр ретинального специалиста в день обращения';
      r.nextSteps = ['Полный осмотр периферии сетчатки с мидриазом', 'При непрозрачных средах — УЗИ B-скан', 'Инструкции по срочному повторному обращению'];
    }

    if (module.id === 'glaucoma') {
      const iopOd = numeric('iop', 'iop_od');
      const iopOs = numeric('iop', 'iop_os');
      if (state.urgentRoute || [iopOd, iopOs].some((item) => item !== null && item >= 40) || value('structure', 'angle') === 'closed') r.urgency = 'Неотложная оценка';
      r.nextSteps = ['Подтвердить ВГД и учесть ЦТР', 'Гониоскопия', 'Сопоставить диск, ОКТ RNFL/GCC и поле зрения', 'Определить прогрессию и целевое ВГД'];
    }

    if (module.id === 'uveitis') {
      r.nextSteps = ['Подтвердить локализацию и активность воспаления', 'Оценить ВГД, синехии, роговицу, макулу и задний отрезок', 'Выбирать этиологическое обследование по фенотипу'];
    }

    if (module.id === 'post_cataract') {
      if (state.urgentRoute || value('exam', 'ac') === 'hypopyon' || value('exam', 'wound') === 'leak' || value('exam', 'fundus') === 'rd') r.urgency = 'Неотложная оценка в день обращения';
      r.nextSteps = ['Оценить рану, роговицу, переднюю камеру, ВГД и положение ИОЛ', 'Осмотреть задний отрезок', 'По показаниям — ОКТ макулы или УЗИ B-скан'];
    }

    return r;
  }

  function labelForOption(step, answer) {
    return step?.options?.find(([id]) => id === answer)?.[1] || answer;
  }

  function labelForField(field, answer) {
    if (!answer) return 'не указано';
    return Array.isArray(field[3]) ? field[3].find(([id]) => id === answer)?.[1] || answer : answer;
  }

  function summarizeAnswers() {
    const module = currentModule();
    if (!module) return [];
    const rows = [];
    module.steps.forEach((step) => {
      const answer = state.answers[step.id];
      if (answer === undefined) return;
      if (Array.isArray(answer)) rows.push(`${step.prompt} ${answer.map((item) => labelForOption(step, item)).join('; ')}`);
      else if (answer && typeof answer === 'object') rows.push(step.fields.map((field) => `${field[2]}: ${labelForField(field, answer[field[0]])}`).join('; '));
      else rows.push(`${step.prompt} ${labelForOption(step, answer)}`);
    });
    return rows;
  }

  function completeness() {
    if (!state.accepted) return 0;
    if (!state.caseText) return 10;
    const module = currentModule();
    if (!module) return state.globalSignals.length ? 35 : 20;
    const completed = module.steps.filter((step) => state.answers[step.id] !== undefined).length;
    return Math.min(100, Math.round((3 + completed) / (module.steps.length + 3) * 100));
  }

  function updateContext() {
    const module = currentModule();
    const result = interpret();
    const percent = completeness();

    if (moduleTitle) moduleTitle.textContent = module?.shortTitle || (state.candidates[0]?.module.shortTitle ?? 'Дифференциальный разбор');
    summary.completeness.textContent = `${percent}%`;
    summary.progress.style.width = `${percent}%`;
    summary.urgency.textContent = result.urgency;
    summary.conclusion.textContent = module ? result.conclusion : (state.candidates[0] ? state.candidates[0].module.title : 'Не определена');
    summary.direction.textContent = module ? module.title : (state.candidates.length ? `${state.candidates.length} гипотез` : 'Сбор данных');
    summary.status.textContent = state.cardGenerated ? 'Карточка сформирована' : state.conversationComplete ? 'Разбор завершён' : state.stage === 'candidate' ? 'Дифференциальный ряд' : module ? 'Профильный разбор' : state.accepted ? 'Первичная оценка' : 'Диалог не начат';
    summary.card.textContent = state.cardGenerated ? 'Сформирована' : 'По запросу врача';

    insightRows.forEach((row, index) => {
      const signal = result.signals[index];
      if (row.label) row.label.textContent = signal?.[0] || '—';
      if (row.bar) row.bar.style.width = `${signal?.[1] || 0}%`;
    });
  }

  function listHtml(items, emptyText = 'Не отмечено.') {
    const filtered = (items || []).filter(Boolean);
    return filtered.length ? `<ul>${filtered.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : `<p>${escapeHtml(emptyText)}</p>`;
  }

  function redFlagLabels() {
    const module = currentModule();
    return state.redFlags.filter((value) => value !== 'none').map((value) => module?.redFlags.find(([id]) => id === value)?.[1] || value);
  }

  function cardHtml() {
    const module = currentModule();
    const result = interpret();
    return `
      <article class="clinical-card" id="clinical-card">
        <header>
          <div><span>Офтальмологический клинический навигатор</span><h2>${escapeHtml(module?.title || 'Дифференциальный разбор')}</h2></div>
          <strong>v0.6</strong>
        </header>
        <section class="card-section"><h3>Исходное описание случая</h3><p>${escapeHtml(state.caseText || 'Не указано')}</p></section>
        <section class="card-summary-grid">
          <div><span>Срочность</span><strong>${escapeHtml(result.urgency)}</strong></div>
          <div><span>Рабочая гипотеза</span><strong>${escapeHtml(result.conclusion)}</strong></div>
          <div><span>Профильное направление</span><strong>${escapeHtml(result.direction)}</strong></div>
          <div><span>Полнота данных</span><strong>${completeness()}%</strong></div>
        </section>
        <section class="card-section"><h3>Предварительный дифференциальный ряд</h3>${listHtml(state.candidates.slice(0, 5).map((item) => item.module.title), 'Не сформирован.')}</section>
        ${redFlagLabels().length ? `<section class="card-section critical-card"><h3>Настораживающие признаки</h3>${listHtml(redFlagLabels())}</section>` : ''}
        <section class="card-section"><h3>Введённые клинические данные</h3>${listHtml(result.findings, 'Структурированные данные не введены.')}</section>
        <section class="card-section"><h3>Важные альтернативы</h3>${listHtml(result.alternatives)}</section>
        <section class="card-section"><h3>Алгоритм дальнейших действий</h3>${listHtml(result.nextSteps)}</section>
        <section class="card-section"><h3>Недостающие данные</h3>${listHtml(result.missing, 'Ключевые поля текущего алгоритма заполнены.')}</section>
        ${state.notes.length ? `<section class="card-section"><h3>Дополнительное описание врача</h3>${listHtml(state.notes)}</section>` : ''}
        <footer><strong>Лекарственный алгоритм пока не подключён.</strong> Он будет формироваться только из утверждённой базы рекомендаций, инструкций и дозировок.</footer>
      </article>
      <div class="card-export-actions">
        <button type="button" data-export="copy">Копировать</button>
        <button type="button" data-export="txt">Скачать TXT</button>
        <button type="button" data-export="print">Печать / PDF</button>
      </div>
    `;
  }

  function plainTextCard() {
    const module = currentModule();
    const result = interpret();
    const section = (title, items, fallback = 'не отмечено') => [title.toUpperCase(), ...(items?.length ? items.map((item) => `- ${item}`) : [`- ${fallback}`]), ''];
    return [
      `ОФТАЛЬМОЛОГИЧЕСКИЙ КЛИНИЧЕСКИЙ НАВИГАТОР — v0.6`,
      '',
      `Исходное описание: ${state.caseText || 'не указано'}`,
      `Рабочая гипотеза: ${module?.title || 'не определена'}`,
      `Срочность: ${result.urgency}`,
      '',
      ...section('Дифференциальный ряд', state.candidates.slice(0, 5).map((item) => item.module.title)),
      ...section('Настораживающие признаки', redFlagLabels()),
      ...section('Введённые данные', result.findings),
      ...section('Важные альтернативы', result.alternatives),
      ...section('Алгоритм действий', result.nextSteps),
      ...section('Недостающие данные', result.missing, 'ключевые поля заполнены'),
      'Лекарственный алгоритм пока не подключён.'
    ].join('\n');
  }

  function wireExportActions(container) {
    container.querySelectorAll('[data-export]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (button.dataset.export === 'copy') {
          try {
            await navigator.clipboard.writeText(plainTextCard());
            button.textContent = 'Скопировано';
          } catch (_error) {
            button.textContent = 'Не удалось скопировать';
          }
        }
        if (button.dataset.export === 'txt') {
          const blob = new Blob([plainTextCard()], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `clinical-navigator-${state.moduleId || 'differential'}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        }
        if (button.dataset.export === 'print') window.print();
      });
    });
  }

  function generateCard() {
    if (!state.caseText) {
      assistant('<p>Сначала опишите клинический случай.</p>', askCaseDescription);
      return;
    }
    clearSuggestions();
    addUserText('Сформировать итоговую карточку');
    assistant(cardHtml(), (bubble) => {
      state.cardGenerated = true;
      updateContext();
      wireExportActions(bubble);
    });
  }

  function wireMessageActions(container) {
    container.querySelectorAll('[data-chat-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.chatAction;
        if (action === 'card') generateCard();
        if (action === 'continue') {
          addUserText('Продолжить разбор');
          askStep();
        }
        if (action === 'missing') {
          const missing = interpret().missing;
          assistant(`<p>Для более определённого вывода полезно уточнить:</p>${listHtml(missing, 'Ключевые поля текущего алгоритма заполнены.')}`);
        }
      });
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addUserText(text);

    const normalized = normalize(text);
    if (normalized.includes('сформир') && normalized.includes('карточ')) return generateCard();
    if (normalized.includes('новый случай')) return startConversation();

    if (!state.accepted) {
      assistant('<p>Перед началом подтвердите ограничения.</p>');
      return;
    }

    if (state.stage === 'intake') {
      state.caseText = text;
      state.candidates = scoreCandidates(text);
      updateContext();
      askGlobalTriage();
      return;
    }

    if (state.stage === 'intake_more') {
      state.caseText = `${state.caseText}\n${text}`;
      state.candidates = scoreCandidates(state.caseText, state.globalSignals);
      presentDeduction();
      return;
    }

    state.notes.push(text);
    updateContext();
    assistant('<p>Добавил сведения в описание случая. Продолжите текущий вопрос или сформируйте карточку.</p>');
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  newCaseButton.addEventListener('click', startConversation);
  cardButton.addEventListener('click', generateCard);
  startConversation();
}());
