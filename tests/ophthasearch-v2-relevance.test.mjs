import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreMedicalRelevance,
  filterRelevantDocuments
} from '../workers/ophthasearch-v2/relevance.js';

const glaucomaIntent = {
  domain: 'glaucoma',
  condition: 'primary open-angle glaucoma',
  question_type: 'therapy',
  interventions: ['pharmacological therapy'],
  comparators: [],
  outcomes: ['intraocular pressure'],
  modifiers: []
};

test('glaucoma pharmacotherapy outranks unrelated retinal-detachment evidence', () => {
  const glaucoma = {
    title: 'Medical treatment of primary open-angle glaucoma',
    abstract_or_summary: 'Prostaglandin analogues, beta blockers and intraocular pressure lowering therapy in glaucoma.'
  };
  const retina = {
    title: 'Vitrectomy for rhegmatogenous retinal detachment',
    abstract_or_summary: 'Retinal reattachment after pars plana vitrectomy and gas tamponade.'
  };

  assert.ok(scoreMedicalRelevance(glaucoma, glaucomaIntent) > scoreMedicalRelevance(retina, glaucomaIntent));
  assert.deepEqual(
    filterRelevantDocuments([retina, glaucoma], glaucomaIntent).map((item) => item.document.title),
    [glaucoma.title]
  );
});

test('high evidence tier cannot rescue a condition mismatch', () => {
  const retinaMeta = {
    title: 'Systematic review of surgery for retinal detachment',
    abstract_or_summary: 'Meta-analysis of vitrectomy and scleral buckling for rhegmatogenous retinal detachment.',
    publication_types: ['Systematic Review', 'Meta-Analysis']
  };
  assert.ok(scoreMedicalRelevance(retinaMeta, glaucomaIntent) < 0.45);
  assert.equal(filterRelevantDocuments([retinaMeta], glaucomaIntent).length, 0);
});

test('therapy-domain match contributes to relevance', () => {
  const pharmacology = {
    title: 'Prostaglandin analogues as first-line glaucoma therapy',
    abstract_or_summary: 'Topical medication lowers intraocular pressure in primary open-angle glaucoma.'
  };
  const diagnostic = {
    title: 'Optical coherence tomography in glaucoma diagnosis',
    abstract_or_summary: 'Diagnostic imaging of retinal nerve fiber layer in primary open-angle glaucoma.'
  };
  assert.ok(scoreMedicalRelevance(pharmacology, glaucomaIntent) > scoreMedicalRelevance(diagnostic, glaucomaIntent));
});

test('filterRelevantDocuments sorts by relevance score descending', () => {
  const broad = {
    title: 'Treatment of glaucoma',
    abstract_or_summary: 'Treatment options for glaucoma.'
  };
  const specific = {
    title: 'Pharmacological treatment of primary open-angle glaucoma',
    abstract_or_summary: 'Prostaglandin analogues lower intraocular pressure in primary open-angle glaucoma.'
  };
  const filtered = filterRelevantDocuments([broad, specific], glaucomaIntent, 0.4);
  assert.equal(filtered[0].document.title, specific.title);
  assert.ok(filtered[0].score >= filtered[1].score);
});

test('named comparison requires evidence about the requested drugs, not just the condition', () => {
  const intent = {
    domain: 'glaucoma',
    condition: 'glaucoma',
    question_type: 'comparison',
    interventions: ['latanoprost'],
    comparators: ['timolol'],
    outcomes: ['intraocular pressure'],
    modifiers: []
  };
  const exact = {
    title: 'Latanoprost versus timolol in glaucoma',
    abstract_or_summary: 'A randomized comparison of latanoprost and timolol for intraocular pressure reduction in glaucoma.'
  };
  const conditionOnly = {
    title: 'Vitreous proteome in eyes with glaucoma',
    abstract_or_summary: 'Proteomic characteristics in glaucoma without treatment comparison.'
  };

  assert.ok(scoreMedicalRelevance(exact, intent) > scoreMedicalRelevance(conditionOnly, intent));
  assert.equal(filterRelevantDocuments([conditionOnly], intent).length, 0);
  assert.equal(filterRelevantDocuments([conditionOnly, exact], intent)[0].document.title, exact.title);
});

test('named monotherapy comparison ranks direct head-to-head evidence above fixed-combination evidence', () => {
  const intent = {
    domain: 'glaucoma',
    condition: 'primary open-angle glaucoma',
    question_type: 'comparison',
    interventions: ['latanoprost'],
    comparators: ['timolol'],
    outcomes: ['intraocular pressure'],
    modifiers: []
  };
  const direct = {
    title: 'Latanoprost versus timolol monotherapy in primary open-angle glaucoma',
    abstract_or_summary: 'Randomized head-to-head monotherapy comparison of latanoprost and timolol for intraocular pressure reduction in primary open-angle glaucoma.'
  };
  const fixedCombination = {
    title: 'Fixed combination of latanoprost and timolol in primary open-angle glaucoma',
    abstract_or_summary: 'A fixed-combination latanoprost/timolol product was compared with other fixed combinations for intraocular pressure reduction.'
  };

  const directScore = scoreMedicalRelevance(direct, intent);
  const combinationScore = scoreMedicalRelevance(fixedCombination, intent);
  assert.ok(directScore > combinationScore, `direct=${directScore} combination=${combinationScore}`);
  assert.equal(filterRelevantDocuments([fixedCombination, direct], intent, 0.45)[0].document.title, direct.title);
});

test('RRD surgical-management evidence outranks molecular topic-only RRD evidence', () => {
  const intent = {
    domain: 'retina',
    condition: 'rhegmatogenous retinal detachment',
    question_type: 'surgery',
    interventions: ['pars plana vitrectomy', 'scleral buckling', 'pneumatic retinopexy'],
    comparators: [],
    outcomes: ['retinal reattachment', 'visual acuity'],
    modifiers: []
  };
  const surgical = {
    title: 'Pars plana vitrectomy versus scleral buckling for rhegmatogenous retinal detachment',
    abstract_or_summary: 'Comparative surgical treatment of rhegmatogenous retinal detachment evaluated retinal reattachment, visual acuity, recurrence and complications.'
  };
  const proteome = {
    title: 'The baseline vitreous proteome in rhegmatogenous retinal detachment',
    abstract_or_summary: 'A case-control proteomic study investigated vitreous proteins and proliferative vitreoretinopathy biomarkers in rhegmatogenous retinal detachment.'
  };

  const surgicalScore = scoreMedicalRelevance(surgical, intent);
  const proteomeScore = scoreMedicalRelevance(proteome, intent);
  assert.ok(surgicalScore >= 0.65, `surgical score ${surgicalScore}`);
  assert.ok(proteomeScore < 0.45, `proteome score ${proteomeScore}`);
  assert.ok(surgicalScore > proteomeScore);
  assert.deepEqual(filterRelevantDocuments([proteome, surgical], intent).map((item) => item.document.title), [surgical.title]);
});

test('macular-hole comparison strongly prefers records containing both requested surgical arms', () => {
  const intent = {
    domain: 'retina',
    condition: 'full-thickness macular hole',
    question_type: 'comparison',
    interventions: ['inverted ILM flap'],
    comparators: ['internal limiting membrane peeling'],
    outcomes: ['anatomical closure', 'visual acuity'],
    modifiers: ['>400 µm']
  };
  const direct = {
    title: 'Inverted ILM flap versus conventional ILM peeling for large macular holes',
    abstract_or_summary: 'Eyes with full-thickness macular holes larger than 400 µm were compared for anatomical closure and visual acuity after inverted ILM flap or conventional internal limiting membrane peeling.'
  };
  const oneArm = {
    title: 'Internal limiting membrane peeling for macular hole surgery',
    abstract_or_summary: 'Full-thickness macular holes underwent internal limiting membrane peeling with anatomical closure assessed after surgery.'
  };
  const unrelated = {
    title: 'Proteomic biomarkers in idiopathic macular holes',
    abstract_or_summary: 'Proteomic analysis of vitreous samples from eyes with full-thickness macular hole.'
  };

  const ranked = filterRelevantDocuments([unrelated, oneArm, direct], intent, 0.45);
  assert.equal(ranked[0].document.title, direct.title);
  assert.ok(ranked[0].score > scoreMedicalRelevance(oneArm, intent));
  assert.equal(ranked.some((item) => item.document.title === unrelated.title), false);
});
