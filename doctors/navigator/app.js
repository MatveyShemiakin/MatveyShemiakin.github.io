(function () {
  'use strict';

  const content = document.getElementById('navigator-content');
  const backButton = document.getElementById('back-button');
  const nextButton = document.getElementById('next-button');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');

  const summary = {
    step: document.getElementById('summary-step'),
    redFlags: document.getElementById('summary-redflags'),
    phenotype: document.getElementById('summary-phenotype'),
    completeness: document.getElementById('summary-completeness')
  };

  const initialState = () => ({
    step: 0,
    resultMode: false,
    accepted: false,
    goal: '',
    redFlags: [],
    symptoms: [],
    laterality: '',
    osdi6: '',
    nibt: '',
    osmolarity: '',
    staining: '',
    schirmer: '',
    mgd: '',
    risks: [],
    priorTreatment: ''
  });

  let state = initialState();

  const stepNames = [
    'Условия использования',
    'Клиническая задача',
    'Проверка безопасности',
    'Симптомы',
    'Диагностические данные',
    'Этиологические факторы'
  ];

  const option = (type, name, value, title, help, checked) => `
    <label class="option">
      <input type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
      <span><strong>${title}</strong>${help ? `<small>${help}</small>` : ''}</span>
    </label>`;

  function renderStep() {
    state.resultMode = false;
    progressLabel.textContent = `Шаг ${state.step + 1} из ${stepNames.length}`;
    progressBar.style.width = `${((state.step + 1) / stepNames.length) * 100}%`;
    summary.step.textContent = stepNames[state.step];
    backButton.disabled = state.step === 0;
    nextButton.textContent = state.step === 0 ? 'Начать' : state.step === stepNames.length - 1 ? 'Сформировать результат' : 'Продолжить';

    [renderIntro, renderGoal, renderRedFlags, renderSymptoms, renderDiagnostics, renderDrivers][state.step]();
    updateSummary();
  }

  function renderIntro() {
    content.innerHTML = `
      <p class="question-kicker">Перед началом</p>
      <h2 class="question-title">Демонстрационный режим</h2>
      <p class="question-help">Прототип проверяет структуру диалога, обязательные вопросы и остановку небезопасного сценария. Он не предназначен для диагностики или назначения лечения.</p>
      <div class="result-grid">
        <div class="result-block caution">
          <h3>Ограничения</h3>
          <ul>
            <li>не вводите персональные данные пациента;</li>
            <li>не используйте результат как медицинскую рекомендацию;</li>
            <li>лекарственный модуль отключён;</li>
            <li>правила проходят клиническую валидацию.</li>
          </ul>
        </div>
      </div>
      <div class="option-grid">
        ${option('checkbox', 'accepted', 'yes', 'Я понимаю ограничения прототипа', 'Продолжение доступно после подтверждения.', state.accepted)}
      </div>`;
  }

  function renderGoal() {
    const choices = [
      ['framework', 'Проверить диагностическую рамку', 'Сопоставить симптомы с маркерами нарушения гомеостаза слёзной плёнки или глазной поверхности.'],
      ['drivers', 'Оценить вероятные этиологические драйверы', 'Структурировать липидный, водный, вековый, ятрогенный и другие компоненты.'],
      ['refractory', 'Разобрать отсутствие эффекта', 'Проверить болезни-маски, несоответствие симптомов и признаков, а также поддерживающие факторы.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Цель обращения</p>
      <h2 class="question-title">Какую задачу нужно решить?</h2>
      <p class="question-help">Выбранная задача изменит акценты итоговой карточки.</p>
      <div class="option-grid">
        ${choices.map(([value, title, help]) => option('radio', 'goal', value, title, help, state.goal === value)).join('')}
      </div>`;
  }

  function renderRedFlags() {
    const flags = [
      ['vision_loss', 'Значимое или быстрое снижение зрения', 'Особенно при остром одностороннем процессе.'],
      ['severe_pain', 'Выраженная боль или светобоязнь', 'Симптомы, не соответствующие обычному дискомфорту при сухом глазе.'],
      ['corneal_lesion', 'Фокальный инфильтрат, дефект эпителия или выраженное поражение роговицы', 'Требует исключения инфекционной и иной угрожающей патологии.'],
      ['acute_unilateral', 'Острый односторонний красный глаз', 'Нужна оценка альтернативного диагноза.'],
      ['contact_lens', 'Контактные линзы и острое ухудшение', 'Повышает настороженность в отношении кератита.'],
      ['none', 'Перечисленных признаков нет', 'Можно перейти к плановой диагностической рамке.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Красные флаги</p>
      <h2 class="question-title">Есть ли признаки, требующие другого маршрута?</h2>
      <p class="question-help">При наличии угрожающего признака плановый алгоритм будет остановлен.</p>
      <div class="option-grid">
        ${flags.map(([value, title, help]) => option('checkbox', 'redFlags', value, title, help, state.redFlags.includes(value))).join('')}
      </div>`;
    setupExclusiveNone('redFlags');
  }

  function renderSymptoms() {
    const symptoms = [
      ['dryness', 'Сухость, жжение или ощущение песка', 'Типичные симптомы глазной поверхности.'],
      ['fluctuation', 'Флюктуация зрения и улучшение после моргания', 'Может поддерживать нестабильность слёзной плёнки.'],
      ['tearing', 'Рефлекторное слезотечение', 'Не исключает сухой глаз.'],
      ['morning', 'Преобладание симптомов утром', 'Может потребовать оценки экспозиции и состояния век.'],
      ['screen', 'Усиление при зрительной нагрузке', 'Оценивается вместе с морганием и условиями среды.'],
      ['discordant_pain', 'Боль значительно сильнее объективных признаков', 'Требует оценки нейросенсорного или нейропатического компонента.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Симптоматический профиль</p>
      <h2 class="question-title">Какие жалобы преобладают?</h2>
      <p class="question-help">Можно выбрать несколько вариантов. На следующем шаге отдельно фиксируется результат валидированного опросника.</p>
      <div class="inline-fields">
        <div class="field">
          <label for="laterality">Латеральность</label>
          <select id="laterality">
            <option value="">Не указано</option>
            <option value="bilateral" ${state.laterality === 'bilateral' ? 'selected' : ''}>Двусторонний процесс</option>
            <option value="unilateral" ${state.laterality === 'unilateral' ? 'selected' : ''}>Односторонний процесс</option>
            <option value="asymmetric" ${state.laterality === 'asymmetric' ? 'selected' : ''}>Двусторонний асимметричный</option>
          </select>
        </div>
      </div>
      <div class="option-grid">
        ${symptoms.map(([value, title, help]) => option('checkbox', 'symptoms', value, title, help, state.symptoms.includes(value))).join('')}
      </div>`;
  }

  function renderDiagnostics() {
    content.innerHTML = `
      <p class="question-kicker">Диагностическая методология</p>
      <h2 class="question-title">Какие данные получены?</h2>
      <p class="question-help">В логике TFOS DEWS III положительный скрининг симптомов должен сочетаться как минимум с одним маркером нарушения гомеостаза. Ширмер используется для анализа драйвера слёзодефицита, а не как самостоятельное подтверждение диагноза.</p>
      <div class="inline-fields">
        <div class="field">
          <label for="osdi6">OSDI-6</label>
          <select id="osdi6">
            <option value="">Не выполнен / неизвестен</option>
            <option value="positive" ${state.osdi6 === 'positive' ? 'selected' : ''}>Положительный, ≥4</option>
            <option value="negative" ${state.osdi6 === 'negative' ? 'selected' : ''}>Отрицательный, &lt;4</option>
          </select>
        </div>
        <div class="field">
          <label for="nibt">NIBUT, секунд</label>
          <input id="nibt" type="number" min="0" max="60" step="0.1" inputmode="decimal" value="${state.nibt}" placeholder="Например, 7.5">
        </div>
        <div class="field">
          <label for="osmolarity">Осмолярность слезы</label>
          <select id="osmolarity">
            <option value="">Не оценена</option>
            <option value="abnormal" ${state.osmolarity === 'abnormal' ? 'selected' : ''}>Аномальная по критериям метода</option>
            <option value="normal" ${state.osmolarity === 'normal' ? 'selected' : ''}>В пределах критериев метода</option>
          </select>
        </div>
        <div class="field">
          <label for="staining">Окрашивание глазной поверхности</label>
          <select id="staining">
            <option value="">Не оценено</option>
            <option value="abnormal" ${state.staining === 'abnormal' ? 'selected' : ''}>Аномальное по валидированной шкале</option>
            <option value="normal" ${state.staining === 'normal' ? 'selected' : ''}>Не достигает диагностического порога</option>
          </select>
        </div>
        <div class="field">
          <label for="schirmer">Тест Ширмера, мм / 5 мин</label>
          <input id="schirmer" type="number" min="0" max="50" step="1" inputmode="numeric" value="${state.schirmer}" placeholder="Для оценки водного драйвера">
        </div>
        <div class="field">
          <label for="mgd">Признаки МГД / патологии края век</label>
          <select id="mgd">
            <option value="">Не оценены</option>
            <option value="yes" ${state.mgd === 'yes' ? 'selected' : ''}>Присутствуют</option>
            <option value="no" ${state.mgd === 'no' ? 'selected' : ''}>Не выявлены</option>
          </select>
        </div>
      </div>`;
  }

  function renderDrivers() {
    const risks = [
      ['glaucoma_drops', 'Длительная местная гипотензивная терапия', 'Учитываются консерванты и суммарная лекарственная нагрузка.'],
      ['recent_surgery', 'Недавняя офтальмологическая операция', 'Важны срок, тип вмешательства и состояние глазной поверхности.'],
      ['autoimmune', 'Аутоиммунное заболевание или выраженная сухость слизистых', 'Может потребовать системной оценки, включая синдром Шегрена.'],
      ['systemic_drugs', 'Системные препараты, способные усиливать сухость', 'Нужна лекарственная ревизия.'],
      ['exposure', 'Неполное смыкание век или экспозиция', 'Формирует самостоятельный этиологический драйвер.'],
      ['none', 'Значимые факторы не выявлены', 'По имеющимся данным.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Этиологические драйверы</p>
      <h2 class="question-title">Какие факторы могут поддерживать заболевание?</h2>
      <div class="option-grid">
        ${risks.map(([value, title, help]) => option('checkbox', 'risks', value, title, help, state.risks.includes(value))).join('')}
      </div>
      <div class="field" style="margin-top:24px">
        <label for="priorTreatment">Ранее проводившаяся терапия и эффект</label>
        <textarea id="priorTreatment" maxlength="800" placeholder="Без персональных данных пациента">${state.priorTreatment}</textarea>
      </div>`;
    setupExclusiveNone('risks');
  }

  function setupExclusiveNone(name) {
    content.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.addEventListener('change', () => {
        if (input.value === 'none' && input.checked) {
          content.querySelectorAll(`input[name="${name}"]:not([value="none"])`).forEach((item) => { item.checked = false; });
        }
        if (input.value !== 'none' && input.checked) {
          const none = content.querySelector(`input[name="${name}"][value="none"]`);
          if (none) none.checked = false;
        }
      });
    });
  }

  function collectCurrentStep() {
    if (state.step === 0) {
      state.accepted = Boolean(content.querySelector('input[name="accepted"]:checked'));
      if (!state.accepted) return showValidation('Подтвердите, что понимаете ограничения демонстрационной версии.');
    }
    if (state.step === 1) {
      const goal = content.querySelector('input[name="goal"]:checked');
      if (!goal) return showValidation('Выберите клиническую задачу.');
      state.goal = goal.value;
    }
    if (state.step === 2) {
      state.redFlags = selectedValues('redFlags');
      if (!state.redFlags.length) return showValidation('Отметьте выявленные признаки или вариант «перечисленных признаков нет».');
    }
    if (state.step === 3) {
      state.laterality = content.querySelector('#laterality').value;
      state.symptoms = selectedValues('symptoms');
      if (!state.symptoms.length) return showValidation('Отметьте хотя бы один симптом.');
    }
    if (state.step === 4) {
      state.osdi6 = content.querySelector('#osdi6').value;
      state.nibt = content.querySelector('#nibt').value;
      state.osmolarity = content.querySelector('#osmolarity').value;
      state.staining = content.querySelector('#staining').value;
      state.schirmer = content.querySelector('#schirmer').value;
      state.mgd = content.querySelector('#mgd').value;
    }
    if (state.step === 5) {
      state.risks = selectedValues('risks');
      state.priorTreatment = content.querySelector('#priorTreatment').value.trim();
      if (!state.risks.length) return showValidation('Отметьте факторы или вариант «значимые факторы не выявлены».');
    }
    return true;
  }

  function selectedValues(name) {
    return Array.from(content.querySelectorAll(`input[name="${name}"]:checked`)).map((item) => item.value);
  }

  function showValidation(message) {
    const existing = content.querySelector('.validation-message');
    if (existing) existing.remove();
    const box = document.createElement('div');
    box.className = 'result-block critical validation-message';
    box.style.marginTop = '18px';
    box.innerHTML = `<h3>Нужно уточнение</h3><p>${message}</p>`;
    content.appendChild(box);
    return false;
  }

  function hasCriticalFlags() {
    return state.redFlags.some((flag) => flag !== 'none');
  }

  function hasHomeostasisMarker() {
    const nibt = state.nibt === '' ? null : Number(state.nibt);
    return (nibt !== null && nibt < 10) || state.osmolarity === 'abnormal' || state.staining === 'abnormal';
  }

  function diagnosticFrame() {
    if (!state.osdi6) return 'Не оценивается: отсутствует результат OSDI-6.';
    if (state.osdi6 === 'negative') return 'Скрининг OSDI-6 отрицательный; данная диагностическая ветвь не подтверждает сухой глаз.';
    if (hasHomeostasisMarker()) return 'Положительный OSDI-6 сочетается как минимум с одним маркером нарушения гомеостаза; критерии диагностической рамки потенциально выполнены.';
    return 'OSDI-6 положительный, но подтверждающий маркер нарушения гомеостаза не получен или не введён.';
  }

  function determineDriver() {
    const schirmer = state.schirmer === '' ? null : Number(state.schirmer);
    const aqueousSignal = schirmer !== null && schirmer <= 5;
    const lidSignal = state.mgd === 'yes';

    if (aqueousSignal && lidSignal) return 'Смешанные драйверы: выраженный сигнал слёзодефицита и патология мейбомиевых желёз / края век';
    if (lidSignal) return 'Вероятный липидный или вековый драйвер, связанный с МГД';
    if (aqueousSignal) return 'Выраженный сигнал водного дефицита; требуется этиологическая оценка';
    if (state.symptoms.includes('discordant_pain')) return 'Возможный нейросенсорный драйвер при несоответствии симптомов и признаков';
    return 'Драйвер не классифицирован: нужны дополнительные этиологические тесты';
  }

  function missingData() {
    const missing = [];
    if (!state.laterality) missing.push('латеральность процесса');
    if (!state.osdi6) missing.push('валидированный скрининг симптомов OSDI-6');
    if (!hasHomeostasisMarker()) missing.push('как минимум один положительный маркер нарушения гомеостаза: NIBUT, осмолярность или окрашивание');
    if (!state.mgd) missing.push('оценка мейбомиевых желёз и края век');
    return missing;
  }

  function completenessPercent() {
    const checks = [
      Boolean(state.goal),
      state.redFlags.length > 0,
      state.symptoms.length > 0,
      Boolean(state.laterality),
      Boolean(state.osdi6),
      hasHomeostasisMarker(),
      Boolean(state.mgd),
      state.risks.length > 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  function updateSummary() {
    const criticalCount = state.redFlags.filter((flag) => flag !== 'none').length;
    summary.redFlags.textContent = !state.redFlags.length ? 'Не оценены' : criticalCount ? `Выявлено: ${criticalCount}` : 'Не выявлены';
    summary.phenotype.textContent = state.step >= 4 || state.resultMode ? determineDriver() : 'Не определён';
    summary.completeness.textContent = `${completenessPercent()}%`;
  }

  function showCriticalResult() {
    state.resultMode = true;
    progressBar.style.width = '100%';
    progressLabel.textContent = 'Алгоритм остановлен';
    summary.step.textContent = 'Требуется другой маршрут';
    summary.phenotype.textContent = 'Анализ драйверов не выполнялся';
    content.innerHTML = `
      <p class="question-kicker">Проверка безопасности</p>
      <h2 class="question-title">Плановый алгоритм остановлен</h2>
      <div class="result-grid">
        <div class="result-block critical">
          <h3>Выявлены признаки потенциально другого заболевания</h3>
          <p>Перед обсуждением сухого глаза требуется очная оценка и исключение поражения роговицы, воспалительной, инфекционной или другой угрожающей патологии.</p>
        </div>
        <div class="result-block caution">
          <h3>Почему система остановилась</h3>
          <p>Навигатор не должен маскировать опасный процесс плановыми рекомендациями по заболеванию глазной поверхности.</p>
        </div>
      </div>
      ${lockedTreatment()}`;
    nextButton.textContent = 'Начать заново';
    backButton.disabled = false;
    updateSummary();
  }

  function showFinalResult() {
    state.resultMode = true;
    const driver = determineDriver();
    const missing = missingData();
    const riskLabels = {
      glaucoma_drops: 'местная гипотензивная терапия',
      recent_surgery: 'недавнее офтальмологическое вмешательство',
      autoimmune: 'аутоиммунный или системный фактор',
      systemic_drugs: 'возможная лекарственная индукция',
      exposure: 'экспозиционный компонент'
    };
    const relevantRisks = state.risks.filter((item) => item !== 'none').map((item) => riskLabels[item]).filter(Boolean);

    progressBar.style.width = '100%';
    progressLabel.textContent = 'Предварительная карточка';
    summary.step.textContent = 'Результат сформирован';
    summary.phenotype.textContent = driver;
    summary.completeness.textContent = `${completenessPercent()}%`;

    content.innerHTML = `
      <p class="question-kicker">Демонстрационный результат</p>
      <h2 class="question-title">Предварительная клиническая структура</h2>
      <div class="result-grid">
        <div class="result-block safe">
          <h3>Красные флаги</h3>
          <p>По введённым ответам критические признаки не отмечены. Это не исключает патологию при неполных или ошибочных исходных данных.</p>
        </div>
        <div class="result-block">
          <h3>Диагностическая рамка</h3>
          <p>${diagnosticFrame()}</p>
        </div>
        <div class="result-block">
          <h3>Предварительный этиологический драйвер</h3>
          <p>${driver}.</p>
        </div>
        <div class="result-block ${missing.length ? 'caution' : ''}">
          <h3>Недостающие данные</h3>
          ${missing.length ? `<ul>${missing.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p>Ключевые поля демонстрационного алгоритма заполнены.</p>'}
        </div>
        <div class="result-block">
          <h3>Факторы, способные изменить тактику</h3>
          ${relevantRisks.length ? `<ul>${relevantRisks.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p>Значимые дополнительные факторы не указаны.</p>'}
        </div>
        <div class="result-block caution">
          <h3>Заболевания-маски и несоответствия</h3>
          <p>${state.symptoms.includes('discordant_pain') ? 'Отмечено несоответствие выраженности боли объективным признакам: необходима отдельная нейросенсорная ветвь.' : 'При атипичном, одностороннем или резистентном течении необходимо проверять поражение роговицы, экспозицию, токсическое воздействие препаратов, воспалительную и нейросенсорную патологию.'}</p>
        </div>
        <div class="result-block">
          <h3>Источник диагностической рамки</h3>
          <p>TFOS DEWS III: Diagnostic Methodology, 2025. В production-версии каждое утверждение будет связано с конкретной версией и разделом источника.</p>
        </div>
      </div>
      ${lockedTreatment()}`;

    nextButton.textContent = 'Начать заново';
    backButton.disabled = false;
  }

  function lockedTreatment() {
    return '<div class="prototype-lock"><span>🔒</span><div><strong>Лекарственные схемы намеренно не сформированы.</strong><br>Они будут подключены только после экспертной валидации источников, противопоказаний и правил безопасности.</div></div>';
  }

  function reset() {
    state = initialState();
    renderStep();
  }

  nextButton.addEventListener('click', () => {
    if (state.resultMode) return reset();
    if (!collectCurrentStep()) return;
    updateSummary();

    if (state.step === 2 && hasCriticalFlags()) return showCriticalResult();
    if (state.step === stepNames.length - 1) return showFinalResult();

    state.step += 1;
    renderStep();
  });

  backButton.addEventListener('click', () => {
    if (state.resultMode) {
      state.resultMode = false;
      state.step = hasCriticalFlags() ? 2 : stepNames.length - 1;
      renderStep();
      return;
    }
    if (state.step > 0) {
      collectCurrentStep();
      state.step -= 1;
      renderStep();
    }
  });

  renderStep();
})();
