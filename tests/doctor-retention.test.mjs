import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const path='for-doctors/doctor-retention.js';
const load=()=>fs.existsSync(path)?require('../'+path):null;

const memoryStorage=(seed={})=>{
  const data=new Map(Object.entries(seed));
  return {
    getItem(key){return data.has(key)?data.get(key):null;},
    setItem(key,value){data.set(key,String(value));},
    removeItem(key){data.delete(key);},
  };
};

test('retention module owns separate clinician storage namespaces',()=>{
  const retention=load();
  assert.ok(retention,'for-doctors/doctor-retention.js is missing');
  assert.equal(retention.TOPICS_KEY,'doctor_topics_v1');
  assert.equal(retention.BOOKMARKS_KEY,'doctor_bookmarks_v1');
  assert.equal(retention.CONTINUE_KEY,'doctor_continue_v1');
  assert.equal(retention.LAST_VISIT_KEY,'doctor_last_visit_v1');
});

test('topic preferences normalize, deduplicate and toggle',()=>{
  const retention=load();
  assert.ok(retention);
  assert.deepEqual(retention.normalizeTopics(['cornea','retina','cornea','BAD topic']),['cornea','retina']);
  assert.deepEqual(retention.toggleTopic(['cornea'],'retina'),['cornea','retina']);
  assert.deepEqual(retention.toggleTopic(['cornea','retina'],'cornea'),['retina']);
});

test('json storage helpers are safe for malformed or blocked localStorage',()=>{
  const retention=load();
  assert.ok(retention);
  const malformed={getItem(){return '{bad';},setItem(){throw new Error('blocked');}};
  assert.deepEqual(retention.readJson(malformed,'x',[]),[]);
  assert.equal(retention.writeJson(malformed,'x',{ok:true}),false);
  const storage=memoryStorage();
  assert.equal(retention.writeJson(storage,'x',{ok:true}),true);
  assert.deepEqual(retention.readJson(storage,'x',{}),{ok:true});
});

test('newSinceVisit counts revisions newer than the prior visit and filters by topics',()=>{
  const retention=load();
  assert.ok(retention);
  const items=[
    {id:'a',updated:'2026-08-25',topics:['cornea']},
    {id:'b',updated:'2026-08-24',topics:['retina']},
    {id:'c',updated:'2026-08-23',topics:['cornea']},
  ];
  assert.deepEqual(retention.newSinceVisit(items,'2026-08-24T10:00:00Z',[]).map(x=>x.id),['a']);
  assert.deepEqual(retention.newSinceVisit(items,'2026-08-22T10:00:00Z',['cornea']).map(x=>x.id),['a','c']);
});

test('bookmarks upsert by URL and remove cleanly',()=>{
  const retention=load();
  assert.ok(retention);
  const first=retention.upsertBookmark([], {url:'/for-doctors/a/',title:'A',topics:['cornea'],saved_at:'2026-08-25T00:00:00Z'});
  const second=retention.upsertBookmark(first, {url:'/for-doctors/a/',title:'A2',topics:['cornea'],saved_at:'2026-08-25T01:00:00Z'});
  assert.equal(second.length,1);
  assert.equal(second[0].title,'A2');
  assert.deepEqual(retention.removeBookmark(second,'/for-doctors/a/'),[]);
});

test('reading progress is clamped, recent-first and limited',()=>{
  const retention=load();
  assert.ok(retention);
  let items=[];
  items=retention.upsertProgress(items,{url:'/for-doctors/a/',title:'A',heading:'H1',ratio:1.4,updated_at:'2026-08-25T00:00:00Z'});
  items=retention.upsertProgress(items,{url:'/for-doctors/b/',title:'B',heading:'H2',ratio:-1,updated_at:'2026-08-25T01:00:00Z'});
  assert.deepEqual(items.map(x=>x.url),['/for-doctors/b/','/for-doctors/a/']);
  assert.equal(items[0].ratio,0);
  assert.equal(items[1].ratio,1);
});

test('relatedItems prefers shared professional topics and excludes current item',()=>{
  const retention=load();
  assert.ok(retention);
  const items=[
    {id:'current',topics:['cornea','research'],updated:'2026-08-25'},
    {id:'strong',topics:['cornea','research'],updated:'2026-08-20'},
    {id:'weak',topics:['cornea'],updated:'2026-08-24'},
    {id:'other',topics:['retina'],updated:'2026-08-25'},
  ];
  assert.deepEqual(retention.relatedItems(items,'current',['cornea','research'],3).map(x=>x.id),['strong','weak','other']);
});

test('analytics goal helper respects existing consent gate',()=>{
  const retention=load();
  assert.ok(retention);
  const calls=[];
  const root={localStorage:memoryStorage({'site_cookie_choice':'analytics'}),ym(...args){calls.push(args);}};
  assert.equal(retention.sendGoal(root,'doctor_topic_follow'),true);
  assert.equal(calls.length,1);
  const blocked={localStorage:memoryStorage({'site_cookie_choice':'necessary'}),ym(...args){calls.push(args);}};
  assert.equal(retention.sendGoal(blocked,'doctor_topic_follow'),false);
  assert.equal(calls.length,1);
});
