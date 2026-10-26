import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('analytics leaves event requests untouched so crawlers and visitors see the same catalogue', () => {
  const fetch = async () => new Response('{}');
  const context = {
    fetch, Response, location: { pathname: '/for-doctors/events/', href: 'https://matveyshemyakin.ru/for-doctors/events/' },
    document: { readyState: 'loading', addEventListener() {} },
    localStorage: { getItem: () => null }, addEventListener() {}, Date, Set, URL, setTimeout, clearTimeout,
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync('analytics.js', 'utf8'), context);
  assert.equal(context.fetch, fetch, 'Analytics must not inject a second catalogue into fetch responses');
});
