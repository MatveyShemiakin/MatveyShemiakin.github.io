import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('for-doctors/penetrating-keratoplasty/index.html', 'utf8');
const headerCss = readFileSync('clinical-header.css', 'utf8');
const headerJs = readFileSync('doctors-legal.js', 'utf8');

test('hides the embedded first-photo caption without altering the source JPEG', () => {
  const cropClasses = page.match(/caption-cropped/g) || [];
  assert.ok(cropClasses.length >= 5, `expected the crop treatment in CSS, hero, figure and lightbox logic; found ${cropClasses.length}`);
  assert.match(page, /data-crop="caption"/);
  assert.match(page, /is-caption-cropped/);
  assert.doesNotMatch(page, /clinical-01-eye\.png/);
});

test('protects every clinical image surface with the approved watermark', () => {
  assert.match(page, /\.hero-portrait::after/);
  assert.match(page, /\.figure-media::after/);
  assert.match(page, /\.lightbox-media::after/);
  assert.match(page, /MATVEYSHEMYAKIN\.RU/);
  assert.match(page, /class="lightbox-media"/);
});

test('keeps the ergonomic 760px reading measure and uncropped clinical images', () => {
  assert.match(page, /--content:\s*760px/);
  assert.match(page, /\.figure-media img[^}]*object-fit:\s*contain/s);
  assert.match(page, /overflow-x:\s*clip/);
});

test('shared clinical header contains the primary site navigation', () => {
  for (const label of ['Пациентам', 'Для врачей', 'О враче', 'Направления', 'Образование', 'Наука', 'Контакты']) {
    assert.ok(headerJs.includes(label), `missing navigation label: ${label}`);
  }
  assert.match(headerCss, /font-family:var\(--clinical-serif\)/);
  assert.match(headerCss, /text-transform:uppercase/);
  assert.match(headerCss, /--clinical-header-height:\s*104px/);
});
