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
const stylesheetReference='/patients/iol-dislocation/header-photo.css?v=20260806-1';

assert.equal((ruHtml.match(new RegExp(stylesheetReference.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1,'the Russian page must load the stylesheet exactly once');
assert.equal((enHtml.match(new RegExp(stylesheetReference.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1,'the English page must load the stylesheet exactly once');

assert.match(css,/\.sim-page \.site-head::before/,'the photograph must be added as a CSS background layer');
assert.match(css,/\.sim-page \.site-head::after/,'the blue readability overlay must be a separate CSS layer');
assert.match(css,/url\(["']?\/assets\/iol-dislocation-header\.webp\?v=20260806-1["']?\)/,'the stylesheet must reference the approved source photograph');
assert.match(css,/@media \(max-width:1020px\)/,'the stylesheet must define tablet positioning');
assert.match(css,/@media \(max-width:680px\)/,'the stylesheet must define mobile positioning');

for(const html of [ruHtml,enHtml]){
  assert.match(html,/<header class="site-head">/,'the existing header element must remain present');
  assert.match(html,/<div class="container hero">/,'the existing hero container must remain present');
  assert.doesNotMatch(html,/<img[^>]+iol-dislocation-header/,'the photograph must not be inserted as new header markup');
}

console.log('IOL header photograph verified for RU and EN pages.');
