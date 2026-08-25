import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretClinicalQuestion } from '../workers/ophthasearch-v2/query-interpreter.js';
import { buildResearchPlan } from '../workers/ophthasearch-v2/research-planner.js';

async function interpret(question, language = 'ru') {
  return interpretClinicalQuestion({ schemaVersion: '2.0', language, question, mode: 'standard', filters: {} });
}

test('interprets Russian POAG pharmacotherapy as treatment with dosing and alternatives', async () => {
  const intent = await interpret('Современная медикаментозная терапия ПОУГ: что использовать первой линией и когда переходить на комбинацию?');
  assert.equal(intent.domain, 'glaucoma');
  assert.equal(intent.condition, 'primary open-angle glaucoma');
  assert.equal(intent.question_type, 'therapy');
  assert.ok(intent.interventions.includes('pharmacological therapy'));
  assert.equal(intent.needs_dosing, true);
  assert.equal(intent.needs_alternatives, true);
});

test('interprets ERM surgery question as vitreoretinal management', async () => {
  const intent = await interpret('Стоит ли оперировать ERM при Vis 0.8 и выраженных metamorphopsia?');
  assert.equal(intent.domain, 'retina');
  assert.equal(intent.condition, 'epiretinal membrane');
  assert.equal(intent.question_type, 'surgery');
  assert.ok(intent.modifiers.some((value) => /0\.8/.test(value)));
  assert.ok(intent.modifiers.some((value) => /metamorph/i.test(value)));
});

test('interprets macular-hole surgical question and phakic modifier', async () => {
  const intent = await interpretClinicalQuestion({
    schemaVersion: '2.0',
    language: 'en',
    question: 'What is the preferred management of a 450 µm full-thickness macular hole in a phakic patient?',
    mode: 'standard',
    filters: {}
  });
  assert.equal(intent.domain, 'retina');
  assert.equal(intent.condition, 'full-thickness macular hole');
  assert.equal(intent.question_type, 'surgery');
  assert.ok(intent.modifiers.some((value) => /450/.test(value)));
  assert.ok(intent.modifiers.some((value) => /phakic/i.test(value)));
});

test('interprets IOL dislocation with glaucoma as IOL management plus comorbidity modifier', async () => {
  const intent = await interpret('Тактика при дислокации ИОЛ в стекловидное тело у пациента с глаукомой.');
  assert.equal(intent.domain, 'lens-iol');
  assert.equal(intent.condition, 'intraocular lens dislocation');
  assert.equal(intent.question_type, 'management');
  assert.ok(intent.modifiers.some((value) => /glaucoma/i.test(value)));
});

test('research planner creates independent evidence tracks for specialist therapy questions', async () => {
  const intent = await interpret('Современная медикаментозная терапия ПОУГ: что использовать первой линией и когда переходить на комбинацию?');
  const plan = buildResearchPlan(intent);
  const ids = new Set(plan.map((track) => track.id));
  for (const required of ['guidelines', 'efficacy', 'safety', 'alternatives', 'monitoring-escalation', 'pivotal-evidence']) {
    assert.ok(ids.has(required), `missing ${required}`);
  }
  assert.ok(plan.every((track) => Array.isArray(track.sourceClasses) && track.sourceClasses.length > 0));
  assert.ok(plan.some((track) => /primary open-angle glaucoma/i.test(track.query)));
});

test('planner does not create retinal-detachment search terms for glaucoma pharmacotherapy', async () => {
  const intent = await interpret('Медикаментозная терапия первичной открытоугольной глаукомы');
  const plan = buildResearchPlan(intent);
  const combined = plan.map((track) => track.query).join(' ').toLowerCase();
  assert.doesNotMatch(combined, /retinal detachment|vitrectomy|scleral buckle/);
});
