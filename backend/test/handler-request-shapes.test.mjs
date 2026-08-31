import test from 'node:test';
import assert from 'node:assert/strict';
import { handler, parseRequestBody } from '../src/handler.mjs';

const clinicalPayload = {
  action: 'extract_facts',
  case_text: 'Односторонний рецидивирующий передний увеит, клетки 2+, ВГД 28 мм рт. ст.',
  prior_facts: null
};

test('parses direct raw JSON string used by Yandex console', () => {
  assert.deepEqual(parseRequestBody(JSON.stringify(clinicalPayload)), clinicalPayload);
});

test('parses nested HTTP event body', () => {
  const event = {
    httpMethod: 'POST',
    headers: { origin: 'https://raw.githack.com' },
    body: JSON.stringify(clinicalPayload),
    isBase64Encoded: false
  };
  assert.deepEqual(parseRequestBody(event), clinicalPayload);
});

test('handles Yandex raw console request and returns extracted facts', async () => {
  const previousProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = 'mock';
  try {
    const result = await handler(JSON.stringify(clinicalPayload), {});
    assert.equal(result.statusCode, 200);
    const body = JSON.parse(result.body);
    assert.equal(body.provider, 'mock');
    assert.equal(body.facts.laterality, 'unilateral');
    assert.equal(body.facts.course, 'recurrent');
    assert.equal(body.facts.examination.iop_mm_hg, 28);
    assert.equal(body.facts.examination.anterior_chamber_cells, '2+');
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  }
});
