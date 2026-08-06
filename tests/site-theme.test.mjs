import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const sitemap=read('sitemap.xml');
const urls=[...sitemap.matchAll(/<loc>https:\/\/matveyshemyakin\.ru([^<]*)<\/loc>/g)].map(match=>match[1]||'/');
assert.equal(urls.length,27,'sitemap must contain 27 public URLs');

const toFile=(url)=>url==='/'?'index.html':url.endsWith('/')?`${url.slice(1)}index.html`:url.slice(1);
const files=urls.map(toFile);

for(const file of files){
  assert.ok(fs.existsSync(path.join(root,file)),`missing public file: ${file}`);
  const html=read(file);
  assert.equal((html.match(/\/site-theme-init\.js\?v=20260806-1/g)||[]).length,1,`initializer count in ${file}`);
  assert.equal((html.match(/\/site-theme\.css\?v=20260806-1/g)||[]).length,1,`stylesheet count in ${file}`);
  assert.equal((html.match(/\/site-theme\.js\?v=20260806-1/g)||[]).length,1,`controller count in ${file}`);
  assert.match(html,/<script src="\/site-theme-init\.js\?v=20260806-1"><\/script><link rel="stylesheet" href="\/site-theme\.css\?v=20260806-1"><link rel="stylesheet" href="\/site-motion\.css\?v=20260806-1">\s*<\/head>/i,`head order in ${file}`);
  assert.match(html,/<script defer src="\/site-theme\.js\?v=20260806-1"><\/script><script defer src="\/site-motion\.js\?v=20260806-1"><\/script>\s*<\/body>/i,`deferred controller in ${file}`);
  assert.ok(html.indexOf('/site-language-switch.js')<html.indexOf('/site-theme.js?v=20260806-1'),`language switch must precede theme controller in ${file}`);
}

const technical=read('konspekt.html');
assert.doesNotMatch(technical,/site-theme(?:-init)?\.js|site-theme\.css/,'technical konspekt page must remain excluded');

const init=read('site-theme-init.js');
const controller=read('site-theme.js');
const css=read('site-theme.css');

assert.match(init,/site_theme_v1/);
assert.match(init,/prefers-color-scheme: dark/);
assert.match(init,/dataset\.siteThemeFamily/);
assert.match(init,/family='home'/);
assert.match(init,/family='patients'/);
assert.match(init,/family='bacterial'/);
assert.match(init,/family='pkp'/);
assert.doesNotMatch(init,/MutationObserver/);

assert.match(controller,/Включить тёмную тему/);
assert.match(controller,/Switch to dark theme/);
assert.match(controller,/data-site-theme-toggle|siteThemeToggle/);
assert.match(controller,/site-theme-change/);
assert.match(controller,/site_theme_v1/);
assert.match(controller,/site-mobile-nav/);
assert.match(controller,/site-mobile-search/);
assert.match(controller,/\.sim-page/);
assert.doesNotMatch(controller,/MutationObserver/);
assert.doesNotMatch(controller,/backdrop-filter/);

assert.match(css,/\.site-theme-toggle/);
assert.match(css,/data-site-theme-family="home"/);
assert.match(css,/data-site-theme-family="patients"/);
assert.match(css,/data-site-theme-family="doctors"/);
assert.match(css,/data-site-theme-family="terms"/);
assert.match(css,/data-site-theme-family="privacy"/);
assert.match(css,/BACTERIAL_THEME_CONTRAST_BUNDLE/);
assert.match(css,/body\.bacterial-clinical-page/);
assert.doesNotMatch(css,/backdrop-filter/);

const bacterial=read('for-doctors/bacterial-keratitis/index.html');
assert.match(bacterial,/<body class="bacterial-clinical-page">/);

const iol=read('patients/iol-dislocation/script.js');
assert.match(iol,/const themeKey='site_theme_v1'/);
assert.match(iol,/site-theme-change/);
assert.match(iol,/dataset\.siteTheme/);

for(const file of ['for-doctors/penetrating-keratoplasty/index.html','en/for-doctors/penetrating-keratoplasty/index.html']){
  const html=read(file);
  assert.match(html,/localStorage\.getItem\('site_theme_v1'\)/,`shared key missing in ${file}`);
  assert.match(html,/root\.dataset\.siteTheme/,`common dataset bridge missing in ${file}`);
}

console.log(`Global site theme verified on ${files.length} public pages.`);
