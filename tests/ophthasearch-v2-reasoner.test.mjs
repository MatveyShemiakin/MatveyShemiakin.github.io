import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL,
  buildReasoningSchema,
  buildReasoningMessages,
  reasonOverEvidence,
  buildEvidenceOnlyFallback
} from '../workers/ophthasearch-v2/reasoner.js';
import { verifyClaimsAndCitations } from '../workers/ophthasearch-v2/citations.js';

const evidencePack = {
  schema_version: '2.0',
  intent: {
    language: 'ru',
    domain: 'glaucoma',
    condition: 'primary open-angle glaucoma',
    question_type: 'therapy',
    interventions: ['pharmacological therapy'],
    needs_dosing: true,
    needs_alternatives: true
  },
  sources: [
    {
      source_id: 'S1', source_type: 'guideline', title: 'Glaucoma guideline', year: 2026,
      abstract_or_summary: 'For a suitable patient, latanoprost 0.005% once daily is an established topical pressure-lowering regimen. Review efficacy and tolerability after treatment initiation.',
      doi: '10.1000/guideline', pmid: '111', nct: '', canonical_url: 'https://example.org/guideline', retrieved_from: ['guideline-registry'],
      evidence: { group: 'guideline', rank: 0, useForEfficacy: true }, quality_flags: []
    },
    {
      source_id: 'S2', source_type: 'journal_article', title: 'Randomized glaucoma trial', year: 2025,
      abstract_or_summary: 'Topical prostaglandin analogue therapy reduced intraocular pressure in primary open-angle glaucoma.',
      doi: '10.1000/rct', pmid: '222', nct: '', canonical_url: 'https://example.org/rct', retrieved_from: ['pubmed'],
      evidence: { group: 'rct', rank: 2, useForEfficacy: true }, quality_flags: []
    }
  ],
  guidelines: [], efficacy: [], safety: [], alternatives: [], ongoing_trials: [], contradictions: [], evidence_gaps: []
};

function validDraft() {
  return {
    schemaVersion: '2.0',
    clinical_bottom_line: 'Для снижения ВГД можно начать с местной терапии простагландиновым аналогом.',
    bottom_line_citations: ['S1', 'S2'],
    confidence: 'moderate',
    management: [{
      step: 1,
      action: 'Начать местную гипотензивную терапию.',
      drug_or_procedure: 'latanoprost',
      dose: '0.005%',
      frequency: 'once daily',
      duration: '',
      monitoring: 'Оценить эффективность и переносимость после начала лечения.',
      change_if: 'Эскалировать при недостаточном снижении ВГД или непереносимости.',
      citations: ['S1', 'S2']
    }],
    arguments_for: [{ text: 'Поддерживается рекомендацией и сравнительными данными.', citations: ['S1', 'S2'] }],
    arguments_against: [{ text: 'Выбор зависит от противопоказаний и переносимости.', citations: ['S1'] }],
    alternatives: [{ text: 'Рассмотреть альтернативную стратегию при недостаточном эффекте.', citations: ['S1'] }],
    guideline_positions: [{ text: 'Рекомендация поддерживает гипотензивную терапию.', citations: ['S1'] }],
    uncertainties: [{ text: 'Конкретный target IOP зависит от стадии и скорости прогрессирования.', citations: [] }],
    clinical_interpretation: 'Клиническая интерпретация: окончательный выбор следует адаптировать к стадии глаукомы и факторам пациента.'
  };
}

test('reasoning schema restricts every citation to Evidence Pack source IDs', () => {
  const schema = buildReasoningSchema(['S1', 'S2']);
  assert.deepEqual(schema.properties.bottom_line_citations.items.enum, ['S1', 'S2']);
  assert.deepEqual(schema.properties.management.items.properties.citations.items.enum, ['S1', 'S2']);
});

test('reasoning prompt defines ophthalmologist-scientist role and forbids invented bibliography', () => {
  const messages = buildReasoningMessages(evidencePack);
  const system = messages.find((message) => message.role === 'system')?.content || '';
  assert.match(system, /ophthalmologist-scientist/i);
  assert.match(system, /only.*Evidence Pack/i);
  assert.match(system, /never invent.*DOI.*PMID.*NCT/i);
  assert.match(system, /dose|dosing/i);
});

test('claim verifier rejects hallucinated source IDs', () => {
  const draft = validDraft();
  draft.management[0].citations = ['S9'];
  assert.throws(() => verifyClaimsAndCitations(draft, evidencePack), /unknown source/i);
});

test('claim verifier rejects a dosing regimen not supported by cited source text', () => {
  const draft = validDraft();
  draft.management[0].dose = '0.01%';
  assert.throws(() => verifyClaimsAndCitations(draft, evidencePack), /unsupported.*dose/i);
});

test('claim verifier accepts source-backed dosing and renders identifiers only from Evidence Pack', () => {
  const finalAnswer = verifyClaimsAndCitations(validDraft(), evidencePack);
  assert.equal(finalAnswer.management[0].dose, '0.005%');
  assert.deepEqual(finalAnswer.sources.map((source) => source.source_id), ['S1', 'S2']);
  assert.equal(finalAnswer.sources[0].doi, '10.1000/guideline');
  assert.equal(finalAnswer.sources[1].pmid, '222');
});

test('clinical interpretation may remain explicitly separated from sourced recommendations', () => {
  const finalAnswer = verifyClaimsAndCitations(validDraft(), evidencePack);
  assert.match(finalAnswer.clinical_interpretation, /^Клиническая интерпретация:/);
});

test('reasonOverEvidence invokes Workers AI with structured schema and returns verified answer', async () => {
  let invocation;
  const env = { AI: { run: async (model, options) => {
    invocation = { model, options };
    return { response: JSON.stringify(validDraft()) };
  } } };
  const answer = await reasonOverEvidence(evidencePack, env);
  assert.equal(invocation.model, MODEL);
  assert.equal(invocation.options.response_format.type, 'json_schema');
  assert.equal(answer.management[0].dose, '0.005%');
  assert.equal(answer.sources[0].source_id, 'S1');
});

test('evidence-only fallback is controlled and does not invent a treatment regimen', () => {
  const fallback = buildEvidenceOnlyFallback(evidencePack, 'ru');
  assert.equal(fallback.management.length, 0);
  assert.match(fallback.clinical_bottom_line, /синтез|доказательств|источник/i);
  assert.deepEqual(fallback.sources.map((source) => source.source_id), ['S1', 'S2']);
});
