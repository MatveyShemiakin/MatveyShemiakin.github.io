import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDELINES,
  findGuidelines,
  isCurrentGuideline
} from '../workers/ophthasearch-v2/guidelines/registry.js';

const glaucomaIntent = {
  domain: 'glaucoma',
  condition: 'primary open-angle glaucoma',
  question_type: 'therapy',
  interventions: ['pharmacological therapy']
};

test('registry contains verified current AAO, EGS and NICE glaucoma guidance metadata', () => {
  const aao = GUIDELINES.find((item) => item.id === 'aao-poag-ppp-2026');
  const egs = GUIDELINES.find((item) => item.id === 'egs-glaucoma-6e-2025');
  const nice = GUIDELINES.find((item) => item.id === 'nice-ng81-glaucoma');
  assert.equal(aao.doi, '10.1016/j.ophtha.2025.12.029');
  assert.equal(aao.pmid, '41665583');
  assert.equal(egs.doi, '10.1136/bjophthalmol-2025-egsguidelines');
  assert.equal(egs.pmid, '41026937');
  assert.equal(nice.version, 'NG81');
  assert.equal(nice.lastReviewed, '2025-03-26');
});

test('findGuidelines returns current glaucoma documents and excludes superseded editions', () => {
  const results = findGuidelines(glaucomaIntent);
  const ids = new Set(results.map((item) => item.id));
  assert.ok(ids.has('aao-poag-ppp-2026'));
  assert.ok(ids.has('egs-glaucoma-6e-2025'));
  assert.ok(ids.has('nice-ng81-glaucoma'));
  assert.equal(ids.has('egs-glaucoma-5e-2020'), false);
});

test('superseded guideline is retained for provenance but is not current', () => {
  const old = GUIDELINES.find((item) => item.id === 'egs-glaucoma-5e-2020');
  assert.equal(old.status, 'superseded');
  assert.equal(old.supersededBy, 'egs-glaucoma-6e-2025');
  assert.equal(isCurrentGuideline(old, new Date('2026-08-25T00:00:00Z')), false);
});

test('current guideline remains current until explicitly superseded or withdrawn', () => {
  const egs = GUIDELINES.find((item) => item.id === 'egs-glaucoma-6e-2025');
  assert.equal(isCurrentGuideline(egs, new Date('2026-08-25T00:00:00Z')), true);
});

test('guideline records expose normalized evidence metadata without embedding copyrighted full text', () => {
  const result = findGuidelines(glaucomaIntent)[0];
  assert.equal(result.sourceType, 'guideline');
  assert.ok(result.canonicalUrl.startsWith('https://'));
  assert.ok(Array.isArray(result.topics));
  assert.equal('fullText' in result, false);
});
