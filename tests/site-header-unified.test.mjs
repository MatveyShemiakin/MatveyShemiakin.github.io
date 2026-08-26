import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MODULE = path.join(ROOT, 'site-header-unified.js');
const CSS = path.join(ROOT, 'site-header-unified.css');

function api(){
  assert.equal(fs.existsSync(MODULE), true, 'site-header-unified.js must exist');
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

test('page context distinguishes main, patients, doctors and collaboration', () => {
  const { pageContext } = api();
  assert.equal(pageContext('/', 'ru').section, 'main');
  assert.equal(pageContext('/patients/cataract/', 'ru').section, 'patients');
  assert.equal(pageContext('/for-doctors/events/', 'ru').section, 'doctors');
  assert.equal(pageContext('/collaboration/', 'ru').section, 'collaboration');
});

test('language routes preserve equivalent RU and EN paths', () => {
  const { languageRoutes } = api();
  assert.deepEqual(languageRoutes('/patients/cataract/', 'ru'), {ru:'/patients/cataract/', en:'/en/patients/cataract/'});
  assert.deepEqual(languageRoutes('/en/for-doctors/events/', 'en'), {ru:'/for-doctors/events/', en:'/en/for-doctors/events/'});
  assert.deepEqual(languageRoutes('/collaboration/', 'ru'), {ru:'/collaboration/', en:'/en/collaboration/'});
});

test('canonical markup contains one nav mount and localized accessible controls', () => {
  const { headerMarkup } = api();
  const ru = headerMarkup({path:'/patients/', lang:'ru', hasPatientBell:true, hasDoctorBell:false});
  assert.equal((ru.match(/unified-site-header__nav-mount/g)||[]).length, 1);
  assert.match(ru, /aria-label="Язык сайта"/);
  assert.match(ru, /aria-label="Переключить цветовую гамму"/);
  assert.match(ru, /data-unified-context="patient-updates"/);
  assert.doesNotMatch(ru, /style=/);

  const en = headerMarkup({path:'/en/for-doctors/', lang:'en', hasPatientBell:false, hasDoctorBell:true});
  assert.match(en, /aria-label="Site language"/);
  assert.match(en, /aria-label="Switch color theme"/);
  assert.match(en, /data-unified-context="doctors-updates"/);
});

test('shared stylesheet defines canonical desktop mobile theme and focus contracts', () => {
  assert.equal(fs.existsSync(CSS), true, 'site-header-unified.css must exist');
  const css = fs.readFileSync(CSS, 'utf8');
  for (const token of [
    '.unified-site-header',
    '.unified-site-header__inner',
    '.unified-site-header__controls',
    '@media(max-width:1020px)',
    '[data-site-theme="light"]',
    '[data-site-theme="dark"]',
    ':focus-visible',
    'prefers-reduced-motion'
  ]) assert.ok(css.includes(token), `missing CSS contract: ${token}`);
  assert.ok(!css.includes('style='), 'stylesheet must not encode inline style attributes');
});
