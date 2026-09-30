import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const paths={
  ruHub:'for-doctors/simple-questions/index.html',
  enHub:'en/for-doctors/simple-questions/index.html',
  ruArticle:'for-doctors/complicated-cataract/index.html',
  enArticle:'en/for-doctors/complicated-cataract/index.html',
};

test('the bilingual series hub and complicated-cataract article are published as separate pages',()=>{
  Object.values(paths).forEach(path=>assert.ok(fs.existsSync(path),`${path} is missing`));
  const ru=read(paths.ruArticle);
  const en=read(paths.enArticle);
  assert.match(ru,/<html lang="ru">/);
  assert.match(en,/<html lang="en">/);
  assert.match(ru,/<h1[^>]*>[^<]*Осложнённая катаракта/);
  assert.match(en,/<h1[^>]*>[^<]*Complicated cataract/);
  assert.doesNotMatch(ru,/data-(?:ru|en)=/);
  assert.doesNotMatch(en,/data-(?:ru|en)=/);
});

test('article SEO exposes canonical language pairs, crawl directives and structured medical authorship',()=>{
  const pairs=[
    [paths.ruArticle,'https://matveyshemyakin.ru/for-doctors/complicated-cataract/','ru'],
    [paths.enArticle,'https://matveyshemyakin.ru/en/for-doctors/complicated-cataract/','en'],
  ];
  for(const [path,canonical,lang] of pairs){
    const html=read(path);
    assert.match(html,new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">`));
    assert.match(html,/<meta name="robots" content="index, follow, max-image-preview:large">/);
    assert.match(html,/hreflang="ru" href="https:\/\/matveyshemyakin\.ru\/for-doctors\/complicated-cataract\/"/);
    assert.match(html,/hreflang="en" href="https:\/\/matveyshemyakin\.ru\/en\/for-doctors\/complicated-cataract\/"/);
    assert.match(html,/"@type":"MedicalWebPage"/);
    assert.match(html,/"@type":"Article"/);
    assert.match(html,/"@type":"Person"/);
    assert.match(html,/"@type":"BreadcrumbList"/);
    assert.match(html,new RegExp(`"inLanguage":"${lang}"`));
  }
});

test('article pages retain standard site chrome, reading progress, TOC and personal CTA',()=>{
  for(const path of [paths.ruArticle,paths.enArticle]){
    const html=read(path);
    assert.match(html,/<header class="site-header">/);
    assert.match(html,/<footer class="site-footer">/);
    assert.match(html,/class="reading-progress"/);
    assert.match(html,/class="article-toc"/);
    assert.match(html,/class="mobile-toc"/);
    assert.match(html,/aria-controls="mobile-article-toc"/);
    assert.match(html,/id="mobile-article-toc"/);
    assert.match(html,/href="https:\/\/t\.me\/ShemMYu"/);
    assert.match(html,/site-theme\.css\?v=20260806-1/);
    assert.match(html,/site-mega-nav\.js\?v=20260816-2/);
    assert.match(html,/complicated-cataract\.js\?v=20260930-1/);
  }
});

test('series hubs are indexable collection pages and expose the first article',()=>{
  for(const [path,article] of [[paths.ruHub,'/for-doctors/complicated-cataract/'],[paths.enHub,'/en/for-doctors/complicated-cataract/']]){
    const html=read(path);
    assert.match(html,/"@type":"CollectionPage"/);
    assert.match(html,new RegExp(`href="${article}"`));
    assert.match(html,/<header class="site-header">/);
    assert.match(html,/<footer class="site-footer">/);
  }
});

test('the article preserves visible source attribution for both clinical photographs',()=>{
  for(const path of [paths.ruArticle,paths.enArticle]){
    const html=read(path);
    assert.match(html,/commons\.wikimedia\.org\/wiki\/File:Mature_cataract\.jpg/);
    assert.match(html,/commons\.wikimedia\.org\/wiki\/File:Posterior_polar_cataract\.jpg/);
    assert.match(html,/CC BY-SA 3\.0/);
    assert.match(html,/CC BY-SA 4\.0/);
    assert.match(html,/width="1280" height="960"/);
    assert.match(html,/width="1280" height="1069"/);
  }
});

test('decorative hub and library artwork does not silently reuse the licensed clinical photograph',()=>{
  for(const path of [paths.ruHub,paths.enHub,'for-doctors/index.html','en/for-doctors/index.html']){
    assert.doesNotMatch(read(path),/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/3\/32\/Mature_cataract/);
  }
});

test('article feed topics use the selectable professional taxonomy',()=>{
  const feed=JSON.parse(read('for-doctors/updates.json'));
  const item=feed.find(entry=>entry.id==='complicated-cataract');
  assert.ok(item,'complicated-cataract update is missing');
  assert.deepEqual(item.topics,['cataract-iol','retina']);
});

test('expanded mobile contents stays usable on short viewports',()=>{
  const css=read('for-doctors/simple-questions/series.css');
  assert.match(css,/\.mobile-toc-panel\{[^}]*max-height:[^;}]*dvh[^}]*overflow-y:auto/s);
});

test('navigation and sitemaps make every new page discoverable',()=>{
  assert.match(read('for-doctors/index.html'),/href="\/for-doctors\/simple-questions\/"/);
  assert.match(read('en/for-doctors/index.html'),/href="\/en\/for-doctors\/simple-questions\/"/);
  const mega=read('site-mega-nav.js');
  assert.match(mega,/Простые вопросы — сложные решения/);
  assert.match(mega,/Simple questions — complex decisions/);
  const mobile=read('mobile-nav.js');
  assert.match(mobile,/Осложнённая катаракта/);
  assert.match(mobile,/Complicated cataract/);
  const map=read('sitemap.xml');
  const text=read('sitemap.txt');
  for(const url of [
    'https://matveyshemyakin.ru/for-doctors/simple-questions/',
    'https://matveyshemyakin.ru/en/for-doctors/simple-questions/',
    'https://matveyshemyakin.ru/for-doctors/complicated-cataract/',
    'https://matveyshemyakin.ru/en/for-doctors/complicated-cataract/',
  ]){
    assert.match(map,new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.match(text,new RegExp(`^${url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'m'));
  }
});

test('question-style section headings end with a question mark',()=>{
  const ru=read(paths.ruArticle);
  const en=read(paths.enArticle);
  assert.match(ru,/<h3>Почему мелкая передняя камера делает операцию сложнее\?<\/h3>/);
  assert.match(ru,/<h3>Что должно быть готово в операционной\?<\/h3>/);
  assert.match(en,/<h3>Why does a shallow anterior chamber make surgery more difficult\?<\/h3>/);
  assert.match(en,/<h3>What should be prepared in the operating room\?<\/h3>/);
});
