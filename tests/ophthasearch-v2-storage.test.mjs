import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// RED gate: these contracts intentionally precede the storage implementation.
const privacyUrl = new URL('../workers/ophthasearch-v2/storage/privacy.js', import.meta.url);
const serializeUrl = new URL('../workers/ophthasearch-v2/storage/serialize.js', import.meta.url);
const feedbackUrl = new URL('../workers/ophthasearch-v2/storage/feedback.js', import.meta.url);
const d1Url = new URL('../workers/ophthasearch-v2/storage/d1.js', import.meta.url);
const migrationUrl = new URL('../migrations/0001_ophthasearch_dataset.sql', import.meta.url);

async function requireFile(url, label) {
  const exists = await fs.access(url).then(() => true, () => false);
  assert.equal(exists, true, `${label} should exist`);
}

test('dataset storage modules and migration exist', async () => {
  await requireFile(privacyUrl, 'privacy module');
  await requireFile(serializeUrl, 'serialization module');
  await requireFile(feedbackUrl, 'feedback module');
  await requireFile(d1Url, 'D1 module');
  await requireFile(migrationUrl, 'D1 migration');
});

test('privacy gate stores ordinary clinical text but blocks direct identifiers', async () => {
  await requireFile(privacyUrl, 'privacy module');
  const { sanitizeFreeText } = await import(privacyUrl.href);

  const safe = sanitizeFreeText('Тактика лечения первичной открытоугольной глаукомы?');
  assert.deepEqual(safe, {
    storageState: 'redacted_text',
    redactedText: 'Тактика лечения первичной открытоугольной глаукомы?'
  });

  const unsafeSamples = [
    'ФИО Иванов Иван, тактика лечения ПОУГ',
    'Email patient@example.com, glaucoma treatment',
    'Телефон +7 999 123-45-67, дислокация ИОЛ',
    'Номер истории 123456789, отслойка сетчатки',
    'Patient name John Smith, address 10 Main Street, glaucoma'
  ];

  for (const sample of unsafeSamples) {
    const result = sanitizeFreeText(sample);
    assert.equal(result.storageState, 'metadata_only', sample);
    assert.equal(result.redactedText, null, sample);
  }
});

test('question fingerprint is normalized, keyed and deterministic', async () => {
  await requireFile(privacyUrl, 'privacy module');
  const { fingerprintQuestion } = await import(privacyUrl.href);
  const first = await fingerprintQuestion('  Латанопрост   или тимолол? ', 'secret-A');
  const second = await fingerprintQuestion('Латанопрост или тимолол?', 'secret-A');
  const otherKey = await fingerprintQuestion('Латанопрост или тимолол?', 'secret-B');

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.notEqual(first, otherKey);
  await assert.rejects(() => fingerprintQuestion('ПОУГ', ''), /secret/i);
});

test('research serializer minimizes scientific sources and never stores raw question', async () => {
  await requireFile(serializeUrl, 'serialization module');
  const { serializeResearchRun, serializeSourceRefs } = await import(serializeUrl.href);

  const evidencePack = {
    sources: [{
      source_id: 'S1',
      title: 'Trial title',
      abstractText: 'COPYRIGHTED ABSTRACT MUST NOT PERSIST',
      fullText: 'FULL TEXT MUST NOT PERSIST',
      doi: '10.1000/test',
      pmid: '12345678',
      nct: '',
      canonical_url: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
      year: 2025,
      providerKey: 'pubmed',
      evidence: { label: 'Randomized controlled trial', tier: 2 }
    }]
  };

  const refs = serializeSourceRefs(evidencePack);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].doi, '10.1000/test');
  assert.equal(refs[0].pmid, '12345678');
  assert.doesNotMatch(JSON.stringify(refs), /COPYRIGHTED ABSTRACT|FULL TEXT MUST NOT PERSIST/);

  const record = serializeResearchRun({
    request: { language: 'ru', question: 'RAW QUESTION MUST NOT PERSIST' },
    result: {
      status: 'complete',
      intent: { condition: 'glaucoma' },
      evidencePack,
      answer: { schemaVersion: '2.0', clinical_bottom_line: 'Verified answer', sources: [] }
    },
    runId: '00000000-0000-4000-8000-000000000001',
    fingerprint: 'a'.repeat(64),
    privacy: { storageState: 'redacted_text', redactedText: 'Safe canonical clinical question' },
    latencyMs: 321,
    pipelineVersion: '2.0'
  });

  const serialized = JSON.stringify(record);
  assert.doesNotMatch(serialized, /RAW QUESTION MUST NOT PERSIST/);
  assert.match(serialized, /Safe canonical clinical question/);
  assert.equal(record.answer_json.includes('Verified answer'), true);
});

test('metadata-only privacy state suppresses question and generated answer text', async () => {
  await requireFile(serializeUrl, 'serialization module');
  const { serializeResearchRun } = await import(serializeUrl.href);
  const record = serializeResearchRun({
    request: { language: 'ru', question: 'ФИО Иванов Иван, карта 123456789' },
    result: {
      status: 'complete',
      intent: { condition: 'glaucoma' },
      evidencePack: { sources: [] },
      answer: { schemaVersion: '2.0', clinical_bottom_line: 'Иванов Иван: answer may echo identifier', sources: [] }
    },
    runId: '00000000-0000-4000-8000-000000000002',
    fingerprint: 'b'.repeat(64),
    privacy: { storageState: 'metadata_only', redactedText: null },
    latencyMs: 100,
    pipelineVersion: '2.0'
  });

  assert.equal(record.question_redacted, null);
  assert.equal(record.question_storage_state, 'metadata_only');
  assert.equal(record.answer_json, null);
  assert.doesNotMatch(JSON.stringify(record), /Иванов Иван|123456789/);
});

test('feedback contract accepts only bounded ratings and error tags', async () => {
  await requireFile(feedbackUrl, 'feedback module');
  const { validateFeedbackRequest } = await import(feedbackUrl.href);
  const valid = validateFeedbackRequest({
    schemaVersion: '2.0',
    runId: '00000000-0000-4000-8000-000000000003',
    rating: 'problem',
    errorTags: ['wrong_conclusion', 'citation_problem'],
    comment: 'Неверно интерпретирован исход.'
  });
  assert.equal(valid.rating, 'problem');
  assert.deepEqual(valid.errorTags, ['wrong_conclusion', 'citation_problem']);

  assert.throws(() => validateFeedbackRequest({
    schemaVersion: '2.0', runId: '00000000-0000-4000-8000-000000000003', rating: 'bad'
  }), /rating/i);
  assert.throws(() => validateFeedbackRequest({
    schemaVersion: '2.0', runId: '00000000-0000-4000-8000-000000000003', rating: 'problem', errorTags: ['sql_dump']
  }), /tag/i);
});

test('migration defines constrained research, feedback and training tables', async () => {
  await requireFile(migrationUrl, 'D1 migration');
  const sql = await fs.readFile(migrationUrl, 'utf8');
  for (const table of ['research_runs', 'feedback', 'training_cases']) {
    assert.match(sql, new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}`, 'i'));
  }
  assert.match(sql, /CHECK\s*\([^)]*quality_score[^)]*BETWEEN\s+1\s+AND\s+5/i);
  assert.match(sql, /FOREIGN\s+KEY\s*\(run_id\)/i);
  assert.match(sql, /question_fingerprint/i);
  assert.match(sql, /CREATE\s+INDEX/i);
});
