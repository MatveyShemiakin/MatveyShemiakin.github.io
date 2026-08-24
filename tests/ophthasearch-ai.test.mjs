import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEvidenceSources, buildAiPayload, validateAiEnvelope } from '../for-doctors/ophthasearch/ophthasearch-ai.js';

const classifyEvidence = (result) => result.kind === 'trial'
  ? { tier: null, rank: 90, useForEfficacy: false }
  : { tier: result.tier, rank: result.tier ?? 6, useForEfficacy: true };

test('source selection is deterministic, bounded and text-backed', () => {
  const results = Array.from({ length: 15 }, (_, index) => ({
    kind: 'article', tier: index < 2 ? 1 : 2, providerKey: 'europepmc',
    title: `Paper ${index + 1}`, abstractText: `Evidence text ${index + 1}. `.repeat(80),
    publicationTypes: ['Journal Article'], year: '2025', doi: '', pmid: String(index + 1), registryId: ''
  }));
  const selected = selectEvidenceSources(results, classifyEvidence);
  assert.equal(selected.length, 12);
  assert.deepEqual(selected.map((source) => source.sourceId), ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12']);
  assert.ok(selected.every((source) => source.abstractText.length <= 3000));
});

test('buildAiPayload returns null with fewer than two usable records', () => {
  const result = buildAiPayload({
    language: 'ru', question: 'test', questionInfo: { questionType: 'general', pico: {} },
    rankedResults: [{ kind: 'article', tier: 1, providerKey: 'europepmc', title: 'Only one', abstractText: 'usable evidence text'.repeat(5), publicationTypes: [] }],
    classifyEvidence
  });
  assert.equal(result, null);
});

test('buildAiPayload keeps original records out of serialized payload and in sourceMap', () => {
  const rankedResults = [
    { kind: 'article', tier: 1, providerKey: 'europepmc', title: 'A', abstractText: 'Evidence A. '.repeat(10), publicationTypes: [] },
    { kind: 'article', tier: 2, providerKey: 'europepmc', title: 'B', abstractText: 'Evidence B. '.repeat(10), publicationTypes: [] }
  ];
  const built = buildAiPayload({ language: 'en', question: 'q', questionInfo: { questionType: 'general', pico: {} }, rankedResults, classifyEvidence });
  assert.equal(built.sourceMap.get('S1'), rankedResults[0]);
  assert.doesNotMatch(JSON.stringify(built.payload), /_result/);
});

test('client validation rejects citations outside the selected packet', () => {
  assert.throws(() => validateAiEnvelope({
    ok: true,
    synthesis: { schemaVersion: '1.0', conclusion: 'benefit', answer: 'Answer', confidence: 'moderate', evidenceSummary: [], limitations: [], citations: [{ sourceId: 'S9', relation: 'supports', statement: 'bad' }], insufficientEvidence: false }
  }, ['S1', 'S2']), /sourceId/i);
});
