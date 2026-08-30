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

test('IOL dislocation aliases pass the relevance gate without lowering the global threshold', () => {
  const intent = {
    domain: 'lens-iol',
    condition: 'intraocular lens dislocation',
    question_type: 'surgery',
    interventions: [],
    comparators: [],
    outcomes: [],
    modifiers: []
  };
  const dislocatedIol = {
    title: 'Scleral fixation of dislocated intraocular lenses',
    abstract_or_summary: 'Surgical management of dislocated IOLs using flanged intrascleral fixation was evaluated in this comparative series.'
  };

  assert.ok(scoreMedicalRelevance(dislocatedIol, intent) >= 0.45);
  assert.equal(filterRelevantDocuments([dislocatedIol], intent).length, 1);
});

test('Yamane evidence stays relevant for a dislocated-IOL comparison', () => {
  const intent = {
    domain: 'lens-iol',
    condition: 'intraocular lens dislocation',
    question_type: 'comparison',
    interventions: ['Yamane fixation'],
    comparators: ['sutured scleral fixation'],
    outcomes: [],
    modifiers: []
  };
  const paper = {
    title: 'Yamane technique versus sutured scleral fixation for dislocated IOL',
    abstract_or_summary: 'Comparative outcomes of flanged intrascleral fixation and sutured scleral fixation for dislocated intraocular lenses.'
  };

  assert.ok(scoreMedicalRelevance(paper, intent) >= 0.45);
  assert.equal(filterRelevantDocuments([paper], intent).length, 1);
});

test('secondary-IOL fixation literature can support a dislocation comparison without lowering threshold', () => {
  const intent = {
    domain: 'lens-iol',
    condition: 'intraocular lens dislocation',
    question_type: 'comparison',
    interventions: ['Yamane fixation'],
    comparators: ['sutured scleral fixation'],
    outcomes: [],
    modifiers: []
  };
  const paper = {
    title: 'Scleral Fixated Secondary IOLs: Comparative Outcomes of Yamane and Gore-Tex-Sutured Techniques',
    abstract_or_summary: 'Secondary intraocular lens implantation with flanged intrascleral fixation and Gore-Tex sutured scleral fixation was compared for visual and postoperative outcomes.'
  };

  assert.ok(scoreMedicalRelevance(paper, intent) >= 0.45);
  assert.equal(filterRelevantDocuments([paper], intent).length, 1);
});
