import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync('assets/events/events.js','utf8');
function formatter(lang){
 const window={addEventListener(){}};
 const source=script.replace('init();\n})();','window.formatDate=fdate;window.makePayload=payload;\n})();');
 assert.notEqual(source,script,'test loads the real date formatter without fetching');
 vm.runInNewContext(source,{window,document:{addEventListener(){},documentElement:{lang},body:{dataset:{}}},localStorage:{getItem(){return null}},Date});
 return window;
}
for(const timezone of ['America/Los_Angeles','Europe/Moscow'])test(`${timezone}: organiser dates and wall times do not change with visitor timezone`,()=>{
 const before=process.env.TZ;process.env.TZ=timezone;
 try{for(const lang of ['ru','en']){
  const api=formatter(lang),format=api.formatDate;const november=lang==='ru'?'ноября':'November';
  assert.equal(format('2026-11-01T23:59:00+01:00',true),`1 ${november} 2026, 23:59`);
  assert.equal(format('2026-11-01T23:59:00+01:00'),`1 ${november} 2026`);
  assert.match(format('2026-12-01T17:00:00-05:00',true),/^1 .*2026, 17:00$/);
  assert.match(format('2026-12-14'),/^14 .*2026$/);
  const p=api.makePayload({title:'ESCRS'}, {date:'2026-11-01T23:59:00+01:00',timeKnown:true,label:'Abstract',kind:'abstract',url:'https://wintermeeting.escrs.org/'});
  assert.equal(p.start.toISOString(),'2026-11-01T22:59:00.000Z');assert.equal(p.allDay,false);
 }}finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before}
});
