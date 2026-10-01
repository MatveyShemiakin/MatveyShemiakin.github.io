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

test('series headers keep language and colour controls in one non-wrapping action row',()=>{
  for(const path of Object.values(paths)){
    const html=read(path);
    assert.match(html,/<div class="header-actions" aria-label="[^"]+"><\/div>/);
  }

  const css=read('for-doctors/simple-questions/series.css');
  assert.match(css,/\.simple-questions-page \.header-actions\{[^}]*display:flex!important[^}]*flex-wrap:nowrap!important/s);
  assert.match(css,/\.simple-questions-page \.header-actions>\.site-language-switch[^}]*margin:0!important/s);
  assert.match(css,/\.simple-questions-page \.header-actions>\.site-theme-toggle[^}]*margin:0!important/s);
});

test('article author cards use the standard portrait-led medical review pattern',()=>{
  const expectations=[
    [paths.ruArticle,'Материал подготовлен и проверен врачом','О враче','/#about','Медицинская проверка: 30 сентября 2026 года.'],
    [paths.enArticle,'Prepared and medically reviewed by','About the doctor','/en/#about','Medical review: 30 September 2026.'],
  ];

  for(const [path,kicker,about,aboutHref,reviewed] of expectations){
    const html=read(path);
    assert.match(html,/<div class="author-photo"><img src="\/assets\/portrait\.jpg"[^>]*width="1200"[^>]*height="1800"[^>]*><\/div>/);
    assert.match(html,new RegExp(kicker));
    assert.match(html,new RegExp(`href="${aboutHref.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>${about}<`));
    assert.match(html,/href="https:\/\/t\.me\/DrShemMYu"/);
    assert.match(html,/href="https:\/\/prodoctorov\.ru\/moskva\/vrach\/1115864-shemyakin\/"/);
    assert.match(html,new RegExp(reviewed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.doesNotMatch(html,/<div class="author-monogram">/);
  }
});

test('legal, retention and CTA links keep explicit accessible contrast without sharing the primary button style',()=>{
  const css=read('for-doctors/simple-questions/series.css');
  assert.match(css,/--sq-footer-text:#d7e2ef/);
  assert.match(css,/--sq-action:#315b93/);
  assert.match(css,/\.personal-cta>a\{[^}]*background:#fff[^}]*color:var\(--sq-navy\)/s);
  assert.match(css,/\.personal-cta \.telegram-privacy-note a\{[^}]*background:transparent!important[^}]*color:inherit!important/s);
  assert.match(css,/\.simple-questions-page \.site-footer a,[^{]*\.simple-questions-page \.site-footer button\{[^}]*color:var\(--sq-footer-text\)!important/s);
  assert.match(css,/\.simple-questions-page \.doctor-material-telegram \.button\{[^}]*background:var\(--sq-action\)[^}]*color:#fff!important/s);
  assert.match(css,/html\[data-site-theme="dark"\] \.simple-questions-page \.doctor-bookmark-toggle\{[^}]*border-color:var\(--sq-link\)[^}]*color:var\(--sq-link\)/s);
  assert.match(css,/html\[data-site-theme="dark"\] \.simple-questions-page \.doctor-bookmark-toggle:hover,[^{]*\.doctor-bookmark-toggle:focus-visible,[^{]*\.doctor-bookmark-toggle\[aria-pressed="true"\]\{[^}]*background:#3567ad[^}]*color:#fff/s);
  assert.doesNotMatch(css,/\.personal-cta a\{display:inline-flex/);
});

test('all principal text and action colour pairs meet WCAG AA contrast',()=>{
  const luminance=(hex)=>{
    const channels=hex.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16)/255);
    const linear=channels.map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
    return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  };
  const contrast=(foreground,background)=>{
    const values=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
    return (values[0]+0.05)/(values[1]+0.05);
  };
  const pairs=[
    ['light body','#111a27','#ffffff'],
    ['light muted','#596679','#f4f1eb'],
    ['light link','#315b93','#ffffff'],
    ['light action','#ffffff','#315b93'],
    ['footer and CTA copy','#d7e2ef','#041225'],
    ['dark body','#edf4fb','#06182f'],
    ['dark muted','#c4d1df','#06182f'],
    ['dark link','#9fc4f4','#06182f'],
    ['dark action','#ffffff','#315b93'],
    ['dark saved action','#ffffff','#3567ad'],
  ];
  for(const [name,foreground,background] of pairs){
    assert.ok(contrast(foreground,background)>=4.5,`${name} contrast is below 4.5:1`);
  }

  const css=read('for-doctors/simple-questions/series.css');
  assert.match(css,/html\[data-site-theme="dark"\]\{[^}]*--sq-action:#315b93/);
});
