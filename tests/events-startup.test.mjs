import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Removing the shared header's legacy theme button must not stop data loading.
for (const lang of ['ru', 'en']) {
  test(`${lang}: failed data request keeps searchable HTML and official links`, async () => {
    const originalCards = '<article class="event-card"><a href="https://2027.apaophth.org/">APAO 2027 Singapore</a></article>';
    const grid = { innerHTML: originalCards, dataset: { eventsPrerendered: 'true' } };
    const meta = { textContent: '' };
    const source = fs.readFileSync('assets/events/events.js', 'utf8').replace('}init();', '}window.startup=init();');
    const window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
    const document = {
      documentElement: { lang }, body: { dataset: { eventsSrc: `/assets/data/ophthalmology-events.${lang}.json` } },
      addEventListener() {}, querySelector: selector => ({ '#events-grid': grid, '#results-meta': meta }[selector] || null), querySelectorAll: () => []
    };
    vm.runInNewContext(source, { document, window, localStorage: { getItem: () => null },
      fetch: async () => { throw new Error('offline'); }, console: { error() {} }, Date, Set, URL, URLSearchParams });
    await window.startup;
    assert.equal(grid.innerHTML, originalCards, 'Network failures must not remove the usable catalogue');
    assert.ok(meta.textContent.length > 0);
  });
  test(`${lang}: calendar starts fetching with the shared header and no legacy theme button`, async () => {
    const html = fs.readFileSync(`${lang === 'en' ? 'en/' : ''}for-doctors/events/index.html`, 'utf8');
    assert.match(html, /data-site-theme-toggle/);
    assert.doesNotMatch(html, /id="theme-toggle"/);
    const source = fs.readFileSync('assets/events/events.js', 'utf8').replace('}init();', '}window.startup=init();');
    let requested;
    let startupError;
    const window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
    const document = {
      documentElement: { lang, dataset: { theme: 'dark', siteTheme: 'dark' } },
      body: { dataset: { eventsSrc: `/assets/data/ophthalmology-events.${lang}.json` } },
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => []
    };
    vm.runInNewContext(source, {
      document, window, localStorage: { getItem: () => null },
      fetch: url => { requested = url; return new Promise(() => {}); },
      console, Date, Set, URL, URLSearchParams
    });
    window.startup.catch(error => { startupError = error; });
    await Promise.resolve();
    assert.equal(startupError, undefined, startupError?.message);
    assert.equal(requested, document.body.dataset.eventsSrc);
    assert.equal(document.documentElement.dataset.theme, 'dark', 'calendar must leave theme ownership to the shared controller');
  });
}
