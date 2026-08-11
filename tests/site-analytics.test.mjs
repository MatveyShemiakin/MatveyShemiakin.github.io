import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const analyticsPath = new URL('../analytics.js', import.meta.url);
const injectorPath = new URL('../scripts/inject_legal.py', import.meta.url);

function runAnalytics(choice = null) {
  const source = fs.readFileSync(analyticsPath, 'utf8');
  const listeners = new Map();
  const inserted = [];
  const storage = new Map();
  if (choice !== null) storage.set('site_cookie_choice', choice);

  const window = {
    addEventListener(name, fn) { listeners.set(name, fn); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
  };
  const firstScript = { parentNode: { insertBefore(node) { inserted.push(node); } } };
  const document = {
    scripts: [firstScript],
    createElement(tag) { return { tagName: tag, async: false, src: '' }; },
    getElementsByTagName(tag) { return tag === 'script' ? [firstScript] : []; },
  };
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, value); },
  };
  const context = vm.createContext({ window, document, localStorage, CustomEvent: class { constructor(type) { this.type = type; } }, Event: class { constructor(type) { this.type = type; } }, Date });
  window.window = window;
  window.document = document;
  window.localStorage = localStorage;
  context.globalThis = context;
  vm.runInContext(source, context);
  return { window, inserted, storage, listeners };
}

test('does not contact Yandex before analytics consent', () => {
  const { window, inserted } = runAnalytics(null);
  assert.equal(inserted.length, 0);
  assert.equal(window.__siteAnalyticsInitialized, undefined);
  assert.equal(typeof window.initSiteAnalytics, 'function');
});

test('loads Yandex Metrika 111504350 after consent and only once', () => {
  const { window, inserted, storage } = runAnalytics(null);
  storage.set('site_cookie_choice', 'analytics');
  window.dispatchEvent({ type: 'site:analytics-consent' });

  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].src, 'https://mc.yandex.ru/metrika/tag.js?id=111504350');
  assert.equal(window.__siteAnalyticsInitialized, true);
  assert.equal(typeof window.ym, 'function');
  const initCall = JSON.parse(JSON.stringify(Array.from(window.ym.a[0])));
  assert.deepEqual(initCall, [111504350, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    accurateTrackBounce: true,
    trackLinks: true,
  }]);

  window.initSiteAnalytics();
  assert.equal(inserted.length, 1);
});

test('starts immediately when consent was stored previously', () => {
  const { inserted } = runAnalytics('analytics');
  assert.equal(inserted.length, 1);
});

test('global HTML injector places analytics loader in head and keeps it versioned', () => {
  const source = fs.readFileSync(injectorPath, 'utf8');
  assert.match(source, /ANALYTICS_SCRIPT/);
  assert.match(source, /analytics\.js\?v=20260811-1/);
  assert.match(source, /<head/);
});
