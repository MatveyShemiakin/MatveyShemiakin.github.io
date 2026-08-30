import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runResearchPipeline } from '../workers/ophthasearch-v2/pipeline.js';
import { handleRequest as handleRootRequest } from '../_worker.js';

const requestPayload = {
  schemaVersion: '2.0',
  language: 'ru',
  question: 'Современная медикаментозная терапия ПОУГ: первая линия, комбинации и критерии эскалации?',
  mode: 'standard',
  filters: {}
};

function relevantArticle(overrides = {}) {
  return {
    title: 'Primary open-angle glaucoma pharmacological therapy randomized trial',
    abstractText: 'Primary open-angle glaucoma treatment with topical medication reduced intraocular pressure; safety and escalation were assessed.',
    pubYear: '2025',
    publicationTypes: ['Randomized Controlled Trial'],
    doi: '10.1000/poag-rct',
    pmid: '12345678',
    ...overrides
  };
}

function stubPipelineResult(bottomLine = 'ok') {
  return {
    schemaVersion: '2.0',
    status: 'complete',
    intent: { condition: 'primary open-angle glaucoma', task: 'treatment' },
    plan: [],
    evidencePack: {
      sources: [{
        source_id: 'S1',
        title: 'Stored source title',
        abstractText: 'ABSTRACT MUST NEVER REACH DATASET STORAGE',
        doi: '10.1000/storage-test',
        pmid: '12345678',
        year: 2025,
        evidence: { label: 'Randomized controlled trial' }
      }]
    },
    diagnostics: { sourceCount: 1 },
    answer: {
      schemaVersion: '2.0',
      clinical_bottom_line: bottomLine,
      bottom_line_citations: ['S1'],
      confidence: 'moderate',
      management: [],
      arguments_for: [],
      arguments_against: [],
      alternatives: [],
      guideline_positions: [],
      uncertainties: [],
      clinical_interpretation: '',
      sources: [{ source_id: 'S1' }]
    }
  };
}

async function postResearch(payload, env = {}, deps = {}) {
  return handleRootRequest(new Request('https://matveyshemyakin.ru/v2/research', {
    method: 'POST',
    headers: { 'Origin': 'https://matveyshemyakin.ru', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }), { ASSETS: { fetch: async () => new Response('asset') }, ...env }, {}, deps);
}

test('research pipeline interprets, plans, retrieves, deduplicates and reasons over one server-side request', async () => {
  const adapters = {
    pubmed: async () => ({ records: [relevantArticle()] }),
    europepmc: async () => ({ records: [relevantArticle({ provider: 'Europe PMC' })] }),
    clinicaltrials: async () => ({ records: [{
      sourceType: 'trial_registry',
      title: 'Registered study of pharmacological therapy in primary open-angle glaucoma',
      abstractText: 'Registered ongoing study in primary open-angle glaucoma pharmacological therapy.',
      nct: 'NCT01234567',
      year: 2026
    }] }),
    openalex: async () => new Promise(() => {})
  };

  const result = await runResearchPipeline(requestPayload, {}, {
    adapters,
    timeoutMs: 20,
    guidelineFinder: () => [{
      id: 'test-guideline',
      organization: 'Test Ophthalmology Society',
      title: 'Primary Open-Angle Glaucoma Guideline',
      version: '2026',
      publicationDate: '2026-01-01',
      canonicalUrl: 'https://example.org/guideline',
      status: 'current',
      topics: ['primary open-angle glaucoma', 'medical therapy']
    }],
    reasoner: async (pack) => ({
      schemaVersion: '2.0',
      clinical_bottom_line: 'Тактика основана на релевантном наборе доказательств.',
      bottom_line_citations: [pack.sources[0].source_id],
      confidence: 'moderate',
      management: [],
      arguments_for: [],
      arguments_against: [],
      alternatives: [],
      guideline_positions: [],
      uncertainties: [],
      clinical_interpretation: '',
      sources: pack.sources.map((source) => ({ source_id: source.source_id }))
    })
  });

  assert.equal(result.schemaVersion, '2.0');
  assert.equal(result.intent.condition, 'primary open-angle glaucoma');
  assert.ok(result.plan.some((track) => track.id === 'ongoing-trials'));
  assert.equal(result.evidencePack.sources.filter((source) => source.doi === '10.1000/poag-rct').length, 1);
  assert.ok(result.evidencePack.ongoing_trials.some((source) => source.nct === 'NCT01234567'));
  assert.equal(result.answer.schemaVersion, '2.0');
  assert.ok(['complete', 'partial'].includes(result.status));
  assert.ok(result.diagnostics.adapters.some((entry) => entry.status === 'timeout'));
});

test('independent research tracks are retrieved concurrently', async () => {
  let active = 0;
  let maxActive = 0;
  const tracks = ['efficacy', 'safety', 'alternatives'].map((id) => ({
    id,
    purpose: id,
    query: `primary open-angle glaucoma ${id}`,
    sourceClasses: ['pubmed'],
    evidenceTypes: ['comparative-study'],
    dateWindow: 'current-plus-pivotal'
  }));

  const result = await runResearchPipeline(requestPayload, {}, {
    planner: () => tracks,
    adapters: {
      pubmed: async (track) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 30));
        active -= 1;
        return {
          records: [relevantArticle({
            title: `Primary open-angle glaucoma pharmacological therapy ${track.id}`,
            doi: `10.1000/${track.id}`,
            pmid: String(1000 + tracks.findIndex((item) => item.id === track.id))
          })]
        };
      }
    },
    timeoutMs: 200,
    guidelineFinder: () => [],
    reasoner: async (pack) => ({
      schemaVersion: '2.0',
      clinical_bottom_line: 'Concurrent retrieval preserves a verified conclusion.',
      bottom_line_citations: [pack.sources[0].source_id],
      confidence: 'moderate',
      management: [],
      arguments_for: [],
      arguments_against: [],
      alternatives: [],
      guideline_positions: [],
      uncertainties: [],
      clinical_interpretation: '',
      sources: pack.sources.map((source) => ({ source_id: source.source_id }))
    })
  });

  assert.equal(maxActive, 3, 'all independent track retrievals should overlap');
  assert.equal(result.evidencePack.sources.length, 3);
});

test('reasoning failure degrades to evidence-only result instead of failing the research request', async () => {
  const result = await runResearchPipeline(requestPayload, {}, {
    adapters: { pubmed: async () => ({ records: [relevantArticle()] }) },
    timeoutMs: 20,
    guidelineFinder: () => [],
    reasoner: async () => { throw new Error('model unavailable'); }
  });

  assert.equal(result.status, 'evidence_only');
  assert.equal(result.answer.confidence, 'insufficient');
  assert.ok(result.answer.sources.length >= 1);
});

test('root Worker routes POST /v2/research without changing v1 or static fallback behavior', async () => {
  let called = 0;
  const response = await postResearch(requestPayload, {}, {
    researchPipeline: async () => {
      called += 1;
      return stubPipelineResult();
    }
  });
  assert.equal(called, 1);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.result.schemaVersion, '2.0');
  assert.equal('run_id' in body.result, false, 'storage-disabled response must not invent a feedback run id');
});

test('research logging returns only an opaque run_id and stores a minimized record', async () => {
  let stored = null;
  const runId = '11111111-1111-4111-8111-111111111111';
  const response = await postResearch(requestPayload, {
    OPHTHASEARCH_DB: { binding: 'test-db' },
    OPHTHASEARCH_DATASET_HASH_KEY: 'test-only-secret'
  }, {
    randomUUID: () => runId,
    researchPipeline: async () => stubPipelineResult('Verified clinical answer'),
    datasetStore: {
      insertResearchRun: async (_db, record) => { stored = record; }
    }
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.result.run_id, runId);
  assert.equal(body.result.answer.clinical_bottom_line, 'Verified clinical answer');
  assert.equal('question_fingerprint' in body.result, false);
  assert.equal('question_storage_state' in body.result, false);
  assert.ok(stored, 'storage adapter should receive a record');
  assert.equal('question' in stored, false, 'raw request field must never be persisted');
  assert.equal(stored.question_redacted, requestPayload.question, 'safe clinical text may persist only through the privacy-gated field');
  assert.doesNotMatch(JSON.stringify(stored), /ABSTRACT MUST NEVER REACH DATASET STORAGE/);
  assert.match(stored.question_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(stored.question_storage_state, 'redacted_text');
});

test('D1 write failure is fail-open and cannot change the clinical answer', async () => {
  const response = await postResearch(requestPayload, {
    OPHTHASEARCH_DB: { binding: 'test-db' },
    OPHTHASEARCH_DATASET_HASH_KEY: 'test-only-secret'
  }, {
    randomUUID: () => '22222222-2222-4222-8222-222222222222',
    researchPipeline: async () => stubPipelineResult('Clinical answer survives storage failure'),
    datasetStore: {
      insertResearchRun: async () => { throw new Error('simulated D1 outage'); }
    }
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.result.status, 'complete');
  assert.equal(body.result.answer.clinical_bottom_line, 'Clinical answer survives storage failure');
  assert.equal('run_id' in body.result, false, 'failed persistence must not expose an unusable feedback id');
});

test('sensitive question persists metadata only and suppresses answer text', async () => {
  let stored = null;
  const sensitivePayload = {
    ...requestPayload,
    question: 'ФИО Иванов Иван, номер истории 123456789. Тактика при ПОУГ?'
  };
  const response = await postResearch(sensitivePayload, {
    OPHTHASEARCH_DB: { binding: 'test-db' },
    OPHTHASEARCH_DATASET_HASH_KEY: 'test-only-secret'
  }, {
    randomUUID: () => '33333333-3333-4333-8333-333333333333',
    researchPipeline: async () => stubPipelineResult('Иванов Иван: generated answer could echo input'),
    datasetStore: {
      insertResearchRun: async (_db, record) => { stored = record; }
    }
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true, 'privacy fallback must not block clinical response');
  assert.equal(body.result.answer.clinical_bottom_line, 'Иванов Иван: generated answer could echo input');
  assert.ok(stored);
  assert.equal(stored.question_storage_state, 'metadata_only');
  assert.equal(stored.question_redacted, null);
  assert.equal(stored.answer_json, null);
  assert.doesNotMatch(JSON.stringify(stored), /Иванов Иван|123456789/);
});

test('Wrangler routes both v1 and v2 API namespaces through the Worker before static assets', async () => {
  const config = await fs.readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const parsed = JSON.parse(config);
  assert.ok(parsed.assets.run_worker_first.includes('/v1/*'));
  assert.ok(parsed.assets.run_worker_first.includes('/v2/*'));
});
