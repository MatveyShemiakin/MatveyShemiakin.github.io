import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('RU OphthaSearch page has required multi-source hooks and no inline styles', async () => {
  const html = await read('for-doctors/ophthasearch/index.html');
  for (const id of [
    'ophtha-search-form','ophtha-query','ophtha-sort','ophtha-date','ophtha-oa','ophtha-pubtype',
    'ophtha-results','ophtha-status','ophtha-result-count','ophtha-source-board'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const provider of ['europepmc','clinicaltrials','jstage','wprim','koreascience']) {
    assert.match(html, new RegExp(`data-provider-status="${provider}"`));
  }
  assert.match(html, /Powered by J-STAGE/);
  assert.doesNotMatch(html, /\sstyle="/i);
  assert.match(html, /data-ophthasearch/);
  assert.match(html, /data-lang="ru"/);
});

test('EN OphthaSearch page has matching multi-source shell and language', async () => {
  const html = await read('en/for-doctors/ophthasearch/index.html');
  assert.match(html, /data-ophthasearch/);
  assert.match(html, /data-lang="en"/);
  assert.match(html, /Global Ophthalmology Research Search/);
  assert.match(html, /ClinicalTrials\.gov/);
  assert.match(html, /J-STAGE/);
  assert.doesNotMatch(html, /\sstyle="/i);
});

test('feature stylesheet contains responsive result workspace and source-status rules', async () => {
  const css = await read('for-doctors/ophthasearch/ophthasearch.css');
  assert.match(css, /\.ophtha-workspace/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /\.ophtha-result-card/);
  assert.match(css, /\.ophtha-source-board/);
  assert.match(css, /\.ophtha-provider-state/);
});
