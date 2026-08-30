import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { levelForScore } from '../for-doctors/ophtha-arcade/ophtha-merge/levels.js';
import { tileLabel, uiText } from '../for-doctors/ophtha-arcade/ophtha-merge/i18n.js';

test('career levels unlock from personal-best score', () => {
  assert.equal(levelForScore(0).name, 'Resident');
  assert.equal(levelForScore(1999).name, 'Resident');
  assert.equal(levelForScore(2000).name, 'Surgeon');
  assert.equal(levelForScore(5000).name, 'Senior Surgeon');
  assert.equal(levelForScore(10000).name, 'Expert');
  assert.equal(levelForScore(20000).name, 'Master Surgeon');
  assert.equal(levelForScore(50000).name, 'Ophtha Legend');
  assert.equal(levelForScore(9999999).name, 'Ophtha Legend');
});

test('ophthalmology terminology is correct in Russian and localized in English', () => {
  assert.equal(tileLabel(4, 'ru'), 'Хрусталик');
  assert.equal(tileLabel(16, 'ru'), 'Радужка');
  assert.equal(tileLabel(4, 'en'), 'Crystalline lens');
  assert.equal(tileLabel(16, 'en'), 'Iris');
  assert.equal(uiText('profileLevel', 'ru'), 'Уровень');
  assert.equal(uiText('profileLevel', 'en'), 'Level');
});

test('RU Arcade landing uses standard shell and contains no injected material tools or MVP label', () => {
  const html = fs.readFileSync(new URL('../for-doctors/ophtha-arcade/index.html', import.meta.url), 'utf8');
  assert.match(html, /class="doctors-header"/);
  assert.match(html, /class="site-footer"/);
  assert.match(html, /Хрусталик/);
  assert.match(html, /Радужка/);
  assert.doesNotMatch(html, /MVP/i);
  assert.doesNotMatch(html, /doctor-material-tools|doctor-related-list|doctor-bookmark-toggle/);
  assert.match(html, /\/en\/for-doctors\/ophtha-arcade\//);
});

test('RU game exposes player level next to profile name', () => {
  const html = fs.readFileSync(new URL('../for-doctors/ophtha-arcade/ophtha-merge/index.html', import.meta.url), 'utf8');
  assert.match(html, /class="doctors-header"/);
  assert.match(html, /class="site-footer"/);
  assert.match(html, /id="profile-level"/);
  assert.match(html, /\/en\/for-doctors\/ophtha-arcade\/ophtha-merge\//);
});

test('English Arcade and game pages exist with English shell and reciprocal language links', () => {
  const landing = fs.readFileSync(new URL('../en/for-doctors/ophtha-arcade/index.html', import.meta.url), 'utf8');
  const game = fs.readFileSync(new URL('../en/for-doctors/ophtha-arcade/ophtha-merge/index.html', import.meta.url), 'utf8');
  for (const html of [landing, game]) {
    assert.match(html, /<html lang="en">/);
    assert.match(html, /class="doctors-header"/);
    assert.match(html, /class="site-footer"/);
    assert.match(html, /hreflang="ru"/);
    assert.match(html, /hreflang="en"/);
  }
  assert.match(landing, /Crystalline lens/);
  assert.match(landing, /Iris/);
  assert.match(game, /id="profile-level"/);
});

test('game runtime derives a visible level badge for profiles and leaderboard entries', () => {
  const core = fs.readFileSync(new URL('../for-doctors/ophtha-arcade/ophtha-merge/app-core.js', import.meta.url), 'utf8');
  assert.match(core, /levelForScore/);
  assert.match(core, /profile-level/);
  assert.match(core, /ophtha-merge-player-level/);
});

test('tile icon level uses raw numeric data instead of localized formatted text', () => {
  const core = fs.readFileSync(new URL('../for-doctors/ophtha-arcade/ophtha-merge/app-core.js', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../for-doctors/ophtha-arcade/ophtha-merge/app.js', import.meta.url), 'utf8');
  assert.match(core, /tile\.dataset\.value\s*=\s*String\(value\)/);
  assert.match(app, /tile\.dataset\.value/);
});
