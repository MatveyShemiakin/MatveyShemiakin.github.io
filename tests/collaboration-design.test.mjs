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

test('collaboration form submits directly to the site backend without Gmail or mailto handoff', () => {
  const js = read('collaboration/assets/app.js');
  assert.ok(js.includes("fetch('/api/contact'"), 'form must POST to the same-origin contact backend');
  assert.ok(js.includes("method: 'POST'"), 'contact request must use POST');
  assert.ok(js.includes('Сообщение отправлено'), 'RU success state is missing');
  assert.ok(js.includes('Message sent'), 'EN success state is missing');
  assert.ok(!js.includes('mail.google.com/mail/'), 'Gmail handoff must be removed');
  assert.ok(!js.includes('mailto:'), 'mailto handoff must be removed');
});

test('collaboration modal stays above global mobile overlays and submit keeps full hit area', () => {
  const css = read('collaboration/assets/design-refresh.css');
  assert.ok(css.includes('.modal{z-index:20000'), 'modal must sit above global cookie/fab overlays');
  assert.ok(css.includes('touch-action:manipulation'), 'submit button needs explicit mobile touch handling');
  assert.ok(css.includes('pointer-events:auto'), 'submit button must keep its whole hit area interactive');
});

test('Cloudflare Worker validates professional enquiries and sends via Email Service binding', () => {
  const worker = read('cloudflare/contact-worker/worker.mjs');
  const config = read('cloudflare/contact-worker/wrangler.toml');
  assert.ok(worker.includes('env.EMAIL.send'), 'Email Service binding must send the enquiry');
  assert.ok(worker.includes('env.CONTACT_RECIPIENT'), 'recipient must stay in a Worker secret');
  assert.ok(worker.includes('matveyshemyakin.ru'), 'same-origin allowlist is missing');
  assert.ok(worker.includes('honeypot'), 'honeypot validation is missing');
  assert.ok(worker.includes('consent'), 'consent validation is missing');
  assert.ok(config.includes('[[send_email]]'), 'send_email binding is missing');
  assert.ok(config.includes('pattern = "matveyshemyakin.ru/api/contact*"'), 'production Worker route is missing');
});

test('privacy policy documents the collaboration form and Cloudflare processing', () => {
  const ru = read('privacy.html');
  const en = read('en/privacy.html');
  assert.ok(ru.includes('профессионального обращения через форму'), 'RU policy must mention the contact form');
  assert.ok(ru.includes('Cloudflare'), 'RU policy must disclose Cloudflare processing');
  assert.ok(en.includes('professional enquiry through the form'), 'EN policy must mention the contact form');
  assert.ok(en.includes('Cloudflare'), 'EN policy must disclose Cloudflare processing');
});
