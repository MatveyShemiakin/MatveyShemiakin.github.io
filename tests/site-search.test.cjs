const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const corePath='site-search-core.js';
assert.ok(fs.existsSync(corePath),'full-text search engine must exist');
const S=require('../site-search-core.js');
const pages=[
 {title:'Катаракта',page:'Пациентам',text:'Обследование перед операцией.',url:'/patients/cataract/',lang:'ru'},
 {title:'О враче',page:'Главная',text:'Хирургия катаракты и лечение глаукомы.',url:'/#about',lang:'ru'},
 {title:'Глазные капли',page:'Пациентам',text:'После операции применяют назначенные препараты. Интервал между каплями составляет несколько минут.',url:'/patients/eye-drops/#interval',lang:'ru'},
 {title:'Cataract surgery',page:'Patients',text:'Recovery and eye drops after surgery.',url:'/en/patients/cataract/',lang:'en'}
];
assert.equal(S.search(pages,'катаракта','ru')[0].url,'/patients/cataract/','title outranks body mentions');
assert.equal(S.search(pages,'интервал каплями','ru')[0].url,'/patients/eye-drops/#interval','body-only terms must find the actual section');
assert.equal(S.search(pages,'CATARACT','ru')[0].lang,'en','both languages are always searchable');
assert.equal(S.search(pages,'катаракты','ru')[0].url,'/patients/cataract/','Russian inflections');
assert.equal(S.normalize('Ёлка EYE'),'елка eye');
assert.equal(S.search(pages,'нетсовпадения','ru').length,0);
assert.equal(S.search(pages,'   ','ru').length,0);
assert.equal(S.search(pages,'капли взрыв','ru').length,0,'all query words required');
assert.equal(S.search([pages[0],{...pages[0]}],'катаракта','ru').length,1,'same destination should not be repeated');
assert.ok(S.snippet(pages[2].text,'интервал').toLowerCase().includes('интервал'));
assert.equal(S.search([{...pages[0],url:'javascript:alert(1)'}],'катаракта','ru').length,0,'unsafe result URLs rejected');
const index=JSON.parse(fs.readFileSync('site-search-index.json','utf8'));
assert.ok(S.search(index.records,'Федоровские чтения','ru').some(item=>item.url.startsWith('/for-doctors/events/')),'calendar content loaded from JSON is searchable');
assert.ok(S.search(index.records,'High-Risk Penetrating','ru').some(item=>item.url==='/#science'),'runtime science publications are searchable');
console.log('Full-text search behavior passed');
