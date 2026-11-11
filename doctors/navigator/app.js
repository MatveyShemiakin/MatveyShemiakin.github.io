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

  const initialState = () => ({
    stage: 'consent',
    accepted: false,
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

  function currentModule() {
    return modules[state.moduleId] || null;
  }

  function scrollToEnd() {
    requestAnimationFrame(() => stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' }));
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
    scrollToEnd();
    return bubble;
  }

  function addUserText(text) {
    addMessage('user', `<p>${escapeHtml(text).replaceAll('\n', '<br>')}</p>`);
  }

  function showTyping(callback) {
    const node = typingTemplate.content.firstElementChild.cloneNode(true);
    stream.appendChild(node);
    scrollToEnd();
    window.setTimeout(() => {
      node.remove();
      callback();
    }, 260);
  }

  function assistant(html, after) {
    showTyping(() => {
      const bubble = addMessage('assistant', html);
      if (after) after(bubble);
    });
  }

  function clearSuggestions() {
    suggestions.replaceChildren();
    selected = new Set();
  }

  function setSuggestions(items, mode = 'single', submitLabel = 'Продолжить') {
    clearSuggestions();
    suggestions.dataset.mode = mode;
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
          const none = suggestions.querySelector('[data-value="none"]');
          if (none) none.classList.remove('selected');
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

  function moduleOptions() {
    return Object.values(modules).map((module) => ({ value: module.id, label: module.title }));
  }

  function routeModule(text) {
    const normalized = text.toLowerCase().replaceAll('ё', 'е');
    let best = null;
    let score = 0;
    Object.values(modules).forEach((module) => {
      const hits = module.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase().replaceAll('ё', 'е'))).length;
      if (hits > score) {
        score = hits;
        best = module;
      }
    });
    return best;
  }

  function startConversation() {
    stream.replaceChildren();
    clearSuggestions();
    state = initialState();
    updateContext();
    assistant(`
      <p class="message-eyebrow">Офтальмологический клинический навигатор</p>
      <h2>Здравствуйте. Опишите патологию или клиническую ситуацию.</h2>
      <p>Я выберу подходящий клинический сценарий, сначала проверю срочность, затем задам уточняющие вопросы и по вашему запросу сформирую карточку.</p>
      <div class="message-alert"><strong>Важно:</strong> не вводите ФИО, дату рождения, номер истории болезни и другие идентификаторы пациента. Текущая версия не формирует лекарственные назначения.</div>
      <p>Подтверждаете, что понимаете ограничения?</p>
    `, () => setSuggestions([
      { value: 'accept', label: 'Да, понимаю ограничения' },
      { value: 'details', label: 'Показать ограничения подробнее' }
    ]));
  }

  function askModule() {
    state.stage = 'module';
    updateContext();
    assistant(`
      <p>Введите патологию свободным текстом или выберите клинический модуль.</p>
      <p class="message-note">Доступно ${Object.keys(modules).length} рабочих сценариев. Выбор можно изменить, начав новый случай.</p>
    `, () => setSuggestions(moduleOptions()));
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
    assistant(`
      <p class="message-eyebrow">Выбран клинический модуль</p>
      <h2>${escapeHtml(module.title)}</h2>
      <p>${escapeHtml(module.description)}</p>
      <p>Сначала проверим признаки, которые могут изменить срочность и маршрут.</p>
    `, askRedFlags);
  }

  function askRedFlags() {
    const module = currentModule();
    if (!module) return askModule();
    state.stage = 'redFlags';
    setSuggestions(module.redFlags.map(([value, label]) => ({ value, label })), 'multi', 'Подтвердить');
  }

  function askStep() {
    const module = currentModule();
    if (!module) return askModule();
    const step = module.steps[state.stepIndex];
    if (!step) {
      state.stage = 'ready';
      state.conversationComplete = true;
      updateContext();
      assistant(`
        <p class="message-eyebrow">Сбор данных завершён</p>
        <h2>Предварительный разбор готов.</h2>
        <p>Можно добавить сведения свободным текстом, задать дополнительный вопрос или сформировать итоговую карточку.</p>
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
        assistant('<p>Навигатор не ставит окончательный диагноз, не назначает препараты и не заменяет очный осмотр. Все данные должны быть обезличены. При выявлении настораживающих признаков система изменяет срочность и не выдаёт плановые рекомендации.</p><p>Продолжить?</p>', () => setSuggestions([{ value: 'accept', label: 'Да, продолжить' }]));
        return;
      }
      state.accepted = true;
      askModule();
      return;
    }

    if (state.stage === 'module') {
      selectModule(values[0]);
      return;
    }

    if (state.stage === 'redFlags') {
      state.redFlags = values;
      state.urgentRoute = values.some((value) => value !== 'none');
      updateContext();
      if (state.urgentRoute) {
        assistant(`
          <p class="message-eyebrow critical-text">Изменена срочность</p>
          <h2>Выявлены признаки, требующие приоритетной очной оценки.</h2>
          <div class="message-alert critical"><strong>Не откладывайте необходимый маршрут ради заполнения навигатора.</strong><br>Можно сразу сформировать карточку безопасности или продолжить структурирование случая.</div>
          <div class="message-actions">
            <button type="button" data-chat-action="continue">Продолжить структурирование</button>
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
    return {
      urgency: state.urgentRoute ? 'Приоритетная очная оценка' : 'Плановая оценка',
      conclusion: 'Недостаточно данных для предварительного вывода',
      direction: 'Не определено',
      findings: [],
      mechanisms: [],
      alternatives: [],
      nextSteps: [],
      missing: [],
      signals: []
    };
  }

  function interpretDryEye() {
    const r = resultBase();
    const osdi = value('tests', 'osdi6');
    const nibt = numeric('tests', 'nibt');
    const homeostasis = (nibt !== null && nibt < 10) || value('tests', 'osmolarity') === 'abnormal' || value('tests', 'staining') === 'abnormal';
    const schirmer = numeric('tests', 'schirmer');

    if (osdi === 'positive' && homeostasis) r.conclusion = 'Есть сочетание симптомов и объективных признаков, поддерживающее ССГ';
    else if (osdi === 'negative') r.conclusion = 'Симптоматический скрининг не поддерживает ССГ; необходим поиск другой причины жалоб';
    else if (osdi === 'positive') r.conclusion = 'Симптомы присутствуют, но объективное подтверждение нарушения гомеостаза пока недостаточно';

    const scores = [
      ['Испарительный компонент', (value('lids', 'mgd') === 'yes' ? 60 : 0) + (value('lids', 'blink') === 'incomplete' ? 20 : 0) + (has('symptoms', 'evening') ? 10 : 0)],
      ['Вододефицитный компонент', (schirmer !== null && schirmer <= 5 ? 70 : schirmer !== null && schirmer <= 10 ? 35 : 0) + (has('factors', 'autoimmune') ? 20 : 0)],
      ['Экспозиционный компонент', (value('lids', 'lagophthalmos') === 'yes' ? 75 : 0) + (value('lids', 'blink') === 'incomplete' ? 15 : 0)],
      ['Ятрогенный компонент', (has('factors', 'glaucoma_drops') ? 45 : 0) + (has('factors', 'recent_surgery') ? 35 : 0) + (has('factors', 'systemic_drugs') ? 20 : 0)],
      ['Нейросенсорный компонент', (has('symptoms', 'discordant_pain') ? 70 : 0) + (has('alternatives', 'neuropathic') ? 30 : 0)]
    ].map(([label, score]) => [label, Math.min(100, score)]);

    r.signals = scores;
    const leader = [...scores].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader && leader[1] > 0 ? leader[0] : 'Преобладающий механизм не определён';
    r.mechanisms = scores.filter(([, score]) => score >= 30).map(([label]) => label);
    if (has('symptoms', 'itching') || has('alternatives', 'allergy')) r.alternatives.push('Аллергическое заболевание глазной поверхности');
    if (has('alternatives', 'erosion')) r.alternatives.push('Рецидивирующая эрозия роговицы');
    if (has('alternatives', 'neurotrophic')) r.alternatives.push('Нейротрофическая кератопатия');
    if (!osdi) r.missing.push('Валидированный симптоматический опросник');
    if (!homeostasis) r.missing.push('Объективный маркер нарушения гомеостаза глазной поверхности');
    if (!value('lids', 'mgd')) r.missing.push('Оценка края век и мейбомиевых желёз');
    r.nextSteps.push('Сопоставить симптомы с NIBUT, окрашиванием и/или осмолярностью');
    r.nextSteps.push('Определить ведущий механизм: МГД, вододефицит, экспозиция, ятрогенный или нейросенсорный компонент');
    return r;
  }

  function interpretRedEye() {
    const r = resultBase();
    const iop = value('exam', 'iop');
    const va = value('exam', 'va');
    const fluorescein = value('exam', 'fluorescein');
    const ac = value('exam', 'anterior_chamber');
    const discharge = value('history', 'discharge');
    const contactLens = value('history', 'contact_lens') === 'yes';

    const angleScore = (iop === 'high' ? 50 : 0) + (has('symptoms', 'halos') ? 25 : 0) + (value('exam', 'pupil') === 'mid_dilated' ? 25 : 0);
    const keratitisScore = (fluorescein === 'positive' ? 45 : 0) + (contactLens ? 20 : 0) + (has('symptoms', 'photophobia') ? 15 : 0) + (state.redFlags.includes('corneal_lesion') ? 30 : 0);
    const uveitisScore = (ac === 'cells' || ac === 'hypopyon' ? 55 : 0) + (has('symptoms', 'photophobia') ? 20 : 0) + (has('symptoms', 'ciliary_flush') ? 15 : 0) + (value('exam', 'pupil') === 'miotic' ? 15 : 0);
    const conjunctivitisScore = (has('symptoms', 'itch') ? 35 : 0) + (['watery', 'mucous', 'purulent'].includes(discharge) ? 30 : 0) + (va === 'normal' ? 20 : 0);

    r.signals = [
      ['Кератит / поражение роговицы', Math.min(100, keratitisScore)],
      ['Передний увеит', Math.min(100, uveitisScore)],
      ['Острое закрытие угла', Math.min(100, angleScore)],
      ['Конъюнктивит / аллергия', Math.min(100, conjunctivitisScore)],
      ['Орбитальная патология', state.redFlags.includes('proptosis') ? 90 : 0]
    ];
    const leader = [...r.signals].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader?.[1] > 0 ? leader[0] : 'Основное направление не определено';
    r.conclusion = r.direction === 'Конъюнктивит / аллергия' && !state.urgentRoute ? 'Картина больше соответствует поверхностному воспалению без явных угрожающих признаков' : `В первую очередь необходимо исключить: ${r.direction}`;
    r.alternatives = r.signals.filter(([, score]) => score >= 30).map(([label]) => label);
    r.nextSteps = ['Оценить остроту зрения каждого глаза', 'Провести биомикроскопию с флюоресцеином', 'Измерить ВГД и оценить зрачок и переднюю камеру'];
    if (!va) r.missing.push('Острота зрения');
    if (!iop) r.missing.push('ВГД');
    if (!fluorescein) r.missing.push('Флюоресцеиновая проба');
    if (va === 'reduced' || iop === 'high' || ac === 'hypopyon' || fluorescein === 'positive') r.urgency = 'Осмотр в день обращения';
    return r;
  }

  function interpretKeratitis() {
    const r = resultBase();
    const size = numeric('lesion', 'size');
    const location = value('lesion', 'location');
    const hypopyon = value('lesion', 'hypopyon') === 'yes';
    const thinning = value('lesion', 'thinning') === 'yes';
    const rapid = value('lesion', 'progression') === 'rapid';

    const bacterial = (has('risk', 'contact_lens') ? 35 : 0) + (has('risk', 'surgery') ? 20 : 0) + (hypopyon ? 25 : 0);
    const fungal = (has('risk', 'trauma_organic') ? 50 : 0) + (has('clues', 'satellites') ? 35 : 0);
    const acanthamoeba = (has('risk', 'water_exposure') ? 40 : 0) + (has('risk', 'contact_lens') ? 20 : 0) + (has('clues', 'ring') ? 35 : 0) + (has('clues', 'pain_out') ? 20 : 0);
    const herpetic = (has('risk', 'herpes_history') ? 35 : 0) + (has('clues', 'dendrite') ? 55 : 0) + (has('clues', 'reduced_sensation') ? 20 : 0);
    const sterile = value('lesion', 'epithelial_defect') === 'no' ? 40 : 0;

    r.signals = [
      ['Бактериальная этиология', Math.min(100, bacterial)],
      ['Грибковая этиология', Math.min(100, fungal)],
      ['Acanthamoeba', Math.min(100, acanthamoeba)],
      ['Герпетическая этиология', Math.min(100, herpetic)],
      ['Стерильный инфильтрат', Math.min(100, sterile)]
    ];
    const leader = [...r.signals].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader?.[1] > 0 ? leader[0] : 'Этиология не определена';
    r.conclusion = 'Кератит требует очной оценки и динамического контроля; этиология определяется по совокупности факторов риска и морфологии';
    r.urgency = thinning || rapid || hypopyon || location === 'central' || (size !== null && size > 2) ? 'Неотложная специализированная оценка' : 'Осмотр в день обращения';
    r.mechanisms = r.signals.filter(([, score]) => score >= 35).map(([label]) => label);
    r.nextSteps = ['Документировать размер, глубину и локализацию инфильтрата', 'Оценить чувствительность роговицы и состояние передней камеры'];
    if (location === 'central' || (size !== null && size > 2) || hypopyon || rapid || thinning) r.nextSteps.push('Рассмотреть соскоб, микроскопию и посев до изменения антимикробной терапии');
    if (has('clues', 'ring') || has('clues', 'pain_out')) r.nextSteps.push('Рассмотреть конфокальную микроскопию и целевую диагностику Acanthamoeba');
    if (has('clues', 'dendrite')) r.nextSteps.push('Проверить чувствительность роговицы и герпетический фенотип');
    if (size === null) r.missing.push('Размер инфильтрата');
    if (!location) r.missing.push('Локализация инфильтрата');
    if (!value('lesion', 'thinning')) r.missing.push('Оценка истончения роговицы');
    return r;
  }

  function interpretPvd() {
    const r = resultBase();
    const field = value('symptoms', 'field_defect');
    const floaters = value('symptoms', 'floaters');
    const flashes = value('symptoms', 'flashes');
    const examComplete = value('exam', 'fundus_complete');
    const tear = value('exam', 'tear');
    const detachment = value('exam', 'detachment');
    const vh = value('exam', 'vh');
    const shafer = value('exam', 'shafer');

    const rd = (field === 'yes' ? 55 : 0) + (detachment === 'yes' ? 50 : 0);
    const tearScore = (tear === 'yes' ? 70 : 0) + (shafer === 'positive' ? 25 : 0) + (vh === 'yes' ? 25 : 0);
    const pvd = ((floaters === 'many' || flashes === 'yes') ? 45 : 0) + (value('symptoms', 'onset') !== 'chronic' ? 20 : 0);

    r.signals = [
      ['Отслойка сетчатки', Math.min(100, rd)],
      ['Разрыв сетчатки', Math.min(100, tearScore)],
      ['Острая задняя отслойка стекловидного тела', Math.min(100, pvd)],
      ['Гемофтальм', vh === 'yes' ? 80 : 0],
      ['Неофтальмологическая фотопсия', 0]
    ];
    const leader = [...r.signals].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader?.[1] > 0 ? leader[0] : 'Причина симптомов не определена';
    if (detachment === 'yes' || field === 'yes') {
      r.conclusion = 'Есть признаки, совместимые с отслойкой сетчатки';
      r.urgency = 'Неотложная витреоретинальная оценка';
    } else if (tear === 'yes' || shafer === 'positive' || vh === 'yes') {
      r.conclusion = 'Высокая настороженность в отношении разрыва сетчатки';
      r.urgency = 'Осмотр ретинального специалиста в день обращения';
    } else if ((floaters === 'many' || flashes === 'yes') && examComplete === 'complete') {
      r.conclusion = 'Возможна острая ЗОСТ без выявленного разрыва; требуется наблюдение и инструкции по повторному обращению';
      r.urgency = 'Срочный первичный осмотр выполнен; необходим контроль';
    } else {
      r.conclusion = 'Новый разрыв сетчатки нельзя исключить без полного осмотра периферии';
      r.urgency = 'Расширенный осмотр в день обращения или в ближайшие 24 часа';
    }
    r.nextSteps = ['Осмотр глазного дна с мидриазом и оценкой периферии, при возможности со склеральной депрессией'];
    if (examComplete === 'limited') r.nextSteps.push('Выполнить УЗИ B-скан при непрозрачных средах; помнить, что нормальное УЗИ не исключает небольшой разрыв');
    r.nextSteps.push('Дать чёткие инструкции о повторном срочном обращении при усилении фотопсий, новых мушках или дефекте поля');
    if (!examComplete) r.missing.push('Полный осмотр периферии сетчатки');
    if (!tear) r.missing.push('Оценка наличия разрыва');
    return r;
  }

  function interpretGlaucoma() {
    const r = resultBase();
    const iopOd = numeric('iop', 'iop_od');
    const iopOs = numeric('iop', 'iop_os');
    const highIop = [iopOd, iopOs].some((value) => value !== null && value > 21);
    const angle = value('structure', 'angle');
    const disc = value('structure', 'disc');
    const rnfl = value('structure', 'rnfl');
    const field = value('function', 'field');
    const progression = value('structure', 'progression') === 'yes' || value('function', 'field_progression') === 'yes';

    const glaucomaScore = (disc === 'glaucomatous' ? 40 : disc === 'suspicious' ? 20 : 0) + (rnfl === 'abnormal' ? 35 : rnfl === 'borderline' ? 15 : 0) + (field === 'glaucomatous' ? 40 : field === 'suspicious' ? 15 : 0) + (progression ? 30 : 0);
    const ohtScore = (highIop ? 55 : 0) + (disc === 'normal' && rnfl === 'normal' && field === 'normal' ? 25 : 0);
    const angleRisk = angle === 'closed' ? 90 : angle === 'narrow' ? 55 : 0;

    r.signals = [
      ['Глаукомная оптическая нейропатия', Math.min(100, glaucomaScore)],
      ['Офтальмогипертензия', Math.min(100, ohtScore)],
      ['Риск закрытия угла', angleRisk],
      ['Вторичная глаукома', has('risk', 'pseudoexfoliation') || has('risk', 'pigment') || has('risk', 'steroid') ? 50 : 0],
      ['Неопределённый глаукомный статус', 20]
    ];

    if (state.urgentRoute || angle === 'closed') {
      r.conclusion = 'Необходимо исключить острое закрытие угла или симптомное повышение ВГД';
      r.urgency = 'Неотложная оценка';
    } else if (glaucomaScore >= 70) {
      r.conclusion = 'Совокупность структурных и функциональных данных поддерживает глаукому';
      r.urgency = progression ? 'Ускоренная оценка прогрессирования и целевого ВГД' : 'Плановая специализированная оценка';
    } else if (highIop && glaucomaScore < 40) {
      r.conclusion = 'Картина может соответствовать офтальмогипертензии или подозрению на глаукому';
    } else if (glaucomaScore >= 30) {
      r.conclusion = 'Есть подозрительные структурные или функциональные признаки; требуется подтверждение воспроизводимости и согласованности';
    }

    const leader = [...r.signals].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader?.[1] > 0 ? leader[0] : 'Статус не определён';
    r.nextSteps = ['Подтвердить ВГД валидированным методом и учитывать центральную толщину роговицы', 'Выполнить гониоскопию', 'Сопоставить диск, ОКТ RNFL/GCC и воспроизводимое поле зрения', 'Оценивать прогрессию по серийным исследованиям'];
    if (iopOd === null && iopOs === null) r.missing.push('ВГД обоих глаз');
    if (!angle) r.missing.push('Гониоскопия');
    if (!rnfl) r.missing.push('ОКТ RNFL/GCC');
    if (!field) r.missing.push('Стандартная автоматическая периметрия');
    return r;
  }

  function interpretUveitis() {
    const r = resultBase();
    const laterality = value('phenotype', 'laterality');
    const course = value('phenotype', 'course');
    const granulomatous = value('phenotype', 'granulomatous');
    const iop = value('phenotype', 'iop');

    const herpetic = (laterality === 'unilateral' ? 15 : 0) + (course === 'recurrent' ? 15 : 0) + (iop === 'high' ? 25 : 0) + (has('ocular_clues', 'sector_iris') ? 30 : 0) + (has('ocular_clues', 'reduced_sensation') ? 20 : 0) + (has('ocular_clues', 'keratitis') ? 20 : 0);
    const hla = (laterality === 'unilateral' ? 15 : 0) + (course === 'recurrent' ? 20 : 0) + (has('systemic', 'back_pain') ? 35 : 0) + (has('systemic', 'psoriasis') ? 20 : 0) + (has('systemic', 'bowel') ? 20 : 0);
    const granulomatousSystemic = (granulomatous === 'gran' ? 40 : 0) + (laterality === 'bilateral' ? 15 : 0) + (has('systemic', 'respiratory') ? 30 : 0) + (has('ocular_clues', 'nodules') ? 20 : 0);
    const infection = has('systemic', 'infection_risk') ? 65 : 0;

    r.signals = [
      ['Герпесвирусная этиология', Math.min(100, herpetic)],
      ['HLA-B27-ассоциированный процесс', Math.min(100, hla)],
      ['Гранулематозное системное заболевание', Math.min(100, granulomatousSystemic)],
      ['Инфекционная причина', infection],
      ['Идиопатический передний увеит', 30]
    ];
    const leader = [...r.signals].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader?.[1] > 0 ? leader[0] : 'Этиологическое направление не определено';
    r.conclusion = `Фенотип требует целевого исключения: ${r.direction}`;
    if (state.urgentRoute) r.urgency = 'Приоритетная специализированная оценка';
    r.mechanisms = r.signals.filter(([, score]) => score >= 40).map(([label]) => label);
    r.nextSteps = ['Подтвердить локализацию воспаления и исключить поражение заднего отрезка', 'Оценить ВГД, синехии, роговичную чувствительность и макулу', 'Назначать лабораторные исследования по клиническому фенотипу, а не универсальной панели'];
    if (!laterality) r.missing.push('Латеральность');
    if (!granulomatous) r.missing.push('Характер преципитатов');
    if (!iop) r.missing.push('ВГД');
    return r;
  }

  function interpretPostCataract() {
    const r = resultBase();
    const timing = value('timing');
    const cornea = value('exam', 'cornea');
    const ac = value('exam', 'ac');
    const iop = value('exam', 'iop');
    const iol = value('exam', 'iol');
    const fundus = value('exam', 'fundus');

    let earlyInfection = 0;
    if (timing === 'days') earlyInfection += 20;
    if (has('symptoms', 'pain')) earlyInfection += 25;
    if (has('symptoms', 'redness')) earlyInfection += 20;
    if (ac === 'hypopyon') earlyInfection += 45;

    const pressureEdema = (timing === 'hours' ? 25 : 0) + (iop === 'high' ? 45 : 0) + (cornea === 'edema' || cornea === 'folds' ? 30 : 0) + (has('symptoms', 'halos') ? 15 : 0);
    const cme = (timing === 'weeks' ? 35 : 0) + (fundus === 'cme' ? 55 : 0) + (has('symptoms', 'distortion') ? 20 : 0);
    const iolIssue = (iol === 'decentered' ? 60 : iol === 'dislocated' ? 90 : 0) + (has('symptoms', 'monocular_diplopia') ? 20 : 0);
    const retinal = (fundus === 'rd' ? 90 : 0) + (has('symptoms', 'floaters') ? 25 : 0);

    r.signals = [
      ['Эндофтальмит / инфекционное воспаление', Math.min(100, earlyInfection)],
      ['Отёк роговицы или повышение ВГД', Math.min(100, pressureEdema)],
      ['Кистозный макулярный отёк', Math.min(100, cme)],
      ['Нарушение положения ИОЛ', Math.min(100, iolIssue)],
      ['Разрыв или отслойка сетчатки', Math.min(100, retinal)]
    ];
    const leader = [...r.signals].sort((a, b) => b[1] - a[1])[0];
    r.direction = leader?.[1] > 0 ? leader[0] : 'Причина снижения зрения не определена';
    r.conclusion = `Наиболее значимое направление для исключения: ${r.direction}`;
    if (earlyInfection >= 50 || retinal >= 70 || value('exam', 'wound') === 'leak' || ac === 'hypopyon') r.urgency = 'Неотложная оценка в день обращения';
    else if (pressureEdema >= 50) r.urgency = 'Ускоренная оценка в день обращения';
    r.nextSteps = ['Проверить некорригированную и максимальную корригированную остроту зрения', 'Оценить рану, роговицу, переднюю камеру, ВГД и положение ИОЛ', 'Выполнить осмотр заднего отрезка; при необходимости ОКТ макулы или УЗИ B-скан'];
    if (!timing) r.missing.push('Срок появления ухудшения после операции');
    if (!cornea) r.missing.push('Состояние роговицы');
    if (!ac) r.missing.push('Реакция передней камеры');
    if (!fundus) r.missing.push('Состояние макулы и периферии сетчатки');
    return r;
  }

  function interpret() {
    const handlers = {
      dry_eye: interpretDryEye,
      red_eye: interpretRedEye,
      keratitis: interpretKeratitis,
      pvd_retina: interpretPvd,
      glaucoma: interpretGlaucoma,
      uveitis: interpretUveitis,
      post_cataract: interpretPostCataract
    };
    const result = handlers[state.moduleId]?.() || resultBase();
    result.findings = summarizeAnswers();
    return result;
  }

  function labelForOption(step, value) {
    return step?.options?.find(([id]) => id === value)?.[1] || value;
  }

  function labelForField(field, value) {
    if (!value) return 'не указано';
    const options = field[3];
    if (Array.isArray(options)) return options.find(([id]) => id === value)?.[1] || value;
    return value;
  }

  function summarizeAnswers() {
    const module = currentModule();
    if (!module) return [];
    const lines = [];
    module.steps.forEach((step) => {
      const answer = state.answers[step.id];
      if (answer === undefined) return;
      if (Array.isArray(answer)) {
        lines.push(`${step.prompt} ${answer.map((value) => labelForOption(step, value)).join('; ')}`);
      } else if (answer && typeof answer === 'object') {
        const values = step.fields.map((field) => `${field[2]}: ${labelForField(field, answer[field[0]])}`).join('; ');
        lines.push(values);
      } else {
        lines.push(`${step.prompt} ${labelForOption(step, answer)}`);
      }
    });
    return lines;
  }

  function completeness() {
    const module = currentModule();
    if (!module) return state.accepted ? 10 : 0;
    const completedSteps = module.steps.filter((step) => state.answers[step.id] !== undefined).length;
    const total = module.steps.length + 2;
    return Math.round(((1 + (state.redFlags.length ? 1 : 0) + completedSteps) / total) * 100);
  }

  function updateContext() {
    const module = currentModule();
    const percent = completeness();
    const result = module ? interpret() : resultBase();
    if (moduleTitle) moduleTitle.textContent = module?.shortTitle || 'Выберите модуль';
    summary.completeness.textContent = `${percent}%`;
    summary.progress.style.width = `${percent}%`;
    summary.urgency.textContent = module ? result.urgency : 'Не оценена';
    summary.conclusion.textContent = module ? result.conclusion : 'Не оценён';
    summary.direction.textContent = module ? result.direction : 'Не определено';
    summary.status.textContent = state.cardGenerated ? 'Карточка сформирована' : state.conversationComplete ? 'Разбор завершён' : module ? 'Сбор данных' : state.accepted ? 'Выбор модуля' : 'Диалог не начат';
    summary.card.textContent = state.cardGenerated ? 'Сформирована' : 'По запросу врача';

    const signals = module ? result.signals : [];
    insightRows.forEach((row, index) => {
      const signal = signals[index];
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
          <div><span>Офтальмологический клинический навигатор</span><h2>${escapeHtml(module?.title || 'Клинический случай')}</h2></div>
          <strong>v0.5</strong>
        </header>
        <section class="card-summary-grid">
          <div><span>Срочность</span><strong>${escapeHtml(result.urgency)}</strong></div>
          <div><span>Предварительный вывод</span><strong>${escapeHtml(result.conclusion)}</strong></div>
          <div><span>Основное направление</span><strong>${escapeHtml(result.direction)}</strong></div>
          <div><span>Полнота данных</span><strong>${completeness()}%</strong></div>
        </section>
        ${redFlagLabels().length ? `<section class="card-section critical-card"><h3>Настораживающие признаки</h3>${listHtml(redFlagLabels())}</section>` : ''}
        <section class="card-section"><h3>Введённые клинические данные</h3>${listHtml(result.findings, 'Структурированные данные не введены.')}</section>
        <section class="card-section"><h3>Возможные механизмы или причины</h3>${listHtml(result.mechanisms, result.direction)}</section>
        <section class="card-section"><h3>Важные альтернативы</h3>${listHtml(result.alternatives)}</section>
        <section class="card-section"><h3>Что целесообразно уточнить или выполнить</h3>${listHtml(result.nextSteps)}</section>
        <section class="card-section"><h3>Недостающие данные</h3>${listHtml(result.missing, 'Ключевые поля текущего алгоритма заполнены.')}</section>
        ${state.notes.length ? `<section class="card-section"><h3>Дополнительное описание врача</h3>${listHtml(state.notes)}</section>` : ''}
        <footer><strong>Лекарственная схема не сформирована.</strong> Результат является структурированным профессиональным справочным выводом и требует клинической оценки врача.</footer>
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
      `ОФТАЛЬМОЛОГИЧЕСКИЙ КЛИНИЧЕСКИЙ НАВИГАТОР — ${module?.title || 'КЛИНИЧЕСКИЙ СЛУЧАЙ'} — v0.5`,
      '',
      `Срочность: ${result.urgency}`,
      `Предварительный вывод: ${result.conclusion}`,
      `Основное направление: ${result.direction}`,
      `Полнота данных: ${completeness()}%`,
      '',
      ...section('Настораживающие признаки', redFlagLabels()),
      ...section('Введённые данные', result.findings),
      ...section('Возможные причины', result.mechanisms, result.direction),
      ...section('Важные альтернативы', result.alternatives),
      ...section('Следующие действия', result.nextSteps),
      ...section('Недостающие данные', result.missing, 'ключевые поля заполнены'),
      ...section('Дополнительные заметки', state.notes),
      'Лекарственная схема не сформирована.'
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
          link.download = `clinical-navigator-${state.moduleId || 'case'}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        }
        if (button.dataset.export === 'print') window.print();
      });
    });
  }

  function generateCard() {
    if (!currentModule()) {
      assistant('<p>Сначала выберите клинический модуль.</p>', askModule);
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
          addUserText('Продолжить структурирование случая');
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

    const normalized = text.toLowerCase();
    if (normalized.includes('сформир') && normalized.includes('карточ')) return generateCard();
    if (normalized.includes('новый случай')) return startConversation();

    if (state.stage === 'module') {
      const module = routeModule(text);
      if (module) {
        assistant(`<p>По описанию подходит модуль <strong>${escapeHtml(module.title)}</strong>.</p>`, () => selectModule(module.id));
      } else {
        assistant('<p>Не удалось однозначно выбрать модуль. Выберите один из доступных сценариев.</p>', () => setSuggestions(moduleOptions()));
      }
      return;
    }

    if (!state.accepted) {
      assistant('<p>Перед началом подтвердите ограничения прототипа.</p>');
      return;
    }

    state.notes.push(text);
    updateContext();
    assistant('<p>Добавил это описание в карточку случая. Продолжите текущий структурированный вопрос или напишите «сформировать карточку».</p>');
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
