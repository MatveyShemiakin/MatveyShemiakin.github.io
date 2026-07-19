import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCase } from '../src/analyze-case.mjs';

test('unified analysis preserves physician choice and recognizes HLA-B27 context', async () => {
  const result = await analyzeCase({
    caseText: 'Женщина 34 лет. Острый односторонний передний увеит: боль, светобоязнь, перикорнеальная инъекция, фибрин, клетки 3+, гипопион. В анамнезе HLA-B27-ассоциированный артрит. ВГД 18 мм рт. ст.',
    authoringMode: true,
    env: { AI_PROVIDER: 'mock' }
  });

  assert.equal(result.action, 'analyze_case');
  assert.equal(result.provider, 'mock');
  assert.equal(result.final_decision_owner, 'physician');
  assert.equal(result.physician_selection_required, true);
  assert.ok(result.recognized_facts.some((item) => item.id === 'hla_b27'));
  assert.ok(result.recognized_facts.some((item) => item.id === 'fibrin'));
  assert.ok(result.recognized_facts.some((item) => item.id === 'hypopyon'));
  assert.ok(result.recognized_facts.some((item) => item.id === 'iop_mm_hg'));
  assert.ok(result.diagnostic_options.length >= 2 && result.diagnostic_options.length <= 5);
  assert.ok(result.diagnostic_options.some((item) => /HLA-B27/i.test(item.label)));
  assert.ok(result.diagnostic_options.every((item) => item.selected === false));
  assert.ok(result.management_options.every((item) => item.selected === false));
  assert.ok(!result.missing_questions.some((item) => item.id === 'laterality'));
  assert.ok(!result.missing_questions.some((item) => item.id === 'iop'));
  assert.ok(!result.missing_questions.some((item) => item.id === 'hypopyon'));
});

test('unified analysis asks only missing safety-critical facts', async () => {
  const result = await analyzeCase({
    caseText: 'Передний увеит, боль и светобоязнь, клетки 2+.',
    authoringMode: false,
    env: { AI_PROVIDER: 'mock' }
  });

  const ids = result.missing_questions.map((item) => item.id);
  assert.ok(ids.includes('visual_acuity'));
  assert.ok(ids.includes('iop'));
  assert.ok(ids.includes('posterior'));
  assert.ok(!ids.includes('activity'));
  assert.equal(result.management_options.length, 0, 'Locked treatment evidence must remain hidden outside authoring mode.');
});
