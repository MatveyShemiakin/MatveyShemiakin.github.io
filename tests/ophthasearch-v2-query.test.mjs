import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretClinicalQuestion } from '../workers/ophthasearch-v2/query-interpreter.js';
import { resolveClinicalIntent } from '../workers/ophthasearch-v2/query-resolver.js';
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
  for (const required of ['guidelines', 'efficacy', 'safety', 'alternatives', 'monitoring-escalation', 'pivotal-evidence', 'ongoing-trials']) {
    assert.ok(ids.has(required), `missing ${required}`);
  }
  assert.ok(plan.every((track) => Array.isArray(track.sourceClasses) && track.sourceClasses.length > 0));
  assert.ok(plan.some((track) => /primary open-angle glaucoma/i.test(track.query)));
  assert.ok(plan.find((track) => track.id === 'ongoing-trials').sourceClasses.includes('clinicaltrials'));
});

test('planner does not create retinal-detachment search terms for glaucoma pharmacotherapy', async () => {
  const intent = await interpret('Медикаментозная терапия первичной открытоугольной глаукомы');
  const plan = buildResearchPlan(intent);
  const combined = plan.map((track) => track.query).join(' ').toLowerCase();
  assert.doesNotMatch(combined, /retinal detachment|vitrectomy|scleral buckle/);
});

test('acceptance: latanoprost versus timolol is a named POAG comparison', async () => {
  const intent = await interpret('Есть ли преимущество латанопроста перед тимололом при первичной открытоугольной глаукоме?');
  assert.equal(intent.condition, 'primary open-angle glaucoma');
  assert.equal(intent.question_type, 'comparison');
  assert.deepEqual(intent.interventions, ['latanoprost']);
  assert.deepEqual(intent.comparators, ['timolol']);
  const efficacy = buildResearchPlan(intent).find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /latanoprost/i);
  assert.match(efficacy.query, /timolol/i);
});

test('acceptance: rhegmatogenous retinal detachment surgery resolves the subtype and surgical search domain', async () => {
  const intent = await interpret('Тактика хирургического лечения регматогенной отслойки сетчатки');
  assert.equal(intent.domain, 'retina');
  assert.equal(intent.condition, 'rhegmatogenous retinal detachment');
  assert.equal(intent.question_type, 'surgery');
  assert.ok(intent.interventions.some((value) => /vitrectomy|scleral buckl|pneumatic retinopexy|surgical management/i.test(value)));

  const plan = buildResearchPlan(intent);
  const efficacy = plan.find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /rhegmatogenous retinal detachment/i);
  assert.match(efficacy.query, /vitrectomy|scleral buckl|pneumatic retinopexy/i);
});

test('acceptance: inverted ILM flap versus conventional peeling preserves both comparison arms and hole size', async () => {
  const intent = await interpret(
    'Inverted ILM flap vs conventional ILM peeling for macular hole >400 µm',
    'en'
  );
  assert.equal(intent.domain, 'retina');
  assert.equal(intent.condition, 'full-thickness macular hole');
  assert.equal(intent.question_type, 'comparison');
  assert.deepEqual(intent.interventions, ['inverted ILM flap']);
  assert.deepEqual(intent.comparators, ['internal limiting membrane peeling']);
  assert.ok(intent.modifiers.some((value) => />?400\s*µm/i.test(value)));

  const efficacy = buildResearchPlan(intent).find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /inverted ILM flap/i);
  assert.match(efficacy.query, /internal limiting membrane peeling/i);
  assert.match(efficacy.query, /400|large macular hole/i);
});

test('resolved standard ophthalmology intent skips a redundant AI interpretation call', async () => {
  let aiCalls = 0;
  const intent = await resolveClinicalIntent({
    schemaVersion: '2.0',
    language: 'ru',
    question: 'Есть ли преимущество латанопроста перед тимололом при первичной открытоугольной глаукоме?',
    mode: 'standard',
    filters: {}
  }, {}, {
    interpretIntent: async () => {
      aiCalls += 1;
      return { domain: 'wrong', condition: 'wrong' };
    }
  });
  assert.equal(aiCalls, 0);
  assert.equal(intent.condition, 'primary open-angle glaucoma');
  assert.deepEqual(intent.interventions, ['latanoprost']);
  assert.deepEqual(intent.comparators, ['timolol']);
});

test('unresolved ophthalmology question may use AI interpretation as a fallback', async () => {
  let aiCalls = 0;
  const intent = await resolveClinicalIntent({
    schemaVersion: '2.0',
    language: 'ru',
    question: 'Какова современная тактика при редкой хориоидальной патологии с серозной отслойкой?',
    mode: 'standard',
    filters: {}
  }, {}, {
    interpretIntent: async () => {
      aiCalls += 1;
      return {
        language: 'ru', domain: 'retina', condition: 'choroidal disease', question_type: 'management',
        population: [], interventions: [], comparators: [], outcomes: [], modifiers: [],
        requested_depth: 'specialist', needs_dosing: false, needs_alternatives: true, ambiguities: []
      };
    }
  });
  assert.equal(aiCalls, 1);
  assert.equal(intent.condition, 'choroidal disease');
});
