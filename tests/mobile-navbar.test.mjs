import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('mobile-nav.css','utf8');
const js=fs.readFileSync('mobile-nav.js','utf8');
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
const pagePath=url=>url.pathname==='/'?'index.html':url.pathname.endsWith('/')?url.pathname.slice(1)+'index.html':url.pathname.slice(1);

assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/\.site-mobile-nav\{[^}]*position:fixed/);
assert.match(css,/\.site-mobile-nav__icon\{width:29px;height:29px/);
assert.match(css,/\.patient-fab\{bottom:calc\(var\(--fab-bottom-offset,20px\) \+ 96px/);
assert.match(css,/\.cookie-banner\{bottom:calc\(104px/);

assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.patient-fab\{pointer-events:none!important\}/);
assert.match(css,/\.patient-fab__main,\.patient-fab\.is-open \.patient-fab__menu,\.patient-fab\.is-open \.patient-fab__action\{pointer-events:auto!important\}/);
assert.match(js,/const path=cleanPath\?cleanPath\+'\/'\:'\/'/);
assert.match(js,/patients:'\/patients\/'/);
assert.match(js,/doctors:'\/for-doctors\/'/);
assert.match(js,/about:'\/#about'/);
assert.match(js,/patients:'\/en\/patients\/'/);
assert.match(js,/doctors:'\/en\/for-doctors\/'/);
assert.doesNotMatch(js,/MutationObserver\(syncTheme\)/);
assert.doesNotMatch(js,/querySelectorAll\('\.sim-page,\[data-theme\]'\)/);
assert.match(js,/if\(nav\.dataset\.theme!==theme\)nav\.dataset\.theme=theme/);
assert.match(js,/if\(search\.dataset\.theme!==theme\)search\.dataset\.theme=theme/);
assert.match(js,/site-mobile-search/);
assert.doesNotMatch(css,/backdrop-filter:/);
assert.doesNotMatch(js,/render\(''\);/);
assert.doesNotMatch(js,/style=/);

for(const url of urls){
  const file=pagePath(url);
  assert.ok(fs.existsSync(file),`Missing sitemap page ${file}`);
  const html=fs.readFileSync(file,'utf8');
  assert.equal((html.match(/\/mobile-nav\.css\?v=20260806-3/g)||[]).length,1,`CSS tag mismatch in ${file}`);
  assert.equal((html.match(/\/mobile-nav\.js\?v=20260806-3/g)||[]).length,1,`JS tag mismatch in ${file}`);
}
assert.doesNotMatch(fs.readFileSync('konspekt.html','utf8'),/\/mobile-nav\.(?:css|js)/);
console.log(`Mobile navbar verified on ${urls.length} public pages.`);
