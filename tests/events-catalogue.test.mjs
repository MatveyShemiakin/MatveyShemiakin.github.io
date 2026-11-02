import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=l=>JSON.parse(fs.readFileSync(`assets/data/ophthalmology-events.${l}.json`));
const ru=read('ru'),en=read('en');
test('RU and EN publish identical event facts and deadline instants',()=>{
 assert.deepEqual(ru.events.map(e=>e.id),en.events.map(e=>e.id));
 for(let i=0;i<en.events.length;i++)for(const k of ['start','end','official','dateSource','coordinates','submissionOpen'])assert.deepEqual(ru.events[i][k],en.events[i][k],`${en.events[i].id}: ${k}`);
 for(let i=0;i<en.events.length;i++)assert.deepEqual(ru.events[i].deadlines.map(d=>[d.date,d.kind,d.url,d.timeKnown,d.zone]),en.events[i].deadlines.map(d=>[d.date,d.kind,d.url,d.timeKnown,d.zone]));
});
test('every region and specialty is selectable in its locale',()=>{
 for(const [lang,data]of [['ru',ru],['en',en]]){
  const html=fs.readFileSync(`${lang==='en'?'en/':''}for-doctors/events/index.html`,'utf8');
  const regions=new Set([...html.matchAll(/data-region="([^"]+)"/g)].map(x=>x[1]));
  const specialties=new Set([...html.matchAll(/data-specialty="([^"]+)"/g)].map(x=>x[1]));
  for(const e of data.events){assert.ok(regions.has(e.region),`${lang}: region ${e.region}`);for(const c of e.categories)assert.ok(specialties.has(c),`${lang}: specialty ${c}`)}
 }
});
test('every event has a date source; physical city coordinates and confirmed dates are valid',()=>{
 for(const e of en.events){assert.match(e.dateSource,/^https:\/\//);assert.ok(e.start<=e.end);assert.doesNotMatch(e.description,/provisional listing/i);if(e.mode!=='Online'){assert.equal(e.coordinates.length,2,e.id);assert.ok(Math.abs(e.coordinates[0])<=90);assert.ok(Math.abs(e.coordinates[1])<=180)}}
});
test('duplicate Russian congresses and unsupported deadlines are consolidated',()=>{
 for(const id of ['vitreoretinal-russia-2027','ophthalmology-360-2027','cataract-russia-2027'])assert.ok(!en.events.some(e=>e.id===id));
 const jos=en.events.find(e=>e.id==='jos-131-2027');assert.equal(jos.deadlines[0].date,'2026-11-05T13:00:00+09:00');
 assert.deepEqual(en.events.find(e=>e.id==='aao-2027').deadlines,[]);
 assert.ok(!en.events.find(e=>e.id==='apao-2027').deadlines.some(d=>d.kind==='faculty'));
});
test('every deadline keeps a dedicated official monitor with date-specific context',()=>{
 const registry=JSON.parse(fs.readFileSync('assets/data/ophthalmology-event-sources.json')).sources;
 for(const e of en.events)for(const d of e.deadlines){
  const monitors=registry.filter(s=>s.url===d.url&&s.eventIds.includes(e.id));
  assert.ok(monitors.length,`${e.id}: unmonitored ${d.url}`);
  assert.ok(monitors.some(s=>s.watchTerms.some(t=>/\d/.test(t)&&!/^20\d{2}$/.test(t))),`${e.id}: no specific date context`);
 }
});
