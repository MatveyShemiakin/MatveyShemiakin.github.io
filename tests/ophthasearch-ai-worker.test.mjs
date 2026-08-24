import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL,
  validateRequestPayload,
  buildResponseSchema,
  buildMessages,
  validateModelOutput,
  handleRequest
} from '../workers/ophthasearch-ai/worker.js';

const validPayload = {
  schemaVersion: '1.0',
  language: 'ru',
  question: 'Есть ли преимущество inverted ILM flap при большом макулярном разрыве?',
  questionInfo: {
    questionType: 'comparison',
    pico: {
      population: 'full-thickness macular hole',
      intervention: 'inverted ILM flap',
      comparator: 'ILM peeling',
      outcome: 'anatomical closure'
    }
  },
  sources: [
    {
      sourceId: 'S1', kind: 'article', provider: 'europepmc', title: 'Meta-analysis', year: '2025',
      publicationTypes: ['Systematic Review'], evidenceTier: 1,
      abstractText: 'The inverted flap achieved higher closure in large holes.',
      doi: '10.1/a', pmid: '1', registryId: ''
    },
    {
      sourceId: 'S2', kind: 'article', provider: 'europepmc', title: 'Randomized trial', year: '2024',
      publicationTypes: ['Randomized Controlled Trial'], evidenceTier: 2,
      abstractText: 'Visual acuity did not differ significantly.',
      doi: '10.1/b', pmid: '2', registryId: ''
    }
  ]
};

test('approved Workers AI model is fixed', () => {
  assert.equal(MODEL, '@cf/google/gemma-4-26b-a4b-it');
});

test('request validation requires two bounded usable sources', () => {
  assert.deepEqual(validateRequestPayload(validPayload).sourceIds, ['S1', 'S2']);
  assert.throws(() => validateRequestPayload({ ...validPayload, sources: validPayload.sources.slice(0, 1) }), /two usable sources/i);
});

test('dynamic response schema permits only supplied source IDs', () => {
  const schema = buildResponseSchema(['S1', 'S2']);
  assert.deepEqual(schema.properties.citations.items.properties.sourceId.enum, ['S1', 'S2']);
});

test('prompt treats source text as untrusted data and registries as non-efficacy evidence', () => {
  const messages = buildMessages(validPayload);
  assert.match(messages[0].content, /untrusted scientific content/i);
  assert.match(messages[0].content, /not proof of efficacy/i);
});

test('model-output validation rejects hallucinated citation IDs', () => {
  assert.throws(() => validateModelOutput({
    schemaVersion: '1.0', conclusion: 'benefit', answer: 'A concise answer.', confidence: 'moderate',
    evidenceSummary: ['Higher closure was reported.'], limitations: [],
    citations: [{ sourceId: 'S99', relation: 'supports', statement: 'Unsupported citation.' }],
    insufficientEvidence: false
  }, ['S1', 'S2']), /sourceId/i);
});

class MemoryCache {
  constructor() { this.map = new Map(); }
  async match(request) { return this.map.get(request.url)?.clone(); }
  async put(request, response) { this.map.set(request.url, response.clone()); }
}

const validSynthesis = {
  schemaVersion: '1.0', conclusion: 'mixed', answer: 'Mixed evidence.', confidence: 'moderate',
  evidenceSummary: ['Results differ.'], limitations: [],
  citations: [{ sourceId: 'S1', relation: 'supports', statement: 'One source supports benefit.' }],
  insufficientEvidence: false
};

function postRequest(body = validPayload, origin = 'https://matveyshemyakin.ru') {
  return new Request('https://worker.example/v1/synthesize', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

test('wrong Origin is rejected before inference', async () => {
  let calls = 0;
  const env = { AI: { run: async () => { calls += 1; return { response: validSynthesis }; } } };
  const response = await handleRequest(postRequest(validPayload, 'https://evil.example'), env, { waitUntil() {} }, { cache: new MemoryCache() });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test('allowed CORS preflight returns only the production origin', async () => {
  const request = new Request('https://worker.example/v1/synthesize', {
    method: 'OPTIONS',
    headers: { Origin: 'https://matveyshemyakin.ru', 'Access-Control-Request-Method': 'POST' }
  });
  const response = await handleRequest(request, { AI: { run: async () => { throw new Error('must not run'); } } }, { waitUntil() {} });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://matveyshemyakin.ru');
  assert.match(response.headers.get('Access-Control-Allow-Methods') || '', /POST/);
});

test('request body above 80 KB is rejected before inference', async () => {
  let calls = 0;
  const env = { AI: { run: async () => { calls += 1; return { response: validSynthesis }; } } };
  const oversized = JSON.stringify({ ...validPayload, padding: 'x'.repeat(90 * 1024) });
  const response = await handleRequest(postRequest(oversized), env, { waitUntil() {} }, { cache: new MemoryCache() });
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test('Worker invokes Gemma with messages and dynamic json_schema response format', async () => {
  let model;
  let options;
  const env = { AI: { run: async (receivedModel, receivedOptions) => {
    model = receivedModel;
    options = receivedOptions;
    return { response: validSynthesis };
  } } };
  const response = await handleRequest(postRequest(), env, { waitUntil() {} }, { cache: new MemoryCache() });
  assert.equal(response.status, 200);
  assert.equal(model, MODEL);
  assert.ok(Array.isArray(options.messages));
  assert.equal(options.response_format.type, 'json_schema');
  assert.deepEqual(options.response_format.json_schema.properties.citations.items.properties.sourceId.enum, ['S1', 'S2']);
  assert.equal(options.max_completion_tokens, 900);
});

test('malformed model JSON returns controlled 502 and is not cached as success', async () => {
  const env = { AI: { run: async () => ({ response: '{not-json' }) } };
  const response = await handleRequest(postRequest(), env, { waitUntil() {} }, { cache: new MemoryCache() });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'AI_INVALID_OUTPUT');
});

test('hallucinated model citation returns controlled 502', async () => {
  const env = { AI: { run: async () => ({ response: { ...validSynthesis, citations: [{ sourceId: 'S12', relation: 'supports', statement: 'Invented source.' }] } }) } };
  const response = await handleRequest(postRequest(), env, { waitUntil() {} }, { cache: new MemoryCache() });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'AI_INVALID_OUTPUT');
});

test('Workers AI runtime failure returns controlled 503', async () => {
  const env = { AI: { run: async () => { throw new Error('quota exhausted'); } } };
  const response = await handleRequest(postRequest(), env, { waitUntil() {} }, { cache: new MemoryCache() });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'AI_UNAVAILABLE');
});

test('identical validated packet is served from cache on second request', async () => {
  let calls = 0;
  const env = { AI: { run: async () => { calls += 1; return { response: validSynthesis }; } } };
  const cache = new MemoryCache();
  const makeRequest = () => postRequest();
  await handleRequest(makeRequest(), env, { waitUntil(promise) { return promise; } }, { cache });
  const second = await handleRequest(makeRequest(), env, { waitUntil(promise) { return promise; } }, { cache });
  assert.equal(calls, 1);
  assert.equal((await second.json()).cached, true);
});
