import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const updates=require('../patients/patients-updates.js');

test('normalizes valid patient updates, removes duplicates, and sorts newest first',()=>{
  const value=[
    {id:'cataract',published:'2026-07-20',title:'Катаракта',description:'Материал',url:'/patients/cataract/'},
    {id:'iol',published:'2026-08-05',title:'Дислокация ИОЛ',description:'Материал',url:'/patients/iol-dislocation/'},
    {id:'iol',published:'2026-08-01',title:'Дубликат',description:'Материал',url:'/patients/iol-dislocation/'},
    {id:'bad',published:'05.08.2026',title:'Bad',description:'Bad',url:'https://example.com/'},
  ];
  assert.deepEqual(updates.normalizeUpdates(value).map(x=>x.id),['iol','cataract']);
});

test('computes unread ids and marks one or all as read',()=>{
  const items=[{id:'a'},{id:'b'}];
  const seen=new Set(['a']);
  assert.deepEqual(updates.unreadIds(items,seen),['b']);
  assert.deepEqual([...updates.withReadId(seen,'b')].sort(),['a','b']);
  assert.deepEqual([...updates.withAllRead(items,new Set())].sort(),['a','b']);
});

test('read state survives malformed or unavailable storage safely',()=>{
  const malformed={getItem(){return '{bad json';},setItem(){throw new Error('blocked');}};
  assert.deepEqual([...updates.readSeen(malformed)],[]);
  assert.equal(updates.writeSeen(malformed,new Set(['a'])),false);
});

test('sends only the goal id after analytics consent',()=>{
  const calls=[];
  const root={
    localStorage:{getItem(key){return key==='site_cookie_choice'?'analytics':null;}},
    ym(...args){calls.push(args);}
  };
  assert.equal(updates.sendGoal(root,'updates_open'),true);
  assert.deepEqual(calls,[[111504350,'reachGoal','updates_open']]);
  assert.equal(calls[0].length,3);
});

test('does not send goals without analytics consent',()=>{
  const calls=[];
  const root={localStorage:{getItem(){return 'necessary';}},ym(...args){calls.push(args);}};
  assert.equal(updates.sendGoal(root,'update_click'),false);
  assert.deepEqual(calls,[]);
});
