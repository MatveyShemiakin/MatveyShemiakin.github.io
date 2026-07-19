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

  function inferSignalsLocally(caseText) {
    const text = normalize(caseText);
    const signals = new Set();

    if (hasAny(text, [/снижен\w* зрени/, /ухудшен\w* зрени/, /потер\w* зрени/, /резко хуже вид/])) signals.add('vision_loss');
    if (hasAny(text, [/\bбол[ьи]\b/, /болит/, /светобоязн/, /фотофоби/])) signals.add('pain_photophobia');
    if (hasAny(text, [/покраснен/, /красн\w* глаз/, /инъекци/])) signals.add('red_eye');
    if (hasAny(text, [/инфильтрат/, /дефект эпител/, /язв\w* роговиц/, /контактн\w* линз/])) signals.add('corneal_contact');
    if (hasAny(text, [/вспышк/, /фотопси/, /нов\w* мушк/, /занавес/, /дефект пол/])) signals.add('flashes_floaters');

    const iopMatch = text.match(/(?:вгд|давлени\w*)(?:\s*(?:od|os|справа|слева))?\s*[:=]?\s*(\d{1,2}(?:[.,]\d)?)/);
    const iop = iopMatch ? Number(iopMatch[1].replace(',', '.')) : null;
    if (
      (iop !== null && iop > 21)
      || hasAny(text, [/высок\w* вгд/, /вгд повыш/, /офтальмогипертенз/, /ореол/, /тошнот/, /головн\w* бол/])
    ) signals.add('high_iop');

    if (hasAny(text, [
      /увеит/, /иридоциклит/, /клетк/, /опалесценц/, /синех/, /гипопион/,
      /витреит/, /витрит/, /взвесь.*стекловид/, /клетк.*стекловид/,
      /помутнен.*стекловид/, /выпот.*стекловид/
    ])) signals.add('inflammation');

    if (hasAny(text, [/после операц/, /после фако/, /после инъекц/, /интравитреальн\w* инъекц/])) signals.add('postop');
    return signals;
  }

  function signalsFromFacts(facts) {
    const signals = new Set();
    const symptoms = new Set(facts?.symptoms || []);
    const examination = facts?.examination || {};
    const procedures = new Set(facts?.procedures || []);

    if (symptoms.has('vision_loss')) signals.add('vision_loss');
    if (symptoms.has('pain') || symptoms.has('photophobia')) signals.add('pain_photophobia');
    if (symptoms.has('redness')) signals.add('red_eye');
    if (examination.corneal_infiltrate === true || examination.epithelial_defect === true) signals.add('corneal_contact');
    if (symptoms.has('flashes') || symptoms.has('floaters') || symptoms.has('field_defect')) signals.add('flashes_floaters');
    if (
      examination.iop_state === 'high'
      || Number(examination.iop_mm_hg) > 21
      || symptoms.has('halos')
      || symptoms.has('headache')
      || symptoms.has('nausea')
    ) signals.add('high_iop');
    if (
      examination.anterior_chamber_cells
      || examination.synechiae === true
      || examination.hypopyon === true
      || examination.vitritis === true
      || (facts?.suspected_diagnoses || []).some((item) => normalize(item).includes('увеит'))
    ) signals.add('inflammation');
    if ([...procedures].some((item) => item.includes('surgery') || item.includes('injection'))) signals.add('postop');
    return signals;
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
      signalsFromFacts(payload.facts).forEach((signal) => pendingIntake.signals.add(signal));
      window.CLINICAL_CASE_FACTS = payload.facts || null;
      window.dispatchEvent(new CustomEvent('clinicalfactsupdated', { detail: payload.facts || null }));
      applyKnownSignalsToTriage();
    } catch (_error) {
      // Deterministic local extraction already prevents duplicate questions.
    }
  }

  function triageButtons() {
    return [...suggestions.querySelectorAll('.suggestion-chip')]
      .filter((button) => triageValues.has(button.dataset.value) || button.dataset.value === 'none');
  }

  function addRecognitionNote(knownSignals, hiddenButtons) {
    let note = suggestions.querySelector('[data-recognized-facts-note]');
    if (!note) {
      note = document.createElement('div');
      note.dataset.recognizedFactsNote = 'true';
      note.className = 'recognized-facts-note';
      suggestions.prepend(note);
    }

    const labels = [...knownSignals].map((signal) => signalLabels[signal]).filter(Boolean);
    note.innerHTML = `
      <strong>Уже учтено из описания:</strong> ${labels.map(escapeHtml).join('; ')}.
      <span>Эти вопросы повторно не задаются.</span>
      <button type="button" data-review-recognized>Проверить / исправить</button>
    `;
    note.querySelector('[data-review-recognized]')?.addEventListener('click', () => {
      hiddenButtons.forEach((button) => { button.hidden = !button.hidden; });
    });
  }

  function applyKnownSignalsToTriage() {
    if (!pendingIntake) return;
    const buttons = triageButtons();
    if (!buttons.some((button) => button.dataset.value === 'pain_photophobia')) return;

    const hiddenButtons = [];
    pendingIntake.signals.forEach((signal) => {
      const button = buttons.find((item) => item.dataset.value === signal);
      if (!button) return;
      if (!button.classList.contains('selected')) button.click();
      button.hidden = true;
      hiddenButtons.push(button);
    });

    if (!hiddenButtons.length) return;

    const noneButton = buttons.find((button) => button.dataset.value === 'none');
    if (noneButton) {
      noneButton.textContent = 'Остальных перечисленных признаков нет';
      if (!noneButton.dataset.restoreKnownBound) {
        noneButton.dataset.restoreKnownBound = 'true';
        noneButton.addEventListener('click', () => {
          window.setTimeout(() => {
            pendingIntake?.signals.forEach((signal) => {
              const knownButton = suggestions.querySelector(`.suggestion-chip[data-value="${signal}"]`);
              if (knownButton && !knownButton.classList.contains('selected')) knownButton.click();
            });
          }, 0);
        });
      }
    }

    addRecognitionNote(pendingIntake.signals, hiddenButtons);

    const lastAssistant = [...stream.querySelectorAll('.message-row.assistant .message-bubble')].at(-1);
    if (lastAssistant && normalize(lastAssistant.textContent).includes('перед выбором патологии')) {
      lastAssistant.innerHTML = `
        <p><strong>Я распознал уже указанные клинические признаки.</strong></p>
        <p>Уточните только оставшиеся неизвестные признаки, которые могут изменить срочность или дифференциальный ряд.</p>
      `;
    }

    const visibleUnknown = buttons.filter((button) => button.dataset.value !== 'none' && !button.hidden);
    const submit = suggestions.querySelector('.suggestion-submit');
    if (!visibleUnknown.length && submit && !pendingIntake.autoContinued) {
      pendingIntake.autoContinued = true;
      window.setTimeout(() => submit.click(), 50);
    }
  }

  form.addEventListener('submit', () => {
    const text = input.value.trim();
    if (!text || !looksLikeInitialIntake()) return;
    extractionSequence += 1;
    pendingIntake = {
      text,
      facts: null,
      signals: inferSignalsLocally(text),
      autoContinued: false
    };
    window.CLINICAL_CASE_FACTS = null;
    extractFacts(text, extractionSequence);
  }, true);

  const observer = new MutationObserver(() => applyKnownSignalsToTriage());
  observer.observe(suggestions, { childList: true, subtree: true });

  const uveitis = window.CLINICAL_MODULES?.uveitis;
  if (uveitis) {
    const additions = ['гипопион', 'витрит', 'витреит', 'клетки в стекловидном теле', 'взвесь в стекловидном теле'];
    uveitis.keywords = Array.from(new Set([...(uveitis.keywords || []), ...additions]));
  }
}());
