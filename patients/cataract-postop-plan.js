(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CataractPostopPlan = api;
  if (root && root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', api.init);
    } else {
      api.init();
    }
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const STORAGE_KEY = 'cataractPostopPlan.v1';
  const PERIOD_ORDER = ['week1', 'week2', 'week3', 'week4', 'afterMonth'];
  const PLAN = {
    week1: {
      label: '1-я неделя',
      dayRange: '1–7-й день после операции',
      medications: [
        {
          id: 'cipro-dexa',
          active: 'Ципрофлоксацин + дексаметазон',
          trade: 'Комбинил',
          dose: 'по 1 капле 4 раза в день',
          times: ['08:00', '12:00', '16:00', '20:00']
        },
        {
          id: 'bromfenac',
          active: 'Бромфенак',
          trade: 'Броксинак',
          dose: 'по 1 капле 1 раз в день',
          times: ['09:00']
        },
        {
          id: 'dexpanthenol',
          active: 'Декспантенол',
          trade: 'Корнерегель',
          dose: 'по 1 капле 3 раза в день',
          times: ['10:00', '15:00', '21:00']
        }
      ]
    },
    week2: {
      label: '2-я неделя',
      dayRange: '8–14-й день после операции',
      medications: [
        {
          id: 'bromfenac',
          active: 'Бромфенак',
          trade: 'Броксинак',
          dose: 'по 1 капле 1 раз в день',
          times: ['09:00']
        },
        {
          id: 'dexpanthenol',
          active: 'Декспантенол',
          trade: 'Корнерегель',
          dose: 'по 1 капле 2 раза в день',
          times: ['10:00', '21:00']
        }
      ]
    },
    week3: {
      label: '3-я неделя',
      dayRange: '15–21-й день после операции',
      medications: [
        {
          id: 'bromfenac',
          active: 'Бромфенак',
          trade: 'Броксинак',
          dose: 'по 1 капле 1 раз в день',
          times: ['09:00']
        },
        {
          id: 'dexpanthenol',
          active: 'Декспантенол',
          trade: 'Корнерегель',
          dose: 'по 1 капле 1 раз в день',
          times: ['21:00']
        }
      ]
    },
    week4: {
      label: '4-я неделя',
      dayRange: '22–28-й день после операции',
      medications: [
        {
          id: 'bromfenac',
          active: 'Бромфенак',
          trade: 'Броксинак',
          dose: 'по 1 капле 1 раз в день',
          times: ['09:00']
        },
        {
          id: 'dexpanthenol',
          active: 'Декспантенол',
          trade: 'Корнерегель',
          dose: 'по 1 капле 1 раз в день',
          times: ['21:00']
        }
      ]
    },
    afterMonth: {
      label: 'После 1 месяца',
      dayRange: 'после завершения первых 4 недель',
      medications: [
        {
          id: 'povidone-pva',
          active: 'Повидон + поливиниловый спирт',
          trade: 'Офтолик / Офтолик БК',
          dose: 'по 1 капле 3 раза в день',
          times: ['08:00', '14:00', '20:00'],
          duration: '3 месяца'
        }
      ]
    }
  };

  function getPeriodPlan(periodKey) {
    return PLAN[periodKey] || PLAN.week1;
  }

  function parseDateParts(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  }

  function utcDay(parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day);
  }

  function periodFromDayOffset(diff) {
    if (diff <= 6) return 'week1';
    if (diff <= 13) return 'week2';
    if (diff <= 20) return 'week3';
    if (diff <= 27) return 'week4';
    return 'afterMonth';
  }

  function periodFromOperationDate(operationDate, currentDate) {
    const operation = parseDateParts(operationDate);
    if (!operation) return 'week1';
    const now = currentDate instanceof Date ? currentDate : new Date();
    const current = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    const diff = Math.floor((utcDay(current) - utcDay(operation)) / 86400000);
    return periodFromDayOffset(diff);
  }

  function addDays(parts, days) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function isoDate(parts) {
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }

  function icsDate(parts, time) {
    const [hour, minute] = time.split(':').map(Number);
    return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(hour)}${pad(minute)}00`;
  }

  function escapeIcs(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function calendarEvent(lines, operation, offsetDays, count, medication, time, suffix) {
    const start = addDays(operation, offsetDays);
    const summary = `Глазные капли: ${medication.active}`;
    const description = `По 1 капле. Пример торгового названия: ${medication.trade}. Интервал между разными видами капель — 5 минут.`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:cataract-${medication.id}-${suffix}-${time.replace(':', '')}@matveyshemyakin.ru`);
    lines.push(`DTSTART:${icsDate(start, time)}`);
    lines.push(`RRULE:FREQ=DAILY;COUNT=${count}`);
    lines.push(`SUMMARY:${escapeIcs(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcs(description)}`);
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:PT0M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeIcs(summary)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  function buildCalendar(operationDate) {
    const operation = parseDateParts(operationDate);
    if (!operation) return '';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Matvey Shemyakin//Cataract Postoperative Plan//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    const stages = [
      ['week1', 0, 7],
      ['week2', 7, 7],
      ['week3', 14, 7],
      ['week4', 21, 7],
      ['afterMonth', 28, 90]
    ];
    for (const [periodKey, offset, count] of stages) {
      for (const medication of PLAN[periodKey].medications) {
        for (const time of medication.times) {
          calendarEvent(lines, operation, offset, count, medication, time, periodKey);
        }
      }
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function todayKey(date) {
    const d = date instanceof Date ? date : new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function readState() {
    const fallback = { operationDate: '', selectedPeriod: 'week1', log: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object'
        ? { ...fallback, ...parsed, log: parsed.log && typeof parsed.log === 'object' ? parsed.log : {} }
        : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // The treatment tool remains usable for the current session if storage is unavailable.
    }
  }

  function logKey(date, periodKey, medicationId, time) {
    return `${date}|${periodKey}|${medicationId}|${time}`;
  }

  function statusLabel(status) {
    if (status === 'done') return '✓ Выполнено';
    if (status === 'missed') return '× Пропущено';
    return 'Не отмечено';
  }

  function buildJournalSchedule(operationDate, currentDate, log) {
    const operation = parseDateParts(operationDate);
    if (!operation) return [];
    const now = currentDate instanceof Date ? currentDate : new Date();
    const current = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    const elapsedDays = Math.floor((utcDay(current) - utcDay(operation)) / 86400000);
    if (elapsedDays < 0) return [];
    const lastOffset = Math.min(elapsedDays, 117);
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const stateLog = log && typeof log === 'object' ? log : {};
    const rows = [];

    for (let offset = 0; offset <= lastOffset; offset += 1) {
      const dateParts = addDays(operation, offset);
      const date = isoDate(dateParts);
      const periodKey = periodFromDayOffset(offset);
      const period = PLAN[periodKey];
      for (const medication of period.medications) {
        for (const time of medication.times) {
          if (offset === elapsedDays && time > currentTime) continue;
          const key = logKey(date, periodKey, medication.id, time);
          rows.push({
            key,
            date,
            time,
            periodKey,
            medication,
            status: stateLog[key] || ''
          });
        }
      }
    }
    return rows;
  }

  function init() {
    const operationInput = document.getElementById('operation-date');
    const periodTabs = document.getElementById('period-tabs');
    const medicationGrid = document.getElementById('medication-grid');
    const todaySummary = document.getElementById('today-summary');
    const journalList = document.getElementById('journal-list');
    const journalSummary = document.getElementById('journal-summary');
    const reminderButton = document.getElementById('enable-reminders');
    const calendarButton = document.getElementById('calendar-download');
    const showJournalButton = document.getElementById('show-journal');
    const printJournalButton = document.getElementById('print-journal');
    if (!operationInput || !periodTabs || !medicationGrid) return;

    const state = readState();
    if (state.operationDate) {
      operationInput.value = state.operationDate;
      state.selectedPeriod = periodFromOperationDate(state.operationDate, new Date());
    }

    function renderTabs() {
      periodTabs.innerHTML = PERIOD_ORDER.map(function (key) {
        const active = state.selectedPeriod === key;
        return `<button class="filter-button${active ? ' active' : ''}" type="button" data-period="${key}" aria-pressed="${active}">${escapeHtml(PLAN[key].label)}</button>`;
      }).join('');
    }

    function renderSummary() {
      const period = PLAN[state.selectedPeriod];
      const date = todayKey();
      const total = period.medications.reduce((sum, medication) => sum + medication.times.length, 0);
      let done = 0;
      let missed = 0;
      for (const medication of period.medications) {
        for (const time of medication.times) {
          const status = state.log[logKey(date, state.selectedPeriod, medication.id, time)];
          if (status === 'done') done += 1;
          if (status === 'missed') missed += 1;
        }
      }
      todaySummary.innerHTML = `<span>${escapeHtml(period.label)}</span><h3>${escapeHtml(period.dayRange)}</h3><p>Сегодня отмечено выполненными: <strong>${done} из ${total}</strong>${missed ? `. Пропущено: <strong>${missed}</strong>.` : '.'}</p><strong>${state.operationDate ? `Дата операции: ${escapeHtml(state.operationDate)}` : 'Укажите дату операции — неделя лечения определится автоматически.'}</strong>`;
    }

    function doseActions(periodKey, medication, time) {
      const date = todayKey();
      const key = logKey(date, periodKey, medication.id, time);
      const current = state.log[key] || '';
      return `<p><strong>${escapeHtml(time)}</strong> · ${escapeHtml(statusLabel(current))}</p><div class="filter-row"><button class="filter-button${current === 'done' ? ' active' : ''}" type="button" data-dose-status="done" data-dose-key="${escapeHtml(key)}" aria-pressed="${current === 'done'}">✓ Выполнено</button><button class="filter-button${current === 'missed' ? ' active' : ''}" type="button" data-dose-status="missed" data-dose-key="${escapeHtml(key)}" aria-pressed="${current === 'missed'}">Пропущено</button></div>`;
    }

    function renderMedications() {
      const period = PLAN[state.selectedPeriod];
      medicationGrid.innerHTML = period.medications.map(function (medication) {
        const duration = medication.duration ? `<p><strong>Курс:</strong> ${escapeHtml(medication.duration)}</p>` : '';
        return `<article class="path-card"><span>Действующее вещество (МНН)</span><h3>${escapeHtml(medication.active)}</h3><p><strong>Пример торгового названия:</strong> ${escapeHtml(medication.trade)}</p><p>${escapeHtml(medication.dose)}</p>${duration}${medication.times.map(time => doseActions(state.selectedPeriod, medication, time)).join('')}</article>`;
      }).join('');
    }

    function renderJournal() {
      if (!journalList || !journalSummary) return;
      if (!state.operationDate) {
        journalSummary.textContent = 'Укажите дату операции, чтобы сформировать журнал с первого дня лечения.';
        journalList.innerHTML = '<p class="search-empty">После выбора даты здесь появится таблица всех приёмов с дня операции по текущий момент.</p>';
        return;
      }

      const rows = buildJournalSchedule(state.operationDate, new Date(), state.log);
      const done = rows.filter(row => row.status === 'done').length;
      const missed = rows.filter(row => row.status === 'missed').length;
      const unmarked = rows.filter(row => !row.status).length;
      const marked = done + missed;
      const adherence = marked ? Math.round(done * 100 / marked) : 0;
      journalSummary.textContent = rows.length
        ? `С момента операции: ${rows.length}. Выполнено: ${done}. Пропущено: ${missed}. Не отмечено: ${unmarked}.${marked ? ` Приверженность среди отмеченных: ${adherence}%.` : ''}`
        : 'С момента операции пока нет прошедших по времени закапываний.';

      if (!rows.length) {
        journalList.innerHTML = '<p class="search-empty">Пока нет данных для таблицы.</p>';
        return;
      }

      journalList.innerHTML = `<div class="postop-journal-table-wrap"><table class="postop-journal-table"><thead><tr><th>Дата</th><th>Время</th><th>Период</th><th>Препарат</th><th>Статус</th></tr></thead><tbody>${rows.map(function (row) {
        return `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.time)}</td><td>${escapeHtml(PLAN[row.periodKey].label)}</td><td><strong>${escapeHtml(row.medication.active)}</strong><br>пример: ${escapeHtml(row.medication.trade)}</td><td><span class="postop-journal-status">${escapeHtml(statusLabel(row.status))}</span></td></tr>`;
      }).join('')}</tbody></table></div>`;
    }

    function renderAll() {
      renderTabs();
      renderSummary();
      renderMedications();
      renderJournal();
    }

    periodTabs.addEventListener('click', function (event) {
      const button = event.target.closest('[data-period]');
      if (!button) return;
      state.selectedPeriod = button.dataset.period;
      writeState(state);
      renderAll();
    });

    medicationGrid.addEventListener('click', function (event) {
      const button = event.target.closest('[data-dose-status]');
      if (!button) return;
      const key = button.dataset.doseKey;
      const next = button.dataset.doseStatus;
      state.log[key] = state.log[key] === next ? '' : next;
      if (!state.log[key]) delete state.log[key];
      writeState(state);
      renderAll();
    });

    operationInput.addEventListener('change', function () {
      state.operationDate = operationInput.value;
      if (state.operationDate) state.selectedPeriod = periodFromOperationDate(state.operationDate, new Date());
      writeState(state);
      renderAll();
    });

    showJournalButton?.addEventListener('click', function () {
      renderJournal();
      document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    printJournalButton?.addEventListener('click', function () {
      window.print();
    });

    function scheduleOpenPageNotifications() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const currentPeriod = state.operationDate ? periodFromOperationDate(state.operationDate, now) : state.selectedPeriod;
      const period = PLAN[currentPeriod];
      for (const medication of period.medications) {
        for (const time of medication.times) {
          const [hour, minute] = time.split(':').map(Number);
          const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
          const delay = due.getTime() - now.getTime();
          if (delay > 0 && delay <= 86400000) {
            setTimeout(function () {
              new Notification('Пора закапать глазные капли', {
                body: `${medication.active}: 1 капля. Откройте план и отметьте выполнение.`,
                tag: `cataract-${medication.id}-${time}`
              });
            }, delay);
          }
        }
      }
    }

    reminderButton?.addEventListener('click', async function () {
      if (!('Notification' in window)) {
        reminderButton.textContent = 'Уведомления не поддерживаются — используйте календарь';
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        reminderButton.textContent = 'Уведомления включены для открытой страницы';
        scheduleOpenPageNotifications();
      } else {
        reminderButton.textContent = 'Уведомления не разрешены — используйте календарь';
      }
    });

    calendarButton?.addEventListener('click', function () {
      if (!state.operationDate) {
        operationInput.focus();
        calendarButton.textContent = 'Сначала укажите дату операции';
        return;
      }
      const content = buildCalendar(state.operationDate);
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'cataract-postop-plan.ics';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      calendarButton.textContent = 'Календарь подготовлен';
    });

    renderAll();
  }

  return {
    PLAN,
    PERIOD_ORDER,
    getPeriodPlan,
    periodFromOperationDate,
    buildCalendar,
    buildJournalSchedule,
    init
  };
});
