import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildResearchPlan } from '../workers/ophthasearch-v2/research-planner.js';
import { buildIntentSchema, interpretIntentWithAi } from '../workers/ophthasearch-v2/query-interpreter.js';
import { buildJStageUrl, parseJStageXml, search as searchJStage } from '../workers/ophthasearch-v2/adapters/jstage.js';

const ruPage = new URL('../for-doctors/ophthasearch/index.html', import.meta.url);
const enPage = new URL('../en/for-doctors/ophthasearch/index.html', import.meta.url);
const clientPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2.js', import.meta.url);

for (const [label, page] of [['RU', ruPage], ['EN', enPage]]) {
  test(`${label} production OphthaSearch uses v2 physician-facing UI only`, async () => {
    const html = await fs.readFile(page, 'utf8');
    assert.match(html, /data-v2-search-form/);
    assert.match(html, /data-v2-bottom-line/);
    assert.match(html, /data-v2-management/);
    assert.match(html, /data-v2-important/);
    assert.match(html, /data-v2-sources/);
    assert.match(html, /ophthasearch-v2\/ophthasearch-v2\.css/);
    assert.match(html, /ophthasearch-v2\/ophthasearch-v2\.js/);
    assert.doesNotMatch(html, /ophtha-source-board|ophtha-pico-grid|data-signal-grid|ophthasearch-v3\.js|7931/i);
    assert.doesNotMatch(html, /\sstyle\s*=/i);
  });
}

test('production browser client does not call scientific provider APIs directly', async () => {
  const source = await fs.readFile(clientPath, 'utf8');
  for (const host of ['eutils.ncbi.nlm.nih.gov', 'ebi.ac.uk', 'clinicaltrials.gov/api', 'api.jstage.jst.go.jp', 'api.openalex.org']) {
    assert.doesNotMatch(source, new RegExp(host.replaceAll('.', '\\.'), 'i'));
  }
});

test('Workers AI intent schema preserves named interventions and comparator', async () => {
  const schema = buildIntentSchema();
  assert.ok(schema.properties.interventions);
  assert.ok(schema.properties.comparators);

  const env = {
    AI: {
      run: async () => ({
        response: JSON.stringify({
          domain: 'glaucoma',
          condition: 'glaucoma',
          question_type: 'comparison',
          population: [],
          interventions: ['latanoprost'],
          comparators: ['timolol'],
          outcomes: ['intraocular pressure'],
          modifiers: [],
          requested_depth: 'specialist',
          needs_dosing: false,
          needs_alternatives: true,
          ambiguities: []
        })
      })
    }
  };

  const intent = await interpretIntentWithAi({
    schemaVersion: '2.0',
    language: 'ru',
    question: 'Преимущества латанопроста перед тимололом при глаукоме',
    mode: 'standard',
    filters: {}
  }, env);

  assert.deepEqual(intent.interventions, ['latanoprost']);
  assert.deepEqual(intent.comparators, ['timolol']);
  assert.equal(intent.question_type, 'comparison');
});

test('research plan includes named intervention and comparator in comparative search', () => {
  const plan = buildResearchPlan({
    language: 'ru',
    domain: 'glaucoma',
    condition: 'glaucoma',
    question_type: 'comparison',
    interventions: ['latanoprost'],
    comparators: ['timolol'],
    outcomes: ['intraocular pressure'],
    modifiers: [],
    needs_dosing: false,
    needs_alternatives: true
  });
  const efficacy = plan.find((track) => track.id === 'efficacy');
  assert.match(efficacy.query, /latanoprost/i);
  assert.match(efficacy.query, /timolol/i);
  assert.ok(efficacy.sourceClasses.includes('jstage'));
});

test('J-STAGE adapter parses server-side XML into normalized evidence records', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom" xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/">
    <totalResults>1</totalResults>
    <entry>
      <title>Latanoprost versus timolol in glaucoma</title>
      <article_title><en>Latanoprost versus timolol in glaucoma</en></article_title>
      <material_title><en>Japanese Journal of Ophthalmology</en></material_title>
      <pubyear>2024</pubyear>
      <doi>10.1000/jstage-test</doi>
      <article_link><en>https://www.jstage.jst.go.jp/article/test/1/1/_article</en></article_link>
    </entry>
  </feed>`;
  const parsed = parseJStageXml(xml);
  assert.equal(parsed.total, 1);
  assert.equal(parsed.records[0].title, 'Latanoprost versus timolol in glaucoma');
  assert.equal(parsed.records[0].doi, '10.1000/jstage-test');
  assert.equal(parsed.records[0].providerKey, 'jstage');

  const url = buildJStageUrl({ query: 'glaucoma latanoprost timolol' }, { limit: 8 });
  assert.match(url, /api\.jstage\.jst\.go\.jp/);
  assert.match(url, /latanoprost/);

  const result = await searchJStage({ query: 'glaucoma latanoprost timolol' }, {
    fetchImpl: async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/xml' } }),
    limit: 8
  });
  assert.equal(result.records.length, 1);
  assert.equal(result.total, 1);
});
