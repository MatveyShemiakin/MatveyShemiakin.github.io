// Dependency-free Chrome DevTools checks, run by the existing events workflow.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = process.env.EVENTS_BASE_URL || 'http://127.0.0.1:8000';
const endpoint = process.env.EVENTS_CDP_URL || 'http://127.0.0.1:9222';
fs.mkdirSync('events-smoke', { recursive: true });

async function connect() {
  const target = await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data), request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  return { send, async value(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }, async close() { ws.close(); await fetch(`${endpoint}/json/close/${target.id}`); } };
}

async function until(client, expression) {
  for (let n = 0; n < 100; n++) {
    if (await client.value(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

for (const lang of ['ru', 'en']) for (const width of [390, 1440]) for (const mode of ['interactive', 'no-js', 'offline-data']) {
  const c = await connect();
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
    await c.send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Moscow' });
    await c.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await c.send('Network.setBlockedURLs', { urls: ['https://*', ...(mode === 'offline-data' ? ['*ophthalmology-events.*.json*'] : [])] });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('medical_professional_audience_v1','confirmed');localStorage.setItem('site_theme_v1','light');" });
    if (mode === 'no-js') await c.send('Emulation.setScriptExecutionDisabled', { value: true });
    const path = `/${lang === 'en' ? 'en/' : ''}for-doctors/events/`;
    await c.send('Page.navigate', { url: origin + path });
    await until(c, `location.pathname===${JSON.stringify(path)}&&document.readyState==='complete'&&!!document.querySelector('#events-grid')`);
    if (mode === 'interactive') await until(c, `document.querySelector('#results-meta')?.textContent.includes(${JSON.stringify(lang === 'en' ? 'device timezone' : 'часовой пояс устройства')})`);
    if (mode === 'offline-data') await until(c, `document.querySelector('#results-meta')?.textContent.includes(${JSON.stringify(lang === 'en' ? 'Refresh the page' : 'Обновите страницу')})`);
    const data = JSON.parse(fs.readFileSync(`assets/data/ophthalmology-events.${lang}.json`));
    const served = await fetch(`${origin}/assets/data/ophthalmology-events.${lang}.json`, { cache: 'no-store' }).then(r => r.json());
    assert.deepEqual(served, data, 'Browser test server must serve the checked-out catalogue');
    const today = await c.value("new Date().toLocaleDateString('en-CA')");
    const upcoming = data.events.filter(e => e.end >= today);
    const counts = await c.value("({cards:document.querySelectorAll('#events-grid .event-card').length,links:document.querySelectorAll('#events-grid a[href^=\"https://\"]').length,headers:document.querySelectorAll('[data-site-header=\"shared\"]').length})");
    assert.equal(counts.cards, upcoming.length, `${lang}/${width}/${mode}: cards duplicated or missing`);
    assert.ok(counts.links >= upcoming.length, `${lang}/${width}/${mode}: official links missing`);
    assert.equal(counts.headers, 1);
    for (const theme of ['light', 'dark']) {
      await c.value(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.dataset.siteTheme=${JSON.stringify(theme)}`);
      assert.ok(await c.value('document.documentElement.scrollWidth<=innerWidth+1'), `${lang}/${width}/${mode}/${theme}: horizontal overflow`);
      if (mode === 'interactive') {
        const shot = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(`events-smoke/indexing-${lang}-${width}-${theme}.png`, Buffer.from(shot.data, 'base64'));
      }
    }
    if (mode === 'interactive') {
      await c.value("document.querySelector('#toggle-past').click()");
      assert.equal(await c.value("document.querySelectorAll('#events-grid .event-card').length"), data.events.length);
      await c.value("document.querySelector('#clear-filters').click()");
      assert.equal(await c.value("document.querySelectorAll('#events-grid .event-card').length"), upcoming.length);
      if (upcoming.length) {
        const query = upcoming[0].title;
        await c.value(`document.querySelector('#event-search').value=${JSON.stringify(query)};document.querySelector('#event-search').dispatchEvent(new Event('input'))`);
        assert.ok(await c.value(`document.querySelector('#events-grid').textContent.includes(${JSON.stringify(query)})`));
        await c.value("document.querySelector('#events-grid [data-details]').click()");
        assert.ok(await c.value("document.querySelector('#event-dialog').open"));
        await c.value("document.querySelector('#event-dialog').close();document.querySelector('#events-grid [data-add-event]').click()");
        assert.ok(await c.value("document.querySelector('#calendar-options-dialog').open"));
      }
    }
    console.log(`${lang}/${width}/${mode}: ${counts.cards} cards, official links, both themes, no overflow: OK`);
  } finally { await c.close(); }
}
