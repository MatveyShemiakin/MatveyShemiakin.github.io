import test from 'node:test';
import assert from 'node:assert/strict';
import { generateClinicalOptions, validateClinicalOptions } from '../src/generate-clinical-options.mjs';

const viralFacts = {
  laterality: 'unilateral',
  course: 'recurrent',
  onset: 'days',
  symptoms: ['pain', 'photophobia'],
  examination: {
    visual_acuity_reduced: null,
    iop_mm_hg: 28,
    iop_state: 'high',
    anterior_chamber_cells: '2+',
    hypopyon: false,
    synechiae: null,
    corneal_infiltrate: false,
    epithelial_defect: false,
    vitritis: false,
    retinal_tear: null,
    retinal_detachment: null
  },
  procedures: [],
  suspected_diagnoses: ['передний увеит'],
  red_flags: [],
  negated_facts: [],
  source_confidence: 0.8
};

test('mock generator returns multiple unselected diagnostic options', async () => {
  const result = await generateClinicalOptions({
    caseText: 'Односторонний рецидивирующий передний увеит, клетки 2+, ВГД 28.',
    facts: viralFacts,
    env: { AI_PROVIDER: 'mock' }
  });
  assert.equal(result.provider, 'mock');
  assert.ok(result.options.diagnostic_options.length >= 2);
  assert.ok(result.options.diagnostic_options.length <= 5);
  assert.ok(result.options.diagnostic_options.every((item) => item.selected === false));
  assert.equal(result.options.final_decision_owner, 'physician');
  assert.equal(result.options.physician_selection_required, true);
});

test('locked treatment evidence is not returned in normal mode', async () => {
  const result = await generateClinicalOptions({
    facts: viralFacts,
    env: { AI_PROVIDER: 'mock' }
  });
  assert.equal(result.options.management_options.length, 0);
  assert.equal(result.context_meta.treatment_evidence_enabled, false);
});

test('authoring mode exposes draft options but never selects them', async () => {
  const result = await generateClinicalOptions({
    facts: viralFacts,
    supplementalTags: ['hsv', 'viral'],
    authoringMode: true,
    env: { AI_PROVIDER: 'mock' }
  });
  assert.ok(result.options.management_options.length > 0);
  assert.ok(result.options.management_options.every((item) => item.selected === false));
  assert.ok(result.options.management_options.every((item) => item.physician_selection_required === true));
});

test('validator rejects citations outside retrieved evidence', () => {
  const context = {
    evidence_chunks: [{ id: 'allowed' }],
    treatment_candidates: [],
    safety_evidence: []
  };
  const options = {
    case_summary: 'Case',
    urgency: { level: 'uncertain', rationale: 'Unknown', evidence_chunk_ids: [] },
    diagnostic_options: [
      {
        id: 'a1', label: 'A', support_level: 'weak', supporting_facts: [],
        against_or_missing_facts: [], tests_to_discriminate: [],
        evidence_chunk_ids: ['allowed'], selected: false
      },
      {
        id: 'a2', label: 'B', support_level: 'weak', supporting_facts: [],
        against_or_missing_facts: [], tests_to_discriminate: [],
        evidence_chunk_ids: ['invented'], selected: false
      }
    ],
    management_options: [],
    questions_to_resolve: [],
    physician_selection_required: true,
    final_decision_owner: 'physician',
    limitations: []
  };
  assert.throws(() => validateClinicalOptions(options, context), /not retrieved/);
});
