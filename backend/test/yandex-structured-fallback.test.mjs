import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonContent } from '../src/providers.mjs';
import { analyzeCase } from '../src/analyze-case.mjs';

test('JSON parser accepts fenced model output', () => {
  const parsed = parseJsonContent('```json\n{"laterality":"unilateral"}\n```');
  assert.equal(parsed.laterality, 'unilateral');
});

test('invalid Yandex model formatting never breaks the clinical analysis', async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    const isResponses = String(url).endsWith('/responses');
    return {
      ok: true,
      status: 200,
      json: async () => isResponses
        ? { id: `resp-${calls}`, output_text: 'Here is the result without JSON.' }
        : { id: `chat-${calls}`, choices: [{ message: { content: 'Still not JSON.' } }] },
      text: async () => ''
    };
  };

  try {
    const result = await analyzeCase({
      caseText: 'Женщина 34 лет. Острый односторонний передний увеит, боль, светобоязнь, клетки 3+, HLA-B27-артрит, ВГД 18 мм рт. ст.',
      authoringMode: true,
      env: {
        AI_PROVIDER: 'yandex',
        YANDEX_FOLDER_ID: 'folder-id',
        YANDEX_MODEL: 'yandexgpt/latest',
        YANDEX_IAM_TOKEN: 'iam-token',
        ALLOW_DRAFT_CLINICAL_OPTIONS: 'true'
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.action, 'analyze_case');
    assert.equal(result.degraded, true);
    assert.match(result.provider, /yandex-fallback/);
    assert.ok(result.diagnostic_options.length >= 2);
    assert.ok(result.diagnostic_options.every((item) => item.selected === false));
    assert.ok(result.limitations.some((item) => /fallback/i.test(item)));
    assert.ok(calls >= 4, 'Yandex structured and compatibility attempts should occur before fallback.');
  } finally {
    globalThis.fetch = previousFetch;
  }
});
