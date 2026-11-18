import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

// Run the actual late-loading breadcrumb modules against a page that already
// has its static trail. Any attempted visible insertion reproduces the bug.
function runMetadataModule(file, marker, path, lang) {
  const jsonScripts = [];
  let visibleTrails = 1;
  const parent = { firstChild: null, insertBefore() {}, prepend() {}, querySelector() { return null; } };
  const h1 = { parentElement: parent };
  const document = {
    documentElement: { lang },
    querySelector(selector) {
      if (selector === 'main h1') return h1;
      if (selector === '.terms-hero') return parent;
      return null;
    },
    querySelectorAll(selector) {
      return selector === 'script[type="application/ld+json"]' ? jsonScripts : [];
    },
    createElement(tag) {
      if (tag === 'nav') visibleTrails++;
      return { tagName: tag, dataset: {}, textContent: '', appendChild() {}, setAttribute() {} };
    },
    head: { appendChild(element) { jsonScripts.push(element); } }
  };
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes(marker));
  const module = source.slice(source.indexOf(marker) + marker.length);
  const context = vm.createContext({ document, window: { location: { pathname: path, origin: 'https://matveyshemyakin.ru' } } });
  vm.runInContext(module, context);
  vm.runInContext(module, context);
  assert.equal(visibleTrails, 1, `${path}: late scripts must not insert another visible trail`);
  assert.equal(jsonScripts.length, 1, `${path}: structured breadcrumbs must also stay unique`);
}

for (const path of ['/for-doctors/bacterial-keratitis/', '/for-doctors/penetrating-keratoplasty/', '/en/for-doctors/penetrating-keratoplasty/']) {
  test(`clinical module preserves one visible breadcrumb: ${path}`, () => {
    runMetadataModule('doctors-legal.js', '/* CLINICAL_BREADCRUMBS_V1 */', path, path.startsWith('/en/') ? 'en' : 'ru');
  });
}
for (const path of ['/patients/before-surgery/', '/en/patients/before-surgery/', '/for-doctors/professional-use.html', '/en/for-doctors/professional-use.html']) {
  test(`legal module preserves one visible breadcrumb: ${path}`, () => {
    runMetadataModule('legal.js', '/* SITE_BREADCRUMBS_V1 */', path, path.startsWith('/en/') ? 'en' : 'ru');
  });
}
