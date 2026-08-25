import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateResearchRequest,
  normalizeIntent,
  validateStructuredAnswer
} from '../workers/ophthasearch-v2/contracts.js';

test('research request accepts a Russian specialist question', () => {
  const result = validateResearchRequest({
    schemaVersion: '2.0',
    language: 'ru',
    question: 'Современная медикаментозная терапия ПОУГ'
  });
  assert.equal(result.question, 'Современная медикаментозная терапия ПОУГ');
  assert.equal(result.language, 'ru');
});

test('research request rejects unsupported schema and empty questions', () => {
  assert.throws(() => validateResearchRequest({ schemaVersion: '1.0', language: 'ru', question: 'Глаукома' }), /schema/i);
  assert.throws(() => validateResearchRequest({ schemaVersion: '2.0', language: 'ru', question: '   ' }), /question/i);
});

test('normalizeIntent returns bounded arrays and normalized strings', () => {
  const intent = normalizeIntent({
    language: 'ru',
    domain: '  glaucoma ',
    condition: ' Primary Open-Angle Glaucoma ',
    question_type: 'therapy',
    interventions: [' pharmacological therapy ', 'SLT', 'SLT'],
    outcomes: [' intraocular pressure '],
    modifiers: [' ocular surface disease '],
    ambiguities: []
  });
  assert.equal(intent.domain, 'glaucoma');
  assert.equal(intent.condition, 'Primary Open-Angle Glaucoma');
  assert.deepEqual(intent.interventions, ['pharmacological therapy', 'SLT']);
  assert.deepEqual(intent.outcomes, ['intraocular pressure']);
});

test('structured answer rejects citations outside Evidence Pack', () => {
  assert.throws(() => validateStructuredAnswer({
    schemaVersion: '2.0',
    clinical_bottom_line: 'Назначить гипотензивную терапию.',
    management: [{ step: 1, action: 'Начать терапию', citations: ['S9'] }],
    arguments_for: [],
    arguments_against: [],
    alternatives: [],
    guideline_positions: [],
    uncertainties: [],
    clinical_interpretation: '',
    sources: []
  }, new Set(['S1'])), /unknown source/i);
});

test('structured answer accepts only verified source references', () => {
  const answer = validateStructuredAnswer({
    schemaVersion: '2.0',
    clinical_bottom_line: 'Начать с доказанной стратегии снижения ВГД.',
    management: [{ step: 1, action: 'Выбрать стартовую терапию', citations: ['S1'] }],
    arguments_for: [{ text: 'Подтверждено рекомендацией.', citations: ['S1'] }],
    arguments_against: [],
    alternatives: [],
    guideline_positions: [],
    uncertainties: [],
    clinical_interpretation: '',
    sources: [{ source_id: 'S1', title: 'Guideline' }]
  }, new Set(['S1']));
  assert.equal(answer.management[0].citations[0], 'S1');
});
