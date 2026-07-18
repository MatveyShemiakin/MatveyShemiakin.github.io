(function () {
  'use strict';

  const content = document.getElementById('navigator-content');
  const actions = document.getElementById('navigator-actions');
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

  const state = {
    step: 0,
    resultMode: false,
    accepted: false,
    goal: '',
    redFlags: [],
    symptoms: [],
    laterality: '',
    tbut: '',
    schirmer: '',
    staining: '',
    mgd: '',
    risks: [],
    priorTreatment: ''
  };

  const stepNames = [
    'Условия использования',
    'Клиническая задача',
    'Проверка безопасности',
    'Симптомы',
    'Объективные данные',
    'Факторы риска'
  ];

  const option = (type, name, value, title, help, checked) => `
    <label class="option">
      <input type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
      <span><strong>${title}</strong>${help ? `<small>${help}</small>` : ''}</span>
    </label>`;

  function renderStep() {
    state.resultMode = false;
    actions.hidden = false;
    progressLabel.textContent = `Шаг ${state.step + 1} из ${stepNames.length}`;
    progressBar.style.width = `${((state.step + 1) / stepNames.length) * 100}%`;
    summary.step.textContent = stepNames[state.step];
    backButton.disabled = state.step === 0;
    nextButton.textContent = state.step === 0 ? 'Начать' : state.step === stepNames.length - 1 ? 'Сформировать результат' : 'Продолжить';

    const renderers = [renderIntro, renderGoal, renderRedFlags, renderSymptoms, renderMeasurements, renderRisks];
    renderers[state.step]();
    updateSummary();
  }

  function renderIntro() {
    content.innerHTML = `
      <p class="question-kicker">Перед началом</p>
      <h2 class="question-title">Демонстрационный режим</h2>
      <p class="question-help">Этот прототип проверяет структуру диалога, логику обязательных вопросов и блокировку небезопасного результата. Он не предназначен для диагностики или назначения лечения.</p>
      <div class="result-grid">
        <div class="result-block caution">
          <h3>Основные ограничения</h3>
          <ul>
            <li>не вводите персональные данные пациента;</li>
            <li>не используйте результат как медицинскую рекомендацию;</li>
            <li>лекарственный модуль в этой версии отключён;</li>
            <li>клинические ветви ещё проходят экспертную валидацию.</li>
          </ul>
        </div>
      </div>
      <div class="option-grid">
        ${option('checkbox', 'accepted', 'yes', 'Я понимаю ограничения прототипа', 'Продолжение доступно только после подтверждения.', state.accepted)}
      </div>`;
  }

  function renderGoal() {
    const choices = [
      ['phenotype', 'Определить вероятный фенотип', 'Структурировать признаки вододефицитного, испарительного или смешанного варианта.'],
      ['missing', 'Проверить полноту обследования', 'Определить, каких данных недостаточно для клинической классификации.'],
      ['refractory', 'Разобрать отсутствие эффекта', 'Проверить болезни-маски, факторы риска и возможное несоответствие диагноза.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Цель обращения</p>
      <h2 class="question-title">Какую задачу нужно решить?</h2>
      <p class="question-help">Выбранная задача определит приоритеты итоговой карточки.</p>
      <div class="option-grid">
        ${choices.map(([value, title, help]) => option('radio', 'goal', value, title, help, state.goal === value)).join('')}
      </div>`;
  }

  function renderRedFlags() {
    const flags = [
      ['vision_loss', 'Значимое или быстрое снижение зрения', 'Особенно при одностороннем остром процессе.'],
      ['severe_pain', 'Выраженная боль или светобоязнь', 'Симптомы, не соответствующие обычному дискомфорту при ССГ.'],
      ['infiltrate', 'Фокальный инфильтрат, дефект эпителия или выраженное окрашивание', 'Требует исключения инфекционного или иного поражения роговицы.'],
      ['acute_unilateral', 'Острый односторонний красный глаз', 'Нужна оценка альтернативного диагноза.'],
      ['contact_lens', 'Контактные линзы и острое ухудшение', 'Повышает настороженность в отношении кератита.'],
      ['none', 'Перечисленных признаков нет', 'Можно перейти к плановой фенотипизации.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Красные флаги</p>
      <h2 class="question-title">Есть ли признаки, требующие другого клинического маршрута?</h2>
      <p class="question-help">При наличии любого угрожающего признака обычный алгоритм ССГ будет остановлен.</p>
      <div class="option-grid">
        ${flags.map(([value, title, help]) => option('checkbox', 'redFlags', value, title, help, state.redFlags.includes(value))).join('')}
      </div>`;

    content.querySelectorAll('input[name="redFlags"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.value === 'none' && input.checked) {
          content.querySelectorAll('input[name="redFlags"]:not([value="none"])').forEach((item) => { item.checked = false; });
        }
        if (input.value !== 'none' && input.checked) {
          const none = content.querySelector('input[name="redFlags"][value="none"]');
          if (none) none.checked = false;
        }
      });
    });
  }

  function renderSymptoms() {
    const symptoms = [
      ['dryness', 'Сухость, жжение или ощущение песка', 'Типичный симптомокомплекс глазной поверхности.'],
      ['fluctuation', 'Флюктуация зрения и улучшение после моргания', 'Может поддерживать нестабильность слёзной плёнки.'],
      ['tearing', 'Рефлекторное слезотечение', 'Не исключает синдром сухого глаза.'],
      ['morning', 'Преобладание симптомов утром', 'Может потребовать оценки экспозиции и состояния век.'],
      ['screen', 'Усиление при зрительной нагрузке', 'Учитывается вместе с частотой моргания и условиями среды.'],
      ['discordant_pain', 'Боль значительно сильнее объективных признаков', 'Требует отдельной оценки возможной нейропатической боли.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Симптоматический профиль</p>
      <h2 class="question-title">Какие жалобы преобладают?</h2>
      <p class="question-help">Можно выбрать несколько вариантов.</p>
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

  function renderMeasurements() {
    content.innerHTML = `
      <p class="question-kicker">Объективные признаки</p>
      <h2 class="question-title">Введите доступные результаты обследования</h2>
      <p class="question-help">Можно оставить неизвестный показатель пустым. Итог укажет, какие данные необходимо дополнить.</p>
      <div class="inline-fields">
        <div class="field">
          <label for="tbut">TBUT / NIBUT, секунд</label>
          <input id="tbut" type="number" min="0" max="60" step="0.1" inputmode="decimal" value="${state.tbut}" placeholder="Например, 6">
        </div>
        <div class="field">
          <label for="schirmer">Тест Ширмера, мм</label>
          <input id="schirmer" type="number" min="0" max="50" step="1" inputmode="numeric" value="${state.schirmer}" placeholder="Например, 12">
        </div>
        <div class="field">
          <label for="staining">Окрашивание глазной поверхности</label>
          <select id="staining">
            <option value="">Не оценено</option>
            <option value="none" ${state.staining === 'none' ? 'selected' : ''}>Нет</option>
            <option value="mild" ${state.staining === 'mild' ? 'selected' : ''}>Минимальное</option>
            <option value="moderate" ${state.staining === 'moderate' ? 'selected' : ''}>Умеренное</option>
            <option value="severe" ${state.staining === 'severe' ? 'selected' : ''}>Выраженное</option>
          </select>
        </div>
        <div class="field">
          <label for="mgd">Признаки МГД</label>
          <select id="mgd">
            <option value="">Не оценены</option>
            <option value="yes" ${state.mgd === 'yes' ? 'selected' : ''}>Присутствуют</option>
            <option value="no" ${state.mgd === 'no' ? 'selected' : ''}>Не выявлены</option>
          </select>
        </div>
      </div>`;
  }

  function renderRisks() {
    const risks = [
      ['glaucoma_drops', 'Длительная местная гипотензивная терапия', 'Учитываются консерванты и суммарная лекарственная нагрузка.'],
      ['recent_surgery', 'Недавняя офтальмологическая операция', 'Важны срок, тип вмешательства и состояние эпителия.'],
      ['autoimmune', 'Аутоиммунное заболевание или выраженная сухость слизистых', 'Может требовать системной оценки, включая синдром Шегрена.'],
      ['systemic_drugs', 'Системные препараты, способные усиливать сухость', 'Необходима лекарственная ревизия.'],
      ['exposure', 'Неполное смыкание век или экспозиция', 'Требует отдельной защиты глазной поверхности.'],
      ['none', 'Значимые факторы не выявлены', 'По имеющимся данным.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Контекст заболевания</p>
      <h2 class="question-title">Какие факторы могут поддерживать процесс?</h2>
      <div class="option-grid">
        ${risks.map(([value, title, help]) => option('checkbox', 'risks', value, title, help, state.risks.includes(value))).join('')}
      </div>
      <div class="field" style="margin-top:24px">
        <label for="priorTreatment">Ранее проводившаяся терапия и эффект</label>
        <textarea id="priorTreatment" maxlength="800" placeholder="Без персональных данных пациента">${state.priorTreatment}</textarea>
      </div>`;

    content.querySelectorAll('input[name="risks"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.value === 'none' && input.checked) {
          content.querySelectorAll('input[name="risks"]:not([value="none"])').forEach((item) => { item.checked = false; });
        }
        if (input.value !== 'none' && input.checked) {
          const none = content.querySelector('input[name="risks"][value="none"]');
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
      state.redFlags = Array.from(content.querySelectorAll('input[name="redFlags"]:checked')).map((item) => item.value);
      if (!state.redFlags.length) return showValidation('Отметьте выявленные признаки или вариант «перечисленных признаков нет».');
    }

    if (state.step === 3) {
      state.laterality = content.querySelector('#laterality').value;
      state.symptoms = Array.from(content.querySelectorAll('input[name="symptoms"]:checked')).map((item) => item.value);
      if (!state.symptoms.length) return showValidation('Отметьте хотя бы один симптом или вернитесь для уточнения клинической задачи.');
    }

    if (state.step === 4) {
      state.tbut = content.querySelector('#tbut').value;
      state.schirmer = content.querySelector('#schirmer').value;
      state.staining = content.querySelector('#staining').value;
      state.mgd = content.querySelector('#mgd').value;
    }

    if (state.step === 5) {
      state.risks = Array.from(content.querySelectorAll('input[name="risks"]:checked')).map((item) => item.value);
      state.priorTreatment = content.querySelector('#priorTreatment').value.trim();
      if (!state.risks.length) return showValidation('Отметьте факторы риска или вариант «значимые факторы не выявлены».');
    }

    return true;
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

  function determinePhenotype() {
    const tbut = state.tbut === '' ? null : Number(state.tbut);
    const schirmer = state.schirmer === '' ? null : Number(state.schirmer);
    const evaporative = state.mgd === 'yes' && tbut !== null && tbut <= 10;
    const aqueous = schirmer !== null && schirmer <= 5;

    if (evaporative && aqueous) return 'Смешанный фенотип: признаки испарительного и вододефицитного компонентов';
    if (evaporative) return 'Преимущественно испарительный фенотип / МГД';
    if (aqueous) return 'Вероятный вододефицитный фенотип';
    if (tbut !== null && tbut > 10 && schirmer !== null && schirmer > 5 && state.staining === 'none') return 'Объективных данных для подтверждения ССГ недостаточно';
    return 'Фенотип не определён: требуется дополнение объективных данных';
  }

  function missingData() {
    const missing = [];
    if (!state.laterality) missing.push('латеральность процесса');
    if (state.tbut === '') missing.push('стабильность слёзной плёнки (TBUT/NIBUT)');
    if (state.schirmer === '') missing.push('оценка слёзопродукции');
    if (!state.staining) missing.push('окрашивание глазной поверхности');
    if (!state.mgd) missing.push('оценка мейбомиевых желёз');
    return missing;
  }

  function completenessPercent() {
    const checks = [
      Boolean(state.goal),
      state.redFlags.length > 0,
      state.symptoms.length > 0,
      Boolean(state.laterality),
      state.tbut !== '',
      state.schirmer !== '',
      Boolean(state.staining),
      Boolean(state.mgd),
      state.risks.length > 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  function updateSummary() {
    const criticalCount = state.redFlags.filter((flag) => flag !== 'none').length;
    summary.redFlags.textContent = !state.redFlags.length ? 'Не оценены' : criticalCount ? `Выявлено: ${criticalCount}` : 'Не выявлены';
    summary.phenotype.textContent = state.step >= 4 || state.resultMode ? determinePhenotype() : 'Не определён';
    summary.completeness.textContent = `${completenessPercent()}%`;
  }

  function showCriticalResult() {
    state.resultMode = true;
    progressBar.style.width = '100%';
    progressLabel.textContent = 'Алгоритм остановлен';
    summary.step.textContent = 'Требуется другой маршрут';
    summary.phenotype.textContent = 'Фенотипизация ССГ не выполнялась';
    content.innerHTML = `
      <p class="question-kicker">Результат проверки безопасности</p>
      <h2 class="question-title">Обычный алгоритм ССГ остановлен</h2>
      <div class="result-grid">
        <div class="result-block critical">
          <h3>Выявлены признаки потенциально другого заболевания</h3>
          <p>Перед плановой фенотипизацией синдрома сухого глаза требуется очная оценка и исключение поражения роговицы, воспалительного, инфекционного или иного угрожающего состояния.</p>
        </div>
        <div class="result-block caution">
          <h3>Логика прототипа</h3>
          <p>Система намеренно не продолжает формировать плановую тактику и не показывает лекарственные варианты при наличии красных флагов.</p>
        </div>
      </div>
      <div class="prototype-lock"><span>🔒</span><div><strong>Фармакотерапевтический блок недоступен.</strong><br>Он будет подключён только после экспертной валидации источников и правил безопасности.</div></div>`;
    nextButton.textContent = 'Начать заново';
    backButton.disabled = false;
    updateSummary();
  }

  function showFinalResult() {
    state.resultMode = true;
    const phenotype = determinePhenotype();
    const missing = missingData();
    progressBar.style.width = '100%';
    progressLabel.textContent = 'Предварительная карточка';
    summary.step.textContent = 'Результат сформирован';
    summary.phenotype.textContent = phenotype;
    summary.completeness.textContent = `${completenessPercent()}%`;

    const riskLabels = {
      glaucoma_drops: 'местная гипотензивная терапия',
      recent_surgery: 'недавнее офтальмологическое вмешательство',
      autoimmune: 'аутоиммунный или системный фактор',
      systemic_drugs: 'возможная лекарственная индукция',
      exposure: 'экспозиционный компонент'
    };
    const relevantRisks = state.risks.filter((item) => item !== 'none').map((item) => riskLabels[item]).filter(Boolean);

    content.innerHTML = `
      <p class="question-kicker">Демонстрационный результат</p>
      <h2 class="question-title">Предварительная клиническая структура</h2>
      <div class="result-grid">
        <div class="result-block safe">
          <h3>Красные флаги</h3>
          <p>По введённым ответам критические признаки не отмечены. Это не исключает патологию, если исходные данные неполны или ошибочны.</p>
        </div>
        <div class="result-block">
          <h3>Предварительный фенотип</h3>
          <p>${phenotype}.</p>
        </div>
        <div class="result-block ${missing.length ? 'caution' : ''}">
          <h3>Полнота обследования</h3>
          ${missing.length ? `<p>Для более надёжной классификации необходимо дополнить:</p><ul>${missing.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p>Основные поля пилотного алгоритма заполнены.</p>'}
        </div>
        <div class="result-block">
          <h3>Факторы, способные изменить тактику</h3>
          ${relevantRisks.length ? `<ul>${relevantRisks.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p>В выбранных вариантах значимые дополнительные факторы не указаны.</p>'}
        </div>
        <div class="result-block caution">
          <h3>Заболевания-маски и несоответствия</h3>
          <p>${state.symptoms.includes('discordant_pain') ? 'Отмечено несоответствие боли объективным признакам: в будущем модуле будет обязательна ветвь оценки нейропатического компонента.' : 'При атипичном, одностороннем или резистентном течении алгоритм должен отдельно проверять поражение роговицы, экспозицию, токсическое воздействие препаратов, воспалительную и нейропатическую патологию.'}</p>
        </div>
      </div>
      <div class="prototype-lock"><span>🔒</span><div><strong>Лекарственные схемы намеренно не сформированы.</strong><br>Следующая версия будет получать МНН, дозы, длительность и ограничения только из утверждённой структурированной базы.</div></div>`;

    nextButton.textContent = 'Начать заново';
    backButton.disabled = false;
  }

  function reset() {
    Object.assign(state, {
      step: 0,
      resultMode: false,
      accepted: false,
      goal: '',
      redFlags: [],
      symptoms: [],
      laterality: '',
      tbut: '',
      schirmer: '',
      staining: '',
      mgd: '',
      risks: [],
      priorTreatment: ''
    });
    renderStep();
  }

  nextButton.addEventListener('click', () => {
    if (state.resultMode) {
      reset();
      return;
    }
    if (!collectCurrentStep()) return;
    updateSummary();

    if (state.step === 2 && hasCriticalFlags()) {
      showCriticalResult();
      return;
    }

    if (state.step === stepNames.length - 1) {
      showFinalResult();
      return;
    }

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
