import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest as handleRootRequest } from '../_worker.js';

const ORIGIN = 'https://matveyshemyakin.ru';
const RUN_ID = '44444444-4444-4444-8444-444444444444';

function feedbackRequest(payload, overrides = {}) {
  return new Request(overrides.url || 'https://matveyshemyakin.ru/v2/feedback', {
    method: overrides.method || 'POST',
    headers: {
      Origin: overrides.origin === undefined ? ORIGIN : overrides.origin,
      'Content-Type': overrides.contentType || 'application/json'
    },
    body: overrides.method === 'OPTIONS' ? undefined : (overrides.body ?? JSON.stringify(payload))
  });
}

function env(overrides = {}) {
  return {
    ASSETS: { fetch: async () => new Response('asset') },
    OPHTHASEARCH_DB: { binding: 'test-db' },
    OPHTHASEARCH_DATASET_HASH_KEY: 'test-only-secret',
    ...overrides
  };
}

const helpful = {
  schemaVersion: '2.0',
  runId: RUN_ID,
  rating: 'helpful',
  errorTags: [],
  comment: ''
};

test('feedback route rejects non-production Origin before storage access', async () => {
  let touched = false;
  const response = await handleRootRequest(feedbackRequest(helpful, { origin: 'https://evil.example' }), env(), {}, {
    datasetStore: {
      researchRunExists: async () => { touched = true; return true; },
      insertFeedback: async () => { touched = true; }
    }
  });
  assert.equal(response.status, 403);
  assert.equal(touched, false);
});

test('feedback route supports production CORS preflight only', async () => {
  const response = await handleRootRequest(new Request('https://matveyshemyakin.ru/v2/feedback', {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN }
  }), env(), {}, {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.match(response.headers.get('Access-Control-Allow-Methods') || '', /POST/);
});

test('feedback requires JSON and bounded valid contract', async () => {
  const invalidType = await handleRootRequest(feedbackRequest(helpful, { contentType: 'text/plain' }), env(), {}, {});
  assert.equal(invalidType.status, 400);

  const invalidRating = await handleRootRequest(feedbackRequest({ ...helpful, rating: 'bad' }), env(), {}, {});
  assert.equal(invalidRating.status, 400);

  const invalidTag = await handleRootRequest(feedbackRequest({ ...helpful, rating: 'problem', errorTags: ['dump_database'] }), env(), {}, {});
  assert.equal(invalidTag.status, 400);

  const oversized = await handleRootRequest(feedbackRequest(helpful, {
    body: JSON.stringify({ ...helpful, comment: 'x'.repeat(20 * 1024) })
  }), env(), {}, {});
  assert.equal(oversized.status, 400);
});

test('feedback rejects unknown run without exposing research data', async () => {
  const response = await handleRootRequest(feedbackRequest(helpful), env(), {}, {
    datasetStore: {
      researchRunExists: async () => false,
      insertFeedback: async () => assert.fail('must not insert feedback for unknown run')
    }
  });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.deepEqual(body, { ok: false, error: { code: 'RUN_NOT_FOUND' } });
});

test('helpful feedback persists a minimal linked record and returns only feedback_id', async () => {
  let stored = null;
  const feedbackId = '55555555-5555-4555-8555-555555555555';
  const response = await handleRootRequest(feedbackRequest(helpful), env(), {}, {
    randomUUID: () => feedbackId,
    datasetStore: {
      researchRunExists: async (_db, runId) => runId === RUN_ID,
      insertFeedback: async (_db, record) => { stored = record; }
    }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { ok: true, feedback_id: feedbackId });
  assert.ok(stored);
  assert.equal(stored.run_id, RUN_ID);
  assert.equal(stored.rating, 'helpful');
  assert.equal(stored.comment_redacted, null);
  assert.equal(stored.comment_storage_state, 'metadata_only');
  assert.equal('research' in body, false);
  assert.equal('answer' in body, false);
});

test('problem feedback stores safe comments but blocks comments with direct identifiers', async () => {
  const records = [];
  const deps = {
    randomUUID: () => `66666666-6666-4666-8666-${String(records.length + 1).padStart(12, '0')}`,
    datasetStore: {
      researchRunExists: async () => true,
      insertFeedback: async (_db, record) => { records.push(record); }
    }
  };

  const safeResponse = await handleRootRequest(feedbackRequest({
    ...helpful,
    rating: 'problem',
    errorTags: ['wrong_conclusion'],
    comment: 'Вывод не соответствует найденному RCT.'
  }), env(), {}, deps);
  assert.equal(safeResponse.status, 200);
  assert.equal(records[0].comment_storage_state, 'redacted_text');
  assert.equal(records[0].comment_redacted, 'Вывод не соответствует найденному RCT.');

  const sensitiveResponse = await handleRootRequest(feedbackRequest({
    ...helpful,
    rating: 'problem',
    errorTags: ['other'],
    comment: 'ФИО Иванов Иван, телефон +7 999 123-45-67 — ответ неверный.'
  }), env(), {}, deps);
  assert.equal(sensitiveResponse.status, 200);
  assert.equal(records[1].comment_storage_state, 'metadata_only');
  assert.equal(records[1].comment_redacted, null);
  assert.doesNotMatch(JSON.stringify(records[1]), /Иванов Иван|999 123/);
});

test('feedback storage failure is controlled and never leaks SQL/internal messages', async () => {
  const response = await handleRootRequest(feedbackRequest(helpful), env(), {}, {
    datasetStore: {
      researchRunExists: async () => true,
      insertFeedback: async () => { throw new Error('SQLITE_CONSTRAINT secret_internal_table'); }
    }
  });
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.match(text, /FEEDBACK_UNAVAILABLE/);
  assert.doesNotMatch(text, /SQLITE|secret_internal_table/);
});

test('feedback storage is unavailable when dataset binding is disabled', async () => {
  const response = await handleRootRequest(feedbackRequest(helpful), env({ OPHTHASEARCH_DB: undefined }), {}, {});
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.deepEqual(body, { ok: false, error: { code: 'FEEDBACK_UNAVAILABLE' } });
});

test('root Worker keeps v1 and static routing unchanged with feedback route present', async () => {
  const asset = await handleRootRequest(new Request('https://matveyshemyakin.ru/some-static-file'), {
    ASSETS: { fetch: async () => new Response('asset-ok') }
  }, {}, {});
  assert.equal(await asset.text(), 'asset-ok');
});
