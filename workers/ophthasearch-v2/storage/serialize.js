export const DATASET_SCHEMA_VERSION = '1.0';

function clean(value, max = 4000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeJson(value, fallback) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

export function serializeSourceRefs(evidencePack = {}) {
  const sources = Array.isArray(evidencePack?.sources) ? evidencePack.sources : [];
  return sources.map((source = {}) => ({
    source_id: clean(source.source_id, 80),
    doi: clean(source.doi, 300),
    pmid: clean(source.pmid, 80),
    nct: clean(source.nct, 80),
    guideline_registry_id: clean(source.guideline_registry_id || source.guideline_id || source.registry_id, 160),
    canonical_url: clean(source.canonical_url || source.canonicalUrl || source.sourceUrl, 1200),
    title: clean(source.title, 1000),
    year: clean(source.year || source.pubYear, 16),
    evidence_label: clean(source?.evidence?.label || source.evidence_label, 240),
    provider: clean(source.providerKey || source.provider_key || source.provider, 120)
  }));
}

export function serializeResearchRun({
  request = {},
  result = {},
  runId,
  fingerprint,
  privacy = {},
  latencyMs = null,
  pipelineVersion = '2.0',
  createdAt = new Date().toISOString()
} = {}) {
  const storageState = privacy.storageState === 'redacted_text' ? 'redacted_text' : 'metadata_only';
  const questionRedacted = storageState === 'redacted_text' ? clean(privacy.redactedText, 1200) || null : null;
  const sourceRefs = serializeSourceRefs(result.evidencePack || {});
  const answerJson = storageState === 'redacted_text' && result.answer && typeof result.answer === 'object'
    ? safeJson(result.answer, null)
    : null;

  return {
    run_id: clean(runId, 80),
    created_at: clean(createdAt, 64),
    schema_version: DATASET_SCHEMA_VERSION,
    pipeline_version: clean(pipelineVersion, 80) || '2.0',
    language: request.language === 'en' ? 'en' : 'ru',
    question_fingerprint: clean(fingerprint, 128),
    question_redacted: questionRedacted,
    question_storage_state: storageState,
    intent_json: safeJson(result.intent || {}, {}),
    status: ['complete', 'partial', 'evidence_only'].includes(result.status) ? result.status : 'evidence_only',
    source_refs_json: safeJson(sourceRefs, []),
    answer_json: answerJson,
    latency_ms: Number.isFinite(Number(latencyMs)) ? Math.max(0, Math.round(Number(latencyMs))) : null
  };
}
