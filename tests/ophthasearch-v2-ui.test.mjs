import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  requestResearch,
  requestFeedback,
  DEFAULT_RESEARCH_ENDPOINT,
  DEFAULT_FEEDBACK_ENDPOINT
} from '../for-doctors/ophthasearch-v2/ophthasearch-v2.js';

const pagePath = new URL('../for-doctors/ophthasearch-v2/index.html', import.meta.url);
const enPagePath = new URL('../en/for-doctors/ophthasearch/index.html', import.meta.url);
const clientPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2.js', import.meta.url);
const cssPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2.css', import.meta.url);
const modernCssPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2-modern.css', import.meta.url);
const motionPath = new URL('../for-doctors/ophthasearch-v2/ophthasearch-v2-motion.js', import.meta.url);
const workerBase = 'https://matveyshemiakin-github-io.matvei-shemyakin.workers.dev';
const workerEndpoint = `${workerBase}/v2/research`;
const feedbackEndpoint = `${workerBase}/v2/feedback`;

function feedbackFixture() {
  return {
    rating: 'problem',
    errorTags: ['wrong_conclusion', 'citation_problem'],
    comment: 'Вывод требует пересмотра.'
  };
}

test('OphthaSearch page prioritizes clinical conclusion and hides pipeline internals', async () => {
  const html = await fs.readFile(pagePath, 'utf8');
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.match(html, /data-v2-search-form/);
  for (const hook of ['bottom-line', 'management', 'important', 'sources']) {
    assert.match(html, new RegExp(`data-v2-${hook}`));
  }
  assert.match(html, /Клинический вывод/);
  assert.match(html, /Практическая тактика/);
  assert.match(html, /Важно учесть/);
  assert.match(html, /<details[\s\S]*Ключевые источники/);
  assert.doesNotMatch(html, /data-v2-diagnostics|data-v2-guidelines|data-v2-arguments-for|data-v2-arguments-against|data-v2-uncertainties/);
  assert.doesNotMatch(html, /Диагностика research pipeline|Evidence Pack|Архитектура поиска|Gemma 4|server-side|multiple sources/i);
  assert.match(html, /ophthasearch-v2\.css/);
  assert.match(html, /ophthasearch-v2-modern\.css/);
  assert.match(html, /ophthasearch-v2\.js/);
  assert.match(html, /ophthasearch-v2-motion\.js/);
});

test('RU and EN pages share the calm search-first structure', async () => {
  const [ru, en] = await Promise.all([
    fs.readFile(pagePath, 'utf8'),
    fs.readFile(enPagePath, 'utf8')
  ]);
  for (const html of [ru, en]) {
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    for (const hook of ['data-v2-landing', 'data-v2-eye-mark', 'data-v2-search-form', 'data-v2-query', 'data-v2-submit', 'data-v2-example']) {
      assert.match(html, new RegExp(hook));
    }
    assert.match(html, /ophthasearch-v2-modern\.css/);
    assert.match(html, /ophthasearch-v2-motion\.js/);
    assert.doesNotMatch(html, /Evidence Pack|Gemma 4|research pipeline|server-side|multi-source orchestration/i);
  }
  assert.match(ru, /Клинический поиск и краткий синтез научных данных для офтальмолога/);
  assert.match(en, /Clinical evidence search and concise synthesis for ophthalmologists/);
  assert.match(ru, />МШ</);
  assert.match(en, />MS</);
});

test('search UI warns physicians not to enter direct patient identifiers', async () => {
  const html = await fs.readFile(pagePath, 'utf8');
  assert.match(html, /data-v2-privacy-notice/);
  assert.match(html, /не вводите[\s\S]*(?:ФИО|имя)[\s\S]*(?:контакт|телефон)[\s\S]*(?:истори|карт)/i);
});

test('feedback UI exists but is hidden until a persisted run_id is returned', async () => {
  const html = await fs.readFile(pagePath, 'utf8');
  assert.match(html, /data-v2-feedback-shell[^>]*hidden|hidden[^>]*data-v2-feedback-shell/);
  assert.match(html, /data-v2-feedback-helpful/);
  assert.match(html, /data-v2-feedback-problem/);
  assert.match(html, /Полезно/);
  assert.match(html, /Есть проблема/);
  for (const tag of ['irrelevant_sources', 'wrong_conclusion', 'missing_evidence', 'wrong_management', 'citation_problem', 'too_slow', 'other']) {
    assert.match(html, new RegExp(`value=["']${tag}["']`));
  }
  assert.match(html, /data-v2-feedback-comment/);
  assert.match(html, /data-v2-feedback-submit/);
  assert.match(html, /data-v2-feedback-status/);
  assert.doesNotMatch(html, /\bD1\b|dataset|fine[- ]?tun|training case/i);
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

test('feedback client sends only the current run_id and bounded feedback payload', async () => {
  assert.equal(DEFAULT_FEEDBACK_ENDPOINT, feedbackEndpoint);
  const calls = [];
  const result = await requestFeedback('77777777-7777-4777-8777-777777777777', feedbackFixture(), {
    fetchImpl: async (...args) => {
      calls.push(args);
      return new Response(JSON.stringify({ ok: true, feedback_id: '88888888-8888-4888-8888-888888888888' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], feedbackEndpoint);
  assert.equal(calls[0][1].method, 'POST');
  const body = JSON.parse(calls[0][1].body);
  assert.deepEqual(body, {
    schemaVersion: '2.0',
    runId: '77777777-7777-4777-8777-777777777777',
    rating: 'problem',
    errorTags: ['wrong_conclusion', 'citation_problem'],
    comment: 'Вывод требует пересмотра.'
  });
  assert.equal(result.feedback_id, '88888888-8888-4888-8888-888888888888');
});

test('browser feedback state is reset on a new question and gated on run_id', async () => {
  const source = await fs.readFile(clientPath, 'utf8');
  assert.match(source, /data-v2-feedback-shell/);
  assert.match(source, /run_id/);
  assert.match(source, /resetFeedback/);
  assert.match(source, /lastSubmittedQuestion/);
  assert.match(source, /requestFeedback/);
});

test('browser client never calls scientific provider APIs directly or renders pipeline diagnostics', async () => {
  const source = await fs.readFile(clientPath, 'utf8');
  for (const host of ['eutils.ncbi.nlm.nih.gov', 'ebi.ac.uk', 'clinicaltrials.gov/api', 'api.openalex.org', 'api.crossref.org']) {
    assert.doesNotMatch(source, new RegExp(host.replaceAll('.', '\\.'), 'i'));
  }
  assert.doesNotMatch(source, /renderDiagnostics|data-v2-diagnostics|Evidence Pack/i);
});

test('renderer treats model, source and feedback strings as text rather than executable HTML', async () => {
  const source = await fs.readFile(clientPath, 'utf8');
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write/i);
  assert.match(source, /textContent\s*=/);
  assert.match(source, /createElement\(/);
});

test('stylesheet guards mobile viewport and styles feedback without inline CSS', async () => {
  const css = await fs.readFile(cssPath, 'utf8');
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /\.ophtha-v2-privacy-notice/);
  assert.match(css, /\.ophtha-v2-feedback/);
});

test('modern stylesheet implements eye focus, floating composer, result reveal and reduced motion', async () => {
  const css = await fs.readFile(modernCssPath, 'utf8');
  for (const token of ['.ophtha-v2-eye-mark', '.ophtha-v2-eye-iris', '.ophtha-v2-composer-wrap', '.ophtha-v2-example', '.ophtha-v2-answer-shell']) {
    assert.match(css, new RegExp(token.replaceAll('.', '\\.')));
  }
  assert.match(css, /@keyframes\s+ophthaEyeFocus/);
  assert.match(css, /@keyframes\s+ophthaResultReveal/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(min-width:\s*761px\)/);
});

test('motion controller types examples, stops on physician input, and observes result visibility', async () => {
  const source = await fs.readFile(motionPath, 'utf8');
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|document\.write/i);
  assert.match(source, /TYPEWRITER_COPY/);
  assert.match(source, /data-v2-example/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /addEventListener\(['"]input['"]/);
  assert.match(source, /addEventListener\(['"]focus['"]/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /is-searching/);
  assert.match(source, /has-answer/);
});
