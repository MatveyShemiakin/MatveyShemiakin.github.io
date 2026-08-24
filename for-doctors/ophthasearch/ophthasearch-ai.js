export const DEFAULT_AI_ENDPOINT = '';
const MAX_SOURCES = 12;
const MAX_TEXT = 3000;
const CONCLUSIONS = new Set(['benefit', 'no_difference', 'mixed', 'risk', 'insufficient']);
const CONFIDENCE = new Set(['high', 'moderate', 'low', 'insufficient']);
const RELATIONS = new Set(['supports', 'conflicts', 'context']);

export function selectEvidenceSources(results = [], classifyEvidence) {
  if (typeof classifyEvidence !== 'function') return [];
  return results
    .map((result, index) => ({ result, evidence: classifyEvidence(result), index }))
    .filter(({ result }) => String(result?.abstractText || '').trim().length >= 40)
    .sort((a, b) => Number(a.evidence?.rank ?? 99) - Number(b.evidence?.rank ?? 99) || a.index - b.index)
    .slice(0, MAX_SOURCES)
    .map(({ result, evidence }, index) => ({
      sourceId: `S${index + 1}`,
      kind: String(result.kind || 'article').slice(0, 40),
      provider: String(result.providerKey || '').slice(0, 80),
      title: String(result.title || '').slice(0, 500),
      year: String(result.year || '').slice(0, 4),
      publicationTypes: (Array.isArray(result.publicationTypes) ? result.publicationTypes : []).slice(0, 8).map((value) => String(value).slice(0, 120)),
      evidenceTier: evidence?.tier ?? null,
      abstractText: String(result.abstractText || '').trim().slice(0, MAX_TEXT),
      doi: String(result.doi || '').slice(0, 200),
      pmid: String(result.pmid || '').slice(0, 80),
      registryId: String(result.registryId || '').slice(0, 80),
      _result: result
    }));
}

export function buildAiPayload(detail = {}) {
  const selected = selectEvidenceSources(detail.rankedResults || [], detail.classifyEvidence);
  if (selected.length < 2) return null;
  const sourceMap = new Map(selected.map((source) => [source.sourceId, source._result]));
  const sources = selected.map(({ _result, ...source }) => source);
  const pico = detail.questionInfo?.pico || {};
  return {
    payload: {
      schemaVersion: '1.0',
      language: detail.language === 'en' ? 'en' : 'ru',
      question: String(detail.question || '').slice(0, 600),
      questionInfo: {
        questionType: String(detail.questionInfo?.questionType || '').slice(0, 300),
        pico: {
          population: String(pico.population || '').slice(0, 300),
          intervention: String(pico.intervention || '').slice(0, 300),
          comparator: String(pico.comparator || '').slice(0, 300),
          outcome: String(pico.outcome || '').slice(0, 300)
        }
      },
      sources
    },
    sourceMap
  };
}

function requireString(value, max, label) {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new Error(`Invalid ${label}`);
  return text;
}

function validateStringArray(value, maxItems, label) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`Invalid ${label}`);
  for (const item of value) requireString(item, 500, label);
}

export function validateAiEnvelope(value, sourceIds) {
  if (!value || value.ok !== true || !value.synthesis || typeof value.synthesis !== 'object') throw new Error('Invalid AI envelope');
  const synthesis = value.synthesis;
  if (synthesis.schemaVersion !== '1.0') throw new Error('Invalid schemaVersion');
  if (!CONCLUSIONS.has(synthesis.conclusion)) throw new Error('Invalid conclusion');
  requireString(synthesis.answer, 1800, 'answer');
  if (!CONFIDENCE.has(synthesis.confidence)) throw new Error('Invalid confidence');
  validateStringArray(synthesis.evidenceSummary, 4, 'evidenceSummary');
  validateStringArray(synthesis.limitations, 4, 'limitations');
  if (!Array.isArray(synthesis.citations) || synthesis.citations.length > 8) throw new Error('Invalid citations');
  const allowed = new Set(sourceIds);
  for (const citation of synthesis.citations) {
    if (!citation || !allowed.has(citation.sourceId)) throw new Error(`Invalid sourceId: ${citation?.sourceId || ''}`);
    if (!RELATIONS.has(citation.relation)) throw new Error('Invalid citation relation');
    requireString(citation.statement, 500, 'citation statement');
  }
  if (typeof synthesis.insufficientEvidence !== 'boolean') throw new Error('Invalid insufficientEvidence');
  return synthesis;
}

let activeController = null;

export async function requestAiSynthesis(payload, {
  endpoint = DEFAULT_AI_ENDPOINT,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000
} = {}) {
  if (!endpoint) throw new Error('AI endpoint disabled');
  if (typeof fetchImpl !== 'function') throw new Error('Fetch API unavailable');
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const timeoutError = typeof DOMException === 'function' ? new DOMException('AI synthesis timeout', 'TimeoutError') : new Error('AI synthesis timeout');
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);
  try {
    const response = await fetchImpl(`${endpoint.replace(/\/$/, '')}/v1/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
    if (activeController === controller) activeController = null;
  }
}
