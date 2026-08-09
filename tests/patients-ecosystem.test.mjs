import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
const gitBlobSha=(p)=>{const b=fs.readFileSync(p);return crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')};

for(const p of [
  'patients/index.html','en/patients/index.html',
  'patients/cataract/index.html','en/patients/cataract/index.html',
  'patients/patients-ecosystem.css','patients/patients-ecosystem.js','patients/patients-hub.js'
]) assert.ok(exists(p),`missing ${p}`);

const ru=read('patients/index.html');
const en=read('en/patients/index.html');
const ruCat=read('patients/cataract/index.html');
const enCat=read('en/patients/cataract/index.html');
const css=read('patients/patients-ecosystem.css');
const ecosystemJs=read('patients/patients-ecosystem.js');
const hubJs=read('patients/patients-hub.js');
const iolJs=read('patients/iol-dislocation/script.js');
const sitemap=read('sitemap.xml');
const sitemapTxt=read('sitemap.txt');

for(const [html,lang] of [[ru,'ru'],[en,'en']]){
  assert.match(html,/patients\/cataract\//,`${lang}: cataract link missing`);
  assert.match(html,/patients\/iol-dislocation\//,`${lang}: IOL link missing`);
  assert.match(html,/DrShemMYu/,`${lang}: Telegram channel missing`);
  assert.match(html,/ShemMYu/,`${lang}: personal Telegram missing`);
  assert.match(html,/pd_widget_footerd1115864/,`${lang}: ProDoctorov widget missing`);
  assert.match(html,/patients-ecosystem\.css/,`${lang}: ecosystem css missing`);
  assert.match(html,/patients-ecosystem\.js/,`${lang}: ecosystem js missing`);
  assert.match(html,/patients-hub\.js/,`${lang}: hub js missing`);
  assert.doesNotMatch(html,/href="[^\"]*glaucoma\//,`${lang}: do not publish an invented glaucoma page`);
}

assert.match(ruCat,/rel="canonical" href="https:\/\/matveyshemyakin\.ru\/patients\/cataract\/"/);
assert.match(enCat,/rel="canonical" href="https:\/\/matveyshemyakin\.ru\/en\/patients\/cataract\/"/);
for(const html of [ruCat,enCat]){
  assert.match(html,/faq-data\.js/);
  assert.match(html,/faq-extra-data\.js/);
  assert.match(html,/patients\.js/);
  assert.match(html,/faq-search/);
  assert.match(html,/pd_widget_footerd1115864/);
}

assert.match(css,/\.condition-card \.visual-stage\{[^}]*left:50%[^}]*translateX\(-50%\)/s,'mobile condition visuals must be centered');
assert.match(css,/cataractCloud/);
assert.match(css,/iolShift/);
assert.match(css,/pressureRise/);

const darkPatients='html[data-site-theme="dark"][data-site-theme-family="patients"]';
assert.ok(css.includes(`${darkPatients} .faq-index-link`),'dark patient theme must override cataract FAQ link colors');
assert.match(css,new RegExp(`${darkPatients.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\.faq-index-link\\{[^}]*color:#edf4fb`),'dark cataract FAQ links must use high-contrast light text');
assert.match(css,new RegExp(`${darkPatients.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\.faq-index-head p[^}]*color:#c4d1df`),'dark cataract FAQ descriptions must use readable muted text');
assert.match(css,new RegExp(`${darkPatients.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\.hub-search-empty\\{[^}]*background:#0a2344[^}]*color:#c4d1df`),'dark search empty state must not use the light card palette');

assert.match(ecosystemJs,/typewriter/i);
assert.match(ecosystemJs,/prefers-reduced-motion/);
assert.match(ecosystemJs,/patients\/cataract/,'cataract FAQ schema must be corrected to the cataract URL');
assert.match(hubJs,/PATIENT_FAQ_DATA/);
assert.match(iolJs,/ShemMYu/,'IOL page must gain personal Telegram link without rewriting its medical HTML');
assert.match(iolJs,/pd_widget_footerd1115864/,'IOL page must render ProDoctorov widget');
assert.match(iolJs,/patients\/cataract/,'IOL page must cross-link into the patient ecosystem');

assert.match(sitemap,/https:\/\/matveyshemyakin\.ru\/patients\/cataract\//);
assert.match(sitemap,/https:\/\/matveyshemyakin\.ru\/en\/patients\/cataract\//);
assert.match(sitemapTxt,/https:\/\/matveyshemyakin\.ru\/patients\/cataract\//);
assert.match(sitemapTxt,/https:\/\/matveyshemyakin\.ru\/en\/patients\/cataract\//);

assert.equal(gitBlobSha('patients/faq-data.js'),'d76877cab3852f5b9fd24111f3ea89ec8bf6e3d2','RU approved FAQ data changed');
assert.equal(gitBlobSha('patients/faq-extra-data.js'),'3dcb2079f284cee5313c8275b15c5868c0612dc2','RU approved extra FAQ data changed');
assert.equal(gitBlobSha('en/patients/faq-data.js'),'6eb4684d8543feca81a08218adfc91cbb8bdaddd','EN approved FAQ data changed');
assert.equal(gitBlobSha('en/patients/faq-extra-data.js'),'cc68e984e620c6fef2f0ecae1327c2ba8c99fc06','EN approved extra FAQ data changed');
assert.equal(gitBlobSha('patients/iol-dislocation/index.html'),'605daf1980dcb533a027234212155c168401b43e','RU IOL medical page HTML changed');
assert.equal(gitBlobSha('en/patients/iol-dislocation/index.html'),'7bfdc66afb86ce31a71f78a1823731b971998594','EN IOL medical page HTML changed');

console.log('Patient ecosystem structural and preservation checks passed');
