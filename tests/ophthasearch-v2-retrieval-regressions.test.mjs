import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchPlan } from '../workers/ophthasearch-v2/research-planner.js';
import { scoreMedicalRelevance, filterRelevantDocuments } from '../workers/ophthasearch-v2/relevance.js';

test('ERM bibliographic retrieval does not require case-specific visual acuity', () => {
  const plan = buildResearchPlan({
    language: 'ru',
    domain: 'retina',
    condition: 'epiretinal membrane',
    question_type: 'surgery',
    interventions: [],
    comparators: [],
    outcomes: ['visual acuity', 'metamorphopsia'],
    modifiers: ['vis 0.8', 'metamorphopsia'],
    needs_dosing: false,
    needs_alternatives: true
  });
  const efficacy = plan.find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /epiretinal membrane/i);
  assert.match(efficacy.query, /vitrectomy|membrane peeling/i);
  assert.doesNotMatch(efficacy.query, /vis\s*0\.8/i);
});

test('IOL dislocation retrieval keeps comorbid modifiers out of the mandatory bibliographic query', () => {
  const plan = buildResearchPlan({
    language: 'ru',
    domain: 'lens-iol',
    condition: 'intraocular lens dislocation',
    question_type: 'management',
    interventions: [],
    comparators: [],
    outcomes: [],
    modifiers: ['glaucoma', 'vitreous involvement'],
    needs_dosing: false,
    needs_alternatives: true
  });
  const efficacy = plan.find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /intraocular lens dislocation|dislocated intraocular lens/i);
  assert.doesNotMatch(efficacy.query, /\bglaucoma\b/i);
  assert.doesNotMatch(efficacy.query, /vitreous involvement/i);
});

test('dislocated intraocular lens wording passes relevance for IOL-dislocation intent', () => {
  const intent = {
    domain: 'lens-iol',
    condition: 'intraocular lens dislocation',
    question_type: 'management',
    interventions: [],
    comparators: [],
    outcomes: [],
    modifiers: ['vitreous involvement']
  };
  const paper = {
    title: 'Management of dislocated posterior chamber intraocular lenses',
    abstract_or_summary: 'Surgical management of a dislocated intraocular lens included repositioning, exchange, fixation and pars plana vitrectomy when vitreous involvement was present.',
    publication_types: ['Comparative Study']
  };
  const score = scoreMedicalRelevance(paper, intent);
  assert.ok(score >= 0.45, `score=${score}`);
  assert.equal(filterRelevantDocuments([paper], intent).length, 1);
});
