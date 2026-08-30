import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameBase = new URL('../for-doctors/ophtha-arcade/ophtha-merge/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', gameBase), 'utf8');
const app = fs.readFileSync(new URL('app.js', gameBase), 'utf8');
const css = fs.readFileSync(new URL('ophtha-merge.css', gameBase), 'utf8');
const doctors = fs.readFileSync(new URL('../for-doctors/index.html', import.meta.url), 'utf8');

test('mobile play zone owns swipe gestures instead of scrolling the page', () => {
  assert.match(html, /class=["'][^"']*ophtha-merge-touch-zone[^"']*["'][^>]*id=["']game-play-zone["']/);
  assert.match(css, /\.ophtha-merge-touch-zone\{[^}]*touch-action:\s*none[^}]*overscroll-behavior:\s*contain/s);
  assert.match(app, /setPointerCapture\(/);
  assert.match(app, /addEventListener\(['"]pointermove['"],\s*onPointerMove,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.match(app, /function onPointerMove[\s\S]*?preventDefault\(\)/);
});

test('ophthalmology tiles use scalable visual icons and explicit readable controls', () => {
  assert.match(app, /function createTileIcon\(/);
  assert.match(app, /ophtha-merge-tile-icon/);
  assert.match(css, /\.ophtha-merge-tile-icon\{[^}]*width:\s*clamp\(/s);
  assert.match(css, /\.ophtha-merge-compact-button:disabled\{[^}]*color:/s);
  assert.match(css, /html\[data-site-theme=["']dark["']\][^\n]*\.ophtha-merge-compact-button/s);
});

test('doctors landing page exposes Ophtha Arcade as a first-class destination', () => {
  assert.match(doctors, /href=["']\/for-doctors\/ophtha-arcade\/["']/);
  assert.match(doctors, />Ophtha Arcade</);
  assert.match(doctors, /Ophtha Merge/);
});
