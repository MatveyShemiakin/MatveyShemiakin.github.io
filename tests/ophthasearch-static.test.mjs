import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

for (const [label, path, lang] of [
  ['RU', 'for-doctors/ophthasearch/index.html', 'ru'],
  ['EN', 'en/for-doctors/ophthasearch/index.html', 'en']
]) {
  test(`${label} OphthaSearch production page exposes physician-first v2 hooks`, async () => {
    const html = await read(path);
    assert.match(html, new RegExp(`<html lang="${lang}"`));
    for (const hook of ['search-form', 'query', 'submit', 'answer-shell', 'bottom-line', 'confidence', 'management', 'important', 'sources', 'status']) {
      assert.match(html, new RegExp(`data-v2-${hook}`));
    }
    assert.match(html, /ophthasearch-v2\/ophthasearch-v2\.css/);
    assert.match(html, /ophthasearch-v2\/ophthasearch-v2\.js/);
    assert.doesNotMatch(html, /\sstyle="/i);
  });
}

test('production OphthaSearch no longer exposes legacy pipeline and provider dashboards', async () => {
  const ru = await read('for-doctors/ophthasearch/index.html');
  const en = await read('en/for-doctors/ophthasearch/index.html');
  for (const html of [ru, en]) {
    assert.doesNotMatch(html, /id="ophtha-search-form"|id="ophtha-source-board"|ophtha-pico-grid|data-signal-grid/);
    assert.doesNotMatch(html, /ophthasearch\/ophthasearch\.js|ophthasearch-v3\.js|ophthasearch-russian\.js/);
    assert.doesNotMatch(html, /7931|up to 36 merged results|до 36 объединённых результатов/i);
  }
});

test('production v2 stylesheet is responsive and guards long medical identifiers', async () => {
  const css = await read('for-doctors/ophthasearch-v2/ophthasearch-v2.css');
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /\.ophtha-v2-search-form/);
  assert.match(css, /\.ophtha-v2-bottom-line/);
  assert.match(css, /\.ophtha-v2-source/);
});

test('legacy answer-first and v3 modules remain quarantined from the production pages', async () => {
  const ru = await read('for-doctors/ophthasearch/index.html');
  const en = await read('en/for-doctors/ophthasearch/index.html');
  const answerFirst = await read('for-doctors/ophthasearch/ophthasearch-answer-first.js');
  const legacyLoader = await read('for-doctors/ophthasearch/ophthasearch.js');
  assert.match(answerFirst, /Gemma 4/);
  assert.match(legacyLoader, /ophthasearch-v3\.js/);
  for (const html of [ru, en]) {
    assert.doesNotMatch(html, /ophthasearch-answer-first\.js/);
    assert.doesNotMatch(html, /ophthasearch-v3\.js/);
    assert.doesNotMatch(html, /ophthasearch\/ophthasearch\.js/);
  }
});

test('production pages preserve shared doctor navigation and retention integrations', async () => {
  const ru = await read('for-doctors/ophthasearch/index.html');
  const en = await read('en/for-doctors/ophthasearch/index.html');
  for (const html of [ru, en]) {
    assert.match(html, /class="doctors-header"/);
    assert.match(html, /doctor-retention\.css/);
    assert.match(html, /doctor-retention\.js/);
    assert.match(html, /data-doctor-telegram/);
    assert.match(html, /doctors-updates\.js/);
  }
});
