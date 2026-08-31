import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReasoningMessages, reasonOverEvidence } from '../workers/ophthasearch-v2/reasoner.js';

const evidencePack = {
  schema_version: '2.0',
  intent: {
    language: 'ru',
    domain: 'glaucoma',
    condition: 'primary open-angle glaucoma',
    question_type: 'comparison',
    population: [],
    interventions: ['latanoprost'],
    comparators: ['timolol'],
    outcomes: ['intraocular pressure'],
    modifiers: [],
    requested_depth: 'specialist',
    needs_dosing: false,
    needs_alternatives: true,
    ambiguities: []
  },
  sources: [{
    source_id: 'S1',
    source_type: 'journal_article',
    title: 'Latanoprost versus timolol monotherapy in primary open-angle glaucoma',
    year: 2025,
    publication_types: ['Randomized Controlled Trial'],
    abstract_or_summary: 'Randomized head-to-head monotherapy comparison of latanoprost and timolol for intraocular pressure reduction in primary open-angle glaucoma.',
    doi: '10.1000/direct',
    pmid: '12345',
    canonical_url: 'https://example.org/direct',
    retrieved_from: ['pubmed'],
    evidence: { group: 'rct', rank: 2, useForEfficacy: true },
    quality_flags: []
  }],
  guidelines: [],
  efficacy: [],
  safety: [],
  alternatives: [],
  ongoing_trials: [],
  contradictions: [],
  evidence_gaps: []
};

function validDraft() {
  return {
    schemaVersion: '2.0',
    clinical_bottom_line: 'Латанопрост и тимолол следует сравнивать как отдельные варианты монотерапии на основании прямых данных.',
    bottom_line_citations: ['S1'],
    confidence: 'moderate',
    management: [{
      step: 1,
      action: 'Выбирать между двумя вариантами с учетом прямого сравнительного исследования.',
      drug_or_procedure: '',
      dose: '',
      frequency: '',
      duration: '',
      monitoring: '',
      change_if: '',
      citations: ['S1']
    }],
    arguments_for: [],
    arguments_against: [],
    alternatives: [],
    guideline_positions: [],
    uncertainties: [],
    clinical_interpretation: ''
  };
}

test('named A-vs-B prompt forbids silently substituting an A+B fixed combination', () => {
  const system = buildReasoningMessages(evidencePack).find((message) => message.role === 'system')?.content || '';
  assert.match(system, /fixed combination|fixed-dose combination/i);
  assert.match(system, /do not|never|must not/i);
});

test('Gemma final synthesis uses low reasoning effort with hidden thinking disabled', async () => {
  let invocation;
  const env = { AI: { run: async (model, options) => {
    invocation = { model, options };
    return { response: validDraft() };
  } } };

  const answer = await reasonOverEvidence(evidencePack, env);
  assert.equal(invocation.options.reasoning_effort, 'low');
  assert.deepEqual(invocation.options.chat_template_kwargs, { enable_thinking: false, clear_thinking: true });
  assert.ok(invocation.options.max_completion_tokens <= 6000);
  assert.equal(answer.bottom_line_citations[0], 'S1');
});
