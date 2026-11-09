import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};
vm.runInNewContext(fs.readFileSync('assets/events/globe.js','utf8'),{window});
const {project,group}=window.EventsGlobe;
test('sphere projection places selected centre in front and antipode behind',()=>{
 const a=project(20,30,20,30);assert.ok(Math.abs(a.x)<1e-6&&Math.abs(a.y)<1e-6&&a.z>.99);
 assert.ok(project(-20,-150,20,30).z<0);
});
test('all catalogued cities resolve to coordinates without losing events',()=>{
 for(const lang of ['ru','en']){const events=JSON.parse(fs.readFileSync(`assets/data/ophthalmology-events.${lang}.json`)).events;
 const groups=group(events);assert.equal(groups.reduce((n,g)=>n+g.events.length,0),events.filter(e=>!['Online','Онлайн'].includes(e.mode)).length);
 assert.ok(groups.every(g=>Number.isFinite(g.lat)&&Number.isFinite(g.lon)));}
});
test('grouping merges multiple events in one city and accepts empty results',()=>{
 const events=JSON.parse(fs.readFileSync('assets/data/ophthalmology-events.en.json')).events.filter(e=>e.city==='Moscow');
 assert.equal(group(events).length,1);assert.equal(group([]).length,0);
});
test('online events never acquire a misleading physical city marker',()=>{
 assert.equal(group([{id:'fedorov-2026',mode:'Online',city:'Online',country:'Worldwide'}]).length,0);
 assert.equal(group([{id:'fedorov-2026',mode:'Онлайн',city:'Онлайн',country:'Весь мир'}]).length,0);
});
test('new and renamed meetings use catalogue coordinates without an ID-specific code change',()=>{
 const es=[{id:'new-meeting',city:'Budapest',country:'Hungary',mode:'In person',coordinates:[47.5,19.04]}];
 const result=group(es);assert.equal(result.length,1);assert.equal(result[0].lat,47.5);assert.equal(result[0].events[0].id,'new-meeting');
});
test('new meetings share the existing Amman and Melbourne city markers',()=>{
 for(const lang of ['ru','en']){
  const events=JSON.parse(fs.readFileSync(`assets/data/ophthalmology-events.${lang}.json`)).events;
  for(const ids of [['joscrs-2026','amman-retina-2027','yoms-2026'],['anzgs-2027','vision-2027']]){
   const cities=group(events.filter(e=>ids.includes(e.id)));
   assert.equal(cities.length,1,`${lang}: ${ids.join(', ')} must share one city marker`);
   assert.equal(cities[0].events.length,ids.length,'all meetings remain selectable');
  }
 }
});
