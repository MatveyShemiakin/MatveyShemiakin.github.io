import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const modulePath = path.join(root, 'patients', 'cataract-postop-plan.js');
const pagePath = path.join(root, 'patients', 'cataract-postop-plan', 'index.html');
const patientsJsPath = path.join(root, 'patients', 'patients.js');

function localDate(iso) {
  return new Date(`${iso}T12:00:00`);
}

test('logic module exists and exports the expected API', () => {
  assert.equal(fs.existsSync(modulePath), true);
  const api = require(modulePath);
  assert.equal(typeof api.periodFromOperationDate, 'function');
  assert.equal(typeof api.getPeriodPlan, 'function');
  assert.equal(typeof api.buildCalendar, 'function');
});

test('period calculation follows postoperative weeks', () => {
  const api = require(modulePath);
  assert.equal(api.periodFromOperationDate('2026-09-01', localDate('2026-09-01')), 'week1');
  assert.equal(api.periodFromOperationDate('2026-09-01', localDate('2026-09-07')), 'week1');
  assert.equal(api.periodFromOperationDate('2026-09-01', localDate('2026-09-08')), 'week2');
  assert.equal(api.periodFromOperationDate('2026-09-01', localDate('2026-09-15')), 'week3');
  assert.equal(api.periodFromOperationDate('2026-09-01', localDate('2026-09-22')), 'week4');
  assert.equal(api.periodFromOperationDate('2026-09-01', localDate('2026-09-29')), 'afterMonth');
});

test('plan preserves the supplied memo and explains medicines by active ingredient', () => {
  const api = require(modulePath);
  const week1 = api.getPeriodPlan('week1');
  assert.equal(week1.medications.length, 3);
  assert.equal(week1.medications[0].active, 'Ципрофлоксацин + дексаметазон');
  assert.equal(week1.medications[0].trade, 'Комбинил');
  assert.deepEqual(week1.medications[0].times, ['08:00', '12:00', '16:00', '20:00']);
  assert.equal(week1.medications[1].active, 'Бромфенак');
  assert.equal(week1.medications[2].active, 'Декспантенол');
  const afterMonth = api.getPeriodPlan('afterMonth');
  assert.equal(afterMonth.medications[0].active, 'Повидон + поливиниловый спирт');
  assert.equal(afterMonth.medications[0].duration, '3 месяца');
});

test('calendar export contains alarms and all treatment stages', () => {
  const api = require(modulePath);
  const ics = api.buildCalendar('2026-09-01');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.match(ics, /Ципрофлоксацин \+ дексаметазон/);
  assert.match(ics, /Бромфенак/);
  assert.match(ics, /Декспантенол/);
  assert.match(ics, /Повидон \+ поливиниловый спирт/);
  assert.match(ics, /COUNT=7/);
  assert.match(ics, /COUNT=90/);
});

test('patient page uses existing styles, required controls, red flags and no inline styles', () => {
  assert.equal(fs.existsSync(pagePath), true);
  const html = fs.readFileSync(pagePath, 'utf8');
  assert.match(html, /\/patients\/patients\.css/);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  for (const id of ['operation-date','period-tabs','medication-grid','today-summary','journal-list','journal-summary','enable-reminders','calendar-download','show-journal','print-journal']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Срочно обратиться к врачу/);
  assert.match(html, /Информация носит справочный/);
  assert.match(html, /\+7 \(499\) 490-0303/);
});

test('cataract path renderer contains the approved postoperative entry card', () => {
  assert.equal(fs.existsSync(patientsJsPath), true);
  const source = fs.readFileSync(patientsJsPath, 'utf8');
  assert.match(source, /\/patients\/cataract-postop-plan\//);
  assert.match(source, /Послеоперационный план лечения Шемякина М\.Ю\./);
  assert.match(source, /cataract-page/);
});
