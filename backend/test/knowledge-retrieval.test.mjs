import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPhysicianChoiceContext, retrieveEvidence } from '../src/knowledge-retrieval.mjs';

const viralCase = {
  laterality: 'unilateral',
  course: 'recurrent',
  onset: 'days',
  symptoms: ['pain', 'photophobia'],
  examination: {
    iop_mm_hg: 28,
    iop_state: 'high',
    anterior_chamber_cells: '2+',
    hypopyon: false,
    vitritis: false,
    corneal_infiltrate: false,
    epithelial_defect: false
  },
  suspected_diagnoses: ['передний увеит']
};

test('retrieves viral anterior uveitis evidence from case-specific clues', async () => {
  const result = await retrieveEvidence({
    facts: viralCase,
    supplementalTags: ['sectoral_iris_atrophy', 'reduced_corneal_sensation'],
    includeLocked: true
  });
  const ids = result.evidence_chunks.map((chunk) => chunk.id);
  assert.ok(ids.includes('au-hsv-classification'));
  assert.ok(ids.includes('au-vzv-classification'));
  assert.ok(ids.includes('au-viral-discriminating-clues'));
  assert.ok(ids.includes('au-hsv-vzv-treatment-option'));
});

test('never auto-selects a diagnosis or treatment option', async () => {
  const context = await buildPhysicianChoiceContext({
    facts: viralCase,
    supplementalTags: ['sectoral_iris_atrophy'],
    authoringMode: true
  });
  assert.equal(context.generation_contract.final_decision_owner, 'physician');
  assert.equal(context.generation_contract.do_not_select_final_diagnosis, true);
  assert.equal(context.generation_contract.do_not_select_final_treatment, true);
  assert.ok(context.treatment_candidates.length > 0);
  assert.ok(context.treatment_candidates.every((option) => option.selected === false));
  assert.ok(context.treatment_candidates.every((option) => option.physician_selection_required === true));
});

test('excludes locked treatment evidence from deployment mode', async () => {
  const context = await buildPhysicianChoiceContext({
    facts: viralCase,
    supplementalTags: ['sectoral_iris_atrophy'],
    authoringMode: false
  });
  assert.equal(context.treatment_candidates.length, 0);
  assert.match(context.limitations[0], /excluded/i);
});

test('can expand by adding pathology packages rather than changing provider adapters', async () => {
  const context = await buildPhysicianChoiceContext({ facts: viralCase });
  assert.equal(context.package.package_id, 'anterior-uveitis');
  assert.equal(context.package.status, 'draft_locked');
  assert.ok(Array.isArray(context.evidence_chunks));
});
