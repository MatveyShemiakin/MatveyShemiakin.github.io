import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { requestResearch, DEFAULT_RESEARCH_ENDPOINT } from '../for-doctors/ophthasearch-v2/ophthasearch-v2.js';

const pagePath = new URL('../for-doctors/ophthasearch-v2/index.html', import.meta.url);
const clientPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2.js', import.meta.url);
const cssPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2.css', import.meta.url);
const workerEndpoint = 'https://matveyshemiakin-github-io.matvei-shemyakin.workers.dev/v2/research';

test('OphthaSearch page prioritizes clinical conclusion and hides pipeline internals', async () => {
  const html = await fs.readFile(pagePath, 'utf8');
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.match(html, /data-v2-search-form/);
  for (const hook of ['bottom-line', 'management', 'important', 'sources']) {
    assert.match(html, new RegExp(`data-v2-${hook}`));
  }
  assert.match(html, /Клинический вывод/);
  assert.match(html, /Тактика/);
  assert.match(html, /Важно учесть/);
  assert.match(html, /<details[\s\S]*Ключевые источники/);
  assert.doesNotMatch(html, /data-v2-diagnostics|data-v2-guidelines|data-v2-arguments-for|data-v2-arguments-against|data-v2-uncertainties/);
  assert.doesNotMatch(html, /Диагностика research pipeline|Evidence Pack|Архитектура поиска/i);
  assert.match(html, /ophthasearch-v2\.css/);
  assert.match(html, /ophthasearch-v2\.js\?v=20260825-2/);
});

test('OphthaSearch client posts to the deployed workers.dev research endpoint', async () => {
  assert.equal(DEFAULT_RESEARCH_ENDPOINT, workerEndpoint);
  const calls = [];
  const response = await requestResearch('Медикаментозная терапия ПОУГ', 'ru', {
    fetchImpl: async (...args) => {
      calls.push(args);
      return new Response(JSON.stringify({ ok: true, result: { schemaVersion: '2.0', status: 'complete', answer: { clinical_bottom_line: 'ok', confidence: 'moderate', management: [], arguments_against: [], alternatives: [], uncertainties: [], clinical_interpretation: '', sources: [] } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], workerEndpoint);
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(JSON.parse(calls[0][1].body).question, 'Медикаментозная терапия ПОУГ');
  assert.equal(response.status, 'complete');
});

test('browser client never calls scientific provider APIs directly or renders pipeline diagnostics', async () => {
  const source = await fs.readFile(clientPath, 'utf8');
  for (const host of ['eutils.ncbi.nlm.nih.gov', 'ebi.ac.uk', 'clinicaltrials.gov/api', 'api.openalex.org', 'api.crossref.org']) {
    assert.doesNotMatch(source, new RegExp(host.replaceAll('.', '\\.'), 'i'));
  }
  assert.doesNotMatch(source, /renderDiagnostics|data-v2-diagnostics|Evidence Pack/i);
});

test('renderer treats model and source strings as text rather than executable HTML', async () => {
  const source = await fs.readFile(clientPath, 'utf8');
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write/i);
  assert.match(source, /textContent\s*=/);
  assert.match(source, /createElement\(/);
});

test('stylesheet guards mobile viewport against long identifiers', async () => {
  const css = await fs.readFile(cssPath, 'utf8');
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});
