// Development-only browser check. No dependencies are shipped with the website.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.env.HOMEPAGE_BROWSER_MODULES, 'package.json'));
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const { default: pixelmatch } = await import(path.join(process.env.HOMEPAGE_BROWSER_MODULES, 'node_modules/pixelmatch/index.js'));
const output = process.env.HOMEPAGE_TEST_OUTPUT || '/tmp/homepage-loading';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
const failures = [];
const report = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const snapshot = () => ({
  text: document.body.innerText,
  links: [...document.querySelectorAll('a')].map(a => [a.textContent.trim(), a.getAttribute('href'), a.target, a.rel]),
  images: [...document.querySelectorAll('img')].map(i => [i.getAttribute('src'), i.alt]),
  video: (() => { const v = document.querySelector('video'); return { poster: v.getAttribute('poster'), src: new URL(v.currentSrc || v.src || v.querySelector('source').src).pathname, controls: v.controls, loop: v.loop, muted: v.muted, playsInline: v.playsInline }; })(),
  rects: [...document.querySelectorAll('.hero-grid,.hero-copy,.portrait-card,.hero-actions,.video-shell')].map(e => { const r = e.getBoundingClientRect(); return [e.className, r.x, r.y + scrollY, r.width, r.height].map(x => typeof x === 'number' ? Math.round(x * 100) / 100 : x); })
});
async function settle(page) {
  await page.waitForFunction(() => document.querySelector('.hero-mission') && document.querySelector('.site-mega-nav') && document.querySelector('#science .science-hero'));
  await page.waitForTimeout(2000);
}
try {
  for (const lang of ['ru', 'en']) for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    const name = `${lang}-${width}-${theme}`;
    const results = [];
    const screenshots = [];
    for (const port of [8010, 8011]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      // Isolate visual comparison from external rating/network updates, identically for both versions.
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      await context.addInitScript(({theme}) => { localStorage.setItem('site_theme_v1', theme); localStorage.setItem('site_cookie_choice', 'essential'); }, {theme});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${port}/${lang === 'en' ? 'en/' : ''}`);
      await settle(page);
      const shot = await page.screenshot();
      fs.writeFileSync(path.join(output, `${name}-${port}.png`), shot);
      screenshots.push(PNG.sync.read(shot));
      // Load all lazy images, then compare final content and geometry.
      for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 800) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(50); }
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(500);
      results.push(await page.evaluate(snapshot));
      check(errors.length === 0, `${name} ${port}: JS errors ${errors}`);
      check(await page.evaluate(theme => document.documentElement.dataset.siteTheme === theme, theme), `${name}: initial theme`);
      await page.locator('[data-site-theme-toggle]').first().click();
      check(await page.evaluate(theme => document.documentElement.dataset.siteTheme !== theme, theme), `${name}: theme toggle`);
      const langHref = await page.locator(`.site-language-switch a[hreflang="${lang === 'ru' ? 'en' : 'ru'}"]`).getAttribute('href');
      check(langHref === (lang === 'ru' ? '/en/' : '/'), `${name}: language route ${langHref}`);
      if (width > 1000) {
        await page.locator('.site-mega-nav__toggle').first().click();
        check(await page.locator('.site-mega-nav__toggle').first().getAttribute('aria-expanded') === 'true', `${name}: desktop menu`);
        await page.keyboard.press('Escape');
        check(await page.locator('.site-mega-nav__toggle').first().getAttribute('aria-expanded') === 'false', `${name}: menu Escape`);
      } else {
        await page.locator('[data-mobile-nav="search"]').click();
        check(await page.locator('[data-mobile-nav="search"]').getAttribute('aria-expanded') === 'true', `${name}: mobile search`);
        await page.keyboard.press('Escape');
      }
      await page.locator('.legal-cookie-settings').click();
      check(await page.locator('.cookie-banner').isVisible(), `${name}: cookie settings`);
      await page.locator('.cookie-reject').click();
      check(await page.locator('.cookie-banner').isHidden(), `${name}: cookie choice`);
      await page.locator('.patient-fab__main').click();
      check(await page.locator('.patient-fab__main').getAttribute('aria-expanded') === 'true', `${name}: contact menu`);
      await context.close();
    }
    try { assert.deepEqual(results[1], results[0]); } catch (e) { failures.push(`${name}: content/geometry changed: ${e.message.slice(0,1000)}`); fs.writeFileSync(path.join(output, `${name}-content.json`), JSON.stringify(results,null,2)); }
    const [a,b] = screenshots;
    const diff = new PNG({ width:a.width, height:a.height });
    const pixels = pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.1});
    const ratio = pixels/(a.width*a.height);
    report.push({name,changedPixels:pixels,ratio});
    if (ratio > 0.001) { fs.writeFileSync(path.join(output, `${name}-diff.png`), PNG.sync.write(diff)); failures.push(`${name}: screenshot difference ${(ratio*100).toFixed(3)}%`); }
  }
  // Default-motion load: no early MP4, then original autoplay, sound and pause behavior.
  for (const lang of ['ru','en']) for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport:{width,height:1000} });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.addInitScript(() => { localStorage.setItem('site_cookie_choice','essential'); window.loadingAudit={cls:0,shifts:[]}; new PerformanceObserver(list => { for(const e of list.getEntries())if(!e.hadRecentInput){ window.loadingAudit.cls+=e.value; window.loadingAudit.shifts.push({value:e.value,nodes:e.sources.map(s=>s.node?.className)}); } }).observe({type:'layout-shift',buffered:true}); });
    const page=await context.newPage(); const media=[];
    page.on('request',r=>{if(r.url().includes('.mp4'))media.push(r.url());});
    await page.goto(`http://127.0.0.1:8011/${lang==='en'?'en/':''}`); await settle(page);
    check(media.length===0,`${lang} ${width}: MP4 loaded before viewport`);
    const audit=await page.evaluate(()=>window.loadingAudit); report.push({lang,width,...audit});
    check(audit.cls<=0.1,`${lang} ${width}: CLS ${audit.cls}`);
    await page.locator('#media-video').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!document.querySelector('#media-video').paused, {timeout:15000}).catch(()=>failures.push(`${lang} ${width}: viewport autoplay`));
    check(media.length>0,`${lang} ${width}: video failed to load on approach`);
    await page.locator('.video-sound-toggle').click();
    check(await page.locator('#media-video').evaluate(v=>!v.muted),`${lang} ${width}: enable sound`);
    await page.locator('.video-sound-toggle').click();
    check(await page.locator('#media-video').evaluate(v=>v.muted),`${lang} ${width}: mute sound`);
    await page.locator('#media-video').evaluate(v=>v.pause()); await page.waitForTimeout(100);
    await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(500);
    await page.locator('#media-video').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
    check(await page.locator('#media-video').evaluate(v=>v.paused),`${lang} ${width}: manual pause was lost`);
    await context.close();
  }
  // Homepage deferral must keep saved consent and analytics events operational.
  const context=await browser.newContext();
  await context.route('https://mc.yandex.ru/**',route=>route.fulfill({contentType:'application/javascript',body:''}));
  await context.addInitScript(()=>{localStorage.setItem('site_cookie_choice','analytics'); window.goalCalls=[]; window.ym=(...args)=>window.goalCalls.push(args);});
  const page=await context.newPage(); await page.goto('http://127.0.0.1:8011/'); await settle(page);
  check(await page.evaluate(()=>window.__siteAnalyticsInitialized===true),'analytics: saved consent');
  await page.locator('.hero-actions a[href="https://t.me/DrShemMYu"]').evaluate(a=>{a.addEventListener('click',e=>e.preventDefault());a.click();});
  check(await page.evaluate(()=>window.goalCalls.some(a=>a[1]==='reachGoal'&&a[2]==='telegram_click')),'analytics: Telegram goal');
  await context.close();
} finally { await browser.close(); fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,failures},null,2)); }
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(JSON.stringify(report,null,2));
console.log('Homepage content, appearance, controls and loading: OK');
