import { validateResearchRequest, validateStructuredAnswer } from './contracts.js';
import { resolveClinicalIntent } from './query-resolver.js';
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

export const RESEARCH_ALLOWED_ORIGIN = 'https://matveyshemyakin.ru';
export const MAX_RESEARCH_BODY_BYTES = 32 * 1024;

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

async function retrievePlan(plan, adapterMap, deps) {
  const documents = [];
  const diagnostics = [];
  for (const track of plan) {
    const { selected, unavailable } = selectAdapters(track, adapterMap);
    for (const adapter of unavailable) diagnostics.push({ trackId: track.id, adapter, status: 'unavailable', total: 0, error: 'adapter-unavailable' });
    if (!Object.keys(selected).length) continue;
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
  }
  return { documents, diagnostics };
}

export async function runResearchPipeline(payload, env = {}, deps = {}) {
  const request = validateResearchRequest(payload);
  const intent = deps.interpreter
    ? await deps.interpreter(request, deps.interpreterDeps || {})
    : await resolveClinicalIntent(request, env, {
      ...(deps.interpreterDeps || {}),
      intentReasonerDeps: deps.intentReasonerDeps || {}
    });
  const plan = (deps.planner || buildResearchPlan)(intent);
  const adapterMap = deps.adapters || defaultAdapters(env, deps);
  const retrieval = await retrievePlan(plan, adapterMap, deps);

  const guidelineFinder = deps.guidelineFinder || findGuidelines;
  const guidelineRecords = guidelineFinder(intent, deps.guidelineOptions || {}).map(guidelineDocument);
  const documents = [...guidelineRecords, ...retrieval.documents];
  const evidencePack = buildEvidencePack(intent, documents, {
    relevanceThreshold: Number.isFinite(Number(deps.relevanceThreshold)) ? Number(deps.relevanceThreshold) : 0.45,
    maxSources: Number.isFinite(Number(deps.maxSources)) ? Number(deps.maxSources) : 14
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

function publicResult(result) {
  return {
    schemaVersion: result.schemaVersion,
    status: result.status,
    intent: result.intent,
    plan: result.plan,
    answer: result.answer,
    diagnostics: result.diagnostics
  };
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
    const result = await pipeline(payload, env, deps);
    return json({ ok: true, result: publicResult(result) }, 200);
  } catch (error) {
    return json({ ok: false, error: { code: 'RESEARCH_UNAVAILABLE', message: String(error?.message || 'Research pipeline unavailable') } }, 503);
  }
}
