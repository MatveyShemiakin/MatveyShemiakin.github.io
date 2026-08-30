import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretClinicalQuestion } from '../workers/ophthasearch-v2/query-interpreter.js';
import { buildResearchPlan } from '../workers/ophthasearch-v2/research-planner.js';

async function interpret(question, language = 'ru', deps = {}) {
  return interpretClinicalQuestion({ schemaVersion: '2.0', language, question, mode: 'standard', filters: {} }, deps);
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

test('explicit Russian A-or-B comparative wording wins over generic therapy wording', async () => {
  const slt = await interpret('SLT или латанопрост как стартовая терапия при первичной открытоугольной глаукоме?');
  assert.equal(slt.question_type, 'comparison');
  assert.ok(slt.interventions.some((value) => /selective laser trabeculoplasty/i.test(value)));
  assert.ok(slt.comparators.some((value) => /latanoprost/i.test(value)));

  const drops = await interpret('Биматопрост или латанопрост: что эффективнее снижает ВГД при ПОУГ?');
  assert.equal(drops.question_type, 'comparison');
  assert.deepEqual(drops.interventions, ['bimatoprost']);
  assert.deepEqual(drops.comparators, ['latanoprost']);
});

test('uncomplicated retinal detachment comparison is not misclassified as safety', async () => {
  const intent = await interpret('Пневматическая ретинопексия или витрэктомия при неосложнённой регматогенной отслойке сетчатки?');
  assert.equal(intent.condition, 'retinal detachment');
  assert.equal(intent.question_type, 'comparison');
});

test('plain Russian therapy wording is recognized for acute anterior uveitis', async () => {
  const intent = await interpret('Современная терапия острого переднего увеита у взрослого пациента');
  assert.equal(intent.condition, 'uveitis');
  assert.equal(intent.question_type, 'therapy');
});

test('recognizes English dislocated-IOL phrasing used by surgeons', async () => {
  const intent = await interpret('Yamane fixation versus sutured scleral fixation for dislocated intraocular lens', 'en');
  assert.equal(intent.domain, 'lens-iol');
  assert.equal(intent.condition, 'intraocular lens dislocation');
  assert.equal(intent.question_type, 'comparison');
});

test('recognizes AMD, DME and retinal-vein-occlusion conditions in English comparisons', async () => {
  const amd = await interpret('Aflibercept versus ranibizumab for neovascular age-related macular degeneration', 'en');
  assert.match(amd.condition, /neovascular age-related macular degeneration/i);

  const dme = await interpret('Faricimab versus aflibercept for diabetic macular edema', 'en');
  assert.match(dme.condition, /diabetic macular edema/i);

  const rvo = await interpret('Bevacizumab versus aflibercept for macular edema due to retinal vein occlusion', 'en');
  assert.match(rvo.condition, /retinal vein occlusion/i);
});

test('deterministic explicit anchors repair a plausible but wrong AI intent', async () => {
  const intent = await interpret(
    'Биматопрост или латанопрост: что эффективнее снижает ВГД при ПОУГ?',
    'ru',
    {
      interpretIntent: async () => ({
        language: 'ru', domain: 'glaucoma', condition: 'primary open-angle glaucoma', question_type: 'general',
        population: [], interventions: [], comparators: [], outcomes: [], modifiers: [], requested_depth: 'specialist',
        needs_dosing: false, needs_alternatives: true, ambiguities: []
      })
    }
  );
  assert.equal(intent.question_type, 'comparison');
  assert.deepEqual(intent.interventions, ['bimatoprost']);
  assert.deepEqual(intent.comparators, ['latanoprost']);
});

test('research planner creates independent evidence tracks for specialist therapy questions', async () => {
  const intent = await interpret('Современная медикаментозная терапия ПОУГ: что использовать первой линией и когда переходить на комбинацию?');
  const plan = buildResearchPlan(intent);
  const ids = new Set(plan.map((track) => [track.id, track]));
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
