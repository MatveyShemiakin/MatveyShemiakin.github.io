(function () {
  'use strict';

  const content = document.getElementById('navigator-content');
  const backButton = document.getElementById('back-button');
  const nextButton = document.getElementById('next-button');
  const demoButton = document.getElementById('demo-button');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const stepRail = document.getElementById('step-rail');
  const caseStatus = document.getElementById('case-status');

  const summary = {
    step: document.getElementById('summary-step'),
    urgency: document.getElementById('summary-urgency'),
    diagnosis: document.getElementById('summary-diagnosis'),
    completeness: document.getElementById('summary-completeness')
  };

  const driverElements = {
    lipid: document.getElementById('driver-lipid'),
    aqueous: document.getElementById('driver-aqueous'),
    exposure: document.getElementById('driver-exposure'),
    iatrogenic: document.getElementById('driver-iatrogenic'),
    neurosensory: document.getElementById('driver-neurosensory')
  };

  const initialState = () => ({
    step: 0,
    resultMode: false,
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
    tearMeniscus: '',
    mgd: '',
    lidMargin: '',
    meibum: '',
    blink: '',
    lagophthalmos: '',
    meibography: '',
    risks: [],
    masquerades: [],
    priorTreatment: ''
  });

  let state = initialState();

  const steps = [
    ['Условия', 'Ограничения прототипа'],
    ['Задача', 'Цель клинического обращения'],
    ['Безопасность', 'Красные флаги'],
    ['Симптомы', 'Симптоматический профиль'],
    ['Гомеостаз', 'Диагностические маркеры'],
    ['Веки и МГД', 'Вековый и липидный компонент'],
    ['Драйверы', 'Этиологические факторы'],
    ['Маски', 'Несоответствия и заболевания-маски']
  ];

  const option = (type, name, value, title, help, checked) => `
    <label class="option">
      <input type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
      <span><strong>${title}</strong>${help ? `<small>${help}</small>` : ''}</span>
    </label>`;

  function renderRail() {
    stepRail.innerHTML = steps.map((_, index) => {
      const className = index < state.step || state.resultMode ? 'step-dot done' : index === state.step ? 'step-dot active' : 'step-dot';
      return `<span class="${className}" aria-hidden="true"></span>`;
    }).join('');
  }

  function renderStep() {
    state.resultMode = false;
    progressLabel.textContent = `Шаг ${state.step + 1} из ${steps.length}`;
    progressBar.style.width = `${((state.step + 1) / steps.length) * 100}%`;
    summary.step.textContent = steps[state.step][1];
    caseStatus.textContent = 'Сбор данных';
    backButton.disabled = state.step === 0;
    demoButton.hidden = state.step !== 0;
    nextButton.textContent = state.step === 0 ? 'Начать' : state.step === steps.length - 1 ? 'Сформировать карточку' : 'Продолжить';

    [
      renderIntro,
      renderGoal,
      renderRedFlags,
      renderSymptoms,
      renderDiagnostics,
      renderLids,
      renderDrivers,
      renderMasquerades
    ][state.step]();

    renderRail();
    updateSummary();
  }

  function renderIntro() {
    content.innerHTML = `
      <p class="question-kicker">Перед началом</p>
      <h2 class="question-title">Управляемый клинический сценарий</h2>
      <p class="question-help">Прототип демонстрирует последовательность вопросов, остановку опасной ветви и итоговую карту клинических драйверов. Лекарственный модуль намеренно отключён.</p>
      <div class="context-strip">
        <span class="context-chip">8 этапов</span>
        <span class="context-chip">обезличенные данные</span>
        <span class="context-chip">TFOS DEWS III</span>
        <span class="context-chip">без автономных назначений</span>
      </div>
      <div class="result-grid">
        <div class="result-block caution wide">
          <h3>Ограничения демонстрационной версии</h3>
          <ul>
            <li>не вводите персональные данные пациента;</li>
            <li>не используйте результат для диагностики или изменения терапии;</li>
            <li>клинические правила и формулировки проходят экспертную проверку;</li>
            <li>источники и лекарственные схемы будут подключаться только после валидации.</li>
          </ul>
        </div>
      </div>
      <div class="option-grid">
        ${option('checkbox', 'accepted', 'yes', 'Я понимаю ограничения прототипа', 'Продолжение доступно после подтверждения.', state.accepted)}
      </div>`;
  }

  function renderGoal() {
    const choices = [
      ['framework', 'Проверить диагностическую рамку', 'Сопоставить симптоматику с маркерами нарушения гомеостаза слёзной плёнки и глазной поверхности.'],
      ['drivers', 'Определить ведущие этиологические драйверы', 'Оценить липидный, водный, экспозиционный, ятрогенный и нейросенсорный компоненты.'],
      ['refractory', 'Разобрать отсутствие эффекта от терапии', 'Проверить заболевания-маски, приверженность, несоответствие симптомов и объективных признаков.'],
      ['preop', 'Оценить глазную поверхность перед операцией', 'Структурировать факторы риска до рефракционной или внутриглазной хирургии.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Цель обращения</p>
      <h2 class="question-title">Какую задачу должен решить навигатор?</h2>
      <p class="question-help">От выбранной задачи зависит акцент итоговой карточки и перечень недостающих данных.</p>
      <div class="option-grid">
        ${choices.map(([value, title, help]) => option('radio', 'goal', value, title, help, state.goal === value)).join('')}
      </div>`;
  }

  function renderRedFlags() {
    const flags = [
      ['vision_loss', 'Значимое или быстрое снижение зрения', 'Особенно при остром, одностороннем или асимметричном процессе.'],
      ['severe_pain', 'Выраженная боль или светобоязнь', 'Не соответствует типичному дискомфорту при неосложнённом сухом глазе.'],
      ['corneal_lesion', 'Фокальный инфильтрат, дефект эпителия или выраженное поражение роговицы', 'Требует исключения инфекционной, нейротрофической и иной угрожающей патологии.'],
      ['acute_unilateral', 'Острый односторонний красный глаз', 'Нужна приоритетная оценка альтернативного диагноза.'],
      ['contact_lens', 'Контактные линзы в сочетании с острым ухудшением', 'Повышает настороженность в отношении микробного кератита.'],
      ['trauma_chemical', 'Недавняя травма или химическое воздействие', 'Требует отдельного маршрута и оценки повреждения глазной поверхности.'],
      ['postop_acute', 'Острое ухудшение после операции или инъекции', 'Не должно маскироваться под плановый послеоперационный сухой глаз.'],
      ['none', 'Перечисленных признаков нет', 'Можно перейти к плановой диагностической рамке.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Проверка безопасности</p>
      <h2 class="question-title">Есть ли признаки, требующие другого маршрута?</h2>
      <p class="question-help">При наличии хотя бы одного критического признака плановый алгоритм ССГ/МГД будет остановлен.</p>
      <div class="option-grid">
        ${flags.map(([value, title, help]) => option('checkbox', 'redFlags', value, title, help, state.redFlags.includes(value))).join('')}
      </div>`;
    setupExclusiveNone('redFlags');
  }

  function renderSymptoms() {
    const symptoms = [
      ['dryness', 'Сухость, жжение или ощущение инородного тела', 'Типичная симптоматика глазной поверхности.'],
      ['fluctuation', 'Флюктуация зрения и улучшение после моргания', 'Поддерживает нестабильность слёзной плёнки.'],
      ['tearing', 'Рефлекторное слезотечение', 'Не исключает сухой глаз и может сопровождать нестабильную слёзную плёнку.'],
      ['morning', 'Преобладание симптомов утром', 'Требует оценки ночной экспозиции, эрозии и смыкания век.'],
      ['evening', 'Нарастание симптомов к вечеру', 'Может сопровождать зрительную нагрузку и испарительный компонент.'],
      ['screen', 'Усиление при работе с экраном или чтении', 'Нужно оценивать частоту и полноту моргания.'],
      ['itching', 'Зуд как ведущая жалоба', 'Повышает вероятность аллергического компонента.'],
      ['discordant_pain', 'Боль значительно сильнее объективных признаков', 'Требует отдельной нейросенсорной или нейропатической ветви.']
    ];
    content.innerHTML = `
      <p class="question-kicker">Симптоматический профиль</p>
      <h2 class="question-title">Как проявляется заболевание?</h2>
      <p class="question-help">Можно выбрать несколько жалоб. Далее они будут сопоставлены с объективными маркерами.</p>
      <div class="inline-fields three">
        <div class="field">
          <label for="laterality">Латеральность</label>
          <select id="laterality">
            <option value="">Не указано</option>
            <option value="bilateral" ${state.laterality === 'bilateral' ? 'selected' : ''}>Двусторонний процесс</option>
            <option value="unilateral" ${state.laterality === 'unilateral' ? 'selected' : ''}>Односторонний процесс</option>
            <option value="asymmetric" ${state.laterality === 'asymmetric' ? 'selected' : ''}>Двусторонний асимметричный</option>
          </select>
        </div>
        <div class="field">
          <label for="onset">Течение</label>
          <select id="onset">
            <option value="">Не указано</option>
            <option value="acute" ${state.onset === 'acute' ? 'selected' : ''}>Острое</option>
            <option value="subacute" ${state.onset === 'subacute' ? 'selected' : ''}>Подострое</option>
            <option value="chronic" ${state.onset === 'chronic' ? 'selected' : ''}>Хроническое / рецидивирующее</option>
          </select>
        </div>
        <div class="field">
          <label for="severity">Влияние на повседневную активность</label>
          <select id="severity">
            <option value="">Не указано</option>
            <option value="mild" ${state.severity === 'mild' ? 'selected' : ''}>Незначительное</option>
            <option value="moderate" ${state.severity === 'moderate' ? 'selected' : ''}>Умеренное</option>
            <option value="severe" ${state.severity === 'severe' ? 'selected' : ''}>Выраженное</option>
          </select>
        </div>
      </div>
      <div class="option-grid">
        ${symptoms.map(([value, title, help]) => option('checkbox', 'symptoms', value, title, help, state.symptoms.includes(value))).join('')}
      </div>`;
  }

  function renderDiagnostics() {
    content.innerHTML = `
      <p class="question-kicker">Нарушение гомеостаза</p>
      <h2 class="question-title">Какие объективные данные получены?</h2>
      <p class="question-help">В рамке TFOS DEWS III положительная симптоматика должна сочетаться как минимум с одним объективным маркером нарушения гомеостаза. Тест Ширмера и высота слёзного мениска используются для анализа водного драйвера.</p>
      <div class="inline-fields">
        <div class="field"><label for="osdi6">OSDI-6</label><select id="osdi6"><option value="">Не выполнен / неизвестен</option><option value="positive" ${state.osdi6 === 'positive' ? 'selected' : ''}>Положительный, ≥4</option><option value="negative" ${state.osdi6 === 'negative' ? 'selected' : ''}>Отрицательный, &lt;4</option></select></div>
        <div class="field"><label for="nibt">NIBUT, секунд</label><input id="nibt" type="number" min="0" max="60" step="0.1" inputmode="decimal" value="${state.nibt}" placeholder="Например, 6.8"><span class="field-note">Значение &lt;10 с рассматривается как положительный маркер в текущей демонстрационной логике.</span></div>
        <div class="field"><label for="osmolarity">Осмолярность слезы</label><select id="osmolarity"><option value="">Не оценена</option><option value="abnormal" ${state.osmolarity === 'abnormal' ? 'selected' : ''}>Аномальная по критериям метода</option><option value="normal" ${state.osmolarity === 'normal' ? 'selected' : ''}>В пределах критериев метода</option></select></div>
        <div class="field"><label for="staining">Окрашивание глазной поверхности</label><select id="staining"><option value="">Не оценено</option><option value="abnormal" ${state.staining === 'abnormal' ? 'selected' : ''}>Аномальное по валидированной шкале</option><option value="normal" ${state.staining === 'normal' ? 'selected' : ''}>Не достигает диагностического порога</option></select></div>
        <div class="field"><label for="schirmer">Тест Ширмера, мм / 5 мин</label><input id="schirmer" type="number" min="0" max="50" step="1" inputmode="numeric" value="${state.schirmer}" placeholder="Например, 4"></div>
        <div class="field"><label for="tearMeniscus">Высота слёзного мениска</label><select id="tearMeniscus"><option value="">Не оценена</option><option value="low" ${state.tearMeniscus === 'low' ? 'selected' : ''}>Снижена</option><option value="normal" ${state.tearMeniscus === 'normal' ? 'selected' : ''}>Не снижена</option></select></div>
      </div>`;
  }

  function renderLids() {
    content.innerHTML = `
      <p class="question-kicker">Вековый и липидный компонент</p>
      <h2 class="question-title">Что выявлено при оценке век и мейбомиевых желёз?</h2>
      <p class="question-help">Отдельная оценка края век, качества секрета, экспрессируемости, моргания и смыкания век помогает определить ведущий механизм, а не только степень выраженности симптомов.</p>
      <div class="inline-fields">
        <div class="field"><label for="mgd">Клинические признаки МГД</label><select id="mgd"><option value="">Не оценены</option><option value="yes" ${state.mgd === 'yes' ? 'selected' : ''}>Присутствуют</option><option value="no" ${state.mgd === 'no' ? 'selected' : ''}>Не выявлены</option></select></div>
        <div class="field"><label for="lidMargin">Край век</label><select id="lidMargin"><option value="">Не оценён</option><option value="abnormal" ${state.lidMargin === 'abnormal' ? 'selected' : ''}>Телеангиэктазии / пробки / воспаление</option><option value="normal" ${state.lidMargin === 'normal' ? 'selected' : ''}>Без значимых изменений</option></select></div>
        <div class="field"><label for="meibum">Качество и экспрессируемость секрета</label><select id="meibum"><option value="">Не оценены</option><option value="abnormal" ${state.meibum === 'abnormal' ? 'selected' : ''}>Снижены / изменены</option><option value="normal" ${state.meibum === 'normal' ? 'selected' : ''}>Без значимых изменений</option></select></div>
        <div class="field"><label for="blink">Моргание</label><select id="blink"><option value="">Не оценено</option><option value="incomplete" ${state.blink === 'incomplete' ? 'selected' : ''}>Неполное или редкое</option><option value="normal" ${state.blink === 'normal' ? 'selected' : ''}>Полное, без явного снижения частоты</option></select></div>
        <div class="field"><label for="lagophthalmos">Смыкание век / экспозиция</label><select id="lagophthalmos"><option value="">Не оценено</option><option value="yes" ${state.lagophthalmos === 'yes' ? 'selected' : ''}>Есть неполное смыкание или экспозиция</option><option value="no" ${state.lagophthalmos === 'no' ? 'selected' : ''}>Не выявлены</option></select></div>
        <div class="field"><label for="meibography">Мейбография</label><select id="meibography"><option value="">Не выполнялась</option><option value="abnormal" ${state.meibography === 'abnormal' ? 'selected' : ''}>Есть структурные изменения / dropout</option><option value="normal" ${state.meibography === 'normal' ? 'selected' : ''}>Без значимых структурных изменений</option></select></div>
      </div>`;
  }

  function renderDrivers() {
    const risks = [
      ['glaucoma_drops', 'Длительная местная гипотензивная терапия', 'Учитываются консерванты и суммарная лекарственная нагрузка.'],
      ['recent_surgery', 'Недавняя офтальмологическая операция', 'Важны срок, тип вмешательства и предоперационное состояние глазной поверхности.'],
      ['refractive_surgery', 'Рефракционная хирургия в анамнезе', 'Может менять чувствительность и нейросенсорный профиль.'],
      ['autoimmune', 'Аутоиммунное заболевание или выраженная сухость других слизистых', 'Требует оценки системного вододефицитного драйвера, включая синдром Шегрена.'],
      ['systemic_drugs', 'Системные препараты, способные усиливать сухость', 'Нужна лекарственная ревизия.'],
      ['contact_lenses_chronic', 'Регулярное ношение контактных линз', 'Может поддерживать нестабильность и воспаление глазной поверхности.'],
      ['screen_environment', 'Высокая экранная нагрузка или сухая среда', 'Связано с морганием и повышенным испарением.'],
      ['rosacea', 'Розацеа или себорейный дерматит', 'Поддерживает вековый и воспалительный компонент.'],
      ['none', 'Значимые факторы не выявлены', 'По имеющимся данным.']
    ];
    content.innerHTML = `<p class="question-kicker">Этиологические драйверы</p><h2 class="question-title">Какие факторы могут поддерживать заболевание?</h2><p class="question-help">Факторы не заменяют диагноз, но помогают построить персонализированную карту механизмов.</p><div class="option-grid">${risks.map(([value,title,help]) => option('checkbox','risks',value,title,help,state.risks.includes(value))).join('')}</div>`;
    setupExclusiveNone('risks');
  }

  function renderMasquerades() {
    const masks = [
      ['allergy', 'Аллергическое заболевание глазной поверхности', 'Особенно при ведущем зуде, хемозе и сезонности.'],
      ['erosion', 'Рецидивирующая эрозия роговицы', 'Подозревать при утренней боли и эпизодическом дефекте эпителия.'],
      ['neuropathic', 'Нейропатическая глазная боль', 'Возможна при выраженном несоответствии симптомов и объективных признаков.'],
      ['exposure_mask', 'Экспозиционная кератопатия', 'Связана со смыканием век, положением глазного яблока и ночной экспозицией.'],
      ['conjunctivochalasis', 'Конъюнктивохалазис или нарушение распределения слезы', 'Может вызывать слезотечение и локальный дискомфорт.'],
      ['demodex', 'Demodex-ассоциированный блефарит', 'Требует целевого осмотра ресниц и края век.'],
      ['neurotrophic', 'Нейротрофическая кератопатия', 'Нужна оценка чувствительности роговицы при несоответствии симптомов и повреждения.'],
      ['none', 'Явные заболевания-маски не подозреваются', 'По имеющимся данным.']
    ];
    content.innerHTML = `<p class="question-kicker">Дифференциальная диагностика</p><h2 class="question-title">Какие заболевания-маски или несоответствия нужно проверить?</h2><p class="question-help">Навигатор не должен сводить любой хронический дискомфорт глаз к сухому глазу.</p><div class="option-grid">${masks.map(([value,title,help]) => option('checkbox','masquerades',value,title,help,state.masquerades.includes(value))).join('')}</div><div class="field" style="margin-top:22px"><label for="priorTreatment">Ранее проводившаяся терапия и эффект</label><textarea id="priorTreatment" maxlength="800" placeholder="Кратко, без персональных данных пациента">${escapeHtml(state.priorTreatment)}</textarea></div>`;
    setupExclusiveNone('masquerades');
  }

  function setupExclusiveNone(name) {
    content.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.addEventListener('change', () => {
        if (input.value === 'none' && input.checked) content.querySelectorAll(`input[name="${name}"]:not([value="none"])`).forEach((item) => { item.checked = false; });
        if (input.value !== 'none' && input.checked) { const none = content.querySelector(`input[name="${name}"][value="none"]`); if (none) none.checked = false; }
      });
    });
  }

  function selectedValues(name) { return Array.from(content.querySelectorAll(`input[name="${name}"]:checked`)).map((item) => item.value); }

  function collectCurrentStep(silent) {
    if (state.step === 0) { state.accepted = Boolean(content.querySelector('input[name="accepted"]:checked')); if (!state.accepted && !silent) return showValidation('Подтвердите, что понимаете ограничения демонстрационной версии.'); }
    if (state.step === 1) { const goal = content.querySelector('input[name="goal"]:checked'); if (!goal && !silent) return showValidation('Выберите клиническую задачу.'); if (goal) state.goal = goal.value; }
    if (state.step === 2) { state.redFlags = selectedValues('redFlags'); if (!state.redFlags.length && !silent) return showValidation('Отметьте выявленные признаки или вариант «перечисленных признаков нет».'); }
    if (state.step === 3) { state.laterality=content.querySelector('#laterality').value; state.onset=content.querySelector('#onset').value; state.severity=content.querySelector('#severity').value; state.symptoms=selectedValues('symptoms'); if (!state.symptoms.length && !silent) return showValidation('Отметьте хотя бы один симптом.'); }
    if (state.step === 4) { state.osdi6=content.querySelector('#osdi6').value; state.nibt=content.querySelector('#nibt').value; state.osmolarity=content.querySelector('#osmolarity').value; state.staining=content.querySelector('#staining').value; state.schirmer=content.querySelector('#schirmer').value; state.tearMeniscus=content.querySelector('#tearMeniscus').value; }
    if (state.step === 5) { state.mgd=content.querySelector('#mgd').value; state.lidMargin=content.querySelector('#lidMargin').value; state.meibum=content.querySelector('#meibum').value; state.blink=content.querySelector('#blink').value; state.lagophthalmos=content.querySelector('#lagophthalmos').value; state.meibography=content.querySelector('#meibography').value; }
    if (state.step === 6) { state.risks=selectedValues('risks'); if (!state.risks.length && !silent) return showValidation('Отметьте факторы или вариант «значимые факторы не выявлены».'); }
    if (state.step === 7) { state.masquerades=selectedValues('masquerades'); state.priorTreatment=content.querySelector('#priorTreatment').value.trim(); if (!state.masquerades.length && !silent) return showValidation('Отметьте заболевания-маски или вариант «не подозреваются».'); }
    return true;
  }

  function showValidation(message) { const existing=content.querySelector('.validation-message'); if(existing) existing.remove(); const box=document.createElement('div'); box.className='result-block critical validation-message'; box.style.marginTop='18px'; box.innerHTML=`<h3>Нужно уточнение</h3><p>${message}</p>`; content.appendChild(box); return false; }
  function hasCriticalFlags(){return state.redFlags.some((flag)=>flag!=='none');}
  function hasHomeostasisMarker(){const nibt=state.nibt===''?null:Number(state.nibt); return (nibt!==null&&nibt<10)||state.osmolarity==='abnormal'||state.staining==='abnormal';}

  function diagnosticStatus(){
    if(!state.osdi6) return {label:'Неполные данные',detail:'Отсутствует валидированный скрининг симптомов OSDI-6.',tone:'caution'};
    if(state.osdi6==='positive'&&hasHomeostasisMarker()) return {label:'Рамка потенциально выполнена',detail:'Положительный OSDI-6 сочетается как минимум с одним маркером нарушения гомеостаза.',tone:'safe'};
    if(state.osdi6==='negative'&&hasHomeostasisMarker()) return {label:'Несоответствие симптомов и признаков',detail:'Объективный маркер присутствует при отрицательном OSDI-6: требуется оценка иной патологии, факторов чувствительности и клинического контекста.',tone:'caution'};
    if(state.osdi6==='positive') return {label:'Требуется подтверждающий маркер',detail:'Симптоматический скрининг положительный, но объективный маркер нарушения гомеостаза не введён или не достиг порога.',tone:'caution'};
    return {label:'Рамка не подтверждена',detail:'Текущая ветвь не подтверждает сухой глаз; требуется клиническая переоценка жалоб и альтернативных причин.',tone:'info'};
  }

  function driverScores(){
    const schirmer=state.schirmer===''?null:Number(state.schirmer); const scores={lipid:0,aqueous:0,exposure:0,iatrogenic:0,neurosensory:0};
    if(state.mgd==='yes') scores.lipid+=2; if(state.lidMargin==='abnormal') scores.lipid+=1; if(state.meibum==='abnormal') scores.lipid+=2; if(state.meibography==='abnormal') scores.lipid+=1; if(state.risks.includes('rosacea')) scores.lipid+=1; if(state.blink==='incomplete') scores.lipid+=1;
    if(schirmer!==null&&schirmer<=5) scores.aqueous+=3; else if(schirmer!==null&&schirmer<=10) scores.aqueous+=1; if(state.tearMeniscus==='low') scores.aqueous+=2; if(state.risks.includes('autoimmune')) scores.aqueous+=2;
    if(state.lagophthalmos==='yes') scores.exposure+=3; if(state.blink==='incomplete') scores.exposure+=1; if(state.symptoms.includes('morning')) scores.exposure+=1; if(state.masquerades.includes('exposure_mask')) scores.exposure+=2;
    ['glaucoma_drops','recent_surgery','refractive_surgery','systemic_drugs','contact_lenses_chronic'].forEach((risk)=>{if(state.risks.includes(risk)) scores.iatrogenic+=1.4;});
    if(state.symptoms.includes('discordant_pain')) scores.neurosensory+=3; if(state.masquerades.includes('neuropathic')) scores.neurosensory+=3; if(state.risks.includes('refractive_surgery')) scores.neurosensory+=1;
    Object.keys(scores).forEach((key)=>{scores[key]=Math.min(10,Math.round(scores[key]*10)/10);}); return scores;
  }

  function scorePercent(score){return Math.min(100,Math.round((score/8)*100));}
  function driverLabel(scores){const labels={lipid:'липидный / вековый',aqueous:'водный',exposure:'экспозиционный',iatrogenic:'ятрогенный',neurosensory:'нейросенсорный'}; const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]); if(!sorted[0]||sorted[0][1]===0) return 'Драйверы не классифицированы'; if(sorted[1]&&sorted[1][1]>=sorted[0][1]-1&&sorted[1][1]>0) return `Смешанный профиль: ${labels[sorted[0][0]]} + ${labels[sorted[1][0]]}`; return `Ведущий ${labels[sorted[0][0]]} драйвер`;}

  function missingData(){const missing=[]; if(!state.laterality) missing.push('латеральность процесса'); if(!state.onset) missing.push('характер течения'); if(!state.osdi6) missing.push('валидированный скрининг симптомов OSDI-6'); if(!hasHomeostasisMarker()) missing.push('положительный объективный маркер нарушения гомеостаза'); if(!state.mgd) missing.push('оценка мейбомиевых желёз'); if(!state.meibum) missing.push('качество и экспрессируемость секрета'); if(!state.blink) missing.push('полнота и частота моргания'); if(!state.lagophthalmos) missing.push('смыкание век и экспозиция'); return missing;}
  function completenessPercent(){const checks=[Boolean(state.goal),state.redFlags.length>0,state.symptoms.length>0,Boolean(state.laterality),Boolean(state.onset),Boolean(state.osdi6),hasHomeostasisMarker(),Boolean(state.mgd),Boolean(state.meibum),Boolean(state.blink),Boolean(state.lagophthalmos),state.risks.length>0,state.masquerades.length>0]; return Math.round((checks.filter(Boolean).length/checks.length)*100);}
  function urgencyLabel(){if(!state.redFlags.length) return 'Не оценена'; return hasCriticalFlags()?'Другой / неотложный маршрут':'Плановая ветвь';}

  function updateSummary(){const diagnosis=diagnosticStatus(); const scores=driverScores(); summary.urgency.textContent=urgencyLabel(); summary.diagnosis.textContent=state.step>=4||state.resultMode?diagnosis.label:'Не оценена'; summary.completeness.textContent=`${completenessPercent()}%`; Object.entries(driverElements).forEach(([key,element])=>{element.style.width=`${scorePercent(scores[key])}%`;});}

  function maskAlerts(){const alerts=[]; if(state.laterality==='unilateral') alerts.push('односторонний процесс требует более широкой дифференциальной диагностики'); if(state.onset==='acute') alerts.push('острое начало нетипично для плановой ветви хронического ССГ'); if(state.symptoms.includes('itching')) alerts.push('ведущий зуд требует оценки аллергического компонента'); if(state.symptoms.includes('morning')) alerts.push('утренние симптомы требуют исключения экспозиции и рецидивирующей эрозии'); if(state.symptoms.includes('discordant_pain')) alerts.push('выраженное несоответствие боли и признаков требует нейросенсорной оценки'); if(state.masquerades.includes('neurotrophic')) alerts.push('необходима оценка чувствительности роговицы'); if(state.masquerades.includes('demodex')) alerts.push('нужен целевой осмотр ресниц и края век'); return alerts;}
  function nextChecks(){const checks=[]; if(!state.mgd||!state.meibum) checks.push('стандартизированная оценка края век, экспрессируемости и качества секрета'); if(!state.blink||!state.lagophthalmos) checks.push('оценка полноты моргания и смыкания век, включая ночную экспозицию'); if(state.risks.includes('autoimmune')) checks.push('системный анамнез и маршрутизация при подозрении на синдром Шегрена или другое аутоиммунное заболевание'); if(state.symptoms.includes('discordant_pain')||state.masquerades.includes('neuropathic')) checks.push('оценка нейросенсорного профиля и несоответствия симптомов объективным признакам'); if(state.masquerades.includes('neurotrophic')) checks.push('чувствительность роговицы и признаки нейротрофической кератопатии'); if(!checks.length) checks.push('проверка воспроизводимости симптомов и объективных маркеров при контрольном осмотре'); return checks;}

  function showCriticalResult(){state.resultMode=true; progressBar.style.width='100%'; progressLabel.textContent='Алгоритм остановлен'; summary.step.textContent='Требуется другой маршрут'; summary.urgency.textContent='Приоритетная очная оценка'; summary.diagnosis.textContent='ССГ не классифицируется'; caseStatus.textContent='Остановлено'; content.innerHTML=`<p class="question-kicker">Проверка безопасности</p><h2 class="question-title">Плановый алгоритм остановлен</h2><div class="result-grid"><div class="result-block critical wide"><h3>Выявлены признаки потенциально другого заболевания</h3><p>До обсуждения сухого глаза требуется очная оценка и исключение поражения роговицы, инфекции, воспаления, послеоперационного осложнения или другой угрожающей патологии.</p></div><div class="result-block caution"><h3>Почему система остановилась</h3><p>Клинический навигатор не должен маскировать опасный процесс плановыми рекомендациями по заболеванию глазной поверхности.</p></div><div class="result-block info"><h3>Следующий безопасный шаг</h3><p>Перейти к модулю острого красного глаза / поражения роговицы после его отдельной разработки и клинической валидации.</p></div></div>${lockedTreatment()}`; nextButton.textContent='Начать заново'; demoButton.hidden=true; backButton.disabled=false; renderRail(); updateSummary();}

  function renderDriverMap(scores){const names={lipid:'Липидный / вековый',aqueous:'Водный',exposure:'Экспозиционный',iatrogenic:'Ятрогенный',neurosensory:'Нейросенсорный'}; return `<div class="clinical-map"><div class="clinical-map-head"><h3>Карта этиологических драйверов</h3><span>Не является шкалой тяжести или вероятности диагноза</span></div><div class="driver-bars">${Object.entries(names).map(([key,name])=>`<div class="driver-bar"><span>${name}</span><i><b style="width:${scorePercent(scores[key])}%"></b></i><em>${scorePercent(scores[key])}%</em></div>`).join('')}</div></div>`;}

  function showFinalResult(){
    state.resultMode=true; const diagnosis=diagnosticStatus(); const scores=driverScores(); const driver=driverLabel(scores); const missing=missingData(); const alerts=maskAlerts(); const checks=nextChecks();
    const riskLabels={glaucoma_drops:'местная гипотензивная терапия',recent_surgery:'недавнее офтальмологическое вмешательство',refractive_surgery:'рефракционная хирургия',autoimmune:'аутоиммунный или системный фактор',systemic_drugs:'возможная лекарственная индукция',contact_lenses_chronic:'контактные линзы',screen_environment:'экранная нагрузка / среда',rosacea:'розацеа / себорейный дерматит'};
    const relevantRisks=state.risks.filter((item)=>item!=='none').map((item)=>riskLabels[item]).filter(Boolean);
    progressBar.style.width='100%'; progressLabel.textContent='Клиническая карта'; summary.step.textContent='Результат сформирован'; summary.urgency.textContent='Плановая ветвь'; summary.diagnosis.textContent=diagnosis.label; summary.completeness.textContent=`${completenessPercent()}%`; caseStatus.textContent='Карточка готова';
    content.innerHTML=`<p class="question-kicker">Демонстрационный результат</p><h2 class="question-title">Предварительная клиническая структура</h2><div class="context-strip"><span class="context-chip">${driver}</span><span class="context-chip">полнота ${completenessPercent()}%</span><span class="context-chip">версия алгоритма 0.2</span></div><div class="result-grid"><div class="result-block safe"><h3>Уровень срочности</h3><p>По введённым ответам критические признаки не отмечены. Это зависит от полноты и достоверности исходных данных.</p></div><div class="result-block ${diagnosis.tone}"><h3>Диагностическая рамка</h3><p><strong>${diagnosis.label}.</strong> ${diagnosis.detail}</p></div>${renderDriverMap(scores)}<div class="result-block"><h3>Факторы, меняющие тактику</h3>${relevantRisks.length?`<div class="badge-list">${relevantRisks.map((item)=>`<span class="clinical-badge">${item}</span>`).join('')}</div>`:'<p>Значимые дополнительные факторы не указаны.</p>'}</div><div class="result-block ${missing.length?'caution':'safe'}"><h3>Недостающие данные</h3>${missing.length?`<ul>${missing.map((item)=>`<li>${item}</li>`).join('')}</ul>`:'<p>Ключевые поля демонстрационного алгоритма заполнены.</p>'}</div><div class="result-block caution"><h3>Заболевания-маски и несоответствия</h3>${alerts.length?`<ul>${alerts.map((item)=>`<li>${item}</li>`).join('')}</ul>`:'<p>Явные несоответствия не выявлены, но дифференциальная диагностика сохраняется при атипичном или резистентном течении.</p>'}</div><div class="result-block info"><h3>Что проверить следующим</h3><ul>${checks.map((item)=>`<li>${item}</li>`).join('')}</ul></div><div class="result-block wide"><h3>Источники клинической рамки</h3><p>TFOS DEWS III: Diagnostic Methodology (2025), TFOS DEWS III: Management and Therapy (2025), AAO Dry Eye Syndrome Preferred Practice Pattern. В production-версии каждое правило будет связано с конкретным источником, разделом, датой проверки и статусом утверждения.</p></div><div class="treatment-preview"><div class="treatment-preview-head"><span>🔒</span><h3>Будущая архитектура терапевтического модуля</h3></div><div class="treatment-lanes"><div class="treatment-lane">восполнение слёзной плёнки</div><div class="treatment-lane">сохранение и стимуляция</div><div class="treatment-lane">МГД-направленная тактика</div><div class="treatment-lane">контроль воспаления</div><div class="treatment-lane">рефрактерные и нейросенсорные случаи</div></div></div></div>${lockedTreatment()}`;
    nextButton.textContent='Начать заново'; demoButton.hidden=true; backButton.disabled=false; renderRail(); updateSummary();
  }

  function lockedTreatment(){return '<div class="prototype-lock"><span>🔒</span><div><strong>Препараты, дозировки и длительность намеренно не сформированы.</strong><br>Модуль будет подключён после верификации источников, регистрации препаратов, противопоказаний, off-label статуса и экспертной валидации правил.</div></div>';}

  function fillDemo(){state={step:steps.length-1,resultMode:false,accepted:true,goal:'drivers',redFlags:['none'],symptoms:['dryness','fluctuation','evening','screen'],laterality:'bilateral',onset:'chronic',severity:'moderate',osdi6:'positive',nibt:'5.8',osmolarity:'abnormal',staining:'abnormal',schirmer:'9',tearMeniscus:'normal',mgd:'yes',lidMargin:'abnormal',meibum:'abnormal',blink:'incomplete',lagophthalmos:'no',meibography:'abnormal',risks:['glaucoma_drops','screen_environment','rosacea'],masquerades:['none'],priorTreatment:'Увлажняющие препараты без устойчивого эффекта.'}; showFinalResult();}
  function reset(){state=initialState(); renderStep();}
  function escapeHtml(value){return String(value||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}

  nextButton.addEventListener('click',()=>{if(state.resultMode) return reset(); if(!collectCurrentStep(false)) return; updateSummary(); if(state.step===2&&hasCriticalFlags()) return showCriticalResult(); if(state.step===steps.length-1) return showFinalResult(); state.step+=1; renderStep();});
  backButton.addEventListener('click',()=>{if(state.resultMode){state.resultMode=false; state.step=hasCriticalFlags()?2:steps.length-1; renderStep(); return;} if(state.step>0){collectCurrentStep(true); state.step-=1; renderStep();}});
  demoButton.addEventListener('click',fillDemo);

  if(new URLSearchParams(window.location.search).get('demo')==='1') fillDemo(); else renderStep();
})();
