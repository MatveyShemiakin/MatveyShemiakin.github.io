import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const path='for-doctors/doctors-updates.js';
const load=()=>fs.existsSync(path)?require('../'+path):null;

test('clinician updates module exists with its own storage namespace',()=>{
  const updates=load();
  assert.ok(updates,'for-doctors/doctors-updates.js is missing');
  assert.equal(updates.STORAGE_KEY,'doctor_updates_read_v1');
  assert.notEqual(updates.STORAGE_KEY,'patient_updates_read_v1');
});

test('normalizes and sorts clinician events by latest event date',()=>{
  const updates=load();
  assert.ok(updates,'for-doctors/doctors-updates.js is missing');
  const value=[
    {id:'old',event_id:'old:1',published:'2026-07-20',updated:'2026-07-20',revision:1,kind:'new',title:'Старый',title_en:'Old',description:'RU',description_en:'EN',url:'/for-doctors/old/',url_en:'/en/for-doctors/old/'},
    {id:'newer',event_id:'newer:2',published:'2026-07-01',updated:'2026-08-16',revision:2,kind:'updated',title:'Новый',title_en:'Newer',description:'RU2',description_en:'EN2',url:'/for-doctors/newer/',url_en:'/en/for-doctors/newer/'},
    {id:'bad',event_id:'bad:1',published:'bad',updated:'2026-08-16',revision:1,kind:'new',title:'Bad',url:'https://example.com/'},
  ];
  assert.deepEqual(updates.normalizeUpdates(value).map(item=>item.id),['newer','old']);
});

test('revision changes unread identity for an already read material',()=>{
  const updates=load();
  assert.ok(updates,'for-doctors/doctors-updates.js is missing');
  const v1={id:'pkp',event_id:'pkp:1',revision:1};
  const v2={id:'pkp',event_id:'pkp:2',revision:2};
  const seen=new Set([updates.eventKey(v1)]);
  assert.equal(updates.eventKey(v1),'pkp:1');
  assert.equal(updates.eventKey(v2),'pkp:2');
  assert.deepEqual(updates.unreadEventIds([v1,v2],seen),['pkp:2']);
});

test('selects RU or EN title description and url from one bilingual event',()=>{
  const updates=load();
  assert.ok(updates,'for-doctors/doctors-updates.js is missing');
  const item={title:'Бактериальный кератит',title_en:'Bacterial keratitis',description:'Описание',description_en:'Description',url:'/for-doctors/bacterial-keratitis/',url_en:'/en/for-doctors/bacterial-keratitis/'};
  assert.deepEqual(updates.localizeItem(item,'ru'),{title:'Бактериальный кератит',description:'Описание',url:'/for-doctors/bacterial-keratitis/'});
  assert.deepEqual(updates.localizeItem(item,'en'),{title:'Bacterial keratitis',description:'Description',url:'/en/for-doctors/bacterial-keratitis/'});
});

test('marks one or all event revisions as read',()=>{
  const updates=load();
  assert.ok(updates,'for-doctors/doctors-updates.js is missing');
  const items=[{id:'a',event_id:'a:1'},{id:'b',event_id:'b:3'}];
  const seen=new Set(['a:1']);
  assert.deepEqual(updates.unreadEventIds(items,seen),['b:3']);
  assert.deepEqual([...updates.withReadEvent(seen,items[1])].sort(),['a:1','b:3']);
  assert.deepEqual([...updates.withAllRead(items,new Set())].sort(),['a:1','b:3']);
});

test('read state survives malformed or blocked storage safely',()=>{
  const updates=load();
  assert.ok(updates,'for-doctors/doctors-updates.js is missing');
  const malformed={getItem(){return '{bad json';},setItem(){throw new Error('blocked');}};
  assert.deepEqual([...updates.readSeen(malformed)],[]);
  assert.equal(updates.writeSeen(malformed,new Set(['pkp:2'])),false);
});
