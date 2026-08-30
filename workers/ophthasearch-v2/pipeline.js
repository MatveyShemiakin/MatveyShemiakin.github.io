import { validateResearchRequest, validateStructuredAnswer } from './contracts.js';
import { interpretClinicalQuestion, interpretIntentWithAi } from './query-interpreter.js';
import { buildResearchPlan } from './research-planner.js';
import { buildEvidencePack } from './evidence.js';
import { findGuidelines } from './guidelines/registry.js';
import { runAdaptersWithDeadlines } from './adapters/index.js';
import { search as searchPubMed } from './adapters/pubmed.js';
import { search as searchEuropePmc } from './adapters/europepmc.js';
import { search as searchClinicalTrials } from './adapters/clinicaltrials.js';
import { search as searchJStage } from './adapters/jstage.js';
import { search as searchOpenAlex } from './adapters/openalex.js';
import { reasonOverEvidence, buildEvidenceOnlyFallback } from './reasoner.js';
import { sanitizeFreeText, fingerprintQuestion } from './storage/privacy.js';
import { serializeResearchRun } from './storage/serialize.js';
import { insertResearchRun } from './storage/d1.js';

export const RESEARCH_ALLOWED_ORIGIN = 'https://matveyshemyakin.ru';
export const MAX_RESEARCH_BODY_BYTES = 32 * 1024;
export const OPHTHASEARCH_PIPELINE_VERSION = '2.0';

function defaultAdapters(env = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const common = { fetchImpl, limit: deps.sourceLimit || 8 };
  const adapters = {
    pubmed: (track, runtime) => searchPubMed(track, {
      ...common,
      ...runtime,
      apiKey: deps.ncbiApiKey || env.NCBI_API_KEY || '',
      email: deps.ncbiEmail || env.NCBI_EMAIL || '',
      tool: 'OphthaSearch'
    }),
    europepmc: (track, runtime) => searchEuropePmc(track, { ...common, ...runtime }),
    clinicaltrials: (track, runtime) => searchClinicalTrials(track, { ...common, ...runtime }),
    jstage: (track, runtime) => searchJStage(track, { ...common, ...runtime })
  };
  const openAlexKey = deps.openAlexApiKey || env.OPENALEX_API_KEY || '';
  if (openAlexKey) {
    adapters.openalex = (track, runtime) => searchOpenAlex(track, { ...common, ...runtime, apiKey: openAlexKey });
  }
  return adapters;
}

function guidelineDocument(guideline = {}) {
  const effectiveDate = guideline.lastUpdated || guideline.publicationDate || '';
  return {
    sourceType: 'guideline',
    title: guideline.title || '',
    authors: guideline.organization ? [guideline.organization] : [],
    organization: guideline.organization || '',
    year: String(effectiveDate).slice(0, 4),
    abstractText: [
      guideline.organization,
      guideline.title,
      guideline.version ? `Version ${guideline.version}` : '',
      Array.isArray(guideline.topics) && guideline.topics.length ? `Scope: ${guideline.topics.join(', ')}` : ''
    ].filter(Boolean).join('. '),
    doi: guideline.doi || '',
    pmid: guideline.pmid || '',
    sourceUrl: guideline.canonicalUrl || '',
    guidelineVersion: guideline.version || '',
    guidelineStatus: guideline.status || 'current',
    supersededBy: guideline.supersededBy || null,
    providerKey: 'guideline-registry',
    identifierVerified: Boolean(guideline.doi || guideline.pmid || guideline.canonicalUrl)
  };
}

function selectAdapters(track, adapterMap) {
  const selected = {};
  const unavailable = [];
  for (const sourceClass of track.sourceClasses || []) {
    if (sourceClass === 'guideline-registry') continue;
    if (typeof adapterMap[sourceClass] === 'function') selected[sourceClass] = adapterMap[sourceClass];
    else unavailable.push(sourceClass);
  }
  return { selected, unavailable };
}

async function retrieveTrack(track, adapterMap, deps) {
  const documents = [];
  const diagnostics = [];
  const { selected, unavailable } = selectAdapters(track, adapterMap);
  for (const adapter of unavailable) diagnostics.push({ trackId: track.id, adapter, status: 'unavailable', total: 0, error: 'adapter-unavailable' });
  if (!Object.keys(selected).length) return { documents, diagnostics };

  const results = await runAdaptersWithDeadlines(track, selected, { timeoutMs: deps.timeoutMs || 2500 });
  for (const [adapter, result] of Object.entries(results)) {
    diagnostics.push({
      trackId: track.id,
      adapter,
      status: result.status,
      total: Number(result.total || result.records?.length || 0),
      error: result.error || ''
    });
    if (result.status !== 'fulfilled') continue;
    for (const record of result.records || []) documents.push({ ...record, providerKey: record.providerKey || adapter });
  }
  return { documents, diagnostics };
}

async function retrievePlan(plan, adapterMap, deps) {
  const trackResults = await Promise.all(
    plan.map((track) => retrieveTrack(track, adapterMap, deps))
  );
  return {
    documents: trackResults.flatMap((result) => result.documents),
    diagnostics: trackResults.flatMap((result) => result.diagnostics)
  };
}

export async function runResearchPipeline(payload, env = {}, deps = {}) {
  const request = validateResearchRequest(payload);
  const interpreterDeps = { ...(deps.interpreterDeps || {}) };
  if (typeof interpreterDeps.interpretIntent !== 'function' && typeof env?.AI?.run === 'function') {
    interpreterDeps.interpretIntent = (validatedRequest) => interpretIntentWithAi(validatedRequest, env, deps.intentReasonerDeps || {});
  }
  const intent = await (deps.interpreter || interpretClinicalQuestion)(request, interpreterDeps);
  const plan = (deps.planner || buildResearchPlan)(intent);
  const adapterMap = deps.adapters || defaultAdapters(env, deps);
  const retrieval = await retrievePlan(plan, adapterMap, deps);

  const guidelineFinder = deps.guidelineFinder || findGuidelines;
  const guidelineRecords = guidelineFinder(intent, deps.guidelineOptions || {}).map(guidelineDocument);
  const documents = [...guidelineRecords, ...retrieval.documents];
  const evidencePack = buildEvidencePack(intent, documents, {
    relevanceThreshold: Number.isFinite(Number(deps.relevanceThreshold)) ? Number(deps.relevanceThreshold) : 0.45,
    maxSources: Number.isFinite(Number(deps.maxSources)) ? Number(deps.maxSources) : 24
  });

  const adapterProblems = retrieval.diagnostics.filter((entry) => entry.status !== 'fulfilled').length;
  let status = adapterProblems ? 'partial' : 'complete';
  let answer;

  if (!evidencePack.sources.length) {
    status = 'evidence_only';
    answer = buildEvidenceOnlyFallback(evidencePack, request.language);
  } else {
    try {
      const reasoner = deps.reasoner || ((pack) => reasonOverEvidence(pack, env, deps.reasonerDeps || {}));
      answer = await reasoner(evidencePack, env, deps.reasonerDeps || {});
      validateStructuredAnswer(answer, new Set(evidencePack.sources.map((source) => source.source_id)));
    } catch (error) {
      status = 'evidence_only';
      answer = buildEvidenceOnlyFallback(evidencePack, request.language);
      retrieval.diagnostics.push({ trackId: 'reasoning', adapter: 'workers-ai', status: 'rejected', total: 0, error: String(error?.message || error || 'reasoning-unavailable') });
    }
  }

  return {
    schemaVersion: '2.0',
    status,
    intent,
    plan,
    evidencePack,
    answer,
    diagnostics: {
      adapters: retrieval.diagnostics,
      guidelineCount: guidelineRecords.length,
      sourceCount: evidencePack.sources.length,
      ongoingTrialCount: evidencePack.ongoing_trials.length
    }
  };
}

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': RESEARCH_ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    ...extra
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' })
  });
}

function publicResult(result, runId = '') {
  const value = {
    schemaVersion: result.schemaVersion,
    status: result.status,
    intent: result.intent,
    plan: result.plan,
    answer: result.answer,
    diagnostics: result.diagnostics
  };
  if (runId) value.run_id = runId;
  return value;
}

function datasetLoggingEnabled(env = {}) {
  return Boolean(
    env?.OPHTHASEARCH_DB &&
    String(env?.OPHTHASEARCH_DATASET_HASH_KEY || '').trim()
  );
}

function canaryStorageDiagnosticsEnabled(env = {}) {
  return String(env?.OPHTHASEARCH_CANARY_STORAGE_DIAGNOSTICS || '') === '1';
}

async function persistResearchRun(payload, result, env = {}, deps = {}, latencyMs = null) {
  if (!datasetLoggingEnabled(env)) return '';

  const runIdFactory = typeof deps.randomUUID === 'function'
    ? deps.randomUUID
    : () => globalThis.crypto.randomUUID();
  const runId = runIdFactory();
  const privacy = sanitizeFreeText(payload.question);
  const fingerprint = await fingerprintQuestion(payload.question, env.OPHTHASEARCH_DATASET_HASH_KEY);
  const record = serializeResearchRun({
    request: payload,
    result,
    runId,
    fingerprint,
    privacy,
    latencyMs,
    pipelineVersion: deps.pipelineVersion || OPHTHASEARCH_PIPELINE_VERSION
  });
  const write = deps?.datasetStore?.insertResearchRun || insertResearchRun;
  await write(env.OPHTHASEARCH_DB, record);
  return runId;
}

export async function handleResearchRequest(request, env, ctx, deps = {}) {
  if (request.headers.get('Origin') !== RESEARCH_ALLOWED_ORIGIN) return json({ ok: false, error: { code: 'ORIGIN_NOT_ALLOWED' } }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== 'POST') return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) return json({ ok: false, error: { code: 'INVALID_REQUEST' } }, 400);

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESEARCH_BODY_BYTES) return json({ ok: false, error: { code: 'INVALID_REQUEST' } }, 400);

  let payload;
  try {
    payload = JSON.parse(text);
    validateResearchRequest(payload);
  } catch {
    return json({ ok: false, error: { code: 'INVALID_REQUEST' } }, 400);
  }

  try {
    const pipeline = deps.researchPipeline || runResearchPipeline;
    const startedAt = Date.now();
    const result = await pipeline(payload, env, deps);
    const latencyMs = Math.max(0, Date.now() - startedAt);
    let runId = '';
    try {
      runId = await persistResearchRun(payload, result, env, deps, latencyMs);
    } catch (error) {
      // Dataset persistence is deliberately fail-open. Never expose storage internals to physicians.
      runId = '';
      if (canaryStorageDiagnosticsEnabled(env)) {
        result.diagnostics = {
          ...(result.diagnostics || {}),
          storage: {
            status: 'rejected',
            error: String(error?.message || error || 'storage-failure').slice(0, 240)
          }
        };
      }
    }
    return json({ ok: true, result: publicResult(result, runId) }, 200);
  } catch (error) {
    return json({ ok: false, error: { code: 'RESEARCH_UNAVAILABLE', message: String(error?.message || 'Research pipeline unavailable') } }, 503);
  }
}
