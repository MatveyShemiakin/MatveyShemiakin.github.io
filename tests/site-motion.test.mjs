import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const exists=(file)=>fs.existsSync(path.join(root,file));
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

const sitemap=read('sitemap.xml');
const urls=[...sitemap.matchAll(/<loc>https:\/\/matveyshemyakin\.ru([^<]*)<\/loc>/g)]
  .map((match)=>match[1]||'/');
assert.equal(urls.length,27,'sitemap must contain 27 public URLs');

const toFile=(url)=>url==='/'?'index.html':url.endsWith('/')?`${url.slice(1)}index.html`:url.slice(1);
const files=urls.map(toFile);

assert.ok(exists('site-motion.css'),'missing global motion stylesheet');
assert.ok(exists('site-motion.js'),'missing global motion controller');

for(const file of files){
  assert.ok(exists(file),`missing public file: ${file}`);
  const html=read(file);
  assert.equal((html.match(/\/site-motion\.css\?v=20260806-1/g)||[]).length,1,`motion stylesheet count in ${file}`);
  assert.equal((html.match(/\/site-motion\.js\?v=20260806-1/g)||[]).length,1,`motion controller count in ${file}`);
  assert.match(
    html,
    /<link rel="stylesheet" href="\/site-theme\.css\?v=20260806-1"><link rel="stylesheet" href="\/site-motion\.css\?v=20260806-1">\s*<\/head>/i,
    `motion stylesheet order in ${file}`,
  );
  assert.match(
    html,
    /<script defer src="\/site-theme\.js\?v=20260806-1"><\/script><script defer src="\/site-motion\.js\?v=20260806-1"><\/script>\s*<\/body>/i,
    `motion controller order in ${file}`,
  );
}

const technical=read('konspekt.html');
assert.doesNotMatch(technical,/site-motion\.(?:css|js)/,'technical konspekt page must remain excluded');

const css=read('site-motion.css');
const controller=read('site-motion.js');
const injector=read('scripts/inject_site_theme.py');

assert.match(css,/\.site-reading-progress/);
assert.match(css,/\.site-motion-reveal/);
assert.match(css,/\.site-motion-card/);
assert.match(css,/\.site-motion-details/);
assert.match(css,/\.site-next-material/);
assert.match(css,/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/);
assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.doesNotMatch(css,/backdrop-filter/);
assert.doesNotMatch(css,/animation:\s*[^;]*infinite/i);

assert.match(controller,/IntersectionObserver/);
assert.match(controller,/requestAnimationFrame/);
assert.match(controller,/passive:\s*true/);
assert.match(controller,/prefers-reduced-motion:\s*reduce/);
assert.ok(controller.includes("document.querySelector('.reading-progress,[data-reading-progress]')"));
assert.ok(controller.includes("document.querySelector('.related,.next-material,.next-section,[data-next-material],[data-site-next-material]')"));
assert.ok(controller.includes("'main .question'"));
assert.ok(controller.includes("'.related a'"));
assert.ok(controller.includes('while(insertionTarget.parentElement&&insertionTarget.parentElement!==main)'));
assert.match(controller,/Следующий материал/);
assert.match(controller,/Открыть материал/);
assert.match(controller,/Next material/);
assert.match(controller,/Open material/);
assert.match(controller,/\/patients\/before-surgery\//);
assert.match(controller,/\/en\/patients\/before-surgery\//);
assert.match(controller,/\/for-doctors\/bacterial-keratitis\//);
assert.match(controller,/\/en\/for-doctors\/penetrating-keratoplasty\//);
assert.match(controller,/\.urgent/);
assert.match(controller,/\.warning/);
assert.match(controller,/\.emergency/);
assert.match(controller,/\.red-flag/);
assert.match(controller,/\[role="alert"\]/);
assert.match(controller,/\.medical-disclaimer/);
assert.match(controller,/dataset\.siteMotionReady/);
assert.doesNotMatch(controller,/MutationObserver/);
assert.doesNotMatch(controller,/React|Vue|Angular|GSAP|anime\.js/);
assert.doesNotMatch(controller,/\.style\.|setAttribute\(['"]style|cssText/);

assert.match(injector,/MOTION_HEAD_ASSET/);
assert.match(injector,/MOTION_BODY_ASSET/);
assert.match(injector,/\/site-motion\.css\?v=20260806-1/);
assert.match(injector,/\/site-motion\.js\?v=20260806-1/);

console.log(`Global site motion verified on ${files.length} public pages.`);
