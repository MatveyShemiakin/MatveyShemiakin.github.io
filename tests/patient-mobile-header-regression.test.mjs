import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const headerApi = require(path.join(ROOT, 'site-header-unified.js'));

test('unified header preserves site-head wrappers that also contain the page hero', () => {
  const fakeHeader = {
    classList: { contains: (name) => name === 'site-head' },
    children: [
      { classList: { contains: (name) => name === 'nav' } },
      { classList: { contains: (name) => name === 'hero' } }
    ]
  };
  assert.equal(headerApi.legacyHeaderContainsHero(fakeHeader), true);
});

test('ordinary navigation-only headers are still replaceable', () => {
  const fakeHeader = {
    classList: { contains: (name) => name === 'patient-header' },
    children: []
  };
  assert.equal(headerApi.legacyHeaderContainsHero(fakeHeader), false);
});

test('preserved legacy navigation keeps its layout space but is not visible or interactive', () => {
  const css = fs.readFileSync(path.join(ROOT, 'site-header-unified.css'), 'utf8');
  assert.match(css, /\.site-head>\.unified-site-header__legacy-spacer\{/);
  assert.match(css, /visibility:hidden!important/);
  assert.match(css, /pointer-events:none!important/);
});

test('cataract mobile hero subtitle may wrap inside the viewport', () => {
  const css = fs.readFileSync(path.join(ROOT, 'patients/accessibility-fixes.css'), 'utf8');
  assert.match(css, /\.patient-hero h1 em\{[^}]*white-space:normal;[^}]*overflow-wrap:break-word/);
});
