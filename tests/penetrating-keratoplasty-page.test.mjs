import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('for-doctors/penetrating-keratoplasty/index.html', 'utf8');
const englishPage = readFileSync('en/for-doctors/penetrating-keratoplasty/index.html', 'utf8');
const headerCss = readFileSync('clinical-header.css', 'utf8');
const headerJs = readFileSync('doctors-legal.js', 'utf8');
const legalInjector = readFileSync('scripts/inject_legal.py', 'utf8');
const doctorsLanding = readFileSync('for-doctors/index.html', 'utf8');
const englishDoctorsLanding = readFileSync('en/for-doctors/index.html', 'utf8');

test('hides the embedded first-photo caption without altering the source JPEG', () => {
  const cropClasses = page.match(/caption-cropped/g) || [];
  assert.ok(cropClasses.length >= 5, `expected the crop treatment in CSS, hero, figure and lightbox logic; found ${cropClasses.length}`);
  assert.match(page, /data-crop="caption"/);
  assert.match(page, /is-caption-cropped/);
  assert.match(page, /\.figure-media\.caption-cropped\s*\{[^}]*height:\s*clamp\(330px,46vw,560px\)/s);
  assert.match(page, /\.figure-media\.caption-cropped img\s*\{[^}]*position:\s*absolute/s);
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
  assert.match(headerCss, /--clinical-serif:var\(--serif,/);
  assert.match(headerCss, /font-family:var\(--clinical-serif\)/);
  assert.match(headerCss, /text-transform:uppercase/);
  assert.match(headerCss, /--clinical-header-height:\s*98px/);
  assert.match(headerCss, /font:400 31px\/1 var\(--clinical-serif\)/);
  assert.match(headerCss, /letter-spacing:\.25em/);
  assert.match(page, /doctors-legal\.js\?v=20260805-1/);
  assert.match(legalInjector, /doctors-legal\.js\?v=20260805-1/);
});

test('professional notice is injected into the real article column, never a quick card', () => {
  assert.match(headerJs, /document\.querySelector\('\.article'\)/);
  assert.doesNotMatch(headerJs, /querySelector\('\.article,article'\)/);
});

test('professional notice title stays white inside the dark panel in the light theme', () => {
  assert.match(page, /html:not\(\[data-theme="dark"\]\) \.article \.md-prof-clinical h2\s*\{[^}]*color:\s*#fff/s);
});

test('treatment cards do not create narrow text columns', () => {
  for (const clinicalPage of [page, englishPage]) {
    assert.match(clinicalPage, /\.regimen-card \.dose-row\s*\{[^}]*grid-template-columns:1fr/s);
    assert.match(clinicalPage, /\.quick-card[^}]*word-break:normal/s);
    assert.match(clinicalPage, /\.regimen-card[^}]*overflow-wrap:normal/s);
  }
});

test('keratoplasty library preview shows a close eye crop without the embedded caption', () => {
  for (const landing of [doctorsLanding, englishDoctorsLanding]) {
    assert.match(landing, /\.library-image\.pkp\{[^}]*background-size:cover/s);
    assert.match(landing, /\.library-image\.pkp\{[^}]*background-position:center 39%/s);
    assert.match(landing, /\.library-image\.pkp::after/);
    assert.match(landing, /MATVEYSHEMYAKIN\.RU/);
  }
});
