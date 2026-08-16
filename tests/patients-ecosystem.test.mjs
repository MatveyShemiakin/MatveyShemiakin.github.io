import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
const gitBlobSha=(p)=>{const b=fs.readFileSync(p);return crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')};

for(const p of [
  'patients/index.html','en/patients/index.html',
  'patients/cataract/index.html','en/patients/cataract/index.html',
  'patients/glaucoma/index.html','en/patients/glaucoma/index.html','patients/glaucoma/script.js',
  'patients/patients-ecosystem.css','patients/patients-ecosystem.js','patients/patients-hub.js'
]) assert.ok(exists(p),`missing ${p}`);

const ru=read('patients/index.html');
const en=read('en/patients/index.html');
const ruCat=read('patients/cataract/index.html');
const enCat=read('en/patients/cataract/index.html');
const ruGlaucoma=read('patients/glaucoma/index.html');
const enGlaucoma=read('en/patients/glaucoma/index.html');
const css=read('patients/patients-ecosystem.css');
const ecosystemJs=read('patients/patients-ecosystem.js');
const hubJs=read('patients/patients-hub.js');
const iolJs=read('patients/iol-dislocation/script.js');
const glaucomaJs=read('patients/glaucoma/script.js');
const sitemap=read('sitemap.xml');
const sitemapTxt=read('sitemap.txt');

for(const [html,lang] of [[ru,'ru'],[en,'en']]){
  assert.match(html,/patients\/cataract\//,`${lang}: cataract link missing`);
  assert.match(html,/patients\/iol-dislocation\//,`${lang}: IOL link missing`);
  assert.match(html,/patients\/glaucoma\//,`${lang}: glaucoma link missing`);
  assert.match(html,/DrShemMYu/,`${lang}: Telegram channel missing`);
  assert.match(html,/ShemMYu/,`${lang}: personal Telegram missing`);
  assert.match(html,/patients-ecosystem\.css/,`${lang}: ecosystem css missing`);
  assert.match(html,/patients-ecosystem\.js/,`${lang}: ecosystem js missing`);
  assert.match(html,/patients-hub\.js/,`${lang}: hub js missing`);
}

assert.match(ruCat,/rel="canonical" href="https:\/\/matveyshemyakin\.ru\/patients\/cataract\/"/);
assert.match(enCat,/rel="canonical" href="https:\/\/matveyshemyakin\.ru\/en\/patients\/cataract\/"/);
for(const html of [ruCat,enCat]){
  assert.match(html,/faq-data\.js/);
  assert.match(html,/faq-extra-data\.js/);
  assert.match(html,/patients\.js/);
  assert.match(html,/faq-search/);
}

assert.match(ruGlaucoma,/rel="canonical" href="https:\/\/matveyshemyakin\.ru\/patients\/glaucoma\/"/);
assert.match(enGlaucoma,/rel="canonical" href="https:\/\/matveyshemyakin\.ru\/en\/patients\/glaucoma\/"/);
for(const [html,lang] of [[ruGlaucoma,'ru'],[enGlaucoma,'en']]){
  assert.match(html,/patients\/iol-dislocation\/styles\.css/,`${lang}: glaucoma page must reuse approved patient article styles`);
  assert.match(html,/patients\/glaucoma\/script\.js/,`${lang}: glaucoma interaction script missing`);
  assert.equal((html.match(/data-tab="/g)||[]).length,4,`${lang}: glaucoma must have four topic tabs`);
  assert.equal((html.match(/data-panel="/g)||[]).length,4,`${lang}: glaucoma must have four topic panels`);
  assert.match(html,/urgent-faq/,`${lang}: urgent glaucoma FAQ missing`);
  assert.match(html,/class="disclaimer"/,`${lang}: glaucoma disclaimer missing`);
  assert.match(html,/site-theme\.css/,`${lang}: glaucoma theme support missing`);
  assert.match(html,/mobile-nav\.css/,`${lang}: glaucoma mobile navigation missing`);
  assert.doesNotMatch(html,/\sstyle="/,`${lang}: glaucoma page must not use inline styles`);
}
assert.match(glaucomaJs,/window\.innerWidth<=680/,'glaucoma mobile breakpoint missing');
assert.match(glaucomaJs,/window\.innerWidth<=1020/,'glaucoma tablet breakpoint missing');
assert.match(glaucomaJs,/site_theme_v1/,'glaucoma theme persistence missing');

assert.match(css,/\.condition-card \.visual-stage\{[^}]*left:50%[^}]*translateX\(-50%\)/s,'mobile condition visuals must be centered');
assert.match(css,/cataractCloud/);
assert.match(css,/iolShift/);
assert.match(css,/pressureRise/);
assert.match(css,/\.author-section \.pd-slot\{display:none!important\}/,'lower patient author ProDoctorov slot must stay hidden in every viewport');
assert.match(css,/\.author-panel\.has-widget\{grid-template-columns:330px 1fr\}/,'author block must collapse back to two columns when the lower widget is disabled');

const darkPatients='html[data-site-theme="dark"][data-site-theme-family="patients"]';
const escapedDarkPatients=darkPatients.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
assert.ok(css.includes(`${darkPatients} .faq-index-link`),'dark patient theme must override cataract FAQ link colors');
assert.match(css,new RegExp(`${escapedDarkPatients} \\.faq-index-link\\{[^}]*color:#edf4fb`),'dark cataract FAQ links must use high-contrast light text');
assert.match(css,new RegExp(`${escapedDarkPatients} \\.faq-index-head p[^}]*color:#c4d1df`),'dark cataract FAQ descriptions must use readable muted text');
assert.match(css,new RegExp(`${escapedDarkPatients} \\.hub-search-empty\\{[^}]*background:#0a2344[^}]*color:#c4d1df`),'dark search empty state must not use the light card palette');
assert.match(css,new RegExp(`${escapedDarkPatients} \\.search-guidance\\{[^}]*color:#b8c6d8`),'dark cataract search guidance must remain readable');
assert.match(css,new RegExp(`${escapedDarkPatients} \\.search-status\\{[^}]*color:#b8c6d8`),'dark cataract result count must remain readable');

assert.match(ecosystemJs,/typewriter/i);
assert.match(ecosystemJs,/prefers-reduced-motion/);
assert.match(ecosystemJs,/author-section \.pd-slot/,'patient ecosystem runtime must remove the lower ProDoctorov slot');
assert.match(ecosystemJs,/patients\/cataract/,'cataract FAQ schema must be corrected to the cataract URL');
assert.match(hubJs,/PATIENT_FAQ_DATA/);
assert.match(hubJs,/patients\/glaucoma/,'patient hub search must link to the published glaucoma guide');
assert.match(iolJs,/ShemMYu/,'IOL page must gain personal Telegram link without rewriting its medical HTML');
assert.doesNotMatch(iolJs,/iol-prodoctorov|pd_widget_footerd1115864/,'IOL author block must not inject a ProDoctorov widget');
assert.match(iolJs,/patients\/cataract/,'IOL page must cross-link into the patient ecosystem');

assert.match(sitemap,/https:\/\/matveyshemyakin\.ru\/patients\/cataract\//);
assert.match(sitemap,/https:\/\/matveyshemyakin\.ru\/en\/patients\/cataract\//);
assert.match(sitemap,/https:\/\/matveyshemyakin\.ru\/patients\/glaucoma\//);
assert.match(sitemap,/https:\/\/matveyshemyakin\.ru\/en\/patients\/glaucoma\//);
assert.match(sitemapTxt,/https:\/\/matveyshemyakin\.ru\/patients\/cataract\//);
assert.match(sitemapTxt,/https:\/\/matveyshemyakin\.ru\/en\/patients\/cataract\//);
assert.match(sitemapTxt,/https:\/\/matveyshemyakin\.ru\/patients\/glaucoma\//);
assert.match(sitemapTxt,/https:\/\/matveyshemyakin\.ru\/en\/patients\/glaucoma\//);

assert.equal(gitBlobSha('patients/faq-data.js'),'d76877cab3852f5b9fd24111f3ea89ec8bf6e3d2','RU approved FAQ data changed');
assert.equal(gitBlobSha('patients/faq-extra-data.js'),'3dcb2079f284cee5313c8275b15c5868c0612dc2','RU approved extra FAQ data changed');
assert.equal(gitBlobSha('en/patients/faq-data.js'),'6eb4684d8543feca81a08218adfc91cbb8bdaddd','EN approved FAQ data changed');
assert.equal(gitBlobSha('en/patients/faq-extra-data.js'),'cc68e984e620c6fef2f0ecae1327c2ba8c99fc06','EN approved extra FAQ data changed');
assert.equal(gitBlobSha('patients/iol-dislocation/index.html'),'605daf1980dcb533a027234212155c168401b43e','RU IOL medical page HTML changed');
assert.equal(gitBlobSha('en/patients/iol-dislocation/index.html'),'7bfdc66afb86ce31a71f78a1823731b971998594','EN IOL medical page HTML changed');

console.log('Patient ecosystem structural and preservation checks passed');
