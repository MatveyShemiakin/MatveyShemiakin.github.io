(function () {
  'use strict';

  const stream = document.getElementById('chat-stream');
  const suggestions = document.getElementById('chat-suggestions');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const newCaseButton = document.getElementById('new-case-button');
  const cardButton = document.getElementById('card-button');
  const typingTemplate = document.getElementById('typing-template');

  const summary = {
    completeness: document.getElementById('summary-completeness'),
    urgency: document.getElementById('summary-urgency'),
    diagnosis: document.getElementById('summary-diagnosis'),
    driver: document.getElementById('summary-driver'),
    card: document.getElementById('summary-card'),
    status: document.getElementById('case-status'),
    progress: document.getElementById('context-progress-bar')
  };

  const driverElements = {
    lipid: document.getElementById('driver-lipid'),
    aqueous: document.getElementById('driver-aqueous'),
    exposure: document.getElementById('driver-exposure'),
    iatrogenic: document.getElementById('driver-iatrogenic'),
    neurosensory: document.getElementById('driver-neurosensory')
  };

  const labels = {
    goal: {
      framework: 'Проверить диагностическую рамку',
      drivers: 'Определить ведущие этиологические драйверы',
      refractory: 'Разобрать отсутствие эффекта от терапии',
      preop: 'Оценить глазную поверхность перед операцией'
    },
    redFlags: {
      vision_loss: 'значимое или быстрое снижение зрения',
      severe_pain: 'выраженная боль или светобоязнь',
      corneal_lesion: 'инфильтрат, дефект эпителия или выраженное поражение роговицы',
      acute_unilateral: 'острый односторонний красный глаз',
      contact_lens: 'контактные линзы и острое ухудшение',
      trauma_chemical: 'травма или химическое воздействие',
      postop_acute: 'острое ухудшение после операции или инъекции',
      none: 'красные флаги не выявлены'
    },
    symptoms: {
      dryness: 'сухость, жжение или ощущение инородного тела',
      fluctuation: 'флюктуация зрения с улучшением после моргания',
      tearing: 'рефлекторное слезотечение',
      morning: 'преобладание симптомов утром',
      evening: 'нарастание симптомов к вечеру',
      screen: 'усиление при работе с экраном или чтении',
      itching: 'зуд как ведущая жалоба',
      discordant_pain: 'боль сильнее объективных признаков'
    },
    risks: {
      glaucoma_drops: 'длительная местная гипотензивная терапия',
      recent_surgery: 'недавняя офтальмологическая операция',
      autoimmune: 'аутоиммунное заболевание или сухость слизистых',
      systemic_drugs: 'системные препараты, способные усиливать сухость',
      contact_lens_chronic: 'регулярное ношение контактных линз',
      environment: 'экранная нагрузка, сухой воздух или климатический фактор',
      none: 'значимые факторы не указаны'
    },
    masquerades: {
      allergy: 'аллергическое заболевание глазной поверхности',
      recurrent_erosion: 'рецидивирующая эрозия роговицы',
      neuropathic: 'нейропатическая глазная боль',
      exposure: 'экспозиционная кератопатия',
      conjunctivochalasis: 'конъюнктивохалазис',
      demodex: 'Demodex-ассоциированный блефарит',
      neurotrophic: 'нейротрофическая кератопатия',
      none: 'явные заболевания-маски не отмечены'
    }
  };

  const initialState = () => ({
    stage: 'consent',
    accepted: false,
    goal: '',
    redFlags: [],
    symptoms: [],
    laterality: '',
    onset: '',
    severity: '',
    osdi6: '',
    nibt: '',
    osmolarity: '',
    staining: '',
    schirmer: '',
    mgd: '',
    blink: '',
    lagophthalmos: '',
    risks: [],
    masquerades: [],
    priorTreatment: '',
    notes: [],
    conversationComplete: false,
    stoppedForSafety: false,
    cardGenerated: false
  });

  let state = initialState();
  let selected = new Set();

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function scrollToEnd() {
    requestAnimationFrame(() => {
      stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
    });
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
    }, 360);
  }

  function setSuggestions(items, mode, submitLabel) {
    suggestions.replaceChildren();
    selected = new Set();
    suggestions.dataset.mode = mode || 'single';
    let done = null;

    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion-chip';
      button.dataset.value = item.value;
      button.textContent = item.label;
      button.addEventListener('click', () => {
        if (suggestions.dataset.mode === 'single') {
          submitStructured([item.value], item.label);
          return;
        }
        if (item.value === 'none') {
          selected.clear();
          suggestions.querySelectorAll('.suggestion-chip').forEach((chip) => chip.classList.remove('selected'));
        } else {
          selected.delete('none');
          const noneChip = suggestions.querySelector('[data-value="none"]');
          if (noneChip) noneChip.classList.remove('selected');
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
      done.textContent = submitLabel || 'Продолжить';
      done.disabled = true;
      done.addEventListener('click', () => {
        const values = Array.from(selected);
        const text = values.map((value) => {
          const found = items.find((item) => item.value === value);
          return found ? found.label : value;
        }).join('; ');
        submitStructured(values, text);
      });
      suggestions.appendChild(done);
    }
  }

  function clearSuggestions() {
    suggestions.replaceChildren();
  }

  function submitStructured(values, displayText) {
    clearSuggestions();
    addUserText(displayText);
    processStage(values);
  }

  function renderInlineForm(fields, submitLabel, onSubmit) {
    clearSuggestions();
    const wrapper = document.createElement('form');
    wrapper.className = 'inline-chat-form';
    wrapper.innerHTML = fields.map((field) => {
      if (field.type === 'select') {
        return `<label><span>${escapeHtml(field.label)}</span><select name="${field.name}" ${field.required ? 'required' : ''}>${field.options.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join('')}</select></label>`;
      }
      if (field.type === 'textarea') {
        return `<label class="wide"><span>${escapeHtml(field.label)}</span><textarea name="${field.name}" rows="3" placeholder="${escapeHtml(field.placeholder || '')}"></textarea></label>`;
      }
      return `<label><span>${escapeHtml(field.label)}</span><input name="${field.name}" type="${field.type || 'text'}" min="${field.min || ''}" max="${field.max || ''}" step="${field.step || ''}" placeholder="${escapeHtml(field.placeholder || '')}" ${field.required ? 'required' : ''}></label>`;
    }).join('') + `<button type="submit">${escapeHtml(submitLabel)}</button>`;
    wrapper.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(wrapper).entries());
      const summaryText = fields.map((field) => `${field.label}: ${data[field.name] || 'не указано'}`).join('; ');
      wrapper.closest('.message-bubble').classList.add('submitted-form');
      wrapper.querySelectorAll('input,select,textarea,button').forEach((element) => { element.disabled = true; });
      addUserText(summaryText);
      onSubmit(data);
    });
    return wrapper;
  }

  function assistant(html, after) {
    showTyping(() => {
      const bubble = addMessage('assistant', html);
      if (after) after(bubble);
    });
  }

  function startConversation() {
    stream.replaceChildren();
    clearSuggestions();
    state = initialState();
    updateContext();
    assistant(`
      <p class="message-eyebrow">Офтальмологический клинический навигатор</p>
      <h2>Здравствуйте. Опишите клиническую ситуацию — я помогу структурировать данные.</h2>
      <p>Сначала проверим угрожающие признаки, затем симптомы, объективные тесты и возможные этиологические драйверы.</p>
      <div class="message-alert"><strong>Важно:</strong> это демонстрационный интерфейс. Не вводите персональные данные и не используйте результат для назначения или изменения лечения.</div>
      <p>Подтверждаете, что понимаете ограничения?</p>
    `, () => setSuggestions([
      { value: 'accept', label: 'Да, понимаю ограничения' },
      { value: 'details', label: 'Показать ограничения подробнее' }
    ], 'single'));
  }

  function askCurrentStage() {
    updateContext();

    if (state.stage === 'goal') {
      assistant('<p>Какую задачу вы хотите решить в этом случае?</p>', () => setSuggestions([
        { value: 'framework', label: labels.goal.framework },
        { value: 'drivers', label: labels.goal.drivers },
        { value: 'refractory', label: labels.goal.refractory },
        { value: 'preop', label: labels.goal.preop }
      ], 'single'));
      return;
    }

    if (state.stage === 'redFlags') {
      assistant('<p>Сначала исключим признаки, при которых плановый алгоритм сухого глаза нужно остановить. Что присутствует?</p><p class="message-note">Можно выбрать несколько вариантов.</p>', () => setSuggestions([
        { value: 'vision_loss', label: 'Быстрое или значимое снижение зрения' },
        { value: 'severe_pain', label: 'Выраженная боль или светобоязнь' },
        { value: 'corneal_lesion', label: 'Инфильтрат / дефект эпителия' },
        { value: 'acute_unilateral', label: 'Острый односторонний красный глаз' },
        { value: 'contact_lens', label: 'Контактные линзы + острое ухудшение' },
        { value: 'trauma_chemical', label: 'Травма или химическое воздействие' },
        { value: 'postop_acute', label: 'Острое ухудшение после операции / инъекции' },
        { value: 'none', label: 'Перечисленных признаков нет' }
      ], 'multi', 'Подтвердить'));
      return;
    }

    if (state.stage === 'symptoms') {
      assistant('<p>Какие жалобы преобладают?</p><p class="message-note">Отметьте все подходящие варианты.</p>', () => setSuggestions([
        { value: 'dryness', label: 'Сухость / жжение / инородное тело' },
        { value: 'fluctuation', label: 'Флюктуация зрения после моргания' },
        { value: 'tearing', label: 'Рефлекторное слезотечение' },
        { value: 'morning', label: 'Хуже утром' },
        { value: 'evening', label: 'Хуже к вечеру' },
        { value: 'screen', label: 'Хуже при экране или чтении' },
        { value: 'itching', label: 'Зуд — ведущая жалоба' },
        { value: 'discordant_pain', label: 'Боль сильнее объективных признаков' }
      ], 'multi', 'Продолжить'));
      return;
    }

    if (state.stage === 'context') {
      assistant('<p>Уточните течение и влияние симптомов.</p>', (bubble) => {
        bubble.appendChild(renderInlineForm([
          { type: 'select', name: 'laterality', label: 'Латеральность', required: true, options: [
            { value: '', label: 'Выберите' }, { value: 'bilateral', label: 'Двусторонний процесс' }, { value: 'unilateral', label: 'Односторонний процесс' }, { value: 'asymmetric', label: 'Двусторонний асимметричный' }
          ] },
          { type: 'select', name: 'onset', label: 'Течение', required: true, options: [
            { value: '', label: 'Выберите' }, { value: 'acute', label: 'Острое' }, { value: 'subacute', label: 'Подострое' }, { value: 'chronic', label: 'Хроническое / рецидивирующее' }
          ] },
          { type: 'select', name: 'severity', label: 'Влияние на активность', required: true, options: [
            { value: '', label: 'Выберите' }, { value: 'mild', label: 'Незначительное' }, { value: 'moderate', label: 'Умеренное' }, { value: 'severe', label: 'Выраженное' }
          ] }
        ], 'Отправить данные', (data) => {
          Object.assign(state, data);
          state.stage = 'diagnostics';
          askCurrentStage();
        }));
      });
      return;
    }

    if (state.stage === 'diagnostics') {
      assistant(`
        <p>Какие объективные данные доступны?</p>
        <p class="message-note">В логике TFOS DEWS III симптоматика должна сопоставляться с маркерами нарушения гомеостаза. Неизвестные показатели можно оставить пустыми.</p>
      `, (bubble) => {
        bubble.appendChild(renderInlineForm([
          { type: 'select', name: 'osdi6', label: 'OSDI-6', options: [
            { value: '', label: 'Не выполнен / неизвестен' }, { value: 'positive', label: 'Положительный, ≥4' }, { value: 'negative', label: 'Отрицательный, <4' }
          ] },
          { type: 'number', name: 'nibt', label: 'NIBUT, сек', min: '0', max: '60', step: '0.1', placeholder: 'например, 7.5' },
          { type: 'select', name: 'osmolarity', label: 'Осмолярность', options: [
            { value: '', label: 'Не оценена' }, { value: 'abnormal', label: 'Аномальная по критериям метода' }, { value: 'normal', label: 'В пределах критериев метода' }
          ] },
          { type: 'select', name: 'staining', label: 'Окрашивание поверхности', options: [
            { value: '', label: 'Не оценено' }, { value: 'abnormal', label: 'Аномальное по валидированной шкале' }, { value: 'normal', label: 'Не достигает порога' }
          ] },
          { type: 'number', name: 'schirmer', label: 'Ширмер, мм / 5 мин', min: '0', max: '50', step: '1', placeholder: 'для оценки водного драйвера' }
        ], 'Отправить показатели', (data) => {
          Object.assign(state, data);
          state.stage = 'lids';
          askCurrentStage();
        }));
      });
      return;
    }

    if (state.stage === 'lids') {
      assistant('<p>Теперь оценим веки, моргание и мейбомиевые железы.</p>', (bubble) => {
        bubble.appendChild(renderInlineForm([
          { type: 'select', name: 'mgd', label: 'Признаки МГД / патологии края век', options: [
            { value: '', label: 'Не оценены' }, { value: 'yes', label: 'Присутствуют' }, { value: 'no', label: 'Не выявлены' }
          ] },
          { type: 'select', name: 'blink', label: 'Моргание', options: [
            { value: '', label: 'Не оценено' }, { value: 'incomplete', label: 'Неполное / редкое' }, { value: 'normal', label: 'Без значимых особенностей' }
          ] },
          { type: 'select', name: 'lagophthalmos', label: 'Смыкание век', options: [
            { value: '', label: 'Не оценено' }, { value: 'yes', label: 'Лагофтальм / экспозиция' }, { value: 'no', label: 'Полное смыкание' }
          ] }
        ], 'Отправить оценку', (data) => {
          Object.assign(state, data);
          state.stage = 'risks';
          askCurrentStage();
        }));
      });
      return;
    }

    if (state.stage === 'risks') {
      assistant('<p>Какие факторы могут поддерживать заболевание?</p>', () => setSuggestions([
        { value: 'glaucoma_drops', label: 'Местная гипотензивная терапия' },
        { value: 'recent_surgery', label: 'Недавняя операция' },
        { value: 'autoimmune', label: 'Аутоиммунный / системный фактор' },
        { value: 'systemic_drugs', label: 'Системные препараты' },
        { value: 'contact_lens_chronic', label: 'Контактные линзы' },
        { value: 'environment', label: 'Экран / сухой воздух / климат' },
        { value: 'none', label: 'Значимые факторы не выявлены' }
      ], 'multi', 'Продолжить'));
      return;
    }

    if (state.stage === 'masquerades') {
      assistant('<p>Есть ли признаки заболеваний-масок или атипичного течения?</p>', () => setSuggestions([
        { value: 'allergy', label: 'Аллергический компонент' },
        { value: 'recurrent_erosion', label: 'Рецидивирующая эрозия' },
        { value: 'neuropathic', label: 'Нейропатическая боль' },
        { value: 'exposure', label: 'Экспозиционная кератопатия' },
        { value: 'conjunctivochalasis', label: 'Конъюнктивохалазис' },
        { value: 'demodex', label: 'Demodex-блефарит' },
        { value: 'neurotrophic', label: 'Нейротрофическая кератопатия' },
        { value: 'none', label: 'Явных заболеваний-масок нет' }
      ], 'multi', 'Продолжить'));
      return;
    }

    if (state.stage === 'ready') {
      state.conversationComplete = true;
      assistant(`
        <p class="message-eyebrow">Сбор данных завершён</p>
        <h2>Предварительная структура случая готова.</h2>
        <p>Можно продолжить диалог, добавить ранее проводившуюся терапию или попросить меня сформировать итоговую карточку.</p>
        <div class="message-actions">
          <button type="button" data-chat-action="card">Сформировать карточку</button>
          <button type="button" data-chat-action="treatment">Добавить сведения о терапии</button>
          <button type="button" data-chat-action="questions">Что ещё необходимо уточнить?</button>
        </div>
      `, (bubble) => wireMessageActions(bubble));
    }
  }

  function processStage(values) {
    if (state.stage === 'consent') {
      if (values[0] === 'details') {
        assistant('<p>Навигатор не ставит окончательный диагноз, не назначает препараты и не заменяет очную оценку. Все данные должны быть обезличены. Лекарственный модуль подключается только после валидации источников и правил безопасности.</p><p>Готовы продолжить?</p>', () => setSuggestions([{ value: 'accept', label: 'Да, продолжить' }], 'single'));
        return;
      }
      state.accepted = true;
      state.stage = 'goal';
      askCurrentStage();
      return;
    }

    if (state.stage === 'goal') {
      state.goal = values[0];
      state.stage = 'redFlags';
      askCurrentStage();
      return;
    }

    if (state.stage === 'redFlags') {
      state.redFlags = values;
      if (values.some((value) => value !== 'none')) {
        state.stoppedForSafety = true;
        state.conversationComplete = true;
        updateContext();
        assistant(`
          <p class="message-eyebrow critical-text">Проверка безопасности</p>
          <h2>Плановая ветвь ССГ / МГД остановлена.</h2>
          <div class="message-alert critical"><strong>Выявлены признаки потенциально другого или угрожающего заболевания.</strong><br>Сначала необходима очная оценка и исключение поражения роговицы, воспалительной, инфекционной, послеоперационной или иной патологии.</div>
          <p>При необходимости я могу сформировать карточку с отмеченными красными флагами и причиной остановки алгоритма.</p>
          <div class="message-actions"><button type="button" data-chat-action="card">Сформировать карточку безопасности</button></div>
        `, (bubble) => wireMessageActions(bubble));
        return;
      }
      state.stage = 'symptoms';
      askCurrentStage();
      return;
    }

    if (state.stage === 'symptoms') {
      state.symptoms = values;
      state.stage = 'context';
      askCurrentStage();
      return;
    }

    if (state.stage === 'risks') {
      state.risks = values;
      state.stage = 'masquerades';
      askCurrentStage();
      return;
    }

    if (state.stage === 'masquerades') {
      state.masquerades = values;
      state.stage = 'ready';
      askCurrentStage();
    }
  }

  function hasHomeostasisMarker() {
    const nibt = state.nibt === '' ? null : Number(state.nibt);
    return (nibt !== null && nibt < 10) || state.osmolarity === 'abnormal' || state.staining === 'abnormal';
  }

  function diagnosticFrame() {
    if (state.stoppedForSafety) return 'Плановая оценка остановлена';
    if (!state.osdi6) return 'Недостаточно данных';
    if (state.osdi6 === 'negative') return 'Симптоматический скрининг отрицательный';
    if (hasHomeostasisMarker()) return 'Рамка потенциально выполнена';
    return 'Нужен маркер нарушения гомеостаза';
  }

  function driverScores() {
    const schirmer = state.schirmer === '' ? null : Number(state.schirmer);
    return {
      lipid: Math.min(100, (state.mgd === 'yes' ? 62 : 0) + (state.blink === 'incomplete' ? 20 : 0) + (state.symptoms.includes('evening') ? 10 : 0)),
      aqueous: Math.min(100, (schirmer !== null && schirmer <= 5 ? 70 : schirmer !== null && schirmer <= 10 ? 38 : 0) + (state.risks.includes('autoimmune') ? 22 : 0)),
      exposure: Math.min(100, (state.lagophthalmos === 'yes' ? 72 : 0) + (state.blink === 'incomplete' ? 18 : 0) + (state.masquerades.includes('exposure') ? 20 : 0)),
      iatrogenic: Math.min(100, (state.risks.includes('glaucoma_drops') ? 45 : 0) + (state.risks.includes('recent_surgery') ? 35 : 0) + (state.risks.includes('systemic_drugs') ? 25 : 0)),
      neurosensory: Math.min(100, (state.symptoms.includes('discordant_pain') ? 65 : 0) + (state.masquerades.includes('neuropathic') ? 35 : 0))
    };
  }

  function leadingDriver(scores) {
    const names = {
      lipid: 'Липидный / вековый', aqueous: 'Водный', exposure: 'Экспозиционный', iatrogenic: 'Ятрогенный', neurosensory: 'Нейросенсорный'
    };
    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return winner && winner[1] > 0 ? names[winner[0]] : 'Не определён';
  }

  function completeness() {
    const checks = [
      state.accepted,
      Boolean(state.goal),
      state.redFlags.length > 0,
      state.stoppedForSafety || state.symptoms.length > 0,
      state.stoppedForSafety || Boolean(state.laterality),
      state.stoppedForSafety || Boolean(state.onset),
      state.stoppedForSafety || Boolean(state.osdi6) || hasHomeostasisMarker(),
      state.stoppedForSafety || Boolean(state.mgd),
      state.stoppedForSafety || state.risks.length > 0,
      state.stoppedForSafety || state.masquerades.length > 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  function updateContext() {
    const percent = completeness();
    const scores = driverScores();
    const urgency = state.stoppedForSafety ? 'Требуется другой маршрут' : state.redFlags.length ? 'Плановая ветвь' : 'Не оценена';
    summary.completeness.textContent = `${percent}%`;
    summary.progress.style.width = `${percent}%`;
    summary.urgency.textContent = urgency;
    summary.diagnosis.textContent = diagnosticFrame();
    summary.driver.textContent = leadingDriver(scores);
    summary.status.textContent = state.cardGenerated ? 'Карточка сформирована' : state.conversationComplete ? 'Готово к резюме' : state.accepted ? 'Сбор данных' : 'Диалог не начат';
    summary.card.textContent = state.cardGenerated ? 'Сформирована' : 'По запросу врача';
    Object.entries(scores).forEach(([key, value]) => {
      driverElements[key].style.width = `${value}%`;
    });
  }

  function listFrom(values, dictionary) {
    const items = values.filter((value) => value !== 'none').map((value) => dictionary[value]).filter(Boolean);
    return items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Не отмечены.</p>';
  }

  function missingData() {
    if (state.stoppedForSafety) return [];
    const missing = [];
    if (!state.laterality) missing.push('латеральность');
    if (!state.onset) missing.push('характер течения');
    if (!state.osdi6) missing.push('валидированный симптоматический скрининг OSDI-6');
    if (!hasHomeostasisMarker()) missing.push('положительный маркер нарушения гомеостаза');
    if (!state.mgd) missing.push('оценка МГД и края век');
    return missing;
  }

  function cardHtml() {
    const scores = driverScores();
    const missing = missingData();
    const safety = state.stoppedForSafety;
    return `
      <article class="clinical-card" id="clinical-card">
        <header>
          <div><span>Офтальмологический клинический навигатор</span><h2>${safety ? 'Карточка безопасности' : 'Предварительная карточка случая'}</h2></div>
          <strong>v0.3</strong>
        </header>
        <section class="card-summary-grid">
          <div><span>Срочность</span><strong>${escapeHtml(safety ? 'Плановый алгоритм остановлен' : 'Критические признаки не отмечены')}</strong></div>
          <div><span>Диагностическая рамка</span><strong>${escapeHtml(diagnosticFrame())}</strong></div>
          <div><span>Ведущий драйвер</span><strong>${escapeHtml(leadingDriver(scores))}</strong></div>
          <div><span>Полнота данных</span><strong>${completeness()}%</strong></div>
        </section>
        ${safety ? `<section class="card-section critical-card"><h3>Причина остановки</h3>${listFrom(state.redFlags, labels.redFlags)}</section>` : `
          <section class="card-section"><h3>Клиническая задача</h3><p>${escapeHtml(labels.goal[state.goal] || 'Не указана')}</p></section>
          <section class="card-section"><h3>Симптоматический профиль</h3>${listFrom(state.symptoms, labels.symptoms)}</section>
          <section class="card-section"><h3>Факторы, изменяющие тактику</h3>${listFrom(state.risks, labels.risks)}</section>
          <section class="card-section"><h3>Заболевания-маски</h3>${listFrom(state.masquerades, labels.masquerades)}</section>
          <section class="card-section"><h3>Недостающие данные</h3>${missing.length ? `<ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Ключевые поля демонстрационного алгоритма заполнены.</p>'}</section>
          <section class="card-section"><h3>Ранее проводившаяся терапия</h3><p>${escapeHtml(state.priorTreatment || 'Не указана.')}</p></section>
        `}
        <footer><strong>Лекарственные схемы не сформированы.</strong> Прототип не предназначен для клинического применения.</footer>
      </article>
      <div class="card-export-actions">
        <button type="button" data-export="copy">Копировать</button>
        <button type="button" data-export="txt">Скачать TXT</button>
        <button type="button" data-export="print">Печать / PDF</button>
      </div>
    `;
  }

  function generateCard() {
    clearSuggestions();
    const percent = completeness();
    if (!state.stoppedForSafety && percent < 60) {
      const missing = missingData();
      assistant(`<p>Карточку пока рано формировать: данных недостаточно.</p>${missing.length ? `<ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}<p>Продолжим сбор данных.</p>`, () => askCurrentStage());
      return;
    }
    addUserText('Сформировать итоговую карточку');
    assistant(cardHtml(), (bubble) => {
      state.cardGenerated = true;
      updateContext();
      wireExportActions(bubble);
    });
  }

  function plainTextCard() {
    const scores = driverScores();
    const lines = [
      'ОФТАЛЬМОЛОГИЧЕСКИЙ КЛИНИЧЕСКИЙ НАВИГАТОР — ПРОТОТИП v0.3',
      '',
      `Срочность: ${state.stoppedForSafety ? 'плановый алгоритм остановлен' : 'критические признаки не отмечены'}`,
      `Диагностическая рамка: ${diagnosticFrame()}`,
      `Ведущий драйвер: ${leadingDriver(scores)}`,
      `Полнота данных: ${completeness()}%`,
      '',
      state.stoppedForSafety ? `Красные флаги: ${state.redFlags.map((item) => labels.redFlags[item]).join('; ')}` : `Клиническая задача: ${labels.goal[state.goal] || 'не указана'}`,
      !state.stoppedForSafety ? `Симптомы: ${state.symptoms.map((item) => labels.symptoms[item]).join('; ')}` : '',
      !state.stoppedForSafety ? `Факторы: ${state.risks.filter((item) => item !== 'none').map((item) => labels.risks[item]).join('; ') || 'не отмечены'}` : '',
      !state.stoppedForSafety ? `Заболевания-маски: ${state.masquerades.filter((item) => item !== 'none').map((item) => labels.masquerades[item]).join('; ') || 'не отмечены'}` : '',
      '',
      'Лекарственные схемы не сформированы. Прототип не предназначен для клинического применения.'
    ];
    return lines.filter((line) => line !== '').join('\n');
  }

  function wireExportActions(container) {
    container.querySelectorAll('[data-export]').forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.dataset.export;
        if (action === 'copy') {
          try {
            await navigator.clipboard.writeText(plainTextCard());
            button.textContent = 'Скопировано';
          } catch (_error) {
            button.textContent = 'Не удалось скопировать';
          }
        }
        if (action === 'txt') {
          const blob = new Blob([plainTextCard()], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'clinical-navigator-card.txt';
          link.click();
          URL.revokeObjectURL(url);
        }
        if (action === 'print') window.print();
      });
    });
  }

  function wireMessageActions(container) {
    container.querySelectorAll('[data-chat-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.chatAction;
        if (action === 'card') generateCard();
        if (action === 'treatment') {
          assistant('<p>Укажите ранее использованные препараты, длительность и клинический эффект. Не вводите персональные данные.</p>', (bubble) => {
            bubble.appendChild(renderInlineForm([
              { type: 'textarea', name: 'priorTreatment', label: 'Ранее проводившаяся терапия', placeholder: 'Например: слёзозаменитель без консервантов 4 недели, частичный эффект' }
            ], 'Сохранить', (data) => {
              state.priorTreatment = data.priorTreatment || '';
              assistant('<p>Сведения о терапии добавлены. Карточка будет сформирована только по вашему запросу.</p>');
            }));
          });
        }
        if (action === 'questions') {
          const missing = missingData();
          assistant(missing.length ? `<p>Для более полной карточки желательно уточнить:</p><ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Ключевые поля демонстрационного алгоритма заполнены. Можно дополнить анамнез или сформировать карточку.</p>');
        }
      });
    });
  }

  function handleFreeText(text) {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return;
    addUserText(text.trim());
    input.value = '';
    resizeInput();

    if (/(сформир|созда|покаж|выгруз).*(карточ|отч[её]т|резюме)|^(карточка|отч[её]т|резюме)$/i.test(normalized)) {
      generateCard();
      return;
    }

    if (/нов(ый|ая) случай|начать заново|сброс/i.test(normalized)) {
      startConversation();
      return;
    }

    state.notes.push(text.trim());
    assistant('<p>Принял это как дополнительное клиническое описание. Для безопасной структуризации ответьте на текущий вопрос с помощью вариантов или формы ниже.</p>', () => askCurrentStage());
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleFreeText(input.value);
  });

  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  newCaseButton.addEventListener('click', startConversation);
  cardButton.addEventListener('click', generateCard);

  startConversation();
})();
