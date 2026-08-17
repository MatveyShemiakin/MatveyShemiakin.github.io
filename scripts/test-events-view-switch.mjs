const pages = [
  ['ru', 'http://127.0.0.1:8000/for-doctors/events/'],
  ['en', 'http://127.0.0.1:8000/en/for-doctors/events/']
];

const cases = [
  { name: 'desktop', width: 1440, height: 1000, selector: '[data-view="deadlines"]', target: 'view-deadlines' },
  { name: 'mobile', width: 390, height: 844, selector: '[data-mobile-view="calendar"]', target: 'view-calendar' }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect(wsUrl) {
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
}

async function client(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  });
  return {
    send(method, params = {}) {
      const reqId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(reqId, { resolve, reject });
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    },
    close() { ws.close(); }
  };
}

let failures = [];

for (const [lang, url] of pages) {
  for (const testCase of cases) {
    const target = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then(r => r.json());
    const ws = await connect(target.webSocketDebuggerUrl);
    const cdp = await client(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: testCase.width,
      height: testCase.height,
      deviceScaleFactor: 1,
      mobile: testCase.name === 'mobile',
      screenWidth: testCase.width,
      screenHeight: testCase.height
    });
    await cdp.send('Page.navigate', { url });
    await sleep(6500);

    const before = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({ready:document.querySelector('#events-grid')?.children.length>0,scrollY:window.scrollY})`,
      returnByValue: true
    });
    const beforeData = JSON.parse(before.result.value);
    if (!beforeData.ready) failures.push(`${lang} ${testCase.name}: events did not render`);

    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(testCase.selector)})?.click()`
    });
    await sleep(1200);

    const after = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify((()=>{const panel=document.getElementById(${JSON.stringify(testCase.target)});const rect=panel?.getBoundingClientRect();return{active:panel?.classList.contains('active')||false,top:rect?Math.round(rect.top):null,scrollY:Math.round(window.scrollY),visible:rect?rect.top<window.innerHeight&&rect.bottom>0:false}})())`,
      returnByValue: true
    });
    const data = JSON.parse(after.result.value);
    console.log(lang, testCase.name, data);
    if (!data.active) failures.push(`${lang} ${testCase.name}: ${testCase.target} was not activated`);
    if (!data.visible || data.top === null || data.top > 180) failures.push(`${lang} ${testCase.name}: ${testCase.target} was activated but not brought into view (top=${data.top}, scrollY=${data.scrollY})`);

    cdp.close();
    await fetch(`http://127.0.0.1:9222/json/close/${target.id}`, { method: 'PUT' }).catch(() => {});
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Events view switching: OK');
