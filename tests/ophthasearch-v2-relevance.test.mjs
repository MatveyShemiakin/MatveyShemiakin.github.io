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
