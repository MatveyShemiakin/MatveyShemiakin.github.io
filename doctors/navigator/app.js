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
    mechanism: document.getElementById('summary-driver'),
    card: document.getElementById('summary-card'),
    status: document.getElementById('case-status'),
    progress: document.getElementById('context-progress-bar')
  };

  const mechanismElements = {
    evaporative: document.getElementById('driver-lipid'),
    aqueous: document.getElementById('driver-aqueous'),
    exposure: document.getElementById('driver-exposure'),
    iatrogenic: document.getElementById('driver-iatrogenic'),
    neurosensory: document.getElementById('driver-neurosensory')
  };

  const labels = {
    goal: {
      confirm: 'Понять, соответствует ли случай синдрому сухого глаза',
      mechanism: 'Определить, какой механизм преобладает',
      refractory: 'Разобраться, почему лечение не помогает',
      preop: 'Оценить глазную поверхность перед операцией'
    },
    redFlags: {
      vision_loss: 'значимое или быстрое снижение зрения',
      severe_pain: 'выраженная боль или светобоязнь',
      corneal_lesion: 'инфильтрат, дефект эпителия или выраженное поражение роговицы',
      acute_unilateral: 'острый односторонний красный глаз',
      contact_lens: 'контактные линзы в сочетании с острым ухудшением',
      trauma_chemical: 'травма или химическое воздействие',
      postop_acute: 'острое ухудшение после операции или инъекции',
      none: 'настораживающие признаки не выявлены'
    },
    symptoms: {
      dryness: 'сухость, жжение или ощущение инородного тела',
      fluctuation: 'флюктуация зрения с улучшением после моргания',
      tearing: 'рефлекторное слезотечение',
      morning: 'ухудшение преимущественно утром',
      evening: 'нарастание симптомов к вечеру',
      screen: 'усиление симптомов при работе с экраном или чтении',
      itching: 'зуд как ведущая жалоба',
      discordant_pain: 'боль значительно выраженнее объективных изменений'
    },
    risks: {
      glaucoma_drops: 'длительная местная гипотензивная терапия',
      recent_surgery: 'недавняя офтальмологическая операция',
      autoimmune: 'аутоиммунное заболевание или сухость других слизистых',
      systemic_drugs: 'системные препараты, способные усиливать сухость',
      contact_lens_chronic: 'регулярное ношение контактных линз',
      environment: 'длительная экранная нагрузка, сухой воздух или климатический фактор',
      none: 'значимые дополнительные факторы не указаны'
    },
    alternatives: {
      allergy: 'аллергическое заболевание глазной поверхности',
      recurrent_erosion: 'рецидивирующая эрозия роговицы',
      neuropathic: 'нейропатическая глазная боль',
      exposure: 'экспозиционная кератопатия',
      conjunctivochalasis: 'конъюнктивохалазис',
      demodex: 'Demodex-ассоциированный блефарит',
      neurotrophic: 'нейротрофическая кератопатия',
      none: 'явных признаков другой причины не отмечено'
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
    alternatives: [],
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
  }

  function setSuggestions(items, mode = 'single', submitLabel = 'Продолжить') {
    clearSuggestions();
    selected = new Set();
    suggestions.dataset.mode = mode;
    let doneButton = null;

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
        if (doneButton) doneButton.disabled = selected.size === 0;
      });
      suggestions.appendChild(button);
    });

    if (mode === 'multi') {
      doneButton = document.createElement('button');
      doneButton.type = 'button';
      doneButton.className = 'suggestion-submit';
      doneButton.textContent = submitLabel;
      doneButton.disabled = true;
      doneButton.addEventListener('click', () => {
        const values = Array.from(selected);
        const display = values.map((value) => items.find((item) => item.value === value)?.label || value).join('; ');
        submitStructured(values, display);
      });
      suggestions.appendChild(doneButton);
    }
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
      wrapper.querySelectorAll('input, select, textarea, button').forEach((element) => { element.disabled = true; });
      addUserText(summaryText);
      onSubmit(data);
    });
    return wrapper;
  }

  function startConversation() {
    stream.replaceChildren();
    clearSuggestions();
    state = initialState();
    updateContext();
    assistant(`
      <p class="message-eyebrow">Офтальмологический клинический навигатор</p>
      <h2>Здравствуйте. Опишите клинический случай — я помогу последовательно его разобрать.</h2>
      <p>Сначала уточним, нет ли признаков другой или угрожающей патологии. Затем разберём жалобы, результаты тестов слёзной плёнки, состояние век и факторы риска.</p>
      <div class="message-alert"><strong>Важно:</strong> это демонстрационная версия. Не вводите персональные данные пациента и не используйте результат для назначения или изменения лечения.</div>
      <p>Подтверждаете, что понимаете ограничения?</p>
    `, () => setSuggestions([
      { value: 'accept', label: 'Да, понимаю ограничения' },
      { value: 'details', label: 'Пояснить ограничения' }
    ]));
  }

  function askCurrentStage() {
    updateContext();

    if (state.stage === 'goal') {
      assistant('<p>Что вы хотите получить по этому случаю?</p>', () => setSuggestions([
        { value: 'confirm', label: labels.goal.confirm },
        { value: 'mechanism', label: labels.goal.mechanism },
        { value: 'refractory', label: labels.goal.refractory },
        { value: 'preop', label: labels.goal.preop }
      ]));
      return;
    }

    if (state.stage === 'redFlags') {
      assistant('<p>Есть ли признаки, при которых нельзя ограничиваться плановой оценкой сухого глаза?</p><p class="message-note">Можно выбрать несколько вариантов.</p>', () => setSuggestions([
        { value: 'vision_loss', label: 'Быстрое или значимое снижение зрения' },
        { value: 'severe_pain', label: 'Выраженная боль или светобоязнь' },
        { value: 'corneal_lesion', label: 'Инфильтрат или дефект эпителия' },
        { value: 'acute_unilateral', label: 'Острый односторонний красный глаз' },
        { value: 'contact_lens', label: 'Контактные линзы и острое ухудшение' },
        { value: 'trauma_chemical', label: 'Травма или химическое воздействие' },
        { value: 'postop_acute', label: 'Острое ухудшение после операции или инъекции' },
        { value: 'none', label: 'Перечисленных признаков нет' }
      ], 'multi', 'Подтвердить'));
      return;
    }

    if (state.stage === 'symptoms') {
      assistant('<p>Какие жалобы преобладают?</p><p class="message-note">Отметьте все подходящие варианты.</p>', () => setSuggestions([
        { value: 'dryness', label: 'Сухость, жжение, ощущение инородного тела' },
        { value: 'fluctuation', label: 'Зрение меняется и улучшается после моргания' },
        { value: 'tearing', label: 'Слезотечение' },
        { value: 'morning', label: 'Хуже утром' },
        { value: 'evening', label: 'Хуже к вечеру' },
        { value: 'screen', label: 'Хуже при работе с экраном или чтении' },
        { value: 'itching', label: 'Преобладает зуд' },
        { value: 'discordant_pain', label: 'Боль сильнее видимых изменений' }
      ], 'multi'));
      return;
    }

    if (state.stage === 'context') {
      assistant('<p>Уточните характер процесса.</p>', (bubble) => {
        bubble.appendChild(renderInlineForm([
          { type: 'select', name: 'laterality', label: 'Какой глаз поражён', required: true, options: [
            { value: '', label: 'Выберите' },
            { value: 'bilateral', label: 'Оба глаза примерно одинаково' },
            { value: 'unilateral', label: 'Один глаз' },
            { value: 'asymmetric', label: 'Оба глаза, но выраженность разная' }
          ] },
          { type: 'select', name: 'onset', label: 'Как протекает заболевание', required: true, options: [
            { value: '', label: 'Выберите' },
            { value: 'acute', label: 'Началось остро' },
            { value: 'subacute', label: 'Развивалось постепенно в течение дней или недель' },
            { value: 'chronic', label: 'Хроническое или рецидивирующее течение' }
          ] },
          { type: 'select', name: 'severity', label: 'Насколько мешает пациенту', required: true, options: [
            { value: '', label: 'Выберите' },
            { value: 'mild', label: 'Незначительно' },
            { value: 'moderate', label: 'Умеренно' },
            { value: 'severe', label: 'Выраженно ограничивает активность' }
          ] }
        ], 'Продолжить', (data) => {
          Object.assign(state, data);
          state.stage = 'diagnostics';
          askCurrentStage();
        }));
      });
      return;
    }

    if (state.stage === 'diagnostics') {
      assistant('<p>Какие результаты обследования доступны?</p><p class="message-note">Неизвестные показатели можно оставить пустыми. Для предварительного вывода нужны жалобы и хотя бы один объективный признак нарушения слёзной плёнки или глазной поверхности.</p>', (bubble) => {
        bubble.appendChild(renderInlineForm([
          { type: 'select', name: 'osdi6', label: 'Опросник OSDI-6', options: [
            { value: '', label: 'Не выполнен или результат неизвестен' },
            { value: 'positive', label: '4 балла и более' },
            { value: 'negative', label: 'Менее 4 баллов' }
          ] },
          { type: 'number', name: 'nibt', label: 'NIBUT, секунд', min: '0', max: '60', step: '0.1', placeholder: 'например, 7.5' },
          { type: 'select', name: 'osmolarity', label: 'Осмолярность слезы', options: [
            { value: '', label: 'Не оценена' },
            { value: 'abnormal', label: 'Есть отклонение по критериям метода' },
            { value: 'normal', label: 'Без диагностически значимого отклонения' }
          ] },
          { type: 'select', name: 'staining', label: 'Окрашивание роговицы или конъюнктивы', options: [
            { value: '', label: 'Не оценено' },
            { value: 'abnormal', label: 'Есть диагностически значимое окрашивание' },
            { value: 'normal', label: 'Диагностический порог не достигнут' }
          ] },
          { type: 'number', name: 'schirmer', label: 'Тест Ширмера, мм за 5 минут', min: '0', max: '50', step: '1', placeholder: 'если выполнен' }
        ], 'Сохранить результаты', (data) => {
          Object.assign(state, data);
          state.stage = 'lids';
          askCurrentStage();
        }));
      });
      return;
    }

    if (state.stage === 'lids') {
      assistant('<p>Что выявлено при оценке век, моргания и мейбомиевых желёз?</p>', (bubble) => {
        bubble.appendChild(renderInlineForm([
          { type: 'select', name: 'mgd', label: 'Мейбомиевы железы и край век', options: [
            { value: '', label: 'Не оценены' },
            { value: 'yes', label: 'Есть признаки дисфункции или блефарита' },
            { value: 'no', label: 'Значимых изменений не выявлено' }
          ] },
          { type: 'select', name: 'blink', label: 'Моргание', options: [
            { value: '', label: 'Не оценено' },
            { value: 'incomplete', label: 'Редкое или неполное' },
            { value: 'normal', label: 'Без значимых особенностей' }
          ] },
          { type: 'select', name: 'lagophthalmos', label: 'Смыкание век', options: [
            { value: '', label: 'Не оценено' },
            { value: 'yes', label: 'Есть неполное смыкание или экспозиция' },
            { value: 'no', label: 'Смыкание полное' }
          ] }
        ], 'Сохранить оценку', (data) => {
          Object.assign(state, data);
          state.stage = 'risks';
          askCurrentStage();
        }));
      });
      return;
    }

    if (state.stage === 'risks') {
      assistant('<p>Какие обстоятельства могут влиять на состояние глазной поверхности?</p>', () => setSuggestions([
        { value: 'glaucoma_drops', label: 'Длительное применение глазных капель от глаукомы' },
        { value: 'recent_surgery', label: 'Недавняя операция на глазах' },
        { value: 'autoimmune', label: 'Аутоиммунное заболевание или сухость других слизистых' },
        { value: 'systemic_drugs', label: 'Системные препараты, способные усиливать сухость' },
        { value: 'contact_lens_chronic', label: 'Регулярное ношение контактных линз' },
        { value: 'environment', label: 'Экранная нагрузка, сухой воздух или климат' },
        { value: 'none', label: 'Значимых факторов не выявлено' }
      ], 'multi'));
      return;
    }

    if (state.stage === 'alternatives') {
      assistant('<p>Есть ли признаки, которые заставляют думать о другой причине жалоб, а не только о сухом глазе?</p>', () => setSuggestions([
        { value: 'allergy', label: 'Преобладает аллергический компонент' },
        { value: 'recurrent_erosion', label: 'Возможна рецидивирующая эрозия роговицы' },
        { value: 'neuropathic', label: 'Возможна нейропатическая боль' },
        { value: 'exposure', label: 'Есть признаки экспозиционной кератопатии' },
        { value: 'conjunctivochalasis', label: 'Есть конъюнктивохалазис' },
        { value: 'demodex', label: 'Есть признаки Demodex-блефарита' },
        { value: 'neurotrophic', label: 'Возможна нейротрофическая кератопатия' },
        { value: 'none', label: 'Явных признаков другой причины нет' }
      ], 'multi'));
      return;
    }

    if (state.stage === 'ready') {
      state.conversationComplete = true;
      assistant(`
        <p class="message-eyebrow">Основные данные собраны</p>
        <h2>Я могу продолжить разбор или подготовить краткую карточку случая.</h2>
        <p>Карточка появится только после вашей команды.</p>
        <div class="message-actions">
          <button type="button" data-chat-action="card">Сформировать карточку</button>
          <button type="button" data-chat-action="treatment">Добавить сведения о проведённом лечении</button>
          <button type="button" data-chat-action="questions">Каких данных ещё не хватает?</button>
        </div>
      `, wireMessageActions);
    }
  }

  function processStage(values) {
    if (state.stage === 'consent') {
      if (values[0] === 'details') {
        assistant('<p>Навигатор не устанавливает окончательный диагноз, не назначает препараты и не заменяет очную оценку. Вводить можно только обезличенные клинические данные. Готовы продолжить?</p>', () => setSuggestions([{ value: 'accept', label: 'Да, продолжить' }]));
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
          <p class="message-eyebrow critical-text">Требуется другой маршрут</p>
          <h2>Плановый разбор сухого глаза остановлен.</h2>
          <div class="message-alert critical"><strong>Отмечены признаки, которые могут указывать на другое или угрожающее заболевание.</strong><br>Сначала необходима очная оценка и исключение поражения роговицы, воспалительного, инфекционного, послеоперационного или травматического процесса.</div>
          <p>По вашему запросу я могу сформировать карточку с отмеченными настораживающими признаками.</p>
          <div class="message-actions"><button type="button" data-chat-action="card">Сформировать карточку безопасности</button></div>
        `, wireMessageActions);
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
      state.stage = 'alternatives';
      askCurrentStage();
      return;
    }

    if (state.stage === 'alternatives') {
      state.alternatives = values;
      state.stage = 'ready';
      askCurrentStage();
    }
  }

  function hasObjectiveEvidence() {
    const nibt = state.nibt === '' ? null : Number(state.nibt);
    return (nibt !== null && nibt < 10) || state.osmolarity === 'abnormal' || state.staining === 'abnormal';
  }

  function dryEyeConclusion() {
    if (state.stoppedForSafety) return 'Оценка ССГ отложена до исключения другой патологии';
    if (!state.osdi6) return 'Недостаточно данных для вывода';
    if (state.osdi6 === 'negative') return 'Полученные данные не подтверждают ССГ';
    if (hasObjectiveEvidence()) return 'Есть сочетание симптомов и объективных признаков ССГ';
    return 'Есть симптомы, но объективного подтверждения пока недостаточно';
  }

  function mechanismScores() {
    const schirmer = state.schirmer === '' ? null : Number(state.schirmer);
    return {
      evaporative: Math.min(100, (state.mgd === 'yes' ? 62 : 0) + (state.blink === 'incomplete' ? 20 : 0) + (state.symptoms.includes('evening') ? 10 : 0)),
      aqueous: Math.min(100, (schirmer !== null && schirmer <= 5 ? 70 : schirmer !== null && schirmer <= 10 ? 38 : 0) + (state.risks.includes('autoimmune') ? 22 : 0)),
      exposure: Math.min(100, (state.lagophthalmos === 'yes' ? 72 : 0) + (state.blink === 'incomplete' ? 18 : 0) + (state.alternatives.includes('exposure') ? 20 : 0)),
      iatrogenic: Math.min(100, (state.risks.includes('glaucoma_drops') ? 45 : 0) + (state.risks.includes('recent_surgery') ? 35 : 0) + (state.risks.includes('systemic_drugs') ? 25 : 0)),
      neurosensory: Math.min(100, (state.symptoms.includes('discordant_pain') ? 65 : 0) + (state.alternatives.includes('neuropathic') ? 35 : 0))
    };
  }

  function leadingMechanism(scores) {
    const names = {
      evaporative: 'Испарительный компонент / МГД',
      aqueous: 'Слёзодефицитный компонент',
      exposure: 'Экспозиционный компонент',
      iatrogenic: 'Лекарственный или послеоперационный компонент',
      neurosensory: 'Нейросенсорный компонент'
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
      state.stoppedForSafety || Boolean(state.osdi6) || hasObjectiveEvidence(),
      state.stoppedForSafety || Boolean(state.mgd),
      state.stoppedForSafety || state.risks.length > 0,
      state.stoppedForSafety || state.alternatives.length > 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  function updateContext() {
    const percent = completeness();
    const scores = mechanismScores();
    summary.completeness.textContent = `${percent}%`;
    summary.progress.style.width = `${percent}%`;
    summary.urgency.textContent = state.stoppedForSafety ? 'Нужна приоритетная очная оценка' : state.redFlags.length ? 'Плановый разбор' : 'Не оценена';
    summary.diagnosis.textContent = dryEyeConclusion();
    summary.mechanism.textContent = leadingMechanism(scores);
    summary.status.textContent = state.cardGenerated ? 'Карточка сформирована' : state.conversationComplete ? 'Данные собраны' : state.accepted ? 'Идёт диалог' : 'Диалог не начат';
    summary.card.textContent = state.cardGenerated ? 'Сформирована' : 'Только по запросу';
    Object.entries(scores).forEach(([key, value]) => {
      mechanismElements[key].style.width = `${value}%`;
    });
  }

  function listFrom(values, dictionary) {
    const items = values.filter((value) => value !== 'none').map((value) => dictionary[value]).filter(Boolean);
    return items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Не отмечены.</p>';
  }

  function missingData() {
    if (state.stoppedForSafety) return [];
    const missing = [];
    if (!state.laterality) missing.push('уточнить латеральность процесса');
    if (!state.onset) missing.push('уточнить характер и длительность течения');
    if (!state.osdi6) missing.push('выполнить или указать результат валидированного опросника симптомов');
    if (!hasObjectiveEvidence()) missing.push('получить объективное подтверждение нарушения слёзной плёнки или глазной поверхности');
    if (!state.mgd) missing.push('оценить край век и мейбомиевы железы');
    return missing;
  }

  function cardHtml() {
    const scores = mechanismScores();
    const missing = missingData();
    const safety = state.stoppedForSafety;
    return `
      <article class="clinical-card" id="clinical-card">
        <header>
          <div><span>Офтальмологический клинический навигатор</span><h2>${safety ? 'Карточка безопасности' : 'Предварительная карточка случая'}</h2></div>
          <strong>v0.4</strong>
        </header>
        <section class="card-summary-grid">
          <div><span>Срочность</span><strong>${escapeHtml(safety ? 'Плановый разбор остановлен' : 'Настораживающие признаки не отмечены')}</strong></div>
          <div><span>Признаки ССГ</span><strong>${escapeHtml(dryEyeConclusion())}</strong></div>
          <div><span>Вероятный механизм</span><strong>${escapeHtml(leadingMechanism(scores))}</strong></div>
          <div><span>Полнота данных</span><strong>${completeness()}%</strong></div>
        </section>
        ${safety ? `<section class="card-section critical-card"><h3>Причина остановки</h3>${listFrom(state.redFlags, labels.redFlags)}</section>` : `
          <section class="card-section"><h3>Цель обращения</h3><p>${escapeHtml(labels.goal[state.goal] || 'Не указана')}</p></section>
          <section class="card-section"><h3>Жалобы</h3>${listFrom(state.symptoms, labels.symptoms)}</section>
          <section class="card-section"><h3>Факторы, влияющие на глазную поверхность</h3>${listFrom(state.risks, labels.risks)}</section>
          <section class="card-section"><h3>Другие возможные причины симптомов</h3>${listFrom(state.alternatives, labels.alternatives)}</section>
          <section class="card-section"><h3>Каких данных не хватает</h3>${missing.length ? `<ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Основные данные для предварительного резюме заполнены.</p>'}</section>
          <section class="card-section"><h3>Ранее проводившееся лечение</h3><p>${escapeHtml(state.priorTreatment || 'Не указано.')}</p></section>
          ${state.notes.length ? `<section class="card-section"><h3>Дополнительные сведения врача</h3><ul>${state.notes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}
        `}
        <footer><strong>Лекарственная схема не сформирована.</strong> Демонстрационная версия не предназначена для клинического применения.</footer>
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
    if (!state.stoppedForSafety && completeness() < 60) {
      const missing = missingData();
      assistant(`<p>Для содержательной карточки данных пока недостаточно.</p>${missing.length ? `<ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}<p>Продолжим с текущего вопроса.</p>`, askCurrentStage);
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
    const scores = mechanismScores();
    const lines = [
      'ОФТАЛЬМОЛОГИЧЕСКИЙ КЛИНИЧЕСКИЙ НАВИГАТОР — ДЕМОНСТРАЦИОННАЯ ВЕРСИЯ v0.4',
      '',
      `Срочность: ${state.stoppedForSafety ? 'плановый разбор остановлен' : 'настораживающие признаки не отмечены'}`,
      `Признаки ССГ: ${dryEyeConclusion()}`,
      `Вероятный механизм: ${leadingMechanism(scores)}`,
      `Полнота данных: ${completeness()}%`,
      '',
      state.stoppedForSafety ? `Причины остановки: ${state.redFlags.map((item) => labels.redFlags[item]).join('; ')}` : `Цель обращения: ${labels.goal[state.goal] || 'не указана'}`,
      !state.stoppedForSafety ? `Жалобы: ${state.symptoms.map((item) => labels.symptoms[item]).join('; ')}` : '',
      !state.stoppedForSafety ? `Влияющие факторы: ${state.risks.filter((item) => item !== 'none').map((item) => labels.risks[item]).join('; ') || 'не отмечены'}` : '',
      !state.stoppedForSafety ? `Другие возможные причины: ${state.alternatives.filter((item) => item !== 'none').map((item) => labels.alternatives[item]).join('; ') || 'не отмечены'}` : '',
      !state.stoppedForSafety ? `Ранее проводившееся лечение: ${state.priorTreatment || 'не указано'}` : '',
      state.notes.length ? `Дополнительные сведения: ${state.notes.join('; ')}` : '',
      '',
      'Лекарственная схема не сформирована. Демонстрационная версия не предназначена для клинического применения.'
    ];
    return lines.filter((line, index, array) => line !== '' || array[index - 1] !== '').join('\n');
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
          assistant('<p>Кратко укажите, что уже применялось, как долго и был ли эффект.</p>', (bubble) => {
            bubble.appendChild(renderInlineForm([
              { type: 'textarea', name: 'priorTreatment', label: 'Проведённое лечение и эффект', placeholder: 'Без персональных данных пациента' }
            ], 'Сохранить', (data) => {
              state.priorTreatment = data.priorTreatment.trim();
              assistant('<p>Сведения сохранены. Карточку можно сформировать в любой момент.</p>');
            }));
          });
        }
        if (action === 'questions') {
          const missing = missingData();
          assistant(missing.length ? `<p>Для более уверенного резюме желательно:</p><ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Основные поля заполнены. Можно сформировать карточку или добавить клинические детали свободным текстом.</p>');
        }
      });
    });
  }

  function isCardCommand(text) {
    const normalized = text.toLowerCase();
    return ['сформировать карточку', 'сформируй карточку', 'карточка', 'итог', 'отчёт', 'отчет'].some((command) => normalized.includes(command));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '';
    if (isCardCommand(text)) {
      generateCard();
      return;
    }
    addUserText(text);
    state.notes.push(text);
    assistant('<p>Сохранил это как дополнительную клиническую информацию. Чтобы не пропустить обязательные данные, продолжим с текущего вопроса.</p>', () => {
      if (!state.conversationComplete) askCurrentStage();
      else assistant('<p>Можно добавить ещё сведения или попросить сформировать карточку.</p>');
    });
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
  });

  newCaseButton.addEventListener('click', startConversation);
  cardButton.addEventListener('click', generateCard);

  startConversation();
})();
