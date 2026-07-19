(function () {
  'use strict';

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const stream = document.getElementById('chat-stream');
  const suggestions = document.getElementById('chat-suggestions');
  const config = window.CLINICAL_AI_CONFIG || {};
  if (!form || !input || !stream || !suggestions) return;

  const signalLabels = {
    vision_loss: 'быстрое или выраженное снижение зрения',
    pain_photophobia: 'боль или светобоязнь',
    red_eye: 'покраснение глаза',
    corneal_contact: 'изменения роговицы / контактные линзы',
    flashes_floaters: 'вспышки / новые помутнения / дефект поля',
    high_iop: 'повышенное ВГД или связанные симптомы',
    inflammation: 'воспаление, клетки, гипопион, синехии или витрит',
    postop: 'недавняя операция или внутриглазная инъекция'
  };

  const triageValues = new Set(Object.keys(signalLabels));
  let pendingIntake = null;
  let extractionSequence = 0;

  function normalize(value) {
    return String(value || '').toLowerCase().replaceAll('ё', 'е');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function hasAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }

  function localClinicalMap(caseText) {
    const text = normalize(caseText);
    const signals = new Set();
    const knownOptions = new Set();
    const fields = {};

    const hasVisionLoss = hasAny(text, [/снижен\w* зрени/, /ухудшен\w* зрени/, /потер\w* зрени/, /резко хуже вид/]);
    const hasPain = hasAny(text, [/\bбол(?:ь|и|ью|ей|ит|ят)\w*/, /болезнен/]);
    const hasPhotophobia = hasAny(text, [/светобоязн/, /фотофоби/]);
    const hasRedness = hasAny(text, [/покраснен/, /красн\w* глаз/, /инъекци/]);
    const hasCornealFinding = hasAny(text, [/инфильтрат/, /дефект эпител/, /язв\w* роговиц/, /контактн\w* линз/]);
    const hasPosteriorSymptoms = hasAny(text, [/вспышк/, /фотопси/, /нов\w* мушк/, /занавес/, /дефект пол/]);
    const hasHypopyon = /гипопион/.test(text);
    const hasSynechiae = /синех/.test(text);
    const hasVitritis = hasAny(text, [
      /витреит/, /витрит/, /взвесь.*стекловид/, /клетк.*стекловид/,
      /помутнен.*стекловид/, /выпот.*стекловид/
    ]);
    const hasRetinitis = hasAny(text, [/ретинит/, /васкулит сетчат/]);
    const hasPostop = hasAny(text, [/после операц/, /после фако/, /после инъекц/, /интравитреальн\w* инъекц/]);
    const hasImmunosuppression = hasAny(text, [/иммуносупресс/, /иммунодефиц/, /вич/, /химиотерап/, /трансплантац/]);

    if (hasVisionLoss) {
      signals.add('vision_loss');
      knownOptions.add('severe_loss');
      knownOptions.add('sudden_loss');
    }
    if (hasPain || hasPhotophobia) {
      signals.add('pain_photophobia');
      knownOptions.add('acute_pain');
    }
    if (hasRedness) signals.add('red_eye');
    if (hasCornealFinding) signals.add('corneal_contact');
    if (hasPosteriorSymptoms) signals.add('flashes_floaters');

    const iopMatch = text.match(/(?:вгд|давлени\w*)(?:\s*(?:od|os|справа|слева))?\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)/);
    const iop = iopMatch ? Number(iopMatch[1].replace(',', '.')) : null;
    const hasHighIop = (
      (iop !== null && iop > 21)
      || hasAny(text, [/высок\w* вгд/, /вгд повыш/, /подъем\w* вгд/, /подъём\w* вгд/, /офтальмогипертенз/, /ореол/, /тошнот/])
    );
    if (hasHighIop) {
      signals.add('high_iop');
      knownOptions.add('high_iop');
      fields.iop = 'high';
    }
    if (iop !== null) fields.iop_mm_hg = iop;
    if (iop !== null && iop >= 40) knownOptions.add('very_high_iop');

    if (hasAny(text, [/увеит/, /иридоциклит/, /клетк/, /опалесценц/, /синех/, /гипопион/, /витреит/, /витрит/]) || hasVitritis) {
      signals.add('inflammation');
    }
    if (hasHypopyon) knownOptions.add('hypopyon');
    if (hasVitritis) {
      knownOptions.add('vitritis');
      knownOptions.add('posterior');
    }
    if (hasRetinitis) {
      knownOptions.add('retinitis');
      knownOptions.add('posterior');
    }
    if (hasPostop) {
      signals.add('postop');
      knownOptions.add('postop');
    }
    if (hasImmunosuppression) knownOptions.add('immunosuppressed');

    if (hasAny(text, [/односторон/, /один глаз/, /правого глаза/, /левого глаза/, /\bod\b/, /\bos\b/])) fields.laterality = 'unilateral';
    if (hasAny(text, [/двусторон/, /оба глаза/, /обоих глаз/])) fields.laterality = 'bilateral';
    if (/рецидив|повторн|не первый эпизод/.test(text)) fields.course = 'recurrent';
    else if (/хроническ|несколько месяцев|несколько лет/.test(text)) fields.course = 'chronic';
    else if (/первый эпизод|впервые/.test(text)) fields.course = 'first';
    if (hasSynechiae) fields.synechiae = 'yes';

    return { signals, knownOptions, fields };
  }

  function mergeFactsIntoPending(facts) {
    if (!pendingIntake || !facts) return;
    const symptoms = new Set(facts.symptoms || []);
    const examination = facts.examination || {};
    const procedures = new Set(facts.procedures || []);

    if (symptoms.has('vision_loss')) {
      pendingIntake.signals.add('vision_loss');
      pendingIntake.knownOptions.add('severe_loss');
      pendingIntake.knownOptions.add('sudden_loss');
    }
    if (symptoms.has('pain') || symptoms.has('photophobia')) {
      pendingIntake.signals.add('pain_photophobia');
      pendingIntake.knownOptions.add('acute_pain');
    }
    if (symptoms.has('redness')) pendingIntake.signals.add('red_eye');
    if (examination.corneal_infiltrate === true || examination.epithelial_defect === true) pendingIntake.signals.add('corneal_contact');
    if (symptoms.has('flashes') || symptoms.has('floaters') || symptoms.has('field_defect')) pendingIntake.signals.add('flashes_floaters');
    if (examination.iop_state === 'high' || Number(examination.iop_mm_hg) > 21 || symptoms.has('halos') || symptoms.has('nausea')) {
      pendingIntake.signals.add('high_iop');
      pendingIntake.knownOptions.add('high_iop');
      pendingIntake.fields.iop = 'high';
    }
    if (Number(examination.iop_mm_hg) >= 40) pendingIntake.knownOptions.add('very_high_iop');
    if (examination.iop_mm_hg !== null && examination.iop_mm_hg !== undefined) pendingIntake.fields.iop_mm_hg = examination.iop_mm_hg;
    if (
      examination.anterior_chamber_cells
      || examination.synechiae === true
      || examination.hypopyon === true
      || examination.vitritis === true
      || (facts.suspected_diagnoses || []).some((item) => normalize(item).includes('увеит'))
    ) pendingIntake.signals.add('inflammation');
    if (examination.hypopyon === true) pendingIntake.knownOptions.add('hypopyon');
    if (examination.vitritis === true) {
      pendingIntake.knownOptions.add('vitritis');
      pendingIntake.knownOptions.add('posterior');
    }
    if (examination.synechiae === true) pendingIntake.fields.synechiae = 'yes';
    if (examination.synechiae === false) pendingIntake.fields.synechiae = 'no';
    if ([...procedures].some((item) => item.includes('surgery') || item.includes('injection'))) {
      pendingIntake.signals.add('postop');
      pendingIntake.knownOptions.add('postop');
    }
    if (facts.laterality) pendingIntake.fields.laterality = facts.laterality;
    if (facts.course) pendingIntake.fields.course = facts.course;
  }

  function looksLikeInitialIntake() {
    const lastAssistant = [...stream.querySelectorAll('.message-row.assistant .message-bubble')].at(-1);
    const text = normalize(lastAssistant?.textContent || '');
    return text.includes('опишите жалобы') || text.includes('опишите клинический случай');
  }

  async function extractFacts(caseText, sequence) {
    if (!config.endpoint) return;
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_facts', case_text: caseText, prior_facts: null })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || sequence !== extractionSequence || !pendingIntake) return;
      pendingIntake.facts = payload.facts || null;
      mergeFactsIntoPending(payload.facts);
      window.CLINICAL_CASE_FACTS = payload.facts || null;
      window.dispatchEvent(new CustomEvent('clinicalfactsupdated', { detail: payload.facts || null }));
      applyKnownOptionsToSuggestions();
      applyKnownFieldsToForms();
    } catch (_error) {
      // Local deterministic extraction remains active as a safe fallback.
    }
  }

  function optionIsKnown(value) {
    return pendingIntake?.signals.has(value) || pendingIntake?.knownOptions.has(value);
  }

  function addRecognitionNote(labels, knownValues) {
    let note = suggestions.querySelector('[data-recognized-facts-note]');
    if (!note) {
      note = document.createElement('div');
      note.dataset.recognizedFactsNote = 'true';
      note.className = 'recognized-facts-note';
      suggestions.prepend(note);
    }

    const signature = `${knownValues.join('|')}::${labels.join('|')}`;
    if (note.dataset.signature === signature) return;
    note.dataset.signature = signature;
    note.innerHTML = `
      <strong>Уже учтено из описания:</strong> ${labels.map(escapeHtml).join('; ')}.
      <span>Эти вопросы повторно не задаются.</span>
      <button type="button" data-review-recognized>Проверить / исправить</button>
    `;
    note.querySelector('[data-review-recognized]')?.addEventListener('click', () => {
      knownValues.forEach((value) => {
        const button = suggestions.querySelector(`.suggestion-chip[data-value="${value}"]`);
        if (button) button.hidden = !button.hidden;
      });
    });
  }

  function applyKnownOptionsToSuggestions() {
    if (!pendingIntake) return;
    const buttons = [...suggestions.querySelectorAll('.suggestion-chip')];
    if (!buttons.length) return;

    const knownButtons = buttons.filter((button) => button.dataset.value !== 'none' && optionIsKnown(button.dataset.value));
    if (!knownButtons.length) return;

    const knownValues = [];
    const labels = [];
    knownButtons.forEach((button) => {
      if (!button.classList.contains('selected')) button.click();
      button.hidden = true;
      knownValues.push(button.dataset.value);
      labels.push(button.textContent.trim());
    });

    const noneButton = buttons.find((button) => button.dataset.value === 'none');
    if (noneButton) {
      const noneLabel = 'Остальных перечисленных признаков нет';
      if (noneButton.textContent !== noneLabel) noneButton.textContent = noneLabel;
      if (!noneButton.dataset.restoreKnownBound) {
        noneButton.dataset.restoreKnownBound = 'true';
        noneButton.addEventListener('click', () => {
          window.setTimeout(() => {
            knownValues.forEach((value) => {
              const knownButton = suggestions.querySelector(`.suggestion-chip[data-value="${value}"]`);
              if (knownButton && !knownButton.classList.contains('selected')) knownButton.click();
            });
          }, 0);
        });
      }
    }

    addRecognitionNote(labels, knownValues);

    const isGlobalTriage = buttons.some((button) => triageValues.has(button.dataset.value));
    if (isGlobalTriage) {
      const lastAssistant = [...stream.querySelectorAll('.message-row.assistant .message-bubble')].at(-1);
      if (lastAssistant && normalize(lastAssistant.textContent).includes('перед выбором патологии')) {
        lastAssistant.innerHTML = `
          <p><strong>Я распознал уже указанные клинические признаки.</strong></p>
          <p>Уточните только оставшиеся неизвестные признаки, которые могут изменить срочность или дифференциальный ряд.</p>
        `;
      }
    }

    const visibleUnknown = buttons.filter((button) => button.dataset.value !== 'none' && !button.hidden);
    const submit = suggestions.querySelector('.suggestion-submit');
    if (!visibleUnknown.length && submit && !pendingIntake.autoContinueKeys.has(buttons.map((button) => button.dataset.value).join('|'))) {
      const key = buttons.map((button) => button.dataset.value).join('|');
      pendingIntake.autoContinueKeys.add(key);
      window.setTimeout(() => submit.click(), 50);
    }
  }

  function prefillValueForField(name) {
    const facts = pendingIntake?.facts || {};
    const examination = facts.examination || {};
    const local = pendingIntake?.fields || {};
    if (name === 'laterality') return facts.laterality || local.laterality || '';
    if (name === 'course') return facts.course || local.course || '';
    if (name === 'iop') return examination.iop_state || local.iop || '';
    if (name === 'synechiae') {
      if (examination.synechiae === true) return 'yes';
      if (examination.synechiae === false) return 'no';
      return local.synechiae || '';
    }
    return '';
  }

  function applyKnownFieldsToForms() {
    if (!pendingIntake) return;
    stream.querySelectorAll('.inline-chat-form').forEach((inlineForm) => {
      inlineForm.querySelectorAll('select[name], input[name]').forEach((control) => {
        const value = prefillValueForField(control.name);
        if (!value || control.dataset.smartPrefilled === 'true') return;
        if (control.tagName === 'SELECT' && ![...control.options].some((option) => option.value === String(value))) return;
        control.value = String(value);
        control.dataset.smartPrefilled = 'true';
        const label = control.closest('label');
        if (label) label.hidden = true;
      });

      const allFilled = [...inlineForm.querySelectorAll('[data-smart-prefilled="true"]')];
      if (!allFilled.length) return;
      const summaryParts = allFilled.map((control) => {
        const label = control.closest('label');
        const title = label?.querySelector('span')?.textContent?.trim() || control.name;
        const displayed = control.tagName === 'SELECT' ? control.selectedOptions[0]?.textContent?.trim() : control.value;
        return `${title}: ${displayed}`;
      });
      const signature = summaryParts.join('|');
      let note = inlineForm.querySelector('[data-smart-prefill-note]');
      if (!note) {
        note = document.createElement('div');
        note.dataset.smartPrefillNote = 'true';
        note.className = 'smart-prefill-note';
        inlineForm.prepend(note);
      }
      if (note.dataset.signature === signature) return;
      note.dataset.signature = signature;
      note.innerHTML = `
        <strong>Заполнено из исходного описания:</strong> ${summaryParts.map(escapeHtml).join('; ')}.
        <button type="button" data-review-prefilled>Проверить / изменить</button>
      `;
      note.querySelector('[data-review-prefilled]')?.addEventListener('click', () => {
        allFilled.forEach((control) => {
          const label = control.closest('label');
          if (label) label.hidden = !label.hidden;
        });
      });
    });
  }

  form.addEventListener('submit', () => {
    const text = input.value.trim();
    if (!text || !looksLikeInitialIntake()) return;
    extractionSequence += 1;
    const local = localClinicalMap(text);
    pendingIntake = {
      text,
      facts: null,
      signals: local.signals,
      knownOptions: local.knownOptions,
      fields: local.fields,
      autoContinueKeys: new Set()
    };
    window.CLINICAL_CASE_FACTS = null;
    extractFacts(text, extractionSequence);
  }, true);

  const suggestionsObserver = new MutationObserver(() => applyKnownOptionsToSuggestions());
  suggestionsObserver.observe(suggestions, { childList: true, subtree: true });

  const streamObserver = new MutationObserver(() => applyKnownFieldsToForms());
  streamObserver.observe(stream, { childList: true, subtree: true });

  const uveitis = window.CLINICAL_MODULES?.uveitis;
  if (uveitis) {
    const additions = ['гипопион', 'витрит', 'витреит', 'клетки в стекловидном теле', 'взвесь в стекловидном теле'];
    uveitis.keywords = Array.from(new Set([...(uveitis.keywords || []), ...additions]));
  }
}());
