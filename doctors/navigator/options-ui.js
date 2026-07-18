(function () {
  'use strict';

  const config = window.CLINICAL_AI_CONFIG || {};
  const stream = document.getElementById('chat-stream');
  const headerActions = document.querySelector('.chat-head-actions');
  if (!stream || !headerActions) return;

  let requestInFlight = false;
  let lastResult = null;
  let selectedDiagnosis = '';
  let selectedManagement = '';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function addAssistantMessage(html) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `<div class="message-avatar">AI</div><div class="message-bubble">${html}</div>`;
    stream.appendChild(row);
    requestAnimationFrame(() => stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' }));
    return row.querySelector('.message-bubble');
  }

  function setBusy(busy) {
    requestInFlight = busy;
    document.querySelectorAll('[data-ai-options-trigger]').forEach((button) => {
      button.disabled = busy;
      button.textContent = busy ? 'Формируются варианты…' : 'Варианты по гайдам';
    });
  }

  function currentModuleIsSupported() {
    const title = document.getElementById('module-title')?.textContent?.toLowerCase() || '';
    return title.includes('увеит');
  }

  function collectCaseText() {
    const ignored = [
      'да, продолжить', 'да, понимаю', 'подтвердить', 'продолжить разбор',
      'сформировать итоговую карточку', 'новый случай', 'провести дифференциальный разбор'
    ];
    return [...stream.querySelectorAll('.message-row.user .message-bubble')]
      .map((node) => node.textContent.trim())
      .filter((text) => text.length >= 3)
      .filter((text) => !ignored.some((phrase) => text.toLowerCase().startsWith(phrase)))
      .join('\n');
  }

  async function post(payload) {
    if (!config.endpoint) throw new Error('AI_BACKEND_NOT_CONFIGURED');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), Number(config.requestTimeoutMs) || 90000);
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || `HTTP ${response.status}`);
      return data;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function list(items, fallback) {
    const values = (items || []).filter(Boolean);
    if (!values.length) return `<p>${escapeHtml(fallback || 'Не указано.')}</p>`;
    return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function supportLabel(level) {
    return ({ strong: 'сильная поддержка', moderate: 'умеренная поддержка', weak: 'слабая поддержка', insufficient: 'недостаточно данных' })[level] || level;
  }

  function renderDiagnosticOption(option) {
    return `
      <article class="choice-option" data-choice-type="diagnosis" data-choice-id="${escapeHtml(option.id)}">
        <div class="choice-option-head">
          <h3>${escapeHtml(option.label)}</h3>
          <span class="support-pill">${escapeHtml(supportLabel(option.support_level))}</span>
        </div>
        <h4>Аргументы в пользу</h4>
        ${list(option.supporting_facts, 'Выраженная поддержка пока не определена.')}
        <h4>Что противоречит или отсутствует</h4>
        ${list(option.against_or_missing_facts, 'Ключевые противоречия не перечислены.')}
        <h4>Что поможет различить варианты</h4>
        ${list(option.tests_to_discriminate, 'Дополнительные исследования не указаны.')}
        <div class="option-source-list">Evidence: ${(option.evidence_chunk_ids || []).map(escapeHtml).join(', ') || 'не указано'}</div>
        <button class="option-select-button" type="button" data-select-diagnosis="${escapeHtml(option.id)}">Выбрать как рабочую гипотезу</button>
      </article>
    `;
  }

  function renderManagementOption(option) {
    const components = (option.components || []).map((component) => {
      const regimen = component.regimen ? `<br><strong>Режим:</strong> ${escapeHtml(component.regimen)}` : '';
      const duration = component.duration ? `<br><strong>Длительность:</strong> ${escapeHtml(component.duration)}` : '';
      return `<li>${escapeHtml(component.intervention)}${regimen}${duration}<br><small>${escapeHtml(component.status)}</small></li>`;
    });
    return `
      <article class="choice-option" data-choice-type="management" data-choice-id="${escapeHtml(option.id)}">
        <div class="choice-option-head"><h3>${escapeHtml(option.label)}</h3><span class="support-pill">вариант</span></div>
        <h4>Обоснование</h4><p>${escapeHtml(option.rationale)}</p>
        <h4>Компоненты</h4>${components.length ? `<ul>${components.join('')}</ul>` : '<p>Не указаны.</p>'}
        <h4>Мониторинг</h4>${list(option.monitoring)}
        <h4>Риски и ограничения</h4>${list(option.risks_and_constraints)}
        <div class="option-source-list">Evidence: ${(option.evidence_chunk_ids || []).map(escapeHtml).join(', ') || 'не указано'}</div>
        <button class="option-select-button" type="button" data-select-management="${escapeHtml(option.id)}">Выбрать для обсуждения</button>
      </article>
    `;
  }

  function selectionSummary(container) {
    const diagnosis = lastResult?.diagnostic_options?.find((item) => item.id === selectedDiagnosis);
    const management = lastResult?.management_options?.find((item) => item.id === selectedManagement);
    const summary = container.querySelector('[data-physician-choice-summary]');
    if (!summary) return;
    if (!diagnosis && !management) {
      summary.innerHTML = '<strong>Решение не выбрано.</strong> Система только предлагает варианты.';
      return;
    }
    summary.innerHTML = `<strong>Выбор врача в текущем интерфейсе:</strong><br>${diagnosis ? `Рабочая гипотеза: ${escapeHtml(diagnosis.label)}.<br>` : ''}${management ? `Тактика для обсуждения: ${escapeHtml(management.label)}.` : ''}`;
  }

  function wireSelections(container) {
    container.querySelectorAll('[data-select-diagnosis]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedDiagnosis = button.dataset.selectDiagnosis;
        container.querySelectorAll('[data-choice-type="diagnosis"]').forEach((card) => {
          const selected = card.dataset.choiceId === selectedDiagnosis;
          card.classList.toggle('selected-by-physician', selected);
          const cardButton = card.querySelector('[data-select-diagnosis]');
          if (cardButton) cardButton.textContent = selected ? 'Выбрано врачом как рабочая гипотеза' : 'Выбрать как рабочую гипотезу';
        });
        selectionSummary(container);
      });
    });
    container.querySelectorAll('[data-select-management]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedManagement = button.dataset.selectManagement;
        container.querySelectorAll('[data-choice-type="management"]').forEach((card) => {
          const selected = card.dataset.choiceId === selectedManagement;
          card.classList.toggle('selected-by-physician', selected);
          const cardButton = card.querySelector('[data-select-management]');
          if (cardButton) cardButton.textContent = selected ? 'Выбрано врачом для обсуждения' : 'Выбрать для обсуждения';
        });
        selectionSummary(container);
      });
    });
  }

  function renderResult(payload) {
    const options = payload.options;
    lastResult = options;
    selectedDiagnosis = '';
    selectedManagement = '';
    const managementHtml = options.management_options?.length
      ? `<h2 class="option-section-title">Варианты лечебной тактики</h2><div class="option-grid">${options.management_options.map(renderManagementOption).join('')}</div>`
      : '<div class="management-lock"><strong>Лечебные варианты пока заблокированы.</strong><br>Диагностические варианты можно оценивать, но для показа схем лечения сервер должен работать в закрытом редакторском режиме после проверки источников.</div>';
    const bubble = addAssistantMessage(`
      <div class="clinical-options-result">
        <header>
          <h2>Варианты для решения врача</h2>
          <p>${escapeHtml(options.case_summary)}</p>
        </header>
        <div class="ai-options-status warning"><strong>Срочность: ${escapeHtml(options.urgency.level)}</strong><br>${escapeHtml(options.urgency.rationale)}</div>
        <h2 class="option-section-title">Диагностические варианты</h2>
        <div class="option-grid">${options.diagnostic_options.map(renderDiagnosticOption).join('')}</div>
        ${managementHtml}
        <div class="physician-choice-summary" data-physician-choice-summary><strong>Решение не выбрано.</strong> Система только предлагает варианты.</div>
        ${options.questions_to_resolve?.length ? `<div><h2 class="option-section-title">Что ещё уточнить</h2>${list(options.questions_to_resolve)}</div>` : ''}
        ${options.limitations?.length ? `<div class="options-limitations">${options.limitations.map(escapeHtml).join('<br>')}</div>` : ''}
      </div>
    `);
    wireSelections(bubble);
  }

  async function requestOptions() {
    if (requestInFlight) return;
    if (!currentModuleIsSupported()) {
      addAssistantMessage('<div class="ai-options-status warning"><strong>Пакет вариантов пока создан только для переднего увеита.</strong><br>Другие патологии будут подключаться последовательно.</div>');
      return;
    }
    const caseText = collectCaseText();
    if (!caseText) {
      addAssistantMessage('<div class="ai-options-status warning">Сначала опишите клинический случай.</div>');
      return;
    }
    if (!config.endpoint) {
      addAssistantMessage('<div class="ai-options-status warning"><strong>Серверный ИИ ещё не подключён к тестовой ссылке.</strong><br>Интерфейс и API-контракт готовы, но необходимо развернуть backend и указать его адрес в ai-config.js.</div>');
      return;
    }

    setBusy(true);
    const progress = addAssistantMessage('<div class="ai-options-status">Извлекаю факты, ищу релевантные фрагменты международных рекомендаций и формирую несколько вариантов без автоматического выбора.</div>');
    try {
      const extracted = await post({ action: 'extract_facts', case_text: caseText, prior_facts: null });
      const generated = await post({
        action: 'generate_options',
        case_text: caseText,
        facts: extracted.facts,
        supplemental_tags: ['anterior_uveitis'],
        authoring_mode: config.authoringMode === true
      });
      progress.closest('.message-row')?.remove();
      renderResult(generated);
    } catch (error) {
      progress.innerHTML = `<div class="ai-options-status error"><strong>Не удалось сформировать варианты.</strong><br>${escapeHtml(error.message === 'AI_BACKEND_NOT_CONFIGURED' ? 'Backend не настроен.' : error.message)}</div>`;
    } finally {
      setBusy(false);
    }
  }

  const headerButton = document.createElement('button');
  headerButton.type = 'button';
  headerButton.className = 'ai-options-trigger';
  headerButton.dataset.aiOptionsTrigger = 'header';
  headerButton.textContent = 'Варианты по гайдам';
  headerButton.addEventListener('click', requestOptions);
  headerActions.insertBefore(headerButton, headerActions.firstChild);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.textContent || '';
        if (!text.includes('Профильный разбор завершён')) continue;
        const actions = node.querySelector('.message-actions');
        if (!actions || actions.querySelector('[data-ai-options-trigger]')) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.aiOptionsTrigger = 'ready';
        button.textContent = 'Получить варианты по международным рекомендациям';
        button.addEventListener('click', requestOptions);
        actions.prepend(button);
      }
    }
  });
  observer.observe(stream, { childList: true, subtree: true });
}());
