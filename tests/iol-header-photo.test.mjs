import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const imagePath='assets/iol-dislocation-header.webp';
const cssPath='patients/iol-dislocation/header-photo.css';
const ruPath='patients/iol-dislocation/index.html';
const enPath='en/patients/iol-dislocation/index.html';

assert.ok(fs.existsSync(imagePath),'the approved clinical photograph must exist');
const image=fs.readFileSync(imagePath);
const digest=crypto.createHash('sha256').update(image).digest('hex');
assert.equal(
  digest,
  '206a48ac12500a267206dbd57a235d58c949ef23da5836d4f4c0f087fc858557',
  'the committed web asset must match the approved source-photo export',
);

assert.ok(fs.existsSync(cssPath),'the isolated IOL header photograph stylesheet must exist');
const css=fs.readFileSync(cssPath,'utf8');
const ruHtml=fs.readFileSync(ruPath,'utf8');
const enHtml=fs.readFileSync(enPath,'utf8');
const stylesheetReference='/patients/iol-dislocation/header-photo.css?v=20260806-3';
const themeInit='/site-theme-init.js?v=20260806-1';

assert.match(css,/\.sim-page \.site-head::before/,'the photograph must be added as a CSS background layer');
assert.match(css,/\.sim-page \.site-head::after/,'the blue readability overlay must be a separate CSS layer');
assert.match(css,/url\(["']?\/assets\/iol-dislocation-header\.webp\?v=20260806-1["']?\)/,'the stylesheet must reference the approved source photograph');
assert.match(css,/@media\s*\(\s*max-width\s*:\s*1020px\s*\)/,'the stylesheet must define tablet positioning');
assert.match(css,/@media\s*\(\s*max-width\s*:\s*680px\s*\)/,'the stylesheet must define mobile positioning');

assert.match(
  css,
  /background:\s*url\("\/assets\/iol-dislocation-header\.webp\?v=20260806-1"\)\s+96%\s+4%\s*\/\s*auto\s+165%\s+no-repeat;/,
  'desktop framing must move the photograph lower and reveal more of the cornea',
);
assert.match(css,/background-position:\s*95%\s+5%;[\s\S]*?background-size:\s*auto\s+155%;/,'tablet framing must reveal more of the cornea');
assert.match(css,/right:\s*-3%;[\s\S]*?width:\s*106%;[\s\S]*?opacity:\s*\.85;[\s\S]*?background-position:\s*76%\s+4%;[\s\S]*?background-size:\s*auto\s+145%;/,'mobile framing must visibly show the photograph without moving header content');
assert.match(css,/rgba\(4, 18, 37, \.10\) 100%/,'mobile overlay must remain transparent enough on the right');

assert.match(css,/\.sim-page \.iol-image-button::after/,'the in-page IOL figures must keep the watermark overlay');
assert.match(css,/(^|\n)\.iol-lightbox__frame::after\s*\{/,'the enlarged image must receive an unscoped watermark overlay');
assert.match(css,/(^|\n)\.iol-lightbox__frame::before\s*\{/,'the enlarged image must mask the legacy lower watermark');
assert.doesNotMatch(css,/\.sim-page \.iol-lightbox__frame::(?:before|after)/,'the lightbox lives outside .sim-page and must not use a descendant selector');
assert.match(css,/MATVEYSHEMYAKIN\.RU/,'the repeated watermark text must remain present');

for(const [label,html] of [['Russian',ruHtml],['English',enHtml]]){
  assert.equal((html.match(new RegExp(stylesheetReference.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1,`${label} page must load the stylesheet exactly once`);
  assert.doesNotMatch(html,/header-photo\.css\?v=20260806-[12]/,`${label} page must not keep a stale stylesheet URL`);
  assert.ok(html.indexOf(stylesheetReference)<html.indexOf(themeInit),`${label} page must preserve the shared theme asset order`);
  assert.match(html,/<header class="site-head">/,'the existing header element must remain present');
  assert.match(html,/<div class="container hero">/,'the existing hero container must remain present');
  assert.doesNotMatch(html,/<img[^>]+iol-dislocation-header/,'the photograph must not be inserted as new header markup');
  assert.match(html,/<\/div>(?:<script[^>]*><\/script>)+<dialog class="iol-lightbox"|<dialog class="iol-lightbox"/,'the IOL lightbox must remain mounted outside the page wrapper even when multiple shared scripts precede it');
}

console.log('IOL header photograph, mobile visibility and enlarged-image watermark verified for RU and EN pages.');
