import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const modulePath = path.join(root, 'patients', 'cataract-postop-plan.js');
const pagePath = path.join(root, 'patients', 'cataract-postop-plan', 'index.html');
const pageCssPath = path.join(root, 'patients', 'cataract-postop-plan.css');
const patientsJsPath = path.join(root, 'patients', 'patients.js');

function localDate(iso, time = '12:00:00') {
  return new Date(`${iso}T${time}`);
}

test('logic module exists and exports the expected API', () => {
  assert.equal(fs.existsSync(modulePath), true);
  const api = require(modulePath);
  assert.equal(typeof api.periodFromOperationDate, 'function');
  assert.equal(typeof api.getPeriodPlan, 'function');
  assert.equal(typeof api.buildCalendar, 'function');
  assert.equal(typeof api.buildJournalSchedule, 'function');
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

test('journal schedule contains every elapsed dose from operation to current moment', () => {
  const api = require(modulePath);
  const log = {
    '2026-09-01|week1|cipro-dexa|08:00': 'done',
    '2026-09-01|week1|bromfenac|09:00': 'missed'
  };
  const rows = api.buildJournalSchedule('2026-09-01', localDate('2026-09-01', '13:00:00'), log);
  assert.deepEqual(rows.map(row => row.time), ['08:00', '12:00', '09:00', '10:00']);
  assert.equal(rows[0].status, 'done');
  assert.equal(rows[2].status, 'missed');
  assert.equal(rows[1].status, '');
  assert.equal(rows.every(row => row.date === '2026-09-01'), true);
});

test('patient page uses mobile fix, journal table hooks and no public consultation CTA', () => {
  assert.equal(fs.existsSync(pagePath), true);
  assert.equal(fs.existsSync(pageCssPath), true);
  const html = fs.readFileSync(pagePath, 'utf8');
  const css = fs.readFileSync(pageCssPath, 'utf8');
  assert.match(html, /\/patients\/patients\.css/);
  assert.match(html, /\/patients\/cataract-postop-plan\.css/);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  for (const id of ['operation-date','period-tabs','medication-grid','today-summary','journal-list','journal-summary','enable-reminders','calendar-download','show-journal','print-journal']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Срочно обратиться к врачу/);
  assert.match(html, /Информация носит справочный/);
  assert.doesNotMatch(html, /\+7 \(499\) 490-0303/);
  assert.doesNotMatch(html, /Записаться на консультацию/);
  assert.doesNotMatch(html, /patient-consultation-cta/);
  assert.match(css, /\.postop-journal-table-wrap/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /patient-hero-copy h1/);
});

test('cataract path renderer contains the approved postoperative entry card', () => {
  assert.equal(fs.existsSync(patientsJsPath), true);
  const source = fs.readFileSync(patientsJsPath, 'utf8');
  assert.match(source, /\/patients\/cataract-postop-plan\//);
  assert.match(source, /Послеоперационный план лечения Шемякина М\.Ю\./);
  assert.match(source, /cataract-page/);
});
