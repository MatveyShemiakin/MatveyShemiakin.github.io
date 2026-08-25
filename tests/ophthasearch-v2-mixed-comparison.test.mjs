import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretClinicalQuestion } from '../workers/ophthasearch-v2/query-interpreter.js';
import { buildResearchPlan } from '../workers/ophthasearch-v2/research-planner.js';

test('SLT versus latanoprost preserves procedure as intervention and drug as comparator', async () => {
  const intent = await interpretClinicalQuestion({
    schemaVersion: '2.0',
    language: 'en',
    question: 'SLT vs latanoprost as initial treatment for primary open-angle glaucoma',
    mode: 'standard',
    filters: {}
  });

  assert.equal(intent.condition, 'primary open-angle glaucoma');
  assert.equal(intent.question_type, 'comparison');
  assert.deepEqual(intent.interventions, ['selective laser trabeculoplasty']);
  assert.deepEqual(intent.comparators, ['latanoprost']);

  const efficacy = buildResearchPlan(intent).find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /selective laser trabeculoplasty/i);
  assert.match(efficacy.query, /latanoprost/i);
});
