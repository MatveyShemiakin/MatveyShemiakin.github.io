import fs from 'node:fs/promises';

const pages = [
  ['ru', 'http://127.0.0.1:8000/for-doctors/events/'],
  ['en', 'http://127.0.0.1:8000/en/for-doctors/events/']
];
const widths = [360, 390, 412];
let failures = [];

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function connect(wsUrl){
  return await new Promise((resolve,reject)=>{
    const ws = new WebSocket(wsUrl);
    ws.addEventListener('open',()=>resolve(ws),{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
}

async function makeClient(ws){
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message',ev=>{
    const msg = JSON.parse(ev.data);
    if(msg.id && pending.has(msg.id)){
      const {resolve,reject} = pending.get(msg.id);
      pending.delete(msg.id);
      if(msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  return {
    send(method,params={}){
      const reqId = ++id;
      return new Promise((resolve,reject)=>{
        pending.set(reqId,{resolve,reject});
        ws.send(JSON.stringify({id:reqId,method,params}));
      });
    },
    close(){ ws.close(); }
  };
}

for(const [lang,url] of pages){
  for(const width of widths){
    const target = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`,{method:'PUT'}).then(r=>r.json());
    const ws = await connect(target.webSocketDebuggerUrl);
    const cdp = await makeClient(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{
      width,
      height:1200,
      deviceScaleFactor:1,
      mobile:true,
      screenWidth:width,
      screenHeight:1200
    });
    await cdp.send('Page.navigate',{url});
    await sleep(7000);
    const result = await cdp.send('Runtime.evaluate',{
      expression:`JSON.stringify({innerWidth:window.innerWidth,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,title:document.title,text:document.body.innerText.slice(0,200),bad:[...document.querySelectorAll('body *')].filter(el=>{const s=getComputedStyle(el);if(s.position==='fixed')return false;const r=el.getBoundingClientRect();return r.right>window.innerWidth+2||r.left<-2}).slice(0,12).map(el=>({tag:el.tagName,cls:el.className?.toString?.().slice(0,80)||'',text:(el.textContent||'').trim().slice(0,90),rect:[Math.round(el.getBoundingClientRect().left),Math.round(el.getBoundingClientRect().right)]}))})`,
      returnByValue:true
    });
    const metrics = JSON.parse(result.result.value);
    console.log(lang,width,metrics);
    if(!metrics.title || !metrics.text) failures.push(`${lang} ${width}: page content did not load`);
    if(metrics.docWidth > metrics.innerWidth + 1 || metrics.bodyWidth > metrics.innerWidth + 1){
      failures.push(`${lang} ${width}: horizontal overflow inner=${metrics.innerWidth} doc=${metrics.docWidth} body=${metrics.bodyWidth}`);
    }
    const shot = await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    await fs.writeFile(`cdp-mobile/${lang}-${width}.png`,Buffer.from(shot.data,'base64'));
    cdp.close();
    await fetch(`http://127.0.0.1:9222/json/close/${target.id}`,{method:'PUT'}).catch(()=>{});
  }
}

if(failures.length){
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Mobile overflow assertions: OK');
