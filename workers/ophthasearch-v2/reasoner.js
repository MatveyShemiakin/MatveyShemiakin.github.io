import { verifyClaimsAndCitations, renderSafeSources } from './citations.js';
import { parseStructuredModelResponse } from './structured-response.js';

export const MODEL = '@cf/google/gemma-4-26b-a4b-it';

const CONFIDENCE = ['high', 'moderate', 'low', 'insufficient'];

function citedTextItemSchema(sourceIds) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      text: { type: 'string', minLength: 1, maxLength: 1200 },
      citations: { type: 'array', maxItems: 8, items: { type: 'string', enum: sourceIds } }
    },
    required: ['text', 'citations']
  };
}

export function buildReasoningSchema(sourceIds) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      schemaVersion: { type: 'string', enum: ['2.0'] },
      clinical_bottom_line: { type: 'string', minLength: 1, maxLength: 3000 },
      bottom_line_citations: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', enum: sourceIds } },
      confidence: { type: 'string', enum: CONFIDENCE },
      management: {
        type: 'array', maxItems: 10,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            step: { type: 'integer', minimum: 1, maximum: 20 },
            action: { type: 'string', minLength: 1, maxLength: 1200 },
            drug_or_procedure: { type: 'string', maxLength: 300 },
            dose: { type: 'string', maxLength: 160 },
            frequency: { type: 'string', maxLength: 160 },
            duration: { type: 'string', maxLength: 240 },
            monitoring: { type: 'string', maxLength: 700 },
            change_if: { type: 'string', maxLength: 700 },
            citations: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', enum: sourceIds } }
          },
          required: ['step', 'action', 'drug_or_procedure', 'dose', 'frequency', 'duration', 'monitoring', 'change_if', 'citations']
        }
      },
      arguments_for: { type: 'array', maxItems: 8, items: citedTextItemSchema(sourceIds) },
      arguments_against: { type: 'array', maxItems: 8, items: citedTextItemSchema(sourceIds) },
      alternatives: { type: 'array', maxItems: 8, items: citedTextItemSchema(sourceIds) },
      guideline_positions: { type: 'array', maxItems: 8, items: citedTextItemSchema(sourceIds) },
      uncertainties: { type: 'array', maxItems: 8, items: citedTextItemSchema(sourceIds) },
      clinical_interpretation: { type: 'string', maxLength: 2500 }
    },
    required: [
      'schemaVersion', 'clinical_bottom_line', 'bottom_line_citations', 'confidence', 'management',
      'arguments_for', 'arguments_against', 'alternatives', 'guideline_positions', 'uncertainties', 'clinical_interpretation'
    ]
  };
}

function modelEvidencePack(evidencePack) {
  return {
    schema_version: evidencePack.schema_version,
    intent: evidencePack.intent,
    sources: (evidencePack.sources || []).map((source) => ({
      source_id: source.source_id,
      source_type: source.source_type,
      title: source.title,
      year: source.year,
      publication_types: source.publication_types || [],
      evidence_class: source.evidence || null,
      quality_flags: source.quality_flags || [],
      evidence_text: source.abstract_or_summary || source.extracted_evidence || '',
      guideline_version: source.guideline_version || null
    })),
    contradictions: evidencePack.contradictions || [],
    evidence_gaps: evidencePack.evidence_gaps || []
  };
}

export function buildReasoningMessages(evidencePack) {
  const language = evidencePack?.intent?.language === 'ru' ? 'Russian' : 'English';
  return [
    {
      role: 'system',
      content: [
        'You are the Clinical Reasoning Agent of OphthaSearch Research Agent v2, acting as an experienced ophthalmologist-scientist writing for another ophthalmologist.',
        'Use only the supplied Evidence Pack as evidence for factual recommendations.',
        'Answer the clinician’s actual question and give practical ophthalmic management, not a literature dump.',
        'Weigh guideline positions, systematic reviews, randomized trials, comparative studies, safety evidence, alternatives, patient modifiers and uncertainty.',
        'For therapy questions, specify treatment sequence, monitoring and escalation/de-escalation criteria when supported.',
        'Dose, concentration, frequency and duration may be stated only when those exact regimen elements are supported by cited Evidence Pack text. If not supported, leave the relevant field empty.',
        'Never invent a DOI, PMID, NCT, URL, paper, guideline, author, source ID, statistic or dose.',
        'Use ClinicalTrials.gov registry records only as registered/ongoing-study context, never as proof of efficacy.',
        'Keep evidence-backed recommendations distinct from clinical interpretation. Put model synthesis that extends beyond direct source wording only in clinical_interpretation and preserve uncertainty.',
        `Write all user-facing content in ${language}.`,
        'Return only the requested structured JSON.'
      ].join('\n')
    },
    {
      role: 'user',
      content: JSON.stringify(modelEvidencePack(evidencePack))
    }
  ];
}

function normalizeReasoningDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  if (!value.schemaVersion && value.schema_version === '2.0') return { ...value, schemaVersion: '2.0' };
  return value;
}

export async function reasonOverEvidence(evidencePack, env, deps = {}) {
  const sourceIds = (evidencePack?.sources || []).map((source) => source.source_id).filter(Boolean);
  if (!sourceIds.length) throw new Error('Evidence Pack is empty');
  const run = deps.runModel || env?.AI?.run?.bind(env.AI);
  if (typeof run !== 'function') throw new Error('Workers AI binding unavailable');
  const response = await run(MODEL, {
    messages: buildReasoningMessages(evidencePack),
    response_format: { type: 'json_schema', json_schema: buildReasoningSchema(sourceIds) },
    max_completion_tokens: 6000,
    temperature: 0.1
  });
  const draft = normalizeReasoningDraft(parseStructuredModelResponse(response, {
    label: 'Clinical reasoning model returned invalid structured JSON'
  }));
  return verifyClaimsAndCitations(draft, evidencePack);
}

export function buildEvidenceOnlyFallback(evidencePack, language = 'en') {
  const ru = language === 'ru';
  return {
    schemaVersion: '2.0',
    clinical_bottom_line: ru
      ? 'Автоматический клинический синтез временно недоступен. Доступен проверенный набор источников доказательств без сформированной схемы лечения.'
      : 'Automated clinical synthesis is temporarily unavailable. A verified evidence-source set is available without a generated treatment regimen.',
    bottom_line_citations: [],
    confidence: 'insufficient',
    management: [],
    arguments_for: [],
    arguments_against: [],
    alternatives: [],
    guideline_positions: [],
    uncertainties: [{ text: ru ? 'Клинический вывод не сформирован из-за недоступности reasoning-модели.' : 'No clinical conclusion was generated because the reasoning model was unavailable.', citations: [] }],
    clinical_interpretation: '',
    sources: renderSafeSources(evidencePack)
  };
}
