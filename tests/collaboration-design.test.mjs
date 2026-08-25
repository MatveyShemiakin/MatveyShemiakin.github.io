import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const doctorHubs = [
  ['for-doctors/index.html', '/collaboration/', 'Профессиональное сотрудничество'],
  ['en/for-doctors/index.html', '/en/collaboration/', 'Professional collaboration'],
];

const collaborationPages = [
  'collaboration/index.html',
  'en/collaboration/index.html',
];

test('doctor hubs place the animated collaboration entry before the hero', () => {
  for (const [path, href, label] of doctorHubs) {
    const html = read(path);
    const entry = html.indexOf('class="doctor-collaboration-entry"');
    const hero = html.indexOf('class="doctors-hero"');
    assert.ok(entry > html.indexOf('<main>'), `${path}: collaboration entry must be inside main`);
    assert.ok(entry < hero, `${path}: collaboration entry must appear before the hero`);
    assert.match(html, new RegExp(`href="${href.replaceAll('/', '\\/')}"`));
    assert.ok(html.includes(label), `${path}: localized CTA label is missing`);
    assert.ok(html.includes('doctor-collaboration-entry__icon'), `${path}: CTA icon is missing`);
    assert.ok(html.includes('/for-doctors/collaboration-entry.css'), `${path}: CTA stylesheet is missing`);
  }
});

test('collaboration pages keep six semantic SVG card icons in both languages', () => {
  for (const path of collaborationPages) {
    const html = read(path);
    assert.equal((html.match(/class="card-icon card-icon--/g) || []).length, 6, `${path}: expected six card icons`);
    assert.ok((html.match(/<svg/g) || []).length >= 11, `${path}: SVG icon system is incomplete`);
    assert.ok(html.includes('class="theme-icon"'), `${path}: theme control must use an SVG icon`);
    assert.ok(!html.includes('>◐<'), `${path}: legacy text theme glyph must be removed`);
    assert.ok(html.includes('class="collaboration-back"'), `${path}: mobile/compact back route to the doctors section is missing`);
    assert.ok(html.includes('/collaboration/assets/design-refresh.css'), `${path}: refresh stylesheet is missing`);
  }
});

test('collaboration styles support animated icons, dark theme and mobile tap feedback', () => {
  const css = read('collaboration/assets/design-refresh.css');
  assert.ok(css.includes('.card-icon'), 'card icon styles are missing');
  assert.ok(css.includes('.card:active .card-icon'), 'touch feedback for card icons is missing');
  assert.ok(css.includes(':root[data-theme="dark"] .card-icon'), 'dark-theme icon treatment is missing');
  assert.ok(css.includes('@media (max-width:620px)'), 'mobile collaboration breakpoint is missing');
  assert.ok(css.includes('@media (prefers-reduced-motion:reduce)'), 'reduced-motion fallback is missing');
});

test('doctor collaboration CTA styling includes gold motion and reduced-motion fallback', () => {
  const css = read('for-doctors/collaboration-entry.css');
  assert.ok(css.includes('.doctor-collaboration-entry'), 'CTA base style is missing');
  assert.ok(css.includes('@keyframes'), 'CTA animation is missing');
  assert.ok(css.includes('prefers-reduced-motion'), 'CTA reduced-motion fallback is missing');
  assert.ok(css.includes('@media (max-width:680px)'), 'CTA mobile layout is missing');
});

test('collaboration form has a reliable browser handoff instead of a mailto-only submit', () => {
  const js = read('collaboration/assets/app.js');
  assert.ok(js.includes('mail.google.com/mail/'), 'Gmail browser compose fallback is missing');
  assert.ok(js.includes('mailto:'), 'native email-client fallback is missing');
  assert.ok(js.includes("addEventListener('invalid'"), 'visible invalid-field feedback is missing');
  assert.ok(js.includes('data-contact-submit'), 'submit control hook is missing');
});

test('global legal script never injects ProDoctorov into collaboration pages', () => {
  const js = read('legal.js');
  assert.ok(js.includes('isCollaborationSection'), 'collaboration route guard is missing');
  assert.ok(js.includes('isDoctorsSection||isCollaborationSection'), 'ProDoctorov exclusion must cover doctors and collaboration sections');
});
