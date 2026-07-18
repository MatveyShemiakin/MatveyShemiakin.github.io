import test from 'node:test';
import assert from 'node:assert/strict';
import { extractClinicalFacts, extractFactsLocally } from '../src/extract-clinical-facts.mjs';

test('extracts uveitis facts without asking again', () => {
  const facts = extractFactsLocally('Односторонний рецидивирующий увеит: боль, светобоязнь, клетки 2+, ВГД 28 мм рт. ст.');
  assert.equal(facts.laterality, 'unilateral');
  assert.equal(facts.course, 'recurrent');
  assert.ok(facts.symptoms.includes('pain'));
  assert.ok(facts.symptoms.includes('photophobia'));
  assert.equal(facts.examination.anterior_chamber_cells, '2+');
  assert.equal(facts.examination.iop_mm_hg, 28);
  assert.equal(facts.examination.iop_state, 'high');
  assert.ok(facts.suspected_diagnoses.includes('передний увеит'));
});

test('respects symptom negation', () => {
  const facts = extractFactsLocally('Покраснение глаза, боли и светобоязни нет.');
  assert.ok(facts.symptoms.includes('redness'));
  assert.ok(!facts.symptoms.includes('pain'));
  assert.ok(!facts.symptoms.includes('photophobia'));
  assert.ok(facts.negated_facts.includes('pain'));
});

test('mock provider works without credentials', async () => {
  const result = await extractClinicalFacts({
    caseText: 'После факоэмульсификации через два дня боль, покраснение и снижение зрения.',
    env: { AI_PROVIDER: 'mock' }
  });
  assert.equal(result.provider, 'mock');
  assert.ok(result.facts.procedures.includes('recent_cataract_surgery'));
  assert.ok(result.facts.symptoms.includes('pain'));
  assert.ok(result.facts.symptoms.includes('vision_loss'));
});

test('merges facts from subsequent messages', async () => {
  const first = await extractClinicalFacts({
    caseText: 'Односторонний увеит, клетки 2+.',
    env: { AI_PROVIDER: 'mock' }
  });
  const second = await extractClinicalFacts({
    caseText: 'ВГД 28, течение рецидивирующее.',
    priorFacts: first.facts,
    env: { AI_PROVIDER: 'mock' }
  });
  assert.equal(second.facts.laterality, 'unilateral');
  assert.equal(second.facts.examination.anterior_chamber_cells, '2+');
  assert.equal(second.facts.examination.iop_mm_hg, 28);
  assert.equal(second.facts.course, 'recurrent');
});
